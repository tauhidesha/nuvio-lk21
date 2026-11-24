/**
 * Vercel Serverless Entrypoint & Express Addon Router.
 * Implements Stremio / Nuvio Addon Protocol.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { manifest } from '../src/manifest.js';
import { getLK21BaseUrl, getSeriesBaseUrl } from '../src/scraper/domainResolver.js';
import { getMediaMeta } from '../src/meta/cinemeta.js';
import { findBestMatch, searchLK21 } from '../src/scraper/search.js';
import { extractStreamsFromUrl, extractStreamsFromHtml, StreamOption } from '../src/scraper/extractor.js';
import { getSeriesEpisodeStreams } from '../src/scraper/series.js';
import { getLK21Catalog } from '../src/catalog/lk21Catalog.js';
import { dashboardHtml } from '../src/public/dashboardHtml.js';

const app = express();

// Enable CORS for all domains
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  })
);

app.use(express.json());

// Main Stremio & API Router
const router = express.Router();

// 1. Stremio Manifest
router.get('/manifest.json', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'max-age=86400, public');
  res.json(manifest);
});

// 2. Stremio Catalogs
router.get('/catalog/:type/:id.json', async (req: Request, res: Response) => {
  const { type, id } = req.params;
  try {
    const metas = await getLK21Catalog(type as 'movie' | 'series', id);
    res.setHeader('Cache-Control', 'max-age=1800, public');
    res.json({ metas });
  } catch (err) {
    console.error('[Catalog Error]:', err);
    res.json({ metas: [] });
  }
});

router.get('/catalog/:type/:id/:extra.json', async (req: Request, res: Response) => {
  const { type, id, extra } = req.params;
  try {
    const extraParams: { search?: string; skip?: number } = {};
    if (extra) {
      const parts = extra.split('&');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 'search') extraParams.search = decodeURIComponent(v || '');
        if (k === 'skip') extraParams.skip = parseInt(v, 10);
      }
    }

    const metas = await getLK21Catalog(type as 'movie' | 'series', id, extraParams);
    res.setHeader('Cache-Control', 'max-age=1800, public');
    res.json({ metas });
  } catch (err) {
    console.error('[Catalog Extra Error]:', err);
    res.json({ metas: [] });
  }
});

// 3. Stremio Streams Handler
router.get('/stream/:type/:id.json', async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const cleanId = id.replace('.json', '');

  console.log(`[Stream Request] Type: ${type}, ID: ${cleanId}`);

  try {
    let streams: StreamOption[] = [];

    // Case A: Direct LK21 ID from our catalog (e.g. lk21:avengers-endgame-2019)
    if (cleanId.startsWith('lk21:')) {
      const slug = cleanId.replace('lk21:', '');
      const baseUrl = type === 'series' ? await getSeriesBaseUrl() : await getLK21BaseUrl();
      const pageUrl = `${baseUrl}/${slug}`;
      streams = await extractStreamsFromUrl(pageUrl);
    }
    // Case B: TV Series with season and episode (e.g. tt0903747:1:1)
    else if (type === 'series') {
      const idParts = cleanId.split(':');
      const baseId = idParts[0];
      const season = parseInt(idParts[1] || '1', 10);
      const episode = parseInt(idParts[2] || '1', 10);

      const meta = await getMediaMeta(baseId, 'series');
      if (meta && meta.title) {
        streams = await getSeriesEpisodeStreams(meta.title, meta.year, season, episode);
      }
    }
    // Case C: Standard Movie (e.g. tt4154796 or tmdb:299534)
    else {
      const meta = await getMediaMeta(cleanId, 'movie');
      if (meta && meta.title) {
        const match = await findBestMatch(meta.title, meta.year, false);
        if (match && match.slug) {
          const lk21Base = await getLK21BaseUrl();
          const movieUrl = `${lk21Base}/${match.slug}`;
          streams = await extractStreamsFromUrl(movieUrl);
        }
      }
    }

    res.setHeader('Cache-Control', 'max-age=3600, public');
    res.json({ streams });
  } catch (err) {
    console.error('[Stream Error]:', err);
    res.json({ streams: [] });
  }
});

// 4. Status API Endpoint
router.get(['/addon-status', '/status'], async (_req: Request, res: Response) => {
  try {
    const movieDomain = await getLK21BaseUrl();
    const seriesDomain = await getSeriesBaseUrl();
    res.json({
      status: 'ok',
      movieDomain,
      seriesDomain,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 5. Test Stream Helper for Web Tester
router.get('/test-stream', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    const match = await findBestMatch(query);
    if (!match) {
      res.json({ streams: [], message: `Tidak ditemukan film untuk kata kunci: "${query}" di LK21.` });
      return;
    }

    const lk21Base = await getLK21BaseUrl();
    const movieUrl = `${lk21Base}/${match.slug}`;
    
    // Try primary movie URL
    let pageRes = await fetch(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': `${lk21Base}/`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    let html = await pageRes.text();
    let streams = await extractStreamsFromHtml(html);

    // If Cloudflare blocked (403), try nontondrama domain as fallback
    if (streams.length === 0 && (pageRes.status === 403 || !html.includes('videonode.de'))) {
      const seriesBase = await getSeriesBaseUrl();
      const fallbackUrl = `${seriesBase}/${match.slug}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': `${seriesBase}/`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      if (fallbackRes.ok) {
        const fallbackHtml = await fallbackRes.text();
        const fallbackStreams = await extractStreamsFromHtml(fallbackHtml);
        if (fallbackStreams.length > 0) {
          streams = fallbackStreams;
        }
      }
    }

    res.json({
      matchedTitle: match.title,
      matchedYear: match.year,
      slug: match.slug,
      pageUrl: movieUrl,
      pageStatus: pageRes.status,
      htmlLength: html.length,
      hasVideonode: html.includes('videonode.de'),
      streams,
    });
  } catch (err: any) {
    console.error('[Test Stream Error]:', err);
    res.status(500).json({ error: err.message || 'Internal error resolving streams' });
  }
});

// 6. Root Landing Page
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(dashboardHtml);
});

// Mount on BOTH root '/' AND '/api' prefix
app.use('/', router);
app.use('/api', router);

export default app;
