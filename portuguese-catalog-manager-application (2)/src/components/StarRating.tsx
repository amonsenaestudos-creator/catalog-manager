import { Star } from 'lucide-react';
import { formatNumber } from '../store';

export default function StarRating({ value, onChange, size = 18, readonly = false, showValue = true, label = 'Avaliação' }: { value: number; onChange?: (v: number) => void; size?: number; readonly?: boolean; showValue?: boolean; label?: string }) {
  const rating = Math.max(0, Math.min(5, value || 0));
  return <span className={`star-rating ${readonly ? '' : 'star-rating-editable'}`}>
    <span className="star-track" role={readonly ? 'img' : undefined} aria-label={readonly ? `${label}: ${formatNumber(rating)} de 5` : undefined}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className="rating-star" style={{ width: size, height: size }}><Star size={size} fill="currentColor" strokeWidth={0} /><span className="star-fill" style={{ width: `${Math.min(1, Math.max(0, rating - i)) * 100}%` }}><Star size={size} fill="currentColor" strokeWidth={0} /></span>{!readonly && <><button type="button" className="star-half left-half" aria-label={`${label}: ${formatNumber(i + 0.5)} estrelas`} title={`${formatNumber(i + 0.5)} estrelas`} onClick={() => onChange?.(i + 0.5)} /><button type="button" className="star-half right-half" aria-label={`${label}: ${i + 1} estrelas`} title={`${i + 1} estrelas`} onClick={() => onChange?.(i + 1)} /></>}</span>)}
    </span>{showValue && <span className="rating-value">{formatNumber(rating)}</span>}{!readonly && <button type="button" className="rating-reset" title="Limpar avaliação" aria-label={`Limpar ${label.toLowerCase()}`} onClick={() => onChange?.(0)}>Limpar</button>}
  </span>;
}