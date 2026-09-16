/**
 * A grade da galeria, desenhada para o polegar.
 *
 * Três leituras do mesmo monte de fotos:
 *   · mosaico  — cada azulejo recebe a altura da própria proporção
 *   · quadra   — quadrados iguais, para varrer e escolher em lote
 *   · linha    — blocos por dia com a data grudada no topo, enquanto se rola
 *
 * As fotos entram aos poucos (a lista inteira de um catálogo grande custa
 * caro na rolagem do celular) e cada imagem só é baixada quando aparece.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Heart } from 'lucide-react';
import type { AppData, Photo } from '../types';
import { agruparPorDia, colunasDaQuadra, razaoDaFoto, razaoNaCache, registrarRazao, spanDaFoto } from '../lib/galeria';
import type { ModoGaleria } from '../lib/galeria';
import { useToqueLongo } from '../lib/toque';

const LINHA_DE_ALTURA = 8;   // px de grid-auto-rows
const ESPACO = 8;            // px do gap
const PRIMEIRO_LOTE = 96;
const PASSO = 96;

/** Colunas conforme a largura: 2 no bolso, mais no tablet, mais no desktop. */
export function colunasDoMosaico(largura: number): number {
  if (largura <= 0) return 2;
  if (largura < 760) return Math.max(2, Math.min(3, Math.round(largura / 165)));
  return Math.max(3, Math.min(6, Math.round(largura / 215)));
}

/** Largura real do contentor, com a janela por perto e 0 nos testes de jsdom. */
function useLarguraReal(ref: React.RefObject<HTMLElement | null>) {
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const medir = () => {
      const propria = ref.current?.clientWidth || 0;
      const janela = typeof window !== 'undefined' ? window.innerWidth : 0;
      setLargura(propria || (janela ? Math.max(280, janela - 32) : 360));
    };
    medir();
    let observador: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      try { observador = new ResizeObserver(medir); observador.observe(ref.current); } catch { observador = null; }
    }
    window.addEventListener('resize', medir);
    return () => { observador?.disconnect(); window.removeEventListener('resize', medir); };
  }, [ref]);
  return largura;
}

interface AzulejoProps {
  foto: Photo;
  dados: AppData;
  larguraCelula: number;
  modo: ModoGaleria;
  selecionando: boolean;
  selecionada: boolean;
  aoAbrir: (foto: Photo) => void;
  aoAlternar: (foto: Photo, estender: boolean) => void;
  aoFavoritar: (foto: Photo) => void;
  aoSegurar: (foto: Photo) => void;
  aoNovoTamanho: () => void;
}

function Azulejo({ foto, dados, larguraCelula, modo, selecionando, selecionada, aoAbrir, aoAlternar, aoFavoritar, aoSegurar, aoNovoTamanho }: AzulejoProps) {
  const razao = modo === 'quadra' ? 1 : razaoDaFoto(foto);
  const span = modo === 'quadra' ? undefined : spanDaFoto(razao, larguraCelula, LINHA_DE_ALTURA, ESPACO);
  const nome = dados.people.find(person => person.id === foto.personId)?.nome;
  const semMedida = modo !== 'quadra' && !razaoNaCache(foto.id) && !Number((foto as Photo & { width?: number }).width);
  const toque = useToqueLongo({ aoLongo: () => aoSegurar(foto) });

  return (
    <div className={`azulejo ${selecionada ? 'selecionada' : ''} ${selecionando ? 'escolhendo' : ''}`}
      style={span ? { gridRowEnd: `span ${span}` } : undefined}
      role="button" tabIndex={0}
      aria-label={nome ? `Foto de ${nome}` : 'Foto sem ficha'}
      {...toque.props}
      onClick={event => {
        if (toque.segurou()) return;   // o toque longo já fez o seu trabalho
        const estendendo = event.shiftKey || event.metaKey || event.ctrlKey;
        if (selecionando || estendendo) { aoAlternar(foto, estendendo); return; }
        aoAbrir(foto);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (selecionando) aoAlternar(foto, false); else aoAbrir(foto); }
      }}>
      <img src={foto.url} alt={foto.name || nome || 'Foto do catálogo'} loading="lazy" decoding="async" draggable={false}
        onLoad={event => {
          const img = event.currentTarget;
          if (semMedida && registrarRazao(foto.id, img.naturalWidth, img.naturalHeight)) aoNovoTamanho();
        }} />
      {selecionando && <span className="azulejo-marca" aria-hidden="true">{selecionada ? <Check size={15} /> : null}</span>}
      <button type="button" className={`azulejo-coracao ${foto.favorite ? 'aceso' : ''}`}
        aria-label={foto.favorite ? 'Tirar das favoritas' : 'Guardar nas favoritas'}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); aoFavoritar(foto); }}>
        <Heart size={15} fill={foto.favorite ? 'currentColor' : 'none'} />
      </button>
      {modo !== 'quadra' && <span className="azulejo-legenda">{nome || 'Sem ficha'}</span>}
    </div>
  );
}

