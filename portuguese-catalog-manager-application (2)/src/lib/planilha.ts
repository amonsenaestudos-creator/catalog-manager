/**
 * A planilha das pessoas do catálogo.
 *
 * O catálogo é seu e os dados precisam poder sair dele: aqui toda ficha vira
 * linha e cada campo vira coluna, num CSV que o Excel, o LibreOffice e o Google
 * Sheets abrem direto — com `;` de separador e BOM no começo, que é o que faz o
 * Excel em português não abrir tudo numa coluna só nem transformar "Ana Paula"
 * em "Ana Paula" sem acento.
 *
 * Duas larguras de planilha, porque uma coisa é conferir a lista e outra é levar
 * o cadastro inteiro embora:
 *   · **essencial** — o que se olha de relance (nome, idade, contato, nota,
 *     relacionamento, estado da ficha, interações);
 *   · **completa** — tudo o que a ficha guarda, inclusive descrição, aparência,
 *     vínculos, contagens de fotos/áudios/notas e os campos personalizados.
 *
 * `tsvDasPessoas` é o mesmo conteúdo separado por tabulação: é o formato que
 * cola direto numa célula do Sheets ou do Excel sem passar por arquivo.
 *
 * Duas regras de segurança valem para todas as saídas: célula que começa com
 * `=`, `+`, `-` ou `@` ganha um apóstrofo (senão a planilha executa como
 * fórmula o que era só texto) e o modo privacidade bloqueia a exportação, do
 * mesmo jeito que bloqueia o download de imagem.
 */
import type { AppData, Person } from '../types';
import { relacionamentoLabel, temCompromisso, vinculoComigoLabel } from '../types';
import {
  ageFromBirthday, calculateOverallRating, downloadBlob, formatDate, formatNumber,
  friendshipLabel, getFinalScore, RARITY_LABELS, rarityFor, today,
} from '../store';
import { descreverVinculo } from './relacao';

export type EscopoDaPlanilha = 'essencial' | 'completa';

export interface ColunaDaPlanilha {
  id: string;
  /** O cabeçalho, como vai aparecer na primeira linha do arquivo. */
  nome: string;
  /** `essencial` sai nas duas planilhas; `completa` só na planilha completa. */
  escopo: EscopoDaPlanilha;
  valor: (pessoa: Person, dados: AppData) => string | number;
}

const categoriaDe = (pessoa: Person, dados: AppData) =>
  dados.categories.find(item => item.value === pessoa.localizacaoOnde)?.label || pessoa.localizacaoOnde || '';

const subcategoriaDe = (pessoa: Person, dados: AppData) => {
  const categoria = dados.categories.find(item => item.value === pessoa.localizacaoOnde);
  return categoria?.subs?.find(sub => sub.value === pessoa.localizacaoSub)?.label || pessoa.localizacaoSub || '';
};

const estadoDaFicha = (pessoa: Person) => (pessoa.deletedAt ? 'Lixeira' : pessoa.archivedAt ? 'Arquivada' : 'Ativa');

const dataLida = (valor?: string | null) => (valor ? formatDate(valor) : '');

const camposLivres = (pessoa: Person) =>
  (pessoa.customFields || []).filter(campo => campo.label.trim()).map(campo => `${campo.label}: ${campo.value}`).join(' | ');

