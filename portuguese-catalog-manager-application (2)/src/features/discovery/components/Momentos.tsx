import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Camera, ChevronLeft, ChevronRight, CirclePlay, CloudRain, Coffee, Compass, Film, Gift, Headphones, Image, Layers, Link2, Moon, Music2, Pause, Play, RotateCcw, Sparkles, Star, Timer, Trophy, UserRound, Users, Video, Volume2, VolumeX, Waves, X } from 'lucide-react';
import { useCatalog } from '../../../context';
import { formatDate, getAllPhotos, isActive, today } from '../../../store';
import type { Photo, Person } from '../../../types';
import { Button, EmptyState, IconButton, PageTitle, SectionHeading } from '../../../components/ui';
import { PlayerDeMusica, SEM_MUSICA, TRILHAS_DA_APRESENTACAO, ehClimaDoAmbiente, musicaPorId, pararAmbiente, definirVolumeDoAmbiente, tocarAmbiente, volumeDoAmbiente } from '../../musica';

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;
type GiftKind = 'pessoa' | 'foto' | 'colecao' | 'memoria' | 'historia' | 'estatistica';
interface GiftItem { id: string; kind: GiftKind; title: string; detail: string; image?: string; personId?: string; icon: Icon; date?: string }
interface ChainNode { id: string; kind: string; title: string; detail: string; image?: string; personId?: string; icon: Icon }

const ambientOptions = [
  { id: 'chuva', label: 'Chuva', detail: 'uma janela calma', icon: CloudRain, color: '#7b9bcc' },
  { id: 'cafe', label: 'Café', detail: 'mesa de domingo', icon: Coffee, color: '#c79570' },
  { id: 'oceano', label: 'Oceano', detail: 'ritmo de maré', icon: Waves, color: '#62b5b4' },
  { id: 'cidade', label: 'Cidade', detail: 'luzes ao longe', icon: Moon, color: '#a98bd0' },
  { id: 'lofi', label: 'Lo-fi', detail: 'foco sem pressa', icon: Music2, color: '#d083ad' },
] as const;

const yearFrom = (value?: string | null) => value ? value.slice(0, 4) : '';
const isToday = (value?: string | null) => !!value && value.slice(0, 10) === today();
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const coverOf = (person: Person) => person.fotos.find(photo => photo.isMain) || person.fotos[0];

function hashDay(value: string) {
  return [...value].reduce((total, letter) => (total * 31 + letter.charCodeAt(0)) >>> 0, 7);
}

