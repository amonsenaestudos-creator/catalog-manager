import { useState } from 'react';
import { CloudOff, Download, X } from 'lucide-react';
import { dispensarInstalacao, instalacaoDispensada, useStatusDoApp } from '../../lib/pwa';
import { IconButton } from '../../components/ui';

/**
 * Duas faixas discretas no alto do aplicativo: “você está sem internet” e
 * “dá para instalar”. Nenhuma das duas interrompe o que está sendo feito.
 */
export default function StatusDoApp() {
  const { online, instalavel, instalado, instalar } = useStatusDoApp();
  const [dispensado, setDispensado] = useState(instalacaoDispensada);

  if (!online) return <div className="app-status offline" role="status">
    <CloudOff size={14} />
    <span>Sem conexão. O catálogo continua abrindo e salvando neste aparelho — só a IA opcional precisa de internet.</span>
  </div>;

  if (!instalavel || instalado || dispensado) return null;
  return <div className="app-status instalar" role="status">
    <Download size={14} />
    <span>O Catalog pode virar um aplicativo neste aparelho: tela cheia, ícone próprio e abertura mesmo offline.</span>
    <button onClick={async () => { const aceitou = await instalar(); if (!aceitou) setDispensado(true); }}>Instalar</button>
    <IconButton label="Agora não" onClick={() => { dispensarInstalacao(); setDispensado(true); }}><X size={14} /></IconButton>
  </div>;
}
