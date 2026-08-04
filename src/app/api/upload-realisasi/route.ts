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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tahunParam = parseInt(formData.get('tahun') as string || '2026', 10);

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row flexibly
    const headerInfo = findHeaderRow(rawData);
    if (!headerInfo) {
      return NextResponse.json({ 
        error: 'Header tidak ditemukan. Pastikan file Excel memiliki kolom: ' + REQUIRED_HEADERS.join(', ')
      }, { status: 400 });
    }

    const { headerRowIndex, headerMap } = headerInfo;

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
    const skpdNamesLower = skpdList.map(s => s.nama.toLowerCase());

    // Preload lookup data
    const [subKegiatans, rekenings, rincianBelanjas] = await Promise.all([
      prisma.subKegiatan.findMany({
        where: { kegiatan: { program: { skpdId: { in: skpdIds } } } },
        select: { id: true, kode: true, kegiatanId: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
      }),
      prisma.rekening.findMany({ select: { id: true, kode: true } }),
      prisma.rincianBelanja.findMany({
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
        select: { subKegiatanId: true, rekeningId: true, sumberDanaId: true }
      })
    ]);

    const subKegiatanMap = new Map<string, { id: number; skpdId: number }>();
    subKegiatans.forEach(sk => {
      subKegiatanMap.set(sk.kode, { id: sk.id, skpdId: sk.kegiatan.program.skpdId });
    });

    const rekeningMap = new Map<string, number>();
    rekenings.forEach(r => rekeningMap.set(r.kode, r.id));

    // Build lookup: subKegiatanId+rekeningId -> sumberDanaId (first match)
    const sdLookup = new Map<string, number>();
    rincianBelanjas.forEach(rb => {
      const key = `${rb.subKegiatanId}_${rb.rekeningId}`;
      if (!sdLookup.has(key)) {
        sdLookup.set(key, rb.sumberDanaId);
      }
    });

    // Process data rows
    const dataRows = rawData.slice(headerRowIndex + 1);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const warnings: string[] = [];
    const upsertData: any[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      // Filter by SKPD name
      if (colNamaSKPD >= 0) {
        const rowSkpdName = String(row[colNamaSKPD] || '').trim().toLowerCase();
        if (!rowSkpdName || !skpdNamesLower.some(n => rowSkpdName.includes('pendidikan'))) {
          skipCount++;
          continue;
        }
      }

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

      // Lookup subKegiatan
      const skData = subKegiatanMap.get(kodeSubKegiatan);
      if (!skData) {
        warnings.push(`Baris ${i + headerRowIndex + 2}: Kode Sub Kegiatan "${kodeSubKegiatan}" tidak ditemukan di database`);
        errorCount++;
        continue;
      }

      // Lookup rekening
      const rekId = rekeningMap.get(kodeRekening);
      if (!rekId) {
        warnings.push(`Baris ${i + headerRowIndex + 2}: Kode Rekening "${kodeRekening}" tidak ditemukan di database`);
        errorCount++;
        continue;
      }

      // Lookup sumber dana from rincian belanja
      const sdKey = `${skData.id}_${rekId}`;
      let sumberDanaId = sdLookup.get(sdKey);
      
      if (!sumberDanaId) {
        // Try to find any sumber dana for this sub kegiatan
        const anySD = rincianBelanjas.find(rb => rb.subKegiatanId === skData.id);
        if (anySD) {
          sumberDanaId = anySD.sumberDanaId;
        } else {
          // Use first sumber dana available
          const firstSD = await prisma.sumberDana.findFirst();
          if (firstSD) {
            sumberDanaId = firstSD.id;
          } else {
            warnings.push(`Baris ${i + headerRowIndex + 2}: Tidak ditemukan Sumber Dana untuk Sub Kegiatan "${kodeSubKegiatan}"`);
            errorCount++;
            continue;
          }
        }
      }

      upsertData.push({
        skpdId: skData.skpdId,
        tahunId: tahunData.id,
        subKegiatanId: skData.id,
        sumberDanaId,
        rekeningId: rekId,
        bulan: 0,
        nominal: realisasi,
        alokasiRealisasi: alokasi,
        keterangan: 'Import Excel'
      });
    }

    // Batch upsert
    for (const item of upsertData) {
      try {
        await prisma.realisasiBelanja.upsert({
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
        });
        successCount++;
      } catch (e: any) {
        warnings.push(`Gagal simpan Sub Kegiatan ID ${item.subKegiatanId} + Rekening ID ${item.rekeningId}: ${e.message}`);
        errorCount++;
      }
    }

    revalidateTag('laporanData', 'default');
    return NextResponse.json({
      success: true,
      summary: {
        totalRows: dataRows.length,
        imported: successCount,
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
