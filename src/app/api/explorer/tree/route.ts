import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);
    const skpdIdParam = searchParams.get('skpdId');

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    let skpdFilter: any = { tahunId: tahunData.id };
    if (skpdIdParam) {
      skpdFilter.id = parseInt(skpdIdParam, 10);
    } else {
      skpdFilter.nama = { contains: 'PENDIDIKAN', mode: 'insensitive' };
    }

    const skpds = await prisma.skpd.findMany({ where: skpdFilter });
    const skpdIds = skpds.map(s => s.id);

    const [
      programsFlat,
      kegiatansFlat,
      subKegiatansFlat,
      sdRelsFlat,
      paguPerSubSkpdAndSd,
      sds,
      realisasiPerSub
    ] = await Promise.all([
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
        _sum: { paguInduk: true, paguRkpd: true, paguPerubahan: true }
      }),
      prisma.sumberDana.findMany(),
      prisma.realisasiBelanja.groupBy({
        by: ['subKegiatanId'],
        where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
        _sum: { nominal: true, alokasiRealisasi: true }
      })
    ]);

    const sdNameMap = new Map(sds.map(s => [s.id, s.nama]));

    const subPaguSdMap = new Map<number, { [key: string]: { paguInduk: number, paguRkpd: number, paguPerubahan: number } }>();
    const allSubTotalMap = new Map<number, { paguInduk: number, paguRkpd: number, paguPerubahan: number }>();

    for (const p of paguPerSubSkpdAndSd) {
      const sId = p.subKegiatanId;
      const sdNama = sdNameMap.get(p.sumberDanaId) || 'Unknown';
      
      const paguInduk = Number(p._sum.paguInduk || 0);
      const paguRkpd = Number(p._sum.paguRkpd || 0);
      const paguPerubahan = Number(p._sum.paguPerubahan || 0);

      if (!subPaguSdMap.has(sId)) subPaguSdMap.set(sId, {});
      const sdObj = subPaguSdMap.get(sId)!;
      
      const currSd = sdObj[sdNama] || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
      sdObj[sdNama] = {
        paguInduk: currSd.paguInduk + paguInduk,
        paguRkpd: currSd.paguRkpd + paguRkpd,
        paguPerubahan: currSd.paguPerubahan + paguPerubahan
      };

      const currTotal = allSubTotalMap.get(sId) || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
      allSubTotalMap.set(sId, {
        paguInduk: currTotal.paguInduk + paguInduk,
        paguRkpd: currTotal.paguRkpd + paguRkpd,
        paguPerubahan: currTotal.paguPerubahan + paguPerubahan
      });
    }

    const progMap = new Map<number, any[]>();
    const kegMap = new Map<number, any[]>();
    const subKegMap = new Map<number, any[]>();
    const sdRelMap = new Map<number, any[]>();

    for (const rel of sdRelsFlat) {
      if (!sdRelMap.has(rel.subKegiatanId)) sdRelMap.set(rel.subKegiatanId, []);
      sdRelMap.get(rel.subKegiatanId)!.push(rel);
    }

    // Build realisasi map per sub kegiatan
    const realisasiMap = new Map<number, { realisasi: number, alokasiRealisasi: number }>();
    for (const r of realisasiPerSub) {
      realisasiMap.set(r.subKegiatanId, {
        realisasi: Number(r._sum.nominal || 0),
        alokasiRealisasi: Number(r._sum.alokasiRealisasi || 0)
      });
    }

    for (const sub of subKegiatansFlat) {
      const subTotal = allSubTotalMap.get(sub.id) || { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
      const subSds = subPaguSdMap.get(sub.id) || {};
      const rels = sdRelMap.get(sub.id) || [];
      const isLocked = rels.some(r => r.isLocked);
      
      const realData = realisasiMap.get(sub.id) || { realisasi: 0, alokasiRealisasi: 0 };
      
      const subNode = {
        ...sub,
        pagu: subTotal.paguInduk,
        totalPaguInduk: subTotal.paguInduk,
        totalPaguRkpd: subTotal.paguRkpd,
        totalPaguPerubahan: subTotal.paguPerubahan,
        totalRealisasi: realData.realisasi,
        totalAlokasiRealisasi: realData.alokasiRealisasi,
        sumberDanas: subSds,
        is_locked: isLocked,
        type: 'subKegiatan'
      };
      
      if (!subKegMap.has(sub.kegiatanId)) subKegMap.set(sub.kegiatanId, []);
      subKegMap.get(sub.kegiatanId)!.push(subNode);
    }

    for (const keg of kegiatansFlat) {
      const subKegiatans = subKegMap.get(keg.id) || [];
      
      let kegTotalInduk = 0;
      let kegTotalRkpd = 0;
      let kegTotalPerubahan = 0;
      let kegTotalRealisasi = 0;
      
      let kegSdMap: { [key: string]: { paguInduk: number, paguRkpd: number, paguPerubahan: number } } = {};
      
      for (const sk of subKegiatans) {
        kegTotalInduk += sk.totalPaguInduk;
        kegTotalRkpd += sk.totalPaguRkpd;
        kegTotalPerubahan += sk.totalPaguPerubahan;
        kegTotalRealisasi += sk.totalRealisasi || 0;
        
        Object.keys(sk.sumberDanas).forEach(sd => {
          if (!kegSdMap[sd]) kegSdMap[sd] = { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          kegSdMap[sd].paguInduk += sk.sumberDanas[sd].paguInduk;
          kegSdMap[sd].paguRkpd += sk.sumberDanas[sd].paguRkpd;
          kegSdMap[sd].paguPerubahan += sk.sumberDanas[sd].paguPerubahan;
        });
      }

      const isLocked = subKegiatans.some(sk => sk.is_locked);

      const kegNode = {
        ...keg,
        type: 'kegiatan',
        pagu: kegTotalInduk,
        totalPaguInduk: kegTotalInduk,
        totalPaguRkpd: kegTotalRkpd,
        totalPaguPerubahan: kegTotalPerubahan,
        totalRealisasi: kegTotalRealisasi,
        sumberDanas: kegSdMap,
        is_locked: isLocked,
        children: subKegiatans
      };

      if (!progMap.has(keg.programId)) progMap.set(keg.programId, []);
      progMap.get(keg.programId)!.push(kegNode);
    }

    const treeData = programsFlat.map(prog => {
      const kegiatans = progMap.get(prog.id) || [];
      
      let progTotalInduk = 0;
      let progTotalRkpd = 0;
      let progTotalPerubahan = 0;
      let progTotalRealisasi = 0;
      
      let progSdMap: { [key: string]: { paguInduk: number, paguRkpd: number, paguPerubahan: number } } = {};

      for (const k of kegiatans) {
        progTotalInduk += k.totalPaguInduk;
        progTotalRkpd += k.totalPaguRkpd;
        progTotalPerubahan += k.totalPaguPerubahan;
        progTotalRealisasi += k.totalRealisasi || 0;
        
        Object.keys(k.sumberDanas).forEach(sd => {
          if (!progSdMap[sd]) progSdMap[sd] = { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
          progSdMap[sd].paguInduk += k.sumberDanas[sd].paguInduk;
          progSdMap[sd].paguRkpd += k.sumberDanas[sd].paguRkpd;
          progSdMap[sd].paguPerubahan += k.sumberDanas[sd].paguPerubahan;
        });
      }

      const isLocked = kegiatans.some(k => k.is_locked);

      return {
        ...prog,
        type: 'program',
        pagu: progTotalInduk,
        totalPaguInduk: progTotalInduk,
        totalPaguRkpd: progTotalRkpd,
        totalPaguPerubahan: progTotalPerubahan,
        totalRealisasi: progTotalRealisasi,
        sumberDanas: progSdMap,
        is_locked: isLocked,
        children: kegiatans
      };
    });

    const finalData = skpds.map(skpd => {
      const skpdPrograms = treeData.filter((p: any) => p.skpdId === skpd.id);
      
      let totalInduk = 0;
      let totalRkpd = 0;
      let totalPerubahan = 0;
      let totalRealisasi = 0;
      let sdMap: { [key: string]: { paguInduk: number, paguRkpd: number, paguPerubahan: number } } = {};
      
      skpdPrograms.forEach(p => {
         totalInduk += p.totalPaguInduk;
         totalRkpd += p.totalPaguRkpd;
         totalPerubahan += p.totalPaguPerubahan;
         totalRealisasi += p.totalRealisasi || 0;
         Object.keys(p.sumberDanas).forEach(sd => {
           if (!sdMap[sd]) sdMap[sd] = { paguInduk: 0, paguRkpd: 0, paguPerubahan: 0 };
           sdMap[sd].paguInduk += p.sumberDanas[sd].paguInduk;
           sdMap[sd].paguRkpd += p.sumberDanas[sd].paguRkpd;
           sdMap[sd].paguPerubahan += p.sumberDanas[sd].paguPerubahan;
         });
      });
      
      return {
        ...skpd,
        type: 'skpd',
        pagu: totalInduk,
        totalPaguInduk: totalInduk,
        totalPaguRkpd: totalRkpd,
        totalPaguPerubahan: totalPerubahan,
        totalRealisasi: totalRealisasi,
        sumberDanas: sdMap,
        programs: skpdPrograms
      };
    });

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem', details: error.message },
      { status: 500 }
    );
  }
}
