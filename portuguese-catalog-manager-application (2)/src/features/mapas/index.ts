/**
 * API pública dos mapas mentais.
 *
 * `mapa.ts` é a regra pura (nós, fios, organização, contorno — testável sem
 * navegador), `tela.ts` é o desenho que vira PNG e os componentes são a tela.
 * Quem quer a página importa `MapasMentais`; quem quer só a conta importa as
 * funções, sem arrastar React junto.
 */
export { default as MapasMentais } from './components/MapasMentais';
export { default as TelaDoMapa } from './components/TelaDoMapa';
export type { TelaDoMapaProps, VistaDoMapa } from './components/TelaDoMapa';
export { default as PainelDoMapa } from './components/PainelDoMapa';
export type { PainelDoMapaProps } from './components/PainelDoMapa';

export {
  ANEL_DO_MAPA, CORES_DO_MAPA, LIMITE_DO_TEXTO, TAMANHO_DO_NO, adicionarNo, arestasDe,
  contornoDoMapa, desligar, editarNo, limitesDoMapa, ligar, ligacaoNova, mapaDasRelacoes,
  mapaNovo, moverNo, nomeDoContorno, noNovo, noPorId, organizar, raizDoMapa, removerNo,
  renomearMapa, resumoDoMapa, rotularLigacao, vizinhosDe,
} from './mapa';
export type { PontoDoMapa } from './mapa';
export { exportarMapaPng } from './tela';
