/**
 * Motor de persona: transforma os campos da ficha (idade, comportamento, tags,
 * categoria, signo, música, como conheceu, descrição) em um perfil de fala e de
 * personalidade usado pelo simulador de conversa.
 *
 * Nada aqui é aleatório entre renderizações: tudo sai de um gerador semeado pelo
 * id da ficha, então a mesma pessoa conversa sempre do mesmo jeito.
 */
import type { Person } from '../types';
import { isAdult, normalizeText } from '../store';
import { analisarRelacao, type Familiar, type Relacao } from './relacao';

/** Compara sempre no mesmo formato do texto analisado: minúsculo e sem acento. */
function rx(fonte: string, flags = 'i') { return new RegExp(fonte.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), flags); }
export type Genero = 'feminino' | 'masculino' | 'neutro';
export type Intimidade = 'nova' | 'conhecendo' | 'confiante' | 'proxima' | 'especial';
/** Voz da persona: muda vocabulário, risadas, abreviações e assuntos. */
export type EstiloVoz = 'adolescente' | 'jovem' | 'adulta' | 'madura' | 'tia';

export interface PersonaTraits {
  /** Abertura e afeto no jeito de falar. */
  calor: number;
  /** Coragem para provocar, convidar e tomar a frente. */
  ousadia: number;
  /** Humor, deboche leve e brincadeira. */
  brincadeira: number;
  /** Polidez, cuidado com gírias e assuntos picantes. */
  reserva: number;
  /** Tamanho das respostas e vontade de detalhar. */
  verbosidade: number;
  /** Uso de emoji e carinhas. */
  emojis: number;
  /** Uso de gírias, abreviações e risadas escritas. */
  girias: number;
  /** Curiosidade: quanto ela pergunta de volta. */
  curiosidade: number;
  /** Sensibilidade a ciúme e cobrança. */
  ciumenta: number;
  /** Romantismo: gosta de carinho, planos e declarações. */
  romantica: number;
  /** Timidez: hesitação, reticências e respostas mais curtas no começo. */
  timidez: number;
  /** Velocidade de resposta (1 = responde na hora, 0 = demora). */
  agilidade: number;
  /** Maturidade da conversa: gente adulta fala de assunto adulto, sem encher de kkk. */
  maturidade: number;
}

export interface Interesse {
  id: string;
  label: string;
  /** Ganchos concretos de conversa sobre o assunto. */
  temas: string[];
}

export interface SpeechProfile {
  emojis: string[];
  risadas: string[];
  girias: string[];
  /** Tamanho médio desejado de cada bolha de mensagem. */
  tamanho: number;
  /** Quantidade mínima e máxima de bolhas por resposta. */
  bolhas: [number, number];
  /** Milissegundos por caractere digitado. */
  porCaractere: number;
  /** Probabilidade de escorregar em letras de vez em quando. */
  erro: number;
  /** Vocativos usados, do mais neutro ao mais íntimo. */
  vocativos: [string, string, string, string];
  /** Nível de informalidade (0 = escreve tudo, 1 = abrevia muito). */
  informalidade: number;
  /** Abreviações que a persona usa de verdade: vc, pq, mds, bjs... */
  abreviacoes: string[];
  /** Quanto ela conversa como gente adulta (0 = molecagem, 1 = papo de gente grande). */
  maturidade: number;
}

/**
 * Assinatura de voz: o que faz cada ficha soar como uma pessoa diferente, e não
 * como o mesmo robô. Sai sempre do mesmo gerador semeado, então a Ana nunca vira
 * a Célia por acidente.
 */
export interface Assinatura {
  /** A risada dela: "kkkk", "rs", "hahaha"... */
  risada: string;
  /** Como ela costuma começar a mensagem. */
  aberturas: string[];
  /** Expressões que ela repete sem perceber. */
  bordoes: string[];
  /** Emoji que ela usa mais que os outros. */
  emojiMarca: string;
  /** Hábito de pontuação. */
  pontuacao: 'reticencias' | 'exclamacao' | 'seca';
  /** Frase curta para a tela explicar o jeito dela. */
  descricao: string;
}

export interface Persona {
  id: string;
  nome: string;
  primeiro: string;
  comoChamar: string;
  genero: Genero;
  idade: number | null;
  faixa: 'menor' | 'jovem' | 'adulta' | 'madura' | 'senior' | 'indefinida';
  adulta: boolean;
  categoria: string;
  subcategoria: string;
  ondeMora: string;
  cidade: string;
  interesses: Interesse[];
  marcadores: string[];
  contexto: string[];
  traits: PersonaTraits;
  fala: SpeechProfile;
  /** 0..1 — quanto ela valoriza a aparência e elogios sobre o corpo. */
  vaidade: number;
  /** Texto curto que explica como ela conversa. */
  resumo: string;
  /** Voz da persona, definida pela idade (adolescente, adulta, tia...). */
  estilo: EstiloVoz;
  /** Como ela te vê: diferença de idade, tia, criança, amizade e vínculo. */
  relacao: Relacao;
  /** Familiares dela que também estão no catálogo, com nome e papel. */
  familiares: Familiar[];
  /** Como ela te chama nesta relação (menino, meu bem, querida...). */
  tratamento: string[];
  /** Marca registrada da fala dela: risada, aberturas, bordões e pontuação. */
  assinatura: Assinatura;
}

export interface PersonaContexto {
  /** Catálogo completo, para resolver os vínculos familiares. */
  people?: Person[];
  /** Idade de quem usa o catálogo (Ajustes → Meu perfil). */
  settings?: { ownerAge?: number | null; ownerBirthday?: string | null } | null;
}

