/**
 * Métricas → proporções.
 *
 * A figura 3D não é a pessoa: é o que as **notas e as medidas já guardadas**
 * dizem dela, virado em forma. Este arquivo é toda a tradução, e nada aqui
 * conhece React, canvas ou catálogo — entra ficha, sai número.
 *
 * Duas regras que valem a pena escrever:
 *
 * 1. **Nota média é neutra.** Um critério 3 (o meio da escala) não engorda nem
 *    afina nada. Só o que está acima ou abaixo do meio mexe na forma.
 * 2. **O que não muda a forma é dito.** Rosto, beleza geral e comportamento não
 *    têm geometria: em vez de inventar uma curva, a tela lista o que ficou de
 *    fora. Melhor uma explicação honesta do que um modelo que finge precisão.
 */
import { getDefaultPerson, RATING_FIELDS } from '../../store';
import type { Person } from '../../types';
import { metrosDaAltura } from './altura';
import { corteDaRoupa, familiaDoCabelo, silhuetaDe, type FamiliaDeCabelo, type Silhueta } from './aparencia';

/** Os critérios que mexem no desenho, e como cada um pesa. */
export const CRITERIOS_DE_FORMA: Record<string, { papel: string; rotulo: string }> = {
  peitos: { papel: 'seios', rotulo: 'Seios' },
  bunda: { papel: 'gluteos', rotulo: 'Glúteos' },
  quadril: { papel: 'quadril', rotulo: 'Quadril (largura)' },
  corpo: { papel: 'volume', rotulo: 'Corpo' },
  cabelo: { papel: 'cabeloVolume', rotulo: 'Cabelo' },
};

/** Critérios que a figura não tenta representar — e por quê. */
export const CRITERIOS_FORA_DA_FORMA: Record<string, string> = {
  rosto: 'a forma do rosto está na foto, não no manequim',
  belezaGeral: 'é um resumo das outras notas, não uma medida',
  comportamento: 'jeito não tem silhueta',
};

export interface Proporcoes {
  /** Altura em metros, com a marca de estimativa quando veio de palavra antiga. */
  altura: number;
  alturaEstimada: boolean;
  /** Meia-larguras e profundidades, em metros. */
  ombros: number;
  cintura: number;
  quadril: number;
  peito: number;
  profundidadePeito: number;
  profundidadeCintura: number;
  profundidadeQuadril: number;
  /** Quanto a pessoa "ocupa" de volume em relação ao padrão (1 = neutro). */
  volume: number;
  /** Raio de cada seio, em metros (o par é simétrico). */
  seios: number;
  /** Raio de cada glúteo, em metros. */
  gluteos: number;
  /** Volume do cabelo (1 = neutro). */
  cabeloVolume: number;
  /** O desenho do cabelo: liso, ondulado, afro, trançado, pixie… */
  cabeloFamilia: FamiliaDeCabelo;
  /** Frações da altura, para a figura inteira caber. */
  pernas: number;
  tronco: number;
  cabeca: number;
  /** Onde a peça de baixo termina (0,07 calça comprida · 0,33 saia no joelho). */
  barraDaCalca: number;
  /** Quanto a barra abre em relação à perna (1 calça justa · 1,5 saia rodada). */
  folgaDaBarra: number;
  /** Leitura da silhueta: arredonda ombros e quadril para o lado certo. */
  silhueta: Silhueta;
}

export interface ExplicacaoDaForma {
  rotulo: string;
  valor: string;
  fontes: string[];
  muda: boolean;
}

export interface LeituraDaForma {
  proporcoes: Proporcoes;
  explicacoes: ExplicacaoDaForma[];
}

const MEIO = 3;
/** Quanto cada passo de nota (0–5) mexe numa medida. Sensibilidade por critério. */
const SENSIBILIDADE: Record<string, number> = { peitos: 0.075, bunda: 0.09, quadril: 0.085, corpo: 0.07, cabelo: 0.16 };

