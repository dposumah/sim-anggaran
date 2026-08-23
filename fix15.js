const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let idx1 = content.indexOf('lex flex-col');
let idx2 = content.indexOf('lex flex-col', idx1 + 1);
let start = content.lastIndexOf('className={', idx2);
let end = content.indexOf('>', idx2);
console.log('Before replace length:', content.length);
let prefix = content.substring(0, start);
let suffix = content.substring(end);
content = prefix + 'className={lex flex-col }' + suffix;
console.log('After replace length:', content.length);
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
