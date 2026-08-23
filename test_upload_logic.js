const xlsx = require('xlsx');
const filePath = process.argv[2];

try {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  let rows = xlsx.utils.sheet_to_json(sheet);
  
  rows = rows.filter(r => String(r['NAMA SKPD'] || '').toUpperCase().includes('PENDIDIKAN') || String(r['NAMA SUB UNIT'] || '').toUpperCase().includes('PENDIDIKAN'));
  
  const mySubKegRows = rows.filter(r => String(r['KODE SUB KEGIATAN']).trim() === '1.01.01.2.06.0001');
  console.log('Found rows after SKPD filter:', mySubKegRows.length);
  if (mySubKegRows.length > 0) {
      console.log('Sample:', mySubKegRows[0]);
  }

  // Simulate Map building
  const sIdMap = new Map(); sIdMap.set('1.01.2.22.0.00.01.0000_1.01.2.22.0.00.01.0000', 1);
  const pIdMap = new Map(); pIdMap.set('1.01.01_1', 1);
  const kIdMap = new Map(); kIdMap.set('1.01.01.2.06_1', 1);
  const skIdMap = new Map(); skIdMap.set('1.01.01.2.06.0001_1', 1);
  const sdMap = new Map(); sdMap.set('1.1', 1);
  const rMap = new Map(); rMap.set('5.1.02.01.001.00031', 1);

  const rincianList = [];
  rows.forEach(r => {
      const sId = sIdMap.get(${String(r['KODE SKPD']).trim()}_);
      const pId = pIdMap.get(${String(r['KODE PROGRAM']).trim()}_);
      const kId = kIdMap.get(${String(r['KODE KEGIATAN']).trim()}_29936);
      const skId = skIdMap.get(${String(r['KODE SUB KEGIATAN']).trim()}_);
      const sdId = sdMap.get(String(r['KODE SUMBER DANA']).trim());
      const rekId = rMap.get(String(r['KODE REKENING']).trim());
      
      if (String(r['KODE SUB KEGIATAN']).trim() === '1.01.01.2.06.0001') {
          console.log('sId:', sId, 'pId:', pId, 'kId:', kId, 'skId:', skId, 'sdId:', sdId, 'rekId:', rekId);
      }
      
      if (!skId || !sdId || !rekId) return;

      const vol = 1;
      const rawPagu = typeof r['PAGU'] === 'number' ? r['PAGU'] : parseFloat(String(r['PAGU'] || '0').replace(/[^0-9.-]+/g, ''));
      const pagu = isNaN(rawPagu) ? 0 : rawPagu;
      
      if (pagu > 0) {
        if (String(r['KODE SUB KEGIATAN']).trim() === '1.01.01.2.06.0001') {
           console.log('PUSHED TO RINCIAN LIST!');
        }
        rincianList.push({});
      }
  });

} catch (error) {
  console.error('Error:', error.message);
}
