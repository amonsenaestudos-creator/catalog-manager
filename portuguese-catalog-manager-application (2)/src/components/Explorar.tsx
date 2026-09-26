/**
 * Explorar: a parte do app feita para querer continuar.
 *
 * Presente diário, momentos do dia, trilha aleatória, mapa de conexões,
 * máquina do tempo, modo TV, ambientes sonoros, mini-desafios e a coleção de
 * visuais desbloqueáveis — tudo opcional, sem contadores de pressão e sem
 * mecânica de prender compulsivamente. O interessante aqui é o próprio
 * catálogo, visto de jeitos novos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Building2, CalendarDays, Check, Clapperboard, CloudRain, Coffee, Compass, Disc3, Dices,
  Droplets, Egg, Eye, Film, Flame, Gift, History, Images, Lock, Maximize2, Minimize2, MonitorPlay, Music, Pause, Play,
  Puzzle, Quote, Route, Shuffle, SkipBack, SkipForward, Sparkles, Telescope, Trophy, Volume2, VolumeX, X,
} from 'lucide-react';
import type { AppData, Person } from '../types';
import { useCatalog } from '../context';
import {
  calculateOverallRating, completeness, corDaPessoa, daysSince, formatDate, getAllPhotos,
  isActive, locationLabel, today,
} from '../store';
import {
  AMBIENTES, TRILHAS, definirVolumeAmbiente, iniciarAmbiente, iniciarTrilha, pararAmbiente, pararTrilha,
} from '../lib/ambiente';
import type { AmbienteId, TrilhaId } from '../lib/ambiente';
import {
  MESES_PT, OVOS, anosDoCatalogo, aposDescoberta, conteudoDoAno, desafiosDoDia, desbloqueaveis,
  estatisticasRapidas, mapaConexoes, mesesDesde, momentosDoDia, ovoEncontrado,
  presenteDoDia, slidesApresentacao, trilhaExploracao,
} from '../lib/retencao';
import type { NoMapa, SlideTV } from '../lib/retencao';
import { Avatar, Button, EmptyState, IconButton, PageTitle, SectionHeading } from './ui';

type Aba = 'voce' | 'trilha' | 'mapa' | 'tempo' | 'tv' | 'ambiente' | 'desafios' | 'colecao';

const ABAS: { id: Aba; rotulo: string; icone: typeof Gift }[] = [
  { id: 'voce', rotulo: 'Para você', icone: Sparkles },
  { id: 'trilha', rotulo: 'Trilha', icone: Route },
  { id: 'mapa', rotulo: 'Mapa', icone: Telescope },
  { id: 'tempo', rotulo: 'Tempo', icone: History },
  { id: 'tv', rotulo: 'Assistir', icone: MonitorPlay },
  { id: 'ambiente', rotulo: 'Ambiente', icone: Music },
  { id: 'desafios', rotulo: 'Desafios', icone: Puzzle },
  { id: 'colecao', rotulo: 'Coleção', icone: Trophy },
];

export default function Explorar() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [aba, setAba] = useState<Aba>('voce');
  const hoje = today();
  const presenteAberto = !!data.progress.presentes?.[hoje];
  const guardados = data.progress.desafiosDiarios?.dia === hoje ? data.progress.desafiosDiarios.concluidos : [];
  const pendentes = desafiosDoDia(data, hoje, guardados).filter(d => !d.concluido).length;
  const ativas = data.people.filter(isActive).length;

  return <div className="explorar-page">
    <PageTitle eyebrow="Explorar" title="Explorar" description="Seu catálogo visto de jeitos novos: surpresas, caminhos, mapas, tempo e som.">
      <Button onClick={() => { const pool = data.people.filter(isActive); if (pool.length) ctx.openPerson(pool[Math.floor(Math.random() * pool.length)]); }} disabled={!ativas}><Shuffle size={16} />Surpresa</Button>
    </PageTitle>
    <div className="scope-tabs explorar-tabs" role="tablist" aria-label="Modos de explorar">
      {ABAS.map(({ id, rotulo, icone: Icone }) => {
        const selo = id === 'voce' && !presenteAberto && ativas > 0 ? 1 : id === 'desafios' && pendentes > 0 ? pendentes : 0;
        return <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'active' : ''} onClick={() => { setAba(id); ctx.buzz?.(6); }}>
          <Icone size={15} />{rotulo}{selo > 0 && <span>{selo}</span>}
        </button>;
      })}
    </div>
    {!ativas
      ? <EmptyState icon={Compass} title="O explorar acorda com a primeira ficha" description="Cadastre alguém para ganhar presente diário, trilhas, mapa, máquina do tempo e todo o resto." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />
      : <>
        {aba === 'voce' && <ParaVoce />}
        {aba === 'trilha' && <TrilhaAleatoria />}
        {aba === 'mapa' && <MapaCatalogo />}
        {aba === 'tempo' && <MaquinaTempo />}
        {aba === 'tv' && <section className="panel tv-painel"><SectionHeading icon={MonitorPlay} title="Modo TV" /><TelaTV slides={slidesApresentacao(data)} /></section>}
        {aba === 'ambiente' && <AmbienteTab />}
        {aba === 'desafios' && <DesafiosTab />}
        {aba === 'colecao' && <ColecaoTab />}
      </>}
  </div>;
}

/** Atalho: destino de presente/trilha ({ pagina: 'ficha' } abre a ficha). */
function useIrPara() {
  const ctx = useCatalog();
  return (pagina: string, personId?: string) => {
    if (pagina === 'ficha' && personId) { ctx.openPerson(personId); return; }
    ctx.navigate(pagina);
  };
}

/** Desbloqueia um ovo com festa discreta (som + aviso, sem confete obrigatório). */
function useOvo() {
  const ctx = useCatalog();
  return (id: string, nome: string) => {
    if (ctx.data.progress.ovos?.[id]) return;
    ctx.commit(d => ({ ...d, progress: { ...d.progress, ovos: { ...(d.progress.ovos || {}), [id]: new Date().toISOString() } } }), undefined, false);
    ctx.sound('descoberta');
    ctx.notify(`Ovo de páscoa encontrado: ${nome}.`);
  };
}

