/**
 * Respostas com cara de gente.
 *
 * Reações diferentes à mesma mensagem (a personalidade decide o
 * "jeito"), piadas internas nascidas de memória repetida, as
 * reações às consequências (seca, repeteco) e perguntas que
 * mudam de estilo conforme o nível da relação.
 */
import type { MemoriaConversa } from '../../types';
import type { Persona } from '../persona';
import { trocarMarcadores } from '../dialogue';
import { ganchosDoTopico } from './topics';
import type { EstiloReacao, Personalidade } from './types';

type Sentimento = 'positivo' | 'negativo' | 'neutro';

/**
 * A mesma mensagem, seis jeitos de receber. Quem reage do jeito
 * curiosa é a pessoa curiosa; quem responde "KKKKKK acontece" é a
 * engraçada. O banco é o que ela realmente diz.
 */
export const REACOES_POR_ESTILO: Record<EstiloReacao, Record<Sentimento, string[]>> = {
  curiosa: {
    neutro: ['Sério? E como foi isso?', 'Hmm... me conta mais', 'Do nada? Aconteceu mais alguma coisa?'],
    positivo: ['Sério?! Me conta o resto agora', 'Aí sim! Qual foi a melhor parte?'],
    negativo: ['Do tipo que pesa? Me conta com calma'],
  },
  brincalhona: {
    neutro: ['KKKKK acontece', 'kkkk nota 10 pro relato', 'então foi assim, né kkk'],
    positivo: ['KKKKKK me conta mais que eu tô rindo aqui', 'isso sim é matéria pra zoeira kkkk'],
    negativo: ['KKKKK (mentira, me conta sério)'],
  },
  empatica: {
    neutro: ['Entendo, faz sentido', 'Poxa, me conta mais'],
    positivo: ['Que bom de verdade, gosto de ver isso', 'Isso te fez bem, né?'],
    negativo: ['Foi tão ruim assim?', 'Vem cá... respira. Me conta'],
  },
  seca: {
    neutro: ['justo kkk', 'ah ok', 'sei, entendi'],
    positivo: ['boa, gostei de saber', 'kkk que bom'],
    negativo: ['ah não...', 'poxa, que saco'],
  },
  desconfiada: {
    neutro: ['sei... nada mesmo? 👀', 'tá bom tá bom 👀', 'hmm, história boa essa sua'],
    positivo: ['sério? eu duvido um pouco kkk', 'kkkkk boa mentira'],
    negativo: ['eu sabia que hoje tinha algo 👀'],
  },
  ocupada: {
    neutro: ['justo kkk', 'aí você fala e eu no meio das minhas coisas', 'entendi, te respondo direito daqui a pouco'],
    positivo: ['kkk que bom, me faz bem ler isso entre uma coisa e outra', 'boa!'],
    negativo: ['poxa... me conta com calma que eu leio tudo'],
  },
};

/**
 * O "jeito" desta reação, sorteado com peso: curiosidade, humor,
 * empatia, secura, desconfiança e ocupação competem — e o humor do
 * momento puxa a votação (estresse alta a desconfiança, energia
 * baixa a ocupação).
 */
export function estiloDeReacao(
  p: Personalidade,
  humor: { valence: number; energy: number; stress: number },
  rand: () => number,
): EstiloReacao {
  const pesos: [EstiloReacao, number][] = [
    ['curiosa', 0.2 + p.curiosidade * 0.75],
    ['brincalhona', 0.15 + p.humor * 0.85 * (1 - humor.stress * 0.4)],
    ['empatica', 0.2 + p.emotividade * 0.7 * (1 - humor.energy * 0.3)],
    ['seca', (1 - p.extroversao) * 0.5 + (1 - humor.energy) * 0.35],
    ['desconfiada', 0.05 + p.ironia * 0.45 * (humor.valence < 0.15 ? 1 : 0.25)],
    ['ocupada', 0.1 + (1 - p.agilidade) * 0.4 + (1 - humor.energy) * 0.2],
  ];
  let total = 0;
  for (const [, peso] of pesos) total += peso;
  let r = rand() * total;
  for (const [estilo, peso] of pesos) {
    r -= peso;
    if (r <= 0) return estilo;
  }
  return 'curiosa';
}

