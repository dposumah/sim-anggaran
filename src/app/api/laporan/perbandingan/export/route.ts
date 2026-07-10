import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      return new NextResponse('Tahun anggaran tidak ditemukan', { status: 404 });
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
        sumberDana: true,
        rekening: true,
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
    });

    let paguIndukTotal = 0;
    let paguPerubahanTotal = 0;
    let gajiAsnInduk = 0;
    let gajiAsnPerubahan = 0;
    let gajiPppkParuhWaktuInduk = 0;
    let gajiPppkParuhWaktuPerubahan = 0;
    let honorPelayananUmumInduk = 0;
    let honorPelayananUmumPerubahan = 0;

    const dauTree: any = {};
    const sumDanaMap: Record<string, { induk: number, perubahan: number }> = {};

    rincianList.forEach(r => {
      const skpd = r.subKegiatan.kegiatan.program.skpd;
      const prog = r.subKegiatan.kegiatan.program;
      const keg = r.subKegiatan.kegiatan;
      const sub = r.subKegiatan;
      const rek = r.rekening;

      const nilaiInduk = Number(r.pagu) || 0;
      const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;

      paguIndukTotal += nilaiInduk;
      paguPerubahanTotal += nilaiPerubahan;

      const isParuhWaktu = (rek.nama || '').toUpperCase().includes('PARUH WAKTU');
      if (isParuhWaktu) {
        gajiPppkParuhWaktuInduk += nilaiInduk;
        gajiPppkParuhWaktuPerubahan += nilaiPerubahan;
      }

      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN GAJI DAN TUNJANGAN ASN') && !isParuhWaktu) {
        gajiAsnInduk += nilaiInduk;
        gajiAsnPerubahan += nilaiPerubahan;
      }

      if ((sub.nama || '').toUpperCase().includes('JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('HONORARIUM')) {
        honorPelayananUmumInduk += nilaiInduk;
        honorPelayananUmumPerubahan += nilaiPerubahan;
      }

      const sdNama = r.sumberDana.nama;
      if (!sumDanaMap[sdNama]) sumDanaMap[sdNama] = { induk: 0, perubahan: 0 };
      sumDanaMap[sdNama].induk += nilaiInduk;
      sumDanaMap[sdNama].perubahan += nilaiPerubahan;

      if ((sdNama || '').toUpperCase().includes('DAU YANG DITENTUKAN PENGGUNAANNYA BIDANG PENDIDIKAN')) {
        const skpdKey = `${skpd.kode} - ${skpd.nama}`;
        const progKey = `${prog.kode}|${prog.nama}`;
        const kegKey = `${keg.kode}|${keg.nama}`;
        const subKey = `${sub.kode}|${sub.nama}`;
        const rekKey = `${rek.kode}|${rek.nama}`;
        const paketKey = r.namaPaket;

        if (!dauTree[skpdKey]) dauTree[skpdKey] = { induk: 0, perubahan: 0, progs: {} };
        dauTree[skpdKey].induk += nilaiInduk;
        dauTree[skpdKey].perubahan += nilaiPerubahan;

        const skpdNode = dauTree[skpdKey];
        if (!skpdNode.progs[progKey]) skpdNode.progs[progKey] = { induk: 0, perubahan: 0, kegs: {} };
        skpdNode.progs[progKey].induk += nilaiInduk;
        skpdNode.progs[progKey].perubahan += nilaiPerubahan;

        const progNode = skpdNode.progs[progKey];
        if (!progNode.kegs[kegKey]) progNode.kegs[kegKey] = { induk: 0, perubahan: 0, subs: {} };
        progNode.kegs[kegKey].induk += nilaiInduk;
        progNode.kegs[kegKey].perubahan += nilaiPerubahan;

        const kegNode = progNode.kegs[kegKey];
        if (!kegNode.subs[subKey]) kegNode.subs[subKey] = { induk: 0, perubahan: 0, reks: {} };
        kegNode.subs[subKey].induk += nilaiInduk;
        kegNode.subs[subKey].perubahan += nilaiPerubahan;

        const subNode = kegNode.subs[subKey];
        if (!subNode.reks[rekKey]) subNode.reks[rekKey] = { induk: 0, perubahan: 0, pakets: {} };
        subNode.reks[rekKey].induk += nilaiInduk;
        subNode.reks[rekKey].perubahan += nilaiPerubahan;

        const rekNode = subNode.reks[rekKey];
        if (!rekNode.pakets[paketKey]) rekNode.pakets[paketKey] = { induk: 0, perubahan: 0 };
        rekNode.pakets[paketKey].induk += nilaiInduk;
        rekNode.pakets[paketKey].perubahan += nilaiPerubahan;
      }
    });

    // Generate HTML for Excel
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .header-1 { background-color: #e2efda; font-weight: bold; }
          .header-2 { background-color: #fff2cc; font-weight: bold; }
          .header-3 { background-color: #fce4d6; font-weight: bold; }
          .header-4 { background-color: #e6e6fa; font-weight: bold; font-style: italic; }
          .title { font-size: 16px; font-weight: bold; text-align: center; border: none !important; }
          .subtitle { font-size: 12px; font-weight: bold; text-align: center; border: none !important; }
          .num { text-align: right; }
          .section { background-color: #4472c4; color: white; font-weight: bold; font-size: 14px; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="4" class="title">LAPORAN EKSEKUTIF PERBANDINGAN ANGGARAN (INDUK VS PERUBAHAN)</td></tr>
          <tr><td colspan="4" class="subtitle">TAHUN ANGGARAN ${tahun}</td></tr>
          <tr><td colspan="4" style="border:none;"></td></tr>

          <!-- BAGIAN 1: RINGKASAN GLOBAL -->
          <tr><td colspan="4" class="section">I. RINGKASAN PAGU</td></tr>
          <tr>
            <th>Uraian</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
          </tr>
          <tr>
            <td>Total Pagu Keseluruhan</td>
            <td class="num">${paguIndukTotal}</td>
            <td class="num">${paguPerubahanTotal}</td>
            <td class="num">${paguPerubahanTotal - paguIndukTotal}</td>
          </tr>
          <tr>
            <td>Gaji PNS dan PPPK</td>
            <td class="num">${gajiAsnInduk}</td>
            <td class="num">${gajiAsnPerubahan}</td>
            <td class="num">${gajiAsnPerubahan - gajiAsnInduk}</td>
          </tr>
          <tr>
            <td>Gaji PPPK Paruh Waktu</td>
            <td class="num">${gajiPppkParuhWaktuInduk}</td>
            <td class="num">${gajiPppkParuhWaktuPerubahan}</td>
            <td class="num">${gajiPppkParuhWaktuPerubahan - gajiPppkParuhWaktuInduk}</td>
          </tr>
          <tr>
            <td>Honor Jasa Pelayanan Umum Kantor</td>
            <td class="num">${honorPelayananUmumInduk}</td>
            <td class="num">${honorPelayananUmumPerubahan}</td>
            <td class="num">${honorPelayananUmumPerubahan - honorPelayananUmumInduk}</td>
          </tr>
          <tr><td colspan="4" style="border:none;"></td></tr>

          <!-- BAGIAN 2: PER SUMBER DANA -->
          <tr><td colspan="4" class="section">II. PAGU PER SUMBER DANA</td></tr>
          <tr>
            <th>Sumber Dana</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
          </tr>
    `;

    Object.keys(sumDanaMap).sort((a, b) => sumDanaMap[b].induk - sumDanaMap[a].induk).forEach(sd => {
      const val = sumDanaMap[sd];
      htmlContent += `
          <tr>
            <td>${sd}</td>
            <td class="num">${val.induk}</td>
            <td class="num">${val.perubahan}</td>
            <td class="num">${val.perubahan - val.induk}</td>
          </tr>
      `;
    });

    htmlContent += `
          <tr><td colspan="4" style="border:none;"></td></tr>
          <!-- BAGIAN 3: BREAKDOWN KHUSUS DAU PENDIDIKAN -->
          <tr><td colspan="4" class="section">III. BREAKDOWN KHUSUS "DAU YANG DITENTUKAN PENGGUNAANNYA BIDANG PENDIDIKAN"</td></tr>
          <tr>
            <th>Hierarki (SKPD / Program / Kegiatan / Sub Kegiatan / Rekening / Paket)</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
          </tr>
    `;

    // Render tree recursively
    Object.keys(dauTree).forEach(skpdKey => {
      const skpd = dauTree[skpdKey];
      htmlContent += `
        <tr>
          <td class="header-1">${skpdKey}</td>
          <td class="header-1 num">${skpd.induk}</td>
          <td class="header-1 num">${skpd.perubahan}</td>
          <td class="header-1 num">${skpd.perubahan - skpd.induk}</td>
        </tr>
      `;

      Object.keys(skpd.progs).forEach(progKey => {
        const prog = skpd.progs[progKey];
        htmlContent += `
          <tr>
            <td class="header-2" style="padding-left: 20px;">Program: ${progKey}</td>
            <td class="header-2 num">${prog.induk}</td>
            <td class="header-2 num">${prog.perubahan}</td>
            <td class="header-2 num">${prog.perubahan - prog.induk}</td>
          </tr>
        `;

        Object.keys(prog.kegs).forEach(kegKey => {
          const keg = prog.kegs[kegKey];
          htmlContent += `
            <tr>
              <td class="header-3" style="padding-left: 40px;">Kegiatan: ${kegKey}</td>
              <td class="header-3 num">${keg.induk}</td>
              <td class="header-3 num">${keg.perubahan}</td>
              <td class="header-3 num">${keg.perubahan - keg.induk}</td>
            </tr>
          `;

          Object.keys(keg.subs).forEach(subKey => {
            const sub = keg.subs[subKey];
            htmlContent += `
              <tr>
                <td style="padding-left: 60px; font-weight: bold;">Sub Kegiatan: ${subKey}</td>
                <td class="num" style="font-weight: bold;">${sub.induk}</td>
                <td class="num" style="font-weight: bold;">${sub.perubahan}</td>
                <td class="num" style="font-weight: bold;">${sub.perubahan - sub.induk}</td>
              </tr>
            `;

            Object.keys(sub.reks).forEach(rekKey => {
              const rek = sub.reks[rekKey];
              htmlContent += `
                <tr>
                  <td class="header-4" style="padding-left: 80px;">Rekening: ${rekKey}</td>
                  <td class="header-4 num">${rek.induk}</td>
                  <td class="header-4 num">${rek.perubahan}</td>
                  <td class="header-4 num">${rek.perubahan - rek.induk}</td>
                </tr>
              `;

              Object.keys(rek.pakets).forEach(paketKey => {
                const paket = rek.pakets[paketKey];
                htmlContent += `
                  <tr>
                    <td style="padding-left: 100px;">- ${paketKey}</td>
                    <td class="num">${paket.induk}</td>
                    <td class="num">${paket.perubahan}</td>
                    <td class="num">${paket.perubahan - paket.induk}</td>
                  </tr>
                `;
              });
            });
          });
        });
      });
    });

    htmlContent += `
        </table>
      </body>
      </html>
    `;

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.ms-excel');
    headers.set('Content-Disposition', `attachment; filename="Laporan_Eksekutif_Anggaran_${tahun}.xls"`);

    return new NextResponse(htmlContent, {
      status: 200,
      headers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
