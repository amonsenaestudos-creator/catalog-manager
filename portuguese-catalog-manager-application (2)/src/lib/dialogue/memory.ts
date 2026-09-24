/**
 * Memória contextual com importância e esquecimento.
 *
 * 🔴 Importante — "Meu aniversário é dia 8." — fica por meses.
 * 🟡 Normal — "Fui no shopping ontem." — dura algumas semanas.
 * ⚪ Temporária — "Estou com fome." — some em poucos dias.
 *
 * Nada é apagado: a força da memória cai com os dias, e memória com
 * força baixa simplesmente para de competir na recuperação — é assim
 * que o "esquecer" natural acontece.
 */
import type { ImportanciaMemoria, MemoriaConversa } from '../../types';
import { generateId, normalizeText } from '../../store';
import { extrairMemorias, temasDoTexto } from '../dialogue';
import { topicoDaMensagem } from './topics';

/** Meia-vida (em dias) de cada classe de importância. */
export const MEIA_VIDA: Record<ImportanciaMemoria, number> = { alta: 90, media: 30, temporaria: 6 };
const LIMITE_MEMORIAS = 40;
/** Abaixo disso a memória não compete mais na recuperação — ela "esqueceu". */
export const FORCA_MINIMA = 0.08;

const IMPORTANTE = /\b(aniversari|aniversário|meu nome|meu telefone|meu numero|numero do celular|prometo|nunca vou esquecer|é minha melhor)\b/i;
const TEMPORARIO = /\b(fome|sede|cansad[oa]\b|com sono|exaust[oa]|entediad[oa]|tenho pressa|vou dormir|tô no banho|calor|frio)\b/i;

const ORDEM: Record<ImportanciaMemoria, number> = { temporaria: 0, media: 1, alta: 2 };
const maxImportancia = (a: ImportanciaMemoria, b: ImportanciaMemoria) => (ORDEM[a] >= ORDEM[b] ? a : b);

export interface MemoriaNova {
  tipo: string;
  valor: string;
  topico: string;
  importancia: ImportanciaMemoria;
}

/** Classifica o peso da informação: 🔴 importante, 🟡 normal, ⚪ temporária. */
export function importanciaDe(texto: string, tipo: string): ImportanciaMemoria {
  if (tipo === 'fato') return 'alta';
  if (IMPORTANTE.test(texto)) return 'alta';
  if (tipo === 'estado') return 'temporaria';
  if (TEMPORARIO.test(texto)) return 'temporaria';
  return 'media';
}

const REGRAS_RICAS: [string, RegExp, number][] = [
  // "Meu aniversário é dia 8" — fato importante que fica por meses.
  ['fato', /\bmeu aniversário (?:é|e) dia\s+\d{1,2}/i, 0],
  // Preferências fortes: "eu odeio segunda-feira" (alimenta piada interna).
  ['preferencia', /\b(?:eu\s+)?(?:odeio|detesto)\s+(segunda[- ]feira|terça[- ]feira|sábado à noite|manhã cedo|terça|segunda|domingo)/i, 1],
  // Estado momentâneo: "tô com fome", "tô cansado" — some em dias.
  ['estado', /\bt[ôo] (?:com )?(?:fome|cansad[oa]|com sono|exaust[oa]|entediad[oa])\b/i, 1],
  // Pessoa da sua vida: "minha mãe sempre manda...".
  ['pessoa', /\b(?:meu|meua|minha|a) (?:mãe|mae|pai|filha|filho|irmã|irma|irmão|irmao|cachorro|gato) (?:sempre|é|e|fica|manda|gosta)/i, 1],
];

/**
 * Extrai o que ela deve lembrar de você nesta mensagem, com classe e
 * peso. Reaproveita o extrator do motor (preferência, evento, rotina)
 * e adiciona os fatos ricos que o motor não pega.
 */
