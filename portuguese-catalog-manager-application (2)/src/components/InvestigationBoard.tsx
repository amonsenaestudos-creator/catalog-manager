import { useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Copy, Edit3, FileText, Folder, GripVertical, Lightbulb, Plus, Search, Trash2 } from 'lucide-react';
import type { InvestigationBoard, InvestigationCard } from '../types';
import { useCatalog } from '../context';
import { formatDate, generateId, PALETTE } from '../store';
import { Avatar, Button, Confirm, EmptyState, Field, IconButton, Modal, PageTitle } from './ui';

const COLUMNS: { id: InvestigationCard['status']; title: string; color: string; hint: string }[] = [
  { id: 'observando', title: 'Observando', color: '#7ba3dc', hint: 'Pontos para observar' },
  { id: 'conectando', title: 'Conectando', color: '#c786ec', hint: 'Ideias que se relacionam' },
  { id: 'confirmado', title: 'Confirmado', color: '#7fbd9b', hint: 'Informações verificadas' },
  { id: 'arquivado', title: 'Arquivado', color: '#aba3b7', hint: 'Pistas concluídas' },
];

function blankCard(status: InvestigationCard['status']): InvestigationCard {
  return { id: generateId(), title: '', content: '', status, personId: null, noteId: null, folderId: null, color: COLUMNS.find(c => c.id === status)?.color || PALETTE[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export default function InvestigationBoardPage() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [boardId, setBoardId] = useState<string | null>(null);
  const board = data.investigationBoards.find(item => item.id === boardId);
  const [createOpen, setCreateOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [editingCard, setEditingCard] = useState<InvestigationCard | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [dragging, setDragging] = useState('');
  const [query, setQuery] = useState('');

  const createBoard = () => {
    if (!boardName.trim()) return;
    const now = new Date().toISOString();
    const next: InvestigationBoard = { id: generateId(), name: boardName.trim(), description: boardDescription.trim(), cards: [], createdAt: now, updatedAt: now };
    ctx.commit(d => ({ ...d, investigationBoards: [...d.investigationBoards, next] }), 'Novo quadro criado.');
    setBoardId(next.id);
    setCreateOpen(false);
  };

  const updateBoard = (updater: (item: InvestigationBoard) => InvestigationBoard, message?: string) => {
    if (!board) return;
    ctx.commit(d => ({ ...d, investigationBoards: d.investigationBoards.map(item => item.id === board.id ? { ...updater(item), updatedAt: new Date().toISOString() } : item) }), message);
  };

  const duplicateBoard = () => {
    if (!board) return;
    const now = new Date().toISOString();
    const copy = { ...structuredClone(board), id: generateId(), name: `${board.name} (cópia)`, createdAt: now, updatedAt: now, cards: board.cards.map(card => ({ ...structuredClone(card), id: generateId(), createdAt: now, updatedAt: now })) };
    ctx.commit(d => ({ ...d, investigationBoards: [...d.investigationBoards, copy] }), 'Quadro duplicado. Sua cópia é independente.');
    setBoardId(copy.id);
  };

  const saveCard = () => {
    if (!editingCard?.title.trim()) { ctx.notify('Dê um título a esta pista.', true); return; }
    const card = { ...editingCard, title: editingCard.title.trim(), content: editingCard.content.trim(), updatedAt: new Date().toISOString() };
    updateBoard(item => ({ ...item, cards: item.cards.some(existing => existing.id === card.id) ? item.cards.map(existing => existing.id === card.id ? card : existing) : [...item.cards, card] }), 'Pista salva no quadro.');
    setEditingCard(null);
  };

  const moveCard = (id: string, status: InvestigationCard['status']) => {
    updateBoard(item => ({ ...item, cards: item.cards.map(card => card.id === id ? { ...card, status, updatedAt: new Date().toISOString() } : card) }), 'Pista movida.');
    setDragging('');
  };

  const filteredCards = (status: InvestigationCard['status']) => board?.cards.filter(card => card.status === status && `${card.title} ${card.content}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))) || [];

  if (!board) {
    return <div className="board-page">
      <PageTitle eyebrow="Um espaço para conectar ideias" title="Quadros de investigação" description="Organize suas próprias anotações, dúvidas e referências com cuidado e contexto."><Button variant="primary" onClick={() => { setBoardName(''); setBoardDescription(''); setCreateOpen(true); }}><Plus size={17} />Novo quadro</Button></PageTitle>
      <div className="board-intro"><div><Lightbulb size={34} /><h2>Comece com uma pergunta.</h2><p>Crie cartões, vincule fichas e notas, e avance cada ideia por etapas. O quadro não altera as informações originais.</p></div><div><span>Observar</span><i /><span>Conectar</span><i /><span>Confirmar</span></div></div>
      <div className="board-list">
        {data.investigationBoards.map(item => <article key={item.id}><button onClick={() => setBoardId(item.id)}><span className="board-list-symbol"><ClipboardList size={25} /></span><div><h2>{item.name}</h2><p>{item.description || 'Sem descrição'}</p><small>{item.cards.length} pistas · atualizado em {formatDate(item.updatedAt, true)}</small></div></button><div><Button onClick={() => setBoardId(item.id)}>Abrir quadro</Button><IconButton label={`Duplicar ${item.name}`} onClick={() => { const copy = { ...structuredClone(item), id: generateId(), name: `${item.name} (cópia)`, cards: item.cards.map(card => ({ ...structuredClone(card), id: generateId() })) }; ctx.commit(d => ({ ...d, investigationBoards: [...d.investigationBoards, copy] }), 'Quadro duplicado.'); setBoardId(copy.id); }}><Copy size={16} /></IconButton><IconButton label={`Excluir ${item.name}`} onClick={() => setDeleteBoardId(item.id)}><Trash2 size={16} /></IconButton></div></article>)}
      </div>
      {!data.investigationBoards.length && <EmptyState icon={ClipboardList} title="Seu quadro está pronto" description="Crie o primeiro quadro para reunir pistas, ideias e anotações do seu catálogo." action="Criar quadro" onAction={() => { setBoardName(''); setCreateOpen(true); }} />}
      {createOpen && <BoardCreator name={boardName} description={boardDescription} setName={setBoardName} setDescription={setBoardDescription} onSave={createBoard} onClose={() => setCreateOpen(false)} />}
      {deleteBoardId && <Confirm title="Excluir este quadro?" description="As fichas, notas e pastas vinculadas continuam intactas. Apenas os cartões deste quadro serão removidos." danger confirmLabel="Excluir quadro" onClose={() => setDeleteBoardId(null)} onConfirm={() => ctx.commit(d => ({ ...d, investigationBoards: d.investigationBoards.filter(item => item.id !== deleteBoardId) }), 'Quadro excluído.')} />}
    </div>;
  }

  return <div className="board-page">
    <button className="back-link" onClick={() => setBoardId(null)}><ArrowLeft size={16} />Todos os quadros</button>
    <PageTitle eyebrow="Investigue com calma" title={board.name} description={board.description || 'Conecte suas ideias e anotações, passo a passo.'}><div className="board-page-actions"><Button onClick={duplicateBoard}><Copy size={16} />Duplicar</Button><Button variant="primary" onClick={() => setEditingCard(blankCard('observando'))}><Plus size={17} />Nova pista</Button><IconButton label="Excluir quadro" onClick={() => setDeleteBoardId(board.id)}><Trash2 size={17} /></IconButton></div></PageTitle>
    <div className="board-explain"><Lightbulb size={16} /><span>Use este quadro apenas para suas próprias anotações e referências. Cartões vinculados apontam para fichas ou notas; nada é alterado automaticamente.</span></div>
    <div className="board-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar pistas neste quadro..." /></div>
    <div className="board-columns">{COLUMNS.map(column => <section key={column.id} className={`board-column ${dragging ? 'board-dragging' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); moveCard(e.dataTransfer.getData('text/plain'), column.id); }}><header style={{ '--column': column.color } as React.CSSProperties}><span /><div><h2>{column.title}</h2><p>{column.hint}</p></div><small>{filteredCards(column.id).length}</small><IconButton label={`Nova pista em ${column.title}`} onClick={() => setEditingCard(blankCard(column.id))}><Plus size={15} /></IconButton></header><div className="board-card-list">{filteredCards(column.id).map(card => <BoardCard key={card.id} card={card} dragging={dragging} onDragStart={() => setDragging(card.id)} onDragEnd={() => setDragging('')} onEdit={() => setEditingCard(structuredClone(card))} onDelete={() => setDeleteCardId(card.id)} />)}{!filteredCards(column.id).length && <button className="board-add-placeholder" onClick={() => setEditingCard(blankCard(column.id))}><Plus size={16} />Adicionar pista</button>}</div></section>)}</div>
    {editingCard && <CardEditor card={editingCard} setCard={setEditingCard} onSave={saveCard} onClose={() => setEditingCard(null)} />}
    {deleteBoardId && <Confirm title="Excluir este quadro?" description="As fichas, notas e pastas vinculadas continuarão intactas. Apenas os cartões deste quadro serão removidos." danger confirmLabel="Excluir quadro" onClose={() => setDeleteBoardId(null)} onConfirm={() => { ctx.commit(d => ({ ...d, investigationBoards: d.investigationBoards.filter(item => item.id !== deleteBoardId) }), 'Quadro excluído.'); setBoardId(null); }} />}
    {deleteCardId && <Confirm title="Excluir esta pista?" description="A ficha, a nota e a pasta relacionadas não serão alteradas." danger confirmLabel="Excluir pista" onClose={() => setDeleteCardId(null)} onConfirm={() => updateBoard(item => ({ ...item, cards: item.cards.filter(card => card.id !== deleteCardId) }), 'Pista removida do quadro.')} />}
  </div>;
}

