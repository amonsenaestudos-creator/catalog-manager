/**
 * O mesmo ajuste de luz e cor em várias fotos de uma vez.
 *
 * Fotos do mesmo lugar saem com o mesmo problema: todas escuras, todas azuis,
 * todas sem graça. Editar uma por uma é o tipo de trabalho que faz a pessoa
 * desistir no meio — então o lote da galeria oferece aplicar **a mesma receita**
 * em todas as fotos escolhidas.
 *
 * Três decisões:
 *   · **A prévia não usa canvas.** O que se vê é a primeira foto escolhida com o
 *     filtro em CSS (`filtroCss`), que é exatamente a string que o canvas vai
 *     usar na hora de gravar — então a prévia não mente, e funciona até onde não
 *     há canvas.
 *   · **Uma gravação só, um desfazer só.** Todas as fotos entram num único
 *     `commit`: `Ctrl+Z` devolve o lote inteiro, em vez de obrigar a desfazer
 *     foto por foto.
 *   · **O que falha é dito, não escondido.** Foto que não abriu (outro site,
 *     arquivo removido) fica fora e aparece pelo nome; as outras são gravadas.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import type { Photo } from '../../../types';
import { useCatalog } from '../../../context';
import { Folha } from '../../../components/Folha';
import { Button } from '../../../components/ui';
import {
  AJUSTES_NEUTROS, FILTROS_PRONTOS, LIMITES_DO_AJUSTE, ajustesNeutros, edicaoInicial,
  filtroAtivo, filtroCss, guardarFotoEditada,
} from '../edicao';
import type { Ajustes, ResultadoDaEdicao } from '../edicao';
import { carregarImagem, exportarEdicao, tamanhoNatural } from '../tela';

export interface AjusteEmLoteProps {
  fotos: Photo[];
  aoFechar: () => void;
  /** Quantas fotos foram gravadas e quantas não deram — quem chama pode reagir. */
  aoTerminar?: (gravadas: number, falhas: number) => void;
}

const numero = (valor: number) => (Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ','));

