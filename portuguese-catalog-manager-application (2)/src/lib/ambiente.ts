/**
 * Sons ambientes e trilhas de apresentação, sintetizados na hora com Web Audio.
 *
 * Como os sons de interface (`sound.ts`), nada é baixado: chuva, café, oceano,
 * cidade e lo-fi são receitas de ruído filtrado e osciladores suaves. O mesmo
 * vale para as quatro trilhas do modo apresentação/TV.
 *
 * Regras de silêncio: o ambiente só toca com `somAmbiente` ligado nos Ajustes,
 * respeita o mudo geral (sons desligados, disfarce, pânico, privacidade) e só
 * um som contínuo existe por vez — ligar uma trilha desliga o ambiente e
 * vice-versa. Nos testes (jsdom) tudo vira no-op que devolve `false`.
 */
import { soundAvailable, soundSettings } from './sound';
import type { SoundName } from './sound';

export type AmbienteId = 'chuva' | 'cafe' | 'oceano' | 'cidade' | 'lofi';
export type TrilhaId = 'ambiente' | 'cinematico' | 'eletronico' | 'minimalista';

export const AMBIENTES: { id: AmbienteId; nome: string; descricao: string; icone: string }[] = [
  { id: 'chuva', nome: 'Chuva', descricao: 'Chuva mansa na janela para organizar sem pressa.', icone: 'CloudRain' },
  { id: 'cafe', nome: 'Café', descricao: 'Murmúrio de cafeteria com talheres ao longe.', icone: 'Coffee' },
  { id: 'oceano', nome: 'Oceano', descricao: 'Ondas lentas indo e vindo.', icone: 'Droplets' },
  { id: 'cidade', nome: 'Cidade', descricao: 'A rua lá embaixo, você aqui em cima.', icone: 'Building2' },
  { id: 'lofi', nome: 'Lo-fi', descricao: 'Acordes macios com chiado de vinil.', icone: 'Disc3' },
];

export const TRILHAS: { id: TrilhaId; nome: string; descricao: string }[] = [
  { id: 'ambiente', nome: 'Ambiente', descricao: 'Camadas calmas que não brigam com as fotos.' },
  { id: 'cinematico', nome: 'Cinemático', descricao: 'Cordas suaves para um slideshow com drama.' },
  { id: 'eletronico', nome: 'Eletrônico', descricao: 'Pulso leve para passar rápido pelo catálogo.' },
  { id: 'minimalista', nome: 'Minimalista', descricao: 'Uma nota por vez, quase silêncio.' },
];

/**
 * Identidade sonora de cada seção: um sinal curto ao abrir a tela.
 * `null` = a seção fica em silêncio. O volume é o geral dos sons.
 */
