/**
 * Editor de imagens da galeria.
 *
 * Abre por cima do visor (ou da ficha, ou do cofre) com a foto inteira na tela e
 * uma trilha de ferramentas embaixo, ao alcance do polegar. O que ele faz:
 * cortar com proporção, girar e espelhar, ajustar luz e cor, aplicar filtros
 * prontos, pintar com o dedo, desenhar figuras, escrever, esconder uma área com
 * mosaico — e tirar a cor de qualquer ponto da foto com o conta-gotas.
 *
 * Três decisões de projeto valem nota:
 *   · **A foto original não é tocada.** O que existe é uma receita (corte, giro,
 *     ajustes e marcas) que só vira pixels uma vez, ao salvar. Desfazer volta um
 *     passo da receita, e "salvar como nova" deixa a original no lugar.
 *   · **Desenhar não passa pelo React.** O traço vai direto para o canvas durante
 *     o gesto e só entra no estado quando o dedo levanta — senão cada movimento
 *     do dedo renderizaria a tela inteira no aparelho.
 *   · **Sem canvas, o editor não finge.** Ele diz o que não deu para fazer e
 *     deixa a pessoa sair, em vez de mostrar um retângulo preto.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, ImagePlus, MoreHorizontal, Redo2, RotateCcw, Save, Undo2, X } from 'lucide-react';
import type { Photo } from '../../../types';
import { useCatalog } from '../../../context';
import { downloadBlob } from '../../../store';
import type { AcaoDeFolha } from '../../../components/Folha';
import {
  ALCAS, AJUSTES_NEUTROS, FILTROS_PRONTOS, PROPORCOES, aplicarAcao, areaProporcional, arrastarArea,
  corEmHex, desfazer, edicaoInicial, filtroAtivo, historicoInicial, lerCoresRecentes,
  podeDesfazer, podeRefazer, refazer, registrar, repor, salvarCorRecente, tamanhoDaEdicao, temMudanca,
} from '../edicao';
import type {
  Ajustes, Alca, Edicao, FormaTipo, Historico, Marca, ModoDeSalvamento, Ponto,
  ResultadoDaEdicao, Retangulo,
} from '../edicao';
import { carregarImagem, exportarEdicao, tamanhoNatural } from '../tela';
import { FERRAMENTAS } from '../ferramentas';
import type { FerramentaId } from '../ferramentas';
import PainelDeEdicao, { TrilhaDeFerramentas } from './PainelDeEdicao';
import useGestosDoEditor from './useGestosDoEditor';
import useTelaDoEditor from './useTelaDoEditor';
import type { EstadoDoPincel, EstadoDoTexto } from './PainelDeEdicao';

export interface EditorDeImagemProps {
  foto: Photo;
  /** Nome mostrado no topo (a pessoa dona da foto, quando houver). */
  titulo?: string;
  aoFechar: () => void;
  /** Devolve a imagem pronta; quem chama decide como ela volta para o catálogo. */
  aoSalvar: (resultado: ResultadoDaEdicao, modo: ModoDeSalvamento) => void;
}

/** Tecla → ferramenta: a trilha e o teclado lêem do mesmo lugar. */
const ATALHOS: Record<string, FerramentaId> = Object.fromEntries(
  FERRAMENTAS.map(ferramenta => [ferramenta.atalho, ferramenta.id]),
) as Record<string, FerramentaId>;

/** O conta-gotas nativo existe no Chrome e no Edge; onde não existe, o nosso resolve. */
interface GotaNativa { open: () => Promise<{ sRGBHex: string }> }
const temContaGotasNativo = () =>
  typeof window !== 'undefined' && typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper === 'function';

