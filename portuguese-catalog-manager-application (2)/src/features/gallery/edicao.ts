/**
 * Edição de imagens: o estado, a geometria e as contas.
 *
 * Nada aqui conhece React nem canvas — é o mesmo arranjo de `altura.ts` e
 * `malha.ts` no domínio de corpo: a regra fica em função pura para que o teste
 * consiga conferir a conta sem navegador, e a tela só desenha o resultado.
 *
 * A ideia central é que **editar não reencoda a foto a cada passo**. O arquivo
 * original continua intocado; o que existe é uma receita (corte, giro, espelho,
 * ajustes e marcas) que só vira pixels uma vez, na hora de salvar. Desfazer é
 * trocar a receita, e não guardar vinte imagens na memória.
 *
 * Duas réguas de medida convivem e é preciso não confundi-las:
 *   · **fonte** — pixels do arquivo original (onde vive o `corte`);
 *   · **saída** — pixels da foto já cortada e girada (onde vivem as marcas).
 * `paraSaida` e `paraFonte` traduzem uma na outra, e cada ação geométrica traz
 * o mapa que leva as marcas antigas para o lugar novo — sem isso, girar a foto
 * deixaria o desenho onde estava a tela, e não onde estava a imagem.
 */
import type { AppData, Photo } from '../../types';
import { generateId, photoHash } from '../../store';

/* ------------------------------------------------------------------ tipos -- */

export interface Ponto { x: number; y: number }
export interface Tamanho { largura: number; altura: number }
export interface Retangulo extends Tamanho { x: number; y: number }

/** Giro em passos de 90°, no sentido horário. */
export type Angulo = 0 | 90 | 180 | 270;

export interface Geometria {
  /** A parte do arquivo original que ainda aparece, em pixels do original. */
  corte: Retangulo;
  giro: Angulo;
  espelharH: boolean;
  espelharV: boolean;
}

/**
 * Ajustes de luz e cor, todos em volta de zero (ou de 0 a 100, no desfoque e
 * na vinheta). São números porque viram `filter` do canvas na hora de desenhar
 * e porque o teste precisa comparar uma receita com outra.
 */
export interface Ajustes {
  brilho: number;       // -100 … 100
  contraste: number;    // -100 … 100
  saturacao: number;    // -100 … 100
  temperatura: number;  // -100 (fria) … 100 (quente)
  matiz: number;        // -180 … 180 graus
  desfoque: number;     // 0 … 12 px
  vinheta: number;      // 0 … 100
}

export const AJUSTES_NEUTROS: Ajustes = {
  brilho: 0, contraste: 0, saturacao: 0, temperatura: 0, matiz: 0, desfoque: 0, vinheta: 0,
};

export type FormaTipo = 'linha' | 'seta' | 'retangulo' | 'elipse';

interface MarcaBase { id: string; cor: string; opacidade: number }

/** Traço livre do pincel (ou do dedo), em pixels da saída. */
export interface Traco extends MarcaBase { tipo: 'traco'; pontos: Ponto[]; espessura: number }
/** Figura de dois pontos: arrastou, saiu. */
export interface Forma extends MarcaBase { tipo: 'forma'; figura: FormaTipo; de: Ponto; ate: Ponto; espessura: number; preenchida: boolean }
/** Letra colocada na foto, com contorno opcional para legível sobre qualquer fundo. */
export interface Texto extends MarcaBase { tipo: 'texto'; texto: string; em: Ponto; tamanho: number; contorno: boolean }
/**
 * Mosaico de privacidade: embaralha uma área para esconder um rosto, uma placa
 * ou uma tela. Não tem cor — ele usa os pixels que já estão ali.
 */
export interface Borrado { id: string; tipo: 'borrado'; area: Retangulo; bloco: number }

export type Marca = Traco | Forma | Texto | Borrado;

export interface Edicao {
  geometria: Geometria;
  ajustes: Ajustes;
  marcas: Marca[];
}

/** A foto como entrou: nada cortado, nada girado, nenhum ajuste. */
export function edicaoInicial(tamanho: Tamanho): Edicao {
  const largura = Math.max(1, Math.round(tamanho.largura) || 1);
  const altura = Math.max(1, Math.round(tamanho.altura) || 1);
  return {
    geometria: { corte: { x: 0, y: 0, largura, altura }, giro: 0, espelharH: false, espelharV: false },
    ajustes: { ...AJUSTES_NEUTROS },
    marcas: [],
  };
}

/* --------------------------------------------------------------- medidas -- */

/** Medidas da foto depois do corte e do giro (o espelho não muda tamanho). */
export function tamanhoDaSaida(geometria: Geometria): Tamanho {
  const { corte, giro } = geometria;
  return giro === 90 || giro === 270
    ? { largura: corte.altura, altura: corte.largura }
    : { largura: corte.largura, altura: corte.altura };
}

export const tamanhoDaEdicao = (edicao: Edicao) => tamanhoDaSaida(edicao.geometria);

export const razaoDaSaida = (geometria: Geometria) => {
  const { largura, altura } = tamanhoDaSaida(geometria);
  return altura > 0 ? largura / altura : 1;
};

/* -------------------------------------------- fonte ↔ saída (as duas réguas) */

/** Leva um ponto do arquivo original para a foto como ela aparece agora. */
export function paraSaida(fonte: Ponto, geometria: Geometria): Ponto {
  const { corte, giro, espelharH, espelharV } = geometria;
  const local = { x: fonte.x - corte.x, y: fonte.y - corte.y };
  let ponto: Ponto;
  if (giro === 90) ponto = { x: corte.altura - local.y, y: local.x };
  else if (giro === 180) ponto = { x: corte.largura - local.x, y: corte.altura - local.y };
  else if (giro === 270) ponto = { x: local.y, y: corte.largura - local.x };
  else ponto = local;
  const saida = tamanhoDaSaida(geometria);
  return {
    x: espelharH ? saida.largura - ponto.x : ponto.x,
    y: espelharV ? saida.altura - ponto.y : ponto.y,
  };
}

