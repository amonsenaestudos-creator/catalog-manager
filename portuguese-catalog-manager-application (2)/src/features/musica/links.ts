/**
 * Música por link.
 *
 * O aplicativo não guarda arquivo de música: ele guarda o **endereço** que a
 * pessoa escolheu. Este arquivo responde três perguntas, sem tocar em nada:
 *
 * 1. O endereço é seguro (https) e de um serviço conhecido?
 * 2. Dá para tocar aqui dentro (player embutido) ou só abrir fora do aplicativo?
 * 3. Qual é o rótulo do serviço, para o botão dizer a verdade ("Abrir no
 *    YouTube", "Abrir no Spotify")?
 *
 * Nada aqui conhece o catálogo, o `store` ou o React: é conversão de texto em
 * decisão, e é por isso que cabe inteiro em teste.
 */

export type ServicoDeMusica = 'youtube' | 'spotify' | 'soundcloud' | 'arquivo' | 'externo';

export interface MusicaTocavel {
  servico: ServicoDeMusica;
  /** Nome do serviço, como aparece no botão. */
  rotulo: string;
  /** Endereço que o aplicativo abre (o link escolhido, ou a busca curada). */
  abrir: string;
  /** Endereço que toca dentro do aplicativo. Ausente = só abre fora. */
  tocar?: string;
  /** Como tocar: `iframe` (serviço) ou `audio` (arquivo direto). */
  player?: 'iframe' | 'audio';
  /** O que a pessoa precisa saber antes de salvar. */
  aviso?: string;
}

/** Extensões que o `<audio>` do navegador toca direto, sem player de terceiro. */
const ARQUIVO_DE_AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm)(\?|#|$)/i;

/** Id do YouTube: vídeo, faixa ou playlist. Curto e sem espaço, como o serviço usa. */
const ID_DO_YOUTUBE = /^[\w-]{6,64}$/;

/** Só http e https entram: `javascript:` e `data:` ficam de fora, sempre. */
export function linkSeguro(url: string) {
  return /^https?:\/\/\S+$/i.test((url || '').trim());
}

function urlDe(url: string): URL | null {
  if (!linkSeguro(url)) return null;
  try { return new URL(url.trim()); } catch { return null; }
}

/** Monta a busca curada usada quando a pessoa ainda não escolheu um link. */
export function buscaNoYouTube(termo: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(termo.trim())}`;
}

/** Abre um endereço em outra aba. Bloqueio de pop-up não pode derrubar a tela. */
export function abrirEmNovaAba(url: string) {
  if (!linkSeguro(url)) return false;
  try { window.open(url, '_blank', 'noopener,noreferrer'); return true; } catch { return false; }
}

function youtube(alvo: URL, original: string): MusicaTocavel {
  const partes = alvo.pathname.split('/').filter(Boolean);
  const daBarra = /^(shorts|live|embed|v)$/.test(partes[0] || '') ? partes[1] : '';
  const id = alvo.searchParams.get('v') || daBarra || '';
  const lista = alvo.searchParams.get('list') || (partes[0] === 'playlist' ? partes[1] : '') || '';
  if (ID_DO_YOUTUBE.test(id)) {
    return { servico: 'youtube', rotulo: 'YouTube', abrir: original, tocar: `https://www.youtube.com/embed/${id}`, player: 'iframe' };
  }
  if (ID_DO_YOUTUBE.test(lista)) {
    return { servico: 'youtube', rotulo: 'YouTube', abrir: original, tocar: `https://www.youtube.com/embed/videoseries?list=${lista}`, player: 'iframe' };
  }
  return {
    servico: 'youtube', rotulo: 'YouTube', abrir: original,
    aviso: 'Esta página do YouTube abre fora do aplicativo. Para tocar aqui dentro, cole o link do vídeo, da playlist ou da faixa.',
  };
}

function spotify(alvo: URL, original: string): MusicaTocavel {
  const [tipo, id] = alvo.pathname.split('/').filter(Boolean);
  if (['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(tipo || '') && ID_DO_YOUTUBE.test(id || '')) {
    return {
      servico: 'spotify', rotulo: 'Spotify', abrir: original, tocar: `https://open.spotify.com/embed/${tipo}/${id}`, player: 'iframe',
      aviso: 'No Spotify, o player toca a prévia sem login; com a sessão aberta no navegador, toca inteiro.',
    };
  }
  return { servico: 'spotify', rotulo: 'Spotify', abrir: original, aviso: 'Este endereço do Spotify só abre no aplicativo ou no site do serviço.' };
}

/**
 * Lê um endereço e devolve o que dá para fazer com ele.
 * `null` quando não é um link http(s) válido.
 */
export function interpretarMusica(url: string): MusicaTocavel | null {
  const original = (url || '').trim();
  const alvo = urlDe(original);
  if (!alvo) return null;
  const host = alvo.hostname.toLowerCase().replace(/^www\./, '');
  if (ARQUIVO_DE_AUDIO.test(alvo.pathname)) {
    return { servico: 'arquivo', rotulo: 'arquivo de áudio', abrir: original, tocar: original, player: 'audio' };
  }
  if (host === 'youtu.be') {
    const id = alvo.pathname.split('/').filter(Boolean)[0] || '';
    if (ID_DO_YOUTUBE.test(id)) return { servico: 'youtube', rotulo: 'YouTube', abrir: original, tocar: `https://www.youtube.com/embed/${id}`, player: 'iframe' };
    return { servico: 'youtube', rotulo: 'YouTube', abrir: original, aviso: 'Não consegui reconhecer o vídeo neste link curto.' };
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) return youtube(alvo, original);
  if (host === 'open.spotify.com') return spotify(alvo, original);
  if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) {
    return {
      servico: 'soundcloud', rotulo: 'SoundCloud', abrir: original, player: 'iframe',
      tocar: `https://w.soundcloud.com/player/?url=${encodeURIComponent(original)}&color=%23c786ec&hide_related=true&show_comments=false&show_teaser=false`,
    };
  }
  return { servico: 'externo', rotulo: 'site', abrir: original, aviso: 'Este endereço não tem player embutido: o aplicativo abre no site do serviço.' };
}
