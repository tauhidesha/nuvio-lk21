/**
 * LK21 & Nontondrama Stream Provider for Nuvio (Android TV)
 * Author: tauhidesha
 *
 * Runs locally on Android TV (Hermes / QuickJS / React Native).
 * Resolves movies from LK21 and series from Nontondrama with Indonesian hardsubs.
 */

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SEARCH_API_URL = "https://gudangvape.com/search.php";
const MOVIE_MIRRORS = [
  "https://tv.lk21official.us",
  "https://tv13.lk21official.cc",
  "https://tv14.lk21official.cc",
];
const SERIES_MIRRORS = [
  "https://tv1.nontondrama.vip",
  "https://tv.nontondrama.vip",
];

/**
 * Normalizes title strings for comparison and slug generation.
 */
function cleanTitle(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates URL slug from title and year.
 */
function generateSlug(title, year) {
  const norm = cleanTitle(title).replace(/\s+/g, "-");
  return year ? `${norm}-${year}` : norm;
}

/**
 * Fetches movie or TV metadata from TMDB.
 */
async function getTmdbMetadata(tmdbId, mediaType) {
  const isImdb = String(tmdbId).startsWith("tt");
  let url = "";

  if (isImdb) {
    url = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
  } else {
    const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  }

  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const json = await res.json();

    if (isImdb) {
      const item =
        mediaType === "tv" || mediaType === "series"
          ? json?.tv_results?.[0]
          : json?.movie_results?.[0];
      if (!item) return null;
      return {
        title: item.title || item.name || item.original_title || item.original_name,
        year: parseInt((item.release_date || item.first_air_date || "").slice(0, 4), 10) || null,
      };
    }

    return {
      title: json.title || json.name || json.original_title || json.original_name,
      year: parseInt((json.release_date || json.first_air_date || "").slice(0, 4), 10) || null,
    };
  } catch (err) {
    console.warn("[LK21 Provider] TMDB metadata fetch error:", err);
    return null;
  }
}

/**
 * Searches LK21 API for titles.
 */
async function searchLK21(query) {
  const url = `${SEARCH_API_URL}?s=${encodeURIComponent(query)}&page=1`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://tv.lk21official.us/",
        Origin: "https://tv.lk21official.us",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data || json?.items || [];
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      title: String(item.title || ""),
      year: parseInt(item.year, 10) || 0,
      slug: String(item.slug || "").replace(/^\/+/, ""),
    }));
  } catch (err) {
    console.warn("[LK21 Provider] Search error:", err);
    return [];
  }
}

/**
 * Finds the closest matching search result for a title and year.
 */
async function findBestMatch(title, year, isSeries) {
  const results = await searchLK21(title);
  const target = cleanTitle(title);

  if (results.length > 0) {
    const pool = results.filter((item) => {
      const isItemSeries =
        item.title.toLowerCase().includes("series") || item.slug.includes("series");
      return isSeries ? isItemSeries : !isItemSeries;
    });

    const activePool = pool.length > 0 ? pool : results;

    // 1. Exact title & year
    if (year) {
      const exact = activePool.find((item) => {
        const itemTitle = cleanTitle(
          item.title.replace(/\(\d{4}\).*/, "").replace(/- series.*/i, "")
        );
        return itemTitle === target && Math.abs(item.year - year) <= 1;
      });
      if (exact) return exact;
    }

    // 2. Exact title
    const titleMatch = activePool.find((item) => {
      const itemTitle = cleanTitle(
        item.title.replace(/\(\d{4}\).*/, "").replace(/- series.*/i, "")
      );
      return itemTitle === target;
    });
    if (titleMatch) return titleMatch;

    return activePool[0];
  }

  // Fallback to direct slug candidate
  return {
    title,
    year: year || 0,
    slug: generateSlug(title, year),
  };
}

/**
 * Extracts videonode player references from HTML.
 */