export function efeitoDaSecao(pagina: string): SoundName | null {
  switch (pagina) {
    case 'home': return 'pagina';
    case 'gallery': return 'shutter';
    case 'add': return 'shutter';
    case 'discover': return 'descoberta';
    case 'explorar': return 'descoberta';
    case 'ranking': return 'tick';
    case 'tierlists': return 'tick';
    case 'favoritos': return 'pop';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
const audioConstructor = () => (typeof window === 'undefined' ? undefined : window.AudioContext || (window as AudioWindow).webkitAudioContext);

let contexto: AudioContext | null = null;
let mestre: GainNode | null = null;
let ruidoBranco: AudioBuffer | null = null;
let volume = 0.4;
let ativo: { tipo: 'ambiente' | 'trilha'; id: string; limpar: () => void } | null = null;

function garantirContexto(): AudioContext | null {
  const Ctor = audioConstructor();
  if (!Ctor) return null;
  try {
    if (!contexto) {
      contexto = new Ctor();
      mestre = contexto.createGain();
      mestre.gain.value = volume;
      mestre.connect(contexto.destination);
    }
    if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
    return contexto;
  } catch { return null; }
}

function ruido(ctx: AudioContext): AudioBuffer {
  if (!ruidoBranco) {
    ruidoBranco = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const canal = ruidoBranco.getChannelData(0);
    for (let i = 0; i < canal.length; i++) canal[i] = Math.random() * 2 - 1;
  }
  return ruidoBranco;
}

interface NoRuidoso { parar: () => void; ganho: GainNode; filtro: BiquadFilterNode }
/** Fonte de ruído em loop com filtro — a base de quase todos os ambientes. */
function fonteDeRuido(ctx: AudioContext, saida: AudioNode, tipo: BiquadFilterType, frequencia: number, ganho: number, q = 0.7): NoRuidoso {
  const fonte = ctx.createBufferSource();
  fonte.buffer = ruido(ctx);
  fonte.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frequencia;
  filtro.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.value = ganho;
  fonte.connect(filtro); filtro.connect(amp); amp.connect(saida);
  fonte.start();
  return { ganho: amp, filtro, parar: () => { try { fonte.stop(); } catch { /* já parada */ } fonte.disconnect(); filtro.disconnect(); amp.disconnect(); } };
}

/** LFO que balança um parâmetro de áudio entre dois valores. */
function oscilar(ctx: AudioContext, alvo: AudioParam, de: number, ate: number, hertz: number, limpar: (() => void)[]): void {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = hertz;
  const profundidade = ctx.createGain();
  profundidade.gain.value = (ate - de) / 2;
  alvo.value = (de + ate) / 2;
  lfo.connect(profundidade); profundidade.connect(alvo);
  lfo.start();
  limpar.push(() => { try { lfo.stop(); } catch { /* já parado */ } lfo.disconnect(); profundidade.disconnect(); });
}

const midi = (nota: number) => 440 * Math.pow(2, (nota - 69) / 12);

/** Acorde macio (tríade em triângulo + filtro) que nasce e morre sozinho. */
function acorde(ctx: AudioContext, saida: AudioNode, notas: number[], quando: number, duracao: number, ganho = 0.05): void {
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 1400;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, quando);
  amp.gain.exponentialRampToValueAtTime(ganho, quando + duracao * 0.3);
  amp.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  filtro.connect(amp); amp.connect(saida);
  for (const nota of notas) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midi(nota);
    osc.connect(filtro);
    osc.start(quando);
    osc.stop(quando + duracao + 0.05);
  }
}

/** Ping curto e redondo (xícara, sino distante, nota minimalista). */
function ping(ctx: AudioContext, saida: AudioNode, frequencia: number, quando: number, duracao: number, ganho = 0.05, tipo: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = tipo;
  osc.frequency.value = frequencia;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, quando);
  amp.gain.exponentialRampToValueAtTime(ganho, quando + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  osc.connect(amp); amp.connect(saida);
  osc.start(quando);
  osc.stop(quando + duracao + 0.05);
}

type Construtor = (ctx: AudioContext, saida: AudioNode, limpar: (() => void)[]) => void;

