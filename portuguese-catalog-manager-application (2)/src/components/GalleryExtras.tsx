import { useMemo, useState } from 'react';
import { Check, Heart, Image as ImageIcon, Layers, Plus, Scale, Trash2 } from 'lucide-react';
import type { Album, Photo } from '../types';
import { useCatalog } from '../context';
import { formatDate, generateId, PALETTE } from '../store';
import { Button, Confirm, EmptyState, Field, IconButton, Modal, SectionHeading } from './ui';

/** Álbuns: agrupe fotos por evento, viagem ou fase, sem mover os arquivos. */
export function AlbumManager({ editing, setEditing, onOpenAlbum }: { editing: Album | null; setEditing: (album: Album | null) => void; onOpenAlbum: (id: string) => void }) {
  const ctx = useCatalog(), { data } = ctx;
  const [deleting, setDeleting] = useState<string | null>(null);
  const create = () => setEditing({ id: generateId(), name: '', description: '', color: PALETTE[data.albums.length % PALETTE.length], photoIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const save = () => {
    if (!editing?.name.trim()) { ctx.notify('Dê um nome ao álbum.', true); return; }
    const album = { ...editing, name: editing.name.trim(), updatedAt: new Date().toISOString() };
    ctx.commit(d => ({ ...d, albums: d.albums.some(item => item.id === album.id) ? d.albums.map(item => item.id === album.id ? album : item) : [...d.albums, album] }), 'Álbum salvo.');
    setEditing(null);
  };
  return <div className="albums-wrap">
    <div className="journal-toolbar"><p className="muted small">Álbuns reúnem fotos de pessoas diferentes. Selecione fotos na aba Fotos e use “Adicionar a...”.</p><Button variant="primary" onClick={create}><Plus size={16} />Novo álbum</Button></div>
    <div className="album-grid">{data.albums.map(album => { const photos = album.photoIds.map(id => [...data.orphanPhotos, ...data.people.flatMap(person => person.fotos)].find(photo => photo.id === id)).filter((photo): photo is Photo => !!photo); return <article key={album.id} className="album-card" style={{ '--album': album.color } as React.CSSProperties}>
      <button onClick={() => onOpenAlbum(album.id)}>
        <div className="album-cover">{photos.slice(0, 4).map(photo => <img key={photo.id} src={photo.url} alt="" loading="lazy" decoding="async" />)}{!photos.length && <ImageIcon size={26} />}</div>
        <h3>{album.name}</h3><p>{album.description || 'Sem descrição'}</p>
        <span>{photos.length} fotos · {formatDate(album.updatedAt)}</span>
      </button>
      <footer><Button onClick={() => onOpenAlbum(album.id)}>Abrir álbum</Button><span><IconButton label="Editar álbum" onClick={() => setEditing(structuredClone(album))}><Check size={15} /></IconButton><IconButton label="Excluir álbum" onClick={() => setDeleting(album.id)}><Trash2 size={15} /></IconButton></span></footer>
    </article>; })}</div>
    {!data.albums.length && <EmptyState icon={Layers} title="Um álbum para cada momento" description="Viagens, festas, fases: reúna fotos de várias pessoas em um só lugar." action="Criar primeiro álbum" onAction={create} />}
    {editing && <Modal title={data.albums.some(album => album.id === editing.id) ? 'Editar álbum' : 'Novo álbum'} onClose={() => setEditing(null)} footer={<><Button onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}><Check size={16} />Salvar álbum</Button></>}>
      <Field label="Nome"><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ex.: Praia em janeiro" maxLength={90} /></Field>
      <Field label="Descrição"><textarea rows={2} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="O que este álbum guarda?" /></Field>
      <Field label="Cor"><div className="color-picker">{PALETTE.map(color => <button key={color} style={{ background: color }} aria-label={`Cor ${color}`} aria-pressed={editing.color === color} onClick={() => setEditing({ ...editing, color })}>{editing.color === color && <Check size={14} />}</button>)}<input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} /></div></Field>
      <p className="form-help">{editing.photoIds.length} foto(s) neste álbum. Use a seleção múltipla na aba Fotos para adicionar mais.</p>
    </Modal>}
    {deleting && <Confirm title="Excluir álbum?" description="As fotos continuam na galeria. Só o agrupamento é removido." danger confirmLabel="Excluir álbum" onClose={() => setDeleting(null)} onConfirm={() => ctx.commit(d => ({ ...d, albums: d.albums.filter(album => album.id !== deleting) }), 'Álbum excluído.')} />}
  </div>;
}