/** Gerador pseudoaleatório semeado (mulberry32): a mesma persona conversa igual. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const GENERO_LABEL: Record<Genero, { o: string; a: string; adjetivo: (m: string, f: string) => string }> = {
  feminino: { o: 'a', a: 'a', adjetivo: (_m, f) => f },
  masculino: { o: 'o', a: 'o', adjetivo: (m) => m },
  neutro: { o: 'e', a: 'e', adjetivo: (m, f) => `${m}/${f}` },
};

export function generoDe(person: Person): Genero {
  const pronome = normalizeText(person.pronome || '');
  if (pronome.startsWith('ele') || pronome.startsWith('elu')) return pronome.startsWith('ele') ? 'masculino' : 'neutro';
  if (pronome.startsWith('ela')) return 'feminino';
  return 'feminino';
}

/** Nível de intimidade declarado na ficha (0 a 5) vira um degrau da persona. */
export function intimidadeDeclarada(person: Person): Intimidade {
  const level = Math.max(0, Math.min(5, Math.round(person.friendshipLevel || 0)));
  if (person.tags.includes('crush')) return level >= 4 ? 'proxima' : level >= 2 ? 'confiante' : 'conhecendo';
  if (person.tags.includes('amiga')) return level >= 4 ? 'especial' : 'proxima';
  return (['nova', 'conhecendo', 'conhecendo', 'confiante', 'proxima', 'especial'] as Intimidade[])[level];
}

interface Regra {
  id: string;
  /** Padrões procurados no texto normalizado da ficha. */
  padroes: RegExp;
  marcador?: string;
  efeito?: Partial<Record<keyof PersonaTraits, number>>;
  interesse?: string;
  contexto?: string;
}

/**
 * Regras de leitura da ficha. A ordem importa: marcadores de temperamento vêm
 * antes dos ganchos de assunto.
 */
const REGRAS: Regra[] = [
  { id: 'timida', padroes: rx("\\b(timid|envergonh|acanh|reservad|calad|introvertid|quietinh|sossegad)", "i"), marcador: 'tímida', efeito: { timidez: 0.42, calor: -0.12, verbosidade: -0.2, emojis: -0.05, curiosidade: -0.08 } },
  { id: 'extrovertida', padroes: rx("\\b(extrovertid|comunicativ|falante|animad|expansiv|sociáve|popular|agitad)", "i"), marcador: 'extrovertida', efeito: { calor: 0.2, verbosidade: 0.22, girias: 0.12, curiosidade: 0.14, timidez: -0.25 } },
  { id: 'brincalhona', padroes: rx("\\b(brincalh|engraçad|zoeir|sarcástic|ironic|deboche|palhaç|tirar onda|gozad)", "i"), marcador: 'brincalhona', efeito: { brincadeira: 0.4, girias: 0.14, calor: 0.08 } },
  { id: 'seria', padroes: rx("\\b(séria|seria|sério|madura|responsáve|profissional|objetiv|direta|centrad)", "i"), marcador: 'direta e centrada', efeito: { reserva: 0.16, brincadeira: -0.2, verbosidade: -0.08, girias: -0.16, emojis: -0.12 } },
  { id: 'doce', padroes: rx("\\b(doce|gentil|simpátic|fof|atencios|carinhos|afetuos|educad|meiga)", "i"), marcador: 'carinhosa', efeito: { calor: 0.26, romantica: 0.18, emojis: 0.12, timidez: 0.05 } },
  { id: 'romantica', padroes: rx("\\b(romântic|amor|paixão|sonhadora|poétic|declaraç|coração|sentimental)", "i"), marcador: 'romântica', efeito: { romantica: 0.4, calor: 0.14, verbosidade: 0.08, ousadia: -0.05 } },
  { id: 'ousada', padroes: rx("\\b(safad|ousad|atrevid|provocant|sedutor|sensual|tarad|picant|devass)", "i"), marcador: 'ousada no jeito de falar', efeito: { ousadia: 0.42, reserva: -0.3, girias: 0.1, emojis: 0.08 } },
  { id: 'recatada', padroes: rx("\\b(recatad|religios|crente|devot|cast|pudor|conservador|tímid)", "i"), marcador: 'reservada em assuntos íntimos', efeito: { reserva: 0.34, ousadia: -0.24, girias: -0.1 } },
  { id: 'ciumenta', padroes: rx("\\b(ciument|possessiv|intens|temperament|explosiv|brigona)", "i"), marcador: 'intensa', efeito: { ciumenta: 0.4, calor: 0.06, brincadeira: -0.06 } },
  { id: 'vaidosa', padroes: rx("\\b(vaidos|arrumad|elegant|estilos|fashion|maquiagem|cuidadosa|vaidade|perfumad)", "i"), marcador: 'vaidosa', efeito: { emojis: 0.16, calor: 0.08 } },
  { id: 'nerd', padroes: rx("\\b(nerd|estudios|inteligent|culta|curiosa|leitora|livro|geek|cientist|letrad)", "i"), marcador: 'curiosa e estudiosa', efeito: { curiosidade: 0.34, girias: -0.14, verbosidade: 0.16, emojis: -0.06 } },
  { id: 'workaholic', padroes: rx("\\b(workahol|ocupad|trabalha muito|corrid|empreended|focad na carreira|estagiá)", "i"), marcador: 'vive na correria', efeito: { agilidade: -0.2, verbosidade: -0.06, calor: 0.04 }, contexto: 'trabalha bastante' },
  { id: 'caseira', padroes: rx("\\b(caseir|tranquil|sossegad|em casa|netflix|cozinha|doméstic)", "i"), marcador: 'caseira', efeito: { calor: 0.16, ousadia: -0.12, timidez: 0.08 }, contexto: 'gosta de ficar em casa' },
  { id: 'festeira', padroes: rx("\\b(festeir|balad|festa|dança|dançar|barzinho|shows|alegre)", "i"), marcador: 'festeira', efeito: { calor: 0.18, verbosidade: 0.12, ousadia: 0.14, agilidade: 0.06 } },
  { id: 'espiritual', padroes: rx("\\b(igreja|culto|fé|deus|espiritual|missa|oraç|religião|missionári)", "i"), marcador: 'ligada à fé', efeito: { reserva: 0.24, calor: 0.2, romantica: 0.14 }, interesse: 'fe' },
  { id: 'academia', padroes: rx("\\b(academia|treino|malha|muscula|corrida|fitness|atleta|esporte|jogadora)", "i"), marcador: 'fitness', efeito: { agilidade: 0.12, verbosidade: 0.08 }, interesse: 'treino' },
  { id: 'musica', padroes: rx("\\b(música|música|banda|canta|cantora|sertanej|pagode|funk|rock|gospel|violão|dj)", "i"), marcador: 'ligada em música', efeito: { calor: 0.1, verbosidade: 0.1 }, interesse: 'musica' },
  { id: 'estudos', padroes: rx("\\b(faculdade|universidade|curso|vestibular|enem|monografia|estud|escola técnica|forma)", "i"), marcador: 'estudante', efeito: { curiosidade: 0.16, agilidade: -0.08 }, interesse: 'estudo', contexto: 'estuda' },
  { id: 'mae', padroes: rx("\\b(mãe|maternidade|filh|gestante|grávida|esposa|marido|casada)", "i"), marcador: 'com vida em família', efeito: { reserva: 0.12, calor: 0.18, agilidade: -0.16, romantica: 0.08 }, contexto: 'tem a rotina cheia em casa' },
  { id: 'viajante', padroes: rx("\\b(viagem|viaja|praia|litoral|trilha|aventura|acampa|mochilão)", "i"), marcador: 'gosta de sair e viajar', efeito: { ousadia: 0.16, calor: 0.1 }, interesse: 'viagem' },
  { id: 'arte', padroes: rx("\\b(arte|desenha|pinta|fotografia|cinema|série|filme|séries|teatro|livros)", "i"), marcador: 'criativa', efeito: { verbosidade: 0.12, curiosidade: 0.12 }, interesse: 'arte' },
  { id: 'gamer', padroes: rx("\\b(game|jog|console|playstation|xbox|anime|otaku|mangá)", "i"), marcador: 'gamer', efeito: { girias: 0.12, brincadeira: 0.1, emojis: 0.1 }, interesse: 'games' },
  { id: 'pet', padroes: rx("\\b(cachorro|gato|pet|bichinh|animal)", "i"), marcador: 'apaixonada por bichos', efeito: { calor: 0.16, romantica: 0.06 }, interesse: 'pets' },
];

