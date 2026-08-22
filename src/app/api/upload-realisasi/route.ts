import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';
import * as XLSX from 'xlsx';

export const maxDuration = 300; // 5 minutes limit


// Flexible header detection: find the row that contains these keywords
const REQUIRED_HEADERS = [
  'Kode Sub Kegiatan',
  'Kode Rekening', 
  'Alokasi Anggaran',
  'Realisasi Anggaran'
];

function findHeaderRow(data: any[][]): { headerRowIndex: number; headerMap: Record<string, number> } | null {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowStrings = row.map((cell: any) => String(cell || '').trim());
    
    // Check if this row contains all required headers
    const found = REQUIRED_HEADERS.every(h => 
      rowStrings.some(cell => cell.toLowerCase().includes(h.toLowerCase()))
    );
    
    if (found) {
      const headerMap: Record<string, number> = {};
      rowStrings.forEach((cell: string, idx: number) => {
        headerMap[cell] = idx;
      });
      return { headerRowIndex: i, headerMap };
    }
  }
  return null;
}

function getColIndex(headerMap: Record<string, number>, ...keywords: string[]): number {
  for (const key of Object.keys(headerMap)) {
    const lower = key.toLowerCase();
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return headerMap[key];
    }
  }
  return -1;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tahun, filteredData, headerMap } = body;
    const tahunParam = parseInt(tahun?.toString() || '2026', 10);

    if (!filteredData || !headerMap) {
      return NextResponse.json({ error: 'Format data tidak valid dari client' }, { status: 400 });
    }

    // Map column indices
    const colNamaSKPD = getColIndex(headerMap, 'Nama SKPD', 'Nama Sub SKPD');
    const colKodeSubKegiatan = getColIndex(headerMap, 'Kode Sub Kegiatan');
    const colKodeRekening = getColIndex(headerMap, 'Kode Rekening');
    const colAlokasi = getColIndex(headerMap, 'Alokasi Anggaran');
    const colRealisasi = getColIndex(headerMap, 'Realisasi Anggaran');

    if (colKodeSubKegiatan < 0 || colKodeRekening < 0 || colAlokasi < 0 || colRealisasi < 0) {
      return NextResponse.json({ 
        error: 'Kolom penting tidak ditemukan. Diperlukan: Kode Sub Kegiatan, Kode Rekening, Alokasi Anggaran, Realisasi Anggaran' 
      }, { status: 400 });
    }

    // Get tahun
    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun: tahunParam } });
    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Get SKPD (hardcode Dinas Pendidikan for now)
    const skpdList = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      }
    });

    if (skpdList.length === 0) {
      return NextResponse.json({ error: 'SKPD Dinas Pendidikan tidak ditemukan di database' }, { status: 404 });
    }

    const skpdIds = skpdList.map(s => s.id);

    // Preload lookup data
    const [subKegiatans, rekenings, rincianBelanjas] = await Promise.all([
      prisma.subKegiatan.findMany({
        where: { kegiatan: { program: { skpdId: { in: skpdIds } } } },
        select: { id: true, kode: true, kegiatanId: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
      }),
      prisma.rekening.findMany({ select: { id: true, kode: true } }),
      prisma.rincianBelanja.findMany({
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
        select: { subKegiatanId: true, rekeningId: true, sumberDanaId: true, paguInduk: true, paguPerubahan: true }
      })
    ]);

    const subKegiatanMap = new Map<string, { id: number; skpdId: number }>();
    subKegiatans.forEach(sk => {
      subKegiatanMap.set(sk.kode, { id: sk.id, skpdId: sk.kegiatan.program.skpdId });
    });

    const rekeningMap = new Map<string, number>();
    rekenings.forEach(r => rekeningMap.set(r.kode, r.id));

    // Build lookup for Rincian Belanja (group by SubKeg+Rekening, collect Sumber Dana and sum Pagu)
    const sdLookupMap = new Map<string, Map<number, number>>(); // key -> Map<sumberDanaId, totalPagu>
    const skSDLookup = new Map<number, number>(); // SubKegiatan -> fallback SD

    rincianBelanjas.forEach(rb => {
      const key = `${rb.subKegiatanId}_${rb.rekeningId}`;
      const pagu = Number(rb.paguPerubahan !== null ? rb.paguPerubahan : rb.paguInduk);
      
      if (!sdLookupMap.has(key)) {
        sdLookupMap.set(key, new Map());
      }
      const sdMap = sdLookupMap.get(key)!;
      sdMap.set(rb.sumberDanaId, (sdMap.get(rb.sumberDanaId) || 0) + pagu);

      if (!skSDLookup.has(rb.subKegiatanId)) {
        skSDLookup.set(rb.subKegiatanId, rb.sumberDanaId);
      }
    });

    // Phase 1: Aggregate    // Process data rows
    const dataRows = filteredData;
    let skipCount = 0;
    let errorCount = 0;
    const warnings: string[] = [];

    // Clear existing realisasi data for this SKPD and Year before inserting new ones
    try {
      await prisma.realisasiBelanja.deleteMany({
        where: {
          skpdId: { in: skpdIds },
          tahunId: tahunData.id
        }
      });
    } catch (e: any) {
      console.error("Failed to clear old realisasi data:", e);
      warnings.push(`Gagal membersihkan data realisasi lama: ${e.message}`);
    }
    
    // key: skpdId_subKegiatanId_rekeningId
    const excelAggMap = new Map<string, { skpdId: number, subKegiatanId: number, rekeningId: number, nominal: number, alokasi: number, originalRow: number, kodeSubKeg: string, kodeRek: string }>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      const kodeSubKegiatan = String(row[colKodeSubKegiatan] || '').trim();
      const kodeRekening = String(row[colKodeRekening] || '').trim();
      const rawAlokasi = typeof row[colAlokasi] === 'number' ? row[colAlokasi] : parseFloat(String(row[colAlokasi] || '0').replace(/[^0-9.-]+/g, ''));
      const rawRealisasi = typeof row[colRealisasi] === 'number' ? row[colRealisasi] : parseFloat(String(row[colRealisasi] || '0').replace(/[^0-9.-]+/g, ''));
      
      const alokasi = isNaN(rawAlokasi) ? 0 : rawAlokasi;
      const realisasi = isNaN(rawRealisasi) ? 0 : rawRealisasi;

      if (!kodeSubKegiatan || !kodeRekening) {
        skipCount++;
        continue;
      }

      const skData = subKegiatanMap.get(kodeSubKegiatan);
      if (!skData) {
        warnings.push(`Baris ke-${i + 1}: Kode Sub Kegiatan "${kodeSubKegiatan}" tidak ditemukan di database`);
        errorCount++;
        continue;
      }

      const rekId = rekeningMap.get(kodeRekening);
      if (!rekId) {
        warnings.push(`Baris ke-${i + 1}: Kode Rekening "${kodeRekening}" tidak ditemukan di database`);
        errorCount++;
        continue;
      }

      const aggKey = `${skData.skpdId}_${skData.id}_${rekId}`;
      const existing = excelAggMap.get(aggKey);
      if (existing) {
        existing.nominal += realisasi;
        existing.alokasi += alokasi;
      } else {
        excelAggMap.set(aggKey, {
          skpdId: skData.skpdId,
          subKegiatanId: skData.id,
          rekeningId: rekId,
          nominal: realisasi,
          alokasi: alokasi,
          originalRow: i + 1,
          kodeSubKeg: kodeSubKegiatan,
          kodeRek: kodeRekening
        });
      }
    }

    // Phase 2: Distribute Realisasi using Waterfall Logic
    const upsertDataMap = new Map<string, any>(); // final outputs
    let cachedFirstSD: number | null = null;

    for (const [aggKey, data] of Array.from(excelAggMap.entries())) {
      const lookupKey = `${data.subKegiatanId}_${data.rekeningId}`;
      const sdMap = sdLookupMap.get(lookupKey);

      let remainingNominal = data.nominal;
      const totalAlokasi = data.alokasi;

      if (sdMap && sdMap.size > 0) {
        // Sort Sumber Dana by Pagu DESC (Largest first)
        const sortedSDs = Array.from(sdMap.entries()).sort((a, b) => b[1] - a[1]);
        
        for (let idx = 0; idx < sortedSDs.length; idx++) {
          const [sdId, sdPagu] = sortedSDs[idx];
          const isLast = idx === sortedSDs.length - 1;
          
          let allocatedNominal = 0;
          if (remainingNominal > 0) {
            if (isLast) {
              // Dump all remaining if it's the last one, even if it exceeds pagu
              allocatedNominal = remainingNominal;
              remainingNominal = 0;
            } else if (remainingNominal <= sdPagu) {
              // Fits completely
              allocatedNominal = remainingNominal;
              remainingNominal = 0;
            } else {
              // Exceeds pagu, fill this SD and carry over
              allocatedNominal = sdPagu;
              remainingNominal -= sdPagu;
            }
          } else if (idx === 0) {
             // ensure at least a 0 nominal record is created for the primary SD if total realisasi is 0
             allocatedNominal = 0;
          } else {
             continue; // don't create empty records for secondary SDs if remaining is 0
          }

          const finalKey = `${data.skpdId}_${data.subKegiatanId}_${sdId}_${data.rekeningId}`;
          upsertDataMap.set(finalKey, {
            skpdId: data.skpdId,
            tahunId: tahunData.id,
            subKegiatanId: data.subKegiatanId,
            sumberDanaId: sdId,
            rekeningId: data.rekeningId,
            bulan: 0,
            nominal: allocatedNominal,
            alokasiRealisasi: idx === 0 ? totalAlokasi : 0, // put alokasi in the primary SD
            keterangan: 'Import Excel (Waterfall)'
          });
        }
      } else {
        // Fallback Logic if no Pagu found
        let fallbackSdId = null;
        
        const anySD = skSDLookup.get(data.subKegiatanId);
        if (anySD) {
          fallbackSdId = anySD;
          warnings.push(`Baris Excel-${data.originalRow}: Rekening "${data.kodeRek}" pada Sub Kegiatan "${data.kodeSubKeg}" tidak ada di pagu. Dialihkan ke sumber dana lain di sub kegiatan yang sama.`);
        } else {
          if (!cachedFirstSD) {
            const fallbackSd = await prisma.sumberDana.findFirst({
              where: {
                OR: [
                  { nama: { contains: 'PENDAPATAN ASLI DAERAH', mode: 'insensitive' } },
                  { nama: { contains: 'DAU', mode: 'insensitive' } }
                ]
              }
            });
            if (fallbackSd) {
              cachedFirstSD = fallbackSd.id;
            } else {
              const firstSDFetch = await prisma.sumberDana.findFirst();
              cachedFirstSD = firstSDFetch ? firstSDFetch.id : null;
            }
          }
          
          if (cachedFirstSD) {
            fallbackSdId = cachedFirstSD;
            warnings.push(`Baris Excel-${data.originalRow}: Sub Kegiatan "${data.kodeSubKeg}" tidak memiliki pagu sama sekali. Dialihkan ke sumber dana default (PAD/DAU).`);
          }
        }

        if (fallbackSdId) {
          const finalKey = `${data.skpdId}_${data.subKegiatanId}_${fallbackSdId}_${data.rekeningId}`;
          upsertDataMap.set(finalKey, {
            skpdId: data.skpdId,
            tahunId: tahunData.id,
            subKegiatanId: data.subKegiatanId,
            sumberDanaId: fallbackSdId,
            rekeningId: data.rekeningId,
            bulan: 0,
            nominal: data.nominal,
            alokasiRealisasi: data.alokasi,
            keterangan: 'Import Excel (Fallback)'
          });
        }
      }
    }

    const upsertData = Array.from(upsertDataMap.values());
    let successCount = 0;

    // Batch upsert in chunks to avoid blocking and speed up processing
    const CHUNK_SIZE = 50;
    for (let i = 0; i < upsertData.length; i += CHUNK_SIZE) {
      const chunk = upsertData.slice(i, i + CHUNK_SIZE);
      
      const promises = chunk.map(item => 
        prisma.realisasiBelanja.upsert({
          where: {
            skpdId_subKegiatanId_sumberDanaId_rekeningId_bulan: {
              skpdId: item.skpdId,
              subKegiatanId: item.subKegiatanId,
              sumberDanaId: item.sumberDanaId,
              rekeningId: item.rekeningId,
              bulan: item.bulan
            }
          },
          update: {
            nominal: item.nominal,
            alokasiRealisasi: item.alokasiRealisasi,
            keterangan: item.keterangan
          },
          create: item
        }).then(() => {
          successCount++;
        }).catch((e: any) => {
          warnings.push(`Gagal simpan Sub Kegiatan ID ${item.subKegiatanId} + Rekening ID ${item.rekeningId}: ${e.message}`);
          errorCount++;
        })
      );
      
      await Promise.all(promises);
    }

    revalidateTag('laporanData', 'default');
    return NextResponse.json({
      success: true,
      summary: {
        totalRows: dataRows.length,
        imported: successCount, // Number of distributed records saved
        skipped: skipCount,
        errors: errorCount
      },
      warnings: warnings.slice(0, 50) // Limit warnings
    });

  } catch (error: any) {
    console.error('Upload Realisasi Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
