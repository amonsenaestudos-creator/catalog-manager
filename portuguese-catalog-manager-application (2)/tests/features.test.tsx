import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, seededData, seedIdb } from "./catalog.test";

/** Entra em uma página pela barra lateral. */
async function goto(label: RegExp) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  const button = within(aside).getByRole("button", { name: label }) as HTMLElement;
  await act(async () => { button.click(); });
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
}

describe("novas telas", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("painel, meu espaço, agenda e descobrir abrem sem erro", async () => {
    const user = userEvent.setup();
    await bootApp(user);

    await goto(/Painel/i);
    await waitFor(() => expect(document.querySelector(".dashboard-page")).toBeTruthy());
    expect(document.querySelectorAll(".stat-card").length).toBeGreaterThan(3);
    expect(document.querySelector(".radar-chart")).toBeTruthy();
    expect(document.querySelectorAll(".rarity-card").length).toBeGreaterThan(0);

    await goto(/Meu espaço/i);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Meu espaço/i })).toBeInTheDocument());
    expect(screen.getByText(/página espera por você|páginas aqui/i)).toBeInTheDocument();
    const cofre = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(b => /Cofre/i.test(b.textContent || ""));
    expect(cofre, "aba do cofre").toBeTruthy();
    await act(async () => { cofre!.click(); });
    await waitFor(() => expect(screen.getByRole("heading", { name: /Cofre pessoal/i })).toBeInTheDocument());

    await goto(/Agenda/i);
    await waitFor(() => expect(document.querySelector(".agenda-page")).toBeTruthy());
    expect(document.querySelector(".agenda-numbers")).toBeTruthy();

    await goto(/Descobrir/i);
    await waitFor(() => expect(document.querySelector(".discover-page")).toBeTruthy());
    expect(screen.getByText(/Modo swipe/i)).toBeInTheDocument();
    expect(document.querySelector(".swipe-card, .swipe-empty, .duel-card")).toBeTruthy();
  });

  it("pastas mostram subpastas e a galeria tem abas novas", async () => {
    const user = userEvent.setup();
    await bootApp(user);

    await goto(/Pastas/i);
    await waitFor(() => expect(document.querySelector(".folders-page")).toBeTruthy());
    expect(document.querySelector(".folder-toolbar")).toBeTruthy();

    await goto(/Galeria/i);
    await waitFor(() => expect(document.querySelector(".gallery-page")).toBeTruthy());
    const tabs = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].map(t => t.textContent || "");
    expect(tabs.some(text => /Álbuns/i.test(text))).toBe(true);
    expect(tabs.some(text => /Duplicadas/i.test(text))).toBe(true);
    expect(tabs.some(text => /Antes e depois/i.test(text))).toBe(true);
    expect(screen.getByRole("button", { name: /Favoritas/i })).toBeInTheDocument();
  });

  it("central de avisos lista pendências do catálogo", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const bell = document.querySelector(".notification-anchor button") as HTMLElement;
    expect(bell, "sino da central de avisos").toBeTruthy();
    await act(async () => { bell.click(); });
    await waitFor(() => expect(document.querySelector(".notification-panel")).toBeTruthy());
    await settle();
    expect(document.querySelector(".notification-list, .notification-empty")).toBeTruthy();
  });
});
