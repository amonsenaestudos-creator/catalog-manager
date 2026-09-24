/**
 * Humor contínuo.
 *
 * Em vez de `mood = happy`, a conversa carrega três mostradores:
 * valência (como ela está), energia (se tem fôlego para escrever) e
 * estresse (tensão acumulada). Assim uma pessoa pode estar "feliz,
 * mas cansada" ou "tranquila, porém irritada com alguma coisa" — e a
 * mesma mensagem que você mandar produz respostas diferentes.
 */
import type { HumorContínuo } from '../../types';
import type { Personalidade } from './types';

const clamp = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Humor inicial de uma conversa: a química define a base. */
export function humorInicial(afinidade: number): HumorContínuo {
  return {
    valence: clamp(-0.2 + (afinidade / 100) * 0.6),
    energy: clamp01(0.45 + afinidade / 200),
    stress: 0.15,
  };
}

export interface ImpulsoHumor {
  sentimento: 'positivo' | 'negativo' | 'neutro';
  /** Assunto pesado (desabafo, noite mal dormida): consome energia. */
  pesado: boolean;
  persona: Personalidade;
}

/**
 * O humor reage ao que você escreveu. A emotividade decide o tamanho do
 * movimento: pessoa emotiva muda de humor rápido, pessoa reservada
 * mal se altera — a mesma frase produz reações diferentes.
 */
export function evoluirHumor(atual: HumorContínuo, impulso: ImpulsoHumor): HumorContínuo {
  const sens = 0.5 + impulso.persona.emotividade * 0.9;
  let { valence, energy, stress } = atual;
  if (impulso.sentimento === 'positivo') {
    valence += 0.18 * sens;
    stress = clamp01(stress - 0.08 * sens);
  } else if (impulso.sentimento === 'negativo') {
    valence -= 0.14 * sens;
    stress = clamp01(stress + 0.16 * sens);
  } else {
    // Neutro: puxa devagar para o ponto de equilíbrio.
    valence += 0.05 * sens * (valence < 0 ? 1 : 0.2);
  }
  if (impulso.pesado) energy = clamp01(energy - 0.08);
  // Conversar também é descanso: a energia se recupera um pouco.
  energy = clamp01(energy + 0.03);
  // Puxo suave para o zero: nada fica no extremo para sempre.
  valence = clamp(valence + (0 - valence) * 0.04);
  return { valence: Number(valence.toFixed(3)), energy: Number(energy.toFixed(3)), stress: Number(stress.toFixed(3)) };
}

/**
 * O humor descansa enquanto você não está falando: a tensão se dilui,
 * a energia volta (dormir, tomar um café), a valência volta ao ponto
 * de equilíbrio. É o "ela acordou melhor" de outro dia.
 */
export function decairHumor(humor: HumorContínuo, horasSemAtividade: number, p: Personalidade): HumorContínuo {
  const h = Math.min(48, Math.max(0, horasSemAtividade));
  if (h <= 0) return humor;
  return {
    valence: Number((humor.valence * (1 - h * 0.02)).toFixed(3)),
    energy: Number(clamp01(humor.energy + h * 0.012 * (0.5 + p.agilidade)).toFixed(3)),
    stress: Number(clamp01(humor.stress * Math.exp(-h / 24)).toFixed(3)),
  };
}

/**
 * Leitura humana do humor para a tela: "feliz, mas cansada",
 * "tranquila, porém irritada com alguma coisa"...
 */
export function leituraHumor(h: HumorContínuo): string {
  const base = h.valence > 0.35 ? 'feliz' : h.valence > 0.1 ? 'tranquila' : h.valence > -0.15 ? 'neutra' : h.valence > -0.45 ? 'irritada' : 'pesada';
  const detalhe =
    h.stress > 0.55 ? 'irritada com alguma coisa'
      : h.energy < 0.3 ? 'mas cansada'
        : h.stress > 0.35 ? 'com a cabeça ocupada'
          : h.energy > 0.75 ? 'com energia pra conversar'
            : '';
  return detalhe ? `${base}, ${detalhe}` : base;
}