export const COLUNAS_DA_PLANILHA: ColunaDaPlanilha[] = [
  { id: 'nome', nome: 'Nome', escopo: 'essencial', valor: pessoa => pessoa.nome },
  { id: 'apelido', nome: 'Apelido', escopo: 'essencial', valor: pessoa => pessoa.apelido || '' },
  { id: 'idade', nome: 'Idade', escopo: 'essencial', valor: pessoa => pessoa.idade ?? (pessoa.aniversario ? ageFromBirthday(pessoa.aniversario) ?? '' : '') },
  { id: 'relacionamento', nome: 'Relacionamento', escopo: 'essencial', valor: pessoa => (pessoa.relacionamento ? relacionamentoLabel(pessoa.relacionamento) : '') },
  { id: 'compromisso', nome: 'Tem alguém?', escopo: 'essencial', valor: pessoa => (pessoa.relacionamento ? (temCompromisso(pessoa) ? 'Sim' : 'Não') : '') },
  { id: 'categoria', nome: 'Categoria', escopo: 'essencial', valor: categoriaDe },
  { id: 'subcategoria', nome: 'Subcategoria', escopo: 'essencial', valor: subcategoriaDe },
  { id: 'onde-mora', nome: 'Onde mora', escopo: 'essencial', valor: pessoa => pessoa.localizacaoMora || '' },
  { id: 'contato', nome: 'Contato', escopo: 'essencial', valor: pessoa => pessoa.redesSociais || '' },
  { id: 'tags', nome: 'Etiquetas', escopo: 'essencial', valor: pessoa => pessoa.tags.join(', ') },
  { id: 'nota', nome: 'Nota geral', escopo: 'essencial', valor: pessoa => formatNumber(calculateOverallRating(pessoa.rating)) },
  { id: 'pontos', nome: 'Pontos', escopo: 'essencial', valor: pessoa => formatNumber(getFinalScore(pessoa)) },
  { id: 'favorita', nome: 'Favorita', escopo: 'essencial', valor: pessoa => (pessoa.favorite ? 'Sim' : 'Não') },
  { id: 'estado', nome: 'Estado da ficha', escopo: 'essencial', valor: estadoDaFicha },
  { id: 'ultima-interacao', nome: 'Última interação', escopo: 'essencial', valor: pessoa => dataLida(pessoa.ultimoVisto) },
  { id: 'interacoes', nome: 'Interações', escopo: 'essencial', valor: pessoa => pessoa.viHojeCount ?? 0 },
  { id: 'cadastro', nome: 'Cadastrada em', escopo: 'essencial', valor: pessoa => dataLida(pessoa.createdAt) },

  { id: 'descricao', nome: 'Descrição', escopo: 'completa', valor: pessoa => pessoa.descricao || '' },
  { id: 'aniversario', nome: 'Aniversário', escopo: 'completa', valor: pessoa => dataLida(pessoa.aniversario) },
  { id: 'altura', nome: 'Altura', escopo: 'completa', valor: pessoa => pessoa.altura || '' },
  { id: 'tipo-corpo', nome: 'Tipo de corpo', escopo: 'completa', valor: pessoa => pessoa.tipoCorpo || '' },
  { id: 'estilo-roupa', nome: 'Estilo de roupa', escopo: 'completa', valor: pessoa => pessoa.estiloRoupa || '' },
  { id: 'cabelo', nome: 'Cabelo', escopo: 'completa', valor: pessoa => [pessoa.cabeloTipo, pessoa.cabeloCor === 'colorido' ? pessoa.cabeloCorCustom : pessoa.cabeloCor].filter(Boolean).join(', ') },
  { id: 'pele', nome: 'Tom de pele', escopo: 'completa', valor: pessoa => (pessoa.pele === 'personalizado' ? pessoa.peleCustom : pessoa.pele) || '' },
  { id: 'qi', nome: 'Q.I. (anotação)', escopo: 'completa', valor: pessoa => pessoa.qi || '' },
  { id: 'vinculo-comigo', nome: 'O que ela é sua', escopo: 'completa', valor: pessoa => (pessoa.vinculoComigo ? vinculoComigoLabel(pessoa.vinculoComigo) : '') },
  { id: 'familia', nome: 'Família e próximos no catálogo', escopo: 'completa', valor: (pessoa, dados) => descreverVinculo(pessoa, dados.people).join(' · ') },
  { id: 'amizade', nome: 'Nível de amizade', escopo: 'completa', valor: pessoa => friendshipLabel(pessoa.friendshipLevel) },
  { id: 'raridade', nome: 'Raridade', escopo: 'completa', valor: pessoa => RARITY_LABELS[pessoa.rarity || rarityFor(calculateOverallRating(pessoa.rating))] },
  { id: 'como-conheceu', nome: 'Como conheceu', escopo: 'completa', valor: pessoa => pessoa.comoConheceu || '' },
  { id: 'musica', nome: 'Música favorita', escopo: 'completa', valor: pessoa => pessoa.musicaFavorita || '' },
  { id: 'comportamento', nome: 'Comportamento', escopo: 'completa', valor: pessoa => pessoa.comportamento || '' },
  { id: 'descricao-corporal', nome: 'Descrição corporal', escopo: 'completa', valor: pessoa => pessoa.descricaoCorporal || '' },
  { id: 'observacoes', nome: 'Observações gerais', escopo: 'completa', valor: pessoa => pessoa.observacoesGerais || '' },
  { id: 'fotos', nome: 'Fotos', escopo: 'completa', valor: pessoa => (pessoa.fotos || []).length },
  { id: 'vozes', nome: 'Áudios de voz', escopo: 'completa', valor: pessoa => (pessoa.vozes || []).length },
  { id: 'notas', nome: 'Notas da ficha', escopo: 'completa', valor: pessoa => (pessoa.notas || []).length },
  { id: 'anexos', nome: 'Anexos', escopo: 'completa', valor: pessoa => (pessoa.attachments || []).length },
  { id: 'campos-livres', nome: 'Campos personalizados', escopo: 'completa', valor: camposLivres },
  { id: 'atualizada', nome: 'Atualizada em', escopo: 'completa', valor: pessoa => dataLida(pessoa.updatedAt || pessoa.createdAt) },
];

