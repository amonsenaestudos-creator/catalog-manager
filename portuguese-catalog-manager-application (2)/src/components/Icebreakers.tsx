import { useMemo, useState } from 'react';
import { RefreshCw, Sparkles, Copy, MessageCircle, Lightbulb } from 'lucide-react';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { Button, IconButton, Modal } from './ui';

interface Props {
  person: Person;
  onClose: () => void;
  onStartChat?: () => void;
}

const BANKS = {
  fun: [
    'Qual a coisa mais sem noção que já aconteceu com você?',
    'Se pudesse jantar com qualquer pessoa do mundo, quem seria?',
    'Qual o filme que você já assistiu umas 10 vezes?',
    'Se você tivesse um superpoder por um dia, qual escolheria?',
    'Qual foi a pior (e mais engraçada) experiência com comida que já teve?',
    'Você tem uma habilidade inútil? Conta aí.',
    'Qual é a pior cantada que já te deram? E a melhor?',
    'Se você fosse personagem de filme, de qual gênero seria?',
  ],
  deep: [
    'O que te faz sentir realmente viva?',
    'Se pudesse voltar no tempo e dar um conselho a si mesma aos 15 anos, o que diria?',
    'Qual é a memória mais feliz que você tem?',
    'O que é algo que você aprendeu recentemente que mudou sua forma de ver as coisas?',
    'Qual a coisa que você mais valoriza em uma amizade?',
    'Se você pudesse mudar uma coisa no mundo hoje, o que seria?',
    'Como é um dia perfeito para você?',
  ],
  light: [
    'Recomenda uma série que você tá amando ultimamente?',
    'Qual seu lugar favorito na cidade?',
    'Café, chá ou nenhum dos dois?',
    'Tem uma música que você não consegue parar de ouvir?',
    'Qual a melhor coisa que comeu essa semana?',
    'Se o dia tivesse 25h, o que você faria com a hora extra?',
    'Qual app você passa mais tempo e qual gostaria de apagar?',
  ],
  flirty: [
    'Sabia que você tem o melhor sorriso do meu catálogo? 😏',
    'Se a gente saísse pra tomar um café hoje, qual você escolheria?',
    'Qual o tipo de programa que te faz pensar "queria companhia"?',
    'Se eu te convidasse pra um passeio de última hora, você toparia?',
    'Qual foi o melhor elogio que já recebeu? Vou superar ele.',
  ],
  nostalgic: [
    'Qual desenho você amava quando era criança?',
    'Se pudesse voltar a um dia específico da sua vida, qual seria?',
    'Qual a melhor lembrança que você tem da escola?',
    'Tem uma música que sempre te leva de volta a um momento específico?',
    'Qual a viagem que mais marcou você até hoje?',
    'Se pudesse reviver uma conversa, qual seria?',
  ],
};

const CATEGORIES: { id: keyof typeof BANKS; label: string; emoji: string }[] = [
  { id: 'light', label: 'Levinho', emoji: '✨' },
  { id: 'fun', label: 'Divertido', emoji: '😄' },
  { id: 'deep', label: 'Profundo', emoji: '🌙' },
  { id: 'flirty', label: 'Flertando', emoji: '😏' },
  { id: 'nostalgic', label: 'Nostalgia', emoji: '🎞️' },
];

function shuffle<T>(arr: T[], n = 4): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function makePersonal(p: Person, text: string): string {
  const name = p.nome.split(' ')[0] || 'você';
  const replacements: [RegExp, string][] = [
    [/\bvocê\b/g, name],
  ];
  let result = text;
  for (const [re, rep] of replacements) {
    if (Math.random() < 0.3) result = result.replace(re, rep);
  }
  return result;
}

export default function Icebreakers({ person, onClose, onStartChat }: Props) {
  const ctx = useCatalog();
  const [category, setCategory] = useState<keyof typeof BANKS>('light');
  const [suggestions, setSuggestions] = useState<string[]>(() => shuffle(BANKS.light));
  const [copied, setCopied] = useState('');

  const refresh = () => setSuggestions(shuffle(BANKS[category]));
  const changeCat = (cat: keyof typeof BANKS) => { setCategory(cat); setSuggestions(shuffle(BANKS[cat])); };

  const copy = (text: string) => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(text);
    setTimeout(() => setCopied(''), 1500);
  };

  const sendToChat = (text: string) => {
    // Opens the chat and we could pre-fill; for now just open it
    onClose();
    if (onStartChat) onStartChat();
    // Also store as used icebreaker
    ctx.commit(d => ({
      ...d,
      icebreakers: [...d.icebreakers, {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        personId: person.id, text, category, used: true, createdAt: new Date().toISOString(),
      }],
    }), undefined, false);
    // Notify user
    setTimeout(() => ctx.notify('Quebra-gelo copiado! Inicie a conversa e cole.'), 200);
    copy(text);
  };

  const similar = useMemo(() => {
    const pool = ctx.data.people.filter(p => p.id !== person.id && !p.deletedAt);
    // Find people with shared tags/category
    const scored = pool.map(p => {
      let score = 0;
      p.tags.forEach(t => { if (person.tags.includes(t)) score += 2; });
      if (p.localizacaoOnde === person.localizacaoOnde) score += 1;
      return { p, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    return scored;
  }, [ctx.data.people, person]);

  return (
    <Modal title="Puxa conversa" description={`Sugestões de perguntas e assuntos para ${person.nome.split(' ')[0]}`} onClose={onClose} wide footer={<Button onClick={refresh}><RefreshCw size={16} />Novas sugestões</Button>}>
      <div className="picker-tabs" style={{ marginBottom: 18 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} className={category === c.id ? 'active' : ''} onClick={() => changeCat(c.id)}>
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="icebreaker-list">
        {suggestions.map((text, i) => {
          const personalized = makePersonal(person, text);
          return (
            <div key={i} className="icebreaker-row">
              <Lightbulb size={15} className="muted" style={{ color: 'var(--accent)' }} />
              <span style={{ flex: 1 }}>{personalized}</span>
              <span className="icebreaker-cat">{CATEGORIES.find(c => c.id === category)?.label}</span>
              <IconButton label={copied === personalized ? 'Copiado!' : 'Copiar'} onClick={() => copy(personalized)}>
                <Copy size={15} />
              </IconButton>
              {onStartChat && (
                <Button variant="primary" onClick={() => sendToChat(personalized)} style={{ padding: '6px 12px', minHeight: 30, fontSize: 11 }}>
                  <MessageCircle size={13} />Usar
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {similar.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            Vocês tem interesses em comum com...
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {similar.map(({ p, score }) => (
              <button key={p.id} onClick={() => { onClose(); ctx.openPerson(p); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}>
                {p.nome.split(' ')[0]}
                <small style={{ color: 'var(--accent)', fontSize: 9 }}>{score} pontos</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
