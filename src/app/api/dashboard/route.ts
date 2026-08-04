import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

const getCachedDashboard = unstable_cache(
  async (tahun: number, tahunId: number) => {
    // Only Pendidikan
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunId,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      include: { pagus: true }
    });
    
    const skpdIdList = skpds.map(s => s.id);

    const [
      totalPaguAgg,
      skpdCount,
      programCount,
      kegiatanCount,
      subKegiatanCount
    ] = await Promise.all([
      prisma.rincianBelanja.aggregate({
        _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true },
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } }
      }),
      prisma.skpd.count({ where: { id: { in: skpdIdList } } }),
      prisma.program.count({ where: { skpdId: { in: skpdIdList } } }),
      prisma.kegiatan.count({ where: { program: { skpdId: { in: skpdIdList } } } }),
      prisma.subKegiatan.count({ where: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } })
    ]);

    const totalRealisasiAgg = await prisma.realisasiBelanja.aggregate({
      _sum: { nominal: true },
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } }
    });
    const totalRealisasi = Number(totalRealisasiAgg._sum.nominal || 0);

    const totalPagu = Number(totalPaguAgg._sum.paguInduk || 0); // fallback for backward compat
    const totalPaguInduk = Number(totalPaguAgg._sum.paguInduk || 0);
    const totalPaguRkpd = Number(totalPaguAgg._sum.paguRkpd || 0);
    const totalPaguPerubahan = Number(totalPaguAgg._sum.paguPerubahan || 0);

    const skpdAgg = await prisma.rincianBelanja.groupBy({
      by: ['subKegiatanId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
    });

    const skpdMap = new Map<number, { 
      nama: string; 
      kode: string; 
      paguInduk: number; 
      paguRkpd: number; 
      paguPerubahan: number;
      ceiling: number;
    }>();
    
    skpds.forEach(skpd => {
      skpdMap.set(skpd.id, {
        nama: skpd.nama === skpd.namaSubUnit ? skpd.nama : `${skpd.nama} - ${skpd.namaSubUnit}`,
        kode: skpd.kode,
        paguInduk: 0,
        paguRkpd: 0,
        paguPerubahan: 0,
        ceiling: skpd.pagus.length > 0 ? Number(skpd.pagus[0].paguInduk) : 0
      });
    });

    const subKegs = await prisma.subKegiatan.findMany({
      where: { id: { in: skpdAgg.map(a => a.subKegiatanId) } },
      include: { kegiatan: { include: { program: { select: { skpdId: true } } } } }
    });

    const subKegMap = new Map(subKegs.map(sk => [sk.id, sk.kegiatan.program.skpdId]));

    skpdAgg.forEach(agg => {
      const skpdId = subKegMap.get(agg.subKegiatanId);
      if (skpdId) {
        const existing = skpdMap.get(skpdId);
        if (existing) {
          existing.paguInduk += Number(agg._sum.paguInduk || 0);
          existing.paguRkpd += Number(agg._sum.paguRkpd || 0);
          existing.paguPerubahan += Number(agg._sum.paguPerubahan || 0);
        }
      }
    });

    const skpdData = Array.from(skpdMap.values())
      .map(s => ({
        ...s,
        value: s.paguInduk, // backward compat
      }))
      .sort((a, b) => b.paguInduk - a.paguInduk);

    const top10Skpd = skpdData.slice(0, 10);

    // 1. Rekapitulasi per Sumber Dana
    const sumberDanaAgg = await prisma.rincianBelanja.groupBy({
      by: ['sumberDanaId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { 
        paguInduk: true,
        paguRkpd: true,
        paguPerubahan: true 
      },
      orderBy: { _sum: { paguInduk: 'desc' } }
    });

    const realisasiSDAgg = await prisma.realisasiBelanja.groupBy({
      by: ['sumberDanaId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { nominal: true }
    });
    const realisasiSDMap = new Map(realisasiSDAgg.map(a => [a.sumberDanaId, Number(a._sum.nominal || 0)]));

    const sumberDanas = await prisma.sumberDana.findMany({
      where: { id: { in: sumberDanaAgg.map(a => a.sumberDanaId).filter(Boolean) as number[] } }
    });
    const sdMap = new Map(sumberDanas.map(sd => [sd.id, sd.nama]));
    
    const sumberDanaChart = sumberDanaAgg.map(agg => ({
      id: agg.sumberDanaId,
      name: agg.sumberDanaId ? sdMap.get(agg.sumberDanaId) || 'Unknown' : 'Belum Ditentukan',
      value: Number(agg._sum.paguInduk || 0), // backward compat
      paguInduk: Number(agg._sum.paguInduk || 0),
      paguRkpd: Number(agg._sum.paguRkpd || 0),
      paguPerubahan: Number(agg._sum.paguPerubahan || 0),
      realisasi: realisasiSDMap.get(agg.sumberDanaId || 0) || 0
    })).sort((a, b) => b.paguInduk - a.paguInduk);

    // 2. Rekapitulasi per Rekening Belanja
    const rekeningAgg = await prisma.rincianBelanja.groupBy({
      by: ['rekeningId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { 
        paguInduk: true,
        paguRkpd: true,
        paguPerubahan: true 
      },
      orderBy: { _sum: { paguInduk: 'desc' } }
    });

    const realisasiRekAgg = await prisma.realisasiBelanja.groupBy({
      by: ['rekeningId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { nominal: true }
    });
    const realisasiRekMap = new Map(realisasiRekAgg.map(a => [a.rekeningId, Number(a._sum.nominal || 0)]));

    const rekenings = await prisma.rekening.findMany({
      where: { id: { in: rekeningAgg.map(r => r.rekeningId) } }
    });
    const rekMap = new Map(rekenings.map(r => [r.id, r]));

    const rekeningChart = rekeningAgg.map(agg => {
      const rek = rekMap.get(agg.rekeningId);
      return {
        id: agg.rekeningId,
        kode: rek?.kode || 'Unknown',
        nama: rek?.nama || 'Unknown',
        value: Number(agg._sum.paguInduk || 0), // backward compat
        paguInduk: Number(agg._sum.paguInduk || 0),
        paguRkpd: Number(agg._sum.paguRkpd || 0),
        paguPerubahan: Number(agg._sum.paguPerubahan || 0),
        realisasi: realisasiRekMap.get(agg.rekeningId || 0) || 0
      };
    });

    return {
      summary: {
        totalPagu,
        totalPaguInduk,
        totalPaguRkpd,
        totalPaguPerubahan,
        totalRealisasi,
        skpdCount,
        programCount,
        kegiatanCount,
        subKegiatanCount
      },
      top10Skpd,
      sumberDanaChart,
      rekeningChart
    };
  },
  ['dashboard-data'],
  { tags: ['laporanData'], revalidate: false }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    const data = await getCachedDashboard(tahun, tahunData.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem', details: error.message },
      { status: 500 }
    );
  }
}
