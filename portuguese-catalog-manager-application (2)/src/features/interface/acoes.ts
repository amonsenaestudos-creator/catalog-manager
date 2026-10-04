/**
 * Ações por contexto — "uma decisão por vez".
 *
 * O problema que este arquivo resolve: a ficha (e o topo, e a doca) ofereciam
 * tudo o que o sistema sabe ao mesmo tempo. Editar, conversar, avaliar, foto,
 * voz, compartilhar, exportar, arquivar, excluir — treze botões com o mesmo
 * peso, e a pessoa precisando entender a interface antes de usar a interface.
 *
 * A virada é perguntar "em que momento ela precisa de cada função?" e deixar o
 * contexto responder. Aqui a descrição das ações é **dado**, não JSX: id,
 * rótulo, grupo e se ela é provável o bastante para ficar na barra. O
 * componente (`BarraDeAcoes`) liga o clique e desenha; a regra de quais ações
 * aparecem, e quantas, é testável sem navegador.
 */

import { rotuloDoResto } from './revelacao';

/* -------------------------------------------------------------- categorias -- */

export type CategoriaDaFicha = 'perfil' | 'avaliacoes' | 'midia' | 'relacoes' | 'registros';

export interface CategoriaDeFicha {
  id: CategoriaDaFicha;
  rotulo: string;
  /** O que vive dentro, em uma linha — vai no subtítulo da seção. */
  resumo: string;
}

/**
 * Cinco categorias no lugar de oito abas.
 *
 * Perfil, Avaliações, Mídia, Relações e Registros: o que era uma aba por tipo
 * de dado virou uma aba por intenção. "Avaliações" continua sendo categoria de
 * primeira linha porque é o coração deste catálogo; o que é ferramenta
 * (exportar, duplicar, imprimir, lixeira) sai das abas e vai para o "⋯".
 */
export const CATEGORIAS_DA_FICHA: CategoriaDeFicha[] = [
  { id: 'perfil', rotulo: 'Perfil', resumo: 'Quem ela é e como vocês se conheceram' },
  { id: 'avaliacoes', rotulo: 'Avaliações', resumo: 'Notas, critérios, radar e histórico' },
  { id: 'midia', rotulo: 'Mídia', resumo: 'Fotos, áudios e a voz dela' },
  { id: 'relacoes', rotulo: 'Relações', resumo: 'Família no catálogo e quem anda junto' },
  { id: 'registros', rotulo: 'Registros', resumo: 'Notas, metas e a linha do tempo' },
];

/**
 * Nome de aba antigo continua abrindo a ficha no lugar certo: `openPerson(p,
 * { aba: 'photos' })` e os atalhos do catálogo seguem funcionando sem que
 * ninguém precise caçar chamadas espalhadas pelo aplicativo.
 */
const ABAS_ANTIGAS: Record<string, CategoriaDaFicha> = {
  info: 'perfil', dados: 'perfil', perfil: 'perfil', pastas: 'perfil',
  ratings: 'avaliacoes', rating: 'avaliacoes', avaliacao: 'avaliacoes', avaliacoes: 'avaliacoes',
  photos: 'midia', foto: 'midia', fotos: 'midia', midia: 'midia', voz: 'midia', audio: 'midia',
  relacoes: 'relacoes', relacao: 'relacoes', relations: 'relacoes',
  notes: 'registros', notas: 'registros', timeline: 'registros', goals: 'registros', metas: 'registros', registros: 'registros', historico: 'registros',
};

export function categoriaDaAba(aba?: string | null): CategoriaDaFicha {
  if (!aba) return 'perfil';
  return ABAS_ANTIGAS[String(aba).trim().toLowerCase()] || 'perfil';
}

/* ------------------------------------------------------------------ grupos -- */

export type GrupoDeAcoes = 'agora' | 'organizacao' | 'avancado';

export const GRUPOS_DE_ACOES: { id: GrupoDeAcoes; rotulo: string }[] = [
  { id: 'agora', rotulo: 'Ações' },
  { id: 'organizacao', rotulo: 'Organização' },
  { id: 'avancado', rotulo: 'Avançado' },
];

