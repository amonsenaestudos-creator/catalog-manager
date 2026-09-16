/**
 * Visor de fotos: a tela inteira do álbum, feita para o polegar.
 *
 * O que ele resolve no celular: a foto ocupa tudo, o dedo arrasta para o lado
 * e troca de foto, a pinça e o toque duplo dão zoom, puxar para baixo fecha e
 * um toque simples esconde as barras para ver a imagem limpa. Os metadados não
 * somem — moram numa folha que sobe do pé da tela.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, Heart, Info, Maximize2, Minus, Plus, X } from 'lucide-react';
import type { Photo } from '../types';
import { useCatalog } from '../context';
import { registrarRazao } from '../lib/galeria';
import { distanciaEntre, limitar, movimentoReduzido } from '../lib/toque';
import { Folha } from './Folha';
import type { AcaoDeFolha } from './Folha';

const ESCALA_MAXIMA = 4;

export interface VisorProps {
  fotos: Photo[];
  indice: number;
  aoMudar: (indice: number) => void;
  aoFechar: () => void;
  /** Texto do topo e do rodapé. */
  titulo?: (photo: Photo) => string;
  apoio?: (photo: Photo) => string;
  /** Coração: quando ausente, o botão de favoritar não aparece. */
  aoFavoritar?: (photo: Photo) => void;
  aoBaixar?: (photo: Photo) => void;
  acoes?: (photo: Photo) => AcaoDeFolha[];
  /** Formulário de metadados, mostrado na folha "Detalhes". */
  detalhes?: (photo: Photo) => React.ReactNode;
  selecionada?: boolean;
  aoAlternarSelecao?: (photo: Photo) => void;
}