/** O caminho de volta: da tela para o pixel do arquivo. */
export function paraFonte(saida: Ponto, geometria: Geometria): Ponto {
  const { corte, giro, espelharH, espelharV } = geometria;
  const medidas = tamanhoDaSaida(geometria);
  const ponto = {
    x: espelharH ? medidas.largura - saida.x : saida.x,
    y: espelharV ? medidas.altura - saida.y : saida.y,
  };
  let local: Ponto;
  if (giro === 90) local = { x: ponto.y, y: corte.altura - ponto.x };
  else if (giro === 180) local = { x: corte.largura - ponto.x, y: corte.altura - ponto.y };
  else if (giro === 270) local = { x: corte.largura - ponto.y, y: ponto.x };
  else local = ponto;
  return { x: local.x + corte.x, y: local.y + corte.y };
}

/* ------------------------------------------------------------------- ações -- */

export type AcaoGeometrica =
  | { tipo: 'giro'; sentido: 1 | -1 }
  | { tipo: 'espelho'; eixo: 'h' | 'v' }
  | { tipo: 'corte'; area: Retangulo };

const somarGiro = (giro: Angulo, sentido: 1 | -1): Angulo =>
  (((giro + sentido * 90) % 360 + 360) % 360) as Angulo;

/** A área mínima que ainda vale como foto: abaixo disso o corte é ignorado. */
export const CORTE_MINIMO = 8;

/**
 * Recorta a região pedida, que chega em pixels da **saída** (é o que o dedo
 * arrastou na tela) e precisa voltar para pixels do arquivo, porque o corte
 * mora lá — é isso que permite girar e cortar em qualquer ordem sem perder
 * resolução.
 */
function cortar(geometria: Geometria, area: Retangulo): Geometria {
  const corte0 = geometria.corte;
  const saida = tamanhoDaSaida(geometria);
  const cantos: Ponto[] = [
    { x: area.x, y: area.y },
    { x: area.x + area.largura, y: area.y },
    { x: area.x, y: area.y + area.altura },
    { x: area.x + area.largura, y: area.y + area.altura },
  ].map(ponto => paraFonte({ x: limitar(ponto.x, 0, saida.largura), y: limitar(ponto.y, 0, saida.altura) }, geometria));
  const xs = cantos.map(ponto => ponto.x);
  const ys = cantos.map(ponto => ponto.y);
  // Interseção com o retângulo do arquivo que o corte atual enxerga — e não com
  // um retângulo que começa em (0, 0): depois de um corte, o recorte seguinte
  // só pode apertar o que já está à mostra.
  const fimX = corte0.x + corte0.largura;
  const fimY = corte0.y + corte0.altura;
  const x = limitar(Math.min(...xs), corte0.x, fimX);
  const y = limitar(Math.min(...ys), corte0.y, fimY);
  const novo = arredondarArea({
    x,
    y,
    largura: limitar(Math.max(...xs), x, fimX) - x,
    altura: limitar(Math.max(...ys), y, fimY) - y,
  });
  if (novo.largura < CORTE_MINIMO || novo.altura < CORTE_MINIMO) return geometria;
  const igual = novo.x === corte0.x && novo.y === corte0.y
    && novo.largura === corte0.largura && novo.altura === corte0.altura;
  // Cortar a foto inteira não é mudança: devolver a mesma geometria evita um
  // passo vazio no histórico (e o "desfazer" que não desfaz nada).
  return igual ? geometria : { ...geometria, corte: novo };
}

/** A nova geometria depois de uma ação (corte, giro ou espelho). */
export function aplicarGeometria(geometria: Geometria, acao: AcaoGeometrica): Geometria {
  if (acao.tipo === 'giro') return { ...geometria, giro: somarGiro(geometria.giro, acao.sentido) };
  if (acao.tipo === 'espelho') return acao.eixo === 'h'
    ? { ...geometria, espelharH: !geometria.espelharH }
    : { ...geometria, espelharV: !geometria.espelharV };
  return cortar(geometria, acao.area);
}

/**
 * Onde uma marca antiga fica na saída nova.
 *
 * Girar e espelhar movem o desenho junto com a imagem; cortar só desloca (e
 * joga fora o que ficou inteiro fora da foto, para a receita não acumular lixo
 * que ninguém vê).
 */
export function moverPonto(ponto: Ponto, acao: AcaoGeometrica, antes: Tamanho): Ponto {
  if (acao.tipo === 'giro') {
    return acao.sentido > 0
      ? { x: antes.altura - ponto.y, y: ponto.x }
      : { x: ponto.y, y: antes.largura - ponto.x };
  }
  if (acao.tipo === 'espelho') {
    return acao.eixo === 'h'
      ? { x: antes.largura - ponto.x, y: ponto.y }
      : { x: ponto.x, y: antes.altura - ponto.y };
  }
  return { x: ponto.x - acao.area.x, y: ponto.y - acao.area.y };
}

/** Todos os pontos que definem uma marca: servem para mover, medir e apagar. */
export function pontosDaMarca(marca: Marca): Ponto[] {
  if (marca.tipo === 'traco') return marca.pontos;
  if (marca.tipo === 'forma') return [marca.de, marca.ate];
  if (marca.tipo === 'texto') {
    const largura = marca.texto.length * marca.tamanho * 0.56;
    return [
      marca.em,
      { x: marca.em.x + largura, y: marca.em.y },
      { x: marca.em.x, y: marca.em.y + marca.tamanho * 1.25 },
      { x: marca.em.x + largura, y: marca.em.y + marca.tamanho * 1.25 },
    ];
  }
  return [
    { x: marca.area.x, y: marca.area.y },
    { x: marca.area.x + marca.area.largura, y: marca.area.y },
    { x: marca.area.x, y: marca.area.y + marca.area.altura },
    { x: marca.area.x + marca.area.largura, y: marca.area.y + marca.area.altura },
  ];
}

