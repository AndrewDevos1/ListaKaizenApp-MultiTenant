 Plan to implement                                                                                                                                              │
│                                                                                                                                                                │
│ Plano: Backup e Restore de Restaurante (Super Admin)                                                                                                           │
│                                                                                                                                                                │
│ Contexto                                                                                                                                                       │
│                                                                                                                                                                │
│ O super admin precisa poder exportar todos os dados de um restaurante (usuários, listas, itens, fornecedores) em um único arquivo, e restaurar esse arquivo em │
│  outro ambiente ou no mesmo sistema. O objetivo principal é migração de dados e segurança operacional.                                                         │
│                                                                                                                                                                │
│ Formato Recomendado: .kaizen (gzip + JSON)                                                                                                                     │
│                                                                                                                                                                │
│ Por que não ZIP+CSV: CSVs são ruins para dados aninhados (listas → itens → quantidades). Requer múltiplos arquivos e não tem tipagem.                          │
│                                                                                                                                                                │
│ Por que .kaizen (gzip+JSON):                                                                                                                                   │
│ - Um único arquivo, UX simples                                                                                                                                 │
│ - JSON preserva tipos (números, booleanos, nulls)                                                                                                              │
│ - Estrutura hierárquica nativa (lista com seus itens embedded)                                                                                                 │
│ - Campo _meta.version para evolução futura do schema                                                                                                           │
│ - Compressão gzip reduz tamanho significativamente                                                                                                             │
│ - Extensão proprietária identifica o arquivo (não é um JSON qualquer)                                                                                          │
│ - Fácil de validar na importação                                                                                                                               │
│                                                                                                                                                                │
│ Estrutura interna do .kaizen:                                                                                                                                  │
│ {                                                                                                                                                              │
│   "_meta": {                                                                                                                                                   │
│     "version": "1.0",                                                                                                                                          │
│     "criado_em": "2026-02-28T12:00:00",                                                                                                                        │
│     "restaurante_nome": "Restaurante X",                                                                                                                       │
│     "gerado_por": "super_admin@email.com"                                                                                                                      │
│   },                                                                                                                                                           │
│   "restaurante": {                                                                                                                                             │
│     "nome": "...",                                                                                                                                             │
│     "slug": "..."                                                                                                                                              │
│   },                                                                                                                                                           │
│   "usuarios": [                                                                                                                                                │
│     {                                                                                                                                                          │
│       "nome": "...", "email": "...", "username": "...",                                                                                                        │
│       "role": "ADMIN", "senha_hash": "...", "senha_texto_puro": "...",                                                                                         │
│       "aprovado": true, "ativo": true                                                                                                                          │
│     }                                                                                                                                                          │
│   ],                                                                                                                                                           │
│   "fornecedores": [                                                                                                                                            │
│     { "nome": "...", "telefone": "...", "contato": "...", "responsavel": "...", "observacao": "..." }                                                          │
│   ],                                                                                                                                                           │
│   "lista_mae_itens": [                                                                                                                                         │
│     { "nome": "...", "unidade": "..." }                                                                                                                        │
│   ],                                                                                                                                                           │
│   "itens": [                                                                                                                                                   │
│     { "nome": "...", "unidade_medida": "...", "fornecedor_nome": "..." }                                                                                       │
│   ],                                                                                                                                                           │
│   "listas": [                                                                                                                                                  │
│     {                                                                                                                                                          │
│       "nome": "...", "descricao": "...",                                                                                                                       │
│       "itens": [                                                                                                                                               │
│         { "item_nome": "...", "quantidade_atual": 0.0, "quantidade_minima": 1.0 }                                                                              │
│       ]                                                                                                                                                        │
│     }                                                                                                                                                          │
│   ]                                                                                                                                                            │
│ }                                                                                                                                                              │
│                                                                                                                                                                │
│ Nota sobre IDs: O restore usa nomes como chave de vínculo (não IDs numéricos), igual ao importador legado. Isso garante compatibilidade se IDs mudarem entre   │
│ ambientes.                                                                                                                                                     │
│                                                                                                                                                                │
│ ---                                                                                                                                                            │
│ Escopo de Dados do Backup                                                                                                                                      │
│                                                                                                                                                                │
│ ┌─────────────────────────────────────────┬──────────────────────────────────────────┐                                                                         │
│ │                Incluído                 │                  Motivo                  │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ Restaurante                             │ Metadados do tenant                      │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ Usuario (ADMIN, COLLABORATOR, SUPPLIER) │ Com senha_hash para restore completo     │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ Fornecedor                              │ Necessário para vincular itens           │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ Item                                    │ Catálogo de itens legado (tabela itens)  │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ ListaMaeItem                            │ Catálogo global (tabela lista_mae_itens) │                                                                         │
│ ├─────────────────────────────────────────┼──────────────────────────────────────────┤                                                                         │
│ │ Lista + ListaItemRef                    │ Listas com seus itens e quantidades      │                                                                         │
│ └─────────────────────────────────────────┴──────────────────────────────────────────┘                                                                         │
│                                                                                                                                                                │
│ ┌────────────────────────────┬──────────────────────────────────────────────────┐                                                                              │
│ │          Excluído          │                      Motivo                      │                                                                              │
│ ├────────────────────────────┼──────────────────────────────────────────────────┤                                                                              │
│ │ Pedidos, Cotações, Estoque │ Dados operacionais, não essenciais para migração │                                                                              │
│ ├────────────────────────────┼──────────────────────────────────────────────────┤                                                                              │
│ │ POPs                       │ Fora do escopo do plano                          │                                                                              │
│ ├────────────────────────────┼──────────────────────────────────────────────────┤                                                                              │
│ │ AppLog, Notificações       │ Dados de sistema, não restaurar                  │                                                                              │
│ └────────────────────────────┴──────────────────────────────────────────────────┘                                                                              │
│                                                                                                                                                                │
│ ---                                                                                                                                                            │
│ Backend                                                                                                                                                        │
│                                                                                                                                                                │
│ Novos Endpoints (em controllers.py, blueprint admin_bp, decorator @super_admin_required())                                                                     │
│                                                                                                                                                                │
│ 1. Backup                                                                                                                                                      │
│                                                                                                                                                                │
│ GET /api/admin/restaurantes/<restaurante_id>/backup                                                                                                            │
│ - Busca todos os dados do restaurante                                                                                                                          │
│ - Serializa em JSON                                                                                                                                            │
│ - Comprime com gzip                                                                                                                                            │
│ - Retorna arquivo com Content-Type: application/gzip e nome restaurante_slug_YYYY-MM-DD.kaizen                                                                 │
│                                                                                                                                                                │
│ 2. Restore                                                                                                                                                     │
│                                                                                                                                                                │
│ POST /api/admin/restaurantes/restore                                                                                                                           │
│ - Recebe arquivo .kaizen via multipart/form-data                                                                                                               │
│ - Parâmetro opcional: restaurante_id (restaurar em restaurante existente) ou sem ele (criar novo)                                                              │
│ - Valida _meta.version                                                                                                                                         │
│ - Idempotente: não cria duplicatas (match por nome)                                                                                                            │
│ - Retorna resumo: quantos itens criados/ignorados por tipo                                                                                                     │
│                                                                                                                                                                │
│ Nova service function em services.py                                                                                                                           │
│                                                                                                                                                                │
│ backup_restaurante(restaurante_id):                                                                                                                            │
│ - Consulta todos os dados do restaurante                                                                                                                       │
│ - Monta dict estruturado                                                                                                                                       │
│ - Serializa → gzip                                                                                                                                             │
│ - Retorna BytesIO                                                                                                                                              │
│                                                                                                                                                                │
│ restore_restaurante(arquivo_bytes, restaurante_id=None):                                                                                                       │
│ - Descomprime gzip → JSON                                                                                                                                      │
│ - Valida versão                                                                                                                                                │
│ - Cria/atualiza restaurante                                                                                                                                    │
│ - Cria usuários (match por email, não duplica)                                                                                                                 │
│ - Cria fornecedores (match por nome)                                                                                                                           │
│ - Cria itens (match por nome)                                                                                                                                  │
│ - Cria lista_mae_itens (match por nome)                                                                                                                        │
│ - Cria listas com ListaItemRef (match por nome de lista e item)                                                                                                │
│ - Retorna dict com resumo                                                                                                                                      │
│                                                                                                                                                                │
│ ---                                                                                                                                                            │
│ Frontend                                                                                                                                                       │
│                                                                                                                                                                │
│ Placement: GerenciarRestaurantes.tsx                                                                                                                           │
│                                                                                                                                                                │
│ Adicionar na linha de ação de cada restaurante (onde já existem botões de editar/deletar):                                                                     │
│ - Botão "Backup" (ícone download) → chama GET /admin/restaurantes/<id>/backup, faz download do arquivo .kaizen                                                 │
│ - Botão "Restaurar" (ícone upload) → abre modal com input de arquivo .kaizen → chama POST /admin/restaurantes/restore passando o arquivo e o restaurante_id    │
│                                                                                                                                                                │
│ Arquivos a modificar                                                                                                                                           │
│                                                                                                                                                                │
│ ┌───────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┐                                          │
│ │                        Arquivo                        │                          Mudança                          │                                          │
│ ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤                                          │
│ │ backend/kaizen_app/services.py                        │ Adicionar backup_restaurante() e restore_restaurante()    │                                          │
│ ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤                                          │
│ │ backend/kaizen_app/controllers.py                     │ Adicionar 2 rotas no admin_bp com @super_admin_required() │                                          │
│ ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤                                          │
│ │ frontend/src/features/admin/GerenciarRestaurantes.tsx │ Botões + modal de restore na linha de cada restaurante    │                                          │
│ └───────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────┘                                          │
│                                                                                                                                                                │
│ ---                                                                                                                                                            │
│ Verificação                                                                                                                                                    │
│                                                                                                                                                                │
│ 1. Fazer backup de um restaurante com dados → arquivo .kaizen é baixado                                                                                        │
│ 2. Inspecionar o arquivo: cat arquivo.kaizen | gunzip | python -m json.tool                                                                                    │
│ 3. Restaurar em um restaurante novo → verificar no banco que dados foram criados                                                                               │
│ 4. Restaurar novamente (idempotência) → nenhum dado duplicado, resumo mostra "ignorados"                                                                       │
│ 5. Testar com arquivo corrompido → retorna erro 400 com mensagem clara                                                                                         │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

