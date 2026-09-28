/**
 * Motor do simulador de conversa.
 *
 * A ideia é simples: cada resposta é montada na hora, a partir de quatro coisas:
 *  1. o que você escreveu (intenção + sentimento);
 *  2. quem ela é (persona derivada da ficha);
 *  3. o que já rolou entre vocês (química, memória de assuntos, perguntas feitas);
 *  4. o tom escolhido — amizade, flerte, provocante ou intenso.
 *
 * Regras que sustentam o realismo:
 *  - Tom alto demais para a química atual recebe um desvio elegante, não uma resposta.
 *  - Assunto adulto só existe para ficha de 18+ com o modo adulto ligado nos Ajustes.
 *  - Ela lembra do que você contou e cobra o desfecho depois.
 *  - Ela não repete a mesma frase: as últimas respostas ficam fora do sorteio.
 *  - Ela reconhece nomes: o dela, o seu e o de qualquer familiar cadastrado.
 */
import type { AppData, ChatMessage, ChatMood, ChatState, ChatTone, Person } from '../types';
import { INTIMATE_MIN_AGE } from '../types';
import { isAdult, normalizeText } from '../store';
import { abreviacoesNaMensagem, expandirAbreviacoes } from './abreviacoes';
import { buildPersona, ganchoDe, type Genero, type Persona } from './persona';
import {
  PACIENCIA_BAIXA, ajusteDePaciencia, descreverEstado, humorPorPaciencia, lembrar, montarEstadoEstruturado,
  pacienciaDe, recuperarMemorias, type EstadoEmocional, type EstadoEstruturado,
} from './estado';
import { analisarRelacao, motivoDoLimite, type Relacao } from './relacao';
import {
  CHAMADO_PELO_NOME, FALOU_PROPRIA_NOME, FECHOS, INFANTIL, MAIS_PERGUNTAS, MAIS_PERGUNTAS_MADURA,
  LEMBRETE_PESSOA, MAIS_RECEPCOES, MAIS_RESPOSTAS, MAIS_RESPOSTAS_ADULTA, MAIS_RESPOSTAS_MADURA, MAIS_SUGESTOES,
  MAIS_SUGESTOES_EXTRA, MANEIRISMOS, PESSOA_NOVA,
  PESSOA_CONHECIDA, RECEPCOES_HISTORIA, RECEPCOES_MADURA, RECEPCOES_TEMA, FRIAS, LIMITES_GROSSERIA, nomesDaPessoa, nomesEstranhos, nomesNaMensagem,
  recepcaoVale,
} from './repertorio';

/** Compara sempre no mesmo formato do texto analisado: minúsculo e sem acento. */
function rx(fonte: string, flags = 'i') { return new RegExp(fonte.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), flags); }
export type Tone = ChatTone;
export type Mood = ChatMood;
export type Sentimento = 'positivo' | 'negativo' | 'neutro';
export type Intimidade = 'nova' | 'conhecendo' | 'confiante' | 'proxima' | 'especial';

/** Degraus de clima da conversa. Sobe sozinho conforme a intimidade — o usuário não escolhe. */
export const TONS: { id: Tone; label: string; emoji: string; descricao: string }[] = [
  { id: 'amizade', label: 'Papo leve', emoji: '', descricao: 'Papo leve, do dia a dia, sem segunda intenção.' },
  { id: 'flerte', label: 'Chegando mais perto', emoji: '', descricao: 'Elogios, piadas, insinuação leve e convite.' },
  { id: 'provocante', label: 'No clima', emoji: '', descricao: 'Ela entra no jogo: provoca, insinua e mantém o clima. Só para ficha de 18+.' },
  { id: 'intenso', label: 'Bem no clima', emoji: '', descricao: 'Clima carregado de verdade, sempre sem descrição explícita. Só para 18+ com o modo adulto ligado.' },
];

export const HUMORES: { id: Mood; emoji: string; label: string }[] = [
  { id: 'happy', emoji: '😊', label: 'Alegre' },
  { id: 'playful', emoji: '😜', label: 'Brincalhona' },
  { id: 'flirty', emoji: '😏', label: 'Flertando' },
  { id: 'shy', emoji: '🥺', label: 'Tímida' },
  { id: 'curious', emoji: '🤔', label: 'Curiosa' },
  { id: 'carinhosa', emoji: '🥰', label: 'Carinhosa' },
  { id: 'fechada', emoji: '😐', label: 'Fechada' },
  { id: 'neutral', emoji: '🙂', label: 'Neutra' },
];

export const ESTAGIOS: { id: Intimidade; label: string; min: number; descricao: string }[] = [
  { id: 'nova', label: 'Conhecendo agora', min: 0, descricao: 'Ela responde, mas ainda mede as palavras.' },
  { id: 'conhecendo', label: 'Pegando intimidade', min: 28, descricao: 'Já puxa assunto e brinca com você.' },
  { id: 'confiante', label: 'Confiante', min: 46, descricao: 'Conta da vida dela, pergunta de volta e aceita flerte.' },
  { id: 'proxima', label: 'Próxima', min: 64, descricao: 'Papo aberto, carinho, saudade e clima no ar.' },
  { id: 'especial', label: 'Especial', min: 82, descricao: 'Você é uma das pessoas favoritas dela.' },
];

// ---------------------------------------------------------------------------
// Estado da conversa
// ---------------------------------------------------------------------------

export function novoChatState(person: Person): ChatState {
  const level = Math.max(0, Math.min(5, Math.round(person.friendshipLevel || 0)));
  const inicial = Math.max(6, Math.min(72, 14 + level * 7 + (person.tags.includes('crush') ? 8 : 0) + (person.tags.includes('amiga') ? 6 : 0) + (person.favorite ? 3 : 0)));
  return {
    personId: person.id,
    afinidade: inicial,
    mensagens: 0,
    humor: 'neutral',
    tom: 'amizade',
    topicos: {},
    lembrancas: [],
    perguntas: [],
    recentes: [],
    usados: [],
    ultimaMensagem: new Date().toISOString(),
    visitas: 0,
    ofensas: 0,
  };
}

export const estadoDe = (data: AppData, person: Person): ChatState => data.chatStates?.[person.id] || novoChatState(person);

export function estagioAtual(state: ChatState): { id: Intimidade; label: string; descricao: string; indice: number } {
  let indice = 0;
  ESTAGIOS.forEach((estagio, i) => { if (state.afinidade >= estagio.min) indice = i; });
  return { ...ESTAGIOS[indice], indice };
}

/** Reserva deixa a pessoa mais lenta para liberar intimidade; ousadia acelera. */
const ajusteDeLimite = (persona: Persona) => (persona.traits.reserva - 0.5) * 26 - (persona.traits.ousadia - 0.5) * 14;

export interface TomDisponivel { id: Tone; ok: boolean; motivo: string }

/**
 * Quais climas a conversa aceita agora. Além da química, a relação manda:
 * menor de idade ou vínculo de família fecham o flerte de vez. Entre dois
 * adultos, a diferença de idade e a dinâmica de tia viram jeito de falar: o
 * clima sobe com química e modo adulto ligado.
 */
export function tonsDisponiveis(persona: Persona, state: ChatState, adulto: boolean, relacao?: Relacao): TomDisponivel[] {
  const estagio = estagioAtual(state).id;
  const ajuste = ajusteDeLimite(persona);
  const limiteFlerte = 22 + ajuste;
  const limiteProvocante = 44 + ajuste;
  const limiteIntenso = 62 + ajuste;
  const motivoAdulto = 'Só para fichas com 18 anos ou mais.';
  const bloqueioRelacao = relacao && !relacao.flertePermitido ? motivoDoLimite(relacao) : '';
  return TONS.map(tom => {
    if (tom.id === 'amizade') return { id: tom.id, ok: true, motivo: 'Sempre disponível.' };
    if (bloqueioRelacao) return { id: tom.id, ok: false, motivo: bloqueioRelacao };
    if (!persona.adulta) return { id: tom.id, ok: false, motivo: motivoAdulto };
    if (tom.id === 'flerte') {
      const ok = state.afinidade >= limiteFlerte || estagio !== 'nova';
      return { id: tom.id, ok, motivo: ok ? 'Ela já retribui o flerte.' : `Falta química: conversem mais um pouco (${Math.round(state.afinidade)}/${Math.round(limiteFlerte)}).` };
    }
    if (!adulto) return { id: tom.id, ok: false, motivo: 'Ligue o modo adulto em Ajustes → Conversas.' };
    if (relacao && !relacao.adultoPermitido) return { id: tom.id, ok: false, motivo: relacao.familiar || relacao.veCrianca || relacao.euMenor ? motivoDoLimite(relacao) : 'Nesta relação o papo fica no flerte, sem passar disso.' };
    const limite = tom.id === 'provocante' ? limiteProvocante : limiteIntenso;
    const ok = state.afinidade >= limite;
    return { id: tom.id, ok, motivo: ok ? 'Liberado pela química entre vocês.' : `Falta química (${Math.round(state.afinidade)}/${Math.round(limite)}). Continue conversando no tom atual.` };
  });
}

/** Tom mais alto que a relação permite hoje — usado para desviar com naturalidade. */
export function tomEfetivo(escolhido: Tone, persona: Persona, state: ChatState, adulto: boolean, relacao?: Relacao): Tone {
  const permitidos = tonsDisponiveis(persona, state, adulto, relacao).filter(tom => tom.ok).map(tom => tom.id);
  if (permitidos.includes(escolhido)) return escolhido;
  const ordem: Tone[] = ['amizade', 'flerte', 'provocante', 'intenso'];
  return [...ordem].reverse().find(tom => permitidos.includes(tom)) || 'amizade';
}

// ---------------------------------------------------------------------------
// Intenções
// ---------------------------------------------------------------------------

export type IntentId =
  | 'saudacao' | 'despedida' | 'elogio' | 'elogio_corpo' | 'cantada' | 'convite' | 'pergunta_pessoal'
  | 'pergunta_fato' | 'pergunta_sobre_mim' | 'declaracao' | 'saudade' | 'flerte_leve' | 'flerte_forte'
  | 'pedido_foto' | 'apoio' | 'alegria' | 'piada' | 'provocacao' | 'ciumes' | 'desculpa' | 'agradecimento'
  | 'resposta_curta' | 'mudanca_assunto' | 'tedio' | 'cotidiano' | 'cotidiano_trabalho' | 'cotidiano_estudo'
  | 'cotidiano_comida' | 'foto' | 'desconhecido'
  // Novos: família, idade, igreja, vida adulta e as mensagens que chegam do nada.
  | 'pergunta_familiar' | 'pergunta_idade' | 'igreja' | 'vida_adulta' | 'confusao' | 'conselho'
  | 'pergunta_relacionamento' | 'pergunta_factual' | 'plano'
  | 'pergunta_rotina' | 'mensagem_enviada' | 'pedido_historia' | 'reclamacao_sem_dormir' | 'gratidao_recebida' | 'pedido_audio'
  | 'grosseria';

interface RegraIntencao { id: IntentId; padrao: RegExp; peso: number; sentimento?: Sentimento }

// A ordem é a prioridade: o primeiro que casar define a intenção principal.
const REGRAS_INTENCAO: RegraIntencao[] = [
  // Mensagens que chegam do nada: quando você corrige que não foi você.
  { id: 'confusao', padrao: rx("\\b(não fui eu|nao fui eu|não deixei|nao deixei|não fui|nao fui|não fiz|nao fiz|não é meu|nao e meu|confundiu|não lembro disso|nao lembro disso|deve ser outra pessoa|troquei de igreja|nunca te pedi|não sou eu|nao sou eu|foi outra pessoa|você me confundiu)\\b", "i"), peso: 2.9, sentimento: 'neutro' },
  { id: 'pergunta_familiar', padrao: rx("\\b(sua mãe|sua mae|sua mãezinha|seu pai|sua filha|seu filho|seus filhos|tem filhos|tem filho|filhos pequenos|sua irmã|sua irma|seu irmão|seu irmao|sua vó|sua avó|sua avo|sua tia|seu tio|sua prima|seu primo|sua família|sua familia|a família tá|como tá sua|como ta sua|fala da sua|manda um abraço pra|manda um abraco pra)\\b", "i"), peso: 2.8, sentimento: 'positivo' },
  { id: 'pergunta_idade', padrao: rx("\\b(quantos anos|que idade|sua idade|idade você tem|idade voce tem|mais velha que eu|mais nova que eu|mais novo que você|mais velho que você|diferença de idade|diferenca de idade|já é adulta|ja e adulta)\\b", "i"), peso: 2.5, sentimento: 'neutro' },
  // Perguntas diretas sobre ela merecem resposta direta — não textão genérico.
  { id: 'pergunta_relacionamento', padrao: rx("\\b(você tem namorado|voce tem namorado|você tem namorada|voce tem namorada|tem namorad[oa]|está com alguém|esta com alguem|está com alguem|tá com alguém|ta com alguem|ta com alguém|você tem alguém|voce tem alguem|você é solteir|voce e solteir|tá solteir|ta solteir|está solteir|solteira\\?|solteiro\\?|é comprometid|e comprometid|está namorando|esta namorando|tá namorando|ta namorando|tem compromisso)\\b", "i"), peso: 2.4, sentimento: 'neutro' },
  { id: 'pergunta_factual', padrao: rx("\\b(onde você mora|onde voce mora|onde vocês moram|onde mora|em que cidade você|em que cidade voce|qual seu signo|qual o seu signo|qual é o seu signo|qual e o seu signo|seu signo)\\b", "i"), peso: 2.7, sentimento: 'neutro' },
  // Notícia de plano pessoal: ela reage ao plano, não muda de assunto.
  { id: 'plano', padrao: rx("\\b(vou|vamos|pretendo|estou pensando em|penso em|decid[ií] que)\\s+(viajar|sair|ir|começar|comecar|fazer|marcar|comprar|mudar|trocar|aprender|entrar|largar|parar de)\\b", "i"), peso: 1.9, sentimento: 'positivo' },
  { id: 'igreja', padrao: rx("\\b(igreja|capela|culto|reunião de domingo|reuniao de domingo|ala|bispo|bispa|presidente de estaca|chamado|missão|missao|templo|sacramento|soc soc|sociedade de socorro|moças|mocas|rapazes|semana do jovem|mutirão|mutirao|limpeza da capela|escalei|escala do mês|escala do mes|reunião geral|reuniao geral|primaria|primária|escola dominical|obra missionária|obra missionaria|domingo na igreja|fui no templo)\\b", "i"), peso: 1.7, sentimento: 'neutro' },
  { id: 'vida_adulta', padrao: rx("\\b(vinho|jantar|cama|massagem|hotel|banho|final de semana fora|fim de semana fora|noite sozinha|noite sozinho|depois do trabalho|chegando em casa cansada|checklist|mercado|boleto|aluguel|terapia|remédio|remedio|escola das crianças|escola das criancas|filhos|marido|ex-marido|namorado)\b", "i"), peso: 1.6, sentimento: 'neutro' },
  { id: 'conselho', padrao: rx("\\b(o que você acha disso|que que você acha disso|você me aconselha|voce me aconselha|devo fazer|devo mudar|devo aceitar|devo continuar|devo terminar|devo sair|vale a pena|você acha que eu devo|voce acha que eu devo|me dá um conselho|me da um conselho|tô na dúvida|to na duvida|preciso de opinião|preciso de opiniao|o que eu faço|o que eu faco|me dá uma ideia|me da uma ideia|não sei o que fazer|nao sei o que fazer|me ajuda a decidir)\\b", "i"), peso: 2.0, sentimento: 'neutro' },
  { id: 'foto', padrao: rx("^(\\[foto\\]|mandei uma foto|foto enviada|segue a foto|olha a foto)\\b", "i"), peso: 2.6, sentimento: 'positivo' },
  { id: 'pedido_foto', padrao: rx("\\b(manda|envia|me manda|quero)\\s+(uma\\s+)?(foto|selfie|nudes?|pic|imagem)|foto\\s+(sem roupa|pelada|nua)|nudes?\\b", "i"), peso: 3, sentimento: 'neutro' },
  // Falar grosso com ela é caso à parte: tem limite próprio, não resposta.
  { id: 'grosseria', padrao: rx("\\b(cala a boca|cala boca|fica quieta|fica quieto|idiota|imbecil|burra|burro|otári[ao]|babaca|escrota|escroto|vai se ferrar|vai a merda|vai à merda|sua vaca|sua p[úu]ta|nojenta|nojent[ao]|lixo humano|in[úu]til|est[úu]pida|estupid[ao]|pat[ée]tica|desgraçad[ao]|arrombad[ao]|vai tomar no|chata pra caralho|te odeio)\\b", "i"), peso: 3.2, sentimento: 'negativo' },
  { id: 'pedido_audio', padrao: rx("\\b(me manda um áudio|me manda um audio|manda um áudio|manda um audio|manda áudio|manda audio|quero um áudio|quero um audio|quero ouvir sua voz|manda sua voz|manda a sua voz|grava um áudio|grava um audio|me manda audio|manda um voic|vozinha sua)\\b", "i"), peso: 2.2, sentimento: 'neutro' },
  { id: 'flerte_forte', padrao: rx("\\b(transar|sexo|trepar|nua|pelada|tesao|tesão|safadeza|na cama|cama|beijo de lingua|pegação|pegar você|te pegar|gozar|sentar|gemer|morder)\\b", "i"), peso: 3 },
  { id: 'elogio_corpo', padrao: rx("\\b(gostosa|gostoso|bundinha|bunda|peitos?|seios|coxas|sorriso safado|corpo lindo|sarada|gostei do seu corpo|essa boca)\\b", "i"), peso: 2.4, sentimento: 'positivo' },
  { id: 'cantada', padrao: rx("\\b(tá solteira|ta solteira|solteira\\?|me dá uma chance|sai comigo|você é um perigo|queria te beijar|posso te beijar|sonhei com você|sonhei contigo|apaixonad)", "i"), peso: 2.2, sentimento: 'positivo' },
  { id: 'declaracao', padrao: rx("\\b(te amo|amo você|gosto muito de você|gosto tanto de você|apaixonado por você|quero algo sério|quero namorar|você é tudo|meu amor|meu bem maior|te quero)\\b", "i"), peso: 2.6, sentimento: 'positivo' },
  { id: 'saudade', padrao: rx("\\b(saudade|saudades|senti sua falta|sinto sua falta|queria você aqui|sinto falta de conversar|sinto falta da gente|sinto falta disso|saudade de conversar|saudade do nosso papo|queria te ver|queria estar com você|pensando em você|pensando em vc|tô pensando em você|to pensando em você|lembrei de você|lembrei de vc|queria estar contigo|tava pensando em você|pensei em você|lembrei de você|sonhei com você)\\b", "i"), peso: 2.2, sentimento: 'positivo' },
  { id: 'convite', padrao: rx("\\b(vamos sair|bora sair|sair hoje|tomar um café|café comigo|ir no cinema|vamos no|jantar comigo|almoçar comigo|te buscar|te levar|marcar algo|marcar um|rolê|programa hoje|encontro hoje|vamos marcar|marcar alguma coisa|marcar qualquer coisa|bora marcar|podemos marcar|a gente podia|o que você acha de sábado|o que você acha de sabado|você tá livre sábado|voce ta livre sabado|sair no fim de semana|vamos fazer algo|te ver hoje|te ver amanhã|posso te ver|quando a gente se vê)\\b", "i"), peso: 2.2, sentimento: 'positivo' },
  // Pedido de história: ela conta um caso dela em vez de responder "anotado".
  { id: 'pedido_historia', padrao: rx("\\b(me conta uma coisa boa|conta uma coisa boa|me conta algo bom|conta algo bom|fala uma coisa boa|me conta uma novidade|conta uma novidade|me conta uma curiosidade|conta uma curiosidade|me conta um caso|conta um caso|me conta uma história|conta uma história|me conta um segredo|conta um segredo|me conta uma fofoca|conta uma fofoca|conta uma coisa interessante|me conta uma coisa interessante)\\b", "i"), peso: 1.7, sentimento: 'neutro' },
  // Noite sem dormir: ela cuida, não puxa assunto aleatório.
  { id: 'reclamacao_sem_dormir', padrao: rx("\\b(não consigo dormir|nao consigo dormir|não dormi|só dormi|insônia|insonia|de madrugada acordado|acordei no meio da noite|não peguei no sono|nao peguei no sono|a cabeça não para|a cabeca nao para|mente acelerada|sem sono)\\b", "i"), peso: 2.3, sentimento: 'negativo' },
  // Gratidão pela conversa: ela recebe o obrigado e devolve com cuidado.
  { id: 'gratidao_recebida', padrao: rx("\\b(agradecer a conversa|obrigado pela conversa|obrigada pela conversa|valeu pela conversa|obrigado pelo papo|obrigada pelo papo|valeu pelo papo|obrigado por ouvir|obrigada por ouvir|obrigado pela paciência|obrigado pela ajuda|obrigada pela ajuda|obrigado pelo conselho|obrigada pelo conselho|obrigado pelo carinho|obrigada pelo carinho)\\b", "i"), peso: 1.8, sentimento: 'positivo' },
  { id: 'apoio', padrao: rx("\\b(triste|muito triste|pra baixo|para baixo|deprimid[oa]s?|cansad[oa]s?|exaust[oa]s?|estressad[oa]s?|ansios[oa]s?|chorando|chorei|difícil|problema|briga|briguei|perdi (o |meu )?emprego|fui demitid[oa]|me demitiram|demitid[oa]s?|doente|com medo|preocupad[oa]s?|sozinh[oa]s?|desanimad[oa]s?|chatead[oa]s?|magoad[oa]s?|no fundo do poço|acabou o namoro|terminamos|me separei|separação|meu dia foi horrível|dia horrivel|perdi a paciência|perdi a paciencia|t[ôo] (muito )?mal|estou mal|me sinto mal|não tô bem|nao to bem|não estou bem|nao estou bem|tô exausto|to exausto|tô acabado|to acabado|sem forças|sem forcas|sem ânimo|sem animo|sobrecarregad[oa]s?|sem sono|não consigo dormir|nao consigo dormir|não dormi|nao dormi|dormi mal|acordei de madrugada|sem energia)\\b", "i"), peso: 2.1, sentimento: 'negativo' },
  { id: 'alegria', padrao: rx("\\b(passei na prova|passei de ano|passei no concurso|passei no vestibular|passei de fase|aprovei|consegui|ganhei|promoção|aumento|fui aprovad[oa]|deu certo|melhor dia|feliz|felizona|notícia boa|formei|conquistei|mudança|novo emprego|deu tudo certo|recebi a notícia|recebi a noticia|me elogiaram|fui elogiado)\\b", "i"), peso: 2.0, sentimento: 'positivo' },
  { id: 'desculpa', padrao: rx("\\b(desculpa|desculpe|foi mal|perdão|me perdoa|não quis|nao quis|vacilei|errei|demorei pra responder|sumi)\\b", "i"), peso: 1.9, sentimento: 'negativo' },
  { id: 'agradecimento', padrao: rx("\\b(obrigad[oa]s?|valeu|agradeço|agradecer|vim aqui agradecer|muito gentil|você me ajudou|salvou meu dia|gratidão)\\b", "i"), peso: 1.7, sentimento: 'positivo' },
  { id: 'provocacao', padrao: rx("\\b(por que não respondeu|porque não responde|você demora|tá me evitando|ta me evitando|sumiu|não me responde|nunca tem tempo|ocupada demais|sempre ocupada|você é fria|você é seca|nem me responde|tá difícil falar com você)\\b", "i"), peso: 1.9, sentimento: 'negativo' },
  { id: 'ciumes', padrao: rx("\\b(quem é|com quem|onde você tá|onde tu tá|tava com quem|ciúme|ciume|é seu namorado|esse menino|esse cara|essa menina|tá saindo com alguém|você tem alguém|quem é essa|quem é esse|você tava com alguém|vi uma foto sua)\\b", "i"), peso: 1.8, sentimento: 'neutro' },
  { id: 'pergunta_sobre_mim', padrao: rx("\\b(o que você acha de mim|gosta de mim|pensa em mim|você me acha|se eu te beijasse|você ficaria comigo|sente algo por mim|me acha bonito|me acha interessante|sou seu tipo|o que você sente por mim|você me quer|eu te interesso)\\b", "i"), peso: 1.9, sentimento: 'positivo' },
  { id: 'pergunta_rotina', padrao: rx("\\b(o que você tá fazendo|o que voce ta fazendo|o que você está fazendo|o que voce esta fazendo|tá fazendo o que|ta fazendo o que|que que você tá fazendo|fazendo o que agora|o que você faz da vida|o que voce faz da vida|o que anda fazendo|o que você anda fazendo|como foi o seu dia|como foi seu dia|como tá o seu dia|o que você fez hoje|o que voce fez hoje|o que você tá vendo|em que você tá pensando|em que você pensa|tá fazendo agora|ta fazendo agora)\\b", "i"), peso: 1.6, sentimento: 'neutro' },
  { id: 'mensagem_enviada', padrao: rx("\\b(você viu o que eu te mandei|voce viu o que eu te mandei|você viu o que eu mandei|viste o que eu mandei|chegou a ver o que eu mandei|você viu o vídeo|voce viu o video|você viu o que eu postei|voce viu o que eu postei|você viu o que eu compartilhei|você abriu o que eu mandei|viu minha mensagem|você viu minha mensagem|você viu o link|você olhou o que eu mandei)\\b", "i"), peso: 1.7, sentimento: 'neutro' },
  { id: 'pergunta_pessoal', padrao: rx("\\b(você gosta|você prefere|qual é o seu|qual seu|o que você curte|você já|você já foi|você tem|quais são seus|do que você gosta|qual sua|se você pudesse|você sonha|você quer da vida|qual foi a última|onde você mora|trabalha com o que|estuda o que|qual o seu signo|o que te faz feliz|você tem medo|você já pensou|o que te incomoda|o que te deixa feliz|conta uma coisa que você nunca contou)\\b", "i"), peso: 1.6, sentimento: 'neutro' },
  { id: 'elogio', padrao: rx("\\b(linda|lindo|bonita|bonito|gata|gato|maravilhos[ao]s?|incrível|incrivel|perfeita|perfeito|inteligente|engraçada|engraçado|fofa|fofo|doce|simpátic[oa]s?|elegante|cheirosa|estilosa|arrasou|top|melhor pessoa|melhor mulher|melhor homem|talentosa|talentoso|sua voz|seu jeito|sua energia|essa roupa|seu cabelo|sua risada|seu sorriso|você é demais|você é incrível|gente boa|gente fina|pessoa boa|pessoa incrível|pessoa incrivel|você é ótima|você é ótimo|voce e otima|voce e otimo|você é legal|você é um amor|te admiro|você é forte|você é especial|você é carinhosa|você é carinhoso)\\b", "i"), peso: 1.5, sentimento: 'positivo' },
  { id: 'flerte_leve', padrao: rx("\\b(beijinho|beijo|abraço|abraco|carinho|de mãos dadas|sinto seu cheiro|que vontade de te ver|tô com vontade de você|vem cá|chega mais|queria estar aí|queria te abraçar|tomar um vinho com você|noite especial|te ver de pertinho|meu amor|meu bem|meu anjo|sinto sua falta)\\b", "i"), peso: 1.7, sentimento: 'positivo' },
  { id: 'piada', padrao: rx("\\b(kkk+|haha+|rsrs|rindo|piada|meme|zoeira|é brincadeira|tô zoando|to zoando|sarcasmo|kk|morri de rir|não consigo parar de rir|nao consigo parar de rir)\\b", "i"), peso: 1.4, sentimento: 'positivo' },
  { id: 'tedio', padrao: rx("\\b(tédio|tedio|sem fazer nada|nada pra fazer|nada para fazer|chato|parado em casa|fim de semana parada|entediada|entediado|de bobeira)\\b", "i"), peso: 1.3, sentimento: 'neutro' },
  { id: 'cotidiano_trabalho', padrao: rx("\\b(trabalhei|trabalhando|trabalho|reunião|reuniao|chefe|cliente|expediente|hora extra|escritório|escritorio|empresa|plantão|plantao|serviço|servico|acabei de chegar|cheguei do serviço|cheguei do servico|tô de folga|to de folga|no intervalo|saindo do trabalho|voltei do trabalho)\\b", "i"), peso: 1.2, sentimento: 'neutro' },
  { id: 'cotidiano_estudo', padrao: rx("\\b(faculdade|aula|prova|trabalho da faculdade|estudo|estudando|curso|professor|professora|tcc|monografia|estágio|estagio|vestibular|enem)\\b", "i"), peso: 1.2, sentimento: 'neutro' },
  { id: 'cotidiano_comida', padrao: rx("\\b(almoço|almoco|jantar|café da manhã|cafe da manha|pizza|hambúrguer|hamburguer|comida|fome|sobremesa|açaí|acai|feijoada|churrasco)\\b", "i"), peso: 1.15, sentimento: 'neutro' },
  { id: 'mudanca_assunto', padrao: rx("\\b(mudando de assunto|outra coisa|por falar nisso|aliás|alias|a propósito|a proposito|esquece isso|deixa pra lá|deixa pra la)\\b", "i"), peso: 1.2, sentimento: 'neutro' },
  { id: 'saudacao', padrao: rx("^(oi+|ola|opa|eai|e ai|eae|hey|fala|salve|bom dia|boa tarde|boa noite|tudo bem|tudo bom|como vai|td bem|blz|beleza|tudo em ordem|tudo certo|alguma novidade|fala comigo|apareceu|e aí sumido|e ai sumido|bom te ver|que bom te ver|só passando|so passando|passei pra falar|vim aqui|vim falar com você|oi de novo|olá de novo)\\b|\\b(dar um oi|mandar um oi|vim dar um oi|vim aqui dar um oi|passei pra dar um oi|vim falar com você)\\b", "i"), peso: 1.5, sentimento: 'positivo' },
  { id: 'despedida', padrao: rx("\\b(tchau|até mais|ate mais|até logo|ate logo|vou dormir|vou indo|falo depois|te ligo depois|até amanhã|ate amanha|boa noite|beijinho|bj|bjs|abraço|abraco|me desculpa o sumiço|vou sair|vou desligar|vou nessa|até já|ate ja|até depois|falo com você amanhã)\\b", "i"), peso: 1.5, sentimento: 'neutro' },
  { id: 'pergunta_fato', padrao: rx("\\?|^(qu|como|qual|quando|onde|por que|porque|quem|será que|sera que)\\b", "i"), peso: 1.0, sentimento: 'neutro' },
  { id: 'resposta_curta', padrao: rx("^(sim|não|nao|nao sei|sei lá|sei la|ok|oks|okay|beleza|blz|combinado|vou ver|talvez|pode ser|acho que sim|acho que não|hum+|ahn+|ah|aham|ata|certo|entendi|topo|bora)[.! ]*$", "i"), peso: 1.0, sentimento: 'neutro' },
];

