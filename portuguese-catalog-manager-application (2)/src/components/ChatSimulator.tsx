import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Sparkles, Phone, Video, MoreVertical, Smile, Camera } from 'lucide-react';
import type { Person } from '../types';
import { useCatalog } from '../context';
import { Avatar, Button, IconButton } from './ui';
import { formatDate, generateId } from '../store';

type Mood = 'happy' | 'flirty' | 'shy' | 'playful' | 'curious' | 'neutral';

const OPENERS: Record<Mood, string[]> = {
  happy: ['Oi! Como você está hoje? 😊', 'Eii! Pensei em você agora 😄', 'Olá! Tudo bem por aí?'],
  flirty: ['Oi, linda 😏', 'Pensando em você hoje... 😘', 'Vim só pra te mandar um oi 😊'],
  shy: ['Oi... desculpa incomodar 🙈', 'Tava aqui pensando e resolvi mandar oi', 'Espero que esteja tudo bem 🥺'],
  playful: ['Adivinha quem lembrou de você? 🤭', 'Ei, você tá ocupada? Tenho uma pergunta importante 😜', 'Preparada pro melhor dia da semana?'],
  curious: ['Oi! O que você tá fazendo hoje?', 'Eii, me conta como foi seu dia?', 'Oi! Tava curioso pra saber de você'],
  neutral: ['Oi! Tudo bem?', 'Olá! Como vão as coisas?', 'Oi! Passei pra dar um oi'],
};

const REACTIONS = {
  greetings: ['Oi! Tudo bem sim, e você? 😊', 'Oiii! Que bom que você apareceu 💕', 'Oi! Pensei em você hoje também!', 'Eii! Que surpresa boa 🥰', 'Olá! Que saudade!'],
  compliment: ['Ah, obrigada! Você é tão fofo 🥺💕', 'Para com isso, você que é incrível 😳', 'Nossa, você me deixou sem graça 😊', 'Aww, isso fez meu dia! 💖'],
  question: ['Hum, deixa eu pensar... 🤔', 'Boa pergunta! Acho que...', 'Que interessante! 🤓', 'Nossa, nunca parei pra pensar nisso!'],
  plans: ['Ah, que ideia legal! Vamos sim 😊', 'Hmm, vou ver mas quero muito!', 'Tô dentro! Quando? 🤩', 'Seria incrível!'],
  missing: ['Também tô com saudade 🥺', 'Ah, eu também! Precisamos nos ver logo 💖', 'Queria você aqui agora 😔', 'Saudade também! Quero te ver'],
  default: ['Ah que legal! 😊', 'Entendi! 🤔', 'Nossa, interessante!', 'Haha, entendi kkkk', 'Que bom! 💕', 'Sério? Me conta mais!', 'Você sempre com as melhores ideias 🤭', 'Kkkkkk você é engraçado', 'Hmm, vou pensar sobre isso', 'Com certeza! 😊'],
};

function pickResponse(text: string, mood: Mood): string {
  const lower = text.toLowerCase();
  let pool = REACTIONS.default;
  if (/\b(oi|olá|ola|eii|ei|hey|eae|e aí|bom dia|boa tarde|boa noite)\b/i.test(lower)) pool = REACTIONS.greetings;
  else if (/(linda|gostosa|bonita|perfeita|maravilhosa|gata|incrível|incrivel|fofa|doce)/i.test(lower)) pool = REACTIONS.compliment;
  else if (/\?|\b(qu|como|qual|onde|quando|por que|porque|quem)\b/i.test(lower)) pool = REACTIONS.question;
  else if (/(vamos|sair|encontrar|encontro|café|cafe|marcar|rolê|role|cinema|comer|rolar)/i.test(lower)) pool = REACTIONS.plans;
  else if (/(saudade|saudades|sinto sua falta|queria te ver|pensando em você|pensando em voce)/i.test(lower)) pool = REACTIONS.missing;
  const reply = pool[Math.floor(Math.random() * pool.length)];
  // Add some mood-based flavor
  if (mood === 'flirty' && Math.random() < 0.4) return reply.replace(/[.!]+$/, '... 😏');
  if (mood === 'shy' && Math.random() < 0.3) return reply + ' 🙈';
  if (mood === 'playful' && Math.random() < 0.4) return reply + ' 🤭';
  return reply;
}

const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'happy', emoji: '😊', label: 'Alegre' },
  { id: 'playful', emoji: '😜', label: 'Brincalhona' },
  { id: 'flirty', emoji: '😏', label: 'Flertando' },
  { id: 'shy', emoji: '🥺', label: 'Tímida' },
  { id: 'curious', emoji: '🤔', label: 'Curiosa' },
  { id: 'neutral', emoji: '🙂', label: 'Neutra' },
];

