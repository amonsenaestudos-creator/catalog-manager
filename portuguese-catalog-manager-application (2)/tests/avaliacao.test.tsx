import { useEffect, useRef, useState } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogProvider, useCatalog } from '../src/context';
import { emptyData, getDefaultPerson, normalizeData, RATING_BLOCKS, RATING_FIELDS, STORAGE_KEY, resumoBlocos, resumoDaAvaliacao, valoresDaAvaliacao, visibleRatingFields } from '../src/store';
import type { AppData, Person } from '../src/types';

function pessoaBase(over: Partial<Person> = {}): Person {
  const p = getDefaultPerson();
  return { ...p, nome: 'Marina', descricao: 'Teste da avaliação.', idade: 25, ...over };
}

describe('blocos da avaliação (mesmos campos, organizados)', () => {
  it('cobre os 8 critérios existentes exatamente uma vez, sem inventar categoria', () => {
    const chaves = RATING_BLOCKS.flatMap(b => [...b.keys]);
    expect(chaves.sort()).toEqual(RATING_FIELDS.map(f => f.key).sort());
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('mantém peitos, bunda e quadril como critérios somente +18', () => {
    const adult = RATING_FIELDS.filter(f => f.adult).map(f => f.key).sort();
    expect(adult).toEqual(['bunda', 'peitos', 'quadril'].sort());
  });

  it('oculta os critérios +18 quando a ficha não é adulta', () => {
    const p = pessoaBase({ idade: 17 });
    const resumo = resumoDaAvaliacao(p);
    const totais = resumo.blocos.reduce((a, b) => a + b.total, 0);
    expect(totais).toBe(5); // 8 menos peitos, bunda e quadril
  });
});

describe('critérios configuráveis (settings.ratingFields)', () => {
  it('sem configuração mostra os 8 critérios', () => {
    expect(visibleRatingFields().length).toBe(8);
    expect(visibleRatingFields(undefined).length).toBe(8);
    expect(visibleRatingFields({ ratingFields: [] }).length).toBe(8);
  });

  it('respeita a lista configurada e o resumo só conta o que aparece', () => {
    const settings = { ratingFields: ['rosto', 'belezaGeral', 'cabelo'] };
    expect(visibleRatingFields(settings).map(f => f.key)).toEqual(['rosto', 'belezaGeral', 'cabelo']);
    const p = pessoaBase({ rating: { ...pessoaBase().rating, rosto: 4, belezaGeral: 4, cabelo: 4, corpo: 5, comportamento: 5 } });
    const resumo = resumoDaAvaliacao(p, settings);
    expect(resumo.total).toBe(3);
    expect(resumo.preenchidos).toBe(3);
  });
});

describe('médias por bloco', () => {
  it('média do bloco só usa critérios preenchidos (null = vazio)', () => {
    const p = pessoaBase({ rating: { ...pessoaBase().rating, rosto: 4, cabelo: 2, corpo: 0 } });
    const fisicas = resumoBlocos(p.rating).find(b => b.id === 'fisicas')!;
    expect(fisicas.media).toBe(3); // (4+2)/2 — corpo zerado não pesa
    expect(fisicas.preenchidos).toBe(2);
    const comportamento = resumoBlocos(p.rating).find(b => b.id === 'comportamento')!;
    expect(comportamento.media).toBeNull();
  });

  it('resumo da avaliação traz nota geral + progresso + blocos', () => {
    const p = pessoaBase({ rating: { ...pessoaBase().rating, rosto: 4, belezaGeral: 4, cabelo: 2, comportamento: 5 } });
    const resumo = resumoDaAvaliacao(p);
    expect(resumo.overall).toBeGreaterThan(0);
    expect(resumo.preenchidos).toBe(4);
    expect(resumo.total).toBe(8);
    expect(resumo.blocos.map(b => b.id)).toEqual(['beleza', 'fisicas', 'comportamento']);
  });
});

describe('histórico: valores e comentário', () => {
  it('valoresDaAvaliacao guarda só os atributos, sem mode/overall, e limita a 0–5', () => {
    const p = pessoaBase({ rating: { ...pessoaBase().rating, rosto: 9, bunda: 1, mode: 'manual' as const } });
    const valores = valoresDaAvaliacao(p.rating);
    expect(valores.rosto).toBe(5);
    expect(valores.bunda).toBe(1);
    expect('mode' in valores).toBe(false);
    expect('overall' in valores).toBe(false);
  });

  it('a normalização preserva comentário e valores do snapshot (e snapshots antigos seguem válidos)', () => {
    const data: AppData = {
      ...emptyData(),
      people: [pessoaBase({
        ratingHistory: [
          { date: '2026-08-01', overall: 3.2 },
          { date: '2026-09-01', overall: 4.1, comment: 'melhorou muito', values: { rosto: 4, bunda: 5 } },
        ],
        ratingComment: 'obs atual',
      })],
    };
    const limpo = normalizeData(data).people[0]!;
    expect(limpo.ratingHistory).toHaveLength(2);
    expect(limpo.ratingHistory?.[0]).toEqual({ date: '2026-08-01', overall: 3.2 });
    expect(limpo.ratingHistory?.[1]).toEqual({ date: '2026-09-01', overall: 4.1, comment: 'melhorou muito', values: { rosto: 4, bunda: 5 } });
    expect(limpo.ratingComment).toBe('obs atual');
  });
});

describe('salvar reavaliação sem perder a anterior (fluxo real)', () => {
  function Probe({ onDone }: { onDone: (p: Person) => void }) {
    const { data, ready, savePerson } = useCatalog();
    const pessoa = data.people.find(x => x.id === 'teste-adulta');
    const ref = useRef<Person | null>(null);
    ref.current = pessoa || ref.current;
    const [etapa, setEtapa] = useState(0);
    useEffect(() => {
      if (!ready || !ref.current) return;
      if (etapa === 0) {
        setEtapa(1);
        const base = ref.current!;
        savePerson({ ...base, rating: { ...base.rating, rosto: 5, cabelo: 4, bunda: 4 }, ratingComment: 'avaliação inicial' });
      } else if (etapa === 1) {
        const atual = ref.current!;
        savePerson({ ...atual, rating: { ...atual.rating, bunda: 5, quadril: 4 }, ratingComment: 'reavaliando a bunda' });
        setEtapa(2);
      } else if (etapa === 2) {
        onDone(ref.current!);
      }
    }, [ready, etapa, onDone]);
  }

  beforeEach(() => {
    localStorage.clear();
    const pessoa = pessoaBase({ id: 'teste-adulta', rating: { ...pessoaBase().rating, rosto: 3, belezaGeral: 3 } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData({ ...emptyData(), people: [pessoa] })));
  });

  it('duas reavaliações geram dois snapshots: a anterior continua lá, com valores e comentário', async () => {
    const done = new Promise<Person>(resolve => render(<CatalogProvider><Probe onDone={resolve} /></CatalogProvider>));
    const p = await done;
    const historico = p.ratingHistory || [];
    expect(historico.length).toBe(2);
    const [primeira, segunda] = historico;
    expect(primeira.comment).toBe('avaliação inicial');
    expect(primeira.values?.rosto).toBe(5);
    expect(primeira.values?.bunda).toBe(4);
    expect(segunda.comment).toBe('reavaliando a bunda');
    expect(segunda.values?.bunda).toBe(5);
    expect(segunda.values?.quadril).toBe(4);
    // a anterior não foi sobrescrita: ainda tem a avaliação antiga
    expect(primeira.overall).toBeLessThan(segunda.overall);
  });
});
