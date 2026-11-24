/**
 * Vercel Serverless Entrypoint & Express Addon Router.
 * Implements Stremio / Nuvio Addon Protocol.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { manifest } from '../src/manifest.js';
import { getLK21BaseUrl, getSeriesBaseUrl } from '../src/scraper/domainResolver.js';
import { getMediaMeta } from '../src/meta/cinemeta.js';
import { findBestMatch, searchLK21 } from '../src/scraper/search.js';
import { extractStreamsFromUrl, StreamOption } from '../src/scraper/extractor.js';
import { getSeriesEpisodeStreams } from '../src/scraper/series.js';
import { getLK21Catalog } from '../src/catalog/lk21Catalog.js';

const app = express();

// Enable CORS for all domains so Nuvio, Stremio, and web clients can access seamlessly
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  })
);

app.use(express.json());

// 1. Stremio Manifest
app.get('/manifest.json', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'max-age=86400, public');
  res.json(manifest);
});

// 2. Stremio Catalogs
app.get('/catalog/:type/:id.json', async (req: Request, res: Response) => {
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

// Catalog with search / extra query parameters (e.g. /catalog/movie/lk21-latest/search=avatar.json)
app.get('/catalog/:type/:id/:extra.json', async (req: Request, res: Response) => {
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
app.get('/stream/:type/:id.json', async (req: Request, res: Response) => {
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
app.get('/api/status', async (_req: Request, res: Response) => {
  const movieDomain = await getLK21BaseUrl();
  const seriesDomain = await getSeriesBaseUrl();
  res.json({
    status: 'ok',
    movieDomain,
    seriesDomain,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 5. Test Stream Helper for Web Tester
app.get('/api/test-stream', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    const match = await findBestMatch(query);
    if (!match) {
      res.json({ streams: [], message: 'No movie match found on LK21' });
      return;
    }

    const lk21Base = await getLK21BaseUrl();
    const movieUrl = `${lk21Base}/${match.slug}`;
    const streams = await extractStreamsFromUrl(movieUrl);

    res.json({
      matchedTitle: match.title,
      matchedYear: match.year,
      slug: match.slug,
      pageUrl: movieUrl,
      streams,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Root Landing Page
app.get('/', (_req: Request, res: Response) => {
  const htmlPath = path.join(process.cwd(), 'src', 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send(`<h1>LK21 Nuvio Addon</h1><p><a href="/manifest.json">manifest.json</a></p>`);
  }
});

export default app;
