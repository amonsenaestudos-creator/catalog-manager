/**
 * Camada viva da conversa — API pública.
 *
 * O motor de texto continua em src/lib/dialogue.ts e as falas em
 * src/lib/dialogue/bancos.ts (último estágio: só material, nenhuma regra);
 * este pacote (src/lib/dialogue/) decide quem a pessoa é (personalidade), o que
 * ela lembra (memória com importância e decaimento), como está
 * (humor contínuo), aonde a conversa vai (tópicos e objetivos),
 * quanto ela inicia (iniciativa) e o que acontece quando ninguém
 * está olhando (mundo vivo).
 */
export type {
  EstadoEstendido, EventoMundo, ObjetivoId, ObjetivoInfo, Personalidade,
  RelacaoConversa, RitmoBolha,
} from './types';
export type { EntradaBase, EntradaPuxada, EntradaResposta, PlanoEstendido, ContextoConversa, Consequencia } from './engine';
export {
  detectarConsequencia, estadoEstendidoDe, prepararConversa,
  processarAbertura, processarPuxada, processarResposta,
} from './engine';
export { personalidadeDe, barrasDe } from './personality';
export { decairHumor, evoluirHumor, humorInicial, leituraHumor } from './mood';
export {
  FORCA_MINIMA, MEIA_VIDA, adicionarMemorias, decairMemorias, extrairMemoriasRicas,
  forcaDa, importanciaDe, memoriasVisiveis, retrieveRelevantMemories,
} from './memory';
export { GRAFO, TOPICO_PADRAO, ganchosDoTopico, rotuloDoTopico, topicoDaMensagem, transicaoDeTopico } from './topics';
export { OBJETIVOS, objetivoDaConversa } from './goals';
export { leituraRelacao, relacaoDaConversa } from './relationship';
export { CONSEQUENCIAS, PERGUNTAS_POR_NIVEL, REACOES_POR_ESTILO, estiloDeReacao, piadasInternas, perguntaPorNivel, puxadaPorMemoria } from './response';
export { atrasoDeLeitura, ritmoDePlano } from './timing';
export { iniciativaEfetiva, intervaloDeIniciativa } from './initiative';
export { gerarEventoMundo, missoesDoDia, resumoDoDia, tickDoMundo } from './events';
export { corrigirPossivelErro, normalizarMensagem } from './normalization';
export type { Correcao, Normalizacao } from './normalization';
export { principalIntencao } from './intents';
export type { IntencaoMensagem, LeituraIntencao } from './intents';
export { desambiguarContexto, extrairEntidades, resolverPronomes } from './context';
export type { ContextoParaEntender, Desambiguacao, Entidade, LeituraPronome } from './context';
export {
  detectarFimAbrupto, detectarSarcasmo, interpretacaoVazia, interpretarMensagem, juntarBolhas, tomDosEmojis,
} from './understanding';
export type { ContextoEntendimento, EmocaoLida, InterpretacaoMensagem, TomEmoji } from './understanding';
