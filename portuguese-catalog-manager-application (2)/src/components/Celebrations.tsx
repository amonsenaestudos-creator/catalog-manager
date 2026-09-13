import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Crown, Dices, Gauge, Sparkles, X } from 'lucide-react';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { isActive, PALETTE } from '../store';
import { playSound } from '../lib/sound';
import { Avatar, Button, Modal } from './ui';

/** Chuva de confetes por cima da tela. Cada pedaço é um div animado com framer-motion; nada de canvas ou bibliotecas. */
export function ConfettiBurst({ seed, count = 70 }: { seed: number; count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, index) => {
    const random = mulberry(seed + index);
    return { id: index, left: random() * 100, delay: random() * 0.35, duration: 1.6 + random() * 1.3, drift: (random() - 0.5) * 220, spin: (random() - 0.5) * 900, color: PALETTE[Math.floor(random() * PALETTE.length)], size: 6 + random() * 7, round: random() > 0.6 };
  }), [seed, count]);
  return <div className="confetti-layer" aria-hidden="true">
    {pieces.map(piece => <motion.span key={piece.id} className={piece.round ? 'confetti-piece round' : 'confetti-piece'} style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * (piece.round ? 1 : 0.55), background: piece.color }}
      initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }} animate={{ y: '105vh', x: piece.drift, rotate: piece.spin, opacity: [1, 1, 0.9, 0] }} transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }} />)}
  </div>;
}

/** Cartão que sobe quando o nível muda: mostra o novo título e some sozinho. */
export function LevelUpBadge({ level, title, onClose }: { level: number; title: string; onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 5200); return () => clearTimeout(timer); }, [onClose]);
  return <motion.div className="levelup-badge" role="status" initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
    <motion.span className="levelup-ring" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
    <span className="levelup-icon"><Gauge size={22} /></span>
    <div><p className="eyebrow">Você subiu de nível</p><h3>Nível {level}</h3><p>{title}</p></div>
    <button onClick={onClose} aria-label="Fechar aviso de nível"><X size={15} /></button>
  </motion.div>;
}

/** Aviso de conquista com confete: aparece por alguns segundos no canto da tela. */
export function AchievementToast({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 5200); return () => clearTimeout(timer); }, [onClose]);
  return <motion.div className="achievement-toast" role="status" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
    <span className="achievement-toast-icon"><Award size={20} /></span>
    <div><p className="eyebrow">Conquista desbloqueada</p><h3>{title}</h3><p>{description}</p></div>
    <button onClick={onClose} aria-label="Fechar conquista"><X size={15} /></button>
  </motion.div>;
}

/** Cinturão de campeã do This or That: quem lidera o placar ganha o destaque dourado. */
export function ChampionBelt({ person, wins, compact = false }: { person: Person; wins: number; compact?: boolean }) {
  const ctx = useCatalog();
  return <button className={`champion-belt ${compact ? 'compact' : ''}`} onClick={() => ctx.openPerson(person)} title={`${person.nome} lidera o placar com ${wins} ${wins === 1 ? 'vitória' : 'vitórias'}`}>
    <motion.span className="belt-shine" animate={{ x: ['-120%', '220%'] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }} />
    <span className="belt-crown"><Crown size={compact ? 14 : 18} /></span>
    <Avatar person={person} size={compact ? 30 : 46} />
    <span className="belt-copy"><small>Campeã do duelo</small><strong>{person.nome}</strong>{!compact && <em>{wins} {wins === 1 ? 'vitória' : 'vitórias'} · cinturão em disputa</em>}</span>
  </button>;
}

/** Roleta: gira por alguns segundos passando por fichas aleatórias e para em uma. */
export function RouletteModal({ onClose }: { onClose: () => void }) {
  const ctx = useCatalog(), { data } = ctx;
  const pool = useMemo(() => data.people.filter(isActive), [data.people]);
  const [current, setCurrent] = useState<Person | null>(() => pool[Math.floor(Math.random() * pool.length)] || null);
  const [spinning, setSpinning] = useState(false);
  const [round, setRound] = useState(0);
  const mounted = useRef(true);
  const spinningRef = useRef(false);
  const spin = useCallback(() => {
    if (pool.length < 2 || spinningRef.current) return;
    spinningRef.current = true; setSpinning(true);
    const steps = 18 + Math.floor(Math.random() * 8);
    let step = 0;
    const next = () => {
      if (!mounted.current) return;
      step += 1;
      setCurrent(pool[Math.floor(Math.random() * pool.length)]);
      playSound('tick');
      if (step < steps) setTimeout(next, 45 + step * step * 1.1);
      else { spinningRef.current = false; setSpinning(false); setRound(value => value + 1); playSound('success'); }
    };
    next();
  }, [pool]);
  // Começa girando assim que abre; se fechar no meio, os temporizadores param sozinhos.
  useEffect(() => { mounted.current = true; spin(); return () => { mounted.current = false; }; }, [spin]);
  if (!pool.length) return <Modal title="Roleta do catálogo" onClose={onClose}><p className="form-help">Cadastre pessoas ativas para girar a roleta.</p></Modal>;
  return <Modal title="Roleta do catálogo" description="Deixe o acaso escolher quem você vai rever hoje." onClose={onClose} className="roulette-modal"
    footer={<><Button onClick={spin} disabled={spinning || pool.length < 2}><Dices size={16} />{spinning ? 'Girando...' : 'Girar de novo'}</Button><Button variant="primary" disabled={!current || spinning} onClick={() => { if (current) { onClose(); ctx.openPerson(current); } }}><Sparkles size={16} />Abrir ficha</Button></>}>
    <div className={`roulette-stage ${spinning ? 'spinning' : 'stopped'}`} aria-live="polite">
      <AnimatePresence mode="popLayout">{current && <motion.div key={`${current.id}-${round}-${spinning}`} className="roulette-card" initial={{ opacity: 0, y: 24, rotateX: 40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: spinning ? 0.08 : 0.35 }}>
        <Avatar person={current} size={spinning ? 96 : 120} />
        <h3>{current.nome}</h3>
        {!spinning && <p className="muted small">{pool.length} fichas participaram do sorteio.</p>}
      </motion.div>}</AnimatePresence>
    </div>
  </Modal>;
}

/** Gerador determinístico simples para os confetes não mudarem a cada render. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