function extractPlayerRefs(html) {
  const refs = [];
  const seen = new Set();
  const regex = /https?:\/\/videonode\.de\/iframe3\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const host = match[1];
    const id = match[2];
    const key = `${host}:${id}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ host, id, rawUrl: match[0] });
    }
  }

  return refs;
}

/**
 * Resolves a videonode reference to direct playable HLS stream via playcdn.de.
 */
async function resolvePlayCdnStream(ref) {
  try {
    const bodyParams = `host=${encodeURIComponent(ref.host)}&id=${encodeURIComponent(ref.id)}`;
    const apiRes = await fetch("https://videonode.de/api.php", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${ref.rawUrl}?v=1`,
        Origin: "https://videonode.de",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams,
    });

    if (!apiRes.ok) return null;
    const json = await apiRes.json();
    const embedUrl = json?.embedUrl || "";
    if (!embedUrl || !embedUrl.includes("playcdn.de")) return null;

    const cleanUrl = embedUrl.split("?")[0];
    const slug = cleanUrl.split("/").filter(Boolean).pop();
    if (!slug) return null;

    const verifyRes = await fetch(`https://playcdn.de/verify/${encodeURIComponent(slug)}`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: embedUrl,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!verifyRes.ok) return null;
    const verifyJson = await verifyRes.json();

    if (verifyJson?.status === "success" && verifyJson?.fileUrl) {
      const fileUrl = verifyJson.fileUrl;
      const resName = fileUrl.includes("1080")
        ? "1080p"
        : fileUrl.includes("720")
        ? "720p"
        : fileUrl.includes("480")
        ? "480p"
        : "HD";

      return {
        name: `LK21 [${resName} Sub Indo]`,
        title: `Server ${ref.host.toUpperCase()} • Direct HLS • Hardsub ID`,
        url: fileUrl,
        quality: resName,
        type: "direct",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: "https://playcdn.de/",
        },
        behaviorHints: {
          notWebReady: true,
          bingeGroup: `lk21-${ref.host}`,
          proxyHeaders: {
            request: {
              "User-Agent": USER_AGENT,
              Referer: "https://playcdn.de/",
            },
          },
        },
      };
    }
  } catch (err) {
    console.warn(`[LK21 Provider] Stream resolve error (${ref.host}):`, err);
  }
  return null;
}

/**
 * Extracts streams from an LK21 or Nontondrama page HTML.
 */
async function extractStreamsFromHtml(html) {
  const refs = extractPlayerRefs(html);
  if (!refs.length) return [];

  // Prioritize P2P server as primary PlayCDN source
  refs.sort((a, b) => (a.host === "p2p" ? -1 : b.host === "p2p" ? 1 : 0));

  const streamPromises = refs.map((ref) => resolvePlayCdnStream(ref));
  const results = await Promise.all(streamPromises);
  return results.filter((s) => s !== null);
}

/**
 * Resolves streams for a movie slug across candidate mirrors.
 */
