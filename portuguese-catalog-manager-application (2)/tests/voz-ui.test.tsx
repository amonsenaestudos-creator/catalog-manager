import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { bootApp, openCatalog, seedIdb, seededData } from './catalog.test';

const raiz = resolve(__dirname, '..');
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8');

/** Abre a ficha da primeira pessoa do catálogo. */
async function abrirPrimeiraFicha(user: ReturnType<typeof userEvent.setup>) {
  await openCatalog();
  const cartao = document.querySelector('.person-card') as HTMLElement;
  expect(cartao).toBeTruthy();
  await act(async () => { (cartao.querySelector('button, .person-card-content') as HTMLElement).click(); });
  await waitFor(() => expect(document.querySelector('.person-drawer')).toBeTruthy(), { timeout: 20000 });
  return user;
}

describe('voz da pessoa: tela', () => {
  beforeEach(async () => { await seedIdb(seededData(6, 1)); });

  it('a ficha ganha um bloco de voz e o botão abre a tela de gravar', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirPrimeiraFicha(user);

    const bloco = document.querySelector('.voz-bloco') as HTMLElement;
    expect(bloco).toBeTruthy();
    expect(bloco.textContent).toMatch(/A voz de/i);
    const botao = bloco.querySelector('button') as HTMLButtonElement;
    await act(async () => { botao.click(); });

    await waitFor(() => expect(document.querySelector('.voz-modal')).toBeTruthy(), { timeout: 20000 });
    expect(screen.getByRole('tab', { name: /Gravar/i })).toBeTruthy();
    // Sem microfone no jsdom, a tela explica em vez de quebrar.
    await act(async () => { (document.querySelector('.voz-micro-botao') as HTMLButtonElement).click(); });
    await waitFor(() => expect(document.querySelector('.voz-erro')?.textContent || '').toMatch(/microfone|navegador/i), { timeout: 20000 });
  });

  it('a tela da voz tem só áudios e gravação — nada de voz sintetizada', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirPrimeiraFicha(user);
    await act(async () => { (document.querySelector('.voz-bloco button') as HTMLButtonElement).click(); });
    await waitFor(() => expect(document.querySelector('.voz-modal')).toBeTruthy(), { timeout: 20000 });

    const abas = [...document.querySelectorAll('.voz-modal [role="tab"]')].map(aba => (aba.textContent || '').toLowerCase());
    expect(abas.some(rotulo => rotulo.includes('áudios'))).toBe(true);
    expect(abas.some(rotulo => rotulo.includes('gravar'))).toBe(true);
    expect(abas.some(rotulo => rotulo.includes('sintetizada'))).toBe(false);
    // E o aplicativo não fala por ninguém: nada de speechSynthesis na tela.
    expect(document.querySelector('.voz-modal')?.textContent || '').not.toMatch(/voz sintetizada|falar por ela/i);
  });
});

describe('o pacote ficou mais leve', () => {
  it('a fonte traz só os recortes que o português usa', () => {
    const base = ler('src/base.css');
    expect(base).not.toMatch(/@import "@fontsource-variable\/inter";/);
    expect(base).toMatch(/inter-latin-wght-normal\.woff2/);
    expect(base).toMatch(/unicode-range:/);
    // Cirílico, grego e vietnamita não entram no bundle.
    expect(base).not.toMatch(/inter-cyrillic/);
    expect(base).not.toMatch(/inter-greek/);
    expect(base).not.toMatch(/inter-vietnamese/);
  });

  it('as imagens de demonstração ficaram leves para o build de arquivo único', () => {
    const imagens = ['archive-scene.jpg', 'bianca.jpg', 'clara.jpg', 'marina.jpg', 'rafael.jpg'];
    const pesos = imagens.map(nome => readFileSync(resolve(raiz, 'public/images', nome)).length);
    for (const peso of pesos) expect(peso).toBeLessThan(110 * 1024);
    expect(pesos.reduce((total, peso) => total + peso, 0)).toBeLessThan(400 * 1024);
  });
});
