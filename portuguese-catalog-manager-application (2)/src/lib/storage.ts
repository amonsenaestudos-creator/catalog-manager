import type { AppData, BackupVersion } from '../types';
import { emptyData, generateId, JOURNAL_KEY, normalizeData, STORAGE_KEY } from '../store';

let database: Promise<IDBDatabase> | undefined;
function db() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('catalog-local-v3', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
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
export async function readStoredData(): Promise<{ data: AppData; warning?: string }> {
  const candidates: AppData[] = []; let warning = '';
  try { const current = await read<AppData>('current'); if (current) candidates.push(normalizeData(current)); } catch { warning = 'Armazenamento principal indisponível. Tentando a cópia local.'; }
  for (const key of [STORAGE_KEY, JOURNAL_KEY]) {
    try { const raw = localStorage.getItem(key); if (raw) candidates.push(normalizeData(JSON.parse(raw), true)); } catch { warning = 'Uma cópia local não pôde ser lida. Confira seus backups em Ajustes.'; }
  }
  candidates.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return { data: candidates[0] || emptyData(), warning: warning || undefined };
}
export function writeJournal(data: AppData): boolean {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export async function persistData(data: AppData) {
  try { await write('current', data); } catch {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return; } catch { throw new Error('Não foi possível salvar. Libere espaço no navegador ou exporte um backup antes de fechar.'); }
  }
  try {
    const journal = localStorage.getItem(JOURNAL_KEY);
    if (journal && JSON.parse(journal).updatedAt === data.updatedAt) localStorage.removeItem(JOURNAL_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* IndexedDB already committed the snapshot. */ }
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