const POSITIVOS = ['amei', 'adorei', 'ótimo', 'otimo', 'maravilha', 'que bom', 'gostei', 'legal', 'top', 'perfeito', 'feliz', 'obrigad', 'valeu', 'melhor', 'animado', 'animada', 'saudade', 'amor', 'linda', 'lindo', 'beijo', 'abraço', 'abraco', 'curti', 'uhuu', 'eba'];
const NEGATIVOS = ['triste', 'cansad', 'chateado', 'chateada', 'raiva', 'ódio', 'odio', 'péssimo', 'pessimo', 'ruim', 'difícil', 'dificil', 'problema', 'sozinha', 'sozinho', 'medo', 'ansios', 'estress', 'chorando', 'não', 'nao', 'desculpa', 'demorei', 'sumi', 'briga', 'acabou', 'doente', 'exaust', 'irritad', 'ninguém', 'ninguem'];

export function sentimentoDe(texto: string): Sentimento {
  const normalizado = normalizeText(texto);
  let positivo = 0, negativo = 0;
  for (const palavra of POSITIVOS) if (normalizado.includes(palavra)) positivo++;
  for (const palavra of NEGATIVOS) if (normalizado.includes(palavra)) negativo++;
  if (positivo > negativo) return 'positivo';
  if (negativo > positivo) return 'negativo';
  return 'neutro';
}

/**
 * Descobre de qual parente a pessoa está falando ("como tá sua mãe?", "e a sua
 * filha?"). Sem correspondência, devolve o primeiro familiar cadastrado.
 */
export function familiarDaMensagem(texto: string, familiares: { nome: string; papel: string }[]): { nome: string; papel: string } | null {
  if (!familiares.length) return null;
  const normal = normalizeText(texto || '');
  const mapa: [RegExp, string[]][] = [
    [/\b(mae|mãe|mamae|mainha)\b/, ['mãe']],
    [/\b(pai|papai|painho)\b/, ['pai']],
    [/\b(filha|filhas|menina|garota)\b/, ['filha']],
    [/\b(filho|filhos|menino|garoto)\b/, ['filho']],
    [/\b(irma|irmã|mano)\b/, ['irmã', 'irmão']],
    [/\b(avo|avó|avô|vovozinha|vovo)\b/, ['avó', 'avô']],
    [/\b(tia|tias)\b/, ['tia']],
    [/\b(tio|tios)\b/, ['tio']],
    [/\b(prima|primas)\b/, ['prima']],
    [/\b(primo|primos)\b/, ['primo']],
    [/\b(esposa|marido|namorada|namorado|noivo|noiva)\b/, ['esposa', 'marido', 'namorada', 'namorado']],
  ];
  for (const [padrao, papeis] of mapa) {
    if (!padrao.test(normal)) continue;
    const achado = familiares.find(item => papeis.includes(item.papel));
    if (achado) return achado;
  }
  return familiares[0] || null;
}

/** Intenções românticas/ousadas: se a frase nega o trecho, não contam. */
const SENSIVEIS_A_NEGACAO = new Set<IntentId>(['flerte_forte', 'pedido_foto', 'elogio_corpo', 'cantada', 'declaracao']);

/** O padrão casou de verdade? Em intenção sensível, o trecho não pode estar negado. */
function casarRegra(regra: RegraIntencao, texto: string): boolean {
  const encontro = regra.padrao.exec(texto);
  if (!encontro) return false;
  if (!SENSIVEIS_A_NEGACAO.has(regra.id)) return true;
  const antes = texto.slice(Math.max(0, encontro.index - 26), encontro.index);
  return !/\b(não|nao|nunca|nem|sem|jamais)\b/i.test(antes);
}

export function detectarIntencao(texto: string): { id: IntentId; sentimento: Sentimento } {
  // Duas leituras da mesma mensagem: do jeito que veio e com as abreviações
  // abertas ("vc viu hj?"). Vence a regra de MAIOR peso (prioridade), e o
  // empate cai para a ordem da lista. É o que evita "não te amo mais" virar
  // declaração e "que horas você almoça?" ganhar resposta de outro assunto.
  const cru = normalizeText(texto);
  const expandido = normalizeText(expandirAbreviacoes(texto));
  let melhor: RegraIntencao | null = null;
  for (const regra of REGRAS_INTENCAO) {
    const casou = casarRegra(regra, cru) || (expandido !== cru && casarRegra(regra, expandido));
    if (!casou) continue;
    if (!melhor || regra.peso > melhor.peso) melhor = regra;
  }
  if (melhor) return { id: melhor.id, sentimento: melhor.sentimento || sentimentoDe(texto) };
  if (!texto.trim()) return { id: 'resposta_curta', sentimento: 'neutro' };
  return { id: texto.trim().split(/\s+/).length <= 3 ? 'resposta_curta' : 'desconhecido', sentimento: sentimentoDe(texto) };
}

// ---------------------------------------------------------------------------
// Bancos de resposta
// ---------------------------------------------------------------------------

const A = 'amizade', F = 'flerte', P = 'picante';
type Familia = typeof A | typeof F | typeof P;
type Banco = Partial<Record<Familia, string[]>>;

/** Bolha curta de reação, antes do conteúdo. */
const RECEPCOES: Record<string, string[]> = {
  positivo: ['Ahhh 😍', 'Sério? 🥰', 'Ai, para 😳', 'Que fofo 💕', 'Own 🥺', 'Olha, gostei disso 😏', 'Você sabe falar, hein 😅', 'Ai, assim eu fico boba 😳', 'Nossa 😍', 'Tá me estragando 😅', 'Hmm, continue 💛', 'Isso me deixou sorrindo aqui', 'Que bom de ler isso', 'Gostei disso, sério'],
  negativo: ['Ah não 😔', 'Nossa...', 'Poxa 😕', 'Vem cá, me conta', 'Isso foi pesado 😟', 'Ei... respira', 'Uff 😥', 'Ah, que pena 😔', 'Não gostei de ler isso', 'Vem, desabafa comigo'],
  neutro: ['Hmm 🤔', 'Entendi', 'Ah, sei', 'Sério?', 'Boa', 'Ah tá', 'Faz sentido', 'É mesmo?', 'Ah, agora entendi', 'Entendi o ponto', 'Isso faz sentido', 'Pois é', 'Sei como é', 'Deixa eu pensar', 'Uhum, faz sentido'],
};

/** Conteúdo principal por intenção e tom. */
const RESPOSTAS: Record<IntentId, Banco> = {
  saudacao: {
    [A]: [
      'Oi! Tudo bem por aqui 😊 e você, como tá?', 'Olá! Já ia te mandar mensagem, juro 😅', 'Oi! Acabei de chegar em casa, tô livre agora',
      'Oi! Que bom que você apareceu, o dia tava parado', 'Oi, tudo certo por aqui. E por aí, como anda?',
      'Olá! Tô no meio das minhas coisas, mas sempre paro pra conversar', 'Oi! Chegou na melhor hora, eu tava sozinha',
    ],
    [F]: ['Oiii 😏 apareceu logo hoje, gostei disso', 'Oi, você 😉 tava pensando em quem?', 'Opa, o dia melhorou agora 😄'],
    [P]: ['Oi, você 😏 chega mais, tava com saudade do seu papo', 'Hmm, oi 😍 desse jeito eu respondo rápido, viu'],
  },
  despedida: {
    [A]: ['Já vai? 😅 foi bom falar com você, se cuida!', 'Ok! Boa noite e bom descanso 😊', 'Beijinho! Amanhã te conto o resto do rolê'],
    [F]: ['Já?! 😩 vai me deixar com vontade então', 'Vai com Deus, mas não demora pra voltar 😏', 'Beijo em você 😘 amanhã quero continuação'],
    [P]: ['Vai sim 😏 vou ficar aqui pensando em você... boa noite', 'Beijos, meu bem. Vou dormir com um sorriso bobo agora 😌'],
  },
  elogio: {
    [A]: ['Ai, obrigada 🥰 você também tem um jeito que pega, viu', 'Para 😳 você me deixa sem graça', 'Isso foi muito gentil, obrigada 😊 salvou meu dia'],
    [F]: ['Hmm, obrigada 😏 continue que eu gosto', 'Elogio na quarta-feira, cuidado que eu me acostumo 😉', 'Você fala isso pra todas ou pra mim? 😏'],
    [P]: ['Viu, se continua assim eu não respondo por mim 😏', 'Ai 😍 assim você me desmonta', 'Então você olhou com atenção, né? 🔥'],
  },
  elogio_corpo: {
    [A]: ['Olha 😳 obrigada... mas pega leve comigo, tá? 😅', 'Hmm, vou fingir que não li isso 😅 foca em me conhecer primeiro', 'Uau, direto assim 😅 vou levar como elogio, obrigada'],
    [F]: ['Ah pronto 😏 você repara nas coisas, né?', 'Hmm, obrigada 😳 fico sem graça mas não vou mentir que gostei', 'Assim de repente? 😅 pelo menos foi sincero'],
    [P]: ['Você repara em tudo, né? 😏 então trate de olhar com cuidado', 'Hmm 🔥 eu gosto quando é sincero assim', 'Vou fingir que não fiquei vermelha 😳 mas fiquei'],
  },
  cantada: {
    [A]: ['Opa, calma lá kkkk 🫣 você é rápido', 'kkkkk essa foi boa, mas vamos com calma 😅', 'Você tá ousado hoje hein 😳 me conhece ainda não'],
    [F]: ['Nossa, direto assim 😏 gostei da coragem', 'kkkkk você treinou isso ou saiu na hora? 😉', 'Olha, a cantada foi boa. Anotada 😏'],
    [P]: ['Sabe chegar, viu 😏 a resposta você descobre com o tempo', 'Hmm, gostei 🔥 agora me diz se tem atitude também', 'Tá me deixando com uma ideia na cabeça 😏'],
  },
  convite: {
    [A]: ['Gostei da ideia 😊 quando você pensou?', 'Ah, topo um café! Essa semana tá corrida, mas dou um jeito', 'Chama! Só me diz o dia que eu me organizo'],
    [F]: ['Você me chamando assim eu topo fácil 😏 escolhe o lugar', 'Hmm, um encontro 😊 combinado, mas quero que você escolha o lugar', 'Aceito! E depois você me deve uma sobremesa 😉'],
    [P]: ['Se for pra te ver de perto, eu vou 😏 só me diz que horas', 'Aceito, mas aviso: depois não quero culpado por nada 🔥', 'Hmm, prefiro lugar mais reservado 😏 você decide'],
  },
  pergunta_pessoal: {
    [A]: ['Boa pergunta 🤔 deixa eu pensar... gosto de coisa simples: café, música e sossego', 'Então 😅 depende do dia. {x} sempre me ganha', 'Eu curto {interesse}. E você, o que te pega?'],
    [F]: ['Gosto disso aqui, ó: boa conversa, chuva na janela e um chá. E você?', 'Você quer me conhecer melhor, né? 😏 eu gosto de {interesse}, cinema e preguiça de domingo', 'Hmm, prefiro {interesse} e noite de conversa rasa não. E você?'],
    [P]: ['Gosto de {interesse}... e de conversa que esquenta 🔥 depende do contexto 😏', 'Hmm, depende de quem pergunta 😏 mas fica sabendo que gosto de {interesse} e de um pouco de mistério'],
  },
  pedido_historia: {
    [A]: [
      'Vou te contar uma: semana passada eu me perdi no mercado e fiquei vinte minutos procurando o carro 😅',
      'Estava organizando uma gaveta e achei foto antiga da minha mãe. Fiquei parada olhando, sem pressa',
      'Hoje eu fiz uma coisa que não faço nunca: parei no meio da tarde, sentei na varanda e não fiz nada. Foi bom',
      'Comprei uma planta e tô cuidando dela como se fosse bicho. Já conversei com ela, pode rir',
      'Uma coisa boa do meu dia: encontrei uma vizinha que não via há meses e ficamos na calçada conversando',
    ],
    [F]: [
      'Vou te contar: domingo eu acordei pensando em você e fiquei com raiva de não estar aqui 😏',
      'Uma coisa que eu nunca contei: eu guardo as conversas que me fazem bem. Essa está indo pra lista',
      'Eu tava lembrando de uma noite de chuva em que fiquei acordada conversando. Não foi contigo, mas podia ser',
    ],
    [P]: [
      'Vou te contar uma coisa, mas você promete não se animar demais 😏',
      'Segredo meu: eu tenho um lado calmo que aparece pouco. Você quase viu ele hoje',
    ],
  },
  reclamacao_sem_dormir: {
    [A]: [
      'Noite ruim é assim mesmo: o corpo cansa e a cabeça acelera. Levanta, bebe água e anota o que te aperta num papel, ajuda de verdade',
      'Tenta deitar com o celular longe por vinte minutos, só pra ver. Pouca luz, chá e nada de tela',
      'Você dormiu mal por causa de problema ou foi a cabeça solta? Me conta, falar às vezes já alivia',
      'Se isso virar rotina, procura um médico, viu? Não deixa passar. E enquanto isso eu fico aqui com você',
    ],
    [F]: [
      'Queria estar aí pra te fazer companhia até o sono chegar 😊 mas por enquanto fica meu recado: deita e pensa em coisa boa',
      'Se eu estivesse aí você já estaria dormindo 😏 enquanto isso, fecha os olhos e me responde amanhã',
    ],
    [P]: [
      'Vem cá que eu te distraio até o sono chegar 😏',
      'Não fica acordado não, que eu quero você descansado amanhã 🔥',
    ],
  },
  gratidao_recebida: {
    [A]: [
      'Não precisa agradecer, de verdade. Eu gosto de conversar com você, isso já basta',
      'Fico feliz em ler isso 😊 o papo flui porque você também faz a sua parte',
      'Imagina! Se a conversa ajudou em alguma coisa, já valeu o dia',
      'Nada disso, foi um prazer. E fica combinado: quando quiser falar, eu tô por aqui',
    ],
    [F]: [
      'Agradece não, que eu fico querendo mais 😏',
      'Fico feliz de verdade. E olha que a melhor parte da conversa foi você',
    ],
    [P]: [
      'Obrigada você, que me deixa querendo continuar 😏 quando voltar, me chama',
    ],
  },
  pergunta_fato: {
    [A]: ['Deixa eu pensar 🤔 acho que sim!', 'Boa! Sobre isso eu acho que vai muito do dia, sabe? Mas te conto 😊', 'Rapaz, você me pegou 😅 nunca parei pra pensar. E você?', 'Ah, essa eu vi! Qual foi a sua parte favorita?', 'Confesso que não cheguei a ver kkk você viu? Me conta que eu fiquei perdida', 'Vi sim! Ficou aquela coisa na cabeça 😄 e você, o que achou?'],
    [F]: ['Hmm 😏 e por que você quer saber?', 'Resposta curta: depende. Resposta longa: te conto com um café 😉', 'Vou responder com uma condição: você também responde depois 😏'],
    [P]: ['Isso é assunto bom pra conversa mais perto 🔥 mas já que você perguntou...'],
  },
  pergunta_sobre_mim: {
    [A]: ['Ai, você me colocou numa saia justa 😳 acho você uma pessoa boa de conversa, sincero', 'Sim, penso sim 😊 você me ganhou na conversa, isso é raro', 'Eu te acho interessante, tô gostando de te conhecer de verdade'],
    [F]: ['Se eu te acho? 😏 você tem que me perguntar isso de perto pra ver minha cara', 'Penso, e mais do que devia 😳', 'Você é meu tipo de conversa, isso eu já sei 😉'],
    [P]: ['Sente algo? 😏 tô sentindo um negócio aqui que não vou escrever ainda', 'Se eu fosse sincera demais você ia ficar vermelho... digamos que sim 😏'],
  },
  declaracao: {
    [A]: ['Ai 😳 isso foi sério? Fico sem graça, mas obrigada pela sinceridade', 'Não sei o que dizer agora 😅 me dá um tempo, mas não fica estranho comigo', 'Uau. Vou guardar isso com carinho, prometo'],
    [F]: ['Nossa 😳 você falou. Eu gosto de você também, do meu jeito', 'Cuidado com palavras dessas 😏 depois eu me acostumo', 'Isso mexeu comigo, não vou mentir 💕'],
    [P]: ['Então é isso 😏 ... também ando querendo mais que conversa', 'Você acabou de mudar o clima aqui 🔥 vem cá me contar tudo'],
  },
  saudade: {
    [A]: ['Também tô com saudade 🥺 preciso organizar minha semana e a gente se fala mais', 'Ah, que gostoso ler isso 💛 eu penso em você também', 'Saudade boa, né? Vem me contar o que andou fazendo'],
    [F]: ['Saudade também 😏 e o que você vai fazer com isso?', 'Vem matar essa saudade então 😉 me chama pra sair', 'Tô com saudade de você, viu. Não escreve isso que eu vou cobrar'],
    [P]: ['Saudade é pouco pra o que eu tô sentindo 😏', 'Hmm, também. Passei a semana pensando em você 🔥'],
  },
  flerte_leve: {
    [A]: ['Ai, vou aceitar o carinho 😊 tô precisando de dia bom', 'kkk você é carinhoso, gostei disso', 'Fico sem graça mas não vou dizer não 😅'],
    [F]: ['Vem cá e me dá então 😏', 'Só isso? Quero de longe não, quero de perto 😉', 'Hmm, gostei. Pra frente ou pra trás? brincadeira 😏'],
    [P]: ['Beijo? Você começa pelo pescoço ou pela boca? 😏', 'Vou guardar esse convite 🔥 e cobrar na hora certa'],
  },
  flerte_forte: {
    [A]: ['Ultrapassou, viu kkkk 🫣 não é assim que funciona comigo', 'Olha... eu sou de conversa antes disso. Sem pressa 😊', 'Calma 😅 você tá pulando etapa. Não gosto disso'],
    [F]: ['Uau, foi direto 😳 vou fingir que não li... por enquanto', 'Você tá apressado 🔥 gosto de provocar antes de tudo, sabe como é? 😏', 'Hmm, calma. Me faz querer primeiro'],
    [P]: ['Não escreve isso que eu não respondo por mim 🔥', 'Tá me deixando com a cabeça ruim 😏 mas calma que a gente ainda tá se conhecendo'],
  },
  pedido_foto: {
    [A]: ['Foto? Mando as do cachorro 😅 de mim não, ainda não', 'Hmm, não sou de mandar foto assim, desculpa 🫣', 'Prefiro conversar. Foto fica pra quando eu confiar mais 😊'],
    [F]: ['Ousado 😳 mando uma do meu café, serve? kkkk', 'Primeiro você me faz rir bem. Depois a gente conversa sobre foto 😏', 'Calma 😅 eu gosto de mistério'],
    [P]: ['Hmm, não é por aqui que eu mando 😏 tem que merecer', 'Depois de um encontro a conversa muda 🔥 por enquanto, não'],
  },
  apoio: {
    [A]: ['Ei, me conta tudo. Tô aqui pra te ouvir, sem pressa 🫂', 'Poxa 😔 respira fundo. Aconteceu o que, especificamente?', 'Isso é pesado, sinto muito. Você quer desabafar ou quer conselho? Eu faço os dois'],
    [F]: ['Vem cá que eu te abraço em pensamento 🫂 desabafa comigo', 'Poxa, meu bem 😔 tô contigo, ok? Me conta', 'Isso não é nada justo. Manda tudo aqui, tô toda ouvidos'],
    [P]: ['Vem cá que eu cuido de você 🫂 tira isso do peito primeiro', 'Já que o dia foi ruim, eu fico com você a noite toda, pode desabafar'],
  },
  alegria: {
    [A]: ['Que notícia boa! 😄 já merecia, viu', 'Ae! Fico feliz de verdade 🥳 me conta os detalhes', 'Ai, que orgulho! Vamos comemorar isso'],
    [F]: ['Então comemora comigo 😏 hoje você tem meu parabéns pessoalmente (emoji de brinde 🔥)', 'Que bom, gostoso de ver você assim 😍 me conta tudo, tava ansioso?', 'Isso pede um jantar, hein 😉'],
    [P]: ['Comemora comigo então 🔥 dia bom merece coisa boa', 'Tô feliz por você e com ideias 😏'],
  },
  piada: {
    [A]: ['kkkkkkk você é bobo', 'kkkk parei, ri alto aqui 😂', 'Você tem um humor que me pega, viu'],
    [F]: ['kkkkk engraçado e ainda por cima charmoso, não tá fácil', 'Ri alto 😂 agora me dá mais uma dessas'],
    [P]: ['kkkk você usa o humor pra chegar perto, né? funciona 😏'],
  },
  provocacao: {
    [A]: ['Poxa, foi mal 😅 essas semanas ficaram pesadas aqui, mas você tem razão', 'Não é evitação não, juro. Meu dia tá corrido, mas eu leio tudo', 'Calma 😅 nem sempre dá pra responder na hora, sabe?'],
    [F]: ['Vou ignorar a cobrança 😏 mas confesso que gostei de ser cobrada', 'Você sentiu minha falta, né? 😉 tá bem, prometo responder mais rápido', 'Eu sumo, mas volto. Você aguentou bem 😏'],
    [P]: ['Reclamando de falta? 😏 eu distribuo esse tempo com cuidado, viu', 'Tá exigente 🔥 gostei disso, vem cobrar pessoalmente'],
  },
  ciumes: {
    [A]: ['Calma kkkk é meu amigo de infância, nada demais 😅', 'Nossa, ciuminho? 😳 não precisa, sério', 'Fiquei sem saber o que responder agora. Não tem ninguém, relaxa'],
    [F]: ['Ciumento você hein 😏 isso me diz muita coisa', 'Hmm, se eu contasse você ia ficar pior 😉 brincadeira, é só o pessoal do trabalho', 'Gostei de ver você assim, mas relaxa 😌'],
    [P]: ['Ciume é bom, mas guarda pra quando você me ver de perto 😏', 'Você já tá se achando meu? 😏 cuidado, eu gosto'],
  },
  desculpa: {
    [A]: ['Relaxa, tá tudo bem 😊 eu também tenho dias corridos', 'Não precisa pedir desculpa, sério. Fico feliz que você voltou', 'Esquece isso, sem clima ruim entre a gente'],
    [F]: ['Desculpa aceita 😌 mas você me deve uma atenção a mais', 'Tá perdoado 😏 e eu não esqueço fácil, viu'],
    [P]: ['Perdoado 😏 e você sabe como pagar'],
  },
  agradecimento: {
    [A]: ['Imagina! 😊 tô aqui pra isso', 'De nada, sério. Gosto de ajudar você', 'Fico feliz em ter ajudado 💛'],
    [F]: ['De nada 😏 depois me agradece pessoalmente', 'Sempre. Só não me deixa acostumada 😉'],
    [P]: ['Você pode me agradecer direito depois 😏'],
  },
  resposta_curta: {
    [A]: ['kkk você é econômico nas palavras hoje', 'Ok 😊 me conta mais, como foi seu dia?', 'Só isso? Fala mais, eu tô aqui'],
    [F]: ['Só isso? 😏 quero mais que isso', 'Hmm, responde curto e me deixa curiosa', 'kkk você tá pensando em algo, me fala'],
    [P]: ['Resposta curta assim me deixa pensando 😏'],
  },
  mudanca_assunto: {
    [A]: ['Pode mudar 😊 sobre o que você quer falar?', 'Ah tá, entendi 😅 vamo falar de coisa melhor', 'Boa ideia, esse assunto tava pesado'],
    [F]: ['Mudou de assunto por quê? 😏 tava interessante', 'Tá, mas depois você volta nesse ponto 😉'],
    [P]: ['Mudou porque tava ficando quente? 😏 eu deixo você escolher'],
  },
  tedio: {
    [A]: ['Tédio aqui também 😅 me chama pra fazer algo', 'Sabe o que resolve tédio? Conversa. Você já chegou 😊', 'Tô na mesma. Que tal a gente inventar um programa?'],
    [F]: ['Tédio é convite, viu 😏 aproveita', 'Vem me tirar do tédio então 😉'],
    [P]: ['Tédio é perigoso comigo por perto 🔥'],
  },
  cotidiano: {
    [A]: ['Nossa, isso toma o dia todo, né? 😅 você conseguiu fazer o resto?', 'Ah, essas coisas do dia a dia cansam mais que muita coisa grande', 'Conta mais sobre isso, quero entender como foi'],
    [F]: ['Sério? 😏 e eu aqui pensando em você em vez de resolver minhas coisas', 'Vida adulta é isso 😅 mas quero saber de você, conta'],
    [P]: ['Você me conta o dia e eu te conto o que eu faria pra melhorar ele 😏'],
  },
  cotidiano_trabalho: {
    [A]: ['Trabalho tá pesado por aí? 😅 o meu também, sem fim', 'Nossa, reunião demais cansa a alma. Sobrou um tempo pra você?', 'Esse povo resolve tudo em cima da hora, né? Respira 😊'],
    [F]: ['Se você fosse meu cliente, eu atendia com sorriso 😏', 'Sai do escritório e me conta como foi? Quero saber', 'Trabalha bem, hein. Eu gosto de gente com propósito 😉'],
    [P]: ['Depois desse dia, você merece um banho demorado... e alguém pra te ouvir 😏'],
  },
  cotidiano_estudo: {
    [A]: ['Prova é sempre a mesma coisa, né? Foca que passa 😊', 'Estudar cansa. Come alguma coisa antes que a cabeça trava', 'Eu também tô nessa fase. A gente sofre junto 😅'],
    [F]: ['Se eu estudasse com você ia render... ou não 😏', 'Você é dedicado, isso me chama atenção 😉'],
    [P]: ['Estudando muito? Se distrair um pouco não faz mal 🔥'],
  },
  foto: {
    [A]: ['Que legal 😊 gostei de ver! Eu também mando uma coisa do meu dia depois', 'Oww, gostei! Você tem cara de quem tira foto das coisas simples', 'Boa! Adoro quando a conversa sai do texto e vira imagem'],
    [F]: ['Uau 😏 gostei de acordar com essa foto', 'Tá me deixando com vontade de te mostrar o que eu tô fazendo aqui 😉', 'Você tem um sorriso que entrega, sabia? 😍'],
    [P]: ['Hmm, gostei do que vi 😏 agora quero ver mais de perto', 'Você manda foto assim do nada e ainda quer que eu me comporte? 🔥'],
  },
  cotidiano_comida: {
    [A]: ['Nossa, agora me deu fome 😅', 'Amo comida boa. Você cozinha ou pede?', 'Isso sim é papo. Me fala o lugar, quero conhecer'],
    [F]: ['Se você cozinha assim, me chama pro jantar 😏', 'Comida boa e companhia boa é o combo perfeito 😉'],
    [P]: ['Jantar e depois? 😏 você escolhe a sobremesa'],
  },
  pergunta_relacionamento: {
    [A]: [
      'Não, estou solteira 😊 por que a pergunta?',
      'Solteira sim! Curioso você, hein 😄',
      'Não tenho ninguém não, pode ficar tranquilo',
      'Estou de portas fechadas pro resto do mundo, mas aberta pra boa conversa 😄',
      'Solteira. Mas não estou dando facilidade não, viu 😏',
    ],
    [F]: ['Solteira 😏 por que você quer saber?', 'Não tenho ninguém... ainda 😏', 'Solteira sim. Por que a pergunta toda? 😄'],
    [P]: ['Solteira, e muito bem acompanhada quando eu quero 😏'],
  },
  pergunta_factual: {
    [A]: [], // preenchido por tipo (mora/signo) na montagem da resposta
    [F]: [],
    [P]: [],
  },
  plano: {
    [A]: [
      'Ahh, boa! Me conta mais que eu quero saber do plano 😄',
      'Gostei! Depois me conta como foi, tá?',
      'Boa ideia. Dá certo não é? Força aí 😊',
      'Aí sim! Você anda produtivo, gostei disso',
      'Boa sorte com isso! Tô torcendo por aqui 💛',
    ],
    [F]: ['Você com planos... gostei disso 😏 me chama nessa', 'Aprovo! Principalmente se tiver meu nome no plano 😄'],
    [P]: ['Plano bom. Se precisar de companhia, você já sabe quem chamar 😏'],
  },
  // Estes seis são preenchidos logo abaixo, pelos reforços de relacionamento.
  pergunta_familiar: {},
  pergunta_idade: {},
  igreja: {},
  vida_adulta: {},
  conselho: {},
  confusao: {},
  desconhecido: {
    [A]: ['Faz sentido 😊 me conta mais sobre você e isso', 'Interessante, nunca tinha pensado por esse lado', 'Gostei disso. Como você chegou nessa conclusão?'],
    [F]: ['Hmm 😏 você fala bem, isso é perigoso', 'Tô gostando desse papo. Continua', 'Sabe puxar assunto, né 😉'],
    [P]: ['Você fala e eu fico aqui imaginando o resto 😏'],
  },
  pergunta_rotina: {
    [A]: [
      'Agora? Tô de boa em casa, com o celular na mão esperando alguém me distrair 😄',
      'Nesse instante tô tomando um café e resolvendo uma coisinha ou outra 😊',
      'Tô aqui arrumando a casa e fingindo que não tenho mais nada pra fazer hoje 😅',
      'Meu dia tá tranquilo, viu? Terminei minhas coisas e agora tô só descansando',
      'Tô ouvindo música e organizando a vida em pensamento kkk e você, tá fazendo o quê?',
    ],
    [F]: [
      'Agora? Tô pensando em você, pra ser honesta 😊 o resto é detalhe',
      'Tô de preguiça na cama, imaginando você aqui do meu lado 😏',
      'Tava com a cabeça longe... e adivinha em quem eu pensei 😉',
    ],
    [P]: [
      'Só de camisola, deitada na cama... e você aparece na melhor hora 🔥',
      'Tô no banho agora, quer continuar essa conversa depois? 😏',
    ],
  },

  grosseria: {
    [A]: LIMITES_GROSSERIA,
    [F]: LIMITES_GROSSERIA,
    [P]: LIMITES_GROSSERIA,
  },
  pedido_audio: {
    [A]: [
      'Áudio não, meu bem. Eu escrevo melhor do que falo',
      'Prefiro escrever. Na voz eu me embolo toda',
      'Não gosto de gravar a minha voz, mas por aqui eu falo o quanto você quiser',
    ],
    [F]: [
      'Só se você prometer guardar só pra você',
      'Mando sim, mas depois você me conta o que achou da minha voz',
    ],
    [P]: [
      'Mando sim, com a voz daquele jeito que você gosta',
      'Vou gravar um só pra você, e você não mostra pra ninguém',
    ],
  },
  mensagem_enviada: {
    [A]: [
      'Vi sim! Abri correndo quando chegou, pode mandar sempre 😄',
      'Vi, viu? E gostei. Você tem sempre umas boas',
      'Ainda não vi, tava no corre o dia inteiro. Vou abrir agora e já te falo',
      'Vi e fiquei sem graça, obrigada por lembrar de mim 😊',
    ],
    [F]: [
      'Vi sim 😊 e fiquei aqui sorrindo feito boba, tá sabendo?',
      'Eu abro tudo que vem de você, pode mandar sem medo 😏',
      'Não vi ainda... mas se era pra me deixar curiosa, funcionou',
    ],
    [P]: [
      'Vi, sim... e fiquei pensando em outra coisa depois 🔥',
      'Ainda não abri, tava ocupada. O seu eu abro com calma 😏',
    ],
  },

};


