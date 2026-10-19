import { readFileSync } from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as store from '../src/store';
import * as types from '../src/types';
import { RELACIONAMENTO_OPTIONS, relacionamentoLabel, temCompromisso } from '../src/types';
import { CatalogProvider, useCatalog } from '../src/context';
import AddPerson from '../src/components/AddPerson';
import PersonDrawer from '../src/components/PersonDrawer';
import { completeness, emptyData, getDefaultPerson } from '../src/store';
import { seedIdb } from './catalog.test';

/**
 * A ficha ficou mais leve.
 *
 * Três mudanças que o usuário pediu e que precisam continuar valendo:
 *  1. só o nome é obrigatório — a descrição nunca mais trava o salvamento nem
 *     aparece como "falta preencher";
 *  2. a situação de relacionamento entrou no lugar dela, com aviso quando há
 *     compromisso (para não fazer merda);
 *  3. pronomes e signo saíram da ficha.
 */

const fonteDe = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), 'utf8');

/** Espia o catálogo de dentro do provider: quantas fichas existem agora. */
function Espiao() {
  const { data } = useCatalog();
  return <output data-testid="total-de-fichas">{data.people.length}</output>;
}

describe('a descrição é opcional', () => {
  it('não entra na conta de ficha completa', () => {
    const soNome = { ...getDefaultPerson(), nome: 'Ana' };
    const faltando = completeness(soNome).missing;
    expect(faltando).not.toContain('Descrição');
    expect(completeness(soNome).percent).toBe(Math.round(1 / 7 * 100));

    // Tudo preenchido, menos a descrição: 100%.
    const completa = {
      ...soNome,
      fotos: [{ id: 'f1', personId: soNome.id, isMain: true, type: 'normal' as const, url: '/a.jpg', name: 'a.jpg' }],
      localizacaoOnde: 'app', redesSociais: '@ana', localizacaoMora: 'Salvador, BA', tags: ['amiga'],
      rating: { ...soNome.rating, rosto: 5 },
    };
    expect(completeness(completa).missing).toEqual([]);
    expect(completeness(completa).percent).toBe(100);
  });

  it('salva uma ficha nova com só o nome', async () => {
    await seedIdb(emptyData());
    const user = userEvent.setup();
    render(<CatalogProvider><AddPerson /><Espiao /></CatalogProvider>);

    const descricao = await screen.findByLabelText(/Descrição \(opcional\)/i);
    expect(descricao).not.toBeRequired();
    expect(descricao.tagName).toBe('TEXTAREA');
    expect(screen.getByText(/Só o nome é obrigatório/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Como a pessoa se chama?'), 'Ana Sem Descrição');
    const salvar = screen.getByRole('button', { name: /^Salvar ficha/ });
    expect(salvar).toBeEnabled();
    await user.click(salvar);

    await waitFor(() => expect(screen.getByTestId('total-de-fichas')).toHaveTextContent('1'));
  });
});

describe('pronomes e signo saíram da ficha', () => {
  it('as listas de opções não existem mais no modelo', () => {
    expect('PRONOME_OPTIONS' in types).toBe(false);
    expect('SIGNO_OPTIONS' in types).toBe(false);
    expect('PRONOME_OPTIONS' in store).toBe(false);
  });

  it('nenhum campo da interface os oferece', async () => {
    await seedIdb(emptyData());
    render(<CatalogProvider><AddPerson /></CatalogProvider>);
    await screen.findByPlaceholderText('Como a pessoa se chama?');
    expect(screen.queryByLabelText(/pronomes/i)).toBeNull();
    expect(screen.queryByLabelText(/signo/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bsigno\b/i);
  });

  it('o editor e a ficha não voltam a renderizar os dois campos', () => {
    for (const caminho of ['../src/components/PersonEditor.tsx', '../src/components/PersonDrawer.tsx', '../src/components/AddPerson.tsx']) {
      const fonte = fonteDe(caminho);
      expect(fonte).not.toMatch(/label="Pronomes"/);
      expect(fonte).not.toMatch(/label="Signo"/);
      expect(fonte).not.toMatch(/SIGNO_OPTIONS/);
      expect(fonte).not.toMatch(/PRONOME_OPTIONS/);
    }
  });
});

describe('a situação de relacionamento', () => {
  it('o campo oferece as situações e marca quem tem compromisso', () => {
    expect(RELACIONAMENTO_OPTIONS.map(option => option.value)).toEqual([
      '', 'solteira', 'conhecendo', 'namorando', 'noiva', 'casada', 'relacionamento', 'complicado',
    ]);
    expect(RELACIONAMENTO_OPTIONS.filter(option => option.compromisso).map(option => option.value))
      .toEqual(['conhecendo', 'namorando', 'noiva', 'casada', 'relacionamento', 'complicado']);
    expect(relacionamentoLabel('casada')).toBe('Casada');
    expect(relacionamentoLabel('')).toBe('Não informado');
    expect(temCompromisso({ ...getDefaultPerson(), relacionamento: 'conhecendo' })).toBe(true);
    expect(temCompromisso({ ...getDefaultPerson(), relacionamento: 'solteira' })).toBe(false);
    // Uma ficha antiga, sem o campo, não ganha compromisso inventado.
    expect(temCompromisso(getDefaultPerson())).toBe(false);
  });

  it('aparece no formulário e avisa na ficha quando há alguém', async () => {
    await seedIdb(emptyData());
    const user = userEvent.setup();
    render(<CatalogProvider><AddPerson /></CatalogProvider>);

    const campo = await screen.findByLabelText(/^Relacionamento/i);
    expect(campo.tagName).toBe('SELECT');
    expect((campo as HTMLSelectElement).value).toBe('');
    expect(screen.getByText(/Se ela tem alguém, diga aqui/i)).toBeInTheDocument();

    await user.selectOptions(campo, 'namorando');
    // A ajuda muda de tom: agora a ficha avisa nos outros lugares.
    expect(await screen.findByText(/A ficha passa a avisar que há compromisso/i)).toBeInTheDocument();
    expect(screen.queryByText(/Se ela tem alguém, diga aqui/i)).toBeNull();
  });

  it('a ficha aberta mostra o recado só para quem tem compromisso', async () => {
    const comprometida = { ...getDefaultPerson(), id: 'casada-1', nome: 'Marta', relacionamento: 'casada' as const };
    const { unmount } = render(<CatalogProvider><PersonDrawer person={comprometida} /></CatalogProvider>);
    const recado = await screen.findByText(/A ficha diz que ela tem alguém/i);
    expect(recado.closest('.rel-recado')?.textContent).toContain('Casada');
    unmount();

    const solteira = { ...getDefaultPerson(), id: 'solteira-1', nome: 'Rita', relacionamento: 'solteira' as const };
    render(<CatalogProvider><PersonDrawer person={solteira} /></CatalogProvider>);
    await screen.findAllByText('Rita');
    expect(screen.queryByText(/A ficha diz que ela tem alguém/i)).toBeNull();
    expect(document.querySelector('.rel-recado')).toBeNull();
  });
});

describe('a planilha no lugar do CSV antigo', () => {
  it('o exportCsv saiu do store: só existe o caminho da planilha', () => {
    expect('exportCsv' in store).toBe(false);
    expect(fonteDe('../src/lib/planilha.ts')).toMatch(/export function csvDasPessoas/);
    // Os três lugares que exportavam agora passam pela planilha.
    for (const caminho of ['../src/components/Catalog.tsx', '../src/components/QuickTools.tsx', '../src/components/Ranking.tsx']) {
      expect(fonteDe(caminho)).toMatch(/lib\/planilha/);
      expect(fonteDe(caminho)).not.toMatch(/exportCsv/);
    }
  });
});
