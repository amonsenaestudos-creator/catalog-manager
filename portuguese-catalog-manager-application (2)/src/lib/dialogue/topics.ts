/**
 * Grafo de tópicos: a conversa muda de assunto de forma natural.
 *
 * escola
 *  ├── professor
 *  ├── prova
 *  ├── amigos
 *  └── cansaço
 * cansaço
 *  ├── sono
 *  ├── academia
 *  ├── comida
 *  └── fim de semana
 *
 * Cada nó tem ganchos (coisas concretas para puxar o assunto), e a
 * transição depende da personalidade: a curiosa segue o fio, a
 * brincalhona desvia com um gancho, a reservada fica mais tempo no
 * mesmo assunto.
 */
import type { Persona } from '../persona';
import { temasDoTexto } from '../dialogue';
import type { Personalidade } from './types';

export interface NoTopico {
  rotulo: string;
  /** Vizinhos: para onde a conversa pode ir de forma natural. */
  filhos: string[];
  /** Ganchos de conversa concretos sobre o assunto. */
  ganchos: string[];
}

export const GRAFO: Record<string, NoTopico> = {
  dia: { rotulo: 'o dia a dia', filhos: ['trabalho', 'comida', 'cansaco', 'serie'], ganchos: ['uma coisa aleatória que aconteceu hoje', 'o dia que passou voando'] },
  escola: { rotulo: 'escola e estudos', filhos: ['professor', 'prova', 'amigos', 'cansaco'], ganchos: ['aquela prova que tirou o seu sono', 'o trabalho em grupo que ninguém faz a parte', 'a chamada que você quase faltou'] },
  professor: { rotulo: 'o professor', filhos: ['prova', 'escola', 'estresse'], ganchos: ['o professor que pede demais', 'a explicação que ninguém entendeu'] },
  prova: { rotulo: 'prova', filhos: ['professor', 'estresse', 'cansaco'], ganchos: ['a prova que ninguém passou', 'estudar de madrugada'] },
  amigos: { rotulo: 'os amigos', filhos: ['tedio', 'comida', 'escola'], ganchos: ['o grupo do WhatsApp que não para', 'a saída que ficou marcada de novo'] },
  trabalho: { rotulo: 'trabalho', filhos: ['reuniao', 'chefe', 'cansaco', 'fim_de_semana'], ganchos: ['a reunião que podia ser um e-mail', 'o cliente que muda tudo em cima da hora'] },
  reuniao: { rotulo: 'reunião', filhos: ['trabalho', 'cansaco'], ganchos: ['a reunião de duas horas com uma frase de resumo'] },
  chefe: { rotulo: 'o chefe', filhos: ['trabalho', 'estresse'], ganchos: ['o chefe que muda de ideia toda hora'] },
  cansaco: { rotulo: 'cansaço', filhos: ['sono', 'academia', 'comida', 'fim_de_semana'], ganchos: ['ficar morto depois da escola', 'a soneca que resolve tudo'] },
  sono: { rotulo: 'sono', filhos: ['cansaco', 'fim_de_semana'], ganchos: ['dormir mal e acordar pior', 'a cama que te chama às 22h'] },
  academia: { rotulo: 'academia', filhos: ['treino', 'comida', 'cansaco'], ganchos: ['treino de perna', 'aquela preguiça de treinar'] },
  treino: { rotulo: 'treino', filhos: ['academia', 'comida'], ganchos: ['o treino que você quase matou'] },
  comida: { rotulo: 'comida', filhos: ['restaurante', 'sobremesa'], ganchos: ['a pizza que salvou o dia', 'aquele lugar novo de comida'] },
  restaurante: { rotulo: 'restaurante', filhos: ['comida', 'fim_de_semana'], ganchos: ['o restaurante que a gente devia testar'] },
  sobremesa: { rotulo: 'sobremesa', filhos: ['comida'], ganchos: ['a sobremesa que sobrou para mim'] },
  musica: { rotulo: 'música', filhos: ['show', 'playlist'], ganchos: ['a música que não sai da cabeça', 'o show que você me contou'] },
  show: { rotulo: 'show', filhos: ['musica', 'fim_de_semana'], ganchos: ['o show que eu quase perdi'] },
  playlist: { rotulo: 'playlist', filhos: ['musica'], ganchos: ['a playlist que me descreve'] },
  serie: { rotulo: 'séries e filmes', filhos: ['tedio', 'arte'], ganchos: ['a série que eu viciei', 'a maratona de sábado'] },
  arte: { rotulo: 'arte e cultura', filhos: ['serie', 'musica'], ganchos: ['o filme que me marcou'] },
  viagem: { rotulo: 'viagem', filhos: ['praia', 'fim_de_semana'], ganchos: ['o fim de semana fora que ainda não aconteceu', 'a praia fora de temporada'] },
  praia: { rotulo: 'praia', filhos: ['viagem'], ganchos: ['o mar que falta na minha semana'] },
  familia: { rotulo: 'família', filhos: ['mae', 'almoco_domingo'], ganchos: ['o almoço de domingo', 'as tias que perguntam tudo'] },
  mae: { rotulo: 'a mãe', filhos: ['familia'], ganchos: ['a mãe que liga de novo'] },
  almoco_domingo: { rotulo: 'almoço de domingo', filhos: ['familia', 'comida'], ganchos: ['o almoço de domingo que vira festival'] },
  igreja: { rotulo: 'igreja', filhos: ['culto', 'mutirao'], ganchos: ['a escala do mês', 'a reunião que rendeu história'] },
  culto: { rotulo: 'culto', filhos: ['igreja'], ganchos: ['o louvor de domingo'] },
  mutirao: { rotulo: 'mutirão', filhos: ['igreja'], ganchos: ['o mutirão que sempre rende fofoca boa'] },
  amor: { rotulo: 'coisas do coração', filhos: ['saudade', 'encontro'], ganchos: ['aquela música que lembra você'] },
  saudade: { rotulo: 'saudade', filhos: ['amor'], ganchos: ['lembrar de você do nada'] },
  encontro: { rotulo: 'encontro', filhos: ['amor', 'comida'], ganchos: ['a conversa que ficou em aberto'] },
  tedio: { rotulo: 'tédio', filhos: ['serie', 'jogo', 'comida'], ganchos: ['nada pra fazer e o tempo parado', 'a preguiça que não tem hora'] },
  jogo: { rotulo: 'jogos', filhos: ['tedio', 'serie'], ganchos: ['a partida que acabou mal'] },
  estresse: { rotulo: 'estresse', filhos: ['cansaco', 'sono'], ganchos: ['a cabeça que não para'] },
  pet: { rotulo: 'bichos', filhos: ['casa', 'tedio'], ganchos: ['o bichinho dominando a casa'] },
  casa: { rotulo: 'a casa', filhos: ['comida', 'cansaco'], ganchos: ['a louça que se multiplica'] },
  clima: { rotulo: 'o tempo', filhos: ['dia'], ganchos: ['o tempo maluco de hoje'] },
  futuro: { rotulo: 'planos e sonhos', filhos: ['trabalho', 'viagem'], ganchos: ['o plano que ainda não aconteceu'] },
  fim_de_semana: { rotulo: 'fim de semana', filhos: ['comida', 'serie', 'viagem'], ganchos: ['o plano pro sábado'] },
};

