# LK21 & Nontondrama — Nuvio & Stremio Add-on

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Add-on resmi kompatibel dengan **Nuvio** (Android TV) dan **Stremio** untuk menonton Film Bioskop LK21 (Layarkaca21) dan Series/Drakor Nontondrama langsung dengan Subtitle Indonesia (*hardsub*). Add-on ini dirancang secara *serverless*, sangat ringan, hemat RAM TV, dan siap di-deploy gratis ke **Vercel**.

---

## ✨ Fitur Utama

- 📺 **Native Android TV & Nuvio Support:** Kompatibel penuh dengan protokol Stremio Add-on yang didukung native oleh Nuvio TV, Stremio TV, dan Android TV boxes.
- ⚡ **Direct HLS Stream Extraction:** Mengekstrak playlist video direct `.m3u8` tanpa iklan popup dan tanpa batasan referer, sehingga langsung diputar lancar oleh ExoPlayer native TV.
- 🇮🇩 **Subtitle Indonesia Natively Included:** Subtitle Bahasa Indonesia sudah terpasang rapi (*hardsub*) di dalam stream video.
- 🔄 **Anti-Blokir & Auto Domain Failover:** Mendeteksi otomatis domain LK21 yang sedang aktif melalui redirector resmi (`https://lk21.de` dan `https://dramamu.lk21.de`). Jika domain berubah dari `tv13` ke `tv14`, add-on otomatis menyesuaikan tanpa perlu update APK.
- 🎯 **Zero-Config Metadata:** Langsung berjalan otomatis menggunakan public metadata resolver (Cinemeta) tanpa wajib mendaftar TMDB API key.
- 📂 **Katalog Khusus di Layar TV:** Menambahkan baris browsing *"LK21 Film Terbaru"*, *"LK21 Film Populer"*, dan *"Series & Drakor Terbaru"* langsung di beranda Nuvio Anda.
- 🖥️ **Web Tester Dashboard:** Halaman depan web dilengkapi HLS player interaktif untuk uji coba pencarian dan pemutaran film langsung di browser.

---

## 🚀 Cara Deploy ke Vercel (Gratis)

### Opsi A: Lewat GitHub (Rekomendasi)

1. Buat repository baru di akun GitHub Anda (misalnya `nuvio-lk21`).
2. Push repository lokal ini ke GitHub Anda:
   ```bash
   git remote add origin https://github.com/<username-anda>/nuvio-lk21.git
   git branch -M main
   git push -u origin main
   ```
3. Buka [Vercel Dashboard](https://vercel.com/dashboard) ➔ klik **Add New Project**.
4. Import repository `nuvio-lk21` tersebut.
5. Klik **Deploy**. Vercel akan otomatis mendeteksi konfigurasi `vercel.json`.
6. Setelah selesai, Anda akan mendapatkan URL Vercel (contoh: `https://nuvio-lk21.vercel.app`).

### Opsi B: Lewat Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

---

## 📲 Cara Pasang di Nuvio (Android TV)

1. Buka browser di HP/Laptop atau TV, lalu akses URL add-on Vercel Anda:
   `https://<nama-project-anda>.vercel.app/`
2. Klik tombol **⚡ Pasang ke Nuvio / Stremio** atau salin URL manifest-nya:
   `https://<nama-project-anda>.vercel.app/manifest.json`
3. Di Android TV Anda:
   - Buka aplikasi **Nuvio**.
   - Masuk ke **Settings** (Pengaturan) ➔ pilih **Addons**.
   - Pilih **Add Addon** (Tambah Add-on).
   - Masukkan/paste URL `manifest.json` di atas.
   - Klik **Install Addon**.
4. Selesai! Katalog LK21 dan link stream Sub Indo akan otomatis muncul di Nuvio TV Anda.

---

## 💻 Menjalankan di Komputer Lokal (Development)

Jika ingin menjalankan atau memodifikasi secara lokal:

```bash
# 1. Install dependencies
npm install

# 2. Jalankan tes scraper otomatis
npm test

# 3. Jalankan server lokal
npm run dev
```

Akses Web Dashboard di browser: `http://localhost:7000`  
URL Manifest lokal: `http://localhost:7000/manifest.json`

---

## 🛠️ Struktur Project

```
nuvio-lk21/
├── api/
│   └── index.ts                 # Vercel Serverless Entrypoint (Stremio Router)
├── src/
│   ├── scraper/
│   │   ├── domainResolver.ts    # Auto-detection domain aktif (lk21.de redirector)
│   │   ├── search.ts            # Pencarian film & series (gudangvape API)
│   │   ├── extractor.ts         # Reverse-engineered Videonode & PlayCDN HLS
│   │   └── series.ts            # Handler episode TV Series / Drakor (Nontondrama)
│   ├── meta/
│   │   └── cinemeta.ts          # Zero-config metadata resolver (IMDb tt...)
│   ├── catalog/
│   │   └── lk21Catalog.ts       # Handler katalog film terbaru & top rating
│   ├── public/
│   │   └── index.html           # Web Dashboard, tester & tombol install
│   ├── manifest.ts              # Stremio / Nuvio Manifest metadata
│   ├── server.ts                # Local development server (port 7000)
│   └── test.ts                  # Automated end-to-end test suite
├── vercel.json                  # Konfigurasi routing serverless Vercel
├── package.json
└── tsconfig.json
```

---

## ⚠️ Disclaimer

Aplikasi ini hanya bertindak sebagai *indexer* dan *scraper* link media publik yang tersedia di internet. Add-on ini tidak menyimpan file video di server sendiri. Seluruh hak cipta konten dimiliki oleh pemilik aslinya masing-masing.
