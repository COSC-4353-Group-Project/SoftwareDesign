@echo off
title BribeSmart dev server
rem Always run from the folder this file lives in, wherever it was double-clicked from.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing packages, this takes a minute...
  call npm install
  if errorlevel 1 (
    echo npm install failed. See the errors above.
    pause
    exit /b 1
  )
)

rem Backend (Express API on port 3001) gets its own window so its logs stay separate.
start "BribeSmart API" cmd /k npm run server

echo.
echo Starting BribeSmart at http://localhost:5173
echo Your browser will open automatically. Close BOTH windows to stop everything.
echo.
call npm run dev -- --open
pause
