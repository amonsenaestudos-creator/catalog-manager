import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Gamepad2, Grid2X2, Image, MapPin, Package, RotateCcw, Search, Sparkles, Star, Target, Trophy, Users, X, Zap } from 'lucide-react';
import { useCatalog } from '../../../context';
import { calculateOverallRating, downloadBlob, formatDate, getAllPhotos, isActive, locationLabel, today } from '../../../store';
import type { AppData, Collection, Person, Photo } from '../../../types';
import { Button, EmptyState, PageTitle } from '../../../components/ui';
import { weeklyChallenges } from '../../../lib/progress';

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;
type GameMode = 'quiz' | 'detetive' | 'puzzle' | 'quem';
interface QuizOption { id: string; label: string }
interface QuizQuestion { id: string; eyebrow: string; prompt: string; hint: string; options: QuizOption[]; answer: string; reveal: string }
interface DetectiveCase { number: string; culprit: Person; title: string; intro: string; clues: string[]; options: Person[] }

const CARD_COLORS = ['#bb72cf', '#d47b9e', '#5f9dbc', '#b98b53', '#718f82', '#7b73b4'];
const firstName = (person: Person) => person.nome.split(/\s+/)[0];
const coverOf = (person: Person) => person.fotos.find(photo => photo.isMain) || person.fotos[0];
const deterministicPeople = (people: Person[], salt: string) => [...people].sort((a, b) => `${salt}:${a.id}`.localeCompare(`${salt}:${b.id}`));
const escapeXml = (value: string) => value.replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));

function choices(answer: Person, people: Person[], salt: string) {
  const others = deterministicPeople(people.filter(person => person.id !== answer.id), salt).slice(0, 3);
  return [answer, ...others].map(person => ({ id: person.id, label: person.nome }));
}

function makeQuestions(people: Person[], photos: Photo[], collections: Collection[], salt: string): QuizQuestion[] {
  if (!people.length) return [];
  const questions: QuizQuestion[] = [];
  const oldest = [...people].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const mostPhotos = [...people].sort((a, b) => b.fotos.length - a.fotos.length || a.nome.localeCompare(b.nome, 'pt-BR'))[0];
  questions.push({ id: 'primeiro', eyebrow: 'Origens', prompt: 'Quem foi adicionado primeiro?', hint: 'Pense na data de criação das fichas.', options: choices(oldest, people, `${salt}:first`), answer: oldest.id, reveal: `${oldest.nome} abriu o seu catálogo em ${formatDate(oldest.createdAt)}.` });
  questions.push({ id: 'fotos', eyebrow: 'Galeria', prompt: 'Quem tem mais fotos guardadas?', hint: 'A resposta está na quantidade de fotos de cada ficha.', options: choices(mostPhotos, people, `${salt}:photos`), answer: mostPhotos.id, reveal: `${mostPhotos.nome} aparece em ${mostPhotos.fotos.length} ${mostPhotos.fotos.length === 1 ? 'foto' : 'fotos'}.` });

  const collection = collections.find(item => item.personIds.some(id => people.some(person => person.id === id)));
  const collectionPerson = collection ? people.find(person => collection.personIds.includes(person.id)) : undefined;
  if (collection && collectionPerson) questions.push({ id: `colecao:${collection.id}`, eyebrow: 'Coleções', prompt: `Qual destas pessoas pertence à coleção “${collection.name}”?`, hint: 'Você pode conferir em Pastas e coleções.', options: choices(collectionPerson, people, `${salt}:collection`), answer: collectionPerson.id, reveal: `${collectionPerson.nome} está em “${collection.name}”.` });

  const withConnection = people.find(person => person.vinculos?.some(link => people.some(other => other.id === link.personId)));
  const connected = withConnection?.vinculos?.map(link => people.find(person => person.id === link.personId)).find(Boolean);
  if (withConnection && connected) questions.push({ id: `relacao:${withConnection.id}`, eyebrow: 'Conexões', prompt: `Quem está relacionado a ${firstName(withConnection)}?`, hint: 'Abra uma ficha e procure a trilha de relações.', options: choices(connected, people, `${salt}:relation`), answer: connected.id, reveal: `${connected.nome} aparece como uma conexão de ${withConnection.nome}.` });

  const mostConnected = [...people].sort((a, b) => (b.vinculos?.length || 0) - (a.vinculos?.length || 0))[0];
  questions.push({ id: 'conexoes', eyebrow: 'Mapa', prompt: 'Qual perfil tem mais conexões registradas?', hint: 'Relações também contam uma história.', options: choices(mostConnected, people, `${salt}:links`), answer: mostConnected.id, reveal: `${mostConnected.nome} tem ${mostConnected.vinculos?.length || 0} conexões registradas.` });
  const freshest = [...people].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))[0];
  questions.push({ id: 'atualizado', eyebrow: 'Ritmo', prompt: 'Qual ficha recebeu uma atualização mais recente?', hint: 'Vale a última alteração, não só a data de cadastro.', options: choices(freshest, people, `${salt}:updated`), answer: freshest.id, reveal: `${freshest.nome} foi atualizado em ${formatDate(freshest.updatedAt || freshest.createdAt)}.` });
  if (photos.length) {
    const linked = photos.find(photo => photo.personId && people.some(person => person.id === photo.personId));
    const owner = linked ? people.find(person => person.id === linked.personId) : undefined;
    if (owner) questions.push({ id: 'foto-pessoa', eyebrow: 'Memória', prompt: 'A qual pessoa pertence esta foto?', hint: linked?.name || 'Uma foto da sua galeria.', options: choices(owner, people, `${salt}:photo-owner`), answer: owner.id, reveal: `Era uma foto de ${owner.nome}.` });
  }
  return questions.slice(0, 8);
}

