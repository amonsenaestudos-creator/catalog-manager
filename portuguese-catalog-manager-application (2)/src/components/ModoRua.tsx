/**
 * Modo rua: uma mão, decissão rápida.
 *
 * A versão de campo do catálogo, pensada para o polegar: botões grandes,
 * sem menu escondido, sem digitação longa. Você está na rua, viu alguém,
 * lembrou de algo — e quer guardar antes que passe.
 *   · capturar câmera — a foto entra e você decide depois se vincula;
 *   · pessoa nova — nome, idade, categoria, fora;
 *   · nota rápida — o que passou pela cabeça, em duas linhas;
 *   · buscar — achar a ficha pelo nome;
 *   · contexto de local — quem é de cada lugar, e adicionar ali na hora.
 */
import { useMemo, useState } from 'react';
import { Camera, Check, Footprints, Heart, MapPin, NotebookPen, PlusCircle, Search, X } from 'lucide-react';
import { useCatalog } from '../context';
import { formatDate, getDefaultPerson, generateId, isActive, isAdult, medirImagem, normalizePhotos, PALETTE, PHOTO_LABELS, readImage } from '../store';
import type { Person, Photo } from '../types';
import { Button, CheckBox, Field, PhotoView } from './ui';
import { PhotoUploader } from './PersonEditor';

type BlocoRua = 'camera' | 'pessoa' | 'nota' | 'buscar' | 'local';

const BLOCOS: { id: BlocoRua; rotulo: string; dica: string; icone: typeof Camera }[] = [
  { id: 'camera', rotulo: 'Capturar câmera', dica: 'tire a foto, vincule depois', icone: Camera },
  { id: 'pessoa', rotulo: 'Pessoa nova', dica: 'nome e idade, sem cerimônia', icone: PlusCircle },
  { id: 'nota', rotulo: 'Nota rápida', dica: 'guardar o que passou na cabeça', icone: NotebookPen },
  { id: 'buscar', rotulo: 'Buscar', dica: 'achar a ficha pelo nome', icone: Search },
  { id: 'local', rotulo: 'Contexto de local', dica: 'quem é de cada lugar', icone: MapPin },
];

export default function ModoRua() {
  const ctx = useCatalog();
  const [aberto, setAberto] = useState<BlocoRua | null>('camera');
  const alternar = (id: BlocoRua) => { ctx.buzz?.(6); setAberto(atual => atual === id ? null : id); };
  return <div className="rua-page">
    <header className="rua-cabeca"><span className="rua-selo"><Footprints size={20} /></span><div><h1>Modo rua</h1><p>Uma mão. Botões grandes. Sem perder o momento.</p></div></header>
    <div className="rua-grid">{BLOCOS.map(bloco => {
      const Icon = bloco.icone;
      return <button key={bloco.id} className={`rua-tile ${aberto === bloco.id ? 'aberto' : ''}`} onClick={() => alternar(bloco.id)} aria-expanded={aberto === bloco.id}>
        <Icon size={34} strokeWidth={1.5} /><strong>{bloco.rotulo}</strong><small>{bloco.dica}</small>
      </button>;
    })}</div>
    {aberto === 'camera' && <PainelCamera />}
    {aberto === 'pessoa' && <PainelPessoa />}
    {aberto === 'nota' && <PainelNota />}
    {aberto === 'buscar' && <PainelBuscar />}
    {aberto === 'local' && <PainelLocal />}
  </div>;
}

