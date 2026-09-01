export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skpdId = searchParams.get('skpdId');
  
  if (!skpdId) return NextResponse.json({ subKegiatans: [], rekenings: [] });

  try {
    const subKegiatans = await prisma.subKegiatan.findMany({
      where: {
        kegiatan: {
          program: {
            skpdId: parseInt(skpdId)
          }
        }
      },
      select: {
        id: true,
        kode: true,
        nama: true
      },
      orderBy: { kode: 'asc' }
    });

    const rekenings = await prisma.rekening.findMany({
      select: {
        id: true,
        kode: true,
        nama: true
      },
      orderBy: { kode: 'asc' }
    });

    return NextResponse.json({ subKegiatans, rekenings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
