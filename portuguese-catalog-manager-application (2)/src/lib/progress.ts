import type { AppData, Person } from '../types';
import { calculateOverallRating, completeness, getAllPhotos, isActive, rarityFor, today, weekKey } from '../store';

export interface AchievementDef { id: string; title: string; description: string; icon: string; test: (data: AppData) => boolean }

const people = (data: AppData) => data.people.filter(isActive);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeira-ficha', title: 'Primeira conexão', description: 'Você cadastrou a primeira pessoa do catálogo.', icon: 'heart', test: data => people(data).length >= 1 },
  { id: 'dez-fichas', title: 'Biblioteca crescendo', description: 'Dez pessoas cadastradas.', icon: 'users', test: data => people(data).length >= 10 },
  { id: 'cinquenta-fichas', title: 'Cinquenta histórias', description: 'Cinquenta pessoas no catálogo.', icon: 'library', test: data => people(data).length >= 50 },
  { id: 'primeira-foto', title: 'Primeiro retrato', description: 'A primeira foto entrou na galeria.', icon: 'image', test: data => getAllPhotos(data).length >= 1 },
  { id: 'cem-fotos', title: 'Cem memórias', description: 'Cem fotos guardadas na galeria.', icon: 'camera', test: data => getAllPhotos(data).length >= 100 },
  { id: 'favoritos', title: 'Coração marcado', description: 'Cinco pessoas favoritas.', icon: 'star', test: data => people(data).filter(p => p.favorite).length >= 5 },
  { id: 'pastas', title: 'Tudo no lugar', description: 'Cinco pastas criadas.', icon: 'folder', test: data => data.folders.length >= 5 },
  { id: 'albuns', title: 'Álbum de momentos', description: 'Você montou o primeiro álbum de fotos.', icon: 'album', test: data => data.albums.length >= 1 },
  { id: 'historias', title: 'Contadora de histórias', description: 'Cinco histórias ou fanfics escritas.', icon: 'book', test: data => data.stories.length >= 5 },
  { id: 'capitulos', title: 'Em capítulos', description: 'Uma história dividida em três capítulos ou mais.', icon: 'list', test: data => data.stories.some(story => (story.chapters || []).length >= 3) },
  { id: 'lembretes', title: 'Nada esquecido', description: 'Cinco lembretes concluídos.', icon: 'bell', test: data => data.reminders.filter(r => r.concluido).length >= 5 },
  { id: 'diario', title: 'Páginas pessoais', description: 'Sete entradas no seu espaço pessoal.', icon: 'pen', test: data => data.journal.length >= 7 },
  { id: 'metas', title: 'Foco no objetivo', description: 'Cinco metas concluídas.', icon: 'target', test: data => data.goals.filter(goal => goal.done).length >= 5 },
  { id: 'duelos', title: 'Duelo de titãs', description: 'Dez comparações no modo This or That.', icon: 'swords', test: data => data.progress.duels.length >= 10 },
  { id: 'swipe', title: 'Olho clínico', description: 'Vinte e cinco cartões avaliados no modo swipe.', icon: 'shuffle', test: data => Object.keys(data.progress.swipes).length >= 25 },
  { id: 'streak-7', title: 'Semana completa', description: 'Sete dias seguidos usando o catálogo.', icon: 'flame', test: data => data.progress.streak.count >= 7 },
  { id: 'nota-maxima', title: 'Nota máxima', description: 'Uma ficha chegou a 5,0 estrelas.', icon: 'trophy', test: data => people(data).some(p => calculateOverallRating(p.rating) >= 5) },
  { id: 'lendario', title: 'Carta lendária', description: 'Uma ficha atingiu a raridade Lendário.', icon: 'crown', test: data => people(data).some(p => rarityFor(calculateOverallRating(p.rating)) === 'lendario') },
  { id: 'fichas-completas', title: 'Capricho nos detalhes', description: 'Cinco fichas com todos os campos principais preenchidos.', icon: 'check', test: data => people(data).filter(p => completeness(p).percent === 100).length >= 5 },
  { id: 'agenda', title: 'Encontros marcados', description: 'Três compromissos registrados na agenda.', icon: 'calendar', test: data => data.appointments.length >= 3 },
  { id: 'conversas', title: 'Boa de papo', description: 'Dez assuntos anotados no histórico de conversas.', icon: 'chat', test: data => data.conversations.length >= 10 },
  { id: 'mapa', title: 'Bairro a bairro', description: 'Pessoas registradas em cinco localizações diferentes.', icon: 'map', test: data => new Set(people(data).map(p => p.localizacaoMora).filter(Boolean)).size >= 5 },
];

