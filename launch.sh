#!/usr/bin/env bash

# Aegis Simulation - Linux & macOS Launcher
# This script starts both the FastAPI backend and Next.js frontend, managing dependencies and cleanup.

# Exit on script error (non-background processes)
set -e

# Setup colors for premium CLI output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${PURPLE}              Aegis Simulation - Linux & macOS Launcher                ${NC}"
echo -e "${CYAN}=======================================================================${NC}"
echo ""

# Get the directory where this script lives
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo -e "Root directory: ${BLUE}$ROOT${NC}"
echo ""

# Function to handle errors gracefully
fatal() {
    echo -e "\n${RED}-----------------------------------------------------------------------${NC}"
    echo -e "${RED}[ERROR] Launch failed. Read the message above.${NC}"
    echo -e "${RED}-----------------------------------------------------------------------${NC}"
    exit 1
}

# ── 1. Check for Node.js ──────────────────────────────────────────────────
echo -e "${CYAN}[1/4] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found in PATH.${NC}"
    echo -e "        Please install Node.js from https://nodejs.org/"
    fatal
fi
NODE_VERSION=$(node --version)
echo -e "       Found Node.js ${GREEN}$NODE_VERSION${NC}"
echo ""

# ── 2. Check for Python ──────────────────────────────────────────────────
echo -e "${CYAN}[2/4] Checking Python...${NC}"
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    # Make sure it's Python 3
    PY_VER=$(python -c 'import sys; print(sys.version_info[0])' 2>/dev/null || echo "0")
    if [ "$PY_VER" -eq 3 ]; then
        PYTHON_CMD="python"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}[ERROR] Python 3 not found in PATH.${NC}"
    echo -e "        Please install Python 3.9+ from https://www.python.org/"
    fatal
fi
PY_VERSION=$($PYTHON_CMD --version)
echo -e "       Found ${GREEN}$PY_VERSION${NC} (using '$PYTHON_CMD')"
echo ""

# ── 3. Frontend dependencies ──────────────────────────────────────────────
echo -e "${CYAN}[3/4] Frontend dependencies...${NC}"
if [ ! -d "$ROOT/node_modules" ]; then
    echo -e "       Installing npm packages (first run)..."
    cd "$ROOT"
    npm install --legacy-peer-deps || fatal
else
    echo -e "       node_modules already present. Skipping."
fi
echo ""

# ── 4. Backend venv + dependencies ───────────────────────────────────────
echo -e "${CYAN}[4/4] Backend setup...${NC}"
API_DIR="$ROOT/api"
VENV="$API_DIR/.venv"
VENV_PYTHON="$VENV/bin/python"
VENV_PIP="$VENV/bin/pip"
VENV_UVICORN="$VENV/bin/uvicorn"

if [ ! -d "$VENV" ]; then
    echo -e "       Creating virtual environment..."
    $PYTHON_CMD -m venv "$VENV" || fatal
fi

# Check if core packages are installed
if ! "$VENV_PYTHON" -c "import uvicorn" &> /dev/null; then
    echo -e "       Installing backend packages (first run - may take a minute)..."
    "$VENV_PIP" install --upgrade pip --quiet || fatal
    "$VENV_PIP" install -r "$API_DIR/requirements.txt" || fatal
else
    echo -e "       Backend packages already installed."
fi

if [ ! -f "$VENV_UVICORN" ]; then
    echo -e "${RED}[ERROR] uvicorn not found at: $VENV_UVICORN${NC}"
    echo -e "        Something went wrong during backend installation."
    fatal
fi
echo ""

# Disable immediate exit on error for background tasks
set +e

# ── Launch servers ────────────────────────────────────────────────────────
echo -e "${BLUE}Launching Backend API Server on port 8000...${NC}"
"$VENV_UVICORN" main:app --reload --port 8000 --app-dir "$API_DIR" &
BACKEND_PID=$!

echo -e "${BLUE}Launching Frontend on port 3000...${NC}"
cd "$ROOT"
npm run dev &
FRONTEND_PID=$!

# Function to stop background processes when this script exits
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping Aegis servers...${NC}"
    
    # Try SIGINT first for clean exit
    kill -2 $BACKEND_PID 2>/dev/null
    kill -2 $FRONTEND_PID 2>/dev/null
    
    sleep 1
    
    # Force kill if still running
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    
    echo -e "${GREEN}Done. Goodbye!${NC}"
}

# Trap exit signals to run cleanup
trap cleanup EXIT INT TERM

echo ""
echo -e "${GREEN}=======================================================================${NC}"
echo -e "${GREEN} Both servers are starting up!${NC}"
echo ""
echo -e "   Frontend:  ${CYAN}http://localhost:3000${NC}"
echo -e "   Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "   API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW} Press [Ctrl+C] to STOP both servers and exit.${NC}"
echo -e "${GREEN}=======================================================================${NC}"
echo ""

# Keep shell script running until interrupted
while true; do
    sleep 1
done
