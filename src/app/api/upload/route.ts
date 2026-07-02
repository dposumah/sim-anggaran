export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const tahunStr = formData.get('tahun') as string;
    const isPerubahan = formData.get('isPerubahan') === 'true';
    const tahun = parseInt(tahunStr || '2026', 10);

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (type !== 'rekap' && type !== 'pegawai') {
      return NextResponse.json({ error: 'Jenis upload tidak didukung' }, { status: 400 });
    }

    // 1. Baca File Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    // 2. Persiapkan Data & Database (Tahun)
    const tahunData = await prisma.tahunAnggaran.upsert({
      where: { tahun },
      update: { isActive: true },
      create: { tahun, isActive: true }
    });
    const tahunId = tahunData.id;

    if (type === 'pegawai') {
      // Pegawai Excel (Format SIMGAJI)
      const rawRows = data.slice(1).filter(r => r[1]); // Nama Pegawai harus ada di index 1
      
      const skpd = await prisma.skpd.findFirst({
         where: { tahunId, nama: { contains: 'PENDIDIKAN', mode: 'insensitive' } }
      });
      if (!skpd) return NextResponse.json({ success: false, error: 'Data SKPD Pendidikan belum ada di sistem.' }, { status: 400 });

      const jabatans = await prisma.jabatan.findMany();
      const jabatanMap = new Map(jabatans.map(j => [j.nama.toLowerCase(), j.id]));

      const pegawaiData = [];
      for (const r of rawRows) {
         const nip = String(r[0] || '').trim();
         const nama = String(r[1] || '').trim();
         const namaJabatan = String(r[6] || '').trim();
         const statusPegawai = String(r[8] || '').trim().toUpperCase() || 'PNS';
         const golongan = r[9] ? String(r[9]).trim() : null;
         const masaKerja = r[10] ? parseInt(String(r[10]), 10) : 0;
         const jumlahIstriSuami = r[13] ? parseInt(String(r[13]), 10) : 0;
         const jumlahAnak = r[14] ? parseInt(String(r[14]), 10) : 0;

         const gajiPokok = r[16] ? parseFloat(String(r[16])) : 0;
         const tunjanganJabatan = r[20] ? parseFloat(String(r[20])) : 0;
         const tunjanganFungsional = r[21] ? parseFloat(String(r[21])) : 0;
         const tunjanganFungsionalUmum = r[22] ? parseFloat(String(r[22])) : 0;
         const tunjanganBeras = r[23] ? parseFloat(String(r[23])) : 0;
         const tunjanganPph = r[24] ? parseFloat(String(r[24])) : 0;
         const pembulatan = r[25] ? parseInt(String(r[25]), 10) : 0;

         let jabatanId = null;
         if (namaJabatan) {
           if (!jabatanMap.has(namaJabatan.toLowerCase())) {
              const newJ = await prisma.jabatan.create({ data: { nama: namaJabatan, besaranTpp: 0 } });
              jabatanMap.set(namaJabatan.toLowerCase(), newJ.id);
              jabatanId = newJ.id;
           } else {
              jabatanId = jabatanMap.get(namaJabatan.toLowerCase());
           }
         }

         pegawaiData.push({
           skpdId: skpd.id,
           tahunId,
           nip,
           nama,
           statusPegawai,
           golongan,
           masaKerja,
           jabatanId,
           jumlahIstriSuami,
           jumlahAnak,
           gajiPokok,
           tunjanganJabatan,
           tunjanganFungsional,
           tunjanganFungsionalUmum,
           tunjanganBeras,
           tunjanganPph,
           pembulatan
         });
      }

      await prisma.pegawai.deleteMany({ where: { skpdId: skpd.id, tahunId } });
      await prisma.pegawai.createMany({ data: pegawaiData });

      return NextResponse.json({ success: true, message: `${pegawaiData.length} pegawai berhasil diupload.` });
    }

    // LOGIK UNTUK type === 'rekap'
    const rawRows = data.slice(1).filter(r => r[1]);
    const rows = rawRows.filter(r => String(r[5]).toUpperCase().includes('PENDIDIKAN'));

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Tidak ada data Dinas Pendidikan yang ditemukan dalam file ${file.name}.`
      }, { status: 400 });
    }

    // 2. Persiapkan Data & Database
    // --- LOGIKA BATCH INSERT REKAP ---

    // Level 1: Urusan
    const urusanMap = new Map();
    rows.forEach(r => urusanMap.set(String(r[2]).trim(), String(r[3]).trim()));
    await prisma.urusan.createMany({
      data: Array.from(urusanMap.entries()).filter(e => e[0]).map(([kode, nama]) => ({ kode, nama })),
      skipDuplicates: true
    });
    const urusans = await prisma.urusan.findMany();
    const uIdMap = new Map();
    urusans.forEach(u => uIdMap.set(u.kode, u.id));

    // Level 2: SKPD
    const skpdMap = new Map();
    rows.forEach(r => {
      const urusanKode = String(r[2]).trim();
      const kode = String(r[4]).trim();
      if (!kode || !uIdMap.has(urusanKode)) return;
      const key = `${kode}_${String(r[6]).trim()}`;
      if (!skpdMap.has(key)) {
        skpdMap.set(key, {
          kode, nama: String(r[5]).trim(),
          kodeSubUnit: String(r[6]).trim(), namaSubUnit: String(r[7]).trim(),
          urusanId: uIdMap.get(urusanKode), tahunId
        });
      }
    });
    await prisma.skpd.createMany({ data: Array.from(skpdMap.values()), skipDuplicates: true });
    const skpds = await prisma.skpd.findMany({ where: { tahunId } });
    const sIdMap = new Map();
    skpds.forEach(s => sIdMap.set(`${s.kode}_${s.kodeSubUnit}`, s.id));

    // Level 3: Program
    const progMap = new Map();
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r[4]).trim()}_${String(r[6]).trim()}`);
      if (!sId) return;
      const kode = String(r[10]).trim();
      const key = `${kode}_${sId}`;
      if (!progMap.has(key)) {
        progMap.set(key, { 
          kode, 
          nama: String(r[11]).trim(), 
          kodeBidangUrusan: String(r[8]).trim(),
          namaBidangUrusan: String(r[9]).trim(),
          skpdId: sId 
        });
      }
    });
    await prisma.program.createMany({ data: Array.from(progMap.values()), skipDuplicates: true });
    const programs = await prisma.program.findMany({ where: { skpdId: { in: Array.from(sIdMap.values()) } } });
    const pIdMap = new Map();
    programs.forEach(p => pIdMap.set(`${p.kode}_${p.skpdId}`, p.id));

    // Level 4: Kegiatan
    const kegMap = new Map();
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r[4]).trim()}_${String(r[6]).trim()}`);
      const pId = pIdMap.get(`${String(r[10]).trim()}_${sId}`);
      if (!pId) return;
      const kode = String(r[12]).trim();
      const key = `${kode}_${pId}`;
      if (!kegMap.has(key)) kegMap.set(key, { kode, nama: String(r[13]).trim(), programId: pId });
    });
    await prisma.kegiatan.createMany({ data: Array.from(kegMap.values()), skipDuplicates: true });
    const kegiatans = await prisma.kegiatan.findMany({ where: { programId: { in: Array.from(pIdMap.values()) } } });
    const kIdMap = new Map();
    kegiatans.forEach(k => kIdMap.set(`${k.kode}_${k.programId}`, k.id));

    // Level 5: SubKegiatan
    const subMap = new Map();
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r[4]).trim()}_${String(r[6]).trim()}`);
      const pId = pIdMap.get(`${String(r[10]).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r[12]).trim()}_${pId}`);
      if (!kId) return;
      const kode = String(r[14]).trim();
      const key = `${kode}_${kId}`;
      if (!subMap.has(key)) subMap.set(key, { kode, nama: String(r[15]).trim(), kegiatanId: kId });
    });
    await prisma.subKegiatan.createMany({ data: Array.from(subMap.values()), skipDuplicates: true });
    const subkegs = await prisma.subKegiatan.findMany({ where: { kegiatanId: { in: Array.from(kIdMap.values()) } } });
    const skIdMap = new Map();
    subkegs.forEach(sk => skIdMap.set(`${sk.kode}_${sk.kegiatanId}`, sk.id));

    // Master Sumber Dana & Rekening
    const sumberDanaMap = new Map();
    const rekeningMap = new Map();
    rows.forEach(r => {
      sumberDanaMap.set(String(r[16]).trim(), String(r[17]).trim());
      rekeningMap.set(String(r[18]).trim(), String(r[19]).trim());
    });
    
    await prisma.sumberDana.createMany({
      data: Array.from(sumberDanaMap.entries()).filter(e => e[0]).map(([kode, nama]) => ({ kode, nama })),
      skipDuplicates: true
    });
    await prisma.rekening.createMany({
      data: Array.from(rekeningMap.entries()).filter(e => e[0]).map(([kode, nama]) => ({ kode, nama })),
      skipDuplicates: true
    });
    
    const sds = await prisma.sumberDana.findMany();
    const reks = await prisma.rekening.findMany();
    const sdMap = new Map(); sds.forEach(sd => sdMap.set(sd.kode, sd.id));
    const rMap = new Map(); reks.forEach(rk => rMap.set(rk.kode, rk.id));

    // Relations (SubKegiatanSumberDana)
    const relMap = new Set();
    const rels: any[] = [];
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r[4]).trim()}_${String(r[6]).trim()}`);
      const pId = pIdMap.get(`${String(r[10]).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r[12]).trim()}_${pId}`);
      const skId = skIdMap.get(`${String(r[14]).trim()}_${kId}`);
      const sdId = sdMap.get(String(r[16]).trim());
      
      if (skId && sdId) {
        const key = `${skId}_${sdId}`;
        if (!relMap.has(key)) {
          relMap.add(key);
          rels.push({ subKegiatanId: skId, sumberDanaId: sdId });
        }
      }
    });
    await prisma.subKegiatanSumberDana.createMany({ data: rels, skipDuplicates: true });

    // Level 6: Rincian Belanja
    const rincianList: any[] = [];
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r[4]).trim()}_${String(r[6]).trim()}`);
      const pId = pIdMap.get(`${String(r[10]).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r[12]).trim()}_${pId}`);
      const skId = skIdMap.get(`${String(r[14]).trim()}_${kId}`);
      const sdId = sdMap.get(String(r[16]).trim());
      const rekId = rMap.get(String(r[18]).trim());
      
      if (!skId || !sdId || !rekId) return;

      const vol = 1;
      const hrg = parseFloat(String(r[22]).replace(/,/g, '')) || 0;
      const pagu = parseFloat(String(r[22]).replace(/,/g, '')) || 0;
      
      if (pagu > 0) {
        rincianList.push({
          subKegiatanId: skId,
          sumberDanaId: sdId,
          rekeningId: rekId,
          tipePaket: String(r[20]).trim() || '-',
          namaPaket: String(r[21]).trim() || '-',
          volume: vol,
          hargaSatuan: hrg,
          pagu: pagu
        });
      }
    });

    if (rincianList.length > 0) {
      const skIdsInUpload = Array.from(new Set(rincianList.map(r => r.subKegiatanId)));
      
      if (isPerubahan) {
        const existingRincian = await prisma.rincianBelanja.findMany({
          where: { subKegiatanId: { in: skIdsInUpload as number[] } }
        });
        
        const existingMap = new Map();
        existingRincian.forEach(r => {
          existingMap.set(`${r.subKegiatanId}_${r.sumberDanaId}_${r.rekeningId}_${r.tipePaket}_${r.namaPaket}`, r);
        });

        const mergedRincian: any[] = [];
        
        for (const item of rincianList) {
          const key = `${item.subKegiatanId}_${item.sumberDanaId}_${item.rekeningId}_${item.tipePaket}_${item.namaPaket}`;
          const exist = existingMap.get(key);
          
          if (exist) {
            const { id, ...rest } = exist;
            mergedRincian.push({
              ...rest,
              volumePerubahan: item.volume,
              hargaSatuanPerubahan: item.hargaSatuan,
              paguPerubahan: item.pagu
            });
            existingMap.delete(key);
          } else {
            mergedRincian.push({
              ...item,
              pagu: 0,
              volume: 1,
              hargaSatuan: 0,
              volumePerubahan: item.volume,
              hargaSatuanPerubahan: item.hargaSatuan,
              paguPerubahan: item.pagu
            });
          }
        }
        
        for (const exist of existingMap.values()) {
          const { id, ...rest } = exist;
          mergedRincian.push({
            ...rest,
            volumePerubahan: 0,
            hargaSatuanPerubahan: 0,
            paguPerubahan: 0
          });
        }
        
        await prisma.rincianBelanja.deleteMany({
          where: { subKegiatanId: { in: skIdsInUpload as number[] } }
        });
        
        const chunkSize = 500;
        for (let i = 0; i < mergedRincian.length; i += chunkSize) {
          await prisma.rincianBelanja.createMany({
            data: mergedRincian.slice(i, i + chunkSize)
          });
        }
      } else {
        await prisma.rincianBelanja.deleteMany({
          where: { subKegiatanId: { in: skIdsInUpload as number[] } }
        });
        
        const chunkSize = 500;
        for (let i = 0; i < rincianList.length; i += chunkSize) {
          await prisma.rincianBelanja.createMany({
            data: rincianList.slice(i, i + chunkSize)
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Data dari file ${file.name} (TA ${tahun}) berhasil diuraikan dan disimpan! ${rows.length} baris Dinas Pendidikan diproses.` 
    });

  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