export function limitesDaMarca(marca: Marca): Retangulo {
  const pontos = pontosDaMarca(marca);
  if (!pontos.length) return { x: 0, y: 0, largura: 0, altura: 0 };
  const xs = pontos.map(ponto => ponto.x);
  const ys = pontos.map(ponto => ponto.y);
  const margem = marca.tipo === 'traco' || marca.tipo === 'forma' ? marca.espessura / 2 : 0;
  const x = Math.min(...xs) - margem;
  const y = Math.min(...ys) - margem;
  return { x, y, largura: Math.max(...xs) + margem - x, altura: Math.max(...ys) + margem - y };
}

function moverMarca(marca: Marca, acao: AcaoGeometrica, antes: Tamanho): Marca {
  const leva = (ponto: Ponto) => moverPonto(ponto, acao, antes);
  if (marca.tipo === 'traco') return { ...marca, pontos: marca.pontos.map(leva) };
  if (marca.tipo === 'forma') return { ...marca, de: leva(marca.de), ate: leva(marca.ate) };
  if (marca.tipo === 'texto') return { ...marca, em: leva(marca.em) };
  const canto = leva({ x: marca.area.x, y: marca.area.y });
  const fim = leva({ x: marca.area.x + marca.area.largura, y: marca.area.y + marca.area.altura });
  return {
    ...marca,
    area: {
      x: Math.min(canto.x, fim.x), y: Math.min(canto.y, fim.y),
      largura: Math.abs(fim.x - canto.x), altura: Math.abs(fim.y - canto.y),
    },
  };
}

const foraDaFoto = (marca: Marca, depois: Tamanho) => {
  const caixa = limitesDaMarca(marca);
  return caixa.x >= depois.largura || caixa.y >= depois.altura
    || caixa.x + caixa.largura <= 0 || caixa.y + caixa.altura <= 0;
};

/** A receita inteira depois de uma ação geométrica. */
export function aplicarAcao(edicao: Edicao, acao: AcaoGeometrica): Edicao {
  const antes = tamanhoDaSaida(edicao.geometria);
  const geometria = aplicarGeometria(edicao.geometria, acao);
  const depois = tamanhoDaSaida(geometria);
  if (geometria === edicao.geometria) return edicao;
  return {
    ...edicao,
    geometria,
    marcas: edicao.marcas
      .map(marca => moverMarca(marca, acao, antes))
      .filter(marca => !foraDaFoto(marca, depois)),
  };
}

/* ------------------------------------------------------------ proporções -- */

export interface Proporcao { id: string; nome: string; razao: number | null; dica: string }

/**
 * Proporções do corte. `null` é o corte livre; o resto é o que o dedo encontra
 * nos álbuns de verdade (quadrado de rede social, retrato, história vertical).
 */
export const PROPORCOES: Proporcao[] = [
  { id: 'livre', nome: 'Livre', razao: null, dica: 'Arraste como quiser.' },
  { id: 'atual', nome: 'Atual', razao: 0, dica: 'Mantém a proporção que a foto tem agora.' },
  { id: '1:1', nome: '1:1', razao: 1, dica: 'Quadrado: o formato do perfil e do mosaico.' },
  { id: '4:5', nome: '4:5', razao: 4 / 5, dica: 'Retrato de rede social.' },
  { id: '3:4', nome: '3:4', razao: 3 / 4, dica: 'Retrato clássico.' },
  { id: '2:3', nome: '2:3', razao: 2 / 3, dica: 'Retrato de câmera.' },
  { id: '9:16', nome: '9:16', razao: 9 / 16, dica: 'História e papel de parede do aparelho.' },
  { id: '5:4', nome: '5:4', razao: 5 / 4, dica: 'Paisagem curta.' },
  { id: '4:3', nome: '4:3', razao: 4 / 3, dica: 'Paisagem de câmera.' },
  { id: '3:2', nome: '3:2', razao: 3 / 2, dica: 'Paisagem clássica.' },
  { id: '16:9', nome: '16:9', razao: 16 / 9, dica: 'Tela e capa.' },
];

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Arredonda para pixels inteiros: meio pixel de corte vira borda embaçada. */
export function arredondarArea(area: Retangulo): Retangulo {
  const x = Math.round(area.x);
  const y = Math.round(area.y);
  return { x, y, largura: Math.round(area.x + area.largura) - x, altura: Math.round(area.y + area.altura) - y };
}

/** A maior área com essa proporção que cabe na foto, centralizada. */
export function areaProporcional(tamanho: Tamanho, razao: number | null): Retangulo {
  const { largura, altura } = tamanho;
  if (!razao || !(razao > 0) || !(largura > 0) || !(altura > 0)) return { x: 0, y: 0, largura, altura };
  let larguraAlvo = largura;
  let alturaAlvo = largura / razao;
  if (alturaAlvo > altura) { alturaAlvo = altura; larguraAlvo = altura * razao; }
  return arredondarArea({ x: (largura - larguraAlvo) / 2, y: (altura - alturaAlvo) / 2, largura: larguraAlvo, altura: alturaAlvo });
}

/** Ajusta uma área aos limites da foto (e ao tamanho mínimo de um corte). */
export function encaixarArea(area: Retangulo, tamanho: Tamanho): Retangulo {
  const largura = limitar(area.largura, 1, Math.max(1, tamanho.largura));
  const altura = limitar(area.altura, 1, Math.max(1, tamanho.altura));
  return arredondarArea({
    x: limitar(area.x, 0, Math.max(0, tamanho.largura - largura)),
    y: limitar(area.y, 0, Math.max(0, tamanho.altura - altura)),
    largura, altura,
  });
}

/**
 * A área com a proporção travada: corta o lado que sobra em vez de esticar a
 * figura, para o rosto não virar elipse no corte 1:1.
 */
function travarProporcao(area: Retangulo, razao: number | null, tamanho: Tamanho): Retangulo {
  if (!razao || !(razao > 0)) return area;
  const atual = area.largura / Math.max(1, area.altura);
  if (Math.abs(atual - razao) < 0.004) return area;
  const centro = { x: area.x + area.largura / 2, y: area.y + area.altura / 2 };
  const largura = atual > razao ? area.altura * razao : area.largura;
  const altura = atual > razao ? area.altura : area.largura / razao;
  return encaixarArea({ x: centro.x - largura / 2, y: centro.y - altura / 2, largura, altura }, tamanho);
}

