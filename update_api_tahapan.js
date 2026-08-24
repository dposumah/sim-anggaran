const fs = require('fs');
let code = fs.readFileSync('src/app/api/save-pdf-rincian/route.ts', 'utf8');

if (!code.includes('const { tahapan, subKegiatan, items }')) {
    code = code.replace('const { subKegiatan, items } = await req.json();', 'const { tahapan, subKegiatan, items } = await req.json();');
}

const targetCreate = `              tipePaket: '-',
              volumeInduk: 1,
              hargaSatuanInduk: totalPagu,
              paguInduk: totalPagu, 
              paguRkpd: totalPagu,
              paguPerubahan: totalPagu,
              rincianItemBelanjas: {`;

const newCreate = `              tipePaket: '-',
              volumeInduk: 1,
              hargaSatuanInduk: totalPagu,
              paguInduk: tahapan === 'induk' ? totalPagu : (tahapan === 'rkpd' ? totalPagu : 0), 
              paguRkpd: tahapan === 'rkpd' ? totalPagu : (tahapan === 'perubahan' ? 0 : totalPagu),
              paguPerubahan: tahapan === 'perubahan' ? totalPagu : 0,
              rincianItemBelanjas: {`;

code = code.replace(targetCreate, newCreate);

fs.writeFileSync('src/app/api/save-pdf-rincian/route.ts', code);
console.log("Updated route.ts");
