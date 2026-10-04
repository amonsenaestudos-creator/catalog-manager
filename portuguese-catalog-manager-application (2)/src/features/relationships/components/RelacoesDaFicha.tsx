/**
 * A categoria **Relações** da ficha.
 *
 * Antes, "relações" era um campo escondido no meio da lista de informações
 * ("Família no catálogo: mãe de Ana") e nada mais. Aqui a ficha responde três
 * perguntas diferentes: como vocês se ligam (o vínculo com você), quem é
 * família no catálogo (vínculos salvos, nos dois sentidos) e quem anda junto
 * (o que o próprio catálogo já sugere, por categoria, lugar e etiquetas).
 *
 * Tudo o que aparece aqui sai de dado que já existe na ficha — a tela só
 * mostra a relação que estava implícita.
 */
import { Link2, Sparkles, UserPlus, Users } from 'lucide-react';
import { useCatalog } from '../../../context';
import { Avatar, EmptyState } from '../../../components/ui';
import { analisarRelacao, conexoesProximas, redeFamiliar, seloDaRelacao } from '../../../lib/relacao';
import { vinculoComigoLabel } from '../../../types';
import type { Person } from '../../../types';

export default function RelacoesDaFicha({ person }: { person: Person }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const relacao = analisarRelacao(person, data.people, data.settings);
  const familia = redeFamiliar(person, data.people);
  const proximas = conexoesProximas(person, data.people);
  const abrir = (id: string) => ctx.openPerson(id);

  return <div className="ficha-relacoes">
    <section className="read-text">
      <h3><Link2 size={15} />Como vocês se ligam</h3>
      <p className="relacao-selo">{seloDaRelacao(relacao)}</p>
      <p className="relacao-motivo">{relacao.descricao}</p>
      <dl className="person-facts relacao-fatos">
        <div><dt>Vínculo com você</dt><dd>{person.vinculoComigo ? vinculoComigoLabel(person.vinculoComigo) : 'Automático, pela idade'}</dd></div>
        <div><dt>Nível de amizade</dt><dd>{relacao.amizade} de 5</dd></div>
        <div><dt>Como se conheceram</dt><dd>{person.comoConheceu || 'Não informado'}</dd></div>
        <div><dt>Última interação</dt><dd>{person.ultimoVisto ? new Date(person.ultimoVisto).toLocaleDateString('pt-BR') : 'Nunca marcada'}</dd></div>
      </dl>
    </section>

    <section className="read-text">
      <h3><Users size={15} />Família no catálogo</h3>
      {familia.length
        ? <div className="relacao-pessoas">{familia.map(item => {
          const outra = data.people.find(p => p.id === item.personId);
          return <button key={`${item.personId}-${item.papel}`} onClick={() => abrir(item.personId)}>
            {outra && <Avatar person={outra} size={38} />}<span><strong>{item.nome}</strong><small>{item.papel} dela</small></span>
          </button>;
        })}</div>
        : <p className="muted">Nenhum vínculo de família registrado. No editor da ficha, o campo <b>Vínculos</b> liga esta pessoa a mãe, irmã, filha e o resto.</p>}
    </section>

    <section className="read-text">
      <h3><Sparkles size={15} />Quem anda junto</h3>
      {proximas.length
        ? <div className="relacao-pessoas">{proximas.map(conexao => {
          const outra = data.people.find(p => p.id === conexao.personId);
          return <button key={conexao.personId} onClick={() => abrir(conexao.personId)} title={conexao.motivo}>
            {outra && <Avatar person={outra} size={38} />}<span><strong>{conexao.nome}</strong><small>{conexao.motivo}</small></span>
          </button>;
        })}</div>
        : <EmptyState icon={UserPlus} title="Ainda sem companhia por perto" description="Quando outra ficha compartilhar categoria, lugar ou etiqueta com esta, ela aparece aqui sozinha." />}
    </section>

    <section className="read-text relacao-atalhos">
      <button onClick={() => ctx.navigate('board')}><Link2 size={15} />Abrir o quadro de investigação</button>
      <button onClick={() => ctx.navigate('catalog', 'active')}><Users size={15} />Ver o catálogo inteiro</button>
    </section>
  </div>;
}
