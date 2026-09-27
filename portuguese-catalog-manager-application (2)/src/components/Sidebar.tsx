import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ArrowUpRight, Bell, BookOpen, CalendarDays, ChevronRight, ClipboardList, FileText, Folder, Footprints, Gamepad2, Gauge, Heart, HeartPulse, Home, Image, Layers, LogOut, MessageCircle, Minus, Package, PlusCircle, Plus, Settings2, Shapes, Sparkles, Trophy, UserCircle2, Users, Wrench, X } from 'lucide-react';
import { useCatalog } from '../context';
import { isActive } from '../store';
import { Avatar, IconButton } from './ui';

const MAIS_CHAVE = 'catalog_sidebar_mais';
const MAIS_ESPACO_CHAVE = 'catalog_sidebar_mais_espaco';
const MAIS_PROGRESSO_CHAVE = 'catalog_sidebar_mais_progresso';
const MAIS_BIBLIOTECA_CHAVE = 'catalog_sidebar_mais_biblioteca';

function lerExpansaoSidebar(chave: string) {
  try {
    const salvo = localStorage.getItem(chave);
    // O valor antigo expandia os dois grupos ao mesmo tempo. Ele continua
    // válido somente enquanto o grupo ainda não tem uma preferência própria.
    return salvo === null ? localStorage.getItem(MAIS_CHAVE) === '1' : salvo === '1';
  } catch {
    return false;
  }
}

interface ItemMenu { id: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; count?: number; tour?: string; extra?: boolean }

/**
 * Menu lateral enxuto: cada grupo mostra só o essencial e um botão “+”
 * revela o resto. Assim a barra não cresce a cada tela nova do aplicativo.
 */
