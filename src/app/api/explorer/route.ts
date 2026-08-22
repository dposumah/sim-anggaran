import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedExplorer = unstable_cache(
  async (tahun: number, tahunId: number, level: string, idParam: string | null) => {
    switch (level) {
      case 'skpd': {
        const skpds = await prisma.skpd.findMany({
          where: { 
            tahunId: tahunId,
            nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
          },
          orderBy: { kode: 'asc' },
          include: {
            pagus: true
          }
        });

        // Aggregate totalPagu for SKPDs optimally
        const subKegiatansSkpd = await prisma.subKegiatan.findMany({
          where: { kegiatan: { program: { skpdId: { in: skpds.map(s => s.id) } } } },
          select: { id: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
        });
        
        const paguPerSubSkpd = await prisma.rincianBelanja.groupBy({
          by: ['subKegiatanId'],
          where: { subKegiatanId: { in: subKegiatansSkpd.map(s => s.id) } },
          _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
        });

        const paguBySkpd: Record<number, { paguInduk: number, paguRkpd: number, paguPerubahan: number }> = {};
        const subPaguMapSkpd = new Map(paguPerSubSkpd.map(p => [p.subKegiatanId, p._sum]));

        subKegiatansSkpd.forEach(sub => {
          const sid = sub.kegiatan.program.skpdId;
          const current = subPaguMapSkpd.get(sub.id) || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          const acc = paguBySkpd[sid] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          
          paguBySkpd[sid] = {
            paguInduk: acc.paguInduk + Number(current.paguInduk || 0),
            paguRkpd: acc.paguRkpd + Number(current.paguRkpd || 0),
            paguPerubahan: acc.paguPerubahan + Number(current.paguPerubahan || 0),
          };
        });

        const enhancedSkpds = skpds.map(s => ({
          ...s,
          ...(paguBySkpd[s.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 })
        }));
        
        return enhancedSkpds;
      }
      case 'program': {
        const skpdId = idParam;
        if (!skpdId) throw new Error('skpdId required');
        
        const programs = await prisma.program.findMany({
          where: { skpdId: parseInt(skpdId, 10) },
          orderBy: { kode: 'asc' }
        });

        const subKegiatansProg = await prisma.subKegiatan.findMany({
          where: { kegiatan: { program: { skpdId: parseInt(skpdId, 10) } } },
          select: { id: true, kegiatan: { select: { programId: true } } }
        });

        const paguPerSubProg = await prisma.rincianBelanja.groupBy({
          by: ['subKegiatanId'],
          where: { subKegiatanId: { in: subKegiatansProg.map(s => s.id) } },
          _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
        });

        const paguByProg: Record<number, { paguInduk: number, paguRkpd: number, paguPerubahan: number }> = {};
        const subPaguMapProg = new Map(paguPerSubProg.map(p => [p.subKegiatanId, p._sum]));

        subKegiatansProg.forEach(sub => {
          const pid = sub.kegiatan.programId;
          const current = subPaguMapProg.get(sub.id) || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          const acc = paguByProg[pid] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          paguByProg[pid] = {
            paguInduk: acc.paguInduk + Number(current.paguInduk || 0),
            paguRkpd: acc.paguRkpd + Number(current.paguRkpd || 0),
            paguPerubahan: acc.paguPerubahan + Number(current.paguPerubahan || 0),
          };
        });

        return programs.map(p => ({ ...p, ...(paguByProg[p.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) }));
      }
      case 'kegiatan': {
        const programId = idParam;
        if (!programId) throw new Error('programId required');
        
        const kegiatans = await prisma.kegiatan.findMany({
          where: { programId: parseInt(programId, 10) },
          orderBy: { kode: 'asc' }
        });

        const subKegiatansKeg = await prisma.subKegiatan.findMany({
          where: { kegiatan: { programId: parseInt(programId, 10) } },
          select: { id: true, kegiatanId: true }
        });

        const paguPerSubKeg = await prisma.rincianBelanja.groupBy({
          by: ['subKegiatanId'],
          where: { subKegiatanId: { in: subKegiatansKeg.map(s => s.id) } },
          _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
        });

        const paguByKeg: Record<number, { paguInduk: number, paguRkpd: number, paguPerubahan: number }> = {};
        const subPaguMapKeg = new Map(paguPerSubKeg.map(p => [p.subKegiatanId, p._sum]));

        subKegiatansKeg.forEach(sub => {
          const kid = sub.kegiatanId;
          const current = subPaguMapKeg.get(sub.id) || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          const acc = paguByKeg[kid] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          paguByKeg[kid] = {
            paguInduk: acc.paguInduk + Number(current.paguInduk || 0),
            paguRkpd: acc.paguRkpd + Number(current.paguRkpd || 0),
            paguPerubahan: acc.paguPerubahan + Number(current.paguPerubahan || 0),
          };
        });

        return kegiatans.map(k => ({ ...k, ...(paguByKeg[k.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) }));
      }
      case 'subkegiatan': {
        const kegiatanId = idParam;
        if (!kegiatanId) throw new Error('kegiatanId required');
        
        const subkegiatans = await prisma.subKegiatan.findMany({
          where: { kegiatanId: parseInt(kegiatanId, 10) },
          orderBy: { kode: 'asc' },
          include: {
            subKegiatanSumberDanas: {
              include: {
                sumberDana: true
              }
            }
          }
        });

        const paguPerSubSub = await prisma.rincianBelanja.groupBy({
          by: ['subKegiatanId'],
          where: { subKegiatanId: { in: subkegiatans.map(s => s.id) } },
          _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
        });

        const paguBySub: Record<number, { paguInduk: number, paguRkpd: number, paguPerubahan: number }> = {};
        paguPerSubSub.forEach(p => {
          paguBySub[p.subKegiatanId] = {
            paguInduk: Number(p._sum.paguInduk || 0),
            paguRkpd: Number(p._sum.paguRkpd || 0),
            paguPerubahan: Number(p._sum.paguPerubahan || 0),
          };
        });

        return subkegiatans.map(s => ({ ...s, ...(paguBySub[s.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) }));
      }
      case 'rincian': {
        const subKegiatanId = idParam;
        if (!subKegiatanId) throw new Error('subKegiatanId required');
        
        const rincian = await prisma.rincianBelanja.findMany({
          where: { subKegiatanId: parseInt(subKegiatanId, 10) },
          include: {
            sumberDana: true,
            rekening: true,
            rincianItemBelanjas: true
          },
          orderBy: [
            { rekening: { kode: 'asc' } },
            { id: 'asc' }
          ]
        });

        const realisasiData = await prisma.realisasiBelanja.groupBy({
          by: ['rekeningId', 'sumberDanaId'],
          where: { subKegiatanId: parseInt(subKegiatanId, 10) },
          _sum: { nominal: true }
        });

        const realisasiMap = new Map<string, number>();
        realisasiData.forEach(r => {
          realisasiMap.set(`${r.sumberDanaId}_${r.rekeningId}`, Number(r._sum.nominal || 0));
        });

        const enhancedRincian = rincian.map(r => {
          const key = `${r.sumberDanaId}_${r.rekeningId}`;
          let availableRealisasi = realisasiMap.get(key) || 0;
          
          const paguPerubahan = Number(r.paguPerubahan || 0);
          const allocatedRealisasi = Math.min(availableRealisasi, paguPerubahan);
          
          if (availableRealisasi > 0) {
            // Subtract allocated so next package under same rekening gets the rest
            realisasiMap.set(key, availableRealisasi - allocatedRealisasi);
          }

          return {
            ...r,
            realisasi: allocatedRealisasi
          };
        });

        return enhancedRincian;
      }
      default:
        throw new Error('Invalid level');
    }
  },
  ['explorer-data'],
  { tags: ['laporanData'], revalidate: false }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'skpd';
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    let idParam = null;
    if (level === 'program') idParam = searchParams.get('skpdId');
    if (level === 'kegiatan') idParam = searchParams.get('programId');
    if (level === 'subkegiatan') idParam = searchParams.get('kegiatanId');
    if (level === 'rincian') idParam = searchParams.get('subKegiatanId');

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    try {
      const data = await getCachedExplorer(tahun, tahunData.id, level, idParam);
      return NextResponse.json(data);
    } catch (e: any) {
      if (e.message.includes('required') || e.message === 'Invalid level') {
         return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

  } catch (error: any) {
    console.error('Explorer API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