export type Alca = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'mover';

export const ALCAS: { id: Alca; nome: string }[] = [
  { id: 'nw', nome: 'Canto superior esquerdo' }, { id: 'n', nome: 'Borda de cima' },
  { id: 'ne', nome: 'Canto superior direito' }, { id: 'e', nome: 'Borda da direita' },
  { id: 'se', nome: 'Canto inferior direito' }, { id: 's', nome: 'Bordo de baixo' },
  { id: 'sw', nome: 'Canto inferior esquerdo' }, { id: 'w', nome: 'Borda da esquerda' },
];

/**
 * Arrastar a área do corte.
 *
 * `mover` desloca sem mudar o tamanho; as alcas crescem do lado oposto ao dedo.
 * Tudo devolve pixels inteiros dentro da foto, e com proporção travada a área
 * nunca passa do que a foto tem.
 */
export function arrastarArea(
  area: Retangulo,
  alca: Alca,
  movimento: Ponto,
  tamanho: Tamanho,
  razao: number | null = null,
): Retangulo {
  if (alca === 'mover') {
    return encaixarArea({
      ...area,
      x: area.x + movimento.x,
      y: area.y + movimento.y,
    }, tamanho);
  }
  const oeste = alca.includes('w');
  const leste = alca.includes('e');
  const norte = alca.startsWith('n');
  const sul = alca.startsWith('s');
  let x1 = area.x;
  let y1 = area.y;
  let x2 = area.x + area.largura;
  let y2 = area.y + area.altura;
  if (oeste) x1 = limitar(x1 + movimento.x, 0, x2 - CORTE_MINIMO);
  if (leste) x2 = limitar(x2 + movimento.x, x1 + CORTE_MINIMO, tamanho.largura);
  if (norte) y1 = limitar(y1 + movimento.y, 0, y2 - CORTE_MINIMO);
  if (sul) y2 = limitar(y2 + movimento.y, y1 + CORTE_MINIMO, tamanho.altura);
  const crua = { x: x1, y: y1, largura: x2 - x1, altura: y2 - y1 };
  if (!razao) return arredondarArea(crua);
  // Com proporção travada o canto manda nos dois lados; a borda sozinha cresce
  // na direção dela e completa a outra metade.
  const cantos = ['nw', 'ne', 'se', 'sw'] as const;
  const trava = (largura: number, altura: number, ancoraX: number, ancoraY: number) =>
    encaixarArea({ x: ancoraX, y: ancoraY, largura, altura }, tamanho);
  if ((cantos as readonly string[]).includes(alca)) {
    const largura = x2 - x1;
    const altura = largura / razao;
    if (altura > tamanho.altura) return travarProporcao(area, razao, tamanho);
    const ancoraX = oeste ? x2 - largura : x1;
    const ancoraY = norte ? y2 - altura : y1;
    return trava(largura, altura, ancoraX, ancoraY);
  }
  const porLargura = alca === 'e' || alca === 'w';
  const largura = porLargura ? x2 - x1 : (y2 - y1) * razao;
  const altura = porLargura ? (x2 - x1) / razao : y2 - y1;
  if (largura > tamanho.largura || altura > tamanho.altura) return travarProporcao(area, razao, tamanho);
  const ancoraX = oeste ? x2 - largura : porLargura ? x1 : (x1 + x2) / 2 - largura / 2;
  const ancoraY = norte ? y2 - altura : porLargura ? (y1 + y2) / 2 - altura / 2 : y1;
  return trava(largura, altura, ancoraX, ancoraY);
}

/** Lê a área que o dedo acabou de desenhar do zero (arrastar fora da área). */
export function areaDoArrasto(de: Ponto, ate: Ponto, tamanho: Tamanho, razao: number | null = null): Retangulo {
  const crua = {
    x: Math.min(de.x, ate.x), y: Math.min(de.y, ate.y),
    largura: Math.abs(ate.x - de.x), altura: Math.abs(ate.y - de.y),
  };
  const dentro = encaixarArea(crua, tamanho);
  return razao ? travarProporcao(dentro, razao, tamanho) : dentro;
}

/** A área vale como corte? (muito pequena não vale: o dedo escapou). */
export const corteValido = (area: Retangulo) => area.largura >= CORTE_MINIMO && area.altura >= CORTE_MINIMO;

/* ------------------------------------------------------------------ ajustes */

/** O ajuste vira `filter` de CSS/canvas: a mesma string na prévia e no arquivo. */
export function filtroCss(ajustes: Ajustes): string {
  const partes: string[] = [];
  if (ajustes.brilho) partes.push(`brightness(${(1 + ajustes.brilho / 100).toFixed(3)})`);
  if (ajustes.contraste) partes.push(`contrast(${(1 + ajustes.contraste / 100).toFixed(3)})`);
  if (ajustes.saturacao) partes.push(`saturate(${(1 + ajustes.saturacao / 100).toFixed(3)})`);
  if (ajustes.matiz) partes.push(`hue-rotate(${Math.round(ajustes.matiz)}deg)`);
  if (ajustes.desfoque > 0) partes.push(`blur(${(ajustes.desfoque / 2).toFixed(2)}px)`);
  return partes.length ? partes.join(' ') : 'none';
}

