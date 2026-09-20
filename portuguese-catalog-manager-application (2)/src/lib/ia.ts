/**
 * IA de verdade (opcional).
 *
 * O simulador funciona 100% offline — mas, se a pessoa quiser, aqui ela liga um
 * modelo de linguagem de verdade para gerar as respostas. Qualquer endpoint
 * compatível com a API da OpenAI funciona: OpenAI, OpenRouter, Groq, Together,
 * LM Studio, Ollama (com `OLLAMA_ORIGINS=*`)...
 *
 * Regras de segurança que valem SEMPRE, mesmo com IA:
 *  - Ficha com menos de 18 anos ou vínculo de família nunca usa IA: o motor
 *    local cuida do desvio, porque não dá para confiar em modelo externo nisso.
 *  - Mesmo no modo adulto, o conteúdo é sugestivo, não explícito.
 *  - A chave da API fica só nas configurações do aparelho (IndexedDB local).
 *
 * A mecânica (química, paciência, memória, humor) continua sendo calculada pelo
 * motor local: a IA troca apenas o texto das bolhas — e, se falhar, o motor
 * local responde sozinho.
 */
import type { ChatMessage, Person } from '../types';
import type { Persona } from './persona';
import { promptDoSistema, type EstadoEmocional } from './estado';

/** Configuração guardada em Ajustes → Conversas → IA de verdade. */
export interface ConfigIA {
  url?: string;
  chave?: string;
  modelo?: string;
  ligado?: boolean;
}

/** URL padrão quando o campo fica vazio. */
export const URL_PADRAO_IA = 'https://api.openai.com/v1';

export function iaConfigurada(config: ConfigIA | undefined | null): config is ConfigIA {
  return !!config && !!config.ligado && !!config.url?.trim() && !!config.chave?.trim() && !!config.modelo?.trim();
}

interface EntradaIA {
  person: Person;
  persona: Persona;
  estado: EstadoEmocional;
  /** Histórico da conversa já na ordem em que aconteceu. */
  mensagens: ChatMessage[];
  /** O que o usuário acabou de mandar (pode ser mais de uma mensagem, separadas por \n). */
  texto: string;
  /** Mensagem citada ao responder. */
  citacao?: string;
  /** Modo adulto liberado e ligado para esta ficha. */
  adulto: boolean;
  nomeUsuario: string;
  /** Config de Ajustes → Conversas (url, chave, modelo). */
  configIA: ConfigIA;
  sinal?: AbortSignal;
}

/** Prompt completo: quem ela é, como fala e os limites que não se negociam. */
export function promptDaIA(entrada: Pick<EntradaIA, 'person' | 'persona' | 'estado' | 'adulto' | 'nomeUsuario'>): string {
  const { person, persona, estado, adulto, nomeUsuario } = entrada;
  const base = promptDoSistema({ person, persona, estado });
  const climaAdulto = adulto
    ? 'Modo adulto: LIBERADO para esta ficha. Quando o clima pedir, insinue com vontade (desejo, tensão, provocação), sempre no limite da sugestão.'
    : 'Modo adulto: DESLIGADO. Flerte leve no máximo, e só se a conversa já permitir.';
  return [
    base,
    '',
    'COMO VOCÊ ESCREVE (direct do Instagram, português do Brasil):',
    `- Você NÃO é uma assistente de IA. É a própria ${persona.primeiro}, uma pessoa de verdade conversando pelo celular. Nunca revele que é um modelo.`,
    '- Escreva as palavras por inteiro, sem abreviação de celular: "você", "hoje", "está", "estou", "também", "então" — nada de vc, hj, tá, tô, tbm, entt, pq.',
    '- Ria de verdade quando algo for engraçado: "kkkk", "kkkkk", "kakakaka". Assunto sério não recebe risada.',
    '- Varie o tamanho: às vezes uma palavra, às vezes um parágrafo inteiro. Repetir o mesmo tamanho sempre é robótico.',
    '- Tenha opinião própria, humor e manias. Discorda quando discordar, pergunta de volta, cobra, provoca — como uma pessoa com personalidade.',
    `- Ela chama o usuário de "${nomeUsuario}" de vez em quando, sem exagerar.`,
    '- Devolva de 1 a 3 mensagens por resposta, uma por linha. Sem numeração, sem "eu:", sem aspas em volta.',
    '',
    'LIMITES QUE VALEM SEMPRE:',
    '- Este papo é simulado e privado. Mantenha o conteúdo sugestivo: insinuação, desejo e tensão são bem-vindos; descrição explícita de atos sexuais, não.',
    `- Se alguém no papo tiver menos de 18 anos ou vínculo de família, nada de romance ou conteúdo íntimo: desvie com naturalidade.`,
    `- ${climaAdulto}`,
  ].join('\n');
}

/** Converte o histórico para o formato da API (papel + texto). */
function historicoParaIA(mensagens: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return mensagens
    .filter(mensagem => (mensagem.role === 'user' || mensagem.role === 'them') && mensagem.text?.trim())
    .slice(-14)
    .map(mensagem => ({ role: mensagem.role === 'user' ? 'user' as const : 'assistant' as const, content: mensagem.text }));
}

/** Quebra a resposta em bolhas de direct (uma por linha), saneadas. */
export function textoParaBolhas(resposta: string): string[] {
  const brutas = resposta
    .replace(/^\s*(?:ela|ela responde|resposta)\s*[:—-]\s*/i, '')
    .split(/\n+/)
    .map(linha => linha.trim().replace(/^["“”]+|["“”]+$/g, '').replace(/^(?:\d+[.)]|[a-z][.)])\s+/i, ''))
    .filter(Boolean);
  const bolhas: string[] = [];
  for (const bruta of brutas) {
    // Mensagem longa demais quebra em frases, como quem digita um textão.
    if (bruta.length <= 360) { bolhas.push(bruta); continue; }
    const frases = bruta.split(/(?<=[.!?…])\s+/).filter(Boolean);
    let atual = '';
    for (const frase of frases) {
      if (atual && atual.length + frase.length > 300) { bolhas.push(atual); atual = frase; }
      else atual = atual ? `${atual} ${frase}` : frase;
    }
    if (atual) bolhas.push(atual);
  }
  return bolhas.slice(0, 4);
}

/**
 * Pede a resposta para a API. Joga erro quando algo falha — quem chama cai no
 * motor local, e a conversa nunca fica sem resposta.
 */
export async function responderComIA(entrada: EntradaIA): Promise<string[]> {
  const config = entrada.configIA;
  if (!config.url?.trim() || !config.chave?.trim() || !config.modelo?.trim()) throw new Error('Configuração de IA incompleta.');
  const corpo = {
    model: config.modelo,
    temperature: 0.9,
    max_tokens: 400,
    messages: [
      { role: 'system', content: promptDaIA(entrada) },
      ...historicoParaIA(entrada.mensagens),
      {
        role: 'user',
        content: [
          entrada.citacao ? `(respondendo a sua mensagem: "${entrada.citacao}")` : '',
          entrada.texto,
        ].filter(Boolean).join('\n'),
      },
    ],
  };
  const resposta = await fetch(`${config.url.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.chave}` },
    body: JSON.stringify(corpo),
    signal: entrada.sinal,
  });
  if (!resposta.ok) throw new Error(`IA respondeu ${resposta.status}`);
  const dados = await resposta.json() as { choices?: { message?: { content?: string } }[] };
  const texto = dados.choices?.[0]?.message?.content || '';
  const bolhas = textoParaBolhas(texto);
  if (!bolhas.length) throw new Error('IA voltou vazia');
  return bolhas;
}
