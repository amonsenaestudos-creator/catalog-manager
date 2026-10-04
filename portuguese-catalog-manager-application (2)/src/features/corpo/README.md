# Corpo: altura medida e figura 3D

Duas coisas que andam juntas: a ficha passa a guardar **1,50 m** em vez de
"baixinha", e essas medidas viram uma **figura 3D** que gira na tela.

## 1. Altura

O campo antigo era uma lista de palavras ("muito alta", "alta", "minha altura",
"um pouco baixa", "baixa", "baixinha"). Continuam valendo — ninguém perde o que
já escreveu —, mas agora a ficha aceita a medida, e é ela que manda:

| Você digita | A ficha guarda |
| --- | --- |
| `1,50` · `1.50` · `1,5` | `1,50 m` |
| `150` · `150 cm` · `150cm` | `1,50 m` |
| `1,72 m` | `1,72 m` |
| `alta` | `alta` (palavra, como antes) |

Regras: limites de 0,40 m a 2,60 m (fora disso é erro de digitação, não gente);
números a partir de 3 são lidos como centímetros (`150` é 1,50 m, não 150 m); a
vírgula é a que se fala. Quando a ficha só tem a palavra antiga, o número usado
pelo modelo é uma **estimativa** — dita na tela, nunca disfarçada de medida.

## 2. A figura 3D

Não é a aparência de ninguém: é um **manequim de ateliê** montado do que a ficha
já sabia. O corpo é uma **malha de triângulos de verdade** — superfície contínua,
com relevo de peito, bunda e barriga na própria pele do tronco —, pintada por um
rasterizador pequeno com luz de estúdio. Nada de malha importada, nada de
arquivo, nada de internet: o corpo inteiro é aritmética, e por isso acompanha as
notas da ficha.

### O que mexe na forma

| Critério | O que ele muda |
| --- | --- |
| Peito | relevo dos seios, para a frente (o tronco quase não alarga) |
| Quadril (largura) | largura do quadril |
| Quadril (trás) | relevo dos glúteos, para trás |
| Corpo | volume geral — larguras, profundidades e barriga |
| Cabelo | massa de cabelo (o tipo escolhe o desenho: 13 penteados) |
| Altura | tamanho geral (e a razão cintura/altura) |
| Tipo de corpo | base de ombros, cintura e quadril (esguio, atlético, curvilíneo, robusto, plus size) |
| Estilo de roupa | **roupa desenhada**: manga, barra, saia, bota e caimento |

Nota **3 é neutra**: o meio da escala não engorda nem afina nada. Quem não tem
nota também não é inventado — a peça fica na base e a tela diz "sem nota".

### O que fica de fora, e por quê

**Rosto**, **beleza geral** e **comportamento** não viram geometria. A forma do
rosto está na foto; beleza geral é um resumo das outras notas; jeito não tem
silhueta. Em vez de desenhar um palpite, a lista embaixo da figura nomeia o que
ficou de fora — a regra do aplicativo é explicar, não fingir precisão. (Olhos,
boca, nariz e sobrancelhas são **traços de manequim**, iguais para todo mundo:
não são leitura de ficha.)

## Arquivos

| Arquivo | O que decide |
| --- | --- |
| `altura.ts` | Lê, escreve e normaliza altura em metros; estimativas das palavras antigas. |
| `metricas.ts` | Notas + altura + tipo de corpo → proporções, corte da roupa e as explicações de cada uma. |
| `malha.ts` | Proporções → **malha 3D**: superfícies paramétricas (tronco, cabeça, braços, pernas, cabelo, roupa), com o relevo do corpo e o material de cada face. |
| `pintura.ts` | Malha + vista → **pixels**: rasterizador com z-buffer, luz de três pontos, ambiente hemisférico, oclusão e sombra de contato. |
| `aparencia.ts` | Cores de pele e cabelo, paleta de cada estilo de roupa e a leitura de silhueta. |
| `components/Figura3D.tsx` | O canvas: desenho, arrasto para girar, vistas, zoom, salvar imagem e o texto de reserva. |

## Como a figura é desenhada

1. **Superfícies contínuas, não bolas.** Cada parte do corpo é uma função
   `ponto(u, v)`: um **perfil** (a altura e as medidas em cada altura) interpolado
   por Catmull-Rom, com a seção transversal em volta. Nada de pilha de elipses: a
   malha é uma casca de triângulos, com normais tiradas da média das faces — e é
   isso que dá sombreado liso em vez de degraus.
2. **O relevo do corpo vive na superfície.** Os seios e os glúteos não são peças
   coladas por fora: são um deslocamento da própria casca — o peito empurra a
   frente, a bunda empurra o trás, a barriga acompanha o volume. De perfil, o
   corpo ganha a curva; de frente, quase não alarga.
3. **A roupa é geometria, não cor.** Onde há tecido, a casca infla (o caimento de
   cada estilo); o material de cada face decide a cor — manga até certo ponto do
   braço, barra da calça na altura do estilo, saia como casca própria, bota
   subindo o tornozelo. Duas fichas de mesmo corpo e estilos diferentes deixam de
   ser a mesma figura pintada de outra cor.
4. **Luz de estúdio, com oclusão.** Uma chave alta à esquerda, um preenchimento
   azulado à direita e uma contraluz atrás; o ambiente é hemisférico (céu em cima,
   chão embaixo) e a oclusão — assada nos vértices, uma vez por malha — escurece
   axila, virilha e embaixo do queixo. O brilho especular muda por material: o
   cabelo tem brilho, o tecido quase não.
5. **Girar é barato.** A malha é montada uma vez por ficha; girar só troca a
   vista. Enquanto a figura se mexe, ela é pintada em malha leve e em tamanho
   menor, esticada depois; ao parar, o desenho se refaz caprichado.
