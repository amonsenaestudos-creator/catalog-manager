/**
 * Normalização: transformar o que foi digitado no que foi dito.
 *
 * O que a pessoa escreveu continua exatamente igual na conversa — esta
 * camada existe só para o motor entender. "vc viu oq aconteceu kkkk" é
 * lido internamente como "você viu o que aconteceu", e NUNCA corrigido
 * na tela.
 *
 * As regras são dados (dicionários e léxico), não uma árvore de ifs:
 * adicionar gíria nova = adicionar uma linha.
 */
import { abreviacoesNaMensagem, expandirAbreviacoes } from '../abreviacoes';

/** Um erro de digitação que o motor entendeu. */
export interface Correcao {
  /** A palavra como foi digitada. */
  original: string;
  /** O que o motor entendeu que era. */
  sugerido: string;
}

export interface Normalizacao {
  /** Texto com abreviações abertas e erros corrigidos (uso interno). */
  texto: string;
  /** Gírias/abreviações que apareceram, na ordem em que foram escritas. */
  slang: string[];
  /** Correções de erro de digitação aplicadas. */
  erros: Correcao[];
}

/** Sem acento e sem caixa — a base de toda comparação do motor. */
export const semAcentos = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Léxico de português brasileiro do dia a dia (acentos opcionais).
 *
 * Uma correção de erro só é válida se cair numa palavra deste léxico —
 * é isso que permite "escoka" ≈ "escola" sem transformar nomes próprios,
 * neologismos ou gíria viva em outra coisa.
 */
