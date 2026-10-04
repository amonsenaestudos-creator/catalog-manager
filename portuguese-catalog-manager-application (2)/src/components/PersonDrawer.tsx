import { useEffect, useState } from 'react';
import { AudioLines, CalendarDays, Camera, Check, ExternalLink, Eye, FileText, FolderOpen, Heart, History, Link2, MapPin, Mic, PersonStanding, Play, Plus, Sparkles, Star, Trash2, Trophy, UserRound, Users } from 'lucide-react';
import { ADULT_APPEARANCE_TAGS } from '../types';
import type { Person } from '../types';
import VisorDeFotos from './VisorDeFotos';
import { useCatalog } from '../context';
import { ageFromBirthday, calculateOverallRating, completeness, corDaPessoa, daysUntil, downloadBlob, downloadJson, formatDate, formatNumber, friendshipLabel, generateId, isAdult, locationLabel, PHOTO_LABELS, RARITY_LABELS, rarityFor, RATING_BLOCKS, RATING_FIELDS, resumoBlocos, resumoDaAvaliacao, upcomingBirthday, visibleRatingFields } from '../store';
import { Radar } from './Charts';
import { exportPersonPng } from '../lib/export';
import { usePersonDraft } from '../hooks/usePersonDraft';
import PersonEditor, { ReadNotes } from './PersonEditor';
import StarRating from './StarRating';
import { Button, Confirm, EmptyState, IconButton, Modal, PhotoView, Tag } from './ui';
import Icebreakers from './Icebreakers';
import { averageRadar, personTimeline } from '../lib/stats';
import { descreverVinculo } from '../lib/relacao';
import { vinculoComigoLabel } from '../types';
import { VozDaPessoa, notasDeVoz, resumoDaVoz } from '../features/voice';
import { RelacoesDaFicha } from '../features/relationships';
import { abrirEmNovaAba, buscaNoYouTube } from '../features/musica';
import { Figura3D, lerForma, resumoDaForma, rotuloDaAltura } from '../features/corpo';
import { BarraDeAcoes, CATEGORIAS_DA_FICHA, LIMITE_DE_HISTORICO, LIMITE_DE_PREVIA, LIMITE_ESSENCIAL, Revelar, acoesDaFicha, categoriaDaAba, contagemDaSecao, iconeDaAcao, organizarAcoes, revelar } from '../features/interface';
import type { CategoriaDaFicha } from '../features/interface';
import { compartilharResumoDaPessoa, mensagemDoCompartilhamento } from '../lib/compartilhar';
import type { TimelineEvent } from '../lib/stats';

const ICONES_DA_CATEGORIA: Record<CategoriaDaFicha, typeof Star> = {
  perfil: UserRound, avaliacoes: Star, midia: Camera, relacoes: Users, registros: History,
};

