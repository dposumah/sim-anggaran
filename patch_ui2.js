const fs = require('fs');
let code = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');

const targetStr = 'return (';
const insertIndex = code.indexOf(targetStr);

const totalPdf = "\n  const totalPdf = items.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);\n  const existingPagu = parsedData?.existingPagu || 0;\n  const isPaguMatch = totalPdf === existingPagu;\n";

code = code.substring(0, insertIndex) + totalPdf + '  ' + code.substring(insertIndex);

const warningUI = 
      {parsedData && existingPagu > 0 && !isPaguMatch && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold">Peringatan: Pagu Tidak Sesuai!</h3>
            <p className="text-red-700 text-sm mt-1">
              Total Rincian Belanja di PDF (<strong>{formatCurrency(totalPdf)}</strong>) berbeda dengan Pagu Sub Kegiatan yang ada di sistem (<strong>{formatCurrency(existingPagu)}</strong>).
              <br/>Mohon pastikan Anda mengunggah file PDF yang benar atau perbarui Pagu Excel Anda.
            </p>
          </div>
        </div>
      )}
      
      {parsedData && existingPagu > 0 && isPaguMatch && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-start gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="text-green-800 font-semibold">Pagu Sesuai</h3>
            <p className="text-green-700 text-sm mt-1">
              Total Rincian Belanja di PDF (<strong>{formatCurrency(totalPdf)}</strong>) sama dengan Pagu di sistem.
            </p>
          </div>
        </div>
      )}
;

code = code.replace(
  '      <div className="flex items-center gap-4 mb-6">',
  '      <div className="flex items-center gap-4 mb-6">'
);
code = code.replace(
  '{!parsedData ? (',
  warningUI + '\n      {!parsedData ? ('
);

fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', code);
