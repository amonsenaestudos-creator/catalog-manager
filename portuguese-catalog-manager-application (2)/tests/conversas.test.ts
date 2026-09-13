import { describe, expect, it } from "vitest";
import { emptyData, getDefaultPerson } from "../src/store";
import { analisarRelacao, motivoDoLimite, redeFamiliar } from "../src/lib/relacao";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { estadoDe, novoChatState, planDoNada, planOpening, planReply, tonsDisponiveis } from "../src/lib/dialogue";
import { importarPacote, lerPacote, montarPacote, nomeDoArquivo } from "../src/lib/pack";
import type { Person, Vinculo } from "../src/types";

function ficha(over: Partial<Person> = {}): Person {
  return {
    ...getDefaultPerson(),
    id: "p1",
    nome: "Marina Costa",
    idade: 36,
    descricao: "Vizinha da igreja, sempre animada.",
    comportamento: "Brincalhona, direta e cuida de todo mundo.",
    localizacaoOnde: "igreja",
    tags: ["amiga"],
    friendshipLevel: 3,
    ...over,
  };
}

const vinculo = (personId: string, papel: Vinculo["papel"] = "filha"): Vinculo => ({ id: `v-${personId}`, personId, papel });

describe("idade, tia e criança", () => {
  it("com 20 anos de diferença ela te trata como criança e o romance fecha", () => {
    const relacao = analisarRelacao(ficha({ idade: 36 }), [], { ownerAge: 14, ownerBirthday: null });
    expect(relacao.veCrianca).toBe(true);
    expect(relacao.dinamica).toBe("crianca");
    expect(relacao.flertePermitido).toBe(false);
    expect(relacao.adultoPermitido).toBe(false);
    expect(relacao.tratamento).toContain("menino");
    expect(relacao.descricao).toMatch(/criança/i);
    expect(motivoDoLimite(relacao)).toMatch(/criança/i);
  });

  it("acima de 35 anos mantém o jeito de tia, e dois adultos podem esquentar o papo", () => {
    const relacao = analisarRelacao(ficha({ idade: 40 }), [], { ownerAge: 30, ownerBirthday: null });
    expect(relacao.ehTia).toBe(true);
    expect(relacao.rotulo).toMatch(/tia/i);
    expect(relacao.tratamento).toContain("meu bem");
    // Regra nova: com os dois lados adultos, a idade dela não barra mais o clima.
    expect(relacao.ambosAdultos).toBe(true);
    expect(relacao.adultoPermitido).toBe(true);
  });

  it("dois adultos com 20 anos de diferença não viram criança: o clima sobe pela química", () => {
    const pessoa = ficha({ idade: 45 });
    const relacao = analisarRelacao(pessoa, [pessoa], { ownerAge: 25, ownerBirthday: null });
    expect(relacao.veCrianca).toBe(false);
    expect(relacao.euMenor).toBe(false);
    expect(relacao.dinamica).toBe("mais-velha");
    expect(relacao.rotulo).not.toMatch(/criança/i);
    expect(relacao.descricao).toMatch(/diferença grande de idade/i);
    expect(relacao.adultoPermitido).toBe(true);

    const persona = buildPersona(pessoa, { people: [pessoa], settings: { ownerAge: 25 } });
    const estado = { ...novoChatState(pessoa), afinidade: 90 };
    const tons = tonsDisponiveis(persona, estado, true, relacao);
    expect(tons.find(tom => tom.id === "provocante")?.ok).toBe(true);
    expect(tons.find(tom => tom.id === "intenso")?.ok).toBe(true);

    const plano = planReply({
      person: pessoa, persona, state: estado, message: "Você é gostosa, queria te ver hoje", tom: "provocante",
      adulto: true, relacao, rand: seededRandom(5),
    });
    expect(plano.desviado).toBe(false);
    expect(plano.tom).toBe("provocante");
    const fala = plano.bolhas.map(bolha => bolha.texto).join(" ");
    expect(fala).not.toMatch(/menino|criança|garoto|meu filho/i);
  });

  it("com você menor de idade a conversa nunca escala, nem com química alta", () => {
    const pessoa = ficha({ idade: 22 });
    const relacao = analisarRelacao(pessoa, [pessoa], { ownerAge: 16, ownerBirthday: null });
    expect(relacao.euMenor).toBe(true);
    expect(relacao.flertePermitido).toBe(false);
    expect(relacao.adultoPermitido).toBe(false);
    expect(motivoDoLimite(relacao)).toMatch(/menor de idade/i);

    const persona = buildPersona(pessoa, { people: [pessoa], settings: { ownerAge: 16 } });
    const estado = { ...novoChatState(pessoa), afinidade: 95 };
    const tons = tonsDisponiveis(persona, estado, true, relacao);
    expect(tons.filter(tom => tom.id !== "amizade").every(tom => !tom.ok)).toBe(true);

    const plano = planReply({
      person: pessoa, persona, state: estado, message: "Você é gostosa, queria te ver hoje",
      adulto: true, relacao, rand: seededRandom(7),
    });
    expect(plano.tom).toBe("amizade");
    expect(plano.desviado).toBe(true);
    const fala = plano.bolhas.map(bolha => bolha.texto).join(" ");
    expect(fala).not.toMatch(/gostosa|tesão|sexo|pelada|😏/i);
  });

  it("sem idade informada a conversa fica neutra, mas sem clima adulto", () => {
    const relacao = analisarRelacao(ficha({ idade: 24 }), [], { ownerAge: null, ownerBirthday: null });
    expect(relacao.minhaIdade).toBeNull();
    expect(relacao.dinamica).toBe("sem-idade");
    expect(relacao.descricao).toMatch(/informe sua idade/i);
    expect(relacao.flertePermitido).toBe(true);
  });

  it("a idade pode vir do aniversário do dono", () => {
    const ano = new Date().getFullYear() - 30;
    const relacao = analisarRelacao(ficha({ idade: 32 }), [], { ownerAge: null, ownerBirthday: `${ano}-01-05` });
    expect(relacao.minhaIdade).toBe(30);
    expect(relacao.diferenca).toBe(2);
  });

  it("ficha de 18+ com química pode flertar, mas a criança recebe limite em todos os tons", () => {
    const persona = buildPersona(ficha({ idade: 36 }));
    const estado = { ...novoChatState(ficha()), afinidade: 95 };
    const crianca = analisarRelacao(ficha({ idade: 36 }), [], { ownerAge: 14, ownerBirthday: null });
    const tons = tonsDisponiveis(persona, estado, true, crianca);
    expect(tons.filter(tom => tom.id !== "amizade").every(tom => !tom.ok)).toBe(true);
    expect(tons[0].ok).toBe(true);
  });

  it("a conversa com criança não devolve flerte nem conteúdo adulto", () => {
    const pessoa = ficha({ idade: 38 });
    const relacao = analisarRelacao(pessoa, [], { ownerAge: 13, ownerBirthday: null });
    const persona = buildPersona(pessoa, { people: [pessoa], settings: { ownerAge: 13 } });
    const estado = { ...novoChatState(pessoa), afinidade: 90 };
    const plano = planReply({
      person: pessoa, persona, state: estado, message: "Você é linda, quando a gente sai?", adulto: true,
      relacao, rand: seededRandom(11),
    });
    expect(plano.tom).toBe("amizade");
    expect(plano.desviado).toBe(true);
    const fala = plano.bolhas.map(bolha => bolha.texto).join(" ");
    expect(fala).toMatch(/menino|filho|criança|garoto|novinho|tia|respeito/i);
    expect(fala).not.toMatch(/gostosa|tesão|sexo|pelada|😏/i);
  });
});