function BoardCard({ card, dragging, onDragStart, onDragEnd, onEdit, onDelete }: { card: InvestigationCard; dragging: string; onDragStart: () => void; onDragEnd: () => void; onEdit: () => void; onDelete: () => void }) {
  const ctx = useCatalog(); const { data } = ctx;
  const person = data.people.find(p => p.id === card.personId); const note = data.generalNotes.find(n => n.id === card.noteId); const folder = data.folders.find(f => f.id === card.folderId);
  return <article draggable onDragStart={e => { e.dataTransfer.setData('text/plain', card.id); onDragStart(); }} onDragEnd={onDragEnd} className={dragging === card.id ? 'dragging' : ''} style={{ '--card': card.color } as React.CSSProperties}><div className="board-card-grip"><GripVertical size={14} /><div><IconButton label="Editar pista" onClick={onEdit}><Edit3 size={14} /></IconButton><IconButton label="Excluir pista" onClick={onDelete}><Trash2 size={14} /></IconButton></div></div><button className="board-card-open" onClick={onEdit}><h3>{card.title}</h3>{card.content && <p>{card.content}</p>}</button><footer>{person && <button onClick={() => ctx.openPerson(person)}><Avatar person={person} size={27} />{person.nome}</button>}{note && <button onClick={() => ctx.navigate('notes')}><FileText size={13} />{note.title}</button>}{folder && <button onClick={() => ctx.navigate('folders')}><Folder size={13} />{folder.name}</button>}<time>{formatDate(card.updatedAt, true)}</time></footer></article>;
}