const LEXICO: string[] = [
  // Escola e estudos
  'escola', 'colégio', 'universidade', 'faculdade', 'curso', 'aula', 'aulas',
  'professor', 'professora', 'aluno', 'aluna', 'estudante', 'prova', 'exame',
  'estudar', 'estudei', 'estudo', 'estudou', 'lição', 'tarefa', 'matéria',
  'matematica', 'matemática', 'português', 'história', 'geografia', 'ciências',
  'biologia', 'física', 'química', 'inglês', 'espanhol', 'aprender', 'aprendi',
  'aprendeu', 'reprovar', 'aprovar', 'recuperação', 'boletim', 'chamada',
  // Trabalho
  'trabalho', 'emprego', 'chefe', 'reunião', 'reunia', 'salário',
  'salario', 'conta', 'boleto', 'dinheiro', 'grana', 'caixa', 'empresa',
  'funcionário', 'funcionaria', 'cliente', 'entregar', 'entregue',
  'folga', 'feriado', 'escala', 'plantão', 'plantao',
  // Família e pessoas
  'família', 'familia', 'mãe', 'mae.', 'pai', 'irmão', 'irmao', 'irmã',
  'sobrinho', 'sobrinha', 'primo', 'prima', 'tia', 'tias', 'avó', 'avô',
  'casamento', 'divórcio', 'namorada', 'namorado', 'apaixonado', 'apaixonada',
  // Lugares
  'casa', 'quarto', 'cama', 'cozinha', 'banheiro', 'sala', 'rua', 'bairro',
  'cidade', 'estado', 'país', 'praia', 'mar', 'montanha', 'floresta',
  'igreja', 'templo', 'esporte', 'academia', 'hospital', 'clínica', 'clinica',
  'farmácia', 'farmacia', 'mercado', 'supermercado', 'banco', 'padaria',
  'restaurante', 'lanchonete', 'cinema', 'teatro', 'parque', 'praça',
  // Transportes
  'ônibus', 'onibus', 'carro', 'moto', 'bicicleta', 'táxi', 'taxi', 'voo',
  'aeroporto', 'trânsito', 'transito', 'estacionamento', 'rodovia',
  // Comida e bebida
  'comida', 'almoço', 'almoco', 'jantar', 'lanche', 'café', 'cafe.', 'suco',
  'água', 'agua.', 'pizza', 'hambúrguer', 'hamburger', 'pastel', 'açaí',
  'fruta', 'doce', 'bolo', 'sobremesa', 'refeição', 'refeicao', 'fome',
  // Cultura e lazer
  'filme', 'série', 'serie.', 'música', 'musica.', 'banda', 'show', 'clipe',
  'foto', 'fotos', 'vídeo', 'video.', 'playlist', 'canal', 'jogo', 'videogame',
  'futebol', 'futsal', 'vôlei', 'volei', 'basquete', 'natação', 'natacao',
  'treino', 'treinei', 'corrida', 'dança', 'danca', 'festa', 'aniversário',
  'aniversario', 'presente', 'vela', 'velinha', 'brincadeira', 'brinquei',
  'viagem', 'viagem.', 'passeio', 'balada', 'cerveja', 'chopp', 'bebida',
  // Emoções e estados
  'cansado', 'cansada', 'exausto', 'exausta', 'sono', 'dormi', 'dormir',
  'acordei', 'acordar', 'manhã', 'noite', 'tarde', 'dia', 'semana',
  'sábado', 'sabado', 'domingo', 'mês', 'ano', 'vida', 'mundo', 'história',
  'historia', 'conversa', 'papo', 'mensagem', 'videochamada', 'chamada',
  'vergonha', 'loucura', 'louco', 'louca', 'maluco', 'maluca', 'chateado',
  'chateada', 'triste', 'tristeza', 'feliz', 'felicidade', 'animado',
  'animada', 'preocupado', 'preocupada', 'nervoso', 'nervosa', 'irritado',
  'irritada', 'raiva', 'furioso', 'furiosa', 'decepcionado', 'decepcionada',
  'decepcionar', 'orgulhoso', 'orgulhosa', 'envergonhado', 'envergonhada',
  'inseguro', 'insegura', 'confiante', 'coragem', 'medo', 'ansiedade',
  'depressivo', 'depressiva', 'estresse', 'estressante', 'frustração',
  'frustracao', 'desistência', 'desistencia', 'desistir', 'desisti',
  // Verbos comuns do dia a dia
  'fazer', 'fiz', 'fui', 'comprei', 'comprar', 'ganhei', 'perdi', 'troquei',
  'voltei', 'cheguei', 'comecei', 'terminei', 'acabei', 'achei', 'pegi',
  'peguei', 'deixei', 'fiquei', 'ficou', 'ficamos', 'deixou', 'mandei',
  'mandou', 'enviei', 'enviou', 'respondei', 'respondeu', 'vi', 'vimos',
  'virei', 'mudei', 'mudou', 'troquei', 'trocou', 'estou', 'estava', 'estávamos',
  'estavamos', 'tô', 'tava', 'tamos', 'vou', 'vai', 'vamos', 'veio', 'vinha',
  'passou', 'passar', 'passando', 'aconteceu', 'acontecer', 'acontecia',
  'apareceu', 'sumiu', 'voltar', 'voltou', 'chegar', 'chega', 'partiu',
  // Adjetivos e expressões
  'bom', 'boa', 'mau', 'má', 'melhor', 'pior', 'ótimo', 'otimo', 'ótima',
  'otima', 'péssimo', 'pessimo', 'péssima', 'pessima', 'perfeito', 'perfeita',
  'incrível', 'incrivel', 'fantástico', 'fantastico', 'impossível', 'impossivel',
  'inacreditável', 'inacreditavel', 'difícil', 'facil', 'legal', 'massa',
  'show', 'top', 'ruim', 'fraco', 'fraca', 'forte', 'frágil', 'fragil',
  'lindo', 'linda', 'bonito', 'bonita', 'feio', 'feia', 'inteligente',
  'esperto', 'esperta', 'burro', 'burra', 'capaz', 'impossível',
  'gostei', 'amei', 'odei', 'detestei', 'adoro', 'adorou', 'gostar', 'gosto',
  'sentir', 'senti', 'sinto', 'parecer', 'parece', 'parecia', 'achar', 'achei',
  'pensar', 'pensei', 'pensa', 'entender', 'entendi', 'entendo', 'entender',
  'saber', 'sei', 'sabia', 'soubes', 'saber', 'lembrar', 'lembrei', 'lembro',
  'esquecer', 'esqueci', 'esqueci', 'prometer', 'prometi', 'promessa',
  'combina', 'combinado', 'combinar', 'marquei', 'marcar', 'marquei',
  'convencei', 'convencer', 'convenceram', 'convencido', 'convencida',
];

