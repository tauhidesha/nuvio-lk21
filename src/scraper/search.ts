/**
 * Search Service for LK21 Movies and Series.
 * Interacts with LK21's backend search API and matches candidate titles with release year.
 */

export interface LK21SearchResult {
  title: string;
  year: number;
  slug: string;
  rating?: string;
  poster?: string;
}

const SEARCH_API_URL = 'https://gudangvape.com/search.php';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Clean and normalize a title string for fuzzy comparison.
 */
function cleanTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches LK21 API for movies or series matching the query.
 */
export async function searchLK21(query: string, page = 1): Promise<LK21SearchResult[]> {
  const url = `${SEARCH_API_URL}?s=${encodeURIComponent(query)}&page=${page}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://tv13.lk21official.cc/',
      },
    });

    if (!response.ok) {
      console.warn(`[Search] Search API returned HTTP ${response.status}`);
      return [];
    }

    const json = (await response.json()) as any;
    const items = json?.data || json?.items || [];

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: any) => ({
      title: String(item.title || ''),
      year: parseInt(item.year, 10) || 0,
      slug: String(item.slug || '').replace(/^\/+/, ''),
      rating: item.rating ? String(item.rating) : undefined,
      poster: item.poster ? String(item.poster) : undefined,
    }));
  } catch (err) {
    console.error('[Search] Error querying LK21 search API:', err);
    return [];
  }
}

/**
 * Finds the best matching LK21 entry for a given movie title and release year.
 */
export async function findBestMatch(
  title: string,
  year?: number,
  isSeries = false
): Promise<LK21SearchResult | null> {
  const results = await searchLK21(title);
  if (!results.length) return null;

  const targetTitle = cleanTitle(title);

  // Filter or prioritize based on media type (series items usually have "- Series" or similar)
  const filtered = results.filter((item) => {
    const isItemSeries = item.title.toLowerCase().includes('series') || item.slug.includes('series');
    return isSeries ? isItemSeries : !isItemSeries;
  });

  const pool = filtered.length > 0 ? filtered : results;

  // 1. Exact title & exact year match
  if (year) {
    const exactMatch = pool.find((item) => {
      const itemTitle = cleanTitle(item.title.replace(/\(\d{4}\).*/, '').replace(/- series.*/i, ''));
      return itemTitle === targetTitle && Math.abs(item.year - year) <= 1;
    });
    if (exactMatch) return exactMatch;
  }

  // 2. Exact title match
  const titleMatch = pool.find((item) => {
    const itemTitle = cleanTitle(item.title.replace(/\(\d{4}\).*/, '').replace(/- series.*/i, ''));
    return itemTitle === targetTitle;
  });
  if (titleMatch) return titleMatch;

  // 3. Fallback to first search result if year is close
  if (year && pool.length > 0) {
    const closeYear = pool.find((item) => Math.abs(item.year - year) <= 1);
    if (closeYear) return closeYear;
  }

  return pool[0] || null;
}
