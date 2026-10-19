# Gallery

Domínio de fotos, vídeos anexados, álbuns, duplicatas, órfãs, visualização de mídia
e **edição de imagens**.

## Entrada

- `AppData` e filtros da galeria.
- `personId`, `photoId`, arquivos selecionados e metadados de mídia.
- Para editar: a `Photo` (com `url`) e o título opcional — quem chama não precisa
  dizer onde a foto mora.

## Não deve

- Alterar avaliações ou relações.
- Abrir drawers de pessoa diretamente; devolva um `personId` para a camada de composição.
- Escrever no armazenamento dentro de componentes visuais.
- Tocar no arquivo original para "aplicar" uma edição (veja abaixo).

A facade atual preserva as funções de `src/store.ts` enquanto `Gallery.tsx` é dividido em abas, grade, upload, seleção e visor.

---

# Edição de imagens

Cortar, girar, ajustar luz e cor, aplicar filtro, pintar com o dedo, desenhar
figura, escrever, esconder uma área com mosaico, apagar o que desenhou e — o
pedido que dá nome à ferramenta — **tirar a cor de qualquer ponto da foto** com o
conta-gotas. Abre do visor (lápis no topo), de segurar a foto na grade, da ficha e
do cofre; no computador, cada ferramenta tem atalho de uma tecla.

## As três decisões que explicam o resto

1. **A foto original não é tocada.** O que existe é uma **receita** (`Edicao`):
   geometria (corte, giro, espelho), ajustes (luz, cor, temperatura, vinheta) e
   marcas (traços, figuras, textos, mosaicos). Ela só vira pixels **uma vez**, no
   salvar. Por isso desfazer é instantâneo, "salvar como nova" deixa a original no
   lugar, e girar depois de cortar recorta o lugar certo do arquivo — em vez de
   recortar um JPEG já reencodado três vezes.
2. **Desenhar não passa pelo React.** Durante o arrasto o traço vai direto para o
   canvas; só entra no estado quando o dedo levanta. Cada `pointermove` que
   virasse `setState` renderizaria a tela inteira dezenas de vezes por segundo no
   aparelho.
3. **Sem canvas, o editor não finge.** Onde `getContext('2d')` devolve `null`
   (navegador antigo, modo de economia, teste), a tela mostra a foto original por
   cima e um aviso dizendo o que não deu para fazer. O `Salvar` recusa em vez de
   devolver um PNG em branco.

## Dois espaços de coordenadas

É o ponto que mais dá errado num editor de imagens, então está escrito aqui:

| O quê | Onde vive | Por quê |
| --- | --- | --- |
| `geometria.corte` | **pixels do arquivo** | cortar não perde resolução: o recorte é sempre do original, em qualquer ordem com o giro. |
| `geometria.giro` / `espelharH` / `espelharV` | passos de 90° e espelhos | ângulo livre quebraria o modelo (o corte deixaria de ser um retângulo do arquivo). |
| `marcas` | **pixels da saída** (foto já girada e cortada) | o dedo desenha no que está vendo; girar depois move o desenho junto. |

`paraFonte` / `paraSaida` são a ponte entre os dois. Um corte chega em pixels da
saída (é o que o dedo arrastou), volta para o arquivo pelos quatro cantos e
recalcula as medidas lá; um corte igual ao que já está na receita devolve **a mesma
geometria**, para o histórico não ganhar um passo que não desfaz nada.

## Arquivos

| Arquivo | O que decide |
| --- | --- |
| `edicao.ts` | A regra pura: receita, geometria, moldura do corte, contorno do resultado, tamanho do arquivo salvo, marcas, ajustes, filtros, cores (hex/rgb, luminância, paleta, recentes no `localStorage`), histórico (desfazer/refazer com teto de passos) e a gravação no catálogo (`guardarFotoEditada`, `nomeEditado`). Não conhece React, canvas nem navegador. |
| `tela.ts` | Quem fala com o canvas: carregar a imagem, medir, desenhar a base (foto + acabamento), recortar no contorno escolhido, compor marcas, ler cor de um pixel, achar as cores dominantes, gerar as miniaturas de filtro e exportar. Tudo devolve `false`/`null` quando não há canvas. |
| `ferramentas.ts` | As dez ferramentas, com ícone, nome, atalho e o texto de dica; `TRILHA` é a ordem da barra de baixo. |
| `components/EditorDeImagem.tsx` | O editor: histórico, geometria, luz, cor, salvamento, teclado e a moldura da tela. Portal no `body`, `z-index` 300 (acima do visor e das folhas). |
| `components/useTelaDoEditor.ts` | A tela: mede o palco (`ResizeObserver`), decide `escala`/`caixa`, mantém a **base pronta** e responde por paleta e miniaturas. A base só refaz quando muda forma ou luz — nunca a cada traço. |
| `components/useGestosDoEditor.ts` | O dedo: `pointerdown/move/up` → traço, figura, mosaico, texto, apagar, mover letra e conta-gotas. |
| `components/PalcoDeEdicao.tsx` | O palco: o canvas, a moldura de corte com as oito alças, a letra em rascunho e o antes/depois — as três sobreposições que precisam concordar no mesmo retângulo. |
| `components/PainelDeEdicao.tsx` | O painel da direita (faixa embaixo no aparelho): controles de cada ferramenta, proporções de corte, contorno e tamanho do arquivo salvo, sliders de luz, filtros com prévia, cores (prontas, recentes, hex, paleta da foto) e a trilha de ferramentas. |
| `components/EdicaoDeFoto.tsx` | `useEdicaoDeFoto()`: o hook que as telas usam — `abrir(foto, titulo?)`, `fechar()`, `aberta` e o `editor` pronto para renderizar, já ligado ao `commit` do contexto. |
| `components/AjusteEmLote.tsx` | A mesma receita de luz e cor em várias fotos: prévia em CSS na primeira escolhida, filtros prontos, os sete controles e **um `commit` só** no fim. |
| `index.ts` | A API pública do domínio. |

