import type { AppData, AppNotification, Appointment, Attachment, ChatMessage, ChatState, Folder, GeneralNote, Icebreaker, InvestigationBoard, InvestigationCard, CatalogFilter, LocationOption, Memory, Person, Photo, Rating, Reminder, Story, TierList, PersonDraft } from './types';
import { INTIMATE_MIN_AGE, LOCATION_OPTIONS, RETIRED_SUBCATEGORY_VALUES, TAG_OPTIONS } from './types';
import { DEMO_PORTRAITS } from './assets';

export const STORAGE_KEY = 'catalog_manager_data';
export const JOURNAL_KEY = 'catalog_manager_pending_v3';
export const DEFAULT_FILTER: CatalogFilter = { query: '', category: '', subcategory: '', tag: '', minimum: 0, photo: 'all', sort: 'recent', scope: 'active', incomplete: false, collection: '', hair: '', height: '', ageMin: null, ageMax: null, rarity: '', folderOnly: false };
export const RATING_FIELDS = [
  { key: 'peitos', label: 'Peitos', weight: 1, adult: true },
  { key: 'bunda', label: 'Bunda', weight: 1, adult: true },
  { key: 'rosto', label: 'Rosto', weight: 1.3, adult: false },
  { key: 'belezaGeral', label: 'Beleza geral', weight: 1.5, adult: false },
  // Corpo é uma avaliação geral e fica sempre disponível.
  // Somente peitos, bunda e quadril aguardam idade adulta na ficha.
  { key: 'corpo', label: 'Corpo', weight: 1.1, adult: false },
  { key: 'cabelo', label: 'Cabelo', weight: 0.9, adult: false },
  { key: 'comportamento', label: 'Comportamento', weight: 1, adult: false },
  { key: 'quadril', label: 'Quadril', weight: 0.8, adult: true },
] as const;
export const PALETTE = ['#c786ec', '#ef88a6', '#e6b76a', '#7fbd9b', '#7ba3dc', '#b7a1ed', '#72bdc2', '#b0a8be'];
export const PHOTO_LABELS: Record<Photo['type'], string> = { normal: 'Normal', biquini: 'Biquíni', sem_nada: 'Sem nada' };
export const FOLDER_ICONS = ['folder', 'image', 'note', 'bookmark', 'heart', 'sparkles'];

