import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App";
import { corDaPessoa, emptyData, getDefaultPerson, normalizeData, PALETTE } from "../src/store";
import type { Person } from "../src/types";
import { bootApp, openCatalog, seedIdb, seededData } from "./catalog.test";

function pessoa(over: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), nome: "Teste", descricao: "d", ...over };
}

describe("cor da pessoa", () => {
  it("é estável: o mesmo ID sempre leva a mesma cor, dentro da paleta", () => {
    const p = pessoa({ id: "maria-1" });
    const cor = corDaPessoa(p);
    expect(PALETTE).toContain(cor);
    expect(corDaPessoa(p)).toBe(cor);
    expect(corDaPessoa({ ...p, nome: "Outro nome" })).toBe(cor);
  });

  it("distribui: pessoas diferentes não nascem todas com a mesma cor", () => {
    const cores = new Set(Array.from({ length: 16 }, (_, i) => corDaPessoa(pessoa({ id: `p-${i}` }))));
    expect(cores.size).toBeGreaterThan(2);
  });

  it("a cor escolhida pelo usuário ganha da automática", () => {
    const p = pessoa({ id: "maria-1", cor: "#ff0000" });
    expect(corDaPessoa(p)).toBe("#ff0000");
    expect(corDaPessoa(pessoa({ id: "maria-1", cor: "vermelho" }))).not.toBe("vermelho");
  });

  it("a normalização preserva hex válido e descarta o resto", () => {
    const data = { ...emptyData(), people: [pessoa({ id: "a", cor: "#7fbd9b" }), pessoa({ id: "b", cor: "turquesa" })] };
    const limpo = normalizeData(data).people;
    expect(limpo[0]?.cor).toBe("#7fbd9b");
    expect(limpo[1]?.cor).toBeUndefined();
  });
});

describe("botão direito no cartão do catálogo", () => {
  beforeEach(async () => { await seedIdb(seededData(12)); });

  it("abre o menu de ações com os itens de conveniência", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    const card = document.querySelector(".person-card") as HTMLElement;
    await act(async () => { card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); });
    const menu = await waitFor(() => {
      const m = document.querySelector(".person-menu") as HTMLElement | null;
      if (!m) throw new Error("menu não abriu");
      return m;
    }, { timeout: 8000 });
    const texto = menu.textContent || "";
    for (const item of ["Abrir ficha", "Editar ficha", "Ver fotos", "Adicionar nota", "Comparar com...", "Arquivar", "Mover para lixeira"]) {
      expect(texto, `item ${item} precisa existir`).toContain(item);
    }
  });

  it("'Editar ficha' abre a ficha direto no modo edição", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    const card = document.querySelector(".person-card") as HTMLElement;
    const nome = (card.querySelector(".card-name-row h3")?.textContent || "").trim();
    await act(async () => { card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); });
    const botao = await waitFor(() => {
      const botoes = [...document.querySelectorAll(".person-menu button")];
      const b = botoes.find(x => (x.textContent || "").includes("Editar ficha"));
      if (!b) throw new Error("item não achado");
      return b as HTMLButtonElement;
    }, { timeout: 8000 });
    await user.click(botao);
    await waitFor(() => {
      const titulo = [...document.querySelectorAll(".person-drawer h2, .person-drawer h1, .person-drawer [role='heading']")]
        .map(e => e.textContent || "").find(t => t.startsWith(`Editar ${nome}`));
      if (!titulo) throw new Error("drawer não abriu em modo edição");
    }, { timeout: 10000 });
  });
});
