/**
 * Quem é você para ela.
 *
 * O simulador de conversa não olha só a ficha da pessoa: ele compara a idade
 * dela com a sua e lê o vínculo declarado. Daí saem quatro coisas que mudam o
 * papo de verdade:
 *
 *  1. **A diferença de idade.** Enquanto você é menor de idade e ela é bem
 *     mais velha, a conversa é de gente grande falando com criança: cuidado,
 *     conselho e nenhum assunto romântico. Entre dois adultos a diferença vira
 *     assunto e brincadeira — não muda o papel de ninguém.
 *  2. **A dinâmica de tia.** Acima de 35 anos ela entra no modo tia — fala com
 *     carinho, puxa a orelha, pergunta da família, compara com a época dela.
 *  3. **O vínculo declarado na ficha.** Tia, prima, líder, professora: o que
 *     você marcar em "vínculo comigo" manda mais que qualquer heurística.
 *  4. **A amizade.** O nível de amizade (0 a 5) define o quanto ela se solta.
 *
 * Tudo o que este arquivo devolve é texto curto e explicado, para o chat poder
 * mostrar à pessoa por que a resposta veio daquele jeito.
 */
import type { Person } from '../types';
import { ageFromBirthday } from '../store';
import { VINCULO_PAPEIS, vinculoComigoEhFamilia, vinculoComigoLabel, vinculoComigoPermiteRomance, vinculoInverso, vinculoLabel, type Vinculo } from '../types';

/** Idade considerada "tia" pela regra pedida: acima de 35 anos. */
export const IDADE_TIA = 35;
/** Idade mínima para existir clima adulto. Vale para os dois lados. */
export const IDADE_MINIMA_CLIMA = 18;
/**
 * A partir desta diferença ela te enxerga como criança — e isso só vale
 * enquanto você é menor de idade. Entre dois adultos a diferença de idade vira
 * assunto, não muda o papel: o clima depende da química construída.
 */
export const DIFERENCA_CRIANCA = 12;
/** A partir desta diferença ela é "bem mais velha" e o papo desacelera. */
export const DIFERENCA_MAIS_VELHA = 10;
/** Nível de amizade a partir do qual ela já fala como amiga próxima. */
export const AMIZADE_PROXIMA = 4;

export type DinamicaRelacao = 'sem-idade' | 'crianca' | 'guardia' | 'mais-velha' | 'proxima' | 'mais-nova' | 'muito-mais-nova';

export interface Familiar {
  /** Nome de quem está no catálogo. */
  nome: string;
  /** O que essa pessoa é dela: mãe, filha, irmã... */
  papel: string;
  personId: string;
  /** Idade registrada, quando existe. */
  idade: number | null;
}

export interface Relacao {
  /** Sua idade, quando você preencheu em Ajustes → Meu perfil. */
  minhaIdade: number | null;
  idadeDela: number | null;
  /** idade dela menos a sua. Positivo = ela é mais velha. */
  diferenca: number | null;
  dinamica: DinamicaRelacao;
  /** Acima de 35 anos: dinâmica de tia (maternal, conselheira, sem romance). */
  ehTia: boolean;
  /** Você ainda é menor de idade (menos de 18). */
  euMenor: boolean;
  /** Os dois são adultos: a diferença de idade não barra o clima. */
  ambosAdultos: boolean;
  /** Ela te trata como criança: só acontece quando você é menor de idade. */
  veCrianca: boolean;
  /** Vínculo familiar declarado em qualquer lado. */
  familiar: boolean;
  /** Ficha com menos de 18 anos: conversa adolescente, sem clima adulto. */
  adolescente: boolean;
  /** Pode existir flerte nesta relação? */
  flertePermitido: boolean;
  /** Pode existir conteúdo adulto (só com modo adulto ligado e química alta). */
  adultoPermitido: boolean;
  /** Nível de amizade 0-5 da ficha. */
  amizade: number;
  /** Ela já trata você como amiga(o) próxima(o)? */
  amizadeProxima: boolean;
  /** Como ela te chama nesta dinâmica. */
  tratamento: string[];
  /** Rótulo curto para a interface. */
  rotulo: string;
  /** Explicação em uma linha, mostrada no cartão "Como ela conversa". */
  descricao: string;
  /** O que ela é sua (tia, prima, líder...) — texto já legível. */
  vinculoComigo: string;
  /** Familiares dela que estão no catálogo. */
  familiares: Familiar[];
  /** Pessoas do catálogo para quem ela te apresenta (filha, irmã, mãe...). */
  nomesFamiliares: string[];
}