● Recalled 1 memory, searched for 4 patterns, read 2 files (ctrl+o to expand)      
                                                                      
● Now let me look at the restaurantes routes in controllers.py and the services.py structure:                                                                     
                             
● Searched for 6 patterns, read 3 files (ctrl+o to expand)                                                                                                        
                                                                                                                                                                  
● Now let me look at the GerenciarRestaurantes.tsx more carefully to understand the existing UI patterns:                                                         
                                                                                                                                                                  
● Searched for 1 pattern, read 1 file (ctrl+o to expand)                                                                                                          
                                                                                                                                                                  
● Now I have enough context. Let me create the tasks and implement the plan:                                                                                      
                                                                                                                                                                  
● Now let me add the service functions to services.py:                                                                                                            
                                                                                                                                                                  
● Read 1 file (ctrl+o to expand)                                                                                                                                  
                                                                                                                                                                  
● Now I have all the context needed. Let me implement all three changes:                                                                                          
                                                                                                                                                                  
● Update(backend/kaizen_app/services.py)                                                                                                                          
  ⎿  Added 372 lines                                                                                                                                              
      11805      db.session.commit()                                                                                                                       
      11806                                                                                                                                                       
      11807      return ref.to_dict(), 200                                                                                                                        
      11808 +                                                                                                                                                     
      11809 +                                                                                                                                                     
      11810 +# ========================================                                                                                                           
      11811 +# BACKUP / RESTORE DE RESTAURANTE                                                                                                             
      11812 +# ========================================                                                                                                    
      11813 +                                                                                                                                              
      11814 +def backup_restaurante(restaurante_id):                                                                                                       
      11815 +    """                                                                                                                                       
      11816 +    Gera um arquivo .kaizen (gzip+JSON) com todos os dados do restaurante.                                                                    
      11817 +    Retorna (BytesIO, filename) em caso de sucesso ou (dict, status_code) em erro.                                                            
      11818 +    """                                                                                                                                       
      11819 +    import gzip                                                                                                                               
      11820 +    import json                                                                                                                               
      11821 +    from io import BytesIO                                                                                                                    
      11822 +                                                                                                                                              
      11823 +    restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()                                                      
      11824 +    if not restaurante:                                                                                                                       
      11825 +        return {"error": "Restaurante não encontrado."}, 404                                                                                  
      11826 +                                                                                                                                              
      11827 +    # Usuarios (exceto SUPER_ADMIN)                                                                                                           
      11828 +    usuarios = Usuario.query.filter(                                                                                                          
      11829 +        Usuario.restaurante_id == restaurante_id,                                                                                             
      11830 +        Usuario.role != UserRoles.SUPER_ADMIN                                                                                                 
      11831 +    ).all()                                                                                                                                   
      11832 +                                                                                                                                              
      11833 +    # Fornecedores                                                                                                                            
      11834 +    fornecedores = Fornecedor.query.filter_by(restaurante_id=restaurante_id).all()                                                            
      11835 +    fornecedores_ids = [f.id for f in fornecedores]                                                                                           
      11836 +                                                                                                                                              
      11837 +    # Itens (legado, da tabela itens, vinculados via fornecedor)                                                                              
      11838 +    itens = []                                                                                                                                
      11839 +    if fornecedores_ids:                                                                                                                      
      11840 +        itens = Item.query.filter(Item.fornecedor_id.in_(fornecedores_ids)).all()                                                             
      11841 +                                                                                                                                              
      11842 +    # ListaMaeItem (catálogo global do restaurante)                                                                                           
      11843 +    lista_mae_itens = ListaMaeItem.query.filter_by(restaurante_id=restaurante_id).all()                                                       
      11844 +                                                                                                                                              
      11845 +    # Listas com seus itens                                                                                                                   
      11846 +    listas = Lista.query.filter_by(restaurante_id=restaurante_id, deletado=False).all()                                                       
      11847 +                                                                                                                                              
      11848 +    listas_data = []                                                                                                                          
      11849 +    for lista in listas:                                                                                                                      
      11850 +        refs = lista.item_refs.all()                                                                                                          
      11851 +        itens_lista = []                                                                                                                      
      11852 +        for ref in refs:                                                                                                                      
      11853 +            item_nome = ref.item.nome if ref.item else None                                                                                   
      11854 +            if item_nome:                                                                                                                     
      11855 +                itens_lista.append({                                                                                                          
      11856 +                    "item_nome": item_nome,                                                                                                   
      11857 +                    "quantidade_atual": ref.quantidade_atual,                                                                                 
      11858 +                    "quantidade_minima": ref.quantidade_minima,                                                                               
      11859 +                    "quantidade_por_fardo": ref.quantidade_por_fardo,                                                                         
      11860 +                    "usa_threshold": ref.usa_threshold                                                                                        
      11861 +                })                                                                                                                            
      11862 +        listas_data.append({                                                                                                                  
      11863 +            "nome": lista.nome,                                                                                                               
      11864 +            "descricao": lista.descricao,                                                                                                     
      11865 +            "itens": itens_lista                                                                                                              
      11866 +        })                                                                                                                                    
      11867 +                                                                                                                                              
      11868 +    payload = {                                                                                                                               
      11869 +        "_meta": {                                                                                                                            
      11870 +            "version": "1.0",                                                                                                                 
      11871 +            "criado_em": brasilia_now().isoformat(),                                                                                          
      11872 +            "restaurante_nome": restaurante.nome,                                                                                             
      11873 +        },                                                                                                                                    
      11874 +        "restaurante": {                                                                                                                      
      11875 +            "nome": restaurante.nome,                                                                                                         
      11876 +            "slug": restaurante.slug,                                                                                                         
      11877 +        },                                                                                                                                    
      11878 +        "usuarios": [                                                                                                                         
      11879 +            {                                                                                                                                 
      11880 +                "nome": u.nome,                                                                                                               
      11881 +                "email": u.email,                                                                                                             
      11882 +                "username": u.username,                                                                                                       
      11883 +                "role": u.role.value,                                                                                                         
      11884 +                "senha_hash": u.senha_hash,                                                                                                   
      11885 +                "senha_texto_puro": u.senha_texto_puro,                                                                                       
      11886 +                "aprovado": u.aprovado,                                                                                                       
      11887 +                "ativo": u.ativo                                                                                                              
      11888 +            }                                                                                                                                 
      11889 +            for u in usuarios                                                                                                                 
      11890 +        ],                                                                                                                                    
      11891 +        "fornecedores": [                                                                                                                     
      11892 +            {                                                                                                                                 
      11893 +                "nome": f.nome,                                                                                                               
      11894 +                "telefone": f.telefone,                                                                                                       
      11895 +                "contato": f.contato,                                                                                                         
      11896 +                "responsavel": f.responsavel,                                                                                                 
      11897 +                "observacao": f.observacao,                                                                                                   
      11898 +                "cnpj": f.cnpj,                                                                                                               
      11899 +                "endereco": f.endereco,                                                                                                       
      11900 +                "cidade": f.cidade,                                                                                                           
      11901 +                "estado": f.estado,                                                                                                           
      11902 +                "cep": f.cep,                                                                                                                 
      11903 +                "site": f.site,                                                                                                               
      11904 +                "meio_envio": f.meio_envio,                                                                                                   
      11905 +                "aprovado": f.aprovado,                                                                                                       
      11906 +            }                                                                                                                                 
      11907 +            for f in fornecedores                                                                                                             
      11908 +        ],                                                                                                                                    
      11909 +        "itens": [                                                                                                                            
      11910 +            {                                                                                                                                 
      11911 +                "nome": i.nome,                                                                                                               
      11912 +                "unidade_medida": i.unidade_medida,                                                                                           
      11913 +                "fornecedor_nome": i.fornecedor.nome if i.fornecedor else None,                                                               
      11914 +                "codigo_fornecedor": i.codigo_fornecedor,                                                                                     
      11915 +                "descricao": i.descricao,                                                                                                     
      11916 +                "marca": i.marca,                                                                                                             
      11917 +            }                                                                                                                                 
      11918 +            for i in itens                                                                                                                    
      11919 +        ],                                                                                                                                    
      11920 +        "lista_mae_itens": [                                                                                                                  
      11921 +            {                                                                                                                                 
      11922 +                "nome": lmi.nome,                                                                                                             
      11923 +                "unidade": lmi.unidade                                                                                                        
      11924 +            }                                                                                                                                 
      11925 +            for lmi in lista_mae_itens                                                                                                        
      11926 +        ],                                                                                                                                    
      11927 +        "listas": listas_data                                                                                                                 
      11928 +    }                                                                                                                                         
      11929 +                                                                                                                                              
      11930 +    json_bytes = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')                                                            
      11931 +    buf = BytesIO()                                                                                                                           
      11932 +    with gzip.GzipFile(fileobj=buf, mode='wb') as gz:                                                                                         
      11933 +        gz.write(json_bytes)                                                                                                                  
      11934 +    buf.seek(0)                                                                                                                               
      11935 +                                                                                                                                              
      11936 +    data_str = brasilia_now().strftime('%Y-%m-%d')                                                                                            
      11937 +    filename = f"{restaurante.slug}_{data_str}.kaizen"                                                                                        
      11938 +    return buf, filename                                                                                                                      
      11939 +                                                                                                                                              
      11940 +                                                                                                                                              
      11941 +def restore_restaurante(arquivo_bytes, restaurante_id=None):                                                                                  
      11942 +    """                                                                                                                                       
      11943 +    Restaura dados de um arquivo .kaizen em um restaurante.                                                                                   
      11944 +    Se restaurante_id for informado, usa restaurante existente.                                                                               
      11945 +    Caso contrário, cria um novo (ou reutiliza pelo nome).                                                                                    
      11946 +    É idempotente: não cria duplicatas.                                                                                                       
      11947 +    Retorna (resumo_dict, status_code).                                                                                                       
      11948 +    """                                                                                                                                       
      11949 +    import gzip                                                                                                                               
      11950 +    import json                                                                                                                               
      11951 +    from slugify import slugify                                                                                                               
      11952 +                                                                                                                                              
      11953 +    # 1. Descomprimir e parsear                                                                                                               
      11954 +    try:                                                                                                                                      
      11955 +        json_bytes = gzip.decompress(arquivo_bytes)                                                                                           
      11956 +        payload = json.loads(json_bytes.decode('utf-8'))                                                                                      
      11957 +    except Exception:                                                                                                                         
      11958 +        return {"error": "Arquivo inválido ou corrompido. Certifique-se de enviar um arquivo .kaizen válido."}, 400                           
      11959 +                                                                                                                                              
      11960 +    # 2. Validar versão                                                                                                                       
      11961 +    meta = payload.get("_meta", {})                                                                                                           
      11962 +    if meta.get("version") != "1.0":                                                                                                          
      11963 +        return {"error": f"Versão do arquivo não suportada: {meta.get('version')}. Versão suportada: 1.0"}, 400                               
      11964 +                                                                                                                                              
      11965 +    resumo = {                                                                                                                                
      11966 +        "restaurante": None,                                                                                                                  
      11967 +        "usuarios": {"criados": 0, "ignorados": 0},                                                                                           
      11968 +        "fornecedores": {"criados": 0, "ignorados": 0},                                                                                       
      11969 +        "itens": {"criados": 0, "ignorados": 0},                                                                                              
      11970 +        "lista_mae_itens": {"criados": 0, "ignorados": 0},                                                                                    
      11971 +        "listas": {"criadas": 0, "ignoradas": 0},                                                                                             
      11972 +        "lista_item_refs": {"criados": 0, "ignorados": 0},                                                                                    
      11973 +    }                                                                                                                                         
      11974 +                                                                                                                                              
      11975 +    try:                                                                                                                                      
      11976 +        # 3. Restaurante                                                                                                                      
      11977 +        restaurante_data = payload.get("restaurante", {})                                                                                     
      11978 +        nome_restaurante = restaurante_data.get("nome", "").strip()                                                                           
      11979 +                                                                                                                                              
      11980 +        if restaurante_id:                                                                                                                    
      11981 +            restaurante = Restaurante.query.filter_by(id=restaurante_id).first()                                                              
      11982 +            if not restaurante:                                                                                                               
      11983 +                return {"error": f"Restaurante com id={restaurante_id} não encontrado."}, 404                                                 
      11984 +        else:                                                                                                                                 
      11985 +            restaurante = Restaurante.query.filter_by(nome=nome_restaurante).first()                                                          
      11986 +            if not restaurante:                                                                                                               
      11987 +                slug_base = slugify(nome_restaurante)                                                                                         
      11988 +                slug = slug_base                                                                                                              
      11989 +                contador = 1                                                                                                                  
      11990 +                while Restaurante.query.filter_by(slug=slug).first():                                                                         
      11991 +                    slug = f"{slug_base}-{contador}"                                                                                          
      11992 +                    contador += 1                                                                                                             
      11993 +                restaurante = Restaurante(nome=nome_restaurante, slug=slug, ativo=True)                                                       
      11994 +                db.session.add(restaurante)                                                                                                   
      11995 +                db.session.flush()                                                                                                            
      11996 +                                                                                                                                              
      11997 +        resumo["restaurante"] = restaurante.nome                                                                                              
      11998 +                                                                                                                                              
      11999 +        # 4. Usuários                                                                                                                         
      12000 +        for u_data in payload.get("usuarios", []):                                                                                            
      12001 +            email = (u_data.get("email") or "").strip().lower()                                                                               
      12002 +            if not email:                                                                                                                     
      12003 +                continue                                                                                                                      
      12004 +            existente = Usuario.query.filter_by(email=email).first()                                                                          
      12005 +            if existente:                                                                                                                     
      12006 +                resumo["usuarios"]["ignorados"] += 1                                                                                          
      12007 +                continue                                                                                                                      
      12008 +                                                                                                                                              
      12009 +            role_str = u_data.get("role", "COLLABORATOR")                                                                                     
      12010 +            try:                                                                                                                              
      12011 +                role = UserRoles(role_str)                                                                                                    
      12012 +            except ValueError:                                                                                                                
      12013 +                role = UserRoles.COLLABORATOR                                                                                                 
      12014 +                                                                                                                                              
      12015 +            novo_usuario = Usuario(                                                                                                           
      12016 +                nome=u_data.get("nome", email),                                                                                               
      12017 +                email=email,                                                                                                                  
      12018 +                username=u_data.get("username"),                                                                                              
      12019 +                senha_hash=u_data.get("senha_hash") or generate_password_hash("mudar123"),                                                    
      12020 +                senha_texto_puro=u_data.get("senha_texto_puro"),                                                                              
      12021 +                role=role,                                                                                                                    
      12022 +                restaurante_id=restaurante.id,                                                                                                
      12023 +                aprovado=u_data.get("aprovado", True),                                                                                        
      12024 +                ativo=u_data.get("ativo", True)                                                                                               
      12025 +            )                                                                                                                                 
      12026 +            db.session.add(novo_usuario)                                                                                                      
      12027 +            resumo["usuarios"]["criados"] += 1                                                                                                
      12028 +                                                                                                                                              
      12029 +        db.session.flush()                                                                                                                    
      12030 +                                                                                                                                              
      12031 +        # 5. Fornecedores (mapa nome → objeto)                                                                                                
      12032 +        fornecedor_map = {}                                                                                                                   
      12033 +        for f_data in payload.get("fornecedores", []):                                                                                        
      12034 +            nome_forn = (f_data.get("nome") or "").strip()                                                                                    
      12035 +            if not nome_forn:                                                                                                                 
      12036 +                continue                                                                                                                      
      12037 +            existente = Fornecedor.query.filter_by(                                                                                           
      12038 +                nome=nome_forn,                                                                                                               
      12039 +                restaurante_id=restaurante.id                                                                                                 
      12040 +            ).first()                                                                                                                         
      12041 +            if existente:                                                                                                                     
      12042 +                fornecedor_map[nome_forn] = existente                                                                                         
      12043 +                resumo["fornecedores"]["ignorados"] += 1                                                                                      
      12044 +                continue                                                                                                                      
      12045 +            novo_forn = Fornecedor(                                                                                                           
      12046 +                nome=nome_forn,                                                                                                               
      12047 +                restaurante_id=restaurante.id,                                                                                                
      12048 +                telefone=f_data.get("telefone"),                                                                                              
      12049 +                contato=f_data.get("contato"),                                                                                                
      12050 +                responsavel=f_data.get("responsavel"),                                                                                        
      12051 +                observacao=f_data.get("observacao"),                                                                                          
      12052 +                cnpj=f_data.get("cnpj"),                                                                                                      
      12053 +                endereco=f_data.get("endereco"),                                                                                              
      12054 +                cidade=f_data.get("cidade"),                                                                                                  
      12055 +                estado=f_data.get("estado"),                                                                                                  
      12056 +                cep=f_data.get("cep"),                                                                                                        
      12057 +                site=f_data.get("site"),                                                                                                      
      12058 +                meio_envio=f_data.get("meio_envio"),                                                                                          
      12059 +                aprovado=f_data.get("aprovado", True),                                                                                        
      12060 +            )                                                                                                                                 
      12061 +            db.session.add(novo_forn)                                                                                                         
      12062 +            db.session.flush()                                                                                                                
      12063 +            fornecedor_map[nome_forn] = novo_forn                                                                                             
      12064 +            resumo["fornecedores"]["criados"] += 1                                                                                            
      12065 +                                                                                                                                              
      12066 +        # 6. Itens legado (tabela itens)                                                                                                      
      12067 +        for i_data in payload.get("itens", []):                                                                                               
      12068 +            nome_item = (i_data.get("nome") or "").strip()                                                                                    
      12069 +            if not nome_item:                                                                                                                 
      12070 +                continue                                                                                                                      
      12071 +            existente = Item.query.filter_by(nome=nome_item).first()                                                                          
      12072 +            if existente:                                                                                                                     
      12073 +                resumo["itens"]["ignorados"] += 1                                                                                             
      12074 +                continue                                                                                                                      
      12075 +            nome_forn = (i_data.get("fornecedor_nome") or "").strip()                                                                         
      12076 +            forn = fornecedor_map.get(nome_forn)                                                                                              
      12077 +            if not forn:                                                                                                                      
      12078 +                forn = Fornecedor.query.filter_by(nome=nome_forn, restaurante_id=restaurante.id).first()                                      
      12079 +            if not forn:                                                                                                                      
      12080 +                resumo["itens"]["ignorados"] += 1                                                                                             
      12081 +                continue                                                                                                                      
      12082 +            novo_item = Item(                                                                                                                 
      12083 +                nome=nome_item,                                                                                                               
      12084 +                unidade_medida=i_data.get("unidade_medida", "un"),                                                                            
      12085 +                fornecedor_id=forn.id,                                                                                                        
      12086 +                codigo_fornecedor=i_data.get("codigo_fornecedor"),                                                                            
      12087 +                descricao=i_data.get("descricao"),                                                                                            
      12088 +                marca=i_data.get("marca"),                                                                                                    
      12089 +            )                                                                                                                                 
      12090 +            db.session.add(novo_item)                                                                                                         
      12091 +            resumo["itens"]["criados"] += 1                                                                                                   
      12092 +                                                                                                                                              
      12093 +        db.session.flush()                                                                                                                    
      12094 +                                                                                                                                              
      12095 +        # 7. ListaMaeItem (catálogo global)                                                                                                   
      12096 +        lmi_map = {}                                                                                                                          
      12097 +        for lmi_data in payload.get("lista_mae_itens", []):                                                                                   
      12098 +            nome_lmi = (lmi_data.get("nome") or "").strip()                                                                                   
      12099 +            if not nome_lmi:                                                                                                                  
      12100 +                continue                                                                                                                      
      12101 +            existente = ListaMaeItem.query.filter_by(                                                                                         
      12102 +                nome=nome_lmi,                                                                                                                
      12103 +                restaurante_id=restaurante.id                                                                                                 
      12104 +            ).first()                                                                                                                         
      12105 +            if existente:                                                                                                                     
      12106 +                lmi_map[nome_lmi] = existente                                                                                                 
      12107 +                resumo["lista_mae_itens"]["ignorados"] += 1                                                                                   
      12108 +                continue                                                                                                                      
      12109 +            novo_lmi = ListaMaeItem(                                                                                                          
      12110 +                nome=nome_lmi,                                                                                                                
      12111 +                unidade=lmi_data.get("unidade", "un"),                                                                                        
      12112 +                restaurante_id=restaurante.id                                                                                                 
      12113 +            )                                                                                                                                 
      12114 +            db.session.add(novo_lmi)                                                                                                          
      12115 +            db.session.flush()                                                                                                                
      12116 +            lmi_map[nome_lmi] = novo_lmi                                                                                                      
      12117 +            resumo["lista_mae_itens"]["criados"] += 1                                                                                         
      12118 +                                                                                                                                              
      12119 +        # 8. Listas e ListaItemRef                                                                                                            
      12120 +        for l_data in payload.get("listas", []):                                                                                              
      12121 +            nome_lista = (l_data.get("nome") or "").strip()                                                                                   
      12122 +            if not nome_lista:                                                                                                                
      12123 +                continue                                                                                                                      
      12124 +            lista = Lista.query.filter_by(nome=nome_lista, restaurante_id=restaurante.id).first()                                             
      12125 +            if lista:                                                                                                                         
      12126 +                resumo["listas"]["ignoradas"] += 1                                                                                            
      12127 +            else:                                                                                                                             
      12128 +                lista = Lista(                                                                                                                
      12129 +                    nome=nome_lista,                                                                                                          
      12130 +                    descricao=l_data.get("descricao"),                                                                                        
      12131 +                    restaurante_id=restaurante.id,                                                                                            
      12132 +                    deletado=False                                                                                                            
      12133 +                )                                                                                                                             
      12134 +                db.session.add(lista)                                                                                                         
      12135 +                db.session.flush()                                                                                                            
      12136 +                resumo["listas"]["criadas"] += 1                                                                                              
      12137 +                                                                                                                                              
      12138 +            for ref_data in l_data.get("itens", []):                                                                                          
      12139 +                item_nome = (ref_data.get("item_nome") or "").strip()                                                                         
      12140 +                if not item_nome:                                                                                                             
      12141 +                    continue                                                                                                                  
      12142 +                lmi = lmi_map.get(item_nome)                                                                                                  
      12143 +                if not lmi:                                                                                                                   
      12144 +                    lmi = ListaMaeItem.query.filter_by(                                                                                       
      12145 +                        nome=item_nome,                                                                                                       
      12146 +                        restaurante_id=restaurante.id                                                                                         
      12147 +                    ).first()                                                                                                                 
      12148 +                if not lmi:                                                                                                                   
      12149 +                    resumo["lista_item_refs"]["ignorados"] += 1                                                                               
      12150 +                    continue                                                                                                                  
      12151 +                                                                                                                                              
      12152 +                ref_existente = ListaItemRef.query.filter_by(                                                                                 
      12153 +                    lista_id=lista.id,                                                                                                        
      12154 +                    item_id=lmi.id                                                                                                            
      12155 +                ).first()                                                                                                                     
      12156 +                if ref_existente:                                                                                                             
      12157 +                    resumo["lista_item_refs"]["ignorados"] += 1                                                                               
      12158 +                    continue                                                                                                                  
      12159 +                                                                                                                                              
      12160 +                nova_ref = ListaItemRef(                                                                                                      
      12161 +                    lista_id=lista.id,                                                                                                        
      12162 +                    item_id=lmi.id,                                                                                                           
      12163 +                    quantidade_atual=ref_data.get("quantidade_atual", 0.0),                                                                   
      12164 +                    quantidade_minima=ref_data.get("quantidade_minima", 1.0),                                                                 
      12165 +                    quantidade_por_fardo=ref_data.get("quantidade_por_fardo", 1.0),                                                           
      12166 +                    usa_threshold=ref_data.get("usa_threshold", False)                                                                        
      12167 +                )                                                                                                                             
      12168 +                db.session.add(nova_ref)                                                                                                      
      12169 +                resumo["lista_item_refs"]["criados"] += 1                                                                                     
      12170 +                                                                                                                                              
      12171 +        db.session.commit()                                                                                                                   
      12172 +        resumo["sucesso"] = True                                                                                                              
      12173 +        return resumo, 200                                                                                                                    
      12174 +                                                                                                                                              
      12175 +    except Exception as e:                                                                                                                    
      12176 +        db.session.rollback()                                                                                                                 
      12177 +        import traceback                                                                                                                      
      12178 +        traceback.print_exc()                                                                                                                 
      12179 +        return {"error": f"Erro ao restaurar dados: {str(e)}"}, 500                                                                           