function BoardCreator({ name, description, setName, setDescription, onSave, onClose }: { name: string; description: string; setName: (value: string) => void; setDescription: (value: string) => void; onSave: () => void; onClose: () => void }) {
  return <Modal title="Novo quadro de investigação" description="Dê contexto ao que você quer acompanhar." onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!name.trim()} onClick={onSave}><Plus size={16} />Criar quadro</Button></>}><Field label="Nome do quadro"><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ideias para a viagem" maxLength={100} /></Field><Field label="Descrição"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Qual é o foco deste quadro?" /></Field></Modal>;
}

function CardEditor({ card, setCard, onSave, onClose }: { card: InvestigationCard; setCard: (card: InvestigationCard) => void; onSave: () => void; onClose: () => void }) {
  const { data } = useCatalog();
  return <Modal title="Pista do quadro" description="Vincule esta anotação a fichas, notas e pastas se fizer sentido." onClose={onClose} wide footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!card.title.trim()} onClick={onSave}><Check size={16} />Salvar pista</Button></>}><div className="form-grid"><Field label="Título"><input value={card.title} onChange={e => setCard({ ...card, title: e.target.value })} placeholder="O que você quer acompanhar?" maxLength={150} /></Field><Field label="Etapa"><select value={card.status} onChange={e => setCard({ ...card, status: e.target.value as InvestigationCard['status'] })}>{COLUMNS.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}</select></Field></div><Field label="Anotações"><textarea rows={5} value={card.content} onChange={e => setCard({ ...card, content: e.target.value })} placeholder="Escreva contexto, perguntas ou próximos passos." /></Field><div className="form-grid"><Field label="Pessoa relacionada"><select value={card.personId || ''} onChange={e => setCard({ ...card, personId: e.target.value || null })}><option value="">Nenhuma pessoa</option>{data.people.filter(p => !p.deletedAt).map(person => <option key={person.id} value={person.id}>{person.nome}</option>)}</select></Field><Field label="Nota relacionada"><select value={card.noteId || ''} onChange={e => setCard({ ...card, noteId: e.target.value || null })}><option value="">Nenhuma nota</option>{data.generalNotes.map(note => <option key={note.id} value={note.id}>{note.title}</option>)}</select></Field><Field label="Pasta relacionada"><select value={card.folderId || ''} onChange={e => setCard({ ...card, folderId: e.target.value || null })}><option value="">Nenhuma pasta</option>{data.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></Field><Field label="Cor"><div className="color-picker">{PALETTE.map(color => <button key={color} aria-label={`Cor ${color}`} style={{ background: color }} aria-pressed={card.color === color} onClick={() => setCard({ ...card, color })}>{card.color === color && <Check size={14} />}</button>)}</div></Field></div></Modal>;
}