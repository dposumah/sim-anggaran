require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.rincianItemBelanja.count();
    console.log("Total RincianItemBelanja:", count);
    
    if (count > 0) {
        const sample = await prisma.rincianItemBelanja.findFirst({
            include: { rincianBelanja: true }
        });
        console.log("Sample ID:", sample.id);
    }
}
main().finally(() => prisma.$disconnect());
