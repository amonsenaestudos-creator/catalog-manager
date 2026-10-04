/**
 * Modo foco — a tela só com o conteúdo.
 *
 * Existe para os momentos em que a interface atrapalha: ler uma ficha inteira,
 * passar fotos, apresentar o catálogo para alguém ou simplesmente olhar.
 * Ligado, o menu lateral, o rodapé, as estatísticas e as barras secundárias
 * saem da frente; o que resta é a própria tela, com o botão para voltar.
 *
 * A escolha é lembrada entre sessões (localStorage) e viaja numa classe no
 * `<html>` — o CSS não precisa saber de React para esconder o que sai, e o
 * teste consegue verificar a regra sem abrir um navegador de verdade.
 */

import { useCallback, useEffect, useState } from 'react';

export const CHAVE_DO_FOCO = 'catalog_modo_foco';
export const CLASSE_DO_FOCO = 'foco';

export function lerModoFoco(): boolean {
  try {
    return localStorage.getItem(CHAVE_DO_FOCO) === '1';
  } catch {
    return false;
  }
}

export function gravarModoFoco(ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(CHAVE_DO_FOCO, '1');
    else localStorage.removeItem(CHAVE_DO_FOCO);
  } catch {
    /* preferência é opcional */
  }
}

/** Só mexe no documento: quem quiser o estado usa o hook. */
export function aplicarModoFoco(ativo: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(CLASSE_DO_FOCO, ativo);
}

/** O rótulo do botão, que alterna com o estado. */
export const rotuloDoFoco = (ativo: boolean) => ativo ? 'Sair do modo foco' : 'Entrar no modo foco';

export function useModoFoco(): { foco: boolean; alternar: () => void; definir: (valor: boolean) => void } {
  const [foco, setFoco] = useState(lerModoFoco);

  useEffect(() => {
    aplicarModoFoco(foco);
    gravarModoFoco(foco);
  }, [foco]);

  const definir = useCallback((valor: boolean) => setFoco(!!valor), []);
  const alternar = useCallback(() => setFoco(valor => !valor), []);
  return { foco, alternar, definir };
}
