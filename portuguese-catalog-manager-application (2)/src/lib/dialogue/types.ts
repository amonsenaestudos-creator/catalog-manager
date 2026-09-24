/**
 * Tipos da camada viva da conversa.
 *
 * A conversa não é mais "mensagem → resposta aleatória". O fluxo é:
 *
 * mensagem → interpretação → estado da conversa → personalidade → memórias
 * → contexto recente → objetivo → resposta
 *
 * Esta camada (src/lib/dialogue/) vive em cima do motor de texto
 * (src/lib/dialogue.ts): o motor decide o que ela fala, e aqui decide
 * quem ela é, o que lembra, aonde a conversa quer chegar e o que
 * acontece enquanto ninguém está olhando.
 */
import type { HumorContínuo, ImportanciaMemoria, MemoriaConversa } from '../../types';

export type { HumorContínuo, ImportanciaMemoria, MemoriaConversa };

/** Para onde a conversa está tentando chegar agora. */
export type ObjetivoId =
  | 'conhecer'
  | 'aprofundar'
  | 'brincar'
  | 'desabafar'
  | 'pedir_ajuda'
  | 'combinar'
  | 'encerrar'
  | 'manter';

export interface ObjetivoInfo { id: ObjetivoId; rotulo: string; descricao: string }

/**
 * Personalidade de verdade: os eixos que decidem como ela reage. Vêm
 * todos da ficha (PersonaTraits), então a mesma pessoa tem sempre a
 * mesma personalidade — e nada disso precisa aparecer na tela.
 */
export interface Personalidade {
  /** Abertura, calor, vontade de ocupar a conversa. */
  extroversao: number;
  /** Humor, deboche leve, capacidade de rir da situação. */
  humor: number;
  /** Polidez e vocabulário: 0 = solta, 1 = formal. */
  formalidade: number;
  /** Quanto ela pergunta de volta e segue o fio do assunto. */
  curiosidade: number;
  /** Resistência a cobrança e resposta seca. */
  paciencia: number;
  /** Quanto ela inicia conversa sozinha. */
  iniciativa: number;
  /** Ironia e desconfiança: "sei... nada mesmo? 👀". */
  ironia: number;
  /** Quanto o humor dela sobe e desce com a conversa. */
  emotividade: number;
  /** Velocidade de digitação/resposta (mantida do traço da ficha). */
  agilidade: number;
}

/** O "jeito" da reação a uma mensagem — a personalidade decide. */
export type EstiloReacao = 'curiosa' | 'brincalhona' | 'empatica' | 'seca' | 'desconfiada' | 'ocupada';

/**
 * A relação como seis mostradores. Juntos, definem o nível do papo:
 * relação baixa = pergunta simples; relação alta = a cobrança carinhosa
 * de "você sumiu hoje kkkk". O estilo inteiro muda, não só as opções.
 */
export interface RelacaoConversa {
  /** 0 a 1: o quanto ela já conhece você. */
  familiaridade: number;
  /** 0 a 1: se ela confia no que você diz. */
  confianca: number;
  /** 0 a 1: interesse dela em você (química + recência). */
  interesse: number;
  /** 0 a 1: proximidade construída. */
  proximidade: number;
  /** 0 a 1: tensão acumulada (grosseria, cobrança, silêncio). */
  tensao: number;
  /** 0 a 1: se a conversa é de mão dupla. */
  reciprocidade: number;
  /** 0 = ainda se conhecendo, 1 = no meio, 2 = próxima. */
  nivel: 0 | 1 | 2;
}

/** Estado completo da conversa, reconstruído a cada rodada. */
export interface EstadoEstendido {
  humor: HumorContínuo;
  objetivo: ObjetivoId;
  topicoAtual: string | null;
  profundidade: number;
  iniciativa: number;
  ignora: number;
  secas: number;
  ultimasSuas: string[];
  memorias: MemoriaConversa[];
  ultimoPuxada: string | null;
}

/** Ritmo de digitação de uma bolha (janela total + pausa opcional). */
export interface RitmoBolha {
  /** Janela total até a bolha sair (ms) — espelha plan.bolhas.atraso. */
  atraso: number;
  /** Digitação que "para e volta": ponto da janela e duração (ms). */
  pausa?: { ponto: number; dur: number };
}

/** O que aconteceu no universo do app enquanto você não olhava. */
export interface EventoMundo {
  tipo: 'ocupada' | 'disponivel' | 'memoria' | 'retorno' | 'sugestao';
  titulo: string;
  corpo: string;
  /** Hora simulada em que o evento "acontece". */
  quando: string;
}
