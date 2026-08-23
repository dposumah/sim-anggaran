'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useYear } from '@/contexts/YearContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import {  Building, Package, Activity, TrendingUp, TrendingDown, Minus, Briefcase, GraduationCap, Banknote, X, Table, Download , ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['#dc2626', '#b91c1c', '#f87171', '#fca5a5', '#ef4444', '#991b1b', '#7f1d1d'];

export default function LaporanEksekutif() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'subkegiatan' | 'rekening' | 'paket'>('subkegiatan');
  const [selectedBosp, setSelectedBosp] = useState<{ title: string, data: any } | null>(null);
  const [selectedChartData, setSelectedChartData] = useState<{ title: string, type: 'subkegiatan' | 'rekening' | 'sumberdana' | 'paket', data: any } | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [selectedPaket, setSelectedPaket] = useState<{ title: string, rincian: any[] } | null>(null);
  const [showAllSumberDana, setShowAllSumberDana] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/laporan/perbandingan?tahun=${tahun}`)
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

  const formatSelisih = (induk: number, perubahan: number) => {
    const diff = perubahan - induk;
    if (diff > 0) return <span className="text-blue-600">+{formatCurrency(diff)}</span>;
    if (diff < 0) return <span className="text-red-600">{formatCurrency(diff)}</span>;
    return <span className="text-gray-500">Rp 0</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || data.error) return <div className="text-red-500 text-center">Error loading data: {data?.error || 'Unknown error'}</div>;

  const { summary, chartData, topPaket, topSubKegiatan, topRekening } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-sm z-50">
          <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-semibold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScoreCard = ({ title, item, icon: Icon, isBosp = false }: any) => (
    <div 
      className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all relative overflow-hidden group ${isBosp ? 'cursor-pointer hover:shadow-md hover:border-red-200' : ''}`}
      onClick={() => isBosp && setSelectedBosp({ title, data: item })}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24 text-primary" />
      </div>
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 relative z-10">
        <div className="p-2 bg-red-50 rounded-lg text-primary">
          <Icon className="w-4 h-4" />
        </div>
        {title}
        {isBosp && <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Lihat Rincian</span>}
      </h3>
      <div className="flex justify-between items-end mb-2 relative z-10">
        <span className="text-xs text-gray-500 font-medium">Pagu Induk</span>
        <span className="text-sm font-semibold text-gray-600">{formatCurrency(item.induk)}</span>
      </div>
      <div className="flex justify-between items-end mb-3 relative z-10">
        <span className="text-xs text-primary font-medium">Pagu Perubahan</span>
        <span className="text-base font-bold text-primary">{formatCurrency(item.perubahan)}</span>
      </div>
      <div className="flex justify-between items-end mb-3 pt-3 border-t border-gray-100 relative z-10">
        <span className="text-xs text-green-600 font-medium">Realisasi</span>
        <span className="text-sm font-bold text-green-700">{formatCurrency(item.realisasi)}</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden relative z-10">
        <div 
          className="bg-green-500 h-1.5 rounded-full" 
          style={{ width: `${item.perubahan > 0 ? Math.min(100, (item.realisasi / item.perubahan) * 100) : 0}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-2 relative z-10">
        <span className="text-[10px] font-medium text-gray-500">Selisih: {formatSelisih(item.induk, item.perubahan)}</span>
        <span className="text-[10px] text-gray-500 font-bold">
          {item.perubahan > 0 ? ((item.realisasi / item.perubahan) * 100).toFixed(1) : 0}% Serap
        </span>
      </div>
    </div>
  );

  const getChartDataForTabs = () => {
    if (!data) return [];
    if (activeChartTab === 'subkegiatan') return data.topSubKegiatan;
    if (activeChartTab === 'rekening') return data.topRekening;
    return (data.allPaket || data.topPaket).map((p: any) => ({ ...p, paguInduk: p.induk, paguPerubahan: p.perubahan }));
  };

  const handleExportExcel = () => {
    if (!data) return;
    const chartData = getChartDataForTabs();
    
    // Format data for excel
    const excelData = chartData.map((item: any) => {
      const base: any = {
        'Nama': item.nama,
      };

      if (activeChartTab === 'paket') {
        base['Sub Kegiatan'] = item.rincian ? Array.from(new Set(item.rincian.map((r: any) => r.subKegiatan))).join(', ') : '-';
        base['Sumber Dana'] = item.rincian ? Array.from(new Set(item.rincian.map((r: any) => r.sumberDana))).join(', ') : '-';
      }

      base['Pagu Induk'] = item.paguInduk;
      base['Pagu Perubahan'] = item.paguPerubahan;
      base['Realisasi'] = item.realisasi;
      base['Sisa Anggaran'] = item.paguPerubahan - item.realisasi;
      base['Persentase Serapan (%)'] = item.paguPerubahan > 0 ? ((item.realisasi / item.paguPerubahan) * 100).toFixed(2) : 0;

      return base;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeChartTab.toUpperCase());
    
    XLSX.writeFile(wb, `Perbandingan_${activeChartTab}_${tahun}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="mb-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute -right-10 -top-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
            <Building className="w-48 h-48 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 pr-0 md:pr-6">
            <p className="text-gray-500 text-sm font-medium mb-1">Total Pagu Induk</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(summary.pagu.induk)}</h3>
          </div>
          <div className="flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 px-0 md:px-6">
            <p className="text-primary text-sm font-medium mb-1">Total Pagu Perubahan</p>
            <h3 className="text-2xl font-bold text-primary">{formatCurrency(summary.pagu.perubahan)}</h3>
          </div>
          <div className="flex-1 text-center md:text-left pl-0 md:pl-6">
            <p className="text-sm font-medium text-green-600 mb-1">Total Realisasi</p>
            <h3 className="text-2xl font-bold text-green-700">{formatCurrency(summary.pagu.realisasi)}</h3>
            <div className="mt-2 text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full inline-block">
              {((summary.pagu.realisasi / summary.pagu.perubahan) * 100).toFixed(1)}% Serapan
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <ScoreCard title="Gaji PNS" item={summary.gajiPns} icon={Briefcase} />
        <ScoreCard title="Gaji PPPK" item={summary.gajiPppk} icon={Briefcase} />
        <ScoreCard title="Tambahan Penghasilan (TPP)" item={summary.tpp} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <ScoreCard title="Tunjangan Profesi (TPG)" item={summary.tpg} icon={GraduationCap} />
        <ScoreCard title="BOSP SD" item={summary.bospSd} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOSP SMP" item={summary.bospSmp} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOP PAUD" item={summary.bospPaud} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOP Kesetaraan" item={summary.bospKesetaraan} icon={GraduationCap} isBosp={true} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Distribusi Sumber Dana
            </h3>
            <button 
              onClick={() => setShowAllSumberDana(true)}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium hover:bg-red-200 transition-colors"
            >
              Lihat Detail
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const payload = e.activePayload[0].payload;
                    setSelectedChartData({ title: payload.name, type: 'sumberdana', data: payload });
                  }
                }}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="colorPerubahan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(value) => `${(value / 1000000000).toFixed(0)}M`} width={60} style={{ fontSize: '11px' }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="perubahan" name="Pagu Perubahan" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorPerubahan)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Top 10 Kegiatan Teknis
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPaket} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}Jt`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="nama" type="category" width={120} style={{ fontSize: '10px' }} tick={{ fill: '#475569' }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="perubahan" 
                  name="Pagu Perubahan" 
                  fill="#fca5a5" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20} 
                  onClick={(data: any) => setSelectedPaket({ title: data.payload?.nama || data.nama, rincian: data.payload?.rincian || [] })}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center italic">* Klik pada batang grafik untuk melihat rincian.</p>
        </div>
      </div>

      {/* Tabs for Sub Kegiatan / Rekening */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-100 pb-3 gap-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Perbandingan Pagu vs Realisasi
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveChartTab('subkegiatan')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === 'subkegiatan' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Kegiatan
              </button>
              <button
                onClick={() => setActiveChartTab('rekening')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === 'rekening' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Rekening
              </button>
              <button
                onClick={() => setActiveChartTab('paket')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === 'paket' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Uraian Paket
              </button>
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              title="Export Data Grafik ke Excel"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
        
        <div style={{ height: `${Math.max(500, getChartDataForTabs().length * 45)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={getChartDataForTabs()} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={(value) => `${(value / 1000000000).toFixed(1)}M`} style={{ fontSize: '11px' }} />
              <YAxis dataKey="nama" type="category" width={220} style={{ fontSize: '10px' }} tick={{ fill: '#475569' }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar 
                dataKey="paguPerubahan" 
                name="Pagu Perubahan" 
                fill="#dc2626" 
                radius={[0, 4, 4, 0]} 
                barSize={12} 
                onClick={(data: any) => setSelectedChartData({ title: data.payload?.nama || data.nama, type: activeChartTab, data: data.payload || data })}
                cursor="pointer"
              />
              <Bar 
                dataKey="realisasi" 
                name="Realisasi" 
                fill="#10b981" 
                radius={[0, 4, 4, 0]} 
                barSize={12} 
                onClick={(data: any) => setSelectedChartData({ title: data.payload?.nama || data.nama, type: activeChartTab, data: data.payload || data })}
                cursor="pointer"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center italic">* Klik pada batang grafik (bar) untuk melihat tabel rincian data. Data Gaji & Tunjangan, PPPK Paruh Waktu, serta BOSP disembunyikan dari grafik ini.</p>
      </div>

      {/* Chart Detail Modal */}
      {selectedChartData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Table className="w-5 h-5 text-primary" />
                Rincian {selectedChartData.type === 'subkegiatan' ? 'Sub Kegiatan' : selectedChartData.type === 'sumberdana' ? 'Sumber Dana' : selectedChartData.type === 'paket' ? 'Uraian Paket' : 'Rekening'}
              </h3>
              <button 
                onClick={() => setSelectedChartData(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <h4 className="font-semibold text-primary mb-4">{selectedChartData.title}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">Uraian</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600">Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-600">Pagu Induk</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(selectedChartData.data.paguInduk)}</td>
                    </tr>
                    <tr className="hover:bg-red-50">
                      <td className="px-4 py-3 font-medium text-primary">Pagu Perubahan</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(selectedChartData.data.paguPerubahan)}</td>
                    </tr>
                    <tr className="hover:bg-green-50">
                      <td className="px-4 py-3 font-medium text-green-600">Realisasi</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(selectedChartData.data.realisasi)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-500 text-xs">Selisih (Perubahan - Induk)</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">{formatSelisih(selectedChartData.data.paguInduk, selectedChartData.data.paguPerubahan)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-500 text-xs">Persentase Serapan</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm text-gray-600">
                        {selectedChartData.data.paguPerubahan > 0 ? ((selectedChartData.data.realisasi / selectedChartData.data.paguPerubahan) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setSelectedChartData(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kegiatan Teknis Detail Modal */}
      {selectedPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Rincian Kegiatan Teknis
              </h3>
              <button 
                onClick={() => setSelectedPaket(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-bold text-primary mb-4 text-xl">{selectedPaket.title}</h4>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">Sub Kegiatan</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">Rekening</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">Sumber Dana</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600">Pagu Perubahan</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600">Realisasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedPaket.rincian.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Belum ada rincian yang terdata</td></tr>
                    ) : (
                      selectedPaket.rincian.map((r, i) => (
                        
                        <React.Fragment key={i}>
                          <tr
                            className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedRows(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                          >

                          <td className="px-4 py-3 text-gray-800 align-top">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {expandedRows.includes(i) ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" style={{ transform: 'rotate(-90deg)' }} />
                                  )}
                                </div>
                                <div>{r.subKegiatan}</div>
                              </div>
                            </td>
                          <td className="px-4 py-3 text-gray-600 align-top">{r.rekening}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs align-top"><span className="bg-gray-100 px-2 py-1 rounded-md">{r.sumberDana}</span></td>
                          <td className="px-4 py-3 text-right font-semibold text-primary align-top whitespace-nowrap">{formatCurrency(r.paguPerubahan)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600 align-top whitespace-nowrap">{formatCurrency(r.realisasi)}</td>
</tr>
                          {expandedRows.includes(i) && r.items && r.items.length > 0 && (
                            <tr className="bg-gray-50/80">
                              <td colSpan={5} className="px-8 py-4">
                                <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-100 text-gray-700">
                                      <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Uraian / Spesifikasi</th>
                                        <th className="px-4 py-2 text-center font-semibold">Koefisien</th>
                                        <th className="px-4 py-2 text-center font-semibold">Satuan</th>
                                        <th className="px-4 py-2 text-right font-semibold">Harga Satuan</th>
                                        <th className="px-4 py-2 text-right font-semibold">Jumlah</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {r.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 text-gray-800">
                                            <div className="font-medium">{item.uraian}</div>
                                            {item.spesifikasi && item.spesifikasi !== '-' && (
                                              <div className="text-gray-500 mt-0.5">{item.spesifikasi}</div>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-600">{item.koefisien}</td>
                                          <td className="px-4 py-2 text-center text-gray-600">{item.satuan}</td>
                                          <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(Number(item.hargaSatuan))}</td>
                                          <td className="px-4 py-2 text-right font-semibold text-blue-700">{formatCurrency(Number(item.jumlah))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>

                        ))
                      )}
                  </tbody>
                  {selectedPaket.rincian.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-gray-700">Total:</td>
                        <td className="px-4 py-3 text-right text-primary">
                          {formatCurrency(selectedPaket.rincian.reduce((acc, curr) => acc + (curr.paguPerubahan || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {formatCurrency(selectedPaket.rincian.reduce((acc, curr) => acc + (curr.realisasi || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
              <button 
                onClick={() => setSelectedPaket(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOSP Modal */}
      {selectedBosp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Rincian {selectedBosp.title}
              </h3>
              <button 
                onClick={() => setSelectedBosp(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Reguler */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 border-b pb-1">BOSP Reguler</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Pagu Induk</p>
                    <p className="font-bold text-gray-700 text-sm">{formatCurrency(selectedBosp.data.reguler.induk)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-50">
                    <p className="text-xs text-primary mb-1">Pagu Perubahan</p>
                    <p className="font-bold text-primary text-sm">{formatCurrency(selectedBosp.data.reguler.perubahan)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 mb-1">Realisasi</p>
                    <p className="font-bold text-green-700 text-sm">{formatCurrency(selectedBosp.data.reguler.realisasi)}</p>
                  </div>
                </div>
              </div>
              
              {/* Kinerja */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 border-b pb-1">BOSP Kinerja</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Pagu Induk</p>
                    <p className="font-bold text-gray-700 text-sm">{formatCurrency(selectedBosp.data.kinerja.induk)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-50">
                    <p className="text-xs text-primary mb-1">Pagu Perubahan</p>
                    <p className="font-bold text-primary text-sm">{formatCurrency(selectedBosp.data.kinerja.perubahan)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 mb-1">Realisasi</p>
                    <p className="font-bold text-green-700 text-sm">{formatCurrency(selectedBosp.data.kinerja.realisasi)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setSelectedBosp(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {showAllSumberDana && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Semua Sumber Dana
              </h3>
              <button 
                onClick={() => setShowAllSumberDana(false)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Sumber Dana</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Pagu Induk</th>
                      <th className="px-4 py-3 text-right font-semibold text-primary">Pagu Perubahan</th>
                      <th className="px-4 py-3 text-right font-semibold text-green-600">Realisasi</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Selisih Pagu</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">% Serapan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((sd: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{sd.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(sd.paguInduk)}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(sd.perubahan)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(sd.realisasi)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sm">
                          {formatSelisih(sd.paguInduk, sd.perubahan)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {sd.perubahan > 0 ? ((sd.realisasi / sd.perubahan) * 100).toFixed(2) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0 border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-gray-700 font-bold">Total:</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-bold">
                        {formatCurrency(chartData.reduce((acc: number, curr: any) => acc + (curr.paguInduk || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-primary font-bold">
                        {formatCurrency(chartData.reduce((acc: number, curr: any) => acc + (curr.perubahan || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-bold">
                        {formatCurrency(chartData.reduce((acc: number, curr: any) => acc + (curr.realisasi || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatSelisih(
                          chartData.reduce((acc: number, curr: any) => acc + (curr.paguInduk || 0), 0),
                          chartData.reduce((acc: number, curr: any) => acc + (curr.perubahan || 0), 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {(() => {
                          const totalRealisasi = chartData.reduce((acc: number, curr: any) => acc + (curr.realisasi || 0), 0);
                          const totalPerubahan = chartData.reduce((acc: number, curr: any) => acc + (curr.perubahan || 0), 0);
                          return totalPerubahan > 0 ? ((totalRealisasi / totalPerubahan) * 100).toFixed(2) : 0;
                        })()}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
              <button 
                onClick={() => setShowAllSumberDana(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

