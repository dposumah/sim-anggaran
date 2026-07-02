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
      _sum: { pagu: true, paguPerubahan: true }
    });

    const sds = await prisma.sumberDana.findMany();
    const sdNameMap = new Map(sds.map(s => [s.id, s.nama]));

    const subPaguSdMap = new Map<number, { [key: string]: { pagu: number, paguPerubahan: number | null } }>();
    const allSubTotalMap = new Map<number, { pagu: number, paguPerubahan: number | null }>();

    for (const p of paguPerSubSkpdAndSd) {
      const sId = p.subKegiatanId;
      const sdNama = sdNameMap.get(p.sumberDanaId) || 'Unknown';
      const pagu = Number(p._sum.pagu || 0);
      const paguPerubahan = p._sum.paguPerubahan !== null ? Number(p._sum.paguPerubahan) : null;

      if (!subPaguSdMap.has(sId)) subPaguSdMap.set(sId, {});
      const sdObj = subPaguSdMap.get(sId)!;
      
      const currSd = sdObj[sdNama] || { pagu: 0, paguPerubahan: null };
      sdObj[sdNama] = {
        pagu: currSd.pagu + pagu,
        paguPerubahan: (currSd.paguPerubahan !== null || paguPerubahan !== null) 
          ? (currSd.paguPerubahan || 0) + (paguPerubahan || 0) 
          : null
      };

      const currTotal = allSubTotalMap.get(sId) || { pagu: 0, paguPerubahan: null };
      allSubTotalMap.set(sId, {
        pagu: currTotal.pagu + pagu,
        paguPerubahan: (currTotal.paguPerubahan !== null || paguPerubahan !== null)
          ? (currTotal.paguPerubahan || 0) + (paguPerubahan || 0)
          : null
      });
    }

    // 3. Mutate the tree with totalPagu and sumberDanas
    const result = skpds.map(skpd => {
      let skpdTotal = { pagu: 0, paguPerubahan: null as number | null };
      let skpdSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

      const programs = skpd.programs.map(prog => {
        let progTotal = { pagu: 0, paguPerubahan: null as number | null };
        let progSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

        const kegiatans = prog.kegiatans.map(keg => {
          let kegTotal = { pagu: 0, paguPerubahan: null as number | null };
          let kegSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

          const subKegiatans = keg.subKegiatans.map(sub => {
            const subTotal = allSubTotalMap.get(sub.id) || { pagu: 0, paguPerubahan: null };
            const subSds = subPaguSdMap.get(sub.id) || {};
            
            kegTotal.pagu += subTotal.pagu;
            if (subTotal.paguPerubahan !== null) {
               kegTotal.paguPerubahan = (kegTotal.paguPerubahan || 0) + subTotal.paguPerubahan;
            }

            for (const [sd, vals] of Object.entries(subSds)) {
              if (!kegSdMap[sd]) kegSdMap[sd] = { pagu: 0, paguPerubahan: null };
              kegSdMap[sd].pagu += vals.pagu;
              if (vals.paguPerubahan !== null) {
                kegSdMap[sd].paguPerubahan = (kegSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
              }
            }

            return {
              ...sub,
              totalPagu: subTotal.pagu,
              totalPaguPerubahan: subTotal.paguPerubahan,
              sumberDanas: subSds,
              is_locked: sub.subKegiatanSumberDanas.some(sd => sd.isLocked)
            };
          });

          progTotal.pagu += kegTotal.pagu;
          if (kegTotal.paguPerubahan !== null) {
             progTotal.paguPerubahan = (progTotal.paguPerubahan || 0) + kegTotal.paguPerubahan;
          }
          
          for (const [sd, vals] of Object.entries(kegSdMap)) {
            if (!progSdMap[sd]) progSdMap[sd] = { pagu: 0, paguPerubahan: null };
            progSdMap[sd].pagu += vals.pagu;
            if (vals.paguPerubahan !== null) {
              progSdMap[sd].paguPerubahan = (progSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
            }
          }

          return { 
            ...keg, 
            subKegiatans, 
            totalPagu: kegTotal.pagu, 
            totalPaguPerubahan: kegTotal.paguPerubahan, 
            sumberDanas: kegSdMap 
          };
        });

        skpdTotal.pagu += progTotal.pagu;
        if (progTotal.paguPerubahan !== null) {
           skpdTotal.paguPerubahan = (skpdTotal.paguPerubahan || 0) + progTotal.paguPerubahan;
        }

        for (const [sd, vals] of Object.entries(progSdMap)) {
          if (!skpdSdMap[sd]) skpdSdMap[sd] = { pagu: 0, paguPerubahan: null };
          skpdSdMap[sd].pagu += vals.pagu;
          if (vals.paguPerubahan !== null) {
            skpdSdMap[sd].paguPerubahan = (skpdSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
          }
        }

        return { 
          ...prog, 
          kegiatans, 
          totalPagu: progTotal.pagu, 
          totalPaguPerubahan: progTotal.paguPerubahan, 
          sumberDanas: progSdMap 
        };
      });
      return { 
        ...skpd, 
        programs, 
        totalPagu: skpdTotal.pagu, 
        totalPaguPerubahan: skpdTotal.paguPerubahan, 
        sumberDanas: skpdSdMap 
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
