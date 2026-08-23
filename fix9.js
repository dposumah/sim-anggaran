const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let idx = content.indexOf('lex flex-col');
console.log('Charcode before lex:', content.charCodeAt(idx - 1));