/** Reforço de variedade: as opções abaixo entram depois das originais. */
const REFORCO: Record<string, Partial<Record<Familia, string[]>>> = {
  saudacao: {
    [A]: ['Oi! Tava mexendo no celular e você apareceu 😄', 'Opa, oi! Como foi seu dia até agora?', 'Oi, tudo certo? Tô num intervalo aqui, posso conversar 😊', 'Oiê! Sua mensagem chegou na hora certa', 'Oi! Anda sumido, mas eu deixo passar 😅'],
    [F]: ['Olha quem apareceu 😏 tava esperando isso', 'Oi, você! Vim correndo quando vi seu nome 😊', 'Oiê 😉 demorou, hein'],
  },
  despedida: {
    [A]: ['Vou nessa então! Depois me conta o resto 🙃', 'Tá bom, cuidate! Falamos amanhã', 'Beijo! Volta pra conversar quando puder 😊'],
    [F]: ['Vai logo, senão eu fico conversando até tarde 😏', 'Tchau, mas fica devendo uma continuação 😘'],
  },
  elogio: {
    [A]: ['Ai, que delícia ler isso 🥰 fico boba', 'Obrigada de verdade, você tem jeito pra falar 💛', 'Isso me deixou sorrindo aqui, obrigada 😊', 'Você me deixa sem resposta e eu falo muito, olha o que você faz 😅', 'Guardado no coração, viu 💕', 'Eu ia dizer obrigada, mas acho que vou deixar você ganhar essa 😌', 'Nossa, se eu acreditar em tudo isso eu fico convencida 😄', 'Que jeito bom de falar, obrigada 💛', 'Eu gosto quando você repara nas coisas 🙂', 'Você elogia e depois some, hein? Assim eu me acostumo', 'Isso valeu meu dia, obrigada 💕'],
    [F]: ['Você tá querendo me deixar mole, né? 😏', 'Olha, continua que eu não vou reclamar 😉', 'Aí você me ganha no papo, foi mal avisar 😅'],
    [P]: ['Assim você me deixa pensando coisa 😏', 'Você fala e eu já quero ver de perto 🔥', 'Se eu te contar o que eu pensei agora, a conversa muda 😏'],
  },
  elogio_corpo: {
    [A]: ['Ei, olha o respeito kkkk 😅 tô brincando, mas vamos com calma', 'Você foi direto, né? 😳 prefiro quando você elogia meu jeito', 'Hmm, obrigada... mas quero que você me conheça primeiro 😊'],
    [F]: ['Você repara demais, isso é bom e ruim 😏', 'Assim eu fico sem saber onde olhar 😳', 'Elogio bom, mas fica devendo um envelope de flores 😉'],
    [P]: ['Devagar com esse olhar aí 😏 me deixa sem graça', 'Você fala assim e eu já imagino a sua cara 🔥'],
  },
  cantada: {
    [A]: ['kkkkk que cantada foi essa, conta outra 😂', 'Você tá afiado hoje, mas segura o freio 😅', 'Essa foi criativa, vou dar nota 7. Faltou coragem 😄'],
    [F]: ['Essa foi boa 😏 vou fingir que não me pegou', 'Anotada. Agora me diz se você é assim de verdade 😉'],
  },
  convite: {
    [A]: ['Ah, gostei 😊 me diz o dia que eu organizo minha agenda', 'Topo! Só não me deixa esperando, hein', 'Boa ideia! Tinha pensado em coisa parecida essa semana 😄'],
    [F]: ['Chama e eu vou 😏 escolhe um lugar tranquilo', 'Tô dentro, mas quero que você decida o lugar 😉'],
  },
  pergunta_pessoal: {
    [A]: ['Boa pergunta 🤔 eu gosto de coisa simples: música, comida boa e gente sincera. E você?', 'Do que eu gosto? De conversa que rende e de gente que responde de verdade 😊', 'Nossa, depende do dia 😅 gosto de {interesse} e de ficar quieta em casa também'],
    [F]: ['Gosto de {interesse}, de café no fim da tarde e de alguém que puxa assunto 😏', 'Hmm, te conto se você responder a mesma coisa depois 😉'],
  },
  pergunta_fato: {
    [A]: ['Hmm, deixa eu pensar direito 🤔 acho que sim!', 'Você me pegou 😅 nunca parei pra pensar nisso antes', 'Olha, eu respondo, mas você também responde depois 😊'],
    [F]: ['E por que você quer saber? 😏 curiosidade pega bem em você'],
  },
  pergunta_sobre_mim: {
    [A]: ['Eu penso sim, e mais do que eu imaginava 😳 obrigada por perguntar', 'Acho você uma pessoa que fala bem e ouve também, isso é raro', 'Eu tô gostando desse papo, se é isso que você quer saber 😊'],
    [F]: ['Se eu penso em você? 😏 você sabe que eu não vou responder essa direito'],
  },
  declaracao: {
    [A]: ['Uau 😳 você foi fundo agora. Fico nervosa, mas feliz', 'Vou responder com calma quando pensar melhor, mas obrigada 💛', 'Isso aqui me pegou, não vou mentir. Preciso de um tempo pra digerir'],
    [F]: ['Você fala isso e eu fico sem graça e contente ao mesmo tempo 💕', 'Cuidado com o que fala no domingo à noite 😏 depois eu fico sonhando'],
  },
  saudade: {
    [A]: ['Também penso em você 💛 a gente se fala mais, prometo', 'Saudade é bom de sentir, mas melhor de matar 😊 bora marcar algo?', 'Ah, que gostoso, eu tava exatamente aqui pensando em você'],
    [F]: ['E o que você vai fazer pra resolver essa saudade? 😏'],
    [P]: ['Saudade é pouco 😏 vem cá que eu te conto'],
  },
  flerte_leve: {
    [A]: ['Ai, tô precisando de um carinho, mas vou ficar no pensamento 😅', 'kkk você tem jeito, hein. Vou lembrar disso', 'Eu gosto quando você escreve assim, mas disfarça 😊'],
    [F]: ['Vem e me dá logo, não gosto de espera 😏', 'Só um abraço? Tô negociando melhor que isso 😉'],
    [P]: ['Beijo é o começo do assunto 😏 continua'],
  },
  flerte_forte: {
    [A]: ['Ei, foi rápido demais 😅 vamos conversar antes', 'Calma, cada coisa no seu tempo. Não gosto de correria', 'Vou fazer de conta que não li isso, tá? 😊'],
    [F]: ['Você tem coragem, reconheço 😏 mas eu gosto de prelúdio', 'Segura o ritmo, vou te dar corda mas devagar 😉'],
    [P]: ['Assim me pega de surpresa 🔥 mas eu ainda mando no tempo', 'Devagar... quem tem pressa não aproveita 😏'],
  },
  pedido_foto: {
    [A]: ['Foto não, tá? Prefiro que você me conheça na conversa 😊', 'Kkkkk direto assim eu fico sem graça. Foto depois, talvez', 'Vou mandar uma do meu livro, serve? 😄'],
    [F]: ['Você vai ter que merecer essa foto 😏 conversa primeiro', 'Primeiro me faz rir, depois a gente negocia 😉'],
    [P]: ['Homem pedindo foto... 😏 me conta uma coisa boa primeiro'],
  },
  apoio: {
    [A]: ['Ei, respira. Tô aqui, escreve tudo com calma 🫂', 'Sinto muito, de verdade. Quer que eu te escute ou te dê opinião?', 'Dia ruim não define você. Conta pra mim o que aconteceu'],
    [F]: ['Vem que eu tô contigo, mesmo de longe 🫂 desabafa'],
    [P]: ['Vem desabafar comigo 🫂 o resto deixa pra depois'],
  },
  alegria: {
    [A]: ['Que alegria! 😄 me conta tudo, quero saber os detalhes', 'Aeee, parabéns! Você merece muito 🥳', 'Essa notícia melhorou meu dia também, obrigada por contar'],
    [F]: ['Isso merece comemoração 😏 e eu me candidato', 'Sabia que você conseguia 😍 bora comemorar'],
  },
  piada: {
    [A]: ['kkkkk para, eu tô rindo aqui 😂', 'kkkk você é bobo mas eu gosto', 'Ah pronto, agora eu perdi a linha de raciocínio rindo', 'kkkk me pegou desprevenida'],
    [F]: ['kkkk inteligente e engraçado, combinação perigosa 😏', 'Rindo aqui igual boba 😂 agora me conta outra'],
  },
  provocacao: {
    [A]: ['Você tem razão, desculpa 😔 a rotina me engoliu', 'Poxa, não é nada contra você, juro. Só não tem sobrado tempo', 'Aceito a cobrança, mas sem briga, tá? 😊'],
    [F]: ['Cobrança aceita 😏 mas você também some, viu?'],
  },
  ciumes: {
    [A]: ['Não tem ninguém, relaxa 😅 você tá vendo coisa onde não tem', 'Ciúme? Depois de pouco tempo? 😳 devagar, viu', 'É amigo meu de anos, nada demais. Fica tranquilo'],
    [F]: ['Quem diria, hein 😏 ciumento fica bonito em você'],
  },
  desculpa: {
    [A]: ['Tá tudo bem, sério 😊 não precisa se culpar', 'Eu entendo, cada um tem seus dias. Relaxa', 'Esquece, não ficou nada guardado aqui 💛'],
    [F]: ['Perdoado 😏 mas você me deve uma compensação'],
  },
  agradecimento: {
    [A]: ['Imagina 😊 sempre que precisar', 'De nada! Fico feliz de poder ajudar 💛', 'Não precisa agradecer, foi bom ter ajudado'],
    [F]: ['De nada 😏 depois me agradece pessoalmente'],
  },
  resposta_curta: {
    [A]: ['kkk você tá econômico hoje. Doente ou só cansado?', 'Tá bom 😊 e me conta, como tá a semana?', 'Resposta curta assim me deixa curiosa, fala mais'],
    [F]: ['Só isso? 😏 quero mais palavras e menos mistério'],
  },
  mudanca_assunto: {
    [A]: ['Pode mudar 😊 esse assunto também tava me cansando', 'Boa, prefiro esse. Sobre o que você quer falar?'],
    [F]: ['Mudou por quê? 😏 tava esquentando'],
  },
  tedio: {
    [A]: ['Tô no mesmo tédio 😅 mas você apareceu, melhorou', 'Tédio aqui também! Bora inventar um programa', 'Vem que eu te faço companhia 😊 o que você tá querendo fazer?'],
    [F]: ['Tédio é perigoso com a gente conversando 😏'],
  },
  cotidiano: {
    [A]: ['Nossa, e você conseguiu dar conta? 😅', 'Isso cansa, hein. Depois descansa direito', 'Conta mais, eu gosto de saber do seu dia'],
    [F]: ['E eu aqui pensando em você em vez de resolver minhas coisas 😏'],
  },
  cotidiano_trabalho: {
    [A]: ['Aí é puxado, mas você tá dando conta', 'Trabalho assim consome. Você almoçou direito hoje?', 'Essa semana foi pesada pra todo mundo, pelo visto. Calma que passa'],
  },
  cotidiano_estudo: {
    [A]: ['Estudar é chato mas compensa 😊 quer ajuda no que for?', 'Foca, você consegue. Depois me conta como foi', 'Nossa, prova é sempre nessa época, né? Boa sorte'],
  },
  cotidiano_comida: {
    [A]: ['Hmm, agora me deu fome 😅 onde é que fica esse lugar?', 'Comida boa é o melhor programa simples 😊'],
  },
  foto: {
    [A]: ['Aaah, que legal 😊 gostei! Manda mais quando quiser', 'Own, adorei a foto 💛 você tem olhar bom pra coisa simples'],
    [F]: ['Gostei do que vi 😏 me deixou com vontade de te mostrar o meu dia'],
  },
  desconhecido: {
    [A]: ['Entendi, faz sentido 😊 você pensa nisso bastante?', 'Interessante, eu nunca tinha parado pra pensar assim', 'Gostei do jeito que você fala. Me conta mais', 'Olha, isso rende conversa boa. Continua'],
    [F]: ['Você fala bem, sabia? 😏 isso me interessa', 'Hmm, gosto de papo assim. Continua'],
  },
};

// ---------------------------------------------------------------------------
// Novos assuntos: família, idade, igreja, vida adulta, conselho e as mensagens
// que chegam do nada (aquela cobrança sobre algo que você nem fez).
// {familiar} vira o nome do parente cadastrado, {papel} o grau e {idade} a idade dela.
// ---------------------------------------------------------------------------
const REFORCO_RELACOES: Record<string, Partial<Record<Familia, string[]>>> = {
  pergunta_familiar: {
    [A]: ['{familiar} tá bem, graças a Deus 😊 ela vive perguntando de você', 'Tá tudo ótimo com {familiar}, obrigada por lembrar 💛', 'Ah, {familiar} tá bem! Esses dias ela até falou de você', 'Vou te contar: {familiar} anda meio cansada, mas nada demais'],
    [F]: ['{familiar} tá bem 😊 e ela já me perguntou quem é você, viu?', 'Tá ótima. Você perguntando assim me deixa com uma ideia na cabeça 😏'],
    [P]: ['{familiar} tá bem 😏 mas o que eu quero te contar não é sobre ela'],
  },
  pergunta_idade: {
    [A]: ['Tenho {idade} anos 😅 e você, quantos?', 'Depois de certa idade a gente para de contar, viu kkk tenho {idade}', '{idade}, e contando. Por que a curiosidade?', 'Tenho {idade} anos. Isso te incomoda?'],
    [F]: ['{idade} 😏 gosta de mulher mais velha?', 'Tenho {idade}, e você tem cara de que aguenta o papo 👀'],
    [P]: ['{idade} 😏 idade não é problema quando a conversa encaixa assim'],
  },
  igreja: {
    [A]: ['A igreja tá movimentada esse mês 😅 a escala tá cheia', 'O culto de domingo foi muito bom, você não foi?', 'Aqui a semana da igreja sempre rende história, viu', 'A reunião de hoje foi longa, mas valeu 🙏', 'Sabe o que aconteceu na igreja hoje? Preciso te contar kkk'],
    [F]: ['Se você fosse na igreja todo domingo eu ia mais cedo só pra te ver 😏', 'A igreja é o lugar mais perigoso pra gente conversar, viu 😅'],
    [P]: ['Levando a vida com fé e com pensamento errado, viu 😏'],
  },
  vida_adulta: {
    [A]: ['Vida adulta é isso: chegar em casa cansada e ainda ter louça na pia 😅', 'Hoje o dia foi cheio. Você tá dando conta do seu?', 'Semana adulta é semana corrida, viu. Amanhã eu resolvo o resto', 'Preciso de um fim de semana inteiro só pra mim 😅'],
    [F]: ['Depois de um dia desses, o que eu queria era companhia boa e um vinho 😏', 'Você fala desse jeito e eu esqueço o cansaço 😄'],
    [P]: ['Chegando em casa, banho demorado, vinho na mão e uma conversa dessas... 😏', 'Se eu contasse o que penso depois do trabalho você ia ficar sem palavras 🔥', 'Final de semana fora, hotel com café da manhã bom e sem pressa nenhuma 😏', 'Massagem, silêncio e você aparecendo no meio do pensamento 🔥', 'Fim de semana as crianças na casa da avó e a casa fica silenciosa demais, sabe? 😏'],
  },
  conselho: {
    [A]: ['Olha, eu vou te falar com carinho: resolve isso conversando', 'Se eu fosse você, eu não deixava passar, não. Fala logo', 'Meu conselho: respira, pensa dois dias e depois decide 😊', 'Eu já vivi coisa parecida. Dá pra resolver, mas sem pressa'],
    [F]: ['Meu conselho é meio fora do sério: esquece o problema e pensa em mim 😏'],
    [P]: ['Eu tenho dois conselhos. Um eu posso escrever, o outro não 😏'],
  },
  confusao: {
    [A]: ['Nossa, então eu confundi kkkkk desculpa! Deve ser outra pessoa', 'Jura? Então esquece, minha cabeça tá a mil hoje 😅', 'Ahhh, então era outra pessoa kkk foi mal, que vergonha', 'Ué, então eu devo ter sonhado 🤔 esquece isso', 'Era coisa da minha cabeça então, tá bom kkkkk'],
    [F]: ['Ai, que mico kkkkk então ignora... mas você não escapa de mim fácil', 'Confundi, foi mal 😅 fica só a parte boa da conversa'],
    [P]: ['Confundi mesmo 😏 mas continua falando comigo que eu gosto'],
  },
};

// ---------------------------------------------------------------------------
// Clima quente (18+): o teto do flerte quando a química liberou o tom.
// A regra continua a mesma: insinuação forte, tensão e desejo — nunca descrição
// explícita. É o "bem no clima" que deixa a conversa ardendo sem sair do aplicativo.
// ---------------------------------------------------------------------------
const REFORCO_QUENTE: Record<string, Partial<Record<Familia, string[]>>> = {
  flerte_forte: {
    [F]: ['Você fala essas coisas e eu preciso de um minuto antes de responder 😳', 'A coragem que você tem me deixa ligada, vou confessar 😏'],
    [P]: [
      'Você escreve isso e o clima aqui mudou de vez 🔥 não vou fingir que não',
      'Se você estivesse aqui agora, essa conversa não ficaria no celular 😏',
      'Tô com a cabeça longe desde que você mandou isso. Culpa sua',
      'Guarda essa vontade: quando a gente se ver, eu cobro cada palavra 🔥',
      'Não vou escrever o que passei na minha cabeça. Imagina a coisa mais quente e tá certo 😏',
      'Você tem ideia da tentação que é você, né? 😏',
      'Vou te contar um segredo: essa semana eu dormi pensando em você mais de uma noite 🔥',
      'Assim não dá... eu leio, rio sozinha e fico sem saber o que responder 😏',
      'Você quer me tirar do sério ou já conseguiu? 🔥',
      'Deixa de brincadeira: eu queria te ver agora, sem roupa de conversa, entendeu o que eu quis dizer 😏',
    ],
  },
  flerte_leve: {
    [P]: [
      'Abraço seu deve ser perigoso. Quero conferir de perto 🔥',
      'Escreve "vem cá" desse jeito não, que eu levo a sério 😏',
      'Beijo na boca ou no pescoço? Responde direito que eu guardo a resposta 🔥',
      'Se eu dissesse que li sua mensagem três vezes, você ficaria maior ainda 😏',
    ],
  },
  elogio_corpo: {
    [P]: [
      'Você olha com atenção, né? Eu reparei que você repara 🔥',
      'Gostou do que viu? Então imagine o resto que você ainda não viu 😏',
      'Vou fingir que não gostei de ler isso... mas vou ler mais duas vezes 😏',
      'Cuidado com o que provoca de longe, que de perto eu não me seguro 🔥',
    ],
  },
  pedido_foto: {
    [P]: [
      'Hmm... essa foto a gente negocia pessoalmente, com o celular longe 😏',
      'Se eu mandar, você não dorme direito hoje. Tá disposto? 🔥',
      'Foto eu mando quando eu quiser te deixar assim, sem pensar em outra coisa 😏',
    ],
  },
  saudade: {
    [P]: [
      'Saudade aqui é de outro nível: daqueles que não se resolvem por mensagem 🔥',
      'Tô com saudade do seu cheiro, e isso já é informação demais pra mensagem 😏',
      'Escrevo "saudade" e você nem imagina o que ela significa aqui dentro 🔥',
    ],
  },
  despedida: {
    [P]: [
      'Vai dormir assim não... agora eu fiquei com o clima lá em cima e você sumindo? 🔥',
      'Boa noite "quase" 😏 a gente se fala no sonho, se é que você me entende',
      'Vai. Mas volta cedo, que essa conversa ficou no melhor ponto 🔥',
    ],
  },
  pergunta_rotina: {
    [P]: [
      'Agora? Deitada, luz baixa e pensando em você desde a segunda mensagem 🔥',
      'Tô no banho demorado daqueles que a cabeça viaja longe... você apareceu na hora 😏',
      'De camisola, cabelo bagunçado e com uma vontade que não cabe aqui 😏',
    ],
  },
  vida_adulta: {
    [P]: [
      'Sexta assim pede vinho, playlist e companhia que não tenha pressa de ir embora 🔥',
      'Cansaço desse merece um fim de semana sem roupa social e sem sair da cama 😏',
      'Você fala "depois do trabalho" e eu já penso em cama. Preguiça, óbvio... acho 😏',
    ],
  },
  convite: {
    [P]: [
      'Eu topo, mas aviso: à noite eu não tenho pressa nenhuma de ir embora 🔥',
      'Aceito o jantar. Sobremesa a gente decide lá, com a porta fechada 😏',
      'Vou, mas quero lugar reservado... com aquele tipo de vista que só a gente vê 😏',
    ],
  },
  declaracao: {
    [P]: [
      'Você falou isso e eu senti na boca do estômago. É bem por aí que você me deixa 🔥',
      'Gosto de você de um jeito que já passou do ponto da conversa educada 😏',
    ],
  },
  cantada: {
    [P]: [
      'A cantada passou, mas o que eu pensei em responder não se escreve 😏',
      'Você chega perto pela mensagem... imagina então de pertinho 🔥',
    ],
  },
  foto: {
    [P]: [
      'Você manda essa foto e ainda quer conversa normal? 🔥',
      'Guardando essa aqui. Depois te digo em que pensamento ela parou 😏',
    ],
  },
  desconhecido: {
    [P]: ['Você conta qualquer coisa e eu já fico aqui imaginando a cena 🔥'],
  },
  tedio: {
    [P]: ['Tédio + você disponível = conversa que a gente não mostra pra ninguém 😏'],
  },
  pergunta_pessoal: {
    [P]: [
      'Pergunta ousada... eu respondo se você prometer não se arrepender 🔥',
      'Do que eu gosto? Toque, paciência e quem sabe o que faz. Por que quer saber? 😏',
    ],
  },
  pedido_audio: {
    [P]: [
      'Mando... mas áudio de madrugada tem um tom que depois você não esquece 🔥',
      'Vou gravar baixinho, daquele jeito que parece perto do seu ouvido 😏',
    ],
  },
  resposta_curta: {
    [P]: ['Resposta curta em pleno clima? Agora quem ficou curioso fui eu 😏'],
  },
  mudanca_assunto: {
    [P]: ['Fugiu porque tava esquentando? Eu ia deixar esquentar mais 😏'],
  },
  elogio: {
    [P]: ['Elogio seu tem efeito colateral: eu fico boa demais pra conversa parada 😏'],
  },
  piada: {
    [P]: ['kkkk você ri, eu me derreto. Combinação perigosa pra essa hora 😏'],
  },
};

