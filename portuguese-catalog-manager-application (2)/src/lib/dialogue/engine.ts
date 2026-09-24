/**
 * Motor da conversa viva — o orquestrador.
 *
 * O fluxo pedido:
 *
 *   mensagem
 *      ↓
 *   interpretação
 *      ↓
 *   estado da conversa (humor contínuo, tópico, profundidade, iniciativa)
 *      ↓
 *   personalidade da pessoa
 *      ↓
 *   memórias (recuperadas por relevância, com importância e força)
 *      ↓
 *   contexto recente (últimas suas, pergunta aberta, relação)
 *      ↓
 *   objetivo da conversa
 *      ↓
 *   resposta (o motor de texto gera; esta camada tempera)
 *
 * Esta camada NUNCA reescreve o motor de texto: ela decide quem ela
 * é, o que lembra, aonde a conversa vai, o que aconteceu enquanto
 * ninguém olhava — e adiciona, no máximo, uma ou duas bolhas
 * (consequência, reação do jeito dela, piada interna).
 */
import type { ChatMessage, ChatState, HumorContínuo, MemoriaConversa, Person } from '../../types';
import { normalizeText } from '../../store';
import { buildPersona, type Persona } from '../persona';
import { analisarRelacao, type Relacao } from '../relacao';
import { descreverEstado, montarEstadoEstruturado, pacienciaDe, type EstadoEmocional } from '../estado';
import {
  detectarIntencao, estagioAtual, montarAtrasos,
  planDoNada, planOpening, planReply, planSpontaneous, estilizarLinha,
  type ChatPlan, type EstiloContexto, type Mood,
} from '../dialogue';
import type {
  EstadoEstendido, ObjetivoId, ObjetivoInfo, Personalidade, RitmoBolha,
} from './types';
import { personalidadeDe } from './personality';
import { decairHumor, evoluirHumor, humorInicial, leituraHumor } from './mood';
import { adicionarMemorias, decairMemorias, extrairMemoriasRicas, forcaDa, retrieveRelevantMemories } from './memory';
import { transicaoDeTopico } from './topics';
import { OBJETIVOS, objetivoDaConversa } from './goals';
import { relacaoDaConversa } from './relationship';
import { CONSEQUENCIAS, REACOES_POR_ESTILO, escolherDesvio, estiloDeReacao, linhaSeguindoFio, piadasInternas, puxadaPorMemoria, segueAposReacao } from './response';
import { ritmoDePlano } from './timing';
import { iniciativaEfetiva } from './initiative';
import { interpretarMensagem, interpretacaoVazia, type InterpretacaoMensagem } from './understanding';

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export interface EntradaBase {
  person: Person;
  persona?: Persona;
  state: ChatState;
  nomeUsuario?: string;
  adulto?: boolean;
  rand?: () => number;
  rapido?: boolean;
  pausado?: boolean;
  abreviar?: boolean;
  emojis?: boolean;
  pessoas?: Person[];
  dono?: { ownerAge?: number | null; ownerBirthday?: string | null } | null;
  relacao?: Relacao;
  agora?: Date;
}

export interface EntradaResposta extends EntradaBase {
  message: string;
  citacao?: string;
  historico?: ChatMessage[];
  fotoEnviada?: boolean;
}

export interface EntradaPuxada extends EntradaBase {
  motivo?: 'saudade' | 'lembranca' | 'assunto' | 'do_nada';
  /** Quando true (botão "ela mandar agora"), ela sempre fala. */
  forcado?: boolean;
}

export interface ContextoConversa {
  persona: Persona;
  personalidade: Personalidade;
  relacao: Relacao;
  estado: EstadoEstendido;
  rand: () => number;
  agora: Date;
}

/** Plano do motor + a camada viva por cima. */
export interface PlanoEstendido {
  plano: ChatPlan;
  humor: HumorContínuo;
  humorLeitura: string;
  objetivo: ObjetivoInfo;
  topico: string | null;
  profundidade: number;
  iniciativa: number;
  ritmo: RitmoBolha[];
  /** Avisos para a tela (consequência percebida, piada interna...). */
  avisos: string[];
  /**
   * O que o cérebro entendeu antes de responder (intenção, certeza,
   * gírias, erros entendidos...). É interno: a tela não mostra.
   */
  interpretacao: InterpretacaoMensagem;
}

