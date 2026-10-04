/**
 * Modelo 3D paramétrico.
 *
 * Recebe as proporções e devolve **peças soltas no espaço**: cada uma é um
 * elipsoide (ou uma cápsula, que é um elipsoide comprido) com centro, três
 * semi-eixos e uma inclinação. Nada de malha importada, nada de arquivo: o corpo
 * inteiro é aritmética, e é por isso que ele acompanha as notas da ficha.
 *
 * Convenções: metros, Y para cima, origem entre os pés, pessoa olhando para +Z
 * (a câmera fica em +Z). O eixo X é a largura (ombros), o Z é a profundidade
 * (peito e quadril) — é de lá que vêm as curvas que os critérios mexem.
 */
import type { Proporcoes } from './metricas';

export type PapelDaPeca = 'pele' | 'cabelo' | 'manequim' | 'sombra';

export interface PecaDoModelo {
  id: string;
  papel: PapelDaPeca;
  /** Centro da peça, em metros, com o chão em y = 0. */
  centro: [number, number, number];
  /** Semi-eixos: [largura, altura, profundidade]. */
  raios: [number, number, number];
  /** Inclinação em graus, aplicada antes da vista (braços e pernas). */
  giro?: { eixo: 'x' | 'y' | 'z'; graus: number }[];
  /** Ajuste fino de brilho, para o manequim não ficar chapado. */
  brilho?: number;
  /**
   * Ordem de pintura por parte do corpo (pernas, tronco, braços, cabeça).
   * Sem isso, no perfil as fatias do braço e do tronco se intercalam por
   * profundidade e a silhueta vira listra.
   */
  ordem?: number;
}

const graus = (valor: number) => (valor * Math.PI) / 180;

/**
 * Monta a figura inteira a partir das proporções.
 *
 * A ordem importa pouco: quem decide o que fica na frente é a profundidade de
 * cada peça depois de girada, não a ordem do array. Foi de propósito — a figura
 * gira, e a ordem fixa quebraria no primeiro giro.
 */
/**
 * Um trecho do corpo, em pontos de controle: onde começa, onde termina, que
 * largura e profundidade tem em cada ponta. Entre um ponto e outro o modelo
 * **interpola fatias** — é isso que dá contorno contínuo em vez de bolas soltas.
 */
interface Controle { y: number; largura: number; profundidade: number; x?: number }

/**
 * Transforma pontos de controle em uma sequência de elipsoides sobrepostos.
 * Cada fatia cobre um pouco mais que o próprio espaço (`1,2×`), para não sobrar
 * degrau entre uma e outra.
 */
function fatiar(id: string, papel: PapelDaPeca, controles: Controle[], porTrecho = 10, brilho = 1, ordem = 1): PecaDoModelo[] {
  const centros: { x: number; y: number; largura: number; profundidade: number }[] = [];
  for (let trecho = 0; trecho < controles.length - 1; trecho++) {
    const de = controles[trecho], ate = controles[trecho + 1];
    for (let fatia = 0; fatia < porTrecho; fatia++) {
      const t = (fatia + 0.5) / porTrecho;
      centros.push({
        x: (de.x ?? 0) + ((ate.x ?? 0) - (de.x ?? 0)) * t,
        y: de.y + (ate.y - de.y) * t,
        largura: de.largura + (ate.largura - de.largura) * t,
        profundidade: de.profundidade + (ate.profundidade - de.profundidade) * t,
      });
    }
  }
  // A cobertura de cada fatia olha os dois vizinhos, não só o próprio trecho: é
  // o que impede a emenda de aparecer na altura em que um trecho encontra o outro.
  return centros.map((centro, indice) => {
    const anterior = centros[indice - 1] ?? centro;
    const seguinte = centros[indice + 1] ?? centro;
    const vizinhanca = Math.max(Math.abs(centro.y - anterior.y), Math.abs(seguinte.y - centro.y), 0.004);
    return {
      id: `${id}-${Math.floor(indice / porTrecho)}-${indice % porTrecho}`, papel,
      centro: [centro.x, centro.y, 0] as [number, number, number],
      // A sobreposição é o que transforma uma pilha de elipses em superfície
      // contínua, sem "colar de contas".
      raios: [centro.largura, vizinhanca * 0.62, centro.profundidade] as [number, number, number],
      brilho, ordem,
    };
  });
}

