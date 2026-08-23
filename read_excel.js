const xlsx = require('xlsx');
const filePath = process.argv[2];
const query = process.argv[3];

try {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const results = data.filter(r => {
      return Object.values(r).some(v => String(v).includes(query));
  });
  
  let total = 0;
  if (results.length > 0) {
      console.log('Found', results.length, 'rows');
      results.forEach(r => {
          console.log(r['NAMA REKENING'], '=>', r['PAGU']);
          total += r['PAGU'];
      });
      console.log('TOTAL EXCEL:', total);
  } else {
      console.log('Not found');
  }
} catch (error) {
  console.error('Error reading file:', error.message);
}
