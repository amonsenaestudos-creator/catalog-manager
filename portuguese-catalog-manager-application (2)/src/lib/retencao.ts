/**
 * Retenção saudável: o que faz a pessoa querer continuar explorando.
 *
 * Tudo aqui é função pura sobre os dados — presente diário, momentos do dia,
 * trilha aleatória, mapa de conexões, máquina do tempo, slides de TV,
 * mini-desafios, desbloqueáveis visuais e easter eggs. Nada foi feito para
 * prender compulsivamente: o presente não exige entrar todo dia, a sequência
 * só conta quando algo foi realmente encontrado ou organizado, e os ovos de
 * páscoa são surpresas raras, não metas com contador na cara.
 */
import type { AppData, Memory, Person, Photo } from '../types';
import { vinculoLabel } from '../types';
import {
  calculateOverallRating, completeness, corDaPessoa, daysSince, formatNumber,
  getAllPhotos, isActive, locationLabel, todosOsMomentos,
} from '../store';

// ---------------------------------------------------------------------------
// Sorteio com semente: o mesmo dia sempre dá o mesmo presente
// ---------------------------------------------------------------------------

export function hashTexto(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Embaralha uma cópia da lista com o gerador dado. */
export function embaralhar<T>(lista: T[], rng: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ---------------------------------------------------------------------------
// Tempo em palavras
// ---------------------------------------------------------------------------

export function mesesDesde(iso?: string | null): number {
  if (!iso) return 0;
  const inicio = Date.parse(iso);
  if (!Number.isFinite(inicio)) return 0;
  const agora = new Date();
  const antes = new Date(inicio);
  const meses = (agora.getFullYear() - antes.getFullYear()) * 12 + (agora.getMonth() - antes.getMonth());
  return Math.max(0, meses);
}

export function haQuantoTempo(iso?: string | null): string {
  const dias = daysSince(iso);
  if (dias === null) return 'há algum tempo';
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  if (dias < 30) return `há ${dias} dias`;
  const meses = mesesDesde(iso);
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (!resto) return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'} e ${resto} ${resto === 1 ? 'mês' : 'meses'}`;
}

// ---------------------------------------------------------------------------
// Estatísticas rápidas (slides, presente, cartões)
// ---------------------------------------------------------------------------

export interface EstatisticasRapidas {
  fichas: number;
  fotos: number;
  videos: number;
  pastas: number;
  albuns: number;
  memorias: number;
  notas: number;
  notaMedia: number;
  completudeMedia: number;
  favoritas: number;
  diasCatalogo: number;
}

export function estatisticasRapidas(data: AppData): EstatisticasRapidas {
  const ativas = data.people.filter(isActive);
  const notas = ativas.map(p => calculateOverallRating(p.rating)).filter(n => n > 0);
  const criacoes = data.people.map(p => Date.parse(p.createdAt)).filter(n => Number.isFinite(n));
  const primeira = criacoes.length ? Math.min(...criacoes) : Date.now();
  return {
    fichas: ativas.length,
    fotos: getAllPhotos(data).length,
    videos: todosOsMomentos(data).length,
    pastas: data.folders.length,
    albuns: data.albums.length,
    memorias: data.memories.length + data.journal.length,
    notas: data.generalNotes.length + ativas.reduce((n, p) => n + p.notas.length, 0),
    notaMedia: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0,
    completudeMedia: ativas.length ? Math.round(ativas.reduce((n, p) => n + completeness(p).percent, 0) / ativas.length) : 0,
    favoritas: ativas.filter(p => p.favorite).length,
    diasCatalogo: Math.max(1, Math.round((Date.now() - primeira) / 86400000) + 1),
  };
}

// ---------------------------------------------------------------------------
// Presente diário: uma surpresa por dia, sem obrigação de entrar todo dia
// ---------------------------------------------------------------------------

export type TipoPresente = 'pessoa' | 'foto' | 'colecao' | 'estatistica' | 'memoria' | 'conquista';

export interface Presente {
  id: string;
  tipo: TipoPresente;
  titulo: string;
  descricao: string;
  /** Para onde o botão “Abrir” leva. */
  pagina: string;
  personId?: string;
  imagem?: string;
  cor?: string;
}

export function presenteDoDia(data: AppData, dia: string): Presente | null {
  const ativas = data.people.filter(isActive);
  if (!ativas.length) return null;
  const fotos = getAllPhotos(data);
  const stats = estatisticasRapidas(data);
  const candidatos: Presente[] = [];
  const rng = mulberry32(hashTexto(`presente:${dia}:${ativas.length}:${fotos.length}`));
  const pegar = <T,>(lista: T[]): T => lista[Math.floor(rng() * lista.length)];

  // Uma pessoa antiga que merece uma revisita.
  const antigas = [...ativas].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, Math.max(3, Math.floor(ativas.length / 3)));
  if (antigas.length) {
    const pessoa = pegar(antigas);
    const foto = pessoa.fotos.find(f => f.isMain) || pessoa.fotos[0];
    candidatos.push({
      id: `${dia}:pessoa:${pessoa.id}`, tipo: 'pessoa', pagina: 'ficha', personId: pessoa.id,
      titulo: pessoa.nome, descricao: `No catálogo ${haQuantoTempo(pessoa.createdAt)}. Que tal matar a saudade?`,
      imagem: foto?.url, cor: corDaPessoa(pessoa),
    });
  }
  // Uma foto perdida no meio da galeria.
  if (fotos.length) {
    const foto = pegar(fotos);
    const dona = ativas.find(p => p.id === foto.personId);
    candidatos.push({
      id: `${dia}:foto:${foto.id}`, tipo: 'foto', pagina: 'gallery', personId: dona?.id,
      titulo: dona ? `Uma foto de ${dona.nome}` : 'Uma foto sem ficha',
      descricao: foto.description || `Guardada ${haQuantoTempo(foto.createdAt || foto.capturedAt)}.`,
      imagem: foto.url, cor: dona ? corDaPessoa(dona) : undefined,
    });
  }
  // Uma coleção (pasta, álbum ou coleção legada) para reabrir.
  const colecoes: { nome: string; detalhe: string; pagina: string }[] = [
    ...data.folders.map(f => ({ nome: f.name, detalhe: `${f.personIds.length} pessoa(s) guardadas`, pagina: 'folders' })),
    ...data.albums.map(a => ({ nome: a.name, detalhe: `${a.photoIds.length} foto(s) no álbum`, pagina: 'gallery' })),
    ...data.collections.map(c => ({ nome: c.name, detalhe: `${c.personIds.length} pessoa(s) na coleção`, pagina: 'collections' })),
  ];
  if (colecoes.length) {
    const colecao = pegar(colecoes);
    candidatos.push({ id: `${dia}:colecao:${colecao.nome}`, tipo: 'colecao', pagina: colecao.pagina, titulo: colecao.nome, descricao: colecao.detalhe });
  }
  // Um número bonito do catálogo.
  const numeros: [string, string][] = [
    [`${stats.fotos} fotos guardadas`, `${stats.fichas} fichas e ${stats.videos} vídeos. Olha o tamanho disso.`],
    [`Nota média ${formatNumber(stats.notaMedia)}`, `Entre ${stats.fichas} fichas avaliadas do seu universo.`],
    [`${stats.diasCatalogo} dias de catálogo`, `Desde a primeira ficha até hoje. Vale comemorar.`],
    [`${stats.completudeMedia}% de capricho`, 'Completude média das fichas. Cada detalhe conta.'],
  ];
  const numero = pegar(numeros);
  candidatos.push({ id: `${dia}:estatistica`, tipo: 'estatistica', pagina: 'dashboard', titulo: numero[0], descricao: numero[1] });
  // Uma memória escrita.
  const memorias: { titulo: string; descricao: string }[] = [
    ...data.memories.map(m => ({ titulo: m.title || 'Uma memória', descricao: m.content.slice(0, 120) })),
    ...data.journal.map(j => ({ titulo: j.title || `Página de ${j.date}`, descricao: j.content.slice(0, 120) })),
  ];
  if (memorias.length) {
    const memoria = pegar(memorias);
    candidatos.push({ id: `${dia}:memoria`, tipo: 'memoria', pagina: 'myspace', titulo: memoria.titulo, descricao: memoria.descricao || 'Escrita por você, guardada com carinho.' });
  }
  if (!candidatos.length) return null;
  return candidatos[Math.floor(rng() * candidatos.length)];
}

// ---------------------------------------------------------------------------
// Momentos do dia: o que foi registrado recentemente, pronto para reproduzir
// ---------------------------------------------------------------------------

export interface MomentosDoDia {
  fotos: Photo[];
  videos: { url: string; legenda: string; personId: string; personNome: string }[];
  pessoas: Person[];
  notas: { titulo: string; detalhe: string }[];
  memorias: Memory[];
  total: number;
  vazio: boolean;
}

export function momentosDoDia(data: AppData, dia: string): MomentosDoDia {
  const comecou = (iso?: string | null) => !!iso && iso.slice(0, 10) === dia;
  const fotos = getAllPhotos(data).filter(f => comecou(f.createdAt) || comecou(f.capturedAt)).slice(0, 12);
  const videos = todosOsMomentos(data).filter(m => comecou(m.createdAt)).slice(0, 8);
  const pessoas = data.people.filter(p => !p.deletedAt && comecou(p.createdAt)).slice(0, 8);
  const notas = [
    ...data.generalNotes.filter(n => comecou(n.createdAt)).map(n => ({ titulo: n.title, detalhe: n.content.slice(0, 100) })),
    ...data.people.filter(p => !p.deletedAt).flatMap(p => p.notas.filter(n => n.date === dia).map(n => ({ titulo: n.title || `Nota em ${p.nome}`, detalhe: n.content.slice(0, 100) }))),
  ].slice(0, 8);
  const memorias = data.memories.filter(m => m.date === dia || comecou(m.createdAt)).slice(0, 6);
  const total = fotos.length + videos.length + pessoas.length + notas.length + memorias.length;
  return { fotos, videos, pessoas, notas, memorias, total, vazio: total === 0 };
}

// ---------------------------------------------------------------------------
// Trilha aleatória: pessoa → foto → coleção → relação → memória → outra pessoa
// ---------------------------------------------------------------------------

export interface PassoTrilha {
  tipo: 'pessoa' | 'foto' | 'colecao' | 'relacao' | 'memoria';
  titulo: string;
  detalhe: string;
  personId?: string;
  imagem?: string;
  cor?: string;
  acao: string;
  pagina: string;
}

export function trilhaExploracao(data: AppData, semente: number): PassoTrilha[] {
  const ativas = data.people.filter(isActive);
  if (!ativas.length) return [];
  const rng = mulberry32(semente >>> 0);
  const pegar = <T,>(lista: T[]): T => lista[Math.floor(rng() * lista.length)];
  const passos: PassoTrilha[] = [];

  // 1. Uma pessoa para começar.
  let atual = pegar(ativas);
  const fotoAtual = () => atual.fotos.find(f => f.isMain) || atual.fotos[0];
  passos.push({
    tipo: 'pessoa', titulo: atual.nome, detalhe: `${locationLabel(atual, data)} · no catálogo ${haQuantoTempo(atual.createdAt)}`,
    personId: atual.id, imagem: fotoAtual()?.url, cor: corDaPessoa(atual), acao: 'Abrir a ficha', pagina: 'ficha',
  });

  // 2. Uma foto dela (ou de outra pessoa, se ela não tiver nenhuma).
  let foto = fotoAtual();
  if (!foto) {
    const comFoto = ativas.filter(p => p.fotos.length);
    if (comFoto.length) { atual = pegar(comFoto); foto = fotoAtual(); }
  }
  if (foto) {
    passos.push({
      tipo: 'foto', titulo: foto.description || `Uma foto de ${atual.nome}`, detalhe: `Guardada ${haQuantoTempo(foto.createdAt || foto.capturedAt)}`,
      personId: atual.id, imagem: foto.url, cor: corDaPessoa(atual), acao: 'Ver na galeria', pagina: 'gallery',
    });
  }

  // 3. Uma coleção onde ela aparece (pasta, álbum, coleção ou tierlist).
  const colecoes: PassoTrilha[] = [
    ...data.folders.filter(f => f.personIds.includes(atual.id)).map(f => ({
      tipo: 'colecao' as const, titulo: f.name, detalhe: `Pasta com ${f.personIds.length} pessoa(s)`, personId: atual.id,
      acao: 'Abrir a pasta', pagina: 'folders',
    })),
    ...data.albums.filter(a => atual.fotos.some(f => a.photoIds.includes(f.id))).map(a => ({
      tipo: 'colecao' as const, titulo: a.name, detalhe: `Álbum com ${a.photoIds.length} foto(s)`, personId: atual.id,
      acao: 'Abrir o álbum', pagina: 'gallery',
    })),
    ...data.collections.filter(c => c.personIds.includes(atual.id)).map(c => ({
      tipo: 'colecao' as const, titulo: c.name, detalhe: `Coleção com ${c.personIds.length} pessoa(s)`, personId: atual.id,
      acao: 'Abrir a coleção', pagina: 'collections',
    })),
    ...data.tierLists.filter(t => t.items.some(i => i.personId === atual.id)).map(t => ({
      tipo: 'colecao' as const, titulo: t.nome, detalhe: 'Tierlist onde ela aparece', personId: atual.id,
      acao: 'Abrir a tierlist', pagina: 'tierlists',
    })),
  ];
  if (colecoes.length) passos.push(pegar(colecoes));
  else {
    const outra = pegar(ativas.filter(p => p.id !== atual.id).length ? ativas.filter(p => p.id !== atual.id) : ativas);
    passos.push({
      tipo: 'colecao', titulo: `Categoria: ${locationLabel(outra, data, false) || 'Sem categoria'}`,
      detalhe: 'Um canto parecido do catálogo para fuçar', personId: outra.id, acao: 'Abrir a ficha', pagina: 'ficha',
    });
  }

  // 4. Uma relação: vínculo de família ou alguém da mesma pasta.
  const vinculo = (atual.vinculos || [])[Math.floor(rng() * (atual.vinculos || []).length)];
  const parente = vinculo && ativas.find(p => p.id === vinculo.personId);
  if (parente) {
    passos.push({
      tipo: 'relacao', titulo: parente.nome, detalhe: `${vinculoLabel(vinculo.papel)} de ${atual.nome}`,
      personId: parente.id, imagem: (parente.fotos.find(f => f.isMain) || parente.fotos[0])?.url,
      cor: corDaPessoa(parente), acao: 'Conhecer a relação', pagina: 'ficha',
    });
    atual = parente;
  } else {
    const pasta = data.folders.find(f => f.personIds.includes(atual.id) && f.personIds.some(id => id !== atual.id && ativas.some(p => p.id === id)));
    const vizinhaId = pasta?.personIds.find(id => id !== atual.id && ativas.some(p => p.id === id));
    const vizinha = ativas.find(p => p.id === vizinhaId);
    if (vizinha) {
      passos.push({
        tipo: 'relacao', titulo: vizinha.nome, detalhe: `Na mesma pasta “${pasta?.name}” que ${atual.nome}`,
        personId: vizinha.id, imagem: (vizinha.fotos.find(f => f.isMain) || vizinha.fotos[0])?.url,
        cor: corDaPessoa(vizinha), acao: 'Conhecer a relação', pagina: 'ficha',
      });
      atual = vizinha;
    }
  }

  // 5. Uma memória ligada a ela (ou uma memória qualquer, para não quebrar a trilha).
  const memorias = data.memories.filter(m => m.personId === atual.id);
  const memoria = (memorias.length ? pegar(memorias) : data.memories.length ? pegar(data.memories) : null) as Memory | null;
  if (memoria) {
    const dona = ativas.find(p => p.id === memoria.personId);
    passos.push({
      tipo: 'memoria', titulo: memoria.title || 'Uma memória', detalhe: memoria.content.slice(0, 110) || 'Guardada com carinho.',
      personId: dona?.id || atual.id, acao: 'Reler a memória', pagina: 'myspace',
    });
  } else {
    const nota = atual.notas[0];
    if (nota) passos.push({ tipo: 'memoria', titulo: nota.title || `Nota em ${atual.nome}`, detalhe: nota.content.slice(0, 110), personId: atual.id, acao: 'Reler a nota', pagina: 'ficha' });
  }

  // 6. E a trilha termina em outra pessoa — de preferência alguém que converse com o caminho.
  const candidatas = ativas.filter(p => p.id !== atual.id && p.id !== passos[0].personId);
  const ultima = candidatas.length ? pegar(candidatas) : pegar(ativas);
  passos.push({
    tipo: 'pessoa', titulo: ultima.nome, detalhe: 'O caminho te trouxe até aqui. Coincidência?',
    personId: ultima.id, imagem: (ultima.fotos.find(f => f.isMain) || ultima.fotos[0])?.url,
    cor: corDaPessoa(ultima), acao: 'Abrir a ficha', pagina: 'ficha',
  });

  return passos;
}

// ---------------------------------------------------------------------------
// Mapa de conexões: pessoa → relações → coleções → fotos → outra pessoa
// ---------------------------------------------------------------------------

export interface NoMapa { id: string; tipo: 'pessoa' | 'pasta' | 'album' | 'colecao' | 'categoria'; rotulo: string; detalhe: string; cor?: string }
export interface ArestaMapa { de: string; para: string; rotulo: string }

export function mapaConexoes(data: AppData, centroId: string, expandirId?: string | null): { nos: NoMapa[]; arestas: ArestaMapa[] } {
  const ativas = data.people.filter(isActive);
  const centro = ativas.find(p => p.id === centroId) || ativas[0];
  if (!centro) return { nos: [], arestas: [] };
  const nos = new Map<string, NoMapa>();
  const arestas: ArestaMapa[] = [];
  const ligar = (de: string, para: string, rotulo: string) => {
    if (de === para) return;
    if (arestas.some(a => (a.de === de && a.para === para) || (a.de === para && a.para === de))) return;
    arestas.push({ de, para, rotulo });
  };
  const porId = (id: string) => ativas.find(p => p.id === id);

  nos.set(centro.id, { id: centro.id, tipo: 'pessoa', rotulo: centro.nome, detalhe: locationLabel(centro, data), cor: corDaPessoa(centro) });
  const vizinhos: { pessoa: Person; rotulo: string }[] = [];
  for (const vinculo of centro.vinculos || []) {
    const outra = porId(vinculo.personId);
    if (outra) vizinhos.push({ pessoa: outra, rotulo: vinculoLabel(vinculo.papel) });
  }
  const pastaMae = data.folders.find(f => f.personIds.includes(centro.id));
  if (pastaMae) {
    nos.set(`pasta:${pastaMae.id}`, { id: `pasta:${pastaMae.id}`, tipo: 'pasta', rotulo: pastaMae.name, detalhe: `${pastaMae.personIds.length} pessoa(s)`, cor: pastaMae.color });
    ligar(centro.id, `pasta:${pastaMae.id}`, 'está na pasta');
    for (const id of pastaMae.personIds.slice(0, 4)) {
      const outra = porId(id);
      if (outra && outra.id !== centro.id && vizinhos.length < 8) vizinhos.push({ pessoa: outra, rotulo: 'mesma pasta' });
    }
  }
  const album = data.albums.find(a => centro.fotos.some(f => a.photoIds.includes(f.id)));
  if (album) {
    nos.set(`album:${album.id}`, { id: `album:${album.id}`, tipo: 'album', rotulo: album.name, detalhe: `${album.photoIds.length} foto(s)`, cor: album.color });
    ligar(centro.id, `album:${album.id}`, 'tem foto no álbum');
  }
  const mesmaCategoria = ativas.filter(p => p.id !== centro.id && p.localizacaoOnde && p.localizacaoOnde === centro.localizacaoOnde).slice(0, 3);
  for (const outra of mesmaCategoria) {
    if (vizinhos.length >= 8) break;
    if (!vizinhos.some(v => v.pessoa.id === outra.id)) vizinhos.push({ pessoa: outra, rotulo: 'mesma categoria' });
  }
  for (const vizinho of vizinhos.slice(0, 8)) {
    nos.set(vizinho.pessoa.id, { id: vizinho.pessoa.id, tipo: 'pessoa', rotulo: vizinho.pessoa.nome, detalhe: locationLabel(vizinho.pessoa, data), cor: corDaPessoa(vizinho.pessoa) });
    ligar(centro.id, vizinho.pessoa.id, vizinho.rotulo);
    // Segundo anel só do nó expandido, para o mapa não virar espaguete.
    if (expandirId === vizinho.pessoa.id) {
      const secundarias = (vizinho.pessoa.vinculos || [])
        .map(v => porId(v.personId))
        .filter((p): p is Person => !!p && p.id !== centro.id && !nos.has(p.id))
        .slice(0, 4);
      for (const outra of secundarias) {
        nos.set(outra.id, { id: outra.id, tipo: 'pessoa', rotulo: outra.nome, detalhe: locationLabel(outra, data), cor: corDaPessoa(outra) });
        ligar(vizinho.pessoa.id, outra.id, 'relação');
      }
    }
  }
  return { nos: [...nos.values()], arestas };
}

// ---------------------------------------------------------------------------
// Máquina do tempo: o que existia no catálogo em cada período
// ---------------------------------------------------------------------------

export function anosDoCatalogo(data: AppData): number[] {
  const anos = new Set<number>();
  const marcar = (iso?: string | null) => {
    const ano = iso ? Number(iso.slice(0, 4)) : NaN;
    if (Number.isFinite(ano) && ano >= 1990 && ano <= 2100) anos.add(ano);
  };
  for (const p of data.people) { marcar(p.createdAt); for (const f of p.fotos) { marcar(f.createdAt); marcar(f.capturedAt); } }
  for (const m of data.memories) { marcar(m.date); marcar(m.createdAt); }
  for (const j of data.journal) marcar(j.date);
  for (const a of data.appointments) marcar(a.date);
  for (const c of data.conversations) marcar(c.date);
  for (const s of data.stories) marcar(s.date);
  return [...anos].sort((a, b) => b - a);
}

export interface ConteudoAno {
  pessoas: Person[];
  fotos: (Photo & { personId: string | null })[];
  memorias: { titulo: string; detalhe: string; data: string }[];
  eventos: { titulo: string; detalhe: string }[];
  meses: number[];
}

export function conteudoDoAno(data: AppData, ano: number, mes?: number | null): ConteudoAno {
  const noPeriodo = (iso?: string | null) => {
    if (!iso || !iso.startsWith(String(ano))) return false;
    if (mes == null) return true;
    return Number(iso.slice(5, 7)) === mes;
  };
  const pessoas = data.people.filter(p => !p.deletedAt && noPeriodo(p.createdAt));
  const fotos = getAllPhotos(data).filter(f => noPeriodo(f.createdAt) || noPeriodo(f.capturedAt)).slice(0, 24);
  const memorias = [
    ...data.memories.filter(m => noPeriodo(m.date) || noPeriodo(m.createdAt)).map(m => ({ titulo: m.title || 'Memória', detalhe: m.content.slice(0, 110), data: m.date })),
    ...data.journal.filter(j => noPeriodo(j.date)).map(j => ({ titulo: j.title || `Página de ${j.date}`, detalhe: j.content.slice(0, 110), data: j.date })),
  ].slice(0, 12);
  const eventos = [
    ...data.appointments.filter(a => noPeriodo(a.date)).map(a => ({ titulo: a.title, detalhe: `${a.date}${a.place ? ` · ${a.place}` : ''}` })),
    ...data.conversations.filter(c => noPeriodo(c.date)).map(c => ({ titulo: c.topic || 'Conversa anotada', detalhe: c.content.slice(0, 90) })),
    ...data.stories.filter(s => noPeriodo(s.date)).map(s => ({ titulo: s.titulo, detalhe: 'História escrita' })),
  ].slice(0, 12);
  const mesesSet = new Set<number>();
  const marcarMes = (iso?: string | null) => { if (iso && iso.startsWith(String(ano))) { const m = Number(iso.slice(5, 7)); if (m >= 1 && m <= 12) mesesSet.add(m); } };
  for (const p of pessoas) marcarMes(p.createdAt);
  for (const f of fotos) { marcarMes(f.createdAt); marcarMes(f.capturedAt); }
  return { pessoas, fotos, memorias, eventos, meses: [...mesesSet].sort((a, b) => a - b) };
}

export const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ---------------------------------------------------------------------------
// Slides do modo TV / apresentação
// ---------------------------------------------------------------------------

export interface SlideTV {
  id: string;
  tipo: 'foto' | 'pessoa' | 'colecao' | 'estatistica' | 'memoria' | 'video';
  titulo: string;
  subtitulo: string;
  imagem?: string;
  videoUrl?: string;
  personId?: string;
  cor?: string;
}

export function slidesApresentacao(data: AppData): SlideTV[] {
  const ativas = data.people.filter(isActive);
  const slides: SlideTV[] = [];
  const fotos = embaralhar(getAllPhotos(data), Math.random).slice(0, 10);
  for (const foto of fotos) {
    const dona = ativas.find(p => p.id === foto.personId);
    slides.push({
      id: `foto:${foto.id}`, tipo: 'foto', titulo: dona?.nome || 'Foto sem ficha',
      subtitulo: foto.description || `Guardada ${haQuantoTempo(foto.createdAt || foto.capturedAt)}`,
      imagem: foto.url, personId: dona?.id, cor: dona ? corDaPessoa(dona) : undefined,
    });
  }
  const destaques = [...ativas].sort((a, b) => calculateOverallRating(b.rating) - calculateOverallRating(a.rating)).slice(0, 6);
  for (const pessoa of destaques) {
    slides.push({
      id: `pessoa:${pessoa.id}`, tipo: 'pessoa', titulo: pessoa.nome,
      subtitulo: `${locationLabel(pessoa, data)} · nota ${formatNumber(calculateOverallRating(pessoa.rating))}`,
      imagem: (pessoa.fotos.find(f => f.isMain) || pessoa.fotos[0])?.url, personId: pessoa.id, cor: corDaPessoa(pessoa),
    });
  }
  const colecoes: SlideTV[] = [
    ...data.folders.slice(0, 3).map(f => ({ id: `pasta:${f.id}`, tipo: 'colecao' as const, titulo: f.name, subtitulo: `Pasta · ${f.personIds.length} pessoa(s)`, cor: f.color })),
    ...data.albums.slice(0, 3).map(a => ({ id: `album:${a.id}`, tipo: 'colecao' as const, titulo: a.name, subtitulo: `Álbum · ${a.photoIds.length} foto(s)`, cor: a.color })),
  ];
  slides.push(...colecoes);
  const stats = estatisticasRapidas(data);
  slides.push(
    { id: 'stat:fichas', tipo: 'estatistica', titulo: `${stats.fichas} fichas`, subtitulo: `${stats.favoritas} favoritas · ${stats.completudeMedia}% de capricho médio` },
    { id: 'stat:fotos', tipo: 'estatistica', titulo: `${stats.fotos} fotos`, subtitulo: `${stats.videos} vídeos · ${stats.diasCatalogo} dias de história` },
  );
  const antigas = [...ativas].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (antigas) {
    slides.push({
      id: `descoberta:${antigas.id}`, tipo: 'pessoa', titulo: `Há mais tempo aqui: ${antigas.nome}`,
      subtitulo: `No catálogo ${haQuantoTempo(antigas.createdAt)}`,
      imagem: (antigas.fotos.find(f => f.isMain) || antigas.fotos[0])?.url, personId: antigas.id, cor: corDaPessoa(antigas),
    });
  }
  for (const memoria of data.memories.slice(0, 4)) {
    slides.push({ id: `memoria:${memoria.id}`, tipo: 'memoria', titulo: memoria.title || 'Uma memória', subtitulo: memoria.content.slice(0, 140) || 'Guardada com carinho.', personId: memoria.personId || undefined });
  }
  const clipes = todosOsMomentos(data).filter(m => /^(data:video\/|blob:|https?:\/\/.*\.(mp4|webm|mov|m4v))/i.test(m.url)).slice(0, 3);
  for (const clipe of clipes) {
    slides.push({
      id: `video:${clipe.id}`, tipo: 'video', titulo: clipe.legenda || `Momento de ${clipe.personNome}`,
      subtitulo: `${clipe.personNome} · ${haQuantoTempo(clipe.createdAt)}`, videoUrl: clipe.url, personId: clipe.personId,
    });
  }
  return slides;
}

// ---------------------------------------------------------------------------
// Sequência de descobertas: só conta quando algo foi encontrado/organizado
// ---------------------------------------------------------------------------

export interface ExploracaoState {
  ultimoDia: string;
  sequencia: number;
  total: number;
  visitadasDia: string[];
  diaVisitas: string;
  trilhas?: number;
  festas?: Record<string, string>;
}

const ontemDe = (dia: string): string => {
  const data = new Date(`${dia}T12:00:00`);
  data.setDate(data.getDate() - 1);
  return data.toISOString().slice(0, 10);
};

/** Devolve a exploração atualizada após registrar uma descoberta de verdade. */
export function aposDescoberta(atual: ExploracaoState | undefined, dia: string): ExploracaoState {
  const base: ExploracaoState = atual || { ultimoDia: '', sequencia: 0, total: 0, visitadasDia: [], diaVisitas: '' };
  if (base.ultimoDia === dia) return { ...base, total: base.total + 1 };
  const continua = base.ultimoDia === ontemDe(dia);
  return { ...base, ultimoDia: dia, sequencia: continua ? base.sequencia + 1 : 1, total: base.total + 1 };
}

// ---------------------------------------------------------------------------
// Mini-desafios: organização virando brincadeira (+20 XP cada)
// ---------------------------------------------------------------------------

export interface DefinicaoDesafio {
  id: string;
  titulo: string;
  descricao: string;
  alvo: number;
  /** Quanto do desafio já foi feito. */
  verificar: (data: AppData, visitadasDia: string[]) => number;
  /** Se não há como cumprir hoje (ex.: ninguém faz aniversário no mês), some da lista. */
  disponivel: (data: AppData) => boolean;
}

const criadasHaDias = (data: AppData, dias: number) => data.people.filter(p => isActive(p) && (daysSince(p.createdAt) ?? -1) >= dias);

export const MINI_DESAFIOS: DefinicaoDesafio[] = [
  {
    id: 'rever-antiga', titulo: 'Memória antiga', descricao: 'Abra a ficha de alguém que está há mais de 6 meses no catálogo.', alvo: 1,
    verificar: (data, visitadas) => (visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && isActive(p) && (daysSince(p.createdAt) ?? -1) >= 180; }) ? 1 : 0),
    disponivel: data => criadasHaDias(data, 180).length > 0,
  },
  {
    id: 'tres-fichas', titulo: 'Três visitas', descricao: 'Abra 3 fichas diferentes hoje. Vale revisitar favoritas.', alvo: 3,
    verificar: (_data, visitadas) => Math.min(3, visitadas.length),
    disponivel: data => data.people.filter(isActive).length >= 3,
  },
  {
    id: 'sem-foto', titulo: 'Rosto novo', descricao: 'Abra a ficha de alguém que ainda não tem foto.', alvo: 1,
    verificar: (data, visitadas) => (visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && isActive(p) && !p.fotos.length; }) ? 1 : 0),
    disponivel: data => data.people.filter(p => isActive(p) && !p.fotos.length).length > 0,
  },
  {
    id: 'nota-alta', titulo: 'Pódio', descricao: 'Revisite alguém com nota 4,5 ou mais.', alvo: 1,
    verificar: (data, visitadas) => (visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && calculateOverallRating(p.rating) >= 4.5; }) ? 1 : 0),
    disponivel: data => data.people.filter(p => isActive(p) && calculateOverallRating(p.rating) >= 4.5).length > 0,
  },
  {
    id: 'familia', titulo: 'Laços de família', descricao: 'Abra a ficha de alguém com vínculo de família no catálogo.', alvo: 1,
    verificar: (data, visitadas) => (visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && (p.vinculos || []).length > 0; }) ? 1 : 0),
    disponivel: data => data.people.filter(p => isActive(p) && (p.vinculos || []).length > 0).length > 0,
  },
  {
    id: 'aniversario', titulo: 'Parabéns pra você', descricao: 'Abra a ficha de quem faz aniversário neste mês.', alvo: 1,
    verificar: (data, visitadas) => {
      const mes = new Date().toISOString().slice(5, 7);
      return visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && (p.aniversario || '').slice(5, 7) === mes; }) ? 1 : 0;
    },
    disponivel: data => {
      const mes = new Date().toISOString().slice(5, 7);
      return data.people.some(p => isActive(p) && (p.aniversario || '').slice(5, 7) === mes);
    },
  },
  {
    id: 'arquivo', titulo: 'Caixa de memórias', descricao: 'Revisite uma ficha que está no arquivo.', alvo: 1,
    verificar: (data, visitadas) => (visitadas.some(id => { const p = data.people.find(x => x.id === id); return p && !!p.archivedAt && !p.deletedAt; }) ? 1 : 0),
    disponivel: data => data.people.filter(p => p.archivedAt && !p.deletedAt).length > 0,
  },
  {
    id: 'completa', titulo: 'Ficha impecável', descricao: 'Complete 100% de alguma ficha (vale editar e salvar).', alvo: 1,
    verificar: data => (data.people.some(p => isActive(p) && completeness(p).percent === 100 && (p.updatedAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10)) ? 1 : 0),
    disponivel: data => data.people.filter(isActive).length > 0,
  },
];

