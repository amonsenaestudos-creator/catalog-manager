import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogProvider } from '../src/context';
import { getDefaultPerson } from '../src/store';
import { vinculoInverso, vinculoLabel } from '../src/types';
import type { AppData, MapaMental, Person } from '../src/types';
import { MapasMentais } from '../src/features/mapas';
import {
  ANEL_DO_MAPA, CORES_DO_MAPA, LIMITE_DO_TEXTO, TAMANHO_DO_NO, adicionarNo, arestasDe,
  contornoDoMapa, desligar, editarNo, limitesDoMapa, ligar, mapaDasRelacoes, mapaNovo, moverNo,
  nomeDoContorno, noPorId, organizar, raizDoMapa, removerNo, renomearMapa, resumoDoMapa,
  rotularLigacao, vizinhosDe,
} from '../src/features/mapas/mapa';
import { exportarMapaPng } from '../src/features/mapas/tela';

/**
 * Mapas mentais.
 *
 * A regra vive em `mapa.ts` e é pura: cada função devolve um mapa novo, ou o
 * MESMO objeto quando nada mudaria (é isso que impede o Ctrl+Z do aplicativo de
 * gravar passos vazios). Por isso boa parte dos testes abaixo compara identidade
 * de objeto, não só conteúdo.
 */

const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Um mapa de três níveis: raiz → ramo → folha, mais um nó solto sem fio. */
function mapaDeTeste(): { mapa: MapaMental; raiz: string; ramo: string; folha: string; solto: string } {
  let mapa = mapaNovo('Viagem de julho');
  const raiz = raizDoMapa(mapa)!.id;
  mapa = adicionarNo(mapa, 'Praia', { x: 200, y: 40 }, raiz);
  const ramo = mapa.nos[mapa.nos.length - 1].id;
  mapa = adicionarNo(mapa, 'Hotel barato', { x: 380, y: 120 }, ramo);
  const folha = mapa.nos[mapa.nos.length - 1].id;
  mapa = adicionarNo(mapa, 'Ideia solta', { x: -300, y: 260 }, null);
  const solto = mapa.nos[mapa.nos.length - 1].id;
  mapa = rotularLigacao(mapa, mapa.ligacoes[0].id, 'fim de semana');
  return { mapa, raiz, ramo, folha, solto };
}

afterEach(() => {
  document.documentElement.classList.remove('privacy-active');
  vi.restoreAllMocks();
});

