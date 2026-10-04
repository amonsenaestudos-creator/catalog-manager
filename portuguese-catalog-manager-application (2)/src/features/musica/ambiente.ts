/**
 * Música ambiente gerada no próprio site.
 *
 * Nada é baixado e nada sai do aplicativo: cada clima é uma receita de áudio
 * contínuo montada na hora com Web Audio — ruído filtrado para chuva, mar e
 * cidade, camadas tonais para o lo-fi. Depois de começar, o som **continua
 * tocando enquanto a pessoa navega**, porque quem manda no áudio é este módulo,
 * não a tela que o ligou.
 *
 * Regras que valem aqui:
 * 1. Um clima por vez. Ligar outro desmonta o anterior — nunca dois ambientes
 *    somados.
 * 2. O contexto de áudio nasce no gesto da pessoa (política dos navegadores):
 *    fora de um clique, o pedido fica pendente e começa no primeiro toque.
 * 3. Se o navegador não tiver Web Audio (nos testes, por exemplo), tudo vira
 *    no-op e a interface é avisada — nada quebra.
 */
import type { SoundName } from '../../lib/sound';

export type ClimaDoAmbiente = 'chuva' | 'cafe' | 'oceano' | 'cidade' | 'lofi';

/** Os climas que o site sabe tocar sozinho. */
export const AMBIENTES_SUPORTADOS: ClimaDoAmbiente[] = ['chuva', 'cafe', 'oceano', 'cidade', 'lofi'];

export function ehClimaSuportado(id: string): id is ClimaDoAmbiente {
  return (AMBIENTES_SUPORTADOS as string[]).includes(id);
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
const AudioCtor = () => (typeof window === 'undefined' ? undefined : window.AudioContext || (window as AudioWindow).webkitAudioContext);

/* ------------------------------------------------------------------- estado -- */

let contexto: AudioContext | null = null;
let mestre: GainNode | null = null;
let desmontarAtual: (() => void) | null = null;
let climaAtual: ClimaDoAmbiente | null = null;
let volumeAtual = 0.4;
/** Pedido pendente: começa no primeiro gesto, quando o navegador exigir. */
let pendente: ClimaDoAmbiente | null = null;
const ouvintes = new Set<(clima: ClimaDoAmbiente | null) => void>();

function avisar() { for (const ouvinte of ouvintes) { try { ouvinte(climaAtual); } catch { /* ouvinte quebrado não derruba o som */ } } }
export function aoMudarAmbiente(ouvinte: (clima: ClimaDoAmbiente | null) => void) { ouvintes.add(ouvinte); return () => { ouvintes.delete(ouvinte); }; }
export function ambienteTocando(): ClimaDoAmbiente | null { return climaAtual; }
export function ambientePendente(): ClimaDoAmbiente | null { return pendente; }
export function volumeDoAmbiente() { return Math.round(volumeAtual * 100); }
export function ambienteDisponivel() { return !!AudioCtor(); }

export function definirVolumeDoAmbiente(percentual: number) {
  volumeAtual = Math.max(0, Math.min(1, (Number.isFinite(percentual) ? percentual : 40) / 100));
  if (mestre && contexto) { try { mestre.gain.setTargetAtTime(volumeAtual, contexto.currentTime, 0.05); } catch { /* sem rampa, sem drama */ } }
}

/* -------------------------------------------------------------------- áudio -- */

function garantirsContexto(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  try {
    if (!contexto) {
      contexto = new Ctor();
      mestre = contexto.createGain();
      mestre.gain.value = volumeAtual;
      mestre.connect(contexto.destination);
    }
    return contexto;
  } catch { return null; }
}

function ruido(ctx: AudioContext, tipo: 'branco' | 'rosa' | 'marrom', segundos = 3) {
  const comprimento = Math.max(1, Math.floor(ctx.sampleRate * segundos));
  const buffer = ctx.createBuffer(1, comprimento, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  let ultimo = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < comprimento; i++) {
    const branco = Math.random() * 2 - 1;
    if (tipo === 'branco') dados[i] = branco;
    else if (tipo === 'marrom') { ultimo = (ultimo + 0.02 * branco) / 1.02; dados[i] = ultimo * 3.5; }
    else {
      // Rosa: três pólos, receita clássica de Voss — mais quente que o branco.
      b0 = 0.99765 * b0 + branco * 0.0990460; b1 = 0.96300 * b1 + branco * 0.2965164; b2 = 0.57000 * b2 + branco * 1.0526913;
      dados[i] = (b0 + b1 + b2 + branco * 0.1848) * 0.22;
    }
  }
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer; fonte.loop = true;
  return fonte;
}

function filtro(ctx: AudioContext, tipo: BiquadFilterType, freq: number, q = 0.7) {
  const node = ctx.createBiquadFilter();
  node.type = tipo; node.frequency.value = freq; node.Q.value = q;
  return node;
}

/** Oscilador contínuo usado para modular um parâmetro (o "respiro" do clima). */
function modulador(ctx: AudioContext, frequencia: number, profundidade: number, alvo: AudioParam, central: number) {
  const osc = ctx.createOscillator(), ganho = ctx.createGain();
  osc.frequency.value = frequencia; ganho.gain.value = profundidade;
  alvo.value = central;
  osc.connect(ganho); ganho.connect(alvo); osc.start();
  return () => { try { osc.stop(); } catch { /* pode já estar parado */ } };
}

/** Ramal de volume: cada camada entra por ele, para poder sair sem cortar as outras. */
function canal(ctx: AudioContext, saida: AudioNode, ganho: number) {
  const node = ctx.createGain();
  node.gain.value = ganho; node.connect(saida);
  return node;
}

/** Toca um som curto por dentro do ambiente (uma xícara, um carro ao longe). */
function pipo(ctx: AudioContext, saida: AudioNode, { freq, duracao, ganho, tipo = 'sine' }: { freq: number; duracao: number; ganho: number; tipo?: OscillatorType }) {
  const agora = ctx.currentTime;
  const osc = ctx.createOscillator(), env = ctx.createGain();
  osc.type = tipo; osc.frequency.setValueAtTime(freq, agora);
  env.gain.setValueAtTime(0.0001, agora);
  env.gain.exponentialRampToValueAtTime(ganho, agora + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);
  osc.connect(env); env.connect(saida);
  osc.start(agora); osc.stop(agora + duracao + 0.05);
}

/** Barulho curto: um estalo de vinil, um farfalhar da chuva. */
function estalo(ctx: AudioContext, saida: AudioNode, { duracao = 0.03, ganho = 0.05, de, para }: { duracao?: number; ganho?: number; de: number; para: number }) {
  const agora = ctx.currentTime;
  const fonte = ruido(ctx, 'branco', duracao);
  const filtroNode = filtro(ctx, 'bandpass', de, 0.8);
  filtroNode.frequency.setValueAtTime(de, agora);
  filtroNode.frequency.exponentialRampToValueAtTime(Math.max(60, para), agora + duracao);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, agora);
  env.gain.exponentialRampToValueAtTime(ganho, agora + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);
  fonte.connect(filtroNode); filtroNode.connect(env); env.connect(saida);
  fonte.start(agora); fonte.stop(agora + duracao + 0.05);
}

