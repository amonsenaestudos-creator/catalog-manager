/**
 * Importação de um perfil social para a ficha.
 *
 * O aplicativo é local: as fichas e fotos não passam por servidor nenhum. Esta
 * é a única parte que sai para a internet — e sai só o endereço público que a
 * pessoa colou. A leitura acontece de duas formas, na ordem:
 *
 *   1. **API pública da própria rede** quando ela oferece uma sem chave:
 *      GitHub (usuário, bio, localização, site, seguidores e avatar) e os
 *      oEmbed de TikTok, YouTube e X (nome do autor e capa). Nada de login.
 *   2. **Leitura pública de metadados** (Open Graph, JSON-LD, o mesmo que o
 *      link mostra quando é compartilhado) por um leitor com CORS. É o caminho
 *      para Instagram, Facebook, Threads, LinkedIn e para o que a API direta
 *      não devolveu. Vários leitores são tentados em ordem; o primeiro que
 *      responder com dados úteis vence.
 *
 * O resultado nunca é aplicado sozinho: a tela mostra o que foi encontrado e a
 * pessoa escolhe o nome, a bio, a localização e quais imagens entram na ficha.
 * Quando nada é lido (rede bloqueou, perfil privado, sem internet), o link
 * ainda pode ser guardado à mão.
 */
import type { PerfilSocial, RedeSocial } from '../types';

type Fetcher = typeof fetch;

export interface RedeInfo {
  id: RedeSocial;
  nome: string;
  exemplo: string;
  hosts: string[];
}

/** Redes com endereço reconhecido. A ordem é a da tela. */
export const REDES: RedeInfo[] = [
  { id: 'instagram', nome: 'Instagram', exemplo: 'instagram.com/usuario', hosts: ['instagram.com'] },
  { id: 'tiktok', nome: 'TikTok', exemplo: 'tiktok.com/@usuario', hosts: ['tiktok.com'] },
  { id: 'x', nome: 'X / Twitter', exemplo: 'x.com/usuario', hosts: ['x.com', 'twitter.com'] },
  { id: 'github', nome: 'GitHub', exemplo: 'github.com/usuario', hosts: ['github.com'] },
  { id: 'facebook', nome: 'Facebook', exemplo: 'facebook.com/usuario', hosts: ['facebook.com', 'fb.com', 'm.facebook.com'] },
  { id: 'youtube', nome: 'YouTube', exemplo: 'youtube.com/@canal', hosts: ['youtube.com', 'youtu.be'] },
  { id: 'threads', nome: 'Threads', exemplo: 'threads.net/@usuario', hosts: ['threads.net', 'threads.com'] },
  { id: 'linkedin', nome: 'LinkedIn', exemplo: 'linkedin.com/in/usuario', hosts: ['linkedin.com'] },
  { id: 'twitch', nome: 'Twitch', exemplo: 'twitch.tv/usuario', hosts: ['twitch.tv'] },
  { id: 'pinterest', nome: 'Pinterest', exemplo: 'pinterest.com/usuario', hosts: ['pinterest.com', 'pin.it'] },
  { id: 'kwai', nome: 'Kwai', exemplo: 'kwai.com/@usuario', hosts: ['kwai.com', 'kwai-video.com', 'kuaishou.com'] },
  { id: 'outro', nome: 'Outro site', exemplo: 'https://site.com/perfil', hosts: [] },
];

export const rotuloDaRede = (rede: RedeSocial) => REDES.find(item => item.id === rede)?.nome || 'Site';

const hostDaRede: Record<string, RedeSocial> = {};
for (const rede of REDES) for (const host of rede.hosts) hostDaRede[host] = rede.id;

export interface EnderecoDoPerfil {
  rede: RedeSocial;
  usuario: string;
  /** Endereço canônico, sem parâmetros de campanha. */
  url: string;
  /** O que foi digitado, quando já era um endereço completo. */
  original: string;
}

