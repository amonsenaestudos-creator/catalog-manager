/**
 * Pílula da música ambiente.
 *
 * O som do site não pertence a uma tela: escolhido o clima, ele continua
 * enquanto a pessoa anda pelo catálogo. Esta pílula é o controle que sobra —
 * discreta, no canto, com pausar, volume e desligar. Só aparece quando existe
 * um clima ligado; sem ele, não ocupa um pixel.
 */
import { useEffect, useState } from 'react';
import { Music2, Pause, Play, Volume2, X } from 'lucide-react';
import { useCatalog } from '../../../context';
import { IconButton } from '../../../components/ui';
import { ROTULOS_DO_AMBIENTE, aoMudarAmbiente, alternarAmbiente, definirVolumeDoAmbiente, ehClimaSuportado, pararAmbiente, retomarAmbientePendente, volumeDoAmbiente } from '../ambiente';

export function AmbienteBar() {
  const ctx = useCatalog();
  const ativo = ctx.data.settings.ambienteAtivo || '';
  const [tocando, setTocando] = useState(false);
  const [volume, setVolume] = useState(() => ctx.data.settings.ambienteVolume ?? volumeDoAmbiente());
  const suportado = ehClimaSuportado(ativo);

  // Espelha o motor: a pílula mostra o que está tocando de verdade, venha o som
  // do painel Ambiente ou de outra tela.
  useEffect(() => aoMudarAmbiente(clima => setTocando(clima === ativo)), [ativo]);
  // Clima escolhido numa visita anterior volta no primeiro toque — o navegador
  // não deixa som nenhum começar sem um gesto.
  useEffect(() => { if (suportado) retomarAmbientePendente(); }, [suportado]);

  if (!suportado) return null;
  const rotulo = ROTULOS_DO_AMBIENTE[ativo] || ativo;
  const alternar = () => setTocando(alternarAmbiente(ativo));
  const desligar = () => {
    // Desligar é parar o som e esquecer o clima — o volume escolhido fica.
    pararAmbiente();
    ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteAtivo: '' } }));
  };
  const mudarVolume = (valor: number) => {
    setVolume(valor);
    definirVolumeDoAmbiente(valor);
    ctx.commit(d => ({ ...d, settings: { ...d.settings, ambienteVolume: valor } }), undefined, false);
  };

  return <aside className="ambiente-bar" role="region" aria-label="Música ambiente do site">
    <button type="button" className="ambiente-botao" aria-pressed={tocando} aria-label={tocando ? `Pausar ${rotulo}` : `Tocar ${rotulo}`} onClick={alternar}>
      {tocando ? <Pause size={15} /> : <Play size={15} />}
    </button>
    <span className="ambiente-copy" title={`Ambiente: ${rotulo}`}>
      <Music2 size={13} />
      <span><strong>{rotulo}</strong><small>{tocando ? 'tocando neste site' : 'pausado'}</small></span>
    </span>
    <label className="ambiente-volume">
      <Volume2 size={13} />
      <input type="range" min={0} max={100} value={volume} aria-label="Volume da música ambiente" onChange={event => mudarVolume(Number(event.target.value))} />
    </label>
    <IconButton label="Desligar a música ambiente" onClick={desligar}><X size={14} /></IconButton>
  </aside>;
}

export default AmbienteBar;
