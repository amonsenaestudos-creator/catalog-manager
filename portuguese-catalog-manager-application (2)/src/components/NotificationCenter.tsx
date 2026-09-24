import { Bell, BellOff, CalendarClock, CheckCheck, Crown, Globe, MapPin, RotateCw, Trash2, Users } from 'lucide-react';
import { useCatalog } from '../context';
import { formatDate } from '../store';
import { IconButton } from './ui';

const KIND_ICON = { lembrete: Bell, prazo: CalendarClock, revisita: MapPin, conquista: Crown, sistema: Users, mundo: Globe } as const;
const KIND_LABEL = { lembrete: 'Lembrete', prazo: 'Prazo', revisita: 'Revisitar', conquista: 'Conquista', sistema: 'Sistema', mundo: 'Mundo vivo' } as const;

/** Sino com os avisos do catálogo: prazos, encontros, aniversários e conquistas. */
export default function NotificationCenter() {
  const ctx = useCatalog(), { data } = ctx;
  const unread = data.notifications.filter(item => !item.read).length;
  return <div className="notification-anchor">
    <IconButton label={unread ? `${unread} avisos não lidos` : 'Central de avisos'} onClick={() => ctx.setNotificationsOpen(!ctx.notificationsOpen)}>
      <Bell size={17} />{unread > 0 && <span className="notification-dot">{unread > 9 ? '9+' : unread}</span>}
    </IconButton>
    {ctx.notificationsOpen && <div className="notification-panel" role="dialog" aria-label="Central de avisos">
      <header><h2>Avisos</h2><span>{unread} não lidos</span></header>
      <div className="notification-list">
        {data.notifications.map(item => { const Icon = KIND_ICON[item.kind] || Bell; return <button key={item.id} className={item.read ? 'read' : ''} onClick={() => { ctx.markNotificationRead(item.id); if (item.personId) { ctx.openPerson(item.personId); } else if (item.page) ctx.navigate(item.page); ctx.setNotificationsOpen(false); }}>
          <Icon size={16} />
          <span><strong>{item.title}</strong>{item.body && <small>{item.body}</small>}<time>{KIND_LABEL[item.kind]} · {formatDate(item.date, true)}</time></span>
          {!item.read && <i />}
        </button>; })}
        {!data.notifications.length && <p className="notification-empty"><BellOff size={22} />Nenhum aviso por enquanto. Quando um prazo estiver chegando, ele aparece aqui.</p>}
      </div>
      <footer>
        <button onClick={() => ctx.checkAlerts()}><RotateCw size={14} />Verificar agora</button>
        <span>
          <IconButton label="Marcar todos como lidos" disabled={!unread} onClick={ctx.markAllNotificationsRead}><CheckCheck size={16} /></IconButton>
          <IconButton label="Limpar avisos" disabled={!data.notifications.length} onClick={ctx.clearNotifications}><Trash2 size={16} /></IconButton>
        </span>
      </footer>
    </div>}
  </div>;
}
