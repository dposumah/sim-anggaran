'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useYear } from '@/contexts/YearContext';
import { FileText, Download, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function LaporanPerbandingan() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'program' | 'subkegiatan' | 'rekening' | 'sumberdana'>('program');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/laporan/summary?tahun=${tahun}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tahun]);

  const formatCurrency = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const getPercentage = (base: number, newValue: number) => {
    if (base === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - base) / base) * 100;
  };

  const renderPercentage = (percent: number) => {
    if (percent === 0) return <span className="text-gray-500">0%</span>;
    if (percent > 0) return <span className="text-blue-600">+{percent.toFixed(2)}%</span>;
    return <span className="text-red-600">{percent.toFixed(2)}%</span>;
  };

  const exportToExcel = () => {
    if (!data) return;
    
    const wb = XLSX.utils.book_new();
    
    const exportData = (items: any[]) => items.map(item => ({
      'Nama': item.nama,
      'Pagu Induk': item.induk,
      'Pagu RKPD': item.rkpd,
      'Pagu Perubahan': item.perubahan,
      'Selisih (Perubahan vs Induk)': item.perubahan - item.induk,
      '% (Perubahan vs Induk)': getPercentage(item.induk, item.perubahan).toFixed(2) + '%',
      'Selisih (Perubahan vs RKPD)': item.perubahan - item.rkpd,
      '% (Perubahan vs RKPD)': getPercentage(item.rkpd, item.perubahan).toFixed(2) + '%'
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData(data.byProgram)), 'Program & Kegiatan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData(data.bySubKegiatan)), 'Sub Kegiatan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData(data.byRekening)), 'Jenis Belanja');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData(data.bySumberDana)), 'Sumber Dana');

    XLSX.writeFile(wb, `Laporan_Summary_Perbandingan_${tahun}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data) return;
    
    const doc = new jsPDF('landscape');
    
    const formatDataForPdf = (items: any[]) => {
      return items.map(item => [
        item.nama,
        formatCurrency(item.induk),
        formatCurrency(item.rkpd),
        formatCurrency(item.perubahan),
        formatCurrency(item.perubahan - item.induk),
        getPercentage(item.induk, item.perubahan).toFixed(2) + '%',
        formatCurrency(item.perubahan - item.rkpd),
        getPercentage(item.rkpd, item.perubahan).toFixed(2) + '%'
      ]);
    };

    const head = [['Nama', 'Pagu Induk', 'Pagu RKPD', 'Pagu Perubahan', 'Selisih (vs Induk)', '%', 'Selisih (vs RKPD)', '%']];

    // Page 1: Program
    doc.setFontSize(14);
    doc.text(`Laporan Summary Perbandingan - Program & Kegiatan (${tahun})`, 14, 15);
    (doc as any).autoTable({ startY: 20, head, body: formatDataForPdf(data.byProgram), styles: { fontSize: 8 } });

    // Page 2: Sub Kegiatan
    doc.addPage();
    doc.text(`Laporan Summary Perbandingan - Sub Kegiatan (${tahun})`, 14, 15);
    (doc as any).autoTable({ startY: 20, head, body: formatDataForPdf(data.bySubKegiatan), styles: { fontSize: 8 } });

    // Page 3: Rekening
    doc.addPage();
    doc.text(`Laporan Summary Perbandingan - Jenis Belanja (${tahun})`, 14, 15);
    (doc as any).autoTable({ startY: 20, head, body: formatDataForPdf(data.byRekening), styles: { fontSize: 8 } });

    // Page 4: Sumber Dana
    doc.addPage();
    doc.text(`Laporan Summary Perbandingan - Sumber Dana (${tahun})`, 14, 15);
    (doc as any).autoTable({ startY: 20, head, body: formatDataForPdf(data.bySumberDana), styles: { fontSize: 8 } });

    doc.save(`Laporan_Summary_Perbandingan_${tahun}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!data || data.error) {
    return <div className="text-red-500 p-6 bg-white rounded-xl shadow-sm">Error loading data...</div>;
  }

  const tabs = [
    { id: 'program', label: 'Program & Kegiatan' },
    { id: 'subkegiatan', label: 'Sub Kegiatan' },
    { id: 'rekening', label: 'Jenis Belanja (Rekening)' },
    { id: 'sumberdana', label: 'Sumber Dana' }
  ] as const;

  const currentData = 
    activeTab === 'program' ? data.byProgram :
    activeTab === 'subkegiatan' ? data.bySubKegiatan :
    activeTab === 'rekening' ? data.byRekening :
    data.bySumberDana;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">Nama</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Pagu Induk</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Pagu RKPD</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Pagu Perubahan</th>
                <th className="px-4 py-4 text-right whitespace-nowrap border-l border-gray-200 bg-gray-50/50">Selisih (vs Induk)</th>
                <th className="px-4 py-4 text-right whitespace-nowrap bg-gray-50/50">%</th>
                <th className="px-4 py-4 text-right whitespace-nowrap border-l border-gray-200 bg-gray-50/50">Selisih (vs RKPD)</th>
                <th className="px-4 py-4 text-right whitespace-nowrap bg-gray-50/50">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map((item: any, idx: number) => {
                const diffInduk = item.perubahan - item.induk;
                const diffRkpd = item.perubahan - item.rkpd;
                
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-md truncate" title={item.nama}>
                      {item.nama}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.induk)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.rkpd)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(item.perubahan)}</td>
                    
                    <td className="px-4 py-3 text-right border-l border-gray-100">
                      <span className={diffInduk > 0 ? 'text-blue-600' : diffInduk < 0 ? 'text-red-600' : 'text-gray-400'}>
                        {diffInduk > 0 ? '+' : ''}{formatCurrency(diffInduk)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {renderPercentage(getPercentage(item.induk, item.perubahan))}
                    </td>
                    
                    <td className="px-4 py-3 text-right border-l border-gray-100">
                      <span className={diffRkpd > 0 ? 'text-blue-600' : diffRkpd < 0 ? 'text-red-600' : 'text-gray-400'}>
                        {diffRkpd > 0 ? '+' : ''}{formatCurrency(diffRkpd)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {renderPercentage(getPercentage(item.rkpd, item.perubahan))}
                    </td>
                  </tr>
                );
              })}
              
              {currentData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Tidak ada data untuk tahun ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
