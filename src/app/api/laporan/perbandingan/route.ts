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

    let paguIndukTotal = 0;
    let paguPerubahanTotal = 0;
    let gajiAsnInduk = 0;
    let gajiAsnPerubahan = 0;
    let gajiPppkParuhWaktuInduk = 0;
    let gajiPppkParuhWaktuPerubahan = 0;
    let honorPelayananUmumInduk = 0;
    let honorPelayananUmumPerubahan = 0;

    const dauTree: any = {};
    const sumDanaMap: Record<string, { induk: number, perubahan: number }> = {};

    rincianList.forEach(r => {
      const skpd = r.subKegiatan.kegiatan.program.skpd;
      const prog = r.subKegiatan.kegiatan.program;
      const keg = r.subKegiatan.kegiatan;
      const sub = r.subKegiatan;
      const rek = r.rekening;

      const nilaiInduk = Number(r.pagu) || 0;
      const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;

      paguIndukTotal += nilaiInduk;
      paguPerubahanTotal += nilaiPerubahan;

      const isParuhWaktu = (rek.nama || '').toUpperCase().includes('PARUH WAKTU');
      if (isParuhWaktu) {
        gajiPppkParuhWaktuInduk += nilaiInduk;
        gajiPppkParuhWaktuPerubahan += nilaiPerubahan;
      }

      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN GAJI DAN TUNJANGAN ASN') && !isParuhWaktu) {
        gajiAsnInduk += nilaiInduk;
        gajiAsnPerubahan += nilaiPerubahan;
      }

      if ((sub.nama || '').toUpperCase().includes('JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('HONORARIUM')) {
        honorPelayananUmumInduk += nilaiInduk;
        honorPelayananUmumPerubahan += nilaiPerubahan;
      }

      const sdNama = r.sumberDana.nama;
      if (!sumDanaMap[sdNama]) sumDanaMap[sdNama] = { induk: 0, perubahan: 0 };
      sumDanaMap[sdNama].induk += nilaiInduk;
      sumDanaMap[sdNama].perubahan += nilaiPerubahan;

      if ((sdNama || '').toUpperCase().includes('DAU YANG DITENTUKAN PENGGUNAANNYA BIDANG PENDIDIKAN')) {
        const skpdKey = `${skpd.kode} - ${skpd.nama}`;
        const progKey = `${prog.kode}|${prog.nama}`;
        const kegKey = `${keg.kode}|${keg.nama}`;
        const subKey = `${sub.kode}|${sub.nama}`;
        const rekKey = `${rek.kode}|${rek.nama}`;
        const paketKey = r.namaPaket;

        if (!dauTree[skpdKey]) dauTree[skpdKey] = { induk: 0, perubahan: 0, progs: {} };
        dauTree[skpdKey].induk += nilaiInduk;
        dauTree[skpdKey].perubahan += nilaiPerubahan;

        const skpdNode = dauTree[skpdKey];
        if (!skpdNode.progs[progKey]) skpdNode.progs[progKey] = { induk: 0, perubahan: 0, kegs: {} };
        skpdNode.progs[progKey].induk += nilaiInduk;
        skpdNode.progs[progKey].perubahan += nilaiPerubahan;

        const progNode = skpdNode.progs[progKey];
        if (!progNode.kegs[kegKey]) progNode.kegs[kegKey] = { induk: 0, perubahan: 0, subs: {} };
        progNode.kegs[kegKey].induk += nilaiInduk;
        progNode.kegs[kegKey].perubahan += nilaiPerubahan;

        const kegNode = progNode.kegs[kegKey];
        if (!kegNode.subs[subKey]) kegNode.subs[subKey] = { induk: 0, perubahan: 0, reks: {} };
        kegNode.subs[subKey].induk += nilaiInduk;
        kegNode.subs[subKey].perubahan += nilaiPerubahan;

        const subNode = kegNode.subs[subKey];
        if (!subNode.reks[rekKey]) subNode.reks[rekKey] = { induk: 0, perubahan: 0, pakets: {} };
        subNode.reks[rekKey].induk += nilaiInduk;
        subNode.reks[rekKey].perubahan += nilaiPerubahan;

        const rekNode = subNode.reks[rekKey];
        if (!rekNode.pakets[paketKey]) rekNode.pakets[paketKey] = { induk: 0, perubahan: 0 };
        rekNode.pakets[paketKey].induk += nilaiInduk;
        rekNode.pakets[paketKey].perubahan += nilaiPerubahan;
      }
    });

    const chartData = Object.keys(sumDanaMap).map(k => ({
      name: k,
      induk: sumDanaMap[k].induk,
      perubahan: sumDanaMap[k].perubahan,
    })).sort((a, b) => b.induk - a.induk);

    return NextResponse.json({
      summary: {
        pagu: { induk: paguIndukTotal, perubahan: paguPerubahanTotal },
        gajiAsn: { induk: gajiAsnInduk, perubahan: gajiAsnPerubahan },
        gajiPppkParuhWaktu: { induk: gajiPppkParuhWaktuInduk, perubahan: gajiPppkParuhWaktuPerubahan },
        honorPelayananUmum: { induk: honorPelayananUmumInduk, perubahan: honorPelayananUmumPerubahan },
        sumberDana: sumDanaMap
      },
      chartData,
      tree: dauTree
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
