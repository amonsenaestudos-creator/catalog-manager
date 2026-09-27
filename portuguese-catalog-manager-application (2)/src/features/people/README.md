# People

Domínio de fichas pessoais, cadastro, edição, favoritos, arquivo, lixeira e ações sobre pessoas.

## Fonte atual

A implementação histórica ainda está em `src/components/`, `src/context.tsx` e `src/store.ts`. Use `src/features/people/index.ts` como entrada pública para regras que já possuem facade.

## Não deve

- Renderizar a galeria inteira ou conhecer detalhes do armazenamento.
- Reimplementar ranking, score ou normalização dentro de componentes.
- Importar páginas.

A próxima fatia de refatoração é separar `PersonDrawer` em header, overview, gallery, evaluation, relations, timeline e actions, preservando a rota legada durante a migração.
