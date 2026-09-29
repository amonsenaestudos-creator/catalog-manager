import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const src = join(root, 'src');

function filesInside(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesInside(path) : [path];
  });
}

describe('contratos de arquitetura', () => {
  it('mantém o mapa do aplicativo e facades de domínio', () => {
    expect(existsSync(join(root, 'ARCHITECTURE.md'))).toBe(true);
    for (const feature of ['discovery', 'people', 'gallery', 'gamification', 'relationships', 'health', 'voice']) {
      expect(existsSync(join(src, 'features', feature, 'README.md')), feature).toBe(true);
      expect(existsSync(join(src, 'features', feature, 'index.ts')), feature).toBe(true);
    }
  });

  it('não deixa componentes visuais novos passarem do limite de 800 linhas', () => {
    const componentFiles = [
      ...filesInside(join(src, 'components')),
      ...filesInside(join(src, 'features')).filter(file => file.includes(`${relative(src, join(src, 'features'))}/`)).filter(file => file.includes('/components/')),
    ].filter(file => file.endsWith('.tsx'));
    const oversized = componentFiles
      .map(file => ({ file: relative(root, file), lines: readFileSync(file, 'utf8').split('\n').length }))
      .filter(entry => entry.lines > 800);
    expect(oversized, 'componentes acima do limite: separar antes de ampliar').toEqual([]);
  });

  it('não deixa temporizador sobreviver ao desmonte do provedor', () => {
    // O aviso e o salvamento adiado são temporizadores do provedor. Se um deles
    // sobrevive ao desmonte, ele despacha estado com a tela já fora do ar: em
    // navegador é trabalho perdido, em teste é "window is not defined" no CI.
    const contexto = readFileSync(join(src, 'context.tsx'), 'utf8');
    expect(contexto).toMatch(/useEffect\(\(\) => \(\) => \{[^}]*clearTimeout\(timer\.current\)[^}]*clearTimeout\(noticeTimer\.current\)/);
  });

  it('mantém os módulos de descoberta dentro do domínio', () => {
    expect(existsSync(join(src, 'features', 'discovery', 'components', 'Momentos.tsx'))).toBe(true);
    expect(existsSync(join(src, 'features', 'discovery', 'components', 'Desafios.tsx'))).toBe(true);
    expect(statSync(join(src, 'features', 'discovery', 'components', 'Momentos.tsx')).isFile()).toBe(true);
  });
  it('mantém as bancas de frases fora do motor, como estágio de geração', () => {
    // O motor decide o que acontece; a banca só guarda o que é dito. Se as duas
    // coisas voltarem para o mesmo arquivo, o motor passa a ter mais de duas mil
    // linhas de fala no meio da lógica — foi assim que ele chegou a 3.050.
    const motor = readFileSync(join(src, 'lib', 'dialogue.ts'), 'utf8');
    const bancas = readFileSync(join(src, 'lib', 'dialogue', 'bancos.ts'), 'utf8');

    expect(motor).not.toMatch(/^const RESPOSTAS:/m);
    expect(motor).not.toMatch(/^const PERGUNTAS:/m);
    expect(motor.split('\n').length).toBeLessThan(2000);

    // Banca não decide nada: sem função, sem estado, sem depender do app.
    expect(bancas).not.toMatch(/\bfunction\b/);
    expect(bancas).not.toMatch(/from '\.\.\/(store|persona|estado|relacao|memory|topics)'/);
    expect(bancas).toMatch(/^export const RESPOSTAS/m);

    // O que sai da banca é só material de fala: listas de texto.
    const listas = [...bancas.matchAll(/^export const ([A-Z_0-9]+)(?:: [^=]+)?=/gm)].map(m => m[1]);
    expect(listas.length).toBeGreaterThanOrEqual(30);
  });
});
