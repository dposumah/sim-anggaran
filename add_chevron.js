const fs = require('fs');
let code = fs.readFileSync('src/components/RincianTable.tsx', 'utf8');

const target3 = `                    <td className="px-4 py-2 text-gray-700">
                      <div className="font-medium text-xs">{r.rekening?.kode}</div>
                      <div className="text-xs text-gray-500 max-w-[200px]" title={r.rekening?.nama}>
                        {r.rekening?.nama}
                      </div>
                    </td>`;

const replacement3 = `                    <td className="px-4 py-2 text-gray-700">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {expandedRows.includes(r.id) ? (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-gray-400 rotate-90" style={{ transform: 'rotate(90deg)' }} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{r.rekening?.kode}</div>
                          <div className="text-xs text-gray-500 max-w-[180px]" title={r.rekening?.nama}>
                            {r.rekening?.nama}
                          </div>
                        </div>
                      </div>
                    </td>`;

code = code.replace(target3, replacement3);
fs.writeFileSync('src/components/RincianTable.tsx', code);
console.log("Updated Chevron in RincianTable");