export default function EditorDeImagem({ foto, titulo, aoFechar, aoSalvar }: EditorDeImagemProps) {
  const ctx = useCatalog();

  /* ------------------------------------------------------------ a receita -- */
  // A edição é uma receita (giro, corte, luz, marcas) que só vira pixels na
  // hora de salvar. O histórico guarda receitas, não imagens — por isso o
  // desfazer é instantâneo e não gasta memória com bitmap atrás de bitmap.
  const [historico, setHistorico] = useState<Historico<Edicao>>(() => historicoInicial(edicaoInicial({ largura: 1, altura: 1 })));

  /* ------------------------------------------------------------ a imagem -- */
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [falha, setFalha] = useState('');
  useEffect(() => {
    let vivo = true;
    setImagem(null);
    setFalha('');
    void carregarImagem(foto.url).then(carregada => {
      if (!vivo) return;
      if (!carregada) {
        setFalha('Esta imagem não abriu no editor. Ela pode estar em outro site, ou o arquivo pode ter sido removido.');
        return;
      }
      // Imagem e receita entram juntas, no mesmo lote. Se a receita viesse num
      // efeito separado, a tela mostraria por um instante as medidas de uma
      // edição que ainda não existe (1 × 1) e o "desfazer" ficaria aceso à toa.
      setImagem(carregada);
      setHistorico(repor(edicaoInicial(tamanhoNatural(carregada))));
    });
    return () => { vivo = false; };
  }, [foto.url]);

  const tamanho = useMemo(() => tamanhoNatural(imagem), [imagem]);
  const edicao = historico.atual;
  const saida = useMemo(() => tamanhoDaEdicao(edicao), [edicao]);
  const suja = temMudanca(edicao, tamanho);

  /* --------------------------------------------------------- o que está ligado */
  const [ferramenta, setFerramenta] = useState<FerramentaId>('cortar');
  const [pincel, setPincel] = useState<EstadoDoPincel>({ cor: '#e297bd', espessura: 12, opacidade: 1 });
  const [figura, setFigura] = useState<FormaTipo>('seta');
  const [preenchida, setPreenchida] = useState(false);
  const [letra, setLetra] = useState<EstadoDoTexto>({ tamanho: 32, contorno: true });
  const [bloco, setBloco] = useState(12);
  const [proporcao, setProporcao] = useState('livre');
  const [area, setArea] = useState<Retangulo | null>(null);
  const [arraste, setArraste] = useState<{ alca: Alca; inicio: Ponto; area: Retangulo } | null>(null);
  const [recentes, setRecentes] = useState<string[]>(() => lerCoresRecentes());
  const [corPega, setCorPega] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mais, setMais] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  /* ---------------------------------------------------------------- a tela -- */
  // Medir o palco, manter a base pronta e responder pelas cores e pelas
  // miniaturas dos filtros é trabalho de `useTelaDoEditor` — aqui só se usa o
  // que ele devolve. `escala === 0` quer dizer "ainda não sei o tamanho".
  const { palco, tela, escala, caixa, compor, corDaBase, paleta, miniaturas, semTela } =
    useTelaDoEditor(imagem, edicao, saida);
  const ultimoPasso = useRef<{ chave: string; tempo: number }>({ chave: '', tempo: 0 });

  /* -------------------------------------------------------------- histórico */
  const mudar = useCallback((chave: string, produzir: (atual: Edicao) => Edicao) => {
    // Um slider dispara dezenas de vezes por segundo: junta tudo num passo só,
    // senão "desfazer" viraria voltar 1% de brilho de cada vez.
    const agora = Date.now();
    const junto = ultimoPasso.current.chave === chave && agora - ultimoPasso.current.tempo < 700;
    ultimoPasso.current = { chave, tempo: agora };
    setHistorico(historia => {
      const novo = produzir(historia.atual);
      if (novo === historia.atual) return historia;
      return junto ? { ...historia, atual: novo } : registrar(historia, novo);
    });
  }, []);
  const passo = useCallback((produzir: (atual: Edicao) => Edicao) => {
    ultimoPasso.current = { chave: '', tempo: 0 };
    setHistorico(historia => {
      const novo = produzir(historia.atual);
      return novo === historia.atual ? historia : registrar(historia, novo);
    });
  }, []);
  const marcasNovas = useCallback((marcas: Marca[]) => passo(atual => ({ ...atual, marcas })), [passo]);
  const voltar = useCallback(() => setHistorico(historia => desfazer(historia)), []);
  const avancar = useCallback(() => setHistorico(historia => refazer(historia)), []);

  /* -------------------------------------------------------------- geometria */
  const girar = useCallback((sentido: 1 | -1) => {
    passo(atual => aplicarAcao(atual, { tipo: 'giro', sentido }));
    ctx.buzz?.(8);
  }, [ctx, passo]);
  const espelhar = useCallback((eixo: 'h' | 'v') => {
    passo(atual => aplicarAcao(atual, { tipo: 'espelho', eixo }));
    ctx.buzz?.(8);
  }, [ctx, passo]);

  const razaoAtual = useMemo(() => {
    const escolhida = PROPORCOES.find(item => item.id === proporcao);
    if (!escolhida) return null;
    if (escolhida.razao === 0) return saida.altura > 0 ? saida.largura / saida.altura : null;
    return escolhida.razao;
  }, [proporcao, saida]);

  useEffect(() => {
    if (ferramenta !== 'cortar' || !(saida.largura > 0)) return;
    setArea(areaProporcional(saida, razaoAtual));
  }, [ferramenta, razaoAtual, saida.largura, saida.altura]);

  // Arrastar a moldura: o dedo sai de cima da alça, então quem escuta é a janela.
  useEffect(() => {
    if (!arraste || !(escala > 0)) return;
    const mover = (evento: PointerEvent) => {
      setArea(arrastarArea(arraste.area, arraste.alca, {
        x: (evento.clientX - arraste.inicio.x) / escala,
        y: (evento.clientY - arraste.inicio.y) / escala,
      }, saida, razaoAtual));
    };
    const soltar = () => setArraste(null);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [arraste, escala, saida, razaoAtual]);

  const aplicarCorte = () => {
    if (!area) return;
    if (area.largura < 8 || area.altura < 8) { ctx.notify('A seleção é pequena demais para virar uma foto.', true); return; }
    if (area.x <= 0 && area.y <= 0 && area.largura >= saida.largura - 1 && area.altura >= saida.altura - 1) {
      ctx.notify('A seleção já é a foto inteira.');
      return;
    }
    passo(atual => aplicarAcao(atual, { tipo: 'corte', area }));
    ctx.buzz?.(12);
    ctx.sound('pop');
  };

  /* ------------------------------------------------------------------ luz -- */
  const ajustar = (novo: Partial<Ajustes>) => mudar('ajustes', atual => ({ ...atual, ajustes: { ...atual.ajustes, ...novo } }));
  const zerarAjustes = () => passo(atual => ({ ...atual, ajustes: { ...AJUSTES_NEUTROS } }));
  const aplicarFiltro = (id: string) => {
    const filtro = FILTROS_PRONTOS.find(item => item.id === id);
    if (!filtro) return;
    passo(atual => ({ ...atual, ajustes: { ...filtro.ajustes } }));
    ctx.buzz?.(6);
  };

  /* ------------------------------------------------------------------ cor -- */
  const escolherCor = useCallback((cor: string) => {
    const limpa = cor.trim();
    // Aceita a digitação pela metade ("#e2", "e29") sem jogar a pessoa para o branco.
    if (/^#?[\da-f]{1,6}$/i.test(limpa)) setPincel(atual => ({ ...atual, cor: limpa.startsWith('#') ? limpa : `#${limpa}` }));
    else setPincel(atual => ({ ...atual, cor: corEmHex(limpa) }));
  }, []);
  const guardarCor = useCallback((cor: string) => {
    const hex = corEmHex(cor);
    setPincel(atual => ({ ...atual, cor: hex }));
    setCorPega(hex);
    setRecentes(salvarCorRecente(hex));
  }, []);
  const pegarCorDaTela = (ponto: Ponto) => {
    const cor = corDaBase(ponto);
    if (!cor) { ctx.notify('Não deu para ler a cor deste ponto.', true); return; }
    guardarCor(cor);
    ctx.buzz?.(6);
  };
  const usarContaGotasNativo = async () => {
    try {
      const Construtor = (window as unknown as { EyeDropper: new () => GotaNativa }).EyeDropper;
      const resultado = await new Construtor().open();
      if (resultado?.sRGBHex) guardarCor(resultado.sRGBHex);
    } catch { /* desistir do conta-gotas não é erro */ }
  };

  /* --------------------------------------------------------------- gestos -- */
  // O dedo na tela é assunto de `useGestosDoEditor`: ele desenha durante o
  // arrasto e devolve a marca pronta quando o dedo levanta.
  const {
    campoDeTexto, rascunho, desenha, aoEscreverRascunho, aoCancelarRascunho,
    confirmarTexto, aoDescer, aoCorrer, aoSubir,
  } = useGestosDoEditor({
    imagem, ferramenta, pincel, figura, preenchida, bloco, letra, saida, escala,
    tela, compor, marcas: edicao.marcas, salvando,
    aoGuardarMarcas: marcasNovas,
    aoUsarCor: cor => setRecentes(salvarCorRecente(cor)),
    aoPegarCor: pegarCorDaTela,
  });

  /* -------------------------------------------------------------- salvar -- */
  const salvar = (modo: ModoDeSalvamento) => {
    if (!imagem || salvando) return;
    setMais(false);
    setSalvando(true);
    // Um respiro para a tela pintar o "gerando" antes do trabalho pesado.
    window.setTimeout(() => {
      const resultado = exportarEdicao(imagem, edicao);
      setSalvando(false);
      if (!resultado) { ctx.notify('Não foi possível gerar a imagem editada neste navegador.', true); return; }
      ctx.sound('shutter');
      aoSalvar(resultado, modo);
    }, 40);
  };

  const baixar = () => {
    if (!imagem || salvando) return;
    // Privacidade ligada é "ninguém mais vê esta tela": nada sai para o aparelho.
    if (ctx.privacy) { ctx.notify('O modo privacidade está ligado. Desligue para baixar a imagem.', true); return; }
    setMais(false);
    setSalvando(true);
    window.setTimeout(() => {
      const resultado = exportarEdicao(imagem, edicao);
      setSalvando(false);
      if (!resultado) { ctx.notify('Não foi possível gerar a imagem editada neste navegador.', true); return; }
      void (async () => {
        try {
          const blob = await (await fetch(resultado.url)).blob();
          const extensao = resultado.filtro === 'image/jpeg' ? 'jpg' : resultado.filtro === 'image/png' ? 'png' : 'webp';
          downloadBlob(blob, `${(foto.name || 'foto').replace(/\.[^.]+$/, '')}-editada.${extensao}`);
          ctx.notify('A foto editada foi baixada.');
        } catch { ctx.notify('Não foi possível baixar a imagem.', true); }
      })();
    }, 40);
  };

  const restaurar = () => {
    setMais(false);
    setProporcao('livre');
    setHistorico(historia => registrar(historia, edicaoInicial(tamanho)));
    ctx.notify('A foto voltou ao original. Ainda dá para desfazer.');
  };

  const acoesDeSalvar: AcaoDeFolha[] = [
    { rotulo: 'Salvar na foto', detalhe: 'substitui a imagem no catálogo', icone: Save, onClick: () => salvar('substituir') },
    { rotulo: 'Salvar como nova foto', detalhe: 'a original continua no lugar', icone: ImagePlus, onClick: () => salvar('nova') },
    { rotulo: 'Baixar a edição', icone: Download, onClick: baixar },
    { rotulo: 'Voltar à foto original', icone: RotateCcw, perigo: true, onClick: restaurar },
  ];

  /* ----------------------------------------------------------- teclado/sair */
  const tentarFechar = useCallback(() => {
    if (rascunho) { aoCancelarRascunho(); return; }
    if (suja) { setConfirmando(true); return; }
    aoFechar();
  }, [aoFechar, rascunho, suja]);

  const aoTeclar = (evento: KeyboardEvent) => {
    const alvo = evento.target as HTMLElement | null;
    const digitando = !!alvo && (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName) || alvo.isContentEditable);
    if (evento.ctrlKey || evento.metaKey) {
      const tecla = evento.key.toLowerCase();
      if (tecla === 'z') { evento.preventDefault(); evento.stopPropagation(); if (evento.shiftKey) avancar(); else voltar(); return; }
      if (tecla === 'y') { evento.preventDefault(); evento.stopPropagation(); avancar(); return; }
      if (tecla === 's') { evento.preventDefault(); evento.stopPropagation(); salvar('substituir'); }
      return;
    }
    if (digitando) {
      if (evento.key === 'Escape' && rascunho) { evento.stopPropagation(); aoCancelarRascunho(); }
      return;
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      if (mais) setMais(false);
      else if (confirmando) setConfirmando(false);
      else tentarFechar();
      return;
    }
    if (evento.key === 'Enter' && rascunho) { evento.preventDefault(); confirmarTexto(); return; }
    const atalho = ATALHOS[evento.key.toLowerCase()];
    // Trocar de ferramenta no meio de uma letra cancela o texto em andamento
    if (atalho) { evento.preventDefault(); evento.stopPropagation(); setFerramenta(atalho); aoCancelarRascunho(); }
  };
  const tecla = useRef(aoTeclar);
  tecla.current = aoTeclar;
  useEffect(() => {
    // Na janela e em captura: o editor responde antes do visor que está por baixo.
    const ouvir = (evento: KeyboardEvent) => tecla.current(evento);
    window.addEventListener('keydown', ouvir, true);
    return () => window.removeEventListener('keydown', ouvir, true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('editor-aberto');
    const anterior = document.activeElement as HTMLElement | null;
    return () => {
      document.documentElement.classList.remove('editor-aberto');
      if (typeof anterior?.focus === 'function') anterior.focus({ preventScroll: true });
    };
  }, []);

  /* ------------------------------------------------------------- aparência */
  const filtroLigado = filtroAtivo(edicao.ajustes);
  const mudancas = [
    edicao.geometria.giro ? `giro de ${edicao.geometria.giro}°` : '',
    edicao.geometria.espelharH || edicao.geometria.espelharV ? 'espelhada' : '',
    edicao.geometria.corte.largura < tamanho.largura || edicao.geometria.corte.altura < tamanho.altura ? 'cortada' : '',
    filtroLigado && filtroLigado !== 'original' ? `filtro ${FILTROS_PRONTOS.find(item => item.id === filtroLigado)?.nome || ''}` : '',
    edicao.marcas.length ? `${edicao.marcas.length} ${edicao.marcas.length === 1 ? 'marca' : 'marcas'}` : '',
  ].filter(Boolean);
  const cursor = ferramenta === 'cor' ? 'copy' : ferramenta === 'texto' ? 'text' : ferramenta === 'apagar' ? 'cell' : 'crosshair';
  const dicaDaTela = ferramenta === 'cortar' ? 'Arraste a moldura ou puxe um canto'
    : ferramenta === 'cor' ? 'Toque na foto para copiar aquela cor'
      : ferramenta === 'texto' ? 'Toque onde escrever · arraste uma letra pronta para mover'
        : ferramenta === 'apagar' ? 'Passe por cima do que você desenhou'
          : ferramenta === 'borrar' ? 'Arraste sobre o que precisa sumir'
            : desenha ? 'Arraste com o dedo para desenhar' : 'O painel muda a foto';

  return createPortal(
    <div className="editor" role="dialog" aria-modal="true" aria-label="Editor de imagens">
      <header className="editor-topo">
        <button type="button" className="editor-botao" onClick={tentarFechar} aria-label="Fechar o editor"><X size={20} /></button>
        <div className="editor-titulo">
          <strong>{titulo || foto.name || 'Editar foto'}</strong>
          <small>{Math.round(saida.largura)} × {Math.round(saida.altura)} px · {mudancas.length ? mudancas.join(' · ') : 'sem mudanças'}</small>
        </div>
        <div className="editor-topo-acoes">
          <button type="button" className="editor-botao" onClick={voltar} disabled={!podeDesfazer(historico)} aria-label="Desfazer a última mudança"><Undo2 size={18} /></button>
          <button type="button" className="editor-botao" onClick={avancar} disabled={!podeRefazer(historico)} aria-label="Refazer"><Redo2 size={18} /></button>
          <button type="button" className={`editor-botao ${mais ? 'ativa' : ''}`} onClick={() => setMais(aberto => !aberto)}
            aria-label="Mais opções" aria-expanded={mais}><MoreHorizontal size={19} /></button>
          <button type="button" className="editor-salvar" onClick={() => salvar('substituir')} disabled={!imagem || salvando}>
            {salvando ? 'Gerando…' : <><Check size={17} />Salvar</>}
          </button>
        </div>
      </header>

      {mais && (
        <>
          <button type="button" className="editor-mais-veu" aria-label="Fechar as opções" onClick={() => setMais(false)} />
          <div className="editor-mais" role="menu" aria-label="Opções de salvamento">
            {acoesDeSalvar.map(acao => {
              const Icone = acao.icone;
              return (
                <button type="button" key={acao.rotulo} role="menuitem" className={acao.perigo ? 'perigo' : ''} onClick={acao.onClick}>
                  {Icone && <Icone size={17} />}<span>{acao.rotulo}{acao.detalhe && <small>{acao.detalhe}</small>}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="editor-corpo">
        <div className="editor-palco" ref={palco}>
          {falha && <p className="editor-falha" role="alert">{falha}</p>}
          {!falha && !imagem && <p className="editor-carregando" role="status">Abrindo a foto…</p>}
          {imagem && escala > 0 && (
            <div className={`editor-moldura ferramenta-${ferramenta}`} style={{ width: caixa.largura, height: caixa.altura }}>
              <canvas ref={tela} className="editor-tela" style={{ width: caixa.largura, height: caixa.altura, cursor }}
                onPointerDown={aoDescer} onPointerMove={aoCorrer} onPointerUp={aoSubir} onPointerCancel={aoSubir}
                role="img" aria-label={`Foto em edição, com ${Math.round(saida.largura)} por ${Math.round(saida.altura)} pixels`} />
              {semTela && <img className="editor-tela-fallback" src={foto.url} alt="" draggable={false} />}

              {ferramenta === 'cortar' && area && (
                <div className="editor-corte">
                  <div className="editor-corte-area"
                    style={{ left: area.x * escala, top: area.y * escala, width: area.largura * escala, height: area.altura * escala }}
                    onPointerDown={evento => {
                      evento.preventDefault();
                      evento.stopPropagation();
                      setArraste({ alca: 'mover', inicio: { x: evento.clientX, y: evento.clientY }, area });
                    }}>
                    <span className="editor-corte-grade" aria-hidden="true"><i /><i /><i /><i /></span>
                    {ALCAS.map(alca => (
                      <button type="button" key={alca.id} className={`editor-corte-alca alca-${alca.id}`} aria-label={`Redimensionar pelo ${alca.nome.toLowerCase()}`}
                        onPointerDown={evento => {
                          evento.preventDefault();
                          evento.stopPropagation();
                          setArraste({ alca: alca.id, inicio: { x: evento.clientX, y: evento.clientY }, area });
                        }} />
                    ))}
                    <span className="editor-corte-medida">{Math.round(area.largura)} × {Math.round(area.altura)}</span>
                  </div>
                </div>
              )}

              {rascunho && (
                <div className="editor-texto" style={{ left: rascunho.ponto.x * escala, top: rascunho.ponto.y * escala }}>
                  <input ref={campoDeTexto} value={rascunho.valor} placeholder="Escreva aqui" maxLength={120}
                    style={{ fontSize: Math.max(13, letra.tamanho * escala), color: corEmHex(pincel.cor) }}
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
          {imagem && escala > 0 && <p className="editor-dica-da-tela">{dicaDaTela}</p>}
        </div>

        <PainelDeEdicao
          ferramenta={ferramenta} geometria={edicao.geometria} saida={saida}
          pincel={pincel} aoMudarPincel={novo => setPincel(atual => ({ ...atual, ...novo }))} aoEscolherCor={escolherCor}
          paleta={paleta} recentes={recentes} corPega={corPega}
          contaGotasNativo={temContaGotasNativo()} aoUsarContaGotasNativo={() => { void usarContaGotasNativo(); }}
          figura={figura} preenchida={preenchida} aoMudarFigura={setFigura} aoMudarPreenchida={setPreenchida}
          texto={letra} aoMudarTexto={novo => setLetra(atual => ({ ...atual, ...novo }))}
          bloco={bloco} aoMudarBloco={setBloco}
          proporcao={proporcao} aoMudarProporcao={setProporcao} area={area}
          aoAplicarCorte={aplicarCorte} aoCancelarCorte={() => setArea({ x: 0, y: 0, ...saida })}
          aoGirar={girar} aoEspelhar={espelhar}
          ajustes={edicao.ajustes} aoMudarAjustes={ajustar} aoZerarAjustes={zerarAjustes}
          miniaturas={miniaturas} aoAplicarFiltro={aplicarFiltro}
          aoApagarTudo={() => { if (edicao.marcas.length) { marcasNovas([]); ctx.notify('Tudo o que você desenhou saiu da foto.'); } }}
          marcas={edicao.marcas.length} semTela={semTela}
        />
      </div>

      <footer className="editor-base">
        <TrilhaDeFerramentas ferramenta={ferramenta} aoEscolher={id => { setFerramenta(id); aoCancelarRascunho(); }} />
        <div className="editor-base-fim">
          <button type="button" className="editor-acao-solta" onClick={baixar} disabled={!imagem || salvando}><Download size={16} />Baixar</button>
          <button type="button" className="editor-acao-solta" onClick={() => salvar('nova')} disabled={!imagem || salvando}><ImagePlus size={16} />Salvar como nova</button>
        </div>
      </footer>

      {confirmando && (
        <div className="editor-confirmar" role="alertdialog" aria-modal="true" aria-label="Descartar as alterações?">
          <div>
            <h2>Descartar o que você editou?</h2>
            <p>A foto volta ao original e as mudanças desta sessão se perdem. Para guardar, use <strong>Salvar</strong> antes de sair.</p>
            <div className="editor-confirmar-acoes">
              <button type="button" className="btn" onClick={() => setConfirmando(false)}>Continuar editando</button>
              <button type="button" className="btn btn-danger" onClick={aoFechar}>Descartar e sair</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
