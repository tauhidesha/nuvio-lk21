/**
 * Series & Episode Handler for Nontondrama & LK21.
 * Resolves season and episode streams for TV series and Korean Dramas.
 */

import { getSeriesBaseUrl } from './domainResolver.js';
import { searchLK21, findBestMatch } from './search.js';
import { extractStreamsFromUrl, StreamOption } from './extractor.js';

/**
 * Normalizes season and episode numbers into standard string patterns.
 */
function getEpisodePatterns(season: number, episode: number): RegExp[] {
  return [
    new RegExp(`season-${season}-episode-${episode}(?:-\\d{4})?`, 'i'),
    new RegExp(`s0*${season}e0*${episode}`, 'i'),
    new RegExp(`s${season}-eps?-${episode}`, 'i'),
  ];
}

/**
 * Resolves streams for a specific TV series episode.
 */
export async function getSeriesEpisodeStreams(
  title: string,
  year: number | undefined,
  season: number,
  episode: number
): Promise<StreamOption[]> {
  const seriesBase = await getSeriesBaseUrl();

  // 1. Search for the series on LK21/Nontondrama search API
  const match = await findBestMatch(title, year, true);
  if (!match) {
    console.warn(`[Series] No search match found for series "${title}" (${year})`);
    return [];
  }

  // Base slug for the series (e.g. "our-blues-2022" or "squid-game-2021")
  const baseSlug = match.slug.replace(/\/+$/, '');

  // 2. Fetch series main page to locate exact episode links
  const seriesPageUrl = `${seriesBase}/${baseSlug}`;
  try {
    const res = await fetch(seriesPageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const patterns = getEpisodePatterns(season, episode);

      // Find link in HTML matching the season/episode
      const linkRegex = /href=["'](\/[^"'\s>]+)["']/gi;
      let m: RegExpExecArray | null;
      let matchedEpisodePath: string | null = null;

      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1];
        if (patterns.some((pat) => pat.test(href))) {
          matchedEpisodePath = href;
          break;
        }
      }

      if (matchedEpisodePath) {
        const epUrl = `${seriesBase}${matchedEpisodePath.startsWith('/') ? '' : '/'}${matchedEpisodePath}`;
        const streams = await extractStreamsFromUrl(epUrl);
        if (streams.length > 0) return streams;
      }
    }
  } catch (err) {
    console.warn(`[Series] Error fetching series overview page ${seriesPageUrl}:`, err);
  }

  // 3. Fallback: try direct slug generation pattern
  // e.g. "squid-game-season-1-episode-1-2021"
  const cleanBaseSlug = baseSlug.replace(/-\d{4}$/, '');
  const candidateYear = year || match.year || '';
  const fallbackUrls = [
    `${seriesBase}/${cleanBaseSlug}-season-${season}-episode-${episode}${candidateYear ? `-${candidateYear}` : ''}`,
    `${seriesBase}/${baseSlug}-season-${season}-episode-${episode}`,
  ];

  for (const url of fallbackUrls) {
    const streams = await extractStreamsFromUrl(url);
    if (streams.length > 0) return streams;
  }

  return [];
}
