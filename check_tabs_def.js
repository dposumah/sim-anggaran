const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const tabsDefLine = lines.findIndex(l => l.includes('const tabs = ['));
if (tabsDefLine !== -1) {
    console.log(lines.slice(tabsDefLine, tabsDefLine+20).join('\n'));
} else {
    console.log("Could not find const tabs = [");
}
