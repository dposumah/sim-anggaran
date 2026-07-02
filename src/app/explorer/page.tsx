'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Folder, 
  FileText, 
  FileJson,
  Banknote,
  X
} from 'lucide-react';
import RincianTable from '@/components/RincianTable';
import { useYear } from '@/contexts/YearContext';

export default function ExplorerPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [modalSdData, setModalSdData] = useState<{ title: string, sumberDanas: Record<string, { pagu: number, paguPerubahan: number | null }> } | null>(null);
  const [rincianData, setRincianData] = useState<Record<string, any[]>>({});
  const { tahun } = useYear();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/explorer/tree?tahun=${tahun}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTreeData(data);
        } else {
          console.error(data.error);
          setTreeData([]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [tahun]);

  const toggleNode = async (type: string, id: number) => {
    const key = `${type}_${id}`;
    const newExpanded = new Set(expandedNodes);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
      setExpandedNodes(newExpanded);
      return;
    }

    newExpanded.add(key);
    setExpandedNodes(newExpanded);

    // If it's a subkegiatan, we need to fetch the Rincian (lazy load)
    if (type === 'subkegiatan' && !rincianData[key]) {
      try {
        const res = await fetch(`/api/explorer?level=rincian&subKegiatanId=${id}`);
        const data = await res.json();
        setRincianData(prev => ({ ...prev, [key]: data }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const renderRow = (item: any, type: string, depth: number) => {
    const key = `${type}_${item.id}`;
    const isExpanded = expandedNodes.has(key);
    
    let Icon = Building;
    if (type === 'program') Icon = Folder;
    if (type === 'kegiatan') Icon = FileText;
    if (type === 'subkegiatan') Icon = FileJson;
    
    let code = item.kode;
    if (type === 'skpd') code = item.kodeSubUnit;

    let name = item.nama;
    if (type === 'skpd' && item.nama !== item.namaSubUnit) {
      name = `${item.nama} - ${item.namaSubUnit}`;
    }

    return (
      <div key={key}>
        <div 
          className={`flex items-center p-3 border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${depth === 0 ? 'bg-gray-50/50' : ''}`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
          onClick={() => toggleNode(type, item.id)}
        >
          <div className="w-6 flex justify-center mr-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <Icon className={`w-5 h-5 mr-3 ${depth === 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          
          <div className="flex-1">
            <span className="font-medium text-gray-700 mr-2">{code}</span>
            <span className={`text-gray-900 ${depth === 0 ? 'font-semibold' : ''}`}>{name}</span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {item.totalPaguPerubahan !== undefined && item.totalPaguPerubahan !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 line-through" title="Pagu Induk">
                  {formatRupiah(item.totalPagu)}
                </span>
                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 shadow-sm" title="Pagu Perubahan">
                  {formatRupiah(item.totalPaguPerubahan)}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                {formatRupiah(item.totalPagu)}
              </span>
            )}
            {item.sumberDanas && Object.entries(item.sumberDanas).length > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setModalSdData({ title: `Rekap SD - ${name}`, sumberDanas: item.sumberDanas });
                }}
                className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
              >
                Lihat Rekap SD
              </button>
            )}
          </div>

          {type === 'subkegiatan' && item.is_locked && (
            <span className="ml-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
              Terkunci
            </span>
          )}
        </div>

        {isExpanded && (
          <div>
            {type === 'skpd' && item.programs?.map((p: any) => renderRow(p, 'program', depth + 1))}
            {type === 'program' && item.kegiatans?.map((k: any) => renderRow(k, 'kegiatan', depth + 1))}
            {type === 'kegiatan' && item.subKegiatans?.map((s: any) => renderRow(s, 'subkegiatan', depth + 1))}
            {type === 'subkegiatan' && (
              <div className="bg-gray-50 border-b border-gray-200">
                {!rincianData[key] ? (
                  <div className="p-4 text-center text-sm text-gray-500">Memuat rincian...</div>
                ) : (
                  <RincianTable 
                    rincianList={rincianData[key]} 
                    subKegiatanId={item.id}
                    isLocked={item.is_locked}
                    onRefresh={() => {
                      // Trigger a re-fetch of rincian only
                      fetch(`/api/explorer?level=rincian&subKegiatanId=${item.id}`)
                        .then(res => res.json())
                        .then(data => setRincianData(prev => ({ ...prev, [key]: data })));
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Folder className="w-6 h-6 text-primary" /> Budget Explorer
        </h1>
        <p className="text-sm text-secondary">Telusuri hierarki anggaran mulai dari SKPD hingga rincian belanja.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Memuat seluruh hierarki anggaran...
          </div>
        ) : (
          <div className="min-w-full">
            {treeData.map(skpd => renderRow(skpd, 'skpd', 0))}
            {treeData.length === 0 && (
              <div className="p-12 text-center text-gray-500">Tidak ada data SKPD.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal Rekap Sumber Dana */}
      {modalSdData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 truncate pr-4">{modalSdData.title}</h3>
              <button 
                onClick={() => setModalSdData(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {Object.entries(modalSdData.sumberDanas).map(([sd, data]) => (
                  <div key={sd} className="flex justify-between items-center p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">{sd}</span>
                    {data.paguPerubahan !== null ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-gray-500 line-through">{formatRupiah(data.pagu)}</span>
                        <span className="text-sm font-bold text-blue-700">{formatRupiah(data.paguPerubahan)}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-blue-700">{formatRupiah(data.pagu)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setModalSdData(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
