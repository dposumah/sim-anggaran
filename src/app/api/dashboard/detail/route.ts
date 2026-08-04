import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);
    const type = searchParams.get('type');
    const idParam = searchParams.get('id');

    if (!type || !idParam) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Hanya untuk SKPD Pendidikan
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      }
    });
    const skpdIdList = skpds.map(s => s.id);

    const whereClause: any = {
      subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } }
    };

    if (type === 'sumber_dana') {
      whereClause.sumberDanaId = id;
    } else if (type === 'rekening') {
      whereClause.rekeningId = id;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const rincianAgg = await prisma.rincianBelanja.groupBy({
      by: ['subKegiatanId'],
      where: whereClause,
      _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
    });

    const subKegs = await prisma.subKegiatan.findMany({
      where: { id: { in: rincianAgg.map(r => r.subKegiatanId) } }
    });
    const subMap = new Map(subKegs.map(s => [s.id, s]));

    const details = rincianAgg.map(agg => {
      const sub = subMap.get(agg.subKegiatanId);
      return {
        id: agg.subKegiatanId,
        kode: sub?.kode || 'Unknown',
        nama: sub?.nama || 'Unknown',
        pagu: agg._sum?.paguInduk ? Number(agg._sum.paguInduk) : 0
      };
    }).sort((a, b) => b.pagu - a.pagu);

    let infoName = 'Unknown';
    if (type === 'sumber_dana') {
      const sd = await prisma.sumberDana.findUnique({ where: { id } });
      if (sd) infoName = sd.nama;
    } else {
      const rek = await prisma.rekening.findUnique({ where: { id } });
      if (rek) infoName = rek.nama;
    }

    return NextResponse.json({
      name: infoName,
      details
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem', details: error.message },
      { status: 500 }
    );
  }
}
