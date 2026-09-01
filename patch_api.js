const fs = require('fs');
let code = fs.readFileSync('src/app/api/realisasi/route.ts', 'utf8');
const oldPost = `    const result = await prisma.realisasiBelanja.upsert({
      where: {
        skpdId_subKegiatanId_sumberDanaId_rekeningId_bulan: {
          skpdId: parseInt(skpdId),
          subKegiatanId: parseInt(subKegiatanId),
          sumberDanaId: parseInt(sumberDanaId),
          rekeningId: parseInt(rekeningId),
          bulan: parseInt(bulan)
        }
      },
      update: {
        nominal: parseFloat(nominal),
        keterangan
      },
      create: {
        skpdId: parseInt(skpdId),
        tahunId: tahunData.id,
        subKegiatanId: parseInt(subKegiatanId),
        sumberDanaId: parseInt(sumberDanaId),
        rekeningId: parseInt(rekeningId),
        bulan: parseInt(bulan),
        nominal: parseFloat(nominal),
        keterangan
      }
    });`;
const newPost = `    let result;
    if (body.id) {
      result = await prisma.realisasiBelanja.update({
        where: { id: parseInt(body.id) },
        data: {
          subKegiatanId: parseInt(subKegiatanId),
          sumberDanaId: parseInt(sumberDanaId),
          rekeningId: parseInt(rekeningId),
          bulan: parseInt(bulan),
          nominal: parseFloat(nominal),
          keterangan
        }
      });
    } else {
      result = await prisma.realisasiBelanja.upsert({
        where: {
          skpdId_subKegiatanId_sumberDanaId_rekeningId_bulan: {
            skpdId: parseInt(skpdId),
            subKegiatanId: parseInt(subKegiatanId),
            sumberDanaId: parseInt(sumberDanaId),
            rekeningId: parseInt(rekeningId),
            bulan: parseInt(bulan)
          }
        },
        update: {
          nominal: parseFloat(nominal),
          keterangan
        },
        create: {
          skpdId: parseInt(skpdId),
          tahunId: tahunData.id,
          subKegiatanId: parseInt(subKegiatanId),
          sumberDanaId: parseInt(sumberDanaId),
          rekeningId: parseInt(rekeningId),
          bulan: parseInt(bulan),
          nominal: parseFloat(nominal),
          keterangan
        }
      });
    }`;
code = code.replace(oldPost, newPost);
fs.writeFileSync('src/app/api/realisasi/route.ts', code);
console.log("Updated api route");
