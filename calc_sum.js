const fs = require('fs');
const text = fs.readFileSync('output_asn.txt', 'utf8');
let sum = 0;
text.split('\n').forEach(line => {
    if (line.includes('=>')) {
        let val = parseFloat(line.split('=>')[1].trim());
        if (isNaN(val)) {
            console.log('NaN found at:', line);
        } else {
            sum += val;
        }
    }
});
console.log('Calculated Sum:', sum);
