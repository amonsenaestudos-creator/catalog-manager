import type { AppData, Person } from '../types';
import { ALTURA_OPTIONS } from '../types';
import { faixaDaAltura, lerAltura } from '../features/corpo/altura';
import {
  addDays, ageFromBirthday, calculateOverallRating, daysSince, getAllPhotos, getFinalScore,
  isActive, monthLabel, rarityFor, RATING_FIELDS, today,
} from '../store';

export interface Slice { label: string; value: number; count?: number; avg?: number }

const active = (data: AppData) => data.people.filter(isActive);

export function catalogSummary(data: AppData) {
  const people = active(data);
  const rated = people.filter(p => calculateOverallRating(p.rating) > 0);
  const ages = people.map(p => p.idade ?? ageFromBirthday(p.aniversario)).filter((v): v is number => typeof v === 'number' && v > 0);
  const heights = people.map(p => p.altura).filter(Boolean);
  const heightTally = heights.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }), {});
  const topHeight = Object.entries(heightTally).sort((a, b) => b[1] - a[1])[0];
  const interactions = people.reduce((sum, p) => sum + p.viHojeCount, 0);
  const completenessAvg = people.length ? Math.round(people.reduce((sum, p) => sum + (p.fotos.length ? 25 : 0) + (p.descricao.trim() ? 25 : 0) + (p.localizacaoOnde ? 25 : 0) + (p.tags.length ? 25 : 0), 0) / people.length) : 0;
  return {
    people: people.length,
    rated: rated.length,
    favorites: people.filter(p => p.favorite).length,
    archived: data.people.filter(p => p.archivedAt && !p.deletedAt).length,
    trash: data.people.filter(p => p.deletedAt).length,
    photos: getAllPhotos(data).length,
    photoFavorites: getAllPhotos(data).filter(photo => photo.favorite).length,
    stories: data.stories.length,
    folders: data.folders.length,
    albums: data.albums.length,
    notes: data.generalNotes.length + data.people.reduce((sum, p) => sum + p.notas.length, 0),
    reminders: data.reminders.length,
    pendingReminders: data.reminders.filter(r => !r.concluido).length,
    appointments: data.appointments.filter(a => a.status === 'agendado').length,
    interactions,
    averageRating: rated.length ? rated.reduce((sum, p) => sum + calculateOverallRating(p.rating), 0) / rated.length : 0,
    averageAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length * 10) / 10 : 0,
    topHeight: topHeight ? { label: topHeight[0], count: topHeight[1] } : null,
    completenessAvg,
    rarity: ['comum', 'raro', 'epico', 'lendario'].map(value => ({ value, count: people.filter(p => rarityFor(calculateOverallRating(p.rating)) === value).length })),
  };
}

export function categoryBreakdown(data: AppData): Slice[] {
  const people = active(data);
  const groups = new Map<string, Person[]>();
  for (const person of people) {
    const label = data.categories.find(c => c.value === person.localizacaoOnde)?.label || 'Sem categoria';
    groups.set(label, [...(groups.get(label) || []), person]);
  }
  return [...groups.entries()].map(([label, list]) => {
    const rated = list.filter(p => calculateOverallRating(p.rating) > 0);
    return {
      label, value: list.length, count: list.length,
      avg: rated.length ? rated.reduce((sum, p) => sum + calculateOverallRating(p.rating), 0) / rated.length : 0,
    };
  }).sort((a, b) => b.value - a.value);
}

export function ratingBands(data: AppData): Slice[] {
  const people = active(data).filter(p => calculateOverallRating(p.rating) > 0);
  const bands = [
    { label: '0 – 1', min: 0, max: 1 }, { label: '1 – 2', min: 1, max: 2 }, { label: '2 – 3', min: 2, max: 3 },
    { label: '3 – 4', min: 3, max: 4 }, { label: '4 – 5', min: 4, max: 5.01 },
  ];
  return bands.map(band => ({ label: band.label, value: people.filter(p => { const score = calculateOverallRating(p.rating); return score >= band.min && score < band.max; }).length }));
}

export function ageBands(data: AppData): Slice[] {
  const people = active(data);
  const age = (p: Person) => p.idade ?? ageFromBirthday(p.aniversario) ?? -1;
  const bands = [{ label: '< 18', min: 0, max: 18 }, { label: '18-24', min: 18, max: 25 }, { label: '25-30', min: 25, max: 31 }, { label: '31-40', min: 31, max: 41 }, { label: '40+', min: 41, max: 200 }];
  return bands.map(band => ({ label: band.label, value: people.filter(p => { const value = age(p); return value >= band.min && value < band.max; }).length }));
}

