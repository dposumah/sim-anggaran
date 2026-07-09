const xlsx = require('xlsx');
const filePath = 'C:\\Users\\ASUS\\Downloads\\71.73_Kota Tomohon_Rekap_Ver5_Rancangan Akhir - Rancangan Akhir Perubahan RKPD Tahun 2026_Belum_Terkunci.xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(data.slice(0, 10)); // Print first 10 rows to see headers and structure
  }
} catch (error) {
  console.error('Error reading file:', error.message);
}
