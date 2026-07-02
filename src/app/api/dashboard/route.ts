export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Total counts (Khusus Dinas Pendidikan)
    const skpdCount = await prisma.skpd.count({ 
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      } 
    });
    
    const programCount = await prisma.program.count({
      where: { 
        skpd: { 
          tahunId: tahunData.id,
          nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
        } 
      }
    });

    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      include: { pagus: true }
    });
    
    const skpdIdList = skpds.map(s => s.id);

    // Aggregate pagu per SKPD efficiently
    const rincianBySkpd = await prisma.rincianBelanja.groupBy({
      by: ['subKegiatanId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { pagu: true }
    });

    // Map subKegiatanId -> skpdId
    const subKegs = await prisma.subKegiatan.findMany({
      where: { id: { in: rincianBySkpd.map(r => r.subKegiatanId) } },
      select: { id: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
    });
    
    const subToSkpd = new Map(subKegs.map(s => [s.id, s.kegiatan.program.skpdId]));
    
    let totalPagu = 0;
    const paguBySkpd: Record<number, number> = {};
    
    rincianBySkpd.forEach(r => {
      const skpdId = subToSkpd.get(r.subKegiatanId);
      if (skpdId) {
        const p = Number(r._sum.pagu || 0);
        paguBySkpd[skpdId] = (paguBySkpd[skpdId] || 0) + p;
        totalPagu += p;
      }
    });

    const skpdData = skpds.map(skpd => {
      const ceiling = skpd.pagus.length > 0 ? Number(skpd.pagus[0].ceilingAmount) : 0;
      const displayName = skpd.nama === skpd.namaSubUnit ? skpd.nama : `${skpd.nama} - ${skpd.namaSubUnit}`;
      return {
        id: skpd.id,
        nama: displayName,
        pagu: paguBySkpd[skpd.id] || 0,
        ceiling: ceiling
      };
    }).sort((a, b) => b.pagu - a.pagu);

    const top10Skpd = skpdData.slice(0, 10);

    // 1. Sumber Dana Chart (Pie Chart)
    const sumberDanaAgg = await prisma.rincianBelanja.groupBy({
      by: ['sumberDanaId'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { pagu: true }
    });
    
    const sumberDanas = await prisma.sumberDana.findMany({
      where: { id: { in: sumberDanaAgg.map(s => s.sumberDanaId).filter(Boolean) as number[] } }
    });
    const sdMap = new Map(sumberDanas.map(sd => [sd.id, sd.nama]));
    
    const sumberDanaChart = sumberDanaAgg.map(agg => ({
      name: agg.sumberDanaId ? sdMap.get(agg.sumberDanaId) || 'Unknown' : 'Belum Ditentukan',
      value: Number(agg._sum.pagu || 0)
    })).sort((a, b) => b.value - a.value);

    // 2. Top 10 Rekening Chart (Bar Chart)
    const rekeningAgg = await prisma.rincianBelanja.groupBy({
      by: ['kodeRekening', 'namaRekening'],
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdList } } } } },
      _sum: { pagu: true },
      orderBy: { _sum: { pagu: 'desc' } },
      take: 10
    });

    const topRekeningChart = rekeningAgg.map(agg => ({
      kode: agg.kodeRekening,
      nama: agg.namaRekening,
      value: Number(agg._sum.pagu || 0)
    }));

    return NextResponse.json({
      summary: {
        totalPagu,
        skpdCount,
        programCount
      },
      skpdData: top10Skpd,
      sumberDanaChart,
      topRekeningChart
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
