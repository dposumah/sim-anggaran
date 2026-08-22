import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { subKegiatan, items } = await req.json();

    if (!subKegiatan || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Extract Kode Sub Kegiatan
    const kodeSubKeg = subKegiatan.split(' ')[0];

    // Cari Sub Kegiatan di DB
    let subKeg = await prisma.subKegiatan.findFirst({
      where: { kode: kodeSubKeg }
    });

    if (!subKeg) {
      return NextResponse.json({ success: false, error: 'Sub Kegiatan dengan kode ' + kodeSubKeg + ' tidak ditemukan di database. Pastikan Anda sudah mengupload Pagu Excel atau mendaftarkan Kegiatan/SubKegiatannya.' }, { status: 404 });
    }

    // Process items. Group by Rekening -> Sumber Dana -> Paket
    // Since we need to create them, we must ensure Rekening and SumberDana exist.
    for (let item of items) {
      // Upsert Rekening
      let rek = await prisma.rekening.findUnique({ where: { kode: item.rekening }});
      if (!rek) {
        rek = await prisma.rekening.create({ data: { kode: item.rekening, nama: item.namaRekening }});
      }
      item.rekeningId = rek.id;

      // Upsert Sumber Dana (SIPD often has slightly different names, we match loosely or create)
      let sd = await prisma.sumberDana.findFirst({ where: { nama: item.sumberDana }});
      if (!sd) {
        // Let's create a generic kode if not found
        sd = await prisma.sumberDana.create({ data: { kode: 'SD-' + Math.floor(Math.random()*10000), nama: item.sumberDana }});
      }
      item.sumberDanaId = sd.id;
    }

    // Hapus data RincianBelanja lama untuk sub kegiatan ini (karena akan direplace)
    await prisma.rincianBelanja.deleteMany({
      where: { subKegiatanId: subKeg.id }
    });

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
          paguInduk: 0,
          paguRkpd: 0,
          paguPerubahan: 0,
          items: []
        });
      }
      paketGroups.get(key).items.push(item);
    });

    // Save to DB
    for (const [key, group] of paketGroups.entries()) {
      let totalPagu = group.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.jumlah) || 0), 0);
      
      const newRincian = await prisma.rincianBelanja.create({
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
        }
      });

      // Create Item Details
      const itemCreates = group.items.map((it: any) => ({
        rincianBelanjaId: newRincian.id,
        uraian: it.uraian,
        spesifikasi: it.spesifikasi || '-',
        koefisien: String(it.koefisien),
        satuan: String(it.satuan),
        hargaSatuan: parseFloat(it.hargaSatuan) || 0,
        ppn: parseFloat(it.ppn) || 0,
        jumlah: parseFloat(it.jumlah) || 0,
      }));

      await prisma.rincianItemBelanja.createMany({
        data: itemCreates
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
