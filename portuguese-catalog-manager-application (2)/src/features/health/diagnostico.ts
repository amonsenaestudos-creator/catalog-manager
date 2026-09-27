/**
 * Saúde do catálogo: a leitura honesta do que está guardado.
 *
 * Nada aqui altera dados por conta própria. `analisarSaude` só conta o que
 * encontrou e `repararCatalogo` só remove ponteiro quebrado — nunca uma ficha,
 * uma foto, um áudio de voz ou um texto seu. Toda conta recebe `agora` por parâmetro para poder
 * ser conferida com uma data fixa.
 */
import type { AppData, Person } from '../../types';
import { completeness, findDuplicatePhotos, findDuplicates, isActive } from '../../store';

export type Gravidade = 'critico' | 'atencao' | 'dica';

export type AchadoId =
  | 'duplicatas'
  | 'referencias_quebradas'
  | 'fotos_repetidas'
  | 'fotos_sem_dono'
  | 'fichas_sem_foto'
  | 'fichas_incompletas'
  | 'fichas_paradas'
  | 'lixeira_antiga'
  | 'rascunhos_abandonados'
  | 'lembretes_atrasados'
  | 'backup_vencido'
  | 'espaco_apertado'
  | 'audios_pesados';

export interface Achado {
  id: AchadoId;
  gravidade: Gravidade;
  titulo: string;
  descricao: string;
  /** Quantos itens o problema atinge (0 = o achado fala do conjunto). */
  quantidade: number;
  /** Fichas envolvidas, quando o problema é de pessoas. */
  pessoaIds?: string[];
  /** O que o app consegue arrumar sozinho com `repararCatalogo`. */
  reparavel?: boolean;
  /** Rota que resolve o assunto na mão. */
  pagina?: string;
  /** Filtro pronto para a tela de catálogo (ex.: fichas sem foto). */
  filtro?: { photo?: 'all' | 'with' | 'without' };
}

export interface ContextoDeSaude {
  /** Data de referência das contas (padrão: agora). */
  agora?: Date;
  /** ISO do último ponto de restauração conhecido. */
  ultimoBackup?: string | null;
  /** Uso real do armazenamento, quando o navegador informa. */
  usoBytes?: number | null;
  cotaBytes?: number | null;
}

export interface ResumoDoCatalogo {
  ativas: number;
  arquivadas: number;
  lixeira: number;
  fotos: number;
  notas: number;
  historias: number;
  pastas: number;
  tierlists: number;
  lembretesPendentes: number;
  rascunhos: number;
  /** Áudios de voz guardados nas fichas. */
  audios: number;
  /** Espaço ocupado pelos áudios de voz, em bytes. */
  audiosBytes: number;
  pessoasComFoto: number;
  /** Completude média das fichas ativas, de 0 a 100. */
  completudeMedia: number;
  /** Tamanho aproximado do catálogo em bytes (JSON). */
  tamanhoBytes: number;
}

export interface Saude {
  /** Nota de 0 a 100. 100 = nada pendente. */
  nota: number;
  achados: Achado[];
  resumo: ResumoDoCatalogo;
}

const WINDOW_DAYS = { parada: 90, lixeira: 30, rascunho: 30, backup: 7 };

const diasDesde = (iso: string | null | undefined, agora: Date) => {
  const quando = Date.parse(iso || '');
  if (!Number.isFinite(quando)) return null;
  return Math.floor((agora.getTime() - quando) / 86400000);
};

