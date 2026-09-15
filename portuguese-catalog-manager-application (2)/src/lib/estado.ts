/**
 * Estado emocional da conversa.
 *
 * O motor guarda, por ficha, um retrato do momento: humor, paciência (0 a 10),
 * química acumulada e o estágio da relação. Cada mensagem sua mexe nesses
 * números, e o retrato resultante volta a influenciar a resposta seguinte —
 * quem foi indelicado encontra uma pessoa mais fria, quem conversa bem encontra
 * alguém mais aberta.
 *
 * A memória também vive aqui: em vez de um banco vetorial externo, a lembrança
 * mais parecida com o que você acabou de dizer é escolhida por sobreposição de
 * palavras e por quão recente ela é. É o mesmo trabalho, feito dentro do
 * aplicativo e sem mandar nada para fora.
 */
import type { ChatMood, ChatState, Person } from '../types';
import { normalizeText } from '../store';
import type { Persona } from './persona';

export interface EstagioInfo { id: string; label: string; descricao: string; indice: number }

/** Retrato do momento, reconstruído a cada mensagem. */
export interface EstadoEmocional {
  humor: ChatMood;
  /** 0 a 10 — cai com grosseria e cobrança, volta com conversa boa. */
  paciencia: number;
  /** 0 a 100 — o quanto ela já se abriu com você. */
  afinidade: number;
  estagio: EstagioInfo;
  /** O que mudou nesta mensagem ("tom agressivo", "pedido de desculpa"...). */
  gatilhos: string[];
  /** Frase curta para mostrar na tela. */
  leitura: string;
}

/** Formato devolvido a cada mensagem: estado interno + resposta para o usuário. */
export interface EstadoEstruturado {
  estado_emocional: {
    humor_atual: string;
    nivel_paciencia: number;
    afinidade_com_usuario: number;
    estagio: string;
    gatilhos: string[];
  };
  resposta_para_usuario: string[];
}

export const PACIENCIA_MAXIMA = 10;
/** Onde a paciência começa numa conversa nova. */
export const PACIENCIA_INICIAL = 6.5;
/** Abaixo disso ela responde curto e não puxa assunto. */
export const PACIENCIA_BAIXA = 2.6;
/** Acima disso ela se abre: mais cuidado, mais pergunta, mais carinho. */
export const PACIENCIA_ALTA = 8;

export const ROTULO_HUMOR: Record<ChatMood, string> = {
  happy: 'alegre', flirty: 'chegando perto', shy: 'envergonhada', playful: 'brincalhona',
  curious: 'curiosa', neutral: 'tranquila', carinhosa: 'carinhosa', fechada: 'fechada',
};

export const EMOJI_HUMOR: Record<ChatMood, string> = {
  happy: '🙂', flirty: '😏', shy: '🥺', playful: '😜', curious: '🤔', neutral: '😐', carinhosa: '🥰', fechada: '😒',
};

export const ROTULO_PACIENCIA = (valor: number) => valor >= 7 ? 'alta' : valor >= 4 ? 'média' : 'baixa';

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** Lê a paciência guardada; fichas antigas ganham uma a partir do humor e da química. */
export function pacienciaDe(state: ChatState): number {
  if (typeof state.paciencia === 'number' && Number.isFinite(state.paciencia)) {
    return limitar(state.paciencia, 0, PACIENCIA_MAXIMA);
  }
  const base = PACIENCIA_INICIAL + (state.afinidade - 40) / 20 + (state.ofensas > 2 ? -1.5 : 0);
  return limitar(state.humor === 'fechada' ? base - 2 : base, 0, PACIENCIA_MAXIMA);
}

export interface EntradaDePaciencia {
  intencao: string;
  sentimento: string;
  /** Mensagem já sem abreviações. */
  texto: string;
  /** Mensagem curta (poucas palavras) costuma ser resposta seca. */
  curta: boolean;
}

/**
 * Quanto a mensagem mexe na paciência dela, e por quê. O motivo vira gatilho
 * visível na tela: o usuário vê a conversa reagindo ao que ele escreveu.
 */