export default function Momentos() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [chainStep, setChainStep] = useState(0);
  const [selectedYear, setSelectedYear] = useState('');
  const [ambient, setAmbient] = useState<string | null>(null);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(data.settings.sounds !== false);

  const people = useMemo(() => data.people.filter(isActive), [data.people]);
  const photos = useMemo(() => getAllPhotos(data), [data]);
  const photoPeople = useMemo(() => new Map(people.map(person => [person.id, person])), [people]);
  const giftPool = useMemo<GiftItem[]>(() => {
    const peopleGifts = people.map(person => {
      const cover = coverOf(person);
      return { id: `pessoa:${person.id}`, kind: 'pessoa' as const, title: person.nome, detail: person.localizacaoMora || 'Uma ficha para revisitar', image: cover?.url, personId: person.id, icon: UserRound, date: person.createdAt };
    });
    const photoGifts = photos.map(photo => {
      const owner = photo.personId ? photoPeople.get(photo.personId) : undefined;
      return { id: `foto:${photo.id}`, kind: 'foto' as const, title: photo.name || 'Uma foto guardada', detail: owner ? `Uma lembrança de ${owner.nome}` : 'Uma foto sem associação', image: photo.url, personId: owner?.id, icon: Camera, date: photo.capturedAt || photo.createdAt };
    });
    const collectionGifts = data.collections.map(collection => ({ id: `colecao:${collection.id}`, kind: 'colecao' as const, title: collection.name, detail: `${collection.personIds.length} ${collection.personIds.length === 1 ? 'pessoa' : 'pessoas'} reunidas`, personId: collection.personIds[0], icon: Layers, date: undefined }));
    const memoryGifts = data.memories.map(memory => ({ id: `memoria:${memory.id}`, kind: 'memoria' as const, title: memory.title, detail: memory.content || 'Uma memória que merece espaço', personId: memory.personId || undefined, icon: Sparkles, date: memory.date || memory.createdAt }));
    const storyGifts = data.stories.map(story => ({ id: `historia:${story.id}`, kind: 'historia' as const, title: story.titulo, detail: 'Uma história para continuar quando quiser', personId: story.personId || undefined, icon: Film, date: story.date }));
    const statGift: GiftItem = { id: 'estatistica:catalogo', kind: 'estatistica', title: `${people.length} conexões no seu universo`, detail: `${photos.length} fotos e ${data.folders.length} pastas esperando uma próxima descoberta`, icon: Sparkles };
    return [...peopleGifts, ...photoGifts, ...collectionGifts, ...memoryGifts, ...storyGifts, statGift];
  }, [people, photos, photoPeople, data.collections, data.memories, data.stories, data.folders.length]);

  const gift = giftPool.length ? giftPool[hashDay(today()) % giftPool.length] : null;
  const todayStats = useMemo(() => ({
    photos: photos.filter(photo => isToday(photo.createdAt) || isToday(photo.capturedAt)).length,
    people: people.filter(person => isToday(person.createdAt)).length,
    videos: people.reduce((total, person) => total + (person.attachments || []).filter(item => item.kind === 'video' && isToday(item.createdAt)).length, 0),
    notes: data.generalNotes.filter(note => isToday(note.createdAt) || isToday(note.updatedAt)).length + data.journal.filter(entry => isToday(entry.createdAt) || entry.date === today()).length,
  }), [photos, people, data.generalNotes, data.journal]);

  const years = useMemo(() => {
    const values = new Set<string>();
    people.forEach(person => { const year = yearFrom(person.createdAt); if (year) values.add(year); });
    photos.forEach(photo => { const year = yearFrom(photo.capturedAt || photo.createdAt); if (year) values.add(year); });
    data.stories.forEach(story => { const year = yearFrom(story.date); if (year) values.add(year); });
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [people, photos, data.stories]);
  const activeYear = selectedYear || years[0] || today().slice(0, 4);

  const timelineItems = useMemo(() => {
    const personItems = people.filter(person => yearFrom(person.createdAt) === activeYear).map(person => ({ id: `person:${person.id}`, title: person.nome, detail: 'Pessoa adicionada', date: person.createdAt, image: coverOf(person)?.url, personId: person.id, icon: UserRound }));
    const photoItems = photos.filter(photo => yearFrom(photo.capturedAt || photo.createdAt) === activeYear).map(photo => ({ id: `photo:${photo.id}`, title: photo.name || 'Foto da galeria', detail: photo.personId ? `Ligada a ${photoPeople.get(photo.personId)?.nome || 'uma pessoa'}` : 'Foto sem associação', date: photo.capturedAt || photo.createdAt || '', image: photo.url, personId: photo.personId || undefined, icon: Camera }));
    const storyItems = data.stories.filter(story => yearFrom(story.date) === activeYear).map(story => ({ id: `story:${story.id}`, title: story.titulo, detail: 'História registrada', date: story.date, image: undefined, personId: story.personId || undefined, icon: Film }));
    return [...personItems, ...photoItems, ...storyItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [people, photos, photoPeople, data.stories, activeYear]);

  const chain = useMemo<ChainNode[]>(() => {
    const person = people[chainStep % Math.max(1, people.length)];
    const personPhoto = person ? coverOf(person) : photos[chainStep % Math.max(1, photos.length)];
    const collection = data.collections[chainStep % Math.max(1, data.collections.length)];
    const relation = person?.vinculos?.[0];
    const related = relation ? people.find(candidate => candidate.id === relation.personId) : people[(chainStep + 1) % Math.max(1, people.length)];
    const memory = data.memories[chainStep % Math.max(1, data.memories.length)];
    const nodes: ChainNode[] = [
      person ? { id: `person:${person.id}`, kind: 'Pessoa', title: person.nome, detail: person.localizacaoMora || 'Uma ficha do seu catálogo', image: coverOf(person)?.url, personId: person.id, icon: UserRound } : { id: 'person:empty', kind: 'Pessoa', title: 'Adicione uma pessoa', detail: 'O caminho começa por uma ficha', icon: UserRound },
      personPhoto ? { id: `photo:${personPhoto.id}`, kind: 'Foto', title: personPhoto.name || 'Um detalhe guardado', detail: person ? `Um registro de ${person.nome}` : 'Uma imagem da sua galeria', image: personPhoto.url, personId: personPhoto.personId || person?.id, icon: Camera } : { id: 'photo:empty', kind: 'Foto', title: 'Uma foto por descobrir', detail: 'Sua galeria ainda está esperando a primeira imagem', icon: Camera },
      collection ? { id: `collection:${collection.id}`, kind: 'Coleção', title: collection.name, detail: `${collection.personIds.length} pessoas conectadas`, personId: collection.personIds[0], icon: Layers } : { id: 'collection:empty', kind: 'Coleção', title: 'Crie uma coleção', detail: 'Agrupe o que combina para criar novas pontes', icon: Layers },
      related ? { id: `relation:${related.id}`, kind: 'Relação', title: related.nome, detail: relation ? `Relacionada como ${relation.papel}` : 'Outra ficha próxima no catálogo', image: coverOf(related)?.url, personId: related.id, icon: Link2 } : { id: 'relation:empty', kind: 'Relação', title: 'Uma próxima conexão', detail: 'Cadastre mais pessoas para formar relações', icon: Link2 },
      memory ? { id: `memory:${memory.id}`, kind: 'Memória', title: memory.title, detail: memory.content || 'Algo que vale lembrar', personId: memory.personId || undefined, icon: Sparkles } : { id: 'memory:empty', kind: 'Memória', title: 'Uma memória para criar', detail: 'Notas e histórias dão profundidade ao catálogo', icon: Sparkles },
    ];
    return nodes;
  }, [people, photos, data.collections, data.memories, chainStep]);

  // Clima salvo de outra visita: aparece como escolhido e começa no primeiro
  // toque da página — som sem gesto o navegador bloqueia, e forçar seria pior.
  useEffect(() => {
    const salvo = data.settings.ambienteAtivo || '';
    if (!ehClimaDoAmbiente(salvo) || data.settings.sounds === false) return;
    setAmbient(salvo);
    definirVolumeDoAmbiente(data.settings.ambienteVolume ?? volumeDoAmbiente());
    tocarAmbiente(salvo);
    // Só na entrada da tela: o som é do site, não desta renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playDiscovery = () => {
    setChainStep(step => step + 1);
    if (soundOn) ctx.sound('swoosh');
  };
  const openPersonFor = (personId?: string) => { if (personId) ctx.openPerson(personId); };
  const openGift = () => {
    if (!gift) return;
    if (gift.personId) ctx.openPerson(gift.personId);
    else if (gift.kind === 'foto') ctx.navigate('gallery');
    else if (gift.kind === 'colecao') ctx.navigate('folders');
    else if (gift.kind === 'historia') ctx.navigate('stories');
    else ctx.notify('Essa descoberta fica guardada no seu catálogo.');
  };
  const openChainNode = (node: ChainNode) => {
    if (node.personId) openPersonFor(node.personId);
    else if (node.kind === 'Foto') ctx.navigate('gallery');
    else if (node.kind === 'Coleção') ctx.navigate('folders');
    else ctx.notify('Essa conexão ainda está esperando um detalhe seu.');
  };

  return <div className="moments-page">
    <PageTitle eyebrow="Seu catálogo em movimento" title="Momentos" description="Uma forma calma de voltar ao que importa — sem obrigação de entrar todos os dias.">
      <Button onClick={() => { const proximo = !soundOn; setSoundOn(proximo); if (!proximo) { pararAmbiente(); setAmbient(null); ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: '' } }), undefined, false); } }} aria-pressed={soundOn}>{soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}Som: {soundOn ? 'ligado' : 'desligado'}</Button>
      <Button variant="primary" onClick={() => setPresentationOpen(true)} disabled={!photos.length}><CirclePlay size={17} />Modo apresentação</Button>
    </PageTitle>

    <section className="moments-hero">
      <div className="moments-hero-copy">
        <span className="moments-kicker"><Gift size={14} />Uma coisa para você descobrir</span>
        {gift ? <>
          <h2>{gift.title}</h2>
          <p>{gift.detail}</p>
          <div className="moments-hero-meta"><span><Sparkles size={13} />Escolhida a partir do seu catálogo</span>{gift.date && <span><CalendarDays size={13} />{formatDate(gift.date)}</span>}</div>
          <Button variant="primary" onClick={openGift}><Compass size={16} />Abrir descoberta <ArrowRight size={15} /></Button>
        </> : <><h2>Seu universo começa aqui.</h2><p>Adicione uma pessoa ou uma foto e o app prepara uma pequena descoberta para você.</p><Button variant="primary" onClick={() => ctx.navigate('add')}><Users size={16} />Criar primeira ficha</Button></>}
      </div>
      <div className="moments-hero-media">
        {gift?.image ? <img src={gift.image} alt="" /> : <div className="moments-hero-placeholder"><Sparkles size={42} /></div>}
        <span className="moments-hero-orb" />
        <div className="moments-hero-label"><span>presente de hoje</span><strong>{gift?.kind === 'estatistica' ? 'um olhar novo' : gift?.kind || 'começo'}</strong></div>
      </div>
    </section>

    <section className="moments-day-section">
      <SectionHeading icon={CalendarDays} title="Hoje no seu catálogo" action="Ver atividade" onAction={() => ctx.navigate('tools')} />
      <div className="moments-day-grid">
        <StatTile icon={Camera} value={todayStats.photos} label="fotos" tone="pink" />
        <StatTile icon={Video} value={todayStats.videos} label="vídeos" tone="blue" />
        <StatTile icon={UserRound} value={todayStats.people} label="pessoas adicionadas" tone="gold" />
        <StatTile icon={Image} value={todayStats.notes} label="notas" tone="green" />
      </div>
      <p className="moments-soft-note"><Sparkles size={14} />Organizar também pode ser uma forma de reencontrar.</p>
    </section>

    <div className="moments-feature-grid">
      <section className="moments-panel moments-chain-panel">
        <div className="moments-panel-heading"><div><span className="eyebrow">Toque e siga o fio</span><h2><Compass size={18} />Explorar aleatoriamente</h2></div><span className="moments-step">{String((chainStep % chain.length) + 1).padStart(2, '0')} / {String(chain.length).padStart(2, '0')}</span></div>
        <p className="moments-panel-description">Pessoa → foto → coleção → relação → memória. Cada toque puxa uma conexão real do seu catálogo.</p>
        <div className="discovery-chain" aria-label="Sequência de descoberta">{chain.map((node, index) => { const NodeIcon = node.icon; const active = index === chainStep % chain.length; return <div key={`${node.id}:${index}`} className={`chain-node-wrap ${active ? 'active' : ''}`}><button className="chain-node" onClick={() => openChainNode(node)} aria-label={`Abrir ${node.kind}: ${node.title}`}><span className="chain-node-media">{node.image ? <img src={node.image} alt="" /> : node.kind === 'Pessoa' && node.title !== 'Adicione uma pessoa' ? <span>{initials(node.title)}</span> : <NodeIcon size={17} />}</span><small>{node.kind}</small><strong>{node.title}</strong></button>{index < chain.length - 1 && <ArrowRight className="chain-arrow" size={14} />}</div>; })}</div>
        <div className="moments-panel-footer"><span><Link2 size={13} />Navegação sem fim, feita de dados seus</span><Button onClick={playDiscovery}><RotateCcw size={15} />Próxima conexão</Button></div>
      </section>

      <section className="moments-panel moments-ambient-panel">
        <div className="moments-panel-heading"><div><span className="eyebrow">Enquanto você organiza</span><h2><Headphones size={18} />Ambiente</h2></div><span className={`ambient-live ${ambient ? 'on' : ''}`}><i />{ambient ? 'ativo' : 'opcional'}</span></div>
        <p className="moments-panel-description">Escolha um clima para deixar o catálogo aberto. Sem contagem regressiva, sem pressão.</p>
        <div className="ambient-visual" style={{ '--ambient-color': ambientOptions.find(option => option.id === ambient)?.color || '#c786ec' } as CSSProperties}><div className="ambient-wave ambient-wave-a" /><div className="ambient-wave ambient-wave-b" /><span>{ambient ? ambientOptions.find(option => option.id === ambient)?.label : 'Seu ritmo'}</span></div>
        <div className="ambient-options">{ambientOptions.map(option => { const AmbientIcon = option.icon; return <button key={option.id} className={ambient === option.id ? 'active' : ''} onClick={() => {
            const desligando = ambient === option.id;
            setAmbient(desligando ? null : option.id);
            if (desligando) { pararAmbiente(); ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: '' } }), undefined, false); }
            else if (soundOn) { definirVolumeDoAmbiente(data.settings.ambienteVolume ?? 40); tocarAmbiente(option.id); ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: option.id } }), undefined, false); }
            if (soundOn) ctx.sound('success');
          }} aria-pressed={ambient === option.id}><AmbientIcon size={16} /><span>{option.label}<small>{option.detail}</small></span></button>; })}</div>
        {/* O clima não é só cor: escolhido, ele abre o player logo abaixo. */}
        {!!musicaPorId(ambient || '') && <PlayerDeMusica musica={musicaPorId(ambient || '')!} />}
      </section>
    </div>

    <section className="moments-panel moments-time-panel">
      <div className="moments-panel-heading"><div><span className="eyebrow">Volte para outro capítulo</span><h2><Timer size={18} />Máquina do tempo</h2></div><span className="moments-time-caption">{timelineItems.length} registros encontrados</span></div>
      <div className="time-years">{years.length ? years.map(year => <button key={year} className={activeYear === year ? 'active' : ''} onClick={() => setSelectedYear(year)}>{year}</button>) : <span className="muted small">Seu primeiro ano ainda está sendo escrito.</span>}</div>
      {timelineItems.length ? <div className="time-capsule"><div className="time-capsule-line" />{timelineItems.map(item => { const TimeIcon = item.icon; return <button className="time-item" key={item.id} onClick={() => openPersonFor(item.personId)}><span className="time-item-date">{formatDate(item.date)}</span><span className="time-item-media">{item.image ? <img src={item.image} alt="" /> : <TimeIcon size={16} />}</span><span className="time-item-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={15} /></button>; })}</div> : <EmptyState icon={Timer} title={`Nada registrado em ${activeYear}`} description="Escolha outro ano ou continue alimentando o seu catálogo." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />}
    </section>

    <section className="moments-bottom-grid">
      <section className="moments-panel moments-unlock-panel"><div className="moments-panel-heading"><div><span className="eyebrow">Personalização, não vantagem</span><h2><Trophy size={18} />Desbloqueáveis visuais</h2></div><Button variant="ghost" onClick={() => ctx.navigate('dashboard')}>Ver painel <ArrowRight size={14} /></Button></div><p className="moments-panel-description">Conforme o catálogo cresce, novas formas de olhar aparecem. O que muda é o clima, nunca o que você consegue acessar.</p><div className="unlock-grid">{['Tema Aurora', 'Fundo Nebulosa', 'Ícones de capítulo', 'Animação rara'].map((label, index) => { const unlocked = ctx.achievements.filter(entry => entry.unlocked).length > index + 1; return <button key={label} className={unlocked ? 'unlocked' : ''} onClick={() => ctx.notify(unlocked ? `${label} já está disponível no seu espaço.` : 'Continue organizando no seu ritmo para descobrir este visual.')}><span className="unlock-art"><Sparkles size={17} /></span><strong>{label}</strong><small>{unlocked ? 'desbloqueado' : `conquista ${index + 2}`}</small></button>; })}</div></section>
      <section className="moments-panel moments-progress-panel"><div className="moments-panel-heading"><div><span className="eyebrow">Sem streak artificial</span><h2><Star size={18} />Ritmo de descoberta</h2></div><span className="progress-xp">{ctx.xp.toLocaleString('pt-BR')} XP</span></div><p className="moments-panel-description">Cada ação que deixa seu catálogo mais vivo conta: uma foto, uma ficha, uma nota ou uma conexão.</p><div className="progress-orbit"><div className="progress-orbit-ring" style={{ '--orbit-progress': `${Math.round(ctx.level.progress * 100)}%` } as CSSProperties}><strong>N{ctx.level.level}</strong><small>{Math.round(ctx.level.progress * 100)}%</small></div><div><span>{ctx.level.title}</span><strong>{ctx.level.next.toLocaleString('pt-BR')} XP para o próximo nível</strong></div></div><Button onClick={() => ctx.navigate('dashboard')}><Sparkles size={15} />Ver meus desafios</Button></section>
    </section>

    {presentationOpen && <Presentation onClose={() => setPresentationOpen(false)} photos={photos} people={photoPeople} soundOn={soundOn} onSound={() => setSoundOn(value => !value)} />}
  </div>;
}

function StatTile({ icon: IconComponent, value, label, tone }: { icon: Icon; value: number; label: string; tone: string }) {
  return <div className={`moments-stat moments-stat-${tone}`}><span><IconComponent size={16} /></span><strong>{value}</strong><small>{label}</small></div>;
}

function Presentation({ onClose, photos, people, soundOn, onSound }: { onClose: () => void; photos: Photo[]; people: Map<string, Person>; soundOn: boolean; onSound: () => void }) {
  const ctx = useCatalog();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [track, setTrack] = useState('minimalista');
  const current = photos[index];
  const owner = current?.personId ? people.get(current.personId) : undefined;
  const tracks = [{ id: SEM_MUSICA, rotulo: 'Sem música' }, ...TRILHAS_DA_APRESENTACAO];
  const trilha = musicaPorId(track);
  const next = (direction: number) => { setIndex(value => (value + direction + photos.length) % photos.length); if (soundOn && track !== SEM_MUSICA) ctx.sound('swoosh'); };
  useEffect(() => { if (!playing || !photos.length) return; const timer = window.setInterval(() => next(1), 4300); return () => window.clearInterval(timer); }, [playing, photos.length, soundOn, track]);
  if (!current) return null;
  return <div className="presentation-overlay" role="dialog" aria-modal="true" aria-label="Modo apresentação"><div className="presentation-shell"><div className="presentation-topbar"><div><span className="eyebrow">Catálogo em reprodução</span><h2>{owner?.nome || current.name || 'Uma memória'}</h2></div><div className="presentation-top-actions"><IconButton label={soundOn ? 'Desligar som' : 'Ligar som'} onClick={onSound}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</IconButton><IconButton label="Fechar apresentação" onClick={onClose}><X size={20} /></IconButton></div></div><div className="presentation-stage"><AnimatePresence mode="wait"><motion.div className="presentation-photo" key={current.id} initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }}><img src={current.url} alt={owner ? `Foto de ${owner.nome}` : 'Foto do catálogo'} /></motion.div></AnimatePresence><button className="presentation-arrow presentation-prev" onClick={() => next(-1)} aria-label="Foto anterior"><ChevronLeft size={23} /></button><button className="presentation-arrow presentation-next" onClick={() => next(1)} aria-label="Próxima foto"><ChevronRight size={23} /></button><div className="presentation-counter">{String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</div></div><div className="presentation-controls"><button className="presentation-play" onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? 'Pausar' : 'Reproduzir'}</button><div className="presentation-tracks"><span><Music2 size={14} />Trilha</span>{tracks.map(option => <button key={option.id} className={track === option.id ? 'active' : ''} onClick={() => setTrack(option.id)}>{option.rotulo}</button>)}</div><div className="presentation-thumbs">{photos.slice(0, 8).map((photo, thumbIndex) => <button key={photo.id} className={thumbIndex === index ? 'active' : ''} onClick={() => setIndex(thumbIndex)} aria-label={`Ir para foto ${thumbIndex + 1}`}><img src={photo.url} alt="" /></button>)}</div></div>
        {trilha && <PlayerDeMusica musica={trilha} compacto className="presentation-musica" />}</div></div>;
}