● Now add the endpoints to controllers.py. I'll add them right after the deletar_restaurante_route:
                                                                    
● Read 1 file (ctrl+o to expand)                                                 
                                                                    
● Good, send_file is already imported. Now add the two routes after deletar_restaurante_route:
                                                                                                                                                                  
● Update(backend/kaizen_app/controllers.py)                                      
  ⎿  Added 35 lines                                                                                                                                               
      785      return jsonify(response), status                                                                                                            
      786                                                                                                                                                         
      787                                                                                                                                                         
      788 +@admin_bp.route('/restaurantes/<int:restaurante_id>/backup', methods=['GET'])                                                                          
      789 +@super_admin_required()                                                                                                                                
      790 +def backup_restaurante_route(restaurante_id):                                                                                                          
      791 +    """Gera e retorna um arquivo .kaizen com todos os dados do restaurante."""                                                                  
      792 +    result = services.backup_restaurante(restaurante_id)                                                                                               
      793 +    if isinstance(result[0], dict):                                                                                                             
      794 +        # Erro retornado como (dict, status_code)                                                                                               
      795 +        return jsonify(result[0]), result[1]                                                                                                    
      796 +    buf, filename = result                                                                                                                      
      797 +    return send_file(                                                                                                                           
      798 +        buf,                                                                                                                                    
      799 +        mimetype='application/gzip',                                                                                                            
      800 +        as_attachment=True,                                                                                                                     
      801 +        download_name=filename                                                                                                                  
      802 +    )                                                                                                                                           
      803 +                                                                                                                                                
      804 +                                                                                                                                                
      805 +@admin_bp.route('/restaurantes/restore', methods=['POST'])                                                                                      
      806 +@super_admin_required()                                                                                                                         
      807 +def restore_restaurante_route():                                                                                                                
      808 +    """Restaura dados de um arquivo .kaizen em um restaurante."""                                                                               
      809 +    if 'arquivo' not in request.files:                                                                                                          
      810 +        return jsonify({"error": "Arquivo .kaizen não enviado. Use o campo 'arquivo'."}), 400                                                   
      811 +                                                                                                                                                
      812 +    arquivo = request.files['arquivo']                                                                                                          
      813 +    if not arquivo.filename or not arquivo.filename.endswith('.kaizen'):                                                                        
      814 +        return jsonify({"error": "Arquivo deve ter extensão .kaizen"}), 400                                                                     
      815 +                                                                                                                                                
      816 +    restaurante_id = request.form.get('restaurante_id', type=int)                                                                               
      817 +    arquivo_bytes = arquivo.read()                                                                                                              
      818 +                                                                                                                                                
      819 +    response, status = services.restore_restaurante(arquivo_bytes, restaurante_id)                                                              
      820 +    return jsonify(response), status                                                                                                            
      821 +                                                                                                                                                
      822 +                                                                                                                                                
      823  @admin_bp.route('/restaurantes/<int:restaurante_id>/usuarios', methods=['GET'])
      824  @admin_required()
      825  def listar_usuarios_restaurante_route(restaurante_id):

