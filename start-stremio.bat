@echo off
title LK21 Stremio Local Server
echo ========================================================
echo   LK21 & Nontondrama Local Add-on Server untuk Stremio
echo ========================================================
echo.
echo Server berjalan di latar belakang:
echo Manifest URL: http://localhost:7000/manifest.json
echo.
echo Panduan:
echo 1. Di Stremio, buka menu Addons (ikon puzzle).
echo 2. Hapus (Uninstall) add-on LK21 lama yang dari Vercel.
echo 3. Di kolom pencarian Addon, paste URL:
echo    http://localhost:7000/manifest.json
echo 4. Klik Install.
echo.
echo (JANGAN TUTUP JENDELA INI SAAT MENONTON DI STREMIO)
echo ========================================================
cd /d "%~dp0"
node dist/server.js
pause