const INTERESSES: Record<string, Interesse> = {
  treino: { id: 'treino', label: 'treino e academia', temas: ['treino de perna', 'academia cheia', 'aeróbico', 'aquela preguiça de treinar'] },
  musica: { id: 'musica', label: 'música', temas: ['playlist nova', 'show', 'música que não sai da cabeça', 'fone de ouvido no ônibus'] },
  estudo: { id: 'estudo', label: 'estudos', temas: ['prova', 'trabalho em grupo', 'estágio', 'professor(a) que pede demais'] },
  fe: { id: 'fe', label: 'a igreja', temas: ['culto', 'reunião de jovens', 'o louvor de domingo', 'a escala do mês'] },
  viagem: { id: 'viagem', label: 'viagens', temas: ['praia', 'estrada', 'fim de semana fora', 'praia lotada', 'pôr do sol'] },
  arte: { id: 'arte', label: 'séries, filmes e arte', temas: ['série que viciei', 'maratona', 'filme que me marcou', 'trilha sonora'] },
  games: { id: 'games', label: 'jogos e cultura pop', temas: ['partida', 'jogo novo', 'série de anime'] },
  pets: { id: 'pets', label: 'bichos de estimação', temas: ['o cachorro fazendo bagunça', 'o gato deitado no teclado', 'vacina do pet'] },
  comida: { id: 'comida', label: 'comida', temas: ['pizza', 'sobremesa', 'café passado forte', 'açaí', 'hambúrguer'] },
  familia: { id: 'familia', label: 'a família', temas: ['almoço de domingo', 'sobrinhos', 'a casa cheia'] },
  amigos: { id: 'amigos', label: 'os amigos', temas: ['aniversário do grupo', 'saída com as amigas', 'grupo do WhatsApp'] },
  rotina: { id: 'rotina', label: 'a rotina', temas: ['semana corrida', 'trânsito', 'mercado', 'casa para arrumar'] },
  trabalho: { id: 'trabalho', label: 'o trabalho', temas: ['reunião chata', 'cliente complicado', 'hora extra', 'café do escritório'] },
  clima: { id: 'clima', label: 'o tempo', temas: ['calor insuportável', 'chuva de tarde', 'frio na minha cidade'] },
  // Assuntos que aparecem mais na vida adulta. Entram sozinhos conforme a idade
  // e o jeito da ficha — é o que deixa a conversa de gente grande convincente.
  filhos: { id: 'filhos', label: 'os filhos', temas: ['levar as crianças na escola', 'a lição de casa', 'o filho que não quer dormir', 'a consulta do pediatra', 'o aniversário do pequeno'] },
  casa: { id: 'casa', label: 'a casa', temas: ['a louça que se acumulou', 'mercado do mês', 'a reforma da cozinha', 'as plantas da varanda', 'a faxina de sábado'] },
  autocuidado: { id: 'autocuidado', label: 'o autocuidado', temas: ['cabelo novo', 'unha feita', 'a academia no fim do dia', 'máscara de hidratação', 'um banho demorado', 'dia de spa'] },
  trabalho_adulto: { id: 'trabalho_adulto', label: 'a vida profissional', temas: ['o chefe que muda tudo em cima da hora', 'o cliente difícil', 'a reunião que podia ser um e-mail', 'o salário no fim do mês', 'plano de carreira'] },
  vinho: { id: 'vinho', label: 'um vinho e um café', temas: ['um vinho no fim do dia', 'café passado na hora', 'a sobremesa de domingo', 'um restaurante novo', 'petiscar com as amigas'] },
  seriados: { id: 'seriados', label: 'novelas e séries', temas: ['a novela das nove', 'a série que maratonei', 'aquele podcast', 'o filme de domingo'] },
  familia_grande: { id: 'familia_grande', label: 'a família', temas: ['almoço de domingo na casa da mãe', 'o grupo da família no WhatsApp', 'as tias que perguntam tudo', 'a visita no fim de semana'] },
  saude: { id: 'saude', label: 'cuidar da saúde', temas: ['a consulta que eu adiei', 'exame de rotina', 'dormir melhor', 'a caminhada de manhã', 'a terapia da semana'] },
  contas: { id: 'contas', label: 'a vida financeira', temas: ['a conta de luz', 'o boleto que venceu', 'guardar um dinheiro', 'o cartão estourou'] },
  igreja_adulto: { id: 'igreja_adulto', label: 'a ala e o serviço da igreja', temas: ['a escala do domingo', 'o chamado novo', 'a visita à irmã doente', 'a reunião de liderança', 'a limpeza da capela'] },
  viagem_adulto: { id: 'viagem_adulto', label: 'descansar e viajar', temas: ['um fim de semana fora', 'hotel com café da manhã bom', 'praia fora de temporada', 'estrada com música alta'] },
};

