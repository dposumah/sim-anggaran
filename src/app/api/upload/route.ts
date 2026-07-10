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
    // Gunakan object map (key-value) daripada array index
    const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    // 2. Persiapkan Data & Database (Tahun)
    const tahunData = await prisma.tahunAnggaran.upsert({
      where: { tahun },
      update: { isActive: true },
      create: { tahun, isActive: true }
    });
    const tahunId = tahunData.id;

    if (type === 'pegawai') {
      return NextResponse.json({ error: 'Upload pegawai belum di-update ke format object map' }, { status: 400 });
    }

    // LOGIK UNTUK type === 'rekap'
    const rows = data.filter(r => String(r['NAMA SKPD'] || '').toUpperCase().includes('PENDIDIKAN'));

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
    rows.forEach(r => urusanMap.set(String(r['KODE URUSAN']).trim(), String(r['NAMA URUSAN']).trim()));
    await prisma.urusan.createMany({
      data: Array.from(urusanMap.entries()).filter(e => e[0] && e[0] !== 'undefined').map(([kode, nama]) => ({ kode, nama })),
      skipDuplicates: true
    });
    const urusans = await prisma.urusan.findMany();
    const uIdMap = new Map();
    urusans.forEach(u => uIdMap.set(u.kode, u.id));

    // Level 2: SKPD
    const skpdMap = new Map();
    rows.forEach(r => {
      const urusanKode = String(r['KODE URUSAN']).trim();
      const kode = String(r['KODE SKPD']).trim();
      if (!kode || !uIdMap.has(urusanKode)) return;
      const key = `${kode}_${String(r['KODE SUB UNIT']).trim()}`;
      if (!skpdMap.has(key)) {
        skpdMap.set(key, {
          kode, nama: String(r['NAMA SKPD']).trim(),
          kodeSubUnit: String(r['KODE SUB UNIT']).trim(), namaSubUnit: String(r['NAMA SUB UNIT']).trim(),
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
      const sId = sIdMap.get(`${String(r['KODE SKPD']).trim()}_${String(r['KODE SUB UNIT']).trim()}`);
      if (!sId) return;
      const kode = String(r['KODE PROGRAM']).trim();
      const key = `${kode}_${sId}`;
      if (!progMap.has(key)) {
        progMap.set(key, { 
          kode, 
          nama: String(r['NAMA PROGRAM']).trim(), 
          kodeBidangUrusan: String(r['KODE BIDANG URUSAN']).trim(),
          namaBidangUrusan: String(r['NAMA BIDANG URUSAN']).trim(),
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
      const sId = sIdMap.get(`${String(r['KODE SKPD']).trim()}_${String(r['KODE SUB UNIT']).trim()}`);
      const pId = pIdMap.get(`${String(r['KODE PROGRAM']).trim()}_${sId}`);
      if (!pId) return;
      const kode = String(r['KODE KEGIATAN']).trim();
      const key = `${kode}_${pId}`;
      if (!kegMap.has(key)) kegMap.set(key, { kode, nama: String(r['NAMA KEGIATAN']).trim(), programId: pId });
    });
    await prisma.kegiatan.createMany({ data: Array.from(kegMap.values()), skipDuplicates: true });
    const kegiatans = await prisma.kegiatan.findMany({ where: { programId: { in: Array.from(pIdMap.values()) } } });
    const kIdMap = new Map();
    kegiatans.forEach(k => kIdMap.set(`${k.kode}_${k.programId}`, k.id));

    // Level 5: SubKegiatan
    const subMap = new Map();
    rows.forEach(r => {
      const sId = sIdMap.get(`${String(r['KODE SKPD']).trim()}_${String(r['KODE SUB UNIT']).trim()}`);
      const pId = pIdMap.get(`${String(r['KODE PROGRAM']).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r['KODE KEGIATAN']).trim()}_${pId}`);
      if (!kId) return;
      const kode = String(r['KODE SUB KEGIATAN']).trim();
      const key = `${kode}_${kId}`;
      if (!subMap.has(key)) subMap.set(key, { kode, nama: String(r['NAMA SUB KEGIATAN']).trim(), kegiatanId: kId });
    });
    await prisma.subKegiatan.createMany({ data: Array.from(subMap.values()), skipDuplicates: true });
    const subkegs = await prisma.subKegiatan.findMany({ where: { kegiatanId: { in: Array.from(kIdMap.values()) } } });
    const skIdMap = new Map();
    subkegs.forEach(sk => skIdMap.set(`${sk.kode}_${sk.kegiatanId}`, sk.id));

    // Master Sumber Dana & Rekening
    const sumberDanaMap = new Map();
    const rekeningMap = new Map();
    rows.forEach(r => {
      sumberDanaMap.set(String(r['KODE SUMBER DANA']).trim(), String(r['NAMA SUMBER DANA']).trim());
      rekeningMap.set(String(r['KODE REKENING']).trim(), String(r['NAMA REKENING']).trim());
    });
    
    await prisma.sumberDana.createMany({
      data: Array.from(sumberDanaMap.entries()).filter(e => e[0] && e[0] !== 'undefined').map(([kode, nama]) => ({ kode, nama })),
      skipDuplicates: true
    });
    await prisma.rekening.createMany({
      data: Array.from(rekeningMap.entries()).filter(e => e[0] && e[0] !== 'undefined').map(([kode, nama]) => ({ kode, nama })),
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
      const sId = sIdMap.get(`${String(r['KODE SKPD']).trim()}_${String(r['KODE SUB UNIT']).trim()}`);
      const pId = pIdMap.get(`${String(r['KODE PROGRAM']).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r['KODE KEGIATAN']).trim()}_${pId}`);
      const skId = skIdMap.get(`${String(r['KODE SUB KEGIATAN']).trim()}_${kId}`);
      const sdId = sdMap.get(String(r['KODE SUMBER DANA']).trim());
      
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
      const sId = sIdMap.get(`${String(r['KODE SKPD']).trim()}_${String(r['KODE SUB UNIT']).trim()}`);
      const pId = pIdMap.get(`${String(r['KODE PROGRAM']).trim()}_${sId}`);
      const kId = kIdMap.get(`${String(r['KODE KEGIATAN']).trim()}_${pId}`);
      const skId = skIdMap.get(`${String(r['KODE SUB KEGIATAN']).trim()}_${kId}`);
      const sdId = sdMap.get(String(r['KODE SUMBER DANA']).trim());
      const rekId = rMap.get(String(r['KODE REKENING']).trim());
      
      if (!skId || !sdId || !rekId) return;

      const vol = 1;
      const rawPagu = typeof r['PAGU'] === 'number' ? r['PAGU'] : parseFloat(String(r['PAGU'] || '0').replace(/[^0-9.-]+/g, ''));
      const pagu = isNaN(rawPagu) ? 0 : rawPagu;
      
      if (pagu > 0) {
        rincianList.push({
          subKegiatanId: skId,
          sumberDanaId: sdId,
          rekeningId: rekId,
          tipePaket: String(r['PAKET/KELOMPOK'] || '').trim() || '-',
          namaPaket: String(r['NAMA PAKET/KELOMPOK'] || '').trim() || '-',
          volume: vol,
          hargaSatuan: pagu,
          pagu: pagu
        });
      }
    });

    if (rincianList.length > 0) {
      const skpdIdsInUpload = Array.from(sIdMap.values()) as number[];
      
      if (isPerubahan) {
        const existingRincian = await prisma.rincianBelanja.findMany({
          where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdsInUpload } } } } }
        });
        
        const existingMap = new Map<string, any[]>();
        existingRincian.forEach((r: any) => {
          const key = `${r.subKegiatanId}_${r.sumberDanaId}_${r.rekeningId}_${r.tipePaket}_${r.namaPaket}`;
          if (!existingMap.has(key)) existingMap.set(key, []);
          existingMap.get(key)!.push(r);
        });

        const mergedRincian: any[] = [];
        
        for (const item of rincianList) {
          const key = `${item.subKegiatanId}_${item.sumberDanaId}_${item.rekeningId}_${item.tipePaket}_${item.namaPaket}`;
          const existArr = existingMap.get(key);
          
          if (existArr && existArr.length > 0) {
            const exist = existArr.shift();
            const { id, ...rest } = exist;
            mergedRincian.push({
              ...rest,
              volumePerubahan: item.volume,
              hargaSatuanPerubahan: item.hargaSatuan,
              paguPerubahan: item.pagu
            });
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
        
        for (const existArr of existingMap.values()) {
          for (const exist of existArr) {
            const { id, ...rest } = exist;
            mergedRincian.push({
              ...rest,
              volumePerubahan: 0,
              hargaSatuanPerubahan: 0,
              paguPerubahan: 0
            });
          }
        }
        
        await prisma.rincianBelanja.deleteMany({
          where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdsInUpload } } } } }
        });
        
        const chunkSize = 500;
        for (let i = 0; i < mergedRincian.length; i += chunkSize) {
          await prisma.rincianBelanja.createMany({
            data: mergedRincian.slice(i, i + chunkSize)
          });
        }
      } else {
        await prisma.rincianBelanja.deleteMany({
          where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIdsInUpload } } } } }
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
