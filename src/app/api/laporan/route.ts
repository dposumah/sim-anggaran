export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Get all programs for Dinas Pendidikan
    const programs = await prisma.program.findMany({
      where: {
        skpd: {
          tahunId: tahunData.id,
          nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
        }
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        skpd: {
          select: {
            namaSubUnit: true
          }
        }
      },
      orderBy: { kode: 'asc' }
    });

    // Get Rincian to aggregate Pagu
    const rincian = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatan: {
          kegiatan: {
            program: {
              skpd: {
                tahunId: tahunData.id,
                nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
              }
            }
          }
        }
      },
      select: {
        pagu: true,
        subKegiatan: {
          select: {
            kegiatan: {
              select: {
                programId: true
              }
            }
          }
        }
      }
    });

    const paguByProgram: Record<number, number> = {};
    rincian.forEach(r => {
      const pid = r.subKegiatan.kegiatan.programId;
      paguByProgram[pid] = (paguByProgram[pid] || 0) + Number(r.pagu);
    });

    const laporanData = programs.map(p => ({
      skpd: p.skpd.namaSubUnit,
      kodeProgram: p.kode,
      namaProgram: p.nama,
      totalPagu: paguByProgram[p.id] || 0
    }));

    return NextResponse.json(laporanData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

