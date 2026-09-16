/**
 * Folha: o painel que sobe do pé da tela.
 *
 * No celular, painel lateral, menu de contexto e formulário curto moram todos
 * aqui — é a resposta de aplicativo para "escolha uma coisa entre cinco". Vem
 * com o puxador desenhado, arrastar para baixo para fechar, fundo travado e o
 * Esc preservado de quem veio do teclado.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { useArrastarParaFechar, movimentoReduzido } from '../lib/toque';

let folhasAbertas = 0;
let overflowOriginal = '';

/** Trava a rolagem de quem está atrás da folha e devolve quando a última fecha. */
function useTravaRolagem(ativo: boolean) {
  useEffect(() => {
    if (!ativo || typeof document === 'undefined') return;
    if (folhasAbertas === 0) overflowOriginal = document.body.style.overflow;
    folhasAbertas += 1;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('folha-aberta');
    return () => {
      folhasAbertas = Math.max(0, folhasAbertas - 1);
      if (!folhasAbertas) {
        document.body.style.overflow = overflowOriginal;
        document.documentElement.classList.remove('folha-aberta');
      }
    };
  }, [ativo]);
}

export function Folha({ titulo, descricao, aoFechar, children, rodape, className = '', largura = 'fina', fecharPorDentro }: {
  titulo?: string;
  descricao?: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  className?: string;
  /** `larga` abre um cartão no computador em vez de uma folha no pé da tela. */
  largura?: 'fina' | 'larga';
  /** Botão de fechar no canto (folhas que não têm rodapé com "Concluir"). */
  fecharPorDentro?: boolean;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const [montada, setMontada] = useState(false);
  const gesto = useArrastarParaFechar({ aoFechar, limiar: 120 });
  useTravaRolagem(true);
  const fechar = useRef(aoFechar); fechar.current = aoFechar;

  useEffect(() => {
    const animar = requestAnimationFrame(() => setMontada(true));
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.focus({ preventScroll: true });
    const teclado = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); fechar.current(); } };
    document.addEventListener('keydown', teclado, true);
    return () => {
      cancelAnimationFrame(animar);
      document.removeEventListener('keydown', teclado, true);
      try { anterior?.focus?.({ preventScroll: true }); } catch { /* o foco de volta é educado, não obrigatório */ }
    };
  }, []);

  const reduz = movimentoReduzido();
  const deslocamento = gesto.deslocamento;
  const estilo = {
    transform: deslocamento ? `translate3d(0, ${deslocamento}px, 0)` : undefined,
    transition: gesto.arrastando ? 'none' : undefined,
  } as React.CSSProperties;

  return createPortal(
    <div className={`folha-overlay ${montada || reduz ? 'montada' : ''}`}>
      <div className="folha-veu" aria-hidden="true" style={{ opacity: deslocamento ? Math.max(0, 1 - deslocamento / 320) : undefined }}
        onMouseDown={aoFechar}
        onPointerDown={gesto.props.onPointerDown} onPointerMove={gesto.props.onPointerMove} onPointerUp={gesto.props.onPointerUp} onPointerCancel={gesto.props.onPointerCancel} />
      <div ref={painel} role="dialog" aria-modal="true" aria-label={titulo || 'Opções'} tabIndex={-1}
        className={`folha ${largura === 'larga' ? 'folha-larga' : ''} ${className}`} style={estilo}>
        <div className="folha-puxador"
          onPointerDown={gesto.props.onPointerDown} onPointerMove={gesto.props.onPointerMove} onPointerUp={gesto.props.onPointerUp} onPointerCancel={gesto.props.onPointerCancel}
          onDoubleClick={aoFechar}>
          <span aria-hidden="true" />
        </div>
        {(titulo || fecharPorDentro) && (
          <header className="folha-cabecalho">
            <div>
              {titulo && <h2>{titulo}</h2>}
              {descricao && <p>{descricao}</p>}
            </div>
            {fecharPorDentro && <button type="button" className="folha-fechar" onClick={aoFechar} aria-label="Fechar">Fechar</button>}
          </header>
        )}
        <div className="folha-corpo">{children}</div>
        {rodape && <footer className="folha-rodape">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export interface AcaoDeFolha {
  rotulo: string;
  detalhe?: string;
  icone?: LucideIcon;
  onClick: () => void;
  perigo?: boolean;
  destaque?: boolean;
  desabilitada?: boolean;
}

/**
 * Folha de ações: o menu de contexto do dedo.
 *
 * Uma linha por ação, do tamanho do polegar, com a mais perigosa separada em
 * baixo. É o que abre ao segurar uma foto, um cartão ou uma linha.
 */
export function FolhaDeAcoes({ titulo, subtitulo, itens, aoFechar, acao }: {
  titulo?: string;
  subtitulo?: string;
  itens: AcaoDeFolha[];
  aoFechar: () => void;
  /** Ação principal extra, mostrada antes das linhas (ex.: "Abrir a foto"). */
  acao?: { rotulo: string; onClick: () => void };
}) {
  const reduzir = movimentoReduzido();
  const [fechando, setFechando] = useState(false);
  const fechar = () => {
    if (!reduzir && !fechando) {
      setFechando(true);
      window.setTimeout(aoFechar, 140);
      return;
    }
    aoFechar();
  };
  const perigosas = itens.filter(item => item.perigo);
  const comuns = itens.filter(item => !item.perigo);
  const linha = (item: AcaoDeFolha) => {
    const Icone = item.icone;
    return (
      <button type="button" key={item.rotulo} className={`folha-acao ${item.perigo ? 'perigo' : ''} ${item.destaque ? 'destaque' : ''}`}
        disabled={item.desabilitada}
        onClick={() => { item.onClick(); fechar(); }}>
        {Icone && <Icone size={19} />}
        <span>{item.rotulo}{item.detalhe && <small>{item.detalhe}</small>}</span>
      </button>
    );
  };

  return (
    <Folha aoFechar={fechar} className={`folha-acoes ${fechando ? 'saindo' : ''}`}>
      {(titulo || subtitulo) && (
        <div className="folha-acoes-cabeca">
          {titulo && <strong>{titulo}</strong>}
          {subtitulo && <span>{subtitulo}</span>}
        </div>
      )}
      {acao && <button type="button" className="folha-acao principal" onClick={() => { acao.onClick(); fechar(); }}>{acao.rotulo}</button>}
      <div className="folha-acoes-lista">{comuns.map(linha)}</div>
      {perigosas.length > 0 && <div className="folha-acoes-lista perigo">{perigosas.map(linha)}</div>}
    </Folha>
  );
}