export function evaluateAchievements(data: AppData) {
  return ACHIEVEMENTS.map(def => ({
    def,
    unlockedAt: data.progress.achievements[def.id] || null,
    unlocked: !!data.progress.achievements[def.id] || def.test(data),
    isNew: !data.progress.achievements[def.id] && def.test(data),
  }));
}

export function computeXp(data: AppData) {
  const photos = getAllPhotos(data).length;
  const done = data.reminders.filter(r => r.concluido).length;
  const completeCards = people(data).filter(p => completeness(p).percent === 100).length;
  const achievements = Object.keys(data.progress.achievements).length;
  return Math.round(
    people(data).length * 20 +
    photos * 6 +
    data.stories.length * 25 +
    (data.journal.length * 15) +
    done * 12 +
    data.goals.filter(goal => goal.done).length * 18 +
    data.progress.duels.length * 4 +
    Object.keys(data.progress.swipes).length * 2 +
    data.folders.length * 8 +
    data.albums.length * 10 +
    completeCards * 15 +
    achievements * 40 +
    data.progress.streak.count * 5,
  );
}

export function levelInfo(xp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1);
  const floor = 60 * (level - 1) ** 2;
  const ceiling = 60 * level ** 2;
  const titles = ['Aprendiz de catálogo', 'Colecionador', 'Arquivista', 'Curador', 'Bibliotecário', 'Guardião de histórias', 'Lenda do catálogo'];
  return { level, xp, floor, ceiling, progress: Math.max(0, Math.min(1, (xp - floor) / Math.max(1, ceiling - floor))), next: ceiling - xp, title: titles[Math.min(titles.length - 1, Math.floor((level - 1) / 2))] };
}

export interface Challenge { id: string; title: string; target: number; progress: number }

export function weeklyChallenges(data: AppData): { week: string; challenges: Challenge[] } {
  const week = weekKey();
  const weekStart = startOfWeek();
  const added = data.people.filter(p => p.createdAt >= weekStart).length;
  const photos = getAllPhotos(data).filter(photo => (photo.createdAt || '') >= weekStart).length;
  const journal = data.journal.filter(entry => entry.date >= weekStart.slice(0, 10)).length;
  const duels = data.progress.duels.filter(duel => duel.date >= weekStart.slice(0, 10)).length;
  const doneReminders = data.reminders.filter(r => r.concluido && r.createdAt >= weekStart).length;
  const completedThisWeek = people(data).filter(p => completeness(p).percent === 100 && (p.updatedAt || p.createdAt) >= weekStart).length;
  return {
    week,
    challenges: [
      { id: 'adicionar-2', title: 'Cadastre 2 novas pessoas', target: 2, progress: Math.min(2, added) },
      { id: 'fotos-5', title: 'Adicione 5 fotos à galeria', target: 5, progress: Math.min(5, photos) },
      { id: 'diario-1', title: 'Escreva 1 página no seu espaço', target: 1, progress: Math.min(1, journal) },
      { id: 'duelos-3', title: 'Faça 3 duelos no This or That', target: 3, progress: Math.min(3, duels) },
      { id: 'lembretes-2', title: 'Conclua 2 lembretes', target: 2, progress: Math.min(2, doneReminders) },
      { id: 'completar-3', title: 'Deixe 3 fichas 100% completas', target: 3, progress: Math.min(3, completedThisWeek) },
    ],
  };
}

function startOfWeek() {
  const date = new Date(`${today()}T12:00:00`);
  const shift = (date.getDay() || 7) - 1;
  date.setDate(date.getDate() - shift);
  return date.toISOString();
}

export function streakInfo(data: AppData) {
  const { streak } = data.progress;
  return { count: streak.count, last: streak.last, nextMilestone: [3, 7, 14, 30, 60].find(value => value > streak.count) || 100 };
}

export function rarityOf(person: Person) {
  return rarityFor(calculateOverallRating(person.rating));
}
