import { describe, expect, it } from 'vitest';
import { analisarSaude, repararCatalogo, resumoDoCatalogo } from '../src/features/health';
import { emptyData, generateId, getDefaultPerson } from '../src/store';
import type { AppData, Person } from '../src/types';

const AGORA = new Date('2026-09-27T12:00:00Z');

function pessoa(over: Partial<Person> = {}): Person {
  return {
    ...getDefaultPerson(),
    nome: 'Ana Souza',
    descricao: 'Uma história completa sobre ela',
    localizacaoOnde: 'igreja',
    redesSociais: '@ana',
    tags: ['amiga'],
    fotos: [{ id: generateId(), url: 'data:image/webp;base64,AAA', type: 'normal', personId: over.id || 'x', isMain: true }],
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z',
    ...over,
  };
}

/** Catálogo em ordem: uma ficha completa, com foto, atualizada e com backup recente. */
function catalogoEmOrdem(): AppData {
  const data = emptyData();
  const ana = pessoa({ id: 'ana' });
  data.people = [ana];
  data.orphanPhotos = [];
  return data;
}

const contexto = { agora: AGORA, ultimoBackup: '2026-09-26T12:00:00Z', usoBytes: 1024, cotaBytes: 1024 * 1024 };

describe('saúde do catálogo: a leitura', () => {
  it('catálogo em ordem tira nota alta e não inventa pendência', () => {
    const saude = analisarSaude(catalogoEmOrdem(), contexto);
    expect(saude.nota).toBeGreaterThanOrEqual(90);
    expect(saude.achados.map(a => a.id)).not.toContain('duplicatas');
    expect(saude.achados.map(a => a.id)).not.toContain('backup_vencido');
  });

  it('nunca depende do relógio real: a mesma data de referência dá a mesma nota', () => {
    const data = catalogoEmOrdem();
    data.people[0].aniversario = '2000-09-29';
    const primeira = analisarSaude(data, contexto);
    const segunda = analisarSaude(data, contexto);
    expect(primeira.nota).toBe(segunda.nota);
    expect(JSON.stringify(primeira)).toBe(JSON.stringify(segunda));
  });

  it('ficha sem foto vira achado com filtro pronto para o catálogo', () => {
    const data = catalogoEmOrdem();
    data.people[0].fotos = [];
    const achado = analisarSaude(data, contexto).achados.find(a => a.id === 'fichas_sem_foto');
    expect(achado?.quantidade).toBe(1);
    expect(achado?.filtro).toEqual({ photo: 'without' });
    expect(achado?.pessoaIds).toEqual(['ana']);
  });

  it('duplicata de nome é crítico e aponta as duas fichas', () => {
    const data = catalogoEmOrdem();
    data.people = [pessoa({ id: 'ana' }), pessoa({ id: 'ana2' })];
    const achado = analisarSaude(data, contexto).achados.find(a => a.id === 'duplicatas');
    expect(achado?.gravidade).toBe('critico');
    expect(achado?.pessoaIds?.sort()).toEqual(['ana', 'ana2']);
  });

  it('ponteiro quebrado é contado por origem e cabe numa faxina', () => {
    const data = catalogoEmOrdem();
    data.collections = [{ id: 'c1', name: 'Time', color: '#c786ec', personIds: ['ana', 'fantasma'] }];
    data.tierLists = [{ id: 't1', nome: 'Favoritas', tiers: ['S', 'A'], items: [{ personId: 'fantasma', tier: 'S' }], allowedCategories: ['todas'], allowedSubcategories: ['todas'] }];
    data.folders = [{ id: 'f1', name: 'Pasta', color: '#c786ec', icon: 'folder', description: '', personIds: ['fantasma'], photoIds: ['foto-que-nao-existe'], noteIds: [], storyIds: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }];
    data.ignoredDuplicates = ['ana::fantasma'];
    const achado = analisarSaude(data, contexto).achados.find(a => a.id === 'referencias_quebradas');
    expect(achado?.reparavel).toBe(true);
    expect(achado?.quantidade).toBeGreaterThanOrEqual(4);
  });

  it('lixeira antiga, lembrete atrasado e backup velho aparecem com a data de referência', () => {
    const data = catalogoEmOrdem();
    data.people.push(pessoa({ id: 'lixo', nome: 'Ficha antiga', deletedAt: '2026-07-01T12:00:00Z' }));
    data.reminders = [{ id: 'r1', personId: 'ana', titulo: 'Ligar', data: '2026-09-01', concluido: false, createdAt: '2026-08-01T12:00:00Z' }];
    const semBackup = analisarSaude(data, { agora: AGORA, ultimoBackup: null });
    const ids = semBackup.achados.map(a => a.id);
    expect(ids).toContain('lixeira_antiga');
    expect(ids).toContain('lembretes_atrasados');
    expect(ids).toContain('backup_vencido');
  });

  it('espaço apertado só aparece quando o navegador informa o uso', () => {
    const data = catalogoEmOrdem();
    expect(analisarSaude(data, contexto).achados.map(a => a.id)).not.toContain('espaco_apertado');
    const apertado = analisarSaude(data, { ...contexto, usoBytes: 95, cotaBytes: 100 }).achados.find(a => a.id === 'espaco_apertado');
    expect(apertado?.gravidade).toBe('critico');
  });

  it('resumo conta fichas, fotos e o peso aproximado', () => {
    const resumo = resumoDoCatalogo(catalogoEmOrdem());
    expect(resumo.ativas).toBe(1);
    expect(resumo.fotos).toBe(1);
    expect(resumo.tamanhoBytes).toBeGreaterThan(100);
  });
});

