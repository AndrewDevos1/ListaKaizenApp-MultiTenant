# Running Kaizen Lists Locally

Complete guide to run the application in development mode.

---

## 📋 Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- PostgreSQL (optional, for local PostgreSQL setup)

---

## 🚀 Quick Start Scripts

**Fastest way to start** - Use the provided scripts:

### Windows
```bash
# Terminal 1: Backend
run-backend.bat

# Terminal 2: Frontend
run-frontend.bat
```

### Linux/macOS
```bash
# First time: Give execute permission
chmod +x run-backend.sh run-frontend.sh

# Terminal 1: Backend
./run-backend.sh

# Terminal 2: Frontend
./run-frontend.sh
```

---

## 🔧 Manual Setup (Step by Step)

### Backend Setup

**1. Navigate to backend directory:**
```bash
cd backend
```

**2. Create and activate virtual environment:**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Choose your database:**

See [Choosing Database](#-choosing-database) section below.

**5. Run migrations:**
```bash
flask db upgrade
```

**6. Create admin user (first time only):**
```bash
# Windows
../.venv/Scripts/python.exe create_admin_user.py

# Linux/macOS
python create_admin_user.py
```

**7. Start backend:**
```bash
flask run
```

Backend will be running at: **http://127.0.0.1:5000**

---

### Frontend Setup

**1. Navigate to frontend directory:**
```bash
cd frontend
```

**2. Install dependencies:**
```bash
npm install
```

**3. Start frontend:**
```bash
npm start
```

Frontend will open automatically at: **http://localhost:3000**

---

## 💾 Choosing Database

You have **2 options** for local development:

### Option 1: SQLite (Default) - Quickest Start ✨

**No configuration needed!** Just run `flask run` and it works.

```bash
cd backend
flask run
```

**You'll see:**
```
============================================================
  💾 Database: 📁 SQLite
  📂 File: kaizen_dev.db
  🏷️  Environment: development
============================================================
```

**Pros:**
- ✅ Zero setup
- ✅ Fast to start
- ✅ Good for beginners

**Cons:**
- ⚠️ Different from production (which uses PostgreSQL)
- ⚠️ Some features may behave differently

---

### Option 2: PostgreSQL Local (Recommended) 🐘

**Same database as production!** Better for serious development.

**Setup steps:**
1. Install PostgreSQL - see [PostgreSQL Setup Guide](postgresql-setup.md)
2. Create database `kaizen_dev`
3. Create `.env` file in `backend/`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and uncomment:
   ```bash
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/kaizen_dev
   ```
5. Run migrations:
   ```bash
   flask db upgrade
   ```
6. Start backend:
   ```bash
   flask run
   ```

**You'll see:**
```
============================================================
  💾 Database: 🐘 PostgreSQL
  🔗 Connection: localhost:5432/kaizen_dev
  🏷️  Environment: development
============================================================
```

**Pros:**
- ✅ Identical to production
- ✅ Test real migrations
- ✅ Avoid SQLite-specific bugs

**Cons:**
- ⚠️ Requires PostgreSQL installation
- ⚠️ Slightly more setup

**For complete PostgreSQL setup instructions:** [PostgreSQL Setup Guide](postgresql-setup.md)

---

## 🔄 Development Workflow

### Making Changes

**Backend changes:**
1. Edit code in `backend/kaizen_app/`
2. Flask auto-reloads (if in debug mode)
3. See changes immediately

**Frontend changes:**
1. Edit code in `frontend/src/`
2. React auto-reloads
3. Browser refreshes automatically

---

### Database Migrations

**When you change models:**

```bash
cd backend

# Create migration
flask db migrate -m "Description of changes"

# Review generated migration in backend/migrations/versions/

# Apply migration
flask db upgrade
```

---

## 🛠️ Troubleshooting

### Backend won't start

**Error: "No module named flask"**
```bash
# Make sure venv is activated
cd backend
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/macOS

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: "database locked" (SQLite)**
- Close other connections to the database
- Or switch to PostgreSQL (recommended)

---

### Frontend won't start

**Error: "npm command not found"**
- Install Node.js: https://nodejs.org/

**Error: "EADDRINUSE: address already in use"**
- Port 3000 is already in use
- Kill the process or use different port:
  ```bash
  PORT=3001 npm start
  ```

---

### CORS Errors

If you see CORS errors in browser console:

**Solution:** Make sure backend is running on `http://127.0.0.1:5000` (not `localhost:5000`)

**Check backend URL:**
```bash
# Should show 127.0.0.1, not localhost
flask run
```

---

## 📝 Environment Variables

Backend reads configuration from `.env` file (if exists):

```bash
# backend/.env

# Environment
FLASK_CONFIG=development

# Database (choose one)
DATABASE_URL=postgresql://postgres:password@localhost:5432/kaizen_dev
# OR use SQLite (default):
# DATABASE_URL=sqlite:///kaizen_dev.db

# JWT Secret
SECRET_KEY=dev-secret-key-12345

# CORS (optional)
CORS_ORIGINS=http://localhost:3000
```

**Template available:** `backend/.env.example`

---

## 🎯 Testing

**Backend tests:**
```bash
cd backend
pytest
```

**Frontend tests:**
```bash
cd frontend
npm test
```

---

## 🚀 What's Next?

- **First time?** Create an admin user: `python create_admin_user.py`
- **Need PostgreSQL?** See [PostgreSQL Setup Guide](postgresql-setup.md)
- **Deploying?** See [Deployment Guide](../troubleshooting/deployment-render.md)
- **Issues?** See [Troubleshooting](../troubleshooting/README.md)

---

## 📚 Summary

**Quickest start (SQLite):**
```bash
# Terminal 1
cd backend
flask run

# Terminal 2
cd frontend
npm start
```

**Production-like (PostgreSQL):**
1. Setup PostgreSQL: [PostgreSQL Guide](postgresql-setup.md)
2. Create `.env` with DATABASE_URL
3. Run migrations: `flask db upgrade`
4. Start: `flask run`

**Scripts (easiest):**
```bash
run-backend.bat   # Windows
run-frontend.bat

./run-backend.sh  # Linux/macOS
./run-frontend.sh
```

---

**Need help?** Check:
- [PostgreSQL Setup](postgresql-setup.md) - Database configuration
- [Troubleshooting](../troubleshooting/README.md) - Common issues
- [CLAUDE.md](../../CLAUDE.md) - Project overview
