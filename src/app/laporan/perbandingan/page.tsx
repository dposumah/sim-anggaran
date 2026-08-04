'use client';

import React, { useState, useEffect } from 'react';
import { useYear } from '@/contexts/YearContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { Building, Folder, FileText, FileJson, Package, Activity, FileSpreadsheet, TrendingUp, TrendingDown, Minus, Briefcase, GraduationCap, Banknote } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57', '#ffc0cb'];

export default function PerbandinganPage() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (diff > 0) return <span className="text-green-600 flex items-center text-xs font-medium"><TrendingUp className="w-3 h-3 mr-1" /> Naik</span>;
    if (diff < 0) return <span className="text-red-600 flex items-center text-xs font-medium"><TrendingDown className="w-3 h-3 mr-1" /> Turun</span>;
    return <span className="text-gray-500 flex items-center text-xs font-medium"><Minus className="w-3 h-3 mr-1" /> Tetap</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!data || data.error) return <div>Error loading data: {data?.error || 'Unknown error'}</div>;

  const { summary, chartData, topPaket, topSubKegiatan } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-lg text-sm">
          <p className="font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
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

  const ScoreCard = ({ title, item, icon: Icon }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h3>
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs text-gray-500 font-medium">Pagu Induk</span>
        <span className="text-sm font-semibold text-gray-600">{formatCurrency(item.induk)}</span>
      </div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-blue-600 font-medium">Pagu Perubahan</span>
        <span className="text-[15px] font-bold text-blue-800">{formatCurrency(item.perubahan)}</span>
      </div>
      <div className="flex justify-between items-end mb-3 pt-2 border-t border-gray-100">
        <span className="text-xs text-green-600 font-medium">Realisasi</span>
        <span className="text-sm font-bold text-green-700">{formatCurrency(item.realisasi)}</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
        <div 
          className="bg-green-500 h-1.5 rounded-full" 
          style={{ width: `${item.perubahan > 0 ? Math.min(100, (item.realisasi / item.perubahan) * 100) : 0}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">Selisih Pagu: {formatCurrency(item.perubahan - item.induk)}</span>
        <span className="text-[10px] text-gray-500 font-bold">
          {item.perubahan > 0 ? ((item.realisasi / item.perubahan) * 100).toFixed(1) : 0}% Serap
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" /> Laporan Eksekutif Anggaran
          </h1>
          <p className="text-sm text-secondary mt-1">Dashboard analisis komparatif Pagu Induk, Perubahan, dan Realisasi Tahun {tahun}.</p>
        </div>
        <button 
          onClick={() => window.open(`/api/laporan/perbandingan/export?tahun=${tahun}`, '_blank')}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Export Excel Lengkap
        </button>
      </div>

      {/* Global Total */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg text-white">
        <h2 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
          <Building className="w-5 h-5" /> Total Keseluruhan APBD Pendidikan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-700">
          <div className="px-2">
            <p className="text-slate-400 text-sm font-medium mb-1">Total Pagu Induk</p>
            <p className="text-3xl font-bold">{formatCurrency(summary.pagu.induk)}</p>
          </div>
          <div className="px-2 md:px-6 pt-4 md:pt-0">
            <p className="text-blue-300 text-sm font-medium mb-1">Total Pagu Perubahan</p>
            <p className="text-3xl font-bold text-blue-100">{formatCurrency(summary.pagu.perubahan)}</p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Selisih: <span className={summary.pagu.perubahan >= summary.pagu.induk ? 'text-green-400' : 'text-red-400'}>
                {formatCurrency(summary.pagu.perubahan - summary.pagu.induk)}
              </span>
            </p>
          </div>
          <div className="px-2 md:px-6 pt-4 md:pt-0">
            <p className="text-green-400 text-sm font-medium mb-1">Total Realisasi</p>
            <p className="text-3xl font-bold text-green-100">{formatCurrency(summary.pagu.realisasi)}</p>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
              <div 
                className="bg-green-400 h-2 rounded-full" 
                style={{ width: `${summary.pagu.perubahan > 0 ? Math.min(100, (summary.pagu.realisasi / summary.pagu.perubahan) * 100) : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-right mt-1 text-slate-400">
              {summary.pagu.perubahan > 0 ? ((summary.pagu.realisasi / summary.pagu.perubahan) * 100).toFixed(2) : 0}% Terserap
            </p>
          </div>
        </div>
      </div>

      {/* Komponen Gaji & Tunjangan */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" /> Komponen Gaji & Tunjangan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard title="Total Gaji PNS" item={summary.gajiPns} icon={Banknote} />
          <ScoreCard title="Total Gaji PPPK" item={summary.gajiPppk} icon={Banknote} />
          <ScoreCard title="Gaji PPPK Paruh Waktu" item={summary.gajiPppkParuhWaktu} icon={Banknote} />
          <ScoreCard title="TPP (Beban Kerja PNS)" item={summary.tpp} icon={Banknote} />
        </div>
      </div>

      {/* Komponen Pendidikan */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" /> Komponen Pendidikan (BOSP & TPG)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ScoreCard title="TPG (Profesi Guru)" item={summary.tpg} icon={GraduationCap} />
          <ScoreCard title="BOSP SD" item={summary.bospSd} icon={GraduationCap} />
          <ScoreCard title="BOSP SMP" item={summary.bospSmp} icon={GraduationCap} />
          <ScoreCard title="BOSP PAUD" item={summary.bospPaud} icon={GraduationCap} />
          <ScoreCard title="BOSP Kesetaraan" item={summary.bospKesetaraan} icon={GraduationCap} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Top 10 Uraian Paket */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" /> Top 10 Uraian Paket Terbesar
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPaket}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} opacity={0.3} />
                <XAxis type="number" tickFormatter={(val) => `${val / 1000000000}M`} />
                <YAxis dataKey="nama" type="category" width={150} tick={{fontSize: 10}} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="induk" name="Induk" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="perubahan" name="Perubahan" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">*Mengecualikan Program Penunjang Pemerintahan Daerah</p>
        </div>

        {/* Komposisi Sumber Dana */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5 text-purple-500" /> Proporsi Sumber Dana (Pagu Perubahan)
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="perubahan"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  label={({ name, percent = 0 }: any) => `${(percent * 100).toFixed(1)}%`}
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tren Realisasi Sub Kegiatan */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-8">
        <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Perbandingan Pagu vs Realisasi (Top 15 Sub Kegiatan Terbesar)
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={topSubKegiatan}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="nama" tick={{fontSize: 10}} angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(val) => `${val / 1000000000}M`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" />
              <Area type="monotone" dataKey="paguPerubahan" name="Pagu Perubahan" fill="#dbeafe" stroke="#3b82f6" />
              <Bar dataKey="paguInduk" name="Pagu Induk" barSize={20} fill="#94a3b8" />
              <Line type="monotone" dataKey="realisasi" name="Total Realisasi" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
