'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Folder, 
  FileText, 
  FileJson,
  Banknote
} from 'lucide-react';
import RincianTable from '@/components/RincianTable';

export default function ExplorerPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [rincianData, setRincianData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch('/api/explorer/tree')
      .then(res => res.json())
      .then(data => {
        setTreeData(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

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
          
          <div className="text-right">
            <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
              {formatRupiah(item.totalPagu)}
            </span>
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
                    onUpdate={() => {
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
    </div>
  );
}
