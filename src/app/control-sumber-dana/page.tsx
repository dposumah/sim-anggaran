'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Database, Save, Loader2 } from 'lucide-react';

interface ExcelDataRow {
  'NAMA SKPD': string;
  'KODE SUMBER DANA': string;
  'NAMA SUMBER DANA': string;
  'PAGU': number | string;
}

interface SystemSumberDana {
  sumberDanaId: number;
  kode: string;
  nama: string;
  ceilingAmount: number; // Dari database (diinput user)
  excelAmount: number;   // Dari rincian di database
  isSaving?: boolean;
  breakdown?: { subKegiatan: string; kodeSubKegiatan: string; rincian: string; pagu: number }[];
}

export default function ControlSumberDanaPage() {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [sumberDanas, setSumberDanas] = useState<SystemSumberDana[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [skpdInfo, setSkpdInfo] = useState<{id: number, kode: string, nama: string, tahunId: number} | null>(null);

  const [modalData, setModalData] = useState<{
    title: string;
    namaSd: string;
    breakdown: { subKegiatan: string; kodeSubKegiatan: string; rincian: string; pagu: number }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSystemData = async () => {
    setIsLoadingSystem(true);
    try {
      const response = await fetch('/api/control-sumber-dana');
      if (!response.ok) throw new Error('Gagal mengambil data sistem');
      const data = await response.json();
      
      const formattedData = data.data.map((item: any) => ({
        ...item,
        excelAmount: item.excelAmount || 0,
        breakdown: item.breakdown || []
      }));

      setSumberDanas(formattedData);
      setSkpdInfo(data.skpd);
    } catch (err: unknown) {
      console.error(err);
      setError('Gagal mengambil data dari database sistem.');
    } finally {
      setIsLoadingSystem(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);



  const handleCeilingChange = (kode: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numValue)) return;
    
    setSumberDanas(prev => prev.map(sd => 
      sd.kode === kode ? { ...sd, ceilingAmount: numValue } : sd
    ));
  };

  const saveCeiling = async (sd: SystemSumberDana) => {
    if (!skpdInfo) return;
    
    setSumberDanas(prev => prev.map(item => item.kode === sd.kode ? { ...item, isSaving: true } : item));
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/control-sumber-dana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skpdId: skpdInfo.id,
          tahunId: skpdInfo.tahunId,
          sumberDanaId: sd.sumberDanaId,
          ceilingAmount: sd.ceilingAmount
        })
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      setSuccessMsg(`Pagu untuk ${sd.nama} berhasil disimpan.`);
    } catch (err) {
      setError(`Gagal menyimpan Pagu untuk ${sd.nama}.`);
    } finally {
      setSumberDanas(prev => prev.map(item => item.kode === sd.kode ? { ...item, isSaving: false } : item));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Control Pagu Sumber Dana</h2>
        <p className="text-gray-500 mt-1">Input target Pagu Sumber Dana dan pantau realisasinya berdasarkan input rincian di Budget Explorer.</p>
      </div>

      {isLoadingSystem && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 flex items-center">
          <Database className="h-5 w-5 mr-2 animate-pulse" />
          Sedang mengambil data sistem saat ini...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMsg}
        </div>
      )}



      {!isLoadingSystem && sumberDanas.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Form Pagu & Perbandingan</h3>
            {skpdInfo && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {skpdInfo.kode} - {skpdInfo.nama}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/3">Sumber Dana</th>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 w-64">Pagu Sistem (Target)</th>
                  <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total Terinput (Rincian)</th>
                  <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Selisih</th>
                  <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sumberDanas
                  .filter((sd) => sd.ceilingAmount > 0 || sd.excelAmount > 0)
                  .map((sd) => {
                  const variance = sd.ceilingAmount - sd.excelAmount;
                  
                  return (
                    <tr key={sd.kode} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-900">{sd.kode}</div>
                        <div className="text-gray-500">{sd.nama}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                            value={sd.ceilingAmount === 0 ? '' : sd.ceilingAmount}
                            onChange={(e) => handleCeilingChange(sd.kode, e.target.value)}
                            placeholder="Rp 0"
                          />
                          <button
                            onClick={() => saveCeiling(sd)}
                            disabled={sd.isSaving}
                            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            title="Simpan Pagu"
                          >
                            {sd.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-blue-600" />}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(sd.ceilingAmount)}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                        {sd.excelAmount > 0 ? (
                          <button
                            onClick={() => setModalData({
                              title: `Rincian Penggunaan Sumber Dana`,
                              namaSd: `${sd.kode} - ${sd.nama}`,
                              breakdown: sd.breakdown || []
                            })}
                            className="text-blue-700 hover:text-blue-900 hover:underline focus:outline-none"
                            title="Lihat Breakdown Rincian"
                          >
                            {formatCurrency(sd.excelAmount)}
                          </button>
                        ) : (
                          <span>{formatCurrency(sd.excelAmount)}</span>
                        )}
                      </td>
                      <td className={`px-4 py-4 text-right text-sm font-bold ${variance === 0 && sd.excelAmount > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : variance > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        {sd.excelAmount === 0 && sd.ceilingAmount === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : variance === 0 ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Sesuai (Balance)</span>
                        ) : variance < 0 ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Defisit (Rincian Berlebih)</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Sisa Pagu (Sistem Lebih Besar)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                {(() => {
                  const filtered = sumberDanas.filter((sd) => sd.ceilingAmount > 0 || sd.excelAmount > 0);
                  const totalSistem = filtered.reduce((sum, sd) => sum + sd.ceilingAmount, 0);
                  const totalExcel = filtered.reduce((sum, sd) => sum + sd.excelAmount, 0);
                  const totalSelisih = totalSistem - totalExcel;
                  return (
                    <tr>
                      <td className="px-4 py-4 text-sm font-bold text-blue-900 text-right uppercase tracking-wider">Total Keseluruhan</td>
                      <td className="px-4 py-4 text-sm font-bold text-blue-900">
                        <div className="text-xs text-blue-600/80 mb-1 font-semibold uppercase">Total Pagu Sistem</div>
                        {formatCurrency(totalSistem)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-blue-900">
                        <div className="text-xs text-blue-600/80 mb-1 font-semibold uppercase">Total Pagu Rincian</div>
                        {formatCurrency(totalExcel)}
                      </td>
                      <td className={`px-4 py-4 text-right text-sm font-bold ${totalSelisih === 0 && totalExcel > 0 ? 'text-green-600' : totalSelisih < 0 ? 'text-red-600' : totalSelisih > 0 ? 'text-orange-600' : 'text-blue-900'}`}>
                        <div className="text-xs text-blue-600/80 mb-1 font-semibold uppercase">Total Selisih</div>
                        {totalSelisih > 0 ? '+' : ''}{formatCurrency(totalSelisih)}
                      </td>
                      <td className="px-4 py-4 text-center"></td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Breakdown */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{modalData.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{modalData.namaSd}</p>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto">
              {modalData.breakdown.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Tidak ada rincian paket ditemukan untuk sumber dana ini.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100/50 text-gray-700 sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Sub Kegiatan</th>
                      <th className="px-6 py-3 font-semibold">Nama Rincian (Paket)</th>
                      <th className="px-6 py-3 font-semibold text-right w-48">Pagu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalData.breakdown
                      .sort((a, b) => a.kodeSubKegiatan.localeCompare(b.kodeSubKegiatan) || b.pagu - a.pagu)
                      .map((b, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="text-xs text-gray-500">{b.kodeSubKegiatan}</div>
                          <div className="font-medium text-gray-800 line-clamp-2" title={b.subKegiatan}>{b.subKegiatan}</div>
                        </td>
                        <td className="px-6 py-3 text-gray-700">{b.rincian}</td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(b.pagu)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50/80 sticky bottom-0 border-t border-blue-200">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 font-bold text-blue-900 text-right uppercase tracking-wider text-xs">Total:</td>
                      <td className="px-6 py-3 text-right font-bold text-blue-700">
                        {formatCurrency(modalData.breakdown.reduce((sum, item) => sum + item.pagu, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
