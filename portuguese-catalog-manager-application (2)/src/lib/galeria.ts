/**
 * Lógica da galeria, separada da tela.
 *
 * Tudo aqui é função pura (ou quase): serve tanto o `Gallery.tsx` quanto os
 * testes, e principalmente o layout de mosaico, que precisa de conta de
 * proporção para caber na largura do celular sem depender de biblioteca.
 */
import type { AppData, Folder, Photo } from '../types';
import { generateId, medirImagem, readImage } from '../store';

/* ------------------------------------------------------------------ modos -- */

export type ModoGaleria = 'mosaico' | 'quadra' | 'linha';

export const MODOS_GALERIA: { id: ModoGaleria; nome: string; dica: string }[] = [
  { id: 'mosaico', nome: 'Mosaico', dica: 'Cada foto no seu tamanho, como no álbum de fotos do celular.' },
  { id: 'quadra', nome: 'Quadra', dica: 'Quadrados iguais: mais fotos na tela, ideal para escolher em lote.' },
  { id: 'linha', nome: 'Linha do tempo', dica: 'Agrupado por dia, com a data presa no alto de cada trecho.' },
];

/* -------------------------------------------------------------- proporções */

/**
 * Proporção (largura ÷ altura) de cada foto.
 *
 * A medida viaja no registro da foto quando ela entra (ver `medirImagem` no
 * store) e, para fotos antigas que não têm a medida guardada, é descoberta na
 * primeira vez que a imagem aparece e fica em cache — assim rolar a galeria
 * não recomeça a conta a cada quadro.
 */
const cacheDeRazoes = new Map<string, number>();

export function registrarRazao(id: string, largura: number, altura: number) {
  if (!id || !(largura > 0) || !(altura > 0)) return 0;
  const razao = Math.round((largura / altura) * 1000) / 1000;
  cacheDeRazoes.set(id, razao);
  return razao;
}

/** Só lê a cache (usado nas fotos dos álbuns, fora da grade principal). */
export const razaoNaCache = (id: string) => cacheDeRazoes.get(id) || 0;

export function razaoDaFoto(photo: Photo): number {
  const largura = Number((photo as Photo & { width?: number }).width) || 0;
  const altura = Number((photo as Photo & { height?: number }).height) || 0;
  if (largura > 0 && altura > 0) return Math.round((largura / altura) * 1000) / 1000;
  return cacheDeRazoes.get(photo.id) || 1;
}

/** Limita a proporção: uma panorama 21:9 não pode abrir um buraco na tela. */
export const razaoParaMosaico = (razao: number) => Math.min(2.4, Math.max(0.5, razao || 1));

/* ------------------------------------------------------------ preferência -- */

/**
 * Modo de ver preferido por tela.
 *
 * Galeria e cofre guardam a escolha cada uma na sua chave: quem organiza o
 * cofre em quadra não quer o catálogo inteiro em quadra por causa disso.
 */
export function lerModoSalvo(chave: string): ModoGaleria | '' {
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo === 'mosaico' || salvo === 'quadra' || salvo === 'linha') return salvo;
  } catch { /* preferência é opcional */ }
  return '';
}

export function salvarModo(chave: string, modo: ModoGaleria) {
  try { localStorage.setItem(chave, modo); } catch { /* preferência é opcional */ }
}

/**
 * Quantas linhas o item ocupa num grid com `grid-auto-rows: alturaDaLinha`.
 *
 * Num grid assim, um item que cobre `span` linhas tem altura
 * `span * linha + (span - 1) * espaco`. Isolando o span:
 * `span = (alturaDesejada + espaco) / (linha + espaco)`.
 */
export function spanDaFoto(razao: number, larguraDaCelula: number, alturaDaLinha = 8, espaco = 8): number {
  if (!(larguraDaCelula > 0) || !(alturaDaLinha > 0)) return 30;
  const altura = larguraDaCelula / razaoParaMosaico(razao);
  const span = Math.round((altura + espaco) / (alturaDaLinha + espaco));
  return Math.max(4, Math.min(120, span || 4));
}

