import { Component, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, CloudOff, Eye, EyeOff, Gauge, Heart, Home as HomeIcon, Loader2, LockKeyhole, Menu, Moon, MoreHorizontal, Plus, Redo2, RotateCcw, ScanEye, Settings as SettingsIcon, Search, ShieldCheck, Sparkles, Sun, Undo2, Users, Zap } from 'lucide-react';
import { CatalogProvider, useCatalog } from './context';
import { formatDate } from './store';
import { Avatar, Button, IconButton, Toast } from './components/ui';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Home from './components/Home';
import Catalog from './components/Catalog';
import AddPerson from './components/AddPerson';
import QuickAddModal from './components/QuickAddModal';
import PersonDrawer from './components/PersonDrawer';
import Ranking from './components/Ranking';
import TierLists from './components/TierLists';
import Gallery from './components/Gallery';
import Stories from './components/Stories';
import Settings from './components/Settings';
import Reminders from './components/Reminders';
import Organize from './components/Organize';
import CommandPalette from './components/CommandPalette';
import CompareModal from './components/CompareModal';
import Guide from './components/Guide';
import Notes from './components/Notes';
import Folders from './components/Folders';
import InvestigationBoardPage from './components/InvestigationBoard';
import Dashboard from './components/Dashboard';
import MySpace from './components/MySpace';
import Agenda from './components/Agenda';
import Discover from './components/Discover';
import NotificationCenter from './components/NotificationCenter';
import QuickTools from './components/QuickTools';
import Toolbox from './components/Toolbox';
import Conversations from './components/Conversations';
import { AchievementToast, ConfettiBurst, LevelUpBadge, RouletteModal } from './components/Celebrations';
import { FolhaDeAcoes } from './components/Folha';
import type { AcaoDeFolha } from './components/Folha';
import OnboardingTour from './components/OnboardingTour';
import { playSound } from './lib/sound';
import { useBordaVoltar } from './lib/toque';

const PAGE_NAMES: Record<string, string> = {
  home: 'Visão geral', conversas: 'Conversas', dashboard: 'Painel', myspace: 'Meu espaço', agenda: 'Agenda', discover: 'Descobrir', catalog: 'Catálogo', toolbox: 'Ferramentas', add: 'Adicionar pessoa', ranking: 'Ranking', tierlists: 'Tierlists', gallery: 'Galeria', notes: 'Notas gerais', folders: 'Pastas', board: 'Quadro de investigação', stories: 'Stories / Fanfics', settings: 'Ajustes', reminders: 'Lembretes', tools: 'Organizar', taxonomy: 'Categorias e tags', collections: 'Coleções', drafts: 'Rascunhos', duplicates: 'Duplicatas', activity: 'Atividade', guide: 'Novidades',
};
const SHORTCUT_PAGES = ['home', 'catalog', 'ranking', 'tierlists', 'add', 'gallery', 'stories', 'settings'];
// Atalhos de letra: chegam rápido às telas novas sem mudar os atalhos antigos.
const LETTER_PAGES: Record<string, string> = { d: 'dashboard', a: 'agenda', m: 'myspace', x: 'discover', g: 'gallery', r: 'reminders', o: 'folders', t: 'toolbox', p: 'conversas' };
// Código Konami: ↑ ↑ ↓ ↓ ← → ← → B A liga (ou desliga) o tema disco.
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

