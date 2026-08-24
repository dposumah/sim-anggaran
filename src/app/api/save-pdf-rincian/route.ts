import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { tahapan, subKegiatan, items } = await req.json();

    if (!subKegiatan || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Extract Kode Sub Kegiatan
    const kodeSubKeg = subKegiatan.trim().split(' ')[0].replace(/[^0-9.]/g, '');

    // Cari Sub Kegiatan di DB
    let subKeg = await prisma.subKegiatan.findFirst({
      where: { kode: kodeSubKeg }
    });

    if (!subKeg) {
      return NextResponse.json({ success: false, error: 'Sub Kegiatan dengan kode ' + kodeSubKeg + ' tidak ditemukan di database. Pastikan Anda sudah mengupload Pagu Excel atau mendaftarkan Kegiatan/SubKegiatannya.' }, { status: 404 });
    }

    // Resolve Rekening and Sumber Dana IDs
    const uniqueRekenings = Array.from(new Set(items.map((i: any) => i.rekening)));
    const existingReks = await prisma.rekening.findMany({ where: { kode: { in: uniqueRekenings as string[] } } });
    const rekMap = new Map(existingReks.map((r: any) => [r.kode, r.id]));
    
    const uniqueSD = Array.from(new Set(items.map((i: any) => i.sumberDana)));
    const existingSD = await prisma.sumberDana.findMany({ where: { nama: { in: uniqueSD as string[] } } });
    const sdMap = new Map(existingSD.map((s: any) => [s.nama, s.id]));

    // Resolve IDs for each item (don't create missing ones - they must exist from Excel upload)
    for (let item of items) {
      item.rekeningId = rekMap.get(item.rekening) || null;
      item.sumberDanaId = sdMap.get(item.sumberDana) || null;
    }

    // Fetch existing RincianBelanja for this sub kegiatan (these hold the pagu - DO NOT touch them)
    const existingRincian = await prisma.rincianBelanja.findMany({
      where: { subKegiatanId: subKeg.id },
      include: { rekening: true, sumberDana: true }
    });

    // Build a lookup map: rekeningId_sumberDanaId_namaPaket -> RincianBelanja.id
    const rincianMap = new Map<string, number>();
    existingRincian.forEach(r => {
      const key = r.rekeningId + '_' + r.sumberDanaId + '_' + r.namaPaket;
      rincianMap.set(key, r.id);
    });

    // Group PDF items by paket (same logic as before)
    const paketGroups = new Map<string, { rekeningId: number | null, sumberDanaId: number | null, namaPaket: string, items: any[] }>();
    items.forEach((item: any) => {
      const key = item.rekeningId + '_' + item.sumberDanaId + '_' + item.paket;
      if (!paketGroups.has(key)) {
        paketGroups.set(key, {
          rekeningId: item.rekeningId,
          sumberDanaId: item.sumberDanaId,
          namaPaket: item.paket,
          items: []
        });
      }
      paketGroups.get(key)!.items.push(item);
    });

    // Build transaction: ONLY delete old RincianItemBelanja and create new ones
    const txs: any[] = [];
    let matchedCount = 0;
    let unmatchedPakets: string[] = [];

    for (const [key, group] of paketGroups.entries()) {
      const parentId = rincianMap.get(key);
      
      if (!parentId) {
        // No matching RincianBelanja found - try fuzzy match by namaPaket alone
        const fuzzyMatch = existingRincian.find(r => 
          r.namaPaket === group.namaPaket && 
          r.rekeningId === group.rekeningId
        );
        
        if (fuzzyMatch) {
          // Delete old items for this parent
          txs.push(
            prisma.rincianItemBelanja.deleteMany({
              where: { rincianBelanjaId: fuzzyMatch.id }
            })
          );
          // Create new items
          txs.push(
            ...group.items.map((it: any) =>
              prisma.rincianItemBelanja.create({
                data: {
                  rincianBelanjaId: fuzzyMatch.id,
                  uraian: it.uraian,
                  spesifikasi: it.spesifikasi || '-',
                  koefisien: String(it.koefisien || '1'),
                  satuan: String(it.satuan || 'Ls'),
                  hargaSatuan: parseFloat(it.hargaSatuan) || 0,
                  ppn: parseFloat(it.ppn) || 0,
                  jumlah: parseFloat(it.jumlah) || 0,
                  tahapan: tahapan || 'perubahan',
                }
              })
            )
          );
          matchedCount++;
        } else {
          unmatchedPakets.push(group.namaPaket);
        }
        continue;
      }

      // Delete old RincianItemBelanja for this parent
      txs.push(
        prisma.rincianItemBelanja.deleteMany({
          where: { rincianBelanjaId: parentId }
        })
      );

      // Create new RincianItemBelanja under the existing parent
      const itemCreates = group.items.map((it: any) =>
        prisma.rincianItemBelanja.create({
          data: {
            rincianBelanjaId: parentId,
            uraian: it.uraian,
            spesifikasi: it.spesifikasi || '-',
            koefisien: String(it.koefisien || '1'),
            satuan: String(it.satuan || 'Ls'),
            hargaSatuan: parseFloat(it.hargaSatuan) || 0,
            ppn: parseFloat(it.ppn) || 0,
            jumlah: parseFloat(it.jumlah) || 0,
            tahapan: tahapan || 'perubahan',
          }
        })
      );
      txs.push(...itemCreates);
      matchedCount++;
    }

    if (txs.length > 0) {
      await prisma.$transaction(txs);
    }

    return NextResponse.json({ 
      success: true,
      matched: matchedCount,
      unmatched: unmatchedPakets.length,
      unmatchedPakets: unmatchedPakets.length > 0 ? unmatchedPakets : undefined
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
