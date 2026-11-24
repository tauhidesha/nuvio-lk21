/**
 * LK21 & Nontondrama Catalog Provider.
 * Generates Stremio MetaPreview cards for Nuvio's home screen rows.
 */

import * as cheerio from 'cheerio';
import { getLK21BaseUrl, getSeriesBaseUrl } from '../scraper/domainResolver.js';
import { searchLK21 } from '../scraper/search.js';

export interface StremioMetaPreview {
  id: string; // e.g. "lk21:avengers-endgame-2019"
  type: 'movie' | 'series';
  name: string;
  poster?: string;
  description?: string;
  releaseInfo?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetches and parses an LK21 catalog page into Stremio MetaPreviews.
 */
async function fetchCatalogPage(path: string, type: 'movie' | 'series'): Promise<StremioMetaPreview[]> {
  const baseUrl = type === 'series' ? await getSeriesBaseUrl() : await getLK21BaseUrl();
  const targetUrl = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const metas: StremioMetaPreview[] = [];

    $('article').each((_, el) => {
      const article = $(el);
      const link = article.find('a').first().attr('href') || '';
      const title = article.find('h3, h2, .movie-title').first().text().trim();
      const poster = article.find('img').first().attr('src') || article.find('img').first().attr('data-src');
      const rating = article.find('.rating').text().trim();

      const slug = link.replace(/^\/+/, '').split('?')[0];

      if (slug && title) {
        // Extract year from slug or title if possible
        const yearMatch = slug.match(/-(\d{4})$/);
        const releaseInfo = yearMatch ? yearMatch[1] : undefined;

        metas.push({
          id: `lk21:${slug}`,
          type,
          name: title,
          poster: poster?.startsWith('http') ? poster : undefined,
          releaseInfo,
          description: rating ? `Rating: ⭐ ${rating} • LK21 Sub Indo` : 'LK21 Subtitle Indonesia',
        });
      }
    });

    return metas;
  } catch (err) {
    console.error(`[Catalog] Error fetching catalog page ${path}:`, err);
    return [];
  }
}

/**
 * Gets LK21 catalog items based on catalog ID and optional search query or skip pagination.
 */
export async function getLK21Catalog(
  type: 'movie' | 'series',
  id: string,
  extra?: { search?: string; skip?: number }
): Promise<StremioMetaPreview[]> {
  // 1. If user is searching within the catalog
  if (extra?.search) {
    const results = await searchLK21(extra.search);
    return results.map((item) => ({
      id: `lk21:${item.slug}`,
      type,
      name: item.title,
      poster: item.poster,
      releaseInfo: item.year ? String(item.year) : undefined,
      description: item.rating ? `Rating: ⭐ ${item.rating} • LK21 Sub Indo` : 'LK21 Subtitle Indonesia',
    }));
  }

  // 2. Standard browsing rows
  if (id === 'lk21-latest') {
    return await fetchCatalogPage('/latest', 'movie');
  } else if (id === 'lk21-popular') {
    return await fetchCatalogPage('/populer', 'movie');
  } else if (id === 'lk21-series') {
    return await fetchCatalogPage('/', 'series');
  }

  // Fallback to latest
  return await fetchCatalogPage('/', type);
}
