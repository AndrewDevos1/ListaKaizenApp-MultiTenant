# -*- coding: utf-8 -*-
"""
Parser inteligente para importação de itens em diferentes formatos

Suporta dois formatos:
1. Apenas nomes (uma coluna)
2. Nome + Quantidade Atual + Quantidade Mínima (três colunas)
"""

import re
from typing import List, Dict, Tuple


class ImportParser:
    """Parser para processar texto colado de Excel/Google Sheets"""
    
    @staticmethod
    def detectar_formato(texto: str) -> str:
        """
        Detecta o formato do texto importado
        
        Returns:
            'simples' - apenas nomes (1 coluna)
            'completo' - nome + qtd_atual + qtd_minima (3 colunas)
        """
        linhas = texto.strip().split('\n')
        if not linhas:
            return 'simples'
        
        # Analisa primeira linha não vazia
        for linha in linhas:
            linha = linha.strip()
            if not linha:
                continue
                
            # Separa por TAB ou múltiplos espaços
            partes = re.split(r'\t+|\s{2,}', linha.strip())
            partes = [p.strip() for p in partes if p.strip()]
            
            if len(partes) >= 3:
                # Verifica se as últimas 2 partes são números
                try:
                    float(partes[-1])  # Qtd mínima
                    float(partes[-2])  # Qtd atual
                    return 'completo'
                except ValueError:
                    pass
            
        return 'simples'
    
    @staticmethod
    def parse_simples(texto: str) -> List[Dict]:
        """
        Parse formato simples: apenas nomes dos itens
        
        Args:
            texto: String com nomes separados por quebra de linha
            
        Returns:
            Lista de dicts com estrutura: [{'nome': 'Item 1'}, ...]
        """
        linhas = texto.strip().split('\n')
        itens = []
        
        for linha in linhas:
            nome = linha.strip()
            if nome:  # Ignora linhas vazias
                itens.append({
                    'nome': nome,
                    'quantidade_atual': None,
                    'quantidade_minima': None
                })
        
        return itens
    
    @staticmethod
    def parse_completo(texto: str) -> Tuple[List[Dict], List[str]]:
        """
        Parse formato completo: nome + qtd_atual + qtd_minima
        
        Args:
            texto: String com dados tabulados (separados por TAB ou espaços múltiplos)
            
        Returns:
            Tuple (itens_validos, erros)
            - itens_validos: Lista de dicts com estrutura:
              [{'nome': 'Item 1', 'quantidade_atual': 2, 'quantidade_minima': 6}, ...]
            - erros: Lista de mensagens de erro para linhas inválidas
        """
        linhas = texto.strip().split('\n')
        itens = []
        erros = []
        
        for num_linha, linha in enumerate(linhas, start=1):
            linha = linha.strip()
            if not linha:  # Ignora linhas vazias
                continue
            
            # Separa por TAB ou múltiplos espaços (2 ou mais)
            partes = re.split(r'\t+|\s{2,}', linha)
            partes = [p.strip() for p in partes if p.strip()]
            
            if len(partes) < 3:
                erros.append(f"Linha {num_linha}: Formato inválido. Esperado: Nome [TAB] Qtd Atual [TAB] Qtd Mínima")
                continue
            
            # Extrai as 3 colunas
            # Nome pode ter espaços, então pega tudo menos os últimos 2 números
            qtd_minima_str = partes[-1]
            qtd_atual_str = partes[-2]
            nome_partes = partes[:-2]
            nome = ' '.join(nome_partes) if nome_partes else partes[0]
            
            # Valida quantidades
            try:
                qtd_atual = float(qtd_atual_str)
                qtd_minima = float(qtd_minima_str)
                
                if qtd_atual < 0:
                    erros.append(f"Linha {num_linha}: Quantidade atual não pode ser negativa")
                    continue
                
                if qtd_minima < 0:
                    erros.append(f"Linha {num_linha}: Quantidade mínima não pode ser negativa")
                    continue
                
                itens.append({
                    'nome': nome,
                    'quantidade_atual': int(qtd_atual),
                    'quantidade_minima': int(qtd_minima)
                })
                
            except ValueError:
                erros.append(
                    f"Linha {num_linha}: Quantidades devem ser números válidos "
                    f"(encontrado: atual='{qtd_atual_str}', mínima='{qtd_minima_str}')"
                )
                continue
        
        return itens, erros
    
    @classmethod
    def parse(cls, texto: str) -> Tuple[List[Dict], str, List[str]]:
        """
        Parse inteligente que detecta o formato automaticamente
        
        Args:
            texto: String com dados para importar
            
        Returns:
            Tuple (itens, formato, erros)
            - itens: Lista de dicts com dados dos itens
            - formato: 'simples' ou 'completo'
            - erros: Lista de mensagens de erro (vazia se formato simples)
        """
        if not texto or not texto.strip():
            return [], 'simples', ['Texto vazio']
        
        formato = cls.detectar_formato(texto)
        
        if formato == 'completo':
            itens, erros = cls.parse_completo(texto)
            return itens, formato, erros
        else:
            itens = cls.parse_simples(texto)
            return itens, formato, []


# Funções auxiliares para facilitar o uso no service

def parse_texto_importacao(texto: str) -> Dict:
    """
    Função auxiliar para parse de texto importado
    
    Returns:
        {
            'sucesso': bool,
            'formato': str,
            'itens': List[Dict],
            'erros': List[str],
            'total_itens': int,
            'total_erros': int
        }
    """
    itens, formato, erros = ImportParser.parse(texto)
    
    return {
        'sucesso': len(itens) > 0,
        'formato': formato,
        'itens': itens,
        'erros': erros,
        'total_itens': len(itens),
        'total_erros': len(erros)
    }