function typDelay(text: string) {
  return Math.min(2800, Math.max(700, text.length * 28 + Math.random() * 900));
}

export default function ChatSimulator({ person, onClose }: { person: Person; onClose: () => void }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>('happy');
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [showIcebreakers, setShowIcebreakers] = useState(false);

  const messages = useMemo(
    () => data.chats.filter(m => m.personId === person.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [data.chats, person.id]
  );

  useEffect(() => {
    if (!messages.length) {
      // Start with an opener
      const opener = OPENERS[mood][Math.floor(Math.random() * OPENERS[mood].length)];
      ctx.commit(d => ({
        ...d,
        chats: [...d.chats, { id: generateId(), personId: person.id, role: 'them', text: opener, timestamp: new Date().toISOString(), mood }],
      }), undefined, false);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    ctx.commit(d => ({
      ...d,
      chats: [...d.chats, { id: generateId(), personId: person.id, role: 'user', text: trimmed, timestamp: now, mood }],
    }), undefined, false);
    setInput('');
    setShowIcebreakers(false);
    // Their response
    const reply = pickResponse(trimmed, mood);
    setTyping(true);
    setTimeout(() => {
      ctx.commit(d => ({
        ...d,
        chats: [...d.chats, { id: generateId(), personId: person.id, role: 'them', text: reply, timestamp: new Date().toISOString(), mood }],
      }), undefined, false);
      setTyping(false);
    }, typDelay(reply));
  };

  const quickTopics = [
    'Como foi seu dia?',
    'Quer tomar um café comigo?',
    'Pensei em você hoje 💭',
    'Qual foi a melhor coisa da sua semana?',
    'Vamos fazer algo diferente esse fim de semana?',
    'Tô com saudade de você',
  ];

  const clear = () => {
    ctx.commit(d => ({ ...d, chats: d.chats.filter(m => m.personId !== person.id) }), 'Conversa reiniciada.', false);
  };

  const online = Math.random() > 0.4;

  return (
    <div className="chat-simulator">
      <div className="chat-header">
        <div className="chat-header-top">
          <IconButton label="Voltar" onClick={onClose}><ArrowLeft size={20} /></IconButton>
          <div className="chat-header-info" onClick={() => { onClose(); ctx.openPerson(person); }}>
            <span className="chat-avatar-wrap">
              <Avatar person={person} size={42} />
              <span className={`chat-status-dot ${online ? 'online' : ''}`} />
            </span>
            <div>
              <strong>{person.nome}</strong>
              <small>{typing ? 'digitando...' : online ? 'online' : `visto por último ${formatDate(person.ultimoVisto || person.updatedAt)}`}</small>
            </div>
          </div>
          <div className="chat-header-actions">
            <IconButton label="Chamada de vídeo"><Video size={18} /></IconButton>
            <IconButton label="Chamada de voz"><Phone size={18} /></IconButton>
            <IconButton label="Mais" onClick={clear}><MoreVertical size={18} /></IconButton>
          </div>
        </div>
        <div className="chat-mood-bar">
          <span className="chat-mood-label">Humor:</span>
          {MOODS.map(m => (
            <button key={m.id} className={mood === m.id ? 'active' : ''} onClick={() => setMood(m.id)} title={m.label}>
              <span>{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        <div className="chat-day-divider"><span>Hoje</span></div>
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              className={`chat-bubble-wrap ${msg.role === 'user' ? 'mine' : 'theirs'}`}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
            >
              {msg.role === 'them' && <Avatar person={person} size={30} />}
              <div className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <motion.div className="chat-bubble-wrap theirs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Avatar person={person} size={30} />
            <div className="chat-bubble them typing">
              <span /><span /><span />
            </div>
          </motion.div>
        )}
      </div>

      {!messages.length && !typing && (
        <div className="chat-welcome">
          <p>Como você quer começar a conversa com {person.nome.split(' ')[0]}?</p>
        </div>
      )}

      {showIcebreakers && (
        <div className="chat-icebreakers">
          {quickTopics.map(t => (
            <button key={t} onClick={() => send(t)}>{t}</button>
          ))}
        </div>
      )}

      <form className="chat-input-bar" onSubmit={e => { e.preventDefault(); send(input); }}>
        <IconButton label="Sugestões" onClick={() => setShowIcebreakers(!showIcebreakers)}>
          <Sparkles size={20} className={showIcebreakers ? 'active' : ''} />
        </IconButton>
        <IconButton label="Emoji"><Smile size={20} /></IconButton>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Mensagem para ${person.nome.split(' ')[0]}...`}
          aria-label="Mensagem"
        />
        <IconButton label="Enviar foto"><Camera size={20} /></IconButton>
        <Button variant="primary" onClick={() => send(input)} disabled={!input.trim()}>
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
