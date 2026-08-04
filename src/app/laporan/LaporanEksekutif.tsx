'use client';

import React, { useState, useEffect } from 'react';
import { useYear } from '@/contexts/YearContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { Building, Folder, FileText, FileJson, Package, Activity, TrendingUp, TrendingDown, Minus, Briefcase, GraduationCap, Banknote, X } from 'lucide-react';

const COLORS = ['#dc2626', '#b91c1c', '#f87171', '#fca5a5', '#ef4444', '#991b1b', '#7f1d1d'];

export default function LaporanEksekutif() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'subkegiatan' | 'rekening'>('subkegiatan');
  const [selectedBosp, setSelectedBosp] = useState<{ title: string, data: any } | null>(null);

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

  const renderTrend = (induk: number, perubahan: number) => {
    const diff = perubahan - induk;
    if (diff > 0) return <span className="text-blue-600 flex items-center text-xs font-medium"><TrendingUp className="w-3 h-3 mr-1" /> Naik</span>;
    if (diff < 0) return <span className="text-red-600 flex items-center text-xs font-medium"><TrendingDown className="w-3 h-3 mr-1" /> Turun</span>;
    return <span className="text-gray-500 flex items-center text-xs font-medium"><Minus className="w-3 h-3 mr-1" /> Tetap</span>;
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
        <div className="bg-white/90 backdrop-blur-md p-3 border border-red-100 shadow-lg rounded-xl text-sm">
          <p className="font-bold text-gray-800 mb-2 border-b border-red-100 pb-1">{label}</p>
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
      className={`bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-red-50 shadow-sm transition-all relative overflow-hidden group ${isBosp ? 'cursor-pointer hover:shadow-md hover:border-red-200' : ''}`}
      onClick={() => isBosp && setSelectedBosp({ title, data: item })}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24 text-primary" />
      </div>
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 relative z-10">
        <div className="p-1.5 bg-red-50 rounded-lg text-primary">
          <Icon className="w-4 h-4" />
        </div>
        {title}
        {isBosp && <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Klik untuk rincian</span>}
      </h3>
      <div className="flex justify-between items-end mb-1 relative z-10">
        <span className="text-xs text-gray-500 font-medium">Pagu Induk</span>
        <span className="text-sm font-semibold text-gray-600">{formatCurrency(item.induk)}</span>
      </div>
      <div className="flex justify-between items-end mb-2 relative z-10">
        <span className="text-xs text-primary font-medium">Pagu Perubahan</span>
        <span className="text-[15px] font-bold text-primary">{formatCurrency(item.perubahan)}</span>
      </div>
      <div className="flex justify-between items-end mb-3 pt-2 border-t border-gray-100 relative z-10">
        <span className="text-xs text-green-600 font-medium">Realisasi</span>
        <span className="text-sm font-bold text-green-700">{formatCurrency(item.realisasi)}</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden relative z-10">
        <div 
          className="bg-gradient-to-r from-green-400 to-green-500 h-1.5 rounded-full" 
          style={{ width: `${item.perubahan > 0 ? Math.min(100, (item.realisasi / item.perubahan) * 100) : 0}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1 relative z-10">
        <span className="text-[10px] text-gray-500">Selisih: {formatSelisih(item.induk, item.perubahan)}</span>
        <span className="text-[10px] text-gray-500 font-bold">
          {item.perubahan > 0 ? ((item.realisasi / item.perubahan) * 100).toFixed(1) : 0}% Serap
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary to-primary-hover p-5 rounded-2xl text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building className="w-24 h-24" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">Total Pagu Induk</p>
          <h3 className="text-2xl font-bold mb-4">{formatCurrency(summary.pagu.induk)}</h3>
          <p className="text-white/80 text-sm font-medium mb-1 pt-3 border-t border-white/20">Total Pagu Perubahan</p>
          <h3 className="text-2xl font-bold">{formatCurrency(summary.pagu.perubahan)}</h3>
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
            <span className="text-sm text-white/90">Total Realisasi</span>
            <span className="font-bold text-white bg-black/20 px-2 py-1 rounded-lg">{formatCurrency(summary.pagu.realisasi)}</span>
          </div>
        </div>

        <ScoreCard title="Gaji PNS" item={summary.gajiPns} icon={Briefcase} />
        <ScoreCard title="Gaji PPPK" item={summary.gajiPppk} icon={Briefcase} />
        <ScoreCard title="Tunjangan Profesi Guru" item={summary.tpg} icon={GraduationCap} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard title="BOSP SD" item={summary.bospSd} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOSP SMP" item={summary.bospSmp} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOP PAUD" item={summary.bospPaud} icon={GraduationCap} isBosp={true} />
        <ScoreCard title="BOP Kesetaraan" item={summary.bospKesetaraan} icon={GraduationCap} isBosp={true} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-red-50">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Distribusi Sumber Dana
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-red-50">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Top 10 Uraian Paket
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPaket} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}Jt`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px' }} tick={{ fill: '#475569' }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="perubahan" name="Pagu Perubahan" fill="#fca5a5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs for Top 15 Sub Kegiatan / Rekening */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-red-50">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-red-100 pb-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3 sm:mb-0">
            <Activity className="w-5 h-5 text-primary" />
            Perbandingan Pagu vs Realisasi
          </h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveChartTab('subkegiatan')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === 'subkegiatan' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Top 15 Sub Kegiatan
            </button>
            <button
              onClick={() => setActiveChartTab('rekening')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === 'rekening' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Top 15 Rekening
            </button>
          </div>
        </div>
        
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={activeChartTab === 'subkegiatan' ? topSubKegiatan : topRekening} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={(value) => `${(value / 1000000000).toFixed(1)}M`} style={{ fontSize: '11px' }} />
              <YAxis dataKey="nama" type="category" width={180} style={{ fontSize: '10px' }} tick={{ fill: '#475569' }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="paguInduk" name="Pagu Induk" fill="#fca5a5" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="paguPerubahan" name="Pagu Perubahan" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="realisasi" name="Realisasi" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center italic">* Data Gaji & Tunjangan serta BOSP disembunyikan dari grafik ini.</p>
      </div>

      {/* BOSP Modal */}
      {selectedBosp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-100">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
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
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
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
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
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

    </div>
  );
}
