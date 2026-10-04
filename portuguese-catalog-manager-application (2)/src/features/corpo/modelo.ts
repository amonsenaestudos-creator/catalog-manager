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
 * (peito, seios, glúteos) — é de lá que vêm as curvas que os critérios mexem.
 *
 * O que cada parte usa:
 * - **tronco** — ombros, peito, cintura, quadril (largura) e volume do corpo;
 * - **seios** — a nota de peito, como duas peças no peito;
 * - **glúteos** — a nota de bunda, como duas peças atrás do quadril;
 * - **cabelo** — o tipo (dez desenhos: liso, ondulado, cacheado, crespo, afro,
 *   trançado, preso, franja, mullet, moicano, curto) e a nota de cabelo;
 * - **roupa** — o estilo declarado vira cor no componente, não forma aqui.
 */
import type { FamiliaDeCabelo } from './aparencia';
import type { Proporcoes } from './metricas';

export type PapelDaPeca = 'pele' | 'cabelo' | 'roupa' | 'calca' | 'sapato' | 'sombra';

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
 * Um trecho do corpo, em pontos de controle: onde começa, onde termina, que
 * largura e profundidade tem em cada ponta. Entre um ponto e outro o modelo
 * **interpola fatias** — é isso que dá contorno contínuo em vez de bolas soltas.
 */
interface Controle { y: number; largura: number; profundidade: number; x?: number }

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

interface MedidasDaCabeca { rcx: number; rcy: number; rcz: number; y: number }

/**
 * O cabelo de cada família de tipo. Treze desenhos que se reconhecem de longe —
 * e é aqui que duas pessoas de mesma altura e mesmas notas param de ser iguais.
 *
 * Três tipos de peça fazem o serviço, e quem os separa é a profundidade:
 * - **touca** — a massa presa atrás da cabeça (centro em Z negativo). A cabeça
 *   pinta por cima dela, então o que sobra é a moldura de cabelo em volta do
 *   rosto;
 * - **testa** — a faixa da testa, à frente (centro em Z positivo). Como ela fica
 *   mais perto da câmera, pinta **depois** da cabeça e desenha a linha do
 *   cabelo: é o que faz o corte curto deixar de parecer careca;
 * - **o desenho da família** — nuvem, mechas, tranças, coque, crista.
 * Girar a figura não quebra nada: de costas, a faixa da testa passa para trás da
 * cabeça e some sozinha, sem nenhuma regra de vista.
 */