function interessesDe(person: Person, texto: string, rand: () => number): Interesse[] {
  const ids = new Set<string>();
  REGRAS.forEach(regra => { if (regra.interesse && regra.padroes.test(texto)) ids.add(regra.interesse); });
  if (person.musicaFavorita?.trim()) ids.add('musica');
  if (person.signo) ids.add('clima');
  if (person.aniversario || person.tags.includes('amiga')) ids.add('amigos');
  if ((person.idade ?? 0) >= 30) ids.add('trabalho');
  // Vida adulta: casa, filhos, trabalho de verdade, autocuidado e afazeres.
  const idade = person.idade ?? 0;
  if (idade >= 25) { ids.add('trabalho_adulto'); ids.add('autocuidado'); }
  if (idade >= 30) { ids.add('casa'); ids.add('contas'); ids.add('saude'); }
  if (idade >= 35) { ids.add('familia_grande'); ids.add('seriados'); }
  if (/\b(mãe|mae|maternidade|filh|gestante|grávida|esposa|marido|casada|casado)\b/.test(texto)) { ids.add('filhos'); ids.add('casa'); }
  if (/\b(igreja|ala|bispo|chamado|missão|missao|templo)\b/.test(texto)) ids.add('igreja_adulto');
  if (/\b(vinho|café|restaurante|jantar|receita|cozinha)\b/.test(texto)) ids.add('vinho');
  if (/\b(viagem|hotel|praia|estrada|férias)\b/.test(texto)) ids.add('viagem_adulto');
  if (person.fotos.length > 3) ids.add('arte');
  if (!ids.size) ids.add('rotina');
  // Complete com assuntos genéricos, mas sempre mantendo os ganchos reais.
  const extras = ['comida', 'musica', 'arte', 'rotina', 'viagem', 'amigos', 'clima', 'familia', 'pets',
    'vinho', 'casa', 'autocuidado', 'seriados', 'trabalho_adulto', 'familia_grande', 'saude'];
  const embaralhados = [...extras].sort(() => rand() - 0.5);
  for (const id of embaralhados) { if (ids.size >= 6) break; ids.add(id); }
  return [...ids].slice(0, 6).map(id => INTERESSES[id]).filter(Boolean);
}

