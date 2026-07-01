import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { uraianBarang: { contains: search, mode: 'insensitive' } },
        { spesifikasi: { contains: search, mode: 'insensitive' } },
        { kodeBarang: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (type) {
      where.tipe = type;
    }

    const [items, total] = await Promise.all([
      prisma.sshSbu.findMany({
        where,
        skip,
        take: limit,
        orderBy: { kodeBarang: 'asc' }
      }),
      prisma.sshSbu.count({ where })
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
