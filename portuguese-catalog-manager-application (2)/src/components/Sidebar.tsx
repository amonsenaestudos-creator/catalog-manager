import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ArrowUpRight, Bell, BookOpen, CalendarDays, ChevronRight, ClipboardList, FileText, Folder, Gauge, Heart, Home, Image, Layers, LogOut, MessageCircle, Minus, PlusCircle, Plus, Settings2, Shapes, Sparkles, Trophy, UserCircle2, Users, Wrench, X } from 'lucide-react';
import { useCatalog } from '../context';
import { isActive } from '../store';
import { Avatar, IconButton } from './ui';

const MAIS_CHAVE = 'catalog_sidebar_mais';

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
  const [mais, setMais] = useState(() => { try { return localStorage.getItem(MAIS_CHAVE) === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem(MAIS_CHAVE, mais ? '1' : '0'); } catch { /* preferência é opcional */ } }, [mais]);

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

  // O essencial fica à vista; o resto entra no "+". Assim a barra não cresce a cada tela nova.
  const nav: ItemMenu[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'catalog', label: 'Catálogo', icon: Users, count: activeCount, tour: 'catalog' },
    { id: 'conversas', label: 'Conversas', icon: MessageCircle, count: conversasAbertas || undefined },
    { id: 'dashboard', label: 'Painel', icon: Gauge },
    { id: 'discover', label: 'Descobrir', icon: Sparkles, tour: 'discover' },
    { id: 'ranking', label: 'Ranking', icon: Trophy, extra: true },
    { id: 'tierlists', label: 'Tierlists', icon: Layers, extra: true },
  ];
  const library: ItemMenu[] = [
    { id: 'add', label: 'Adicionar pessoa', icon: PlusCircle },
    { id: 'gallery', label: 'Galeria', icon: Image },
    { id: 'folders', label: 'Pastas', icon: Folder },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, count: data.appointments.filter(item => item.status === 'agendado').length || undefined },
    { id: 'myspace', label: 'Meu espaço', icon: UserCircle2 },
    { id: 'toolbox', label: 'Ferramentas', icon: Wrench },
    { id: 'notes', label: 'Notas gerais', icon: FileText, extra: true },
    { id: 'board', label: 'Quadro', icon: ClipboardList, extra: true },
    { id: 'stories', label: 'Stories / Fanfics', icon: BookOpen, extra: true },
    { id: 'reminders', label: 'Lembretes', icon: Bell, count: pending || undefined, extra: true },
    { id: 'tools', label: 'Organizar', icon: Shapes, extra: true },
  ];
  const visiveis = (lista: ItemMenu[]) => mais ? lista : lista.filter(entrada => !entrada.extra);
  const escondidos = (lista: ItemMenu[]) => lista.filter(entrada => entrada.extra).length;
  const item = ({ id, label, icon: Icon, count, tour }: ItemMenu, ativo: boolean) =>
    <button key={id} className={`nav-item ${ativo ? 'active' : ''}`} onClick={() => go(id)} aria-current={ativo ? 'page' : undefined} data-tour={tour}>
      <Icon size={19} strokeWidth={1.7} /><span>{label}</span>{count !== undefined && <small>{count}</small>}{ativo && count === undefined && <i />}
    </button>;
  const navAtivo = (id: string) => page === id;
  const libAtivo = (id: string) => page === id || (id === 'tools' && ['taxonomy', 'collections', 'drafts', 'duplicates', 'activity'].includes(page));
  const expandir = (lista: ItemMenu[]) => !mais && escondidos(lista) > 0
    ? <button className="nav-expand" onClick={() => setMais(true)} aria-label={`Mostrar mais ${escondidos(lista)} itens`}><Plus size={15} /><span>Mais {escondidos(lista)}</span></button>
    : mais ? <button className="nav-expand" onClick={() => setMais(false)} aria-label="Mostrar menos itens"><Minus size={15} /><span>Mostrar menos</span></button> : null;

  return <><button className={`sidebar-scrim ${open ? 'open' : ''}`} aria-label="Fechar menu" onClick={onClose} tabIndex={open ? 0 : -1} />
    <aside id="mobile-navigation" className={`sidebar ${open ? 'mobile-open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-brand-row"><button className="brand" onClick={() => go('home')} aria-label="Catalog, ir para início"><span className="brand-symbol"><Heart size={23} fill="currentColor" strokeWidth={0} /></span><span>catalog<span className="brand-dot">.</span><small>seu universo pessoal</small></span></button><IconButton label="Fechar menu" className="sidebar-close" onClick={onClose}><X size={20} /></IconButton></div>
      <nav aria-label="Menu principal"><p className="nav-label">Seu espaço</p>{visiveis(nav).map(entrada => item(entrada, navAtivo(entrada.id)))}{expandir(nav)}
        <p className="nav-label library-label">Sua biblioteca</p>{visiveis(library).map(entrada => item(entrada, libAtivo(entrada.id)))}{expandir(library)}
      </nav>
      <div className="sidebar-bottom"><button className="new-features-link" onClick={() => go('guide')}><Sparkles size={17} /><span>Novidades do Catalog<small>Tudo o que mudou</small></span><ArrowUpRight size={14} /></button><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}><Settings2 size={19} strokeWidth={1.7} /><span>Ajustes</span><ChevronRight size={14} /></button><div className="sidebar-profile"><button onClick={() => go('settings')}><Avatar src={data.settings.avatar} name={data.settings.profileName} size={38} /><span><strong>{data.settings.profileName}</strong><small>{ctx.demo ? 'Modo demonstração' : 'Perfil local'}</small></span></button><IconButton label={ctx.demo ? 'Sair da demonstração' : 'Sair da conta'} onClick={ctx.logout}><LogOut size={16} /></IconButton></div></div>
    </aside></>;
}
