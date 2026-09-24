import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CatalogProvider } from "../src/context";
import { getDefaultPerson } from "../src/store";
import type { Person } from "../src/types";
import PersonEditor, { PhotoUploader } from "../src/components/PersonEditor";
import { bootApp, openCatalog, seedIdb, seededData } from "./catalog.test";

const noop = () => {};

describe("captura de câmera", () => {
  it("o uploader oferece escolher imagens E usar a câmera", () => {
    render(<PhotoUploader onFiles={noop} />);
    expect(screen.getByRole("button", { name: /Escolher imagens/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Usar câmera/i })).toBeTruthy();
    const captura = document.querySelector('input[type="file"][capture]');
    expect(captura).toBeTruthy();
    expect(captura?.getAttribute("accept")).toBe("image/*");
  });
});

describe("adicionar pessoa: começa pelo básico", () => {
  it("ficha em branco ganha o norte de onde começar + foco no nome", () => {
    const vazia: Person = { ...getDefaultPerson(), id: "nova-1" };
    render(<CatalogProvider><PersonEditor person={vazia} update={noop} dirty={false} recovered={false} onDiscard={noop} onSave={noop} onCancel={noop} /></CatalogProvider>);
    expect(screen.getByText(/Comece pelo básico/i)).toBeTruthy();
    const nome = document.querySelector<HTMLInputElement>('input[placeholder*="se chama"]');
    // React 19 foca via efeito: no render inicial o campo de nome já está ativo.
    expect(document.activeElement).toBe(nome);
  });

  it("ficha com nome não mostra a dica (é para quem está começando)", () => {
    const cheia: Person = { ...getDefaultPerson(), id: "nova-2", nome: "Maria" };
    render(<CatalogProvider><PersonEditor person={cheia} update={noop} dirty={false} recovered={false} onDiscard={noop} onSave={noop} onCancel={noop} /></CatalogProvider>);
    expect(screen.queryByText(/Comece pelo básico/i)).toBeNull();
  });
});

describe("easter egg: código-espelho", () => {
  beforeEach(async () => { await seedIdb(seededData(6)); });

  it("konami de cabeça para baixo desbloqueia a conquista secreta (uma vez)", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    const seguencia = ["ArrowDown", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowRight", "ArrowLeft"];
    for (const tecla of seguencia) {
      await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: tecla, bubbles: true })); });
    }
    const toast = await waitFor(() => {
      const t = document.querySelector(".toast");
      if (!t || !(t.textContent || "").includes("Conquista secreta")) throw new Error("conquista não veio");
      return t;
    }, { timeout: 10000 });
    expect(toast.textContent).toContain("Espelho");
  });
});
