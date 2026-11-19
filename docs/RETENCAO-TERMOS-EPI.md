# Retenção de termos EPI

## Proposta para aprovação jurídica/administrativa

- Comprovante PDF e hashes: armazenamento privado substituível (`PRIVATE_DOCUMENT_STORAGE`); acesso somente pelo colaborador titular ou ADMIN/SUPER_ADMIN do mesmo tenant.
- Imutabilidade: arquivo criado com chave derivada do hash do documento; banco conserva snapshot, hashes e vínculo à entrega. Divergência de hash bloqueia download.
- Retenção: definir prazo e base legal antes de produção. Até aprovação, ambiente local descartável; não importar documentos reais.
- Descarte/exportação: implementar política aprovada com exportação auditada ao titular e exclusão coordenada de metadados/arquivo ao final do prazo, salvo guarda obrigatória.
- Revisão: termo é minuta, sujeito a revisão jurídica/administrativa. Aceite não autoriza desconto salarial automático; eventual cobrança exige avaliação humana/jurídica e condições aplicáveis.
