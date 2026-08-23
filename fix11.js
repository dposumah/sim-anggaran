const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let idx = content.indexOf('lex flex-col');
console.log('Substring:', content.substring(idx - 15, idx + 15));
