import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Archive, ArrowRight, BarChart3, Bell, BookOpen, Brain, Cake, Calculator, CalendarClock, CalendarDays,
  Check, ChevronRight, ClipboardList, Compass, Contact, Copy, Database, Dices, Download, FileSpreadsheet, Flag, FolderPlus,
  Hash, HeartHandshake, History, Hourglass, IdCard, Image, KeyRound, Layers, Lightbulb, Link, Map, MessageSquareText,
  MessagesSquare, Moon, Newspaper, NotebookPen, PenLine, Percent, Play, Puzzle, Receipt, RotateCcw, Ruler, Save, ScanSearch,
  Search, SearchCheck, Send, ShieldCheck, Shuffle, SquareCheckBig, Star, Tags, Target, TextCursorInput, Timer, TrendingUp,
  Trophy, Type, Wrench,
} from 'lucide-react';
import { useCatalog } from '../context';
import { Button, Confirm, EmptyState, Field, IconButton, Modal, PageTitle } from './ui';
import { downloadBlob, normalizeText } from '../store';
import { FERRAMENTAS, GRUPOS, type Tool, type ToolOutput } from '../lib/toolkit';
import { playSound } from '../lib/sound';

/** Os ícones são guardados por nome no catálogo de ferramentas. */
const ICONES: Record<string, typeof Wrench> = {
  Archive, BarChart3, Bell, BookOpen, Brain, Cake, Calculator, CalendarClock, CalendarDays, ClipboardList, Compass, Contact,
  Copy, Database, Dices, Download, FileSpreadsheet, Flag, FolderPlus, Hash, HeartHandshake, History, Hourglass, IdCard,
  Image, KeyRound, Layers, Lightbulb, Link, Map, MessageSquareText, MessagesSquare, Moon, Newspaper, NotebookPen, PenLine,
  Percent, Puzzle, Receipt, Ruler, Save, ScanSearch, SearchCheck, Send, ShieldCheck, Shuffle, SquareCheckBig, Star, Tags,
  Target, TextCursorInput, Timer, TrendingUp, Trophy, Type, Wrench,
};

function Icone({ nome, size = 17 }: { nome: string; size?: number }) {
  const Componente = ICONES[nome] || Wrench;
  return <Componente size={size} strokeWidth={1.8} />;
}