/** Monta a persona completa a partir da ficha (e, quando houver, das outras fichas). */
export function buildPersona(person: Person, catalogo: PersonaContexto = {}): Persona {
  const texto = normalizeText([
    person.comportamento, person.descricao, person.observacoesGerais, person.descricaoCorporal,
    person.tags.join(' '), person.estiloRoupa, person.tipoCorpo, person.comoConheceu,
    person.musicaFavorita, person.signo, person.localizacaoMora, person.qi,
    ...(person.notas || []).map(note => `${note.title} ${note.content}`),
    ...(person.customFields || []).map(field => `${field.label} ${field.value}`),
  ].join(' '));
  const rand = seededRandom(hashString(person.id || person.nome || 'pessoa'));

  const idade = person.idade ?? null;
  const faixa: Persona['faixa'] = idade === null ? 'indefinida' : idade < 18 ? 'menor' : idade < 25 ? 'jovem' : idade < 35 ? 'adulta' : idade < 50 ? 'madura' : 'senior';
  const genero = generoDe(person);
  // Quem é você para ela: idade sua, diferença, tia, criança, vínculo e amizade.
  const relacao = analisarRelacao(person, catalogo.people?.length ? catalogo.people : [person], catalogo.settings);
  const estilo: EstiloVoz = idade !== null && idade < 18 ? 'adolescente'
    : relacao.veCrianca || (relacao.ehTia && (relacao.diferenca === null || relacao.diferenca >= 8)) ? 'tia'
      : idade !== null && idade >= 35 ? 'madura'
        : idade !== null && idade < 25 ? 'jovem'
          : 'adulta';

  const traits: PersonaTraits = {
    calor: 0.5, ousadia: 0.42, brincadeira: 0.45, reserva: 0.42, verbosidade: 0.5, emojis: 0.5,
    girias: 0.45, curiosidade: 0.5, ciumenta: 0.3, romantica: 0.45, timidez: 0.32, agilidade: 0.6,
    maturidade: 0.5,
  };
  // A idade muda o ritmo e o vocabulário: mais jovem escreve mais rápido e mais solto.
  if (faixa === 'menor') { traits.girias += 0.2; traits.agilidade += 0.12; traits.verbosidade += 0.08; }
  if (faixa === 'jovem') { traits.girias += 0.12; traits.agilidade += 0.12; traits.verbosidade += 0.08; }
  if (faixa === 'madura' || faixa === 'senior') { traits.girias -= 0.18; traits.reserva += 0.08; traits.agilidade -= 0.04; traits.calor += 0.05; }
  if (faixa === 'menor') { traits.emojis += 0.18; traits.ousadia -= 0.16; traits.brincadeira += 0.12; traits.timidez += 0.1; }
  // Maturidade: vem da idade e do que a ficha diz sobre ela. É o que separa um
  // papo de gente grande de uma conversa de molecagem.
  const baseMaturidade = faixa === 'menor' ? 0.12 : faixa === 'jovem' ? 0.46 : faixa === 'adulta' ? 0.8 : faixa === 'madura' ? 0.86 : faixa === 'senior' ? 0.9 : 0.55;
  traits.maturidade = baseMaturidade;
  if (estilo === 'tia') traits.maturidade += 0.04;
  // Dinâmica de tia: mais carinho, conselho e cuidado; menos ousadia.
  if (estilo === 'tia') { traits.calor += 0.16; traits.reserva += 0.12; traits.ousadia -= 0.3; traits.verbosidade += 0.1; traits.ciumenta -= 0.12; traits.romantica -= 0.1; }
  if (relacao.veCrianca) { traits.ousadia -= 0.25; traits.reserva += 0.15; traits.calor += 0.12; }
  if (relacao.familiar && !relacao.veCrianca) { traits.calor += 0.14; traits.brincadeira += 0.08; }
  // Amizade declarada na ficha pesa de verdade na conversa.
  traits.calor += relacao.amizade * 0.03;
  if (relacao.amizade >= 4) { traits.brincadeira += 0.1; traits.curiosidade += 0.08; traits.timidez -= 0.08; }
  if (relacao.amizade <= 1) { traits.timidez += 0.08; traits.verbosidade -= 0.06; }

  const marcadores: string[] = [];
  const contexto: string[] = [];
  for (const regra of REGRAS) {
    if (!regra.padroes.test(texto)) continue;
    if (regra.marcador && !marcadores.includes(regra.marcador)) marcadores.push(regra.marcador);
    if (regra.contexto && !contexto.includes(regra.contexto)) contexto.push(regra.contexto);
    if (regra.efeito) for (const [key, value] of Object.entries(regra.efeito)) traits[key as keyof PersonaTraits] = clamp01((traits[key as keyof PersonaTraits] || 0.5) + (value as number));
  }

  // Tags do catálogo também dizem muito sobre a relação.
  if (person.tags.includes('crush')) { traits.calor += 0.08; traits.romantica += 0.1; traits.emojis += 0.06; }
  if (person.tags.includes('friendzone')) { traits.ousadia -= 0.08; }
  if (person.tags.includes('gostosa') || person.tags.includes('cavala') || person.tags.includes('gata')) { traits.ousadia += 0.06; }
  if (person.favorite) traits.calor += 0.05;
  if (person.pinned) traits.calor += 0.03;
  // A categoria dá o tom do dia a dia.
  const categoria = person.localizacaoOnde || '';
  if (categoria === 'igreja') { traits.reserva += 0.12; traits.calor += 0.1; traits.girias -= 0.08; }
  if (categoria === 'academia') { traits.ousadia += 0.08; traits.agilidade += 0.06; }
  if (categoria === 'trabalho') { traits.verbosidade -= 0.06; traits.agilidade -= 0.1; }
  if (categoria === 'escola') { traits.girias += 0.08; }
  if (categoria === 'fsy') { traits.reserva += 0.06; traits.calor += 0.06; }
  const level = Math.max(0, Math.min(5, Math.round(person.friendshipLevel || 0)));
  traits.calor += level * 0.05;
  traits.ousadia += level * 0.04;
  traits.timidez -= level * 0.05;
  traits.romantica += level * 0.02;

  // Marcadores de personalidade mexem no registro da conversa.
  const efeitoMaturidade: [RegExp, number][] = [
    [/direta e centrada|vive na correria|com vida em família|curiosa e estudiosa|reservada em assuntos íntimos/, 0.05],
    [/tímida/, 0.03],
    // Ficha brincalhona continua brincalhona, mas não vira adolescente por isso.
    [/brincalhona|festeira|ousada no jeito de falar|gamer/, -0.05],
  ];
  for (const [padrao, efeito] of efeitoMaturidade) {
    if (marcadores.some(marcador => padrao.test(marcador))) traits.maturidade += efeito;
  }
  // Valores finais com um leve tempero determinístico (não repete pessoas).
  const tempero: (keyof PersonaTraits)[] = ['calor', 'ousadia', 'brincadeira', 'reserva', 'verbosidade', 'emojis', 'girias', 'curiosidade', 'ciumenta', 'romantica', 'timidez', 'agilidade', 'maturidade'];
  for (const key of tempero) {
    // A maturidade quase não oscila no sorteio: quem é adulto não vira moleque num detalhe.
    traits[key] = clamp01(traits[key] + (rand() - 0.5) * (key === 'maturidade' ? 0.04 : 0.08));
  }

  // Gente adulta não enche a mensagem de carinha: o repertório enxuga e amadurece.
  const emojis = traits.maturidade >= 0.72
    ? (traits.emojis > 0.6 ? ['🙂', '😊', '😅', '😌', '🙃', '❤️'] : ['🙂', '😊', ''])
    : traits.emojis > 0.72 ? (faixa === 'jovem' ? ['😂', '😅', '😊', '💛', '😄', '😏', '🙃', '😉'] : ['😂', '🥰', '😍', '💕', '😅', '✨', '😜', '🙈', '😘', '🤭'])
      : traits.emojis > 0.45 ? ['😊', '😅', '🙂', '💛', '😄', '😏', '🙃', '😉']
        : ['🙂', '😅', '😉', ''];
  // Risada escrita é obrigatória nesse tipo de conversa: todo mundo ri por mensagem.
  // Gente adulta ri com menos "kkkk" empilhado, mas ninguém deixa de rir.
  const risadas = traits.maturidade >= 0.72
    ? (traits.girias > 0.55 ? ['kkk', 'kkkk', 'rs', 'haha', 'hahaha', 'kk'] : ['rs', 'haha', 'hahaha', 'kkk'])
    : estilo === 'adolescente' ? (faixa === 'jovem' ? ['kkk', 'kkkk', 'kakaka', 'hahaha', 'risos', 'kkkkk'] : ['kkk', 'kkkk', 'kkkkk', 'kakakaka', 'sksksk', 'hahaha', 'risos'])
      : estilo === 'tia' ? ['kkk', 'kkkk', 'rs', 'hahaha', 'risos']
        : traits.girias > 0.66 ? ['kkkk', 'kkkkk', 'kk', 'kakakaka', 'hahaha']
          : traits.girias > 0.4 ? ['kkk', 'kkkk', 'kakaka', 'haha', 'rs'] : ['haha', 'kkk', 'rs'];
  const girias = traits.maturidade >= 0.72
    ? ['né', 'pois é', 'imagina', 'nossa', 'sério?', 'sem dúvida', 'olha só', 'complicado', 'valeu']
    : estilo === 'adolescente'
      ? ['né', 'tipo assim', 'sla', 'mó', 'mn', 'pô', 'vixe', 'oxe', 'nossa', 'sério?', 'caraca', 'aff', 'mds']
    : estilo === 'tia'
      ? ['né', 'nossa', 'vixe', 'credo', 'meu Deus', 'imagina', 'sério?', 'olha só', 'que coisa']
      : traits.girias > 0.7 ? ['né', 'tipo assim', 'sla', 'mó', 'mano', 'pô', 'vixe', 'oxe', 'nossa', 'sério?', 'caraca']
        : traits.girias > 0.45 ? ['né', 'nossa', 'pô', 'sério?', 'cara', 'juro'] : ['nossa', 'que legal', 'sério?'];
  // Abreviações de quem digita no celular: adolescentes abreviam mais, tias usam as clássicas.
  const abreviacoes = traits.maturidade >= 0.72 ? ['vc', 'tb', 'pq', 'dps', 'msg']
    : estilo === 'adolescente' ? ['vc', 'tb', 'pq', 'qdo', 'mds', 'aff', 'sqn', 'pfv', 'dps', 'hj', 'n', 'blz', 'vlw', 'td', 'cmg']
    : estilo === 'tia' ? ['vc', 'tb', 'pq', 'dps', 'blz', 'bjs', 'qdo', 'msg']
      : traits.girias > 0.55 ? ['vc', 'tb', 'pq', 'dps', 'blz', 'hj', 'qdo'] : ['vc', 'tb', 'pq'];

  // Como ela te chama: criança e tia chamam de "meu bem"; com dois adultos a
  // tia perde o "meu filho" e o papo pode esquentar com química.
  const vocativos: [string, string, string, string] = relacao.veCrianca
    ? [relacao.tratamento[0] || 'menino', 'meu filho', 'meu bem', 'criança']
    : estilo === 'tia'
      ? (relacao.ambosAdultos ? ['meu bem', 'querida', 'você', 'gente'] : ['meu bem', 'meu filho', 'querido', 'você'])
      : ['você', 'vamos', traits.calor > 0.6 ? 'meu bem' : 'amiga', traits.romantica > 0.6 ? 'amor' : 'querida'];
  const madura = traits.maturidade >= 0.72;
  // Ajuste manual da ficha: a idade sugere a maturidade, mas você pode puxar
  // para um papo mais sério ou mais solto sem mexer na idade cadastrada.
  if (person.maturidadeAjuste === 'seria') {
    traits.maturidade = clamp01(traits.maturidade + 0.14);
    traits.girias = clamp01(traits.girias - 0.14);
    traits.emojis = clamp01(traits.emojis - 0.12);
    traits.agilidade = clamp01(traits.agilidade - 0.06);
  } else if (person.maturidadeAjuste === 'solta') {
    traits.maturidade = clamp01(traits.maturidade - 0.14);
    traits.girias = clamp01(traits.girias + 0.14);
    traits.emojis = clamp01(traits.emojis + 0.12);
    traits.brincadeira = clamp01(traits.brincadeira + 0.08);
  }

  const fala: SpeechProfile = {
    emojis, risadas, girias, abreviacoes,
    // Quem amadureceu escreve um pouco mais e em menos bolhas: assunto, não fragmento.
    tamanho: Math.round((38 + traits.verbosidade * 105 + traits.girias * 12) * (madura ? 1.18 : 1)),
    bolhas: traits.verbosidade > 0.68 ? (madura ? [1, 2] : [2, 3]) : traits.verbosidade > 0.4 ? [1, 2] : [1, 1],
    porCaractere: (traits.agilidade > 0.75 ? 22 : traits.agilidade > 0.5 ? 34 : 52) * (madura ? 1.12 : 1),
    erro: (traits.reserva > 0.7 ? 0.02 : traits.girias > 0.6 ? 0.13 : 0.07) * (madura ? 0.45 : 1),
    vocativos,
    maturidade: traits.maturidade,
    informalidade: clamp01(traits.girias * 0.6 + (traits.reserva < 0.4 ? 0.25 : 0) + (faixa === 'jovem' ? 0.15 : 0) + (estilo === 'adolescente' ? 0.3 : 0) - (estilo === 'tia' ? 0.12 : 0) - traits.maturidade * 0.15),
  };

  const primeiro = (person.apelido?.trim() || person.nome.trim().split(/\s+/)[0] || 'você');
  const assinatura = montarAssinatura({ person, traits, estilo, fala, marcadores });
  const interesses = interessesDe(person, texto, rand);
  const familiares = relacao.familiares;
  const resumo = montarResumo({ traits, marcadores, interesses, idade, categoria: person.localizacaoOnde, subcategoria: person.localizacaoSub, contexto, relacao });

  return {
    id: person.id,
    nome: person.nome,
    primeiro,
    comoChamar: person.apelido?.trim() || person.nome.trim().split(/\s+/)[0] || 'você',
    genero,
    idade,
    faixa,
    adulta: isAdult(person),
    categoria,
    subcategoria: person.localizacaoSub || '',
    ondeMora: person.localizacaoMora || '',
    cidade: person.localizacaoMora || '',
    interesses,
    marcadores,
    contexto,
    traits,
    fala,
    vaidade: clamp01(0.4 + (traits.emojis - 0.5) * 0.5 + (person.tags.includes('gostosa') || person.tags.includes('gata') ? 0.15 : 0) + (/\b(vaidos|arrumad|maquiagem|perfume|look)/.test(texto) ? 0.25 : 0)),
    resumo,
    estilo,
    relacao,
    familiares,
    tratamento: relacao.tratamento,
    assinatura,
  };
}

