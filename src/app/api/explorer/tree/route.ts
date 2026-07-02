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
    
    const paguPerSubSkpdAndSd = await prisma.rincianBelanja.groupBy({
      by: ['subKegiatanId', 'sumberDanaId'],
      where: { subKegiatanId: { in: subKegiatansSkpd.map(s => s.id) } },
      _sum: { pagu: true }
    });

    const sds = await prisma.sumberDana.findMany();
    const sdNameMap = new Map(sds.map(s => [s.id, s.nama]));

    const subPaguSdMap = new Map<number, { [key: string]: number }>();
    const allSubTotalMap = new Map<number, number>();

    for (const p of paguPerSubSkpdAndSd) {
      const sId = p.subKegiatanId;
      const sdNama = sdNameMap.get(p.sumberDanaId) || 'Unknown';
      const pagu = Number(p._sum.pagu || 0);

      if (!subPaguSdMap.has(sId)) subPaguSdMap.set(sId, {});
      const sdObj = subPaguSdMap.get(sId)!;
      sdObj[sdNama] = (sdObj[sdNama] || 0) + pagu;

      allSubTotalMap.set(sId, (allSubTotalMap.get(sId) || 0) + pagu);
    }

    // 3. Mutate the tree with totalPagu and sumberDanas
    const result = skpds.map(skpd => {
      let skpdTotal = 0;
      let skpdSdMap: { [key: string]: number } = {};

      const programs = skpd.programs.map(prog => {
        let progTotal = 0;
        let progSdMap: { [key: string]: number } = {};

        const kegiatans = prog.kegiatans.map(keg => {
          let kegTotal = 0;
          let kegSdMap: { [key: string]: number } = {};

          const subKegiatans = keg.subKegiatans.map(sub => {
            const subTotal = allSubTotalMap.get(sub.id) || 0;
            const subSds = subPaguSdMap.get(sub.id) || {};
            
            kegTotal += subTotal;
            for (const [sd, pagu] of Object.entries(subSds)) {
              kegSdMap[sd] = (kegSdMap[sd] || 0) + pagu;
            }

            return {
              ...sub,
              totalPagu: subTotal,
              sumberDanas: subSds,
              is_locked: sub.subKegiatanSumberDanas.some(sd => sd.isLocked)
            };
          });

          progTotal += kegTotal;
          for (const [sd, pagu] of Object.entries(kegSdMap)) {
            progSdMap[sd] = (progSdMap[sd] || 0) + pagu;
          }

          return { ...keg, subKegiatans, totalPagu: kegTotal, sumberDanas: kegSdMap };
        });

        skpdTotal += progTotal;
        for (const [sd, pagu] of Object.entries(progSdMap)) {
          skpdSdMap[sd] = (skpdSdMap[sd] || 0) + pagu;
        }

        return { ...prog, kegiatans, totalPagu: progTotal, sumberDanas: progSdMap };
      });
      return { ...skpd, programs, totalPagu: skpdTotal, sumberDanas: skpdSdMap };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