/**
 * Alturas: medidas entram em faixas de 10 cm ("1,70–1,79 m") e as palavras
 * antigas continuam com o próprio nome — um gráfico só, entendendo os dois
 * jeitos de preencher. As faixas vêm ordenadas; as palavras, por frequência.
 */
export function heightDistribution(data: AppData): Slice[] {
  const people = active(data);
  const medidas = new Map<string, number>();
  const palavras: Slice[] = [];
  for (const option of ALTURA_OPTIONS) {
    const quantas = people.filter(p => p.altura === option).length;
    if (quantas > 0) palavras.push({ label: option, value: quantas });
  }
  for (const person of people) {
    const lida = lerAltura(person.altura);
    if (!lida || lida.tipo !== 'medida') continue;
    const faixa = faixaDaAltura(lida.metros);
    medidas.set(faixa, (medidas.get(faixa) || 0) + 1);
  }
  return [...medidas.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    .concat(palavras.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR')));
}

export function monthlyActivity(data: AppData, months = 6) {
  const list: { month: string; label: string; added: number; interactions: number }[] = [];
  const base = new Date(`${today()}T12:00:00`);
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().slice(0, 10);
    const start = date.toISOString().slice(0, 10);
    list.push({
      month: key, label: monthLabel(key),
      added: data.people.filter(p => p.createdAt >= start && p.createdAt < next).length,
      interactions: data.people.filter(p => !p.deletedAt).flatMap(p => p.viHojeDates).filter(day => day >= start && day < next).length,
    });
  }
  return list;
}

export function monthlyReport(data: AppData) {
  const activity = monthlyActivity(data, 2);
  const current = activity[activity.length - 1], previous = activity[activity.length - 2];
  const start = `${current.month}-01`;
  const stories = data.stories.filter(story => story.date >= start).length;
  const notes = data.generalNotes.filter(note => note.createdAt.slice(0, 10) >= start).length;
  const photos = getAllPhotos(data).filter(photo => (photo.createdAt || '').slice(0, 10) >= start).length;
  const goals = data.goals.filter(goal => goal.doneAt && goal.doneAt.slice(0, 10) >= start).length;
  const growth = previous && previous.added ? Math.round((current.added - previous.added) / previous.added * 100) : 0;
  return { month: current.label, added: current.added, interactions: current.interactions, stories, notes, photos, goals, growth };
}

export function categoryBattle(data: AppData) {
  return categoryBreakdown(data)
    .filter(slice => (slice.avg || 0) > 0 && (slice.count || 0) > 0)
    .map(slice => ({ label: slice.label, avg: slice.avg || 0, count: slice.count || 0 }))
    .sort((a, b) => b.avg - a.avg);
}

export function championOfMonth(data: AppData) {
  const people = active(data).filter(p => getFinalScore(p) > 0);
  const byScore = [...people].sort((a, b) => getFinalScore(b) - getFinalScore(a))[0] || null;
  const month = today().slice(0, 7);
  const byInteractions = [...people]
    .map(p => ({ person: p, count: p.viHojeDates.filter(day => day.startsWith(month)).length }))
    .sort((a, b) => b.count - a.count)[0];
  return { top: byScore, mostSeen: byInteractions && byInteractions.count > 0 ? byInteractions : null };
}

export function radarFor(person: Person) {
  return RATING_FIELDS.map(field => ({ label: field.label, value: person.rating[field.key] || 0, weight: field.weight }));
}

export function averageRadar(data: AppData) {
  const people = active(data).filter(p => calculateOverallRating(p.rating) > 0);
  return RATING_FIELDS.map(field => ({
    label: field.label,
    value: people.length ? people.reduce((sum, p) => sum + (p.rating[field.key] || 0), 0) / people.length : 0,
  }));
}

export function geoGroups(data: AppData) {
  const groups = new Map<string, { count: number; people: Person[] }>();
  for (const person of active(data)) {
    const key = (person.localizacaoMora || '').trim();
    if (!key) continue;
    const entry = groups.get(key) || { count: 0, people: [] };
    entry.count += 1; entry.people.push(person);
    groups.set(key, entry);
  }
  return [...groups.entries()]
    .map(([place, entry]) => {
      const rated = entry.people.filter(p => calculateOverallRating(p.rating) > 0);
      return { place, count: entry.count, avg: rated.length ? rated.reduce((sum, p) => sum + calculateOverallRating(p.rating), 0) / rated.length : 0, people: entry.people };
    })
    .sort((a, b) => b.count - a.count);
}

export function duelRanking(data: AppData) {
  const wins = new Map<string, number>();
  for (const duel of data.progress.duels) wins.set(duel.winnerId, (wins.get(duel.winnerId) || 0) + 1);
  return [...wins.entries()]
    .map(([id, count]) => ({ person: data.people.find(p => p.id === id), wins: count }))
    .filter(entry => entry.person)
    .sort((a, b) => b.wins - a.wins);
}

export function peopleToRevisit(data: AppData, afterDays = 14) {
  return active(data)
    .map(person => ({ person, days: daysSince(person.ultimoVisto) }))
    .filter(entry => entry.days === null || entry.days >= afterDays)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));
}