// ---------------------------------------------------------------------------
// Para você: presente, momentos do dia e sequência de descobertas
// ---------------------------------------------------------------------------

function ParaVoce() {
  const ctx = useCatalog();
  const { data } = ctx;
  const hoje = today();
  const irPara = useIrPara();
  const desbloquearOvo = useOvo();
  const presente = useMemo(() => presenteDoDia(data, hoje), [data, hoje]);
  const aberto = !!data.progress.presentes?.[hoje];
  const momentos = useMemo(() => momentosDoDia(data, hoje), [data, hoje]);
  const exploracao = data.progress.exploracao;
  const [assistindo, setAssistindo] = useState(false);

  // Ovo da madrugada: quem estiver explorando entre 3h e 5h ganha uma surpresa.
  const madrugada = useRef(false);
  useEffect(() => {
    if (madrugada.current) return;
    madrugada.current = true;
    const hora = new Date().getHours();
    if (hora >= 3 && hora < 5) desbloquearOvo('madrugada', 'Turno da madrugada');
  }, [desbloquearOvo]);

  const abrirPresente = () => {
    if (!presente || aberto) return;
    ctx.commit(d => ({
      ...d,
      progress: {
        ...d.progress,
        presentes: { ...(d.progress.presentes || {}), [hoje]: presente.id },
        exploracao: aposDescoberta(d.progress.exploracao, hoje),
      },
    }), undefined, false);
    ctx.sound('presente');
    ctx.buzz?.([10, 40, 14]);
  };

  const slidesMomentos: SlideTV[] = useMemo(() => {
    const slides: SlideTV[] = [];
    for (const foto of momentos.fotos) {
      const dona = data.people.find(p => p.id === foto.personId);
      slides.push({ id: `foto:${foto.id}`, tipo: 'foto', titulo: dona?.nome || 'Foto nova', subtitulo: foto.description || 'Registrada hoje', imagem: foto.url, personId: dona?.id, cor: dona ? corDaPessoa(dona) : undefined });
    }
    for (const video of momentos.videos) {
      slides.push({ id: `video:${video.personId}:${video.legenda}`, tipo: 'video', titulo: video.legenda || `Momento de ${video.personNome}`, subtitulo: video.personNome, videoUrl: video.url, personId: video.personId });
    }
    for (const pessoa of momentos.pessoas) {
      slides.push({ id: `pessoa:${pessoa.id}`, tipo: 'pessoa', titulo: pessoa.nome, subtitulo: `Chegou hoje · ${locationLabel(pessoa, data)}`, imagem: (pessoa.fotos.find(f => f.isMain) || pessoa.fotos[0])?.url, personId: pessoa.id, cor: corDaPessoa(pessoa) });
    }
    for (const nota of momentos.notas.slice(0, 4)) {
      slides.push({ id: `nota:${nota.titulo}`, tipo: 'memoria', titulo: nota.titulo, subtitulo: nota.detalhe || 'Anotada hoje' });
    }
    for (const memoria of momentos.memorias) {
      slides.push({ id: `memoria:${memoria.id}`, tipo: 'memoria', titulo: memoria.title || 'Memória de hoje', subtitulo: memoria.content.slice(0, 140), personId: memoria.personId || undefined });
    }
    return slides;
  }, [momentos, data]);

  return <div className="explorar-grade">
    <section className="panel presente-painel">
      <SectionHeading icon={Gift} title="Presente de hoje" />
      {!presente ? <p className="form-help">Cadastre a primeira ficha para começar a ganhar presentes.</p>
        : !aberto ? <div className="presente-fechado">
          <motion.span className="presente-laco" animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}><Gift size={40} /></motion.span>
          <div><h3>Uma coisa para você descobrir</h3><p>Pode ser uma pessoa antiga, uma foto, uma coleção, um número bonito ou uma memória. Sem pressa: ele espera por você.</p></div>
          <Button variant="primary" onClick={abrirPresente}><Gift size={16} />Abrir presente</Button>
        </div>
        : <motion.div className="presente-aberto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {presente.imagem ? <img src={presente.imagem} alt="" /> : <span className="presente-icone" style={{ background: presente.cor || 'var(--accent)' }}><Gift size={26} /></span>}
          <div><p className="eyebrow">{({ pessoa: 'Uma pessoa para revisitar', foto: 'Uma foto perdida', colecao: 'Uma coleção para reabrir', estatistica: 'Um número do seu universo', memoria: 'Uma memória escrita', conquista: 'Uma conquista' } as Record<string, string>)[presente.tipo]}</p>
            <h3>{presente.titulo}</h3><p>{presente.descricao}</p></div>
          <Button variant="primary" onClick={() => irPara(presente.pagina, presente.personId)}><Eye size={16} />Abrir</Button>
        </motion.div>}
    </section>

    <section className="panel">
      <SectionHeading icon={Clapperboard} title="Hoje no seu catálogo" />
      {momentos.vazio
        ? <p className="form-help">Nada registrado hoje ainda. Quando você adicionar fotos, vídeos, pessoas ou notas, eles se reúnem aqui para uma retrospectiva rápida.</p>
        : <>
          <ul className="momentos-resumo">
            {!!momentos.fotos.length && <li><Images size={15} />{momentos.fotos.length} foto(s)</li>}
            {!!momentos.videos.length && <li><Film size={15} />{momentos.videos.length} vídeo(s)</li>}
            {!!momentos.pessoas.length && <li><Sparkles size={15} />{momentos.pessoas.length} pessoa(s)</li>}
            {!!momentos.notas.length && <li><Quote size={15} />{momentos.notas.length} nota(s)</li>}
            {!!momentos.memorias.length && <li><History size={15} />{momentos.memorias.length} memória(s)</li>}
          </ul>
          <Button variant="primary" onClick={() => setAssistindo(true)}><Play size={16} />Reproduzir o dia</Button>
        </>}
    </section>

    <section className="panel sequencia-painel">
      <SectionHeading icon={Flame} title="Sequência de descobertas" />
      <div className="sequencia-numero"><strong>{exploracao?.sequencia || 0}</strong><span>{(exploracao?.sequencia || 0) === 1 ? 'dia seguido' : 'dias seguidos'} encontrando algo de verdade · {exploracao?.total || 0} no total</span></div>
      <p className="form-help">Aqui não conta só abrir o app: a sequência sobe quando você abre um presente, conclui um desafio, termina uma trilha ou reencontra uma memória antiga.</p>
    </section>

    {assistindo && <div className="tv-modal" role="dialog" aria-modal="true" aria-label="Retrospectiva do dia">
      <div className="tv-modal-caixa"><div className="tv-modal-head"><strong>Hoje no seu catálogo</strong><IconButton label="Fechar retrospectiva" onClick={() => setAssistindo(false)}><X size={18} /></IconButton></div>
        <TelaTV slides={slidesMomentos} />
      </div>
    </div>}
  </div>;
}

