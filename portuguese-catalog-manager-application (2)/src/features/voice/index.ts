/** API pública do domínio de voz: áudio das pessoas e voz falada. */
export { default as VozDaPessoa } from './components/VozDaPessoa';
export {
  cabeNovaNota, formatarDuracao, formatarPeso, formatoDoAudio, nomeDoArquivoDeVoz, notasDeVoz,
  perfilDeVoz, pesoDoAudio, resumoDaVoz, sementeDeVoz, textoDeApresentacao, tituloDaNota,
  VOZ_MAX_NOTA_BYTES, VOZ_MAX_PESSOA_BYTES, VOZ_RITMO, VOZ_TOM,
} from './voz';
export {
  duracaoEstimada, escolherVoz, falando, falar, pararDeFalar, rotuloDaVoz, vozSuportada, vozesDisponiveis,
} from './sintetizador';
export { gravacaoSuportada, iniciarGravacao, lerArquivoDeAudio, medirDuracao, motivoSemMicrofone } from './gravador';
export type { Gravacao, Gravador } from './gravador';
export type { ResumoDaVoz } from './voz';