// ---------------------------------------------------------------------------
// Preparação
// ---------------------------------------------------------------------------

/**
 * Estado estendido da conversa, reconstruído do que está guardado.
 * Fichas antigas (sem a camada viva) ganham tudo de forma suave.
 */
export function estadoEstendidoDe(state: ChatState, persona: Persona): EstadoEstendido {
  const base = personalidadeDe(persona).iniciativa;
  const objetivo = (state.objetivo as ObjetivoId) || 'conhecer';
  return {
    humor: state.humorEstado || humorInicial(state.afinidade),
    objetivo,
    topicoAtual: state.topicoAtual || null,
    profundidade: state.profundidade || 0,
    iniciativa: typeof state.iniciativa === 'number' ? state.iniciativa : base,
    ignora: state.ignora ?? 0,
    secas: state.secas ?? 0,
    ultimasSuas: state.ultimasSuas ?? [],
    memorias: state.memorias ?? [],
    ultimoPuxada: state.ultimoPuxada ?? null,
  };
}

/** Contexto comum a toda rodada: quem ela é, como está, o que lembra. */
export function prepararConversa(e: EntradaBase): ContextoConversa {
  const agora = e.agora || new Date();
  const persona = e.persona || buildPersona(e.person, { people: e.pessoas, settings: e.dono });
  const personalidade = personalidadeDe(persona);
  const relacao = e.relacao || persona.relacao || analisarRelacao(e.person, e.pessoas?.length ? e.pessoas : [e.person], e.dono);
  const estado = estadoEstendidoDe(e.state, persona);
  // Enquanto você não fala, o humor descansa e as memórias decaem.
  const referencia = Date.parse(e.state.ultimaMensagem || agora.toISOString());
  const horas = Number.isFinite(referencia) ? (agora.getTime() - referencia) / 3600000 : 0;
  const humor = horas > 1 ? decairHumor(estado.humor, horas, personalidade) : estado.humor;
  const memorias = decairMemorias(estado.memorias, agora);
  return { persona, personalidade, relacao, estado: { ...estado, humor, memorias }, rand: e.rand || Math.random, agora };
}

const ctxEstiloDe = (
  persona: Persona,
  e: EntradaBase,
  tom: ChatPlan['tom'],
  humor: Mood,
  rand: () => number,
  sentimento: 'positivo' | 'negativo' | 'neutro',
): EstiloContexto => ({
  persona,
  tom,
  humor,
  rand,
  nomeUsuario: e.nomeUsuario || 'você',
  musica: e.person.musicaFavorita,
  abreviar: e.abreviar,
  emojis: e.emojis,
  sentimento,
});

// ---------------------------------------------------------------------------
// Consequências: conversas que podem dar errado
// ---------------------------------------------------------------------------

export interface Consequencia { tipo: 'seca' | 'repeticao' }

/**
 * Ela percebe quando a conversa está dando errado:
 *  - a mesma resposta repetida (repeteco);
 *  - três respostas curtas/secas seguidas.
 */
/** "Boa." e "boa" são a mesma resposta: compara sem pontuação final. */
const chaveDaResposta = (texto: string) => normalizeText(texto).replace(/[.,!?\s]+$/, '');

export function detectarConsequencia(estado: EstadoEstendido, mensagem: string): Consequencia | null {
  const normalizada = chaveDaResposta(mensagem);
  if (!normalizada) return null;
  if (estado.ultimasSuas.slice(-2).some(t => t === normalizada)) return { tipo: 'repeticao' };
  const curtaSeca = normalizada.split(' ').length <= 4;
  if (curtaSeca && estado.secas >= 2) return { tipo: 'seca' };
  return null;
}

// ---------------------------------------------------------------------------
// Plano manual: texto próprio da camada viva (puxada de memória,
// transição de tópico) montado com a mesma cara do motor.
// ---------------------------------------------------------------------------