/** O nó padrão quando o assunto ainda não se encaixa em lugar nenhum. */
export const TOPICO_PADRAO = 'dia';

/** Mapa do motor (temasDoTexto) → nós do grafo. */
const MAPA_TEMA: Record<string, string> = {
  trabalho: 'trabalho',
  estudo: 'escola',
  comida: 'comida',
  familia: 'familia',
  pet: 'pet',
  viagem: 'viagem',
  musica: 'musica',
  amor: 'amor',
  treino: 'academia',
  clima: 'clima',
  futuro: 'futuro',
  igreja: 'igreja',
  filhos: 'familia',
  'vida adulta': 'casa',
  cansaco: 'cansaco',
  dinheiro: 'trabalho',
  saudade: 'saudade',
  alegria: 'dia',
  idoso: 'familia',
};

/** O tópico da conversa desta mensagem (ou null se não se encaixar). */
export function topicoDaMensagem(texto: string): string | null {
  for (const tema of temasDoTexto(texto)) {
    const nodo = MAPA_TEMA[tema];
    if (nodo && GRAFO[nodo]) return nodo;
  }
  return null;
}

/** Rótulo legível de um nó do grafo. */
export const rotuloDoTopico = (id: string | null): string => (id && GRAFO[id] ? GRAFO[id].rotulo : 'o dia a dia');

