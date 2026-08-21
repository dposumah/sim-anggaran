
"use client";

import React, { useEffect, useState } from "react";
import { Package, Search, Info, CheckCircle, Wallet, Settings, Activity, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function KontrolKegiatan() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/kontrol-kegiatan");
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal mengambil data");
      }
      const d = await res.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRow = (paket: string) => {
    setExpandedRow(expandedRow === paket ? null : paket);
  };

  const renderDiffBadge = (pagu: number, realisasi: number) => {
    const s = pagu - realisasi;
    if (s === 0) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Pas</span>;
    if (s > 0) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">Sisa {formatCurrency(s)}</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Minus {formatCurrency(Math.abs(s))}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Kontrol Kegiatan Teknis
          </h1>
          <p className="text-sm text-secondary">Daftar kegiatan teknis berdasarkan uraian paket.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Activity className="w-4 h-4" />
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

      {!isLoading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3 border-r">Uraian Paket</th>
                  <th className="px-4 py-3 text-right">Pagu Induk</th>
                  <th className="px-4 py-3 text-right">Pagu RKPD</th>
                  <th className="px-4 py-3 text-right">Pagu Perubahan</th>
                  <th className="px-4 py-3 text-right bg-blue-50/50">Realisasi</th>
                  <th className="px-4 py-3 text-center">Selisih (Perubahan - Realisasi)</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((group, idx) => (
                  <React.Fragment key={idx}>
                    <tr 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(group.namaPaket)}
                    >
                      <td className="px-4 py-3 border-r font-bold text-gray-900">{group.namaPaket}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(group.paguInduk)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(group.paguRkpd)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(group.paguPerubahan)}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700 bg-blue-50/10">
                        {formatCurrency(group.realisasi)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderDiffBadge(group.paguPerubahan, group.realisasi)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">
                        {expandedRow === group.namaPaket ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </td>
                    </tr>
                    
                    {expandedRow === group.namaPaket && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-slate-50/50">
                          <div className="p-4 border-b border-border shadow-inner">
                            <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                              <Info className="w-4 h-4 text-blue-500" /> Rincian Sub Kegiatan
                            </h4>
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100 text-gray-600">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Sub Kegiatan</th>
                                    <th className="px-3 py-2 text-left">Sumber Dana</th>
                                    <th className="px-3 py-2 text-left">Rekening</th>
                                    <th className="px-3 py-2 text-right">Pagu Induk</th>
                                    <th className="px-3 py-2 text-right">Pagu RKPD</th>
                                    <th className="px-3 py-2 text-right">Pagu Perubahan</th>
                                    <th className="px-3 py-2 text-right">Realisasi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {group.items.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 font-medium text-gray-800">{item.subKegiatan}</td>
                                      <td className="px-3 py-2 text-gray-600">{item.sumberDana}</td>
                                      <td className="px-3 py-2 text-gray-600">{item.rekening}</td>
                                      <td className="px-3 py-2 text-right">{formatCurrency(item.paguInduk)}</td>
                                      <td className="px-3 py-2 text-right">{formatCurrency(item.paguRkpd)}</td>
                                      <td className="px-3 py-2 text-right">{formatCurrency(item.paguPerubahan)}</td>
                                      <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(item.realisasi)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

