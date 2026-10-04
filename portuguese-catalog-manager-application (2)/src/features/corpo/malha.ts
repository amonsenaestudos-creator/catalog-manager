/**
 * Malha do corpo — superfície 3D contínua.
 *
 * O desenho antigo empilhava elipses achatadas: a silhueta saía com degraus e a
 * figura parecia recorte de papel. Aqui o corpo é uma **malha de triângulos de
 * verdade**: cada parte é uma superfície paramétrica suave, o peito e a bunda
 * são relevos na própria superfície do tronco (não bolas coladas por fora), e a
 * roupa é pintada nas faces por região, com o corpo inflado onde há tecido.
 *
 * Convenções: metros, Y para cima, origem entre os pés, pessoa olhando para +Z.
 * O eixo X é a largura, o Z é a profundidade. Ângulo `v` das seções: 0 na
 * **frente** (+Z), π/2 no lado, π atrás.
 *
 * Nada aqui conhece tela, canvas ou navegador: é aritmética pura, e é por isso
 * que o conferidor fora do navegador desenha exatamente o que o app desenha.
 */
import type { FamiliaDeCabelo } from './aparencia';
import type { Proporcoes } from './metricas';

export type Material = 'pele' | 'cabelo' | 'topo' | 'baixo' | 'sapato' | 'olho' | 'boca' | 'sobrancelha';

/** A ordem aqui é a codificação usada na malha (1 byte por triângulo). */
export const MATERIAIS: readonly Material[] = ['pele', 'cabelo', 'topo', 'baixo', 'sapato', 'olho', 'boca', 'sobrancelha'];

export type Ponto = [number, number, number];

export interface Malha {
  posicoes: Float32Array;
  normais: Float32Array;
  /** Três índices por triângulo. */
  indices: Uint32Array;
  /** Um material por triângulo. */
  materiais: Uint8Array;
  /** 1 quando a face pertence a uma casca aberta (saia, cabelo): vale dos dois lados. */
  cascas: Uint8Array;
  /** Altura total desenhada, para a sombra de contato. */
  altura: number;
  /** Meia-largura máxima: usada para enquadrar a figura na vista. */
  meiaLargura: number;
}

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- perfis -- */

/**
 * Catmull-Rom: passa por todos os pontos de controle com curva contínua. É o
 * que faz a silhueta ser uma curva de gente em vez de uma sequência de retas.
 */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Um perfil é um conjunto de canais (ex.: y, raio x, raio z, deslocamento z). */
type Perfil = number[][];

/** Valor de cada canal em `t` (0 no primeiro controle, 1 no último). */
function perfilEm(perfil: Perfil, t: number): number[] {
  const ultimo = perfil[0].length - 1;
  const x = Math.max(0, Math.min(1, t)) * ultimo;
  const i = Math.min(ultimo - 1, Math.floor(x));
  const f = x - i;
  return perfil.map(canal => {
    const p0 = canal[Math.max(0, i - 1)], p1 = canal[i], p2 = canal[i + 1], p3 = canal[Math.min(ultimo, i + 2)];
    return catmull(p0, p1, p2, p3, f);
  });
}

/** Curva de transição suave entre 0 e 1 (para barra de roupa, gola, pálpebra). */
function suave(de: number, ate: number, x: number) {
  if (de === ate) return x < de ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - de) / (ate - de)));
  return t * t * (3 - 2 * t);
}

const gauss = (x: number, centro: number, largura: number) => Math.exp(-((x - centro) ** 2) / (2 * largura * largura));

/** Menor distância angular entre dois ângulos, em radianos (sempre positiva). */
function distanciaAngular(a: number, b: number) {
  const d = Math.abs(a - b) % TAU;
  return d > Math.PI ? TAU - d : d;
}

/* ------------------------------------------------------------ construtor -- */

interface OpcoesDaParte {
  /** Ponto de referência: a normal de cada vértice aponta para fora dele. */
  origem: Ponto;
  /** Casca aberta (saia, cabelo): desenha dos dois lados, sem descartar verso. */
  casca?: boolean;
}

class Construtor {
  private posicoes: number[] = [];
  private normais: number[] = [];
  private indices: number[] = [];
  private materiais: number[] = [];
  private cascas: number[] = [];

  /**
   * Uma superfície: `ponto(u, v)` com u de 0 a 1 ao longo e v dando a volta.
   * `material(u, v, p)` decide a cor da face. As normais saem da média das
   * faces vizinhas — sombreado liso, sem aresta falsa.
   */
  parte(
    nU: number, nV: number,
    ponto: (u: number, v: number) => Ponto,
    material: (u: number, v: number, p: Ponto) => Material,
    opcoes: OpcoesDaParte,
  ) {
    const inicio = this.posicoes.length / 3;
    const triInicio = this.indices.length / 3;
    for (let i = 0; i <= nU; i++) {
      for (let j = 0; j < nV; j++) {
        const p = ponto(i / nU, j / nV);
        this.posicoes.push(p[0], p[1], p[2]);
      }
    }
    const coluna = (i: number, j: number) => inicio + i * nV + ((j % nV) + nV) % nV;
    const casca = opcoes.casca ? 1 : 0;
    for (let i = 0; i < nU; i++) {
      for (let j = 0; j < nV; j++) {
        const a = coluna(i, j), b = coluna(i, j + 1), c = coluna(i + 1, j + 1), d = coluna(i + 1, j);
        const centro = ponto((i + 0.5) / nU, (j + 0.5) / nV);
        const codigo = MATERIAIS.indexOf(material((i + 0.5) / nU, (j + 0.5) / nV, centro));
        this.indices.push(a, b, c, a, c, d);
        this.materiais.push(codigo, codigo);
        this.cascas.push(casca, casca);
      }
    }
    this.orientar(inicio, triInicio, opcoes.origem);
  }