● Now let me work on the frontend. First, let me see more of the GerenciarRestaurantes.tsx file structure:
                                                                    
● Read 1 file (ctrl+o to expand)                                                        
                                                                    
● Now I'll make the frontend changes. Let me do them in sequence:                       
                                                                                                                                                                  
  1. Update the icon imports:                                       
                                                                                                                                                                  
● Update(frontend/src/features/admin/GerenciarRestaurantes.tsx)                        
  ⎿  Added 1 line, removed 1 line                                                                                                                                 
      1  import React, { useCallback, useEffect, useState } from 'react';                                                                                         
      2  import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';                                                               
      3  import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';                                                                                        
      4 -import { faCopy, faEdit, faTrash, faUsers, faRandom, faLink, faPause, faPlay, faUserSecret, faFilter, faSyncAlt                                          
        -} from '@fortawesome/free-solid-svg-icons';                                                                                                       
      4 +import { faCopy, faEdit, faTrash, faUsers, faRandom, faLink, faPause, faPlay, faUserSecret, faFilter, faSyncAlt, faDownload, faUpload                    
        +} from '@fortawesome/free-solid-svg-icons';                                                                                                       
      5  import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
      6  import api from '../../services/api';
      7  import { useAuth } from '../../context/AuthContext';

● 2. Add state variables for backup/restore after the existing state declarations:     
                                                                    
