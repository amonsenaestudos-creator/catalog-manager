import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, openCatalog, seedIdb, seededData } from "./catalog.test";
import { normalizeData } from "../src/store";
import type { AppData, Pacote } from "../src/types";

function pacoteFixtures(): AppData {
  const data = seededData(3, 1);
  data.pacotes = [
    { id: "pk-1", name: "Time do jogo", color: "#c786ec", description: "As meninas da equipe", personIds: ["seed-0", "seed-1", "seed-99"], createdAt: "2026-01-01T12:00:00.000Z", updatedAt: "2026-01-02T12:00:00.000Z" },
  ];
  return data;
}

describe("pacotes: dados", () => {
  it("normaliza pacotes e solta pessoa que foi para a lixeira", () => {
    const data = pacoteFixtures();
    const normal = normalizeData(data);
    expect(normal.pacotes).toHaveLength(1);
    expect(normal.pacotes[0].name).toBe("Time do jogo");
    // seed-99 não existe: o id some, o pacote sobrevive.
    expect(normal.pacotes[0].personIds).toEqual(["seed-0", "seed-1"]);
    expect(normal.pacotes[0].color).toBe("#c786ec");
  });

  it("dado antigo sem pacotes ganha a lista vazia (migração)", () => {
    const data = pacoteFixtures();
    const { pacotes, ...rest } = data;
    void pacotes;
    const normal = normalizeData(rest);
    expect(normal.pacotes).toEqual([]);
  });

  it("cor inválida cai na paleta, id vazio ganha um novo", () => {
    const data = pacoteFixtures();
    const malformado: Pacote = { id: "", name: "", color: "vermelho", description: "", personIds: ["seed-0"], createdAt: "", updatedAt: "" };
    data.pacotes = [malformado];
    const normal = normalizeData(data);
    expect(normal.pacotes[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(normal.pacotes[0].name).toBe("Pacote sem nome");
    expect(normal.pacotes[0].id).toBeTruthy();
  });
});

describe("pacotes: tela", () => {
  beforeEach(async () => { await seedIdb(seededData(24, 1)); });

  it("cria um pacote escolhendo as pessoas e exporta o JSON", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    // “Pacotes” mora no + da biblioteca.
    await act(async () => { (aside.querySelector<HTMLButtonElement>(".nav-expand") as HTMLElement).click(); });
    const nav = [...aside.querySelectorAll<HTMLButtonElement>("button.nav-item")].find(b => /Pacotes/i.test(b.textContent || ""));
    expect(nav, "item Pacotes precisa estar no menu").toBeTruthy();
    await act(async () => { nav!.click(); });
    await waitFor(() => expect(document.querySelector(".pacotes-page")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Novo pacote/i }));
    await user.type(screen.getByPlaceholderText(/Time do jogo/i), "Pacote do teste");
    const caixas = [...document.querySelectorAll<HTMLInputElement>(".pacote-pessoa input[type='checkbox']")];
    expect(caixas.length).toBeGreaterThan(2);
    await user.click(caixas[0]);
    await user.click(caixas[1]);
    await user.click(screen.getByRole("button", { name: /Criar pacote/i }));
    await waitFor(() => expect(document.querySelector(".pacote-card")).toBeTruthy());
    await waitFor(() => { const toast = document.querySelector(".toast"); expect(toast?.textContent).toMatch(/criado com 2 pessoas/i); });

    // Exportar: o download é stubado no setup (blob:stub); o que importa é o resumo.
    await user.click(screen.getByRole("button", { name: /Exportar JSON/i }));
    await waitFor(() => { const toast = document.querySelector(".toast"); expect(toast?.textContent).toMatch(/exportado com 2 ficha/i); });
  });

  it("catálogo → seleção em lote → Pacote abre o criador com a pré-seleção", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    await act(async () => { (document.querySelector<HTMLButtonElement>("button.select-toggle") as HTMLElement).click(); });
    const caixas = [...document.querySelectorAll<HTMLInputElement>(".person-card input[type='checkbox']")];
    await user.click(caixas[0]);
    await user.click(caixas[1]);
    await user.click(screen.getByRole("button", { name: /^Pacote$/i }));
    await waitFor(() => expect(document.querySelector(".pacotes-page")).toBeTruthy());
    await waitFor(() => expect(document.querySelectorAll(".pacote-pessoa input:checked")).toHaveLength(2));
    await user.type(screen.getByPlaceholderText(/Time do jogo/i), "Direto do catálogo");
    await user.click(screen.getByRole("button", { name: /Criar pacote/i }));
    await waitFor(() => expect(document.querySelector(".pacote-card")).toBeTruthy());
    await waitFor(() => { const toast = document.querySelector(".toast"); expect(toast?.textContent).toMatch(/Direto do catálogo/i); });
  });
});
