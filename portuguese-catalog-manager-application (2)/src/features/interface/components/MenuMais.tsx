/**
 * O "⋯ Mais" — um menu, não uma lixeira.
 *
 * Regra: quando a lista passa de sete linhas, ela precisa de títulos. Aqui as
 * ações chegam já agrupadas (Ações · Organização · Avançado) e o painel abre
 * colado no botão, com o título do grupo em cima de cada bloco. No celular, o
 * CSS do `menu-anchor` levanta o painel acima do pé da tela e o alvo de 44px
 * continua valendo — ver `celular.css`, seção 15.
 */
import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from '../../../components/ui';

export interface AcaoDeMenu {
  id: string;
  rotulo: string;
  detalhe?: string;
  perigo?: boolean;
  desabilitada?: boolean;
}

export interface GrupoDeMenu {
  id: string;
  rotulo?: string;
  acoes: AcaoDeMenu[];
}

export function MenuMais({ grupos, aoEscolher, iconeDe, rotulo = 'Mais ações', titulo, subtitulo, className = '', lado = 'direita' }: {
  grupos: GrupoDeMenu[];
  aoEscolher: (id: string) => void;
  iconeDe?: (id: string) => LucideIcon | undefined;
  /** O que o botão anuncia (leitor de tela e dica do mouse). */
  rotulo?: string;
  /** Cabeçalho do painel — "Mais ações de Maria", "Mais ações". */
  titulo?: string;
  /** Uma linha abaixo do cabeçalho, explicando o que vive ali. */
  subtitulo?: string;
  className?: string;
  /** De que lado o painel abre quando o botão está colado na borda. */
  lado?: 'direita' | 'esquerda';
}) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLDivElement>(null);
  const gruposVisiveis = grupos
    .map(grupo => ({ ...grupo, acoes: (grupo.acoes || []).filter(Boolean) }))
    .filter(grupo => grupo.acoes.length > 0);

  // Clicou fora, fechou. O menu não pode virar uma armadilha em cima da ficha.
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: MouseEvent) => {
      if (!ancora.current?.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto]);

  if (!gruposVisiveis.length) return null;
  const total = gruposVisiveis.reduce((soma, grupo) => soma + grupo.acoes.length, 0);

  return <div className={`menu-anchor menu-mais ${className}`} ref={ancora}>
    <IconButton label={total > 0 ? `${rotulo} (${total})` : rotulo} aria-haspopup="menu" aria-expanded={aberto} title={rotulo} onClick={() => setAberto(!aberto)}>
      <MoreHorizontal size={20} />
    </IconButton>
    {aberto && <div className={`dropdown-menu mais-menu ${lado === 'esquerda' ? 'a-esquerda' : ''}`} role="menu" aria-label={titulo || rotulo}>
      {(titulo || subtitulo) && <div className="mais-menu-cabecalho">{titulo && <p className="mais-menu-cabeca">{titulo}</p>}{subtitulo && <small>{subtitulo}</small>}</div>}
      {gruposVisiveis.map(grupo => <div className="mais-menu-grupo" key={grupo.id}>
        {grupo.rotulo && <p className="mais-menu-titulo">{grupo.rotulo}</p>}
        {grupo.acoes.map(acao => {
          const Icone = iconeDe?.(acao.id);
          return <button key={acao.id} type="button" role="menuitem" className={acao.perigo ? 'danger-text' : ''} disabled={acao.desabilitada} onClick={() => { setAberto(false); aoEscolher(acao.id); }}>
            {Icone && <Icone size={16} />}
            <span>{acao.rotulo}{acao.detalhe && <small className="mais-menu-detalhe">{acao.detalhe}</small>}</span>
          </button>;
        })}
      </div>)}
    </div>}
  </div>;
}
