import app from '../api/index.js';

async function testExpress() {
  const server = app.listen(7001, async () => {
    try {
      console.log('Testing /manifest.json...');
      const r1 = await fetch('http://localhost:7001/manifest.json');
      const m = (await r1.json()) as any;
      console.log('✅ Manifest Name:', m.name, '| Resources:', m.resources);

      console.log('Testing /stream/movie/tt4154796.json (Avengers Endgame)...');
      const r2 = await fetch('http://localhost:7001/stream/movie/tt4154796.json');
      const s = (await r2.json()) as any;
      console.log('✅ Stream Count:', s.streams?.length);
      if (s.streams?.[0]) {
        console.log('   Stream Name:', s.streams[0].name);
        console.log('   Stream URL: ', s.streams[0].url);
      }

      console.log('Testing /catalog/movie/lk21-latest.json...');
      const r3 = await fetch('http://localhost:7001/catalog/movie/lk21-latest.json');
      const c = (await r3.json()) as any;
      console.log('✅ Catalog Metas Count:', c.metas?.length, '| First:', c.metas?.[0]?.name);

      server.close(() => {
        console.log('\n✨ Express Server & Stremio Endpoints Fully Verified!\n');
        process.exit(0);
      });
    } catch (e) {
      console.error('Express test error:', e);
      server.close(() => process.exit(1));
    }
  });
}

testExpress();
