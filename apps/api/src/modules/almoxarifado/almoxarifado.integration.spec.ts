import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

// Executado com PostgreSQL descartável quando TEST_DATABASE_URL termina em _test.
const d = process.env.TEST_DATABASE_URL?.includes('_test') ? describe : describe.skip;

d('Almoxarifado EPI PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app?.close());

  it('expõe o domínio isolado e não o catálogo de compras', async () => {
    const tenant = await prisma.restaurante.create({ data: { nome: `epi-${Date.now()}` } });
    const material = await prisma.materialAlmoxarifado.create({ data: { restauranteId: tenant.id, nome: 'Luva EPI', categoria: 'EPI', retornavel: false, valorReferencia: 12 } });
    expect(material.nome).toBe('Luva EPI');
    expect((prisma as any).item).toBeDefined();
    await prisma.materialAlmoxarifado.delete({ where: { id: material.id } });
    await prisma.restaurante.delete({ where: { id: tenant.id } });
  });
});
