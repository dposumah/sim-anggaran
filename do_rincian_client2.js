const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');

const regexTabs = /\[\s*\{\s*id:\s*'rincian',\s*label:\s*'Daftar Rincian',\s*icon:\s*Layers\s*\},/;
const newTabs = `[
            { id: 'rincian', label: 'Daftar Rincian', icon: Layers },
            { id: 'detail', label: 'Rincian Detail (Spesifikasi)', icon: FileText },`;

if (!code.includes('Rincian Detail (Spesifikasi)')) {
    code = code.replace(regexTabs, newTabs);
    console.log("Replaced tabs");
}

const detailTabContent = `
        {activeTab === 'detail' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rincian Detail (Spesifikasi)</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow ring-1 ring-black ring-opacity-5">
              <table className="min-w-full divide-y divide-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Uraian / Rekening</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Spesifikasi Item</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-900">Koefisien</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-900">Satuan</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-900">Harga Satuan</th>
                    <th className="px-4 py-3 text-right font-semibold text-blue-700">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rincianList.flatMap((r) => 
                    (r.rincianItemBelanjas || []).map((item: any) => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={r.namaPaket || r.rekening?.nama}>
                          <div className="font-medium text-xs">{r.rekening?.kode}</div>
                          <div className="text-xs text-gray-500">{r.namaPaket || r.rekening?.nama}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          <div className="font-medium">{item.uraian}</div>
                          {item.spesifikasi && item.spesifikasi !== '-' && (
                            <div className="text-gray-500 text-xs mt-0.5">{item.spesifikasi}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.koefisien}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.satuan}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(Number(item.hargaSatuan))}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{formatRupiah(Number(item.jumlah))}</td>
                      </tr>
                    ))
                  )}
                  {rincianList.every(r => !r.rincianItemBelanjas || r.rincianItemBelanjas.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                        Belum ada data rincian spesifikasi untuk sub kegiatan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}`;

const regexContent = /(\{\s*activeTab\s*===\s*'rincian'\s*&&\s*\([\s\S]*?RincianTable[\s\S]*?\/\>\s*\)\})/;
if (!code.includes("activeTab === 'detail'")) {
    code = code.replace(regexContent, "$1" + detailTabContent);
    console.log("Replaced content");
}

fs.writeFileSync('src/app/explorer/[id]/RincianClient.tsx', code);
