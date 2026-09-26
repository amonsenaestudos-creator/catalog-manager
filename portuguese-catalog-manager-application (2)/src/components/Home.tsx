import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Flame, Gift, Heart, Plus, Shuffle, Sparkles, Trophy, Users } from 'lucide-react';
import { useCatalog } from '../context';
import { calculateOverallRating, formatDate, getFinalScore, isActive, locationLabel, rankedPeople, today } from '../store';
import { Avatar, Button, Disclosure, EmptyState, IconButton, PageTitle, PhotoView, SectionHeading } from './ui';
import StarRating from './StarRating';
import Analytics from './Analytics';
import Reminders from './Reminders';
import { ARCHIVE_SCENE } from '../assets';

const slides = [{ title: 'Cada conexão,\numa história.', text: 'Seu catálogo é feito de pessoas. E dos detalhes que você não quer esquecer.', action: 'Adicionar pessoa', page: 'add' }, { title: 'Seu mundo,\ndo seu jeito.', text: 'Crie categorias, reúna pessoas em coleções e encontre tudo com facilidade.', action: 'Organizar meu catálogo', page: 'tools' }, { title: 'Memórias que\nmerecem ficar.', text: 'Reúna fotos, anotações e momentos especiais em um único lugar.', action: 'Explorar a galeria', page: 'gallery' }];
export default function Home() {
  const ctx = useCatalog(), { data } = ctx;
  const [slide, setSlide] = useState(0); const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused || data.settings.reducedMotion) return; const timer = setInterval(() => setSlide(s => (s + 1) % slides.length), 6500); return () => clearInterval(timer); }, [paused, data.settings.reducedMotion]);
  const people = useMemo(() => data.people.filter(isActive), [data.people]); const ranking = useMemo(() => rankedPeople(people).slice(0, 5), [people]);
  const recent = [...people].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4); const favorites = people.filter(p => p.favorite).slice(0, 5);
  const random = () => { if (people.length) ctx.openPerson(people[Math.floor(Math.random() * people.length)]); };
  return <div className="home-page"><PageTitle eyebrow="Seu espaço pessoal" title={`Olá, ${data.settings.profileName.split(' ')[0] || 'você'}.`} description="Bom ter você por aqui. O que vamos guardar hoje?"><Button onClick={random} disabled={!people.length}><Shuffle size={16} />Surpresa</Button><Button variant="primary" onClick={() => ctx.setQuickOpen(true)}><Plus size={17} />Fichário rápido</Button></PageTitle>
    {people.length > 0 && <button className="home-explorar" onClick={() => ctx.navigate('explorar')}>
      <span className="home-explorar-icone"><Gift size={19} /></span>
      <span className="home-explorar-copy"><strong>{data.progress.presentes?.[today()] ? 'Presente de hoje aberto — e tem mais' : 'Um presente espera por você'}</strong><small>Explorar: momentos, trilhas, mapa, tempo e desafios</small></span>
      {(data.progress.exploracao?.sequencia || 0) > 0 && <span className="home-explorar-seq"><Flame size={14} />{data.progress.exploracao?.sequencia}</span>}
      <ArrowRight size={16} />
    </button>}
    <section className="home-banner" aria-roledescription="carrossel" aria-label="Conheça seu catálogo" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <img src={ARCHIVE_SCENE} alt="Pastas lilás e um caderno organizados em uma mesa" />
      <div className="banner-shade" />
      <AnimatePresence mode="wait"><motion.div className="banner-copy" key={slide} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}><h2>{slides[slide].title}</h2><p>{slides[slide].text}</p><button onClick={() => ctx.navigate(slides[slide].page)}>{slides[slide].action}<ArrowRight size={16} /></button></motion.div></AnimatePresence>
      <div className="banner-controls"><div>{slides.map((s, i) => <button key={i} aria-label={`Mostrar destaque: ${s.title.replace('\n', ' ')}`} aria-current={slide === i} className={i === slide ? 'active' : ''} onClick={() => setSlide(i)} />)}</div><span><IconButton label="Destaque anterior" onClick={() => setSlide((slide + 2) % 3)}><ChevronLeft size={17} /></IconButton><IconButton label="Próximo destaque" onClick={() => setSlide((slide + 1) % 3)}><ChevronRight size={17} /></IconButton></span></div>
    </section>
    <div className="home-main-grid"><section><SectionHeading icon={Trophy} title="Top 5 do ranking" action="Ver ranking" onAction={() => ctx.navigate('ranking')} /><div className="home-rank-list">{ranking.map((p, i) => <button key={p.id} onClick={() => ctx.openPerson(p)}><span className={`home-position position-${i + 1}`}>{String(i + 1).padStart(2, '0')}</span><Avatar person={p} size={57} /><span className="home-rank-name"><strong>{p.nome}</strong><small>{locationLabel(p, data, false)}</small></span><span className="home-rank-score"><strong>{getFinalScore(p).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</strong><StarRating value={calculateOverallRating(p.rating)} size={11} readonly showValue={false} /></span><ChevronRight size={15} className="row-arrow" /></button>)}</div>{!ranking.length && <EmptyState icon={Trophy} title="Seu pódio começa com uma conexão" description="Adicione pessoas e suas avaliações para descobrir os destaques." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />}{favorites.length > 0 && <section className="home-favorites"><SectionHeading icon={Heart} title="Sempre por perto" action="Favoritos" onAction={() => ctx.navigate('catalog', 'favorites')} /><div>{favorites.map(p => <button key={p.id} onClick={() => ctx.openPerson(p)}><Avatar person={p} size={48} /><span>{p.nome.split(' ')[0]}</span></button>)}</div></section>}<div className="home-quick-links"><button onClick={() => ctx.navigate('drafts')}><BookOpen size={17} /><span>Continuar um rascunho</span><small>{Object.keys(data.drafts).length}</small><ArrowRight size={14} /></button><button onClick={() => ctx.navigate('folders')}><Users size={17} /><span>Minhas pastas</span><small>{data.folders.length}</small><ArrowRight size={14} /></button></div></section>
    <section><SectionHeading icon={Clock3} title="Adicionados recentemente" action="Ver catálogo" onAction={() => ctx.navigate('catalog')} /><div className="recent-grid">{recent.map(p => <button className="recent-person" key={p.id} onClick={() => ctx.openPerson(p)}><PhotoView person={p} /><span className="recent-shade" /><span className="recent-person-copy"><strong>{p.nome}</strong><small>{locationLabel(p, data, false)} <i />{formatDate(p.createdAt)}</small><StarRating value={calculateOverallRating(p.rating)} readonly size={12} showValue={false} /></span></button>)}</div>{!recent.length && <div className="recent-empty"><span className="outline-folder"><Heart size={37} strokeWidth={1.1} /></span><h3>Uma biblioteca de boas conexões.</h3><p>Seu catálogo está pronto. Comece com alguém que faz parte da sua história.</p><Button onClick={() => ctx.setQuickOpen(true)}><Plus size={16} />Criar primeira ficha</Button></div>}</section></div>
    <Reminders compact />
    <Disclosure title="Um olhar sobre o seu catálogo" defaultOpen><Analytics /></Disclosure>
    <footer className="home-footer"><span><Sparkles size={14} />Feito para guardar o que importa.</span><button onClick={() => ctx.navigate('guide')}>Conhecer os novos recursos<ArrowRight size={14} /></button></footer>
  </div>;
}