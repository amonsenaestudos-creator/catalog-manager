/**
 * Sons de interface sintetizados na hora com Web Audio.
 * Nenhum arquivo de áudio é baixado: cada som é uma pequena receita de osciladores e ruído filtrado.
 * As regras de silêncio (desligado nos Ajustes, "reduzir animações", disfarce, pânico e privacidade)
 * ficam concentradas em `configureSound`, chamado pelo CatalogProvider.
 */
export type SoundName =
  | 'pop' | 'like' | 'pass' | 'thud' | 'achievement' | 'levelup' | 'shutter' | 'unlock' | 'error'
  | 'swoosh' | 'success' | 'tick' | 'disco' | 'mood1' | 'mood2' | 'mood3' | 'mood4' | 'mood5';

interface SoundState { enabled: boolean; muted: boolean; volume: number }
const state: SoundState = { enabled: true, muted: false, volume: 0.55 };
let context: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed: Partial<Record<SoundName, number>> = {};
let plays = 0;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
const audioConstructor = () => (typeof window === 'undefined' ? undefined : window.AudioContext || (window as AudioWindow).webkitAudioContext);

/** Diz se o navegador consegue tocar os sons. Nos testes (jsdom) a resposta é "não" e tudo vira no-op. */
export function soundAvailable() { return !!audioConstructor(); }
export function configureSound(next: Partial<SoundState>) {
  Object.assign(state, next);
  if (master && context) master.gain.setTargetAtTime(state.volume, context.currentTime, 0.01);
}
export function soundSettings() { return { ...state }; }
/** Quantos sons já foram disparados de verdade (útil para testes e para o botão "ouvir"). */
export function soundPlayCount() { return plays; }

function ensureContext(): AudioContext | null {
  const Ctor = audioConstructor();
  if (!Ctor) return null;
  try {
    if (!context) {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = state.volume;
      master.connect(context.destination);
    }
    // Sem gesto do usuário o navegador mantém o contexto suspenso: pedimos para retomar e pulamos este som,
    // em vez de acumular uma rajada que tocaria toda de uma vez depois.
    if (context.state !== 'running') { void context.resume().catch(() => undefined); return null; }
    return context;
  } catch { return null; }
}

/** Aquece o contexto no primeiro toque para o primeiro "pop" não atrasar. Seguro chamar várias vezes. */
export function primeSound() {
  if (typeof document === 'undefined' || !state.enabled) return;
  const warm = () => { ensureContext(); document.removeEventListener('pointerdown', warm); document.removeEventListener('keydown', warm); };
  document.addEventListener('pointerdown', warm, { once: true });
  document.addEventListener('keydown', warm, { once: true });
}

interface ToneOptions { freq: number; to?: number; start: number; duration: number; type?: OscillatorType; gain?: number; attack?: number }
function tone(ctx: AudioContext, out: AudioNode, { freq, to, start, duration, type = 'sine', gain = 0.2, attack = 0.006 }: ToneOptions) {
  const osc = ctx.createOscillator(), env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env); env.connect(out);
  osc.start(start); osc.stop(start + duration + 0.03);
}
interface NoiseOptions { start: number; duration: number; gain?: number; from: number; to: number; type?: BiquadFilterType }
function noise(ctx: AudioContext, out: AudioNode, { start, duration, gain = 0.15, from, to, type = 'bandpass' }: NoiseOptions) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource(); source.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = type; filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(from, start); filter.frequency.exponentialRampToValueAtTime(to, start + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter); filter.connect(env); env.connect(out);
  source.start(start); source.stop(start + duration + 0.03);
}

