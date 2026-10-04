/**
 * API pública do domínio de corpo: altura medida e figura 3D montada das
 * métricas. Nada aqui guarda dado — é leitura da ficha, sempre.
 *
 * A figura tem três peças: `metricas` lê a ficha e devolve medidas,
 * `malha` transforma as medidas em superfície 3D, e `pintura` desenha a
 * superfície em pixels — luz de estúdio, oclusão ambiente e sombra. Nenhuma
 * delas conhece React, e é por isso que o conferidor fora do navegador
 * desenha exatamente o que a tela desenha.
 */
export {
  ALTURA_MAXIMA, ALTURA_MINIMA, ALTURA_PADRAO, ESTIMATIVA_DO_ROTULO,
  diferencaDaMedia, faixaDaAltura, formatarAltura, lerAltura, metrosDaAltura, metrosDeTexto, normalizarAltura, rotuloDaAltura,
} from './altura';
export type { AlturaLida } from './altura';
export {
  AJUSTE_DO_TIPO, CRITERIOS_DE_FORMA, CRITERIOS_FORA_DA_FORMA, fichaNeutra, lerForma, resumoDaForma,
} from './metricas';
export type { ExplicacaoDaForma, LeituraDaForma, Proporcoes } from './metricas';
export { MATERIAIS, malhaDaPessoa } from './malha';
export type { AjustesDaMalha, Malha, Material, Ponto } from './malha';
export { paletaDe, pintarFigura } from './pintura';
export type { FiguraPintada, OpcoesDaPintura, Paleta } from './pintura';
export { Figura3D, VISTAS } from './components/Figura3D';
export type { Vista } from './components/Figura3D';
