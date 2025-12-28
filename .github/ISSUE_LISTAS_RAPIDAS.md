# Bug: Listas Rápidas - Submissões não aparecem para Admin

## Descrição
As listas rápidas estão sendo criadas e submetidas pelos colaboradores, mas não aparecem na tela de "Gerenciar Submissões" do administrador.

## Comportamento Esperado
- Quando um colaborador submete uma lista rápida, ela deve aparecer na tela `/admin/submissoes` junto com as outras submissões de listas comuns
- O admin deve poder aprovar, rejeitar ou editar as listas rápidas submetidas

## Comportamento Atual
- As listas rápidas são submetidas com sucesso
- Mas não aparecem na tela de Gerenciar Submissões do admin
- A tela mostra "Nenhuma submissão encontrada"

## Erros Relacionados

### 1. Erro na API `/api/auth/itens-globais`
```
Entity namespace for "lista_mae_itens" has no property "deletado"
```
**Causa**: Query tentando filtrar por campo `deletado` que não existe no modelo `ListaMaeItem`

### 2. Erro no frontend `GerenciarSubmissoes`
```
submissoes.map is not a function
```
**Causa**: A resposta da API não está retornando um array corretamente, mas o frontend espera um array

### 3. Erro na busca case-insensitive
- A busca de itens no frontend não está ignorando acentuação
- Exemplo: digitar "limao" não encontra "Limão"

## Passos para Reproduzir
1. Logar como colaborador
2. Criar uma lista rápida em `/collaborator/lista-rapida/criar`
3. Adicionar itens à lista
4. Submeter a lista para aprovação
5. Fazer logout
6. Logar como administrador
7. Acessar "Gerenciar Submissões"
8. **Resultado**: Lista rápida não aparece

## Arquivos Afetados
- `backend/kaizen_app/controllers.py` - Linha 1305 (rota `/itens-globais`)
- `backend/kaizen_app/services.py` - Função `get_all_submissoes` (linha 653)
- `frontend/src/features/admin/GerenciarSubmissoes.tsx` - Tratamento da resposta da API

## Prioridade
**Alta** - Funcionalidade crítica para o fluxo de aprovação de listas

## Labels
- bug
- lista-rapida
- admin
- submissões

## Data de Criação
28/12/2025 - 02:51 BRT
