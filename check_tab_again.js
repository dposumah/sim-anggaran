const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
if (code.includes('Rincian Detail (Spesifikasi)')) {
    console.log("Tab exists");
} else {
    console.log("Tab does not exist");
}
