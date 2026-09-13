import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootApp, openCatalog, seededData, seedIdb } from "./catalog.test";
import { configureSound, playSound, soundPlayCount, soundSettings } from "../src/lib/sound";
import { appointmentsToIcs } from "../src/lib/ics";
import { comparePeople, emptyData, getDefaultPerson, normalizeData } from "../src/store";
import { personTimeline } from "../src/lib/stats";

async function goto(label: RegExp) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  const button = within(aside).getByRole("button", { name: label }) as HTMLElement;
  await act(async () => { button.click(); });
}
async function settle(ms = 40) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }

/** Um AudioContext de mentira: grava o que foi criado sem tocar nada. */
function installFakeAudio() {
  const created: string[] = [];
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
  const node = (kind: string) => { created.push(kind); return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: param(), gain: param(), Q: param(), type: "sine", buffer: null }; };
  class FakeAudioContext {
    state = "running"; currentTime = 0; sampleRate = 8000; destination = {};
    createOscillator() { return node("osc"); }
    createGain() { return node("gain"); }
    createBiquadFilter() { return node("filter"); }
    createBufferSource() { return node("source"); }
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { return Promise.resolve(); }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: FakeAudioContext });
  return created;
}

describe("sons gerados por código", () => {
  afterEach(() => { delete (window as unknown as { AudioContext?: unknown }).AudioContext; configureSound({ enabled: true, muted: false }); });

  it("toca quando permitido e fica mudo quando desligado ou em disfarce", () => {
    const created = installFakeAudio();
    configureSound({ enabled: true, muted: false, volume: 0.5 });
    const before = soundPlayCount();
    expect(playSound("pop")).toBe(true);
    expect(soundPlayCount()).toBe(before + 1);
    expect(created.some(kind => kind === "osc")).toBe(true);

    configureSound({ enabled: false });
    expect(playSound("like")).toBe(false);
    configureSound({ enabled: true, muted: true });
    expect(playSound("achievement")).toBe(false);
    expect(soundPlayCount()).toBe(before + 1);
    // Pânico/PIN errado pode forçar mesmo mudo (o aviso é para quem está na frente da tela).
    expect(playSound("error", true)).toBe(true);
    expect(soundSettings().muted).toBe(true);
  });

  it("não quebra sem Web Audio (jsdom puro)", () => {
    configureSound({ enabled: true, muted: false });
    expect(playSound("levelup")).toBe(false);
  });
});