/** Aberturas típicas de cada faixa — é o que diferencia uma adolescente de uma tia. */
const ABERTURAS_VOZ: Record<string, string[]> = {
  adolescente: ['Mano,', 'Tipo,', 'Nossa,', 'Cara,', 'Gente,', 'Ah,', 'Poxa,', 'Vey,', 'Sério,', 'Ai,'],
  tia: ['Olha,', 'Escuta,', 'Viu,', 'Vixe,', 'Eita,', 'Meu bem,', 'Ó,', 'Credo,', 'Sabe,', 'Ah,'],
  adulta: ['Olha,', 'Ó,', 'Sabe,', 'Vou te falar,', 'Gente,', 'Nossa,', 'Escuta,', 'Ah,', 'Pois é,', 'Juro,'],
  madura: ['Olha,', 'Ó,', 'Viu,', 'Escuta,', 'Eita,', 'Pois é,', 'Sabe,', 'Vou te contar,', 'Ah,', 'Vixe,'],
};

/** Bordões que nascem do que a ficha diz de verdade (marcadores lidos da ficha). */
const BORDOES_POR_MARCADOR: Record<string, string[]> = {
  'ligada à fé': ['graças a Deus', 'se Deus quiser', 'Deus me livre', 'é uma bênção'],
  'fitness': ['treino é treino', 'bora treinar', 'a perna tá doendo ainda'],
  'com vida em família': ['mãe é mãe', 'filho é tudo', 'a casa vive cheia'],
  'criativa': ['maratonei de novo', 'essa série é boa demais', 'nada como um bom filme'],
  'gamer': ['perdi a hora jogando', 'a partida tá marcada', 'gamer sofre'],
  'apaixonada por bichos': ['meu bichinho', 'o bichinho tá deitado aqui', 'cachorro igual filho'],
  'caseira': ['a casa não se arruma sozinha', 'mercado tomou meu dia', 'ai, que preguiça boa'],
  'vive na correria': ['na correria', 'é isso', 'melhor nem falar do serviço'],
  'estudante': ['é muita matéria', 'vou tirar um tempo', 'prova me tira o sono'],
  'romântica': ['coração mole', 'sou dessas', 'meu bem'],
  'brincalhona': ['tô rindo sozinha', 'só sei que foi assim', 'juro'],
  'tímida': ['deixa eu ver', 'sei não', 'vou pensando'],
  'ousada no jeito de falar': ['meu bem', 'sem vergonha nenhuma', 'vem cá'],
  'direta e centrada': ['é isso', 'sem enrolação', 'vamos ao que interessa'],
  'carinhosa': ['meu bem', 'cuida de você', 'tô aqui'],
  'vaidosa': ['unha feita, autoestima na hora', 'hoje é meu dia', 'banho demorado é terapia'],
  'gosta de sair e viajar': ['bora viajar', 'preciso ver o mar', 'de mala pronta'],
  'festeira': ['meu grupo tá uma bagunça', 'as amigas me chamaram', 'só alegria'],
  'ligada em música': ['essa música não sai da minha cabeça', 'aumentei o volume', 'playlist salvou'],
  'curiosa e estudiosa': ['deixa eu ver', 'interessante isso', 'nunca tinha pensado'],
  'intensa': ['sou intensa mesmo', 'não sei ser diferente', 'melhor nem me provocar'],
  'reservada em assuntos íntimos': ['calma lá', 'devagar', 'cada coisa no seu tempo'],
};