/** Idade de quem usa o catálogo: nascimento manda mais que o número digitado. */
export function idadeDoDono(settings?: { ownerAge?: number | null; ownerBirthday?: string | null } | null): number | null {
  if (!settings) return null;
  const doNascimento = ageFromBirthday(settings.ownerBirthday || undefined);
  if (doNascimento !== null) return doNascimento;
  const valor = settings.ownerAge;
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.max(0, Math.min(120, Math.round(numero)));
}

/** Familiares e pessoas próximas dela, já resolvidos com nome do catálogo. */
/** Tratamentos que pedem o nome junto: "Dona Célia", "Tia Rosa", "Seu José". */
const TRATAMENTOS = new Set(['dona', 'seu', 'sr', 'sra', 'senhor', 'senhora', 'dom', 'tia', 'tio', 'vó', 'vô', 'avo', 'avó', 'avô', 'prima', 'primo']);

/** Como ela chama o parente: "Dona Célia", "Tia Rosa", senão só o primeiro nome. */
export function nomeCurto(nome: string): string {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return nome || '';
  if (partes.length > 1 && TRATAMENTOS.has(partes[0].toLowerCase())) return `${partes[0]} ${partes[1]}`;
  return partes[0];
}

export function familiaresDe(person: Person, people: Person[]): Familiar[] {
  const vinculos: Vinculo[] = person.vinculos || [];
  return vinculos
    .map(vinculo => {
      const outra = people.find(p => p.id === vinculo.personId && !p.deletedAt);
      if (!outra) return null;
      return { nome: nomeCurto(outra.nome), papel: vinculoLabel(vinculo.papel), personId: outra.id, idade: outra.idade ?? null };
    })
    .filter((item): item is Familiar => !!item);
}

/**
 * Na ficha da outra pessoa aparece a relação invertida: se ela é mãe da Ana,
 * a Ana lê "filha de Marina". Evita ter que cadastrar os dois lados.
 */
export function vinculosInvertidos(person: Person, people: Person[]): { nome: string; papel: string; personId: string }[] {
  return people
    .filter(outra => outra.id !== person.id && !outra.deletedAt)
    .flatMap(outra => (outra.vinculos || [])
      .filter(vinculo => vinculo.personId === person.id)
      .map(vinculo => ({ nome: outra.nome.split(/\s+/)[0], papel: vinculoInverso(vinculo.papel), personId: outra.id })));
}

/** Todo mundo que aparece ligado à pessoa: vínculos dela + vínculos invertidos. */
export function redeFamiliar(person: Person, people: Person[]): Familiar[] {
  const diretos = familiaresDe(person, people);
  const indiretos = vinculosInvertidos(person, people).map(item => ({ ...item, idade: people.find(p => p.id === item.personId)?.idade ?? null }));
  const vistos = new Set(diretos.map(item => `${item.personId}:${item.papel}`));
  return [...diretos, ...indiretos.filter(item => !vistos.has(`${item.personId}:${item.papel}`))];
}

const CLAMPS = (valor: number, min: number, max: number) => Math.max(min, Math.min(max, valor));

/**
 * Analisa a relação entre você e a pessoa da ficha. É pura: não lê nada além
 * do que recebe, então pode ser usada em teste e na tela.
 */
