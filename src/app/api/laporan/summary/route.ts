import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun');
    
    if (!tahun) return NextResponse.json({ error: 'Tahun diperlukan' }, { status: 400 });

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun: parseInt(tahun, 10) } });
    if (!tahunData) return NextResponse.json({ error: 'Tahun tidak ditemukan' }, { status: 404 });

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
        sumberDana: true,
        rekening: true,
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
    });

    const byProgram = new Map();
    const bySubKegiatan = new Map();
    const byRekening = new Map();
    const bySumberDana = new Map();

    rincianList.forEach(r => {
      const pInduk = Number(r.paguInduk || 0);
      const pRkpd = Number(r.paguRkpd || 0);
      const pPerubahan = Number(r.paguPerubahan !== null ? r.paguPerubahan : pInduk);

      // 1. Program & Kegiatan
      const progKey = `${r.subKegiatan.kegiatan.program.kode} - ${r.subKegiatan.kegiatan.program.nama} / ${r.subKegiatan.kegiatan.kode} - ${r.subKegiatan.kegiatan.nama}`;
      if (!byProgram.has(progKey)) byProgram.set(progKey, { nama: progKey, induk: 0, rkpd: 0, perubahan: 0 });
      const prog = byProgram.get(progKey);
      prog.induk += pInduk; prog.rkpd += pRkpd; prog.perubahan += pPerubahan;

      // 2. Sub Kegiatan
      const subKey = `${r.subKegiatan.kode} - ${r.subKegiatan.nama}`;
      if (!bySubKegiatan.has(subKey)) bySubKegiatan.set(subKey, { nama: subKey, induk: 0, rkpd: 0, perubahan: 0 });
      const sub = bySubKegiatan.get(subKey);
      sub.induk += pInduk; sub.rkpd += pRkpd; sub.perubahan += pPerubahan;

      // 3. Rekening
      if (r.rekening) {
        const rekKey = `${r.rekening.kode} - ${r.rekening.nama}`;
        if (!byRekening.has(rekKey)) byRekening.set(rekKey, { nama: rekKey, induk: 0, rkpd: 0, perubahan: 0 });
        const rek = byRekening.get(rekKey);
        rek.induk += pInduk; rek.rkpd += pRkpd; rek.perubahan += pPerubahan;
      }

      // 4. Sumber Dana
      if (r.sumberDana) {
        const sdKey = `${r.sumberDana.kode} - ${r.sumberDana.nama}`;
        if (!bySumberDana.has(sdKey)) bySumberDana.set(sdKey, { nama: sdKey, induk: 0, rkpd: 0, perubahan: 0 });
        const sd = bySumberDana.get(sdKey);
        sd.induk += pInduk; sd.rkpd += pRkpd; sd.perubahan += pPerubahan;
      }
    });

    return NextResponse.json({
      byProgram: Array.from(byProgram.values()).sort((a,b) => a.nama.localeCompare(b.nama)),
      bySubKegiatan: Array.from(bySubKegiatan.values()).sort((a,b) => a.nama.localeCompare(b.nama)),
      byRekening: Array.from(byRekening.values()).sort((a,b) => a.nama.localeCompare(b.nama)),
      bySumberDana: Array.from(bySumberDana.values()).sort((a,b) => a.nama.localeCompare(b.nama))
    });
  } catch (err: any) {
    console.error('Error fetching summary report:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