export default function GaleriaGrade({ fotos, modo, dados, selecionando, selecionadas, aoAbrir, aoAlternar, aoFavoritar, aoSegurar, aoSelecionarTudo }: {
  fotos: Photo[];
  modo: ModoGaleria;
  dados: AppData;
  selecionando: boolean;
  selecionadas: string[];
  aoAbrir: (foto: Photo) => void;
  aoAlternar: (foto: Photo, estender: boolean) => void;
  aoFavoritar: (foto: Photo) => void;
  aoSegurar: (foto: Photo) => void;
  aoSelecionarTudo?: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const largura = useLarguraReal(caixa);
  const [lote, setLote] = useState(PRIMEIRO_LOTE);
  const [carimbo, setCarimbo] = useState(0);
  const novoTamanho = useCallback(() => setCarimbo(valor => valor + 1), []);
  useEffect(() => { setLote(PRIMEIRO_LOTE); }, [modo, fotos.length]);

  const visiveis = useMemo(() => fotos.slice(0, lote), [fotos, lote]);

  // Chegar perto do fim já puxa o próximo lote: ninguém caça botão no polegar.
  useEffect(() => {
    const aoRolar = () => {
      setLote(atual => {
        if (atual >= fotos.length) return atual;
        const sobra = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        return sobra < 700 ? Math.min(fotos.length, atual + PASSO) : atual;
      });
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, [fotos.length]);

  const colunas = modo === 'quadra' ? colunasDaQuadra(largura) : colunasDoMosaico(largura);
  const larguraCelula = Math.max(80, (largura - ESPACO * (colunas - 1)) / colunas);
  const estilo = { '--colunas': colunas, '--linha': `${LINHA_DE_ALTURA}px`, '--espaco': `${ESPACO}px` } as React.CSSProperties;

  const grupos = modo === 'linha' ? agruparPorDia(visiveis) : [];
  const resto = fotos.length - visiveis.length;

  const azulejos = (lista: Photo[]) => lista.map(foto => (
    <Azulejo key={foto.id} foto={foto} dados={dados} larguraCelula={larguraCelula} modo={modo}
      selecionando={selecionando} selecionada={selecionadas.includes(foto.id)}
      aoAbrir={aoAbrir} aoAlternar={aoAlternar} aoFavoritar={aoFavoritar} aoSegurar={aoSegurar} aoNovoTamanho={novoTamanho} />
  ));

  return (
    <div className="galeria-caixa" ref={caixa}>
      {!fotos.length ? null : modo === 'linha' ? (
        <div className="galeria-linha" data-carimbo={carimbo}>
          {grupos.map(grupo => (
            <section className="galeria-dia" key={grupo.chave || 'sem-data'}>
              <h3 className="galeria-dia-titulo"><span>{grupo.titulo}</span><small>{grupo.fotos.length} {grupo.fotos.length === 1 ? 'foto' : 'fotos'}</small></h3>
              <div className="galeria-grade mosaico" style={estilo}>{azulejos(grupo.fotos)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className={`galeria-grade ${modo}`} style={estilo} data-carimbo={carimbo}>{azulejos(visiveis)}</div>
      )}
      {!!fotos.length && (
        <div className="galeria-fim">
          {selecionando && <button type="button" className="btn btn-secondary" onClick={aoSelecionarTudo}><Check size={15} />Selecionar tudo desta tela</button>}
          {resto > 0 && <button type="button" className="btn btn-secondary carregar-mais" onClick={() => setLote(atual => Math.min(fotos.length, atual + PASSO))}>Mostrar mais {Math.min(PASSO, resto)} de {resto}</button>}
        </div>
      )}
    </div>
  );
}
