import '../index.css';
import './celular.css';

/**
 * Prancha do celular.
 *
 * Serve para olhar o aplicativo na largura de um aparelho de verdade (390px),
 * sem precisar de celular na mão: cada quadro é um <iframe> dessa mesma
 * página, então as regras de media query valem de verdade lá dentro. Não faz
 * parte do aplicativo — nada aqui é importado pelo main.tsx.
 *
 *   /celular.html              → prancha com todas as telas
 *   /celular.html?tela=conversa → uma tela só, no tamanho do aparelho
 */

const FOTO = {
  bianca: '/images/bianca.jpg',
  clara: '/images/clara.jpg',
  marina: '/images/marina.jpg',
  rafael: '/images/rafael.jpg',
  cena: '/images/archive-scene.jpg',
};

/** Ícones do Lucide, em linha, para a prévia não depender do React. */
const svg = (corpo: string, tamanho = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${corpo}</svg>`;

const ICONE: Record<string, string> = {
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  busca: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>', 24),
  sino: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  inicio: svg('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  pessoas: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>'),
  voltar: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  maisOpcoes: svg('<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>', 18),
  coracao: svg('<path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5.4 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 6.6z"/>', 13),
  brilho: svg('<path d="M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5l4.8-1.7z"/>', 13),
  dado: svg('<path d="M12 3v18M3 8h18M4 16h16"/>', 13),
  emoji: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  enviar: svg('<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', 18),
  descer: svg('<path d="M12 5v14M19 12l-7 7-7-7"/>', 15),
  estrela: svg('<path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/>', 15),
  pasta: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 20),
  camadas: svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 14 9 5 9-5"/>', 18),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>', 19),
  baixar: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', 19),
  filtros: svg('<path d="M4 7h16M7 12h10M10 17h4"/>', 16),
  mosaico: svg('<rect x="3" y="3" width="8" height="12" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><rect x="3" y="17" width="8" height="4" rx="2"/>', 16),
  quadra: svg('<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>', 16),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 16),
  check: svg('<path d="m5 12 5 5 9-10"/>', 19),
  lixeira: svg('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>', 17),
  menos: svg('<path d="M5 12h14"/>', 17),
  subir: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 17),
  cofre: svg('<rect x="4" y="10" width="16" height="10" rx="3"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/><circle cx="12" cy="15" r="1.4"/>', 18),
};

const avatar = (src: string, tamanho: number, nome: string) =>
  `<span class="avatar" style="width:${tamanho}px;height:${tamanho}px;font-size:${Math.max(14, Math.round(tamanho * 0.3))}px"><img src="${src}" alt="${nome}" draggable="false" /></span>`;

const topbar = (titulo: string) => `
  <header class="topbar">
    <div class="topbar-start">
      <button class="icon-btn mobile-menu-trigger" aria-label="Abrir menu">${ICONE.menu}</button>
      <strong class="topbar-mobile-title">${titulo}</strong>
    </div>
    <div class="topbar-actions">
      <button class="icon-btn" aria-label="Buscar">${ICONE.busca}</button>
      <button class="icon-btn" aria-label="Avisos">${ICONE.sino}</button>
      ${avatar(FOTO.marina, 32, 'Você')}
    </div>
  </header>`;

const dock = (ativo: string) => `
  <nav class="mobile-bottom-nav" aria-label="Navegação rápida">
    <button class="${ativo === 'inicio' ? 'active' : ''}">${ICONE.inicio}<span>Início</span></button>
    <button class="${ativo === 'catalogo' ? 'active' : ''}">${ICONE.pessoas}<span>Catálogo</span></button>
    <button class="mobile-add" aria-label="Adicionar pessoa"><span>${ICONE.mais}</span></button>
    <button>${ICONE.busca}<span>Buscar</span></button>
    <button>${ICONE.menu}<span>Menu</span></button>
  </nav>`;

const ficha = (foto: string, nome: string, local: string, nota: string, etiquetas: string[], concluido = 78) => `
  <article class="person-card">
    <button class="card-photo-button"><img class="person-photo" src="${foto}" alt="${nome}" /></button>
    <div class="card-photo-controls">
      <button class="favorite-photo-btn">${ICONE.coracao}</button>
    </div>
    <div class="person-card-content">
      <div class="card-name-row"><button><h3>${nome}</h3></button><span class="star-rating"><span class="rating-value">${nota}</span>${ICONE.estrela}</span></div>
      <p class="card-location">${local}</p>
      <div class="card-tags">${etiquetas.map(t => `<span class="tag" style="color:#cb9ae8;background:#cb9ae81f">${t}</span>`).join('')}</div>
      <div class="card-bottom">
        <span class="small-completion">${concluido}% da ficha<i style="width:${concluido}%"></i></span>
        <button class="icon-btn" aria-label="Mais">${ICONE.maisOpcoes}</button>
      </div>
    </div>
  </article>`;

/* ------------------------------------------------------------------ telas -- */

const inicio = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Início')}
    <main class="page-content">
      <section class="home-banner">
        <img src="${FOTO.cena}" alt="" />
        <span class="banner-shade"></span>
        <div class="banner-copy">
          <h2>O seu catálogo,\nno seu tempo.</h2>
          <p>Reveja quem você não visita há tempos e mantenha a memória do que importa.</p>
        </div>
        <div class="banner-controls">
          <div><button class="active"></button><button></button><button></button></div>
        </div>
      </section>

      <div class="stat-grid">
        <div class="stat-card">${ICONE.pessoas}<div><strong>128</strong><span>fichas guardadas</span></div></div>
        <div class="stat-card">${ICONE.camadas}<div><strong>42</strong><span>pastas e listas</span></div></div>
        <div class="stat-card">${ICONE.coracao}<div><strong>18</strong><span>favoritas</span></div></div>
        <div class="stat-card">${ICONE.pasta}<div><strong>7</strong><span>revisitas hoje</span></div></div>
      </div>

      <div class="section-heading"><h2>${ICONE.estrela}Quem está em alta</h2><button class="text-action">Ver ranking</button></div>
      <div class="home-rank-list">
        <button><span class="home-position position-1">1</span>${avatar(FOTO.bianca, 46, 'Bianca')}<span class="home-rank-name"><strong>Bianca Moura</strong><small>Salvador · Bahia</small></span><span class="home-rank-score"><strong>9,8</strong><small class="muted small">32 encontros</small></span></button>
        <button><span class="home-position position-2">2</span>${avatar(FOTO.clara, 46, 'Clara')}<span class="home-rank-name"><strong>Clara Nunes</strong><small>Camaçari · Bahia</small></span><span class="home-rank-score"><strong>9,4</strong><small class="muted small">21 encontros</small></span></button>
        <button><span class="home-position position-3">3</span>${avatar(FOTO.rafael, 46, 'Rafael')}<span class="home-rank-name"><strong>Rafael Sena</strong><small>Dias d’Ávila · Bahia</small></span><span class="home-rank-score"><strong>9,1</strong><small class="muted small">17 encontros</small></span></button>
      </div>

      <div class="section-heading"><h2>${ICONE.pasta}Fichas recentes</h2><button class="text-action">Ver catálogo</button></div>
      <div class="people-grid">
        ${ficha(FOTO.bianca, 'Bianca Moura', 'Salvador · Bahia', '9,8', ['amiga', 'igreja'])}
        ${ficha(FOTO.clara, 'Clara Nunes', 'Camaçari · Bahia', '9,4', ['família'], 62)}
      </div>
    </main>
    <footer class="workspace-footer"><span>Catalog · 128 fichas</span><span>Salvo agora</span></footer>
  </div></div>
  ${dock('inicio')}`;

const catalogo = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Catálogo')}
    <main class="page-content catalog-page">
      <header class="page-title">
        <div><h1>Catálogo</h1><p class="page-description">128 fichas guardadas neste perfil.</p></div>
        <div class="page-actions"><button class="btn btn-primary">${ICONE.mais}Nova ficha</button></div>
      </header>

      <div class="scope-tabs">
        <button class="active">Todas <span>128</span></button>
        <button>Favoritas <span>18</span></button>
        <button>Recentemente <span>9</span></button>
      </div>

      <div class="catalog-toolbar">
        <select><option>Mais recentes</option><option>Melhor avaliadas</option></select>
        <div class="view-switch"><button class="active">${ICONE.camadas}</button><button>${ICONE.pasta}</button></div>
      </div>

      <div class="catalog-results-line"><div><span>128 fichas</span></div><div><button class="select-toggle">Selecionar</button></div></div>

      <div class="people-grid">
        ${ficha(FOTO.bianca, 'Bianca Moura', 'Salvador · Bahia', '9,8', ['amiga'])}
        ${ficha(FOTO.clara, 'Clara Nunes', 'Camaçari · Bahia', '9,4', ['família'], 62)}
        ${ficha(FOTO.marina, 'Marina Alves', 'Salvador · Bahia', '9,0', ['trabalho'], 90)}
        ${ficha(FOTO.rafael, 'Rafael Sena', 'Dias d’Ávila · Bahia', '8,7', ['igreja'], 44)}
      </div>

      <div class="load-more"><button class="btn btn-secondary">Carregar mais</button></div>
    </main>
  </div></div>
  ${dock('catalogo')}`;

const cartaoConversa = (foto: string, nome: string, relacao: string, previa: string, hora: string, estagio: string, quimica: number, esperando = false) => `
  <article class="conversation-card${esperando ? ' esperando' : ''}">
    <button class="conversation-card-main">
      <span class="conversation-avatar">${avatar(foto, 46, nome)}<span class="chat-status-dot online"></span></span>
      <span class="conversation-card-text">
        <strong>${nome}</strong>
        <span class="conversation-relation"><em class="relation-chip">${relacao}</em>· no catálogo desde 2023</span>
        <span class="conversation-preview">${previa}</span>
        <span class="conversation-voice">“${estagio === 'Pegando intimidade' ? 'fala doce, ri com “kkk”' : 'fala séria, poucos emojis'}”</span>
      </span>
      <span class="conversation-meta">
        <time>${hora}</time>
        ${esperando ? '<span class="conversation-waiting">esperando você</span>' : ''}
        <span class="conversation-stage stage-confiante">${estagio}</span>
        <span class="conversation-meter"><i style="width:${quimica}%"></i></span>
      </span>
    </button>
    <div class="conversation-card-actions">
      <span class="conversation-heart">${ICONE.coracao}${quimica}%</span>
      <button class="btn btn-secondary">Continuar</button>
    </div>
  </article>`;

const conversas = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Conversas')}
    <main class="page-content">
      <header class="page-title">
        <div><h1>Conversas</h1><p class="page-description">Retome de onde parou com cada ficha do catálogo.</p></div>
      </header>

      <div class="conversation-summary">
        <span>${ICONE.coracao}<b>3</b> conversas ativas</span>
        <span class="adult-on">Clima adulto ligado</span>
      </div>

      <div class="conversation-tools">
        <label class="conversation-search">${ICONE.busca}<input placeholder="Buscar conversa" /></label>
        <select><option>Todas</option><option>Esperando você</option></select>
      </div>

      <div class="conversation-list-cards">
        ${cartaoConversa(FOTO.bianca, 'Bianca Moura', 'amiga', 'Então, você vai mesmo aparecer por aqui no domingo?', 'agora', 'Pegando intimidade', 12, true)}
        ${cartaoConversa(FOTO.clara, 'Clara Nunes', 'família', 'Mãe mandou lembrança, disse que você sumiu.', '2 h', 'Confiante', 63)}
        ${cartaoConversa(FOTO.rafael, 'Rafael Sena', 'vínculo', 'Cara, aquele jogo foi uma loucura kkk', 'ontem', 'Pegando intimidade', 27)}
      </div>
    </main>
  </div></div>
  ${dock('conversas')}`;

const conversa = () => `
  <div class="conversations-page open">
    <div class="chat-simulator">
      <div class="chat-header">
        <div class="chat-header-top">
          <button class="icon-btn" aria-label="Voltar">${ICONE.voltar}</button>
          <div class="chat-header-info">
            <span class="chat-avatar-wrap">${avatar(FOTO.bianca, 44, 'Bianca')}<span class="chat-status-dot online"></span></span>
            <div>
              <strong>Bianca Moura</strong>
              <small>online agora</small>
              <em class="chat-relation-line">amiga de longa data</em>
            </div>
          </div>
          <div class="chat-header-actions"><button class="icon-btn" aria-label="Mais opções">${ICONE.maisOpcoes}</button></div>
        </div>
        <div class="chat-meter">
          <span class="chat-meter-label">${ICONE.coracao}Química <b>38%</b> · Pegando intimidade</span>
          <span class="chat-meter-track"><i style="width:38%"></i></span>
        </div>
        <div class="chat-status-row">
          <span class="chat-status-line"><span class="chat-status-label">Humor</span><b>tranquila</b></span>
          <button class="chat-auto-toggle">${ICONE.dado}Deixar puxar</button>
        </div>
      </div>

      <div class="chat-aviso">${ICONE.brilho}<span>Ela está mais solta hoje: reparou no seu dia.</span></div>

      <div class="chat-messages">
        <div class="chat-day-divider"><span>hoje</span></div>
        <div class="chat-bubble-wrap"><span class="chat-avatar-slot">${avatar(FOTO.bianca, 28, 'Bianca')}</span><div class="chat-bubble them">oi! tudo bem por aí? kkk</div></div>
        <div class="chat-bubble-wrap mine"><div class="chat-bubble user">tudo bem sim! e vc?<span class="chat-hora">09:12 <span class="chat-tick lido">✓✓</span></span></div></div>
        <div class="chat-bubble-wrap"><span class="chat-avatar-slot">${avatar(FOTO.bianca, 28, 'Bianca')}</span><div class="chat-bubble them">por aqui tá corrido, mas tá bom<span class="chat-hora">09:13</span></div></div>
        <div class="chat-bubble-wrap fecha-grupo"><span class="chat-avatar-slot">${avatar(FOTO.bianca, 28, 'Bianca')}</span><div class="chat-bubble them">e você? apareceu por aqui outro dia, né? eu vi sua foto na igreja 😊</div></div>
        <div class="chat-bubble-wrap mine fecha-grupo"><div class="chat-bubble user">apareci sim, no domingo<span class="chat-hora">09:15 <span class="chat-tick lido">✓✓</span></span></div></div>
        <button class="chat-descer">${ICONE.descer}Ir para o fim</button>
      </div>

      <div class="chat-icebreakers">
        <p class="chat-icebreakers-title">${ICONE.brilho}Sugestões para agora<button class="chat-icebreakers-trocar">${ICONE.dado}Trocar</button></p>
        <button><span class="chat-sugestao-texto">Pergunta como foi o domingo dela.</span><small class="chat-sugestao-motivo tom-amizade">ela puxou o assunto</small></button>
        <button><span class="chat-sugestao-texto">Manda: “vim te ver, viu?”</span><small class="chat-sugestao-motivo tom-flerte">química em 38%</small></button>
      </div>

      <form class="chat-input-bar">
        <button class="icon-btn" aria-label="Sugestões">${ICONE.brilho}</button>
        <button class="icon-btn" aria-label="Emojis">${ICONE.emoji}</button>
        <input placeholder="Escreva uma mensagem" />
        <button class="btn btn-primary" aria-label="Enviar">${ICONE.enviar}</button>
      </form>
      <p class="chat-footnote">Conversa simulada com uma ficha do seu catálogo.</p>
    </div>
  </div>`;

/** Azulejo do mosaico: a altura vem da proporção, como no aplicativo. */
const azulejo = (foto: string, nome: string, span: number, extra = '') => `
  <div class="azulejo ${extra}" style="grid-row: span ${span}">
    <img src="${foto}" alt="${nome}" />
    ${extra.includes('selecionada') ? '<span class="azulejo-marca">✓</span>' : '<span class="azulejo-marca"></span>'}
    <button class="azulejo-coracao ${extra.includes('favorita') ? 'aceso' : ''}" aria-label="Favoritar">${ICONE.coracao}</button>
    <span class="azulejo-legenda">${nome}</span>
  </div>`;

const galeria = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Galeria')}
    <main class="page-content">
      <header class="page-title"><div><h1>Galeria</h1><p class="page-description">340 fotos · 38 favoritas · 26 dias guardados</p></div></header>
      <div class="scope-tabs"><button class="active">Fotos<span>340</span></button><button>Álbuns<span>4</span></button><button>Duplicadas<span>2</span></button></div>
      <div class="gallery-topo">
        <div class="gallery-barra">
          <div class="gallery-tipos"><button class="active">Todas</button><button>Normal</button><button>Biquíni</button><button>Sem nada</button></div>
          <div class="gallery-barra-fim">
            <span class="gallery-contagem">340 fotos</span>
            <button class="deusa-toggle">${ICONE.coracao}Favoritas</button>
            <button class="gallery-ajuste">${ICONE.filtros}Filtros<b>2</b></button>
            <div class="gallery-modos"><button class="active">${ICONE.mosaico}</button><button>${ICONE.quadra}</button><button>${ICONE.pasta}</button></div>
            <button class="gallery-topo-volta" aria-label="Voltar ao começo">${ICONE.subir}</button>
          </div>
        </div>
        <div class="gallery-chips-ativos"><button>${ICONE.x}Verão</button><button>${ICONE.x}Só favoritas</button><button class="limpar">Limpar tudo</button></div>
      </div>
      <p class="gallery-ajuda">Cada foto no seu tamanho, como no álbum de fotos do celular. <span>Segure uma foto para abrir as ações.</span></p>
      <div class="galeria-caixa"><div class="galeria-grade mosaico" style="--colunas:2;--linha:8px;--espaco:6px">
        ${azulejo(FOTO.bianca, 'Bianca Moura', 16, 'selecionada favorita')}
        ${azulejo(FOTO.clara, 'Clara Nunes', 13)}
        ${azulejo(FOTO.marina, 'Marina Alves', 10, 'favorita')}
        ${azulejo(FOTO.rafael, 'Rafael Sena', 13)}
        ${azulejo(FOTO.cena, 'Sem ficha', 16)}
        ${azulejo(FOTO.bianca, 'Bianca Moura', 13)}
      </div></div>
      <div class="gallery-fim"><button class="btn btn-secondary">Mostrar mais 96 de 244</button></div>
      <button class="gallery-fab">${ICONE.mais}Adicionar fotos</button>
      <div class="gallery-lote">
        <strong>2 escolhidas</strong>
        <div><button>${ICONE.pasta}Pasta</button><button>${ICONE.camadas}Álbum</button><button>${ICONE.coracao}Favoritar</button><button class="perigo">${ICONE.lixeira}Excluir</button><button>Concluir</button></div>
      </div>
    </main>
  </div></div>
  ${dock('catalogo')}`;

/* Cofre do meu espaço: o mesmo mosaico, o mesmo visor, atrás do PIN. */
const cofre = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Meu espaço')}
    <main class="page-content">
      <header class="page-title"><div><h1>Meu espaço</h1><p class="page-description">Um canto só seu: humor, metas, links e um cofre separado do catálogo.</p></div></header>
      <div class="scope-tabs"><button>Diário<span>12</span></button><button>Metas<span>3</span></button><button>Meus links<span>6</span></button><button class="active">${ICONE.cofre}Cofre<span>4</span></button></div>
      <div class="journal-toolbar"><p class="muted small">${ICONE.coracao} 4 fotos guardadas no cofre. Elas continuam fora da galeria comum.</p>
        <span><button class="btn btn-secondary">Trocar PIN</button><button class="btn btn-secondary">Fechar cofre</button></span></div>
      <div class="gallery-topo">
        <div class="gallery-barra"><div class="gallery-barra-fim">
          <span class="gallery-contagem">4 no cofre</span>
          <button class="gallery-ajuste ligado">${ICONE.check}Sair da seleção</button>
          <div class="gallery-modos"><button class="active">${ICONE.mosaico}</button><button>${ICONE.quadra}</button><button>${ICONE.pasta}</button></div>
        </div></div>
      </div>
      <div class="galeria-caixa"><div class="galeria-grade mosaico" style="--colunas:2;--linha:8px;--espaco:6px">
        ${azulejo(FOTO.marina, 'Marina Alves', 16, 'selecionada')}
        ${azulejo(FOTO.clara, 'Clara Nunes', 13, 'selecionada')}
        ${azulejo(FOTO.bianca, 'Bianca Moura', 12)}
        ${azulejo(FOTO.cena, 'Sem ficha', 15)}
      </div></div>
      <div class="gallery-lote">
        <strong>2 escolhidas</strong>
        <div><button>${ICONE.check}Tudo</button><button>${ICONE.cofre}Tirar do cofre</button><button>Concluir</button></div>
      </div>
    </main>
  </div></div>
  ${dock('catalogo')}`;

const visor = () => `
  <div class="visor">
    <div class="visor-fundo"></div>
    <header class="visor-topo">
      <button class="visor-botao" aria-label="Fechar">${ICONE.x}</button>
      <div class="visor-titulo"><strong>Bianca Moura</strong><small>Hoje · Verão</small></div>
      <div class="visor-topo-acoes">
        <button class="visor-botao ativa" aria-label="Escolhida no lote"><span class="visor-marca">✓</span></button>
        <button class="visor-botao favorita" aria-label="Favorita">${ICONE.coracao}</button>
        <button class="visor-botao" aria-label="Baixar">${ICONE.baixar}</button>
        <button class="visor-botao" aria-label="Mais ações"><span class="visor-tres-pontos">⋯</span></button>
      </div>
    </header>
    <div class="visor-cena"><img src="${FOTO.bianca}" alt="Foto de Bianca Moura" /></div>
    <footer class="visor-base">
      <div class="visor-controles">
        <div class="visor-zumbir"><button class="visor-botao">${ICONE.menos}</button><button class="visor-zoom-valor">100%</button><button class="visor-botao">${ICONE.mais}</button></div>
        <button class="visor-detalhes">${ICONE.info}Detalhes</button>
      </div>
      <div class="visor-faixa">
        ${[FOTO.bianca, FOTO.clara, FOTO.marina, FOTO.rafael, FOTO.cena, FOTO.bianca].map((f, i) => `<button class="visor-miniatura ${i === 0 ? 'ativa' : ''}"><img src="${f}" alt="" /></button>`).join('')}
      </div>
    </footer>
    <p class="visor-dica">Deslize para o lado · puxe para baixo para fechar</p>
  </div>`;

const acoes = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Galeria')}
    <main class="page-content">
      <div class="galeria-caixa"><div class="galeria-grade mosaico" style="--colunas:2;--linha:8px;--espaco:6px">
        ${azulejo(FOTO.bianca, 'Bianca Moura', 16, 'selecionada')}
        ${azulejo(FOTO.clara, 'Clara Nunes', 13)}
      </div></div>
    </main>
  </div></div>
  ${dock('catalogo')}
  <div class="folha-overlay montada">
    <div class="folha-veu"></div>
    <div class="folha folha-acoes" role="dialog" aria-modal="true">
      <div class="folha-puxador"><span></span></div>
      <div class="folha-acoes-cabeca"><strong>Bianca Moura</strong><span>Hoje · Normal</span></div>
      <button class="folha-acao principal">Abrir a foto</button>
      <div class="folha-acoes-lista">
        <button class="folha-acao">${ICONE.coracao}<span>Guardar nas favoritas</span></button>
        <button class="folha-acao">${ICONE.check}<span>Tirar do lote</span></button>
        <button class="folha-acao">${ICONE.baixar}<span>Baixar a imagem</span></button>
        <button class="folha-acao">${ICONE.pasta}<span>Vinculada a Bianca Moura<small>abrir os detalhes</small></span></button>
      </div>
      <div class="folha-acoes-lista perigo">
        <button class="folha-acao perigo">${ICONE.lixeira}<span>Excluir foto</span></button>
      </div>
    </div>
  </div>`;

const filtros = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Galeria')}
    <main class="page-content">
      <div class="galeria-caixa"><div class="galeria-grade mosaico" style="--colunas:2;--linha:8px;--espaco:6px">
        ${azulejo(FOTO.marina, 'Marina Alves', 16)}
        ${azulejo(FOTO.rafael, 'Rafael Sena', 13)}
      </div></div>
    </main>
  </div></div>
  <div class="folha-overlay montada">
    <div class="folha-veu"></div>
    <div class="folha folha-larga" role="dialog" aria-modal="true">
      <div class="folha-puxador"><span></span></div>
      <header class="folha-cabecalho"><div><h2>Filtrar a galeria</h2><p>Escolha o que aparece e em que ordem</p></div></header>
      <div class="folha-corpo">
        <label class="field"><span class="field-label">Buscar</span><span class="search-field">${ICONE.busca}<input placeholder="Nome do arquivo, anotação ou pessoa" /></span></label>
        <label class="field"><span class="field-label">Pessoa</span><select><option>Todas as pessoas</option></select></label>
        <label class="field"><span class="field-label">Pasta</span><select><option>Só as fotos sem pasta</option></select></label>
        <label class="field"><span class="field-label">Ordem</span><select><option>Mais novas primeiro</option></select></label>
        <label class="check-label"><input type="checkbox" checked /> Só as favoritas</label>
      </div>
      <footer class="folha-rodape"><button class="btn btn-secondary">Limpar</button><button class="btn btn-primary">Ver 128 fotos</button></footer>
    </div>
  </div>`;

const folha = () => `
  <div class="app-shell"><div class="workspace">
    ${topbar('Catálogo')}
    <main class="page-content">
      <header class="page-title"><div><h1>Catálogo</h1><p class="page-description">128 fichas guardadas neste perfil.</p></div></header>
      <div class="people-grid">
        ${ficha(FOTO.bianca, 'Bianca Moura', 'Salvador · Bahia', '9,8', ['amiga'])}
        ${ficha(FOTO.clara, 'Clara Nunes', 'Camaçari · Bahia', '9,4', ['família'], 62)}
      </div>
    </main>
    <div class="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-heading">
          <div><h2>Nova ficha rápida</h2><p>Só o essencial agora — o resto você completa depois.</p></div>
          <button class="icon-btn" aria-label="Fechar">${ICONE.maisOpcoes}</button>
        </div>
        <div class="modal-body">
          <div class="quick-photo">${avatar(FOTO.marina, 76, 'Marina')}<div><strong>Foto principal</strong><p class="muted small">JPG ou PNG até 8 MB.</p></div></div>
          <label class="field"><span class="field-label">Nome</span><input placeholder="Como você chama essa pessoa" value="Marina Alves" /></label>
          <div class="form-grid">
            <label class="field"><span class="field-label">Idade</span><input inputmode="numeric" value="29" /></label>
            <label class="field"><span class="field-label">Onde mora</span><input value="Salvador · BA" /></label>
          </div>
          <label class="field"><span class="field-label">Anotações</span><textarea rows="3" placeholder="O que você não quer esquecer"></textarea><span class="field-hint">Serve para lembrar do contexto antes de conversar.</span></label>
          <div class="field"><span class="field-label">Etiquetas</span>
            <div class="tag-picker"><button class="selected">amiga</button><button>igreja</button><button>trabalho</button></div>
          </div>
          <label class="check-label"><input type="checkbox" checked /> Mostrar na tela de início</label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary">Cancelar</button>
          <button class="btn btn-primary">Salvar ficha</button>
        </div>
      </div>
    </div>
    </main>
  </div></div>
  ${dock('catalogo')}`;

const TELAS: { id: string; nome: string; nota: string; html: () => string }[] = [
  { id: 'inicio', nome: 'Início', nota: 'painel, cartões e fichas', html: inicio },
  { id: 'catalogo', nome: 'Catálogo', nota: 'título, chips e grade', html: catalogo },
  { id: 'conversas', nome: 'Conversas', nota: 'lista de papos', html: conversas },
  { id: 'conversa', nome: 'Conversa aberta', nota: 'tela cheia com campo fixo', html: conversa },
  { id: 'galeria', nome: 'Galeria', nota: 'mosaico, lote e botão flutuante', html: galeria },
  { id: 'visor', nome: 'Visor de fotos', nota: 'tela inteira, pinça e deslizar', html: visor },
  { id: 'acoes', nome: 'Foto segurada', nota: 'folha de ações do dedo', html: acoes },
  { id: 'cofre', nome: 'Cofre', nota: 'mosaico e lote do meu espaço', html: cofre },
  { id: 'filtros', nome: 'Filtros', nota: 'folha larga com o que vale', html: filtros },
  { id: 'folha', nome: 'Nova ficha', nota: 'folha de baixo', html: () => folha() },
];

const tela = new URLSearchParams(location.search).get('tela');
const raiz = document.getElementById('previa')!;

if (tela) {
  const encontrada = TELAS.find(t => t.id === tela) || TELAS[0];
  document.title = `Celular · ${encontrada.nome}`;
  document.body.classList.add('quadro');
  // A galeria da prancha mostra o lote aberto: a doca sai da frente, como no app.
  if (encontrada.id === 'galeria' || encontrada.id === 'cofre') document.documentElement.classList.add('gallery-escolhendo');
  if (encontrada.id === 'galeria') document.documentElement.classList.add('topo-compacto');   // mostra o botão de voltar ao começo
  raiz.innerHTML = encontrada.html();
} else {
  document.body.classList.add('prancha');
  raiz.innerHTML = `
    <header class="prancha-topo">
      <p class="eyebrow">Catalog · prévia de layout</p>
      <h1>O aplicativo na mão</h1>
      <p>Cada quadro abaixo tem a largura de um aparelho de verdade (390 × 844) e roda o mesmo CSS do aplicativo — as regras de celular valem de fato. Role a página para ver as caixas todas; se quiser uma tela sozinha e maior, abra <strong>?tela=visor</strong> (ou inicio, catalogo, conversas, conversa, galeria, acoes, cofre, filtros, folha) no fim do endereço.</p>
      <div class="prancha-dicas">
        <span>${ICONE.pessoas} Doca flutuante com o “+” elevado</span>
        <span>${ICONE.mosaico} Mosaico com a proporção de cada foto</span>
        <span>${ICONE.info} Visor em tela inteira: deslize, pinça, puxe para baixo</span>
        <span>${ICONE.filtros} Filtro e ação viram folhas do pé da tela</span>
        <span>${ICONE.cofre} Cofre do meu espaço com o mesmo mosaico e o mesmo visor</span>
        <span>${ICONE.emoji} Conversa com sugestões que deslizam</span>
        <span>${ICONE.camadas} Segurar a foto abre o menu do dedo</span>
      </div>
      <a class="prancha-voltar" href="/">Voltar para o aplicativo</a>
    </header>
    <div class="prancha-grade">
      ${TELAS.map(t => `
        <figure class="prancha-celula">
          <figcaption class="prancha-nome">${t.nome}<small>${t.nota}</small></figcaption>
          <iframe class="prancha-tela" src="/celular.html?tela=${t.id}" title="${t.nome}" loading="lazy"></iframe>
        </figure>`).join('')}
    </div>`;
}
