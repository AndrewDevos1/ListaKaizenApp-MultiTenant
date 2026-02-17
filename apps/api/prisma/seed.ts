import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create SUPER_ADMIN
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@kaizen.com' },
    update: {},
    create: {
      nome: 'Super Admin',
      email: 'admin@kaizen.com',
      username: 'superadmin',
      senha: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      aprovado: true,
      ativo: true,
    },
  });

  console.log('Super Admin criado:', superAdmin.email);

  // Create a default restaurant
  const restaurante = await prisma.restaurante.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      nome: 'Restaurante Demo',
      cnpj: '00.000.000/0001-00',
    },
  });

  console.log('Restaurante criado:', restaurante.nome);

  // Create ADMIN for the restaurant
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      nome: 'Admin Demo',
      email: 'admin@demo.com',
      username: 'admindemo',
      senha: adminPassword,
      role: UserRole.ADMIN,
      aprovado: true,
      ativo: true,
      restauranteId: restaurante.id,
    },
  });

  console.log('Admin criado:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