export function ajusteDePaciencia(entrada: EntradaDePaciencia): { delta: number; motivos: string[] } {
  const { intencao, sentimento, curta } = entrada;
  const tabela: Record<string, [number, string]> = {
    grosseria: [-3.2, 'tom agressivo'],
    provocacao: [-1.3, 'cobrança'],
    ciumes: [-0.9, 'ciúmes'],
    pedido_foto: [-1.1, 'pedido fora de hora'],
    flerte_forte: [-0.6, 'ousadia fora de hora'],
    resposta_curta: [-0.4, 'resposta seca'],
    tedio: [-0.3, 'conversa morna'],
    desculpa: [1.4, 'pedido de desculpa'],
    agradecimento: [0.9, 'gratidão'],
    gratidao_recebida: [0.9, 'gratidão'],
    elogio: [0.7, 'elogio sincero'],
    elogio_corpo: [0.5, 'elogio sincero'],
    saudade: [0.7, 'saudade'],
    apoio: [0.5, 'desabafo'],
    alegria: [0.4, 'notícia boa'],
    piada: [0.4, 'brincadeira'],
    cotidiano: [0.3, 'conversa do dia a dia'],
    cotidiano_trabalho: [0.3, 'conversa do dia a dia'],
    cotidiano_estudo: [0.3, 'conversa do dia a dia'],
    cotidiano_comida: [0.3, 'conversa do dia a dia'],
    pergunta_pessoal: [0.3, 'interesse real'],
    pergunta_rotina: [0.3, 'interesse real'],
    pergunta_fato: [0.3, 'interesse real'],
    pergunta_familiar: [0.4, 'interesse pela família'],
    pergunta_sobre_mim: [0.4, 'interesse nela'],
    pergunta_historia: [0.4, 'pedido de história'],
    pedido_historia: [0.4, 'pedido de história'],
    convite: [0.5, 'convite'],
    desconhecido: [0, 'assunto que ela não entendeu'],
  };
  const linha = tabela[intencao];
  const motivos: string[] = [];
  let delta = linha ? linha[0] : 0.2;
  if (linha && linha[1]) motivos.push(linha[1]);
  // Mensagem curta e seca em assunto que ela não entendeu cansa: vira interrogação.
  if (intencao === 'desconhecido' && curta) { delta -= 0.5; motivos.push('resposta sem contexto'); }
  if (sentimento === 'negativo' && intencao !== 'apoio' && intencao !== 'desculpa' && delta < 0) delta -= 0.2;
  return { delta: Number(delta.toFixed(2)), motivos };
}

/** O humor que a paciência impõe — quem está sem paciência não fica brincando. */
export function humorPorPaciencia(paciencia: number, humorAtual: ChatMood, persona: Persona): ChatMood {
  if (paciencia <= PACIENCIA_BAIXA) return 'fechada';
  if (paciencia <= PACIENCIA_BAIXA + 1.2 && (humorAtual === 'happy' || humorAtual === 'playful' || humorAtual === 'flirty')) return 'neutral';
  if (paciencia >= PACIENCIA_ALTA && humorAtual === 'neutral' && (persona.traits.romantica > 0.5 || persona.traits.calor > 0.62)) return 'carinhosa';
  return humorAtual;
}

export function descreverEstado(estado: Pick<EstadoEmocional, 'humor' | 'paciencia' | 'afinidade'>): string {
  return `${ROTULO_HUMOR[estado.humor]} · paciência ${ROTULO_PACIENCIA(estado.paciencia)} (${Math.round(estado.paciencia)}/${PACIENCIA_MAXIMA}) · química ${Math.round(estado.afinidade)}%`;
}

export function montarEstadoEstruturado(entrada: { estado: EstadoEmocional; bolhas: string[] }): EstadoEstruturado {
  const { estado, bolhas } = entrada;
  return {
    estado_emocional: {
      humor_atual: ROTULO_HUMOR[estado.humor],
      nivel_paciencia: Number(estado.paciencia.toFixed(1)),
      afinidade_com_usuario: Math.round(estado.afinidade),
      estagio: estado.estagio.label,
      gatilhos: estado.gatilhos,
    },
    resposta_para_usuario: bolhas,
  };
}

/**
 * O prompt de sistema que descreve a ficha para quem for gerar a conversa.
 * Serve para conferir, na tela, como a persona está montada nesta rodada.
 */