/** Duplicatas: a mesma imagem guardada mais de uma vez. */
export function DuplicateList({ groups }: { groups: Photo[][] }) {
  const ctx = useCatalog(), { data } = ctx;
  const [pending, setPending] = useState<string[] | null>(null);
  const ownerName = (photo: Photo) => data.people.find(person => person.fotos.some(file => file.id === photo.id))?.nome || 'Não vinculada';
  const removeIds = (ids: string[]) => ctx.commit(d => ({
    ...d,
    orphanPhotos: d.orphanPhotos.filter(photo => !ids.includes(photo.id)),
    people: d.people.map(person => person.fotos.some(photo => ids.includes(photo.id)) ? { ...person, fotos: person.fotos.filter(photo => !ids.includes(photo.id)) } : person),
  }), `${ids.length} cópia(s) removida(s).`, false);
  return <div className="duplicates-wrap">
    <p className="form-help">A comparação usa a impressão digital do arquivo. As fotos originais nunca são apagadas sem o seu ok.</p>
    {groups.map((group, index) => <section key={index} className="duplicate-group">
      <SectionHeading icon={ImageIcon} title={`${group.length} cópias da mesma imagem`} />
      <div className="duplicate-row">{group.map((photo, photoIndex) => <figure key={photo.id} className="duplicate-card">
        <img src={photo.url} alt={photo.name || 'Foto duplicada'} loading="lazy" decoding="async" />
        <figcaption><strong>{ownerName(photo)}</strong><small>{photo.name || 'Sem nome'} · {formatDate(photo.createdAt)}</small>
          {photoIndex === 0 ? <span className="duplicate-keep">Manter esta</span> : <button onClick={() => setPending(group.filter(item => item.id !== photo.id).map(item => item.id))}><Trash2 size={13} />Remover cópia</button>}
        </figcaption></figure>)}</div>
      <Button onClick={() => setPending(group.slice(1).map(photo => photo.id))}>Manter só a primeira</Button>
    </section>)}
    {!groups.length && <EmptyState icon={Check} title="Nenhuma duplicata" description="Sua galeria não tem imagens repetidas no momento." />}
    {pending && <Confirm title={`Remover ${pending.length} cópia(s)?`} description="A foto que você escolheu manter continua intacta." danger confirmLabel="Remover cópias" onClose={() => setPending(null)} onConfirm={() => { removeIds(pending); setPending(null); }} />}
  </div>;
}

/** Comparação antes/depois com um divisor deslizante. */
export function BeforeAfter({ photos, pair, setPair }: { photos: Photo[]; pair: [string, string]; setPair: (pair: [string, string]) => void }) {
  const left = photos.find(photo => photo.id === pair[0]);
  const right = photos.find(photo => photo.id === pair[1]);
  const [position, setPosition] = useState(50);
  const options = useMemo(() => photos.slice(0, 300), [photos]);
  return <div className="before-after">
    <div className="form-grid">
      <Field label="Foto A"><select value={pair[0]} onChange={e => setPair([e.target.value, pair[1]])}><option value="">Escolher foto</option>{options.map(photo => <option key={photo.id} value={photo.id}>{photo.name || 'Foto'} · {formatDate(photo.createdAt)}</option>)}</select></Field>
      <Field label="Foto B"><select value={pair[1]} onChange={e => setPair([pair[0], e.target.value])}><option value="">Escolher foto</option>{options.map(photo => <option key={photo.id} value={photo.id}>{photo.name || 'Foto'} · {formatDate(photo.createdAt)}</option>)}</select></Field>
    </div>
    {left && right ? <>
      <div className="compare-stage">
        <img src={right.url} alt="Foto B" className="compare-base" />
        <img src={left.url} alt="Foto A" className="compare-top" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
        <span className="compare-handle" style={{ left: `${position}%` }}><Scale size={15} /></span>
        <span className="compare-label left">A</span><span className="compare-label right">B</span>
      </div>
      <input type="range" min={0} max={100} value={position} onChange={e => setPosition(Number(e.target.value))} aria-label="Mover o divisor da comparação" />
      <p className="muted small">Arraste o divisor ou use a barra para revelar cada foto.</p>
    </> : <EmptyState icon={Heart} title="Escolha duas fotos" description="Compare um antes e depois lado a lado com o divisor deslizante." />}
  </div>;
}