/** Capturar e continuar: cada foto entra na pilha e você só adiciona no fim. */
function PainelCamera() {
  const ctx = useCatalog(), { data } = ctx;
  const [pessoaId, setPessoaId] = useState('');
  const [tipo, setTipo] = useState<Photo['type']>('normal');
  const [consent, setConsent] = useState(false);
  const [prepared, setPrepared] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const prepare = async (files: File[]) => {
    setBusy(true);
    try {
      const fotos = await Promise.all(files.map(async file => {
        const url = await readImage(file);
        const { width, height } = await medirImagem(url);
        return { id: generateId(), url, width, height, name: file.name, personId: null, isMain: false, type: 'normal' as const, createdAt: new Date().toISOString() };
      }));
      setPrepared(lista => [...lista, ...fotos]);
    } catch (error) { ctx.notify((error as Error).message, true); } finally { setBusy(false); }
  };
  const adicionar = () => {
    if (!prepared.length || busy) return;
    const dono = data.people.find(p => p.id === pessoaId);
    if (tipo !== 'normal' && (!consent || dono && !isAdult(dono))) { ctx.notify('Mídias adultas exigem confirmação e vínculo com uma pessoa maior de idade.', true); return; }
    const fotos = prepared.map(p => ({ ...p, type: tipo, personId: pessoaId || null }));
    ctx.commit(d => ({
      ...d,
      orphanPhotos: pessoaId ? d.orphanPhotos : [...d.orphanPhotos, ...fotos],
      people: pessoaId ? d.people.map(p => p.id === pessoaId ? { ...p, fotos: normalizePhotos([...p.fotos, ...fotos], p.id) } : p) : d.people,
    }), `${fotos.length} foto(s) capturada(s) e guardada(s).`);
    ctx.sound('shutter');
    setPrepared([]); setConsent(false);
  };
  return <section className="rua-painel" aria-label="Capturar câmera">
    <PhotoUploader onFiles={prepare} busy={busy} large />
    <div className="form-grid">
      <Field label="Vincular a uma pessoa"><select value={pessoaId} onChange={e => { setPessoaId(e.target.value); setTipo('normal'); }}><option value="">Não vincular agora (foto órfã)</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
      <Field label="Tipo da foto"><select value={tipo} onChange={e => setTipo(e.target.value as Photo['type'])}>{Object.entries(PHOTO_LABELS).map(([value, label]) => <option key={value} value={value} disabled={value !== 'normal' && !!pessoaId && !isAdult(data.people.find(p => p.id === pessoaId)!)}>{label}</option>)}</select></Field>
    </div>
    {tipo !== 'normal' && <CheckBox checked={consent} onChange={() => setConsent(!consent)} label="Confirmo que as imagens são de adultos e que tenho autorização para guardá-las." />}
    {prepared.length > 0 && <>
      <div className="upload-previews">{prepared.map(p => <div key={p.id}><PhotoView src={p.url} alt={p.name} /><IconButtonRua label="Remover da pilha" onClick={() => setPrepared(lista => lista.filter(f => f.id !== p.id))}><X size={14} /></IconButtonRua><span>{p.name}</span></div>)}</div>
      <p className="field-hint">{prepared.length} foto(s) na pilha — capture quantas quiser e adicione de uma vez.</p>
    </>}
    <div className="rua-painel-rodape"><Button variant="primary" disabled={!prepared.length || busy || (tipo !== 'normal' && !consent)} onClick={adicionar}><Camera size={17} />Adicionar {prepared.length > 0 ? `${prepared.length} ` : ''}foto(s) à galeria</Button></div>
  </section>;
}

