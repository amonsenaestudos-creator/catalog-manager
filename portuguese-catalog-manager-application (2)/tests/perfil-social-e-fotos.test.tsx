import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootApp, fakePhoto, seedIdb, seededData } from "./catalog.test";
import { getDefaultPerson } from "../src/store";
import type { AppData } from "../src/types";

/** O catálogo real mora no IndexedDB: leitura direta para conferir o que foi salvo. */
async function lerDados(): Promise<AppData> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("catalog-local-v3", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const dados = await new Promise<AppData>((resolve, reject) => {
    const transacao = db.transaction("data", "readonly");
    const pedido = transacao.objectStore("data").get("current");
    pedido.onsuccess = () => resolve(pedido.result as AppData);
    pedido.onerror = () => reject(pedido.error);
  });
  db.close();
  return dados;
}

const resposta = (dados: unknown) => ({
  ok: true, status: 200,
  json: async () => dados,
  text: async () => JSON.stringify(dados),
  blob: async () => new Blob([JSON.stringify(dados)], { type: "application/json" }),
}) as Response;

async function irParaAdicionarPessoa() {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  await act(async () => { (within(aside).getByRole("button", { name: /Adicionar pessoa/i }) as HTMLElement).click(); });
  return await screen.findByLabelText(/^Nome \*$/i);
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("importar perfil social no cadastro", () => {
  beforeEach(async () => {
    await seedIdb(seededData(4, 1));
    vi.stubGlobal("fetch", vi.fn(async (entrada: RequestInfo | URL) => {
      const url = String(entrada);
      if (url.startsWith("https://api.github.com/users/octocat")) return resposta({
        login: "octocat", name: "The Octocat", bio: "Mascote do GitHub", location: "San Francisco",
        blog: "https://github.blog", avatar_url: "https://avatars.githubusercontent.com/u/583231", followers: 16000,
      });
      return { ok: false, status: 404 } as Response;
    }));
  });

  it("lê o GitHub, preenche nome, bio, perfil e retrato", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const nome = await irParaAdicionarPessoa();

    await user.click(screen.getByRole("button", { name: /Importar perfil social/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    await user.type(screen.getByLabelText(/Link ou usuário do perfil/i), "github.com/octocat");
    await user.click(screen.getByRole("button", { name: /Buscar perfil/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "The Octocat" })).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText(/Mascote do GitHub/i)).toBeInTheDocument();
    expect(screen.getByText(/16 mil seguidores/i)).toBeInTheDocument();
    expect(screen.getByText(/Lido de GitHub/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Aplicar à ficha/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(nome).toHaveValue("The Octocat"));
    expect((screen.getByPlaceholderText(/O que você gostaria de lembrar/i) as HTMLTextAreaElement).value).toContain("Mascote do GitHub");

    await user.click(screen.getByRole("button", { name: /^Salvar ficha$/i }));

    await waitFor(async () => {
      const dados = await lerDados();
      const pessoa = dados.people.find(item => item.nome === "The Octocat");
      expect(pessoa, "ficha salva com o nome importado").toBeTruthy();
      expect(pessoa!.perfisSociais?.[0]).toMatchObject({ rede: "github", usuario: "octocat", nome: "The Octocat", seguidores: 16000 });
      expect(pessoa!.redesSociais).toContain("https://github.com/octocat");
      expect(pessoa!.fotos.some(foto => foto.url.includes("avatars.githubusercontent.com"))).toBe(true);
    }, { timeout: 8000 });
  });
});

describe("escolher fotos que já estão no sistema", () => {
  beforeEach(async () => {
    const dados = seededData(4, 1);
    dados.orphanPhotos = [{
      id: "solta-1", url: fakePhoto(3), type: "normal", personId: null, isMain: false,
      name: "Foto solta", createdAt: new Date().toISOString(),
    }];
    await seedIdb(dados);
  });

  it("puxa uma foto sem ficha para o cadastro e ela sai da galeria solta ao salvar", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await irParaAdicionarPessoa();
    await user.type(screen.getByLabelText(/^Nome \*$/i), "Pessoa da foto");

    const abas = document.querySelector(".editor-tabs") as HTMLElement;
    await act(async () => { (within(abas).getByRole("button", { name: /Fotos/i }) as HTMLElement).click(); });
    await user.click(await screen.findByRole("button", { name: /Escolher fotos do sistema/i }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(screen.getAllByText(/Sem ficha/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Escolher Foto solta/i }));
    await user.click(screen.getByRole("button", { name: /Usar 1 foto/i }));

    await waitFor(() => expect(document.querySelectorAll(".edit-photos .edit-photo")).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: /^Salvar ficha$/i }));

    await waitFor(async () => {
      const dados = await lerDados();
      const pessoa = dados.people.find(item => item.nome === "Pessoa da foto");
      expect(pessoa, "ficha salva").toBeTruthy();
      expect(pessoa!.fotos.map(foto => foto.id)).toContain("solta-1");
      expect(dados.orphanPhotos.some(foto => foto.id === "solta-1"), "a foto saiu da galeria solta").toBe(false);
    }, { timeout: 8000 });
  });

  it("mostra as fotos de outras fichas como cópia e mantém a original", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await irParaAdicionarPessoa();
    await user.type(screen.getByLabelText(/^Nome \*$/i), "Outra ficha");

    const abas = document.querySelector(".editor-tabs") as HTMLElement;
    await act(async () => { (within(abas).getByRole("button", { name: /Fotos/i }) as HTMLElement).click(); });
    await user.click(await screen.findByRole("button", { name: /Escolher fotos do sistema/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    const filtro = screen.getByRole("button", { name: /De outras fichas/i });
    await act(async () => { filtro.click(); });
    const primeira = document.querySelector<HTMLButtonElement>(".escolher-foto");
    expect(primeira, "há fotos de outras fichas").toBeTruthy();
    await user.click(primeira!);
    await user.click(screen.getByRole("button", { name: /Usar 1 foto/i }));
    await user.click(screen.getByRole("button", { name: /^Salvar ficha$/i }));

    await waitFor(async () => {
      const dados = await lerDados();
      const pessoa = dados.people.find(item => item.nome === "Outra ficha");
      expect(pessoa, "ficha salva").toBeTruthy();
      expect(pessoa!.fotos).toHaveLength(1);
      expect(pessoa!.fotos[0].sourcePhotoId, "a cópia aponta para a foto original").toBeTruthy();
      expect(dados.people.some(item => item.id !== pessoa!.id && item.fotos.some(foto => foto.id === pessoa!.fotos[0].sourcePhotoId))).toBe(true);
    }, { timeout: 8000 });
  });
});

describe("telas removidas", () => {
  beforeEach(async () => { await seedIdb(seededData(4, 1)); });

  it("não oferece Quadro, Mapas mentais, Desafios nem Pacotes", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    expect(within(aside).queryByRole("button", { name: /Desafios/i })).toBeNull();

    const expandir = aside.querySelector<HTMLButtonElement>(".world-library .nav-expand");
    if (expandir) await act(async () => { expandir.click(); });
    for (const nome of [/Quadro/i, /Mapas mentais/i, /Pacotes/i]) {
      expect(within(aside).queryByRole("button", { name: nome }), `${nome} saiu do menu`).toBeNull();
    }
    // Dados antigos dessas telas continuam intactos no arquivo — nada é apagado.
    const dados = await lerDados();
    expect(Array.isArray(dados.investigationBoards)).toBe(true);
    expect(Array.isArray(dados.pacotes)).toBe(true);
    expect(getDefaultPerson().perfisSociais).toEqual([]);
  });
});