export default function PersonDrawer({ person }: { person: Person }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const [editing, setEditing] = useState<boolean>(!!ctx.openRequest?.editar || !!data.drafts[`edit-${person.id}`]);
  // O pedido antigo de aba ('photos', 'notes', 'timeline') é traduzido para a
  // categoria nova; `secaoPedida` guarda o nome cru para a ficha abrir já na
  // seção certa dentro da categoria (a linha do tempo, por exemplo).
  const [secaoPedida] = useState(() => (ctx.openRequest?.aba || '').toLowerCase());
  const [tab, setTab] = useState<CategoriaDaFicha>(categoriaDaAba(ctx.openRequest?.aba));
  // A ficha abre na aba/pedido que o menu pediu (editar, fotos, notas...) —
  // o pedido é consumido uma vez: a próxima abertura volta ao normal.
  useEffect(() => { if (ctx.openRequest) ctx.setOpenRequest(null); }, [ctx.openRequest]);
  const [confirmTrash, setConfirmTrash] = useState(false);
  // A foto aberta é um índice: assim o visor pode deslizar entre as fotos da ficha.
  const [fotoAberta, setFotoAberta] = useState(-1);
  const abrirFoto = (url: string | null) => {
    const indice = person.fotos.findIndex(file => file.url === url);
    setFotoAberta(indice >= 0 ? indice : 0);
  };
  const [iceOpen, setIceOpen] = useState(false);
  const [vozOpen, setVozOpen] = useState(false);
  const draft = usePersonDraft(`edit-${person.id}`, 'edit', person);
  const complete = completeness(person);
  const adult = isAdult(person);
  const tags = person.tags.filter(tag => adult || !ADULT_APPEARANCE_TAGS.includes(tag));
  const details = [
    ['Apelido', person.apelido], ['Nível de amizade', friendshipLabel(person.friendshipLevel)], ['Idade', person.idade ? `${person.idade} anos` : ''], ['Altura', rotuloDaAltura(person.altura)],
    ['Pronomes', person.pronome], ['Signo', person.signo],
    ['Cabelo', [person.cabeloTipo, person.cabeloCor === 'colorido' ? person.cabeloCorCustom : person.cabeloCor].filter(Boolean).join(', ')],
    ['Tom de pele', person.pele === 'personalizado' ? person.peleCustom : person.pele], ['Tipo de corpo', person.tipoCorpo], ['Estilo de roupa', person.estiloRoupa],
    ['Onde mora', person.localizacaoMora], ['Contato', person.redesSociais], ['Como conheceu', person.comoConheceu], ['Música favorita', person.musicaFavorita],
    ['O que ela é sua', person.vinculoComigo ? vinculoComigoLabel(person.vinculoComigo) : 'Automático, pela idade'], ['Família no catálogo', descreverVinculo(person, data.people).join(' · ')],
    ['Q.I. (anotação)', person.qi], ['Última interação', person.ultimoVisto ? formatDate(person.ultimoVisto) : ''], ['Adicionada em', formatDate(person.createdAt)],
    ...(person.aniversario ? [['Aniversário', `${formatDate(person.aniversario)}${upcomingBirthday(person.aniversario) !== null ? ` · faltam ${upcomingBirthday(person.aniversario)} dias` : ''}`]] : []),
    ...(person.customFields || []).map(custom => [custom.label, custom.value] as [string, string]),
  ];
  const notas = notasDeVoz(person).length;
  const resumoDaVozDaPessoa = resumoDaVoz(person);
  const resumo = {
    duracao: `${Math.floor(resumoDaVozDaPessoa.duracao / 60)}:${String(resumoDaVozDaPessoa.duracao % 60).padStart(2, '0')}`,
    rotuloDoPeso: resumoDaVozDaPessoa.bytes >= 1024 * 1024 ? `${(resumoDaVozDaPessoa.bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(resumoDaVozDaPessoa.bytes / 1024))} KB`,
  };
  /** Resumo em texto da ficha, para mandar para alguém sem abrir o aplicativo. */
  const compartilhar = async () => {
    const resultado = await compartilharResumoDaPessoa(person, data);
    const aviso = mensagemDoCompartilhamento(resultado, 'ficha');
    if (resultado === 'compartilhado' || resultado === 'copiado') ctx.sound('compartilhar');
    ctx.notify(aviso.texto, aviso.erro);
  };
  const exportImage = async () => {
    if (ctx.privacy) return;
    try { await exportPersonPng(person, data); ctx.notify('Imagem da ficha exportada.'); }
    catch (error) { ctx.notify((error as Error).message, true); }
  };
  const moveArchive = () => { ctx.changePeople([person.id], { archivedAt: person.archivedAt ? null : new Date().toISOString() }, person.archivedAt ? 'Ficha desarquivada.' : 'Ficha arquivada.'); };
  /**
   * O plano de ações da ficha: quais ficam na barra e o que vai para o "⋯".
   * O corte é do domínio (`organizarAcoes`); aqui só ligamos cada id ao que
   * ele faz — o `switch` de sempre, agora em um lugar só.
   */
  const planoDaFicha = organizarAcoes(acoesDaFicha({ categoria: tab, favorita: person.favorite, arquivada: !!person.archivedAt }));
  const executarAcao = (id: string) => {
    switch (id) {
      case 'editar': setEditing(true); return;
      case 'conversar': ctx.openChat(person); ctx.closePerson(); return;
      case 'vi-hoje': ctx.seenToday([person.id]); return;
      case 'favoritar': ctx.changePeople([person.id], { favorite: !person.favorite }, person.favorite ? 'Removida dos favoritos.' : 'Adicionada aos favoritos.'); if (!person.favorite) ctx.sound('pop'); return;
      case 'puxar-assunto': setIceOpen(true); return;
      case 'compartilhar': void compartilhar(); return;
      case 'voz': setVozOpen(true); return;
      case 'adicionar-foto': case 'reavaliar': case 'nova-nota': setEditing(true); return;
      case 'nova-meta': case 'pasta': setTab('perfil'); return;
      case 'ver-relacoes': setTab('relacoes'); return;
      case 'tags': setTab('perfil'); setEditing(true); return;
      case 'fixar': ctx.togglePinned(person.id); return;
      case 'arquivar': moveArchive(); return;
      case 'duplicar': ctx.duplicate(person); return;
      case 'exportar-png': void exportImage(); return;
      case 'exportar-json': downloadJson(person, `catalog-ficha-${person.id}.json`); return;
      case 'imprimir': window.print(); return;
      case 'lembrete': ctx.navigate('reminders'); ctx.closePerson(); return;
      case 'lixeira': setConfirmTrash(true); return;
      default: return;
    }
  };
  return <Modal title={editing ? `Editar ${person.nome}` : 'Fichário pessoal'} description={person.archivedAt ? 'Esta ficha está arquivada. Seus dados e vínculos continuam preservados.' : undefined} onClose={ctx.closePerson} wide className="person-drawer">
    {editing ? <PersonEditor {...draft} onDiscard={draft.discard} onSave={() => { if (ctx.savePerson(draft.person, `edit-${person.id}`)) setEditing(false); }} onCancel={ctx.closePerson} /> : <div className="person-read no-print" style={{ '--pessoa': corDaPessoa(person) } as React.CSSProperties}>
      <div className="person-cover">
        <button className="cover-photo" onClick={() => { if (person.fotos.length) abrirFoto(person.fotos.find(f => f.isMain)?.url || person.fotos[0]?.url); }}>
          <PhotoView person={person} /><span><Camera size={16} />Ver foto</span>
        </button>
        <div className="person-intro">
          <div className="intro-top"><span className="eyebrow">{person.archivedAt ? 'No arquivo' : 'Sua conexão'}</span><IconButton label={person.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => { ctx.changePeople([person.id], { favorite: !person.favorite }, person.favorite ? 'Removida dos favoritos.' : 'Adicionada aos favoritos.'); if (!person.favorite) ctx.sound('pop'); }}><Heart size={21} fill={person.favorite ? 'currentColor' : 'none'} className={person.favorite ? 'pink' : ''} /></IconButton></div>
          <h2><i className="person-dot" style={{ background: corDaPessoa(person) }} />{person.nome}</h2><p className="person-location"><MapPin size={15} />{locationLabel(person, data)}</p>
          <span className={`rarity-chip rarity-${person.rarity || rarityFor(calculateOverallRating(person.rating))}`}><Sparkles size={12} />{RARITY_LABELS[person.rarity || rarityFor(calculateOverallRating(person.rating))]}{person.aniversario && ageFromBirthday(person.aniversario) !== null && <small> · {ageFromBirthday(person.aniversario)} anos</small>}</span>
          <StarRating value={calculateOverallRating(person.rating)} readonly size={21} />
          <p className="friendship-read">{friendshipLabel(person.friendshipLevel)}<span>Nível de amizade · não afeta a nota</span></p>
          <p className="person-description">{person.descricao}</p><div className="tags">{tags.map(tag => <Tag key={tag} name={tag} />)}</div>
          {/* Barra de ação contextual: 2 a 3 ações prováveis + "⋯" agrupado.
              As ações mudam com a categoria aberta — ver `features/interface`. */}
          <BarraDeAcoes className="person-primary-actions" plano={planoDaFicha} iconeDe={iconeDaAcao}
            sufixoDe={id => id === 'vi-hoje' ? <small>{person.viHojeCount}</small> : null}
            titulo={`Mais ações · ${person.nome}`} subtitulo="Organização, ferramentas e o resto"
            aoEscolher={executarAcao} />
          <div className="completion-line"><div><span>Ficha {complete.percent}% completa</span><span>{complete.percent === 100 ? <Check size={14} /> : `${complete.missing.length} detalhes a preencher`}</span></div><span className="progress-track"><i style={{ width: `${complete.percent}%` }} /></span></div>
        </div>
      </div>
      {/* Cinco categorias no lugar de oito abas: o que era uma aba por tipo de
          dado virou uma aba por intenção. A tradução do pedido antigo
          ("photos", "notes", "timeline") acontece no domínio de interface. */}
      <div className="editor-tabs">
        {CATEGORIAS_DA_FICHA.map(categoria => {
          const Icone = ICONES_DA_CATEGORIA[categoria.id];
          const contagem = categoria.id === 'midia' ? person.fotos.length : categoria.id === 'registros' ? person.notas.length : (person.ratingHistory || []).length;
          return <button key={categoria.id} className={tab === categoria.id ? 'active' : ''} onClick={() => setTab(categoria.id)} title={categoria.resumo}>
            <Icone size={17} />{categoria.rotulo}{contagem > 0 && <small key={contagem} className="contagem-animada">{contagem}</small>}
          </button>;
        })}
      </div>
      {tab === 'perfil' && (() => {
        const sobre = revelar(details, LIMITE_ESSENCIAL);
        const pastas = data.folders.filter(folder => folder.personIds.includes(person.id));
        // Música favorita não termina no texto: o "Ouvir" abre a busca pelo nome guardado.
        const fatos = (lista: (string | undefined)[][]) => <dl className="person-facts">{lista.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}{label === 'Música favorita' && person.musicaFavorita && <button type="button" className="musica-ouvir" onClick={() => abrirEmNovaAba(buscaNoYouTube(person.musicaFavorita || ''))}><Play size={11} />Ouvir</button>}</dd></div>)}</dl>;
        return <>
          {/* Regra do "uma decisão por vez": a ficha responde primeiro "quem é
              ela" com as três informações principais; o resto abre a um toque. */}
          <Revelar titulo="Sobre" icone={FileText} contagem={`${sobre.total} ${sobre.total === 1 ? 'informação' : 'informações'}`}
            resumo={sobre.restantes > 0 ? `As ${LIMITE_ESSENCIAL} principais agora; mais ${sobre.restantes} a um toque.` : 'Tudo o que você já anotou sobre ela.'}
            previa={fatos(sobre.visiveis)}>
            {fatos(details)}
            {person.observacoesGerais && <section className="read-text"><h3>Observações gerais</h3><p>{person.observacoesGerais}</p></section>}
            {person.comportamento && <section className="read-text"><h3>Comportamento</h3><p>{person.comportamento}</p></section>}
            {person.descricaoCorporal && <section className="read-text"><h3>Descrição corporal</h3><p>{person.descricaoCorporal}</p></section>}
          </Revelar>
          <Revelar titulo="Pastas" icone={FolderOpen} contagem={pastas.length || ''} abertoInicial={secaoPedida === 'pastas'}
            resumo={pastas.length ? `Em ${pastas.map(pasta => pasta.name).join(' · ')}` : 'Reúna esta ficha numa pasta — ou em várias — sem duplicar nada.'}>
            <div className="collection-picker">{data.folders.map(folder => <button className={folder.personIds.includes(person.id) ? 'selected' : ''} key={folder.id} onClick={() => ctx.commit(d => ({ ...d, folders: d.folders.map(x => x.id === folder.id ? { ...x, personIds: x.personIds.includes(person.id) ? x.personIds.filter(id => id !== person.id) : [...x.personIds, person.id], updatedAt: new Date().toISOString() } : x) }), 'Pasta atualizada.')}><span style={{ background: folder.color }} />{folder.name}{folder.personIds.includes(person.id) && <Check size={13} />}</button>)}{!data.folders.length && <p className="muted">Crie uma pasta em Organizar para reunir fichas, notas e fotos.</p>}</div>
          </Revelar>
          <div className="read-text"><h3><Link2 size={15} />Anexos</h3><div className="attachment-links">{(person.attachments || []).map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={13} /><span>{item.label || 'Anexo'}<small>{item.kind.toUpperCase()}</small></span></a>)}</div></div>
        </>;
      })()}
      {tab === 'avaliacoes' && (() => {
        // A figura vem das notas: fica onde elas estão, e abre a um toque.
        const forma = lerForma(person);
        return <><div className="rating-summary"><div><h3>Nota geral</h3><p>{person.rating.mode === 'manual' ? 'Definida manualmente' : 'Média ponderada dos atributos preenchidos'}</p></div><strong>{formatNumber(calculateOverallRating(person.rating))}<small>/ 5</small></strong></div>{(person.ratingComment || '').trim() && <p className="rating-comentario-aviso">“{person.ratingComment?.trim()}”</p>}
        {RATING_BLOCKS.map(block => { const campos = block.keys.map(key => RATING_FIELDS.find(f => f.key === key)).filter((f): f is (typeof RATING_FIELDS)[number] => !!f).filter(f => !f.adult || adult); if (!campos.length) return null; const resumo = resumoBlocos(person.rating, visibleRatingFields(data.settings), adult).find(b => b.id === block.id); return <section className="rating-block" key={block.id}><div className="rating-block-head"><h3>{block.label}</h3>{resumo && resumo.media != null && <span className="rating-block-media">{formatNumber(resumo.media)} / 5 · {resumo.preenchidos}/{resumo.total}</span>}</div><div className="rating-fields">{campos.map(field => <div key={field.key} className="rating-field"><span>{field.label}<small>Peso {formatNumber(field.weight)}</small></span><StarRating value={person.rating[field.key]} readonly size={21} /></div>)}</div></section>; })}
        {(() => { const evolucao = (person.ratingHistory || []).slice(-12); if (evolucao.length < 2) return null; const anterior = evolucao[evolucao.length - 2].overall; const atual = evolucao[evolucao.length - 1].overall; const delta = Math.round((atual - anterior) * 10) / 10; return <div className="rating-evolucao"><h3>Evolução da nota</h3><div className="rating-evolucao-bars" aria-label={`Evolução da nota nos últimos ${evolucao.length} registros`}>{evolucao.map((entry, index) => <div key={`${entry.date}-${index}`} className="rating-evolucao-col" title={`${formatDate(entry.date)} — ${formatNumber(entry.overall)}` + (entry.comment ? ` — “${entry.comment}”` : '')}><div className="rating-evolucao-track"><div className="rating-evolucao-bar" style={{ height: `${Math.max(8, (entry.overall / 5) * 100)}%` }} /></div><time>{formatDate(entry.date).slice(0, 5)}</time></div>)}</div><p className="form-help">{delta > 0 ? `Subiu ${formatNumber(delta)} em relação à avaliação anterior.` : delta < 0 ? `Quedou ${formatNumber(Math.abs(delta))} em relação à avaliação anterior.` : 'Estável em relação à avaliação anterior.'}</p></div>; })()}
        {(person.ratingHistory || []).length > 0 && <div className="rating-history-block"><h3>Histórico da nota</h3><ul className="rating-history rating-history-rich">{(person.ratingHistory || []).slice(-8).reverse().map((entry, index) => <li key={`${entry.date}-${index}`} className="rating-history-item"><div className="rating-history-head"><time>{formatDate(entry.date)}</time><strong>{formatNumber(entry.overall)}</strong></div>{entry.comment && <p className="rating-history-comment">“{entry.comment}”</p>}</li>)}</ul></div>}
        {(() => { const resumo = resumoDaAvaliacao(person, data.settings); return <div className="rating-resumo ficha-resumo"><h3>Resumo visual</h3><div className="rating-resumo-grid"><div className="rating-resumo-geral"><strong>{formatNumber(resumo.overall)}</strong><small>nota geral / 5</small></div>{resumo.blocos.map(b => <div className="rating-resumo-bloco" key={b.id}><span>{b.label}</span><div className="rating-bar" aria-hidden="true"><i style={{ width: `${((b.media ?? 0) / 5) * 100}%` }} /></div><strong>{b.media != null ? formatNumber(b.media) : '—'}</strong></div>)}</div></div>; })()}
        <div className="rating-radar"><h3>Radar comparado à média</h3><Radar axes={RATING_FIELDS.filter(field => !field.adult || adult).map(field => field.label)} series={[{ name: person.nome, values: RATING_FIELDS.filter(field => !field.adult || adult).map(field => person.rating[field.key] || 0) }, { name: 'Média do catálogo', values: averageRadar(data).filter(item => RATING_FIELDS.filter(field => !field.adult || adult).some(field => field.label === item.label)).map(item => item.value) }]} /></div>
        {/* "Corpo em 3D": o manequim montado das notas e da altura, na categoria
            em que as notas vivem. Fechado, ele resume o que a figura mostra. */}
        <Revelar titulo="Corpo em 3D" icone={PersonStanding} contagem={forma.explicacoes.filter(item => item.muda).length}
          resumo={`Manequim montado do que a ficha já sabe. ${resumoDaForma(forma.proporcoes)}`}>
          <Figura3D person={person} />
        </Revelar>
      </>; })()}
      {tab === 'relacoes' && <RelacoesDaFicha person={person} />}
      {tab === 'registros' && (() => {
        const metas = data.goals.filter(goal => goal.personId === person.id);
        const eventos = personTimeline(person, data).length;
        return <>
          <Revelar titulo="Notas" icone={FileText} contagem={person.notas.length} abertoInicial={secaoPedida === 'notes' || secaoPedida === 'notas'}
            resumo={person.notas.length ? 'As anotações antigas desta ficha.' : 'Nenhuma anotação ainda.'}>
            <ReadNotes person={person} />
          </Revelar>
          <Revelar titulo="Objetivos" icone={Trophy} contagem={metas.filter(meta => !meta.done).length || ''} abertoInicial={secaoPedida === 'goals' || secaoPedida === 'metas'}
            resumo="O que vocês combinaram: puxar assunto, marcar um café, o que vier.">
            <PersonGoals personId={person.id} personName={person.nome} />
          </Revelar>
          <Revelar titulo="Linha do tempo" icone={History} contagem={eventos} abertoInicial={secaoPedida === 'timeline'}
            resumo={eventos > LIMITE_DE_HISTORICO ? `Os ${LIMITE_DE_HISTORICO} últimos de ${eventos} registros.` : 'Cadastro, fotos, interações, encontros e metas em ordem.'}>
            <PersonTimeline person={person} />
          </Revelar>
        </>;
      })()}
      {tab === 'midia' && <>
        {/* "📸 Fotos 12 ˅": com muitas fotos a seção vira prévia de seis — e o resto abre na galeria inteira. */}
        {(() => {
          const albuns = revelar(person.fotos, LIMITE_DE_PREVIA);
          const grade = (lista: typeof person.fotos) => <div className="gallery-grid drawer-gallery">{lista.map(file => <button key={file.id} onClick={() => setFotoAberta(person.fotos.findIndex(f => f.id === file.id))}><PhotoView src={file.url} alt={person.nome} />{file.isMain && <span className="photo-caption"><Star size={13} />Foto principal</span>}</button>)}{!lista.length && <EmptyState icon={Camera} title="Sua galeria começa aqui" action="Adicionar fotos" onAction={() => setEditing(true)} />}</div>;
          return albuns.temMais
            ? <Revelar titulo="Fotos" icone={Camera} contagem={contagemDaSecao(albuns.total)} resumo={`Mostrando ${LIMITE_DE_PREVIA} de ${albuns.total}.`} previa={grade(albuns.visiveis)} acao="Ver todas na galeria" aoAcionar={() => { ctx.closePerson(); ctx.navigate('gallery'); }}>{grade(person.fotos)}</Revelar>
            : grade(person.fotos);
        })()}
              <div className="read-text voz-bloco">
        <h3><AudioLines size={15} />A voz de {person.nome.split(' ')[0]}</h3>
        {notas > 0
          ? <><p>{notas} {notas === 1 ? 'áudio guardado' : 'áudios guardados'} · {resumo.duracao} de voz · {resumo.rotuloDoPeso} no catálogo.</p>
            <div className="voz-bloco-acoes"><Button onClick={() => setVozOpen(true)}><Mic size={15} />Ouvir a voz</Button><Button variant="ghost" onClick={() => setVozOpen(true)}><Plus size={15} />Gravar outro</Button></div></>
          : <><p>Guarde um “oi”, uma risada ou um recado. Depois é só tocar quando quiser lembrar como ela soa — e o aplicativo também pode falar por ela.</p>
            <Button onClick={() => setVozOpen(true)}><Mic size={15} />Gravar a voz</Button></>}
      </div>
      </>}

    </div>}
    <article className="print-only print-region"><h1>{person.nome}</h1><p>{locationLabel(person, data)}</p><PhotoView person={person} /><p>{person.descricao}</p><dl>{details.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl><h2>Avaliações</h2>{RATING_FIELDS.filter(field => !field.adult || adult).map(field => <p key={field.key}>{field.label}: {formatNumber(person.rating[field.key])} / 5</p>)}<h2>Notas</h2>{person.notas.map(note => <section key={note.id}><h3>{note.title}</h3><p>{note.content}</p></section>)}<h3>Observações</h3><p>{person.observacoesGerais}</p>{(person.customFields || []).map(custom => <p key={custom.id}>{custom.label}: {custom.value}</p>)}<p>{person.comportamento}</p><p>{person.descricaoCorporal}</p></article>
    {confirmTrash && <Confirm title="Mover esta ficha para a lixeira?" description="As fotos, notas e vínculos serão preservados. Você poderá restaurar a ficha a qualquer momento." confirmLabel="Mover para lixeira" danger onConfirm={() => ctx.trashPeople([person.id])} onClose={() => setConfirmTrash(false)} />}
    {fotoAberta >= 0 && !!person.fotos.length && (
      <VisorDeFotos fotos={person.fotos} indice={Math.min(fotoAberta, person.fotos.length - 1)} aoMudar={setFotoAberta} aoFechar={() => setFotoAberta(-1)}
        titulo={() => person.nome} apoio={file => `${file.isMain ? 'Foto principal · ' : ''}${PHOTO_LABELS[file.type]}`}
        aoFavoritar={file => ctx.togglePhotoFavorite(file.id)}
        aoBaixar={async file => {
          try {
            const blob = await (await fetch(file.url)).blob();
            const extensao = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' } as Record<string, string>)[blob.type] || 'png';
            downloadBlob(blob, `${(file.name || `foto-${person.nome}`).replace(/\.[^.]+$/, '')}.${extensao}`);
          } catch { ctx.notify('Não foi possível baixar esta imagem.', true); }
        }} />
    )}
    {vozOpen && <VozDaPessoa person={person} onClose={() => setVozOpen(false)} />}
    {iceOpen && <Icebreakers person={person} onClose={() => setIceOpen(false)} onStartChat={() => { setIceOpen(false); ctx.openChat(person); ctx.closePerson(); }} />}
  </Modal>;
}
/** Checklist de objetivos por pessoa: puxar assunto, pegar o número, marcar encontro. */
function PersonGoals({ personId, personName }: { personId: string; personName: string }) {
  const ctx = useCatalog(), { data } = ctx;
  const [title, setTitle] = useState('');
  const goals = data.goals.filter(goal => goal.personId === personId).sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt));
  const done = goals.filter(goal => goal.done).length;
  const add = () => {
    const text = title.trim();
    if (!text) { ctx.notify('Escreva o objetivo primeiro.', true); return; }
    ctx.commit(d => ({ ...d, goals: [...d.goals, { id: generateId(), title: text, done: false, personId, due: null, kind: 'conexao', createdAt: new Date().toISOString() }] }), 'Objetivo adicionado.');
    ctx.addXp(2, 'Novo objetivo de conexão');
    setTitle('');
  };
  const toggle = (id: string, isDone: boolean) => { ctx.commit(d => ({ ...d, goals: d.goals.map(goal => goal.id === id ? { ...goal, done: !isDone, doneAt: !isDone ? new Date().toISOString() : null } : goal) }), isDone ? 'Objetivo reaberto.' : 'Objetivo concluído!'); if (!isDone) ctx.sound('success'); };
  return <div className="person-goals">
    <div className="goal-progress"><span>{done} de {goals.length} concluídos com {personName}</span><i><b style={{ width: `${goals.length ? done / goals.length * 100 : 0}%` }} /></i></div>
    <form className="goal-add" onSubmit={event => { event.preventDefault(); add(); }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: puxar assunto, pegar o número, marcar um café" maxLength={140} aria-label="Novo objetivo" />
      <Button variant="primary" onClick={add}><Plus size={16} />Adicionar</Button>
    </form>
    {goals.length ? <ul className="goal-checklist">{goals.map(goal => { const left = daysUntil(goal.due); return <li key={goal.id} className={goal.done ? 'done' : ''}>
      <button className={`complete-reminder ${goal.done ? 'checked' : ''}`} onClick={() => toggle(goal.id, goal.done)} aria-label={goal.done ? 'Reabrir objetivo' : 'Concluir objetivo'}>{goal.done && <Check size={15} />}</button>
      <span><strong>{goal.title}</strong>{goal.due && <small className={left !== null && left < 0 && !goal.done ? 'overdue' : ''}> · {left !== null && left < 0 && !goal.done ? 'prazo vencido' : left === 0 ? 'vence hoje' : `até ${formatDate(goal.due)}`}</small>}{goal.doneAt && <small> · feito em {formatDate(goal.doneAt)}</small>}</span>
      <IconButton label="Definir prazo" onClick={() => { const due = window.prompt('Prazo (AAAA-MM-DD), vazio para tirar:', goal.due || ''); if (due === null) return; ctx.commit(d => ({ ...d, goals: d.goals.map(item => item.id === goal.id ? { ...item, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null } : item) }), 'Prazo atualizado.'); }}><CalendarDays size={15} /></IconButton>
      <IconButton label="Excluir objetivo" onClick={() => ctx.commit(d => ({ ...d, goals: d.goals.filter(item => item.id !== goal.id) }), 'Objetivo excluído.')}><Trash2 size={15} /></IconButton>
    </li>; })}</ul> : <EmptyState icon={Trophy} title="Nenhum objetivo ainda" description="Pequenos passos ajudam: puxar assunto, pegar o número, marcar um encontro." />}
  </div>;
}