const RECIPES: Record<SoundName, (ctx: AudioContext, out: AudioNode, t: number) => void> = {
  // Coração na foto: um "pop" curto e redondo.
  pop: (ctx, out, t) => tone(ctx, out, { freq: 620, to: 980, start: t, duration: 0.07, gain: 0.22 }),
  // Swipe para a direita: duas notas subindo.
  like: (ctx, out, t) => { tone(ctx, out, { freq: 660, start: t, duration: 0.09, type: 'triangle', gain: 0.18 }); tone(ctx, out, { freq: 990, start: t + 0.08, duration: 0.14, type: 'triangle', gain: 0.18 }); },
  // Swipe para a esquerda: um "whoosh" de ar descendo.
  pass: (ctx, out, t) => noise(ctx, out, { start: t, duration: 0.2, from: 1400, to: 260, gain: 0.16 }),
  // Escolha no duelo: batida grave.
  thud: (ctx, out, t) => { tone(ctx, out, { freq: 170, to: 55, start: t, duration: 0.16, gain: 0.35 }); noise(ctx, out, { start: t, duration: 0.05, from: 900, to: 300, gain: 0.08, type: 'lowpass' }); },
  // Conquista: arpejo em dó maior.
  achievement: (ctx, out, t) => [523, 659, 784, 1047].forEach((freq, index) => tone(ctx, out, { freq, start: t + index * 0.09, duration: 0.32, type: 'triangle', gain: 0.16 })),
  // Subiu de nível: fanfarra de quatro notas com uma oitava abaixo de apoio.
  levelup: (ctx, out, t) => {
    const notes: [number, number, number][] = [[392, 0, 0.13], [523, 0.13, 0.13], [659, 0.26, 0.13], [784, 0.39, 0.5]];
    for (const [freq, offset, duration] of notes) { tone(ctx, out, { freq, start: t + offset, duration, type: 'triangle', gain: 0.17 }); tone(ctx, out, { freq: freq / 2, start: t + offset, duration, gain: 0.08 }); }
  },
  // Foto adicionada: dois cliques de obturador.
  shutter: (ctx, out, t) => { noise(ctx, out, { start: t, duration: 0.03, from: 5000, to: 2500, gain: 0.2, type: 'highpass' }); noise(ctx, out, { start: t + 0.09, duration: 0.05, from: 1800, to: 700, gain: 0.16, type: 'lowpass' }); },
  // Cofre aberto: clique mecânico e um sininho de duas notas.
  unlock: (ctx, out, t) => { noise(ctx, out, { start: t, duration: 0.03, from: 3000, to: 1200, gain: 0.12 }); tone(ctx, out, { freq: 880, start: t + 0.04, duration: 0.14, gain: 0.14 }); tone(ctx, out, { freq: 1320, start: t + 0.15, duration: 0.22, gain: 0.14 }); },
  // PIN errado: dois tons graves e abafados.
  error: (ctx, out, t) => { tone(ctx, out, { freq: 150, start: t, duration: 0.15, type: 'triangle', gain: 0.2 }); tone(ctx, out, { freq: 110, start: t + 0.12, duration: 0.22, type: 'triangle', gain: 0.2 }); },
  // Arquivar, desfazer, mover para a lixeira: deslize de ar.
  swoosh: (ctx, out, t) => noise(ctx, out, { start: t, duration: 0.15, from: 380, to: 2600, gain: 0.11 }),
  // Lembrete, meta ou desafio concluído: confirmação suave.
  success: (ctx, out, t) => { tone(ctx, out, { freq: 784, start: t, duration: 0.1, gain: 0.14 }); tone(ctx, out, { freq: 1175, start: t + 0.09, duration: 0.2, gain: 0.14 }); },
  // Roleta girando: um tique seco.
  tick: (ctx, out, t) => tone(ctx, out, { freq: 1900, to: 1500, start: t, duration: 0.025, gain: 0.1, attack: 0.002 }),
  // Código Konami: riff curto.
  disco: (ctx, out, t) => [330, 392, 440, 523, 440, 659].forEach((freq, index) => tone(ctx, out, { freq, start: t + index * 0.085, duration: 0.09, type: 'square', gain: 0.07 })),
  // Humor do diário: do tom mais grave (dia difícil) ao acorde aberto (dia ótimo).
  mood1: (ctx, out, t) => tone(ctx, out, { freq: 220, start: t, duration: 0.42, gain: 0.16 }),
  mood2: (ctx, out, t) => tone(ctx, out, { freq: 262, start: t, duration: 0.38, gain: 0.16 }),
  mood3: (ctx, out, t) => tone(ctx, out, { freq: 330, start: t, duration: 0.34, gain: 0.16 }),
  mood4: (ctx, out, t) => { tone(ctx, out, { freq: 392, start: t, duration: 0.34, gain: 0.13 }); tone(ctx, out, { freq: 494, start: t + 0.02, duration: 0.34, gain: 0.11 }); },
  mood5: (ctx, out, t) => [523, 659, 784].forEach((freq, index) => tone(ctx, out, { freq, start: t + index * 0.03, duration: 0.42, gain: 0.11 })),
};

export const SOUND_PREVIEWS: { name: SoundName; label: string }[] = [
  { name: 'pop', label: 'Pop do coração' }, { name: 'like', label: 'Swipe' }, { name: 'achievement', label: 'Conquista' }, { name: 'levelup', label: 'Subiu de nível' }, { name: 'shutter', label: 'Foto' },
];

/** Toca um som se estiver permitido. Nunca lança erro: som é enfeite, não pode derrubar a tela. */
export function playSound(name: SoundName, force = false) {
  if (!force && (!state.enabled || state.muted)) return false;
  const now = Date.now();
  if (now - (lastPlayed[name] || 0) < 45) return false;
  lastPlayed[name] = now;
  const ctx = ensureContext();
  if (!ctx || !master) return false;
  try { RECIPES[name](ctx, master, ctx.currentTime + 0.005); plays += 1; return true; } catch { return false; }
}

/** Som de humor para o diário: 1 (difícil) a 5 (ótimo). */
export function playMood(value: number) { return playSound(`mood${Math.max(1, Math.min(5, Math.round(value || 3)))}` as SoundName); }

/** Vibração curta em celulares que suportam. Silenciosa em qualquer outro lugar. */
export function vibrate(pattern: number | number[] = 12) {
  if (!state.enabled || state.muted || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* Alguns navegadores bloqueiam a vibração sem gesto do usuário. */ }
}
