import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const sk = await prisma.subKegiatan.findMany({
      where: { kode: '1.01.01.2.06.0001' },
      include: {
        kegiatan: {
          include: {
            program: {
              include: { skpd: true }
            }
          }
        },
        rincianBelanjas: true
      }
    });

    const allSubKeg = await prisma.subKegiatan.findMany({
      where: { kode: { contains: '1.01.01.2.06' } },
      select: { kode: true, nama: true }
    });

    return NextResponse.json({ 
      success: true, 
      exactMatch: sk,
      partialMatches: allSubKeg
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
