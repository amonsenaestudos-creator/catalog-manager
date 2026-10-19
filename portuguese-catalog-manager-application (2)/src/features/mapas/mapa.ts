/**
 * Mapas mentais: a regra pura.
 *
 * Um mapa é um plano com **nós** (texto livre + posição) e **fios** entre eles.
 * Nada aqui conhece React nem canvas — é o mesmo arranjo de `edicao.ts` na
 * galeria: a regra fica em função pura para o teste conferir sem navegador, e a
 * tela só desenha o resultado.
 *
 * Três decisões valem nota:
 *   · **o primeiro nó é a raiz.** Não existe campo separado para isso: a raiz é
 *     `nos[0]`, e é dela que o "Organizar" espalha os anéis;
 *   · **as coordenadas são do plano, não da tela.** Quem vê aplica zoom e
 *     deslocamento, então o mapa não muda quando a janela muda — e um nó nunca
 *     precisa ser reposicionado porque o painel abriu;
 *   · **toda função devolve um mapa novo** (ou o mesmo objeto quando nada
 *     mudaria). Quem chama grava pelo `commit` do contexto, e é isso que faz o
 *     `Ctrl+Z` do aplicativo desfazer o passo: arrastar um nó é um passo só,
 *     no fim do arrasto, e não sessenta.
 */
import type { AppData, LigacaoDoMapa, MapaMental, NoDoMapa, Person } from '../../types';
import { vinculoInverso, vinculoLabel } from '../../types';
import { generateId, PALETTE } from '../../store';

export interface PontoDoMapa { x: number; y: number }

/** As cores dos nós: a paleta do catálogo, para o mapa combinar com o resto. */
export const CORES_DO_MAPA = PALETTE.slice(0, 6);

/** O tamanho de referência de um nó, em unidades do plano. */
export const TAMANHO_DO_NO: { largura: number; altura: number } = { largura: 176, altura: 58 };

/** A distância entre anéis quando o mapa é organizado a partir da raiz. */
export const ANEL_DO_MAPA = 230;

/** O quanto um mapa pode crescer antes de o texto do nó ser cortado na tela. */
export const LIMITE_DO_TEXTO = 90;

export const agora = () => new Date().toISOString();

export function noNovo(texto: string, em: PontoDoMapa, extra: Partial<NoDoMapa> = {}): NoDoMapa {
  return {
    id: generateId(),
    texto: texto.trim().slice(0, LIMITE_DO_TEXTO) || 'Sem título',
    x: Math.round(em.x),
    y: Math.round(em.y),
    cor: CORES_DO_MAPA[0],
    ...extra,
  };
}

export function ligacaoNova(de: string, para: string, rotulo = ''): LigacaoDoMapa {
  return { id: generateId(), de, para, rotulo };
}

/**
 * Um mapa novo, já com a raiz no meio do plano.
 *
 * Nascer com um nó (em vez de vazio) é de propósito: um mapa vazio não tem onde
 * clicar para começar, e a primeira coisa que se faz num mapa mental é escrever
 * a ideia central.
 */
export function mapaNovo(nome: string, ideiaCentral = 'Ideia central'): MapaMental {
  const quando = agora();
  return {
    id: generateId(),
    nome: nome.trim() || 'Mapa sem nome',
    descricao: '',
    nos: [noNovo(ideiaCentral, { x: 0, y: 0 })],
    ligacoes: [],
    createdAt: quando,
    updatedAt: quando,
  };
}

/** Devolve um mapa novo com o carimbo de hora trocado. */
function tocado(mapa: MapaMental, mudanca: Partial<MapaMental>): MapaMental {
  return { ...mapa, ...mudanca, updatedAt: agora() };
}

export const raizDoMapa = (mapa: MapaMental): NoDoMapa | null => mapa.nos[0] ?? null;

export const noPorId = (mapa: MapaMental, id: string | null): NoDoMapa | null =>
  (id ? mapa.nos.find(no => no.id === id) ?? null : null);

/** Os fios que saem de um nó, com o nó do outro lado e o rótulo do fio. */
export function arestasDe(mapa: MapaMental, id: string): { no: NoDoMapa; rotulo: string; ligacao: LigacaoDoMapa }[] {
  const saida: { no: NoDoMapa; rotulo: string; ligacao: LigacaoDoMapa }[] = [];
  for (const ligacao of mapa.ligacoes) {
    const outroId = ligacao.de === id ? ligacao.para : ligacao.para === id ? ligacao.de : null;
    if (!outroId) continue;
    const no = mapa.nos.find(item => item.id === outroId);
    if (no) saida.push({ no, rotulo: ligacao.rotulo || '', ligacao });
  }
  return saida;
}

