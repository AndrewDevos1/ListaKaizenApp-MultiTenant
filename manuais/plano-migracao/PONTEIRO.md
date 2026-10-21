# Ponteiro de Progresso — Migração Legacy → Multi-Tenant

## Status Atual

**Fase:** POS-MIGRACAO — ALINHAMENTO DE DOCUMENTACAO EM ANDAMENTO
**Ultima tarefa concluida:** Criacao de checklist e trilha de progresso para atualizar os manuais (`0179d8f`)
**Proximo passo:** Concluir alinhamento de endpoints e indice de referencia (CP-005 a CP-009)
**Ultima branch/commit:** `restaurando-design` / `0179d8f`

---

## Historico de Checkpoints

| Data | Fase | Commit | Descricao |
|------|------|--------|-----------|
| 2026-02-27 | Fase 1 | `1e0917d` | Submissoes, Pedidos, Usuarios |
| 2026-02-27 | Fase 2 | `776dfe0` | Fornecedores, threshold em listas |
| 2026-02-27 | Fase 3 | `3fee2c8` | Merge WhatsApp, Cotacoes, Checklists |
| 2026-02-27 | Fase 4 | `1068990` | Listas Rapidas, Sugestoes, POPs |
| 2026-02-27 | Fase 5 | `9680bfd` | Notificacoes, Convites, CSV, Logs |
| 2026-02-27 | Revisao | `52f0800` | Correcoes pos-revisao de paridade com legado |
| 2026-02-27 | Pos-migracao | `b51db5a` | Navbar paridade + correcoes runtime |
| 2026-02-27 | Pos-migracao | `4699363` | Fix hydration mismatch |
| 2026-02-27 | Pos-migracao | `c565ea4` | Perfil/senha colaborador + Dashboard Global |
| 2026-02-27 | Pos-migracao | `90c57de` | Fix campo usuario em submissoes + Editar Perfil admin |
| 2026-02-27 | Pos-migracao | `8467985` | Catalogo Global + Estatisticas + endpoint /estatisticas |
| 2026-02-27 | Pos-migracao | `2b937cd` | Relatorio final atualizado |
| 2026-02-27 | Pos-migracao | `cc76a20` | Mudar senha unificado no Editar Perfil |
| 2026-02-27 | Melhoria UX | `48379ae` | Toast global estilo macOS |
| 2026-02-27 | Infra | `993eb2c` | Seed atualizado + manual PWA |
| 2026-02-27 | PWA | `d8c8768` | Botao de instalacao PWA + Service Worker + manifest |
| 2026-02-27 | PWA | `f50f79f` | Icones PWA 192x512 gerados do logo Kaizen |
| 2026-02-27 | Fix | `f74c945` | Corrigir stale closure no hook usePWAInstall |
| 2026-02-27 | PWA | `0ac7e08` | Web Push Notifications com VAPID, PushModule e service worker handler |
| 2026-02-27 | Fix Login | `9f33ea8` | Ver senha, salvar email e manter conectado no login |
| 2026-02-27 | Fix | `ce6fc26` | suppressHydrationWarning no html alem do body |
| 2026-02-27 | Fix Navbar | `f719b0f` | Configuracoes funcional e botoes do footer menores |
| 2026-02-27 | Avatar | `95235d0` | Upload de avatar com modal de recorte circular |
| 2026-02-27 | Avatar | `2b9c190` | Avatares predefinidos na tela de perfil |
| 2026-02-27 | Config | `305054f` | Paginas de configuracoes para admin e colaborador |
| 2026-02-27 | Fix | `d43bf0a` | Corrigir rota de exportacao CSV de itens |
| 2026-02-27 | Import | `9556759` | Importacao de dados do legado em 2 fases (ZIP + CSV) |
| 2026-03-05 | Docs | `6c028c0` | Regra oficial: nao modificar `legacy` (apenas referencia) |
| 2026-03-05 | Docs | `0179d8f` | Checklist e progresso da atualizacao de documentacao |

---

## Como Atualizar Este Arquivo

Ao concluir um marco relevante (codigo ou documentacao), atualize os campos de `Status Atual` e adicione uma linha no historico com:

- data do marco;
- commit curto;
- descricao objetiva do que mudou;
- proximo passo operacional.

Observacao permanente: a pasta `legacy/` e somente referencia historica e nao deve ser alterada neste fluxo.
