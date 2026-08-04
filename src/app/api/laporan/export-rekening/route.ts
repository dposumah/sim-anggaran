import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    const rincianList = await prisma.rincianBelanja.findMany({
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
      include: {
        rekening: true,
        sumberDana: true,
        subKegiatan: {
          include: {
            kegiatan: {
              include: {
                program: true
              }
            }
          }
        }
      },
      orderBy: [
        { subKegiatan: { kegiatan: { program: { kode: 'asc' } } } },
        { subKegiatan: { kegiatan: { kode: 'asc' } } },
        { subKegiatan: { kode: 'asc' } },
        { rekening: { kode: 'asc' } },
      ]
    });

    const exportData = rincianList.map((r, i) => ({
      'No': i + 1,
      'Kode Program': r.subKegiatan.kegiatan.program.kode,
      'Nama Program': r.subKegiatan.kegiatan.program.nama,
      'Kode Kegiatan': r.subKegiatan.kegiatan.kode,
      'Nama Kegiatan': r.subKegiatan.kegiatan.nama,
      'Kode Sub Kegiatan': r.subKegiatan.kode,
      'Nama Sub Kegiatan': r.subKegiatan.nama,
      'Kode Rekening': r.rekening.kode,
      'Nama Rekening': r.rekening.nama,
      'Sumber Dana': r.sumberDana.nama,
      'Uraian Paket': r.namaPaket || '-',
      'Pagu Induk': Number(r.paguInduk),
      'Pagu Perubahan': r.paguPerubahan ? Number(r.paguPerubahan) : Number(r.paguInduk)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rincian_Rekening');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Laporan_Rincian_Rekening_${tahun}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
