import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, seedIdb, seededData } from "./catalog.test";

describe("tierlists especiais", () => {
  beforeEach(async () => { await seedIdb(seededData(2)); });

  it("permite organizar um nome sem criar uma ficha no catálogo", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { within(aside).getByRole("button", { name: /Tierlists/i }).click(); });
    await waitFor(() => expect(screen.getByRole("heading", { name: /Minhas tierlists/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Nova tierlist/i }));
    await user.type(screen.getByLabelText("Nome da tierlist"), "Pessoas de uma viagem");
    await user.click(screen.getByRole("button", { name: /Lista especial/i }));
    await user.click(screen.getByRole("button", { name: /Criar tierlist/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Pessoas de uma viagem" })).toBeInTheDocument());
    expect(screen.getByText(/Lista especial · sem fichas/i)).toBeInTheDocument();

    const addPanel = document.querySelector(".special-tierlist-add") as HTMLElement;
    await user.type(within(addPanel).getByLabelText("Nome da pessoa avulsa"), "Pessoa de fora");
    await user.click(within(addPanel).getByRole("button", { name: /^Adicionar$/i }));
    expect(screen.getByText("Pessoa de fora")).toBeInTheDocument();
    expect(document.querySelectorAll(".person-card")).toHaveLength(0);
  });
});
