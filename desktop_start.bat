@echo off
setlocal

where python >nul 2>nul
if %errorlevel%==0 (
  python desktop_server.py
  exit /b %errorlevel%
)

where py >nul 2>nul
if %errorlevel%==0 (
  py desktop_server.py
  exit /b %errorlevel%
)

echo Python not found. Please install Python 3 and try again.
exit /b 1