function QuizMode({ questions }: { questions: QuizQuestion[] }) {
  const ctx = useCatalog();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const current = questions[index];
  const answer = (id: string) => { if (!selected) { setSelected(id); if (id === current.answer) setScore(value => value + 1); } };
  const next = () => {
    if (!selected) return;
    if (index === questions.length - 1) { const total = score + (selected === current.answer ? 1 : 0); setFinished(true); ctx.addXp(Math.max(8, total * 6), `Quiz concluído: ${total}/${questions.length}.`); return; }
    setIndex(value => value + 1); setSelected(null);
  };
  if (finished) return <div className="game-result"><span className="game-result-icon"><Trophy size={28} /></span><p className="eyebrow">Quiz encerrado</p><h2>{score}/{questions.length}</h2><strong>{score === questions.length ? 'Conhecedor absoluto do catálogo' : score >= questions.length * .7 ? 'Conhecedor do catálogo' : 'Curioso em treinamento'}</strong><p>Você navegou pelas próprias histórias e ganhou {Math.max(8, score * 6)} XP. Que tal tentar de novo depois de organizar mais uma ficha?</p><div><Button onClick={() => { setIndex(0); setSelected(null); setScore(0); setFinished(false); }}><RotateCcw size={15} />Jogar novamente</Button><Button variant="primary" onClick={() => ctx.navigate('moments')}><Sparkles size={15} />Continuar explorando</Button></div></div>;
  return <div className="quiz-layout"><div className="game-progress-line"><span><Gamepad2 size={14} />Pergunta {index + 1} de {questions.length}</span><strong>{score} acertos</strong><i><b style={{ width: `${(index / questions.length) * 100}%` }} /></i></div><div className="quiz-question"><p className="eyebrow">{current.eyebrow}</p><h2>{current.prompt}</h2><p>{current.hint}</p><div className="quiz-options">{current.options.map((option, optionIndex) => <button key={option.id} className={selected ? option.id === current.answer ? 'correct' : option.id === selected ? 'wrong' : '' : ''} onClick={() => answer(option.id)} disabled={!!selected}><span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option.label}</strong>{selected && option.id === current.answer && <Check size={16} />}{selected && option.id === selected && option.id !== current.answer && <X size={16} />}</button>)}</div>{selected && <div className={`quiz-feedback ${selected === current.answer ? 'correct' : 'wrong'}`}><span>{selected === current.answer ? 'Acertou.' : 'Quase.'}</span>{current.reveal}</div>}<div className="quiz-actions"><span>{selected ? 'Sua resposta foi registrada.' : 'Escolha uma opção para continuar.'}</span><Button variant="primary" disabled={!selected} onClick={next}>{index === questions.length - 1 ? 'Ver resultado' : 'Próxima'}<ArrowRight size={15} /></Button></div></div></div>;
}

