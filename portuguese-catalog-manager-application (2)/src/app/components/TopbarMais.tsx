import { useState } from 'react';
import { Check, CloudOff, Eye, EyeOff, Loader2, Moon, MoreHorizontal, Redo2, ScanEye, Settings as SettingsIcon, SlidersHorizontal, Sparkles, Sun, Undo2 } from 'lucide-react';
import { useCatalog } from '../../context';
import { formatDate } from '../../store';
import { IconButton } from '../../components/ui';
import { FolhaDeAcoes } from '../../components/Folha';
import type { AcaoDeFolha } from '../../components/Folha';
import { informacaoDaDensidade, proximaDensidade, rotuloDoFoco } from '../../features/interface';
import { PAGE_NAMES } from '../navigation';

/**
 * O "⋯" do topo.
 *
 * Antes o topo carregava dez botões ao mesmo tempo: raio, disfarce,
 * privacidade, tema, desfazer, refazer, salvamento, ajustes... Tudo com o
 * mesmo peso visual, e a pessoa precisando ler a interface antes de usá-la.
 *
 * Agora o topo mostra só o que é provável — buscar, avisos e perfil — e o
 * resto vive aqui, **agrupado**: Ações (o que fazer agora), Aparência e
 * privacidade, Sessão. No celular isto abre como folha (o dedo manda); o
 * mesmo componente serve as duas telas.
 */
export default function TopbarMais({ onAbrirRapidas, foco, onAlternarFoco }: {
  onAbrirRapidas: () => void;
  foco?: boolean;
  onAlternarFoco?: () => void;
}) {
  const ctx = useCatalog();
  const { data } = ctx;
  const [aberto, setAberto] = useState(false);
  const claro = data.settings.theme !== 'dark';
  const densidade = informacaoDaDensidade(data.settings.density);

  const grupos: { titulo: string; itens: AcaoDeFolha[] }[] = [
    {
      titulo: 'Ações',
      itens: [
        { rotulo: 'Central de ações rápidas', detalhe: 'filtros prontos, surpresa, roleta e mais', icone: Sparkles, onClick: onAbrirRapidas },
        { rotulo: rotuloDoFoco(!!foco), detalhe: foco ? 'a interface volta a aparecer' : 'só o conteúdo, sem menu nem rodapé (Alt+F)', icone: Eye, onClick: () => onAlternarFoco?.() },
        { rotulo: 'Ajustes e perfil', icone: SettingsIcon, onClick: () => ctx.navigate('settings') },
      ],
    },
    {
      titulo: 'Aparência e privacidade',
      itens: [
        { rotulo: ctx.blur ? 'Sair do modo disfarce' : 'Modo disfarce', detalhe: 'desfoca fotos e nomes', icone: ScanEye, onClick: () => ctx.setBlur(!ctx.blur) },
        { rotulo: 'Modo privacidade', detalhe: 'cobre a tela até você voltar', icone: EyeOff, onClick: () => ctx.setPrivacy(true) },
        { rotulo: claro ? 'Usar tema escuro' : 'Usar tema claro', icone: claro ? Moon : Sun, onClick: () => ctx.commit(d => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }), undefined, false) },
        { rotulo: `Densidade: ${densidade.nome}`, detalhe: `passa para ${informacaoDaDensidade(proximaDensidade(data.settings.density)).nome.toLowerCase()}`, icone: SlidersHorizontal, onClick: () => ctx.commit(d => ({ ...d, settings: { ...d.settings, density: proximaDensidade(d.settings.density) } }), undefined, false) },
      ],
    },
    {
      titulo: 'Sessão',
      itens: [
        { rotulo: 'Desfazer última alteração', detalhe: 'Ctrl+Z', icone: Undo2, desabilitada: !ctx.canUndo, onClick: ctx.undo },
        { rotulo: 'Refazer alteração', detalhe: 'Ctrl+Shift+Z', icone: Redo2, desabilitada: !ctx.canRedo, onClick: ctx.redo },
        {
          rotulo: ctx.demo ? 'Você está na demonstração' : ctx.status === 'saved' ? 'Tudo salvo neste aparelho' : ctx.status === 'error' ? 'Gravação falhou' : 'Salvando…',
          detalhe: ctx.demo ? 'As alterações não são gravadas' : `Última gravação: ${formatDate(ctx.lastSavedAt, true)}`,
          icone: ctx.demo ? CloudOff : ctx.status === 'saved' ? Check : Loader2,
          onClick: () => ctx.navigate('settings'),
        },
      ],
    },
  ];

  return <>
    <IconButton label="Mais ações" className="topbar-more" aria-haspopup="dialog" aria-expanded={aberto} onClick={() => { ctx.buzz?.(6); setAberto(true); }}><MoreHorizontal size={20} /></IconButton>
    {aberto && <FolhaDeAcoes titulo="O que você precisa agora?" subtitulo={PAGE_NAMES[ctx.page] || 'Meu espaço'} grupos={grupos} itens={[]} aoFechar={() => setAberto(false)} />}
  </>;
}
