# LK21 & Nontondrama — Nuvio (Android TV) & Stremio

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Plugin dan Add-on untuk **Nuvio** (Android TV) dan **Stremio** untuk menonton Film Bioskop Layarkaca21 (LK21) dan Drama Serial / Drakor Nontondrama langsung dengan Subtitle Indonesia (*hardsub*) resolusi 1080p, 720p, dan 480p tanpa iklan popup.

---

## 🌟 Cara Pasang di Nuvio Android TV (SANGAT DIREKOMENDASIKAN)

> [!TIP]
> **Mengapa menggunakan Native Plugin Nuvio?**  
> Plugin ini dieksekusi secara lokal di dalam mesin JavaScript (Hermes) aplikasi Nuvio pada Android TV Anda. Karena koneksi internet berasal dari Wi-Fi rumah (IP residensial Indonesia), scraper **100% bebas dari blokir / challenge Cloudflare** yang biasa memblokir server cloud.

### Langkah Pemasangan:
1. Buka aplikasi **Nuvio** di Android TV Anda.
2. Masuk ke menu **Settings** (Pengaturan) ➔ pilih **Plugins** (atau **Content & Discovery**).
3. Pilih menu **Add Repository** (Tambah Repositori).
4. Masukkan URL repositori berikut (bisa diketik atau gunakan remote app Android TV):
   ```text
   https://raw.githubusercontent.com/tauhidesha/nuvio-lk21/main/manifest.json
   ```
5. Pilih plugin **LK21 (Sub Indo)**, lalu klik **Install / Enable**.
6. Selesai! Pilih film atau drakor apa pun di Nuvio, link stream **LK21 [1080p / 720p / HD Sub Indo]** akan langsung muncul dan siap diputar.

---

## ⚡ Cara Pasang di Stremio (Web Add-on)

Jika Anda menggunakan **Stremio** (di PC, Android TV, atau Android Phone):
1. Buka link Web Add-on:
   ```text
   https://nuvio-lk21.vercel.app/manifest.json
   ```
2. Atau buka web tester dashboard: `https://nuvio-lk21.vercel.app/` dan klik tombol **⚡ Pasang ke Stremio**.
3. Klik **Install** di aplikasi Stremio Anda.

---

## ✨ Fitur Utama

- 📺 **Native Android TV & Nuvio Support:** Berjalan langsung di Hermes JS engine Nuvio Android TV.
- ⚡ **Direct HLS Stream Extraction:** Mengekstrak playlist video direct `.m3u8` tanpa iklan popup dan tanpa batasan referer, langsung diputar lancar oleh ExoPlayer native TV.
- 🇮🇩 **Subtitle Indonesia Natively Included:** Subtitle Bahasa Indonesia sudah terpasang rapi (*hardsub*) di dalam stream video.
- 🔄 **Anti-Blokir & Auto Domain Failover:** Mendeteksi otomatis domain LK21 yang sedang aktif melalui redirector resmi (`https://lk21.de`, `https://xx1.red`, dan `https://dramamu.lk21.de`).
- 🎯 **Dukungan Film & Series / Drakor:** Mendukung film bioskop LK21 dan drama serial multi-episode Nontondrama.
- 🖥️ **Web Tester Dashboard:** Halaman depan web dilengkapi HLS player interaktif untuk uji coba pencarian dan pemutaran film langsung di browser.

---

## 💻 Menjalankan & Membangun Plugin Secara Lokal

```bash
# 1. Install dependencies
npm install

# 2. Transpile provider untuk mesin Hermes Android TV
node build.js

# 3. Jalankan tes scraper lokal (Avengers & Squid Game)
npm test
```

---

## 🛠️ Struktur Project

```
nuvio-lk21/
├── manifest.json                # Nuvio Plugin Repository Registry
├── plugins.json                 # Alternatif Nuvio Plugin Registry
├── build.js                     # Esbuild script (transpile async/await ke ES2016 Hermes)
├── providers/
│   ├── lk21.source.js           # Source code provider LK21 (vanilla JS)
│   └── lk21.js                  # Transpiled provider siap eksekusi di Hermes Android TV
├── api/
│   └── index.ts                 # Vercel Serverless Entrypoint (Stremio & Web Router)
├── src/
│   ├── scraper/
│   │   ├── domainResolver.ts    # Auto-detection domain aktif
│   │   ├── search.ts            # Pencarian film & series (gudangvape API)
│   │   ├── extractor.ts         # Reverse-engineered Videonode & PlayCDN HLS
│   │   └── series.ts            # Handler episode TV Series / Drakor (Nontondrama)
│   ├── meta/
│   │   └── cinemeta.ts          # Zero-config metadata resolver
│   ├── catalog/
│   │   └── lk21Catalog.ts       # Handler katalog film terbaru & top rating
│   └── public/
│       └── dashboardHtml.ts     # Embedded Web Dashboard & Tester
```
