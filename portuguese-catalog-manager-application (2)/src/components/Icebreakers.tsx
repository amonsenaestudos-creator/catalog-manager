import { useMemo, useState } from 'react';
import { Copy, Film, Flame, Heart, Laugh, Lightbulb, MessageCircle, Moon, RefreshCw, Sparkles, Sun } from 'lucide-react';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { Button, IconButton, Modal } from './ui';
import { buildPersona, ganchoDe } from '../lib/persona';
import { estadoDe, estagioAtual, sugerirAberturas } from '../lib/dialogue';

interface Props {
  person: Person;
  onClose: () => void;
  onStartChat?: () => void;
}

type Categoria = 'sugeridas' | 'leve' | 'divertido' | 'profundo' | 'nostalgia' | 'flerte' | 'picante';

const BANKS: Record<Exclude<Categoria, 'sugeridas' | 'picante'>, string[]> = {
  leve: [
    'Recomenda uma série que você tá amando ultimamente?',
    'Qual seu lugar favorito na cidade?',
    'Café, chá ou nenhum dos dois?',
    'Tem uma música que você não consegue parar de ouvir?',
    'Qual a melhor coisa que você comeu essa semana?',
    'Se o dia tivesse 25h, o que você faria com a hora extra?',
  ],
  divertido: [
    'Qual a coisa mais sem noção que já aconteceu com você?',
    'Qual o filme que você já assistiu umas dez vezes?',
    'Se tivesse um superpoder por um dia, qual escolheria?',
    'Qual é a sua habilidade mais inútil?',
    'Qual foi a pior cantada que já te deram?',
    'Se você fosse personagem de filme, de que gênero seria?',
  ],
  profundo: [
    'O que te faz sentir realmente viva?',
    'Que conselho você daria para você mesma aos 15 anos?',
    'Qual é a sua memória mais feliz?',
    'O que você aprendeu recentemente que mudou sua forma de ver as coisas?',
    'O que você mais valoriza em uma amizade?',
    'Como é um dia perfeito para você?',
  ],
  nostalgia: [
    'Qual desenho você amava quando era criança?',
    'Se pudesse voltar a um dia específico da sua vida, qual seria?',
    'Qual a melhor lembrança que você tem da escola?',
    'Tem uma música que sempre te leva a um momento específico?',
    'Qual viagem mais marcou você até hoje?',
  ],
  flerte: [
    'Se a gente marcasse algo hoje, você preferia café, jantar ou sair pra dançar?',
    'Qual foi o melhor elogio que você já recebeu? Vou tentar superar.',
    'Qual o tipo de programa que te faz pensar "queria companhia"?',
    'Se eu te convidasse pra algo de última hora, você toparia?',
    'O que te faz dar o primeiro passo em alguém?',
  ],
};

const CATEGORIAS: { id: Categoria; label: string; icone: typeof Sun; adulta?: boolean }[] = [
  { id: 'sugeridas', label: 'Sugeridas para ela', icone: Sparkles },
  { id: 'leve', label: 'Levinho', icone: Sun },
  { id: 'divertido', label: 'Divertido', icone: Laugh },
  { id: 'profundo', label: 'Profundo', icone: Moon },
  { id: 'nostalgia', label: 'Nostalgia', icone: Film },
  { id: 'flerte', label: 'Chegar mais perto', icone: Heart },
  { id: 'picante', label: 'Picante (18+)', icone: Flame, adulta: true },
];

function embaralhar<T>(lista: T[], quantidade = 4): T[] {
  return [...lista].sort(() => Math.random() - 0.5).slice(0, quantidade);
}