export function ratingTrend(data: AppData) {
  const start = addDays(today(), -90);
  const points = data.people.filter(p => !p.deletedAt).flatMap(p => p.ratingHistory || [])
    .filter(entry => entry.date >= start)
    .sort((a, b) => a.date.localeCompare(b.date));
  return points.slice(-40);
}

export interface TimelineEvent { id: string; date: string; kind: 'cadastro' | 'foto' | 'interacao' | 'nota' | 'historia' | 'lembrete' | 'encontro' | 'conversa' | 'meta' | 'nota-geral' | 'duelo'; title: string; detail?: string }

/** Linha do tempo de uma pessoa: tudo o que aconteceu com ela, do cadastro à última conversa, em ordem cronológica inversa. */
export function personTimeline(person: Person, data: AppData): TimelineEvent[] {
  const events: TimelineEvent[] = [{ id: `cadastro:${person.id}`, date: person.createdAt, kind: 'cadastro', title: 'Ficha criada' }];
  for (const photo of person.fotos) if (photo.createdAt) events.push({ id: `foto:${photo.id}`, date: photo.createdAt, kind: 'foto', title: photo.isMain ? 'Foto principal adicionada' : 'Foto adicionada', detail: photo.name });
  const seen = new Map<string, number>();
  for (const day of person.viHojeDates) seen.set(day, (seen.get(day) || 0) + 1);
  for (const [day, count] of seen) events.push({ id: `visto:${day}`, date: day, kind: 'interacao', title: count > 1 ? `${count} interações registradas` : 'Interação registrada' });
  for (const note of person.notas) events.push({ id: `nota:${note.id}`, date: note.date, kind: 'nota', title: note.title || 'Nota', detail: note.content.slice(0, 120) });
  for (const story of data.stories.filter(item => item.personId === person.id)) events.push({ id: `historia:${story.id}`, date: story.date, kind: 'historia', title: `História: ${story.titulo}` });
  for (const reminder of data.reminders.filter(item => item.personId === person.id)) events.push({ id: `lembrete:${reminder.id}`, date: reminder.data, kind: 'lembrete', title: `${reminder.concluido ? 'Lembrete concluído' : 'Lembrete'}: ${reminder.titulo}` });
  for (const appointment of data.appointments.filter(item => item.personId === person.id)) events.push({ id: `encontro:${appointment.id}`, date: appointment.date, kind: 'encontro', title: `${appointment.status === 'realizado' ? 'Encontro realizado' : appointment.status === 'cancelado' ? 'Encontro cancelado' : 'Encontro marcado'}: ${appointment.title}`, detail: [appointment.time, appointment.place, appointment.durationMinutes ? `${appointment.durationMinutes} min` : ''].filter(Boolean).join(' · ') });
  for (const conversation of data.conversations.filter(item => item.personId === person.id)) events.push({ id: `conversa:${conversation.id}`, date: conversation.date, kind: 'conversa', title: `Conversa: ${conversation.topic}`, detail: conversation.content.slice(0, 120) });
  for (const goal of data.goals.filter(item => item.personId === person.id)) events.push({ id: `meta:${goal.id}`, date: goal.doneAt || goal.createdAt, kind: 'meta', title: `${goal.done ? 'Objetivo concluído' : 'Objetivo criado'}: ${goal.title}` });
  for (const entry of person.ratingHistory || []) events.push({ id: `nota-geral:${entry.date}:${entry.overall}`, date: entry.date, kind: 'nota-geral', title: `Nota geral: ${entry.overall.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` });
  const wins = data.progress.duels.filter(duel => duel.winnerId === person.id).length, losses = data.progress.duels.filter(duel => duel.loserId === person.id).length;
  const lastDuel = [...data.progress.duels].reverse().find(duel => duel.winnerId === person.id || duel.loserId === person.id);
  if (lastDuel) events.push({ id: `duelo:${lastDuel.id}`, date: lastDuel.date, kind: 'duelo', title: `Último duelo: ${wins} vitórias · ${losses} derrotas` });
  return events.filter(event => event.date).sort((a, b) => b.date.localeCompare(a.date));
}