/** O fio não tem direção: vizinho é vizinho dos dois lados. */
export const vizinhosDe = (mapa: MapaMental, id: string): NoDoMapa[] => arestasDe(mapa, id).map(aresta => aresta.no);

/**
 * Acrescenta um nó — e o fio que o pendura em `paiId`, quando houver.
 *
 * É o caminho do botão "Novo ramo": o nó nasce do lado do nó selecionado, não
 * no meio do plano em cima do que já estava lá.
 */
export function adicionarNo(
  mapa: MapaMental,
  texto: string,
  em: PontoDoMapa,
  paiId: string | null = null,
  extra: Partial<NoDoMapa> = {},
): MapaMental {
  const no = noNovo(texto, em, extra);
  const pai = noPorId(mapa, paiId);
  return tocado(mapa, {
    nos: [...mapa.nos, no],
    ligacoes: pai ? [...mapa.ligacoes, ligacaoNova(pai.id, no.id)] : mapa.ligacoes,
  });
}

/**
 * Liga dois nós.
 *
 * Devolve o mesmo mapa quando não há o que fazer — nó com ele mesmo, nó que não
 * existe ou fio que já existe (nos dois sentidos): assim o `commit` não grava um
 * passo que o `Ctrl+Z` desfaria sem mudar nada na tela.
 */
export function ligar(mapa: MapaMental, de: string, para: string, rotulo = ''): MapaMental {
  if (de === para) return mapa;
  if (!noPorId(mapa, de) || !noPorId(mapa, para)) return mapa;
  const existe = mapa.ligacoes.some(fio => (fio.de === de && fio.para === para) || (fio.de === para && fio.para === de));
  if (existe) return mapa;
  return tocado(mapa, { ligacoes: [...mapa.ligacoes, ligacaoNova(de, para, rotulo)] });
}

export function rotularLigacao(mapa: MapaMental, ligacaoId: string, rotulo: string): MapaMental {
  const limpo = rotulo.trim().slice(0, 40);
  const fio = mapa.ligacoes.find(item => item.id === ligacaoId);
  if (!fio || (fio.rotulo || '') === limpo) return mapa;
  return tocado(mapa, { ligacoes: mapa.ligacoes.map(item => (item.id === ligacaoId ? { ...item, rotulo: limpo } : item)) });
}

export function desligar(mapa: MapaMental, ligacaoId: string): MapaMental {
  const sobra = mapa.ligacoes.filter(item => item.id !== ligacaoId);
  return sobra.length === mapa.ligacoes.length ? mapa : tocado(mapa, { ligacoes: sobra });
}

/**
 * Move um nó para um ponto do plano.
 *
 * Arredonda para inteiros e devolve o mesmo mapa quando o nó não saiu do lugar:
 * um clique sem arrasto não pode virar um passo de histórico.
 */
export function moverNo(mapa: MapaMental, id: string, para: PontoDoMapa): MapaMental {
  const no = noPorId(mapa, id);
  if (!no) return mapa;
  const x = Math.round(para.x);
  const y = Math.round(para.y);
  if (no.x === x && no.y === y) return mapa;
  return tocado(mapa, { nos: mapa.nos.map(item => (item.id === id ? { ...item, x, y } : item)) });
}

export function editarNo(
  mapa: MapaMental,
  id: string,
  mudanca: Partial<Pick<NoDoMapa, 'texto' | 'cor' | 'nota' | 'personId'>>,
): MapaMental {
  const no = noPorId(mapa, id);
  if (!no) return mapa;
  const proximo: NoDoMapa = {
    ...no,
    ...(mudanca.texto !== undefined ? { texto: mudanca.texto.trim().slice(0, LIMITE_DO_TEXTO) || 'Sem título' } : {}),
    ...(mudanca.cor !== undefined && CORES_DO_MAPA.includes(mudanca.cor) ? { cor: mudanca.cor } : {}),
    ...(mudanca.nota !== undefined ? { nota: mudanca.nota.slice(0, 400) } : {}),
    ...(mudanca.personId !== undefined ? { personId: mudanca.personId } : {}),
  };
  if (proximo.texto === no.texto && proximo.cor === no.cor && proximo.nota === no.nota && proximo.personId === no.personId) return mapa;
  return tocado(mapa, { nos: mapa.nos.map(item => (item.id === id ? proximo : item)) });
}

