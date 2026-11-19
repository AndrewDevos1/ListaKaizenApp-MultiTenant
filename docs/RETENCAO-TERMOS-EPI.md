# Retenção de termos EPI

## Proposta para aprovação jurídica/administrativa

- Comprovante PDF e hashes: armazenamento privado substituível (`PRIVATE_DOCUMENT_STORAGE`); acesso somente pelo colaborador titular ou ADMIN/SUPER_ADMIN do mesmo tenant.
- Imutabilidade: arquivo criado com chave derivada do hash do documento; banco conserva snapshot, hashes e vínculo à entrega. Divergência de hash bloqueia download.
- Retenção: prazo, base legal e responsável devem ser definidos antes de produção. Não há prazo legal presumido neste projeto.
- Política técnica futura: configuração explícita aprovada poderá orientar exportação auditada e descarte coordenado de metadados/arquivo. Não existe job, purge ou exclusão automática nesta entrega.
- Revisão: termo é minuta, sujeito a revisão jurídica/administrativa. Aceite não autoriza desconto salarial automático; eventual cobrança exige avaliação humana/jurídica e condições aplicáveis.