/**
 * Piada interna: o que você comentou duas ou mais vezes vira a piada
 * da relação. É o que dá a sensação de que a conversa tem história
 * própria — "segunda chegando... já está preparado psicologicamente?"
 */
export function piadasInternas(mems: MemoriaConversa[], persona: Persona, rand: () => number): string | null {
  const candidatas = mems.filter(m => m.usos >= 2 && m.importance !== 'temporaria');
  if (!candidatas.length) return null;
  const alvo = candidatas[Math.floor(rand() * candidatas.length)];
  const risada = persona.assinatura.risada || 'kkk';
  const templates = [
    `${risada} de novo ${alvo.content}? já virou piada interna, tá sabendo`,
    `${alvo.content} de novo... a essa altura já é tradição nossa, né ${risada}`,
    `eu juro que ${alvo.content} vira assunto todo santo dia ${risada}`,
    `sabe o que mais eu lembro? ${alvo.content}. a gente nunca sai disso ${risada}`,
  ];
  return templates[Math.floor(rand() * templates.length)];
}

/**
 * Conversas que podem dar errado — ela percebe e reage. Três
 * respostas secas seguidas ou o "repeteco" do mesmo texto.
 */
export const CONSEQUENCIAS: Record<'seca' | 'repeticao', string[]> = {
  seca: [
    'KKKKKK você só sabe falar "boa"?',
    'ok, então. você fala quando quiser, eu tô ocupada kkk',
    'resposta curta de novo? a paciência anda curta, ó 👀',
  ],
  repeticao: [
    'você tá no repeat, né kkkk',
    'a mesma de novo? eu já respondi essa 😅',
    'ok, essa resposta já tá registrada (x2) kkk',
  ],
};

/**
 * A relação muda o estilo da pergunta — não só o que ela pode
 * perguntar. Nível 0 pergunta genérico; nível 1 puxa o que você
 * já contou; nível 2 cobra a sua ausência.
 */
export const PERGUNTAS_POR_NIVEL: Record<0 | 1 | 2, Record<string, string[]>> = {
  0: {
    musica: ['Você gosta de música?', 'O que você costuma ouvir no dia a dia?'],
    trabalho: ['Você trabalha com o quê?', 'Como foi no trabalho hoje?'],
    comida: ['Você cozinha ou só pede?', 'Tem algum lugar bom aí por perto?'],
    default: ['Como foi o seu dia?', 'Tá fazendo o que de bom essa semana?'],
  },
  1: {
    musica: ['Você ainda tá ouvindo aquela música que comentou?', 'Saiu algo novo da banda que você curte?'],
    trabalho: ['Aquele projeto que você mencionou, andou?'],
    comida: ['Você foi naquele lugar de comida que você comentou?'],
    default: ['E aquilo que você me contou, como terminou?', 'Aconteceu alguma novidade por aí?'],
  },
  2: {
    musica: ['Você sumiu hoje kkkk, aconteceu alguma coisa?'],
    default: ['Você sumiu hoje kkkk, aconteceu alguma coisa?', 'Sumido assim? eu já tava acostumada com você aqui 😅', 'Hoje foi dia de você me deixar na mão, hein kkk'],
  },
};

/** Uma pergunta no nível certo da relação, para o tópico atual. */
export function perguntaPorNivel(nivel: 0 | 1 | 2, topico: string | null, rand: () => number): string {
  const doTopico = topico ? PERGUNTAS_POR_NIVEL[nivel][topico] : undefined;
  const banco = doTopico && doTopico.length ? doTopico : PERGUNTAS_POR_NIVEL[nivel].default;
  return banco[Math.floor(rand() * banco.length)];
}

