import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const skpd = await prisma.skpd.findFirst({
      where: {
        nama: {
          contains: 'PENDIDIKAN DAN KEBUDAYAAN DAERAH',
          mode: 'insensitive'
        }
      },
      include: {
        tahun: true
      }
    });

    if (!skpd) {
      return NextResponse.json({ error: 'SKPD Pendidikan tidak ditemukan di database sistem.' }, { status: 404 });
    }

    // Ambil semua sumber dana sebagai master list
    const sumberDanas = await prisma.sumberDana.findMany({
      orderBy: { kode: 'asc' }
    });

    // Ambil pagu yang sudah diset untuk SKPD dan Tahun ini
    const paguList = await prisma.paguSumberDana.findMany({
      where: { skpdId: skpd.id, tahunId: skpd.tahunId }
    });

    // Gabungkan
    const result = sumberDanas.map(sd => {
      const pagu = paguList.find(p => p.sumberDanaId === sd.id);
      return {
        sumberDanaId: sd.id,
        kode: sd.kode,
        nama: sd.nama,
        ceilingAmount: pagu ? Number(pagu.ceilingAmount) : 0
      };
    });

    return NextResponse.json({
      skpd: {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        tahunId: skpd.tahunId
      },
      data: result
    });
  } catch (error: unknown) {
    console.error('Error fetching data for control-sumber-dana:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahunId, sumberDanaId, ceilingAmount } = body;

    if (!skpdId || !tahunId || !sumberDanaId || ceilingAmount === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const pagu = await prisma.paguSumberDana.upsert({
      where: {
        skpdId_sumberDanaId_tahunId: {
          skpdId: Number(skpdId),
          sumberDanaId: Number(sumberDanaId),
          tahunId: Number(tahunId)
        }
      },
      update: {
        ceilingAmount: Number(ceilingAmount)
      },
      create: {
        skpdId: Number(skpdId),
        sumberDanaId: Number(sumberDanaId),
        tahunId: Number(tahunId),
        ceilingAmount: Number(ceilingAmount)
      }
    });

    return NextResponse.json(pagu);
  } catch (error: unknown) {
    console.error('Error saving pagu sumber dana:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
