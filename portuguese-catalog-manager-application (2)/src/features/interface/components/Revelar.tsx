/**
 * Revelar: a seção que mostra o essencial e guarda o resto.
 *
 * "📸 Fotos 12 ˅" — fechada, a seção é uma linha com a contagem. Tocar abre a
 * prévia (ou o conteúdo inteiro). A pessoa decide quanto quer ver, e a ficha
 * não entrega trinta linhas de uma vez para quem só queria lembrar o nome.
 */
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Revelar({ titulo, icone: Icone, contagem, resumo, descricao, abertoInicial = false, children, previa, acao, aoAcionar, className = '' }: {
  titulo: string;
  icone?: LucideIcon;
  /** Número (ou texto curto) mostrado ao lado do título. */
  contagem?: string | number;
  /** Uma linha mostrada quando a seção está fechada. */
  resumo?: string;
  /** Texto de apoio dentro da seção aberta. */
  descricao?: string;
  abertoInicial?: boolean;
  children: ReactNode;
  /** O que aparece no lugar do conteúdo quando fechada (opcional). */
  previa?: ReactNode;
  /** Ação no canto da seção aberta ("Ver todas", "Adicionar"). */
  acao?: string;
  aoAcionar?: () => void;
  className?: string;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const id = useId();
  return <section className={`revelavel ${aberto ? 'aberto' : ''} ${className}`}>
    <button type="button" className="revelavel-cabeca" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto(!aberto)}>
      {Icone && <Icone size={17} />}
      <span className="revelavel-titulo">{titulo}</span>
      {contagem !== undefined && contagem !== '' && <span className="revelavel-contagem">{contagem}</span>}
      <ChevronDown size={17} className="revelavel-seta" aria-hidden="true" />
    </button>
    {!aberto && resumo && <p className="revelavel-resumo">{resumo}</p>}
    {!aberto && previa && <div className="revelavel-previa">{previa}</div>}
    {aberto && <div className="revelavel-corpo" id={id}>
      {descricao && <p className="revelavel-descricao">{descricao}</p>}
      {children}
      {acao && <button type="button" className="text-action revelavel-acao" onClick={aoAcionar}>{acao}</button>}
    </div>}
  </section>;
}