function cabelo(familia: FamiliaDeCabelo, cabeca: MedidasDaCabeca, volume: number, ombreira: number): PecaDoModelo[] {
  const { rcx, rcy, rcz, y } = cabeca;
  const v = Math.max(0.7, Math.min(1.3, volume));
  // A touca varia menos que o resto: com nota de cabelo baixa ela ainda precisa
  // cobrir a cabeça, senão cabelo curto e cabelo ralo viram careca.
  const vc = 1 + (v - 1) * 0.55;
  const ordem = 3;
  const pecas: PecaDoModelo[] = [];
  const touca = (fatorL: number, fatorA: number, fatorP: number, deslocamentoY = 0, deslocamentoZ = 0) =>
    pecas.push({
      id: 'cabelo-touca', papel: 'cabelo',
      centro: [0, y + rcy * (0.10 + deslocamentoY), -rcz * (0.18 - deslocamentoZ)],
      raios: [rcx * fatorL * vc, rcy * fatorA * vc, rcz * fatorP * vc],
      brilho: 0.9, ordem,
    });
  /**
   * Faixa da testa: `inicio` é onde o cabelo começa a subir (fração do raio
   * vertical da cabeça) e `altura`, o quanto ele sobe. Fica em Z positivo de
   * propósito — é a profundidade que a coloca por cima do rosto.
   */
  const testa = (inicio: number, altura: number) =>
    pecas.push({
      id: 'cabelo-testa', papel: 'cabelo',
      centro: [0, y + rcy * (inicio + altura / 2), rcz * 0.44],
      raios: [rcx * 1.02 * vc, rcy * (altura / 2) * vc, rcz * 0.5 * vc],
      brilho: 0.95, ordem,
    });
  /**
   * Mechas verticais: o cabelo que desce. `ateY` é até onde ele vai.
   *
   * As mechas saem em pares, uma de cada lado, e **nunca nascem no meio**: uma
   * mecha no eixo do rosto desce pelo queixo e vira barba. Elas também ficam
   * atrás do centro da cabeça, para no perfil aparecerem atrás do pescoço e não
   * por cima dele.
   *
   * `distancia` é onde cai a mecha de fora, em metros: o cabelo curto fica
   * rente à cabeça, e o comprido desce pelos **lados do tronco** — assim ele
   * emoldura o corpo em vez de tapar o peito e o quadril.
   */
  const mechas = (quantas: number, largura: number, profundidade: number, ateY: number, distancia: number, curva = 0) => {
    for (let i = 0; i < quantas; i++) {
      const lado = i % 2 === 0 ? 1 : -1;
      const nivel = Math.floor(i / 2) / Math.max(1, Math.ceil(quantas / 2) - 1);
      const afastamento = 0.42 + 0.58 * Math.min(1, nivel);        // 0,42 … 1
      const x = lado * distancia * afastamento;
      const t = (i + 0.5) / quantas;
      const z = -rcz * (0.58 + afastamento * 0.14) + curva * Math.sin(t * Math.PI);
      const topo = y + rcy * 0.15;
      const fatias = 8;
      for (let fatia = 0; fatia < fatias; fatia++) {
        const u = (fatia + 0.5) / fatias;
        const alturaAtual = topo + (ateY - topo) * u;
        // O cabelo afina no fim e abre um pouco no meio (o "peso" da mecha).
        const afinamento = 1 - Math.abs(u - 0.45) * 0.5;
        pecas.push({
          id: `cabelo-mecha-${i}-${fatia}`, papel: 'cabelo',
          centro: [x * (1 + u * 0.08), alturaAtual, z],
          raios: [largura * afinamento * v, Math.abs(ateY - topo) / fatias * 0.8, profundidade * afinamento * v],
          brilho: 0.88, ordem,
        });
      }
    }
  };
  /**
   * Bolinhas de cacho em volta da cabeça. Ficam sempre **atrás** do centro da
   * cabeça: assim elas desenham a borda do cabelo e nunca caem sobre o rosto.
   */
  const bolinhas = (quantas: number, distancia: number, raio: number) => {
    for (let i = 0; i < quantas; i++) {
      const angulo = (i / quantas) * Math.PI * 2;
      pecas.push({
        id: `cabelo-cacho-${i}`, papel: 'cabelo',
        centro: [Math.cos(angulo) * rcx * distancia, y + Math.sin(angulo) * rcy * distancia * 0.8, -rcz * (0.52 + Math.abs(Math.cos(angulo)) * 0.18)],
        raios: [raio * v, raio * v, raio * v], brilho: 0.88, ordem,
      });
    }
  };

  switch (familia) {
    case 'afro':
      touca(1.06, 1.02, 1.06);
      pecas.push({ id: 'cabelo-nuvem', papel: 'cabelo', centro: [0, y + rcy * 0.42, -rcz * 0.08], raios: [rcx * 1.54 * v, rcy * 1.26 * v, rcz * 1.44 * v], brilho: 0.92, ordem });
      bolinhas(7, 1.5, rcx * 0.46);
      break;
    case 'crespo':
      touca(1.04, 1.0, 1.04);
      pecas.push({ id: 'cabelo-nuvem', papel: 'cabelo', centro: [0, y + rcy * 0.3, -rcz * 0.1], raios: [rcx * 1.34 * v, rcy * 1.14 * v, rcz * 1.26 * v], brilho: 0.92, ordem });
      bolinhas(8, 1.26, rcx * 0.36);
      break;
    case 'cacheado':
      touca(1.06, 1.02, 1.05);
      testa(0.52, 0.62);
      bolinhas(9, 1.18, rcx * 0.32);
      mechas(4, rcx * 0.34, rcz * 0.44, y - rcy * 2.6, rcx * 1.45, rcz * 0.22);
      break;
    case 'ondulado':
      touca(1.08, 1.03, 1.06);
      testa(0.46, 0.62);
      mechas(6, rcx * 0.3, rcz * 0.52, y - rcy * 3.4, rcx * 1.5, rcz * 0.28);
      break;
    case 'longo':
      touca(1.08, 1.03, 1.06);
      testa(0.5, 0.6);
      mechas(7, rcx * 0.34, rcz * 0.62, y - rcy * 7.2, ombreira * 0.95, rcz * 0.18);
      break;
    case 'medio':
      touca(1.08, 1.0, 1.05);
      testa(0.52, 0.6);
      mechas(6, rcx * 0.32, rcz * 0.5, y - rcy * 4.2, ombreira * 0.85, rcz * 0.2);
      break;
    case 'preso':
      touca(1.05, 0.97, 1.02);
      // Cabelo puxado: a linha do cabelo sobe e o nó fica na nuca.
      testa(0.62, 0.56);
      pecas.push({ id: 'cabelo-coque', papel: 'cabelo', centro: [0, y + rcy * 0.42, -rcz * 1.15], raios: [rcx * 0.52 * v, rcy * 0.62 * v, rcz * 0.6 * v], brilho: 0.9, ordem });
      mechas(3, rcx * 0.24, rcz * 0.4, y - rcy * 1.6, rcx * 1.25, 0);
      break;
    case 'trancado':
      touca(1.05, 1.0, 1.03);
      testa(0.54, 0.6);
      // Cada trança é uma mecha fina e comprida: dá para contar as cinco de longe.
      // Como as mechas, elas saem em pares — nenhuma trança nasce no meio do rosto.
      for (let i = 0; i < 5; i++) {
        const lado = i % 2 === 0 ? 1 : -1;
        const nivel = Math.floor(i / 2) / 2;                          // 0 · 0,5 · 1
        const afastamento = 0.42 + 0.58 * nivel;
        const x = lado * rcx * 1.4 * afastamento;
        const fatias = 7;
        for (let fatia = 0; fatia < fatias; fatia++) {
          const u = (fatia + 0.5) / fatias;
          pecas.push({
            id: `tranca-${i}-${fatia}`, papel: 'cabelo',
            centro: [x * (1 + u * 0.05), y + rcy * 0.1 - (rcy * 7.4) * u, -rcz * (0.55 + afastamento * 0.16)],
            raios: [rcx * 0.17 * v, (rcy * 7.4) / fatias * 0.72, rcz * 0.2 * v], brilho: 0.88, ordem,
          });
        }
      }
      break;
    case 'franja':
      touca(1.08, 1.03, 1.06);
      // Franja: uma faixa reta na testa, na frente do rosto.
      pecas.push({ id: 'cabelo-franja', papel: 'cabelo', centro: [0, y + rcy * 0.55, rcz * 0.62], raios: [rcx * 1.0 * vc, rcy * 0.5 * vc, rcz * 0.42 * vc], brilho: 0.95, ordem });
      mechas(5, rcx * 0.28, rcz * 0.5, y - rcy * 3.6, rcx * 1.4, 0);
      break;
    case 'mullet':
      touca(1.06, 1.0, 1.04);
      testa(0.58, 0.56);
      mechas(4, rcx * 0.3, rcz * 0.5, y - rcy * 4.6, rcx * 1.3, -rcz * 0.15);
      break;
    case 'moicano':
      // Laterais raspadas: a touca fica baixa e só a crista sobra por cima.
      touca(0.97, 0.72, 0.95);
      // Crista: quatro peças altas e finas, da nuca à testa.
      for (let i = 0; i < 4; i++) {
        const meio = i === 1 || i === 2;
        pecas.push({
          id: `crista-${i}`, papel: 'cabelo',
          centro: [0, y + rcy * (1.06 + (meio ? 0.1 : 0)), -rcz * 0.62 + i * rcz * 0.36],
          raios: [rcx * 0.18 * v, rcy * (meio ? 0.76 : 0.6) * v, rcz * 0.3 * v], brilho: 0.95, ordem,
        });
      }
      break;
    case 'curto':
      touca(1.05, 0.98, 1.02);
      testa(0.5, 0.62);
      break;
    default:
      touca(1.07, 1.03, 1.05);
      testa(0.46, 0.64);
  }
  return pecas;
}

