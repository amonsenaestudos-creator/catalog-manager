import { useEffect, useRef, useState } from 'react';
import type { Person, PersonDraft } from '../types';
import { useCatalog } from '../context';
import { getDefaultPerson } from '../store';

/**
 * O rascunho é gravado com um pequeno atraso depois da última tecla.
 * Antes cada letra disparava uma gravação completa do catálogo, o que
 * travava a digitação quando já existiam fotos salvas.
 */
const DRAFT_DELAY = 700;

export function usePersonDraft(id: string, kind: PersonDraft['kind'], initial?: Person) {
  const { data, saveDraft, discardDraft } = useCatalog();
  const existing = data.drafts[id];
  const [person, setPerson] = useState<Person>(() => structuredClone(existing?.payload || initial || getDefaultPerson()));
  const [recovered, setRecovered] = useState(!!existing);
  const [dirty, setDirty] = useState(!!existing);
  const latest = useRef(person);
  const pendingDraft = useRef<PersonDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useRef(saveDraft);
  save.current = saveDraft;

  useEffect(() => {
    if (kind !== 'edit' || !initial || data.drafts[id]) return;
    const fresh = structuredClone(initial);
    latest.current = fresh;
    setPerson(fresh); setDirty(false); setRecovered(false);
  }, [initial?.id, initial?.updatedAt, !!data.drafts[id]]);

  // Grava o que ficou pendente ao sair da tela ou fechar a aba.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pendingDraft.current) save.current(pendingDraft.current);
  }, [id]);

  function update(next: Person | ((p: Person) => Person)) {
    const value = typeof next === 'function' ? next(latest.current) : next;
    latest.current = value;
    setPerson(value); setDirty(true);
    pendingDraft.current = { id, kind, personId: kind === 'edit' ? initial?.id : undefined, payload: value, updatedAt: new Date().toISOString() };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!pendingDraft.current) return;
      save.current(pendingDraft.current);
      pendingDraft.current = null;
    }, DRAFT_DELAY);
  }
  function discard() {
    if (timer.current) clearTimeout(timer.current);
    pendingDraft.current = null;
    discardDraft(id);
    const blank = structuredClone(initial || getDefaultPerson());
    latest.current = blank; setPerson(blank); setRecovered(false); setDirty(false);
  }
  return { person, update, discard, dirty, recovered, setRecovered };
}
