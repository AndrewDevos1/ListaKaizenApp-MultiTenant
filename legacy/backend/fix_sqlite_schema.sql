-- Script para corrigir o schema do SQLite no Render
-- Execute este script se as migrações falharem

-- Adicionar campos de soft delete na tabela listas (se não existirem)
ALTER TABLE listas ADD COLUMN deletado BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE listas ADD COLUMN data_delecao DATETIME;

-- Adicionar campos em fornecedores (se não existirem)
ALTER TABLE fornecedores ADD COLUMN responsavel VARCHAR(100);
ALTER TABLE fornecedores ADD COLUMN observacao VARCHAR(600);