function PrivacyScreen() {
  const ctx = useCatalog();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const unlock = () => {
    if (ctx.data.settings.pinEnabled && pin !== ctx.data.settings.pin) {
      setError('PIN incorreto. Tente novamente.');
      return;
    }
    ctx.setPrivacy(false);
    ctx.setPanic(false);
    setPin('');
  };
  return <div className="privacy-screen" role="dialog" aria-modal="true" aria-label="Modo privacidade">
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      <span className="privacy-lock"><LockKeyhole size={36} strokeWidth={1.4} /></span>
      <p className="eyebrow">Seu espaço continua só seu</p>
      <h1>Um momento de privacidade.</h1>
      <p>Seu catálogo está oculto.<br />Suas alterações continuam protegidas neste dispositivo.</p>
      <form onSubmit={e => { e.preventDefault(); unlock(); }}>
        {ctx.data.settings.pinEnabled && <input id="privacy-pin" type="password" inputMode="numeric" autoFocus maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Digite seu PIN" aria-label="PIN de privacidade" />}
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" variant="primary"><Eye size={17} />Voltar ao meu catálogo</Button>
      </form>
      <small>{ctx.data.settings.pinEnabled ? 'Use o PIN configurado em Ajustes.' : 'Atalho: Ctrl + Shift + P'}</small>
    </motion.div>
  </div>;
}

/**
 * O “mais” do celular.
 *
 * No computador o topo tem espaço para sete botões; no aparelho, sete botões de
 * 40px roubam o título da tela e ficam no limite do polegar. Aqui o topo guarda
 * só o essencial (voltar, avisos, perfil) e o resto sobe numa folha de ações —
 * do jeito que qualquer aplicativo faz.
 */
function TopbarMais({ onAbrirRapidas }: { onAbrirRapidas: () => void }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const [aberto, setAberto] = useState(false);
  const claro = data.settings.theme !== 'dark';
  const itens: AcaoDeFolha[] = [
    { rotulo: 'Central de ações rápidas', detalhe: 'filtros prontos, surpresa, roleta e mais', icone: Zap, onClick: onAbrirRapidas },
    { rotulo: ctx.blur ? 'Sair do modo disfarce' : 'Modo disfarce', detalhe: 'desfoca fotos e nomes', icone: ScanEye, onClick: () => ctx.setBlur(!ctx.blur) },
    { rotulo: 'Modo privacidade', detalhe: 'cobre a tela até você voltar', icone: EyeOff, onClick: () => ctx.setPrivacy(true) },
    { rotulo: claro ? 'Usar tema escuro' : 'Usar tema claro', icone: claro ? Moon : Sun, onClick: () => ctx.commit(d => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }), undefined, false) },
    { rotulo: 'Desfazer última alteração', icone: Undo2, desabilitada: !ctx.canUndo, onClick: ctx.undo },
    { rotulo: 'Refazer alteração', icone: Redo2, desabilitada: !ctx.canRedo, onClick: ctx.redo },
    {
      rotulo: ctx.demo ? 'Você está na demonstração' : ctx.status === 'saved' ? 'Tudo salvo neste aparelho' : ctx.status === 'error' ? 'Gravação falhou' : 'Salvando…',
      detalhe: ctx.demo ? 'As alterações não são gravadas' : `Última gravação: ${formatDate(ctx.lastSavedAt, true)}`,
      icone: ctx.demo ? CloudOff : ctx.status === 'saved' ? Check : Loader2,
      onClick: () => ctx.navigate('settings'),
    },
    { rotulo: 'Ajustes e perfil', icone: SettingsIcon, onClick: () => ctx.navigate('settings') },
  ];
  return <>
    <IconButton label="Mais ações" className="topbar-more" onClick={() => { ctx.buzz?.(6); setAberto(true); }}><MoreHorizontal size={20} /></IconButton>
    {aberto && <FolhaDeAcoes titulo="O que você precisa agora?" subtitulo={PAGE_NAMES[ctx.page] || 'Meu espaço'} aoFechar={() => setAberto(false)} itens={itens} />}
  </>;
}

function ActivePage() {
  const { page } = useCatalog();
  if (page === 'home') return <Home />;
  if (page === 'dashboard') return <Dashboard />;
  if (page === 'myspace') return <MySpace />;
  if (page === 'agenda') return <Agenda />;
  if (page === 'toolbox') return <Toolbox />;
  if (page === 'conversas') return <Conversations />;
  if (page === 'discover') return <Discover />;
  if (page === 'catalog') return <Catalog />;
  if (page === 'add') return <AddPerson />;
  if (page === 'ranking') return <Ranking />;
  if (page === 'tierlists') return <TierLists />;
  if (page === 'gallery') return <Gallery />;
  if (page === 'notes') return <Notes />;
  if (page === 'folders') return <Folders />;
  if (page === 'board') return <InvestigationBoardPage />;
  if (page === 'stories') return <Stories />;
  if (page === 'settings') return <Settings />;
  if (page === 'reminders') return <Reminders />;
  if (page === 'guide') return <Guide />;
  return <Organize />;
}