// ---------------------------------------------------------------------------
// Trilha aleatória: cada toque leva a algo relacionado
// ---------------------------------------------------------------------------

function TrilhaAleatoria() {
  const ctx = useCatalog();
  const { data } = ctx;
  const irPara = useIrPara();
  const [semente, setSemente] = useState(() => Date.now());
  const [passo, setPasso] = useState(0);
  const [concluida, setConcluida] = useState(false);
  const passos = useMemo(() => trilhaExploracao(data, semente), [data, semente]);
  const atual = passos[passo];
  const novaTrilha = () => { setSemente(Date.now()); setPasso(0); setConcluida(false); };

  const concluir = () => {
    const hoje = today();
    ctx.commit(d => ({
      ...d,
      progress: {
        ...d.progress,
        exploracao: { ...aposDescoberta(d.progress.exploracao, hoje), trilhas: (d.progress.exploracao?.trilhas || 0) + 1 },
      },
    }), undefined, false);
    ctx.addXp(15, 'Trilha explorada até o fim: +15 XP.');
    ctx.sound('descoberta');
    setConcluida(true);
  };

  if (!passos.length) return <EmptyState icon={Route} title="Sem caminho por aqui" description="A trilha precisa de pelo menos uma ficha para começar." />;
  return <section className="panel trilha-painel">
    <SectionHeading icon={Dices} title="Explorar aleatoriamente" action="Nova trilha" onAction={novaTrilha} />
    <ol className="trilha-passos" aria-label="Passos da trilha">
      {passos.map((_p, i) => <li key={i} className={i === passo ? 'agora' : i < passo || concluida ? 'feito' : ''}><span>{i + 1}</span></li>)}
    </ol>
    {concluida
      ? <div className="trilha-fim"><Sparkles size={30} /><h3>“Caramba, eu tinha esquecido disso.”</h3><p>Você percorreu {passos.length} passos pelo catálogo. Que tal outra volta?</p><Button variant="primary" onClick={novaTrilha}><Dices size={16} />Nova trilha</Button></div>
      : atual && <AnimatePresence mode="wait">
        <motion.div key={`${semente}:${passo}`} className="trilha-cartao" initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -26 }} transition={{ duration: 0.22 }}>
          {atual.imagem ? <img src={atual.imagem} alt="" className="trilha-midia" /> : <span className="trilha-midia vazio" style={{ background: atual.cor || 'var(--accent-soft)' }}><Route size={30} /></span>}
          <div className="trilha-corpo">
            <p className="eyebrow">Passo {passo + 1} de {passos.length} · {{ pessoa: 'pessoa', foto: 'foto', colecao: 'coleção', relacao: 'relação', memoria: 'memória' }[atual.tipo]}</p>
            <h3>{atual.titulo}</h3><p>{atual.detalhe}</p>
            <div className="trilha-acoes">
              <Button onClick={() => irPara(atual.pagina, atual.personId)}><Eye size={15} />{atual.acao}</Button>
              {passo < passos.length - 1
                ? <Button variant="primary" onClick={() => { setPasso(passo + 1); ctx.sound('pagina'); }}>Próximo passo<ArrowRight size={15} /></Button>
                : <Button variant="primary" onClick={concluir}><Check size={15} />Concluir trilha</Button>}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>}
  </section>;
}

// ---------------------------------------------------------------------------
// Mapa de conexões: toque nos nós e navegue sem fim
// ---------------------------------------------------------------------------

const LARGURA_MAPA = 320;
const CENTRO_MAPA = 160;

function posicaoAnel(indice: number, total: number, raio: number, deslocamento = -90): { x: number; y: number } {
  const angulo = ((deslocamento + (indice * 360) / Math.max(1, total)) * Math.PI) / 180;
  return { x: CENTRO_MAPA + raio * Math.cos(angulo), y: CENTRO_MAPA + raio * Math.sin(angulo) };
}

function iniciais(nome: string): string {
  return nome.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}

