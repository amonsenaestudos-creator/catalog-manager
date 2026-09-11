import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../context';
import { usePersonDraft } from '../hooks/usePersonDraft';
import { Button, PageTitle } from './ui';
import PersonEditor from './PersonEditor';

export default function AddPerson() {
  const { savePerson, navigate } = useCatalog(); const draft = usePersonDraft('new-person', 'add');
  return <div className="editor-page"><PageTitle eyebrow="Sua biblioteca" title="Uma nova conexão" description="Comece pelo essencial. Os detalhes podem vir depois."><Button variant="ghost" onClick={() => navigate('catalog')}><ArrowLeft size={16} />Voltar ao catálogo</Button></PageTitle><PersonEditor {...draft} onDiscard={draft.discard} onCancel={() => navigate('catalog')} onSave={() => { if (savePerson(draft.person, 'new-person')) navigate('catalog'); }} /></div>;
}