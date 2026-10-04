/**
 * Revelação progressiva.
 *
 * Regra do aplicativo: a tela mostra o essencial e deixa o resto a um toque.
 * Não é esconder por esconder — é responder primeiro a pergunta que a pessoa
 * fez ao abrir a tela ("quem é essa?"), e só depois oferecer o dossiê inteiro
 * ("o que eu já anotei sobre ela?").
 *
 * Este arquivo guarda só a decisão: quantos itens aparecem antes do "ver mais",
 * quanto ficou de fora e como se escreve esse resto. Quem desenha é o
 * componente `Revelar`.
 */

/** Quantas informações principais uma ficha mostra antes de "ver todas". */
export const LIMITE_ESSENCIAL = 3;

/** Quantas fotos cabem na prévia de uma seção fechada. */
export const LIMITE_DE_PREVIA = 6;

/** Quantas linhas de histórico aparecem antes do "ver mais". */
export const LIMITE_DE_HISTORICO = 4;

export interface Revelacao<T> {
  visiveis: T[];
  escondidas: T[];
  total: number;
  /** O que sobrou depois do corte. Zero = não precisa de botão. */
  restantes: number;
  /** `false` quando nada ficou de fora: aí não existe botão nenhum. */
  temMais: boolean;
}

/** Corta uma lista em "o essencial" e "o resto", sem perder a ordem. */
export function revelar<T>(itens: T[], limite = LIMITE_ESSENCIAL): Revelacao<T> {
  const lista = Array.isArray(itens) ? itens : [];
  const corte = Math.max(0, limite);
  return {
    visiveis: lista.slice(0, corte),
    escondidas: lista.slice(corte),
    total: lista.length,
    restantes: Math.max(0, lista.length - corte),
    temMais: lista.length > corte,
  };
}

/** "mais 1 informação" / "mais 7 informações" — o rótulo do botão. */
export function rotuloDoResto(restantes: number, singular: string, plural: string): string {
  if (restantes <= 0) return '';
  return restantes === 1 ? `Ver mais 1 ${singular}` : `Ver mais ${restantes} ${plural}`;
}

/**
 * Contagem de uma seção fechada: "12" quando há, vazio quando não há.
 * A ficha prefere não mostrar "0 fotos" num cabeçalho de seção.
 */
export function contagemDaSecao(quantidade: number): string {
  return quantidade > 0 ? String(quantidade) : '';
}

/** Resumo de uma linha para a seção fechada: "12 fotos · 3 áudios". */
export function resumoDeContagens(pares: [string, number][]): string {
  return pares
    .filter(([, quantidade]) => quantidade > 0)
    .map(([rotulo, quantidade]) => `${quantidade} ${rotulo}`)
    .join(' · ');
}
