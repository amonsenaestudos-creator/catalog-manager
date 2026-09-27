import { useState } from 'react';
import { Check, CloudOff, EyeOff, Loader2, Moon, MoreHorizontal, Redo2, ScanEye, Settings as SettingsIcon, Sun, Undo2, Zap } from 'lucide-react';
import { useCatalog } from '../../context';
import { formatDate } from '../../store';
import { IconButton } from '../../components/ui';
import { FolhaDeAcoes } from '../../components/Folha';
import type { AcaoDeFolha } from '../../components/Folha';
import { PAGE_NAMES } from '../navigation';

/** Ações de baixa frequência que não precisam ocupar o topo inteiro. */
export default function TopbarMais({ onAbrirRapidas }: { onAbrirRapidas: () => void }) {
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