export interface PerfilEncontrado {
  rede: RedeSocial;
  url: string;
  usuario: string;
  nome: string;
  bio: string;
  localizacao: string;
  site: string;
  seguidores: number | null;
  verificado: boolean;
  /** Retrato principal encontrado (o primeiro candidato). */
  avatar: string;
  /** Todos os candidatos a imagem, sem repetição. */
  fotos: string[];
  fonte: string;
  /** O que foi tentado — mostrado só quando dá errado. */
  tentativas: string[];
  importadoEm: string;
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const limparEspacos = (texto: string) => texto.replace(/\s+/g, ' ').trim();
const soUsuario = (valor: string) => decodeURIComponent(valor).replace(/^@/, '').replace(/[/?#].*$/, '').trim();

function redeDoHost(host: string): RedeSocial | null {
  const limpo = host.toLowerCase().replace(/^(www|m|mobile)\./, '');
  return hostDaRede[limpo] || hostDaRede[host.toLowerCase()] || null;
}

/**
 * Entende o que a pessoa digitou: um endereço completo, um endereço sem
 * `https://` ou só `@usuario`. Sem rede escolhida, `@usuario` é Instagram,
 * que é o caso mais comum — mas a tela deixa trocar antes de buscar.
 */
export function lerEndereco(entrada: string, redeEscolhida: RedeSocial | 'auto' = 'auto'): EnderecoDoPerfil {
  const bruto = entrada.trim();
  if (!bruto) throw new Error('Cole o link do perfil ou digite @usuario.');
  const pareceSite = /^https?:\/\//i.test(bruto) || /^[\w-]+(\.[\w-]+)+(\/|$)/i.test(bruto);
  if (!pareceSite) {
    const usuario = soUsuario(bruto);
    if (!/^[a-zA-Z0-9._-]{2,60}$/.test(usuario)) throw new Error('Use só o nome de usuário, sem espaços: @usuario.');
    const rede = redeEscolhida === 'auto' ? 'instagram' : redeEscolhida;
    return { rede, usuario, url: urlCanonica(rede, usuario, ''), original: bruto };
  }
  const endereco = new URL(/^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`);
  if (!/^https?:$/.test(endereco.protocol)) throw new Error('Só endereços http(s) podem ser lidos.');
  const detectada = redeDoHost(endereco.hostname);
  const rede: RedeSocial = redeEscolhida !== 'auto' ? redeEscolhida : (detectada || 'outro');
  const partes = endereco.pathname.split('/').filter(Boolean);
  const primeiroBruto = partes[0] || '';
  const primeiro = primeiroBruto ? soUsuario(primeiroBruto) : '';
  // Endereços que não são perfil (uma publicação, um vídeo, uma busca) não
  // podem virar @usuario: sem esta lista, /p/ABC virava o usuário "p".
  const reservados: Partial<Record<RedeSocial, string[]>> = {
    instagram: ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'],
    tiktok: ['video', 'tag', 'discover', 'foryou', 'search'],
    x: ['i', 'intent', 'share', 'home', 'explore', 'search', 'hashtag', 'settings'],
    github: ['settings', 'features', 'explore', 'orgs', 'topics', 'marketplace', 'login'],
    facebook: ['permalink.php', 'story.php', 'watch', 'reel', 'reels', 'share', 'groups', 'events'],
    twitch: ['directory', 'videos', 'search'],
    pinterest: ['pin', 'ideas', 'search'],
    linkedin: ['feed', 'jobs', 'posts', 'pulse', 'learning'],
  };
  if (primeiro && (reservados[rede] || []).includes(primeiro.toLowerCase())) throw new Error(`Esse link é de uma publicação, não de um perfil. Use o endereço do perfil, como ${REDES.find(r => r.id === rede)?.exemplo}.`);
  let usuario = '';
  if (rede === 'youtube') {
    if (primeiroBruto.startsWith('@')) usuario = soUsuario(primeiroBruto);
    else if (['c', 'channel', 'user'].includes(primeiro)) usuario = soUsuario(partes[1] || '');
    else usuario = '';
  } else if (rede === 'linkedin') {
    usuario = soUsuario(primeiro === 'in' ? (partes[1] || '') : primeiro);
  } else if (rede === 'facebook') {
    usuario = endereco.searchParams.get('id') || soUsuario(primeiro === 'profile.php' ? '' : primeiro);
  } else if (rede === 'outro') {
    usuario = soUsuario(primeiro);
  } else {
    usuario = primeiro.startsWith('@') ? soUsuario(primeiro) : soUsuario(primeiro);
  }
  // Endereço de perfil sem usuário (uma publicação, um vídeo) ainda serve para
  // ler metadados; só não dá para montar um endereço canônico de perfil.
  if (!usuario && rede !== 'outro') throw new Error(`Esse link não parece um perfil do ${rotuloDaRede(rede)}. Use o endereço do perfil, como ${REDES.find(r => r.id === rede)?.exemplo}.`);
  return { rede, usuario, url: rede === 'outro' ? `${endereco.origin}${endereco.pathname}` : urlCanonica(rede, usuario, `${endereco.origin}${endereco.pathname}`), original: bruto };
}

function urlCanonica(rede: RedeSocial, usuario: string, original: string): string {
  const u = encodeURIComponent(usuario);
  switch (rede) {
    case 'instagram': return `https://www.instagram.com/${u}/`;
    case 'tiktok': return `https://www.tiktok.com/@${u}`;
    case 'x': return `https://x.com/${u}`;
    case 'github': return `https://github.com/${u}`;
    case 'facebook': return `https://www.facebook.com/${u}`;
    case 'youtube': return `https://www.youtube.com/@${u}`;
    case 'threads': return `https://www.threads.net/@${u}`;
    case 'linkedin': return `https://www.linkedin.com/in/${u}/`;
    case 'twitch': return `https://www.twitch.tv/${u}`;
    case 'pinterest': return `https://www.pinterest.com/${u}/`;
    case 'kwai': return `https://www.kwai.com/@${u}`;
    default: return original;
  }
}

/* --------------------------------------------------------------- rede -- */

interface Leitor { nome: string; url: (alvo: string) => string; tipo: 'json' | 'html' }

/**
 * Leitores públicos de metadados. Todos entregam o mesmo que a prévia de um
 * link: título, descrição e imagem. A ordem tenta primeiro o mais estruturado.
 */
const LEITORES: Leitor[] = [
  { nome: 'leitor de metadados', tipo: 'json', url: alvo => `https://api.microlink.io/?url=${encodeURIComponent(alvo)}` },
  { nome: 'AllOrigins', tipo: 'html', url: alvo => `https://api.allorigins.win/raw?url=${encodeURIComponent(alvo)}` },
  { nome: 'CodeTabs', tipo: 'html', url: alvo => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(alvo)}` },
  { nome: 'corsproxy', tipo: 'html', url: alvo => `https://corsproxy.io/?url=${encodeURIComponent(alvo)}` },
];

const TEMPO_LIMITE = 8000;

async function buscarUrl(url: string, fetcher: Fetcher, limite = TEMPO_LIMITE): Promise<Response> {
  const controlador = typeof AbortController === 'function' ? new AbortController() : null;
  const relogio = controlador ? setTimeout(() => controlador.abort(), limite) : null;
  try {
    return await fetcher(url, {
      mode: 'cors',
      signal: controlador?.signal,
      headers: { Accept: 'application/json, text/html;q=0.9, */*;q=0.8' },
    });
  } finally {
    if (relogio) clearTimeout(relogio);
  }
}

async function pedirJson(url: string, fetcher: Fetcher) {
  const resposta = await buscarUrl(url, fetcher);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json() as Promise<unknown>;
}

async function pedirTexto(url: string, fetcher: Fetcher) {
  const resposta = await buscarUrl(url, fetcher);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.text();
}

const texto = (valor: unknown) => typeof valor === 'string' ? valor : '';
const numero = (valor: unknown) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function urlAbsoluta(valor: string, base: string): string {
  if (!valor) return '';
  try {
    const url = new URL(valor.trim(), base);
    return /^https?:$/.test(url.protocol) ? url.toString() : '';
  } catch { return ''; }
}

/** Números no formato brasileiro e no inglês: "12,5 mil", "1.234", "2.3M". */
export function extrairSeguidores(valor: string): number | null {
  const encontrado = /([\d.,]+)\s*(mil|mi|milh(?:ão|ões)|[kmb])?\s*(seguidores|followers)/i.exec(valor);
  if (!encontrado) return null;
  const sufixo = semAcento(encontrado[2] || '');
  let numeroTexto = encontrado[1];
  if (numeroTexto.includes(',') && numeroTexto.includes('.')) numeroTexto = numeroTexto.replace(/\./g, '').replace(',', '.');
  else if (numeroTexto.includes(',')) {
    // "1,234" no cartão em inglês é milhar; "12,5 mil" é decimal. O sufixo
    // (mil, K, M) decide — e três dígitos depois da vírgula também.
    const [inteiro, decimal] = numeroTexto.split(',');
    numeroTexto = !sufixo && decimal?.length === 3 ? `${inteiro}${decimal}` : `${inteiro}.${decimal}`;
  } else if (/\.\d{3}(\.|$)/.test(numeroTexto)) numeroTexto = numeroTexto.replace(/\./g, '');
  const base = Number(numeroTexto.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(base)) return null;
  const multiplicador = sufixo === 'k' || sufixo === 'mil' ? 1_000 : sufixo === 'm' || sufixo === 'mi' || sufixo.startsWith('milh') ? 1_000_000 : sufixo === 'b' ? 1_000_000_000 : 1;
  return Math.round(base * multiplicador);
}

/**
 * Nome limpo a partir do título da página.
 * "Maria Silva (@maria) • Instagram photos and videos" vira "Maria Silva";
 * "Canal - YouTube" vira "Canal".
 */
export function limparNomeDoPerfil(titulo: string, rede: RedeSocial, usuario: string): string {
  void rede; void usuario;
  let nome = limparEspacos(titulo || '');
  if (!nome) return '';
  nome = nome.replace(/\s*\(@?[\w.\-]+\)\s*/g, ' ');
  const redes = 'Instagram|TikTok|X|Twitter|Facebook|YouTube|Threads|GitHub|LinkedIn|Twitch|Pinterest|Kwai|Kuaishou';
  nome = nome.replace(new RegExp(`\\s*[|•·/–—-]\\s*(?:${redes})(?:\\s.*)?$`, 'i'), '');
  nome = nome.replace(new RegExp(`\\s+(?:on|no|em)\\s+(?:${redes})(?:\\s.*)?$`, 'i'), '');
  nome = nome.replace(/\s*[|•·]\s*Instagram photos and videos.*$/i, '');
  nome = nome.replace(/\s*[|•·]\s*\d[\d.,KMkm]*\s*(?:Followers|Following|Posts|seguidores|seguindo|publicações).*$/i, '');
  nome = nome.replace(/^["“”']|["“”']$/g, '').trim();
  nome = nome.replace(/[\s|•·/–—-]+$/, '').trim();
  // Título genérico de página de login ou da própria rede não é nome de ninguém.
  if (!nome || new RegExp(`^(?:login|entrar|log in|sign in|${redes}|home|início|perfil)$`, 'i').test(nome)) return '';
  return nome.slice(0, 100);
}

/** Tira o texto de vitrine do Open Graph e deixa só a bio escrita pela pessoa. */
export function limparBioDoPerfil(valor: string): string {
  let bio = limparEspacos(valor || '');
  bio = bio.replace(/^[\d.,]+\s*[KMB]?\s*(?:Followers|Following|Posts|seguidores|seguindo|publicações)[^-–—]*[-–—]\s*/i, '');
  bio = bio.replace(/^(?:See|Veja)\s+(?:the\s+)?(?:Instagram|TikTok|Facebook|Threads|X|Twitter|YouTube|LinkedIn|Twitch|Pinterest)[^.]*\.?\s*/i, '');
  bio = bio.replace(/\s*[|•·]\s*(?:Instagram|TikTok|Facebook|Threads|X|Twitter|YouTube|LinkedIn|Twitch|Pinterest|GitHub|Kwai).*$/i, '');
  bio = bio.replace(/\s*[-–—]\s*(?:Instagram|TikTok|Facebook|Threads|X|Twitter|YouTube|LinkedIn|Twitch|Pinterest|GitHub|Kwai).*$/i, '');
  bio = bio.replace(/^(?:Instagram|TikTok|Facebook|Threads|YouTube|LinkedIn|Twitch|Pinterest|GitHub)\s*[-–—:]\s*/i, '');
  return limparEspacos(bio).slice(0, 500);
}

/* ------------------------------------------------------------- metadados -- */

interface Metadados {
  titulo: string;
  descricao: string;
  imagens: string[];
  nomeJsonLd: string;
  descricaoJsonLd: string;
  usuario: string;
  site: string;
  verificado: boolean;
  localizacao: string;
}

const METADADOS_VAZIOS: Metadados = { titulo: '', descricao: '', imagens: [], nomeJsonLd: '', descricaoJsonLd: '', usuario: '', site: '', verificado: false, localizacao: '' };

function imagensDoJsonLd(valor: unknown, base: string): string[] {
  if (typeof valor === 'string') return [urlAbsoluta(valor, base)].filter(Boolean);
  if (Array.isArray(valor)) return valor.flatMap(item => imagensDoJsonLd(item, base));
  if (valor && typeof valor === 'object') {
    const item = valor as Record<string, unknown>;
    return imagensDoJsonLd(item.url || item.contentUrl || item.image, base);
  }
  return [];
}

function objetosDoJsonLd(valor: unknown, saida: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(valor)) { for (const item of valor) objetosDoJsonLd(item, saida); return saida; }
  if (!valor || typeof valor !== 'object') return saida;
  const objeto = valor as Record<string, unknown>;
  saida.push(objeto);
  if (objeto['@graph']) objetosDoJsonLd(objeto['@graph'], saida);
  return saida;
}

/** Lê Open Graph, Twitter Card e JSON-LD de uma página pública. */
export function extrairMetadados(html: string, base: string): Metadados {
  if (!html || typeof DOMParser !== 'function') return { ...METADADOS_VAZIOS };
  const documento = new DOMParser().parseFromString(html, 'text/html');
  const meta = (chave: string) => {
    const elemento = documento.querySelector(`meta[property="${chave}"], meta[name="${chave}"]`);
    return elemento?.getAttribute('content')?.trim() || '';
  };
  const primeiro = (...chaves: string[]) => chaves.map(meta).find(Boolean) || '';
  const resultado: Metadados = { ...METADADOS_VAZIOS };
  resultado.titulo = primeiro('og:title', 'twitter:title') || documento.querySelector('title')?.textContent?.trim() || '';
  resultado.descricao = primeiro('og:description', 'twitter:description', 'description');
  resultado.site = meta('og:site_name');
  resultado.usuario = primeiro('profile:username', 'twitter:creator').replace(/^@/, '');
  resultado.verificado = /^(true|yes|1)$/i.test(meta('profile:verified')) || /verified|verificado/i.test(primeiro('og:title', 'twitter:description'));
  const localizacao = primeiro('profile:location', 'og:locality', 'place:location:latitude');
  resultado.localizacao = /^-?\d+(\.\d+)?$/.test(localizacao) ? '' : localizacao;
  const imagens = [
    ...['og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image', 'twitter:image:src', 'image'].map(meta),
    documento.querySelector('link[rel="image_src"]')?.getAttribute('href') || '',
  ];
  for (const bruto of imagens) {
    const absoluta = urlAbsoluta(bruto, base);
    if (absoluta && !resultado.imagens.includes(absoluta)) resultado.imagens.push(absoluta);
  }
  // Imagens visíveis na página (retrato, publicações). Só entram as que têm
  // tamanho de foto: ícone de app, logo e favicon ficam de fora.
  for (const imagem of [...documento.querySelectorAll('img')].slice(0, 40)) {
    const largura = Number(imagem.getAttribute('width')) || 0;
    const altura = Number(imagem.getAttribute('height')) || 0;
    if ((largura && largura < 120) || (altura && altura < 120)) continue;
    const fonte = imagem.getAttribute('src') || imagem.getAttribute('data-src') || (imagem.getAttribute('srcset') || '').split(',')[0]?.trim().split(' ')[0] || '';
    const absoluta = urlAbsoluta(fonte, base);
    if (!absoluta || /logo|icon|sprite|favicon|emoji|badge/i.test(absoluta)) continue;
    if (!resultado.imagens.includes(absoluta)) resultado.imagens.push(absoluta);
  }
  resultado.imagens = resultado.imagens.slice(0, 8);
  for (const script of documento.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const dados = JSON.parse(script.textContent || '{}');
      const objetos = objetosDoJsonLd(dados);
      const tipos = objetos.map(item => String(item['@type'] || ''));
      const pessoa = objetos.find(item => /Person|ProfilePage|Organization|LocalBusiness/.test(String(item['@type'] || '')));
      if (pessoa) {
        if (!resultado.nomeJsonLd) resultado.nomeJsonLd = texto(pessoa.name).trim();
        if (!resultado.descricaoJsonLd) resultado.descricaoJsonLd = texto(pessoa.description).trim();
        if (!resultado.localizacao) {
          const endereco = pessoa.address;
          resultado.localizacao = typeof endereco === 'string' ? endereco : (endereco && typeof endereco === 'object' ? texto((endereco as Record<string, unknown>).addressLocality) : '');
        }
        const site = pessoa.url || pessoa.sameAs;
        if (typeof site === 'string' && !resultado.site) resultado.site = site;
        for (const imagem of imagensDoJsonLd(pessoa.image, base)) if (!resultado.imagens.includes(imagem)) resultado.imagens.push(imagem);
        if (/Person/.test(tipos.join(' ')) && !resultado.usuario) {
          const redes = objectsString(pessoa.sameAs);
          const daRede = redes.map(link => /instagram\.com\/([^/?#]+)/i.exec(link)?.[1] || /tiktok\.com\/@([^/?#]+)/i.exec(link)?.[1] || /x\.com\/([^/?#]+)/i.exec(link)?.[1]).find(Boolean);
          if (daRede) resultado.usuario = soUsuario(daRede);
        }
      }
    } catch { /* JSON-LD inválido não impede a leitura do resto */ }
  }
  return resultado;
}

const objectsString = (valor: unknown): string[] => Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : typeof valor === 'string' ? [valor] : [];

/* ---------------------------------------------------------------- busca -- */

function mensagemDoErro(erro: unknown): string {
  const textoErro = erro instanceof Error ? erro.message : String(erro);
  if (/abort|tempo/i.test(textoErro)) return 'demorou demais para responder';
  if (/failed to fetch|networkerror|load failed|cors/i.test(textoErro)) return 'o site não liberou a leitura';
  return textoErro.slice(0, 90);
}

interface Coleta {
  nome: string;
  bio: string;
  localizacao: string;
  site: string;
  seguidores: number | null;
  verificado: boolean;
  avatar: string;
  fotos: string[];
  fonte: string;
}

const colheitaVazia = (): Coleta => ({ nome: '', bio: '', localizacao: '', site: '', seguidores: null, verificado: false, avatar: '', fotos: [], fonte: '' });

function juntar(coleta: Coleta, dados: Partial<Coleta>) {
  if (!coleta.nome && dados.nome) coleta.nome = dados.nome;
  if (!coleta.bio && dados.bio) coleta.bio = dados.bio;
  if (!coleta.localizacao && dados.localizacao) coleta.localizacao = dados.localizacao;
  if (!coleta.site && dados.site) coleta.site = dados.site;
  if (coleta.seguidores == null && dados.seguidores != null) coleta.seguidores = dados.seguidores;
  if (!coleta.verificado && dados.verificado) coleta.verificado = true;
  if (!coleta.avatar && dados.avatar) coleta.avatar = dados.avatar;
  for (const foto of dados.fotos || []) if (foto && !coleta.fotos.includes(foto)) coleta.fotos.push(foto);
  if (!coleta.fonte && dados.fonte) coleta.fonte = dados.fonte;
}

function dadosDosMetadados(meta: Metadados, base: string, rede: RedeSocial, usuario: string): Partial<Coleta> {
  const nome = meta.nomeJsonLd || limparNomeDoPerfil(meta.titulo, rede, usuario);
  const bio = limparBioDoPerfil(meta.descricaoJsonLd || meta.descricao || '');
  const imagens = meta.imagens.filter(Boolean);
  return {
    nome: limparEspacos(nome).slice(0, 100),
    bio,
    localizacao: limparEspacos(meta.localizacao || '').slice(0, 120),
    site: /^https?:\/\//i.test(meta.site) ? meta.site : '',
    seguidores: extrairSeguidores(`${meta.descricao} ${meta.titulo}`),
    verificado: meta.verificado,
    avatar: imagens[0] || '',
    fotos: imagens.slice(0, 8).map(imagem => urlAbsoluta(imagem, base)).filter(Boolean),
  };
}

function dadosDoMicrolink(json: unknown, base: string, rede: RedeSocial, usuario: string): Partial<Coleta> {
  const raiz = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const dados = (raiz.data && typeof raiz.data === 'object' ? raiz.data : raiz) as Record<string, unknown>;
  const titulo = texto(dados.title);
  const descricao = texto(dados.description);
  const imagem = dados.image && typeof dados.image === 'object' ? texto((dados.image as Record<string, unknown>).url) : texto(dados.image);
  const imagens = [urlAbsoluta(imagem, base)].filter(Boolean);
  return {
    nome: limparNomeDoPerfil(titulo, rede, usuario),
    bio: limparBioDoPerfil(descricao),
    localizacao: '',
    site: '',
    seguidores: extrairSeguidores(`${descricao} ${titulo}`),
    avatar: imagens[0] || '',
    fotos: imagens,
  };
}

/**
 * Busca o que é público no perfil. Devolve sempre um objeto: quem chama decide
 * o que aplicar. Lança erro só quando nenhuma fonte devolveu absolutamente
 * nada — aí a mensagem explica o que foi tentado.
 */
export async function buscarPerfilSocial(
  entrada: string,
  opcoes: { rede?: RedeSocial | 'auto'; fetcher?: Fetcher } = {},
): Promise<PerfilEncontrado> {
  const endereco = lerEndereco(entrada, opcoes.rede || 'auto');
  const fetcher: Fetcher = opcoes.fetcher || (typeof fetch === 'function' ? fetch : null as unknown as typeof fetch);
  if (!fetcher) throw new Error('Este navegador não consegue buscar perfis agora.');
  const coleta = colheitaVazia();
  const tentativas: string[] = [];
  const rede = endereco.rede;

  // 1. A própria rede, quando existe uma API pública sem chave.
  if (rede === 'github') {
    try {
      const base = `https://api.github.com/users/${encodeURIComponent(endereco.usuario)}`;
      const dados = await pedirJson(base, fetcher) as Record<string, unknown>;
      const conta = (dados && typeof dados === 'object' ? dados : {}) as Record<string, unknown>;
      if (texto(conta.message)) throw new Error(texto(conta.message));
      const avatar = urlAbsoluta(texto(conta.avatar_url), endereco.url);
      juntar(coleta, {
        nome: texto(conta.name) || texto(conta.login),
        bio: texto(conta.bio),
        localizacao: texto(conta.location),
        site: texto(conta.blog),
        seguidores: numero(conta.followers),
        avatar,
        fotos: avatar ? [avatar] : [],
        fonte: 'GitHub',
      });
    } catch (erro) {
      tentativas.push(`GitHub: ${mensagemDoErro(erro)}`);
    }
  } else if (rede === 'tiktok') {
    try {
      const dados = await pedirJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(endereco.url)}`, fetcher) as Record<string, unknown>;
      const capa = urlAbsoluta(texto(dados.thumbnail_url), endereco.url);
      const autor = texto(dados.author_url);
      juntar(coleta, {
        nome: texto(dados.author_name),
        bio: '',
        avatar: capa,
        fotos: capa ? [capa] : [],
        fonte: 'oEmbed do TikTok',
      });
      void autor;
    } catch (erro) {
      tentativas.push(`TikTok: ${mensagemDoErro(erro)}`);
    }
  } else if (rede === 'youtube') {
    try {
      const dados = await pedirJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(endereco.url)}&format=json`, fetcher) as Record<string, unknown>;
      const capa = urlAbsoluta(texto(dados.thumbnail_url), endereco.url);
      juntar(coleta, {
        nome: texto(dados.author_name),
        bio: '',
        avatar: capa,
        fotos: capa ? [capa] : [],
        fonte: 'oEmbed do YouTube',
      });
    } catch (erro) {
      tentativas.push(`YouTube: ${mensagemDoErro(erro)}`);
    }
  } else if (rede === 'x') {
    try {
      const dados = await pedirJson(`https://publish.twitter.com/oembed?url=${encodeURIComponent(endereco.url)}`, fetcher) as Record<string, unknown>;
      juntar(coleta, {
        nome: texto(dados.author_name),
        bio: '',
        fonte: 'oEmbed do X',
      });
    } catch (erro) {
      tentativas.push(`X: ${mensagemDoErro(erro)}`);
    }
  }

  // 2. Metadados públicos: o mesmo cartão que aparece ao compartilhar o link.
  if (!coleta.nome || !coleta.avatar) {
    for (const leitor of LEITORES) {
      try {
        if (leitor.tipo === 'json') {
          const json = await pedirJson(leitor.url(endereco.url), fetcher);
          juntar(coleta, { ...dadosDoMicrolink(json, endereco.url, rede, endereco.usuario), fonte: coleta.fonte || leitor.nome });
        } else {
          const html = await pedirTexto(leitor.url(endereco.url), fetcher);
          const meta = extrairMetadados(html, endereco.url);
          if (!meta.titulo && !meta.descricao && !meta.imagens.length) throw new Error('a página veio vazia');
          juntar(coleta, { ...dadosDosMetadados(meta, endereco.url, rede, endereco.usuario), fonte: coleta.fonte || leitor.nome });
        }
        if (coleta.nome && (coleta.avatar || coleta.bio || coleta.fotos.length)) break;
      } catch (erro) {
        tentativas.push(`${leitor.nome}: ${mensagemDoErro(erro)}`);
      }
      if (coleta.nome && (coleta.avatar || coleta.bio || coleta.fotos.length)) break;
    }
  }

  const fotos = [...new Set([coleta.avatar, ...coleta.fotos].filter(Boolean))].slice(0, 8);
  if (!coleta.nome && !coleta.bio && !fotos.length) {
    const detalhe = tentativas.length ? ` (${tentativas.join(' · ')})` : '';
    throw new Error(`Não consegui ler este perfil. Ele pode ser privado ou a rede pode ter bloqueado a leitura pública${detalhe}. Você ainda pode guardar o link e preencher à mão.`);
  }
  return {
    rede,
    url: endereco.url,
    usuario: endereco.usuario,
    nome: coleta.nome || endereco.usuario,
    bio: coleta.bio || '',
    localizacao: coleta.localizacao || '',
    site: coleta.site || '',
    seguidores: coleta.seguidores,
    verificado: coleta.verificado,
    avatar: fotos[0] || '',
    fotos,
    fonte: coleta.fonte || 'metadados públicos',
    tentativas,
    importadoEm: new Date().toISOString(),
  };
}

/**
 * Tenta trazer a imagem para dentro do aparelho (data URL), para a foto não
 * depender de link externo. Se o servidor não liberar CORS, devolve o próprio
 * endereço: a foto continua funcionando enquanto houver internet.
 */
export async function incorporarImagem(url: string, fetcher: Fetcher = fetch, limite = 3 * 1024 * 1024): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const resposta = await buscarUrl(url, fetcher, 12000);
    if (!resposta.ok) return url;
    const blob = await resposta.blob();
    if (!blob.type.startsWith('image/') || blob.size > limite) return url;
    return await new Promise<string>((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result));
      leitor.onerror = () => rejeitar(new Error('Falha ao ler a imagem.'));
      leitor.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

/** Transforma o resultado da busca no que fica guardado na ficha. */
export function perfilParaFicha(perfil: PerfilEncontrado, id: string, avatar = perfil.avatar): PerfilSocial {
  return {
    id,
    rede: perfil.rede,
    url: perfil.url,
    usuario: perfil.usuario,
    nome: perfil.nome || undefined,
    bio: perfil.bio || undefined,
    localizacao: perfil.localizacao || undefined,
    site: perfil.site || undefined,
    avatar: avatar || undefined,
    seguidores: perfil.seguidores,
    verificado: perfil.verificado,
    fonte: perfil.fonte,
    importadoEm: perfil.importadoEm,
  };
}