/** Base de uma pessoa de 1,70 m com notas neutras: meia-larguras e meia-profundidades em metros.
 *  São medidas de gente de verdade, não chutes: ombro 40 cm, cintura 25, quadril 35. */
const BASE = { ombros: 0.2, cintura: 0.125, quadril: 0.17, peito: 0.155, profundidadePeito: 0.11, profundidadeCintura: 0.095, profundidadeQuadril: 0.115, volume: 1, cabelo: 1 };
const BASE_ALTURA = 1.7;

interface TipoDeCorpo { ombros: number; cintura: number; quadril: number; volume: number }
/** O tipo de corpo ajusta a base antes de qualquer nota entrar. */
export const AJUSTE_DO_TIPO: Record<string, TipoDeCorpo> = {
  esguio: { ombros: 0.93, cintura: 0.85, quadril: 0.93, volume: 0.9 },
  'atlético': { ombros: 1.09, cintura: 0.85, quadril: 0.97, volume: 1.02 },
  'curvilíneo': { ombros: 0.97, cintura: 0.8, quadril: 1.13, volume: 1.03 },
  robusto: { ombros: 1.13, cintura: 1.12, quadril: 1.07, volume: 1.12 },
  'plus size': { ombros: 1.15, cintura: 1.32, quadril: 1.24, volume: 1.26 },
};

const arredondar = (valor: number, casas = 4) => Math.round(valor * 10 ** casas) / 10 ** casas;
const emCentimetros = (metros: number) => `${Math.round(metros * 100)} cm`;

function nota(person: Person, chave: string): number {
  const bruto = Number((person.rating as unknown as Record<string, number>)[chave]);
  return Number.isFinite(bruto) ? Math.max(0, Math.min(5, bruto)) : 0;
}

/**
 * A nota neutra é o meio da escala: 3 não mexe, 5 aumenta, 1 diminui.
 * **Zero é "sem nota"**, e sem nota também é neutro — quem nunca avaliou não
 * pode aparecer mais magro do que quem deu nota 1.
 */
const passoDaNota = (valor: number, chave: string) => {
  if (!(valor > 0)) return 1;
  return 1 + (valor - MEIO) * (SENSIBILIDADE[chave] ?? 0.07);
};

/**
 * Traduz uma ficha em proporções e em explicações. Determinística: a mesma ficha
 * sempre dá a mesma figura — é o que permite testar e o que permite confiar.
 */
