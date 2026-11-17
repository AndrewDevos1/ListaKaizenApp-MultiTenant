#!/usr/bin/env python3
"""Smoke RH idempotente (stdlib). Pode rodar N vezes no mesmo banco descartavel.
Uso: SMOKE_BASE=http://localhost:3022/api/v1 SMOKE_PASSWORD=... python3 scripts/smoke_rh.py
Pre-requisito: seed + restaurantes A(1)/B(2) com modulo_ponto=true e usuarios do seed
(admin@demo.com, colab1@demo.com, superadmin@kaizen.com, adminb@demo.com, colabb@demo.com).
Idempotencia: criacoes aceitam 409/ja-existente; ENTRADA so e registrada se disponivel."""
import json, os, sys, urllib.request, urllib.error

B = os.environ.get("SMOKE_BASE", "http://localhost:3022/api/v1")
PW = os.environ["SMOKE_PASSWORD"]


def req(method, path, tok=None, body=None):
    h = {"content-type": "application/json"}
    if tok:
        h["Authorization"] = "Bearer " + tok
    r = urllib.request.Request(B + path, method=method, headers=h,
                               data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r) as x:
            return x.status, json.loads(x.read() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, None


def login(e):
    s, d = req("POST", "/auth/login", body={"email": e, "senha": PW})
    assert s in (200, 201), (e, s)
    return d["accessToken"]


T = {k: login(v) for k, v in dict(A="admin@demo.com", S="superadmin@kaizen.com", C="colab1@demo.com",
                                 AB="adminb@demo.com", CB="colabb@demo.com").items()}
res = []


def chk(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name, extra)


def uid(token_key):
    s, d = req("GET", "/auth/profile", T[token_key])
    return d["id"]


UC = uid("C")
dias = [{"diaSemana": i, "trabalha": True, "entradaPrevista": "18:00", "saidaPrevista": "02:00",
         "toleranciaMinutos": 0} for i in range(7)]

# --- escrita (idempotente) ---
s, d = req("GET", "/admin/escalas-trabalho", T["A"])
if not any(e.get("nome") == "Noturna smoke" for e in d):
    s, d = req("POST", "/admin/escalas-trabalho", T["A"],
               {"usuarioId": UC, "nome": "Noturna smoke", "vigenciaInicio": "2026-11-01", "dias": dias})
    chk("A cria escala noturna 18-02", s == 201, s)
else:
    chk("A escala noturna ja existe", True)

s, d = req("GET", "/admin/banco-horas/lancamentos", T["A"])
if not any(x.get("motivo") == "Credito smoke" for x in d):
    s, d = req("POST", "/admin/banco-horas/lancamentos", T["A"],
               {"usuarioId": UC, "tipo": "AJUSTE_MANUAL", "minutosDelta": 120,
                "dataReferencia": "2026-11-10", "motivo": "Credito smoke"})
    chk("A lanca banco de horas", s == 201, s)
else:
    chk("A lancamento ja existe", True)

s, d = req("POST", "/admin/ausencias/classificar", T["A"],
           {"usuarioId": UC, "data": "2026-11-12", "tipo": "FOLGA", "motivo": "Folga smoke"})
chk("A classifica folga (criar/atualizar)", s in (200, 201, 409), s)
s, d = req("GET", "/admin/ausencias", T["A"])
chk("A ve a folga", any(x.get("motivo") == "Folga smoke" for x in d))

s, d = req("POST", "/admin/atestados", T["A"],
           {"usuarioId": UC, "inicio": "2026-11-11", "fim": "2026-11-11", "motivo": "Atestado smoke"})
chk("A registra atestado (201 ou 409 duplicado)", s in (201, 409), s)
s, d = req("GET", "/admin/atestados", T["A"])
at = [x for x in d if x.get("motivo") == "Atestado smoke"]
chk("A ve o atestado", len(at) >= 1)
if at and at[0]["situacao"] == "PENDENTE":
    s, _ = req("PUT", f"/admin/atestados/{at[0]['id']}/decidir", T["A"], {"situacao": "APROVADO"})
    chk("A aprova atestado", s in (200, 201), s)

s, d = req("GET", "/collaborator/ponto/status", T["C"])
if "ENTRADA" in d.get("tiposDisponiveis", []):
    s, d = req("POST", "/collaborator/ponto/registrar", T["C"], {"tipo": "ENTRADA"})
    chk("C registra ENTRADA", s == 201, s)
s, d = req("GET", "/collaborator/ponto/status", T["C"])
chk("C status coerente (jornada aberta ou encerrada)", s == 200 and (d.get("ultimoRegistro") is not None))
s, d = req("GET", "/collaborator/ponto/historico", T["C"])
chk("C historico com registros", s == 200 and len(d) >= 1)

# --- leitura / RBAC / isolamento ---
for r in ["escalas-trabalho", "banco-horas/lancamentos", "ausencias", "atestados", "usuarios"]:
    sa, da = req("GET", "/admin/" + r, T["A"])
    chk(f"A GET {r}", sa == 200 and isinstance(da, list) and len(da) > 0, (sa, len(da) if isinstance(da, list) else da))
    sb, db = req("GET", "/admin/" + r, T["AB"])
    ids_a = {x.get("id") for x in da} if r == "usuarios" else set()
    leak = any(x.get("usuarioId") == UC for x in db) or (r == "usuarios" and any(x.get("id") in ids_a for x in db))
    chk(f"AdminB GET {r} isolado", sb == 200 and not leak, (sb, len(db)))
    sc, _ = req("GET", "/admin/" + r, T["C"])
    chk(f"Colab GET admin/{r} 403", sc == 403, sc)
    ss, _ = req("GET", "/admin/" + r, T["S"])
    chk(f"SUPER_ADMIN GET admin/{r} sem tenant (<500)", ss < 500, ss)
    ss2, _ = req("GET", f"/admin/{r}?restauranteId=1", T["S"])
    chk(f"SUPER_ADMIN GET admin/{r}?restauranteId=1", ss2 == 200, ss2)

for r in ["espelho-ponto?competencia=2026-11", "banco-horas?competencia=2026-11"]:
    s, d = req("GET", "/collaborator/" + r, T["C"])
    chk(f"C GET {r}", s == 200, s)
    s, d = req("GET", "/collaborator/" + r, T["CB"])
    chk(f"ColabB GET {r} sem dados de A", s == 200 and not d.get("lancamentos"), s)
    s, _ = req("GET", "/collaborator/" + r.split("?")[0], T["C"])
    chk(f"C sem competencia -> 400 ({r.split('?')[0]})", s == 400, s)

s, d = req("GET", "/collaborator/banco-horas?competencia=2026-11", T["C"])
chk("C banco: +120 min no mes", d.get("minutosMes") == 120, d.get("minutosMes"))
s, d = req("GET", "/collaborator/espelho-ponto?competencia=2026-11", T["C"])
dias_m = {x["data"]: x for x in d["dias"]}
chk("espelho: folga 12/11 classificada", (dias_m["2026-11-12"].get("classificacao") or {}).get("tipo") == "FOLGA")
chk("espelho: lancamento 10/11 = 120", dias_m["2026-11-10"]["minutosBancoHoras"] == 120)
chk("espelho: atestado 11/11 abona sem exceder previsto",
    dias_m["2026-11-11"]["minutosAbonados"] <= dias_m["2026-11-11"]["minutosPrevistos"])
import datetime
hoje = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).date().isoformat()
fut = [x for x in d["dias"] if x["data"] > hoje and x["minutosPrevistos"]]
if fut:
    chk("espelho: dias futuros nao geram divida", all(x["saldoOperacionalMinutos"] is None for x in fut), len(fut))

s, _ = req("POST", "/admin/banco-horas/lancamentos", T["AB"],
           {"usuarioId": UC, "tipo": "AJUSTE_MANUAL", "minutosDelta": 5, "dataReferencia": "2026-11-10", "motivo": "cross"})
chk("AdminB nao lanca banco p/ usuario de A", s in (400, 403, 404), s)
s, _ = req("POST", "/admin/escalas-trabalho", T["AB"],
           {"usuarioId": UC, "nome": "x", "vigenciaInicio": "2026-12-01", "dias": dias})
chk("AdminB nao cria escala p/ usuario de A", s in (400, 403, 404), s)
s, _ = req("GET", "/contador/restaurantes", T["A"])
chk("ADMIN nao acessa /contador (403)", s == 403, s)
s, _ = req("POST", "/admin/contador/vinculos", T["A"], {})
chk("POST admin/contador/vinculos valida corpo (400)", s == 400, s)
s, _ = req("GET", "/admin/banco-horas/lancamentos")
chk("sem token -> 401", s == 401, s)

print(f"\nTOTAL {sum(res)}/{len(res)} PASS")
sys.exit(0 if all(res) else 1)
