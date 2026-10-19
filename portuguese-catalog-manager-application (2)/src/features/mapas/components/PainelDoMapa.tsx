/**
 * O painel do nó selecionado.
 *
 * Tudo aqui é controlado: o painel não guarda o mapa, só devolve o que mudou
 * para `MapasMentais`, que é quem grava pelo `commit` do contexto. A única coisa
 * que ele guarda é o texto em edição — e por um motivo: cada tecla não pode
 * virar um passo de histórico, então o texto só é gravado no `blur` ou no Enter
 * (o mesmo arranjo do nome do mapa no topo).
 */
import { useEffect, useState } from 'react';
import { Plus, Share2, Trash2, Unlink, X } from 'lucide-react';
import type { MapaMental, Person } from '../../../types';
import { Avatar, Button, Field, IconButton } from '../../../components/ui';
import { arestasDe, CORES_DO_MAPA, noPorId, resumoDoMapa } from '../mapa';

export interface PainelDoMapaProps {
  mapa: MapaMental;
  pessoas: Person[];
  selecionado: string | null;
  ligando: string | null;
  aoSelecionar: (id: string | null) => void;
  aoRenomear: (id: string, texto: string) => void;
  aoPintar: (id: string, cor: string) => void;
  aoAnotar: (id: string, nota: string) => void;
  aoVincular: (id: string, personId: string | null) => void;
  aoAbrirPessoa: (pessoa: Person) => void;
  aoCriarRamo: (id: string) => void;
  aoArmarLigacao: () => void;
  aoCancelarLigacao: () => void;
  aoRemover: (id: string) => void;
}

export default function PainelDoMapa(props: PainelDoMapaProps) {
  const {
    mapa, pessoas, selecionado, ligando, aoSelecionar, aoRenomear, aoPintar, aoAnotar, aoVincular,
    aoAbrirPessoa, aoCriarRamo, aoArmarLigacao, aoCancelarLigacao, aoRemover,
  } = props;
  const no = noPorId(mapa, selecionado);
  const [texto, setTexto] = useState(no?.texto ?? '');
  const [nota, setNota] = useState(no?.nota ?? '');

  // trocar de nó traz o texto dele; editar não, senão o cursor brigaria
  useEffect(() => { setTexto(no?.texto ?? ''); }, [no?.id, no?.texto]);
  useEffect(() => { setNota(no?.nota ?? ''); }, [no?.id, no?.nota]);

  if (!no) {
    const resumo = resumoDoMapa(mapa, pessoas);
    return (
      <aside className="mapa-painel" aria-label="O mapa">
        <h3>{mapa.nome}</h3>
        <p className="mapa-leitura">
          <span>Nós</span><strong>{resumo.nos}</strong>
          <span>Ligações</span><strong>{resumo.ligacoes}</strong>
          <span>Fichas no mapa</span><strong>{resumo.pessoas}</strong>
        </p>
        <p className="form-help">
          Toque num nó para editar o texto, a cor, a nota e a ficha vinculada. Dois cliques num
          ponto vazio do plano criam um nó ali; o × no meio de um fio desfaz a ligação.
        </p>
      </aside>
    );
  }

  const pessoa = pessoas.find(item => item.id === no.personId) || null;
  const vizinhos = arestasDe(mapa, no.id);
  const gravarTexto = () => { if (texto.trim() && texto !== no.texto) aoRenomear(no.id, texto); };
  const gravarNota = () => { if (nota !== (no.nota ?? '')) aoAnotar(no.id, nota); };

  return (
    <aside className="mapa-painel" aria-label="Nó selecionado">
      <Field label="Texto do nó">
        <input value={texto} maxLength={90} aria-label="Texto do nó" onChange={evento => setTexto(evento.target.value)}
          onBlur={gravarTexto} onKeyDown={evento => { if (evento.key === 'Enter') { evento.preventDefault(); gravarTexto(); } }} />
      </Field>

      <div className="mapa-grupo">
        <h3>Cor</h3>
        <div className="mapa-cores">
          {CORES_DO_MAPA.map(cor => (
            <button type="button" key={cor} className={`mapa-cor ${no.cor === cor ? 'ativa' : ''}`}
              style={{ '--cor': cor } as React.CSSProperties} aria-pressed={no.cor === cor}
              aria-label={`Pintar este nó de ${cor}`} title={`Pintar de ${cor}`} onClick={() => aoPintar(no.id, cor)} />
          ))}
        </div>
      </div>

      <Field label="Nota (opcional)" hint="Só aparece neste mapa — não vai para a ficha.">
        <textarea rows={3} value={nota} maxLength={400} aria-label="Nota do nó"
          onChange={evento => setNota(evento.target.value)} onBlur={gravarNota} />
      </Field>

      <div className="mapa-grupo">
        <h3>Ficha do catálogo</h3>
        {pessoa ? (
          <div className="mapa-vinculo">
            <Avatar person={pessoa} size={30} />
            <button type="button" onClick={() => aoAbrirPessoa(pessoa)}>{pessoa.nome}</button>
            <IconButton label="Desvincular a ficha" onClick={() => aoVincular(no.id, null)}><Unlink size={14} /></IconButton>
          </div>
        ) : (
          <select value="" aria-label="Vincular este nó a uma ficha"
            onChange={evento => { if (evento.target.value) aoVincular(no.id, evento.target.value); }}>
            <option value="">Vincular a alguém do catálogo…</option>
            {pessoas.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        )}
      </div>

      <div className="mapa-acoes-do-painel">
        <Button onClick={() => aoCriarRamo(no.id)}><Plus size={15} />Novo ramo</Button>
        {ligando
          ? <Button onClick={aoCancelarLigacao}><X size={15} />Cancelar a ligação</Button>
          : <Button onClick={aoArmarLigacao} disabled={mapa.nos.length < 2}><Share2 size={15} />Ligar a outro nó</Button>}
        <Button variant="danger" onClick={() => aoRemover(no.id)}><Trash2 size={15} />Remover nó</Button>
      </div>

      <p className="mapa-vizinhos">
        {vizinhos.length
          ? <>Liga a: {vizinhos.map((aresta, indice) => (
            <span key={aresta.no.id}>
              {indice > 0 && ', '}
              <button type="button" onClick={() => aoSelecionar(aresta.no.id)}>{aresta.no.texto}</button>
              {aresta.rotulo && <em> ({aresta.rotulo})</em>}
            </span>
          ))}</>
          : 'Este nó ainda não liga a nenhum outro.'}
      </p>
    </aside>
  );
}
