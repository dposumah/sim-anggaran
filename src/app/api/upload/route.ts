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
    const tahun = parseInt(tahunStr || '2026', 10);

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (type !== 'rekap') {
      return NextResponse.json({ error: 'Upload master standar harga belum didukung via UI saat ini' }, { status: 400 });
    }

    // 1. Baca File Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    // Buang baris header kosong dan pastikan ada kode rekening/skpd di kolom indeks 1
    const rawRows = data.slice(1).filter(r => r[1]);

    // FILTER: HANYA PROSES DINAS PENDIDIKAN DAN KEBUDAYAAN
    // Asumsi: Nama SKPD ada di index 5 (G) berdasarkan skema file
    const rows = rawRows.filter(r => String(r[5]).toUpperCase().includes('PENDIDIKAN'));

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Tidak ada data Dinas Pendidikan yang ditemukan dalam file ${file.name}. (Dilewati: ${rawRows.length} baris)`
      }, { status: 400 });
    }

    // 2. Persiapkan Data & Database
    const tahunData = await prisma.tahunAnggaran.upsert({
      where: { tahun },
      update: { isActive: true },
      create: { tahun, isActive: true }
    });
    const tahunId = tahunData.id;

    // --- LOGIKA BATCH INSERT ---

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

    // We can't guarantee rincian duplicates uniquely without a dedicated unique field, 
    // so for "import" we typically just create all if they don't exist.
    // For safety and speed in this prototype, we'll delete existing rincian for these subkegiatans first.
    if (rincianList.length > 0) {
      const skIdsInUpload = Array.from(new Set(rincianList.map(r => r.subKegiatanId)));
      await prisma.rincianBelanja.deleteMany({
        where: { subKegiatanId: { in: skIdsInUpload } }
      });
      await prisma.rincianBelanja.createMany({ data: rincianList });
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