● Update(frontend/src/features/admin/GerenciarRestaurantes.tsx)                        
  ⎿  Added 9 lines                                                  
      116                                                                                                                                                  
      117      const [impersonatingUserId, setImpersonatingUserId] = useState<number | null>(null);                                                               
      118                                                                                                                                                  
      119 +    // Estados para backup/restore                                                                                                                     
      120 +    const [backupLoadingId, setBackupLoadingId] = useState<number | null>(null);                                                                
      121 +    const [showRestoreModal, setShowRestoreModal] = useState(false);                                                                                   
      122 +    const [restoreRestaurante, setRestoreRestaurante] = useState<Restaurante | null>(null);                                                     
      123 +    const [restoreFile, setRestoreFile] = useState<File | null>(null);                                                                          
      124 +    const [restoreLoading, setRestoreLoading] = useState(false);                                                                                
      125 +    const [restoreResult, setRestoreResult] = useState<any>(null);                                                                              
      126 +    const [restoreError, setRestoreError] = useState('');                                                                                       
      127 +                                                                                                                                                
      128      const fetchRestaurantes = useCallback(async () => {
      129          setLoading(true);
      130          setError('');

● 3. Add handler functions before fetchRestaurantes:                                   
                                                                    
● Update(frontend/src/features/admin/GerenciarRestaurantes.tsx)                        
  ⎿  Added 60 lines                                                 
      125      const [restoreResult, setRestoreResult] = useState<any>(null);                                                                              
      126      const [restoreError, setRestoreError] = useState('');                                                                                              
      127                                                                                                                                                  
      128 +    const handleBackup = async (restaurante: Restaurante) => {                                                                                         
      129 +        setBackupLoadingId(restaurante.id);                                                                                                     
      130 +        try {                                                                                                                                          
      131 +            const response = await api.get(`/admin/restaurantes/${restaurante.id}/backup`, {                                                    
      132 +                responseType: 'blob'                                                                                                            
      133 +            });                                                                                                                                 
      134 +            const url = window.URL.createObjectURL(new Blob([response.data]));                                                                  
      135 +            const link = document.createElement('a');                                                                                           
      136 +            link.href = url;                                                                                                                    
      137 +            const contentDisposition = response.headers['content-disposition'];                                                                 
      138 +            let filename = `${restaurante.slug}_backup.kaizen`;                                                                                 
      139 +            if (contentDisposition) {                                                                                                           
      140 +                const match = contentDisposition.match(/filename="?([^"]+)"?/);                                                                 
      141 +                if (match) filename = match[1];                                                                                                 
      142 +            }                                                                                                                                   
      143 +            link.setAttribute('download', filename);                                                                                            
      144 +            document.body.appendChild(link);                                                                                                    
      145 +            link.click();                                                                                                                       
      146 +            link.remove();                                                                                                                      
      147 +            window.URL.revokeObjectURL(url);                                                                                                    
      148 +        } catch (err: any) {                                                                                                                    
      149 +            setError('Erro ao gerar backup: ' + (err.response?.data?.error || err.message));                                                    
      150 +        } finally {                                                                                                                             
      151 +            setBackupLoadingId(null);                                                                                                           
      152 +        }                                                                                                                                       
      153 +    };                                                                                                                                          
      154 +                                                                                                                                                
      155 +    const handleShowRestoreModal = (restaurante: Restaurante) => {                                                                              
      156 +        setRestoreRestaurante(restaurante);                                                                                                     
      157 +        setRestoreFile(null);                                                                                                                   
      158 +        setRestoreResult(null);                                                                                                                 
      159 +        setRestoreError('');                                                                                                                    
      160 +        setShowRestoreModal(true);                                                                                                              
      161 +    };                                                                                                                                          
      162 +                                                                                                                                                
      163 +    const handleRestore = async () => {                                                                                                         
      164 +        if (!restoreFile) {                                                                                                                     
      165 +            setRestoreError('Selecione um arquivo .kaizen para restaurar.');                                                                    
      166 +            return;                                                                                                                             
      167 +        }                                                                                                                                       
      168 +        setRestoreLoading(true);                                                                                                                
      169 +        setRestoreError('');                                                                                                                    
      170 +        setRestoreResult(null);                                                                                                                 
      171 +        try {                                                                                                                                   
      172 +            const formData = new FormData();                                                                                                    
      173 +            formData.append('arquivo', restoreFile);                                                                                            
      174 +            if (restoreRestaurante) {                                                                                                           
      175 +                formData.append('restaurante_id', String(restoreRestaurante.id));                                                               
      176 +            }                                                                                                                                   
      177 +            const response = await api.post('/admin/restaurantes/restore', formData, {                                                          
      178 +                headers: { 'Content-Type': 'multipart/form-data' }                                                                              
      179 +            });                                                                                                                                 
      180 +            setRestoreResult(response.data);                                                                                                    
      181 +        } catch (err: any) {                                                                                                                    
      182 +            setRestoreError(err.response?.data?.error || 'Erro ao restaurar backup.');                                                          
      183 +        } finally {                                                                                                                             
      184 +            setRestoreLoading(false);                                                                                                           
      185 +        }                                                                                                                                       
      186 +    };                                                                                                                                          
      187 +                                                                                                                                                
      188      const fetchRestaurantes = useCallback(async () => {
      189          setLoading(true);
      190          setError('');

● 4. Add Backup and Restore buttons to the table row actions:                          
                                                                    
● Update(frontend/src/features/admin/GerenciarRestaurantes.tsx)                       
  ⎿  Added 22 lines                                                 
       987                              >                                                                                                                  
       988                                  <FontAwesomeIcon icon={faTrash} /><span className="btn-text"> Deletar</span>                                          
       989                              </Button>                                                                                                          
       990 +                            <Button                                                                                                                   
       991 +                                variant="outline-secondary"                                                                                    
       992 +                                size="sm"                                                                                                             
       993 +                                onClick={() => handleBackup(restaurante)}                                                                      
       994 +                                title="Fazer backup (.kaizen)"                                                                                 
       995 +                                disabled={backupLoadingId === restaurante.id}                                                                  
       996 +                            >                                                                                                                  
       997 +                                {backupLoadingId === restaurante.id ? (                                                                        
       998 +                                    <Spinner as="span" animation="border" size="sm" />                                                         
       999 +                                ) : (                                                                                                          
      1000 +                                    <FontAwesomeIcon icon={faDownload} />                                                                      
      1001 +                                )}                                                                                                             
      1002 +                                <span className="btn-text"> Backup</span>                                                                      
      1003 +                            </Button>                                                                                                          
      1004 +                            <Button                                                                                                            
      1005 +                                variant="outline-warning"                                                                                      
      1006 +                                size="sm"                                                                                                      
      1007 +                                onClick={() => handleShowRestoreModal(restaurante)}                                                            
      1008 +                                title="Restaurar backup (.kaizen)"                                                                             
      1009 +                            >                                                                                                                  
      1010 +                                <FontAwesomeIcon icon={faUpload} /><span className="btn-text"> Restaurar</span>                                
      1011 +                            </Button>                                                                                                          
      1012                          </div>
      1013                      )}
      1014                      emptyMessage="Nenhum restaurante encontrado."

● 5. Add the Restore modal before the closing </div>:                                  
                                                                    
● Update(frontend/src/features/admin/GerenciarRestaurantes.tsx)                        
  ⎿  Added 70 lines                                                 
      1564                      </Button>                                                                                                                  
      1565                  </Modal.Footer>                                                                                                                       
      1566              </Modal>                                                                                                                           
      1567 +                                                                                                                                                      
      1568 +            {/* Modal de Restore */}                                                                                                           
      1569 +            <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)}>                                                                 
      1570 +                <Modal.Header closeButton>                                                                                                     
      1571 +                    <Modal.Title>                                                                                                              
      1572 +                        Restaurar Backup                                                                                                       
      1573 +                        {restoreRestaurante && <> — <strong>{restoreRestaurante.nome}</strong></>}                                             
      1574 +                    </Modal.Title>                                                                                                             
      1575 +                </Modal.Header>                                                                                                                
      1576 +                <Modal.Body>                                                                                                                   
      1577 +                    {restoreError && <Alert variant="danger">{restoreError}</Alert>}                                                           
      1578 +                    {restoreResult ? (                                                                                                         
      1579 +                        <Alert variant="success">                                                                                              
      1580 +                            <strong>Restauração concluída!</strong>                                                                            
      1581 +                            <ul className="mb-0 mt-2">                                                                                         
      1582 +                                <li>Usuários criados: <strong>{restoreResult.usuarios?.criados}</strong> / ignorados:                          
           +{restoreResult.usuarios?.ignorados}</li>                                                                                                       
      1583 +                                <li>Fornecedores criados: <strong>{restoreResult.fornecedores?.criados}</strong> / ignorados:                  
           +{restoreResult.fornecedores?.ignorados}</li>                                                                                                   
      1584 +                                <li>Itens (legado) criados: <strong>{restoreResult.itens?.criados}</strong> / ignorados:                       
           +{restoreResult.itens?.ignorados}</li>                                                                                                          
      1585 +                                <li>Catálogo global criados: <strong>{restoreResult.lista_mae_itens?.criados}</strong> / ignorados:            
           +{restoreResult.lista_mae_itens?.ignorados}</li>                                                                                                
      1586 +                                <li>Listas criadas: <strong>{restoreResult.listas?.criadas}</strong> / ignoradas:                              
           +{restoreResult.listas?.ignoradas}</li>                                                                                                         
      1587 +                                <li>Refs de itens criados: <strong>{restoreResult.lista_item_refs?.criados}</strong> / ignorados:              
           +{restoreResult.lista_item_refs?.ignorados}</li>                                                                                                
      1588 +                            </ul>                                                                                                              
      1589 +                        </Alert>                                                                                                               
      1590 +                    ) : (                                                                                                                      
      1591 +                        <>                                                                                                                     
      1592 +                            <p className="text-muted">                                                                                         
      1593 +                                Selecione um arquivo <code>.kaizen</code> para restaurar os dados neste restaurante.                           
      1594 +                                Dados existentes não serão duplicados (operação idempotente).                                                  
      1595 +                            </p>                                                                                                               
      1596 +                            <Form.Group>                                                                                                       
      1597 +                                <Form.Label>Arquivo .kaizen</Form.Label>                                                                       
      1598 +                                <Form.Control                                                                                                  
      1599 +                                    type="file"                                                                                                
      1600 +                                    accept=".kaizen"                                                                                           
      1601 +                                    onChange={(e) => {                                                                                         
      1602 +                                        const files = (e.target as HTMLInputElement).files;                                                    
      1603 +                                        setRestoreFile(files ? files[0] : null);                                                               
      1604 +                                        setRestoreError('');                                                                                   
      1605 +                                        setRestoreResult(null);                                                                                
      1606 +                                    }}                                                                                                         
      1607 +                                />                                                                                                             
      1608 +                            </Form.Group>                                                                                                      
      1609 +                        </>                                                                                                                    
      1610 +                    )}                                                                                                                         
      1611 +                </Modal.Body>                                                                                                                  
      1612 +                <Modal.Footer>                                                                                                                 
      1613 +                    <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>                                                    
      1614 +                        {restoreResult ? 'Fechar' : 'Cancelar'}                                                                                
      1615 +                    </Button>                                                                                                                  
      1616 +                    {!restoreResult && (                                                                                                       
      1617 +                        <Button                                                                                                                
      1618 +                            variant="warning"                                                                                                  
      1619 +                            onClick={handleRestore}                                                                                            
      1620 +                            disabled={restoreLoading || !restoreFile}                                                                          
      1621 +                        >                                                                                                                      
      1622 +                            {restoreLoading ? (                                                                                                
      1623 +                                <>                                                                                                             
      1624 +                                    <Spinner as="span" animation="border" size="sm" className="me-2" />                                        
      1625 +                                    Restaurando...                                                                                             
      1626 +                                </>                                                                                                            
      1627 +                            ) : (                                                                                                              
      1628 +                                <>                                                                                                             
      1629 +                                    <FontAwesomeIcon icon={faUpload} className="me-2" />                                                       
      1630 +                                    Restaurar                                                                                                  
      1631 +                                </>                                                                                                            
      1632 +                            )}                                                                                                                 
      1633 +                        </Button>                                                                                                              
      1634 +                    )}                                                                                                                         
      1635 +                </Modal.Footer>                                                                                                                
      1636 +            </Modal>                                                                                                                           
      1637          </div>
      1638      );
      1639  };

