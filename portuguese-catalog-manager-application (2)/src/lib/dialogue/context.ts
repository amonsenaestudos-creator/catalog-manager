/**
 * Contextualização: o significado que a conversa em volta dá à mensagem.
 *
 * "uma merda" depois de "fiz a prova hj" não é uma palavrão solto — é
 * "a prova deu ruim". "ele ficou puto" depois de "Pedro brigou com João"
 * tem dois candidatos, e o mais citado tem mais chance. Nada disso é
 * mostrado na tela: é o cérebro lendo o fio, não o texto isolado.
 */

export interface Entidade {
  nome: string;
  tipo: 'pessoa' | 'lugar' | 'coisa';
  /** Ordem em que apareceu (últimas são as mais recentes). */
  quando: number;
}

export interface LeituraPronome {
  pronome: string;
  /** Todos os que o pronome pode estar apontando, do mais recente ao mais antigo. */
  candidatos: string[];
  /** A aposta do motor. */
  provavel: string | null;
  /** 0 a 1: quão seguro é apostar. */
  probabilidade: number;
}

export interface Desambiguacao {
  /** O que o motor entendeu que a mensagem significa. */
  clara: string;
  sentimento: 'positivo' | 'negativo' | 'neutro';
}

export interface ContextoParaEntender {
  topicoAtual: string | null;
  /** A pergunta que ela deixou no ar. */
  ultimaEla: string;
  /** Suas mensagens recentes. */
  ultimasSuas: string[];
}

/**
 * Palavras que, com inicial maiúscula, quase sempre abrem frase — e
 * por isso NUNCA vira nome próprio. (O oposto do problema: é isso que
 * impede "Ontem eu fui..." de criar uma entidade "Ontem".)
 */
const INICIO_DE_FRASE = new Set([
  'Ontem', 'Hoje', 'Amanhã', 'Amanha', 'Agora', 'Depois', 'Semana', 'Mês', 'Mes',
  'Ano', 'Dia', 'Noite', 'Manhã', 'Tarde', 'Vida', 'Mundo', 'Acho', 'Penso',
  'Nao', 'Não', 'Sim', 'Entao', 'Então', 'Mas', 'Que', 'Quando', 'Onde',
  'Porque', 'Por', 'Com', 'Sem', 'Para', 'Pra', 'Pro', 'Se', 'Tambem', 'Também',
  'Muito', 'Pouco', 'Mais', 'Menos', 'Ja', 'Já', 'Ainda', 'Sempre', 'Nunca',
  'Quase', 'Aqui', 'Lá', 'La', 'Isto', 'Isso', 'Aquele', 'Aquela', 'Esse',
  'Essa', 'Este', 'Esta', 'Eu', 'Tu', 'Vc', 'Você', 'Vocês', 'Ela', 'Ele',
  'Nós', 'Nos', 'Minha', 'Meu', 'Minhas', 'Meus', 'Sua', 'Seu', 'Nossa',
  'Nosso', 'Boa', 'Bom', 'Mal', 'Baix[oa]', 'Alta', 'Alto', 'Grande', 'Pequena',
  'Pequeno', 'Ruim', 'Bem', 'Ótimo', 'Otimo', 'Perfeit[oa]', 'Incrível',
  'Incrivel', 'Massa', 'Show', 'Top', 'Legal', 'Difícil', 'Facil', 'Fácil',
  'Fui', 'Fiz', 'Vi', 'Tive', 'Ganhei', 'Perdi', 'Voltei', 'Cheguei',
  'Comecei', 'Terminei', 'Achei', 'Peguei', 'Deixei', 'Fiquei', 'Ficou',
  'Mandei', 'Mandou', 'Enviei', 'Enviou', 'Respondei', 'Respondeu', 'Virei',
  'Mudei', 'Mudou', 'Passei', 'Passou', 'Aconteceu', 'Apareceu', 'Sumiu',
  'Voltou', 'Chamou', 'Chamei', 'Ligou', 'Liguei', 'Escrevi', 'Escreveu',
]);

const chaveDo = (nome: string) =>
  nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Nomes próprios: palavra com inicial maiúscula que não abre frase e não
 * é do nosso vocabulário comum. Nomes já conhecidos (`pessoasConhecidas`)
 * contam mesmo em minúsculas.
 */
export function extrairEntidades(textos: string[], pessoasConhecidas: string[] = []): Entidade[] {
  const resultado: Entidade[] = [];
  const vistas = new Set<string>();
  let contador = 0;

  const registrar = (nome: string) => {
    const chave = chaveDo(nome);
    if (chave.length < 3 || vistas.has(chave)) return;
    vistas.add(chave);
    const entidade: Entidade = { nome, tipo: 'pessoa', quando: contador++ };
    resultado.push(entidade);
  };

  pessoasConhecidas.forEach(registrar);

  for (const texto of textos) {
    for (const m of texto.matchAll(/\b([A-ZÀ-Ý][a-zà-ü]{2,})\b/g)) {
      const palavra = m[1];
      // "Pedro chegou" começa em maiúscula de verdade: quem protege a lista
      // de inícios de frase é a lista de palavras comuns, não a posição.
      if (INICIO_DE_FRASE.has(palavra)) continue;
      registrar(palavra);
    }
  }
  return resultado;
}

