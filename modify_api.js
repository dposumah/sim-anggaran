const fs = require('fs');
let code = fs.readFileSync('src/app/api/laporan/perbandingan/route.ts', 'utf8');

code = code.replace(
`          paketMap[r.namaPaket].rincian.push({
            subKegiatanId: sub.id,
            rekeningId: rek.id,
            sumberDanaId: r.sumberDana.id,
            subKegiatan: sub.nama,
            rekening: rek.nama,
            sumberDana: r.sumberDana.nama,
            paguInduk: nilaiInduk,
            paguRkpd: nilaiRkpd,
            paguPerubahan: nilaiPerubahan,
            realisasi: 0
          });`,
`          paketMap[r.namaPaket].rincian.push({
            subKegiatanId: sub.id,
            rekeningId: rek.id,
            sumberDanaId: r.sumberDana.id,
            subKegiatan: sub.nama,
            rekening: rek.nama,
            sumberDana: r.sumberDana.nama,
            paguInduk: nilaiInduk,
            paguRkpd: nilaiRkpd,
            paguPerubahan: nilaiPerubahan,
            realisasi: 0,
            items: r.rincianItemBelanjas || []
          });`);
fs.writeFileSync('src/app/api/laporan/perbandingan/route.ts', code);
console.log("Updated api");
