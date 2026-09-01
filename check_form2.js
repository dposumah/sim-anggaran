const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('<form onSubmit={handleManualSubmit}'));
const end = lines.findIndex((l, i) => i > start && l.includes('</form>'));
console.log(lines.slice(start, end + 1).join('\n'));
