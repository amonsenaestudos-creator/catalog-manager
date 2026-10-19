/**
 * Escolher fotos que já estão no sistema.
 *
 * Serve para o momento do cadastro: em vez de subir de novo a mesma imagem,
 * você reaproveita o que já existe na galeria. Fotos sem ficha passam a ser da
 * pessoa de verdade (saem da galeria solta quando a ficha é salva); fotos de
 * outra ficha são copiadas, e a original continua onde estava.
 */
import { useMemo, useState } from 'react';
import { Check, ImageOff, Images, Search, UserRound } from 'lucide-react';
import type { Person, Photo } from '../types';
import { useCatalog } from '../context';
import { generateId, getAllPhotos, isAdult, normalizeText, PHOTO_LABELS } from '../store';
import { Button, EmptyState, Modal } from './ui';

type Fonte = 'todas' | 'soltas' | 'outras';

interface FotoDoSistema extends Photo {
  dono: Person | null;
}

export default function EscolherFotos({ person, onPick, onClose }: {
  person: Person;
  onPick: (fotos: Photo[]) => void;
  onClose: () => void;
}) {
  const { data } = useCatalog();
  const [busca, setBusca] = useState('');
  const [fonte, setFonte] = useState<Fonte>('todas');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const adulto = isAdult(person);

  const fotos = useMemo<FotoDoSistema[]>(() => {
    const porId = new Map(data.people.filter(pessoa => !pessoa.deletedAt).map(pessoa => [pessoa.id, pessoa]));
    return getAllPhotos(data).map(foto => ({ ...foto, dono: foto.personId ? porId.get(foto.personId) || null : null }));
  }, [data]);

  const jaNaFicha = useMemo(() => new Set(person.fotos.flatMap(foto => [foto.id, foto.url])), [person.fotos]);
  const disponiveis = fotos.filter(foto => !jaNaFicha.has(foto.id) && !jaNaFicha.has(foto.url));

  const filtradas = useMemo(() => {
    const termo = normalizeText(busca);
    return disponiveis.filter(foto => {
      if (fonte === 'soltas' && foto.dono) return false;
      if (fonte === 'outras' && !foto.dono) return false;
      if (!termo) return true;
      return normalizeText([foto.name, foto.description, foto.dono?.nome, PHOTO_LABELS[foto.type]].filter(Boolean).join(' ')).includes(termo);
    });
  }, [disponiveis, busca, fonte]);

  const escolhidas = filtradas.filter(foto => selecionadas.includes(foto.id));
  const alternar = (id: string) => setSelecionadas(lista => lista.includes(id) ? lista.filter(item => item !== id) : [...lista, id]);

  const confirmar = () => {
    const resultado: Photo[] = [];
    for (const foto of disponiveis) {
      if (!selecionadas.includes(foto.id)) continue;
      const tipo = adulto ? foto.type : 'normal';
      if (!foto.dono) {
        // Foto solta: o mesmo registro passa a pertencer à ficha. A limpeza da
        // galeria solta acontece no savePerson, para descartar o rascunho não
        // fazer a foto desaparecer.
        resultado.push({ ...foto, personId: person.id, isMain: false, type: tipo });
      } else {
        resultado.push({ ...foto, id: generateId(), personId: person.id, isMain: false, type: tipo, sourcePhotoId: foto.id });
      }
    }
    onPick(resultado);
    onClose();
  };

  return <Modal
    title="Escolher fotos do sistema"
    description={`${disponiveis.length} foto(s) disponíveis na galeria. Toque para marcar; nada é enviado para fora.`}
    onClose={onClose}
    wide
    className="escolher-fotos-modal"
    footer={<>
      <span className="escolher-fotos-contagem">{selecionadas.length ? `${selecionadas.length} selecionada(s)` : 'Nenhuma foto marcada'}</span>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="primary" onClick={confirmar} disabled={!selecionadas.length}><Check size={16} />Usar {selecionadas.length || ''} foto{selecionadas.length === 1 ? '' : 's'}</Button>
    </>}>
    <div className="escolher-fotos-barra">
      <div className="search-field"><Search size={16} /><input value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Buscar por nome, anotação ou pessoa..." aria-label="Buscar fotos do sistema" /></div>
      <div className="rede-chips" role="group" aria-label="Origem das fotos">
        {([['todas', 'Todas'], ['soltas', 'Sem ficha'], ['outras', 'De outras fichas']] as [Fonte, string][]).map(([id, rotulo]) => <button type="button" key={id} className={fonte === id ? 'active' : ''} onClick={() => setFonte(id)}>{rotulo}{id === 'soltas' ? <small>{fotos.filter(foto => !foto.dono).length}</small> : id === 'outras' ? <small>{fotos.filter(foto => !!foto.dono).length}</small> : null}</button>)}
      </div>
    </div>

    {filtradas.length ? <div className="escolher-fotos-grade">
      {filtradas.map(foto => {
        const marcada = selecionadas.includes(foto.id);
        return <button type="button" key={foto.id} className={`escolher-foto ${marcada ? 'marcada' : ''}`} onClick={() => alternar(foto.id)} aria-pressed={marcada} aria-label={`${marcada ? 'Desmarcar' : 'Escolher'} ${foto.name || 'foto'}${foto.dono ? ` de ${foto.dono.nome}` : ''}`}>
          <span className="escolher-foto-imagem"><img src={foto.url} alt="" loading="lazy" /><span className="escolher-foto-marca">{marcada ? <Check size={15} /> : null}</span></span>
          <span className="escolher-foto-legenda"><strong>{foto.name || 'Foto'}</strong><small>{foto.dono ? <><UserRound size={10} />{foto.dono.nome}</> : <><ImageOff size={10} />Sem ficha</>}</small></span>
        </button>;
      })}
    </div> : <EmptyState icon={Images} title={disponiveis.length ? 'Nenhuma foto com esse filtro' : 'A galeria ainda está vazia'} description={disponiveis.length ? 'Tente outra busca ou mostre todas as origens.' : 'Envie imagens na aba Fotos — depois elas aparecem aqui para qualquer ficha.'} />}

    {!!escolhidas.length && <p className="form-help escolher-fotos-dica">Foto sem ficha passa a ser desta pessoa ao salvar. Foto de outra ficha é copiada: a original continua onde está.</p>}
  </Modal>;
}