export const LIMITES_DO_AJUSTE: { chave: keyof Ajustes; nome: string; minimo: number; maximo: number; passo: number; unidade: string; dica: string }[] = [
  { chave: 'brilho', nome: 'Brilho', minimo: -100, maximo: 100, passo: 1, unidade: '', dica: 'Clareia ou escurece a foto inteira.' },
  { chave: 'contraste', nome: 'Contraste', minimo: -100, maximo: 100, passo: 1, unidade: '', dica: 'Separa ou aproxima as claras das escuras.' },
  { chave: 'saturacao', nome: 'Cor', minimo: -100, maximo: 100, passo: 1, unidade: '', dica: 'A cor mais viva ou mais apagada.' },
  { chave: 'temperatura', nome: 'Temperatura', minimo: -100, maximo: 100, passo: 1, unidade: '', dica: 'Fria (azulada) ou quente (dourada).' },
  { chave: 'matiz', nome: 'Matiz', minimo: -180, maximo: 180, passo: 1, unidade: '°', dica: 'Troca a cor inteira da foto — bom para roupa e cabelo.' },
  { chave: 'desfoque', nome: 'Desfoque', minimo: 0, maximo: 12, passo: 0.5, unidade: 'px', dica: 'Suaviza a foto inteira, como um fundo de retrato.' },
  { chave: 'vinheta', nome: 'Vinheta', minimo: 0, maximo: 100, passo: 1, unidade: '', dica: 'Escurece as bordas para o olho ir ao meio.' },
];

export const ajustesNeutros = (ajustes: Ajustes) =>
  LIMITES_DO_AJUSTE.every(item => Math.abs(ajustes[item.chave]) < 0.01);

export interface FiltroPronto { id: string; nome: string; dica: string; ajustes: Ajustes }

/**
 * Filtros prontos: cada um é só uma receita de ajustes, então o que aparece na
 * prévia é exatamente o que sai no arquivo — e dá para mexer em qualquer
 * controle depois de escolher um.
 */
export const FILTROS_PRONTOS: FiltroPronto[] = [
  { id: 'original', nome: 'Original', dica: 'Sem ajuste nenhum.', ajustes: { ...AJUSTES_NEUTROS } },
  { id: 'vivo', nome: 'Vivo', dica: 'Cor para cima e um pouco mais de contraste.', ajustes: { ...AJUSTES_NEUTROS, saturacao: 34, contraste: 14, brilho: 4 } },
  { id: 'suave', nome: 'Suave', dica: 'Luz baixa, contraste curto, quase um véu.', ajustes: { ...AJUSTES_NEUTROS, brilho: 9, contraste: -13, saturacao: -10, vinheta: 8 } },
  { id: 'quente', nome: 'Quente', dica: 'Dourado de fim de tarde.', ajustes: { ...AJUSTES_NEUTROS, temperatura: 42, brilho: 5, saturacao: 12 } },
  { id: 'frio', nome: 'Frio', dica: 'Azul de dia nublado.', ajustes: { ...AJUSTES_NEUTROS, temperatura: -40, contraste: 8, saturacao: -6 } },
  { id: 'sephia', nome: 'Sépia', dica: 'Foto antiga, papel amarelado.', ajustes: { ...AJUSTES_NEUTROS, temperatura: 62, saturacao: -46, contraste: 8, vinheta: 26 } },
  { id: 'preto-e-branco', nome: 'P&B', dica: 'Só luz e sombra, com contraste de estúdio.', ajustes: { ...AJUSTES_NEUTROS, saturacao: -100, contraste: 22, vinheta: 12 } },
  { id: 'retro', nome: 'Retrô', dica: 'Cor desbotada e canto escuro, como filme vencido.', ajustes: { ...AJUSTES_NEUTROS, saturacao: -22, contraste: -8, brilho: 6, matiz: -8, vinheta: 34 } },
  { id: 'drama', nome: 'Drama', dica: 'Escuro, duro e saturado.', ajustes: { ...AJUSTES_NEUTROS, contraste: 42, saturacao: 18, brilho: -12, vinheta: 40 } },
  { id: 'sonho', nome: 'Sonho', dica: 'Desfoque leve e brilho alto, como lembrança.', ajustes: { ...AJUSTES_NEUTROS, brilho: 12, contraste: -10, saturacao: 8, desfoque: 1.5 } },
];

/** Qual filtro pronto está na foto agora (comparação exata: mexeu, saiu do filtro). */
export function filtroAtivo(ajustes: Ajustes): string {
  const igual = (a: Ajustes, b: Ajustes) => LIMITES_DO_AJUSTE.every(item => Math.abs(a[item.chave] - b[item.chave]) < 0.01);
  return FILTROS_PRONTOS.find(filtro => igual(filtro.ajustes, ajustes))?.id || '';
}

export const ajustesDoFiltro = (id: string): Ajustes =>
  ({ ...AJUSTES_NEUTROS, ...(FILTROS_PRONTOS.find(filtro => filtro.id === id)?.ajustes || {}) });

/* -------------------------------------------------------------------- cores */

export interface Rgb { r: number; g: number; b: number }

export const CORES_PRONTAS: string[] = [
  '#ffffff', '#111111', '#e7959b', '#f2764f', '#daba7d', '#f0d264',
  '#91bba3', '#3fae72', '#7fd4d0', '#63a4d8', '#8f7ae6', '#cb9ae8',
  '#e297bd', '#f06fae', '#a9714b', '#8d8d99',
];

export function hexParaRgb(hex: string): Rgb | null {
  const limpo = (hex || '').trim().replace('#', '');
  const expandido = limpo.length === 3 ? limpo.split('').map(c => c + c).join('') : limpo;
  if (!/^[\da-f]{6}$/i.test(expandido)) return null;
  return {
    r: parseInt(expandido.slice(0, 2), 16),
    g: parseInt(expandido.slice(2, 4), 16),
    b: parseInt(expandido.slice(4, 6), 16),
  };
}