export default function AjusteEmLote({ fotos, aoFechar, aoTerminar }: AjusteEmLoteProps) {
  const ctx = useCatalog();
  const [ajustes, setAjustes] = useState<Ajustes>({ ...AJUSTES_NEUTROS });
  const [andamento, setAndamento] = useState<{ feitas: number; total: number } | null>(null);
  const [falhas, setFalhas] = useState<string[]>([]);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const exemplo = fotos[0];
  const neutro = ajustesNeutros(ajustes);
  const filtro = filtroAtivo(ajustes);
  const total = fotos.length;

  const fechar = () => { if (!andamento) aoFechar(); };
  const mudar = (chave: keyof Ajustes, valor: number) => setAjustes(atual => ({ ...atual, [chave]: valor }));

  async function aplicar() {
    if (neutro || !total || andamento) return;
    setFalhas([]);
    setAndamento({ feitas: 0, total });
    const gravadas: { fotoId: string; resultado: ResultadoDaEdicao }[] = [];
    const nomesFalhas: string[] = [];

    for (const [indice, foto] of fotos.entries()) {
      // Uma foto por vez: cada uma decodifica, desenha e reencoda, e o aparelho
      // precisa de um respiro entre elas para a barra de progresso existir.
      const imagem = await carregarImagem(foto.url);
      const resultado = imagem ? exportarEdicao(imagem, { ...edicaoInicial(tamanhoNatural(imagem)), ajustes }) : null;
      if (resultado) gravadas.push({ fotoId: foto.id, resultado });
      else nomesFalhas.push(foto.name || 'foto sem nome');
      if (!vivo.current) return;
      setAndamento({ feitas: indice + 1, total });
      await new Promise<void>(resolver => { window.setTimeout(resolver, 0); });
    }
    if (!vivo.current) return;

    if (gravadas.length) {
      ctx.commit(dados => {
        let novo = dados;
        for (const item of gravadas) novo = guardarFotoEditada(novo, item.fotoId, item.resultado, 'substituir');
        return novo;
      }, gravadas.length === 1
        ? 'Luz e cor ajustadas na foto.'
        : `Luz e cor ajustadas em ${gravadas.length} fotos.`);
      ctx.buzz?.(12);
    }
    setFalhas(nomesFalhas);
    setAndamento(null);
    if (nomesFalhas.length) {
      ctx.notify(
        nomesFalhas.length === total
          ? 'Nenhuma foto pôde ser ajustada: os arquivos não abriram aqui.'
          : `${nomesFalhas.length} de ${total} fotos não abriram e ficaram de fora.`,
        true,
      );
    }
    aoTerminar?.(gravadas.length, nomesFalhas.length);
    if (gravadas.length && !nomesFalhas.length) aoFechar();
  }

  return (
    <Folha titulo="Ajustar a luz de várias fotos" descricao={`${total} ${total === 1 ? 'foto escolhida' : 'fotos escolhidas'} · nada sai do aparelho`}
      aoFechar={fechar} largura="larga" className="ajuste-lote-folha"
      rodape={<>
        <Button onClick={fechar} disabled={!!andamento}>Cancelar</Button>
        <Button variant="primary" onClick={() => { void aplicar(); }} disabled={neutro || !total || !!andamento}>
          <Check size={16} />
          {andamento ? `Ajustando ${andamento.feitas} de ${andamento.total}…` : `Aplicar em ${total} ${total === 1 ? 'foto' : 'fotos'}`}
        </Button>
      </>}>
      <div className="ajuste-lote">
        {!total && <p className="field-hint">Nenhuma foto escolhida. Volte ao lote e toque nas fotos.</p>}

        {!!exemplo && (
          <div className="ajuste-lote-previa">
            <figure>
              <img src={exemplo.url} alt="" draggable={false} />
              <figcaption>Antes</figcaption>
            </figure>
            <figure>
              <img src={exemplo.url} alt="" draggable={false} style={{ filter: filtroCss(ajustes) }} />
              <figcaption>Depois · {exemplo.name || 'primeira foto'}</figcaption>
            </figure>
          </div>
        )}

        <div className="ajuste-lote-grupo">
          <h3>Receitas prontas</h3>
          <div className="ajuste-lote-filtros">
            {FILTROS_PRONTOS.map(item => (
              <button type="button" key={item.id} className={`ajuste-lote-filtro ${filtro === item.id ? 'ativo' : ''}`}
                title={item.dica} aria-pressed={filtro === item.id}
                onClick={() => setAjustes({ ...item.ajustes })}>
                {!!exemplo && <img src={exemplo.url} alt="" draggable={false} style={{ filter: filtroCss(item.ajustes) }} />}
                <span>{item.nome}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ajuste-lote-grupo">
          <h3>
            Luz e cor
            <button type="button" className="ajuste-lote-zerar" onClick={() => setAjustes({ ...AJUSTES_NEUTROS })} disabled={neutro}>
              <RotateCcw size={13} />Zerar
            </button>
          </h3>
          <div className="ajuste-lote-trilhos">
            {LIMITES_DO_AJUSTE.map(item => (
              <label className="ajuste-lote-trilho" key={item.chave} title={item.dica}>
                <span>{item.nome}<b>{numero(ajustes[item.chave])}{item.unidade}</b></span>
                <input type="range" min={item.minimo} max={item.maximo} step={item.passo} value={ajustes[item.chave]}
                  aria-label={item.nome} onChange={evento => mudar(item.chave, Number(evento.target.value))} />
              </label>
            ))}
          </div>
        </div>

        {andamento && (
          <p className="ajuste-lote-progresso" role="status">
            <span style={{ width: `${Math.round((andamento.feitas / andamento.total) * 100)}%` }} />
          </p>
        )}

        {!!falhas.length && (
          <p className="ajuste-lote-falhas" role="alert">
            <AlertTriangle size={15} />
            <span>Não abriu: {falhas.join(', ')}. Foto que está em outro site não pode ser reencodada — baixe o arquivo e envie de novo para ajustar aqui.</span>
          </p>
        )}

        <p className="field-hint">
          Cada foto é gravada de novo com o ajuste aplicado, no mesmo tamanho e no formato que o aparelho usa.
          As fichas, pastas, álbuns e corações continuam os mesmos, e um <strong>Ctrl+Z</strong> devolve o lote inteiro.
        </p>
      </div>
    </Folha>
  );
}
