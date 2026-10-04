/**
 * Pintura da malha — um rasterizador pequeno, escrito à mão.
 *
 * Recebe a malha e devolve **pixels**: cada triângulo é projetado, o z-buffer
 * decide quem aparece, e a cor de cada pixel sai da normal interpolada com luz
 * de estúdio (chave, preenchimento e contraluz), oclusão ambiente e brilho
 * especular. É o que dá volume de manequim em vez de cor chapada.
 *
 * Sem canvas, sem WebGL, sem navegador: entra malha, sai `Uint8ClampedArray`.
 * Isso é de propósito — o conferidor fora do navegador desenha exatamente o que
 * a tela desenha, e o app não paga o preço de uma biblioteca 3D inteira.
 */

import type { Malha, Material, Ponto } from './malha';
import { MATERIAIS } from './malha';

/** Cores por papel da peça, em `#rrggbb`. */
export interface Paleta {
  pele: string;
  cabelo: string;
  topo: string;
  baixo: string;
  sapato: string;
  olho: string;
  boca: string;
  sobrancelha: string;
}

/**
 * A paleta da figura a partir do que a ficha e o estilo dizem: tom de pele, cor
 * do cabelo, roupa. Olhos, boca e sobrancelhas são traços, não escolha da
 * pessoa — por isso têm cor fixa, discreta.
 */
export function paletaDe(cores: { pele: string; cabelo: string; roupa: { topo: string; baixo: string; sapato: string } }): Paleta {
  return {
    pele: cores.pele, cabelo: cores.cabelo,
    topo: cores.roupa.topo, baixo: cores.roupa.baixo, sapato: cores.roupa.sapato,
    olho: '#2f2319', boca: '#b06f6e', sobrancelha: '#4a3529',
  };
}

export interface OpcoesDaPintura {
  /** Giro em torno do eixo vertical, em graus (0 = de frente). */
  yaw: number;
  /** Inclinação: positivo olha a figura um pouco de cima. */
  pitch: number;
  largura: number;
  altura: number;
  paleta: Paleta;
  /** 1 = rápido (enquanto gira), 2 = caprichado (parado). */
  amostras?: number;
  /** Desenha a sombra de contato no chão. */
  sombra?: boolean;
}

/** `ArrayBuffer` explícito: é o que `ImageData` aceita sem conversão. */
export interface FiguraPintada {
  dados: Uint8ClampedArray<ArrayBuffer>;
  largura: number;
  altura: number;
}

/* --------------------------------------------------------- cores e luzes -- */

