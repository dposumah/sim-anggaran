'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Calculator, Info } from 'lucide-react';

interface KontrolGajiItem {
  skpdId: number;
  kode: string;
  nama: string;
  targetPns: number;
  targetPppk: number;
  excelPnsInduk: number;
  excelPnsPerubahan: number;
  excelPppkInduk: number;
  excelPppkPerubahan: number;
  isSaving?: boolean;
}

export default function KontrolGajiPage() {
  const [data, setData] = useState<KontrolGajiItem[]>([]);
  const [tahunId, setTahunId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/kontrol-gaji');
      if (!response.ok) throw new Error('Gagal mengambil data sistem');
      const resData = await response.json();
      
      setData(resData.data);
      setTahunId(resData.tahun?.id || null);
    } catch (err: unknown) {
      console.error(err);
      setError('Gagal mengambil data dari database sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleTargetChange = (skpdId: number, field: 'targetPns' | 'targetPppk', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numValue)) return;
    
    setData(prev => prev.map(item => 
      item.skpdId === skpdId ? { ...item, [field]: numValue } : item
    ));
  };

  const saveTarget = async (item: KontrolGajiItem) => {
    if (!tahunId) return;
    
    setData(prev => prev.map(d => d.skpdId === item.skpdId ? { ...d, isSaving: true } : d));
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/kontrol-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skpdId: item.skpdId,
          tahunId: tahunId,
          targetPns: item.targetPns,
          targetPppk: item.targetPppk
        })
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      setSuccessMsg(`Pagu Gaji untuk ${item.nama} berhasil disimpan.`);
    } catch (err) {
      setError(`Gagal menyimpan Pagu Gaji untuk ${item.nama}.`);
    } finally {
      setData(prev => prev.map(d => d.skpdId === item.skpdId ? { ...d, isSaving: false } : d));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const renderDiffBadge = (target: number, excel: number) => {
    if (target === 0) return <span className="text-gray-400 italic">Belum diset</span>;
    const diff = excel - target;
    
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Balance
        </span>
      );
    }
    
    const isOver = diff > 0;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${isOver ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
        <AlertCircle className="w-3 h-3" />
        {isOver ? '+' : ''}{formatCurrency(diff)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Kontrol Gaji (PNS & PPPK)
          </h1>
          <p className="text-sm text-secondary">Bandingkan Input Pagu Target Manual vs Hasil Upload Excel (APBD).</p>
        </div>
        <button
          onClick={fetchSystemData}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Info className="w-4 h-4" />
          )}
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium">Terjadi Kesalahan</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-3 border border-green-100">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 min-w-[250px] border-r">SKPD</th>
                <th className="px-4 py-3 bg-blue-50/50 text-center border-r" colSpan={3}>PNS</th>
                <th className="px-4 py-3 bg-emerald-50/50 text-center" colSpan={3}>PPPK</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
              <tr className="text-xs">
                <th className="px-4 py-2 border-r"></th>
                {/* PNS */}
                <th className="px-4 py-2 bg-blue-50/50">Target Pagu (Manual)</th>
                <th className="px-4 py-2 bg-blue-50/50 text-right">APBD Excel (Perubahan)</th>
                <th className="px-4 py-2 bg-blue-50/50 text-center border-r">Selisih</th>
                
                {/* PPPK */}
                <th className="px-4 py-2 bg-emerald-50/50">Target Pagu (Manual)</th>
                <th className="px-4 py-2 bg-emerald-50/50 text-right">APBD Excel (Perubahan)</th>
                <th className="px-4 py-2 bg-emerald-50/50 text-center">Selisih</th>
                <th className="px-4 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                    Tidak ada data SKPD (Pendidikan) yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.skpdId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 border-r">
                      <div className="font-medium text-gray-900">{item.nama}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.kode}</div>
                    </td>
                    
                    {/* PNS */}
                    <td className="px-4 py-3 bg-blue-50/10">
                      <input
                        type="text"
                        value={item.targetPns === 0 ? '' : new Intl.NumberFormat('id-ID').format(item.targetPns)}
                        onChange={(e) => handleTargetChange(item.skpdId, 'targetPns', e.target.value)}
                        placeholder="Rp 0"
                        className="w-full text-right rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 bg-blue-50/10 text-right font-medium text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5" title="Pagu Induk">I: {formatCurrency(item.excelPnsInduk)}</div>
                      {formatCurrency(item.excelPnsPerubahan)}
                    </td>
                    <td className="px-4 py-3 bg-blue-50/10 text-center border-r">
                      {renderDiffBadge(item.targetPns, item.excelPnsPerubahan)}
                    </td>

                    {/* PPPK */}
                    <td className="px-4 py-3 bg-emerald-50/10">
                      <input
                        type="text"
                        value={item.targetPppk === 0 ? '' : new Intl.NumberFormat('id-ID').format(item.targetPppk)}
                        onChange={(e) => handleTargetChange(item.skpdId, 'targetPppk', e.target.value)}
                        placeholder="Rp 0"
                        className="w-full text-right rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 bg-emerald-50/10 text-right font-medium text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5" title="Pagu Induk">I: {formatCurrency(item.excelPppkInduk)}</div>
                      {formatCurrency(item.excelPppkPerubahan)}
                    </td>
                    <td className="px-4 py-3 bg-emerald-50/10 text-center">
                      {renderDiffBadge(item.targetPppk, item.excelPppkPerubahan)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => saveTarget(item)}
                        disabled={item.isSaving}
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                        title="Simpan Pagu Target"
                      >
                        {item.isSaving ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
