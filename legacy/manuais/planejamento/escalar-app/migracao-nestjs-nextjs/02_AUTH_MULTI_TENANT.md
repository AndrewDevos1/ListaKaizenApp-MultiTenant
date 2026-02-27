# Fase 1: Auth + Multi-Tenant (NestJS)

## Objetivo

Implementar o sistema de autenticacao JWT e isolamento multi-tenant, que sao a base para todas as features subsequentes.

**Equivalencia com o app atual:**
| Flask (atual) | NestJS (novo) |
|---------------|---------------|
| `@jwt_required()` | `JwtAuthGuard` |
| `@admin_required()` | `@Roles('ADMIN')` + `RolesGuard` |
| `@collaborator_required()` | `@Roles('COLLABORATOR')` + `RolesGuard` |
| `@super_admin_required()` | `@Roles('SUPER_ADMIN')` + `RolesGuard` |
| `get_current_restaurante_id()` | `@TenantId()` decorator |
| `get_user_id_from_jwt()` | `@CurrentUser()` decorator |

---

## 1.1 Prisma Schema - Modelos Base

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  COLLABORATOR
  SUPPLIER
}

model Restaurante {
  id        Int      @id @default(autoincrement())
  nome      String
  cnpj      String?  @unique
  ativo     Boolean  @default(true)
  criadoEm  DateTime @default(now()) @map("criado_em")

  usuarios  Usuario[]

  @@map("restaurantes")
}

model Usuario {
  id              Int       @id @default(autoincrement())
  nome            String
  email           String    @unique
  username        String?   @unique
  senha           String
  role            UserRole  @default(COLLABORATOR)
  aprovado        Boolean   @default(false)
  ativo           Boolean   @default(true)
  restauranteId   Int?      @map("restaurante_id")
  sessionToken    String?   @map("session_token")
  wizardStatus    String?   @map("wizard_status")
  criadoEm        DateTime  @default(now()) @map("criado_em")

  restaurante     Restaurante? @relation(fields: [restauranteId], references: [id])

  @@map("usuarios")
}
```

**Aplicar schema:**
```bash
cd apps/api
npx prisma migrate dev --name init-auth
```

---

## 1.2 Prisma Module

```
apps/api/src/prisma/
├── prisma.module.ts
└── prisma.service.ts
```

### prisma.service.ts
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### prisma.module.ts
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 1.3 Auth Module

```
apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   └── tenant-id.decorator.ts
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    └── change-password.dto.ts
```

### DTOs

```typescript
// dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;
}

// dto/register.dto.ts
export class RegisterDto {
  @IsString()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsString()
  @IsOptional()
  username?: string;
}
```

### JWT Strategy

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;        // user id
  email: string;
  role: string;
  nome: string;
  restauranteId: number | null;
  sessionToken: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar se session token ainda e valido (single-session)
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo ou nao encontrado');
    }

    if (user.sessionToken !== payload.sessionToken) {
      throw new UnauthorizedException('Sessao expirada');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      nome: payload.nome,
      restauranteId: payload.restauranteId,
    };
  }
}
```

### Guards

```typescript
// guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Sem roles definidas = acesso livre (mas precisa estar autenticado)
    }

    const { user } = context.switchToHttp().getRequest();

    // SUPER_ADMIN tem acesso a tudo
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso negado para seu perfil');
    }

    return true;
  }
}

// guards/tenant.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SUPER_ADMIN pode acessar qualquer tenant
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Outros usuarios precisam ter restauranteId
    if (!user.restauranteId) {
      throw new ForbiddenException('Usuario sem restaurante associado');
    }

    return true;
  }
}
```

### Decorators

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.user[data];
    }
    return request.user;
  },
);

// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// decorators/tenant-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.restauranteId ?? null;
  },
);
```

### Auth Service

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Verificar email duplicado
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email ja cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.senha, 10);

    const user = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        username: dto.username,
        senha: hashedPassword,
        aprovado: false, // aguarda aprovacao do admin
      },
    });

    return { message: 'Usuario registrado. Aguarde aprovacao do administrador.', userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { restaurante: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (!user.ativo) {
      throw new UnauthorizedException('Usuario desativado');
    }

    if (!user.aprovado) {
      throw new UnauthorizedException('Usuario aguardando aprovacao');
    }

    const passwordValid = await bcrypt.compare(dto.senha, user.senha);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    // Gerar session token unico (invalida sessoes anteriores)
    const sessionToken = randomUUID();
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { sessionToken },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
      restauranteId: user.restauranteId,
      sessionToken,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        restauranteId: user.restauranteId,
        restauranteNome: user.restaurante?.nome ?? null,
        wizardStatus: user.wizardStatus,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { restaurante: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      username: user.username,
      role: user.role,
      restauranteId: user.restauranteId,
      restauranteNome: user.restaurante?.nome ?? null,
      wizardStatus: user.wizardStatus,
    };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const valid = await bcrypt.compare(oldPassword, user.senha);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { senha: hashed },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
```