async function resolveMovieStreams(slug) {
  for (const mirror of MOVIE_MIRRORS) {
    try {
      const url = `${mirror}/${slug}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (res.ok) {
        const html = await res.text();
        const streams = await extractStreamsFromHtml(html);
        if (streams.length > 0) return streams;
      }
    } catch (err) {
      // Continue to next mirror
    }
  }
  return [];
}

/**
 * Resolves streams for a TV series episode across candidate mirrors.
 */
async function resolveSeriesStreams(baseSlug, year, season, episode) {
  const cleanBaseSlug = baseSlug.replace(/-\d{4}$/, "").replace(/\/+$/, "");

  for (const mirror of SERIES_MIRRORS) {
    try {
      // 1. Check main series page for exact episode links
      const seriesUrl = `${mirror}/${baseSlug}`;
      const res = await fetch(seriesUrl, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (res.ok) {
        const html = await res.text();
        const patterns = [
          new RegExp(`season-${season}-episode-${episode}(?:-\\d{4})?`, "i"),
          new RegExp(`s0*${season}e0*${episode}`, "i"),
          new RegExp(`s${season}-eps?-${episode}`, "i"),
        ];

        const linkRegex = /href=["'](\/[^"'\s>]+)["']/gi;
        let m;
        let matchedEpisodePath = null;

        while ((m = linkRegex.exec(html)) !== null) {
          const href = m[1];
          if (patterns.some((pat) => pat.test(href))) {
            matchedEpisodePath = href;
            break;
          }
        }

        if (matchedEpisodePath) {
          const epUrl = `${mirror}${matchedEpisodePath.startsWith("/") ? "" : "/"}${matchedEpisodePath}`;
          const epRes = await fetch(epUrl, { headers: { "User-Agent": USER_AGENT } });
          if (epRes.ok) {
            const epHtml = await epRes.text();
            const streams = await extractStreamsFromHtml(epHtml);
            if (streams.length > 0) return streams;
          }
        }
      }

      // 2. Fallback to direct episode slug pattern
      const candidateUrls = [
        `${mirror}/${cleanBaseSlug}-season-${season}-episode-${episode}${year ? `-${year}` : ""}`,
        `${mirror}/${cleanBaseSlug}-season-${season}-episode-${episode}`,
        `${mirror}/${baseSlug}-season-${season}-episode-${episode}`,
      ];

      for (const epUrl of candidateUrls) {
        try {
          const epRes = await fetch(epUrl, { headers: { "User-Agent": USER_AGENT } });
          if (epRes.ok) {
            const epHtml = await epRes.text();
            const streams = await extractStreamsFromHtml(epHtml);
            if (streams.length > 0) return streams;
          }
        } catch {
          // Continue
        }
      }
    } catch (err) {
      // Continue to next mirror
    }
  }

  return [];
}

/**
 * Main Nuvio Provider Entry Point.
 *
 * @param {string|object} arg1 - TMDB ID / IMDb ID or options object
 * @param {string} [arg2] - Media type ("movie" or "tv")
 * @param {number} [arg3] - Season number (1-based, null for movies)
 * @param {number} [arg4] - Episode number (1-based, null for movies)
 * @param {object} [arg5] - Optional user config
 * @returns {Promise<Array>} Array of stream objects
 */
async function getStreams(arg1, arg2, arg3, arg4, arg5) {
  let tmdbId, mediaType, seasonNum, episodeNum;

  if (typeof arg1 === "object" && arg1 !== null) {
    tmdbId = arg1.tmdbId || arg1.id;
    mediaType = arg1.mediaType || arg1.type || "movie";
    seasonNum = arg1.seasonNum ?? arg1.season ?? null;
    episodeNum = arg1.episodeNum ?? arg1.episode ?? null;
  } else {
    tmdbId = arg1;
    mediaType = arg2 || "movie";
    seasonNum = arg3 !== undefined ? arg3 : null;
    episodeNum = arg4 !== undefined ? arg4 : null;
  }

  if (!tmdbId) {
    console.warn("[LK21 Provider] No TMDB ID provided");
    return [];
  }

  const isSeries = mediaType === "tv" || mediaType === "series";

  // 1. Fetch metadata from TMDB
  const meta = await getTmdbMetadata(tmdbId, mediaType);
  if (!meta || !meta.title) {
    console.warn(`[LK21 Provider] Unable to resolve TMDB metadata for ID: ${tmdbId}`);
    return [];
  }

  console.log(`[LK21 Provider] Resolving streams for "${meta.title}" (${meta.year || "N/A"}), Type: ${mediaType}`);

  // 2. Search for the title on LK21 / Nontondrama
  const match = await findBestMatch(meta.title, meta.year, isSeries);
  if (!match || !match.slug) {
    console.warn(`[LK21 Provider] No match found for "${meta.title}"`);
    return [];
  }

  console.log(`[LK21 Provider] Matched slug: ${match.slug}`);

  // 3. Resolve streams
  if (isSeries && seasonNum && episodeNum) {
    return await resolveSeriesStreams(match.slug, meta.year, seasonNum, episodeNum);
  } else {
    return await resolveMovieStreams(match.slug);
  }
}

// Module export compatibility for QuickJS / Hermes / CommonJS / ES
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
}
if (typeof exports !== "undefined") {
  exports.getStreams = getStreams;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}
