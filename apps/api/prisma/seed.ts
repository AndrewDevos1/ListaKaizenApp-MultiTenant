import {
  PrismaClient,
  UserRole,
  StatusSubmissao,
  StatusPedido,
  StatusListaRapida,
  StatusSugestao,
  TipoPOP,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = 10;
  const DEFAULT_PASSWORD = await bcrypt.hash('admin123', SALT_ROUNDS);

  // ============================================================
  // 1. SUPER ADMIN
  // ============================================================
  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'superadmin@kaizen.com' },
    update: {},
    create: {
      nome: 'Super Admin Kaizen',
      email: 'superadmin@kaizen.com',
      username: 'superadmin_kaizen',
      senha: DEFAULT_PASSWORD,
      role: UserRole.SUPER_ADMIN,
      aprovado: true,
      ativo: true,
      restauranteId: null,
    },
  });
  console.log('Super Admin criado:', superAdmin.email);

  // Manter compatibilidade com seed anterior (email diferente)
  const superAdminLegacy = await prisma.usuario.upsert({
    where: { email: 'admin@kaizen.com' },
    update: {},
    create: {
      nome: 'Super Admin',
      email: 'admin@kaizen.com',
      username: 'superadmin',
      senha: DEFAULT_PASSWORD,
      role: UserRole.SUPER_ADMIN,
      aprovado: true,
      ativo: true,
      restauranteId: null,
    },
  });
  console.log('Super Admin (legacy) criado:', superAdminLegacy.email);

  // ============================================================
  // 2. RESTAURANTE DEMO
  // ============================================================
  const restaurante = await prisma.restaurante.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      nome: 'Restaurante Demo',
      cnpj: '00.000.000/0001-00',
      ativo: true,
    },
  });
  console.log('Restaurante criado:', restaurante.nome, '(id:', restaurante.id, ')');

  // ============================================================
  // 3. ADMIN DO RESTAURANTE
  // ============================================================
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      nome: 'Admin Demo',
      email: 'admin@demo.com',
      username: 'admindemo',
      senha: DEFAULT_PASSWORD,
      role: UserRole.ADMIN,
      aprovado: true,
      ativo: true,
      restauranteId: restaurante.id,
    },
  });
  console.log('Admin criado:', admin.email);

  // ============================================================
  // 4. COLABORADORES
  // ============================================================
  const colab1 = await prisma.usuario.upsert({
    where: { email: 'colab1@demo.com' },
    update: {},
    create: {
      nome: 'Colaborador Um',
      email: 'colab1@demo.com',
      username: 'colab1_demo',
      senha: DEFAULT_PASSWORD,
      role: UserRole.COLLABORATOR,
      aprovado: true,
      ativo: true,
      restauranteId: restaurante.id,
    },
  });
  console.log('Colaborador 1 criado:', colab1.email);

  const colab2 = await prisma.usuario.upsert({
    where: { email: 'colab2@demo.com' },
    update: {},
    create: {
      nome: 'Colaborador Dois',
      email: 'colab2@demo.com',
      username: 'colab2_demo',
      senha: DEFAULT_PASSWORD,
      role: UserRole.COLLABORATOR,
      aprovado: true,
      ativo: true,
      restauranteId: restaurante.id,
    },
  });
  console.log('Colaborador 2 criado:', colab2.email);

  // ============================================================
  // 5. FORNECEDORES (5)
  // ============================================================
  const fornecedoresData = [
    { nome: 'Distribuidora ABC', cnpj: '11.111.111/0001-11', telefone: '(11) 9999-1111', email: 'abc@distribuidora.com' },
    { nome: 'Hortifruti São Paulo', cnpj: '22.222.222/0001-22', telefone: '(11) 9999-2222', email: 'contato@hortifrutisp.com' },
    { nome: 'Bebidas BR', cnpj: '33.333.333/0001-33', telefone: '(11) 9999-3333', email: 'vendas@bebidasbr.com' },
    { nome: 'Laticínios Campo Verde', cnpj: '44.444.444/0001-44', telefone: '(11) 9999-4444', email: 'comercial@campoverde.com' },
    { nome: 'Embalagens Top', cnpj: '55.555.555/0001-55', telefone: '(11) 9999-5555', email: 'pedidos@embalagestop.com' },
  ];

  const fornecedores: Array<{ id: number; nome: string }> = [];
  for (const fData of fornecedoresData) {
    // Fornecedores não têm unique constraint além do id, usamos findFirst + create
    const existing = await prisma.fornecedor.findFirst({
      where: { restauranteId: restaurante.id, nome: fData.nome },
    });
    if (existing) {
      fornecedores.push(existing);
      console.log('Fornecedor já existe:', existing.nome);
    } else {
      const created = await prisma.fornecedor.create({
        data: {
          nome: fData.nome,
          cnpj: fData.cnpj,
          telefone: fData.telefone,
          email: fData.email,
          ativo: true,
          restauranteId: restaurante.id,
        },
      });
      fornecedores.push(created);
      console.log('Fornecedor criado:', created.nome);
    }
  }

  // ============================================================
  // 6. ITENS (10)
  // ============================================================
  const itensData = [
    { nome: 'Arroz', unidadeMedida: 'kg' },
    { nome: 'Feijão', unidadeMedida: 'kg' },
    { nome: 'Óleo de Soja', unidadeMedida: 'litro' },
    { nome: 'Açúcar', unidadeMedida: 'kg' },
    { nome: 'Sal', unidadeMedida: 'kg' },
    { nome: 'Leite', unidadeMedida: 'litro' },
    { nome: 'Farinha de Trigo', unidadeMedida: 'kg' },
    { nome: 'Café', unidadeMedida: 'kg' },
    { nome: 'Frango', unidadeMedida: 'kg' },
    { nome: 'Carne Bovina', unidadeMedida: 'kg' },
  ];

  const itens: Array<{ id: number; nome: string }> = [];
  for (const iData of itensData) {
    const existing = await prisma.item.findFirst({
      where: { restauranteId: restaurante.id, nome: iData.nome },
    });
    if (existing) {
      itens.push(existing);
      console.log('Item já existe:', existing.nome);
    } else {
      const created = await prisma.item.create({
        data: {
          nome: iData.nome,
          unidadeMedida: iData.unidadeMedida,
          ativo: true,
          restauranteId: restaurante.id,
        },
      });
      itens.push(created);
      console.log('Item criado:', created.nome);
    }
  }

  // Helper para buscar item pelo nome
  const getItem = (nome: string) => {
    const found = itens.find((i) => i.nome === nome);
    if (!found) throw new Error(`Item não encontrado: ${nome}`);
    return found;
  };

  // ============================================================
  // 7. ÁREAS
  // ============================================================
  const areasData = [
    { nome: 'Estoque Principal' },
    { nome: 'Cozinha' },
  ];

  for (const aData of areasData) {
    const existing = await prisma.area.findFirst({
      where: { restauranteId: restaurante.id, nome: aData.nome },
    });
    if (!existing) {
      const created = await prisma.area.create({
        data: { nome: aData.nome, restauranteId: restaurante.id },
      });
      console.log('Área criada:', created.nome);
    } else {
      console.log('Área já existe:', existing.nome);
    }
  }

  // ============================================================
  // 8. LISTAS DE COMPRAS
  // ============================================================

  // Lista 1 — Compras Semanais
  let listaSemanais = await prisma.lista.findFirst({
    where: { restauranteId: restaurante.id, nome: 'Compras Semanais', deletado: false },
  });
  if (!listaSemanais) {
    listaSemanais = await prisma.lista.create({
      data: { nome: 'Compras Semanais', restauranteId: restaurante.id },
    });
    console.log('Lista criada: Compras Semanais');
  } else {
    console.log('Lista já existe: Compras Semanais');
  }

  // Associar colaboradores à lista semanal
  for (const colaboradorId of [colab1.id, colab2.id]) {
    await prisma.listaColaborador.upsert({
      where: { listaId_usuarioId: { listaId: listaSemanais.id, usuarioId: colaboradorId } },
      update: {},
      create: { listaId: listaSemanais.id, usuarioId: colaboradorId },
    });
  }

  // Itens da Lista Semanal com quantidades realistas
  const itensSemanais = [
    { nome: 'Arroz', qtdMinima: 20, qtdAtual: 5 },
    { nome: 'Feijão', qtdMinima: 10, qtdAtual: 2 },
    { nome: 'Óleo de Soja', qtdMinima: 15, qtdAtual: 3 },
    { nome: 'Frango', qtdMinima: 30, qtdAtual: 8 },
    { nome: 'Carne Bovina', qtdMinima: 20, qtdAtual: 4 },
  ];

  for (const ref of itensSemanais) {
    const item = getItem(ref.nome);
    await prisma.listaItemRef.upsert({
      where: { listaId_itemId: { listaId: listaSemanais.id, itemId: item.id } },
      update: {},
      create: {
        listaId: listaSemanais.id,
        itemId: item.id,
        quantidadeMinima: ref.qtdMinima,
        quantidadeAtual: ref.qtdAtual,
        usaThreshold: true,
      },
    });
  }
  console.log('Itens da lista semanal configurados');

  // Lista 2 — Compras Mensais
  let listaMensais = await prisma.lista.findFirst({
    where: { restauranteId: restaurante.id, nome: 'Compras Mensais', deletado: false },
  });
  if (!listaMensais) {
    listaMensais = await prisma.lista.create({
      data: { nome: 'Compras Mensais', restauranteId: restaurante.id },
    });
    console.log('Lista criada: Compras Mensais');
  } else {
    console.log('Lista já existe: Compras Mensais');
  }

  // Associar colab1 à lista mensal
  await prisma.listaColaborador.upsert({
    where: { listaId_usuarioId: { listaId: listaMensais.id, usuarioId: colab1.id } },
    update: {},
    create: { listaId: listaMensais.id, usuarioId: colab1.id },
  });

  // Itens da Lista Mensal
  const itensMensais = [
    { nome: 'Açúcar', qtdMinima: 25, qtdAtual: 10 },
    { nome: 'Sal', qtdMinima: 20, qtdAtual: 15 },
    { nome: 'Leite', qtdMinima: 100, qtdAtual: 20 },
    { nome: 'Farinha de Trigo', qtdMinima: 50, qtdAtual: 12 },
    { nome: 'Café', qtdMinima: 10, qtdAtual: 2 },
  ];

  for (const ref of itensMensais) {
    const item = getItem(ref.nome);
    await prisma.listaItemRef.upsert({
      where: { listaId_itemId: { listaId: listaMensais.id, itemId: item.id } },
      update: {},
      create: {
        listaId: listaMensais.id,
        itemId: item.id,
        quantidadeMinima: ref.qtdMinima,
        quantidadeAtual: ref.qtdAtual,
        usaThreshold: true,
      },
    });
  }
  console.log('Itens da lista mensal configurados');

  // ============================================================
  // 9. SUBMISSÃO PENDENTE (associada à lista semanal)
  // ============================================================
  const submissaoPendenteExistente = await prisma.submissao.findFirst({
    where: {
      restauranteId: restaurante.id,
      listaId: listaSemanais.id,
      usuarioId: colab1.id,
      status: StatusSubmissao.PENDENTE,
    },
  });

  let submissaoPendente: { id: number };
  if (!submissaoPendenteExistente) {
    submissaoPendente = await prisma.submissao.create({
      data: {
        listaId: listaSemanais.id,
        usuarioId: colab1.id,
        restauranteId: restaurante.id,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [
            { itemId: getItem('Arroz').id, qtdSolicitada: 15, status: StatusPedido.PENDENTE },
            { itemId: getItem('Feijão').id, qtdSolicitada: 8, status: StatusPedido.PENDENTE },
            { itemId: getItem('Frango').id, qtdSolicitada: 22, status: StatusPedido.PENDENTE },
          ],
        },
      },
    });
    console.log('Submissão PENDENTE criada (id:', submissaoPendente.id, ')');
  } else {
    submissaoPendente = submissaoPendenteExistente;
    console.log('Submissão PENDENTE já existe (id:', submissaoPendente.id, ')');
  }

  // ============================================================
  // 10. SUBMISSÃO APROVADA (associada à lista mensal)
  // ============================================================
  const submissaoAprovadaExistente = await prisma.submissao.findFirst({
    where: {
      restauranteId: restaurante.id,
      listaId: listaMensais.id,
      usuarioId: colab2.id,
      status: StatusSubmissao.APROVADO,
    },
  });

  if (!submissaoAprovadaExistente) {
    const submissaoAprovada = await prisma.submissao.create({
      data: {
        listaId: listaMensais.id,
        usuarioId: colab2.id,
        restauranteId: restaurante.id,
        status: StatusSubmissao.APROVADO,
        pedidos: {
          create: [
            { itemId: getItem('Açúcar').id, qtdSolicitada: 15, status: StatusPedido.APROVADO },
            { itemId: getItem('Café').id, qtdSolicitada: 8, status: StatusPedido.APROVADO },
          ],
        },
      },
    });
    console.log('Submissão APROVADA criada (id:', submissaoAprovada.id, ')');
  } else {
    console.log('Submissão APROVADA já existe (id:', submissaoAprovadaExistente.id, ')');
  }

  // ============================================================
  // 11. LISTA RÁPIDA PENDENTE (criada por colab1)
  // ============================================================
  const listaRapidaExistente = await prisma.listaRapida.findFirst({
    where: {
      restauranteId: restaurante.id,
      usuarioId: colab1.id,
      status: StatusListaRapida.PENDENTE,
    },
  });

  if (!listaRapidaExistente) {
    const listaRapida = await prisma.listaRapida.create({
      data: {
        nome: 'Pedido Urgente Colab1',
        restauranteId: restaurante.id,
        usuarioId: colab1.id,
        status: StatusListaRapida.PENDENTE,
        itens: {
          create: [
            { nome: 'Papel Toalha', quantidade: 10, unidade: 'rolo' },
            { nome: 'Detergente', quantidade: 5, unidade: 'litro' },
            { nome: 'Luva Descartável', quantidade: 2, unidade: 'caixa' },
          ],
        },
      },
    });
    console.log('Lista Rápida PENDENTE criada (id:', listaRapida.id, ')');
  } else {
    console.log('Lista Rápida PENDENTE já existe (id:', listaRapidaExistente.id, ')');
  }

  // ============================================================
  // 12. SUGESTÃO DE ITEM PENDENTE (sugerida por colab2)
  // ============================================================
  const sugestaoExistente = await prisma.sugestaoItem.findFirst({
    where: {
      restauranteId: restaurante.id,
      usuarioId: colab2.id,
      nome: 'Vinagre',
      status: StatusSugestao.PENDENTE,
    },
  });

  if (!sugestaoExistente) {
    const sugestao = await prisma.sugestaoItem.create({
      data: {
        nome: 'Vinagre',
        unidadeMedida: 'litro',
        status: StatusSugestao.PENDENTE,
        restauranteId: restaurante.id,
        usuarioId: colab2.id,
      },
    });
    console.log('Sugestão de Item criada: Vinagre (id:', sugestao.id, ')');
  } else {
    console.log('Sugestão de Item já existe: Vinagre (id:', sugestaoExistente.id, ')');
  }

  // ============================================================
  // 13. TEMPLATE POP — "Limpeza de Cozinha"
  // ============================================================
  const popExistente = await prisma.pOPTemplate.findFirst({
    where: {
      restauranteId: restaurante.id,
      nome: 'Limpeza de Cozinha',
    },
  });

  if (!popExistente) {
    const popTemplate = await prisma.pOPTemplate.create({
      data: {
        nome: 'Limpeza de Cozinha',
        tipo: TipoPOP.OPERACIONAL,
        descricao: 'Procedimento padrão de limpeza da cozinha ao final do turno',
        ativo: true,
        restauranteId: restaurante.id,
        passos: {
          create: [
            { descricao: 'Retirar todos os utensílios da bancada', ordem: 1 },
            { descricao: 'Aplicar produto desengordurante nas superfícies', ordem: 2 },
            { descricao: 'Esfregar com esponja e enxaguar', ordem: 3 },
            { descricao: 'Higienizar o fogão e fritadeiras', ordem: 4 },
            { descricao: 'Varrer e passar pano no chão', ordem: 5 },
          ],
        },
      },
    });
    console.log('Template POP criado: Limpeza de Cozinha (id:', popTemplate.id, ')');
  } else {
    console.log('Template POP já existe: Limpeza de Cozinha (id:', popExistente.id, ')');
  }

  // ============================================================
  // 14. CONVITES (3 tokens)
  // ============================================================
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);   // -7 dias (expirado/usado)

  const convitesData = [
    {
      token: 'DEMO-TOKEN-VALID-001',
      email: 'novo_colab@demo.com',
      role: UserRole.COLLABORATOR,
      usado: false,
      expiresAt: futureDate,
    },
    {
      token: 'DEMO-TOKEN-VALID-002',
      email: null,
      role: UserRole.COLLABORATOR,
      usado: false,
      expiresAt: futureDate,
    },
    {
      token: 'DEMO-TOKEN-USED-001',
      email: 'colab_antigo@demo.com',
      role: UserRole.COLLABORATOR,
      usado: true,
      expiresAt: pastDate,
    },
  ];

  for (const cData of convitesData) {
    await prisma.conviteToken.upsert({
      where: { token: cData.token },
      update: {},
      create: {
        token: cData.token,
        email: cData.email,
        restauranteId: restaurante.id,
        role: cData.role,
        usado: cData.usado,
        expiresAt: cData.expiresAt,
      },
    });
    console.log(`Convite ${cData.token} (usado: ${cData.usado}) configurado`);
  }

  // ============================================================
  // RESUMO FINAL
  // ============================================================
  console.log('\n=== SEED CONCLUÍDO COM SUCESSO ===');
  console.log('Restaurante ID:', restaurante.id);
  console.log('Super Admin:', superAdmin.email);
  console.log('Admin:', admin.email);
  console.log('Colaboradores:', colab1.email, ',', colab2.email);
  console.log('Fornecedores:', fornecedores.length);
  console.log('Itens:', itens.length);
  console.log('Listas: Compras Semanais (id:', listaSemanais.id, '), Compras Mensais (id:', listaMensais.id, ')');
  console.log('Submissão PENDENTE id:', submissaoPendente.id);
  console.log('Senhas (todas): admin123');
}

main()
  .catch((e) => {
    console.error('ERRO no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
