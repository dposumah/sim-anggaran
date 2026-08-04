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

    const realisasiList = await prisma.realisasiBelanja.findMany({
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
      }
    });

    const subRekRealisasiMap: Record<string, number> = {};
    realisasiList.forEach(r => {
      const key = `${r.subKegiatanId}-${r.rekeningId}`;
      subRekRealisasiMap[key] = (subRekRealisasiMap[key] || 0) + Number(r.nominal || 0);
    });

    const subRekPaguMap: Record<string, number> = {};
    rincianList.forEach(r => {
      const key = `${r.subKegiatanId}-${r.rekeningId}`;
      const pagu = r.paguPerubahan !== null ? Number(r.paguPerubahan) : Number(r.paguInduk || 0);
      subRekPaguMap[key] = (subRekPaguMap[key] || 0) + pagu;
    });

    const groupedBySubKegiatan = rincianList.reduce((acc, r) => {
      const skId = r.subKegiatan.id;
      if (!acc[skId]) {
        acc[skId] = {
          subKegiatan: r.subKegiatan,
          rincian: []
        };
      }
      acc[skId].rincian.push(r);
      return acc;
    }, {} as Record<string, any>);

    const wb = XLSX.utils.book_new();

    Object.values(groupedBySubKegiatan).forEach(group => {
      const wsData: any[][] = [];
      const sk = group.subKegiatan;
      const prog = sk.kegiatan.program;
      const keg = sk.kegiatan;
      const rincian = group.rincian;

      let totalPaguInduk = 0;
      let totalPaguPerubahan = 0;
      
      rincian.forEach((r: any) => {
        totalPaguInduk += Number(r.paguInduk || 0);
        totalPaguPerubahan += Number(r.paguPerubahan !== null ? r.paguPerubahan : (r.paguInduk || 0));
      });

      wsData.push(['Kode Program', prog.kode]);
      wsData.push(['Nama Program', prog.nama]);
      wsData.push(['Kode Kegiatan', keg.kode]);
      wsData.push(['Nama Kegiatan', keg.nama]);
      wsData.push(['Kode Sub Kegiatan', sk.kode]);
      wsData.push(['Nama Sub Kegiatan', sk.nama]);
      wsData.push(['Pagu Sub Kegiatan', totalPaguPerubahan]);
      wsData.push([]);
      
      wsData.push(['Nama Rekening', 'Sumber Dana', 'Uraian Paket', 'Pagu Induk', 'Pagu Perubahan', 'Realisasi']);
      
      rincian.forEach((r: any) => {
        const key = `${r.subKegiatanId}-${r.rekeningId}`;
        const totalPagu = subRekPaguMap[key] || 1;
        const totalReal = subRekRealisasiMap[key] || 0;
        const rowPaguPerubahan = Number(r.paguPerubahan !== null ? r.paguPerubahan : (r.paguInduk || 0));
        const propReal = (rowPaguPerubahan / totalPagu) * totalReal;

        wsData.push([
          r.rekening.nama,
          r.sumberDana.nama,
          r.namaPaket || '-',
          Number(r.paguInduk || 0),
          rowPaguPerubahan,
          propReal
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 45 }, // Kolom A
        { wch: 35 }, // Kolom B
        { wch: 30 }, // Kolom C
        { wch: 18 }, // Kolom D
        { wch: 18 }, // Kolom E
        { wch: 18 }  // Kolom F (Realisasi)
      ];

      let sheetName = sk.kode || 'Sheet';
      if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
      
      // Ensure unique sheet name if there happen to be duplicates somehow
      let counter = 1;
      let finalSheetName = sheetName;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 28)}_${counter}`;
        counter++;
      }
      
      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });
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
