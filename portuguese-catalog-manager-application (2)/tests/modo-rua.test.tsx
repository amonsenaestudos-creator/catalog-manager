import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, seedIdb, seededData } from "./catalog.test";

async function abrirRua(user: ReturnType<typeof userEvent.setup>) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  const expand = aside.querySelector<HTMLButtonElement>(".nav-expand");
  if (expand) await act(async () => { expand.click(); });
  const nav = [...aside.querySelectorAll<HTMLButtonElement>("button.nav-item")].find(b => /Modo rua/i.test(b.textContent || ""));
  expect(nav, "item Modo rua precisa estar no menu").toBeTruthy();
  await act(async () => { nav!.click(); });
  await waitFor(() => expect(document.querySelector(".rua-page")).toBeTruthy());
}

const tile = (rotulo: string) =>
  [...document.querySelectorAll<HTMLButtonElement>(".rua-tile")].find(t => new RegExp(rotulo, "i").test(t.textContent || ""))!;

describe("modo rua", () => {
  beforeEach(async () => { await seedIdb(seededData(12, 1)); });

  it("abre com os cinco botões grandes", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirRua(user);
    for (const rotulo of ["Capturar câmera", "Pessoa nova", "Nota rápida", "Buscar", "Contexto de local"]) {
      expect(tile(rotulo), `o botão ${rotulo} precisa existir`).toBeTruthy();
    }
    // A câmera abre primeiro: o uploader com “Escolher imagens” e “Usar câmera”.
    expect(screen.getByRole("button", { name: /Usar câmera/i })).toBeTruthy();
    expect(document.querySelector('input[type="file"][capture]')).toBeTruthy();
  });

  it("nota rápida guarda uma anotação geral", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirRua(user);
    await act(async () => { tile("Nota rápida").click(); });
    const campo = await screen.findByPlaceholderText(/portão/i);
    await user.type(campo, "Vi ela perto do portão, com a amiga de antes.");
    await user.click(screen.getByRole("button", { name: /Guardar nota/i }));
    await waitFor(() => { const toast = document.querySelector(".toast"); expect(toast?.textContent).toMatch(/Nota rápida guardada/i); });
  });

  it("buscar acha a ficha pelo nome e abre", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirRua(user);
    await act(async () => { tile("Buscar").click(); });
    const campo = screen.getByLabelText(/Buscar pessoa pelo nome/i);
    await user.type(campo, "Pessoa Teste 003");
    await waitFor(() => expect(document.querySelector(".rua-resultados button")).toBeTruthy());
    await act(async () => { (document.querySelector(".rua-resultados button") as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".person-drawer .person-intro h2")?.textContent).toMatch(/Pessoa Teste 003/i));
  });

  it("pessoa nova cria a ficha em dois campos", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirRua(user);
    await act(async () => { tile("Pessoa nova").click(); });
    await user.type(screen.getByPlaceholderText(/^Nome$/i), "Ju da esquina");
    await user.type(screen.getByPlaceholderText(/^Anos$/i), "21");
    await user.click(screen.getByRole("button", { name: /Salvar e continuar/i }));
    await waitFor(() => { const toast = document.querySelector(".toast"); expect(toast?.textContent).toMatch(/Ficha salva com sucesso/i); });
    // O campo voltou ao zero: dá para continuar cadastrando na rua.
    expect((screen.getByPlaceholderText(/^Nome$/i) as HTMLInputElement).value).toBe("");
  });

  it("contexto de local mostra quem é de cada lugar e cadastra ali", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirRua(user);
    await act(async () => { tile("Contexto de local").click(); });
    const locais = document.querySelectorAll(".rua-locais button");
    expect(locais.length).toBeGreaterThan(0);
    await act(async () => { (locais[0] as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".rua-locais-pessoas")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Adicionar pessoa aqui/i }));
    await waitFor(() => expect(document.querySelector(".editor-page")).toBeTruthy());
    // A categoria chegou no rascunho: o select de categoria já começa no local escolhido.
    const rotulo = [...document.querySelectorAll<HTMLElement>(".person-editor .field-label")].find(el => /^Categoria$/i.test(el.textContent || ""));
    expect(rotulo, "campo Categoria precisa estar no editor").toBeTruthy();
    const select = rotulo!.parentElement!.querySelector<HTMLSelectElement>("select");
    expect(select?.value, "a categoria do local precisa vir pré-preenchida").toBeTruthy();
  });
});