describe("dados e regras novas", () => {
  it("normaliza as preferências novas com som ligado por padrão", () => {
    const data = normalizeData({ ...emptyData(), settings: { ...emptyData().settings, sounds: undefined, soundVolume: 300 } } as unknown);
    expect(data.settings.sounds).toBe(true);
    expect(data.settings.soundVolume).toBe(100);
    expect(data.settings.confetti).toBe(true);
    expect(data.progress.celebrated).toEqual({});
    const quiet = normalizeData({ ...emptyData(), settings: { ...emptyData().settings, sounds: false } } as unknown);
    expect(quiet.settings.sounds).toBe(false);
  });

  it("ordena por completude, idade, última interação e aniversário; fixadas vêm antes", () => {
    const a = { ...getDefaultPerson(), id: "a", nome: "Ana", idade: 30, ultimoVisto: "2024-01-01", createdAt: "2024-01-01T00:00:00.000Z" };
    const b = { ...getDefaultPerson(), id: "b", nome: "Bia", idade: 22, ultimoVisto: "2025-01-01", descricao: "x", tags: ["t"], createdAt: "2024-02-01T00:00:00.000Z" };
    expect(comparePeople(a, b, "age")).toBeGreaterThan(0);
    expect(comparePeople(a, b, "lastSeen")).toBeLessThan(0);
    expect(comparePeople(a, b, "completeness")).toBeLessThan(0);
    expect(comparePeople(a, b, "name")).toBeLessThan(0);
    expect(comparePeople(a, b, "birthday")).toBe(comparePeople(a, b, "name"));
  });

  it("monta a linha do tempo da pessoa em ordem cronológica inversa", () => {
    const data = emptyData();
    const person = { ...getDefaultPerson(), id: "p1", nome: "Lua", createdAt: "2024-01-01T10:00:00.000Z", viHojeDates: ["2024-03-01", "2024-03-01"], fotos: [{ id: "f1", url: "data:image/webp;base64,AAAA", personId: "p1", isMain: true, type: "normal" as const, createdAt: "2024-02-01T10:00:00.000Z" }] };
    data.people.push(person);
    data.appointments.push({ id: "ap1", personId: "p1", title: "Café", date: "2024-04-01", time: "18:00", place: "Praça", notes: "", durationMinutes: 45, status: "realizado", createdAt: "2024-03-20T00:00:00.000Z" });
    const events = personTimeline(person, data);
    expect(events.map(event => event.kind)).toEqual(["encontro", "interacao", "foto", "cadastro"]);
    expect(events[1].title).toMatch(/2 interações/);
  });

  it("exporta compromissos em .ics válido", () => {
    const data = emptyData();
    data.people.push({ ...getDefaultPerson(), id: "p1", nome: "Lua" });
    const ics = appointmentsToIcs([{ id: "ap1", personId: "p1", title: "Café, depois cinema", date: "2025-05-10", time: "18:30", place: "Shopping", notes: "Levar guarda-chuva", durationMinutes: 90, status: "agendado", createdAt: "2025-05-01T00:00:00.000Z" }], data);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20250510T183000");
    expect(ics).toContain("DTEND:20250510T200000");
    expect(ics).toContain("SUMMARY:Café\\, depois cinema · com Lua");
    expect(ics).toContain("LOCATION:Shopping");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
});

describe("telas com as novidades", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("ajustes têm o controle de sons e o painel mostra roleta, desafios e aniversários", async () => {
    const user = userEvent.setup();
    await bootApp(user);

    await goto(/Ajustes/i);
    const appearance = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(b => /Aparência/i.test(b.textContent || ""));
    expect(appearance, "aba Aparência").toBeTruthy();
    await act(async () => { appearance!.click(); });
    const soundToggle = await screen.findByLabelText(/Sons de interface/i);
    expect(soundToggle).toBeChecked();
    await act(async () => { soundToggle.click(); });
    await waitFor(() => expect(screen.getByLabelText(/Sons de interface/i)).not.toBeChecked());
    expect(screen.getByLabelText(/Volume dos sons/i)).toBeDisabled();

    await goto(/Painel/i);
    await waitFor(() => expect(document.querySelector(".dashboard-page")).toBeTruthy());
    expect(document.querySelectorAll(".level-challenges li").length).toBe(6);
    expect(screen.getByText(/Aniversários e revisitas/i)).toBeInTheDocument();
    const roulette = screen.getByRole("button", { name: /^Roleta$/i });
    await act(async () => { roulette.click(); });
    await waitFor(() => expect(document.querySelector(".roulette-stage")).toBeTruthy());
    await waitFor(() => expect(document.querySelector(".roulette-stage.stopped")).toBeTruthy(), { timeout: 8000 });
    expect(screen.getByRole("button", { name: /Abrir ficha/i })).toBeEnabled();
    await act(async () => { screen.getByRole("button", { name: /Abrir ficha/i }).click(); });
    await waitFor(() => expect(document.querySelector(".person-drawer")).toBeTruthy());
  });

  it("fixa uma ficha no topo, mostra a linha do tempo e novas ordenações", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    await settle(450); // a transição de página remonta o catálogo logo depois de aparecer
    const sort = screen.getByLabelText(/Ordenar resultados/i) as HTMLSelectElement;
    expect([...sort.options].map(option => option.value)).toEqual(expect.arrayContaining(["completeness", "age", "lastSeen", "birthday"]));

    const cards = document.querySelectorAll<HTMLElement>(".person-card");
    const lastCard = cards[cards.length - 1];
    const lastName = lastCard.querySelector("h3")?.textContent || "";
    const menuButton = within(lastCard).getByRole("button", { name: /Ações de/i });
    await act(async () => { menuButton.click(); });
    const pin = await screen.findByRole("button", { name: /Fixar no topo/i });
    await act(async () => { pin.click(); });
    await waitFor(() => expect(document.querySelector(".person-card.is-pinned h3")?.textContent).toBe(lastName));
    expect(document.querySelector(".person-card")?.classList.contains("is-pinned")).toBe(true);

    await act(async () => { (document.querySelector(".person-card.is-pinned h3")!.parentElement as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".person-drawer")).toBeTruthy());
    const timelineTab = screen.getByRole("button", { name: /Linha do tempo/i });
    await act(async () => { timelineTab.click(); });
    await waitFor(() => expect(document.querySelector(".person-timeline")).toBeTruthy());
    expect(within(document.querySelector(".person-timeline") as HTMLElement).getByText(/Ficha criada/i)).toBeInTheDocument();
    expect(document.querySelectorAll(".person-timeline li").length).toBeGreaterThanOrEqual(2); // cadastro + foto principal
  });

  it("limpa a lixeira automaticamente quando o prazo dos ajustes venceu", async () => {
    const data = seededData(30, 1);
    const old = new Date(Date.now() - 40 * 86400000).toISOString();
    data.people.forEach((person, index) => { if (index % 5 === 0) person.deletedAt = old; else person.deletedAt = null; });
    const expired = data.people.filter(p => p.deletedAt).length;
    expect(expired).toBeGreaterThan(0);
    data.settings.trashAutoCleanDays = 30;
    await seedIdb(data);
    const user = userEvent.setup();
    await bootApp(user);
    await settle(200);
    await openCatalog();
    const trashTab = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(b => /Lixeira/i.test(b.textContent || ""));
    expect(trashTab!.querySelector("span")?.textContent).toBe("0");
    const gallery = [...document.querySelectorAll<HTMLElement>(".sidebar button")].find(b => /Galeria/i.test(b.textContent || ""));
    await act(async () => { gallery!.click(); });
    await waitFor(() => expect(document.querySelector(".gallery-page")).toBeTruthy());
    // As fotos das fichas removidas viraram avulsas: a galeria continua com todas (demo + fichas de teste).
    const total = data.people.reduce((sum, person) => sum + person.fotos.length, 0) + data.orphanPhotos.length;
    expect(screen.getByText(new RegExp(`^${total} fotos$`))).toBeInTheDocument();
  });
});