export interface DesafioDoDia extends DefinicaoDesafio { progresso: number; concluido: boolean }

export function desafiosDoDia(data: AppData, dia: string, concluidos: string[]): DesafioDoDia[] {
  const disponiveis = MINI_DESAFIOS.filter(d => d.disponivel(data));
  if (!disponiveis.length) return [];
  const rng = mulberry32(hashTexto(`desafios:${dia}`));
  const escolhidos = embaralhar(disponiveis, rng).slice(0, 3);
  const visitadas = (data.progress.exploracao?.diaVisitas === dia ? data.progress.exploracao.visitadasDia : []) || [];
  return escolhidos.map(def => {
    const progresso = def.verificar(data, visitadas);
    return { ...def, progresso, concluido: concluidos.includes(def.id) || progresso >= def.alvo };
  });
}

// ---------------------------------------------------------------------------
// Desbloqueáveis visuais: personalização, não vantagem
// ---------------------------------------------------------------------------

export type TipoDesbloqueavel = 'fundo' | 'moldura' | 'cartao' | 'acento';

export interface Desbloqueavel {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoDesbloqueavel;
  /** Valor aplicado nos Ajustes (classe do fundo/moldura/cartão ou cor do acento). */
  valor: string;
  dica: string;
  condicao: (data: AppData) => boolean;
}

