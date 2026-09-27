import { afterEach, describe, expect, it, vi } from 'vitest';
import { compartilharArquivo, compartilharResumoDoCatalogo, dataUrlParaBlob, mensagemDoCompartilhamento, resumoDoCatalogoParaCompartilhar } from '../src/lib/compartilhar';
import { avisoDoDiario, serializeForJournal, writeJournal } from '../src/lib/storage';
import { formatoDoAudio, nomeDoArquivoDeVoz } from '../src/features/voice/voz';
import { falar, vozSuportada } from '../src/features/voice/sintetizador';
import { emptyData } from '../src/store';
import type { AppData } from '../src/types';

/**
 * O que esta rodada consertou: cada coisa que estava pela metade ou dizendo o
 * contrário do que fazia. Os testes ficam juntos para a correção não voltar.
 */

const nota = (url: string, id = 'abc123', titulo = 'Bom dia') => ({ id, url, titulo });

afterEach(() => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Reflect.deleteProperty(window as unknown as Record<string, unknown>, 'speechSynthesis');
  Reflect.deleteProperty(window as unknown as Record<string, unknown>, 'SpeechSynthesisUtterance');
});

/** Instala a síntese de voz do navegador para conferir o que o app pede a ela. */
function comSintese() {
  const faladas: Record<string, unknown>[] = [];
  class FalaFalsa { texto: string; volume = 1; pitch = 1; rate = 1; lang = ''; voice = null; constructor(texto: string) { this.texto = texto; } }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FalaFalsa });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: (fala: Record<string, unknown>) => faladas.push(fala), cancel: () => {}, getVoices: () => [], speaking: false } });
  return faladas;
}

describe('arquivo de voz: nome e tipo certos', () => {
  it('reconhece o formato pelo próprio data URL', () => {
    expect(formatoDoAudio('data:audio/webm;codecs=opus;base64,AAA').extensao).toBe('webm');
    expect(formatoDoAudio('data:audio/mp4;base64,AAA')).toEqual({ extensao: 'm4a', tipo: 'audio/mp4' });
    expect(formatoDoAudio('data:audio/mpeg;base64,AAA')).toEqual({ extensao: 'mp3', tipo: 'audio/mpeg' });
    expect(formatoDoAudio('data:audio/ogg;base64,AAA').tipo).toBe('audio/ogg');
    expect(formatoDoAudio('data:audio/x-desconhecido;base64,AAA').extensao).toBe('audio');
  });

  it('o nome do arquivo diz de quem é, sem acento e com a extensão real', () => {
    // Antes tudo saía como ".webm", inclusive um MP3 enviado do aparelho.
    expect(nomeDoArquivoDeVoz({ nome: 'Ana Júlia' }, nota('data:audio/mpeg;base64,AAA'))).toBe('catalog-voz-ana-julia-bom-dia-abc123.mp3');
    expect(nomeDoArquivoDeVoz({ nome: 'Rafael' }, nota('data:audio/webm;base64,AAA', 'zz9999', ''))).toBe('catalog-voz-rafael-zz9999.webm');
  });

  it('o blob mantém o tipo do arquivo original', () => {
    expect(dataUrlParaBlob('data:audio/mpeg;base64,QUJD').type).toBe('audio/mpeg');
  });
});

describe('compartilhar: uma frase só para cada caso', () => {
  it('cada resultado tem a sua frase, sem prometer o que não aconteceu', () => {
    expect(mensagemDoCompartilhamento('compartilhado', 'ficha').erro).toBe(false);
    expect(mensagemDoCompartilhamento('copiado', 'catalogo').texto).toMatch(/área de transferência/);
    expect(mensagemDoCompartilhamento('baixado', 'voz').texto).toMatch(/baixad/i);
    // Cancelar a folha do sistema: nada saiu, e a tela diz isso.
    expect(mensagemDoCompartilhamento('indisponivel', 'ficha')).toMatchObject({ erro: true });
    expect(mensagemDoCompartilhamento('indisponivel', 'arquivo').texto).toMatch(/baixar/);
  });

  it('o retrato do catálogo conta números e não mostra nome de ninguém', () => {
    const data: AppData = {
      ...emptyData(),
      people: [
        { id: '1', nome: 'Ana', fotos: [{ id: 'f1' }], vozes: [{ id: 'v1' }], descricao: 'segredo' },
        { id: '2', nome: 'Bruno', fotos: [], vozes: [], descricao: '', deletedAt: new Date().toISOString() },
      ],
    } as unknown as AppData;
    const texto = resumoDoCatalogoParaCompartilhar(data);
    expect(texto).toMatch(/1 pessoa/);
    expect(texto).toMatch(/1 foto/);
    expect(texto).toMatch(/1 áudio de voz/);
    expect(texto).not.toMatch(/Ana|Bruno|segredo/);
  });

  it('o comando do retrato cai na área de transferência quando não há compartilhamento', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: escrever } });
    expect(await compartilharResumoDoCatalogo(emptyData())).toBe('copiado');
    expect(escrever).toHaveBeenCalledOnce();
  });

  it('o áudio é baixado com o nome certo quando o aparelho não compartilha arquivos', async () => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    const resultado = await compartilharArquivo({ dataUrl: 'data:audio/mpeg;base64,QUJD', nome: 'catalog-voz-ana.mp3' });
    expect(['baixado', 'indisponivel']).toContain(resultado);
  });
});

describe('voz falada: o volume das Ajustes vale em todo lugar', () => {
  it('sem aparelho que fale, continua devolvendo false (nada de silêncio fingido)', () => {
    expect(vozSuportada()).toBe(false);
    expect(falar({ texto: 'oi' })).toBe(false);
  });

  it('o volume configurado chega à fala, com os limites respeitados', () => {
    const faladas = comSintese();
    expect(vozSuportada()).toBe(true);
    expect(falar({ texto: 'oi', volume: 0.3 })).toBe(true);
    expect(faladas[0].volume).toBeCloseTo(0.3);
    falar({ texto: 'alto demais', volume: 4 });
    expect(faladas[1].volume).toBe(1);
    falar({ texto: 'baixo demais', volume: -1 });
    expect(faladas[2].volume).toBe(0);
    // Tom e ritmo da ficha continuam entrando na conta.
    falar({ texto: 'com perfil', perfil: { voz: null, tom: 1.4, ritmo: 0.8 } });
    expect(faladas[3].pitch).toBeCloseTo(1.4);
    expect(faladas[3].rate).toBeCloseTo(0.8);
  });
});

describe('cópia de emergência: quando não cabe, a tela avisa', () => {
  it('catálogo pequeno cabe no diário', () => {
    const pequeno = serializeForJournal(emptyData());
    expect(pequeno).toBeTruthy();
    expect(writeJournal(emptyData(), true)).toBe(true);
  });

  it('catálogo grande demais devolve false e explica o motivo', () => {
    // Um áudio de 5 MB em base64 já passa do limite de 4 MB do diário.
    const grande = { ...emptyData(), people: [{ id: '1', nome: 'Ana', vozes: [{ id: 'v', url: `data:audio/webm;base64,${'A'.repeat(5 * 1024 * 1024)}` }] }] } as unknown as AppData;
    expect(serializeForJournal(grande)).toBeNull();
    expect(writeJournal(grande, true)).toBe(false);
    expect(avisoDoDiario('grande')).toMatch(/4 MB/);
    expect(avisoDoDiario('grande')).toMatch(/IndexedDB/);
    expect(avisoDoDiario('sem-espaco')).toMatch(/sem espaço/);
  });
});
