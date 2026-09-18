import { useEffect, useMemo, useRef, useState } from 'react';
import { BookHeart, CalendarDays, Check, Download, ExternalLink, Grid3x3, Heart, KeyRound, LayoutGrid, Link2, Lock, NotebookPen, Plus, Search, Smile, Sparkles, Tag, Trash2, Trophy, Unlock } from 'lucide-react';
import type { Goal, JournalEntry, PersonalLink, Photo } from '../types';
import { useCatalog } from '../context';
import { daysUntil, downloadBlob, formatDate, generateId, normalizeText, PHOTO_LABELS, textStats, today } from '../store';
import { streakInfo } from '../lib/progress';
import { playMood } from '../lib/sound';
import { Avatar, Button, Confirm, EmptyState, Field, IconButton, Modal, PageTitle, SectionHeading } from './ui';
import GaleriaGrade from './GaleriaGrade';
import VisorDeFotos from './VisorDeFotos';
import { FolhaDeAcoes } from './Folha';
import type { AcaoDeFolha } from './Folha';
import { MODOS_GALERIA, lerModoSalvo, salvarModo } from '../lib/galeria';
import type { ModoGaleria } from '../lib/galeria';
import { useFaixasGrudadas } from '../hooks/useFaixasGrudadas';
import { useSelecaoLote } from '../hooks/useSelecaoLote';

const MODO_COFRE_CHAVE = 'catalog_cofre_modo';

const MOODS = [{ value: 1, label: 'Difícil', emoji: '😔' }, { value: 2, label: 'Baixo', emoji: '😕' }, { value: 3, label: 'Ok', emoji: '🙂' }, { value: 4, label: 'Bom', emoji: '😊' }, { value: 5, label: 'Ótimo', emoji: '🤩' }];
const moodEmoji = (value: number) => MOODS.find(mood => mood.value === value)?.emoji || '🙂';
const moodLabel = (value: number) => MOODS.find(mood => mood.value === value)?.label || '';

type Tab = 'diario' | 'metas' | 'links' | 'cofre';

export default function MySpace() {
  const ctx = useCatalog(), { data } = ctx;
  const [tab, setTab] = useState<Tab>('diario');
  const streak = streakInfo(data);
  const tabs: { id: Tab; label: string; icon: typeof NotebookPen; count: number }[] = [
    { id: 'diario', label: 'Diário', icon: NotebookPen, count: data.journal.length },
    { id: 'metas', label: 'Metas', icon: Trophy, count: data.goals.filter(goal => !goal.done).length },
    { id: 'links', label: 'Meus links', icon: Link2, count: data.personalLinks.length },
    { id: 'cofre', label: 'Cofre', icon: KeyRound, count: data.vault.photoIds.length },
  ];
  // A barra do cofre gruda embaixo das abas: a página inteira mede as duas faixas.
  const pagina = useRef<HTMLDivElement>(null);
  const estiloPagina = useFaixasGrudadas(pagina, [tab, data.vault.photoIds.length]);
  return <div className="myspace-page" ref={pagina} style={estiloPagina}>
    <PageTitle eyebrow="Ambiente pessoal" title="Meu espaço" description="Um canto só seu: humor, metas, links e um cofre separado do catálogo.">
      <Button onClick={() => ctx.navigate('agenda')}><Sparkles size={16} />Agenda</Button>
    </PageTitle>
    <div className="myspace-header">
      <div><p className="eyebrow">Seu momento</p><h2>{data.journal.length ? `Você já escreveu ${data.journal.length} ${data.journal.length === 1 ? 'página' : 'páginas'} aqui.` : 'Sua primeira página espera por você.'}</h2><p>Humor médio: {data.journal.length ? `${(data.journal.reduce((sum, entry) => sum + entry.mood, 0) / data.journal.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5` : 'registre seu primeiro dia'} · <span className={`streak-flame level-${streak.count >= 30 ? 3 : streak.count >= 7 ? 2 : streak.count >= 3 ? 1 : 0}`} title={`Próximo marco: ${streak.nextMilestone} dias`}>🔥 {streak.count} {streak.count === 1 ? 'dia seguido' : 'dias seguidos'}</span> no catálogo{streak.count >= 3 ? ` · faltam ${streak.nextMilestone - streak.count} para o marco de ${streak.nextMilestone}` : ''}</p></div>
      <div className="mood-strip">{MOODS.map(mood => { const count = data.journal.filter(entry => entry.mood === mood.value).length; return <span key={mood.value} title={`${mood.label}: ${count}`}><b>{mood.emoji}</b><small>{count}</small></span>; })}</div>
    </div>
    <div className="scope-tabs">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={15} />{item.label}<span>{item.count}</span></button>)}</div>
    {tab === 'diario' && <Journal />}
    {tab === 'metas' && <Goals />}
    {tab === 'links' && <Links />}
    {tab === 'cofre' && <VaultTab />}
  </div>;
}

