/**
 * Densidade da interface.
 *
 * A pergunta que originou este arquivo: "quanta informação cabe na tela?".
 * Ela não tem uma resposta universal — quem tem trezentas fichas quer ver
 * muito de uma vez, quem quer ler uma ficha com calma quer respiro. Por isso
 * são três degraus, e não um interruptor de liga/desliga: compacta, o padrão
 * confortável e espaçosa. A regra é só de apresentação: nada aqui esconde
 * dado, só decide quanto respiro a interface usa para mostrar tudo.
 *
 * O valor antigo (`compacto`, de duas opções) continua sendo aceito: quem já
 * tinha escolhido "compacto" acorda na densidade compacta, sem perder a
 * preferência.
 */

export type Densidade = 'compacta' | 'confortavel' | 'espacosa';

export interface OpcaoDeDensidade {
  id: Densidade;
  nome: string;
  /** Uma linha curta, para o controle segmentado. */
  resumo: string;
  /** O que muda na prática, para quem está escolhendo. */
  dica: string;
}

export const DENSIDADES: OpcaoDeDensidade[] = [
  {
    id: 'compacta',
    nome: 'Compacta',
    resumo: 'Mais informação',
    dica: 'Cartões menores, listas mais juntas e o cartão do catálogo em linha única: foto, nome, lugar e nota. Para quem tem muita gente cadastrada.',
  },
  {
    id: 'confortavel',
    nome: 'Confortável',
    resumo: 'O padrão',
    dica: 'Equilíbrio entre quantidade e respiro. É como o Catalog nasce.',
  },
  {
    id: 'espacosa',
    nome: 'Espaçosa',
    resumo: 'Menos, maior',
    dica: 'Cartões grandes, mais espaço entre as seções e uma decisão por vez. Bom para ler, apresentar e navegar devagar.',
  },
];

export const DENSIDADE_PADRAO: Densidade = 'confortavel';

/** Aceita o valor salvo de qualquer época e devolve um degrau válido. */
export function normalizarDensidade(valor: unknown): Densidade {
  if (typeof valor !== 'string') return DENSIDADE_PADRAO;
  const limpo = valor.trim().toLowerCase();
  if (limpo === 'compacta' || limpo === 'compacto') return 'compacta';
  if (limpo === 'espacosa' || limpo === 'espacoso') return 'espacosa';
  return DENSIDADE_PADRAO;
}

export function informacaoDaDensidade(valor: unknown): OpcaoDeDensidade {
  const id = normalizarDensidade(valor);
  return DENSIDADES.find(opcao => opcao.id === id) || DENSIDADES[1];
}

/** A classe que o `<html>` recebe — o CSS não pergunta mais nada além disso. */
export const classeDaDensidade = (valor: unknown) => `density-${normalizarDensidade(valor)}`;

/** Todas as classes possíveis, para limpar a anterior antes de aplicar a nova. */
export const CLASSES_DE_DENSIDADE = DENSIDADES.map(opcao => classeDaDensidade(opcao.id));

/** O botão que só alterna anda sempre para a direita e volta ao começo. */
export function proximaDensidade(atual: unknown): Densidade {
  const indice = DENSIDADES.findIndex(opcao => opcao.id === normalizarDensidade(atual));
  return DENSIDADES[(indice + 1) % DENSIDADES.length].id;
}

/** O cartão do catálogo em linha única só existe na densidade compacta. */
export const cartaoEmLinhaUnica = (valor: unknown) => normalizarDensidade(valor) === 'compacta';
