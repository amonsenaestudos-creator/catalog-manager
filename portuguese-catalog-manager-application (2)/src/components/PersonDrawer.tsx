import { useState } from 'react';
import { Archive, CalendarDays, Camera, Check, Copy, Download, Edit3, ExternalLink, Eye, FileText, Heart, Link2, MapPin, MoreHorizontal, Plus, Printer, Sparkles, Star, Trash2, Trophy } from 'lucide-react';
import { ADULT_APPEARANCE_TAGS } from '../types';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { ageFromBirthday, calculateOverallRating, completeness, daysUntil, downloadJson, formatDate, formatNumber, friendshipLabel, generateId, isAdult, locationLabel, RARITY_LABELS, rarityFor, RATING_FIELDS, upcomingBirthday } from '../store';
import { Radar } from './Charts';
import { exportPersonPng } from '../lib/export';
import { usePersonDraft } from '../hooks/usePersonDraft';
import PersonEditor, { ReadNotes } from './PersonEditor';
import StarRating from './StarRating';
import { Button, Confirm, EmptyState, IconButton, Modal, PhotoView, Tag } from './ui';
import { averageRadar } from '../lib/stats';

export default function PersonDrawer({ person }: { person: Person }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const [editing, setEditing] = useState(!!data.drafts[`edit-${person.id}`]);
  const [tab, setTab] = useState('info');
  const [menu, setMenu] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const draft = usePersonDraft(`edit-${person.id}`, 'edit', person);
  const complete = completeness(person);
  const adult = isAdult(person);
  const tags = person.tags.filter(tag => adult || !ADULT_APPEARANCE_TAGS.includes(tag));
  const details = [
    ['Apelido', person.apelido], ['Nível de amizade', friendshipLabel(person.friendshipLevel)], ['Idade', person.idade ? `${person.idade} anos` : ''], ['Altura', person.altura],
    ['Cabelo', [person.cabeloTipo, person.cabeloCor === 'colorido' ? person.cabeloCorCustom : person.cabeloCor].filter(Boolean).join(', ')],
    ['Tom de pele', person.pele === 'personalizado' ? person.peleCustom : person.pele], ['Tipo de corpo', person.tipoCorpo], ['Estilo de roupa', person.estiloRoupa],
    ['Onde mora', person.localizacaoMora], ['Contato', person.redesSociais], ['Q.I. (anotação)', person.qi], ['Última interação', person.ultimoVisto ? formatDate(person.ultimoVisto) : ''], ['Adicionada em', formatDate(person.createdAt)],
    ...(person.aniversario ? [['Aniversário', `${formatDate(person.aniversario)}${upcomingBirthday(person.aniversario) !== null ? ` · faltam ${upcomingBirthday(person.aniversario)} dias` : ''}`]] : []),
    ...(person.customFields || []).map(custom => [custom.label, custom.value] as [string, string]),
  ];
  const exportImage = async () => {
    if (ctx.privacy) return;
    setBusy(true);
    try { await exportPersonPng(person, data); ctx.notify('Imagem da ficha exportada.'); }
    catch (error) { ctx.notify((error as Error).message, true); }
    finally { setBusy(false); setMenu(false); }
  };
  const moveArchive = () => { ctx.changePeople([person.id], { archivedAt: person.archivedAt ? null : new Date().toISOString() }, person.archivedAt ? 'Ficha desarquivada.' : 'Ficha arquivada.'); setMenu(false); };
  return <Modal title={editing ? `Editar ${person.nome}` : 'Fichário pessoal'} description={person.archivedAt ? 'Esta ficha está arquivada. Seus dados e vínculos continuam preservados.' : undefined} onClose={ctx.closePerson} wide className="person-drawer">
    {editing ? <PersonEditor {...draft} onDiscard={draft.discard} onSave={() => { if (ctx.savePerson(draft.person, `edit-${person.id}`)) setEditing(false); }} onCancel={ctx.closePerson} /> : <div className="person-read no-print">
      <div className="person-cover">
        <button className="cover-photo" onClick={() => setPhoto(person.fotos.find(f => f.isMain)?.url || person.fotos[0]?.url || null)}>
          <PhotoView person={person} /><span><Camera size={16} />Ver foto</span>
        </button>
        <div className="person-intro">
          <div className="intro-top"><span className="eyebrow">{person.archivedAt ? 'No arquivo' : 'Sua conexão'}</span><IconButton label={person.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => ctx.changePeople([person.id], { favorite: !person.favorite }, person.favorite ? 'Removida dos favoritos.' : 'Adicionada aos favoritos.')}><Heart size={21} fill={person.favorite ? 'currentColor' : 'none'} className={person.favorite ? 'pink' : ''} /></IconButton></div>
          <h2>{person.nome}</h2><p className="person-location"><MapPin size={15} />{locationLabel(person, data)}</p>
          <span className={`rarity-chip rarity-${person.rarity || rarityFor(calculateOverallRating(person.rating))}`}><Sparkles size={12} />{RARITY_LABELS[person.rarity || rarityFor(calculateOverallRating(person.rating))]}{person.aniversario && ageFromBirthday(person.aniversario) !== null && <small> · {ageFromBirthday(person.aniversario)} anos</small>}</span>
          <StarRating value={calculateOverallRating(person.rating)} readonly size={21} />
          <p className="friendship-read">{friendshipLabel(person.friendshipLevel)}<span>Nível de amizade · não afeta a nota</span></p>
          <p className="person-description">{person.descricao}</p><div className="tags">{tags.map(tag => <Tag key={tag} name={tag} />)}</div>
          <div className="person-primary-actions">
            <Button variant="primary" onClick={() => setEditing(true)}><Edit3 size={16} />Editar ficha</Button><Button onClick={() => ctx.seenToday([person.id])}><Eye size={16} />Vi hoje <small>{person.viHojeCount}</small></Button>
            <div className="menu-anchor"><IconButton label="Mais ações" onClick={() => setMenu(!menu)}><MoreHorizontal size={20} /></IconButton>{menu && <div className="dropdown-menu"><button onClick={exportImage} disabled={busy}><Download size={16} />{busy ? 'Gerando imagem...' : 'Exportar ficha PNG'}</button><button onClick={() => { downloadJson(person, `catalog-ficha-${person.id}.json`); setMenu(false); }}><FileText size={16} />Exportar ficha JSON</button><button onClick={() => { setMenu(false); window.print(); }}><Printer size={16} />Imprimir ficha</button><button onClick={() => ctx.duplicate(person)}><Copy size={16} />Duplicar ficha</button><button onClick={() => { ctx.navigate('reminders'); ctx.closePerson(); }}><Plus size={16} />Criar lembrete</button><button onClick={moveArchive}><Archive size={16} />{person.archivedAt ? 'Desarquivar' : 'Arquivar ficha'}</button><button className="danger-text" onClick={() => { setConfirmTrash(true); setMenu(false); }}><Trash2 size={16} />Mover para lixeira</button></div>}</div>
          </div>
          <div className="completion-line"><div><span>Ficha {complete.percent}% completa</span><span>{complete.percent === 100 ? <Check size={14} /> : `${complete.missing.length} detalhes a preencher`}</span></div><span className="progress-track"><i style={{ width: `${complete.percent}%` }} /></span></div>
        </div>
      </div>
      <div className="editor-tabs"><button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}><FileText size={17} />Informações</button><button className={tab === 'ratings' ? 'active' : ''} onClick={() => setTab('ratings')}><Star size={17} />Avaliações</button><button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}><FileText size={17} />Notas <small>{person.notas.length}</small></button><button className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}><Camera size={17} />Fotos <small>{person.fotos.length}</small></button><button className={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}><Trophy size={17} />Metas <small>{data.goals.filter(goal => goal.personId === person.id && !goal.done).length}</small></button></div>
      {tab === 'info' && <><dl className="person-facts">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl>{person.observacoesGerais && <section className="read-text"><h3>Observações gerais</h3><p>{person.observacoesGerais}</p></section>}{person.comportamento && <section className="read-text"><h3>Comportamento</h3><p>{person.comportamento}</p></section>}{person.descricaoCorporal && <section className="read-text"><h3>Descrição corporal</h3><p>{person.descricaoCorporal}</p></section>}<div className="read-text"><h3>Pastas</h3><div className="collection-picker">{data.folders.map(folder => <button className={folder.personIds.includes(person.id) ? 'selected' : ''} key={folder.id} onClick={() => ctx.commit(d => ({ ...d, folders: d.folders.map(x => x.id === folder.id ? { ...x, personIds: x.personIds.includes(person.id) ? x.personIds.filter(id => id !== person.id) : [...x.personIds, person.id], updatedAt: new Date().toISOString() } : x) }), 'Pasta atualizada.')}><span style={{ background: folder.color }} />{folder.name}{folder.personIds.includes(person.id) && <Check size={13} />}</button>)}{!data.folders.length && <p className="muted">Crie uma pasta em Organizar para reunir fichas, notas e fotos.</p>}</div></div></>}
      {tab === 'info' && (person.attachments || []).length > 0 && <div className="read-text"><h3><Link2 size={15} />Anexos</h3><div className="attachment-links">{(person.attachments || []).map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={13} /><span>{item.label || 'Anexo'}<small>{item.kind.toUpperCase()}</small></span></a>)}</div></div>}
      {tab === 'ratings' && <><div className="rating-summary"><div><h3>Nota geral</h3><p>{person.rating.mode === 'manual' ? 'Definida manualmente' : 'Média ponderada dos atributos preenchidos'}</p></div><strong>{formatNumber(calculateOverallRating(person.rating))}<small>/ 5</small></strong></div><div className="rating-fields">{RATING_FIELDS.filter(field => !field.adult || adult).map(field => <div key={field.key} className="rating-field"><span>{field.label}<small>Peso {formatNumber(field.weight)}</small></span><StarRating value={person.rating[field.key]} readonly size={21} /></div>)}</div>
        <div className="rating-radar"><h3>Radar comparado à média</h3><Radar axes={RATING_FIELDS.filter(field => !field.adult || adult).map(field => field.label)} series={[{ name: person.nome, values: RATING_FIELDS.filter(field => !field.adult || adult).map(field => person.rating[field.key] || 0) }, { name: 'Média do catálogo', values: averageRadar(data).filter(item => RATING_FIELDS.filter(field => !field.adult || adult).some(field => field.label === item.label)).map(item => item.value) }]} /></div>
        {(person.ratingHistory || []).length > 0 && <div className="rating-history-block"><h3>Histórico da nota</h3><ul className="rating-history">{(person.ratingHistory || []).slice(-8).reverse().map((entry, index) => <li key={`${entry.date}-${index}`}><time>{formatDate(entry.date)}</time><strong>{formatNumber(entry.overall)}</strong></li>)}</ul></div>}</>}
      {tab === 'goals' && <PersonGoals personId={person.id} personName={person.nome} />}
      {tab === 'notes' && <ReadNotes person={person} />}
      {tab === 'photos' && <div className="gallery-grid drawer-gallery">{person.fotos.map(file => <button key={file.id} onClick={() => setPhoto(file.url)}><PhotoView src={file.url} alt={person.nome} />{file.isMain && <span className="photo-caption"><Star size={13} />Foto principal</span>}</button>)}{!person.fotos.length && <EmptyState icon={Camera} title="Sua galeria começa aqui" action="Adicionar fotos" onAction={() => setEditing(true)} />}</div>}
    </div>}
    <article className="print-only print-region"><h1>{person.nome}</h1><p>{locationLabel(person, data)}</p><PhotoView person={person} /><p>{person.descricao}</p><dl>{details.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl><h2>Avaliações</h2>{RATING_FIELDS.filter(field => !field.adult || adult).map(field => <p key={field.key}>{field.label}: {formatNumber(person.rating[field.key])} / 5</p>)}<h2>Notas</h2>{person.notas.map(note => <section key={note.id}><h3>{note.title}</h3><p>{note.content}</p></section>)}<h3>Observações</h3><p>{person.observacoesGerais}</p>{(person.customFields || []).map(custom => <p key={custom.id}>{custom.label}: {custom.value}</p>)}<p>{person.comportamento}</p><p>{person.descricaoCorporal}</p></article>
    {confirmTrash && <Confirm title="Mover esta ficha para a lixeira?" description="As fotos, notas e vínculos serão preservados. Você poderá restaurar a ficha a qualquer momento." confirmLabel="Mover para lixeira" danger onConfirm={() => ctx.trashPeople([person.id])} onClose={() => setConfirmTrash(false)} />}
    {photo && <Modal title={person.nome} onClose={() => setPhoto(null)} wide><img src={photo} alt={`Foto de ${person.nome}`} className="full-photo" /></Modal>}
  </Modal>;
}
/** Checklist de objetivos por pessoa: puxar assunto, pegar o número, marcar encontro. */
function PersonGoals({ personId, personName }: { personId: string; personName: string }) {
  const ctx = useCatalog(), { data } = ctx;
  const [title, setTitle] = useState('');
  const goals = data.goals.filter(goal => goal.personId === personId).sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt));
  const done = goals.filter(goal => goal.done).length;
  const add = () => {
    const text = title.trim();
    if (!text) { ctx.notify('Escreva o objetivo primeiro.', true); return; }
    ctx.commit(d => ({ ...d, goals: [...d.goals, { id: generateId(), title: text, done: false, personId, due: null, kind: 'conexao', createdAt: new Date().toISOString() }] }), 'Objetivo adicionado.');
    ctx.addXp(2, 'Novo objetivo de conexão');
    setTitle('');
  };
  const toggle = (id: string, isDone: boolean) => ctx.commit(d => ({ ...d, goals: d.goals.map(goal => goal.id === id ? { ...goal, done: !isDone, doneAt: !isDone ? new Date().toISOString() : null } : goal) }), isDone ? 'Objetivo reaberto.' : 'Objetivo concluído!');
  return <div className="person-goals">
    <div className="goal-progress"><span>{done} de {goals.length} concluídos com {personName}</span><i><b style={{ width: `${goals.length ? done / goals.length * 100 : 0}%` }} /></i></div>
    <form className="goal-add" onSubmit={event => { event.preventDefault(); add(); }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: puxar assunto, pegar o número, marcar um café" maxLength={140} aria-label="Novo objetivo" />
      <Button variant="primary" onClick={add}><Plus size={16} />Adicionar</Button>
    </form>
    {goals.length ? <ul className="goal-checklist">{goals.map(goal => { const left = daysUntil(goal.due); return <li key={goal.id} className={goal.done ? 'done' : ''}>
      <button className={`complete-reminder ${goal.done ? 'checked' : ''}`} onClick={() => toggle(goal.id, goal.done)} aria-label={goal.done ? 'Reabrir objetivo' : 'Concluir objetivo'}>{goal.done && <Check size={15} />}</button>
      <span><strong>{goal.title}</strong>{goal.due && <small className={left !== null && left < 0 && !goal.done ? 'overdue' : ''}> · {left !== null && left < 0 && !goal.done ? 'prazo vencido' : left === 0 ? 'vence hoje' : `até ${formatDate(goal.due)}`}</small>}{goal.doneAt && <small> · feito em {formatDate(goal.doneAt)}</small>}</span>
      <IconButton label="Definir prazo" onClick={() => { const due = window.prompt('Prazo (AAAA-MM-DD), vazio para tirar:', goal.due || ''); if (due === null) return; ctx.commit(d => ({ ...d, goals: d.goals.map(item => item.id === goal.id ? { ...item, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null } : item) }), 'Prazo atualizado.'); }}><CalendarDays size={15} /></IconButton>
      <IconButton label="Excluir objetivo" onClick={() => ctx.commit(d => ({ ...d, goals: d.goals.filter(item => item.id !== goal.id) }), 'Objetivo excluído.')}><Trash2 size={15} /></IconButton>
    </li>; })}</ul> : <EmptyState icon={Trophy} title="Nenhum objetivo ainda" description="Pequenos passos ajudam: puxar assunto, pegar o número, marcar um encontro." />}
  </div>;
}
