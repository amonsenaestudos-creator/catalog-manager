/**
 * Intenções da mensagem: o que ela ESTÁ FAZENDO na conversa.
 *
 * Uma mensagem não é uma bagunça de palavras — é um ato: pergunta,
 * história, reação, despedida, pedido. As regras abaixo são dados:
 * para entender um jeito novo de falar, adiciona-se uma linha aqui.
 *
 * Tudo é comparado SEM acento e em minúsculas: acento é detalhe de
 * digitação, não de significado ("vc vai na escoka hj" e "você vai na
 * escola hoje" são a mesma intenção).
 */
import { semAcentos } from './normalization';

export type IntencaoMensagem =
  | 'reacao_risada'
  | 'reacao_surpresa'
  | 'reacao_concordancia'
  | 'reacao_incerteza'
  | 'saudacao'
  | 'despedida'
  | 'pergunta_evento'
  | 'pergunta_plano'
  | 'pergunta_aberta'
  | 'compartilhar_evento'
  | 'contar_historia'
  | 'expressar_emocao'
  | 'desabafar'
  | 'pedir_ajuda'
  | 'desculpa'
  | 'continuar'
  | 'resposta_curta'
  | 'desconhecida';

export interface LeituraIntencao {
  intent: IntencaoMensagem;
  /** 0 a 1: quão confiante a detecção está. */
  score: number;
  /** A mensagem inteira é uma reação ("kkkkk", "ata", "mds"). */
  reacaoPura: boolean;
  /** Quando a reação é resposta: "sssss" → sim, "nnnnn" → não. */
  resposta?: 'sim' | 'nao';
}

interface Regra {
  id: IntencaoMensagem;
  /** Testada contra o texto normalizado, em minúsculas. */
  sinais: RegExp[];
  /** Se bater, a mensagem INTEIRA é esta intenção e nada mais. */
  sozinha?: RegExp;
  score: number;
  resposta?: 'sim' | 'nao';
}

const RISADA = 'k{2,}|rs{2,}|😂+|😆+';

/**
 * Ordem = prioridade. A primeira regra que batte ganha (sinais extras só
 * aumentam o score). Reações puras são conferidas antes de qualquer coisa.
 */
const REGRAS: Regra[] = [
  {
    id: 'reacao_risada',
    sozinha: new RegExp(`^(${RISADA})(?:[.,!?\\s]+(?:${RISADA}))*(?:[.,!?\\s]*)$`),
    sinais: [],
    score: 0.97,
  },
  {
    id: 'reacao_surpresa',
    sozinha: new RegExp(`^(?:meu deus|caraca|caralho|oxe|eita|nossa|credo|vish|que isso|ai que|aí que|poxa)(?:[.,!?\\s]+(?:${RISADA}))?(?:[.,!?\\s]*)$`),
    sinais: [],
    score: 0.95,
  },
  {
    id: 'reacao_concordancia',
    sozinha: new RegExp(
      '^(?:ata+|aham+|aaam+|hmm+|hum+|certo|show|top|ok|beleza|otim[oa]|perfeit[oa]|fechad[oa]|entendi|pode ser|pdc|srs|seri[oa])(?:[.,!?\\s]+(?:entendi|show|top|certo|beleza|ok|perfeit[oa]|fechad[oa]|pdc|srs|seri[oa]|otim[oa]))?(?:[.,!?\\s]+(?:' + RISADA + '))?(?:[.,!?\\s]*)$',
    ),
    sinais: [],
    score: 0.95,
  },
  {
    id: 'reacao_incerteza',
    sozinha: /^(?:n(?:ao|ão)? sei|sei la|sem ideia)(?:[.,!? ]+(?:n(?:ao|ão)?|sei la|sem ideia))?[.,!?\s]*$/,
    sinais: [],
    score: 0.9,
  },
  {
    id: 'resposta_curta',
    sozinha: /^(?:s+|sim(?:\s+sim)?)[.,!?\s]*$/,
    sinais: [],
    score: 0.9,
    resposta: 'sim',
  },
  {
    id: 'resposta_curta',
    sozinha: /^(?:n+|nao(?:\s+nao)?|não(?:\s+não)?)[.,!?\s]*$/,
    sinais: [],
    score: 0.9,
    resposta: 'nao',
  },
  {
    id: 'despedida',
    sinais: [/\b(?:tchau|ate mais|ate logo|ate amanha|ate breve|flw|flws|xau|vou dormir|vou indo|vou sair|chego em casa)\b/i],
    score: 0.9,
  },
  {
    // Cumprimento mora no começo da mensagem — "e aí" no meio do fio é
    // continuação de história, não "oi".
    id: 'saudacao',
    sinais: [/^\s*(?:oi|opa|eai|e a[ií]|salve|bom dia|boa tarde|boa noite|saudade|bom te ver|fala comigo)\b/i],
    score: 0.85,
  },
  {
    id: 'pergunta_evento',
    sinais: [
      /\b(?:viu|vê|sabe|sabes|sabia|ouvi|ficou sabendo|sacou|conhece)\b[^\n]*\b(?:aconteceu|acontecia|isso|o que|essa not[ií]cia|a not[ií]cia|ver)\b/i,
      /\baconteceu\b[^\n]*\?/i,
    ],
    score: 0.88,
  },
  {
    id: 'pergunta_plano',
    sinais: [
      /\b(?:vai|vai ter|vai rolar|pretende|planeja|tem plano|tem planos|tinha marcado|combina|bora|vamos)\b[^\n]*\?/i,
      // Pergunta de plano sem "?" na mensagem: verbo de intenção + tempo.
      /\b(?:vai|vai ter|vai rolar|pretende|planeja|tem plano|tinha marcado|combina|bora)\b[^\n]*\b(?:hoje|amanha|depois|agora|semana|fds|noite|manha|tarde)\b/i,
    ],
    score: 0.88,
  },
  {
    // "é sobre X", "então...", "daí..." — a frase continua o assunto em curso.
    // Marca de continuação no começo; pergunta de plano ganha dela (vem antes).
    id: 'continuar',
    sinais: [
      /^\s*(?:e|entao|dai|dai entao|ou seja|na real|resumindo|pra resumir|basicamente|tipo que|e olha|sobre (?:isso|essa|esse|o|a|ela|ele))\b/i,
    ],
    score: 0.8,
  },
  {
    // "que vergonha" fica de fora: vergonha é emoção (expressar_emocao),
    // não pedido de desculpa.
    id: 'desculpa',
    sinais: [/\b(?:foi mal|foi maldade|desculpa|desculpe|me desculpa|peco desculpa)\b/i],
    score: 0.9,
  },
  {
    id: 'pedir_ajuda',
    sinais: [/\b(?:me ajuda|ajuda|taca (?:uma )?(?:mao|mão|pro)|n(?:ao)? consigo (?:fazer|resolver|pagar|dormir)|preciso (?:de|que|você)|n(?:ao)? sei o que (?:fazer|fa[cç]o))\b/i],
    score: 0.87,
  },
  {
    id: 'desabafar',
    sinais: [
      /\b(?:tô|to|estou)\s+(?:cansad[oa]|exaust[oa]|desistindo|furios[oa]|chatead[oa]|trist[ea]|preocupad[oa]|perdid[oa])\b/i,
      /\b(?:desabafar|anda pesado|me sinto (?:trist|sozinh[oa])|preciso falar)\b/i,
    ],
    score: 0.86,
  },
  {
    id: 'expressar_emocao',
    sinais: [
      /\b(?:vergonha|rid[ií]cul|inacredit|irritant|frustrant|decepcion|chatead[oa]|preocupad[oa]|nervos|ansios|animad[oa]|content|sortud[oa]|orgulhos[oa])\b/i,
      /\b(?:meu deus|caraca|caralho|vish|eita|nossa|credo|poxa|mds)\b/i,
      /\b(?:uma |foi |que era )?merda\b/i,
      /\b(?:trist[ea]|choro|chorando|raiva|furios[oa]|put[oa] que pariu|insegur[oa])\b/i,
    ],
    score: 0.85,
  },
  {
    id: 'compartilhar_evento',
    sinais: [
      /\b(?:fui|fiz|comprei|vi|tive|ganhei|perdi|troquei|acabei de|hoje eu|ontem eu|amanhã eu|estou indo|estava indo|to indo|tava indo|comecei|terminei|voltei|cheguei|mandei|assisti)\b/i,
      // Atividade em andamento: "tô terminando um trabalho", "estou estudando"...
      /\b(?:terminand[oa]|estudand[oa]|trabalhand[oa]|tentand[oa]|resolvend[oa]|assistind[oa]|organizand[oa]|entregand[oa])\b/i,
    ],
    score: 0.84,
  },
  {
    id: 'contar_historia',
    sinais: [],
    score: 0.8,
  },
  {
    id: 'pergunta_aberta',
    sinais: [/\?\s*$/],
    score: 0.7,
  },
  {
    id: 'resposta_curta',
    sinais: [],
    score: 0.55,
  },
];