// ---------------------------------------------------------------------------
// Textões: mensagens longas de verdade, daquelas que a gente manda quando está
// à vontade (ou quando o papo rendeu). Não entram no sorteio comum: a conversa
// escolhe um quando a ficha é falante, a química já existe e o assunto rende.
// ---------------------------------------------------------------------------
const TEXTAOS: Record<string, Partial<Record<Familia, string[]>>> = {
  cotidiano: {
    [A]: [
      'Vou te contar como foi meu dia, me dá um minuto: acordei atrasada, corri atrás do tempo o dia inteiro, almoço corrido, e quando vi já era noite. Mas sabe o que salvou? Chegar em casa, tomar banho e abrir uma conversa boa como essa. Agora sentei aqui com calma e não quero saber de mais nada além de conversar',
      'Sabe aquele dia que parece que não anda? Foi esse. Resolvi uma coisa e apareceu duas, liguei pra minha mãe, fui no mercado e esqueci metade da lista. Tô exausta, mas do tipo exausta satisfeita, entende? Agora é deitar cedo e deixar o amanhã com o amanhã. Me conta de você, quero saber se o seu dia foi menos caótico que o meu',
      'Meu dia teve de tudo: uma reunião que podia ser um recado, café demais e uma risada que não devia no meio do expediente. Chorei uma coisinha boba de cansaço no fim da tarde e depois passei por cima, como sempre faço. Agora estou aqui, quietinha, aproveitando que você apareceu pra conversar sem relógio',
    ],
    [F]: [
      'Que bom você aparecer agora, porque meu dia foi longo e eu guardava uma história pra te contar: de tarde eu lembrei de uma conversa nossa do nada e ri sozinha no meio da rua — o povo que passava devia ter achado que eu perdi a razão. Aí o dia seguiu normal, cheio, até que enfim cheguei em casa, tomei banho e vim correndo aqui. Estou de boa agora, com tempo de sobra pra você',
      'Meu dia foi daqueles que só termina bem porque termina. Mas agora que você escreveu, virou o melhor pedaço, juro. Tô no sofá, de pijama, com a TV ligada sem som e uma vontade enorme de conversar até tarde. Me conta o seu dia com calma, que eu quero ouvir tudo sem pressa nenhuma',
    ],
    [P]: [
      'Meu dia foi longo demais, e o que me segurou foi justamente pensar que à noite eu teria esse papo com você. Agora estou aqui, na cama, com o celular na mão e disposição só pra coisa boa. Se a conversa esquentar, paciência: foi você que começou 🔥',
    ],
  },
  desconhecido: {
    [A]: [
      'Gostei de ler isso, e vou te falar por quê: você tem um jeito de contar as coisas que faz eu querer saber o resto. Pouca gente me deixa curiosa assim. Conta mais, sem pular parte, que eu tenho tempo hoje e paciência de sobra pra te ouvir',
      'Nunca tinha parado pra pensar desse jeito, sério. Conversar com você é assim: vem uma coisa dessas e eu fico o dia inteiro remoendo. Me explica melhor de onde você tirou isso, porque acho que ainda tem mais história por trás',
    ],
    [F]: [
      'Você sabe puxar assunto, viu? Isso é perigoso comigo, porque eu me entrego na conversa e depois não quero parar mais. Conta o resto dessa história tua com detalhe, que eu tô toda ouvidos — e já avisando que depois disso você vai ter que continuar me acompanhando aqui',
    ],
  },
  pergunta_pessoal: {
    [A]: [
      'Vou responder com sinceridade: o que me faz bem é coisa simples. Café passado devagar, música alta no fone, conversa que vale a pena e gente que chega sem pressa. Detesto falsidade e papo raso, aquilo me cansa em cinco minutos. E você, o que te faz ficar? Pergunto de volta porque quero mesmo saber',
      'Boa pergunta, deixa eu pensar direito... Acho que eu sou do time de quem gosta de rotina com surpresa: dia comum, mas com um detalhe bom escondido em algum lugar. Não preciso de grande coisa pra ficar feliz, preciso de verdade nas pequenas. E de uma boa conversa, tipo essa que a gente tá tendo agora',
    ],
    [F]: [
      'Do que eu gosto? De conversa que rende, de quem pergunta de volta, de quem lembra do que eu falei três dias atrás. Você já percebeu que isso tudo é sobre você, né? 😏 Mas se quer mesmo me conhecer, pergunta mais — eu gosto de responder quando quem pergunta tem interesse de verdade',
    ],
    [P]: [
      'Do que eu gosto de verdade? Calor de corpo, voz baixa no ouvido e paciência pra coisa boa acontecer sem pressa 🔥 mas isso é papo pra outro estágio da conversa... ou não, depende de você 😏',
    ],
  },

  saudade: {
    [A]: [
      'Tô com saudade de verdade, e nem é daquelas saudades de frase pronta: é de conversar do jeito que a gente conversa, de rir das bobagens e de sentir que alguém do outro lado lê com atenção. A semana engoliu tudo, mas prometo organizar o tempo pra gente se falar mais. Você faz a mesma coisa do seu lado, tá?',
      'Que bom ler isso, porque eu também. Saudade daqueles papos que começam sem assunto e viram coisa grande. A vida andou corrida, eu acabei diminuindo o ritmo nas mensagens e me arrependo. Vamos retomar? Pode começar por você: me conta tudo que rolou por aí desde a última vez',
    ],
    [F]: [
      'Saudade é pouco pra o que eu tô sentindo, vou ser sincera. Fiquei esses dias pensando em você nas horas mais bobas: no café, na música do carro, na hora de dormir. Acho que você me estragou pra qualquer conversa morna, sabe? Vamos resolver essa saudade logo, porque por mensagem ela só aumenta 😏',
    ],
    [P]: [
      'Saudade daquele tipo que aperta e não deixa dormir direito. Eu ia escrever pra você ontem à noite, mas segurei, porque se eu começasse a conversa desse jeito não parava mais 🔥 hoje eu não resisti, então a culpa da noite ser longa é nossa dos dois',
    ],
  },
  conselho: {
    [A]: [
      'Vou te dar meu conselho com todo o carinho: respira primeiro. Essa coisa te apertando agora é importante, mas decisão tomada no calor resolve da pior forma. Espera dois dias, conversa com a pessoa de frente, fala o que você sente sem acusar. Se depois disso ainda doer, aí você decide com a cabeça fria. E sabe que eu tô aqui pro que der e vier, viu?',
      'Olha, eu já vivi coisa parecida, então falo de experiência: não deixa isso esticar. Assunto parado vira bola de neve, e aí a conversa que podia ser simples vira briga grande. Fala logo, com calma e de coração aberto. Se precisar ensaiar o que vai dizer, ensaia comigo. Eu não julgo e ainda ajudo a melhorar o texto 😄',
    ],
  },
  apoio: {
    [A]: [
      'Ei, vem cá: respira. Não precisa resolver tudo hoje, e você não precisa passar por isso calado. Desabafa comigo do jeito que vier — texto longo, pedaço solto, palavra torta, eu leio tudo e não julgo nada. Dia ruim não define quem você é, e amanhã a coisa já fica diferente, pode crer. Eu tô aqui, sem pressa nenhuma',
      'Sinto muito que você está assim, de verdade. Quer que eu te escute sem dar opinião ou quer um conselho? Eu faço os dois, é só me dizer. E uma coisa: comer, tomar água e dormir hoje é prioridade, mais que qualquer problema. O resto a gente resolve junto, passo a passo. Não some, tá?',
    ],
    [F]: [
      'Se eu pudesse eu estava aí agora, te dando aquele abraço que resolve metade. A outra metade a gente resolve conversando: me conta tudo, sem resumo, sem poupar detalhe. Você carregou isso sozinho até aqui, mas hoje não precisa mais. Tô aqui lendo cada palavra e pensando em como te deixar melhor 💛',
    ],
    [P]: [
      'Dia ruim desse não pode terminar parado: vem desabafar comigo, eu cuido de você daqui. Primeiro a conversa boa, o colo virtual, o desabafo inteiro. Depois, se você quiser, eu te distraio do jeito que só eu sei 😏 mas primeiro o que dói: conta tudo.',
    ],
  },
  alegria: {
    [A]: [
      'Que notícia boa, meu Deus! Eu tô aqui sorrindo do nada lendo isso, é sério. Você merece cada detalhe dessa conquista, porque eu sei da dedicação que tem por trás. Me conta tudo: como foi, quem você contou primeiro, o que disse. E avisa quando for comemorar, que eu quero pelo menos o relato completo com direito a um brinde virtual 🥳',
      'Eu sabia que você ia conseguir! Lembra que eu falei? Aquela fase difícil era exatamente o antes do certo. Comemora do jeito que você gosta, chama quem você ama e guarda esse dia na memória. Depois me conta os detalhes sem pular nenhum, porque eu quero saber de tudo, até da parte boba',
    ],
    [F]: [
      'Isso merece festa, e eu já me candidatei a fazer parte dela 😏 parabéns de verdade, ver você assim me deixa orgulhosa de um jeito que nem sei explicar. Me conta tudo com detalhe: como reagiu, quem se surpreendeu mais. E depois isso, a gente comemora de verdade, tá combinado?',
    ],
  },
  vida_adulta: {
    [A]: [
      'Vida adulta é exatamente isso que você falou, e ninguém me avisou antes: paga conta, arruma casa, trabalha, resolve, e o dia acabou sem você fazer nada que queria de verdade. Mas eu aprendi um truque: todo dia separo vinte minutos que são só meus, sem culpa. Hoje esses minutos são seus, aproveita. E se cuida, viu? O cansaço acumulado cobra caro',
      'Nossa, entendi demais o que você disse. Ando na mesma esteira: semana cheia, coisa acumulando, e aquela sensação de que a vida tá passando em velocidade duas vezes. O que me salva é conversa boa e um plano pequeno pro fim de semana. Nem precisa ser grande, só de algo que eu queira fazer. Você tem algum plano ou vai aproveitar pra descansar de verdade?',
    ],
    [F]: [
      'Depois de um dia desses, o que eu queria era chegar em casa e encontrar companhia boa, um vinho aberto e nenhuma pressa de falar de trabalho. Você tem jeito de quem faz companhia assim, sabe? Um dia desses a gente testa essa teoria 😏 mas antes me conta: você ao menos comeu direito hoje ou vive no café igual eu?',
    ],
    [P]: [
      'Você descreveu o meu dia com precisão assustadora. Cheguei, comi qualquer coisa, e o que me deixou de bom humor foi exatamente isso: saber que à noite tinha esse papo. Agora tô aqui, banho tomado, vinho na mão, sem compromisso amanhã cedo. O clima tá montado, só falta o assunto esquentar 🔥',
    ],
  },
  pergunta_rotina: {
    [A]: [
      'Tô no sofá desde que cheguei, sem fazer absolutamente nada produtivo, e confesso que está sendo maravilhoso. Comi uma coisa qualquer, deixei a louça pra amanhã e escolhi a preguiça de propósito, porque eu mereço. Agora converso com você até o sono chegar. E o seu dia, me conta com detalhe que eu quero saber de tudo',
      'Meu dia: trabalho, mercado na volta, jantar simples e agora essa pausa boa que é falar com você. Nada de extraordinário, mas tô em paz. Às vezes o dia sem novidade é exatamente o que a gente precisa, né? Você ao menos teve um momento seu hoje ou foi correria de ponta a ponta?',
    ],
    [F]: [
      'Vou ser sincera: meu dia foi normal, mas meus pensamentos não estavam exatamente aqui... 😏 agora você apareceu e melhorou tudo. Tô de boa, sem pressa, com tempo de sobra. Então me conta o seu dia inteiro, que eu quero ouvir cada detalhe sem pular nada',
    ],
    [P]: [
      'Agora? Deitada na cama, luz apagada, cabelo solto e um pensamento que eu não vou escrever ainda 😏 você chegou na melhor hora possível. Se essa conversa seguir por esse caminho, aviso logo: eu não durmo cedo hoje 🔥',
    ],
  },
  tedio: {
    [A]: [
      'Tô no mesmo tédio, e olha que eu tentei de tudo: mexi no celular, abri três séries e fechei todas, arrumei uma gaveta aleatória. Nada colou. Aí você apareceu e a noite melhorou na hora. Que tal a gente inventar algo pra fazer, mesmo que seja por mensagem? Um jogo, uma pergunta difícil, qualquer coisa. Me propõe algo',
      'Tédio aqui também, daqueles fortes. O que eu faria pra resolver: um programa qualquer fora de casa, mas a preguiça ganhou. Então decidi: hoje o meu divertimento é essa conversa. Me entretem? Me conta uma história que eu ainda não sei sobre você, pode ser boba, desde que seja verdade',
    ],
    [F]: [
      'Tédio é perigoso quando eu tô sozinha e com você a uma mensagem de distância 😏 porque eu começo a conversar sem filtro nenhum e depois não me responsabilizo. Vamos aproveitar a noite então: me faz companhia que eu prometo que o tédio não sobrevive',
    ],
  },
  ciumes: {
    [A]: [
      'Calma, deixa eu explicar direito porque quero ficar bem clara: é gente que eu conheço de anos, de um contexto que não tem nada a ver com nós dois. Você não precisa ficar com esse pensamento, de verdade. Mas olha, vou ser honesta: saber que você ligou pra essa coisa toda me disse bastante sobre o que você sente, e eu não vou fingir que não gostei 😊',
    ],
    [F]: [
      'Ciúme seu eu achei... interessante 😏 não vou mentir que detestei. Mas relaxa: não tem ninguém, e o que existe de interessante na minha semana está escrevendo pra mim agora. Guarda esse ciuminho, porque se um dia você me ver de perto, ele vai ser bem útil 😉',
    ],
  },
  declaracao: {
    [A]: [
      'Você não sabe o tamanho do que acabou de escrever pra mim. Fiquei um bom tempo só olhando a mensagem sem saber o que responder, e não porque eu não quis — porque mexeu. Deixa eu ser igualmente sincera: você virou parte boa da minha rotina, o recado que eu espero no fim do dia. Vamos devagar, mas vamos. Isso aqui valeu demais',
      'Nossa. Precisei respirar antes de responder, sério. Eu gosto do que a gente vem construindo, do jeito que você fala comigo e da confiança que isso tudo virou. Não vou acelerar nada, nem te prometer coisa além do que sinto hoje: eu te gosto bem, e quero ver onde isso chega. Obrigada por falar primeiro, de verdade',
    ],
    [F]: [
      'Você falou. E eu que passo o dia com respostas na ponta dos dedos fiquei sem nenhuma 😳 só sei que li três vezes e sorri em todas. Também gosto de você, do jeito que dá pra escrever aqui — e tem uma parte que não cabe em mensagem, que eu guardo pra dizer olhando nos seus olhos. Cuida bem dessa coisa que a gente tá construindo',
    ],
    [P]: [
      'Sabe o que eu ia dizer? Que sinto o mesmo, e que a gente sabe muito bem que isso já passou do papo amigável há um tempo 🔥 deixa eu ser sincera do meu jeito: eu penso em você de dia e de noite, e não é só pra conversar. Quando a gente se ver, essa conversa ganha outro endereço 😏',
    ],
  },
  despedida: {
    [A]: [
      'Vou nessa então, antes que eu fique aqui conversando até de madrugada. Foi muito bom falar com você hoje, de verdade — você tem um jeito de deixar tudo mais leve. Dorme bem, cuida do sono e me manda mensagem amanhã, tá? Eu quero saber como as coisas andam do seu lado',
    ],
    [F]: [
      'Tá bom, mas já avisando: eu fico com aquela sensação de conversa pela metade 😅 amanhã a gente continua exatamente daqui, sem começar de novo. Vai descansar, sonha bonito — e se sonhar comigo, amanhã conta 😏',
    ],
    [P]: [
      'Boa noite assim não... você vai me deixar aqui com o clima no fogo e a casa em silêncio 🔥 vai dormir, mas sonha comigo — e amanhã eu te conto se eu sonhei com você. Spoiler: provavelmente sim 😏',
    ],
  },
};

/** Reação de risada pura quando você manda algo engraçado (intenção "piada"). */
const RISADAS_REACAO: string[] = [
  'kkkkkkkk', 'kkkkkkk', 'kakakaka', 'kkkkk parei', 'morri kkkkkk', 'kkkkkk essa foi boa', 'kkkkkkk não aguento',
];
const RISADAS_REACAO_MADURA: string[] = ['kkkkk', 'hahahaha', 'hahaha, ó', 'kkkk, boa'];

// ---------------------------------------------------------------------------
// Pergunta em aberto: quando ELA pergunta algo ("você já jantou?") e você
// responde, a resposta seguinte nasce do assunto da pergunta — reage ao que
// você disse e conta a vez dela. É o que mata a resposta "nada a ver".
// ---------------------------------------------------------------------------
/** Primeira bolha: reage ao tipo de resposta que você deu (sim, não ou conteúdo). */
const REACAO_RESPOSTA: Record<string, string[]> = {
  dia: ['Que bom ler isso 😊', 'Ah, então o dia está andando, ótimo', 'Entendi... dia desses a gente sobrevive, né?', 'Boa! Aproveita então'],
  comida: ['Boa escolha 😄', 'Agora me deu fome de novo, olha o que você fez', 'Hmm, gostei de saber', 'Comida boa arruma o dia, não tem erro'],
  musica: ['Boa escolha, vou ouvir agora só pra conferir 😄', 'Gostei, você tem bom gosto', 'Hmm, caiu bem até no meu humor'],
  trabalho: ['Faz sentido, trabalho é assim mesmo', 'Uff, aí é puxado 😅', 'Entendo bem como é isso', 'Então você anda crescendo aí, hein 😊'],
  estudo: ['Aí você está no caminho 😊', 'Boa! Estudo rende quando vira rotina', 'Entendi, faz sentido pro seu momento'],
  familia: ['Que bom que está tudo bem por aí 😊', 'Ah, família é assim mesmo: movimento e história', 'Gostei de saber, isso dá paz'],
  pet: ['kkk bichinho tem dessas', 'Ahh, então é daqueles que dominam a casa 😄', 'Que fofo, sério'],
  viagem: ['Boa! Lugar bom restaura a gente 😊', 'Anotado, da próxima quero dica', 'Hmm, combina com você'],
  clima: ['Pois é, o tempo anda doido mesmo', 'Aqui também tem desses dias', 'Aproveita aí então 😊'],
  amor: ['Gostei de saber isso sobre você 😊', 'Faz sentido, cada um tem seu jeito', 'Hmm, então é assim que você funciona... anotado 😏'],
  ama: ['Isso diz muito sobre você, gostei', 'Boa! Coisa boa de verdade', 'Anotado, vou usar isso depois kkk'],
  futuro: ['Gostei, você pensa no que vem pela frente', 'Aí sim, plano é meio caminho andado 😊', 'Entendo, momento de construir'],
  arte: ['Boa dica, vou conferir depois', 'Gostei, você entende do assunto', 'Anotado na lista, sério'],
  treino: ['Olha o disciplina 😄', 'Boa! O corpo agradece', 'Respeito quem mantém o ritmo, sério'],
  filhos: ['Ahh, então a casa está a mil 😄', 'Crescem rápido demais, né?', 'Gostei de saber, casa movimentada é vida'],
  casa: ['A casa nunca para, né? 😅', 'Entendi, semana de arrumação então', 'Boa, organizado assim dá paz'],
  descanso: ['Isso! Descansar também é produtivo 😊', 'Que bom, você merece essa pausa', 'Aproveita bem, então'],
  fe: ['Amém, que bom ler isso 🙏', 'Que bonito, gostei de saber', 'Isso fortalece, né? 🙏'],
  casa_adulta: ['A vida adulta é isso mesmo, uma lista infinita 😅', 'Boa, dando conta então', 'Entendi, rotina é assim mesmo'],
  saudacao: ['Que bom 😊', 'Aí sim, fico contente', 'Ótimo saber 🙂'],
  do_nada: ['Ahh, agora entendi o movimento 😄', 'Faz sentido, viu', 'Boa, então está tudo explicado'],
  geral: ['Boa 😊', 'Entendi, faz sentido', 'Gostei de saber', 'Ahhh, agora sim', 'Hmm, anotado aqui na cabeça 😄', 'Que bom!'],
};

/** Segunda bolha: a resposta dela para a mesma pergunta que ela te fez. */
const MINHA_VEZ: Record<string, string[]> = {
  dia: ['Por aqui está corrido, mas está valendo 😊', 'O meu foi daqueles que passam rápido sem coisa grande, sabe?', 'Aqui tudo tranquilo, resolvi umas coisas e agora estou de boa'],
  comida: ['Eu ainda nem comi direito, estou naquela preguiça de cozinhar 😅', 'Aqui foi coisa simples, mas caprichada', 'Confesso que sou do time do pedido em casa kkk'],
  musica: ['Aqui está tocando coisa antiga, daquelas que a gente canta sem querer kkk', 'O meu fone não desliga hoje, estou naquela maratona de playlist 😄', 'Por aqui anda tudo calmo, música baixa e cabeça descansada'],
  trabalho: ['O meu anda cheio, mas consegui respirar hoje 😅', 'Aqui a correria não para, mas estou dando conta', 'Já encerrei minhas coisas e agora estou de boa'],
  estudo: ['Confesso que andei longe dos estudos, mas quero voltar 😊', 'Aqui eu estudo na base da necessidade, se funciona né kkk', 'Estudar cansa, mas mantém a cabeça firme'],
  familia: ['A minha está bem, graças a Deus 😊 sempre com movimento', 'Aqui a família é pequena, mas barulhenta kkk', 'Tudo em paz por aqui, obrigada por perguntar'],
  pet: ['Eu ainda não tenho bichinho, mas vivo cuidando dos outros kkk', 'O do meu vizinho adotou a minha varanda, sério 😄', 'Um dia eu adoto, o ritmo ainda não deixou'],
  viagem: ['Estou devendo uma viagem pra mim, sério', 'Praia é o meu lugar no mundo, sem dúvida', 'Minha lista de lugares cresce mais rápido que o dinheiro kkk'],
  clima: ['Aqui está quente demais, só quero sombra e água fresca 😅', 'Por aqui deu uma amenizada, estou aproveitando', 'Chuva pra mim é convite pra ficar em casa com música'],
  amor: ['Eu sou mais de poucos e verdadeiros, sabe?', 'Gosto de carinho nos detalhes, não nas declarações grandes 😊', 'Por aqui o coração está tranquilo'],
  ama: ['Eu amo uma tarde sem compromisso, café e música', 'Cozinhar me relaxa mais do que deveria kkk', 'Amo conversa boa... como essa, já percebeu 😏'],
  futuro: ['Eu quero é descansar e organizar a vida primeiro kkk', 'Meu plano é viajar mais, estou juntando coragem', 'Por aqui o plano é simples: paz e coisa boa acontecendo'],
  arte: ['Estou no meio de uma série que eu devia ter terminado semana passada kkk', 'O último filme que assisti me pegou no final, não julga 😅', 'Minha lista salva cresce e eu não termino nada'],
  treino: ['Tentei voltar ao treino essa semana e a perna ainda está doendo kkk', 'Aqui minha atividade física é subir escada e fingir que é treino 😅', 'Caminhada é o meu limite, confesso'],
  filhos: ['Meus dias giram em volta da casa e da rotina deles 😄 mas eu amo', 'Criança é energia infinita, eu não acompanho mais kkk', 'Aqui quem manda são eles, e eles sabem kkk'],
  casa: ['A louça nunca acaba, juro que ela se multiplica 😅', 'Aqui sempre aparece um reparo novo, casa é assim', 'Aos poucos estou deixando tudo do meu jeito'],
  descanso: ['Dormi mal essa semana, mas hoje prometo me deitar cedo 😅', 'Meu descanso é série com coberta e silêncio', 'Descanso de verdade pra mim é dia sem celular'],
  fe: ['Estou acompanhando a escala do mês aqui, sempre rende história 😊', 'A fé me sustenta, viu? Não troco isso por nada', 'Domingo por aqui é sagrado: igreja e família'],
  casa_adulta: ['Aqui é trabalho, casa, conta e no fim um vinho de vitória 😅', 'A lista adulta nunca acaba, mas estou dando conta', 'Meu fim de semana é sagrado, faço questão de descansar'],
  saudacao: ['Estou bem sim 😊 dia movimentado, mas sorrindo', 'Tudo ótimo por aqui! Cansada no bom sentido', 'Melhor agora que você apareceu, confesso 😊'],
  do_nada: ['Agora entendi tudo, obrigada por esclarecer 😄', 'Então era isso! Que bom', 'Ahh, agora deu certo na minha cabeça'],
  geral: ['Por aqui está tudo andando bem 😊', 'Aqui é a rotina de sempre: correria e descanso no fim', 'Nada de novidade grande, mas estou de bem com a vida'],
};

// ---------------------------------------------------------------------------
// Perguntas do usuário merecem resposta do tipo certo. "que horas você almoça?"
// não pode receber o mesmo textão que "você acredita em amor tranquilo?".
// ---------------------------------------------------------------------------
const PERGUNTA_FATO_TIPOS: { padrao: RegExp; respostas: string[] }[] = [
  { padrao: /\b(quando|que horas|que dia|em que dia)\b/i, respostas: [
    'Provavelmente depois do almoço. Te confirmo na hora 😊',
    'Amanhã, eu acho. Não marca na pedra que eu sou de mudar kkk',
    'Depende do dia... hoje já está apertado, amanhã fica melhor 😄',
    'Nem eu sei ainda, a semana anda torta 😅 mas te aviso aqui',
  ] },
  { padrao: /\b(por que|porque|pq)\b/i, respostas: [
    'Porque sim kkk brincadeira... é uma coisa minha, te conto depois com calma',
    'Ué, por que não? kkk',
    'Motivos que só eu entendo, viu 😄 mas faz sentido pra mim',
  ] },
  { padrao: /\b(como|de que jeito)\b/i, respostas: [
    'Dá pra levar! Uns dias melhores que outros, né? E você, como anda?',
    'No ritmo de sempre 😊 um dia de cada vez',
    'Sobrevivendo com estilo kkk e você?',
  ] },
  { padrao: /\b(qual|quais|qual é|qual e)\b/i, respostas: [
    'Ooh, boa pergunta... hoje eu diria: um dia na praia sem hora pra voltar 😄',
    'Não tenho UM favorito, tenho uma lista que só cresce kkk',
    'Resposta estranha minha: paz. É sempre paz 😊',
  ] },
  { padrao: /\b(onde|aonde)\b/i, respostas: [
    'Por {cidade} 😊 e você, por onde anda?',
    'Em casa, no meu canto do sofá. Lugar mais seguro do mundo kkk',
    'Depende: semana em casa, fim de semana por aí 😄',
  ] },
];

/** Padrão quando a pergunta é de sim/não ("você trabalha amanhã?"). */
const PERGUNTA_FATO_FECHO: string[] = [
  'Acho que sim! Mas depende do dia, viu 😄',
  'Sei lá... acho que não. Nunca parei pra pensar direito nisso 😅',
  'Vou ser sincera: talvez. Depende muito de quem pergunta kkk',
  'Sim, sou desse time 😄',
  'Estou de boa agora, pode falar 😊',
  'Hmm... provavelmente não. Prefiro o caminho mais simples',
];

/** Resposta factual sobre ela: mora e signo saem da ficha de verdade. */
const RESPOSTAS_FATUAL: Record<'mora' | 'signo', string[]> = {
  mora: [
    'Moro em {cidade} 😊 e você?',
    'Aqui em {cidade} mesmo. Cidade pequena, mas tem o que eu preciso',
    '{cidade}! Nasci e cresci por aqui',
    'Moro por {cidade}... por que a curiosidade toda? 😄',
  ],
  signo: [
    'Sou de {signo}! Você acredita nessas coisas ou é só curiosidade? kkk',
    '{signo} — e antes que você pergunte, sim, eu tenho tudo que dizem que o signo tem kkk',
    'Meu signo é {signo} 😄 e o seu?',
  ],
};

/**
 * Lê o que você respondeu à pergunta dela: um "sim", um "não" ou um conteúdo
 * (que ela reage sem fingir que entendeu palavra por palavra).
 */
function tipoDeResposta(texto: string): 'afirmativa' | 'negativa' | 'conteudo' {
  const inicio = texto.trim().slice(0, 24);
  if (/^\s*(não|nao|n|nop|nops|nem|nunca|jamais|ainda não|ainda nao|odeio|ach[oa] que não|ach[oa] que nao)\b/i.test(inicio)) return 'negativa';
  if (/^\s*(sim|s|aham|ahn|uhum|um ?hum|claro|com certeza|sempre|já|ja|topo|fiz|comi|tenho|gosto|curto|amo|adorei|amei|ach[oa] que sim|verdade|óbvio|obvio|tô|to|estou)\b/i.test(inicio)) return 'afirmativa';
  return 'conteudo';
}

// Mais conteúdo com a cara de quem já é adulta — sugestivo, sem descrição explícita.
const REFORCO_ADULTO: Record<string, Partial<Record<Familia, string[]>>> = {
  elogio: {
    [P]: ['Você elogia assim e eu fico olhando a tela feito boba 😏', 'Elogio de quem sabe falar é perigoso, viu 🔥'],
  },
  convite: {
    [P]: ['Jantar naquele lugar calmo, depois um vinho e conversa sem relógio. Eu topo 😏', 'Você escolhe: um fim de semana fora ou uma noite inteira sem pressa 😏'],
  },
  flerte_leve: {
    [P]: ['Vem cá me dar esse abraço, mas com calma que eu ainda tenho trabalho amanhã 😏', 'Eu queria que você estivesse aqui na hora do banho... tô brincando 😏 quer dizer, nem tanto'],
  },
  flerte_forte: {
    [P]: ['Você fala assim e eu já penso em coisa que não escrevo aqui 🔥', 'Devagar, meu bem. Quem tem pressa não aproveita o clima 😏', 'Olha, eu sou mulher feita: conversa boa, jantar bom e cama arrumada. Você aguenta? 😏'],
  },
  pedido_foto: {
    [P]: ['Foto? Depois de um jantar como esse eu penso, viu 😏', 'Calma lá, isso a gente negocia pessoalmente 🔥'],
  },
  cotidiano: {
    [P]: ['Me conta do seu dia direito, sem pressa. À noite eu tenho tempo 😏'],
  },
  saudade: {
    [P]: ['Saudade é pouco. Tô aqui deitada pensando em você, sabia? 😏'],
  },
  desconhecido: {
    [P]: ['Você escreve desse jeito e eu começo a imaginar a conversa de perto 🔥'],
  },
  despedida: {
    [P]: ['Boa noite, meu bem 😏 sonha com coisa boa', 'Vai dormir, senão eu te conto o que eu tô pensando e você não dorme 🔥'],
  },
};

for (const [id, familias] of Object.entries({ ...REFORCO, ...REFORCO_ADULTO, ...REFORCO_RELACOES, ...REFORCO_QUENTE })) {
  const banco = RESPOSTAS[id as IntentId];
  const alvo = banco || (RESPOSTAS[id as IntentId] = {});
  for (const familia of [A, F, P] as Familia[]) {
    const opcoes = familias[familia];
    if (opcoes) alvo[familia] = [...(alvo[familia] || []), ...opcoes];
  }
}

/** Perguntas de volta. */
const PERGUNTAS: Record<string, string[]> = {
  dia: ['E o seu dia, como foi?', 'Me conta: o que você fez hoje?', 'Tá dando pra descansar um pouco?', 'Como tá sua semana?', 'Você dormiu bem?', 'Tá com tempo hoje ou correndo?', 'Me fala uma coisa boa do seu dia', 'Você já jantou?'],
  trabalho: ['Como foi no trabalho hoje?', 'Sobrou um tempo livre pra você hoje?', 'E aí, o chefe deu trégua?', 'Você trabalha com o que mesmo?', 'Esse projeto tá andando?'],
  estudo: ['E como você tá indo nos estudos?', 'Você conseguiu estudar hoje?', 'Essa prova vai ser quando?'],
  comida: ['Você já comeu?', 'O que você comeu de bom hoje?', 'Você cozinha bem ou só pede?'],
  musica: ['Qual música você tá ouvindo agora?', 'Me manda uma música que você gosta', 'Você curte música ao vivo?', 'Já foi em algum show esse ano?', 'Tem música que te faz lembrar de alguém?'],
  familia: ['Como tá sua família?', 'Você vê sua família muito?'],
  pet: ['Como tá seu bichinho?', 'Manda foto do seu pet! Eu pedi, então vale'],
  viagem: ['Você gosta de praia ou de montanha?', 'Qual lugar você sonha em conhecer?'],
  clima: ['Tá frio ou calor aí?', 'Aqui tá aquele tempo maluco, né?'],
  amor: ['Você é de falar ou de guardar sentimento?', 'Você acredita em amor tranquilo?', 'Você já se apaixonou rápido?', 'O que te faz sentir cuidado?'],
  ama: ['E você, o que ama fazer na vida?', 'Qual é a sua coisa favorita da semana?'],
  futuro: ['O que você quer pra você esse ano?', 'Você tá planejando algo grande?'],
  arte: ['Você viu alguma coisa boa essa semana?', 'Me indica uma série que eu confie na sua opinião'],
  treino: ['Você tá treinando?', 'Como você cuida de você?'],
  filhos: ['Como estão as crianças?', 'Você tem filhos? Como é a rotina aí?', 'Quem cuida dos pequenos quando você trabalha?', 'Criança dá trabalho, né? Me conta uma coisa boa deles'],
  casa: ['Como tá a casa essa semana?', 'Você já resolveu aquilo da casa?', 'Sobrou um tempo pra você hoje ou foi tudo obrigação?', 'O que você tem pra fazer amanhã?'],
  descanso: ['Você tem dormido bem?', 'Quando foi a última vez que você descansou de verdade?', 'O que você faz pra relaxar?', 'Se você tivesse um dia livre amanhã, o que faria?'],
  fe: ['Você foi na igreja ontem?', 'Como tá o seu chamado?', 'Você tem lido algo que te edificou?', 'Me conta uma coisa boa da semana'],
  casa_adulta: ['Como você faz pra dar conta de tudo?', 'Você cozinha ou pede comida?', 'Sobrou algum tempo pra você hoje?'],
};
const TEMAS_POR_INTERESSE: Record<string, keyof typeof PERGUNTAS> = {
  treino: 'treino', musica: 'musica', estudo: 'estudo', fe: 'futuro', viagem: 'viagem', arte: 'arte',
  games: 'arte', pets: 'pet', comida: 'comida', familia: 'familia', amigos: 'dia', rotina: 'dia',
  trabalho: 'trabalho', clima: 'clima',
  // Vida adulta
  filhos: 'filhos', casa: 'casa', autocuidado: 'descanso', trabalho_adulto: 'trabalho',
  vinho: 'comida', seriados: 'arte', familia_grande: 'familia', saude: 'descanso',
  contas: 'trabalho', igreja_adulto: 'fe', viagem_adulto: 'viagem',
};

