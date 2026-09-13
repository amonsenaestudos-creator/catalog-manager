import { useMemo, useState } from 'react';
import type { Person } from '../types';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ArrowLeft, Eye, Heart, RefreshCw, Scale, Sparkles, Swords, X, Zap } from 'lucide-react';
import { useCatalog } from '../context';
import { calculateOverallRating, formatDate, getFinalScore, isActive, locationLabel, RARITY_LABELS, rarityFor } from '../store';
import { averageRadar, duelRanking } from '../lib/stats';
import { ChampionBelt } from './Celebrations';
import { Avatar, Button, EmptyState, PageTitle, SectionHeading } from './ui';
import { Radar } from './Charts';
import StarRating from './StarRating';

type Mode = 'swipe' | 'duelo';

export default function Discover() {
  const ctx = useCatalog(), { data } = ctx;
  const [mode, setMode] = useState<Mode>('swipe');
  const pool = useMemo(() => data.people.filter(person => isActive(person) && !ctx.data.progress.swipes[person.id]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.people, data.progress.swipes]);
  const swiped = Object.keys(data.progress.swipes).length;
  const likes = Object.values(data.progress.swipes).filter(value => value === 'like').length;
  const duelPool = useMemo(() => data.people.filter(person => isActive(person) && (person.fotos.length || calculateOverallRating(person.rating) > 0)), [data.people]);
  const axes = averageRadar(data).map(item => item.label);

  return <div className="discover-page">
    <PageTitle eyebrow="Descobrir" title="Descobrir" description="Passe os cartões, escolha entre duas pessoas e deixe o ranking se montar sozinho.">
      <Button onClick={() => ctx.navigate('catalog')}><ArrowLeft size={16} />Voltar ao catálogo</Button>
    </PageTitle>
    <div className="scope-tabs">
      <button className={mode === 'swipe' ? 'active' : ''} onClick={() => setMode('swipe')}><Sparkles size={15} />Modo swipe<span>{pool.length}</span></button>
      <button className={mode === 'duelo' ? 'active' : ''} onClick={() => setMode('duelo')}><Swords size={15} />This or That<span>{duelPool.length}</span></button>
      <div className="scope-end"><span className="muted small">{swiped} cartões avaliados · {likes} favoritos</span></div>
    </div>
    {mode === 'swipe' ? <SwipeDeck pool={pool} onReset={() => ctx.commit(d => ({ ...d, progress: { ...d.progress, swipes: {} } }), 'Histórico do modo swipe zerado.', false)} /> : <DuelMode pool={duelPool} axes={axes} />}
  </div>;
}

function SwipeDeck({ pool, onReset }: { pool: Person[]; onReset: () => void }) {
  const ctx = useCatalog();
  const [index, setIndex] = useState(0);
  const current = pool[index];
  const decide = (direction: 'like' | 'pass') => { if (!current) return; ctx.swipe(current.id, direction); setIndex(value => value + 1); };
  if (!current) return <div className="swipe-empty"><EmptyState icon={RefreshCw} title={pool.length ? 'Fim do baralho' : 'Nenhuma ficha para passar'} description={pool.length ? 'Você já avaliou todos os cartões desta rodada.' : 'Cadastre pessoas ativas para usar o modo swipe.'} action="Recomeçar rodada" onAction={onReset} /></div>;
  return <div className="swipe-wrap">
    <SwipeCard key={current.id} person={current} onDecide={decide} onOpen={() => ctx.openPerson(current)} />
    <div className="swipe-controls">
      <Button onClick={() => decide('pass')} aria-label="Passar"><X size={18} />Passar <kbd>←</kbd></Button>
      <Button onClick={() => ctx.openPerson(current)} aria-label="Abrir ficha"><Eye size={18} /></Button>
      <Button variant="primary" onClick={() => decide('like')} aria-label="Favoritar"><Heart size={18} />Favoritar <kbd>→</kbd></Button>
    </div>
    <p className="muted small">{pool.length - index} cartão(ões) restante(s) nesta rodada. Atalhos: seta esquerda passa, seta direita favorita.</p>
  </div>;
}