export const rgbParaHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map(valor => Math.round(limitar(valor, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

/** Aceita `#abc`, `#aabbcc` e `rgb(1, 2, 3)`; o que não der vira branco. */
export function corEmHex(cor: string): string {
  const hex = hexParaRgb(cor);
  if (hex) return rgbParaHex(hex);
  const numeros = /rgba?\(([^)]+)\)/i.exec(cor || '');
  if (numeros) {
    const [r, g, b] = numeros[1].split(/[,\s/]+/).map(Number);
    if ([r, g, b].every(valor => Number.isFinite(valor))) return rgbParaHex({ r, g, b });
  }
  return '#ffffff';
}

/** 0 (preto) a 1 (branco): decide se a etiqueta por cima é clara ou escura. */
export function luminancia(cor: string): number {
  const rgb = hexParaRgb(corEmHex(cor));
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export const textoSobre = (cor: string) => (luminancia(cor) > 0.6 ? '#141018' : '#ffffff');

/** A cor de um pixel da imagem, ou nulo quando o ponto cai fora dela. */
export function corDoPixel(dados: ArrayLike<number>, tamanho: Tamanho, ponto: Ponto): string | null {
  const x = Math.floor(ponto.x);
  const y = Math.floor(ponto.y);
  if (!(tamanho.largura > 0) || !(tamanho.altura > 0)) return null;
  if (x < 0 || y < 0 || x >= tamanho.largura || y >= tamanho.altura) return null;
  const indice = (y * tamanho.largura + x) * 4;
  if (indice + 2 >= dados.length) return null;
  return rgbParaHex({ r: dados[indice], g: dados[indice + 1], b: dados[indice + 2] });
}

/**
 * As cores da foto.
 *
 * Conta pixels em caixas de 32 tons por canal (barato e suficiente para olho),
 * devolve as mais frequentes e descarta as que são quase a mesma cor de outra
 * já escolhida — sem isso a paleta vem seis vezes o mesmo bege.
 */
export function coresDominantes(
  dados: ArrayLike<number>,
  tamanho: Tamanho,
  { passo = 7, quantidade = 6, distanciaMinima = 42 }: { passo?: number; quantidade?: number; distanciaMinima?: number } = {},
): string[] {
  if (!dados.length || !(tamanho.largura > 0) || !(tamanho.altura > 0)) return [];
  const caixas = new Map<number, { r: number; g: number; b: number; total: number }>();
  for (let y = 0; y < tamanho.altura; y += passo) {
    for (let x = 0; x < tamanho.largura; x += passo) {
      const indice = (y * tamanho.largura + x) * 4;
      if (indice + 3 >= dados.length) continue;
      if (dados[indice + 3] < 128) continue;
      const r = dados[indice];
      const g = dados[indice + 1];
      const b = dados[indice + 2];
      const chave = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
      const caixa = caixas.get(chave);
      if (caixa) { caixa.r += r; caixa.g += g; caixa.b += b; caixa.total += 1; }
      else caixas.set(chave, { r, g, b, total: 1 });
    }
  }
  const ordenadas = [...caixas.values()].sort((a, b) => b.total - a.total);
  const escolhidas: Rgb[] = [];
  for (const caixa of ordenadas) {
    const media = { r: caixa.r / caixa.total, g: caixa.g / caixa.total, b: caixa.b / caixa.total };
    const repetida = escolhidas.some(ja => Math.hypot(ja.r - media.r, ja.g - media.g, ja.b - media.b) < distanciaMinima);
    if (!repetida) escolhidas.push(media);
    if (escolhidas.length >= quantidade) break;
  }
  return escolhidas.map(rgbParaHex);
}

const CHAVE_DAS_CORES = 'catalog_cores_recentes';

/** As últimas cores usadas, lembradas entre sessões (máximo 12). */
export function lerCoresRecentes(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_DAS_CORES);
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.filter(item => typeof item === 'string' && hexParaRgb(item)).slice(0, 12);
  } catch { return []; }
}

export function salvarCorRecente(cor: string): string[] {
  const hex = corEmHex(cor);
  const recentes = [hex, ...lerCoresRecentes().filter(item => item !== hex)].slice(0, 12);
  try { localStorage.setItem(CHAVE_DAS_CORES, JSON.stringify(recentes)); } catch { /* lembrança é mimo */ }
  return recentes;
}

/* ------------------------------------------------------------------- marcas */

let sequencia = 0;
export const idDaMarca = () => `m${Date.now().toString(36)}${(sequencia++).toString(36)}`;

export interface OpcoesDePincel { cor: string; espessura: number; opacidade: number }

/** Junta pontos repetidos (dedo parado) e corta o traço de uma coordenada só. */
export function caminhoDoTraco(pontos: Ponto[], minimo = 1.2): Ponto[] {
  const caminho: Ponto[] = [];
  for (const ponto of pontos) {
    const ultimo = caminho[caminho.length - 1];
    if (!ultimo || Math.hypot(ultimo.x - ponto.x, ultimo.y - ponto.y) >= minimo) caminho.push({ x: ponto.x, y: ponto.y });
  }
  return caminho;
}

export function novoTraco(pontos: Ponto[], opcoes: OpcoesDePincel): Traco | null {
  const caminho = caminhoDoTraco(pontos);
  if (!caminho.length) return null;
  return {
    id: idDaMarca(), tipo: 'traco', pontos: caminho, cor: corEmHex(opcoes.cor),
    espessura: Math.max(1, Math.round(opcoes.espessura)), opacidade: limitar(opcoes.opacidade, 0.05, 1),
  };
}

export const FORMAS: { id: FormaTipo; nome: string }[] = [
  { id: 'linha', nome: 'Linha' }, { id: 'seta', nome: 'Seta' },
  { id: 'retangulo', nome: 'Retângulo' }, { id: 'elipse', nome: 'Círculo' },
];

export function novaForma(
  figura: FormaTipo, de: Ponto, ate: Ponto, opcoes: OpcoesDePincel & { preenchida: boolean },
): Forma | null {
  if (Math.hypot(ate.x - de.x, ate.y - de.y) < 3) return null;
  return {
    id: idDaMarca(), tipo: 'forma', figura, de: { ...de }, ate: { ...ate },
    cor: corEmHex(opcoes.cor), espessura: Math.max(1, Math.round(opcoes.espessura)),
    opacidade: limitar(opcoes.opacidade, 0.05, 1), preenchida: !!opcoes.preenchida,
  };
}

export const TAMANHOS_DE_TEXTO = [18, 24, 32, 44, 60, 84];

export function novoTexto(texto: string, em: Ponto, opcoes: { cor: string; opacidade: number; tamanho: number; contorno: boolean }): Texto | null {
  const limpo = texto.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!limpo) return null;
  // O texto não tem espessura: o contorno que o separa do fundo é proporcional
  // ao tamanho da letra, e quem desenha decide isso (ver `tela.ts`).
  return {
    id: idDaMarca(), tipo: 'texto', texto: limpo, em: { x: em.x, y: em.y },
    cor: corEmHex(opcoes.cor), tamanho: Math.max(8, Math.round(opcoes.tamanho)),
    opacidade: limitar(opcoes.opacidade, 0.05, 1), contorno: !!opcoes.contorno,
  };
}

