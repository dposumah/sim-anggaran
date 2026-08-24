const fs = require('fs');
let code = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');

const dropdownHTML = `
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800">Tahapan Anggaran</h3>
          <p className="text-sm text-gray-500">Pilih tahapan untuk file PDF yang akan diupload</p>
        </div>
        <select 
          value={tahapan}
          onChange={(e) => setTahapan(e.target.value)}
          className="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
        >
          <option value="induk">Pagu Induk (Awal)</option>
          <option value="rkpd">Pagu RKPD</option>
          <option value="perubahan">Pagu Perubahan</option>
        </select>
      </div>
`;

// Add tahapan state
if (!code.includes('const [tahapan')) {
    code = code.replace('const [uploading, setUploading] = useState(false);', 'const [uploading, setUploading] = useState(false);\n  const [tahapan, setTahapan] = useState("perubahan");');
}

// Add UI
if (!code.includes('Tahapan Anggaran')) {
    code = code.replace('<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">', '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">\n' + dropdownHTML);
}

// Update fetch for save-pdf-rincian
if (code.includes('JSON.stringify({')) {
    code = code.replace(/body: JSON\.stringify\(\{\s*subKegiatan: (.*?),/g, 'body: JSON.stringify({\n                    tahapan: tahapan,\n                    subKegiatan: $1,');
}

fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', code);
console.log("Updated page.tsx");
