const fs = require('fs');
let content = fs.readFileSync('test_pdf_bucket_34.js', 'utf8');
content = content.replace("console.log('TOTAL:', total);", "console.log('TOTAL:', total); console.log(items.map(i=> i.uraian + ' => ' + i.jumlah));");
fs.writeFileSync('test_pdf_bucket_34.js', content);
