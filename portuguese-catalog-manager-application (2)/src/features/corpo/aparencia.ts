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
  /**
   * Onde a peça de baixo termina, em fração da altura: 0,07 é calça comprida,
   * 0,33 é saia na altura do joelho. É o que faz uma pessoa de calça e outra de
   * saia serem reconhecíveis como duas pessoas, e não só duas cores.
   */
  barra: number;
  /** Quanto a barra abre em relação à perna (calça justa 1, calça larga 1,35). */
  folga: number;
  /**
   * Comprimento da manga, em fração do braço: 0,1 é alcinha, 0,45 é manga
   * curta, 1 é manga comprida. Vai até onde o tecido cobre a pele.
   */
  manga: number;
  /** Onde a blusa termina, em fração da altura (0,60 é na cintura; 0,50, no quadril). */
  topoAte: number;
  /** Quanto a roupa folga do corpo (1 justo, 1,15 largo). Vira volume na malha. */
  ajuste: number;
  /** A peça de baixo é saia? Muda a geometria, não só o comprimento: saia roda. */
  saia: boolean;
  /** Sobe um cano pelos tornozelos: bota em vez de sapato. */
  bota: boolean;
}

/**
 * Cada estilo de roupa é uma paleta — três cores, não trinta — e um corte. O
 * objetivo não é moda: é reconhecer a pessoa de longe, na silhueta colorida.
 */
export const ROUPAS: Record<string, Roupa> = {
  'casual': { topo: '#6f8fbf', baixo: '#3f4a63', sapato: '#efe9e4', barra: 0.08, folga: 1.12, manga: 0.42, topoAte: 0.6, ajuste: 1.04, saia: false, bota: false },
  'social': { topo: '#33333d', baixo: '#26262e', sapato: '#191920', barra: 0.06, folga: 1.0, manga: 1.0, topoAte: 0.58, ajuste: 1.0, saia: false, bota: false },
  'esportivo': { topo: '#2fb3a0', baixo: '#2b3550', sapato: '#f2f2f2', barra: 0.07, folga: 1.02, manga: 0.1, topoAte: 0.585, ajuste: 0.99, saia: false, bota: false },
  'clássico': { topo: '#8c6f4f', baixo: '#4d4133', sapato: '#3a2f26', barra: 0.06, folga: 1.0, manga: 1.0, topoAte: 0.6, ajuste: 1.0, saia: false, bota: false },
  'alternativo': { topo: '#6b4d8f', baixo: '#2c2436', sapato: '#1f1a24', barra: 0.07, folga: 1.05, manga: 0.55, topoAte: 0.6, ajuste: 1.05, saia: false, bota: true },
  'streetwear': { topo: '#e2603f', baixo: '#2f3138', sapato: '#f4f0e6', barra: 0.075, folga: 1.15, manga: 0.5, topoAte: 0.56, ajuste: 1.12, saia: false, bota: false },
  'romântico': { topo: '#e8a9bd', baixo: '#b98fa8', sapato: '#fbf4f6', barra: 0.33, folga: 1.5, manga: 0.12, topoAte: 0.6, ajuste: 1.04, saia: true, bota: false },
  'minimalista': { topo: '#d8d5da', baixo: '#3b3a40', sapato: '#8f8d94', barra: 0.07, folga: 1.08, manga: 0.3, topoAte: 0.6, ajuste: 1.02, saia: false, bota: false },
  'vintage': { topo: '#b08a3e', baixo: '#5b4a3a', sapato: '#e8dfc9', barra: 0.24, folga: 1.3, manga: 0.35, topoAte: 0.6, ajuste: 1.05, saia: true, bota: false },
  'criativo': { topo: '#4fa5c9', baixo: '#a1573f', sapato: '#f0e2b6', barra: 0.08, folga: 1.18, manga: 0.45, topoAte: 0.62, ajuste: 1.08, saia: false, bota: false },
};

/** Sem estilo declarado: calça comprida e um top da cor da pessoa. */
const ROUPA_PADRAO: Roupa = { topo: '#8b7fa8', baixo: '#3a3644', sapato: '#2c2933', barra: 0.075, folga: 0.98, manga: 0.3, topoAte: 0.6, ajuste: 1.0, saia: false, bota: false };

