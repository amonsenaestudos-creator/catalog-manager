/**
 * Pacotes: grupos nomeados de fichas.
 *
 * Você junta as pessoas de um time, de um grupo, de uma fase — e exporta o
 * pacote num JSON só com essas fichas (e a foto principal de cada uma). A
 * outra pessoa abre no perfil dela e monta a tierlist com quem você conhece,
 * sem você precisar mandar o catálogo inteiro.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Download, FolderOpen, Package, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useCatalog } from '../context';
import { formatDate, generateId, PALETTE } from '../store';
import type { Pacote } from '../types';
import { montarPacoteNomeado, nomeDoArquivoPacote } from '../lib/pack';
import { downloadJson } from '../store';
import { Button, Confirm, EmptyState, Field, Modal, PageTitle, Avatar } from './ui';

/** Catálogo → seleção em lote → "Pacote": os ids chegam aqui e abrem o criador já com a pré-seleção. */
const CHAVE_PRESELECAO = 'catalog_pacote_novo';

export default function Pacotes() {
  const ctx = useCatalog(), { data } = ctx;
  const [criando, setCriando] = useState(false);
  const [preSelecao, setPreSelecao] = useState<string[]>([]);
  const [editando, setEditando] = useState<Pacote | null>(null);
  const [apagando, setApagando] = useState<Pacote | null>(null);
  const [exportando, setExportando] = useState(false);

  // O catálogo pode pedir "criar pacote com estas pessoas": a passagem por
  // sessão evita estourar a assinatura do navigate e some na hora de usar.
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CHAVE_PRESELECAO);
      sessionStorage.removeItem(CHAVE_PRESELECAO);
      const ids = bruto ? JSON.parse(bruto) : null;
      if (Array.isArray(ids) && ids.length) { setPreSelecao(ids.filter((id): id is string => typeof id === 'string')); setCriando(true); }
    } catch { /* pré-seleção é conveniência, não estado */ }
  }, []);

  const fechar = () => { setCriando(false); setEditando(null); setPreSelecao([]); };
  const pessoasDe = (pacote: Pacote) => data.people.filter(p => !p.deletedAt && pacote.personIds.includes(p.id));

  const exportar = (pacote: Pacote) => {
    if (exportando) return;
    setExportando(true);
    try {
      const arquivo = montarPacoteNomeado(data, pacote, { incluirFotos: true, incluirNotas: true });
      downloadJson(arquivo, nomeDoArquivoPacote(pacote));
      ctx.notify(`Pacote ${pacote.name} exportado com ${arquivo.total} ficha(s).`);
      ctx.sound('pop');
    } catch (error) {
      ctx.notify((error as Error).message || 'Não foi possível exportar o pacote.', true);
    } finally { setExportando(false); }
  };

  return <div className="pacotes-page"><PageTitle eyebrow="Sua biblioteca" title="Pacotes" description="Grupos nomeados que você monta e exporta para outro perfil.">
    <Button variant="primary" onClick={() => { setPreSelecao([]); setCriando(true); }}><Plus size={18} />Novo pacote</Button>
  </PageTitle>
    {!data.pacotes.length && <EmptyState icon={Package} title="Nenhum pacote ainda" description="Junte as pessoas de um time ou de um grupo e exporte o conjunto para outra pessoa abrir no perfil dela." action="Criar o primeiro pacote" onAction={() => { setPreSelecao([]); setCriando(true); }} />}
    <div className="pacotes-list">{data.pacotes.map(pacote => {
      const membros = pessoasDe(pacote);
      return <article key={pacote.id} className="pacote-card" style={{ '--pacote': pacote.color } as React.CSSProperties}>
        <header><span className="pacote-swatch"><Package size={16} /></span><div><h3>{pacote.name}</h3>{pacote.description && <p>{pacote.description}</p>}</div><small>{formatDate(pacote.updatedAt)}</small></header>
        <div className="pacote-membros">
          {membros.slice(0, 8).map(p => <button key={p.id} title={`Abrir ficha de ${p.nome}`} onClick={() => ctx.openPerson(p)}><Avatar person={p} size={34} /><small>{p.nome}</small></button>)}
          {membros.length > 8 && <span className="pacote-mais">+{membros.length - 8}</span>}
          {!membros.length && <span className="muted small">Nenhuma ficha ativa neste pacote.</span>}
        </div>
        <footer>
          <span className="pacote-count"><Users size={14} />{membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}</span>
          <div className="pacote-acoes">
            <Button disabled={exportando || !membros.length} onClick={() => exportar(pacote)}><Download size={15} />{exportando ? 'Exportando...' : 'Exportar JSON'}</Button>
            <Button variant="ghost" onClick={() => { setEditando(pacote); }}><Pencil size={15} />Editar</Button>
            <Button variant="ghost" onClick={() => setApagando(pacote)}><Trash2 size={15} />Excluir</Button>
          </div>
        </footer>
      </article>;
    })}</div>
    {(criando || editando) && <PacoteEditor pacote={editando} preSelecionadas={preSelecao} onFechar={fechar} />}
    {apagando && <Confirm title={`Excluir o pacote ${apagando.name}?`} description="As fichas e as fotos não são tocadas: some só o grupo. O JSON exportado, se você já mandou, continua válido." confirmLabel="Excluir pacote" danger onConfirm={() => { ctx.commit(d => ({ ...d, pacotes: d.pacotes.filter(x => x.id !== apagando.id) }), `Pacote ${apagando.name} excluído.`); setApagando(null); }} onClose={() => setApagando(null)} />}
  </div>;
}

