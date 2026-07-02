'use client';

import { useState, useEffect } from 'react';
import { Users, Calculator, Download } from 'lucide-react';
import { useYear } from '@/contexts/YearContext';

export default function KebutuhanGajiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { tahun } = useYear();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kebutuhan-gaji?tahun=${tahun}`)
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          // Urutkan yang ada pegawai duluan
          const sorted = d.sort((a,b) => (b.countPns + b.countPppk + b.countHonorer) - (a.countPns + a.countPppk + a.countHonorer));
          setData(sorted);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [tahun]);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Kebutuhan Gaji & TPP
          </h1>
          <p className="text-sm text-secondary">
            Estimasi proyeksi belanja pegawai (Gaji, Tunjangan, BPJS, JKK, JKM, dan TPP) per SKPD
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total PNS</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.reduce((acc, curr) => acc + curr.countPns, 0)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total PPPK</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.reduce((acc, curr) => acc + curr.countPppk, 0)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Honorer</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.reduce((acc, curr) => acc + curr.countHonorer, 0)}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase align-middle border-b">SKPD</th>
                <th colSpan={3} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-l border-gray-200">Jumlah Pegawai</th>
                <th colSpan={5} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-l border-gray-200">Kebutuhan Per Bulan</th>
                <th rowSpan={2} className="px-4 py-3 text-right text-xs font-bold text-primary uppercase align-middle border-b border-l border-gray-200 bg-blue-50/50">Total Kebutuhan Setahun</th>
              </tr>
              <tr>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b border-l border-gray-200">PNS</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b">PPPK</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b">HNR</th>
                
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 border-b border-l border-gray-200">Gaji Pokok & Kel.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 border-b">Beras</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 border-b">BPJS/JKK/JKM</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 border-b">TPP</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 border-b bg-gray-50">Total Bulan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500">Menghitung formulasi gaji...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500 italic">Data SKPD tidak ditemukan.</td></tr>
              ) : (
                data.map(skpd => {
                  const perBulan = skpd.perBulan;
                  const totalAsuransi = perBulan.bpjsKes + perBulan.jkk + perBulan.jkm;
                  const totalGapokKel = perBulan.gapok + perBulan.tunjKeluarga;
                  
                  return (
                    <tr key={skpd.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">{skpd.nama}</div>
                        <div className="text-xs text-gray-500">{skpd.kode}</div>
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-700 border-l border-gray-100">{skpd.countPns}</td>
                      <td className="px-2 py-3 text-center text-sm text-gray-700">{skpd.countPppk}</td>
                      <td className="px-2 py-3 text-center text-sm text-gray-700">{skpd.countHonorer}</td>
                      
                      <td className="px-4 py-3 text-right text-sm text-gray-700 border-l border-gray-100">{formatRupiah(totalGapokKel)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatRupiah(perBulan.tunjBeras)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatRupiah(totalAsuransi)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatRupiah(perBulan.tpp)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 bg-gray-50">{formatRupiah(perBulan.total)}</td>
                      
                      <td className="px-4 py-3 text-right text-sm font-bold text-primary bg-blue-50/30 border-l border-gray-100">{formatRupiah(skpd.perTahun.total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