  /**
   * Média das normais das faces de cada vértice e conferência do lado: se a
   * normal média aponta para dentro (em relação ao ponto de referência da
   * parte), inverte o lado da parte inteira — normal e ordem dos índices, para
   * o descarte de verso continuar certo.
   */
  private orientar(verticeInicio: number, triInicio: number, origem: Ponto) {
    const total = this.posicoes.length / 3;
    const soma = new Float64Array((total - verticeInicio) * 3);
    let lado = 0;
    for (let t = triInicio; t < this.indices.length / 3; t++) {
      const a = this.indices[t * 3] - verticeInicio, b = this.indices[t * 3 + 1] - verticeInicio, c = this.indices[t * 3 + 2] - verticeInicio;
      const ax = this.posicoes[(verticeInicio + a) * 3], ay = this.posicoes[(verticeInicio + a) * 3 + 1], az = this.posicoes[(verticeInicio + a) * 3 + 2];
      const bx = this.posicoes[(verticeInicio + b) * 3], by = this.posicoes[(verticeInicio + b) * 3 + 1], bz = this.posicoes[(verticeInicio + b) * 3 + 2];
      const cx = this.posicoes[(verticeInicio + c) * 3], cy = this.posicoes[(verticeInicio + c) * 3 + 1], cz = this.posicoes[(verticeInicio + c) * 3 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const i of [a, b, c]) { soma[i * 3] += nx; soma[i * 3 + 1] += ny; soma[i * 3 + 2] += nz; }
      const meio = [(ax + bx + cx) / 3 - origem[0], (ay + by + cy) / 3 - origem[1], (az + bz + cz) / 3 - origem[2]];
      lado += nx * meio[0] + ny * meio[1] + nz * meio[2];
    }
    const inverte = lado < 0;
    for (let i = verticeInicio; i < total; i++) {
      const k = (i - verticeInicio) * 3;
      const comprimento = Math.hypot(soma[k], soma[k + 1], soma[k + 2]) || 1;
      const sinal = inverte ? -1 : 1;
      this.normais.push((sinal * soma[k]) / comprimento, (sinal * soma[k + 1]) / comprimento, (sinal * soma[k + 2]) / comprimento);
    }
    if (inverte) {
      for (let t = triInicio; t < this.indices.length / 3; t++) {
        const b = this.indices[t * 3 + 1];
        this.indices[t * 3 + 1] = this.indices[t * 3 + 2];
        this.indices[t * 3 + 2] = b;
      }
    }
  }

  concluir(): Malha {
    let maiorY = 0, meiaLargura = 0;
    for (let i = 0; i < this.posicoes.length; i += 3) {
      maiorY = Math.max(maiorY, this.posicoes[i + 1]);
      meiaLargura = Math.max(meiaLargura, Math.abs(this.posicoes[i]));
    }
    return {
      posicoes: new Float32Array(this.posicoes),
      normais: new Float32Array(this.normais),
      indices: new Uint32Array(this.indices),
      materiais: new Uint8Array(this.materiais),
      cascas: new Uint8Array(this.cascas),
      altura: maiorY,
      meiaLargura,
    };
  }
}

/* -------------------------------------------------------------- cabelos -- */

interface Penteado {
  /** Quanto o cabelo desce abaixo da linha do cabelo, em fração da altura. */
  comprimento: number;
  /** Espessura da massa em relação à cabeça (1 = justo). */
  volume: number;
  /** Onda em vez de fio liso: ondula a queda (0 a 1). */
  onda: number;
  /** Nuvem em volta da cabeça (afro, crespo, cacheado): raio da nuvem. */
  nuvem: number;
  /** Número de tranças que descem pelas costas. */
  trancas: number;
  /** Coque na nuca. */
  coque: boolean;
  /** Altura da crista (moicano), em fração da altura. */
  crista: number;
  /** A franja cobre a testa? */
  franja: boolean;
}

