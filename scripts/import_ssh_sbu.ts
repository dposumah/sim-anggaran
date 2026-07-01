import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function importFile(tipe: string, filename: string, tahunId: number) {
  const filePath = path.join(__dirname, '../../', filename);
  console.log(`\nReading Excel file: ${filePath}`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Get data rows (skip header)
  const rows = data.slice(1).filter(r => r[4] || r[7]); // Ensure Uraian Barang or Harga exists
  console.log(`Found ${rows.length} rows for ${tipe}`);

  const batch = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any[];
    // [A]=KODE KELOMPOK BARANG | [B]=URAIAN KELOMPOK BARANG | [C]=ID STANDAR HARGA | [D]=KODE BARANG | [E]=URAIAN BARANG | [F]=SPESIFIKASI | [G]=SATUAN | [H]=HARGA SATUAN | [I]=KODE REKENING
    
    const uraianBarang = String(row[4] || '').trim();
    if (!uraianBarang) continue;

    batch.push({
      tipe: tipe,
      kodeKelompok: String(row[0] || '').trim(),
      uraianKelompok: String(row[1] || '').trim(),
      idStandarHarga: String(row[2] || '').trim(),
      kodeBarang: String(row[3] || '').trim(),
      uraianBarang: uraianBarang,
      spesifikasi: String(row[5] || '').trim(),
      satuan: String(row[6] || '').trim() || '-',
      hargaSatuan: parseFloat(row[7]) || 0,
      kodeRekening: String(row[8] || '').trim(),
      tahunId: tahunId
    });
  }

  // Clear existing for this tipe
  await prisma.sshSbu.deleteMany({ where: { tipe, tahunId } });

  console.log(`Inserting ${batch.length} ${tipe} records...`);
  const chunkSize = 2000;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await prisma.sshSbu.createMany({ data: chunk });
    console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(batch.length / chunkSize)}`);
  }
}

async function main() {
  const tahunData = await prisma.tahunAnggaran.upsert({
    where: { tahun: 2026 },
    update: { isActive: true },
    create: { tahun: 2026, isActive: true }
  });
  const tahunId = tahunData.id;

  await importFile('SSH', 'export_excel_ssh_Kota Tomohon.xlsx', tahunId);
  await importFile('SBU', 'export_excel_sbu_Kota Tomohon.xlsx', tahunId);

  console.log('\nImport SSH & SBU completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
