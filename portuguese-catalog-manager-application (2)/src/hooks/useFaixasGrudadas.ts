import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { medirFaixasDoTopo } from '../lib/galeria';

/**
 * Medidas das faixas que grudam no topo da tela.
 *
 * `position: sticky` não sabe o tamanho do sticky vizinho: a barra de ferramentas
 * precisa da altura das abas para não subir por cima delas, e o título de cada dia
 * precisa da altura das duas para não desaparecer atrás da barra. O gancho mede as
 * duas e devolve o `style` com os números em pixels; o CSS tem reserva parecida e,
 * sem medida (teste, impressora), fica com a reserva.
 */
export function useFaixasGrudadas(pagina: RefObject<HTMLElement | null>, marcas: unknown[] = []): CSSProperties {
  const [faixas, setFaixas] = useState({ escopo: 0, barra: 0 });
  useEffect(() => {
    const medir = () => {
      const nova = medirFaixasDoTopo(pagina.current);
      setFaixas(atual => (atual.escopo === nova.escopo && atual.barra === nova.barra ? atual : nova));
    };
    medir();
    let observador: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        observador = new ResizeObserver(medir);
        const faixa = pagina.current?.querySelector('.gallery-topo');
        const abas = pagina.current?.querySelector('.scope-tabs');
        if (faixa) observador.observe(faixa);
        if (abas) observador.observe(abas);
      } catch { observador = null; }
    }
    window.addEventListener('resize', medir);
    return () => { observador?.disconnect(); window.removeEventListener('resize', medir); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, marcas);
  return {
    '--altura-escopo': faixas.escopo ? `${faixas.escopo}px` : undefined,
    '--altura-barra': faixas.barra ? `${faixas.barra}px` : undefined,
  } as CSSProperties;
}
