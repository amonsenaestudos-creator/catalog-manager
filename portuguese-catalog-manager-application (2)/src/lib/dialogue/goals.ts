/**
 * Conversa com objetivo.
 *
 * Uma conversa real está tentando chegar a algum lugar. O objetivo
 * atual decide o próximo movimento: CONHECER gera perguntas,
 * APROFUNDAR segue o fio, DESABAFAR acolhe, COMBINAR fecha o
 * combinado, ENCERRAR dá o tchau com carinho.
 */
import type { ObjetivoId, ObjetivoInfo } from './types';

export const OBJETIVOS: Record<ObjetivoId, ObjetivoInfo> = {
  conhecer: { id: 'conhecer', rotulo: 'conhecer', descricao: 'Ela está tentando te conhecer: pergunta, observa, devagar.' },
  aprofundar: { id: 'aprofundar', rotulo: 'aprofundar', descricao: 'O papo está render: ela aprofunda o assunto em vez de pular.' },
  brincar: { id: 'brincar', rotulo: 'brincar', descricao: 'A conversa está no clima de rir e provocar.' },
  desabafar: { id: 'desabafar', rotulo: 'desabafar', descricao: 'Você desabafou: agora o papo é acolher, não perguntar da rotina.' },
  pedir_ajuda: { id: 'pedir_ajuda', rotulo: 'pedir ajuda', descricao: 'Você pediu uma opinião: ela pensa antes de responder.' },
  combinar: { id: 'combinar', rotulo: 'combinar algo', descricao: 'Existe algo sendo combinado entre vocês — ela cobra o desfecho.' },
  encerrar: { id: 'encerrar', rotulo: 'encerrar', descricao: 'A conversa está indo para o fim, com carinho.' },
  manter: { id: 'manter', rotulo: 'manter o papo', descricao: 'Conversa andando, sem rumo definido.' },
};

/**
 * O objetivo desta conversa agora. Sai da intenção da última
 * mensagem, da profundidade do assunto e da química acumulada.
 */
export function objetivoDaConversa(entrada: {
  intencao: string;
  profundidade: number;
  afinidade: number;
  mensagens: number;
}): ObjetivoId {
  const { intencao, profundidade, afinidade, mensagens } = entrada;
  if (intencao === 'apoio' || intencao === 'reclamacao_sem_dormir') return 'desabafar';
  if (intencao === 'conselho') return 'pedir_ajuda';
  if (intencao === 'piada' || intencao === 'alegria') return 'brincar';
  if (intencao === 'plano' || intencao === 'convite') return 'combinar';
  if (intencao === 'despedida') return 'encerrar';
  if (profundidade >= 5 || afinidade >= 64) return 'aprofundar';
  if (mensagens <= 4) return 'conhecer';
  return 'manter';
}
