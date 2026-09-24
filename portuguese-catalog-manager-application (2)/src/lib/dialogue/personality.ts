/**
 * Personalidade de verdade.
 *
 * Cada pessoa do catálogo ganha oito eixos derivados da ficha (idade,
 * comportamento, tags, categoria...). Os eixos não aparecem para o
 * usuário — eles decidem coisas: a pessoa curiosa pergunta "Sério? E
 * como foi isso?", a engraçada responde "KKKKKK acontece", a empática
 * responde "Foi tão ruim assim?".
 *
 * Tudo é determinístico: a mesma ficha produz a mesma personalidade,
 * para sempre.
 */
import type { Persona } from '../persona';
import type { Personalidade } from './types';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function personalidadeDe(persona: Persona): Personalidade {
  const t = persona.traits;
  return {
    extroversao: clamp01(0.45 * t.calor + 0.3 * t.verbosidade + 0.25 * t.agilidade),
    humor: clamp01(0.6 * t.brincadeira + 0.25 * t.calor + 0.15 * t.girias),
    formalidade: clamp01(0.55 * t.reserva + 0.45 * t.maturidade),
    curiosidade: clamp01(0.7 * t.curiosidade + 0.3 * t.verbosidade),
    paciencia: clamp01(0.6 * (1 - t.ciumenta) + 0.25 * t.reserva + 0.15 * (1 - t.ousadia)),
    iniciativa: clamp01(0.4 * t.calor + 0.3 * t.agilidade + 0.25 * t.ousadia + 0.05 * t.brincadeira),
    ironia: clamp01(0.65 * t.brincadeira + 0.35 * (1 - t.maturidade * 0.5)),
    emotividade: clamp01(0.5 * t.calor + 0.35 * t.romantica + 0.15 * t.emojis),
    agilidade: t.agilidade,
  };
}

/**
 * Visão em barras (0 a 100) para telas que quiserem mostrar a
 * personalidade — não é obrigatório, o usuário raramente verá.
 */
export function barrasDe(p: Personalidade): { rotulo: string; valor: number }[] {
  return [
    { rotulo: 'Extroversão', valor: Math.round(p.extroversao * 100) },
    { rotulo: 'Humor', valor: Math.round(p.humor * 100) },
    { rotulo: 'Formalidade', valor: Math.round(p.formalidade * 100) },
    { rotulo: 'Curiosidade', valor: Math.round(p.curiosidade * 100) },
    { rotulo: 'Paciência', valor: Math.round(p.paciencia * 100) },
    { rotulo: 'Iniciativa', valor: Math.round(p.iniciativa * 100) },
    { rotulo: 'Ironia', valor: Math.round(p.ironia * 100) },
    { rotulo: 'Emotividade', valor: Math.round(p.emotividade * 100) },
  ];
}
