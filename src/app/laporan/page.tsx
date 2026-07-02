'use client';

import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useYear } from '@/contexts/YearContext';

export default function LaporanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tahun } = useYear();

  useEffect(() => {
    fetch(`/api/laporan?tahun=${tahun}`)
      .then(res => res.json())
      .then(resData => {
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          console.error(resData.error);
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
    
    // Prepare data for Excel
    const wsData = data.map((row, index) => ({
      'No': index + 1,
      'SKPD / Sub Unit': row.skpd,
      'Kode Program': row.kodeProgram,
      'Nama Program': row.namaProgram,
      'Total Pagu (Rp)': Number(row.totalPagu)
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Auto-size columns slightly
    ws['!cols'] = [
      { wch: 5 },
      { wch: 40 },
      { wch: 20 },
      { wch: 60 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Program');
    XLSX.writeFile(wb, 'Laporan_Rekap_Anggaran_Program.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan & Rekapitulasi</h1>
          <p className="text-sm text-secondary">Ringkasan total pagu anggaran per program.</p>
        </div>
        
        <button 
          onClick={exportToExcel}
          disabled={loading || data.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Export ke Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Memuat laporan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKPD / Sub Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Program</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Program</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pagu</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {row.skpd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.kodeProgram}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {row.namaProgram}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatRupiah(row.totalPagu)}
                    </td>
                  </tr>
                ))}
                
                {data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Tidak ada data laporan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
