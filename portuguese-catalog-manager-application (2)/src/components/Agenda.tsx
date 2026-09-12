import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CalendarDays, Check, MessageSquare, Pause, Play, Plus, Square, Timer, Trash2, Users } from 'lucide-react';
import type { Appointment, Conversation } from '../types';
import { useCatalog } from '../context';
import { DEADLINE_LABELS, deadlineState, formatDate, generateId, today } from '../store';
import { Avatar, Button, Confirm, EmptyState, Field, IconButton, Modal, PageTitle, SectionHeading } from './ui';

const clock = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function Agenda() {
  const ctx = useCatalog(), { data } = ctx;
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [logging, setLogging] = useState<Conversation | null>(null);
  const [scope, setScope] = useState<'proximos' | 'realizados' | 'todos'>('proximos');
  const [timer, setTimer] = useState<{ appointmentId: string; startedAt: number; accumulated: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timer) { setElapsed(0); return; }
    tick.current = setInterval(() => setElapsed(timer.accumulated + Math.floor((Date.now() - timer.startedAt) / 1000)), 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [timer]);

  const lead = data.settings.notificationLeadDays ?? 3;
  const appointments = useMemo(() => [...data.appointments]
    .filter(item => scope === 'todos' ? true : scope === 'realizados' ? item.status === 'realizado' : item.status === 'agendado')
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [data.appointments, scope]);
  const upcoming = data.appointments.filter(item => item.status === 'agendado').sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const nextOne = upcoming[0];
  const conversations = useMemo(() => [...data.conversations].sort((a, b) => b.date.localeCompare(a.date)), [data.conversations]);
  const totalMinutes = data.appointments.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);

  const create = (personId: string | null = null) => setEditing({ id: generateId(), personId, title: '', date: today(), time: '18:00', place: '', notes: '', durationMinutes: null, status: 'agendado', createdAt: new Date().toISOString() });
  const save = () => {
    if (!editing?.title.trim()) { ctx.notify('Dê um nome ao compromisso.', true); return; }
    ctx.commit(d => ({ ...d, appointments: d.appointments.some(item => item.id === editing.id) ? d.appointments.map(item => item.id === editing.id ? editing : item) : [...d.appointments, editing] }), 'Compromisso salvo na agenda.');
    setEditing(null);
  };
  const setStatus = (item: Appointment, status: Appointment['status']) => ctx.commit(d => ({ ...d, appointments: d.appointments.map(x => x.id === item.id ? { ...x, status } : x) }), status === 'realizado' ? 'Encontro marcado como realizado.' : status === 'cancelado' ? 'Compromisso cancelado.' : 'Compromisso reaberto.');
  const startTimer = (item: Appointment) => { setTimer({ appointmentId: item.id, startedAt: Date.now(), accumulated: 0 }); ctx.notify('Cronômetro do encontro iniciado.'); };
  const stopTimer = () => {
    if (!timer) return;
    const seconds = timer.accumulated + Math.floor((Date.now() - timer.startedAt) / 1000);
    const minutes = Math.max(1, Math.round(seconds / 60));
    const item = data.appointments.find(x => x.id === timer.appointmentId);
    ctx.commit(d => ({ ...d, appointments: d.appointments.map(x => x.id === timer.appointmentId ? { ...x, durationMinutes: minutes, status: 'realizado' } : x) }), `Encontro registrado: ${minutes} min.`);
    setTimer(null);
    if (item) setLogging({ id: generateId(), personId: item.personId, date: today(), topic: item.title, content: '', createdAt: new Date().toISOString() });
  };
  const saveLog = () => {
    if (!logging) return;
    if (!logging.topic.trim() && !logging.content.trim()) { ctx.notify('Escreva o assunto ou o resumo.', true); return; }
    ctx.commit(d => ({ ...d, conversations: [...d.conversations, { ...logging, topic: logging.topic.trim() || 'Conversa' }] }), 'Conversa registrada no histórico.');
    setLogging(null);
  };

  return <div className="agenda-page">
    <PageTitle eyebrow="Seus próximos passos" title="Agenda" description="Compromissos, cronômetro de encontros e o histórico do que vocês conversaram.">
      <Button onClick={() => setLogging({ id: generateId(), personId: null, date: today(), topic: '', content: '', createdAt: new Date().toISOString() })}><MessageSquare size={16} />Registrar conversa</Button>
      <Button variant="primary" onClick={() => create()}><Plus size={17} />Novo compromisso</Button>
    </PageTitle>

    <div className="agenda-numbers">
      <div><strong>{upcoming.length}</strong><span>compromissos agendados</span></div>
      <div><strong>{data.appointments.filter(item => item.status === 'realizado').length}</strong><span>encontros realizados</span></div>
      <div><strong>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</strong><span>tempo registrado</span></div>
      <div><strong>{conversations.length}</strong><span>conversas anotadas</span></div>
    </div>

    {timer && <div className="stopwatch-bar"><Timer size={18} /><span>Cronômetro rodando: <b>{clock(elapsed)}</b>{data.appointments.find(item => item.id === timer.appointmentId)?.title ? ` · ${data.appointments.find(item => item.id === timer.appointmentId)?.title}` : ''}</span>
      <span><IconButton label="Pausar cronômetro" onClick={() => setTimer({ ...timer, accumulated: elapsed, startedAt: Date.now() })}><Pause size={16} /></IconButton><Button variant="danger" onClick={stopTimer}><Square size={15} />Parar e salvar</Button></span></div>}

    {nextOne && !timer && <div className="next-appointment">
      <CalendarClock size={20} />
      <div><p className="eyebrow">{DEADLINE_LABELS[deadlineState(nextOne.date, lead).state]}</p><h3>{nextOne.title}</h3><p>{formatDate(nextOne.date)} às {nextOne.time}{nextOne.place ? ` · ${nextOne.place}` : ''}{data.people.find(p => p.id === nextOne.personId) ? ` · com ${data.people.find(p => p.id === nextOne.personId)?.nome}` : ''}</p></div>
      <Button variant="primary" onClick={() => startTimer(nextOne)}><Play size={16} />Iniciar encontro</Button>
    </div>}

    <div className="scope-tabs">{([['proximos', 'Agendados'], ['realizados', 'Realizados'], ['todos', 'Todos']] as const).map(([value, label]) => <button key={value} className={scope === value ? 'active' : ''} onClick={() => setScope(value)}>{label}<span>{value === 'proximos' ? upcoming.length : value === 'realizados' ? data.appointments.filter(item => item.status === 'realizado').length : data.appointments.length}</span></button>)}</div>
    <div className="appointment-list">{appointments.map(item => { const person = data.people.find(p => p.id === item.personId); const state = deadlineState(item.date, lead); return <article key={item.id} className={`appointment-row status-${item.status}`}>
      <div className="appointment-date"><strong>{item.date.slice(8, 10)}</strong><span>{formatDate(item.date).split(' de ')[1]?.slice(0, 3) || item.date.slice(5, 7)}</span></div>
      <div className="appointment-copy"><button onClick={() => setEditing(item)}><strong>{item.title}</strong></button>
        <span>{item.time}{item.place ? ` · ${item.place}` : ''}{item.status === 'agendado' && state.state !== 'futuro' && <small className={`deadline-${state.state}`}> · {DEADLINE_LABELS[state.state]}</small>}{item.durationMinutes ? <small> · {item.durationMinutes} min registrados</small> : ''}</span>
        {item.notes && <p>{item.notes}</p>}</div>
      {person && <button className="reminder-person" onClick={() => ctx.openPerson(person)}><Avatar person={person} size={32} /><span>{person.nome}</span></button>}
      <div className="appointment-actions">
        {item.status === 'agendado' ? <><IconButton label="Iniciar cronômetro" onClick={() => startTimer(item)}><Play size={16} /></IconButton><IconButton label="Marcar como realizado" onClick={() => setStatus(item, 'realizado')}><Check size={16} /></IconButton><IconButton label="Cancelar compromisso" onClick={() => setStatus(item, 'cancelado')}><Trash2 size={16} /></IconButton></>
          : <IconButton label="Reabrir compromisso" onClick={() => setStatus(item, 'agendado')}><CalendarClock size={16} /></IconButton>}
        <IconButton label="Excluir compromisso" onClick={() => setDeleting(item.id)}><Trash2 size={15} /></IconButton>
      </div>
    </article>; })}
    {!appointments.length && <EmptyState icon={CalendarDays} title="Sua agenda está livre" description="Marque encontros, defina local e hora, e use o cronômetro para registrar quanto tempo vocês passaram juntos." action="Novo compromisso" onAction={() => create()} />}</div>

    <section className="conversation-section"><SectionHeading icon={MessageSquare} title="Histórico de conversas" action="Registrar" onAction={() => setLogging({ id: generateId(), personId: null, date: today(), topic: '', content: '', createdAt: new Date().toISOString() })} />
      <div className="conversation-list">{conversations.slice(0, 12).map(item => { const person = data.people.find(p => p.id === item.personId); return <article key={item.id}>
        <header><strong>{item.topic}</strong><time>{formatDate(item.date)}</time>{person && <button onClick={() => ctx.openPerson(person)}><Users size={12} />{person.nome}</button>}</header>
        {item.content && <p>{item.content}</p>}
        <IconButton label="Excluir registro" onClick={() => ctx.commit(d => ({ ...d, conversations: d.conversations.filter(x => x.id !== item.id) }), 'Registro excluído.')}><Trash2 size={14} /></IconButton>
      </article>; })}
      {!conversations.length && <p className="form-help">Anote assuntos, piadas internas e combinados para nunca ficar sem assunto.</p>}</div>
    </section>

    {editing && <Modal title={data.appointments.some(item => item.id === editing.id) ? 'Editar compromisso' : 'Novo compromisso'} onClose={() => setEditing(null)} footer={<><Button onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}><Check size={16} />Salvar</Button></>}>
      <Field label="Compromisso"><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: Café no shopping" maxLength={120} /></Field>
      <div className="form-grid"><Field label="Data"><input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" value={editing.time} onChange={e => setEditing({ ...editing, time: e.target.value })} /></Field></div>
      <Field label="Pessoa"><select value={editing.personId || ''} onChange={e => setEditing({ ...editing, personId: e.target.value || null })}><option value="">Sem pessoa vinculada</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
      <Field label="Local"><input value={editing.place} onChange={e => setEditing({ ...editing, place: e.target.value })} placeholder="Ex.: Praça central" maxLength={120} /></Field>
      <Field label="Anotações"><textarea rows={3} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="O que combinar, o que levar..." /></Field>
    </Modal>}
    {logging && <Modal title="Registrar conversa" description="Fica guardado no seu histórico, com data." onClose={() => setLogging(null)} footer={<><Button onClick={() => setLogging(null)}>Cancelar</Button><Button variant="primary" onClick={saveLog}><Check size={16} />Salvar conversa</Button></>}>
      <div className="form-grid"><Field label="Data"><input type="date" value={logging.date} onChange={e => setLogging({ ...logging, date: e.target.value })} /></Field>
        <Field label="Assunto"><input value={logging.topic} onChange={e => setLogging({ ...logging, topic: e.target.value })} placeholder="Ex.: Conversa sobre viagens" maxLength={120} /></Field></div>
      <Field label="Pessoa"><select value={logging.personId || ''} onChange={e => setLogging({ ...logging, personId: e.target.value || null })}><option value="">Sem pessoa</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
      <Field label="O que vocês falaram?"><textarea rows={5} value={logging.content} onChange={e => setLogging({ ...logging, content: e.target.value })} placeholder="Resumo, assuntos, próximos passos..." /></Field>
    </Modal>}
    {deleting && <Confirm title="Excluir compromisso?" description="Ele sai da agenda. O histórico de conversas continua." danger confirmLabel="Excluir" onClose={() => setDeleting(null)} onConfirm={() => ctx.commit(d => ({ ...d, appointments: d.appointments.filter(item => item.id !== deleting) }), 'Compromisso excluído.')} />}
  </div>;
}