function MapaCatalogo() {
  const ctx = useCatalog();
  const { data } = ctx;
  const ativas = useMemo(() => data.people.filter(isActive), [data.people]);
  const [centroId, setCentroId] = useState<string>(ativas[0]?.id || '');
  const [expandido, setExpandido] = useState<string | null>(null);
  const centro = ativas.find(p => p.id === centroId) || ativas[0];
  const { nos, arestas } = useMemo(() => (centro ? mapaConexoes(data, centro.id, expandido) : { nos: [], arestas: [] }), [data, centro, expandido]);
  const aneis = useMemo(() => {
    if (!centro) return new Map<string, { x: number; y: number }>();
    const pos = new Map<string, { x: number; y: number }>([[centro.id, { x: CENTRO_MAPA, y: CENTRO_MAPA }]]);
    const primeiro = nos.filter(n => n.id !== centro.id && !arestas.some(a => a.de === expandido && a.para === n.id));
    primeiro.forEach((no, i) => pos.set(no.id, posicaoAnel(i, primeiro.length, 108)));
    if (expandido) {
      const segundos = nos.filter(n => arestas.some(a => a.de === expandido && a.para === n.id));
      const pai = pos.get(expandido) || { x: CENTRO_MAPA, y: CENTRO_MAPA };
      const base = (Math.atan2(pai.y - CENTRO_MAPA, pai.x - CENTRO_MAPA) * 180) / Math.PI;
      segundos.forEach((no, i) => {
        const angulo = ((base - 30 + (i * 60) / Math.max(1, segundos.length - 1 || 1)) * Math.PI) / 180;
        pos.set(no.id, { x: Math.max(26, Math.min(294, CENTRO_MAPA + 142 * Math.cos(angulo))), y: Math.max(26, Math.min(294, CENTRO_MAPA + 142 * Math.sin(angulo))) });
      });
    }
    return pos;
  }, [nos, arestas, centro, expandido]);

  if (!centro) return <EmptyState icon={Telescope} title="Nada para mapear" description="O mapa aparece quando a primeira ficha chega." />;
  const aoTocar = (no: NoMapa) => {
    ctx.buzz?.(8);
    if (no.tipo !== 'pessoa') { ctx.navigate(no.tipo === 'album' ? 'gallery' : 'folders'); return; }
    if (no.id === centro.id) { ctx.openPerson(no.id); return; }
    setCentroId(no.id);
    setExpandido(null);
    ctx.sound('pagina');
  };
  const aleatorio = () => {
    const outro = ativas[Math.floor(Math.random() * ativas.length)];
    if (outro) { setCentroId(outro.id); setExpandido(null); }
  };

  return <section className="panel mapa-painel">
    <SectionHeading icon={Telescope} title="Mapa do catálogo" action="Pular para alguém" onAction={aleatorio} />
    <p className="form-help">Toque num nó para viajar até ele. Toque no centro para abrir a ficha. É uma exploração sem fim — do jeito bom.</p>
    <div className="mapa-caixa">
      <svg viewBox={`0 0 ${LARGURA_MAPA} ${LARGURA_MAPA}`} className="mapa-svg" role="img" aria-label={`Mapa de conexões de ${centro.nome}`}>
        {arestas.map((a, i) => {
          const de = aneis.get(a.de);
          const para = aneis.get(a.para);
          if (!de || !para) return null;
          return <g key={i}>
            <line x1={de.x} y1={de.y} x2={para.x} y2={para.y} className="mapa-aresta" />
            <text x={(de.x + para.x) / 2} y={(de.y + para.y) / 2 - 4} className="mapa-rotulo-aresta">{a.rotulo}</text>
          </g>;
        })}
        {nos.map(no => {
          const pos = aneis.get(no.id);
          if (!pos) return null;
          const ehCentro = no.id === centro.id;
          const cor = no.cor || 'var(--accent)';
          return <g key={no.id} transform={`translate(${pos.x}, ${pos.y})`} className={`mapa-no ${ehCentro ? 'centro' : ''} tipo-${no.tipo}`} onClick={() => aoTocar(no)}>
            <circle r={ehCentro ? 26 : 21} style={{ ['--no-cor' as string]: cor }} />
            <text className="mapa-iniciais">{no.tipo === 'pessoa' ? iniciais(no.rotulo) : no.rotulo.slice(0, 2).toUpperCase()}</text>
            <text y={ehCentro ? 40 : 35} className="mapa-nome">{no.rotulo.length > 14 ? `${no.rotulo.slice(0, 13)}…` : no.rotulo}</text>
          </g>;
        })}
      </svg>
      <div className="mapa-centro">
        <Avatar person={centro} size={46} />
        <div><strong>{centro.nome}</strong><small>{locationLabel(centro, data)}</small></div>
        <Button onClick={() => ctx.openPerson(centro.id)}><Eye size={15} />Abrir ficha</Button>
      </div>
    </div>
    <ul className="mapa-lista">
      {nos.filter(n => n.id !== centro.id).map(no => <li key={no.id}>
        <button onClick={() => aoTocar(no)}><i style={{ background: no.cor || 'var(--accent)' }} /><span><strong>{no.rotulo}</strong><small>{no.detalhe}</small></span><ArrowRight size={14} /></button>
        {no.tipo === 'pessoa' && <button className="mapa-expandir" aria-expanded={expandido === no.id} onClick={() => setExpandido(e => (e === no.id ? null : no.id))} title="Mostrar relações desta pessoa">{expandido === no.id ? 'Recolher' : 'Expandir'}</button>}
      </li>)}
    </ul>
  </section>;
}

// ---------------------------------------------------------------------------
// Máquina do tempo: escolha o ano e veja o que existia
// ---------------------------------------------------------------------------