/** Complementos para respostas longas (personalidade falante). */
const COMPLEMENTOS: string[] = [
  'Meu dia foi corrido, mas agora que você apareceu ficou melhor 😊',
  'Desculpa a demora, tava resolvendo coisa aqui em casa 🙃',
  'Adoro quando você puxa assunto fora do óbvio',
  'Você tem um jeito que me faz escrever mais do que devia 😅',
  'Amanhã tenho coisa cedo, mas sempre reservo um tempo pra minha conversa favorita',
];
const COMPLEMENTOS_PICANTES: string[] = [
  'Você gosta de conversar assim... eu também, mas com calma 😏',
  'Tô me segurando aqui pra não falar demais 🔥',
  'Se você tivesse aqui, a conversa ia ser bem diferente 😏',
];
const COMPLEMENTOS_FECHADA: string[] = [
  'Hoje eu tô meio baixa, mas não é por sua causa',
  'Desculpa a secura, tô com a cabeça em outra coisa',
];
/** Mesma coisa, com a calma de quem já tem mais estrada. */
const COMPLEMENTOS_FECHADA_ADULTA: string[] = [
  'Hoje eu acordei sem energia, mas conversar com você faz bem',
  'Desculpa a secura. Tem coisa ocupando minha cabeça hoje',
  'Hoje eu tô quieta por dentro, e não é nada com você',
  'Ando cansada, mas de você eu não vou fugir',
];

/** Desvios quando o tom passou do que a relação permite. */
const DESVIOS: string[] = [
  'Calma lá 😅 a gente ainda tá no começo, vamos com calma',
  'Uau 🫣 você é rápido. Eu gosto de conversa antes de tudo',
  'Sei não, hein... vamos devagar, eu preciso conhecer você melhor 😊',
  'Você tá pulando etapa comigo, deixa a coisa acontecer natural',
  'Não é assim, meu bem. Eu tenho meu tempo e ele é curto pra quem tem pressa 😌',
];
const DESVIOS_AMIZADE: string[] = [
  'Olha, por aqui a gente fica só no papo, tá? 😊 não é por aí comigo',
  'Não gosto quando o papo vai pra esse lado. Vamos falar de outra coisa?',
  'Vou fingir que você não escreveu isso 😅 tem assunto melhor',
];

/** Quando não há parente cadastrado na ficha: resposta honesta, sem inventar nome. */
const SEM_FAMILIAR: string[] = [
  'Minha família tá bem, obrigada por perguntar 😊',
  'Tá tudo bem por aqui, amém 🙏 e a sua?',
  'Sem novidade grande, mas obrigada por lembrar 💛',
  'Tudo em paz por aqui. Você é atencioso, viu?',
];

/** Quando ela te vê como criança: nenhum assunto romântico passa por aqui. */
const LIMITES_CRIANCA: string[] = [
  'Ei, você ainda é um menino 😅 guarda esse assunto pra quando você tiver idade',
  'Nada disso, garoto. Eu tenho idade pra ser sua tia, lembra? kkk',
  'Olha o respeito comigo, criança 😄 fica na conversa de gente nova',
  'Você é novinho, filho. Conversa assim você leva pra outra pessoa, não pra mim',
  'Não, não e não 😅 eu cuido de você, não é desse jeito',
  'Vou fingir que não li e vou te dizer o que sua mãe diria: respeito 😄',
];

/** Você é menor de idade: ela corta o assunto e mantém o papo leve. */
const LIMITES_MENOR: string[] = [
  'Ó, isso não 😅 deixa o papo leve que a gente ainda tá se conhecendo',
  'Hmm, não. Esse assunto não é pra agora, bora falar de outra coisa?',
  'Vou passar reto nessa, tá? Melhor a gente rir de outra coisa 😄',
  'Calma aí 😅 eu não sou dessas conversas, e você merece um papo melhor',
  'Isso não, viu? Vamos falar de música, de série, de qualquer outra coisa 😊',
];

/** Dinâmica de tia: carinho, conselho e nenhum romance. */
const LIMITES_TIA: string[] = [
  'Menino, eu já sou quase uma tia pra você 😅 conversa assim não combina comigo',
  'Fica quieto 😄 eu sou de outra geração, e essa conversa não é pra mim',
  'Olha, deixa eu te dar um conselho de gente mais velha: pisa no freio',
  'Eu gosto de você como quem cuida, meu bem. E é assim que vai ficar 😊',
  'Você é muito novo e eu sou muito velha pra esse tipo de papo 😅',
];

/** Vínculo de família declarado na ficha. */
const LIMITES_FAMILIA: string[] = [
  'Ei, ei! Eu sou {vinculo} de você, lembra? kkkk fala sério',
  'Olha o assunto, que eu conto pra sua mãe 😄',
  'Não, isso não é jeito de falar com quem te conhece desde novo 😅',
  'Vou fingir que não li isso. Como está o seu dia hoje? 😄',
];

/** Complementos na voz de tia: conselho, família e comparações de época. */
const COMPLEMENTOS_TIA: string[] = [
  'Quando eu tinha a sua idade eu era igual, viu 😄',
  'Aproveita que você é novo, isso passa rápido',
  'Já comeu de verdade hoje? Me responde com sinceridade',
  'Se precisar de conselho, eu tô aqui, viu? Comigo não precisa ter vergonha',
  'Você tá crescendo rápido. Sua mãe deve ter orgulho de você',
  'Na minha época o povo namorava de outro jeito, hoje é tudo mensagem',
  'Vou te falar como a gente fala na igreja: guarda o seu tempo',
];

/** O que ela pergunta quando te vê como criança. */
const PAPO_CRIANCA: string[] = [
  'E o estudo, como tá indo?',
  'Você tem comido direito? Casa de solteiro é assim mesmo 😅',
  'Sua mãe tá bem? Manda um abraço pra ela',
  'Você vai dormir que horas? Amanhã tem compromisso',
  'Você anda indo na igreja? Noto a sua falta',
  'Não vai fazer besteira por aí, viu? Me escuta',
];

/** Puxadas de família: quando ela lembra de casa e dos filhos. */
const FALAS_FAMILIA: string[] = [
  'Você não vai acreditar no que {familiar} me contou hoje kkk',
  'Tive um dia de família: {familiar} deu trabalho, mas no fim deu tudo certo',
  'Gente, {familiar} me perguntou de você 😳 o que eu respondo?',
  'Depois te conto como foi o almoço de domingo com {familiar} 😊',
];

/** Ponte de memória: ela puxa o que você já contou. */
const PONTES: { tipo: string; modelos: string[] }[] = [
  { tipo: 'preferencia', modelos: ['Você comentou que ama {valor}, lembrei agora 😄', 'Aliás, aquele negócio de {valor} continua rendendo?', 'Lembrei de você quando vi algo sobre {valor}'] },
  { tipo: 'evento', modelos: ['E aquilo de {valor}, como foi?', 'Você me contou de {valor} e eu fiquei curiosa até agora', 'Como terminou {valor}? Fiquei sem saber o final'] },
  { tipo: 'rotina', modelos: ['Como tá indo com {valor}?', 'E a rotina, {valor} tá pesado?', 'Você melhorou aquele troço de {valor}?'] },
];

const SOMBRAS: Record<Familia, string[]> = {
  [A]: ['Adorei o papo 😊', 'Você me faz rir', 'Tô com vontade de te conhecer pessoalmente, isso é bom', 'Nossa, a gente conversa bem, viu', 'Fico feliz que você apareceu hoje', 'Você tem um jeito tranquilo que me agrada', 'Podia ser sempre assim 😊'],
  [F]: ['Você tá ficando perigoso 😏', 'Fico sorrindo aqui igual boba 😳', 'Se continuar assim eu vou me apegando', 'Você tem jeito pra dizer as coisas, hein', 'Tô gostando demais disso aqui'],
  [P]: ['Tô aqui com a cabeça longe 😏', 'Você tem ideia do que escreve, né? 🔥', 'Melhor eu parar antes que eu passe dos limites', 'Depois não diz que eu te avisei 😏'],
};

/** Sugestões de abertura na voz de quem está usando o app. */
export interface Sugestao { texto: string; motivo: string; tom: Tone }
const ABERTURAS: Record<'primeira' | 'retorno' | 'proxima' | 'especial' | 'aniversario' | 'interesse' | 'convite' | 'familia', Sugestao[]> = {
  primeira: [
    { texto: 'Oi! Vi que você curte {interesse} — me indica uma coisa boa de lá?', motivo: 'Abre com o interesse real da ficha', tom: 'amizade' },
    { texto: 'Oi, tudo bem? Que coincidência a gente se falar hoje, tava lembrando de você 😊', motivo: 'Casual e sem pressão', tom: 'amizade' },
    { texto: 'Oi! Vou direto: gosto da sua energia e queria te conhecer melhor', motivo: 'Elogio curto e honesto', tom: 'flerte' },
  ],
  retorno: [
    { texto: 'Oi! Sumi um pouco, semana pesada. Como você tá?', motivo: 'Assume a ausência sem drama', tom: 'amizade' },
    { texto: 'Oi, saudade do nosso papo. Aconteceu tanta coisa que preciso te contar', motivo: 'Reabre com assunto pendente', tom: 'flerte' },
    { texto: 'Parei de responder aquele dia, foi mal. Posso retomar de onde a gente parou?', motivo: 'Conserta o silêncio', tom: 'amizade' },
  ],
  proxima: [
    { texto: 'E aquilo de {gancho}, como foi? Fiquei curioso', motivo: 'Mostra que guardou o que ela contou', tom: 'amizade' },
    { texto: 'Boa noite 😊 pensei em você quando tocou {musica}', motivo: 'Usa a música favorita da ficha', tom: 'flerte' },
    { texto: 'Hoje eu tava com vontade de te ver, sem enrolação', motivo: 'Direto, mas carinhoso', tom: 'flerte' },
  ],
  especial: [
    { texto: 'Você tá na minha cabeça mais que devia 😏 e olha que eu tenho assunto sério pra resolver', motivo: 'Assume o interesse', tom: 'flerte' },
    { texto: 'Bora marcar aquele programa? Eu escolho o lugar, você leva a conversa', motivo: 'Sai do digital com naturalidade', tom: 'flerte' },
    { texto: 'Hoje eu tô com uma vontade de você que não dá pra escrever aqui 😏', motivo: 'Só para ficha 18+ com o tom liberado', tom: 'provocante' },
  ],
  aniversario: [
    { texto: 'Hoje é seu aniversário, né? Parabéns! 🎉 me diz o que você tá fazendo pra comemorar', motivo: 'Data da ficha', tom: 'amizade' },
    { texto: 'Parabéns! Você merece um dia enorme. E eu ainda quero te dar um abraço', motivo: 'Carinho na data certa', tom: 'flerte' },
  ],
  interesse: [
    { texto: 'Como tá {gancho}? Lembrei de você falando disso', motivo: 'Gancho do dia a dia', tom: 'amizade' },
    { texto: 'Achei uma coisa sobre {interesse} que é a sua cara, quer que eu mande?', motivo: 'Assunto novo, sem repetir o de sempre', tom: 'amizade' },
    { texto: 'A gente nunca falou sobre {interesse}. Corre risco de descobrir que a gente combina', motivo: 'Abre assunto inédito', tom: 'flerte' },
  ],
  familia: [
    { texto: 'Oi! Como está {familiar}? Manda um abraço pra ela 😊', motivo: 'Pergunta por quem ela ama', tom: 'amizade' },
    { texto: 'Tudo bem por aí? Como tá a sua família toda?', motivo: 'Assunto de quem convive com a família dela', tom: 'amizade' },
    { texto: 'Lembrei de você hoje. E aí, como estão as coisas em casa?', motivo: 'Natural e sem cobrança', tom: 'amizade' },
  ],
  convite: [
    { texto: 'Bora tomar um café essa semana? Escolhe o dia', motivo: 'Convite sem rodeio', tom: 'flerte' },
    { texto: 'Programa amanhã à noite: eu, você e um lugar sem barulho. Topa?', motivo: 'Convite com plano claro', tom: 'flerte' },
    { texto: 'Tô afim de te ver. Não sei se é melhor café, jantar ou sair pra dançar — você decide', motivo: 'Convite com escolha', tom: 'flerte' },
  ],
};

/** Sugestões na voz do usuário para responder o que ela mandou. */
const RESPOSTAS_SUGERIDAS: Record<string, Partial<Record<Familia, string[]>>> = {
  'ela-perguntou': {
    [A]: ['Tudo bem! Foi um dia corrido, mas produtivo. E o seu, como foi?', 'Boa! Tô resolvendo umas coisas aqui, mas te respondo com calma', 'Se eu te contasse tudo ia virar textão kkk resumo: deu certo'],
    [F]: ['Melhorou agora 😏 e você, tá fazendo o que de bom?', 'Meu dia tá bom, mas eu tô é pensando em te ver', 'Confesso que li sua mensagem duas vezes 😅 tava esperando'],
    [P]: ['Foi corrido, mas eu ainda tenho energia pra gastar 😏', 'Meu dia melhorou quando você escreveu. E agora?'],
  },
  'ela-contou': {
    [A]: ['Nossa, que dia! Você descansou depois?', 'Entendi, isso cansa mesmo. Precisa de alguma coisa?', 'Caramba, você levou tudo na boa. Admiro isso'],
    [F]: ['Queria estar aí pra melhorar teu dia 😊', 'Se eu tivesse aí, esse cansaço ia embora rápido 😏', 'Você merece um cuidado. Deixa eu ajudar'],
    [P]: ['Se eu tivesse aí, você não ia querer dormir cedo 😏', 'Vem cá que eu resolvo isso pra você 🔥'],
  },
  'ela-convidou': {
    [A]: ['Topo! Só me diz o horário que eu me organizo', 'Vamos sim, gosto de programa assim', 'Bora! Vou reservar um tempinho'],
    [F]: ['Eu tava esperando esse convite 😏 tô dentro', 'Aceito, mas a sobremesa é por sua conta', 'Com você eu topo até coisa que não gosto'],
    [P]: ['Só se for pra gente se ver de perto e conversar sem pressa 🔥'],
  },
  'ela-fechada': {
    [A]: ['Eu reparei que você tá diferente hoje. Aconteceu algo?', 'Se quiser espaço, eu entendo. Tô aqui quando você quiser falar', 'Não vou insistir, mas saiba que você pode contar comigo'],
    [F]: ['Vou te dar espaço, mas deixa registrado: faz falta 😅', 'Tá bem, eu espero. Quando você voltar, sem cobrança'],
    [P]: ['Respeito seu tempo. Quando quiser retomar, você sabe onde me achar'],
  },
  'ela-elogiou': {
    [A]: ['Obrigado 🙂 você também tem um jeito que agrada, viu', 'Fico feliz de ler isso, sério', 'Valeu! Você ganhou ponto comigo kkk'],
    [F]: ['Vindo de você, o elogio vale dobrado 😊', 'Agora você me deixou animado. Vou ter que retribuir', 'Você fala assim e eu já quero te ver'],
    [P]: ['Se você falar isso perto de mim, não respondo por nós dois 😏'],
  },
  'ela-saudade': {
    [A]: ['Também tô com saudade 🙂 bora marcar algo?', 'Saudade boa essa. Tô pensando em você também', 'Vem cá então, me conta tudo que eu quero ouvir'],
    [F]: ['Saudade também. E se a gente resolvesse isso hoje? 😏', 'Eu ia dizer que tô bem, mas minha cara tá dizendo outra coisa', 'Tô com saudade de te ver sorrindo do meu lado'],
    [P]: ['Saudade é pouco pro que eu tô sentindo 😏 vem matar isso'],
  },
  'ela-neutra': {
    [A]: ['Boa, entendi. Por falar nisso, você viu aquilo que eu te falei?', 'Tá certo. E me conta: novidade por aí?', 'Faz sentido. Vou pensar nisso e te falo depois'],
    [F]: ['Só entendi que preciso de mais tempo com você 😏', 'Combinado. Mas o próximo assunto sou eu quem escolho', 'Gostei. Continua falando que eu gosto de te ouvir'],
    [P]: ['Mudando pra outro assunto: você é sempre assim tão direto? 😏'],
  },
};

// ---------------------------------------------------------------------------
// Estilo de escrita
// ---------------------------------------------------------------------------

const GENERO_TROCAS: [RegExp, string][] = [
  [/\blinda\b/g, 'lindo'], [/\bbonita\b/g, 'bonito'], [/\bgostosa\b/g, 'gostoso'], [/\bcansada\b/g, 'cansado'],
  [/\banimada\b/g, 'animado'], [/\bocupada\b/g, 'ocupado'], [/\bsozinha\b/g, 'sozinho'], [/\bquerida\b/g, 'querido'],
  [/\bobrigada\b/g, 'obrigado'], [/\bapaixonada\b/g, 'apaixonado'], [/\bsafada\b/g, 'safado'], [/\bnervosa\b/g, 'nervoso'],
  [/\bsolteira\b/g, 'solteiro'], [/\bsolteirinha\b/g, 'solteirinho'],
  [/\bpronta\b/g, 'pronto'], [/\bbonitinha\b/g, 'bonitinho'], [/\bquietinha\b/g, 'quietinho'], [/\bdeitada\b/g, 'deitado'],
  [/\btoda\b/g, 'todo'], [/\bsatisfeita\b/g, 'satisfeito'], [/\bfelizona\b/g, 'felizão'], [/\bperdida\b/g, 'perdido'],
];

export function ajustarGenero(texto: string, genero: Genero) {
  if (genero === 'feminino') return texto;
  let saida = texto;
  for (const [padrao, masculino] of GENERO_TROCAS) saida = saida.replace(padrao, masculino);
  return saida;
}

/** Um emoji (ou bandeira) no fim da frase: evita empilhar carinhas. */
const EMOJI_NO_FIM = /(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]\u{FE0F}?|[\u{1F1E6}-\u{1F1FF}]{2})$/u;
/** Emoji em qualquer posição — usado para tirar o enfeite colado no banco. */
const EMOJI_EM_QUALQUER_LUGAR = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{200D}\u{FE0F}]/gu;
/** A mesma lista, em texto, para montar expressões com contexto. */
const EMOJI_CLASSE = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2190}-\\u{21FF}]';


function temCaractereGenero(texto: string) {
  return /\b(linda|bonita|gostosa|fofa|gata|animada|toda|querida|cansada)\b/i.test(texto);
}

export interface EstiloContexto {
  persona: Persona;
  /** Música favorita da ficha, usada nos ganchos de conversa. */
  musica?: string;
  tom: Tone;
  humor: Mood;
  rand: () => number;
  rapido?: boolean;
  nomeUsuario: string;
  /** Proporção de abreviações (vc, pq, mds). Desligado em Ajustes → Conversas. */
  abreviar?: boolean;
  /** Emojis ligados/desligados em Ajustes → Conversas. */
  emojis?: boolean;
  /** Como a mensagem que ela respondeu soa: em conversa pesada ninguém ri. */
  sentimento?: Sentimento;
}

/** Abreviacoes que combinam com qualquer idade. */
const ABREVIACOES_ADULTAS = ['vc', 'tb', 'pq', 'msg'];

const TROCAS_ABREVIACAO: [RegExp, string][] = [
  [/\bvocê\b/gi, 'vc'],
  [/\btambém\b/gi, 'tb'],
  [/\bporque\b/gi, 'pq'],
  [/\bpor que\b/gi, 'pq'],
  [/\bdepois\b/gi, 'dps'],
  [/\bhoje\b/gi, 'hj'],
  [/\bbeleza\b/gi, 'blz'],
  [/\bquando\b/gi, 'qdo'],
  [/\bminha nossa\b/gi, 'mn'],
  [/\bmensagem\b/gi, 'msg'],
  [/\bfavor\b/gi, 'pfv'],
];

/**
 * Escreve as palavras por inteiro — o padrão do direct do Instagram: nada de
 * "vc", "hj", "tá", "tô", "tbm", "entt". A mesma lista que o motor usa para
 * entender o usuário serve aqui para limpar o que escapou dos bancos.
 */
function escreverPorExtenso(texto: string) {
  let saida = expandirAbreviacoes(texto);
  // "vc vc" não existe; duplicadas de expansão somem.
  saida = saida.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?…])/g, '$1').trim();
  return saida;
}

/** Abreviações de quem digita rápido no celular. Opt-in: 1 a 3 por mensagem. */
function abreviar(texto: string, ctx: EstiloContexto) {
  if (ctx.abreviar !== true) return escreverPorExtenso(texto);
  const chancePorBolha = 0.12 + ctx.persona.fala.informalidade * 0.4;
  let saida = texto;
  // Quem e mais velho escreve "vc" e "msg", mas nao "blz", "mn" e "dps".
  const permitidas = ehMadura(ctx.persona) ? ABREVIACOES_ADULTAS : null;
  const candidatos = TROCAS_ABREVIACAO
    .filter(([padrao, abreviado]) => padrao.test(saida) && (!permitidas || permitidas.includes(abreviado)));
  const quantas = Math.min(candidatos.length, ctx.rand() < chancePorBolha ? (ctx.rand() < 0.3 ? 2 : 1) : 0);
  for (let i = 0; i < quantas; i++) {
    const [padrao, abreviado] = candidatos[i];
    saida = saida.replace(padrao, abreviado);
  }
  return saida;
}

/** Perguntas de cuidado: entram no lugar da pergunta de rotina em assunto pesado. */
const PERGUNTAS_APOIO: string[] = [
  'Quer me contar o que aconteceu?',
  'Você tem com quem contar aí?',
  'Como você tá se sentindo agora?',
  'Quer desabafar ou prefere que eu te distraia?',
  'Faz muito tempo que você tá assim?',
  'Você conseguiu descansar um pouco?',
];

/** Complementos para quando o assunto é pesado: acolher, não perguntar da rotina. */
const COMPLEMENTOS_APOIO: string[] = [
  'Tô aqui, sem pressa nenhuma',
  'Você não precisa passar por isso calado',
  'Se quiser desabafar mais, eu escuto',
  'Respira. Um passo de cada vez',
  'Conte comigo hoje, tá?',
  'Não precisa responder agora, só queria que você soubesse',
  'Manda quando você estiver melhor, eu entendo',
];

/** Convites para contar mais: dois deles na mesma mensagem soam repetidos. */
const PEDE_MAIS = /\b(me conta|conta mais|fala mais|continua contando|conte mais|me fala|quero ouvir|me diz|me explica|conta tudo)\b/i;

/** Carinhas que continuam cabendo quando o assunto é pesado. */
const ACOLHEDOR = /^(🥰|❤️|💜|💗|🤗|🫂|🙏|🥺|😔|😥|😢|😞)$/u;

