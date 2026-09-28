/**
 * API pública do domínio de voz: o **áudio gravado** das pessoas.
 *
 * Voz sintetizada não existe aqui: o aplicativo não fala por ninguém. Quem
 * quiser saber como uma pessoa soa usa os áudios que ela mesma gravou.
 */
export { default as VozDaPessoa } from './components/VozDaPessoa';
export {
  cabeNovaNota, formatarDuracao, formatarPeso, formatoDoAudio, nomeDoArquivoDeVoz, notasDeVoz,
  pesoDoAudio, resumoDaVoz, tituloDaNota,
  VOZ_MAX_NOTA_BYTES, VOZ_MAX_PESSOA_BYTES,
} from './voz';
export { gravacaoSuportada, iniciarGravacao, lerArquivoDeAudio, medirDuracao, motivoSemMicrofone } from './gravador';
export type { Gravacao, Gravador } from './gravador';
export type { ResumoDaVoz } from './voz';
