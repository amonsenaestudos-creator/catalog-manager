import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { demoData, getDefaultPerson } from "../src/store";
import type { AppData, Person } from "../src/types";

export function fakePhoto(kb = 15) {
  return `data:image/webp;base64,${"A".repeat(Math.round(kb * 1024))}`;
}

export function seededData(count = 120, photosPerPerson = 3): AppData {
  const data = demoData();
  const base = data.people[0];
  for (let i = 0; i < count; i++) {
    const p: Person = structuredClone(getDefaultPerson());
    p.id = `seed-${i}`;
    p.nome = `Pessoa Teste ${String(i).padStart(3, "0")}`;
    p.descricao = "Ficha criada para o teste de desempenho do catálogo.";
    p.localizacaoOnde = i % 3 === 0 ? "escola" : i % 3 === 1 ? "igreja" : "comunidade";
    p.localizacaoMora = `Bairro ${i % 7}, São Paulo`;
    p.tags = ["amiga", i % 2 ? "crush" : "conhecida"];
    p.rating = { ...base.rating, rosto: 4, belezaGeral: 4, cabelo: 3 };
    p.favorite = i % 4 === 0;
    p.archivedAt = i % 11 === 0 ? new Date().toISOString() : null;
    p.deletedAt = i % 17 === 0 ? new Date().toISOString() : null;
    p.fotos = Array.from({ length: photosPerPerson }, (_, index) => ({
      id: `${p.id}-foto-${index}`, url: fakePhoto(), personId: p.id, isMain: index === 0,
      type: "normal" as const, name: `foto-${i}-${index}.webp`, createdAt: new Date().toISOString(),
    }));
    data.people.push(p);
  }
  return data;
}

/** O catálogo real guarda as fotos no IndexedDB, não no localStorage. */
export async function seedIdb(data: AppData) {
  localStorage.clear();
  sessionStorage.clear();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("catalog-local-v3", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("data", "readwrite");
    tx.objectStore("data").put(data, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function bootApp(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await waitFor(() => expect(screen.getByText(/Entrar no meu catálogo/i)).toBeInTheDocument(), { timeout: 20000 });
  await user.type(screen.getByLabelText(/^Senha$/i), "admin");
  await user.click(screen.getByRole("button", { name: /Entrar no meu catálogo/i }));
  await waitFor(() => expect(document.querySelector(".sidebar")).toBeTruthy(), { timeout: 20000 });
  // A tela de abertura é uma novidade: clique nela para entrar de verdade.
  const splash = document.querySelector(".splash-screen");
  if (splash) await act(async () => { (splash as HTMLElement).click(); });
  await waitFor(() => expect(document.querySelector(".splash-screen")).toBeNull(), { timeout: 20000 });
}

export async function openCatalog() {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  await act(async () => { (within(aside).getByRole("button", { name: /Catálogo/i }) as HTMLElement).click(); });
  await waitFor(() => expect(document.querySelectorAll(".person-card").length).toBeGreaterThan(0), { timeout: 20000 });
}

describe("catálogo com arquivos já existentes", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("mostra o conteúdo de cada aba", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();

    const tabs = () => [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")];
    const cardCount = () => document.querySelectorAll(".person-card").length;
    const expectTab = async (label: RegExp) => {
      const tab = tabs().find(t => label.test(t.textContent || ""));
      expect(tab, `aba ${label} precisa existir`).toBeTruthy();
      const badge = Number(tab!.querySelector("span")?.textContent);
      await act(async () => { tab!.click(); });
      // A lista é paginada (24 por página): siga carregando até chegar ao total da aba.
      await waitFor(() => expect(cardCount()).toBeGreaterThan(0), { timeout: 20000 });
      for (let guard = 0; guard < 40 && cardCount() < badge; guard++) {
        const more = [...document.querySelectorAll<HTMLButtonElement>(".load-more button")][0];
        expect(more, "botão Mostrar mais precisa existir enquanto houver fichas").toBeTruthy();
        await act(async () => { more!.click(); });
      }
      await waitFor(() => expect(cardCount()).toBe(badge), { timeout: 20000 });
      expect(tab!.className).toContain("active");
      return badge;
    };
    expect(tabs().length).toBeGreaterThanOrEqual(4);
    const all = await expectTab(/Todas as pessoas/);
    expect(all).toBeGreaterThan(100);
    await expectTab(/Favoritos/);
    await expectTab(/Arquivadas/);
    await expectTab(/Lixeira/);
  });

  it("não serializa o catálogo inteiro a cada tecla digitada", async () => {
    const user = userEvent.setup();
    const sizes: number[] = [];
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      sizes.push(value.length);
      return original.call(this, key, value);
    });
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Adicionar pessoa/i }) as HTMLElement).click(); });
    const name = await screen.findByLabelText(/^Nome \*$/i);
    sizes.length = 0;
    await user.type(name, "Uma pessoa nova");
    const heavy = sizes.filter(size => size > 1_000_000);
    spy.mockRestore();
    expect(heavy.length, `escritas acima de 1 MB durante a digitação: ${heavy.length}`).toBe(0);
  });

  it("não bloqueia o fechamento da aba quando o catálogo é grande", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Adicionar pessoa/i }) as HTMLElement).click(); });
    const name = await screen.findByLabelText(/^Nome \*$/i);
    await user.type(name, "Uma pessoa nova");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
