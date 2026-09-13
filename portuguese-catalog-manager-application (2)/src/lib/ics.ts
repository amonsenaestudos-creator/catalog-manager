import type { AppData, Appointment } from '../types';

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, match => `\\${match}`);
const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${(time || '00:00').replace(':', '')}00`;
const plusMinutes = (date: string, time: string, minutes: number) => {
  const start = new Date(`${date}T${time || '00:00'}:00`);
  const end = new Date(start.getTime() + minutes * 60000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
};
/** Quebra linhas longas conforme a RFC 5545 (75 octetos), para calendários mais exigentes não rejeitarem o arquivo. */
const fold = (line: string) => { const parts: string[] = []; let rest = line; while (rest.length > 73) { parts.push(rest.slice(0, 73)); rest = ` ${rest.slice(73)}`; } parts.push(rest); return parts.join('\r\n'); };

/** Converte os compromissos da agenda em um arquivo .ics (Google Agenda, Outlook, iPhone). Datas ficam no fuso local do aparelho. */
export function appointmentsToIcs(items: Appointment[], data: AppData) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Catalog//Agenda//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Agenda do Catalog'];
  for (const item of items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
    const person = data.people.find(p => p.id === item.personId);
    const summary = person ? `${item.title} · com ${person.nome}` : item.title;
    const description = [item.notes, item.status === 'realizado' ? 'Encontro realizado.' : '', item.durationMinutes ? `Duração registrada: ${item.durationMinutes} min.` : ''].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${item.id}@catalog.local`, `DTSTAMP:${stamp(item.createdAt.slice(0, 10) || item.date, '00:00')}`, `DTSTART:${stamp(item.date, item.time)}`, `DTEND:${plusMinutes(item.date, item.time, item.durationMinutes || 60)}`, `SUMMARY:${escapeText(summary)}`);
    if (item.place) lines.push(`LOCATION:${escapeText(item.place)}`);
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push(`STATUS:${item.status === 'cancelado' ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
