const fs = require('fs');
function addChevron(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    const regex = /<td className="px-4 py-3 text-gray-800 align-top">\s*\{r\.subKegiatan\}\s*<\/td>/;
    const rep = `<td className="px-4 py-3 text-gray-800 align-top">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {expandedRows.includes(i) ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" style={{ transform: 'rotate(-90deg)' }} />
                                  )}
                                </div>
                                <div>{r.subKegiatan}</div>
                              </div>
                            </td>`;
    if(regex.test(code)) {
        code = code.replace(regex, rep);
        fs.writeFileSync(filename, code);
        console.log("Updated chevron in " + filename);
    }
}
addChevron('src/app/laporan/LaporanPerbandingan.tsx');
addChevron('src/app/laporan/LaporanEksekutif.tsx');
