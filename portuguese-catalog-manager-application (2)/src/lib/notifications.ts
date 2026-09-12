import type { AppData, AppNotification } from '../types';
import { DEADLINE_LABELS, deadlineState, daysUntil, formatDate, generateId, isActive, today, upcomingBirthday } from '../store';

export interface Alert extends Omit<AppNotification, 'read' | 'date'> { date?: string }

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try { return await window.Notification.requestPermission(); } catch { return 'denied'; }
}

export function pushBrowserNotification(title: string, body: string) {
  if (notificationPermission() !== 'granted') return false;
  try { new window.Notification(title, { body, tag: `catalog-${title}`, silent: false }); return true; } catch { return false; }
}

/** Tudo o que merece um aviso: prazos, encontros, aniversários e conexões esquecidas. */
export function collectAlerts(data: AppData): Alert[] {
  const lead = data.settings.notificationLeadDays ?? 3;
  const revisitAfter = data.settings.revisitAfterDays ?? 14;
  const alerts: Alert[] = [];
  const name = (id: string | null) => data.people.find(person => person.id === id)?.nome;

  for (const reminder of data.reminders) {
    if (reminder.concluido) continue;
    const { state, days } = deadlineState(reminder.data, lead);
    if (state === 'futuro' || state === 'sem-data') continue;
    const owner = name(reminder.personId);
    alerts.push({
      id: `lembrete:${reminder.id}`, kind: state === 'atrasado' ? 'prazo' : 'lembrete',
      title: `${DEADLINE_LABELS[state]}: ${reminder.titulo}`,
      body: `${owner ? `${owner} · ` : ''}${formatDate(reminder.data)}${days !== null && days > 1 ? ` · faltam ${days} dias` : ''}${reminder.priority === 'alta' ? ' · prioridade alta' : ''}`,
      personId: reminder.personId, page: 'reminders',
    });
  }

  for (const appointment of data.appointments) {
    if (appointment.status !== 'agendado') continue;
    const { state, days } = deadlineState(appointment.date, lead);
    if (state === 'futuro' || state === 'sem-data') continue;
    const owner = name(appointment.personId);
    alerts.push({
      id: `agenda:${appointment.id}`, kind: 'prazo',
      title: `${DEADLINE_LABELS[state]}: ${appointment.title}`,
      body: `${owner ? `Com ${owner} · ` : ''}${formatDate(appointment.date)} às ${appointment.time}${appointment.place ? ` · ${appointment.place}` : ''}${days !== null && days > 1 ? ` · em ${days} dias` : ''}`,
      personId: appointment.personId, page: 'agenda',
    });
  }

  for (const goal of data.goals) {
    if (goal.done || !goal.due) continue;
    const { state } = deadlineState(goal.due, lead);
    if (state === 'futuro' || state === 'sem-data') continue;
    alerts.push({ id: `meta:${goal.id}`, kind: 'prazo', title: `${DEADLINE_LABELS[state]}: ${goal.title}`, body: 'Uma meta sua está no prazo.', personId: goal.personId, page: 'myspace' });
  }

  for (const person of data.people.filter(isActive)) {
    const birthdayIn = upcomingBirthday(person.aniversario);
    if (birthdayIn !== null && birthdayIn <= 7) {
      alerts.push({
        id: `aniversario:${person.id}:${today().slice(0, 7)}`, kind: 'lembrete',
        title: birthdayIn === 0 ? `Hoje é o aniversário de ${person.nome}` : `Aniversário de ${person.nome} em ${birthdayIn} dia(s)`,
        body: formatDate(person.aniversario), personId: person.id, page: 'catalog',
      });
    }
  }

  if (data.settings.revisitAfterDays) {
    for (const person of data.people.filter(isActive).slice(0, 400)) {
      const last = person.ultimoVisto ? daysUntil(person.ultimoVisto) : null;
      const missing = last === null ? null : Math.abs(last);
      if (person.ultimoVisto && missing !== null && missing >= revisitAfter) {
        alerts.push({
          id: `revisita:${person.id}`, kind: 'revisita',
          title: `Você não vê ${person.nome} há ${missing} dias`,
          body: `Que tal retomar o contato? (limite: ${revisitAfter} dias)`, personId: person.id, page: 'catalog',
        });
      }
    }
  }

  const trashDays = data.settings.trashAutoCleanDays || 0;
  if (trashDays > 0) {
    const expiring = data.people.filter(person => {
      if (!person.deletedAt) return false;
      const days = daysUntil(person.deletedAt.slice(0, 10));
      return days !== null && -days >= trashDays - 3;
    });
    if (expiring.length) alerts.push({ id: 'lixeira:auto', kind: 'sistema', title: `${expiring.length} ficha(s) perto da limpeza da lixeira`, body: `A limpeza automática acontece após ${trashDays} dias. Restaure o que quiser manter.`, page: 'catalog' });
  }

  return alerts.sort((a, b) => (a.kind === 'prazo' ? -1 : 1) - (b.kind === 'prazo' ? -1 : 1));
}

/**
 * Transforma os avisos pendentes em notificações gravadas, sem repetir o mesmo
 * alerta no mesmo dia. Retorna apenas o que é novo.
 */
export function newNotifications(data: AppData): { items: AppNotification[]; keys: Record<string, string> } {
  const stamp = today();
  const items: AppNotification[] = [];
  const keys: Record<string, string> = {};
  for (const alert of collectAlerts(data)) {
    if (data.progress.notified[alert.id] === stamp) continue;
    if (data.notifications.some(item => item.id === alert.id && !item.read)) { keys[alert.id] = stamp; continue; }
    items.push({ id: alert.id, title: alert.title, body: alert.body, kind: alert.kind, personId: alert.personId ?? null, page: alert.page, date: new Date().toISOString(), read: false });
    keys[alert.id] = stamp;
  }
  return { items, keys };
}

export function unreadCount(data: AppData) {
  return data.notifications.filter(item => !item.read).length;
}

export const notificationId = () => generateId();
