export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak ditemukan' }, { status: 404 });

    const skpds = await prisma.skpd.findMany({
      where: { tahunId: tahunData.id },
      include: {
        pegawais: {
          include: {
            jabatan: true
          }
        }
      }
    });

    const masterGajis = await prisma.masterGaji.findMany();
    // Helper to find gaji pokok
    const getGajiPokok = (status: string, golongan: string | null, masaKerja: number | null) => {
      if (status === 'HONORER') return 1500000; // default honorer pukul rata
      const found = masterGajis.find(m => m.status === status && m.golongan === golongan && m.masaKerja === masaKerja);
      if (found) return Number(found.gajiPokok);
      
      // Fallback find nearest below
      const similar = masterGajis.filter(m => m.status === status && m.golongan === golongan)
                                 .sort((a,b) => b.masaKerja - a.masaKerja);
      const nearest = similar.find(m => m.masaKerja <= (masaKerja || 0));
      return nearest ? Number(nearest.gajiPokok) : 2000000;
    };

    const TUNJ_BERAS_PER_JIWA = 72420;

    const result = skpds.map(skpd => {
      let sumGapok = 0;
      let sumTunjKeluarga = 0;
      let sumTunjBeras = 0;
      let sumBpjsKes = 0;
      let sumJkk = 0;
      let sumJkm = 0;
      let sumTpp = 0;
      
      let countPns = 0;
      let countPppk = 0;
      let countHonorer = 0;

      skpd.pegawais.forEach(p => {
        if (p.statusPegawai === 'PNS') countPns++;
        else if (p.statusPegawai === 'PPPK') countPppk++;
        else countHonorer++;

        const gapok = getGajiPokok(p.statusPegawai, p.golongan, p.masaKerja);
        
        let tunjKeluarga = 0;
        let tunjBeras = 0;
        let bpjsKes = 0;
        let jkk = 0;
        let jkm = 0;
        let tpp = p.jabatan ? Number(p.jabatan.besaranTpp) : 0;

        if (p.statusPegawai !== 'HONORER') {
          // Tunj Istri Suami 10%
          const tunjIstri = p.jumlahIstriSuami > 0 ? 0.1 * gapok : 0;
          // Tunj Anak 2% max 2
          const tunjAnak = 0.02 * gapok * Math.min(p.jumlahAnak, 2);
          tunjKeluarga = tunjIstri + tunjAnak;

          // Beras
          const jiwa = 1 + (p.jumlahIstriSuami > 0 ? 1 : 0) + Math.min(p.jumlahAnak, 2);
          tunjBeras = jiwa * TUNJ_BERAS_PER_JIWA;

          // BPJS Kes Pemberi Kerja 4% (max gapok+tunj kel 12.000.000)
          let dasarBpjs = gapok + tunjKeluarga;
          if (dasarBpjs > 12000000) dasarBpjs = 12000000;
          bpjsKes = 0.04 * dasarBpjs;

          // JKK 0.24%
          jkk = 0.0024 * gapok;
          
          // JKM 0.72%
          jkm = 0.0072 * gapok;
        }

        // Per Bulan
        sumGapok += gapok;
        sumTunjKeluarga += tunjKeluarga;
        sumTunjBeras += tunjBeras;
        sumBpjsKes += bpjsKes;
        sumJkk += jkk;
        sumJkm += jkm;
        sumTpp += tpp;
      });

      // Kebutuhan Per Tahun (14 Bulan untuk Gaji, 12 Bulan untuk TPP & BPJS)
      // Asumsi THR dan Gaji 13 tidak ada Tunj Beras/BPJS (biasanya hanya Gapok + Tunj Keluarga + Jabatan)
      // Disini disederhanakan: Gapok+Keluarga * 14. Beras, BPJS, JKK, JKM * 12. TPP * 12.
      const tahunGapok = sumGapok * 14;
      const tahunKeluarga = sumTunjKeluarga * 14;
      const tahunBeras = sumTunjBeras * 12;
      const tahunBpjs = sumBpjsKes * 12;
      const tahunJkk = sumJkk * 12;
      const tahunJkm = sumJkm * 12;
      const tahunTpp = sumTpp * 12;

      const totalKebutuhan = tahunGapok + tahunKeluarga + tahunBeras + tahunBpjs + tahunJkk + tahunJkm + tahunTpp;

      return {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        countPns,
        countPppk,
        countHonorer,
        perBulan: {
          gapok: sumGapok,
          tunjKeluarga: sumTunjKeluarga,
          tunjBeras: sumTunjBeras,
          bpjsKes: sumBpjsKes,
          jkk: sumJkk,
          jkm: sumJkm,
          tpp: sumTpp,
          total: sumGapok + sumTunjKeluarga + sumTunjBeras + sumBpjsKes + sumJkk + sumJkm + sumTpp
        },
        perTahun: {
          total: totalKebutuhan
        }
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
