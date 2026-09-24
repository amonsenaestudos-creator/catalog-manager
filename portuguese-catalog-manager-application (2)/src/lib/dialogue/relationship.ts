/**
 * Relacionamento afetando a conversa.
 *
 * A relação não é só "liberar respostas novas": ela decide o
 * estilo inteiro. Seis mostradores — familiaridade, confiança,
 * interesse, proximidade, tensão, reciprocidade — definem o nível
 * do papo:
 *
 *   Relação baixa:  "Você gosta de música?"
 *   Relação média:  "Você ainda tá ouvindo aquela música que comentou?"
 *   Relação alta:   "Você sumiu hoje kkkk, aconteceu alguma coisa?"
 */
import type { ChatState } from '../../types';
import type { RelacaoConversa } from './types';
import { pacienciaDe } from '../estado';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function relacaoDaConversa(state: ChatState): RelacaoConversa {
  const paciencia = pacienciaDe(state);
  const familiaridade = clamp01(state.mensagens / 80 + state.afinidade / 250);
  const confianca = clamp01(state.afinidade / 130 + (paciencia / 10) * 0.4);
  const proximidade = clamp01(state.afinidade / 100);
  const interesse = clamp01(0.1 + state.afinidade / 120);
  const tensao = clamp01(Math.min(1, state.ofensas / 5) + (10 - paciencia) / 20 + (state.ignora ?? 0) / 12);
  const reciprocidade = clamp01(0.45 + state.afinidade / 160);
  const nivel: 0 | 1 | 2 = tensao > 0.55 || state.afinidade < 35 ? 0 : state.afinidade < 64 ? 1 : 2;
  return { familiaridade, confianca, interesse, proximidade, tensao, reciprocidade, nivel };
}

/** Leitura curta da relação para a tela. */
export function leituraRelacao(r: RelacaoConversa): string {
  const partes: string[] = [];
  partes.push(r.proximidade > 0.64 ? 'relação próxima' : r.proximidade > 0.35 ? 'relação em construção' : 'ainda se conhecendo');
  if (r.tensao > 0.4) partes.push('com tensão');
  if (r.reciprocidade > 0.7) partes.push('de mão dupla');
  else if (r.reciprocidade < 0.5) partes.push('carente de retorno');
  return partes.join(' · ');
}
