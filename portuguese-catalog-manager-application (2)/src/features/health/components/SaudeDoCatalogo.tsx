import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Activity, Archive, ArrowRight, AudioLines, BellRing, CameraOff, Check, Clock, Copy, Database, Download, Eraser, HardDrive, ImageOff, Images, Link2Off, ShieldCheck, Sparkles, TriangleAlert, UserRound } from 'lucide-react';
import { useCatalog } from '../../../context';
import { Avatar, Button, EmptyState, IconButton, PageTitle, SectionHeading } from '../../../components/ui';
import { loadBackups, storageEstimate } from '../../../lib/storage';
import { formatDate } from '../../../store';
import { analisarSaude, fichasDoAchado, repararCatalogo, type Achado, type AchadoId, type ContextoDeSaude, type Gravidade } from '../diagnostico';

const ICONES: Record<AchadoId, typeof Activity> = {
  duplicatas: Copy,
  referencias_quebradas: Link2Off,
  fotos_repetidas: Images,
  fotos_sem_dono: ImageOff,
  fichas_sem_foto: CameraOff,
  fichas_incompletas: UserRound,
  fichas_paradas: Clock,
  lixeira_antiga: Archive,
  rascunhos_abandonados: Eraser,
  lembretes_atrasados: BellRing,
  backup_vencido: Database,
  espaco_apertado: HardDrive,
  audios_pesados: AudioLines,
};

const GRAVIDADE_LABEL: Record<Gravidade, string> = { critico: 'Crítico', atencao: 'Atenção', dica: 'Dica' };
const PAGINA_LABEL: Record<string, string> = {
  duplicates: 'Ver duplicatas', gallery: 'Abrir galeria', catalog: 'Ver no catálogo',
  drafts: 'Abrir rascunhos', reminders: 'Abrir lembretes', settings: 'Abrir Ajustes',
};

