import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const skpd = await prisma.skpd.findFirst({
      where: {
        nama: {
          contains: 'PENDIDIKAN DAN KEBUDAYAAN DAERAH',
          mode: 'insensitive'
        }
      },
      include: {
        tahun: true
      }
    });

    if (!skpd) {
      return NextResponse.json({ error: 'SKPD Pendidikan tidak ditemukan di database sistem.' }, { status: 404 });
    }

    // Ambil semua sumber dana sebagai master list
    const sumberDanas = await prisma.sumberDana.findMany({
      orderBy: { kode: 'asc' }
    });

    // Ambil pagu yang sudah diset untuk SKPD dan Tahun ini
    const paguList = await prisma.paguSumberDana.findMany({
      where: { skpdId: skpd.id, tahunId: skpd.tahunId }
    });

    // Ambil semua rincian belanja untuk SKPD ini
    const rincianList = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatan: {
          kegiatan: {
            program: {
              skpdId: skpd.id
            }
          }
        }
      },
      select: {
        sumberDanaId: true,
        paguInduk: true,
        paguPerubahan: true,
        namaPaket: true,
        subKegiatan: {
          select: {
            kode: true,
            nama: true
          }
        }
      }
    });

    const rincianTotals = new Map<number, number>();
    const rincianBreakdowns = new Map<number, any[]>();

    rincianList.forEach(r => {
      const val = r.paguPerubahan !== null ? Number(r.paguPerubahan) : Number(r.paguInduk);
      if (val === 0) return; // Skip zero pagu for breakdown to keep payload smaller

      rincianTotals.set(r.sumberDanaId, (rincianTotals.get(r.sumberDanaId) || 0) + val);
      
      const breakdownItem = {
        subKegiatan: r.subKegiatan.nama,
        kodeSubKegiatan: r.subKegiatan.kode,
        rincian: r.namaPaket,
        pagu: val
      };

      if (!rincianBreakdowns.has(r.sumberDanaId)) {
        rincianBreakdowns.set(r.sumberDanaId, []);
      }
      rincianBreakdowns.get(r.sumberDanaId)!.push(breakdownItem);
    });

    // Gabungkan
    const result = sumberDanas.map(sd => {
      const pagu = paguList.find(p => p.sumberDanaId === sd.id);
      const paguInduk = pagu ? Number(pagu.paguInduk) : 0;
      return {
        sumberDanaId: sd.id,
        kode: sd.kode,
        nama: sd.nama,
        paguInduk: paguInduk,
        excelAmount: rincianTotals.get(sd.id) || 0,
        breakdown: rincianBreakdowns.get(sd.id) || []
      };
    });

    return NextResponse.json({
      skpd: {
        id: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        tahunId: skpd.tahunId
      },
      data: result
    });
  } catch (error: unknown) {
    console.error('Error fetching data for control-sumber-dana:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahunId, sumberDanaId, paguInduk } = body;

    if (!skpdId || !tahunId || !sumberDanaId || paguInduk === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const pagu = await prisma.paguSumberDana.upsert({
      where: {
        skpdId_sumberDanaId_tahunId: {
          skpdId: Number(skpdId),
          sumberDanaId: Number(sumberDanaId),
          tahunId: Number(tahunId)
        }
      },
      update: {
        paguInduk: Number(paguInduk)
      },
      create: {
        skpdId: Number(skpdId),
        sumberDanaId: Number(sumberDanaId),
        tahunId: Number(tahunId),
        paguInduk: Number(paguInduk)
      }
    });

    return NextResponse.json(pagu);
  } catch (error: unknown) {
    console.error('Error saving pagu sumber dana:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
