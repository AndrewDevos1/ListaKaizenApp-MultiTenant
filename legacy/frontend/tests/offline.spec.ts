import { expect, test } from '@playwright/test';

type JwtPayload = {
  sub: string;
  role: string;
  nome: string;
  email: string;
  restaurante_id: number;
};

const createJwt = (payload: JwtPayload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

const seedAuth = async (page: any) => {
  const token = createJwt({
    sub: '1',
    role: 'COLLABORATOR',
    nome: 'Teste Offline',
    email: 'teste@exemplo.com',
    restaurante_id: 1,
  });
  const expiry = `${Date.now() + 60 * 60 * 1000}`;
  await page.addInitScript(
    ({ tokenValue, expiryValue, tutorialKey }) => {
      localStorage.setItem('accessToken', tokenValue);
      localStorage.setItem('sessionExpiry', expiryValue);
      localStorage.setItem(tutorialKey, JSON.stringify({ enabled: false, seenScreens: {} }));
    },
    { tokenValue: token, expiryValue: expiry, tutorialKey: 'kaizen:tutorial:1:COLLABORATOR' }
  );
};

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const mockApi = async (page: any, listaId: number) => {
  await page.route('**/api/auth/session', (route: any) =>
    route.fulfill({ status: 200, headers: jsonHeaders, body: '{}' })
  );

  await page.route('**/api/**', (route: any) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      return route.continue();
    }

    const url = new URL(request.url());
    const path = url.pathname;

    if (path === `/api/collaborator/listas/${listaId}`) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ id: listaId, nome: `Lista ${listaId}` }),
      });
    }

    if (path === `/api/collaborator/listas/${listaId}/estoque`) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([
          {
            id: 10,
            item_id: 10,
            lista_id: listaId,
            quantidade_atual: 2,
            quantidade_minima: 5,
            pedido: 3,
            item: { id: 10, nome: 'Arroz', unidade_medida: 'kg' },
          },
          {
            id: 11,
            item_id: 11,
            lista_id: listaId,
            quantidade_atual: 1,
            quantidade_minima: 2,
            pedido: 1,
            item: { id: 11, nome: 'Feijao', unidade_medida: 'kg' },
          },
        ]),
      });
    }

    return route.fulfill({ status: 200, headers: jsonHeaders, body: '[]' });
  });
};

test('restaura rascunho offline ao recarregar a lista', async ({ page, context }) => {
  const listaId = 123;
  await seedAuth(page);
  await mockApi(page, listaId);

  await page.goto(`/collaborator/listas/${listaId}/estoque`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    navigator.serviceWorker.getRegistrations().then((regs) => regs.length > 0)
  );

  const firstInput = page.locator('input[data-estoque-input="true"]').first();
  await firstInput.fill('5');
  await page.waitForTimeout(700);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('input[data-estoque-input="true"]').first()).toHaveValue('5');
  await expect(
    page.locator('div[role="alert"]').filter({ hasText: /Sem conex/ })
  ).toBeVisible();
});

test('informa submissao enfileirada quando offline', async ({ page, context }) => {
  const listaId = 124;
  await seedAuth(page);
  await mockApi(page, listaId);

  await page.goto(`/collaborator/listas/${listaId}/estoque`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    navigator.serviceWorker.getRegistrations().then((regs) => regs.length > 0)
  );

  await context.setOffline(true);
  await page.getByRole('button', { name: /Submeter Lista/i }).click({ force: true });

  await expect(page.getByText(/Sem conex/)).toBeVisible();
});
