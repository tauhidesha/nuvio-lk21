const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'providers', 'lk21.source.js');
const outputFile = path.join(__dirname, 'providers', 'lk21.js');

async function build() {
  if (!fs.existsSync(inputFile)) {
    // If lk21.source.js doesn't exist yet, copy lk21.js to lk21.source.js
    fs.copyFileSync(outputFile, inputFile);
  }

  console.log('🔄 Bundling and transpiling providers/lk21.source.js for Nuvio (Hermes target: es2016)...');

  try {
    await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      format: 'cjs',
      platform: 'neutral',
      target: 'es2016', // Transpiles async/await to generator helpers for Hermes compatibility
      minify: false,
      banner: {
        js: `/**\n * LK21 & Nontondrama Provider for Nuvio (Android TV)\n * Bundled & Transpiled for Hermes Engine\n * Updated: ${new Date().toISOString()}\n */`,
      },
    });

    const stats = fs.statSync(outputFile);
    console.log(`✅ providers/lk21.js ready (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

build();
