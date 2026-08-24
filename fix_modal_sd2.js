const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/page.tsx', 'utf8');

const regex = /<tbody className="bg-white divide-y divide-gray-200">[\s\S]*?<\/tbody>/;

const replacementModal = `<tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(modalSdData.sumberDanas).map(([sd, data]: [string, any]) => {
                      const paguAwal = data.paguInduk !== undefined ? data.paguInduk : (data.pagu || 0);
                      const paguAkhir = data.paguPerubahan !== undefined && data.paguPerubahan !== null ? data.paguPerubahan : paguAwal;
                      const selisih = paguAkhir - paguAwal;
                      return (
                        <tr key={sd} className="hover:bg-blue-50/30">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={sd}>{sd}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{formatRupiah(paguAwal)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                            {formatRupiah(paguAkhir)}
                          </td>
                          <td className={\`px-4 py-3 text-sm text-right font-bold \${selisih > 0 ? 'text-green-600' : selisih < 0 ? 'text-red-600' : 'text-gray-400'}\`}>
                            {selisih > 0 ? '+' + formatRupiah(selisih) : formatRupiah(selisih)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>`;

if (code.includes('formatRupiah(data.pagu)')) {
    code = code.replace(regex, replacementModal);
    fs.writeFileSync('src/app/explorer/page.tsx', code);
    console.log("Fixed NaN modal in page.tsx via regex");
} else {
    console.log("Already fixed");
}
