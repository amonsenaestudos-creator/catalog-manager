/**
 * Caixa de ferramentas do Catalog: 50 utilidades de verdade, todas operando
 * sobre os seus próprios dados (ou sobre cálculos do dia a dia). Cada ferramenta
 * declara os campos que precisa e devolve texto, lista, estatísticas e/ou arquivo.
 */
import type { AppData, Folder, GeneralNote, Person, Reminder } from '../types';
import {
  ageFromBirthday, calculateOverallRating, completeness, daysUntil, findDuplicatePhotos, findDuplicates,
  formatDate, generateId, isActive, isAdult, normalizeText, rarityFor, RARITY_LABELS, upcomingBirthday,
} from '../store';
import { analisarConversa, conversaParaMarkdown, estadoDe, estagioAtual, sugerirAberturas, sugerirRespostas, type Intimidade } from './dialogue';
import { buildPersona } from './persona';

export type GrupoId = 'catalogo' | 'lote' | 'social' | 'pessoal' | 'utilidades';

export interface ToolField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'person';
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  default?: string;
  min?: number;
  max?: number;
}

export interface ToolItem { id?: string; title: string; detail?: string; personId?: string; page?: string }

export interface ToolOutput {
  texto?: string;
  itens?: ToolItem[];
  estatisticas?: { label: string; valor: string }[];
  baixar?: { nome: string; conteudo: string; tipo: string };
  aviso?: string;
  /** Ferramentas que precisam de contagem na tela (foco e cronômetro). */
  special?: 'pomodoro' | 'temporizador';
}

export interface ToolContext {
  data: AppData;
  commit: (updater: (d: AppData) => AppData, message?: string, undoable?: boolean) => void;
  notify: (mensagem: string, erro?: boolean) => void;
  openPerson: (person: Person | string) => void;
  navigate: (page: string, scope?: 'active' | 'favorites' | 'archived' | 'trash') => void;
  setFilter: (filtro: Partial<AppData['savedFilters'][number]['filter']>) => void;
}

export interface Tool {
  id: string;
  nome: string;
  grupo: GrupoId;
  /** Nome do ícone (Lucide) usado na listagem de ferramentas. */
  icone: string;
  descricao: string;
  campos: ToolField[];
  /** Ações que mudam dados pedem confirmação com este texto. */
  perigoso?: string;
  special?: 'pomodoro' | 'temporizador';
  run: (valores: Record<string, string>, ctx: ToolContext) => ToolOutput;
}

export const GRUPOS: { id: GrupoId; nome: string; icone: string; descricao: string }[] = [
  { id: 'catalogo', nome: 'Catálogo e dados', icone: 'Database', descricao: 'Conferir, exportar, medir e consertar o que já está guardado.' },
  { id: 'lote', nome: 'Organização em lote', icone: 'Layers', descricao: 'Mudanças em várias fichas de uma vez, sempre com prévia.' },
  { id: 'social', nome: 'Conversa e social', icone: 'MessagesSquare', descricao: 'Sugestões, roteiros e análise do papo com cada pessoa.' },
  { id: 'pessoal', nome: 'Meu espaço e rotina', icone: 'Moon', descricao: 'Diário, metas, agenda e foco no que importa hoje.' },
  { id: 'utilidades', nome: 'Utilidades do dia a dia', icone: 'Calculator', descricao: 'Cálculos, conversões, sorteios e geradores que servem para tudo.' },
];

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

const campo = (v: Record<string, string>, chave: string, padrao = '') => String(v[chave] ?? padrao).trim();
const bruto = (v: Record<string, string>, chave: string, padrao = '') => {
  const valor = String(v[chave] ?? padrao).replace(/\s/g, '').replace(',', '.');
  return valor;
};
const numero = (v: Record<string, string>, chave: string, padrao = 0) => {
  const valor = Number(bruto(v, chave, String(padrao)));
  return Number.isFinite(valor) ? valor : padrao;
};
const inteiro = (v: Record<string, string>, chave: string, padrao = 0) => Math.max(0, Math.round(numero(v, chave, padrao)));
const marcado = (v: Record<string, string>, chave: string, padrao = false) => {
  const valor = campo(v, chave, padrao ? '1' : '').toLowerCase();
  return ['1', 'true', 'sim', 'on', 'yes', 'ligado'].includes(valor);
};
const f1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const f2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const diaBr = (valor?: string | null) => (valor ? formatDate(valor) : '—');
const hojeIso = () => new Date().toISOString().slice(0, 10);
const deslocar = (iso: string, dias: number) => { const d = new Date(`${iso.slice(0, 10)}T12:00:00`); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const nota = (p: Person) => calculateOverallRating(p.rating);
const idadeDe = (p: Person) => p.idade ?? ageFromBirthday(p.aniversario);
const nomeCurto = (p: Person) => p.nome.split(/\s+/)[0];
const ativos = (d: AppData) => d.people.filter(isActive);
const semLixeira = (d: AppData) => d.people.filter(p => !p.deletedAt);
const media = (lista: number[]) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : 0);
const escolhida = (v: Record<string, string>, d: AppData, chave = 'pessoa') => {
  const id = campo(v, chave);
  const lista = semLixeira(d);
  return lista.find(p => p.id === id) || lista[0] || null;
};
const milhar = (n: number) => Math.round(n).toLocaleString('pt-BR');
const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const tamanhoDe = (texto: string) => new Blob([texto]).size;
const PESSOAS = (d: AppData) => [...semLixeira(d)].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

/** Filtro de pessoas por regra textual, usado em várias ferramentas de lote. */
function selecionar(d: AppData, regra: string, valor: string): Person[] {
  const lista = semLixeira(d);
  const limpo = normalizeText(valor);
  switch (regra) {
    case 'nota': { const minimo = Number(valor.replace(',', '.')) || 0; return lista.filter(p => nota(p) >= minimo); }
    case 'sem-foto': return lista.filter(p => !p.fotos.length);
    case 'categoria': return lista.filter(p => normalizeText(p.localizacaoOnde).includes(limpo) || normalizeText(p.localizacaoSub).includes(limpo));
    case 'tag': return lista.filter(p => p.tags.some(tag => normalizeText(tag) === limpo));
    case 'idade': { const minimo = Number(valor) || 0; return lista.filter(p => (idadeDe(p) ?? 0) >= minimo); }
    case 'sem-ver': { const dias = Number(valor) || 30; return lista.filter(p => { const ultimo = p.ultimoVisto || p.updatedAt || p.createdAt; const passados = Math.floor((Date.now() - Date.parse(ultimo)) / 86400000); return passados >= dias; }); }
    case 'favoritos': return lista.filter(p => p.favorite);
    case 'incompletas': return lista.filter(p => completeness(p).percent < 100);
    default: return lista;
  }
}

const REGRAS_LOTE = [
  { value: 'nota', label: 'Nota mínima' },
  { value: 'categoria', label: 'Categoria ou subcategoria contém' },
  { value: 'tag', label: 'Com a etiqueta' },
  { value: 'idade', label: 'Idade a partir de' },
  { value: 'sem-ver', label: 'Sem interação há N dias' },
  { value: 'sem-foto', label: 'Fichas sem foto' },
  { value: 'incompletas', label: 'Fichas incompletas' },
  { value: 'favoritos', label: 'Somente favoritas' },
];

// ---------------------------------------------------------------------------
// Grupo 1 — Catálogo e dados
// ---------------------------------------------------------------------------

