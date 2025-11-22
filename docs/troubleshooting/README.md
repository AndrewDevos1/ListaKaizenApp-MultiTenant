# Troubleshooting Guide

This directory contains documentation for all known issues and their solutions.

## 🚨 Deployment Issues

### Render Platform
- **[Deployment to Render](deployment-render.md)** - Complete guide for all Render deployment issues
  - SQLite in production (wrong Start Command)
  - Multiple migration heads
  - Missing tables (fornecedor_lista, lista_mae_itens)
  - Missing columns (responsavel, observacao)
  - Build Command configuration
  - Pre-Deploy Command limitations (paid plans only)

- **[502 Error Resolution](502-error-resolution.md)** - Specific 502 error troubleshooting

---

## 🔐 Authentication Issues

- **[JWT Paused Bug](jwt-paused-bug.md)** - JWT authentication pause/freeze issue
- **[JWT Final Resolution](jwt-final-resolution.md)** - Complete JWT bug fix report

---

## 🌐 CORS Issues

- **[CORS Registration Fix](cors-registration-fix.md)** - CORS errors during user registration
- **[CORS Host Binding Fix](cors-host-binding-fix.md)** - CORS preflight and host binding configuration

---

## 🗄️ Database Issues

- **[Database Migration Notes](database-migration-notes.md)** - Database migration troubleshooting
- See also: [deployment-render.md](deployment-render.md) for migration-related deployment issues

---

## 🎨 Frontend Issues

- **[Theme Change Fix](theme-change-fix.md)** - Theme switching bug resolution
- **[Infinite Scroll Fix](infinite-scroll-fix.md)** - Infinite scroll loop bug

---

## 💡 Quick Reference

### Most Common Issues

1. **Can't login/502 error on Render** → [deployment-render.md](deployment-render.md#-erro-no-such-table-usuarios-sqlite-em-produção)
2. **Can't delete lists in production** → [deployment-render.md](deployment-render.md#-erro-não-consigo-deletar-listas-na-web-22112025)
3. **CORS errors** → [cors-registration-fix.md](cors-registration-fix.md) or [cors-host-binding-fix.md](cors-host-binding-fix.md)
4. **JWT not working** → [jwt-final-resolution.md](jwt-final-resolution.md)
5. **Migrations failing** → [deployment-render.md](deployment-render.md#️-solução-completa-para-migrations)

---

## 📝 How to Add New Issues

When documenting a new issue:

1. Create a new markdown file in this directory
2. Use descriptive filename (e.g., `feature-name-error.md`)
3. Include these sections:
   ```markdown
   # Issue Title

   ## Symptoms
   - What the user experiences

   ## Root Cause
   - Technical explanation of the problem

   ## Solution
   - Step-by-step fix

   ## Prevention
   - How to avoid this in the future
   ```
4. Update this README with a link to the new doc
5. Reference from main `docs/README.md` if critical