/** Modelos de puxada espontânea que retomam uma memória sua. */
const PUXADA_POR_MEMORIA: Record<string, string[]> = {
  preferencia: [
    'Você comentou que ama {valor}, lembrei agora',
    'Vi uma coisa sobre {valor} hoje e pensei em você',
  ],
  evento: [
    'E aquilo de {valor}, como foi?',
    'Você me contou de {valor} e eu fiquei curiosa até agora',
  ],
  rotina: ['Como tá indo com {valor}?', 'A rotina de {valor} continua pesada?'],
  fato: ['Só lembrando: {valor} — eu não esqueço essas coisas, viu kkk'],
  estado: ['Acordei lembrando de você falando {valor}... tudo bem?'],
  pessoa: ['Pensei em {valor} hoje e lembrei de você'],
};

/** Monta a puxada de memória na voz da persona. */
export function puxadaPorMemoria(m: MemoriaConversa, persona: Persona, rand: () => number, musica?: string): string {
  const modelos = PUXADA_POR_MEMORIA[m.tipo] || PUXADA_POR_MEMORIA.preferencia;
  const modelo = modelos[Math.floor(rand() * modelos.length)];
  return trocarMarcadores(modelo, persona, rand, musica, { valor: m.content });
}

// ---------------------------------------------------------------------------
// Respostas de ENTENDIMENTO: o que ela diz quando o fio pede algo que
// "responder de memória" não dá. Nenhum "não compreendi sua mensagem" —
// aqui até o pedido de esclarecimento tem cara de gente.
// ---------------------------------------------------------------------------

/** Ela pediu para continuar: a história ficou no ar. */
export const CONTINUACAO_POR_ESTILO: Record<EstiloReacao, string[]> = {
  curiosa: ['e aí? continua que eu tô com a curiosidade a mil', 'espera, você não vai me deixar no suspense não', 'kkkk e aí? o resto é melhor ainda, conta'],
  brincalhona: ['KAKAKAK e aí? continua que eu tô toda ouvida', 'o suspense tá me matando, anda, continua rapidinho', 'e aí? me dá um final antes que eu invente um pior'],
  empatica: ['oi, respira... continua, eu tô aqui', 'pode ir contando, sem pressa', 'e aí? me conta o resto, quer?'],
  seca: ['e aí?', 'continua', 'e o resto dessa história?'],
  desconfiada: ['continua... me dá um final digno dessa história', 'e aí? torcendo pra ter final bom', 'anda, conta o resto antes que eu perca o interesse'],
  ocupada: ['ok, continua rapidinho que eu tô entre uma coisa e outra', 'anda, o resto?'],
};

/** O contexto explicou o que a mensagem significou — ela segue o fio. */
export const CONTEXTO_POR_SENTIMENTO: Record<Sentimento, string[]> = {
  negativo: [
    'aí sim... conta, eu quero saber o tamanho do desastre',
    'entendi... foi ruim mesmo, né. me conta como foi',
    'ah, então saiu mal... o que você vai fazer agora?',
  ],
  positivo: [
    'aí sim! eu sabia que ia dar certo',
    'otimo! mereceu. me conta os detalhes',
    'kkkk sabia que ia dar tudo certo, conta como foi',
  ],
  neutro: [
    'tá, agora faz sentido... e aí, como continua?',
    'ok, entendi o fio. e o que você vai fazer?',
  ],
};

/** Ela não pegou — e pede de um jeito que não quebra o papo. */
export const ESCLARECIMENTO_POR_ESTILO: Record<EstiloReacao, string[]> = {
  curiosa: ['pera, essa parte eu não peguei kkkk tu quis dizer o quê?', 'pera ai... essa parte ficou misturada na minha cabeça, repete do seu jeito?', 'segura, eu perdi o fio dessa parte — o que foi que aconteceu?'],
  brincalhona: ['kkkkk pera, essa frase saiu pela minha orelha, tu quis dizer o quê?', 'espera espera, meu cérebro deu um 404 nessa mensagem kkkk repetiu?'],
  empatica: ['ai, essa parte eu não peguei bem... pode repetir do seu jeito?', 'segura, me explica essa parte de novo? quero te entender direito'],
  seca: ['pera, essa parte eu não peguei, repetiu?', 'o quê foi que você disse aí?'],
  desconfiada: ['essa parte eu não comprei... repete?', 'pera... isso aí veio de surpresa, o que foi?'],
  ocupada: ['anda, repetiu? essa parte eu não peguei'],
};