## Antes e depois, e o mesmo ajuste em várias fotos

**Segurar `Original`** mostra a foto como ela entrou. É um `<img>` por cima do
canvas, não um segundo desenho: comparar não custa um redesenho, funciona até
onde não há canvas, e enquanto dura, a moldura de corte e a letra em rascunho
saem da frente (ver o original com grade por cima não é ver o original).

**O lote** (`AjusteEmLote`) existe porque fotos do mesmo lugar saem com o mesmo
problema — todas escuras, todas azuis — e consertar uma por uma é o que faz a
pessoa desistir no meio. Ele aplica a mesma receita em todas as escolhidas:
a prévia é a primeira foto com o filtro em CSS (`filtroCss`, a mesma string que o
canvas usa), cada foto é gravada uma por vez com a barra de progresso, tudo entra
num **único `commit`** (um `Ctrl+Z` devolve o lote) e o que não abriu é dito pelo
nome em vez de sumir em silêncio.

## O contorno e o tamanho do arquivo

**O contorno** (`Edicao.formato`) é o que a foto *é* depois do corte: `retangulo`
(como ela entra), `arredondado` ou `oval`. Ele fica na receita, não no arquivo, e
por isso desfaz — e por isso o corte continua sendo um retângulo em pixels do
arquivo: arredondar não muda quais pixels entram, só quais aparecem. O desenho é
`recortarNoFormato(ctx, formato, tamanho)`, usado nos três lugares que precisam
concordar: a base pronta, a prévia (para um traço no canto não flutuar fora da
foto) e a exportação. O raio dos cantos vem de `raioDoArredondado`, uma fração do
lado menor, e o caminho cai num retângulo onde não existe `roundRect`. JPEG não
tem transparência: nesse caso o fundo entra branco antes do recorte, e o painel
avisa.

**O tamanho salvo** (`TAMANHOS_DE_SAIDA`) é uma escolha de salvamento, não de
receita — por isso fica fora do histórico: mudar de "cheia" para "pequena" não é
um passo que se desfaz, é como o arquivo vai ser gravado. `tamanhoExportado` e
`fatorDoLimite` são a conta única, usada tanto pelo painel (a linha "Vai salvar")
quanto por `exportarEdicao`, para a promessa da tela ser a medida do arquivo.

## Como a edição volta para o catálogo

`guardarFotoEditada(dados, fotoId, resultado, modo)` é o único caminho:

- `'substituir'` troca `url`, `width`, `height`, `hash` e marca `editedAt` — a
  ficha, o álbum, o favorito e o tipo continuam os mesmos.
- `'nova'` guarda uma cópia ao lado, com `nomeEditado` (`foto.jpg` →
  `foto-editada.jpg`) e herança de `personId`, `folderId`, `type` e álbuns.
- Vale para `people[].fotos` e para `orphanPhotos`; um `fotoId` desconhecido
  devolve os dados intactos.
- O `hash` é recalculado porque a detecção de duplicatas lê a imagem, não o nome.
- Tudo passa pelo `commit` do contexto: entra no histórico da sessão (`Ctrl+Z`) e
  avisa com a frase de `mensagemDoSalvamento(modo)`.

`Photo.editedAt` é o que a tela mostra como "Editada em …" nos detalhes da foto.

## Privacidade e limites

- Com o modo privacidade ligado, **baixar** a edição é recusado (nada sai do
  aparelho); salvar no catálogo continua valendo, porque o dado já é dela.
- A exportação tem limite de lado (2400 px por padrão, e 1600/1200/800 quando
  quem edita escolhe um arquivo menor) e tenta WebP → JPEG → PNG, na ordem,
  usando o que o navegador aceita de verdade.
- Foto de outro domínio suja o canvas: `toDataURL`/`getImageData` estão em
  `try/catch` e devolvem `null`, e o editor avisa em vez de quebrar.
- `ctx.filter` não existe no Safari antigo: `filtroNoContexto()` detecta e a
  prévia cai para o filtro em CSS (o arquivo final continua certo).

## Testes

`tests/editor-de-imagem.test.tsx`: a conta (geometria nos dois espaços, moldura e
alças do corte, marcas, borracha, cores, histórico, gravação no catálogo), o
editor aberto sem canvas (aviso em vez de retângulo preto), o editor com um canvas
de mentira (desenho, traço, conta-gotas, salvar, antes/depois, contorno e tamanho
salvo), o contorno e o limite do arquivo na conta e no desenho, o ajuste em várias
fotos (prévia em CSS, trilhos, falha dita pelo nome e as duas fotos gravadas no
catálogo de verdade), o estilo (camada, doca que sai da frente, alvos de dedo,
painel só no computador), a galeria abrindo o editor e a divisão dos arquivos.
