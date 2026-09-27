/**
 * A voz falada do catálogo, por cima do `speechSynthesis` do navegador.
 *
 * Nada de áudio gravado aqui: quem fala é o próprio aparelho, com a voz do
 * sistema escolhida. O tom e o ritmo vêm do perfil da ficha, então cada pessoa
 * soa diferente — e sempre igual, mesmo depois de fechar o aplicativo.
 *
 * Em navegador sem suporte (ou nos testes) tudo vira no-op e devolve `false`.
 */
import type { PerfilDeVoz } from '../../types';
import { formatarDuracao } from './voz';
import type { VozNota } from '../../types';

type Fala = {
  texto: string;
  /** Perfil salvo na ficha ou a voz automática. */
  perfil?: PerfilDeVoz | null;
  /** Volume de 0 a 1 (padrão: o do aparelho). */
  volume?: number;
  /** Chamado quando termina (ou quando é interrompida). */
  aoTerminar?: () => void;
  /** Aviso de progresso em 0 a 1, quando o aparelho informa os limites. */
  aoProgredir?: (progresso: number, restante: number) => void;
};

const sintese = () => (typeof window === 'undefined' ? undefined : window.speechSynthesis);

export function vozSuportada() {
  return !!sintese() && typeof window.SpeechSynthesisUtterance === 'function';
}

/** Vozes do sistema, com as de português na frente — é um app em pt-BR. */
export function vozesDisponiveis(): SpeechSynthesisVoice[] {
  const todas = sintese()?.getVoices?.() || [];
  const peso = (voz: SpeechSynthesisVoice) => (voz.lang?.toLowerCase().startsWith('pt-br') ? 0 : voz.lang?.toLowerCase().startsWith('pt') ? 1 : voz.lang?.toLowerCase().startsWith('es') ? 2 : 3);
  return [...todas].sort((a, b) => peso(a) - peso(b) || a.name.localeCompare(b.name));
}

export const idiomaPreferido = () => (typeof navigator === 'undefined' ? 'pt-BR' : navigator.language || 'pt-BR');

/**
 * Escolhe a voz: a que a ficha salvou, senão a primeira de português do Brasil.
 * Quando o sistema ainda não carregou a lista, devolve nulo e o navegador
 * decide sozinho — melhor do que travar a fala.
 */
export function escolherVoz(perfil?: PerfilDeVoz | null) {
  const vozes = vozesDisponiveis();
  if (!vozes.length) return null;
  if (perfil?.voz) {
    const salva = vozes.find(voz => voz.name === perfil.voz);
    if (salva) return salva;
  }
  return vozes.find(voz => voz.lang?.toLowerCase().startsWith('pt-br')) || vozes.find(voz => voz.lang?.toLowerCase().startsWith('pt')) || vozes[0];
}

/** Interrompe a fala em andamento (trocar de assunto não espera a vez). */
export function pararDeFalar() {
  const api = sintese();
  if (!api) return;
  try { api.cancel(); } catch { /* nada para cancelar */ }
}

export function falando() {
  const api = sintese();
  try { return !!api?.speaking; } catch { return false; }
}

/**
 * Fala um texto. Devolve `false` quando o aparelho não sabe falar, para a tela
 * poder explicar em vez de ficar muda sem avisar.
 */
export function falar({ texto, perfil, volume, aoTerminar, aoProgredir }: Fala) {
  const api = sintese();
  if (!api || !texto.trim() || typeof window.SpeechSynthesisUtterance !== 'function') return false;
  pararDeFalar();
  const fala = new window.SpeechSynthesisUtterance(texto.slice(0, 1200));
  const voz = escolherVoz(perfil);
  if (voz) { fala.voice = voz; fala.lang = voz.lang; }
  else fala.lang = idiomaPreferido();
  const tom = perfil?.tom ?? 1, ritmo = perfil?.ritmo ?? 1;
  fala.pitch = Math.max(0, Math.min(2, tom));
  fala.rate = Math.max(0.1, Math.min(3, ritmo));
  if (typeof volume === 'number') fala.volume = Math.max(0, Math.min(1, volume));
  const encerrar = () => { aoTerminar?.(); };
  fala.onend = encerrar;
  fala.onerror = encerrar;
  if (aoProgredir) fala.onboundary = evento => {
    const restante = Math.max(0, texto.length - (evento.charIndex || 0));
    aoProgredir(Math.min(1, (evento.charIndex || 0) / Math.max(1, texto.length)), restante);
  };
  try { api.speak(fala); } catch { return false; }
  return true;
}

/**
 * Quanto tempo, mais ou menos, ela leva para falar um texto — usado no chat
 * para não abrir a boca antes da hora e para a barra de progresso ter régua.
 */
export const duracaoEstimada = (texto: string, ritmo = 1) => formatarDuracao(((texto || '').length / 14) / Math.max(0.5, ritmo));

/** Rótulo curto para a lista de vozes do sistema. */
export const rotuloDaVoz = (voz: SpeechSynthesisVoice) => `${voz.name} · ${voz.lang}${voz.localService ? '' : ' (online)'}`;

/** Nota de voz, em segundos, para o resumo da tela. */
export const duracaoDaNota = (nota: Pick<VozNota, 'duracao'>) => formatarDuracao(nota.duracao || 0);