/** Colunas da grade de quadrados: 2 no bolso, 3 no tablet pequeno, mais no desktop. */
export function colunasDaQuadra(largura: number): number {
  if (largura <= 360) return 2;
  if (largura <= 520) return 3;
  if (largura <= 900) return 4;
  if (largura <= 1250) return 5;
  return 6;
}

/* -------------------------------------------------------------------- dias */

export interface GrupoDeDia {
  chave: string;
  titulo: string;
  fotos: Photo[];
}

/** Data local da foto (YYYY-MM-DD). Aceita ISO completo ou só a data. */
export function chaveDoDia(photo: Photo): string {
  const bruto = photo.capturedAt || photo.createdAt || '';
  if (/^\d{4}-\d{2}-\d{2}/.test(bruto)) return bruto.slice(0, 10);
  const date = new Date(bruto);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Nome amigável do dia: Hoje, Ontem, "12 de março" ou "12 de março de 2023". */
export function tituloDoDia(chave: string, agora = new Date()): string {
  if (!chave) return 'Sem data';
  const [ano, mes, dia] = chave.split('-').map(Number);
  if (!ano || !mes || !dia) return 'Sem data';
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const alvo = new Date(ano, mes - 1, dia);
  const diferenca = Math.round((hoje.getTime() - alvo.getTime()) / 86400000);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Ontem';
  if (diferenca === -1) return 'Amanhã';
  const mesmoAno = alvo.getFullYear() === hoje.getFullYear();
  const data = alvo.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', ...(mesmoAno ? {} : { year: 'numeric' }) });
  return data.charAt(0).toUpperCase() + data.slice(1);
}

/** Agrupa mantendo a ordem recebida dentro de cada dia; dias do mais novo ao mais antigo. */
export function agruparPorDia(fotos: Photo[], agora = new Date()): GrupoDeDia[] {
  const ordem = new Map<string, GrupoDeDia>();
  for (const photo of fotos) {
    const chave = chaveDoDia(photo);
    const grupo = ordem.get(chave);
    if (grupo) grupo.fotos.push(photo);
    else ordem.set(chave, { chave, titulo: tituloDoDia(chave, agora), fotos: [photo] });
  }
  return [...ordem.values()].sort((a, b) => (a.chave < b.chave ? 1 : a.chave > b.chave ? -1 : 0));
}

/* ---------------------------------------------------------------- filtros -- */

export interface FiltrosDeGaleria {
  busca: string;
  tipo: '' | Photo['type'];
  pessoa: string;      // '', '__orphan' ou id
  pasta: string;       // '', '__orphan-folder' ou id
  album: string;
  ordem: 'recent' | 'antiga' | 'nome' | 'pessoa';
  favoritas: boolean;
}

export const FILTROS_PADRAO: FiltrosDeGaleria = {
  busca: '', tipo: '', pessoa: '', pasta: '', album: '', ordem: 'recent', favoritas: false,
};

export const ORDENACOES: { id: FiltrosDeGaleria['ordem']; nome: string }[] = [
  { id: 'recent', nome: 'Mais novas primeiro' },
  { id: 'antiga', nome: 'Mais antigas primeiro' },
  { id: 'nome', nome: 'Nome A a Z' },
  { id: 'pessoa', nome: 'Por pessoa' },
];

export const fotoEmPasta = (photo: Photo, id: string, folders: Folder[]) =>
  !!folders.find(folder => folder.id === id)?.photoIds.includes(photo.id) || photo.folderId === id;

const semPasta = (photo: Photo, folders: Folder[]) => !folders.some(folder => fotoEmPasta(photo, folder.id, folders));

/** Normaliza o texto para buscar sem se preocupar com acento ou maiúscula. */
const limpar = (texto: string) => (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function aplicarFiltros(
  fotos: Photo[],
  filtros: FiltrosDeGaleria,
  data: Pick<AppData, 'people' | 'folders' | 'albums'>,
): Photo[] {
  const busca = limpar(filtros.busca.trim());
  const nomes = new Map(data.people.map(person => [person.id, person.nome]));
  const filtradas = fotos.filter(photo => {
    if (filtros.tipo && photo.type !== filtros.tipo) return false;
    if (filtros.favoritas && !photo.favorite) return false;
    if (filtros.pessoa === '__orphan' ? !!photo.personId : filtros.pessoa && photo.personId !== filtros.pessoa) return false;
    if (filtros.pasta === '__orphan-folder' ? !semPasta(photo, data.folders) : filtros.pasta && !fotoEmPasta(photo, filtros.pasta, data.folders)) return false;
    if (filtros.album) {
      // o álbum guarda as fotos por id; `photo.albumIds` é o caminho inverso.
      const noAlbum = data.albums.find(album => album.id === filtros.album)?.photoIds.includes(photo.id);
      if (!noAlbum && !(photo.albumIds || []).includes(filtros.album)) return false;
    }
    if (busca) {
      const alvo = limpar([photo.name, photo.description, nomes.get(photo.personId || '') || '', ...((photo.albumIds || []).map(id => data.albums.find(album => album.id === id)?.name || ''))].filter(Boolean).join(' '));
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
  const porNome = (photo: Photo) => photo.name || 'zzz';
  const porPessoa = (photo: Photo) => nomes.get(photo.personId || '') || 'zzzz';
  const porData = (photo: Photo) => photo.capturedAt || photo.createdAt || '';
  return filtradas.sort((a, b) => {
    if (filtros.ordem === 'nome') return porNome(a).localeCompare(porNome(b), 'pt-BR');
    if (filtros.ordem === 'pessoa') return porPessoa(a).localeCompare(porPessoa(b), 'pt-BR') || porData(a).localeCompare(porData(b));
    if (filtros.ordem === 'antiga') return porData(a).localeCompare(porData(b));
    return porData(b).localeCompare(porData(a));
  });
}

/** Quantos filtros fora do padrão estão ligados (o botão mostra o número no chip). */
export function contarFiltrosAtivos(filtros: FiltrosDeGaleria): number {
  return (['busca', 'tipo', 'pessoa', 'pasta', 'album'] as const).filter(chave => String(filtros[chave] || '').trim()).length
    + (filtros.favoritas ? 1 : 0)
    + (filtros.ordem !== 'recent' ? 1 : 0);
}

export interface ChipDeFiltro { chave: keyof FiltrosDeGaleria; rotulo: string }

/** Etiquetas removíveis do que está filtrando agora, para a barra de chips. */
export function chipsDeFiltro(
  filtros: FiltrosDeGaleria,
  data: Pick<AppData, 'people' | 'folders' | 'albums'>,
): ChipDeFiltro[] {
  const chips: ChipDeFiltro[] = [];
  const rotulo = (lista: { id?: string; name?: string }[], id: string, padrao = 'Sem') =>
    lista.find(item => item.id === id)?.name || padrao;
  if (filtros.busca.trim()) chips.push({ chave: 'busca', rotulo: `“${filtros.busca.trim()}”` });
  if (filtros.tipo) chips.push({ chave: 'tipo', rotulo: { normal: 'Normal', biquini: 'Biquíni', sem_nada: 'Sem nada' }[filtros.tipo] });
  if (filtros.pessoa) chips.push({ chave: 'pessoa', rotulo: filtros.pessoa === '__orphan' ? 'Sem ficha' : data.people.find(person => person.id === filtros.pessoa)?.nome || 'Pessoa' });
  if (filtros.pasta) chips.push({ chave: 'pasta', rotulo: filtros.pasta === '__orphan-folder' ? 'Sem pasta' : rotulo(data.folders, filtros.pasta, 'Pasta') });
  if (filtros.album) chips.push({ chave: 'album', rotulo: rotulo(data.albums, filtros.album, 'Álbum') });
  if (filtros.favoritas) chips.push({ chave: 'favoritas', rotulo: 'Só favoritas' });
  if (filtros.ordem !== 'recent') chips.push({ chave: 'ordem', rotulo: ORDENACOES.find(item => item.id === filtros.ordem)?.nome || 'Ordem' });
  return chips;
}

/* --------------------------------------------------------------- seleção -- */

export const alternarSelecao = (lista: string[], id: string) =>
  lista.includes(id) ? lista.filter(item => item !== id) : [...lista, id];

/** Seleciona o intervalo entre dois toques (arrastar a seleção em lote no dedo). */
export function intervaloEntre(fotos: Photo[], deId: string, ateId: string): string[] {
  const inicio = fotos.findIndex(photo => photo.id === deId);
  const fim = fotos.findIndex(photo => photo.id === ateId);
  if (inicio < 0 || fim < 0) return [];
  const [a, b] = inicio <= fim ? [inicio, fim] : [fim, inicio];
  return fotos.slice(a, b + 1).map(photo => photo.id);
}

/* --------------------------------------------------------------- estatísticas */

export interface ResumoDaGaleria {
  total: number;
  favoritas: number;
  semFicha: number;
  dias: number;
  pessoas: number;
  maisAntiga: string;
  maisNova: string;
}

export function resumoDaGaleria(fotos: Photo[]): ResumoDaGaleria {
  const datas = fotos.map(photo => chaveDoDia(photo)).filter(Boolean).sort();
  const pessoas = new Set(fotos.map(photo => photo.personId).filter(Boolean));
  return {
    total: fotos.length,
    favoritas: fotos.filter(photo => photo.favorite).length,
    semFicha: fotos.filter(photo => !photo.personId).length,
    dias: new Set(fotos.map(chaveDoDia).filter(Boolean)).size,
    pessoas: pessoas.size,
    maisAntiga: datas[0] || '',
    maisNova: datas[datas.length - 1] || '',
  };
}

/* ------------------------------------------------- faixas grudadas no topo -- */

/**
 * Altura real das faixas que ficam presas no topo da galeria.
 *
 * `position: sticky` não conhece o sticky do vizinho: a barra de filtros
 * precisa saber a altura das abas para não subir por cima delas, e o título de
 * cada dia precisa saber a altura das duas para não desaparecer atrás da barra.
 * Mede `offsetHeight` — onde não há caixa para medir (teste, impressora) o
 * resultado é 0 e o CSS fica com a reserva escrita no próprio `calc`.
 */
export function medirFaixasDoTopo(pagina: HTMLElement | null): { escopo: number; barra: number } {
  const altura = (seletor: string) => {
    const el = pagina?.querySelector<HTMLElement>(seletor);
    const medida = el?.offsetHeight || 0;
    return medida > 0 ? Math.round(medida) : 0;
  };
  return { escopo: altura('.scope-tabs'), barra: altura('.gallery-topo') };
}

/** Rótulo curto para o cabeçalho do visor ("3 de 40"). */
export const posicaoNoConjunto = (total: number, indice: number) => `${Math.max(1, indice + 1)} de ${total || 1}`;

/* ---------------------------------------------------------------- entrada -- */

/**
 * Prepara arquivos escolhidos (ou fotografados) para entrar no catálogo.
 *
 * A mesma conta que a galeria faz: lê a imagem, mede o original e guarda as
 * medidas — é delas que o mosaico vive, para não recalcular proporção a cada
 * quadro. Mora aqui, e não dentro da tela, porque agora dois caminhos
 * alimentam a galeria: o envio da própria Galeria e o "+" inteligente do
 * aplicativo (ver `QuickAddModal`).
 */
export async function prepararFotosSoltas(arquivos: File[]): Promise<Photo[]> {
  const fotos: Photo[] = [];
  for (const arquivo of arquivos) {
    const url = await readImage(arquivo);
    const { width, height } = await medirImagem(url);
    fotos.push({
      id: generateId(), url, width, height, name: arquivo.name,
      personId: null, isMain: false, type: 'normal', createdAt: new Date().toISOString(),
    });
  }
  return fotos;
}