export function promptDoSistema(entrada: { person: Person; persona: Persona; estado: EstadoEmocional }): string {
  const { person, persona, estado } = entrada;
  const idade = person.idade !== null ? `${person.idade} anos` : 'idade não informada';
  const maturidade = persona.fala.maturidade >= 0.72 ? 'alta (vocabulário adulto, sem gíria de moleque)'
    : persona.fala.maturidade >= 0.45 ? 'média (fala solta, mas sem exagero)'
      : 'baixa (fala de gente nova: gíria, risada escrita, reação impulsiva)';
  const proximidade = persona.relacao.descricao;
  return [
    `Você é ${person.nome}, ${idade}. ${persona.resumo}`,
    `Maturidade: ${maturidade}.`,
    `Proximidade: ${estado.estagio.label} — ${estado.estagio.descricao}. ${proximidade}`,
    `Estado emocional agora: humor ${ROTULO_HUMOR[estado.humor]}, paciência ${Math.round(estado.paciencia)}/10, química ${Math.round(estado.afinidade)}%.`,
    estado.gatilhos.length ? `O que mexeu com você nesta mensagem: ${estado.gatilhos.join(', ')}.` : 'Nada mudou de humor nesta mensagem.',
    estado.paciencia <= PACIENCIA_BAIXA
      ? 'Regras de agora: responda curto, sem carinho e sem puxar assunto novo. Você está sem paciência.'
      : 'Regras: uma pergunta por mensagem, sem repetir a mesma fala, assunto pesado pede acolhimento e não brincadeira.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Memória: curto e longo prazo, sem sair do aplicativo
// ---------------------------------------------------------------------------

export interface MemoriaItem { tipo: string; valor: string; peso?: number; quando?: string }

/** Guarda uma lembrança nova, dando mais peso a quem você falou por último. */
export function lembrar(state: ChatState, novas: { tipo: string; valor: string }[]): MemoriaItem[] {
  const antigas: MemoriaItem[] = (state.lembrancas || []).map((item, indice, lista) => ({
    tipo: item.tipo,
    valor: item.valor,
    peso: item.peso ?? 1 + (indice / Math.max(1, lista.length)) * 0.3,
    quando: item.quando,
  }));
  const total = antigas.length + novas.length;
  const juntas: MemoriaItem[] = [...antigas];
  novas.forEach((nova, indice) => {
    const repetida = antigas.some(item => normalizeText(item.valor) === normalizeText(nova.valor));
    if (repetida) return;
    juntas.push({ tipo: nova.tipo, valor: nova.valor, peso: 1.2, quando: new Date().toISOString(), ordem: total + indice } as MemoriaItem);
  });
  // Mais recentes carregam mais peso; o corte mantém as 12 últimas.
  return juntas.slice(-12).map(item => ({ tipo: item.tipo, valor: item.valor, peso: item.peso, quando: item.quando }));
}

/**
 * Busca por relevância: a lembrança que mais divide palavras com a mensagem
 * atual vem primeiro, e a recência desempata. É o "recuperar memórias" do
 * fluxo, feito localmente.
 */
export function recuperarMemorias(state: ChatState, texto: string, quantas = 3): MemoriaItem[] {
  const lembrancas: MemoriaItem[] = (state.lembrancas || []).map((item, indice, lista) => ({
    tipo: item.tipo,
    valor: item.valor,
    peso: item.peso ?? 1,
    quando: item.quando,
    // posição relativa: o fim da lista é o que ela ouviu por último
    ordem: indice / Math.max(1, lista.length),
  })) as MemoriaItem[];
  if (!lembrancas.length) return [];
  const palavras = normalizeText(texto).split(/\s+/).filter(palavra => palavra.length > 3);
  const pontuadas = lembrancas.map(item => {
    const alvo = normalizeText(`${item.valor} ${item.tipo}`);
    const comuns = palavras.filter(palavra => alvo.includes(palavra)).length;
    const ordem = (item as MemoriaItem & { ordem?: number }).ordem ?? 0;
    return { item, nota: comuns * 2 + (item.peso ?? 1) * 0.6 + ordem * 1.4 };
  });
  return pontuadas.sort((a, b) => b.nota - a.nota).slice(0, quantas).map(linha => linha.item);
}

/** Frases prontas para mostrar na tela o que ela guardou de você. */
export function resumirMemorias(state: ChatState): string[] {
  return (state.lembrancas || [])
    .slice(-6)
    .reverse()
    .map(item => `${item.tipo}: ${item.valor}`);
}