const FERRAMENTAS_CATALOGO: Tool[] = [
  {
    id: 'resumo-catalogo', nome: 'Resumo executivo do catálogo', grupo: 'catalogo', icone: 'BarChart3',
    descricao: 'Todos os números em uma tela: fichas, médias, fotos, tags e movimento recente.',
    campos: [],
    run: (_v, ctx) => {
      const d = ctx.data;
      const ativas = ativos(d);
      const arquivadas = d.people.filter(p => p.archivedAt && !p.deletedAt);
      const lixeira = d.people.filter(p => p.deletedAt);
      const fotos = ativas.reduce((soma, p) => soma + p.fotos.length, 0) + d.orphanPhotos.length;
      const notas = ativas.map(p => nota(p)).filter(n => n > 0);
      const completude = media(ativas.map(p => completeness(p).percent));
      const tags = new Map<string, number>();
      ativas.forEach(p => p.tags.forEach(tag => tags.set(tag, (tags.get(tag) || 0) + 1)));
      const ultimos30 = deslocar(hojeIso(), -30);
      const novas = ativas.filter(p => (p.createdAt || '').slice(0, 10) >= ultimos30).length;
      const interacoes = ativas.reduce((soma, p) => soma + p.viHojeDates.filter(data => data >= ultimos30).length, 0);
      const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      return {
        estatisticas: [
          { label: 'Fichas ativas', valor: milhar(ativas.length) },
          { label: 'Nota média', valor: notas.length ? f2(media(notas)) : 'sem notas' },
          { label: 'Ficha completa em média', valor: `${Math.round(completude)}%` },
          { label: 'Fotos guardadas', valor: milhar(fotos) },
          { label: 'Favoritas', valor: milhar(ativas.filter(p => p.favorite).length) },
          { label: 'Arquivadas / lixeira', valor: `${arquivadas.length} / ${lixeira.length}` },
          { label: 'Novas em 30 dias', valor: milhar(novas) },
          { label: 'Interações em 30 dias', valor: milhar(interacoes) },
        ],
        texto: [
          'RESUMO DO CATÁLOGO', `Gerado em ${diaBr(hojeIso())}`, '',
          `Fichas ativas: ${ativas.length} (favoritas: ${ativas.filter(p => p.favorite).length})`,
          `Nota média: ${notas.length ? f2(media(notas)) : 'sem avaliações'} · completude média: ${Math.round(completude)}%`,
          `Fotos: ${fotos} · histórias: ${d.stories.length} · notas gerais: ${d.generalNotes.length}`,
          `Lembretes abertos: ${d.reminders.filter(r => !r.concluido).length} · compromissos agendados: ${d.appointments.filter(a => a.status === 'agendado').length}`,
          `Etiquetas mais usadas: ${topTags.length ? topTags.map(([tag, total]) => `${tag} (${total})`).join(', ') : 'nenhuma'}`,
          `Movimento nos últimos 30 dias: ${novas} ficha(s) nova(s) e ${interacoes} interação(ões).`,
        ].join('\n'),
      };
    },
  },
  {
    id: 'integridade', nome: 'Verificar integridade dos vínculos', grupo: 'catalogo', icone: 'ShieldCheck',
    descricao: 'Acha referências quebradas (lembrete, nota, história, tierlist, pasta) e conserta com um toque.',
    campos: [{ key: 'corrigir', label: 'Corrigir os problemas encontrados', type: 'checkbox', default: '', help: 'Sem marcar, a ferramenta só mostra o relatório.' }],
    perigoso: 'A correção remove vínculos que apontam para fichas que não existem mais. Nada é apagado além dessas referências.',
    run: (v, ctx) => {
      const d = ctx.data;
      const ids = new Set(d.people.map(p => p.id));
      const problemas: ToolItem[] = [];
      const orfaos = (lista: { personId?: string | null }[], rotulo: string) => lista.forEach((item, indice) => { if (item.personId && !ids.has(item.personId)) problemas.push({ title: `${rotulo} sem ficha`, detail: `Registro #${indice + 1} aponta para uma ficha removida.` }); });
      orfaos(d.reminders, 'Lembrete'); orfaos(d.stories, 'História'); orfaos(d.goals, 'Meta');
      orfaos(d.conversations, 'Conversa registrada'); orfaos(d.memories, 'Memória'); orfaos(d.chats, 'Mensagem de chat');
      d.tierLists.forEach(lista => lista.items.filter(item => !ids.has(item.personId)).forEach(() => problemas.push({ title: 'Tierlist com participante inexistente', detail: lista.nome })));
      d.folders.forEach(pasta => {
        const fotos = new Set([...d.people.flatMap(p => p.fotos.map(f => f.id)), ...d.orphanPhotos.map(f => f.id)]);
        pasta.personIds.filter(id => !ids.has(id)).forEach(() => problemas.push({ title: 'Pasta com ficha removida', detail: pasta.name }));
        pasta.photoIds.filter(id => !fotos.has(id)).forEach(() => problemas.push({ title: 'Pasta com foto removida', detail: pasta.name }));
        pasta.noteIds.filter(id => !d.generalNotes.some(n => n.id === id)).forEach(() => problemas.push({ title: 'Pasta com nota removida', detail: pasta.name }));
        pasta.storyIds.filter(id => !d.stories.some(s => s.id === id)).forEach(() => problemas.push({ title: 'Pasta com história removida', detail: pasta.name }));
      });
      const todosIds = [...d.people.flatMap(p => p.fotos.map(f => f.id)), ...d.orphanPhotos.map(f => f.id)];
      const repetidos = todosIds.filter((id, i) => todosIds.indexOf(id) !== i);
      if (repetidos.length) problemas.push({ title: `${repetidos.length} foto(s) com identificador repetido`, detail: 'Pode causar conflito na galeria ao favoritar ou mover.' });
      const vazios = semLixeira(d).filter(p => p.fotos.some(f => !f.url));
      if (vazios.length) problemas.push({ title: `${vazios.length} ficha(s) com foto sem endereço`, detail: vazios.map(nomeCurto).join(', ') });
      Object.keys(d.chatStates).filter(id => !ids.has(id)).forEach(() => problemas.push({ title: 'Memória de conversa sem ficha', detail: 'Estado de chat órfão.' }));
      const avisos = problemas.length ? `Encontrei ${problemas.length} ponto(s) de atenção.` : 'Nenhum vínculo quebrado: seu catálogo está íntegro.';
      if (marcado(v, 'corrigir') && problemas.length) {
        ctx.commit(atual => ({
          ...atual,
          reminders: atual.reminders.filter(item => !item.personId || ids.has(item.personId)),
          stories: atual.stories.map(item => item.personId && !ids.has(item.personId) ? { ...item, personId: null } : item),
          goals: atual.goals.map(item => item.personId && !ids.has(item.personId) ? { ...item, personId: null } : item),
          conversations: atual.conversations.filter(item => !item.personId || ids.has(item.personId)),
          memories: atual.memories.filter(item => !item.personId || ids.has(item.personId)),
          chats: atual.chats.filter(item => ids.has(item.personId)),
          chatStates: Object.fromEntries(Object.entries(atual.chatStates).filter(([id]) => ids.has(id))),
          tierLists: atual.tierLists.map(lista => ({ ...lista, items: lista.items.filter(item => ids.has(item.personId)) })),
          folders: atual.folders.map(pasta => ({
            ...pasta,
            personIds: pasta.personIds.filter(id => ids.has(id)),
            photoIds: pasta.photoIds.filter(id => todosIds.includes(id)),
            noteIds: pasta.noteIds.filter(id => atual.generalNotes.some(n => n.id === id)),
            storyIds: pasta.storyIds.filter(id => atual.stories.some(s => s.id === id)),
          })),
        }), 'Vínculos quebrados corrigidos.', true);
      }
      return { itens: problemas.slice(0, 40), aviso: avisos, texto: problemas.length ? `${avisos}\n\n${problemas.slice(0, 40).map(item => `• ${item.title}${item.detail ? ` — ${item.detail}` : ''}`).join('\n')}${problemas.length > 40 ? `\n… e mais ${problemas.length - 40}.` : ''}` : avisos };
    },
  },
  {
    id: 'duplicatas', nome: 'Encontrar e mesclar duplicatas', grupo: 'catalogo', icone: 'Copy',
    descricao: 'Compara nome e contato para achar fichas repetidas e junta tudo na mais antiga.',
    campos: [{ key: 'mesclar', label: 'Mesclar as duplicatas agora', type: 'checkbox', help: 'A ficha mais antiga fica e recebe fotos, notas, etiquetas e lembretes da outra. A duplicata vai para a lixeira.' }],
    perigoso: 'As fichas repetidas vão para a lixeira (podem ser restauradas) e todo o conteúdo delas é movido para a ficha mais antiga.',
    run: (v, ctx) => {
      const duplicatas = findDuplicates(ctx.data);
      if (!duplicatas.length) return { texto: 'Nenhuma duplicata encontrada.' };
      if (marcado(v, 'mesclar')) {
        ctx.commit(atual => {
          // Decide quem fica: sempre a ficha mais antiga de cada dupla.
          const destino = new Map<string, string>();
          for (const par of duplicatas) {
            const aAntigo = Date.parse(par.a.createdAt || '') || 0;
            const bAntigo = Date.parse(par.b.createdAt || '') || 0;
            const manter = aAntigo <= bAntigo ? par.a : par.b;
            const sair = manter.id === par.a.id ? par.b : par.a;
            if (destino.has(manter.id) || destino.has(sair.id)) continue;
            destino.set(sair.id, manter.id);
          }
          interface Extra { fotos: Person['fotos']; notas: Person['notas']; tags: string[]; observacoes: string; campos: NonNullable<Person['customFields']>; anexos: NonNullable<Person['attachments']>; favorita: boolean; rating: Person['rating'] }
          const extras = new Map<string, Extra>();
          destino.forEach((manterId, sairId) => {
            const sair = atual.people.find(p => p.id === sairId);
            if (!sair) return;
            const acumulado = extras.get(manterId) || { fotos: [], notas: [], tags: [], observacoes: '', campos: [], anexos: [], favorita: false, rating: sair.rating };
            acumulado.fotos.push(...sair.fotos.map(foto => ({ ...foto, id: generateId(), personId: manterId })));
            acumulado.notas.push(...sair.notas.map(nota => ({ ...nota, id: generateId() })));
            acumulado.tags.push(...sair.tags);
            acumulado.observacoes = [acumulado.observacoes, sair.observacoesGerais].filter(Boolean).join('\n');
            acumulado.campos.push(...(sair.customFields || []));
            acumulado.anexos.push(...(sair.attachments || []));
            acumulado.favorita = acumulado.favorita || !!sair.favorite;
            if (nota(sair) > nota({ rating: acumulado.rating } as Person)) acumulado.rating = sair.rating;
            extras.set(manterId, acumulado);
          });
          const pessoas = atual.people.map(pessoa => {
            if (destino.has(pessoa.id)) return { ...pessoa, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            const extra = extras.get(pessoa.id);
            if (!extra) return pessoa;
            return {
              ...pessoa,
              fotos: [...pessoa.fotos, ...extra.fotos],
              notas: [...pessoa.notas, ...extra.notas],
              tags: [...new Set([...pessoa.tags, ...extra.tags])],
              observacoesGerais: [pessoa.observacoesGerais, extra.observacoes].filter(Boolean).join('\n'),
              customFields: [...(pessoa.customFields || []), ...extra.campos],
              attachments: [...(pessoa.attachments || []), ...extra.anexos],
              favorite: pessoa.favorite || extra.favorita,
              rating: nota(pessoa) >= nota({ rating: extra.rating } as Person) ? pessoa.rating : extra.rating,
              updatedAt: new Date().toISOString(),
            };
          });
          const remapear = (id: string | null | undefined) => (id ? destino.get(id) || id : id);
          return {
            ...atual,
            people: pessoas,
            reminders: atual.reminders.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            goals: atual.goals.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            stories: atual.stories.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            conversations: atual.conversations.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            memories: atual.memories.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            appointments: atual.appointments.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            notifications: atual.notifications.map(item => ({ ...item, personId: remapear(item.personId) ?? null })),
            chats: atual.chats.map(mensagem => ({ ...mensagem, personId: remapear(mensagem.personId) || mensagem.personId })),
            chatStates: atual.chatStates,
            tierLists: atual.tierLists.map(lista => ({ ...lista, items: [...new Map(lista.items.map(item => [remapear(item.personId) || item.personId, { personId: remapear(item.personId) || item.personId, tier: item.tier }])).values()] })),
            folders: atual.folders.map(pasta => ({ ...pasta, personIds: [...new Set(pasta.personIds.map(id => destino.get(id) || id))] })),
            vault: { ...atual.vault, photoIds: [...new Set(atual.vault.photoIds)] },
          } as AppData;
        }, `${duplicatas.length} par(es) de duplicatas mesclado(s).`, true);
        return { texto: `Mesclagem concluída em ${duplicatas.length} par(es). As fichas repetidas foram para a lixeira e o conteúdo delas está na ficha mais antiga.`, aviso: 'Duplicatas mescladas.' };
      }
      return {
        itens: duplicatas.slice(0, 30).map(par => ({ title: `${par.a.nome} × ${par.b.nome}`, detail: par.reason, personId: par.a.id })),
        texto: `Possíveis duplicatas: ${duplicatas.length}.\n\n${duplicatas.map(par => `• ${par.a.nome} × ${par.b.nome} (${par.reason})`).join('\n')}\n\nMarque "mesclar" e execute de novo para juntar tudo na ficha mais antiga.`,
      };
    },
  },
  {
    id: 'incompletas', nome: 'Fichas incompletas', grupo: 'catalogo', icone: 'ClipboardList',
    descricao: 'Lista o que falta em cada cadastro para você completar sem se perder.',
    campos: [{ key: 'limite', label: 'Quantas fichas mostrar', type: 'number', default: '15', min: 1, max: 200 }],
    run: (v, ctx) => {
      const limite = Math.max(1, inteiro(v, 'limite', 15));
      const fichas = semLixeira(ctx.data).map(p => ({ p, ...completeness(p) })).filter(item => item.percent < 100).sort((a, b) => a.percent - b.percent);
      if (!fichas.length) return { texto: 'Todas as fichas estão 100% completas.' };
      return {
        itens: fichas.slice(0, limite).map(item => ({ title: `${item.p.nome} — ${item.percent}%`, detail: `Falta: ${item.missing.join(', ')}`, personId: item.p.id })),
        texto: `${fichas.length} ficha(s) com pendência. Prioridades:\n\n${fichas.slice(0, limite).map(item => `• ${item.p.nome} (${item.percent}%): ${item.missing.join(', ')}`).join('\n')}`,
      };
    },
  },
  {
    id: 'csv', nome: 'Exportar CSV sob medida', grupo: 'catalogo', icone: 'FileSpreadsheet',
    descricao: 'Escolhe as colunas, o separador e o escopo antes de baixar a planilha.',
    campos: [
      { key: 'escopo', label: 'Quais fichas', type: 'select', default: 'ativas', options: [{ value: 'ativas', label: 'Somente ativas' }, { value: 'todas', label: 'Todas (menos a lixeira)' }, { value: 'favoritas', label: 'Favoritas' }, { value: 'arquivadas', label: 'Arquivadas' }, { value: 'lixeira', label: 'Lixeira' }] },
      { key: 'colunas', label: 'Colunas (nomes separados por vírgula)', type: 'text', default: 'nome, idade, nota, categoria, subcategoria, etiquetas, contato, cidade, aniversario, ultima_interacao, completa' },
      { key: 'separador', label: 'Separador', type: 'select', default: ';', options: [{ value: ';', label: 'Ponto e vírgula (Excel em português)' }, { value: ',', label: 'Vírgula' }, { value: '\t', label: 'Tabulação' }] },
    ],
    run: (v, ctx) => {
      const d = ctx.data;
      const escopo = campo(v, 'escopo', 'ativas');
      let lista = d.people.filter(p => escopo === 'lixeira' ? !!p.deletedAt : !p.deletedAt);
      if (escopo === 'ativas') lista = lista.filter(p => !p.archivedAt);
      if (escopo === 'favoritas') lista = lista.filter(p => p.favorite);
      if (escopo === 'arquivadas') lista = lista.filter(p => !!p.archivedAt);
      const colunas = campo(v, 'colunas', 'nome, idade, nota').split(',').map(c => c.trim()).filter(Boolean);
      const separador = campo(v, 'separador', ';');
      const valores = (p: Person): Record<string, string> => ({
        nome: p.nome, apelido: p.apelido || '', idade: String(idadeDe(p) ?? ''), nota: String(nota(p)), categoria: p.localizacaoOnde,
        subcategoria: p.localizacaoSub, etiquetas: p.tags.join(' | '), contato: p.redesSociais, cidade: p.localizacaoMora,
        aniversario: p.aniversario || '', ultima_interacao: p.ultimoVisto || '', interacoes: String(p.viHojeCount),
        completa: `${completeness(p).percent}%`, signo: p.signo || '', musica: p.musicaFavorita || '', como_conheceu: p.comoConheceu || '',
        comportamento: p.comportamento || '', observacoes: p.observacoesGerais || '', corpo: p.tipoCorpo || '', estilo: p.estiloRoupa || '',
        raridade: RARITY_LABELS[p.rarity || rarityFor(nota(p))] || '', favorita: p.favorite ? 'sim' : 'não',
        fotos: String(p.fotos.length), criada_em: (p.createdAt || '').slice(0, 10),
      });
      const escapar = (texto: string) => `${texto.replace(/"/g, '""')}`.includes(separador) || texto.includes('"') || texto.includes('\n') ? `"${texto.replace(/"/g, '""')}"` : texto;
      const linhas = [colunas.join(separador), ...lista.map(p => colunas.map(coluna => escapar(valores(p)[coluna] ?? '')).join(separador))];
      const csv = linhas.join('\n');
      return {
        baixar: { nome: `catalog-${escopo}-${hojeIso()}.csv`, conteudo: `\uFEFF${csv}`, tipo: 'text/csv' },
        texto: `${lista.length} ficha(s) em ${colunas.length} coluna(s). Prévia:\n\n${linhas.slice(0, 6).join('\n')}${lista.length > 5 ? '\n...' : ''}`,
        estatisticas: [{ label: 'Fichas exportadas', valor: milhar(lista.length) }, { label: 'Tamanho do arquivo', valor: kb(tamanhoDe(csv)) }],
      };
    },
  },
  {
    id: 'backup', nome: 'Backup completo em JSON', grupo: 'catalogo', icone: 'Save',
    descricao: 'Baixa uma cópia de tudo — com ou sem as imagens embutidas.',
    campos: [{ key: 'fotos', label: 'Incluir as fotos (arquivo maior)', type: 'checkbox', default: '1', help: 'Sem as fotos, o backup fica leve e serve para recuperar textos, notas e avaliações.' }],
    run: (v, ctx) => {
      const incluirFotos = marcado(v, 'fotos', true);
      const copia: AppData = incluirFotos ? ctx.data : {
        ...ctx.data,
        orphanPhotos: ctx.data.orphanPhotos.map(foto => ({ ...foto, url: '' })),
        people: ctx.data.people.map(p => ({ ...p, fotos: p.fotos.map(foto => ({ ...foto, url: '' })) })),
        settings: { ...ctx.data.settings, avatar: '' },
      };
      const json = JSON.stringify(copia);
      return {
        baixar: { nome: `catalog-backup-${incluirFotos ? 'completo' : 'leve'}-${hojeIso()}.json`, conteudo: JSON.stringify(copia, null, 2), tipo: 'application/json' },
        estatisticas: [
          { label: 'Fichas', valor: milhar(copia.people.length) },
          { label: 'Fotos', valor: milhar(copia.people.reduce((soma, p) => soma + p.fotos.length, 0) + copia.orphanPhotos.length) },
          { label: 'Conteúdo das fotos', valor: incluirFotos ? 'incluído' : 'removido' },
          { label: 'Tamanho estimado', valor: kb(tamanhoDe(json)) },
        ],
        texto: `Backup pronto${incluirFotos ? ' com todas as fotos' : ' leve, sem as imagens'}. Guarde o arquivo em um lugar seguro, fora do navegador.`,
      };
    },
  },
  {
    id: 'auditoria-fotos', nome: 'Auditoria das fotos', grupo: 'catalogo', icone: 'Image',
    descricao: 'Peso, repetidas por impressão digital, sem dono e as maiores imagens do catálogo.',
    campos: [{ key: 'remover', label: 'Remover as imagens repetidas', type: 'checkbox', help: 'Mantém a primeira de cada grupo e descarta as cópias.' }],
    perigoso: 'As cópias repetidas são removidas da galeria. A primeira imagem de cada grupo é mantida.',
    run: (v, ctx) => {
      const d = ctx.data;
      const todas = [...d.people.flatMap(p => p.fotos.map(foto => ({ ...foto, dono: p.nome, personId: p.id }))), ...d.orphanPhotos.map(foto => ({ ...foto, dono: 'Sem dono', personId: null }))];
      const gruposRepetidas = findDuplicatePhotos(d);
      const copias = gruposRepetidas.reduce((soma, grupo) => soma + Math.max(0, grupo.length - 1), 0);
      const comTamanhoTexto = todas.map(foto => ({ ...foto, bytes: tamanhoDe(foto.url || '') })).sort((a, b) => b.bytes - a.bytes);
      const totalBytes = comTamanhoTexto.reduce((soma, foto) => soma + foto.bytes, 0);
      const semDono = d.orphanPhotos.length;
      const semEndereco = todas.filter(foto => !foto.url).length;
      if (marcado(v, 'remover') && copias) {
        const idsRemover = new Set(gruposRepetidas.flatMap(grupo => grupo.slice(1).map(foto => foto.id)));
        ctx.commit(atual => ({
          ...atual,
          orphanPhotos: atual.orphanPhotos.filter(foto => !idsRemover.has(foto.id)),
          people: atual.people.map(p => ({ ...p, fotos: p.fotos.filter(foto => !idsRemover.has(foto.id)) })),
          albums: atual.albums.map(album => ({ ...album, photoIds: album.photoIds.filter(id => !idsRemover.has(id)) })),
          folders: atual.folders.map(pasta => ({ ...pasta, photoIds: pasta.photoIds.filter(id => !idsRemover.has(id)) })),
        }), `${idsRemover.size} imagem(ns) repetida(s) removida(s).`, true);
      }
      return {
        estatisticas: [
          { label: 'Imagens no catálogo', valor: milhar(todas.length) },
          { label: 'Peso aproximado', valor: kb(totalBytes) },
          { label: 'Cópias repetidas', valor: milhar(copias) },
          { label: 'Sem dono', valor: milhar(semDono) },
          { label: 'Sem endereço válido', valor: milhar(semEndereco) },
        ],
        itens: [
          ...gruposRepetidas.slice(0, 10).map(grupo => ({ title: `Repetidas: ${grupo.length} cópias de ${grupo[0].name || grupo[0].id.slice(0, 6)}`, detail: 'Mesma impressão digital do arquivo. Ficaria só a primeira.' })),
          ...comTamanhoTexto.slice(0, 5).map(foto => ({ title: `Maior imagem: ${foto.dono}`, detail: `${kb(foto.bytes)} · ${foto.type}` })),
        ],
        texto: [
          `Imagens: ${todas.length} (${kb(totalBytes)})`, `Cópias repetidas: ${copias}`, `Sem dono: ${semDono}`,
          copias ? 'Marque "remover" para limpar as cópias repetidas.' : 'Nenhuma imagem repetida encontrada.',
        ].join('\n'),
      };
    },
  },
  {
    id: 'estatisticas', nome: 'Estatísticas por grupo', grupo: 'catalogo', icone: 'TrendingUp',
    descricao: 'Contagem e nota média agrupadas como você escolher: categoria, tag, idade, raridade e mais.',
    campos: [
      { key: 'agrupar', label: 'Agrupar por', type: 'select', default: 'categoria', options: [{ value: 'categoria', label: 'Categoria' }, { value: 'subcategoria', label: 'Subcategoria' }, { value: 'tag', label: 'Etiqueta' }, { value: 'local', label: 'Cidade / bairro' }, { value: 'corpo', label: 'Tipo de corpo' }, { value: 'estilo', label: 'Estilo de roupa' }, { value: 'raridade', label: 'Raridade' }, { value: 'idade', label: 'Faixa de idade' }, { value: 'signo', label: 'Signo' }] },
      { key: 'vazios', label: 'Incluir quem está sem esse campo', type: 'checkbox' },
    ],
    run: (v, ctx) => {
      const d = ctx.data;
      const chave = campo(v, 'agrupar', 'categoria');
      const incluirVazios = marcado(v, 'vazios');
      const grupos = new Map<string, Person[]>();
      const faixa = (idade: number | null) => idade === null ? 'Sem idade' : idade < 20 ? 'Até 19' : idade < 25 ? '20 a 24' : idade < 30 ? '25 a 29' : idade < 40 ? '30 a 39' : idade < 50 ? '40 a 49' : '50+';
      for (const p of semLixeira(d)) {
        let valor = '';
        if (chave === 'categoria') valor = p.localizacaoOnde || '';
        else if (chave === 'subcategoria') valor = p.localizacaoSub || '';
        else if (chave === 'tag') { p.tags.forEach(tag => grupos.set(tag, [...(grupos.get(tag) || []), p])); continue; }
        else if (chave === 'local') valor = p.localizacaoMora || '';
        else if (chave === 'corpo') valor = p.tipoCorpo || '';
        else if (chave === 'estilo') valor = p.estiloRoupa || '';
        else if (chave === 'raridade') valor = RARITY_LABELS[p.rarity || rarityFor(nota(p))] || '';
        else if (chave === 'idade') valor = faixa(idadeDe(p));
        else if (chave === 'signo') valor = p.signo || '';
        if (!valor && !incluirVazios) continue;
        const rotulo = valor || 'Não informado';
        grupos.set(rotulo, [...(grupos.get(rotulo) || []), p]);
      }
      const linhas = [...grupos.entries()].map(([rotulo, pessoas]) => ({ rotulo, total: pessoas.length, media: media(pessoas.map(nota).filter(n => n > 0)), completude: media(pessoas.map(p => completeness(p).percent)) })).sort((a, b) => b.total - a.total);
      if (!linhas.length) return { texto: 'Nenhum dado para agrupar com esse critério.' };
      return {
        itens: linhas.slice(0, 30).map(item => ({ title: `${item.rotulo} — ${item.total} ficha(s)`, detail: `Nota média ${item.media ? f2(item.media) : '—'} · ficha completa em ${Math.round(item.completude)}%` })),
        texto: `Agrupado por ${chave}:\n\n${linhas.map(item => `• ${item.rotulo}: ${item.total} ficha(s) · nota média ${item.media ? f2(item.media) : '—'} · completude ${Math.round(item.completude)}%`).join('\n')}`,
      };
    },
  },
  {
    id: 'aniversarios', nome: 'Aniversários e idades', grupo: 'catalogo', icone: 'Cake',
    descricao: 'Quem faz aniversário nos próximos dias, com a idade que vai completar.',
    campos: [{ key: 'dias', label: 'Próximos quantos dias', type: 'number', default: '60', min: 1, max: 366 }],
    run: (v, ctx) => {
      const limite = Math.max(1, inteiro(v, 'dias', 60));
      const lista = semLixeira(ctx.data).map(p => ({ p, faltam: upcomingBirthday(p.aniversario) })).filter(item => item.faltam !== null && item.faltam <= limite).sort((a, b) => (a.faltam || 0) - (b.faltam || 0));
      if (!lista.length) return { texto: `Nenhum aniversário nos próximos ${limite} dias. Cadastre a data na ficha para não esquecer mais.` };
      return {
        itens: lista.map(item => {
          const idade = item.p.idade ?? ageFromBirthday(item.p.aniversario);
          return { title: `${item.p.nome} — ${item.faltam === 0 ? 'hoje!' : `faltam ${item.faltam} dia(s)`}`, detail: `${diaBr(item.p.aniversario)}${idade ? ` · faz/faria ${idade + 1} anos` : ''}`, personId: item.p.id };
        }),
        texto: `${lista.length} aniversário(s) nos próximos ${limite} dias:\n\n${lista.map(item => `• ${item.p.nome}: ${diaBr(item.p.aniversario)} (${item.faltam === 0 ? 'é hoje' : `faltam ${item.faltam} dias`})`).join('\n')}`,
      };
    },
  },
  {
    id: 'atividade', nome: 'Linha do tempo da atividade', grupo: 'catalogo', icone: 'History',
    descricao: 'O que você mexeu, quando mexeu e o resumo por tipo de ação.',
    campos: [{ key: 'dias', label: 'Últimos quantos dias', type: 'number', default: '30', min: 1, max: 365 }],
    run: (v, ctx) => {
      const dias = Math.max(1, inteiro(v, 'dias', 30));
      const corte = Date.parse(`${deslocar(hojeIso(), -dias)}T00:00:00`);
      const itens = ctx.data.activity.filter(item => (Date.parse(item.data) || 0) >= corte);
      const porTipo = new Map<string, number>();
      itens.forEach(item => porTipo.set(item.tipo, (porTipo.get(item.tipo) || 0) + 1));
      if (!itens.length) return { texto: `Nada registrado nos últimos ${dias} dias.` };
      return {
        estatisticas: [...porTipo.entries()].map(([tipo, total]) => ({ label: tipo, valor: milhar(total) })),
        itens: itens.slice(0, 25).map(item => ({ title: item.texto, detail: formatDate(item.data, true), personId: item.personId || undefined })),
        texto: `Atividade nos últimos ${dias} dias: ${itens.length} registro(s).\n\nÚltimos lançamentos:\n${itens.slice(0, 15).map(item => `• ${diaBr(item.data)} — ${item.texto}`).join('\n')}`,
      };
    },
  },
];


// ---------------------------------------------------------------------------
// Grupo 2 — Organização em lote
// ---------------------------------------------------------------------------

const FERRAMENTAS_LOTE: Tool[] = [
  {
    id: 'renomear-lote', nome: 'Padronizar nomes em lote', grupo: 'lote', icone: 'Type',
    descricao: 'Coloca os nomes em formato de título, maiúsculas, minúsculas ou acrescenta prefixo/sufixo.',
    campos: [
      { key: 'modo', label: 'Como ajustar', type: 'select', default: 'titulo', options: [{ value: 'titulo', label: 'Formato de título (Ana Clara)' }, { value: 'maiusculas', label: 'MAIÚSCULAS' }, { value: 'minusculas', label: 'minúsculas' }, { value: 'limpar', label: 'Só limpar espaços duplicados' }, { value: 'prefixo', label: 'Adicionar prefixo' }, { value: 'sufixo', label: 'Adicionar sufixo' }] },
      { key: 'texto', label: 'Prefixo ou sufixo', type: 'text', placeholder: 'Ex.: Dra. / (turma A)' },
      { key: 'aplicar', label: 'Aplicar de verdade', type: 'checkbox', help: 'Sem marcar, a ferramenta só mostra a prévia.' },
    ],
    perigoso: 'Os nomes de todas as fichas ativas serão alterados. Dá para desfazer com Ctrl+Z.',
    run: (v, ctx) => {
      const modo = campo(v, 'modo', 'titulo');
      const texto = campo(v, 'texto');
      const limpar = (nome: string) => nome.replace(/\s+/g, ' ').trim();
      const aplicar = (nome: string) => {
        const limpo = limpar(nome);
        if (modo === 'titulo') return limpo.split(' ').map(palavra => palavra.length <= 2 && /^d[aeo]s?$/i.test(palavra) ? palavra.toLowerCase() : palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()).join(' ');
        if (modo === 'maiusculas') return limpo.toUpperCase();
        if (modo === 'minusculas') return limpo.toLowerCase();
        if (modo === 'prefixo') return `${texto} ${limpo}`.trim();
        if (modo === 'sufixo') return `${limpo} ${texto}`.trim();
        return limpo;
      };
      const mudancas = semLixeira(ctx.data).map(p => ({ p, novo: aplicar(p.nome) })).filter(item => item.novo && item.novo !== item.p.nome);
      if (!mudancas.length) return { texto: 'Nenhum nome precisa de ajuste com essa opção.' };
      if (marcado(v, 'aplicar')) {
        ctx.commit(atual => ({ ...atual, people: atual.people.map(p => { const alvo = mudancas.find(item => item.p.id === p.id); return alvo ? { ...p, nome: alvo.novo, updatedAt: new Date().toISOString() } : p; }) }), `${mudancas.length} nome(s) ajustado(s).`, true);
      }
      return {
        itens: mudancas.slice(0, 20).map(item => ({ title: `${item.p.nome} → ${item.novo}`, personId: item.p.id })),
        texto: `${mudancas.length} nome(s) ${marcado(v, 'aplicar') ? 'alterado(s)' : 'ficariam assim'}:\n\n${mudancas.slice(0, 20).map(item => `• ${item.p.nome} → ${item.novo}`).join('\n')}${mudancas.length > 20 ? `\n… e mais ${mudancas.length - 20}.` : ''}`,
      };
    },
  },
  {
    id: 'etiquetar-lote', nome: 'Etiquetar em lote por regra', grupo: 'lote', icone: 'Tags',
    descricao: 'Aplica (ou remove) uma etiqueta de todas as fichas que obedecem a uma regra sua.',
    campos: [
      { key: 'tag', label: 'Etiqueta', type: 'text', default: 'conhecida', placeholder: 'Ex.: crush, amiga, trabalho' },
      { key: 'regra', label: 'Regra', type: 'select', default: 'nota', options: REGRAS_LOTE },
      { key: 'valor', label: 'Valor da regra', type: 'text', placeholder: 'Ex.: 4 ou amiga ou 30' },
      { key: 'remover', label: 'Remover a etiqueta em vez de adicionar', type: 'checkbox' },
      { key: 'aplicar', label: 'Aplicar de verdade', type: 'checkbox' },
    ],
    perigoso: 'A etiqueta será adicionada ou removida das fichas que combinarem com a regra.',
    run: (v, ctx) => {
      const tag = campo(v, 'tag');
      if (!tag) return { texto: 'Escreva o nome da etiqueta.' };
      const alvo = selecionar(ctx.data, campo(v, 'regra', 'nota'), campo(v, 'valor'));
      const remover = marcado(v, 'remover');
      const afetadas = alvo.filter(p => remover ? p.tags.includes(tag) : !p.tags.includes(tag));
      if (!afetadas.length) return { texto: `Nenhuma ficha para ${remover ? 'remover' : 'receber'} a etiqueta "${tag}" com essa regra.` };
      if (marcado(v, 'aplicar')) {
        ctx.commit(atual => ({ ...atual, people: atual.people.map(p => afetadas.some(alvoItem => alvoItem.id === p.id) ? { ...p, tags: remover ? p.tags.filter(t => t !== tag) : [...new Set([...p.tags, tag])], updatedAt: new Date().toISOString() } : p) }), `${afetadas.length} ficha(s) atualizada(s).`, true);
      }
      return {
        itens: afetadas.slice(0, 20).map(p => ({ title: p.nome, detail: `Nota ${f1(nota(p))} · ${p.tags.join(', ') || 'sem etiquetas'}`, personId: p.id })),
        texto: `${afetadas.length} ficha(s) ${remover ? 'perderiam' : 'receberiam'} a etiqueta "${tag}":\n\n${afetadas.slice(0, 20).map(p => `• ${p.nome}`).join('\n')}${afetadas.length > 20 ? `\n… e mais ${afetadas.length - 20}.` : ''}`,
      };
    },
  },
  {
    id: 'arquivar-inativos', nome: 'Arquivar quem está sumido', grupo: 'lote', icone: 'Archive',
    descricao: 'Guarda no arquivo as fichas sem interação há mais de N dias, tirando o peso do catálogo.',
    campos: [
      { key: 'dias', label: 'Sem interação há quantos dias', type: 'number', default: '60', min: 1, max: 3650 },
      { key: 'manter-favoritas', label: 'Manter as favoritas ativas', type: 'checkbox', default: '1' },
      { key: 'aplicar', label: 'Arquivar de verdade', type: 'checkbox' },
    ],
    perigoso: 'As fichas escolhidas vão para a aba Arquivadas. Nada é apagado e você pode desarquivar quando quiser.',
    run: (v, ctx) => {
      const dias = Math.max(1, inteiro(v, 'dias', 60));
      const manterFavoritas = marcado(v, 'manter-favoritas', true);
      const alvo = ativos(ctx.data).filter(p => {
        const ultimo = p.ultimoVisto || p.updatedAt || p.createdAt;
        const passados = Math.floor((Date.now() - (Date.parse(ultimo) || Date.now())) / 86400000);
        if (passados < dias) return false;
        if (manterFavoritas && p.favorite) return false;
        return true;
      });
      if (!alvo.length) return { texto: `Nenhuma ficha ativa está há ${dias} dias sem interação.` };
      if (marcado(v, 'aplicar')) {
        ctx.commit(atual => ({ ...atual, people: atual.people.map(p => alvo.some(item => item.id === p.id) ? { ...p, archivedAt: new Date().toISOString() } : p) }), `${alvo.length} ficha(s) arquivada(s).`, true);
      }
      return {
        itens: alvo.slice(0, 20).map(p => ({ title: p.nome, detail: `Última interação: ${diaBr(p.ultimoVisto || p.updatedAt)}`, personId: p.id })),
        texto: `${alvo.length} ficha(s) ${marcado(v, 'aplicar') ? 'arquivada(s)' : 'seriam arquivadas'}:\n\n${alvo.slice(0, 20).map(p => `• ${p.nome} — sem interação desde ${diaBr(p.ultimoVisto || p.updatedAt)}`).join('\n')}${alvo.length > 20 ? `\n… e mais ${alvo.length - 20}.` : ''}`,
      };
    },
  },
  {
    id: 'mesclar-tags', nome: 'Unificar etiquetas parecidas', grupo: 'lote', icone: 'Puzzle',
    descricao: 'Encontra etiquetas escritas de formas diferentes (acento, maiúscula, plural) e junta tudo.',
    campos: [{ key: 'aplicar', label: 'Unificar de verdade', type: 'checkbox' }],
    perigoso: 'As etiquetas parecidas serão trocadas pela versão mais usada. O histórico das fichas é preservado.',
    run: (v, ctx) => {
      const contagem = new Map<string, number>();
      semLixeira(ctx.data).forEach(p => p.tags.forEach(tag => contagem.set(tag, (contagem.get(tag) || 0) + 1)));
      const tags = [...contagem.keys()];
      const grupos: { manter: string; juntar: string[] }[] = [];
      const usados = new Set<string>();
      const distancia = (a: string, b: string) => {
        const m = a.length, n = b.length;
        const tabela = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
        for (let j = 0; j <= n; j++) tabela[0][j] = j;
        for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) tabela[i][j] = Math.min(tabela[i - 1][j] + 1, tabela[i][j - 1] + 1, tabela[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return tabela[m][n];
      };
      for (const tag of [...tags].sort((a, b) => (contagem.get(b) || 0) - (contagem.get(a) || 0))) {
        if (usados.has(tag)) continue;
        const juntar = tags.filter(outra => outra !== tag && !usados.has(outra) && (normalizeText(outra) === normalizeText(tag) || distancia(normalizeText(outra), normalizeText(tag)) <= 1));
        if (juntar.length) { grupos.push({ manter: tag, juntar }); juntar.forEach(item => usados.add(item)); usados.add(tag); }
      }
      if (!grupos.length) return { texto: 'Nenhuma etiqueta parecida encontrada: suas tags já estão padronizadas.' };
      if (marcado(v, 'aplicar')) {
        const trocas = new Map<string, string>();
        grupos.forEach(grupo => grupo.juntar.forEach(tag => trocas.set(tag, grupo.manter)));
        ctx.commit(atual => ({
          ...atual,
          people: atual.people.map(p => ({ ...p, tags: [...new Set(p.tags.map(tag => trocas.get(tag) || tag))] })),
          settings: { ...atual.settings, customTags: atual.settings.customTags.filter(tag => !trocas.has(tag.nome)) },
        }), `${trocas.size} etiqueta(s) unificada(s).`, true);
      }
      return {
        itens: grupos.map(grupo => ({ title: `Manter "${grupo.manter}"`, detail: `Juntar: ${grupo.juntar.join(', ')}` })),
        texto: `${grupos.length} grupo(s) de etiquetas parecidas:\n\n${grupos.map(grupo => `• "${grupo.manter}" ← ${grupo.juntar.join(', ')}`).join('\n')}`,
      };
    },
  },
  {
    id: 'favoritar-nota', nome: 'Favoritar por nota', grupo: 'lote', icone: 'Star',
    descricao: 'Marca como favoritas as fichas com nota igual ou acima do valor que você escolher.',
    campos: [
      { key: 'nota', label: 'Nota mínima', type: 'number', default: '4', min: 0, max: 5 },
      { key: 'apenas-ativas', label: 'Somente fichas ativas', type: 'checkbox', default: '1' },
      { key: 'aplicar', label: 'Aplicar de verdade', type: 'checkbox' },
    ],
    perigoso: 'As fichas escolhidas entram na aba Favoritos.',
    run: (v, ctx) => {
      const minimo = numero(v, 'nota', 4);
      const lista = (marcado(v, 'apenas-ativas', true) ? ativos(ctx.data) : semLixeira(ctx.data)).filter(p => nota(p) >= minimo && !p.favorite);
      if (!lista.length) return { texto: `Nenhuma ficha fora dos favoritos com nota a partir de ${f1(minimo)}.` };
      if (marcado(v, 'aplicar')) ctx.commit(atual => ({ ...atual, people: atual.people.map(p => lista.some(item => item.id === p.id) ? { ...p, favorite: true } : p) }), `${lista.length} ficha(s) favoritada(s).`, true);
      return {
        itens: lista.slice(0, 20).map(p => ({ title: `${p.nome} — ${f1(nota(p))}`, personId: p.id })),
        texto: `${lista.length} ficha(s) com nota a partir de ${f1(minimo)} ${marcado(v, 'aplicar') ? 'viraram favoritas' : 'virariam favoritas'}.`,
      };
    },
  },
  {
    id: 'pastas-por-categoria', nome: 'Criar pastas por categoria', grupo: 'lote', icone: 'FolderPlus',
    descricao: 'Monta uma pasta para cada categoria e coloca as fichas dentro, sem duplicar nada.',
    campos: [
      { key: 'filhas', label: 'Criar também subpastas para as subcategorias', type: 'checkbox' },
      { key: 'aplicar', label: 'Criar de verdade', type: 'checkbox', default: '1' },
    ],
    run: (v, ctx) => {
      const d = ctx.data;
      const criadas: string[] = [];
      const vinculadas: string[] = [];
      const totalPorCategoria = new Map<string, Person[]>();
      semLixeira(d).forEach(p => { if (!p.localizacaoOnde) return; totalPorCategoria.set(p.localizacaoOnde, [...(totalPorCategoria.get(p.localizacaoOnde) || []), p]); });
      if (!totalPorCategoria.size) return { texto: 'Nenhuma ficha tem categoria definida. Preencha a categoria na ficha para usar esta ferramenta.' };
      if (!marcado(v, 'aplicar', true)) return { texto: `${totalPorCategoria.size} pasta(s) seriam criadas: ${[...totalPorCategoria.keys()].join(', ')}.` };
      ctx.commit(atual => {
        let pastas: Folder[] = [...atual.folders];
        for (const [categoria, pessoas] of totalPorCategoria) {
          const rotulo = atual.categories.find(c => c.value === categoria)?.label || categoria;
          let pasta = pastas.find(item => normalizeText(item.name) === normalizeText(rotulo) && !item.parentId);
          if (!pasta) { pasta = { id: generateId(), name: rotulo, color: '#c786ec', icon: 'folder', description: 'Criada pela ferramenta de pastas por categoria.', personIds: [], photoIds: [], noteIds: [], storyIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; pastas = [...pastas, pasta]; criadas.push(rotulo); }
          pasta = { ...pasta, personIds: [...new Set([...pasta.personIds, ...pessoas.map(p => p.id)])], updatedAt: new Date().toISOString() };
          pastas = pastas.map(item => item.id === pasta!.id ? pasta! : item);
          vinculadas.push(...pessoas.map(p => p.nome));
          if (marcado(v, 'filhas')) {
            const subs = new Map<string, Person[]>();
            pessoas.filter(p => p.localizacaoSub).forEach(p => subs.set(p.localizacaoSub, [...(subs.get(p.localizacaoSub) || []), p]));
            for (const [sub, gente] of subs) {
              const rotuloSub = atual.categories.find(c => c.value === categoria)?.subs?.find(s => s.value === sub)?.label || sub;
              let filha = pastas.find(item => item.parentId === pasta!.id && normalizeText(item.name) === normalizeText(rotuloSub));
              if (!filha) { filha = { id: generateId(), name: rotuloSub, color: pasta.color, icon: 'folder', description: '', personIds: [], photoIds: [], noteIds: [], storyIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), parentId: pasta.id }; pastas = [...pastas, filha]; criadas.push(`${rotulo} / ${rotuloSub}`); }
              filha = { ...filha, personIds: [...new Set([...filha.personIds, ...gente.map(p => p.id)])] };
              pastas = pastas.map(item => item.id === filha!.id ? filha! : item);
            }
          }
        }
        return { ...atual, folders: pastas };
      }, 'Pastas por categoria criadas.', true);
      return {
        estatisticas: [{ label: 'Pastas criadas', valor: milhar(criadas.length) }, { label: 'Fichas vinculadas', valor: milhar(vinculadas.length) }],
        itens: criadas.slice(0, 20).map(nome => ({ title: nome, detail: 'Pasta pronta', page: 'folders' })),
        texto: `${criadas.length} pasta(s) criadas e ${vinculadas.length} ficha(s) vinculadas.`,
      };
    },
  },
  {
    id: 'padronizar-campos', nome: 'Preencher campos vazios', grupo: 'lote', icone: 'PenLine',
    descricao: 'Define um valor padrão para o campo que ainda está em branco em várias fichas.',
    campos: [
      { key: 'campo-alvo', label: 'Campo', type: 'select', default: 'tipoCorpo', options: [{ value: 'tipoCorpo', label: 'Tipo de corpo' }, { value: 'estiloRoupa', label: 'Estilo de roupa' }, { value: 'altura', label: 'Altura' }, { value: 'cabeloTipo', label: 'Tipo de cabelo' }, { value: 'pele', label: 'Tom de pele' }, { value: 'localizacaoOnde', label: 'Categoria' }, { value: 'signo', label: 'Signo' }, { value: 'localizacaoMora', label: 'Cidade / bairro' }] },
      { key: 'valor', label: 'Valor a preencher', type: 'text', placeholder: 'Ex.: atlético, casual, alta...' },
      { key: 'aplicar', label: 'Aplicar de verdade', type: 'checkbox' },
    ],
    perigoso: 'O valor será gravado nas fichas que estiverem com esse campo vazio. Fichas já preenchidas não são tocadas.',
    run: (v, ctx) => {
      const chave = campo(v, 'campo-alvo', 'tipoCorpo') as keyof Person;
      const valor = campo(v, 'valor');
      if (!valor) return { texto: 'Escreva o valor que deve ser preenchido.' };
      const vazias = semLixeira(ctx.data).filter(p => !String(p[chave] ?? '').trim());
      if (!vazias.length) return { texto: 'Todas as fichas já têm esse campo preenchido.' };
      if (marcado(v, 'aplicar')) ctx.commit(atual => ({ ...atual, people: atual.people.map(p => vazias.some(item => item.id === p.id) ? { ...p, [chave]: valor, updatedAt: new Date().toISOString() } : p) }), `${vazias.length} ficha(s) atualizada(s).`, true);
      return {
        itens: vazias.slice(0, 20).map(p => ({ title: p.nome, personId: p.id })),
        texto: `${vazias.length} ficha(s) ${marcado(v, 'aplicar') ? `receberam "${valor}"` : `receberiam "${valor}"`} em ${chave}.`,
      };
    },
  },
  {
    id: 'tierlist-automatica', nome: 'Tierlist automática por nota', grupo: 'lote', icone: 'Trophy',
    descricao: 'Cria uma tierlist já distribuída pelas faixas de nota que você definir.',
    campos: [
      { key: 'nome', label: 'Nome da tierlist', type: 'text', default: 'Por nota' },
      { key: 'cortes', label: 'Cortes de nota (do maior para o menor)', type: 'text', default: '4.5, 4, 3.5, 3, 0' },
      { key: 'somente-ativas', label: 'Somente fichas ativas', type: 'checkbox', default: '1' },
    ],
    perigoso: 'Uma tierlist nova será criada. As existentes não são alteradas.',
    run: (v, ctx) => {
      const nome = campo(v, 'nome', 'Por nota');
      const cortes = campo(v, 'cortes', '4.5, 4, 3.5, 3, 0').split(',').map(valor => Number(valor.trim().replace(',', '.'))).filter(valor => Number.isFinite(valor));
      const faixas = cortes.length ? cortes : [4.5, 4, 3.5, 3, 0];
      const rotulos = faixas.map((corte, i) => i === 0 ? `${corte.toFixed(1)} ou mais` : i === faixas.length - 1 && corte === 0 ? `abaixo de ${faixas[i - 1].toFixed(1)}` : `${corte.toFixed(1)} a ${(faixas[i - 1] - 0.1).toFixed(1)}`);
      const lista = marcado(v, 'somente-ativas', true) ? ativos(ctx.data) : semLixeira(ctx.data);
      const id = generateId();
      const items = lista.map(p => {
        const indice = faixas.findIndex(corte => nota(p) >= corte);
        return { personId: p.id, tier: rotulos[Math.max(0, indice)] };
      });
      if (!items.length) return { texto: 'Não há fichas para montar a tierlist.' };
      ctx.commit(atual => ({ ...atual, tierLists: [...atual.tierLists, { id, nome, tiers: rotulos, items, allowedCategories: ['todas'], allowedSubcategories: ['todas'] }] }), 'Tierlist automática criada.', true);
      return {
        estatisticas: rotulos.map(rotulo => ({ label: rotulo, valor: milhar(items.filter(item => item.tier === rotulo).length) })),
        texto: `Tierlist "${nome}" criada com ${items.length} ficha(s) em ${rotulos.length} faixa(s).`,
        aviso: 'Tierlist automática criada.',
      };
    },
  },
];


// ---------------------------------------------------------------------------
// Grupo 3 — Conversa e social
// ---------------------------------------------------------------------------

const ESTAGIO_LABEL: Record<Intimidade, string> = { nova: 'recém-conhecidos', conhecendo: 'pegando intimidade', confiante: 'confiança', proxima: 'proximidade', especial: 'ligação especial' };
/** Ficha adulta: só essas podem receber qualquer conteúdo picante. */
const personaAdulta = (person: Person) => isAdult(person);

function resumoDoChat(d: AppData, person: Person) {
  const mensagens = d.chats.filter(mensagem => mensagem.personId === person.id);
  const estado = estadoDe(d, person);
  const persona = buildPersona(person);
  const analise = analisarConversa(mensagens);
  return { mensagens, estado, persona, analise };
}

const FERRAMENTAS_SOCIAL: Tool[] = [
  {
    id: 'quebra-gelos', nome: 'Gerador de quebra-gelos por persona', grupo: 'social', icone: 'Lightbulb',
    descricao: 'Aberturas personalizadas com base no que a ficha diz sobre a pessoa: interesses, rotina, música e momento da relação.',
    campos: [
      { key: 'pessoa', label: 'Pessoa', type: 'person' },
      { key: 'quantidade', label: 'Quantas sugestões', type: 'number', default: '5', min: 1, max: 12 },
      { key: 'adulto', label: 'Incluir o tom provocante (ficha 18+)', type: 'checkbox' },
    ],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa para gerar os quebra-gelos.' };
      const persona = buildPersona(person);
      const estado = estadoDe(ctx.data, person);
      const sugestoes = sugerirAberturas({ person, persona, state: estado, historico: ctx.data.chats.filter(m => m.personId === person.id), adulto: marcado(v, 'adulto') && !!ctx.data.settings.adultMode, quantas: Math.max(1, inteiro(v, 'quantidade', 5)) });
      return {
        itens: sugestoes.map(sugestao => ({ title: sugestao.texto, detail: sugestao.motivo, personId: person.id })),
        texto: `Aberturas para ${person.nome} (${persona.resumo}):\n\n${sugestoes.map((sugestao, i) => `${i + 1}. ${sugestao.texto}\n   ↳ ${sugestao.motivo}`).join('\n')}`,
      };
    },
  },
  {
    id: 'coach-resposta', nome: 'Coach de resposta', grupo: 'social', icone: 'Target',
    descricao: 'Lê a última mensagem dela e sugere respostas em tons diferentes, explicando o porquê.',
    campos: [
      { key: 'pessoa', label: 'Pessoa', type: 'person' },
      { key: 'mensagem', label: 'Mensagem dela (deixe vazio para usar a última do chat)', type: 'textarea', placeholder: 'Cole aqui o que ela escreveu' },
    ],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa para usar o coach.' };
      const { mensagens, estado, persona } = resumoDoChat(ctx.data, person);
      const ultima = campo(v, 'mensagem') || [...mensagens].reverse().find(mensagem => mensagem.role === 'them')?.text || '';
      if (!ultima) return { texto: 'Não há mensagem dela para analisar. Escreva ou cole o que ela disse no campo acima.' };
      const sugestoes = sugerirRespostas({ person, persona, state: estado, mensagemDela: ultima, adulto: !!ctx.data.settings.adultMode, quantas: 4 });
      const tomDe = (texto: string) => /\?$|como|por que|quando|qual/i.test(texto) ? 'Ela está perguntando: responda e devolva outra pergunta.' : /saudade|pensando/i.test(texto) ? 'Ela abriu o coração: corresponda sem exagerar.' : /vamos|bora|topa|café|sair/i.test(texto) ? 'Ela está criando abertura para se verem: confirme com dia e lugar.' : 'Ela só manteve o papo: traga um assunto novo em vez de responder só "ok".';
      return {
        itens: sugestoes.map(sugestao => ({ title: sugestao.texto, detail: sugestao.motivo, personId: person.id })),
        texto: `Ela escreveu: "${ultima}"\n${tomDe(ultima)}\n\nRespostas sugeridas para ${person.nome} (química ${Math.round(estado.afinidade)}%):\n\n${sugestoes.map((sugestao, i) => `${i + 1}. ${sugestao.texto}  (${sugestao.motivo})`).join('\n')}`,
      };
    },
  },
  {
    id: 'analise-conversas', nome: 'Análise das conversas', grupo: 'social', icone: 'MessageSquareText',
    descricao: 'Quem escreve mais, quem puxa assunto, tamanho médio das mensagens e temas dominantes.',
    campos: [
      { key: 'pessoa', label: 'Pessoa (vazio = todas)', type: 'person' },
      { key: 'mostrar', label: 'Quantas pessoas listar', type: 'number', default: '8', min: 1, max: 50 },
    ],
    run: (v, ctx) => {
      const d = ctx.data;
      const alvo = campo(v, 'pessoa') ? [semLixeira(d).find(p => p.id === campo(v, 'pessoa'))].filter(Boolean) as Person[] : PESSOAS(d).filter(p => d.chats.some(mensagem => mensagem.personId === p.id));
      const linhas = alvo.map(person => ({ person, ...resumoDoChat(d, person) })).filter(item => item.mensagens.length);
      if (!linhas.length) return { texto: 'Nenhuma conversa registrada ainda. Abra uma ficha e use "Conversar" para começar.' };
      const itens = linhas.slice(0, Math.max(1, inteiro(v, 'mostrar', 8))).map(item => ({
        title: `${item.person.nome} — ${item.mensagens.length} mensagem(ns)`,
        detail: `Suas: ${item.analise.doUsuario} · dela: ${item.analise.dela} · média dela ${item.analise.media.ela} caracteres · ela iniciou ${item.analise.iniciaEla}x · química ${Math.round(item.estado.afinidade)}% (${ESTAGIO_LABEL[estagioAtual(item.estado).id]})`,
        personId: item.person.id,
      }));
      return {
        itens,
        texto: `Resumo das conversas:\n\n${itens.map(item => `• ${item.title}\n  ${item.detail}`).join('\n')}`,
      };
    },
  },
  {
    id: 'exportar-conversas', nome: 'Exportar conversas', grupo: 'social', icone: 'Download',
    descricao: 'Baixa as conversas em Markdown ou CSV, com resumo no fim.',
    campos: [
      { key: 'pessoa', label: 'Pessoa (vazio = todas)', type: 'person' },
      { key: 'formato', label: 'Formato', type: 'select', default: 'markdown', options: [{ value: 'markdown', label: 'Markdown (.md)' }, { value: 'csv', label: 'Planilha (.csv)' }] },
    ],
    run: (v, ctx) => {
      const d = ctx.data;
      const pessoas = campo(v, 'pessoa') ? [semLixeira(d).find(p => p.id === campo(v, 'pessoa'))].filter(Boolean) as Person[] : PESSOAS(d).filter(p => d.chats.some(mensagem => mensagem.personId === p.id));
      if (!pessoas.length) return { texto: 'Nenhuma conversa para exportar.' };
      const formato = campo(v, 'formato', 'markdown');
      let conteudo: string, nome: string, tipo: string;
      if (formato === 'csv') {
        const linhas = ['pessoa;papel;data;hora;mensagem'];
        pessoas.forEach(person => d.chats.filter(mensagem => mensagem.personId === person.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach(mensagem => {
          linhas.push([person.nome, mensagem.role === 'user' ? 'você' : mensagem.role === 'them' ? person.nome : 'sistema', (mensagem.timestamp || '').slice(0, 10), (mensagem.timestamp || '').slice(11, 16), `"${(mensagem.text || '').replace(/"/g, '""')}"`].join(';'));
        }));
        conteudo = `\uFEFF${linhas.join('\n')}`; nome = `conversas-${hojeIso()}.csv`; tipo = 'text/csv';
      } else {
        conteudo = pessoas.map(person => conversaParaMarkdown(person, d.chats.filter(mensagem => mensagem.personId === person.id))).join('\n\n---\n\n');
        nome = `conversas-${hojeIso()}.md`; tipo = 'text/markdown';
      }
      return {
        baixar: { nome, conteudo, tipo },
        estatisticas: [{ label: 'Pessoas', valor: milhar(pessoas.length) }, { label: 'Mensagens', valor: milhar(pessoas.reduce((soma, person) => soma + d.chats.filter(m => m.personId === person.id).length, 0)) }, { label: 'Tamanho', valor: kb(tamanhoDe(conteudo)) }],
        texto: `Exportando conversas de ${pessoas.map(person => nomeCurto(person)).join(', ')} em ${formato === 'csv' ? 'planilha' : 'Markdown'}.`,
      };
    },
  },
  {
    id: 'cartao-ficha', nome: 'Cartão de apresentação', grupo: 'social', icone: 'IdCard',
    descricao: 'Um resumo limpo da pessoa para reler antes de um encontro, sem abrir a ficha inteira.',
    campos: [{ key: 'pessoa', label: 'Pessoa', type: 'person' }],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa primeiro.' };
      const d = ctx.data;
      const pessoa = buildPersona(person);
      const lembretes = d.reminders.filter(lembrete => lembrete.personId === person.id && !lembrete.concluido);
      const metas = d.goals.filter(meta => meta.personId === person.id && !meta.done);
      const ultimas = d.chats.filter(mensagem => mensagem.personId === person.id).slice(-6);
      const linhas = [
        `${person.nome}${person.apelido ? ` (${person.apelido})` : ''}${idadeDe(person) ? `, ${idadeDe(person)} anos` : ''}`,
        person.descricao,
        person.comoConheceu ? `Como se conheceram: ${person.comoConheceu}` : '',
        person.signo ? `Signo: ${person.signo}` : '',
        person.musicaFavorita ? `Música: ${person.musicaFavorita}` : '',
        person.comportamento ? `Comportamento: ${person.comportamento}` : '',
        `Categoria: ${person.localizacaoOnde || '—'}${person.localizacaoSub ? ` / ${person.localizacaoSub}` : ''} · cidade: ${person.localizacaoMora || '—'}`,
        `Etiquetas: ${person.tags.join(', ') || '—'} · nota ${f1(nota(person))}`,
        `Assuntos que ela puxa: ${pessoa.interesses.map(interesse => interesse.label).join(', ')}`,
        lembretes.length ? `Pendências: ${lembretes.map(lembrete => `${lembrete.titulo} (${diaBr(lembrete.data)})`).join(' · ')}` : '',
        metas.length ? `Metas com ela: ${metas.map(meta => meta.title).join(' · ')}` : '',
        ultimas.length ? `Últimas mensagens: ${ultimas.map(mensagem => `${mensagem.role === 'user' ? 'você' : 'ela'}: ${mensagem.text}`).join(' | ')}` : '',
      ].filter(Boolean);
      return { texto: linhas.join('\n'), itens: [{ title: person.nome, detail: `${pessoa.resumo}`, personId: person.id }] };
    },
  },
  {
    id: 'plano-aproximacao', nome: 'Plano de aproximação em 5 passos', grupo: 'social', icone: 'Compass',
    descricao: 'Um caminho prático da primeira mensagem ao encontro, respeitando o ritmo da relação.',
    campos: [{ key: 'pessoa', label: 'Pessoa', type: 'person' }],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa primeiro.' };
      const { estado, persona, analise } = resumoDoChat(ctx.data, person);
      const estagio = estado.afinidade >= 82 ? 'especial' : estado.afinidade >= 64 ? 'proxima' : estado.afinidade >= 46 ? 'confiante' : estado.afinidade >= 28 ? 'conhecendo' : 'nova';
      const aberturas = sugerirAberturas({ person, persona, state: estado, historico: ctx.data.chats.filter(m => m.personId === person.id), adulto: !!ctx.data.settings.adultMode, quantas: 2 });
      const passo1 = estagio === 'nova' ? 'Primeiro contato: use uma abertura ligada a um interesse real dela. Nada de textão.' : 'Retome o último assunto pendente antes de trazer coisa nova.';
      const passos = [
        { titulo: '1. Abrir bem', texto: `${passo1} Sugestão: "${aberturas[0]?.texto || 'Oi! Como você tá?'}"` },
        { titulo: '2. Devolver o interesse', texto: `Pergunte algo específico sobre ${persona.interesses[0]?.label || 'a rotina dela'} e escute a resposta inteira antes de mudar de assunto.${analise.dela && analise.doUsuario < analise.dela ? ' Você tem falado menos que ela: mantenha esse equilíbrio.' : ''}` },
        { titulo: '3. Criar um ponto em comum', texto: `Traga um programa que combine com o perfil dela (${persona.interesses.map(i => i.label).slice(0, 2).join(' e ')}) e convide sem cobrar resposta imediata.` },
        { titulo: '4. Convidar com clareza', texto: estagio === 'nova' ? 'Espere o segundo ou terceiro papo antes de convidar. Quando convidar, dê duas opções de dia.' : 'Proponha dia, hora e lugar. Convite vago não vira encontro.' },
        { titulo: '5. Cuidar do depois', texto: 'Depois do encontro, registre aqui na ficha o que rolou e marque "Vi hoje". No dia seguinte, mande uma mensagem que cite algo da conversa de vocês.' },
      ];
      return {
        itens: passos.map(passo => ({ title: passo.titulo, detail: passo.texto, personId: person.id })),
        texto: `Plano para ${person.nome} — estágio atual: ${ESTAGIO_LABEL[estagio as Intimidade]} (química ${Math.round(estado.afinidade)}%).\n\n${passos.map(passo => `${passo.titulo}\n${passo.texto}`).join('\n\n')}`,
      };
    },
  },
  {
    id: 'gerador-convite', nome: 'Gerador de convite', grupo: 'social', icone: 'Send',
    descricao: 'Mensagens prontas para chamar para um programa, do tom casual ao provocante (só 18+).',
    campos: [
      { key: 'pessoa', label: 'Pessoa', type: 'person' },
      { key: 'programa', label: 'Programa', type: 'select', default: 'cafe', options: [{ value: 'cafe', label: 'Café' }, { value: 'cinema', label: 'Cinema' }, { value: 'bar', label: 'Bar / música ao vivo' }, { value: 'praia', label: 'Praia ou parque' }, { value: 'jantar', label: 'Jantar' }, { value: 'casa', label: 'Programa em casa' }] },
      { key: 'dia', label: 'Dia sugerido', type: 'text', placeholder: 'Ex.: sábado à tarde' },
      { key: 'aumentar-tom', label: 'Incluir versão provocante (ficha 18+, modo adulto ligado)', type: 'checkbox' },
    ],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa primeiro.' };
      const programa = campo(v, 'programa', 'cafe');
      const dia = campo(v, 'dia') || 'essa semana';
      const programas: Record<string, { nome: string; gancho: string }> = {
        cafe: { nome: 'um café', gancho: 'um lugar tranquilo pra conversar sem pressa' },
        cinema: { nome: 'um filme', gancho: 'a sessão que combina com a gente' },
        bar: { nome: 'um bar com música ao vivo', gancho: 'daqueles lugares com som bom e conversa boa' },
        praia: { nome: 'um programa ao ar livre', gancho: 'pôr do sol, sem pressa e sem barulho' },
        jantar: { nome: 'um jantar', gancho: 'um lugar bom, comida boa e tempo pra conversar' },
        casa: { nome: 'um programa mais reservado', gancho: 'ficar à vontade, longe da muvuca' },
      };
      const escolhido = programas[programa] || programas.cafe;
      const convites = [
        `Oi! ${dia.charAt(0).toUpperCase() + dia.slice(1)}, pensando em ${escolhido.nome} — ${escolhido.gancho}. Topa?`,
        `Tô querendo te ver. Que tal ${escolhido.nome} ${dia}? Eu escolho o lugar se você escolher o horário.`,
        `Fiquei com vontade de aproveitar melhor essa semana. ${escolhido.nome} ${dia} seria uma boa pra gente se ver.`,
        `Sem rodeio: queria te ver. ${escolhido.nome}, ${dia}, se você estiver livre.`,
      ];
      if (marcado(v, 'aumentar-tom') && ctx.data.settings.adultMode && personaAdulta(person)) {
        convites.push(`Se você topar ${escolhido.nome} ${dia}, eu prometo que o clima fica melhor que o do lugar.`);
        convites.push(`Pensei em ${escolhido.nome}, mas confesso que a parte que eu mais quero é te ver de perto.`);
      }
      return {
        itens: convites.map((convite, indice) => ({ title: convite, detail: indice % 2 === 1 ? 'Convite com clima' : 'Convite tranquilo', personId: person.id })),
        texto: `Convites para ${person.nome}:\n\n${convites.map((convite, i) => `${i + 1}. ${convite}`).join('\n')}`,
      };
    },
  },
  {
    id: 'revisor-mensagem', nome: 'Revisor de mensagem', grupo: 'social', icone: 'SearchCheck',
    descricao: 'Aponta textão, cobrança, perguntas demais e erros comuns antes de você apertar enviar.',
    campos: [{ key: 'mensagem', label: 'Sua mensagem', type: 'textarea', placeholder: 'Cole aqui o que você pretende mandar' }],
    run: (v) => {
      const texto = campo(v, 'mensagem');
      if (!texto) return { texto: 'Cole a mensagem que você quer revisar.' };
      const palavras = texto.trim().split(/\s+/).length;
      const perguntas = (texto.match(/\?/g) || []).length;
      const alertas: string[] = [];
      if (palavras > 120) alertas.push(`Está longo (${palavras} palavras). Mensagem grande pesa: corte o que não é essencial.`);
      if (perguntas >= 3) alertas.push(`${perguntas} perguntas de uma vez. Escolha uma e deixe as outras para depois.`);
      if (/\b(por que você não respondeu|você demora|tá me evitando|sumiu|ocupada demais)\b/i.test(texto)) alertas.push('Tom de cobrança detectado. Isso costuma afastar: troque por um simples "oi, tudo bem?".');
      if (/\b(desculpa|foi mal)\b/i.test(texto) && palavras < 12) alertas.push('Pedido de desculpa curto demais pode parecer pouco sincero. Explique em uma frase.');
      if (/(kkk|haha){1,}/i.test(texto) && palavras > 40) alertas.push('Muita risada em textão confunde o tom. Escolha um dos dois.');
      if (/\b(te amo|amo você)\b/i.test(texto) && palavras < 8) alertas.push('Declaração forte e curta pode assustar. Contextualize.');
      if (/[A-ZÀ-Ú]{6,}/.test(texto)) alertas.push('Trechos em CAIXA ALTA parecem grito.');
      if (texto.length > 0 && texto[0] !== texto[0].toUpperCase()) alertas.push('Começar com letra minúscula soa apressado.');
      const erros: [RegExp, string][] = [[/\bmais eu\b/i, '"mais eu" → "mas eu"'], [/\beu vi ele\b/i, '"eu vi ele" → "eu o vi" (ou "eu vi" e o nome)'], [/\bmenas\b/i, '"menas" → "menos"'], [/\bagente\b/i, '"agente" → "a gente"'], [/\bseje\b/i, '"seje" → "seja"'], [/\bpra min\b/i, '"pra min" → "pra mim"'], [/\bderrepente\b/i, '"derrepente" → "de repente"'], [/\bconcerteza\b/i, '"concerteza" → "com certeza"'], [/\btbm\b/i, '"tbm" → "também"']];
      const encontrados = erros.filter(([padrao]) => padrao.test(texto)).map(([, dica]) => dica);
      const versao = {
        curta: palavras > 25 ? texto.split(/(?<=[.!?])\s+/).slice(0, 1).join(' ').slice(0, 140) : texto,
        calorosa: `${texto.replace(/\s+/g, ' ').trim()}${/[.!?]$/.test(texto.trim()) ? '' : '.'} Fiquei pensando em você quando escrevi isso.`,
        leve: `${texto.replace(/\?+/g, '?').replace(/\b(por favor|urgente)\b/gi, '').replace(/\s+/g, ' ').trim()}\n\nSem pressa pra responder, tá?`,
      };
      return {
        estatisticas: [{ label: 'Palavras', valor: milhar(palavras) }, { label: 'Caracteres', valor: milhar(texto.length) }, { label: 'Perguntas', valor: milhar(perguntas) }, { label: 'Alertas', valor: milhar(alertas.length + encontrados.length) }],
        itens: [
          ...alertas.map(alerta => ({ title: alerta })),
          ...encontrados.map(erro => ({ title: '✏️ ' + erro })),
          ...(!alertas.length && !encontrados.length ? [{ title: 'Mensagem limpa! Nada a corrigir.', detail: 'Tom equilibrado, tamanho bom e sem erro comum.' }] : []),
        ],
        texto: [
          alertas.length || encontrados.length ? 'Pontos de atenção:' : 'Tudo certo com a mensagem.',
          ...[...alertas, ...encontrados].map(item => `• ${item}`),
          '', 'Versões alternativas:', `Curta: ${versao.curta}`, `Calorosa: ${versao.calorosa}`, `Leve: ${versao.leve}`,
        ].join('\n'),
      };
    },
  },
  {
    id: 'lembretes-conversa', nome: 'Lembretes de conversa em lote', grupo: 'social', icone: 'Bell',
    descricao: 'Cria lembretes para você falar com quem está parado, espalhados pelos próximos dias.',
    campos: [
      { key: 'dias', label: 'Pessoas sem interação há quantos dias', type: 'number', default: '14', min: 1, max: 365 },
      { key: 'quantos', label: 'Criar quantos lembretes por semana', type: 'number', default: '3', min: 1, max: 30 },
      { key: 'so-favoritas', label: 'Somente favoritas', type: 'checkbox' },
    ],
    perigoso: 'Novos lembretes serão criados no seu calendário. Nada existente é alterado.',
    run: (v, ctx) => {
      const dias = Math.max(1, inteiro(v, 'dias', 14));
      const quantos = Math.max(1, Math.min(30, inteiro(v, 'quantos', 3)));
      const favoritas = marcado(v, 'so-favoritas');
      const alvo = ativos(ctx.data).filter(p => (!favoritas || p.favorite) && Math.floor((Date.now() - Date.parse(p.ultimoVisto || p.updatedAt || p.createdAt)) / 86400000) >= dias).slice(0, quantos);
      if (!alvo.length) return { texto: `Ninguém está há ${dias} dias sem interação${favoritas ? ' entre as favoritas' : ''}. Você está em dia.` };
      const lembretes: Reminder[] = alvo.map((pessoa, indice) => ({ id: generateId(), personId: pessoa.id, titulo: `Falar com ${nomeCurto(pessoa)}`, data: deslocar(hojeIso(), 1 + indice * 2), concluido: false, createdAt: new Date().toISOString(), descricao: `Sem interação desde ${diaBr(pessoa.ultimoVisto || pessoa.updatedAt)}.`, priority: 'normal', repeat: 'none' }));
      ctx.commit(atual => ({ ...atual, reminders: [...atual.reminders, ...lembretes] }), `${lembretes.length} lembrete(s) criado(s).`, true);
      return {
        itens: lembretes.map(lembrete => ({ title: lembrete.titulo, detail: `Marcado para ${diaBr(lembrete.data)}`, personId: lembrete.personId || undefined })),
        texto: `${lembretes.length} lembrete(s) criado(s):\n\n${lembretes.map(lembrete => `• ${lembrete.titulo} — ${diaBr(lembrete.data)}`).join('\n')}`,
        aviso: 'Lembretes de conversa criados.',
      };
    },
  },
  {
    id: 'temas-novos', nome: 'Assuntos que ainda não rolaram', grupo: 'social', icone: 'Brain',
    descricao: 'Sugere temas inéditos e mostra o que vocês já falaram muito, para não repetir papo.',
    campos: [{ key: 'pessoa', label: 'Pessoa', type: 'person' }],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa primeiro.' };
      const { estado, persona, analise, mensagens } = resumoDoChat(ctx.data, person);
      const jaFalados = new Set(Object.keys(estado.topicos));
      const perguntados = new Set(estado.perguntas.map(normalizeText));
      const temas = [
        { id: 'dia', texto: 'O dia de hoje, com detalhes' }, { id: 'trabalho', texto: 'O trabalho dela' }, { id: 'estudo', texto: 'Estudos e planos de curso' },
        { id: 'comida', texto: 'Comida: o que ela cozinha bem' }, { id: 'familia', texto: 'Família e criação' }, { id: 'pet', texto: 'Bichinhos de estimação' },
        { id: 'viagem', texto: 'Viagem dos sonhos' }, { id: 'musica', texto: 'Música que marcou a vida dela' }, { id: 'amor', texto: 'Como ela lida com sentimento' },
        { id: 'treino', texto: 'Rotina de treino e saúde' }, { id: 'clima', texto: 'O tempo e a estação preferida' }, { id: 'futuro', texto: 'Planos para os próximos anos' },
      ];
      const ineditos = temas.filter(tema => !jaFalados.has(tema.id));
      const muitoFalado = analise.temas.slice(0, 3);
      const aberturas = ineditos.slice(0, 5).map(tema => `Sobre ${tema.texto.toLowerCase()}: "Me conta uma coisa — ${tema.texto.toLowerCase()}… o que você faria se pudesse?"`);
      return {
        itens: [
          ...ineditos.slice(0, 8).map(tema => ({ title: tema.texto, detail: 'Ainda não apareceu na conversa de vocês', personId: person.id })),
          ...muitoFalado.map(tema => ({ title: `Já aparece muito: ${tema.tema}`, detail: `${tema.vezes} menções em ${mensagens.length} mensagens` })),
        ],
        texto: [
          `Conversa com ${person.nome}: ${mensagens.length} mensagem(ns) e ${analise.dias} dia(s).`,
          muitoFalado.length ? `Temas mais repetidos: ${muitoFalado.map(tema => `${tema.tema} (${tema.vezes}x)`).join(', ')}.` : 'Ainda não há temas repetidos.',
          '', 'Assuntos inéditos e aberturas prontas:', ...aberturas,
          '', `Assuntos que ela já puxou com você: ${persona.interesses.map(interesse => interesse.label).join(', ')}.`,
          perguntados.size ? `Perguntas que ela já fez: ${[...perguntados].slice(-5).join(' · ')}` : '',
        ].filter(Boolean).join('\n'),
      };
    },
  },
];