interface Receita { montar: (ctx: AudioContext, saida: AudioNode) => () => void }

/**
 * As receitas. Cada uma devolve como se desmonta: parar osciladores, limpar
 * temporizadores e desconectar o que ficou. Ambiente que não desmonta vira
 * música fantasma depois de trocar de clima.
 */
const RECEITAS: Record<ClimaDoAmbiente, Receita> = {
  // Chuva: chuvisco contínuo (branco filtrado) e um respiro lento no volume.
  chuva: { montar: (ctx, saida) => {
    const canalChuva = canal(ctx, saida, 0.20);
    const fonte = ruido(ctx, 'branco', 4);
    const passaAlto = filtro(ctx, 'highpass', 480); const passaBaixo = filtro(ctx, 'lowpass', 7200);
    fonte.connect(passaAlto); passaAlto.connect(passaBaixo); passaBaixo.connect(canalChuva); fonte.start();
    const respiro = modulador(ctx, 0.08, 0.05, canalChuva.gain, 0.20);
    const chuveiro = canal(ctx, saida, 0.05);
    const fonte2 = ruido(ctx, 'rosa', 4); const faixa = filtro(ctx, 'bandpass', 2200, 0.5);
    fonte2.connect(faixa); faixa.connect(chuveiro); fonte2.start();
    const respiro2 = modulador(ctx, 0.13, 0.02, chuveiro.gain, 0.05);
    return () => { try { fonte.stop(); fonte2.stop(); } catch { /* já parado */ } respiro(); respiro2(); };
  } },

  // Oceano: marrom grave, filtro que abre e fecha como a maré.
  oceano: { montar: (ctx, saida) => {
    const canalMar = canal(ctx, saida, 0.28);
    const fonte = ruido(ctx, 'marrom', 5);
    const passaBaixo = filtro(ctx, 'lowpass', 700, 0.6);
    fonte.connect(passaBaixo); passaBaixo.connect(canalMar); fonte.start();
    const mare = modulador(ctx, 0.05, 340, passaBaixo.frequency, 700);
    const swell = modulador(ctx, 0.06, 0.12, canalMar.gain, 0.28);
    const espuma = canal(ctx, saida, 0.04);
    const fonte2 = ruido(ctx, 'branco', 4); const agudo = filtro(ctx, 'highpass', 3000);
    fonte2.connect(agudo); agudo.connect(espuma); fonte2.start();
    const vaiven = modulador(ctx, 0.09, 0.03, espuma.gain, 0.04);
    return () => { try { fonte.stop(); fonte2.stop(); } catch { /* já parado */ } mare(); swell(); vaiven(); };
  } },

  // Café: rumor de salão (marrom abafado) com conversas distantes e uma xícara.
  cafe: { montar: (ctx, saida) => {
    const sala = canal(ctx, saida, 0.11);
    const fonte = ruido(ctx, 'marrom', 5);
    fonte.connect(filtro(ctx, 'lowpass', 420)); fonte.connect(sala);
    const fonte2 = ruido(ctx, 'rosa', 4); const vozes = filtro(ctx, 'bandpass', 420, 0.9);
    fonte2.connect(vozes); vozes.connect(canal(ctx, saida, 0.045));
    fonte.start(); fonte2.start();
    const conversa = window.setInterval(() => {
      if (Math.random() < 0.55) {
        const base = 220 + Math.random() * 260;
        estalo(ctx, saida, { duracao: 0.18 + Math.random() * 0.2, ganho: 0.03, de: base, para: base * 1.6 });
      }
    }, 2600);
    const louca = window.setInterval(() => { if (Math.random() < 0.4) pipo(ctx, saida, { freq: 1500 + Math.random() * 700, duracao: 0.12, ganho: 0.03, tipo: 'triangle' }); }, 7000);
    return () => { try { fonte.stop(); fonte2.stop(); } catch { /* já parado */ } window.clearInterval(conversa); window.clearInterval(louca); };
  } },

  // Cidade: rumor grave, um zumbido de rede elétrica e carros passando ao longe.
  cidade: { montar: (ctx, saida) => {
    const canalRua = canal(ctx, saida, 0.14);
    const fonte = ruido(ctx, 'marrom', 5);
    fonte.connect(filtro(ctx, 'lowpass', 240)); fonte.connect(canalRua);
    const fonte2 = ruido(ctx, 'rosa', 4);
    const vento = filtro(ctx, 'bandpass', 800, 0.6);
    fonte2.connect(vento); vento.connect(canal(ctx, saida, 0.035));
    fonte.start(); fonte2.start();
    const zumbido = canal(ctx, saida, 0.018);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
    osc.connect(filtro(ctx, 'lowpass', 180)); osc.connect(zumbido); osc.start();
    const carro = window.setInterval(() => {
      if (Math.random() < 0.5) estalo(ctx, saida, { duracao: 1.4, ganho: 0.045, de: 320, para: 1100 });
    }, 5200);
    const longe = window.setInterval(() => { if (Math.random() < 0.35) pipo(ctx, saida, { freq: 320 + Math.random() * 200, duracao: 0.9, ganho: 0.015, tipo: 'triangle' }); }, 8000);
    return () => { try { fonte.stop(); fonte2.stop(); osc.stop(); } catch { /* já parado */ } window.clearInterval(carro); window.clearInterval(longe); };
  } },

  // Lo-fi: acorde sustentado que troca a cada 6,4 s, baixo, batida macia e vinil.
  lofi: { montar: (ctx, saida) => {
    const acordes = [
      [110.0, 261.6, 329.6, 392.0],  // Am7
      [87.3, 220.0, 261.6, 329.6],   // Fmaj7
      [130.8, 329.6, 392.0, 493.9],  // Cmaj7
      [98.0, 246.9, 293.7, 349.2],   // G7
    ];
    const pad = canal(ctx, saida, 0.055);
    const passaBaixo = filtro(ctx, 'lowpass', 1150, 0.5);
    passaBaixo.connect(pad);
    const vozes = acordes[0].map((freq, indice) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle'; osc.frequency.value = freq; osc.detune.value = indice % 2 ? 6 : -6;
      const voz = canal(ctx, passaBaixo, 0.5);
      osc.connect(voz); osc.start();
      return osc;
    });
    const baixo = ctx.createOscillator(); baixo.type = 'sine'; baixo.frequency.value = acordes[0][0] / 2;
    const canalBaixo = canal(ctx, saida, 0.075); baixo.connect(canalBaixo); baixo.start();
    let passo = 0;
    const troca = window.setInterval(() => {
      passo = (passo + 1) % acordes.length;
      const acorde = acordes[passo];
      vozes.forEach((osc, indice) => { try { osc.frequency.setTargetAtTime(acorde[indice], ctx.currentTime, 0.35); } catch { /* segue no tom anterior */ } });
      try { baixo.frequency.setTargetAtTime(acorde[0] / 2, ctx.currentTime, 0.35); } catch { /* idem */ }
    }, 6400);
    const batida = window.setInterval(() => { pipo(ctx, saida, { freq: 120, duracao: 0.16, ganho: 0.09, tipo: 'sine' }); }, 1600);
    const vinil = window.setInterval(() => { if (Math.random() < 0.14) estalo(ctx, saida, { duracao: 0.02, ganho: 0.02, de: 3200, para: 1400 }); }, 95);
    return () => {
      try { vozes.forEach(osc => osc.stop()); baixo.stop(); } catch { /* já parado */ }
      window.clearInterval(troca); window.clearInterval(batida); window.clearInterval(vinil);
    };
  } },
};

