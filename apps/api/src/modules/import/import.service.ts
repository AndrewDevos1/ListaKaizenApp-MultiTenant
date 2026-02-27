import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as AdmZip from 'adm-zip';

export interface ZipImportResult {
  fornecedores: { criados: number; ignorados: number };
  areas: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criados: number; ignorados: number };
  erros: string[];
}

export interface ListaCsvImportResult {
  vinculados: number;
  ignorados: number;
  naoEncontrados: string[];
  erros: string[];
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parses a CSV string (with quoted fields) into a 2D string array */
  private parseCSV(text: string): string[][] {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    return lines
      .filter((line) => line.trim())
      .map((line) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            // Handle escaped quotes ("")
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += c;
          }
        }
        result.push(current.trim());
        return result;
      });
  }

  /**
   * Phase 1: Import from the legacy bulk export ZIP.
   * Expected ZIP contents: fornecedores.csv, areas.csv, itens.csv, listas.csv
   * Import order respects FK dependencies: fornecedores → areas → itens → listas
   */
  async importarZipBackup(buffer: Buffer, restauranteId: number): Promise<ZipImportResult> {
    const results: ZipImportResult = {
      fornecedores: { criados: 0, ignorados: 0 },
      areas: { criados: 0, ignorados: 0 },
      itens: { criados: 0, ignorados: 0 },
      listas: { criados: 0, ignorados: 0 },
      erros: [],
    };

    let zip: InstanceType<typeof AdmZip>;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException('Arquivo ZIP inválido ou corrompido');
    }

    const getCSVText = (filename: string): string | null => {
      const entry = zip.getEntry(filename);
      if (!entry) return null;
      // Strip BOM if present (Excel sometimes adds it)
      const raw = entry.getData().toString('utf8');
      return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    };

    // Tracks nome → id for cross-referencing during itens import
    const fornecedorMap: Record<string, number> = {};

    // ── 1. Fornecedores ──────────────────────────────────────────────────────
    // CSV format: ID, Nome, Contato, Telefone, Email, Responsável, Observação
    const fornCSV = getCSVText('fornecedores.csv');
    if (fornCSV) {
      const rows = this.parseCSV(fornCSV).slice(1);
      for (const row of rows) {
        const nome = row[1]?.trim();
        if (!nome) continue;
        try {
          const existing = await this.prisma.fornecedor.findFirst({
            where: { nome, restauranteId },
          });
          if (existing) {
            fornecedorMap[nome] = existing.id;
            results.fornecedores.ignorados++;
          } else {
            const created = await this.prisma.fornecedor.create({
              data: {
                nome,
                telefone: row[3]?.trim() || null,
                email: row[4]?.trim() || null,
                restauranteId,
              },
            });
            fornecedorMap[nome] = created.id;
            results.fornecedores.criados++;
          }
        } catch (e: any) {
          results.erros.push(`Fornecedor "${nome}": ${e.message}`);
        }
      }
    }

    // Load existing fornecedores not in the CSV into map (for itens that reference them)
    const existingForn = await this.prisma.fornecedor.findMany({
      where: { restauranteId },
      select: { id: true, nome: true },
    });
    for (const f of existingForn) {
      if (!fornecedorMap[f.nome]) fornecedorMap[f.nome] = f.id;
    }

    // ── 2. Áreas ────────────────────────────────────────────────────────────
    // CSV format: ID, Nome, Descrição
    const areasCSV = getCSVText('areas.csv');
    if (areasCSV) {
      const rows = this.parseCSV(areasCSV).slice(1);
      for (const row of rows) {
        const nome = row[1]?.trim();
        if (!nome) continue;
        try {
          const existing = await this.prisma.area.findFirst({
            where: { nome, restauranteId },
          });
          if (existing) {
            results.areas.ignorados++;
          } else {
            await this.prisma.area.create({ data: { nome, restauranteId } });
            results.areas.criados++;
          }
        } catch (e: any) {
          results.erros.push(`Área "${nome}": ${e.message}`);
        }
      }
    }

    // ── 3. Itens ────────────────────────────────────────────────────────────
    // CSV format: ID, Nome, Unidade Medida, Fornecedor, Data Criação
    const itensCSV = getCSVText('itens.csv');
    if (itensCSV) {
      const rows = this.parseCSV(itensCSV).slice(1);
      for (const row of rows) {
        const nome = row[1]?.trim();
        const unidade = row[2]?.trim();
        const fornecedorNome = row[3]?.trim();
        if (!nome || !unidade) continue;
        try {
          const existing = await this.prisma.item.findFirst({
            where: { nome, restauranteId },
          });
          if (existing) {
            results.itens.ignorados++;
          } else {
            const fornecedorId = fornecedorNome ? fornecedorMap[fornecedorNome] ?? null : null;
            await this.prisma.item.create({
              data: { nome, unidadeMedida: unidade, restauranteId, fornecedorId },
            });
            results.itens.criados++;
          }
        } catch (e: any) {
          results.erros.push(`Item "${nome}": ${e.message}`);
        }
      }
    }

    // ── 4. Listas ───────────────────────────────────────────────────────────
    // CSV format: ID, Nome, Descrição, Data Criação, Colaboradores
    const listasCSV = getCSVText('listas.csv');
    if (listasCSV) {
      const rows = this.parseCSV(listasCSV).slice(1);
      for (const row of rows) {
        const nome = row[1]?.trim();
        if (!nome) continue;
        try {
          const existing = await this.prisma.lista.findFirst({
            where: { nome, restauranteId, deletado: false },
          });
          if (existing) {
            results.listas.ignorados++;
          } else {
            await this.prisma.lista.create({ data: { nome, restauranteId } });
            results.listas.criados++;
          }
        } catch (e: any) {
          results.erros.push(`Lista "${nome}": ${e.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Phase 2: Import items into a specific list from a per-list CSV.
   * CSV format (from legacy export_lista_to_csv):
   *   nome,unidade,quantidade_atual,quantidade_minima
   */
  async importarListaCsv(
    buffer: Buffer,
    listaId: number,
    restauranteId: number,
  ): Promise<ListaCsvImportResult> {
    const lista = await this.prisma.lista.findFirst({
      where: { id: listaId, restauranteId, deletado: false },
    });
    if (!lista) throw new BadRequestException('Lista não encontrada');

    const csvText = (() => {
      const raw = buffer.toString('utf8');
      return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    })();

    const rows = this.parseCSV(csvText).slice(1); // skip header

    const result: ListaCsvImportResult = {
      vinculados: 0,
      ignorados: 0,
      naoEncontrados: [],
      erros: [],
    };

    for (const row of rows) {
      const nomeItem = row[0]?.trim();
      if (!nomeItem) continue;

      const qtdAtual = parseFloat(row[2]) || 0;
      const qtdMinima = parseFloat(row[3]) || 0;

      const item = await this.prisma.item.findFirst({
        where: { nome: nomeItem, restauranteId },
      });
      if (!item) {
        result.naoEncontrados.push(nomeItem);
        continue;
      }

      try {
        const existing = await this.prisma.listaItemRef.findFirst({
          where: { listaId, itemId: item.id },
        });
        if (existing) {
          result.ignorados++;
        } else {
          await this.prisma.listaItemRef.create({
            data: { listaId, itemId: item.id, quantidadeMinima: qtdMinima, quantidadeAtual: qtdAtual },
          });
          result.vinculados++;
        }
      } catch (e: any) {
        result.erros.push(`"${nomeItem}": ${e.message}`);
      }
    }

    return result;
  }

  /** Returns all active lists for the restaurant (for the dropdown in Phase 2) */
  async listarListas(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: false },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  }
}
