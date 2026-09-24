/**
 * Surpreenda-me: o catálogo dá um motivo para abrir o app.
 *
 * Nada aqui é inventado sobre as pessoas — toda surpresa nasce de um
 * dado real do catálogo (uma nota antiga, um aniversário próximo, duas
 * fichas com o mesmo signo, uma ficha parada). Se o catálogo ainda não
 * tem o quê, a surpresa é honesta: "adicione gente e eu te surpreendo".
 */
import type { AppData, Person } from '../types';
import { ageFromBirthday, calculateOverallRating, formatNumber, getFinalScore, isActive, upcomingBirthday } from '../store';

export type SurpresaAcao = 'comparar' | 'ver_pessoa' | null;

export interface Surpresa {
  tipo: 'confronto' | 'memoria_esquecida' | 'ficha_parada' | 'aniversario' | 'coincidencia' | 'historia_longa' | 'nota_mais_alta';
  /** Chave estável: evita sorteiar a mesma surpresa duas vezes seguidas. */
  chave: string;
  titulo: string;
  descricao: string;
  pessoa?: Person;
  par?: [Person, Person];
  acao: SurpresaAcao;
}

const diasDesde = (iso: string, agora: Date) => Math.max(0, Math.floor((agora.getTime() - Date.parse(iso)) / 86400000));

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export function listarSurpresas(data: AppData, agora = new Date()): Surpresa[] {
  const ativas = data.people.filter(p => isActive(p));
  const surpresas: Surpresa[] = [];
  if (!ativas.length) return surpresas;

  // Confronto: duas fichas que ainda não passaram pelo comparador.
  if (ativas.length >= 2) {
    for (let i = ativas.length - 1; i > 0; i--) {
      const j = Math.floor(agora.getTime() / 1000 % (i + 1)) % (i + 1); // estável por hora
      [ativas[i], ativas[j]] = [ativas[j], ativas[i]];
    }
    const [a, b] = [ativas[0], ativas[1]];
    surpresas.push({
      tipo: 'confronto',
      chave: `confronto:${[a.id, b.id].sort().join('+')}`,
      titulo: `${a.nome} × ${b.nome}`,
      descricao: 'Um confronto que ainda não fez. Quem parece mais com você — e quem você entenderia melhor? Dá uma olhada lado a lado.',
      par: [a, b],
      acao: 'comparar',
    });
  }

  // Memória esquecida: a nota mais antiga do catálogo.
  const notas = ativas.flatMap(p => (p.notas || []).map(n => ({ nota: n, pessoa: p })));
  if (notas.length) {
    const maisAntiga = [...notas].sort((x, y) => (x.nota.date || '').localeCompare(y.nota.date || ''))[0];
    const dias = diasDesde(maisAntiga.nota.date || agora.toISOString(), agora);
    if (dias >= 3) {
      const conteudo = (maisAntiga.nota.content || '').trim();
      surpresas.push({
        tipo: 'memoria_esquecida',
        chave: `memoria:${maisAntiga.nota.id}`,
        titulo: 'Uma memória esquecida',
        descricao: `${dias} ${plural(dias, 'dia', 'dias')} atrás você registrou sobre ${maisAntiga.pessoa.nome}: “${conteudo.length > 160 ? conteudo.slice(0, 157) + '…' : conteudo || maisAntiga.nota.title}”. ${maisAntiga.pessoa.nome} deve achar engraçado que você lembrou disso.`,
        pessoa: maisAntiga.pessoa,
        acao: 'ver_pessoa',
      });
    }
  }

  // Ficha parada: a pessoa mais ativa do catálogo que você não toca há tempo.
  const parada = [...ativas]
    .map(p => ({ p, dias: diasDesde(p.updatedAt || p.createdAt, agora) }))
    .filter(x => x.dias >= 14)
    .sort((a, b) => b.dias - a.dias)[0];
  if (parada) {
    surpresas.push({
      tipo: 'ficha_parada',
      chave: `parada:${parada.p.id}`,
      titulo: `${parada.p.nome} esperando por você`,
      descricao: `${parada.dias} dias sem nenhuma mudança na ficha de ${parada.p.nome}. Uma nota nova, uma foto, uma conversa — qualquer coisa volta a contar a história.`,
      pessoa: parada.p,
      acao: 'ver_pessoa',
    });
  }

  // Aniversário próximo: até 7 dias (ou hoje).
  const aniversariante = ativas
    .map(p => ({ p, dias: upcomingBirthday(p.aniversario) }))
    .filter(x => x.dias !== null && (x.dias as number) <= 7)
    .sort((a, b) => (a.dias as number) - (b.dias as number))[0];
  if (aniversariante) {
    const dias = aniversariante.dias as number;
    const idade = ageFromBirthday(aniversariante.p.aniversario);
    surpresas.push({
      tipo: 'aniversario',
      chave: `aniversario:${aniversariante.p.id}`,
      titulo: dias === 0 ? `O aniversário de ${aniversariante.p.nome} é HOJE` : `Faltam ${dias} ${plural(dias, 'dia', 'dias')} para o aniversário de ${aniversariante.p.nome}`,
      descricao: dias === 0
        ? `Não existe melhor momento para uma mensagem. ${aniversariante.p.nome} merece. ${idade !== null ? `Vira ${idade + 1} anos.` : ''}`
        : 'Chega chegando e a lembrança vale ouro. Que tal se adiantar?',
      pessoa: aniversariante.p,
      acao: 'ver_pessoa',
    });
  }

  // Coincidências: o catálogo conversando com ele mesmo.
  const porAniversario = new Map<string, Person[]>();
  ativas.forEach(p => {
    if (!p.aniversario || !Number.isFinite(Date.parse(p.aniversario))) return;
    const d = new Date(p.aniversario);
    porAniversario.set(`${d.getMonth()}-${d.getDate()}`, [...(porAniversario.get(`${d.getMonth()}-${d.getDate()}`) || []), p]);
  });
  for (const grupo of porAniversario.values()) {
    if (grupo.length >= 2) {
      surpresas.push({
        tipo: 'coincidencia',
        chave: `coincidenca:aniv:${grupo.map(g => g.id).sort().join('+')}`,
        titulo: 'Mesmo dia, mesmo mês',
        descricao: `${grupo.map(g => g.nome).join(', ')} ${grupo.length === 2 ? 'fazem' : `são ${grupo.length} que fazem`} aniversário no mesmo dia. Coincidência boa para um presente coletivo.`,
        pessoa: grupo[0],
        acao: 'ver_pessoa',
      });
      break;
    }
  }
  const porNome = new Map<string, Person[]>();
  ativas.forEach(p => {
    const nome = (p.nome || '').trim().split(/\s+/)[0]?.toLocaleLowerCase('pt-BR') || '';
    if (!nome) return;
    porNome.set(nome, [...(porNome.get(nome) || []), p]);
  });
  for (const [nome, grupo] of porNome) {
    if (grupo.length >= 3) {
      surpresas.push({
        tipo: 'coincidencia',
        chave: `coincidenca:nome:${nome}`,
        titulo: `Seu catálogo tem ${grupo.length} ${grupo[0].nome.trim().split(/\s+/)[0]}`,
        descricao: `${grupo.slice(0, 4).map(g => g.nome).join(', ')}${grupo.length > 4 ? ` e mais ${grupo.length - 4}` : ''}. Se você chamar, todos vão atender — e você vai ter que explicar.`,
        pessoa: grupo[0],
        acao: 'ver_pessoa',
      });
      break;
    }
  }
  const porSigno = new Map<string, Person[]>();
  ativas.forEach(p => {
    if (!p.signo) return;
    porSigno.set(p.signo, [...(porSigno.get(p.signo) || []), p]);
  });
  for (const [signo, grupo] of porSigno) {
    if (grupo.length >= 3) {
      surpresas.push({
        tipo: 'coincidencia',
        chave: `coincidenca:signo:${signo}`,
        titulo: `Clã dos ${signo}`,
        descricao: `${grupo.length} pessoas do catálogo com o mesmo signo (${signo}). ${grupo.slice(0, 3).map(g => g.nome).join(', ')} — o resto é leitura, hein.`,
        pessoa: grupo[0],
        acao: 'ver_pessoa',
      });
      break;
    }
  }

  // História longa: a ficha mais antiga do catálogo.
  const maisAntiga = [...ativas].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0];
  const diasDeCasa = diasDesde(maisAntiga.createdAt || agora.toISOString(), agora);
  if (diasDeCasa >= 30) {
    const tempo = diasDeCasa >= 365
      ? `${formatNumber(Math.floor(diasDeCasa / 365), 0)} ${Math.floor(diasDeCasa / 365) === 1 ? 'ano' : 'anos'}`
      : `${formatNumber(Math.floor(diasDeCasa / 30), 0)} ${Math.floor(diasDeCasa / 30) === 1 ? 'mês' : 'meses'}`;
    surpresas.push({
      tipo: 'historia_longa',
      chave: `historia:${maisAntiga.id}`,
      titulo: 'Sua história mais longa',
      descricao: `${maisAntiga.nome} faz parte do seu catálogo há ${tempo}. Tem gente que você conhece melhor do que conhece essas pessoas.`,
      pessoa: maisAntiga,
      acao: 'ver_pessoa',
    });
  }

  // Nota mais alta: a ficha de topo, com o nome do trono.
  const topo = ativas
    .map(p => ({ p, nota: getFinalScore(p) }))
    .filter(x => x.nota > 0)
    .sort((a, b) => b.nota - a.nota)[0];
  if (topo) {
    surpresas.push({
      tipo: 'nota_mais_alta',
      chave: `topo:${topo.p.id}`,
      titulo: `${topo.p.nome} no topo do catálogo`,
      descricao: `A nota mais alta do catálogo é ${formatNumber(topo.nota)} — e a dona é ${topo.p.nome}. ${calculateOverallRating(topo.p.rating) >= 4 ? 'Não é pouca coisa.' : 'O trono está em disputa.'}`,
      pessoa: topo.p,
      acao: 'ver_pessoa',
    });
  }

  return surpresas;
}

/**
 * Sorteia uma surpresa, evitando repetir a última. Sem dados para
 * surpreender, devolve null (o modal diz a verdade).
 */
export function sorteSurpresa(data: AppData, ultimaChave?: string | null, rand: () => number = Math.random, agora = new Date()): Surpresa | null {
  const todas = listarSurpresas(data, agora);
  if (!todas.length) return null;
  const candidatas = ultimaChave ? todas.filter(s => s.chave !== ultimaChave) : todas;
  const pool = candidatas.length ? candidatas : todas;
  return pool[Math.floor(rand() * pool.length)];
}
