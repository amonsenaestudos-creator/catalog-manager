/**
 * Barra de ação contextual.
 *
 * A interface muda conforme o contexto: aqui ficam as duas a três ações mais
 * prováveis daquele momento, e todo o resto entra no "⋯" ao lado. Nada de
 * parede de botões com o mesmo peso: a primeira ação é a primária (a que
 * alguém faria agora), as outras são secundárias, e as ferramentas esperam.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui';
import { MenuMais } from './MenuMais';
import type { PlanoDeAcoes } from '../acoes';

export function BarraDeAcoes({ plano, aoEscolher, iconeDe, sufixoDe, className = '', rotuloDeMais = 'Mais ações', titulo = 'Mais ações', subtitulo, lado = 'direita' }: {
  plano: PlanoDeAcoes;
  aoEscolher: (id: string) => void;
  iconeDe: (id: string) => LucideIcon | undefined;
  /** Conteúdo extra dentro de um botão — contador, selo. */
  sufixoDe?: (id: string) => ReactNode;
  className?: string;
  rotuloDeMais?: string;
  titulo?: string;
  subtitulo?: string;
  lado?: 'direita' | 'esquerda';
}) {
  return <div className={`barra-de-acoes ${className}`}>
    {plano.primarias.map((acao, indice) => {
      const Icone = iconeDe(acao.id);
      return <Button key={acao.id} variant={indice === 0 ? 'primary' : 'secondary'} onClick={() => aoEscolher(acao.id)}>
        {Icone && <Icone size={16} />}
        {acao.rotulo}
        {sufixoDe?.(acao.id)}
      </Button>;
    })}
    {plano.grupos.length > 0 && <MenuMais
      grupos={plano.grupos.map(grupo => ({ id: grupo.id, rotulo: grupo.rotulo, acoes: grupo.acoes.map(acao => ({ id: acao.id, rotulo: acao.rotulo, detalhe: acao.detalhe, perigo: acao.perigo })) }))}
      aoEscolher={aoEscolher}
      iconeDe={iconeDe}
      rotulo={rotuloDeMais}
      titulo={titulo}
      subtitulo={subtitulo}
      lado={lado}
    />}
  </div>;
}