export function lerForma(person: Person): LeituraDaForma {
  const alturaLida = metrosDaAltura(person.altura);
  const altura = alturaLida.metros;
  // Pessoas mais altas são um pouco mais esguias por centímetro de altura; o
  // expoente 0,6 evita que 1,50 m vire uma miniatura de 1,90 m.
  const escala = (altura / BASE_ALTURA) ** 0.45;
  const tipo = AJUSTE_DO_TIPO[(person.tipoCorpo || '').trim().toLowerCase()] || { ombros: 1, cintura: 1, quadril: 1, volume: 1 };
  const explicacoes: ExplicacaoDaForma[] = [];

  const aspectoDoCorpo = passoDaNota(nota(person, 'corpo'), 'corpo');
  const volume = tipo.volume * aspectoDoCorpo;
  const largura = (base: number) => base * escala * volume;

  // A silhueta só arredonda a leitura: ombros e quadril puxam para o lado que a
  // ficha sugere (tipo de corpo, cabelo e estilo), em passos pequenos.
  const silhueta = silhuetaDe(person);
  const peso = silhueta === 'feminina' ? { ombros: 0.95, cintura: 0.93, quadril: 1.06 }
    : silhueta === 'masculina' ? { ombros: 1.06, cintura: 1.0, quadril: 0.95 }
      : { ombros: 1, cintura: 1, quadril: 1 };
  const ombros = largura(BASE.ombros * tipo.ombros) * peso.ombros;
  const quadril = largura(BASE.quadril * tipo.quadril) * passoDaNota(nota(person, 'quadril'), 'quadril') * peso.quadril;
  const passoPeito = passoDaNota(nota(person, 'peitos'), 'peitos');
  const passoBunda = passoDaNota(nota(person, 'bunda'), 'bunda');
  const peito = largura(BASE.peito);
  const cintura = largura(BASE.cintura * tipo.cintura) * peso.cintura;
  const profundidadePeito = arredondar(BASE.profundidadePeito * escala * volume, 4);
  const profundidadeCintura = arredondar(BASE.profundidadeCintura * escala * volume, 4);
  const profundidadeQuadril = arredondar(BASE.profundidadeQuadril * escala * volume * 0.88, 4);
  // Seios e glúteos são peças de verdade no modelo: é o que faz o peito aparecer
  // no perfil e a bunda aparecer de lado, em vez de só mexer na silhueta de frente.
  const seios = arredondar(altura * 0.0255 * passoPeito, 4);
  const gluteos = arredondar(altura * 0.027 * passoBunda, 4);
  const cabeloVolume = passoDaNota(nota(person, 'cabelo'), 'cabelo');
  const roupa = corteDaRoupa(person);

  const proporcoes: Proporcoes = {
    altura, alturaEstimada: alturaLida.estimativa,
    ombros: arredondar(ombros), cintura: arredondar(cintura), quadril: arredondar(quadril), peito: arredondar(peito),
    profundidadePeito, profundidadeCintura, profundidadeQuadril,
    volume: arredondar(volume, 3), seios, gluteos,
    cabeloVolume: arredondar(cabeloVolume, 3),
    cabeloFamilia: familiaDoCabelo(person.cabeloTipo),
    // Pernas longas o bastante para a figura parecer gente, e a cabeça na
    // proporção clássica de ateliê (1/7,5 da altura).
    pernas: 0.47, tronco: 0.38, cabeca: 1 / 7.5,
    // O corte da peça de baixo vem do estilo de roupa; sem estilo, calça comprida.
    barraDaCalca: roupa.barra, folgaDaBarra: roupa.folga, silhueta,
  };

  // Explicações: o que entrou na conta e o que ficou de fora, com o valor lido.
  for (const campo of RATING_FIELDS) {
    const valor = nota(person, campo.key);
    const dentro = CRITERIOS_DE_FORMA[campo.key];
    explicacoes.push({
      rotulo: campo.label,
      valor: valor > 0 ? valor.toFixed(1).replace('.', ',') : 'sem nota',
      fontes: dentro ? [dentro.rotulo] : [],
      muda: !!dentro && valor > 0,
    });
  }
  explicacoes.push({
    rotulo: 'Altura',
    valor: alturaLida.estimativa ? `cerca de ${altura.toFixed(2).replace('.', ',')} m (estimativa)` : `${altura.toFixed(2).replace('.', ',')} m`,
    fontes: ['tamanho da figura'],
    muda: true,
  });
  explicacoes.push({
    rotulo: 'Tipo de corpo',
    valor: person.tipoCorpo || 'não informado',
    fontes: person.tipoCorpo ? ['ombros, cintura e quadril'] : [],
    muda: !!person.tipoCorpo,
  });

  return { proporcoes, explicacoes };
}

/** Um resumo de uma linha, para quem prefere ler a ver. */
export function resumoDaForma(proporcoes: Proporcoes): string {
  return [
    `${proporcoes.altura.toFixed(2).replace('.', ',')} m${proporcoes.alturaEstimada ? ' (estimativa)' : ''}`,
    `ombros ${emCentimetros(proporcoes.ombros * 2)}`,
    `cintura ${emCentimetros(proporcoes.cintura * 2)}`,
    `quadril ${emCentimetros(proporcoes.quadril * 2)}`,
  ].join(' · ');
}

/** A ficha vazia serve de base para as prévias (e para os testes). */
export function fichaNeutra(): Person {
  return { ...getDefaultPerson() };
}
