# Migracao de Dados e Switch de Producao

## Objetivo

Quando o novo app (NestJS + Next.js) atingir paridade funcional com o app atual (Flask + React), fazer a transicao de producao sem perda de dados e com minimo downtime.

---

## Pre-Requisitos para o Switch

Antes de migrar, confirmar que:

- [ ] Todas as features do app atual estao implementadas no novo
- [ ] Testes e2e passam para todos os fluxos criticos
- [ ] Deploy do novo app funciona em staging
- [ ] Script de migracao de dados testado em ambiente de teste
- [ ] Backup do banco atual feito
- [ ] DNS e dominio configurados

---

## Estrategia de Migracao de Dados

### Cenario

- **Banco atual:** PostgreSQL (Railway) com schema do SQLAlchemy/Flask-Migrate
- **Banco novo:** PostgreSQL (novo) com schema do Prisma

Os schemas sao diferentes (nomes de tabelas/colunas podem variar), entao precisamos de um script de transformacao.

### Script de Migracao

```typescript
// scripts/migrate-data.ts
import { PrismaClient as NewPrisma } from '@prisma/client';
import { Pool } from 'pg';

const oldDb = new Pool({
  connectionString: process.env.OLD_DATABASE_URL,
});

const newDb = new NewPrisma({
  datasources: { db: { url: process.env.NEW_DATABASE_URL } },
});

async function migrateRestaurantes() {
  const { rows } = await oldDb.query('SELECT * FROM restaurante');
  for (const row of rows) {
    await newDb.restaurante.create({
      data: {
        id: row.id,
        nome: row.nome,
        cnpj: row.cnpj,
        ativo: row.ativo,
        criadoEm: row.criado_em,
      },
    });
  }
  console.log(`Migrados ${rows.length} restaurantes`);
}

async function migrateUsuarios() {
  const { rows } = await oldDb.query('SELECT * FROM usuario');
  for (const row of rows) {
    await newDb.usuario.create({
      data: {
        id: row.id,
        nome: row.nome,
        email: row.email,
        username: row.username,
        senha: row.senha, // hash ja esta no formato correto (bcrypt)
        role: row.role,
        aprovado: row.aprovado,
        ativo: row.ativo,
        restauranteId: row.restaurante_id,
        criadoEm: row.criado_em,
      },
    });
  }
  console.log(`Migrados ${rows.length} usuarios`);
}

// ... funcoes similares para cada tabela

async function main() {
  console.log('Iniciando migracao de dados...');

  // Ordem importa (por causa das foreign keys)
  await migrateRestaurantes();
  await migrateUsuarios();
  await migrateItems();
  await migrateAreas();
  await migrateListas();
  await migrateListaColaboradores();
  await migrateListaItemRefs();
  await migrateEstoque();
  await migrateSubmissoes();
  await migratePedidos();
  await migrateFornecedores();
  await migrateFornecedorItens();
  await migrateCotacoes();
  await migrateCotacaoItens();
  await migratePOP(); // todas tabelas POP
  await migrateChecklists();
  await migrateListasRapidas();
  await migrateNotificacoes();
  await migrateLogs();

  // Resetar sequences (auto-increment) para o proximo ID
  await resetSequences();

  console.log('Migracao concluida!');
}

async function resetSequences() {
  // Apos inserir dados com IDs especificos, resetar os sequences
  const tables = ['restaurantes', 'usuarios', 'itens', 'areas', 'listas', /* ... */];
  for (const table of tables) {
    await newDb.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}) + 1)`
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await oldDb.end();
    await newDb.$disconnect();
  });
```

### Mapeamento de Tabelas

| Tabela Antiga (Flask) | Tabela Nova (Prisma) | Notas |
|----------------------|---------------------|-------|
| `restaurante` | `restaurantes` | Pluralizado |
| `usuario` | `usuarios` | Pluralizado |
| `item` | `itens` | Pluralizado |
| `area` | `areas` | - |
| `lista` | `listas` | - |
| `lista_colaborador` | `lista_colaborador` | Mesma |
| `lista_item_ref` | `lista_item_ref` | Mesma |
| `estoque` | `estoque` | - |
| `submissao` | `submissoes` | Pluralizado |
| `pedido` | `pedidos` | Pluralizado |
| `fornecedor` | `fornecedores` | Pluralizado |
| `fornecedor_item_codigo` | `fornecedor_item_codigo` | Mesma |
| `cotacao` | `cotacoes` | Pluralizado |
| `cotacao_item` | `cotacao_itens` | Pluralizado |
| `pop_*` | `pop_*` | Mesmos nomes |
| `checklist` | `checklists` | Pluralizado |
| `checklist_item` | `checklist_itens` | Pluralizado |
| `lista_rapida` | `listas_rapidas` | Pluralizado |
| `notificacao` | `notificacoes` | Pluralizado |
| `app_log` | `app_logs` | Pluralizado |

---

## Plano de Switch

### Dia D-7: Preparacao

1. Fazer deploy do novo app em staging
2. Rodar migracao de dados em copia do banco
3. Testar todos os fluxos no staging
4. Notificar usuarios sobre manutencao programada

### Dia D: Switch

```
1. [00:00] Colocar app atual em modo manutencao (read-only)
2. [00:05] Fazer backup final do banco atual
3. [00:10] Rodar script de migracao de dados
4. [00:30] Verificar dados no banco novo
5. [00:45] Testar fluxos criticos no novo app
6. [01:00] Atualizar DNS para apontar para novo app
7. [01:15] Verificar que novo app esta acessivel
8. [01:30] Remover modo manutencao
9. [01:30] Monitorar por 1 hora
```

### Dia D+1 a D+30: Periodo de Seguranca

- Manter app antigo acessivel em URL alternativa (read-only)
- Monitorar logs e metricas do novo app
- Corrigir bugs encontrados em producao
- Apos 30 dias sem problemas, desligar app antigo

---

## Rollback Plan

Se algo der errado durante o switch:

1. Reverter DNS para o app antigo (propagacao: 5-10 minutos)
2. App antigo volta a funcionar com dados ate o momento do switch
3. Investigar e corrigir problema no novo app
4. Reagendar switch

---

## Checklist Final

- [ ] Migracao de dados testada 3x em staging
- [ ] Todos os endpoints testados no novo app
- [ ] Performance aceitavel (tempo de resposta < 500ms)
- [ ] SSL/HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Variaveis de ambiente de producao configuradas
- [ ] Backup automatico do novo banco configurado
- [ ] Monitoramento/alertas configurados (health check)
- [ ] Rollback plan testado