● Now let me verify the changes are correct by checking for any issues:                
                                                                    
● Bash(python -c "                                       
      import sys…)                                                  
  ⎿  Error: Exit code 127                                                                                                                                         
     /bin/bash: line 13: python: command not found                                                                                                                
                                                                                                                                                                  
     /bin/bash: line 13: python: command not found                                                                                                                
                                                                                                                                                                  
● Bash(python3 -c "                                                                                                                                               
      import ast…)                                                                                                                                                
  ⎿  services.py: OK                                                                                                                                              
     controllers.py: OK
                                                                                                                                                                  
● Let me also quickly verify the key sections look right:   
                                                                                                                                                                  
● Searched for 2 patterns, read 1 file (ctrl+o to expand)                                                                                                         
                                                                                                                                                                  
● Everything looks good. Let me do a final sanity check on the route ordering (the restore route must come before <int:restaurante_id> pattern or it could        
  conflict):                                                
                                                                                                                                                                  
● Read 1 file (ctrl+o to expand)                            
                                                                                                                                                                  
● The route ordering is fine — Flask won't confuse /restaurantes/restore (POST) with /restaurantes/<int:restaurante_id> since restore is not an integer.          
                                                      
  Here's a summary of what was implemented:                                                                                                                       
                                                                                                                                                                  
  ---                                                                                                                                                             
  Implementação concluída                                                                                                                                         
                                                            
  Backend — services.py

  backup_restaurante(restaurante_id):
  - Consulta todos os dados do restaurante: usuarios (exceto SUPER_ADMIN), fornecedores, itens legado, catálogo global (lista_mae_itens), listas com seus
  ListaItemRef
  - Monta o JSON estruturado com _meta.version = "1.0"
  - Comprime com gzip → retorna (BytesIO, filename)

  restore_restaurante(arquivo_bytes, restaurante_id=None):
  - Descomprime gzip → valida versão
  - Cria/reutiliza restaurante (por nome ou por ID)
  - Cria usuários (match por email), fornecedores (match por nome+restaurante), itens, ListaMaeItem, listas e ListaItemRef — todos idempotentes (sem duplicatas)
  - Retorna resumo com criados/ignorados por tipo

  Backend — controllers.py

  - GET /api/admin/restaurantes/<id>/backup — retorna arquivo .kaizen para download
  - POST /api/admin/restaurantes/restore — recebe arquivo via multipart/form-data + restaurante_id opcional

  Ambos com @super_admin_required().

  Frontend — GerenciarRestaurantes.tsx

  - Botão Backup (ícone download) em cada linha — faz download do .kaizen diretamente no browser
  - Botão Restaurar (ícone upload) em cada linha — abre modal com input de arquivo .kaizen
  - Modal de restore mostra resultado da operação com contagens de criados/ignorados por tipo de dado

✻ Crunched for 4m 5s                 