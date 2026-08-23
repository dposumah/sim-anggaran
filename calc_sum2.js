const fs = require('fs');
const text = fs.readFileSync('output_asn.txt', 'utf8');
let sum = 0;
let nanLines = [];
text.split('\n').forEach(line => {
    if (line.includes('=>')) {
        let val = parseFloat(line.split('=>')[1].trim());
        if (isNaN(val)) {
            nanLines.push(line);
        } else {
            sum += val;
        }
    }
});
console.log('NaN Lines:', nanLines);
console.log('Calculated Sum:', sum);
