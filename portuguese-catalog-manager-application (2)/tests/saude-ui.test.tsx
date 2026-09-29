import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { bootApp, seedIdb, seededData } from './catalog.test';
import { normalizeData } from '../src/store';

/** A tela fica no “Mais” da Biblioteca, como as outras telas de apoio. */
async function abrirSaude() {
  const aside = document.querySelector('.sidebar') as HTMLElement;
  const expandir = aside.querySelector<HTMLButtonElement>('.world-library .nav-expand');
  if (expandir) await act(async () => { expandir.click(); });
  const item = [...aside.querySelectorAll<HTMLButtonElement>('button.nav-item')].find(botao => /Saúde do catálogo/i.test(botao.textContent || ''));
  expect(item, 'item Saúde do catálogo precisa estar no menu').toBeTruthy();
  await act(async () => { item!.click(); });
  await waitFor(() => expect(document.querySelector('.saude-page')).toBeTruthy(), { timeout: 20000 });
}

describe('saúde do catálogo: tela', () => {
  beforeEach(async () => { await seedIdb(seededData(24, 1)); });

  it('mostra a nota, os cartões do resumo e os achados com gravidade', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirSaude();

    const nota = document.querySelector('.saude-nota') as HTMLElement;
    expect(nota.textContent).toMatch(/de 100/);
    expect(document.querySelectorAll('.saude-cartoes article').length).toBeGreaterThanOrEqual(4);
    // O catálogo do teste tem fichas arquivadas, na lixeira e com backup vencido.
    expect(document.querySelectorAll('.saude-achado').length).toBeGreaterThan(0);
    expect(document.querySelector('.saude-achado.critico, .saude-achado.atencao')).toBeTruthy();
  });

  it('filtra por gravidade sem perder os outros achados do cálculo', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirSaude();

    const filtros = document.querySelector('.saude-filtros') as HTMLElement;
    const antes = document.querySelectorAll('.saude-achado').length;
    const critico = within(filtros).getByRole('tab', { name: /Crítico/i });
    await act(async () => { critico.click(); });
    const depois = document.querySelectorAll('.saude-achado').length;
    expect(depois).toBeLessThanOrEqual(antes);
    await act(async () => { within(filtros).getByRole('tab', { name: /^Tudo/i }).click(); });
    expect(document.querySelectorAll('.saude-achado').length).toBe(antes);
  });

  it('a faxina limpa os ponteiros quebrados e conta o que fez', async () => {
    const quebrado = normalizeData(seededData(6, 1));
    quebrado.collections = [{ id: 'col-1', name: 'Time', color: '#c786ec', personIds: ['seed-0', 'fantasma'] }];
    await seedIdb(quebrado);
    const user = userEvent.setup();
    await bootApp(user);
    await abrirSaude();

    const cartao = [...document.querySelectorAll<HTMLElement>('.saude-achado')].find(item => /Referências sem dono/i.test(item.textContent || ''));
    expect(cartao, 'a referência quebrada precisa virar achado').toBeTruthy();
    const botao = within(cartao as HTMLElement).getByRole('button', { name: /Limpar agora/i });
    await act(async () => { botao.click(); });

    await waitFor(() => expect(document.querySelector('.saude-relatorio')).toBeTruthy(), { timeout: 20000 });
    expect(document.querySelector('.saude-relatorio')!.textContent).toMatch(/Faxina concluída/i);
    await waitFor(() => expect([...document.querySelectorAll<HTMLElement>('.saude-achado')].some(item => /Referências sem dono/i.test(item.textContent || ''))).toBe(false), { timeout: 20000 });
  });

  it('o achado de ficha sem foto leva ao catálogo já filtrado', async () => {
    // Sem nenhuma foto no catálogo: o achado existe e o filtro é o do catálogo.
    await seedIdb(seededData(4, 0));
    const user = userEvent.setup();
    await bootApp(user);
    await abrirSaude();

    const cartao = [...document.querySelectorAll<HTMLElement>('.saude-achado')].find(item => /ficha sem foto|fichas sem foto/i.test(item.textContent || ''));
    expect(cartao, 'ficha sem foto precisa virar achado').toBeTruthy();
    const acao = within(cartao as HTMLElement).getByRole('button', { name: /Ver no catálogo/i });
    await act(async () => { acao.click(); });

    await waitFor(() => expect(document.querySelector('.saude-page')).toBeNull(), { timeout: 20000 });
    await waitFor(() => expect(document.querySelector('.catalog-page')).toBeTruthy(), { timeout: 20000 });
    // O filtro chegou junto: a tela abre no catálogo, com as fichas listadas.
    await waitFor(() => expect(document.querySelectorAll('.person-card').length).toBeGreaterThan(0), { timeout: 20000 });
  });
});
