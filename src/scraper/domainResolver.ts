/**
 * Domain Resolver for LK21 and Nontondrama.
 * Automatically resolves and tracks the latest active mirror domain using official 302 redirectors.
 */

interface DomainCache {
  movieDomain: string;
  seriesDomain: string;
  lastChecked: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

const cache: DomainCache = {
  movieDomain: 'https://tv.lk21official.us',
  seriesDomain: 'https://tv1.nontondrama.vip',
  lastChecked: 0,
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Resolves the active LK21 movie domain via https://xx1.red or https://lk21.de
 */
export async function getLK21BaseUrl(): Promise<string> {
  const now = Date.now();
  if (cache.lastChecked && now - cache.lastChecked < CACHE_TTL_MS && cache.movieDomain) {
    return cache.movieDomain;
  }

  // 1. Try https://xx1.red (LK21 international mirror)
  try {
    const response = await fetch('https://xx1.red', {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location && location.startsWith('http')) {
      cache.movieDomain = location.replace(/\/+$/, '');
      cache.lastChecked = now;
      return cache.movieDomain;
    }
  } catch (err) {
    console.warn('[DomainResolver] xx1.red check failed:', err);
  }

  // 2. Fallback to https://lk21.de
  try {
    const response = await fetch('https://lk21.de', {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location && location.startsWith('http')) {
      cache.movieDomain = location.replace(/\/+$/, '');
      cache.lastChecked = now;
      return cache.movieDomain;
    }
  } catch (err) {
    console.warn('[DomainResolver] lk21.de check failed:', err);
  }

  cache.lastChecked = now;
  return cache.movieDomain || 'https://tv.lk21official.us';
}

/**
 * Resolves the active Nontondrama series domain via https://dramamu.lk21.de
 */
export async function getSeriesBaseUrl(): Promise<string> {
  const now = Date.now();
  if (cache.lastChecked && now - cache.lastChecked < CACHE_TTL_MS && cache.seriesDomain) {
    return cache.seriesDomain;
  }

  try {
    const response = await fetch('https://dramamu.lk21.de', {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location && location.startsWith('http')) {
      cache.seriesDomain = location.replace(/\/+$/, '');
    } else if (response.url && response.url.startsWith('http') && !response.url.includes('dramamu.lk21.de')) {
      cache.seriesDomain = new URL(response.url).origin;
    }
  } catch (err) {
    console.warn('[DomainResolver] Failed to resolve series domain, using fallback:', cache.seriesDomain);
  }

  return cache.seriesDomain;
}
