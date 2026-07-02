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

    // 1. Fetch SKPD Pendidikan
    const skpdsFlat = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      orderBy: { kode: 'asc' }
    });

    if (skpdsFlat.length === 0) {
      return NextResponse.json([]);
    }

    const skpdIds = skpdsFlat.map(s => s.id);

    // 2. Fetch related data concurrently to prevent timeouts on Vercel
    const [programsFlat, kegiatansFlat, subKegiatansFlat, sdRelsFlat, paguPerSubSkpdAndSd, sds] = await Promise.all([
      prisma.program.findMany({
        where: { skpdId: { in: skpdIds } },
        orderBy: { kode: 'asc' }
      }),
      prisma.kegiatan.findMany({
        where: { program: { skpdId: { in: skpdIds } } },
        orderBy: { kode: 'asc' }
      }),
      prisma.subKegiatan.findMany({
        where: { kegiatan: { program: { skpdId: { in: skpdIds } } } },
        orderBy: { kode: 'asc' }
      }),
      prisma.subKegiatanSumberDana.findMany({
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
      }),
      prisma.rincianBelanja.groupBy({
        by: ['subKegiatanId', 'sumberDanaId'],
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
        _sum: { pagu: true, paguPerubahan: true }
      }),
      prisma.sumberDana.findMany()
    ]);

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

    // 3. Assemble the tree in memory
    const progMap = new Map<number, any[]>();
    const kegMap = new Map<number, any[]>();
    const subKegMap = new Map<number, any[]>();
    const sdRelMap = new Map<number, any[]>();

    for (const rel of sdRelsFlat) {
      if (!sdRelMap.has(rel.subKegiatanId)) sdRelMap.set(rel.subKegiatanId, []);
      sdRelMap.get(rel.subKegiatanId)!.push(rel);
    }

    for (const sub of subKegiatansFlat) {
      const subTotal = allSubTotalMap.get(sub.id) || { pagu: 0, paguPerubahan: null };
      const subSds = subPaguSdMap.get(sub.id) || {};
      const rels = sdRelMap.get(sub.id) || [];
      const isLocked = rels.some(r => r.isLocked);
      
      const subNode = {
        ...sub,
        totalPagu: subTotal.pagu,
        totalPaguPerubahan: subTotal.paguPerubahan,
        sumberDanas: subSds,
        is_locked: isLocked
      };
      if (!subKegMap.has(sub.kegiatanId)) subKegMap.set(sub.kegiatanId, []);
      subKegMap.get(sub.kegiatanId)!.push(subNode);
    }

    for (const keg of kegiatansFlat) {
      const subKegiatans = subKegMap.get(keg.id) || [];
      
      let kegTotal = { pagu: 0, paguPerubahan: null as number | null };
      let kegSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

      for (const sub of subKegiatans) {
        kegTotal.pagu += sub.totalPagu;
        if (sub.totalPaguPerubahan !== null) {
          kegTotal.paguPerubahan = (kegTotal.paguPerubahan || 0) + sub.totalPaguPerubahan;
        }
        for (const [sd, vals] of Object.entries(sub.sumberDanas as Record<string, any>)) {
          if (!kegSdMap[sd]) kegSdMap[sd] = { pagu: 0, paguPerubahan: null };
          kegSdMap[sd].pagu += vals.pagu;
          if (vals.paguPerubahan !== null) {
            kegSdMap[sd].paguPerubahan = (kegSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
          }
        }
      }

      const kegNode = {
        ...keg,
        subKegiatans,
        totalPagu: kegTotal.pagu,
        totalPaguPerubahan: kegTotal.paguPerubahan,
        sumberDanas: kegSdMap
      };
      if (!kegMap.has(keg.programId)) kegMap.set(keg.programId, []);
      kegMap.get(keg.programId)!.push(kegNode);
    }

    for (const prog of programsFlat) {
      const kegiatans = kegMap.get(prog.id) || [];
      
      let progTotal = { pagu: 0, paguPerubahan: null as number | null };
      let progSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

      for (const keg of kegiatans) {
        progTotal.pagu += keg.totalPagu;
        if (keg.totalPaguPerubahan !== null) {
          progTotal.paguPerubahan = (progTotal.paguPerubahan || 0) + keg.totalPaguPerubahan;
        }
        for (const [sd, vals] of Object.entries(keg.sumberDanas as Record<string, any>)) {
          if (!progSdMap[sd]) progSdMap[sd] = { pagu: 0, paguPerubahan: null };
          progSdMap[sd].pagu += vals.pagu;
          if (vals.paguPerubahan !== null) {
            progSdMap[sd].paguPerubahan = (progSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
          }
        }
      }

      const progNode = {
        ...prog,
        kegiatans,
        totalPagu: progTotal.pagu,
        totalPaguPerubahan: progTotal.paguPerubahan,
        sumberDanas: progSdMap
      };
      if (!progMap.has(prog.skpdId)) progMap.set(prog.skpdId, []);
      progMap.get(prog.skpdId)!.push(progNode);
    }

    const result = skpdsFlat.map(skpd => {
      const programs = progMap.get(skpd.id) || [];
      
      let skpdTotal = { pagu: 0, paguPerubahan: null as number | null };
      let skpdSdMap: { [key: string]: { pagu: number, paguPerubahan: number | null } } = {};

      for (const prog of programs) {
        skpdTotal.pagu += prog.totalPagu;
        if (prog.totalPaguPerubahan !== null) {
          skpdTotal.paguPerubahan = (skpdTotal.paguPerubahan || 0) + prog.totalPaguPerubahan;
        }
        for (const [sd, vals] of Object.entries(prog.sumberDanas as Record<string, any>)) {
          if (!skpdSdMap[sd]) skpdSdMap[sd] = { pagu: 0, paguPerubahan: null };
          skpdSdMap[sd].pagu += vals.pagu;
          if (vals.paguPerubahan !== null) {
            skpdSdMap[sd].paguPerubahan = (skpdSdMap[sd].paguPerubahan || 0) + vals.paguPerubahan;
          }
        }
      }

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