/** Aplica emoji, risada, gíria, vocativo, erros de digitação e gênero. */
function estilizar(texto: string, ctx: EstiloContexto) {
  const { persona, tom, humor, rand } = ctx;
  let saida = texto;
  // Ficha adulta não herda o emoji colado no banco: o enfeite dela vem da paleta
  // da persona, aplicada logo abaixo, e só quando combina com o jeito dela.
  if (ctx.persona.fala.maturidade >= 0.72) {
    // "Relaxa, tá tudo bem 😊 eu também tenho dias" sem a carinha virava duas
    // frases coladas: onde o emoji separava ideias, entra ponto — e a palavra
    // seguinte ganha maiúscula, porque vira começo de frase.
    const comPonto = saida.replace(new RegExp(`([^\\s])\\s*(${EMOJI_CLASSE})\\s*(?=\\S)`, 'gu'), '$1. ');
    saida = comPonto.replace(EMOJI_EM_QUALQUER_LUGAR, ' ').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1')
      .replace(/([.!?])\s+([a-zà-ú])/gu, (_, pontuacao, letra) => `${pontuacao} ${letra.toUpperCase()}`)
      .trim();
  }
  // Orçamento de enfeites: mensagem curta ganha no máximo um (risada, emoji ou
  // sinal). Sem isso ela virava um amontoado de "kkk 😊!" na mesma bolha.
  const limiteFloreios = normalizeText(texto).length < 28 ? 1 : 2;
  let floreios = 0;
  /** Coloca o sinal no fim de verdade — antes do emoji, nunca depois dele. */
  const aplicarSinal = (bruto: string, sinal: string) => {
    const tokens = bruto.trim().split(' ');
    const ultimo = tokens[tokens.length - 1] || '';
    const soEmoji = ultimo.length <= 8 && [...ultimo].every(caractere => (caractere.codePointAt(0) || 0) >= 0x2190);
    if (soEmoji && tokens.length > 1) {
      tokens[tokens.length - 2] = tokens[tokens.length - 2].replace(/[.!?]*$/, '') + sinal;
      return tokens.join(' ');
    }
    return bruto.trim().replace(/[.!?]*$/, '') + sinal;
  };
  if (temCaractereGenero(saida)) saida = ajustarGenero(saida, persona.genero);

  // Vocativos por tom, entrando só no começo e com parcimônia.
  const vocativos = tom === 'intenso' ? ['meu bem', 'amor']
    : tom === 'provocante' ? ['meu bem', 'gato/gata', persona.fala.vocativos[2]]
      : tom === 'flerte' ? [persona.fala.vocativos[2], 'lindo/linda'] : [persona.fala.vocativos[2], 'amiga'];
  if (/\{vc\}/.test(saida)) saida = saida.replace(/\{vc\}/g, vocativos[Math.floor(rand() * vocativos.length)]);

  // Nome do usuário aparece de vez em quando, como numa conversa de verdade.
  if (/\{nome\}/.test(saida)) saida = saida.replace(/\{nome\}/g, rand() < 0.22 ? ctx.nomeUsuario : '');

  // Abertura com o jeito dela: "Olha, ...", "Mano, ...", "Vou te falar, ...".
  const marca = persona.assinatura;
  const jaTemAbertura = marca ? marca.aberturas.some(abertura => normalizeText(saida).startsWith(normalizeText(abertura))) : true;
  if (marca && !jaTemAbertura && rand() < 0.2) {
    const abertura = marca.aberturas[Math.floor(rand() * marca.aberturas.length)];
    saida = `${abertura} ${saida.charAt(0).toLowerCase()}${saida.slice(1)}`;
  }

  // Risada: todo mundo ri por mensagem — o que muda é a frequência e o jeito
  // ("kkkk", "kakakaka", "hahaha", "rs"). Assunto pesado e secura não ganham risada.
  const jaRi = /(kk+|ka{2,}k|kak[ak]+|hah+a?|rsr?s?|risos|sksk)/i.test(saida.trim());
  const pesado = ctx.sentimento === 'negativo';
  if (!pesado && ctx.emojis !== false && floreios < limiteFloreios && !jaRi && rand() < 0.2 + persona.traits.girias * 0.28 + (tom === 'amizade' ? 0.04 : 0)) {
    const risada = marca && rand() < 0.7 ? marca.risada : persona.fala.risadas[Math.floor(rand() * persona.fala.risadas.length)];
    // "Fica tranquilo. kkk" vira "Fica tranquilo kkk": risada substitui o ponto.
    // Pergunta mantém o "?" no fim ("você já jantou kkk?") — sem isso a pergunta vira frase.
    const fim = /\?\s*$/.test(saida) ? '?' : '';
    saida = `${saida.replace(/\s*[.!?…]+\s*$/, '')} ${risada}${fim}`;
    floreios += 1;
  }
  if (!pesado && floreios < limiteFloreios && persona.fala.informalidade > 0.7 && rand() < 0.22) {
    saida = `${persona.fala.girias[Math.floor(rand() * persona.fala.girias.length)]}, ${saida.charAt(0).toLowerCase()}${saida.slice(1)}`;
    floreios += 1;
  }

  // Emoji no fim, proporcional ao perfil. Nunca dois emojis colados.
  // Em assunto pesado carinha alegre soa fora de hora: sobra só o acolhimento.
  const terminaComEmoji = () => EMOJI_NO_FIM.test(saida);
  const paletaDeEmoji = () => {
    const paleta = persona.fala.emojis.filter(Boolean);
    return pesado ? paleta.filter(emoji => ACOLHEDOR.test(emoji)) : paleta;
  };
  const emojiChance = ctx.emojis === false ? 0 : persona.traits.emojis * (humor === 'fechada' ? 0.3 : 1) * (tom === 'flerte' ? 1.15 : 1) * (pesado ? 0.45 : 1);
  if (floreios < limiteFloreios && !terminaComEmoji() && rand() < emojiChance * 0.75) {
    const paleta = paletaDeEmoji();
    if (paleta.length) {
      const emoji = paleta[Math.floor(rand() * paleta.length)];
      saida = /\s$/.test(saida) ? `${saida}${emoji}` : `${saida} ${emoji}`;
      floreios += 1;
    }
  }

  if (floreios < limiteFloreios && !pesado && ctx.emojis !== false && !terminaComEmoji() && persona.traits.emojis > 0.6 && rand() < 0.25) {
    const paleta = persona.fala.emojis.filter(Boolean);
    if (paleta.length >= 2) {
      const a = marca?.emojiMarca && rand() < 0.55 ? marca.emojiMarca : paleta[Math.floor(rand() * paleta.length)];
      saida += ` ${a}`;
    }
  }

  // Pontuação é hábito — e só entra se a bolha ainda estiver limpa.
  if (floreios === 0 && marca) {
    if (marca.pontuacao === 'reticencias' && rand() < 0.34 && /\.$/.test(saida.trim())) saida = aplicarSinal(saida, '...');
    else if (marca.pontuacao === 'exclamacao' && rand() < 0.3 && /\.$/.test(saida.trim())) saida = aplicarSinal(saida, '!');
    else if (marca.pontuacao === 'seca' && rand() < 0.35 && /!$/.test(saida.trim())) saida = aplicarSinal(saida, '.');
  }

  saida = abreviar(saida, ctx);

  // Erro de digitação: humano, pequeno e sem exagero. Letra trocada de lugar,
  // letra que some ou letra repetida — do jeito que acontece no celular.
  // No clima quente não tem erro: quebra o clima e virava estranho.
  if (ctx.tom !== 'provocante' && ctx.tom !== 'intenso' && rand() < persona.fala.erro * 0.35) {
    const palavras = saida.split(' ');
    const alvo = palavras.findIndex((palavra, i) => i > 0 && palavra.length > 5 && !palavra.startsWith('{'));
    if (alvo > 0) {
      const palavra = palavras[alvo];
      const corte = Math.max(1, Math.floor(palavra.length / 2) - 1);
      const tipo = Math.floor(rand() * 3);
      if (tipo === 0 && corte + 1 < palavra.length) {
        // letras trocadas de lugar
        palavras[alvo] = `${palavra.slice(0, corte)}${palavra[corte + 1]}${palavra[corte]}${palavra.slice(corte + 2)}`;
      } else if (tipo === 1) {
        // letra que some
        palavras[alvo] = `${palavra.slice(0, corte)}${palavra.slice(corte + 1)}`;
      } else {
        // letra repetida
        palavras[alvo] = `${palavra.slice(0, corte)}${palavra[corte]}${palavra.slice(corte)}`;
      }
      if (rand() < 0.5) {
        const nota = ehMadura(persona) ? '(digitei errado)' : '(digitei errado kkk)';
        saida = `${palavras.join(' ')} ${nota}`;
      } else {
        saida = palavras.join(' ');
      }
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Memória
// ---------------------------------------------------------------------------

const PADROES_MEMORIA: { tipo: string; padrao: RegExp; grupo?: number }[] = [
  { tipo: 'preferencia', padrao: rx("\\b(?:eu\\s+)?(?:amo|adoro|gosto muito de|sou viciad[oa] em|curto)\\s+([a-zà-ú][^.,!?;]{2,40})", "i"), grupo: 1 },
  { tipo: 'preferencia', padrao: rx("\\b(?:minha|meu)\\s+(música|banda|cantor[a]?|série|filme|comida|sobremesa|time|jogo)\\s+(?:favorit[oa]\\s+)?(?:é|e)\\s+([^.,!?;]{2,40})", "i"), grupo: 0 },
  { tipo: 'evento', padrao: rx("\\b(?:amanhã|semana que vem|mês que vem|hoje à noite|depois de amanhã)\\s+(?:eu\\s+)?(?:vou|tenho|tem|faço|vou fazer)\\s+([^.,!?;]{3,50})", "i"), grupo: 1 },
  { tipo: 'evento', padrao: rx("\\b(?:vou|vamos)\\s+(?:fazer|começar|comecar|começar|resolver|marcar|viajar para|viajar pra)\\s+([^.,!?;]{3,50})", "i"), grupo: 1 },
  { tipo: 'rotina', padrao: rx("\\b(?:meu|minha)\\s+(trabalho|serviço|servico|faculdade|curso|academia|rotina|filho|filha|mãe|pai|cachorro|gato|pet|carro|casa|chefe)\\b", "i"), grupo: 1 },
  { tipo: 'rotina', padrao: rx("\\b(?:tenho|tô|estou)\\s+(trabalhado|cursado|treinado|estudado)\\s+([^.,!?;]{3,40})", "i"), grupo: 1 },
];

/** Extrai o que ela deve lembrar depois (assunto + valor curto). */
export function extrairMemorias(texto: string): { tipo: string; valor: string }[] {
  const saida: { tipo: string; valor: string }[] = [];
  for (const { tipo, padrao, grupo } of PADROES_MEMORIA) {
    const encontro = texto.match(padrao);
    if (!encontro) continue;
    const valor = (grupo === 0 ? encontro[0] : encontro[grupo ?? 1])?.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!valor || valor.length < 3) continue;
    // "alguma coisa sábado" não é lembrança: é frase sem conteúdo.
    if (/^(alguma coisa|algo|qualquer coisa|uma coisa|coisa|isso|aquilo|nada|um pouco|mais tarde|depois)/i.test(valor)) continue;
    if (saida.some(item => normalizeText(item.valor) === normalizeText(valor))) continue;
    saida.push({ tipo, valor });
    if (saida.length >= 2) break;
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Montagem da resposta
// ---------------------------------------------------------------------------

export interface ChatInput {
  person: Person;
  persona?: Persona;
  state: ChatState;
  message: string;
  /** Trecho citado quando o usuário respondeu uma mensagem antiga dela. */
  citacao?: string;
  historico?: ChatMessage[];
  nomeUsuario?: string;
  adulto?: boolean;
  tom?: Tone;
  humor?: Mood;
  rand?: () => number;
  rapido?: boolean;
  agora?: Date;
  /** A mensagem do usuário veio acompanhada de uma foto. */
  fotoEnviada?: boolean;
  /** Catálogo completo: resolve quem é mãe, filha, irmã na hora de falar da família. */
  pessoas?: Person[];
  /** Idade de quem usa o catálogo (Ajustes → Meu perfil). */
  dono?: { ownerAge?: number | null; ownerBirthday?: string | null } | null;
  /** Relação já calculada, quando a tela quiser evitar recalcular. */
  relacao?: Relacao;
  /** Contagem de abreviações ligada/desligada (Ajustes → Conversas). */
  abreviar?: boolean;
  /** Emojis ligados/desligados (Ajustes → Conversas). */
  emojis?: boolean;
  /** Ritmo pausado: ela digita mais devagar (Ajustes → Conversas). */
  pausado?: boolean;
}

/**
 * Resolve a relação: usa a que veio pronta, o catálogo quando disponível ou a
 * persona já construída. Nunca lança — sem dados, a relação fica neutra.
 */
function relacaoDe(input: { person: Person; persona?: Persona; pessoas?: Person[]; dono?: { ownerAge?: number | null; ownerBirthday?: string | null } | null; relacao?: Relacao }): Relacao {
  if (input.relacao) return input.relacao;
  if (input.pessoas?.length) return analisarRelacao(input.person, input.pessoas, input.dono);
  if (input.persona) return input.persona.relacao;
  return analisarRelacao(input.person, [input.person], input.dono);
}

export interface ChatPlan {
  bolhas: { texto: string; atraso: number }[];
  state: ChatState;
  humor: Mood;
  tom: Tone;
  tomPedido: Tone;
  intencao: IntentId;
  sentimento: Sentimento;
  afinidade: number;
  estagio: { id: Intimidade; label: string; descricao: string; indice: number };
  eventos: string[];
  /** Retrato emocional da conversa depois desta mensagem. */
  estado: EstadoEmocional;
  /** O mesmo retrato no formato estruturado (estado + resposta). */
  estruturado: EstadoEstruturado;
  desviado: boolean;
}

/** Opções de um banco já somadas às extras de `voz.ts` (sem repetir texto). */
/** Conversa de gente grande: idade e marcadores da ficha decidem. */
function ehMadura(persona: Persona) {
  return persona.fala.maturidade >= 0.72;
}

/** Quem já responde como adulto: 25+ (ou ficha que se descreve assim). */
function repertorioAdulto(persona?: Persona) {
  return !!persona && (persona.adulta || ehMadura(persona));
}

/** Tira do sorteio o que é molecagem quando a ficha conversa como adulto. */
function filtrarInfantil(opcoes: string[], persona?: Persona) {
  if (!repertorioAdulto(persona)) return opcoes;
  const filtradas = opcoes.filter(item => !INFANTIL.some(padrao => padrao.test(item)));
  return filtradas.length ? filtradas : opcoes;
}

function opcoesDe(id: IntentId, familia: Familia, persona?: Persona): string[] {
  const banco = RESPOSTAS[id] || RESPOSTAS.desconhecido;
  const extra = MAIS_RESPOSTAS[id] || {};
  const adulto = persona && ehMadura(persona)
    ? [...(MAIS_RESPOSTAS_MADURA[id]?.[familia] || []), ...(MAIS_RESPOSTAS_ADULTA[id]?.[familia] || [])]
    : [];
  return filtrarInfantil([...(banco[familia] || []), ...(extra[familia] || []), ...adulto], persona);
}

function temFamilia(id: IntentId, familia: Familia, persona?: Persona) {
  return opcoesDe(id, familia, persona).length > 0;
}

function familiaDe(tom: Tone, id: IntentId, persona?: Persona): Familia {
  if (tom === 'amizade') return temFamilia(id, A, persona) ? A : F;
  if (tom === 'flerte') return temFamilia(id, F, persona) ? F : (temFamilia(id, A, persona) ? A : F);
  if (temFamilia(id, P, persona)) return P;
  if (temFamilia(id, F, persona)) return F;
  return A;
}

/**
 * Sorteia uma frase evitando o que já foi usado e evitando começar a mensagem
 * do mesmo jeito que as últimas dela — é o que tira o papo do modo decorado.
 */
function escolher(opcoes: string[], usados: string[], rand: () => number, recentes: string[] = [], sal = 0) {
  // `usados` guarda a ordem em que as falas sairam: quem nao apareceu vem
  // primeiro e, quando o banco acaba, a fala mais antiga volta no lugar de a
  // mesma cair duas vezes seguidas.
  const posicao = new Map<string, number>();
  usados.forEach((item, indice) => posicao.set(normalizeText(item), indice));
  let novas = opcoes.filter(item => !posicao.has(normalizeText(item)));
  if (!novas.length) {
    // Banco todo usado: quem saiu nos ultimos turnos espera a vez.
    const recentes = new Set(usados.slice(-12).map(normalizeText));
    novas = opcoes.filter(item => !recentes.has(normalizeText(item)));
  }
  let lista = novas.length
    ? novas
    : [...opcoes].sort((a, b) => (posicao.get(normalizeText(a)) ?? -1) - (posicao.get(normalizeText(b)) ?? -1));
  if (recentes.length && lista.length > 2) {
    const aberturas = new Set(recentes.map(texto => normalizeText(texto).split(' ').slice(0, 2).join(' ')));
    const diferentes = lista.filter(item => !aberturas.has(normalizeText(item).split(' ').slice(0, 2).join(' ')));
    if (diferentes.length) lista = diferentes;
  }
  const indice = Math.floor(rand() * lista.length);
  return sal ? lista[(indice + sal) % lista.length] : lista[indice];
}

/** começar a frase como quem conversa no zap, sem fazer disso a regra. */
function abrirNatural(texto: string, rand: () => number, persona?: Persona) {
  if (!texto || rand() > 0.16) return texto;
  const minhas = persona?.assinatura?.aberturas || [];
  const inicio = normalizeText(texto);
  // Se a frase já começa com um maneirismo (dela ou do zap), não abre de novo.
  const jaAbriu = (lista: string[]) => lista.some(item => {
    const chave = normalizeText(item).replace(/[,!?.]+$/, '');
    return chave.length > 1 && inicio.startsWith(chave);
  });
  if (jaAbriu(MANEIRISMOS) || jaAbriu(minhas)) return texto;
  // "Confesso que vamos!" não existe: convite e resposta pronta já abrem sozinhos.
  if (jaAbriu(['vamos', 'bora', 'topo', 'aceito', 'combinado', 'fechado', 'tá bom', 'ta bom', 'pode deixar', 'claro'])) return texto;
  // "Escuta, oi!" nao existe: saudacao e interjeicao ja abrem a frase.
  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem|e a[ií]|ué|ue|nossa|ah|ahá|eita|minha nossa|oxe|oxi|credo|pronto|gente|meu deus|ainda bem|rapaz|virgem)\b/i.test(texto.trim())) return texto;
  // Metade das vezes ela abre do jeito dela, metade do jeito geral do zap.
  const fonte = minhas.length && rand() < 0.55 ? minhas : MANEIRISMOS;
  const abertura = fonte[Math.floor(rand() * fonte.length)];
  return `${abertura} ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}

export interface Marcadores {
  valor?: string;
  familiar?: string;
  papel?: string;
  idade?: string;
  cidade?: string;
  signo?: string;
  vinculo?: string;
  nomeUsuario?: string;
  pessoa?: string;
  genero?: 'o' | 'a';
}

/**
 * Camada viva (src/lib/dialogue/): aplica a voz da persona (risada,
 * emoji, abreviação, erro de digitação) a uma linha montada fora dos
 * bancos — puxada de memória, transição de tópico, reação de estilo.
 */
export function estilizarLinha(texto: string, ctx: EstiloContexto): string {
  return estilizar(texto, ctx);
}

/**
 * Troca os marcadores {…} dos bancos pelos dados reais da ficha e da conversa.
 * Tudo que é escrito para ela passar usa este caminho — inclusive as sugestões
 * que aparecem na tela, que antes mostravam "{familiar}" cru.
 */
export function trocarMarcadores(texto: string, persona: Persona, rand: () => number, musica?: string, extras: Marcadores = {}) {
  let saida = texto.replace(/\{x\}/g, ganchoDe(persona, rand));
  saida = saida.replace(/\{interesse\}/g, persona.interesses[Math.floor(rand() * persona.interesses.length)]?.label || 'coisa boa');
  saida = saida.replace(/\{musica\}/g, musica || persona.nome || 'essa música');
  saida = saida.replace(/\{gancho\}/g, ganchoDe(persona, rand));
  saida = saida.replace(/\{valor\}/g, extras.valor || '');
  saida = saida.replace(/\{familiar\}/g, extras.familiar || persona.familiares[0]?.nome || 'a família');
  saida = saida.replace(/\{papel\}/g, extras.papel || persona.familiares[0]?.papel || 'família');
  saida = saida.replace(/\{idade\}/g, extras.idade || String(persona.idade ?? ''));
  saida = saida.replace(/\{cidade\}/g, extras.cidade || persona.cidade || 'por aqui');
  saida = saida.replace(/\{signo\}/g, extras.signo || 'um signo que eu não conto kkk');
  saida = saida.replace(/\{vinculo\}/g, extras.vinculo || 'gente da família');
  saida = saida.replace(/\{tia_ou_nao\}/g, persona.relacao.ehTia ? 'tia' : 'amiga');
  saida = saida.replace(/\{nome\}/g, extras.nomeUsuario || 'você');
  saida = saida.replace(/\{pessoa\}/g, extras.pessoa || 'essa pessoa');
  return saida.replace(/\s{2,}/g, ' ').trim();
}

function preencher(texto: string, ctx: EstiloContexto, extras: Marcadores = {}) {
  return estilizar(trocarMarcadores(texto, ctx.persona, ctx.rand, ctx.musica, { nomeUsuario: ctx.nomeUsuario, ...extras }), ctx);
}

const MAPA_TEMAS: [RegExp, string][] = [
    [/\b(trabalhei|trabalhando|trabalho|reunião|reuniao|chefe|cliente|escritório|escritorio|expediente|hora extra)/, 'trabalho'],
    [/\b(faculdade|prova|aula|estudo|curso|estágio|estagio|professor)/, 'estudo'],
    [/\b(comida|almoço|almoco|jantar|pizza|fome|café|cafe)/, 'comida'],
    [/\b(mãe|pai|família|familia|filho|filha|irmã|irmão|casa)/, 'familia'],
    [/\b(cachorro|gato|pet|bichinho)/, 'pet'],
    [/\b(viagem|praia|estrada|feriado)/, 'viagem'],
    [/\b(música|musica|show|banda|playlist)/, 'musica'],
    [/\b(amor|paixão|paixao|namoro|beijo|beijar)/, 'amor'],
    [/\b(treino|academia|corrida|dieta)/, 'treino'],
    [/\b(frio|calor|chuva|tempo)/, 'clima'],
    [/\b(ano|futuro|sonho|plano|meta)/, 'futuro'],
    [/\b(igreja|culto|ala|chamado|templo|missão|missao|escala)/, 'igreja'],
    [/\b(filho|filha|criança|crianca|escola do|pediatra)/, 'filhos'],
    [/\b(vinho|jantar|hotel|massagem|banho|cama|noite)/, 'vida adulta'],
    [/\b(cansad|cansado|cansada|exaust|sem energia|com sono|acordei cedo|dormi mal|não consigo dormir|nao consigo dormir|não dormi|nao dormi|insônia|insonia|acordei de madrugada)/, 'cansaco'],
    [/\b(boleto|dinheiro|salário|salario|pagar|conta de luz|apertado|despesa)/, 'dinheiro'],
    [/\b(saudade|sentindo falta|sentindo sua falta|sinto falta|senti sua falta|sinto sua falta|falta de conversar|com falta de você)/, 'saudade'],
    [/\b(consegui|ganhei|deu certo|notícia boa|noticia boa|comemora|parabéns|parabens|fui aprovad|formei|passei (na|no|de|em|pra|para)\b)/, 'alegria'],
    [/\b(idoso|idosa|avó|vô|cuidador|cuido da minha mãe|cuido da minha mae)/, 'idoso'],

];

/** Temas citados em um texto, sem depender de persona (usado nas estatísticas). */
export function temasDoTexto(texto: string): string[] {
  const normalizado = normalizeText(texto || '');
  const temas: string[] = [];
  for (const [padrao, tema] of MAPA_TEMAS) if (padrao.test(normalizado)) temas.push(tema);
  return [...new Set(temas)];
}

function topicosDoTexto(texto: string, intencao: IntentId, persona: Persona): string[] {
  const temas = temasDoTexto(texto);
  if (!temas.length) temas.push(String(TEMAS_POR_INTERESSE[persona.interesses[0]?.id] || 'dia'));
  void intencao;
  return temas;
}

function ajusteDeAfinidade(intencao: IntentId, sentimento: Sentimento, persona: Persona, permissao: { ousadiaOk: boolean; flerteOk: boolean }, estado: { id: Intimidade; indice: number }): number {
  const base: Partial<Record<IntentId, number>> = {
    saudacao: 0.8, despedida: 0.3, elogio: 1.8, elogio_corpo: 0.9, cantada: 1.1, convite: 2.2, pergunta_pessoal: 1.4,
    pergunta_fato: 0.7, pergunta_sobre_mim: 1.7, declaracao: 2.4, saudade: 2.2, flerte_leve: 1.4, flerte_forte: -2.2,
    pedido_foto: -2.6, apoio: 2.6, alegria: 1.9, piada: 1.5, provocacao: -1.7, ciumes: -1.4, desculpa: 1.5,
    agradecimento: 1.1, resposta_curta: -0.3, mudanca_assunto: 0.4, tedio: 0.7, cotidiano: 1.0, cotidiano_trabalho: 1.2,
    cotidiano_estudo: 1.1, cotidiano_comida: 1.1, pergunta_rotina: 1.2, mensagem_enviada: 1.1, desconhecido: 0.9,
    pedido_historia: 1.4, reclamacao_sem_dormir: 2.4, gratidao_recebida: 1.5, grosseria: -6,
  };
  let delta = base[intencao] ?? 0.8;
  if (!permissao.ousadiaOk && (intencao === 'flerte_forte' || intencao === 'pedido_foto' || intencao === 'elogio_corpo')) delta -= 1.6;
  if (!permissao.flerteOk && (intencao === 'cantada' || intencao === 'declaracao')) delta -= 1.4;
  if (intencao === 'declaracao' && estado.indice >= 3) delta += 1.4;
  if (intencao === 'ciumes' && estado.indice >= 3) delta += 1.8;
  if (intencao === 'provocacao' && estado.indice <= 1) delta -= 1.2;
  if (sentimento === 'negativo' && intencao !== 'apoio' && intencao !== 'desculpa') delta -= 0.4;
  if (persona.traits.reserva > 0.7 && (intencao === 'flerte_forte' || intencao === 'elogio_corpo' || intencao === 'cantada')) delta -= 0.8;
  if (persona.traits.romantica > 0.7 && (intencao === 'declaracao' || intencao === 'saudade' || intencao === 'elogio')) delta += 0.6;
  if (intencao === 'elogio' && persona.vaidade > 0.7) delta += 0.5;
  // Depois de muitas mensagens bons assuntos rendem menos, e o retorno é mais sutil.
  if (estado.indice >= 3) delta *= 0.8;
  return delta;
}

/** Humor dela reage ao rumo da conversa. */
function humorDerivado(atual: Mood, intencao: IntentId, sentimento: Sentimento, persona: Persona, rand: () => number): Mood {
  if (intencao === 'apoio' || intencao === 'desculpa') return 'carinhosa';
  if (intencao === 'provocacao' || intencao === 'flerte_forte' || intencao === 'pedido_foto') return 'fechada';
  if (intencao === 'piada' || intencao === 'alegria') return 'playful';
  if (intencao === 'foto') return persona.traits.timidez > 0.6 ? 'shy' : 'flirty';
  if (intencao === 'cantada' || intencao === 'flerte_leve' || intencao === 'declaracao' || intencao === 'saudade') return persona.traits.timidez > 0.6 ? 'shy' : 'flirty';
  if (intencao === 'pergunta_pessoal' || intencao === 'pergunta_sobre_mim' || intencao === 'pergunta_fato') return 'curious';
  if (sentimento === 'negativo' && rand() < 0.4) return 'fechada';
  if (atual === 'fechada' && rand() < 0.55) return 'neutral';
  if (rand() < 0.18) return 'happy';
  return atual === 'flirty' && rand() < 0.5 ? 'happy' : atual;
}

/** Divide um texto grande em bolhas, como quem digita em partes. */
function dividirEmBolhas(texto: string, maximo: number, tamanho: number): string[] {
  if (texto.length <= tamanho * 1.25 || maximo <= 1) return [texto];
  const partes = texto.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (partes.length <= 1) return [texto];
  const bolhas: string[] = [];
  let atual = '';
  for (const parte of partes) {
    if (atual && (atual.length + parte.length > tamanho || bolhas.length === maximo - 1)) { bolhas.push(atual.trim()); atual = parte; }
    else atual = atual ? `${atual} ${parte}` : parte;
  }
  if (atual.trim()) bolhas.push(atual.trim());
  return bolhas.slice(0, maximo);
}

export function montarAtrasos(bolhas: string[], persona: Persona, rand: () => number, rapido?: boolean, humor?: Mood, pausado?: boolean, teto = 8200) {
  const lento = (humor === 'fechada' ? 1.4 : 1) * (pausado ? 1.7 : 1);
  return bolhas.map((texto, indice) => {
    // Tempo de digitação de verdade: mais devagar que "colar texto", com pausa
    // de leitura antes da primeira bolha e respiro entre uma e outra.
    const digitacao = texto.length * persona.fala.porCaractere * (indice === 0 ? 1.1 : 0.9) * (0.85 + rand() * 0.4);
    const leitura = indice === 0 ? 420 + rand() * 900 : 0;
    const respiro = indice === 0 ? 0 : 380 + rand() * 620;
    const bruto = (digitacao + leitura + respiro) * lento;
    return rapido
      ? Math.max(400, Math.min(2800, bruto * 0.32))
      : Math.max(1400, Math.min(teto, bruto));
  });
}

// ---------------------------------------------------------------------------
// Mensagens que chegam do nada.
// Gente de verdade manda mensagem lembrando de coisa que você nem fez: o papel
// que ficou na igreja, o recado que você não deu, o caderno esquecido. Aqui
// cada categoria tem os seus assuntos, e a ficha ainda usa o nome dos parentes.
// ---------------------------------------------------------------------------
const DO_NADA_POR_CATEGORIA: Record<string, string[]> = {
  igreja: [
    'Ei, e o papel que você ia levar na igreja hoje? Esqueceu, né 😅',
    'Falaram de você na reunião hoje. Eu falei que você ia domingo, não me deixa mal',
    'Você esqueceu o seu caderno na capela, viu? Deixei guardado',
    'A irmã do Soc. Soc. perguntou se você vai no mutirão. Eu respondi por você 😬',
    'Você não foi no ensaio e a gente ficou sem a sua parte, viu',
  ],
  fsy: [
    'Ei, você esqueceu de me mandar aquela foto do FSY! Eu quero ela',
    'O povo do FSY tá marcando encontro e eu falei que você ia. Você vai, né?',
    'Deixei a sua camiseta do FSY com a líder, passa lá pra pegar',
    'Você saiu sem falar comigo no último dia do FSY, hein 😤',
  ],
  trabalho: [
    'Você mandou aquele arquivo? Ainda não chegou aqui 😅',
    'Falaram de você na reunião hoje, viu? Melhor você se explicar kkk',
    'Você deixou a sua caneca na minha mesa de novo 😅',
    'O café acabou e você foi o culpado do dia, sabia?',
  ],
  escola: [
    'Você não me passou aquele trabalho e a professora cobrou 💀',
    'Deixei sua apostila na sala, ó se você vai pegar',
    'Você faltou hoje? Eu tive que responder por você na chamada kkk',
    'Guardei seu lugar, mas você não apareceu 😒',
  ],
  academia: [
    'Você faltou hoje, né? Eu vi kkk',
    'Deixei a sua garrafa na recepção, passa lá',
    'Amanhã eu te espero no treino, sem desculpa',
  ],
  comunidade: [
    'Ei, você deixou a chave do portão comigo, lembra?',
    'Passei na sua rua hoje e não te vi. Tá fugindo de mim? kkk',
    'O pessoal daqui perguntou de você no fim de semana',
    'Você esqueceu o bolo da festa, viu? O povo reparou kkk',
  ],
  conhecida: [
    'Ei, você sumiu. Tá tudo bem mesmo?',
    'Achei uma coisa sua aqui em casa, precisa pegar',
    'Lembrei de você hoje do nada. Não sei por quê',
    'Aquele assunto que a gente combinou você não me contou o resto',
  ],
  padrao: [
    'Ei, e aquilo que você ia me mandar? Ainda tô esperando 😅',
    'Você lembrou daquilo que eu te pedi? Não, né? kkk',
    'Passei pra ver se você tá vivo 😄',
    'Hoje eu acordei lembrando de você, do nada',
    'Tem uma coisa que você precisa resolver, viu? Fica de olho',
  ],
};

/** Recado de quem cuida: quando ela te vê como criança ou como tia. */
const DO_NADA_CUIDADO: string[] = [
  'Você já almoçou direito hoje? Não me responde mentira',
    'Sua mãe me disse que você anda dormindo tarde 👀 resolve isso',
  'Oi, tudo bem por aí? Passando pra saber se você tá comendo',
  'Você foi na igreja domingo? Eu olhei e não te vi',
  'Vou passar aí amanhã, quero ver se você tá bem',
];

/** Recado que usa um parente dela de verdade, tirado dos vínculos da ficha. */
const DO_NADA_FAMILIA: string[] = [
  '{familiar} perguntou de você hoje 😳 o que eu respondo?',
  'Tive um dia com {familiar} e lembrei de você no meio da bagunça',
  '{familiar} viu você passando e quis saber quem é você kkk',
  'Estou com {familiar} aqui, ele/ela manda um abraço',
];

/** Saudação de abertura quando a conversa ainda está vazia. */
export function planOpening(input: Omit<ChatInput, 'message'> & { primeiraVez?: boolean }): ChatPlan {
  const rand = input.rand || Math.random;
  const persona = input.persona || buildPersona(input.person, { people: input.pessoas, settings: input.dono });
  const relacao = relacaoDe(input);
  const adulto = !!input.adulto;
  const state = input.state;
  const tom = input.tom || 'amizade';
  const efetivo = tomEfetivo(tom, persona, state, adulto, relacao);
  const hora = (input.agora || new Date()).getHours();
  const ctx: EstiloContexto = { persona, tom: efetivo, humor: state.humor, rand, rapido: input.rapido, nomeUsuario: input.nomeUsuario || 'você', musica: input.person.musicaFavorita, abreviar: input.abreviar, emojis: input.emojis, sentimento: 'positivo' };
  const periodo = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiraVez = input.primeiraVez !== false;
  const familia = familiaDe(efetivo, 'saudacao', persona);
  // Quem já é adulto cumprimenta como adulto: sem carinha empilhada, sem "Oii!".
  const madura = ehMadura(persona);
  // Gente adulta não cumprimenta com careta de adolescente.
  const opcoes = primeiraVez
    ? madura
      ? [`${periodo}! Tudo bem?`, `${periodo}, tudo bem por aí?`, `${periodo}! Que bom te ver por aqui`, `${periodo}, como você está?`, `${periodo}! Espero que o dia esteja leve`, `${periodo}, tudo certo com você?`]
      : [`${periodo}! Tudo bem? 😊`, `${periodo}, tudo bem? Vi que você apareceu por aqui 🙂`, `${periodo}! Que surpresa boa, tudo certo?`]
    : madura
      ? [`${periodo} de novo, que bom`, `${periodo}! Você voltou, gostei disso`, `${periodo}. Continuo por aqui se você quiser conversar`]
      : [`${periodo} de novo 😄`, `${periodo}! Você voltou, gostei disso`, `${periodo} 😊 continuo por aqui`];
  // Quem te vê como criança ou como tia cumprimenta do jeito dela.
  if (relacao.veCrianca) opcoes.push(`${periodo}, menino! Tudo bem por aí? Já comeu? 😊`, `${periodo}! Como tá a sua mãe?`);
  else if (relacao.ehTia) opcoes.push(`${periodo}, meu bem! Tudo bem com você?`, `${periodo}! Tava lembrando de você esses dias 😊`);
  if (relacao.familiar) opcoes.push(`${periodo}! Olha quem apareceu por aqui 😊`, `${periodo}, tudo bem? A família toda bem?`);
  if (primeiraVez && rand() < 0.4 && relacao.flertePermitido) opcoes.push(`${periodo}! Acabei de pensar em você e você apareceu 😳`);
  const base = escolher(efetivo === 'amizade' ? opcoes : [...(RESPOSTAS.saudacao[familia] || []), ...opcoes], state.usados, rand);
  const texto = preencher(base, ctx);
  const bolhas = dividirEmBolhas(texto, persona.fala.bolhas[1], persona.fala.tamanho);
  const proximo = { ...state, humor: state.humor === 'neutral' ? 'happy' : state.humor, recentes: [...state.recentes, texto].slice(-14), usados: [...state.usados, base].slice(-60), ultimaMensagem: new Date().toISOString(), visitas: state.visitas + 1, perguntaAberta: /\?/.test(texto) ? { tema: 'saudacao', texto: base } : state.perguntaAberta };
  return fecharPlano({ bolhas: bolhas.map((t, i) => ({ texto: t, atraso: montarAtrasos(bolhas, persona, rand, input.rapido, state.humor, input.pausado, 5200)[i] })), state: proximo, humor: proximo.humor, tom: efetivo, tomPedido: tom, intencao: 'saudacao', sentimento: 'positivo', afinidade: proximo.afinidade, estagio: estagioAtual(proximo), eventos: [], desviado: false }, persona);
}

/** Mensagem espontânea da pessoa (quando o app fica parado ou no modo automático). */
export function planSpontaneous(input: Omit<ChatInput, 'message'> & { motivo?: 'saudade' | 'lembranca' | 'assunto' | 'do_nada' }): ChatPlan {
  const rand = input.rand || Math.random;
  const persona = input.persona || buildPersona(input.person, { people: input.pessoas, settings: input.dono });
  const relacao = relacaoDe(input);
  const state = input.state;
  const adulto = !!input.adulto;
  const efetivo = tomEfetivo(input.tom || state.tom, persona, state, adulto, relacao);
  const ctx: EstiloContexto = { persona, tom: efetivo, humor: state.humor, rand, rapido: input.rapido, nomeUsuario: input.nomeUsuario || 'você', musica: input.person.musicaFavorita, abreviar: input.abreviar, emojis: input.emojis, sentimento: 'positivo' };
  const motivo = input.motivo || (['saudade', 'lembranca', 'assunto'] as const)[Math.floor(rand() * 3)];
  const familia = familiaDe(efetivo, 'cotidiano', persona);
  let texto: string;
  if (motivo === 'do_nada') {
    return planDoNada(input);
  } else if (motivo === 'lembranca' && state.lembrancas.length) {
    const lembranca = state.lembrancas[Math.floor(rand() * state.lembrancas.length)];
    const modelos = PONTES.find(ponte => ponte.tipo === lembranca.tipo)?.modelos || PONTES[0].modelos;
    texto = preencher(escolher(modelos, state.usados, rand), ctx, { valor: lembranca.valor });
  } else if (motivo === 'saudade') {
    // Ela nunca chega querendo algo do nada: sem flerte liberado, a saudade é de amizade.
    texto = preencher(escolher(familia === A || !relacao.flertePermitido
      ? ['Tô pensando em você aqui 😊', 'Você sumiu, tá tudo bem?', 'Bom te ver por aqui, tava com saudade do papo', 'Acabei de lembrar de uma coisa que você disse e ri sozinha']
      : ['Tô com saudade de você, não vou mentir 😏', 'Você tá na minha cabeça, resolve isso', 'Passei pra ver se você aparecia 😉', 'Se você tivesse aqui agora... deixa, melhor não escrever 😏'],
    state.usados, rand), ctx, { familiar: relacao.familiares[0]?.nome, vinculo: relacao.vinculoComigo.toLowerCase() });
  } else {
    texto = preencher(escolher(filtrarInfantil([
      `Vi uma coisa sobre ${ganchoDe(persona, rand)} hoje e lembrei de você`,
      'Como tá seu dia? Tô com tempo livre agora',
      'Adivinha quem apareceu na minha cabeça junto com uma música?',
      'Me conta uma novidade que eu tô precisando de assunto bom',
      ...(relacao.veCrianca || relacao.ehTia ? PAPO_CRIANCA.slice(0, 3) : []),
      ...(relacao.familiares.length ? [FALAS_FAMILIA[Math.floor(rand() * FALAS_FAMILIA.length)]] : []),
    ], persona), state.usados, rand), ctx, { familiar: relacao.familiares[0]?.nome });
  }
  const bolhas = dividirEmBolhas(texto, persona.fala.bolhas[1], persona.fala.tamanho);
  const atrasos = montarAtrasos(bolhas, persona, rand, input.rapido, state.humor, input.pausado);
  const proximo = { ...state, humor: motivo === 'saudade' ? 'carinhosa' : state.humor, recentes: [...state.recentes, texto].slice(-14), usados: [...state.usados, texto].slice(-60), ultimaMensagem: new Date().toISOString(), perguntaAberta: /\?/.test(texto) ? { tema: motivo === 'assunto' ? 'dia' : 'geral', texto } : state.perguntaAberta };
  return fecharPlano({ bolhas: bolhas.map((t, i) => ({ texto: t, atraso: atrasos[i] })), state: proximo, humor: proximo.humor, tom: efetivo, tomPedido: input.tom || state.tom, intencao: 'saudacao', sentimento: 'positivo', afinidade: proximo.afinidade, estagio: estagioAtual(proximo), eventos: ['espontanea'], desviado: false }, persona);
}

/**
 * Mensagem que chega do nada.
 *
 * Gente de verdade manda mensagem lembrando de coisa que você nem fez: o papel
 * que "ficou na igreja", o recado que você "não deu", o caderno esquecido, o
 * pedido que você "não mandou". Ela usa a categoria da ficha, os parentes
 * cadastrados e, quando é o caso, o jeito de quem cuida de você.
 */
export function planDoNada(input: Omit<ChatInput, 'message'>): ChatPlan {
  const rand = input.rand || Math.random;
  const persona = input.persona || buildPersona(input.person, { people: input.pessoas, settings: input.dono });
  const relacao = relacaoDe(input);
  const state = input.state;
  const efetivo = tomEfetivo(input.tom || 'amizade', persona, state, !!input.adulto, relacao);
  const ctx: EstiloContexto = { persona, tom: efetivo, humor: state.humor, rand, rapido: input.rapido, nomeUsuario: input.nomeUsuario || 'você', musica: input.person.musicaFavorita, abreviar: input.abreviar, emojis: input.emojis, sentimento: 'positivo' };
  const familiares = relacao.familiares;
  const disponiveis: string[] = [
    ...(familiares.length ? DO_NADA_FAMILIA : []),
    ...(relacao.veCrianca || relacao.ehTia ? DO_NADA_CUIDADO : []),
    ...(DO_NADA_POR_CATEGORIA[persona.categoria] || []),
    ...DO_NADA_POR_CATEGORIA.padrao,
  ];
  const opcoes = filtrarInfantil(disponiveis, persona);
  const escolhido = escolher(opcoes, state.usados, rand);
  const texto = preencher(escolhido, ctx, { familiar: familiares[Math.floor(rand() * familiares.length)]?.nome });
  const bolhas = dividirEmBolhas(texto, persona.fala.bolhas[1], persona.fala.tamanho);
  const atrasos = montarAtrasos(bolhas, persona, rand, input.rapido, state.humor, input.pausado);
  const proximo = {
    ...state,
    humor: state.humor === 'fechada' || state.humor === 'neutral' ? 'happy' as Mood : state.humor,
    recentes: [...state.recentes, texto].slice(-16),
    usados: [...state.usados, escolhido].slice(-60),
    ultimaMensagem: new Date().toISOString(),
    perguntaAberta: /\?/.test(texto) ? { tema: 'do_nada', texto } : state.perguntaAberta,
  };
  return fecharPlano({
    bolhas: bolhas.map((t, i) => ({ texto: t, atraso: atrasos[i] })),
    state: proximo,
    humor: proximo.humor,
    tom: efetivo,
    tomPedido: input.tom || 'amizade',
    intencao: 'igreja',
    sentimento: 'neutro',
    afinidade: proximo.afinidade,
    estagio: estagioAtual(proximo),
    eventos: ['espontanea', 'do-nada'],
    desviado: false,
  }, persona);
}

/** Monta a resposta completa para uma mensagem do usuário. */
function estadoDoPlano(state: ChatState, humor: Mood, persona: Persona) {
  void persona;
  const estagio = estagioAtual(state);
  const paciencia = pacienciaDe(state);
  const estado: EstadoEmocional = {
    humor, paciencia, afinidade: state.afinidade, estagio, gatilhos: state.gatilhos || [],
    leitura: descreverEstado({ humor, paciencia, afinidade: state.afinidade }),
  };
  return estado;
}

/** Fecha um plano auxiliar (abertura, espontânea, do nada) com o retrato do momento. */
function fecharPlano<T extends { bolhas: { texto: string; atraso: number }[]; state: ChatState; humor: Mood }>(plano: T, persona: Persona) {
  const estado = estadoDoPlano(plano.state, plano.humor, persona);
  return { ...plano, estado, estruturado: montarEstadoEstruturado({ estado, bolhas: plano.bolhas.map(bolha => bolha.texto) }) };
}

export function planReply(input: ChatInput): ChatPlan {
  const rand = input.rand || Math.random;
  const persona = input.persona || buildPersona(input.person, { people: input.pessoas, settings: input.dono });
  const relacao = relacaoDe(input);
  const adulto = !!input.adulto;
  const state = input.state;
  const tomPedido = input.tom || state.tom;
  const permissao = tonsDisponiveis(persona, state, adulto, relacao).reduce((acc, item) => ({ ...acc, [item.id]: item.ok }), {} as Record<Tone, boolean>);
  const efetivo = tomEfetivo(tomPedido, persona, state, adulto, relacao);
  const eventos: string[] = [];
  const desviadoTom = efetivo !== tomPedido;

  // "vc viu o q eu te mandei hj?" precisa ser lido como uma frase inteira.
  const abreviacoes = abreviacoesNaMensagem(input.message || '');
  const pessoa = expandirAbreviacoes((input.message || '').trim());
  if (abreviacoes.length) eventos.push(`abreviacoes:${abreviacoes.join(',')}`);
  // Responder uma mensagem antiga: quando o texto novo é curto, a intenção vive
  // na citação ("kkkk" respondendo "bora sair?" é aceito convite, não piada).
  let leitura = input.message || '';
  const cru = detectarIntencao(leitura).id;
  const reacaoPura = leitura.trim().split(/\s+/).length <= 4;
  if (input.citacao && (['resposta_curta', 'desconhecido'].includes(cru) || reacaoPura)) {
    leitura = `${input.citacao}\n${leitura}`.trim();
  }
  // A detecção lê as duas versões (crua e aberta); o resto do motor usa a aberta.
  const detectada = detectarIntencao(leitura);
  // Nomes: ela reconhece o próprio nome, o seu e o de qualquer familiar da ficha.
  const familiarPorNome = nomesNaMensagem(pessoa, relacao.familiares)[0] || null;
  const chamouEla = nomesNaMensagem(pessoa, nomesDaPessoa(input.person).map(nome => ({ nome }))).length > 0;
  /** Nomes que você citou e ela ainda não conhecia. */
  const conhecidos = [...nomesDaPessoa(input.person), ...relacao.familiares.map(item => item.nome), input.nomeUsuario || '', ...(state.pessoas || [])];
  const nomesNovos = chamouEla || familiarPorNome ? [] : nomesEstranhos(pessoa, conhecidos);
  const falouProprioNome = !!input.nomeUsuario && input.nomeUsuario !== 'você'
    && nomesNaMensagem(pessoa, [{ nome: input.nomeUsuario }]).length > 0;
  // Falar o nome de um parente conta como pergunta por aquela pessoa.
  const intencoesSemTroca: IntentId[] = ['foto', 'pedido_foto', 'flerte_forte', 'elogio_corpo', 'cantada', 'declaracao', 'confusao', 'apoio', 'piada'];
  let intencao: IntentId = input.fotoEnviada ? 'foto' : detectada.id;
  if (familiarPorNome && !intencoesSemTroca.includes(intencao) && intencao !== 'pergunta_familiar') intencao = 'pergunta_familiar';
  const picante = intencao === 'flerte_forte' || intencao === 'pedido_foto' || intencao === 'elogio_corpo' || intencao === 'foto';
  const sentimento = input.fotoEnviada ? 'positivo' as Sentimento : detectada.sentimento;
  const estagioAntes = estagioAtual(state);
  const ousadiaOk = permissao.provocante || permissao.intenso;
  const flerteOk = permissao.flerte || ousadiaOk;
  let humor = input.humor || state.humor;
  humor = humorDerivado(humor, intencao, sentimento, persona, rand);

  // Estado emocional: paciência, gatilhos e o humor que ela impõe.
  const palavrasDaMensagem = pessoa.split(/\s+/).filter(Boolean).length;
  const leituraDePaciencia = ajusteDePaciencia({
    intencao, sentimento, texto: pessoa,
    curta: palavrasDaMensagem <= 3 || (intencao === 'resposta_curta' && palavrasDaMensagem <= 5),
  });
  const paciencia = Math.max(0, Math.min(10, pacienciaDe(state) + leituraDePaciencia.delta));
  const gatilhos = [...new Set(leituraDePaciencia.motivos)];
  humor = humorPorPaciencia(paciencia, humor, persona);
  /** Sem paciência: resposta curta, sem carinho e sem puxar assunto. */
  const seca = paciencia <= PACIENCIA_BAIXA && intencao !== 'grosseria';
  /** Falou grosso: ela corta e se retira. */
  const cortou = intencao === 'grosseria';
  if (seca) gatilhos.push('paciência baixa');
  // Falar grosso esfria na hora, mesmo com paciência sobrando.
  if (cortou) humor = 'fechada';

  // A relação manda antes da química: menor de idade e família não entram em romance.
  const INTENCOES_ROMANTICAS: IntentId[] = ['cantada', 'declaracao', 'saudade', 'flerte_leve', 'flerte_forte', 'elogio_corpo', 'pedido_foto', 'convite', 'pergunta_sobre_mim'];
  // Com quem te vê como criança, até elogio vira conversa de gente grande: ela responde como quem cuida.
  const elogioDeCrianca = relacao.veCrianca && (intencao === 'elogio' || intencao === 'elogio_corpo');
  const romanceBloqueado = !relacao.flertePermitido && (INTENCOES_ROMANTICAS.includes(intencao) || elogioDeCrianca) && !input.fotoEnviada;

  const delta = ajusteDeAfinidade(intencao, sentimento, persona, { ousadiaOk, flerteOk }, estagioAntes)
    * (romanceBloqueado ? 0.35 : 1)
    * (humor === 'fechada' ? 0.55 : 1)
    * (humor === 'carinhosa' ? 1.15 : 1);
  const afinidade = Math.max(0, Math.min(100, state.afinidade + delta));

  const familia = familiaDe(efetivo, intencao, persona);
  const ctx: EstiloContexto = { persona, tom: efetivo, humor, rand, rapido: input.rapido, nomeUsuario: input.nomeUsuario || 'você', musica: input.person.musicaFavorita, abreviar: input.abreviar, emojis: seca || cortou ? false : input.emojis, sentimento };
  const bolhas: string[] = [];
  /** Bolhas extras que a resposta ganhou (risada de piada, textão dividido...). */
  let extraBolhas = 0;
  const usados = [...state.usados];
  const modelosUsados: string[] = [];
  /** Cada ficha sorteia as falas com um deslocamento próprio: duas pessoas não respondem igual. */
  const sal = persona.nome.split('').reduce((total, letra) => total + letra.charCodeAt(0), persona.idade || 0) % 7;
  /** Assuntos do texto: escolhem a recepção, a pergunta e a memória da conversa. */
  const temas = topicosDoTexto(pessoa, intencao, persona);
  /** Assuntos que ela ouviu de voce. Quando nao tem nenhum, ela reage sem fingir assunto. */
  const temasOuvidos = temasDoTexto(pessoa);
  /** Familiar citado pelo nome ou pelo papel (mãe, filha, irmã...) — senão, o primeiro. */
  const familiarCitado = familiarPorNome || familiarDaMensagem(pessoa, relacao.familiares);
  const extrasBase = {
    familiar: familiarCitado?.nome || relacao.familiares[0]?.nome,
    papel: familiarCitado?.papel,
    idade: relacao.idadeDela !== null ? String(relacao.idadeDela) : undefined,
    vinculo: relacao.vinculoComigo.toLowerCase(),
    cidade: input.person.localizacaoMora || undefined,
    signo: input.person.signo || undefined,
  };
  /** Escolhe evitando repetição e registra o modelo para as próximas mensagens. */
  const preencherEscolhido = (opcoes: string[], gerador: () => number, extras: { valor?: string; lembranca?: string; pessoa?: string } = {}) => {
    const escolhido = escolher(opcoes, usados, gerador, state.recentes, sal);
    usados.push(escolhido);
    modelosUsados.push(escolhido);
    return preencher(escolhido, ctx, { ...extrasBase, ...extras });
  };

  const picanteBloqueado = picante && !permissao.provocante && !permissao.intenso && !input.fotoEnviada;
  const desviado = desviadoTom || picanteBloqueado || romanceBloqueado;

  // 1. Desvio de limite: ela não responde o que foi pedido, ela marca o limite.
  if (cortou) {
    bolhas.push(preencherEscolhido(LIMITES_GROSSERIA, rand));
    eventos.push('limite:grosseria');
  } else if (desviado) {
    const banco = romanceBloqueado
      ? (relacao.veCrianca || relacao.euMenor
          ? (relacao.veCrianca ? LIMITES_CRIANCA : LIMITES_MENOR)
          : relacao.familiar ? LIMITES_FAMILIA : relacao.ehTia ? LIMITES_TIA : DESVIOS_AMIZADE)
      : (!persona.adulta || (!permissao.flerte && tomPedido !== 'amizade') ? DESVIOS_AMIZADE : DESVIOS);
    bolhas.push(preencherEscolhido(banco, rand));
    eventos.push(`limite:${romanceBloqueado ? relacao.dinamica : picanteBloqueado && !desviadoTom ? intencao : tomPedido}`);
  }

  // 2. Reação curta — com quem te vê como criança (ou se é você que é menor de
  // idade), até o "😳" sai de cena.
  const criancaLimitada = romanceBloqueado && (relacao.veCrianca || relacao.euMenor);
  const chanceReacao = 0.34 + persona.traits.verbosidade * 0.3 + (sentimento !== 'neutro' ? 0.1 : 0);
/** Reação de elogio: agradecer sem parecer que o elogio foi para outra pessoa. */
const RECEPCOES_ELOGIO: string[] = [
  'Obrigada, viu', 'Que bom ouvir isso', 'Você me deixou sem graça', 'Isso é bom de ouvir, sério',
  'Fico contente que você pense assim', 'Valeu, de verdade', 'Olha, obrigada. Eu não esperava',
  'Que carinho, obrigada',
];

/** Reação de pergunta: ela mostra que entendeu o pedido antes de responder. */
const RECEPCOES_QUESTAO: string[] = [
  'Boa pergunta', 'Deixa eu pensar', 'Hmm, deixa eu ver', 'Olha, vou te responder direito',
  'Pergunta boa essa', 'Vou pensar com você', 'Entendi a pergunta', 'Essa eu vou responder com calma',
];

  // Oi e tchau não pedem reação: ela responde direto, como numa conversa real.
  const cabeReacao = !['saudacao', 'despedida', 'confusao'].includes(intencao);
  // Falar de um parente pelo nome já deixa o assunto "família" ligado.
  // Pergunta não leva "combinado" nem "beleza então": pergunta tem resposta.
  const soPergunta = ['pergunta_pessoal', 'pergunta_rotina', 'pergunta_fato', 'pergunta_idade', 'pergunta_sobre_mim',
    'pergunta_familiar', 'conselho', 'mensagem_enviada'].includes(intencao);
  const temaRecepcao = intencao === 'pergunta_familiar' && relacao.familiares.length
    ? 'familia'
    : temasOuvidos.find(tema => RECEPCOES_TEMA[tema]);
  // Reação genérica não serve quando a resposta já é a reação: saudade, obrigado
  // recebido, provocação e ciúmes não levam "que sorte a minha falar com você".
  const semReacaoGenerica = ['saudade', 'agradecimento', 'gratidao_recebida', 'provocacao', 'ciumes', 'desculpa', 'grosseria'].includes(intencao);
  // Leitura do assunto antes da resposta: é o que mostra que ela entendeu.
  // Sem paciência ela não enfeita: ou responde curto, ou devolve o tom seco.
  const reacaoSeca = seca && rand() < 0.6;
  if (reacaoSeca) bolhas.push(preencherEscolhido(FRIAS, rand));
  if (!criancaLimitada && cabeReacao && !cortou && !reacaoSeca) {
    if (temaRecepcao && rand() < 0.5) bolhas.push(preencherEscolhido(RECEPCOES_TEMA[temaRecepcao], rand));
    else if (!semReacaoGenerica && rand() < chanceReacao) {
      const bordoes = persona.assinatura?.bordoes || [];
      const base = ehMadura(persona) ? RECEPCOES_MADURA[sentimento] : RECEPCOES[sentimento];
      const brutas = intencao === 'pedido_historia'
        ? RECEPCOES_HISTORIA
        : (intencao === 'elogio' || intencao === 'elogio_corpo' || intencao === 'cantada')
          ? [...RECEPCOES_ELOGIO, ...(sentimento === 'positivo' ? ['Que bom que você acha isso'] : [])]
          : soPergunta
            ? [...RECEPCOES_QUESTAO, ...(sentimento === 'neutro' ? base : [])]
            : [...base, ...filtrarInfantil(MAIS_RECEPCOES[sentimento], persona)];
      // Recepção fora de contexto ("Combinado" depois de um desabafo) entrega resposta automática.
      const cabem = brutas.filter(reacao => recepcaoVale(reacao, intencao, pessoa));
      const reacoes = cabem.length ? cabem : brutas;
      // Bordão é brincadeira: assunto pesado não recebe bordão na frente da resposta.
      // Bordão de molecagem só entra em quem ainda fala assim: adulto não
      // responde um elogio com "ai, que preguiça boa".
      const cabeBordao = !ehMadura(persona) && sentimento !== 'negativo' && !soPergunta && bordoes.length > 0 && rand() < 0.3;
      bolhas.push(preencherEscolhido(cabeBordao ? bordoes : reacoes, rand));
    }
  }
  // 2a2. Piada pede risada: ela ri primeiro (bolha própria) e responde depois.
  const riuDaPiada = !desviado && !cortou && !reacaoSeca && intencao === 'piada' && sentimento !== 'negativo' && rand() < 0.85;
  if (riuDaPiada) {
    const risada = escolher(ehMadura(persona) ? RISADAS_REACAO_MADURA : RISADAS_REACAO, usados, rand);
    usados.push(risada);
    modelosUsados.push(risada);
    bolhas.push(risada);
    extraBolhas += 1;
    eventos.push('risada:piada');
  }

  // 2b. Nomes: ela percebe quando você fala com ela pelo nome (ou escreve o seu).
  if (!desviado && !cortou && chamouEla && !['despedida', 'confusao'].includes(intencao) && rand() < 0.7) {
    // Num 'oi' pelo nome ela responde presente — mas o flerte fica para
    // quando o assunto já está rodando.
    const bancoChamado = intencao === 'saudacao' ? CHAMADO_PELO_NOME.filter(l => !l.includes('soa bem')) : CHAMADO_PELO_NOME;
    bolhas.push(preencherEscolhido(bancoChamado, rand));
    eventos.push('nome:ela');
  } else if (!desviado && !cortou && falouProprioNome && rand() < 0.65) {
    bolhas.push(preencherEscolhido(FALOU_PROPRIA_NOME, rand));
    eventos.push('nome:voce');
  }
  // 2c. Nome que ela não conhece: ela pergunta quem é.
  if (!desviado && nomesNovos.length && !['despedida', 'confusao', 'pergunta_familiar'].includes(intencao) && rand() < 0.55) {
    bolhas.push(preencherEscolhido(PESSOA_NOVA, rand, { pessoa: nomesNovos[0] }));
    eventos.push(`nome:novo:${nomesNovos[0]}`);
  }

  // 2d. Nome que ela já anotou antes: volta no papo sem perguntar de novo quem é.
  const nomeLembrado = (state.pessoas || []).find(nome => nomesNaMensagem(pessoa, [{ nome }]).length > 0) || '';
  if (!desviado && !nomesNovos.length && nomeLembrado && !['despedida', 'confusao'].includes(intencao) && rand() < 0.6) {
    bolhas.push(preencherEscolhido(PESSOA_CONHECIDA, rand, { pessoa: nomeLembrado }));
    eventos.push(`pessoa:lembrada:${nomeLembrado}`);
  }

  // Tudo que veio até aqui é abertura (limite, reação, nome): a resposta entra logo depois.
  const inicioResposta = bolhas.length;

  // 3. Conteúdo principal (banco do motor + reforço de voz, sem repetir).
  const doTom = opcoesDe(intencao, familia, persona);
  let opcoes = criancaLimitada
    ? PAPO_CRIANCA
    : intencao === 'pergunta_familiar' && !relacao.familiares.length
      ? SEM_FAMILIAR
      : doTom.length ? doTom : (opcoesDe(intencao, A, persona).length ? opcoesDe(intencao, A, persona) : opcoesDe('desconhecido', A, persona));
  // 3-modo-resposta: ELA perguntou algo na mensagem anterior e o que você
  // mandou agora é uma resposta ("já", "sim", "um pagode"), não um assunto
  // novo. A saída nasce do assunto da pergunta: ela reage ao que você disse
  // e conta a vez dela — em vez de sortear uma frase qualquer.
  const aberta = !cortou && !desviado && !criancaLimitada ? state.perguntaAberta || null : null;
  const devolvePergunta = /\be\s+(você|voce|vc|tu|o seu|a sua|o teu|a tua)\b/i.test(pessoa) && pessoa.split(/\s+/).length <= 5;
  const interpretouResposta = !!aberta
    && ((['resposta_curta', 'desconhecido'].includes(detectada.id) && !devolvePergunta)
      || (detectada.id === 'pergunta_fato' && devolvePergunta));
  const devolveSemPergunta = !aberta && devolvePergunta && ['resposta_curta', 'desconhecido', 'pergunta_fato'].includes(detectada.id);
  const respondendoAberta = interpretouResposta || devolveSemPergunta;
  const temaAberta = aberta && (REACAO_RESPOSTA[aberta.tema] || MINHA_VEZ[aberta.tema]) ? aberta.tema : 'geral';
  if (respondendoAberta) {
    eventos.push(`respondeu-aberta:${aberta ? temaAberta : 'geral'}`);
    if (!devolvePergunta) {
      const tipo = tipoDeResposta(pessoa);
      const doTema = REACAO_RESPOSTA[temaAberta] || REACAO_RESPOSTA.geral;
      // "não" ganha reação própria: ela acolhe em vez de reagir como se fosse positiva.
      const reacoes = tipo === 'negativa' ? doTema.filter(reacao => !/^boa|^que bom/i.test(reacao)) : doTema;
      opcoes = reacoes.length ? [...reacoes, ...REACAO_RESPOSTA.geral] : [...REACAO_RESPOSTA.geral];
    } else {
      // "e o seu?" — devolveu a pergunta: ela responde por si, sem reação.
      opcoes = [...(MINHA_VEZ[temaAberta] || []), ...MINHA_VEZ.geral];
    }
  }

  // Pergunta do usuário ganha resposta do tipo certo: "que horas...?" não pode
  // receber o mesmo "acho que sim" que "você acredita nisso?".
  if (!respondendoAberta && !seca && !cortou) {
    if (intencao === 'pergunta_fato') {
      const tipo = PERGUNTA_FATO_TIPOS.find(item => item.padrao.test(pessoa));
      // Pergunta de sim/não ("você trabalha amanhã?") tem banco próprio — o
      // antigo sorteava "acho que sim" até para "como você está?".
      opcoes = filtrarInfantil(tipo ? tipo.respostas : [...PERGUNTA_FATO_FECHO, ...(opcoesDe('pergunta_fato', familia, persona).slice(0, 2))], persona);
    } else if (intencao === 'pergunta_factual') {
      const eSigno = /\bsigno\b/i.test(pessoa);
      opcoes = filtrarInfantil(eSigno ? RESPOSTAS_FATUAL.signo : RESPOSTAS_FATUAL.mora, persona);
    }
  }

  // Se a abertura já perguntou ("É seu amigo?"), a resposta entra sem outra pergunta
  // e sem outro convite pra contar mais: era o "me conta" depois do "me conta".
  const jaPerguntou = () => bolhas.some(bolha => /\?\s*$/.test(bolha.trim()));
  if (jaPerguntou()) {
    const semPergunta = opcoes.filter(opcao => !/\?\s*$/.test(opcao));
    const semConvite = semPergunta.filter(opcao => !PEDE_MAIS.test(opcao));
    opcoes = semConvite.length ? semConvite : (semPergunta.length ? semPergunta : opcoes);
  }
  // Resposta seca não vem com "meu bem" nem carinha: o tom acompanha o estado.
  if (seca && !cortou) {
    const semAconchego = opcoes.filter(opcao => !/meu bem|meu amor|benzinho|carinho|viu\b|😊|😍|🥰|😘|💛|❤️|querid/i.test(opcao));
    if (semAconchego.length) opcoes = semAconchego;
  }
  const principalBase = cortou ? '' : preencherEscolhido(opcoes, rand);
  let principal = intencao === 'saudacao' || intencao === 'despedida' ? principalBase : abrirNatural(principalBase, rand, persona);

  // Depois de reagir, ela conta a vez dela na mesma pergunta — como quem
  // devolve a resposta na conversa ("já comi, e você?" → "eu ainda nem comi...").
  if (respondendoAberta && !devolvePergunta && !seca) {
    const minhaVez = preencherEscolhido([...(MINHA_VEZ[temaAberta] || []), ...MINHA_VEZ.geral], rand);
    bolhas.push(minhaVez);
    extraBolhas += 1;
  }

  // 3a. Textão: com a ficha falante e a química construída, às vezes a resposta
  // vem longa de verdade — e chega dividida em duas ou três bolhas, como quem
  // digita um parágrafo por vez no direct.
  let fezTextao = false;
  const bancoTextao = !seca && !cortou && !desviado && !respondendoAberta && principalBase
    ? filtrarInfantil(TEXTAOS[intencao]?.[familia] || [], persona)
    : [];
  const chanceTextao = 0.08 + persona.traits.verbosidade * 0.26 + (estagioAntes.indice >= 2 ? 0.08 : 0);
  let partesTextao = 0;
  if (bancoTextao.length && rand() < chanceTextao) {
    const textao = preencherEscolhido(bancoTextao, rand);
    const partes = dividirEmBolhas(textao, 3, Math.max(persona.fala.tamanho, 130));
    principal = partes[0];
    for (const parte of partes.slice(1)) { bolhas.push(parte); extraBolhas += 1; }
    partesTextao = partes.length - 1;
    fezTextao = true;
    eventos.push('textao');
  }

  // 3b. Ponte de memória: puxa algo que você contou, de vez em quando. A bolha
  // é guardada e entra junto da resposta — memória dela nunca fica de fora.
  let ponteMemoria = '';
  if (!seca && !cortou && state.lembrancas.length && rand() < 0.28 && sentimento !== 'negativo') {
    const lembranca = recuperarMemorias(state, pessoa, 3)[0] || state.lembrancas[state.lembrancas.length - 1];
    const modelos = PONTES.find(ponte => ponte.tipo === lembranca.tipo)?.modelos || PONTES[0].modelos;
    ponteMemoria = preencherEscolhido(modelos, rand, { valor: lembranca.valor });
    eventos.push(`memoria:${lembranca.tipo}`);
  }

  // 3c. Complemento de personalidade para quem escreve muito.
  if (!seca && !cortou && rand() < (persona.traits.verbosidade - 0.5) * 0.9 && efetivo !== 'amizade') {
    // Assunto pesado não recebe "já almoçou?" no meio: o complemento também acolhe.
    const complemento = sentimento === 'negativo'
      ? COMPLEMENTOS_APOIO
      : efetivo === 'provocante' || efetivo === 'intenso' ? COMPLEMENTOS_PICANTES : COMPLEMENTOS;
    const cabem = jaPerguntou() ? complemento.filter(texto => !/\?\s*$/.test(texto) && !PEDE_MAIS.test(texto)) : complemento;
    bolhas.push(preencherEscolhido(cabem.length ? cabem : complemento, rand));
  } else if (!seca && !cortou && humor === 'fechada' && rand() < 0.4) {
    bolhas.push(preencherEscolhido(ehMadura(persona) ? COMPLEMENTOS_FECHADA_ADULTA : COMPLEMENTOS_FECHADA, rand));
  }

  // 3d. Voz da relação: tia dá conselho, quem cuida pergunta da rotina e a
  // família entra no papo de vez em quando (só com o vínculo cadastrado).
  if (!seca && !cortou && (relacao.ehTia || relacao.veCrianca)) {
    const tia = relacao.veCrianca ? COMPLEMENTOS_TIA : COMPLEMENTOS_TIA.filter(item => !/você é novo/i.test(item));
    if (rand() < 0.34) bolhas.push(preencherEscolhido(filtrarInfantil(tia, persona), rand));
  }
  if (!seca && !cortou && relacao.veCrianca && rand() < 0.32) bolhas.push(preencherEscolhido(PAPO_CRIANCA, rand));
  if (!seca && !cortou && relacao.familiares.length && rand() < 0.24) bolhas.push(preencherEscolhido(FALAS_FAMILIA, rand));

  // 4. Pergunta de volta, com assunto novo (nunca repetindo a mesma pergunta).
  let temaBase = temas[Math.floor(rand() * temas.length)] || 'dia';
  if (relacao.veCrianca && rand() < 0.5) temaBase = 'casa_adulta';
  else if (relacao.ehTia && rand() < 0.3) temaBase = 'descanso';
  // Ela acabou de responder a pergunta aberta? Aprofunda no mesmo assunto em
  // vez de pular para um tema aleatório — é o que mantém o papo com nexo.
  if (respondendoAberta && aberta && PERGUNTAS[aberta.tema] && rand() < 0.55) temaBase = aberta.tema;
  const temaExtra = temaBase === 'igreja' ? 'fe' : temaBase === 'vida adulta' ? 'casa_adulta' : temaBase;
  // Alguém que você citou antes pode voltar na conversa, como na vida real.
  const pessoasLembradas = state.pessoas || [];
  const voltaPessoa = !criancaLimitada && !seca && !cortou && pessoasLembradas.length > 0 && rand() < 0.22
    ? pessoasLembradas[Math.floor(rand() * pessoasLembradas.length)]
    : '';
  const poolPerguntas = [
    ...(PERGUNTAS[temaBase] || []), ...(MAIS_PERGUNTAS[temaBase] || []),
    ...(ehMadura(persona) ? MAIS_PERGUNTAS_MADURA[temaBase] || [] : []),
    ...(temaExtra !== temaBase ? [...(PERGUNTAS[temaExtra] || []), ...(MAIS_PERGUNTAS[temaExtra] || [])] : []),
    ...PERGUNTAS.dia,
  ].filter((pergunta, indice, lista) => lista.indexOf(pergunta) === indice && !state.perguntas.includes(pergunta));
  // Assunto pesado não recebe "você almoçou?": a pergunta de volta é de cuidado.
  const poolApoio = sentimento === 'negativo'
    ? PERGUNTAS_APOIO.filter(pergunta => !state.perguntas.includes(pergunta))
    : [];
  const perguntasCabiveis = poolApoio.length ? poolApoio : poolPerguntas;
  // Sem paciência ninguém puxa assunto novo; com bastante, ela puxa mais.
  const chancePergunta = (0.3 + persona.traits.curiosidade * 0.42 - (humor === 'fechada' ? 0.3 : 0))
    * (intencao === 'despedida' ? 0.35 : 1) * (seca ? 0.2 : paciencia >= 8 ? 1.15 : 1);
  let perguntaNova: string | undefined;
  let textoPerguntaNova = '';
  // De vez em quando ela volta numa pessoa que você citou e ficou na memória dela.
  if (voltaPessoa && rand() < 0.5) {
    const modelo = LEMBRETE_PESSOA[Math.floor(rand() * LEMBRETE_PESSOA.length)];
    perguntaNova = modelo.replace('{pessoa}', voltaPessoa);
    usados.push(perguntaNova);
    modelosUsados.push(perguntaNova);
    bolhas.push(preencher(modelo, ctx, { pessoa: voltaPessoa }));
    eventos.push('pessoa:lembrete');
  } else if (bolhas.some(bolha => /\?\s*$/.test(bolha.trim()))) {
    // A resposta já terminou perguntando: outra pergunta em cima vira interrogatório.
  } else if (perguntasCabiveis.length && rand() < chancePergunta) {
    perguntaNova = perguntasCabiveis[Math.floor(rand() * perguntasCabiveis.length)];
    usados.push(perguntaNova);
    modelosUsados.push(perguntaNova);
    textoPerguntaNova = preencher(perguntaNova, ctx);
    bolhas.push(textoPerguntaNova);
  }

  // 5. Ajusta o tamanho: respostas curtas ficam curtas; falantes ganham sombra extra.
  if (!fezTextao && principal.length > persona.fala.tamanho * 1.5) {
    const partes = dividirEmBolhas(principal, 2, persona.fala.tamanho);
    principal = partes[0];
    if (partes[1] && bolhas.length < persona.fala.bolhas[1] + 1) bolhas.push(partes[1]);
  }
  bolhas.splice(Math.min(inicioResposta, bolhas.length), 0, principal);
  if (ponteMemoria) {
    const indicePonte = Math.min(inicioResposta + 1 + (fezTextao ? partesTextao : 0), bolhas.length);
    bolhas.splice(indicePonte, 0, ponteMemoria);
    extraBolhas += 1;
  }
  // A abertura (reação de nome, por exemplo) pode já ter perguntado: nesse caso
  // o convite à conversa sai, porque ninguém faz duas perguntas seguidas.
  if (textoPerguntaNova) {
    const perguntas = bolhas.filter(texto => /\?\s*$/.test(texto.trim()));
    if (perguntas.length > 1) {
      const indice = bolhas.indexOf(textoPerguntaNova);
      if (indice >= 0) { bolhas.splice(indice, 1); perguntaNova = undefined; textoPerguntaNova = ''; }
    }
  }
  // Se ela perguntou algo nesta resposta, fica pendente: a mensagem seguinte
  // do usuário é lida como resposta a essa pergunta (perguntaAberta no estado).
  const perguntaAbertaNova = perguntaNova && textoPerguntaNova ? { tema: temaBase, texto: perguntaNova } : undefined;
  if (!seca && !cortou && persona.traits.verbosidade > 0.68 && rand() < 0.1) {
    bolhas.push(preencherEscolhido(SOMBRAS[familia], rand));
  }

  // 4c. Enfeite repetido entrega resposta montada em pedaços: uma interjeição por
  // mensagem, um "viu" no fim e nenhuma frase-chave duas vezes na mesma leva.
  const INTERJEICAO = /^(eita|credo|juro|nossa|nossa senhora|oxe|oxi|ué|ue|gente|meu deus|pronto|poxa|vixe|sério|serio|escuta|olha|sabe|ai|ah)\b[,!.\s]*/i;
  const FRASES_CHAVE = /(sinto muito|fico triste|que situa[çc][ãa]o|conta comigo|t[ôo] aqui|estou aqui|vem c[áa]|isso pesa|n[ãa]o [ée] f[áa]cil|eu entendo|t[áa] certo|combinado)/i;
  const enxutas: string[] = [];
  let jaTemInterjeicao = false;
  let jaTemViu = false;
  bolhas.forEach((texto, indice) => {
    let saida = texto;
    if (INTERJEICAO.test(saida.trim())) {
      if (jaTemInterjeicao) {
        const limpo = saida.trim().replace(INTERJEICAO, '');
        saida = limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : saida;
      } else jaTemInterjeicao = true;
    }
    if (/,?\s*\bviu[.!?]?$/i.test(saida.trim())) {
      if (jaTemViu) saida = saida.trim().replace(/,?\s*\bviu[.!?]?$/i, '').replace(/\s+([.!?])/g, '$1');
      else jaTemViu = true;
    }
    const anteriores = bolhas.slice(0, indice).map(bolha => normalizeText(bolha)).join(' | ');
    const encontro = normalizeText(saida).match(new RegExp(FRASES_CHAVE.source, 'i'));
    if (encontro && anteriores.includes(normalizeText(encontro[0]))) {
      const semRepetida = saida
        .replace(new RegExp(FRASES_CHAVE.source, 'i'), '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.!?])/g, '$1')
        .replace(/([,;:])\s*([.!?])/g, '$2')
        .replace(/^[\s,;:.]+/, '')
        .trim();
      if (semRepetida) saida = semRepetida.charAt(0).toUpperCase() + semRepetida.slice(1);
    }
    enxutas.push(saida);
  });
  bolhas.splice(0, bolhas.length, ...enxutas);
  const finais = bolhas.filter(Boolean).slice(0, cortou ? 1 : seca ? 2 : persona.fala.bolhas[1] + (desviado ? 1 : 0) + extraBolhas);
  // Fecho natural: só quando o papo flui e ela não está marcando limite.
  if (!desviado && !seca && !cortou && finais.length > 1 && rand() < 0.1) {
    const ultima = finais[finais.length - 1].trim();
    // Fecho só fecha afirmação: pergunta fica sem remate para não virar conversa torta.
    const parecePergunta = /\?/.test(ultima) || /^(o que|qual|quando|onde|como|quem|por que|porque|você|voce|vc|tá|ta|quer|vamos|bora|me conta|me fala|me diz|conta|fala|diz)\b/i.test(ultima);
    const fechos = FECHOS.filter(fecho => !/vou levar isso pro dia|olha o que você faz comigo/.test(fecho));
    if (!parecePergunta) {
      const fecho = fechos[Math.floor(rand() * fechos.length)];
      // Fecho entra como mensagem própria, do jeito que a gente manda no zap.
      finais.push(`${fecho.charAt(0).toUpperCase()}${fecho.slice(1)}`);
    }
  }
  const atrasos = montarAtrasos(finais, persona, rand, input.rapido, humor, input.pausado);

  // 6. Atualiza a memória da conversa.
  const novas = extrairMemorias(pessoa);
  const lembrancas = lembrar(state, novas);
  const topicos = { ...state.topicos };
  temas.forEach(tema => { topicos[tema] = pessoa.slice(0, 90); });
  const recentes = [...state.recentes, ...finais].slice(-16);
  const usadosAtualizados = [...state.usados, ...modelosUsados].slice(-160);
  const proximoState: ChatState = {
    ...state,
    afinidade,
    mensagens: state.mensagens + 1,
    humor,
    tom: efetivo,
    topicos,
    lembrancas,
    perguntas: perguntaNova ? [...state.perguntas, perguntaNova].slice(-30) : state.perguntas,
    recentes,
    usados: usadosAtualizados,
    pessoas: [...(state.pessoas || []), ...nomesNovos.filter(nome => !(state.pessoas || []).includes(nome))].slice(-8),
    perguntaAberta: perguntaAbertaNova,
    ofensas: intencao === 'provocacao' || intencao === 'flerte_forte' || intencao === 'pedido_foto' || cortou ? state.ofensas + 1 : Math.max(0, state.ofensas - 1),
    paciencia,
    gatilhos,
    ultimaMensagem: new Date().toISOString(),
  };

  const estagioDepois = estagioAtual(proximoState);
  if (estagioDepois.id !== estagioAntes.id && estagioDepois.indice > estagioAntes.indice) {
    eventos.push(`estagio:${estagioDepois.id}`);
    gatilhos.push('ficou mais próxima');
  }
  const estadoFinal: EstadoEmocional = {
    humor, paciencia, afinidade, estagio: estagioDepois, gatilhos,
    leitura: descreverEstado({ humor, paciencia, afinidade }),
  };

  return {
    bolhas: finais.map((texto, i) => ({ texto, atraso: atrasos[i] })),
    state: proximoState,
    humor,
    tom: efetivo,
    tomPedido,
    intencao,
    sentimento,
    afinidade,
    estagio: estagioDepois,
    eventos,
    desviado,
    estado: estadoFinal,
    estruturado: montarEstadoEstruturado({ estado: estadoFinal, bolhas: finais }),
  };
}

// ---------------------------------------------------------------------------
// Sugestões, análise e exportação
// ---------------------------------------------------------------------------

export interface SugestaoContexto {
  person: Person;
  persona?: Persona;
  state: ChatState;
  historico?: ChatMessage[];
  adulto?: boolean;
  quantas?: number;
  rand?: () => number;
  agora?: Date;
  /** Estilo do chat (Ajustes → Conversas) — as sugestões seguem o mesmo ajuste. */
  abreviar?: boolean;
  emojis?: boolean;
  pausado?: boolean;
  /** Catálogo e idade do dono: deixam as sugestões coerentes com a relação. */
  pessoas?: Person[];
  dono?: { ownerAge?: number | null; ownerBirthday?: string | null } | null;
  relacao?: Relacao;
}

/** Aberturas prontas para começar (ou recomeçar) a conversa. */
export function sugerirAberturas(ctx: SugestaoContexto): Sugestao[] {
  const rand = ctx.rand || Math.random;
  const persona = ctx.persona || buildPersona(ctx.person, { people: ctx.pessoas, settings: ctx.dono });
  const relacao = ctx.relacao || persona.relacao;
  const historico = ctx.historico || [];
  const estado = ctx.state;
  const diasSemFalar = historico.length ? Math.floor((Date.now() - Date.parse(historico[historico.length - 1].timestamp || new Date().toISOString())) / 86400000) : 0;
  const chaves: (keyof typeof ABERTURAS)[] = [];
  const aniversario = ctx.person.aniversario ? (() => { try { const [, mes, dia] = ctx.person.aniversario!.split('-').map(Number); const hoje = new Date(); const alvo = new Date(hoje.getFullYear(), mes - 1, dia); const dias = Math.round((alvo.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86400000); return dias >= -1 && dias <= 7; } catch { return false; } })() : false;
  if (aniversario) chaves.push('aniversario');
  if (!historico.length) chaves.push('primeira');
  else if (diasSemFalar >= 5) chaves.push('retorno');
  if (estado.afinidade >= 62) chaves.push('especial');
  else if (estado.afinidade >= 30) chaves.push('proxima');
  chaves.push('interesse', 'convite');
  if (relacao.familiar || relacao.ehTia || relacao.veCrianca) chaves.push('familia');
  const permitido = tonsDisponiveis(persona, estado, !!ctx.adulto, relacao);
  const sugestoes: Sugestao[] = [];
  for (const chave of chaves) {
    for (const sugestao of ABERTURAS[chave] || []) {
      const tomOk = permitido.find(tom => tom.id === sugestao.tom)?.ok;
      if (!tomOk) continue;
      sugestoes.push(sugestao);
    }
  }
  const embaralhadas = [...sugestoes].sort(() => rand() - 0.5);
  const quantas = ctx.quantas || 4;
  return embaralhadas.slice(0, quantas).map(sugestao => ({
    ...sugestao,
    texto: trocarMarcadores(sugestao.texto, persona, rand, ctx.person.musicaFavorita, { nomeUsuario: persona.primeiro })
      .replace(/\{vc\}/g, persona.fala.vocativos[2] || persona.primeiro),
  }));
}

/** Sugestões de resposta com base no que ela acabou de mandar. */
export function sugerirRespostas(input: { person: Person; persona?: Persona; state: ChatState; mensagemDela: string; adulto?: boolean; quantas?: number; rand?: () => number; tom?: Tone; pessoas?: Person[]; dono?: { ownerAge?: number | null; ownerBirthday?: string | null } | null; relacao?: Relacao }): Sugestao[] {
  const rand = input.rand || Math.random;
  const persona = input.persona || buildPersona(input.person, { people: input.pessoas, settings: input.dono });
  const relacao = input.relacao || persona.relacao;
  const adulto = !!input.adulto;
  const permitido = tonsDisponiveis(persona, input.state, adulto, relacao);
  const texto = normalizeText(input.mensagemDela);
  let chave = 'ela-neutra';
  // A chave sai do que ela escreveu, nao do humor guardado: quem cuidou de voce
  // merece sugestao de agradecimento, nao de dar espaco.
  const curtaOuFechada = texto.trim().split(/\s+/).length <= 8
    || /\b(tô meio baixa|to meio baixa|desculpa a secura|cabeça em outra coisa|cabeca em outra coisa|deixa pra depois|depois eu falo|não tô bem|nao to bem|hoje não|hoje nao)\b/.test(texto);
  if (/\b(sinto muito|conta comigo|tô aqui|estou aqui|me conta com calma|vamos por partes|respira|descansa|bebe água|bebe agua|fica calmo|fica bem|tenta deitar|noite ruim|isso pesa|quer conselho|pode desabafar|desabafar|escuto|do seu lado|sem julgar|cuida de você|sem cobrança|não precisa carregar|nao precisa carregar|vou te escutar)\b/.test(texto)) chave = 'ela-apoiou';
  else if (curtaOuFechada && input.state.humor === 'fechada') chave = 'ela-fechada';
  else if (/\b(mãe|mae|pai|filho|filha|irmã|irma|irmão|irmao|família|familia|tia|vó|vo)\b/.test(texto)) chave = 'ela-familia';
  else if (/\?|^(qu|como|qual|quando|onde|por que|porque|quem)/.test(texto)) chave = 'ela-perguntou';
  else if (/\b(convite|vamos|bora|sair|encontro|café|cinema|jantar|topa)\b/.test(texto)) chave = 'ela-convidou';
  else if (/\b(linda|lindo|gostei|adorei|fofo|incrível|maravilh)/.test(texto)) chave = 'ela-elogiou';
  else if (/\b(saudade|pensando em você|queria você aqui)\b/.test(texto)) chave = 'ela-saudade';
  else if (/\b(tô|estou|foi|aconteceu|hoje|trabalho|corrido|cansa)\b/.test(texto)) chave = 'ela-contou';
  const banco = RESPOSTAS_SUGERIDAS[chave] || {};
  const daVoz = MAIS_SUGESTOES[chave] || {};
  const extra = MAIS_SUGESTOES_EXTRA[chave] || {};
  const reforco: { amizade: string[]; flerte: string[]; picante: string[] } = { amizade: [], flerte: [], picante: [] };
  (['amizade', 'flerte', 'picante'] as const).forEach(familia => {
    reforco[familia] = [...(daVoz[familia] || []), ...(extra[familia] || [])];
  });
  const familiar = persona.familiares[0];
  const preencherSugestao = (linha: string) => trocarMarcadores(linha, persona, rand, input.person.musicaFavorita, {
    nomeUsuario: persona.primeiro,
    familiar: familiar?.nome,
    papel: familiar?.papel,
    idade: persona.idade !== null ? String(persona.idade) : undefined,
    vinculo: relacao.vinculoComigo.toLowerCase(),
  }).replace(/\{vc\}/g, persona.fala.vocativos[2] || 'você');
  const rotulos: Record<string, string> = {
    'ela-perguntou': 'Responder a pergunta e devolver', 'ela-contou': 'Mostrar interesse no que ela contou',
    'ela-convidou': 'Fechar o convite', 'ela-fechada': 'Dar espaço com cuidado', 'ela-apoiou': 'Agradecer o cuidado e seguir',
    'ela-elogiou': 'Agradecer e retribuir', 'ela-saudade': 'Corresponder a saudade',
    'ela-familia': 'Cuidar do assunto da família', 'ela-neutra': 'Manter o papo andando',
  };
  const tomDaFamilia: Record<Familia, Tone> = { amizade: 'amizade', flerte: 'flerte', picante: 'provocante' };
  const candidatos: { texto: string; tom: Tone }[] = [];
  for (const familia of ['amizade', 'flerte', 'picante'] as Familia[]) {
    if (!permitido.find(item => item.id === tomDaFamilia[familia])?.ok) continue;
    for (const linha of [...(banco[familia] || []), ...(reforco[familia] || [])]) candidatos.push({ texto: preencherSugestao(linha), tom: tomDaFamilia[familia] });
  }
  const quantas = input.quantas || 3;
  const saida: Sugestao[] = [];
  const vistos = new Set<string>();
  // Ficha adulta não recebe sugestão de molecagem, e a ordem muda a cada troca.
  const liberados = repertorioAdulto(persona) ? candidatos.filter(item => !INFANTIL.some(padrao => padrao.test(item.texto))) : candidatos;
  const pool = [...(liberados.length ? liberados : candidatos)].sort(() => rand() - 0.5);
  // O giro sai do tamanho do histórico: trocar de mensagem não devolve as mesmas
  // sugestões de novo.
  const giro = (input.state.recentes.length + input.state.perguntas.length + (input.state.pessoas?.length || 0)) % (pool.length || 1);
  const poolGiratorio = giro ? [...pool.slice(giro), ...pool.slice(0, giro)] : pool;

  // Uma sugestão de cada tom liberado, depois completa com as outras opções.
  for (const tom of ['amizade', 'flerte', 'provocante'] as Tone[]) {
    if (saida.length >= quantas) break;
    const lista = poolGiratorio.filter(item => item.tom === tom);
    if (!lista.length) continue;
    const escolhida = lista[Math.floor(rand() * lista.length)];
    vistos.add(escolhida.texto);
    saida.push({ texto: escolhida.texto, motivo: rotulos[chave] || 'Mantém o papo andando', tom });
  }
  while (saida.length < quantas) {
    const aberturas = new Set(saida.map(item => normalizeText(item.texto).split(' ').slice(0, 3).join(' ')));
    const restantes = poolGiratorio.filter(item => !vistos.has(item.texto)
      && !aberturas.has(normalizeText(item.texto).split(' ').slice(0, 3).join(' ')));
    if (!restantes.length) break;
    const escolhida = restantes[Math.floor(rand() * restantes.length)];
    vistos.add(escolhida.texto);
    saida.push({ texto: escolhida.texto, motivo: rotulos[chave] || 'Mantém o papo andando', tom: escolhida.tom });
  }
  if (!saida.length) {
    saida.push({ texto: 'Entendi! Me conta mais sobre isso?', motivo: 'Mantém a conversa viva', tom: 'amizade' });
  }
  return saida;
}

export interface ConversationAnalysis {
  total: number;
  doUsuario: number;
  dela: number;
  caracteresUsuario: number;
  caracteresDela: number;
  iniciaUsuario: number;
  iniciaEla: number;
  dias: number;
  ultima: string;
  temas: { tema: string; vezes: number }[];
  perguntasDela: number;
  elogios: number;
  equilibrado: boolean;
  media: { usuario: number; ela: number };
}

/** Métricas honestas de uma conversa salva. */
export function analisarConversa(messages: ChatMessage[]): ConversationAnalysis {
  const usuario = messages.filter(mensagem => mensagem.role === 'user');
  const dela = messages.filter(mensagem => mensagem.role === 'them');
  const dias = new Set(messages.map(mensagem => (mensagem.timestamp || '').slice(0, 10))).size;
  const contagem = new Map<string, number>();
  for (const mensagem of messages) {
    for (const tema of temasDoTexto(mensagem.text || '')) contagem.set(tema, (contagem.get(tema) || 0) + 1);
  }
  const ordenadas = [...messages].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  let iniciaUsuario = 0, iniciaEla = 0;
  let anterior = '';
  for (const mensagem of ordenadas) {
    const dia = (mensagem.timestamp || '').slice(0, 10);
    if (dia !== anterior) { if (mensagem.role === 'user') iniciaUsuario++; else iniciaEla++; anterior = dia; }
  }
  const caracteresUsuario = usuario.reduce((soma, mensagem) => soma + (mensagem.text || '').length, 0);
  const caracteresDela = dela.reduce((soma, mensagem) => soma + (mensagem.text || '').length, 0);
  return {
    total: messages.length,
    doUsuario: usuario.length,
    dela: dela.length,
    caracteresUsuario,
    caracteresDela,
    iniciaUsuario,
    iniciaEla,
    dias,
    ultima: ordenadas[ordenadas.length - 1]?.timestamp || '',
    temas: [...contagem.entries()].map(([tema, vezes]) => ({ tema, vezes })).sort((a, b) => b.vezes - a.vezes).slice(0, 6),
    perguntasDela: dela.filter(mensagem => /\?/.test(mensagem.text || '')).length,
    elogios: usuario.filter(mensagem => /\b(linda|lindo|bonita|bonito|gata|gato|incrível|incrivel|maravilh|fofa)\b/i.test(mensagem.text || '')).length,
    equilibrado: usuario.length > 0 && dela.length > 0 && Math.abs(usuario.length - dela.length) / Math.max(usuario.length, dela.length) < 0.5,
    media: { usuario: usuario.length ? Math.round(caracteresUsuario / usuario.length) : 0, ela: dela.length ? Math.round(caracteresDela / dela.length) : 0 },
  };
}

export function conversaParaMarkdown(person: Person, messages: ChatMessage[]) {
  const linhas = [`# Conversa com ${person.nome}`, '', `Exportada em ${new Date().toLocaleString('pt-BR')} · ${messages.length} mensagens`, ''];
  let dia = '';
  for (const mensagem of [...messages].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))) {
    const atual = (mensagem.timestamp || '').slice(0, 10);
    if (atual !== dia) { dia = atual; linhas.push('', `## ${new Date(`${atual}T12:00:00`).toLocaleDateString('pt-BR')}`, ''); }
    const hora = (mensagem.timestamp || '').slice(11, 16);
    const autor = mensagem.role === 'user' ? 'Você' : mensagem.role === 'them' ? person.nome.split(' ')[0] : 'Sistema';
    linhas.push(`- **${autor}** (${hora}): ${mensagem.text}`);
  }
  const analise = analisarConversa(messages);
  linhas.push('', '## Resumo', '', `- Mensagens suas: ${analise.doUsuario}`, `- Mensagens dela: ${analise.dela}`, `- Dias de conversa: ${analise.dias}`, `- Temas mais citados: ${analise.temas.map(t => t.tema).join(', ') || 'ainda nenhum'}`);
  return linhas.join('\n');
}

