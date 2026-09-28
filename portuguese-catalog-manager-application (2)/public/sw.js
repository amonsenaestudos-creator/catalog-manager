/**
 * Service worker do Catalog: o aplicativo abre e funciona sem internet.
 *
 * O build inteiro é um `index.html` só, então guardar a casca já é guardar o
 * app. A regra é simples de propósito:
 *  - navegação: rede primeiro (para pegar versão nova), cache como rede de segurança;
 *  - resto do mesmo domínio: cache primeiro, atualizando em segundo plano.
 * Nada é guardado fora do domínio do Catalog, e nenhuma imagem pessoal passa
 * por aqui — elas vivem no IndexedDB, não em requisições.
 */
const CACHE = 'catalog-v2';
// O escopo é a pasta onde o aplicativo está publicado — a raiz do domínio ou
// uma subpasta (/catalog-manager/, por exemplo). Tudo é resolvido a partir
// dele, então o mesmo arquivo serve nos dois casos.
const escopo = self.registration.scope;
const naCasca = caminho => new URL(caminho, escopo).href;
const CASCA = [
  naCasca('./'),
  naCasca('index.html'),
  naCasca('manifest.webmanifest'),
  naCasca('favicon.svg'),
  naCasca('icons/icon-192.png'),
  naCasca('icons/icon-512.png'),
  naCasca('icons/icon-maskable-512.png'),
  naCasca('icons/apple-touch-icon.png'),
];
const PAGINA = naCasca('index.html');

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(chave => chave !== CACHE).map(chave => caches.delete(chave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then(resposta => {
          const copia = resposta.clone();
          caches.open(CACHE).then(cache => cache.put(PAGINA, copia));
          return resposta;
        })
        .catch(async () => (await caches.match(PAGINA)) || (await caches.match(naCasca('./'))) || Response.error()),
    );
    return;
  }

  evento.respondWith(
    caches.match(pedido).then(guardado => {
      const daRede = fetch(pedido)
        .then(resposta => {
          if (resposta && resposta.ok) caches.open(CACHE).then(cache => cache.put(pedido, resposta.clone()));
          return resposta;
        })
        .catch(() => guardado || Response.error());
      return guardado || daRede;
    }),
  );
});