### Auth Controller

```typescript
// auth.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() body: { senhaAtual: string; novaSenha: string },
  ) {
    return this.authService.changePassword(userId, body.senhaAtual, body.novaSenha);
  }
}
```

### Auth Module

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## 1.4 Restaurantes Module (SUPER_ADMIN)

```
apps/api/src/modules/restaurantes/
├── restaurantes.module.ts
├── restaurantes.controller.ts
├── restaurantes.service.ts
└── dto/
    ├── create-restaurante.dto.ts
    └── update-restaurante.dto.ts
```

### Endpoints

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/admin/restaurantes` | Listar todos | SUPER_ADMIN |
| `GET` | `/admin/restaurantes/:id` | Detalhes | SUPER_ADMIN |
| `POST` | `/admin/restaurantes` | Criar | SUPER_ADMIN |
| `PUT` | `/admin/restaurantes/:id` | Atualizar | SUPER_ADMIN |
| `DELETE` | `/admin/restaurantes/:id` | Deletar | SUPER_ADMIN |

### Exemplo de uso dos guards e decorators

```typescript
@ApiTags('Restaurantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/restaurantes')
export class RestaurantesController {
  constructor(private restaurantesService: RestaurantesService) {}

  @Get()
  findAll() {
    return this.restaurantesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRestauranteDto) {
    return this.restaurantesService.create(dto);
  }
}
```

---

## 1.5 User Management Module (ADMIN)

### Endpoints

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/admin/users` | Listar usuarios do tenant | ADMIN |
| `POST` | `/admin/users/:id/approve` | Aprovar usuario | ADMIN |
| `POST` | `/admin/users/:id/deactivate` | Desativar | ADMIN |
| `POST` | `/admin/users/:id/reactivate` | Reativar | ADMIN |
| `PUT` | `/admin/users/:id` | Editar usuario | ADMIN |
| `DELETE` | `/admin/users/:id` | Deletar | ADMIN |

**Importante:** Todas as queries filtram por `restauranteId` usando o decorator `@TenantId()`:

```typescript
@Get()
findAll(@TenantId() tenantId: number) {
  return this.usersService.findAll(tenantId);
}
```

---

## 1.6 Seed de Dados

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar restaurante padrao
  const restaurante = await prisma.restaurante.create({
    data: { nome: 'Restaurante Demo', cnpj: '00.000.000/0001-00' },
  });

  // Criar SUPER_ADMIN
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.usuario.create({
    data: {
      nome: 'Super Admin',
      email: 'super@kaizen.com',
      senha: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      aprovado: true,
      ativo: true,
    },
  });

  // Criar ADMIN do restaurante
  await prisma.usuario.create({
    data: {
      nome: 'Admin Demo',
      email: 'admin@kaizen.com',
      senha: hashedPassword,
      role: UserRole.ADMIN,
      aprovado: true,
      ativo: true,
      restauranteId: restaurante.id,
    },
  });

  console.log('Seed concluido!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Adicionar ao `package.json` do api:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 1.7 Testes

### Teste e2e do Auth

```typescript
// test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Test', email: 'test@test.com', senha: '123456' })
      .expect(201);
  });

  it('/auth/login (POST) - nao aprovado', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', senha: '123456' })
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## Verificacao da Fase 1

1. `POST /auth/register` cria usuario com `aprovado: false`
2. `POST /auth/login` retorna JWT para usuario aprovado
3. `GET /auth/profile` retorna dados do usuario autenticado
4. Rotas admin retornam 403 para COLLABORATOR
5. SUPER_ADMIN acessa tudo
6. ADMIN so ve usuarios do seu `restauranteId`
7. Session token unico (login novo invalida sessao anterior)
8. Swagger acessivel em `/api/docs`
9. Testes e2e passam

## Proxima Fase

-> `03_LISTAS_ITENS.md` - Primeira feature completa full-stack
