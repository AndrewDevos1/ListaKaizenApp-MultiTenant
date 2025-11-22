# Kaizen Lists - Documentation

Complete documentation for the Kaizen Lists inventory management application.

## 📚 Documentation Structure

### 🚨 [Troubleshooting](troubleshooting/)
**Start here if you're experiencing issues**

Critical fixes for common problems:
- [Render Deployment Issues](troubleshooting/deployment-render.md) - 502 errors, SQLite in production, missing tables
- [CORS Issues](troubleshooting/cors-registration-fix.md) - CORS errors and configuration
- [JWT Authentication](troubleshooting/jwt-final-resolution.md) - Login/authentication problems
- [Database Migrations](troubleshooting/database-migration-notes.md) - Migration errors and fixes

See [troubleshooting/README.md](troubleshooting/README.md) for complete index.

---

### 📖 [Guides](guides/)
Step-by-step guides for common tasks:

- [Running Locally](guides/running-locally.md) - How to run the application in development
- [CORS Configuration](guides/cors-configuration.md) - Configuring CORS properly
- [User Management](guides/user-management.md) - Managing users and permissions
- [Clearing Cache](guides/clearing-cache.md) - Cache management
- [Git Push Instructions](guides/git-push-instructions.md) - Git workflow

---

### 🏗️ [Architecture](architecture/)
System design and technical architecture:

- [Project Purpose](architecture/project-purpose.md) - Why this project exists
- [Backend (Flask)](architecture/backend-flask.md) - Backend architecture and patterns
- [Database](architecture/database.md) - Database design and schema
- [Data Flow](architecture/data-flow.md) - How data flows through the system
- [ER Model](architecture/er-model.md) - Entity-relationship diagram
- [Frontend Screens](architecture/frontend-screens.md) - Frontend screen flow
- [Domain-Driven Design](architecture/domain-driven-design.md) - DDD principles applied

---

### 📅 [Planning](planning/)
Project planning, roadmap, and implementation phases:

- [Roadmap](planning/roadmap.md) - Current issues and next steps
- [Implementation Phases](planning/implementation-phases/) - Phased implementation plans
- [UX Design](planning/ux-design/) - UX/UI design documentation

---

### 📦 [Archive](archive/)
Historical documents and session checkpoints:

- [Checkpoints](archive/checkpoints/) - Session pause points
- [Session Notes](archive/session-notes/) - Temporary notes from sessions
- [Old Fixes](archive/old-fixes/) - Deprecated fix documentation

---

## 🚀 Quick Start

**New to the project?** Read these in order:

1. [Project Purpose](architecture/project-purpose.md) - Understand what we're building
2. [Running Locally](guides/running-locally.md) - Get the app running
3. [Architecture Overview](architecture/backend-flask.md) - Understand the system
4. [Troubleshooting](troubleshooting/README.md) - Fix common issues

**Deploying to production?**

1. Read [Deployment Guide](troubleshooting/deployment-render.md) first
2. Follow [CORS Configuration](guides/cors-configuration.md)
3. Keep [Troubleshooting Index](troubleshooting/README.md) handy

---

## 🤖 For AI Assistants

This documentation structure follows industry standards for maximum discoverability:

- **Troubleshooting**: Start here for error resolution
- **Guides**: HOW-TO documentation
- **Architecture**: WHAT and WHY documentation
- **Planning**: WHEN and future direction
- **Archive**: Historical context (usually not needed)

Critical paths:
- Login/502 errors → `troubleshooting/deployment-render.md`
- CORS errors → `troubleshooting/cors-*-fix.md`
- Database issues → `troubleshooting/deployment-render.md` (migrations section)
- New feature planning → `planning/roadmap.md`

---

## 📝 Contributing to Docs

When adding new documentation:

1. **Choose the right location:**
   - Problem fixes → `troubleshooting/`
   - How-to guides → `guides/`
   - Architecture decisions → `architecture/`
   - Future plans → `planning/`

2. **Use clear filenames:**
   - Use lowercase with hyphens: `feature-name-guide.md`
   - Be descriptive: `cors-registration-fix.md` not `fix1.md`

3. **Update indexes:**
   - Add entry to relevant section README
   - Update this main README if critical

4. **Include these sections:**
   ```markdown
   # Title

   Brief description (1-2 sentences)

   ## Context/Background
   ## Steps/Content
   ## Examples (if applicable)
   ## Related Documentation
   ```

5. **Cross-reference:**
   - Link to related docs
   - Update `CLAUDE.md` if AI needs to know about it

---

## 🔗 Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Instructions for Claude Code AI
- [README.md](../README.md) - Project overview and setup
- [Backend README](../backend/README.md) - Backend-specific docs (if exists)
- [Frontend README](../frontend/README.md) - Frontend-specific docs

---

Last updated: 2025-11-22
