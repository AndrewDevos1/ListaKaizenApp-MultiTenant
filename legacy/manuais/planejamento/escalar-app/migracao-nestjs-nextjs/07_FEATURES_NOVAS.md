# Fase 6: Features Novas

## Objetivo

Apos atingir paridade com o app atual, aproveitar o poder do NestJS e Next.js para adicionar features que nao sao possiveis (ou sao muito dificeis) no Flask + React atual.

---

## 6.1 WebSockets - Notificacoes Real-Time

### O que muda

No app atual, notificacoes usam polling (o frontend busca a cada X segundos). Com NestJS, podemos usar WebSocket Gateway nativo para notificacoes instantaneas.

### Implementacao

```bash
cd apps/api
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install socket.io
```

### NestJS Gateway

```typescript
// apps/api/src/modules/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string[]>(); // userId -> socketIds

  handleConnection(client: Socket) {
    // Autenticar via JWT no handshake
    const userId = this.extractUserFromToken(client.handshake.auth.token);
    if (!userId) {
      client.disconnect();
      return;
    }

    const sockets = this.userSockets.get(userId) || [];
    sockets.push(client.id);
    this.userSockets.set(userId, sockets);

    // Entrar na room do restaurante para broadcast
    client.join(`restaurant:${client.handshake.auth.restauranteId}`);
  }

  handleDisconnect(client: Socket) {
    // Remover socket do mapa
  }

  // Chamado por outros services quando algo acontece
  notifyUser(userId: number, notification: any) {
    const socketIds = this.userSockets.get(userId) || [];
    socketIds.forEach((id) => {
      this.server.to(id).emit('notification', notification);
    });
  }

  // Broadcast para todo o restaurante
  notifyRestaurant(restauranteId: number, notification: any) {
    this.server.to(`restaurant:${restauranteId}`).emit('notification', notification);
  }
}
```

### Next.js Client

```typescript
// apps/web/src/hooks/useNotifications.ts
'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
      auth: { token, restauranteId: user.restauranteId },
    });

    newSocket.on('notification', (data) => {
      setNotifications((prev) => [data, ...prev]);
      // Mostrar toast
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [user]);

  return { notifications, socket };
}
```

---

## 6.2 Swagger - Documentacao Automatica da API

### O que muda

No app atual, nao existe documentacao de API. NestJS gera Swagger automaticamente a partir dos decorators.

### Implementacao

```typescript
// apps/api/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Kaizen Lists API')
    .setDescription('API do sistema de gerenciamento de estoque Kaizen')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticacao e registro')
    .addTag('Items', 'Gerenciamento de itens')
    .addTag('Listas', 'Gerenciamento de listas')
    .addTag('Estoque', 'Controle de estoque')
    .addTag('Submissoes', 'Submissoes e pedidos')
    .addTag('Fornecedores', 'Gerenciamento de fornecedores')
    .addTag('Cotacoes', 'Gerenciamento de cotacoes')
    .addTag('POP', 'Procedimentos operacionais')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3001);
}
```

**Acesso:** `http://localhost:3001/api/docs`

### Decorators nos DTOs

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'Arroz 5kg', description: 'Nome do item' })
  @IsString()
  nome: string;

  @ApiProperty({ example: 'un', description: 'Unidade de medida' })
  @IsString()
  unidadeMedida: string;
}
```

---

## 6.3 Rate Limiting

### O que muda

Protecao contra brute force e abuso de API. Nao existe no app atual.

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 segundo
        limit: 3,     // 3 requests por segundo
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 segundos
        limit: 20,    // 20 requests por 10s
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minuto
        limit: 100,   // 100 requests por minuto
      },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### Rate limit especifico para login

```typescript
@Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
@Post('login')
login(@Body() dto: LoginDto) { /* ... */ }
```

---

## 6.4 Caching com Redis

### O que muda

Respostas frequentes podem ser cacheadas (dashboard, listas de itens) reduzindo carga no banco.

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis
```

```typescript
// Uso em endpoints
@UseInterceptors(CacheInterceptor)
@CacheTTL(30) // 30 segundos
@Get('dashboard-summary')
getDashboard(@TenantId() tenantId: number) {
  return this.dashboardService.getSummary(tenantId);
}
```

---

## 6.5 Filas com Bull (Jobs Assincronos)

### O que muda

Operacoes pesadas (gerar relatorios PDF, enviar emails, processar importacoes CSV) rodam em background sem travar a API.

```bash
npm install @nestjs/bullmq bullmq
```

### Casos de uso

1. **Gerar relatorio PDF** - Admin exporta dashboard -> job gera PDF -> notifica quando pronto
2. **Enviar email** - Quando submissao e aprovada -> job envia email ao colaborador
3. **Importar CSV grande** - Upload de planilha -> job processa em background
4. **Auto-arquivar** - Cron job que arquiva submissoes antigas

```typescript
// Exemplo: job de relatorio
@Processor('reports')
export class ReportsProcessor {
  @Process('generate-pdf')
  async handleGeneratePdf(job: Job) {
    const { restauranteId, reportType } = job.data;
    // ... gerar PDF
    // ... salvar arquivo
    // ... notificar usuario via WebSocket
  }
}
```

---

## 6.6 Upload de Arquivos (Fotos POP)

### O que muda

Upload mais robusto com validacao de tipo, tamanho, e storage configuravel (local ou S3).

```typescript
// Upload com Multer integrado
@Post(':execucaoId/itens/:itemId/foto')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads/pop',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      cb(new Error('Apenas imagens sao permitidas'), false);
    }
    cb(null, true);
  },
}))
async uploadFoto(
  @Param('execucaoId') execucaoId: number,
  @Param('itemId') itemId: number,
  @UploadedFile() file: Express.Multer.File,
) { /* ... */ }
```

---

## 6.7 Email (Notificacoes por Email)

```bash
npm install @nestjs/mailer nodemailer
```

### Casos de uso

- Submissao aprovada -> email ao colaborador
- Novo usuario registrado -> email ao admin
- Fornecedor convidado -> email com link
- Relatorio diario de POP nao executados

---

## 6.8 Health Checks e Monitoramento

```bash
npm install @nestjs/terminus
```

```typescript
// Endpoint /health para load balancers e monitoramento
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

---

## Resumo de Dependencias Novas

| Feature | Pacote | Uso |
|---------|--------|-----|
| WebSockets | `@nestjs/websockets`, `socket.io` | Notificacoes real-time |
| Swagger | `@nestjs/swagger` | Documentacao automatica |
| Rate Limiting | `@nestjs/throttler` | Protecao contra abuso |
| Cache | `@nestjs/cache-manager`, `redis` | Performance |
| Filas | `@nestjs/bullmq`, `bullmq` | Jobs assincronos |
| Upload | Multer (built-in) | Fotos POP |
| Email | `@nestjs/mailer`, `nodemailer` | Notificacoes email |
| Health | `@nestjs/terminus` | Monitoramento |

## Proxima Fase

-> `08_MIGRACAO_DADOS.md` - Estrategia de switch e migracao de dados
