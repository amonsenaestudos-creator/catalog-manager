/**
 * Gestos de dedo.
 *
 * O celular não tem mouse pairando nem tecla Esc: o que no computador é clique
 * direito, hover ou `Esc`, aqui precisa virar toque longo, arrastar e deslizar
 * da borda. Estes hooks devolvem apenas as props de ponteiro e o estado visual
 * — quem desenha é a tela. Em navegador de teste (jsdom) nada acontece, porque
 * nenhum evento de ponteiro é disparado sozinho.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ehToque } from './dispositivo';

export const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

/** Distância entre dois pontos (serve para a pinça). */
export const distanciaEntre = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** O usuário pediu menos movimento? (ajuste do app ou do sistema) */
export function movimentoReduzido() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('reduce-motion')) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export interface PropsDePonteiro {
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerMove?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerCancel?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
}

/**
 * Toque longo: segura um cartão por ~0,4s e abre a folha de ações.
 *
 * `segurou()` é o pino de segurança do clique: depois de um toque longo o
 * navegador ainda dispara o `click`, e sem esse pino a foto abriria junto.
 */
export function useToqueLongo({ aoLongo, espera = 400, tolerancia = 12, aoSegurar }: {
  aoLongo: (event: React.PointerEvent) => void;
  espera?: number;
  tolerancia?: number;
  aoSegurar?: () => void;
}): { props: PropsDePonteiro; segurou: () => boolean; cancelar: () => void } {
  const timer = useRef<number | null>(null);
  const origem = useRef<{ x: number; y: number } | null>(null);
  const disparamos = useRef(0);

  const cancelar = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    origem.current = null;
  }, []);

  useEffect(() => cancelar, [cancelar]);

  const props: PropsDePonteiro = {
    onPointerDown: event => {
      cancelar();
      origem.current = { x: event.clientX, y: event.clientY };
      const alvo = event.pointerType === 'touch' || !ehToque() ? event : null;
      if (!alvo || !origem.current) return;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        disparamos.current = Date.now();
        origem.current = null;
        aoSegurar?.();
        aoLongo(event);
      }, espera);
    },
    onPointerMove: event => {
      const inicio = origem.current;
      if (!inicio) return;
      if (Math.abs(event.clientX - inicio.x) + Math.abs(event.clientY - inicio.y) > tolerancia) cancelar();
    },
    onPointerUp: cancelar,
    onPointerCancel: cancelar,
    onPointerLeave: cancelar,
    // Android abre o menu do navegador no toque longo: sem isto, ele compete com a nossa folha.
    onContextMenu: event => event.preventDefault(),
  };

  return { props, segurou: () => Date.now() - disparamos.current < 700, cancelar };
}

/**
 * Arrastar para baixo e soltar: fecha a folha, o visor, o que estiver aberto.
 *
 * `deslocamento` alimenta o `translate3d` do painel enquanto o dedo anda, e o
 * fundo vai esmaecendo junto — é o gesto que faz a interface parecer do celular
 * em vez de uma janela de site.
 */
export function useArrastarParaFechar({ aoFechar, limiar = 110, sensibilidade = 1, soNoPuxar = true }: {
  aoFechar: () => void;
  limiar?: number;
  sensibilidade?: number;
  soNoPuxar?: boolean;
}): { props: PropsDePonteiro; deslocamento: number; arrastando: boolean } {
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const ativo = useRef(false);

  const props: PropsDePonteiro = {
    onPointerDown: event => {
      if (event.button !== undefined && event.button !== 0) return;
      inicio.current = { x: event.clientX, y: event.clientY };
      ativo.current = true;
      setArrastando(true);
    },
    onPointerMove: event => {
      const base = inicio.current;
      if (!ativo.current || !base) return;
      const dy = (event.clientY - base.y) * sensibilidade;
      const dx = event.clientX - base.x;
      if (soNoPuxar && dy < 0) return;
      if (soNoPuxar && Math.abs(dx) > Math.abs(dy)) { ativo.current = false; setDeslocamento(0); return; }
      setDeslocamento(Math.max(0, dy));
    },
    onPointerUp: () => {
      if (ativo.current && deslocamento >= limiar) aoFechar();
      ativo.current = false;
      inicio.current = null;
      setArrastando(false);
      setDeslocamento(0);
    },
    onPointerCancel: () => { ativo.current = false; inicio.current = null; setArrastando(false); setDeslocamento(0); },
  };

  return { props, deslocamento, arrastando };
}

/**
 * Deslizar da borda esquerda para voltar, como em qualquer aplicativo.
 *
 * Só começa dentro da zona da borda (`zona` pixels), só enquanto o movimento é
 * horizontal e só quando `ativo` (existe tela anterior e a tela é de celular),
 * para não brigar com grades que rolam de lado nem com a pinça.
 */
/** Onde o deslizar da borda não pode começar: campos abertos e trilhos que já rolam de lado. */
function bordaOcupada(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return true;
  if (el.closest('[data-sem-volta]')) return true;
  if (el.closest('input, select, textarea, [contenteditable="true"], button')) return true;
  const trilho = el.closest<HTMLElement>('.scope-tabs, .chat-icebreakers, .gallery-modos, .gallery-tipos, .visor-faixa, [data-rola-x]');
  if (trilho && trilho.scrollWidth > trilho.clientWidth + 4) return true;
  return false;
}

export function useBordaVoltar({ aoVoltar, ativo = true, zona = 26, curso = 78, aoIniciar }: {
  aoVoltar: () => void;
  ativo?: boolean;
  zona?: number;
  curso?: number;
  aoIniciar?: () => void;
}): { props: PropsDePonteiro; progresso: number } {
  const [progresso, setProgresso] = useState(0);
  const base = useRef<{ x: number; y: number } | null>(null);
  const seguindo = useRef(false);

  const parar = useCallback((confirmar: boolean, dx = 0) => {
    base.current = null;
    seguindo.current = false;
    setProgresso(0);
    if (confirmar && dx >= curso) aoVoltar();
  }, [aoVoltar, curso]);

  useEffect(() => { setProgresso(0); base.current = null; seguindo.current = false; }, [ativo]);

  const props: PropsDePonteiro = {
    onPointerDown: event => {
      if (!ativo || (event.pointerType === 'mouse' && event.button !== 0)) { base.current = null; return; }
      if (event.clientX > zona || bordaOcupada(event.target)) { base.current = null; return; }
      base.current = { x: event.clientX, y: event.clientY };
      seguindo.current = false;
    },
    onPointerMove: event => {
      const inicio = base.current;
      if (!inicio) return;
      const dx = event.clientX - inicio.x;
      const dy = event.clientY - inicio.y;
      if (!seguindo.current) {
        if (dx < 8 || Math.abs(dy) > dx * 1.4) return;
        seguindo.current = true;
        try { (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId); } catch { /* captura é opcional */ }
        aoIniciar?.();
      }
      setProgresso(limitar(dx / curso, 0, 1));
    },
    onPointerUp: event => {
      const inicio = base.current;
      const dx = inicio ? event.clientX - inicio.x : 0;
      parar(seguindo.current, dx);
    },
    onPointerCancel: () => parar(false),
  };

  return { props, progresso };
}