/** Ganchos que um nó pode gerar (sugestões e puxadas). */
export const ganchosDoTopico = (id: string | null): string[] => (id && GRAFO[id] ? GRAFO[id].ganchos : GRAFO[TOPICO_PADRAO].ganchos);

export interface Transicao {
  topico: string;
  gancho: string;
  /** Frase pronta abrindo o assunto novo, na direção escolhida. */
  frase: string;
}

/**
 * Para onde a conversa vai agora. A curiosa segue o fio (vizinho do
 * nó atual); a brincalhona desvia com um gancho do próprio interesse;
 * sem assunto claro, volta para o dia a dia.
 */
export function transicaoDeTopico(
  atual: string | null,
  persona: Persona,
  p: Personalidade,
  rand: () => number,
  usados: string[] = [],
): Transicao {
  let destino: string | null = null;
  const no = atual ? GRAFO[atual] : null;
  if (no) {
    const candidatos = no.filhos.filter(f => GRAFO[f] && !usados.includes(f));
    // A curiosa segue o fio mais do que ninguém.
    if (candidatos.length && rand() < 0.45 + p.curiosidade * 0.5) {
      destino = candidatos[Math.floor(rand() * candidatos.length)];
    }
  }
  if (!destino && rand() < 0.4 + p.iniciativa * 0.3) {
    const interesse = persona.interesses[Math.floor(rand() * persona.interesses.length)];
    destino = MAPA_INTERESSE[interesse?.id || ''] || null;
  }
  if (!destino || !GRAFO[destino]) destino = TOPICO_PADRAO;
  const noDestino = GRAFO[destino];
  const gancho = noDestino.ganchos[Math.floor(rand() * noDestino.ganchos.length)];
  const frases = [
    `Vou te falar, ${gancho} me pegou hoje`,
    `Aconteceu uma coisa com ${gancho} e você não acredita`,
    `Hoje eu tive um dia com ${gancho}... te conto depois`,
    `Sabe de ${gancho}? Tá me tirando o sossego aqui`,
  ];
  return { topico: destino, gancho, frase: frases[Math.floor(rand() * frases.length)] };
}

/** Interesses da persona → nós do grafo (para puxada espontânea). */
const MAPA_INTERESSE: Record<string, string> = {
  treino: 'academia', musica: 'musica', estudo: 'escola', fe: 'igreja', viagem: 'viagem',
  arte: 'serie', games: 'jogo', pets: 'pet', comida: 'comida', familia: 'familia',
  amigos: 'amigos', rotina: 'dia', trabalho: 'trabalho', clima: 'clima', filhos: 'familia',
  casa: 'casa', autocuidado: 'sono', trabalho_adulto: 'trabalho', vinho: 'comida',
  seriados: 'serie', familia_grande: 'familia', saude: 'sono', contas: 'trabalho',
  igreja_adulto: 'igreja', viagem_adulto: 'viagem',
};
