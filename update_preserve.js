const fs = require('fs');
let code = fs.readFileSync('src/app/api/save-pdf-rincian/route.ts', 'utf8');

const oldLogicStart = `    // Prepare transaction array
    const txs: any[] = [];

    // Delete old RincianBelanja
    txs.push(
      prisma.rincianBelanja.deleteMany({
        where: { subKegiatanId: subKeg.id }
      })
    );`;

const newLogicStart = `    // Fetch existing RincianBelanja to preserve other pagus
    const existingRincian = await prisma.rincianBelanja.findMany({
      where: { subKegiatanId: subKeg.id }
    });
    const oldPaguMap = new Map();
    existingRincian.forEach(r => {
      const key = r.rekeningId + '_' + r.sumberDanaId + '_' + r.namaPaket;
      oldPaguMap.set(key, { paguInduk: r.paguInduk, paguRkpd: r.paguRkpd, paguPerubahan: r.paguPerubahan });
    });

    // Prepare transaction array
    const txs: any[] = [];

    // Delete old RincianBelanja
    txs.push(
      prisma.rincianBelanja.deleteMany({
        where: { subKegiatanId: subKeg.id }
      })
    );`;

if (!code.includes('oldPaguMap')) {
    code = code.replace(oldLogicStart, newLogicStart);
}

const targetCreate = `              tipePaket: '-',
              volumeInduk: 1,
              hargaSatuanInduk: totalPagu,
              paguInduk: tahapan === 'induk' ? totalPagu : (tahapan === 'rkpd' ? totalPagu : 0), 
              paguRkpd: tahapan === 'rkpd' ? totalPagu : (tahapan === 'perubahan' ? 0 : totalPagu),
              paguPerubahan: tahapan === 'perubahan' ? totalPagu : 0,
              rincianItemBelanjas: {`;

const newCreate = `              tipePaket: '-',
              volumeInduk: 1,
              hargaSatuanInduk: totalPagu,
              paguInduk: tahapan === 'induk' ? totalPagu : (oldPaguMap.get(group.rekeningId + '_' + group.sumberDanaId + '_' + group.namaPaket)?.paguInduk || 0), 
              paguRkpd: tahapan === 'rkpd' ? totalPagu : (oldPaguMap.get(group.rekeningId + '_' + group.sumberDanaId + '_' + group.namaPaket)?.paguRkpd || 0),
              paguPerubahan: tahapan === 'perubahan' ? totalPagu : (oldPaguMap.get(group.rekeningId + '_' + group.sumberDanaId + '_' + group.namaPaket)?.paguPerubahan || 0),
              rincianItemBelanjas: {`;

code = code.replace(targetCreate, newCreate);

fs.writeFileSync('src/app/api/save-pdf-rincian/route.ts', code);
console.log("Updated preserve logic");
