export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunStr = searchParams.get('tahun') || '2026';
    const tahun = parseInt(tahunStr, 10);

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Fetch computed data from the existing API to guarantee identical logic
    const res = await fetch(`${baseUrl}/api/kebutuhan-gaji?tahun=${tahun}`);
    if (!res.ok) throw new Error('Gagal mengambil data perhitungan gaji');
    
    const data = await res.json();
    if (!data || data.length === 0) {
      return new NextResponse('Tidak ada data.', { status: 404 });
    }

    const uraianList = [
      { label: 'Belanja Gaji Pokok', key: 'gapok' },
      { label: 'Belanja Tunjangan Keluarga', key: 'tunjKeluarga' },
      { label: 'Belanja Tunjangan Jabatan', key: 'tunjJabatan' },
      { label: 'Belanja Tunjangan Fungsional', key: 'tunjFungsional' },
      { label: 'Belanja Tunjangan Fungsional Umum', key: 'tunjFungsionalUmum' },
      { label: 'Belanja Tunjangan Beras', key: 'tunjBeras' },
      { label: 'Belanja Tunjangan PPh/Tunjangan Khusus', key: 'tunjPph' },
      { label: 'Belanja Pembulatan Gaji', key: 'pembulatan' },
      { label: 'Belanja Iuran Jaminan Kesehatan', key: 'bpjsKes' },
      { label: 'Belanja Iuran Jaminan Kecelakaan Kerja', key: 'jkk' },
      { label: 'Belanja Iuran Jaminan Kematian', key: 'jkm' },
      { label: 'Belanja Tambahan Penghasilan Pegawai (TPP)', key: 'tpp' },
    ];

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
        .bg-blue { background-color: #e0f2fe; }
        .bg-green { background-color: #dcfce7; }
        .bg-red { background-color: #fee2e2; }
      </style>
    </head>
    <body>
      <h2>Rincian Kebutuhan Gaji dan Tunjangan Tahun Anggaran ${tahun}</h2>
      <br/>
    `;

    data.forEach((skpd: any) => {
      html += `
        <h3>SKPD: ${skpd.nama}</h3>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Uraian Belanja</th>
              <th rowspan="2">Jumlah Bulan</th>
              <th colspan="12">Rincian Per Bulan (Bulan 1 - 12)</th>
              <th rowspan="2">Gaji 13</th>
              <th rowspan="2">Gaji 14</th>
              <th rowspan="2">Kebutuhan Setahun</th>
              <th rowspan="2" class="bg-green">Realisasi</th>
              <th rowspan="2" class="bg-red">Sisa Anggaran</th>
            </tr>
            <tr>
              <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Mei</th><th>Jun</th>
              <th>Jul</th><th>Agu</th><th>Sep</th><th>Okt</th><th>Nov</th><th>Des</th>
            </tr>
          </thead>
          <tbody>
      `;

      const g13Keys = (skpd.pengaturan.komponenGaji13 || '').split(',');
      const g14Keys = (skpd.pengaturan.komponenGaji14 || '').split(',');

      uraianList.forEach(u => {
        const perBulan = (skpd.pns[u.key] || 0) + (skpd.pppk[u.key] || 0) + (skpd.honorer[u.key] || 0);
        
        const hasG13 = g13Keys.includes(u.key);
        const hasG14 = g14Keys.includes(u.key);
        const g13Val = hasG13 ? perBulan : 0;
        const g14Val = hasG14 ? perBulan : 0;
        
        const multiplier = skpd.multipliers[u.key] || 12;
        const total = (skpd.pns[u.key] || 0) * multiplier + (skpd.pppk[u.key] || 0) * multiplier + (skpd.honorer[u.key] || 0) * multiplier;
        const realisasi = (skpd.pns.realisasi[u.key] || 0) + (skpd.pppk.realisasi[u.key] || 0) + (skpd.honorer.realisasi[u.key] || 0);
        const sisa = total - realisasi;

        html += `
          <tr>
            <td>${u.label}</td>
            <td class="right">${multiplier}</td>
        `;

        for(let i=1; i<=12; i++) {
          html += `<td class="right">${perBulan}</td>`;
        }

        html += `
            <td class="right">${g13Val}</td>
            <td class="right">${g14Val}</td>
            <td class="right bold">${total}</td>
            <td class="right bg-green">${realisasi}</td>
            <td class="right bg-red">${sisa}</td>
          </tr>
        `;
      });

      // Terusan
      const totalTerusan = skpd.pns.terusan + skpd.pppk.terusan + skpd.honorer.terusan;
      const rTerusan = (skpd.pns.realisasi.terusan||0) + (skpd.pppk.realisasi.terusan||0) + (skpd.honorer.realisasi.terusan||0);
      const perBulanTerusan = totalTerusan / (skpd.pengaturan.gajiTerusanBulan || 1); // just rough estimate for monthly display
      html += `
          <tr>
            <td>Belanja Gaji Terusan (${skpd.pengaturan.gajiTerusanBulan} bln)</td>
            <td class="right">${skpd.pengaturan.gajiTerusanBulan}</td>
      `;
      for(let i=1; i<=12; i++) { html += `<td class="right">${i <= skpd.pengaturan.gajiTerusanBulan ? perBulanTerusan : 0}</td>`; }
      html += `
            <td class="right">0</td><td class="right">0</td>
            <td class="right bold">${totalTerusan}</td>
            <td class="right bg-green">${rTerusan}</td>
            <td class="right bg-red">${totalTerusan - rTerusan}</td>
          </tr>
      `;

      // Acress
      const totalAcress = skpd.pns.acress + skpd.pppk.acress + skpd.honorer.acress;
      const rAcress = (skpd.pns.realisasi.acress||0) + (skpd.pppk.realisasi.acress||0) + (skpd.honorer.realisasi.acress||0);
      html += `
          <tr>
            <td>Cadangan / Acress (${skpd.pengaturan.acressPersen}%)</td>
            <td class="right">-</td>
            <td colspan="14">Dihitung dari total setahun (sebagai cadangan)</td>
            <td class="right bold">${totalAcress}</td>
            <td class="right bg-green">${rAcress}</td>
            <td class="right bg-red">${totalAcress - rAcress}</td>
          </tr>
      `;

      // Grand Total
      html += `
          <tr class="bg-blue">
            <td colspan="16" class="bold">GRAND TOTAL KEBUTUHAN</td>
            <td class="right bold">${skpd.grandTotal}</td>
            <td class="right bold bg-green">${skpd.realisasiTotal}</td>
            <td class="right bold bg-red">${skpd.grandTotal - skpd.realisasiTotal}</td>
          </tr>
      `;

      html += `</tbody></table><br/><br/>`;
    });

    html += `</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="Rincian_Gaji_${tahun}.xls"`,
      },
    });

  } catch (error: any) {
    console.error(error);
    return new NextResponse(error.message, { status: 500 });
  }
}
