import { describe, expect, it } from 'vitest';
import { emptyData, getDefaultPerson } from '../src/store';
import type { AppData, Person } from '../src/types';
import { listarSurpresas, sorteSurpresa } from '../src/lib/surpresas';

function pessoa(over: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), nome: 'X', descricao: 'd', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-09-20T12:00:00Z', ...over };
}

function base(people: Person[]): AppData {
  return { ...emptyData(), people };
}

describe('surpreenda-me: o catálogo dá motivo para abrir o app', () => {
  it('catálogo vazio não surpreende — e não quebra', () => {
    expect(listarSurpresas(base([]))).toEqual([]);
    expect(sorteSurpresa(base([]))).toBeNull();
  });

  it('com duas pessoas oferece um confronto para o comparador', () => {
    const a = pessoa({ id: 'a', nome: 'Ana' });
    const b = pessoa({ id: 'b', nome: 'Bruno' });
    const surpresas = listarSurpresas(base([a, b]), new Date('2026-09-23T20:00:00Z'));
    expect(surpresas.some(s => s.tipo === 'confronto' && s.acao === 'comparar')).toBe(true);
  });

  it('nota antiga vira memória esquecida, com o que você realmente registrou', () => {
    const a = pessoa({ id: 'a', nome: 'Ana', notas: [{ id: 'n1', title: 'gosto', content: 'Ana adora vôlei', type: 'confirmado', date: '2026-06-01' }] });
    const surpresas = listarSurpresas(base([a]), new Date('2026-09-23T20:00:00Z'));
    const mem = surpresas.find(s => s.tipo === 'memoria_esquecida');
    expect(mem).toBeTruthy();
    expect(mem!.descricao).toContain('vôlei');
    expect(mem!.pessoa?.id).toBe('a');
  });

  it('aniversário em 3 dias entra na lista', () => {
    const a = pessoa({ id: 'a', nome: 'Ana', aniversario: '2000-09-26' });
    const surpresas = listarSurpresas(base([a]), new Date('2026-09-23T20:00:00Z'));
    expect(surpresas.some(s => s.tipo === 'aniversario')).toBe(true);
  });

  it('coincidência: três pessoas com o mesmo primeiro nome', () => {
    const pessoas = [1, 2, 3].map(n => pessoa({ id: `j${n}`, nome: `João Sobrenome ${n}` }));
    const surpresas = listarSurpresas(base(pessoas), new Date('2026-09-23T20:00:00Z'));
    expect(surpresas.some(s => s.tipo === 'coincidencia' && s.titulo.includes('João'))).toBe(true);
  });

  it('ficha parada (14+ dias) vira convite para voltar a contar a história', () => {
    const a = pessoa({ id: 'a', nome: 'Ana', updatedAt: '2026-08-01T12:00:00Z' });
    const surpresas = listarSurpresas(base([a]), new Date('2026-09-23T20:00:00Z'));
    expect(surpresas.some(s => s.tipo === 'ficha_parada')).toBe(true);
  });

  it('sorteSurpresa não repete a última sorteada', () => {
    const pessoas = [1, 2, 3, 4].map(n => pessoa({ id: `p${n}`, nome: `Pessoa ${n}` }));
    const data = base(pessoas);
    const randSeq = (() => { let s = 1; return () => (s = (s * 48271) % 2147483647) / 2147483647; })();
    const primeira = sorteSurpresa(data, null, randSeq, new Date('2026-09-23T20:00:00Z'));
    const segunda = sorteSurpresa(data, primeira!.chave, randSeq, new Date('2026-09-23T20:00:00Z'));
    expect(primeira).toBeTruthy();
    expect(segunda!.chave).not.toBe(primeira!.chave);
  });
});
