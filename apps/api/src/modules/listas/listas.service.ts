import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';
import { AtualizarEstoqueDto } from './dto/atualizar-estoque.dto';
import { UpdateItemRefDto } from './dto/update-item-ref.dto';
import { UpdateMaeItemDto } from './dto/update-mae-item.dto';
import { CopyMoveItemsDto } from './dto/copy-move-items.dto';

@Injectable()
export class ListasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateListaDto, restauranteId: number) {
    const { colaboradorIds, ...rest } = dto;
    const lista = await this.prisma.lista.create({
      data: { ...rest, restauranteId },
    });
    if (colaboradorIds && colaboradorIds.length > 0) {
      await this.prisma.listaColaborador.createMany({
        data: colaboradorIds.map((uid) => ({ listaId: lista.id, usuarioId: uid })),
        skipDuplicates: true,
      });
    }
    return lista;
  }

  async findAll(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: false },
      include: {
        area: { select: { id: true, nome: true } },
        _count: { select: { colaboradores: true, itensRef: true } },
        itensRef: {
          orderBy: { id: 'asc' },
          include: { item: { select: { nome: true, unidadeMedida: true } } },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findAllDeleted(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: true },
      include: { _count: { select: { itensRef: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async restore(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: true },
    });
    if (!lista) throw new NotFoundException('Lista não encontrada na lixeira');
    return this.prisma.lista.update({ where: { id }, data: { deletado: false } });
  }

  async permanentDelete(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: true },
    });
    if (!lista) throw new NotFoundException('Lista não encontrada na lixeira');
    return this.prisma.lista.delete({ where: { id } });
  }

  async findOne(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: false },
      include: {
        colaboradores: {
          include: { usuario: { select: { id: true, nome: true, email: true } } },
        },
        itensRef: {
          include: { item: true },
        },
      },
    });
    if (!lista) {
      throw new NotFoundException('Lista não encontrada');
    }
    return lista;
  }

  async update(id: number, dto: UpdateListaDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    const { colaboradorIds, ...data } = dto;
    return this.prisma.lista.update({ where: { id }, data });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.lista.update({
      where: { id },
      data: { deletado: true },
    });
  }

  // Colaboradores
  async addColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (existing) {
      throw new ConflictException('Colaborador já vinculado a esta lista');
    }

    return this.prisma.listaColaborador.create({
      data: { listaId, usuarioId },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });
  }

  async removeColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (!record) {
      throw new NotFoundException('Colaborador não vinculado a esta lista');
    }

    return this.prisma.listaColaborador.delete({
      where: { id: record.id },
    });
  }

  // Item refs
  async addItemRef(
    listaId: number,
    itemId: number,
    quantidadeMinima: number,
    restauranteId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (existing) {
      throw new ConflictException('Item já está nesta lista');
    }

    return this.prisma.listaItemRef.create({
      data: { listaId, itemId, quantidadeMinima },
      include: { item: true },
    });
  }

  async removeItemRef(listaId: number, itemId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (!record) {
      throw new NotFoundException('Item não está nesta lista');
    }

    return this.prisma.listaItemRef.delete({
      where: { id: record.id },
    });
  }

  async getListaItens(listaId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    return this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: true },
      orderBy: { item: { nome: 'asc' } },
    });
  }

  // Collaborator: minhas listas
  async getMinhasListas(userId: number) {
    return this.prisma.lista.findMany({
      where: {
        deletado: false,
        colaboradores: { some: { usuarioId: userId } },
      },
      include: {
        _count: { select: { itensRef: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Tarefa 1.1 — Atualizar estoque (colaborador)
  async atualizarEstoque(
    listaId: number,
    restauranteId: number,
    dto: AtualizarEstoqueDto,
  ) {
    // Verifica que a lista pertence ao restaurante do usuário
    await this.findOne(listaId, restauranteId);

    // Verifica que cada itemRefId pertence à lista informada (isolamento multi-tenant)
    const itemRefIds = dto.itens.map((i) => i.itemRefId);
    const refsValidas = await this.prisma.listaItemRef.findMany({
      where: { id: { in: itemRefIds }, listaId },
      select: { id: true },
    });

    if (refsValidas.length !== itemRefIds.length) {
      throw new NotFoundException(
        'Um ou mais itens não pertencem à lista informada',
      );
    }

    const atualizados = await Promise.all(
      dto.itens.map((item) =>
        this.prisma.listaItemRef.update({
          where: { id: item.itemRefId },
          data: { quantidadeAtual: item.quantidadeAtual },
          include: { item: true },
        }),
      ),
    );

    return atualizados;
  }

  // Tarefa 2.4 — Atualizar configuração de item ref (usaThreshold, qtdFardo, quantidadeMinima)
  async updateItemRef(
    listaId: number,
    itemRefId: number,
    dto: UpdateItemRefDto,
    restauranteId: number,
  ) {
    // Verificar que a lista pertence ao restaurante
    await this.findOne(listaId, restauranteId);

    // Verificar que o itemRef pertence à lista
    const itemRef = await this.prisma.listaItemRef.findFirst({
      where: { id: itemRefId, listaId },
    });
    if (!itemRef) {
      throw new NotFoundException('Item não encontrado nesta lista');
    }

    return this.prisma.listaItemRef.update({
      where: { id: itemRefId },
      data: dto,
      include: { item: { select: { id: true, nome: true, unidadeMedida: true } } },
    });
  }

  // Assign todos os colaboradores de uma vez (substitui os atuais)
  async assign(listaId: number, colaboradorIds: number[], restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    await this.prisma.listaColaborador.deleteMany({ where: { listaId } });
    if (colaboradorIds.length > 0) {
      await this.prisma.listaColaborador.createMany({
        data: colaboradorIds.map((uid) => ({ listaId, usuarioId: uid })),
        skipDuplicates: true,
      });
    }
    return { ok: true };
  }

  // Deletar permanentemente em lote (da lixeira)
  async permanentDeleteBatch(ids: number[], restauranteId: number) {
    const valid = await this.prisma.lista.findMany({
      where: { id: { in: ids }, restauranteId, deletado: true },
      select: { id: true },
    });
    const validIds = valid.map((l) => l.id);
    await this.prisma.lista.deleteMany({ where: { id: { in: validIds } } });
    return { deletados: validIds.length };
  }

  // Exportar itens como CSV
  async exportCsv(listaId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    const itens = await this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: { select: { nome: true, unidadeMedida: true } } },
      orderBy: { item: { nome: 'asc' } },
    });
    const header = 'nome,unidade,quantidade_minima';
    const rows = itens.map(
      (i) => `"${i.item.nome}","${i.item.unidadeMedida}",${i.quantidadeMinima}`,
    );
    return { csv: [header, ...rows].join('\n') };
  }

  // Importar itens de CSV
  async importFromCsv(listaId: number, texto: string, restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    const lines = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const dataLines = lines[0]?.toLowerCase().startsWith('nome') ? lines.slice(1) : lines;

    let adicionados = 0;
    let ignorados = 0;

    for (const line of dataLines) {
      const cols = (line.match(/(?:"([^"]*)")|([^,]+)/g) ?? []).map((c) =>
        c.replace(/^"|"$/g, '').trim(),
      );
      const nome = cols[0];
      if (!nome) continue;
      const quantidadeMinima = parseFloat(cols[2] || '0') || 0;

      const item = await this.prisma.item.findFirst({
        where: { nome: { equals: nome, mode: 'insensitive' }, restauranteId },
      });
      if (!item) { ignorados++; continue; }

      const existing = await this.prisma.listaItemRef.findUnique({
        where: { listaId_itemId: { listaId, itemId: item.id } },
      });
      if (existing) { ignorados++; continue; }

      await this.prisma.listaItemRef.create({
        data: { listaId, itemId: item.id, quantidadeMinima },
      });
      adicionados++;
    }
    return { adicionados, ignorados };
  }

  // ── Lista Mãe ──────────────────────────────────────────────

  async getListaMae(listaId: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id: listaId, restauranteId, deletado: false },
      include: {
        area: { select: { id: true, nome: true } },
        itensRef: {
          include: {
            item: {
              include: { fornecedor: { select: { id: true, nome: true, telefone: true, email: true } } },
            },
          },
          orderBy: { item: { nome: 'asc' } },
        },
      },
    });
    if (!lista) throw new NotFoundException('Lista não encontrada');

    // Deriva fornecedores únicos
    const fornecedoresMap = new Map<number, { id: number; nome: string; telefone: string | null; email: string | null }>();
    for (const ref of lista.itensRef) {
      const f = ref.item.fornecedor;
      if (f && !fornecedoresMap.has(f.id)) {
        fornecedoresMap.set(f.id, f);
      }
    }

    return { ...lista, fornecedores: Array.from(fornecedoresMap.values()) };
  }

  async addItemByNome(
    listaId: number,
    nome: string,
    unidadeMedida: string,
    quantidadeAtual: number,
    quantidadeMinima: number,
    restauranteId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    // Busca item existente (case-insensitive, mesmo restaurante)
    let item = await this.prisma.item.findFirst({
      where: { nome: { equals: nome, mode: 'insensitive' }, restauranteId },
    });

    // Cria item se não existir
    if (!item) {
      item = await this.prisma.item.create({
        data: { nome, unidadeMedida, restauranteId },
      });
    }

    // Verifica duplicata
    const existing = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId: item.id } },
    });
    if (existing) {
      throw new ConflictException('Item já está nesta lista');
    }

    return this.prisma.listaItemRef.create({
      data: { listaId, itemId: item.id, quantidadeAtual, quantidadeMinima },
      include: {
        item: {
          include: { fornecedor: { select: { id: true, nome: true, telefone: true, email: true } } },
        },
      },
    });
  }

  async updateMaeItem(
    listaId: number,
    itemRefId: number,
    dto: UpdateMaeItemDto,
    restauranteId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    const itemRef = await this.prisma.listaItemRef.findFirst({
      where: { id: itemRefId, listaId },
      include: { item: true },
    });
    if (!itemRef) throw new NotFoundException('Item não encontrado nesta lista');

    let itemId = itemRef.itemId;

    // Se o nome mudou, encontra ou cria o item de destino
    if (dto.nome && dto.nome !== itemRef.item.nome) {
      const unidade = dto.unidadeMedida ?? itemRef.item.unidadeMedida;
      let targetItem = await this.prisma.item.findFirst({
        where: { nome: { equals: dto.nome, mode: 'insensitive' }, restauranteId },
      });
      if (!targetItem) {
        targetItem = await this.prisma.item.create({
          data: { nome: dto.nome, unidadeMedida: unidade, restauranteId },
        });
      }
      // Checa duplicata no destino (se trocar item)
      if (targetItem.id !== itemRef.itemId) {
        const dup = await this.prisma.listaItemRef.findUnique({
          where: { listaId_itemId: { listaId, itemId: targetItem.id } },
        });
        if (dup) throw new ConflictException('Já existe um item com este nome nesta lista');
        itemId = targetItem.id;
      }
    }

    const data: Record<string, unknown> = { itemId };
    if (dto.quantidadeMinima !== undefined) data.quantidadeMinima = dto.quantidadeMinima;
    if (dto.quantidadeAtual !== undefined) data.quantidadeAtual = dto.quantidadeAtual;
    if (dto.qtdFardo !== undefined) data.qtdFardo = dto.qtdFardo;

    return this.prisma.listaItemRef.update({
      where: { id: itemRefId },
      data,
      include: {
        item: {
          include: { fornecedor: { select: { id: true, nome: true, telefone: true, email: true } } },
        },
      },
    });
  }

  async deleteMaeItem(listaId: number, itemRefId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaItemRef.findFirst({
      where: { id: itemRefId, listaId },
    });
    if (!record) throw new NotFoundException('Item não encontrado nesta lista');

    return this.prisma.listaItemRef.delete({ where: { id: itemRefId } });
  }

  async bulkImportByName(listaId: number, nomes: string[], restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const cleanNome = (raw: string): string => {
      let s = raw.trim();
      // Remove padrões tipo "6x5kg", "12x1L"
      s = s.replace(/\d+x\d+\w*/gi, '').trim();
      // Remove conteúdo entre parênteses
      s = s.replace(/\([^)]*\)/g, '').trim();
      // Remove emojis comuns
      s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
      // Remove barras e caracteres especiais no início/fim
      s = s.replace(/^[/\\*•–—\-]+|[/\\*•–—\-]+$/g, '').trim();
      return s;
    };

    let items_criados = 0;
    let items_duplicados = 0;

    for (const raw of nomes) {
      const nome = cleanNome(raw);
      if (!nome) continue;

      try {
        await this.addItemByNome(listaId, nome, 'Un', 0, 0, restauranteId);
        items_criados++;
      } catch (err: any) {
        if (err instanceof ConflictException) {
          items_duplicados++;
        }
        // Ignora outros erros silenciosamente
      }
    }

    return { items_criados, items_duplicados };
  }

  async copyItems(listaId: number, dto: CopyMoveItemsDto, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    if (!dto.listaDestinoId && !dto.nomeNovaLista) {
      throw new BadRequestException('Informe listaDestinoId ou nomeNovaLista');
    }

    let listaDestinoId = dto.listaDestinoId;

    // Cria lista de destino se necessário
    if (dto.nomeNovaLista) {
      const novaLista = await this.prisma.lista.create({
        data: {
          nome: dto.nomeNovaLista,
          restauranteId,
          areaId: dto.areaId ?? null,
        },
      });
      listaDestinoId = novaLista.id;
    }

    // Busca refs da origem
    const refs = await this.prisma.listaItemRef.findMany({
      where: { id: { in: dto.itemRefIds }, listaId },
    });

    let itens_ignorados = 0;
    const itens_ignorados_lista: string[] = [];

    for (const ref of refs) {
      const existing = await this.prisma.listaItemRef.findUnique({
        where: { listaId_itemId: { listaId: listaDestinoId!, itemId: ref.itemId } },
      });
      if (existing) {
        // Pega o nome do item para reportar
        const item = await this.prisma.item.findUnique({ where: { id: ref.itemId }, select: { nome: true } });
        itens_ignorados++;
        itens_ignorados_lista.push(item?.nome ?? String(ref.itemId));
        continue;
      }
      await this.prisma.listaItemRef.create({
        data: {
          listaId: listaDestinoId!,
          itemId: ref.itemId,
          quantidadeMinima: ref.quantidadeMinima,
          quantidadeAtual: 0,
          qtdFardo: ref.qtdFardo,
        },
      });
    }

    return {
      message: `${refs.length - itens_ignorados} itens copiados`,
      listaDestinoId,
      itens_ignorados,
      itens_ignorados_lista,
    };
  }

  async moveItems(listaId: number, dto: CopyMoveItemsDto, restauranteId: number) {
    const result = await this.copyItems(listaId, dto, restauranteId);

    // Remove os refs da origem que foram copiados com sucesso
    const refsCopiados = result.itens_ignorados_lista.length === 0
      ? dto.itemRefIds
      : dto.itemRefIds; // Remove todos da origem independente de duplicatas

    await this.prisma.listaItemRef.deleteMany({
      where: { id: { in: refsCopiados }, listaId },
    });

    return { ...result, message: `${dto.itemRefIds.length - result.itens_ignorados} itens movidos` };
  }

  async atribuirFornecedor(
    listaId: number,
    itemRefIds: number[],
    fornecedorId: number,
    restauranteId: number,
    usuarioId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    // Verifica que todos os itemRefIds pertencem à lista
    const refs = await this.prisma.listaItemRef.findMany({
      where: { id: { in: itemRefIds }, listaId },
    });
    if (refs.length === 0) throw new NotFoundException('Nenhum item encontrado');

    // Verifica fornecedor
    const fornecedor = await this.prisma.fornecedor.findFirst({
      where: { id: fornecedorId, restauranteId },
    });
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado');

    // Cria Submissao
    const submissao = await this.prisma.submissao.create({
      data: {
        listaId,
        usuarioId,
        restauranteId,
        status: StatusSubmissao.PENDENTE,
        arquivada: false,
        pedidos: {
          create: refs.map((ref) => ({
            itemId: ref.itemId,
            qtdSolicitada: ref.qtdFardo ?? ref.quantidadeMinima ?? 1,
          })),
        },
      },
      include: { pedidos: true },
    });

    return { total_pedidos: submissao.pedidos.length, submissaoId: submissao.id };
  }

  // Tarefa 1.3 — Submeter lista (colaborador)
  async submeterLista(
    listaId: number,
    restauranteId: number,
    usuarioId: number,
  ) {
    // Busca todos os itensRef da lista
    await this.findOne(listaId, restauranteId);

    const itensRef = await this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: true },
    });

    // Calcula qtdSolicitada para cada item
    const itensSolicitados = itensRef
      .map((ref) => ({
        itemId: ref.itemId,
        qtdSolicitada: Math.max(0, ref.quantidadeMinima - ref.quantidadeAtual),
      }))
      .filter((i) => i.qtdSolicitada > 0);

    // Se nenhum item precisar de reposição, retorna 422
    if (itensSolicitados.length === 0) {
      throw new UnprocessableEntityException(
        'Todos os itens estão acima do mínimo',
      );
    }

    // Cria a Submissao com os Pedidos em uma transação
    const submissao = await this.prisma.submissao.create({
      data: {
        listaId,
        usuarioId,
        restauranteId,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: itensSolicitados.map((i) => ({
            itemId: i.itemId,
            qtdSolicitada: i.qtdSolicitada,
          })),
        },
      },
      include: {
        pedidos: {
          include: { item: true },
        },
      },
    });

    return submissao;
  }
}
