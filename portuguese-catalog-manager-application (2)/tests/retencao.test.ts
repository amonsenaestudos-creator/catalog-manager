import { describe, expect, it } from 'vitest';
import type { Person } from '../src/types';
import { emptyData, getDefaultPerson } from '../src/store';
import {
  anosDoCatalogo, aposDescoberta, conteudoDoAno, desafiosDoDia, desbloqueaveis, embaralhar,
  estatisticasRapidas, haQuantoTempo, hashTexto, mapaConexoes, mesesDesde, momentosDoDia,
  mulberry32, presenteDoDia, slidesApresentacao, tipoMidia, trilhaExploracao,
} from '../src/lib/retencao';

function pessoa(nome: string, createdAt: string, extra: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), id: `p-${nome}`, nome, descricao: `Ficha de ${nome}`, createdAt, updatedAt: createdAt, ...extra };
}

function catalogoCheio() {
  const data = emptyData();
  const ana = pessoa('Ana', '2024-03-10T10:00:00.000Z', {
    fotos: [{ id: 'f1', url: '/images/bianca.jpg', type: 'normal', personId: 'p-Ana', isMain: true, createdAt: '2024-03-11T10:00:00.000Z' }],
    vinculos: [{ id: 'v1', personId: 'p-Bia', papel: 'irma' }],
    rating: { ...getDefaultPerson().rating, mode: 'manual', overall: 5 },
    aniversario: '1999-05-20',
  });
  const bia = pessoa('Bia', '2025-01-05T10:00:00.000Z', {
    fotos: [{ id: 'f2', url: '/images/clara.jpg', type: 'normal', personId: 'p-Bia', isMain: true, createdAt: '2025-06-01T10:00:00.000Z' }],
    vinculos: [{ id: 'v2', personId: 'p-Ana', papel: 'irma' }],
  });
  const leo = pessoa('Leo', new Date().toISOString(), {});
  data.people = [ana, bia, leo];
  data.folders = [{ id: 'fold1', name: 'Família', color: '#c786ec', icon: 'casa', description: '', personIds: ['p-Ana', 'p-Bia'], photoIds: [], noteIds: [], storyIds: [], createdAt: '2025-02-01T10:00:00.000Z', updatedAt: '2025-02-01T10:00:00.000Z' }];
  data.albums = [{ id: 'alb1', name: 'Viagem', description: '', color: '#7fbd9b', photoIds: ['f1'], createdAt: '2025-03-01T10:00:00.000Z', updatedAt: '2025-03-01T10:00:00.000Z' }];
  data.memories = [{ id: 'm1', personId: 'p-Ana', title: 'Piquenique', content: 'Um dia lindo no parque com a Ana.', date: '2025-04-02', createdAt: '2025-04-02T10:00:00.000Z' }];
  data.journal = [{ id: 'j1', date: '2025-04-03', mood: 5, title: 'Dia bom', content: 'Tudo certo hoje.', tags: [], createdAt: '2025-04-03T10:00:00.000Z', updatedAt: '2025-04-03T10:00:00.000Z' }];
  return data;
}