function Journal() {
  const ctx = useCatalog(), { data } = ctx;
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const entries = useMemo(() => [...data.journal]
    .filter(entry => !query || normalizeText(`${entry.title} ${entry.content} ${entry.tags.join(' ')}`).includes(normalizeText(query)))
    .filter(entry => !filterTag || entry.tags.includes(filterTag))
    .sort((a, b) => b.date.localeCompare(a.date)), [data.journal, query, filterTag]);
  const tags = [...new Set(data.journal.flatMap(entry => entry.tags))];
  const create = () => setEditing({ id: generateId(), date: today(), mood: 3, title: '', content: '', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const save = () => {
    if (!editing || (!editing.title.trim() && !editing.content.trim())) { ctx.notify('Escreva algo antes de salvar.', true); return; }
    const entry = { ...editing, title: editing.title.trim() || 'Sem título', updatedAt: new Date().toISOString() };
    ctx.commit(d => ({ ...d, journal: d.journal.some(item => item.id === entry.id) ? d.journal.map(item => item.id === entry.id ? entry : item) : [entry, ...d.journal] }), 'Página salva no seu espaço.');
    setEditing(null);
  };
  return <div className="journal-wrap">
    <div className="journal-toolbar">
      <div className="search-field"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nas suas páginas..." aria-label="Buscar no diário" /></div>
      {tags.length > 0 && <select value={filterTag} onChange={e => setFilterTag(e.target.value)} aria-label="Filtrar por etiqueta"><option value="">Todas as etiquetas</option>{tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select>}
      <Button variant="primary" onClick={create}><Plus size={16} />Nova página</Button>
    </div>
    <div className="journal-grid">{entries.map(entry => <article key={entry.id} className="journal-card">
      <header><span className="journal-mood" title={moodLabel(entry.mood)}>{moodEmoji(entry.mood)}</span><div><h3>{entry.title}</h3><time>{formatDate(entry.date)}</time></div>
        <span className="journal-actions"><IconButton label="Editar página" onClick={() => setEditing(entry)}><NotebookPen size={15} /></IconButton><IconButton label="Excluir página" onClick={() => setDeleting(entry.id)}><Trash2 size={15} /></IconButton></span>
      </header>
      <p>{entry.content.length > 260 ? `${entry.content.slice(0, 260)}…` : entry.content}</p>
      <footer><span><Tag size={12} />{entry.tags.join(', ') || 'sem etiquetas'}</span><small>{textStats(entry.content).words} palavras · {textStats(entry.content).minutes} min</small></footer>
    </article>)}
    {!entries.length && <EmptyState icon={BookHeart} title="Um espaço para o que é seu" description="Anote o dia, o humor e o que você não quer esquecer. Nada aqui aparece nas fichas." action="Escrever primeira página" onAction={create} />}</div>
    {editing && <Modal title={data.journal.some(item => item.id === editing.id) ? 'Editar página' : 'Nova página'} description="Só você lê isto aqui." onClose={() => setEditing(null)} wide footer={<><span className="muted small">{textStats(editing.content).words} palavras</span><Button onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}><Check size={16} />Salvar página</Button></>}>
      <div className="form-grid"><Field label="Data"><input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></Field>
        <Field label="Como foi o dia?"><div className="mood-picker">{MOODS.map(mood => <button key={mood.value} type="button" className={editing.mood === mood.value ? 'active' : ''} onClick={() => { setEditing({ ...editing, mood: mood.value }); playMood(mood.value); }} aria-pressed={editing.mood === mood.value} title={mood.label}>{mood.emoji}</button>)}</div></Field></div>
      <Field label="Título"><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: Um dia bom" maxLength={120} /></Field>
      <Field label="Sua página"><textarea rows={10} value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} placeholder="Escreva livremente..." /></Field>
      <Field label="Etiquetas" hint="Separe por vírgula"><input value={editing.tags.join(', ')} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="trabalho, família, ideias" /></Field>
    </Modal>}
    {deleting && <Confirm title="Excluir esta página?" description="Ela sai do seu espaço pessoal. Nada mais é alterado." danger confirmLabel="Excluir página" onClose={() => setDeleting(null)} onConfirm={() => ctx.commit(d => ({ ...d, journal: d.journal.filter(entry => entry.id !== deleting) }), 'Página excluída.')} />}
  </div>;
}

function Goals() {
  const ctx = useCatalog(), { data } = ctx;
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [scope, setScope] = useState<'abertas' | 'concluidas' | 'todas'>('abertas');
  const goals = data.goals.filter(goal => scope === 'todas' || scope === 'concluidas' ? goal.done : !goal.done)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
  const done = data.goals.filter(goal => goal.done).length;
  const create = (kind: Goal['kind']) => setEditing({ id: generateId(), title: '', done: false, personId: null, due: null, kind, createdAt: new Date().toISOString() });
  const save = () => { if (!editing?.title.trim()) { ctx.notify('Dê um nome à meta.', true); return; } ctx.commit(d => ({ ...d, goals: d.goals.some(goal => goal.id === editing.id) ? d.goals.map(goal => goal.id === editing.id ? editing : goal) : [...d.goals, editing] }), 'Meta salva.'); setEditing(null); };
  const toggle = (goal: Goal) => { ctx.commit(d => ({ ...d, goals: d.goals.map(item => item.id === goal.id ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : null } : item) }), goal.done ? 'Meta reaberta.' : 'Meta concluída. Parabéns!'); if (!goal.done) ctx.sound('success'); };
  return <div className="goals-wrap">
    <div className="scope-tabs">{(['abertas', 'concluidas', 'todas'] as const).map(value => <button key={value} className={scope === value ? 'active' : ''} onClick={() => setScope(value)}>{value === 'abertas' ? 'Abertas' : value === 'concluidas' ? 'Concluídas' : 'Todas'}<span>{value === 'abertas' ? data.goals.filter(goal => !goal.done).length : value === 'concluidas' ? done : data.goals.length}</span></button>)}
      <div className="scope-end"><Button onClick={() => create('pessoal')}><Plus size={15} />Meta pessoal</Button><Button variant="primary" onClick={() => create('conexao')}><Heart size={15} />Meta com alguém</Button></div></div>
    <div className="goal-progress"><span>{done} de {data.goals.length} concluídas</span><i><b style={{ width: `${data.goals.length ? done / data.goals.length * 100 : 0}%` }} /></i></div>
    <div className="goal-list">{goals.map(goal => { const person = data.people.find(p => p.id === goal.personId); const left = daysUntil(goal.due); return <div key={goal.id} className={`goal-row ${goal.done ? 'done' : ''}`}>
      <button className={`complete-reminder ${goal.done ? 'checked' : ''}`} onClick={() => toggle(goal)} aria-label={goal.done ? 'Reabrir meta' : 'Concluir meta'}>{goal.done && <Check size={15} />}</button>
      <div className="goal-copy"><button onClick={() => setEditing(goal)}><strong>{goal.title}</strong></button>
        <span>{goal.kind === 'conexao' ? 'Com alguém' : 'Meta pessoal'}{goal.due && <small className={left !== null && left < 0 && !goal.done ? 'overdue' : ''}> · {left !== null && left < 0 && !goal.done ? 'prazo vencido' : left === 0 ? 'vence hoje' : `até ${formatDate(goal.due)}`}</small>}</span></div>
      {person && <button className="reminder-person" onClick={() => ctx.openPerson(person)}><Avatar person={person} size={30} /><span>{person.nome}</span></button>}
      <IconButton label="Excluir meta" onClick={() => setDeleting(goal.id)}><Trash2 size={16} /></IconButton>
    </div>; })}
    {!goals.length && <EmptyState icon={Trophy} title="Metas dão direção" description="Crie metas para você ou para uma conexão: puxar assunto, pegar o número, marcar um encontro." action="Criar meta" onAction={() => create('pessoal')} />}</div>
    {editing && <Modal title={data.goals.some(goal => goal.id === editing.id) ? 'Editar meta' : 'Nova meta'} onClose={() => setEditing(null)} footer={<><Button onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}><Check size={16} />Salvar meta</Button></>}>
      <Field label="O que você quer alcançar?"><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: Puxar assunto na segunda" maxLength={140} /></Field>
      <div className="form-grid"><Field label="Prazo (opcional)"><input type="date" value={editing.due || ''} onChange={e => setEditing({ ...editing, due: e.target.value || null })} /></Field>
        <Field label="Tipo"><select value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as Goal['kind'] })}><option value="pessoal">Meta pessoal</option><option value="conexao">Meta com alguém</option></select></Field></div>
      {editing.kind === 'conexao' && <Field label="Pessoa"><select value={editing.personId || ''} onChange={e => setEditing({ ...editing, personId: e.target.value || null })}><option value="">Sem pessoa</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>}
    </Modal>}
    {deleting && <Confirm title="Excluir meta?" description="A meta sai da sua lista." danger confirmLabel="Excluir" onClose={() => setDeleting(null)} onConfirm={() => ctx.commit(d => ({ ...d, goals: d.goals.filter(goal => goal.id !== deleting) }), 'Meta excluída.')} />}
  </div>;
}

