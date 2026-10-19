/**
 * O palco do editor: o espaço onde a foto aparece e o dedo age.
 *
 * É a metade "tela" do editor — o topo decide e salva, o painel escolhe como, e
 * aqui só se mostra e se recebe gesto. Ficar em arquivo próprio tem um motivo
 * prático: são três sobreposições que precisam concordar no mesmo retângulo (o
 * canvas, a moldura de corte e o antes/depois), e lê-las juntas é o que impede
 * uma de crescer por cima da outra.
 *
 * Duas decisões que vivem aqui:
 *   · **O antes/depois é um `<img>`, não um segundo desenho.** Segurar mostra a
 *     foto como ela entrou; comparar não pode custar um redesenho, nem depender
 *     de canvas (funciona até onde não há canvas).
 *   · **Enquanto compara, a moldura de corte e a letra em rascunho saem da
 *     frente** — ver o original com grade por cima não é ver o original.
 */
import type { PointerEvent as EventoDePonteiro, Ref } from 'react';
import { Check, Eye } from 'lucide-react';
import { ALCAS } from '../edicao';
import type { Alca, Ponto, Retangulo, Tamanho } from '../edicao';
import type { FerramentaId } from '../ferramentas';
import type { RascunhoDeTexto } from './useGestosDoEditor';

export interface PalcoProps {
  /** O espaço disponível: `useTelaDoEditor` mede por ele. */
  palco: Ref<HTMLDivElement>;
  tela: Ref<HTMLCanvasElement>;
  campoDeTexto: Ref<HTMLInputElement>;
  url: string;
  falha: string;
  /** A imagem terminou de carregar (mesmo que não haja canvas). */
  pronta: boolean;
  /** Carregada e com o palco já medido: é quando existe foto na tela. */
  desenhada: boolean;
  semTela: boolean;
  escala: number;
  caixa: Tamanho;
  saida: Tamanho;
  cursor: string;
  ferramenta: FerramentaId;
  dica: string;
  comparando: boolean;
  aoComparar: (valor: boolean) => void;
  area: Retangulo | null;
  /** Puxar a moldura do corte: a alça (ou `mover`) e onde o dedo começou. */
  aoPuxarCorte: (alca: Alca, inicio: Ponto) => void;
  rascunho: RascunhoDeTexto | null;
  aoEscreverRascunho: (valor: string) => void;
  aoCancelarRascunho: () => void;
  confirmarTexto: () => void;
  corDaLetra: string;
  tamanhoDaLetra: number;
  aoDescer: (evento: EventoDePonteiro<HTMLCanvasElement>) => void;
  aoCorrer: (evento: EventoDePonteiro<HTMLCanvasElement>) => void;
  aoSubir: () => void;
}

export default function PalcoDeEdicao(props: PalcoProps) {
  const {
    palco, tela, campoDeTexto, url, falha, pronta, desenhada, semTela, escala, caixa, saida,
    cursor, ferramenta, dica, comparando, aoComparar, area, aoPuxarCorte, rascunho,
    aoEscreverRascunho, aoCancelarRascunho, confirmarTexto, corDaLetra, tamanhoDaLetra,
    aoDescer, aoCorrer, aoSubir,
  } = props;

  /** Segurar com o dedo ou com uma tecla; soltar de qualquer jeito desliga. */
  const segurar = (valor: boolean) => () => aoComparar(valor);
  const puxar = (alca: Alca) => (evento: EventoDePonteiro) => {
    evento.preventDefault();
    evento.stopPropagation();
    aoPuxarCorte(alca, { x: evento.clientX, y: evento.clientY });
  };

  return (
    <div className="editor-palco" ref={palco}>
      {falha && <p className="editor-falha" role="alert">{falha}</p>}
      {!falha && !pronta && <p className="editor-carregando" role="status">Abrindo a foto…</p>}

      {pronta && (
        <button type="button" className={`editor-comparar ${comparando ? 'ativa' : ''}`} aria-pressed={comparando}
          onPointerDown={segurar(true)} onPointerUp={segurar(false)} onPointerLeave={segurar(false)}
          onPointerCancel={segurar(false)} onBlur={segurar(false)}
          onKeyDown={evento => { if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); aoComparar(true); } }}
          onKeyUp={evento => { if (evento.key === 'Enter' || evento.key === ' ') aoComparar(false); }}>
          <Eye size={16} /><span>Original</span>
        </button>
      )}

      {desenhada && (
        <div className={`editor-moldura ferramenta-${ferramenta} ${comparando ? 'comparando' : ''}`} style={{ width: caixa.largura, height: caixa.altura }}>
          <canvas ref={tela} className="editor-tela" style={{ width: caixa.largura, height: caixa.altura, cursor }}
            onPointerDown={aoDescer} onPointerMove={aoCorrer} onPointerUp={aoSubir} onPointerCancel={aoSubir}
            role="img" aria-label={`Foto em edição, com ${Math.round(saida.largura)} por ${Math.round(saida.altura)} pixels`} />
          {semTela && <img className="editor-tela-fallback" src={url} alt="" draggable={false} />}
          {comparando && <>
            <img className="editor-original" src={url} alt="" draggable={false} />
            <span className="editor-original-legenda">Foto original</span>
          </>}

          {ferramenta === 'cortar' && area && (
            <div className="editor-corte">
              <div className="editor-corte-area"
                style={{ left: area.x * escala, top: area.y * escala, width: area.largura * escala, height: area.altura * escala }}
                onPointerDown={puxar('mover')}>
                <span className="editor-corte-grade" aria-hidden="true"><i /><i /><i /><i /></span>
                {ALCAS.map(alca => (
                  <button type="button" key={alca.id} className={`editor-corte-alca alca-${alca.id}`}
                    aria-label={`Redimensionar pelo ${alca.nome.toLowerCase()}`} onPointerDown={puxar(alca.id)} />
                ))}
                <span className="editor-corte-medida">{Math.round(area.largura)} × {Math.round(area.altura)}</span>
              </div>
            </div>
          )}

          {rascunho && (
            <div className="editor-texto" style={{ left: rascunho.ponto.x * escala, top: rascunho.ponto.y * escala }}>
              <input ref={campoDeTexto} value={rascunho.valor} placeholder="Escreva aqui" maxLength={120}
                style={{ fontSize: Math.max(13, tamanhoDaLetra * escala), color: corDaLetra }}
                onChange={evento => aoEscreverRascunho(evento.target.value)}
                onKeyDown={evento => {
                  if (evento.key === 'Enter') { evento.preventDefault(); confirmarTexto(); }
                  if (evento.key === 'Escape') { evento.preventDefault(); evento.stopPropagation(); aoCancelarRascunho(); }
                }}
                onBlur={() => { if (rascunho.valor.trim()) confirmarTexto(); else aoCancelarRascunho(); }} />
              <button type="button" className="editor-texto-ok" onClick={confirmarTexto} aria-label="Colocar o texto na foto"><Check size={16} /></button>
            </div>
          )}
        </div>
      )}

      {desenhada && <p className="editor-dica-da-tela">{dica}</p>}
    </div>
  );
}
