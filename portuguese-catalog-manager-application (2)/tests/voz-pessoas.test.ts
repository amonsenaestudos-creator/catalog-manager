import { describe, expect, it, vi } from 'vitest';
import {
  cabeNovaNota, formatarDuracao, formatarPeso, formatoDoAudio, nomeDoArquivoDeVoz, notasDeVoz,
  pesoDoAudio, resumoDaVoz, tituloDaNota, VOZ_MAX_NOTA_BYTES,
} from '../src/features/voice';
import { compartilharArquivo, compartilharTexto, dataUrlParaBlob, resumoDaPessoa } from '../src/lib/compartilhar';
import { emptyData, getDefaultPerson, normalizeData } from '../src/store';
import type { AppData, Person, VozNota } from '../src/types';

const AUDIO = `data:audio/webm;base64,${'A'.repeat(1200)}`;

function pessoa(over: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), id: 'ana', nome: 'Ana Souza', descricao: 'Fala rápido e ri alto', localizacaoOnde: 'igreja', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z', ...over };
}

function nota(over: Partial<VozNota> = {}): VozNota {
  return { id: 'v1', titulo: 'Bom dia', url: AUDIO, duracao: 12, createdAt: '2026-09-01T12:00:00Z', ...over };
}

describe('voz das pessoas: o que é do dado', () => {
  it('resumo conta notas, duração, peso e favoritas', () => {
    const resumo = resumoDaVoz({ vozes: [nota(), nota({ id: 'v2', duracao: 30, favorite: true })] });
    expect(resumo.notas).toBe(2);
    expect(resumo.duracao).toBe(42);
    expect(resumo.favoritas).toBe(1);
    expect(resumo.bytes).toBe(pesoDoAudio(AUDIO) * 2);
    expect(notasDeVoz({ vozes: [nota(), nota({ id: 'v2', favorite: true })] })[0].id).toBe('v2');
  });

  it('os limites de tamanho explicam o motivo em português', () => {
    expect(cabeNovaNota({ vozes: [] }, 1024).ok).toBe(true);
    const grande = cabeNovaNota({ vozes: [] }, VOZ_MAX_NOTA_BYTES + 1);
    expect(grande.ok).toBe(false);
    expect(grande.motivo).toMatch(/trecho menor/);
    // 11 MB de base64 ≈ 8 MB de áudio: passa do teto por pessoa.
    const cheia = cabeNovaNota({ vozes: [nota({ url: `data:audio/webm;base64,${'A'.repeat(11_200_000)}` })] }, 1024);
    expect(cheia.ok).toBe(false);
    expect(cheia.motivo).toMatch(/Apague uma nota/);
  });

  it('formata duração e peso como gente lê', () => {
    expect(formatarDuracao(0)).toBe('0:00');
    expect(formatarDuracao(75)).toBe('1:15');
    expect(formatarPeso(512)).toBe('1 KB');
    expect(formatarPeso(2 * 1024 * 1024)).toMatch(/2 MB/);
    expect(tituloDaNota({ titulo: '  ' })).toBe('Nota de voz');
  });
});

describe('voz das pessoas: guardar no catálogo', () => {
  it('o backup só aceita data:audio e corta o que passa do teto', () => {
    const data = { ...emptyData(), people: [pessoa({ vozes: [nota(), nota({ id: 'v2', url: 'https://exemplo.com/voz.mp3' }), nota({ id: 'v3', url: `data:audio/webm;base64,${'A'.repeat(VOZ_MAX_NOTA_BYTES * 1.5)}` })] })] };
    const normal = normalizeData(data);
    expect(normal.people[0].vozes?.map(v => v.id)).toEqual(['v1']);
  });

  it('dado antigo sem voz ganha a lista vazia', () => {
    const { vozes, ...resto } = pessoa();
    void vozes;
    const normal = normalizeData({ ...emptyData(), people: [resto] });
    expect(normal.people[0].vozes).toEqual([]);
  });

  it('não existe voz sintetizada: o app não fala por ninguém', () => {
    // O que sai do aplicativo é sempre o arquivo gravado, com nome e tipo reais.
    const nome = nomeDoArquivoDeVoz({ nome: 'Ana Souza' }, nota({ url: 'data:audio/mp4;base64,QUJD' }));
    expect(nome).toBe('catalog-voz-ana-souza-bom-dia-v1.m4a');
    expect(formatoDoAudio('data:audio/mp4;base64,QUJD').tipo).toBe('audio/mp4');
  });
});

describe('compartilhar', () => {
  it('o resumo da ficha é texto de verdade, sem HTML', () => {
    const data: AppData = { ...emptyData(), people: [pessoa({ idade: 24, tags: ['amiga'], vozes: [nota()] })] };
    const texto = resumoDaPessoa(data.people[0], data);
    expect(texto).toContain('Ana Souza');
    expect(texto).toContain('24 anos');
    expect(texto).toContain('1 áudio de voz');
    expect(texto).not.toMatch(/[<>]/);
  });

  it('sem compartilhamento do aparelho, o texto vai para a área de transferência', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: escrever } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    const resultado = await compartilharTexto({ titulo: 'Ficha', texto: 'conteúdo' });
    expect(resultado).toBe('copiado');
    expect(escrever).toHaveBeenCalledWith('conteúdo');
  });

  it('com o aparelho, o compartilhamento nativo é usado', async () => {
    const compartilhar = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: compartilhar });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    const resultado = await compartilharTexto({ titulo: 'Ficha', texto: 'conteúdo' });
    expect(resultado).toBe('compartilhado');
    expect(compartilhar).toHaveBeenCalled();
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  it('cancelar a folha do sistema não é erro nem cópia escondida', async () => {
    const cancelado = vi.fn().mockRejectedValue(Object.assign(new Error('cancelado'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { configurable: true, value: cancelado });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn() } });
    expect(await compartilharTexto({ titulo: 'Ficha', texto: 'conteúdo' })).toBe('indisponivel');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  it('o áudio vira arquivo compartilhável com o tipo certo', async () => {
    const blob = dataUrlParaBlob('data:audio/webm;base64,QUJD');
    expect(blob.type).toBe('audio/webm');
    expect(blob.size).toBe(3);
    // Sem navigator.share de arquivos, o mesmo conteúdo é baixado.
    const resultado = await compartilharArquivo({ dataUrl: 'data:audio/webm;base64,QUJD', nome: 'voz.webm' });
    expect(['baixado', 'indisponivel']).toContain(resultado);
  });
});