describe('saúde do catálogo: a faxina', () => {
  it('limpa só o ponteiro quebrado e preserva tudo o que existe', () => {
    const data = catalogoEmOrdem();
    const ana = data.people[0];
    ana.vinculos = [{ id: 'v1', personId: 'ana', papel: 'amiga' }, { id: 'v2', personId: 'fantasma', papel: 'irma' }];
    data.collections = [{ id: 'c1', name: 'Time', color: '#c786ec', personIds: ['ana', 'fantasma'] }];
    data.albums = [{ id: 'a1', name: 'Verão', description: '', color: '#c786ec', photoIds: [ana.fotos[0].id, 'sumiu'], createdAt: '', updatedAt: '' }];
    data.drafts = {
      orfao: { id: 'orfao', kind: 'edit', personId: 'fantasma', payload: pessoa(), updatedAt: '2026-09-20T12:00:00Z' },
      novo: { id: 'novo', kind: 'add', payload: pessoa(), updatedAt: '2026-09-26T12:00:00Z' },
    };
    data.chats = [
      { id: 'm1', personId: 'ana', role: 'them', text: 'oi', timestamp: '2026-09-20T12:00:00Z' },
      { id: 'm2', personId: 'fantasma', role: 'them', text: 'oi', timestamp: '2026-09-20T12:00:00Z' },
    ];

    const { data: limpo, reparos } = repararCatalogo(data, AGORA);
    expect(reparos.length).toBeGreaterThan(0);
    expect(limpo.people).toHaveLength(1);
    expect(limpo.people[0].fotos).toHaveLength(1);
    expect(limpo.people[0].vinculos).toEqual([{ id: 'v1', personId: 'ana', papel: 'amiga' }]);
    expect(limpo.collections[0].personIds).toEqual(['ana']);
    expect(limpo.albums[0].photoIds).toEqual([ana.fotos[0].id]);
    expect(Object.keys(limpo.drafts)).toEqual(['novo']);
    expect(limpo.chats.map(m => m.id)).toEqual(['m1']);
  });

  it('sem nada quebrado a faxina não muda nada', () => {
    const data = catalogoEmOrdem();
    const { data: limpo, reparos } = repararCatalogo(data, AGORA);
    expect(reparos).toEqual([]);
    expect(limpo.people).toEqual(data.people);
  });

  it('depois da faxina o achado de referência quebrada desaparece', () => {
    const data = catalogoEmOrdem();
    data.collections = [{ id: 'c1', name: 'Time', color: '#c786ec', personIds: ['fantasma'] }];
    expect(analisarSaude(data, contexto).achados.map(a => a.id)).toContain('referencias_quebradas');
    const { data: limpo } = repararCatalogo(data, AGORA);
    expect(analisarSaude(limpo, contexto).achados.map(a => a.id)).not.toContain('referencias_quebradas');
  });
});
