# Gallery

Domínio de fotos, vídeos anexados, álbuns, duplicatas, órfãs e visualização de mídia.

## Entrada

- `AppData` e filtros da galeria.
- `personId`, `photoId`, arquivos selecionados e metadados de mídia.

## Não deve

- Alterar avaliações ou relações.
- Abrir drawers de pessoa diretamente; devolva um `personId` para a camada de composição.
- Escrever no armazenamento dentro de componentes visuais.

A facade atual preserva as funções de `src/store.ts` enquanto `Gallery.tsx` é dividido em abas, grade, upload, seleção e visor.