/** `#rrggbb` (ou `rgb(...)`) em linear: a luz só soma certo em linear. */
function paraLinear(cor: string): [number, number, number] {
  const hexadecimal = cor.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const rgb = cor.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  let canais: number[];
  if (hexadecimal) {
    const bruto = hexadecimal[1];
    const completo = bruto.length === 3 ? bruto.split('').map(c => c + c).join('') : bruto;
    const numero = Number.parseInt(completo, 16);
    canais = [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255];
  } else if (rgb) {
    canais = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else {
    canais = [128, 128, 128];
  }
  return canais.map(canal => {
    const v = canal / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

interface Luz {
  direcao: Ponto;
  /** Metade do caminho entre a luz e a câmera, para o brilho especular. */
  metade: Ponto;
  cor: [number, number, number];
  forca: number;
}

/**
 * Estúdio de três luzes: a chave vem de cima, da esquerda e da frente — a mesma
 * direção da luz antiga, para a figura não mudar de personalidade; o
 * preenchimento abre a sombra do lado direito; e a contraluz separa a figura do
 * fundo. Ambiente hemisférico (céu claro em cima, chão escuro embaixo).
 */
const LUZES: Luz[] = [
  { direcao: [-0.46, 0.66, 0.6], metade: [0, 0, 0], cor: [1.0, 0.98, 0.95], forca: 1.05 },
  { direcao: [0.66, 0.22, 0.4], metade: [0, 0, 0], cor: [0.6, 0.68, 0.86], forca: 0.36 },
  { direcao: [0.2, 0.4, -0.9], metade: [0, 0, 0], cor: [0.88, 0.9, 1.0], forca: 0.34 },
];

const CEU: [number, number, number] = [0.5, 0.54, 0.64];
const CHAO: [number, number, number] = [0.15, 0.14, 0.17];
const AMBIENTE = 0.55;

interface Acabamento {
  /** Expoente do brilho especular. */
  brilho: number;
  /** Quanto do brilho especular aparece. */
  especular: number;
  /** Difusão suave: pele e tecido deixam a luz contornar um pouco a forma. */
  suave: number;
}

const ACABAMENTOS: Record<Material, Acabamento> = {
  pele: { brilho: 20, especular: 0.1, suave: 0.45 },
  cabelo: { brilho: 60, especular: 0.22, suave: 0.12 },
  topo: { brilho: 8, especular: 0.06, suave: 0.22 },
  baixo: { brilho: 8, especular: 0.06, suave: 0.22 },
  sapato: { brilho: 26, especular: 0.14, suave: 0.14 },
  olho: { brilho: 70, especular: 0.7, suave: 0.04 },
  boca: { brilho: 26, especular: 0.2, suave: 0.4 },
  sobrancelha: { brilho: 30, especular: 0.14, suave: 0.1 },
};

/** Uma cor de material com o acabamento já resolvido, pronta para o laço. */
interface Tinta {
  cor: [number, number, number];
  brilho: number;
  especular: number;
  suave: number;
}

/* ------------------------------------------------------------- oclusão -- */

/**
 * Oclusão ambiente grosseira, em cada vértice: perto de onde duas partes do
 * corpo se encostam (axila, virgula, embaixo do queixo) a luz do ambiente chega
 * menos. Sem isso o manequim fica com cara de plástico injetado.
 *
 * O resultado é guardado por malha: a conta é a mesma a cada quadro, e girar a
 * figura não pode ficar caro.
 */
const oclusoes = new WeakMap<Malha, Float32Array>();

function oclusaoDaMalha(malha: Malha): Float32Array {
  const guardada = oclusoes.get(malha);
  if (guardada) return guardada;
  const total = malha.posicoes.length / 3;
  const oclusao = new Float32Array(total).fill(1);
  const alcance = 0.11;
  const passo = Math.max(1, Math.floor(total / 600));
  for (let i = 0; i < total; i++) {
    const x = malha.posicoes[i * 3], y = malha.posicoes[i * 3 + 1], z = malha.posicoes[i * 3 + 2];
    const nx = malha.normais[i * 3], ny = malha.normais[i * 3 + 1], nz = malha.normais[i * 3 + 2];
    let soma = 0;
    for (let j = 0; j < total; j += passo) {
      if (j === i) continue;
      const dx = malha.posicoes[j * 3] - x, dy = malha.posicoes[j * 3 + 1] - y, dz = malha.posicoes[j * 3 + 2] - z;
      const distancia2 = dx * dx + dy * dy + dz * dz;
      if (distancia2 > alcance * alcance || distancia2 < 1e-9) continue;
      const distancia = Math.sqrt(distancia2);
      const cosseno = -(dx * nx + dy * ny + dz * nz) / distancia;
      if (cosseno <= 0.2) continue;
      const perto = 1 - distancia / alcance;
      soma += cosseno * perto * perto;
    }
    oclusao[i] = Math.max(0.4, 1 - 0.14 * soma);
  }
  oclusoes.set(malha, oclusao);
  return oclusao;
}

/* ------------------------------------------------------------- pintura -- */

export function pintarFigura(malha: Malha, opcoes: OpcoesDaPintura): FiguraPintada {
  const { largura, altura, paleta } = opcoes;
  const amostras = Math.max(1, Math.min(3, Math.round(opcoes.amostras ?? 2)));
  const W = largura * amostras;
  const H = altura * amostras;
  const oclusao = oclusaoDaMalha(malha);

  const tinta = MATERIAIS.map(material => ({ cor: paraLinear(paleta[material] ?? paleta.pele), ...ACABAMENTOS[material] } as Tinta));

  // -------------------------------------------------------------- câmera
  const yaw = (opcoes.yaw * Math.PI) / 180;
  const pitch = (opcoes.pitch * Math.PI) / 180;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  /** Mundo → câmera: gira em torno de Y e depois inclina em X. */
  const gx = (x: number, z: number) => x * cosY + z * sinY;
  const gz = (x: number, z: number) => -x * sinY + z * cosY;
  const gy = (y: number, z: number) => y * cosP - z * sinP;
  const gz2 = (y: number, z: number) => y * sinP + z * cosP;

  const total = malha.posicoes.length / 3;
  const vista = new Float32Array(total * 3);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < total; i++) {
    const x = malha.posicoes[i * 3], y = malha.posicoes[i * 3 + 1], z = malha.posicoes[i * 3 + 2];
    const x1 = gx(x, z), z1 = gz(x, z);
    const vy = gy(y, z1), vz = gz2(y, z1);
    vista[i * 3] = x1; vista[i * 3 + 1] = vy; vista[i * 3 + 2] = vz;
    if (x1 < minX) minX = x1;
    if (x1 > maxX) maxX = x1;
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
  }
  const margem = 13 * amostras;
  const escala = Math.min((W - margem * 2) / Math.max(1e-6, maxX - minX), (H - margem * 2) / Math.max(1e-6, maxY - minY));
  const centroY = (minY + maxY) / 2;
  const paraX = (x: number) => W / 2 + x * escala;
  const paraY = (y: number) => H / 2 - (y - centroY) * escala;

  const normais = new Float32Array(total * 3);
  for (let i = 0; i < total; i++) {
    const x = malha.normais[i * 3], y = malha.normais[i * 3 + 1], z = malha.normais[i * 3 + 2];
    const x1 = gx(x, z), z1 = gz(x, z);
    normais[i * 3] = x1; normais[i * 3 + 1] = gy(y, z1); normais[i * 3 + 2] = gz2(y, z1);
  }

  // As luzes já chegam giradas com a figura, como se o estúdio ficasse parado.
  const luzes: Luz[] = LUZES.map(luz => {
    const [lx, ly, lz] = luz.direcao;
    const x1 = gx(lx, lz), z1 = gz(lx, lz);
    const direcao: Ponto = [x1, gy(ly, z1), gz2(ly, z1)];
    const c = Math.hypot(direcao[0], direcao[1], direcao[2]) || 1;
    direcao[0] /= c; direcao[1] /= c; direcao[2] /= c;
    const metade: Ponto = [direcao[0], direcao[1], direcao[2] + 1];
    const cm = Math.hypot(metade[0], metade[1], metade[2]) || 1;
    metade[0] /= cm; metade[1] /= cm; metade[2] /= cm;
    return { direcao, metade, cor: luz.cor, forca: luz.forca };
  });
  // O eixo "para cima" da câmera, para o ambiente hemisférico.
  const ceuY = cosP;
  const ceuZ = sinP;

  const pixels = new Float32Array(W * H * 4); // linear, pré-multiplicado
  const profundidade = new Float32Array(W * H).fill(-Infinity);

  const triangulos = malha.indices.length / 3;
  for (let t = 0; t < triangulos; t++) {
    const ia = malha.indices[t * 3], ib = malha.indices[t * 3 + 1], ic = malha.indices[t * 3 + 2];
    const ax = vista[ia * 3], ay = vista[ia * 3 + 1], az = vista[ia * 3 + 2];
    const bx = vista[ib * 3], by = vista[ib * 3 + 1], bz = vista[ib * 3 + 2];
    const cx = vista[ic * 3], cy = vista[ic * 3 + 1], cz = vista[ic * 3 + 2];
    // Descarte de verso pela normal em espaço de câmera: a malha é orientada,
    // então o que está de costas não precisa nem ser rasterizado.
    if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) <= 0) continue;

    const tintaDaFace = tinta[malha.materiais[t]] ?? tinta[0];
    const x0 = paraX(ax), y0 = paraY(ay);
    const x1 = paraX(bx), y1 = paraY(by);
    const x2 = paraX(cx), y2 = paraY(cy);
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    // Triângulo de menos de um terço de pixel não muda o desenho — e são
    // milhares deles nas partes distantes da figura.
    if (Math.abs(area) < 0.34) continue;
    const inverso = 1 / area;

    const minPX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxPX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minPY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxPY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (maxPX < minPX || maxPY < minPY) continue;

    for (let py = minPY; py <= maxPY; py++) {
      const fy = py + 0.5;
      for (let px = minPX; px <= maxPX; px++) {
        const fx = px + 0.5;
        const l0 = ((x1 - fx) * (y2 - fy) - (x2 - fx) * (y1 - fy)) * inverso;
        if (l0 < -0.0005) continue;
        const l1 = ((x2 - fx) * (y0 - fy) - (x0 - fx) * (y2 - fy)) * inverso;
        if (l1 < -0.0005) continue;
        const l2 = 1 - l0 - l1;
        if (l2 < -0.0005) continue;
        const z = l0 * az + l1 * bz + l2 * cz;
        const indice = py * W + px;
        if (z <= profundidade[indice]) continue;
        profundidade[indice] = z;

        let nx = l0 * normais[ia * 3] + l1 * normais[ib * 3] + l2 * normais[ic * 3];
        let ny = l0 * normais[ia * 3 + 1] + l1 * normais[ib * 3 + 1] + l2 * normais[ic * 3 + 1];
        let nz = l0 * normais[ia * 3 + 2] + l1 * normais[ib * 3 + 2] + l2 * normais[ic * 3 + 2];
        const comprimento = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= comprimento; ny /= comprimento; nz /= comprimento;
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }

        const ocluido = l0 * oclusao[ia] + l1 * oclusao[ib] + l2 * oclusao[ic];
        const alturaDoCeu = 0.5 + 0.5 * ny;

        // Ambiente hemisférico: céu em cima, chão embaixo, atenuado pela oclusão.
        let luzR = AMBIENTE * (CHAO[0] + (CEU[0] - CHAO[0]) * alturaDoCeu) * ocluido;
        let luzG = AMBIENTE * (CHAO[1] + (CEU[1] - CHAO[1]) * alturaDoCeu) * ocluido;
        let luzB = AMBIENTE * (CHAO[2] + (CEU[2] - CHAO[2]) * alturaDoCeu) * ocluido;
        let brilhoR = 0, brilhoG = 0, brilhoB = 0;

        for (let l = 0; l < luzes.length; l++) {
          const luz = luzes[l];
          const cosseno = nx * luz.direcao[0] + ny * luz.direcao[1] + nz * luz.direcao[2];
          const difusa = Math.max(0, (cosseno + tintaDaFace.suave) / (1 + tintaDaFace.suave));
          const forca = luz.forca * difusa * (0.5 + 0.5 * ocluido) * (2 / (l + 2));
          luzR += luz.cor[0] * forca;
          luzG += luz.cor[1] * forca;
          luzB += luz.cor[2] * forca;
          if (cosseno > 0 && tintaDaFace.especular > 0) {
            const ponto = nx * luz.metade[0] + ny * luz.metade[1] + nz * luz.metade[2];
            if (ponto > 0) {
              const quanto = ponto ** tintaDaFace.brilho * tintaDaFace.especular * luz.forca;
              brilhoR += luz.cor[0] * quanto;
              brilhoG += luz.cor[1] * quanto;
              brilhoB += luz.cor[2] * quanto;
            }
          }
        }
        const cor = tintaDaFace.cor;
        const base = indice * 4;
        pixels[base] = cor[0] * luzR + brilhoR;
        pixels[base + 1] = cor[1] * luzG + brilhoG;
        pixels[base + 2] = cor[2] * luzB + brilhoB;
        pixels[base + 3] = 1;
      }
    }
  }

  return reduzir(pixels, W, largura, altura, amostras, opcoes.sombra === true, paraX(0), paraY(0), escala, ceuY, ceuZ);
}

