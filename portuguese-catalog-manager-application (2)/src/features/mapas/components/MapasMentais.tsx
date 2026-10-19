/**
 * Mapas mentais: a tela.
 *
 * Duas metades — a lista dos mapas e o plano de um mapa aberto — e uma regra só
 * para escrever: **tudo passa pelo `commit` do contexto**, então o `Ctrl+Z` do
 * aplicativo desfaz o passo (um nó criado, um arrasto, uma ligação, o mapa
 * apagado inteiro). As funções puras de `mapa.ts` devolvem o mesmo objeto quando
 * nada mudaria, e aqui isso é lido como "não grave passo vazio".
 *
 * O painel e o plano são componentes separados (`PainelDoMapa`, `TelaDoMapa`):
 * este arquivo só orquestra estado e gravação, do mesmo jeito que
 * `EditorDeImagem` faz na galeria.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Download, Network, Plus, Trash2, Users, Wand2 } from 'lucide-react';
import type { MapaMental, Person } from '../../../types';
import { useCatalog } from '../../../context';
import { downloadBlob, formatDate } from '../../../store';
import { Button, Confirm, EmptyState, Field, IconButton, Modal, PageTitle } from '../../../components/ui';
import {
  adicionarNo, contornoDoMapa, desligar, editarNo, limitesDoMapa, ligar, mapaDasRelacoes, mapaNovo,
  moverNo, nomeDoContorno, noPorId, organizar, removerNo, renomearMapa, resumoDoMapa,
} from '../mapa';
import type { PontoDoMapa } from '../mapa';
import { exportarMapaPng } from '../tela';
import TelaDoMapa from './TelaDoMapa';
import PainelDoMapa from './PainelDoMapa';

/** O desenho pequeno do mapa no cartão da lista: nós e fios, sem texto. */
function Miniatura({ mapa }: { mapa: MapaMental }) {
  const limites = limitesDoMapa(mapa);
  const largura = Math.max(1, limites.maxX - limites.minX);
  const altura = Math.max(1, limites.maxY - limites.minY);
  return (
    <svg className="mapa-miniatura" viewBox={`${limites.minX} ${limites.minY} ${largura} ${altura}`}
      preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {mapa.ligacoes.map(fio => {
        const de = noPorId(mapa, fio.de);
        const para = noPorId(mapa, fio.para);
        return de && para ? <line key={fio.id} x1={de.x} y1={de.y} x2={para.x} y2={para.y} /> : null;
      })}
      {mapa.nos.map(no => <circle key={no.id} cx={no.x} cy={no.y} r={16} style={{ fill: no.cor }} />)}
    </svg>
  );
}

