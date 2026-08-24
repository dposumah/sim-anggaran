const fs = require('fs');
let code = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');

code = code.replace('const [isSaving, setIsSaving] = useState(false);', 'const [isSaving, setIsSaving] = useState(false);\n  const [tahapan, setTahapan] = useState("perubahan");');

fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', code);
console.log("Fixed state");
