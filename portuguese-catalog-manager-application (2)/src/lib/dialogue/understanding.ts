/**
 * Message Understanding Engine: o cérebro que lê a mensagem antes de
 * existir resposta.
 *
 *   mensagem
 *     ↓
 *   normalização (gírias, erros de digitação)      → normalization.ts
 *     ↓
 *   contextualização (entidades, pronomes, fio)    → context.ts
 *     ↓
 *   entendimento (intenção, emoção, certeza)       → intents.ts + aqui
 *     ↓
 *   (aí sim: memórias, personalidade, humor...)    → engine.ts
 *
 * A interpretação é interna: a tela mostra o que a pessoa digitou,
 * nunca "texto inválido" ou "intenção desconhecida". E o motor ADMITE
 * incerteza: `lerComo` decide responder normal, usar o contexto, ou
 * perguntar de um jeito humano.
 */
import { normalizarMensagem, semAcentos, type Correcao } from './normalization';
import { principalIntencao, type IntencaoMensagem, type LeituraIntencao } from './intents';
import {
  desambiguarContexto, extrairEntidades, resolverPronomes,
  type Desambiguacao, type Entidade, type LeituraPronome,
} from './context';
import { topicoDaMensagem } from './topics';

export type EmocaoLida =
  | 'neutro'
  | 'feliz'
  | 'brincando'
  | 'surpresa'
  | 'triste'
  | 'raiva'
  | 'preocupado'
  | 'vergonha'
  | 'incerto';

export type TomEmoji = 'positivo' | 'negativo' | 'humor' | 'neutro' | null;

export interface ContextoEntendimento {
  /** Suas mensagens mais recentes (normalizadas) — para entender bolhas em sequência. */
  ultimasSuas?: string[];
  /** As mensagens recentes dela — para pronomes e para a pergunta no ar. */
  ultimasEla?: string[];
  /** O assunto em andamento no grafo de tópicos. */
  topicoAtual?: string | null;
  /** A pergunta que ela deixou no ar. */
  perguntaAberta?: { tema: string; texto: string } | null;
  /** Nomes que você já citou e ela conhece. */
  pessoas?: string[];
  /** Nível da relação (0–2): sarcasmo exige confiança. */
  nivelRelacao?: number;
}

export interface InterpretacaoMensagem {
  /** A mensagem exatamente como chegou. */
  raw: string;
  /** As bolhas curtas que foram lidas juntas (se houver). */
  mergedFrom?: string[];
  /** O texto que o motor efetivamente lê (abreviações abertas, erros entendidos). */
  normalized: string;
  intent: IntencaoMensagem;
  /** A mensagem inteira é um ato de reação (risada, "ata", "mds"...) */
  reacaoPura: boolean;
  emotion: EmocaoLida;
  entities: Entidade[];
  pronome?: LeituraPronome;
  /** Assunto lido na mensagem — ou herdado do fio, quando a mensagem é curta. */
  topic: string | null;
  topicoInheritado: boolean;
  /** 0 a 1: o motor ADMITE o quanto está seguro. */
  certainty: number;
  /** Gírias/abreviações que apareceram, na ordem em que foram escritas. */
  slang: string[];
  /** Erros de digitação que o motor entendeu. */
  erros: Correcao[];
  /** Acabou no meio do fio ("...e ai tipo"). */
  unfinished: boolean;
  /** O motor deve pedir para continuar em vez de "responder". */
  needsContinuation: boolean;
  sarcasmo: boolean;
  emojiTone: TomEmoji;
  /** O que o contexto fez a mensagem significar. */
  desambiguacao?: Desambiguacao;
  /** Como ela deve agir: responde normal, responde pelo contexto, ou esclarece de um jeito humano. */
  lerComo: 'normal' | 'comContexto' | 'esclarecer';
}

// ---------------------------------------------------------------------------
// Bolhas em sequência: "mano" / "tu não sabe" / "o que aconteceu" / "KKKK"
// são UMA conversação, não quatro.
// ---------------------------------------------------------------------------