export function modeloDaPessoa(proporcoes: Proporcoes): PecaDoModelo[] {
  const { altura, ombros, cintura, quadril, peito, profundidadePeito, profundidadeCintura, profundidadeQuadril, cabelo } = proporcoes;

  // Marcos do corpo, em fração da altura — os mesmos que um ateliê usa para
  // desenhar de memória: virilha a 47%, cintura a 62%, ombro a 82%, olhos a 93%.
  const H = altura;
  const yVirilha = 0.47 * H;
  const yCintura = 0.62 * H;
  const yPeito = 0.75 * H;
  const yOmbros = 0.82 * H;
  const yPescoco = 0.86 * H;
  const yCabeca = 0.93 * H;

  const raioCabecaX = 0.044 * H;
  const raioCabecaY = 0.064 * H;
  const raioCabecaZ = 0.056 * H;
  const raioBraco = Math.max(0.028, ombros * 0.19);
  const raioCoxa = quadril * 0.52;
  const raioPerna = Math.max(0.04, quadril * 0.34);
  const xPerna = quadril * 0.42;
  const xBraco = ombros * 0.93;

  const cabeca: PecaDoModelo[] = [
    { id: 'cabeca', papel: 'pele', centro: [0, yCabeca, 0], raios: [raioCabecaX, raioCabecaY, raioCabecaZ], brilho: 1.05, ordem: 3 },
    // O cabelo é o único critério de aparência que vira volume sem mentir.
    { id: 'cabelo', papel: 'cabelo', centro: [0, yCabeca + raioCabecaY * 0.05, -raioCabecaZ * 0.14], raios: [raioCabecaX * 1.12 * cabelo, raioCabecaY * 1.1 * cabelo, raioCabecaZ * 1.08 * cabelo], brilho: 0.9, ordem: 3 },
    { id: 'pescoco', papel: 'pele', centro: [0, yPescoco, 0], raios: [raioCabecaX * 0.64, (yCabeca - raioCabecaY * 0.7 - yPescoco) * 0.7 + 0.015, raioCabecaZ * 0.62], brilho: 0.95, ordem: 3 },
    ...fatiar('nuca', 'pele', [
      { y: yPescoco + 0.005, largura: raioCabecaX * 0.6, profundidade: raioCabecaZ * 0.58 },
      { y: yOmbros - 0.004, largura: ombros * 0.4, profundidade: profundidadePeito * 0.5 },
    ], 10, 0.93, 3),
  ];

  // Tronco: do ombro à virilha, passando por peito, cintura e quadril. Os pontos
  // de controle são as quatro medidas da ficha; o resto é interpolação.
  const tronco = fatiar('tronco', 'manequim', [
    { y: yOmbros + 0.026 * H, largura: ombros * 0.52, profundidade: profundidadePeito * 0.6 },
    { y: yOmbros, largura: ombros, profundidade: profundidadePeito * 0.94 },
    { y: yPeito, largura: peito, profundidade: profundidadePeito },
    { y: (yPeito + yCintura) / 2, largura: (peito + cintura) / 2 * 0.98, profundidade: (profundidadePeito + profundidadeCintura) / 2 },
    { y: yCintura, largura: cintura, profundidade: profundidadeCintura },
    { y: yCintura - 0.05 * H, largura: (cintura + quadril) / 2, profundidade: (profundidadeCintura + profundidadeQuadril) / 2 },
    { y: yVirilha + 0.055 * H, largura: quadril, profundidade: profundidadeQuadril },
    { y: yVirilha, largura: quadril * 0.78, profundidade: profundidadeQuadril * 0.86 },
  ], 10, 1.02, 1);

  // Braços: do ombro ao punho, quatro fatias por braço, rentes ao corpo.
  const bracos = [1, -1].flatMap(lado => fatiar(`braco${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: yOmbros - 0.01 * H, largura: raioBraco * 1.05, profundidade: raioBraco * 1.05, x: lado * (xBraco - raioBraco * 0.2) },
    { y: yOmbros - 0.08 * H, largura: raioBraco * 1.12, profundidade: raioBraco * 1.12, x: lado * (xBraco + raioBraco * 0.16) },
    { y: yOmbros - 0.18 * H, largura: raioBraco * 0.86, profundidade: raioBraco * 0.86, x: lado * (xBraco + raioBraco * 0.3) },
    { y: yOmbros - 0.27 * H, largura: raioBraco * 0.78, profundidade: raioBraco * 0.78, x: lado * (xBraco + raioBraco * 0.36) },
    { y: yOmbros - 0.33 * H, largura: raioBraco * 0.62, profundidade: raioBraco * 0.62, x: lado * (xBraco + raioBraco * 0.4) },
  ], 10, 0.97, 2));

  // Mãos: uma peça achatada no fim de cada braço.
  const maos: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `mao-${lado > 0 ? 'd' : 'e'}`, papel: 'pele',
    centro: [lado * (xBraco + raioBraco * 0.42), yOmbros - 0.35 * H, 0] as [number, number, number],
    raios: [raioBraco * 0.66, 0.028 * H, raioBraco * 0.44] as [number, number, number], brilho: 0.92, ordem: 2,
  }));

  // Pernas: coxa, joelho, panturrilha e tornozelo, com o pé no fim.
  const pernas = [1, -1].flatMap(lado => fatiar(`perna${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: yVirilha + 0.015 * H, largura: raioCoxa, profundidade: raioCoxa * 1.02, x: lado * xPerna },
    { y: yVirilha - 0.11 * H, largura: raioCoxa * 0.94, profundidade: raioCoxa * 0.98, x: lado * (xPerna * 0.97) },
    { y: 0.285 * H, largura: raioCoxa * 0.68, profundidade: raioCoxa * 0.74, x: lado * (xPerna * 0.9) },
    { y: 0.21 * H, largura: raioCoxa * 0.74, profundidade: raioCoxa * 0.8, x: lado * (xPerna * 0.86) },
    { y: 0.1 * H, largura: raioPerna, profundidade: raioPerna * 1.1, x: lado * (xPerna * 0.82) },
    { y: 0.03 * H, largura: raioPerna * 0.82, profundidade: raioPerna * 0.95, x: lado * (xPerna * 0.8) },
  ], 10, 0.97, 0));

  const pes: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `pe-${lado > 0 ? 'd' : 'e'}`, papel: 'pele',
    centro: [lado * (xPerna * 0.8), 0.022 * H, 0.03 * H] as [number, number, number],
    raios: [raioPerna * 0.72, 0.021 * H, 0.052 * H] as [number, number, number], brilho: 0.9, ordem: 0,
  }));

  // Cada peça recebe a inclinação em radianos, para a projeção não ter que saber
  // de graus. `graus` é a unidade da ficha; radiano é a unidade da conta.
  return [...cabeca, ...tronco, ...bracos, ...maos, ...pernas, ...pes]
    .map(peca => ({ ...peca, giro: peca.giro?.map(g => ({ eixo: g.eixo, graus: g.graus, radianos: graus(g.graus) })) as PecaDoModelo['giro'] }));
}

