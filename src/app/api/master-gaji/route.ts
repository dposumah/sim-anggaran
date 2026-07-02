export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const masterGajis = await prisma.masterGaji.findMany({
      orderBy: [
        { status: 'asc' },
        { golongan: 'asc' },
        { masaKerja: 'asc' }
      ]
    });
    return NextResponse.json(masterGajis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { status, golongan, masaKerja, gajiPokok } = data;

    if (!status || !golongan || masaKerja === undefined || gajiPokok === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const newData = await prisma.masterGaji.upsert({
      where: {
        status_golongan_masaKerja: {
          status,
          golongan,
          masaKerja: parseInt(masaKerja, 10)
        }
      },
      update: {
        gajiPokok: parseFloat(gajiPokok)
      },
      create: {
        status,
        golongan,
        masaKerja: parseInt(masaKerja, 10),
        gajiPokok: parseFloat(gajiPokok)
      }
    });

    return NextResponse.json(newData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.masterGaji.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