/** Tira o nó e os fios que encostavam nele: não fica fio apontando para o vazio. */
export function removerNo(mapa: MapaMental, id: string): MapaMental {
  if (!noPorId(mapa, id)) return mapa;
  return tocado(mapa, {
    nos: mapa.nos.filter(no => no.id !== id),
    ligacoes: mapa.ligacoes.filter(fio => fio.de !== id && fio.para !== id),
  });
}

export function renomearMapa(mapa: MapaMental, nome: string, descricao?: string): MapaMental {
  const limpo = nome.trim().slice(0, 80);
  if (!limpo || (limpo === mapa.nome && (descricao === undefined || descricao === mapa.descricao))) return mapa;
  return tocado(mapa, { nome: limpo, ...(descricao !== undefined ? { descricao: descricao.slice(0, 200) } : {}) });
}

/**
 * Espalha os nós em anéis a partir da raiz.
 *
 * É uma BFS: quem está a um fio da raiz fica no primeiro anel, quem está a dois
 * fica no segundo, e assim por diante. O anel é uma elipse (mais larga do que
 * alta) porque o palco do computador é mais largo do que alto. O que não tem
 * caminho até a raiz não é esquecido: vai para uma fileira embaixo, à vista.
 */
export function organizar(mapa: MapaMental): MapaMental {
  const raiz = raizDoMapa(mapa);
  if (!raiz || mapa.nos.length < 2) return mapa;
  const posicoes = new Map<string, PontoDoMapa>([[raiz.id, { x: 0, y: 0 }]]);
  let nivel = [raiz.id];
  let anel = 1;
  while (nivel.length) {
    const proximos: string[] = [];
    for (const id of nivel) {
      for (const vizinho of vizinhosDe(mapa, id)) {
        if (posicoes.has(vizinho.id)) continue;
        posicoes.set(vizinho.id, { x: 0, y: 0 });
        proximos.push(vizinho.id);
      }
    }
    proximos.forEach((id, indice) => {
      const angulo = (indice / proximos.length) * Math.PI * 2 - Math.PI / 2;
      posicoes.set(id, {
        x: Math.round(Math.cos(angulo) * ANEL_DO_MAPA * anel),
        y: Math.round(Math.sin(angulo) * ANEL_DO_MAPA * anel * 0.68),
      });
    });
    nivel = proximos;
    anel += 1;
  }
  const soltos = mapa.nos.filter(no => !posicoes.has(no.id));
  soltos.forEach((no, indice) => posicoes.set(no.id, {
    x: Math.round((indice - (soltos.length - 1) / 2) * (TAMANHO_DO_NO.largura + 46)),
    y: Math.round(ANEL_DO_MAPA * anel * 0.68),
  }));
  return tocado(mapa, {
    nos: mapa.nos.map(no => {
      const par = posicoes.get(no.id);
      return par ? { ...no, x: par.x, y: par.y } : no;
    }),
  });
}