export default function MapasMentais() {
  const ctx = useCatalog();
  const { data } = ctx;
  const mapas = useMemo(() => data.mapas ?? [], [data.mapas]);
  const pessoas = useMemo(() => data.people.filter(pessoa => !pessoa.deletedAt), [data.people]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [ligando, setLigando] = useState<string | null>(null);
  const [novoMapa, setNovoMapa] = useState(false);
  const [nome, setNome] = useState('');
  const [dasRelacoes, setDasRelacoes] = useState(false);
  const [busca, setBusca] = useState('');
  const [apagar, setApagar] = useState<MapaMental | null>(null);
  const [menu, setMenu] = useState(false);
  const [gerando, setGerando] = useState(false);
  const mapa = mapas.find(item => item.id === aberto) ?? null;
  /**
   * O nome do mapa é um rascunho local, não o valor gravado.
   *
   * Se o campo fosse controlado direto pelo catálogo, apagar tudo para digitar
   * outro nome (ou um espaço no meio da frase) faria o texto pular de volta:
   * `renomearMapa` ignora nome vazio, e um input controlado mostra o que está
   * gravado. Aqui se digita à vontade e se grava no blur e no Enter.
   */
  const [nomeDoMapa, setNomeDoMapa] = useState('');
  useEffect(() => { if (mapa) setNomeDoMapa(mapa.nome); }, [mapa?.id, mapa?.nome]);

  /* ------------------------------------------------------------- gravação -- */
  /** Grava o mapa aberto, ou não faz nada quando a função pura não mudou nada. */
  const gravar = (mudanca: (atual: MapaMental) => MapaMental, mensagem?: string) => {
    if (!mapa) return;
    const proximo = mudanca(mapa);
    if (proximo === mapa) return;
    ctx.commit(dados => ({
      ...dados,
      mapas: (dados.mapas ?? []).map(item => (item.id === proximo.id ? proximo : item)),
    }), mensagem);
  };
  /** Acrescenta um nó, grava e já deixa o nó novo selecionado. */
  const acrescentar = (em: PontoDoMapa, paiId: string | null) => {
    if (!mapa) return;
    const proximo = adicionarNo(mapa, 'Nova ideia', em, paiId);
    const criado = proximo.nos[proximo.nos.length - 1];
    ctx.commit(dados => ({
      ...dados,
      mapas: (dados.mapas ?? []).map(item => (item.id === proximo.id ? proximo : item)),
    }), 'Nó adicionado.');
    if (criado) setSelecionado(criado.id);
  };
  /** Onde um nó novo cabe sem cair em cima do que já está no plano. */
  const pontoLivre = (atual: MapaMental, paiId: string | null): PontoDoMapa => {
    const pai = noPorId(atual, paiId);
    if (pai) return { x: pai.x + 220, y: pai.y + 96 };
    const ultimo = atual.nos[atual.nos.length - 1];
    return ultimo ? { x: ultimo.x + 64, y: ultimo.y + 96 } : { x: 0, y: 0 };
  };

  const criar = () => {
    const novo = mapaNovo(nome);
    ctx.commit(dados => ({ ...dados, mapas: [...(dados.mapas ?? []), novo] }), 'Mapa criado.');
    ctx.sound('pop');
    setNovoMapa(false);
    setNome('');
    setAberto(novo.id);
    setSelecionado(novo.nos[0]?.id ?? null);
  };
  const criarDasRelacoes = (pessoa: Person) => {
    const novo = mapaDasRelacoes(pessoa, data);
    ctx.commit(dados => ({ ...dados, mapas: [...(dados.mapas ?? []), novo] }), `Mapa das relações de ${pessoa.nome} criado.`);
    ctx.sound('pop');
    setDasRelacoes(false);
    setBusca('');
    setAberto(novo.id);
  };
  const gravarNome = () => {
    if (!mapa) return;
    const limpo = nomeDoMapa.trim();
    if (!limpo || limpo === mapa.nome) { setNomeDoMapa(mapa.nome); return; }
    gravar(atual => renomearMapa(atual, limpo), 'Mapa renomeado.');
  };
  const apagarMapa = (alvo: MapaMental) => {
    ctx.commit(dados => ({ ...dados, mapas: (dados.mapas ?? []).filter(item => item.id !== alvo.id) }), 'Mapa apagado. Ainda dá para desfazer.');
    if (aberto === alvo.id) { setAberto(null); setSelecionado(null); }
  };

  /* -------------------------------------------------------------- teclado -- */
  const aoTeclar = (evento: KeyboardEvent) => {
    const alvo = evento.target as HTMLElement | null;
    const digitando = !!alvo && (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName) || alvo.isContentEditable);
    if (evento.key === 'Escape' && ligando) { evento.stopPropagation(); setLigando(null); return; }
    if ((evento.key === 'Delete' || evento.key === 'Backspace') && selecionado && !digitando) {
      evento.preventDefault();
      evento.stopPropagation();
      gravar(atual => removerNo(atual, selecionado), 'Nó removido.');
      setSelecionado(null);
    }
  };
  const tecla = useRef(aoTeclar);
  tecla.current = aoTeclar;
  useEffect(() => {
    if (!mapa) return;
    const ouvir = (evento: KeyboardEvent) => tecla.current(evento);
    window.addEventListener('keydown', ouvir, true);
    return () => window.removeEventListener('keydown', ouvir, true);
  }, [mapa]);

  /* ------------------------------------------------------------- saídas -- */
  const exportarPng = async () => {
    if (!mapa) return;
    setMenu(false);
    setGerando(true);
    try {
      const arquivo = await exportarMapaPng(mapa, pessoas);
      ctx.notify(`Mapa exportado como imagem (${arquivo}).`);
    } catch (erro) {
      ctx.notify((erro as Error).message || 'Não foi possível gerar a imagem do mapa.', true);
    } finally { setGerando(false); }
  };
  const baixarContorno = () => {
    if (!mapa) return;
    setMenu(false);
    if (ctx.privacy) { ctx.notify('O modo privacidade está ligado: nada sai do aparelho.', true); return; }
    downloadBlob(new Blob([contornoDoMapa(mapa, pessoas)], { type: 'text/markdown;charset=utf-8' }), nomeDoContorno(mapa));
    ctx.notify('O contorno do mapa foi baixado em Markdown.');
  };
  const copiarContorno = async () => {
    if (!mapa) return;
    setMenu(false);
    try {
      await navigator.clipboard.writeText(contornoDoMapa(mapa, pessoas));
      ctx.notify('Contorno copiado: dá para colar num e-mail, no caderno ou no chat.');
    } catch { ctx.notify('Não deu para copiar aqui. Baixe o contorno em Markdown.', true); }
  };

  const candidatas = pessoas
    .filter(pessoa => !busca.trim() || pessoa.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .slice(0, 40);

  if (mapa) {
    return (
      <div className="mapas-page mapa-aberto">
        <header className="mapa-topo">
          <button type="button" className="mapa-voltar" onClick={() => { setAberto(null); setSelecionado(null); setLigando(null); setMenu(false); }}>
            <ArrowLeft size={16} />Mapas
          </button>
          <input className="mapa-nome" value={nomeDoMapa} aria-label="Nome do mapa" maxLength={80}
            onChange={evento => setNomeDoMapa(evento.target.value)} onBlur={gravarNome}
            onKeyDown={evento => { if (evento.key === 'Enter') { evento.preventDefault(); gravarNome(); } }} />
          <div className="mapa-acoes">
            <Button onClick={() => acrescentar(pontoLivre(mapa, selecionado), selecionado)}><Plus size={15} />Novo nó</Button>
            <Button onClick={() => gravar(organizar, 'Mapa organizado a partir da raiz.')} disabled={mapa.nos.length < 2}>
              <Wand2 size={15} />Organizar
            </Button>
            <div className="menu-anchor">
              <Button onClick={() => setMenu(!menu)} disabled={gerando}><Download size={15} />{gerando ? 'Gerando…' : 'Exportar'}<ChevronDown size={13} /></Button>
              {menu && (
                <div className="dropdown-menu">
                  <button type="button" onClick={() => { void exportarPng(); }}>Imagem em PNG</button>
                  <button type="button" onClick={baixarContorno}>Contorno em Markdown</button>
                  <button type="button" onClick={() => { void copiarContorno(); }}>Copiar o contorno</button>
                </div>
              )}
            </div>
            <IconButton label="Apagar este mapa" onClick={() => setApagar(mapa)}><Trash2 size={16} /></IconButton>
          </div>
        </header>
        <div className="mapa-corpo">
          <TelaDoMapa mapa={mapa} pessoas={pessoas} selecionado={selecionado} ligando={ligando}
            aoSelecionar={setSelecionado}
            aoMover={(id, para) => gravar(atual => moverNo(atual, id, para))}
            aoRenomear={(id, texto) => gravar(atual => editarNo(atual, id, { texto }))}
            aoCriarAqui={em => acrescentar(em, null)}
            aoLigar={(de, para) => { gravar(atual => ligar(atual, de, para), 'Nós ligados.'); setLigando(null); }}
            aoDesligar={ligacaoId => gravar(atual => desligar(atual, ligacaoId), 'Ligação desfeita.')}
            aoAbrirPessoa={pessoa => ctx.openPerson(pessoa)} />
          <PainelDoMapa mapa={mapa} pessoas={pessoas} selecionado={selecionado} ligando={ligando}
            aoSelecionar={setSelecionado}
            aoRenomear={(id, texto) => gravar(atual => editarNo(atual, id, { texto }))}
            aoPintar={(id, cor) => gravar(atual => editarNo(atual, id, { cor }), 'Cor do nó trocada.')}
            aoAnotar={(id, nota) => gravar(atual => editarNo(atual, id, { nota }))}
            aoVincular={(id, personId) => gravar(atual => editarNo(atual, id, { personId }), personId ? 'Nó vinculado à ficha.' : 'Nó desvinculado da ficha.')}
            aoAbrirPessoa={pessoa => ctx.openPerson(pessoa)}
            aoCriarRamo={id => acrescentar(pontoLivre(mapa, id), id)}
            aoArmarLigacao={() => setLigando(selecionado)}
            aoCancelarLigacao={() => setLigando(null)}
            aoRemover={id => { gravar(atual => removerNo(atual, id), 'Nó removido.'); setSelecionado(null); }} />
        </div>
        {apagar && <Confirm title="Apagar este mapa?" description={`"${apagar.nome}" sai da sua lista. Nada mais é tocado — e o Ctrl+Z do aplicativo ainda devolve.`} confirmLabel="Apagar o mapa" danger onConfirm={() => apagarMapa(apagar)} onClose={() => setApagar(null)} />}
      </div>
    );
  }

  return (
    <div className="mapas-page">
      <PageTitle eyebrow="Ideias no plano" title="Mapas mentais"
        description="Um plano para pensar: nós de texto livre, fios entre eles e, quando quiser, uma ficha do catálogo pendurada num nó.">
        <Button onClick={() => setDasRelacoes(true)} disabled={!pessoas.length}><Users size={16} />Mapa das relações</Button>
        <Button variant="primary" onClick={() => setNovoMapa(true)}><Plus size={17} />Novo mapa</Button>
      </PageTitle>

      {mapas.length ? (
        <div className="mapas-lista">
          {mapas.map(item => {
            const resumo = resumoDoMapa(item, pessoas);
            return (
              <article key={item.id} className="mapa-cartao">
                <Miniatura mapa={item} />
                <button type="button" className="mapa-cartao-abrir" onClick={() => { setAberto(item.id); setSelecionado(null); }}>
                  <strong>{item.nome}</strong>
                  <small>{resumo.nos} {resumo.nos === 1 ? 'nó' : 'nós'} · {resumo.ligacoes} {resumo.ligacoes === 1 ? 'ligação' : 'ligações'}{resumo.pessoas ? ` · ${resumo.pessoas} do catálogo` : ''}</small>
                  <span>Atualizado {formatDate(item.updatedAt, true)}</span>
                </button>
                <IconButton label={`Apagar o mapa ${item.nome}`} onClick={() => setApagar(item)}><Trash2 size={15} /></IconButton>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Network} title="Nenhum mapa ainda"
          description="Um mapa mental serve para pensar uma história, um plano ou a teia de gente em volta de uma ficha. Comece com a ideia central no meio e puxe ramos."
          action="Criar o primeiro mapa" onAction={() => setNovoMapa(true)} />
      )}

      {novoMapa && (
        <Modal title="Um mapa novo" description="O nome aparece na sua lista e no cabeçalho do plano." onClose={() => setNovoMapa(false)}
          footer={<><Button onClick={() => setNovoMapa(false)}>Cancelar</Button><Button variant="primary" disabled={!nome.trim()} onClick={criar}><Plus size={16} />Criar mapa</Button></>}>
          <Field label="Nome do mapa" hint="Ex.: Viagem de julho, História da Ana, Ideias do negócio.">
            <input value={nome} autoFocus maxLength={80} onChange={evento => setNome(evento.target.value)}
              onKeyDown={evento => { if (evento.key === 'Enter' && nome.trim()) criar(); }} placeholder="Sobre o que é este mapa?" />
          </Field>
        </Modal>
      )}

      {dasRelacoes && (
        <Modal title="Mapa das relações" description="Escolha uma ficha: o mapa nasce com ela no meio e os vínculos em volta, cada fio com o nome do parentesco."
          onClose={() => setDasRelacoes(false)}>
          <Field label="Procurar no catálogo">
            <input value={busca} autoFocus onChange={evento => setBusca(evento.target.value)} placeholder="Nome da pessoa" />
          </Field>
          <div className="mapa-escolha">
            {candidatas.map(pessoa => (
              <button type="button" key={pessoa.id} onClick={() => criarDasRelacoes(pessoa)}>{pessoa.nome}</button>
            ))}
            {!candidatas.length && <p className="form-help">Nenhuma ficha com esse nome.</p>}
          </div>
        </Modal>
      )}

      {apagar && <Confirm title="Apagar este mapa?" description={`"${apagar.nome}" sai da sua lista. Nada mais é tocado — e o Ctrl+Z do aplicativo ainda devolve.`} confirmLabel="Apagar o mapa" danger onConfirm={() => apagarMapa(apagar)} onClose={() => setApagar(null)} />}
    </div>
  );
}