// ---------------------------------------------------------------------------
// Grupo 4 — Meu espaço e rotina
// ---------------------------------------------------------------------------

const FERRAMENTAS_PESSOAL: Tool[] = [
  {
    id: 'analise-diario', nome: 'Análise do diário', grupo: 'pessoal', icone: 'BookOpen',
    descricao: 'Humor médio, tendência das últimas semanas, melhores e piores dias e assuntos que se repetem.',
    campos: [{ key: 'dias', label: 'Comparar quantos dias', type: 'number', default: '30', min: 7, max: 365 }],
    run: (v, ctx) => {
      const dias = Math.max(7, inteiro(v, 'dias', 30));
      const entradas = [...ctx.data.journal].sort((a, b) => a.date.localeCompare(b.date));
      if (!entradas.length) return { texto: 'Seu diário ainda está vazio. Registre o primeiro dia em Meu espaço → Diário.' };
      const corte = deslocar(hojeIso(), -dias);
      const recentes = entradas.filter(entrada => entrada.date >= corte);
      const anteriores = entradas.filter(entrada => entrada.date < corte);
      const mediaRecente = media(recentes.map(entrada => entrada.mood));
      const mediaAnterior = media(anteriores.map(entrada => entrada.mood));
      const melhor = [...entradas].sort((a, b) => b.mood - a.mood)[0];
      const pior = [...entradas].sort((a, b) => a.mood - b.mood)[0];
      const tags = new Map<string, number>();
      entradas.forEach(entrada => entrada.tags.forEach(tag => tags.set(tag, (tags.get(tag) || 0) + 1)));
      const sequencia = (() => { let maior = 0, atual = 0, anterior = ''; for (const entrada of entradas) { atual = anterior && deslocar(anterior, 1) === entrada.date ? atual + 1 : 1; maior = Math.max(maior, atual); anterior = entrada.date; } return maior; })();
      const tendencia = mediaAnterior ? (mediaRecente - mediaAnterior) : 0;
      return {
        estatisticas: [
          { label: 'Páginas escritas', valor: milhar(entradas.length) },
          { label: `Humor médio (${dias} dias)`, valor: mediaRecente ? f2(mediaRecente) : '—' },
          { label: 'Humor anterior', valor: mediaAnterior ? f2(mediaAnterior) : '—' },
          { label: 'Tendência', valor: `${tendencia >= 0 ? '+' : ''}${f2(tendencia)}` },
          { label: 'Maior sequência', valor: `${sequencia} dia(s)` },
        ],
        itens: [
          { title: `Melhor dia: ${diaBr(melhor.date)} — ${melhor.title || 'sem título'}`, detail: `Humor ${melhor.mood}/5` },
          { title: `Dia mais difícil: ${diaBr(pior.date)} — ${pior.title || 'sem título'}`, detail: `Humor ${pior.mood}/5` },
          ...[...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, total]) => ({ title: `Etiqueta "${tag}"`, detail: `${total} página(s)` })),
        ],
        texto: [
          `Diário: ${entradas.length} página(s), de ${diaBr(entradas[0].date)} até ${diaBr(entradas[entradas.length - 1].date)}.`,
          `Humor médio geral: ${f2(media(entradas.map(entrada => entrada.mood)))} de 5.`,
          `Últimos ${dias} dias: ${recentes.length} registro(s), média ${recentes.length ? f2(mediaRecente) : '—'}${mediaAnterior ? ` (antes: ${f2(mediaAnterior)} → ${tendencia >= 0 ? 'melhorando' : 'caindo'})` : ''}.`,
          `Melhor dia: ${melhor.title || '—'} (${melhor.mood}/5) · mais difícil: ${pior.title || '—'} (${pior.mood}/5).`,
          tags.size ? `Assuntos mais escritos: ${[...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag).join(', ')}.` : '',
        ].filter(Boolean).join('\n'),
      };
    },
  },
  {
    id: 'prompts-diario', nome: 'Prompts de escrita guiada', grupo: 'pessoal', icone: 'NotebookPen',
    descricao: 'Perguntas para destravar o diário quando você senta e não sabe o que escrever.',
    campos: [
      { key: 'humor', label: 'Como você está agora', type: 'select', default: 'ok', options: [{ value: 'otimo', label: 'Ótimo' }, { value: 'ok', label: 'Mais ou menos' }, { value: 'baixo', label: 'Para baixo' }, { value: 'cansado', label: 'Cansado' }, { value: 'animado', label: 'Animado' }] },
      { key: 'tema', label: 'Tema livre (opcional)', type: 'text', placeholder: 'Ex.: trabalho, família, um encontro' },
    ],
    run: (v) => {
      const humor = campo(v, 'humor', 'ok');
      const tema = campo(v, 'tema');
      const base: Record<string, string[]> = {
        otimo: ['O que exatamente fez seu dia bom? Descreva com detalhes, para poder reler depois.', 'Quem contribuiu para esse dia? Escreva uma frase para essa pessoa.', 'O que você quer repetir amanhã?'],
        ok: ['O que ficou pendente hoje e o que você pode soltar?', 'Qual foi o momento mais calmo do seu dia?', 'O que você está evitando pensar? Escreva sem julgar.'],
        baixo: ['O que pesou mais hoje? Coloque em uma frase, sem culpados.', 'O que você faria por você mesmo se pudesse agora?', 'Qual pequena coisa ainda ficou boa hoje, mesmo pequena?'],
        cansado: ['Onde você gastou mais energia hoje?', 'O que pode sair da sua rotina essa semana?', 'Como seria um dia de descanso perfeito para você?'],
        animado: ['O que você quer começar agora e ainda não começou?', 'Qual ideia tem te empolgado e precisa de um primeiro passo?', 'Quem precisa saber dessas novidades?'],
      };
      const prompts = [
        ...(base[humor] || base.ok),
        ...(tema ? [`O que ${tema} mudou em você nos últimos meses?`, `O que você quer que aconteça com ${tema} daqui a um ano?`, `Quem você quer ao lado quando ${tema} se resolver?`] : []),
        'Escreva três frases começando com "hoje eu percebi que...".',
        'Descreva uma cena do seu dia como se fosse um filme: luz, som, cheiro.',
      ];
      return { itens: prompts.map(prompt => ({ title: prompt })), texto: `Prompts para escrever agora:\n\n${prompts.map((prompt, i) => `${i + 1}. ${prompt}`).join('\n')}` };
    },
  },
  {
    id: 'painel-metas', nome: 'Painel de metas', grupo: 'pessoal', icone: 'Flag',
    descricao: 'Progresso geral, metas atrasadas e o que vale focar nesta semana.',
    campos: [],
    run: (_v, ctx) => {
      const metas = ctx.data.goals;
      if (!metas.length) return { texto: 'Nenhuma meta registrada. Crie metas em Meu espaço → Metas (por exemplo: "ligar para minha mãe no domingo").' };
      const abertas = metas.filter(meta => !meta.done);
      const atrasadas = abertas.filter(meta => meta.due && daysUntil(meta.due) !== null && (daysUntil(meta.due) || 0) < 0);
      const semana = abertas.filter(meta => meta.due && (daysUntil(meta.due) || 0) <= 7);
      const conexao = abertas.filter(meta => meta.kind === 'conexao');
      const concluidas = metas.filter(meta => meta.done);
      const ultimos30 = concluidas.filter(meta => (meta.doneAt || '').slice(0, 10) >= deslocar(hojeIso(), -30));
      return {
        estatisticas: [
          { label: 'Metas abertas', valor: milhar(abertas.length) },
          { label: 'Concluídas', valor: milhar(concluidas.length) },
          { label: 'Progresso', valor: `${metas.length ? Math.round(concluidas.length / metas.length * 100) : 0}%` },
          { label: 'Atrasadas', valor: milhar(atrasadas.length) },
          { label: 'Concluídas em 30 dias', valor: milhar(ultimos30.length) },
        ],
        itens: [
          ...(atrasadas.length ? atrasadas.slice(0, 8).map(meta => ({ title: `Atrasada: ${meta.title}`, detail: `Vencida em ${diaBr(meta.due)}` })) : []),
          ...semana.slice(0, 8).map(meta => ({ title: `${meta.title}`, detail: `Prazo ${diaBr(meta.due)} · ${meta.kind === 'conexao' ? 'meta de conexão' : 'meta pessoal'}` })),
          ...(conexao.length ? [{ title: `${conexao.length} meta(s) de conexão em aberto`, detail: 'Envolvem pessoas do seu catálogo.' }] : []),
        ],
        texto: [
          `Metas: ${abertas.length} aberta(s) de ${metas.length}.`,
          atrasadas.length ? `Atenção: ${atrasadas.length} atrasada(s) — ${atrasadas.slice(0, 5).map(meta => meta.title).join(' · ')}` : 'Nenhuma meta atrasada.',
          semana.length ? `Foco desta semana: ${semana.slice(0, 5).map(meta => `${meta.title} (${diaBr(meta.due)})`).join(' · ')}` : 'Sem prazos para os próximos 7 dias.',
          `Você concluiu ${ultimos30.length} meta(s) nos últimos 30 dias.`,
        ].join('\n'),
      };
    },
  },
  {
    id: 'meu-dia', nome: 'Meu dia em uma tela', grupo: 'pessoal', icone: 'CalendarDays',
    descricao: 'Compromissos de hoje, lembretes vencendo, aniversários e quem você não vê há tempo.',
    campos: [{ key: 'dias', label: 'Olhar quantos dias à frente', type: 'number', default: '7', min: 1, max: 60 }],
    run: (v, ctx) => {
      const d = ctx.data;
      const frente = Math.max(1, inteiro(v, 'dias', 7));
      const hoje = hojeIso();
      const limite = deslocar(hoje, frente);
      const compromissos = d.appointments.filter(item => item.status === 'agendado' && item.date >= hoje && item.date <= limite).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
      const lembretes = d.reminders.filter(item => !item.concluido).sort((a, b) => a.data.localeCompare(b.data));
      const vencidos = lembretes.filter(item => item.data < hoje);
      const doDia = lembretes.filter(item => item.data >= hoje && item.data <= limite);
      const aniversarios = semLixeira(d).map(p => ({ p, faltam: upcomingBirthday(p.aniversario) })).filter(item => item.faltam !== null && (item.faltam || 0) <= frente).sort((a, b) => (a.faltam || 0) - (b.faltam || 0));
      const revisitas = semLixeira(d).filter(p => { const ultimo = p.ultimoVisto || p.updatedAt || p.createdAt; const passados = Math.floor((Date.now() - Date.parse(ultimo)) / 86400000); return passados >= (d.settings.revisitAfterDays || 14); }).sort((a, b) => (a.ultimoVisto || '').localeCompare(b.ultimoVisto || ''));
      const itens = [
        ...compromissos.map(item => {
          const acompanhante = semLixeira(d).find(p => p.id === item.personId);
          const comQuem = acompanhante ? ` · com ${nomeCurto(acompanhante)}` : '';
          const onde = item.place ? ` · ${item.place}` : '';
          return { title: `${item.time} — ${item.title}`, detail: `${diaBr(item.date)}${onde}${comQuem}`, personId: item.personId || undefined };
        }),
        ...vencidos.slice(0, 8).map(item => ({ title: `Lembrete vencido: ${item.titulo}`, detail: `Era para ${diaBr(item.data)}`, personId: item.personId || undefined })),
        ...doDia.slice(0, 8).map(item => ({ title: `${item.titulo}`, detail: `Lembrete para ${diaBr(item.data)}`, personId: item.personId || undefined })),
        ...aniversarios.map(item => ({ title: `Aniversário de ${nomeCurto(item.p)}`, detail: item.faltam === 0 ? 'É hoje!' : `Faltam ${item.faltam} dia(s)`, personId: item.p.id })),
        ...revisitas.slice(0, 6).map(p => ({ title: `Faz tempo que você não vê ${nomeCurto(p)}`, detail: `Última interação em ${diaBr(p.ultimoVisto || p.updatedAt)}`, personId: p.id })),
      ];
      const linhas = [
        `MEU DIA — ${diaBr(hoje)}`,
        '', `Compromissos (${compromissos.length}):`, ...compromissos.slice(0, 10).map(item => `• ${diaBr(item.date)} às ${item.time} — ${item.title}${item.place ? ` (${item.place})` : ''}`),
        '', vencidos.length ? `Lembretes vencidos (${vencidos.length}):` : 'Nenhum lembrete vencido.', ...vencidos.slice(0, 6).map(item => `• ${item.titulo} (era ${diaBr(item.data)})`),
        '', doDia.length ? `Lembretes dos próximos ${frente} dias:` : '', ...doDia.slice(0, 6).map(item => `• ${item.titulo} — ${diaBr(item.data)}`),
        '', aniversarios.length ? 'Aniversários chegando:' : 'Sem aniversários no período.', ...aniversarios.map(item => `• ${item.p.nome}: ${item.faltam === 0 ? 'hoje' : `em ${item.faltam} dia(s)`}`),
        '', revisitas.length ? `Revisitas sugeridas: ${revisitas.slice(0, 6).map(p => nomeCurto(p)).join(', ')}` : 'Você está em dia com todo mundo.',
      ].filter(linha => linha !== undefined);
      return { itens, texto: linhas.join('\n') };
    },
  },
  {
    id: 'pomodoro', nome: 'Modo foco (25 + 5)', grupo: 'pessoal', icone: 'Timer',
    descricao: 'Um ciclo clássico de concentração e pausa, com contagem na tela e aviso no fim.',
    campos: [],
    special: 'pomodoro',
    run: () => ({ special: 'pomodoro', texto: 'Ciclo clássico: 25 minutos de foco, 5 de pausa. A cada quatro ciclos, faça uma pausa longa de 15 a 30 minutos. Use o cronômetro abaixo e deixe o celular longe.' }),
  },
  {
    id: 'temporizador', nome: 'Cronômetro e temporizador', grupo: 'pessoal', icone: 'Hourglass',
    descricao: 'Contagem para qualquer coisa: cozinhar, alongar, meditar ou tomar um café sem pressa.',
    campos: [{ key: 'minutos', label: 'Minutos', type: 'number', default: '10', min: 1, max: 180 }],
    special: 'temporizador',
    run: v => ({ special: 'temporizador', texto: `Temporizador de ${Math.max(1, inteiro(v, 'minutos', 10))} minuto(s). Ele toca o alarme do sistema quando chegar a zero.` }),
  },
  {
    id: 'metas-conexao', nome: 'Gerar metas de conexão', grupo: 'pessoal', icone: 'HeartHandshake',
    descricao: 'Transforma "preciso falar com ela" em metas com prazo, para o app cobrar você depois.',
    campos: [
      { key: 'dias', label: 'Sem interação há quantos dias', type: 'number', default: '21', min: 1, max: 365 },
      { key: 'limite', label: 'Criar no máximo quantas metas', type: 'number', default: '5', min: 1, max: 30 },
      { key: 'prazo', label: 'Prazo em quantos dias', type: 'number', default: '10', min: 1, max: 180 },
    ],
    perigoso: 'Novas metas de conexão serão criadas na lista de metas. Nada existente é alterado.',
    run: (v, ctx) => {
      const dias = Math.max(1, inteiro(v, 'dias', 21));
      const limite = Math.max(1, inteiro(v, 'limite', 5));
      const prazo = Math.max(1, inteiro(v, 'prazo', 10));
      const alvo = ativos(ctx.data).filter(p => Math.floor((Date.now() - Date.parse(p.ultimoVisto || p.updatedAt || p.createdAt)) / 86400000) >= dias).sort((a, b) => (a.ultimoVisto || '').localeCompare(b.ultimoVisto || '')).slice(0, limite);
      if (!alvo.length) return { texto: `Ninguém sem interação há ${dias} dias. Suas conexões estão em dia.` };
      const metas = alvo.map(p => ({ id: generateId(), title: `Falar com ${nomeCurto(p)}`, done: false, personId: p.id, due: deslocar(hojeIso(), prazo), kind: 'conexao' as const, createdAt: new Date().toISOString() }));
      ctx.commit(atual => ({ ...atual, goals: [...atual.goals, ...metas] }), `${metas.length} meta(s) de conexão criada(s).`, true);
      return {
        itens: metas.map(meta => ({ title: meta.title, detail: `Até ${diaBr(meta.due)}`, personId: meta.personId || undefined })),
        texto: `${metas.length} meta(s) criada(s) com prazo até ${diaBr(deslocar(hojeIso(), prazo))}:\n\n${metas.map(meta => `• ${meta.title}`).join('\n')}`,
        aviso: 'Metas de conexão criadas.',
      };
    },
  },
  {
    id: 'resumo-semanal', nome: 'Resumo semanal do meu espaço', grupo: 'pessoal', icone: 'Newspaper',
    descricao: 'Um texto pronto para reler no domingo: o que você viveu, escreveu, marcou e concluiu.',
    campos: [{ key: 'semanas', label: 'Quantas semanas atrás', type: 'number', default: '1', min: 1, max: 12 }],
    run: (v, ctx) => {
      const d = ctx.data;
      const semanas = Math.max(1, inteiro(v, 'semanas', 1));
      const inicio = deslocar(hojeIso(), -7 * semanas);
      const fim = deslocar(hojeIso(), -7 * (semanas - 1));
      const noPeriodo = (data?: string | null) => !!data && data.slice(0, 10) >= inicio && data.slice(0, 10) <= fim;
      const diario = d.journal.filter(entrada => noPeriodo(entrada.date));
      const interacoes = d.activity.filter(item => noPeriodo(item.data));
      const metasConcluidas = d.goals.filter(meta => noPeriodo(meta.doneAt));
      const compromissos = d.appointments.filter(item => noPeriodo(item.date));
      const novasPessoas = semLixeira(d).filter(p => noPeriodo(p.createdAt));
      const tags = new Map<string, number>();
      diario.forEach(entrada => entrada.tags.forEach(tag => tags.set(tag, (tags.get(tag) || 0) + 1)));
      return {
        estatisticas: [
          { label: 'Páginas no diário', valor: milhar(diario.length) },
          { label: 'Humor médio', valor: diario.length ? f2(media(diario.map(entrada => entrada.mood))) : '—' },
          { label: 'Interações registradas', valor: milhar(interacoes.length) },
          { label: 'Metas concluídas', valor: milhar(metasConcluidas.length) },
          { label: 'Compromissos', valor: milhar(compromissos.length) },
        ],
        texto: [
          `SEMANA DE ${diaBr(inicio)} A ${diaBr(fim)}`,
          '',
          `Você escreveu ${diario.length} página(s) no diário${diario.length ? ` com humor médio ${f2(media(diario.map(entrada => entrada.mood)))} de 5` : ''}.`,
          `Foram ${interacoes.length} registro(s) de atividade no catálogo.`,
          novasPessoas.length ? `Fichas novas: ${novasPessoas.map(p => p.nome).join(', ')}.` : 'Nenhuma ficha nova no período.',
          metasConcluidas.length ? `Metas concluídas: ${metasConcluidas.map(meta => meta.title).join(' · ')}.` : 'Nenhuma meta concluída — escolha uma só para a próxima semana.',
          compromissos.length ? `Compromissos: ${compromissos.map(item => `${item.title} (${diaBr(item.date)})`).join(' · ')}.` : 'Agenda livre no período.',
          tags.size ? `Assuntos do diário: ${[...tags.keys()].join(', ')}.` : '',
          '', 'Para a próxima semana: escolha uma pessoa, uma meta e um hábito. Só isso.',
        ].filter(Boolean).join('\n'),
      };
    },
  },
];


