/**
 * O dedo na tela do editor: transforma gesto em marca.
 *
 * Mora fora do editor por duas razões. A primeira é de desempenho: durante o
 * arrasto o traço é desenhado direto no canvas (`compor`) e **só entra no
 * estado quando o dedo levanta** — se cada `pointermove` passasse pelo React, o
 * aparelho renderizaria a tela inteira dezenas de vezes por segundo. A segunda é
 * de leitura: aqui está o comportamento (o que um arrasto significa para cada
 * ferramenta), enquanto o editor cuida da receita, do histórico e do salvamento.
 *
 * O ponto chega sempre em **pixels da saída** (a foto já girada e cortada), que é
 * o espaço onde as marcas vivem — assim girar depois de desenhar move o desenho
 * junto, em vez de deixá-lo preso à tela.
 */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoDePonteiro, RefObject } from 'react';
import { useCatalog } from '../../../context';
import {
  apagarMarcas, areaDoArrasto, corEmHex, limitar, marcaNoPonto, moverMarcaPara,
  novaForma, novoBorrado, novoTexto, novoTraco,
} from '../edicao';
import type { FormaTipo, Marca, Ponto, Tamanho } from '../edicao';
import type { FerramentaId } from '../ferramentas';
import type { EstadoDoPincel, EstadoDoTexto } from './PainelDeEdicao';

/** O que o dedo está fazendo agora: existe só entre descer e levantar. */
type Gesto =
  | { tipo: 'traco'; pontos: Ponto[] }
  | { tipo: 'forma'; de: Ponto; ate: Ponto }
  | { tipo: 'mosaico'; de: Ponto; ate: Ponto }
  | { tipo: 'apagar'; caminho: Ponto[]; antes: Marca[] }
  | { tipo: 'mover'; id: string; de: Ponto; ate: Ponto }
  | null;

/** O texto que ainda não virou marca: fica num campo em cima da foto. */
export type RascunhoDeTexto = { ponto: Ponto; valor: string };

export interface OpcoesDosGestos {
  imagem: HTMLImageElement | null;
  ferramenta: FerramentaId;
  pincel: EstadoDoPincel;
  figura: FormaTipo;
  preenchida: boolean;
  /** O lado de cada quadrado do mosaico, em pixels da saída. */
  bloco: number;
  letra: EstadoDoTexto;
  saida: Tamanho;
  /** `0` enquanto o palco não foi medido: nenhum gesto é aceito. */
  escala: number;
  tela: RefObject<HTMLCanvasElement | null>;
  compor: (marcas?: Marca[], extra?: Marca | null) => void;
  marcas: Marca[];
  salvando: boolean;
  /** Grava as marcas no histórico (um passo por gesto). */
  aoGuardarMarcas: (marcas: Marca[]) => void;
  /** A cor usada por uma marca entra nas cores recentes. */
  aoUsarCor: (cor: string) => void;
  /** A ferramenta "cor" lê a foto e devolve para o pincel. */
  aoPegarCor: (ponto: Ponto) => void;
}

export interface GestosDoEditor {
  campoDeTexto: RefObject<HTMLInputElement | null>;
  rascunho: RascunhoDeTexto | null;
  /** Esta ferramenta responde ao dedo na tela (e não só ao painel). */
  desenha: boolean;
  aoEscreverRascunho: (valor: string) => void;
  aoCancelarRascunho: () => void;
  confirmarTexto: () => void;
  aoDescer: (evento: EventoDePonteiro<HTMLCanvasElement>) => void;
  aoCorrer: (evento: EventoDePonteiro<HTMLCanvasElement>) => void;
  aoSubir: () => void;
}