export function extrairMemoriasRicas(texto: string): MemoriaNova[] {
  const brutas: { tipo: string; valor: string }[] = [];
  const chave = (v: string) => normalizeText(v);
  const push = (tipo: string, valor: string) => {
    const limpo = valor.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (limpo.length < 3) return;
    // Frase sem conteúdo não vira lembrança.
    if (/^(alguma coisa|algo|qualquer coisa|uma coisa|coisa|isso|aquilo|nada|um pouco|mais tarde|depois)/i.test(limpo)) return;
    if (brutas.some(item => chave(item.valor) === chave(limpo))) return;
    brutas.push({ tipo, valor: limpo });
  };
  for (const item of extrairMemorias(texto)) push(item.tipo, item.valor);
  for (const [tipo, padrao, grupo] of REGRAS_RICAS) {
    const encontro = texto.match(padrao);
    if (encontro) push(tipo, grupo === 0 ? encontro[0] : (encontro[grupo] || ''));
  }
  const topico = topicoDaMensagem(texto) || 'dia';
  return brutas.slice(0, 2).map(item => ({
    tipo: item.tipo,
    valor: item.valor,
    topico,
    importancia: importanciaDe(texto, item.tipo),
  }));
}

/**
 * Junta as memórias novas às antigas. Repetição de conteúdo não duplica:
 * fortalece a memória (usos +1) — é assim que nasce a piada interna.
 */
export function adicionarMemorias(
  antigas: MemoriaConversa[],
  novas: MemoriaNova[],
  personId: string,
  agora: Date = new Date(),
): MemoriaConversa[] {
  const chave = (v: string) => normalizeText(v);
  const lista = [...antigas];
  for (const nova of novas) {
    const existente = lista.find(item => chave(item.content) === chave(nova.valor));
    if (existente) {
      existente.usos += 1;
      existente.lastUsedAt = agora.toISOString();
      existente.forca = Math.max(existente.forca, 0.85);
      existente.importance = maxImportancia(existente.importance, nova.importancia);
      continue;
    }
    lista.push({
      id: generateId(),
      personId,
      content: nova.valor,
      tipo: nova.tipo,
      topico: nova.topico,
      importance: nova.importancia,
      createdAt: agora.toISOString(),
      usos: 1,
      forca: 1,
    });
  }
  return lista.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-LIMITE_MEMORIAS);
}

/**
 * Frescor da memória: a força cai com os dias (meia-vida por
 * importância) a partir da última vez em que foi usada.
 */
export function forcaDa(m: MemoriaConversa, agora: Date = new Date()): number {
  const base = Date.parse(m.lastUsedAt || m.createdAt);
  if (!Number.isFinite(base)) return m.forca;
  const dias = Math.max(0, (agora.getTime() - base) / 86400000);
  return Math.max(0, Math.pow(0.5, dias / MEIA_VIDA[m.importance]));
}

/** Aplica o decaimento a todas as memórias (atualiza a força; não apaga). */
export function decairMemorias(mems: MemoriaConversa[], agora: Date = new Date()): MemoriaConversa[] {
  return mems.map(m => ({ ...m, forca: Number(Math.max(0, Math.min(m.forca, forcaDa(m, agora))).toFixed(3)) }));
}

/**
 * `retrieveRelevantMemories(message, person)`: as memórias relacionadas
 * à conversa atual. Palavra em comum pesa mais; importância e força
 * desempatam; memória fraca não concorre — esse é o esquecimento.
 */
export function retrieveRelevantMemories(
  mensagem: string,
  mems: MemoriaConversa[],
  quantas = 3,
  agora: Date = new Date(),
): MemoriaConversa[] {
  const ativas = mems.filter(m => forcaDa(m, agora) >= FORCA_MINIMA);
  if (!ativas.length) return [];
  const palavras = normalizeText(mensagem).split(/\s+/).filter(p => p.length > 3);
  return ativas
    .map(m => {
      const alvo = normalizeText(`${m.content} ${m.tipo} ${m.topico}`);
      const comuns = palavras.filter(p => alvo.includes(p)).length;
      const pesoImp = m.importance === 'alta' ? 2 : m.importance === 'media' ? 1 : 0.4;
      return { m, nota: comuns * 2.2 + pesoImp * 0.8 + forcaDa(m, agora) * 1.2 + m.usos * 0.5 };
    })
    .sort((a, b) => b.nota - a.nota)
    .slice(0, quantas)
    .map(item => item.m);
}

/** O que a tela mostra: as memórias mais recentes, com força decaída. */
export function memoriasVisiveis(mems: MemoriaConversa[], agora: Date = new Date()): MemoriaConversa[] {
  return decairMemorias(mems, agora).slice(-8).reverse();
}

/** Tópicos citados no texto (reuso do mapa do motor). */
export const temasCitados = (texto: string): string[] => temasDoTexto(texto);
