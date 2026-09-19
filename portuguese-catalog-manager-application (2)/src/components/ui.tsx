import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, FolderOpen, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { getMainPhoto, getTagColor } from '../store';

let openModalCount = 0;
let originalOverflow = '';

export function Button({ children, variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children?: ReactNode }) {
  return <button type="button" className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" className="icon-btn" title={label} aria-label={label} {...props}>{children}</button>;
}
export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
export function PageTitle({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="page-title"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</header>;
}
export function SectionHeading({ icon: Icon, title, action, onAction }: { icon?: LucideIcon; title: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><h2>{Icon && <Icon size={19} />}{title}</h2>{action && <button className="text-action" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
}
export function Avatar({ person, src, name, size = 44, className = '' }: { person?: Person; src?: string; name?: string; size?: number; className?: string }) {
  const source = src || (person ? getMainPhoto(person)?.url : '');
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  const label = name || person?.nome || 'Pessoa';
  return <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: Math.max(14, size * 0.3) }}>{source && !failed ? <img src={source} alt={label} onError={() => setFailed(true)} draggable={false} loading="lazy" decoding="async" /> : <span>{label.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()}</span>}</span>;
}
export function PhotoView({ person, src, alt, className = '' }: { person?: Person; src?: string; alt?: string; className?: string }) {
  const source = src || (person ? getMainPhoto(person)?.url : ''); const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return source && !failed ? <img className={`person-photo ${className}`} src={source} alt={alt || person?.nome || 'Foto do catálogo'} onError={() => setFailed(true)} draggable={false} loading="lazy" decoding="async" /> : <div className={`photo-placeholder ${className}`}><span>{(person?.nome || '?').split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()}</span><small>Sem foto</small></div>;
}
export function Tag({ name }: { name: string }) { const { data } = useCatalog(); const color = getTagColor(name, data); return <span className="tag" style={{ color, backgroundColor: `${color}15` }}>{name}</span>; }
export function EmptyState({ icon: Icon = FolderOpen, title, description, action, onAction }: { icon?: LucideIcon; title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><Icon size={35} strokeWidth={1.3} /><h3>{title}</h3>{description && <p>{description}</p>}{action && <Button variant="primary" onClick={onAction}>{action}<ArrowRight size={16} /></Button>}</div>;
}
export function Modal({ title, description, children, onClose, wide = false, footer, className = '' }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean; footer?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null), id = useId(), reduced = useReducedMotion();
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (openModalCount === 0) originalOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';
    // no aparelho a doca flutua justo onde a folha encosta: enquanto há modal, ela recolhe
    if (openModalCount === 1) document.documentElement.classList.add('modal-aberto');
    const timer = window.setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>('.modal-body input:not([type=hidden]):not([type=file]):not([type=checkbox]), .modal-body textarea')
        || ref.current?.querySelector<HTMLElement>('.modal-body select, .modal-body button')
        || ref.current;
      first?.focus();
    }, 30);
    const key = (event: KeyboardEvent) => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      if (dialogs[dialogs.length - 1] !== ref.current || document.documentElement.classList.contains('privacy-active')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type=hidden]), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') || [])].filter(el => el.getClientRects().length);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      clearTimeout(timer);
      openModalCount = Math.max(0, openModalCount - 1);
      if (!openModalCount) {
        document.body.style.overflow = originalOverflow;
        document.documentElement.classList.remove('modal-aberto');
      }
      document.removeEventListener('keydown', key, true);
      previous?.focus?.();
    };
  }, []);
  return createPortal(<motion.div className="modal-overlay private-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''} ${className}`} initial={reduced ? false : { y: 14, scale: 0.985 }} animate={{ y: 0, scale: 1 }} transition={{ duration: 0.2 }}><div className="modal-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><IconButton label="Fechar" onClick={onClose}><X size={20} /></IconButton></div><div className="modal-body">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}</motion.div></motion.div>, document.body);
}
export function Confirm({ title, description, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }: { title: string; description: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}><p className="confirm-description">{description}</p></Modal>;
}
export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <label className="check-label"><input type="checkbox" checked={checked} onChange={onChange} /><span>{label}</span></label>;
}
export function Toast() { const { notice, dismissNotice } = useCatalog(); if (!notice) return null; return createPortal(<motion.div role={notice.error ? 'alert' : 'status'} className={`toast ${notice.error ? 'toast-error' : ''}`} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><Check size={18} /><span>{notice.message}</span><IconButton label="Fechar aviso" onClick={dismissNotice}><X size={16} /></IconButton></motion.div>, document.body); }
export function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) { return <details className="disclosure" open={defaultOpen || undefined}><summary>{title}<ChevronDown size={17} /></summary><div className="disclosure-content">{children}</div></details>; }