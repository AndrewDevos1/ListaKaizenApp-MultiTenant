import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const TABLES = [
  'pop_execucao_itens',
  'pop_execucoes',
  'pop_passos',
  'pop_templates',
  'checklist_itens',
  'checklists',
  'cotacao_itens',
  'cotacoes',
  'recebimento_itens',
  'recebimentos',
  'pedidos',
  'submissoes',
  'lista_rapida_itens',
  'listas_rapidas',
  'lista_item_ref',
  'lista_colaborador',
  'listas',
  'area_colaborador',
  'areas',
  'sugestoes_itens',
  'push_subscriptions',
  'notificacoes',
  'convite_tokens',
  'app_logs',
  'itens',
  'fornecedores',
  'usuarios',
  'restaurantes',
];

export function buildIsolatedDatabaseUrl(baseUrl: string, schema: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  return url.toString();
}

export function createSchemaName(prefix = 'e2e') {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function prepareIsolatedDatabase(baseUrl: string, schema: string) {
  const isolatedUrl = buildIsolatedDatabaseUrl(baseUrl, schema);
  process.env.DATABASE_URL = isolatedUrl;

  // Garante criação/atualização das tabelas no schema isolado sem gerar migrations
  execSync('npx prisma db push --skip-generate', {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: isolatedUrl },
    stdio: 'pipe',
  });

  return isolatedUrl;
}

export async function truncateAllTables(prisma: PrismaClient) {
  const truncateSql = `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateSql);
}