/**
 * Separa os braços em **próximo** e **distante** para a vista atual.
 *
 * O braço é a única parte que cruza o tronco, e de que lado ele passa depende de
 * onde a câmera está: visto de frente, os dois braços estão ao lado do tronco;
 * visto de perfil, um está na frente e o outro atrás. Sem essa correção, o braço
 * de trás pinta por cima do corpo e a silhueta ganha um borrão.
 */
export function ordenarBracos(pecas: PecaDoModelo[], yaw: number): PecaDoModelo[] {
  const seno = Math.sin((yaw * Math.PI) / 180);
  return pecas.map(peca => {
    if (peca.ordem !== 2) return peca;
    const perto = peca.centro[0] * seno < 0;
    return { ...peca, ordem: perto ? 2 : 0.5 };
  });
}

/** Sombras de contato: uma elipse no chão, sempre a peça mais distante. */
export function sombraDoModelo(proporcoes: Proporcoes): PecaDoModelo {
  return {
    id: 'sombra',
    papel: 'sombra',
    centro: [0, 0.001, 0],
    raios: [proporcoes.quadril * 1.5, 0.001, proporcoes.quadril * 1.05],
    ordem: -1,
  };
}

/** Confere que a figura cabe na altura declarada — usado nos testes e na saúde. */
export function alturaDoModelo(pecas: PecaDoModelo[]): number {
  return pecas.reduce((maior, peca) => Math.max(maior, peca.centro[1] + peca.raios[1]), 0);
}