const FORMAS: [string, string][] = LEXICO.map(palavra => [semAcentos(palavra), palavra]);
const LEXICO_SET = new Set(FORMAS.map(([chave]) => chave));

/**
 * Palavras que NUNCA são "corrigidas", mesmo sem acento ou fora do léxico:
 * gírias vivas, verbos e conectivos que aparecem o tempo todo no papo.
 * Sem essa lista, "tipo" viraria "top" e "acontece" viraria "aconteceu".
 */
const NO_TOQUE: string[] = [
  'tipo', 'coisa', 'coisas', 'jeito', 'modo', 'forma', 'maneira', 'papo', 'mano',
  'nada', 'tudo', 'todo', 'toda', 'todos', 'todas', 'quando', 'onde', 'qual',
  'quais', 'quem', 'como', 'porque', 'pois', 'entao', 'muito', 'muita', 'muitos',
  'muitas', 'pouco', 'pouca', 'tambem', 'hoje', 'ontem', 'amanha', 'depois',
  'agora', 'sempre', 'nunca', 'quase', 'aqui', 'ali', 'la', 'isso', 'isto',
  'aquilo', 'essa', 'esse', 'esta', 'aquele', 'aquela', 'ai', 'nao', 'sim',
  'voce', 'voces', 'minha', 'meu', 'minhas', 'meus', 'sua', 'seu', 'suas',
  'seus', 'gente', 'blz', 'beleza', 'certa', 'certo', 'claro', 'entendi',
  'achei', 'achava', 'penso', 'pensava', 'pensei', 'saber', 'sabia', 'sei',
  'sabes', 'lembra', 'lembrei', 'lembro', 'esqueci', 'queria', 'gostei',
  'gostava', 'gosto', 'gosta', 'adoro', 'amei', 'odei', 'mandei', 'mandou',
  'viu', 'olha', 'olhar', 'olhei', 'fala', 'falei', 'falava', 'falo', 'falar',
  'diz', 'disse', 'dizer', 'fica', 'ficava', 'comecei', 'terminei', 'continua',
  'parei', 'senta', 'andei', 'corri', 'chega', 'volta', 'sai', 'saí', 'entrou',
  'subi', 'desce', 'anda', 'corre', 'espera', 'esperando', 'esperei', 'segura',
  'pede', 'pedi', 'ajuda', 'ajudei', 'ajudou', 'consegue', 'consigo', 'consigui',
  'dificil', 'legal', 'massa', 'show', 'top', 'verdade', 'certeza', 'certeza',
  'puto', 'puta', 'merda', 'merdas', 'nada', 'coisa', 'acontece', 'aconteci',
  'acontecendo', 'faz', 'fazia', 'fazendo', 'deixa', 'deixou', 'deixar',
  'trouxe', 'trazer', 'troco', 'troquei', 'trocou', 'mudei', 'mudou', 'troque',
  'comprei', 'comprar', 'compro', 'ganhei', 'perdi', 'perdeu', 'perdia',
  'perder', 'ganho', 'ganhou', 'vendi', 'vender', 'paguei', 'pagar', 'pagou',
  'devo', 'devia', 'devendo', 'falta', 'faltou', 'faltando', 'chega', 'cheguei',
  'chegar', 'chegou', 'chegando', 'entreguei', 'entregar', 'entregou',
  'chamou', 'chamei', 'chamar', 'chama', 'chamando', 'chamado', 'ligou', 'liguei',
  // Verbos e pronomes de altíssima frequência: nunca "corrigidos"
  'indo', 'sabe', 'soubes', 'fazia', 'penso', 'acho', 'achou', 'comigo',
  'contigo', 'saudade', 'saudades', 'tristeza', 'felicidade', 'enviei',
  'respondei', 'troque', 'apareceu', 'partiu', 'gostar', 'sentir', 'sinto',
  'parecer', 'parecia', 'pensar', 'entender', 'entendo', 'lembra', 'esquecer',
  'prometer', 'combina', 'combinado', 'convencei', 'quanto', 'quantos',
  'quantas', 'amanha', 'favor', 'tchau', 'beleza', 'valeu', 'gostei',
  'adoro', 'amei', 'odei', 'gosto', 'gosta', 'queria', 'quero', 'quere',
  'quereu', 'preciso', 'precisa', 'consegue', 'consigo', 'consigui',
  'consegui', 'deixa', 'deixou', 'deixar', 'deixo', 'comeca', 'comecaram',
  'termina', 'terminar', 'continua', 'continuar', 'continuo', 'continuando',
  'pare', 'parei', 'parar', 'senta', 'sentei', 'sentar', 'levanta', 'anda',
  'andei', 'andar', 'corre', 'corri', 'correr', 'sobe', 'subi', 'subir',
  'desce', 'desci', 'descer', 'entra', 'entrei', 'entrar', 'sai', 'saí',
  'sair', 'fica', 'fiquei', 'ficar', 'ficou', 'ficando', 'fica.', 'pensa',
  'pensei', 'pensar', 'fala', 'falei', 'falar', 'fale', 'falo', 'falando',
  'diz', 'disse', 'dizer', 'mandei', 'mandou', 'mandar', 'envie', 'enviou',
  'enviar', 'pede', 'pedi', 'pedir', 'pedindo', 'espera', 'esperando',
  'esperei', 'esperar', 'aguarda', 'aguardei', 'aguardar', 'segura',
  'segurei', 'segurar', 'segurando', 'olha', 'olhar', 'olhei', 'olhando',
  'viu', 'vejo', 'veja', 'ver', 'vi', 'visto', 'assisti', 'assistir',
  'ouvi', 'ouvir', 'ouvido', 'escutei', 'escutar', 'sinto', 'senti',
  'sentir', 'sentei', 'sentindo', 'sinto.', 'acho', 'achava', 'achei',
  'achou', 'achar', 'pensou', 'pensando', 'lembrou', 'lembrando',
  'lembrei', 'lembro', 'lembra', 'esqueci', 'esqueceu', 'esquecer',
  'esquecendo', 'sabia', 'sei', 'saber', 'sabia.', 'sabendo', 'soubes',
  'saber.', 'conhece', 'conheci', 'conhecer', 'conhecendo', 'conheceu',
  'cuida', 'cuidar', 'cuidado', 'cuidadosa', 'cuidava', 'cuidou',
  'ajuda', 'ajudei', 'ajudar', 'ajudou', 'ajudando', 'tira', 'tirei',
  'tirar', 'tirou', 'coloca', 'coloquei', 'colocar', 'colocou', 'troca',
  'troquei', 'trocou', 'trocar', 'trocando', 'muda', 'mudei', 'mudar',
  'mudou', 'mudando', 'troque', 'troquem', 'mexe', 'mexeu', 'mexer',
  'pega', 'peguei', 'pegar', 'pegou', 'pegando', 'deixa', 'deixei',
  'deixou', 'deixar', 'deixando', 'leva', 'levantei', 'levantar', 'levou',
  'levando', 'traz', 'trouxe', 'trazer', 'trazendo', 'trouxe.', 'troco',
  'compro', 'comprei', 'comprar', 'comprou', 'comprando', 'ganhei',
  'ganhar', 'ganhou', 'ganhando', 'perdi', 'perder', 'perdeu', 'perdia',
  'perdendo', 'perdao', 'perdoar', 'perdoei', 'pago', 'paguei', 'pagar',
  'pagou', 'pagando', 'comida', 'como', 'comi', 'comendo', 'come', 'comeu',
  'bebi', 'beber', 'bebeu', 'dormi', 'dormir', 'dormiu', 'dormindo',
  'acordei', 'acordar', 'acordou', 'acordando', 'trabalhei', 'trabalhar',
  'trabalhou', 'trabalhando', 'estudei', 'estudar', 'estudou', 'estudando',
  'escrevi', 'escrever', 'escreveu', 'escrevendo', 'falei', 'falar',
  'falou', 'falando', 'diss', 'diz', 'dizia', 'dizer', 'fala.', 'fala',
];
const NO_TOQUE_SET = new Set(NO_TOQUE.map(semAcentos));