/** Quantas casas o texto de um nó ocupa na tela (para o plano caber no palco). */
export function limitesDoMapa(mapa: MapaMental): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!mapa.nos.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const meio = TAMANHO_DO_NO.largura / 2;
  const meiaAltura = TAMANHO_DO_NO.altura / 2;
  return mapa.nos.reduce(
    (acumulo, no) => ({
      minX: Math.min(acumulo.minX, no.x - meio),
      minY: Math.min(acumulo.minY, no.y - meiaAltura),
      maxX: Math.max(acumulo.maxX, no.x + meio),
      maxY: Math.max(acumulo.maxY, no.y + meiaAltura),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

/**
 * O mapa em texto, no formato de contorno (um traço por nó, recuo por nível).
 *
 * É o que se cola num e-mail ou num documento: o desenho não viaja bem em
 * texto, mas a hierarquia sim. O rótulo do fio entra entre parênteses e a
 * pessoa vinculada entra depois do travessão.
 */
export function contornoDoMapa(mapa: MapaMental, pessoas: Person[] = []): string {
  const linhas: string[] = [`# ${mapa.nome}`];
  if (mapa.descricao) linhas.push('', mapa.descricao);
  linhas.push('');
  const nomeDe = (id?: string | null) => pessoas.find(pessoa => pessoa.id === id)?.nome || '';
  const vistos = new Set<string>();
  const descer = (id: string, nivel: number, rotulo: string) => {
    if (vistos.has(id)) return;
    vistos.add(id);
    const no = noPorId(mapa, id);
    if (!no) return;
    const pessoa = nomeDe(no.personId);
    const partes = [
      '  '.repeat(nivel) + '- ' + no.texto,
      rotulo ? ` (${rotulo})` : '',
      pessoa ? ` — ${pessoa}` : '',
      no.nota ? `: ${no.nota}` : '',
    ];
    linhas.push(partes.join(''));
    for (const aresta of arestasDe(mapa, id)) descer(aresta.no.id, nivel + 1, aresta.rotulo);
  };
  const raiz = raizDoMapa(mapa);
  if (raiz) descer(raiz.id, 0, '');
  // o que não tem caminho desde a raiz também entra no contorno, no nível zero
  for (const no of mapa.nos) descer(no.id, 0, '');
  return `${linhas.join('\n')}\n`;
}

export function resumoDoMapa(mapa: MapaMental, pessoas: Person[] = []) {
  return {
    nos: mapa.nos.length,
    ligacoes: mapa.ligacoes.length,
    pessoas: mapa.nos.filter(no => no.personId && pessoas.some(pessoa => pessoa.id === no.personId)).length,
  };
}

/**
 * Um mapa pronto a partir dos vínculos de uma ficha.
 *
 * Lê os dois lados do vínculo: quem ela diz que é dela (a mãe, a irmã) e quem
 * diz que ela é a mãe ou a irmã — nesse segundo caso o papel sai invertido,
 * porque o mapa fala do ponto de vista dela.
 */
export function mapaDasRelacoes(pessoa: Person, dados: AppData): MapaMental {
  const quando = agora();
  const raiz: NoDoMapa = { ...noNovo(pessoa.nome, { x: 0, y: 0 }), personId: pessoa.id, cor: CORES_DO_MAPA[0] };
  const vizinhas: { outra: Person; papel: string }[] = [];
  const vistas = new Set<string>([pessoa.id]);
  for (const vinculo of pessoa.vinculos || []) {
    const outra = dados.people.find(item => item.id === vinculo.personId);
    if (!outra || vistas.has(outra.id)) continue;
    vistas.add(outra.id);
    vizinhas.push({ outra, papel: vinculoLabel(vinculo.papel) });
  }
  for (const outra of dados.people) {
    if (outra.id === pessoa.id || outra.deletedAt || vistas.has(outra.id)) continue;
    const inverso = (outra.vinculos || []).find(vinculo => vinculo.personId === pessoa.id);
    if (!inverso) continue;
    vistas.add(outra.id);
    vizinhas.push({ outra, papel: vinculoInverso(inverso.papel) });
  }
  const nos: NoDoMapa[] = [raiz];
  const ligacoes: LigacaoDoMapa[] = [];
  vizinhas.forEach(({ outra, papel }, indice) => {
    const angulo = (indice / Math.max(1, vizinhas.length)) * Math.PI * 2 - Math.PI / 2;
    const no: NoDoMapa = {
      ...noNovo(outra.nome, {
        x: Math.cos(angulo) * ANEL_DO_MAPA,
        y: Math.sin(angulo) * ANEL_DO_MAPA * 0.68,
      }),
      personId: outra.id,
      cor: CORES_DO_MAPA[(indice + 1) % CORES_DO_MAPA.length],
    };
    nos.push(no);
    ligacoes.push({ ...ligacaoNova(raiz.id, no.id), rotulo: papel });
  });
  return {
    id: generateId(),
    nome: `Relações de ${pessoa.nome}`,
    descricao: 'Gerado a partir dos vínculos da ficha.',
    nos,
    ligacoes,
    createdAt: quando,
    updatedAt: quando,
  };
}

/** O nome do arquivo de contorno: sem acento nem espaço, como os outros exports. */
export const nomeDoContorno = (mapa: MapaMental) =>
  `catalog-mapa-${mapa.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'sem-nome'}.md`;
