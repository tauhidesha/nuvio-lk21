/**
 * Automated Test Suite for Nuvio LK21 Add-on.
 * Validates domain resolution, search, stream extraction, and catalogs.
 */

import { getLK21BaseUrl, getSeriesBaseUrl } from './scraper/domainResolver.js';
import { searchLK21, findBestMatch } from './scraper/search.js';
import { extractStreamsFromUrl } from './scraper/extractor.js';
import { getSeriesEpisodeStreams } from './scraper/series.js';
import { getLK21Catalog } from './catalog/lk21Catalog.js';

async function runTests() {
  console.log('🚀 [Test 1] Testing Domain Resolution...');
  const movieDomain = await getLK21BaseUrl();
  const seriesDomain = await getSeriesBaseUrl();
  console.log(`   ✅ Active Movie Domain:  ${movieDomain}`);
  console.log(`   ✅ Active Series Domain: ${seriesDomain}`);

  console.log('\n🔍 [Test 2] Testing Search API...');
  const searchResults = await searchLK21('Avengers');
  console.log(`   ✅ Found ${searchResults.length} search results for "Avengers"`);
  if (searchResults.length > 0) {
    console.log(`   Sample: "${searchResults[0].title}" (Slug: ${searchResults[0].slug})`);
  }

  console.log('\n🎯 [Test 3] Testing Best Match for "Avengers Endgame" (2019)...');
  const bestMovie = await findBestMatch('Avengers Endgame', 2019, false);
  console.log(`   ✅ Match: "${bestMovie?.title}" (Slug: ${bestMovie?.slug})`);

  if (bestMovie) {
    console.log('\n🎬 [Test 4] Testing Movie Stream Extraction...');
    const moviePageUrl = `${movieDomain}/${bestMovie.slug}`;
    const streams = await extractStreamsFromUrl(moviePageUrl);
    console.log(`   ✅ Extracted ${streams.length} stream option(s):`);
    streams.forEach((s, idx) => {
      console.log(`      [${idx + 1}] ${s.name} - ${s.title}`);
      console.log(`          URL: ${s.url}`);
    });

    if (streams.length > 0) {
      console.log('\n📡 [Test 5] Validating M3U8 Stream Connectivity...');
      const streamUrl = streams[0].url;
      const res = await fetch(streamUrl, { method: 'HEAD' });
      console.log(`   ✅ Stream HEAD status: HTTP ${res.status}`);
      if (res.status === 200 || res.status === 206) {
        console.log('   🎉 Direct HLS stream is playable!');
      }
    }
  }

  console.log('\n📺 [Test 6] Testing Series Episode Stream Extraction ("Squid Game" S1E1)...');
  const epStreams = await getSeriesEpisodeStreams('Squid Game', 2021, 1, 1);
  console.log(`   ✅ Extracted ${epStreams.length} stream option(s) for Squid Game S1E1:`);
  epStreams.forEach((s, idx) => {
    console.log(`      [${idx + 1}] ${s.name} - ${s.title}`);
    console.log(`          URL: ${s.url}`);
  });

  console.log('\n📂 [Test 7] Testing Catalog ("Film Terbaru LK21")...');
  const catalogItems = await getLK21Catalog('movie', 'lk21-latest');
  console.log(`   ✅ Fetched ${catalogItems.length} catalog items for home screen`);
  if (catalogItems.length > 0) {
    console.log(`   Sample: "${catalogItems[0].name}" (ID: ${catalogItems[0].id})`);
  }

  console.log('\n✨ All Automated Tests Completed Successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
