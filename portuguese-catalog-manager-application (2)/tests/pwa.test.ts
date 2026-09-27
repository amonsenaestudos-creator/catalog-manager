import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PREFERENCIA_INSTALAR, dispensarInstalacao, instalacaoDispensada, registrarServiceWorker } from '../src/lib/pwa';

const raiz = resolve(__dirname, '..');
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8');

describe('aplicativo instalável e offline', () => {
  const manifest = JSON.parse(ler('public/manifest.webmanifest')) as Record<string, unknown>;
  const sw = ler('public/sw.js');

  it('o manifest traz o que um aplicativo instalado precisa', () => {
    expect(manifest.name).toMatch(/Catalog/);
    expect(manifest.lang).toBe('pt-BR');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(String(manifest.background_color)).toMatch(/^#[0-9a-f]{6}$/i);
    const icones = manifest.icons as { src: string; sizes: string; purpose?: string }[];
    expect(icones.some(icone => icone.sizes === '192x192')).toBe(true);
    expect(icones.some(icone => icone.sizes === '512x512')).toBe(true);
    expect(icones.some(icone => icone.purpose === 'maskable')).toBe(true);
  });

  it('todo ícone do manifest existe no disco', () => {
    for (const icone of manifest.icons as { src: string }[]) {
      expect(() => readFileSync(resolve(raiz, 'public', icone.src.replace(/^\//, '')))).not.toThrow();
    }
  });

  it('a página aponta para o manifest e para o ícone do iOS', () => {
    const html = ler('index.html');
    expect(html).toMatch(/rel="manifest" href="\/manifest\.webmanifest"/);
    expect(html).toMatch(/rel="apple-touch-icon"[^>]*apple-touch-icon\.png/);
    expect(html).toMatch(/name="theme-color"/);
  });

  it('o service worker guarda a casca e trata navegação sem rede', () => {
    expect(sw).toMatch(/const CACHE = 'catalog-v1'/);
    expect(sw).toMatch(/skipWaiting\(\)/);
    expect(sw).toMatch(/clients\.claim\(\)/);
    expect(sw).toMatch(/caches\.delete\(chave\)/);
    // A casca precisa incluir a página e o manifest; o app é um arquivo só.
    expect(sw).toMatch(/'\/index\.html'/);
    expect(sw).toMatch(/'\/manifest\.webmanifest'/);
    expect(sw).toMatch(/pedido\.mode === 'navigate'/);
    // Só o que é do próprio domínio e GET passa pelo cache.
    expect(sw).toMatch(/pedido\.method !== 'GET'/);
    expect(sw).toMatch(/url\.origin !== self\.location\.origin/);
  });

  it('o registro fica fora do desenvolvimento e aguenta navegador sem suporte', () => {
    const fonte = ler('src/lib/pwa.ts');
    expect(fonte).toMatch(/import\.meta\.env\.DEV/);
    expect(fonte).toMatch(/'serviceWorker' in navigator/);
    expect(fonte).toMatch(/register\('\/sw\.js'\)/);
    // Chamar sem suporte não pode explodir.
    expect(() => registrarServiceWorker()).not.toThrow();
  });

  it('o convite para instalar é dispensado só na sessão', () => {
    sessionStorage.clear();
    expect(instalacaoDispensada()).toBe(false);
    dispensarInstalacao();
    expect(instalacaoDispensada()).toBe(true);
    expect(sessionStorage.getItem(PREFERENCIA_INSTALAR)).toBe('1');
    expect(localStorage.getItem(PREFERENCIA_INSTALAR)).toBeNull();
    sessionStorage.clear();
  });
});
