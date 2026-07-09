export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);
    const skpdIdStr = searchParams.get('skpdId');

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak ditemukan' }, { status: 404 });

    const where: any = { tahunId: tahunData.id };
    if (skpdIdStr) where.skpdId = parseInt(skpdIdStr, 10);

    const realisasi = await prisma.realisasiGaji.findMany({ where });
    return NextResponse.json(realisasi);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahunId, bulan, uraianBelanja, kategori, nominal } = body;

    const saved = await prisma.realisasiGaji.upsert({
      where: {
        skpdId_tahunId_bulan_uraianBelanja_kategori: {
          skpdId: parseInt(skpdId, 10),
          tahunId: parseInt(tahunId, 10),
          bulan: parseInt(bulan, 10),
          uraianBelanja,
          kategori
        }
      },
      update: {
        nominal: parseFloat(nominal)
      },
      create: {
        skpdId: parseInt(skpdId, 10),
        tahunId: parseInt(tahunId, 10),
        bulan: parseInt(bulan, 10),
        uraianBelanja,
        kategori,
        nominal: parseFloat(nominal)
      }
    });

    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