export function modeloDaPessoa(proporcoes: Proporcoes): PecaDoModelo[] {
  const { altura, ombros, cintura, quadril, peito, profundidadePeito, profundidadeCintura, profundidadeQuadril, seios, gluteos, cabeloVolume, cabeloFamilia } = proporcoes;

  // Marcos do corpo, em fração da altura — os mesmos que um ateliê usa para
  // desenhar de memória: virilha a 47%, cintura a 62%, ombro a 82%, olhos a 93%.
  const H = altura;
  const yVirilha = 0.47 * H;
  const yCintura = 0.62 * H;
  const yPeito = 0.75 * H;
  const yOmbros = 0.82 * H;
  const yPescoco = 0.86 * H;
  const yCabeca = 0.93 * H;

  const rcx = 0.044 * H;
  const rcy = 0.064 * H;
  const rcz = 0.056 * H;
  const raioBraco = Math.max(0.028, ombros * 0.19);
  const raioCoxa = quadril * 0.52;
  const raioPerna = Math.max(0.04, quadril * 0.34);
  const xPerna = quadril * 0.42;
  const xBraco = ombros * 0.93;

  const cabecaPecas: PecaDoModelo[] = [
    { id: 'cabeca', papel: 'pele', centro: [0, yCabeca, 0], raios: [rcx, rcy, rcz], brilho: 1.05, ordem: 3 },
    // Nariz: uma peça mínima que diz para onde a pessoa está olhando.
    { id: 'nariz', papel: 'pele', centro: [0, yCabeca - rcy * 0.12, rcz * 0.86], raios: [rcx * 0.15, rcy * 0.16, rcz * 0.3], brilho: 1.1, ordem: 3 },
    { id: 'pescoco', papel: 'pele', centro: [0, yPescoco, 0], raios: [rcx * 0.64, (yCabeca - rcy * 0.7 - yPescoco) * 0.7 + 0.015, rcz * 0.62], brilho: 0.95, ordem: 3 },
    ...fatiar('nuca', 'pele', [
      { y: yPescoco + 0.005, largura: rcx * 0.6, profundidade: rcz * 0.58 },
      { y: yOmbros - 0.004, largura: ombros * 0.4, profundidade: profundidadePeito * 0.5 },
    ], 10, 0.93, 3),
    ...cabelo(cabeloFamilia, { rcx, rcy, rcz, y: yCabeca }, cabeloVolume, ombros),
  ];

  // Tronco: do ombro à virilha, passando por peito, cintura e quadril. Os pontos
  // de controle são as quatro medidas da ficha; o resto é interpolação.
  const tronco = fatiar('tronco', 'roupa', [
    { y: yOmbros + 0.026 * H, largura: ombros * 0.52, profundidade: profundidadePeito * 0.6 },
    { y: yOmbros, largura: ombros, profundidade: profundidadePeito * 0.94 },
    { y: yPeito, largura: peito, profundidade: profundidadePeito },
    { y: (yPeito + yCintura) / 2, largura: (peito + cintura) / 2 * 0.98, profundidade: (profundidadePeito + profundidadeCintura) / 2 },
    { y: yCintura, largura: cintura, profundidade: profundidadeCintura },
    { y: yCintura - 0.05 * H, largura: (cintura + quadril) / 2, profundidade: (profundidadeCintura + profundidadeQuadril) / 2 },
    { y: yVirilha + 0.055 * H, largura: quadril, profundidade: profundidadeQuadril },
    { y: yVirilha, largura: quadril * 0.78, profundidade: profundidadeQuadril * 0.86 },
  ], 10, 1.02, 1);

  // Seios: duas peças no peito. O raio vem da nota; a posição, da altura e do
  // tronco — então uma pessoa alta e uma baixa não têm o peito na mesma altura.
  const seiosPecas: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `seio-${lado > 0 ? 'd' : 'e'}`, papel: 'roupa',
    centro: [lado * rcx * 0.92, yPeito - 0.012 * H, profundidadePeito * 0.72] as [number, number, number],
    raios: [seios * 0.92, seios * 0.82, seios * 1.1] as [number, number, number], brilho: 1.06, ordem: 1.4,
  }));

  // Glúteos: duas peças atrás do quadril. Aparecem no perfil e em três quartos;
  // de frente, somem atrás do corpo — como na vida.
  const gluteosPecas: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `gluteo-${lado > 0 ? 'd' : 'e'}`, papel: 'calca',
    centro: [lado * quadril * 0.52, yVirilha + 0.03 * H, -profundidadeQuadril * 0.74] as [number, number, number],
    raios: [gluteos * 1.05, gluteos * 0.95, gluteos * 1.18] as [number, number, number], brilho: 1.05, ordem: 0.9,
  }));

  // Braços: do ombro ao punho, rentes ao corpo — pele, porque manga é detalhe.
  const bracos = [1, -1].flatMap(lado => fatiar(`braco${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: yOmbros - 0.01 * H, largura: raioBraco * 1.05, profundidade: raioBraco * 1.05, x: lado * (xBraco - raioBraco * 0.2) },
    { y: yOmbros - 0.08 * H, largura: raioBraco * 1.12, profundidade: raioBraco * 1.12, x: lado * (xBraco + raioBraco * 0.16) },
    { y: yOmbros - 0.18 * H, largura: raioBraco * 0.86, profundidade: raioBraco * 0.86, x: lado * (xBraco + raioBraco * 0.3) },
    { y: yOmbros - 0.27 * H, largura: raioBraco * 0.78, profundidade: raioBraco * 0.78, x: lado * (xBraco + raioBraco * 0.36) },
    { y: yOmbros - 0.33 * H, largura: raioBraco * 0.62, profundidade: raioBraco * 0.62, x: lado * (xBraco + raioBraco * 0.4) },
  ], 10, 0.97, 2));

  const maos: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `mao-${lado > 0 ? 'd' : 'e'}`, papel: 'pele',
    centro: [lado * (xBraco + raioBraco * 0.42), yOmbros - 0.35 * H, 0] as [number, number, number],
    raios: [raioBraco * 0.66, 0.028 * H, raioBraco * 0.44] as [number, number, number], brilho: 0.92, ordem: 2,
  }));

  // Pernas: calça até a altura do joelho (o estilo de baixo pede assim) e pele
  // do joelho para baixo — é o que faz a perna ter duas cores, como numa foto.
  const calca = [1, -1].flatMap(lado => fatiar(`calca${lado > 0 ? 'd' : 'e'}`, 'calca', [
    { y: yVirilha + 0.02 * H, largura: raioCoxa, profundidade: raioCoxa * 1.02, x: lado * xPerna },
    { y: yVirilha - 0.11 * H, largura: raioCoxa * 0.94, profundidade: raioCoxa * 0.98, x: lado * (xPerna * 0.97) },
    { y: 0.30 * H, largura: raioCoxa * 0.72, profundidade: raioCoxa * 0.78, x: lado * (xPerna * 0.9) },
  ], 10, 1.0, 0));

  const pernas = [1, -1].flatMap(lado => fatiar(`perna${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: 0.31 * H, largura: raioCoxa * 0.7, profundidade: raioCoxa * 0.76, x: lado * (xPerna * 0.9) },
    { y: 0.21 * H, largura: raioCoxa * 0.74, profundidade: raioCoxa * 0.8, x: lado * (xPerna * 0.86) },
    { y: 0.1 * H, largura: raioPerna, profundidade: raioPerna * 1.1, x: lado * (xPerna * 0.82) },
    { y: 0.035 * H, largura: raioPerna * 0.82, profundidade: raioPerna * 0.95, x: lado * (xPerna * 0.8) },
  ], 10, 0.97, 0));

  const pes: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `pe-${lado > 0 ? 'd' : 'e'}`, papel: 'sapato',
    centro: [lado * (xPerna * 0.8), 0.022 * H, 0.03 * H] as [number, number, number],
    raios: [raioPerna * 0.72, 0.021 * H, 0.052 * H] as [number, number, number], brilho: 0.9, ordem: 0,
  }));

  // Cada peça recebe a inclinação em radianos, para a projeção não ter que saber
  // de graus. `graus` é a unidade da ficha; radiano é a unidade da conta.
  return [...cabecaPecas, ...tronco, ...seiosPecas, ...gluteosPecas, ...bracos, ...maos, ...calca, ...pernas, ...pes]
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