/* ------------------------------------------------------------------ controles -- */

/** Desmonta o clima atual. Não mexe no contexto: quem liga depois só remonta as camadas. */
export function pararAmbiente() {
  pendente = null;
  if (desmontarAtual) { try { desmontarAtual(); } catch { /* desmontar é melhor esforço */ } desmontarAtual = null; }
  if (mestre && contexto) { try { mestre.gain.setTargetAtTime(0, contexto.currentTime, 0.05); } catch { /* segue */ } }
  if (climaAtual !== null) { climaAtual = null; avisar(); }
}

function montar(clima: ClimaDoAmbiente) {
  const ctx = garantirsContexto();
  if (!ctx || !mestre) return false;
  desmontarAtual?.();
  mestre.gain.value = volumeAtual;
  desmontarAtual = RECEITAS[clima].montar(ctx, mestre);
  climaAtual = clima; pendente = null; avisar();
  return true;
}

/**
 * Liga um clima. Devolve `false` quando o navegador não tem áudio nenhum.
 * Se o contexto estiver suspenso (fora de um gesto), o pedido fica pendente e
 * começa sozinho no primeiro toque — é o que permite o ambiente voltar depois de
 * recarregar a página, sem autoplay forçado.
 */
export function tocarAmbiente(clima: string): boolean {
  if (!ehClimaSuportado(clima)) return false;
  const ctx = garantirsContexto();
  if (!ctx) return false;
  if (ctx.state === 'running') return montar(clima);
  pendente = clima;
  void ctx.resume().then(() => { if (pendente === clima) montar(clima); }).catch(() => undefined);
  return true;
}

