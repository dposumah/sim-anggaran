import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sumberDanas = await prisma.sumberDana.findMany({
      orderBy: { kode: 'asc' }
    });
    return NextResponse.json(sumberDanas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { kode, nama } = await request.json();
    if (!kode || !nama) return NextResponse.json({ error: 'Kode dan Nama wajib diisi' }, { status: 400 });

    const newSd = await prisma.sumberDana.create({
      data: { kode, nama }
    });
    return NextResponse.json(newSd);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, kode, nama } = await request.json();
    if (!id || !kode || !nama) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    const updatedSd = await prisma.sumberDana.update({
      where: { id },
      data: { kode, nama }
    });
    return NextResponse.json(updatedSd);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    await prisma.sumberDana.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
