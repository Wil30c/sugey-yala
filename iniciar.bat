@echo off
title SugeySpotify - Sugey Yala
cd /d "%~dp0"
echo.
echo   SugeySpotify esta abriendose en tu navegador: http://localhost:8080
echo   Deja esta ventana abierta mientras escuchas. Cierrala para apagar la app.
echo.
start "" http://localhost:8080
python -m http.server 8080
if errorlevel 1 (
  echo.
  echo   No se encontro Python. Instalalo desde https://www.python.org y vuelve a abrir este archivo.
  pause
)
