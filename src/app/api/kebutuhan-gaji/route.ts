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
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      include: {
        pegawais: {
          include: { jabatan: true }
        }
      }
    });

    const masterGajis = await prisma.masterGaji.findMany();
    const getGajiPokok = (status: string, golongan: string | null, masaKerja: number | null) => {
      if (status === 'HONORER') return 1500000;
      const found = masterGajis.find(m => m.status === status && m.golongan === golongan && m.masaKerja === masaKerja);
      if (found) return Number(found.gajiPokok);
      const similar = masterGajis.filter(m => m.status === status && m.golongan === golongan).sort((a,b) => b.masaKerja - a.masaKerja);
      const nearest = similar.find(m => m.masaKerja <= (masaKerja || 0));
      return nearest ? Number(nearest.gajiPokok) : 2000000;
    };

    const TUNJ_BERAS_PER_JIWA = 72420;

    const result = skpds.map(skpd => {
      const getInitialBudget = () => ({
        gapok: 0, tunjKeluarga: 0, tunjJabatanUmum: 0, tunjBeras: 0, tunjPphPembulatan: 0, bpjsKes: 0, jkk: 0, jkm: 0, tpp: 0, total: 0, count: 0
      });

      const pns = getInitialBudget();
      const pppk = getInitialBudget();
      const honorer = getInitialBudget();

      skpd.pegawais.forEach((p: any) => {
        let b = honorer;
        if (p.statusPegawai === 'PNS') b = pns;
        else if (p.statusPegawai === 'PPPK') b = pppk;

        b.count++;

        // Jika Gaji Pokok sudah diisi dari Excel Simgaji, gunakan itu. Jika belum, ambil dari Master Gaji.
        const gapok = (p.gajiPokok && Number(p.gajiPokok) > 0) ? Number(p.gajiPokok) : getGajiPokok(p.statusPegawai, p.golongan, p.masaKerja);
        
        let tunjKeluarga = 0;
        let tunjBeras = p.tunjanganBeras ? Number(p.tunjanganBeras) : 0;
        let bpjsKes = 0;
        let jkk = 0;
        let jkm = 0;
        
        const tJabatan = p.tunjanganJabatan ? Number(p.tunjanganJabatan) : 0;
        const tFungsional = p.tunjanganFungsional ? Number(p.tunjanganFungsional) : 0;
        const tFungsionalUmum = p.tunjanganFungsionalUmum ? Number(p.tunjanganFungsionalUmum) : 0;
        const tunjJabatanUmum = tJabatan + tFungsional + tFungsionalUmum;
        
        const tunjPphPembulatan = (p.tunjanganPph ? Number(p.tunjanganPph) : 0) + (p.pembulatan ? Number(p.pembulatan) : 0);

        let tpp = p.jabatan ? Number(p.jabatan.besaranTpp) : 0;

        if (p.statusPegawai !== 'HONORER') {
          // Tunj Keluarga = 10% Istri + 2% Anak (Jika dari file kosong, hitung manual)
          const isFileKeluargaZero = gapok > 0 && !p.tunjanganBeras && p.jumlahIstriSuami > 0;
          if (isFileKeluargaZero) { // asumsi fallback jika tidak pakai excel
             const tunjIstri = p.jumlahIstriSuami > 0 ? 0.1 * gapok : 0;
             const tunjAnak = 0.02 * gapok * Math.min(p.jumlahAnak, 2);
             tunjKeluarga = tunjIstri + tunjAnak;
          } else {
             // Jika excel diisi tapi kita ga punya field khusus tunjKeluarga, kita bisa estimasikan 10% + 2%
             // File Simgaji punya Tunjangan Keluarga, tapi kita tidak bikin fieldnya di prisma.
             // Kita hitung standar saja:
             tunjKeluarga = (p.jumlahIstriSuami > 0 ? 0.1 * gapok : 0) + (0.02 * gapok * Math.min(p.jumlahAnak, 2));
          }

          if (tunjBeras === 0) {
            const jiwa = 1 + (p.jumlahIstriSuami > 0 ? 1 : 0) + Math.min(p.jumlahAnak, 2);
            tunjBeras = jiwa * TUNJ_BERAS_PER_JIWA;
          }

          // BPJS Kes Pemberi Kerja 4% (max gapok+tunj kel+jabatan 12.000.000)
          let dasarBpjs = gapok + tunjKeluarga + tunjJabatanUmum;
          if (dasarBpjs > 12000000) dasarBpjs = 12000000;
          bpjsKes = 0.04 * dasarBpjs;

          jkk = 0.0024 * gapok;
          jkm = 0.0072 * gapok;
        }

        b.gapok += gapok;
        b.tunjKeluarga += tunjKeluarga;
        b.tunjJabatanUmum += tunjJabatanUmum;
        b.tunjBeras += tunjBeras;
        b.tunjPphPembulatan += tunjPphPembulatan;
        b.bpjsKes += bpjsKes;
        b.jkk += jkk;
        b.jkm += jkm;
        b.tpp += tpp;
      });

      const calcTahun = (b: any) => {
        // Asumsi Gaji ke-13 dan THR: Gapok + Tunj Kel + Tunj Jabatan/Umum
        // Kebutuhan Per Tahun: 14x Gapok, 14x Keluarga, 14x Jabatan/Umum
        // Beras, PPh, BPJS, JKK, JKM, TPP -> 12 bulan
        return (b.gapok * 14) + (b.tunjKeluarga * 14) + (b.tunjJabatanUmum * 14) 
               + (b.tunjBeras * 12) + (b.tunjPphPembulatan * 12)
               + (b.bpjsKes * 12) + (b.jkk * 12) + (b.jkm * 12) + (b.tpp * 12);
      };

      pns.total = calcTahun(pns);
      pppk.total = calcTahun(pppk);
      honorer.total = calcTahun(honorer);

      return {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        pns, pppk, honorer,
        grandTotal: pns.total + pppk.total + honorer.total
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
