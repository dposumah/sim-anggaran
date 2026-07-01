export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak ditemukan' }, { status: 404 });

    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' } // Filter to Dinas Pendidikan for now
      },
      include: {
        pagus: true
      },
      orderBy: { kode: 'asc' }
    });

    const result = skpds.map(skpd => ({
      id: skpd.id,
      kode: skpd.kodeSubUnit || skpd.kode,
      nama: skpd.namaSubUnit === skpd.nama ? skpd.nama : `${skpd.nama} - ${skpd.namaSubUnit}`,
      paguId: skpd.pagus.length > 0 ? skpd.pagus[0].id : null,
      ceilingAmount: skpd.pagus.length > 0 ? Number(skpd.pagus[0].ceilingAmount) : 0
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { skpdId, ceilingAmount, tahun } = await request.json();
    const t = tahun || 2026;

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun: t } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak valid' }, { status: 400 });

    const pagu = await prisma.paguCeiling.upsert({
      where: { skpdId_tahunId: { skpdId, tahunId: tahunData.id } },
      update: { ceilingAmount },
      create: { skpdId, tahunId: tahunData.id, ceilingAmount }
    });

    return NextResponse.json(pagu);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