function Application() {
  const ctx = useCatalog();
  const { data, page, authenticated, ready } = ctx;
  const escTimes = useRef<number[]>([]);
  const konamiKeys = useRef<string[]>([]);
  // No celular não existe Esc: segurar o título da tela aciona o modo pânico.
  // Histórico de telas: no celular o topo ganha um botão de voltar que anda
  // para trás dentro do aplicativo, como num app de verdade.
  const [historico, setHistorico] = useState<string[]>([]);
  const ultimaPagina = useRef(page);
  useEffect(() => {
    if (ultimaPagina.current === page) return;
    const anterior = ultimaPagina.current;
    ultimaPagina.current = page;
    setHistorico(lista => (anterior === 'home' || anterior === page ? lista : [...lista, anterior]).slice(-12));
  }, [page]);
  const voltando = useRef(false);
  const [direcao, setDirecao] = useState<'frente' | 'tras'>('frente');
  const voltarPagina = () => setHistorico(lista => {
    const copia = [...lista];
    const destino = copia.pop();
    if (destino) { voltando.current = true; ctx.navigate(destino); }
    return copia;
  });
  /** O mesmo voltar do topo, acionado pelo dedo na borda da tela. */
  const voltarDaBorda = () => { ctx.buzz?.(10); voltarPagina(); };
  useEffect(() => { setDirecao(voltando.current ? 'tras' : 'frente'); voltando.current = false; }, [page]);

  // Tela de celular: o dedo que está na largura do aparelho faz o voltar valer.
  const [celula, setCelula] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const consulta = window.matchMedia('(max-width: 760px)');
    const atualizar = () => setCelula(!!consulta.matches);
    atualizar();
    consulta.addEventListener?.('change', atualizar);
    return () => consulta.removeEventListener?.('change', atualizar);
  }, []);

  // Rolei um pouco: o topo assume o título e a tela libera espaço para o conteúdo.
  useEffect(() => {
    let compacto = false;
    const aoRolar = () => {
      const proximo = (window.scrollY || 0) > 40;
      if (proximo === compacto) return;
      compacto = proximo;
      document.documentElement.classList.toggle('topo-compacto', compacto);
    };
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => { window.removeEventListener('scroll', aoRolar); document.documentElement.classList.remove('topo-compacto'); };
  }, []);

  // Deslizar da borda esquerda volta uma tela, como em qualquer aplicativo.
  const borda = useBordaVoltar({
    ativo: celula && historico.length > 0 && !ctx.privacy && !ctx.quickOpen && !ctx.commandOpen && !ctx.rouletteOpen,
    aoVoltar: voltarDaBorda,
  });

  const panicoTimer = useRef<number | null>(null);
  const panicoOrigem = useRef<{ x: number; y: number } | null>(null);
  const soltarPanico = () => {
    if (panicoTimer.current !== null) { window.clearTimeout(panicoTimer.current); panicoTimer.current = null; }
    panicoOrigem.current = null;
  };
  const segurarPanico = (evento: React.PointerEvent) => {
    if (data.settings.panicEnabled === false) return;
    soltarPanico();
    panicoOrigem.current = { x: evento.clientX, y: evento.clientY };
    panicoTimer.current = window.setTimeout(() => { panicoTimer.current = null; ctx.setPanic(true); }, 700);
  };
  const moverPanico = (evento: React.PointerEvent) => {
    const origem = panicoOrigem.current;
    if (!origem) return;
    if (Math.abs(evento.clientX - origem.x) + Math.abs(evento.clientY - origem.y) > 12) soltarPanico();
  };
  const [confetti, setConfetti] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickTools, setQuickTools] = useState(false);
  useEffect(() => { setMobileMenu(false); }, [page]);
  useEffect(() => {
    if (!ctx.celebration || data.settings.confetti === false || data.settings.reducedMotion) return;
    setConfetti(Date.now());
    const timer = setTimeout(() => setConfetti(0), 3400);
    return () => clearTimeout(timer);
  }, [ctx.celebration, data.settings.confetti, data.settings.reducedMotion]);
  useEffect(() => {
    document.documentElement.classList.toggle('disco-mode', !!data.progress.konami && authenticated && !ctx.privacy);
  }, [data.progress.konami, authenticated, ctx.privacy]);
  useEffect(() => {
    let autoTheme = false;
    if (data.settings.autoTheme && typeof window !== 'undefined' && window.matchMedia) {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      document.documentElement.classList.toggle('light', prefersLight);
      autoTheme = true;
    } else {
      document.documentElement.classList.toggle('light', data.settings.theme === 'light');
    }
    document.documentElement.classList.toggle('large-text', !!data.settings.largeText);
    document.documentElement.classList.toggle('reduce-motion', !!data.settings.reducedMotion);
    document.documentElement.classList.toggle('privacy-active', ctx.privacy && authenticated);
    if (data.settings.autoTheme && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      const handler = (e: MediaQueryListEvent) => document.documentElement.classList.toggle('light', e.matches);
      mql.addEventListener?.('change', handler);
      return () => mql.removeEventListener?.('change', handler);
    }
    void autoTheme;
  }, [data.settings.theme, data.settings.largeText, data.settings.reducedMotion, data.settings.autoTheme, ctx.privacy, authenticated]);
  useEffect(() => {
    document.documentElement.classList.toggle('blur-mode', ctx.blur && authenticated);
    document.documentElement.classList.toggle('density-compact', data.settings.density === 'compacto');
    document.documentElement.style.setProperty('--accent', data.settings.accent || '#c786ec');
    document.documentElement.style.setProperty('--accent-soft', `${data.settings.accent || '#c786ec'}22`);
  }, [ctx.blur, authenticated, data.settings.density, data.settings.accent]);
  useEffect(() => {
    if (!ctx.splash) return;
    const timer = setTimeout(ctx.dismissSplash, 4200);
    return () => clearTimeout(timer);
  }, [ctx.splash, ctx.dismissSplash]);
  useEffect(() => {
    if (!authenticated) return;
    const key = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const value = event.key.toLowerCase();
      // Modo pânico: três Esc seguidos escondem tudo na hora.
      if (event.key === 'Escape' && !mod && data.settings.panicEnabled !== false) {
        const now = Date.now();
        escTimes.current = [...escTimes.current.filter(time => now - time < 1200), now];
        if (escTimes.current.length >= 3) { escTimes.current = []; ctx.setPanic(true); }
      }
      if (mod && event.shiftKey && value === 'p') {
        event.preventDefault();
        if (ctx.privacy && data.settings.pinEnabled) document.getElementById('privacy-pin')?.focus();
        else ctx.setPrivacy(!ctx.privacy);
        return;
      }
      if (ctx.privacy) return;
      if (mod && value === 'k') { event.preventDefault(); ctx.setCommandOpen(!ctx.commandOpen); return; }
      const target = event.target as HTMLElement;
      const focado = document.activeElement as HTMLElement | null;
      const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        || (!!focado && ['INPUT', 'TEXTAREA', 'SELECT'].includes(focado.tagName))
        || target.isContentEditable || !!focado?.isContentEditable;
      // Quem está escrevendo (inclusive na conversa aberta fora de modal) não dispara atalhos.
      if (digitando || document.querySelector('[role="dialog"]')) return;
      if (!mod && !event.altKey) {
        konamiKeys.current = [...konamiKeys.current, value].slice(-KONAMI.length);
        // O "B" do código não pode ligar o disfarce no meio da sequência.
        if (konamiKeys.current.slice(-9).join(' ') === KONAMI.slice(0, 9).join(' ')) return;
        if (konamiKeys.current.join(' ') === KONAMI.join(' ')) {
          konamiKeys.current = [];
          const on = !data.progress.konami;
          ctx.commit(d => ({ ...d, progress: { ...d.progress, konami: on } }), on ? 'Modo disco ligado. Digite o código de novo para desligar.' : 'Modo disco desligado.', false);
          if (on) { playSound('disco'); setConfetti(Date.now()); setTimeout(() => setConfetti(0), 3400); }
          return;
        }
      }
      if (mod && value === 'z') { event.preventDefault(); if (event.shiftKey) ctx.redo(); else ctx.undo(); return; }
      if (event.altKey || mod) return;
      if (/^[1-8]$/.test(value)) ctx.navigate(SHORTCUT_PAGES[Number(value) - 1]);
      if (LETTER_PAGES[value]) { ctx.navigate(LETTER_PAGES[value]); return; }
      if (value === 'n') ctx.setQuickOpen(true);
      if (value === 'c') ctx.setCompareIds([]);
      if (value === 'b') { ctx.setBlur(!ctx.blur); return; }
      if (value === 'j') { ctx.setRouletteOpen(true); return; }
      if (value === 'q') { setQuickTools(true); return; }
      if (value === '?') ctx.navigate('guide');
      if (value === '/') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('main .search-field input');
        if (input) input.focus(); else ctx.setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [ctx, authenticated, data.settings.pinEnabled, data.progress.konami]);

  if (!ready) return <div className="loading-screen"><span className="brand-symbol"><Heart size={25} fill="currentColor" strokeWidth={0} /></span><h1>catalog.</h1><p><Loader2 className="spin" size={16} />Preparando seu espaço...</p></div>;
  if (!authenticated) return <><Login /><Toast /></>;
  const selected = data.people.find(p => p.id === ctx.selectedId && !p.deletedAt);
  return <MotionConfig reducedMotion={data.settings.reducedMotion ? 'always' : 'user'}>
    {ctx.splash && <div className="splash-screen" role="presentation" onClick={ctx.dismissSplash}>
      <img src={ctx.splash} alt="Uma foto do seu catálogo" />
      <div className="splash-copy"><span className="brand-symbol"><Heart size={20} fill="currentColor" strokeWidth={0} /></span><h2>Bem-vinda de volta ao seu catálogo.</h2><p>Toque em qualquer lugar para começar.</p></div>
    </div>}
    <div className={`app-shell private-layer ${ctx.blur ? 'blur-mode' : ''}`} aria-hidden={ctx.privacy || undefined} inert={ctx.privacy || undefined}>
      <Sidebar open={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className={`workspace ${borda.progresso > 0 ? "deslizando" : ""}`} {...borda.props}>
        {borda.progresso > 0 && <span className="borda-trilha" aria-hidden="true" style={{ transform: `scaleY(${Math.max(.25, borda.progresso)})` }} />}
        <header className="topbar">
          <div className="topbar-start">
            {historico.length > 0
              ? <IconButton label="Voltar para a tela anterior" className="mobile-back" onClick={voltarPagina}><ArrowLeft size={20} /></IconButton>
              : <IconButton label="Abrir menu" className="mobile-menu-trigger" aria-expanded={mobileMenu} aria-controls="mobile-navigation" onClick={() => setMobileMenu(true)}><Menu size={21} /></IconButton>}
            <span className="topbar-mobile-title" role="presentation"
              onPointerDown={segurarPanico} onPointerUp={soltarPanico} onPointerCancel={soltarPanico}
              onPointerLeave={soltarPanico} onPointerMove={moverPanico}
              title={data.settings.panicEnabled === false ? undefined : 'Segure para o modo pânico'}>{PAGE_NAMES[page] || 'Organizar'}</span>
            <span className="topbar-breadcrumb">Meu espaço<ChevronRight size={12} /><b>{PAGE_NAMES[page] || 'Organizar'}</b></span>
            <button className="global-search" onClick={() => ctx.setCommandOpen(true)}><Search size={16} /><span>Buscar pessoas, tags e muito mais...</span><kbd>Ctrl K</kbd></button>
          </div>
          <div className="topbar-actions">
            <IconButton label="Abrir ações rápidas (Q)" className="quick-tools-trigger desktop-so" onClick={() => setQuickTools(true)} data-tour="quick"><Zap size={17} /></IconButton>
            <TopbarMais onAbrirRapidas={() => setQuickTools(true)} />
            <div className={`save-status ${ctx.status === 'error' ? 'save-error' : ''}`} title={ctx.demo ? 'As alterações da demonstração não são gravadas.' : `Última gravação: ${formatDate(ctx.lastSavedAt, true)}`}>
              {ctx.demo ? <><CloudOff size={13} /><span>Demonstração</span></> : ctx.status === 'saved' ? <><span className="saved-dot" /><span>Tudo salvo</span></> : ctx.status === 'error' ? <button onClick={ctx.retrySave}><RotateCcw size={13} />Tentar salvar</button> : <><Loader2 size={13} className="spin" /><span>Salvando...</span></>}
            </div>
            <div className="history-buttons"><IconButton label="Desfazer última alteração (Ctrl+Z)" disabled={!ctx.canUndo} onClick={ctx.undo}><Undo2 size={16} /></IconButton><IconButton label="Refazer alteração (Ctrl+Shift+Z)" disabled={!ctx.canRedo} onClick={ctx.redo}><Redo2 size={16} /></IconButton></div>
            <NotificationCenter />
            <IconButton label={ctx.blur ? 'Desativar modo disfarce (B)' : 'Ativar modo disfarce (B)'} className="desktop-so" onClick={() => ctx.setBlur(!ctx.blur)}><ScanEye size={17} /></IconButton>
            <IconButton label="Ativar privacidade (Ctrl+Shift+P)" className="desktop-so" onClick={() => ctx.setPrivacy(true)}><EyeOff size={17} /></IconButton>
            <IconButton label={data.settings.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} className="desktop-so" onClick={() => ctx.commit(d => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }), undefined, false)}>{data.settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
            <button className="topbar-profile" aria-label="Editar meu perfil" onClick={() => ctx.navigate('settings')}><Avatar src={data.settings.avatar} name={data.settings.profileName} size={32} /></button>
          </div>
        </header>
        {ctx.demo && <div className="demo-banner"><span><ShieldCheck size={13} />Você está explorando fichas fictícias. Seus dados reais não são alterados.</span><button onClick={ctx.logout}>Sair da demonstração</button></div>}
        <main className="page-content"><motion.div key={page} className="page-fade" initial={direcao === 'tras' ? { opacity: 0, x: -14 } : { opacity: 0, y: 7 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.19 }}><ActivePage /></motion.div></main>
        <div className="workspace-footer">
          <span><LockKeyhole size={11} />Armazenado neste dispositivo</span>
          <span className="footer-level"><button onClick={() => ctx.navigate('dashboard')}><Gauge size={12} />Nível {ctx.level.level} · {ctx.xp.toLocaleString('pt-BR')} XP</button>{ctx.unread > 0 && <button className="footer-alert" onClick={() => ctx.setNotificationsOpen(true)}><Sparkles size={12} />{ctx.unread} {ctx.unread === 1 ? 'aviso' : 'avisos'}</button>}</span>
          <button onClick={() => ctx.navigate('guide')}>Atalhos e ajuda</button>
        </div>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        <button className={page === 'home' ? 'active' : ''} onClick={() => { ctx.buzz?.(6); ctx.navigate('home'); }}><HomeIcon size={20} /><span>Início</span></button>
        <button className={page === 'catalog' ? 'active' : ''} onClick={() => { ctx.buzz?.(6); ctx.navigate('catalog'); }}><Users size={20} /><span>Catálogo</span></button>
        <button className="mobile-add" onClick={() => ctx.setQuickOpen(true)} aria-label="Adicionar pessoa"><span><Plus size={24} /></span></button>
        <button onClick={() => ctx.setCommandOpen(true)}><Search size={20} /><span>Buscar</span></button>
        <button onClick={() => setMobileMenu(true)} aria-expanded={mobileMenu}><Menu size={20} /><span>Menu</span></button>
      </nav>
    </div>
    {quickTools && <QuickTools onClose={() => setQuickTools(false)} />}
    {selected && <PersonDrawer key={selected.id} person={selected} />}
    {ctx.quickOpen && <QuickAddModal />}
    {ctx.compareIds && <CompareModal />}
    {ctx.commandOpen && <CommandPalette />}
    {ctx.rouletteOpen && !ctx.privacy && <RouletteModal onClose={() => ctx.setRouletteOpen(false)} />}
    {!ctx.privacy && confetti > 0 && <ConfettiBurst seed={confetti} />}
    <AnimatePresence>{!ctx.privacy && ctx.celebration && (ctx.celebration.kind === 'nivel'
      ? <LevelUpBadge key={ctx.celebration.id} level={ctx.celebration.level || ctx.level.level} title={ctx.celebration.description} onClose={ctx.dismissCelebration} />
      : <AchievementToast key={ctx.celebration.id} title={ctx.celebration.title} description={ctx.celebration.description} onClose={ctx.dismissCelebration} />)}</AnimatePresence>
    {ctx.privacy && <PrivacyScreen />}
    {!ctx.privacy && <Toast />}
    {!ctx.privacy && <OnboardingTour />}
  </MotionConfig>;
}

class RenderBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Erro de interface do Catalog', error, info.componentStack); }
  render() {
    if (this.state.error) return <div className="loading-screen"><h1>Vamos tentar novamente.</h1><p>Não foi possível mostrar esta tela. Recarregue o aplicativo para recuperar o último estado salvo.</p><Button variant="primary" onClick={() => window.location.reload()}>Recarregar aplicativo</Button></div>;
    return this.props.children;
  }
}

export default function App() { return <CatalogProvider><RenderBoundary><Application /></RenderBoundary></CatalogProvider>; }