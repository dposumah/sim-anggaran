export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'skpd';
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    switch (level) {
      case 'skpd':
        const skpds = await prisma.skpd.findMany({
          where: { 
            tahunId: tahunData.id,
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
        
        return NextResponse.json(enhancedSkpds);

      case 'program':
        const skpdId = searchParams.get('skpdId');
        if (!skpdId) return NextResponse.json({ error: 'skpdId required' }, { status: 400 });
        
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

        return NextResponse.json(programs.map(p => ({ ...p, ...(paguByProg[p.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) })));

      case 'kegiatan':
        const programId = searchParams.get('programId');
        if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 });
        
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

        return NextResponse.json(kegiatans.map(k => ({ ...k, ...(paguByKeg[k.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) })));

      case 'subkegiatan':
        const kegiatanId = searchParams.get('kegiatanId');
        if (!kegiatanId) return NextResponse.json({ error: 'kegiatanId required' }, { status: 400 });
        
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

        return NextResponse.json(subkegiatans.map(s => ({ ...s, ...(paguBySub[s.id] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 }) })));

      case 'rincian':
        const subKegiatanId = searchParams.get('subKegiatanId');
        if (!subKegiatanId) return NextResponse.json({ error: 'subKegiatanId required' }, { status: 400 });
        
        const rincian = await prisma.rincianBelanja.findMany({
          where: { subKegiatanId: parseInt(subKegiatanId, 10) },
          include: {
            sumberDana: true,
            rekening: true
          }
        });
        return NextResponse.json(rincian);

      default:
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Explorer API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