/** Cartão de leitura rápida da persona (mostrado no cabeçalho do chat). */
export function cartaoDaPersona(persona: Persona) {
  const { relacao } = persona;
  return {
    titulo: `${persona.nome}${persona.idade ? `, ${persona.idade}` : ''}`,
    resumo: persona.resumo,
    marcadores: persona.marcadores,
    interesses: persona.interesses.map(interesse => interesse.label),
    contexto: persona.contexto,
    adulta: persona.adulta,
    estilo: persona.estilo,
    relacao: relacao.rotulo,
    relacaoDescricao: relacao.descricao,
    tratamento: relacao.tratamento,
    familiares: relacao.familiares.map(item => `${item.papel}: ${item.nome}`),
    flertePermitido: relacao.flertePermitido,
    adultoPermitido: relacao.adultoPermitido,
    assinatura: persona.assinatura,
    marcaRegistrada: persona.assinatura?.descricao || '',
    aberturas: persona.assinatura?.aberturas || [],
    bordoes: persona.assinatura?.bordoes || [],
  };
}

/** Resumo pronto da relação, usado em telas e no cartão da conversa. */
export function resumoDaRelacao(relacao: Relacao) {
  return {
    rotulo: relacao.rotulo,
    descricao: relacao.descricao,
    motivoLimite: motivoDoLimite(relacao),
    tratamento: relacao.tratamento.join(', '),
    familiares: relacao.familiares.map(item => `${item.papel}: ${item.nome}`),
  };
}

