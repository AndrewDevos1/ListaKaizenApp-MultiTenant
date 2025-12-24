# -*- coding: utf-8 -*-
"""
Testes para o ImportParser
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from kaizen_app.import_parser import ImportParser, parse_texto_importacao


def test_formato_simples():
    """Testa parse de formato simples (apenas nomes)"""
    texto = """Alga Nori
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)
Açúcar Refinado
Feijão Preto"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert formato == 'simples'
    assert len(itens) == 4
    assert itens[0]['nome'] == 'Alga Nori'
    assert itens[0]['quantidade_atual'] is None
    assert itens[0]['quantidade_minima'] is None
    assert len(erros) == 0
    print("✅ Teste formato simples PASSOU")


def test_formato_completo_tab():
    """Testa parse de formato completo com TAB (copiado do Excel)"""
    texto = """Alga Nori\t\t2\t6
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)\t\t7\t6"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert formato == 'completo'
    assert len(itens) == 2
    assert itens[0]['nome'] == 'Alga Nori'
    assert itens[0]['quantidade_atual'] == 2
    assert itens[0]['quantidade_minima'] == 6
    assert itens[1]['nome'] == 'ARROZ GRAO CURTO HEISEI FARDO (6X5KG)'
    assert itens[1]['quantidade_atual'] == 7
    assert itens[1]['quantidade_minima'] == 6
    assert len(erros) == 0
    print("✅ Teste formato completo com TAB PASSOU")


def test_formato_completo_espacos():
    """Testa parse de formato completo com múltiplos espaços"""
    texto = """Alga Nori                                   2    6
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)      7    6"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert formato == 'completo'
    assert len(itens) == 2
    assert itens[0]['nome'] == 'Alga Nori'
    assert itens[0]['quantidade_atual'] == 2
    assert itens[0]['quantidade_minima'] == 6
    assert len(erros) == 0
    print("✅ Teste formato completo com espaços PASSOU")


def test_formato_completo_espaco_simples():
    """Testa parse de formato completo com espaço simples (1 espaço)"""
    texto = """Alga Nori 2 6
ARROZ GRAO CURTO HEISEI FARDO (6X5KG) 7 6
BAO com vegetais 1 1
Cogumelo 🍄 kg 3 3"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert formato == 'completo'
    assert len(itens) == 4
    assert itens[0]['nome'] == 'Alga Nori'
    assert itens[0]['quantidade_atual'] == 2
    assert itens[0]['quantidade_minima'] == 6
    assert itens[1]['nome'] == 'ARROZ GRAO CURTO HEISEI FARDO (6X5KG)'
    assert itens[2]['nome'] == 'BAO com vegetais'
    assert itens[3]['nome'] == 'Cogumelo 🍄 kg'
    assert len(erros) == 0
    print("✅ Teste formato completo com espaço simples PASSOU")


def test_linhas_vazias():
    """Testa se linhas vazias são ignoradas"""
    texto = """Alga Nori

ARROZ GRAO CURTO


Feijão"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert len(itens) == 3
    assert itens[0]['nome'] == 'Alga Nori'
    assert itens[1]['nome'] == 'ARROZ GRAO CURTO'
    assert itens[2]['nome'] == 'Feijão'
    print("✅ Teste linhas vazias PASSOU")


def test_formato_completo_com_erros():
    """Testa validação de erros no formato completo"""
    texto = """Item Valido\t\t5\t10
Item Sem Quantidade\t\t
Item Com Texto\t\tabc\t5
Item Negativo\t\t-2\t5"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert formato == 'completo'
    assert len(itens) == 1  # Apenas o primeiro é válido
    assert itens[0]['nome'] == 'Item Valido'
    assert len(erros) == 3  # 3 linhas com erro
    print("✅ Teste formato completo com erros PASSOU")
    print(f"   Erros detectados: {erros}")


def test_parse_texto_importacao():
    """Testa função auxiliar parse_texto_importacao"""
    texto = """Alga Nori\t\t2\t6
ARROZ GRAO CURTO\t\t7\t6"""
    
    resultado = parse_texto_importacao(texto)
    
    assert resultado['sucesso'] == True
    assert resultado['formato'] == 'completo'
    assert resultado['total_itens'] == 2
    assert resultado['total_erros'] == 0
    assert len(resultado['itens']) == 2
    print("✅ Teste parse_texto_importacao PASSOU")


def test_detectar_formato():
    """Testa detecção automática de formato"""
    texto_simples = "Item 1\nItem 2"
    texto_completo = "Item 1\t\t5\t10"
    
    formato1 = ImportParser.detectar_formato(texto_simples)
    formato2 = ImportParser.detectar_formato(texto_completo)
    
    assert formato1 == 'simples'
    assert formato2 == 'completo'
    print("✅ Teste detectar_formato PASSOU")


def test_numeros_decimais():
    """Testa se aceita números decimais e converte para int"""
    texto = """Farinha\t\t5.0\t10.0
Açúcar\t\t3.5\t8.5"""
    
    itens, formato, erros = ImportParser.parse(texto)
    
    assert len(itens) == 2
    assert itens[0]['quantidade_atual'] == 5
    assert itens[0]['quantidade_minima'] == 10
    assert itens[1]['quantidade_atual'] == 3
    assert itens[1]['quantidade_minima'] == 8
    print("✅ Teste números decimais PASSOU")


if __name__ == '__main__':
    print("\n🧪 Executando testes do ImportParser...\n")
    
    try:
        test_formato_simples()
        test_formato_completo_tab()
        test_formato_completo_espacos()
        test_formato_completo_espaco_simples()
        test_linhas_vazias()
        test_formato_completo_com_erros()
        test_parse_texto_importacao()
        test_detectar_formato()
        test_numeros_decimais()
        
        print("\n✅ TODOS OS TESTES PASSARAM! 🎉\n")
    except AssertionError as e:
        print(f"\n❌ TESTE FALHOU: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRO INESPERADO: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
