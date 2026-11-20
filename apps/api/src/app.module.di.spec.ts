import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

// Regressão: guards (ex.: ModuloGuard) exigem providers importados no módulo do controller.
// compile() resolve toda a injeção de dependências sem conectar ao banco.
describe('AppModule DI', () => {
  it('resolve todas as dependências', async () => {
    process.env.JWT_SECRET ??= 'test-secret';
    await expect(Test.createTestingModule({ imports: [AppModule] }).compile()).resolves.toBeDefined();
  });
});