/** Bordão de molecagem que não combina com ficha adulta. */
const BORDAO_MOLEQUE = /tô rindo sozinha|sksk|kkk|\bmó\b|\bsla\b|\bmds\b|\baff\b|😜|🙈|🥳|🥺|💕/i;

function montarAssinatura(input: { person: Person; traits: PersonaTraits; estilo: EstiloVoz; fala: SpeechProfile; marcadores: string[] }): Assinatura {
  const { person, traits, estilo, fala, marcadores } = input;
  // Gerador próprio: a marca registrada de cada pessoa não mexe nos sorteios que
  // já existiam (interesses e tempero dos traços continuam iguais).
  const rand = seededRandom(hashString(`${person.id || person.nome || 'pessoa'}#voz`));
  const pool = ABERTURAS_VOZ[estilo] || ABERTURAS_VOZ.adulta;
  const aberturas: string[] = [];
  while (aberturas.length < 3 && aberturas.length < pool.length) {
    const escolhida = pool[Math.floor(rand() * pool.length)];
    if (!aberturas.includes(escolhida)) aberturas.push(escolhida);
  }

  const madura = traits.maturidade >= 0.72;
  const gerais = madura
    ? ['juro', 'sério', 'é isso', 'deixa eu ver', 'quando você menos espera', 'vou te falar']
    : ['juro', 'sério', 'é isso', 'só sei que foi assim', 'deixa eu ver', 'quando você menos espera', 'tô rindo sozinha'];
  const especificos = marcadores.flatMap(marcador => BORDOES_POR_MARCADOR[marcador] || [])
    .filter(bordao => !(madura && BORDAO_MOLEQUE.test(bordao)));
  const bordoes: string[] = [];
  // Gente grande tem um jeito de falar, não um bordão para cada assunto.
  while (bordoes.length < (madura ? 2 : 3)) {
    // Dois bordões vêm dos assuntos da ficha, um é genérico do jeito dela falar.
    const fonte = bordoes.length < 2 && especificos.length ? especificos : gerais;
    const escolhido = fonte[Math.floor(rand() * fonte.length)];
    if (!escolhido || bordoes.includes(escolhido)) {
      if (fonte === especificos) continue;
      break;
    }
    bordoes.push(escolhido);
  }

  const paleta = fala.emojis.filter(Boolean);
  const emojiMarca = paleta.length ? paleta[Math.floor(rand() * paleta.length)] : '';
  const pontuacao: Assinatura['pontuacao'] = traits.timidez > 0.6 || traits.reserva > 0.68 ? 'seca'
    : madura ? (rand() < 0.6 ? 'reticencias' : 'exclamacao')
      : traits.calor > 0.62 && traits.emojis > 0.55 ? 'exclamacao'
        : rand() < 0.5 ? 'reticencias' : 'exclamacao';
  const ritmo = traits.agilidade > 0.7 ? 'digita rápido' : traits.agilidade < 0.4 ? 'demora pra responder' : 'responde quando dá';
  const tamanho = traits.verbosidade > 0.7 ? 'escreve bastante' : traits.verbosidade < 0.38 ? 'escreve curto' : 'escreve no tamanho normal';
  const descricao = `${ritmo}, ri com "${fala.risadas[0]}"${bordoes[0] ? `, vive dizendo "${bordoes[0]}"` : ''} e ${tamanho}`;
  return { risada: fala.risadas[0], aberturas, bordoes, emojiMarca, pontuacao, descricao };
}

