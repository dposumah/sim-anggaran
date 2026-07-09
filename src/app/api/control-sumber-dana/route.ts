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
      }
    });

    if (!skpd) {
      return NextResponse.json({ error: 'SKPD Pendidikan tidak ditemukan di database sistem.' }, { status: 404 });
    }

    // Ambil seluruh data Sub Kegiatan di bawah SKPD ini beserta rincian belanjanya
    const subKegiatans = await prisma.subKegiatan.findMany({
      where: {
        kegiatan: {
          program: {
            skpdId: skpd.id
          }
        }
      },
      include: {
        rincianBelanjas: {
          include: {
            sumberDana: true
          }
        }
      }
    });

    // Format response untuk memudahkan agregasi
    const result = subKegiatans.map(sub => {
      // Group RincianBelanja berdasarkan sumberDana
      const sumberDanaGroups: Record<string, any> = {};
      
      sub.rincianBelanjas.forEach(rb => {
        const sdKode = rb.sumberDana.kode;
        if (!sumberDanaGroups[sdKode]) {
          sumberDanaGroups[sdKode] = {
            kode: sdKode,
            nama: rb.sumberDana.nama,
            totalPagu: 0
          };
        }
        sumberDanaGroups[sdKode].totalPagu += Number(rb.pagu || 0);
      });

      return {
        kode: sub.kode,
        nama: sub.nama,
        sumberDanas: Object.values(sumberDanaGroups)
      };
    });

    return NextResponse.json({
      skpd: {
        kode: skpd.kode,
        nama: skpd.nama
      },
      data: result
    });
  } catch (error: unknown) {
    console.error('Error fetching data for control-sumber-dana:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
