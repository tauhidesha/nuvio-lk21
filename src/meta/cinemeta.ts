/**
 * Metadata Resolver via Cinemeta & TMDB (Zero-Config).
 * Translates Stremio/Nuvio IDs (IMDb tt... or TMDB tmdb:...) into title & year.
 */

export interface MediaMeta {
  title: string;
  year?: number;
  type: 'movie' | 'series';
}

const CINEMETA_URL = 'https://v3-cinemeta.strem.io/meta';
const metaCache = new Map<string, MediaMeta>();

/**
 * Resolves media information from Cinemeta or TMDB API.
 */
export async function getMediaMeta(id: string, type: 'movie' | 'series'): Promise<MediaMeta | null> {
  // Check in-memory cache first
  const cacheKey = `${type}:${id}`;
  if (metaCache.has(cacheKey)) {
    return metaCache.get(cacheKey)!;
  }

  // 1. If it's our own custom LK21 catalog ID: lk21:{slug}
  if (id.startsWith('lk21:')) {
    const slug = id.replace('lk21:', '');
    // Attempt to extract title and year from slug (e.g. avengers-endgame-2019)
    const yearMatch = slug.match(/-(\d{4})$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
    const rawTitle = yearMatch ? slug.replace(/-\d{4}$/, '') : slug;
    const title = rawTitle.replace(/-/g, ' ');

    const meta: MediaMeta = { title, year, type };
    metaCache.set(cacheKey, meta);
    return meta;
  }

  // 2. Query Cinemeta (works for standard IMDb tt... IDs)
  if (id.startsWith('tt')) {
    try {
      const url = `${CINEMETA_URL}/${type}/${id}.json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NuvioLK21/1.0',
        },
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const item = data?.meta;
        if (item && item.name) {
          const yearStr = String(item.year || item.releaseInfo || '');
          const yearMatch = yearStr.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

          const meta: MediaMeta = {
            title: item.name,
            year,
            type,
          };
          metaCache.set(cacheKey, meta);
          return meta;
        }
      }
    } catch (err) {
      console.warn(`[Cinemeta] Error fetching metadata for ${id}:`, err);
    }
  }

  // 3. Fallback to TMDB API if process.env.TMDB_API_KEY is configured
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    try {
      let tmdbId = id;
      if (id.startsWith('tmdb:')) {
        tmdbId = id.replace('tmdb:', '');
      }

      const tmdbType = type === 'series' ? 'tv' : 'movie';
      const tmdbUrl = id.startsWith('tt')
        ? `https://api.themoviedb.org/3/find/${id}?api_key=${tmdbKey}&external_source=imdb_id`
        : `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${tmdbKey}`;

      const res = await fetch(tmdbUrl);
      if (res.ok) {
        const json = (await res.json()) as any;
        let item = json;
        if (id.startsWith('tt')) {
          const results = type === 'series' ? json?.tv_results : json?.movie_results;
          item = results?.[0];
        }

        if (item) {
          const title = item.title || item.name || item.original_title || item.original_name;
          const dateStr = item.release_date || item.first_air_date || '';
          const year = dateStr ? parseInt(dateStr.split('-')[0], 10) : undefined;

          if (title) {
            const meta: MediaMeta = { title, year, type };
            metaCache.set(cacheKey, meta);
            return meta;
          }
        }
      }
    } catch (err) {
      console.warn(`[TMDB] Error fetching metadata for ${id}:`, err);
    }
  }

  return null;
}