function DetectiveMode({ people, collections }: { people: Person[]; collections: Collection[] }) {
  const ctx = useCatalog();
  const [picked, setPicked] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const caseData = useMemo<DetectiveCase | null>(() => {
    if (!people.length) return null;
    const collection = collections.find(item => item.personIds.some(id => people.some(person => person.id === id)));
    const candidate = people.find(person => (person.fotos.length >= 3 && (person.vinculos?.length || 0) > 0 && (!collection || collection.personIds.includes(person.id)))) || [...people].sort((a, b) => b.fotos.length - a.fotos.length)[0];
    const related = candidate.vinculos?.map(link => people.find(person => person.id === link.personId)).find(Boolean);
    const location = candidate.localizacaoMora || locationLabel(candidate, ctx.data, false);
    const clues = [
      collection && collection.personIds.includes(candidate.id) ? `Pertence à coleção “${collection.name}”.` : location ? `Foi registrada em ${location}.` : 'Tem uma ficha com detalhes para investigar.',
      `${candidate.fotos.length} ${candidate.fotos.length === 1 ? 'foto guardada' : 'fotos guardadas'}.`,
      related ? `Possui uma relação com ${related.nome}.` : `${candidate.vinculos?.length || 0} conexões aparecem na ficha.`,
    ];
    return { number: `#${String((Date.now() % 997) + 1).padStart(3, '0')}`, culprit: candidate, title: 'A ficha que reúne as pistas', intro: 'Encontre a pessoa certa navegando pelo catálogo. A resposta não está escondida: você só precisa conectar os sinais.', clues, options: [candidate, ...deterministicPeople(people.filter(person => person.id !== candidate.id), 'case').slice(0, 3)] };
  }, [people, collections, ctx.data]);
  if (!caseData) return <EmptyState icon={Search} title="O caso precisa de algumas fichas" description="Adicione pessoas ao catálogo para receber uma missão de investigação." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />;
  const check = (id: string) => { if (picked || solved) return; setPicked(id); if (id === caseData.culprit.id) { setSolved(true); ctx.addXp(20, 'Caso do Modo Detetive resolvido.'); } };
  return <div className="detective-layout"><div className="detective-case-head"><span className="detective-stamp">CASO {caseData.number}</span><div><p className="eyebrow">Modo Detetive</p><h2>{caseData.title}</h2><p>{caseData.intro}</p></div></div><div className="detective-clues">{caseData.clues.map((clue, index) => <div key={clue}><span>{String(index + 1).padStart(2, '0')}</span><p>{clue}</p></div>)}</div><div className="detective-answer-head"><span><Target size={15} />Quem é?</span><small>{solved ? 'Caso encerrado' : 'Selecione uma ficha'}</small></div><div className="detective-options">{caseData.options.map(person => <button key={person.id} className={solved && person.id === caseData.culprit.id ? 'correct' : picked === person.id && person.id !== caseData.culprit.id ? 'wrong' : ''} onClick={() => check(person.id)}><span className="detective-photo">{coverOf(person) ? <img src={coverOf(person)!.url} alt="" /> : <span>{person.nome.slice(0, 2).toUpperCase()}</span>}</span><strong>{person.nome}</strong>{solved && person.id === caseData.culprit.id && <Check size={15} />}</button>)}</div>{solved && <div className="detective-solved"><Sparkles size={18} /><div><strong>Caso resolvido: era {caseData.culprit.nome}.</strong><p>Você encontrou a ficha usando dados reais do catálogo. +20 XP.</p></div></div>}{picked && !solved && <p className="game-wrong-note">Essa pista não fecha. Revise as conexões e tente outra ficha.</p>}</div>;
}

