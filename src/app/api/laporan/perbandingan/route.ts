import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Fetch all RincianBelanja for Dinas Pendidikan for the year
    const rincianList = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatan: {
          kegiatan: {
            program: {
              skpd: {
                tahunId: tahunData.id,
                nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
              }
            }
          }
        }
      },
      include: {
        sumberDana: true,
        rekening: true,
        subKegiatan: {
          include: {
            kegiatan: {
              include: {
                program: {
                  include: { skpd: true }
                }
              }
            }
          }
        }
      },
    });

    // Summary counters
    let paguIndukTotal = 0;
    let paguPerubahanTotal = 0;
    let paguIndukPppk = 0;
    let paguPerubahanPppk = 0;

    const setProgsInduk = new Set<string>();
    const setProgsPerubahan = new Set<string>();
    const setKegsInduk = new Set<string>();
    const setKegsPerubahan = new Set<string>();
    const setSubsInduk = new Set<string>();
    const setSubsPerubahan = new Set<string>();
    const setPaketsInduk = new Set<string>();
    const setPaketsPerubahan = new Set<string>();
    const setSdInduk = new Set<number>();
    const setSdPerubahan = new Set<number>();

    // Detailed Tree for comparison table
    const tree: any = {};

    rincianList.forEach(r => {
      const progId = r.subKegiatan.kegiatan.program.id.toString();
      const kegId = r.subKegiatan.kegiatan.id.toString();
      const subId = r.subKegiatan.id.toString();
      const paketKeyGlobal = `${subId}_${r.namaPaket}`; // unique packet per sub kegiatan

      const nilaiInduk = Number(r.pagu);
      const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;

      paguIndukTotal += nilaiInduk;
      paguPerubahanTotal += nilaiPerubahan;

      const isPppk = r.namaPaket.toUpperCase().includes('PPPK');

      if (nilaiInduk > 0) {
        setProgsInduk.add(progId);
        setKegsInduk.add(kegId);
        setSubsInduk.add(subId);
        setPaketsInduk.add(paketKeyGlobal);
        setSdInduk.add(r.sumberDanaId);
        if (isPppk) paguIndukPppk += nilaiInduk;
      }

      if (nilaiPerubahan > 0) {
        setProgsPerubahan.add(progId);
        setKegsPerubahan.add(kegId);
        setSubsPerubahan.add(subId);
        setPaketsPerubahan.add(paketKeyGlobal);
        setSdPerubahan.add(r.sumberDanaId);
        if (isPppk) paguPerubahanPppk += nilaiPerubahan;
      }

      // Build Tree
      const skpdKey = r.subKegiatan.kegiatan.program.skpd.kode + ' - ' + r.subKegiatan.kegiatan.program.skpd.nama;
      const progKey = r.subKegiatan.kegiatan.program.kode + '|' + r.subKegiatan.kegiatan.program.nama;
      const kegKey = r.subKegiatan.kegiatan.kode + '|' + r.subKegiatan.kegiatan.nama;
      const subKey = r.subKegiatan.kode + '|' + r.subKegiatan.nama;
      const rekKey = (r.rekening?.kode || 'Tanpa Kode') + '|' + (r.rekening?.nama || 'Tanpa Rekening');
      const paketKey = r.namaPaket;
      
      if (!tree[skpdKey]) tree[skpdKey] = { induk: 0, perubahan: 0, progs: {} };
      tree[skpdKey].induk += nilaiInduk;
      tree[skpdKey].perubahan += nilaiPerubahan;

      if (!tree[skpdKey].progs[progKey]) tree[skpdKey].progs[progKey] = { induk: 0, perubahan: 0, kegs: {} };
      tree[skpdKey].progs[progKey].induk += nilaiInduk;
      tree[skpdKey].progs[progKey].perubahan += nilaiPerubahan;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey]) tree[skpdKey].progs[progKey].kegs[kegKey] = { induk: 0, perubahan: 0, subs: {} };
      tree[skpdKey].progs[progKey].kegs[kegKey].induk += nilaiInduk;
      tree[skpdKey].progs[progKey].kegs[kegKey].perubahan += nilaiPerubahan;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey]) tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey] = { induk: 0, perubahan: 0, reks: {} };
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].induk += nilaiInduk;
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].perubahan += nilaiPerubahan;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey]) tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey] = { induk: 0, perubahan: 0, pakets: {} };
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].induk += nilaiInduk;
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].perubahan += nilaiPerubahan;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].pakets[paketKey]) tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].pakets[paketKey] = { induk: 0, perubahan: 0, sds: [] };
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].pakets[paketKey].induk += nilaiInduk;
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].pakets[paketKey].perubahan += nilaiPerubahan;
      
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].reks[rekKey].pakets[paketKey].sds.push({
        nama: r.sumberDana.nama,
        induk: nilaiInduk,
        perubahan: nilaiPerubahan
      });
    });

    // Chart Data by Sumber Dana
    const chartDataMap = new Map<string, { induk: number, perubahan: number }>();
    rincianList.forEach(r => {
      const sdNama = r.sumberDana.nama;
      if (!chartDataMap.has(sdNama)) chartDataMap.set(sdNama, { induk: 0, perubahan: 0 });
      
      const obj = chartDataMap.get(sdNama)!;
      const nInduk = Number(r.pagu);
      const nPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nInduk;
      
      obj.induk += nInduk;
      obj.perubahan += nPerubahan;
    });
    
    const chartData = Array.from(chartDataMap.entries()).map(([sd, values]) => ({
      name: sd,
      induk: values.induk,
      perubahan: values.perubahan
    }));

    // List of paket names for reference
    const paketsList = Array.from(new Set(rincianList.map(r => r.namaPaket))).sort();

    const summary = {
      pagu: { induk: paguIndukTotal, perubahan: paguPerubahanTotal },
      paguPppk: { induk: paguIndukPppk, perubahan: paguPerubahanPppk },
      program: { induk: setProgsInduk.size, perubahan: setProgsPerubahan.size },
      kegiatan: { induk: setKegsInduk.size, perubahan: setKegsPerubahan.size },
      subKegiatan: { induk: setSubsInduk.size, perubahan: setSubsPerubahan.size },
      paket: { induk: setPaketsInduk.size, perubahan: setPaketsPerubahan.size },
      sumberDana: { induk: setSdInduk.size, perubahan: setSdPerubahan.size }
    };

    return NextResponse.json({ summary, tree, chartData, paketsList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