export const generateId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const normalizeText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ');
export const formatNumber = (n: number, digits = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export function formatDate(date?: string | null, time = false) {
  if (!date) return 'Não informado';
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  if (!Number.isFinite(d.getTime())) return 'Não informado';
  return time ? d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function daysSince(date?: string | null) {
  if (!date) return null;
  const a = new Date(`${date.slice(0, 10)}T12:00:00`);
  const b = new Date(`${today()}T12:00:00`);
  return Number.isFinite(a.getTime()) ? Math.round((b.getTime() - a.getTime()) / 86400000) : null;
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const isActive = (p: Person) => !p.archivedAt && !p.deletedAt;
// Somente a idade libera os campos íntimos. Nenhuma categoria ou subcategoria bloqueia a ficha.
export const isAdult = (p: Person) => (p.idade ?? 0) >= INTIMATE_MIN_AGE;
export const retiredSubcategory = (value: string) => RETIRED_SUBCATEGORY_VALUES.includes(value);
export const safeImage = (url: string) => /^(data:image\/(png|jpeg|jpg|webp|gif|bmp|avif|svg\+xml);base64,|https:\/\/|\/images\/)/i.test(url) ? url : '';
// Links externos só entram como http(s); nada de javascript: ou data: em anexos.
export const safeLink = (url: string) => /^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? url.trim() : '';
export const RARITIES = ['comum', 'raro', 'epico', 'lendario'];
export const RARITY_LABELS: Record<string, string> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };
export const RARITY_COLORS: Record<string, string> = { comum: '#9aa0ad', raro: '#7ba3dc', epico: '#c786ec', lendario: '#e6b76a' };
export const rarityFor = (score: number) => score >= 4.8 ? 'lendario' : score >= 4.3 ? 'epico' : score >= 3.6 ? 'raro' : 'comum';

export function getDefaultPerson(): Person {
  return { id: generateId(), nome: '', apelido: '', descricao: '', idade: null, altura: '', rating: { overall: 0, mode: 'weighted', peitos: 0, bunda: 0, rosto: 0, belezaGeral: 0, corpo: 0, cabelo: 0, comportamento: 0, quadril: 0 }, cabeloTipo: '', cabeloCor: '', cabeloCorCustom: '', pele: '', peleCustom: '', localizacaoOnde: '', localizacaoSub: '', localizacaoMora: '', tags: [], qi: '', redesSociais: '', comportamento: '', notas: [], descricaoCorporal: '', fotos: [], ultimoVisto: null, viHojeCount: 0, viHojeDates: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorite: false, archivedAt: null, deletedAt: null, friendshipLevel: 0, tipoCorpo: '', estiloRoupa: '', observacoesGerais: '', aniversario: null, pronome: '', comoConheceu: '', musicaFavorita: '', signo: '', customFields: [], attachments: [], ratingHistory: [], rarity: 'comum', pinned: false };
}
export function emptyData(): AppData {
  return { schemaVersion: 6, updatedAt: '', people: [], orphanPhotos: [], stories: [], tierLists: [], reminders: [], activity: [], categories: structuredClone(LOCATION_OPTIONS), locations: [], collections: [], savedFilters: [], drafts: {}, ignoredDuplicates: [], folders: [], generalNotes: [], investigationBoards: [], personTemplates: [], noteDrafts: {}, albums: [], journal: [], goals: [], appointments: [], conversations: [], personalLinks: [], notifications: [], progress: { xp: 0, achievements: {}, notified: {}, duels: [], swipes: {}, streak: { last: '', count: 0 }, challenges: { week: '', done: [] }, lastActive: '', celebrated: {}, konami: false }, vault: { pin: null, photoIds: [] }, profiles: [], activeProfile: 'principal', chats: [], chatStates: {}, memories: [], icebreakers: [], onboardingDone: false, tourSeen: '', settings: { username: 'admin', password: 'admin', profileName: 'Admin', avatar: '', theme: 'dark', pin: null, pinEnabled: false, customTags: [], compactMode: false, rememberLogin: false, privacy: false, reducedMotion: false, largeText: false, accent: '#c786ec', autoTheme: false, browserNotifications: false, notificationLeadDays: 3, revisitAfterDays: 14, splash: false, panicEnabled: true, blurMode: false, density: 'confortavel', trashAutoCleanDays: 0, sounds: true, soundVolume: 55, haptics: true, confetti: true, adultMode: false, chatSpeed: 'realista', chatSlang: true, chatEmojis: true, chatMeter: true, chatAuto: false } };
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).filter((x): x is string => typeof x === 'string'); }
function numeric(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

export function slugify(text: string, prefix: string) {
  const base = normalizeText(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return base ? `${prefix}-${base}` : `${prefix}-${generateId()}`;
}

// Categorias e subcategorias recebidas em um JSON são somadas às existentes.
// Nada é substituído: uma categoria com o mesmo nome apenas reaproveita o valor atual.
export function mergeCategories(current: LocationOption[], incoming: unknown): LocationOption[] {
  const merged: LocationOption[] = current.map(c => ({ ...c, subs: (c.subs || []).map(s => ({ ...s })) }));
  const byValue = new Map(merged.map(c => [c.value, c]));
  const byLabel = new Map(merged.map(c => [normalizeText(c.label), c]));
  const uniqueValue = (base: string) => { let id = base; while (byValue.has(id)) id = `${base}-${generateId().slice(0, 4)}`; return id; };
  for (const value of array(incoming)) {
    const raw = object(value);
    const label = text(raw.label).trim() || text(raw.value).trim();
    if (!label) continue;
    const key = normalizeText(label);
    let category = (text(raw.value) && byValue.get(text(raw.value))) || byLabel.get(key);
    if (!category) {
      category = { value: text(raw.value).trim() || uniqueValue(slugify(label, 'cat')), label, subs: [] };
      if (byValue.has(category.value)) category.value = uniqueValue(slugify(label, 'cat'));
      merged.push(category); byValue.set(category.value, category); byLabel.set(key, category);
    }
    for (const item of array(raw.subs)) {
      const sub = object(item);
      const subLabel = text(sub.label).trim() || text(sub.value).trim();
      if (!subLabel || retiredSubcategory(text(sub.value))) continue;
      const subs = (category.subs ||= []);
      if (subs.some(s => normalizeText(s.label) === normalizeText(subLabel))) continue;
      let subValue = text(sub.value).trim() || slugify(subLabel, 'sub');
      if (subs.some(s => s.value === subValue)) subValue = `${subValue}-${generateId().slice(0, 4)}`;
      subs.push({ value: subValue, label: subLabel });
    }
  }
  return merged;
}

// Percorre tudo o que já foi lido e registra o que estiver faltando no sistema.
// Retorna um relatório do que foi criado automaticamente.
export function absorbReferences(data: AppData) {
  const added = { categories: [] as string[], subcategories: [] as string[], tags: [] as string[], locations: [] as string[] };
  const byValue = new Map(data.categories.map(c => [c.value, c]));
  const byLabel = new Map(data.categories.map(c => [normalizeText(c.label), c]));
  const uniqueCategoryValue = (base: string) => { let id = base; while (byValue.has(id)) id = `${base}-${generateId().slice(0, 4)}`; return id; };
  const ensureCategory = (value: string, label?: string): LocationOption | null => {
    const name = (label || value || '').trim();
    if (!name && !value) return null;
    const key = normalizeText(name || value);
    const found = (value && byValue.get(value)) || byLabel.get(key);
    if (found) { if (value) byValue.set(value, found); return found; }
    const created: LocationOption = { value: value.trim() || uniqueCategoryValue(slugify(name, 'cat')), label: name || value, subs: [] };
    if (byValue.has(created.value)) created.value = uniqueCategoryValue(slugify(created.label, 'cat'));
    data.categories.push(created); byValue.set(created.value, created); byLabel.set(key, created); added.categories.push(created.label);
    return created;
  };
  const ensureSubcategory = (category: LocationOption, value: string, label?: string) => {
    const name = (label || value || '').trim();
    if (!name || retiredSubcategory(value) || retiredSubcategory(name)) return;
    const subs = (category.subs ||= []);
    if (subs.some(s => normalizeText(s.label) === normalizeText(name) || (value && s.value === value))) return;
    let subValue = value.trim() || slugify(name, 'sub');
    if (subs.some(s => s.value === subValue)) subValue = `${subValue}-${generateId().slice(0, 4)}`;
    subs.push({ value: subValue, label: name }); added.subcategories.push(`${category.label} / ${name}`);
  };
  const ensureLocation = (value: string) => {
    const name = value.trim(); if (!name || data.locations.some(l => normalizeText(l) === normalizeText(name))) return;
    data.locations.push(name); added.locations.push(name);
  };
  const ensureTag = (value: string, color?: string) => {
    const name = value.trim().toLocaleLowerCase('pt-BR'); if (!name) return;
    if (!data.settings.customTags.some(t => normalizeText(t.nome) === normalizeText(name))) {
      data.settings.customTags.push({ nome: name, cor: color || PALETTE[data.settings.customTags.length % PALETTE.length] });
      added.tags.push(name);
    }
  };
  const absorbPerson = (person: Person) => {
    if (retiredSubcategory(person.localizacaoSub)) person.localizacaoSub = '';
    const category = person.localizacaoOnde ? ensureCategory(person.localizacaoOnde) : null;
    if (category && person.localizacaoSub) ensureSubcategory(category, person.localizacaoSub);
    person.tags.forEach(tag => ensureTag(tag));
    if (person.localizacaoMora) ensureLocation(person.localizacaoMora);
  };
  data.people.forEach(absorbPerson);
  Object.values(data.drafts).forEach(draft => absorbPerson(draft.payload));
  data.tierLists.forEach(list => {
    const allowed = list.allowedCategories.filter(v => !v.startsWith('todas'));
    list.allowedCategories = [...new Set([...allowed.map(v => ensureCategory(v)?.value || v), ...(list.allowedCategories.includes('todas') ? ['todas'] : [])])];
    list.allowedSubcategories = [...new Set(list.allowedSubcategories.flatMap(entry => {
      if (entry === 'todas' || entry.endsWith('::__none')) return [entry];
      const [categoryValue, subValue] = entry.includes('::') ? entry.split('::') : ['', entry];
      const category = categoryValue ? ensureCategory(categoryValue) : null;
      if (category && subValue) { ensureSubcategory(category, subValue); return [`${category.value}::${subValue}`]; }
      const owner = subValue ? data.categories.find(c => c.subs?.some(s => s.value === subValue || normalizeText(s.label) === normalizeText(subValue))) : null;
      if (owner && subValue) return [`${owner.value}::${subValue}`];
      return [entry];
    }))];
  });
  data.savedFilters.forEach(saved => {
    if (saved.filter.category) saved.filter.category = ensureCategory(saved.filter.category)?.value || saved.filter.category;
    if (saved.filter.subcategory) { const owner = data.categories.find(c => c.value === saved.filter.category) || data.categories.find(c => c.subs?.some(s => s.value === saved.filter.subcategory)); if (owner) ensureSubcategory(owner, saved.filter.subcategory); }
    if (saved.filter.tag) ensureTag(saved.filter.tag);
  });
  (data.personTemplates || []).forEach(template => {
    const category = template.category ? ensureCategory(template.category) : null;
    if (category) { template.category = category.value; if (template.subcategory) ensureSubcategory(category, template.subcategory); }
    template.tags.forEach(tag => ensureTag(tag));
  });
  data.locations.forEach(ensureLocation);
  return added;
}
function normalizeFilter(value: unknown): CatalogFilter {
  const f = object(value);
  return {
    query: text(f.query), category: text(f.category), subcategory: text(f.subcategory), tag: text(f.tag), collection: text(f.collection),
    minimum: Math.max(0, Math.min(5, numeric(f.minimum))), incomplete: f.incomplete === true,
    photo: ['all', 'with', 'without'].includes(text(f.photo)) ? f.photo as CatalogFilter['photo'] : 'all',
    sort: ['recent', 'name', 'rating', 'seen', 'updated', 'completeness', 'age', 'lastSeen', 'birthday'].includes(text(f.sort)) ? f.sort as CatalogFilter['sort'] : 'recent',
    scope: ['active', 'favorites', 'archived', 'trash'].includes(text(f.scope)) ? f.scope as CatalogFilter['scope'] : 'active',
    hair: text(f.hair), height: text(f.height), rarity: RARITIES.includes(text(f.rarity)) ? text(f.rarity) : '',
    ageMin: f.ageMin === null || f.ageMin === undefined || f.ageMin === '' ? null : Math.max(0, Math.min(120, Math.round(numeric(f.ageMin)))),
    ageMax: f.ageMax === null || f.ageMax === undefined || f.ageMax === '' ? null : Math.max(0, Math.min(120, Math.round(numeric(f.ageMax)))),
    folderOnly: f.folderOnly === true,
  };
}
export function normalizePhotos(photos: Photo[], personId: string | null): Photo[] {
  const mainId = photos.find(p => p.isMain)?.id || photos[0]?.id;
  return photos.map(p => ({ ...p, personId, isMain: !!personId && p.id === mainId }));
}
function photo(value: unknown, personId: string | null): Photo {
  const p = object(value);
  return {
    id: text(p.id) || generateId(), url: safeImage(text(p.url)), personId, isMain: !!p.isMain,
    type: ['normal', 'biquini', 'sem_nada'].includes(text(p.type)) ? p.type as Photo['type'] : 'normal',
    name: text(p.name, 'Foto'), createdAt: text(p.createdAt, new Date().toISOString()), folderId: text(p.folderId) || null,
    description: text(p.description), favorite: !!p.favorite, albumIds: [...new Set(strings(p.albumIds))],
    hash: text(p.hash) || photoHash(text(p.url)), capturedAt: text(p.capturedAt) || null,
  };
}
export function normalizePerson(value: unknown): Person {
  const p = object(value), base = getDefaultPerson();
  const result = { ...base };
  for (const key of Object.keys(base) as (keyof Person)[]) {
    if (typeof base[key] === 'string' && typeof p[key] === 'string') Object.assign(result, { [key]: p[key] });
  }
  result.id = text(p.id) || base.id;
  result.idade = p.idade === null || p.idade === undefined || p.idade === '' ? null : Math.max(0, Math.min(120, Math.floor(numeric(p.idade))));
  const r = object(p.rating);
  for (const key of ['overall', ...RATING_FIELDS.map(f => f.key)] as (keyof Rating)[]) Object.assign(result.rating, { [key]: Math.max(0, Math.min(5, numeric(r[key]))) });
  result.rating.mode = r.mode === 'manual' ? 'manual' : 'weighted';
  result.rating.overall = calculateOverallRating(result.rating);
  result.tags = [...new Set(strings(p.tags))];
  result.fotos = normalizePhotos(array(p.fotos).map(f => photo(f, result.id)).filter(f => f.url), result.id);
  result.notas = array(p.notas).map(value => { const n = object(value); return { id: text(n.id) || generateId(), title: text(n.title), content: text(n.content), type: (['observacao', 'rumor', 'confirmado', 'teoria', 'desejo'].includes(text(n.type)) ? n.type : 'observacao') as Person['notas'][number]['type'], date: text(n.date, today()) }; });
  result.favorite = !!p.favorite;
  result.ultimoVisto = text(p.ultimoVisto) || null;
  result.viHojeDates = strings(p.viHojeDates).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  result.viHojeCount = Math.max(result.viHojeDates.length, numeric(p.viHojeCount));
  result.archivedAt = text(p.archivedAt) || null;
  result.deletedAt = text(p.deletedAt) || null;
  result.friendshipLevel = Math.max(0, Math.min(5, Math.round(numeric(p.friendshipLevel))));
  result.tipoCorpo = text(p.tipoCorpo);
  result.estiloRoupa = text(p.estiloRoupa);
  result.observacoesGerais = text(p.observacoesGerais);
  result.aniversario = /^\d{4}-\d{2}-\d{2}$/.test(text(p.aniversario)) ? text(p.aniversario) : null;
  result.customFields = array(p.customFields).map(value => { const f = object(value); return { id: text(f.id) || generateId(), label: text(f.label), value: text(f.value) }; }).filter(f => f.label).slice(0, 30);
  result.attachments = array(p.attachments).map(value => { const a = object(value); return { id: text(a.id) || generateId(), label: text(a.label, 'Anexo'), url: safeLink(text(a.url)), kind: (['link', 'video', 'pdf', 'audio', 'outro'].includes(text(a.kind)) ? a.kind : 'outro') as Attachment['kind'], createdAt: text(a.createdAt, new Date().toISOString()) }; }).slice(0, 60);
  result.ratingHistory = array(p.ratingHistory).map(value => { const h = object(value); return { date: text(h.date, today()), overall: Math.max(0, Math.min(5, numeric(h.overall))) }; }).slice(-40);
  result.rarity = RARITIES.includes(text(p.rarity)) ? p.rarity as Person['rarity'] : rarityFor(calculateOverallRating(result.rating));
  result.pinned = p.pinned === true;
  return result;
}

// Old snapshots are migrated without changing IDs or disconnecting relationships.
export function normalizeData(value: unknown, strict = false): AppData {
  const raw = object(value);
  if (strict && (!Array.isArray(raw.people) || !raw.settings || Array.isArray(raw.settings) || typeof raw.settings !== 'object' || !Array.isArray(raw.tierLists))) throw new Error('Este arquivo não é um backup completo do Catalog.');
  const base = emptyData();
  const s = object(raw.settings);
  base.settings = { ...base.settings, ...s } as AppData['settings'];
  base.settings.username = text(s.username, 'admin');
  base.settings.password = text(s.password, 'admin');
  base.settings.profileName = text(s.profileName) || base.settings.username;
  base.settings.avatar = safeImage(text(s.avatar));
  base.settings.theme = s.theme === 'light' ? 'light' : 'dark';
  base.settings.customTags = array(s.customTags).map(v => { const t = object(v); return { nome: text(t.nome), cor: /^#[\da-f]{6}$/i.test(text(t.cor)) ? text(t.cor) : PALETTE[0] }; }).filter(t => t.nome);
  base.settings.pin = /^\d{4,8}$/.test(text(s.pin)) ? text(s.pin) : null;
  base.settings.pinEnabled = !!s.pinEnabled && !!base.settings.pin;
  for (const key of ['compactMode', 'rememberLogin', 'privacy', 'reducedMotion', 'largeText', 'autoTheme', 'browserNotifications', 'splash', 'panicEnabled', 'blurMode'] as const) base.settings[key] = s[key] === true;
  base.settings.accent = /^#[\da-f]{6}$/i.test(text(s.accent)) ? text(s.accent) : PALETTE[0];
  base.settings.notificationLeadDays = Math.max(0, Math.min(30, Math.round(numeric(s.notificationLeadDays, 3))));
  base.settings.revisitAfterDays = Math.max(1, Math.min(180, Math.round(numeric(s.revisitAfterDays, 14))));
  base.settings.density = s.density === 'compacto' ? 'compacto' : 'confortavel';
  base.settings.trashAutoCleanDays = Math.max(0, Math.min(365, Math.round(numeric(s.trashAutoCleanDays, 0))));
  base.settings.sounds = s.sounds !== false;
  base.settings.soundVolume = Math.max(0, Math.min(100, Math.round(numeric(s.soundVolume, 55))));
  base.settings.haptics = s.haptics !== false;
  base.settings.confetti = s.confetti !== false;
  // Conversas: o modo adulto é sempre opt-in e só vale para fichas de 18 anos ou mais.
  base.settings.adultMode = s.adultMode === true;
  base.settings.chatSpeed = s.chatSpeed === 'rapido' ? 'rapido' : 'realista';
  base.settings.chatSlang = s.chatSlang !== false;
  base.settings.chatEmojis = s.chatEmojis !== false;
  base.settings.chatMeter = s.chatMeter !== false;
  base.settings.chatAuto = s.chatAuto === true;
  base.people = array(raw.people).map(normalizePerson).filter((p, i, list) => list.findIndex(q => q.id === p.id) === i);
  base.orphanPhotos = array(raw.orphanPhotos).map(v => photo(v, null)).filter(p => p.url);
  base.tierLists = array(raw.tierLists).map(v => {
    const t = object(v), tiers = [...new Set(strings(t.tiers).map(n => n.trim()).filter(Boolean))];
    const colors = Object.fromEntries(Object.entries(object(t.colors)).filter(([, color]) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color))) as Record<string, string>;
    return {
      id: text(t.id) || generateId(), nome: text(t.nome, 'Minha tierlist'), tiers: tiers.length ? tiers : ['S', 'A', 'B', 'C', 'D'], colors, updatedAt: text(t.updatedAt),
      items: array(t.items).map(v => { const i = object(v); return { personId: text(i.personId), tier: text(i.tier) }; }).filter((v, i, list) => base.people.some(p => p.id === v.personId) && list.findIndex(x => x.personId === v.personId) === i),
      allowedCategories: Array.isArray(t.allowedCategories) ? strings(t.allowedCategories) : ['todas'],
      allowedSubcategories: Array.isArray(t.allowedSubcategories) ? strings(t.allowedSubcategories) : ['todas'],
    };
  });
  base.stories = array(raw.stories).map(v => {
    const s = object(v);
    return {
      id: text(s.id) || generateId(), titulo: text(s.titulo),
      tipo: (['sexual', 'picante', 'detalhada'].includes(text(s.tipo)) ? s.tipo : 'detalhada') as Story['tipo'],
      personId: text(s.personId) || null, conteudo: text(s.conteudo), date: text(s.date, today()),
      favorite: s.favorite === true, updatedAt: text(s.updatedAt),
      chapters: array(s.chapters).map(value => { const c = object(value); return { id: text(c.id) || generateId(), title: text(c.title, 'Capítulo'), content: text(c.content) }; }),
    };
  });
  base.reminders = array(raw.reminders).map(v => { const r = object(v); return { id: text(r.id) || generateId(), personId: text(r.personId) || null, titulo: text(r.titulo), data: text(r.data, today()), concluido: !!r.concluido, createdAt: text(r.createdAt, new Date().toISOString()), descricao: text(r.descricao), priority: r.priority === 'alta' ? 'alta' : 'normal', notifiedAt: text(r.notifiedAt) || null, repeat: (['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(text(r.repeat)) ? r.repeat : 'none') as Reminder['repeat'] }; });
  base.activity = array(raw.activity).slice(0, 100).map(v => { const a = object(v); return { id: text(a.id) || generateId(), texto: text(a.texto), tipo: text(a.tipo, 'sistema') as AppData['activity'][number]['tipo'], data: text(a.data), personId: text(a.personId) || null }; });
  // Categorias do JSON são somadas às categorias do sistema, nunca substituídas.
  // Uma categoria desconhecida entra automaticamente no catálogo.
  base.categories = mergeCategories(base.categories, raw.categories);
  base.tierLists = base.tierLists.map(t => ({ ...t, allowedSubcategories: [...new Set(t.allowedSubcategories.flatMap(sub => sub === 'todas' || sub.includes('::') ? [sub] : base.categories.filter(c => c.subs?.some(s => s.value === sub)).map(c => `${c.value}::${sub}`)))] }));
  base.locations = [...new Set([...strings(raw.locations), ...base.people.map(p => p.localizacaoMora).filter(Boolean)])];
  base.collections = array(raw.collections).map(v => { const c = object(v); return { id: text(c.id) || generateId(), name: text(c.name), color: text(c.color, PALETTE[0]), personIds: [...new Set(strings(c.personIds))] }; });
  base.folders = array(raw.folders).map(value => {
    const folder = object(value);
    return {
      id: text(folder.id) || generateId(),
      name: text(folder.name, 'Pasta sem nome'),
      color: /^#[\da-f]{6}$/i.test(text(folder.color)) ? text(folder.color) : PALETTE[0],
      icon: FOLDER_ICONS.includes(text(folder.icon)) ? text(folder.icon) : 'folder',
      description: text(folder.description),
      personIds: [...new Set(strings(folder.personIds).filter(id => base.people.some(p => p.id === id)))],
      photoIds: [...new Set(strings(folder.photoIds))],
      noteIds: [...new Set(strings(folder.noteIds))],
      storyIds: [...new Set(strings(folder.storyIds))],
      createdAt: text(folder.createdAt, new Date().toISOString()),
      updatedAt: text(folder.updatedAt, new Date().toISOString()),
      parentId: text(folder.parentId) || null,
      pinned: folder.pinned === true,
      coverPhotoId: text(folder.coverPhotoId) || null,
      sort: (['recent', 'name', 'manual'].includes(text(folder.sort)) ? folder.sort : 'recent') as Folder['sort'],
      order: Math.round(numeric(folder.order)),
    };
  });
  // Uma pasta nunca pode ser filha de si mesma nem criar um ciclo sem saída.
  base.folders.forEach(folder => {
    let guard = 0, parent = folder.parentId;
    while (parent && guard++ < 25) {
      if (parent === folder.id) { folder.parentId = null; break; }
      parent = base.folders.find(f => f.id === parent)?.parentId || null;
    }
    if (folder.parentId && !base.folders.some(f => f.id === folder.parentId)) folder.parentId = null;
  });
  // Legacy collections become people folders so existing groups remain available.
  if (!base.folders.length && base.collections.length) base.folders = base.collections.map(c => ({ id: c.id, name: c.name, color: c.color, icon: 'folder', description: 'Pasta migrada de uma coleção anterior.', personIds: c.personIds, photoIds: [], noteIds: [], storyIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  base.generalNotes = array(raw.generalNotes).map(value => {
    const note = object(value);
    return { id: text(note.id) || generateId(), title: text(note.title, 'Nota sem título'), content: text(note.content), type: (['ideia', 'observacao', 'lembrete', 'referencia'].includes(text(note.type)) ? note.type : 'observacao') as GeneralNote['type'], personIds: [...new Set(strings(note.personIds).filter(id => base.people.some(p => p.id === id)))], folderId: base.folders.some(f => f.id === text(note.folderId)) ? text(note.folderId) : null, pinned: !!note.pinned, createdAt: text(note.createdAt, new Date().toISOString()), updatedAt: text(note.updatedAt, new Date().toISOString()) };
  });
  base.investigationBoards = array(raw.investigationBoards).map(value => {
    const board = object(value);
    return { id: text(board.id) || generateId(), name: text(board.name, 'Novo quadro'), description: text(board.description), createdAt: text(board.createdAt, new Date().toISOString()), updatedAt: text(board.updatedAt, new Date().toISOString()), cards: array(board.cards).map(value => {
      const card = object(value);
      return { id: text(card.id) || generateId(), title: text(card.title, 'Pista sem título'), content: text(card.content), status: (['observando', 'conectando', 'confirmado', 'arquivado'].includes(text(card.status)) ? card.status : 'observando') as InvestigationCard['status'], personId: base.people.some(p => p.id === text(card.personId)) ? text(card.personId) : null, noteId: base.generalNotes.some(n => n.id === text(card.noteId)) ? text(card.noteId) : null, folderId: base.folders.some(f => f.id === text(card.folderId)) ? text(card.folderId) : null, color: /^#[\da-f]{6}$/i.test(text(card.color)) ? text(card.color) : PALETTE[0], createdAt: text(card.createdAt, new Date().toISOString()), updatedAt: text(card.updatedAt, new Date().toISOString()) };
    }) } as InvestigationBoard;
  });
  base.savedFilters = array(raw.savedFilters).map(v => { const f = object(v); return { id: text(f.id) || generateId(), name: text(f.name), filter: normalizeFilter(f.filter) }; });
  base.drafts = Object.fromEntries(Object.entries(object(raw.drafts)).map(([key, v]) => { const d = object(v); return [key, { id: key, kind: ['add', 'edit', 'quick'].includes(text(d.kind)) ? d.kind : 'add', personId: text(d.personId) || undefined, payload: normalizePerson(d.payload), updatedAt: text(d.updatedAt, new Date().toISOString()) } as PersonDraft]; }));
  base.personTemplates = array(raw.personTemplates).map(value => {
    const template = object(value);
    return { id: text(template.id) || generateId(), name: text(template.name, 'Modelo'), category: text(template.category), subcategory: text(template.subcategory), description: text(template.description), tags: [...new Set(strings(template.tags))] };
  });
  base.albums = array(raw.albums).map(value => {
    const album = object(value);
    return { id: text(album.id) || generateId(), name: text(album.name, 'Álbum'), description: text(album.description), color: /^#[\da-f]{6}$/i.test(text(album.color)) ? text(album.color) : PALETTE[0], photoIds: [...new Set(strings(album.photoIds))], createdAt: text(album.createdAt, new Date().toISOString()), updatedAt: text(album.updatedAt, new Date().toISOString()) };
  });
  base.journal = array(raw.journal).map(value => {
    const entry = object(value);
    return { id: text(entry.id) || generateId(), date: /^\d{4}-\d{2}-\d{2}$/.test(text(entry.date)) ? text(entry.date) : today(), mood: Math.max(1, Math.min(5, Math.round(numeric(entry.mood, 3)))), title: text(entry.title), content: text(entry.content), tags: [...new Set(strings(entry.tags))], createdAt: text(entry.createdAt, new Date().toISOString()), updatedAt: text(entry.updatedAt, new Date().toISOString()) };
  });
  base.goals = array(raw.goals).map(value => {
    const goal = object(value);
    return { id: text(goal.id) || generateId(), title: text(goal.title), done: goal.done === true, personId: text(goal.personId) || null, due: /^\d{4}-\d{2}-\d{2}$/.test(text(goal.due)) ? text(goal.due) : null, kind: goal.kind === 'conexao' ? 'conexao' : 'pessoal', createdAt: text(goal.createdAt, new Date().toISOString()), doneAt: text(goal.doneAt) || null };
  });
  base.appointments = array(raw.appointments).map(value => {
    const item = object(value);
    return { id: text(item.id) || generateId(), personId: text(item.personId) || null, title: text(item.title, 'Compromisso'), date: /^\d{4}-\d{2}-\d{2}$/.test(text(item.date)) ? text(item.date) : today(), time: /^\d{2}:\d{2}$/.test(text(item.time)) ? text(item.time) : '18:00', place: text(item.place), notes: text(item.notes), durationMinutes: item.durationMinutes === null || item.durationMinutes === undefined ? null : Math.max(0, Math.min(1440, Math.round(numeric(item.durationMinutes)))), status: (['agendado', 'realizado', 'cancelado'].includes(text(item.status)) ? item.status : 'agendado') as Appointment['status'], createdAt: text(item.createdAt, new Date().toISOString()) };
  });
  base.conversations = array(raw.conversations).map(value => {
    const item = object(value);
    return { id: text(item.id) || generateId(), personId: text(item.personId) || null, date: /^\d{4}-\d{2}-\d{2}$/.test(text(item.date)) ? text(item.date) : today(), topic: text(item.topic), content: text(item.content), createdAt: text(item.createdAt, new Date().toISOString()) };
  });
  base.personalLinks = array(raw.personalLinks).map(value => {
    const item = object(value);
    return { id: text(item.id) || generateId(), label: text(item.label, 'Link'), url: safeLink(text(item.url)), group: text(item.group, 'Geral'), note: text(item.note), createdAt: text(item.createdAt, new Date().toISOString()) };
  }).filter(item => item.url);
  base.notifications = array(raw.notifications).slice(0, 120).map(value => {
    const item = object(value);
    return { id: text(item.id) || generateId(), title: text(item.title, 'Aviso'), body: text(item.body), kind: (['lembrete', 'prazo', 'revisita', 'conquista', 'sistema'].includes(text(item.kind)) ? item.kind : 'sistema') as AppNotification['kind'], date: text(item.date, new Date().toISOString()), read: item.read === true, personId: text(item.personId) || null, page: text(item.page) || undefined };
  });
  const progress = object(raw.progress);
  base.progress = {
    xp: Math.max(0, Math.round(numeric(progress.xp))),
    achievements: Object.fromEntries(Object.entries(object(progress.achievements)).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
    notified: Object.fromEntries(Object.entries(object(progress.notified)).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
    duels: array(progress.duels).map(value => { const duel = object(value); return { id: text(duel.id) || generateId(), winnerId: text(duel.winnerId), loserId: text(duel.loserId), date: text(duel.date, today()) }; }).slice(-200),
    swipes: Object.fromEntries(Object.entries(object(progress.swipes)).filter(([, v]) => v === 'like' || v === 'pass')) as Record<string, 'like' | 'pass'>,
    streak: { last: text(object(progress.streak).last), count: Math.max(0, Math.round(numeric(object(progress.streak).count))) },
    challenges: { week: text(object(progress.challenges).week), done: strings(object(progress.challenges).done) },
    lastActive: text(progress.lastActive),
    celebrated: Object.fromEntries(Object.entries(object(progress.celebrated)).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
    konami: progress.konami === true,
  };
  const vault = object(raw.vault);
  base.vault = { pin: /^\d{4,8}$/.test(text(vault.pin)) ? text(vault.pin) : null, photoIds: [...new Set(strings(vault.photoIds))] };
  base.profiles = array(raw.profiles).map(value => {
    const profile = object(value);
    return { id: text(profile.id) || 'principal', name: text(profile.name, 'Meu catálogo'), color: /^#[\da-f]{6}$/i.test(text(profile.color)) ? text(profile.color) : PALETTE[0], createdAt: text(profile.createdAt, new Date().toISOString()) };
  });
  if (!base.profiles.length) base.profiles = [{ id: 'principal', name: base.settings.profileName || 'Meu catálogo', color: PALETTE[0], createdAt: new Date().toISOString() }];
  base.activeProfile = base.profiles.some(profile => profile.id === text(raw.activeProfile)) ? text(raw.activeProfile) : 'principal';
  base.ignoredDuplicates = strings(raw.ignoredDuplicates);
  // Novos módulos: chats simulados, memórias e quebra-gelos.
  base.chats = array(raw.chats).map(v => {
    const c = object(v);
    return {
      id: text(c.id) || generateId(),
      personId: text(c.personId) || null,
      role: (['user', 'them', 'system'].includes(text(c.role)) ? c.role : 'user') as ChatMessage['role'],
      text: text(c.text),
      timestamp: text(c.timestamp, new Date().toISOString()),
      mood: (['happy', 'flirty', 'shy', 'playful', 'curious', 'neutral', 'carinhosa', 'fechada'].includes(text(c.mood)) ? c.mood : 'neutral') as ChatMessage['mood'],
      tom: (['amizade', 'flerte', 'provocante', 'intenso'].includes(text(c.tom)) ? c.tom : undefined) as ChatMessage['tom'],
    } as ChatMessage;
  }).filter(c => c.personId && base.people.some(p => p.id === c.personId)).slice(-800);
  base.chatStates = Object.fromEntries(Object.entries(object(raw.chatStates)).map(([id, value]) => {
    const estado = object(value);
    if (!base.people.some(p => p.id === id)) return [id, null] as const;
    const lembrancas = array(estado.lembrancas).map(item => { const l = object(item); return { tipo: text(l.tipo, 'rotina'), valor: text(l.valor) }; }).filter(item => item.valor).slice(-12);
    const topicos = Object.fromEntries(Object.entries(object(estado.topicos)).filter(([, v]) => typeof v === 'string').slice(-16)) as Record<string, string>;
    const normalizado = {
      personId: id,
      afinidade: Math.max(0, Math.min(100, numeric(estado.afinidade, 15))),
      mensagens: Math.max(0, Math.round(numeric(estado.mensagens))),
      humor: (['happy', 'flirty', 'shy', 'playful', 'curious', 'neutral', 'carinhosa', 'fechada'].includes(text(estado.humor)) ? text(estado.humor) : 'neutral') as ChatState['humor'],
      tom: (['amizade', 'flerte', 'provocante', 'intenso'].includes(text(estado.tom)) ? text(estado.tom) : 'amizade') as ChatState['tom'],
      topicos,
      lembrancas,
      perguntas: strings(estado.perguntas).slice(-30),
      recentes: strings(estado.recentes).slice(-16),
      usados: strings(estado.usados).slice(-60),
      ultimaMensagem: text(estado.ultimaMensagem, new Date().toISOString()),
      visitas: Math.max(0, Math.round(numeric(estado.visitas))),
      ofensas: Math.max(0, Math.round(numeric(estado.ofensas))),
    } as ChatState;
    return [id, normalizado] as const;
  }).filter(([, value]) => value)) as Record<string, ChatState>;
  base.memories = array(raw.memories).map(v => {
    const m = object(v);
    return {
      id: text(m.id) || generateId(),
      personId: text(m.personId) || null,
      title: text(m.title, 'Memória'),
      content: text(m.content),
      date: /^\d{4}-\d{2}-\d{2}$/.test(text(m.date)) ? text(m.date) : today(),
      emotion: (['happy', 'funny', 'sweet', 'awkward', 'special'].includes(text(m.emotion)) ? m.emotion : undefined) as Memory['emotion'],
      tags: [...new Set(strings(m.tags))],
      createdAt: text(m.createdAt, new Date().toISOString()),
    } as Memory;
  }).filter(m => !m.personId || base.people.some(p => p.id === m.personId));
  base.icebreakers = array(raw.icebreakers).map(v => {
    const b = object(v);
    return {
      id: text(b.id) || generateId(),
      personId: text(b.personId) || null,
      text: text(b.text),
      category: (['fun', 'deep', 'light', 'flirty', 'nostalgic'].includes(text(b.category)) ? b.category : 'light') as Icebreaker['category'],
      used: b.used === true,
      createdAt: text(b.createdAt, new Date().toISOString()),
    } as Icebreaker;
  }).filter(b => !b.personId || base.people.some(p => p.id === b.personId));
  base.onboardingDone = raw.onboardingDone === true;
  base.tourSeen = text(raw.tourSeen);
  base.noteDrafts = Object.fromEntries(Object.entries(object(raw.noteDrafts)).map(([key, value]) => {
    const note = object(value);
    return [key, { id: text(note.id) || generateId(), title: text(note.title), content: text(note.content), type: (['ideia', 'observacao', 'lembrete', 'referencia'].includes(text(note.type)) ? note.type : 'observacao') as GeneralNote['type'], personIds: strings(note.personIds), folderId: text(note.folderId) || null, pinned: note.pinned === true, createdAt: text(note.createdAt, new Date().toISOString()), updatedAt: text(note.updatedAt, new Date().toISOString()) }];
  }));
  base.updatedAt = text(raw.updatedAt);
  // Registra automaticamente qualquer categoria, subcategoria, tag ou local
  // citado em pessoas, rascunhos, tierlists, filtros salvos e modelos.
  absorbReferences(base);
  return base;
}

export function calculateOverallRating(rating: Rating): number {
  if (rating.mode === 'manual') return Math.max(0, Math.min(5, Number(rating.overall) || 0));
  let sum = 0, weight = 0;
  RATING_FIELDS.forEach(f => { const n = Math.max(0, Math.min(5, Number(rating[f.key]) || 0)); if (n > 0) { sum += n * f.weight; weight += f.weight; } });
  return weight ? Math.round(sum / weight * 10) / 10 : 0;
}
export function getFinalScore(p: Person) { const n = calculateOverallRating(p.rating); return n > 0 ? Math.min(5, Math.round((n + (p.tags.includes('crush') ? 0.5 : 0)) * 10) / 10) : 0; }
export const rankedPeople = (people: Person[]) => [...people].filter(isActive).sort((a, b) => getFinalScore(b) - getFinalScore(a) || calculateOverallRating(b.rating) - calculateOverallRating(a.rating) || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id));
export const getMainPhoto = (p: Person) => p.fotos.find(f => f.isMain) || p.fotos[0] || null;
export const getAllPhotos = (data: AppData) => [...data.people.filter(p => !p.deletedAt).flatMap(p => p.fotos.map(f => ({ ...f, personId: p.id }))), ...data.orphanPhotos.map(f => ({ ...f, personId: null }))];
export function getAllTagNames(data: AppData) { return [...new Set([...TAG_OPTIONS, ...data.settings.customTags.map(t => t.nome), ...data.people.flatMap(p => p.tags)])]; }
export function getTagColor(tag: string, data: AppData) { return data.settings.customTags.find(t => t.nome === tag)?.cor || ({ crush: '#e6ad77', amiga: '#86bfa1', alvo: '#e89499', friendzone: '#86a8d8', conhecida: '#c19dde' } as Record<string, string>)[tag] || '#aba3b7'; }
export function locationLabel(p: Person, data: AppData, sub = true) { const c = data.categories.find(c => c.value === p.localizacaoOnde); const s = c?.subs?.find(s => s.value === p.localizacaoSub); return [c?.label || p.localizacaoOnde || 'Sem categoria', sub ? s?.label || p.localizacaoSub : ''].filter(Boolean).join(' / '); }
export function friendshipLabel(level = 0) { return ['Ainda não conheço bem', 'Conhecida', 'Contato ocasional', 'Amizade em construção', 'Amiga próxima', 'Amizade muito próxima'][Math.max(0, Math.min(5, Math.round(level)))] || 'Ainda não conheço bem'; }
export function allFolderItems(data: AppData, folderId: string) {
  const folder = data.folders.find(f => f.id === folderId);
  if (!folder) return { people: [] as Person[], photos: [] as Photo[], notes: [] as GeneralNote[], stories: [] as AppData['stories'] };
  const photos = getAllPhotos(data).filter(p => folder.photoIds.includes(p.id) || p.folderId === folderId);
  return { people: data.people.filter(p => folder.personIds.includes(p.id) && !p.deletedAt), photos, notes: data.generalNotes.filter(n => folder.noteIds.includes(n.id) || n.folderId === folderId), stories: data.stories.filter(s => folder.storyIds.includes(s.id)) };
}
export const makeActivity = (texto: string, tipo: AppData['activity'][number]['tipo'] = 'sistema', personId?: string | null) => ({ id: generateId(), texto, tipo, personId, data: new Date().toISOString() });
export function duplicatePerson(p: Person) { const copy = structuredClone(p), id = generateId(); return { ...copy, id, nome: `${p.nome} (cópia)`, archivedAt: null, deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), fotos: copy.fotos.map(f => ({ ...f, id: generateId(), personId: id })), notas: copy.notas.map(n => ({ ...n, id: generateId() })) }; }

export function completeness(p: Person) {
  const fields: [string, boolean][] = [['Nome', !!p.nome.trim()], ['Descrição', !!p.descricao.trim() && !p.descricao.startsWith('Adicionado rapidamente')], ['Foto', p.fotos.length > 0], ['Categoria', !!p.localizacaoOnde], ['Contato', !!p.redesSociais], ['Avaliação', calculateOverallRating(p.rating) > 0], ['Localização', !!p.localizacaoMora], ['Tags', p.tags.length > 0]];
  return { percent: Math.round(fields.filter(([, v]) => v).length / fields.length * 100), missing: fields.filter(([, v]) => !v).map(([label]) => label) };
}
export function matchesSearch(p: Person, query: string, data: AppData) {
  const haystack = normalizeText([p.nome, p.apelido, p.redesSociais, p.localizacaoMora, locationLabel(p, data), p.descricao, ...(p.customFields || []).map(field => `${field.label} ${field.value}`), ...(p.attachments || []).map(item => item.label), ...p.tags].join(' '));
  return normalizeText(query).split(/\s+/).filter(Boolean).every(q => haystack.includes(q));
}
export function filterPeople(data: AppData, f: CatalogFilter) {
  return data.people.filter(p => {
    // Escopo das abas: cada uma mostra exatamente o que a contagem promete.
    if (f.scope === 'trash') { if (!p.deletedAt) return false; }
    else if (f.scope === 'archived') { if (!p.archivedAt || p.deletedAt) return false; }
    else if (f.scope === 'favorites') { if (!p.favorite || p.deletedAt) return false; }
    else if (!isActive(p)) return false;
    if (!matchesSearch(p, f.query, data)) return false;
    if (f.category && p.localizacaoOnde !== f.category) return false;
    if (f.subcategory && p.localizacaoSub !== f.subcategory) return false;
    if (f.tag && !p.tags.includes(f.tag)) return false;
    if (f.minimum && calculateOverallRating(p.rating) < f.minimum) return false;
    if (f.photo === 'with' && !p.fotos.length) return false;
    if (f.photo === 'without' && p.fotos.length) return false;
    if (f.incomplete && completeness(p).percent === 100) return false;
    if (f.hair && normalizeText([p.cabeloTipo, p.cabeloCor, p.cabeloCorCustom].join(' ')).indexOf(normalizeText(f.hair)) === -1) return false;
    if (f.height && p.altura !== f.height) return false;
    const age = p.idade ?? ageFromBirthday(p.aniversario);
    if (f.ageMin != null && (age === null || age < f.ageMin)) return false;
    if (f.ageMax != null && (age === null || age > f.ageMax)) return false;
    if (f.rarity && rarityFor(calculateOverallRating(p.rating)) !== f.rarity) return false;
    if (f.collection && !data.folders.find(folder => folder.id === f.collection)?.personIds.includes(p.id) && !data.collections.find(c => c.id === f.collection)?.personIds.includes(p.id)) return false;
    if (f.folderOnly && !data.folders.some(folder => folder.personIds.includes(p.id))) return false;
    return true;
  }).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || comparePeople(a, b, f.sort));
}
/** Ordenações do catálogo. Fichas fixadas sempre vêm antes, independentemente do critério. */
export function comparePeople(a: Person, b: Person, sort: CatalogFilter['sort']) {
  const byName = a.nome.localeCompare(b.nome, 'pt-BR');
  if (sort === 'rating') return getFinalScore(b) - getFinalScore(a) || byName;
  if (sort === 'name') return byName;
  if (sort === 'seen') return b.viHojeCount - a.viHojeCount || byName;
  if (sort === 'completeness') return completeness(a).percent - completeness(b).percent || byName;
  if (sort === 'age') { const ageA = a.idade ?? ageFromBirthday(a.aniversario), ageB = b.idade ?? ageFromBirthday(b.aniversario); return (ageA ?? 999) - (ageB ?? 999) || byName; }
  if (sort === 'lastSeen') return (a.ultimoVisto || '0000').localeCompare(b.ultimoVisto || '0000') || byName;
  if (sort === 'birthday') return (upcomingBirthday(a.aniversario) ?? 999) - (upcomingBirthday(b.aniversario) ?? 999) || byName;
  if (sort === 'updated') return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
  return b.createdAt.localeCompare(a.createdAt);
}
export function tierAllows(p: Person, list: TierList) {
  if (!isActive(p)) return false;
  if (!list.allowedCategories.includes('todas') && !list.allowedCategories.includes(p.localizacaoOnde)) return false;
  const subs = list.allowedSubcategories || ['todas'];
  if (subs.includes('todas') || !subs.length) return true;
  const scoped = subs.filter(s => s.startsWith(`${p.localizacaoOnde}::`));
  if (scoped.length) return scoped.includes(`${p.localizacaoOnde}::${p.localizacaoSub}`);
  if (subs.some(s => !s.includes('::'))) return subs.includes(p.localizacaoSub);
  return true;
}
export function findDuplicates(data: AppData) {
  const groups = new Map<string, Person[]>();
  const pairs = new Map<string, { id: string; a: Person; b: Person; reason: string }>();
  const ignored = new Set(data.ignoredDuplicates);
  for (const p of data.people.filter(p => !p.deletedAt)) {
    const name = normalizeText(p.nome), contact = normalizeText(p.redesSociais).replace(/[^a-z0-9@]/g, '');
    const phone = p.redesSociais.replace(/\D/g, '');
    const keys = [name ? `name:${name}` : '', contact.length >= 5 ? `contact:${contact}` : '', phone.length >= 10 && phone.length <= 15 ? `phone:${phone.slice(-11)}` : ''].filter(Boolean);
    keys.forEach(key => groups.set(key, [...(groups.get(key) || []), p]));
  }
  groups.forEach((people, key) => {
    for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
      const a = people[i], b = people[j], id = [a.id, b.id].sort().join('::');
      if (!ignored.has(id)) pairs.set(id, { id, a, b, reason: key.startsWith('name:') ? 'Mesmo nome' : 'Mesmo contato' });
    }
  });
  return [...pairs.values()];
}


// ---------------------------------------------------------------------------
// Fotos: impressão digital barata para achar duplicatas sem ler pixel a pixel.
// ---------------------------------------------------------------------------
export function photoHash(url: string): string {
  if (!url) return '';
  const sample = `${url.length}:${url.slice(0, 96)}:${url.slice(Math.max(0, url.length >> 1), (url.length >> 1) + 96)}:${url.slice(-64)}`;
  let h1 = 0x811c9dc5, h2 = 0x1000193;
  for (let i = 0; i < sample.length; i++) {
    h1 = Math.imul(h1 ^ sample.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + sample.charCodeAt(i) * (i + 7), 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}
export function findDuplicatePhotos(data: AppData) {
  const groups = new Map<string, Photo[]>();
  for (const photo of getAllPhotos(data)) {
    const hash = photo.hash || photoHash(photo.url);
    if (!hash) continue;
    groups.set(hash, [...(groups.get(hash) || []), photo]);
  }
  return [...groups.values()].filter(list => list.length > 1);
}

// ---------------------------------------------------------------------------
// Pastas: árvore, caminhos e contagens.
// ---------------------------------------------------------------------------
export const folderChildren = (data: AppData, parentId: string | null) => data.folders
  .filter(folder => (folder.parentId || null) === parentId)
  .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'pt-BR'));
export function folderDescendants(data: AppData, id: string): string[] {
  const found: string[] = []; const queue = [id]; let guard = 0;
  while (queue.length && guard++ < 500) {
    const current = queue.shift()!;
    for (const folder of data.folders) if (folder.parentId === current && !found.includes(folder.id)) { found.push(folder.id); queue.push(folder.id); }
  }
  return found;
}
export function folderPath(data: AppData, id: string): Folder[] {
  const path: Folder[] = []; let current = data.folders.find(folder => folder.id === id); let guard = 0;
  while (current && guard++ < 25) { path.unshift(current); current = current.parentId ? data.folders.find(folder => folder.id === current!.parentId) : undefined; }
  return path;
}
export function folderTotals(data: AppData, id: string) {
  const ids = [id, ...folderDescendants(data, id)];
  const empty = { people: 0, photos: 0, notes: 0, stories: 0 };
  const total = ids.reduce((acc, folderId) => {
    const items = allFolderItems(data, folderId);
    return { people: acc.people + items.people.length, photos: acc.photos + items.photos.length, notes: acc.notes + items.notes.length, stories: acc.stories + items.stories.length };
  }, empty);
  return { ...total, all: total.people + total.photos + total.notes + total.stories, subfolders: ids.length - 1 };
}
export const folderCover = (data: AppData, folder: Folder) => {
  const photos = allFolderItems(data, folder.id).photos;
  return photos.find(photo => photo.id === folder.coverPhotoId) || photos[0] || null;
};

// ---------------------------------------------------------------------------
// Datas, prazos e textos.
// ---------------------------------------------------------------------------
export function daysUntil(date?: string | null) {
  if (!date) return null;
  const target = new Date(`${date.slice(0, 10)}T12:00:00`);
  const now = new Date(`${today()}T12:00:00`);
  return Number.isFinite(target.getTime()) ? Math.round((target.getTime() - now.getTime()) / 86400000) : null;
}
export type DeadlineState = 'atrasado' | 'hoje' | 'amanha' | 'perto' | 'futuro' | 'sem-data';
export function deadlineState(date: string | null | undefined, leadDays = 3): { state: DeadlineState; days: number | null } {
  const days = daysUntil(date);
  if (days === null) return { state: 'sem-data', days: null };
  if (days < 0) return { state: 'atrasado', days };
  if (days === 0) return { state: 'hoje', days };
  if (days === 1) return { state: 'amanha', days };
  if (days <= Math.max(1, leadDays)) return { state: 'perto', days };
  return { state: 'futuro', days };
}
export const DEADLINE_LABELS: Record<DeadlineState, string> = { atrasado: 'Atrasado', hoje: 'Vence hoje', amanha: 'Vence amanhã', perto: 'Prazo acabando', futuro: 'Agendado', 'sem-data': 'Sem data' };
export function ageFromBirthday(aniversario?: string | null) {
  if (!aniversario) return null;
  const birth = new Date(`${aniversario}T12:00:00`);
  if (!Number.isFinite(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const before = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (before) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}
export function upcomingBirthday(aniversario?: string | null) {
  if (!aniversario) return null;
  const birth = new Date(`${aniversario}T12:00:00`);
  if (!Number.isFinite(birth.getTime())) return null;
  const now = new Date(`${today()}T12:00:00`);
  const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate(), 12);
  if (next < now) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}
export function textStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return { words, chars: content.length, minutes: Math.max(words ? 1 : 0, Math.round(words / 200)) };
}
export function storyText(story: Story) {
  return [story.conteudo, ...(story.chapters || []).map(chapter => `${chapter.title}\n${chapter.content}`)].filter(Boolean).join('\n\n');
}
export function weekKey(date = new Date()) {
  const copy = new Date(date.getTime());
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() + 4 - (copy.getDay() || 7));
  const start = new Date(copy.getFullYear(), 0, 1);
  return `${copy.getFullYear()}-S${String(Math.ceil(((copy.getTime() - start.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
export const monthLabel = (month: string) => {
  const [year, index] = month.split('-').map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
export function downloadJson(value: unknown, filename: string) { downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), filename); }
export function exportCsv(people: Person[], data: AppData) {
  const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[\s]*[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const rows = [['Nome', 'Apelido', 'Descrição', 'Categoria', 'Subcategoria', 'Localização', 'Contato', 'Tags', 'Nota geral', 'Pontos', 'Favorito', 'Situação', 'Última interação', 'Interações', 'Cadastro'], ...people.map(p => [p.nome, p.apelido, p.descricao, locationLabel(p, data, false), data.categories.find(c => c.value === p.localizacaoOnde)?.subs?.find(s => s.value === p.localizacaoSub)?.label || p.localizacaoSub, p.localizacaoMora, p.redesSociais, p.tags.join(', '), formatNumber(calculateOverallRating(p.rating)), formatNumber(getFinalScore(p)), p.favorite ? 'Sim' : 'Não', p.deletedAt ? 'Lixeira' : p.archivedAt ? 'Arquivado' : 'Ativo', p.ultimoVisto, p.viHojeCount, p.createdAt])];
  downloadBlob(new Blob(['\uFEFF', rows.map(r => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `catalog-resultados-${today()}.csv`);
}

export async function readImage(file: File, maxSize = 1440): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF.');
  if (file.size > 20 * 1024 * 1024) throw new Error('A imagem deve ter menos de 20 MB.');
  const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('Não foi possível ler a imagem.')); r.readAsDataURL(file); });
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { const scale = Math.min(1, maxSize / Math.max(img.width, img.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); const ctx = canvas.getContext('2d'); if (!ctx) return resolve(url); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/webp', 0.86)); }; img.onerror = () => reject(new Error('Esta imagem parece estar danificada.')); img.src = url; });
}

export function demoData(): AppData {
  const data = emptyData(); data.settings.profileName = 'Visitante';
  data.people = [['Marina Costa', '29', 'trabalho', 'marina', '5'], ['Clara Almeida', '27', 'conhecida', 'clara', '4.5'], ['Rafael Martins', '31', 'academia', 'rafael', '4'], ['Bianca Santos', '30', 'comunidade', 'bianca', '4.5']].map(([nome, age, cat, img, rate], i) => {
    const p = getDefaultPerson(); return { ...p, nome, idade: Number(age), descricao: ['Gosta de fotografia, boas conversas e descobrir cafés pela cidade.', 'Criativa e espontânea. Sempre tem uma boa indicação de livro.', 'Companhia das corridas de domingo. Apaixonado por música e viagens.', 'Uma presença tranquila e acolhedora. Adora cozinhar para os amigos.'][i], localizacaoOnde: cat, localizacaoSub: cat === 'comunidade' ? 'adulta' : '', localizacaoMora: ['Pinheiros, São Paulo', 'Vila Madalena, São Paulo', 'Perdizes, São Paulo', 'Bela Vista, São Paulo'][i], tags: i === 0 ? ['amiga', 'conhecida'] : ['amiga'], favorite: i < 2, rating: { ...p.rating, rosto: Number(rate), cabelo: Number(rate), comportamento: Number(rate), belezaGeral: Number(rate) }, fotos: [{ id: generateId(), personId: p.id, isMain: true, type: 'normal' as const, url: `/images/${img}.jpg`, name: `${nome}.jpg` }], createdAt: `${today()}T${String(10 + i).padStart(2, '0')}:00:00`, notas: [{ id: generateId(), title: 'Primeira impressão', content: 'Uma conversa leve que vale a pena recordar.', type: 'observacao' as const, date: today() }], viHojeCount: 2 + i, viHojeDates: [today(), addDays(today(), -i - 2)], ultimoVisto: today() };
  });
  data.people.forEach((person, index) => { person.fotos[0].url = DEMO_PORTRAITS[index]; });
  data.tierLists = [{ id: generateId(), nome: 'Pessoas especiais', tiers: ['Incríveis', 'Ótima companhia', 'Quero conhecer melhor'], items: data.people.slice(0, 3).map((p, i) => ({ personId: p.id, tier: i < 2 ? 'Incríveis' : 'Ótima companhia' })), allowedCategories: ['todas'], allowedSubcategories: ['todas'] }];
  data.reminders = [{ id: generateId(), personId: data.people[0].id, titulo: 'Combinar o café de sábado', data: addDays(today(), 2), concluido: false, createdAt: new Date().toISOString() }];
  data.collections = [{ id: generateId(), name: 'Boas companhias', color: PALETTE[0], personIds: data.people.slice(0, 2).map(p => p.id) }];
  data.stories = [{ id: generateId(), titulo: 'Uma tarde para lembrar', tipo: 'detalhada', personId: data.people[0].id, conteudo: 'A conversa começou com um café e terminou com uma lista de lugares para conhecer. Às vezes, os melhores momentos são os mais simples.', date: today() }];
  return data;
}