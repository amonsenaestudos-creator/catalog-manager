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
const CACHE = 'catalog-v1';
const CASCA = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

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
          caches.open(CACHE).then(cache => cache.put('/index.html', copia));
          return resposta;
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()),
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
