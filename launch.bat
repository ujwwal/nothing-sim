@echo off
setlocal EnableDelayedExpansion
title Aegis Simulation Launcher
cls

echo =======================================================================
echo               Aegis Simulation - Windows Launcher
echo =======================================================================
echo.

:: Get the directory where this script lives (absolute path)
set "ROOT=%~dp0"
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo Root directory: %ROOT%
echo.

:: ── 1. Check for Node.js ──────────────────────────────────────────────────
echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH.
    echo         Install from https://nodejs.org/
    goto :fatal
)
for /f "tokens=*" %%v in ('node --version') do echo        Found Node.js %%v
echo.

:: ── 2. Check for Python ──────────────────────────────────────────────────
echo [2/4] Checking Python...
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found in PATH.
    echo         Install from https://www.python.org/
    goto :fatal
)
for /f "tokens=*" %%v in ('python --version') do echo        Found %%v
echo.

:: ── 3. Frontend dependencies ──────────────────────────────────────────────
echo [3/4] Frontend dependencies...
if not exist "%ROOT%\node_modules\" (
    echo        Installing npm packages ^(first run^)...
    cd /d "%ROOT%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check output above.
        goto :fatal
    )
) else (
    echo        node_modules already present. Skipping.
)
echo.

:: ── 4. Backend venv + dependencies ───────────────────────────────────────
echo [4/4] Backend setup...
set "API_DIR=%ROOT%\api"
set "VENV=%API_DIR%\.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "PIP=%VENV%\Scripts\pip.exe"
set "UVICORN=%VENV%\Scripts\uvicorn.exe"

if not exist "%VENV%\" (
    echo        Creating virtual environment...
    python -m venv "%VENV%"
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        goto :fatal
    )
)

:: Check if core packages are installed
"%PYTHON%" -c "import uvicorn" >nul 2>nul
if errorlevel 1 (
    echo        Installing backend packages ^(first run - may take a minute^)...
    "%PIP%" install --upgrade pip --quiet
    "%PIP%" install -r "%API_DIR%\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] pip install failed. Check output above.
        goto :fatal
    )
) else (
    echo        Backend packages already installed.
)

if not exist "%UVICORN%" (
    echo [ERROR] uvicorn.exe not found at: %UVICORN%
    echo         Something went wrong during installation.
    goto :fatal
)
echo.

:: ── Launch servers ────────────────────────────────────────────────────────
echo Launching Backend API Server on port 8000...
start "Aegis - Backend" cmd /k ""%UVICORN%" main:app --reload --port 8000 --app-dir "%API_DIR%""

echo Launching Frontend on port 3000...
start "Aegis - Frontend" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo =======================================================================
echo  Both servers are starting up!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo  Press any key here to STOP both servers and exit.
echo =======================================================================
echo.
pause

:: ── Cleanup ───────────────────────────────────────────────────────────────
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo Done. Goodbye!
goto :eof

:fatal
echo.
echo -----------------------------------------------------------------------
echo  Launch failed. Read the error above, then press any key to exit.
echo -----------------------------------------------------------------------
pause
exit /b 1
