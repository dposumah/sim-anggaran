'use client';

import { useState } from 'react';
import { useYear } from '@/contexts/YearContext';
import LaporanEksekutif from './LaporanEksekutif';
import RekapitulasiProgram from './RekapitulasiProgram';
import { FileText, Database } from 'lucide-react';

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'eksekutif' | 'rekap'>('eksekutif');

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan & Rekapitulasi</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan eksekutif dan rekapitulasi data anggaran</p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md p-1 rounded-lg inline-flex shadow-sm border border-gray-100 flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('eksekutif')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'eksekutif'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:text-primary hover:bg-red-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Laporan Eksekutif
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'rekap'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:text-primary hover:bg-red-50'
          }`}
        >
          <Database className="w-4 h-4" />
          Rekapitulasi Program
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'eksekutif' && <LaporanEksekutif />}
        {activeTab === 'rekap' && <RekapitulasiProgram />}
      </div>
    </div>
  );
}
