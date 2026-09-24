/**
 * Mundo vivo.
 *
 * O aplicativo deixa de ser "um banco de dados onde você consulta
 * pessoas" e vira "um ambiente que muda sozinho enquanto você não
 * está olhando". Pessoas ficam ocupadas, guardam memórias, voltam
 * depois de sumidas — apresentado como eventos do universo do app
 * (não como status de "online" falso).
 *
 * Uma vez por dia o mundo roda: gera os acontecimentos e o resumo
 * do dia com as missões contextuais (sem obrigar ninguém a nada).
 */
import type { AppData, AppNotification, Person } from '../../types';
import { generateId, today } from '../../store';
import type { ChatState } from '../../types';
import type { EventoMundo } from './types';

const NOME = (p: Person) => p.nome.split(/[\s.]+/)[0] || 'alguém';

/** Hora simulada em que o evento "acontece": daqui a 1–5h, até 22:30. */
function horaSimulada(agora: Date, rand: () => number): string {
  const candidata = new Date(agora.getTime() + (1 + rand() * 4) * 3600000);
  const teto = new Date(agora);
  teto.setHours(22, 30, 0, 0);
  return (candidata > teto ? teto : candidata).toISOString();
}

/** Um acontecimento do universo da ficha. */
export function gerarEventoMundo(
  person: Person,
  state: ChatState,
  rand: () => number = Math.random,
  agora: Date = new Date(),
): EventoMundo {
  const diasSemFalar = state.ultimaMensagem
    ? Math.max(0, (agora.getTime() - Date.parse(state.ultimaMensagem)) / 86400000)
    : 99;
  const tipos: { tipo: EventoMundo['tipo']; peso: number }[] = [
    { tipo: 'ocupada', peso: 0.3 },
    { tipo: 'disponivel', peso: 0.2 },
    { tipo: 'memoria', peso: (state.memorias?.length || 0) > 0 ? 0.25 : 0 },
    { tipo: 'retorno', peso: diasSemFalar >= 2 ? 0.25 : 0.05 },
    { tipo: 'sugestao', peso: 0.15 },
  ];
  const total = tipos.reduce((soma, item) => soma + item.peso, 0);
  let r = rand() * total;
  let sorteado: EventoMundo['tipo'] = 'sugestao';
  for (const item of tipos) {
    r -= item.peso;
    if (r <= 0) { sorteado = item.tipo; break; }
  }
  const quando = horaSimulada(agora, rand);
  switch (sorteado) {
    case 'ocupada':
      return { tipo: 'ocupada', titulo: `${NOME(person)} está ocupada`, corpo: 'Sumiu por um tempo — apareceu um compromisso.', quando };
    case 'disponivel':
      return { tipo: 'disponivel', titulo: `${NOME(person)} ficou disponível`, corpo: 'Livre agora: é boa hora para puxar assunto.', quando };
    case 'memoria':
      return { tipo: 'memoria', titulo: `${NOME(person)} guardou uma memória`, corpo: 'Algo que você contou virou lembrança dela.', quando };
    case 'retorno':
      return { tipo: 'retorno', titulo: `${NOME(person)} voltou`, corpo: `Vocês não conversavam há ${Math.max(1, Math.round(diasSemFalar))} dia(s). Ela apareceu.`, quando };
    default:
      return { tipo: 'sugestao', titulo: `Sugestão para ${NOME(person)}`, corpo: 'Tem uma puxada de assunto guardada para vocês.', quando };
  }
}

/** Missões contextuais de hoje — sugestões, não obrigações. */
export function missoesDoDia(data: AppData): string[] {
  const missoes: string[] = [];
  if (data.people.some(p => !p.deletedAt && !(p.notas?.length))) missoes.push('Atualizar uma ficha — contar sobre alguém é o que ela mais lembra');
  if (data.chats.length > 0) missoes.push('Responder uma conversa');
  if (data.orphanPhotos.length >= 5) missoes.push('Organizar 5 fotos soltas');
  missoes.push('Criar uma nota sobre alguém que faz parte da sua história');
  missoes.push('Revisar uma memória da conversa (ela lembra mais do que você)');
  return missoes.slice(0, 4);
}

