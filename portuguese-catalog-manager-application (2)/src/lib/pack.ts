import type { AppData, Person, Photo, TierList, Vinculo } from '../types';
import { LOCATION_OPTIONS } from '../types';
import { absorbReferences, calculateOverallRating, generateId, normalizeData, normalizePerson, normalizePhotos, normalizeText } from '../store';

/**
 * Pacote de categoria: um JSON com as fichas de uma categoria só (igreja, trabalho, FSY...).
 * Serve para mandar o seu time para outra pessoa abrir no perfil dela e montar a
 * tierlist com quem você já conhece — sem levar o catálogo inteiro junto.
 */
export const PACK_KIND = 'catalog-categoria';
export const PACK_VERSION = 1;

export interface PacoteItemTier { ref: string; tier: string }

export interface PacoteTierlist {
  nome: string;
  tiers: string[];
  colors?: Record<string, string>;
  itens: PacoteItemTier[];
  allowedSubcategories: string[];
}

export interface PacoteCategoria {
  kind: typeof PACK_KIND;
  version: number;
  exportadoEm: string;
  autor: string;
  categoria: string;
  categoriaLabel: string;
  subcategoria: string;
  etiquetas: string[];
  incluiFotos: boolean;
  total: number;
  pessoas: Person[];
  tierlist: PacoteTierlist;
}

export interface OpcoesPacote {
  subcategoria?: string;
  incluirFotos?: boolean;
  incluirNotas?: boolean;
}

const TIERS_PADRAO = ['Já conheço bem', 'Vale conhecer', 'Quero conhecer', 'Ainda em dúvida'];
const CORES_PADRAO = ['#c786ec', '#86bfa1', '#e6ad77', '#86a8d8'];

const clonar = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Só fotos que viajam sozinhas (base64). Caminhos locais seriam links quebrados no outro perfil. */
const fotoQueViaja = (foto: Photo | undefined) => !!foto && /^data:image\//i.test(foto.url);

/** Quem sai no pacote: as fichas vivas da categoria escolhida. */
export function pessoasDaCategoria(data: AppData, categoria: string, subcategoria = '') {
  return data.people.filter(pessoa => !pessoa.deletedAt && !pessoa.archivedAt
    && pessoa.localizacaoOnde === categoria
    && (!subcategoria || pessoa.localizacaoSub === subcategoria));
}

/** Categoria vazia na hora de exportar é um erro claro, não um arquivo vazio. */
export function categoriaDoPacote(data: AppData, categoria: string) {
  return data.categories.find(item => item.value === categoria)
    || LOCATION_OPTIONS.find(item => item.value === categoria)
    || { value: categoria, label: categoria, subs: [] };
}

