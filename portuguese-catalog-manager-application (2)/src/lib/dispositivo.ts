/**
 * O dedo não tem mouse pairando: em telas de toque, controles que apareciam
 * só com o hover ficam invisíveis e instruções de "arraste" não funcionam.
 * Este módulo responde se a tela atual é de toque para que os textos possam
 * ensinar o caminho alternativo (o botão ↔) em vez de mandar arrastar.
 */
import { useEffect, useState } from 'react';

/** A largura em que o aplicativo passa a usar a interface de celular. */
export const LARGURA_DO_CELULAR = 760;

/**
 * A mesma pergunta que o CSS faz em `@media (max-width: 760px)`.
 *
 * Serve para o JavaScript escolher a **forma** de um componente — painel
 * colado no botão no computador, folha que sobe do pé da tela no celular —
 * sem duplicar a regra em dois lugares com números diferentes.
 */
export function useCelula(): boolean {
  const [celula, setCelula] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const consulta = window.matchMedia(`(max-width: ${LARGURA_DO_CELULAR}px)`);
    const atualizar = () => setCelula(!!consulta.matches);
    atualizar();
    consulta.addEventListener?.('change', atualizar);
    return () => consulta.removeEventListener?.('change', atualizar);
  }, []);
  return celula;
}

export function ehToque(): boolean {
  if (typeof window === 'undefined') return false;
  const consulta = window.matchMedia;
  if (typeof consulta !== 'function') return false;
  try {
    return consulta.call(window, '(hover: none), (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** Texto de instrução para mover algo, escolhido conforme a tela. */
export function instrucaoMover(comMouse: string, noToque: string): string {
  return ehToque() ? noToque : comMouse;
}