describe("família na conversa", () => {
  const mae = ficha({ id: "m1", nome: "Dona Célia", idade: 62, vinculoComigo: "" });
  const filha = ficha({ id: "f1", nome: "Ana Costa", idade: 12, localizacaoOnde: "escola" });
  const marina = ficha({ id: "p1", vinculos: [vinculo("m1", "mae"), vinculo("f1", "filha")] });

  it("os vínculos aparecem com nome e papel", () => {
    const familiares = redeFamiliar(marina, [marina, mae, filha]);
    expect(familiares.map(item => `${item.papel}:${item.nome}`)).toContain("mãe:Dona");
    expect(familiares.map(item => `${item.papel}:${item.nome}`)).toContain("filha:Ana");
  });

  it("a Ana vê o vínculo de volta como mãe, sem cadastrar os dois lados", () => {
    const familiares = redeFamiliar(filha, [marina, mae, filha]);
    expect(familiares.some(item => item.nome === "Marina" && /mãe/i.test(item.papel))).toBe(true);
  });

  it("perguntar da filha responde com o nome dela", () => {
    const pessoas = [marina, mae, filha];
    const persona = buildPersona(marina, { people: pessoas, settings: { ownerAge: 30 } });
    const estado = { ...novoChatState(marina), afinidade: 60 };
    const plano = planReply({ person: marina, persona, state: estado, message: "Como tá a sua filha?", pessoas, dono: { ownerAge: 30 }, rand: seededRandom(3) });
    expect(plano.bolhas.map(bolha => bolha.texto).join(" ")).toMatch(/Ana/i);
  });

  it("vínculo de família bloqueia flerte e conteúdo adulto", () => {
    const tia = ficha({ id: "t1", nome: "Tia Rosa", idade: 44, vinculoComigo: "tia" });
    const relacao = analisarRelacao(tia, [tia], { ownerAge: 30, ownerBirthday: null });
    expect(relacao.familiar).toBe(true);
    expect(relacao.flertePermitido).toBe(false);
    expect(relacao.adultoPermitido).toBe(false);
    expect(motivoDoLimite(relacao)).toMatch(/família/i);
  });

  it("a tia continua no jeito de falar sem tratar adulto como filho, e o clima cabe com química", () => {
    const pessoa = ficha({ idade: 44 });
    const persona = buildPersona(pessoa, { people: [pessoa], settings: { ownerAge: 25 } });
    const estado = { ...novoChatState(pessoa), afinidade: 70 };
    const abertura = planOpening({ person: pessoa, persona, state: estado, rand: seededRandom(5), agora: new Date(2026, 0, 10, 9) });
    expect(abertura.bolhas.length).toBeGreaterThan(0);
    const relacao = analisarRelacao(pessoa, [pessoa], { ownerAge: 25 });
    expect(relacao.ehTia).toBe(true);
    expect(relacao.tratamento).toContain("meu bem");
    expect(relacao.flertePermitido).toBe(true);
    expect(relacao.adultoPermitido).toBe(true);
    // Dois adultos: nenhum "meu filho" no vocabulário dela.
    expect(persona.fala.vocativos).not.toContain("meu filho");
  });
});

