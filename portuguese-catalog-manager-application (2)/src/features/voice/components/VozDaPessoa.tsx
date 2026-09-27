import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, CircleStop, Heart, Mic, Pause, Play, Share2, Sparkles, Trash2, Upload, Volume2, X } from 'lucide-react';
import type { Person, VozNota } from '../../../types';
import { useCatalog } from '../../../context';
import { Button, Confirm, Field, IconButton, Modal } from '../../../components/ui';
import { downloadBlob, generateId } from '../../../store';
import { compartilharArquivo, compartilharTexto, resumoDaPessoa } from '../../../lib/compartilhar';
import { iniciarGravacao, lerArquivoDeAudio, motivoSemMicrofone, type Gravador } from '../gravador';
import { falar, pararDeFalar, rotuloDaVoz, vozSuportada, vozesDisponiveis } from '../sintetizador';
import { cabeNovaNota, formatarDuracao, formatarPeso, notasDeVoz, perfilDeVoz, pesoDoAudio, resumoDaVoz, textoDeApresentacao, tituloDaNota, VOZ_RITMO, VOZ_TOM } from '../voz';

type Aba = 'ouvir' | 'gravar' | 'falar';

/**
 * Voz da pessoa: os áudios de verdade dela, a gravação nova e a voz sintetizada
 * que fala pela ficha. A tela reúne as três coisas porque elas respondem à
 * mesma pergunta — “como essa pessoa soa?”.
 */
