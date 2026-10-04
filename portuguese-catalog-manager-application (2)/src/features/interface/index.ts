/** API pública do domínio de interface: densidade, revelação, foco e ações por contexto. */
export {
  DENSIDADES, DENSIDADE_PADRAO, CLASSES_DE_DENSIDADE, cartaoEmLinhaUnica,
  classeDaDensidade, informacaoDaDensidade, normalizarDensidade, proximaDensidade,
} from './densidade';
export type { Densidade, OpcaoDeDensidade } from './densidade';
export {
  LIMITE_DE_HISTORICO, LIMITE_DE_PREVIA, LIMITE_ESSENCIAL,
  contagemDaSecao, revelar, resumoDeContagens, rotuloDoResto,
} from './revelacao';
export type { Revelacao } from './revelacao';
export {
  CATEGORIAS_DA_FICHA, GRUPOS_DE_ACOES,
  acoesDaFicha, acoesDaTelaInicial, categoriaDaAba, organizarAcoes,
} from './acoes';
export type { AcaoDeContexto, CategoriaDaFicha, ContextoDaFicha, GrupoDeAcoes, GrupoMontado, PlanoDeAcoes } from './acoes';
export { CHAVE_DO_FOCO, CLASSE_DO_FOCO, aplicarModoFoco, lerModoFoco, rotuloDoFoco, useModoFoco } from './foco';
export { iconeDaAcao } from './icones';
export { BarraDeAcoes } from './components/BarraDeAcoes';
export { MenuMais } from './components/MenuMais';
export type { AcaoDeMenu, GrupoDeMenu } from './components/MenuMais';
export { Revelar } from './components/Revelar';