const ehBolhaCurta = (t: string): boolean => {
  const limpo = (t || '').trim();
  if (!limpo) return false;
  return limpo.split(/\s+/).length <= 3 && !limpo.includes('?') && !limpo.endsWith('.');
};

export function juntarBolhas(bruto: string, ultimasSuas: string[] = []): { texto: string; partes?: string[] } {
  const partes: string[] = [(bruto || '').trim()];
  if (ehBolhaCurta(bruto)) {
    const atual = bruto.trim().toLowerCase();
    // A sequência só vale enquanto as bolhas forem CONSECUTIVAS: a primeira
    // bolha longa quebra a corrente ("kkk que bom" / "você viu a novela?" /
    // "foi mal" não é a mesma conversa que "mano" / "tu não sabe").
    // Réplica ("boa" / "boa") também quebra: é repeteco — o motor já tem isso.
    const cadeia: string[] = [];
    for (let i = ultimasSuas.length - 1; i >= 0 && cadeia.length < 2; i--) {
      const p = (ultimasSuas[i] || '').trim();
      if (!p || !ehBolhaCurta(p) || p.toLowerCase() === atual) break;
      cadeia.unshift(p);
    }
    if (cadeia.length) partes.unshift(...cadeia);
  }
  return { texto: partes.join(' '), partes: partes.length > 1 ? partes : undefined };
}

// ---------------------------------------------------------------------------
// Emojis: não se interpretam literalmente — eles modulam o tom.
// ---------------------------------------------------------------------------

const TONS_EMOJI: Record<string, 'positivo' | 'negativo' | 'humor' | 'neutro'> = {
  '👍': 'positivo', '❤️': 'positivo', '😊': 'positivo', '😄': 'positivo', '🥰': 'positivo',
  '🙌': 'positivo', '🔥': 'positivo', '👏': 'positivo', '💖': 'positivo', '😁': 'positivo',
  '😢': 'negativo', '😭': 'negativo', '😡': 'negativo', '😠': 'negativo', '👎': 'negativo',
  '💔': 'negativo', '😤': 'negativo', '😩': 'negativo', '😨': 'negativo',
  '💀': 'humor', '😂': 'humor', '😆': 'humor', '🤣': 'humor', '😅': 'humor', '🙃': 'humor',
  '😏': 'humor', '👀': 'humor', '🫠': 'humor', '🤡': 'humor', '😜': 'humor',
  '🤔': 'neutro', '🙂': 'neutro', '👌': 'neutro', '😐': 'neutro', '😮': 'neutro',
};

export function tomDosEmojis(texto: string): TomEmoji {
  // Alguns emojis vêm com seletor de variação (❤️ = ❤ + U+FE0F): confere os dois.
  const tons = [...(texto || '')]
    .map(c => TONS_EMOJI[c] || TONS_EMOJI[c + '\uFE0F'])
    .filter(Boolean) as ('positivo' | 'negativo' | 'humor' | 'neutro')[];
  if (!tons.length) return null;
  if (tons.includes('negativo')) return 'negativo';
  if (tons.includes('humor')) return 'humor';
  if (tons.includes('positivo')) return 'positivo';
  return 'neutro';
}

// ---------------------------------------------------------------------------
// Sarcasmo e brincadeira: "nossa que inteligente vc hein" depois de um
// desastre é deboche — o contexto (risada, relação) confirma.
// ---------------------------------------------------------------------------

// Em ASCII: o texto passa por semAcentos antes, então nada depende de
// como acento foi codificado (precomposed vs decomposed).
const SINAIS_SARCASTICO: RegExp[] = [
  /\bque (inteligente|espert[oa]|genio|capaz|perfeit[oa]|lind[oa]|bonit[oa]|forte|educad[oa]|incrivel|fantastico|lucid[oa]|linda|lindo) (vc|voce|vce)\b/,
  /\b(inteligent[ea]|espert[oa]|perfeit[oa]|capaz|lucid[oa]) (mesmo|hein|ne)\b/,
  /\b(fantastico|incrivel|perfeit[oa]|lind[oa]|maravilhos[oa]) (mesmo|hein|ne)\b/,
];