/**
 * Reduz a imagem interna (amostras ×) para o tamanho pedido, compõe sobre o
 * fundo transparente e desenha a sombra de contato no chão.
 */
function reduzir(
  pixels: Float32Array, W: number, largura: number, altura: number, amostras: number,
  sombra: boolean, zeroX: number, zeroY: number, escala: number, ceuY: number, ceuZ: number,
): FiguraPintada {
  void ceuY; void ceuZ;
  const saida = new Uint8ClampedArray(new ArrayBuffer(largura * altura * 4));
  const paraSrgb = (v: number) => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  };
  const n = amostras * amostras;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < amostras; dy++) {
        const linha = ((y * amostras + dy) * W + x * amostras) * 4;
        for (let dx = 0; dx < amostras; dx++) {
          const i = linha + dx * 4;
          const alfa = pixels[i + 3];
          if (alfa <= 0) continue;
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; a += alfa;
        }
      }
      const indice = (y * largura + x) * 4;
      if (a <= 0) {
        if (sombra) {
          const dx = (x - zeroX) / (escala * 0.3);
          const dy = (y - zeroY) / (escala * 0.05);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 2.1) {
            const alfaSombra = 0.32 * (1 - d / 2.1) ** 1.5;
            saida[indice] = 58; saida[indice + 1] = 54; saida[indice + 2] = 60;
            saida[indice + 3] = Math.round(alfaSombra * 255);
          }
        }
        continue;
      }
      saida[indice] = paraSrgb(r / a);
      saida[indice + 1] = paraSrgb(g / a);
      saida[indice + 2] = paraSrgb(b / a);
      saida[indice + 3] = Math.round((a / n) * 255);
    }
  }
  return { dados: saida, largura, altura };
}
