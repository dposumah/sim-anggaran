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

    const realisasiList = await prisma.realisasiBelanja.findMany({
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
        rekening: true,
        subKegiatan: true
      }
    });

    let paguIndukTotal = 0; let paguPerubahanTotal = 0; let realisasiTotal = 0;
    
    // Gaji
    let gajiPnsInduk = 0; let gajiPnsPerubahan = 0; let gajiPnsRealisasi = 0;
    let gajiPppkInduk = 0; let gajiPppkPerubahan = 0; let gajiPppkRealisasi = 0;
    let pppkParuhWaktuInduk = 0; let pppkParuhWaktuPerubahan = 0; let pppkParuhWaktuRealisasi = 0;
    
    // TPP & TPG
    let tppInduk = 0; let tppPerubahan = 0; let tppRealisasi = 0;
    let tpgInduk = 0; let tpgPerubahan = 0; let tpgRealisasi = 0;
    
    // BOSP
    let bospSdInduk = 0; let bospSdPerubahan = 0; let bospSdRealisasi = 0;
    let bospSmpInduk = 0; let bospSmpPerubahan = 0; let bospSmpRealisasi = 0;
    let bospPaudInduk = 0; let bospPaudPerubahan = 0; let bospPaudRealisasi = 0;
    let bospKesetaraanInduk = 0; let bospKesetaraanPerubahan = 0; let bospKesetaraanRealisasi = 0;
    
    // Maps
    const paketMap: Record<string, { nama: string, induk: number, perubahan: number }> = {};
    const subKegRealisasiMap: Record<number, { nama: string, kode: string, paguInduk: number, paguPerubahan: number, realisasi: number }> = {};
    const sumDanaMap: Record<string, { induk: number, perubahan: number, realisasi: number }> = {};

    rincianList.forEach(r => {
      const prog = r.subKegiatan.kegiatan.program;
      const sub = r.subKegiatan;
      const rek = r.rekening;

      const nilaiInduk = r.paguInduk ? Number(r.paguInduk) : 0;
      const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;

      paguIndukTotal += nilaiInduk;
      paguPerubahanTotal += nilaiPerubahan;

      if (!subKegRealisasiMap[sub.id]) {
        subKegRealisasiMap[sub.id] = { nama: sub.nama, kode: sub.kode, paguInduk: 0, paguPerubahan: 0, realisasi: 0 };
      }
      subKegRealisasiMap[sub.id].paguInduk += nilaiInduk;
      subKegRealisasiMap[sub.id].paguPerubahan += nilaiPerubahan;

      // PNS & PPPK
      if ((sub.nama || '').toUpperCase().includes('GAJI DAN TUNJANGAN ASN')) {
        if ((rek.nama || '').toUpperCase().includes('PNS')) {
          gajiPnsInduk += nilaiInduk;
          gajiPnsPerubahan += nilaiPerubahan;
        } else if ((rek.nama || '').toUpperCase().includes('PPPK')) {
          gajiPppkInduk += nilaiInduk;
          gajiPppkPerubahan += nilaiPerubahan;
        }
      }

      // Paruh Waktu
      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('PARUH WAKTU')) {
        pppkParuhWaktuInduk += nilaiInduk;
        pppkParuhWaktuPerubahan += nilaiPerubahan;
      }

      // TPP & TPG
      if ((rek.nama || '').toUpperCase().includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) {
        tppInduk += nilaiInduk;
        tppPerubahan += nilaiPerubahan;
      }
      if ((rek.nama || '').toUpperCase().includes('TUNJANGAN PROFESI GURU')) {
        tpgInduk += nilaiInduk;
        tpgPerubahan += nilaiPerubahan;
      }

      // BOSP
      const subUpper = (sub.nama || '').toUpperCase();
      if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH DASAR')) {
        bospSdInduk += nilaiInduk;
        bospSdPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH MENENGAH PERTAMA')) {
        bospSmpInduk += nilaiInduk;
        bospSmpPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP PAUD')) {
        bospPaudInduk += nilaiInduk;
        bospPaudPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP SEKOLAH NONFORMAL/KESETARAAN')) {
        bospKesetaraanInduk += nilaiInduk;
        bospKesetaraanPerubahan += nilaiPerubahan;
      }

      // Uraian Paket (Exclude Program Penunjang)
      if (r.namaPaket && !(prog.nama || '').toUpperCase().includes('PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA')) {
        if (!paketMap[r.namaPaket]) paketMap[r.namaPaket] = { nama: r.namaPaket, induk: 0, perubahan: 0 };
        paketMap[r.namaPaket].induk += nilaiInduk;
        paketMap[r.namaPaket].perubahan += nilaiPerubahan;
      }

      const sdNama = r.sumberDana.nama || 'Tidak Ada Sumber Dana';
      if (!sumDanaMap[sdNama]) sumDanaMap[sdNama] = { induk: 0, perubahan: 0, realisasi: 0 };
      sumDanaMap[sdNama].induk += nilaiInduk;
      sumDanaMap[sdNama].perubahan += nilaiPerubahan;
    });

    realisasiList.forEach(r => {
      const sub = r.subKegiatan;
      const rek = r.rekening;
      const nilai = Number(r.nominal || 0);

      realisasiTotal += nilai;

      if (subKegRealisasiMap[sub.id]) {
        subKegRealisasiMap[sub.id].realisasi += nilai;
      }

      // PNS & PPPK
      if ((sub.nama || '').toUpperCase().includes('GAJI DAN TUNJANGAN ASN')) {
        if ((rek.nama || '').toUpperCase().includes('PNS')) {
          gajiPnsRealisasi += nilai;
        } else if ((rek.nama || '').toUpperCase().includes('PPPK')) {
          gajiPppkRealisasi += nilai;
        }
      }

      // Paruh Waktu
      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('PARUH WAKTU')) {
        pppkParuhWaktuRealisasi += nilai;
      }

      // TPP & TPG
      if ((rek.nama || '').toUpperCase().includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) {
        tppRealisasi += nilai;
      }
      if ((rek.nama || '').toUpperCase().includes('TUNJANGAN PROFESI GURU')) {
        tpgRealisasi += nilai;
      }

      // BOSP
      const subUpper = (sub.nama || '').toUpperCase();
      if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH DASAR')) {
        bospSdRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH MENENGAH PERTAMA')) {
        bospSmpRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP PAUD')) {
        bospPaudRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP SEKOLAH NONFORMAL/KESETARAAN')) {
        bospKesetaraanRealisasi += nilai;
      }
    });

    const chartData = Object.keys(sumDanaMap).map(k => ({
      name: k,
      induk: sumDanaMap[k].induk,
      perubahan: sumDanaMap[k].perubahan,
      realisasi: sumDanaMap[k].realisasi
    })).sort((a, b) => b.perubahan - a.perubahan);

    const topPaket = Object.values(paketMap)
      .sort((a, b) => b.perubahan - a.perubahan)
      .slice(0, 10);

    const topSubKegiatan = Object.values(subKegRealisasiMap)
      .sort((a, b) => b.paguPerubahan - a.paguPerubahan)
      .slice(0, 15); // Top 15 Sub Kegiatan

    return NextResponse.json({
      summary: {
        pagu: { induk: paguIndukTotal, perubahan: paguPerubahanTotal, realisasi: realisasiTotal },
        gajiPns: { induk: gajiPnsInduk, perubahan: gajiPnsPerubahan, realisasi: gajiPnsRealisasi },
        gajiPppk: { induk: gajiPppkInduk, perubahan: gajiPppkPerubahan, realisasi: gajiPppkRealisasi },
        gajiPppkParuhWaktu: { induk: pppkParuhWaktuInduk, perubahan: pppkParuhWaktuPerubahan, realisasi: pppkParuhWaktuRealisasi },
        tpp: { induk: tppInduk, perubahan: tppPerubahan, realisasi: tppRealisasi },
        tpg: { induk: tpgInduk, perubahan: tpgPerubahan, realisasi: tpgRealisasi },
        bospSd: { induk: bospSdInduk, perubahan: bospSdPerubahan, realisasi: bospSdRealisasi },
        bospSmp: { induk: bospSmpInduk, perubahan: bospSmpPerubahan, realisasi: bospSmpRealisasi },
        bospPaud: { induk: bospPaudInduk, perubahan: bospPaudPerubahan, realisasi: bospPaudRealisasi },
        bospKesetaraan: { induk: bospKesetaraanInduk, perubahan: bospKesetaraanPerubahan, realisasi: bospKesetaraanRealisasi },
      },
      chartData,
      topPaket,
      topSubKegiatan
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
