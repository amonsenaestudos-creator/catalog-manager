import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, CatalogFilter, Person, PersonDraft } from './types';
import { calculateOverallRating, DEFAULT_FILTER, demoData, duplicatePerson, emptyData, getAllTagNames, makeActivity, normalizePhotos, today } from './store';
import { persistData, pushBackup, readStoredData, writeJournal } from './lib/storage';

type Notice = { message: string; error?: boolean } | null;
type Mutator = (data: AppData) => AppData;
type SaveStatus = 'saved' | 'saving' | 'pending' | 'error';
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
  openPerson: (p: Person | string) => void;
  closePerson: () => void;
  quickOpen: boolean;
  setQuickOpen: (v: boolean) => void;
  compareIds: string[] | null;
  setCompareIds: (ids: string[] | null) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  privacy: boolean;
  setPrivacy: (v: boolean) => void;
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
  login: (u: string, p: string, remember: boolean) => boolean;
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[] | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [privacy, privacyState] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
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
    next = { ...next, schemaVersion: 5, updatedAt: new Date(stamp).toISOString() };
    current.current = next; setData(next);
    if (demoRef.current) { setStatus('saved'); return; }
    pending.current = true; setStatus('pending'); writeJournal(next);
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
    readStoredData().then(({ data, warning }) => {
      if (!mounted) return;
      current.current = data; setData(data); setReady(true);
      try { setAuthenticated(localStorage.getItem('catalog_remember') === 'true' || sessionStorage.getItem('catalog_session') === 'true'); } catch { /* Login is still available when session storage is blocked. */ }
      privacyState(!!data.settings.privacy || !!data.settings.pinEnabled);
      setLastSavedAt(data.updatedAt || '');
      if (warning) notify(warning, true);
    });
    return () => { mounted = false; };
  }, [notify]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    const leave = (event: BeforeUnloadEvent) => {
      if (!pending.current && !saving.current || demoRef.current) return;
      if (!writeJournal(current.current)) { event.preventDefault(); event.returnValue = ''; }
      flush();
    };
    document.addEventListener('visibilitychange', hide); window.addEventListener('beforeunload', leave);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('beforeunload', leave); if (timer.current) clearTimeout(timer.current); flush(); };
  }, [flush]);
  useEffect(() => {
    if (!authenticated || demo || !data.people.length) return;
    try {
      if (localStorage.getItem('catalog_last_autobackup') === today()) return;
      localStorage.setItem('catalog_last_autobackup', today());
      pushBackup(current.current).catch(() => { try { localStorage.removeItem('catalog_last_autobackup'); } catch { /* Noncritical metadata. */ } notify('O backup diário não pôde ser criado. Seus dados principais não foram alterados.', true); });
    } catch { /* The manual backup remains available. */ }
  }, [authenticated, demo, data.people.length, notify]);

  const navigate = useCallback((page: string, scope?: CatalogFilter['scope']) => { setPage(page); if (scope) setFilter({ ...DEFAULT_FILTER, scope }); window.scrollTo({ top: 0 }); }, []);
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
  const openPerson = useCallback((person: Person | string) => { const id = typeof person === 'string' ? person : person.id; const p = current.current.people.find(p => p.id === id); if (p?.deletedAt) { navigate('catalog', 'trash'); notify('Esta ficha está na lixeira. Restaure para editar.'); return; } if (p) setSelectedId(id); }, [navigate, notify]);
  const changePeople = useCallback((ids: string[], patch: Partial<Person>, message: string) => { commit(d => ({ ...d, people: d.people.map(p => ids.includes(p.id) ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p) }), message); }, [commit]);
  const savePerson = useCallback((p: Person, draftId?: string) => {
    if (!p.nome.trim() || !p.descricao.trim()) { notify('Preencha o nome e a descrição.', true); return false; }
    if (p.idade !== null && (!Number.isInteger(p.idade) || p.idade < 0 || p.idade > 120)) { notify('Informe uma idade inteira entre 0 e 120 anos, ou deixe em branco.', true); return false; }
    commit(d => {
      const person = { ...p, nome: p.nome.trim(), descricao: p.descricao.trim(), rating: { ...p.rating, overall: calculateOverallRating(p.rating) }, fotos: normalizePhotos(p.fotos, p.id), updatedAt: new Date().toISOString() };
      const drafts = { ...d.drafts }; if (draftId) delete drafts[draftId];
      return { ...d, drafts, people: d.people.some(x => x.id === person.id) ? d.people.map(x => x.id === person.id ? person : x) : [person, ...d.people], locations: [...new Set([...d.locations, person.localizacaoMora].filter(Boolean))] };
    }, 'Ficha salva com sucesso.');
    return true;
  }, [commit, notify]);
  const saveDraft = useCallback((draft: PersonDraft) => commit(d => ({ ...d, drafts: { ...d.drafts, [draft.id]: draft } }), undefined, false), [commit]);
  const discardDraft = useCallback((id: string) => commit(d => { const drafts = { ...d.drafts }; delete drafts[id]; return { ...d, drafts }; }, undefined, false), [commit]);
  const trashPeople = useCallback((ids: string[]) => { changePeople(ids, { deletedAt: new Date().toISOString() }, `${ids.length} ficha(s) movida(s) para a lixeira. Tudo foi preservado.`); if (ids.includes(selectedId || '')) setSelectedId(null); }, [changePeople, selectedId]);
  const restorePeople = useCallback((ids: string[]) => changePeople(ids, { deletedAt: null }, 'Fichas restauradas com fotos, notas e vínculos.'), [changePeople]);
  const deletePermanently = useCallback((ids: string[], keepPhotos: boolean) => {
    commit(d => ({ ...d, people: d.people.filter(p => !ids.includes(p.id)), orphanPhotos: keepPhotos ? [...d.orphanPhotos, ...d.people.filter(p => ids.includes(p.id)).flatMap(p => p.fotos.map(f => ({ ...f, personId: null, isMain: false })))] : d.orphanPhotos, stories: d.stories.map(s => ids.includes(s.personId || '') ? { ...s, personId: null } : s), reminders: d.reminders.map(r => ids.includes(r.personId || '') ? { ...r, personId: null } : r), tierLists: d.tierLists.map(t => ({ ...t, items: t.items.filter(i => !ids.includes(i.personId)) })), collections: d.collections.map(c => ({ ...c, personIds: c.personIds.filter(id => !ids.includes(id)) })), drafts: Object.fromEntries(Object.entries(d.drafts).filter(([, draft]) => !ids.includes(draft.personId || ''))) }), 'Exclusão definitiva concluída.', false);
    past.current = []; future.current = []; setHistoryVersion(v => v + 1);
  }, [commit]);
  const duplicate = useCallback((p: Person) => { const copy = duplicatePerson(p); commit(d => ({ ...d, people: [copy, ...d.people] }), 'Cópia independente da ficha criada.'); setSelectedId(copy.id); }, [commit]);
  const seenToday = useCallback((ids: string[]) => commit(d => ({ ...d, people: d.people.map(p => ids.includes(p.id) ? { ...p, ultimoVisto: today(), viHojeCount: p.viHojeCount + 1, viHojeDates: [...p.viHojeDates, today()], updatedAt: new Date().toISOString() } : p) }), 'Interação registrada no calendário.'), [commit]);
  const undo = useCallback(() => { const previous = past.current.pop(); if (!previous) return; future.current.push(current.current); stage({ ...previous, drafts: current.current.drafts }); setHistoryVersion(v => v + 1); notify('Última alteração desfeita.'); }, [stage, notify]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next) return; past.current.push(current.current); stage({ ...next, drafts: current.current.drafts }); setHistoryVersion(v => v + 1); notify('Alteração refeita.'); }, [stage, notify]);
  const setPrivacy = useCallback((v: boolean) => { privacyState(v); commit(d => ({ ...d, settings: { ...d.settings, privacy: v } }), undefined, false); }, [commit]);
  const login = (username: string, password: string, remember: boolean) => {
    const settings = current.current.settings;
    if (username.trim() !== settings.username || password !== settings.password) return false;
    try { sessionStorage.setItem('catalog_session', 'true'); if (remember) localStorage.setItem('catalog_remember', 'true'); else localStorage.removeItem('catalog_remember'); } catch { notify('Não foi possível lembrar esta sessão.', true); }
    commit(d => ({ ...d, settings: { ...d.settings, rememberLogin: remember } }), undefined, false); setAuthenticated(true); return true;
  };
  const logout = () => {
    if (!demoRef.current && (pending.current || saving.current) && !writeJournal(current.current)) {
      flush();
      notify('Aguarde a gravação terminar antes de sair. Se houver falha, baixe um backup em Ajustes.', true);
      return;
    }
    flush(); setAuthenticated(false); setQuickOpen(false); setCompareIds(null); setCommandOpen(false); setSelectedId(null); setPage('home');
    if (demoRef.current && original.current) { current.current = original.current; setData(original.current); demoRef.current = false; setDemo(false); pending.current = false; setStatus('saved'); }
    past.current = []; future.current = []; privacyState(false);
    try { sessionStorage.removeItem('catalog_session'); localStorage.removeItem('catalog_remember'); } catch { /* The in-memory session has already ended. */ }
  };
  const enterDemo = () => { original.current = current.current; demoRef.current = true; setDemo(true); const sample = demoData(); current.current = sample; setData(sample); setAuthenticated(true); privacyState(false); setStatus('saved'); };

  return <Context.Provider value={{ data, ready, authenticated, demo, page, filter, setFilter, navigate, selectedId, openPerson, closePerson: () => setSelectedId(null), quickOpen, setQuickOpen, compareIds, setCompareIds, commandOpen, setCommandOpen, privacy, setPrivacy, commit, savePerson, saveDraft, discardDraft, changePeople, trashPeople, restorePeople, deletePermanently, duplicate, seenToday, login, logout, enterDemo, undo, redo, canUndo: !!past.current.length, canRedo: !!future.current.length, status, lastSavedAt, retrySave: flush, notice, notify, dismissNotice: () => setNotice(null) }}>{children}</Context.Provider>;
}