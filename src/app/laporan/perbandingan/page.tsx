'use client';

import React, { useState, useEffect } from 'react';
import { useYear } from '@/contexts/YearContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building, Folder, FileText, FileJson, Package, Activity, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PerbandinganPage() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/laporan/perbandingan?tahun=${tahun}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        if (res.tree) {
          const newExpanded = new Set<string>();
          Object.keys(res.tree).forEach(k => newExpanded.add(`skpd_${k}`));
          setExpandedNodes(newExpanded);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tahun]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const formatCurrency = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const renderTrend = (induk: number, perubahan: number) => {
    const diff = perubahan - induk;
    if (diff > 0) return <span className="text-green-600 flex items-center text-xs font-medium"><TrendingUp className="w-3 h-3 mr-1" /> Naik</span>;
    if (diff < 0) return <span className="text-red-600 flex items-center text-xs font-medium"><TrendingDown className="w-3 h-3 mr-1" /> Turun</span>;
    return <span className="text-gray-500 flex items-center text-xs font-medium"><Minus className="w-3 h-3 mr-1" /> Tetap</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!data) return <div>Error loading data</div>;

  const { summary, chartData, tree } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Ringkasan Perbandingan Anggaran
          </h1>
          <p className="text-sm text-secondary">Ringkasan Eksekutif APBD Induk dan Perubahan Tahun {tahun}.</p>
        </div>
        <button 
          onClick={() => window.open(`/api/laporan/perbandingan/export?tahun=${tahun}`, '_blank')}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Export Laporan Excel
        </button>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pagu Anggaran</h3>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-500">Induk</span>
            <span className="font-semibold text-gray-700">{formatCurrency(summary.pagu.induk)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-gray-500">Perubahan</span>
            <span className="font-semibold text-gray-900">{formatCurrency(summary.pagu.perubahan)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="text-xs text-gray-500">Selisih</span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(summary.pagu.perubahan - summary.pagu.induk)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Gaji PNS dan PPPK</h3>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-500">Induk</span>
            <span className="font-semibold text-gray-700">{formatCurrency(summary.gajiAsn.induk)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-gray-500">Perubahan</span>
            <span className="font-semibold text-gray-900">{formatCurrency(summary.gajiAsn.perubahan)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="text-xs text-gray-500">Selisih</span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(summary.gajiAsn.perubahan - summary.gajiAsn.induk)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Gaji PPPK Paruh Waktu</h3>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-500">Induk</span>
            <span className="font-semibold text-gray-700">{formatCurrency(summary.gajiPppkParuhWaktu.induk)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-gray-500">Perubahan</span>
            <span className="font-semibold text-gray-900">{formatCurrency(summary.gajiPppkParuhWaktu.perubahan)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="text-xs text-gray-500">Selisih</span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(summary.gajiPppkParuhWaktu.perubahan - summary.gajiPppkParuhWaktu.induk)}</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Honor Pelayanan Umum</h3>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-500">Induk</span>
            <span className="font-semibold text-gray-700">{formatCurrency(summary.honorPelayananUmum.induk)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-gray-500">Perubahan</span>
            <span className="font-semibold text-gray-900">{formatCurrency(summary.honorPelayananUmum.perubahan)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="text-xs text-gray-500">Selisih</span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(summary.honorPelayananUmum.perubahan - summary.honorPelayananUmum.induk)}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Pagu per Sumber Dana</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `Rp${(val / 1000000000).toFixed(1)}M`} tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} cursor={{fill: '#f3f4f6'}} />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="induk" name="Pagu Induk" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="perubahan" name="Pagu Perubahan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel Perbandingan Hierarkis - Khusus DAU Pendidikan */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Breakdown Khusus Sumber Dana DAU Bidang Pendidikan</h2>
            <p className="text-sm text-gray-500 mt-1">Menampilkan rincian hierarki untuk DAU yang Ditentukan Penggunaannya Bidang Pendidikan.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 font-medium">
              <tr>
                <th className="py-3 px-4 text-left border-b w-1/2">Uraian</th>
                <th className="py-3 px-4 text-right border-b whitespace-nowrap">Pagu Induk</th>
                <th className="py-3 px-4 text-right border-b whitespace-nowrap">Pagu Perubahan</th>
                <th className="py-3 px-4 text-right border-b whitespace-nowrap">Selisih</th>
                <th className="py-3 px-4 text-center border-b w-24">Trend</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(tree).map((skpdKey) => {
                const skpd = tree[skpdKey];
                const skpdId = `skpd_${skpdKey}`;
                const skpdExpanded = expandedNodes.has(skpdId);
                return (
                  <React.Fragment key={skpdKey}>
                    <tr className="border-b bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => toggleExpand(skpdId)}>
                      <td className="py-3 px-4 font-bold flex items-center">
                        <Building className="w-4 h-4 mr-2 text-primary" /> {skpdKey}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(skpd.induk)}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(skpd.perubahan)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${skpd.perubahan - skpd.induk !== 0 ? 'text-blue-600' : ''}`}>{formatCurrency(skpd.perubahan - skpd.induk)}</td>
                      <td className="py-3 px-4 text-center">{renderTrend(skpd.induk, skpd.perubahan)}</td>
                    </tr>
                    
                    {skpdExpanded && Object.keys(skpd.progs).map((progKey) => {
                      const prog = skpd.progs[progKey];
                      const progId = `prog_${progKey}`;
                      const progExpanded = expandedNodes.has(progId);
                      const [pKode, pNama] = progKey.split('|');
                      return (
                        <React.Fragment key={progKey}>
                          <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleExpand(progId)}>
                            <td className="py-2 px-4 pl-10 font-semibold flex items-center">
                              <Folder className="w-4 h-4 mr-2 text-blue-500" /> {pKode} - {pNama}
                            </td>
                            <td className="py-2 px-4 text-right font-semibold">{formatCurrency(prog.induk)}</td>
                            <td className="py-2 px-4 text-right font-semibold">{formatCurrency(prog.perubahan)}</td>
                            <td className={`py-2 px-4 text-right font-semibold ${prog.perubahan - prog.induk !== 0 ? 'text-blue-600' : ''}`}>{formatCurrency(prog.perubahan - prog.induk)}</td>
                            <td className="py-2 px-4 text-center">{renderTrend(prog.induk, prog.perubahan)}</td>
                          </tr>
                          
                          {progExpanded && Object.keys(prog.kegs).map((kegKey) => {
                            const keg = prog.kegs[kegKey];
                            const kegId = `keg_${kegKey}`;
                            const kegExpanded = expandedNodes.has(kegId);
                            const [kKode, kNama] = kegKey.split('|');
                            return (
                              <React.Fragment key={kegKey}>
                                <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleExpand(kegId)}>
                                  <td className="py-2 px-4 pl-16 flex items-center text-gray-800">
                                    <FileText className="w-3.5 h-3.5 mr-2 text-green-500" /> {kKode} - {kNama}
                                  </td>
                                  <td className="py-2 px-4 text-right text-gray-800">{formatCurrency(keg.induk)}</td>
                                  <td className="py-2 px-4 text-right text-gray-800">{formatCurrency(keg.perubahan)}</td>
                                  <td className={`py-2 px-4 text-right ${keg.perubahan - keg.induk !== 0 ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>{formatCurrency(keg.perubahan - keg.induk)}</td>
                                  <td className="py-2 px-4 text-center">{renderTrend(keg.induk, keg.perubahan)}</td>
                                </tr>
                                
                                {kegExpanded && Object.keys(keg.subs).map((subKey) => {
                                  const sub = keg.subs[subKey];
                                  const subId = `sub_${subKey}`;
                                  const subExpanded = expandedNodes.has(subId);
                                  const [sKode, sNama] = subKey.split('|');
                                  return (
                                    <React.Fragment key={subKey}>
                                      <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleExpand(subId)}>
                                        <td className="py-2 px-4 pl-24 flex items-center text-gray-700 text-xs font-medium">
                                          <FileJson className="w-3.5 h-3.5 mr-2 text-orange-500 shrink-0" /> {sKode} - {sNama}
                                        </td>
                                        <td className="py-2 px-4 text-right text-gray-700 text-xs">{formatCurrency(sub.induk)}</td>
                                        <td className="py-2 px-4 text-right text-gray-700 text-xs">{formatCurrency(sub.perubahan)}</td>
                                        <td className={`py-2 px-4 text-right text-xs ${sub.perubahan - sub.induk !== 0 ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>{formatCurrency(sub.perubahan - sub.induk)}</td>
                                        <td className="py-2 px-4 text-center">{renderTrend(sub.induk, sub.perubahan)}</td>
                                      </tr>
                                      
                                      {subExpanded && Object.keys(sub.reks).map((rekKey) => {
                                        const rek = sub.reks[rekKey];
                                        const rekId = `rek_${subId}_${rekKey}`;
                                        const rekExpanded = expandedNodes.has(rekId);
                                        const [rKode, rNama] = rekKey.split('|');
                                        return (
                                          <React.Fragment key={rekKey}>
                                            <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleExpand(rekId)}>
                                              <td className="py-2 px-4 pl-32 text-gray-600 text-xs flex items-center">
                                                - Rek: {rKode} - {rNama}
                                              </td>
                                              <td className="py-2 px-4 text-right text-gray-600 text-xs">{formatCurrency(rek.induk)}</td>
                                              <td className="py-2 px-4 text-right text-gray-600 text-xs">{formatCurrency(rek.perubahan)}</td>
                                              <td className={`py-2 px-4 text-right text-xs ${rek.perubahan - rek.induk !== 0 ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>{formatCurrency(rek.perubahan - rek.induk)}</td>
                                              <td className="py-2 px-4 text-center">{renderTrend(rek.induk, rek.perubahan)}</td>
                                            </tr>

                                            {rekExpanded && Object.keys(rek.pakets).map((paketKey) => {
                                              const paket = rek.pakets[paketKey];
                                              const isNew = paket.induk === 0 && paket.perubahan > 0;
                                              const isRemoved = paket.induk > 0 && paket.perubahan === 0;
                                              return (
                                                <tr key={paketKey} className={`border-b bg-gray-50/50 hover:bg-gray-100 ${isNew ? 'bg-green-50/30' : isRemoved ? 'bg-red-50/30' : ''}`}>
                                                  <td className="py-2 px-4 pl-40 text-gray-500 text-xs flex items-center">
                                                    <Package className={`w-3 h-3 mr-1 ${isNew ? 'text-green-500' : isRemoved ? 'text-red-500' : 'text-gray-400'}`} /> 
                                                    <span className={isNew ? 'text-green-700 font-medium' : isRemoved ? 'text-red-700 line-through' : ''}>
                                                      {paketKey}
                                                    </span>
                                                    {isNew && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Baru</span>}
                                                    {isRemoved && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Dihapus</span>}
                                                  </td>
                                                  <td className="py-2 px-4 text-right text-gray-500 text-xs font-medium">{formatCurrency(paket.induk)}</td>
                                                  <td className="py-2 px-4 text-right text-gray-500 text-xs font-medium">{formatCurrency(paket.perubahan)}</td>
                                                  <td className={`py-2 px-4 text-right text-xs font-medium ${paket.perubahan - paket.induk !== 0 ? 'text-blue-600' : 'text-gray-500'}`}>{formatCurrency(paket.perubahan - paket.induk)}</td>
                                                  <td className="py-2 px-4 text-center">{renderTrend(paket.induk, paket.perubahan)}</td>
                                                </tr>
                                              );
                                            })}
                                          </React.Fragment>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
