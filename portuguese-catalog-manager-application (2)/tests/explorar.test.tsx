import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { bootApp, seededData, seedIdb } from './catalog.test';

async function gotoExplorar() {
  const aside = document.querySelector('.sidebar') as HTMLElement;
  const button = within(aside).getByRole('button', { name: /^Explorar$/i }) as HTMLElement;
  await act(async () => { button.click(); });
  await waitFor(() => expect(document.querySelector('.explorar-page')).toBeTruthy(), { timeout: 20000 });
}

async function abrirAba(rotulo: RegExp) {
  const tabs = [...document.querySelectorAll<HTMLElement>('.explorar-tabs > button')];
  const tab = tabs.find(t => rotulo.test(t.textContent || ''));
  expect(tab, `aba ${rotulo} precisa existir`).toBeTruthy();
  await act(async () => { tab!.click(); });
}

describe('explorar', () => {
  beforeEach(async () => { await seedIdb(seededData(12, 2)); });

  it('abre com presente, sequência e momentos do dia', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await gotoExplorar();

    expect(screen.getByText(/Presente de hoje/i)).toBeInTheDocument();
    expect(screen.getByText(/Hoje no seu catálogo/i)).toBeInTheDocument();
    expect(screen.getByText(/Sequência de descobertas/i)).toBeInTheDocument();

    // Abrir o presente revela o conteúdo sem erro.
    const botao = screen.getByRole('button', { name: /Abrir presente/i });
    await act(async () => { botao.click(); });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Abrir$/i })).toBeInTheDocument());
  });

  it('navega pela trilha, mapa, tempo e TV sem quebrar', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await gotoExplorar();

    await abrirAba(/Trilha/i);
    expect(document.querySelector('.trilha-cartao')).toBeTruthy();
    const proximo = screen.queryByRole('button', { name: /Próximo passo/i });
    if (proximo) {
      await act(async () => { proximo.click(); });
      expect(document.querySelector('.trilha-cartao')).toBeTruthy();
    }

    await abrirAba(/Mapa/i);
    expect(document.querySelector('.mapa-svg')).toBeTruthy();
    expect(document.querySelectorAll('.mapa-no').length).toBeGreaterThan(1);

    await abrirAba(/Tempo/i);
    expect(document.querySelector('.tempo-anos')).toBeTruthy();

    await abrirAba(/Assistir/i);
    expect(document.querySelector('.tv-tela')).toBeTruthy();
    // Pausar evita o avanço automático durante o resto do teste.
    await act(async () => { (screen.getByRole('button', { name: /Pausar reprodução/i }) as HTMLElement).click(); });
  });

  it('mostra ambiente, desafios e coleção', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await gotoExplorar();

    await abrirAba(/Ambiente/i);
    expect(document.querySelectorAll('.ambiente-lista li').length).toBe(5);

    await abrirAba(/Desafios/i);
    expect(document.querySelectorAll('.desafio-card').length).toBeGreaterThan(0);

    await abrirAba(/Coleção/i);
    expect(document.querySelectorAll('.colecao-lista li').length).toBeGreaterThan(5);
    expect(screen.getByText(/Easter eggs/i)).toBeInTheDocument();
  });

  it('a ficha tem aba de momentos em vídeo', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const aside = document.querySelector('.sidebar') as HTMLElement;
    await act(async () => { (within(aside).getByRole('button', { name: /Catálogo/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelectorAll('.person-card').length).toBeGreaterThan(0), { timeout: 20000 });
    await act(async () => { (document.querySelector('.person-card button') as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector('.person-drawer')).toBeTruthy(), { timeout: 20000 });
    const aba = [...document.querySelectorAll<HTMLElement>('.editor-tabs > button')].find(b => /Momentos/i.test(b.textContent || ''));
    expect(aba, 'aba Momentos precisa existir na ficha').toBeTruthy();
    await act(async () => { aba!.click(); });
    expect(document.querySelector('.momentos-perfil')).toBeTruthy();
  });
});