const PRONOME_RECENTE = /\b(ele|ela|eles|elas|dele|dela|nele|nela)\b/i;

/**
 * "ele ficou puto": quem é "ele"? O candidato mais citado recentemente
 * leva a melhor — e a probabilidade conta a honestidade da aposta.
 */
export function resolverPronomes(texto: string, entidades: Entidade[]): LeituraPronome | null {
  const m = texto.match(PRONOME_RECENTE);
  if (!m || !entidades.length) return null;
  // Quem foi citado por último costuma ser o dono do pronome.
  const candidatos = entidades.slice(-4).map(e => e.nome);
  const probabilidade = candidatos.length <= 1
    ? 0.9
    : Math.max(0.4, 0.75 - 0.1 * (candidatos.length - 1));
  return {
    pronome: m[1].toLowerCase(),
    candidatos,
    provavel: candidatos[candidatos.length - 1] ?? null,
    probabilidade,
  };
}

/**
 * Regras de desambiguação: o significado que o contexto recente dá a
 * expressões que sozinhas ambíguas. `seTopicos` vazio = vale em qualquer
 * assunto; restrito = só quando o assunto bate.
 */
const ASSUNTOS_ESPECIFICOS = ['prova', 'escola', 'trabalho', 'reuniao', 'chefe', 'jogo', 'filme', 'serie', 'musica', 'show', 'viagem', 'treino'];

const REGRAS_AMBIGUIDADE: { gatilho: RegExp; seTopicos: string[]; precisaTopico?: boolean; clara: string; sentimento: 'positivo' | 'negativo' | 'neutro' }[] = [
  // "é sobre X", "então...", "daí..." sozinhos não dizem nada — com assunto
  // em curso, o contexto é o significado: é continuação, não mensagem perdida.
  // O texto aqui CHEGA COM ACENTO: as duas grafias entram no padrão, e a
  // fronteira é explícita (espaço) — \b não funciona junto de "é" sem /u.
  { gatilho: /^\s*(?:é\s|e\s|então[\s,.!?]|entao[\s,.!?]|daí\s|dai\s|ou seja|na real|resumindo|pra resumir|basicamente|tipo que|sobre (?:isso|essa|esse|o|a|ela|ele)[\s,.!?])/i, seTopicos: [], precisaTopico: true, clara: 'continuação do assunto em andamento', sentimento: 'neutro' },
  // Estado próprio ganha das leituras do assunto: "estou ruim" não é o trabalho.
  { gatilho: /\b(?:estou|to|tô)\s+(?:ruim|doent[ea]|mal|desmaiad[oa]|sufocando)\b/i, seTopicos: [], clara: 'você está passando mal ou se sentindo mal', sentimento: 'negativo' },
  { gatilho: /\b(?:uma |foi |que era )?merda\b|\b(?:péssim[oa]|pessim[oa]|deu ruim|deu errado|decepção|decepcao|decepcionou|fraco|frac[oa])\b/i, seTopicos: ASSUNTOS_ESPECIFICOS, clara: 'a coisa do assunto saiu mal', sentimento: 'negativo' },
  { gatilho: /\b(?:muito bom|ótima|otima|maravilhos[oa]|salvou|massa|top|foi ótim[oa]|foi otim[oa]|perfeit[oa]|amei|gostei|foi bom|foi boa)\b/i, seTopicos: ASSUNTOS_ESPECIFICOS, clara: 'a coisa do assunto foi boa', sentimento: 'positivo' },
  { gatilho: /\b(?:tô|to|estou)\s+(?:com )?fome\b/i, seTopicos: [], clara: 'você está com fome', sentimento: 'neutro' },
];

/**
 * Tenta explicar a mensagem pelo contexto. Devolve null quando o
 * contexto não esclarece — aí o motor segue com a leitura direta
 * (ou, se estiver inseguro, pede esclarecimento de um jeito humano).
 */
export function desambiguarContexto(texto: string, ctx: ContextoParaEntender): Desambiguacao | null {
  for (const regra of REGRAS_AMBIGUIDADE) {
    if (!regra.gatilho.test(texto)) continue;
    const precisaTopico = regra.precisaTopico && !ctx.topicoAtual;
    const topicoOk = regra.seTopicos.length === 0 || regra.seTopicos.includes(ctx.topicoAtual || '');
    if (precisaTopico || !topicoOk) continue;
    return { clara: regra.clara, sentimento: regra.sentimento };
  }
  return null;
}