function IconButtonRua({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>{children}</button>;
}

function PainelPessoa() {
  const ctx = useCatalog(), { data } = ctx;
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [categoria, setCategoria] = useState('');
  const novaPessoa = (): Person => {
    const base = getDefaultPerson();
    return { ...base, id: generateId(), nome: nome.trim(), idade: idade ? Number(idade) : null, localizacaoOnde: categoria, descricao: 'Adicionada pelo modo rua — os detalhes podem vir depois.' };
  };
  const criar = (e: React.FormEvent) => {
    e.preventDefault();
    if (ctx.savePerson(novaPessoa())) { setNome(''); setIdade(''); setCategoria(''); }
  };
  const criarEVoltar = () => { if (ctx.savePerson(novaPessoa())) ctx.navigate('catalog'); };
  return <form className="rua-painel" aria-label="Pessoa nova" onSubmit={criar}>
    <Field label="Como ela se chama?"><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" maxLength={80} autoFocus /></Field>
    <div className="form-grid">
      <Field label="Idade (opcional)"><input type="number" min={0} max={120} value={idade} onChange={e => setIdade(e.target.value.replace(/\D/g, ''))} placeholder="Anos" inputMode="numeric" /></Field>
      <Field label="Onde ela é de? (opcional)"><select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Sem categoria</option>{data.categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
    </div>
    <div className="rua-painel-rodape rua-duos"><Button type="submit" variant="primary" disabled={!nome.trim()}><Check size={17} />Salvar e continuar</Button><Button type="button" variant="ghost" disabled={!nome.trim()} onClick={criarEVoltar}><PlusCircle size={17} />Salvar e voltar ao catálogo</Button></div>
  </form>;
}

function PainelNota() {
  const ctx = useCatalog(), { data } = ctx;
  const [texto, setTexto] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const recentes = useMemo(() => data.generalNotes.slice(0, 3), [data.generalNotes]);
  const guardar = () => {
    const limpo = texto.trim();
    if (!limpo) { ctx.notify('Escreva algo antes de guardar.', true); return; }
    const nota = {
      id: generateId(),
      title: limpo.split('\n')[0].slice(0, 60),
      content: limpo,
      type: 'observacao' as const,
      personIds: pessoaId ? [pessoaId] : [],
      folderId: null,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ctx.commit(d => ({ ...d, generalNotes: [nota, ...d.generalNotes] }), 'Nota rápida guardada.');
    ctx.sound('pop');
    setTexto(''); setPessoaId('');
  };
  return <section className="rua-painel" aria-label="Nota rápida">
    <Field label="O que passou pela cabeça?"><textarea rows={4} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ex.: vi ela perto do portão, estava com a amiga de antes..." /></Field>
    <Field label="Sobre quem? (opcional)"><select value={pessoaId} onChange={e => setPessoaId(e.target.value)}><option value="">Sem ligação com uma ficha</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
    <div className="rua-painel-rodape"><Button variant="primary" disabled={!texto.trim()} onClick={guardar}><NotebookPen size={17} />Guardar nota</Button></div>
    {recentes.length > 0 && <div className="rua-notas-recentes"><h3>Últimas notas rápidas</h3>{recentes.map(nota => <button key={nota.id} onClick={() => ctx.navigate('notes')}><strong>{nota.title}</strong><small>{formatDate(nota.updatedAt)}</small></button>)}</div>}
  </section>;
}

function PainelBuscar() {
  const ctx = useCatalog(), { data } = ctx;
  const [termo, setTermo] = useState('');
  const resultados = useMemo(() => {
    const limpo = termo.trim().toLowerCase();
    if (!limpo) return [];
    return data.people.filter(p => !p.deletedAt && `${p.nome} ${p.apelido || ''} ${p.tags.join(' ')}`.toLowerCase().includes(limpo)).slice(0, 8);
  }, [data.people, termo]);
  return <section className="rua-painel" aria-label="Buscar pessoa">
    <div className="rua-busca"><Search size={20} /><input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Digite o nome..." aria-label="Buscar pessoa pelo nome" autoFocus /></div>
    {termo.trim() && !resultados.length && <p className="muted small">Ninguém com “{termo}” por aqui.</p>}
    <div className="rua-resultados">{resultados.map(p => <button key={p.id} onClick={() => ctx.openPerson(p)}><AvatarRua person={p} /><span><strong>{p.nome}</strong><small>{p.apelido || data.categories.find(c => c.value === p.localizacaoOnde)?.label || 'Sem categoria'}</small></span><Heart size={15} className={p.favorite ? 'pink' : 'muted'} fill={p.favorite ? 'currentColor' : 'none'} /></button>)}</div>
  </section>;
}

function AvatarRua({ person }: { person: Person }) {
  const foto = person.fotos.find(f => f.isMain) || person.fotos[0];
  if (foto) return <img className="rua-avatar" src={foto.url} alt={person.nome} loading="lazy" />;
  return <span className="rua-avatar" style={{ background: PALETTE[0] }}>{person.nome.slice(0, 2).toUpperCase()}</span>;
}

function PainelLocal() {
  const ctx = useCatalog(), { data } = ctx;
  const [local, setLocal] = useState('');
  const locais = useMemo(() => data.categories
    .map(c => ({ ...c, total: data.people.filter(p => isActive(p) && p.localizacaoOnde === c.value).length }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10), [data.categories, data.people]);
  const pessoasDoLocal = useMemo(() => data.people
    .filter(p => isActive(p) && p.localizacaoOnde === local)
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 6), [data.people, local]);
  const adicionarAqui = () => {
    const base = getDefaultPerson();
    base.localizacaoOnde = local;
    base.descricao = '';
    ctx.saveDraft({ id: 'new-person', kind: 'add', payload: base, updatedAt: new Date().toISOString() });
    ctx.navigate('add');
  };
  return <section className="rua-painel" aria-label="Contexto de local">
    <div className="rua-locais">{locais.map(item => <button key={item.value} className={local === item.value ? 'ativa' : ''} onClick={() => setLocal(item.value)}><MapPin size={16} /><span>{item.label}</span><small>{item.total}</small></button>)}
      {!locais.length && <p className="muted small">Nenhuma categoria com pessoas ainda.</p>}
    </div>
    {local && <>
      <div className="rua-locais-pessoas">{pessoasDoLocal.map(p => <button key={p.id} onClick={() => ctx.openPerson(p)}><AvatarRua person={p} /><span><strong>{p.nome}</strong><small>{p.localizacaoMora || data.categories.find(c => c.value === local)?.label}</small></span></button>)}
        {!pessoasDoLocal.length && <p className="muted small">Ninguém ativo neste local ainda.</p>}
      </div>
      <div className="rua-painel-rodape"><Button variant="primary" onClick={adicionarAqui}><PlusCircle size={17} />Adicionar pessoa aqui</Button></div>
    </>}
  </section>;
}