function montarResumo(input: { traits: PersonaTraits; marcadores: string[]; interesses: Interesse[]; idade: number | null; categoria: string; subcategoria: string; contexto: string[]; relacao: Relacao }) {
  const partes: string[] = [];
  const { traits, relacao } = input;
  if (input.idade !== null) partes.push(`${input.idade} anos`);
  partes.push(relacao.rotulo.toLowerCase());
  const ritmo = traits.agilidade > 0.7 ? 'responde rápido' : traits.agilidade < 0.4 ? 'responde devagar, quando sobra tempo' : 'responde quando dá';
  const tamanho = traits.verbosidade > 0.7 ? 'escreve mensagens longas' : traits.verbosidade < 0.38 ? 'escreve curto e direto' : 'escreve no tamanho normal';
  partes.push(`${ritmo} e ${tamanho}`);
  if (traits.emojis > 0.7) partes.push('usa emoji em tudo');
  else if (traits.emojis < 0.3) partes.push('quase não usa emoji');
  if (input.marcadores.length) partes.push(input.marcadores.slice(0, 3).join(', '));
  if (input.interesses.length) partes.push(`puxa assunto sobre ${input.interesses.slice(0, 2).map(i => i.label).join(' e ')}`);
  return partes.join(' · ');
}

/** Lista de interesses da persona em linguagem simples. */
export const interessesLabels = (persona: Persona) => persona.interesses.map(interesse => interesse.label);

/** Um gancho de conversa concreto (usado em perguntas e sugestões). */
export function ganchoDe(persona: Persona, rand: () => number, indice?: number): string {
  const interesse = typeof indice === 'number' ? persona.interesses[indice % persona.interesses.length] : persona.interesses[Math.floor(rand() * persona.interesses.length)];
  if (!interesse) return 'a semana';
  return interesse.temas[Math.floor(rand() * interesse.temas.length)] || interesse.label;
}
