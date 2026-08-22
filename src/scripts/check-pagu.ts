require('dotenv').config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const skpd = await prisma.skpd.findFirst({
    where: { nama: { contains: 'PENDIDIKAN' } }
  });
  console.log('SKPD:', skpd?.id);
  const rincianList = await prisma.rincianBelanja.findMany({
    where: { subKegiatan: { kegiatan: { program: { skpdId: skpd?.id } } } },
    select: { sumberDana: { select: { nama: true } }, paguInduk: true, paguPerubahan: true }
  });
  let total = 0;
  let breakdown: Record<string, number> = {};
  rincianList.forEach((r: any) => {
    const val = r.paguPerubahan !== null ? Number(r.paguPerubahan) : Number(r.paguInduk);
    total += val;
    if(!breakdown[r.sumberDana.nama]) breakdown[r.sumberDana.nama] = 0;
    breakdown[r.sumberDana.nama] += val;
  });
  console.log('Total:', total);
  console.log(breakdown);
}
run();
