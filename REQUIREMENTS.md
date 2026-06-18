# Project Requirements

This document outlines all dependencies and setup instructions for running the `nothing-sim-pvt` project (AEGIS Simulation Platform).

## System Requirements

- **OS**: Windows, macOS, or Linux
- **Node.js**: 18.0.0 or higher (for frontend)
- **Python**: 3.9 or higher (for backend API)
- **npm**: 9.0.0 or higher (comes with Node.js)

## Frontend (Next.js + React)

### Dependencies
All frontend dependencies are listed in `package.json` and include:

**Core Framework:**
- `next@15.0.0` - React framework for production
- `react@^19.0.0` - UI library
- `react-dom@^19.0.0` - React DOM rendering

**UI & Styling:**
- `tailwindcss@^3.4.0` - Utility-first CSS framework
- `postcss@^8.4.0` - CSS transformation tool
- `autoprefixer@^10.4.0` - PostCSS plugin for vendor prefixes
- `framer-motion@^11.0.0` - Animation library
- `lucide-react@^0.360.0` - Icon library
- `clsx@^2.1.0` - Utility for constructing className strings
- `tailwind-merge@^2.2.0` - Merge Tailwind CSS classes without conflicts

**Data Management & Forms:**
- `recharts@^2.12.0` - Composable charting library
- `@tanstack/react-table@^8.13.0` - Headless table library
- `react-hook-form@^7.50.0` - Performant form validation
- `zod@^3.22.0` - TypeScript-first schema validation
- `zustand@^4.5.0` - Lightweight state management

**Development:**
- `typescript@^5.4.0` - JavaScript with static typing
- `@types/react@^19.0.0` - React type definitions
- `@types/react-dom@^19.0.0` - React DOM type definitions
- `@types/node@^20.0.0` - Node.js type definitions
- `eslint@^8.0.0` - JavaScript linter
- `eslint-config-next@15.0.0` - ESLint configuration for Next.js

### Installation & Running

```bash
# Install frontend dependencies (with legacy peer deps due to React 19 compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev
# Frontend will be available at http://localhost:3000

# Build for production
npm run build

# Run production server
npm start

# Lint the code
npm lint
```

## Backend (FastAPI + Python)

### Dependencies
All backend dependencies are listed in `api/requirements.txt` and include:

**Web Framework:**
- `fastapi==0.110.0` - Modern async web framework
- `uvicorn==0.29.0` - ASGI server
- `python-multipart==0.0.9` - Parsing multipart form data

**Data Processing:**
- `pandas==2.2.1` - Data manipulation and analysis
- `numpy==1.26.4` - Numerical computing
- `scipy==1.12.0` - Scientific computing utilities

**Data Validation & Schemas:**
- `pydantic==2.6.4` - Data validation using Python type hints
- `pandera==0.18.3` - Data validation framework for pandas

**File Handling:**
- `openpyxl==3.1.2` - Read/write Excel files (.xlsx)
- `pyxlsb==1.0.10` - Read Excel binary files (.xlsb)

**Development & Quality (Optional):**
- `pytest==7.4.3` - Testing framework
- `pytest-asyncio==0.23.2` - AsyncIO support for pytest
- `black==23.12.1` - Code formatter
- `flake8==6.1.0` - Code linter
- `mypy==1.7.1` - Static type checker

**Utilities:**
- `python-dotenv==1.0.0` - Environment variable management

### Installation & Running

```bash
# Navigate to API directory
cd api

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start API development server
uvicorn main:app --reload --port 8000
# API will be available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs

# Or use the npm script from root
npm run api
```

## Development Setup

### Complete Setup from Scratch

```bash
# 1. Clone repository
git clone <repo-url>
cd nothing-sim-pvt

# 2. Install & run frontend
npm install --legacy-peer-deps
npm run dev
# Frontend: http://localhost:3000

# 3. In another terminal, setup & run backend
cd api
python -m venv venv
# Activate venv (see commands above)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Backend: http://localhost:8000
```

### Running Both Simultaneously

**Option 1: Two separate terminals**
- Terminal 1: `npm run dev` (from root)
- Terminal 2: `cd api && uvicorn main:app --reload --port 8000`

**Option 2: Using npm script (if configured)**
```bash
npm run api  # Runs backend from root directory
```

## Environment Variables

Create a `.env` file in the root directory if needed:

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (if api/.env needed)
DATABASE_URL=your_database_url
LOG_LEVEL=INFO
```

## API Documentation

When the backend is running, access Swagger UI documentation at:
- http://localhost:8000/docs

## Common Issues & Solutions

### Frontend: `next` not found
- **Issue**: Command `'next' is not recognized`
- **Solution**: Run `npm install --legacy-peer-deps` to install dependencies

### Frontend: Peer dependency conflicts
- **Issue**: npm error about lucide-react and React 19 compatibility
- **Solution**: Use `npm install --legacy-peer-deps` flag

### Backend: Module not found errors
- **Issue**: Python dependencies missing
- **Solution**: Ensure virtual environment is activated and run `pip install -r requirements.txt`

### Port already in use
- **Issue**: Port 3000 or 8000 already in use
- **Solution**: Kill the process or specify a different port:
  - Frontend: `npm run dev -- -p 3001`
  - Backend: `uvicorn main:app --port 8001`

## Production Deployment Notes

- Frontend: Build with `npm run build` and deploy built static files
- Backend: Use production ASGI server (e.g., Gunicorn with Uvicorn workers)
- Ensure environment variables are properly configured
- Consider adding security headers and CORS policies