describe("mensagens que chegam do nada", () => {
  it("fala da igreja e de coisas que aconteceram sem você", () => {
    const pessoa = ficha({ idade: 30, localizacaoOnde: "igreja" });
    const persona = buildPersona(pessoa, { people: [pessoa], settings: { ownerAge: 25 } });
    const estado = novoChatState(pessoa);
    const textos = Array.from({ length: 30 }, (_, i) => planDoNada({ person: pessoa, persona, state: estado, rand: seededRandom(i + 1) }).bolhas.map(bolha => bolha.texto).join(" "));
    expect(textos.some(texto => /igreja|capela|ensaio|reunião|caderno|papel|mutirão|irmã/i.test(texto))).toBe(true);
    expect(textos.every(texto => texto.length > 5)).toBe(true);
  });

  it("a mensagem do nada também chega para trabalho e FSY", () => {
    const trabalho = ficha({ idade: 30, localizacaoOnde: "trabalho" });
    const fsy = ficha({ id: "p2", nome: "Duda Reis", idade: 26, localizacaoOnde: "fsy" });
    const textos = [
      [trabalho, "trabalho"], [fsy, "fsy"],
    ].flatMap(([pessoa, _], indice) => {
      const person = pessoa as Person;
      const persona = buildPersona(person, { people: [person], settings: { ownerAge: 25 } });
      return Array.from({ length: 20 }, (_, i) => planDoNada({ person, persona, state: novoChatState(person), rand: seededRandom(i + 1 + indice * 40) }).bolhas.map(bolha => bolha.texto).join(" "));
    });
    expect(textos.some(texto => /arquivo|reunião|caneca|café/i.test(texto))).toBe(true);
    expect(textos.some(texto => /FSY/i.test(texto))).toBe(true);
  });

  it("pode citar o familiar cadastrado pelo nome", () => {
    const filha = ficha({ id: "f1", nome: "Ana Costa", idade: 12 });
    const pessoa = ficha({ idade: 30, localizacaoOnde: "trabalho", vinculos: [vinculo("f1", "filha")] });
    const pessoas = [pessoa, filha];
    const persona = buildPersona(pessoa, { people: pessoas, settings: { ownerAge: 25 } });
    const textos = Array.from({ length: 8 }, (_, i) => planDoNada({ person: pessoa, persona, state: novoChatState(pessoa), rand: seededRandom(i + 1), pessoas, dono: { ownerAge: 25 } }).bolhas.map(bolha => bolha.texto).join(" "));
    expect(textos.some(texto => /Ana/i.test(texto))).toBe(true);
  });

  it("a mensagem do nada marca o evento e não muda o tom da conversa", () => {
    const pessoa = ficha({ idade: 30 });
    const persona = buildPersona(pessoa);
    const plano = planDoNada({ person: pessoa, persona, state: novoChatState(pessoa), rand: seededRandom(9) });
    expect(plano.eventos).toContain("espontanea");
    expect(plano.tom).toBe("amizade");
    expect(plano.state.afinidade).toBe(novoChatState(pessoa).afinidade);
  });
});

