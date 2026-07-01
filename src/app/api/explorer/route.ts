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

        // Aggregate totalPagu for SKPDs
        const rincianSkpd = await prisma.rincianBelanja.findMany({
          where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpds.map(s => s.id) } } } } },
          select: { pagu: true, subKegiatan: { select: { kegiatan: { select: { program: { select: { skpdId: true } } } } } } }
        });
        const paguBySkpd: Record<number, number> = {};
        rincianSkpd.forEach(r => {
          const sid = r.subKegiatan.kegiatan.program.skpdId;
          paguBySkpd[sid] = (paguBySkpd[sid] || 0) + Number(r.pagu);
        });

        const enhancedSkpds = skpds.map(s => ({
          ...s,
          totalPagu: paguBySkpd[s.id] || 0
        }));
        
        return NextResponse.json(enhancedSkpds);

      case 'program':
        const skpdId = searchParams.get('skpdId');
        if (!skpdId) return NextResponse.json({ error: 'skpdId required' }, { status: 400 });
        
        const programs = await prisma.program.findMany({
          where: { skpdId: parseInt(skpdId, 10) },
          orderBy: { kode: 'asc' }
        });

        const rincianProg = await prisma.rincianBelanja.findMany({
          where: { subKegiatan: { kegiatan: { program: { skpdId: parseInt(skpdId, 10) } } } },
          select: { pagu: true, subKegiatan: { select: { kegiatan: { select: { programId: true } } } } }
        });
        const paguByProg: Record<number, number> = {};
        rincianProg.forEach(r => {
          const pid = r.subKegiatan.kegiatan.programId;
          paguByProg[pid] = (paguByProg[pid] || 0) + Number(r.pagu);
        });

        return NextResponse.json(programs.map(p => ({ ...p, totalPagu: paguByProg[p.id] || 0 })));

      case 'kegiatan':
        const programId = searchParams.get('programId');
        if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 });
        
        const kegiatans = await prisma.kegiatan.findMany({
          where: { programId: parseInt(programId, 10) },
          orderBy: { kode: 'asc' }
        });

        const rincianKeg = await prisma.rincianBelanja.findMany({
          where: { subKegiatan: { kegiatan: { programId: parseInt(programId, 10) } } },
          select: { pagu: true, subKegiatan: { select: { kegiatanId: true } } }
        });
        const paguByKeg: Record<number, number> = {};
        rincianKeg.forEach(r => {
          const kid = r.subKegiatan.kegiatanId;
          paguByKeg[kid] = (paguByKeg[kid] || 0) + Number(r.pagu);
        });

        return NextResponse.json(kegiatans.map(k => ({ ...k, totalPagu: paguByKeg[k.id] || 0 })));

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

        const rincianSub = await prisma.rincianBelanja.findMany({
          where: { subKegiatan: { kegiatanId: parseInt(kegiatanId, 10) } },
          select: { pagu: true, subKegiatanId: true }
        });
        const paguBySub: Record<number, number> = {};
        rincianSub.forEach(r => {
          const sid = r.subKegiatanId;
          paguBySub[sid] = (paguBySub[sid] || 0) + Number(r.pagu);
        });

        return NextResponse.json(subkegiatans.map(s => ({ ...s, totalPagu: paguBySub[s.id] || 0 })));

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