/** Ferramentas que precisam de relógio na tela. */
function Relogio({ modo, minutos }: { modo: 'pomodoro' | 'temporizador'; minutos: number }) {
  const total = (modo === 'pomodoro' ? 25 : minutos) * 60;
  const [restante, setRestante] = useState(total);
  const [rodando, setRodando] = useState(true);
  const [ciclo, setCiclo] = useState(1);
  const alertado = useRef(false);
  useEffect(() => { setRestante(total); setRodando(true); alertado.current = false; }, [total]);
  useEffect(() => {
    if (!rodando) return;
    const timer = setInterval(() => {
      setRestante(anterior => {
        if (anterior <= 1) {
          clearInterval(timer);
          setRodando(false);
          if (!alertado.current) {
            alertado.current = true;
            playSound('success');
            try { if (window.Notification?.permission === 'granted') new Notification(modo === 'pomodoro' ? 'Pomodoro concluído!' : 'Tempo esgotado!', { body: modo === 'pomodoro' ? 'Faça uma pausa de 5 minutos.' : 'O temporizador chegou ao fim.' }); } catch { /* sem permissão de aviso */ }
          }
          return 0;
        }
        return anterior - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rodando, modo]);
  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');
  const progresso = total ? 1 - restante / total : 0;
  return <div className="tool-clock">
    <div className="tool-clock-face" style={{ ['--progress' as string]: `${Math.round(progresso * 360)}deg` }}>
      <span>{mm}:{ss}</span>
      <small>{rodando ? (modo === 'pomodoro' ? `foco · ciclo ${ciclo}` : 'contando') : 'parado'}</small>
    </div>
    <div className="tool-clock-actions">
      <Button variant="primary" onClick={() => { setRodando(!rodando); setRestante(restante || total); }}>{rodando ? 'Pausar' : 'Continuar'}</Button>
      <Button onClick={() => { setRestante(total); setRodando(true); alertado.current = false; }}><RotateCcw size={15} />Reiniciar</Button>
      {modo === 'pomodoro' && <Button onClick={() => { setCiclo(ciclo + 1); setRestante(total); setRodando(true); alertado.current = false; }}><Timer size={15} />Próximo ciclo</Button>}
    </div>
    <p className="muted small">{modo === 'pomodoro' ? 'Ciclo clássico de 25 minutos. Ao terminar, levante, beba água e volte em 5 minutos.' : 'Aviso do sistema ao chegar em zero, quando a permissão de notificações estiver concedida.'}</p>
  </div>;
}

export default function Toolbox() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string>('todos');
  const [aberta, setAberta] = useState<Tool | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [saida, setSaida] = useState<ToolOutput | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState('');

  const ferramentas = useMemo(() => FERRAMENTAS.filter(ferramenta => {
    if (grupo !== 'todos' && ferramenta.grupo !== grupo) return false;
    if (!busca.trim()) return true;
    const alvo = normalizeText(`${ferramenta.nome} ${ferramenta.descricao} ${ferramenta.grupo}`);
    return normalizeText(busca).split(/\s+/).every(termo => alvo.includes(termo));
  }), [busca, grupo]);

  const abrir = (ferramenta: Tool) => {
    setAberta(ferramenta);
    setSaida(null);
    const iniciais: Record<string, string> = {};
    ferramenta.campos.forEach(campo => {
      if (campo.type === 'person') iniciais[campo.key] = data.people.find(p => !p.deletedAt)?.id || '';
      else iniciais[campo.key] = campo.default ?? (campo.type === 'select' ? campo.options?.[0]?.value ?? '' : '');
    });
    setValores(iniciais);
  };

  const executar = () => {
    if (!aberta) return;
    try {
      const resultado = aberta.run(valores, {
        data,
        commit: (updater, message, undoable) => ctx.commit(updater, message, undoable),
        notify: (mensagem, erro) => ctx.notify(mensagem, erro),
        openPerson: person => ctx.openPerson(person),
        navigate: (page, scope) => ctx.navigate(page, scope),
        setFilter: parcial => ctx.setFilter({ ...ctx.filter, ...parcial }),
      });
      setSaida(resultado);
      if (resultado.aviso) ctx.notify(resultado.aviso);
      if (resultado.baixar) downloadBlob(new Blob([resultado.baixar.conteudo], { type: `${resultado.baixar.tipo};charset=utf-8` }), resultado.baixar.nome);
      if (resultado.itens?.length || resultado.estatisticas?.length || resultado.texto) playSound('success');
    } catch (erro) {
      ctx.notify(`A ferramenta falhou: ${(erro as Error).message}`, true);
    }
    setConfirmando(false);
  };

  const pedir = () => { if (aberta?.perigoso) setConfirmando(true); else executar(); };

  const copiar = (texto: string, marca: string) => {
    try { navigator.clipboard.writeText(texto); } catch { /* área de transferência bloqueada */ }
    setCopiado(marca);
    setTimeout(() => setCopiado(''), 1800);
  };

  const grupos = [{ id: 'todos', nome: 'Todas', icone: 'Wrench', descricao: 'As 50 ferramentas juntas.' }, ...GRUPOS];
  const nomeDoGrupo = grupos.find(item => item.id === grupo)?.nome;

  return <div className="toolbox-page">
    <PageTitle eyebrow="Utilidades" title="Ferramentas" description="Organizar o catálogo, cuidar das conversas, olhar para o seu espaço e resolver o dia a dia — sem sair daqui." />

    <div className="toolbox-toolbar">
      <label className="search-field toolbox-search">
        <Search size={16} />
        <input value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Buscar ferramenta" aria-label="Buscar ferramenta" />
      </label>
      <div className="toolbox-groups">
        {grupos.map(item => <button key={item.id} className={grupo === item.id ? 'active' : ''} onClick={() => setGrupo(item.id)} title={item.descricao}>
          <Icone nome={item.icone} size={15} />{item.nome}
        </button>)}
      </div>
    </div>

    <p className="toolbox-count">{ferramentas.length === FERRAMENTAS.length ? `${FERRAMENTAS.length} ferramentas` : `${ferramentas.length} de ${FERRAMENTAS.length} ferramentas`}{grupo !== 'todos' && nomeDoGrupo ? ` em ${nomeDoGrupo}` : ''}{busca ? ` para “${busca}”` : ''}</p>

    {ferramentas.length ? <div className="toolbox-grid">
      {ferramentas.map(ferramenta => <button key={ferramenta.id} className="tool-card" onClick={() => abrir(ferramenta)}>
        <span className="tool-icon"><Icone nome={ferramenta.icone} /></span>
        <span className="tool-text">
          <strong>{ferramenta.nome}{ferramenta.perigoso && <em title="Esta ferramenta altera dados"><AlertTriangle size={12} /></em>}</strong>
          <small>{ferramenta.descricao}</small>
        </span>
        <ChevronRight size={15} className="tool-go" />
      </button>)}
    </div> : <EmptyState icon={Wrench} title="Nenhuma ferramenta encontrada" description="Tente outro termo ou volte para o grupo Todas." action="Limpar busca" onAction={() => { setBusca(''); setGrupo('todos'); }} />}

    {aberta && <Modal title={aberta.nome} description={aberta.descricao} onClose={() => setAberta(null)} wide
      footer={<>
        <Button onClick={() => setAberta(null)}>Fechar</Button>
        {saida && <Button onClick={() => { setSaida(null); setValores(valores); }}><RotateCcw size={15} />Limpar resultado</Button>}
        <Button variant="primary" onClick={pedir}><Play size={15} />Executar</Button>
      </>}>
      {aberta.campos.length > 0 && <div className="tool-fields">
        {aberta.campos.map(campo => <div key={campo.key} className={campo.type === 'textarea' ? 'tool-field-wide' : ''}>
          {campo.type === 'checkbox'
            ? <label className="check-label"><input type="checkbox" checked={['1', 'true', 'sim', 'on'].includes((valores[campo.key] || '').toLowerCase())} onChange={evento => setValores({ ...valores, [campo.key]: evento.target.checked ? '1' : '' })} /><span>{campo.label}</span></label>
            : <Field label={campo.label} hint={campo.help}>
              {campo.type === 'textarea'
                ? <textarea value={valores[campo.key] || ''} onChange={evento => setValores({ ...valores, [campo.key]: evento.target.value })} placeholder={campo.placeholder} rows={3} />
                : campo.type === 'select'
                  ? <select value={valores[campo.key] || ''} onChange={evento => setValores({ ...valores, [campo.key]: evento.target.value })}>{(campo.options || []).map(opcao => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}</select>
                  : campo.type === 'person'
                    ? <select value={valores[campo.key] || ''} onChange={evento => setValores({ ...valores, [campo.key]: evento.target.value })}><option value="">Primeira pessoa do catálogo</option>{data.people.filter(p => !p.deletedAt).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(pessoa => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</select>
                    : <input type={campo.type === 'number' ? 'number' : campo.type === 'date' ? 'date' : 'text'} value={valores[campo.key] ?? ''} min={campo.min} max={campo.max} onChange={evento => setValores({ ...valores, [campo.key]: evento.target.value })} placeholder={campo.placeholder} />}
            </Field>}
        </div>)}
      </div>}

      {!saida && aberta.perigoso && <p className="tool-warning"><AlertTriangle size={14} />Esta ferramenta altera seus dados: {aberta.perigoso} Você pode desfazer com Ctrl+Z.</p>}

      {saida && <div className="tool-output">
        {saida.special && <Relogio modo={saida.special} minutos={Number(valores.minutos) || 10} />}
        {saida.estatisticas?.length ? <div className="tool-stats">{saida.estatisticas.map(item => <span key={item.label}><small>{item.label}</small><b>{item.valor}</b></span>)}</div> : null}
        {saida.itens?.length ? <ul className="tool-items">{saida.itens.map((item, indice) => <li key={`${item.title}-${indice}`}>
          <div><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</div>
          <div className="tool-item-actions">
            <IconButton label={copiado === `${item.title}-${indice}` ? 'Copiado' : 'Copiar'} onClick={() => copiar(item.title, `${item.title}-${indice}`)}>{copiado === `${item.title}-${indice}` ? <Check size={14} /> : <Copy size={14} />}</IconButton>
            {item.personId && <button className="text-action" onClick={() => { setAberta(null); ctx.openPerson(item.personId!); }}>Abrir ficha<ArrowRight size={13} /></button>}
            {item.page && !item.personId && <button className="text-action" onClick={() => { setAberta(null); ctx.navigate(item.page!); }}>Ir para a tela<ArrowRight size={13} /></button>}
          </div>
        </li>)}</ul> : null}
        {saida.texto && <div className="tool-text-output">
          <div className="tool-text-head"><strong>Resultado</strong><div><IconButton label="Copiar resultado" onClick={() => copiar(saida.texto || '', 'resultado')}>{copiado === 'resultado' ? <Check size={14} /> : <Copy size={14} />}</IconButton></div></div>
          <pre>{saida.texto}</pre>
        </div>}
        {saida.baixar && <Button onClick={() => downloadBlob(new Blob([saida.baixar!.conteudo], { type: `${saida.baixar!.tipo};charset=utf-8` }), saida.baixar!.nome)}><Download size={15} />Baixar {saida.baixar.nome}</Button>}
      </div>}
    </Modal>}

    {confirmando && aberta && <Confirm
      title="Confirmar a mudança?"
      description={`${aberta.perigoso}\n\nDica: rode a ferramenta sem confirmar primeiro para ver exatamente o que vai mudar.`}
      confirmLabel="Sim, aplicar agora"
      danger
      onConfirm={executar}
      onClose={() => setConfirmando(false)}
    />}
  </div>;
}
