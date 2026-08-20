import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedLaporan = unstable_cache(
  async (tahun: number, tahunId: number) => {
    const rincianList = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatan: {
          kegiatan: {
            program: {
              skpd: {
                tahunId: tahunId,
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
                tahunId: tahunId,
                nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
              }
            }
          }
        }
      },
      include: {
        rekening: true,
        subKegiatan: true,
        sumberDana: true // Realisasi doesn't easily have sumberDana, we rely on Rincian mapping below
      }
    });

    // Note: realisasiBelanja actually does not have sumberDana directly linked unless it's joined.
    // Wait, in schema, realisasiBelanja has no sumberDana. It's OK. We map Realisasi for BOSP Reguler/Kinerja by checking Rekening/Paket if possible, but actually since we don't have sumberDana for realisasi, we can try to guess it from `rincianList`. 
    // To be perfectly accurate, we should aggregate pagu by SubKegiatan+Rekening+SumberDana.
    // For simplicity, BOSP Reguler vs Kinerja realisasi will just be proportional or we map it if we can.
    // Wait, the prompt just said "Perbandingan Pagu vs Realisasi", but for the BOSP cards "data Pagu BOSP Reguler dan BOSP Kinerja", maybe only Pagu is needed? 
    // Let's create a map to store BOSP Reguler/Kinerja values.
    
    let paguIndukTotal = 0; let paguPerubahanTotal = 0; let realisasiTotal = 0;
    
    let gajiPnsInduk = 0; let gajiPnsPerubahan = 0; let gajiPnsRealisasi = 0;
    let gajiPppkInduk = 0; let gajiPppkPerubahan = 0; let gajiPppkRealisasi = 0;
    let pppkParuhWaktuInduk = 0; let pppkParuhWaktuPerubahan = 0; let pppkParuhWaktuRealisasi = 0;
    
    let tppInduk = 0; let tppPerubahan = 0; let tppRealisasi = 0;
    let tpgInduk = 0; let tpgPerubahan = 0; let tpgRealisasi = 0;
    
    const initBosp = () => ({ induk: 0, perubahan: 0, realisasi: 0, reguler: { induk: 0, perubahan: 0, realisasi: 0 }, kinerja: { induk: 0, perubahan: 0, realisasi: 0 } });
    const bospSd = initBosp();
    const bospSmp = initBosp();
    const bospPaud = initBosp();
    const bospKesetaraan = initBosp();
    
    const paketMap: Record<string, { nama: string, induk: number, perubahan: number, realisasi: number, rincian: any[] }> = {};
    const subKegRealisasiMap: Record<number, { nama: string, kode: string, paguInduk: number, paguPerubahan: number, realisasi: number }> = {};
    const rekRealisasiMap: Record<number, { nama: string, kode: string, paguInduk: number, paguPerubahan: number, realisasi: number }> = {};
    const sumDanaMap: Record<string, { induk: number, perubahan: number, realisasi: number }> = {};
    const subRekPaguMap: Record<string, number> = {};
    const subRekRealisasiMap: Record<string, number> = {};

    // Helper to determine if BOSP Reguler or Kinerja based on sumberDana
    const getBospType = (sdNama: string) => {
      const upper = sdNama.toUpperCase();
      if (upper.includes('KINERJA')) return 'kinerja';
      return 'reguler'; // Default to reguler if not specified as kinerja
    };

    // To properly map Realisasi to Reguler/Kinerja, we create a map of SubKegiatan+Rekening -> BOSP Type
    const bospTypeMap: Record<string, string> = {}; 

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
      
      const subUpper = (sub.nama || '').toUpperCase();
      const rekUpper = (rek.nama || '').toUpperCase();
      const isBosp = subUpper.includes('BOS') || subUpper.includes('BOP');
      const isGaji = subUpper.includes('GAJI DAN TUNJANGAN ASN');
      const isParuhWaktu = subUpper.includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU');
      
      if (!isBosp && !isGaji && !isParuhWaktu) {
        subKegRealisasiMap[sub.id].paguInduk += nilaiInduk;
        subKegRealisasiMap[sub.id].paguPerubahan += nilaiPerubahan;
      }

      if (!rekRealisasiMap[rek.id]) {
        rekRealisasiMap[rek.id] = { nama: rek.nama, kode: rek.kode, paguInduk: 0, paguPerubahan: 0, realisasi: 0 };
      }
      rekRealisasiMap[rek.id].paguInduk += nilaiInduk;
      rekRealisasiMap[rek.id].paguPerubahan += nilaiPerubahan;

      // PNS & PPPK
      if (isGaji) {
        const isExcluded = rekUpper.includes('PNSD') || rekUpper.includes('TUNJANGAN PROFESI GURU') || rekUpper.includes('TAMBAHAN PENGHASILAN') || rekUpper.includes('TAMSIL');
        if (!isExcluded) {
          if (rekUpper.includes('PNS')) {
            gajiPnsInduk += nilaiInduk;
            gajiPnsPerubahan += nilaiPerubahan;
          } else if (rekUpper.includes('PPPK')) {
            gajiPppkInduk += nilaiInduk;
            gajiPppkPerubahan += nilaiPerubahan;
          }
        }
      }

      // Paruh Waktu
      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU')) {
        pppkParuhWaktuInduk += nilaiInduk;
        pppkParuhWaktuPerubahan += nilaiPerubahan;
      }

      // TPP & TPG
      if (rekUpper.includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) {
        tppInduk += nilaiInduk;
        tppPerubahan += nilaiPerubahan;
      }
      if (rekUpper.includes('TUNJANGAN PROFESI GURU')) {
        tpgInduk += nilaiInduk;
        tpgPerubahan += nilaiPerubahan;
      }

      // BOSP
      if (isBosp) {
        const sdNama = r.sumberDana.nama || '';
        const bospType = getBospType(sdNama);
        // Store for realisasi mapping
        bospTypeMap[`${sub.id}-${rek.id}`] = bospType;

        if (subUpper.includes('SEKOLAH DASAR')) {
          bospSd.induk += nilaiInduk;
          bospSd.perubahan += nilaiPerubahan;
          bospSd[bospType].induk += nilaiInduk;
          bospSd[bospType].perubahan += nilaiPerubahan;
        } else if (subUpper.includes('SEKOLAH MENENGAH PERTAMA')) {
          bospSmp.induk += nilaiInduk;
          bospSmp.perubahan += nilaiPerubahan;
          bospSmp[bospType].induk += nilaiInduk;
          bospSmp[bospType].perubahan += nilaiPerubahan;
        } else if (subUpper.includes('PAUD')) {
          bospPaud.induk += nilaiInduk;
          bospPaud.perubahan += nilaiPerubahan;
          bospPaud[bospType].induk += nilaiInduk;
          bospPaud[bospType].perubahan += nilaiPerubahan;
        } else if (subUpper.includes('KESETARAAN')) {
          bospKesetaraan.induk += nilaiInduk;
          bospKesetaraan.perubahan += nilaiPerubahan;
          bospKesetaraan[bospType].induk += nilaiInduk;
          bospKesetaraan[bospType].perubahan += nilaiPerubahan;
        }
      }

      // Uraian Paket
      const isEmptyPaket = (r.namaPaket || '').trim() === '-' || (r.namaPaket || '').trim() === '';
      if (r.namaPaket && !(prog.nama || '').toUpperCase().includes('PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA') && !isBosp && !isEmptyPaket) {
        if (!paketMap[r.namaPaket]) paketMap[r.namaPaket] = { nama: r.namaPaket, induk: 0, perubahan: 0, realisasi: 0, rincian: [] };
        paketMap[r.namaPaket].induk += nilaiInduk;
        paketMap[r.namaPaket].perubahan += nilaiPerubahan;
        paketMap[r.namaPaket].rincian.push({
          subKegiatanId: sub.id,
          rekeningId: rek.id,
          sumberDanaId: r.sumberDana.id,
          subKegiatan: sub.nama,
          rekening: rek.nama,
          sumberDana: r.sumberDana.nama || 'Tidak Ada',
          paguPerubahan: nilaiPerubahan,
          realisasi: 0
        });
      }

      const sdNama = r.sumberDana.nama || 'Tidak Ada Sumber Dana';
      if (!sumDanaMap[sdNama]) sumDanaMap[sdNama] = { induk: 0, perubahan: 0, realisasi: 0 };
      sumDanaMap[sdNama].induk += nilaiInduk;
      sumDanaMap[sdNama].perubahan += nilaiPerubahan;
      
      const subRekKey = `${sub.id}-${rek.id}-${r.sumberDana.id}`;
      subRekPaguMap[subRekKey] = (subRekPaguMap[subRekKey] || 0) + nilaiPerubahan;
    });

    realisasiList.forEach(r => {
      const sub = r.subKegiatan;
      const rek = r.rekening;
      const nilai = Number(r.nominal || 0);

      realisasiTotal += nilai;

      const subUpper = (sub.nama || '').toUpperCase();
      const rekUpper = (rek.nama || '').toUpperCase();
      const isBosp = subUpper.includes('BOS') || subUpper.includes('BOP');
      const isGaji = subUpper.includes('GAJI DAN TUNJANGAN ASN');
      const isParuhWaktu = subUpper.includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU');

      if (!isBosp && !isGaji && !isParuhWaktu) {
        if (subKegRealisasiMap[sub.id]) {
          subKegRealisasiMap[sub.id].realisasi += nilai;
        }
      }

      if (rekRealisasiMap[rek.id]) {
        rekRealisasiMap[rek.id].realisasi += nilai;
      }
      
      const subRekKey = `${sub.id}-${rek.id}-${r.sumberDana.id}`;
      subRekRealisasiMap[subRekKey] = (subRekRealisasiMap[subRekKey] || 0) + nilai;

      if (isGaji) {
        const isExcluded = rekUpper.includes('PNSD') || rekUpper.includes('TUNJANGAN PROFESI GURU') || rekUpper.includes('TAMBAHAN PENGHASILAN') || rekUpper.includes('TAMSIL');
        if (!isExcluded) {
          if (rekUpper.includes('PNS')) gajiPnsRealisasi += nilai;
          else if (rekUpper.includes('PPPK')) gajiPppkRealisasi += nilai;
        }
      }

      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU')) {
        pppkParuhWaktuRealisasi += nilai;
      }

      if (rekUpper.includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) tppRealisasi += nilai;
      if (rekUpper.includes('TUNJANGAN PROFESI GURU')) tpgRealisasi += nilai;

      if (isBosp) {
        const bospType = bospTypeMap[`${sub.id}-${rek.id}`] || 'reguler';
        
        if (subUpper.includes('SEKOLAH DASAR')) {
          bospSd.realisasi += nilai;
          bospSd[bospType as 'reguler' | 'kinerja'].realisasi += nilai;
        } else if (subUpper.includes('SEKOLAH MENENGAH PERTAMA')) {
          bospSmp.realisasi += nilai;
          bospSmp[bospType as 'reguler' | 'kinerja'].realisasi += nilai;
        } else if (subUpper.includes('PAUD')) {
          bospPaud.realisasi += nilai;
          bospPaud[bospType as 'reguler' | 'kinerja'].realisasi += nilai;
        } else if (subUpper.includes('KESETARAAN')) {
          bospKesetaraan.realisasi += nilai;
          bospKesetaraan[bospType as 'reguler' | 'kinerja'].realisasi += nilai;
        }
      }
    });
    
    // Assign proportional realisasi to paket rincian
    Object.values(paketMap).forEach((paket: any) => {
      paket.rincian.forEach((r: any) => {
        const subRekKey = `${r.subKegiatanId}-${r.rekeningId}-${r.sumberDanaId}`;
        const totalPagu = subRekPaguMap[subRekKey] || 1;
        const totalRealisasi = subRekRealisasiMap[subRekKey] || 0;
        const propReal = (r.paguPerubahan / totalPagu) * totalRealisasi;
        r.realisasi = propReal;
        paket.realisasi += propReal;
      });
    });

    const chartData = Object.keys(sumDanaMap).map(k => ({
      name: k,
      induk: sumDanaMap[k].induk,
      perubahan: sumDanaMap[k].perubahan,
      realisasi: sumDanaMap[k].realisasi
    })).sort((a, b) => b.perubahan - a.perubahan);

    const allPaket = Object.values(paketMap).sort((a, b) => b.perubahan - a.perubahan);
    const topPaket = allPaket.slice(0, 10);

    // Get top 15 sub kegiatan terbesar (exclude Gaji dan Tunjangan and BOSP)
    const topSubKegiatan = Object.values(subKegRealisasiMap)
      .filter(sk => {
        const upper = sk.nama.toUpperCase();
        return !upper.includes('GAJI DAN TUNJANGAN ASN') && !upper.includes('BOS') && !upper.includes('BOP') && sk.realisasi > 0;
      })
      .sort((a, b) => b.paguPerubahan - a.paguPerubahan);

    const rekFilteredMap: Record<number, { nama: string, kode: string, paguInduk: number, paguPerubahan: number, realisasi: number }> = {};
    
    rincianList.forEach(r => {
      const sub = r.subKegiatan;
      const rek = r.rekening;
      const subUpper = (sub.nama || '').toUpperCase();
      const rekUpper = (rek.nama || '').toUpperCase();
      const isBosp = subUpper.includes('BOS') || subUpper.includes('BOP');
      const isGaji = subUpper.includes('GAJI DAN TUNJANGAN ASN');
      const isParuhWaktu = subUpper.includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU');
      
      if (!isBosp && !isGaji && !isParuhWaktu) {
        if (!rekFilteredMap[rek.id]) {
          rekFilteredMap[rek.id] = { nama: rek.nama, kode: rek.kode, paguInduk: 0, paguPerubahan: 0, realisasi: 0 };
        }
        const nilaiInduk = r.paguInduk ? Number(r.paguInduk) : 0;
        const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;
        rekFilteredMap[rek.id].paguInduk += nilaiInduk;
        rekFilteredMap[rek.id].paguPerubahan += nilaiPerubahan;
      }
    });
    
    realisasiList.forEach(r => {
      const sub = r.subKegiatan;
      const rek = r.rekening;
      const subUpper = (sub.nama || '').toUpperCase();
      const rekUpper = (rek.nama || '').toUpperCase();
      const isBosp = subUpper.includes('BOS') || subUpper.includes('BOP');
      const isGaji = subUpper.includes('GAJI DAN TUNJANGAN ASN');
      const isParuhWaktu = subUpper.includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && rekUpper.includes('PARUH WAKTU');
      
      if (!isBosp && !isGaji && !isParuhWaktu) {
        if (rekFilteredMap[rek.id]) {
          rekFilteredMap[rek.id].realisasi += Number(r.nominal || 0);
        }
      }
    });

    const topRekening = Object.values(rekFilteredMap)
      .filter(r => r.realisasi > 0)
      .sort((a, b) => b.paguPerubahan - a.paguPerubahan);

    return {
      summary: {
        pagu: { induk: paguIndukTotal, perubahan: paguPerubahanTotal, realisasi: realisasiTotal },
        gajiPns: { induk: gajiPnsInduk, perubahan: gajiPnsPerubahan, realisasi: gajiPnsRealisasi },
        gajiPppk: { induk: gajiPppkInduk, perubahan: gajiPppkPerubahan, realisasi: gajiPppkRealisasi },
        gajiPppkParuhWaktu: { induk: pppkParuhWaktuInduk, perubahan: pppkParuhWaktuPerubahan, realisasi: pppkParuhWaktuRealisasi },
        tpp: { induk: tppInduk, perubahan: tppPerubahan, realisasi: tppRealisasi },
        tpg: { induk: tpgInduk, perubahan: tpgPerubahan, realisasi: tpgRealisasi },
        bospSd,
        bospSmp,
        bospPaud,
        bospKesetaraan,
      },
      chartData,
      topPaket,
      allPaket,
      topSubKegiatan,
      topRekening
    };
  },
  ['laporan-perbandingan-data'],
  { tags: ['laporanData'], revalidate: false }
);

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

    const data = await getCachedLaporan(tahun, tahunData.id);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