const TIMELINE_ICONS: Record<TimelineEvent['kind'], typeof Camera> = { cadastro: Sparkles, foto: Camera, interacao: Eye, nota: FileText, historia: FileText, lembrete: CalendarDays, encontro: CalendarDays, conversa: FileText, meta: Trophy, 'nota-geral': Star, duelo: Trophy };
/** Linha do tempo da pessoa: cadastro, fotos, interações, notas, encontros, conversas e metas em uma só lista. */
function PersonTimeline({ person }: { person: Person }) {
  const { data } = useCatalog();
  const events = personTimeline(person, data);
  if (!events.length) return <EmptyState icon={History} title="A linha do tempo começa agora" description="Interações, fotos, encontros e conversas vão aparecer aqui em ordem." />;
  return <ol className="person-timeline">{events.slice(0, 80).map(event => { const Icon = TIMELINE_ICONS[event.kind]; return <li key={event.id} className={`timeline-${event.kind}`}>
    <span className="timeline-dot"><Icon size={12} /></span>
    <div><time>{formatDate(event.date)}</time><strong>{event.title}</strong>{event.detail && <p>{event.detail}</p>}</div>
  </li>; })}{events.length > 80 && <li className="timeline-more"><span className="timeline-dot" /><div><small>… e mais {events.length - 80} registros anteriores.</small></div></li>}</ol>;
}