/** Tamanhos do mosaico de privacidade, em pixels da saída. */
export const BLOCOS_DO_MOSAICO = [6, 12, 22];

export function novoBorrado(area: Retangulo, bloco: number): Borrado | null {
  const limpa = arredondarArea(area);
  if (limpa.largura < 6 || limpa.altura < 6) return null;
  return { id: idDaMarca(), tipo: 'borrado', area: limpa, bloco: Math.max(2, Math.round(bloco)) };
}

const distanciaAoSegmento = (ponto: Ponto, a: Ponto, b: Ponto) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comprimento = dx * dx + dy * dy;
  const t = comprimento ? limitar(((ponto.x - a.x) * dx + (ponto.y - a.y) * dy) / comprimento, 0, 1) : 0;
  return Math.hypot(ponto.x - (a.x + t * dx), ponto.y - (a.y + t * dy));
};

/** Amostra pontos ao longo da marca: é por eles que a borracha decide. */
function amostrasDaMarca(marca: Marca): Ponto[] {
  if (marca.tipo === 'traco') return marca.pontos.length ? marca.pontos : [{ x: 0, y: 0 }];
  if (marca.tipo === 'forma') {
    const { de, ate } = marca;
    if (marca.figura === 'linha' || marca.figura === 'seta') {
      const passos = Math.max(2, Math.round(Math.hypot(ate.x - de.x, ate.y - de.y) / 6));
      return Array.from({ length: passos + 1 }, (_, i) => ({ x: de.x + ((ate.x - de.x) * i) / passos, y: de.y + ((ate.y - de.y) * i) / passos }));
    }
    if (marca.figura === 'retangulo') {
      const cantos = [de, { x: ate.x, y: de.y }, ate, { x: de.x, y: ate.y }];
      return cantos.flatMap((canto, i) => {
        const proximo = cantos[(i + 1) % cantos.length];
        return Array.from({ length: 7 }, (_, passo) => ({
          x: canto.x + ((proximo.x - canto.x) * passo) / 6,
          y: canto.y + ((proximo.y - canto.y) * passo) / 6,
        }));
      });
    }
    const centro = { x: (de.x + ate.x) / 2, y: (de.y + ate.y) / 2 };
    const rx = Math.abs(ate.x - de.x) / 2;
    const ry = Math.abs(ate.y - de.y) / 2;
    return Array.from({ length: 25 }, (_, i) => {
      const angulo = (i / 24) * Math.PI * 2;
      return { x: centro.x + Math.cos(angulo) * rx, y: centro.y + Math.sin(angulo) * ry };
    });
  }
  if (marca.tipo === 'texto') return pontosDaMarca(marca);
  const { area } = marca;
  const cantos = [
    { x: area.x, y: area.y }, { x: area.x + area.largura, y: area.y },
    { x: area.x + area.largura, y: area.y + area.altura }, { x: area.x, y: area.y + area.altura },
  ];
  return [...cornersToSamples(cantos), { x: area.x + area.largura / 2, y: area.y + area.altura / 2 }];
}

function cornersToSamples(cantos: Ponto[]): Ponto[] {
  return cantos.flatMap((canto, i) => {
    const proximo = cantos[(i + 1) % cantos.length];
    return Array.from({ length: 7 }, (_, passo) => ({
      x: canto.x + ((proximo.x - canto.x) * passo) / 6,
      y: canto.y + ((proximo.y - canto.y) * passo) / 6,
    }));
  });
}

/**
 * A borracha não apaga pixel: ela tira da receita a marca que o dedo tocou.
 * Assim desfazer devolve o traço inteiro, e a foto por baixo nunca é ferida.
 */
export function apagarMarcas(marcas: Marca[], caminho: Ponto[], raio: number): { marcas: Marca[]; removidas: number } {
  if (!caminho.length || !marcas.length) return { marcas, removidas: 0 };
  const tolerancia = Math.max(6, raio);
  const sobram: Marca[] = [];
  let removidas = 0;
  for (const marca of marcas) {
    const amostras = amostrasDaMarca(marca);
    const tocou = caminho.some(ponto => amostras.some(amostra => distanciaAoSegmento(amostra, ponto, ponto) <= tolerancia));
    if (tocou) removidas += 1;
    else sobram.push(marca);
  }
  return { marcas: sobram, removidas };
}

/** A marca que o dedo pegou (para mover texto ou apagar com um toque). */
export function marcaNoPonto(marcas: Marca[], ponto: Ponto, tolerancia = 12): Marca | null {
  for (let i = marcas.length - 1; i >= 0; i -= 1) {
    const marca = marcas[i];
    const amostras = amostrasDaMarca(marca);
    if (amostras.some(amostra => Math.hypot(amostra.x - ponto.x, amostra.y - ponto.y) <= tolerancia)) return marca;
  }
  return null;
}

export function moverMarcaPara(marcas: Marca[], id: string, deslocamento: Ponto): Marca[] {
  return marcas.map(marca => {
    if (marca.id !== id) return marca;
    const leva = (ponto: Ponto) => ({ x: ponto.x + deslocamento.x, y: ponto.y + deslocamento.y });
    if (marca.tipo === 'traco') return { ...marca, pontos: marca.pontos.map(leva) };
    if (marca.tipo === 'forma') return { ...marca, de: leva(marca.de), ate: leva(marca.ate) };
    if (marca.tipo === 'texto') return { ...marca, em: leva(marca.em) };
    return { ...marca, area: { ...marca.area, x: marca.area.x + deslocamento.x, y: marca.area.y + deslocamento.y } };
  });
}