describe('o modelo do mapa', () => {
  it('nasce com a ideia central no meio do plano', () => {
    const mapa = mapaNovo('Viagem de julho');
    expect(mapa.nome).toBe('Viagem de julho');
    expect(mapa.nos).toHaveLength(1);
    expect(mapa.ligacoes).toHaveLength(0);
    expect(raizDoMapa(mapa)).toEqual(expect.objectContaining({ texto: 'Ideia central', x: 0, y: 0 }));
    expect(mapa.createdAt).toBeTruthy();
    expect(mapaNovo('   ').nome).toBe('Mapa sem nome');
    expect(mapaNovo('X', 'Minha ideia').nos[0].texto).toBe('Minha ideia');
  });

  it('acrescenta um nó e o fio que o pendura no pai', () => {
    const { mapa, raiz, ramo, folha } = mapaDeTeste();
    expect(mapa.nos).toHaveLength(4);
    expect(mapa.ligacoes).toHaveLength(2);
    expect(mapa.ligacoes[0]).toEqual(expect.objectContaining({ de: raiz, para: ramo, rotulo: 'fim de semana' }));
    expect(mapa.ligacoes[1]).toEqual(expect.objectContaining({ de: ramo, para: folha }));
    expect(vizinhosDe(mapa, ramo).map(no => no.texto).sort()).toEqual(['Hotel barato', 'Ideia central']);
    expect(arestasDe(mapa, ramo)[0].rotulo).toBe('fim de semana');
  });

  it('não grava ligação duplicada, consigo mesma ou para nó que não existe', () => {
    const { mapa, raiz, ramo } = mapaDeTeste();
    expect(ligar(mapa, raiz, ramo)).toBe(mapa);
    expect(ligar(mapa, ramo, raiz)).toBe(mapa); // o fio não tem direção
    expect(ligar(mapa, raiz, raiz)).toBe(mapa);
    expect(ligar(mapa, raiz, 'nao-existe')).toBe(mapa);
    const ligado = ligar(mapa, mapa.nos[3].id, raiz);
    expect(ligado).not.toBe(mapa);
    expect(ligado.ligacoes).toHaveLength(3);
  });

  it('rotula, desliga e move sem sujar o histórico', () => {
    const { mapa, raiz, ramo } = mapaDeTeste();
    const rotulado = rotularLigacao(mapa, mapa.ligacoes[1].id, '  reservar  ');
    expect(rotulado.ligacoes[1].rotulo).toBe('reservar');
    expect(rotularLigacao(rotulado, mapa.ligacoes[1].id, 'reservar')).toBe(rotulado);
    expect(rotularLigacao(mapa, 'fio-fantasma', 'x')).toBe(mapa);

    const semFio = desligar(mapa, mapa.ligacoes[0].id);
    expect(semFio.ligacoes).toHaveLength(1);
    expect(desligar(semFio, mapa.ligacoes[0].id)).toBe(semFio);

    const movido = moverNo(mapa, raiz, { x: 12.4, y: -30.6 });
    expect(noPorId(movido, raiz)).toEqual(expect.objectContaining({ x: 12, y: -31 }));
    // Um clique sem arrasto não pode virar passo de histórico.
    expect(moverNo(movido, raiz, { x: 12, y: -31 })).toBe(movido);
    expect(moverNo(mapa, 'no-fantasma', { x: 1, y: 1 })).toBe(mapa);
  });

  it('edita o texto, a cor, a nota e a ficha vinculada, com limites', () => {
    const { mapa, ramo } = mapaDeTeste();
    const longo = editarNo(mapa, ramo, { texto: 'x'.repeat(LIMITE_DO_TEXTO + 40) });
    expect(noPorId(longo, ramo)!.texto).toHaveLength(LIMITE_DO_TEXTO);
    expect(noPorId(editarNo(mapa, ramo, { texto: '   ' }), ramo)!.texto).toBe('Sem título');

    const pintado = editarNo(mapa, ramo, { cor: CORES_DO_MAPA[2] });
    expect(noPorId(pintado, ramo)!.cor).toBe(CORES_DO_MAPA[2]);
    // Cor fora da paleta é ignorada: o nó não pode sair do tema.
    expect(editarNo(mapa, ramo, { cor: '#000000' })).toBe(mapa);

    const anotado = editarNo(mapa, ramo, { nota: 'y'.repeat(500) });
    expect(noPorId(anotado, ramo)!.nota).toHaveLength(400);

    const vinculado = editarNo(mapa, ramo, { personId: 'p-1' });
    expect(noPorId(vinculado, ramo)!.personId).toBe('p-1');
    expect(noPorId(editarNo(vinculado, ramo, { personId: null }), ramo)!.personId).toBeNull();
    expect(editarNo(mapa, 'no-fantasma', { texto: 'oi' })).toBe(mapa);
  });

  it('tira o nó e os fios que encostavam nele', () => {
    const { mapa, ramo, solto } = mapaDeTeste();
    const semRamo = removerNo(mapa, ramo);
    expect(semRamo.nos).toHaveLength(3);
    // Sobrou só o nada: os dois fios encostavam no ramo.
    expect(semRamo.ligacoes).toHaveLength(0);
    expect(semRamo.ligacoes.every(fio => noPorId(semRamo, fio.de) && noPorId(semRamo, fio.para))).toBe(true);
    expect(removerNo(mapa, 'no-fantasma')).toBe(mapa);
    // Tirar a raiz promove o próximo nó: `nos[0]` continua sendo a raiz.
    const semRaiz = removerNo(mapa, raizDoMapa(mapa)!.id);
    expect(raizDoMapa(semRaiz)!.id).toBe(mapa.nos[1].id);
    expect(noPorId(semRaiz, solto)).toBeTruthy();
  });

  it('renomeia o mapa e carimba a hora de cada mudança', () => {
    const mapa = mapaNovo('Rascunho');
    const renomeado = renomearMapa(mapa, '  Ideias do negócio  ', 'Para a reunião de sexta');
    expect(renomeado.nome).toBe('Ideias do negócio');
    expect(renomeado.descricao).toBe('Para a reunião de sexta');
    expect(renomeado).not.toBe(mapa);
    expect(renomearMapa(renomeado, '   ')).toBe(renomeado);
    expect(renomearMapa(renomeado, renomeado.nome)).toBe(renomeado);
    expect(renomearMapa(mapa, 'x'.repeat(120)).nome).toHaveLength(80);
  });
});