function SwipeCard({ person, onDecide, onOpen }: { person: Person; onDecide: (direction: 'like' | 'pass') => void; onOpen: () => void }) {
  const ctx = useCatalog(), { data } = ctx;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -20], [1, 0]);
  const photo = person.fotos.find(file => file.isMain) || person.fotos[0];
  const rarity = rarityFor(calculateOverallRating(person.rating));
  const dragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110) onDecide('like');
    else if (info.offset.x < -110) onDecide('pass');
  };
  return <motion.article className={`swipe-card ${rarity === 'lendario' ? 'legendary-glow' : ''}`} style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.75} onDragEnd={dragEnd}
    onKeyDown={event => { if (event.key === 'ArrowRight') onDecide('like'); if (event.key === 'ArrowLeft') onDecide('pass'); }} tabIndex={0} aria-label={`Cartão de ${person.nome}`}>
    <motion.span className="swipe-badge like" style={{ opacity: likeOpacity }}>Favoritar</motion.span>
    <motion.span className="swipe-badge pass" style={{ opacity: passOpacity }}>Passar</motion.span>
    <button className="swipe-photo" onClick={onOpen}>
      {photo ? <img src={photo.url} alt={`Foto de ${person.nome}`} className="person-photo" /> : <span className="swipe-initials">{person.nome.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>}
      <span className="swipe-shade" />
      <span className={`rarity-chip rarity-${rarity}`}>{RARITY_LABELS[rarity]}</span>
      <div className="swipe-info"><h3>{person.nome}</h3><p>{locationLabel(person, data)}{person.idade ? ` · ${person.idade} anos` : ''}</p><StarRating value={calculateOverallRating(person.rating)} readonly size={15} /></div>
    </button>
    <div className="swipe-tags">{person.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
    <p className="swipe-note">{person.descricao.length > 120 ? `${person.descricao.slice(0, 120)}…` : person.descricao}</p>
    <small className="muted">Cadastrada em {formatDate(person.createdAt)}</small>
  </motion.article>;
}

function DuelMode({ pool, axes }: { pool: Person[]; axes: string[] }) {
  const ctx = useCatalog(), { data } = ctx;
  const [pair, setPair] = useState<[number, number]>(() => randomPair(pool.length));
  const left = pool[pair[0]], right = pool[pair[1]];
  const next = () => setPair(randomPair(pool.length));
  const choose = (winner: Person, loser: Person) => { ctx.duel(winner.id, loser.id); next(); };
  const champion = duelRanking(data)[0];
  if (pool.length < 2) return <EmptyState icon={Swords} title="O duelo precisa de duas pessoas" description="Cadastre pelo menos duas fichas ativas para comparar lado a lado." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />;
  return <div className="duel-wrap">
    <p className="duel-hint"><Zap size={14} />Escolha quem você prefere. Cada vitória alimenta o placar no Painel.</p>
    {champion?.person && <ChampionBelt person={champion.person} wins={champion.wins} />}
    <div className="duel-arena">{[left, right].map(person => person && <button key={person.id} className={`duel-card ${champion?.person?.id === person.id ? 'is-champion' : ''} ${rarityFor(calculateOverallRating(person.rating)) === 'lendario' ? 'legendary-glow' : ''}`} onClick={() => choose(person, person === left ? right : left)}>
      {champion?.person?.id === person.id && <span className="champion-tag">Campeã</span>}
      {person.fotos[0] ? <img src={person.fotos[0].url} alt={person.nome} className="person-photo" /> : <Avatar person={person} size={92} />}
      <h3>{person.nome}</h3><StarRating value={calculateOverallRating(person.rating)} readonly size={14} />
      <span>{formatNumberSafe(getFinalScore(person))} pontos</span>
    </button>)}<span className="duel-vs">ou</span></div>
    <div className="duel-actions"><Button onClick={next}><RefreshCw size={16} />Outro par</Button><Button onClick={() => ctx.setCompareIds([left?.id, right?.id].filter(Boolean) as string[])}><Scale size={16} />Comparar fichas</Button></div>
    {left && right && <section className="duel-radar"><SectionHeading icon={Scale} title="Radar do duelo" /><Radar axes={axes} series={[
      { name: left.nome, values: axes.map((_, index) => left.rating[(RATING_KEYS[index]) ] || 0) },
      { name: right.nome, values: axes.map((_, index) => right.rating[(RATING_KEYS[index])] || 0) },
    ]} /><p className="muted small">Verde: {left.nome} · Lilás: {right.nome}. {data.progress.duels.length} duelos registrados.</p></section>}
  </div>;
}

const RATING_KEYS = ['peitos', 'bunda', 'rosto', 'belezaGeral', 'corpo', 'cabelo', 'comportamento', 'quadril'] as const;
const formatNumberSafe = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function randomPair(length: number): [number, number] {
  if (length < 2) return [0, 0];
  const first = Math.floor(Math.random() * length);
  let second = Math.floor(Math.random() * length);
  while (second === first) second = Math.floor(Math.random() * length);
  return [first, second];
}

