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
já sabia. Cada peça é um elipsoide com centro, três semi-eixos e inclinação —
nada de malha importada, nada de arquivo, nada de internet. O corpo inteiro é
aritmética, e por isso ele acompanha as notas.

### O que mexe na forma

| Critério | O que ele muda |
| --- | --- |
| Peito | profundidade do tronco |
| Quadril (largura) | largura do quadril |
| Quadril (trás) | profundidade do quadril |
| Corpo | volume geral — larguras e profundidades |
| Cabelo | volume da massa de cabelo |
| Altura | tamanho geral (e a razão cintura/altura) |
| Tipo de corpo | base de ombros, cintura e quadril (esguio, atlético, curvilíneo, robusto, plus size) |

Nota **3 é neutra**: o meio da escala não engorda nem afina nada. Quem não tem
nota também não é inventado — a peça fica na base e a tela diz "sem nota".

### O que fica de fora, e por quê

**Rosto**, **beleza geral** e **comportamento** não viram geometria. A forma do
rosto está na foto; beleza geral é um resumo das outras notas; jeito não tem
silhueta. Em vez de desenhar um palpite, a lista embaixo da figura nomeia o que
ficou de fora — a regra do aplicativo é explicar, não fingir precisão.

## Arquivos

| Arquivo | O que decide |
| --- | --- |
| `altura.ts` | Lê, escreve e normaliza altura em metros; estimativas das palavras antigas. |
| `metricas.ts` | Notas + altura + tipo de corpo → proporções e as explicações de cada uma. |
| `modelo.ts` | Proporções → peças no espaço (elipsoides) e a sombra de contato. |
| `projecao.ts` | Gira, projeta e devolve a **elipse exata** de cada peça (via `M·Mᵀ`), com brilho e profundidade. |
| `components/Figura3D.tsx` | O canvas: desenho, arrasto para girar, vistas, zoom, salvar imagem e o texto de reserva. |

## Como a figura é desenhada

1. **Fatias interpoladas, não bolas soltas.** O tronco, os braços e as pernas são
   definidos por **pontos de controle** (a largura do ombro, a da cintura, a do
   quadril, a profundidade do peito…) e preenchidos por fatias sobrepostas de
   elipsoides, dez por trecho. A sobreposição é o que transforma uma pilha de
   elipses em superfície contínua — e é conferida em teste (nenhuma vizinha deixa
   vão entre ela e a próxima). A cobertura de cada fatia olha os **dois**
   vizinhos, para a emenda entre trechos não aparecer.
2. **Projeção ortográfica com a elipse exata.** Para um elipsoide, a silhueta
   projetada é a elipse da matriz `M·Mᵀ`, em que `M` são as duas primeiras linhas
   de `R · diag(raios)`. Os autovalores dão os semi-eixos; o autovetor, o ângulo.
   Aproximar por círculo daria uma figura "de papelão" em qualquer giro.
3. **Ordem de pintura por parte do corpo.** Primeiro as pernas, depois o tronco,
   os braços e a cabeça — e, dentro de cada uma, a profundidade decide. Sem esse
   agrupamento, no perfil as fatias do braço e do tronco se intercalam e a
   silhueta vira listra. O braço que está mais perto da câmera sobe para a frente
   (`ordenarBracos`); o de trás passa a ser pintado antes do tronco.
4. **Cor chapada por peça e uma luz só.** Cada peça recebe a cor do material
   ajustada pela orientação (a mesma em todas as fatias de um trecho, então não
   há degrau entre elas); depois **uma única passada** de luz atravessa a figura
   inteira (claro em cima e à esquerda, sombra embaixo e à direita). Gradiente
   por peça, em fatias empilhadas, vira listra — a luz global é o que faz o corpo
   ler como volume.

## Constrangimentos

- **Sem biblioteca 3D.** O aplicativo é um arquivo só; três mil linhas de motor
  gráfico não caberiam na promessa de abrir offline.
- **Sem canvas, sem drama.** Em navegador que não desenha, a seção entrega a
  mesma leitura em texto (`1,70 m · ombros 38 cm · cintura 27 cm…`).
- **Animar só quando ajuda.** O giro automático desliga com "reduzir animações"
  ligado — a figura continua girável à mão.
