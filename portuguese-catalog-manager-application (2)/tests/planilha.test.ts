import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppData, Person } from '../src/types';
import { RELACIONAMENTO_OPTIONS, relacionamentoLabel, temCompromisso } from '../src/types';
import { emptyData, getDefaultPerson, today } from '../src/store';
import {
  COLUNAS_DA_PLANILHA, baixarPlanilha, colunasDaPlanilha, copiarPlanilha, csvDasPessoas,
  linhasDaPlanilha, nomeDaPlanilha, tsvDasPessoas,
} from '../src/lib/planilha';

/**
 * A planilha é o caminho curto entre o catálogo e o Excel/Sheets: se uma célula
 * sair torta (separador errado, fórmula injetada, acento perdido) o arquivo abre
 * com colunas embaralhadas e ninguém percebe. Estes testes travam o formato.
 */

function dadosCom(pessoas: Person[], extra: Partial<AppData> = {}): AppData {
  return { ...emptyData(), people: pessoas, ...extra };
}

function pessoa(nome: string, mudanca: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), id: `p-${nome}`, nome, ...mudanca };
}

/** A célula de uma coluna pelo id, na linha da primeira pessoa. */
function celula(dados: AppData, pessoas: Person[], id: string, escopo: 'essencial' | 'completa' = 'completa') {
  const linhas = linhasDaPlanilha(pessoas, dados, escopo);
  const coluna = colunasDaPlanilha(escopo).findIndex(item => item.id === id);
  expect(coluna).toBeGreaterThanOrEqual(0);
  return linhas[1][coluna];
}

function definirClipboard(valor: Clipboard | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, writable: true, value: valor });
}

afterEach(() => {
  document.documentElement.classList.remove('privacy-active');
  definirClipboard(undefined);
  vi.restoreAllMocks();
});

describe('colunas da planilha', () => {
  it('o resumo tem as colunas do dia a dia e a completa traz tudo', () => {
    const essencial = colunasDaPlanilha('essencial');
    const completa = colunasDaPlanilha('completa');
    expect(essencial.length).toBe(17);
    expect(completa.length).toBe(COLUNAS_DA_PLANILHA.length);
    // Toda coluna do resumo também está na completa, na mesma ordem.
    expect(completa.filter(item => item.escopo === 'essencial').map(item => item.id)).toEqual(essencial.map(item => item.id));
  });

  it('cada coluna tem id único, cabeçalho e uma função de valor', () => {
    const ids = COLUNAS_DA_PLANILHA.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const coluna of COLUNAS_DA_PLANILHA) {
      expect(coluna.nome.trim().length).toBeGreaterThan(0);
      expect(typeof coluna.valor).toBe('function');
    }
  });

  it('traz a situação de relacionamento e o aviso de compromisso', () => {
    const dados = dadosCom([
      pessoa('Ana', { relacionamento: 'namorando' }),
      pessoa('Beto', { relacionamento: 'solteira' }),
      pessoa('Cris', { relacionamento: '' }),
    ]);
    expect(celula(dados, [dados.people[0]], 'relacionamento')).toBe(relacionamentoLabel('namorando'));
    expect(celula(dados, [dados.people[0]], 'compromisso')).toBe('Sim');
    expect(celula(dados, [dados.people[1]], 'compromisso')).toBe('Não');
    // Sem resposta fica em branco: "Não" seria mentira sobre quem não informou.
    expect(celula(dados, [dados.people[2]], 'relacionamento')).toBe('');
    expect(celula(dados, [dados.people[2]], 'compromisso')).toBe('');
  });

  it('não chama de "estado" o relacionamento: a ficha tem o próprio estado', () => {
    const nomes = colunasDaPlanilha('completa').map(item => item.nome);
    expect(nomes).toContain('Estado da ficha');
    expect(nomes).toContain('Relacionamento');
    expect(nomes).toContain('Tem alguém?');
    expect(nomes.filter(nome => /^estado$/i.test(nome))).toHaveLength(0);
  });

  it('lê o estado da ficha e a categoria como texto legível', () => {
    const base = emptyData();
    const categoria = base.categories[0];
    const dados = { ...base, people: [pessoa('Dora', { archivedAt: '2026-01-02', localizacaoOnde: categoria.value })] };
    expect(celula(dados, dados.people, 'estado')).toBe('Arquivada');
    expect(celula(dados, dados.people, 'categoria')).toBe(categoria.label);
    // Apagar a ficha muda o estado, e a planilha acompanha.
    const lixo = { ...dados, people: [{ ...dados.people[0], deletedAt: '2026-02-03' }] };
    expect(celula(lixo, lixo.people, 'estado')).toBe('Lixeira');
  });

  it('devolve só texto ou número, e nunca derruba o arquivo por uma célula', () => {
    // Fotos faltando: a coluna que leria `fotos.length` estoura, e a linha sai mesmo assim.
    const torta = { ...getDefaultPerson(), id: 'torta', nome: 'Ficha torta', fotos: undefined } as unknown as Person;
    const linhas = linhasDaPlanilha([torta], dadosCom([torta]), 'completa');
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toHaveLength(COLUNAS_DA_PLANILHA.length);
    for (const valor of linhas[1]) expect(['string', 'number']).toContain(typeof valor);
    expect(linhas[1][0]).toBe('Ficha torta');
  });
});