function Links() {
  const ctx = useCatalog(), { data } = ctx;
  const [editing, setEditing] = useState<PersonalLink | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const groups = [...new Set(data.personalLinks.map(link => link.group || 'Geral'))];
  const save = () => {
    if (!editing?.label.trim() || !/^https?:\/\/|mailto:|tel:/i.test(editing.url.trim())) { ctx.notify('Informe um nome e um endereço http(s), mailto: ou tel:.', true); return; }
    ctx.commit(d => ({ ...d, personalLinks: d.personalLinks.some(link => link.id === editing.id) ? d.personalLinks.map(link => link.id === editing.id ? editing : link) : [...d.personalLinks, editing] }), 'Link guardado.');
    setEditing(null);
  };
  return <div className="links-wrap">
    <div className="journal-toolbar"><p className="muted small">Guarde perfis, playlists, documentos e qualquer endereço que você consulta sempre.</p><Button variant="primary" onClick={() => setEditing({ id: generateId(), label: '', url: '', group: groups[0] || 'Geral', note: '', createdAt: new Date().toISOString() })}><Plus size={16} />Novo link</Button></div>
    {groups.map(group => <section key={group}><SectionHeading icon={Link2} title={group} /><div className="link-grid">{data.personalLinks.filter(link => (link.group || 'Geral') === group).map(link => <article key={link.id} className="link-card">
      <a href={link.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={15} /><span><strong>{link.label}</strong><small>{link.note || link.url.replace(/^https?:\/\//, '').slice(0, 48)}</small></span></a>
      <span><IconButton label="Editar link" onClick={() => setEditing(link)}><NotebookPen size={14} /></IconButton><IconButton label="Excluir link" onClick={() => setDeleting(link.id)}><Trash2 size={14} /></IconButton></span>
    </article>)}</div></section>)}
    {!data.personalLinks.length && <EmptyState icon={Link2} title="Seus endereços, num lugar só" description="Perfis, vídeos, PDFs e links que você não quer procurar de novo." action="Adicionar link" onAction={() => setEditing({ id: generateId(), label: '', url: '', group: 'Geral', note: '', createdAt: new Date().toISOString() })} />}
    {editing && <Modal title={data.personalLinks.some(link => link.id === editing.id) ? 'Editar link' : 'Novo link'} onClose={() => setEditing(null)} footer={<><Button onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}><Check size={16} />Salvar</Button></>}>
      <div className="form-grid"><Field label="Nome"><input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="Ex.: Playlist de treino" maxLength={80} /></Field>
        <Field label="Grupo"><input value={editing.group} onChange={e => setEditing({ ...editing, group: e.target.value })} list="link-groups" placeholder="Geral" /><datalist id="link-groups">{groups.map(group => <option key={group} value={group} />)}</datalist></Field></div>
      <Field label="Endereço"><input value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://..." /></Field>
      <Field label="Anotação"><input value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })} placeholder="Por que este link importa?" maxLength={160} /></Field>
    </Modal>}
    {deleting && <Confirm title="Excluir link?" description="Somente o atalho é removido." danger confirmLabel="Excluir" onClose={() => setDeleting(null)} onConfirm={() => ctx.commit(d => ({ ...d, personalLinks: d.personalLinks.filter(link => link.id !== deleting) }), 'Link excluído.')} />}
  </div>;
}