export default function useGestosDoEditor({
  imagem, ferramenta, pincel, figura, preenchida, bloco, letra, saida, escala,
  tela, compor, marcas, salvando, aoGuardarMarcas, aoUsarCor, aoPegarCor,
}: OpcoesDosGestos): GestosDoEditor {
  const ctx = useCatalog();
  const gesto = useRef<Gesto>(null);
  const campoDeTexto = useRef<HTMLInputElement>(null);
  const [rascunho, setRascunho] = useState<RascunhoDeTexto | null>(null);


  /* --------------------------------------------------------------- gestos -- */
  const pontoDoEvento = (evento: EventoDePonteiro): Ponto | null => {
    const alvo = tela.current;
    if (!alvo || !(escala > 0)) return null;
    const caixaDaTela = alvo.getBoundingClientRect();
    if (!(caixaDaTela.width > 0) || !(caixaDaTela.height > 0)) return null;
    return {
      x: limitar(((evento.clientX - caixaDaTela.left) / caixaDaTela.width) * saida.largura, 0, saida.largura),
      y: limitar(((evento.clientY - caixaDaTela.top) / caixaDaTela.height) * saida.altura, 0, saida.altura),
    };
  };

  const raioDaBorracha = Math.max(12, pincel.espessura);

  /** A marca que o dedo está fazendo agora: existe só durante o gesto. */
  const marcaRascunho = (): Marca | null => {
    const atual = gesto.current;
    if (!atual) return null;
    if (atual.tipo === 'traco') {
      return { id: 'rascunho', tipo: 'traco', pontos: atual.pontos, cor: corEmHex(pincel.cor), espessura: pincel.espessura, opacidade: pincel.opacidade };
    }
    if (atual.tipo === 'forma') return novaForma(figura, atual.de, atual.ate, { ...pincel, cor: corEmHex(pincel.cor), preenchida });
    if (atual.tipo === 'mosaico') return novoBorrado(areaDoArrasto(atual.de, atual.ate, saida), bloco);
    return null;
  };

  const confirmarTexto = () => {
    if (!rascunho) return;
    const marca = novoTexto(rascunho.valor, rascunho.ponto, { cor: corEmHex(pincel.cor), opacidade: pincel.opacidade, ...letra });
    if (marca) { aoGuardarMarcas([...marcas, marca]); aoUsarCor(marca.cor); }
    setRascunho(null);
  };

  const desenha = ferramenta === 'pincel' || ferramenta === 'forma' || ferramenta === 'texto'
    || ferramenta === 'borrar' || ferramenta === 'apagar';

  const aoDescer = (evento: EventoDePonteiro<HTMLCanvasElement>) => {
    if (!imagem || !(escala > 0) || salvando || !desenha && ferramenta !== 'cor') return;
    const ponto = pontoDoEvento(evento);
    if (!ponto) return;
    evento.preventDefault();
    try { evento.currentTarget.setPointerCapture(evento.pointerId); } catch { /* captura é opcional */ }

    if (ferramenta === 'cor') { aoPegarCor(ponto); return; }
    if (ferramenta === 'apagar') {
      gesto.current = { tipo: 'apagar', caminho: [ponto], antes: marcas };
      const resultado = apagarMarcas(marcas, [ponto], raioDaBorracha);
      if (resultado.removidas) compor(resultado.marcas);
      return;
    }
    if (ferramenta === 'texto') {
      const achada = marcaNoPonto(marcas.filter(marca => marca.tipo === 'texto'), ponto, Math.max(18, letra.tamanho / 2));
      if (achada) { gesto.current = { tipo: 'mover', id: achada.id, de: ponto, ate: ponto }; return; }
      if (rascunho?.valor.trim()) confirmarTexto();
      setRascunho({ ponto, valor: '' });
      return;
    }
    gesto.current = ferramenta === 'pincel'
      ? { tipo: 'traco', pontos: [ponto] }
      : { tipo: ferramenta === 'forma' ? 'forma' : 'mosaico', de: ponto, ate: ponto };
    compor(undefined, marcaRascunho());
  };

  const aoCorrer = (evento: EventoDePonteiro<HTMLCanvasElement>) => {
    const atual = gesto.current;
    if (!atual) return;
    const ponto = pontoDoEvento(evento);
    if (!ponto) return;
    evento.preventDefault();
    if (atual.tipo === 'traco') { atual.pontos.push(ponto); compor(undefined, marcaRascunho()); return; }
    if (atual.tipo === 'forma' || atual.tipo === 'mosaico') { atual.ate = ponto; compor(undefined, marcaRascunho()); return; }
    if (atual.tipo === 'apagar') {
      atual.caminho.push(ponto);
      compor(apagarMarcas(atual.antes, atual.caminho, raioDaBorracha).marcas);
      return;
    }
    atual.ate = ponto;
    compor(moverMarcaPara(marcas, atual.id, { x: atual.ate.x - atual.de.x, y: atual.ate.y - atual.de.y }));
  };

  const aoSubir = () => {
    const atual = gesto.current;
    gesto.current = null;
    if (!atual) return;
    if (atual.tipo === 'traco') {
      const marca = novoTraco(atual.pontos, { ...pincel, cor: corEmHex(pincel.cor) });
      if (marca) { aoGuardarMarcas([...marcas, marca]); aoUsarCor(marca.cor); }
    } else if (atual.tipo === 'forma') {
      const marca = novaForma(figura, atual.de, atual.ate, { ...pincel, cor: corEmHex(pincel.cor), preenchida });
      if (marca) { aoGuardarMarcas([...marcas, marca]); aoUsarCor(marca.cor); }
    } else if (atual.tipo === 'mosaico') {
      const marca = novoBorrado(areaDoArrasto(atual.de, atual.ate, saida), bloco);
      if (marca) aoGuardarMarcas([...marcas, marca]);
    } else if (atual.tipo === 'apagar') {
      const resultado = apagarMarcas(atual.antes, atual.caminho, raioDaBorracha);
      if (resultado.removidas) { aoGuardarMarcas(resultado.marcas); ctx.buzz?.(10); }
    } else {
      const deslocamento = { x: atual.ate.x - atual.de.x, y: atual.ate.y - atual.de.y };
      if (Math.hypot(deslocamento.x, deslocamento.y) > 2) aoGuardarMarcas(moverMarcaPara(marcas, atual.id, deslocamento));
    }
  };

  useEffect(() => {
    if (!rascunho) return;
    const esperar = window.setTimeout(() => campoDeTexto.current?.focus(), 40);
    return () => window.clearTimeout(esperar);
  }, [rascunho]);

  return {
    campoDeTexto, rascunho, desenha,
    aoEscreverRascunho: valor => setRascunho(atual => (atual ? { ...atual, valor } : atual)),
    aoCancelarRascunho: () => setRascunho(null),
    confirmarTexto, aoDescer, aoCorrer, aoSubir,
  };
}
