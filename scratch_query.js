const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bosp = await prisma.rincianBelanja.findMany({
    where: {
      subKegiatan: {
        nama: { contains: 'BOS' }
      }
    },
    include: {
      sumberDana: true,
      rekening: true
    },
    take: 10
  });

  const distinctSumberDana = await prisma.sumberDana.findMany({
    where: {
      nama: { contains: 'BOS', mode: 'insensitive' }
    }
  });

  console.log('BOSP Rincian Sample:', bosp.map(b => ({
    subKegiatan: b.subKegiatanId,
    sumberDana: b.sumberDana.nama,
    rekening: b.rekening.nama,
    paket: b.namaPaket
  })));
  
  console.log('Distinct Sumber Dana BOSP:', distinctSumberDana);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
