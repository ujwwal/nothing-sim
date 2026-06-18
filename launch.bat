@echo off
title Aegis Simulation Launcher
cls

echo =======================================================================
echo               Aegis Simulation - Windows Launcher
echo =======================================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js v18 or higher from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python 3.9 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo [1/4] Checking and installing Frontend dependencies...
if not exist "node_modules\" (
    echo node_modules folder not found. Installing dependencies via npm...
    call npm install
) else (
    echo Frontend dependencies are already installed.
)
echo.

echo [2/4] Setting up Backend Python Virtual Environment...
cd api
if not exist ".venv\" (
    echo Creating virtual environment in api\.venv...
    python -m venv .venv
)

echo Activating virtual environment to verify dependencies...
call .venv\Scripts\activate.bat

python -c "import uvicorn" >nul 2>nul
if %errorlevel% neq 0 (
    echo Dependencies not found or incomplete. Installing backend dependencies...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
) else (
    echo Backend dependencies are already installed.
)
cd ..
echo.

echo [3/4] Launching Backend API Server on Port 8000...
start "Aegis Sim - Backend API" cmd /k "cd api && call .venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

echo [4/4] Launching Frontend Development Server on Port 3000...
start "Aegis Sim - Frontend UI" cmd /k "npm run dev"

echo.
echo =======================================================================
echo  Aegis Simulation is starting up!
echo =======================================================================
echo.
echo  - Frontend UI URL:  http://localhost:3000
echo  - Backend API URL:  http://localhost:8000
echo  - Interactive Docs: http://localhost:8000/docs
echo.
echo  Keep this window open. Press any key to stop the servers and exit.
echo  This will stop processes on ports 3000 and 8000.
echo =======================================================================
echo.
pause

echo.
echo Stopping servers...
:: Kill processes on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
:: Kill processes on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Servers stopped. Goodbye!
pause
