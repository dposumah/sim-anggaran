const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rincianList = await prisma.rincianBelanja.findMany({
    where: {
      subKegiatan: {
        kegiatan: {
          program: {
            skpd: {
              nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
            }
          }
        }
      }
    },
    include: {
      subKegiatan: {
        include: {
          kegiatan: {
            include: {
              program: true
            }
          }
        }
      }
    },
  });

  const paketMap = {};
  
  rincianList.forEach(r => {
    const prog = r.subKegiatan.kegiatan.program;
    const subUpper = (r.subKegiatan.nama || '').toUpperCase();
    const isBosp = subUpper.includes('BOS') || subUpper.includes('BOP');
    const isEmptyPaket = (r.namaPaket || '').trim() === '-' || (r.namaPaket || '').trim() === '';
    
    if (r.namaPaket && !(prog.nama || '').toUpperCase().includes('PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA') && !isBosp && !isEmptyPaket) {
      if (!paketMap[r.namaPaket]) paketMap[r.namaPaket] = 0;
      paketMap[r.namaPaket] += r.paguPerubahan ? Number(r.paguPerubahan) : Number(r.paguInduk || 0);
    }
  });

  const topPaket = Object.keys(paketMap).map(k => ({ name: k, perubahan: paketMap[k] })).sort((a,b) => b.perubahan - a.perubahan).slice(0, 10);
  console.log("Top Paket:", topPaket);
}

main().finally(() => prisma.$disconnect());
