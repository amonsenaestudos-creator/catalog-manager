/**
 * Projeção 3D → 2D.
 *
 * Matemática pura, sem canvas: gira o modelo (yaw e pitch), projeta em
 * ortografia e devolve, para cada elipsoide, **a elipse que ele desenha na
 * tela** — centro, dois raios e o ângulo. A elipse sai da decomposição da
 * matriz de covariância da peça (`M·Mᵀ`), que é a resposta exata para a sombra
 * de um elipsoide sob projeção ortográfica: nada de aproximar por círculo, e
 * nada de depender de biblioteca 3D.
 *
 * Convenções: metros, Y para cima, câmera em +Z. Na tela, X cresce para a
 * direita e Y **cresce para cima** — quem inverte para o canvas é o componente.
 */
import type { PecaDoModelo } from './modelo';

export type Vec3 = [number, number, number];
/** Matriz 3×3 em ordem de linha. */
export type Matriz = [number, number, number, number, number, number, number, number, number];

export const IDENTIDADE: Matriz = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function multiplicar(a: Matriz, b: Matriz): Matriz {
  const saida = new Array(9).fill(0) as Matriz;
  for (let linha = 0; linha < 3; linha++) {
    for (let coluna = 0; coluna < 3; coluna++) {
      let soma = 0;
      for (let k = 0; k < 3; k++) soma += a[linha * 3 + k] * b[k * 3 + coluna];
      saida[linha * 3 + coluna] = soma;
    }
  }
  return saida;
}

export function girarPonto(vetor: Vec3, matriz: Matriz): Vec3 {
  return [
    matriz[0] * vetor[0] + matriz[1] * vetor[1] + matriz[2] * vetor[2],
    matriz[3] * vetor[0] + matriz[4] * vetor[1] + matriz[5] * vetor[2],
    matriz[6] * vetor[0] + matriz[7] * vetor[1] + matriz[8] * vetor[2],
  ];
}

const cosseno = (graus: number) => Math.cos((graus * Math.PI) / 180);
const seno = (graus: number) => Math.sin((graus * Math.PI) / 180);

/** Vista: primeiro o giro em volta do eixo Y (yaw), depois a inclinação (pitch). **Em graus.** */
export function matrizDaVista(yaw: number, pitch: number): Matriz {
  const cy = cosseno(yaw), sy = seno(yaw), cp = cosseno(pitch), sp = seno(pitch);
  const giraY: Matriz = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const inclinaX: Matriz = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  return multiplicar(giraY, inclinaX);
}

/** Giro próprio da peça (braços e pernas), em graus, aplicado antes da vista. */
export function matrizDaPeca(peca: PecaDoModelo): Matriz {
  let matriz = IDENTIDADE;
  for (const giro of peca.giro || []) {
    const c = cosseno(giro.graus), s = seno(giro.graus);
    const passo: Matriz = giro.eixo === 'x'
      ? [1, 0, 0, 0, c, -s, 0, s, c]
      : giro.eixo === 'y'
        ? [c, 0, s, 0, 1, 0, -s, 0, c]
        : [c, -s, 0, s, c, 0, 0, 0, 1];
    matriz = multiplicar(matriz, passo);
  }
  return matriz;
}

export interface ElipseProjetada {
  id: string;
  papel: PecaDoModelo['papel'];
  /** Centro na tela, em metros (Y para cima). */
  centro: [number, number];
  /** Semi-eixos da elipse projetada, em metros. */
  rx: number;
  ry: number;
  /** Rotação da elipse, em graus. */
  angulo: number;
  /** Profundidade: maior = mais perto da câmera. */
  profundidade: number;
  /** 0,5 (na sombra) a 1,25 (na luz) — quem desenha aplica. */
  brilho: number;
  /** Parte do corpo (pernas · tronco · braços · cabeça), para a ordem de pintura. */
  ordem: number;
}

/** Direção da luz, na vista: vindo de cima, à esquerda e de frente. */
const LUZ: Vec3 = [-0.42, 0.78, 0.46];

function normalizar(vetor: Vec3): Vec3 {
  const tamanho = Math.hypot(vetor[0], vetor[1], vetor[2]) || 1;
  return [vetor[0] / tamanho, vetor[1] / tamanho, vetor[2] / tamanho];
}

/**
 * Brilho da peça: a normal que mais aponta para a luz, entre os três eixos do
 * elipsoide girado. É um sombreamento de ateliê — simples, estável e suficiente
 * para o volume aparecer.
 */
