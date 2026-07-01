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

    // 1. Fetch the nested tree for SKPD Pendidikan
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      orderBy: { kode: 'asc' },
      include: {
        programs: {
          orderBy: { kode: 'asc' },
          include: {
            kegiatans: {
              orderBy: { kode: 'asc' },
              include: {
                subKegiatans: {
                  orderBy: { kode: 'asc' },
                  include: {
                    subKegiatanSumberDanas: {
                      include: { sumberDana: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // 2. Fetch all pagu aggregates for this SKPD
    const skpdIds = skpds.map(s => s.id);
    const subKegiatansSkpd = await prisma.subKegiatan.findMany({
      where: { kegiatan: { program: { skpdId: { in: skpdIds } } } },
      select: { id: true, kegiatan: { select: { program: { select: { skpdId: true, id: true } }, id: true } } }
    });
    
    const paguPerSubSkpd = await prisma.rincianBelanja.groupBy({
      by: ['subKegiatanId'],
      where: { subKegiatanId: { in: subKegiatansSkpd.map(s => s.id) } },
      _sum: { pagu: true }
    });

    // Map the pagu
    const subPaguMap = new Map(paguPerSubSkpd.map(p => [p.subKegiatanId, p._sum.pagu || 0]));

    // 3. Mutate the tree with totalPagu
    const result = skpds.map(skpd => {
      let skpdTotal = 0;
      const programs = skpd.programs.map(prog => {
        let progTotal = 0;
        const kegiatans = prog.kegiatans.map(keg => {
          let kegTotal = 0;
          const subKegiatans = keg.subKegiatans.map(sub => {
            const subTotal = Number(subPaguMap.get(sub.id) || 0);
            kegTotal += subTotal;
            return {
              ...sub,
              totalPagu: subTotal,
              is_locked: sub.subKegiatanSumberDanas.some(sd => sd.isLocked)
            };
          });
          progTotal += kegTotal;
          return { ...keg, subKegiatans, totalPagu: kegTotal };
        });
        skpdTotal += progTotal;
        return { ...prog, kegiatans, totalPagu: progTotal };
      });
      return { ...skpd, programs, totalPagu: skpdTotal };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
