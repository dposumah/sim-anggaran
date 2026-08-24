const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');

const regexTabs = /\[\s*\{\s*id:\s*'rincian'[\s\S]*?\.map\(\(tab\)/;
console.log(code.match(regexTabs) ? "Found tabs" : "Tabs not found");

const regexContent = /\{\s*activeTab\s*===\s*'rincian'\s*&&\s*\([\s\S]*?RincianTable[\s\S]*?\/\>\s*\)\}/;
console.log(code.match(regexContent) ? "Found content" : "Content not found");
