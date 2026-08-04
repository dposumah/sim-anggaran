import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const skpdId = searchParams.get('skpdId');
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);
    const bulan = searchParams.get('bulan');

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun } });
    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    let filter: any = { tahunId: tahunData.id };
    if (skpdId) filter.skpdId = parseInt(skpdId, 10);
    if (bulan) filter.bulan = parseInt(bulan, 10);

    const realisasiList = await prisma.realisasiBelanja.findMany({
      where: filter,
      include: {
        skpd: { select: { nama: true } },
        subKegiatan: { select: { kode: true, nama: true } },
        sumberDana: { select: { kode: true, nama: true } },
        rekening: { select: { kode: true, nama: true } }
      },
      orderBy: [
        { subKegiatan: { kode: 'asc' } },
        { rekening: { kode: 'asc' } },
        { bulan: 'asc' }
      ]
    });

    return NextResponse.json({ data: realisasiList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahun, subKegiatanId, sumberDanaId, rekeningId, bulan, nominal, keterangan } = body;

    if (!skpdId || !subKegiatanId || !sumberDanaId || !rekeningId || !bulan || nominal === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun: parseInt(tahun || '2026', 10) } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });

    const result = await prisma.realisasiBelanja.upsert({
      where: {
        skpdId_subKegiatanId_sumberDanaId_rekeningId_bulan: {
          skpdId: parseInt(skpdId),
          subKegiatanId: parseInt(subKegiatanId),
          sumberDanaId: parseInt(sumberDanaId),
          rekeningId: parseInt(rekeningId),
          bulan: parseInt(bulan)
        }
      },
      update: {
        nominal: parseFloat(nominal),
        keterangan
      },
      create: {
        skpdId: parseInt(skpdId),
        tahunId: tahunData.id,
        subKegiatanId: parseInt(subKegiatanId),
        sumberDanaId: parseInt(sumberDanaId),
        rekeningId: parseInt(rekeningId),
        bulan: parseInt(bulan),
        nominal: parseFloat(nominal),
        keterangan
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID dibutuhkan' }, { status: 400 });

    await prisma.realisasiBelanja.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
