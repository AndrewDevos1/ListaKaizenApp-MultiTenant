# Roteiro visual RH #22

1. Abra `http://127.0.0.1:3086/login`; resultado: tela de login HTTP 200.
2. Entre como ADMIN: `admin@demo.com` / `admin123`; resultado: tenant **Restaurante Demo** e menu administrativo.
3. Em Ponto e escalas, selecione `colab1@demo.com`, crie escala com entrada `18:00`, saída `02:00`, dias desejados; resultado: escala aceita jornada que cruza meia-noite.
4. Entre como COLLABORATOR: `colab1@demo.com` / `admin123`; resultado: somente menu próprio, sem rotas administrativas.
5. Em Meu Ponto, valide Entrada, Pausa, Retorno, Saída; resultado: quatro batidas e jornada encerrada.
6. Batidas em horário real usam relógio do servidor (`new Date()`); o produto não oferece controle de relógio. Para validar 18:00→02:00, altere temporariamente o relógio do ambiente isolado entre as batidas ou valide os registros/API, nunca relógio de produção.
7. Em Espelho de Ponto, escolha o mês da jornada; resultado: espelho mensal lista as batidas e totais.
8. Como admin em Faltas e folgas, classifique data do colaborador como falta/folga; resultado: linha aparece na tabela.
9. Em Atestados, crie atestado; aprove, crie outro, rejeite, cancele um registro; resultado: cada situação persiste na coluna Situação.
10. Em Ponto e escalas, lance ajuste positivo/negativo com motivo; como colaborador abra Banco de Horas; resultado: lançamento e saldo visíveis.
11. Entre como ADMIN tenant B: `adminb@demo.com` / `admin123`; resultado: somente dados do **Restaurante Tenant B**, sem dados do tenant Demo.
12. Entre como COLLABORATOR tenant B: `colabb@demo.com` / `admin123`; resultado: RBAC colaborador e isolamento mantidos.
13. Em navegador móvel ou DevTools, ative tema escuro e percorra Ponto, Espelho, Banco; resultado: páginas responsivas e legíveis.
14. API local: `http://127.0.0.1:3085/api/v1`; credenciais acima são fictícias, senha de demonstração `admin123`.
