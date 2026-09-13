import { useMemo, useState } from 'react';
import { Heart, Lock, MessageCircle, Search, Sparkles, Unlock, UserCircle2, Users } from 'lucide-react';
import type { ChatMessage, Person } from '../types';
import { useCatalog } from '../context';
import { formatDate, isActive } from '../store';
import { Avatar, EmptyState, IconButton, PageTitle } from './ui';
import { buildPersona, type Persona } from '../lib/persona';
import { seloDaRelacao, type Relacao } from '../lib/relacao';
import { estadoDe, estagioAtual, type ChatPlan } from '../lib/dialogue';
import type { ChatState } from '../types';
import ChatSimulator from './ChatSimulator';

type Filtro = 'conversas' | 'quimica' | 'adultas' | 'sem-conversa' | 'todas';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'conversas', label: 'Com conversa' },
  { id: 'quimica', label: 'Química alta' },
  { id: 'adultas', label: 'Adultas' },
  { id: 'sem-conversa', label: 'Ainda sem conversa' },
  { id: 'todas', label: 'Todas as fichas' },
];

interface ResumoConversa {
  person: Person;
  persona: Persona;
  mensagens: ChatMessage[];
  ultima?: ChatMessage;
  estado: ChatState;
  estagio: ChatPlan['estagio'];
  relacao: Relacao;
}

/**
 * Aba só de conversa: a lista de papos em andamento e o chat em tela cheia.
 * Antes o simulador vivia dentro da ficha; aqui o lugar da conversa fica limpo,
 * com busca, filtro por categoria e o resumo de cada relação.
 */
export default function Conversations() {
  const ctx = useCatalog();
  const { data, chatPersonId } = ctx;
  const [busca, setBusca] = useState('');
  // Quem ainda não começou nenhuma conversa vê o catálogo inteiro; quem já conversa vê os papos abertos.
  const [filtro, setFiltro] = useState<Filtro>(() => data.chats.length ? 'conversas' : 'todas');
  const [categoria, setCategoria] = useState('');

  const resumos = useMemo<ResumoConversa[]>(() => data.people.filter(isActive).map(person => {
    const mensagens = data.chats.filter(mensagem => mensagem.personId === person.id);
    const estado = estadoDe(data, person);
    const persona = buildPersona(person, { people: data.people, settings: data.settings });
    return { person, persona, mensagens, ultima: mensagens[mensagens.length - 1], estado, estagio: estagioAtual(estado), relacao: persona.relacao };
  }), [data]);

  const conversaAberta = chatPersonId ? resumos.find(item => item.person.id === chatPersonId) : undefined;
  if (conversaAberta) return <div className="conversations-page open"><ChatSimulator person={conversaAberta.person} onClose={ctx.closeChat} /></div>;

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const lista = resumos
    .filter(item => !termo || item.person.nome.toLocaleLowerCase('pt-BR').includes(termo) || (item.person.apelido || '').toLocaleLowerCase('pt-BR').includes(termo))
    .filter(item => !categoria || item.person.localizacaoOnde === categoria)
    .filter(item => {
      if (filtro === 'todas') return true;
      if (filtro === 'conversas') return item.mensagens.length > 0;
      if (filtro === 'sem-conversa') return item.mensagens.length === 0;
      if (filtro === 'adultas') return (item.relacao.idadeDela ?? 0) >= 18;
      return item.estado.afinidade >= 55;
    })
    .sort((a, b) => {
      const dataA = a.ultima?.timestamp || '';
      const dataB = b.ultima?.timestamp || '';
      if (dataA || dataB) return dataB.localeCompare(dataA);
      return a.person.nome.localeCompare(b.person.nome, 'pt-BR');
    });

  const comConversa = resumos.filter(item => item.mensagens.length > 0).length;
  const totalMensagens = resumos.reduce((soma, item) => soma + item.mensagens.length, 0);

  return <div className="conversations-page">
    <PageTitle eyebrow="O lugar da conversa" title="Conversas" description="Cada pessoa conversa do jeito dela: idade, vínculo, amizade e química mudam o papo. Nada sai do seu aparelho." />
    <div className="conversation-summary">
      <span><MessageCircle size={15} /><b>{comConversa}</b> com conversa</span>
      <span><Users size={15} /><b>{resumos.length}</b> ficha(s)</span>
      <span><Sparkles size={15} /><b>{totalMensagens}</b> mensagem(ns)</span>
      {data.settings.adultMode ? <span className="adult-on"><Unlock size={14} />Modo adulto ligado</span> : <span className="adult-off"><Lock size={14} />Conteúdo adulto desligado</span>}
    </div>

    <div className="conversation-tools">
      <label className="conversation-search"><Search size={16} /><input value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Buscar por nome ou apelido..." aria-label="Buscar conversa" /></label>
      <select value={categoria} onChange={evento => setCategoria(evento.target.value)} aria-label="Filtrar por categoria">
        <option value="">Todas as categorias</option>
        {data.categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </div>

    <div className="scope-tabs conversation-filters">
      {FILTROS.map(item => <button key={item.id} className={filtro === item.id ? 'active' : ''} onClick={() => setFiltro(item.id)}>{item.label}</button>)}
    </div>

    {!resumos.length && <EmptyState icon={MessageCircle} title="Nenhuma ficha no catálogo" description="Cadastre alguém primeiro: a conversa é montada a partir da ficha." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} />}
    {!!resumos.length && !lista.length && <EmptyState icon={MessageCircle} title="Nada por aqui ainda" description="Troque o filtro ou comece uma conversa nova com alguém do catálogo." />}

    <div className="conversation-list-cards">
      {lista.map(item => <ConversationCard key={item.person.id} resumo={item} />)}
    </div>
  </div>;
}