const bytes = (valor: number) => valor >= 1024 * 1024
  ? `${(valor / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  : `${Math.max(1, Math.round(valor / 1024))} KB`;

export default function SaudeDoCatalogo() {
  const ctx = useCatalog();
  const { data } = ctx;
  const [contexto, setContexto] = useState<ContextoDeSaude>({});
  const [filtro, setFiltro] = useState<Gravidade | 'todos'>('todos');
  const [relatorio, setRelatorio] = useState<{ descricao: string; quantidade: number }[] | null>(null);

  // O que só o navegador sabe: idade do último backup e espaço usado.
  useEffect(() => {
    let vivo = true;
    Promise.all([
      loadBackups().catch(() => []),
      storageEstimate().catch(() => null),
    ]).then(([backups, estimativa]) => {
      if (!vivo) return;
      setContexto({
        ultimoBackup: backups[0]?.data || null,
        usoBytes: estimativa?.usage ?? null,
        cotaBytes: estimativa?.quota ?? null,
      });
    });
    return () => { vivo = false; };
  }, [data.people.length]);

  const saude = useMemo(() => analisarSaude(data, contexto), [data, contexto]);
  const achados = filtro === 'todos' ? saude.achados : saude.achados.filter(achado => achado.gravidade === filtro);
  const reparaveis = saude.achados.filter(achado => achado.reparavel).reduce((total, achado) => total + achado.quantidade, 0);
  const { resumo } = saude;

  const faxina = () => {
    const resultado = repararCatalogo(ctx.data, new Date());
    if (!resultado.reparos.length) { ctx.notify('Nada para limpar: todos os ponteiros estão inteiros.'); return; }
    setRelatorio(resultado.reparos);
    ctx.commit(() => resultado.data, 'Faxina de ponteiros concluída.');
  };

  const abrirAchado = (achado: Achado) => {
    if (achado.filtro) ctx.setFilter({ ...ctx.filter, ...achado.filtro });
    if (achado.pagina === 'catalog') ctx.navigate('catalog', 'active');
    else if (achado.pagina) ctx.navigate(achado.pagina);
  };

  const cartoes = [
    { label: 'Fichas ativas', valor: resumo.ativas, detalhe: `${resumo.arquivadas} arquivadas · ${resumo.lixeira} na lixeira` },
    { label: 'Fotos guardadas', valor: resumo.fotos, detalhe: `${resumo.pessoasComFoto} fichas com foto` },
    { label: 'Vozes guardadas', valor: resumo.audios, detalhe: resumo.audios ? `${(resumo.audiosBytes / 1024 / 1024).toFixed(1)} MB de áudio` : 'Nenhum áudio ainda' },
    { label: 'Completude média', valor: `${resumo.completudeMedia}%`, detalhe: 'Nome, descrição, foto, categoria, contato, nota, local e tags' },
    { label: 'Peso do catálogo', valor: bytes(resumo.tamanhoBytes), detalhe: `${resumo.notas} notas · ${resumo.historias} histórias · ${resumo.pastas} pastas` },
    { label: 'Último backup', valor: contexto.ultimoBackup ? formatDate(contexto.ultimoBackup) : 'Nenhum', detalhe: contexto.ultimoBackup ? 'Ponto de restauração local' : 'Só este navegador guarda o catálogo' },
  ];

  return <div className="saude-page">
    <PageTitle eyebrow="Faxina de dados" title="Saúde do catálogo" description="O que está guardado, o que está faltando e o que dá para arrumar com um clique." />

    <section className={`saude-nota ${saude.nota >= 85 ? 'boa' : saude.nota >= 60 ? 'media' : 'baixa'}`} aria-label={`Nota de saúde do catálogo: ${saude.nota} de 100`}>
      <div className="saude-nota-aro" style={{ '--nota': `${saude.nota}%` } as CSSProperties}><strong>{saude.nota}</strong><small>de 100</small></div>
      <div className="saude-nota-copia">
        <h2>{saude.achados.length === 0 ? 'Nada pendente no seu catálogo' : saude.achados.length === 1 ? 'Um ponto pede sua atenção' : `${saude.achados.length} pontos pedem sua atenção`}</h2>
        <p>{saude.achados.length === 0
          ? 'Fichas completas, referências inteiras e backup em dia. É isso que um catálogo cuidado parece.'
          : 'A nota cai conforme o que ficou pela metade: ficha sem foto, duplicata, ponteiro quebrado, lixeira parada ou backup atrasado.'}</p>
        <div className="saude-nota-acoes">
          {reparaveis > 0 && <Button variant="primary" onClick={faxina}><Sparkles size={16} />Fazer a faxina ({reparaveis})</Button>}
          <Button onClick={() => ctx.navigate('settings')}><Download size={16} />Baixar um backup</Button>
        </div>
      </div>
    </section>

    <div className="saude-cartoes">{cartoes.map(cartao => <article key={cartao.label}><small>{cartao.label}</small><strong>{cartao.valor}</strong><span>{cartao.detalhe}</span></article>)}</div>

    {relatorio && <div className="inline-notice saude-relatorio" role="status">
      <Check size={18} />
      <span><strong>Faxina concluída.</strong> {relatorio.map(item => `${item.quantidade} ${item.descricao}`).join(', ')}. Nenhuma ficha, foto ou texto foi apagado — dá para desfazer com Ctrl+Z.</span>
      <IconButton label="Fechar relatório" onClick={() => setRelatorio(null)}><Eraser size={15} /></IconButton>
    </div>}

    <div className="scope-tabs saude-filtros" role="tablist" aria-label="Filtrar por gravidade">
      {(['todos', 'critico', 'atencao', 'dica'] as const).map(valor => <button key={valor} role="tab" aria-selected={filtro === valor} className={filtro === valor ? 'active' : ''} onClick={() => setFiltro(valor)}>
        {valor === 'todos' ? `Tudo (${saude.achados.length})` : `${GRAVIDADE_LABEL[valor]} (${saude.achados.filter(a => a.gravidade === valor).length})`}
      </button>)}
    </div>

    {achados.length ? <div className="saude-lista">{achados.map(achado => {
      const Icone = ICONES[achado.id];
      const fichas = fichasDoAchado(data, achado);
      return <article key={achado.id} className={`saude-achado ${achado.gravidade}`}>
        <header>
          <span className="saude-achado-icone">{achado.gravidade === 'critico' ? <TriangleAlert size={19} /> : <Icone size={19} />}</span>
          <div>
            <h3>{achado.titulo}</h3>
            <p>{achado.descricao}</p>
          </div>
          <span className={`saude-selo ${achado.gravidade}`}>{GRAVIDADE_LABEL[achado.gravidade]}</span>
        </header>
        {!!fichas.length && <div className="saude-fichas">{fichas.map(pessoa => <button key={pessoa.id} onClick={() => ctx.openPerson(pessoa)}><Avatar person={pessoa} size={34} /><span>{pessoa.nome}</span></button>)}{(achado.pessoaIds?.length || 0) > fichas.length && <small>e mais {(achado.pessoaIds?.length || 0) - fichas.length}</small>}</div>}
        <footer>
          {achado.reparavel && <Button onClick={faxina}><Sparkles size={15} />Limpar agora</Button>}
          {achado.pagina && <Button onClick={() => abrirAchado(achado)}>{PAGINA_LABEL[achado.pagina] || 'Abrir'} <ArrowRight size={15} /></Button>}
        </footer>
      </article>;
    })}</div> : saude.achados.length
      ? <EmptyState icon={ShieldCheck} title="Nada nesta gravidade" description="Escolha outra aba para ver o restante do que foi encontrado." />
      : <div className="saude-tudo-certo">
        <SectionHeading icon={ShieldCheck} title="Catálogo em ordem" />
        <p>Continua valendo a regra de ouro: mantenha um backup externo. Este navegador é o único lugar onde o catálogo mora.</p>
        <Button variant="primary" onClick={() => ctx.navigate('settings')}><Download size={16} />Exportar backup completo</Button>
      </div>}
  </div>;
}
