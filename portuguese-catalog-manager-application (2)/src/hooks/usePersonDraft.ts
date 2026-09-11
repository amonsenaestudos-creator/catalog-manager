import { useEffect, useRef, useState } from 'react';
import type { Person, PersonDraft } from '../types';
import { useCatalog } from '../context';
import { getDefaultPerson } from '../store';

export function usePersonDraft(id: string, kind: PersonDraft['kind'], initial?: Person) {
  const { data, saveDraft, discardDraft } = useCatalog();
  const existing = data.drafts[id];
  const [person, setPerson] = useState<Person>(() => structuredClone(existing?.payload || initial || getDefaultPerson()));
  const [recovered, setRecovered] = useState(!!existing);
  const [dirty, setDirty] = useState(!!existing);
  const latest = useRef(person);
  useEffect(() => {
    if (kind !== 'edit' || !initial || data.drafts[id]) return;
    const fresh = structuredClone(initial);
    latest.current = fresh;
    setPerson(fresh); setDirty(false); setRecovered(false);
  }, [initial?.id, initial?.updatedAt, !!data.drafts[id]]);
  function update(next: Person | ((p: Person) => Person)) {
    const value = typeof next === 'function' ? next(latest.current) : next;
    latest.current = value;
    setPerson(value); setDirty(true);
    saveDraft({ id, kind, personId: kind === 'edit' ? initial?.id : undefined, payload: value, updatedAt: new Date().toISOString() });
  }
  function discard() { discardDraft(id); const blank = structuredClone(initial || getDefaultPerson()); latest.current = blank; setPerson(blank); setRecovered(false); setDirty(false); }
  return { person, update, discard, dirty, recovered, setRecovered };
}