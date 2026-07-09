export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({ where: { tahun } });
    if (!tahunData) return new NextResponse('Tahun tidak ditemukan', { status: 404 });

    const rincianList = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatan: { kegiatan: { program: { skpd: { tahunId: tahunData.id } } } }
      },
      include: {
        sumberDana: true,
        subKegiatan: {
          include: {
            kegiatan: {
              include: {
                program: {
                  include: { skpd: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { subKegiatan: { kegiatan: { program: { skpdId: 'asc' } } } },
        { subKegiatan: { kegiatan: { program: { kode: 'asc' } } } },
        { subKegiatan: { kegiatan: { kode: 'asc' } } },
        { subKegiatan: { kode: 'asc' } },
        { id: 'asc' }
      ]
    });

    // Grouping
    // SKPD -> Program -> Kegiatan -> SubKeg -> Paket -> Sumber Dana
    const tree: any = {};

    rincianList.forEach(r => {
      const skpdKey = r.subKegiatan.kegiatan.program.skpd.kode + ' - ' + r.subKegiatan.kegiatan.program.skpd.nama;
      const progKey = r.subKegiatan.kegiatan.program.kode + '|' + r.subKegiatan.kegiatan.program.nama;
      const kegKey = r.subKegiatan.kegiatan.kode + '|' + r.subKegiatan.kegiatan.nama;
      const subKey = r.subKegiatan.kode + '|' + r.subKegiatan.nama;
      const paketKey = r.namaPaket;
      
      const totalNilai = Number(r.pagu);

      if (!tree[skpdKey]) tree[skpdKey] = { total: 0, progs: {} };
      tree[skpdKey].total += totalNilai;

      if (!tree[skpdKey].progs[progKey]) tree[skpdKey].progs[progKey] = { total: 0, kegs: {} };
      tree[skpdKey].progs[progKey].total += totalNilai;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey]) tree[skpdKey].progs[progKey].kegs[kegKey] = { total: 0, subs: {} };
      tree[skpdKey].progs[progKey].kegs[kegKey].total += totalNilai;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey]) tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey] = { total: 0, pakets: {} };
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].total += totalNilai;

      if (!tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].pakets[paketKey]) tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].pakets[paketKey] = { total: 0, sds: [] };
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].pakets[paketKey].total += totalNilai;
      
      tree[skpdKey].progs[progKey].kegs[kegKey].subs[subKey].pakets[paketKey].sds.push({
        nama: r.sumberDana.nama,
        nilai: totalNilai
      });
    });

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .bg-gray { background-color: #f9fafb; }
        .bg-prog { background-color: #e5e7eb; }
        .bg-keg { background-color: #f3f4f6; }
      </style>
    </head>
    <body>
      <h2>Laporan Rekapitulasi Penggunaan Sumber Dana Tahun ${tahun}</h2>
      <br/>
    `;

    for (const skpdKey in tree) {
      html += `
        <h3>SKPD: ${skpdKey}</h3>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Uraian (Program / Kegiatan / Sub Kegiatan / Paket)</th>
              <th>Sumber Dana</th>
              <th>Total Pagu (Rp)</th>
            </tr>
          </thead>
          <tbody>
      `;

      const skpd = tree[skpdKey];
      
      for (const progKey in skpd.progs) {
        const prog = skpd.progs[progKey];
        const [pKode, pNama] = progKey.split('|');
        html += `<tr class="bg-prog bold"><td>${pKode}</td><td>${pNama}</td><td></td><td class="right">${prog.total}</td></tr>`;

        for (const kegKey in prog.kegs) {
          const keg = prog.kegs[kegKey];
          const [kKode, kNama] = kegKey.split('|');
          html += `<tr class="bg-keg bold"><td>${kKode}</td><td style="padding-left:15px;">${kNama}</td><td></td><td class="right">${keg.total}</td></tr>`;

          for (const subKey in keg.subs) {
            const sub = keg.subs[subKey];
            const [sKode, sNama] = subKey.split('|');
            html += `<tr class="bold"><td>${sKode}</td><td style="padding-left:30px;">${sNama}</td><td></td><td class="right">${sub.total}</td></tr>`;

            for (const paketKey in sub.pakets) {
              const paket = sub.pakets[paketKey];
              html += `<tr><td></td><td style="padding-left:45px;">- ${paketKey}</td><td></td><td class="right bold">${paket.total}</td></tr>`;

              paket.sds.forEach((sd: any) => {
                html += `<tr><td></td><td></td><td style="padding-left:60px;">${sd.nama}</td><td class="right">${sd.nilai}</td></tr>`;
              });
            }
          }
        }
      }

      html += `
          <tr class="bg-prog bold">
            <td colspan="3" class="right">TOTAL SKPD</td>
            <td class="right">${skpd.total}</td>
          </tr>
        </tbody></table><br/><br/>
      `;
    }

    html += `</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="Rekap_Sumber_Dana_${tahun}.xls"`,
      },
    });

  } catch (error: any) {
    console.error(error);
    return new NextResponse(error.message, { status: 500 });
  }
}
