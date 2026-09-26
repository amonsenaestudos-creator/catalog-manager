/**
 * Momentos em vídeo do perfil: a área viva da ficha.
 *
 * Reprodução vertical (deslize para trocar), miniaturas e dois jeitos de
 * adicionar — arquivo do aparelho ou link (arquivo direto, YouTube ou Vimeo).
 * Arquivos de até 12 MB ficam guardados no catálogo; maiores ficam como
 * endereço temporário da sessão e expiram ao recarregar (a tela avisa).
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clapperboard, Link2, Pencil, Plus, Trash2, TriangleAlert, Upload, X } from 'lucide-react';
import type { MomentoVideo, Person } from '../types';
import { useCatalog } from '../context';
import { generateId, readVideo } from '../store';
import { tipoMidia } from '../lib/retencao';
import { Button, Confirm, EmptyState, IconButton } from './ui';

export function contarMomentos(person: Person): number {
  return (person.momentos || []).length;
}

export default function MomentosPerfil({ person }: { person: Person }) {
  const ctx = useCatalog();
  const momentos = person.momentos || [];
  const [indice, setIndice] = useState(0);
  const [adicionando, setAdicionando] = useState(false);
  const [link, setLink] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [legenda, setLegenda] = useState('');
  const [removendo, setRemovendo] = useState<MomentoVideo | null>(null);
  const [expirados, setExpirados] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const atual = momentos[Math.min(indice, Math.max(0, momentos.length - 1))];

  const salvar = (lista: MomentoVideo[], mensagem: string) => {
    ctx.commit(d => ({
      ...d,
      people: d.people.map(p => (p.id === person.id ? { ...p, momentos: lista, updatedAt: new Date().toISOString() } : p)),
    }), mensagem);
  };

  const adicionarArquivo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (momentos.length >= 20) { ctx.notify('Esta ficha já tem 20 momentos, o limite por perfil.', true); return; }
    setOcupado(true);
    try {
      const { url, temporario } = await readVideo(file);
      const novo: MomentoVideo = { id: generateId(), url, legenda: file.name.replace(/\.[^.]+$/, '').slice(0, 80), createdAt: new Date().toISOString() };
      if (temporario) novo.temporario = true;
      salvar([...momentos, novo], temporario ? 'Vídeo adicionado para esta sessão (arquivo grande demais para guardar).' : 'Momento adicionado ao perfil.');
      ctx.sound('shutter');
      setIndice(momentos.length);
      setAdicionando(false);
    } catch (error) { ctx.notify((error as Error).message, true); }
    finally { setOcupado(false); if (arquivo.current) arquivo.current.value = ''; }
  };

  const adicionarLink = () => {
    const { tipo } = tipoMidia(link);
    if (tipo === 'invalido') { ctx.notify('Esse link não parece um vídeo. Tente um arquivo direto, YouTube ou Vimeo.', true); return; }
    if (momentos.length >= 20) { ctx.notify('Esta ficha já tem 20 momentos, o limite por perfil.', true); return; }
    salvar([...momentos, { id: generateId(), url: link.trim(), legenda: 'Momento em vídeo', createdAt: new Date().toISOString() }], 'Momento adicionado ao perfil.');
    setLink('');
    setIndice(momentos.length);
    setAdicionando(false);
  };

  const salvarLegenda = () => {
    if (!editando) return;
    salvar(momentos.map(m => (m.id === editando ? { ...m, legenda: legenda.trim().slice(0, 140) || 'Momento em vídeo' } : m)), 'Legenda atualizada.');
    setEditando(null);
  };

  const remover = (id: string) => {
    salvar(momentos.filter(m => m.id !== id), 'Momento removido.');
    setIndice(i => Math.max(0, Math.min(i, momentos.length - 2)));
    setRemovendo(null);
  };

  const ir = (delta: number) => {
    if (!momentos.length) return;
    setIndice(i => (i + delta + momentos.length) % momentos.length);
  };

  if (!momentos.length) {
    return <div className="momentos-perfil">
      <EmptyState icon={Clapperboard} title="O perfil ganha vida em vídeo" description="Clipes curtos aparecem aqui em reprodução vertical. Adicione um arquivo do aparelho ou um link." action={ocupado ? 'Carregando...' : 'Adicionar momento'} onAction={() => setAdicionando(true)} />
      {adicionando && <FormularioMomento link={link} setLink={setLink} aoArquivo={() => arquivo.current?.click()} aoLink={adicionarLink} aoFechar={() => setAdicionando(false)} />}
      <input ref={arquivo} type="file" accept="video/*" className="sr-only" aria-label="Escolher vídeo" onChange={e => adicionarArquivo(e.target.files)} />
    </div>;
  }

  return <div className="momentos-perfil">
    <div className="momentos-tela" onKeyDown={e => { if (e.key === 'ArrowDown') ir(1); if (e.key === 'ArrowUp') ir(-1); }} tabIndex={0} aria-label={`Momentos de ${person.nome}: ${indice + 1} de ${momentos.length}`}>
      <motion.div
        key={atual?.id || 'vazio'}
        className="momentos-palco"
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.6}
        onDragEnd={(_e, info) => { if (info.offset.y < -70) ir(1); else if (info.offset.y > 70) ir(-1); }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      >
        {atual && (expirados.includes(atual.id)
          ? <div className="momento-expirado"><TriangleAlert size={30} /><p>Este vídeo era temporário e expirou ao recarregar.</p><Button onClick={() => setRemovendo(atual)}><Trash2 size={15} />Remover</Button></div>
          : <Reprodutor momento={atual} aoExpirar={() => setExpirados(lista => [...lista, atual.id])} />)}
      </motion.div>
      {momentos.length > 1 && <>
        <IconButton label="Momento anterior" className="momento-nav anterior" onClick={() => ir(-1)}><ChevronUp size={20} /></IconButton>
        <IconButton label="Próximo momento" className="momento-nav proximo" onClick={() => ir(1)}><ChevronDown size={20} /></IconButton>
        <span className="momento-contador">{indice + 1} / {momentos.length}</span>
      </>}
    </div>
    {atual && <div className="momento-legenda">
      <div>
        <strong>{atual.legenda || 'Momento em vídeo'}</strong>
        {atual.temporario && <small className="momento-temp"> · temporário desta sessão</small>}
      </div>
      <span>
        <IconButton label="Editar legenda" onClick={() => { setEditando(atual.id); setLegenda(atual.legenda); }}><Pencil size={15} /></IconButton>
        <IconButton label="Remover momento" onClick={() => setRemovendo(atual)}><Trash2 size={15} /></IconButton>
      </span>
    </div>}
    {editando && <form className="momento-editar" onSubmit={e => { e.preventDefault(); salvarLegenda(); }}>
      <input value={legenda} onChange={e => setLegenda(e.target.value)} maxLength={140} placeholder="Legenda do momento" aria-label="Legenda do momento" autoFocus />
      <Button variant="primary" onClick={salvarLegenda}>Salvar</Button>
      <Button onClick={() => setEditando(null)}>Cancelar</Button>
    </form>}
    <div className="momentos-miniaturas" role="listbox" aria-label="Miniaturas dos momentos">
      {momentos.map((m, i) => <button key={m.id} role="option" aria-selected={i === indice} className={i === indice ? 'active' : ''} onClick={() => setIndice(i)} title={m.legenda || `Momento ${i + 1}`}>
        {m.capa ? <img src={m.capa} alt="" /> : <span><Clapperboard size={16} /></span>}
      </button>)}
      <button className="momentos-mais" onClick={() => setAdicionando(true)} title="Adicionar momento" aria-label="Adicionar momento"><Plus size={18} /></button>
    </div>
    {adicionando && <FormularioMomento link={link} setLink={setLink} aoArquivo={() => arquivo.current?.click()} aoLink={adicionarLink} aoFechar={() => setAdicionando(false)} />}
    <input ref={arquivo} type="file" accept="video/*" className="sr-only" aria-label="Escolher vídeo" onChange={e => adicionarArquivo(e.target.files)} />
    {removendo && <Confirm title="Remover este momento?" description="O vídeo sai do perfil. Essa ação pode ser desfeita nesta sessão." confirmLabel="Remover momento" danger onConfirm={() => remover(removendo.id)} onClose={() => setRemovendo(null)} />}
  </div>;
}

function Reprodutor({ momento, aoExpirar }: { momento: MomentoVideo; aoExpirar: () => void }) {
  const { tipo, embed } = tipoMidia(momento.url);
  if (tipo === 'youtube' || tipo === 'vimeo') {
    return <iframe className="momento-video" src={embed} title={momento.legenda || 'Momento em vídeo'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }
  return <video className="momento-video" src={momento.url} poster={momento.capa} controls playsInline preload="metadata" onError={aoExpirar} />;
}

function FormularioMomento({ link, setLink, aoArquivo, aoLink, aoFechar }: { link: string; setLink: (v: string) => void; aoArquivo: () => void; aoLink: () => void; aoFechar: () => void }) {
  return <div className="momento-form">
    <div className="momento-form-head"><strong>Adicionar momento</strong><IconButton label="Fechar" onClick={aoFechar}><X size={16} /></IconButton></div>
    <Button variant="primary" onClick={aoArquivo}><Upload size={15} />Arquivo do aparelho</Button>
    <p className="form-help">Até 12 MB o vídeo fica guardado no catálogo. Maior que isso, vale só nesta sessão.</p>
    <form onSubmit={e => { e.preventDefault(); aoLink(); }}>
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="Ou cole um link (MP4, YouTube, Vimeo...)" aria-label="Link do vídeo" inputMode="url" />
      <Button onClick={aoLink}><Link2 size={15} />Adicionar link</Button>
    </form>
  </div>;
}
