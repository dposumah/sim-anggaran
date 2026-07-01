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

  // Get data rows (skip header)
  const rows = data.slice(1).filter(r => r[1]); // Ensure TAHUN exists
  console.log(`Found ${rows.length} rows`);

  // Ensure TahunAnggaran exists
  let tahunId = 1;
  const tahunData = await prisma.tahunAnggaran.upsert({
    where: { tahun: 2026 },
    update: { isActive: true },
    create: { tahun: 2026, isActive: true }
  });
  tahunId = tahunData.id;

  const mapUrusan = new Map();
  const mapSkpd = new Map();
  const mapProgram = new Map();
  const mapKegiatan = new Map();
  const mapSubKegiatan = new Map();
  const mapSumberDana = new Map();
  const mapRekening = new Map();
  const mapSubKegSumberDana = new Map();
  const rincianBelanjaBatch = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any[];
    // [C]=KODE URUSAN, [D]=NAMA URUSAN
    const urusanKode = String(row[2]).trim();
    const urusanNama = String(row[3]).trim();
    let urusanId = mapUrusan.get(urusanKode);
    if (!urusanId && urusanKode) {
      const u = await prisma.urusan.upsert({
        where: { kode: urusanKode },
        update: {},
        create: { kode: urusanKode, nama: urusanNama }
      });
      urusanId = u.id;
      mapUrusan.set(urusanKode, urusanId);
    }

    // [E]=KODE SKPD, [F]=NAMA SKPD, [G]=KODE SUB UNIT, [H]=NAMA SUB UNIT
    const skpdKode = String(row[4]).trim();
    const skpdNama = String(row[5]).trim();
    const skpdSubKode = String(row[6]).trim();
    const skpdSubNama = String(row[7]).trim();
    const skpdKey = `${skpdKode}-${skpdSubKode}-${tahunId}`;
    let skpdId = mapSkpd.get(skpdKey);
    if (!skpdId && skpdKode && urusanId) {
      const s = await prisma.skpd.upsert({
        where: { kode_kodeSubUnit_tahunId: { kode: skpdKode, kodeSubUnit: skpdSubKode, tahunId } },
        update: {},
        create: {
          kode: skpdKode, nama: skpdNama,
          kodeSubUnit: skpdSubKode, namaSubUnit: skpdSubNama,
          urusanId, tahunId
        }
      });
      skpdId = s.id;
      mapSkpd.set(skpdKey, skpdId);
    }

    // [I]=KODE BIDANG URUSAN, [J]=NAMA BIDANG URUSAN, [K]=KODE PROGRAM, [L]=NAMA PROGRAM
    const progKode = String(row[10]).trim();
    const progNama = String(row[11]).trim();
    const progBidangKode = String(row[8]).trim();
    const progBidangNama = String(row[9]).trim();
    const progKey = `${progKode}-${skpdId}`;
    let progId = mapProgram.get(progKey);
    if (!progId && progKode && skpdId) {
      const p = await prisma.program.upsert({
        where: { kode_skpdId: { kode: progKode, skpdId } },
        update: {},
        create: {
          kode: progKode, nama: progNama,
          kodeBidangUrusan: progBidangKode, namaBidangUrusan: progBidangNama,
          skpdId
        }
      });
      progId = p.id;
      mapProgram.set(progKey, progId);
    }

    // [M]=KODE KEGIATAN, [N]=NAMA KEGIATAN
    const kegKode = String(row[12]).trim();
    const kegNama = String(row[13]).trim();
    const kegKey = `${kegKode}-${progId}`;
    let kegId = mapKegiatan.get(kegKey);
    if (!kegId && kegKode && progId) {
      const k = await prisma.kegiatan.upsert({
        where: { kode_programId: { kode: kegKode, programId: progId } },
        update: {},
        create: { kode: kegKode, nama: kegNama, programId: progId }
      });
      kegId = k.id;
      mapKegiatan.set(kegKey, kegId);
    }

    // [O]=KODE SUB KEGIATAN, [P]=NAMA SUB KEGIATAN
    const subKode = String(row[14]).trim();
    const subNama = String(row[15]).trim();
    const subKey = `${subKode}-${kegId}`;
    let subId = mapSubKegiatan.get(subKey);
    if (!subId && subKode && kegId) {
      const s = await prisma.subKegiatan.upsert({
        where: { kode_kegiatanId: { kode: subKode, kegiatanId: kegId } },
        update: {},
        create: { kode: subKode, nama: subNama, kegiatanId: kegId }
      });
      subId = s.id;
      mapSubKegiatan.set(subKey, subId);
    }

    // [Q]=KODE SUMBER DANA, [R]=NAMA SUMBER DANA
    const sdKode = String(row[16]).trim();
    const sdNama = String(row[17]).trim();
    let sdId = mapSumberDana.get(sdKode);
    if (!sdId && sdKode) {
      const sd = await prisma.sumberDana.upsert({
        where: { kode: sdKode },
        update: {},
        create: { kode: sdKode, nama: sdNama }
      });
      sdId = sd.id;
      mapSumberDana.set(sdKode, sdId);
    }

    // [S]=KODE REKENING, [T]=NAMA REKENING
    const rekKode = String(row[18]).trim();
    const rekNama = String(row[19]).trim();
    let rekId = mapRekening.get(rekKode);
    if (!rekId && rekKode) {
      const rek = await prisma.rekening.upsert({
        where: { kode: rekKode },
        update: {},
        create: { kode: rekKode, nama: rekNama }
      });
      rekId = rek.id;
      mapRekening.set(rekKode, rekId);
    }

    // SubKegiatanSumberDana relation
    if (subId && sdId) {
      const subSdKey = `${subId}-${sdId}`;
      if (!mapSubKegSumberDana.has(subSdKey)) {
        try {
          await prisma.subKegiatanSumberDana.upsert({
            where: { subKegiatanId_sumberDanaId: { subKegiatanId: subId, sumberDanaId: sdId } },
            update: {},
            create: { subKegiatanId: subId, sumberDanaId: sdId }
          });
          mapSubKegSumberDana.set(subSdKey, true);
        } catch (e) {
          // Ignore duplicate errors just in case
        }
      }
    }

    // [U]=PAKET/KELOMPOK, [V]=NAMA PAKET/KELOMPOK, [W]=PAGU
    const tipePaket = String(row[20]).trim() || '-';
    const namaPaket = String(row[21]).trim() || '-';
    const pagu = parseFloat(row[22]) || 0;

    if (subId && sdId && rekId && pagu > 0) {
      rincianBelanjaBatch.push({
        subKegiatanId: subId,
        sumberDanaId: sdId,
        rekeningId: rekId,
        tipePaket: tipePaket,
        namaPaket: namaPaket,
        pagu: pagu,
        volume: 1, // Default volume for now
        hargaSatuan: pagu // Assume harga_satuan = pagu when volume = 1
      });
    }

    if ((i + 1) % 1000 === 0) {
      console.log(`Processed ${i + 1} hierarchical rows...`);
    }
  }

  // Before inserting rincian, let's clear existing to prevent duplicates if ran multiple times
  await prisma.rincianBelanja.deleteMany({});
  
  console.log(`Inserting ${rincianBelanjaBatch.length} Rincian Belanja...`);
  const chunkSize = 1000;
  for (let i = 0; i < rincianBelanjaBatch.length; i += chunkSize) {
    const chunk = rincianBelanjaBatch.slice(i, i + chunkSize);
    await prisma.rincianBelanja.createMany({ data: chunk });
    console.log(`Inserted chunk ${i / chunkSize + 1} / ${Math.ceil(rincianBelanjaBatch.length / chunkSize)}`);
  }

  console.log('Import Rekap SKPD completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