const temRisada = (t: string) => /k{2,}|rs{2,}/.test(t);

export function detectarSarcasmo(textoNormalizado: string, ctx: ContextoEntendimento): boolean {
  const t = semAcentos(textoNormalizado || '');
  if (!SINAIS_SARCASTICO.some(r => r.test(t))) return false;
  return temRisada(t) || (ctx.nivelRelacao ?? 0) >= 1;
}

// ---------------------------------------------------------------------------
// Fios abertos: "...mas ai", "e ai tipo" — a frase acabou no meio do fio.
// ---------------------------------------------------------------------------

const palavrasDe = (t: string) => (t || '').split(/\s+/).filter(Boolean);

export function detectarFimAbrupto(normalizada: string): boolean {
  const limpo = (normalizada || '').replace(/[.,!?…\s]+$/, '');
  const palavras = palavrasDe(limpo).map(semAcentos);
  const ultima = palavras[palavras.length - 1];
  const penultima = palavras[palavras.length - 2];
  if (!ultima) return false;
  if (['e', 'mas', 'tipo', 'so', 'que'].includes(ultima)) return true;
  if (ultima === 'ai' && ['e', 'mas', 'tipo', 'so'].includes(penultima ?? '')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Emoção lida: a reação, o texto e o emoji juntos dizem como ela chegou.
// ---------------------------------------------------------------------------

function emocaoDe(leitura: LeituraIntencao, normalizada: string, emojiTone: TomEmoji, sarcasmo: boolean): EmocaoLida {
  const t = normalizada.toLowerCase();
  if (sarcasmo) return 'brincando';
  switch (leitura.intent) {
    case 'reacao_risada': return 'brincando';
    case 'reacao_surpresa': return temRisada(t) ? 'brincando' : 'surpresa';
    case 'reacao_incerteza': return 'incerto';
    case 'reacao_concordancia': return 'feliz';
    case 'desabafar': return /\b(?:trist|choro|perd[íi])\b/.test(t) ? 'triste' : 'preocupado';
    case 'saudacao': return 'feliz';
    case 'expressar_emocao':
      if (/\b(?:vergonha|rid[ií]cul)\b/.test(t)) return 'vergonha';
      if (/\b(?:trist[ea]|choro|decepcion|perd[íi])\b/.test(t)) return 'triste';
      if (/\b(?:irritad|raiva|furios|put[oa] que pariu)\b/.test(t)) return 'raiva';
      if (/\b(?:preocupad|nervos|ansios|insegur)\b/.test(t)) return 'preocupado';
      if (/\b(?:animad|feliz|content|sortud|orgulhos)\b/.test(t)) return 'feliz';
      if (temRisada(t)) return 'brincando';
      return 'surpresa';
    default:
      break;
  }
  if (temRisada(t)) return 'brincando';
  if (emojiTone === 'negativo') return 'triste';
  if (emojiTone === 'positivo') return 'feliz';
  if (emojiTone === 'humor') return 'brincando';
  return 'neutro';
}

// ---------------------------------------------------------------------------
// Certeza: o motor ADMITE o quanto entendeu.
//   ≥ 0.80  → responde normal
//   ≥ 0.45  → responde usando o contexto
//   < 0.45  → pede esclarecimento de um jeito humano
// ---------------------------------------------------------------------------

function calcularCerteza(
  leitura: LeituraIntencao,
  extra: { erros: number; desambiguou: boolean; topicoDetectado: boolean; topicoInheritado: boolean; unfinished: boolean },
): number {
  let c = leitura.score;
  if (leitura.intent === 'desconhecida') c = 0.3;
  if (extra.desambiguou) c += 0.12;
  if (extra.topicoDetectado) c += 0.05;
  else if (extra.topicoInheritado) c += 0.02;
  if (extra.erros > 0) c -= 0.05;
  if (extra.unfinished) c = Math.min(c, 0.8);
  return Math.min(0.97, Math.max(0.08, Math.round(c * 100) / 100));
}

// ---------------------------------------------------------------------------
// O entendimento completo
// ---------------------------------------------------------------------------

export function interpretarMensagem(bruto: string, ctx: ContextoEntendimento = {}): InterpretacaoMensagem {
  const { texto: junta, partes } = juntarBolhas(bruto, ctx.ultimasSuas || []);
  const { texto: normalizada, slang, erros } = normalizarMensagem(junta);
  const leitura = principalIntencao(normalizada);

  // O contexto vem de perto: suas últimas, as últimas dela e os nomes conhecidos.
  const entidades = extrairEntidades(
    [junta, ...(ctx.ultimasSuas || []).slice(-3), ...(ctx.ultimasEla || []).slice(-2)],
    ctx.pessoas || [],
  );
  const pronome = resolverPronomes(junta, entidades);
  const emojiTone = tomDosEmojis(junta);
  const sarcasmo = detectarSarcasmo(normalizada, ctx);

  const topicoDetectado = topicoDaMensagem(normalizada);
  const topico = topicoDetectado
    || (palavrasDe(normalizada).length <= 5 ? ctx.topicoAtual || null : null);
  const topicoInheritado = !topicoDetectado && !!topico;

  const desambiguacao = desambiguarContexto(normalizada, {
    topicoAtual: topico,
    ultimaEla: ctx.perguntaAberta?.texto || '',
    ultimasSuas: ctx.ultimasSuas || [],
  });

  const unfinished = detectarFimAbrupto(normalizada);
  const needsContinuation = unfinished
    && (palavrasDe(normalizada).length >= 3 || leitura.intent === 'desconhecida')
    && leitura.intent !== 'despedida'
    && leitura.intent !== 'saudacao';

  const certainty = calcularCerteza(leitura, {
    erros: erros.length,
    desambiguou: !!desambiguacao,
    topicoDetectado: !!topicoDetectado,
    topicoInheritado,
    unfinished,
  });

  const lerComo: InterpretacaoMensagem['lerComo'] =
    certainty >= 0.8 ? 'normal' : certainty >= 0.45 ? 'comContexto' : 'esclarecer';

  const resultado: InterpretacaoMensagem = {
    raw: bruto,
    mergedFrom: partes,
    normalized: normalizada,
    intent: leitura.intent,
    reacaoPura: leitura.reacaoPura,
    emotion: emocaoDe(leitura, normalizada, emojiTone, sarcasmo),
    entities: entidades,
    pronome: pronome || undefined,
    topic: topico,
    topicoInheritado,
    certainty,
    slang,
    erros,
    unfinished,
    needsContinuation,
    sarcasmo,
    emojiTone,
    desambiguacao: desambiguacao || undefined,
    lerComo,
  };
  return resultado;
}

/**
 * Rodada sem mensagem sua (abertura, puxada espontânea): o "entendimento"
 * vazio — mantém o formato do plano igual para o resto da camada.
 */
export function interpretacaoVazia(): InterpretacaoMensagem {
  return interpretarMensagem('');
}

// O understanding é a porta de entrada do pacote: as peças do pipeline
// também saem por aqui (quem importa de understanding pega o conjunto).
export { normalizarMensagem, corrigirPossivelErro, semAcentos } from './normalization';
export type { Correcao, Normalizacao } from './normalization';
export { principalIntencao } from './intents';
export type { IntencaoMensagem, LeituraIntencao } from './intents';
export { extrairEntidades, resolverPronomes, desambiguarContexto } from './context';
export type { ContextoParaEntender, Desambiguacao, Entidade, LeituraPronome } from './context';
