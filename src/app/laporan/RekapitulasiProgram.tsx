'use client';

import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, LayoutGrid } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useYear } from '@/contexts/YearContext';

export default function RekapitulasiProgram() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tahun } = useYear();
  const [exportModeSd, setExportModeSd] = useState<'induk' | 'perubahan' | 'keduanya'>('perubahan');
  const [exportingDetail, setExportingDetail] = useState(false);

  useEffect(() => {
    fetch(`/api/laporan?tahun=${tahun}`)
      .then(res => res.json())
      .then(resData => {
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          setData([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [tahun]);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const exportToExcel = () => {
    if (data.length === 0) return;
    
    const wsData = data.map((row, index) => ({
      'No': index + 1,
      'SKPD / Sub Unit': row.skpd,
      'Kode Program': row.kodeProgram,
      'Nama Program': row.namaProgram,
      'Total Pagu (Rp)': Number(row.totalPagu)
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 60 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Program');
    XLSX.writeFile(wb, 'Laporan_Rekap_Anggaran_Program.xlsx');
  };

  const exportToExcelDetail = async () => {
    setExportingDetail(true);
    try {
      const res = await fetch(`/api/laporan/export-rekening?tahun=${tahun}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Rincian_Rekening_${tahun}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor detail rekening');
    } finally {
      setExportingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Rekapitulasi Program
        </h2>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none"
            value={exportModeSd}
            onChange={(e) => setExportModeSd(e.target.value as any)}
          >
            <option value="induk">Pagu Induk</option>
            <option value="perubahan">Pagu Perubahan</option>
            <option value="keduanya">Induk & Perubahan</option>
          </select>
          <button 
            onClick={() => window.open(`/api/laporan/export-sumber-dana?tahun=${tahun}&mode=${exportModeSd}`, '_blank')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Rincian Sumber Dana
          </button>
          <button 
            onClick={exportToExcel}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Rekap Program
          </button>
          <button 
            onClick={exportToExcelDetail}
            disabled={loading || exportingDetail}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingDetail ? 'Mengekspor...' : 'Ekspor Level Rekening'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Belum ada data untuk tahun ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-gray-600">No</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-600">Kode Program</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-600">Nama Program</th>
                  <th className="px-6 py-4 text-right font-bold text-gray-600">Total Pagu (Perubahan)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600 bg-gray-50/50">{row.kodeProgram}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{row.namaProgram}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">
                      {formatRupiah(row.totalPagu)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-gray-800">Total Keseluruhan</td>
                  <td className="px-6 py-4 text-right text-primary text-base">
                    {formatRupiah(data.reduce((acc, curr) => acc + Number(curr.totalPagu), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
