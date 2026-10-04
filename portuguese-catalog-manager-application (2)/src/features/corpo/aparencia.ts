/**
 * Aparência da figura: o que a ficha sabe e vira cor e cabelo.
 *
 * Aqui mora tudo o que é **visual e não é forma**: tom de pele, cor de cabelo,
 * família do cabelo (liso, ondulado, afro, trançado, pixie…) e a paleta de roupa
 * do estilo declarado. `metricas.ts` cuida das medidas; este arquivo cuida do
 * resto — e é o que faz duas pessoas de mesma altura e mesmas notas ainda
 * parecerem duas pessoas.
 *
 * Nada aqui conhece React nem catálogo: entra ficha (ou só o campo), sai cor.
 */
import type { Person } from '../../types';

/* ------------------------------------------------------------------- pele -- */

export const CORES_DE_PELE: Record<string, string> = {
  'branca': '#f4dac6',
  'parda': '#d3a077',
  'morena': '#b57e52',
  'negra': '#7d4b2f',
  'amarela': '#eccfa4',
  'indigena': '#c98b5c',
};

const COR_PADRAO_DE_PELE = '#c98f63';

/** `personalizado` aceita a cor que a pessoa escolheu; qualquer outra cai no padrão. */
export function corDaPele(person: Person): string {
  const escolha = (person.pele || '').trim().toLowerCase();
  if (escolha === 'personalizado') {
    const custom = (person.peleCustom || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(custom) ? custom : COR_PADRAO_DE_PELE;
  }
  return CORES_DE_PELE[escolha] || COR_PADRAO_DE_PELE;
}

/* ----------------------------------------------------------------- cabelo -- */

export const CORES_DE_CABELO: Record<string, string> = {
  'preto': '#17151a',
  'castanho escuro': '#3b2717',
  'castanho': '#4a3423',
  'castanho claro': '#77543a',
  'loiro': '#c9a15a',
  'ruivo': '#a4482a',
  'grisalho': '#9c9a9e',
  'branco': '#e2e0e4',
};

const COR_PADRAO_DE_CABELO = '#3b2717';

export function corDoCabelo(person: Person): string {
  const escolha = (person.cabeloCor || '').trim().toLowerCase();
  if (escolha === 'colorido') {
    const custom = (person.cabeloCorCustom || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(custom) ? custom : '#c786ec';
  }
  return CORES_DE_CABELO[escolha] || COR_PADRAO_DE_CABELO;
}

/**
 * A família de cabelo decide a **geometria** (o desenho), não a cor.
 * São dez desenhos, e o que não estiver na lista cai no `padrao` (uma touca).
 */
export type FamiliaDeCabelo = 'padrao' | 'curto' | 'medio' | 'longo' | 'ondulado' | 'cacheado' | 'crespo' | 'afro' | 'trancado' | 'preso' | 'franja' | 'mullet' | 'moicano';

/** Os 25 tipos de cabelo da ficha, cada um para o desenho mais próximo do que ele é. */
export const FAMILIA_DO_TIPO: Record<string, FamiliaDeCabelo> = {
  'liso': 'longo',
  'solto': 'longo',
  'longo': 'longo',
  'extensão': 'longo',
  'lace': 'longo',
  'ondulado': 'ondulado',
  'cacheado': 'cacheado',
  'crespo': 'crespo',
  'afro': 'afro',
  'black power': 'afro',
  'trancado': 'trancado',
  'box braids': 'trancado',
  'twists': 'trancado',
  'dreadlock': 'trancado',
  'preso': 'preso',
  'coque': 'preso',
  'rabo de cavalo': 'preso',
  'chanel': 'medio',
  'medio': 'medio',
  'franja': 'franja',
  'mullet': 'mullet',
  'moicano': 'moicano',
  'curto': 'curto',
  'pixie': 'curto',
  'raspado': 'curto',
  'undercut': 'curto',
};

export function familiaDoCabelo(cabeloTipo: string | undefined): FamiliaDeCabelo {
  return FAMILIA_DO_TIPO[(cabeloTipo || '').trim().toLowerCase()] || 'padrao';
}

/* ------------------------------------------------------------------ roupa -- */

export interface Roupa {
  /** A peça de cima (camiseta, blusa, blazer, top esportivo…). */
  topo: string;
  /** A peça de baixo (calça, short, saia). */
  baixo: string;
  sapato: string;
}

/**
 * Cada estilo de roupa é uma paleta — três cores, não trinta. O objetivo não é
 * moda: é reconhecer a pessoa de longe, na silhueta colorida.
 */
export const ROUPAS: Record<string, Roupa> = {
  'casual': { topo: '#6f8fbf', baixo: '#3f4a63', sapato: '#efe9e4' },
  'social': { topo: '#33333d', baixo: '#26262e', sapato: '#191920' },
  'esportivo': { topo: '#2fb3a0', baixo: '#2b3550', sapato: '#f2f2f2' },
  'clássico': { topo: '#8c6f4f', baixo: '#4d4133', sapato: '#3a2f26' },
  'alternativo': { topo: '#6b4d8f', baixo: '#2c2436', sapato: '#1f1a24' },
  'streetwear': { topo: '#e2603f', baixo: '#2f3138', sapato: '#f4f0e6' },
  'romântico': { topo: '#e8a9bd', baixo: '#b98fa8', sapato: '#fbf4f6' },
  'minimalista': { topo: '#d8d5da', baixo: '#3b3a40', sapato: '#8f8d94' },
  'vintage': { topo: '#b98b5e', baixo: '#5b4a3a', sapato: '#e8dfc9' },
  'criativo': { topo: '#4fa5c9', baixo: '#a1573f', sapato: '#f0e2b6' },
};

const ROUPA_PADRAO: Roupa = { topo: '#8b7fa8', baixo: '#3a3644', sapato: '#2c2933' };

/**
 * A roupa da figura: o estilo declarado na ficha. `personalizado` (ou campo
 * vazio) usa a **cor da pessoa** no topo — a mesma do avatar —, o que dá um
 * jeito simples de reconhecer quem é quem.
 */
export function roupaDe(person: Person, corDaPessoa: string): Roupa {
  const estilo = (person.estiloRoupa || '').trim().toLowerCase();
  if (estilo === 'personalizado') return { ...ROUPA_PADRAO, topo: corDaPessoa };
  return ROUPAS[estilo] || { ...ROUPA_PADRAO, topo: corDaPessoa };
}

/** Versão monocromática, para o modo silhueta: só a forma importa. */
export const ROUPA_SILHUETA: Roupa = { topo: '#7a7684', baixo: '#615d6c', sapato: '#4a4753' };
export const PELE_SILHUETA = '#8d8996';
export const CABELO_SILHUETA = '#6f6b7a';