/** Monta o pacote em memória: fichas reduzidas, etiquetas e a tierlist de quem exportou. */
export function montarPacote(data: AppData, categoria: string, opcoes: OpcoesPacote = {}): PacoteCategoria {
  const info = categoriaDoPacote(data, categoria);
  const pessoas = pessoasDaCategoria(data, categoria, opcoes.subcategoria || '');
  if (!pessoas.length) throw new Error('Nenhuma ficha nesta categoria para exportar.');
  const ids = new Set(pessoas.map(pessoa => pessoa.id));
  const refs = new Map(pessoas.map((pessoa, indice) => [pessoa.id, `p${indice + 1}`]));
  const enxutas = pessoas.map(pessoa => {
    const clonada = clonar(pessoa);
    const fotos = opcoes.incluirFotos ? clonada.fotos.filter(fotoQueViaja) : [];
    const principal = fotos.find(foto => foto.isMain) || fotos[0];
    return {
      ...clonada,
      id: refs.get(pessoa.id)!,
      favorite: false,
      pinned: false,
      archivedAt: null,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
      fotos: principal ? [{ ...principal, id: generateId(), personId: refs.get(pessoa.id)!, isMain: true }] : [],
      notas: opcoes.incluirNotas ? clonada.notas : [],
      attachments: [],
      vinculos: (clonada.vinculos || [])
        .filter(vinculo => ids.has(vinculo.personId))
        .map(vinculo => ({ ...vinculo, id: generateId(), personId: refs.get(vinculo.personId)! })),
    } as Person;
  });
  const lista = data.tierLists.find(item => item.allowedCategories.includes(categoria) || item.allowedCategories.includes('todas'));
  const tiers = lista?.tiers?.length ? [...lista.tiers] : [...TIERS_PADRAO];
  const itens = enxutas
    .map(pessoa => { const posicao = lista?.items.find(item => item.personId === pessoas[enxutas.indexOf(pessoa)].id); return posicao && tiers.includes(posicao.tier) ? { ref: pessoa.id, tier: posicao.tier } : null; })
    .filter((item): item is PacoteItemTier => !!item);
  return {
    kind: PACK_KIND,
    version: PACK_VERSION,
    exportadoEm: new Date().toISOString(),
    autor: data.settings.profileName || data.settings.username || 'alguém',
    categoria: info.value,
    categoriaLabel: info.label,
    subcategoria: opcoes.subcategoria ? (info.subs?.find(sub => sub.value === opcoes.subcategoria)?.label || opcoes.subcategoria) : '',
    etiquetas: [...new Set(enxutas.flatMap(pessoa => pessoa.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    incluiFotos: !!opcoes.incluirFotos && enxutas.some(pessoa => pessoa.fotos.length > 0),
    total: enxutas.length,
    pessoas: enxutas,
    tierlist: { nome: `${info.label} — ${data.settings.profileName || 'minha'} lista`, tiers, colors: lista?.colors || Object.fromEntries(tiers.map((tier, i) => [tier, CORES_PADRAO[i % CORES_PADRAO.length]])), itens, allowedSubcategories: opcoes.subcategoria ? [`${info.value}::${opcoes.subcategoria}`] : ['todas'] },
  };
}

export function nomeDoArquivo(pacote: PacoteCategoria) {
  const limpo = (texto: string) => normalizeText(texto).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'categoria';
  return `catalog-${limpo(pacote.categoria)}-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Lê e valida o arquivo. Devolve o pacote pronto ou um erro explicando o problema. */
export function lerPacote(valor: unknown): PacoteCategoria {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Este arquivo não é um pacote de categoria do Catalog.');
  const bruto = valor as Partial<PacoteCategoria>;
  if (bruto.kind !== PACK_KIND) throw new Error('Este arquivo não é um pacote de categoria do Catalog.');
  if (!Array.isArray(bruto.pessoas) || !bruto.pessoas.length) throw new Error('O pacote não tem nenhuma ficha.');
  const pessoas = bruto.pessoas.map(item => normalizePerson(item)).map((pessoa, indice) => ({ ...pessoa, id: pessoa.id || `p${indice + 1}` }));
  const ids = new Set(pessoas.map(pessoa => pessoa.id));
  const tiers = Array.isArray(bruto.tierlist?.tiers) && bruto.tierlist!.tiers.length ? bruto.tierlist!.tiers.filter(tier => typeof tier === 'string' && tier.trim()).slice(0, 12) : [...TIERS_PADRAO];
  const itens = Array.isArray(bruto.tierlist?.itens)
    ? bruto.tierlist!.itens.filter(item => !!item && ids.has(item.ref) && tiers.includes(item.tier)).map(item => ({ ref: item.ref, tier: item.tier }))
    : [];
  return {
    kind: PACK_KIND,
    version: Number(bruto.version) || PACK_VERSION,
    exportadoEm: typeof bruto.exportadoEm === 'string' ? bruto.exportadoEm : new Date().toISOString(),
    autor: typeof bruto.autor === 'string' && bruto.autor.trim() ? bruto.autor.trim() : 'outro perfil',
    categoria: typeof bruto.categoria === 'string' ? bruto.categoria : 'outra',
    categoriaLabel: typeof bruto.categoriaLabel === 'string' && bruto.categoriaLabel.trim() ? bruto.categoriaLabel.trim() : (bruto.categoria || 'Outra'),
    subcategoria: typeof bruto.subcategoria === 'string' ? bruto.subcategoria : '',
    etiquetas: [...new Set(pessoas.flatMap(pessoa => pessoa.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    incluiFotos: pessoas.some(pessoa => pessoa.fotos.length > 0),
    total: pessoas.length,
    pessoas,
    tierlist: {
      nome: typeof bruto.tierlist?.nome === 'string' && bruto.tierlist.nome.trim() ? bruto.tierlist.nome.trim() : `${bruto.categoriaLabel || 'Categoria'} — pacote recebido`,
      tiers,
      colors: bruto.tierlist?.colors,
      itens,
      allowedSubcategories: Array.isArray(bruto.tierlist?.allowedSubcategories) && bruto.tierlist!.allowedSubcategories!.length ? bruto.tierlist!.allowedSubcategories!.filter(item => typeof item === 'string') : ['todas'],
    },
  };
}

export interface ResumoImportacao {
  adicionadas: number;
  reaproveitadas: number;
  novosVinculos: number;
  etiquetasNovas: string[];
  categoriaNova: boolean;
  tierlistNome: string;
  itensNaTierlist: number;
  fotos: number;
}

const chavePessoa = (pessoa: Pick<Person, 'nome' | 'localizacaoOnde'>) => `${normalizeText(pessoa.nome)}::${pessoa.localizacaoOnde || ''}`;

/**
 * Junta o pacote no catálogo atual: quem já existe pelo mesmo nome entra como a mesma
 * pessoa (nada de duplicata), quem é novo vira ficha nova, e a tierlist do pacote é
 * recriada com as faixas e as posições que vieram.
 */
export function importarPacote(data: AppData, pacote: PacoteCategoria): { data: AppData; resumo: ResumoImportacao } {
  const proximo = clonar(data);
  const conhecidas = new Map(proximo.people.map(pessoa => [chavePessoa(pessoa), pessoa.id]));
  const mapa = new Map<string, string>();
  const resumo: ResumoImportacao = { adicionadas: 0, reaproveitadas: 0, novosVinculos: 0, etiquetasNovas: [], categoriaNova: !proximo.categories.some(item => item.value === pacote.categoria || normalizeText(item.label) === normalizeText(pacote.categoriaLabel)), tierlistNome: pacote.tierlist.nome, itensNaTierlist: 0, fotos: 0 };
  const etiquetasAntes = new Set([...proximo.settings.customTags.map(tag => normalizeText(tag.nome)), ...proximo.people.flatMap(pessoa => pessoa.tags.map(tag => normalizeText(tag)))]);

  pacote.pessoas.forEach((entrada, indice) => {
    const existente = conhecidas.get(chavePessoa(entrada));
    if (existente) { mapa.set(entrada.id, existente); resumo.reaproveitadas += 1; return; }
    const id = generateId();
    const ref = entrada.id || `p${indice + 1}`;
    mapa.set(ref, id);
    const novasFotos = pacote.incluiFotos ? normalizePhotos(entrada.fotos.map(foto => ({ ...foto, id: generateId(), personId: id })), id) : [];
    resumo.fotos += novasFotos.length;
    proximo.people.push({
      ...entrada,
      id,
      apelido: entrada.apelido?.startsWith('(') ? entrada.apelido : [entrada.apelido, `via ${pacote.autor}`].filter(Boolean).join(' · ').slice(0, 80),
      localizacaoOnde: pacote.categoria,
      localizacaoSub: entrada.localizacaoSub || '',
      favorite: false,
      pinned: false,
      archivedAt: null,
      deletedAt: null,
      fotos: novasFotos,
      notas: (entrada.notas || []).map(nota => ({ ...nota, id: generateId() })),
      attachments: [],
      vinculos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    conhecidas.set(chavePessoa(entrada), id);
    resumo.adicionadas += 1;
  });

  // Vínculos internos do pacote só valem entre fichas que vieram juntas.
  pacote.pessoas.forEach(entrada => {
    const alvo = mapa.get(entrada.id);
    if (!alvo) return;
    const dono = proximo.people.find(pessoa => pessoa.id === alvo);
    if (!dono) return;
    (entrada.vinculos || []).forEach(vinculo => {
      const outro = mapa.get(vinculo.personId);
      if (!outro || outro === alvo) return;
      const atual: Vinculo[] = dono.vinculos || [];
      if (atual.some(item => item.personId === outro && item.papel === vinculo.papel)) return;
      dono.vinculos = [...atual, { id: generateId(), personId: outro, papel: vinculo.papel }].slice(0, 40);
      resumo.novosVinculos += 1;
    });
  });

  const itens = pacote.tierlist.itens.map(item => ({ personId: mapa.get(item.ref) || '', tier: item.tier })).filter(item => item.personId && proximo.people.some(pessoa => pessoa.id === item.personId));
  const lista: TierList = {
    id: generateId(),
    nome: pacote.tierlist.nome.slice(0, 80),
    tiers: [...pacote.tierlist.tiers],
    items: itens,
    allowedCategories: [pacote.categoria],
    allowedSubcategories: pacote.tierlist.allowedSubcategories.length ? pacote.tierlist.allowedSubcategories : ['todas'],
    colors: pacote.tierlist.colors,
    updatedAt: new Date().toISOString(),
  };
  resumo.itensNaTierlist = itens.length;
  proximo.tierLists = [...proximo.tierLists, lista];

  absorbReferences(proximo);
  const comCategorias = normalizeData(proximo);
  const etiquetasDepois = comCategorias.people.flatMap(pessoa => pessoa.tags);
  resumo.etiquetasNovas = [...new Set(etiquetasDepois.filter(tag => !etiquetasAntes.has(normalizeText(tag))))];
  return { data: comCategorias, resumo };
}

/** Ficha do pacote em uma linha, para a tela de conferência antes de importar. */
export function resumoDoPacote(pacote: PacoteCategoria) {
  return {
    titulo: `${pacote.categoriaLabel}${pacote.subcategoria ? ` · ${pacote.subcategoria}` : ''}`,
    autor: pacote.autor,
    total: pacote.total,
    etiquetas: pacote.etiquetas,
    faixas: pacote.tierlist.tiers,
    pessoas: pacote.pessoas.map(pessoa => ({ nome: pessoa.nome, idade: pessoa.idade, nota: Math.round(calculateOverallRating(pessoa.rating) * 10) / 10, tags: pessoa.tags })),
  };
}
