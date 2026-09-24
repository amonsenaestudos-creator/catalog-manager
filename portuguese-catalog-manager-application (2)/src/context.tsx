import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, CatalogFilter, Person, PersonDraft, Profile } from './types';
import { calculateOverallRating, DEFAULT_FILTER, demoData, duplicatePerson, emptyData, generateId, getAllTagNames, makeActivity, normalizePhotos, PALETTE, today, valoresDaAvaliacao } from './store';
import { DEFAULT_PROFILE, deleteProfileData, loadProfiles, persistData, pushBackup, readStoredData, saveProfiles, writeJournal } from './lib/storage';
import { computeXp, evaluateAchievements, levelInfo, weeklyChallenges } from './lib/progress';
import { newNotifications, pushBrowserNotification } from './lib/notifications';
import { configureSound, playSound, primeSound, vibrate } from './lib/sound';
import type { SoundName } from './lib/sound';

type Notice = { message: string; error?: boolean } | null;
type Mutator = (data: AppData) => AppData;
type SaveStatus = 'saved' | 'saving' | 'pending' | 'error';
export type Celebration = { id: string; kind: 'conquista' | 'nivel'; title: string; description: string; level?: number };
interface CatalogContext {
  data: AppData;
  ready: boolean;
  authenticated: boolean;
  demo: boolean;
  page: string;
  filter: CatalogFilter;
  setFilter: (f: CatalogFilter) => void;
  navigate: (page: string, scope?: CatalogFilter['scope']) => void;
  selectedId: string | null;
  openPerson: (p: Person | string, opts?: { editar?: boolean; aba?: string }) => void;
  /** Pedido de abertura da ficha: abrir direto na edição ou numa aba específica. */
  openRequest: { editar?: boolean; aba?: string } | null;
  setOpenRequest: (r: { editar?: boolean; aba?: string } | null) => void;
  closePerson: () => void;
  /** Conversa aberta na aba Conversas (null = lista de conversas). */
  chatPersonId: string | null;
  openChat: (p: Person | string) => void;
  closeChat: () => void;
  quickOpen: boolean;
  setQuickOpen: (v: boolean) => void;
  compareIds: string[] | null;
  setCompareIds: (ids: string[] | null) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  privacy: boolean;
  setPrivacy: (v: boolean) => void;
  panic: boolean;
  setPanic: (v: boolean) => void;
  blur: boolean;
  setBlur: (v: boolean) => void;
  commit: (updater: Mutator, message?: string, undoable?: boolean) => void;
  savePerson: (p: Person, draftId?: string) => boolean;
  saveDraft: (draft: PersonDraft) => void;
  discardDraft: (id: string) => void;
  changePeople: (ids: string[], patch: Partial<Person>, message: string) => void;
  trashPeople: (ids: string[]) => void;
  restorePeople: (ids: string[]) => void;
  deletePermanently: (ids: string[], keepPhotos: boolean) => void;
  duplicate: (p: Person) => void;
  seenToday: (ids: string[]) => void;
  login: (u: string, p: string, remember: boolean, profileId?: string) => boolean;
  logout: () => void;
  enterDemo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  status: SaveStatus;
  lastSavedAt: string;
  retrySave: () => void;
  notice: Notice;
  notify: (message: string, error?: boolean) => void;
  dismissNotice: () => void;
  // Novidades
  xp: number;
  level: ReturnType<typeof levelInfo>;
  achievements: ReturnType<typeof evaluateAchievements>;
  unread: number;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  checkAlerts: (announce?: boolean) => void;
  profiles: Profile[];
  createProfile: (name: string) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  swipe: (personId: string, direction: 'like' | 'pass') => void;
  duel: (winnerId: string, loserId: string) => void;
  togglePhotoFavorite: (photoId: string) => void;
  vaultUnlocked: boolean;
  unlockVault: (pin: string) => boolean;
  lockVault: () => void;
  splash: string | null;
  dismissSplash: () => void;
  addXp: (amount: number, reason?: string) => void;
  // Sons, comemorações e brincadeiras
  sound: (name: SoundName) => void;
  buzz: (pattern?: number | number[]) => void;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  rouletteOpen: boolean;
  setRouletteOpen: (v: boolean) => void;
  togglePinned: (id: string) => void;
}
const Context = createContext<CatalogContext | null>(null);
export function useCatalog() { const context = useContext(Context); if (!context) throw new Error('CatalogProvider ausente.'); return context; }

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false), original = useRef<AppData | null>(null);
  const [page, setPage] = useState('home');
  const [filter, setFilter] = useState<CatalogFilter>({ ...DEFAULT_FILTER });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<{ editar?: boolean; aba?: string } | null>(null);
  const [chatPersonId, setChatPersonId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[] | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [privacy, privacyState] = useState(false);
  const [panic, panicState] = useState(false);
  const [blur, blurState] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [splash, setSplash] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const celebrationQueue = useRef<Celebration[]>([]);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false), saving = useRef(false);
  const chain = useRef(Promise.resolve());
  const past = useRef<AppData[]>([]), future = useRef<AppData[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  void historyVersion;

  const notify = useCallback((message: string, error = false) => { setNotice({ message, error }); if (noticeTimer.current) clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(null), error ? 9000 : 4500); }, []);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (demoRef.current || !pending.current) return;
    const snapshot = current.current; pending.current = false; saving.current = true; setStatus('saving');
    chain.current = chain.current.catch(() => undefined).then(() => persistData(snapshot)).then(() => {
      saving.current = false;
      if (current.current.updatedAt === snapshot.updatedAt) { setStatus('saved'); setLastSavedAt(new Date().toISOString()); }
    }).catch((error: Error) => { saving.current = false; pending.current = true; setStatus('error'); notify(error.message || 'Falha ao salvar. Exporte uma cópia antes de fechar.', true); });
  }, [notify]);

  const stage = useCallback((next: AppData) => {
    const stamp = Math.max(Date.now(), (Date.parse(current.current.updatedAt || '') || 0) + 1);
    next = { ...next, schemaVersion: 6, updatedAt: new Date(stamp).toISOString() };
    current.current = next; setData(next);
    if (demoRef.current) { setStatus('saved'); return; }
    pending.current = true; setStatus('pending');
    writeJournal(next); // a cópia de emergência é limitada e escrita com intervalo
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  }, [flush]);
  const commit = useCallback((updater: Mutator, message?: string, undoable = true) => {
    const previous = current.current; let next = updater(previous);
    if (next === previous) return;
    if (undoable) { past.current = [...past.current.slice(-19), previous]; future.current = []; setHistoryVersion(v => v + 1); }
    if (message) next = { ...next, activity: [makeActivity(message), ...next.activity].slice(0, 100) };
    stage(next);
    if (message) notify(message);
  }, [notify, stage]);

  useEffect(() => {
    let mounted = true;
    Promise.all([readStoredData(), loadProfiles()]).then(([{ data, warning }, storedProfiles]) => {
      if (!mounted) return;
      current.current = data; setData(data); setProfiles(storedProfiles); setReady(true);
      try { setAuthenticated(localStorage.getItem('catalog_remember') === 'true' || sessionStorage.getItem('catalog_session') === 'true'); } catch { /* Login is still available when session storage is blocked. */ }
      privacyState(!!data.settings.privacy || !!data.settings.pinEnabled);
      blurState(!!data.settings.blurMode);
      if (data.settings.splash) {
        const pool = data.people.filter(person => !person.deletedAt).flatMap(person => person.fotos.map(photo => photo.url)).filter(Boolean);
        if (pool.length) setSplash(pool[Math.floor(Math.random() * pool.length)]);
      }
      setLastSavedAt(data.updatedAt || '');
      if (warning) notify(warning, true);
    }).catch(() => { if (mounted) { setData(emptyData()); setReady(true); notify('Não foi possível ler os dados salvos. Comece com um catálogo vazio ou importe um backup.', true); } });
    return () => { mounted = false; };
  }, [notify]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') { writeJournal(current.current, true); flush(); } };
    const leave = (event: BeforeUnloadEvent) => {
      if (demoRef.current || !pending.current) return;
      // Só seguramos a aba enquanto a gravação principal estiver em andamento.
      // Antes o app bloqueava o fechamento sempre que a cópia local não cabia.
      if (saving.current) { event.preventDefault(); event.returnValue = ''; }
      writeJournal(current.current, true);
      flush();
    };
    document.addEventListener('visibilitychange', hide); window.addEventListener('beforeunload', leave);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('beforeunload', leave); if (timer.current) clearTimeout(timer.current); writeJournal(current.current, true); flush(); };
  }, [flush]);
  useEffect(() => {
    if (!authenticated || demo || !data.people.length) return;
    try {
      if (localStorage.getItem('catalog_last_autobackup') === today()) return;
      localStorage.setItem('catalog_last_autobackup', today());
      pushBackup(current.current).catch(() => { try { localStorage.removeItem('catalog_last_autobackup'); } catch { /* Noncritical metadata. */ } notify('O backup diário não pôde ser criado. Seus dados principais não foram alterados.', true); });
    } catch { /* The manual backup remains available. */ }
  }, [authenticated, demo, data.people.length, notify]);

  // ---------------------------------------------------------------------------
  // Sons de interface: ligados por padrão, silenciados no disfarce, no pânico e na privacidade.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    configureSound({ enabled: data.settings.sounds !== false && !data.settings.reducedMotion, muted: blur || panic || privacy || !authenticated, volume: Math.max(0, Math.min(1, (data.settings.soundVolume ?? 55) / 100)) });
  }, [data.settings.sounds, data.settings.reducedMotion, data.settings.soundVolume, blur, panic, privacy, authenticated]);
  useEffect(() => { if (authenticated) primeSound(); }, [authenticated]);
  const sound = useCallback((name: SoundName) => { playSound(name); }, []);
  const buzz = useCallback((pattern: number | number[] = 12) => { if (current.current.settings.haptics !== false) vibrate(pattern); }, []);
  const pushCelebration = useCallback((item: Celebration) => {
    if (demoRef.current) return;
    celebrationQueue.current = [...celebrationQueue.current, item];
    setCelebration(active => active || celebrationQueue.current.shift() || null);
  }, []);
  const dismissCelebration = useCallback(() => setCelebration(() => celebrationQueue.current.shift() || null), []);

  // ---------------------------------------------------------------------------
  // Sequência de dias, notificações e conquistas.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready || demo) return;
    const stamp = today();
    if (current.current.progress.lastActive === stamp) return;
    const yesterday = new Date(`${stamp}T12:00:00`); yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = current.current.progress.lastActive === yesterday.toISOString().slice(0, 10);
    commit(d => ({
      ...d,
      progress: { ...d.progress, lastActive: stamp, streak: { last: stamp, count: isYesterday ? d.progress.streak.count + 1 : 1 } },
    }), undefined, false);
  }, [ready, demo, commit]);

  const checkAlerts = useCallback((announce = true) => {
    if (demoRef.current) return;
    const snapshot = current.current;
    const { items, keys } = newNotifications(snapshot);
    if (Object.keys(keys).length) {
      commit(d => ({ ...d, progress: { ...d.progress, notified: { ...d.progress.notified, ...keys } } }), undefined, false);
    }
    if (!items.length) return;
    commit(d => ({ ...d, notifications: [...items, ...d.notifications].slice(0, 120) }), undefined, false);
    if (announce) {
      const urgent = items.find(item => item.kind === 'prazo' || item.kind === 'lembrete') || items[0];
      notify(`${items.length} ${items.length === 1 ? 'aviso novo' : 'avisos novos'}: ${urgent.title}`);
      if (current.current.settings.browserNotifications) pushBrowserNotification(urgent.title, urgent.body);
    }
  }, [commit, notify]);

  useEffect(() => {
    if (!ready || !authenticated || demo) return;
    checkAlerts(false);
    const interval = setInterval(() => checkAlerts(false), 60000);
    return () => clearInterval(interval);
  }, [ready, authenticated, demo, checkAlerts]);

  useEffect(() => {
    if (!ready || demo) return;
    const fresh = evaluateAchievements(current.current).filter(entry => entry.isNew);
    if (!fresh.length) return;
    const stamp = new Date().toISOString();
    commit(d => ({
      ...d,
      progress: { ...d.progress, achievements: { ...d.progress.achievements, ...Object.fromEntries(fresh.map(entry => [entry.def.id, stamp])) } },
      notifications: [...fresh.map(entry => ({ id: `conquista:${entry.def.id}`, title: `Conquista: ${entry.def.title}`, body: entry.def.description, kind: 'conquista' as const, date: stamp, read: false })), ...d.notifications].slice(0, 120),
    }), undefined, false);
    playSound('achievement');
    if (current.current.settings.confetti === false) { notify(`Conquista desbloqueada: ${fresh[0].def.title}`); return; }
    // Várias de uma vez (dados antigos, importação) viram um cartão só, em vez de uma fila de dois minutos.
    if (fresh.length === 1) pushCelebration({ id: `conquista:${fresh[0].def.id}:${stamp}`, kind: 'conquista', title: fresh[0].def.title, description: fresh[0].def.description });
    else pushCelebration({ id: `conquistas:${stamp}`, kind: 'conquista', title: `${fresh.length} conquistas de uma vez`, description: fresh.map(entry => entry.def.title).join(' · ') });
  }, [data, ready, demo, commit, notify, pushCelebration]);

  // Desafios da semana: quando a barra enche, o desafio entra na lista de concluídos (e rende XP uma vez só).
  useEffect(() => {
    if (!ready || demo) return;
    const { week, challenges } = weeklyChallenges(current.current);
    const stored = current.current.progress.challenges;
    const done = stored.week === week ? stored.done : [];
    const finished = challenges.filter(challenge => challenge.progress >= challenge.target && !done.includes(challenge.id)).map(challenge => challenge.id);
    if (!finished.length && stored.week === week) return;
    commit(d => ({ ...d, progress: { ...d.progress, xp: d.progress.xp + finished.length * 30, challenges: { week, done: [...done, ...finished] } } }), undefined, false);
    if (finished.length) { notify(`Desafio da semana concluído: +${finished.length * 30} XP`); playSound('success'); }
  }, [data, ready, demo, commit, notify]);

  // Lixeira automática: fichas apagadas há mais dias que o limite dos Ajustes saem de vez (fotos viram avulsas).
  useEffect(() => {
    if (!ready || !authenticated || demo) return;
    const days = current.current.settings.trashAutoCleanDays || 0;
    if (!days) return;
    const cutoff = Date.now() - days * 86400000;
    const expired = current.current.people.filter(p => p.deletedAt && (Date.parse(p.deletedAt) || Date.now()) < cutoff).map(p => p.id);
    if (!expired.length) return;
    commit(d => ({
      ...d,
      people: d.people.filter(p => !expired.includes(p.id)),
      orphanPhotos: [...d.orphanPhotos, ...d.people.filter(p => expired.includes(p.id)).flatMap(p => p.fotos.map(f => ({ ...f, personId: null, isMain: false })))],
      stories: d.stories.map(s => expired.includes(s.personId || '') ? { ...s, personId: null } : s),
      reminders: d.reminders.map(r => expired.includes(r.personId || '') ? { ...r, personId: null } : r),
      tierLists: d.tierLists.map(t => ({ ...t, items: t.items.filter(i => !expired.includes(i.personId)) })),
      collections: d.collections.map(c => ({ ...c, personIds: c.personIds.filter(id => !expired.includes(id)) })),
      notifications: [{ id: `lixeira:limpa:${Date.now()}`, title: `${expired.length} ficha(s) removida(s) da lixeira`, body: `Estavam na lixeira há mais de ${days} dias. As fotos foram mantidas como avulsas na galeria.`, kind: 'sistema' as const, date: new Date().toISOString(), read: false }, ...d.notifications].slice(0, 120),
    }), undefined, false);
  }, [ready, authenticated, demo, data.people.length, data.settings.trashAutoCleanDays, commit]);

  const navigate = useCallback((page: string, scope?: CatalogFilter['scope']) => { setPage(page); if (scope) setFilter({ ...DEFAULT_FILTER, scope }); window.scrollTo({ top: 0 }); }, []);
  // Aba Conversas: abre a pessoa certa direto do fichário, da ficha ou do catálogo.
  const closeChat = useCallback(() => setChatPersonId(null), []);
  const openChat = useCallback((person: Person | string) => {
    const id = typeof person === 'string' ? person : person.id;
    const alvo = current.current.people.find(p => p.id === id);
    if (alvo?.deletedAt) { navigate('catalog', 'trash'); notify('Esta ficha está na lixeira. Restaure para conversar.'); return; }
    if (!alvo) { notify('Ficha não encontrada.', true); return; }
    setChatPersonId(id);
    navigate('conversas');
  }, [navigate, notify]);
  useEffect(() => {
    setFilter(f => {
      const category = data.categories.find(c => c.value === f.category);
      const next = {
        ...f,
        category: !f.category || category ? f.category : '',
        subcategory: !f.subcategory || category?.subs?.some(s => s.value === f.subcategory) ? f.subcategory : '',
        tag: !f.tag || getAllTagNames(data).includes(f.tag) ? f.tag : '',
        collection: !f.collection || data.collections.some(c => c.id === f.collection) || data.folders.some(folder => folder.id === f.collection) ? f.collection : '',
      };
      return next.category === f.category && next.subcategory === f.subcategory && next.tag === f.tag && next.collection === f.collection ? f : next;
    });
  }, [data.categories, data.collections, data.settings.customTags, data.people]);
  const openPerson = useCallback((person: Person | string, opts?: { editar?: boolean; aba?: string }) => { const id = typeof person === 'string' ? person : person.id; const p = current.current.people.find(p => p.id === id); if (p?.deletedAt) { navigate('catalog', 'trash'); notify('Esta ficha está na lixeira. Restaure para editar.'); return; } if (p) { setOpenRequest(opts?.editar || opts?.aba ? { editar: opts.editar, aba: opts.aba } : null); setSelectedId(id); } }, [navigate, notify]);
  const changePeople = useCallback((ids: string[], patch: Partial<Person>, message: string) => { commit(d => ({ ...d, people: d.people.map(p => ids.includes(p.id) ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p) }), message); }, [commit]);
  const savePerson = useCallback((p: Person, draftId?: string) => {
    if (!p.nome.trim() || !p.descricao.trim()) { notify('Preencha o nome e a descrição.', true); return false; }
    if (p.idade !== null && (!Number.isInteger(p.idade) || p.idade < 0 || p.idade > 120)) { notify('Informe uma idade inteira entre 0 e 120 anos, ou deixe em branco.', true); return false; }
    const before = calculateOverallRating(p.rating);
    const comment = (p.ratingComment || '').trim() || undefined;
    commit(d => {
      const previous = d.people.find(x => x.id === p.id);
      // A avaliação entra no histórico quando a nota anda (≥0,1) ou a
      // observação muda — a anterior nunca é perdida, só ganha companhia.
      const historyChanged = !!previous && (Math.abs(calculateOverallRating(previous.rating) - before) >= 0.1
        || comment !== ((previous.ratingComment || '').trim() || undefined));
      const person: Person = {
        ...p, nome: p.nome.trim(), descricao: p.descricao.trim(), rating: { ...p.rating, overall: before }, fotos: normalizePhotos(p.fotos, p.id), updatedAt: new Date().toISOString(),
        ratingHistory: historyChanged
          ? [...(p.ratingHistory || []), { date: today(), overall: before, comment, values: valoresDaAvaliacao(p.rating) }].slice(-40)
          : (p.ratingHistory || []),
      };
      const drafts = { ...d.drafts }; if (draftId) delete drafts[draftId];
      return { ...d, drafts, people: previous ? d.people.map(x => x.id === person.id ? person : x) : [person, ...d.people], locations: [...new Set([...d.locations, person.localizacaoMora].filter(Boolean))] };
    }, 'Ficha salva com sucesso.');
    return true;
  }, [commit, notify]);
  const saveDraft = useCallback((draft: PersonDraft) => commit(d => ({ ...d, drafts: { ...d.drafts, [draft.id]: draft } }), undefined, false), [commit]);
  const discardDraft = useCallback((id: string) => commit(d => { const drafts = { ...d.drafts }; delete drafts[id]; return { ...d, drafts }; }, undefined, false), [commit]);
  const trashPeople = useCallback((ids: string[]) => { changePeople(ids, { deletedAt: new Date().toISOString() }, `${ids.length} ficha(s) movida(s) para a lixeira. Tudo foi preservado.`); playSound('swoosh'); if (ids.includes(selectedId || '')) setSelectedId(null); }, [changePeople, selectedId]);
  const restorePeople = useCallback((ids: string[]) => changePeople(ids, { deletedAt: null }, 'Fichas restauradas com fotos, notas e vínculos.'), [changePeople]);
  const deletePermanently = useCallback((ids: string[], keepPhotos: boolean) => {
    commit(d => ({ ...d, people: d.people.filter(p => !ids.includes(p.id)), orphanPhotos: keepPhotos ? [...d.orphanPhotos, ...d.people.filter(p => ids.includes(p.id)).flatMap(p => p.fotos.map(f => ({ ...f, personId: null, isMain: false })))] : d.orphanPhotos, stories: d.stories.map(s => ids.includes(s.personId || '') ? { ...s, personId: null } : s), reminders: d.reminders.map(r => ids.includes(r.personId || '') ? { ...r, personId: null } : r), tierLists: d.tierLists.map(t => ({ ...t, items: t.items.filter(i => !ids.includes(i.personId)) })), collections: d.collections.map(c => ({ ...c, personIds: c.personIds.filter(id => !ids.includes(id)) })), drafts: Object.fromEntries(Object.entries(d.drafts).filter(([, draft]) => !ids.includes(draft.personId || ''))) }), 'Exclusão definitiva concluída.', false);
    past.current = []; future.current = []; setHistoryVersion(v => v + 1);
  }, [commit]);
  const duplicate = useCallback((p: Person) => { const copy = duplicatePerson(p); commit(d => ({ ...d, people: [copy, ...d.people] }), 'Cópia independente da ficha criada.'); setSelectedId(copy.id); }, [commit]);
  const seenToday = useCallback((ids: string[]) => commit(d => ({ ...d, people: d.people.map(p => ids.includes(p.id) ? { ...p, ultimoVisto: today(), viHojeCount: p.viHojeCount + 1, viHojeDates: [...p.viHojeDates, today()], updatedAt: new Date().toISOString() } : p) }), 'Interação registrada no calendário.'), [commit]);
  const undo = useCallback(() => { const previous = past.current.pop(); if (!previous) return; future.current.push(current.current); stage({ ...previous, drafts: current.current.drafts }); setHistoryVersion(v => v + 1); notify('Última alteração desfeita.'); playSound('swoosh'); }, [stage, notify]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next) return; past.current.push(current.current); stage({ ...next, drafts: current.current.drafts }); setHistoryVersion(v => v + 1); notify('Alteração refeita.'); }, [stage, notify]);
  const setPrivacy = useCallback((v: boolean) => { privacyState(v); commit(d => ({ ...d, settings: { ...d.settings, privacy: v } }), undefined, false); }, [commit]);
  const setPanic = useCallback((v: boolean) => { panicState(v); if (v) { setSelectedId(null); setQuickOpen(false); setCommandOpen(false); setCompareIds(null); setNotificationsOpen(false); setRouletteOpen(false); privacyState(true); } }, []);
  const setBlur = useCallback((v: boolean) => { blurState(v); commit(d => ({ ...d, settings: { ...d.settings, blurMode: v } }), undefined, false); }, [commit]);

  const login = (username: string, password: string, remember: boolean, profileId?: string) => {
    const settings = current.current.settings;
    if (username.trim() !== settings.username || password !== settings.password) return false;
    try { sessionStorage.setItem('catalog_session', 'true'); if (remember) localStorage.setItem('catalog_remember', 'true'); else localStorage.removeItem('catalog_remember'); if (profileId) sessionStorage.setItem('catalog_profile', profileId); } catch { notify('Não foi possível lembrar esta sessão.', true); }
    commit(d => ({ ...d, settings: { ...d.settings, rememberLogin: remember } }), undefined, false);
    setAuthenticated(true);
    return true;
  };
  const logout = () => {
    if (!demoRef.current && pending.current && saving.current) {
      flush();
      notify('Aguarde a gravação terminar antes de sair. Se houver falha, baixe um backup em Ajustes.', true);
      return;
    }
    writeJournal(current.current, true); flush();
    setAuthenticated(false); setQuickOpen(false); setCompareIds(null); setCommandOpen(false); setSelectedId(null); setPage('home');
    setVaultUnlocked(false); setNotificationsOpen(false); setSplash(null); setRouletteOpen(false); setCelebration(null); celebrationQueue.current = [];
    if (demoRef.current && original.current) { current.current = original.current; setData(original.current); demoRef.current = false; setDemo(false); pending.current = false; setStatus('saved'); }
    past.current = []; future.current = []; privacyState(false); panicState(false);
    try { sessionStorage.removeItem('catalog_session'); localStorage.removeItem('catalog_remember'); } catch { /* The in-memory session has already ended. */ }
  };
  const enterDemo = () => { original.current = current.current; demoRef.current = true; setDemo(true); const sample = demoData(); current.current = sample; setData(sample); setAuthenticated(true); privacyState(false); setStatus('saved'); };

  // ---------------------------------------------------------------------------
  // Multi-perfis reais: cada perfil tem seu próprio catálogo no IndexedDB.
  // ---------------------------------------------------------------------------
  const createProfile = useCallback(async (name: string) => {
    const clean = name.trim() || 'Novo catálogo';
    const profile: Profile = { id: generateId(), name: clean, color: PALETTE[(profiles.length) % PALETTE.length], createdAt: new Date().toISOString() };
    const fresh = { ...emptyData(), activeProfile: profile.id, profiles: [...profiles, profile], settings: { ...emptyData().settings, profileName: clean } };
    await persistData(fresh);
    const next = [...profiles, profile];
    setProfiles(next); await saveProfiles(next);
    notify(`Perfil "${clean}" criado. Ele começa vazio e separado do atual.`);
  }, [profiles, notify]);

  const switchProfile = useCallback(async (id: string) => {
    if (id === current.current.activeProfile || demoRef.current) return;
    writeJournal(current.current, true); flush();
    await chain.current.catch(() => undefined);
    const { data: loaded, warning } = await readStoredData(id);
    const withProfile = { ...loaded, activeProfile: id, profiles: profiles.length ? profiles : loaded.profiles };
    current.current = withProfile; setData(withProfile);
    past.current = []; future.current = []; setHistoryVersion(v => v + 1);
    pending.current = false; setStatus('saved'); setLastSavedAt(withProfile.updatedAt || '');
    setVaultUnlocked(false); setSelectedId(null); setPage('home');
    notify(warning ? `${warning} Perfil carregado com a cópia disponível.` : `Você agora está em "${withProfile.profiles.find(p => p.id === id)?.name || 'outro perfil'}".`);
  }, [flush, profiles, notify]);

  const removeProfile = useCallback(async (id: string) => {
    if (id === DEFAULT_PROFILE || id === current.current.activeProfile || profiles.length <= 1) { notify('Este perfil não pode ser removido agora.', true); return; }
    await deleteProfileData(id);
    const next = profiles.filter(profile => profile.id !== id);
    setProfiles(next); await saveProfiles(next);
    notify('Perfil removido deste dispositivo.');
  }, [profiles, notify]);

  // ---------------------------------------------------------------------------
  // Interações rápidas: swipe, duelos, fotos favoritas e XP.
  // ---------------------------------------------------------------------------
  const swipe = useCallback((personId: string, direction: 'like' | 'pass') => {
    commit(d => ({ ...d, progress: { ...d.progress, swipes: { ...d.progress.swipes, [personId]: direction } }, people: direction === 'like' ? d.people.map(p => p.id === personId ? { ...p, favorite: true } : p) : d.people }), direction === 'like' ? 'Adicionada aos favoritos.' : undefined, false);
    playSound(direction === 'like' ? 'like' : 'pass');
    if (current.current.settings.haptics !== false) vibrate(direction === 'like' ? [10, 30, 18] : 8);
  }, [commit]);
  const duel = useCallback((winnerId: string, loserId: string) => {
    commit(d => ({ ...d, progress: { ...d.progress, duels: [...d.progress.duels, { id: generateId(), winnerId, loserId, date: today() }].slice(-200) } }), undefined, false);
    playSound('thud');
  }, [commit]);
  const togglePhotoFavorite = useCallback((photoId: string) => {
    commit(d => {
      const flip = (photos: typeof d.orphanPhotos) => photos.map(photo => photo.id === photoId ? { ...photo, favorite: !photo.favorite } : photo);
      return { ...d, orphanPhotos: flip(d.orphanPhotos), people: d.people.map(person => ({ ...person, fotos: flip(person.fotos) })) };
    }, undefined, false);
    playSound('pop');
  }, [commit]);
  const addXp = useCallback((amount: number, reason?: string) => {
    if (!amount) return;
    commit(d => ({ ...d, progress: { ...d.progress, xp: Math.max(0, d.progress.xp + amount) } }), reason, false);
  }, [commit]);
  const unlockVault = useCallback((pin: string) => {
    const vault = current.current.vault;
    if (!vault.pin) { setVaultUnlocked(true); return true; }
    if (vault.pin === pin.replace(/\D/g, '')) { setVaultUnlocked(true); playSound('unlock'); return true; }
    playSound('error');
    return false;
  }, []);
  const lockVault = useCallback(() => setVaultUnlocked(false), []);
  const dismissSplash = useCallback(() => setSplash(null), []);
  const markNotificationRead = useCallback((id: string) => commit(d => ({ ...d, notifications: d.notifications.map(item => item.id === id ? { ...item, read: true } : item) }), undefined, false), [commit]);
  const markAllNotificationsRead = useCallback(() => commit(d => ({ ...d, notifications: d.notifications.map(item => ({ ...item, read: true })) }), undefined, false), [commit]);
  const clearNotifications = useCallback(() => commit(d => ({ ...d, notifications: [] }), 'Avisos limpos.', false), [commit]);

  const achievements = useMemo(() => evaluateAchievements(data), [data]);
  const xp = useMemo(() => computeXp(data) + data.progress.xp, [data]);
  const level = useMemo(() => levelInfo(xp), [xp]);
  const unread = useMemo(() => data.notifications.filter(item => !item.read).length, [data.notifications]);
  const lastLevel = useRef<number | null>(null), settledAt = useRef(0);
  useEffect(() => {
    if (!ready || !authenticated || demo) { lastLevel.current = null; return; }
    if (lastLevel.current === null) { lastLevel.current = level.level; settledAt.current = Date.now(); return; }
    // Saltos logo após abrir (conquistas antigas sendo carimbadas) não contam como festa.
    if (level.level > lastLevel.current && Date.now() - settledAt.current > 2500) {
      const key = `nivel:${level.level}`;
      if (!current.current.progress.celebrated?.[key]) {
        commit(d => ({ ...d, progress: { ...d.progress, celebrated: { ...(d.progress.celebrated || {}), [key]: new Date().toISOString() } } }), undefined, false);
        playSound('levelup');
        if (current.current.settings.confetti === false) notify(`Você subiu para o nível ${level.level}: ${level.title}.`);
        else pushCelebration({ id: key, kind: 'nivel', title: `Nível ${level.level}`, description: level.title, level: level.level });
      }
    }
    lastLevel.current = level.level;
  }, [level.level, level.title, ready, authenticated, demo, commit, notify, pushCelebration]);
  const togglePinned = useCallback((id: string) => {
    const person = current.current.people.find(p => p.id === id);
    if (!person) return;
    commit(d => ({ ...d, people: d.people.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p) }), person.pinned ? 'Ficha solta do topo.' : 'Ficha fixada no topo do catálogo.');
  }, [commit]);

  return <Context.Provider value={{
    data, ready, authenticated, demo, page, filter, setFilter, navigate, selectedId, openPerson, openRequest, setOpenRequest, closePerson: () => setSelectedId(null), chatPersonId, openChat, closeChat,
    quickOpen, setQuickOpen, compareIds, setCompareIds, commandOpen, setCommandOpen, privacy, setPrivacy, panic, setPanic, blur, setBlur,
    commit, savePerson, saveDraft, discardDraft, changePeople, trashPeople, restorePeople, deletePermanently, duplicate, seenToday,
    login, logout, enterDemo, undo, redo, canUndo: !!past.current.length, canRedo: !!future.current.length, status, lastSavedAt, retrySave: flush,
    notice, notify, dismissNotice: () => setNotice(null),
    xp, level, achievements, unread, notificationsOpen, setNotificationsOpen, markNotificationRead, markAllNotificationsRead, clearNotifications, checkAlerts,
    profiles, createProfile, switchProfile, removeProfile, swipe, duel, togglePhotoFavorite,
    vaultUnlocked, unlockVault, lockVault, splash, dismissSplash, addXp,
    sound, buzz, celebration, dismissCelebration, rouletteOpen, setRouletteOpen, togglePinned,
  }}>{children}</Context.Provider>;
}