/** Ficha completa em texto — útil para revisar antes de um encontro. */
export function resumoPessoaEmTexto(person: Person, data: AppData) {
  const idade = person.idade ?? null;
  const linhas: string[] = [];
  linhas.push(`${person.nome}${person.apelido ? ` (${person.apelido})` : ''}${idade ? `, ${idade} anos` : ''}`);
  if (person.descricao) linhas.push(person.descricao);
  if (person.comoConheceu) linhas.push(`Como se conheceram: ${person.comoConheceu}`);
  if (person.musicaFavorita) linhas.push(`Música favorita: ${person.musicaFavorita}`);
  if (person.signo) linhas.push(`Signo: ${person.signo}`);
  if (person.tags.length) linhas.push(`Etiquetas: ${person.tags.join(', ')}`);
  if (person.comportamento) linhas.push(`Comportamento: ${person.comportamento}`);
  if (person.observacoesGerais) linhas.push(`Observações: ${person.observacoesGerais}`);
  const lembretes = data.reminders.filter(lembrete => lembrete.personId === person.id && !lembrete.concluido);
  if (lembretes.length) linhas.push(`Lembretes abertos: ${lembretes.map(lembrete => lembrete.titulo).join(' · ')}`);
  return linhas.join('\n');
}

export const pessoaAdulta = (person: Person) => isAdult(person) && (person.idade ?? 0) >= INTIMATE_MIN_AGE;

// ---------------------------------------------------------------------------
// Estado emocional e prompt de sistema (reexportados para a interface)
// ---------------------------------------------------------------------------

export {
  EMOJI_HUMOR, PACIENCIA_BAIXA, PACIENCIA_INICIAL, PACIENCIA_MAXIMA, ROTULO_HUMOR, ROTULO_PACIENCIA,
  descreverEstado, montarEstadoEstruturado, pacienciaDe, promptDoSistema, recuperarMemorias, resumirMemorias,
} from './estado';
export type { EstadoEmocional, EstadoEstruturado, MemoriaItem } from './estado';
