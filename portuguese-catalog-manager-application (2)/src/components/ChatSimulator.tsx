import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, Camera, Download, Eraser, Flame, Heart, Info, Lock, MessageCircle, MoreVertical, Send, Smile, Sparkles, Timer, Wand2, X } from 'lucide-react';
import type { ChatMessage, Person } from '../types';
import { useCatalog } from '../context';
import { Avatar, Button, IconButton, Modal } from './ui';
import { downloadBlob, formatDate, generateId } from '../store';
import { buildPersona } from '../lib/persona';
import {
  HUMORES, analisarConversa, cartaoDaPersona, conversaParaMarkdown, estadoDe, estagioAtual, planDoNada, planOpening, planReply,
  planSpontaneous, sugerirAberturas, sugerirRespostas, type Tone,
} from '../lib/dialogue';
import { seloDaRelacao } from '../lib/relacao';

/** Emojis de uso rápido no campo de mensagem. */
const EMOJIS = ['😊', '😍', '😂', '😏', '🥰', '😅', '🙈', '😉', '💕', '🔥', '😢', '😳', '🤔', '👏', '💛', '😴', '🍕', '☕', '🌙', '✨'];

export default function ChatSimulator({ person, onClose }: { person: Person; onClose: () => void }) {
  const ctx = useCatalog();
  const { data } = ctx;
  const s = data.settings;
  const persona = useMemo(() => buildPersona(person, { people: data.people, settings: data.settings }), [person, data.people, data.settings]);
  const relacao = persona.relacao;
  const estado = estadoDe(data, person);
  const mensagens = useMemo(() => data.chats.filter(mensagem => mensagem.personId === person.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [data.chats, person.id]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sugestoes, setSugestoes] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [photoPicker, setPhotoPicker] = useState(false);
  const [auto, setAuto] = useState(!!s.chatAuto);
  const [aviso, setAviso] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rapido = s.chatSpeed === 'rapido';
  const adulto = !!s.adultMode && persona.adulta && relacao.adultoPermitido;
  // Ela te chama pelo nome de usuário — é o apelido que a pessoa conhece.
  const nomeUsuario = (s.username || s.profileName || 'você').split(/[@.\s]+/)[0];
  // Contexto comum a toda mensagem: catálogo (família), sua idade e estilo.
  const contextoDeConversa = { pessoas: data.people, dono: s, abreviar: s.chatSlang !== false };
  const estagio = estagioAtual(estado);
  const tom: Tone = estado.tom;
  const humor = estado.humor;
  const humorAtual = HUMORES.find(item => item.id === humor) || HUMORES[HUMORES.length - 1];

  const limparTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; if (autoTimer.current) clearTimeout(autoTimer.current); };
  useEffect(() => {
    if (!mensagens.length) abrirConversa();
    return () => { timers.current.forEach(clearTimeout); autoTimer.current && clearTimeout(autoTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length, typing]);

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(''), 5200);
    return () => clearTimeout(timer);
  }, [aviso]);

  const salvarEstado = (next: typeof estado) => ctx.commit(d => ({ ...d, chatStates: { ...d.chatStates, [person.id]: next } }), undefined, false);
  const adicionarMensagem = (mensagem: ChatMessage) => ctx.commit(d => ({ ...d, chats: [...d.chats, mensagem] }), undefined, false);

  /** Distribui as bolhas dela na tela, com "digitando..." entre elas. */
  const tocarPlano = (plano: ReturnType<typeof planReply>) => {
    limparTimers();
    setTyping(true);
    let acumulado = 0;
    plano.bolhas.forEach(bolha => {
      acumulado += bolha.atraso;
      timers.current.push(setTimeout(() => {
        adicionarMensagem({ id: generateId(), personId: person.id, role: 'them', text: bolha.texto, timestamp: new Date().toISOString(), mood: plano.humor, tom: plano.tom });
        if (ctx.data.settings.sounds !== false) ctx.sound('pop');
      }, acumulado));
    });
    timers.current.push(setTimeout(() => setTyping(false), acumulado + 180));
    if (plano.desviado) setAviso('Ela desconversou: esse assunto ainda não é do jeito dela com você.');
    else if (plano.eventos.some(evento => evento.startsWith('estagio:'))) setAviso(`A conversa evoluiu: agora vocês estão em "${plano.estagio.label}".`);
    // De vez em quando ela manda uma foto junto (quando tem foto na ficha).
    if (person.fotos.length && plano.tom !== 'amizade' && Math.random() < 0.18) {
      const foto = person.fotos[Math.floor(Math.random() * person.fotos.length)];
      timers.current.push(setTimeout(() => adicionarMensagem({ id: generateId(), personId: person.id, role: 'them', text: 'Olha esse momento meu 😊', timestamp: new Date().toISOString(), mood: plano.humor, tom: plano.tom, foto: foto.url }), acumulado + 900));
    }
  };

  const abrirConversa = () => {
    const plano = planOpening({ person, persona, state: estadoDe(data, person), adulto, rand: Math.random, rapido, nomeUsuario, primeiraVez: true, ...contextoDeConversa });
    salvarEstado(plano.state);
    tocarPlano(plano);
  };

  const enviar = (texto: string, foto?: string) => {
    const limpo = texto.trim();
    if (!limpo && !foto) return;
    const base = estadoDe(data, person);
    const plano = planReply({
      person, persona, state: base, message: limpo, historico: mensagens, adulto, rand: Math.random, rapido, nomeUsuario, fotoEnviada: !!foto, ...contextoDeConversa,
    });
    adicionarMensagem({ id: generateId(), personId: person.id, role: 'user', text: limpo, timestamp: new Date().toISOString(), tom, foto });
    salvarEstado(plano.state);
    setInput('');
    setSugestoes(false);
    setEmojiOpen(false);
    setPhotoPicker(false);
    if (foto && !limpo) setAviso('Foto enviada.');
    tocarPlano(plano);
  };

  /** Mensagem que chega do nada: ela lembra de algo que você nem fez. */
  const doNada = () => {
    if (typing) return;
    const base = estadoDe(data, person);
    const plano = planDoNada({ person, persona, state: base, adulto, rand: Math.random, rapido, nomeUsuario, ...contextoDeConversa });
    salvarEstado(plano.state);
    tocarPlano(plano);
  };

  /** Mensagem espontânea (modo automático ou botão de "deixa ela puxar"). */
  const espontanea = (motivo?: 'saudade' | 'lembranca' | 'assunto') => {
    if (typing) return;
    const base = estadoDe(data, person);
    const plano = planSpontaneous({ person, persona, state: base, adulto, rand: Math.random, rapido, nomeUsuario, motivo, ...contextoDeConversa });
    salvarEstado(plano.state);
    tocarPlano(plano);
  };

  useEffect(() => {
    if (!auto || typing) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      if (typing) return;
      // De vez em quando chega aquela mensagem do nada: ela lembra de algo que você nem fez.
      if (data.settings.chatDoNada !== false && Math.random() < 0.35) doNada(); else espontanea();
    }, 22000 + Math.random() * 16000);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, typing, mensagens.length, person.id, data.settings.chatDoNada]);

  const limparConversa = () => {
    limparTimers();
    ctx.commit(d => ({ ...d, chats: d.chats.filter(mensagem => mensagem.personId !== person.id) }), 'Conversa reiniciada.', false);
    const novo = { ...estadoDe(data, person), recentes: [], usados: [], humor: 'neutral' as const };
    salvarEstado(novo);
    setMenuOpen(false);
    setTimeout(abrirConversa, 60);
  };

  const limparMemoria = () => {
    salvarEstado({ ...estadoDe(data, person), topicos: {}, lembrancas: [], perguntas: [], recentes: [], usados: [], ofensas: 0 });
    setMenuOpen(false);
    setAviso('Memória da conversa limpa: ela voltou a te conhecer.');
  };

  const exportar = (tipo: 'copiar' | 'baixar') => {
    const markdown = conversaParaMarkdown(person, mensagens);
    if (tipo === 'copiar') { try { navigator.clipboard.writeText(markdown); ctx.notify('Conversa copiada para a área de transferência.'); } catch { ctx.notify('Não foi possível copiar automaticamente.', true); } }
    else { downloadBlob(new Blob([markdown], { type: 'text/markdown' }), `conversa-${person.nome.toLowerCase().replace(/\s+/g, '-')}.md`); ctx.notify('Arquivo da conversa baixado.'); }
    setMenuOpen(false);
  };

  const analise = useMemo(() => analisarConversa(mensagens), [mensagens]);
  const ultimaDela = [...mensagens].reverse().find(mensagem => mensagem.role === 'them');
  const sugestoesProntas = useMemo(() => sugerirRespostas({
    person, persona, state: estado, mensagemDela: ultimaDela?.text || '', adulto, quantas: 4, tom, ...contextoDeConversa,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [person, persona, estado, ultimaDela?.text, adulto, tom, data.people, s.ownerAge, s.ownerBirthday]);
  const aberturas = useMemo(() => sugerirAberturas({ person, persona, state: estado, historico: mensagens, adulto, quantas: 4, ...contextoDeConversa }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person, persona, estado, mensagens, adulto, data.people, s.ownerAge, s.ownerBirthday]);
  const online = !!(person.ultimoVisto && Date.now() - Date.parse(person.ultimoVisto) < 3 * 86400000) || mensagens.length % 2 === 1;
  const statusLinha = typing ? 'digitando...' : online ? 'online agora' : `visto por último ${formatDate(person.ultimoVisto || person.updatedAt)}`;
  const mostrarMedidor = s.chatMeter !== false;

  // Divisores de dia dentro da conversa.
  const dias: { chave: string; mensagens: ChatMessage[] }[] = [];
  for (const mensagem of mensagens) {
    const chave = (mensagem.timestamp || '').slice(0, 10);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.chave === chave) ultimo.mensagens.push(mensagem);
    else dias.push({ chave, mensagens: [mensagem] });
  }
  const rotuloDia = (chave: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (chave === hoje) return 'Hoje';
    if (chave === ontem) return 'Ontem';
    return formatDate(chave);
  };

  const cartao = cartaoDaPersona(persona);
  const fotos = [...person.fotos.map(foto => ({ id: foto.id, url: foto.url })), ...data.orphanPhotos.slice(0, 12).map(foto => ({ id: foto.id, url: foto.url }))];

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
              <small>{statusLinha}</small>
              <em className="chat-persona-line" title={cartao.resumo}>{cartao.resumo}</em>
              <em className={`chat-relation-line ${relacao.veCrianca ? 'crianca' : relacao.ehTia ? 'tia' : relacao.familiar ? 'familia' : ''}`} title={relacao.descricao}>{seloDaRelacao(relacao)}</em>
            </div>
          </div>
          <div className="chat-header-actions">
            <IconButton label="Mais opções" onClick={() => setMenuOpen(!menuOpen)}><MoreVertical size={18} /></IconButton>
          </div>
        </div>

        {mostrarMedidor && <div className="chat-meter" title={estagio.descricao}>
          <span className="chat-meter-label"><Heart size={12} />Química <b>{Math.round(estado.afinidade)}%</b> · {estagio.label}</span>
          <span className="chat-meter-track"><i style={{ width: `${estado.afinidade}%` }} /></span>
        </div>}

        <div className="chat-status-row">
          <span className="chat-status-line" title="O humor muda sozinho conforme a conversa anda">
            <span className="chat-status-label">Humor</span>
            <b>{humorAtual.label}</b>
          </span>
          {!adulto && persona.adulta && !relacao.adultoPermitido && <span className="chat-status-line muted-line" title={relacao.descricao}><Lock size={12} />Sem clima adulto nesta relação</span>}
          {!adulto && persona.adulta && relacao.adultoPermitido && !s.adultMode && <span className="chat-status-line muted-line" title="Ajustes → Conversas"><Lock size={12} />Adulto desligado</span>}
          <button className={`chat-auto-toggle ${auto ? 'active' : ''}`} onClick={() => { setAuto(!auto); ctx.notify(!auto ? 'Modo automático: ela vai puxar assunto sozinha enquanto você conversa.' : 'Modo automático desligado.'); }} title="Ela puxa assunto sozinha depois de um tempo">
            <Timer size={13} />{auto ? 'Puxando sozinha' : 'Deixar puxar'}
          </button>
        </div>

        {menuOpen && <div className="chat-menu">
          <button onClick={() => { setCardOpen(true); setMenuOpen(false); }}><Info size={15} />Como ela conversa</button>
          <button onClick={() => { setSugestoes(true); setMenuOpen(false); }}><Sparkles size={15} />Puxar assunto</button>
          <button onClick={() => { espontanea(); setMenuOpen(false); }}><MessageCircle size={15} />Ela mandar mensagem agora</button>
          <button onClick={() => { doNada(); setMenuOpen(false); }}><Sparkles size={15} />Mensagem do nada</button>
          <button onClick={() => exportar('copiar')}><Brain size={15} />Copiar conversa</button>
          <button onClick={() => exportar('baixar')}><Download size={15} />Baixar conversa (.md)</button>
          <button onClick={limparMemoria}><Eraser size={15} />Limpar memória dela</button>
          <button className="danger-text" onClick={limparConversa}><X size={15} />Reiniciar conversa</button>
        </div>}
      </div>


      {aviso && <div className="chat-aviso"><Sparkles size={13} /><span>{aviso}</span></div>}

      <div className="chat-messages" ref={scrollRef}>
        {dias.map(dia => (
          <div key={dia.chave}>
            <div className="chat-day-divider"><span>{rotuloDia(dia.chave)}</span></div>
            <AnimatePresence initial={false}>
              {dia.mensagens.map(mensagem => (
                <motion.div
                  key={mensagem.id}
                  className={`chat-bubble-wrap ${mensagem.role === 'user' ? 'mine' : 'theirs'}`}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {mensagem.role === 'them' && <Avatar person={person} size={30} />}
                  <div className={`chat-bubble ${mensagem.role}`}>
                    {mensagem.foto && <img src={mensagem.foto} alt="Foto enviada na conversa" className="chat-photo" />}
                    {mensagem.text}
                    <time className="chat-hora">{(mensagem.timestamp || '').slice(11, 16)}</time>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
        {typing && (
          <motion.div className="chat-bubble-wrap theirs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Avatar person={person} size={30} />
            <div className="chat-bubble them typing"><span /><span /><span /></div>
          </motion.div>
        )}
      </div>

      {!mensagens.length && !typing && (
        <div className="chat-welcome">
          <p>{person.nome.split(' ')[0]} ainda não escreveu. Comece a conversa com uma das sugestões abaixo.</p>
        </div>
      )}

      {sugestoes && (
        <div className="chat-icebreakers">
          <p className="chat-icebreakers-title"><Wand2 size={13} />Sugestões para agora — clique para enviar</p>
          {[...sugestoesProntas, ...aberturas].slice(0, 6).map((sugestao, i) => (
            <button key={`${sugestao.texto}-${i}`} onClick={() => enviar(sugestao.texto)}>
              {sugestao.texto}
            </button>
          ))}
        </div>
      )}

      {emojiOpen && <div className="chat-emoji-bar">{EMOJIS.map(emoji => <button key={emoji} onClick={() => setInput(valor => `${valor}${emoji}`)}>{emoji}</button>)}</div>}

      <form className="chat-input-bar" onSubmit={evento => { evento.preventDefault(); enviar(input); }}>
        <IconButton label="Sugestões de mensagem" onClick={() => setSugestoes(!sugestoes)}>
          <Sparkles size={20} className={sugestoes ? 'active' : ''} />
        </IconButton>
        <IconButton label="Emojis" onClick={() => setEmojiOpen(!emojiOpen)}><Smile size={20} /></IconButton>
        <input
          value={input}
          onChange={evento => setInput(evento.target.value)}
          placeholder={`Mensagem para ${person.nome.split(' ')[0]}...`}
          aria-label="Mensagem"
        />
        <IconButton label="Enviar foto" onClick={() => setPhotoPicker(true)}><Camera size={20} /></IconButton>
        <Button variant="primary" onClick={() => enviar(input)} disabled={!input.trim()}>
          <Send size={17} />
        </Button>
      </form>

      {cardOpen && <Modal title={`Como ${person.nome.split(' ')[0]} conversa`} description="Tudo isso é lido direto da ficha: idade, comportamento, categoria, tags, signo e música." onClose={() => setCardOpen(false)}>
        <div className="persona-card">
          <p className="persona-resumo">{cartao.resumo}</p>
          <dl>
            <div><dt>Como ela te vê</dt><dd>{cartao.relacao} — {cartao.relacaoDescricao}</dd></div>
            <div><dt>Como ela te chama</dt><dd>{cartao.tratamento.join(', ')}</dd></div>
            <div><dt>Família dela no catálogo</dt><dd>{cartao.familiares.length ? cartao.familiares.join(' · ') : 'nenhum vínculo cadastrado na ficha'}</dd></div>
            <div><dt>Intimidade hoje</dt><dd>{estagio.label} ({Math.round(estado.afinidade)}% de química) — {estagio.descricao}</dd></div>
            <div><dt>Marcadores de personalidade</dt><dd>{cartao.marcadores.length ? cartao.marcadores.join(', ') : 'nenhum marcador forte na ficha'}</dd></div>
            <div><dt>Assuntos que ela puxa</dt><dd>{cartao.interesses.join(', ')}</dd></div>
            <div><dt>Contexto</dt><dd>{cartao.contexto.length ? cartao.contexto.join(' · ') : 'rotina não anotada'}</dd></div>
            <div><dt>Assunto que ela deve lembrar</dt><dd>{estado.lembrancas.length ? estado.lembrancas.map(item => item.valor).join(' · ') : 'nada anotado ainda'}</dd></div>
            <div><dt>Conteúdo adulto</dt><dd>{!persona.adulta ? 'não se aplica (ficha com menos de 18 anos)' : !relacao.adultoPermitido ? `bloqueado por causa da relação: ${cartao.relacao}` : adulto ? 'liberado para esta ficha' : 'bloqueado: ligue o modo adulto em Ajustes → Conversas'}</dd></div>
          </dl>
        </div>
        {mensagens.length > 1 && <div className="chat-analise">
          <h3>Como está a conversa</h3>
          <div className="chat-analise-grid">
            <span><b>{analise.total}</b> mensagens</span>
            <span><b>{analise.doUsuario}</b> suas</span>
            <span><b>{analise.dela}</b> dela</span>
            <span><b>{analise.dias}</b> dia(s)</span>
            <span><b>{analise.media.ela}</b> caracteres por mensagem dela</span>
            <span><b>{analise.perguntasDela}</b> perguntas dela</span>
          </div>
          {analise.temas.length > 0 && <p className="muted">Temas mais falados: {analise.temas.map(tema => tema.tema).join(', ')}.</p>}
          <p className="muted">{analise.equilibrado ? 'A conversa está equilibrada: os dois escrevem na mesma medida.' : 'Está bem desequilibrada: tente perguntar mais sobre ela do que falar de você.'}</p>
        </div>}
      </Modal>}

      {photoPicker && <Modal title="Enviar uma foto" description="Escolha uma imagem do seu catálogo para mandar na conversa." onClose={() => setPhotoPicker(false)} wide>
        {fotos.length ? <div className="chat-photo-picker">{fotos.map(foto => <button key={foto.id} onClick={() => enviar(input, foto.url)}><img src={foto.url} alt="Foto para enviar" /></button>)}</div>
          : <p className="muted">Nenhuma foto disponível. Adicione imagens na galeria ou na ficha desta pessoa.</p>}
      </Modal>}

      {sugestoes === false && mensagens.length > 0 && !typing && (
        <button className="chat-hint" onClick={() => setSugestoes(true)}>
          <Wand2 size={13} />{tom === 'amizade' ? 'Não sabe o que dizer? Veja sugestões' : 'Sugestões para manter esse tom'}
        </button>
      )}

      <p className="chat-footnote">
        <Flame size={11} />Conversa simulada com base na ficha, na idade e no vínculo entre vocês. Ela te chama de {nomeUsuario} e trata do jeito que a relação permite ({cartao.relacao.toLowerCase()}). O clima sobe sozinho com a intimidade; nada é oferecido do nada. Ela lembra do que você conta ({estado.lembrancas.length} anotação(ões)).
        {!person.fotos.length && <button onClick={() => { onClose(); ctx.openPerson(person); }}> Adicionar foto à ficha</button>}
      </p>
    </div>
  );
}