describe('organizar o plano', () => {
  it('espalha em anéis a partir da raiz e não esquece os soltos', () => {
    // Quatro filhos: assim o anel inteiro aparece (ele é uma elipse, mais larga
    // do que alta, porque o palco do computador é mais largo do que alto).
    let mapa = mapaNovo('Anéis');
    const raiz = raizDoMapa(mapa)!.id;
    ['Um', 'Dois', 'Três', 'Quatro'].forEach((texto, indice) => {
      mapa = adicionarNo(mapa, texto, { x: indice * 30, y: indice * 20 }, raiz);
    });
    const filhos = mapa.nos.slice(1).map(no => no.id);
    mapa = adicionarNo(mapa, 'Neto', { x: 90, y: 90 }, filhos[0]);
    const neto = mapa.nos[mapa.nos.length - 1].id;
    mapa = adicionarNo(mapa, 'Solto', { x: 0, y: 500 }, null);
    const solto = mapa.nos[mapa.nos.length - 1].id;

    const arrumado = organizar(mapa);
    expect(noPorId(arrumado, raiz)).toEqual(expect.objectContaining({ x: 0, y: 0 }));

    // Primeiro anel: os quatro filhos, nenhum em cima do outro.
    const distancias = filhos.map(id => distancia(noPorId(arrumado, raiz)!, noPorId(arrumado, id)!));
    expect(Math.max(...distancias)).toBeCloseTo(ANEL_DO_MAPA, 0); // os dois dos lados
    expect(Math.min(...distancias)).toBeCloseTo(ANEL_DO_MAPA * 0.68, 0); // os dois de cima e de baixo
    const posicoes = new Set(filhos.map(id => { const no = noPorId(arrumado, id)!; return `${no.x},${no.y}`; }));
    expect(posicoes.size).toBe(4);

    // Segundo anel: o neto, mais longe da raiz do que qualquer filho.
    expect(distancia(noPorId(arrumado, raiz)!, noPorId(arrumado, neto)!)).toBeGreaterThan(ANEL_DO_MAPA);
    // O solto vai para uma fileira abaixo de tudo, à vista.
    expect(noPorId(arrumado, solto)!.y).toBeGreaterThan(noPorId(arrumado, neto)!.y);
    expect(arrumado.nos).toHaveLength(mapa.nos.length);
    expect(arrumado.ligacoes).toHaveLength(mapa.ligacoes.length);
  });

  it('não muda nada quando só existe a raiz', () => {
    const mapa = mapaNovo('Uma ideia só');
    expect(organizar(mapa)).toBe(mapa);
    const vazio: MapaMental = { ...mapa, nos: [] };
    expect(organizar(vazio)).toBe(vazio);
    expect(limitesDoMapa(vazio)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
  });

  it('mede os limites já contando o tamanho da caixa do nó', () => {
    const mapa = mapaNovo('Medidas');
    const limites = limitesDoMapa(mapa);
    expect(limites.minX).toBe(-TAMANHO_DO_NO.largura / 2);
    expect(limites.maxX).toBe(TAMANHO_DO_NO.largura / 2);
    expect(limites.minY).toBe(-TAMANHO_DO_NO.altura / 2);
    expect(limites.maxY).toBe(TAMANHO_DO_NO.altura / 2);
  });
});

describe('o mapa em texto', () => {
  it('sai como contorno, com recuo por nível e o rótulo do fio', () => {
    const { mapa } = mapaDeTeste();
    const pessoas: Person[] = [{ ...getDefaultPerson(), id: 'p-hotel', nome: 'Dona Cleide' }];
    const comFicha = editarNo(mapa, mapa.nos[2].id, { personId: 'p-hotel', nota: 'pedir desconto' });
    const texto = contornoDoMapa(comFicha, pessoas);
    expect(texto.startsWith('# Viagem de julho\n')).toBe(true);
    expect(texto).toContain('- Ideia central\n');
    expect(texto).toContain('  - Praia (fim de semana)\n');
    expect(texto).toContain('    - Hotel barato — Dona Cleide: pedir desconto\n');
    // O nó sem caminho até a raiz também entra, no nível zero.
    expect(texto).toContain('- Ideia solta\n');
    expect(texto.endsWith('\n')).toBe(true);
  });

  it('conta nós, ligações e fichas de verdade', () => {
    const { mapa } = mapaDeTeste();
    expect(resumoDoMapa(mapa)).toEqual({ nos: 4, ligacoes: 2, pessoas: 0 });
    const comFicha = editarNo(mapa, mapa.nos[1].id, { personId: 'p-1' });
    const comFantasma = editarNo(comFicha, mapa.nos[2].id, { personId: 'p-que-nao-existe' });
    expect(resumoDoMapa(comFicha, [{ ...getDefaultPerson(), id: 'p-1', nome: 'Ana' }])).toEqual({ nos: 4, ligacoes: 2, pessoas: 1 });
    expect(resumoDoMapa(comFantasma, [{ ...getDefaultPerson(), id: 'p-1', nome: 'Ana' }]).pessoas).toBe(1);
  });

  it('o nome do arquivo não leva acento nem espaço', () => {
    expect(nomeDoContorno(mapaNovo('Viagem de Julho!'))).toBe('catalog-mapa-viagem-de-julho.md');
    expect(nomeDoContorno(mapaNovo('   '))).toBe('catalog-mapa-mapa-sem-nome.md');
    expect(nomeDoContorno({ ...mapaNovo('x'), nome: '!!!' })).toBe('catalog-mapa-sem-nome.md');
  });
});

describe('o mapa das relações', () => {
  it('coloca a ficha no meio e os vínculos em volta, nos dois sentidos', () => {
    const ana: Person = { ...getDefaultPerson(), id: 'ana', nome: 'Ana', vinculos: [{ id: 'v1', personId: 'marta', papel: 'mae' }] };
    const marta: Person = { ...getDefaultPerson(), id: 'marta', nome: 'Marta' };
    // Beto diz que a Ana é filha dele: no mapa dela o papel sai invertido.
    const beto: Person = { ...getDefaultPerson(), id: 'beto', nome: 'Beto', vinculos: [{ id: 'v2', personId: 'ana', papel: 'filha' }] };
    const dados: AppData = { ...getDefaultData(), people: [ana, marta, beto] };

    const mapa = mapaDasRelacoes(ana, dados);
    expect(mapa.nome).toBe('Relações de Ana');
    expect(mapa.nos).toHaveLength(3);
    expect(raizDoMapa(mapa)).toEqual(expect.objectContaining({ texto: 'Ana', personId: 'ana', x: 0, y: 0 }));
    expect(mapa.ligacoes).toHaveLength(2);
    const rotulos = mapa.ligacoes.map(fio => fio.rotulo).sort();
    expect(rotulos).toEqual([vinculoLabel('mae'), vinculoInverso('filha')].sort());
    // Ninguém se repete, e todo nó vizinho tem a ficha ligada.
    expect(new Set(mapa.nos.map(no => no.personId)).size).toBe(3);
    expect(mapa.nos.every(no => CORES_DO_MAPA.includes(no.cor))).toBe(true);
  });

  it('uma ficha sem vínculos vira um mapa só com ela', () => {
    const sozinha: Person = { ...getDefaultPerson(), id: 'so', nome: 'Sozinha' };
    const mapa = mapaDasRelacoes(sozinha, { ...getDefaultData(), people: [sozinha] });
    expect(mapa.nos).toHaveLength(1);
    expect(mapa.ligacoes).toHaveLength(0);
  });
});

function getDefaultData(): AppData {
  return { people: [], categories: [], locations: [], collections: [], stories: [], tierLists: [], reminders: [], activity: [], orphanPhotos: [], schemaVersion: 6, updatedAt: '' } as unknown as AppData;
}

describe('exportar em PNG', () => {
  /** Um contexto 2D de mentira que anota o que foi pedido a ele. */
  function contextoFalso(chamadas: string[]) {
    const alvo: Record<string, unknown> = { measureText: (texto: string) => ({ width: texto.length * 6 }) };
    return new Proxy(alvo, {
      get(objeto, propriedade: string) {
        if (propriedade in objeto) return objeto[propriedade];
        return (..._args: unknown[]) => { chamadas.push(propriedade); };
      },
      set(objeto, propriedade: string, valor) { objeto[propriedade] = valor; chamadas.push(`=${propriedade}`); return true; },
    });
  }

  function canvasDeMentira(chamadas: string[]) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => contextoFalso(chamadas) as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
      callback(new Blob(['png'], { type: 'image/png' }));
    } as unknown as HTMLCanvasElement['toBlob']);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  }

  it('desenha o mapa e devolve o nome do arquivo', async () => {
    const chamadas: string[] = [];
    canvasDeMentira(chamadas);
    const { mapa } = mapaDeTeste();
    const arquivo = await exportarMapaPng(mapa, [{ ...getDefaultPerson(), id: 'p-1', nome: 'Ana' }]);
    expect(arquivo).toBe('catalog-mapa-viagem-de-julho.png');
    expect(chamadas).toContain('fillText');
    expect(chamadas).toContain('fillRect');
    expect(chamadas).toContain('quadraticCurveTo');
    expect(chamadas.some(item => item === '=fillStyle')).toBe(true);
  });

  it('nega sem canvas, no modo privacidade e com o mapa vazio', async () => {
    const { mapa } = mapaDeTeste();
    // O `setup.ts` devolve `getContext` nulo: o navegador não gera a imagem.
    await expect(exportarMapaPng(mapa)).rejects.toThrow(/canvas/i);

    document.documentElement.classList.add('privacy-active');
    await expect(exportarMapaPng(mapa)).rejects.toThrow(/privacidade/i);
    document.documentElement.classList.remove('privacy-active');

    await expect(exportarMapaPng({ ...mapa, nos: [] })).rejects.toThrow(/nenhum nó/i);
  });
});

