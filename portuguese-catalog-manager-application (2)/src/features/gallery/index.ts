/** API pública de mídia da galeria. */
export { findDuplicatePhotos, getAllPhotos, medirImagem, normalizePhotos, readImage } from '../../store';
export type { Photo, Album, Attachment } from '../../types';

/* --------------------------------------------------------------------------
   Edição de imagens
   --------------------------------------------------------------------------
   `edicao.ts` é a receita (conta pura, testável sem navegador), `tela.ts` é o
   desenho (canvas, com saída nula quando não há canvas) e os componentes são a
   tela. Quem quer abrir o editor usa `useEdicaoDeFoto`, que também devolve a
   gravação pronta — nenhuma tela precisa saber onde a foto mora.
   -------------------------------------------------------------------------- */
export { default as EditorDeImagem } from './components/EditorDeImagem';
export type { EditorDeImagemProps } from './components/EditorDeImagem';
export { default as PainelDeEdicao, ControlesDeCor, TrilhaDeFerramentas } from './components/PainelDeEdicao';
export type { EstadoDoPincel, EstadoDoTexto, PainelProps } from './components/PainelDeEdicao';
export { default as useEdicaoDeFoto } from './components/EdicaoDeFoto';
export type { EdicaoDeFoto } from './components/EdicaoDeFoto';

export {
  ALCAS, AJUSTES_NEUTROS, BLOCOS_DO_MOSAICO, CORES_PRONTAS, CORTE_MINIMO, FILTROS_PRONTOS, FORMAS,
  LIMITES_DO_AJUSTE, PASSOS_DE_HISTORICO, PROPORCOES, TAMANHOS_DE_TEXTO,
  aplicarAcao, aplicarGeometria, apagarMarcas, areaDoArrasto, areaProporcional,
  arredondarArea, arrastarArea, coresDominantes, corDoPixel, corEmHex, corteValido, desfazer,
  edicaoInicial, encaixarArea, filtroAtivo, filtroCss, ajustesDoFiltro, ajustesNeutros,
  fotoComoNova, fotoEditada, guardarFotoEditada, hexParaRgb, historicoInicial, idDaMarca,
  lerCoresRecentes, limitar, luminancia, marcaNoPonto, mensagemDoSalvamento, moverMarcaPara,
  moverPonto, novaForma, novoBorrado, novoTexto, novoTraco, nomeEditado, paraFonte, paraSaida,
  pontosDaMarca, limitesDaMarca, podeDesfazer, podeRefazer, razaoDaSaida, refazer, registrar,
  repor, rgbParaHex, salvarCorRecente, tamanhoDaEdicao, tamanhoDaSaida, temMudanca, textoSobre,
  caminhoDoTraco,
} from './edicao';
export type {
  AcaoGeometrica, Ajustes, Alca, Angulo, Borrado, Edicao, FiltroPronto, Forma, FormaTipo,
  Geometria, Historico, Marca, ModoDeSalvamento, OpcoesDePincel, Ponto, Proporcao, Retangulo,
  ResultadoDaEdicao, Rgb, Tamanho, Texto, Traco,
} from './edicao';

export { FERRAMENTAS, FERRAMENTAS_DE_DESENHO, TRILHA, ferramentaDe } from './ferramentas';
export type { Ferramenta, FerramentaId } from './ferramentas';

export {
  carregarImagem, comporTela, corNaTela, desenharAcabamento, desenharBase, desenharFoto,
  desenharMarca, desenharMarcas, exportarEdicao, filtroNoContexto, formatoDeSaida,
  miniaturaDeAjustes, novoCanvas, paletaDaTela, tamanhoNatural,
} from './tela';
export type { Imagem, OpcoesDeExportacao } from './tela';
