const fs = require('fs');
const text = fs.readFileSync('output_asn.txt', 'utf8');
let sum = 0;
text.split('\n').forEach(line => {
    if (line.includes('=>')) {
        let parts = line.split('=>');
        let valStr = parts[1].trim();
        let val = parseFloat(valStr);
        // console.log(valStr, val);
        sum += val;
    }
});
console.log('Total Sum:', sum);
