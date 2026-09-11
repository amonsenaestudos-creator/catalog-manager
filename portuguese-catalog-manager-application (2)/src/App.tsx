import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ChevronRight, CloudOff, Eye, EyeOff, Heart, Loader2, LockKeyhole, Moon, Redo2, RotateCcw, Search, ShieldCheck, Sun, Undo2 } from 'lucide-react';
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

const PAGE_NAMES: Record<string, string> = {
  home: 'Visão geral', catalog: 'Catálogo', add: 'Adicionar pessoa', ranking: 'Ranking', tierlists: 'Tierlists', gallery: 'Galeria', notes: 'Notas gerais', folders: 'Pastas', board: 'Quadro de investigação', stories: 'Stories / Fanfics', settings: 'Ajustes', reminders: 'Lembretes', tools: 'Organizar', taxonomy: 'Categorias e tags', collections: 'Coleções', drafts: 'Rascunhos', duplicates: 'Duplicatas', activity: 'Atividade', guide: 'Novidades',
};
const SHORTCUT_PAGES = ['home', 'catalog', 'ranking', 'tierlists', 'add', 'gallery', 'stories', 'settings'];

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

function ActivePage() {
  const { page } = useCatalog();
  if (page === 'home') return <Home />;
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
  useEffect(() => {
    document.documentElement.classList.toggle('light', data.settings.theme === 'light');
    document.documentElement.classList.toggle('large-text', !!data.settings.largeText);
    document.documentElement.classList.toggle('reduce-motion', !!data.settings.reducedMotion);
    document.documentElement.classList.toggle('privacy-active', ctx.privacy && authenticated);
  }, [data.settings.theme, data.settings.largeText, data.settings.reducedMotion, ctx.privacy, authenticated]);
  useEffect(() => {
    if (!authenticated) return;
    const key = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const value = event.key.toLowerCase();
      if (mod && event.shiftKey && value === 'p') {
        event.preventDefault();
        if (ctx.privacy && data.settings.pinEnabled) document.getElementById('privacy-pin')?.focus();
        else ctx.setPrivacy(!ctx.privacy);
        return;
      }
      if (ctx.privacy) return;
      if (mod && value === 'k') { event.preventDefault(); ctx.setCommandOpen(!ctx.commandOpen); return; }
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable || document.querySelector('[role="dialog"]')) return;
      if (mod && value === 'z') { event.preventDefault(); if (event.shiftKey) ctx.redo(); else ctx.undo(); return; }
      if (event.altKey || mod) return;
      if (/^[1-8]$/.test(value)) ctx.navigate(SHORTCUT_PAGES[Number(value) - 1]);
      if (value === 'n') ctx.setQuickOpen(true);
      if (value === 'c') ctx.setCompareIds([]);
      if (value === '?') ctx.navigate('guide');
      if (value === '/') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('main .search-field input');
        if (input) input.focus(); else ctx.setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [ctx, authenticated, data.settings.pinEnabled]);

  if (!ready) return <div className="loading-screen"><span className="brand-symbol"><Heart size={25} fill="currentColor" strokeWidth={0} /></span><h1>catalog.</h1><p><Loader2 className="spin" size={16} />Preparando seu espaço...</p></div>;
  if (!authenticated) return <><Login /><Toast /></>;
  const selected = data.people.find(p => p.id === ctx.selectedId && !p.deletedAt);
  return <MotionConfig reducedMotion={data.settings.reducedMotion ? 'always' : 'user'}>
    <div className="app-shell private-layer" aria-hidden={ctx.privacy || undefined} inert={ctx.privacy || undefined}>
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <span className="topbar-breadcrumb">Meu espaço<ChevronRight size={12} /><b>{PAGE_NAMES[page] || 'Organizar'}</b></span>
            <button className="global-search" onClick={() => ctx.setCommandOpen(true)}><Search size={16} /><span>Buscar pessoas, tags e muito mais...</span><kbd>Ctrl K</kbd></button>
          </div>
          <div className="topbar-actions">
            <div className={`save-status ${ctx.status === 'error' ? 'save-error' : ''}`} title={ctx.demo ? 'As alterações da demonstração não são gravadas.' : `Última gravação: ${formatDate(ctx.lastSavedAt, true)}`}>
              {ctx.demo ? <><CloudOff size={13} /><span>Demonstração</span></> : ctx.status === 'saved' ? <><span className="saved-dot" /><span>Tudo salvo</span></> : ctx.status === 'error' ? <button onClick={ctx.retrySave}><RotateCcw size={13} />Tentar salvar</button> : <><Loader2 size={13} className="spin" /><span>Salvando...</span></>}
            </div>
            <div className="history-buttons"><IconButton label="Desfazer última alteração (Ctrl+Z)" disabled={!ctx.canUndo} onClick={ctx.undo}><Undo2 size={16} /></IconButton><IconButton label="Refazer alteração (Ctrl+Shift+Z)" disabled={!ctx.canRedo} onClick={ctx.redo}><Redo2 size={16} /></IconButton></div>
            <IconButton label="Ativar privacidade (Ctrl+Shift+P)" onClick={() => ctx.setPrivacy(true)}><EyeOff size={17} /></IconButton>
            <IconButton label={data.settings.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} onClick={() => ctx.commit(d => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }), undefined, false)}>{data.settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
            <button className="topbar-profile" aria-label="Editar meu perfil" onClick={() => ctx.navigate('settings')}><Avatar src={data.settings.avatar} name={data.settings.profileName} size={32} /></button>
          </div>
        </header>
        {ctx.demo && <div className="demo-banner"><span><ShieldCheck size={13} />Você está explorando fichas fictícias. Seus dados reais não são alterados.</span><button onClick={ctx.logout}>Sair da demonstração</button></div>}
        <main className="page-content"><AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.19 }}><ActivePage /></motion.div></AnimatePresence></main>
        <div className="workspace-footer"><span><LockKeyhole size={11} />Armazenado neste dispositivo</span><button onClick={() => ctx.navigate('guide')}>Atalhos e ajuda</button></div>
      </div>
    </div>
    {selected && <PersonDrawer key={selected.id} person={selected} />}
    {ctx.quickOpen && <QuickAddModal />}
    {ctx.compareIds && <CompareModal />}
    {ctx.commandOpen && <CommandPalette />}
    {ctx.privacy && <PrivacyScreen />}
    {!ctx.privacy && <Toast />}
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