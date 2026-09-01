const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const skpds = await prisma.skpd.findMany({ include: { programs: { include: { kegiatans: { include: { subKegiatans: true } } } } } });
  for (const skpd of skpds) {
    let subCount = 0;
    skpd.programs.forEach(p => p.kegiatans.forEach(k => subCount += k.subKegiatans.length));
    console.log(`SKPD ${skpd.id} has ${subCount} subkegiatans.`);
  }
}
main();
