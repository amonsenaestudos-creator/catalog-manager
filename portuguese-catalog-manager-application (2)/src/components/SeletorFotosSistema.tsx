import { useMemo, useState } from 'react';
import { Check, Images, Search } from 'lucide-react';
import type { Person, Photo } from '../types';
import { useCatalog } from '../context';
import { filtrarFotosDoSistema, fotosDoSistema, prepararFotosEscolhidas, ROTULO_DA_ORIGEM } from '../lib/fotosSistema';
import type { FotoDoSistema, OrigemFotoSistema } from '../lib/fotosSistema';
import { Button, EmptyState, Modal } from './ui';

type Aba = OrigemFotoSistema | 'todas';

/**
 * "Escolher fotos do sistema", no cadastro e na edição.
 *
 * Mostra tudo o que já mora no Catalog e pode vestir esta ficha: fotos sem
 * ficha (são adotadas de verdade ao salvar), fotos de outras fichas (entram
 * como cópia, sem mexer na origem) e os retratos que vêm com o aplicativo.
 * O que já está nesta ficha aparece marcado e não se repete.
 */
export default function SeletorFotosSistema({ person, onClose, onConfirm }: {
  person: Person;
  onClose: () => void;
  onConfirm: (fotos: Photo[], avisos: string[]) => void;
}) {
  const { data } = useCatalog();
  const [aba, setAba] = useState<Aba>('todas');
  const [busca, setBusca] = useState('');
  const [escolhidas, setEscolhidas] = useState<string[]>([]);

  const acervo = useMemo(() => fotosDoSistema(data, person.id), [data, person.id]);
  const visiveis = useMemo(() => filtrarFotosDoSistema(acervo, busca, aba), [acervo, busca, aba]);
  const jaNaFicha = (item: FotoDoSistema) => person.fotos.some(photo => photo.id === item.photo.id || photo.url === item.photo.url);
  const contagem = (origem: Aba) => origem === 'todas' ? acervo.length : acervo.filter(item => item.origem === origem).length;

  const alternar = (item: FotoDoSistema) => {
    if (jaNaFicha(item)) return;
    setEscolhidas(lista => lista.includes(item.photo.id) ? lista.filter(id => id !== item.photo.id) : [...lista, item.photo.id]);
  };

  const confirmar = () => {
    const selecionadas = acervo.filter(item => escolhidas.includes(item.photo.id));
    const { fotos, avisos } = prepararFotosEscolhidas(selecionadas, person);
    onConfirm(fotos, avisos);
  };

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'todas', rotulo: 'Todas' },
    { id: 'sem-ficha', rotulo: ROTULO_DA_ORIGEM['sem-ficha'] },
    { id: 'ficha', rotulo: 'De outras fichas' },
    { id: 'sistema', rotulo: ROTULO_DA_ORIGEM.sistema },
  ];

  return <Modal title="Fotos que já estão no sistema" description="Toque para escolher quantas quiser. Fotos sem ficha passam a ser desta pessoa ao salvar; fotos de outras fichas entram como cópia." onClose={onClose} wide className="seletor-fotos-modal"
    footer={<><span className="muted small">{escolhidas.length} foto(s) escolhida(s) · {contagem('sem-ficha')} sem ficha no sistema</span><span className="seletor-rodape-acoes"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!escolhidas.length} onClick={confirmar}><Check size={16} />Adicionar à ficha{escolhidas.length > 0 && ` (${escolhidas.length})`}</Button></span></>}>
    <div className="seletor-topo">
      <div className="seletor-abas" role="group" aria-label="Origem das fotos">
        {abas.map(item => <button key={item.id} type="button" className={aba === item.id ? 'active' : ''} aria-pressed={aba === item.id} onClick={() => setAba(item.id)}>{item.rotulo}<small>{contagem(item.id)}</small></button>)}
      </div>
      <label className="seletor-busca"><Search size={15} /><input value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar foto ou pessoa" placeholder="Buscar foto ou pessoa..." /></label>
    </div>
    {visiveis.length ? <div className="seletor-grade">
      {visiveis.map(item => {
        const nesta = jaNaFicha(item);
        const marcada = escolhidas.includes(item.photo.id);
        const rotulo = item.origem === 'ficha' ? (item.donaNome || 'Outra ficha') : ROTULO_DA_ORIGEM[item.origem];
        return <button key={`${item.origem}-${item.photo.id}`} type="button" className={`seletor-foto ${marcada ? 'selected' : ''} ${nesta ? 'ja-tem' : ''}`} aria-pressed={marcada} disabled={nesta}
          aria-label={`${nesta ? 'Já está nesta ficha: ' : 'Escolher foto: '}${item.photo.name || 'Foto'} (${rotulo})`} onClick={() => alternar(item)}>
          <img src={item.photo.url} alt={item.photo.name || 'Foto do sistema'} loading="lazy" />
          <span className="seletor-foto-rodape"><span>{item.photo.name || 'Foto'}</span><small>{nesta ? 'Já nesta ficha' : rotulo}</small></span>
          {marcada && <span className="seletor-marca"><Check size={14} /></span>}
        </button>;
      })}
    </div> : <EmptyState icon={Images} title="Nada por aqui ainda" description={busca || aba !== 'todas'
      ? 'Nenhuma foto do sistema passa por esta peneira. Limpe a busca ou troque a prateleira.'
      : 'Quando houver fotos sem ficha ou em outras fichas, elas aparecem aqui para reutilizar sem enviar de novo.'} />}
  </Modal>;
}