const sequencia = (data: AppData) => data.progress.exploracao?.sequencia || 0;
const totalFotos = (data: AppData) => getAllPhotos(data).length;

export const DESBLOQUEAVEIS: Desbloqueavel[] = [
  { id: 'fundo-aurora', nome: 'Fundo Aurora', descricao: 'Um degradê suave atrás de tudo.', tipo: 'fundo', valor: 'aurora', dica: 'Cadastre 10 fichas', condicao: data => data.people.filter(isActive).length >= 10 },
  { id: 'fundo-papel', nome: 'Fundo Papel', descricao: 'Textura de caderno para o fundo do app.', tipo: 'fundo', valor: 'papel', dica: 'Crie 5 pastas', condicao: data => data.folders.length >= 5 },
  { id: 'fundo-noite', nome: 'Fundo Noite', descricao: 'Céu profundo com pontos de estrela.', tipo: 'fundo', valor: 'noite', dica: '3 dias seguidos de descobertas', condicao: data => sequencia(data) >= 3 },
  { id: 'fundo-ouro', nome: 'Fundo Dourado', descricao: 'Poeira dourada para dias de festa.', tipo: 'fundo', valor: 'ouro', dica: 'Tenha uma ficha Lendário', condicao: data => data.people.some(p => isActive(p) && calculateOverallRating(p.rating) >= 4.8) },
  { id: 'moldura-bronze', nome: 'Moldura Bronze', descricao: 'Anel bronzeado nos retratos.', tipo: 'moldura', valor: 'bronze', dica: 'Guarde 25 fotos', condicao: data => totalFotos(data) >= 25 },
  { id: 'moldura-prata', nome: 'Moldura Prata', descricao: 'Anel prateado nos retratos.', tipo: 'moldura', valor: 'prata', dica: 'Complete uma trilha aleatória', condicao: data => (data.progress.exploracao?.trilhas || 0) >= 1 },
  { id: 'moldura-ouro', nome: 'Moldura Ouro', descricao: 'Anel dourado nos retratos.', tipo: 'moldura', valor: 'ouro', dica: 'Cadastre 50 fichas', condicao: data => data.people.filter(isActive).length >= 50 },
  { id: 'cartao-vivo', nome: 'Cartões Vivos', descricao: 'Borda em degradê animado nos cartões.', tipo: 'cartao', valor: 'vivo', dica: 'Guarde 100 fotos', condicao: data => totalFotos(data) >= 100 },
  { id: 'cartao-foto', nome: 'Cartões Foto-primeiro', descricao: 'Cartões com a foto em destaque total.', tipo: 'cartao', valor: 'foto', dica: 'Adicione 5 vídeos em Momentos', condicao: data => todosOsMomentos(data).length >= 5 },
  { id: 'acento-oceano', nome: 'Cor Oceano', descricao: 'Um azul profundo para os destaques.', tipo: 'acento', valor: '#4aa8e0', dica: 'Abra 3 presentes diários', condicao: data => Object.keys(data.progress.presentes || {}).length >= 3 },
  { id: 'acento-uva', nome: 'Cor Uva', descricao: 'Um roxo de mistério para os destaques.', tipo: 'acento', valor: '#9a6cf0', dica: 'Encontre um easter egg', condicao: data => Object.keys(data.progress.ovos || {}).length >= 1 || !!data.progress.mirror },
  { id: 'acento-sol', nome: 'Cor Sol', descricao: 'Um dourado quente para os destaques.', tipo: 'acento', valor: '#e8a13c', dica: '7 dias seguidos de descobertas', condicao: data => sequencia(data) >= 7 },
];

