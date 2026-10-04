/**
 * Player de música.
 *
 * Dois jeitos de ouvir, e a diferença é dita em voz alta:
 *
 * 1. **Toca aqui dentro.** Os climas do Ambiente são gerados pelo próprio site
 *    (`ambiente.ts`): o som começa no clique, continua enquanto a pessoa navega
 *    e continua à mão na pílula de música. Não depende de internet, de login nem
 *    de player de terceiro.
 * 2. **Toca o meu link.** Para quem quer a própria música: YouTube, Spotify,
 *    SoundCloud ou um arquivo de áudio direto. Fica atrás de um botão, porque é
 *    o plano B — não o caminho principal.
 */
import { useEffect, useState } from 'react';
import { ExternalLink, Link2, Music2, Pause, Play, Volume2, X } from 'lucide-react';
import { useCatalog } from '../../../context';
import { Button, IconButton } from '../../../components/ui';
import { buscaDaMusica, ehClimaDoAmbiente, type MusicaDoApp } from '../catalogo';
import { abrirEmNovaAba, interpretarMusica } from '../links';
import { aoMudarAmbiente, alternarAmbiente, ambienteDisponivel, ambienteTocando, definirVolumeDoAmbiente, volumeDoAmbiente } from '../ambiente';

export function PlayerDeMusica({ musica, compacto = false, className = '' }: {
  musica: MusicaDoApp;
  /** Versão de uma linha, para o Modo apresentação. */
  compacto?: boolean;
  className?: string;
}) {
  const ctx = useCatalog();
  const salvo = ctx.data.settings.musicaLinks?.[musica.id] || '';
  const noSite = ehClimaDoAmbiente(musica.id);
  const [rascunho, setRascunho] = useState('');
  const [colando, setColando] = useState(false);
  const [usandoLink, setUsandoLink] = useState(!!salvo);
  const [tocando, setTocando] = useState(() => ambienteTocando() === musica.id);
  const [volume, setVolume] = useState(() => ctx.data.settings.ambienteVolume ?? volumeDoAmbiente());
  const tocavel = salvo ? interpretarMusica(salvo) : null;
  const busca = buscaDaMusica(musica);

  // O estado do som vive no módulo de ambiente (ele continua tocando fora da
  // tela). Aqui só espelhamos o que ele diz — inclusive quando o vizinho muda.
  useEffect(() => aoMudarAmbiente(clima => setTocando(clima === musica.id)), [musica.id]);

  const alternar = () => {
    if (alternarAmbiente(musica.id)) {
      definirVolumeDoAmbiente(volume);
      ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: musica.id, ambienteVolume: volume } }));
    } else {
      ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: '' } }));
    }
  };
  const mudarVolume = (valor: number) => {
    setVolume(valor);
    definirVolumeDoAmbiente(valor);
    ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteVolume: valor } }), undefined, false);
  };
  const salvar = () => {
    const link = interpretarMusica(rascunho);
    if (!link) { ctx.notify('Cole um endereço que comece com https://', true); return; }
    ctx.commit(d => ({ ...d, settings: { ...d.settings, musicaLinks: { ...(d.settings.musicaLinks || {}), [musica.id]: link.abrir } } }));
    ctx.notify(link.tocar ? `${musica.rotulo}: link salvo. Dá o play aí no player.` : `${musica.rotulo}: link salvo — esta página abre no serviço.`);
    setRascunho(''); setColando(false); setUsandoLink(true);
  };
  const remover = () => {
    ctx.commit(d => {
      const links = { ...(d.settings.musicaLinks || {}) };
      delete links[musica.id];
      return { ...d, settings: { ...d.settings, musicaLinks: links } };
    });
    ctx.notify(`${musica.rotulo}: link removido.`);
  };

  return <section className={`musica-player ${compacto ? 'compacto' : ''} ${className}`} aria-label={`Música do clima ${musica.rotulo}`}>
    <div className="musica-topo">
      <span className="musica-icone"><Music2 size={15} /></span>
      <span className="musica-copy">
        <strong>{musica.rotulo}</strong>
        <small>{noSite ? (tocando ? 'tocando neste site' : 'som do próprio site') : tocavel ? `Tocando do ${tocavel.rotulo}` : `${musica.clima} · busca curada`}</small>
      </span>
      <div className="musica-acoes">
        {!!salvo && <IconButton label={`Remover link de ${musica.rotulo}`} onClick={remover}><X size={14} /></IconButton>}
      </div>
    </div>

    {noSite && <>
      {/* O caminho principal: música gerada aqui, sem depender de nada de fora. */}
      <div className="musica-site">
        <Button variant="primary" aria-pressed={tocando} onClick={alternar}>
          {tocando ? <Pause size={16} /> : <Play size={16} />}{tocando ? 'Pausar' : 'Tocar aqui'}
        </Button>
        <label className="musica-volume">
          <Volume2 size={14} />
          <input type="range" min={0} max={100} value={volume} aria-label={`Volume do ambiente ${musica.rotulo}`}
            onChange={event => mudarVolume(Number(event.target.value))} />
        </label>
      </div>
      {!ambienteDisponivel() && <p className="musica-aviso">Este navegador não deixa gerar som aqui dentro. O ambiente ainda pode abrir por link, abaixo.</p>}
      {tocando && <p className="musica-aviso">O som continua tocando enquanto você navega. A pílula no canto pausa e ajusta o volume quando quiser.</p>}
    </>}

    {noSite && <button type="button" className="text-action musica-trocar" aria-expanded={usandoLink} onClick={() => setUsandoLink(value => !value)}>
      {usandoLink ? 'Esconder a opção por link' : salvo ? 'Ver o link salvo' : 'Prefiro usar um link (YouTube, Spotify…)'}
    </button>}

    {(!noSite || usandoLink) && <>
      {tocavel?.tocar && tocavel.player === 'iframe' && (
        <div className="musica-embed">
          <iframe src={tocavel.tocar} title={`Música: ${musica.rotulo}`} loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      {tocavel?.tocar && tocavel.player === 'audio' && (
        <audio className="musica-audio" src={tocavel.tocar} controls loop preload="none" aria-label={`Música: ${musica.rotulo}`} />
      )}
      {tocavel?.aviso && <p className="musica-aviso">{tocavel.aviso}</p>}
      {!noSite && !salvo && <p className="musica-aviso">Nada salvo ainda. A busca curada abre no YouTube — e o link que você escolher toca aqui dentro.</p>}

      <div className="musica-botoes">
        <Button variant={salvo ? 'ghost' : 'secondary'} onClick={() => abrirEmNovaAba(tocavel?.abrir || busca)}>
          <ExternalLink size={15} />{salvo ? `Abrir no ${tocavel?.rotulo || 'serviço'}` : 'Abrir busca curada'}
        </Button>
        <Button variant="ghost" aria-expanded={colando} onClick={() => setColando(value => !value)}><Link2 size={15} />{salvo ? 'Trocar link' : 'Colar link'}</Button>
      </div>

      {colando && <div className="musica-colar">
        <input id={`musica-${musica.id}`} value={rascunho} onChange={event => setRascunho(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') salvar(); }}
          placeholder="https://www.youtube.com/watch?v=..." aria-label="Link da música" inputMode="url" />
        <Button variant="primary" disabled={!rascunho.trim()} onClick={salvar}>Salvar e tocar</Button>
      </div>}
    </>}
  </section>;
}

export default PlayerDeMusica;
