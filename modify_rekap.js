const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');

const target1 = `  // Aggregate Rekap SD
  const rekapSd = useMemo(() => {
    const map = new Map<string, { nama: string, pagu: number }>();
    rincianList.forEach(r => {
      const k = r.sumberDana?.nama || 'Unknown';
      const ext = map.get(k) || { nama: k, pagu: 0 };
      ext.pagu += Number(r.paguPerubahan || 0);
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.pagu - a.pagu);
  }, [rincianList]);`;

const replacement1 = `  // Aggregate Rekap SD
  const rekapSd = useMemo(() => {
    const map = new Map<string, { nama: string, paguInduk: number, paguRkpd: number, paguPerubahan: number, selisih: number, realisasi: number }>();
    rincianList.forEach(r => {
      const k = r.sumberDana?.nama || 'Unknown';
      const ext = map.get(k) || { nama: k, paguInduk: 0, paguRkpd: 0, paguPerubahan: 0, selisih: 0, realisasi: 0 };
      
      const induk = Number(r.paguInduk || 0);
      const rkpd = Number(r.paguRkpd !== null ? r.paguRkpd : r.paguInduk || 0);
      const perubahan = Number(r.paguPerubahan || 0);
      
      ext.paguInduk += induk;
      ext.paguRkpd += rkpd;
      ext.paguPerubahan += perubahan;
      ext.selisih += (perubahan - induk);
      ext.realisasi += Number(r.realisasi || 0);
      
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.paguPerubahan - a.paguPerubahan);
  }, [rincianList]);`;

code = code.replace(target1, replacement1);
fs.writeFileSync('src/app/explorer/[id]/RincianClient.tsx', code);
console.log("Updated rekapSd");