describe('o arquivo CSV', () => {
  it('abre com BOM, separa por ponto e vírgula e quebra linha com CRLF', () => {
    const csv = csvDasPessoas([pessoa('Ana'), pessoa('Beto')], dadosCom([pessoa('Ana'), pessoa('Beto')]));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas).toHaveLength(3);
    expect(linhas[0].startsWith('"Nome";')).toBe(true);
    expect(linhas[1].startsWith('"Ana";')).toBe(true);
  });

  it('coloca tudo entre aspas e dobra as aspas de dentro', () => {
    const dados = dadosCom([pessoa('Ana "a brava"', { descricao: 'linha 1\nlinha 2' })]);
    const [cabecalho, linha] = csvDasPessoas(dados.people, dados).slice(1).split('\r\n');
    expect(cabecalho.split(';').every(item => item.startsWith('"') && item.endsWith('"'))).toBe(true);
    expect(linha).toContain('"Ana ""a brava"""');
    expect(linha).not.toContain('\n');
  });

  it('neutraliza o que o Excel leria como fórmula', () => {
    const dados = dadosCom([
      pessoa('=SUM(A1:A9)', { descricao: '@todos veja isso' }),
      pessoa('Nota -5', { apelido: '+1 golpe' }),
    ]);
    const csv = csvDasPessoas(dados.people, dados);
    expect(csv).toContain('"\'=SUM(A1:A9)"');
    expect(csv).toContain('"\'@todos veja isso"');
    expect(csv).toContain('"\'+1 golpe"');
    // O apóstrofo só entra em texto: número negativo não pode virar "'-5".
    expect(csv).not.toContain('"\'-5"');
    expect(csv).toContain('"Nota -5"');
  });

  it('o resumo sai mais curto do que a planilha completa', () => {
    const dados = dadosCom([pessoa('Ana', { descricao: 'Um texto longo qualquer.' })]);
    expect(csvDasPessoas(dados.people, dados, 'essencial').length)
      .toBeLessThan(csvDasPessoas(dados.people, dados, 'completa').length);
    expect(csvDasPessoas(dados.people, dados, 'essencial')).not.toContain('Um texto longo qualquer.');
  });

  it('o nome do arquivo segue o padrão dos outros exports', () => {
    expect(nomeDaPlanilha()).toBe(`catalog-fichas-completas-${today()}.csv`);
    expect(nomeDaPlanilha('essencial')).toBe(`catalog-fichas-resumo-${today()}.csv`);
  });
});

describe('copiar para colar', () => {
  it('o TSV usa tabulação e uma linha por pessoa', () => {
    const dados = dadosCom([pessoa('Ana', { apelido: 'Aninha' }), pessoa('Beto')]);
    const linhas = tsvDasPessoas(dados.people, dados).split('\n');
    expect(linhas).toHaveLength(3);
    expect(linhas[0].split('\t')[0]).toBe('Nome');
    expect(linhas[1].split('\t').slice(0, 2)).toEqual(['Ana', 'Aninha']);
    expect(linhas[1]).not.toContain('"');
  });

  it('copia quando há área de transferência e devolve false sem ela', async () => {
    const dados = dadosCom([pessoa('Ana')]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    definirClipboard({ writeText } as unknown as Clipboard);
    expect(await copiarPlanilha(dados.people, dados)).toBe(true);
    expect(writeText.mock.calls[0][0]).toContain('Ana');
    definirClipboard(undefined);
    expect(await copiarPlanilha(dados.people, dados)).toBe(false);
    expect(await copiarPlanilha([], dadosCom([]))).toBe(false);
  });
});

describe('baixar a planilha', () => {
  it('gera o arquivo e devolve o resumo do que saiu', () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const dados = dadosCom([pessoa('Ana'), pessoa('Beto'), pessoa('Cris')]);
    const saida = baixarPlanilha(dados.people, dados, 'essencial');
    expect(saida).toEqual({ arquivo: nomeDaPlanilha('essencial'), pessoas: 3, colunas: 17 });
    expect(clique).toHaveBeenCalledTimes(1);
  });

  it('nega no modo privacidade e com a lista vazia', () => {
    document.documentElement.classList.add('privacy-active');
    expect(() => baixarPlanilha([pessoa('Ana')], dadosCom([pessoa('Ana')]))).toThrow(/privacidade/i);
    document.documentElement.classList.remove('privacy-active');
    expect(() => baixarPlanilha([], dadosCom([]))).toThrow(/Não há pessoas/i);
  });
});

describe('as opções de relacionamento', () => {
  it('marcam compromisso só quando há alguém', () => {
    const comCompromisso = RELACIONAMENTO_OPTIONS.filter(option => option.compromisso).map(option => option.value);
    expect(comCompromisso).toContain('namorando');
    expect(comCompromisso).toContain('casada');
    expect(comCompromisso).not.toContain('solteira');
    expect(comCompromisso).not.toContain('');
    for (const option of RELACIONAMENTO_OPTIONS) {
      expect(temCompromisso(pessoa('X', { relacionamento: option.value }))).toBe(option.compromisso);
    }
    expect(temCompromisso(pessoa('X', { relacionamento: 'namorando' }))).toBe(true);
    expect(relacionamentoLabel()).toBe('Não informado');
    expect(relacionamentoLabel('valor-antigo')).toBe('Não informado');
  });
});