/** As colunas de cada largura: a essencial é subconjunto da completa. */
export const colunasDaPlanilha = (escopo: EscopoDaPlanilha = 'completa') =>
  COLUNAS_DA_PLANILHA.filter(coluna => escopo === 'completa' || coluna.escopo === 'essencial');

/**
 * Cabeçalho + uma linha por pessoa, na ordem em que chegaram.
 *
 * Uma coluna que erre (campo antigo, dado torto) devolve célula vazia em vez de
 * derrubar o arquivo inteiro: perder uma célula é melhor do que perder a
 * planilha.
 */
export function linhasDaPlanilha(
  people: Person[],
  dados: AppData,
  escopo: EscopoDaPlanilha = 'completa',
): (string | number)[][] {
  const colunas = colunasDaPlanilha(escopo);
  const linhas = people.map(pessoa => colunas.map(coluna => {
    try { return coluna.valor(pessoa, dados); } catch { return ''; }
  }));
  return [colunas.map(coluna => coluna.nome), ...linhas];
}

/** Célula de CSV: sempre entre aspas, e o que parece fórmula vira texto. */
function celula(valor: unknown): string {
  let texto = String(valor ?? '').replace(/\r?\n/g, ' ');
  if (typeof valor === 'string' && /^\s*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** O arquivo inteiro: BOM, `;` entre células e CRLF entre linhas. */
export function csvDasPessoas(
  people: Person[],
  dados: AppData,
  escopo: EscopoDaPlanilha = 'completa',
): string {
  return `\uFEFF${linhasDaPlanilha(people, dados, escopo).map(linha => linha.map(celula).join(';')).join('\r\n')}`;
}

/** O mesmo conteúdo para colar numa célula: tabulação entre colunas. */
export function tsvDasPessoas(
  people: Person[],
  dados: AppData,
  escopo: EscopoDaPlanilha = 'completa',
): string {
  return linhasDaPlanilha(people, dados, escopo)
    .map(linha => linha.map(valor => String(valor ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t'))
    .join('\n');
}

export const nomeDaPlanilha = (escopo: EscopoDaPlanilha = 'completa') =>
  `catalog-${escopo === 'completa' ? 'fichas-completas' : 'fichas-resumo'}-${today()}.csv`;

export interface SaidaDaPlanilha { arquivo: string; pessoas: number; colunas: number }

/** Gera o arquivo e entrega para o navegador baixar. */
export function baixarPlanilha(
  people: Person[],
  dados: AppData,
  escopo: EscopoDaPlanilha = 'completa',
): SaidaDaPlanilha {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('privacy-active')) {
    throw new Error('Exportação cancelada pelo modo privacidade: nada sai do aparelho enquanto ele estiver ligado.');
  }
  if (!people.length) throw new Error('Não há pessoas para exportar.');
  const arquivo = nomeDaPlanilha(escopo);
  downloadBlob(new Blob([csvDasPessoas(people, dados, escopo)], { type: 'text/csv;charset=utf-8;' }), arquivo);
  return { arquivo, pessoas: people.length, colunas: colunasDaPlanilha(escopo).length };
}

/** Copia a planilha para a área de transferência (cola direto no Sheets/Excel). */
export async function copiarPlanilha(
  people: Person[],
  dados: AppData,
  escopo: EscopoDaPlanilha = 'completa',
): Promise<boolean> {
  if (!people.length) return false;
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(tsvDasPessoas(people, dados, escopo));
    return true;
  } catch { return false; }
}