export interface AcaoDeContexto {
  /** Chave estável: quem executa faz o `switch` por aqui, não pelo rótulo. */
  id: string;
  rotulo: string;
  grupo: GrupoDeAcoes;
  /** Além do rótulo, uma linha de explicação (usada na folha do celular). */
  detalhe?: string;
  /** Aparece na barra, antes do "⋯". O corte final é do `organizarAcoes`. */
  primaria?: boolean;
  /** Ação que muda ou apaga algo: nunca sobe para a barra sozinha. */
  perigo?: boolean;
}

export interface GrupoMontado {
  id: GrupoDeAcoes;
  rotulo: string;
  acoes: AcaoDeContexto[];
}

export interface PlanoDeAcoes {
  /** As 2 a 4 ações mais prováveis — o resto fica no "⋯ Mais". */
  primarias: AcaoDeContexto[];
  /** Só os grupos que sobraram, na ordem "Ações → Organização → Avançado". */
  grupos: GrupoMontado[];
  /** O que o botão "⋯" anuncia para quem usa leitor de tela. */
  rotuloDoResto: string;
  total: number;
}

/**
 * O corte.
 *
 * - a barra mostra no máximo `limite` ações (3 é o número confortável);
 * - nunca menos que `minimo` quando há ação suficiente para isso — uma barra
 *   com um botão só e um "⋯" do lado é pior que dois botões;
 * - ação perigosa não entra na barra: excluir não é a ação provável de quem
 *   acabou de abrir uma ficha;
 * - a mesma ação nunca aparece duas vezes (na barra e dentro do menu).
 */
export function organizarAcoes(acoes: AcaoDeContexto[], limite = 3, minimo = 2): PlanoDeAcoes {
  const lista = Array.isArray(acoes) ? acoes : [];
  const seguras = lista.filter(acao => !acao.perigo);
  const preferidas = seguras.filter(acao => acao.primaria);
  const candidatas = [...preferidas, ...seguras.filter(acao => !preferidas.includes(acao))];
  const quantas = Math.min(limite, seguras.length, Math.max(minimo, preferidas.length));
  const primarias = candidatas.slice(0, Math.max(0, quantas));
  const escolhidas = new Set(primarias.map(acao => acao.id));
  const grupos = GRUPOS_DE_ACOES
    .map(grupo => ({ ...grupo, acoes: lista.filter(acao => acao.grupo === grupo.id && !escolhidas.has(acao.id)) }))
    .filter(grupo => grupo.acoes.length > 0);
  const restantes = grupos.reduce((soma, grupo) => soma + grupo.acoes.length, 0);
  return { primarias, grupos, rotuloDoResto: rotuloDoResto(restantes, 'ação', 'ações'), total: lista.length };
}

/* ------------------------------------------------------------------ ficha -- */

export interface ContextoDaFicha {
  categoria: CategoriaDaFicha;
  favorita?: boolean;
  arquivada?: boolean;
  temVoz?: boolean;
}

/**
 * O catálogo de ações da ficha.
 *
 * Duas ações ficam sempre na mão — Editar e Conversar —, porque são as duas
 * coisas que alguém faz ao abrir a ficha de alguém. A terceira muda com a
 * categoria aberta: em Mídia a ação provável é acrescentar foto, em Registros
 * é escrever, em Avaliações é reavaliar. Todo o resto (organização,
 * ferramentas, lixeira) vive no "⋯", agrupado.
 *
 * As ações de categoria continuam listadas no menu quando a categoria não é a
 * aberta: é assim que a função é descoberta sem disputar a barra.
 */
