'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Wallet, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface CategoryData {
  kategori: string;
  target: number;
  induk: number;
  perubahan: number;
  breakdown: { label: string; induk: number; perubahan: number }[];
}

interface SkpdData {
  skpdId: number;
  kode: string;
  nama: string;
  categories: CategoryData[];
}

export default function KontrolHonorPage() {
  const [data, setData] = useState<SkpdData[]>([]);
  const [tahunId, setTahunId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [expandedSkpd, setExpandedSkpd] = useState<number[]>([]);
  
  const [modalData, setModalData] = useState<{
    title: string;
    skpdNama: string;
    breakdown: { label: string; induk: number; perubahan: number }[];
  } | null>(null);

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/kontrol-honor');
      if (!response.ok) throw new Error('Gagal mengambil data sistem');
      const resData = await response.json();
      
      setData(resData.data);
      setTahunId(resData.tahun?.id || null);
      if (resData.data.length > 0) {
        setExpandedSkpd([resData.data[0].skpdId]); // auto expand first
      }
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
    
    setData(prev => prev.map(skpd => {
      if (skpd.skpdId !== skpdId) return skpd;
      return {
        ...skpd,
        categories: skpd.categories.map(cat => 
          cat.kategori === kategori ? { ...cat, target: numValue } : cat
        )
      };
    }));
  };

  const saveTarget = async (skpd: SkpdData) => {
    if (!tahunId) return;
    
    setSavingId(skpd.skpdId);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        skpdId: skpd.skpdId,
        tahunId: tahunId,
        categories: skpd.categories.map(c => ({ kategori: c.kategori, target: c.target }))
      };

      const response = await fetch('/api/kontrol-honor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      setSuccessMsg(`Target Honor Jasa untuk ${skpd.nama} berhasil disimpan.`);
    } catch (err) {
      setError(`Gagal menyimpan Target Honor Jasa untuk ${skpd.nama}.`);
    } finally {
      setSavingId(null);
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

  const toggleSkpd = (skpdId: number) => {
    setExpandedSkpd(prev => 
      prev.includes(skpdId) ? prev.filter(id => id !== skpdId) : [...prev, skpdId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Kontrol Honor Jasa
          </h1>
          <p className="text-sm text-secondary">Bandingkan Input Target Jasa Pelayanan Umum vs Excel (APBD).</p>
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

      {isLoading ? (
        <div className="flex justify-center p-12 text-secondary">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
          Tidak ada data SKPD (Pendidikan) yang memiliki kegiatan Jasa Pelayanan Umum.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(skpd => (
            <div key={skpd.skpdId} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <button 
                onClick={() => toggleSkpd(skpd.skpdId)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-border"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">{skpd.nama}</h2>
                  <p className="text-sm text-gray-500">{skpd.kode}</p>
                </div>
                {expandedSkpd.includes(skpd.skpdId) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              
              {expandedSkpd.includes(skpd.skpdId) && (
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Kategori Honor Jasa</th>
                          <th className="px-6 py-3 font-semibold w-1/4">Target Pagu (Manual)</th>
                          <th className="px-6 py-3 font-semibold text-right">APBD Excel (Perubahan)</th>
                          <th className="px-6 py-3 font-semibold text-center">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {skpd.categories.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-800">{cat.kategori}</td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={cat.target === 0 ? '' : new Intl.NumberFormat('id-ID').format(cat.target)}
                                onChange={(e) => handleTargetChange(skpd.skpdId, cat.kategori, e.target.value)}
                                placeholder="Rp 0"
                                className="w-full text-right rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-xs text-gray-400 mb-1" title="Pagu Induk">I: {formatCurrency(cat.induk)}</div>
                              <button
                                onClick={() => setModalData({
                                  title: `Rincian: ${cat.kategori}`,
                                  skpdNama: skpd.nama,
                                  breakdown: cat.breakdown
                                })}
                                className="text-blue-700 font-semibold hover:text-blue-900 hover:underline focus:outline-none"
                              >
                                {formatCurrency(cat.perubahan)}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {renderDiffBadge(cat.target, cat.perubahan)}
                            </td>
                          </tr>
                        ))}
                        {skpd.categories.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                              Tidak ada rincian jasa yang ditemukan di Excel.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        {(() => {
                          const totalTarget = skpd.categories.reduce((sum, cat) => sum + cat.target, 0);
                          const totalExcel = skpd.categories.reduce((sum, cat) => sum + cat.perubahan, 0);
                          const totalSelisih = totalExcel - totalTarget;
                          
                          return (
                            <tr>
                              <td className="px-6 py-4 font-bold text-gray-900 text-right uppercase text-xs">Total Keseluruhan</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-right">
                                {totalTarget > 0 ? formatCurrency(totalTarget) : '-'}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-right">
                                {totalExcel > 0 ? formatCurrency(totalExcel) : '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {totalTarget > 0 && (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${totalSelisih === 0 ? 'bg-green-100 text-green-800' : totalSelisih > 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {totalSelisih === 0 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {totalSelisih > 0 ? '+' : ''}{totalSelisih === 0 ? 'Balance' : formatCurrency(totalSelisih)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => saveTarget(skpd)}
                      disabled={savingId === skpd.skpdId}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {savingId === skpd.skpdId ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan Target {skpd.nama.split(' ')[1] || 'SKPD'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Breakdown */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{modalData.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{modalData.skpdNama}</p>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {modalData.breakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Tidak ada rincian paket ditemukan di kategori ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nama Rekening (Paket)</th>
                        <th className="px-4 py-3 font-semibold text-right">APBD Induk</th>
                        <th className="px-4 py-3 font-semibold text-right">APBD Perubahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {modalData.breakdown
                        .sort((a, b) => b.perubahan - a.perubahan)
                        .map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{b.label}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(b.induk)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(b.perubahan)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-200">
                        <td className="px-4 py-3 text-right">Total:</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(modalData.breakdown.reduce((sum, item) => sum + item.induk, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-primary">
                          {formatCurrency(modalData.breakdown.reduce((sum, item) => sum + item.perubahan, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
