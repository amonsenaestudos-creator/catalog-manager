import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogProvider } from "../src/context";
import { getDefaultPerson } from "../src/store";
import PersonDrawer from "../src/components/PersonDrawer";

/**
 * Regressão: o "Radar comparado à média" chegou duplicado na ficha —
 * um dentro da aba Avaliações e um órfão fora da condição, o que fazia o
 * gráfico aparecer em todas as abas (e duas vezes em Avaliações).
 */
describe("ficha: radar comparado à média", () => {
  it("aparece uma única vez, e só na aba Avaliações", async () => {
    const pessoa = { ...getDefaultPerson(), id: "radar-1", nome: "Ana Radar", descricao: "Ficha de teste do radar." };
    render(<CatalogProvider><PersonDrawer person={pessoa} /></CatalogProvider>);

    // Aba padrão (Informações): o radar não existe aqui.
    expect(document.querySelectorAll(".rating-radar")).toHaveLength(0);

    // Aba Avaliações: exatamente um.
    await act(async () => { (screen.getByRole("button", { name: /Avaliações/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelectorAll(".rating-radar")).toHaveLength(1));
    expect(document.querySelector(".rating-radar h3")?.textContent).toBe("Radar comparado à média");
  });
});