const PENTEADOS: Record<FamiliaDeCabelo, Penteado> = {
  padrao: { comprimento: 0.1, volume: 1.0, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: true },
  curto: { comprimento: 0.02, volume: 0.94, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: false },
  medio: { comprimento: 0.15, volume: 1.0, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: true },
  longo: { comprimento: 0.3, volume: 1.04, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: true },
  ondulado: { comprimento: 0.28, volume: 1.12, onda: 0.6, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: true },
  cacheado: { comprimento: 0.1, volume: 1.2, onda: 0.4, nuvem: 0.018, trancas: 0, coque: false, crista: 0, franja: false },
  crespo: { comprimento: 0.06, volume: 1.28, onda: 0.5, nuvem: 0.027, trancas: 0, coque: false, crista: 0, franja: false },
  afro: { comprimento: 0.05, volume: 1.36, onda: 0.4, nuvem: 0.04, trancas: 0, coque: false, crista: 0, franja: false },
  trancado: { comprimento: 0.32, volume: 1.02, onda: 0, nuvem: 0, trancas: 7, coque: false, crista: 0, franja: false },
  preso: { comprimento: 0.0, volume: 0.96, onda: 0, nuvem: 0, trancas: 0, coque: true, crista: 0, franja: false },
  franja: { comprimento: 0.13, volume: 1.0, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: true },
  mullet: { comprimento: 0.17, volume: 1.02, onda: 0.2, nuvem: 0, trancas: 0, coque: false, crista: 0, franja: false },
  moicano: { comprimento: 0.015, volume: 0.9, onda: 0, nuvem: 0, trancas: 0, coque: false, crista: 0.055, franja: false },
};

/* --------------------------------------------------------------- pessoas -- */

export interface AjustesDaMalha {
  /** 1 = normal; 0,6 = malha leve, para girar rápido. */
  detalhe?: number;
}

