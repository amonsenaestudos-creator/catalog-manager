# Relationships

Domínio da rede entre fichas, vínculos familiares ou contextuais, pessoas relacionadas e explicações do tipo de relação.

## Entrada

- Pessoas e vínculos registrados no catálogo.
- Dados de idade, vínculo declarado e configurações necessárias para explicar a dinâmica.

## Não deve

- Inventar parentesco a partir de nomes.
- Renderizar o drawer ou controlar a navegação.
- Misturar heurísticas de relação com respostas de conversa.

As regras legadas estão em `src/lib/relacao.ts`; a facade `index.ts` é o contrato para novos consumidores.