function VaultTab() {
  const ctx = useCatalog(), { data } = ctx;
  const [pin, setPin] = useState(''); const [error, setError] = useState('');
  const [configOpen, setConfigOpen] = useState(false); const [newPin, setNewPin] = useState('');
  const [modo, setModo] = useState<ModoGaleria>(() => lerModoSalvo(MODO_COFRE_CHAVE) || 'mosaico');
  const [visor, setVisor] = useState(-1);
  const [sobAcao, setSobAcao] = useState<Photo | null>(null);
  /* O cofre guarda ids: a foto pode continuar na galeria, sumir da ficha ou
     ser apagada — a lista é sempre lida por cima do que ainda existe. */
  const fotos = useMemo(() => {
    const porId = new Map<string, Photo>();
    for (const person of data.people) for (const photo of person.fotos) porId.set(photo.id, photo);
    for (const photo of data.orphanPhotos) porId.set(photo.id, photo);
    return data.vault.photoIds.map(id => porId.get(id)).filter((photo): photo is Photo => Boolean(photo));
  }, [data]);
  const lote = useSelecaoLote(fotos);
  useEffect(() => { salvarModo(MODO_COFRE_CHAVE, modo); }, [modo]);
  const nomeDe = (photo: Photo) => data.people.find(person => person.id === photo.personId)?.nome || 'Sem ficha';

  if (!ctx.vaultUnlocked) return <div className="vault-locked">
    <Lock size={34} strokeWidth={1.3} />
    <h2>Cofre pessoal</h2>
    <p>{data.vault.pin ? 'Este cofre usa um PIN próprio, diferente do PIN do modo privacidade.' : 'Defina um PIN para guardar fotos que não devem aparecer na galeria comum.'}</p>
    <form onSubmit={event => { event.preventDefault(); if (!ctx.unlockVault(pin)) { setError('PIN incorreto.'); return; } setError(''); }}>
      {data.vault.pin ? <input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="PIN do cofre" aria-label="PIN do cofre" /> : null}
      {error && <p className="form-error">{error}</p>}
      <Button type="submit" variant="primary"><Unlock size={16} />Abrir cofre</Button>
    </form>
    <button className="text-action" onClick={() => { setNewPin(data.vault.pin || ''); setConfigOpen(true); }}>{data.vault.pin ? 'Trocar o PIN do cofre' : 'Definir um PIN'}</button>
    {configOpen && <Modal title={data.vault.pin ? 'Trocar PIN do cofre' : 'Definir PIN do cofre'} description="Use de 4 a 8 números. Ele protege apenas este cofre." onClose={() => setConfigOpen(false)} footer={<><Button onClick={() => setConfigOpen(false)}>Cancelar</Button><Button variant="primary" disabled={!/^\d{4,8}$/.test(newPin)} onClick={() => { ctx.commit(d => ({ ...d, vault: { ...d.vault, pin: newPin } }), 'PIN do cofre atualizado.'); ctx.unlockVault(newPin); setConfigOpen(false); }}><KeyRound size={16} />Salvar PIN</Button></>}>
      <Field label="Novo PIN"><input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={8} /></Field>
    </Modal>}
  </div>;;

  const tirarDoCofre = (ids: string[]) => {
    ctx.commit(d => ({ ...d, vault: { ...d.vault, photoIds: d.vault.photoIds.filter(id => !ids.includes(id)) } }), ids.length === 1 ? 'Foto retirada do cofre. Ela continua na galeria.' : `${ids.length} fotos fora do cofre. Elas continuam na galeria.`);
    setVisor(-1); setSobAcao(null); lote.sair();
  };
  const baixar = async (photo: Photo) => {
    if (ctx.privacy) return;
    try {
      const blob = await (await fetch(photo.url)).blob();
      const extensao = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' } as Record<string, string>)[blob.type] || 'png';
      const nome = (photo.name || 'foto-do-cofre').replace(/\.[^.]+$/, '');
      if (!document.documentElement.classList.contains('privacy-active')) downloadBlob(blob, `${nome}.${extensao}`);
    } catch { ctx.notify('Não foi possível baixar esta imagem.', true); }
  };
  const abrir = (photo: Photo) => setVisor(Math.max(0, fotos.findIndex(item => item.id === photo.id)));

  /** Segurar a foto: o menu do dedo, com o que faz sentido dentro do cofre. */
  const acoesDaFoto = (photo: Photo): AcaoDeFolha[] => [
    { rotulo: photo.favorite ? 'Tirar das favoritas' : 'Guardar nas favoritas', icone: Heart, onClick: () => ctx.togglePhotoFavorite(photo.id) },
    { rotulo: lote.tem(photo.id) ? 'Tirar do lote' : 'Escolher no lote', icone: Check, onClick: () => lote.alternar(photo, false) },
    { rotulo: 'Baixar a imagem', icone: Download, onClick: () => { void baixar(photo); } },
    { rotulo: 'Tirar do cofre', icone: Unlock, perigo: true, onClick: () => tirarDoCofre([photo.id]) },
    ...(photo.personId ? [{ rotulo: `Abrir a ficha de ${nomeDe(photo)}`, icone: ExternalLink, onClick: () => ctx.openPerson(photo.personId!) } as AcaoDeFolha] : []),
  ];

  const detalhesDaFoto = (photo: Photo) => (
    <div className="visor-detalhes-corpo">
      <dl className="visor-dados">
        <div><dt>Ficha</dt><dd>{nomeDe(photo)}</dd></div>
        <div><dt>Guardada em</dt><dd>{formatDate(photo.createdAt)}</dd></div>
        <div><dt>Tipo</dt><dd>{PHOTO_LABELS[photo.type]}</dd></div>
        <div><dt>Arquivo</dt><dd>{photo.name || '—'}</dd></div>
      </dl>
      <div className="visor-detalhes-acoes">
        {photo.personId && <Button onClick={() => ctx.openPerson(photo.personId!)}><ExternalLink size={15} />Abrir a ficha</Button>}
        <Button variant="danger" onClick={() => tirarDoCofre([photo.id])}><Unlock size={15} />Tirar do cofre</Button>
      </div>
    </div>
  );

  return <div className="vault-open">
    <div className="journal-toolbar"><p className="muted small"><Smile size={14} />{fotos.length} {fotos.length === 1 ? 'foto guardada' : 'fotos guardadas'} no cofre. Elas continuam fora da galeria comum.</p>
      <span><Button onClick={() => setConfigOpen(true)}><KeyRound size={15} />{data.vault.pin ? 'Trocar PIN' : 'Definir PIN'}</Button><Button onClick={ctx.lockVault}><Lock size={15} />Fechar cofre</Button></span></div>

    {/* A mesma faixa da galeria: modo de ver e escolha em lote, grudada no topo. */}
    {!!fotos.length && <div className="gallery-topo">
      <div className="gallery-barra">
        <div className="gallery-barra-fim">
          <span className="gallery-contagem">{fotos.length} no cofre</span>
          <button type="button" className={`gallery-ajuste ${lote.ativa ? 'ligado' : ''}`} onClick={() => (lote.ativa ? lote.sair() : lote.entrar())}><Check size={15} />{lote.ativa ? 'Sair da seleção' : 'Escolher'}</button>
          <div className="gallery-modos" role="group" aria-label="Modo de ver">
            {MODOS_GALERIA.map(item => <button key={item.id} type="button" title={item.dica} aria-label={`Ver como ${item.nome}`} aria-pressed={modo === item.id} className={modo === item.id ? 'active' : ''} onClick={() => setModo(item.id)}>
              {item.id === 'mosaico' ? <Grid3x3 size={16} /> : item.id === 'quadra' ? <LayoutGrid size={16} /> : <CalendarDays size={16} />}<span>{item.nome}</span>
            </button>)}
          </div>
        </div>
      </div>
    </div>}

    {fotos.length ? <GaleriaGrade fotos={fotos} modo={modo} dados={data} selecionando={lote.ativa} selecionadas={lote.ids}
      aoAbrir={abrir} aoAlternar={lote.alternar} aoFavoritar={photo => ctx.togglePhotoFavorite(photo.id)}
      aoSegurar={photo => { ctx.buzz?.(14); setSobAcao(photo); }} aoSelecionarTudo={lote.selecionarTudo} />
      : <EmptyState icon={Lock} title="Cofre vazio" description="Na galeria, segure uma foto e escolha Enviar ao cofre. Só aqui ela fica fora da galeria comum." action="Ir para a galeria" onAction={() => ctx.navigate('gallery')} />}

    {lote.ativa && <div className="gallery-lote" role="group" aria-label="Ações do cofre">
      <strong>{lote.ids.length ? `${lote.ids.length} escolhida${lote.ids.length === 1 ? '' : 's'}` : 'Toque nas fotos'}</strong>
      <div>
        <button type="button" onClick={lote.selecionarTudo}><Check size={17} />Tudo</button>
        <button type="button" disabled={!lote.ids.length} onClick={() => tirarDoCofre(lote.ids)}><Unlock size={17} />Tirar do cofre</button>
        <button type="button" onClick={lote.sair}>Concluir</button>
      </div>
    </div>}

    {visor >= 0 && fotos[visor] && (
      <VisorDeFotos fotos={fotos} indice={Math.min(visor, fotos.length - 1)} aoMudar={setVisor} aoFechar={() => setVisor(-1)}
        titulo={nomeDe} apoio={photo => `No cofre desde ${formatDate(photo.createdAt)} · ${PHOTO_LABELS[photo.type]}`}
        aoFavoritar={photo => ctx.togglePhotoFavorite(photo.id)} aoBaixar={photo => { void baixar(photo); }}
        acoes={acoesDaFoto} selecionada={!!fotos[Math.min(visor, fotos.length - 1)] && lote.tem(fotos[Math.min(visor, fotos.length - 1)].id)}
        aoAlternarSelecao={photo => lote.alternar(photo, false)} detalhes={detalhesDaFoto} />
    )}

    {sobAcao && (
      <FolhaDeAcoes titulo={nomeDe(sobAcao)} subtitulo={`No cofre · ${PHOTO_LABELS[sobAcao.type]}`}
        aoFechar={() => setSobAcao(null)} acao={{ rotulo: 'Abrir a foto', onClick: () => { abrir(sobAcao); setSobAcao(null); } }} itens={acoesDaFoto(sobAcao)} />
    )}

    {configOpen && <Modal title={data.vault.pin ? 'Trocar PIN do cofre' : 'Definir PIN do cofre'} onClose={() => setConfigOpen(false)} footer={<><Button onClick={() => setConfigOpen(false)}>Cancelar</Button><Button variant="primary" disabled={!/^\d{4,8}$/.test(newPin)} onClick={() => { ctx.commit(d => ({ ...d, vault: { ...d.vault, pin: newPin } }), 'PIN do cofre atualizado.'); setConfigOpen(false); }}><KeyRound size={16} />Salvar PIN</Button></>}>
      <Field label="Novo PIN"><input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={8} /></Field>
    </Modal>}

  </div>;
}

export { MOODS };
