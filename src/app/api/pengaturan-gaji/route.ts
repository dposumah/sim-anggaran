export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak ditemukan' }, { status: 404 });

    let pengaturan = await prisma.pengaturanGaji.findUnique({
      where: { tahunId: tahunData.id }
    });

    if (!pengaturan) {
      pengaturan = await prisma.pengaturanGaji.create({
        data: {
          tahunId: tahunData.id,
          komponenGaji13: 'gapok,tunjKeluarga,tunjJabatan,tunjFungsional,tunjFungsionalUmum',
          komponenGaji14: 'gapok,tunjKeluarga,tunjJabatan,tunjFungsional,tunjFungsionalUmum',
          gajiTerusanBulan: 3,
          acressPersen: 2.5
        }
      });
    }

    return NextResponse.json(pengaturan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tahunId, komponenGaji13, komponenGaji14, gajiTerusanBulan, acressPersen } = body;

    const updated = await prisma.pengaturanGaji.upsert({
      where: { tahunId: parseInt(tahunId, 10) },
      update: {
        komponenGaji13,
        komponenGaji14,
        gajiTerusanBulan: parseInt(gajiTerusanBulan, 10),
        acressPersen: parseFloat(acressPersen)
      },
      create: {
        tahunId: parseInt(tahunId, 10),
        komponenGaji13,
        komponenGaji14,
        gajiTerusanBulan: parseInt(gajiTerusanBulan, 10),
        acressPersen: parseFloat(acressPersen)
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
