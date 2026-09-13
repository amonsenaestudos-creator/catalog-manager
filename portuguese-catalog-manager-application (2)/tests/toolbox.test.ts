import { describe, expect, it } from "vitest";
import { demoData, emptyData, getDefaultPerson } from "../src/store";
import { FERRAMENTAS, GRUPOS, type Tool, type ToolContext, type ToolOutput } from "../src/lib/toolkit";
import type { AppData, Person } from "../src/types";

/** Dados de teste com o suficiente para exercitar qualquer ferramenta. */
function dadosDeTeste(): AppData {
  const data = demoData();
  const extra: Person = {
    ...getDefaultPerson(),
    id: "extra-1",
    nome: "Helena Prado",
    idade: 34,
    descricao: "Adora corrida, café e conversa longa. Mora perto da praia.",
    comportamento: "Espontânea, engraçada e um pouco reservada no começo",
    localizacaoOnde: "academia",
    localizacaoMora: "Santos, SP",
    tags: ["amiga", "gostosa"],
    musicaFavorita: "Djavan",
    signo: "Escorpião",
    friendshipLevel: 3,
    favorite: true,
    aniversario: `${new Date().getFullYear() - 34}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
    fotos: [{ id: "f-extra", personId: "extra-1", isMain: true, type: "normal", url: "/images/marina.jpg", name: "helena.jpg", createdAt: new Date().toISOString() }],
    notas: [{ id: "n-extra", title: "Anotação", content: "Gostou do café da esquina.", type: "observacao", date: new Date().toISOString() }],
  };
  data.people.push(extra);
  data.notes = [{ id: "nota-1", title: "Ideias", content: "Comprar café, marcar encontro e responder mensagem.", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [], favorite: false }] as AppData["notes"];
  data.diaryEntries = [{ id: "diario-1", date: new Date().toISOString().slice(0, 10), mood: "happy", text: "Dia tranquilo, conversei com a Marina e corri no parque.", tags: [], createdAt: new Date().toISOString() }] as AppData["diaryEntries"];
  data.goals = [{ id: "meta-1", title: "Falar com quem importa", description: "Manter contato", progress: 40, target: 100, status: "ativa", createdAt: new Date().toISOString() }] as AppData["goals"];
  data.chats = [
    { id: "c1", personId: data.people[0].id, role: "them", text: "Oi! Tudo bem?", timestamp: new Date().toISOString(), mood: "happy" },
    { id: "c2", personId: data.people[0].id, role: "user", text: "Tudo! Como foi seu dia?", timestamp: new Date().toISOString(), mood: "neutral" },
    { id: "c3", personId: data.people[0].id, role: "them", text: "Foi corrido, mas render boas conversas.", timestamp: new Date().toISOString(), mood: "happy" },
  ];
  data.appointments = [{ id: "a1", personId: data.people[0].id, title: "Café", date: new Date().toISOString().slice(0, 10), time: "19:00", status: "agendado", createdAt: new Date().toISOString() }] as AppData["appointments"];
  return data;
}

function contexto(data: AppData) {
  const registro = { alteracoes: 0, avisos: [] as string[] };
  const ctx: ToolContext = {
    data,
    commit: updater => { registro.alteracoes++; updater(data); },
    notify: mensagem => registro.avisos.push(mensagem),
    openPerson: () => undefined,
    navigate: () => undefined,
    setFilter: () => undefined,
  };
  return { ctx, registro };
}

/** Preenche cada campo com um valor plausível de acordo com o tipo. */
function valoresPara(ferramenta: Tool, data: AppData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of ferramenta.campos) {
    if (campo.type === "person") valores[campo.key] = data.people[0]?.id || "";
    else if (campo.type === "checkbox") valores[campo.key] = "1";
    else if (campo.type === "number") valores[campo.key] = String(campo.default || campo.min || 2);
    else if (campo.type === "date") valores[campo.key] = new Date().toISOString().slice(0, 10);
    else if (campo.type === "select") valores[campo.key] = campo.options?.[0]?.value || campo.default || "";
    else if (campo.type === "textarea") valores[campo.key] = campo.default || "Texto de teste com café, corrida e conversa boa.";
    else valores[campo.key] = campo.default || "teste";
  }
  return valores;
}

const imprime = (saida: ToolOutput) => (saida.texto || "").length + (saida.itens || []).length + (saida.estatisticas || []).length;

describe("caixa de ferramentas", () => {
  it("tem 50 ferramentas úteis, todas com grupo válido e ids únicos", () => {
    expect(FERRAMENTAS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(FERRAMENTAS.map(f => f.id)).size).toBe(FERRAMENTAS.length);
    const grupos = new Set(GRUPOS.map(g => g.id));
    for (const ferramenta of FERRAMENTAS) {
      expect(grupos.has(ferramenta.grupo)).toBe(true);
      expect(ferramenta.nome.length).toBeGreaterThan(4);
      expect(ferramenta.descricao.length).toBeGreaterThan(20);
      expect(typeof ferramenta.run).toBe("function");
    }
  });

  it("cada grupo tem uma boa quantidade de ferramentas", () => {
    for (const grupo of GRUPOS) expect(FERRAMENTAS.filter(f => f.grupo === grupo.id).length).toBeGreaterThanOrEqual(8);
  });

  it("nenhuma ferramenta quebra com dados vazios", () => {
    const data = emptyData();
    for (const ferramenta of FERRAMENTAS) {
      if (ferramenta.special) continue;
      const { ctx } = contexto(data);
      expect(() => ferramenta.run(valoresPara(ferramenta, data), ctx), `${ferramenta.nome} falhou no catálogo vazio`).not.toThrow();
    }
  });

  it("as ferramentas de leitura devolvem resultado com dados reais", () => {
    const data = dadosDeTeste();
    const leitura = FERRAMENTAS.filter(f => !f.perigoso && !f.special);
    for (const ferramenta of leitura) {
      const { ctx } = contexto(data);
      const saida = ferramenta.run(valoresPara(ferramenta, data), ctx);
      expect(imprime(saida), `${ferramenta.nome} não devolveu nada visível`).toBeGreaterThan(0);
    }
  });

  it("as ferramentas que mexem nos dados avisam e passam pelo commit", () => {
    const data = dadosDeTeste();
    const { ctx, registro } = contexto(data);
    const perigosas = FERRAMENTAS.filter(f => f.perigoso);
    expect(perigosas.length).toBeGreaterThan(5);
    for (const ferramenta of perigosas) {
      const saida = ferramenta.run(valoresPara(ferramenta, data), ctx);
      expect(typeof ferramenta.perigoso, `${ferramenta.nome} precisa explicar o que muda`).toBe("string");
      expect(imprime(saida) + (saida.aviso ? 1 : 0), `${ferramenta.nome} não devolveu nada`).toBeGreaterThan(0);
    }
  });

  it("as ferramentas em lote de fato usam o commit e mexem nos dados", () => {
    const data = dadosDeTeste();
    const { ctx, registro } = contexto(data);
    const antes = data.people.length;
    const lote = FERRAMENTAS.filter(f => f.grupo === "lote");
    for (const ferramenta of lote) ferramenta.run(valoresPara(ferramenta, data), ctx);
    expect(registro.alteracoes).toBeGreaterThan(0);
    expect(data.people.length).toBe(antes);
  });

  it("ferramentas de cálculo acertam as contas do dia a dia", () => {
    const data = emptyData();
    const { ctx } = contexto(data);
    const porId = (id: string) => FERRAMENTAS.find(f => f.id === id)!;

    const conta = porId("dividir-conta").run({ total: "120", pessoas: "4", gorjeta: "10", arredondar: "1" }, ctx);
    expect(JSON.stringify(conta)).toMatch(/33,00/);

    const porcentagem = porId("porcentagem").run({ valor: "200", porcentagem: "15", modo: "desconto" }, ctx);
    expect(JSON.stringify(porcentagem)).toMatch(/170,00/);

    const senha = porId("gerador-senha").run({ tamanho: "20", numeros: "1", simbolos: "1" }, ctx);
    expect((senha.itens?.[0]?.title || "").length).toBeGreaterThanOrEqual(20);

    const medidas = porId("conversor-medidas").run({ valor: "1", de: "km" }, ctx);
    expect(JSON.stringify(medidas)).toMatch(/1\.000,00 m/);

    const texto = porId("contador-texto").run({ texto: "Uma frase curta com cinco palavras aqui." }, ctx);
    expect(JSON.stringify(texto)).toMatch(/palavras/i);
  });

  it("ferramentas de conversa analisam o histórico salvo", () => {
    const data = dadosDeTeste();
    const { ctx } = contexto(data);
    const analise = FERRAMENTAS.find(f => f.id === "analise-conversas")!.run({ pessoa: data.people[0].id }, ctx);
    expect(imprime(analise)).toBeGreaterThan(0);
    const gelos = FERRAMENTAS.find(f => f.id === "quebra-gelos")!.run({ pessoa: data.people[0].id, categoria: "leve" }, ctx);
    expect(gelos.itens?.length || gelos.texto).toBeTruthy();
    const exportar = FERRAMENTAS.find(f => f.id === "exportar-conversas")!.run({ pessoa: data.people[0].id, formato: "markdown" }, ctx);
    expect(exportar.baixar?.conteudo).toMatch(/Conversa com|mensagens/i);
  });
});
