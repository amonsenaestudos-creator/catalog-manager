/**
 * Figura 3D da pessoa.
 *
 * Desenha o modelo de `modelo.ts` num canvas: cada peça é uma elipse com o
 * ângulo exato da projeção, pintada do mais distante para o mais próximo. Arrasta
 * para girar, setas do teclado para ajustar, e os botões levam direto a uma vista.
 *
 * Duas honestidades que a tela mantém:
 * 1. É um **manequim** montado das notas e da altura — não é a aparência de
 *    ninguém. Isso está escrito embaixo da figura, não escondido no código.
 * 2. Sem canvas (navegador antigo, teste automatizado), a seção não desaparece:
 *    ela entrega o mesmo conteúdo em texto.
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
import { alturaDoModelo, modeloDaPessoa, ordenarBracos, sombraDoModelo } from '../modelo';
import { caixaDoModelo, projetarModelo, type ElipseProjetada } from '../projecao';

/** Clareia ou escurece uma cor do tema, aceitando `#hex` e `rgb(...)`. */
function comLuz(cor: string, fator: number): string {
  const hexadecimal = cor.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const rgb = cor.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  let canais: number[];
  if (hexadecimal) {
    const bruto = hexadecimal[1];
    const completo = bruto.length === 3 ? bruto.split('').map(c => c + c).join('') : bruto;
    const numero = Number.parseInt(completo, 16);
    canais = [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255];
  } else if (rgb) {
    canais = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else {
    return cor;
  }
  return `rgb(${canais.map(canal => Math.max(0, Math.min(255, Math.round(canal * fator)))).join(',')})`;
}

function corDoTema(variavel: string, alternativa: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return alternativa;
  try {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
    return valor || alternativa;
  } catch { return alternativa; }
}

export interface Vista { id: string; rotulo: string; yaw: number; pitch: number }
export const VISTAS: Vista[] = [
  { id: 'frente', rotulo: 'Frente', yaw: 0, pitch: 6 },
  { id: 'tres-quartos', rotulo: 'Três quartos', yaw: -28, pitch: 8 },
  { id: 'lado', rotulo: 'De lado', yaw: -88, pitch: 6 },
];

export function Figura3D({ person, altura = 330, className = '' }: { person: Person; altura?: number; className?: string }) {
  const ctx = useCatalog();
  const reduzido = (ctx.data.settings.reducedMotion ?? false) || movimentoReduzido();
  const palco = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [largura, setLargura] = useState(280);
  const [suportado, setSuportado] = useState(true);
  const [yaw, setYaw] = useState(-28);
  const [pitch, setPitch] = useState(8);
  const [zoom, setZoom] = useState(100);
  const [girando, setGirando] = useState(false);
  /** Modo silhueta: tudo na mesma cor, para comparar formas sem a roupa atrapalhar. */
  const [silhueta, setSilhueta] = useState(false);
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  const { proporcoes, explicacoes } = useMemo(() => lerForma(person), [person]);
  const pecas = useMemo(() => modeloDaPessoa(proporcoes), [proporcoes]);
  // Ordem de pintura: primeiro a parte do corpo, depois a profundidade dentro
  // dela. Sem esse agrupamento, no perfil as fatias do braço e do tronco se
  // intercalam e a silhueta ganha listras.
  const elipses = useMemo(() => projetarModelo([sombraDoModelo(proporcoes), ...ordenarBracos(pecas, yaw)], yaw, pitch)
    .sort((a, b) => (a.ordem - b.ordem) || (a.profundidade - b.profundidade)), [pecas, proporcoes, yaw, pitch]);
  const resumo = useMemo(() => resumoDaForma(proporcoes), [proporcoes]);
  // Cores da pessoa: pele, cabelo e a roupa do estilo declarado. É o que faz
  // duas fichas de mesma altura e mesmas notas ainda parecerem duas pessoas.
  const paleta = useMemo(() => {
    const base = { pele: corDaPele(person), cabelo: corDoCabelo(person), roupa: roupaDe(person, corDaPessoa(person)) };
    if (!silhueta) return base;
    return { pele: PELE_SILHUETA, cabelo: CABELO_SILHUETA, roupa: ROUPA_SILHUETA };
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

  useEffect(() => {
    if (!girando || reduzido) return;
    let quadro = 0;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      const delta = Math.min(64, agora - ultimo);
      ultimo = agora;
      setYaw(valor => valor + (delta / 1000) * 22);
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [girando, reduzido]);

  // Desenho: fundo transparente, sombra de contato e as peças em ordem de profundidade.
  useEffect(() => {
    const elemento = canvas.current;
    if (!elemento) return;
    const contexto = elemento.getContext('2d');
    if (!contexto) { setSuportado(false); return; }
    setSuportado(true);
    const densidade = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    elemento.width = Math.max(1, Math.round(largura * densidade));
    elemento.height = Math.max(1, Math.round(altura * densidade));
    contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    contexto.clearRect(0, 0, largura, altura);

    const caixa = caixaDoModelo(elipses);
    if (!caixa.altura || !caixa.largura) return;
    const margem = 14;
    // Enquadra pelas duas dimensões: com os braços abertos, quem manda é a
    // largura; sem eles, a altura. Sem isso, a figura em T-pose sairia cortada.
    const escala = Math.min((altura - margem * 2) / caixa.altura, (largura - margem * 2) / caixa.largura) * (zoom / 100);
    const centroX = 0;
    const centroY = (caixa.base + caixa.topo) / 2;
    const paraTela = (elipse: ElipseProjetada) => ({
      x: largura / 2 + (elipse.centro[0] - centroX) * escala,
      y: altura / 2 - (elipse.centro[1] - centroY) * escala,
    });

    const corDe = (papel: string) => {
      if (papel === 'cabelo') return paleta.cabelo;
      if (papel === 'pele') return paleta.pele;
      if (papel === 'roupa') return paleta.roupa.topo;
      if (papel === 'calca') return paleta.roupa.baixo;
      if (papel === 'sapato') return paleta.roupa.sapato;
      return corDoTema('--accent', '#c786ec');
    };

    for (const elipse of elipses) {
      const ponto = paraTela(elipse);
      const raioX = Math.max(0.5, elipse.rx * escala);
      const raioY = Math.max(0.5, elipse.ry * escala);
      const angulo = (elipse.angulo * Math.PI) / 180;
      contexto.save();
      contexto.translate(ponto.x, ponto.y);
      contexto.rotate(-angulo);
      if (elipse.papel === 'sombra') {
        const sombra = contexto.createRadialGradient(0, 0, raioY * 0.2, 0, 0, raioX);
        sombra.addColorStop(0, 'rgba(0,0,0,0.34)');
        sombra.addColorStop(1, 'rgba(0,0,0,0)');
        contexto.fillStyle = sombra;
      } else {
        // Cor **chapada** por peça. O brilho vem da orientação da peça (a mesma
        // em todas as fatias de um trecho), então fatias vizinhas têm o mesmo
        // tom — sem degrau, sem listra. A luz geral entra depois, numa passada só.
        contexto.fillStyle = comLuz(corDe(elipse.papel), elipse.brilho);
      }
      contexto.beginPath();
      contexto.ellipse(0, 0, raioX, raioY, 0, 0, Math.PI * 2);
      contexto.fill();
      contexto.restore();
    }

    // Uma única passada de luz sobre a figura inteira: claro em cima e à
    // esquerda, sombra embaixo e à direita. Como o gradiente é global, a luz
    // atravessa as peças em vez de reiniciar em cada uma — é o que faz o corpo
    // ler como volume contínuo.
    contexto.save();
    contexto.globalCompositeOperation = 'source-atop';
    const luzGlobal = contexto.createLinearGradient(largura * 0.15, altura * 0.05, largura * 0.85, altura * 0.95);
    luzGlobal.addColorStop(0, 'rgba(255,255,255,0.26)');
    luzGlobal.addColorStop(0.45, 'rgba(255,255,255,0)');
    luzGlobal.addColorStop(1, 'rgba(0,0,0,0.3)');
    contexto.fillStyle = luzGlobal;
    contexto.fillRect(0, 0, largura, altura);
    contexto.restore();
  }, [elipses, largura, altura, zoom, paleta]);

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
      <canvas ref={canvas} tabIndex={0} role="img"
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
          else if (evento.key === 'Home') { setYaw(0); setPitch(6); evento.preventDefault(); }
        }} />
      {!suportado && <p className="figura-sem-canvas"><Accessibility size={18} />Este navegador não desenha a figura aqui. A leitura é esta: {resumo}.</p>}
    </div>

    <div className="figura-controles">
      {VISTAS.map(vista => <button key={vista.id} type="button" aria-pressed={Math.abs(yaw - vista.yaw) < 2 && Math.abs(pitch - vista.pitch) < 3}
        onClick={() => { setYaw(vista.yaw); setPitch(vista.pitch); setGirando(false); }}>{vista.rotulo}</button>)}
      <button type="button" aria-pressed={girando} disabled={reduzido} title={reduzido ? 'As animações estão reduzidas nas preferências.' : 'Girar devagar'} onClick={() => setGirando(valor => !valor)}>
        {girando ? <Pause size={13} /> : <Play size={13} />}Girar
      </button>
      <button type="button" onClick={() => { setYaw(-28); setPitch(8); setZoom(100); setGirando(false); }}><RotateCcw size={13} />Reiniciar</button>
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
      do que está escrito. A figura representa {alturaDoModelo(pecas).toFixed(2).replace('.', ',')} m.
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
