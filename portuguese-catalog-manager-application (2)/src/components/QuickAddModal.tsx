import { useCatalog } from '../context';
import { usePersonDraft } from '../hooks/usePersonDraft';
import { Modal } from './ui';
import PersonEditor from './PersonEditor';

export default function QuickAddModal() {
  const { savePerson, setQuickOpen } = useCatalog(); const draft = usePersonDraft('quick-person', 'quick');
  return <Modal title="Fichário rápido" description="Uma pessoa, uma foto, uma boa lembrança." onClose={() => setQuickOpen(false)} className="quick-modal"><PersonEditor {...draft} quick onDiscard={draft.discard} onCancel={() => setQuickOpen(false)} onSave={() => { if (savePerson({ ...draft.person, descricao: draft.person.descricao.trim() || 'Adicionado rapidamente via Fichário Rápido. Complete os detalhes depois.' }, 'quick-person')) setQuickOpen(false); }} submitLabel="Adicionar pessoa" /></Modal>;
}