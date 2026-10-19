/**
 * A tela do editor: quanto da foto cabe no palco, o que já está desenhado e o
 * que a base pronta consegue responder (as cores da foto e as miniaturas dos
 * filtros).
 *
 * Mora fora do editor porque é a parte que fala com o canvas e com o
 * ResizeObserver, enquanto o resto fala com a receita. Duas regras valem nota:
 *
 *   · **A base só é refeita quando a foto muda de forma ou de luz** — nunca a
 *     cada traço do dedo. O que o gesto pede é `compor`, que desenha as marcas
 *     por cima da base pronta; refazer a base a cada movimento custaria uma
 *     decodificação e um redimensionamento por frame no aparelho.
 *   · **Sem canvas, `semTela` fica verdadeiro** e quem chama mostra a foto
 *     original por cima com um aviso, em vez de um retângulo preto.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { FILTROS_PRONTOS, limitar } from '../edicao';
import type { Edicao, Marca, Ponto, Tamanho } from '../edicao';
import {
  comporTela, corNaTela, desenharBase, miniaturaDeAjustes, novoCanvas, paletaDaTela,
} from '../tela';

export interface TelaDoEditor {
  /** O espaço disponível: é ele que diz quantos pixels a foto pode ocupar. */
  palco: RefObject<HTMLDivElement | null>;
  /** O canvas visível, onde o dedo desenha. */
  tela: RefObject<HTMLCanvasElement | null>;
  /** `0` enquanto o palco não foi medido — quem usa espera esse sinal. */
  escala: number;
  /** O tamanho da moldura em pixels de tela (CSS, sem o `devicePixelRatio`). */
  caixa: Tamanho;
  /** Desenha as marcas (e o rascunho do gesto) por cima da base pronta. */
  compor: (marcas?: Marca[], extra?: Marca | null) => void;
  /** A cor de um ponto da foto, em pixels da saída — o conta-gotas. */
  corDaBase: (ponto: Ponto) => string | null;
  paleta: string[];
  miniaturas: Record<string, string>;
  semTela: boolean;
}

export default function useTelaDoEditor(
  imagem: HTMLImageElement | null,
  edicao: Edicao,
  saida: Tamanho,
): TelaDoEditor {
  const palco = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const chaveDaBaseAnterior = useRef('');
  const [medida, setMedida] = useState({ largura: 0, altura: 0 });
  const [paleta, setPaleta] = useState<string[]>([]);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [semTela, setSemTela] = useState(false);

  // O palco muda de tamanho quando a janela muda, quando o painel abre no
  // celular e quando a foto gira: medir de novo é o que mantém a moldura certa.
  useEffect(() => {
    const alvo = palco.current;
    if (!alvo) return;
    const medir = () => setMedida({ largura: alvo.clientWidth, altura: alvo.clientHeight });
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [imagem]);

  // Até 2× de resolução: acima disso o canvas pesa mais do que o olho agradece.
  const dpr = useMemo(() => limitar(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1, 2), []);
  const escala = useMemo(() => {
    if (!(medida.largura > 0) || !(medida.altura > 0) || !(saida.largura > 0) || !(saida.altura > 0)) return 0;
    return Math.min(medida.largura / saida.largura, medida.altura / saida.altura);
  }, [medida, saida]);
  const caixa = useMemo<Tamanho>(() => ({
    largura: Math.max(1, Math.round(saida.largura * escala)),
    altura: Math.max(1, Math.round(saida.altura * escala)),
  }), [saida, escala]);
  const escalaTela = escala * dpr;

  const compor = useCallback((marcas?: Marca[], extra?: Marca | null) => {
    comporTela(tela.current, base.current, marcas ?? edicao.marcas, escalaTela, extra ?? null, edicao.formato);
  }, [edicao.marcas, edicao.formato, escalaTela]);

  const corDaBase = useCallback(
    (ponto: Ponto) => corNaTela(base.current, { x: ponto.x * escalaTela, y: ponto.y * escalaTela }),
    [escalaTela],
  );

  const chaveDaBase = `${saida.largura}x${saida.altura}|${caixa.largura}|${JSON.stringify(edicao.geometria)}|${JSON.stringify(edicao.ajustes)}|${edicao.formato}`;
  useEffect(() => {
    if (!imagem || !(escala > 0)) return;
    if (chaveDaBaseAnterior.current !== chaveDaBase) {
      chaveDaBaseAnterior.current = chaveDaBase;
      const camada = novoCanvas(Math.round(caixa.largura * dpr), Math.round(caixa.altura * dpr));
      base.current = camada;
      setSemTela(!camada || !desenharBase(camada, imagem, edicao, escalaTela));
    }
    const visivel = tela.current;
    if (visivel) {
      visivel.width = Math.max(1, Math.round(caixa.largura * dpr));
      visivel.height = Math.max(1, Math.round(caixa.altura * dpr));
    }
    compor();
  }, [imagem, escala, dpr, caixa.largura, caixa.altura, chaveDaBase, edicao, escalaTela, compor]);

  // A paleta e as miniaturas são leitura da base pronta. A luz fica de fora da
  // conta: mexer no brilho não muda quais cores a foto tem.
  useEffect(() => {
    if (!imagem || !(escala > 0) || !base.current) return;
    setPaleta(paletaDaTela(base.current));
    const mini: Record<string, string> = {};
    for (const filtro of FILTROS_PRONTOS) {
      const url = miniaturaDeAjustes(imagem, edicao, filtro.ajustes, 64);
      if (url) mini[filtro.id] = url;
    }
    setMiniaturas(mini);
  }, [imagem, escala, saida.largura, saida.altura]);

  return { palco, tela, escala, caixa, compor, corDaBase, paleta, miniaturas, semTela };
}
