import { useMemo, useState } from 'react';
import { Check, ChevronRight, Edit3, FileText, Folder as FolderIconGlyph, FolderOpen, FolderPlus, Heart, Image as ImageIcon, Layers, Link2, Lock, Pin, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react';
import type { Folder as FolderType, Photo } from '../types';
import { useCatalog } from '../context';
import { instrucaoMover } from '../lib/dispositivo';
import { allFolderItems, folderChildren, folderCover, folderPath, folderTotals, generateId, getAllPhotos, normalizeText, PALETTE } from '../store';
import { Avatar, Button, CheckBox, Confirm, EmptyState, Field, IconButton, Modal, PageTitle, PhotoView } from './ui';

const ICONS = { folder: FolderIconGlyph, image: ImageIcon, note: FileText, bookmark: Sparkles, heart: Heart, sparkles: Sparkles };
const ICON_LABELS: Record<keyof typeof ICONS, string> = { folder: 'Pasta', image: 'Imagem', note: 'Nota', bookmark: 'Marcador', heart: 'Coração', sparkles: 'Brilho' };
const SORTS: { value: 'recent' | 'name' | 'manual'; label: string }[] = [{ value: 'recent', label: 'Mais recentes' }, { value: 'name', label: 'Nome A-Z' }, { value: 'manual', label: 'Minha ordem' }];

export default function Folders() {
  const ctx = useCatalog(), { data } = ctx;
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FolderType | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const open = data.folders.find(folder => folder.id === openId);
  const allPhotos = useMemo(() => getAllPhotos(data), [data]);

  const create = (parentId: string | null = null) => setEditing({ id: generateId(), name: '', color: PALETTE[data.folders.length % PALETTE.length], icon: 'folder', description: '', personIds: [], photoIds: [], noteIds: [], storyIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), parentId, pinned: false, coverPhotoId: null, sort: 'recent', order: data.folders.length });
  const save = () => {
    if (!editing?.name.trim()) { ctx.notify('Dê um nome à pasta.', true); return; }
    const folder = { ...editing, name: editing.name.trim(), updatedAt: new Date().toISOString() };
    ctx.commit(d => ({ ...d, folders: d.folders.some(f => f.id === folder.id) ? d.folders.map(f => f.id === folder.id ? folder : f) : [...d.folders, folder], generalNotes: d.generalNotes.map(n => folder.noteIds.includes(n.id) ? { ...n, folderId: folder.id } : n.folderId === folder.id ? { ...n, folderId: null } : n) }), 'Pasta salva.');
    setEditing(null);
  };
  const remove = (id: string) => {
    ctx.commit(d => ({
      ...d,
      folders: d.folders.filter(f => f.id !== id).map(folder => folder.parentId === id ? { ...folder, parentId: null } : folder),
      generalNotes: d.generalNotes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
      investigationBoards: d.investigationBoards.map(b => ({ ...b, cards: b.cards.map(c => c.folderId === id ? { ...c, folderId: null } : c) })),
    }), 'Pasta removida. Seus itens e as subpastas continuam no catálogo.');
    if (openId === id) setOpenId(null);
  };
  const togglePin = (folder: FolderType) => ctx.commit(d => ({ ...d, folders: d.folders.map(f => f.id === folder.id ? { ...f, pinned: !f.pinned } : f) }), folder.pinned ? 'Pasta desafixada.' : 'Pasta fixada no topo.');
  const move = (id: string, parentId: string | null) => {
    if (id === parentId) return;
    ctx.commit(d => ({ ...d, folders: d.folders.map(f => f.id === id ? { ...f, parentId, updatedAt: new Date().toISOString() } : f) }), parentId ? 'Pasta movida para dentro de outra.' : 'Pasta movida para a raiz.');
  };
  const searchResults = useMemo(() => {
    const term = normalizeText(query);
    if (!term) return [];
    return data.folders.filter(folder => normalizeText(`${folder.name} ${folder.description}`).includes(term)).slice(0, 8);
  }, [query, data.folders]);

  const FolderCard = ({ folder }: { folder: FolderType }) => {
    const totals = folderTotals(data, folder.id);
    const cover = folderCover(data, folder);
    const Icon = ICONS[folder.icon as keyof typeof ICONS] || FolderIconGlyph;
    const children = folderChildren(data, folder.id);
    return <article className={`folder-card ${dragOver === folder.id ? 'drop-target' : ''}`} style={{ '--folder': folder.color } as React.CSSProperties}
      onDragOver={event => { event.preventDefault(); setDragOver(folder.id); }} onDragLeave={() => setDragOver(null)}
      onDrop={event => { event.preventDefault(); setDragOver(null); const dragged = event.dataTransfer.getData('text/catalog-folder'); if (dragged) move(dragged, folder.id); }}>
      <button onClick={() => setOpenId(folder.id)}>
        <span className="folder-card-icon">{cover ? <img src={cover.url} alt="" loading="lazy" decoding="async" /> : <Icon size={31} />}</span>
        <h2>{folder.name}{folder.pinned && <Pin size={13} />}</h2>
        <p>{folder.description || 'Pasta pessoal'}</p>
        <div><span><Users size={13} />{totals.people}</span><span><ImageIcon size={13} />{totals.photos}</span><span><FileText size={13} />{totals.notes}</span>{totals.subfolders > 0 && <span><Layers size={13} />{totals.subfolders}</span>}</div>
        {children.length > 0 && <span className="folder-children">{children.slice(0, 3).map(child => child.name).join(' · ')}{children.length > 3 ? ` +${children.length - 3}` : ''}</span>}
      </button>
      <footer>
        <button className="text-action" draggable onDragStart={event => event.dataTransfer.setData('text/catalog-folder', folder.id)} onClick={() => setOpenId(folder.id)}>Abrir pasta<Link2 size={14} /></button>
        <span>
          <IconButton label={folder.pinned ? 'Desafixar pasta' : 'Fixar pasta no topo'} onClick={() => togglePin(folder)}><Pin size={15} /></IconButton>
          <IconButton label="Nova subpasta" onClick={() => create(folder.id)}><FolderPlus size={15} /></IconButton>
          <IconButton label="Editar pasta" onClick={() => setEditing(structuredClone(folder))}><Edit3 size={15} /></IconButton>
          <IconButton label="Excluir pasta" onClick={() => setDeleting(folder.id)}><Trash2 size={15} /></IconButton>
        </span>
      </footer>
    </article>;
  };

  if (open) {
    const items = allFolderItems(data, open.id);
    const path = folderPath(data, open.id);
    const children = folderChildren(data, open.id);
    const totals = folderTotals(data, open.id);
    const Icon = ICONS[open.icon as keyof typeof ICONS] || FolderIconGlyph;
    const sortItems = <T,>(list: T[], key: (item: T) => string) => open.sort === 'name' ? [...list].sort((a, b) => key(a).localeCompare(key(b), 'pt-BR')) : open.sort === 'manual' ? list : [...list].sort((a, b) => key(b).localeCompare(key(a), 'pt-BR'));
    return <div className="folders-page">
      <nav className="folder-breadcrumb"><button onClick={() => setOpenId(null)}><FolderOpen size={15} />Todas as pastas</button>{path.map((folder, index) => <span key={folder.id}><ChevronRight size={12} /><button onClick={() => setOpenId(folder.id)} className={index === path.length - 1 ? 'current' : ''}>{folder.name}</button></span>)}</nav>
      <PageTitle eyebrow="Tudo reunido em um lugar" title={open.name} description={open.description || 'Uma pasta pessoal do seu catálogo.'}>
        <Button onClick={() => create(open.id)}><FolderPlus size={16} />Nova subpasta</Button>
        <Button onClick={() => setEditing(structuredClone(open))}><Edit3 size={16} />Editar pasta</Button>
      </PageTitle>
      <div className="folder-detail-hero" style={{ '--folder': open.color } as React.CSSProperties}>
        <span className="folder-hero-icon"><Icon size={44} /></span>
        <div><strong>{totals.all}</strong><span>itens reunidos</span></div>
        <p>{open.description || 'Adicione pessoas, fotos, notas ou histórias nesta pasta para vê-las aqui.'}</p>
        <div className="folder-hero-actions">
          <select value={open.sort || 'recent'} onChange={event => ctx.commit(d => ({ ...d, folders: d.folders.map(f => f.id === open.id ? { ...f, sort: event.target.value as FolderType['sort'] } : f) }), undefined, false)} aria-label="Ordenar itens da pasta">{SORTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <IconButton label={open.pinned ? 'Desafixar pasta' : 'Fixar pasta'} onClick={() => togglePin(open)}><Pin size={16} /></IconButton>
          <IconButton label="Excluir pasta" onClick={() => setDeleting(open.id)}><Trash2 size={16} /></IconButton>
        </div>
      </div>
      {children.length > 0 && <section className="folder-subfolders"><h3><Layers size={16} />Subpastas</h3><div className="folders-grid compact">{children.map(folder => <FolderCard key={folder.id} folder={folder} />)}</div></section>}
      <div className="folder-detail-grid">
        <section><h2><Users size={17} />Pessoas<small>{items.people.length}</small></h2><div className="folder-people">{sortItems(items.people, person => person.nome).map(p => <button key={p.id} onClick={() => ctx.openPerson(p)}><Avatar person={p} size={46} /><span>{p.nome}<small>{p.apelido || 'Ver ficha'}</small></span></button>)}{!items.people.length && <p className="form-help">Nenhuma pessoa nesta pasta ainda.</p>}</div></section>
        <section><h2><ImageIcon size={17} />Fotos<small>{items.photos.length}</small></h2><div className="folder-photos">{items.photos.map(photo => <button key={photo.id} onClick={() => ctx.navigate('gallery')}><PhotoView src={photo.url} alt={photo.name} /></button>)}{!items.photos.length && <p className="form-help">Nenhuma foto reunida.</p>}</div></section>
        <section><h2><FileText size={17} />Notas<small>{items.notes.length}</small></h2>{items.notes.map(note => <button className="folder-note" key={note.id} onClick={() => ctx.navigate('notes')}><strong>{note.title}</strong><p>{note.content}</p></button>)}{!items.notes.length && <p className="form-help">Nenhuma nota reunida.</p>}</section>
      </div>
      {items.stories.length > 0 && <section className="folder-stories"><h2><Sparkles size={17} />Histórias<small>{items.stories.length}</small></h2>{items.stories.map(story => <button key={story.id} onClick={() => ctx.navigate('stories')}><strong>{story.titulo}</strong><span>{story.tipo}</span></button>)}</section>}
      {editing && <FolderEditor folder={editing} setFolder={setEditing} allPhotos={allPhotos} onSave={save} onClose={() => setEditing(null)} />}
      {deleting && <Confirm title="Excluir esta pasta?" description="Pessoas, fotos, notas, histórias e subpastas continuam intactas no catálogo. Apenas o agrupamento é removido." danger confirmLabel="Excluir pasta" onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}
    </div>;
  }

  const roots = folderChildren(data, null);
  return <div className="folders-page">
    <PageTitle eyebrow="Agrupe do seu jeito" title="Pastas" description="Pastas e subpastas que reúnem pessoas, fotos, notas e histórias sem duplicar nada.">
      <Button variant="primary" onClick={() => create(null)}><Plus size={17} />Nova pasta</Button>
    </PageTitle>
    <div className="folder-toolbar">
      <div className="search-field"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pasta pelo nome..." aria-label="Buscar pastas" />{query && <button onClick={() => setQuery('')} aria-label="Limpar busca"><Trash2 size={14} /></button>}</div>
      <span className="muted small">{data.folders.length} pastas · {data.folders.filter(folder => folder.parentId).length} subpastas · {instrucaoMover('arraste uma pasta sobre outra para aninhar', 'use Editar pasta → Pasta mãe para aninhar')}</span>
    </div>
    {query && <div className="folder-search-results">{searchResults.map(folder => <button key={folder.id} onClick={() => { setOpenId(folder.id); setQuery(''); }}><FolderIconGlyph size={15} />{folder.name}<small>{folderTotals(data, folder.id).all} itens</small></button>)}{!searchResults.length && <p className="form-help">Nenhuma pasta com esse nome.</p>}</div>}
    {!query && <div className="folders-grid">{roots.map(folder => <FolderCard key={folder.id} folder={folder} />)}</div>}
    {!query && !data.folders.length && <EmptyState icon={FolderIconGlyph} title="Uma pasta para cada momento" description="Agrupe pessoas, fotos, notas e histórias sem criar cópias. Você pode criar subpastas depois." action="Criar primeira pasta" onAction={() => create(null)} />}
    {editing && <FolderEditor folder={editing} setFolder={setEditing} allPhotos={allPhotos} onSave={save} onClose={() => setEditing(null)} />}
    {deleting && <Confirm title="Excluir esta pasta?" description="Pessoas, fotos, notas, histórias e subpastas continuam intactas no catálogo. Apenas o agrupamento é removido." danger confirmLabel="Excluir pasta" onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}
  </div>;
}

function FolderEditor({ folder, setFolder, allPhotos, onSave, onClose }: { folder: FolderType; setFolder: (f: FolderType) => void; allPhotos: Photo[]; onSave: () => void; onClose: () => void }) {
  const { data } = useCatalog();
  const [picker, setPicker] = useState('');
  const toggle = (key: 'personIds' | 'photoIds' | 'noteIds' | 'storyIds', id: string) => setFolder({ ...folder, [key]: folder[key].includes(id) ? folder[key].filter(x => x !== id) : [...folder[key], id] });
  const possibleParents = data.folders.filter(f => f.id !== folder.id && f.parentId !== folder.id);
  const items = allFolderItems(data, folder.id);
  return <Modal title={data.folders.some(f => f.id === folder.id) ? 'Editar pasta' : 'Nova pasta'} description="Uma pasta apenas reúne referências; ela não duplica seus itens." onClose={onClose} wide footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!folder.name.trim()} onClick={onSave}><Check size={16} />Salvar pasta</Button></>}>
    <div className="form-grid"><Field label="Nome"><input value={folder.name} onChange={e => setFolder({ ...folder, name: e.target.value })} placeholder="Ex.: Viagem de julho" maxLength={100} /></Field>
      <Field label="Ícone"><select value={folder.icon} onChange={e => setFolder({ ...folder, icon: e.target.value })}>{(Object.keys(ICONS) as (keyof typeof ICONS)[]).map(icon => <option key={icon} value={icon}>{ICON_LABELS[icon]}</option>)}</select></Field>
      <Field label="Pasta mãe"><select value={folder.parentId || ''} onChange={e => setFolder({ ...folder, parentId: e.target.value || null })}><option value="">Nenhuma (pasta raiz)</option>{possibleParents.map(parent => <option key={parent.id} value={parent.id}>{folderPath(data, parent.id).map(step => step.name).join(' / ')}</option>)}</select></Field>
      <Field label="Ordem dos itens"><select value={folder.sort || 'recent'} onChange={e => setFolder({ ...folder, sort: e.target.value as FolderType['sort'] })}>{SORTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field></div>
    <Field label="Descrição"><textarea rows={2} value={folder.description} onChange={e => setFolder({ ...folder, description: e.target.value })} placeholder="O que esta pasta reúne?" /></Field>
    <Field label="Cor"><div className="color-picker">{PALETTE.map(color => <button key={color} style={{ background: color }} aria-label={`Cor ${color}`} aria-pressed={folder.color === color} onClick={() => setFolder({ ...folder, color })}>{folder.color === color && <Check size={14} />}</button>)}<input type="color" value={folder.color} onChange={e => setFolder({ ...folder, color: e.target.value })} /></div></Field>
    <CheckBox checked={!!folder.pinned} onChange={() => setFolder({ ...folder, pinned: !folder.pinned })} label="Fixar no topo da lista" />
    {items.photos.length > 0 && <Field label="Capa da pasta"><select value={folder.coverPhotoId || ''} onChange={e => setFolder({ ...folder, coverPhotoId: e.target.value || null })}><option value="">Primeira foto</option>{items.photos.map(photo => <option key={photo.id} value={photo.id}>{photo.name || 'Foto'}</option>)}</select></Field>}
    <div className="folder-editor-pickers">
      <div className="picker-tabs">{[['personIds', `Pessoas (${folder.personIds.length})`], ['photoIds', `Fotos (${folder.photoIds.length})`], ['noteIds', `Notas (${folder.noteIds.length})`], ['storyIds', `Histórias (${folder.storyIds.length})`]].map(([key, label]) => <button key={key} className={picker === key ? 'active' : ''} onClick={() => setPicker(key)}>{label}</button>)}</div>
      {picker === 'personIds' && <Picker values={folder.personIds} items={data.people.filter(p => !p.deletedAt).map(p => ({ id: p.id, label: p.nome }))} toggle={id => toggle('personIds', id)} />}
      {picker === 'photoIds' && <Picker values={folder.photoIds} items={allPhotos.map(p => ({ id: p.id, label: `${data.people.find(person => person.id === p.personId)?.nome || 'Não vinculada'} · ${p.name || 'Foto'}` }))} toggle={id => toggle('photoIds', id)} />}
      {picker === 'noteIds' && <Picker values={folder.noteIds} items={data.generalNotes.map(n => ({ id: n.id, label: n.title }))} toggle={id => toggle('noteIds', id)} />}
      {picker === 'storyIds' && <Picker values={folder.storyIds} items={data.stories.map(s => ({ id: s.id, label: s.titulo }))} toggle={id => toggle('storyIds', id)} />}
      {!picker && <p className="form-help"><Lock size={13} />Escolha uma categoria acima para marcar os itens desta pasta. Nada é copiado: a pasta só aponta para o que já existe.</p>}
    </div>
  </Modal>;
}

function Picker({ values, items, toggle }: { values: string[]; items: { id: string; label: string }[]; toggle: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = query ? items.filter(item => normalizeText(item.label).includes(normalizeText(query))) : items;
  return <section className="picker-panel">
    <div className="picker-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar itens..." aria-label="Filtrar itens da pasta" /><span className="muted small">{values.length} selecionados</span></div>
    <div className="picker-list">{filtered.map(item => <CheckBox key={item.id} checked={values.includes(item.id)} onChange={() => toggle(item.id)} label={item.label} />)}{!filtered.length && <p className="form-help">Nenhum item encontrado.</p>}</div>
  </section>;
}