function PacoteEditor({ pacote, preSelecionadas, onFechar }: { pacote: Pacote | null; preSelecionadas: string[]; onFechar: () => void }) {
  const ctx = useCatalog(), { data } = ctx;
  const [nome, setNome] = useState(pacote?.name || '');
  const [descricao, setDescricao] = useState(pacote?.description || '');
  const [cor, setCor] = useState(pacote?.color || PALETTE[0]);
  const [ids, setIds] = useState<string[]>([...new Set(pacote?.personIds || preSelecionadas)]);
  const [busca, setBusca] = useState('');
  const ativas = useMemo(() => data.people.filter(p => !p.deletedAt), [data.people]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ativas;
    return ativas.filter(p => `${p.nome} ${p.apelido || ''} ${p.tags.join(' ')}`.toLowerCase().includes(termo));
  }, [ativas, busca]);
  const alternar = (id: string) => setIds(lista => lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]);
  const usarPasta = (folderIds: string[]) => setIds(lista => [...new Set([...lista, ...folderIds])]);

  const salvar = () => {
    if (!nome.trim()) { ctx.notify('Dê um nome para o pacote.', true); return; }
    if (!ids.length) { ctx.notify('Escolha pelo menos uma pessoa.', true); return; }
    const agora = new Date().toISOString();
    if (pacote) {
      ctx.commit(d => ({ ...d, pacotes: d.pacotes.map(x => x.id === pacote.id ? { ...x, name: nome.trim(), description: descricao.trim(), color: cor, personIds: [...new Set(ids)], updatedAt: agora } : x) }), `Pacote ${nome.trim()} atualizado.`);
    } else {
      ctx.commit(d => ({ ...d, pacotes: [...d.pacotes, { id: generateId(), name: nome.trim(), description: descricao.trim(), color: cor, personIds: [...new Set(ids)], createdAt: agora, updatedAt: agora }] }), `Pacote ${nome.trim()} criado com ${ids.length} ${ids.length === 1 ? 'pessoa' : 'pessoas'}.`);
    }
    ctx.sound('pop');
    onFechar();
  };

  return <Modal title={pacote ? 'Editar pacote' : 'Novo pacote'} description="O grupo de fichas que você vai juntar e, quando quiser, exportar." onClose={onFechar} wide footer={<><Button onClick={onFechar}>Cancelar</Button><Button variant="primary" disabled={!nome.trim() || !ids.length} onClick={salvar}><Check size={16} />{pacote ? 'Salvar mudanças' : 'Criar pacote'}</Button></>}>
    <div className="form-grid">
      <Field label="Nome do pacote"><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Time do jogo de sábado" maxLength={60} autoFocus={!preSelecionadas.length} /></Field>
      <Field label="Cor"><div className="person-color-pick">{PALETTE.map(item => <button key={item} type="button" className={`color-swatch ${cor === item ? 'active' : ''}`} style={{ background: item }} onClick={() => setCor(item)} aria-label={`Cor ${item}`} />)}</div></Field>
    </div>
    <Field label="Descrição" hint="Opcional. Só aparece para você — quem recebe vê o nome e as fichas."><input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Para que serve este grupo?" maxLength={120} /></Field>
    {data.folders.length > 0 && <div className="pacote-pastas"><span className="field-label">Começar de uma pasta:</span>{data.folders.map(folder => <button key={folder.id} type="button" onClick={() => usarPasta(folder.personIds)} title={`Adicionar as ${folder.personIds.length} pessoas de ${folder.name}`}><FolderOpen size={14} />{folder.name}<small>{folder.personIds.length}</small></button>)}</div>}
    <Field label={`Pessoas do pacote (${ids.length})`} hint="Procure pelo nome, apelido ou tag.">
      <div className="pacote-busca"><Search size={15} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pessoas..." aria-label="Buscar pessoas no pacote" /></div>
      <div className="pacote-pessoas">{visiveis.slice(0, 60).map(p => <label key={p.id} className="pacote-pessoa"><input type="checkbox" checked={ids.includes(p.id)} onChange={() => alternar(p.id)} /><Avatar person={p} size={30} /><span>{p.nome}</span></label>)}
        {!visiveis.length && <p className="muted small">Nenhuma pessoa encontrada para “{busca}”.</p>}
      </div>
    </Field>
    {visiveis.length > 60 && <p className="form-help">Mostrando as primeiras 60 de {visiveis.length} — refine a busca para escolher o resto.</p>}
  </Modal>;
}