/**
 * A chave do estilo, sem acento e em minúsculas.
 *
 * O campo vem de um `select`, mas ficha importada, digitada à mão ou salva por
 * uma versão antiga pode chegar como "romantico" — e aí a saia virava calça sem
 * ninguém entender por quê. Comparar sem acento resolve de vez.
 */
function chaveDoEstilo(estilo: string | undefined): string {
  return semAcento(estilo);
}

/** Texto de ficha comparável: sem acento, sem espaço nas pontas, minúsculo. */
export function semAcento(valor: string | undefined): string {
  return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/**
 * Só o corte (barra e folga) do estilo declarado. A figura precisa disso para
 * posicionar a peça de baixo, e a cor fica com quem desenha.
 */
/** O corte da roupa: o que a malha precisa saber para vestir a figura. */
export interface CorteDaRoupa {
  barra: number; folga: number; manga: number; topoAte: number; ajuste: number; saia: boolean; bota: boolean;
}

export function corteDaRoupa(person: Person): CorteDaRoupa {
  const roupa = roupaDoEstilo(person);
  return { barra: roupa.barra, folga: roupa.folga, manga: roupa.manga, topoAte: roupa.topoAte, ajuste: roupa.ajuste, saia: roupa.saia, bota: roupa.bota };
}

/** A paleta inteira do estilo (ou a padrão, quando não há estilo). */
function roupaDoEstilo(person: Person): Roupa {
  const estilo = chaveDoEstilo(person.estiloRoupa);
  const achado = Object.entries(ROUPAS).find(([chave]) => chaveDoEstilo(chave) === estilo);
  return achado ? achado[1] : ROUPA_PADRAO;
}

/**
 * A roupa da figura: o estilo declarado na ficha. `personalizado` (ou campo
 * vazio) usa a **cor da pessoa** no topo — a mesma do avatar —, o que dá um
 * jeito simples de reconhecer quem é quem.
 */
export function roupaDe(person: Person, corDaPessoa: string): Roupa {
  const estilo = chaveDoEstilo(person.estiloRoupa);
  if (estilo === 'personalizado' || !estilo) return { ...ROUPA_PADRAO, topo: corDaPessoa };
  const achado = Object.entries(ROUPAS).find(([chave]) => chaveDoEstilo(chave) === estilo);
  return achado ? achado[1] : { ...ROUPA_PADRAO, topo: corDaPessoa };
}

/* --------------------------------------------------------------- silhueta -- */

/**
 * Leitura da silhueta a partir do que a ficha diz.
 *
 * A ficha não tem um campo de gênero, e não é para ter. Mas o tipo de corpo, o
 * cabelo e o estilo de roupa juntos já dizem para que lado a figura deve
 * pender — e o corpo humano tem, sim, duas leituras de proporção (ombros mais
 * largos de um lado, quadril mais largo do outro). O ajuste é pequeno de
 * propósito: ele arredonda a leitura, não decide quem a pessoa é.
 */
export type Silhueta = 'feminina' | 'masculina' | 'neutra';

const FAMILIAS_FEMININAS: FamiliaDeCabelo[] = ['longo', 'ondulado', 'cacheado', 'franja', 'medio'];

export function silhuetaDe(person: Person): Silhueta {
  const tipo = semAcento(person.tipoCorpo);
  const familia = familiaDoCabelo(person.cabeloTipo);
  const estilo = semAcento(person.estiloRoupa);
  let feminina = 0, masculina = 0;
  if (tipo === 'curvilineo' || tipo === 'plus size') feminina += 2;
  if (FAMILIAS_FEMININAS.includes(familia)) feminina += 1;
  if (estilo === 'romantico') feminina += 1;
  if (familia === 'moicano' || familia === 'mullet') masculina += 2;
  if (tipo === 'atletico' || tipo === 'robusto') masculina += 1;
  if (semAcento(person.cabeloTipo) === 'raspado' || semAcento(person.cabeloTipo) === 'undercut') masculina += 1;
  if (feminina === masculina) return 'neutra';
  return feminina > masculina ? 'feminina' : 'masculina';
}

/** Versão monocromática, para o modo silhueta: só a forma importa. */
export const ROUPA_SILHUETA: Roupa = { topo: '#7a7684', baixo: '#615d6c', sapato: '#4a4753', barra: 0.075, folga: 1.1, manga: 0.35, topoAte: 0.6, ajuste: 1.04, saia: false, bota: false };
export const PELE_SILHUETA = '#8d8996';
export const CABELO_SILHUETA = '#6f6b7a';
