import type { PerfilSocial, RedeSocialId } from '../types';
import { generateId, safeImage, safeLink } from '../store';

/**
 * Adicionar uma pessoa pela rede social dela.
 *
 * A ideia é simples: você cola o link do perfil (ou só o @, ou o WhatsApp) e
 * o Catalog faz o trabalho chato — reconhece a rede, monta o link certo,
 * sugere o nome a partir do usuário e tenta trazer nome, bio e foto de
 * perfil públicos para a ficha nascer quase pronta.
 *
 * O limite também é simples e fica escrito na tela: quem lê a página do
 * perfil é o seu navegador, e redes como Instagram e TikTok costumam
 * bloquear essa leitura de fora (CORS). Quando isso acontece, nada se perde:
 * o link e o @ já foram reconhecidos, e o painel oferece colar o texto do
 * perfil (nome e bio copiados do aplicativo da rede) ou escolher fotos que
 * já estão no sistema. Nenhuma busca acontece sem você tocar em "Buscar" e
 * nada passa por servidor do Catalog — ele nem existe.
 */

export const ROTULOS_DAS_REDES: Record<RedeSocialId, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', x: 'X (Twitter)', facebook: 'Facebook',
  whatsapp: 'WhatsApp', youtube: 'YouTube', threads: 'Threads', telegram: 'Telegram',
  github: 'GitHub', outra: 'Outra rede',
};

export const rotuloDaRede = (rede: RedeSocialId) => ROTULOS_DAS_REDES[rede] || 'Rede social';

/** As redes oferecidas como atalho quando a pessoa digita só o @. */
export const REDES_PARA_ESCOLHER: RedeSocialId[] = ['instagram', 'tiktok', 'whatsapp', 'x', 'facebook', 'youtube', 'threads', 'telegram', 'github', 'outra'];

export interface AnaliseSocial {
  rede: RedeSocialId;
  /** O @ sem a arroba (ou o telefone, no WhatsApp). */
  usuario: string;
  /** Link canônico do perfil — o que a ficha guarda e abre. */
  url: string;
  /** Nome provável a partir do usuário ("ana.souza" → "Ana Souza"). */
  nomeSugerido: string;
  /** O link colado era de uma publicação, não de um perfil. */
  ehPublicacao?: boolean;
}

const DOMINIOS: Record<string, RedeSocialId> = {
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'x.com': 'x', 'twitter.com': 'x',
  'facebook.com': 'facebook', 'fb.com': 'facebook', 'fb.watch': 'facebook',
  'wa.me': 'whatsapp', 'api.whatsapp.com': 'whatsapp', 'whatsapp.com': 'whatsapp',
  'youtube.com': 'youtube', 'youtu.be': 'youtube',
  'threads.net': 'threads', 'threads.com': 'threads',
  't.me': 'telegram', 'telegram.me': 'telegram', 'telegram.org': 'telegram',
  'github.com': 'github',
};

/** Segmentos de caminho que nunca são um usuário (páginas do próprio site). */
const RESERVADOS = new Set([
  'p', 'reel', 'reels', 'explore', 'stories', 'direct', 'accounts', 'home', 'search',
  'i', 'watch', 'share', 'sharer', 'profile.php', 'groups', 'pages', 'events',
  'channel', 'user', 'c', 'results', 'feed', 'shorts', 'live', 'photo', 'video',
  'login', 'signup', 'about', 'help', 'settings', 'orgs', 'topics', 'marketplace',
]);

export function montarUrlDaRede(rede: RedeSocialId, usuario: string): string {
  const u = usuario.replace(/^@/, '').replace(/\/+$/, '');
  if (!u) return '';
  switch (rede) {
    case 'instagram': return `https://www.instagram.com/${u}/`;
    case 'tiktok': return `https://www.tiktok.com/@${u}`;
    case 'x': return `https://x.com/${u}`;
    case 'facebook': return `https://www.facebook.com/${u}`;
    case 'whatsapp': return `https://wa.me/${u.replace(/\D/g, '')}`;
    case 'youtube': return u.startsWith('UC') && u.length > 12 ? `https://www.youtube.com/channel/${u}` : `https://www.youtube.com/@${u}`;
    case 'threads': return `https://www.threads.net/@${u}`;
    case 'telegram': return `https://t.me/${u}`;
    case 'github': return `https://github.com/${u}`;
    default: return '';
  }
}

