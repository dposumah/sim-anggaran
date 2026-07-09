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

    let pengaturan: any = await prisma.pengaturanGaji.findUnique({ where: { tahunId: tahunData.id } });
    if (!pengaturan) {
      pengaturan = {
        tahunId: tahunData.id,
        komponenGaji13: 'gapok,tunjKeluarga,tunjJabatan,tunjFungsional,tunjFungsionalUmum',
        komponenGaji14: 'gapok,tunjKeluarga,tunjJabatan,tunjFungsional,tunjFungsionalUmum',
        gajiTerusanBulan: 3,
        acressPersen: 2.5
      };
    }

    const g13 = (pengaturan!.komponenGaji13 || '').split(',');
    const g14 = (pengaturan!.komponenGaji14 || '').split(',');

    const getMultiplier = (key: string) => {
      let m = 12;
      if (g13.includes(key)) m += 1;
      if (g14.includes(key)) m += 1;
      return m;
    };

    const realisasis = await prisma.realisasiGaji.findMany({ where: { tahunId: tahunData.id } });

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
        gapok: 0, tunjKeluarga: 0, tunjJabatan: 0, tunjFungsional: 0, tunjFungsionalUmum: 0, tunjBeras: 0, tunjPph: 0, pembulatan: 0, bpjsKes: 0, jkk: 0, jkm: 0, tpp: 0, 
        terusan: 0, acress: 0, total: 0, count: 0
      });

      const pns = getInitialBudget();
      const pppk = getInitialBudget();
      const honorer = getInitialBudget();

      skpd.pegawais.forEach((p: any) => {
        let b = honorer;
        if (p.statusPegawai === 'PNS') b = pns;
        else if (p.statusPegawai === 'PPPK') b = pppk;

        b.count++;

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
        
        const tunjPph = p.tunjanganPph ? Number(p.tunjanganPph) : 0;
        const pembulatan = p.pembulatan ? Number(p.pembulatan) : 0;

        let tpp = p.jabatan ? Number(p.jabatan.besaranTpp) : 0;

        if (p.statusPegawai !== 'HONORER') {
          const isFileKeluargaZero = gapok > 0 && !p.tunjanganBeras && p.jumlahIstriSuami > 0;
          if (isFileKeluargaZero) { 
             const tunjIstri = p.jumlahIstriSuami > 0 ? 0.1 * gapok : 0;
             const tunjAnak = 0.02 * gapok * Math.min(p.jumlahAnak, 2);
             tunjKeluarga = tunjIstri + tunjAnak;
          } else {
             tunjKeluarga = (p.jumlahIstriSuami > 0 ? 0.1 * gapok : 0) + (0.02 * gapok * Math.min(p.jumlahAnak, 2));
          }

          if (tunjBeras === 0) {
            const jiwa = 1 + (p.jumlahIstriSuami > 0 ? 1 : 0) + Math.min(p.jumlahAnak, 2);
            tunjBeras = jiwa * TUNJ_BERAS_PER_JIWA;
          }

          let dasarBpjs = gapok + tunjKeluarga + tunjJabatanUmum;
          if (dasarBpjs > 12000000) dasarBpjs = 12000000;
          bpjsKes = 0.04 * dasarBpjs;

          jkk = 0.0024 * gapok;
          jkm = 0.0072 * gapok;
        }

        b.gapok += gapok;
        b.tunjKeluarga += tunjKeluarga;
        b.tunjJabatan += tJabatan;
        b.tunjFungsional += tFungsional;
        b.tunjFungsionalUmum += tFungsionalUmum;
        b.tunjBeras += tunjBeras;
        b.tunjPph += tunjPph;
        b.pembulatan += pembulatan;
        b.bpjsKes += bpjsKes;
        b.jkk += jkk;
        b.jkm += jkm;
        b.tpp += tpp;
      });

      const calcTahun = (b: any) => {
        let subtotal = 0;
        const keys = ['gapok', 'tunjKeluarga', 'tunjJabatan', 'tunjFungsional', 'tunjFungsionalUmum', 'tunjBeras', 'tunjPph', 'pembulatan', 'bpjsKes', 'jkk', 'jkm', 'tpp'];
        keys.forEach(k => {
          subtotal += b[k] * getMultiplier(k);
        });

        // Gaji Terusan
        // Dihitung rata-rata gaji per bulan x jumlah bulan terusan
        // Rata-rata gaji bulanan diambil dari penjumlahan semua komponen per bulan
        let totalBulanan = 0;
        keys.forEach(k => { totalBulanan += b[k]; });
        b.terusan = totalBulanan * pengaturan.gajiTerusanBulan;
        subtotal += b.terusan;

        // Acress
        b.acress = subtotal * (Number(pengaturan.acressPersen) / 100);
        
        return subtotal + b.acress;
      };

      pns.total = calcTahun(pns);
      pppk.total = calcTahun(pppk);
      honorer.total = calcTahun(honorer);

      // Map Realisasi
      const realisasiSkpd = realisasis.filter(r => r.skpdId === skpd.id);
      const getRealisasi = (kategori: string, uraian: string) => {
        return realisasiSkpd.filter(r => r.kategori === kategori && r.uraianBelanja === uraian).reduce((sum, r) => sum + Number(r.nominal), 0);
      };

      const multipliers: Record<string, number> = {};
      const keys = ['gapok', 'tunjKeluarga', 'tunjJabatan', 'tunjFungsional', 'tunjFungsionalUmum', 'tunjBeras', 'tunjPph', 'pembulatan', 'bpjsKes', 'jkk', 'jkm', 'tpp'];
      keys.forEach(k => { multipliers[k] = getMultiplier(k); });

      return {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        pengaturan,
        multipliers,
        pns: { ...pns, realisasi: {} },
        pppk: { ...pppk, realisasi: {} },
        honorer: { ...honorer, realisasi: {} },
        realisasiTotal: realisasiSkpd.reduce((sum, r) => sum + Number(r.nominal), 0),
        _getRealisasi: getRealisasi,
        grandTotal: pns.total + pppk.total + honorer.total
      };
    });

    // Populate realisasi mapping
    result.forEach(skpd => {
      const keys = ['gapok', 'tunjKeluarga', 'tunjJabatan', 'tunjFungsional', 'tunjFungsionalUmum', 'tunjBeras', 'tunjPph', 'pembulatan', 'bpjsKes', 'jkk', 'jkm', 'tpp', 'terusan', 'acress'];
      ['PNS', 'PPPK', 'HONORER'].forEach(kat => {
        const obj = kat === 'PNS' ? skpd.pns : kat === 'PPPK' ? skpd.pppk : skpd.honorer;
        keys.forEach(k => {
          (obj as any).realisasi[k] = skpd._getRealisasi(kat, k);
        });
      });
      delete (skpd as any)._getRealisasi;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
