import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const skpds = await prisma.skpd.findMany({
    select: { id: true, kode: true, nama: true, kodeSubUnit: true, namaSubUnit: true }
  });
  console.log(`Found ${skpds.length} SKPDs`);
  console.log(skpds.slice(0, 10)); // just print first 10
}

main().finally(() => prisma.$disconnect());
