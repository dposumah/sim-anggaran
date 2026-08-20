'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Calculator, Info, Loader2 } from 'lucide-react';

interface KontrolGajiItem {
  kategori: string;
  target: number;
  excel: number;
}

interface KontrolGajiSkpd {
  skpdId: number;
  kode: string;
  nama: string;
  items: KontrolGajiItem[];
}

export default function KontrolGajiPage() {
  const [data, setData] = useState<KontrolGajiSkpd[]>([]);
  const [tahunId, setTahunId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleTargetChange = (skpdId: number, kategori: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^0-9-]+/g, ""));
    if (isNaN(numValue)) return;
    
    setData(prev => prev.map(skpd => 
      skpd.skpdId === skpdId 
        ? {
            ...skpd,
            items: skpd.items.map(i => i.kategori === kategori ? { ...i, target: numValue } : i)
          }
        : skpd
    ));
  };

  const saveAllTargets = async (skpd: KontrolGajiSkpd) => {
    if (!tahunId) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/kontrol-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skpdId: skpd.skpdId,
          tahunId: tahunId,
          items: skpd.items.map(i => ({ kategori: i.kategori, target: i.target }))
        })
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      setSuccessMsg(`Semua Pagu Kontrol untuk ${skpd.nama} berhasil disimpan.`);
    } catch (err) {
      setError(`Gagal menyimpan Pagu Kontrol untuk ${skpd.nama}.`);
    } finally {
      setIsSaving(false);
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
            <Calculator className="w-6 h-6 text-primary" /> Kontrol Anggaran (Pagu vs Rincian)
          </h1>
          <p className="text-sm text-secondary">Input Pagu Target Manual untuk dibandingkan dengan Hasil Upload Excel (APBD).</p>
        </div>
        <button
          onClick={fetchSystemData}
          disabled={isLoading || isSaving}
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

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 text-center text-secondary">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Memuat data...
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 text-center text-secondary">
           Tidak ada data SKPD (Pendidikan) yang ditemukan.
        </div>
      ) : (
        data.map((skpd) => (
          <div key={skpd.skpdId} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{skpd.nama}</h3>
                <p className="text-sm text-gray-500">{skpd.kode}</p>
              </div>
              <button
                onClick={() => saveAllTargets(skpd)}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Semua Pagu
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 border-r w-1/3">Kategori</th>
                    <th className="px-4 py-3 bg-blue-50/50">Target Pagu (Manual)</th>
                    <th className="px-4 py-3 bg-slate-50/50 text-right">APBD Excel (Perubahan)</th>
                    <th className="px-4 py-3 bg-slate-50/50 text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {skpd.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 border-r font-medium text-gray-900">
                        {item.kategori}
                      </td>
                      <td className="px-4 py-3 bg-blue-50/10">
                        <input
                          type="text"
                          value={item.target === 0 ? '' : new Intl.NumberFormat('id-ID').format(item.target)}
                          onChange={(e) => handleTargetChange(skpd.skpdId, item.kategori, e.target.value)}
                          placeholder="Rp 0"
                          className="w-full text-right rounded border border-gray-300 px-2 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {formatCurrency(item.excel)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderDiffBadge(item.target, item.excel)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
