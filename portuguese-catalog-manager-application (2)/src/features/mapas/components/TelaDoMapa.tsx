/**
 * O plano do mapa: nós, fios, zoom e arrasto.
 *
 * Quem manda nas posições é o mapa (props) — este componente só desenha e
 * devolve o que o dedo fez. Três regras que valem nota:
 *
 *   · **arrastar não grava a cada movimento.** Enquanto o dedo corre, a posição
 *     nova vive num estado local (`movendo`); o `commit` acontece uma vez, no
 *     `pointerup`. Sem isso o `Ctrl+Z` do aplicativo viraria "voltar um pixel".
 *   · **as coordenadas são do plano.** Zoom e deslocamento ficam na
 *     transformação CSS do `.mapa-plano`, então o gesto converte tela → plano
 *     dividindo pela escala, e o mapa não muda quando a janela muda de tamanho.
 *   · **o arrasto não depende de estado que muda durante ele.** O deslocamento é
 *     contado em pixels de tela e dividido pelo zoom capturado no início, senão
 *     cada movimento remontaria os listeners da janela no meio do gesto.
 *
 * O zoom é por listener nativo com `passive: false`: o React registra `wheel`
 * como passivo, e aí o `preventDefault` não segura a rolagem da página.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, UserRound } from 'lucide-react';
import type { MapaMental, NoDoMapa, Person } from '../../../types';
import { noPorId } from '../mapa';
import type { PontoDoMapa } from '../mapa';

export interface VistaDoMapa { x: number; y: number; zoom: number }

type Arrasto =
  | { tipo: 'no'; id: string; origem: PontoDoMapa; inicio: { x: number; y: number }; zoom: number }
  | { tipo: 'plano'; inicio: { x: number; y: number }; vista: VistaDoMapa };

export interface TelaDoMapaProps {
  mapa: MapaMental;
  pessoas: Person[];
  selecionado: string | null;
  /** Nó de origem quando "Ligar" está armado: o próximo toque fecha o fio. */
  ligando: string | null;
  aoSelecionar: (id: string | null) => void;
  aoMover: (id: string, para: PontoDoMapa) => void;
  aoRenomear: (id: string, texto: string) => void;
  aoCriarAqui: (em: PontoDoMapa) => void;
  aoLigar: (de: string, para: string) => void;
  aoDesligar: (ligacaoId: string) => void;
  aoAbrirPessoa: (pessoa: Person) => void;
}

const limitarZoom = (zoom: number) => Math.min(2.4, Math.max(0.4, zoom));