describe('a tela dos mapas mentais', () => {
  it('cria um mapa, acrescenta um nó e guarda tudo no catálogo', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><MapasMentais /></CatalogProvider>);

    expect(await screen.findByText('Nenhum mapa ainda')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Novo mapa/i }));

    const campo = await screen.findByPlaceholderText('Sobre o que é este mapa?');
    await user.type(campo, 'Viagem de julho');
    await user.click(screen.getByRole('button', { name: /Criar mapa/i }));

    // O plano abre já com a ideia central, e ela vem selecionada.
    const plano = await screen.findByRole('application', { name: /Plano do mapa Viagem de julho/i });
    expect(plano).toBeInTheDocument();
    expect(document.querySelectorAll('.mapa-no')).toHaveLength(1);
    expect(screen.getByText('Ideia central')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Nó selecionado' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Novo nó/i }));
    await waitFor(() => expect(document.querySelectorAll('.mapa-no')).toHaveLength(2));
    expect(screen.getByText('Nova ideia')).toBeInTheDocument();

    // Renomear pelo topo: dá para apagar tudo e digitar outro nome, com espaços,
    // e a gravação acontece no blur (o campo é um rascunho local).
    const nomeDoMapa = screen.getByRole('textbox', { name: 'Nome do mapa' });
    await user.clear(nomeDoMapa);
    expect(nomeDoMapa).toHaveValue('');
    await user.type(nomeDoMapa, 'Viagem em julho');
    nomeDoMapa.blur();
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nome do mapa' })).toHaveValue('Viagem em julho'));
    // Um nome vazio não apaga o título: o campo volta ao que estava gravado.
    await user.clear(nomeDoMapa);
    nomeDoMapa.blur();
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nome do mapa' })).toHaveValue('Viagem em julho'));
  });

  it('volta para a lista mostrando a miniatura e a contagem do mapa', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><MapasMentais /></CatalogProvider>);
    await screen.findByText('Nenhum mapa ainda');

    await user.click(screen.getByRole('button', { name: /Novo mapa/i }));
    await user.type(await screen.findByPlaceholderText('Sobre o que é este mapa?'), 'Ideias do negócio');
    await user.click(screen.getByRole('button', { name: /Criar mapa/i }));
    await screen.findByRole('application', { name: /Plano do mapa/i });
    await user.click(screen.getByRole('button', { name: /Novo nó/i }));
    await waitFor(() => expect(document.querySelectorAll('.mapa-no')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: /^Mapas$/ }));
    // O cartão inteiro (o ^ evita casar com o "Apagar o mapa …" ao lado).
    const cartao = await screen.findByRole('button', { name: /^Ideias do negócio/ });
    expect(cartao.textContent).toContain('2 nós');
    expect(cartao.textContent).toContain('1 ligação');
    expect(document.querySelector('.mapa-miniatura circle')).toBeTruthy();
  });

  it('o menu de exportar traz o PNG, o contorno e a cópia', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><MapasMentais /></CatalogProvider>);
    await screen.findByText('Nenhum mapa ainda');
    await user.click(screen.getByRole('button', { name: /Novo mapa/i }));
    await user.type(await screen.findByPlaceholderText('Sobre o que é este mapa?'), 'Exportações');
    await user.click(screen.getByRole('button', { name: /Criar mapa/i }));
    await screen.findByRole('application', { name: /Plano do mapa/i });

    await user.click(screen.getByRole('button', { name: /Exportar/i }));
    expect(await screen.findByRole('button', { name: 'Imagem em PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contorno em Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar o contorno' })).toBeInTheDocument();
  });
});
