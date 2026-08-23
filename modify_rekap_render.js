const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');

const target2 = `        {activeTab === 'sd' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rekapitulasi Berdasarkan Sumber Dana</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Sumber Dana</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Pagu Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapSd.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.nama}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(r.pagu)}</td>
                    </tr>
                  ))}
                  {rekapSd.length === 0 && (
                    <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapSd.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}`;

const replacement2 = `        {activeTab === 'sd' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rekapitulasi Berdasarkan Sumber Dana</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Sumber Dana</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Pagu Induk (Sebelum)</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Pagu RKPD</th>
                    <th className="px-6 py-3 text-right font-semibold text-primary">Pagu Perubahan</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Selisih</th>
                    <th className="px-6 py-3 text-right font-semibold text-green-700">Realisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rekapSd.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-700">{r.nama}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatRupiah(r.paguInduk)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatRupiah(r.paguRkpd)}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-700">{formatRupiah(r.paguPerubahan)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-700">{r.selisih > 0 ? '+' : ''}{formatRupiah(r.selisih)}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-700">{formatRupiah(r.realisasi)}</td>
                    </tr>
                  ))}
                  {rekapSd.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapSd.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapSd.reduce((acc, curr) => acc + curr.paguInduk, 0))}</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapSd.reduce((acc, curr) => acc + curr.paguRkpd, 0))}</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapSd.reduce((acc, curr) => acc + curr.selisih, 0))}</th>
                      <th className="px-6 py-3 text-right font-bold text-green-800">{formatRupiah(totalRealisasi)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/app/explorer/[id]/RincianClient.tsx', code);
console.log("Updated rekapSd table rendering");
