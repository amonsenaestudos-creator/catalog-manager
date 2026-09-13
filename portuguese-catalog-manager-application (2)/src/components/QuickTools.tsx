import type { LucideIcon } from 'lucide-react';
import { Archive, Bell, CalendarClock, CheckCircle2, Clipboard, Columns3, Download, EyeOff, FileWarning, FolderOpen, GalleryHorizontal, Gauge, Heart, ImageOff, Maximize2, Moon, Plus, RefreshCw, ScanEye, Search, Share2, Shuffle, SlidersHorizontal, Sparkles, Star, Sun, Trophy, Users } from 'lucide-react';
import { useCatalog } from '../context';
import { DEFAULT_FILTER, exportCsv, isActive } from '../store';
import { Modal } from './ui';

type Tool = { title: string; description: string; icon: LucideIcon; run: () => void; accent?: boolean };

export default function QuickTools({ onClose }: { onClose: () => void }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const people = data.people.filter(isActive);
  const today = new Date().toISOString().slice(0, 10);
  const closeRun = (run: () => void) => () => { onClose(); run(); };
  const catalog = (patch = {}) => closeRun(() => { ctx.setFilter({ ...DEFAULT_FILTER, ...patch }); ctx.navigate('catalog'); });
  const summary = `Catalog de ${data.settings.profileName}: ${people.length} pessoas, ${people.filter(p => p.favorite).length} favoritas, ${people.reduce((sum, p) => sum + p.fotos.length, 0) + data.orphanPhotos.length} fotos, ${data.reminders.filter(r => !r.concluido).length} lembretes pendentes.`;
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summary); ctx.notify('Resumo copiado para a área de transferência.'); }
    catch { ctx.notify('Não foi possível copiar o resumo neste navegador.', true); }
  };
  const shareSummary = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Resumo do meu Catalog', text: summary });
      else { await navigator.clipboard.writeText(summary); ctx.notify('Compartilhamento indisponível; o resumo foi copiado.'); }
    } catch (error) { if ((error as Error).name !== 'AbortError') ctx.notify('Não foi possível compartilhar agora.', true); }
  };
  const random = () => {
    if (!people.length) return ctx.notify('Adicione uma pessoa antes de usar a surpresa.', true);
    ctx.openPerson(people[Math.floor(Math.random() * people.length)]);
  };
  const fullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { ctx.notify('A tela cheia não está disponível neste navegador.', true); }
  };
  const tools: Tool[] = [
    { title: 'Fichário rápido', description: 'Cadastre sem sair do que está fazendo', icon: Plus, accent: true, run: closeRun(() => ctx.setQuickOpen(true)) },
    { title: 'Buscar em tudo', description: 'Pessoas, notas, histórias e ações', icon: Search, run: closeRun(() => ctx.setCommandOpen(true)) },
    { title: 'Pessoa surpresa', description: 'Abra uma ficha aleatória', icon: Shuffle, run: closeRun(random) },
    { title: 'Roleta', description: 'Escolha visualmente quem rever', icon: Sparkles, run: closeRun(() => ctx.setRouletteOpen(true)) },
    { title: 'Favoritas', description: `${people.filter(p => p.favorite).length} fichas favoritas`, icon: Heart, run: catalog({ scope: 'favorites' }) },
    { title: 'Sem foto', description: 'Encontre fichas que precisam de imagem', icon: ImageOff, run: catalog({ photo: 'without' }) },
    { title: 'Incompletas', description: 'Priorize os cadastros por terminar', icon: FileWarning, run: catalog({ incomplete: true, sort: 'completeness' }) },
    { title: 'Melhores notas', description: 'Nota 4 ou mais, da maior para a menor', icon: Star, run: catalog({ minimum: 4, sort: 'rating' }) },
    { title: 'Arquivadas', description: 'Consulte o arquivo sem misturar tudo', icon: Archive, run: catalog({ scope: 'archived' }) },
    { title: 'Comparar', description: 'Coloque duas fichas lado a lado', icon: Columns3, run: closeRun(() => ctx.setCompareIds([])) },
    { title: 'Ranking', description: 'Veja o pódio completo', icon: Trophy, run: closeRun(() => ctx.navigate('ranking')) },
    { title: 'Painel', description: 'Gráficos, XP e aniversários', icon: Gauge, run: closeRun(() => ctx.navigate('dashboard')) },
    { title: 'Agenda de hoje', description: `${data.appointments.filter(a => a.date === today && a.status === 'agendado').length} compromisso(s) hoje`, icon: CalendarClock, run: closeRun(() => ctx.navigate('agenda')) },
    { title: 'Lembretes pendentes', description: `${data.reminders.filter(r => !r.concluido).length} para concluir`, icon: CheckCircle2, run: closeRun(() => ctx.navigate('reminders')) },
    { title: 'Galeria', description: 'Fotos, álbuns e favoritas', icon: GalleryHorizontal, run: closeRun(() => ctx.navigate('gallery')) },
    { title: 'Pastas', description: 'Abra seus grupos e subpastas', icon: FolderOpen, run: closeRun(() => ctx.navigate('folders')) },
    { title: 'Verificar avisos', description: 'Atualize prazos e revisitas agora', icon: Bell, run: closeRun(() => { ctx.checkAlerts(true); ctx.setNotificationsOpen(true); }) },
    { title: 'Exportar planilha', description: 'Baixe as fichas ativas em CSV', icon: Download, run: closeRun(() => { exportCsv(people, data); ctx.notify('Planilha CSV exportada.'); }) },
    { title: 'Copiar resumo', description: 'Leve os totais para outra conversa', icon: Clipboard, run: closeRun(copySummary) },
    { title: 'Compartilhar resumo', description: 'Use o menu nativo do celular', icon: Share2, run: closeRun(shareSummary) },
    { title: ctx.blur ? 'Mostrar conteúdo' : 'Modo disfarce', description: 'Desfoque fotos e nomes rapidamente', icon: ScanEye, run: closeRun(() => ctx.setBlur(!ctx.blur)) },
    { title: 'Privacidade', description: 'Cubra toda a tela imediatamente', icon: EyeOff, run: closeRun(() => ctx.setPrivacy(true)) },
    { title: data.settings.theme === 'dark' ? 'Tema claro' : 'Tema escuro', description: 'Troque o tema com um toque', icon: data.settings.theme === 'dark' ? Sun : Moon, run: () => ctx.commit(d => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }), undefined, false) },
    { title: data.settings.density === 'compacto' ? 'Densidade confortável' : 'Densidade compacta', description: 'Ajuste quanto cabe na tela', icon: SlidersHorizontal, run: () => ctx.commit(d => ({ ...d, settings: { ...d.settings, density: d.settings.density === 'compacto' ? 'confortavel' : 'compacto' } }), undefined, false) },
    { title: 'Tela cheia', description: 'Ganhe espaço no celular ou tablet', icon: Maximize2, run: closeRun(fullscreen) },
    { title: 'Catálogo completo', description: `${people.length} pessoas ativas`, icon: Users, run: catalog() },
  ];

  return <Modal title="Ações rápidas" description="Tudo o que você mais usa, em um só lugar." onClose={onClose} wide className="quick-tools-modal">
    <div className="quick-summary"><div><strong>{people.length}</strong><span>pessoas</span></div><div><strong>{people.filter(p => p.favorite).length}</strong><span>favoritas</span></div><div><strong>{data.reminders.filter(r => !r.concluido).length}</strong><span>pendências</span></div><button onClick={() => { ctx.checkAlerts(true); }}><RefreshCw size={15} />Atualizar</button></div>
    <div className="quick-tools-grid">{tools.map(tool => <button key={tool.title} className={tool.accent ? 'accent' : ''} onClick={tool.run}><span><tool.icon size={19} /></span><div><strong>{tool.title}</strong><small>{tool.description}</small></div></button>)}</div>
  </Modal>;
}