export function acoesDaFicha(contexto: ContextoDaFicha): AcaoDeContexto[] {
  const { categoria } = contexto;
  return [
    { id: 'editar', rotulo: 'Editar ficha', grupo: 'agora', primaria: true, detalhe: 'informações, avaliação e fotos' },
    { id: 'conversar', rotulo: 'Conversar', grupo: 'agora', primaria: true, detalhe: 'abre o papo com ela' },
    { id: 'vi-hoje', rotulo: 'Vi hoje', grupo: 'agora', detalhe: 'marca o encontro de hoje' },
    { id: 'favoritar', rotulo: contexto.favorita ? 'Tirar dos favoritos' : 'Favoritar', grupo: 'agora' },
    { id: 'puxar-assunto', rotulo: 'Puxar assunto', grupo: 'agora', detalhe: 'sugestões para quebrar o gelo' },
    { id: 'compartilhar', rotulo: 'Compartilhar resumo', grupo: 'agora' },
    { id: 'adicionar-foto', rotulo: 'Adicionar foto', grupo: 'agora', primaria: categoria === 'midia' },
    { id: 'reavaliar', rotulo: 'Reavaliar', grupo: 'agora', primaria: categoria === 'avaliacoes' },
    { id: 'nova-nota', rotulo: 'Nova nota', grupo: 'agora', primaria: categoria === 'registros' },
    { id: 'nova-meta', rotulo: 'Novo objetivo', grupo: 'agora' },
    { id: 'ver-relacoes', rotulo: 'Quem anda junto', grupo: 'agora', primaria: categoria === 'relacoes' },
    ...(contexto.temVoz === false ? [] : [{ id: 'voz', rotulo: 'A voz dela', grupo: 'agora' as GrupoDeAcoes, detalhe: 'ouvir, gravar ou enviar um áudio' }]),

    { id: 'pasta', rotulo: 'Pôr numa pasta', grupo: 'organizacao', detalhe: 'reunir sem duplicar' },
    { id: 'tags', rotulo: 'Etiquetas e categoria', grupo: 'organizacao' },
    { id: 'fixar', rotulo: 'Fixar no topo do catálogo', grupo: 'organizacao' },
    { id: 'arquivar', rotulo: contexto.arquivada ? 'Desarquivar ficha' : 'Arquivar ficha', grupo: 'organizacao' },

    { id: 'duplicar', rotulo: 'Duplicar ficha', grupo: 'avancado' },
    { id: 'exportar-png', rotulo: 'Exportar ficha em PNG', grupo: 'avancado' },
    { id: 'exportar-json', rotulo: 'Exportar ficha em JSON', grupo: 'avancado' },
    { id: 'imprimir', rotulo: 'Imprimir a ficha', grupo: 'avancado' },
    { id: 'lembrete', rotulo: 'Criar lembrete', grupo: 'avancado' },
    { id: 'lixeira', rotulo: 'Mover para a lixeira', grupo: 'avancado', perigo: true },
  ];
}

/* ------------------------------------------------------------- tela inicial -- */

/**
 * A barra de ação do contexto "nada selecionado".
 *
 * É o desenho do topo do Início: procurar, acrescentar e descobrir — as três
 * coisas que alguém faz ao abrir o aplicativo sem ter uma pessoa em mente.
 * Surpresa e Momentos cabem em "Ações"; ferramentas e ajustes esperam em
 * "Avançado". Nenhuma dessas ações abre um formulário longo na cara de quem
 * acabou de chegar.
 */
export function acoesDaTelaInicial(): AcaoDeContexto[] {
  return [
    { id: 'buscar', rotulo: 'Buscar', grupo: 'agora', primaria: true, detalhe: 'pessoas, notas, fotos e ferramentas' },
    { id: 'adicionar', rotulo: 'Adicionar', grupo: 'agora', primaria: true, detalhe: 'pessoa, foto, nota ou pasta' },
    { id: 'explorar', rotulo: 'Explorar', grupo: 'agora', primaria: true, detalhe: 'descobrir, momentos e desafios' },
    { id: 'surpresa', rotulo: 'Surpreenda-me', grupo: 'agora', detalhe: 'abre uma ficha ao acaso' },
    { id: 'momentos', rotulo: 'Momentos', grupo: 'agora', detalhe: 'uma surpresa do dia a partir do catálogo' },
    { id: 'ferramentas', rotulo: 'Ferramentas', grupo: 'avancado' },
    { id: 'saude', rotulo: 'Saúde do catálogo', grupo: 'avancado' },
    { id: 'ajustes', rotulo: 'Ajustes', grupo: 'avancado' },
  ];
}