function planoManual(
  persona: Persona,
  state: ChatState,
  texto: string,
  eventos: string[],
  agora: Date,
  e: { rand?: () => number; rapido?: boolean; pausado?: boolean; emojis?: boolean; abreviar?: boolean; nomeUsuario?: string },
): ChatPlan {
  const rand = e.rand || Math.random;
  const bolhas = [texto];
  const atrasos = montarAtrasos(bolhas, persona, rand, e.rapido, state.humor, e.pausado, 5200);
  const humor: Mood = state.humor === 'fechada' ? 'happy' : state.humor;
  const paciencia = pacienciaDe(state);
  const estagio = estagioAtual(state);
  const estado: EstadoEmocional = {
    humor, paciencia, afinidade: state.afinidade, estagio, gatilhos: [],
    leitura: descreverEstado({ humor, paciencia, afinidade: state.afinidade }),
  };
  const proximo: ChatState = {
    ...state,
    humor,
    recentes: [...state.recentes, texto].slice(-14),
    usados: [...state.usados, texto].slice(-60),
    ultimaMensagem: agora.toISOString(),
  };
  return {
    bolhas: bolhas.map((t, i) => ({ texto: t, atraso: atrasos[i] })),
    state: proximo,
    humor,
    tom: 'amizade',
    tomPedido: 'amizade',
    intencao: 'saudacao',
    sentimento: 'positivo',
    afinidade: state.afinidade,
    estagio,
    eventos,
    estado,
    estruturado: montarEstadoEstruturado({ estado, bolhas }),
    desviado: false,
  };
}

// ---------------------------------------------------------------------------
// Resposta a mensagem sua
// ---------------------------------------------------------------------------