const localToday = (agora: Date) => `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

/** Toda referência a ficha que o catálogo guarda fora da própria ficha. */
function ponteirosQuebrados(data: AppData) {
  const ids = new Set(data.people.map(p => p.id));
  const existe = (id?: string | null) => !id || ids.has(id);
  const fotos = new Set(data.people.flatMap(p => p.fotos.map(f => f.id)).concat(data.orphanPhotos.map(f => f.id)));
  const notas = new Set(data.generalNotes.map(n => n.id));
  const pastas = new Set(data.folders.map(f => f.id));
  const problemas: string[] = [];

  const contar = (nome: string, quantidade: number) => { if (quantidade) problemas.push(`${quantidade} em ${nome}`); };

  contar('vínculos familiares', data.people.reduce((total, p) => total + (p.vinculos || []).filter(v => !existe(v.personId)).length, 0));
  contar('fichas de tierlist', data.tierLists.reduce((total, l) => total + l.items.filter(i => !existe(i.personId)).length, 0));
  contar('pessoas em pastas', data.folders.reduce((total, f) => total + f.personIds.filter(id => !existe(id)).length + f.photoIds.filter(id => !fotos.has(id)).length + f.noteIds.filter(id => !notas.has(id)).length, 0));
  contar('pessoas em coleções', data.collections.reduce((total, c) => total + c.personIds.filter(id => !existe(id)).length, 0));
  contar('pessoas em notas gerais', data.generalNotes.reduce((total, n) => total + n.personIds.filter(id => !existe(id)).length, 0));
  contar('cartões do quadro', data.investigationBoards.reduce((total, b) => total + b.cards.filter(c => !existe(c.personId) || (c.noteId && !notas.has(c.noteId)) || (c.folderId && !pastas.has(c.folderId))).length, 0));
  contar('fotos em álbuns', data.albums.reduce((total, a) => total + a.photoIds.filter(id => !fotos.has(id)).length, 0));
  contar('fotos do cofre', data.vault.photoIds.filter(id => !fotos.has(id)).length);
  contar('duplicatas ignoradas', data.ignoredDuplicates.filter(id => !ids.has(id)).length);
  contar('conversas', data.chats.filter(m => !ids.has(m.personId)).length);
  contar('memórias do chat', data.memories.filter(m => !existe(m.personId)).length);
  contar('quebra-gelos', data.icebreakers.filter(i => !existe(i.personId)).length);
  contar('rumores de lembretes', data.reminders.filter(r => !existe(r.personId)).length + data.goals.filter(g => !existe(g.personId)).length + data.appointments.filter(a => !existe(a.personId)).length + data.conversations.filter(c => !existe(c.personId)).length + data.stories.filter(s => !existe(s.personId)).length + data.notifications.filter(n => !existe(n.personId)).length);

  return { total: problemas.length, detalhes: problemas };
}

export function resumoDoCatalogo(data: AppData): ResumoDoCatalogo {
  const vozes = data.people.flatMap(pessoa => pessoa.vozes || []);
  const audios = vozes.length;
  const audiosBytes = vozes.reduce((total, nota) => total + Math.round((nota.url || '').length * 0.75), 0);
  const comFoto = data.people.filter(p => isActive(p) && p.fotos.length > 0);
  const ativas = data.people.filter(isActive);
  const completudes = ativas.map(p => completeness(p).percent);
  let tamanhoBytes = 0;
  try { tamanhoBytes = JSON.stringify(data).length; } catch { tamanhoBytes = 0; }
  return {
    ativas: ativas.length,
    arquivadas: data.people.filter(p => !!p.archivedAt && !p.deletedAt).length,
    lixeira: data.people.filter(p => !!p.deletedAt).length,
    fotos: data.people.reduce((total, p) => total + p.fotos.length, 0) + data.orphanPhotos.length,
    notas: data.people.reduce((total, p) => total + p.notas.length, 0) + data.generalNotes.length,
    historias: data.stories.length,
    pastas: data.folders.length,
    tierlists: data.tierLists.length,
    lembretesPendentes: data.reminders.filter(r => !r.concluido).length,
    rascunhos: Object.keys(data.drafts || {}).length,
    audios,
    audiosBytes,
    pessoasComFoto: comFoto.length,
    completudeMedia: completudes.length ? Math.round(completudes.reduce((total, valor) => total + valor, 0) / completudes.length) : 0,
    tamanhoBytes,
  };
}

export function analisarSaude(data: AppData, contexto: ContextoDeSaude = {}): Saude {
  const agora = contexto.agora || new Date();
  const resumo = resumoDoCatalogo(data);
  const ativas = data.people.filter(isActive);
  const achados: Achado[] = [];

  // 1. Fichas que parecem a mesma pessoa.
  const duplicatas = findDuplicates(data);
  if (duplicatas.length) achados.push({
    id: 'duplicatas', gravidade: 'critico', quantidade: duplicatas.length, pagina: 'duplicates',
    titulo: `${duplicatas.length} ${duplicatas.length === 1 ? 'par suspeito' : 'pares suspeitos'} de duplicata`,
    descricao: 'Fichas com o mesmo nome, contato ou telefone. Juntar depois é mais trabalhoso do que resolver agora.',
    pessoaIds: [...new Set(duplicatas.flatMap(par => [par.a.id, par.b.id]))],
  });

  // 2. Ponteiro que aponta para quem não existe mais.
  const quebradas = ponteirosQuebrados(data);
  if (quebradas.total) achados.push({
    id: 'referencias_quebradas', gravidade: 'atencao', quantidade: quebradas.total, reparavel: true,
    titulo: 'Referências sem dono',
    descricao: `${quebradas.detalhes.join(', ')}. Sobrou de uma exclusão definitiva ou de um backup antigo; a faxina limpa os ponteiros.`,
  });

  // 3. A mesma imagem guardada duas vezes.
  const fotosRepetidas = findDuplicatePhotos(data);
  if (fotosRepetidas.length) achados.push({
    id: 'fotos_repetidas', gravidade: 'atencao', quantidade: fotosRepetidas.reduce((total, grupo) => total + grupo.length - 1, 0), pagina: 'gallery',
    titulo: 'Fotos repetidas ocupando espaço',
    descricao: 'Grupos com o mesmo conteúdo. Cada repetição é uma cópia inteira dentro do arquivo do catálogo.',
  });

  // 4. Foto que diz pertencer a alguém que já não está no catálogo.
  const fotosSemDono = data.orphanPhotos.filter(f => f.personId && !data.people.some(p => p.id === f.personId));
  if (fotosSemDono.length) achados.push({
    id: 'fotos_sem_dono', gravidade: 'dica', quantidade: fotosSemDono.length, reparavel: true, pagina: 'gallery',
    titulo: 'Fotos órfãs apontando para fichas removidas',
    descricao: 'As imagens continuam guardadas, mas o vínculo com a ficha não existe mais.',
  });

  // 5. Ficha sem nenhuma foto.
  const semFoto = ativas.filter(p => !p.fotos.length);
  if (semFoto.length) achados.push({
    id: 'fichas_sem_foto', gravidade: semFoto.length > ativas.length / 2 ? 'atencao' : 'dica', quantidade: semFoto.length, pagina: 'catalog', filtro: { photo: 'without' },
    titulo: `${semFoto.length} ${semFoto.length === 1 ? 'ficha sem foto' : 'fichas sem foto'}`,
    descricao: 'Sem imagem, a ficha não aparece no mosaico nem nas grades do catálogo.',
    pessoaIds: semFoto.map(p => p.id),
  });

  // 6. Ficha rasa: falta descrição, categoria, contato ou tag.
  const incompletas = ativas.filter(p => completeness(p).percent < 50);
  if (incompletas.length) achados.push({
    id: 'fichas_incompletas', gravidade: 'dica', quantidade: incompletas.length, pagina: 'catalog',
    titulo: `${incompletas.length} ${incompletas.length === 1 ? 'ficha pela metade' : 'fichas pela metade'}`,
    descricao: `Completude média de ${resumo.completudeMedia}%. O que falta está listado dentro de cada ficha.`,
    pessoaIds: incompletas.map(p => p.id),
  });

  // 7. Ficha parada há muito tempo.
  const paradas = ativas.map(p => ({ p, dias: diasDesde(p.updatedAt || p.createdAt, agora) })).filter(x => (x.dias ?? 0) >= WINDOW_DAYS.parada);
  if (paradas.length) achados.push({
    id: 'fichas_paradas', gravidade: 'dica', quantidade: paradas.length, pagina: 'catalog',
    titulo: `${paradas.length} ${paradas.length === 1 ? 'ficha parada' : 'fichas paradas'} há mais de ${WINDOW_DAYS.parada} dias`,
    descricao: 'Uma nota nova ou uma lembrança revivida já devolve a ficha ao movimento.',
    pessoaIds: paradas.sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0)).map(x => x.p.id),
  });

  // 8. Lixeira acumulada.
  const lixeira = data.people.filter(p => p.deletedAt).map(p => ({ p, dias: diasDesde(p.deletedAt, agora) ?? 0 })).filter(x => x.dias >= WINDOW_DAYS.lixeira);
  if (lixeira.length) achados.push({
    id: 'lixeira_antiga', gravidade: 'atencao', quantidade: lixeira.length, pagina: 'catalog',
    titulo: `${lixeira.length} ${lixeira.length === 1 ? 'ficha' : 'fichas'} na lixeira há mais de ${WINDOW_DAYS.lixeira} dias`,
    descricao: 'Restaurar devolve tudo. Excluir de vez libera o espaço das fotos guardadas.',
    pessoaIds: lixeira.map(x => x.p.id),
  });

  // 9. Rascunho esquecido, ou de alguém que já não existe.
  const rascunhos = Object.values(data.drafts || {}).map(d => ({ d, dias: diasDesde(d.updatedAt, agora), orfao: !!(d.personId && !data.people.some(p => p.id === d.personId)) }));
  const rascunhosVelhos = rascunhos.filter(x => x.orfao || (x.dias ?? 0) >= WINDOW_DAYS.rascunho);
  if (rascunhosVelhos.length) achados.push({
    id: 'rascunhos_abandonados', gravidade: 'dica', quantidade: rascunhosVelhos.length, reparavel: true, pagina: 'drafts',
    titulo: `${rascunhosVelhos.length} ${rascunhosVelhos.length === 1 ? 'rascunho esquecido' : 'rascunhos esquecidos'}`,
    descricao: `Rascunhos parados há mais de ${WINDOW_DAYS.rascunho} dias ou ligados a fichas que não existem mais.`,
  });

  // 10. Lembrete que passou da hora.
  const hoje = localToday(agora);
  const atrasados = data.reminders.filter(r => !r.concluido && r.data && r.data.slice(0, 10) < hoje);
  if (atrasados.length) achados.push({
    id: 'lembretes_atrasados', gravidade: 'atencao', quantidade: atrasados.length, pagina: 'reminders',
    titulo: `${atrasados.length} ${atrasados.length === 1 ? 'lembrete atrasado' : 'lembretes atrasados'}`,
    descricao: 'Concluir, adiar ou transformar em nota. O catálogo inteiro continua funcionando com eles pendentes.',
  });

  // 11. Backup: a única cópia dos seus dados é este navegador.
  const diasSemBackup = contexto.ultimoBackup === undefined ? null : diasDesde(contexto.ultimoBackup, agora);
  if (diasSemBackup === null || diasSemBackup >= WINDOW_DAYS.backup) achados.push({
    id: 'backup_vencido', gravidade: diasSemBackup === null ? 'critico' : 'atencao', quantidade: 1, pagina: 'settings',
    titulo: diasSemBackup === null ? 'Nenhum ponto de restauração' : `Último backup há ${diasSemBackup} dias`,
    descricao: 'Limpar os dados do navegador apaga o catálogo e as versões locais. Um arquivo externo resolve.',
  });

  // 12. Voz guardada demais: áudio é o dado que mais engorda o catálogo.
  const LIMITE_AUDIOS = 25 * 1024 * 1024;
  if (resumo.audiosBytes >= LIMITE_AUDIOS) achados.push({
    id: 'audios_pesados', gravidade: resumo.audiosBytes >= 60 * 1024 * 1024 ? 'critico' : 'atencao', quantidade: resumo.audios, pagina: 'catalog',
    titulo: `${resumo.audios} áudios de voz ocupando ${(resumo.audiosBytes / 1024 / 1024).toFixed(1)} MB`,
    descricao: 'Um minuto de voz custa cerca de 200 KB — o mesmo que uma foto pequena. Baixe um backup e apague o que já está guardado em outro lugar.',
  });

  // 13. Espaço do navegador chegando ao fim.
  if (contexto.usoBytes && contexto.cotaBytes) {
    const percent = Math.round(contexto.usoBytes / contexto.cotaBytes * 100);
    if (percent >= 70) achados.push({
      id: 'espaco_apertado', gravidade: percent >= 90 ? 'critico' : 'atencao', quantidade: percent, pagina: 'settings',
      titulo: `Armazenamento em ${percent}%`,
      descricao: 'Fotos em base64 são o que mais pesa. Baixe um backup e remova o que já está guardado em outro lugar.',
    });
  }

  const ordem: Gravidade[] = ['critico', 'atencao', 'dica'];
  achados.sort((a, b) => ordem.indexOf(a.gravidade) - ordem.indexOf(b.gravidade) || b.quantidade - a.quantidade);

  const base = Math.max(10, ativas.length);
  const penalidade = achados.reduce((total, achado) => {
    const densidade = achado.id === 'espaco_apertado' ? achado.quantidade / 100 : Math.min(1, achado.quantidade / base);
    const peso = achado.gravidade === 'critico' ? 26 : achado.gravidade === 'atencao' ? 14 : 5;
    return total + densidade * peso;
  }, 0);

  return { nota: Math.max(0, Math.round(100 - penalidade)), achados, resumo };
}

/**
 * Faxina de ponteiros: só remove o que aponta para algo que já não existe.
 * Nenhuma ficha, foto, nota ou história é apagada por esta função.
 */
export function repararCatalogo(data: AppData, agora: Date = new Date()): { data: AppData; reparos: { id: AchadoId; descricao: string; quantidade: number }[] } {
  const ids = new Set(data.people.map(p => p.id));
  const existe = (id?: string | null) => !id || ids.has(id);
  const fotos = new Set(data.people.flatMap(p => p.fotos.map(f => f.id)).concat(data.orphanPhotos.map(f => f.id)));
  const notas = new Set(data.generalNotes.map(n => n.id));
  const pastas = new Set(data.folders.map(f => f.id));
  const reparos: { id: AchadoId; descricao: string; quantidade: number }[] = [];
  const anotar = (id: AchadoId, descricao: string, quantidade: number) => { if (quantidade) reparos.push({ id, descricao, quantidade }); };

  const pessoas = data.people.map(p => {
    const vinculos = (p.vinculos || []).filter(v => existe(v.personId));
    const removidos = (p.vinculos || []).length - vinculos.length;
    return removidos ? { ...p, vinculos } : p;
  });
  anotar('referencias_quebradas', 'vínculos familiares removidos', data.people.reduce((total, p) => total + (p.vinculos || []).filter(v => !existe(v.personId)).length, 0));

  const tierLists = data.tierLists.map(lista => {
    const items = lista.items.filter(item => existe(item.personId) || (lista.tipo === 'especial' && (lista.pessoasAvulsas || []).some(g => g.id === item.personId)));
    return items.length === lista.items.length ? lista : { ...lista, items };
  });
  anotar('referencias_quebradas', 'fichas de tierlist removidas', data.tierLists.reduce((total, l) => total + l.items.filter(i => !existe(i.personId) && !(l.tipo === 'especial' && (l.pessoasAvulsas || []).some(g => g.id === i.personId))).length, 0));

  const folders = data.folders.map(pasta => ({
    ...pasta,
    personIds: pasta.personIds.filter(id => ids.has(id)),
    photoIds: pasta.photoIds.filter(id => fotos.has(id)),
    noteIds: pasta.noteIds.filter(id => notas.has(id)),
  }));
  anotar('referencias_quebradas', 'itens removidos de pastas', data.folders.reduce((total, f) => total + f.personIds.filter(id => !ids.has(id)).length + f.photoIds.filter(id => !fotos.has(id)).length + f.noteIds.filter(id => !notas.has(id)).length, 0));

  const collections = data.collections.map(colecao => ({ ...colecao, personIds: colecao.personIds.filter(id => ids.has(id)) }));
  anotar('referencias_quebradas', 'pessoas removidas de coleções', data.collections.reduce((total, c) => total + c.personIds.filter(id => !ids.has(id)).length, 0));

  const generalNotes = data.generalNotes.map(nota => ({ ...nota, personIds: nota.personIds.filter(id => ids.has(id)) }));
  anotar('referencias_quebradas', 'pessoas removidas de notas gerais', data.generalNotes.reduce((total, n) => total + n.personIds.filter(id => !ids.has(id)).length, 0));

  const investigationBoards = data.investigationBoards.map(quadro => ({
    ...quadro,
    cards: quadro.cards.map(card => ({
      ...card,
      personId: existe(card.personId) ? card.personId : null,
      noteId: card.noteId && !notas.has(card.noteId) ? null : card.noteId,
      folderId: card.folderId && !pastas.has(card.folderId) ? null : card.folderId,
    })),
  }));

  const albums = data.albums.map(album => ({ ...album, photoIds: album.photoIds.filter(id => fotos.has(id)) }));
  anotar('referencias_quebradas', 'fotos removidas de álbuns', data.albums.reduce((total, a) => total + a.photoIds.filter(id => !fotos.has(id)).length, 0));

  const fotoIdsDoCofre = data.vault.photoIds.filter(id => fotos.has(id));
  anotar('referencias_quebradas', 'fotos removidas do cofre', data.vault.photoIds.length - fotoIdsDoCofre.length);

  const ignoredDuplicates = data.ignoredDuplicates.filter(id => ids.has(id));
  anotar('referencias_quebradas', 'duplicatas ignoradas sem ficha', data.ignoredDuplicates.length - ignoredDuplicates.length);

  const notificacoes = data.notifications.map(notificacao => existe(notificacao.personId) ? notificacao : { ...notificacao, personId: null });
  const memorias = data.memories.filter(memoria => existe(memoria.personId));
  const quebraGelos = data.icebreakers.filter(item => existe(item.personId));
  const lembretes = data.reminders.map(item => existe(item.personId) ? item : { ...item, personId: null });
  const metas = data.goals.map(item => existe(item.personId) ? item : { ...item, personId: null });
  const compromissos = data.appointments.map(item => existe(item.personId) ? item : { ...item, personId: null });
  const conversas = data.conversations.map(item => existe(item.personId) ? item : { ...item, personId: null });
  const historias = data.stories.map(item => existe(item.personId) ? item : { ...item, personId: null });
  anotar('referencias_quebradas', 'memórias e quebra-gelos de fichas removidas', data.memories.filter(m => !existe(m.personId)).length + data.icebreakers.filter(i => !existe(i.personId)).length);

  const chats = data.chats.filter(mensagem => ids.has(mensagem.personId));
  anotar('referencias_quebradas', 'mensagens de conversa sem ficha', data.chats.length - chats.length);
  const chatStates = Object.fromEntries(Object.entries(data.chatStates || {}).filter(([id]) => ids.has(id)));

  const drafts = Object.fromEntries(Object.entries(data.drafts || {}).filter(([, rascunho]) => {
    if (rascunho.personId && !ids.has(rascunho.personId)) return false;
    return (diasDesde(rascunho.updatedAt, agora) ?? 0) < WINDOW_DAYS.rascunho;
  }));
  anotar('rascunhos_abandonados', 'rascunhos abandonados descartados', Object.keys(data.drafts || {}).length - Object.keys(drafts).length);

  const orphanPhotos = data.orphanPhotos.map(foto => foto.personId && !ids.has(foto.personId) ? { ...foto, personId: null } : foto);
  anotar('fotos_sem_dono', 'fotos órfãs desvinculadas', data.orphanPhotos.filter(f => f.personId && !ids.has(f.personId)).length);

  return {
    data: {
      ...data, people: pessoas, tierLists, folders, collections, generalNotes, investigationBoards, albums,
      ignoredDuplicates, orphanPhotos, chats, chatStates, drafts, memories: memorias, icebreakers: quebraGelos,
      reminders: lembretes, goals: metas, appointments: compromissos, conversations: conversas, stories: historias,
      notifications: notificacoes, vault: { ...data.vault, photoIds: fotoIdsDoCofre },
    },
    reparos,
  };
}

/** Lista curta de fichas para o resumo de um achado. */
export function fichasDoAchado(data: AppData, achado: Achado, limite = 4): Person[] {
  const ids = achado.pessoaIds || [];
  return ids.map(id => data.people.find(p => p.id === id)).filter((p): p is Person => !!p).slice(0, limite);
}
