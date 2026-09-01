const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add multiSchema previewFeature
if (!code.includes('"multiSchema"')) {
    code = code.replace(/provider\s*=\s*"prisma-client-js"/, 'provider = "prisma-client-js"\n  previewFeatures = ["multiSchema"]');
}

// Add schemas to datasource
if (!code.includes('schemas   = ["public", "auth"]')) {
    code = code.replace(/directUrl\s*=\s*env\("DIRECT_URL"\)/, 'directUrl = env("DIRECT_URL")\n  schemas   = ["public", "auth"]');
}

// Add @@schema("public") to all models that don't have it
const lines = code.split('\n');
let outLines = [];
let inModel = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^model\s+\w+\s*\{/)) {
        inModel = true;
        braceCount = 1;
        outLines.push(line);
        continue;
    }
    
    if (inModel) {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) {
            braceCount--;
            if (braceCount === 0) {
                // before closing brace, check if we need to add @@schema
                let modelBody = outLines.slice(outLines.lastIndexOf(outLines.find(l => l.match(/^model\s+/)))).join('\n');
                if (!modelBody.includes('@@schema("public")')) {
                    outLines.push('  @@schema("public")');
                }
                inModel = false;
            }
        }
    }
    outLines.push(line);
}

fs.writeFileSync('prisma/schema.prisma', outLines.join('\n'));
console.log("Updated schema.prisma");