export function processarResposta(e: EntradaResposta): PlanoEstendido {
  const c = prepararConversa(e);
  const { persona, personalidade, relacao, estado, rand, agora } = c;
  const avisos: string[] = [];

  // ——— entendimento: o cérebro lê a mensagem ANTES de responder ———
  const mensagem = (e.message || '').trim();
  const nivelRelacao = relacaoDaConversa(e.state).nivel;
  const interpretacao = interpretarMensagem(mensagem, {
    ultimasSuas: estado.ultimasSuas,
    ultimasEla: (e.state.recentes || []).slice(-4),
    topicoAtual: estado.topicoAtual,
    perguntaAberta: e.state.perguntaAberta || null,
    pessoas: e.state.pessoas || [],
    nivelRelacao,
  });
  // O que o motor efetivamente lê (abreviações abertas, erros entendidos).
  // O que aparece na tela continua sendo o que a pessoa digitou.
  const lida = interpretacao.normalized || mensagem;
  detectarIntencao(lida); // leitura legada (o motor relê, fica o custo mínimo)

  // 1. O que pode dar errado: repeteco ou secura.
  const consequencia = detectarConsequencia(estado, lida);

  // 2. O motor de texto: química, humor, limites, pergunta aberta.
  const plano = planReply({
    person: e.person,
    persona,
    state: e.state,
    message: lida,
    citacao: e.citacao,
    historico: e.historico,
    nomeUsuario: e.nomeUsuario,
    adulto: e.adulto,
    rand,
    rapido: e.rapido,
    agora,
    fotoEnviada: e.fotoEnviada,
    pessoas: e.pessoas,
    dono: e.dono,
    relacao,
    abreviar: e.abreviar,
    emojis: e.emojis,
    pausado: e.pausado,
  });

  // 3. O humor contínuo reage — ao sentimento que o ENTENDIMENTO viu.
  const sentimentoLido: 'positivo' | 'negativo' | 'neutro' =
    interpretacao.sarcasmo ? (nivelRelacao >= 1 ? 'positivo' : 'neutro')
    : interpretacao.desambiguacao ? interpretacao.desambiguacao.sentimento
    : interpretacao.intent === 'desabafar' ? 'negativo'
    : interpretacao.emojiTone === 'negativo' ? 'negativo'
    : plano.sentimento;
  const humor = evoluirHumor(estado.humor, {
    sentimento: sentimentoLido,
    pesado: plano.intencao === 'apoio' || plano.intencao === 'reclamacao_sem_dormir',
    persona: personalidade,
  });

  // 4. O grafo de tópicos: onde estamos agora? (reação e desculpa não mudam o assunto)
  const reacaoNaoMudaTopico = interpretacao.intent.startsWith('reacao_') || interpretacao.intent === 'resposta_curta' || interpretacao.intent === 'desculpa';
  const topico = ['saudacao', 'despedida', 'confusao'].includes(plano.intencao) || reacaoNaoMudaTopico
    ? estado.topicoAtual
    : interpretacao.topic || estado.topicoAtual;
  const profundidade = topico && topico === estado.topicoAtual ? estado.profundidade + 1 : topico ? 1 : estado.profundidade;

  // 5. O objetivo da conversa.
  const objetivo = objetivoDaConversa({
    intencao: plano.intencao,
    profundidade,
    afinidade: plano.afinidade,
    mensagens: e.state.mensagens,
  });

  // 6. A memória rica: o que ela vai guardar daqui em diante.
  const novas = extrairMemoriasRicas(lida);
  let memorias = adicionarMemorias(estado.memorias, novas, e.person.id, agora);
  // Se o motor já puxou uma memória nesta rodada, ela conta como uso.
  const relacionadas = retrieveRelevantMemories(lida, memorias, 3, agora);
  if (plano.eventos.some(ev => ev.startsWith('memoria:')) && relacionadas[0]) {
    const usada = relacionadas[0];
    memorias = memorias.map(m => (m.id === usada.id ? { ...m, usos: m.usos + 1, lastUsedAt: agora.toISOString() } : m));
  }

  // 7. A resposta, temperada pela camada viva.
  const estilo = estiloDeReacao(personalidade, humor, rand);
  const estiloCtx = () => ctxEstiloDe(persona, e, plano.tom, plano.humor, rand, sentimentoLido);

  // 7a. O entendimento toma a direção quando o "responder de memória"
  //     não serve: fio no ar (pede para continuar), certeza baixa
  //     (esclarece de um jeito humano), contexto que explicou tudo
  //     (segue o fio) ou reação pura (espelha o tom).
  type Desvio = 'continuacao' | 'contexto' | 'esclarecimento' | 'reacao';
  let desvio: Desvio | null = null;
  let desvioLinha: string | null = null;
  if (!plano.desviado && plano.intencao !== 'grosseria' && !e.fotoEnviada && mensagem) {
    const reacaoTipo: 'risada' | 'surpresa' | 'concordancia' | 'incerteza' =
      interpretacao.intent === 'reacao_risada' ? 'risada'
      : interpretacao.intent === 'reacao_surpresa' ? 'surpresa'
      : interpretacao.intent === 'reacao_incerteza' ? 'incerteza'
      : 'concordancia';
    // Mensagem curta + o contexto explicou = ela segue o fio sem perguntar
    // "o que essa palavra significa?".
    const contextoExplica = !!interpretacao.desambiguacao
      && (interpretacao.normalized.split(/\s+/).length <= 6)
      && (plano.intencao === 'confusao'
        || plano.intencao === 'desconhecido'
        || interpretacao.intent === 'resposta_curta'
        || interpretacao.intent === 'expressar_emocao'
        || interpretacao.intent === 'continuar');
    // O contexto explica ANTES de admitir dúvida: se o assunto em curso dá
    // sentido à mensagem, ela segue o fio — nunca "o quê foi que você disse?".
    if (interpretacao.needsContinuation) desvio = 'continuacao';
    else if (contextoExplica) desvio = 'contexto';
    else if (interpretacao.certainty < 0.45) desvio = 'esclarecimento';
    else if (interpretacao.reacaoPura) desvio = 'reacao';

    if (desvio) {
      // Seguindo o fio com assunto ativo: puxa um gancho concreto do tópico.
      desvioLinha = desvio === 'contexto' && estado.topicoAtual && rand() < 0.75
        ? linhaSeguindoFio(estado.topicoAtual, rand)
        : escolherDesvio(desvio, { estilo, sentimento: sentimentoLido, reacao: reacaoTipo }, rand);
      const segue = desvio === 'reacao' ? segueAposReacao(rand, personalidade.curiosidade > 0.55) : null;
      const linhas = segue ? [desvioLinha, segue] : [desvioLinha];
      const atrasos = montarAtrasos(linhas, persona, rand, e.rapido, plano.humor, e.pausado, 4200);
      plano.bolhas = linhas.map((t, i) => ({ texto: estilizarLinha(t, estiloCtx()), atraso: atrasos[i] }));
      plano.eventos.push(`entendimento:${desvio}`);
      avisos.push(
        desvio === 'continuacao' ? 'O fio ficou no ar: ela pediu para você continuar a história.'
        : desvio === 'contexto' ? 'O contexto explicou a mensagem: ela seguiu o fio sem perguntar o que era.'
        : desvio === 'esclarecimento' ? 'Ela não pegou a parte — e perguntou de um jeito humano, de robô nada.'
        : 'Ela reagiu no mesmo tom da sua reação.',
      );
    }
  }

  const bolhas = [...plano.bolhas];

  // 7b. Consequência: ela reage antes de responder (limite de relação
  //     e grosseria têm resposta própria — consequência não compete,
  //     e também não compete com o desvio de entendimento).
  if (consequencia && !plano.desviado && plano.intencao !== 'grosseria' && !desvio && rand() < 0.8) {
    const banco = CONSEQUENCIAS[consequencia.tipo];
    const linha = banco[Math.floor(rand() * banco.length)];
    bolhas.unshift({ texto: estilizarLinha(linha, estiloCtx()), atraso: 1400 + Math.floor(rand() * 900) });
    plano.eventos.push(`consequencia:${consequencia.tipo}`);
    avisos.push(consequencia.tipo === 'seca'
      ? 'Ela notou a secura: o papo esfria um pouco até você se esforçar mais.'
      : 'Ela percebeu o repeteco: a resposta ficou mais atenta.');
  }

  // 7b. Reação do jeito dela: às vezes a primeira bolha é o "estilo"
  //     da personalidade (curiosa, brincalhona, empática, seca...).
  if (!consequencia && !desvio && bolhas.length >= 2 && !plano.desviado && plano.intencao !== 'grosseria') {
    const primeira = bolhas[0];
    const pareceReacao = primeira.texto.length < 48 && !/\?/.test(primeira.texto);
    if (pareceReacao && rand() < 0.18 + personalidade.humor * 0.2) {
      const banco = REACOES_POR_ESTILO[estilo][sentimentoLido];
      bolhas[0] = { ...bolhas[0], texto: estilizarLinha(banco[Math.floor(rand() * banco.length)], estiloCtx()) };
    }
  }

  // 7c. Piada interna: o que já veio duas vezes pode virar a piada de vocês.
  if (!desvio && !plano.desviado && sentimentoLido !== 'negativo' && rand() < 0.3) {
    const piada = piadasInternas(memorias, persona, rand);
    if (piada) {
      bolhas.push({ texto: estilizarLinha(piada, estiloCtx()), atraso: 1600 + Math.floor(rand() * 1200) });
      plano.eventos.push('piada-interna');
      avisos.push('Vocês estão criando uma piada interna — ela lembrou de algo que já tinha comentado.');
    }
  }

  // 7d. Deboche de volta: o sarcasmo dela é brincadeira — ela devolve no tom.
  if (!desvio && interpretacao.sarcasmo && nivelRelacao >= 1 && rand() < 0.55) {
    const linha = escolherDesvio('brincadeira', { estilo, sentimento: sentimentoLido, reacao: 'concordancia' }, rand);
    bolhas.unshift({ texto: estilizarLinha(linha, estiloCtx()), atraso: 900 + Math.floor(rand() * 800) });
    plano.eventos.push('entendimento:sarcasmo');
    avisos.push('Ela leu o sarcasmo — e devolveu a zoação no mesmo tom.');
  }

  // 8. Ignorar tem consequência: a iniciativa dela cai.
  let ignora = estado.ignora;
  if (estado.ultimoPuxada) {
    const esperaMinutos = (agora.getTime() - Date.parse(estado.ultimoPuxada)) / 60000;
    ignora = esperaMinutos > 10 ? estado.ignora + 1 : 0;
  }
  const iniciativa = iniciativaEfetiva(personalidade.iniciativa, plano.afinidade, ignora);

  // 9. Suas últimas respostas (para o repeteco de amanhã) e a contagem de secas.
  const normalizada = normalizeText(lida);
  const secas = normalizada.split(' ').filter(Boolean).length <= 4 ? estado.secas + 1 : 0;
  const ultimasSuas = [...estado.ultimasSuas, normalizada].filter(Boolean).slice(-4);

  // 10. Estado final: o que o motor calculou + a camada viva.
  const stateFinal: ChatState = {
    ...plano.state,
    humorEstado: humor,
    objetivo,
    topicoAtual: topico || undefined,
    profundidade,
    iniciativa,
    ignora,
    secas,
    ultimasSuas,
    memorias,
    ultimoPuxada: undefined, // você respondeu: o relógio de ausência parou
  };
  const ritmo = ritmoDePlano(bolhas, persona, humor, rand);
  return {
    plano: {
      ...plano,
      bolhas,
      state: stateFinal,
      estagio: estagioAtual(stateFinal),
      eventos: [...new Set(plano.eventos)],
      estruturado: montarEstadoEstruturado({ estado: plano.estado, bolhas: bolhas.map(b => b.texto) }),
    },
    humor,
    humorLeitura: leituraHumor(humor),
    objetivo: OBJETIVOS[objetivo] || OBJETIVOS.manter,
    topico,
    profundidade,
    iniciativa,
    ritmo,
    avisos,
    interpretacao,
  };
}

