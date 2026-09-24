import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, seedIdb, seededData } from "./catalog.test";

async function abrirFavoritos(user: ReturnType<typeof userEvent.setup>) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  // Favoritos é essencial: fica à vista, sem precisar do “+”.
  const nav = [...aside.querySelectorAll<HTMLButtonElement>("button.nav-item")].find(b => /Favoritos/i.test(b.textContent || ""));
  expect(nav, "item Favoritos precisa estar no menu principal").toBeTruthy();
  await act(async () => { nav!.click(); });
  await waitFor(() => expect(document.querySelector(".favoritos-page")).toBeTruthy());
}

const conte = () => document.querySelectorAll(".fav-card, .fav-linha, .fav-mural-item").length;

describe("favoritos", () => {
  beforeEach(async () => { await seedIdb(seededData(12, 1)); });

  it("mostra os corações em grade (padrão) e abre a ficha", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirFavoritos(user);
    await waitFor(() => expect(conte()).toBeGreaterThan(0));
    expect(document.querySelector(".fav-grade")).toBeTruthy();
    const primeiro = document.querySelector<HTMLButtonElement>(".fav-card-foto button");
    expect(primeiro).toBeTruthy();
    await act(async () => { primeiro!.click(); });
    await waitFor(() => expect(document.querySelector(".person-drawer h2")).toBeTruthy());
  });

  it("troca entre grade, lista e mural — e lembra do modo escolhido", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirFavoritos(user);
    await waitFor(() => expect(conte()).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: /Lista/i }));
    await waitFor(() => expect(document.querySelector(".fav-linha-list")).toBeTruthy());
    expect(document.querySelectorAll(".fav-linha").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Mural/i }));
    await waitFor(() => expect(document.querySelector(".fav-mural")).toBeTruthy());
    expect(document.querySelectorAll(".fav-mural-item").length).toBeGreaterThan(0);

    // A escolha fica no aparelho.
    expect(localStorage.getItem("catalog_favoritos_modo")).toBe("mural");
  });

  it("tirar o coração sai da coleção na hora", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirFavoritos(user);
    await waitFor(() => expect(conte()).toBeGreaterThan(0));
    const antes = conte();
    const coracao = document.querySelector<HTMLButtonElement>(".fav-coracao");
    expect(coracao).toBeTruthy();
    await act(async () => { coracao!.click(); });
    await waitFor(() => expect(conte()).toBe(antes - 1));
  });
});
