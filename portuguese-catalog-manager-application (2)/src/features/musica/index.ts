/**
 * API pública do domínio de música: clima do Momentos e trilha da apresentação,
 * sempre por **link escolhido pela pessoa** — nada de arquivo dentro do app.
 */
export { SEM_MUSICA, AMBIENTES_MUSICAIS, TRILHAS_DA_APRESENTACAO, buscaDaMusica, ehClimaDoAmbiente, musicaPorId } from './catalogo';
export type { MusicaDoApp } from './catalogo';
export { abrirEmNovaAba, buscaNoYouTube, interpretarMusica, linkSeguro } from './links';
export type { MusicaTocavel, ServicoDeMusica } from './links';
export { PlayerDeMusica } from './components/PlayerDeMusica';
export { AmbienteBar } from './components/AmbienteBar';
export {
  AMBIENTES_SUPORTADOS, RECEITAS_DO_AMBIENTE, ROTULOS_DO_AMBIENTE,
  alternarAmbiente, ambienteDisponivel, ambienteTocando, aoMudarAmbiente,
  definirVolumeDoAmbiente, ehClimaSuportado, pararAmbiente, retomarAmbientePendente,
  tocarAmbiente, volumeDoAmbiente,
} from './ambiente';
export type { ClimaDoAmbiente } from './ambiente';
