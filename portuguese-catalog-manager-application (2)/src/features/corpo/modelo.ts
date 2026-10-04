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
interface Controle { y: number; largura: number; profundidade: number; x?: number; z?: number; espessura?: number }

function fatiar(id: string, papel: PapelDaPeca, controles: Controle[], porTrecho = 10, brilho = 1, ordem = 1): PecaDoModelo[] {
  const centros: { x: number; y: number; z: number; largura: number; profundidade: number; espessura?: number }[] = [];
  for (let trecho = 0; trecho < controles.length - 1; trecho++) {
    const de = controles[trecho], ate = controles[trecho + 1];
    for (let fatia = 0; fatia < porTrecho; fatia++) {
      const t = (fatia + 0.5) / porTrecho;
      centros.push({
        x: (de.x ?? 0) + ((ate.x ?? 0) - (de.x ?? 0)) * t,
        y: de.y + (ate.y - de.y) * t,
        // `z` desloca a fatia para a frente ou para trás: é assim que o peito
        // empurra o tronco à frente e a bunda empurra o quadril atrás, sem
        // precisar de peças soltas — que viravam bolas coladas no corpo.
        z: (de.z ?? 0) + ((ate.z ?? 0) - (de.z ?? 0)) * t,
        largura: de.largura + (ate.largura - de.largura) * t,
        profundidade: de.profundidade + (ate.profundidade - de.profundidade) * t,
        // Só os braços declaram espessura: numa peça deitada o passo entre
        // fatias é o comprimento, e usá-lo como altura daria braço de graveto.
        espessura: de.espessura === undefined && ate.espessura === undefined ? undefined
          : (de.espessura ?? ate.espessura ?? 0) + ((ate.espessura ?? de.espessura ?? 0) - (de.espessura ?? ate.espessura ?? 0)) * t,
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
      centro: [centro.x, centro.y, centro.z] as [number, number, number],
      // A sobreposição é o que transforma uma pilha de elipses em superfície
      // contínua, sem "colar de contas". O fator é alto de propósito: com pouca
      // sobreposição, a largura do corpo afina a cada meio passo e a silhueta
      // ganha um serrilhado de 40% — o contorno fica dentado, não curvo.
      raios: [centro.largura, centro.espessura ?? vizinhanca * 1.6, centro.profundidade] as [number, number, number],
      brilho, ordem,
    };
  });
}

interface MedidasDaCabeca { rcx: number; rcy: number; rcz: number; y: number }

/**
 * O cabelo de cada família de tipo. Treze desenhos que se reconhecem de longe —
 * e é aqui que duas pessoas de mesma altura e mesmas notas param de ser iguais.
 *
 * Quatro tipos de peça fazem o serviço, e quem os separa é a profundidade:
 * - **touca** — a massa presa atrás da cabeça (centro em Z negativo). A cabeça
 *   pinta por cima dela, então o que sobra é a moldura de cabelo em volta do
 *   rosto;
 * - **testa** — a faixa da testa, à frente (centro em Z positivo). Como ela fica
 *   mais perto da câmera, pinta **depois** da cabeça e desenha a linha do
 *   cabelo: é o que faz o corte curto deixar de parecer careca;
 * - **cascata** — o cabelo que desce. É uma faixa contínua de fatias muito
 *   sobrepostas, que abre um pouco para fora e arredonda a ponta. Antes eram
 *   tiras separadas, e o resultado eram placas pretas com degraus no alto;
 * - **o desenho da família** — nuvem, tranças, coque, crista.
 *
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
  // Cabelo que desce pelos lados pinta **antes** dos braços: assim ele cai atrás
  // do corpo em vez de tapar os braços, como cabelo de verdade apoiado nos ombros.
  const ordemQueDesce = 1.5;
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
   * Cascata: o cabelo que desce de cada lado da cabeça.
   *
   * O topo começa **dentro** da touca (`y + rcy * 0.7`) para não deixar degrau
   * no alto da cabeça, e a faixa abre um pouco para fora conforme desce. As
   * fatias se sobrepõem muito: é isso que faz o cabelo ser uma massa contínua e
   * não uma fileira de tiras.
   *
   * `distancia` é onde a cascata cai, em metros; `ateY`, até onde ela vai
   * (fração da altura: 0,66 é a meio das costas, 0,33 é no ombro).
   */
  const cascata = (
    lado: number, distancia: number, largura: number, ateY: number,
    profundidade = 0.62, abertura = 0.45, fatias = 12, topoFator = 0.5,
    ordemCascata = ordemQueDesce,
  ) => {
    const topo = y + rcy * 0.7;
    const passo = Math.abs(topo - ateY) / fatias;
    for (let fatia = 0; fatia < fatias; fatia++) {
      const u = (fatia + 0.5) / fatias;
      // A ponta arredonda: o cabelo afina só no último quinto do comprimento.
      // A ponta arredonda: o cabelo afina só no fim do comprimento.
      const ponta = u > 0.82 ? Math.max(0.55, 1 - (u - 0.82) * 2.2) : 1;
      // E a raiz nasce fina, **dentro** da touca: sem isso, a primeira fatia de
      // cada cascata fura o alto da cabeça e o cabelo ganha três bicos.
      const raiz = u < 0.2 ? 0.5 + u * 2.4 : 1;
      pecas.push({
        id: `cabelo-cascata-${lado > 0 ? 'd' : 'e'}-${Math.round(distancia * 1000)}-${fatia}`, papel: 'cabelo',
        centro: [lado * distancia * (topoFator + abertura * u), topo + (ateY - topo) * u, -rcz * profundidade],
        raios: [largura * ponta * v, passo * 1.85 * raiz, rcz * 0.6 * ponta * v],
        brilho: 0.88, ordem: ordemCascata,
      });
    }
  };
  /**
   * Duas cascatas de cada lado — uma junto ao rosto, outra por fora — formam um
   * penteado solto. A de dentro é mais curta e a de fora desce mais: é o que
   * deixa a barra do cabelo desigual, como cabelo de verdade, em vez de uma
   * linha reta serrilhada. E as duas abrem para fora, deixando o meio do tronco
   * à mostra — cabelo não é capa.
   */
  const solto = (ateY: number, largura: number, profundidade: number, abertura = 0.45) => {
    // A cascata de dentro nasce na altura da orelha, desce pela lateral do rosto
    // e encosta no ombro; a de fora desce mais. As duas ficam **estreitas** e
    // deslocadas para trás: de frente emolduram o rosto sem cobrir os braços, e
    // de lado caem atrás do ombro, deixando o peito e a bunda aparecerem.
    const noOmbro = ateY + rcy * 1.6;
    // Tudo isso pinta **antes** do corpo (ordem 0,5): de frente, o cabelo só
    // aparece fora da silhueta, emoldurando; de lado e de costas, ele é a massa
    // que cai atrás. É cabelo apoiado no ombro, não tira colada no peito.
    cascata(1, ombreira * 0.82, largura * 0.62, noOmbro, profundidade + 0.06, abertura, 12, 0.7, 0.5);
    cascata(-1, ombreira * 0.82, largura * 0.62, noOmbro, profundidade + 0.06, abertura, 12, 0.7, 0.5);
    cascata(1, ombreira * 0.95, largura * 0.52, ateY, profundidade + 0.3, abertura * 0.4, 12, 0.6, 0.5);
    cascata(-1, ombreira * 0.95, largura * 0.52, ateY, profundidade + 0.3, abertura * 0.4, 12, 0.6, 0.5);
    // E uma massa larga **atrás do corpo**: de costas é cabelo até onde o
    // penteado pedir; de frente, o corpo cobre — como na vida.
    cascata(1, ombreira * 0.44, largura * 0.72, ateY, profundidade + 0.42, 0.2, 12, 0.42, 0.5);
    cascata(-1, ombreira * 0.44, largura * 0.72, ateY, profundidade + 0.42, 0.2, 12, 0.42, 0.5);
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
      pecas.push({ id: 'cabelo-nuvem', papel: 'cabelo', centro: [0, y + rcy * 0.42, -rcz * 0.08], raios: [rcx * 1.66 * v, rcy * 1.32 * v, rcz * 1.5 * v], brilho: 0.92, ordem });
      bolinhas(9, 1.62, rcx * 0.5);
      break;
    case 'crespo':
      touca(1.04, 1.0, 1.04);
      pecas.push({ id: 'cabelo-nuvem', papel: 'cabelo', centro: [0, y + rcy * 0.3, -rcz * 0.1], raios: [rcx * 1.48 * v, rcy * 1.24 * v, rcz * 1.34 * v], brilho: 0.92, ordem });
      bolinhas(10, 1.48, rcx * 0.42);
      break;
    case 'cacheado':
      touca(1.06, 1.02, 1.05);
      testa(0.52, 0.62);
      bolinhas(11, 1.42, rcx * 0.36);
      solto(0.72 * (y / 0.93), rcx * 0.42, 0.66, 0.3);
      break;
    case 'ondulado':
      touca(1.08, 1.03, 1.06);
      testa(0.46, 0.62);
      solto(0.7 * (y / 0.93), rcx * 0.4, 0.68, 0.5);
      break;
    case 'longo':
      touca(1.08, 1.03, 1.06);
      testa(0.5, 0.6);
      solto(0.645 * (y / 0.93), rcx * 0.42, 0.68, 0.34);
      // E o cabelo continua descendo pelas costas, abaixo da cintura.
      cascata(1, ombreira * 0.46, rcx * 0.4, 0.58 * (y / 0.93), 1.05, 0.24, 10, 0.4, 0.5);
      cascata(-1, ombreira * 0.46, rcx * 0.4, 0.58 * (y / 0.93), 1.05, 0.24, 10, 0.4, 0.5);
      break;
    case 'medio':
      touca(1.08, 1.0, 1.05);
      testa(0.52, 0.6);
      solto(0.73 * (y / 0.93), rcx * 0.4, 0.66, 0.36);
      break;
    case 'preso':
      touca(1.05, 0.97, 1.02);
      // Cabelo puxado: a linha do cabelo sobe e o nó fica na nuca.
      testa(0.62, 0.56);
      pecas.push({ id: 'cabelo-coque', papel: 'cabelo', centro: [0, y + rcy * 0.42, -rcz * 1.15], raios: [rcx * 0.52 * v, rcy * 0.62 * v, rcz * 0.6 * v], brilho: 0.9, ordem });
      cascata(1, ombreira * 0.42, rcx * 0.28, 0.8 * (y / 0.93), 0.86, 0.12, 6);
      cascata(-1, ombreira * 0.42, rcx * 0.28, 0.8 * (y / 0.93), 0.86, 0.12, 6);
      break;
    case 'trancado':
      touca(1.05, 1.0, 1.03);
      testa(0.54, 0.6);
      // Cada trança é uma mecha fina e comprida: dá para contar as cinco de longe.
      // Como as cascatas, elas saem em pares — nenhuma trança nasce no meio do rosto.
      for (let i = 0; i < 5; i++) {
        const lado = i % 2 === 0 ? 1 : -1;
        const nivel = Math.floor(i / 2) / 2;                          // 0 · 0,5 · 1
        const afastamento = 0.42 + 0.58 * nivel;
        const x = lado * rcx * 1.4 * afastamento;
        const fatias = 7;
        const topoTranca = y + rcy * 0.5, fundoTranca = 0.63 * (y / 0.93);
        for (let fatia = 0; fatia < fatias; fatia++) {
          const u = (fatia + 0.5) / fatias;
          pecas.push({
            id: `tranca-${i}-${fatia}`, papel: 'cabelo',
            centro: [x * (1 + u * 0.05), topoTranca + (fundoTranca - topoTranca) * u, -rcz * (0.85 + afastamento * 0.2)],
            raios: [rcx * 0.14 * v, Math.abs(fundoTranca - topoTranca) / fatias * 1.7, rcz * 0.18 * v], brilho: 0.88, ordem: ordemQueDesce,
          });
        }
      }
      break;
    case 'franja':
      touca(1.08, 1.03, 1.06);
      // Franja: uma faixa reta na testa, na frente do rosto.
      pecas.push({ id: 'cabelo-franja', papel: 'cabelo', centro: [0, y + rcy * 0.55, rcz * 0.62], raios: [rcx * 1.0 * vc, rcy * 0.5 * vc, rcz * 0.42 * vc], brilho: 0.95, ordem });
      solto(0.7 * (y / 0.93), rcx * 0.4, 0.66, 0.3);
      break;
    case 'mullet':
      touca(1.06, 1.0, 1.04);
      testa(0.58, 0.56);
      solto(0.75 * (y / 0.93), rcx * 0.38, 0.64, 0.16);
      break;
    case 'moicano':
      // Laterais raspadas: a touca fica baixa e só a crista sobra por cima.
      touca(0.97, 0.72, 0.95);
      // Crista: quatro peças altas e finas, da nuca à testa.
      for (let i = 0; i < 4; i++) {
        const meio = i === 1 || i === 2;
        pecas.push({
          id: `crista-${i}`, papel: 'cabelo',
          centro: [0, y + rcy * (1.1 + (meio ? 0.14 : 0)), -rcz * 0.62 + i * rcz * 0.36],
          raios: [rcx * 0.19 * v, rcy * (meio ? 0.92 : 0.72) * v, rcz * 0.32 * v], brilho: 0.95, ordem,
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

  // Cabeça: 7,5 cabeças de altura (a proporção clássica de ateliê) e um pouco
  // mais estreita que isso — cabeça grande é o jeito mais rápido de o manequim
  // parecer um boneco de brinquedo.
  const rcx = 0.0415 * H;
  const rcy = 0.0645 * H;
  const rcz = 0.05 * H;
  const raioBraco = Math.max(0.032, ombros * 0.24);
  const raioCoxa = quadril * 0.5;
  const raioPerna = Math.max(0.034, quadril * 0.28);
  const raioTornozelo = Math.max(0.028, quadril * 0.22);
  const xPerna = quadril * 0.46;
  const xBraco = ombros * 0.9;

  const cabecaPecas: PecaDoModelo[] = [
    { id: 'cabeca', papel: 'pele', centro: [0, yCabeca, 0], raios: [rcx, rcy, rcz], brilho: 1.05, ordem: 3 },
    // Nariz: uma peça mínima que diz para onde a pessoa está olhando.
    { id: 'nariz', papel: 'pele', centro: [0, yCabeca - rcy * 0.12, rcz * 0.86], raios: [rcx * 0.15, rcy * 0.16, rcz * 0.3], brilho: 1.1, ordem: 3 },
    { id: 'pescoco', papel: 'pele', centro: [0, yPescoco, 0], raios: [rcx * 0.46, (yCabeca - rcy * 0.7 - yPescoco) * 0.7 + 0.014, rcz * 0.44], brilho: 0.95, ordem: 3 },
    ...fatiar('nuca', 'pele', [
      { y: yPescoco + 0.005, largura: rcx * 0.6, profundidade: rcz * 0.58 },
      { y: yOmbros - 0.004, largura: ombros * 0.4, profundidade: profundidadePeito * 0.5 },
    ], 10, 0.93, 3),
    ...cabelo(cabeloFamilia, { rcx, rcy, rcz, y: yCabeca }, cabeloVolume, ombros),
  ];

  // Tronco: do ombro à cintura, onde a peça de cima termina. Os pontos de
  // controle são as medidas da ficha; o resto é interpolação.
  const tronco = fatiar('tronco', 'roupa', [
    { y: yOmbros + 0.026 * H, largura: ombros * 0.52, profundidade: profundidadePeito * 0.6 },
    { y: yOmbros, largura: ombros, profundidade: profundidadePeito * 0.94, z: profundidadePeito * 0.04 },
    // No peito a peça de cima avança um pouco: é a caixa do tórax. O volume do
    // busto vem das cúpulas, logo abaixo — assim ele é volume, não bola colada.
    { y: yPeito, largura: peito, profundidade: profundidadePeito * 0.96, z: profundidadePeito * 0.06 },
    { y: (yPeito + yCintura) / 2, largura: (peito + cintura) / 2 * 0.98, profundidade: (profundidadePeito + profundidadeCintura) / 2, z: profundidadePeito * 0.02 },
    { y: yCintura, largura: cintura, profundidade: profundidadeCintura },
  ], 10, 1.02, 1);

  // Quadril: a peça de baixo começa na cintura e desce até a virilha, passando
  // pela medida do quadril. Antes o tronco descia até a virilha e a peça de cima
  // virava túnica — o quadril, que é uma das medidas da ficha, não aparecia.
  const quadrilPeca = fatiar('quadril', 'calca', [
    { y: yCintura + 0.004 * H, largura: cintura, profundidade: profundidadeCintura },
    { y: yCintura - 0.045 * H, largura: (cintura + quadril) / 2, profundidade: (profundidadeCintura + profundidadeQuadril) / 2, z: -profundidadeQuadril * 0.04 },
    // A bunda vive aqui: o quadril desloca para trás e ganha fundo. É a curva
    // do perfil — o aperto da cintura em cima e a coxa descendo embaixo.
    { y: yVirilha + 0.055 * H, largura: quadril, profundidade: profundidadeQuadril * 1.02, z: -profundidadeQuadril * 0.1 },
    { y: yVirilha + 0.006 * H, largura: quadril * 0.86, profundidade: profundidadeQuadril * 0.86, z: -profundidadeQuadril * 0.02 },
  ], 10, 1.0, 0.55);

  // Seios: duas peças no peito. O raio vem da nota; a posição, da altura e do
  // tronco — então uma pessoa alta e uma baixa não têm o peito na mesma altura.
  const seiosPecas: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `seio-${lado > 0 ? 'd' : 'e'}`, papel: 'roupa',
    // A cúpula fica com o centro **dentro** do tórax e só a frente de fora: o que
    // aparece no perfil é um peito cheio, sem bolinha pendurada.
    centro: [lado * rcx * 0.82, yPeito - 0.004 * H, profundidadePeito * 0.6 + seios * 0.72] as [number, number, number],
    raios: [seios * 1.2, seios * 1.35, seios * 0.92] as [number, number, number], brilho: 1.04, ordem: 1.4,
  }));

  // Glúteos: duas peças atrás do quadril. Aparecem no perfil e em três quartos;
  // de frente, somem atrás do corpo — como na vida.
  const gluteosPecas: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `gluteo-${lado > 0 ? 'd' : 'e'}`, papel: 'calca',
    centro: [lado * quadril * 0.42, yVirilha + 0.02 * H, -profundidadeQuadril * 0.45 - gluteos * 0.62] as [number, number, number],
    raios: [gluteos * 1.1, gluteos * 1.55, gluteos * 0.85] as [number, number, number], brilho: 1.0, ordem: 0.9,
  }));

  // Braços: do ombro ao punho, rentes ao corpo — pele, porque manga é detalhe.
  // Braços **em T**: saem do ombro na horizontal, com uma queda leve, até a
  // ponta dos dedos. É a pose de manequim: o corpo fica todo à vista, e no
  // perfil o braço não atravessa o peito nem esconde a bunda.
  const comprimentoBraco = 0.35 * H;
  const quedaBraco = comprimentoBraco * 0.12;
  const passoBraco = raioBraco * 0.55;
  const bracos = [1, -1].flatMap(lado => fatiar(`braco${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: yOmbros - 0.002 * H, largura: passoBraco, profundidade: raioBraco * 1.02, espessura: raioBraco * 1.02, x: lado * (xBraco - raioBraco * 0.55) },
    { y: yOmbros - quedaBraco * 0.3, largura: passoBraco, profundidade: raioBraco * 0.92, espessura: raioBraco * 0.92, x: lado * (xBraco + comprimentoBraco * 0.3) },
    { y: yOmbros - quedaBraco * 0.55, largura: passoBraco, profundidade: raioBraco * 0.8, espessura: raioBraco * 0.8, x: lado * (xBraco + comprimentoBraco * 0.56) },
    { y: yOmbros - quedaBraco * 0.8, largura: passoBraco, profundidade: raioBraco * 0.68, espessura: raioBraco * 0.68, x: lado * (xBraco + comprimentoBraco * 0.8) },
    { y: yOmbros - quedaBraco, largura: passoBraco, profundidade: raioBraco * 0.6, espessura: raioBraco * 0.6, x: lado * (xBraco + comprimentoBraco) },
  ], 14, 0.97, 2));

  const maos: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `mao-${lado > 0 ? 'd' : 'e'}`, papel: 'pele',
    centro: [lado * (xBraco + comprimentoBraco * 1.05), yOmbros - quedaBraco * 1.02, 0] as [number, number, number],
    raios: [raioBraco * 0.8, raioBraco * 0.62, raioBraco * 0.34] as [number, number, number], brilho: 0.92, ordem: 2,
  }));

  // Pernas de pele: da coxa ao tornozelo. Ficam sempre desenhadas, e a peça de
  // baixo pinta por cima — assim a barra curta mostra perna e a comprida mostra
  // calça, sem vão nenhum na emenda.
  const pernas = [1, -1].flatMap(lado => fatiar(`perna${lado > 0 ? 'd' : 'e'}`, 'pele', [
    { y: yVirilha + 0.02 * H, largura: raioCoxa * 0.8, profundidade: raioCoxa * 0.84, x: lado * (xPerna * 0.98) },
    { y: 0.30 * H, largura: raioCoxa * 0.7, profundidade: raioCoxa * 0.76, x: lado * (xPerna * 0.9) },
    { y: 0.21 * H, largura: raioCoxa * 0.7, profundidade: raioCoxa * 0.76, x: lado * (xPerna * 0.86) },
    { y: 0.1 * H, largura: raioPerna, profundidade: raioPerna * 1.05, x: lado * (xPerna * 0.82) },
    { y: 0.035 * H, largura: raioTornozelo, profundidade: raioTornozelo * 0.95, x: lado * (xPerna * 0.8) },
  ], 10, 0.97, 0));

  // Peça de baixo: calça comprida, calça larga, bermuda ou saia — quem decide é
  // o estilo de roupa da ficha (`barraDaCalca` e `folgaDaBarra`). É o que faz
  // uma pessoa de calça e outra de saia serem reconhecíveis de longe.
  const yBarra = Math.max(0.055, Math.min(0.46, proporcoes.barraDaCalca)) * H;
  const folga = Math.max(0.9, Math.min(1.8, proporcoes.folgaDaBarra));
  const yMeio = Math.max(yBarra + 0.02 * H, yVirilha - 0.11 * H);
  const calca = [1, -1].flatMap(lado => fatiar(`calca${lado > 0 ? 'd' : 'e'}`, 'calca', [
    { y: yVirilha + 0.035 * H, largura: raioCoxa * 1.05, profundidade: raioCoxa * 0.96, x: lado * xPerna },
    { y: yVirilha - 0.02 * H, largura: raioCoxa * 1.02, profundidade: raioCoxa * 0.9, x: lado * (xPerna * 0.98) },
    { y: yMeio, largura: (raioCoxa * 0.82 + raioPerna * folga) / 2, profundidade: (raioCoxa * 0.72 + raioPerna * folga * 0.9) / 2, x: lado * (xPerna * 0.94) },
    { y: yBarra, largura: raioTornozelo * folga * 1.5, profundidade: raioTornozelo * folga * 1.35, x: lado * (xPerna * 0.9) },
  // 0,6: a calça pinta depois da perna (mesma cor de pele por baixo) e antes do
  // tronco, e os glúteos fecham por cima, no lugar certo.
  ], 10, 1.0, 0.6));

  // Sapatos: um pé pequeno e achatado, apontando para a frente. Antes eles eram
  // bolas de 4 cm de altura e 9 cm de comprimento — dois borrões pretos no chão.
  const pes: PecaDoModelo[] = [1, -1].map(lado => ({
    id: `pe-${lado > 0 ? 'd' : 'e'}`, papel: 'sapato',
    centro: [lado * (xPerna * 0.82), 0.012 * H, 0.024 * H] as [number, number, number],
    raios: [raioPerna * 0.72, 0.012 * H, 0.046 * H] as [number, number, number], brilho: 0.9, ordem: 0.9,
  }));

  // Cada peça recebe a inclinação em radianos, para a projeção não ter que saber
  // de graus. `graus` é a unidade da ficha; radiano é a unidade da conta.
  return [...cabecaPecas, ...tronco, ...seiosPecas, ...quadrilPeca, ...gluteosPecas, ...bracos, ...maos, ...pernas, ...calca, ...pes]
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
