@echo off
title Pelayan Tiket JEJAK66
echo =========================================================
echo    MEMULAKAN SISTEM TIKET PEMENTASAN TEATER JEJAK66
echo =========================================================
echo.
set PATH=%~dp0..\bin\node-v20.18.0-win-x64;%PATH%
echo Laman Pembelian Awam: http://localhost:3000
echo Portal Admin Rahsia:  http://localhost:3000/pengurusan-pentadbir.html
echo.
node server.js
pause