function MaquinaTempo() {
  const ctx = useCatalog();
  const { data } = ctx;
  const desbloquearOvo = useOvo();
  const anos = useMemo(() => anosDoCatalogo(data), [data]);
  const [ano, setAno] = useState<number>(anos[0] || new Date().getFullYear());
  const [mes, setMes] = useState<number | null>(null);
  const visitados = useRef<Set<number>>(new Set());
  const conteudo = useMemo(() => conteudoDoAno(data, ano, mes), [data, ano, mes]);

  useEffect(() => {
    if (!anos.includes(ano) && anos.length) { setAno(anos[0]); setMes(null); }
  }, [anos, ano]);

  const escolherAno = (novo: number) => {
    setAno(novo);
    setMes(null);
    ctx.sound('pagina');
    visitados.current.add(novo);
    if (visitados.current.size >= 3) desbloquearOvo('viajante', 'Viajante do tempo');
  };

  if (!anos.length) return <EmptyState icon={History} title="O tempo começa agora" description="Quando o catálogo tiver história, os anos aparecem aqui." />;
  return <section className="panel tempo-painel">
    <SectionHeading icon={History} title="Máquina do tempo" />
    <div className="tempo-anos" role="tablist" aria-label="Anos do catálogo">
      {anos.map(a => <button key={a} role="tab" aria-selected={a === ano} className={a === ano ? 'active' : ''} onClick={() => escolherAno(a)}>{a}</button>)}
    </div>
    {!!conteudo.meses.length && <div className="tempo-meses">
      <button className={mes === null ? 'active' : ''} onClick={() => setMes(null)}>ano todo</button>
      {conteudo.meses.map(m => <button key={m} className={mes === m ? 'active' : ''} onClick={() => setMes(m)}>{MESES_PT[m - 1]}</button>)}
    </div>}
    <ul className="momentos-resumo">
      <li><Sparkles size={15} />{conteudo.pessoas.length} pessoa(s)</li>
      <li><Images size={15} />{conteudo.fotos.length} foto(s)</li>
      <li><Quote size={15} />{conteudo.memorias.length} memória(s)</li>
      <li><CalendarDays size={15} />{conteudo.eventos.length} evento(s)</li>
    </ul>
    {!conteudo.pessoas.length && !conteudo.fotos.length && !conteudo.memorias.length && !conteudo.eventos.length
      ? <p className="form-help">Nada registrado neste período. Tente outro ano ou outro mês.</p>
      : <div className="tempo-grade">
        {!!conteudo.pessoas.length && <div><h4>Pessoas que chegaram</h4><ul className="tempo-pessoas">{conteudo.pessoas.slice(0, 8).map(p => <li key={p.id}><button onClick={() => ctx.openPerson(p)}><Avatar person={p} size={34} /><span><strong>{p.nome}</strong><small>{formatDate(p.createdAt)}</small></span></button></li>)}</ul></div>}
        {!!conteudo.fotos.length && <div><h4>Fotos da época</h4><div className="tempo-fotos">{conteudo.fotos.slice(0, 8).map(f => <button key={f.id} onClick={() => { if (f.personId) ctx.openPerson(f.personId); else ctx.navigate('gallery'); }} title={f.description || 'Abrir foto'}><img src={f.url} alt={f.description || 'Foto do catálogo'} loading="lazy" /></button>)}</div></div>}
        {!!conteudo.memorias.length && <div><h4>Memórias</h4><ul className="tempo-lista">{conteudo.memorias.slice(0, 6).map((m, i) => <li key={i}><strong>{m.titulo}</strong><span>{m.detalhe}</span></li>)}</ul></div>}
        {!!conteudo.eventos.length && <div><h4>Acontecimentos</h4><ul className="tempo-lista">{conteudo.eventos.slice(0, 6).map((e, i) => <li key={i}><strong>{e.titulo}</strong><span>{e.detalhe}</span></li>)}</ul></div>}
      </div>}
  </section>;
}

// ---------------------------------------------------------------------------
// Modo TV: o catálogo em reprodução — fotos, pessoas, coleções, números
// ---------------------------------------------------------------------------

const SEGUNDOS_POR_SLIDE = 6;

