import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sk = await prisma.subKegiatan.findMany({ where: { nama: { contains: 'gaji', mode: 'insensitive' } }, select: { nama: true } });
  console.log('SubKegiatan Gaji:', Array.from(new Set(sk.map(s => s.nama))));

  const rek = await prisma.rekening.findMany({ where: { nama: { contains: 'gaji', mode: 'insensitive' } }, select: { nama: true } });
  console.log('Rekening Gaji:', Array.from(new Set(rek.map(r => r.nama))));
  
  const rekPPPK = await prisma.rekening.findMany({ where: { nama: { contains: 'PPPK', mode: 'insensitive' } }, select: { nama: true } });
  console.log('Rekening PPPK:', Array.from(new Set(rekPPPK.map(r => r.nama))));

  const honor = await prisma.subKegiatan.findMany({ where: { nama: { contains: 'jasa pelayanan umum kantor', mode: 'insensitive' } }, select: { nama: true } });
  console.log('SubKegiatan Honor:', Array.from(new Set(honor.map(s => s.nama))));
  
  const dau = await prisma.sumberDana.findMany({ where: { nama: { contains: 'DAU', mode: 'insensitive' } }, select: { nama: true } });
  console.log('Sumber Dana DAU:', Array.from(new Set(dau.map(s => s.nama))));
}

main().finally(() => prisma.$disconnect());
