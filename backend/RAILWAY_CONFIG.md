# 🚂 Configuração Railway - Backend Flask

## Configuração no Dashboard do Railway

### 1️⃣ **Settings → Environment**

#### Variáveis de Ambiente:
```bash
FLASK_CONFIG=production
FLASK_APP=run.py
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=sua-chave-super-secreta-aqui-mude-isso
```

### 2️⃣ **Settings → Build**

**NÃO** adicione Build Command manualmente!  
O Railway detecta automaticamente o `requirements.txt` e instala as dependências.

### 3️⃣ **Settings → Deploy**

#### Start Command:
```bash
flask db upgrade && python fix_render_db_emergency.py && gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

**OU** deixe vazio que o Railway usa o `Procfile` automaticamente.

### 4️⃣ **Settings → Service**

- **Root Directory:** `/backend`
- **Watch Paths:** `/backend/**`

---

## ⚡ Como o Deploy Funciona

1. **Railway detecta `requirements.txt`**
2. **Instala dependências** automaticamente: `pip install -r requirements.txt`
3. **Executa Start Command:**
   - `flask db upgrade` → Roda migrações
   - `python fix_render_db_emergency.py` → Corrige schema se necessário
   - `gunicorn` → Inicia o servidor

---

## 🔧 Troubleshooting

### Erro: "flask: command not found"
**Solução:** Certifique-se que `Flask` está no `requirements.txt`

### Erro: "No module named gunicorn"
**Solução:** Certifique-se que `gunicorn` está no `requirements.txt`

### Erro: "DATABASE_URL not set"
**Solução:** 
1. Verifique que PostgreSQL está adicionado ao projeto
2. Configure: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

---

## ✅ Checklist

- [ ] PostgreSQL adicionado ao projeto Railway
- [ ] Root Directory: `/backend`
- [ ] Variáveis de ambiente configuradas
- [ ] Start Command configurado
- [ ] Deploy iniciado

---

**Depois de configurar, faça:**
```bash
git add -A
git commit -m "fix: Configuração Railway corrigida"
git push origin master
```

Railway detectará o push e fará novo deploy automaticamente! 🚀
