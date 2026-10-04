/**
 * API pública do domínio de corpo: altura medida e figura 3D montada das
 * métricas. Nada aqui guarda dado — é leitura da ficha, sempre.
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
export { alturaDoModelo, modeloDaPessoa, ordenarBracos, sombraDoModelo } from './modelo';
export type { PapelDaPeca, PecaDoModelo } from './modelo';
export { caixaDoModelo, girarPonto, matrizDaVista, projetarModelo, projetarPeca } from './projecao';
export type { ElipseProjetada, Matriz, Vec3 } from './projecao';
export { Figura3D, VISTAS } from './components/Figura3D';
export type { Vista } from './components/Figura3D';