const contarPalavras = (t: string) => t.split(/\s+/).filter(Boolean).length;

/**
 * A leitura principal da intenção. Recebe o texto JÁ normalizado
 * (abreviações abertas, erros corrigidos) — é aí que o motor lê melhor.
 */
export function principalIntencao(textoNormalizado: string): LeituraIntencao {
  const t = semAcentos((textoNormalizado || '').trim());
  if (!t) return { intent: 'desconhecida', score: 0, reacaoPura: false };

  // 1. Reações puras: a mensagem inteira é um ato só.
  for (const regra of REGRAS) {
    if (regra.sozinha && regra.sozinha.test(t)) {
      return { intent: regra.id, score: regra.score, reacaoPura: true, resposta: regra.resposta };
    }
  }

  // 2. Intenções com sinais explícitos, por prioridade.
  for (const regra of REGRAS) {
    if (!regra.sinais.length || regra.id === 'contar_historia' || regra.id === 'resposta_curta') continue;
    const hits = regra.sinais.filter(s => s.test(t));
    if (!hits.length) continue;

    // "e ai?" é pergunta de continuidade, não cumprimento.
    if (regra.id === 'saudacao' && /\?\s*$/.test(t) && contarPalavras(t) <= 3) {
      return { intent: 'pergunta_aberta', score: 0.72, reacaoPura: false };
    }

    // Risada junto com pouco texto = a mensagem é a reação (conteúdo em seguida).
    const reacaoPura = new RegExp(`\\b(?:${RISADA})\\b`, 'i').test(t)
      && contarPalavras(t) <= 5
      && !t.includes('?');

    return {
      intent: regra.id,
      score: Math.min(0.95, regra.score + 0.05 * (hits.length - 1)),
      reacaoPura,
    };
  }

  // 3. Heurísticas de forma (história longa, pergunta, resposta curta).
  const n = contarPalavras(t);
  const frases = (t.match(/[.!?…]\s/g) || []).length;
  if (n >= 8 || frases >= 2) return { intent: 'contar_historia', score: 0.8, reacaoPura: false };
  if (/\?\s*$/.test(t)) return { intent: 'pergunta_aberta', score: 0.7, reacaoPura: false };
  if (n <= 3) return { intent: 'resposta_curta', score: 0.55, reacaoPura: false };

  // 4. Nada batteu — o motor admite.
  return { intent: 'desconhecida', score: 0.3, reacaoPura: false };
}