/** Distância de Levenshtein (pequena, para palavras curtas). */
function distanciaLevenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > 2) return 99;
  let anterior = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const atual = [i];
    for (let j = 1; j <= m; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
    }
    anterior = atual;
  }
  return anterior[m];
}

/**
 * "escoka" → "escola". Devolve null quando a palavra já é válida (mesmo
 * sem acento) ou quando não existe palavra próxima no léxico. Palavras
 * curtas (< 4 letras) nunca são "corrigidas": o risco de errar é maior
 * que o ganho.
 */
export function corrigirPossivelErro(palavra: string): string | null {
  const limpa = semAcentos(palavra);
  if (limpa.length < 4 || !/^[a-z]+$/.test(limpa)) return null;
  if (LEXICO_SET.has(limpa) || NO_TOQUE_SET.has(limpa)) return null;
  // Risada/estouro ("kkkkkk", "aaaaa") nunca é erro de digitação.
  if (/^(.)\1+$/.test(limpa)) return null;
  let melhor: string | null = null;
  let melhorDistancia = 3;
  for (const [chave, forma] of FORMAS) {
    if (Math.abs(chave.length - limpa.length) > 1) continue;
    const distancia = distanciaLevenshtein(limpa, chave);
    const tolerancia = limpa.length >= 6 ? 2 : 1;
    if (distancia >= 1 && distancia <= tolerancia && distancia < melhorDistancia) {
      melhorDistancia = distancia;
      melhor = forma;
    }
  }
  return melhor;
}

