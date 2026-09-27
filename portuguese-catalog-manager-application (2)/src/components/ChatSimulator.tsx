import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowLeft, Brain, Camera, Download, Eraser, Flame, Heart, Info, Lock, MessageCircle, MoreVertical, Reply, Send, Shuffle, Smile, Sparkles, Timer, Volume2, VolumeX, Wand2, X } from 'lucide-react';
import type { ChatMessage, Person } from '../types';
import { useCatalog } from '../context';
import { Avatar, Button, IconButton, Modal } from './ui';
import { downloadBlob, formatDate, generateId } from '../store';
import { buildPersona, seededRandom } from '../lib/persona';
import { iaConfigurada, responderComIA, URL_PADRAO_IA } from '../lib/ia';
import {
  EMOJI_HUMOR, HUMORES, montarAtrasos, PACIENCIA_BAIXA, PACIENCIA_MAXIMA, ROTULO_HUMOR, analisarConversa, cartaoDaPersona, conversaParaMarkdown,
  estadoDe, estagioAtual, pacienciaDe, promptDoSistema, resumirMemorias,
  sugerirAberturas, sugerirRespostas, type EstadoEmocional, type EstadoEstruturado, type Tone,
} from '../lib/dialogue';
import {
  estadoEstendidoDe, intervaloDeIniciativa, memoriasVisiveis, ritmoDePlano, rotuloDoTopico,
  processarAbertura, processarPuxada, processarResposta, type PlanoEstendido,
} from '../lib/dialogue/engine';
import { seloDaRelacao } from '../lib/relacao';
import { falar, pararDeFalar, perfilDeVoz, vozSuportada } from '../features/voice';

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
  // Voz: falar em voz alta o que ela escreveu, com o tom e o ritmo da ficha.
  const [falarAlto, setFalarAlto] = useState(!!s.chatVoz && vozSuportada());
  const [falando, setFalando] = useState<string | null>(null);
  const perfilVozDaPessoa = useMemo(() => perfilDeVoz(person), [person]);
  // Retrato do momento: o estado que a última mensagem produziu — agora com
  // a camada viva: humor contínuo, objetivo, tópico atual e iniciativa.
  const [retrato, setRetrato] = useState(false);
  const [ultimoEstado, setUltimoEstado] = useState<{
    estado: EstadoEmocional; json: EstadoEstruturado;
    humor?: PlanoEstendido['humor']; humorLeitura?: string;
    objetivo?: PlanoEstendido['objetivo']; topico?: string | null; iniciativa?: number;
  } | null>(null);
  const [promptAberto, setPromptAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  // Rolando o histórico para reler, o campo continua no lugar e aparece o atalho
  // para voltar ao fim da conversa.
  const [noFim, setNoFim] = useState(true);
  // Tick das suas mensagens: enviado → entregue → lida.
  const [ticks, setTicks] = useState<Record<string, 'enviado' | 'entregue' | 'lido'>>({});
  // Cada clique em "trocar sugestões" sorteia outras opções.
  const [sementeSugestoes, setSementeSugestoes] = useState(0);
  // Mensagem que você escolheu responder (citação, como no direct).
  const [respondendo, setRespondendo] = useState<ChatMessage['replyTo'] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fila do que ela ainda não leu: dá para mandar várias mensagens seguidas —
  // ela lê tudo junto e responde uma única vez, como numa conversa de verdade.
  const pendentes = useRef<{ texto: string; foto: boolean; citacao?: string }[]>([]);
  const leituraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Cada resposta em andamento tem uma rodada: mensagem nova cancela a anterior. */
  const rodada = useRef(0);
  const controleIA = useRef<AbortController | null>(null);
  const rapido = s.chatSpeed === 'rapido';
  const pausado = s.chatSpeed === 'pausado';
  const adulto = !!s.adultMode && persona.adulta && relacao.adultoPermitido;
  // IA de verdade: só para ficha adulta sem bloqueio de relação — nas outras o
  // motor local fica no comando, porque não se confia em modelo externo nisso.
  const usarIA = iaConfigurada(s.chatAI) && persona.adulta && relacao.flertePermitido;
  // Ela te chama pelo nome de usuário — é o apelido que a pessoa conhece.
  const nomeUsuario = (s.username || s.profileName || 'você').split(/[@.\s]+/)[0];
  // Contexto comum a toda mensagem: catálogo (família), sua idade e estilo.
  // Abreviação de celular (vc, hj, tá) virou opt-in: o padrão é escrever as
  // palavras por inteiro, como no direct.
  const contextoDeConversa = { pessoas: data.people, dono: s, abreviar: !!s.chatSlang, emojis: s.chatEmojis !== false, pausado };
  const estagio = estagioAtual(estado);
  const tom: Tone = estado.tom;
  const humor = estado.humor;
  const humorAtual = HUMORES.find(item => item.id === humor) || HUMORES[HUMORES.length - 1];

  /** Fala uma mensagem dela em voz alta (ou cala, se já estiver falando). */
  /**
   * Fala a resposta nova quando o modo voz está ligado. Só a última: falar o
   * histórico inteiro de uma vez seria um podcast, não uma conversa.
   */
  const ultimaFalada = useRef<string>('');
  useEffect(() => {
    if (!falarAlto || !vozSuportada()) return;
    const dela = [...mensagens].reverse().find(mensagem => mensagem.role === 'them' && mensagem.text.trim());
    if (!dela || ultimaFalada.current === dela.id) return;
    ultimaFalada.current = dela.id;
    falar({ texto: dela.text, perfil: perfilVozDaPessoa, aoTerminar: () => setFalando(null) });
    setFalando(dela.id);
  }, [mensagens, falarAlto, perfilVozDaPessoa]);

  const ouvirMensagem = (mensagem: ChatMessage) => {
    if (falando === mensagem.id) { pararDeFalar(); setFalando(null); return; }
    const deuCerto = falar({
      texto: mensagem.text,
      perfil: perfilVozDaPessoa,
      aoTerminar: () => setFalando(null),
    });
    if (!deuCerto) { ctx.notify('Este navegador não fala texto. A conversa continua funcionando por escrito.', true); return; }
    ctx.sound('voz');
    setFalando(mensagem.id);
  };
  const alternarVoz = () => {
    const proximo = !falarAlto;
    setFalarAlto(proximo);
    if (!proximo) { pararDeFalar(); setFalando(null); }
    ctx.commit(d => ({ ...d, settings: { ...d.settings, chatVoz: proximo } }), proximo ? 'Ela vai falar as respostas em voz alta.' : 'A conversa voltou a ser só por escrito.', false);
  };

  const limparTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; if (autoTimer.current) clearTimeout(autoTimer.current); if (leituraTimer.current) clearTimeout(leituraTimer.current); };
  const limparTickTimers = () => { tickTimers.current.forEach(clearTimeout); tickTimers.current = []; };
  useEffect(() => {
    if (!mensagens.length) abrirConversa();
    return () => { timers.current.forEach(clearTimeout); tickTimers.current.forEach(clearTimeout); autoTimer.current && clearTimeout(autoTimer.current); pararDeFalar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setNoFim(true);
  }, [mensagens.length, typing]);

  /** Sabe se a conversa está no fim: só aí o atalho de descer sai de cena. */
  const acompanharRolagem = () => {
    const el = scrollRef.current;
    if (!el) return;
    setNoFim(el.scrollHeight - el.scrollTop - el.clientHeight < 90);
  };
  const descerConversa = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: s.reducedMotion ? 'auto' : 'smooth' });
    setNoFim(true);
  };

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(''), 5200);
    return () => clearTimeout(timer);
  }, [aviso]);

  // Retrato do momento: usa o último estado gerado; se ainda não existe, monta um
  // a partir do que está guardado na conversa.
  const estadoCompleto: EstadoEmocional = ultimoEstado?.estado || {
    humor, paciencia: pacienciaDe(estado), afinidade: estado.afinidade, estagio,
    gatilhos: estado.gatilhos || [], leitura: `${ROTULO_HUMOR[humor]} · paciência ${Math.round(pacienciaDe(estado))}/${PACIENCIA_MAXIMA}`,
  };
  const memoriasDaConversa = resumirMemorias(estado);
  const promptAtual = promptDoSistema({ person, persona, estado: estadoCompleto });

  const salvarEstado = (next: typeof estado) => ctx.commit(d => ({ ...d, chatStates: { ...d.chatStates, [person.id]: next } }), undefined, false);
  const adicionarMensagem = (mensagem: ChatMessage) => ctx.commit(d => ({ ...d, chats: [...d.chats, mensagem] }), undefined, false);

  /** Marca a sua mensagem como entregue e depois como lida — com calma. */
  const programarTicks = (id: string, primeiroAtraso: number) => {
    setTicks(estadoAtual => ({ ...estadoAtual, [id]: 'enviado' }));
    if (s.reducedMotion) { setTicks(atual => ({ ...atual, [id]: 'lido' })); return; }
    tickTimers.current.push(setTimeout(() => setTicks(atual => ({ ...atual, [id]: 'entregue' })), 620));
    tickTimers.current.push(setTimeout(() => setTicks(atual => ({ ...atual, [id]: 'lido' })), Math.max(1400, primeiroAtraso - 260)));
  };

  /** Distribui as bolhas dela na tela, com "digitando..." entre elas — e, às
   *  vezes, a digitação para e volta: ela pensa, apaga, volta. */
  const tocarPlano = (plano: PlanoEstendido['plano'], extras?: PlanoEstendido) => {
    // Sempre quer que esteja, o retrato fica guardado para a tela mostrar.
    if (plano.estado && plano.estruturado) setUltimoEstado({
      estado: plano.estado, json: plano.estruturado,
      humor: extras?.humor, humorLeitura: extras?.humorLeitura,
      objetivo: extras?.objetivo, topico: extras?.topico, iniciativa: extras?.iniciativa,
    });
    limparTimers();
    // Bolha de rodada antiga morre silenciosamente: a conversa seguiu.
    const minha = ++rodada.current;
    setTyping(true);
    let acumulado = 0;
    plano.bolhas.forEach((bolha, indice) => {
      const inicio = acumulado;
      acumulado += bolha.atraso;
      const pausa = extras?.ritmo?.[indice]?.pausa;
      if (pausa && !s.reducedMotion) {
        timers.current.push(setTimeout(() => { if (rodada.current === minha) setTyping(false); }, inicio + pausa.ponto));
        timers.current.push(setTimeout(() => { if (rodada.current === minha) setTyping(true); }, inicio + pausa.ponto + pausa.dur));
      }
      timers.current.push(setTimeout(() => {
        if (rodada.current !== minha) return;
        adicionarMensagem({ id: generateId(), personId: person.id, role: 'them', text: bolha.texto, timestamp: new Date().toISOString(), mood: plano.humor, tom: plano.tom });
        if (ctx.data.settings.sounds !== false) ctx.sound('pop');
      }, acumulado));
    });
    // Ela continua "digitando" até acabar de mandar; o silêncio vem depois.
    timers.current.push(setTimeout(() => { if (rodada.current === minha) setTyping(false); }, acumulado + 320));
    const avisoVivo = extras?.avisos[0] || '';
    if (plano.eventos.includes('limite:grosseria')) setAviso('Ela cortou o assunto. Falar grosso mexe com o humor da conversa — paciência e química caíram.');
    else if (plano.estado && plano.estado.paciencia <= PACIENCIA_BAIXA) setAviso('A paciência dela está no fim: respostas curtas até o clima melhorar.');
    else if (plano.eventos.includes('estagio:') && plano.estado?.gatilhos.includes('ficou mais próxima')) setAviso(`Ela se abriu: a conversa chegou em "${plano.estagio.label}".`);
    else if (plano.desviado) setAviso('Ela desconversou: esse assunto ainda não é do jeito dela com você.');
    else if (plano.eventos.some(evento => evento.startsWith('estagio:'))) setAviso(`A conversa evoluiu: agora vocês estão em "${plano.estagio.label}".`);
    else if (avisoVivo) setAviso(avisoVivo);
    // De vez em quando ela manda uma foto junto (quando tem foto na ficha).
    if (person.fotos.length && plano.tom !== 'amizade' && Math.random() < 0.18) {
      const foto = person.fotos[Math.floor(Math.random() * person.fotos.length)];
      timers.current.push(setTimeout(() => {
        if (rodada.current !== minha) return;
        adicionarMensagem({ id: generateId(), personId: person.id, role: 'them', text: 'Olha esse momento meu 😊', timestamp: new Date().toISOString(), mood: plano.humor, tom: plano.tom, foto: foto.url });
      }, acumulado + 900));
    }
  };

  const abrirConversa = () => {
    const estendido = processarAbertura({ person, persona, state: estadoDe(data, person), adulto, rand: Math.random, rapido, nomeUsuario, ...contextoDeConversa });
    salvarEstado(estendido.plano.state);
    tocarPlano(estendido.plano, estendido);
  };

  /**
   * Responde ao lote de mensagens que ela ainda não tinha lido. Você pode
   * mandar várias seguidas: enquanto o timer de leitura corre, cada mensagem
   * nova reinicia o timer — ela lê tudo junto e responde uma única vez.
   */
  const responder = async () => {
    const lote = pendentes.current;
    if (!lote.length) return;
    pendentes.current = [];
    const texto = lote.map(item => item.texto).filter(Boolean).join('\n');
    const fotoEnviada = lote.some(item => item.foto);
    const citacao = [...lote].reverse().find(item => item.citacao)?.citacao;
    const base = estadoDe(data, person);
    // A camada viva interpreta a mensagem (estado, personalidade, memória,
    // objetivo, tópicos) e o motor de texto gera a resposta dentro dela.
    const estendido = processarResposta({
      person, persona, state: base, message: texto, historico: mensagens, adulto, rand: Math.random, rapido, nomeUsuario,
      fotoEnviada, citacao, ...contextoDeConversa,
    });
    salvarEstado(estendido.plano.state);
    // Com IA ligada, o texto vem do modelo — a mecânica (química, humor,
    // memória, consequências) continua sendo calculada aqui. Se falhar, o
    // motor local responde.
    let final: PlanoEstendido = estendido;
    if (usarIA && texto && s.chatAI) {
      setTyping(true);
      controleIA.current?.abort();
      controleIA.current = new AbortController();
      try {
        const bolhasIA = await responderComIA({
          person, persona, estado: estendido.plano.estado, mensagens, texto, citacao, adulto, nomeUsuario,
          configIA: { url: s.chatAI.url || URL_PADRAO_IA, chave: s.chatAI.chave || '', modelo: s.chatAI.modelo || '' },
          sinal: controleIA.current.signal,
        });
        const atrasos = montarAtrasos(bolhasIA, persona, Math.random, rapido, estendido.plano.humor, pausado);
        const bolhas = bolhasIA.map((textoBolha, i) => ({ texto: textoBolha, atraso: atrasos[i] }));
        final = { ...estendido, plano: { ...estendido.plano, bolhas }, ritmo: ritmoDePlano(bolhas, persona, estendido.humor, Math.random) };
      } catch (erro) {
        if ((erro as Error)?.name === 'AbortError') return; // você mandou outra mensagem: a nova rodada assume
        ctx.notify('A IA não respondeu agora — o motor local assumiu a conversa.', true);
      }
    }
    tocarPlano(final.plano, final);
  };

  /** Ela espera um tempo de leitura (que cresce com o tamanho do lote) e responde. */
  const programarLeitura = () => {
    if (leituraTimer.current) clearTimeout(leituraTimer.current);
    const tamanho = pendentes.current.reduce((soma, item) => soma + item.texto.length, 0);
    const espera = Math.min(3600, 1000 + tamanho * 24 + Math.random() * 900);
    leituraTimer.current = setTimeout(() => { void responder(); }, espera);
  };

  const enviar = (texto: string, foto?: string, citacao?: ChatMessage['replyTo']) => {
    const limpo = texto.trim();
    if (!limpo && !foto) return;
    const idMinha = generateId();
    adicionarMensagem({ id: idMinha, personId: person.id, role: 'user', text: limpo, timestamp: new Date().toISOString(), tom, foto, replyTo: citacao });
    if (foto && !limpo) setAviso('Foto enviada.');
    setInput('');
    setSugestoes(false);
    setEmojiOpen(false);
    setPhotoPicker(false);
    setRespondendo(null);
    // Mensagem nova interrompe o que ela estava digitando: ela para, relê
    // tudo e responde de novo com o contexto atualizado — nada de bolha solta.
    rodada.current += 1;
    controleIA.current?.abort();
    limparTimers();
    setTyping(false);
    programarTicks(idMinha, 1600);
    pendentes.current.push({ texto: limpo || (foto ? '[foto]' : ''), foto: !!foto, citacao: citacao?.texto });
    programarLeitura();
  };

  /** Mensagem que chega do nada: ela lembra de algo que você nem fez. */
  const doNada = () => {
    if (typing || pendentes.current.length) return false;
    const base = estadoDe(data, person);
    const estendido = processarPuxada({ person, persona, state: base, motivo: 'do_nada', forcado: true, adulto, rand: Math.random, rapido, nomeUsuario, ...contextoDeConversa });
    if (!estendido) return false;
    salvarEstado(estendido.plano.state);
    tocarPlano(estendido.plano, estendido);
    return true;
  };

  /** Mensagem espontânea (modo automático ou botão de "deixa ela puxar").
   *  Sem `forcada`, a iniciativa dela manda: pode simplesmente não falar. */
  const espontanea = (motivo?: 'saudade' | 'lembranca' | 'assunto', forcada = true) => {
    if (typing || pendentes.current.length) return false;
    const base = estadoDe(data, person);
    const estendido = processarPuxada({ person, persona, state: base, motivo, forcado: forcada, adulto, rand: Math.random, rapido, nomeUsuario, ...contextoDeConversa });
    if (!estendido) return false;
    salvarEstado(estendido.plano.state);
    tocarPlano(estendido.plano, estendido);
    return true;
  };

  // Modo automático: o intervalo da próxima puxada sai da iniciativa dela
  // (0.1 fica um bom tempo; 0.9 puxa o papo a cada instantes). Se ela
  // decidir ficar quietinha, o relógio volta a rodar — nada de metrônomo.
  useEffect(() => {
    if (!auto || typing) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    const proximoIntervalo = () => intervaloDeIniciativa(estadoEstendidoDe(estadoDe(data, person), persona).iniciativa, rapido, pausado, Math.random);
    const tentativa = () => {
      if (typing) return;
      let puxou = false;
      // De vez em quando chega aquela mensagem do nada: ela lembra de algo que você nem fez.
      if (data.settings.chatDoNada !== false && Math.random() < 0.35) puxou = doNada();
      if (!puxou) puxou = espontanea(undefined, false);
      if (!puxou) autoTimer.current = setTimeout(tentativa, proximoIntervalo());
    };
    autoTimer.current = setTimeout(tentativa, proximoIntervalo());
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, typing, mensagens.length, person.id, data.settings.chatDoNada]);

  const limparConversa = () => {
    limparTimers();
    limparTickTimers();
    pendentes.current = [];
    setTicks({});
    setRespondendo(null);
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
  // Memória rica (camada viva): o que ela guarda, com importância e força.
  const memoriasRicas = useMemo(() => memoriasVisiveis(estado.memorias || []), [estado.memorias]);
  const ultimaDela = [...mensagens].reverse().find(mensagem => mensagem.role === 'them');
  const sugestoesProntas = useMemo(() => sugerirRespostas({
    person, persona, state: estado, mensagemDela: ultimaDela?.text || '', adulto, quantas: 6, tom, rand: seededRandom(sementeSugestoes + 1), ...contextoDeConversa,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [person, persona, estado, ultimaDela?.text, adulto, tom, sementeSugestoes, data.people, s.ownerAge, s.ownerBirthday]);
  const aberturas = useMemo(() => sugerirAberturas({ person, persona, state: estado, historico: mensagens, adulto, quantas: 6, rand: seededRandom(sementeSugestoes + 7), ...contextoDeConversa }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person, persona, estado, mensagens, adulto, sementeSugestoes, data.people, s.ownerAge, s.ownerBirthday]);
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
              <em className="chat-voz-line" title={`Jeito de falar só dela: ${cartao.marcaRegistrada}`}>{cartao.marcaRegistrada}</em>
            </div>
          </div>
          <div className="chat-header-actions">
            <IconButton
              label={falarAlto ? 'Deixar a conversa só por escrito' : 'Falar as respostas em voz alta'}
              className={falarAlto ? 'voz-ativa' : ''}
              onClick={alternarVoz}
            >{falarAlto ? <Volume2 size={18} /> : <VolumeX size={18} />}</IconButton>
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
          {usarIA && <span className="chat-status-line ia-line" title="Respostas geradas por uma IA de verdade, com o motor local como rede de segurança"><Sparkles size={12} />IA real</span>}
          <button className={`chat-auto-toggle ${auto ? 'active' : ''}`} onClick={() => { setAuto(!auto); ctx.notify(!auto ? 'Modo automático: ela vai puxar assunto sozinha enquanto você conversa.' : 'Modo automático desligado.'); }} title="Ela puxa assunto sozinha depois de um tempo">
            <Timer size={13} />{auto ? 'Puxando sozinha' : 'Deixar puxar'}
          </button>
        </div>

        {retrato && <div className="chat-estado">
          <div className="chat-estado-topo">
            <span className={`chat-estado-humor h-${humor}`}>{EMOJI_HUMOR[humor]} {ROTULO_HUMOR[humor]}</span>
            <span className="chat-estado-leitura">{estadoCompleto.leitura}</span>
            <IconButton label="Fechar retrato do momento" onClick={() => setRetrato(false)}><X size={14} /></IconButton>
          </div>
          <div className="chat-estado-barras">
            <span className="chat-estado-item" title="Cai com grosseria e cobrança, volta com conversa boa">
              <label>Paciência <b>{Math.round(estadoCompleto.paciencia)}/{PACIENCIA_MAXIMA}</b></label>
              <span className={`chat-estado-trilha ${estadoCompleto.paciencia <= PACIENCIA_BAIXA ? 'baixa' : estadoCompleto.paciencia >= 8 ? 'alta' : ''}`}><i style={{ width: `${(estadoCompleto.paciencia / PACIENCIA_MAXIMA) * 100}%` }} /></span>
            </span>
            <span className="chat-estado-item" title="Sobe com interesse verdadeiro e cai com ousadia fora de hora">
              <label>Química <b>{Math.round(estadoCompleto.afinidade)}%</b></label>
              <span className="chat-estado-trilha quimica"><i style={{ width: `${estadoCompleto.afinidade}%` }} /></span>
            </span>
          </div>
          <div className="chat-estado-rodape">
            <span className="chat-estado-chip">{estagio.label}</span>
            {estadoCompleto.gatilhos.map(gatilho => <span className="chat-estado-chip gatilho" key={gatilho}>{gatilho}</span>)}
          </div>
          {ultimoEstado?.humor && (
            <div className="chat-estado-continuo">
              <span className="chat-estado-rotulo" title="Três mostradores do humor contínuo: a mesma mensagem soa diferente conforme eles">
                Humor <b>{ultimoEstado.humorLeitura}</b>
              </span>
              <div className="chat-estado-barras">
                <span className="chat-estado-item" title="Como ela está se sentindo (do ruim ao bom)">
                  <label>Animação <b>{Math.round(((ultimoEstado.humor.valence + 1) / 2) * 100)}%</b></label>
                  <span className="chat-estado-trilha"><i style={{ width: `${Math.round(((ultimoEstado.humor.valence + 1) / 2) * 100)}%` }} /></span>
                </span>
                <span className="chat-estado-item" title="Energia para escrever longo e puxar assunto">
                  <label>Energia <b>{Math.round(ultimoEstado.humor.energy * 100)}%</b></label>
                  <span className="chat-estado-trilha"><i style={{ width: `${Math.round(ultimoEstado.humor.energy * 100)}%` }} /></span>
                </span>
                <span className="chat-estado-item" title="Tensão acumulada — deixa a digitação hesitar">
                  <label>Tensão <b>{Math.round(ultimoEstado.humor.stress * 100)}%</b></label>
                  <span className={`chat-estado-trilha ${ultimoEstado.humor.stress > 0.55 ? 'baixa' : ''}`}><i style={{ width: `${Math.round(ultimoEstado.humor.stress * 100)}%` }} /></span>
                </span>
                <span className="chat-estado-item" title="Quanto ela inicia conversa — cai quando você ignora, sobe com a relação">
                  <label>Iniciativa <b>{Math.round((ultimoEstado.iniciativa ?? 0) * 100)}%</b></label>
                  <span className="chat-estado-trilha quimica"><i style={{ width: `${Math.round((ultimoEstado.iniciativa ?? 0) * 100)}%` }} /></span>
                </span>
              </div>
              <div className="chat-estado-rodape">
                <span className="chat-estado-chip" title={ultimoEstado.objetivo?.descricao}>Objetivo: {ultimoEstado.objetivo?.rotulo || 'manter o papo'}</span>
                {ultimoEstado.topico && <span className="chat-estado-chip" title="Assunto atual no grafo de tópicos — a conversa transita entre eles">{rotuloDoTopico(ultimoEstado.topico)}</span>}
              </div>
            </div>
          )}
          <details className="chat-detalhe">
            <summary>O que ela lembra de você<span>{memoriasRicas.length || memoriasDaConversa.length}</span></summary>
            {memoriasRicas.length
              ? <ul className="chat-memorias">{memoriasRicas.map(m => (
                <li key={m.id}>
                  <i className={`mem-ponto ${m.importance}`} title={m.importance === 'alta' ? 'Importante — fica por meses' : m.importance === 'media' ? 'Normal — dura algumas semanas' : 'Temporária — some em poucos dias'} />
                  <span>{m.content}</span>
                  <small> · força {Math.round(m.forca * 100)}%</small>
                </li>
              ))}</ul>
              : memoriasDaConversa.length
                ? <ul className="chat-memorias">{memoriasDaConversa.map(item => <li key={item}>{item}</li>)}</ul>
                : <p className="form-help">Nada anotado ainda. Fale de você, da sua rotina, do que você gosta.</p>}
          </details>
          <details className="chat-detalhe" open={promptAberto} onToggle={evento => setPromptAberto((evento.target as HTMLDetailsElement).open)}>
            <summary>Prompt do sistema<span>como ela é instruída</span></summary>
            <pre className="chat-prompt">{promptAtual}</pre>
            {ultimoEstado && <pre className="chat-prompt json">{JSON.stringify(ultimoEstado.json, null, 2)}</pre>}
            <button className="text-action" onClick={() => { navigator.clipboard?.writeText(`${promptAtual}\n\n${ultimoEstado ? JSON.stringify(ultimoEstado.json, null, 2) : ''}`); ctx.notify('Prompt copiado.'); }}>Copiar prompt e estado</button>
          </details>
        </div>}

        {menuOpen && <div className="chat-menu">
          <button onClick={() => { setRetrato(!retrato); setMenuOpen(false); }}><Heart size={15} />Retrato do momento</button>
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

      <div className="chat-messages" ref={scrollRef} onScroll={acompanharRolagem}>
        {dias.map(dia => (
          <div key={dia.chave}>
            <div className="chat-day-divider"><span>{rotuloDia(dia.chave)}</span></div>
            <AnimatePresence initial={false}>
              {dia.mensagens.map((mensagem, indice) => {
                const anterior = dia.mensagens[indice - 1];
                const proxima = dia.mensagens[indice + 1];
                const agrupada = !!anterior && anterior.role === mensagem.role;
                const fechaGrupo = !proxima || proxima.role !== mensagem.role;
                const tick = mensagem.role === 'user' ? (ticks[mensagem.id] || 'lido') : null;
                return (
                  <motion.div
                    key={mensagem.id}
                    className={`chat-bubble-wrap ${mensagem.role === 'user' ? 'mine' : 'theirs'} ${agrupada ? 'agrupada' : ''} ${fechaGrupo ? 'fecha-grupo' : ''}`}
                    initial={s.reducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: s.reducedMotion ? 0.12 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {mensagem.role === 'them' && (agrupada
                      ? <span className="chat-avatar-slot" aria-hidden="true" />
                      : <Avatar person={person} size={30} />)}
                    <div className={`chat-bubble ${mensagem.role}`}>
                      {mensagem.replyTo && (
                        <div className={`chat-citacao ${mensagem.replyTo.autor === 'Você' ? 'minha' : ''}`}>
                          <b>{mensagem.replyTo.autor}</b>
                          <span>{mensagem.replyTo.texto.slice(0, 120)}{mensagem.replyTo.texto.length > 120 ? '…' : ''}</span>
                        </div>
                      )}
                      {mensagem.foto && <img src={mensagem.foto} alt="Foto enviada na conversa" className="chat-photo" />}
                      {mensagem.text}
                      <time className="chat-hora">
                        {(mensagem.timestamp || '').slice(11, 16)}
                        {tick && (
                          <span className={`chat-tick ${tick}`} title={tick === 'enviado' ? 'Enviada' : tick === 'entregue' ? 'Entregue' : 'Lida'}>
                            {tick === 'enviado' ? '✓' : '✓✓'}
                          </span>
                        )}
                      </time>
                    </div>
                    {mensagem.role === 'them' && mensagem.text.trim() && vozSuportada() && (
                      <button
                        className={`chat-ouvir-msg ${falando === mensagem.id ? 'falando' : ''}`}
                        title={falando === mensagem.id ? 'Parar de ouvir' : 'Ouvir esta mensagem'}
                        aria-label={falando === mensagem.id ? `Parar de ouvir a mensagem de ${person.nome.split(' ')[0]}` : `Ouvir a mensagem de ${person.nome.split(' ')[0]}`}
                        onClick={() => ouvirMensagem(mensagem)}
                      >
                        {falando === mensagem.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      </button>
                    )}
                    <button
                      className="chat-responder-msg"
                      title="Responder essa mensagem"
                      aria-label={`Responder a mensagem de ${mensagem.role === 'user' ? 'você' : person.nome.split(' ')[0]}`}
                      onClick={() => setRespondendo({ id: mensagem.id, autor: mensagem.role === 'user' ? 'Você' : person.nome.split(' ')[0], texto: mensagem.text })}
                    >
                      <Reply size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
        {!noFim && mensagens.length > 3 && (
          <button className="chat-descer" onClick={descerConversa} title="Voltar para a última mensagem">
            <ArrowDown size={15} />Ir para o fim
          </button>
        )}
        {typing && (
          <motion.div className="chat-bubble-wrap theirs digitando" initial={s.reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: s.reducedMotion ? 0.1 : 0.3 }}>
            <Avatar person={person} size={30} />
            <div className="chat-bubble them typing"><span /><span /><span /></div>
            <small className="chat-typing-label">digitando</small>
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
          <p className="chat-icebreakers-title">
            <Wand2 size={13} />Sugestões para agora — clique para enviar
            <button className="chat-icebreakers-trocar" onClick={() => setSementeSugestoes(valor => valor + 1)}>
              <Shuffle size={12} />Trocar
            </button>
          </p>
          {[...sugestoesProntas, ...aberturas].slice(0, 8).map((sugestao, i) => (
            <button key={`${sugestao.texto}-${i}`} onClick={() => enviar(sugestao.texto, undefined, respondendo || undefined)}>
              <span className="chat-sugestao-texto">{sugestao.texto}</span>
              {sugestao.motivo && <small className={`chat-sugestao-motivo tom-${sugestao.tom || 'amizade'}`}>{sugestao.motivo}</small>}
            </button>
          ))}
        </div>
      )}

      {emojiOpen && <div className="chat-emoji-bar">{EMOJIS.map(emoji => <button key={emoji} onClick={() => setInput(valor => `${valor}${emoji}`)}>{emoji}</button>)}</div>}

      {respondendo && (
        <div className="chat-respondendo">
          <span className="chat-respondendo-icone"><Reply size={14} /></span>
          <div className="chat-respondendo-texto">
            <b>Respondendo {respondendo.autor}</b>
            <span>{respondendo.texto.slice(0, 90)}{respondendo.texto.length > 90 ? '…' : ''}</span>
          </div>
          <button onClick={() => setRespondendo(null)} aria-label="Cancelar resposta"><X size={14} /></button>
        </div>
      )}

      <form className="chat-input-bar" onSubmit={evento => { evento.preventDefault(); enviar(input, undefined, respondendo || undefined); }}>
        <IconButton label="Sugestões de mensagem" onClick={() => setSugestoes(!sugestoes)}>
          <Sparkles size={20} className={sugestoes ? 'active' : ''} />
        </IconButton>
        <IconButton label="Emojis" onClick={() => setEmojiOpen(!emojiOpen)}><Smile size={20} /></IconButton>
        <input
          value={input}
          onChange={evento => setInput(evento.target.value)}
          placeholder={respondendo ? `Respondendo ${respondendo.autor}...` : `Mensagem para ${person.nome.split(' ')[0]}...`}
          aria-label="Mensagem"
        />
        <IconButton label="Enviar foto" onClick={() => setPhotoPicker(true)}><Camera size={20} /></IconButton>
        <Button variant="primary" onClick={() => enviar(input, undefined, respondendo || undefined)} disabled={!input.trim()}>
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
            <div><dt>Marca registrada dela</dt><dd>{cartao.marcaRegistrada}</dd></div>
            <div><dt>Como ela começa a mensagem</dt><dd>{cartao.aberturas.length ? cartao.aberturas.join(' ') : 'direto ao assunto'}</dd></div>
            <div><dt>Bordões que ela repete</dt><dd>{cartao.bordoes.length ? cartao.bordoes.join(' · ') : 'nenhum bordão marcante'}</dd></div>
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
        {fotos.length ? <div className="chat-photo-picker">{fotos.map(foto => <button key={foto.id} onClick={() => enviar(input, foto.url, respondendo || undefined)}><img src={foto.url} alt="Foto para enviar" /></button>)}</div>
          : <p className="muted">Nenhuma foto disponível. Adicione imagens na galeria ou na ficha desta pessoa.</p>}
      </Modal>}

      {sugestoes === false && mensagens.length > 0 && !typing && (
        <button className="chat-hint" onClick={() => setSugestoes(true)}>
          <Wand2 size={13} />{tom === 'amizade' ? 'Não sabe o que dizer? Veja sugestões' : 'Sugestões para manter esse tom'}
        </button>
      )}

      <p className="chat-footnote">
        <Flame size={11} />Conversa simulada com base na ficha, na idade e no vínculo entre vocês. Ela te chama de {nomeUsuario} e trata do jeito que a relação permite ({cartao.relacao.toLowerCase()}). O clima sobe sozinho com a intimidade; nada é oferecido do nada. Ela lembra do que você conta ({estado.memorias?.length ?? estado.lembrancas.length} anotação(ões)) — o que importa fica, o que é bobagem some.
        {!person.fotos.length && <button onClick={() => { onClose(); ctx.openPerson(person); }}> Adicionar foto à ficha</button>}
      </p>
    </div>
  );
}
