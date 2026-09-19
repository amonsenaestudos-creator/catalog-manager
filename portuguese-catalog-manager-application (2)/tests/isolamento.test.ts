import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { arquivos, ler } from "./css-fonte";

/**
 * Os dois alvos, cada um no seu arquivo.
 *
 * O app tinha três camadas de celular disputando os mesmos seletores, e a
 * última delas — um `mobile.css` sem media query nenhuma, carregado por último —
 * escondia a doca, o título do topo e o botão do menu para todo canto, além de
 * reescrever a doca como a tarja antiga colada no rodapé com breakpoints
 * próprios (767/1024, contra 760/1100 do resto). Estes testes seguram o contrato
 * que não deixa aquilo voltar: regra de bolso só existe dentro de um `@media` em
 * `celular.css`, regra de janela larga só existe em `computador.css`, e a base
 * não conhece largura de bolso.
 */
describe("isolamento dos alvos", () => {
  const base = ler("base");
  const celular = ler("celular");
  const computador = ler("computador");

  it("a porta de entrada são três imports, na ordem do bolso e da janela", () => {
    expect(arquivos).toEqual(["base", "celular", "computador"]);
  });

  it("o mobile.css legado está aposentado e fora da entrada do app", () => {
    expect(existsSync(resolve(__dirname, "../src/mobile.css"))).toBe(false);
    const main = readFileSync(resolve(__dirname, "../src/main.tsx"), "utf8");
    expect(main).toMatch(/^import "\.\/index\.css";$/m);
    expect(main).not.toMatch(/mobile\.css/);
  });

  it("no celular nada nasce solto: cada regra está dentro de um @media", () => {
    // o arquivo é indentado por inteiro — regra na coluna 0 seria regra de todo canto
    expect(celular).not.toMatch(/^[.#a-z][^{}]*\{[^{}]*[a-z-]+\s*:/m);
    expect(celular).toMatch(/@media \(max-width: 1100px\)/);
    expect(celular).toMatch(/@media \(max-width: 760px\)/);
  });

  it("no computador só regra de janela larga", () => {
    const condicoes = computador.match(/@media[^{]*/g) || [];
    expect(condicoes.length).toBeGreaterThan(4);
    for (const cond of condicoes) expect(cond).toContain("min-width: 1101px");
  });

  it("a base não conhece largura de bolso", () => {
    expect(base).not.toMatch(/@media \(max-width: 1100px\)/);
    expect(base).not.toMatch(/@media \(max-width: 760px\)/);
    expect(base).not.toMatch(/@media \(max-width: 380px\)/);
    // e o que os dois alvos compartilham mora mesmo nela
    expect(base).toMatch(/\.quick-tools-grid\s*\{/);
    expect(base).toMatch(/\.sidebar-brand-row\s*\{/);
  });
});