const PALAVRAS_QUE_NAO_SAO_NOME = new Set(['oficial', 'real', 'the', 'original', 'eu']);

/** "ana.souza92" → "Ana Souza"; "anasouza" → "Anasouza" (sugestão editável). */
export function nomeSugeridoDoUsuario(usuario: string): string {
  const partes = usuario.replace(/^@/, '')
    .split(/[._-]+/)
    .map(parte => parte.replace(/\d+$/, ''))
    .filter(parte => parte.length > 1 && !/^\d+$/.test(parte) && !PALAVRAS_QUE_NAO_SAO_NOME.has(parte.toLowerCase()));
  if (!partes.length) return '';
  return partes.map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase()).join(' ').slice(0, 80);
}

/** Telefone brasileiro de 10/11 dígitos ganha o 55 que o wa.me exige. */
export function normalizarTelefone(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '');
  if ((digitos.length === 10 || digitos.length === 11) && !digitos.startsWith('55')) return `55${digitos}`;
  return digitos;
}

function analisarUrl(bruta: string): AnaliseSocial | null {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(bruta) ? bruta : `https://${bruta}`); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, '');
  const rede = DOMINIOS[host] || 'outra';
  const segmentos = url.pathname.split('/').map(s => { try { return decodeURIComponent(s); } catch { return s; } }).filter(Boolean);
  let usuario = '';
  let ehPublicacao = false;
  if (rede === 'whatsapp') {
    usuario = normalizarTelefone(url.searchParams.get('phone') || segmentos[0] || '');
  } else if (rede === 'facebook' && segmentos[0] === 'profile.php') {
    usuario = url.searchParams.get('id') || '';
  } else if (rede === 'youtube') {
    const comArroba = segmentos.find(s => s.startsWith('@'));
    if (comArroba) usuario = comArroba.replace(/^@/, '');
    else if (segmentos[0] === 'channel' || segmentos[0] === 'user' || segmentos[0] === 'c') usuario = segmentos[1] || '';
    ehPublicacao = host === 'youtu.be' || segmentos[0] === 'watch' || segmentos[0] === 'shorts';
  } else if (rede === 'tiktok') {
    const comArroba = segmentos.find(s => s.startsWith('@'));
    usuario = (comArroba || '').replace(/^@/, '');
    ehPublicacao = segmentos.includes('video') || segmentos.includes('photo');
  } else if (rede === 'instagram') {
    ehPublicacao = ['p', 'reel', 'reels'].includes(segmentos[0] || '');
    usuario = !ehPublicacao && segmentos[0] && !RESERVADOS.has(segmentos[0]) ? segmentos[0] : '';
  } else if (rede !== 'outra') {
    usuario = segmentos[0] && !RESERVADOS.has(segmentos[0]) ? segmentos[0].replace(/^@/, '') : '';
    if (rede === 'x' && segmentos.includes('status')) ehPublicacao = true;
  }
  const canonica = usuario ? montarUrlDaRede(rede, usuario) : safeLink(url.toString());
  return { rede, usuario, url: canonica || safeLink(url.toString()), nomeSugerido: nomeSugeridoDoUsuario(usuario), ehPublicacao };
}

/**
 * Entende o que a pessoa colou: link completo, domínio sem https, @usuário
 * solto ou telefone. O @ solto usa a rede escolhida nos chips do painel.
 */