export function TelaTV({ slides }: { slides: SlideTV[] }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const irPara = useIrPara();
  const [indice, setIndice] = useState(0);
  const [tocando, setTocando] = useState(!data.settings.reducedMotion);
  const [trilha, setTrilha] = useState<TrilhaId | 'nenhuma'>(data.settings.trilhaApresentacao || 'ambiente');
  const vistos = useRef(0);
  const totalVistos = useRef(data.progress.tvVistos || 0);
  const temOvo = useRef(!!data.progress.ovos?.maratonista);
  const slide = slides.length ? slides[indice % slides.length] : null;
  // Tela cheia de verdade: do celular à TV da sala.
  const caixa = useRef<HTMLDivElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  useEffect(() => {
    const aoMudar = () => setEmTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);
  const telaCheia = async () => {
    try {
      if (!document.fullscreenElement) await caixa.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch { ctx.notify('A tela cheia não está disponível neste navegador.', true); }
  };

  // Trilha sonora da apresentação — começa junto e para ao sair.
  useEffect(() => {
    if (trilha === 'nenhuma' || data.settings.somAmbiente === false) { pararTrilha(); return; }
    if (!iniciarTrilha(trilha)) setTrilha('nenhuma');
    return () => pararTrilha();
  }, [trilha, data.settings.somAmbiente]);

  // Avanço automático, pausado quando a aba some.
  useEffect(() => {
    if (!tocando || slides.length < 2) return;
    let visivel = document.visibilityState === 'visible';
    const aoVisibilidade = () => { visivel = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', aoVisibilidade);
    const timer = setInterval(() => { if (visivel) setIndice(i => (i + 1) % slides.length); }, SEGUNDOS_POR_SLIDE * 1000);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', aoVisibilidade); };
  }, [tocando, slides.length]);

  // Conta os slides assistidos e entrega o ovo maratonista aos 15.
  useEffect(() => {
    if (!slides.length) return;
    vistos.current += 1;
    totalVistos.current += 1;
    if (totalVistos.current >= 15 && !temOvo.current) {
      temOvo.current = true;
      ctx.commit(d => ({ ...d, progress: { ...d.progress, ovos: { ...(d.progress.ovos || {}), maratonista: new Date().toISOString() } } }), undefined, false);
      ctx.sound('descoberta');
      ctx.notify('Ovo de páscoa encontrado: Maratonista.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  // Grava a contagem ao sair do modo TV. Zerar depois de ler mantém o total
  // certo mesmo com a limpeza dupla do StrictMode em desenvolvimento.
  useEffect(() => () => {
    const n = vistos.current;
    vistos.current = 0;
    if (n > 0) ctx.commit(d => ({ ...d, progress: { ...d.progress, tvVistos: (d.progress.tvVistos || 0) + n } }), undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!slide) return <EmptyState icon={MonitorPlay} title="Nada para exibir" description="Com fotos, pessoas e memórias, o modo TV monta a programação sozinho." />;

  return <div className="tv-tela" ref={caixa}>
    <div className="tv-palco">
      <AnimatePresence mode="wait">
        <motion.div key={slide.id} className={`tv-slide tipo-${slide.tipo}`} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {slide.tipo === 'foto' && slide.imagem && <img src={slide.imagem} alt={slide.titulo} className="tv-foto" />}
          {slide.tipo === 'video' && slide.videoUrl && <video src={slide.videoUrl} className="tv-foto" autoPlay muted loop playsInline />}
          {(slide.tipo === 'pessoa' || slide.tipo === 'colecao' || slide.tipo === 'estatistica' || slide.tipo === 'memoria') && (
            <div className="tv-cartao" style={{ ['--slide-cor' as string]: slide.cor || 'var(--accent)' }}>
              {slide.imagem ? <img src={slide.imagem} alt="" className="tv-mini" /> : <span className="tv-icone">{slide.tipo === 'memoria' ? <Quote size={30} /> : slide.tipo === 'estatistica' ? <Trophy size={30} /> : <Sparkles size={30} />}</span>}
              <h3>{slide.titulo}</h3><p>{slide.subtitulo}</p>
              {slide.personId && <Button onClick={() => irPara('ficha', slide.personId)}><Eye size={15} />Abrir ficha</Button>}
            </div>
          )}
          {(slide.tipo === 'foto' || slide.tipo === 'video') && <div className="tv-legenda"><strong>{slide.titulo}</strong><span>{slide.subtitulo}</span></div>}
        </motion.div>
      </AnimatePresence>
    </div>
    <div className="tv-barra">
      <IconButton label="Slide anterior" onClick={() => setIndice((indice + slides.length - 1) % slides.length)}><SkipBack size={17} /></IconButton>
      <IconButton label={tocando ? 'Pausar reprodução' : 'Continuar reprodução'} onClick={() => setTocando(!tocando)}>{tocando ? <Pause size={17} /> : <Play size={17} />}</IconButton>
      <IconButton label="Próximo slide" onClick={() => setIndice((indice + 1) % slides.length)}><SkipForward size={17} /></IconButton>
      <IconButton label={emTelaCheia ? 'Sair da tela cheia' : 'Ver em tela cheia'} onClick={telaCheia}>{emTelaCheia ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</IconButton>
      <span className="tv-contador">{(indice % slides.length) + 1} / {slides.length}</span>
      <label className="tv-trilha"><Music size={14} /><select value={trilha} onChange={e => setTrilha(e.target.value as TrilhaId | 'nenhuma')} aria-label="Trilha da apresentação">
        {TRILHAS.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        <option value="nenhuma">Sem música</option>
      </select></label>
    </div>
    {tocando && slides.length > 1 && <span key={indice} className="tv-progresso" style={{ animationDuration: `${SEGUNDOS_POR_SLIDE}s` }} />}
  </div>;
}

// ---------------------------------------------------------------------------
// Ambiente: deixe o app aberto com um som de fundo enquanto organiza
// ---------------------------------------------------------------------------

const ICONES_AMBIENTE: Record<AmbienteId, typeof Coffee> = { chuva: CloudRain, cafe: Coffee, oceano: Droplets, cidade: Building2, lofi: Disc3 };

function AmbienteTab() {
  const ctx = useCatalog();
  const { data } = ctx;
  const s = data.settings;
  const [ouvindo, setOuvindo] = useState<AmbienteId | null>(null);
  const volume = s.ambienteVolume ?? 40;

  useEffect(() => { definirVolumeAmbiente(volume / 100); }, [volume]);
  useEffect(() => () => { /* o ambiente continua tocando em outras telas; só para no mudo geral */ }, []);

  const alternar = (id: AmbienteId) => {
    if (ouvindo === id) { pararAmbiente(); setOuvindo(null); return; }
    if (s.somAmbiente === false) { ctx.notify('Os sons ambientes estão desligados nos Ajustes.', true); return; }
    definirVolumeAmbiente(volume / 100);
    if (iniciarAmbiente(id)) { setOuvindo(id); ctx.buzz?.(8); }
    else ctx.notify('Não foi possível tocar o ambiente agora (sem áudio ou app no mudo).', true);
  };

  return <div className="explorar-grade">
    <section className="panel">
      <SectionHeading icon={Music} title="Ambiente sonoro" />
      <p className="form-help">Deixe o app aberto organizando o catálogo com um fundo. Tudo é gerado na hora — nenhum arquivo é baixado.</p>
      <ul className="ambiente-lista">
        {AMBIENTES.map(amb => {
          const Icone = ICONES_AMBIENTE[amb.id];
          const ativo = ouvindo === amb.id;
          return <li key={amb.id} className={ativo ? 'tocando' : ''}>
            <span className="ambiente-icone"><Icone size={20} /></span>
            <span className="ambiente-copy"><strong>{amb.nome}</strong><small>{amb.descricao}</small></span>
            <Button variant={ativo ? 'primary' : undefined} onClick={() => alternar(amb.id)}>{ativo ? <><Pause size={15} />Parar</> : <><Play size={15} />Ouvir</>}</Button>
          </li>;
        })}
      </ul>
    </section>
    <section className="panel">
      <SectionHeading icon={Volume2} title="Volume e silêncio" />
      <label className="ambiente-volume"><span>Volume do ambiente: {volume}%</span>
        <input type="range" min={0} max={100} step={5} value={volume} aria-label="Volume do ambiente" onChange={e => ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteVolume: Number(e.target.value) } }), undefined, false)} />
      </label>
      <label className="check-label"><input type="checkbox" checked={s.somAmbiente !== false} onChange={() => {
        if (s.somAmbiente !== false) { pararAmbiente(); pararTrilha(); setOuvindo(null); }
        ctx.commit(d => ({ ...d, settings: { ...d.settings, somAmbiente: s.somAmbiente === false } }), 'Preferência salva.');
      }} /><span>Sons ambientes e trilhas ligados</span></label>
      <label className="check-label"><input type="checkbox" checked={s.somSecao !== false} onChange={() => ctx.commit(d => ({ ...d, settings: { ...d.settings, somSecao: s.somSecao === false } }), 'Preferência salva.')} /><span>Cada seção tem seu sinal sonoro</span></label>
      <p className="form-help">Início é suave, galeria tem clique de câmera, explorar tem descoberta, ranking tem interface e adicionar tem obturador. Tudo fica mudo no disfarce, no pânico e na privacidade.</p>
      {s.somAmbiente === false && <p className="form-help"><VolumeX size={13} /> Ambientes desligados — ligue acima para ouvir.</p>}
    </section>
  </div>;
}

// ---------------------------------------------------------------------------
// Mini-desafios: três por dia, +20 XP cada
// ---------------------------------------------------------------------------

function sugestaoPara(data: AppData, id: string): Person | null {
  const ativas = data.people.filter(isActive);
  const sortear = (lista: Person[]) => (lista.length ? lista[Math.floor(Math.random() * lista.length)] : null);
  switch (id) {
    case 'rever-antiga': return sortear(ativas.filter(p => (daysSince(p.createdAt) ?? -1) >= 180));
    case 'sem-foto': return sortear(ativas.filter(p => !p.fotos.length));
    case 'nota-alta': return sortear(ativas.filter(p => calculateOverallRating(p.rating) >= 4.5));
    case 'familia': return sortear(ativas.filter(p => (p.vinculos || []).length > 0));
    case 'aniversario': { const mes = new Date().toISOString().slice(5, 7); return sortear(ativas.filter(p => (p.aniversario || '').slice(5, 7) === mes)); }
    case 'arquivo': return sortear(data.people.filter(p => p.archivedAt && !p.deletedAt));
    case 'tres-fichas': {
      const visitadas = data.progress.exploracao?.visitadasDia || [];
      return sortear(ativas.filter(p => !visitadas.includes(p.id))) || sortear(ativas);
    }
    case 'completa': return sortear(ativas.filter(p => completeness(p).percent < 100)) || sortear(ativas);
    default: return null;
  }
}

function DesafiosTab() {
  const ctx = useCatalog();
  const { data } = ctx;
  const hoje = today();
  const guardados = data.progress.desafiosDiarios?.dia === hoje ? data.progress.desafiosDiarios.concluidos : [];
  const lista = useMemo(() => desafiosDoDia(data, hoje, guardados), [data, hoje, guardados]);
  const [sugestoes, setSugestoes] = useState<Record<string, Person | null>>({});

  const resgatar = (id: string, titulo: string) => {
    ctx.commit(d => ({
      ...d,
      progress: {
        ...d.progress,
        desafiosDiarios: { dia: hoje, concluidos: [...new Set([...(d.progress.desafiosDiarios?.dia === hoje ? d.progress.desafiosDiarios.concluidos : []), id])] },
        exploracao: aposDescoberta(d.progress.exploracao, hoje),
      },
    }), undefined, false);
    ctx.addXp(20, `Mini-desafio concluído: +20 XP.`);
    ctx.sound('success');
    void titulo;
  };

  if (!lista.length) return <EmptyState icon={Puzzle} title="Sem desafios hoje" description="Os mini-desafios aparecem quando o catálogo tem por onde brincar." />;
  return <div className="desafios-lista">
    <p className="form-help">Três brincadeiras por dia, sorteadas para o seu catálogo. Cumprir conta como descoberta — e rende XP.</p>
    {lista.map(d => {
      const resgatado = guardados.includes(d.id);
      const pronto = d.progresso >= d.alvo;
      const sugestao = sugestoes[d.id] ?? null;
      return <section key={d.id} className={`panel desafio-card ${resgatado ? 'resgatado' : ''}`}>
        <div className="desafio-head"><span className="desafio-icone"><Puzzle size={18} /></span>
          <div><h3>{d.titulo}</h3><p>{d.descricao}</p></div>
          {resgatado && <span className="desafio-selo"><Check size={14} />+20 XP</span>}
        </div>
        <div className="desafio-progresso"><span className="progress-track"><i style={{ width: `${Math.min(100, (d.progresso / d.alvo) * 100)}%` }} /></span><small>{Math.min(d.progresso, d.alvo)} de {d.alvo}</small></div>
        <div className="desafio-acoes">
          {!resgatado && <>
            <Button onClick={() => {
              const pessoa = sugestaoPara(data, d.id);
              setSugestoes(s => ({ ...s, [d.id]: pessoa }));
              if (pessoa) ctx.openPerson(pessoa, d.id === 'completa' ? { editar: true } : undefined);
              else ctx.notify('Nenhuma ficha combina com este desafio agora.', true);
            }}><Eye size={15} />{sugestao ? 'Abrir outra sugestão' : 'Abrir sugestão'}</Button>
            {pronto && <Button variant="primary" onClick={() => resgatar(d.id, d.titulo)}><Check size={15} />Resgatar +20 XP</Button>}
          </>}
          {resgatado && <p className="form-help">Concluído! Amanhã tem mais três.</p>}
        </div>
      </section>;
    })}
  </div>;
}

// ---------------------------------------------------------------------------
// Coleção: visuais desbloqueáveis + easter eggs
// ---------------------------------------------------------------------------

function ColecaoTab() {
  const ctx = useCatalog();
  const { data } = ctx;
  const s = data.settings;
  const itens = useMemo(() => desbloqueaveis(data), [data]);
  const anunciados = useRef(false);

  // Carimba os recém-liberados e anuncia o primeiro sem alarde.
  useEffect(() => {
    if (anunciados.current) return;
    anunciados.current = true;
    const novos = itens.filter(i => i.liberado && !i.liberadoEm);
    if (!novos.length) return;
    const agora = new Date().toISOString();
    ctx.commit(d => ({ ...d, progress: { ...d.progress, desbloqueaveis: { ...(d.progress.desbloqueaveis || {}), ...Object.fromEntries(novos.map(n => [n.id, agora])) } } }), undefined, false);
    ctx.sound('unlock');
    ctx.notify(novos.length === 1 ? `Novo visual liberado: ${novos[0].nome}.` : `${novos.length} visuais liberados na sua coleção.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equipado = (tipo: string, valor: string) =>
    tipo === 'fundo' ? s.fundoEquipado === valor
    : tipo === 'moldura' ? s.molduraEquipada === valor
    : tipo === 'cartao' ? s.estiloCartao === valor
    : s.accent === valor;

  const equipar = (tipo: string, valor: string, nome: string) => {
    ctx.commit(d => ({
      ...d,
      settings: {
        ...d.settings,
        fundoEquipado: tipo === 'fundo' ? valor : d.settings.fundoEquipado,
        molduraEquipada: tipo === 'moldura' ? valor : d.settings.molduraEquipada,
        estiloCartao: tipo === 'cartao' ? valor : d.settings.estiloCartao,
        accent: tipo === 'acento' ? valor : d.settings.accent,
      },
    }), `${nome} equipado.`);
    ctx.sound('pop');
  };

  const desequipar = (tipo: string) => {
    ctx.commit(d => ({
      ...d,
      settings: {
        ...d.settings,
        fundoEquipado: tipo === 'fundo' ? '' : d.settings.fundoEquipado,
        molduraEquipada: tipo === 'moldura' ? '' : d.settings.molduraEquipada,
        estiloCartao: tipo === 'cartao' ? '' : d.settings.estiloCartao,
      },
    }), 'Visual padrão de volta.');
  };

  const grupos: { tipo: string; titulo: string }[] = [
    { tipo: 'fundo', titulo: 'Fundos' },
    { tipo: 'moldura', titulo: 'Molduras de retrato' },
    { tipo: 'cartao', titulo: 'Estilos de cartão' },
    { tipo: 'acento', titulo: 'Cores de destaque' },
  ];
  const stats = estatisticasRapidas(data);

  return <div className="colecao-grade">
    <section className="panel colecao-numeros">
      <div><strong>{stats.fichas}</strong><span>fichas</span></div>
      <div><strong>{getAllPhotos(data).length}</strong><span>fotos</span></div>
      <div><strong>{data.progress.exploracao?.sequencia || 0}</strong><span>sequência</span></div>
      <div><strong>{itens.filter(i => i.liberado).length}/{itens.length}</strong><span>liberados</span></div>
    </section>
    {grupos.map(grupo => <section key={grupo.tipo} className="panel">
      <SectionHeading icon={Trophy} title={grupo.titulo} />
      <ul className="colecao-lista">
        {itens.filter(i => i.tipo === grupo.tipo).map(item => {
          const emUso = equipado(item.tipo, item.valor);
          return <li key={item.id} className={`${item.liberado ? 'liberado' : 'bloqueado'} ${emUso ? 'em-uso' : ''}`}>
            <span className="colecao-icone">{item.liberado ? <Check size={16} /> : <Lock size={15} />}</span>
            <span className="colecao-copy"><strong>{item.nome}{emUso && <em> · em uso</em>}</strong><small>{item.descricao}</small>{!item.liberado && <small className="colecao-dica">Como liberar: {item.dica}</small>}</span>
            {item.liberado && (emUso
              ? item.tipo !== 'acento' && <Button onClick={() => desequipar(item.tipo)}>Tirar</Button>
              : <Button variant="primary" onClick={() => equipar(item.tipo, item.valor, item.nome)}>Equipar</Button>)}
          </li>;
        })}
      </ul>
    </section>)}
    <section className="panel">
      <SectionHeading icon={Egg} title="Easter eggs" />
      <p className="form-help">Coisas raras que aparecem de vez em quando. Algumas nem aparecem na lista antes de serem encontradas.</p>
      <ul className="colecao-lista ovos-lista">
        {OVOS.map(ovo => {
          const quando = ovoEncontrado(data, ovo.id);
          const oculto = ovo.secreto && !quando;
          return <li key={ovo.id} className={quando ? 'liberado' : oculto ? 'oculto' : 'bloqueado'}>
            <span className="colecao-icone">{quando ? <Egg size={16} /> : oculto ? <span>?</span> : <Lock size={15} />}</span>
            <span className="colecao-copy"><strong>{oculto ? 'Ovo misterioso' : ovo.nome}</strong><small>{quando ? `Encontrado ${quando === 'sim' ? 'em outra visita' : formatDate(quando, true)}` : oculto ? 'Ainda não encontrado...' : ovo.dica}</small></span>
          </li>;
        })}
      </ul>
    </section>
  </div>;
}

// ---------------------------------------------------------------------------
// Sobreposição de descoberta: “Você encontrou uma memória de 8 meses atrás”
// ---------------------------------------------------------------------------

function textoMeses(meses: number): string {
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (!resto) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${resto} ${resto === 1 ? 'mês' : 'meses'}`;
}

/** Camada global (renderizada no App, por cima da ficha) quando uma memória antiga é aberta. */
export function SobreposicaoDescoberta() {
  const ctx = useCatalog();
  const { data } = ctx;
  const descoberta = ctx.descoberta;
  const pessoa = descoberta ? data.people.find(p => p.id === descoberta.personId) : null;

  useEffect(() => {
    if (!descoberta) return;
    ctx.sound('descoberta');
    const timer = setTimeout(() => ctx.dismissDescoberta(), 9000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descoberta?.personId]);

  if (!descoberta || !pessoa) return null;
  return <motion.div className="descoberta-camada" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
    <motion.div className="descoberta-cartao" initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
      <motion.span className="descoberta-brilho" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}><Sparkles size={22} /></motion.span>
      <Avatar person={pessoa} size={64} />
      <p className="eyebrow">Memória reencontrada</p>
      <h3>Você encontrou uma memória de {textoMeses(descoberta.meses)} atrás</h3>
      <p>{pessoa.nome} está no catálogo desde {formatDate(pessoa.createdAt)}.</p>
      <div className="descoberta-acoes">
        <Button variant="primary" onClick={() => ctx.dismissDescoberta()}><Eye size={15} />Revisitar agora</Button>
      </div>
    </motion.div>
  </motion.div>;
}

/** Atalho usado pelo contexto: quantos meses tem a ficha (para a festa de descoberta). */
export function mesesDaFicha(pessoa: Person): number {
  return mesesDesde(pessoa.createdAt);
}