/** Liga e desliga o mesmo clima. Usado pelo painel e pela pílula de música. */
export function alternarAmbiente(clima: string): boolean {
  if (ehClimaSuportado(clima) && climaAtual === clima) { pararAmbiente(); return false; }
  return tocarAmbiente(clima);
}

/** Retoma o pedido pendente no primeiro gesto (chamado uma vez pelo aplicativo). */
export function retomarAmbientePendente() {
  if (typeof document === 'undefined') return;
  const tentar = () => { if (pendente) montar(pendente); };
  document.addEventListener('pointerdown', tentar, { once: true });
  document.addEventListener('keydown', tentar, { once: true });
}

/** Só para os testes: devolve as receitas existentes sem tocar em áudio. */
export const RECEITAS_DO_AMBIENTE = Object.keys(RECEITAS) as ClimaDoAmbiente[];
/** Nomes usados em avisos da interface. */
export const ROTULOS_DO_AMBIENTE: Record<string, string> = { chuva: 'Chuva', cafe: 'Café', oceano: 'Oceano', cidade: 'Cidade', lofi: 'Lo-fi' };
/** Sons de interface que o ambiente reaproveita (o "clique" ao ligar). */
export const SOM_AO_LIGAR: SoundName = 'success';
export const SOM_AO_PARAR: SoundName = 'swoosh';