// ---------------------------------------------------------------------------
// Abertura de conversa
// ---------------------------------------------------------------------------

export function processarAbertura(e: EntradaBase): PlanoEstendido {
  const c = prepararConversa(e);
  const { persona, personalidade, relacao, estado, rand, agora } = c;
  const plano = planOpening({
    person: e.person, persona, state: e.state, nomeUsuario: e.nomeUsuario, adulto: e.adulto,
    rand, rapido: e.rapido, agora, pessoas: e.pessoas, dono: e.dono, relacao,
    abreviar: e.abreviar, emojis: e.emojis, pausado: e.pausado, primeiraVez: true,
  });
  const humor = estado.humor;
  const iniciativa = iniciativaEfetiva(personalidade.iniciativa, plano.afinidade, estado.ignora);
  const stateFinal: ChatState = {
    ...plano.state,
    humorEstado: humor,
    objetivo: 'conhecer',
    profundidade: 0,
    iniciativa,
  };
  return {
    plano: { ...plano, state: stateFinal, estagio: estagioAtual(stateFinal) },
    humor,
    humorLeitura: leituraHumor(humor),
    objetivo: OBJETIVOS.conhecer,
    topico: null,
    profundidade: 0,
    iniciativa,
    ritmo: ritmoDePlano(plano.bolhas, persona, humor, rand),
    avisos: [],
    interpretacao: interpretacaoVazia(),
  };
}

