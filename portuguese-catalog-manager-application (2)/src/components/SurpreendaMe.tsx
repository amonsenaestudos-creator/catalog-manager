import { useState } from 'react';
import { CalendarHeart, Dices, History, RefreshCw, Sparkles, Star, Swords, User } from 'lucide-react';
import { useCatalog } from '../context';
import { Avatar, Button, EmptyState, Modal } from './ui';
import { listarSurpresas, sorteSurpresa, type Surpresa } from '../lib/surpresas';

const ICONE: Record<Surpresa['tipo'], typeof Dices> = {
  confronto: Swords,
  memoria_esquecida: History,
  ficha_parada: Dices,
  aniversario: CalendarHeart,
  coincidencia: Sparkles,
  historia_longa: Star,
  nota_mais_alta: Star,
};

/**
 * Botão "Surpreenda-me": o catálogo escolhe o que te mostrar — uma
 * memória esquecida, um aniversário chegando, uma coincidência, um
 * confronto pendente. Sempre a partir de dado real da sua base.
 */
export default function SurpreendaMe({ onClose }: { onClose: () => void }) {
  const ctx = useCatalog();
  const [sorteada, setSorteada] = useState<Surpresa | null>(() => sorteSurpresa(ctx.data));
  const [vistas, setVistas] = useState<string[]>(sorteada ? [sorteada.chave] : []);

  const outra = () => {
    // Roda pela lista inteira sem repetir o que já saiu nesta sessão;
    // quando tudo já saiu, recomeça de novo (o catálogo nunca fica sem assunto).
    const todas = listarSurpresas(ctx.data);
    let restante = todas.filter(s => !vistas.includes(s.chave));
    if (!restante.length) restante = todas;
    if (!restante.length) return;
    const proxima = restante[Math.floor(Math.random() * restante.length)];
    setSorteada(proxima);
    setVistas(v => [...v, proxima.chave]);
  };

  const abrirPessoa = (s: Surpresa) => {
    if (s.pessoa) ctx.openPerson(s.pessoa.id);
    onClose();
  };

  const abrirConfronto = (s: Surpresa) => {
    if (s.par) ctx.setCompareIds([s.par[0].id, s.par[1].id]);
    onClose();
  };

  const Icone = sorteada ? ICONE[sorteada.tipo] : Dices;
  const par = sorteada?.par;

  return <Modal title="Surpreenda-me" description="O catálogo escolhendo o que te mostrar hoje" onClose={onClose} className="surpresa-modal"
    footer={sorteada && <div className="surpresa-rodape">
      {sorteada.acao === 'comparar' && <Button variant="primary" onClick={() => abrirConfronto(sorteada)}><Swords size={16} />Comparar agora</Button>}
      {sorteada.acao === 'ver_pessoa' && <Button variant="primary" onClick={() => abrirPessoa(sorteada)}><User size={16} />Ver {sorteada.pessoa?.nome}</Button>}
      <Button variant="ghost" onClick={outra}><RefreshCw size={15} />Outra surpresa</Button>
    </div>}>
    {sorteada ? <div className="surpresa-card">
      <div className="surpresa-icone"><Icone size={22} strokeWidth={1.6} /></div>
      {par && <div className="surpresa-par">{par.map(p => <div key={p.id} className="surpresa-par-item"><Avatar person={p} size={56} /><span>{p.nome}</span></div>)}</div>}
      <h3>{sorteada.titulo}</h3>
      <p>{sorteada.descricao}</p>
    </div> : <EmptyState icon={Dices} title="Ainda não tem o quê" description="Adicione umas pessoas, notas ou aniversários ao catálogo — aí eu tenho com o que te surpreender." />}
  </Modal>;
}