// ---------------------------------------------------------------------------
// Grupo 5 — Utilidades do dia a dia
// ---------------------------------------------------------------------------

const FERRAMENTAS_UTEIS: Tool[] = [
  {
    id: 'dividir-conta', nome: 'Dividir a conta', grupo: 'utilidades', icone: 'Receipt',
    descricao: 'Racha o valor entre as pessoas, com gorjeta e opção de arredondar.',
    campos: [
      { key: 'total', label: 'Valor total (R$)', type: 'number', default: '180', min: 0 },
      { key: 'pessoas', label: 'Quantas pessoas', type: 'number', default: '4', min: 1, max: 100 },
      { key: 'gorjeta', label: 'Gorjeta (%)', type: 'number', default: '10', min: 0, max: 100 },
      { key: 'arredondar', label: 'Arredondar para cima (real inteiro)', type: 'checkbox' },
    ],
    run: v => {
      const total = numero(v, 'total', 0);
      const pessoas = Math.max(1, inteiro(v, 'pessoas', 1));
      const gorjeta = numero(v, 'gorjeta', 10);
      const comGorjeta = total * (1 + gorjeta / 100);
      const bruto = comGorjeta / pessoas;
      const porPessoa = marcado(v, 'arredondar') ? Math.ceil(bruto) : bruto;
      const arrecadado = porPessoa * pessoas;
      return {
        estatisticas: [
          { label: 'Total com gorjeta', valor: moeda(comGorjeta) },
          { label: 'Gorjeta', valor: moeda(comGorjeta - total) },
          { label: 'Por pessoa', valor: moeda(porPessoa) },
          { label: 'Sobra do arredondamento', valor: moeda(Math.max(0, arrecadado - comGorjeta)) },
        ],
        texto: `Conta de ${moeda(total)} para ${pessoas} pessoa(s), com ${f1(gorjeta)}% de gorjeta.\n\nTotal: ${moeda(comGorjeta)}\nCada pessoa paga: ${moeda(porPessoa)}${marcado(v, 'arredondar') ? ' (arredondado para cima)' : ''}\nSe cada um der ${moeda(porPessoa)}, o total vira ${moeda(arrecadado)}.`,
      };
    },
  },
  {
    id: 'porcentagem', nome: 'Porcentagem e desconto', grupo: 'utilidades', icone: 'Percent',
    descricao: 'Desconto, acréscimo, quanto representa uma parte e qual foi o aumento real.',
    campos: [
      { key: 'valor', label: 'Valor (R$)', type: 'number', default: '250', min: 0 },
      { key: 'porcentagem', label: 'Porcentagem (%)', type: 'number', default: '20' },
      { key: 'modo', label: 'O que calcular', type: 'select', default: 'desconto', options: [{ value: 'desconto', label: 'Aplicar desconto' }, { value: 'acrescimo', label: 'Aplicar acréscimo' }, { value: 'parte', label: 'Quanto é essa parte do valor' }, { value: 'variacao', label: 'Variação entre dois valores' }] },
      { key: 'valor-final', label: 'Valor final (só para variação)', type: 'number', default: '0', min: 0 },
    ],
    run: v => {
      const valor = numero(v, 'valor', 0);
      const porcentagem = numero(v, 'porcentagem', 0);
      const modo = campo(v, 'modo', 'desconto');
      if (modo === 'variacao') {
        const final = numero(v, 'valor-final', 0);
        const variacao = valor ? ((final - valor) / valor) * 100 : 0;
        return { texto: `De ${moeda(valor)} para ${moeda(final)}.\n\nVariação: ${variacao >= 0 ? '+' : ''}${f2(variacao)}% (${variacao >= 0 ? 'aumento' : 'redução'} de ${moeda(Math.abs(final - valor))}).` };
      }
      if (modo === 'parte') return { texto: `${f1(porcentagem)}% de ${moeda(valor)} é ${moeda(valor * porcentagem / 100)}.` };
      const resultado = modo === 'desconto' ? valor * (1 - porcentagem / 100) : valor * (1 + porcentagem / 100);
      return {
        estatisticas: [
          { label: modo === 'desconto' ? 'Você economiza' : 'Você paga a mais', valor: moeda(Math.abs(valor - resultado)) },
          { label: 'Valor final', valor: moeda(resultado) },
        ],
        texto: `Valor original: ${moeda(valor)}\n${modo === 'desconto' ? 'Desconto' : 'Acréscimo'} de ${f1(porcentagem)}%: ${moeda(Math.abs(valor - resultado))}\nValor final: ${moeda(resultado)}`,
      };
    },
  },
  {
    id: 'conversor-medidas', nome: 'Conversor de medidas', grupo: 'utilidades', icone: 'Ruler',
    descricao: 'Comprimento, massa, temperatura, velocidade e volume, sem precisar de outro app.',
    campos: [
      { key: 'valor', label: 'Valor', type: 'number', default: '1' },
      { key: 'de', label: 'De', type: 'select', default: 'cm', options: [{ value: 'cm', label: 'Centímetros' }, { value: 'm', label: 'Metros' }, { value: 'km', label: 'Quilômetros' }, { value: 'pol', label: 'Polegadas' }, { value: 'pes', label: 'Pés' }, { value: 'kg', label: 'Quilos' }, { value: 'g', label: 'Gramas' }, { value: 'lb', label: 'Libras' }, { value: 'c', label: 'Celsius' }, { value: 'f', label: 'Fahrenheit' }, { value: 'l', label: 'Litros' }, { value: 'ml', label: 'Mililitros' }, { value: 'gal', label: 'Galões (EUA)' }] },
    ],
    run: v => {
      const valor = numero(v, 'valor', 0);
      const de = campo(v, 'de', 'cm');
      // Converte tudo para a unidade base do grupo e mostra as vizinhas.
      const grupos: Record<string, { base: string; fatores: Record<string, number> }> = {
        comprimento: { base: 'm', fatores: { cm: 0.01, m: 1, km: 1000, pol: 0.0254, pes: 0.3048 } },
        massa: { base: 'kg', fatores: { kg: 1, g: 0.001, lb: 0.45359237 } },
        volume: { base: 'l', fatores: { l: 1, ml: 0.001, gal: 3.785411784 } },
      };
      const grupo = de === 'c' || de === 'f' ? 'temperatura' : Object.values(grupos).find(item => item.fatores[de]) ? Object.keys(grupos).find(chave => grupos[chave].fatores[de])! : 'comprimento';
      if (grupo === 'temperatura') {
        const celsius = de === 'c' ? valor : (valor - 32) * 5 / 9;
        const fahrenheit = celsius * 9 / 5 + 32;
        return {
          estatisticas: [{ label: 'Celsius', valor: `${f1(celsius)} °C` }, { label: 'Fahrenheit', valor: `${f1(fahrenheit)} °F` }, { label: 'Kelvin', valor: `${f1(celsius + 273.15)} K` }],
          texto: `${f1(valor)} °${de.toUpperCase()} = ${f1(celsius)} °C = ${f1(fahrenheit)} °F`,
        };
      }
      const { fatores } = grupos[grupo];
      const emBase = valor * (fatores[de] || 1);
      const linhas = Object.entries(fatores).map(([unidade, fator]) => `• ${f1(valor)} ${de} = ${f2(emBase / fator)} ${unidade}`);
      return { itens: Object.entries(fatores).map(([unidade, fator]) => ({ title: `${f2(emBase / fator)} ${unidade}`, detail: `${f1(valor)} ${de}` })), texto: `Conversão (${grupo}):\n\n${linhas.join('\n')}` };
    },
  },
  {
    id: 'conversor-datas', nome: 'Contas com datas', grupo: 'utilidades', icone: 'CalendarClock',
    descricao: 'Idade exata, dias entre datas, dias úteis e dia da semana.',
    campos: [
      { key: 'inicio', label: 'Data inicial', type: 'date', default: '' },
      { key: 'fim', label: 'Data final (vazio = hoje)', type: 'date', default: '' },
    ],
    run: v => {
      const inicio = campo(v, 'inicio') || hojeIso();
      const fim = campo(v, 'fim') || hojeIso();
      const a = new Date(`${inicio}T12:00:00`);
      const b = new Date(`${fim}T12:00:00`);
      if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return { texto: 'Datas inválidas. Use o campo de data para escolher.' };
      const dias = Math.round((b.getTime() - a.getTime()) / 86400000);
      let anos = b.getFullYear() - a.getFullYear();
      let meses = b.getMonth() - a.getMonth();
      let diasRestantes = b.getDate() - a.getDate();
      if (diasRestantes < 0) { meses -= 1; diasRestantes += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
      if (meses < 0) { anos -= 1; meses += 12; }
      const uteis = (() => {
        const sinal = dias >= 0 ? 1 : -1; const total = Math.abs(dias);
        let contador = 0;
        for (let i = 0; i < total; i++) { const dia = new Date(a.getTime() + sinal * i * 86400000).getDay(); if (dia !== 0 && dia !== 6) contador++; }
        return contador;
      })();
      const semana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      return {
        estatisticas: [
          { label: 'Dias corridos', valor: milhar(Math.abs(dias)) },
          { label: 'Dias úteis', valor: milhar(uteis) },
          { label: 'Semanas', valor: f1(Math.abs(dias) / 7) },
          { label: 'Meses (aprox.)', valor: f1(Math.abs(dias) / 30.44) },
        ],
        texto: [
          `De ${diaBr(inicio)} até ${diaBr(fim)}:`,
          `${Math.abs(dias)} dia(s) ${dias >= 0 ? 'à frente' : 'atrás'}, sendo ${uteis} dia(s) útil(eis).`,
          `Idade/intervalo exato: ${anos > 0 ? `${anos} ano(s), ` : ''}${meses} mês(es) e ${Math.abs(diasRestantes)} dia(s).`,
          `${diaBr(inicio)} caiu em uma ${semana[a.getDay()]} e ${diaBr(fim)} em uma ${semana[b.getDay()]}.`,
        ].join('\n'),
      };
    },
  },
  {
    id: 'gerador-senha', nome: 'Gerador de senha forte', grupo: 'utilidades', icone: 'KeyRound',
    descricao: 'Cria senhas e frases-senha com medida de força, geradas no seu aparelho.',
    campos: [
      { key: 'tamanho', label: 'Tamanho', type: 'number', default: '18', min: 8, max: 64 },
      { key: 'simbolos', label: 'Incluir símbolos (!@#…)', type: 'checkbox', default: '1' },
      { key: 'numeros', label: 'Incluir números', type: 'checkbox', default: '1' },
      { key: 'palavras', label: 'Gerar frase-senha (3 palavras + números)', type: 'checkbox' },
    ],
    run: v => {
      const tamanho = Math.max(8, Math.min(64, inteiro(v, 'tamanho', 18)));
      const usarSimbolos = marcado(v, 'simbolos', true);
      const usarNumeros = marcado(v, 'numeros', true);
      const alfabeto = `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ${usarSimbolos ? '!@#$%&*()-_=+' : ''}${usarNumeros ? '23456789' : ''}`;
      const sortear = (fonte: string) => fonte[Math.floor(Math.random() * fonte.length)];
      const senha = Array.from({ length: tamanho }, () => sortear(alfabeto)).join('');
      const palavras = ['cafe', 'praia', 'livro', 'janela', 'estrada', 'lua', 'violao', 'cidade', 'verao', 'caneca', 'trilha', 'farol', 'manga', 'cachoeira', 'domingo', 'sanfona', 'caderno', 'brisa'];
      const embaralhadas = [...palavras].sort(() => Math.random() - 0.5).slice(0, 3);
      const frase = `${embaralhadas.join('-')}-${Math.floor(Math.random() * 90 + 10)}`;
      const entropia = Math.round(tamanho * Math.log2(alfabeto.length));
      const escolhida = marcado(v, 'palavras') ? frase : senha;
      const forca = escolhida.length >= 20 ? 'muito forte' : escolhida.length >= 14 ? 'forte' : escolhida.length >= 10 ? 'média' : 'fraca';
      return {
        estatisticas: [{ label: 'Força', valor: forca }, { label: 'Entropia estimada', valor: `${entropia} bits` }, { label: 'Caracteres', valor: milhar(escolhida.length) }],
        itens: [{ title: senha, detail: `Senha aleatória de ${tamanho} caracteres` }, { title: frase, detail: 'Frase-senha fácil de lembrar' }],
        texto: `Senha gerada: ${escolhida}\n\nForça: ${forca} · entropia de aproximadamente ${entropia} bits.\nAlternativas:\n• ${senha}\n• ${frase}\n\nDica: guarde no gerenciador de senhas do seu navegador, nunca em uma nota comum.`,
      };
    },
  },
  {
    id: 'link-whatsapp', nome: 'Link de WhatsApp com mensagem', grupo: 'utilidades', icone: 'Link',
    descricao: 'Monta o link wa.me com a mensagem já escrita, pronto para abrir ou compartilhar.',
    campos: [
      { key: 'telefone', label: 'Telefone com DDD e país', type: 'text', default: '5511999999999', placeholder: '5511999999999' },
      { key: 'mensagem', label: 'Mensagem', type: 'textarea', placeholder: 'Oi! Tudo bem?' },
    ],
    run: v => {
      const telefone = campo(v, 'telefone').replace(/\D/g, '');
      const mensagem = campo(v, 'mensagem') || 'Oi! Tudo bem?';
      if (telefone.length < 10) return { texto: 'Informe o telefone com DDD. Para números do Brasil, comece com 55.' };
      const link = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
      return {
        itens: [{ title: link, detail: 'Abra no celular para iniciar a conversa.' }],
        texto: `Link pronto:\n\n${link}\n\nMensagem: ${mensagem}`,
        aviso: 'Link gerado. Toque nele para copiar ou abrir.',
      };
    },
  },
  {
    id: 'formatador-texto', nome: 'Formatador de texto', grupo: 'utilidades', icone: 'TextCursorInput',
    descricao: 'Primeira letra maiúscula, minúsculas, remover acentos, limpar espaços e inverter.',
    campos: [
      { key: 'texto', label: 'Texto', type: 'textarea', placeholder: 'Cole o texto aqui' },
      { key: 'modo', label: 'O que fazer', type: 'select', default: 'frase', options: [{ value: 'frase', label: 'Primeira letra de cada frase em maiúscula' }, { value: 'titulo', label: 'Formato de título' }, { value: 'maiusculas', label: 'MAIÚSCULAS' }, { value: 'minusculas', label: 'minúsculas' }, { value: 'acentos', label: 'Remover acentos' }, { value: 'espacos', label: 'Limpar espaços e linhas extras' }, { value: 'inverter', label: 'Inverter palavras' }] },
    ],
    run: v => {
      const texto = campo(v, 'texto');
      if (!texto) return { texto: 'Cole um texto para formatar.' };
      const modo = campo(v, 'modo', 'frase');
      const transformado = (() => {
        if (modo === 'titulo') return texto.toLowerCase().split(' ').map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1)).join(' ');
        if (modo === 'maiusculas') return texto.toUpperCase();
        if (modo === 'minusculas') return texto.toLowerCase();
        if (modo === 'acentos') return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (modo === 'espacos') return texto.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').split('\n').map(linha => linha.trim()).join('\n').trim();
        if (modo === 'inverter') return texto.split(/\s+/).reverse().join(' ');
        return texto.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (_todo, prefixo: string, letra: string) => prefixo + letra.toUpperCase());
      })();
      return {
        estatisticas: [{ label: 'Caracteres antes', valor: milhar(texto.length) }, { label: 'Caracteres depois', valor: milhar(transformado.length) }, { label: 'Palavras', valor: milhar(transformado.split(/\s+/).filter(Boolean).length) }],
        texto: transformado,
      };
    },
  },
  {
    id: 'sorteador-pessoas', nome: 'Sorteador de pessoas', grupo: 'utilidades', icone: 'Dices',
    descricao: 'Sortear alguém do catálogo com filtros de nota, categoria, etiqueta ou favoritas.',
    campos: [
      { key: 'regra', label: 'Filtro', type: 'select', default: 'nota', options: REGRAS_LOTE },
      { key: 'valor', label: 'Valor do filtro', type: 'text', placeholder: 'Ex.: 4' },
      { key: 'quantos', label: 'Sortear quantas', type: 'number', default: '1', min: 1, max: 20 },
      { key: 'registrar', label: 'Registrar "Vi hoje" nos sorteados', type: 'checkbox' },
    ],
    run: (v, ctx) => {
      const quantos = Math.max(1, inteiro(v, 'quantos', 1));
      const candidatos = selecionar(ctx.data, campo(v, 'regra', 'nota'), campo(v, 'valor'));
      if (!candidatos.length) return { texto: 'Ninguém atende a esse filtro. Tente outro valor.' };
      const sorteados = [...candidatos].sort(() => Math.random() - 0.5).slice(0, quantos);
      if (marcado(v, 'registrar')) ctx.commit(atual => ({ ...atual, people: atual.people.map(p => sorteados.some(item => item.id === p.id) ? { ...p, ultimoVisto: hojeIso(), viHojeCount: p.viHojeCount + 1, viHojeDates: [...p.viHojeDates, hojeIso()] } : p) }), 'Interação registrada nos sorteados.', true);
      return {
        itens: sorteados.map(p => ({ title: p.nome, detail: `Nota ${f1(nota(p))} · ${p.localizacaoOnde || 'sem categoria'}`, personId: p.id })),
        texto: `Sorteio entre ${candidatos.length} ficha(s):\n\n${sorteados.map(p => `• ${p.nome}`).join('\n')}`,
        aviso: `Sorteado: ${sorteados.map(p => nomeCurto(p)).join(', ')}`,
      };
    },
  },
  {
    id: 'sortear-ordem', nome: 'Sortear uma ordem', grupo: 'utilidades', icone: 'Shuffle',
    descricao: 'Embaralha uma lista de nomes colada por vírgula ou linha — ideal para filas, times e sorteios.',
    campos: [
      { key: 'lista', label: 'Nomes ou itens', type: 'textarea', placeholder: 'Ana, Bruno, Carla\nDiego' },
      { key: 'times', label: 'Dividir em quantos times (0 = só a ordem)', type: 'number', default: '0', min: 0, max: 20 },
    ],
    run: v => {
      const itens = campo(v, 'lista').split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
      if (!itens.length) return { texto: 'Cole uma lista de nomes para sortear.' };
      const embaralhados = [...itens].sort(() => Math.random() - 0.5);
      const times = Math.min(20, inteiro(v, 'times', 0));
      if (times >= 2) {
        const grupos = Array.from({ length: times }, () => [] as string[]);
        embaralhados.forEach((item, indice) => grupos[indice % times].push(item));
        return {
          itens: grupos.map((grupo, indice) => ({ title: `Time ${indice + 1}`, detail: grupo.join(', ') })),
          texto: `Divisão em ${times} time(s):\n\n${grupos.map((grupo, indice) => `Time ${indice + 1}: ${grupo.join(', ')}`).join('\n')}`,
        };
      }
      return { itens: embaralhados.map((item, indice) => ({ title: `${indice + 1}º — ${item}` })), texto: `Ordem sorteada (${itens.length} itens):\n\n${embaralhados.map((item, indice) => `${indice + 1}. ${item}`).join('\n')}` };
    },
  },
  {
    id: 'checklist-nota', nome: 'Checklist que vira nota', grupo: 'utilidades', icone: 'SquareCheckBig',
    descricao: 'Monte uma lista de compras ou de tarefas e salve como nota geral do catálogo.',
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', default: 'Lista rápida' },
      { key: 'itens', label: 'Itens (um por linha)', type: 'textarea', placeholder: 'Café\nPão\nFrutas' },
      { key: 'tipo', label: 'Tipo de nota', type: 'select', default: 'lembrete', options: [{ value: 'lembrete', label: 'Lembrete' }, { value: 'ideia', label: 'Ideia' }, { value: 'observacao', label: 'Observação' }, { value: 'referencia', label: 'Referência' }] },
      { key: 'salvar', label: 'Salvar como nota geral', type: 'checkbox', default: '1' },
    ],
    perigoso: 'Uma nota geral nova será criada com os itens digitados.',
    run: (v, ctx) => {
      const titulo = campo(v, 'titulo', 'Lista rápida');
      const itens = campo(v, 'itens').split('\n').map(item => item.trim()).filter(Boolean);
      if (!itens.length) return { texto: 'Escreva pelo menos um item.' };
      const conteudo = itens.map(item => `- [ ] ${item}`).join('\n');
      if (marcado(v, 'salvar', true)) {
        const notaGeral: GeneralNote = { id: generateId(), title: titulo, content: conteudo, type: campo(v, 'tipo', 'lembrete') as GeneralNote['type'], personIds: [], folderId: null, pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        ctx.commit(atual => ({ ...atual, generalNotes: [notaGeral, ...atual.generalNotes] }), 'Nota criada com o checklist.', true);
      }
      return {
        itens: itens.map(item => ({ title: item })),
        texto: `${titulo}\n\n${conteudo}`,
        aviso: marcado(v, 'salvar', true) ? 'Checklist salvo nas notas gerais.' : undefined,
      };
    },
  },
  {
    id: 'busca-profunda', nome: 'Busca profunda em tudo', grupo: 'utilidades', icone: 'ScanSearch',
    descricao: 'Procura um termo em fichas, notas, histórias, diário, conversas, lembretes e pastas de uma vez.',
    campos: [{ key: 'termo', label: 'O que procurar', type: 'text', placeholder: 'Ex.: praia' }],
    run: (v, ctx) => {
      const termo = normalizeText(campo(v, 'termo'));
      if (termo.length < 2) return { texto: 'Escreva pelo menos duas letras para buscar.' };
      const d = ctx.data;
      const achados: ToolItem[] = [];
      const contem = (texto?: string | null) => !!texto && normalizeText(texto).includes(termo);
      semLixeira(d).forEach(p => {
        const campos = [p.nome, p.apelido, p.descricao, p.comportamento, p.observacoesGerais, p.descricaoCorporal, p.comoConheceu, p.musicaFavorita, p.signo, p.localizacaoMora, p.redesSociais, p.tags.join(' '), ...(p.customFields || []).map(f => `${f.label} ${f.value}`), ...p.notas.map(n => `${n.title} ${n.content}`)];
        if (campos.some(contem)) achados.push({ title: `Ficha: ${p.nome}`, detail: campos.find(contem)?.slice(0, 90), personId: p.id });
      });
      d.generalNotes.forEach(nota => { if (contem(`${nota.title} ${nota.content}`)) achados.push({ title: `Nota: ${nota.title}`, detail: nota.content.slice(0, 90), page: 'notes' }); });
      d.stories.forEach(historia => { if (contem(`${historia.titulo} ${historia.conteudo}`)) achados.push({ title: `História: ${historia.titulo}`, detail: `com ${d.people.find(p => p.id === historia.personId)?.nome || 'ninguém'}`, page: 'stories' }); });
      d.journal.forEach(entrada => { if (contem(`${entrada.title} ${entrada.content}`)) achados.push({ title: `Diário: ${entrada.title || diaBr(entrada.date)}`, detail: entrada.content.slice(0, 90), page: 'myspace' }); });
      d.chats.forEach(mensagem => { if (contem(mensagem.text)) achados.push({ title: `Conversa com ${d.people.find(p => p.id === mensagem.personId)?.nome || 'alguém'}`, detail: mensagem.text.slice(0, 90), personId: mensagem.personId }); });
      d.reminders.forEach(lembrete => { if (contem(`${lembrete.titulo} ${lembrete.descricao || ''}`)) achados.push({ title: `Lembrete: ${lembrete.titulo}`, detail: diaBr(lembrete.data), page: 'reminders' }); });
      d.folders.forEach(pasta => { if (contem(pasta.name) || contem(pasta.description)) achados.push({ title: `Pasta: ${pasta.name}`, detail: pasta.description, page: 'folders' }); });
      d.tierLists.forEach(lista => { if (contem(lista.nome)) achados.push({ title: `Tierlist: ${lista.nome}`, detail: '', page: 'tierlists' }); });
      d.appointments.forEach(item => { if (contem(`${item.title} ${item.place} ${item.notes}`)) achados.push({ title: `Compromisso: ${item.title}`, detail: `${diaBr(item.date)} · ${item.place}`, page: 'agenda' }); });
      if (!achados.length) return { texto: `Nada encontrado para "${campo(v, 'termo')}". Tente uma palavra mais curta ou só parte dela.` };
      const porTipo = new Map<string, number>();
      achados.forEach(item => { const tipo = item.title.split(':')[0]; porTipo.set(tipo, (porTipo.get(tipo) || 0) + 1); });
      return {
        estatisticas: [...porTipo.entries()].map(([tipo, total]) => ({ label: tipo, valor: milhar(total) })),
        itens: achados.slice(0, 40),
        texto: `${achados.length} resultado(s) para "${campo(v, 'termo')}":\n\n${achados.slice(0, 25).map(item => `• ${item.title}${item.detail ? ` — ${item.detail}` : ''}`).join('\n')}${achados.length > 25 ? `\n… e mais ${achados.length - 25}.` : ''}`,
      };
    },
  },
  {
    id: 'contador-texto', nome: 'Contador de texto', grupo: 'utilidades', icone: 'Hash',
    descricao: 'Palavras, caracteres, frases e tempo de leitura ou de fala do seu texto.',
    campos: [{ key: 'texto', label: 'Texto', type: 'textarea', placeholder: 'Cole ou escreva o texto' }],
    run: v => {
      const texto = campo(v, 'texto');
      if (!texto) return { texto: 'Cole um texto para contar.' };
      const palavras = texto.trim().split(/\s+/).filter(Boolean);
      const frases = texto.split(/[.!?…]+/).map(frase => frase.trim()).filter(Boolean).length;
      const paragrafos = texto.split(/\n{2,}/).map(item => item.trim()).filter(Boolean).length;
      const minutosLeitura = palavras.length / 200;
      const minutosFala = palavras.length / 140;
      const maisLonga = [...palavras].sort((a, b) => b.length - a.length)[0] || '';
      return {
        estatisticas: [
          { label: 'Palavras', valor: milhar(palavras.length) },
          { label: 'Caracteres', valor: milhar(texto.length) },
          { label: 'Caracteres sem espaço', valor: milhar(texto.replace(/\s/g, '').length) },
          { label: 'Frases', valor: milhar(frases) },
          { label: 'Parágrafos', valor: milhar(paragrafos) },
          { label: 'Leitura', valor: `${minutosLeitura < 1 ? 'menos de 1' : f1(minutosLeitura)} min` },
          { label: 'Fala', valor: `${minutosFala < 1 ? 'menos de 1' : f1(minutosFala)} min` },
        ],
        itens: [{ title: `Palavra mais longa: ${maisLonga}`, detail: `${maisLonga.length} letras` }],
        texto: `${palavras.length} palavras · ${texto.length} caracteres · ${frases} frase(s).\nTempo de leitura: ${minutosLeitura < 1 ? 'menos de 1 minuto' : `${f1(minutosLeitura)} minutos`}.\nTempo de fala: ${minutosFala < 1 ? 'menos de 1 minuto' : `${f1(minutosFala)} minutos`}.`,
      };
    },
  },
  {
    id: 'roteiro-encontro', nome: 'Roteiro de encontro', grupo: 'utilidades', icone: 'Map',
    descricao: 'Monta um roteiro de algumas horas a partir dos interesses reais da pessoa e do orçamento.',
    campos: [
      { key: 'pessoa', label: 'Pessoa', type: 'person' },
      { key: 'periodo', label: 'Período', type: 'select', default: 'tarde', options: [{ value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }] },
      { key: 'duracao', label: 'Duração (horas)', type: 'number', default: '4', min: 1, max: 12 },
      { key: 'orcamento', label: 'Orçamento (R$)', type: 'number', default: '150', min: 0 },
    ],
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa para montar o roteiro.' };
      const periodo = campo(v, 'periodo', 'tarde');
      const horas = Math.max(1, Math.min(12, inteiro(v, 'duracao', 4)));
      const orcamento = numero(v, 'orcamento', 150);
      const persona = buildPersona(person);
      const inicio = periodo === 'manha' ? 9 : periodo === 'tarde' ? 15 : 19;
      const etapas: string[] = [];
      const interesse = persona.interesses.map(item => item.label);
      etapas.push(`Encontro às ${String(inicio).padStart(2, '0')}h — comece com algo leve: um café ou uma caminhada curta. Nada de lugar barulhento no primeiro bloco.`);
      etapas.push(`Bloco 2: atividade ligada a ${interesse[0] || 'um interesse dela'}. Programe 1h30 e leve uma alternativa debaixo do braço caso o lugar esteja cheio.`);
      if (interesse[1]) etapas.push(`Bloco 3: puxe assunto sobre ${interesse[1]} — é um tema que ela costuma abrir sozinha e rende conversa.`);
      etapas.push(horas >= 3 ? 'Bloco final: jantar ou lanche calmo, com tempo de sobra para a conversa desacelerar.' : 'Fechamento: encerre antes do cansaço, com um plano claro para a próxima vez.');
      const custo = {
        manha: { leve: 25, principal: 0.35, jantar: 45 },
        tarde: { leve: 30, principal: 0.45, jantar: 55 },
        noite: { leve: 40, principal: 0.5, jantar: 70 },
      }[periodo] || { leve: 30, principal: 0.45, jantar: 55 };
      const estimativa = custo.leve + orcamento * custo.principal + (horas >= 3 ? custo.jantar : 0);
      return {
        itens: etapas.map((etapa, indice) => ({ title: `${String(inicio + indice * Math.max(1, Math.floor(horas / etapas.length))).padStart(2, '0')}h — ${etapa.split(':')[0]}`, detail: etapa, personId: person.id })),
        estatisticas: [{ label: 'Orçamento informado', valor: moeda(orcamento) }, { label: 'Estimativa do roteiro', valor: moeda(Math.min(estimativa, orcamento || estimativa)) }, { label: 'Interesses usados', valor: interesse.slice(0, 3).join(', ') || 'rotina' }],
        texto: `ROTEIRO PARA ${person.nome.toUpperCase()} (${horas}h, ${periodo})\n\n${etapas.map((etapa, indice) => `${indice + 1}. ${etapa}`).join('\n\n')}\n\nGasto estimado: ${moeda(Math.min(estimativa, orcamento || estimativa))}.`,
      };
    },
  },
  {
    id: 'modelo-ficha', nome: 'Criar modelo de ficha', grupo: 'utilidades', icone: 'Contact',
    descricao: 'Salva o jeito de uma ficha como modelo para cadastrar gente nova em segundos.',
    campos: [
      { key: 'pessoa', label: 'Ficha que serve de base', type: 'person' },
      { key: 'nome', label: 'Nome do modelo', type: 'text', placeholder: 'Ex.: Conhecida do trabalho' },
    ],
    perigoso: 'Um modelo de cadastro novo será criado. Nenhuma ficha existente é alterada.',
    run: (v, ctx) => {
      const person = escolhida(v, ctx.data);
      if (!person) return { texto: 'Cadastre uma pessoa para usar como base.' };
      const nome = campo(v, 'nome') || `Modelo a partir de ${nomeCurto(person)}`;
      const modelo = {
        id: generateId(), name: nome, category: person.localizacaoOnde, subcategory: person.localizacaoSub,
        description: person.descricao, tags: person.tags.slice(0, 6),
      };
      ctx.commit(atual => ({ ...atual, personTemplates: [...(atual.personTemplates || []), modelo] }), 'Modelo de ficha criado.', true);
      return {
        itens: [{ title: modelo.name, detail: `${person.localizacaoOnde || 'sem categoria'} · ${modelo.tags.join(', ') || 'sem etiquetas'}` }],
        texto: `Modelo "${nome}" criado a partir da ficha de ${person.nome}.\n\nDescrição base: ${person.descricao || '—'}\nCategoria: ${person.localizacaoOnde || '—'} / ${person.localizacaoSub || '—'}\nEtiquetas: ${modelo.tags.join(', ') || '—'}\n\nEle já aparece em Adicionar pessoa → Modelos.`,
        aviso: 'Modelo de ficha criado.',
      };
    },
  },
];


export const FERRAMENTAS: Tool[] = [...FERRAMENTAS_CATALOGO, ...FERRAMENTAS_LOTE, ...FERRAMENTAS_SOCIAL, ...FERRAMENTAS_PESSOAL, ...FERRAMENTAS_UTEIS];

export const acharFerramenta = (id: string) => FERRAMENTAS.find(ferramenta => ferramenta.id === id) || null;

export const ferramentasPorGrupo = (grupo: GrupoId) => FERRAMENTAS.filter(ferramenta => ferramenta.grupo === grupo);
