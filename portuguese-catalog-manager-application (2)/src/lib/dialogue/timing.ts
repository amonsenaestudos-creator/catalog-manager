/**
 * Tempo de conversa.
 *
 * Ninguém responde instantâneo: o tempo de leitura cresce com o
 * tamanho do que chegou, o tempo de digitação acompanha o tamanho
 * da bolha e a personalidade (agilidade), e a digitação às vezes
 * "para e volta" — principalmente quando ela está estressada ou
 * sem energia.
 */
import type { Persona } from '../persona';
import type { RitmoBolha } from './types';

const fatorVelocidade = (rapido?: boolean, pausado?: boolean) => (rapido ? 0.35 : pausado ? 1.7 : 1);

/**
 * Quanto tempo ela leva para ler o seu lote antes de responder.
 * De 4s a 45s, conforme a personalidade e o tamanho do que chegou.
 */
export function atrasoDeLeitura(
  tamanhoLote: number,
  persona: Persona,
  rapido?: boolean,
  pausado?: boolean,
  rand: () => number = Math.random,
): number {
  const agilidade = persona.traits.agilidade;
  const base = (2600 + Math.min(4000, tamanhoLote * 22)) * (1.55 - agilidade) * fatorVelocidade(rapido, pausado);
  return Math.max(1200, Math.min(45000, base * (0.8 + rand() * 0.5)));
}

/**
 * Ritmo de cada bolha: a janela total (que o motor já calcula de
 * forma realista) e, às vezes, a pausa em que a digitação para e
 * volta. Últimas bolhas não pausam: quem para no meio do tchau
 * entrega a resposta automática.
 */
export function ritmoDePlano(
  bolhas: { texto: string; atraso: number }[],
  persona: Persona,
  humor: { energy: number; stress: number },
  rand: () => number = Math.random,
): RitmoBolha[] {
  const agilidade = persona.traits.agilidade;
  return bolhas.map((bolha, indice) => {
    const ritmo: RitmoBolha = { atraso: bolha.atraso };
    const ultimo = indice === bolhas.length - 1;
    if (ultimo || bolha.atraso < 1600) return ritmo;
    // Digitação hesita mais com estresse e menos energia — e menos com gente rápida.
    const chance = Math.min(0.35, (0.08 + humor.stress * 0.25 + (1 - humor.energy) * 0.15) * (1.15 - agilidade * 0.4));
    if (rand() < chance) {
      ritmo.pausa = {
        ponto: Math.round(bolha.atraso * (0.3 + rand() * 0.35)),
        dur: Math.round(600 + rand() * 1100),
      };
    }
    return ritmo;
  });
}