function PhotoPuzzle({ photos, people }: { photos: Photo[]; people: Map<string, Person> }) {
  const ctx = useCatalog();
  const playable = useMemo(() => photos.filter(photo => photo.personId && people.has(photo.personId)), [photos, people]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const photo = playable[index % Math.max(1, playable.length)];
  const owner = photo ? people.get(photo.personId!) : undefined;
  const options = useMemo(() => owner ? choices(owner, [...people.values()], `puzzle:${photo.id}`) : [], [owner, people, photo]);
  if (!photo || !owner) return <EmptyState icon={Image} title="A galeria ainda não tem um quebra-cabeça" description="Associe fotos a pessoas para descobrir de quem são as imagens." action="Abrir galeria" onAction={() => ctx.navigate('gallery')} />;
  const next = () => { setIndex(value => value + 1); setPicked(null); };
  const solved = picked === owner.id;
  return <div className="puzzle-layout"><div className={`puzzle-stage ${solved ? 'revealed' : ''}`}><img src={photo.url} alt={solved ? `Foto de ${owner.nome}` : 'Foto parcialmente revelada'} /><span className="puzzle-overlay">{solved ? 'Era ' + owner.nome : 'Quem é?'}</span></div><div className="puzzle-copy"><p className="eyebrow">Quebra-cabeça de fotos</p><h2>Uma imagem, uma memória.</h2><p>Olhe com calma para a foto e escolha a ficha que combina. A imagem completa aparece depois da resposta.</p><div className="puzzle-options">{options.map(option => <button key={option.id} className={picked ? option.id === owner.id ? 'correct' : option.id === picked ? 'wrong' : '' : ''} onClick={() => !picked && setPicked(option.id)} disabled={!!picked}><span>{option.label}</span>{picked && option.id === owner.id && <Check size={15} />}</button>)}</div>{picked && <div className={`quiz-feedback ${solved ? 'correct' : 'wrong'}`}>{solved ? `Acertou: era ${owner.nome}.` : 'Não foi desta vez. A resposta certa está destacada.'}</div>}<div className="quiz-actions"><span>{index + 1} de {playable.length} fotos</span>{picked && <Button variant="primary" onClick={next}>Próxima foto <ArrowRight size={15} /></Button>}</div></div></div>;
}

function WhoIsIt({ people, data }: { people: Person[]; data: AppData }) {
  const ctx = useCatalog();
  const [index, setIndex] = useState(0);
  const [clues, setClues] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const person = people[index % Math.max(1, people.length)];
  if (!person) return <EmptyState icon={CircleHelp} title="Quem é? precisa de algumas pessoas" description="Cadastre fichas para liberar as pistas progressivas." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />;
  const connectionCount = person.vinculos?.length || 0;
  const allClues = [
    { label: 'Contexto', value: locationLabel(person, data, false) || 'Ainda sem contexto' },
    { label: 'Galeria', value: `${person.fotos.length} ${person.fotos.length === 1 ? 'foto' : 'fotos'}` },
    { label: 'Conexões', value: `${connectionCount} ${connectionCount === 1 ? 'conexão' : 'conexões'}` },
    { label: 'Tags', value: person.tags.slice(0, 2).join(' · ') || 'Nenhuma tag registrada' },
  ];
  const options = choices(person, people, `who:${person.id}`);
  const next = () => { setIndex(value => value + 1); setClues(1); setPicked(null); };
  return <div className="who-layout"><div className="who-mystery"><span className="who-question">?</span><p className="eyebrow">Quem é essa pessoa?</p><h2>{picked ? person.nome : '????'}</h2><p>Tente adivinhar antes da última pista. O catálogo vai revelando o perfil aos poucos.</p><div className="who-clues">{allClues.map((clue, clueIndex) => <div key={clue.label} className={clueIndex < clues ? 'visible' : ''}><span>{clueIndex < clues ? <Check size={13} /> : '···'}</span><small>{clue.label}</small><strong>{clueIndex < clues ? clue.value : 'Pista bloqueada'}</strong></div>)}</div><div className="who-actions">{clues < allClues.length && !picked && <Button onClick={() => setClues(value => value + 1)}><Sparkles size={15} />Revelar pista</Button>}{picked && <Button variant="primary" onClick={next}>Outra pessoa <ArrowRight size={15} /></Button>}</div></div><div className="who-guess"><p className="eyebrow">Seu palpite</p><h3>Quem está por trás das pistas?</h3><div className="who-options">{options.map(option => <button key={option.id} className={picked ? option.id === person.id ? 'correct' : option.id === picked ? 'wrong' : '' : ''} onClick={() => !picked && setPicked(option.id)} disabled={!!picked}><span>{option.label}</span>{picked && option.id === person.id && <Check size={15} />}</button>)}</div>{picked && <div className={`quiz-feedback ${picked === person.id ? 'correct' : 'wrong'}`}>{picked === person.id ? 'Você reconheceu a ficha.' : `Era ${person.nome}. Agora você já pode seguir o fio.`}</div>}</div></div>;
}

function WeeklyObjectives({ data }: { data: AppData }) {
  const { week, challenges } = weeklyChallenges(data);
  const done = data.progress.challenges.week === week ? data.progress.challenges.done : [];
  return <section className="weekly-objectives"><div className="weekly-heading"><div><p className="eyebrow">Um motivo concreto para voltar</p><h2><Target size={18} />Objetivos da semana</h2></div><span>Semana {week.split('-S')[1] || '—'}</span></div><div className="weekly-list">{challenges.slice(0, 4).map(challenge => { const complete = done.includes(challenge.id) || challenge.progress >= challenge.target; return <div key={challenge.id} className={complete ? 'complete' : ''}><span className="weekly-check">{complete ? <Check size={13} /> : ''}</span><span>{challenge.title}<i><b style={{ width: `${Math.min(100, challenge.progress / challenge.target * 100)}%` }} /></i></span><small>{complete ? 'feito' : `${challenge.progress}/${challenge.target}`}</small></div>; })}</div><p className="weekly-footer"><Sparkles size={14} />Organizar, descobrir e atualizar valem mais do que simplesmente abrir o app.</p></section>;
}

function Collectibles({ people }: { people: Person[] }) {
  const ctx = useCatalog();
  const [albumPage, setAlbumPage] = useState(0);
  const [cardPersonId, setCardPersonId] = useState(people[0]?.id || '');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const pages = useMemo(() => { const chunks: Person[][] = []; for (let index = 0; index < people.length; index += 4) chunks.push(people.slice(index, index + 4)); return chunks.length ? chunks : [[]]; }, [people]);
  const selected = people.find(person => person.id === cardPersonId) || people[0];
  const saveCard = () => {
    if (!selected) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1260" viewBox="0 0 900 1260"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${cardColor}"/><stop offset="1" stop-color="#17151d"/></linearGradient></defs><rect width="900" height="1260" rx="48" fill="url(#bg)"/><text x="72" y="108" fill="#fff" font-family="Arial" font-size="30" letter-spacing="5">CATALOG / CARTA</text><text x="72" y="820" fill="#fff" font-family="Arial" font-size="70" font-weight="700">${escapeXml(selected.nome)}</text><text x="72" y="900" fill="#eadff0" font-family="Arial" font-size="34">★ ${calculateOverallRating(selected.rating).toFixed(1)} · ${selected.fotos.length} fotos · ${selected.vinculos?.length || 0} conexões</text><text x="72" y="1160" fill="#d5bddf" font-family="Arial" font-size="26">#${String(people.findIndex(person => person.id === selected.id) + 1).padStart(3, '0')}</text></svg>`;
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `carta-${selected.nome.toLowerCase().replace(/\s+/g, '-')}.svg`);
    ctx.notify('Carta visual baixada.');
  };
  return <section className="collectibles-area"><div className="collectibles-header"><div><p className="eyebrow">Seu catálogo, em outro formato</p><h2><Award size={18} />Cartas colecionáveis</h2><p>Uma leitura visual das fichas, com foto, nota, fotos e conexões. Nada além do que você já registrou.</p></div><Button onClick={() => ctx.navigate('pacotes')}><Package size={15} />Criar pacote</Button></div><div className="collectibles-grid"><div className="card-collection">{people.slice(0, 6).map((person, index) => <button key={person.id} className="mini-collectible" onClick={() => setCardPersonId(person.id)} style={{ '--card-color': CARD_COLORS[index % CARD_COLORS.length] } as CSSProperties}><span>{coverOf(person) ? <img src={coverOf(person)!.url} alt="" /> : <span>{person.nome.slice(0, 2).toUpperCase()}</span>}</span><strong>{person.nome}</strong><small>★ {calculateOverallRating(person.rating).toFixed(1)}</small></button>)}{!people.length && <EmptyState icon={Award} title="Nenhuma carta ainda" description="Suas fichas viram cartas conforme o catálogo cresce." />}</div><div className="card-editor"><div className="card-editor-heading"><span><Grid2X2 size={15} />Editor rápido</span><small>prévia</small></div>{selected ? <><div className="big-collectible" style={{ '--card-color': cardColor } as CSSProperties}><span className="big-collectible-code">CATALOG / #{String(people.findIndex(person => person.id === selected.id) + 1).padStart(3, '0')}</span>{coverOf(selected) ? <img src={coverOf(selected)!.url} alt={`Carta de ${selected.nome}`} /> : <span className="big-collectible-initials">{selected.nome.slice(0, 2).toUpperCase()}</span>}<strong>{selected.nome}</strong><small>★ {calculateOverallRating(selected.rating).toFixed(1)} · {selected.fotos.length} fotos · {selected.vinculos?.length || 0} conexões</small></div><div className="card-color-picker">{CARD_COLORS.map(color => <button key={color} style={{ background: color }} className={cardColor === color ? 'active' : ''} onClick={() => setCardColor(color)} aria-label={`Usar cor ${color}`} />)}</div><Button variant="primary" onClick={saveCard}><Download size={15} />Baixar carta</Button></> : <p className="form-help">Cadastre uma pessoa para editar sua carta.</p>}</div><div className="virtual-album"><div className="album-heading"><span><BookOpen size={15} />Álbum 2026</span><small>página {Math.min(albumPage + 1, pages.length)} / {pages.length}</small></div><AnimatePresence mode="wait"><motion.div key={albumPage} className="album-page" initial={{ opacity: 0, rotateY: -8 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 8 }} transition={{ duration: .23 }}>{pages[albumPage].map(person => <button key={person.id} onClick={() => ctx.openPerson(person)}><span>{coverOf(person) ? <img src={coverOf(person)!.url} alt="" /> : <span>{person.nome.slice(0, 2).toUpperCase()}</span>}</span><strong>{person.nome}</strong></button>)}{!pages[albumPage].length && <p>As próximas páginas serão preenchidas pelo seu catálogo.</p>}</motion.div></AnimatePresence><div className="album-controls"><button disabled={albumPage === 0} onClick={() => setAlbumPage(value => Math.max(0, value - 1))}><ChevronLeft size={15} />Anterior</button><button disabled={albumPage === pages.length - 1} onClick={() => setAlbumPage(value => Math.min(pages.length - 1, value + 1))}>Próxima<ChevronRight size={15} /></button></div></div></div></section>;
}

function HallAndPlaces({ people, data }: { people: Person[]; data: AppData }) {
  const ctx = useCatalog();
  const places = useMemo(() => { const grouped = new Map<string, Person[]>(); people.forEach(person => { const place = person.localizacaoMora || locationLabel(person, data, false) || 'Sem local'; grouped.set(place, [...(grouped.get(place) || []), person]); }); return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6); }, [people, data]);
  const fame: { label: string; person: Person | undefined; value: (person: Person) => string; icon: Icon }[] = [
    { label: 'Mais fotografada', person: [...people].sort((a, b) => b.fotos.length - a.fotos.length)[0], value: person => `${person.fotos.length} fotos`, icon: Camera },
    { label: 'Mais conexões', person: [...people].sort((a, b) => (b.vinculos?.length || 0) - (a.vinculos?.length || 0))[0], value: person => `${person.vinculos?.length || 0} conexões`, icon: Users },
    { label: 'Mais antiga', person: [...people].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0], value: person => `desde ${formatDate(person.createdAt)}`, icon: Star },
  ];
  const mural = () => { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800"><rect width="1400" height="800" fill="#17151d"/><text x="70" y="110" fill="#f5eef8" font-family="Arial" font-size="56" font-weight="700">Meu universo</text><text x="70" y="160" fill="#a59dab" font-family="Arial" font-size="24">${people.length} pessoas · ${getAllPhotos(data).length} fotos · ${data.collections.length} coleções</text>${people.slice(0, 10).map((person, index) => `<text x="${70 + (index % 2) * 620}" y="${250 + Math.floor(index / 2) * 78}" fill="#c786ec" font-family="Arial" font-size="28">${String(index + 1).padStart(2, '0')}  ${escapeXml(person.nome)}</text>`).join('')}</svg>`; downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `mural-catalog-${today()}.svg`); ctx.notify('Mural visual baixado.'); };
  return <section className="hall-place-grid"><div className="hall-panel"><div className="hall-heading"><div><p className="eyebrow">Uma nova leitura dos mesmos dados</p><h2><Trophy size={18} />Hall da fama</h2></div><span>ao vivo</span></div><div className="hall-list">{fame.map(entry => { const IconComponent = entry.icon; return <button key={entry.label} onClick={() => entry.person && ctx.openPerson(entry.person)} disabled={!entry.person}><span className="hall-icon"><IconComponent size={15} /></span><span><small>{entry.label}</small><strong>{entry.person?.nome || 'Ainda sem dados'}</strong>{entry.person && <em>{entry.value(entry.person)}</em>}</span><ChevronRight size={14} /></button>; })}</div></div><div className="places-panel"><div className="places-heading"><div><p className="eyebrow">Onde tudo aconteceu</p><h2><MapPin size={18} />Lugares e contextos</h2></div><Button variant="ghost" onClick={() => ctx.navigate('catalog')}><Search size={14} />Explorar</Button></div><div className="places-list">{places.map(([place, members]) => <button key={place} onClick={() => { ctx.setFilter({ ...ctx.filter, query: place, scope: 'active' }); ctx.navigate('catalog'); }}><span><MapPin size={13} />{place}</span><strong>{members.length}</strong><small>{members.slice(0, 2).map(person => firstName(person)).join(' · ')}</small></button>)}{!places.length && <p className="form-help">Preencha as localizações nas fichas para construir este mapa.</p>}</div></div><div className="mural-panel"><div><p className="eyebrow">Wallpaper automático</p><h2><Image size={18} />Mural do catálogo</h2><p>Um painel visual com pessoas, fotos, coleções e estatísticas para você guardar como capa.</p></div><div className="mural-preview"><span /><span /><span /><b>{people.length} conexões</b></div><Button onClick={mural}><Download size={15} />Baixar mural visual</Button></div><div className="profile-story-panel"><div className="profile-story-mark"><Sparkles size={19} /></div><div><p className="eyebrow">Meu perfil no catálogo</p><h2>O catálogo também conta a sua história.</h2><p>{people.length} pessoas cadastradas, {data.collections.length} coleções criadas e {data.activity.length} movimentos registrados no seu ritmo de organização.</p></div><Button variant="primary" onClick={() => ctx.navigate('dashboard')}>Ver meu perfil de organização <ArrowRight size={15} /></Button></div></section>;
}