export interface ResumoDia {
  novasConversas: number;
  proximosAniversarios: number;
  fotosNovas: number;
  metasConcluidas: number;
  missoes: string[];
}

/** O que aconteceu hoje no seu mundo (para o resumo do dia). */
export function resumoDoDia(data: AppData, agora: Date = new Date()): ResumoDia {
  const hoje = today();
  const novasConversas = data.chats.filter(c => (c.timestamp || '').slice(0, 10) === hoje).length;
  const proximosAniversarios = data.people.filter(p => {
    try {
      const [mes, dia] = (p.aniversario || '').split('-').map(Number);
      if (!mes || !dia) return false;
      const alvo = new Date(agora.getFullYear(), mes - 1, dia);
      const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const dif = Math.round((alvo.getTime() - inicio.getTime()) / 86400000);
      return dif >= 0 && dif <= 7;
    } catch { return false; }
  }).length;
  const fotosNovas =
    data.people.reduce((soma, p) => soma + p.fotos.filter(f => (f.createdAt || '').slice(0, 10) === hoje).length, 0) +
    data.orphanPhotos.filter(f => (f.createdAt || '').slice(0, 10) === hoje).length;
  const metasConcluidas = data.goals.filter(g => g.done && (g.doneAt || '').slice(0, 10) === hoje).length;
  return { novasConversas, proximosAniversarios, fotosNovas, metasConcluidas, missoes: missoesDoDia(data) };
}

type NotificacaoMundo = Omit<AppNotification, 'id'>;

/**
 * Roda o mundo uma vez: acontecimentos das conversas ativas + o
 * resumo do dia + as missões. Devolve notificações prontas para
 * guardar (a tela decide quando salvar).
 */
export function tickDoMundo(
  data: AppData,
  agora: Date = new Date(),
  rand: () => number = Math.random,
): AppNotification[] {
  const ativas = data.people.filter(p =>
    !p.deletedAt &&
    data.chatStates[p.id] &&
    data.chats.some(c => c.personId === p.id));
  const itens: NotificacaoMundo[] = [];
  const quantas = Math.min(ativas.length, rand() < 0.4 ? 2 : 1);
  const sorteadas = [...ativas].sort(() => rand() - 0.5).slice(0, quantas);
  for (const person of sorteadas) {
    const evento = gerarEventoMundo(person, data.chatStates[person.id], rand, agora);
    itens.push({ title: evento.titulo, body: evento.corpo, kind: 'mundo', date: evento.quando, read: false, personId: person.id });
  }
  const resumo = resumoDoDia(data, agora);
  const periodo = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = data.settings.profileName.split(' ')[0] || 'você';
  const linhas: string[] = [];
  if (resumo.novasConversas) linhas.push(`💬 ${resumo.novasConversas} conversa${resumo.novasConversas > 1 ? 's' : ''} nova${resumo.novasConversas > 1 ? 's' : ''}`);
  if (resumo.proximosAniversarios) linhas.push(`🎂 ${resumo.proximosAniversarios} aniversári${resumo.proximosAniversarios > 1 ? 'os' : 'o'} próxim${resumo.proximosAniversarios > 1 ? 'os' : 'o'}`);
  if (resumo.fotosNovas) linhas.push(`📸 ${resumo.fotosNovas} foto${resumo.fotosNovas > 1 ? 's' : ''} adicionada${resumo.fotosNovas > 1 ? 's' : ''}`);
  if (resumo.metasConcluidas) linhas.push(`🏆 ${resumo.metasConcluidas} meta${resumo.metasConcluidas > 1 ? 's' : ''} concluída${resumo.metasConcluidas > 1 ? 's' : ''}`);
  if (linhas.length) {
    itens.push({ title: `${periodo}, ${nome}. Hoje aconteceram ${linhas.length} coisas:`, body: linhas.join(' · '), kind: 'sistema', date: agora.toISOString(), read: false, personId: null });
  }
  if (resumo.missoes.length) {
    itens.push({ title: 'Missões de hoje (sem pressão)', body: resumo.missoes.map(m => `□ ${m}`).join('  ·  '), kind: 'sistema', date: agora.toISOString(), read: false, personId: null });
  }
  return itens.map(item => ({ ...item, id: generateId() }));
}