const CONSTRUTORES: Record<string, Construtor> = {
  // Chuva mansa: camada média constante + grave distante, com o filtro passeando devagar.
  chuva: (ctx, saida, limpar) => {
    const media = fonteDeRuido(ctx, saida, 'bandpass', 2600, 0.05, 0.5);
    const grave = fonteDeRuido(ctx, saida, 'lowpass', 220, 0.06);
    oscilar(ctx, media.filtro.frequency, 2000, 3400, 0.07, limpar);
    oscilar(ctx, media.ganho.gain, 0.035, 0.065, 0.05, limpar);
    limpar.push(media.parar, grave.parar);
  },
  // Café: murmúrio grave + tilintar de xícaras de vez em quando.
  cafe: (ctx, saida, limpar) => {
    const murmurio = fonteDeRuido(ctx, saida, 'lowpass', 320, 0.055);
    oscilar(ctx, murmurio.ganho.gain, 0.04, 0.075, 0.09, limpar);
    limpar.push(murmurio.parar);
    const intervalo = window.setInterval(() => {
      try {
        if (Math.random() < 0.55) return;
        const t = ctx.currentTime + 0.02;
        ping(ctx, saida, 2400 + Math.random() * 2000, t, 0.25, 0.016);
        if (Math.random() < 0.3) ping(ctx, saida, 1800 + Math.random() * 1500, t + 0.18, 0.3, 0.012);
      } catch { /* o contexto pode ter fechado no meio */ }
    }, 3400);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Oceano: ondas lentas — o ganho sobe e desce num ciclo de ~12 segundos.
  oceano: (ctx, saida, limpar) => {
    const onda = fonteDeRuido(ctx, saida, 'lowpass', 480, 0.07);
    const espuma = fonteDeRuido(ctx, saida, 'highpass', 4000, 0.012);
    oscilar(ctx, onda.ganho.gain, 0.025, 0.11, 0.08, limpar);
    oscilar(ctx, onda.filtro.frequency, 320, 700, 0.08, limpar);
    oscilar(ctx, espuma.ganho.gain, 0.006, 0.02, 0.08, limpar);
    limpar.push(onda.parar, espuma.parar);
  },
  // Cidade: zumbido baixo + trânsito distante + algum sinal raro e abafado.
  cidade: (ctx, saida, limpar) => {
    const zumbido = ctx.createOscillator();
    zumbido.type = 'sine';
    zumbido.frequency.value = 55;
    const ampZumbido = ctx.createGain();
    ampZumbido.gain.value = 0.02;
    zumbido.connect(ampZumbido); ampZumbido.connect(saida);
    zumbido.start();
    const rua = fonteDeRuido(ctx, saida, 'lowpass', 240, 0.05);
    oscilar(ctx, rua.ganho.gain, 0.03, 0.07, 0.06, limpar);
    limpar.push(() => { try { zumbido.stop(); } catch { /* já parado */ } zumbido.disconnect(); ampZumbido.disconnect(); }, rua.parar);
    const intervalo = window.setInterval(() => {
      try {
        if (Math.random() < 0.6) return;
        ping(ctx, saida, 300 + Math.random() * 220, ctx.currentTime + 0.02, 0.5, 0.014, 'triangle');
      } catch { /* contexto fechado */ }
    }, 8000);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Lo-fi: Am9 – Fmaj9 – Cmaj9 – G13 passeando devagar, com chiado de vinil.
  lofi: (ctx, saida, limpar) => {
    const vinil = fonteDeRuido(ctx, saida, 'highpass', 5500, 0.006);
    limpar.push(vinil.parar);
    const progressao = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 60, 64, 67], [55, 59, 62, 65, 69]];
    let passo = 0;
    const tocar = () => {
      try { acorde(ctx, saida, progressao[passo % progressao.length], ctx.currentTime + 0.03, 3.4, 0.05); } catch { /* contexto fechado */ }
      passo += 1;
    };
    tocar();
    const intervalo = window.setInterval(tocar, 3000);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Trilha ambiente: C – G – Am – F em camadas calmas.
  'trilha:ambiente': (ctx, saida, limpar) => {
    const progressao = [[48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]];
    let passo = 0;
    const tocar = () => {
      try { acorde(ctx, saida, progressao[passo % progressao.length], ctx.currentTime + 0.03, 4.6, 0.045); } catch { /* contexto fechado */ }
      passo += 1;
    };
    tocar();
    const intervalo = window.setInterval(tocar, 4200);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Trilha cinemática: arpejo menor com serra abafada + raiz grave.
  'trilha:cinematico': (ctx, saida, limpar) => {
    const sequencia = [57, 60, 64, 69, 72, 69, 64, 60, 53, 57, 60, 65, 69, 65, 60, 57];
    let passo = 0;
    const tocar = () => {
      try {
        const t = ctx.currentTime + 0.02;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midi(sequencia[passo % sequencia.length]);
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = 900;
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.exponentialRampToValueAtTime(0.035, t + 0.05);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(filtro); filtro.connect(amp); amp.connect(saida);
        osc.start(t); osc.stop(t + 0.7);
        if (passo % 8 === 0) ping(ctx, saida, midi(sequencia[passo % sequencia.length] - 24), t, 1.6, 0.05, 'triangle');
      } catch { /* contexto fechado */ }
      passo += 1;
    };
    tocar();
    const intervalo = window.setInterval(tocar, 460);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Trilha eletrônica: pulso a ~104 BPM com bumbo, chimbal e baixo curto.
  'trilha:eletronico': (ctx, saida, limpar) => {
    const baixo = [45, 45, 48, 43, 45, 45, 50, 48];
    let passo = 0;
    const tocar = () => {
      try {
        const t = ctx.currentTime + 0.02;
        // Bumbo: seno caindo de 120 Hz para 40 Hz.
        const bumbo = ctx.createOscillator();
        bumbo.type = 'sine';
        bumbo.frequency.setValueAtTime(120, t);
        bumbo.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        const ampBumbo = ctx.createGain();
        ampBumbo.gain.setValueAtTime(0.0001, t);
        ampBumbo.gain.exponentialRampToValueAtTime(passo % 2 === 0 ? 0.14 : 0.05, t + 0.008);
        ampBumbo.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        bumbo.connect(ampBumbo); ampBumbo.connect(saida);
        bumbo.start(t); bumbo.stop(t + 0.2);
        // Chimbal no contratempo: ruído curto e agudo.
        if (passo % 2 === 1) {
          const chimbal = ctx.createBufferSource();
          chimbal.buffer = ruido(ctx);
          const filtro = ctx.createBiquadFilter();
          filtro.type = 'highpass';
          filtro.frequency.value = 7000;
          const amp = ctx.createGain();
          amp.gain.setValueAtTime(0.03, t);
          amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          chimbal.connect(filtro); filtro.connect(amp); amp.connect(saida);
          chimbal.start(t); chimbal.stop(t + 0.08);
        }
        ping(ctx, saida, midi(baixo[Math.floor(passo / 2) % baixo.length]), t, 0.22, 0.04, 'square');
      } catch { /* contexto fechado */ }
      passo += 1;
    };
    tocar();
    const intervalo = window.setInterval(tocar, 288);
    limpar.push(() => window.clearInterval(intervalo));
  },
  // Trilha minimalista: uma nota pentatônica por vez sobre um tapete quase inaudível.
  'trilha:minimalista': (ctx, saida, limpar) => {
    const tapete = fonteDeRuido(ctx, saida, 'lowpass', 180, 0.02);
    limpar.push(tapete.parar);
    const pentatonica = [69, 72, 74, 76, 79, 81, 84];
    let anterior = 3;
    const tocar = () => {
      try {
        anterior = Math.max(0, Math.min(pentatonica.length - 1, anterior + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.8 ? 1 : 2)));
        ping(ctx, saida, midi(pentatonica[anterior]), ctx.currentTime + 0.03, 2.2, 0.05);
      } catch { /* contexto fechado */ }
    };
    tocar();
    const intervalo = window.setInterval(tocar, 3400);
    limpar.push(() => window.clearInterval(intervalo));
  },
};

function podeTocar(): boolean {
  if (!soundAvailable()) return false;
  const estado = soundSettings();
  return estado.enabled && !estado.muted;
}

function iniciar(tipo: 'ambiente' | 'trilha', id: string): boolean {
  try {
    if (!podeTocar()) return false;
    const ctx = garantirContexto();
    if (!ctx || !mestre) return false;
    parar();
    const chave = tipo === 'trilha' ? `trilha:${id}` : id;
    const construir = CONSTRUTORES[chave];
    if (!construir) return false;
    const saidas: (() => void)[] = [];
    construir(ctx, mestre, saidas);
    ativo = { tipo, id, limpar: () => { for (const fn of saidas) { try { fn(); } catch { /* limpeza parcial */ } } } };
    return true;
  } catch { return false; }
}

function parar(): void {
  if (!ativo) return;
  try { ativo.limpar(); } catch { /* som é enfeite */ }
  ativo = null;
}

/** Começa um ambiente contínuo (chuva, café...). Desliga qualquer trilha. */
export function iniciarAmbiente(id: AmbienteId): boolean {
  return iniciar('ambiente', id);
}

/** Começa uma trilha de apresentação. Desliga qualquer ambiente. */
export function iniciarTrilha(id: TrilhaId): boolean {
  return iniciar('trilha', id);
}

export function pararAmbiente(): void {
  if (ativo?.tipo === 'ambiente') parar();
}

export function pararTrilha(): void {
  if (ativo?.tipo === 'trilha') parar();
}

/** Para tudo (privacidade, pânico, disfarce, logout). */
export function pararSomContinuo(): void {
  parar();
}

export function ambienteAtivo(): AmbienteId | null {
  return ativo?.tipo === 'ambiente' ? (ativo.id as AmbienteId) : null;
}

export function trilhaAtiva(): TrilhaId | null {
  return ativo?.tipo === 'trilha' ? (ativo.id as TrilhaId) : null;
}

/** Volume dos sons contínuos, de 0 a 1. */
export function definirVolumeAmbiente(valor: number): void {
  volume = Math.max(0, Math.min(1, valor));
  try {
    if (mestre && contexto) mestre.gain.setTargetAtTime(volume, contexto.currentTime, 0.05);
  } catch { /* sem contexto ainda */ }
}

/**
 * Suspende o contexto quando o app entra em modo silencioso (disfarce, pânico,
 * privacidade) e retoma ao sair — sem precisar religar o ambiente.
 */
export function suspenderAmbiente(mudo: boolean): void {
  try {
    if (!contexto) return;
    if (mudo && contexto.state === 'running') void contexto.suspend().catch(() => undefined);
    else if (!mudo && contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
  } catch { /* sem áudio neste navegador */ }
}
