/**
 * O Catalog como aplicativo instalado: casca offline e botão de instalar.
 *
 * Este arquivo é o único lugar que conversa com service worker e com o
 * `beforeinstallprompt`. Nada de domínio mora aqui: o catálogo continua
 * salvando no IndexedDB, com ou sem internet.
 */
import { useEffect, useState } from 'react';

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const PREFERENCIA_INSTALAR = 'catalog_instalar_dispensado';

export function registrarServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Em desenvolvimento o service worker serviria a casca antiga a cada mudança.
  if (import.meta.env.DEV) return;
  // `BASE_URL` acompanha o base do Vite: funciona na raiz e em subpasta.
  const registrar = () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined); };
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}

const rodandoInstalado = () => typeof window !== 'undefined' && (
  !!window.matchMedia?.('(display-mode: standalone)').matches
  || !!window.matchMedia?.('(display-mode: minimal-ui)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true
);

export interface StatusDoApp {
  /** Falso quando o navegador avisa que perdeu a conexão. */
  online: boolean;
  /** O navegador ofereceu instalar o aplicativo agora. */
  instalavel: boolean;
  /** Já está rodando como aplicativo instalado. */
  instalado: boolean;
  /** Abre a caixa de instalação do navegador. */
  instalar: () => Promise<boolean>;
}

export function useStatusDoApp(): StatusDoApp {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [oferta, setOferta] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(rodandoInstalado);

  useEffect(() => {
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    const guardarOferta = (evento: Event) => { evento.preventDefault(); setOferta(evento as EventoDeInstalacao); };
    const confirmar = () => { setInstalado(true); setOferta(null); };
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    window.addEventListener('beforeinstallprompt', guardarOferta);
    window.addEventListener('appinstalled', confirmar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
      window.removeEventListener('beforeinstallprompt', guardarOferta);
      window.removeEventListener('appinstalled', confirmar);
    };
  }, []);

  const instalar = async () => {
    if (!oferta) return false;
    await oferta.prompt();
    const escolha = await oferta.userChoice;
    setOferta(null);
    if (escolha.outcome === 'accepted') setInstalado(true);
    return escolha.outcome === 'accepted';
  };

  return { online, instalavel: !!oferta && !instalado, instalado, instalar };
}

/** “Agora não” vale só para esta sessão: amanhã o convite pode voltar. */
export function instalacaoDispensada() {
  try { return sessionStorage.getItem(PREFERENCIA_INSTALAR) === '1'; } catch { return false; }
}

export function dispensarInstalacao() {
  try { sessionStorage.setItem(PREFERENCIA_INSTALAR, '1'); } catch { /* preferência é opcional */ }
}