export default function Icebreakers({ person, onClose, onStartChat }: Props) {
  const ctx = useCatalog();
  const { data } = ctx;
  const persona = useMemo(() => buildPersona(person), [person]);
  const estado = estadoDe(data, person);
  const estagio = estagioAtual(estado);
  const podePicante = persona.adulta && !!data.settings.adultMode;
  const categorias = CATEGORIAS.filter(categoria => !categoria.adulta || podePicante);
  const [categoria, setCategoria] = useState<Categoria>('sugeridas');
  const [copiado, setCopiado] = useState('');
  const [versao, setVersao] = useState(0);
  const categoriaAtual = categorias.find(item => item.id === categoria) || categorias[0];

  const sugestoes = useMemo(() => {
    if (categoria === 'sugeridas') {
      return sugerirAberturas({ person, persona, state: estado, historico: data.chats.filter(mensagem => mensagem.personId === person.id), adulto: !!data.settings.adultMode, quantas: 5 }).map(sugestao => ({ texto: sugestao.texto, tom: sugestao.tom, motivo: sugestao.motivo }));
    }
    if (categoria === 'picante') {
      const ganchos = [ganchoDe(persona, Math.random), ganchoDe(persona, Math.random), ganchoDe(persona, Math.random)];
      return [
        `Tô pensando em você de um jeito que não dá pra escrever aqui 😏`,
        `Se você me visse agora, ia entender esse silêncio 🔥`,
        `Me conta uma coisa: o que você faria se eu estivesse aí do seu lado?`,
        `Você sabe o efeito que tem em mim, né? 😏`,
        `Aquela conversa de ${ganchos[0]} rendeu ideias... e você no meio delas.`,
        `Prefiro te mostrar pessoalmente do que escrever aqui 😉`,
      ].slice(0, 4).map(texto => ({ texto, tom: 'provocante' as const, motivo: 'Ficha 18+ com o modo adulto ligado: insinuação sem nada explícito.' }));
    }
    const banco = BANKS[categoria as keyof typeof BANKS];
    const personalizado = banco.map(texto => texto.replace(/\bvocê\b/g, Math.random() < 0.3 ? persona.comoChamar : 'você'));
    return embaralhar(personalizado, 4).map(texto => ({ texto, tom: categoria === 'flerte' ? 'flerte' as const : 'amizade' as const, motivo: `Categoria ${categoria} combinada com ${persona.marcadores[0] || 'o jeito dela'}.` }));
  }, [categoria, person, persona, estado, data.chats, data.settings.adultMode, versao]);

  const copiar = (texto: string) => {
    try { navigator.clipboard.writeText(texto); } catch { /* área de transferência bloqueada */ }
    setCopiado(texto);
    setTimeout(() => setCopiado(''), 1600);
  };

  const usar = (texto: string) => {
    ctx.commit(d => ({ ...d, icebreakers: [...d.icebreakers, { id: crypto.randomUUID?.() || `${Date.now()}`, personId: person.id, text: texto, category: categoria === 'sugeridas' || categoria === 'picante' ? 'flirty' : categoria === 'nostalgia' ? 'nostalgic' : categoria === 'profundo' ? 'deep' : categoria === 'divertido' ? 'fun' : 'light', used: true, createdAt: new Date().toISOString() }] }), undefined, false);
    copiar(texto);
    ctx.notify('Sugestão copiada! Abra o chat e cole para enviar.');
    if (onStartChat) { onClose(); onStartChat(); }
  };

  return (
    <Modal title="Puxar assunto" description={`Sugestões montadas a partir da ficha de ${person.nome}${persona.marcadores.length ? ` — ${persona.marcadores.slice(0, 3).join(', ')}` : ''}. O clima acompanha o que vocês já têm.`} onClose={onClose} wide
      footer={<><Button onClick={() => setVersao(versao + 1)}><RefreshCw size={16} />Novas sugestões</Button></>}>
      <div className="picker-tabs" style={{ marginBottom: 14 }}>
        {categorias.map(item => <button key={item.id} className={categoria === item.id ? 'active' : ''} onClick={() => setCategoria(item.id)}><item.icone size={14} strokeWidth={1.8} /> {item.label}</button>)}
      </div>

      <p className="chat-icebreakers-title" style={{ marginBottom: 10 }}><Sparkles size={13} />{estagio.label} · química {Math.round(estado.afinidade)}% — {estagio.descricao}</p>

      <div className="icebreaker-list">
        {sugestoes.map((sugestao, indice) => <div key={`${sugestao.texto}-${indice}`} className="icebreaker-row">
          <Lightbulb size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ flex: 1 }}>{sugestao.texto}<small className="muted" style={{ display: 'block', fontSize: 10, marginTop: 3 }}>{sugestao.motivo}</small></span>
          <span className="icebreaker-cat"><categoriaAtual.icone size={12} strokeWidth={1.8} />{categoriaAtual.label}</span>
          <IconButton label={copiado === sugestao.texto ? 'Copiado!' : 'Copiar'} onClick={() => copiar(sugestao.texto)}><Copy size={15} /></IconButton>
          <Button variant="primary" onClick={() => usar(sugestao.texto)} style={{ padding: '6px 12px', minHeight: 30, fontSize: 11 }}><MessageCircle size={13} />Usar</Button>
        </div>)}
      </div>

      {!podePicante && persona.adulta && <p className="muted small" style={{ marginTop: 14 }}>Quer sugestões picantes? Ligue o modo adulto em <b>Ajustes → Conversas</b>. Ele só vale para fichas com 18 anos ou mais.</p>}
      {!persona.adulta && <p className="muted small" style={{ marginTop: 14 }}>Esta ficha tem menos de 18 anos: as sugestões ficam sempre no papo leve, sem flerte.</p>}

      {persona.interesses.length > 0 && <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Sparkles size={15} style={{ color: 'var(--accent)' }} />Assuntos que ela puxa sozinha</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {persona.interesses.map(interesse => <span key={interesse.id} className="tag" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 12px', fontSize: 11 }} title={interesse.temas.join(' · ')}>{interesse.label}</span>)}
        </div>
      </div>}
    </Modal>
  );
}
