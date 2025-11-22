# PostgreSQL Local Setup Guide

Complete guide to set up PostgreSQL locally for Kaizen Lists development.

---

## 🎯 Why PostgreSQL Local?

**Recommended for:**
- ✅ Serious development (same database as production)
- ✅ Testing migrations before deploy
- ✅ Avoiding SQLite-specific bugs
- ✅ Learning PostgreSQL

**SQLite is fine for:**
- Quick prototyping
- Simple features
- Getting started quickly

---

## 📥 Installation

### Windows

**Option 1: Official Installer (Recommended)**

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation:
   - **Password:** Set a password you'll remember (e.g., `postgres`)
   - **Port:** Keep default `5432`
   - **Locale:** Default is fine
4. Install pgAdmin (GUI tool) - optional but helpful

**Option 2: Chocolatey**

```powershell
# If you have Chocolatey installed
choco install postgresql
```

---

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### macOS

**Option 1: Homebrew**

```bash
brew install postgresql@17
brew services start postgresql@17
```

**Option 2: Postgres.app**

Download from: https://postgresapp.com/

---

## 🔧 Post-Installation Setup

### 1. Verify Installation

```bash
# Check PostgreSQL version
psql --version
# Should show: psql (PostgreSQL) 17.x

# Check if PostgreSQL is running (Windows)
# Services → PostgreSQL 17 → should be "Running"

# Check if PostgreSQL is running (Linux/macOS)
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
```

---

### 2. Create Development Database

**Windows:**

```powershell
# Open Command Prompt or PowerShell as Administrator
# Connect to PostgreSQL (password: what you set during installation)
psql -U postgres

# Inside psql:
CREATE DATABASE kaizen_dev;

# Verify database was created
\l

# Exit psql
\q
```

**Linux/macOS:**

```bash
# Connect as postgres user
sudo -u postgres psql

# Inside psql:
CREATE DATABASE kaizen_dev;

# Verify
\l

# Exit
\q
```

---

### 3. Configure Backend

**Create `.env` file in `backend/` directory:**

```bash
cd backend
cp .env.example .env
```

**Edit `.env` file:**

```bash
# Uncomment and update this line:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/kaizen_dev
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

**Example:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaizen_dev
```

---

### 4. Run Migrations

```bash
cd backend

# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/macOS

# Run migrations to create tables
flask db upgrade
```

**Expected output:**
```
============================================================
  💾 Database: 🐘 PostgreSQL
  🔗 Connection: localhost:5432/kaizen_dev
  🏷️  Environment: development
============================================================

INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 173f5518beb9, Initial database migration.
...
```

---

### 5. Start Backend

```bash
flask run
```

**You should see:**
```
============================================================
  💾 Database: 🐘 PostgreSQL
  🔗 Connection: localhost:5432/kaizen_dev
  🏷️  Environment: development
============================================================

 * Serving Flask app 'kaizen_app'
 * Debug mode: off
WARNING: This is a development server.
 * Running on http://127.0.0.1:5000
```

✅ **Success!** Your backend is now using PostgreSQL locally.

---

## 🎨 Using pgAdmin (Optional)

pgAdmin is a GUI tool to manage PostgreSQL databases.

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to server:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: (your password)
3. Navigate: Servers → PostgreSQL 17 → Databases → kaizen_dev
4. You can now view tables, run queries, etc.

---

## 🔍 Troubleshooting

### Error: "role postgres does not exist"

**Linux/macOS:**
```bash
# Create postgres user
sudo -u postgres createuser -s $USER
```

---

### Error: "database kaizen_dev does not exist"

```bash
# Create database
createdb kaizen_dev
```

---

### Error: "password authentication failed for user postgres"

**Solution 1: Check password in `.env`**
```bash
# Make sure password in .env matches PostgreSQL password
DATABASE_URL=postgresql://postgres:CORRECT_PASSWORD@localhost:5432/kaizen_dev
```

**Solution 2: Reset PostgreSQL password**

```bash
# Connect without password (Linux/macOS)
sudo -u postgres psql

# Inside psql:
ALTER USER postgres PASSWORD 'newpassword';
\q

# Update .env with new password
```

---

### Error: "could not connect to server: Connection refused"

PostgreSQL service is not running.

**Windows:**
```
Services → PostgreSQL 17 → Start
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**macOS:**
```bash
brew services start postgresql@17
```

---

### Error: "port 5432 already in use"

Another PostgreSQL instance is running.

**Find what's using port 5432:**
```bash
# Windows
netstat -ano | findstr :5432

# Linux/macOS
lsof -i :5432
```

Stop the other instance or change PostgreSQL port in configuration.

---

## 📊 Comparing PostgreSQL vs SQLite

| Feature | PostgreSQL Local | SQLite (Default) |
|---------|-----------------|------------------|
| **Setup** | Medium (install PostgreSQL) | Zero (just works) |
| **Performance** | Fast (optimized for concurrent access) | Fast (single-file) |
| **Production Parity** | ✅ Identical to Render | ❌ Different (SQLite vs PostgreSQL) |
| **Migrations** | ✅ Test real migrations | ⚠️ May differ from production |
| **Data Types** | PostgreSQL types (JSONB, arrays, etc.) | Limited types |
| **Concurrency** | Excellent (multi-user) | Limited (file locks) |
| **Tooling** | pgAdmin, psql, many tools | Basic SQLite browser |

---

## 🔄 Switching Back to SQLite

If you want to go back to SQLite:

```bash
# Delete or rename .env file
mv backend/.env backend/.env.backup

# Or comment out DATABASE_URL in .env:
# DATABASE_URL=postgresql://postgres:...
```

Flask will automatically use SQLite fallback.

---

## 🎓 Next Steps

- ✅ Backend is now using PostgreSQL
- ✅ Create some test data
- ✅ Practice creating migrations: `flask db migrate -m "description"`
- ✅ Learn pgAdmin to inspect your database
- ✅ Read [Running Locally Guide](running-locally.md) for full workflow

---

## 📝 Summary

**What you did:**
1. ✅ Installed PostgreSQL
2. ✅ Created `kaizen_dev` database
3. ✅ Configured `.env` with DATABASE_URL
4. ✅ Ran migrations
5. ✅ Started backend with PostgreSQL

**Benefits:**
- Same database as production (Render uses PostgreSQL)
- Test migrations properly
- Avoid SQLite-specific bugs
- Learn PostgreSQL (valuable skill!)

---

**Need help?** Check the [troubleshooting](#-troubleshooting) section or refer to:
- [Running Locally](running-locally.md)
- [Official PostgreSQL docs](https://www.postgresql.org/docs/)