/** Você mandou só uma reação — ela reage no mesmo tom. */
export const REACAO_ESPELHO: Record<'risada' | 'surpresa' | 'concordancia' | 'incerteza', string[]> = {
  risada: ['kkkkk', 'KKKKKK', 'kkkkk você é insuportável (mentira, continua)', 'kkkkk morrendo aqui'],
  surpresa: ['oi?? o quê?!', 'pera, o quê? conta rapidinho', 'KKKK o que foi, que eu tô perdida'],
  concordancia: ['top', 'beleza', 'show', 'fechado'],
  incerteza: ['sei né kkkk', 'tamo junto nessa dúvida', 'sem pressa, quando resolver me conta'],
};

/** Depois do espelho, às vezes ela puxa o fio de volta. */
export const SEGUIREACAO: string[] = [
  'e aí? o que aconteceu?',
  'conta rapidinho, fiquei curiosa',
  'e o resto? kkkk',
  'ok, e o que você vai fazer?',
];

/** Zoou de volta: quando o sarcasmo dele é brincadeira, ela devolve no mesmo tom. */
export const BRINCADEIRA_DE_VOLTA: string[] = [
  'kkkkk cala a boca, eu sei que sou um desastre',
  'e eu ainda me achando a mais inteligente da sala kkkk',
  'kkkkk pelo menos eu sou honesta, né',
  'falei demais, já sei. e você vai me cobrar isso depois kkkk',
];

/** Escolhe uma linha do banco. */
const linhaDoBanco = (banco: string[], rand: () => number): string => banco[Math.floor(rand() * banco.length)];

/**
 * Aponta o banco certo para cada desvio de entendimento e devolve a linha
 * crua — o motor passa pela voz da persona (estilizarLinha) como todas as
 * outras frases.
 */
export function escolherDesvio(
  tipo: 'continuacao' | 'contexto' | 'esclarecimento' | 'reacao' | 'brincadeira',
  v: { estilo: EstiloReacao; sentimento: Sentimento; reacao: 'risada' | 'surpresa' | 'concordancia' | 'incerteza' },
  rand: () => number,
): string {
  if (tipo === 'continuacao') return linhaDoBanco(CONTINUACAO_POR_ESTILO[v.estilo], rand);
  if (tipo === 'contexto') return linhaDoBanco(CONTEXTO_POR_SENTIMENTO[v.sentimento], rand);
  if (tipo === 'esclarecimento') return linhaDoBanco(ESCLARECIMENTO_POR_ESTILO[v.estilo], rand);
  if (tipo === 'reacao') return linhaDoBanco(REACAO_ESPELHO[v.reacao], rand);
  return linhaDoBanco(BRINCADEIRA_DE_VOLTA, rand);
}

/** O fio continua? (usado pelo motor para decidir se espalha a reação). */
export function segueAposReacao(rand: () => number, curiosa: boolean): string | null {
  if (rand() > (curiosa ? 0.5 : 0.3)) return null;
  return linhaDoBanco(SEGUIREACAO, rand);
}

/**
 * Ela segue o fio SEM fingir que não entendeu: puxa um gancho concreto
 * do assunto em curso ("é sobre IA" + tópico estudo → pergunta sobre o
 * trabalho). Sem assunto no grafo, volta para o dia a dia.
 */
const FIOS_SEGUIDOS: string[] = [
  'entendi o fio, né? {gancho} — me conta mais disso',
  'oii, isso de {gancho} me deixou curiosa, continua',
  'tá, faz sentido. e {gancho}, como tá nesse caminho?',
  'gostei de você ter continuado o papo, viu? {gancho}, o que mais você sabe?',
];

export function linhaSeguindoFio(topico: string | null, rand: () => number): string {
  const ganchos = ganchosDoTopico(topico);
  const gancho = ganchos[Math.floor(rand() * ganchos.length)];
  const frase = FIOS_SEGUIDOS[Math.floor(rand() * FIOS_SEGUIDOS.length)].replace('{gancho}', gancho);
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}
