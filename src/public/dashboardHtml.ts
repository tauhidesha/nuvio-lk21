/**
 * Embedded HTML for the Web Tester Dashboard.
 * Bundled directly into the serverless function to ensure it always renders on Vercel.
 */

export const dashboardHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LK21 & Nontondrama - Nuvio & Stremio Add-on</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --primary: #e50914;
      --primary-hover: #b80710;
      --accent: #00e5ff;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: #1f2937;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-badge {
      display: inline-block;
      background: var(--primary);
      color: white;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 16px;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }

    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    p.subtitle { color: var(--text-muted); font-size: 15px; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
    }

    .btn-group {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    button, .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: #374151; color: var(--text); }
    .btn-secondary:hover { background: #4b5563; }

    .manifest-box {
      background: #030712;
      border: 1px dashed var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 13px;
      color: var(--accent);
      word-break: break-all;
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tester-section h2 { font-size: 18px; margin-bottom: 12px; }
    .search-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    input[type="text"] {
      flex: 1;
      padding: 10px 16px;
      background: #030712;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--accent);
    }

    .results-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stream-item {
      background: #1f2937;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stream-info { font-size: 14px; font-weight: 600; }
    .stream-title { font-size: 12px; color: var(--text-muted); }

    #player-container {
      margin-top: 20px;
      display: none;
      background: black;
      border-radius: 8px;
      overflow: hidden;
    }

    video { width: 100%; max-height: 480px; display: block; }

    .steps-list {
      margin-left: 20px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .steps-list li { margin-bottom: 8px; }
    .steps-list strong { color: var(--text); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-badge">LK21 • NUVIO ADD-ON</div>
      <h1>Nuvio & Stremio Add-on LK21</h1>
      <p class="subtitle">Streaming film bioskop dan serial drama dengan subtitle Indonesia langsung di Android TV.</p>
    </header>

    <!-- Installation Card -->
    <div class="card">
      <div class="status-row">
        <div>
          <h3>Status Add-on</h3>
          <p id="domain-info" style="color: var(--text-muted); font-size: 13px;">Mengecek mirror domain LK21...</p>
        </div>
        <div class="badge" id="status-badge">
          <div class="badge-dot"></div>
          <span id="status-text">Online & Siap Dipakai</span>
        </div>
      </div>

      <div class="manifest-box">
        <span id="manifest-url">Memuat link...</span>
        <button class="btn btn-secondary" onclick="copyManifest()" style="padding: 6px 12px; font-size: 12px;">Salin</button>
      </div>

      <div class="btn-group">
        <a id="btn-install-stremio" href="#" class="btn btn-primary">⚡ Pasang ke Nuvio / Stremio</a>
        <button class="btn btn-secondary" onclick="copyManifest()">📋 Salin Link Manifest</button>
      </div>
    </div>

    <!-- Live Stream Tester Card -->
    <div class="card tester-section">
      <h2>Uji Coba Stream (In-Browser Tester)</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">
        Tes pencarian judul dan uji putar langsung stream HLS .m3u8 di browser Anda sebelum dipasang di TV.
      </p>

      <div class="search-bar">
        <input type="text" id="query-input" placeholder="Masukkan judul (misal: Avengers Endgame, Squid Game, Inception)..." value="Avengers Endgame">
        <button class="btn btn-primary" onclick="testStream()">Cari & Ekstrak</button>
      </div>

      <div id="test-status" style="font-size: 13px; color: var(--accent); margin-bottom: 8px;"></div>
      <div id="results-container" class="results-list"></div>

      <div id="player-container">
        <video id="video-player" controls playsinline></video>
      </div>
    </div>

    <!-- Instructions Card -->
    <div class="card">
      <h3 style="margin-bottom: 12px;">Cara Pasang di Android TV (Nuvio)</h3>
      <ol class="steps-list">
        <li>Buka aplikasi <strong>Nuvio</strong> di Android TV Anda.</li>
        <li>Buka menu <strong>Settings</strong> (Pengaturan) ➔ pilih <strong>Addons</strong>.</li>
        <li>Pilih <strong>Add Addon</strong> (Tambah Add-on).</li>
        <li>Masukkan URL manifest di atas: <code id="guide-manifest-url" style="color: var(--accent);"></code></li>
        <li>Klik <strong>Install Addon</strong>. Selesai! Baris katalog LK21 dan stream Sub Indo langsung aktif.</li>
      </ol>
    </div>
  </div>

  <script>
    const origin = window.location.origin;
    const manifestUrl = origin + '/manifest.json';
    document.getElementById('manifest-url').textContent = manifestUrl;
    document.getElementById('guide-manifest-url').textContent = manifestUrl;
    document.getElementById('btn-install-stremio').href = 'stremio://' + window.location.host + '/manifest.json';

    // Fetch live status
    fetch('/addon-status')
      .then(res => res.json())
      .then(data => {
        document.getElementById('domain-info').textContent =
          \`Mirror LK21 Aktif: \${data.movieDomain} • Nontondrama: \${data.seriesDomain}\`;
      })
      .catch(() => {
        document.getElementById('domain-info').textContent = 'Serverless Vercel Active';
      });

    function copyManifest() {
      navigator.clipboard.writeText(manifestUrl);
      alert('URL Manifest berhasil disalin!\\n' + manifestUrl);
    }

    let hlsInstance = null;

    async function testStream() {
      const q = document.getElementById('query-input').value.trim();
      if (!q) return;

      const statusEl = document.getElementById('test-status');
      const resultsEl = document.getElementById('results-container');
      const playerContainer = document.getElementById('player-container');
      const video = document.getElementById('video-player');

      statusEl.textContent = 'Mencari di LK21 dan mengekstrak direct stream...';
      resultsEl.innerHTML = '';
      playerContainer.style.display = 'none';
      if (hlsInstance) { hlsInstance.destroy(); }

      try {
        const res = await fetch('/test-stream?query=' + encodeURIComponent(q));
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Server returned non-JSON response (' + res.status + '): ' + text.substring(0, 150));
        }

        if (data.error) {
          statusEl.textContent = 'Error: ' + data.error;
          return;
        }

        if (!data.streams || data.streams.length === 0) {
          statusEl.textContent = data.message || 'Tidak ditemukan stream untuk judul ini di LK21.';
          return;
        }

        statusEl.textContent = \`Ditemukan \${data.streams.length} stream untuk "\${data.matchedTitle || q}" (\${data.matchedYear || ''}):\`;

        data.streams.forEach((s, idx) => {
          const item = document.createElement('div');
          item.className = 'stream-item';
          item.innerHTML = \`
            <div>
              <div class="stream-info">\${s.name}</div>
              <div class="stream-title">\${s.title}</div>
            </div>
            <button class="btn btn-primary" style="padding: 6px 14px; font-size: 12px;">Putar di Browser</button>
          \`;
          item.querySelector('button').onclick = () => playStream(s.url);
          resultsEl.appendChild(item);
        });

        // Auto play first stream
        playStream(data.streams[0].url);
      } catch (err) {
        statusEl.textContent = 'Terjadi kesalahan saat mengekstrak: ' + err.message;
      }
    }

    function playStream(url) {
      const playerContainer = document.getElementById('player-container');
      const video = document.getElementById('video-player');
      playerContainer.style.display = 'block';

      if (Hls.isSupported()) {
        if (hlsInstance) { hlsInstance.destroy(); }
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => {});
      }
    }
  </script>
</body>
</html>`;
