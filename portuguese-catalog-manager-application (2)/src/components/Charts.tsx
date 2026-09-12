import { useId } from 'react';
import { PALETTE } from '../store';

/** Gráficos em SVG puro, sem dependências extras e prontos para o tema claro/escuro. */

export function Donut({ slices, size = 168, thickness = 22, centerLabel, centerValue }: { slices: { label: string; value: number }[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string | number }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <div className="donut-wrap">
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={centerLabel || 'Gráfico de pizza'}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="donut-track" strokeWidth={thickness} />
      {total > 0 && slices.filter(slice => slice.value > 0).map((slice, index) => {
        const length = slice.value / total * circumference;
        const dash = `${length} ${circumference - length}`;
        const element = <circle key={slice.label} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={PALETTE[index % PALETTE.length]} strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        offset += length;
        return element;
      })}
      {centerValue !== undefined && <text x="50%" y="47%" textAnchor="middle" className="donut-value">{centerValue}</text>}
      {centerLabel && <text x="50%" y="60%" textAnchor="middle" className="donut-label">{centerLabel}</text>}
    </svg>
    <ul className="donut-legend">{slices.filter(slice => slice.value > 0).map((slice, index) => <li key={slice.label}><i style={{ background: PALETTE[index % PALETTE.length] }} /><span>{slice.label}</span><b>{slice.value}</b></li>)}</ul>
  </div>;
}

export function BarList({ items, max, suffix = '' }: { items: { label: string; value: number; hint?: string }[]; max?: number; suffix?: string }) {
  const peak = max || Math.max(1, ...items.map(item => item.value));
  return <div className="bar-list">{items.map(item => <div className="bar-row" key={item.label}>
    <div className="bar-head"><span>{item.label}</span><b>{item.value.toLocaleString('pt-BR')}{suffix}</b></div>
    <i><b style={{ width: `${Math.max(2, item.value / peak * 100)}%` }} /></i>
    {item.hint && <small>{item.hint}</small>}
  </div>)}{!items.length && <p className="form-help">Sem dados suficientes ainda.</p>}</div>;
}

export function Radar({ axes, series, size = 230 }: { axes: string[]; series: { name: string; values: number[]; color?: string }[]; size?: number }) {
  const gradientId = useId();
  const center = size / 2, radius = size / 2 - 34, max = 5;
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, axes.length) - Math.PI / 2;
    const distance = Math.max(0, Math.min(max, value)) / max * radius;
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as const;
  };
  return <svg viewBox={`0 0 ${size} ${size}`} width="100%" className="radar-chart" role="img" aria-label="Gráfico de radar dos critérios">
    <defs><radialGradient id={gradientId}><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" /></radialGradient></defs>
    {[1, 0.75, 0.5, 0.25].map(step => <polygon key={step} points={axes.map((_, index) => point(index, max * step).join(',')).join(' ')} fill="none" className="radar-ring" />)}
    {axes.map((axis, index) => {
      const [x, y] = point(index, max);
      const [lx, ly] = point(index, max * 1.19);
      return <g key={axis}>
        <line x1={center} y1={center} x2={x} y2={y} className="radar-ring" />
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="radar-label">{axis}</text>
      </g>;
    })}
    {series.map((entry, seriesIndex) => {
      const points = entry.values.map((value, index) => point(index, value).join(',')).join(' ');
      return <g key={entry.name}>
        <polygon points={points} fill={seriesIndex === 0 ? `url(#${gradientId})` : 'none'} stroke={entry.color || (seriesIndex === 0 ? 'var(--accent)' : PALETTE[3])} strokeWidth="2" />
        {entry.values.map((value, index) => { const [x, y] = point(index, value); return <circle key={index} cx={x} cy={y} r="2.6" fill={entry.color || (seriesIndex === 0 ? 'var(--accent)' : PALETTE[3])} />; })}
      </g>;
    })}
  </svg>;
}

export function Sparkline({ values, height = 46, color }: { values: number[]; height?: number; color?: string }) {
  const width = 220, max = Math.max(1, ...values), min = Math.min(0, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const y = (value: number) => height - ((value - min) / Math.max(0.001, max - min)) * (height - 8) - 4;
  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${index * step},${y(value)}`).join(' ');
  return <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img" aria-label="Evolução das notas">
    <path d={`${line} L${width},${height} L0,${height} Z`} fill="var(--accent)" opacity="0.12" />
    <path d={line} fill="none" stroke={color || 'var(--accent)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    {values.map((value, index) => <circle key={index} cx={index * step} cy={y(value)} r="2" fill={color || 'var(--accent)'} />)}
  </svg>;
}

export function ProgressRing({ value, size = 74, label }: { value: number; size?: number; label?: string }) {
  const thickness = 8, radius = (size - thickness) / 2, circumference = 2 * Math.PI * radius;
  return <div className="progress-ring" style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} className="donut-track" fill="none" stroke="currentColor" strokeWidth={thickness} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--accent)" strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(1, value)) * circumference} ${circumference}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <span>{label}</span>
  </div>;
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon?: React.ComponentType<{ size?: number }> }) {
  return <div className="stat-card">{Icon && <Icon size={17} />}<div><strong>{value}</strong><span>{label}</span>{hint && <small>{hint}</small>}</div></div>;
}
