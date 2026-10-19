import { describe, expect, it } from "vitest";
import { seededData } from "./catalog.test";
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
