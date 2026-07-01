import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../../Rekap SKPD Tomohon.xlsx');
  console.log(`Reading Excel file: ${filePath}`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const rows = data.slice(1).filter(r => r[1]);
  console.log(`Found ${rows.length} rows`);

  const tahunData = await prisma.tahunAnggaran.upsert({
    where: { tahun: 2026 },
    update: { isActive: true },
    create: { tahun: 2026, isActive: true }
  });
  const tahunId = tahunData.id;

  // Level 1: Urusan
  console.log('Processing Urusan...');
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
  console.log('Processing SKPD...');
  const skpdMap = new Map(); // key: kode_kodeSubUnit
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
  console.log('Processing Program...');
  const progMap = new Map(); // key: kode_skpdId
  rows.forEach(r => {
    const skpdKey = `${String(r[4]).trim()}_${String(r[6]).trim()}`;
    const skpdId = sIdMap.get(skpdKey);
    const kode = String(r[10]).trim();
    if (!kode || !skpdId) return;
    const key = `${kode}_${skpdId}`;
    if (!progMap.has(key)) {
      progMap.set(key, {
        kode, nama: String(r[11]).trim(),
        kodeBidangUrusan: String(r[8]).trim(), namaBidangUrusan: String(r[9]).trim(),
        skpdId
      });
    }
  });
  await prisma.program.createMany({ data: Array.from(progMap.values()), skipDuplicates: true });
  const progs = await prisma.program.findMany();
  const pIdMap = new Map();
  progs.forEach(p => pIdMap.set(`${p.kode}_${p.skpdId}`, p.id));

  // Level 4: Kegiatan
  console.log('Processing Kegiatan...');
  const kegMap = new Map();
  rows.forEach(r => {
    const skpdKey = `${String(r[4]).trim()}_${String(r[6]).trim()}`;
    const progKey = `${String(r[10]).trim()}_${sIdMap.get(skpdKey)}`;
    const progId = pIdMap.get(progKey);
    const kode = String(r[12]).trim();
    if (!kode || !progId) return;
    const key = `${kode}_${progId}`;
    if (!kegMap.has(key)) {
      kegMap.set(key, { kode, nama: String(r[13]).trim(), programId: progId });
    }
  });
  await prisma.kegiatan.createMany({ data: Array.from(kegMap.values()), skipDuplicates: true });
  const kegs = await prisma.kegiatan.findMany();
  const kIdMap = new Map();
  kegs.forEach(k => kIdMap.set(`${k.kode}_${k.programId}`, k.id));

  // Level 5: SubKegiatan
  console.log('Processing SubKegiatan...');
  const subMap = new Map();
  rows.forEach(r => {
    const skpdKey = `${String(r[4]).trim()}_${String(r[6]).trim()}`;
    const progKey = `${String(r[10]).trim()}_${sIdMap.get(skpdKey)}`;
    const kegKey = `${String(r[12]).trim()}_${pIdMap.get(progKey)}`;
    const kegId = kIdMap.get(kegKey);
    const kode = String(r[14]).trim();
    if (!kode || !kegId) return;
    const key = `${kode}_${kegId}`;
    if (!subMap.has(key)) {
      subMap.set(key, { kode, nama: String(r[15]).trim(), kegiatanId: kegId });
    }
  });
  await prisma.subKegiatan.createMany({ data: Array.from(subMap.values()), skipDuplicates: true });
  const subs = await prisma.subKegiatan.findMany();
  const subIdMap = new Map();
  subs.forEach(s => subIdMap.set(`${s.kode}_${s.kegiatanId}`, s.id));

  // SumberDana & Rekening
  console.log('Processing SumberDana and Rekening...');
  const sdMap = new Map();
  const rekMap = new Map();
  rows.forEach(r => {
    sdMap.set(String(r[16]).trim(), String(r[17]).trim());
    rekMap.set(String(r[18]).trim(), String(r[19]).trim());
  });
  await prisma.sumberDana.createMany({
    data: Array.from(sdMap.entries()).filter(e => e[0]).map(([kode, nama]) => ({ kode, nama })),
    skipDuplicates: true
  });
  await prisma.rekening.createMany({
    data: Array.from(rekMap.entries()).filter(e => e[0]).map(([kode, nama]) => ({ kode, nama })),
    skipDuplicates: true
  });
  const sds = await prisma.sumberDana.findMany();
  const reks = await prisma.rekening.findMany();
  const sdIdMap = new Map();
  const rekIdMap = new Map();
  sds.forEach(sd => sdIdMap.set(sd.kode, sd.id));
  reks.forEach(rek => rekIdMap.set(rek.kode, rek.id));

  // SubKegiatanSumberDana relation
  console.log('Processing Relations...');
  const relMap = new Map();
  rows.forEach(r => {
    const skpdKey = `${String(r[4]).trim()}_${String(r[6]).trim()}`;
    const progKey = `${String(r[10]).trim()}_${sIdMap.get(skpdKey)}`;
    const kegKey = `${String(r[12]).trim()}_${pIdMap.get(progKey)}`;
    const subKey = `${String(r[14]).trim()}_${kIdMap.get(kegKey)}`;
    const subId = subIdMap.get(subKey);
    const sdId = sdIdMap.get(String(r[16]).trim());
    if (subId && sdId) relMap.set(`${subId}_${sdId}`, { subKegiatanId: subId, sumberDanaId: sdId });
  });
  await prisma.subKegiatanSumberDana.createMany({ data: Array.from(relMap.values()), skipDuplicates: true });

  // Rincian Belanja
  console.log('Processing Rincian Belanja...');
  const rincianBatch = [];
  rows.forEach(r => {
    const skpdKey = `${String(r[4]).trim()}_${String(r[6]).trim()}`;
    const progKey = `${String(r[10]).trim()}_${sIdMap.get(skpdKey)}`;
    const kegKey = `${String(r[12]).trim()}_${pIdMap.get(progKey)}`;
    const subKey = `${String(r[14]).trim()}_${kIdMap.get(kegKey)}`;
    
    const subId = subIdMap.get(subKey);
    const sdId = sdIdMap.get(String(r[16]).trim());
    const rekId = rekIdMap.get(String(r[18]).trim());
    const pagu = parseFloat(r[22]) || 0;

    if (subId && sdId && rekId && pagu > 0) {
      rincianBatch.push({
        subKegiatanId: subId,
        sumberDanaId: sdId,
        rekeningId: rekId,
        tipePaket: String(r[20]).trim() || '-',
        namaPaket: String(r[21]).trim() || '-',
        volume: 1,
        hargaSatuan: pagu,
        pagu: pagu
      });
    }
  });

  await prisma.rincianBelanja.deleteMany({}); // clear first
  console.log(`Inserting ${rincianBatch.length} Rincian Belanja...`);
  
  const chunkSize = 2000;
  for (let i = 0; i < rincianBatch.length; i += chunkSize) {
    const chunk = rincianBatch.slice(i, i + chunkSize);
    await prisma.rincianBelanja.createMany({ data: chunk });
    console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(rincianBatch.length / chunkSize)}`);
  }

  console.log('FAST IMPORT COMPLETED.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