export default function Sidebar({ open = false, onClose = () => undefined }: { open?: boolean; onClose?: () => void }) {
  const ctx = useCatalog(), { data, page } = ctx;
  const go = (id: string) => { ctx.navigate(id); onClose(); };
  const activeCount = data.people.filter(isActive).length;
  const pending = data.reminders.filter(r => !r.concluido).length;
  const conversasAbertas = new Set(data.chats.map(mensagem => mensagem.personId)).size;
  const [maisEspaco, setMaisEspaco] = useState(() => lerExpansaoSidebar(MAIS_ESPACO_CHAVE));
  const [maisProgresso, setMaisProgresso] = useState(() => lerExpansaoSidebar(MAIS_PROGRESSO_CHAVE));
  const [maisBiblioteca, setMaisBiblioteca] = useState(() => lerExpansaoSidebar(MAIS_BIBLIOTECA_CHAVE));
  useEffect(() => { try { localStorage.setItem(MAIS_ESPACO_CHAVE, maisEspaco ? '1' : '0'); } catch { /* preferência é opcional */ } }, [maisEspaco]);
  useEffect(() => { try { localStorage.setItem(MAIS_PROGRESSO_CHAVE, maisProgresso ? '1' : '0'); } catch { /* preferência é opcional */ } }, [maisProgresso]);
  useEffect(() => { try { localStorage.setItem(MAIS_BIBLIOTECA_CHAVE, maisBiblioteca ? '1' : '0'); } catch { /* preferência é opcional */ } }, [maisBiblioteca]);

  // No celular a gaveta precisa se comportar como uma tela: o fundo não rola
  // e o botão de voltar do aparelho fecha o menu em vez de sair do aplicativo.
  const fechar = useRef(onClose);
  fechar.current = onClose;
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('menu-aberto');
    let empilhou = false;
    try { window.history.pushState({ menuAberto: true }, ''); empilhou = true; } catch { /* histórico é opcional */ }
    const aoVoltar = () => fechar.current();
    if (empilhou) window.addEventListener('popstate', aoVoltar);
    return () => {
      window.removeEventListener('popstate', aoVoltar);
      document.documentElement.classList.remove('menu-aberto');
      if (empilhou && window.history.state && (window.history.state as { menuAberto?: boolean }).menuAberto) {
        try { window.history.back(); } catch { /* sem histórico para voltar */ }
      }
    };
  }, [open]);

  // A navegação prioriza poucos mundos; ferramentas e telas de apoio entram
  // progressivamente, sem tirar do caminho o conteúdo principal.
  const space: ItemMenu[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'catalog', label: 'Catálogo', icon: Users, count: activeCount, tour: 'catalog' },
    { id: 'favoritos', label: 'Favoritos', icon: Heart },
    { id: 'conversas', label: 'Conversas', icon: MessageCircle, count: conversasAbertas || undefined },
    { id: 'rua', label: 'Modo rua', icon: Footprints, extra: true },
  ];
  const discovery: ItemMenu[] = [
    { id: 'discover', label: 'Descobrir', icon: Sparkles, tour: 'discover' },
    { id: 'moments', label: 'Momentos', icon: Sparkles },
    { id: 'games', label: 'Desafios', icon: Gamepad2 },
  ];
  const progress: ItemMenu[] = [
    { id: 'dashboard', label: 'Painel', icon: Gauge },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'tierlists', label: 'Tierlists', icon: Layers },
  ];
  const library: ItemMenu[] = [
    { id: 'add', label: 'Adicionar pessoa', icon: PlusCircle },
    { id: 'gallery', label: 'Galeria', icon: Image },
    { id: 'folders', label: 'Pastas', icon: Folder },
    { id: 'pacotes', label: 'Pacotes', icon: Package, extra: true },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, count: data.appointments.filter(item => item.status === 'agendado').length || undefined },
    { id: 'myspace', label: 'Meu espaço', icon: UserCircle2 },
    { id: 'toolbox', label: 'Ferramentas', icon: Wrench },
    { id: 'notes', label: 'Notas gerais', icon: FileText, extra: true },
    { id: 'board', label: 'Quadro', icon: ClipboardList, extra: true },
    { id: 'stories', label: 'Stories / Fanfics', icon: BookOpen, extra: true },
    { id: 'reminders', label: 'Lembretes', icon: Bell, count: pending || undefined, extra: true },
    { id: 'saude', label: 'Saúde do catálogo', icon: HeartPulse, extra: true },
    { id: 'tools', label: 'Organizar', icon: Shapes, extra: true },
  ];
  const visiveis = (lista: ItemMenu[], expandida: boolean) => expandida ? lista : lista.filter(entrada => !entrada.extra);
  const escondidos = (lista: ItemMenu[]) => lista.filter(entrada => entrada.extra).length;
  const item = ({ id, label, icon: Icon, count, tour }: ItemMenu, ativo: boolean) =>
    <button key={id} className={`nav-item ${ativo ? 'active' : ''}`} onClick={() => go(id)} aria-current={ativo ? 'page' : undefined} data-tour={tour}>
      <Icon size={19} strokeWidth={1.7} /><span>{label}</span>{count !== undefined && <small>{count}</small>}{ativo && count === undefined && <i />}
    </button>;
  const navAtivo = (id: string) => page === id;
  const libAtivo = (id: string) => page === id || (id === 'tools' && ['taxonomy', 'collections', 'drafts', 'duplicates', 'activity'].includes(page));
  const expandir = (lista: ItemMenu[], expandida: boolean, setExpandida: (value: boolean) => void) => !expandida && escondidos(lista) > 0
    ? <button className="nav-expand" onClick={() => setExpandida(true)} aria-label={`Mostrar mais ${escondidos(lista)} itens`}><Plus size={15} /><span>Mais {escondidos(lista)}</span></button>
    : expandida ? <button className="nav-expand" onClick={() => setExpandida(false)} aria-label="Mostrar menos itens"><Minus size={15} /><span>Mostrar menos</span></button> : null;

  return <><button className={`sidebar-scrim ${open ? 'open' : ''}`} aria-label="Fechar menu" onClick={onClose} tabIndex={open ? 0 : -1} />
    <aside id="mobile-navigation" className={`sidebar ${open ? 'mobile-open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-brand-row"><button className="brand" onClick={() => go('home')} aria-label="Catalog, ir para início"><span className="brand-symbol"><Heart size={23} fill="currentColor" strokeWidth={0} /></span><span>catalog<span className="brand-dot">.</span><small>seu universo pessoal</small></span></button><IconButton label="Fechar menu" className="sidebar-close" onClick={onClose}><X size={20} /></IconButton></div>
      <nav aria-label="Menu principal">
        <section className="sidebar-nav-group world-space" aria-labelledby="nav-space-label">
          <p className="nav-label" id="nav-space-label">Seu espaço</p>
          {visiveis(space, maisEspaco).map(entrada => item(entrada, navAtivo(entrada.id)))}
          {expandir(space, maisEspaco, setMaisEspaco)}
        </section>
        <section className="sidebar-nav-group world-discovery" aria-labelledby="nav-discovery-label">
          <p className="nav-label" id="nav-discovery-label">Explorar</p>
          {discovery.map(entrada => item(entrada, navAtivo(entrada.id)))}
        </section>
        <section className="sidebar-nav-group world-progress" aria-labelledby="nav-progress-label">
          <p className="nav-label" id="nav-progress-label">Progresso</p>
          {visiveis(progress, maisProgresso).map(entrada => item(entrada, navAtivo(entrada.id)))}
          {expandir(progress, maisProgresso, setMaisProgresso)}
        </section>
        <section className="sidebar-nav-group world-library" aria-labelledby="nav-library-label">
          <p className="nav-label library-label" id="nav-library-label">Biblioteca</p>
          {visiveis(library, maisBiblioteca).map(entrada => item(entrada, libAtivo(entrada.id)))}
          {expandir(library, maisBiblioteca, setMaisBiblioteca)}
        </section>
      </nav>
      <div className="sidebar-bottom"><button className="new-features-link" onClick={() => go('guide')}><Sparkles size={17} /><span>Novidades do Catalog<small>Tudo o que mudou</small></span><ArrowUpRight size={14} /></button><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}><Settings2 size={19} strokeWidth={1.7} /><span>Ajustes</span><ChevronRight size={14} /></button><div className="sidebar-profile"><button onClick={() => go('settings')}><Avatar src={data.settings.avatar} name={data.settings.profileName} size={38} /><span><strong>{data.settings.profileName}</strong><small>{ctx.demo ? 'Modo demonstração' : 'Perfil local'}</small></span></button><IconButton label={ctx.demo ? 'Sair da demonstração' : 'Sair da conta'} onClick={ctx.logout}><LogOut size={16} /></IconButton></div></div>
    </aside></>;
}
