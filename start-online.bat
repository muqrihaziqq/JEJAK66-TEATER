@echo off
title Pelayan Tiket JEJAK66 (ONLINE + TEMPATAN)
cd /d "C:\Users\User\.gemini\antigravity\scratch\jejak66-ticketing"

echo =========================================================
echo    MEMULAKAN SISTEM TIKET TEATER JEJAK66 (ONLINE)
echo =========================================================
echo.
set "PATH=C:\Users\User\.gemini\antigravity\scratch\bin\node-v20.18.0-win-x64;%PATH%"

echo 1. Memulakan pelayan tiket...
start /b "" "C:\Users\User\.gemini\antigravity\scratch\bin\node-v20.18.0-win-x64\node.exe" server.js

timeout /t 2 /nobreak >nul

echo 2. Menghubungkan ke Internet Awam...
echo.
echo =========================================================
echo  AKSES TEMPATAN (Di Komputer Anda):
echo  - Laman Awam:    http://localhost:3000
echo  - Portal Admin:  http://localhost:3000/pengurusan-pentadbir.html
echo =========================================================
echo.
echo Menjana pautan internet untuk dikongsi ke Phone / iPad / Laptop pembeli...
echo (Sila salin pautan HTTPS yang dipaparkan di bawah nanti):
echo.
"C:\Users\User\.gemini\antigravity\scratch\bin\cloudflared.exe" tunnel --url http://localhost:3000
pause
