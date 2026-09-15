import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Check, Copy, Download, GripVertical, Layers, MoreHorizontal, Plus, Settings2, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import type { Person, TierList } from '../types';
import { useCatalog } from '../context';
import { generateId, isActive, locationLabel, PALETTE, tierAllows } from '../store';
import { exportTierListPng } from '../lib/export';
import { ehToque, instrucaoMover } from '../lib/dispositivo';
import { Avatar, Button, CheckBox, Confirm, EmptyState, Field, IconButton, Modal, PageTitle } from './ui';

export default function TierLists() {
  const ctx = useCatalog(), { data } = ctx;
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = data.tierLists.find(t => t.id === activeId);
  const [creating, setCreating] = useState(false); const [name, setName] = useState(''); const [rows, setRows] = useState('S, A, B, C, D');
  const [filtersOpen, setFiltersOpen] = useState(false); const [editingName, setEditingName] = useState(false);
  const [tierEdit, setTierEdit] = useState<string | null>(null); const [tierName, setTierName] = useState(''); const [tierColor, setTierColor] = useState(PALETTE[0]);
  const [deleteList, setDeleteList] = useState<string | null>(null); const [deleteRow, setDeleteRow] = useState<string | null>(null);
  const [dragId, setDragId] = useState(''); const [dropTarget, setDropTarget] = useState(''); const [query, setQuery] = useState('');
  const [movePerson, setMovePerson] = useState<Person | null>(null); const [moveTier, setMoveTier] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportPng = async (source: TierList) => { if (ctx.privacy || exporting) return; setExporting(true); try { await exportTierListPng(source, data); ctx.notify('Imagem da tierlist exportada.'); } catch (error) { ctx.notify((error as Error).message, true); } finally { setExporting(false); } };

  const updateList = (updater: (t: TierList) => TierList, message?: string) => { if (!list) return; ctx.commit(d => ({ ...d, tierLists: d.tierLists.map(t => t.id === list.id ? { ...updater(t), updatedAt: new Date().toISOString() } : t) }), message); };
  const create = () => { if (!name.trim()) return; const tiers = [...new Set(rows.split(',').map(s => s.trim()).filter(Boolean))]; if (!tiers.length) { ctx.notify('Crie pelo menos uma faixa.', true); return; } const newList: TierList = { id: generateId(), nome: name.trim(), tiers, items: [], allowedCategories: ['todas'], allowedSubcategories: ['todas'], colors: Object.fromEntries(tiers.map((t, i) => [t, PALETTE[i % PALETTE.length]])) }; ctx.commit(d => ({ ...d, tierLists: [...d.tierLists, newList] }), 'Tierlist criada. Agora escolha seus participantes.'); setActiveId(newList.id); setCreating(false); };
  const duplicateList = (source: TierList) => { const copy = { ...structuredClone(source), id: generateId(), nome: `${source.nome} (cópia)` }; ctx.commit(d => ({ ...d, tierLists: [...d.tierLists, copy] }), 'Tierlist duplicada. As alterações na cópia não afetam a original.'); setActiveId(copy.id); };
  const move = (personId: string, target: string, beforeId?: string) => {
    if (personId === beforeId || target && !list?.tiers.includes(target)) return;
    const person = data.people.find(p => p.id === personId); if (!list || !person || !tierAllows(person, list)) return;
    updateList(t => { const items = t.items.filter(i => i.personId !== personId); if (target) { const index = beforeId ? items.findIndex(i => i.personId === beforeId) : -1; if (index >= 0) items.splice(index, 0, { personId, tier: target }); else items.push({ personId, tier: target }); } return { ...t, items }; });
    setDragId(''); setDropTarget('');
  };
  const reorderPerson = (id: string, direction: number) => { if (!list) return; const entry = list.items.find(i => i.personId === id); if (!entry) return; const row = list.items.filter(i => i.tier === entry.tier); const index = row.findIndex(i => i.personId === id), other = row[index + direction]; if (!other) return; updateList(t => { const items = [...t.items], a = items.findIndex(i => i.personId === id), b = items.findIndex(i => i.personId === other.personId); [items[a], items[b]] = [items[b], items[a]]; return { ...t, items }; }); };
  const reorderRow = (tier: string, direction: number) => updateList(t => { const tiers = [...t.tiers], i = tiers.indexOf(tier), j = i + direction; if (j < 0 || j >= tiers.length) return t; [tiers[i], tiers[j]] = [tiers[j], tiers[i]]; return { ...t, tiers }; });
  const allowed = list ? data.people.filter(p => tierAllows(p, list)) : [];
  const hiddenCount = list ? list.items.filter(i => !allowed.some(p => p.id === i.personId)).length : 0;
  const unclassified = list ? allowed.filter(p => !list.items.some(i => i.personId === p.id) && p.nome.toLowerCase().includes(query.toLowerCase())) : [];
  const toggleCategory = (value: string) => updateList(t => {
    if (value === 'todas') return { ...t, allowedCategories: t.allowedCategories.includes('todas') ? [] : ['todas'] };
    const cats = t.allowedCategories.includes('todas') ? data.categories.map(c => c.value) : t.allowedCategories;
    const next = cats.includes(value) ? cats.filter(c => c !== value) : [...cats, value];
    return { ...t, allowedCategories: next.length === data.categories.length ? ['todas'] : next };
  });
  const saveTier = () => {
    if (!tierName.trim() || !list) return;
    if (list.tiers.some(t => t.toLowerCase() === tierName.trim().toLowerCase() && t !== tierEdit)) { ctx.notify('Já existe uma faixa com esse nome.', true); return; }
    updateList(t => ({ ...t, tiers: tierEdit === '__new' ? [...t.tiers, tierName.trim()] : t.tiers.map(row => row === tierEdit ? tierName.trim() : row), items: t.items.map(i => i.tier === tierEdit ? { ...i, tier: tierName.trim() } : i), colors: { ...t.colors, [tierName.trim()]: tierColor } }), 'Faixa atualizada.'); setTierEdit(null);
  };

  function renderPersonChip(person: Person, assigned = false) {
    return <div key={person.id} className={`tier-person ${dragId === person.id ? 'dragging' : ''}`} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', person.id); e.dataTransfer.effectAllowed = 'move'; setDragId(person.id); }} onDragEnd={() => { setDragId(''); setDropTarget(''); }} onDragOver={assigned ? e => { e.preventDefault(); e.stopPropagation(); } : undefined} onDrop={assigned ? e => { e.preventDefault(); e.stopPropagation(); const tier = list?.items.find(i => i.personId === person.id)?.tier; if (tier) move(e.dataTransfer.getData('text/plain'), tier, person.id); } : undefined}>
      <GripVertical size={13} className="grip" /><button className="tier-person-open" onClick={() => ctx.openPerson(person)}><Avatar person={person} size={44} /><span>{person.nome}<small>{locationLabel(person, data, false)}</small></span></button><div className="tier-chip-actions">{assigned && <><IconButton label="Mover para a esquerda" onClick={() => reorderPerson(person.id, -1)}><ArrowLeft size={12} /></IconButton><IconButton label="Mover para a direita" onClick={() => reorderPerson(person.id, 1)}><ArrowRight size={12} /></IconButton></>}<IconButton label={`Mover ${person.nome} para outra faixa`} onClick={() => { setMovePerson(person); setMoveTier(list?.items.find(i => i.personId === person.id)?.tier || ''); }}><ArrowLeftRight size={13} /></IconButton></div>
    </div>;
  }

  return <div className="tierlists-page">{list ? <><button className="back-link" onClick={() => setActiveId(null)}><ArrowLeft size={16} />Todas as tierlists</button><PageTitle eyebrow="Uma organização que é só sua" title={list.nome} description={`${allowed.length} pessoas disponíveis. ${instrucaoMover('Arraste para organizar ou use a opção Mover.', 'Toque no botão ↔ de uma pessoa para trocá-la de faixa.')}`}><Button onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} />Participantes</Button><div className="menu-anchor"><details className="details-menu"><summary className="btn btn-secondary"><MoreHorizontal size={19} />Mais</summary><div className="dropdown-menu"><button onClick={() => { setName(list.nome); setEditingName(true); }}><Settings2 size={16} />Renomear tierlist</button><button onClick={() => duplicateList(list)}><Copy size={16} />Duplicar tierlist</button><button onClick={() => exportPng(list)} disabled={exporting}><Download size={16} />{exporting ? 'Exportando...' : 'Exportar tierlist PNG'}</button><button className="danger-text" onClick={() => setDeleteList(list.id)}><Trash2 size={16} />Excluir tierlist</button></div></details></div></PageTitle>
      {hiddenCount > 0 && <div className="inline-notice"><Layers size={17} /><span>{hiddenCount} posição(ões) fora dos filtros ou no arquivo. Elas permanecem preservadas e voltarão ao restaurar os participantes.</span></div>}
      <div className="tier-board">
        <div className="tier-board-main">{list.tiers.map((tier, index) => {
          const storedColor = list.colors?.[tier];
          const color = typeof storedColor === 'string' && /^#[\da-f]{6}$/i.test(storedColor) ? storedColor : PALETTE[index % PALETTE.length];
          const members = list.items.filter(i => i.tier === tier && allowed.some(p => p.id === i.personId));
          return <div className="tier-row" key={tier}>
            <div className="tier-label" style={{ backgroundColor: `${color}20`, color }}><strong>{tier}</strong>
              <div className="tier-row-controls">
                <IconButton label="Editar nome e cor" onClick={() => { setTierEdit(tier); setTierName(tier); setTierColor(color); }}><Settings2 size={13} /></IconButton>
                <IconButton label="Subir faixa" disabled={!index} onClick={() => reorderRow(tier, -1)}><ArrowUp size={13} /></IconButton>
                <IconButton label="Descer faixa" disabled={index === list.tiers.length - 1} onClick={() => reorderRow(tier, 1)}><ArrowDown size={13} /></IconButton>
              </div>
            </div>
            <div className={`tier-dropzone ${dropTarget === tier ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setDropTarget(tier); }} onDrop={e => { e.preventDefault(); move(e.dataTransfer.getData('text/plain'), tier); }}>
              {members.map(i => renderPersonChip(data.people.find(p => p.id === i.personId)!, true))}
              {!members.length && <span className="drop-placeholder">{ehToque() ? <><ArrowLeftRight size={15} />Use o botão ↔ da pessoa que está em Não classificadas</> : <><Plus size={16} />Arraste pessoas para esta faixa</>}</span>}
            </div>
          </div>;
        })}
          <Button className="add-tier-row" onClick={() => { setTierEdit('__new'); setTierName(''); setTierColor(PALETTE[list.tiers.length % PALETTE.length]); }}><Plus size={16} />Adicionar faixa personalizada</Button>
        </div>
        <aside className={`unclassified ${dropTarget === '__unassigned' ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setDropTarget('__unassigned'); }} onDrop={e => { e.preventDefault(); move(e.dataTransfer.getData('text/plain'), ''); }}>
          <h3><Users size={17} />Não classificadas<span>{unclassified.length}</span></h3>
          <input value={query} aria-label="Buscar participantes" onChange={e => setQuery(e.target.value)} placeholder="Buscar pessoa..." />
          <div className="unclassified-list">{unclassified.map(p => renderPersonChip(p))}{!unclassified.length && <p className="form-help">{instrucaoMover('Tudo no seu lugar. Arraste uma pessoa de volta para cá se quiser remover a classificação.', 'Tudo no seu lugar. Use o botão ↔ da pessoa para trazê-la de volta e tirar a classificação.')}</p>}</div>
        </aside>
      </div>
    </> : <><PageTitle eyebrow="Seu olhar, suas escolhas" title="Minhas tierlists" description="Organize conexões em faixas que fazem sentido para você."><Button variant="primary" onClick={() => { setCreating(true); setName(''); setRows('S, A, B, C, D'); }}><Plus size={18} />Nova tierlist</Button></PageTitle><div className="tierlist-grid">{data.tierLists.map(t => <article className="tierlist-card" key={t.id}><button className="tierlist-open" onClick={() => setActiveId(t.id)}><span className="tierlist-icon"><Layers size={24} /></span><div className="tierlist-preview">{t.tiers.slice(0, 5).map((tier, i) => <span key={tier} style={{ backgroundColor: `${t.colors?.[tier] || PALETTE[i]}38`, color: t.colors?.[tier] || PALETTE[i] }}>{tier}</span>)}</div><h2>{t.nome}</h2><p>{t.tiers.length} faixas <span>·</span> {t.items.filter(i => data.people.some(p => p.id === i.personId && isActive(p))).length} pessoas organizadas</p></button><div className="tierlist-card-footer"><button className="text-action" onClick={() => setActiveId(t.id)}>Abrir tierlist<ArrowRight size={15} /></button><IconButton label={`Duplicar ${t.nome}`} onClick={() => duplicateList(t)}><Copy size={16} /></IconButton></div></article>)}</div>{!data.tierLists.length && <EmptyState icon={Layers} title="Uma lista com a sua personalidade" description="Crie faixas com nomes próprios, selecione categorias e organize as pessoas arrastando." action="Criar primeira tierlist" onAction={() => { setCreating(true); setName(''); }} />}</>}
    {creating && <Modal title="Nova tierlist" description="Comece com faixas clássicas ou escreva os nomes que quiser." onClose={() => setCreating(false)} footer={<><Button onClick={() => setCreating(false)}>Cancelar</Button><Button variant="primary" disabled={!name.trim()} onClick={create}><Plus size={16} />Criar tierlist</Button></>}><Field label="Nome da tierlist"><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pessoas especiais" /></Field><Field label="Nomes das faixas" hint="Separe os nomes por vírgulas. Você poderá editar depois."><input value={rows} onChange={e => setRows(e.target.value)} placeholder="Incríveis, Ótimas companhias, Quero conhecer" /></Field></Modal>}
    {editingName && list && <Modal title="Renomear tierlist" onClose={() => setEditingName(false)} footer={<><Button onClick={() => setEditingName(false)}>Cancelar</Button><Button variant="primary" disabled={!name.trim()} onClick={() => { updateList(t => ({ ...t, nome: name.trim() }), 'Tierlist renomeada.'); setEditingName(false); }}>Salvar nome</Button></>}><Field label="Novo nome"><input value={name} onChange={e => setName(e.target.value)} /></Field></Modal>}
    {tierEdit && <Modal title={tierEdit === '__new' ? 'Nova faixa' : 'Personalizar faixa'} onClose={() => setTierEdit(null)} footer={<>{tierEdit !== '__new' && (list?.tiers.length || 0) > 1 && <Button variant="danger" onClick={() => { setDeleteRow(tierEdit); setTierEdit(null); }}><Trash2 size={16} />Excluir faixa</Button>}<Button onClick={() => setTierEdit(null)}>Cancelar</Button><Button variant="primary" disabled={!tierName.trim()} onClick={saveTier}><Check size={16} />Salvar faixa</Button></>}><Field label="Nome"><input value={tierName} onChange={e => setTierName(e.target.value)} maxLength={60} /></Field><Field label="Cor"><div className="color-picker">{PALETTE.map(color => <button key={color} aria-label={`Cor ${color}`} aria-pressed={color === tierColor} style={{ backgroundColor: color }} onClick={() => setTierColor(color)}>{color === tierColor && <Check size={15} />}</button>)}<input type="color" aria-label="Escolher outra cor" value={tierColor} onChange={e => setTierColor(e.target.value)} /></div></Field></Modal>}
    {filtersOpen && list && <Modal title="Quem participa desta tierlist?" description="Escolha categorias e refine por subcategoria. As posições fora dos filtros continuam salvas." onClose={() => setFiltersOpen(false)} wide footer={<Button variant="primary" onClick={() => setFiltersOpen(false)}><Check size={16} />Concluir</Button>}><div className="category-scope"><CheckBox label="Todas as categorias" checked={list.allowedCategories.includes('todas')} onChange={() => toggleCategory('todas')} />{data.categories.map(c => {
      const enabled = list.allowedCategories.includes('todas') || list.allowedCategories.includes(c.value);
      const scoped = list.allowedSubcategories.filter(s => s.startsWith(`${c.value}::`));
      const allSubs = list.allowedSubcategories.includes('todas') || !scoped.length;
      return <div className="scope-category" key={c.value}>
        <CheckBox label={c.label} checked={enabled} onChange={() => toggleCategory(c.value)} />
        {enabled && !!c.subs?.length && <div className="scope-subcategories">
          <CheckBox label="Todas desta categoria" checked={allSubs} onChange={() => updateList(t => ({ ...t, allowedSubcategories: [...t.allowedSubcategories.filter(s => s !== 'todas' && !s.startsWith(`${c.value}::`)), ...(allSubs ? [`${c.value}::__none`] : [])] }))} />
          {c.subs.map(s => <CheckBox key={s.value} label={s.label} checked={allSubs || scoped.includes(`${c.value}::${s.value}`)} onChange={() => updateList(t => {
            const key = `${c.value}::${s.value}`;
            const other = t.allowedSubcategories.filter(x => x !== 'todas' && !x.startsWith(`${c.value}::`));
            const current = allSubs ? c.subs!.map(x => `${c.value}::${x.value}`) : scoped.filter(x => !x.endsWith('::__none'));
            const next = current.includes(key) ? current.filter(x => x !== key) : [...current, key];
            return { ...t, allowedSubcategories: [...other, ...(next.length ? next : [`${c.value}::__none`])] };
          })} />)}
        </div>}
      </div>;
    })}</div></Modal>}
    {movePerson && list && <Modal title={`Mover ${movePerson.nome}`} onClose={() => setMovePerson(null)} footer={<><Button onClick={() => setMovePerson(null)}>Cancelar</Button><Button variant="primary" onClick={() => { move(movePerson.id, moveTier); setMovePerson(null); }}>Mover pessoa</Button></>}><Field label="Faixa de destino"><select value={moveTier} onChange={e => setMoveTier(e.target.value)}><option value="">Não classificada</option>{list.tiers.map(t => <option value={t} key={t}>{t}</option>)}</select></Field></Modal>}
    {deleteList && <Confirm title="Excluir esta tierlist?" description="As fichas não serão apagadas. Apenas esta organização será removida. Você pode desfazer durante esta sessão." danger confirmLabel="Excluir tierlist" onConfirm={() => { ctx.commit(d => ({ ...d, tierLists: d.tierLists.filter(t => t.id !== deleteList) }), 'Tierlist excluída.'); setActiveId(null); }} onClose={() => setDeleteList(null)} />}
    {deleteRow && <Confirm title="Excluir esta faixa?" description="As pessoas desta faixa voltarão para Não classificadas. Suas fichas não serão alteradas." danger confirmLabel="Excluir faixa" onConfirm={() => updateList(t => ({ ...t, tiers: t.tiers.filter(row => row !== deleteRow), items: t.items.filter(i => i.tier !== deleteRow) }), 'Faixa excluída.')} onClose={() => setDeleteRow(null)} />}
  </div>;
}