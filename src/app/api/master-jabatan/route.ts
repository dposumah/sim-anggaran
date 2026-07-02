export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const jabatans = await prisma.jabatan.findMany({
      orderBy: { nama: 'asc' }
    });
    return NextResponse.json(jabatans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nama, besaranTpp } = data;

    if (!nama) {
      return NextResponse.json({ error: 'Nama jabatan wajib diisi' }, { status: 400 });
    }

    const newJabatan = await prisma.jabatan.create({
      data: {
        nama,
        besaranTpp: besaranTpp || 0
      }
    });

    return NextResponse.json(newJabatan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data = await request.json();
    const updated = await prisma.jabatan.update({
      where: { id: parseInt(id, 10) },
      data: {
        nama: data.nama,
        besaranTpp: data.besaranTpp
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.jabatan.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