export default function VozDaPessoa({ person, onClose }: { person: Person; onClose: () => void }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const [aba, setAba] = useState<Aba>(() => (notasDeVoz(person).length ? 'ouvir' : 'gravar'));
  const [notas, setNotas] = useState<VozNota[]>(() => notasDeVoz(person));
  const [tocando, setTocando] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [erro, setErro] = useState('');
  const [titulo, setTitulo] = useState('');
  const [previa, setPrevia] = useState<{ url: string; duracao: number; bytes: number } | null>(null);
  const [apagar, setApagar] = useState<VozNota | null>(null);
  const [falandoAgora, setFalandoAgora] = useState(false);
  const [vozEscolhida, setVozEscolhida] = useState(person.perfilVoz?.voz || '');
  const [tom, setTom] = useState(person.perfilVoz?.tom ?? perfilDeVoz(person).tom);
  const [ritmo, setRitmo] = useState(person.perfilVoz?.ritmo ?? perfilDeVoz(person).ritmo);
  const gravador = useRef<Gravador | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const resumo = useMemo(() => resumoDaVoz({ vozes: notas }), [notas]);
  const [vozes, setVozes] = useState(() => vozesDisponiveis());
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const atualizar = () => setVozes(vozesDisponiveis());
    atualizar();
    window.speechSynthesis.addEventListener?.('voiceschanged', atualizar);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', atualizar);
  }, []);
  const automatico = perfilDeVoz(person);

  useEffect(() => () => { gravador.current?.cancelar(); pararDeFalar(); }, []);

  const salvarNotas = (lista: VozNota[], mensagem: string) => {
    setNotas(lista);
    ctx.commit(d => ({ ...d, people: d.people.map(p => p.id === person.id ? { ...p, vozes: lista, updatedAt: new Date().toISOString() } : p) }), mensagem);
  };

  const comecar = async () => {
    setErro('');
    try {
      const ferramenta = await iniciarGravacao({ aoAndar: (s, n) => { setSegundos(s); setNivel(n); }, limiteSegundos: 300, aoLimite: () => void encerrar() });
      gravador.current = ferramenta;
      setGravando(true); setSegundos(0);
      ctx.sound('gravando'); ctx.buzz?.(12);
    } catch (problema) {
      setErro((problema as Error).message || motivoSemMicrofone(problema));
    }
  };

  const encerrar = async () => {
    const ferramenta = gravador.current;
    if (!ferramenta) return;
    try {
      const capturado = await ferramenta.parar();
      setGravando(false); setNivel(0);
      const veredito = cabeNovaNota({ vozes: notas }, capturado.bytes);
      if (!veredito.ok) { setErro(veredito.motivo || 'Esta nota não cabe.'); return; }
      setPrevia(capturado);
      ctx.sound('parar');
    } catch (problema) {
      setGravando(false);
      setErro((problema as Error).message || 'Não foi possível guardar esta gravação.');
    } finally {
      gravador.current = null;
    }
  };

  const guardarPrevia = () => {
    if (!previa) return;
    const nota: VozNota = {
      id: generateId(),
      titulo: titulo.trim() || `Voz de ${person.nome.split(' ')[0]} · ${new Date().toLocaleDateString('pt-BR')}`,
      url: previa.url,
      duracao: previa.duracao,
      createdAt: new Date().toISOString(),
    };
    salvarNotas([nota, ...notas], 'Voz guardada na ficha.');
    setPrevia(null); setTitulo(''); ctx.sound('success'); ctx.buzz?.(18);
    setAba('ouvir');
  };

  const enviarArquivo = async (lista: FileList | null) => {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    setErro('');
    try {
      const lido = await lerArquivoDeAudio(escolhido);
      const veredito = cabeNovaNota({ vozes: notas }, lido.bytes);
      if (!veredito.ok) { setErro(veredito.motivo || 'Este áudio não cabe.'); return; }
      setPrevia(lido);
      setTitulo(escolhido.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60));
    } catch {
      setErro('Não foi possível ler este arquivo de áudio.');
    }
  };

  const tocar = (nota: VozNota) => {
    if (tocando === nota.id) { player.current?.pause(); setTocando(null); return; }
    pararDeFalar(); setFalandoAgora(false);
    const audio = player.current || new Audio();
    player.current = audio;
    audio.src = nota.url;
    audio.onended = () => setTocando(null);
    audio.onerror = () => { setTocando(null); setErro('Este áudio não abre neste navegador.'); };
    void audio.play().then(() => setTocando(nota.id)).catch(() => setErro('O navegador bloqueou o áudio. Toque de novo para ouvir.'));
  };

  const falarTexto = (texto: string) => {
    if (!vozSuportada()) { setErro('Este navegador não fala texto. A gravação em áudio continua funcionando.'); return; }
    player.current?.pause(); setTocando(null);
    const deuCerto = falar({
      texto,
      perfil: { voz: vozEscolhida || null, tom, ritmo },
      aoTerminar: () => setFalandoAgora(false),
    });
    if (!deuCerto) { setErro('Não foi possível falar agora.'); return; }
    ctx.sound('voz');
    setFalandoAgora(true);
  };

  const salvarPerfil = () => {
    ctx.commit(d => ({
      ...d,
      people: d.people.map(p => p.id === person.id ? { ...p, perfilVoz: { voz: vozEscolhida || null, tom, ritmo }, updatedAt: new Date().toISOString() } : p),
    }), 'A voz da ficha foi ajustada.');
    ctx.sound('success');
  };

  const compartilharNota = async (nota: VozNota) => {
    const resultado = await compartilharArquivo({ dataUrl: nota.url, nome: `catalog-voz-${person.nome.replace(/[^\w]+/g, '-').toLowerCase()}-${nota.id.slice(0, 6)}.webm`, titulo: `${tituloDaNota(nota)} — ${person.nome}` });
    if (resultado === 'compartilhado' || resultado === 'baixado') { ctx.sound('compartilhar'); ctx.buzz?.(10); }
    ctx.notify(resultado === 'compartilhado' ? 'Voz enviada pelo compartilhamento do aparelho.' : resultado === 'baixado' ? 'O navegador não compartilha arquivos: o áudio foi baixado.' : 'Não foi possível compartilhar este áudio.', resultado === 'indisponivel');
  };

  const compartilharFicha = async () => {
    const resultado = await compartilharTexto({ titulo: `${person.nome} — Catalog`, texto: resumoDaPessoa(person, data) });
    if (resultado === 'compartilhado' || resultado === 'copiado') { ctx.sound('compartilhar'); ctx.buzz?.(10); }
    ctx.notify(resultado === 'compartilhado' ? 'Ficha compartilhada.' : resultado === 'copiado' ? 'Resumo da ficha copiado para a área de transferência.' : 'Este navegador não compartilha texto.', resultado === 'indisponivel');
  };

  return <Modal title={`A voz de ${person.nome.split(' ')[0]}`} description="Guarde a voz dela, ouça quando quiser e deixe o aplicativo falar por ela." onClose={onClose} wide className="voz-modal">
    <div className="scope-tabs voz-tabs" role="tablist" aria-label="Voz da pessoa">
      {([['ouvir', `Áudios (${notas.length})`], ['gravar', 'Gravar'], ['falar', 'Voz sintetizada']] as [Aba, string][]).map(([valor, rotulo]) =>
        <button key={valor} role="tab" aria-selected={aba === valor} className={aba === valor ? 'active' : ''} onClick={() => { setAba(valor); setErro(''); }}>{rotulo}</button>)}
    </div>

    {erro && <p className="form-error voz-erro" role="alert">{erro}</p>}

    {aba === 'ouvir' && <div className="voz-ouvir">
      {resumo.notas > 0 && <div className="voz-resumo">
        <span><AudioLines size={15} /><b>{resumo.notas}</b> {resumo.notas === 1 ? 'áudio' : 'áudios'}</span>
        <span>{formatarDuracao(resumo.duracao)} de voz guardada</span>
        <span>{formatarPeso(resumo.bytes)} no catálogo</span>
        {resumo.favoritas > 0 && <span><Heart size={13} />{resumo.favoritas} favorita{resumo.favoritas === 1 ? '' : 's'}</span>}
      </div>}
      {notas.map(nota => <article key={nota.id} className={`voz-nota ${tocando === nota.id ? 'tocando' : ''}`}>
        <button className="voz-play" aria-label={tocando === nota.id ? `Pausar ${tituloDaNota(nota)}` : `Ouvir ${tituloDaNota(nota)}`} onClick={() => tocar(nota)}>
          {tocando === nota.id ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="voz-nota-copia">
          <strong>{tituloDaNota(nota)}</strong>
          <small>{formatarDuracao(nota.duracao)} · {formatarPeso(pesoDoAudio(nota.url))} · {new Date(nota.createdAt).toLocaleDateString('pt-BR')}</small>
          <span className={`voz-ondinha ${tocando === nota.id ? 'ativa' : ''}`} aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => <i key={i} />)}</span>
        </div>
        <div className="voz-nota-acoes">
          <IconButton label={nota.favorite ? 'Tirar dos favoritos' : 'Marcar como favorita'} onClick={() => salvarNotas(notas.map(item => item.id === nota.id ? { ...item, favorite: !item.favorite } : item), nota.favorite ? 'Voz desafixada.' : 'Voz marcada como favorita.')}><Heart size={15} fill={nota.favorite ? 'currentColor' : 'none'} /></IconButton>
          <IconButton label="Compartilhar este áudio" onClick={() => void compartilharNota(nota)}><Share2 size={15} /></IconButton>
          <IconButton label="Baixar este áudio" onClick={() => { const base64 = nota.url.split(',')[1] || ''; const bytes = Uint8Array.from(atob(base64), caractere => caractere.charCodeAt(0)); downloadBlob(new Blob([bytes], { type: 'audio/webm' }), `catalog-voz-${person.nome.replace(/[^\w]+/g, '-').toLowerCase()}-${nota.id.slice(0, 6)}.webm`); }}><Upload size={15} /></IconButton>
          <IconButton label="Apagar este áudio" onClick={() => setApagar(nota)}><Trash2 size={15} /></IconButton>
        </div>
      </article>)}
      {!notas.length && <div className="voz-vazia">
        <Mic size={22} />
        <h3>Ainda não há voz guardada</h3>
        <p>Grave um recado, um “oi” ou uma risada. Depois, quando a saudade apertar, é só tocar.</p>
        <Button variant="primary" onClick={() => setAba('gravar')}><Mic size={16} />Gravar a primeira</Button>
      </div>}
      <div className="voz-rodape">
        <Button onClick={() => void compartilharFicha()}><Share2 size={15} />Compartilhar a ficha em texto</Button>
      </div>
    </div>}

    {aba === 'gravar' && <div className="voz-gravar">
      {!gravando && !previa && <>
        <div className={`voz-micro ${nivel > 0.05 ? 'ouvindo' : ''}`}>
          <button className="voz-micro-botao" onClick={() => void comecar()} disabled={segundos > 0 && !gravando}><Mic size={26} /></button>
          <p>A voz fica guardada neste aparelho, junto das fotos da ficha.</p>
        </div>
        <div className="voz-dicas">
          <span><b>Grave perto</b> — dez segundos já bastam para reconhecer a voz.</span>
          <span><b>Vários áudios</b> cabem: um “bom dia”, um aniversário, uma risada.</span>
          <span><b>Limite</b> {formatarPeso(2 * 1024 * 1024)} por áudio, {formatarPeso(8 * 1024 * 1024)} por pessoa.</span>
        </div>
        <div className="voz-ou"><span>ou</span></div>
        <Button onClick={() => arquivo.current?.click()}><Upload size={16} />Enviar um áudio do aparelho</Button>
        <input ref={arquivo} type="file" accept="audio/*" className="sr-only" aria-label="Enviar arquivo de áudio" onChange={evento => void enviarArquivo(evento.target.files)} />
      </>}

      {gravando && <div className="voz-gravando" role="status">
        <span className="voz-gravando-pulso" aria-hidden="true" />
        <strong>{formatarDuracao(segundos)}</strong>
        <span className="voz-ondinha viva" aria-hidden="true" style={{ ['--nivel' as string]: String(Math.max(0.15, nivel)) }}>{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${18 + Math.round(nivel * 30 * Math.abs(Math.sin(i)))}%` }} />)}</span>
        <div className="voz-gravando-acoes">
          <Button variant="primary" onClick={() => void encerrar()}><CircleStop size={16} />Parar e ouvir</Button>
          <Button onClick={() => { gravador.current?.cancelar(); gravador.current = null; setGravando(false); setSegundos(0); }}>Descartar</Button>
        </div>
      </div>}

      {previa && <div className="voz-previa">
        <h3>Ficou assim</h3>
        <audio controls src={previa.url} className="voz-player" />
        <Field label="Nome deste áudio" hint="Ex.: “Bom dia”, “Recado de aniversário”, “A risada dela”">
          <input value={titulo} maxLength={80} placeholder={`Voz de ${person.nome.split(' ')[0]}`} onChange={evento => setTitulo(evento.target.value)} />
        </Field>
        <p className="form-help">{formatarDuracao(previa.duracao)} · {formatarPeso(previa.bytes || pesoDoAudio(previa.url))}</p>
        <div className="voz-previa-acoes">
          <Button variant="primary" onClick={guardarPrevia}><Sparkles size={16} />Guardar na ficha</Button>
          <Button onClick={() => { setPrevia(null); setTitulo(''); }}>Gravar outro</Button>
        </div>
      </div>}
    </div>}

    {aba === 'falar' && <div className="voz-falar">
      <div className="voz-falar-cabeca">
        <Volume2 size={18} />
        <div>
          <h3>{vozSuportada() ? 'O aplicativo fala por ela' : 'Este navegador não fala texto'}</h3>
          <p>A voz sai do próprio aparelho, com tom e ritmo próprios desta ficha. Sem escolha, o catálogo sorteia uma voz estável a partir da ficha — {person.nome.split(' ')[0]} soa sempre igual.</p>
        </div>
      </div>
      <Field label="Voz do sistema" hint={vozes.length ? `${vozes.length} vozes disponíveis neste aparelho` : 'A lista de vozes chega depois de alguns instantes no primeiro uso'}>
        <select value={vozEscolhida} onChange={evento => setVozEscolhida(evento.target.value)} disabled={!vozes.length}>
          <option value="">Automática (a melhor em português)</option>
          {vozes.map(voz => <option key={voz.name} value={voz.name}>{rotuloDaVoz(voz)}</option>)}
        </select>
      </Field>
      <div className="voz-controles">
        <Field label={`Tom · ${tom.toFixed(2)}`} hint="Mais grave à esquerda, mais agudo à direita">
          <input type="range" min={VOZ_TOM.min} max={VOZ_TOM.max} step={0.01} value={tom} onChange={evento => setTom(Number(evento.target.value))} />
        </Field>
        <Field label={`Ritmo · ${ritmo.toFixed(2)}`} hint="Devagar à esquerda, apressado à direita">
          <input type="range" min={VOZ_RITMO.min} max={VOZ_RITMO.max} step={0.01} value={ritmo} onChange={evento => setRitmo(Number(evento.target.value))} />
        </Field>
      </div>
      <div className="voz-falar-acoes">
        <Button variant="primary" onClick={() => falarTexto(textoDeApresentacao(person, data))} disabled={!vozSuportada()}><Play size={16} />Ouvir a apresentação</Button>
        <Button onClick={() => falarTexto(`Oi, aqui é ${person.nome.split(' ')[0]}.`)} disabled={!vozSuportada()}><Mic size={16} />Ela diz o nome</Button>
        <Button onClick={() => falarTexto(notas.length ? `${tituloDaNota(notas[0])}` : person.descricao.slice(0, 240))} disabled={!vozSuportada() || (!notas.length && !person.descricao.trim())}><AudioLines size={16} />Ler a descrição</Button>
        {falandoAgora && <Button onClick={() => { pararDeFalar(); setFalandoAgora(false); }}><X size={16} />Parar</Button>}
        <Button onClick={salvarPerfil}><Sparkles size={16} />Salvar esta voz na ficha</Button>
      </div>
      <p className="form-help">A voz sintetizada é do sistema — serve para dar presença à ficha, não para imitar ninguém. Um áudio gravado continua sendo a voz real. {automatico.tom !== tom || automatico.ritmo !== ritmo ? `Sugestão automática para esta ficha: tom ${automatico.tom} e ritmo ${automatico.ritmo}.` : ''}</p>
    </div>}

    {apagar && <Confirm title="Apagar este áudio?" description={`“${tituloDaNota(apagar)}” sai da ficha e libera ${formatarPeso(pesoDoAudio(apagar.url))} do catálogo. Não tem como desfazer depois de salvar.`} danger confirmLabel="Apagar áudio" onClose={() => setApagar(null)} onConfirm={() => { salvarNotas(notas.filter(item => item.id !== apagar.id), 'Áudio apagado da ficha.'); setApagar(null); ctx.sound('pass'); }} />}
  </Modal>;
}