export interface DesbloqueavelEstado extends Desbloqueavel { liberado: boolean; liberadoEm: string | null }

export function desbloqueaveis(data: AppData): DesbloqueavelEstado[] {
  return DESBLOQUEAVEIS.map(def => ({
    ...def,
    liberado: !!data.progress.desbloqueaveis?.[def.id] || def.condicao(data),
    liberadoEm: data.progress.desbloqueaveis?.[def.id] || null,
  }));
}

// ---------------------------------------------------------------------------
// Easter eggs: raros, curiosos, sem bombardeio
// ---------------------------------------------------------------------------

export interface OvoPascoa { id: string; nome: string; dica: string; secreto: boolean }

export const OVOS: OvoPascoa[] = [
  { id: 'disco', nome: 'Pista secreta', dica: 'Um código antigo de videogame funciona em qualquer tela. A dica está nos Ajustes.', secreto: false },
  { id: 'espelho', nome: 'Espelho', dica: '???', secreto: true },
  { id: 'logo-sete', nome: 'Sete toques', dica: '???', secreto: true },
  { id: 'madrugada', nome: 'Turno da madrugada', dica: '???', secreto: true },
  { id: 'maratonista', nome: 'Maratonista', dica: 'Dizem que quem assiste bastante TV ganha algo...', secreto: false },
  { id: 'viajante', nome: 'Viajante do tempo', dica: 'Passeie por vários anos na máquina do tempo.', secreto: false },
];

export function ovoEncontrado(data: AppData, id: string): string | null {
  if (id === 'disco') return data.progress.konami ? (data.progress.celebrated?.['ovo:disco'] || 'sim') : null;
  if (id === 'espelho') return data.progress.mirror ? (data.progress.celebrated?.['ovo:espelho'] || 'sim') : null;
  return data.progress.ovos?.[id] || null;
}

// ---------------------------------------------------------------------------
// Vídeos: o que dá para reproduzir e como
// ---------------------------------------------------------------------------

export type TipoMidia = 'video' | 'youtube' | 'vimeo' | 'invalido';

export function tipoMidia(url: string): { tipo: TipoMidia; embed?: string } {
  const limpa = url.trim();
  if (!limpa) return { tipo: 'invalido' };
  const youtube = limpa.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (youtube) return { tipo: 'youtube', embed: `https://www.youtube.com/embed/${youtube[1]}` };
  const vimeo = limpa.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { tipo: 'vimeo', embed: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/^(data:video\/|blob:|https?:\/\/)/i.test(limpa)) return { tipo: 'video' };
  return { tipo: 'invalido' };
}
