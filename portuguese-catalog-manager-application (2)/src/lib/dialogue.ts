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
import {
  A,
  ABERTURAS,
  COMPLEMENTOS,
  COMPLEMENTOS_FECHADA,
  COMPLEMENTOS_FECHADA_ADULTA,
  COMPLEMENTOS_PICANTES,
  COMPLEMENTOS_TIA,
  DESVIOS,
  DESVIOS_AMIZADE,
  DO_NADA_CUIDADO,
  DO_NADA_FAMILIA,
  DO_NADA_POR_CATEGORIA,
  F,
  FALAS_FAMILIA,
  LIMITES_CRIANCA,
  LIMITES_FAMILIA,
  LIMITES_MENOR,
  LIMITES_TIA,
  MINHA_VEZ,
  P,
  PAPO_CRIANCA,
  PERGUNTAS,
  PERGUNTA_FATO_FECHO,
  PERGUNTA_FATO_TIPOS,
  PONTES,
  REACAO_RESPOSTA,
  RECEPCOES,
  RECEPCOES_ELOGIO,
  RECEPCOES_QUESTAO,
  RESPOSTAS,
  RESPOSTAS_FATUAL,
  RESPOSTAS_SUGERIDAS,
  RISADAS_REACAO,
  RISADAS_REACAO_MADURA,
  SEM_FAMILIAR,
  SOMBRAS,
  TEMAS_POR_INTERESSE,
  TEXTAOS,
} from './dialogue/bancos';
import type { Familia, Sugestao } from './dialogue/bancos';

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