function brilhoDaPeca(matriz: Matriz): number {
  const eixos: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let melhor = -1;
  for (const eixo of eixos) {
    const girado = normalizar(girarPonto(eixo, matriz));
    const alinhamento = Math.abs(girado[0] * LUZ[0] + girado[1] * LUZ[1] + girado[2] * LUZ[2]);
    if (alinhamento > melhor) melhor = alinhamento;
  }
  return Math.round((0.62 + 0.5 * melhor) * 100) / 100;
}

/**
 * Projeta uma peça: devolve a elipse que ela desenha, com o ângulo exato.
 *
 * O truque está em `C = M2 · M2ᵀ`, em que `M2` são as duas primeiras linhas de
 * `R · diag(raios)`. Os autovalores de `C` dão os quadrados dos semi-eixos, e o
 * autovetor do maior dá o ângulo.
 */
export function projetarPeca(peca: PecaDoModelo, vista: Matriz): ElipseProjetada {
  const matriz = multiplicar(vista, matrizDaPeca(peca));
  const [a1, b1, c1] = peca.raios;

  // Colunas da matriz escaladas pelos raios, já só com as linhas X e Y.
  const m00 = matriz[0] * a1, m01 = matriz[1] * b1, m02 = matriz[2] * c1;
  const m10 = matriz[3] * a1, m11 = matriz[4] * b1, m12 = matriz[5] * c1;

  const cxx = m00 * m00 + m01 * m01 + m02 * m02;
  const cxy = m00 * m10 + m01 * m11 + m02 * m12;
  const cyy = m10 * m10 + m11 * m11 + m12 * m12;

  const media = (cxx + cyy) / 2;
  const raiz = Math.hypot((cxx - cyy) / 2, cxy);
  const maior = Math.sqrt(Math.max(0, media + raiz));
  const menor = Math.sqrt(Math.max(0, media - raiz));
  const angulo = (Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI / 2;

  const centro = girarPonto(peca.centro, vista);
  return {
    id: peca.id,
    papel: peca.papel,
    centro: [centro[0], centro[1]],
    rx: maior,
    ry: menor,
    angulo,
    profundidade: centro[2],
    brilho: Math.round(brilhoDaPeca(matriz) * (peca.brilho ?? 1) * 100) / 100,
    ordem: peca.ordem ?? 1,
  };
}

/** Projeta o modelo inteiro, do mais distante para o mais próximo (ordem de pintura). */
export function projetarModelo(pecas: PecaDoModelo[], yaw: number, pitch: number): ElipseProjetada[] {
  const vista = matrizDaVista(yaw, pitch);
  return pecas
    .map(peca => projetarPeca(peca, vista))
    .sort((a, b) => a.profundidade - b.profundidade);
}

/**
 * Altura total que a figura ocupa depois de girada (para enquadrar na tela).
 *
 * A conta usa a **caixa exata** de cada elipse girada, eixo por eixo. A versão
 * antiga usava `hypot(rx, ry)` nos dois eixos — o que fazia a sombra de contato
 * (larga e quase sem altura) inflar a figura para baixo, e o boneco aparecia
 * pequeno no meio do palco, com um vazio embaixo dos pés.
 */
export function caixaDoModelo(elipses: ElipseProjetada[]): { largura: number; altura: number; base: number; topo: number } {
  if (!elipses.length) return { largura: 0, altura: 0, base: 0, topo: 0 };
  let esquerda = Infinity, direita = -Infinity, base = Infinity, topo = -Infinity;
  for (const elipse of elipses) {
    const theta = (elipse.angulo * Math.PI) / 180;
    const cosseno = Math.abs(Math.cos(theta)), seno = Math.abs(Math.sin(theta));
    const meiaLargura = Math.hypot(elipse.rx * cosseno, elipse.ry * seno);
    const meiaAltura = Math.hypot(elipse.rx * seno, elipse.ry * cosseno);
    esquerda = Math.min(esquerda, elipse.centro[0] - meiaLargura);
    direita = Math.max(direita, elipse.centro[0] + meiaLargura);
    base = Math.min(base, elipse.centro[1] - meiaAltura);
    topo = Math.max(topo, elipse.centro[1] + meiaAltura);
  }
  return { largura: direita - esquerda, altura: topo - base, base, topo };
}
