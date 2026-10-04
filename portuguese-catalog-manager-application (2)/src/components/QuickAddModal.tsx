import { useRef, useState } from 'react';
import { Camera, FileText, FolderPlus, UserPlus } from 'lucide-react';
import { useCatalog } from '../context';
import { usePersonDraft } from '../hooks/usePersonDraft';
import { Modal } from './ui';
import PersonEditor from './PersonEditor';
import { prepararFotosSoltas } from '../lib/galeria';

/**
 * O "+" inteligente.
 *
 * Antes, o botão central da doca levava direto ao cadastro de pessoa — como se
 * pessoa fosse a única coisa que alguém cria aqui. Agora ele pergunta o que
 * **você quer criar** e leva ao caminho certo: pessoa (o fichário rápido de
 * sempre), foto (escolhe ou tira na hora e a imagem entra na galeria esperando
 * vínculo), nota e pasta. É a mesma ideia do resto da interface: primeiro a
 * intenção, depois o formulário.
 */
export default function QuickAddModal() {
  const ctx = useCatalog();
  const { setQuickOpen } = ctx;
  const [escolha, setEscolha] = useState<'menu' | 'pessoa'>('menu');
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const draft = usePersonDraft('quick-person', 'quick');

  const fechar = () => { setQuickOpen(false); setEscolha('menu'); };
  const irPara = (pagina: string) => { fechar(); ctx.navigate(pagina); };

  const escolherFotos = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setEnviando(true);
    try {
      const fotos = await prepararFotosSoltas(Array.from(lista));
      ctx.commit(d => ({ ...d, orphanPhotos: [...d.orphanPhotos, ...fotos] }), `${fotos.length} foto(s) na galeria, esperando uma ficha.`);
      ctx.sound('shutter');
      fechar();
    } catch (error) {
      ctx.notify((error as Error).message, true);
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  if (escolha === 'pessoa') {
    return <Modal title="Fichário rápido" description="Uma pessoa, uma foto, uma boa lembrança." onClose={fechar} className="quick-modal">
      <PersonEditor {...draft} quick onDiscard={draft.discard} onCancel={fechar} onSave={() => { if (ctx.savePerson({ ...draft.person, descricao: draft.person.descricao.trim() || 'Adicionado rapidamente via Fichário Rápido. Complete os detalhes depois.' }, 'quick-person')) fechar(); }} submitLabel="Adicionar pessoa" />
    </Modal>;
  }

  return <Modal title="O que você quer criar?" description="Escolha e o formulário certo abre na hora." onClose={fechar} className="quick-escolha-modal">
    <div className="quick-escolhas">
      <button type="button" className="quick-escolha" onClick={() => setEscolha('pessoa')}>
        <span className="quick-escolha-icone"><UserPlus size={20} /></span>
        <span><strong>Pessoa</strong><small>Nome, foto e o essencial — o resto depois.</small></span>
      </button>
      <button type="button" className="quick-escolha" disabled={enviando} onClick={() => arquivo.current?.click()}>
        <span className="quick-escolha-icone"><Camera size={20} /></span>
        <span><strong>{enviando ? 'Preparando as fotos…' : 'Fotos'}</strong><small>Entram na galeria sem ficha; você vincula quem quiser depois.</small></span>
      </button>
      <button type="button" className="quick-escolha" onClick={() => irPara('notes')}>
        <span className="quick-escolha-icone"><FileText size={20} /></span>
        <span><strong>Nota</strong><small>Uma ideia, uma referência, um lembrete solto.</small></span>
      </button>
      <button type="button" className="quick-escolha" onClick={() => irPara('folders')}>
        <span className="quick-escolha-icone"><FolderPlus size={20} /></span>
        <span><strong>Pasta</strong><small>Reúne fichas, notas e fotos sem duplicar nada.</small></span>
      </button>
    </div>
    <input ref={arquivo} type="file" accept="image/*" multiple hidden onChange={evento => void escolherFotos(evento.target.files)} aria-label="Escolher fotos para a galeria" />
  </Modal>;
}
