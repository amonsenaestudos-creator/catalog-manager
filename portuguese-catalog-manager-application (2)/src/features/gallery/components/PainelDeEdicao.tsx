/**
 * Painel e trilha do editor de imagens.
 *
 * O editor tem duas metades: a tela (onde o dedo age) e este painel (onde se
 * escolhe como). Cada ferramenta mostra só o que lhe diz respeito — é a mesma
 * ideia de "uma decisão por vez" da ficha: o pincel não precisa ver a proporção
 * do corte, e o corte não precisa ver a opacidade.
 *
 * Tudo aqui é controlado: o painel não guarda estado, só devolve o que mudou
 * para `EditorDeImagem`, que é quem escreve na receita (e no histórico).
 */
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import type { Ajustes, FormaTipo, FormatoDoRecorte, Geometria, Retangulo, Tamanho } from '../edicao';
import {
  BLOCOS_DO_MOSAICO, CORES_PRONTAS, FILTROS_PRONTOS, FORMAS, FORMATOS_DO_RECORTE, LIMITES_DO_AJUSTE,
  PROPORCOES, TAMANHOS_DE_SAIDA, TAMANHOS_DE_TEXTO, filtroAtivo, tamanhoDoLimite, tamanhoExportado,
} from '../edicao';
import type { FerramentaId } from '../ferramentas';
import { FERRAMENTAS } from '../ferramentas';

export interface EstadoDoPincel { cor: string; espessura: number; opacidade: number }
export interface EstadoDoTexto { tamanho: number; contorno: boolean }

/* ------------------------------------------------------------------- trilha */

