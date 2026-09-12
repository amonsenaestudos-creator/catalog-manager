import type { AppData, BackupVersion, Profile } from '../types';
import { emptyData, generateId, JOURNAL_KEY, normalizeData, STORAGE_KEY } from '../store';

export const DEFAULT_PROFILE = 'principal';

/** Chave do diário de gravação: mantém a chave antiga para o perfil principal. */
export const journalKey = (profileId = DEFAULT_PROFILE) => profileId === DEFAULT_PROFILE ? JOURNAL_KEY : `${JOURNAL_KEY}:${profileId}`;
export const dataKey = (profileId = DEFAULT_PROFILE) => profileId === DEFAULT_PROFILE ? 'current' : `profile:${profileId}`;

let database: Promise<IDBDatabase> | undefined;
function db() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('catalog-local-v3', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('data')) request.result.createObjectStore('data'); };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = undefined; }; resolve(request.result); };
    request.onerror = () => { database = undefined; reject(request.error); };
  });
  return database;
}
async function read<T>(key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => { const tx = database.transaction('data', 'readonly'); const r = tx.objectStore('data').get(key); r.onsuccess = () => resolve(r.result as T | undefined); r.onerror = () => reject(r.error); });
}
async function write(key: string, value: unknown) {
  const database = await db();
  return new Promise<void>((resolve, reject) => { const tx = database.transaction('data', 'readwrite'); tx.objectStore('data').put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Gravação interrompida.')); });
}
async function remove(key: string) {
  const database = await db();
  return new Promise<void>((resolve, reject) => { const tx = database.transaction('data', 'readwrite'); tx.objectStore('data').delete(key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function readStoredData(profileId = DEFAULT_PROFILE): Promise<{ data: AppData; warning?: string }> {
  const candidates: AppData[] = []; let warning = '';
  try { const current = await read<AppData>(dataKey(profileId)); if (current) candidates.push(normalizeData(current)); } catch { warning = 'Armazenamento principal indisponível. Tentando a cópia local.'; }
  for (const key of [profileId === DEFAULT_PROFILE ? STORAGE_KEY : `${STORAGE_KEY}:${profileId}`, journalKey(profileId)]) {
    try { const raw = localStorage.getItem(key); if (raw) candidates.push(normalizeData(JSON.parse(raw), true)); } catch { warning = 'Uma cópia local não pôde ser lida. Confira seus backups em Ajustes.'; }
  }
  candidates.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return { data: candidates[0] || emptyData(), warning: warning || undefined };
}

/**
 * A cópia síncrona de emergência é apenas um plano B do IndexedDB.
 * Ela é limitada em tamanho e escrita no máximo a cada poucos segundos:
 * serializar o catálogo inteiro a cada tecla travava a interface quando já
 * existiam fotos guardadas.
 */
const JOURNAL_LIMIT_BYTES = 4 * 1024 * 1024;
const JOURNAL_INTERVAL_MS = 2500;
const lastJournalAt = new Map<string, number>();
export let journalTooLarge = false;

export function serializeForJournal(data: AppData): string | null {
  try {
    const raw = JSON.stringify(data);
    journalTooLarge = raw.length > JOURNAL_LIMIT_BYTES;
    return journalTooLarge ? null : raw;
  } catch { journalTooLarge = true; return null; }
}

export function writeJournal(data: AppData, force = false): boolean {
  const key = journalKey(data.activeProfile || DEFAULT_PROFILE);
  const now = Date.now();
  if (!force && now - (lastJournalAt.get(key) || 0) < JOURNAL_INTERVAL_MS) return true;
  const raw = serializeForJournal(data);
  if (!raw) return false;
  try { localStorage.setItem(key, raw); lastJournalAt.set(key, now); return true; } catch { return false; }
}

export function clearJournal(profileId = DEFAULT_PROFILE) {
  try { localStorage.removeItem(journalKey(profileId)); lastJournalAt.delete(journalKey(profileId)); } catch { /* A cópia principal já foi gravada. */ }
}

export async function persistData(data: AppData) {
  const profileId = data.activeProfile || DEFAULT_PROFILE;
  try { await write(dataKey(profileId), data); } catch {
    try { localStorage.setItem(profileId === DEFAULT_PROFILE ? STORAGE_KEY : `${STORAGE_KEY}:${profileId}`, JSON.stringify(data)); return; }
    catch { throw new Error('Não foi possível salvar. Libere espaço no navegador ou exporte um backup antes de fechar.'); }
  }
  try {
    const journal = localStorage.getItem(journalKey(profileId));
    if (journal && JSON.parse(journal).updatedAt === data.updatedAt) clearJournal(profileId);
    if (profileId === DEFAULT_PROFILE) localStorage.removeItem(STORAGE_KEY);
  } catch { /* IndexedDB já confirmou a gravação. */ }
}

export async function loadBackups(): Promise<BackupVersion[]> {
  const saved = await read<BackupVersion[]>('backups');
  const valid = (entries: unknown): BackupVersion[] => Array.isArray(entries) ? entries.filter(b => b && typeof b.id === 'string' && typeof b.data === 'string' && typeof b.snapshot === 'string' && typeof b.totalPessoas === 'number') : [];
  if (saved !== undefined) return valid(saved);
  try { return valid(JSON.parse(localStorage.getItem('catalog_manager_backups') || '[]')); } catch { return []; }
}
// Mantém até cinco versões, mas reduz o número quando o catálogo é muito grande
// para não ocupar espaço de armazenamento desproporcional.
const BACKUP_BUDGET_BYTES = 150 * 1024 * 1024;
export async function pushBackup(data: AppData): Promise<BackupVersion[]> {
  const list = await loadBackups();
  const entry: BackupVersion = { id: generateId(), data: new Date().toISOString(), totalPessoas: data.people.length, snapshot: JSON.stringify(data) };
  const next: BackupVersion[] = []; let bytes = 0;
  for (const version of [entry, ...list]) {
    const adding = version.snapshot.length;
    if (next.length >= 5) break;
    if (next.length > 0 && bytes + adding > BACKUP_BUDGET_BYTES) break;
    next.push(version); bytes += adding;
  }
  await write('backups', next); return next;
}
export async function deleteBackup(id: string) { const next = (await loadBackups()).filter(b => b.id !== id); await write('backups', next); return next; }

// ---------------------------------------------------------------------------
// Multi-perfis: cada perfil guarda um catálogo próprio no mesmo IndexedDB.
// ---------------------------------------------------------------------------
export async function loadProfiles(): Promise<Profile[]> {
  try {
    const saved = await read<Profile[]>('profiles');
    if (Array.isArray(saved) && saved.length) return saved.filter(p => p && typeof p.id === 'string');
  } catch { /* O perfil principal continua disponível. */ }
  return [{ id: DEFAULT_PROFILE, name: 'Meu catálogo', color: '#c786ec', createdAt: new Date().toISOString() }];
}
export async function saveProfiles(profiles: Profile[]) { await write('profiles', profiles); }
export async function deleteProfileData(profileId: string) {
  await remove(dataKey(profileId));
  try { localStorage.removeItem(journalKey(profileId)); localStorage.removeItem(`${STORAGE_KEY}:${profileId}`); } catch { /* Nada a limpar. */ }
}
export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota, percent: quota ? Math.round(usage / quota * 100) : 0 };
    }
  } catch { /* Estimativa indisponível neste navegador. */ }
  return null;
}
