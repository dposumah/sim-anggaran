const fs = require('fs');
const PDFParser = require('pdf2json');
const pdfParser = new PDFParser(); 
const textContent = fs.readFileSync('test_route.js', 'utf8');
const match = textContent.match(/pdfParser\.on\('pdfParser_dataReady', pdfData => \{([\s\S]+?)\}\);\s*pdfParser\.loadPDF/);
let logic = match[1];
logic = logic.replace(/items\.push\(finalItem\);/, 'finalItem.isStandar = true; items.push(finalItem);');
let fullScript = `
const fs = require('fs');
const PDFParser = require('pdf2json');
const pdfParser = new PDFParser(); 

function cleanNumber(str) { return parseFloat(str.replace(/\\./g, '').replace(',', '.')); }

pdfParser.on('pdfParser_dataReady', pdfData => {
    let currentRekening = '5.1.02...';
    let currentNamaRekening = '';
    let currentPaket = '-';
    let currentSumberDana = '-';
    let items = [];
    ${logic}
    let itemsClean = items.filter(i=>!i.uraian.includes('5 BELANJA') && !i.uraian.includes('Capaian Program') && !i.isStandar);
    let total = itemsClean.reduce((sum, item) => sum + (item.tempJumlah || item.jumlah || 0), 0);
    console.log("ITEMS NON-STANDAR:", itemsClean.length);
    console.log("TOTAL NON-STANDAR:", total);
});
pdfParser.loadPDF(process.argv[2]);
`;
fs.writeFileSync('run_test.js', fullScript);
