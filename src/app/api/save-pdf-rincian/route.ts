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

    // Fast resolution of Rekening and Sumber Dana (reduce DB trips)
    // 1. Rekening
    const uniqueRekenings = Array.from(new Set(items.map((i: any) => i.rekening)));
    const existingReks = await prisma.rekening.findMany({ where: { kode: { in: uniqueRekenings as string[] } } });
    const rekMap = new Map(existingReks.map((r: any) => [r.kode, r.id]));
    
    // 2. Sumber Dana
    const uniqueSD = Array.from(new Set(items.map((i: any) => i.sumberDana)));
    const existingSD = await prisma.sumberDana.findMany({ where: { nama: { in: uniqueSD as string[] } } });
    const sdMap = new Map(existingSD.map((s: any) => [s.nama, s.id]));

    // Resolve or create missing items sequentially (usually very few)
    for (let item of items) {
      if (!rekMap.has(item.rekening)) {
        let newRek = await prisma.rekening.create({ data: { kode: item.rekening, nama: item.namaRekening }});
        rekMap.set(item.rekening, newRek.id);
      }
      item.rekeningId = rekMap.get(item.rekening);

      if (!sdMap.has(item.sumberDana)) {
        let newSd = await prisma.sumberDana.create({ data: { kode: 'SD-' + Math.floor(Math.random()*10000), nama: item.sumberDana }});
        sdMap.set(item.sumberDana, newSd.id);
      }
      item.sumberDanaId = sdMap.get(item.sumberDana);
    }

    // Fetch existing RincianBelanja to preserve other pagus
    const existingRincian = await prisma.rincianBelanja.findMany({
      where: { subKegiatanId: subKeg.id }
    });
    const oldPaguMap = new Map();
    existingRincian.forEach(r => {
      const key = r.rekeningId + '_' + r.sumberDanaId + '_' + r.namaPaket;
      oldPaguMap.set(key, { paguInduk: r.paguInduk, paguRkpd: r.paguRkpd, paguPerubahan: r.paguPerubahan });
    });

    // Prepare transaction array
    const txs: any[] = [];

    // Delete old RincianBelanja
    txs.push(
      prisma.rincianBelanja.deleteMany({
        where: { subKegiatanId: subKeg.id }
      })
    );

    // Grouping
    const paketGroups = new Map();
    items.forEach((item: any) => {
      const key = item.rekeningId + '_' + item.sumberDanaId + '_' + item.paket;
      if (!paketGroups.has(key)) {
        paketGroups.set(key, {
          subKegiatanId: subKeg?.id,
          rekeningId: item.rekeningId,
          sumberDanaId: item.sumberDanaId,
          namaPaket: item.paket,
          tipePaket: '-',
          items: []
        });
      }
      paketGroups.get(key).items.push(item);
    });

    // Build Nested Create Queries
    for (const [key, group] of paketGroups.entries()) {
      let totalPagu = group.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.jumlah) || 0), 0);
      
      const itemCreates = group.items.map((it: any) => ({
        uraian: it.uraian,
        spesifikasi: it.spesifikasi || '-',
        koefisien: String(it.koefisien),
        satuan: String(it.satuan),
        hargaSatuan: parseFloat(it.hargaSatuan) || 0,
        ppn: parseFloat(it.ppn) || 0,
        jumlah: parseFloat(it.jumlah) || 0,
      }));

      txs.push(
        prisma.rincianBelanja.create({
          data: {
            subKegiatanId: group.subKegiatanId,
            rekeningId: group.rekeningId,
            sumberDanaId: group.sumberDanaId,
            namaPaket: group.namaPaket,
            tipePaket: '-',
            volumeInduk: 1,
            hargaSatuanInduk: totalPagu,
            paguInduk: totalPagu, 
            paguRkpd: totalPagu,
            paguPerubahan: totalPagu,
            rincianItemBelanjas: {
              create: itemCreates
            }
          }
        })
      );
    }

    // Execute all database operations in a single fast transaction!
    await prisma.$transaction(txs);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

