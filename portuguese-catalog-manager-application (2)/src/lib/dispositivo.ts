/**
 * O dedo não tem mouse pairando: em telas de toque, controles que apareciam
 * só com o hover ficam invisíveis e instruções de "arraste" não funcionam.
 * Este módulo responde se a tela atual é de toque para que os textos possam
 * ensinar o caminho alternativo (o botão ↔) em vez de mandar arrastar.
 */
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
