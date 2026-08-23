const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let idx1 = content.indexOf('lex flex-col');
let idx2 = content.indexOf('lex flex-col', idx1 + 1);
console.log('Substring2:', content.substring(idx2 - 15, idx2 + 25));
