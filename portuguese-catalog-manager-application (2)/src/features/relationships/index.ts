/** API pública de relações; textos e heurísticas continuam isolados do JSX. */
export { analisarRelacao, conexoesProximas, descreverVinculo, familiaresDe, redeFamiliar, seloDaRelacao, vinculosInvertidos } from '../../lib/relacao';
export type { Conexao, Relacao, Familiar } from '../../lib/relacao';
export { default as RelacoesDaFicha } from './components/RelacoesDaFicha';
