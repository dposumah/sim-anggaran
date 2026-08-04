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
      },
      include: {
        rekening: true,
        subKegiatan: true
      }
    });

    let paguIndukTotal = 0; let paguPerubahanTotal = 0; let realisasiTotal = 0;
    
    // Gaji
    let gajiPnsInduk = 0; let gajiPnsPerubahan = 0; let gajiPnsRealisasi = 0;
    let gajiPppkInduk = 0; let gajiPppkPerubahan = 0; let gajiPppkRealisasi = 0;
    let pppkParuhWaktuInduk = 0; let pppkParuhWaktuPerubahan = 0; let pppkParuhWaktuRealisasi = 0;
    
    // TPP & TPG
    let tppInduk = 0; let tppPerubahan = 0; let tppRealisasi = 0;
    let tpgInduk = 0; let tpgPerubahan = 0; let tpgRealisasi = 0;
    
    // BOSP
    let bospSdInduk = 0; let bospSdPerubahan = 0; let bospSdRealisasi = 0;
    let bospSmpInduk = 0; let bospSmpPerubahan = 0; let bospSmpRealisasi = 0;
    let bospPaudInduk = 0; let bospPaudPerubahan = 0; let bospPaudRealisasi = 0;
    let bospKesetaraanInduk = 0; let bospKesetaraanPerubahan = 0; let bospKesetaraanRealisasi = 0;
    
    const dauTree: any = {};
    const sumDanaMap: Record<string, { induk: number, perubahan: number }> = {};
    const paketMap: Record<string, { nama: string, induk: number, perubahan: number }> = {};
    const subKegRealisasiMap: Record<number, { nama: string, kode: string, paguInduk: number, paguPerubahan: number, realisasi: number }> = {};

    rincianList.forEach(r => {
      const skpd = r.subKegiatan.kegiatan.program.skpd;
      const prog = r.subKegiatan.kegiatan.program;
      const keg = r.subKegiatan.kegiatan;
      const sub = r.subKegiatan;
      const rek = r.rekening;

      const nilaiInduk = r.paguInduk ? Number(r.paguInduk) : 0;
      const nilaiPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : nilaiInduk;

      paguIndukTotal += nilaiInduk;
      paguPerubahanTotal += nilaiPerubahan;

      if (!subKegRealisasiMap[sub.id]) {
        subKegRealisasiMap[sub.id] = { nama: sub.nama, kode: sub.kode, paguInduk: 0, paguPerubahan: 0, realisasi: 0 };
      }
      subKegRealisasiMap[sub.id].paguInduk += nilaiInduk;
      subKegRealisasiMap[sub.id].paguPerubahan += nilaiPerubahan;

      // PNS & PPPK
      if ((sub.nama || '').toUpperCase().includes('GAJI DAN TUNJANGAN ASN')) {
        if ((rek.nama || '').toUpperCase().includes('PNS')) {
          gajiPnsInduk += nilaiInduk;
          gajiPnsPerubahan += nilaiPerubahan;
        } else if ((rek.nama || '').toUpperCase().includes('PPPK')) {
          gajiPppkInduk += nilaiInduk;
          gajiPppkPerubahan += nilaiPerubahan;
        }
      }

      // Paruh Waktu
      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('PARUH WAKTU')) {
        pppkParuhWaktuInduk += nilaiInduk;
        pppkParuhWaktuPerubahan += nilaiPerubahan;
      }

      // TPP & TPG
      if ((rek.nama || '').toUpperCase().includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) {
        tppInduk += nilaiInduk;
        tppPerubahan += nilaiPerubahan;
      }
      if ((rek.nama || '').toUpperCase().includes('TUNJANGAN PROFESI GURU')) {
        tpgInduk += nilaiInduk;
        tpgPerubahan += nilaiPerubahan;
      }

      // BOSP
      const subUpper = (sub.nama || '').toUpperCase();
      if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH DASAR')) {
        bospSdInduk += nilaiInduk;
        bospSdPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH MENENGAH PERTAMA')) {
        bospSmpInduk += nilaiInduk;
        bospSmpPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP PAUD')) {
        bospPaudInduk += nilaiInduk;
        bospPaudPerubahan += nilaiPerubahan;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP SEKOLAH NONFORMAL/KESETARAAN')) {
        bospKesetaraanInduk += nilaiInduk;
        bospKesetaraanPerubahan += nilaiPerubahan;
      }

      // Uraian Paket
      if (r.namaPaket) {
        if (!paketMap[r.namaPaket]) paketMap[r.namaPaket] = { nama: r.namaPaket, induk: 0, perubahan: 0 };
        paketMap[r.namaPaket].induk += nilaiInduk;
        paketMap[r.namaPaket].perubahan += nilaiPerubahan;
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

    realisasiList.forEach(r => {
      const sub = r.subKegiatan;
      const rek = r.rekening;
      const nilai = Number(r.nominal || 0);

      realisasiTotal += nilai;

      if (subKegRealisasiMap[sub.id]) {
        subKegRealisasiMap[sub.id].realisasi += nilai;
      }

      // PNS & PPPK
      if ((sub.nama || '').toUpperCase().includes('GAJI DAN TUNJANGAN ASN')) {
        if ((rek.nama || '').toUpperCase().includes('PNS')) {
          gajiPnsRealisasi += nilai;
        } else if ((rek.nama || '').toUpperCase().includes('PPPK')) {
          gajiPppkRealisasi += nilai;
        }
      }

      // Paruh Waktu
      if ((sub.nama || '').toUpperCase().includes('PENYEDIAAN JASA PELAYANAN UMUM KANTOR') && (rek.nama || '').toUpperCase().includes('PARUH WAKTU')) {
        pppkParuhWaktuRealisasi += nilai;
      }

      // TPP & TPG
      if ((rek.nama || '').toUpperCase().includes('TAMBAHAN PENGHASILAN BERDASARKAN BEBAN KERJA PNS')) {
        tppRealisasi += nilai;
      }
      if ((rek.nama || '').toUpperCase().includes('TUNJANGAN PROFESI GURU')) {
        tpgRealisasi += nilai;
      }

      // BOSP
      const subUpper = (sub.nama || '').toUpperCase();
      if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH DASAR')) {
        bospSdRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOS SEKOLAH MENENGAH PERTAMA')) {
        bospSmpRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP PAUD')) {
        bospPaudRealisasi += nilai;
      } else if (subUpper.includes('PENGELOLAAN DANA BOP SEKOLAH NONFORMAL/KESETARAAN')) {
        bospKesetaraanRealisasi += nilai;
      }
    });

    // Generate HTML for Excel
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin-bottom: 30px; }
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
          <tr><td colspan="5" class="title">LAPORAN EKSEKUTIF PERBANDINGAN ANGGARAN (INDUK VS PERUBAHAN)</td></tr>
          <tr><td colspan="5" class="subtitle">TAHUN ANGGARAN ${tahun}</td></tr>
          <tr><td colspan="5" style="border:none;"></td></tr>

          <!-- BAGIAN 1: RINGKASAN GLOBAL -->
          <tr><td colspan="5" class="section">I. RINGKASAN PAGU DAN REALISASI</td></tr>
          <tr>
            <th>Uraian</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih Pagu (Rp)</th>
            <th>Realisasi (Rp)</th>
          </tr>
          <tr>
            <td>Total Keseluruhan</td>
            <td class="num">${paguIndukTotal}</td>
            <td class="num">${paguPerubahanTotal}</td>
            <td class="num">${paguPerubahanTotal - paguIndukTotal}</td>
            <td class="num">${realisasiTotal}</td>
          </tr>
          <tr>
            <td>Total Gaji PNS</td>
            <td class="num">${gajiPnsInduk}</td>
            <td class="num">${gajiPnsPerubahan}</td>
            <td class="num">${gajiPnsPerubahan - gajiPnsInduk}</td>
            <td class="num">${gajiPnsRealisasi}</td>
          </tr>
          <tr>
            <td>Total Gaji PPPK</td>
            <td class="num">${gajiPppkInduk}</td>
            <td class="num">${gajiPppkPerubahan}</td>
            <td class="num">${gajiPppkPerubahan - gajiPppkInduk}</td>
            <td class="num">${gajiPppkRealisasi}</td>
          </tr>
          <tr>
            <td>Total Gaji PPPK Paruh Waktu</td>
            <td class="num">${pppkParuhWaktuInduk}</td>
            <td class="num">${pppkParuhWaktuPerubahan}</td>
            <td class="num">${pppkParuhWaktuPerubahan - pppkParuhWaktuInduk}</td>
            <td class="num">${pppkParuhWaktuRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu TPP (Beban Kerja PNS)</td>
            <td class="num">${tppInduk}</td>
            <td class="num">${tppPerubahan}</td>
            <td class="num">${tppPerubahan - tppInduk}</td>
            <td class="num">${tppRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu TPG (Tunjangan Profesi Guru)</td>
            <td class="num">${tpgInduk}</td>
            <td class="num">${tpgPerubahan}</td>
            <td class="num">${tpgPerubahan - tpgInduk}</td>
            <td class="num">${tpgRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu BOSP SD</td>
            <td class="num">${bospSdInduk}</td>
            <td class="num">${bospSdPerubahan}</td>
            <td class="num">${bospSdPerubahan - bospSdInduk}</td>
            <td class="num">${bospSdRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu BOSP SMP</td>
            <td class="num">${bospSmpInduk}</td>
            <td class="num">${bospSmpPerubahan}</td>
            <td class="num">${bospSmpPerubahan - bospSmpInduk}</td>
            <td class="num">${bospSmpRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu BOSP PAUD</td>
            <td class="num">${bospPaudInduk}</td>
            <td class="num">${bospPaudPerubahan}</td>
            <td class="num">${bospPaudPerubahan - bospPaudInduk}</td>
            <td class="num">${bospPaudRealisasi}</td>
          </tr>
          <tr>
            <td>Pagu BOSP Kesetaraan</td>
            <td class="num">${bospKesetaraanInduk}</td>
            <td class="num">${bospKesetaraanPerubahan}</td>
            <td class="num">${bospKesetaraanPerubahan - bospKesetaraanInduk}</td>
            <td class="num">${bospKesetaraanRealisasi}</td>
          </tr>
          <tr><td colspan="5" style="border:none;"></td></tr>

          <!-- BAGIAN 2: PER SUMBER DANA -->
          <tr><td colspan="5" class="section">II. PAGU PER SUMBER DANA</td></tr>
          <tr>
            <th>Sumber Dana</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
            <th></th>
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
            <td></td>
          </tr>
      `;
    });

    htmlContent += `
          <tr><td colspan="5" style="border:none;"></td></tr>
          <!-- BAGIAN 3: BREAKDOWN KHUSUS DAU PENDIDIKAN -->
          <tr><td colspan="5" class="section">III. BREAKDOWN KHUSUS "DAU YANG DITENTUKAN PENGGUNAANNYA BIDANG PENDIDIKAN"</td></tr>
          <tr>
            <th>Hierarki (SKPD / Program / Kegiatan / Sub Kegiatan / Rekening / Paket)</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
            <th></th>
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
          <td class="header-1"></td>
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
            <td class="header-2"></td>
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
              <td class="header-3"></td>
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
                <td></td>
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
                  <td class="header-4"></td>
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
                    <td></td>
                  </tr>
                `;
              });
            });
          });
        });
      });
    });

    htmlContent += `
          <tr><td colspan="5" style="border:none;"></td></tr>
          
          <!-- BAGIAN 4: SEMUA URAIAN PAKET -->
          <tr><td colspan="5" class="section">IV. REKAPITULASI SELURUH URAIAN PAKET</td></tr>
          <tr>
            <th>Uraian Paket</th>
            <th>Pagu Induk (Rp)</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Selisih (Rp)</th>
            <th></th>
          </tr>
    `;

    Object.values(paketMap).sort((a, b) => b.perubahan - a.perubahan).forEach(p => {
      htmlContent += `
          <tr>
            <td>${p.nama}</td>
            <td class="num">${p.induk}</td>
            <td class="num">${p.perubahan}</td>
            <td class="num">${p.perubahan - p.induk}</td>
            <td></td>
          </tr>
      `;
    });

    htmlContent += `
          <tr><td colspan="5" style="border:none;"></td></tr>
          
          <!-- BAGIAN 5: REALISASI PER SUB KEGIATAN -->
          <tr><td colspan="5" class="section">V. REALISASI PER SUB KEGIATAN</td></tr>
          <tr>
            <th>Kode Sub Kegiatan</th>
            <th>Nama Sub Kegiatan</th>
            <th>Pagu Perubahan (Rp)</th>
            <th>Total Realisasi (Rp)</th>
            <th>Sisa Anggaran (Rp)</th>
          </tr>
    `;

    Object.values(subKegRealisasiMap).sort((a, b) => b.paguPerubahan - a.paguPerubahan).forEach(s => {
      htmlContent += `
          <tr>
            <td>${s.kode}</td>
            <td>${s.nama}</td>
            <td class="num">${s.paguPerubahan}</td>
            <td class="num">${s.realisasi}</td>
            <td class="num">${s.paguPerubahan - s.realisasi}</td>
          </tr>
      `;
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
