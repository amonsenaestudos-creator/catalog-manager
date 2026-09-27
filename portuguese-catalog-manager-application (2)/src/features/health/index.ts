/** API pública do domínio de saúde do catálogo. */
export { default as SaudeDoCatalogo } from './components/SaudeDoCatalogo';
export { analisarSaude, fichasDoAchado, repararCatalogo, resumoDoCatalogo } from './diagnostico';
export type { Achado, AchadoId, ContextoDeSaude, Gravidade, ResumoDoCatalogo, Saude } from './diagnostico';
