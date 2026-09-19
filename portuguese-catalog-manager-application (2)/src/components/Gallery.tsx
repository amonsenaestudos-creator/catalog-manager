/**
 * Galeria do Catalog.
 *
 * A tela foi montada em volta de três ideias:
 *   · o mosaico usa a proporção real de cada foto, então o conjunto parece um
 *     álbum e não uma tabela de quadrados cortados;
 *   · no celular o visor ocupa a tela inteira, com deslizar, pinça e puxar para
 *     baixo — e os metadados sobem numa folha em vez de sumir atrás de um ícone;
 *   · segurar uma foto abre a folha de ações, que é o menu de contexto do dedo.
 * Filtro, ordem e modo de ver vivem no mesmo lugar nas duas telas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Camera, Check, ChevronUp, Copy, Download, Folder, Grid3x3, Heart, ImagePlus, Layers, LayoutGrid, Link2, Lock, Scale, Search, SlidersHorizontal, Trash2, Unlink, X } from 'lucide-react';
import type { Album, Photo } from '../types';
import { useCatalog } from '../context';
import { downloadBlob, findDuplicatePhotos, formatDate, generateId, getAllPhotos, isAdult, medirImagem, normalizePhotos, PHOTO_LABELS, readImage } from '../store';
import { Button, CheckBox, Confirm, EmptyState, Field, IconButton, Modal, PageTitle, PhotoView } from './ui';
import { BeforeAfter, AlbumManager, DuplicateList } from './GalleryExtras';
import { PhotoUploader } from './PersonEditor';
import { Folha, FolhaDeAcoes } from './Folha';
import type { AcaoDeFolha } from './Folha';
import GaleriaGrade from './GaleriaGrade';
import VisorDeFotos from './VisorDeFotos';
import { FILTROS_PADRAO, MODOS_GALERIA, ORDENACOES, aplicarFiltros, chipsDeFiltro, contarFiltrosAtivos, fotoEmPasta, lerModoSalvo, resumoDaGaleria, salvarModo } from '../lib/galeria';
import type { FiltrosDeGaleria, ModoGaleria } from '../lib/galeria';
import { movimentoReduzido } from '../lib/toque';
import { useFaixasGrudadas } from '../hooks/useFaixasGrudadas';
import { useSelecaoLote } from '../hooks/useSelecaoLote';

const MODO_CHAVE = 'catalog_galeria_modo';
const TIPOS: { valor: FiltrosDeGaleria['tipo']; nome: string }[] = [
  { valor: '', nome: 'Todas' }, { valor: 'normal', nome: 'Normal' }, { valor: 'biquini', nome: 'Biquíni' }, { valor: 'sem_nada', nome: 'Sem nada' },
];

export default function Gallery() {
  const ctx = useCatalog(), { data } = ctx;
  const [view, setView] = useState<'fotos' | 'albuns' | 'duplicadas' | 'comparar'>('fotos');
  const [modo, setModo] = useState<ModoGaleria>(() => lerModoSalvo(MODO_CHAVE) || 'mosaico');
  const [filtros, setFiltros] = useState<FiltrosDeGaleria>({ ...FILTROS_PADRAO });
  const [folha, setFolha] = useState<'filtros' | 'pasta' | 'album' | null>(null);
  const [visor, setVisor] = useState(-1);
  const [sobAcao, setSobAcao] = useState<Photo | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [comparePair, setComparePair] = useState<[string, string]>(['', '']);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPerson, setUploadPerson] = useState('');
  const [uploadType, setUploadType] = useState<Photo['type']>('normal');
  const [prepared, setPrepared] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [deleting, setDeleting] = useState<Photo | null>(null);
  const [apagarLote, setApagarLote] = useState(false);

  const allPhotos = useMemo(() => getAllPhotos(data), [data]);
  const duplicateGroups = useMemo(() => findDuplicatePhotos(data), [data]);
  const filtradas = useMemo(() => aplicarFiltros(allPhotos, filtros, data), [allPhotos, filtros, data]);
  const lote = useSelecaoLote(filtradas);
  const selecionando = lote.ativa;
  const selecionadas = lote.ids;
  const resumo = useMemo(() => resumoDaGaleria(filtradas), [filtradas]);
  const chips = useMemo(() => chipsDeFiltro(filtros, data), [filtros, data]);
  const ativos = contarFiltrosAtivos(filtros);
  const nomeDe = useCallback((photo: Photo) => data.people.find(person => person.id === photo.personId)?.nome || 'Sem ficha', [data.people]);
  const pastaDe = useCallback((photo: Photo) => data.folders.find(folder => fotoEmPasta(photo, folder.id, data.folders))?.name || 'Sem pasta', [data.folders]);

  useEffect(() => {
    if (!filtros.pessoa) return;
    if (filtros.pessoa !== '__orphan' && !data.people.some(person => person.id === filtros.pessoa)) setFiltros(f => ({ ...f, pessoa: '' }));
  }, [data.people, filtros.pessoa]);
  useEffect(() => { salvarModo(MODO_CHAVE, modo); }, [modo]);
  /* A barra grudada embaixo das abas: sticky não sabe a altura do sticky vizinho,
     então a página mede as duas faixas e entrega os números para o CSS. */
  const pagina = useRef<HTMLDivElement>(null);
  const estiloPagina = useFaixasGrudadas(pagina, [chips.length, ativos, modo, view]);

  const mudar = <K extends keyof FiltrosDeGaleria,>(chave: K, valor: FiltrosDeGaleria[K]) => setFiltros(f => ({ ...f, [chave]: valor }));
  const limparFiltros = () => setFiltros({ ...FILTROS_PADRAO });
  /** Tira um filtro ligado pelo chip correspondente, sem abrir a folha. */
  const removerChip = (chave: keyof FiltrosDeGaleria) => setFiltros(f => ({
    ...f,
    [chave]: chave === 'favoritas' ? false : chave === 'ordem' ? 'recent' : '',
  }));

  /** Um toque no polegar devolve o começo do álbum; sem rolagem de braço. */
  const subir = () => {
    ctx.buzz?.(8);
    window.scrollTo({ top: 0, behavior: movimentoReduzido() ? 'auto' : 'smooth' });
  };

  const abrir = (photo: Photo) => setVisor(Math.max(0, filtradas.findIndex(item => item.id === photo.id)));
  const fecharVisor = useCallback(() => setVisor(-1), []);

  /* Um lote só para a galeria e para o cofre: o mesmo gesto, a mesma barra do pé. */
  const alternar = lote.alternar;
  const sairDaSelecao = lote.sair;
  const segurar = (photo: Photo) => { ctx.buzz?.(14); setSobAcao(photo); };

  const baixar = async (photo: Photo) => {
    if (ctx.privacy) return;
    try {
      const blob = await (await fetch(photo.url)).blob();
      const extensao = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' } as Record<string, string>)[blob.type] || 'png';
      const nome = (photo.name || 'catalog-foto').replace(/\.[^.]+$/, '');
      if (!document.documentElement.classList.contains('privacy-active')) downloadBlob(blob, `${nome}.${extensao}`);
    } catch { ctx.notify('Não foi possível baixar esta imagem.', true); }
  };

  const favoritar = (photo: Photo) => ctx.togglePhotoFavorite(photo.id);
  const guardarNoCofre = (photo: Photo) => ctx.commit(d => ({ ...d, vault: { ...d.vault, photoIds: [...new Set([...d.vault.photoIds, photo.id])] } }), 'Foto guardada no cofre do seu espaço pessoal.');
  const relink = (photo: Photo, personId: string | null) => {
    const owner = data.people.find(p => p.id === personId);
    if (personId && (!owner || owner.deletedAt)) { ctx.notify('Escolha uma ficha disponível.', true); return false; }
    if (photo.type !== 'normal' && owner && !isAdult(owner)) { ctx.notify('Este tipo de mídia só pode ser vinculado a fichas adultas.', true); return false; }
    ctx.commit(d => ({
      ...d,
      people: d.people.map(p => { const remaining = p.fotos.filter(f => f.id !== photo.id); return { ...p, fotos: normalizePhotos(p.id === personId ? [...remaining, { ...photo, personId, isMain: remaining.length === 0 }] : remaining, p.id) }; }),
      orphanPhotos: personId ? d.orphanPhotos.filter(f => f.id !== photo.id) : [...d.orphanPhotos.filter(f => f.id !== photo.id), { ...photo, personId: null, isMain: false }],
    }), personId ? `Foto vinculada a ${owner?.nome}.` : 'Foto desvinculada. Ela continua na galeria.');
    return true;
  };
  const mudarTipo = (photo: Photo, tipo: Photo['type']) => {
    const owner = data.people.find(p => p.id === photo.personId);
    if (tipo !== 'normal' && owner && !isAdult(owner)) { ctx.notify('Esta classificação só está disponível para fichas adultas.', true); return; }
    ctx.commit(d => ({ ...d, people: d.people.map(p => ({ ...p, fotos: p.fotos.map(f => f.id === photo.id ? { ...f, type: tipo } : f) })), orphanPhotos: d.orphanPhotos.map(f => f.id === photo.id ? { ...f, type: tipo } : f) }), 'Tipo da foto atualizado.');
  };
  const moverParaPasta = (photoIds: string[], folderId: string) => {
    ctx.commit(d => ({
      ...d,
      folders: d.folders.map(folder => ({ ...folder, photoIds: folder.id === folderId ? [...new Set([...folder.photoIds, ...photoIds])] : folder.photoIds.filter(id => !photoIds.includes(id)), updatedAt: new Date().toISOString() })),
      people: d.people.map(person => ({ ...person, fotos: person.fotos.map(photo => photoIds.includes(photo.id) ? { ...photo, folderId: folderId || null } : photo) })),
      orphanPhotos: d.orphanPhotos.map(photo => photoIds.includes(photo.id) ? { ...photo, folderId: folderId || null } : photo),
    }), folderId ? 'Fotos organizadas na pasta.' : 'Fotos removidas da pasta.');
  };
  const paraOAbum = (photoIds: string[], albumId: string) => {
    ctx.commit(d => ({ ...d, albums: d.albums.map(album => album.id === albumId ? { ...album, photoIds: [...new Set([...album.photoIds, ...photoIds])], updatedAt: new Date().toISOString() } : album) }), `${photoIds.length} foto(s) no álbum.`);
  };
  const excluirFoto = (photo: Photo) => {
    ctx.commit(d => ({ ...d, orphanPhotos: d.orphanPhotos.filter(f => f.id !== photo.id), people: d.people.map(p => ({ ...p, fotos: normalizePhotos(p.fotos.filter(f => f.id !== photo.id), p.id) })) }), 'Foto removida.');
    fecharVisor();
  };
  const excluirLote = () => {
    const ids = selecionadas;
    ctx.commit(d => ({ ...d, orphanPhotos: d.orphanPhotos.filter(f => !ids.includes(f.id)), people: d.people.map(p => ({ ...p, fotos: normalizePhotos(p.fotos.filter(f => !ids.includes(f.id)), p.id) })) }), `${ids.length} foto(s) removidas.`);
    sairDaSelecao();
  };
  const favoritarLote = () => {
    const ids = selecionadas;
    ctx.commit(d => ({ ...d, people: d.people.map(p => ({ ...p, fotos: p.fotos.map(f => ids.includes(f.id) ? { ...f, favorite: true } : f) })), orphanPhotos: d.orphanPhotos.map(f => ids.includes(f.id) ? { ...f, favorite: true } : f) }), `${ids.length} foto(s) nas favoritas.`);
  };
  const cofreLote = () => {
    const ids = selecionadas;
    ctx.commit(d => ({ ...d, vault: { ...d.vault, photoIds: [...new Set([...d.vault.photoIds, ...ids])] } }), `${ids.length} foto(s) no cofre.`);
  };

  const showUploader = () => { setUploadOpen(true); setPrepared([]); setConsent(false); setUploadPerson(''); setUploadType('normal'); };
  const prepare = async (files: File[]) => {
    setBusy(true);
    try {
      const fotos = await Promise.all(files.map(async file => {
        const url = await readImage(file);
        const { width, height } = await medirImagem(url);
        return { id: generateId(), url, width, height, name: file.name, personId: null, isMain: false, type: 'normal' as const, createdAt: new Date().toISOString() };
      }));
      setPrepared(lista => [...lista, ...fotos]);
    } catch (error) { ctx.notify((error as Error).message, true); } finally { setBusy(false); }
  };
  const upload = () => {
    if (!prepared.length || busy) return;
    const owner = data.people.find(p => p.id === uploadPerson);
    if (uploadType !== 'normal' && (!consent || owner && !isAdult(owner))) { ctx.notify('Mídias adultas exigem confirmação e vínculo com uma pessoa maior de idade.', true); return; }
    const fotos = prepared.map(p => ({ ...p, type: uploadType, personId: uploadPerson || null }));
    ctx.commit(d => ({ ...d, orphanPhotos: uploadPerson ? d.orphanPhotos : [...d.orphanPhotos, ...fotos], people: uploadPerson ? d.people.map(p => p.id === uploadPerson ? { ...p, fotos: normalizePhotos([...p.fotos, ...fotos], p.id) } : p) : d.people }), `${fotos.length} foto(s) adicionada(s) à galeria.`);
    ctx.sound('shutter');
    setUploadOpen(false); setPrepared([]);
  };

  /** O visor já tem a folha de detalhes com o excluir; o toque longo, não. */
  const acoesDaFoto = (photo: Photo, comExcluir = true): AcaoDeFolha[] => [
    { rotulo: photo.favorite ? 'Tirar das favoritas' : 'Guardar nas favoritas', icone: Heart, onClick: () => favoritar(photo) },
    { rotulo: selecionadas.includes(photo.id) ? 'Tirar do lote' : 'Escolher no lote', icone: Check, onClick: () => alternar(photo, false) },
    { rotulo: 'Baixar a imagem', icone: Download, onClick: () => { void baixar(photo); } },
    { rotulo: 'Enviar ao cofre', icone: Lock, onClick: () => ctx.commit(d => ({ ...d, vault: { ...d.vault, photoIds: [...new Set([...d.vault.photoIds, photo.id])] } }), 'Foto guardada no cofre do seu espaço pessoal.') },
    { rotulo: photo.personId ? `Vinculada a ${nomeDe(photo)}` : 'Sem ficha vinculada', icone: Link2, detalhe: 'abrir os detalhes', onClick: () => abrir(photo) },
    ...(comExcluir ? [{ rotulo: 'Excluir foto', icone: Trash2, perigo: true, onClick: () => setDeleting(photo) } as AcaoDeFolha] : []),
  ];

  const detalhesDaFoto = (photo: Photo) => {
    const vinculo = data.people.find(p => p.id === photo.personId);
    return (
      <div className="visor-detalhes-corpo">
        <div className="visor-detalhes-foto"><PhotoView src={photo.url} alt={nomeDe(photo)} /></div>
        <dl className="visor-dados">
          <div><dt>Pessoa</dt><dd>{vinculo?.nome || 'Sem ficha vinculada'}</dd></div>
          <div><dt>Pasta</dt><dd>{pastaDe(photo)}</dd></div>
          <div><dt>Tipo</dt><dd>{PHOTO_LABELS[photo.type]}</dd></div>
          <div><dt>Entrou em</dt><dd>{formatDate(photo.capturedAt || photo.createdAt)}</dd></div>
          <div><dt>Arquivo</dt><dd>{photo.name || '—'}</dd></div>
          {photo.description ? <div><dt>Anotação</dt><dd>{photo.description}</dd></div> : null}
        </dl>
        <Field label="Vincular a uma ficha">
          <select defaultValue={photo.personId || ''} onChange={event => { if (event.target.value) relink(photo, event.target.value); }}>
            <option value="">Sem ficha (foto avulsa)</option>
            {data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}{p.archivedAt ? ' (arquivada)' : ''}</option>)}
          </select>
        </Field>
        {photo.personId && <Button onClick={() => relink(photo, null)}><Unlink size={15} />Soltar da ficha</Button>}
        <Field label="Mover para pasta">
          <select value={data.folders.find(f => fotoEmPasta(photo, f.id, data.folders))?.id || ''} onChange={event => moverParaPasta([photo.id], event.target.value)}>
            <option value="">Sem pasta</option>
            {data.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Tipo da mídia">
          <select value={photo.type} onChange={event => mudarTipo(photo, event.target.value as Photo['type'])}>
            {Object.entries(PHOTO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <div className="visor-detalhes-acoes">
          <Button onClick={() => guardarNoCofre(photo)}><Lock size={15} />Guardar no cofre</Button>
          <Button variant="danger" onClick={() => setDeleting(photo)}><Trash2 size={15} />Excluir</Button>
        </div>
      </div>
    );
  };

  const folhaFiltros = (
    <Folha titulo="Filtrar a galeria" descricao="Escolha o que aparece e em que ordem" aoFechar={() => setFolha(null)} largura="larga"
      rodape={<><Button onClick={limparFiltros}><X size={15} />Limpar</Button><Button variant="primary" onClick={() => setFolha(null)}>Ver {filtradas.length} {filtradas.length === 1 ? 'foto' : 'fotos'}</Button></>}>
      <Field label="Buscar">
        <span className="search-field"><Search size={16} /><input value={filtros.busca} onChange={event => mudar('busca', event.target.value)} placeholder="Nome do arquivo, anotação ou pessoa" /></span>
      </Field>
      <Field label="Pessoa">
        <select value={filtros.pessoa} onChange={event => mudar('pessoa', event.target.value)}>
          <option value="">Todas as pessoas</option>
          <option value="__orphan">Só as fotos sem ficha</option>
          {data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}{p.archivedAt ? ' (arquivada)' : ''}</option>)}
        </select>
      </Field>
      <Field label="Pasta">
        <select value={filtros.pasta} onChange={event => mudar('pasta', event.target.value)}>
          <option value="">Todas as pastas</option>
          <option value="__orphan-folder">Só as fotos sem pasta</option>
          {data.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>
      <Field label="Álbum">
        <select value={filtros.album} onChange={event => mudar('album', event.target.value)}>
          <option value="">Todos os álbuns</option>
          {data.albums.map(album => <option key={album.id} value={album.id}>{album.name}</option>)}
        </select>
      </Field>
      <Field label="Ordem">
        <select value={filtros.ordem} onChange={event => mudar('ordem', event.target.value as FiltrosDeGaleria['ordem'])}>
          {ORDENACOES.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </Field>
      <div className="gallery-switches">
        <CheckBox checked={filtros.favoritas} onChange={() => mudar('favoritas', !filtros.favoritas)} label="Só as favoritas" />
        <p className="field-hint">{filtradas.length} de {allPhotos.length} {allPhotos.length === 1 ? 'foto' : 'fotos'} passam por essa peneira.</p>
      </div>
    </Folha>
  );

  const folhaDeDestino = (tipo: 'pasta' | 'album') => {
    const opcoes = tipo === 'pasta' ? data.folders.map(f => ({ id: f.id, nome: f.name })) : data.albums.map(a => ({ id: a.id, nome: a.name }));
    return (
      <Folha titulo={tipo === 'pasta' ? 'Mover para pasta' : 'Adicionar ao álbum'} descricao={`${selecionadas.length} foto(s) escolhidas`} aoFechar={() => setFolha(null)}
        rodape={tipo === 'pasta' ? <Button onClick={() => { moverParaPasta(selecionadas, ''); sairDaSelecao(); setFolha(null); }}><Unlink size={15} />Tirar da pasta</Button> : undefined}>
        {!opcoes.length && <p className="field-hint">{tipo === 'pasta' ? 'Nenhuma pasta ainda. Crie uma em Pastas.' : 'Nenhum álbum ainda. Crie um na aba Álbuns.'}</p>}
        <div className="folha-opcoes">
          {opcoes.map(opcao => (
            <button type="button" key={opcao.id} onClick={() => { if (tipo === 'pasta') moverParaPasta(selecionadas, opcao.id); else paraOAbum(selecionadas, opcao.id); sairDaSelecao(); setFolha(null); }}>
              {tipo === 'pasta' ? <Folder size={18} /> : <Layers size={18} />}<span>{opcao.nome}</span>
            </button>
          ))}
        </div>
      </Folha>
    );
  };

  return <div className="gallery-page" ref={pagina} style={estiloPagina}>
    <PageTitle eyebrow="Suas memórias, em imagens" title="Galeria"
      description={allPhotos.length ? `${resumo.total} ${resumo.total === 1 ? 'foto' : 'fotos'} · ${resumo.favoritas} favoritas · ${resumo.dias} ${resumo.dias === 1 ? 'dia guardado' : 'dias guardados'}` : 'Uma coleção de momentos que merecem ficar.'}>
      <Button onClick={() => (selecionando ? sairDaSelecao() : lote.entrar())}><Check size={16} />{selecionando ? 'Sair da seleção' : 'Organizar fotos'}</Button>
      <Button variant="primary" onClick={showUploader}><ImagePlus size={18} />Adicionar fotos</Button>
    </PageTitle>

    <div className="scope-tabs">
      <button className={view === 'fotos' ? 'active' : ''} onClick={() => setView('fotos')}><Camera size={15} />Fotos<span>{allPhotos.length}</span></button>
      <button className={view === 'albuns' ? 'active' : ''} onClick={() => setView('albuns')}><Layers size={15} />Álbuns<span>{data.albums.length}</span></button>
      <button className={view === 'duplicadas' ? 'active' : ''} onClick={() => setView('duplicadas')}><Copy size={15} />Duplicadas<span>{duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)}</span></button>
      <button className={view === 'comparar' ? 'active' : ''} onClick={() => setView('comparar')}><Scale size={15} />Antes e depois</button>
    </div>

    {view === 'albuns' && <AlbumManager editing={editingAlbum} setEditing={setEditingAlbum} onOpenAlbum={id => { mudar('album', id); setView('fotos'); }} />}
    {view === 'duplicadas' && <DuplicateList groups={duplicateGroups} />}
    {view === 'comparar' && <BeforeAfter photos={allPhotos} pair={comparePair} setPair={setComparePair} />}

    {view === 'fotos' && <>
      {/* A faixa grudada: tipo, filtro e modo ficam à mão enquanto o álbum rola. */}
      <div className="gallery-topo">
        <div className="gallery-barra">
          <div className="gallery-tipos" role="group" aria-label="Tipo de mídia">
            {TIPOS.map(item => <button key={item.valor || 'todas'} type="button" className={filtros.tipo === item.valor ? 'active' : ''} onClick={() => mudar('tipo', item.valor)}>{item.nome}</button>)}
          </div>
          <div className="gallery-barra-fim">
            <span className="gallery-contagem">{filtradas.length} fotos</span>
            <button type="button" className={`deusa-toggle ${filtros.favoritas ? 'active' : ''}`} onClick={() => mudar('favoritas', !filtros.favoritas)}><Heart size={14} fill={filtros.favoritas ? 'currentColor' : 'none'} />Favoritas</button>
            <button type="button" className={`gallery-ajuste ${ativos ? 'ligado' : ''}`} onClick={() => setFolha('filtros')}><SlidersHorizontal size={16} />Filtros{ativos > 0 && <b>{ativos}</b>}</button>
            <div className="gallery-modos" role="group" aria-label="Modo de ver">
              {MODOS_GALERIA.map(item => <button key={item.id} type="button" title={item.dica} aria-label={`Ver como ${item.nome}`} aria-pressed={modo === item.id} className={modo === item.id ? 'active' : ''} onClick={() => setModo(item.id)}>
                {item.id === 'mosaico' ? <Grid3x3 size={16} /> : item.id === 'quadra' ? <LayoutGrid size={16} /> : <CalendarDays size={16} />}<span>{item.nome}</span>
              </button>)}
            </div>
            <button type="button" className="gallery-topo-volta" onClick={subir} aria-label="Voltar ao começo da galeria"><ChevronUp size={16} /></button>
          </div>
        </div>
        {!!chips.length && <div className="gallery-chips-ativos">
          {chips.map(chip => <button type="button" key={chip.chave} onClick={() => removerChip(chip.chave)}><X size={13} />{chip.rotulo}</button>)}
          <button type="button" className="limpar" onClick={limparFiltros}>Limpar tudo</button>
        </div>}
      </div>

      <p className="gallery-ajuda">{modo === 'mosaico' ? MODOS_GALERIA[0].dica : modo === 'quadra' ? MODOS_GALERIA[1].dica : MODOS_GALERIA[2].dica} <span>Segure uma foto para abrir as ações.</span></p>

      {filtradas.length ? (
        <GaleriaGrade fotos={filtradas} modo={modo} dados={data} selecionando={selecionando} selecionadas={selecionadas}
          aoAbrir={abrir} aoAlternar={alternar} aoFavoritar={favoritar} aoSegurar={segurar}
          aoSelecionarTudo={lote.selecionarTudo} />
      ) : (
        <EmptyState icon={Camera} title={ativos || filtros.favoritas ? 'Nada com esses filtros' : 'Um lugar para suas melhores lembranças'}
          description={ativos || filtros.favoritas ? 'Ajuste a peneira para ver outras fotos do catálogo.' : 'Adicione fotos agora e vincule a uma pessoa depois, se quiser.'}
          action={ativos || filtros.favoritas ? 'Limpar filtros' : 'Adicionar fotos'}
          onAction={() => (ativos || filtros.favoritas ? limparFiltros() : showUploader())} />
      )}

      <button type="button" className="gallery-fab" onClick={showUploader}><ImagePlus size={20} />Adicionar fotos</button>

      {selecionando && (
        <div className="gallery-lote" role="group" aria-label="Ações do lote">
          <strong>{selecionadas.length ? `${selecionadas.length} escolhida${selecionadas.length === 1 ? '' : 's'}` : 'Toque nas fotos'}</strong>
          <div>
            <button type="button" onClick={() => setFolha('pasta')}><Folder size={17} />Pasta</button>
            <button type="button" onClick={() => setFolha('album')}><Layers size={17} />Álbum</button>
            <button type="button" disabled={!selecionadas.length} onClick={() => { favoritarLote(); sairDaSelecao(); }}><Heart size={17} />Favoritar</button>
            <button type="button" disabled={!selecionadas.length} onClick={() => { cofreLote(); sairDaSelecao(); }}><Lock size={17} />Cofre</button>
            <button type="button" className="perigo" disabled={!selecionadas.length} onClick={() => setApagarLote(true)}><Trash2 size={17} />Excluir</button>
            <button type="button" onClick={sairDaSelecao}>Concluir</button>
          </div>
        </div>
      )}

      {visor >= 0 && !!filtradas.length && (
        <VisorDeFotos fotos={filtradas} indice={Math.min(visor, filtradas.length - 1)} aoMudar={setVisor} aoFechar={fecharVisor}
          titulo={nomeDe} apoio={photo => `${formatDate(photo.capturedAt || photo.createdAt)} · ${pastaDe(photo)}`}
          aoFavoritar={favoritar} aoBaixar={photo => { void baixar(photo); }} acoes={photo => acoesDaFoto(photo, false)}
          selecionada={!!filtradas[Math.min(visor, filtradas.length - 1)] && selecionadas.includes(filtradas[Math.min(visor, filtradas.length - 1)].id)} aoAlternarSelecao={photo => alternar(photo, false)}
          detalhes={detalhesDaFoto} />
      )}

      {sobAcao && (
        <FolhaDeAcoes titulo={nomeDe(sobAcao)} subtitulo={`${formatDate(sobAcao.capturedAt || sobAcao.createdAt)} · ${PHOTO_LABELS[sobAcao.type]}`}
          aoFechar={() => setSobAcao(null)} acao={{ rotulo: 'Abrir a foto', onClick: () => abrir(sobAcao) }} itens={acoesDaFoto(sobAcao)} />
      )}

      {folha === 'filtros' && folhaFiltros}
      {(folha === 'pasta' || folha === 'album') && folhaDeDestino(folha)}
    </>}

    {uploadOpen && <Modal title="Adicionar fotos" description="Selecione várias imagens de uma vez. Você decide se quer vinculá-las agora." onClose={() => setUploadOpen(false)} wide footer={<><span className="muted small">{prepared.length} foto(s) selecionada(s)</span><Button onClick={() => setUploadOpen(false)}>Cancelar</Button><Button variant="primary" disabled={!prepared.length || busy || uploadType !== 'normal' && !consent} onClick={upload}><ImagePlus size={16} />Adicionar à galeria</Button></>}>
      <div className="form-grid">
        <Field label="Vincular a uma pessoa"><select value={uploadPerson} onChange={e => { setUploadPerson(e.target.value); setUploadType('normal'); }}><option value="">Não vincular agora (foto órfã)</option>{data.people.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
        <Field label="Tipo da foto"><select value={uploadType} onChange={e => setUploadType(e.target.value as Photo['type'])}>{Object.entries(PHOTO_LABELS).map(([value, label]) => <option key={value} value={value} disabled={value !== 'normal' && !!uploadPerson && !isAdult(data.people.find(p => p.id === uploadPerson)!)}>{label}</option>)}</select></Field>
      </div>
      {uploadType !== 'normal' && <CheckBox checked={consent} onChange={() => setConsent(!consent)} label="Confirmo que as imagens são de adultos e que tenho autorização para guardá-las." />}
      <PhotoUploader onFiles={prepare} busy={busy} large />
      {!!prepared.length && <p className="field-hint">{prepared.length} foto(s) prontas — a proporção de cada arquivo já foi medida para o mosaico.</p>}
      <div className="upload-previews">{prepared.map(p => <div key={p.id}><PhotoView src={p.url} alt={p.name} /><IconButton label="Remover imagem da seleção" onClick={() => setPrepared(list => list.filter(f => f.id !== p.id))}><X size={14} /></IconButton><span>{p.name}</span></div>)}</div>
      <p className="form-help">As imagens são otimizadas em WebP para manter o catálogo leve. Não são enviadas a nenhum servidor.</p>
    </Modal>}

    {deleting && <Confirm title="Remover esta foto?" description="A ficha da pessoa e suas notas não serão alteradas. Você pode desfazer esta alteração durante a sessão." danger confirmLabel="Remover foto" onClose={() => setDeleting(null)} onConfirm={() => { excluirFoto(deleting); setDeleting(null); }} />}
    {apagarLote && <Confirm title={`Remover ${selecionadas.length} foto(s)?`} description="Nenhuma ficha é apagada: só as imagens saem da galeria. Ainda dá para desfazer durante a sessão." danger confirmLabel="Remover fotos" onClose={() => setApagarLote(false)} onConfirm={excluirLote} />}
  </div>;
}
