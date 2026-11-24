/**
 * Stream Extractor for LK21 & Nontondrama.
 * Reverse-engineers Videonode and PlayCDN players to generate direct playable .m3u8 streams.
 */

import { getLK21BaseUrl, getSeriesBaseUrl } from './domainResolver.js';

export interface StreamOption {
  name: string;
  title: string;
  url: string;
  behaviorHints?: {
    notWebReady?: boolean;
    proxyHeaders?: {
      request?: Record<string, string>;
    };
  };
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface VideoNodeRef {
  host: string;
  id: string;
  rawUrl: string;
}

/**
 * Parses videonode player references from HTML content.
 */
function extractPlayerRefs(html: string): VideoNodeRef[] {
  const refs: VideoNodeRef[] = [];
  const seen = new Set<string>();

  // Find all videonode.de/iframe3/{host}/{id}
  const regex = /https?:\/\/videonode\.de\/iframe3\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const host = match[1];
    const id = match[2];
    const key = `${host}:${id}`;

    if (!seen.has(key)) {
      seen.add(key);
      refs.push({
        host,
        id,
        rawUrl: match[0],
      });
    }
  }

  return refs;
}

/**
 * Resolves a videonode reference to direct HLS m3u8 stream via playcdn.de.
 */
async function resolvePlayCdnStream(ref: VideoNodeRef): Promise<StreamOption | null> {
  try {
    // 1. Call videonode.de/api.php
    const bodyParams = new URLSearchParams({
      host: ref.host,
      id: ref.id,
    });

    const apiRes = await fetch('https://videonode.de/api.php', {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${ref.rawUrl}?v=1`,
        Origin: 'https://videonode.de',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!apiRes.ok) {
      console.warn(`[Extractor] videonode api.php returned HTTP ${apiRes.status}`);
      return null;
    }

    const json = (await apiRes.json()) as any;
    const embedUrl: string = json?.embedUrl || '';
    if (!embedUrl) return null;

    // Check if embedUrl points to playcdn.de
    if (embedUrl.includes('playcdn.de')) {
      const cleanUrl = embedUrl.split('?')[0];
      const slug = cleanUrl.split('/').filter(Boolean).pop();
      if (!slug) return null;

      // 2. Call playcdn.de/verify/{slug}
      const verifyRes = await fetch(`https://playcdn.de/verify/${encodeURIComponent(slug)}`, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Referer: embedUrl,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!verifyRes.ok) return null;
      const verifyJson = (await verifyRes.json()) as any;

      if (verifyJson?.status === 'success' && verifyJson?.fileUrl) {
        const fileUrl: string = verifyJson.fileUrl;
        const resolution = fileUrl.includes('1080')
          ? '1080p'
          : fileUrl.includes('720')
          ? '720p'
          : fileUrl.includes('480')
          ? '480p'
          : 'HD';

        return {
          name: `LK21 [${resolution} Sub Indo]`,
          title: `Server ${ref.host.toUpperCase()} • Direct HLS • Hardsub ID`,
          url: fileUrl,
          behaviorHints: {
            notWebReady: true,
          },
        };
      }
    }
  } catch (err) {
    console.warn(`[Extractor] Error resolving stream for ${ref.host}/${ref.id}:`, err);
  }

  return null;
}

/**
 * Extracts all stream options from an LK21 or Nontondrama page HTML.
 */
export async function extractStreamsFromHtml(html: string): Promise<StreamOption[]> {
  const refs = extractPlayerRefs(html);
  if (!refs.length) return [];

  // Prioritize P2P server as primary because it uses PlayCDN direct HLS
  const sortedRefs = [...refs].sort((a, b) => {
    if (a.host === 'p2p') return -1;
    if (b.host === 'p2p') return 1;
    return 0;
  });

  const streamPromises = sortedRefs.map((ref) => resolvePlayCdnStream(ref));
  const results = await Promise.all(streamPromises);

  return results.filter((s): s is StreamOption => s !== null);
}

/**
 * Fetches page HTML and extracts streams for a given URL.
 */
export async function extractStreamsFromUrl(pageUrl: string): Promise<StreamOption[]> {
  try {
    const response = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      console.warn(`[Extractor] Failed to load page ${pageUrl}: HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    return await extractStreamsFromHtml(html);
  } catch (err) {
    console.error(`[Extractor] Network error loading ${pageUrl}:`, err);
    return [];
  }
}

/**
 * Resolves streams for a slug across multiple mirror domains with automatic fallback.
 */
export async function extractStreamsForSlug(slug: string): Promise<StreamOption[]> {
  const lk21Base = await getLK21BaseUrl();
  const seriesBase = await getSeriesBaseUrl();

  const candidateBases = [
    lk21Base,
    'https://tv.lk21official.us',
    'https://tv13.lk21official.cc',
    seriesBase,
    'https://tv1.nontondrama.vip',
  ];

  const uniqueBases = [...new Set(candidateBases.filter(Boolean))];

  for (const base of uniqueBases) {
    const url = `${base}/${slug}`;
    const streams = await extractStreamsFromUrl(url);
    if (streams.length > 0) {
      return streams;
    }
  }

  return [];
}
