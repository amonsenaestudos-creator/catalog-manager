/**
 * Figura 3D da pessoa.
 *
 * Desenha a **malha** de `malha.ts` com o rasterizador de `pintura.ts`: o corpo
 * é uma superfície 3D contínua, com luz de estúdio, e a roupa entra na própria
 * malha (manga, barra, saia, bota). Arrasta para girar, setas do teclado para
 * ajustar, e os botões levam direto a uma vista.
 *
 * Enquanto a pessoa gira, o desenho é rápido (malha leve, poucas amostras); ao
 * parar, ele se refaz caprichado. É o mesmo desenho — só muda o esforço.
 *
 * Sem canvas (navegador antigo, teste automatizado), a seção não desaparece:
 * ela entrega o mesmo conteúdo em texto.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Accessibility, Download, Eye, Pause, Play, RotateCcw } from 'lucide-react';
import type { Person } from '../../../types';
import { useCatalog } from '../../../context';
import { downloadBlob } from '../../../store';
import { Button } from '../../../components/ui';
import { movimentoReduzido } from '../../../lib/toque';
import { lerForma, resumoDaForma } from '../metricas';
import { CABELO_SILHUETA, PELE_SILHUETA, ROUPA_SILHUETA, corDaPele, corDoCabelo, roupaDe } from '../aparencia';
import { corDaPessoa } from '../../../store';
import { malhaDaPessoa, type Malha } from '../malha';
import { paletaDe, pintarFigura, type Paleta } from '../pintura';

export interface Vista { id: string; rotulo: string; yaw: number; pitch: number }
export const VISTAS: Vista[] = [
  { id: 'frente', rotulo: 'Frente', yaw: 0, pitch: 5 },
  { id: 'tres-quartos', rotulo: 'Três quartos', yaw: -32, pitch: 7 },
  { id: 'lado', rotulo: 'De lado', yaw: -88, pitch: 5 },
];

export function Figura3D({ person, altura = 340, className = '' }: { person: Person; altura?: number; className?: string }) {
  const ctx = useCatalog();
  const reduzido = (ctx.data.settings.reducedMotion ?? false) || movimentoReduzido();
  const palco = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [largura, setLargura] = useState(280);
  const [suportado, setSuportado] = useState(true);
  const [yaw, setYaw] = useState(-32);
  const [pitch, setPitch] = useState(7);
  const [zoom, setZoom] = useState(100);
  const [girando, setGirando] = useState(false);
  /** Modo silhueta: tudo na mesma cor, para comparar formas sem a roupa atrapalhar. */
  const [silhueta, setSilhueta] = useState(false);
  /** A figura parada há tempo bastante para o desenho caprichado. */
  const [repouso, setRepouso] = useState(true);
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  /** Canvas de apoio: recebe a imagem pequena do giro para ser esticada. */
  const canvasDeApoio = useRef<HTMLCanvasElement | null>(null);

  const { proporcoes, explicacoes } = useMemo(() => lerForma(person), [person]);
  // A malha é a mesma a cada quadro: só a vista muda. Recalculá-la ao girar
  // seria jogar fora o trabalho mais caro do desenho.
  const malhaLeve = useMemo(() => malhaDaPessoa(proporcoes, { detalhe: 0.62 }), [proporcoes]);
  const malhaFina = useMemo(() => malhaDaPessoa(proporcoes, { detalhe: 1 }), [proporcoes]);
  const resumo = useMemo(() => resumoDaForma(proporcoes), [proporcoes]);
  const paleta = useMemo<Paleta>(() => {
    if (silhueta) {
      return paletaDe({ pele: PELE_SILHUETA, cabelo: CABELO_SILHUETA, roupa: ROUPA_SILHUETA });
    }
    return paletaDe({ pele: corDaPele(person), cabelo: corDoCabelo(person), roupa: roupaDe(person, corDaPessoa(person)) });
  }, [person, silhueta]);

  // A largura do palco manda no desenho: a figura acompanha o tamanho da ficha.
  useEffect(() => {
    const alvo = palco.current;
    if (!alvo || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(entradas => {
      const medida = entradas[0]?.contentRect?.width;
      if (medida && Math.abs(medida - largura) > 2) setLargura(medida);
    });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [largura]);

  // Girar sozinho, devagar, enquanto o botão estiver ligado.
  useEffect(() => {
    if (!girando || reduzido) return;
    let quadro = 0;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      const delta = Math.min(64, agora - ultimo);
      ultimo = agora;
      setYaw(valor => valor + (delta / 1000) * 18);
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [girando, reduzido]);

  // Do arrasto ao repouso: o desenho caprichado só entra quando ninguém está
  // mexendo na figura.
  useEffect(() => {
    setRepouso(false);
    const relogio = setTimeout(() => setRepouso(true), 220);
    return () => clearTimeout(relogio);
  }, [yaw, pitch, largura, zoom, paleta]);

  // Desenho: a malha pintada, direto no canvas.
  useEffect(() => {
    const elemento = canvas.current;
    if (!elemento) return;
    const contexto = elemento.getContext('2d');
    if (!contexto) { setSuportado(false); return; }
    setSuportado(true);
    const parado = repouso && !girando;
    const malha: Malha = parado ? malhaFina : malhaLeve;
    const alturaDoDesenho = Math.max(120, altura);
    const larguraDoDesenho = Math.max(120, Math.round(largura));
    elemento.width = larguraDoDesenho;
    elemento.height = alturaDoDesenho;
    // Enquanto a figura gira, ela é pintada em tamanho menor e esticada: a
    // diferença some no movimento, e o giro fica fluido em vez de aos pulos.
    const escalaDoDesenho = parado ? 1 : 0.62;
    const pintada = pintarFigura(malha, {
      yaw, pitch,
      largura: Math.max(80, Math.round(larguraDoDesenho * escalaDoDesenho)),
      altura: Math.max(100, Math.round(alturaDoDesenho * escalaDoDesenho)),
      paleta, amostras: 1, sombra: true,
    });
    if (escalaDoDesenho === 1) {
      contexto.putImageData(new ImageData(pintada.dados, pintada.largura, pintada.altura), 0, 0);
    } else {
      // Passa pelo canvas de apoio para o navegador fazer o esticão suave.
      const apoio = canvasDeApoio.current ?? document.createElement('canvas');
      canvasDeApoio.current = apoio;
      apoio.width = pintada.largura;
      apoio.height = pintada.altura;
      const contextoApoio = apoio.getContext('2d');
      if (!contextoApoio) { contexto.putImageData(new ImageData(pintada.dados, pintada.largura, pintada.altura), 0, 0); return; }
      contextoApoio.putImageData(new ImageData(pintada.dados, pintada.largura, pintada.altura), 0, 0);
      contexto.clearRect(0, 0, larguraDoDesenho, alturaDoDesenho);
      contexto.imageSmoothingEnabled = true;
      contexto.drawImage(apoio, 0, 0, larguraDoDesenho, alturaDoDesenho);
    }
  }, [malhaFina, malhaLeve, yaw, pitch, largura, altura, paleta, repouso, girando]);

  const girarPonteiro = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (!arrasto.current) return;
    const deltaX = evento.clientX - arrasto.current.x;
    const deltaY = evento.clientY - arrasto.current.y;
    arrasto.current = { x: evento.clientX, y: evento.clientY };
    setYaw(valor => valor + deltaX * 0.6);
    setPitch(valor => Math.max(-18, Math.min(24, valor + deltaY * 0.25)));
  };

  const salvarImagem = () => {
    const elemento = canvas.current;
    if (!elemento || typeof elemento.toBlob !== 'function') { ctx.notify('Este navegador não deixa salvar a figura.', true); return; }
    elemento.toBlob(blob => {
      if (!blob) { ctx.notify('Não deu para gerar a imagem da figura.', true); return; }
      downloadBlob(blob, `figura-${person.nome.trim().toLowerCase().replace(/\s+/g, '-') || 'catalogo'}.png`);
      ctx.notify('Figura salva como imagem.');
    }, 'image/png');
  };

  return <section className={`figura-3d ${className}`} aria-label={`Figura 3D de ${person.nome}`}>
    <div className="figura-palco" ref={palco} style={{ height: altura }}>
      <canvas ref={canvas} tabIndex={0} role="img" style={{ transform: `scale(${zoom / 100})` }}
        aria-label={`Manequim em 3D de ${person.nome}. ${resumo}. Use as setas para girar.`}
        onPointerDown={evento => { arrasto.current = { x: evento.clientX, y: evento.clientY }; try { evento.currentTarget.setPointerCapture(evento.pointerId); } catch { /* captura é mimo */ } }}
        onPointerMove={girarPonteiro}
        onPointerUp={() => { arrasto.current = null; }}
        onPointerLeave={() => { arrasto.current = null; }}
        onKeyDown={evento => {
          if (evento.key === 'ArrowLeft') { setYaw(valor => valor - 6); evento.preventDefault(); }
          else if (evento.key === 'ArrowRight') { setYaw(valor => valor + 6); evento.preventDefault(); }
          else if (evento.key === 'ArrowUp') { setPitch(valor => Math.max(-18, valor - 3)); evento.preventDefault(); }
          else if (evento.key === 'ArrowDown') { setPitch(valor => Math.min(24, valor + 3)); evento.preventDefault(); }
          else if (evento.key === 'Home') { setYaw(0); setPitch(5); evento.preventDefault(); }
        }} />
      {!suportado && <p className="figura-sem-canvas"><Accessibility size={18} />Este navegador não desenha a figura aqui. A leitura é esta: {resumo}.</p>}
    </div>

    <div className="figura-controles">
      {VISTAS.map(vista => <button key={vista.id} type="button" aria-pressed={Math.abs(yaw - vista.yaw) < 2 && Math.abs(pitch - vista.pitch) < 3}
        onClick={() => { setYaw(vista.yaw); setPitch(vista.pitch); setGirando(false); }}>{vista.rotulo}</button>)}
      <button type="button" aria-pressed={girando} disabled={reduzido} title={reduzido ? 'As animações estão reduzidas nas preferências.' : 'Girar devagar'} onClick={() => setGirando(valor => !valor)}>
        {girando ? <Pause size={13} /> : <Play size={13} />}Girar
      </button>
      <button type="button" onClick={() => { setYaw(-32); setPitch(7); setZoom(100); setGirando(false); }}><RotateCcw size={13} />Reiniciar</button>
    </div>

    <div className="figura-ajustes">
      <label>Tamanho
        <input type="range" min={70} max={150} value={zoom} aria-label="Tamanho da figura" onChange={evento => setZoom(Number(evento.target.value))} />
      </label>
      <button type="button" className="figura-silhueta" aria-pressed={silhueta} onClick={() => setSilhueta(valor => !valor)}>
        <Eye size={13} />{silhueta ? 'Cores da ficha' : 'Ver silhueta'}
      </button>
      <Button variant="ghost" onClick={salvarImagem}><Download size={14} />Salvar imagem</Button>
    </div>

    <p className="figura-aviso">
      Manequim montado do que a ficha guarda: altura {proporcoes.alturaEstimada ? '(estimada a partir da palavra salva)' : ''}, tipo de corpo,
      notas de peito, quadril, corpo e cabelo, tom de pele, cor e tipo de cabelo e estilo de roupa. Não é a aparência da pessoa — é a leitura
      do que está escrito. A figura representa {malhaFina.altura.toFixed(2).replace('.', ',')} m.
    </p>

    <ul className="figura-notas">
      {explicacoes.filter(item => item.muda).slice(0, 6).map(item => <li key={item.rotulo}>
        <strong>{item.rotulo}</strong><span>{item.valor}</span>{item.fontes.length > 0 && <small>{item.fontes.join(' · ')}</small>}
      </li>)}
      <li className="figura-fora"><strong>Fora da forma</strong><span>{explicacoes.filter(item => !item.muda && item.valor === 'sem nota').map(item => item.rotulo).join(', ') || 'nada'}</span></li>
    </ul>
  </section>;
}

export default Figura3D;