export default function Desafios() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [mode, setMode] = useState<GameMode>('quiz');
  const people = useMemo(() => data.people.filter(isActive), [data.people]);
  const photos = useMemo(() => getAllPhotos(data), [data]);
  const peopleById = useMemo(() => new Map(people.map(person => [person.id, person])), [people]);
  const questions = useMemo(() => makeQuestions(people, photos, data.collections, today()), [people, photos, data.collections]);
  const tabs: { id: GameMode; label: string; icon: Icon; detail: string }[] = [
    { id: 'quiz', label: 'Modo Quiz', icon: Gamepad2, detail: `${questions.length} perguntas` },
    { id: 'detetive', label: 'Modo Detetive', icon: Search, detail: 'um caso aberto' },
    { id: 'puzzle', label: 'Fotos', icon: Image, detail: 'quem é?' },
    { id: 'quem', label: 'Quem é?', icon: CircleHelp, detail: 'pistas progressivas' },
  ];
  return <div className="challenges-page"><PageTitle eyebrow="Jogar com o próprio catálogo" title="Desafios" description="Descubra o que você já registrou. O app não inventa respostas: cada pista vem das suas fichas, fotos e relações."><Button onClick={() => ctx.navigate('moments')}><Sparkles size={16} />Momentos</Button><Button variant="primary" onClick={() => ctx.navigate('catalog')}><Users size={16} />Abrir catálogo</Button></PageTitle><div className="challenge-hero"><div><span className="challenge-hero-mark"><Zap size={18} /></span><p className="eyebrow">Uma brincadeira com propósito</p><h2>Você conhece o seu próprio universo?</h2><p>Um pouco de jogo transforma organização em curiosidade — sem placar público e sem pressão para voltar.</p></div><div className="challenge-hero-stats"><span><strong>{people.length}</strong>pessoas</span><span><strong>{photos.length}</strong>fotos</span><span><strong>{data.collections.length}</strong>coleções</span></div></div><div className="challenge-tabs">{tabs.map(tab => { const TabIcon = tab.icon; return <button key={tab.id} className={mode === tab.id ? 'active' : ''} onClick={() => setMode(tab.id)}><TabIcon size={17} /><span>{tab.label}<small>{tab.detail}</small></span>{mode === tab.id && <i />}</button>; })}</div><section className="challenge-game-panel">{mode === 'quiz' && (questions.length ? <QuizMode questions={questions} /> : <EmptyState icon={Gamepad2} title="O quiz precisa de fichas" description="Cadastre pessoas e fotos para começar a testar sua memória." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />)}{mode === 'detetive' && <DetectiveMode people={people} collections={data.collections} />}{mode === 'puzzle' && <PhotoPuzzle photos={photos} people={peopleById} />}{mode === 'quem' && <WhoIsIt people={people} data={data} />}</section><WeeklyObjectives data={data} /><Collectibles people={people} /><HallAndPlaces people={people} data={data} /></div>;
}
