/**
 * Minify all scripts/**\/*.js → assets/js/**\/*.min.js
 * Handles subdirectories: scripts/features/, scripts/ui/, etc.
 * Run: node build-min.js
 */
const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'scripts');
const OUT_DIR = path.join(__dirname, 'assets', 'js');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

/** Рекурсивно собирает все .js файлы из директории. */
function collectJsFiles(dir, base) {
    base = base || dir;
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(collectJsFiles(fullPath, base));
        } else if (entry.name.endsWith('.js')) {
            results.push(path.relative(base, fullPath));
        }
    }
    return results;
}

const files = collectJsFiles(SRC_DIR);

async function run() {
    let totalOrig = 0, totalMin = 0;
    console.log('Minifying scripts (including subdirectories)...\n');

    for (const relFile of files) {
        const srcPath = path.join(SRC_DIR, relFile);
        const outRelFile = relFile.replace('.js', '.min.js');
        const outPath = path.join(OUT_DIR, outRelFile);

        // Ensure output subdirectory exists
        const outSubDir = path.dirname(outPath);
        if (!fs.existsSync(outSubDir)) fs.mkdirSync(outSubDir, { recursive: true });

        const src = fs.readFileSync(srcPath, 'utf8');

        try {
            const result = await minify(src, {
                compress: {
                    drop_console: false,    // keep console.error / console.warn
                    passes: 2
                },
                mangle: true,
                format: { comments: false }
            });

            // Fix relative module import paths: ./foo.js → ./foo.min.js
            const patched = result.code.replace(
                /from\s*["']\.\/([^"']+?)\.js["']/g,
                (_, name) => `from "./${name}.min.js"`
            );

            fs.writeFileSync(outPath, patched, 'utf8');

            const origKB = (src.length / 1024).toFixed(1);
            const minKB  = (result.code.length / 1024).toFixed(1);
            const saved  = Math.round((1 - result.code.length / src.length) * 100);
            totalOrig += src.length;
            totalMin  += result.code.length;
            console.log(`  ${relFile.padEnd(35)} ${origKB.padStart(7)} KB → ${minKB.padStart(6)} KB  (-${saved}%)`);
        } catch (err) {
            console.error(`  ERROR ${relFile}: ${err.message}`);
        }
    }

    const totalSaved = Math.round((1 - totalMin / totalOrig) * 100);
    console.log(`\n${'TOTAL'.padEnd(35)} ${(totalOrig/1024).toFixed(1).padStart(7)} KB → ${(totalMin/1024).toFixed(1).padStart(6)} KB  (-${totalSaved}%)`);
    console.log('\nMinified files saved to assets/js/ (including subdirectories)');
}

run().catch(console.error);