export function analisarRelacao(person: Person, people: Person[], settings?: { ownerAge?: number | null; ownerBirthday?: string | null } | null): Relacao {
  const minhaIdade = idadeDoDono(settings);
  const idadeDela = person.idade ?? null;
  const diferenca = minhaIdade !== null && idadeDela !== null ? idadeDela - minhaIdade : null;
  const amizade = CLAMPS(Math.round(person.friendshipLevel || 0), 0, 5);
  const vinculo = person.vinculoComigo || '';
  const familiar = vinculoComigoEhFamilia(vinculo);
  const adolescente = idadeDela !== null && idadeDela < 18;

  const euMenor = minhaIdade !== null && minhaIdade < IDADE_MINIMA_CLIMA;
  // Dois adultos: a idade dela não decide o que pode ou não acontecer no papo.
  const ambosAdultos = minhaIdade !== null && minhaIdade >= IDADE_MINIMA_CLIMA && !adolescente;
  const ehTia = (idadeDela !== null && idadeDela > IDADE_TIA) || familiar;
  // Criança é só quando VOCÊ ainda é menor de idade e ela é bem mais velha.
  const veCrianca = euMenor && diferenca !== null && diferenca >= DIFERENCA_CRIANCA;
  const bemMaisVelha = diferenca !== null && diferenca >= DIFERENCA_MAIS_VELHA;

  let dinamica: DinamicaRelacao = 'proxima';
  if (veCrianca) dinamica = 'crianca';
  else if (familiar && diferenca !== null && diferenca >= 6) dinamica = 'guardia';
  else if (!ambosAdultos && (bemMaisVelha || (ehTia && diferenca !== null && diferenca >= 8))) dinamica = 'guardia';
  else if (diferenca === null) dinamica = 'sem-idade';
  else if (ehTia) dinamica = 'mais-velha';
  else if (diferenca >= 4) dinamica = 'mais-velha';
  else if (diferenca <= -14) dinamica = 'muito-mais-nova';
  else if (diferenca <= -4) dinamica = 'mais-nova';

  // Regra pedida: adulta só entra em clima com idade e química. Vínculo de
  // família e liderança bloqueiam sempre; a dinâmica de tia só bloqueia quando
  // nem todo mundo é adulto (você menor de idade ou idade não informada).
  const bloqueioFamiliar = familiar || vinculo === 'lider' || vinculo === 'professora';
  const tiaBloqueia = ehTia && !ambosAdultos;
  const flertePermitido = !veCrianca && !euMenor && !bloqueioFamiliar && !adolescente && vinculoComigoPermiteRomance(vinculo) && idadeDela !== null && idadeDela >= IDADE_MINIMA_CLIMA && !(tiaBloqueia && diferenca !== null && diferenca >= 8);
  const adultoPermitido = flertePermitido && !(tiaBloqueia && (diferenca === null || diferenca >= 6));

  const tratamento = veCrianca
    ? ['menino', 'meu filho', 'criança', 'garoto']
    : dinamica === 'guardia' || ehTia
      // Tia de verdade: carinho sem chamar um adulto de filho.
      ? (ambosAdultos ? ['meu bem', 'querida', 'você', 'gente'] : ['meu bem', 'meu filho', 'querido', 'menino'])
      : adolescente || euMenor
        ? ['gente', 'amiga', 'cara']
        : amizade >= AMIZADE_PROXIMA
          ? ['meu bem', 'amiga', 'querida', 'você']
          : ['amiga', 'você', 'gente'];

  const rotulo = familiar
    ? vinculoComigoLabel(vinculo)
    : veCrianca
      ? 'Ela te vê como criança'
      : euMenor
        ? 'Você é menor de idade'
        : dinamica === 'guardia'
          ? 'Dinâmica de tia'
          : ehTia
            ? 'Mais velha, jeito de tia'
            : adolescente
              ? 'Conversa adolescente'
            : amizade >= AMIZADE_PROXIMA
              ? 'Amizade próxima'
              : dinamica === 'mais-nova'
                ? 'Ela é mais nova que você'
                : minhaIdade === null
                  ? 'Idade não informada'
                  : 'Quase da mesma idade';

  const partes: string[] = [];
  if (idadeDela !== null) partes.push(`${idadeDela} anos`);
  if (minhaIdade !== null) partes.push(`você tem ${minhaIdade}`);
  if (diferenca !== null && diferenca !== 0) partes.push(`${Math.abs(diferenca)} ano(s) ${diferenca > 0 ? 'mais velha' : 'mais nova'}`);
  partes.push(`amizade nível ${amizade} (${['ainda não conheço bem', 'conhecida', 'contato ocasional', 'amizade em construção', 'amiga próxima', 'amizade muito próxima'][amizade]})`);
  if (familiar) partes.push(`vínculo: ${vinculoComigoLabel(vinculo)}`);
  if (veCrianca) partes.push('ela fala com você como quem cuida de uma criança');
  else if (euMenor) partes.push('você é menor de idade: o papo fica na amizade, sem clima adulto');
  if (ehTia) partes.push('jeito de tia: conselho, carinho e cobrança leve');
  if (ambosAdultos && diferenca !== null && diferenca >= DIFERENCA_CRIANCA) partes.push('diferença grande de idade entre dois adultos: ela brinca com isso, e o clima depende da química');
  if (!flertePermitido) partes.push('sem flerte nesta relação');
  else if (!adultoPermitido) partes.push('flerte só depois de muita química');
  if (minhaIdade === null) partes.push('informe sua idade em Ajustes → Meu perfil para a dinâmica ficar exata');

  const familiares = redeFamiliar(person, people);
  const descricao = partes.join(' · ');

  return {
    minhaIdade,
    idadeDela,
    diferenca,
    dinamica,
    ehTia,
    euMenor,
    ambosAdultos,
    veCrianca,
    familiar,
    adolescente,
    flertePermitido,
    adultoPermitido,
    amizade,
    amizadeProxima: amizade >= AMIZADE_PROXIMA,
    tratamento,
    rotulo,
    descricao,
    vinculoComigo: vinculo ? vinculoComigoLabel(vinculo) : '',
    familiares,
    nomesFamiliares: familiares.map(item => item.nome),
  };
}

