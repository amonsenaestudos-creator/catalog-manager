# Mapas mentais

Um plano solto para pensar: nós com texto, cor e nota, fios com rótulo entre eles,
e a opção de amarrar um nó a uma ficha do catálogo. Sai em PNG, em contorno
Markdown ou copiado para a área de transferência.

## Entrada

- `AppData.mapas` (opcional: fichas antigas não têm o campo e continuam abrindo).
- `Person[]` só para resolver os nós vinculados e para o **Mapa das relações**,
  que lê `person.vinculos` nos dois sentidos.
- Para exportar: o mapa. O resto (tamanho do palco, cores, margens) é interno.

## Não deve

- Alterar fichas, notas, fotos ou avaliações. O nó guarda no máximo um `personId`;
  quem abre a ficha é a camada de composição (`ctx.openPerson`).
- Escrever no armazenamento dentro dos componentes visuais: tudo passa pelo
  `commit` do contexto, que é o que faz o `Ctrl+Z` do aplicativo desfazer um nó
  criado, um arrasto, uma ligação ou o mapa apagado inteiro.
- Devolver um mapa novo quando nada mudou (veja a regra 1).

## Os arquivos

| Arquivo | O que é |
| --- | --- |
| `mapa.ts` | O domínio, puro: criar, acrescentar, ligar, rotular, mover, editar, remover, organizar, medir, resumir, virar texto. Não conhece React, canvas nem navegador. |
| `tela.ts` | O desenho que vira PNG: cabeçalho com título e contagem, fios em curva, caixas com a barra da cor e o texto quebrado por largura medida. |
| `components/TelaDoMapa.tsx` | O plano: pan, zoom, arrasto de nó, dois cliques para criar e para renomear, × no meio do fio. |
| `components/PainelDoMapa.tsx` | O inspetor: texto, nota, cor, ficha vinculada, vizinhos, novo ramo, armar ligação, remover. |
| `components/MapasMentais.tsx` | A página: lista com miniatura, topo com nome e exportações, e os dois modais (mapa novo, mapa das relações). |
| `index.ts` | A fachada. Quem quer a página importa `MapasMentais`; quem quer conta importa as funções. |

## As quatro decisões que explicam o resto

1. **Sem mudança, sem passo de histórico.** Toda função devolve um mapa novo —
   ou **o mesmo objeto** quando não haveria o que mudar (`ligar` dois nós que já
   têm fio, `moverNo` para o mesmo lugar, `renomearMapa` para o nome atual,
   pintar com uma cor fora da paleta). A página lê identidade de objeto:
   `if (proximo === mapa) return;`. Sem isso, cada clique sem arrasto viraria um
   passo que o `Ctrl+Z` desfaria sem mudar nada na tela.
2. **Coordenadas do plano, não da tela.** `no.x` / `no.y` vivem no plano infinito
   do mapa. O que está na tela é `translate(vista.x, vista.y) scale(vista.zoom)`
   num único CSS transform — então o arrasto de um nó precisa dividir o deslocamento
   do ponteiro pelo zoom **capturado no começo do gesto** (aproximar no meio do
   arrasto não pode fazer o nó escapar do dedo). O commit do arrasto é um só, no
   `pointerup`: durante o gesto o nó anda por estado local, e o catálogo só fica
   sabendo no fim.
3. **`nos[0]` é a raiz.** Não há campo `raizId` para dessincronizar. `raizDoMapa`
   lê a primeira posição, `organizar` faz uma BFS a partir dela e `removerNo` da
   raiz promove o próximo nó — a ordem do array é a única verdade.
4. **Sem navegador, sem PNG fingido.** `exportarMapaPng` lança em português quando
   não há `document`, quando o modo privacidade está ligado (nada sai do aparelho),
   quando o mapa está vazio ou quando `getContext('2d')` devolve `null`. A página
   mostra a mensagem em vez de baixar um arquivo em branco.

## O modelo

```ts
interface NoDoMapa     { id, texto, x, y, cor, personId?, nota? }
interface LigacaoDoMapa { id, de, para, rotulo? }
interface MapaMental   { id, nome, descricao?, nos, ligacoes, createdAt, updatedAt }
```

- O fio **não tem direção**: `de`/`para` dizem só quem foi ligado primeiro, e
  `ligar` recusa o par nos dois sentidos. É um mapa mental, não um fluxograma.
- `texto` é cortado em `LIMITE_DO_TEXTO` (90) e vazio vira "Sem título" — um nó
  sem nome não tem onde clicar depois.
- `cor` só aceita `CORES_DO_MAPA` (as seis primeiras da paleta do aplicativo): o
  mapa continua parecendo o catálogo, e o PNG também.
- `nota` é do mapa, não da ficha. `personId` é o único elo com o catálogo.

## Organizar

`organizar` espalha em **anéis elípticos** (mais largos do que altos, porque o
palco do computador é mais largo do que alto): quem está a um fio da raiz fica no
primeiro anel, a dois fios no segundo, e assim por diante. O que não tem caminho
até a raiz não é esquecido — vai para uma fileira embaixo, à vista. Devolve o
mesmo mapa quando só existe a raiz.

## Exportações

| Saída | Função | Arquivo |
| --- | --- | --- |
| Imagem | `exportarMapaPng` (`tela.ts`) | `catalog-mapa-<slug>.png` |
| Contorno | `contornoDoMapa` (`mapa.ts`) | `catalog-mapa-<slug>.md`, via `nomeDoContorno` |
| Área de transferência | o mesmo contorno, copiado | — |

O contorno é um traço por nó, com recuo por nível, o rótulo do fio entre
parênteses, a ficha vinculada depois de um travessão e a nota depois de dois
pontos. O slug tira acento e espaço, como nos outros exports do aplicativo.

## Testes

`tests/mapas-mentais.test.tsx` cobre o domínio (inclusive a identidade de objeto
das funções que não mudam nada), o contorno, o mapa das relações, o PNG com um
contexto 2D de mentira e a página inteira em jsdom (criar mapa, acrescentar nó,
renomear, voltar para a lista, menu de exportação).
