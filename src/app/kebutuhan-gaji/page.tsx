'use client';

import { useState, useEffect } from 'react';
import { Users, Calculator, Download, Building } from 'lucide-react';
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
          setData(d);
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

  const totalPns = data.reduce((acc, curr) => acc + curr.pns.count, 0);
  const totalPppk = data.reduce((acc, curr) => acc + curr.pppk.count, 0);
  const totalHonorer = data.reduce((acc, curr) => acc + curr.honorer.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Kebutuhan Gaji & TPP
          </h1>
          <p className="text-sm text-secondary">
            Estimasi proyeksi belanja pegawai khusus Dinas Pendidikan
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
            <h3 className="text-2xl font-bold text-gray-900">{totalPns}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total PPPK</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalPppk}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Honorer</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalHonorer}</h3>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-border">
          Menghitung formulasi gaji...
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-gray-500 italic bg-white rounded-xl shadow-sm border border-border">
          Data SKPD Pendidikan tidak ditemukan.
        </div>
      ) : (
        <div className="space-y-8">
          {data.map(skpd => (
            <div key={skpd.id} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="font-bold text-gray-900">{skpd.nama}</h3>
                  <p className="text-xs text-gray-500">{skpd.kode}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Kebutuhan Setahun</p>
                  <p className="text-lg font-bold text-primary">{formatRupiah(skpd.grandTotal)}</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Jml Pegawai</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Gaji Pokok & Kel</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Tunj. Jabatan</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Beras</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">PPh & Pemb.</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Asuransi</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">TPP</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-50">Total Setahun</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    <tr className="hover:bg-blue-50/20">
                      <td className="px-4 py-4 font-semibold text-gray-900">PNS</td>
                      <td className="px-4 py-4 text-center text-gray-700">{skpd.pns.count}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.gapok + skpd.pns.tunjKeluarga)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.tunjJabatanUmum)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.tunjBeras)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.tunjPphPembulatan)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.bpjsKes + skpd.pns.jkk + skpd.pns.jkm)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pns.tpp)}</td>
                      <td className="px-4 py-4 text-right font-bold text-primary bg-gray-50">{formatRupiah(skpd.pns.total)}</td>
                    </tr>
                    <tr className="hover:bg-indigo-50/20">
                      <td className="px-4 py-4 font-semibold text-gray-900">PPPK</td>
                      <td className="px-4 py-4 text-center text-gray-700">{skpd.pppk.count}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.gapok + skpd.pppk.tunjKeluarga)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.tunjJabatanUmum)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.tunjBeras)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.tunjPphPembulatan)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.bpjsKes + skpd.pppk.jkk + skpd.pppk.jkm)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.pppk.tpp)}</td>
                      <td className="px-4 py-4 text-right font-bold text-indigo-700 bg-gray-50">{formatRupiah(skpd.pppk.total)}</td>
                    </tr>
                    <tr className="hover:bg-amber-50/20">
                      <td className="px-4 py-4 font-semibold text-gray-900">HONORER</td>
                      <td className="px-4 py-4 text-center text-gray-700">{skpd.honorer.count}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.gapok + skpd.honorer.tunjKeluarga)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.tunjJabatanUmum)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.tunjBeras)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.tunjPphPembulatan)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.bpjsKes + skpd.honorer.jkk + skpd.honorer.jkm)}</td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatRupiah(skpd.honorer.tpp)}</td>
                      <td className="px-4 py-4 text-right font-bold text-amber-700 bg-gray-50">{formatRupiah(skpd.honorer.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