export function malhaDaPessoa(proporcoes: Proporcoes, ajustes: AjustesDaMalha = {}): Malha {
  const d = Math.max(0.55, Math.min(1.5, ajustes.detalhe ?? 1));
  /** Número de divisões, com o detalhe aplicado e um mínimo que não deforma. */
  const n = (base: number) => Math.max(6, Math.round(base * d));
  const H = proporcoes.altura;
  const {
    ombros, cintura, quadril, peito, seios, gluteos, volume,
    profundidadePeito: profPeito, profundidadeCintura: profCintura, profundidadeQuadril: profQuadril,
    cabeloVolume, cabeloFamilia, mangaDaBlusa, topoAte, ajusteDaRoupa,
    barraDaCalca, folgaDaBarra, saia, bota,
  } = proporcoes;

  const c = new Construtor();

  /* ---------------------------------------------------------- cotas do corpo */
  const yQuadril = 0.53 * H;
  const yCintura = 0.63 * H;
  const yPeito = 0.735 * H;
  const yOmbro = 0.83 * H;
  const yPescoco = 0.855 * H;
  const yTopo = 1.0 * H;
  const yBarra = Math.max(0.05, barraDaCalca) * H;
  const yBota = bota ? 0.1 * H : 0;

  /* ------------------------------------------------------------------ tronco */
  // Perfil do tronco: quadril → cintura → peito → ombros → base do pescoço.
  // Os controles são as medidas da ficha (larguras e profundidades lidas).
  // As larguras e profundidades reais entram canal por canal: cada canal é uma
  // sequência de medidas em metros, na ordem das alturas.
  const larguraTronco: Perfil = [
    [0.44, 0.47, 0.5, 0.53, 0.57, 0.63, 0.685, 0.735, 0.775, 0.81, 0.832, 0.848, 0.86].map(f => f * H),
    [quadril * 0.42, quadril * 0.62, quadril * 0.8, quadril * 0.92, quadril * 1.0, cintura, (cintura + peito) / 2 * 1.02, peito * 0.99, peito * 0.96, ombros * 1.0, ombros * 0.92, ombros * 0.62, ombros * 0.34],
    [profQuadril * 0.44, profQuadril * 0.62, profQuadril * 0.8, profQuadril * 0.92, profQuadril * 1.0, profCintura, (profCintura + profPeito) / 2, profPeito * 0.98, profPeito * 0.9, profPeito * 0.78, profPeito * 0.66, profPeito * 0.52, profPeito * 0.42],
    [0, -profQuadril * 0.02, -profQuadril * 0.04, -profQuadril * 0.05, -profQuadril * 0.03, profCintura * 0.04, profPeito * 0.07, profPeito * 0.06, profPeito * 0.04, profPeito * 0.02, 0, 0, 0],
  ];
  /**
   * Relevo do tronco: seios, bunda e barriga nascem da própria superfície, não
   * de peças coladas por fora. O peito cresce para a **frente** e a bunda para
   * **trás** — se crescessem de lado, o corpo engordaria em vez de ganhar curva.
   */
  const relevoDoTronco = (y: number, theta: number): [number, number] => {
    const frente = Math.max(0, Math.cos(theta));
    const atras = Math.max(0, -Math.cos(theta));
    let paraFrente = 0, paraFora = 0;
    // Seios: dois volumes na frente, um de cada lado do esterno.
    const pertoDoSeio = Math.min(distanciaAngular(theta, 0.66), distanciaAngular(theta, -0.66));
    const alturaDoSeio = gauss(y, yPeito - 0.004 * H, 0.05 * H);
    const forcaDoSeio = gauss(pertoDoSeio, 0, 0.34) * alturaDoSeio * frente * (seios / Math.max(0.02, profPeito));
    paraFrente += forcaDoSeio * 1.25;
    paraFora += forcaDoSeio * 0.1;
    // Bunda: dois volumes atrás, na altura do quadril, com transição larga.
    const pertoDoGluteo = Math.min(distanciaAngular(theta, Math.PI - 0.55), distanciaAngular(theta, Math.PI + 0.55));
    const alturaDoGluteo = gauss(y, yQuadril + 0.004 * H, 0.075 * H);
    const forcaDoGluteo = gauss(pertoDoGluteo, 0, 0.52) * alturaDoGluteo * atras * (gluteos / Math.max(0.02, profQuadril));
    paraFora += forcaDoGluteo * 1.0;
    paraFrente += forcaDoGluteo * 0.06;
    // Barriga: gente com mais volume tem barriga, e a barriga aparece no perfil.
    paraFrente += gauss(y, yCintura + 0.02 * H, 0.06 * H) * frente * Math.max(0, volume - 1) * 0.42;
    return [paraFrente, paraFora];
  };

  /** Infla o corpo onde há tecido: é o que faz a roupa ter volume, não cor chapada. */
  /**
   * A gola: mais alta em cima dos ombros, mais baixa no meio do peito — um
   * decote redondo, não um quadrado de alças. Depende de x e z, e não só da
   * altura, porque é assim que uma gola de verdade se comporta.
   */
  const golaEm = (x: number, z: number, y: number) => {
    void y;
    // Gola ampla e lisa: quanto mais perto do pescoço e da frente, mais baixa.
    // Gaussiana larga e sem quina: gola estreita faz babado na borda do tecido.
    const pertoDoPescoco = Math.exp(-((x / (ombros * 0.72)) ** 2));
    const naFrente = Math.max(0, z / Math.max(0.01, profPeito));
    return (0.852 - 0.05 * pertoDoPescoco * (0.25 + 0.75 * naFrente)) * H;
  };
  const inflarTronco = (y: number, z: number, x: number) => {
    const gola = golaEm(x, z, y);
    const dentroDaBlusa = suave(topoAte * H - 0.01 * H, topoAte * H + 0.01 * H, y) * (1 - suave(gola - 0.01 * H, gola + 0.01 * H, y));
    const calca = 1 - suave(yCintura - 0.004 * H, yCintura + 0.01 * H, y);
    const fator = Math.max(dentroDaBlusa, saia ? calca * 0.6 : calca);
    return 1 + (ajusteDaRoupa - 1) * fator;
  };

  /** A cor da face: pele, blusa (topo) ou peça de baixo, por região. */
  const materialDoTronco = (y: number, z: number, x: number): Material => {
    const gola = golaEm(x, z, y);
    const blusaPorFora = topoAte * H < yCintura - 0.012 * H;
    if (blusaPorFora) {
      if (y <= gola && y >= topoAte * H) return 'topo';
      if (y <= yCintura) return 'baixo';
      return 'pele';
    }
    if (y <= yCintura + 0.005 * H) return 'baixo';
    if (y <= gola && y >= topoAte * H) return 'topo';
    return 'pele';
  };

  // Resolução alta de propósito: a gola é uma curva, e a borda do tecido é
  // decidida por face — com poucas divisões ela vira escada.
  const nTronco = n(64);
  c.parte(nTronco, n(72), (u, v) => {
    const [y, rx, rz, cz] = perfilEm(larguraTronco, u);
    const theta = v * TAU;
    const [paraFrente, paraFora] = relevoDoTronco(y, theta);
    const xDaFace = Math.sin(theta) * rx;
    const escala = inflarTronco(y, cz + Math.cos(theta) * rz, xDaFace);
    // `paraFora` engorda a seção; `paraFrente` empurra só o lado da frente (ou
    // de trás): é o que faz peito e bunda aparecerem no perfil, não na largura.
    const raioX = rx * (1 + paraFora) * escala;
    const raioZ = rz * (1 + paraFora) * escala;
    const empurrao = Math.cos(theta) >= 0 ? Math.max(0, paraFrente) : Math.min(0, paraFrente);
    return [Math.sin(theta) * raioX, y, cz + Math.cos(theta) * raioZ + empurrao * rz];
  }, (_u, _v, p) => materialDoTronco(p[1], p[2], p[0]), { origem: [0, 0.65 * H, 0] });

  /* ---------------------------------------------------------------- pescoço */
  const nPescoco = n(7);
  c.parte(nPescoco, n(20), (u, v) => {
    const y = (yPescoco - 0.02 * H) + u * (0.028 * H);
    const r = (0.032 + 0.006 * (1 - Math.abs(u - 0.5) * 2)) * H;
    const theta = v * TAU;
    return [Math.sin(theta) * r * 0.95, y, Math.cos(theta) * r * 1.05];
  }, () => 'pele', { origem: [0, yPescoco, 0] });

  /* ------------------------------------------------------------------ cabeça */
  // Perfil do rosto: queixo estreito, maçãs do rosto, têmporas, crânio. É o que
  // faz a cabeça ser uma cabeça — e não uma bola em cima do pescoço.
  const perfilCabeca: Perfil = [
    [0.868, 0.878, 0.892, 0.908, 0.922, 0.936, 0.95, 0.965, 0.98, 0.992, 1.0].map(f => f * H),
    [0.014, 0.03, 0.038, 0.043, 0.046, 0.047, 0.046, 0.044, 0.038, 0.026, 0.008].map(f => f * H),
    [0.02, 0.038, 0.048, 0.054, 0.057, 0.058, 0.057, 0.054, 0.046, 0.032, 0.01].map(f => f * H),
    [0.008, 0.006, 0.004, 0.002, 0, -0.002, -0.004, -0.006, -0.006, -0.004, 0].map(f => f * H),
  ];
  /** Medidas da cabeça no ponto mais largo — a nuvem se apoia nelas. */
  const rcabecaX = () => 0.047 * H;
  const rcabecaZ = () => 0.058 * H;
  const rcyDaCabeca = () => 0.062 * H;
  const nCabeca = n(22);
  c.parte(nCabeca, n(32), (u, v) => {
    const [y, rx, rz, cz] = perfilEm(perfilCabeca, u);
    const theta = v * TAU;
    // Achatamento lateral suave: a cabeça é mais funda que larga.
    return [Math.sin(theta) * rx, y, cz + Math.cos(theta) * rz];
  }, () => 'pele', { origem: [0, 0.93 * H, 0] });

  /** Elipsoide achatado, encostado no rosto — o traço que desenha o olho. */
  const traco = (material: Material, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, inclinacao = 0) => {
    c.parte(8, 14, (u, v) => {
      const phi = u * Math.PI, theta = v * TAU;
      const x0 = Math.sin(phi) * Math.cos(theta) * rx;
      const y0 = Math.cos(phi) * ry;
      const z0 = Math.sin(phi) * Math.sin(theta) * rz;
      void inclinacao;
      return [cx + x0, cy + y0, cz + z0];
    }, () => material, { origem: [cx, cy, cz - 0.03 * H] });
  };

  /**
   * Os traços do rosto ficam na **superfície** da cabeça, e não afundados: o
   * ponto do rosto em cada altura sai do próprio perfil da cabeça. Traço
   * afundado só deixa o brilho de fora e o rosto vira um borrão branco.
   */
  const superficieDoRosto = (y: number, x: number) => {
    const [, rx, rz, cz] = perfilEm(perfilCabeca, Math.max(0, Math.min(1, (y - 0.868 * H) / (0.132 * H))));
    const dentro = Math.max(0, 1 - (x / rx) ** 2);
    return cz + rz * Math.sqrt(dentro) - 0.002 * H;
  };
  const olhoEm = (lado: number) => {
    const y = 0.9245 * H, x = lado * 0.0185 * H;
    traco('olho', x, y, superficieDoRosto(y, x) + 0.001 * H, 0.0085 * H, 0.0048 * H, 0.0045 * H);
  };
  olhoEm(1); olhoEm(-1);
  const sobrancelhaEm = (lado: number) => {
    const y = 0.9405 * H, x = lado * 0.0195 * H;
    traco('sobrancelha', x, y, superficieDoRosto(y, x) + 0.001 * H, 0.011 * H, 0.0022 * H, 0.004 * H);
  };
  sobrancelhaEm(1); sobrancelhaEm(-1);
  // Nariz: uma nervura do próprio rosto, no meio do caminho entre olhos e boca.
  traco('pele', 0, 0.9155 * H, superficieDoRosto(0.9155 * H, 0) + 0.0015 * H, 0.006 * H, 0.013 * H, 0.008 * H);
  // Boca: um traço discreto, na superfície.
  traco('boca', 0, 0.899 * H, superficieDoRosto(0.899 * H, 0) + 0.0005 * H, 0.009 * H, 0.0022 * H, 0.0035 * H);

  /* ----------------------------------------------------------------- cabelo */
  const penteado = PENTEADOS[cabeloFamilia] ?? PENTEADOS.padrao;
  const volumeCabelo = Math.max(0.82, Math.min(1.25, cabeloVolume)) * penteado.volume;
  const linhaDoCabelo = (theta: number) => {
    // Alta na testa, descendo pelas têmporas até a nuca: a linha do cabelo de
    // uma cabeça, não um capacete. Sem isso o cabelo cobre a testa inteira e o
    // rosto fica com cara de peruca.
    const atras = ((1 - Math.cos(theta)) / 2) ** 1.5;
    return (0.949 - 0.047 * atras) * H;
  };
  const raioDaCabeca = (y: number) => perfilEm(perfilCabeca, Math.max(0, Math.min(1, (y - 0.868 * H) / (0.132 * H))));

  /** O ponto do crânio em (y, theta), empurrado para fora pela espessura do cabelo. */
  const casco = (y: number, theta: number, espessura: number, raioExtra = 0): Ponto => {
    const [, rx, rz, cz] = raioDaCabeca(y);
    // A onda é a ondulação do fio: mexe na superfície, não no tamanho do cabelo.
    const onda = 1 + penteado.onda * 0.035 * Math.sin(theta * 5) * Math.sin((y / H) * 30);
    const rxFinal = (rx + espessura + raioExtra) * onda;
    const rzFinal = (rz + espessura + raioExtra) * onda;
    return [Math.sin(theta) * rxFinal, y, cz + Math.cos(theta) * rzFinal];
  };

  const espessuraDoCabelo = 0.012 * H * volumeCabelo;
  const nCabelo = n(44);
  // 1) A touca: do topo da cabeça até a linha do cabelo daquele ângulo.
  c.parte(n(18), nCabelo, (u, v) => {
    const theta = v * TAU;
    const y = yTopo + (linhaDoCabelo(theta) - yTopo) * (u ** 0.82);
    return casco(y, theta, espessuraDoCabelo);
  }, () => 'cabelo', { origem: [0, 0.93 * H, 0], casca: true });

  // Nuvem (afro, crespo, cacheado): uma bola de cabelo em volta do crânio. É a
  // forma que lê de longe — antes eram valores gigantes que viravam uma tábua.
  if (penteado.nuvem > 0) {
    const centroDaNuvem: Ponto = [0, yTopo - rcyDaCabeca() * 0.08, -0.004 * H];
    const extra = penteado.nuvem * H * volumeCabelo;
    c.parte(n(20), n(30), (u, v) => {
      const phi = u * Math.PI, theta = v * TAU;
      const rxNuvem = rcabecaX() + extra;
      const ryNuvem = rcyDaCabeca() + extra * 1.05;
      const rzNuvem = rcabecaZ() + extra;
      return [
        centroDaNuvem[0] + Math.sin(phi) * Math.cos(theta) * rxNuvem,
        centroDaNuvem[1] + Math.cos(phi) * ryNuvem,
        centroDaNuvem[2] + Math.sin(phi) * Math.sin(theta) * rzNuvem,
      ];
    }, () => 'cabelo', { origem: centroDaNuvem });
  }

  // 1b) A franja: uma casca que sai da linha do cabelo e desce pela testa.
  if (penteado.franja) {
    const nFranja = n(12);
    c.parte(nFranja, n(18), (u, v) => {
      // v vai de uma orelha à outra; u desce da raiz até a ponta.
      const theta = (v - 0.5) * 2.1;
      const raiz = linhaDoCabelo(theta);
      const frente = Math.cos(theta);
      // A ponta da franja desce mais nas laterais do que no meio (o vinco).
      const ate = raiz - (0.016 + 0.012 * Math.abs(frente) ** 1.5) * H;
      const y = raiz + (ate - raiz) * u;
      const [, rx, rz, cz] = raioDaCabeca(Math.max(0.001, Math.min(1, (y - 0.868 * H) / (0.132 * H))));
      const espessura = espessuraDoCabelo * (0.85 + 0.35 * (1 - u));
      const empurra = 0.004 * H * Math.sin(u * Math.PI);
      return [
        Math.sin(theta) * (rx + espessura + empurra),
        y,
        cz + Math.cos(theta) * (rz + espessura + empurra) + 0.002 * H,
      ];
    }, () => 'cabelo', { origem: [0, 0.93 * H, 0], casca: true });
  }

  // 2) A queda: o cabelo que desce pelas costas, feito de mechas encostadas na
  //    cabeça. Só a **metade de trás** desce: na frente fica a testa, não cabelo.
  const comprimento = penteado.comprimento * H;
  if (comprimento > 0.004 * H) {
    const nQueda = n(24);
    /**
     * O ponto da mecha em (s, v): s desce da raiz (dentro da touca) até a ponta,
     * v dá meia volta na cabeça. A mecha nasce colada no crânio, ganha corpo
     * conforme desce e volta a afinar na ponta — é o que dá o desenho de cabelo,
     * e não de tábua.
     */
    const pontoDaMecha = (s: number, v: number): Ponto => {
      const theta = Math.PI / 2 + v * Math.PI;
      const atras = ((1 - Math.cos(theta)) / 2) ** 0.8; // 0 nas laterais, 1 no meio
      const ate = comprimento * (0.4 + 0.6 * atras);
      const yDaRaiz = linhaDoCabelo(theta) + 0.016 * H; // a raiz fica dentro da touca
      const [, rx, rz, cz] = raioDaCabeca(Math.min(0.999, (yDaRaiz - 0.868 * H) / (0.132 * H)));
      const corpo = Math.sin(Math.min(1, s * 1.25 + 0.12) * Math.PI) * 0.55 + 0.45;
      const largura = (rx + espessuraDoCabelo * 2.1) * corpo;
      const profundidade = (rz + espessuraDoCabelo * 1.9) * corpo;
      const paraTras = cz - 0.012 * H - 0.05 * H * Math.sin(Math.min(1, s * 1.4) * Math.PI * 0.5);
      const onda = penteado.onda * 0.012 * H * Math.sin(s * 6 + theta * 1.5);
      return [
        Math.sin(theta) * largura + onda,
        yDaRaiz - ate * s,
        paraTras + Math.cos(theta) * profundidade,
      ];
    };
    c.parte(nQueda, n(30), (u, v) => pontoDaMecha(u, v), () => 'cabelo',
      { origem: [0, 0.9 * H, 0.03 * H], casca: true });
    // E a borda de baixo fecha **dentro do corpo**: uma aba que volta da ponta
    // da mecha até o crânio, na mesma altura. Sem ela, o cabelo de perfil
    // termina num corte reto, que é o que fazia o penteado parecer uma tábua.
    c.parte(n(3), n(30), (u, v) => {
      const ponta = pontoDaMecha(1, v);
      const theta = Math.PI / 2 + v * Math.PI;
      const [, rx, rz, cz] = raioDaCabeca(Math.min(0.999, Math.max(0, (ponta[1] - 0.868 * H) / (0.132 * H))));
      const noCranio: Ponto = [Math.sin(theta) * rx * 0.9, ponta[1], cz + Math.cos(theta) * rz * 0.9];
      return [
        ponta[0] + (noCranio[0] - ponta[0]) * u,
        ponta[1] + (noCranio[1] - ponta[1]) * u,
        ponta[2] + (noCranio[2] - ponta[2]) * u,
      ];
    }, () => 'cabelo', { origem: [0, 0.9 * H, 0], casca: true });
  }

  // 3) Tranças: mechas finas com nós, contáveis de longe.
  if (penteado.trancas > 0) {
    for (let t = 0; t < penteado.trancas; t++) {
      const theta = Math.PI + (t / (penteado.trancas - 1) - 0.5) * 1.9;
      const inicio = casco(linhaDoCabelo(theta), theta, espessuraDoCabelo);
      const ate = comprimento * (0.55 + 0.45 * Math.abs(Math.cos(theta * 0.5)));
      c.parte(n(16), n(8), (u, v) => {
        const fi = v * TAU;
        const no = 1 + 0.22 * Math.sin(u * ate / (0.012 * H) * TAU);
        const raio = 0.0095 * H * no * (1 - suave(0.85, 1, u) * 0.5);
        const x = inicio[0] * 1.05 + Math.sin(theta) * 0.012 * H * u;
        const z = inicio[2] - 0.01 * H * u;
        const y = inicio[1] - ate * u;
        return [x + Math.sin(fi) * raio, y, z + Math.cos(fi) * raio];
      }, () => 'cabelo', { origem: [inicio[0] * 0.4, inicio[1] - ate * 0.5, inicio[2] - 0.05 * H], casca: true });
    }
  }

  // 4) Coque na nuca.
  if (penteado.coque) {
    const centro: Ponto = [0, 0.925 * H, -0.075 * H];
    c.parte(10, 14, (u, v) => {
      const phi = u * Math.PI, theta = v * TAU;
      return [
        centro[0] + Math.sin(phi) * Math.cos(theta) * 0.026 * H,
        centro[1] + Math.cos(phi) * 0.024 * H,
        centro[2] + Math.sin(phi) * Math.sin(theta) * 0.022 * H,
      ];
    }, () => 'cabelo', { origem: centro });
  }

  // 5) Crista do moicano: uma barbatana no meio da cabeça.
  if (penteado.crista > 0) {
    const altura = penteado.crista * H;
    c.parte(n(14), n(8), (u, v) => {
      const z = (0.05 - u * 0.1) * H;
      const espessura = 0.006 * H * (1 - suave(0.75, 1, u) * 0.6);
      const topo = 1.0 * H + altura * Math.sin(Math.min(1, u * 1.5) * Math.PI * 0.75);
      const base = 0.94 * H;
      const y = base + (topo - base) * (1 - Math.abs(v - 0.5) * 2);
      return [Math.sin(v * Math.PI * 2) * espessura, y, z];
    }, () => 'cabelo', { origem: [0, 0.96 * H, 0], casca: true });
  }

  /* ------------------------------------------------------------------ braços */
  const anguloBraco = 9 * Math.PI / 180;
  const xOmbro = ombros * 0.74;
  const comprimentoBraco = 0.36 * H;
  const direcaoBraco: Ponto = [Math.cos(anguloBraco), -Math.sin(anguloBraco), 0.03];
  const raioBraco = ombros * 0.26;
  // O primeiro trecho do braço é o **ombro**: grosso dentro do peito e afinando
  // até a espessura do braço. É o que funde tronco e braço num volume só — antes
  // o braço começava fora do tronco e sobrava um vão com bola de ombro.
  const perfilBraco: Perfil = [
    [0, 0.05, 0.12, 0.22, 0.4, 0.58, 0.8, 1.0],
    [ombros * 0.42, ombros * 0.34, ombros * 0.28, raioBraco * 0.95, raioBraco * 0.78, raioBraco * 0.8, raioBraco * 0.62, raioBraco * 0.5],
  ];
  const pontoDoBraco = (lado: number, t: number, theta: number): Ponto => {
    const [dist, r] = perfilEm(perfilBraco, t);
    const comprimento = dist * comprimentoBraco;
    const centro: Ponto = [
      lado * (xOmbro * 0.55 + comprimento * direcaoBraco[0]),
      yOmbro + comprimento * direcaoBraco[1],
      comprimento * direcaoBraco[2],
    ];
    const infla = 1 + (ajusteDaRoupa - 1) * (1 - suave(mangaDaBlusa - 0.03, mangaDaBlusa + 0.03, t));
    return [centro[0], centro[1] + Math.cos(theta) * r * infla * 0.98, centro[2] + Math.sin(theta) * r * infla];
  };
  for (const lado of [1, -1]) {
    c.parte(n(30), n(22), (u, v) => pontoDoBraco(lado, u, v * TAU),
      (u) => (u <= mangaDaBlusa ? 'topo' : 'pele'),
      { origem: [lado * xOmbro * 0.35, yOmbro - 0.02 * H, 0] });
  }

  /* ------------------------------------------------------------------- mãos */
  const perfilMao: Perfil = [
    [0, 0.2, 0.55, 0.85, 1.0],
    [0.018, 0.026, 0.03, 0.024, 0.008].map(f => f * H),
    [0.014, 0.014, 0.013, 0.011, 0.004].map(f => f * H),
  ];
  for (const lado of [1, -1]) {
    const fim = yOmbro + comprimentoBraco * direcaoBraco[1];
    const inicio: Ponto = [lado * (xOmbro * 0.55 + comprimentoBraco * direcaoBraco[0]), fim, comprimentoBraco * direcaoBraco[2]];
    c.parte(n(12), n(16), (u, v) => {
      const [t, largura, espessura] = perfilEm(perfilMao, u);
      const comprimento = t * 0.105 * H;
      const theta = v * TAU;
      return [
        inicio[0] + lado * comprimento * Math.cos(anguloBraco),
        inicio[1] - comprimento * Math.sin(anguloBraco) + Math.sin(theta) * espessura,
        inicio[2] + Math.cos(theta) * largura,
      ];
    }, () => 'pele', { origem: [inicio[0] - lado * 0.05 * H, inicio[1], inicio[2]] });
  }

  /* ------------------------------------------------------------------ pernas */
  const perfilPerna: Perfil = [
    [0.045, 0.1, 0.16, 0.215, 0.27, 0.32, 0.38, 0.44, 0.49, 0.53, 0.58].map(f => f * H),
    [0.21, 0.245, 0.28, 0.33, 0.3, 0.29, 0.33, 0.4, 0.45, 0.5, 0.54].map(f => f * quadril),
    [0.22, 0.25, 0.28, 0.33, 0.3, 0.29, 0.34, 0.4, 0.45, 0.48, 0.5].map(f => f * quadril),
  ];
  const centroDaPerna = (y: number) => quadril * (0.28 + 0.18 * suave(0.06 * H, 0.58 * H, y));
  const inflarPerna = (y: number) => {
    if (bota && y < yBota) return 1 + (ajusteDaRoupa - 1) * 0.4 + 0.09;
    const vestida = saia ? 0 : suave(yBarra - 0.005 * H, yBarra + 0.005 * H, y);
    return 1 + (ajusteDaRoupa - 1) * 1.15 * vestida;
  };
  const materialDaPerna = (y: number): Material => {
    if (bota && y < yBota) return 'sapato';
    // Da barra para cima é tecido; abaixo dela, pele (ou bota, ou nada).
    if (!saia && y > yBarra) return 'baixo';
    return 'pele';
  };
  for (const lado of [1, -1]) {
    c.parte(n(44), n(30), (u, v) => {
      const [y, rx, rz] = perfilEm(perfilPerna, u);
      const theta = v * TAU;
      const infla = inflarPerna(y);
      return [lado * centroDaPerna(y) + Math.sin(theta) * rx * infla, y, Math.cos(theta) * rz * infla];
    }, (_u, _v, p) => materialDaPerna(p[1]), { origem: [lado * quadril * 0.2, 0.3 * H, 0] });
  }

  /* ------------------------------------------------------------------- pés */
  const perfilPe: Perfil = [
    [-0.052, -0.03, -0.005, 0.025, 0.055, 0.085, 0.104, 0.115].map(f => f * H),
    [0.007, 0.017, 0.024, 0.027, 0.028, 0.026, 0.02, 0.008].map(f => f * H),
    [0.011, 0.019, 0.024, 0.026, 0.022, 0.017, 0.013, 0.005].map(f => f * H),
    [0.013, 0.021, 0.026, 0.025, 0.02, 0.016, 0.012, 0.006].map(f => f * H),
  ];
  for (const lado of [1, -1]) {
    const x = lado * quadril * 0.3;
    const pontoDoPe = (u: number, v: number): Ponto => {
      const [z, largura, altura, centroY] = perfilEm(perfilPe, u);
      const theta = v * TAU;
      // Seção em retângulo arredondado: um pé de sapato, não um ovo. A sola fica
      // reta (a base do pé não é curva) e o bico afina sozinho pelo perfil.
      const expoente = 2.6;
      const cx = Math.cos(theta), cy = Math.sin(theta);
      const xFace = Math.sign(cx) * Math.abs(cx) ** (2 / expoente);
      const yFace = Math.sign(cy) * Math.abs(cy) ** (2 / expoente);
      const y = centroY + yFace * altura;
      return [x + xFace * largura, Math.max(0.004 * H, y), z];
    };
    c.parte(n(18), n(22), pontoDoPe, () => 'sapato', { origem: [x, 0.03 * H, 0] });
  }

  /* ------------------------------------------------------------------ saia */
  if (saia) {
    const raioCintura = cintura * 1.06;
    const raioBarra = Math.max(quadril * (1 + 0.55 * (folgaDaBarra - 1)), quadril * 1.05);
    const nSaia = n(26);
    c.parte(nSaia, n(36), (u, v) => {
      const y = yCintura + (yBarra - yCintura) * u;
      const raio = raioCintura + (raioBarra - raioCintura) * (u ** 0.85);
      const pregas = 1 + 0.022 * Math.cos(v * TAU * 8) * u;
      const theta = v * TAU;
      return [Math.sin(theta) * raio * pregas, y, Math.cos(theta) * raio * pregas * 0.86];
    }, () => 'baixo', { origem: [0, (yCintura + yBarra) / 2, 0], casca: true });
  }

  return c.concluir();
}