describe("pacote de categoria", () => {
  const base = emptyData();
  base.people = [
    ficha({ id: "a1", nome: "Marina Costa", localizacaoOnde: "igreja", idade: 36, tags: ["amiga", "crush"] }),
    ficha({ id: "a2", nome: "Bruna Lima", localizacaoOnde: "igreja", idade: 28, tags: ["amiga"] }),
    ficha({ id: "a3", nome: "Carla Souza", localizacaoOnde: "trabalho", idade: 33, tags: ["colega"] }),
  ];
  base.tierLists = [{ id: "t1", nome: "Igreja do ano", tiers: ["Top", "Meio"], items: [{ personId: "a1", tier: "Top" }], allowedCategories: ["igreja"], allowedSubcategories: ["todas"] }];

  it("exporta só a categoria escolhida, com tierlist e etiquetas", () => {
    const pacote = montarPacote(base, "igreja");
    expect(pacote.kind).toBe("catalog-categoria");
    expect(pacote.total).toBe(2);
    expect(pacote.pessoas.map(pessoa => pessoa.nome)).not.toContain("Carla Souza");
    expect(pacote.tierlist.tiers).toEqual(["Top", "Meio"]);
    expect(pacote.tierlist.itens).toHaveLength(1);
    expect(pacote.etiquetas).toContain("crush");
    expect(nomeDoArquivo(pacote)).toMatch(/^catalog-igreja-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("não deixa exportar categoria vazia", () => {
    expect(() => montarPacote(base, "academia")).toThrow(/nenhuma ficha/i);
  });

  it("volta do JSON e entra em outro perfil sem duplicar", () => {
    const texto = JSON.stringify(montarPacote(base, "igreja"));
    const pacote = lerPacote(JSON.parse(texto));
    const destino = emptyData();
    destino.people = [ficha({ id: "z1", nome: "Marina Costa", localizacaoOnde: "igreja", idade: 36 })];
    const { data: juntado, resumo } = importarPacote(destino, pacote);
    expect(resumo.reaproveitadas).toBe(1);
    expect(resumo.adicionadas).toBe(1);
    expect(juntado.people.filter(pessoa => pessoa.nome === "Marina Costa")).toHaveLength(1);
    expect(juntado.people.some(pessoa => pessoa.nome === "Bruna Lima")).toBe(true);
    const lista = juntado.tierLists.find(item => item.nome === pacote.tierlist.nome);
    expect(lista).toBeTruthy();
    expect(lista!.items).toHaveLength(1);
    expect(juntado.categories.some(categoria => categoria.value === "igreja")).toBe(true);
  });

  it("importar duas vezes não duplica fichas", () => {
    const pacote = lerPacote(JSON.parse(JSON.stringify(montarPacote(base, "igreja"))));
    const primeira = importarPacote(emptyData(), pacote);
    const segunda = importarPacote(primeira.data, pacote);
    expect(segunda.resumo.adicionadas).toBe(0);
    expect(segunda.resumo.reaproveitadas).toBe(2);
    expect(segunda.data.people).toHaveLength(2);
  });

  it("recusa arquivo que não é pacote", () => {
    expect(() => lerPacote({ kind: "outra-coisa", pessoas: [] })).toThrow(/pacote de categoria/i);
    expect(() => lerPacote(null)).toThrow(/pacote de categoria/i);
  });

  it("mantém as fotos que viajam dentro do JSON", () => {
    const comFoto = emptyData();
    const pessoa = ficha({ id: "b1", nome: "Duda Reis", localizacaoOnde: "igreja" });
    pessoa.fotos = [{ id: "foto-1", url: "data:image/webp;base64,QUJD", personId: "b1", isMain: true, type: "normal", name: "duda.webp", createdAt: new Date().toISOString() }];
    comFoto.people = [pessoa];
    const pacote = lerPacote(JSON.parse(JSON.stringify(montarPacote(comFoto, "igreja", { incluirFotos: true }))));
    expect(pacote.incluiFotos).toBe(true);
    const { data: juntado } = importarPacote(emptyData(), pacote);
    expect(juntado.people[0].fotos).toHaveLength(1);
  });
});

describe("estado da conversa continua estável", () => {
  it("o estado lido do catálogo é o mesmo do motor", () => {
    const pessoa = ficha();
    const data = emptyData();
    data.people = [pessoa];
    data.chatStates[pessoa.id] = { ...novoChatState(pessoa), afinidade: 66 };
    expect(estadoDe(data, pessoa).afinidade).toBe(66);
  });
});