describe('sorteio com semente', () => {
  it('gera a mesma sequência para a mesma semente', () => {
    const a = mulberry32(hashTexto('2026-01-01'));
    const b = mulberry32(hashTexto('2026-01-01'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('embaralha sem perder nem duplicar itens', () => {
    const lista = [1, 2, 3, 4, 5, 6, 7, 8];
    const resultado = embaralhar(lista, mulberry32(42));
    expect([...resultado].sort()).toEqual(lista);
    expect(resultado).not.toEqual(lista);
  });
});

describe('tempo em palavras', () => {
  it('descreve dias, meses e anos', () => {
    const hoje = new Date().toISOString();
    expect(haQuantoTempo(hoje)).toBe('hoje');
    const quarentaDias = new Date(Date.now() - 40 * 86400000).toISOString();
    expect(haQuantoTempo(quarentaDias)).toMatch(/mês|meses/);
    expect(mesesDesde('2020-01-01T00:00:00.000Z')).toBeGreaterThan(12);
    expect(haQuantoTempo('2020-01-01T00:00:00.000Z')).toMatch(/ano/);
  });
});

describe('presente diário', () => {
  it('não existe sem fichas', () => {
    expect(presenteDoDia(emptyData(), '2026-05-01')).toBeNull();
  });

  it('é determinístico no mesmo dia e aponta para um destino válido', () => {
    const data = catalogoCheio();
    const a = presenteDoDia(data, '2026-05-01');
    const b = presenteDoDia(data, '2026-05-01');
    expect(a).toEqual(b);
    expect(a!.id.startsWith('2026-05-01:')).toBe(true);
    expect(a!.titulo.length).toBeGreaterThan(0);
    if (a!.personId) expect(data.people.some(p => p.id === a!.personId)).toBe(true);
  });

  it('varia entre tipos ao longo dos dias', () => {
    const data = catalogoCheio();
    const tipos = new Set(Array.from({ length: 12 }, (_, i) => presenteDoDia(data, `2026-05-${String(i + 1).padStart(2, '0')}`)!.tipo));
    expect(tipos.size).toBeGreaterThan(1);
  });
});

describe('momentos do dia', () => {
  it('agrupa o que foi registrado na data', () => {
    const data = catalogoCheio();
    const hoje = new Date().toISOString().slice(0, 10);
    const momentos = momentosDoDia(data, hoje);
    expect(momentos.pessoas.map(p => p.nome)).toContain('Leo');
    expect(momentos.total).toBeGreaterThan(0);
    expect(momentos.vazio).toBe(false);
  });

  it('fica vazio num dia sem registros', () => {
    const momentos = momentosDoDia(catalogoCheio(), '2030-01-01');
    expect(momentos.vazio).toBe(true);
    expect(momentos.total).toBe(0);
  });
});

describe('trilha aleatória', () => {
  it('não existe sem fichas', () => {
    expect(trilhaExploracao(emptyData(), 1)).toEqual([]);
  });

  it('começa e termina em pessoa, com passos acionáveis', () => {
    const passos = trilhaExploracao(catalogoCheio(), 123);
    expect(passos.length).toBeGreaterThanOrEqual(3);
    expect(passos[0].tipo).toBe('pessoa');
    expect(passos[passos.length - 1].tipo).toBe('pessoa');
    for (const passo of passos) {
      expect(passo.titulo.length).toBeGreaterThan(0);
      expect(passo.acao.length).toBeGreaterThan(0);
      expect(passo.pagina.length).toBeGreaterThan(0);
    }
  });

  it('muda com a semente', () => {
    const data = catalogoCheio();
    const a = trilhaExploracao(data, 1).map(p => p.titulo).join('|');
    const b = trilhaExploracao(data, 999).map(p => p.titulo).join('|');
    expect(a).not.toBe(b);
  });
});

describe('mapa de conexões', () => {
  it('não existe sem fichas', () => {
    expect(mapaConexoes(emptyData(), 'x')).toEqual({ nos: [], arestas: [] });
  });

  it('liga o centro aos vizinhos com arestas consistentes', () => {
    const data = catalogoCheio();
    const { nos, arestas } = mapaConexoes(data, 'p-Ana');
    const ids = new Set(nos.map(n => n.id));
    expect(ids.has('p-Ana')).toBe(true);
    expect(nos.some(n => n.id === 'p-Bia')).toBe(true);
    expect(nos.some(n => n.id === 'pasta:fold1')).toBe(true);
    for (const aresta of arestas) {
      expect(ids.has(aresta.de)).toBe(true);
      expect(ids.has(aresta.para)).toBe(true);
    }
  });

  it('expande o segundo anel de um vizinho', () => {
    const data = catalogoCheio();
    const fechado = mapaConexoes(data, 'p-Ana');
    const aberto = mapaConexoes(data, 'p-Ana', 'p-Bia');
    expect(aberto.nos.length).toBeGreaterThanOrEqual(fechado.nos.length);
  });
});

describe('máquina do tempo', () => {
  it('lista os anos com conteúdo, do mais novo ao mais antigo', () => {
    const anos = anosDoCatalogo(catalogoCheio());
    expect(anos).toContain(2024);
    expect(anos).toContain(2025);
    expect([...anos].sort((a, b) => b - a)).toEqual(anos);
  });

  it('filtra o conteúdo por ano e mês', () => {
    const data = catalogoCheio();
    const ano = conteudoDoAno(data, 2024);
    expect(ano.pessoas.map(p => p.nome)).toContain('Ana');
    expect(ano.meses).toContain(3);
    const mes = conteudoDoAno(data, 2024, 3);
    expect(mes.pessoas.map(p => p.nome)).toContain('Ana');
    const vazio = conteudoDoAno(data, 2024, 11);
    expect(vazio.pessoas).toEqual([]);
  });
});

describe('sequência de descobertas', () => {
  it('começa em 1, continua no dia seguinte e zera após falha', () => {
    const primeiro = aposDescoberta(undefined, '2026-05-01');
    expect(primeiro).toMatchObject({ sequencia: 1, total: 1, ultimoDia: '2026-05-01' });
    const mesmoDia = aposDescoberta(primeiro, '2026-05-01');
    expect(mesmoDia).toMatchObject({ sequencia: 1, total: 2 });
    const seguinte = aposDescoberta(mesmoDia, '2026-05-02');
    expect(seguinte.sequencia).toBe(2);
    const falhou = aposDescoberta(seguinte, '2026-05-10');
    expect(falhou.sequencia).toBe(1);
  });
});

describe('mini-desafios', () => {
  it('sorteia três por dia, sempre os mesmos no mesmo dia', () => {
    const data = catalogoCheio();
    const a = desafiosDoDia(data, '2026-05-01', []).map(d => d.id);
    const b = desafiosDoDia(data, '2026-05-01', []).map(d => d.id);
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
  });

  it('mede o progresso pelas fichas visitadas no dia', () => {
    const data = catalogoCheio();
    data.progress.exploracao = { ultimoDia: '', sequencia: 0, total: 0, visitadasDia: ['p-Ana', 'p-Bia', 'p-Leo'], diaVisitas: '2026-05-01', trilhas: 0, festas: {} };
    const lista = desafiosDoDia(data, '2026-05-01', []);
    const tres = lista.find(d => d.id === 'tres-fichas');
    if (tres) expect(tres.progresso).toBe(3);
    const antiga = lista.find(d => d.id === 'rever-antiga');
    if (antiga) expect(antiga.progresso).toBe(1);
  });

  it('ignora visitas de outro dia', () => {
    const data = catalogoCheio();
    data.progress.exploracao = { ultimoDia: '', sequencia: 0, total: 0, visitadasDia: ['p-Ana'], diaVisitas: '2026-04-30', trilhas: 0, festas: {} };
    const lista = desafiosDoDia(data, '2026-05-01', []);
    expect(lista.every(d => d.progresso === 0 || d.id === 'completa')).toBe(true);
  });
});

describe('desbloqueáveis visuais', () => {
  it('libera conforme o catálogo cresce', () => {
    const pequeno = catalogoCheio();
    const auroraPequena = desbloqueaveis(pequeno).find(d => d.id === 'fundo-aurora')!;
    expect(auroraPequena.liberado).toBe(false);
    expect(auroraPequena.dica.length).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) pequeno.people.push(pessoa(`Extra${i}`, '2025-01-01T10:00:00.000Z'));
    expect(desbloqueaveis(pequeno).find(d => d.id === 'fundo-aurora')!.liberado).toBe(true);
  });

  it('toda condição é verificável sem quebrar com catálogo vazio', () => {
    const data = emptyData();
    const lista = desbloqueaveis(data);
    expect(lista.length).toBeGreaterThan(5);
    expect(lista.every(d => d.nome && d.dica && d.valor)).toBe(true);
  });
});

describe('tipos de vídeo', () => {
  it('reconhece arquivo, YouTube, Vimeo e rejeita o resto', () => {
    expect(tipoMidia('https://www.youtube.com/watch?v=abc123XYZ').tipo).toBe('youtube');
    expect(tipoMidia('https://youtu.be/abc123XYZ').tipo).toBe('youtube');
    expect(tipoMidia('https://vimeo.com/123456').tipo).toBe('vimeo');
    expect(tipoMidia('https://exemplo.com/video.mp4').tipo).toBe('video');
    expect(tipoMidia('data:video/mp4;base64,AAAA').tipo).toBe('video');
    expect(tipoMidia('nota fiscal').tipo).toBe('invalido');
    expect(tipoMidia('').tipo).toBe('invalido');
  });

  it('gera embed do YouTube', () => {
    expect(tipoMidia('https://www.youtube.com/watch?v=abc123XYZ').embed).toBe('https://www.youtube.com/embed/abc123XYZ');
  });
});

describe('slides e estatísticas', () => {
  it('conta o essencial do catálogo', () => {
    const stats = estatisticasRapidas(catalogoCheio());
    expect(stats.fichas).toBe(3);
    expect(stats.fotos).toBe(2);
    expect(stats.pastas).toBe(1);
    expect(stats.notaMedia).toBeGreaterThan(0);
  });

  it('monta slides com ids únicos', () => {
    const slides = slidesApresentacao(catalogoCheio());
    expect(slides.length).toBeGreaterThan(3);
    const ids = slides.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(slides.every(s => s.titulo && s.subtitulo)).toBe(true);
  });
});

describe('demonstração como vitrine do Explorar', () => {
  it('tem passado, relações, coleções, memória e vídeo', async () => {
    const { demoData } = await import('../src/store');
    const data = demoData();
    expect(anosDoCatalogo(data).length).toBeGreaterThan(1);
    expect(data.folders.length).toBeGreaterThan(0);
    expect(data.albums.length).toBeGreaterThan(0);
    expect(data.memories.length).toBeGreaterThan(0);
    expect(data.people.some(p => (p.momentos || []).length > 0)).toBe(true);
    expect(data.people.some(p => (p.vinculos || []).length > 0)).toBe(true);
    expect(trilhaExploracao(data, 7).length).toBeGreaterThanOrEqual(5);
  });
});
