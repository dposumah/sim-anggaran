export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subKegiatanId, sumberDanaId, isLocked } = body;

    if (!subKegiatanId || !sumberDanaId || isLocked === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    let lockedAmount = 0;

    // If locking, we need to calculate the current total pagu for this sumber dana
    if (isLocked) {
      const result = await prisma.rincianBelanja.aggregate({
        _sum: { pagu: true },
        where: { subKegiatanId, sumberDanaId }
      });
      lockedAmount = Number(result._sum.pagu || 0);
    }

    // Update the relation
    const sdRelation = await prisma.subKegiatanSumberDana.upsert({
      where: {
        subKegiatanId_sumberDanaId: {
          subKegiatanId,
          sumberDanaId
        }
      },
      update: {
        isLocked,
        lockedAmount: isLocked ? lockedAmount : 0
      },
      create: {
        subKegiatanId,
        sumberDanaId,
        isLocked,
        lockedAmount: isLocked ? lockedAmount : 0
      }
    });

    return NextResponse.json(sdRelation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

