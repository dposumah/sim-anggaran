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

    // HANYA KHUSUS DINAS PENDIDIKAN
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
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
      const getInitialBudget = () => ({
        gapok: 0, tunjKeluarga: 0, tunjBeras: 0, bpjsKes: 0, jkk: 0, jkm: 0, tpp: 0, total: 0, count: 0
      });

      const pns = getInitialBudget();
      const pppk = getInitialBudget();
      const honorer = getInitialBudget();

      skpd.pegawais.forEach(p => {
        let b = honorer;
        if (p.statusPegawai === 'PNS') b = pns;
        else if (p.statusPegawai === 'PPPK') b = pppk;

        b.count++;

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
        b.gapok += gapok;
        b.tunjKeluarga += tunjKeluarga;
        b.tunjBeras += tunjBeras;
        b.bpjsKes += bpjsKes;
        b.jkk += jkk;
        b.jkm += jkm;
        b.tpp += tpp;
      });

      const calcTahun = (b: any) => {
        return (b.gapok * 14) + (b.tunjKeluarga * 14) + (b.tunjBeras * 12) + (b.bpjsKes * 12) + (b.jkk * 12) + (b.jkm * 12) + (b.tpp * 12);
      };

      pns.total = calcTahun(pns);
      pppk.total = calcTahun(pppk);
      honorer.total = calcTahun(honorer);

      return {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        pns,
        pppk,
        honorer,
        grandTotal: pns.total + pppk.total + honorer.total
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
