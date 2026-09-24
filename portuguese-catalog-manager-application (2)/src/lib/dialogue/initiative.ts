/**
 * Sistema de iniciativa.
 *
 * Cada personagem tem um nível base de iniciativa (sai da
 * personalidade). A iniciativa efetiva muda com a relação:
 *
 *   interesse ↑  →  iniciativa ↑
 *   conversa ignorada várias vezes  →  iniciativa ↓
 *
 * É a consequência: quem sempre espera, para de esperar.
 */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Iniciativa efetiva agora: base × química ÷ custo de ser ignorada. */
export function iniciativaEfetiva(base: number, afinidade: number, ignoradas: number): number {
  const quimica = 0.7 + (afinidade / 100) * 0.5; // 0.7 → 1.2
  const custoIgnora = 1 - Math.min(0.7, ignoradas * 0.18); // cada ignorada tira 18%
  return clamp(base * quimica * custoIgnora, 0.05, 0.95);
}

/**
 * Quanto tempo até a próxima puxada espontânea (no tempo do
 * simulador). Iniciativa 0.1 fica quase um minuto; 0.9 puxa a cada
 * 20s — sempre com folga aleatória para não virar metrônomo.
 */
export function intervaloDeIniciativa(
  iniciativa: number,
  rapido?: boolean,
  pausado?: boolean,
  rand: () => number = Math.random,
): number {
  const base = 78000 - iniciativa * 60000; // 0 → 78s, 1 → 18s
  const fator = rapido ? 0.45 : pausado ? 1.7 : 1;
  return Math.max(8000, base * fator * (0.75 + rand() * 0.9));
}
