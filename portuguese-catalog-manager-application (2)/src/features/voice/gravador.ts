/**
 * Gravação de voz: microfone, arquivo e player.
 *
 * Uma nota de voz entra no catálogo como `data:audio/...`, do mesmo jeito que
 * as fotos entram como `data:image/...`. A gravação é leve de propósito
 * (mono, ~24 kbps opus), porque o catálogo inteiro vive no aparelho e ainda
 * precisa caber num backup só.
 *
 * Onde não existe microfone (nos testes, num navegador antigo), nada estoura:
 * cada função explica em português o que aconteceu.
 */

export interface Gravacao {
  url: string;
  duracao: number;
  bytes: number;
}

export interface Gravador {
  /** Para a gravação e devolve o áudio pronto para guardar. */
  parar: () => Promise<Gravacao>;
  /** Abandona a gravação e devolve o microfone. */
  cancelar: () => void;
  /** Quanto já gravou, em segundos. */
  duracaoAtual: () => number;
  /** Nível de entrada (0 a 1) para a ondinha da tela. */
  nivel: () => number;
}

const TIPOS_PREFERIDOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

export const gravacaoSuportada = () => typeof navigator !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia
  && typeof window !== 'undefined'
  && typeof window.MediaRecorder === 'function';

export const tipoDeGravacao = () => {
  if (typeof window === 'undefined' || typeof window.MediaRecorder !== 'function') return '';
  for (const tipo of TIPOS_PREFERIDOS) if (window.MediaRecorder.isTypeSupported?.(tipo)) return tipo;
  return '';
};

/** Explica em português por que o microfone não abriu. */
export function motivoSemMicrofone(erro?: unknown) {
  const nome = (erro as { name?: string } | undefined)?.name || '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'O navegador não liberou o microfone. Autorize o acesso a este site e tente de novo.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nenhum microfone encontrado neste aparelho. Você ainda pode enviar um arquivo de áudio.';
  if (!gravacaoSuportada()) return 'Este navegador não grava áudio. Use “Enviar um áudio” para guardar um arquivo que você já tem.';
  return 'Não foi possível abrir o microfone agora. Tente novamente.';
}

const blobParaDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onload = () => resolve(typeof leitor.result === 'string' ? leitor.result : '');
  leitor.onerror = () => reject(leitor.error);
  leitor.readAsDataURL(blob);
});

export interface OpcoesDeGravacao {
  /** Chamado a cada bloco: (segundos gravados, nível de 0 a 1). */
  aoAndar?: (segundos: number, nivel: number) => void;
  /** Para sozinho ao chegar aqui (padrão: 300 s). */
  limiteSegundos?: number;
  /** Avisa que o limite chegou — quem chama decide se salva ou descarta. */
  aoLimite?: (segundos: number) => void;
}

/**
 * Abre o microfone e começa a gravar. Lança erro com mensagem pronta quando
 * não dá — quem chama só mostra o texto.
 */
export async function iniciarGravacao({ aoAndar, limiteSegundos = 300, aoLimite }: OpcoesDeGravacao = {}): Promise<Gravador> {
  if (!gravacaoSuportada()) throw new Error(motivoSemMicrofone());
  let fluxo: MediaStream;
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (erro) {
    throw new Error(motivoSemMicrofone(erro));
  }

  const tipo = tipoDeGravacao();
  const gravador = new window.MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
  const pedacos: Blob[] = [];
  gravador.ondataavailable = evento => { if (evento.data && evento.data.size) pedacos.push(evento.data); };

  const inicio = Date.now();
  const duracaoAtual = () => (Date.now() - inicio) / 1000;
  let nivel = 0;
  let parado = false;

  // Nível de entrada: dá vida à ondinha e mostra que o microfone está ouvindo.
  let fecharMedidor = () => undefined as void;
  try {
    const contexto = new AudioContext();
    const analisador = contexto.createAnalyser();
    analisador.fftSize = 512;
    contexto.createMediaStreamSource(fluxo).connect(analisador);
    const amostras = new Uint8Array(analisador.frequencyBinCount);
    const relogio = window.setInterval(() => {
      analisador.getByteFrequencyData(amostras);
      let soma = 0;
      for (const valor of amostras) soma += valor;
      nivel = Math.min(1, soma / amostras.length / 90);
    }, 90);
    fecharMedidor = () => { window.clearInterval(relogio); void contexto.close?.().catch?.(() => undefined); };
  } catch { /* sem nível: a gravação segue normalmente */ }

  let pararRelogio = () => undefined as void;
  if (aoAndar) {
    const relogio = window.setInterval(() => {
      const segundos = duracaoAtual();
      aoAndar(segundos, nivel);
      if (segundos >= limiteSegundos) aoLimite?.(segundos);
    }, 200);
    pararRelogio = () => window.clearInterval(relogio);
  }

  const limpar = () => { pararRelogio(); fecharMedidor(); fluxo.getTracks().forEach(faixa => faixa.stop()); };
  gravador.start(250);

  const parar = () => new Promise<Gravacao>((resolve, reject) => {
    if (parado) { reject(new Error('A gravação já foi encerrada.')); return; }
    parado = true;
    gravador.onstop = async () => {
      const duracao = Math.max(1, Math.round(duracaoAtual()));
      limpar();
      try {
        const blob = new Blob(pedacos, { type: tipo || pedacos[0]?.type || 'audio/webm' });
        const url = await blobParaDataUrl(blob);
        resolve({ url, duracao, bytes: blob.size });
      } catch (erro) { reject(erro); }
    };
    try { gravador.stop(); } catch (erro) { limpar(); reject(erro); }
  });

  return {
    parar,
    cancelar: () => { parado = true; try { gravador.stop(); } catch { /* já parou */ } limpar(); },
    duracaoAtual,
    nivel: () => nivel,
  };
}

/** Lê um arquivo de áudio escolhido à mão e mede a duração de verdade. */
export async function lerArquivoDeAudio(arquivo: File): Promise<Gravacao> {
  const url = await blobParaDataUrl(arquivo);
  const duracao = await medirDuracao(url);
  return { url, duracao, bytes: arquivo.size || Math.round(url.length * 0.75) };
}

/** Duração real do áudio (0 quando o navegador não consegue abrir). */
export function medirDuracao(url: string): Promise<number> {
  if (typeof Audio !== 'function') return Promise.resolve(0);
  return new Promise(resolve => {
    const audio = new Audio();
    const encerrar = (valor: number) => { audio.src = ''; resolve(Number.isFinite(valor) ? Math.round(valor) : 0); };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => encerrar(audio.duration);
    audio.onerror = () => encerrar(0);
    audio.src = url;
  });
}