// ---------------------------------------------------------------------------
// Mensagem espontânea (ela puxa assunto sozinha)
// ---------------------------------------------------------------------------

function melhorMemoriaParaPuxada(mems: MemoriaConversa[], agora: Date): MemoriaConversa | null {
  const ativas = mems.filter(m => m.importance !== 'temporaria' && forcaDa(m, agora) > 0.3);
  return ativas.length ? ativas[ativas.length - 1] : null;
}

/**
 * Ela decide se puxa assunto agora. Sem `forcado`, a iniciativa
 * manda: iniciativa baixa e ela simplesmente não fala (null).
 */
export function processarPuxada(e: EntradaPuxada): PlanoEstendido | null {
  const c = prepararConversa(e);
  const { persona, personalidade, relacao, estado, rand, agora } = c;
  const avisos: string[] = [];

  const iniciativa = iniciativaEfetiva(personalidade.iniciativa, e.state.afinidade, estado.ignora);
  if (!e.forcado && rand() > 0.25 + iniciativa * 0.75) return null;

  let motivo = e.motivo;
  if (!motivo) {
    const dias = (agora.getTime() - Date.parse(e.state.ultimaMensagem || agora.toISOString())) / 86400000;
    const temMemoriaBoa = estado.memorias.some(m => m.importance !== 'temporaria' && m.forca > 0.3);
    motivo = dias >= 3 ? 'saudade'
      : temMemoriaBoa && rand() < 0.45 ? 'lembranca'
        : rand() < 0.3 ? 'do_nada'
          : 'assunto';
  }

  let plano: ChatPlan;
  let topico: string | null = estado.topicoAtual;
  let memorias = estado.memorias;

  if (motivo === 'do_nada') {
    plano = planDoNada({
      person: e.person, persona, state: e.state, nomeUsuario: e.nomeUsuario, adulto: e.adulto,
      rand, rapido: e.rapido, agora, pessoas: e.pessoas, dono: e.dono, relacao,
      abreviar: e.abreviar, emojis: e.emojis, pausado: e.pausado,
    });
  } else if (motivo === 'lembranca') {
    const mem = melhorMemoriaParaPuxada(memorias, agora);
    if (mem) {
      const texto = estilizarLinha(puxadaPorMemoria(mem, persona, rand),
        ctxEstiloDe(persona, e, 'amizade', e.state.humor, rand, 'positivo'));
      plano = planoManual(persona, e.state, texto, ['espontanea', 'memoria-puxada'], agora, e);
      // Ela puxou a memória: conta como uso (e pode virar piada interna).
      memorias = memorias.map(m => (m.id === mem.id ? { ...m, usos: m.usos + 1, lastUsedAt: agora.toISOString() } : m));
    } else {
      plano = planSpontaneous({
        person: e.person, persona, state: e.state, nomeUsuario: e.nomeUsuario, adulto: e.adulto,
        rand, rapido: e.rapido, agora, pessoas: e.pessoas, dono: e.dono, relacao,
        abreviar: e.abreviar, emojis: e.emojis, pausado: e.pausado, motivo: 'assunto',
      });
    }
  } else if (motivo === 'assunto' && estado.topicoAtual) {
    const transicao = transicaoDeTopico(estado.topicoAtual, persona, personalidade, rand, []);
    if (rand() < 0.6) {
      const texto = estilizarLinha(transicao.frase,
        ctxEstiloDe(persona, e, 'amizade', e.state.humor, rand, 'positivo'));
      plano = planoManual(persona, e.state, texto, ['espontanea', `topico:${transicao.topico}`], agora, e);
      topico = transicao.topico;
    } else {
      plano = planSpontaneous({
        person: e.person, persona, state: e.state, nomeUsuario: e.nomeUsuario, adulto: e.adulto,
        rand, rapido: e.rapido, agora, pessoas: e.pessoas, dono: e.dono, relacao,
        abreviar: e.abreviar, emojis: e.emojis, pausado: e.pausado, motivo: 'assunto',
      });
    }
  } else {
    plano = planSpontaneous({
      person: e.person, persona, state: e.state, nomeUsuario: e.nomeUsuario, adulto: e.adulto,
      rand, rapido: e.rapido, agora, pessoas: e.pessoas, dono: e.dono, relacao,
      abreviar: e.abreviar, emojis: e.emojis, pausado: e.pausado, motivo,
    });
  }

  const humor = evoluirHumor(estado.humor, { sentimento: 'positivo', pesado: false, persona: personalidade });
  const profundidade = topico && topico === estado.topicoAtual ? estado.profundidade + 1 : topico ? 1 : estado.profundidade;
  const stateFinal: ChatState = {
    ...plano.state,
    humorEstado: humor,
    objetivo: 'manter',
    topicoAtual: topico || undefined,
    profundidade,
    iniciativa,
    ignora: estado.ignora,
    secas: 0, // ela falou: a contagem de secura recomeça
    ultimasSuas: estado.ultimasSuas,
    memorias,
    ultimoPuxada: agora.toISOString(),
  };
  if (motivo === 'lembranca' && estado.memorias.length) {
    avisos.push('Ela puxou algo que você contou: a memória dela está trabalhando.');
  }
  return {
    plano: { ...plano, state: stateFinal, estagio: estagioAtual(stateFinal) },
    humor,
    humorLeitura: leituraHumor(humor),
    objetivo: OBJETIVOS.manter,
    topico,
    profundidade,
    iniciativa,
    ritmo: ritmoDePlano(plano.bolhas, persona, humor, rand),
    avisos,
    interpretacao: interpretacaoVazia(),
  };
}

// Re-exports práticos para a tela (a UI importa um único módulo).
export { ritmoDePlano } from './timing';
export { rotuloDoTopico } from './topics';
export { memoriasVisiveis } from './memory';
export { intervaloDeIniciativa } from './initiative';