function ConversationCard({ resumo }: { resumo: ResumoConversa }) {
  const ctx = useCatalog();
  const { person, ultima, mensagens, estado, estagio, relacao } = resumo;
  const previa = ultima ? `${ultima.role === 'user' ? 'Você: ' : ''}${ultima.text}` : 'Conversa ainda não começou. Toque para abrir e ela manda o primeiro oi.';
  const online = !!(person.ultimoVisto && Date.now() - Date.parse(person.ultimoVisto) < 3 * 86400000);
  const crianca = relacao.veCrianca;
  const tia = relacao.ehTia && !crianca;
  return <article className={`conversation-card ${mensagens.length ? '' : 'empty'}`}>
    <button className="conversation-card-main" onClick={() => ctx.openChat(person)}>
      <span className="conversation-avatar">
        <Avatar person={person} size={46} />
        <span className={`chat-status-dot ${online ? 'online' : ''}`} />
      </span>
      <span className="conversation-card-text">
        <strong>{person.nome}</strong>
        <small className="conversation-relation" title={relacao.descricao}>
          {seloDaRelacao(relacao)}
          {crianca && <em className="relation-chip crianca">trata você como criança</em>}
          {tia && <em className="relation-chip tia">dinâmica de tia</em>}
          {relacao.familiar && <em className="relation-chip familia">{relacao.vinculoComigo}</em>}
        </small>
        <small className="conversation-preview">{previa}</small>
      </span>
      <span className="conversation-meta">
        <time>{ultima ? formatDate(ultima.timestamp, true) : '—'}</time>
        <em className={`conversation-stage stage-${estagio.id}`}>{estagio.label}</em>
        <span className="conversation-meter" title={`${Math.round(estado.afinidade)}% de química`}><i style={{ width: `${estado.afinidade}%` }} /></span>
      </span>
    </button>
    <div className="conversation-card-actions">
      <IconButton label={`Abrir conversa com ${person.nome}`} onClick={() => ctx.openChat(person)}><MessageCircle size={16} /></IconButton>
      <IconButton label="Abrir a ficha" onClick={() => ctx.openPerson(person)}><UserCircle2 size={16} /></IconButton>
      <span className="conversation-heart" title="Química entre vocês"><Heart size={13} />{Math.round(estado.afinidade)}%</span>
    </div>
  </article>;
}