/* ---------------------------------------------------------------- histórico */

export interface Historico<T> { passado: T[]; atual: T; futuro: T[] }

/** Quantos passos de desfazer cabem: suficiente para uma sessão de edição. */
export const PASSOS_DE_HISTORICO = 40;

export const historicoInicial = <T,>(valor: T): Historico<T> => ({ passado: [], atual: valor, futuro: [] });

export function registrar<T>(historico: Historico<T>, valor: T): Historico<T> {
  if (valor === historico.atual) return historico;
  return {
    passado: [...historico.passado, historico.atual].slice(-PASSOS_DE_HISTORICO),
    atual: valor,
    futuro: [],
  };
}

export function desfazer<T>(historico: Historico<T>): Historico<T> {
  if (!historico.passado.length) return historico;
  const passado = historico.passado.slice(0, -1);
  return { passado, atual: historico.passado[historico.passado.length - 1], futuro: [historico.atual, ...historico.futuro].slice(0, PASSOS_DE_HISTORICO) };
}

export function refazer<T>(historico: Historico<T>): Historico<T> {
  if (!historico.futuro.length) return historico;
  return {
    passado: [...historico.passado, historico.atual].slice(-PASSOS_DE_HISTORICO),
    atual: historico.futuro[0],
    futuro: historico.futuro.slice(1),
  };
}

/** Começar de novo com uma base nova (a foto mudou, o histórico antigo morreu). */
export const repor = <T,>(valor: T): Historico<T> => ({ passado: [], atual: valor, futuro: [] });

export const podeDesfazer = <T,>(historico: Historico<T>) => historico.passado.length > 0;
export const podeRefazer = <T,>(historico: Historico<T>) => historico.futuro.length > 0;

/** Tem alguma diferença entre a receita e a foto como ela entrou? */
export function temMudanca(edicao: Edicao, tamanho: Tamanho): boolean {
  const inicial = edicaoInicial(tamanho);
  const { corte } = edicao.geometria;
  return edicao.geometria.giro !== 0
    || edicao.geometria.espelharH || edicao.geometria.espelharV
    || corte.x !== inicial.geometria.corte.x || corte.y !== inicial.geometria.corte.y
    || corte.largura !== inicial.geometria.corte.largura || corte.altura !== inicial.geometria.corte.altura
    || !ajustesNeutros(edicao.ajustes)
    || edicao.marcas.length > 0;
}

/* ------------------------------------------------------------------ salvar */

export interface ResultadoDaEdicao { url: string; largura: number; altura: number; filtro: string }

export type ModoDeSalvamento = 'substituir' | 'nova';

/** `foto.jpg` → `foto-editada.jpg`; sem extensão, acrescenta `.webp`. */
export function nomeEditado(nome: string | undefined, sufixo = 'editada'): string {
  const bruto = (nome || 'foto').trim();
  const ponto = bruto.lastIndexOf('.');
  if (ponto > 0) return `${bruto.slice(0, ponto)}-${sufixo}${bruto.slice(ponto)}`;
  return `${bruto}-${sufixo}.webp`;
}

export function fotoEditada(foto: Photo, resultado: ResultadoDaEdicao): Photo {
  return {
    ...foto,
    url: resultado.url,
    width: resultado.largura,
    height: resultado.altura,
    // o hash é a impressão usada para achar duplicata: foto editada é outra foto
    hash: photoHash(resultado.url),
    editedAt: new Date().toISOString(),
  };
}

export function fotoComoNova(foto: Photo, resultado: ResultadoDaEdicao): Photo {
  const agora = new Date().toISOString();
  return {
    ...fotoEditada(foto, resultado),
    id: generateId(),
    name: nomeEditado(foto.name),
    isMain: false,
    favorite: false,
    createdAt: agora,
    capturedAt: foto.capturedAt || null,
  };
}

/**
 * Guarda o resultado no catálogo.
 *
 * A foto pode estar numa ficha ou solta (`orphanPhotos`), e nos dois lugares a
 * regra é a mesma: substituir troca a imagem no lugar dela (a ficha continua
 * apontando para o mesmo id, então nada mais precisa mudar); salvar como nova
 * acrescenta uma cópia logo depois da original, sem virar capa.
 */
export function guardarFotoEditada(
  dados: AppData,
  fotoId: string,
  resultado: ResultadoDaEdicao,
  modo: ModoDeSalvamento = 'substituir',
): AppData {
  const dona = dados.people.find(pessoa => pessoa.fotos.some(foto => foto.id === fotoId));
  if (dona) {
    return {
      ...dados,
      people: dados.people.map(pessoa => {
        if (pessoa.id !== dona.id) return pessoa;
        const indice = pessoa.fotos.findIndex(foto => foto.id === fotoId);
        const original = pessoa.fotos[indice];
        if (!original) return pessoa;
        const fotos = modo === 'substituir'
          ? pessoa.fotos.map(foto => (foto.id === fotoId ? fotoEditada(foto, resultado) : foto))
          : [...pessoa.fotos.slice(0, indice + 1), fotoComoNova(original, resultado), ...pessoa.fotos.slice(indice + 1)];
        return { ...pessoa, fotos, updatedAt: new Date().toISOString() };
      }),
    };
  }
  const indice = dados.orphanPhotos.findIndex(foto => foto.id === fotoId);
  if (indice < 0) return dados;
  const original = dados.orphanPhotos[indice];
  const orphanPhotos = modo === 'substituir'
    ? dados.orphanPhotos.map(foto => (foto.id === fotoId ? fotoEditada(foto, resultado) : foto))
    : [...dados.orphanPhotos.slice(0, indice + 1), fotoComoNova(original, resultado), ...dados.orphanPhotos.slice(indice + 1)];
  return { ...dados, orphanPhotos };
}

export const mensagemDoSalvamento = (modo: ModoDeSalvamento) =>
  modo === 'substituir' ? 'Foto editada. Dá para desfazer se não gostar.' : 'Cópia editada guardada ao lado da original.';