export default function VisorDeFotos({ fotos, indice, aoMudar, aoFechar, titulo, apoio, aoFavoritar, aoBaixar, acoes, detalhes, selecionada, aoAlternarSelecao }: VisorProps) {
  const ctx = useCatalog();
  const foto = fotos[indice];
  const cena = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ escala: 1, x: 0, y: 0 });
  const [arrasto, setArrasto] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const [barrasVisiveis, setBarrasVisiveis] = useState(true);
  const [folha, setFolha] = useState<'detalhes' | 'acoes' | null>(null);
  const [coracao, setCoracao] = useState(0);
  const coracaoTimer = useRef<number | null>(null);
  const reduz = movimentoReduzido();

  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const pinca = useRef<{ distancia: number; escala: number } | null>(null);
  const toque = useRef<{ x: number; y: number; tempo: number; movido: number; tipo: '' | 'x' | 'y' } | null>(null);
  const ultimoToque = useRef(0);
  const adiador = useRef<number | null>(null);

  // Zoom, offset e índice mudam juntos: trocar de foto limpa a lente.
  useEffect(() => { setZoom({ escala: 1, x: 0, y: 0 }); setArrasto({ x: 0, y: 0 }); }, [indice]);

  useEffect(() => () => { if (adiador.current) window.clearTimeout(adiador.current); }, []);

  // Visor aberto: o fundo para de rolar e a doca do celular sai da frente.
  useEffect(() => {
    document.documentElement.classList.add('visor-aberto');
    return () => document.documentElement.classList.remove('visor-aberto');
  }, []);

  useEffect(() => {
    const teclado = (event: KeyboardEvent) => {
      const alvo = event.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo?.tagName) || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') { event.stopPropagation(); if (folha) setFolha(null); else aoFechar(); return; }
      if (folha) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); aoMudar(Math.min(fotos.length - 1, indice + 1)); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); aoMudar(Math.max(0, indice - 1)); }
      if (event.key === '+' || event.key === '=') setZoom(z => ({ ...z, escala: limitar(z.escala + .35, 1, ESCALA_MAXIMA) }));
      if (event.key === '-') setZoom(z => ({ ...z, escala: limitar(z.escala - .35, 1, ESCALA_MAXIMA), x: z.escala - .35 <= 1 ? 0 : z.x, y: z.escala - .35 <= 1 ? 0 : z.y }));
      if (event.key.toLowerCase() === 'i' && detalhes) setFolha(f => (f === 'detalhes' ? null : 'detalhes'));
    };
    document.addEventListener('keydown', teclado, true);
    return () => document.removeEventListener('keydown', teclado, true);
  }, [aoFechar, aoMudar, detalhes, folha, fotos.length, indice]);

  // A faixa de miniaturas acompanha a foto atual.
  useEffect(() => {
    const alvo = faixa.current?.querySelector<HTMLElement>('[data-atual="1"]');
    if (typeof alvo?.scrollIntoView === 'function') {
      try { alvo.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduz ? 'auto' : 'smooth' }); } catch { /* rolar a faixa é mimo */ }
    }
  }, [indice, reduz]);

  const irPara = useCallback((direcao: number) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= fotos.length) { setArrasto({ x: 0, y: 0 }); return false; }
    ctx.buzz?.(6);
    aoMudar(destino);
    return true;
  }, [aoMudar, ctx, fotos.length, indice]);

  const favoritar = useCallback((photo: Photo) => {
    aoFavoritar?.(photo);
    setCoracao(Date.now());
    ctx.sound('pop');
    if (coracaoTimer.current) window.clearTimeout(coracaoTimer.current);
    coracaoTimer.current = window.setTimeout(() => setCoracao(0), 820);
  }, [aoFavoritar, ctx]);

  const soltarZoom = () => setZoom({ escala: 1, x: 0, y: 0 });

  const aoBaixo = (event: React.PointerEvent) => {
    ponteiros.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId); } catch { /* captura é opcional */ }
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      pinca.current = { distancia: distanciaEntre(a, b) || 1, escala: zoom.escala };
      toque.current = null;
      setArrasto({ x: 0, y: 0 });
      return;
    }
    toque.current = { x: event.clientX, y: event.clientY, tempo: Date.now(), movido: 0, tipo: '' };
    setArrastando(true);
  };

  const aoMover = (event: React.PointerEvent) => {
    if (!ponteiros.current.has(event.pointerId)) return;
    ponteiros.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinca.current && ponteiros.current.size >= 2) {
      const [a, b] = [...ponteiros.current.values()];
      const escala = limitar(pinca.current.escala * ((distanciaEntre(a, b) || 1) / pinca.current.distancia), 1, ESCALA_MAXIMA);
      setZoom(z => ({ ...z, escala }));
      return;
    }

    const base = toque.current;
    if (!base) return;
    const dx = event.clientX - base.x;
    const dy = event.clientY - base.y;
    base.movido = Math.max(base.movido, Math.abs(dx) + Math.abs(dy));
    if (zoom.escala > 1.02) { setArrasto({ x: 0, y: 0 }); return; }
    if (!base.tipo) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      base.tipo = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (base.tipo === 'x') setArrasto({ x: limitar(dx * .8, -220, 220), y: 0 });
    else setArrasto({ x: 0, y: Math.max(0, dy * .8) });
  };

  const aoSubir = (event: React.PointerEvent) => {
    ponteiros.current.delete(event.pointerId);
    if (pinca.current && ponteiros.current.size < 2) pinca.current = null;
    setArrastando(false);
    const base = toque.current;
    toque.current = null;
    if (!base) return;

    // Toque curto: dois seguidos dão zoom, um sozinho esconde as barras.
    if (base.movido < 12 && Date.now() - base.tempo < 320) {
      const agora = Date.now();
      if (agora - ultimoToque.current < 320) {
        ultimoToque.current = 0;
        if (adiador.current) { window.clearTimeout(adiador.current); adiador.current = null; }
        if (zoom.escala > 1.05) { soltarZoom(); ctx.buzz?.(5); }
        else { setZoom({ escala: 2.4, x: 0, y: 0 }); ctx.buzz?.(8); }
        return;
      }
      ultimoToque.current = agora;
      if (!zoom.escala || zoom.escala <= 1.02) {
        adiador.current = window.setTimeout(() => { setBarrasVisiveis(v => !v); adiador.current = null; }, 240);
      }
      return;
    }
    if (base.tipo === 'x' && Math.abs(arrasto.x) > 58) { if (!irPara(arrasto.x < 0 ? 1 : -1)) setArrasto({ x: 0, y: 0 }); return; }
    if (base.tipo === 'y' && arrasto.y > 120) { aoFechar(); return; }
    setArrasto({ x: 0, y: 0 });
  };

  const estiloCena: React.CSSProperties = {
    transform: `translate3d(${arrasto.x + (zoom.escala > 1 ? zoom.x : 0)}px, ${arrasto.y + (zoom.escala > 1 ? zoom.y : 0)}px, 0) scale(${zoom.escala * (arrasto.y > 12 ? Math.max(.86, 1 - arrasto.y / 1400) : 1)})`,
    transition: arrastando || pinca.current ? 'none' : 'transform .24s cubic-bezier(.2,.8,.2,1)',
  };
  const podeVoltar = indice > 0;
  const podeAvancar = indice < fotos.length - 1;
  const janela = useMemo(() => fotos.map((item, index) => ({ item, index })).slice(Math.max(0, indice - 40), Math.min(fotos.length, indice + 41)), [fotos, indice]);
  const fechada = arrasto.y > 12 || Math.abs(arrasto.x) > 30;

  if (!foto) return null;

  return createPortal(
    <div className={`visor ${barrasVisiveis ? '' : 'sem-barras'} ${zoom.escala > 1.02 ? 'com-zoom' : ''}`} role="dialog" aria-modal="true" aria-label="Visualizador de fotos">
      <div className="visor-fundo" style={{ opacity: arrasto.y ? Math.max(.35, 1 - arrasto.y / 420) : undefined }} />
      <header className="visor-topo">
        <button type="button" className="visor-botao" onClick={aoFechar} aria-label="Fechar a foto"><X size={20} /></button>
        <div className="visor-titulo">
          <strong>{titulo?.(foto) ?? 'Foto do catálogo'}</strong>
          <small>{apoio?.(foto) ?? `${Math.max(1, indice + 1)} de ${fotos.length || 1}`}</small>
        </div>
        <div className="visor-topo-acoes">
          {aoAlternarSelecao && (
            <button type="button" className={`visor-botao ${selecionada ? 'ativa' : ''}`} onClick={() => aoAlternarSelecao(foto)} aria-label={selecionada ? 'Tirar do lote' : 'Escolher no lote'} aria-pressed={!!selecionada}>
              <span className="visor-marca">{selecionada ? '✓' : ''}</span>
            </button>
          )}
          {aoFavoritar && (
            <button type={`button`} className={`visor-botao ${foto.favorite ? 'favorita' : ''}`} onClick={() => favoritar(foto)} aria-label={foto.favorite ? 'Tirar dos favoritas' : 'Guardar nas favoritas'}>
              <Heart size={19} fill={foto.favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {aoBaixar && <button type="button" className="visor-botao" onClick={() => aoBaixar(foto)} aria-label="Baixar a imagem"><Download size={19} /></button>}
          {acoes && <button type="button" className="visor-botao" onClick={() => setFolha('acoes')} aria-label="Mais ações"><span className="visor-tres-pontos">⋯</span></button>}
        </div>
      </header>

      <div ref={cena} className="visor-cena"
        onPointerDown={aoBaixo} onPointerMove={aoMover} onPointerUp={aoSubir} onPointerCancel={aoSubir}>
        <img key={foto.id} src={foto.url} alt={titulo?.(foto) || 'Foto do catálogo'} style={estiloCena} draggable={false} decoding="async"
          onLoad={event => { const img = event.currentTarget; registrarRazao(foto.id, img.naturalWidth, img.naturalHeight); }} />
        {coracao > 0 && <span key={coracao} className="visor-coracao" aria-hidden="true"><Heart size={64} fill="currentColor" strokeWidth={0} /></span>}
        {fotos.length > 1 && (
          <>
            <button type="button" className="visor-seta anterior" onClick={() => irPara(-1)} disabled={!podeVoltar} aria-label="Foto anterior"><ChevronLeft size={26} /></button>
            <button type="button" className="visor-seta proxima" onClick={() => irPara(1)} disabled={!podeAvancar} aria-label="Próxima foto"><ChevronRight size={26} /></button>
          </>
        )}
        <span className="visor-contador">{Math.max(1, indice + 1)} / {fotos.length}</span>
        {zoom.escala > 1.02 && <button type="button" className="visor-zoom-reset" onClick={soltarZoom}><Maximize2 size={14} />Ajustar</button>}
      </div>

      <footer className="visor-base">
        <div className="visor-controles">
          <div className="visor-zumbir">
            <button type="button" className="visor-botao" onClick={() => setZoom(z => ({ ...z, escala: limitar(z.escala - .5, 1, ESCALA_MAXIMA), x: z.escala - .5 <= 1 ? 0 : z.x, y: z.escala - .5 <= 1 ? 0 : z.y }))} aria-label="Diminuir o zoom" disabled={zoom.escala <= 1}><Minus size={17} /></button>
            <button type="button" className="visor-zoom-valor" onClick={() => setZoom({ escala: 1, x: 0, y: 0 })}>{Math.round(zoom.escala * 100)}%</button>
            <button type="button" className="visor-botao" onClick={() => setZoom(z => ({ ...z, escala: limitar(z.escala + .5, 1, ESCALA_MAXIMA) }))} aria-label="Aumentar o zoom" disabled={zoom.escala >= ESCALA_MAXIMA}><Plus size={17} /></button>
          </div>
          {detalhes && <button type="button" className="visor-detalhes" onClick={() => setFolha('detalhes')}><Info size={16} />Detalhes</button>}
        </div>
        {!fechada && <p className="visor-dica" aria-hidden="true">{zoom.escala > 1.02 ? 'Arraste para ver os cantos · toque duplo ajusta' : 'Deslize para o lado · puxe para baixo para fechar'}</p>}
        {fotos.length > 1 && (
          <div className="visor-faixa" ref={faixa} role="tablist" aria-label="Miniaturas da galeria">
            {janela.map(({ item, index }) => (
              <button type="button" key={item.id} role="tab" aria-selected={index === indice} aria-label={`Foto ${index + 1}`}
                data-atual={index === indice ? '1' : undefined} className={`visor-miniatura ${index === indice ? 'ativa' : ''}`}
                onClick={() => aoMudar(index)}>
                <img src={item.url} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </footer>


      {folha === 'acoes' && acoes && (
        <Folha titulo={titulo?.(foto)} descricao="O que fazer com esta foto" aoFechar={() => setFolha(null)}>
          <div className="folha-acoes-lista">
            {acoes(foto).map(item => {
              const Icone = item.icone;
              return <button type="button" key={item.rotulo} className={`folha-acao ${item.perigo ? 'perigo' : ''}`} disabled={item.desabilitada}
                onClick={() => { item.onClick(); setFolha(null); }}>
                {Icone && <Icone size={19} />}<span>{item.rotulo}{item.detalhe && <small>{item.detalhe}</small>}</span>
              </button>;
            })}
          </div>
        </Folha>
      )}
      {folha === 'detalhes' && detalhes && (
        <Folha titulo="Detalhes da foto" descricao="Vínculo, pasta e tipo" aoFechar={() => setFolha(null)} largura="larga" fecharPorDentro rodape={<button type="button" className="btn btn-primary" onClick={() => setFolha(null)}>Pronto</button>}>
          {detalhes(foto)}
        </Folha>
      )}
    </div>,
    document.body,
  );
}
