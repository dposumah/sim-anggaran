'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Building2, 
  Wallet, 
  Target,
  ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard?tahun=2026')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl font-medium text-secondary">Memuat Dashboard...</div>
      </div>
    );
  }

  if (!data) return <div>Data tidak tersedia</div>;

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatShortRupiah = (number: number) => {
    if (number >= 1e9) {
      return 'Rp ' + (number / 1e9).toFixed(1) + ' M';
    }
    if (number >= 1e6) {
      return 'Rp ' + (number / 1e6).toFixed(1) + ' Jt';
    }
    return 'Rp ' + number.toLocaleString('id-ID');
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Anggaran</h1>
        <p className="text-sm text-secondary">Ringkasan alokasi APBD Kota Tomohon TA 2026</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex items-center rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary">Total Pagu APBD</h3>
            <p className="text-2xl font-bold text-foreground">{formatRupiah(data.summary.totalPagu)}</p>
          </div>
        </div>
        
        <div className="flex items-center rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary">Jumlah SKPD</h3>
            <p className="text-2xl font-bold text-foreground">{data.summary.skpdCount} SKPD</p>
          </div>
        </div>
        
        <div className="flex items-center rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Target className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary">Jumlah Program</h3>
            <p className="text-2xl font-bold text-foreground">{data.summary.programCount} Program</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tabel Sumber Dana */}
        <div className="rounded-xl bg-surface p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Rekapitulasi per Sumber Dana</h3>
          <div className="overflow-x-auto h-80">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Sumber Dana</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Total Pagu (Rp)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.sumberDanaChart?.map((item: any, index: number) => {
                  const percentage = ((item.value / data.summary.totalPagu) * 100).toFixed(1);
                  return (
                    <tr key={index} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatRupiah(item.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!data.sumberDanaChart || data.sumberDanaChart.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data sumber dana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart 2: Top 10 Rekening */}
        <div className="rounded-xl bg-surface p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">10 Rekening Belanja Terbesar</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topRekeningChart} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E9ECEF" />
                <XAxis type="number" tickFormatter={(val) => formatShortRupiah(val)} />
                <YAxis 
                  dataKey="nama" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val}
                />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(value), 'Total Pagu']}
                  labelStyle={{ color: '#212529', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