export function TrilhaDeFerramentas({ ferramenta, aoEscolher }: { ferramenta: FerramentaId; aoEscolher: (id: FerramentaId) => void }) {
  return (
    <nav className="editor-trilha" aria-label="Ferramentas de edição">
      {FERRAMENTAS.map(item => {
        const Icone = item.icone;
        return (
          <button type="button" key={item.id} className={`editor-ferramenta ${ferramenta === item.id ? 'ativa' : ''}`}
            onClick={() => aoEscolher(item.id)} aria-pressed={ferramenta === item.id} title={`${item.dica} (tecla ${item.atalho.toUpperCase()})`}>
            <Icone size={19} strokeWidth={1.7} />
            <span>{item.nome}</span>
            <kbd>{item.atalho}</kbd>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------------------------------------------------------------- controles */

const numero = (valor: number) => (Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ','));

function Trilho({ rotulo, valor, minimo, maximo, passo, unidade, dica, aoMudar, neutro = 0 }: {
  rotulo: string; valor: number; minimo: number; maximo: number; passo: number;
  unidade?: string; dica?: string; neutro?: number; aoMudar: (valor: number) => void;
}) {
  return (
    <label className="editor-trilho">
      <span className="editor-trilho-nome">{rotulo}<b>{numero(valor)}{unidade}</b></span>
      <span className="editor-trilho-linha">
        <input type="range" min={minimo} max={maximo} step={passo} value={valor} aria-label={rotulo}
          onChange={evento => aoMudar(Number(evento.target.value))} />
        {valor !== neutro && (
          <button type="button" className="editor-trilho-zerar" onClick={() => aoMudar(neutro)} aria-label={`Zerar ${rotulo.toLowerCase()}`}>
            <RotateCcw size={13} />
          </button>
        )}
      </span>
      {dica && <small>{dica}</small>}
    </label>
  );
}

function Opcao({ ativa, aoEscolher, children, titulo }: { ativa: boolean; aoEscolher: () => void; children: React.ReactNode; titulo?: string }) {
  return <button type="button" className={`editor-opcao ${ativa ? 'ativa' : ''}`} onClick={aoEscolher} aria-pressed={ativa} title={titulo}>{children}</button>;
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="editor-grupo"><h3>{titulo}</h3>{children}</div>;
}

/** A cor: conta-gotas, paleta da foto, cores fixas e as últimas usadas. */
export function ControlesDeCor({ cor, aoEscolher, paleta, recentes }: {
  cor: string; aoEscolher: (cor: string) => void; paleta: string[]; recentes: string[];
}) {
  const bola = (valor: string, origem: string) => (
    <button type="button" key={`${origem}-${valor}`} className={`editor-cor-botao ${valor.toLowerCase() === cor.toLowerCase() ? 'ativa' : ''}`}
      style={{ background: valor }} onClick={() => aoEscolher(valor)}
      aria-label={`Pintar com ${valor}${origem === 'foto' ? ' (cor da foto)' : ''}`} aria-pressed={valor.toLowerCase() === cor.toLowerCase()} />
  );
  return (
    <div className="editor-cores">
      <div className="editor-cor-escolha">
        <label className="editor-cor-alvo" style={{ background: cor }}>
          <input type="color" value={/^#[\da-f]{6}$/i.test(cor) ? cor : '#ffffff'} aria-label="Escolher a cor no seletor"
            onChange={evento => aoEscolher(evento.target.value)} />
        </label>
        <input className="editor-cor-hex" value={cor} spellCheck={false} maxLength={9} aria-label="Cor em hexadecimal"
          onChange={evento => aoEscolher(evento.target.value)} />
      </div>
      {!!paleta.length && <Grupo titulo="Cores da foto"><div className="editor-cor-fileira">{paleta.map(valor => bola(valor, 'foto'))}</div></Grupo>}
      <Grupo titulo="Paleta"><div className="editor-cor-fileira">{CORES_PRONTAS.map(valor => bola(valor, 'paleta'))}</div></Grupo>
      {!!recentes.length && <Grupo titulo="Usadas há pouco"><div className="editor-cor-fileira">{recentes.map(valor => bola(valor, 'recente'))}</div></Grupo>}
    </div>
  );
}

/* ------------------------------------------------------------------- painel */

export interface PainelProps {
  ferramenta: FerramentaId;
  geometria: Geometria;
  saida: Tamanho;
  pincel: EstadoDoPincel;
  aoMudarPincel: (novo: Partial<EstadoDoPincel>) => void;
  /** A cor passa por aqui: aceita digitação pela metade antes de normalizar. */
  aoEscolherCor: (cor: string) => void;
  paleta: string[];
  recentes: string[];
  corPega: string | null;
  contaGotasNativo: boolean;
  aoUsarContaGotasNativo: () => void;
  figura: FormaTipo;
  preenchida: boolean;
  aoMudarFigura: (figura: FormaTipo) => void;
  aoMudarPreenchida: (valor: boolean) => void;
  texto: EstadoDoTexto;
  aoMudarTexto: (novo: Partial<EstadoDoTexto>) => void;
  bloco: number;
  aoMudarBloco: (bloco: number) => void;
  proporcao: string;
  aoMudarProporcao: (id: string) => void;
  /** O contorno do resultado: cantos retos, arredondados ou oval. */
  formato: FormatoDoRecorte;
  aoMudarFormato: (formato: FormatoDoRecorte) => void;
  /** Até onde o lado maior da foto salva pode ir (um id de `TAMANHOS_DE_SAIDA`). */
  limiteDeSaida: string;
  aoMudarLimite: (id: string) => void;
  area: Retangulo | null;
  aoAplicarCorte: () => void;
  aoCancelarCorte: () => void;
  aoGirar: (sentido: 1 | -1) => void;
  aoEspelhar: (eixo: 'h' | 'v') => void;
  ajustes: Ajustes;
  aoMudarAjustes: (novo: Partial<Ajustes>) => void;
  aoZerarAjustes: () => void;
  miniaturas: Record<string, string>;
  aoAplicarFiltro: (id: string) => void;
  aoApagarTudo: () => void;
  marcas: number;
  semTela: boolean;
}

const medida = ({ largura, altura }: Tamanho) => `${Math.round(largura)} × ${Math.round(altura)} px`;

export default function PainelDeEdicao(props: PainelProps) {
  const {
    ferramenta, geometria, saida, pincel, aoMudarPincel, aoEscolherCor, paleta, recentes, corPega, contaGotasNativo,
    aoUsarContaGotasNativo, figura, preenchida, aoMudarFigura, aoMudarPreenchida, texto, aoMudarTexto,
    bloco, aoMudarBloco, proporcao, aoMudarProporcao, formato, aoMudarFormato, limiteDeSaida,
    aoMudarLimite, area, aoAplicarCorte, aoCancelarCorte, aoGirar,
    aoEspelhar, ajustes, aoMudarAjustes, aoZerarAjustes, miniaturas, aoAplicarFiltro, aoApagarTudo,
    marcas, semTela,
  } = props;
  const filtro = filtroAtivo(ajustes);
  const salva = tamanhoExportado(saida, tamanhoDoLimite(limiteDeSaida));
  const cores = <ControlesDeCor cor={pincel.cor} aoEscolher={aoEscolherCor} paleta={paleta} recentes={recentes} />;

  return (
    <aside className="editor-painel" aria-label={`Ferramenta ${ferramenta}`}>
      {semTela && (
        <p className="editor-aviso" role="status">
          Este navegador não devolveu um canvas: a prévia mostra a luz por CSS e não dá para salvar a imagem.
        </p>
      )}

      {ferramenta === 'cortar' && <>
        <Grupo titulo="Proporção">
          <div className="editor-opcoes">
            {PROPORCOES.map(item => (
              <Opcao key={item.id} ativa={proporcao === item.id} aoEscolher={() => aoMudarProporcao(item.id)} titulo={item.dica}>
                {item.nome}
              </Opcao>
            ))}
          </div>
        </Grupo>
        <Grupo titulo="Contorno">
          <div className="editor-opcoes">
            {FORMATOS_DO_RECORTE.map(item => (
              <Opcao key={item.id} ativa={formato === item.id} aoEscolher={() => aoMudarFormato(item.id)} titulo={item.dica}>
                {item.nome}
              </Opcao>
            ))}
          </div>
        </Grupo>
        <Grupo titulo="Tamanho da foto salva">
          <div className="editor-opcoes">
            {TAMANHOS_DE_SAIDA.map(item => (
              <Opcao key={item.id} ativa={limiteDeSaida === item.id} aoEscolher={() => aoMudarLimite(item.id)} titulo={item.dica}>
                {item.nome}
              </Opcao>
            ))}
          </div>
        </Grupo>
        <Grupo titulo="Medidas">
          <p className="editor-leitura">
            <span>Seleção</span><strong>{area ? medida(area) : medida(saida)}</strong>
            <span>Foto atual</span><strong>{medida(saida)}</strong>
            <span>Vai salvar</span><strong>{medida(salva)}</strong>
          </p>
        </Grupo>
        <p className="editor-dica">Arraste a moldura sobre a foto, puxe os cantos para mudar o tamanho ou escolha uma proporção. A seleção nunca sai da imagem. Arredondada e Oval recortam os cantos da foto salva — onde o navegador não guarda transparência, o canto sai branco.</p>
        <div className="editor-acoes-do-painel">
          <button type="button" className="btn btn-primary" onClick={aoAplicarCorte}>Aplicar corte</button>
          <button type="button" className="btn" onClick={aoCancelarCorte}>Foto inteira</button>
        </div>
      </>}

      {ferramenta === 'girar' && <>
        <Grupo titulo="Girar">
          <div className="editor-opcoes">
            <button type="button" className="editor-botao-largo" onClick={() => aoGirar(-1)}><RotateCcw size={17} />Para a esquerda</button>
            <button type="button" className="editor-botao-largo" onClick={() => aoGirar(1)}><RotateCw size={17} />Para a direita</button>
          </div>
        </Grupo>
        <Grupo titulo="Espelhar">
          <div className="editor-opcoes">
            <button type="button" className={`editor-botao-largo ${geometria.espelharH ? 'ligado' : ''}`} onClick={() => aoEspelhar('h')}>
              <FlipHorizontal2 size={17} />Horizontal
            </button>
            <button type="button" className={`editor-botao-largo ${geometria.espelharV ? 'ligado' : ''}`} onClick={() => aoEspelhar('v')}>
              <FlipVertical2 size={17} />Vertical
            </button>
          </div>
        </Grupo>
        <p className="editor-leitura-curta">Giro acumulado: {geometria.giro}° · saída {medida(saida)}</p>
        <p className="editor-dica">O giro é em passos de 90° para a foto não perder nitidez: nenhum pixel é reamostrado de canto.</p>
      </>}

      {ferramenta === 'ajustar' && <>
        {LIMITES_DO_AJUSTE.map(item => (
          <Trilho key={item.chave} rotulo={item.nome} dica={item.dica} unidade={item.unidade}
            valor={ajustes[item.chave]} minimo={item.minimo} maximo={item.maximo} passo={item.passo}
            aoMudar={valor => aoMudarAjustes({ [item.chave]: valor } as Partial<Ajustes>)} />
        ))}
        <div className="editor-acoes-do-painel">
          <button type="button" className="btn" onClick={aoZerarAjustes}><Undo2 size={15} />Zerar a luz</button>
        </div>
      </>}

      {ferramenta === 'filtros' && <>
        <div className="editor-filtros">
          {FILTROS_PRONTOS.map(item => (
            <button type="button" key={item.id} className={`editor-filtro ${filtro === item.id ? 'ativo' : ''}`}
              onClick={() => aoAplicarFiltro(item.id)} aria-pressed={filtro === item.id} title={item.dica}>
              {miniaturas[item.id]
                ? <img src={miniaturas[item.id]} alt="" decoding="async" />
                : <span className="editor-filtro-sem" aria-hidden="true" />}
              <strong>{item.nome}</strong>
            </button>
          ))}
        </div>
        <p className="editor-dica">Um filtro é só uma receita de ajustes: depois de escolher, dá para mexer em cada controle na aba Ajustar.</p>
      </>}

      {ferramenta === 'pincel' && <>
        <Trilho rotulo="Espessura" valor={pincel.espessura} minimo={1} maximo={80} passo={1} unidade=" px"
          dica="Traço fino para detalhe, grosso para cobrir." aoMudar={espessura => aoMudarPincel({ espessura })} neutro={-1} />
        <Trilho rotulo="Opacidade" valor={Math.round(pincel.opacidade * 100)} minimo={10} maximo={100} passo={5} unidade="%"
          dica="Menos que 100% deixa a foto aparecer por baixo." aoMudar={valor => aoMudarPincel({ opacidade: valor / 100 })} neutro={-1} />
        {cores}
      </>}

      {ferramenta === 'forma' && <>
        <Grupo titulo="Figura">
          <div className="editor-opcoes">
            {FORMAS.map(item => <Opcao key={item.id} ativa={figura === item.id} aoEscolher={() => aoMudarFigura(item.id)}>{item.nome}</Opcao>)}
          </div>
        </Grupo>
        <div className="editor-linha-de-opcao">
          <label className="check-label"><input type="checkbox" checked={preenchida} onChange={() => aoMudarPreenchida(!preenchida)} />Preenchida</label>
          <span className="editor-dica-curta">Só retângulo e círculo.</span>
        </div>
        <Trilho rotulo="Espessura" valor={pincel.espessura} minimo={1} maximo={40} passo={1} unidade=" px"
          aoMudar={espessura => aoMudarPincel({ espessura })} neutro={-1} />
        {cores}
      </>}

      {ferramenta === 'texto' && <>
        <Grupo titulo="Tamanho da letra">
          <div className="editor-opcoes">
            {TAMANHOS_DE_TEXTO.map(tamanho => (
              <Opcao key={tamanho} ativa={texto.tamanho === tamanho} aoEscolher={() => aoMudarTexto({ tamanho })}>
                <span style={{ fontSize: Math.max(11, Math.min(20, tamanho / 3)) }}>{tamanho}</span>
              </Opcao>
            ))}
          </div>
        </Grupo>
        <Trilho rotulo="Tamanho" valor={texto.tamanho} minimo={12} maximo={160} passo={1} unidade=" px"
          aoMudar={tamanho => aoMudarTexto({ tamanho })} neutro={-1} />
        <div className="editor-linha-de-opcao">
          <label className="check-label"><input type="checkbox" checked={texto.contorno} onChange={() => aoMudarTexto({ contorno: !texto.contorno })} />Contorno na letra</label>
          <span className="editor-dica-curta">Ajuda a ler sobre fundo claro ou peludo.</span>
        </div>
        <p className="editor-dica">Toque na foto para abrir a caixa de texto; Enter coloca a letra, Esc cancela. Depois de pronta, arraste-a com a ferramenta Texto.</p>
        {cores}
      </>}

      {ferramenta === 'borrar' && <>
        <Grupo titulo="Tamanho do quadradinho">
          <div className="editor-opcoes">
            {BLOCOS_DO_MOSAICO.map((valor, indice) => (
              <Opcao key={valor} ativa={bloco === valor} aoEscolher={() => aoMudarBloco(valor)}>
                {['Fino', 'Médio', 'Grosso'][indice] || `${valor}px`}
              </Opcao>
            ))}
          </div>
        </Grupo>
        <p className="editor-dica">Arraste sobre o que precisa sumir — um rosto, uma placa, a tela de um documento. O mosaico usa os pixels que estão ali, então não dá para desfazer depois de salvo: confira antes.</p>
      </>}

      {ferramenta === 'apagar' && <>
        <p className="editor-leitura-curta">{marcas ? `${marcas} ${marcas === 1 ? 'marca na foto' : 'marcas na foto'}` : 'Nada desenhado ainda'}</p>
        <p className="editor-dica">Passe o dedo por cima do que você desenhou para tirar. A borracha não toca na foto: ela remove o traço, a figura, a letra ou o mosaico inteiro.</p>
        <div className="editor-acoes-do-painel">
          <button type="button" className="btn btn-danger" disabled={!marcas} onClick={aoApagarTudo}>Apagar tudo o que desenhei</button>
        </div>
      </>}

      {ferramenta === 'cor' && <>
        <Grupo titulo="Conta-gotas">
          <p className="editor-cor-lida">
            {corPega
              ? <><span className="editor-cor-amostra" style={{ background: corPega }} aria-hidden="true" /><strong>{corPega.toUpperCase()}</strong><small>cor copiada para o pincel</small></>
              : <small>Toque em qualquer ponto da foto para copiar a cor daquele pixel.</small>}
          </p>
          {contaGotasNativo && (
            <button type="button" className="editor-botao-largo" onClick={aoUsarContaGotasNativo}>
              Usar o conta-gotas do navegador
            </button>
          )}
        </Grupo>
        {cores}
      </>}

      {ferramenta !== 'cortar' && ferramenta !== 'girar' && (
        <p className="editor-medida-do-painel">A foto está com {medida(saida)}.</p>
      )}
    </aside>
  );
}