export default function TelaDoMapa(props: TelaDoMapaProps) {
  const {
    mapa, pessoas, selecionado, ligando, aoSelecionar, aoMover, aoRenomear,
    aoCriarAqui, aoLigar, aoDesligar, aoAbrirPessoa,
  } = props;
  const palco = useRef<HTMLDivElement>(null);
  const movendoRef = useRef<(PontoDoMapa & { id: string }) | null>(null);
  const [vista, setVista] = useState<VistaDoMapa>({ x: 0, y: 0, zoom: 1 });
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const [movendo, setMovendo] = useState<(PontoDoMapa & { id: string }) | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState('');

  const centralizar = useCallback(() => {
    const alvo = palco.current;
    // sem medida (teste sem layout) o plano fica com a origem no meio estimado
    setVista(atual => ({ ...atual, x: alvo?.clientWidth ? alvo.clientWidth / 2 : 240, y: alvo?.clientHeight ? alvo.clientHeight / 2 : 200 }));
  }, []);

  // abrir outro mapa volta para o meio do plano
  useEffect(() => { centralizar(); }, [mapa.id, centralizar]);

  /** Um ponto da tela (clientX/Y) lido como ponto do plano. */
  const paraPlano = useCallback((clientX: number, clientY: number, atual = vista): PontoDoMapa => {
    const rect = palco.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) - atual.x) / atual.zoom,
      y: (clientY - (rect?.top ?? 0) - atual.y) / atual.zoom,
    };
  }, [vista]);

  /* ------------------------------------------------------------ zoom (roda) */
  useEffect(() => {
    const alvo = palco.current;
    if (!alvo) return;
    const rolar = (evento: WheelEvent) => {
      evento.preventDefault();
      const rect = alvo.getBoundingClientRect();
      const px = evento.clientX - rect.left;
      const py = evento.clientY - rect.top;
      setVista(atual => {
        const zoom = limitarZoom(atual.zoom * (evento.deltaY < 0 ? 1.12 : 0.89));
        const fator = zoom / atual.zoom;
        return { zoom, x: px - (px - atual.x) * fator, y: py - (py - atual.y) * fator };
      });
    };
    alvo.addEventListener('wheel', rolar, { passive: false });
    return () => alvo.removeEventListener('wheel', rolar);
  }, [mapa.id]);

  const aproximar = (fator: number) => {
    const alvo = palco.current;
    const px = alvo?.clientWidth ? alvo.clientWidth / 2 : 0;
    const py = alvo?.clientHeight ? alvo.clientHeight / 2 : 0;
    setVista(atual => {
      const zoom = limitarZoom(atual.zoom * fator);
      const k = zoom / atual.zoom;
      return { zoom, x: px - (px - atual.x) * k, y: py - (py - atual.y) * k };
    });
  };

  /* -------------------------------------------------------------- o arrasto */
  useEffect(() => {
    if (!arrasto) return;
    const correr = (evento: PointerEvent) => {
      if (arrasto.tipo === 'plano') {
        setVista({
          zoom: arrasto.vista.zoom,
          x: arrasto.vista.x + (evento.clientX - arrasto.inicio.x),
          y: arrasto.vista.y + (evento.clientY - arrasto.inicio.y),
        });
        return;
      }
      const proximo = {
        id: arrasto.id,
        x: arrasto.origem.x + (evento.clientX - arrasto.inicio.x) / arrasto.zoom,
        y: arrasto.origem.y + (evento.clientY - arrasto.inicio.y) / arrasto.zoom,
      };
      movendoRef.current = proximo;
      setMovendo(proximo);
    };
    const soltar = () => {
      const ultimo = movendoRef.current;
      if (ultimo) aoMover(ultimo.id, { x: ultimo.x, y: ultimo.y });
      movendoRef.current = null;
      setMovendo(null);
      setArrasto(null);
    };
    window.addEventListener('pointermove', correr);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', correr);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [arrasto, aoMover]);

  const descerNoNo = (evento: React.PointerEvent, no: NoDoMapa) => {
    if (editando === no.id) return;
    evento.stopPropagation();
    aoSelecionar(no.id);
    if (ligando && ligando !== no.id) { aoLigar(ligando, no.id); return; }
    setArrasto({
      tipo: 'no', id: no.id, origem: { x: no.x, y: no.y },
      inicio: { x: evento.clientX, y: evento.clientY }, zoom: vista.zoom,
    });
  };

  const descerNoPlano = (evento: React.PointerEvent) => {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    aoSelecionar(null);
    setEditando(null);
    setArrasto({ tipo: 'plano', inicio: { x: evento.clientX, y: evento.clientY }, vista });
  };

  const comecarEdicao = (no: NoDoMapa) => { setEditando(no.id); setRascunho(no.texto); };
  const fecharEdicao = (gravar: boolean) => {
    if (gravar && editando) aoRenomear(editando, rascunho);
    setEditando(null);
    setRascunho('');
  };

  /** A posição que vale na tela: a do arrasto enquanto o dedo corre. */
  const posicao = (id: string): PontoDoMapa | null => {
    if (movendo?.id === id) return movendo;
    const no = noPorId(mapa, id);
    return no ? { x: no.x, y: no.y } : null;
  };

  return (
    <div className="mapa-tela" ref={palco} onPointerDown={descerNoPlano} role="application"
      onDoubleClick={evento => aoCriarAqui(paraPlano(evento.clientX, evento.clientY))}
      aria-label={`Plano do mapa ${mapa.nome}`}>
      <div className="mapa-plano" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})` }}>
        <svg className="mapa-fios" aria-hidden="true">
          {mapa.ligacoes.map(fio => {
            const de = posicao(fio.de);
            const para = posicao(fio.para);
            if (!de || !para) return null;
            const meio = { x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 - Math.abs(para.x - de.x) * 0.08 };
            return (
              <g key={fio.id} className="mapa-fio">
                <path d={`M ${de.x} ${de.y} Q ${meio.x} ${meio.y} ${para.x} ${para.y}`} />
                {!!fio.rotulo && <text x={meio.x} y={meio.y - 10}>{fio.rotulo}</text>}
              </g>
            );
          })}
        </svg>

        {mapa.ligacoes.map(fio => {
          const de = noPorId(mapa, fio.de);
          const para = noPorId(mapa, fio.para);
          const pontoA = posicao(fio.de);
          const pontoB = posicao(fio.para);
          if (!de || !para || !pontoA || !pontoB) return null;
          return (
            <button type="button" key={`corte-${fio.id}`} className="mapa-fio-corte"
              style={{ transform: `translate(${(pontoA.x + pontoB.x) / 2}px, ${(pontoA.y + pontoB.y) / 2}px)` }}
              aria-label={`Remover a ligação entre ${de.texto} e ${para.texto}`} title="Remover esta ligação"
              onPointerDown={evento => evento.stopPropagation()} onClick={() => aoDesligar(fio.id)}>
              <span aria-hidden="true">×</span>
            </button>
          );
        })}

        {mapa.nos.map(no => {
          const ponto = posicao(no.id) ?? no;
          const pessoa = pessoas.find(item => item.id === no.personId) || null;
          return (
            <article key={no.id} data-no={no.id}
              className={`mapa-no ${selecionado === no.id ? 'selecionado' : ''} ${ligando === no.id ? 'ligando' : ''} ${movendo?.id === no.id ? 'arrastando' : ''}`}
              style={{ transform: `translate(${ponto.x}px, ${ponto.y}px)`, '--cor': no.cor } as React.CSSProperties}
              onPointerDown={evento => descerNoNo(evento, no)}
              onDoubleClick={evento => { evento.stopPropagation(); comecarEdicao(no); }}>
              {editando === no.id ? (
                <input autoFocus value={rascunho} aria-label="Texto do nó" maxLength={90}
                  onChange={evento => setRascunho(evento.target.value)}
                  onPointerDown={evento => evento.stopPropagation()}
                  onKeyDown={evento => {
                    evento.stopPropagation();
                    if (evento.key === 'Enter') fecharEdicao(true);
                    if (evento.key === 'Escape') fecharEdicao(false);
                  }}
                  onBlur={() => fecharEdicao(true)} />
              ) : <strong>{no.texto}</strong>}
              {pessoa && (
                <button type="button" className="mapa-no-ficha" title={`Abrir a ficha de ${pessoa.nome}`}
                  onPointerDown={evento => evento.stopPropagation()} onClick={() => aoAbrirPessoa(pessoa)}>
                  <UserRound size={11} />{pessoa.nome}
                </button>
              )}
              {!!no.nota && <small className="mapa-no-nota">{no.nota}</small>}
            </article>
          );
        })}
      </div>

      <div className="mapa-zoom">
        <button type="button" onClick={() => aproximar(1.2)} aria-label="Aproximar"><Plus size={16} /></button>
        <button type="button" onClick={() => aproximar(1 / 1.2)} aria-label="Afastar"><Minus size={16} /></button>
        <button type="button" onClick={centralizar} aria-label="Centralizar o mapa"><Maximize2 size={15} /></button>
        <span>{Math.round(vista.zoom * 100)}%</span>
      </div>
      <p className="mapa-dica">
        {ligando
          ? 'Toque em outro nó para fechar a ligação.'
          : 'Dois cliques no plano criam um nó · arraste o nó para mover · arraste o fundo para deslocar · a roda dá zoom.'}
      </p>
    </div>
  );
}
