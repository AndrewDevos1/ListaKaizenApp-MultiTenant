import { decodeConteudo, parseDecimalPtBr, parseCatalogo, normalizar } from './catalogo-parser';

describe('catalogo-parser', () => {
  it('parseDecimalPtBr aceita formatos pt-BR e rejeita lixo', () => {
    expect(parseDecimalPtBr('1.234,56')).toBe(1234.56);
    expect(parseDecimalPtBr('R$ 12,5')).toBe(12.5);
    expect(parseDecimalPtBr('12.50')).toBe(12.5);
    expect(parseDecimalPtBr('1.234')).toBe(1234);
    expect(parseDecimalPtBr('')).toBeUndefined();
    expect(() => parseDecimalPtBr('abc')).toThrow();
    expect(() => parseDecimalPtBr('-1,00')).toThrow();
    expect(() => parseDecimalPtBr('1,2,3')).toThrow();
  });

  it('decodeConteudo remove BOM e cai para latin1 se UTF-8 inválido', () => {
    expect(decodeConteudo(Buffer.from('\ufeffnome;unidade\nAçúcar;kg', 'utf8'))).toBe('nome;unidade\nAçúcar;kg');
    expect(decodeConteudo(Buffer.from('Açúcar', 'latin1'))).toBe('Açúcar');
  });

  it('normalizar ignora caixa, acento e espaços repetidos', () => {
    expect(normalizar('  Açúcar   REFINADO ')).toBe('acucar refinado');
  });

  it('CSV com cabeçalho, ; ou , , aspas e BOM', () => {
    const r = parseCatalogo('\ufeffcodigo;nome;unidade;marca;descricao;preco\nA1;"Arroz; tipo 1";KG;Tio João;Saco 5kg;"1.234,50"\n', 'csv');
    expect(r.linhas).toEqual([
      expect.objectContaining({ linha: 2, valida: true, codigoFornecedor: 'A1', nome: 'Arroz; tipo 1', unidadeMedida: 'kg', marca: 'Tio João', descricao: 'Saco 5kg', precoAtual: 1234.5 }),
    ]);
    const v = parseCatalogo('nome,unidade\nFeijão,kg', 'csv');
    expect(v.linhas[0]).toEqual(expect.objectContaining({ nome: 'Feijão', unidadeMedida: 'kg', valida: true }));
  });

  it('CSV sem cabeçalho usa ordem legada codigo;descricao;unidade', () => {
    const r = parseCatalogo('10;Sal;kg', 'csv');
    expect(r.linhas[0]).toEqual(expect.objectContaining({ codigoFornecedor: '10', nome: 'Sal', unidadeMedida: 'kg', valida: true }));
  });

  it('marca linhas inválidas com motivo e mantém número da linha', () => {
    const r = parseCatalogo('nome;unidade;preco\n;kg;1\nSal;;1\nAçúcar;kg;x\nOk;kg;2,00', 'csv');
    expect(r.linhas.map((l) => [l.linha, l.valida])).toEqual([[2, false], [3, false], [4, false], [5, true]]);
    expect(r.linhas[0].erros).toContain('nome obrigatório');
    expect(r.linhas[1].erros).toContain('unidade obrigatória');
    expect(r.linhas[2].erros[0]).toMatch(/preço inválido/);
  });

  it('texto: uma linha por item, unidade padrão un, ignora cabeçalho "produto"', () => {
    const r = parseCatalogo('Produto\n\nAlface\nTomate;kg', 'texto');
    expect(r.linhas.map((l) => [l.nome, l.unidadeMedida])).toEqual([['Alface', 'un'], ['Tomate', 'kg']]);
  });

  it('rejeita vazio, aspas abertas e excesso de linhas', () => {
    expect(() => parseCatalogo('  \n ', 'csv')).toThrow(/vazio/);
    expect(() => parseCatalogo('nome;unidade\n"abc;kg', 'csv')).toThrow(/aspas/);
    expect(() => parseCatalogo(Array.from({ length: 1002 }, (_, i) => `Item${i}`).join('\n'), 'texto')).toThrow(/limite/);
  });
});