export function analisarEntradaSocial(entradaBruta: string, redePreferida: RedeSocialId = 'instagram'): AnaliseSocial | null {
  const entrada = (entradaBruta || '').trim();
  if (!entrada) return null;
  const ehDominioConhecido = /^(https?:\/\/)?(www\.|m\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.com|wa\.me|api\.whatsapp\.com|youtube\.com|youtu\.be|threads\.net|threads\.com|t\.me|telegram\.me|github\.com)\b/i.test(entrada);
  if (ehDominioConhecido || /^https?:\/\//i.test(entrada)) return analisarUrl(entrada.split(/\s+/)[0]);
  // telefone puro: só dígitos e a pontuação de quem escreve um número
  const digitos = entrada.replace(/\D/g, '');
  if (/^[+()\d\s.-]+$/.test(entrada) && digitos.length >= 10 && digitos.length <= 15) {
    const usuario = normalizarTelefone(entrada);
    return { rede: 'whatsapp', usuario, url: montarUrlDaRede('whatsapp', usuario), nomeSugerido: '' };
  }
  // @usuário ou usuário solto, sem espaço
  if (/^@?[\p{L}0-9._-]{2,60}$/u.test(entrada)) {
    const usuario = entrada.replace(/^@/, '');
    const rede = redePreferida === 'whatsapp' ? 'instagram' : redePreferida;
    return { rede, usuario, url: montarUrlDaRede(rede, usuario), nomeSugerido: nomeSugeridoDoUsuario(usuario) };
  }
  // algum outro domínio (site pessoal, linktr.ee...)
  if (/^[^\s/]+\.[^\s/]{2,}(\/\S*)?$/.test(entrada)) return analisarUrl(entrada);
  return null;
}

/* ---------------------------------------------------------- busca pública -- */

export interface ResultadoBuscaPerfil {
  analise: AnaliseSocial;
  nome: string;
  descricao: string;
  /** Fotos candidatas (a de perfil primeiro) — a tela mostra e você escolhe. */
  fotosCandidatas: string[];
  fonte: 'pagina' | 'link';
  /** Explica, sem rodeio, quando a rede não deixou ler a página. */
  aviso?: string;
}

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

function metaDoHtml(html: string, chaves: string[]): string {
  for (const chave of chaves) {
    const padroes = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${chave}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${chave}["']`, 'i'),
    ];
    for (const padrao of padroes) {
      const achou = html.match(padrao)?.[1];
      if (achou) return decodificarEntidades(achou);
    }
  }
  return '';
}

/** Do título da página ("Ana Souza (@ana) • Instagram...") ao nome, limpinho. */
export function limparNomeDeTitulo(titulo: string, usuario = ''): string {
  let nome = (titulo || '').replace(/\s+/g, ' ').trim();
  if (usuario) nome = nome.replace(new RegExp(`\\(@?${usuario.replace(/[.*+?^${'$'}()|[\]\\]/g, '\\$&')}\\)`, 'i'), '');
  nome = nome.replace(/\(@[\p{L}0-9._-]+\)/u, '');
  nome = nome.split(/[•|/—]/)[0].replace(/\s+(no|on)\s+(Instagram|X|Twitter|TikTok|Facebook|YouTube)\s*:?.*$/i, '');
  return nome.replace(/[:\-–\s]+$/, '').trim().slice(0, 100);
}

/** Nome, bio e foto que a própria rede publica no cabeçalho da página (Open Graph). */
export function extrairMetadadosPublicos(html: string, usuario = ''): { nome: string; descricao: string; imagem: string } {
  const titulo = metaDoHtml(html, ['og:title', 'twitter:title']) || decodificarEntidades(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '');
  return {
    nome: limparNomeDeTitulo(titulo, usuario),
    descricao: metaDoHtml(html, ['og:description', 'twitter:description', 'description']).slice(0, 600),
    imagem: metaDoHtml(html, ['og:image', 'twitter:image', 'twitter:image:src']),
  };
}

/**
 * Endereços públicos que costumam devolver a foto de perfil de um @.
 * São só candidatas: a tela usa <img> e esconde as que não carregarem.
 */
export function candidatosDeAvatar(analise: AnaliseSocial): string[] {
  const u = analise.usuario.replace(/^@/, '');
  if (!u) return [];
  switch (analise.rede) {
    case 'instagram': case 'threads': return [`https://unavatar.io/instagram/${encodeURIComponent(u)}`];
    case 'tiktok': return [`https://unavatar.io/tiktok/${encodeURIComponent(u)}`];
    case 'x': return [`https://unavatar.io/twitter/${encodeURIComponent(u)}`];
    case 'youtube': return [`https://unavatar.io/youtube/${encodeURIComponent(u)}`];
    case 'github': return [`https://github.com/${encodeURIComponent(u)}.png?size=400`, `https://unavatar.io/github/${encodeURIComponent(u)}`];
    case 'telegram': return [`https://t.me/i/userpic/320/${encodeURIComponent(u)}.jpg`];
    default: return [];
  }
}

const AVISO_BLOQUEIO = 'A rede não deixou o Catalog ler a página do perfil daqui — é o comportamento normal do Instagram e do TikTok para quem lê de fora. O link e o @ já foram reconhecidos: confira o nome sugerido, cole a bio aqui embaixo se quiser, ou escolha fotos que já estão no sistema na aba Fotos.';

/**
 * Tenta, nesta ordem: ler o cabeçalho público da página do perfil (nome + bio
 * + foto de uma vez) e juntar as fotos candidatas conhecidas. Nunca lança:
 * bloqueou, devolve o que o link já dizia e o aviso honesto.
 */
export async function buscarPerfilPublico(
  analise: AnaliseSocial,
  opcoes: { fetchFn?: typeof fetch; timeoutMs?: number } = {},
): Promise<ResultadoBuscaPerfil> {
  const fotos = [...candidatosDeAvatar(analise)];
  const base: ResultadoBuscaPerfil = { analise, nome: analise.nomeSugerido, descricao: '', fotosCandidatas: fotos, fonte: 'link' };
  if (!analise.url) return base;
  const fetchFn = opcoes.fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return { ...base, aviso: AVISO_BLOQUEIO };
  try {
    const controlador = typeof AbortController === 'function' ? new AbortController() : null;
    const temporizador = controlador ? setTimeout(() => controlador.abort(), opcoes.timeoutMs || 8000) : null;
    try {
      const resposta = await fetchFn(analise.url, { signal: controlador?.signal, headers: { Accept: 'text/html' } });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const html = await resposta.text();
      const meta = extrairMetadadosPublicos(html, analise.usuario);
      const candidatas = meta.imagem && safeImage(meta.imagem) ? [meta.imagem, ...fotos] : fotos;
      return {
        analise,
        nome: meta.nome || analise.nomeSugerido,
        descricao: meta.descricao,
        fotosCandidatas: [...new Set(candidatas)].filter(url => safeImage(url)),
        fonte: 'pagina',
      };
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  } catch {
    return { ...base, aviso: AVISO_BLOQUEIO };
  }
}

/* --------------------------------------------------------- texto colado ---- */

export interface PerfilDeTexto {
  nome: string;
  descricao: string;
  analises: AnaliseSocial[];
}

/**
 * O plano B que sempre funciona: a pessoa abre o perfil no aplicativo da
 * rede, copia o texto (nome, @, bio e links) e cola aqui. Separamos o nome,
 * os perfis citados e a bio das linhas de contagem ("12 mil seguidores").
 */
export function extrairPerfilDeTexto(texto: string, redePreferida: RedeSocialId = 'instagram'): PerfilDeTexto {
  const bruto = texto || '';
  // Links primeiro (com ou sem https://): é deles que sai a rede certa.
  // Os @ são lidos depois, já sem os trechos que eram parte de um link —
  // senão "tiktok.com/@ana" viraria um Instagram imaginário.
  const dominioConhecido = /^(https?:\/\/)?(www\.|m\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.com|wa\.me|api\.whatsapp\.com|youtube\.com|youtu\.be|threads\.net|threads\.com|t\.me|telegram\.me|github\.com)\b/i;
  const urls = bruto.split(/\s+/).map(token => token.replace(/[<>"'),;]+$/, '').replace(/^[<"'(]+/, '')).filter(token => /^https?:\/\//i.test(token) || dominioConhecido.test(token));
  const semUrls = urls.reduce((textoLimpo, url) => textoLimpo.split(url).join(' '), bruto);
  const handles = semUrls.match(/@[\p{L}0-9._-]{2,60}/gu) || [];
  const analises: AnaliseSocial[] = [];
  const jaViu = new Set<string>();
  for (const alvo of [...urls, ...handles]) {
    const analise = analisarEntradaSocial(alvo, redePreferida);
    if (!analise || !analise.usuario) continue;
    const chave = `${analise.rede}:${analise.usuario.toLowerCase()}`;
    if (jaViu.has(chave)) continue;
    jaViu.add(chave);
    analises.push(analise);
  }
  const linhaDeContagem = /^\d[\d.,]*\s*(mil|mi|M|K)?\s*(seguidores|seguindo|publica|posts|curtidas)/i;
  const linhas = bruto.split('\n')
    .map(linha => linha.trim())
    .filter(linha => linha && !linhaDeContagem.test(linha))
    .filter(linha => !/^https?:\/\/\S+$/.test(linha) && !/^@[\p{L}0-9._-]+$/u.test(linha));
  const [primeira, ...resto] = linhas;
  const nome = primeira && primeira.length <= 90 && !/https?:\/\//.test(primeira) ? primeira : '';
  return { nome, descricao: (nome ? resto : linhas).join('\n').slice(0, 600), analises };
}

/* ------------------------------------------------------------ montagem ----- */

export function montarPerfilSocial(analise: AnaliseSocial, extra: { nomeExibicao?: string; fotoUrl?: string } = {}): PerfilSocial {
  return {
    id: generateId(),
    rede: analise.rede,
    usuario: analise.usuario,
    url: analise.url || montarUrlDaRede(analise.rede, analise.usuario),
    nomeExibicao: extra.nomeExibicao?.trim().slice(0, 120) || undefined,
    fotoUrl: extra.fotoUrl && safeImage(extra.fotoUrl) ? extra.fotoUrl : undefined,
    importadoEm: new Date().toISOString(),
  };
}

/** Soma perfis novos sem repetir a mesma conta duas vezes. */
export function mesclarPerfis(atuais: PerfilSocial[], novos: PerfilSocial[]): PerfilSocial[] {
  const resultado = [...(atuais || [])];
  for (const novo of novos) {
    const chave = (s: PerfilSocial) => `${s.rede}:${(s.usuario || '').toLowerCase()}:${s.url || ''}`;
    if (!resultado.some(s => chave(s) === chave(novo))) resultado.push(novo);
  }
  return resultado.slice(0, 20);
}

/** "Instagram @ana.souza · WhatsApp 5571999998888" — o resumo do campo livre. */
export function resumoDasRedes(perfis: PerfilSocial[]): string {
  return (perfis || []).map(perfil => {
    if (perfil.rede === 'whatsapp') return `WhatsApp ${perfil.usuario}`;
    if (perfil.usuario) return `${rotuloDaRede(perfil.rede)} @${perfil.usuario}`;
    return perfil.url;
  }).filter(Boolean).join(' · ');
}

/**
 * Baixa a foto remota para ela morar no aparelho (data URL), como todas as
 * outras fotos do catálogo. Se a rede bloquear o download, guarda o endereço
 * https mesmo — melhor uma foto que pode expirar do que foto nenhuma.
 */
export async function baixarFotoRemota(url: string, fetchFn: typeof fetch | null = typeof fetch === 'function' ? fetch : null): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  if (!fetchFn || typeof FileReader !== 'function') return safeImage(url) ? url : '';
  try {
    const resposta = await fetchFn(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const blob = await resposta.blob();
    if (!blob.type.startsWith('image/') || blob.size > 10 * 1024 * 1024) throw new Error('não é imagem');
    return await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ''));
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return safeImage(url) ? url : '';
  }
}