/**
 * A normalização completa de uma mensagem:
 *  1. abre as abreviações (vc → você, oq → o que, hj → hoje...);
 *  2. abre o "n" avulso ("n sei" → "não sei");
 *  3. corrige erros de digitação óbvios (escoka → escola);
 *  4. deixa o contexto decidir "por quê" no final de pergunta.
 */
export function normalizarMensagem(bruto: string): Normalizacao {
  if (!bruto || !bruto.trim()) return { texto: '', slang: [], erros: [] };

  const base = expandirAbreviacoes(bruto);
  const slang = [...abreviacoesNaMensagem(bruto)];
  for (const palavra of bruto.match(/[A-Za-z]{2,}/g) || []) {
    if (/^(k{2,}|rs{2,})$/i.test(palavra) && !slang.includes(palavra.toLowerCase())) {
      slang.push(palavra.toLowerCase());
    }
  }

  const erros: Correcao[] = [];
  const comErrosCorrigidos = base.replace(/[A-Za-zÀ-ÿ]{4,}/g, palavra => {
    const corrigido = corrigirPossivelErro(palavra);
    if (!corrigido) return palavra;
    const capitalizada = /^[A-ZÀ-Ý]/.test(palavra)
      ? corrigido.charAt(0).toUpperCase() + corrigido.slice(1)
      : corrigido;
    erros.push({ original: palavra, sugerido: capitalizada });
    return capitalizada;
  });

  // "n" avulso (e "nn", "nnn"...) = "não" — o dicionário geral não toca nele
  // para não adivinhar demais. Fronteiras explícitas: no JavaScript o \b não
  // trata letras acentuadas como "palavra", e "n" dentro de "não" viraria alvo.
  const comNao = comErrosCorrigidos
    .replace(/(?<![A-Za-zÀ-ÿ])n{2,}(?![A-Za-zÀ-ÿ])/g, 'não')
    .replace(/(?<![A-Za-zÀ-ÿ])n(?![A-Za-zÀ-ÿ])/g, 'não');

  // Contexto decide o "por que": no fim de pergunta fecha com "por quê";
  // no início de pergunta, pergunta o motivo com "por que".
  let texto = comNao;
  const mFinal = texto.match(/\bporque\s*\??\s*$/i);
  if (mFinal) {
    const inicio = mFinal.index ?? 0;
    const eraMaiuscula = /[A-ZÀ-Ý]/.test(texto.charAt(inicio));
    const comPergunta = texto.slice(inicio).includes('?');
    const trocado = (eraMaiuscula ? 'Por quê' : 'por quê') + (comPergunta ? '?' : '');
    texto = texto.slice(0, inicio) + trocado;
  } else if (/^porque\s/i.test(texto) && /\?\s*$/.test(texto)) {
    texto = texto.replace(/^porque\s/i, 'por que ');
  }

  return { texto, slang, erros };
}