/** Uma linha explicando por que a conversa está travada (usada nos avisos). */
export function motivoDoLimite(relacao: Relacao): string {
  if (relacao.familiar) return `Vínculo de família (${relacao.vinculoComigo}): por aqui a conversa fica no carinho e no conselho.`;
  if (relacao.veCrianca) return `Ela é ${relacao.diferenca} anos mais velha e fala com você como criança: nada de romance nessa conversa.`;
  if (relacao.euMenor) return 'Você é menor de idade: por aqui a conversa fica na amizade, sem conteúdo adulto.';
  if (relacao.ehTia) return 'Por enquanto é mais conversa de tia: falta química para o papo esquentar.';
  if (relacao.adolescente) return 'Ficha com menos de 18 anos: a conversa é adolescente e não tem conteúdo adulto.';
  return 'Ainda falta química para esse assunto.';
}

/** Texto curto para o cabeçalho do chat. */
export function seloDaRelacao(relacao: Relacao): string {
  if (relacao.idadeDela === null) return relacao.rotulo;
  if (relacao.diferenca === null) return `${relacao.rotulo} · ${relacao.idadeDela} anos`;
  const sinal = relacao.diferenca > 0 ? '+' : '';
  return `${relacao.rotulo} · ${relacao.idadeDela} anos (${sinal}${relacao.diferenca} em relação a você)`;
}

/** Todas as opções de papel familiar, já com o inverso calculado. */
export const PAPEIS_VINCULO = VINCULO_PAPEIS;

/** Usado pela ficha: descrição de um vínculo salvo. */
export function descreverVinculo(person: Person, people: Person[]): string[] {
  return redeFamiliar(person, people).map(item => `${item.papel} de ${item.nome}`);
}

/** Nome legível do vínculo que ela tem comigo, quando houver. */
export function vinculoComigoTexto(person: Person) {
  return person.vinculoComigo ? vinculoComigoLabel(person.vinculoComigo) : '';
}
