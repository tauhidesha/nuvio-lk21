/**
 * LK21 & Nontondrama Provider for Nuvio (Android TV)
 * Bundled & Transpiled for Hermes Engine
 * Updated: 2026-11-24T14:22:40.753Z
 */
"use strict";
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// providers/lk21.source.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var SEARCH_API_URL = "https://gudangvape.com/search.php";
var MOVIE_MIRRORS = [
  "https://tv.lk21official.us",
  "https://tv13.lk21official.cc",
  "https://tv14.lk21official.cc"
];
var SERIES_MIRRORS = [
  "https://tv1.nontondrama.vip",
  "https://tv.nontondrama.vip"
];
function cleanTitle(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}
function generateSlug(title, year) {
  const norm = cleanTitle(title).replace(/\s+/g, "-");
  return year ? `${norm}-${year}` : norm;
}
function getTmdbMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a, _b;
    const isImdb = String(tmdbId).startsWith("tt");
    let url = "";
    if (isImdb) {
      url = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    } else {
      const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
      url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    }
    try {
      const res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) return null;
      const json = yield res.json();
      if (isImdb) {
        const item = mediaType === "tv" || mediaType === "series" ? (_a = json == null ? void 0 : json.tv_results) == null ? void 0 : _a[0] : (_b = json == null ? void 0 : json.movie_results) == null ? void 0 : _b[0];
        if (!item) return null;
        return {
          title: item.title || item.name || item.original_title || item.original_name,
          year: parseInt((item.release_date || item.first_air_date || "").slice(0, 4), 10) || null
        };
      }
      return {
        title: json.title || json.name || json.original_title || json.original_name,
        year: parseInt((json.release_date || json.first_air_date || "").slice(0, 4), 10) || null
      };
    } catch (err) {
      console.warn("[LK21 Provider] TMDB metadata fetch error:", err);
      return null;
    }
  });
}
function searchLK21(query) {
  return __async(this, null, function* () {
    const url = `${SEARCH_API_URL}?s=${encodeURIComponent(query)}&page=1`;
    try {
      const res = yield fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: "https://tv.lk21official.us/",
          Origin: "https://tv.lk21official.us",
          Accept: "application/json, text/plain, */*"
        }
      });
      if (!res.ok) return [];
      const json = yield res.json();
      const items = (json == null ? void 0 : json.data) || (json == null ? void 0 : json.items) || [];
      if (!Array.isArray(items)) return [];
      return items.map((item) => ({
        title: String(item.title || ""),
        year: parseInt(item.year, 10) || 0,
        slug: String(item.slug || "").replace(/^\/+/, "")
      }));
    } catch (err) {
      console.warn("[LK21 Provider] Search error:", err);
      return [];
    }
  });
}
function findBestMatch(title, year, isSeries) {
  return __async(this, null, function* () {
    const results = yield searchLK21(title);
    const target = cleanTitle(title);
    if (results.length > 0) {
      const pool = results.filter((item) => {
        const isItemSeries = item.title.toLowerCase().includes("series") || item.slug.includes("series");
        return isSeries ? isItemSeries : !isItemSeries;
      });
      const activePool = pool.length > 0 ? pool : results;
      if (year) {
        const exact = activePool.find((item) => {
          const itemTitle = cleanTitle(
            item.title.replace(/\(\d{4}\).*/, "").replace(/- series.*/i, "")
          );
          return itemTitle === target && Math.abs(item.year - year) <= 1;
        });
        if (exact) return exact;
      }
      const titleMatch = activePool.find((item) => {
        const itemTitle = cleanTitle(
          item.title.replace(/\(\d{4}\).*/, "").replace(/- series.*/i, "")
        );
        return itemTitle === target;
      });
      if (titleMatch) return titleMatch;
      return activePool[0];
    }
    return {
      title,
      year: year || 0,
      slug: generateSlug(title, year)
    };
  });
}
function extractPlayerRefs(html) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
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
function resolvePlayCdnStream(ref) {
  return __async(this, null, function* () {
    try {
      const bodyParams = `host=${encodeURIComponent(ref.host)}&id=${encodeURIComponent(ref.id)}`;
      const apiRes = yield fetch("https://videonode.de/api.php", {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${ref.rawUrl}?v=1`,
          Origin: "https://videonode.de",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams
      });
      if (!apiRes.ok) return null;
      const json = yield apiRes.json();
      const embedUrl = (json == null ? void 0 : json.embedUrl) || "";
      if (!embedUrl || !embedUrl.includes("playcdn.de")) return null;
      const cleanUrl = embedUrl.split("?")[0];
      const slug = cleanUrl.split("/").filter(Boolean).pop();
      if (!slug) return null;
      const verifyRes = yield fetch(`https://playcdn.de/verify/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: embedUrl,
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      if (!verifyRes.ok) return null;
      const verifyJson = yield verifyRes.json();
      if ((verifyJson == null ? void 0 : verifyJson.status) === "success" && (verifyJson == null ? void 0 : verifyJson.fileUrl)) {
        const fileUrl = verifyJson.fileUrl;
        const resName = fileUrl.includes("1080") ? "1080p" : fileUrl.includes("720") ? "720p" : fileUrl.includes("480") ? "480p" : "HD";
        return {
          name: `LK21 [${resName} Sub Indo]`,
          title: `Server ${ref.host.toUpperCase()} \u2022 Direct HLS \u2022 Hardsub ID`,
          url: fileUrl,
          quality: resName,
          type: "direct",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://playcdn.de/"
          },
          behaviorHints: {
            notWebReady: true,
            bingeGroup: `lk21-${ref.host}`,
            proxyHeaders: {
              request: {
                "User-Agent": USER_AGENT,
                Referer: "https://playcdn.de/"
              }
            }
          }
        };
      }
    } catch (err) {
      console.warn(`[LK21 Provider] Stream resolve error (${ref.host}):`, err);
    }
    return null;
  });
}
function extractStreamsFromHtml(html) {
  return __async(this, null, function* () {
    const refs = extractPlayerRefs(html);
    if (!refs.length) return [];
    refs.sort((a, b) => a.host === "p2p" ? -1 : b.host === "p2p" ? 1 : 0);
    const streamPromises = refs.map((ref) => resolvePlayCdnStream(ref));
    const results = yield Promise.all(streamPromises);
    return results.filter((s) => s !== null);
  });
}
function resolveMovieStreams(slug) {
  return __async(this, null, function* () {
    for (const mirror of MOVIE_MIRRORS) {
      try {
        const url = `${mirror}/${slug}`;
        const res = yield fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (res.ok) {
          const html = yield res.text();
          const streams = yield extractStreamsFromHtml(html);
          if (streams.length > 0) return streams;
        }
      } catch (err) {
      }
    }
    return [];
  });
}
function resolveSeriesStreams(baseSlug, year, season, episode) {
  return __async(this, null, function* () {
    const cleanBaseSlug = baseSlug.replace(/-\d{4}$/, "").replace(/\/+$/, "");
    for (const mirror of SERIES_MIRRORS) {
      try {
        const seriesUrl = `${mirror}/${baseSlug}`;
        const res = yield fetch(seriesUrl, {
          headers: { "User-Agent": USER_AGENT }
        });
        if (res.ok) {
          const html = yield res.text();
          const patterns = [
            new RegExp(`season-${season}-episode-${episode}(?:-\\d{4})?`, "i"),
            new RegExp(`s0*${season}e0*${episode}`, "i"),
            new RegExp(`s${season}-eps?-${episode}`, "i")
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
            const epRes = yield fetch(epUrl, { headers: { "User-Agent": USER_AGENT } });
            if (epRes.ok) {
              const epHtml = yield epRes.text();
              const streams = yield extractStreamsFromHtml(epHtml);
              if (streams.length > 0) return streams;
            }
          }
        }
        const candidateUrls = [
          `${mirror}/${cleanBaseSlug}-season-${season}-episode-${episode}${year ? `-${year}` : ""}`,
          `${mirror}/${cleanBaseSlug}-season-${season}-episode-${episode}`,
          `${mirror}/${baseSlug}-season-${season}-episode-${episode}`
        ];
        for (const epUrl of candidateUrls) {
          try {
            const epRes = yield fetch(epUrl, { headers: { "User-Agent": USER_AGENT } });
            if (epRes.ok) {
              const epHtml = yield epRes.text();
              const streams = yield extractStreamsFromHtml(epHtml);
              if (streams.length > 0) return streams;
            }
          } catch (e) {
          }
        }
      } catch (err) {
      }
    }
    return [];
  });
}
function getStreams(arg1, arg2, arg3, arg4, arg5) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    let tmdbId, mediaType, seasonNum, episodeNum;
    if (typeof arg1 === "object" && arg1 !== null) {
      tmdbId = arg1.tmdbId || arg1.id;
      mediaType = arg1.mediaType || arg1.type || "movie";
      seasonNum = (_b = (_a = arg1.seasonNum) != null ? _a : arg1.season) != null ? _b : null;
      episodeNum = (_d = (_c = arg1.episodeNum) != null ? _c : arg1.episode) != null ? _d : null;
    } else {
      tmdbId = arg1;
      mediaType = arg2 || "movie";
      seasonNum = arg3 !== void 0 ? arg3 : null;
      episodeNum = arg4 !== void 0 ? arg4 : null;
    }
    if (!tmdbId) {
      console.warn("[LK21 Provider] No TMDB ID provided");
      return [];
    }
    const isSeries = mediaType === "tv" || mediaType === "series";
    const meta = yield getTmdbMetadata(tmdbId, mediaType);
    if (!meta || !meta.title) {
      console.warn(`[LK21 Provider] Unable to resolve TMDB metadata for ID: ${tmdbId}`);
      return [];
    }
    console.log(`[LK21 Provider] Resolving streams for "${meta.title}" (${meta.year || "N/A"}), Type: ${mediaType}`);
    const match = yield findBestMatch(meta.title, meta.year, isSeries);
    if (!match || !match.slug) {
      console.warn(`[LK21 Provider] No match found for "${meta.title}"`);
      return [];
    }
    console.log(`[LK21 Provider] Matched slug: ${match.slug}`);
    if (isSeries && seasonNum && episodeNum) {
      return yield resolveSeriesStreams(match.slug, meta.year, seasonNum, episodeNum);
    } else {
      return yield resolveMovieStreams(match.slug);
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
}
if (typeof exports !== "undefined") {
  exports.getStreams = getStreams;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}
