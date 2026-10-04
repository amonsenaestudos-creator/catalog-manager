/**
 * Altura da pessoa — medida, não adjetivo.
 *
 * Antes a ficha só sabia "alta", "baixinha", "minha altura": uma lista de
 * palavras. Agora sabe **1,50 m** — e continua aceitando as palavras antigas,
 * porque quem já preencheu não perde o que escreveu.
 *
 * O que este arquivo responde:
 * 1. "1,50", "1.50", "150", "150 cm" e "1,50 m" são a mesma pessoa? Sim: tudo
 *    vira 1,50 m.
 * 2. Como se escreve isso na tela? `1,50 m`, com vírgula, como se fala.
 * 3. E quando a ficha só tem a palavra antiga? O modelo 3D precisa de um número:
 *    o rótulo vale uma **estimativa**, dita em voz alta para não parecer medida.
 */
import { ALTURA_OPTIONS } from '../../types';

/** Limites do que é uma altura humana; fora disso o campo recusa. */
export const ALTURA_MINIMA = 0.4;
export const ALTURA_MAXIMA = 2.6;

/** Altura usada quando a ficha não tem nem medida nem palavra. */
export const ALTURA_PADRAO = 1.7;

export type AlturaLida =
  | { tipo: 'medida'; metros: number; texto: string; estimativa: false }
  | { tipo: 'qualitativa'; rotulo: string; texto: string; metros: number; estimativa: true };

/**
 * Quanto vale cada palavra antiga, em metros.
 *
 * É estimativa, não medida: existe para o modelo 3D ter por onde começar e para
 * as telas poderem dizer "cerca de 1,75 m". A ficha prefere a medida quando ela
 * existe, sempre.
 */
export const ESTIMATIVA_DO_ROTULO: Record<string, number> = {
  'muito alta': 1.82,
  'alta': 1.75,
  'minha altura': 1.7,
  'um pouco baixa': 1.63,
  'baixa': 1.56,
  'baixinha': 1.5,
};

const SEM_ACENTO = (texto: string) => texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "1,5" → 1.5 · "1,50 m" → 1.5 · "150" → 1.5 · "150cm" → 1.5 · qualquer outra coisa → null. */
export function metrosDeTexto(valor: string): number | null {
  const bruto = (valor || '').trim().toLowerCase();
  if (!bruto) return null;
  const numero = Number(bruto.replace(/m$|cm$|\s|m\b|cm\b/gi, '').replace(',', '.').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  // Números grandes são centímetros: "150" e "95" não são metros de gente.
  const metros = numero >= 3 ? numero / 100 : numero;
  const arredondado = Math.round(metros * 100) / 100;
  if (arredondado < ALTURA_MINIMA || arredondado > ALTURA_MAXIMA) return null;
  return arredondado;
}

/** 1.5 → "1,50 m" · 1.678 → "1,68 m". Sempre duas casas, sempre com vírgula. */
export function formatarAltura(metros: number): string {
  if (!Number.isFinite(metros) || metros <= 0) return '';
  return `${metros.toFixed(2).replace('.', ',')} m`;
}

/** Lê o campo `altura` da ficha em qualquer formato que já tenha sido salvo. */
export function lerAltura(valor: string | undefined): AlturaLida | null {
  const metros = metrosDeTexto(valor || '');
  if (metros) return { tipo: 'medida', metros, texto: formatarAltura(metros), estimativa: false };
  const rotulo = ALTURA_OPTIONS.find(option => SEM_ACENTO(option) === SEM_ACENTO(valor || ''));
  if (!rotulo) return null;
  return { tipo: 'qualitativa', rotulo, texto: rotulo, metros: ESTIMATIVA_DO_ROTULO[rotulo] ?? ALTURA_PADRAO, estimativa: true };
}

/**
 * O formato canônico que vai para o banco: medida vira "1,50 m"; palavra antiga
 * continua palavra (não inventamos um número no lugar do que a pessoa escreveu);
 * vazio continua vazio.
 */
export function normalizarAltura(valor: string | undefined): string {
  const lida = lerAltura(valor);
  if (!lida) return (valor || '').trim();
  return lida.tipo === 'medida' ? lida.texto : lida.rotulo;
}

/** O número que o resto do aplicativo usa — com a estimativa marcada quando é o caso. */
export function metrosDaAltura(valor: string | undefined): { metros: number; estimativa: boolean } {
  const lida = lerAltura(valor);
  return lida ? { metros: lida.metros, estimativa: lida.estimativa } : { metros: ALTURA_PADRAO, estimativa: true };
}

/** Como a altura aparece na ficha: "1,50 m", "alta" ou uma linha vazia honesta. */
export function rotuloDaAltura(valor: string | undefined): string {
  const lida = lerAltura(valor);
  if (!lida) return (valor || '').trim();
  return lida.tipo === 'medida' ? lida.texto : `${lida.rotulo} (cerca de ${formatarAltura(lida.metros)})`;
}

/** Faixa de 10 em 10 cm, para os gráficos entenderem medida e palavra juntas. */
export function faixaDaAltura(metros: number): string {
  const inicio = Math.floor(metros * 10) / 10;
  const fim = Math.round((inicio + 0.09) * 100) / 100;
  return `${formatarAltura(inicio).replace(' m', '')}–${formatarAltura(fim)}`;
}

/** A diferença que mais aparece numa turma: quanto falta para a média. */
export function diferencaDaMedia(metros: number, media = ALTURA_PADRAO): number {
  return Math.round((metros - media) * 100);
}
