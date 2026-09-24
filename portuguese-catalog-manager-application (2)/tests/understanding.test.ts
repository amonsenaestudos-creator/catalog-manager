import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { novoChatState } from "../src/lib/dialogue";
import {
  corrigirPossivelErro, interpretarMensagem, juntarBolhas, normalizarMensagem,
  principalIntencao, resolverPronomes, extrairEntidades,
} from "../src/lib/dialogue/understanding";
import { processarResposta } from "../src/lib/dialogue/engine";
import type { Person } from "../src/types";

function ficha(over: Partial<Person> = {}): Person {
  return {
    ...getDefaultPerson(),
    id: "marina",
    nome: "Marina Costa",
    apelido: "Mari",
    idade: 34,
    descricao: "Gosta de fotografia e de café pela cidade.",
    comportamento: "Extrovertida, brincalhona e um pouco tímida no começo",
    localizacaoOnde: "trabalho",
    tags: ["amiga", "crush"],
    friendshipLevel: 3,
    ...over,
  };
}

function responder(mensagem: string, estado: Record<string, unknown> = {}, semente = 7) {
  const person = ficha();
  const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
  const plano = processarResposta({
    person, persona,
    state: { ...novoChatState(person), ...estado },
    message: mensagem,
    rand: seededRandom(semente),
    nomeUsuario: "Rafael", pessoas: [person], dono: { ownerAge: 30 }, adulto: true,
    abreviar: true, emojis: true,
  });
  return { plano, texto: plano.plano.bolhas.map(b => b.texto).join(" "), eventos: plano.plano.eventos };
}

describe("entendimento: o cérebro lê a mensagem antes de responder", () => {
  it("a mensagem original nunca é corrigida — a normalização é interna", () => {
    const interp = interpretarMensagem("vc viu oq aconteceu kkkk");
    expect(interp.raw).toBe("vc viu oq aconteceu kkkk");
    expect(interp.normalized).toContain("você viu o que aconteceu");
    expect(interp.slang).toContain("oq");
    expect(interp.slang).toContain("kkkk");
  });

  it("normalizador abre o dedo do celular sem catar palavras de braga", () => {
    expect(normalizarMensagem("vc vai hj?").texto).toBe("você vai hoje?");
    expect(normalizarMensagem("entt, to cansado").texto).toBe("então, estou cansado");
    expect(normalizarMensagem("pq vc n me chamado?").texto).toBe("por que você não me chamado?");
    expect(normalizarMensagem("vc fez isso pq?").texto).toBe("você fez isso por quê?");
    // "top" e "tipo" não são sinônimos — a lista de proteção impede o troque.
    expect(corrigirPossivelErro("tipo")).toBeNull();
    expect(normalizarMensagem("é tipo loucura").texto).toBe("é tipo loucura");
  });
});

describe("erros de digitação viram inferência, não 'não entendi'", () => {
  it("escoka ≈ escola, e a conversa segue", () => {
    const interp = interpretarMensagem("vc vai na escoka hj");
    expect(interp.erros).toEqual([{ original: "escoka", sugerido: "escola" }]);
    expect(interp.normalized).toBe("você vai na escola hoje");
    expect(interp.intent).toBe("pergunta_plano");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.45);
  });

  it("faze ≈ fazer", () => {
    const interp = interpretarMensagem("mano n sei oq faze");
    expect(interp.erros.map(e => e.sugerido)).toContain("fazer");
    expect(interp.normalized).toContain("não sei o que fazer");
    expect(interp.intent).toBe("pedir_ajuda");
  });

  it("palavra válida nunca é 'corrigida' (veio continua sendo veio)", () => {
    expect(corrigirPossivelErro("veio")).toBeNull();
    expect(corrigirPossivelErro("escola")).toBeNull();
  });

  it("mds vei não vira 'intenção desconhecida'", () => {
    const interp = interpretarMensagem("mds vei");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.45);
    expect(["expressar_emocao", "reacao_surpresa"]).toContain(interp.intent);
  });
});

describe("intensões de conversa real (a bateria)", () => {
  const casos: [string, string[]][] = [
    ["mano tu viu oq aconteceu KKKK", ["pergunta_evento"]],
    ["mds q vergonha", ["expressar_emocao"]],
    ["vc vai hj?", ["pergunta_plano"]],
    ["n sei nn", ["reacao_incerteza"]],
    ["fui na escola e dps voltei", ["compartilhar_evento"]],
    ["q isso KKKKK", ["reacao_surpresa"]],
    ["ataaaa entendi", ["reacao_concordancia"]],
    ["nnnnn", ["resposta_curta"]],
    ["sssss", ["resposta_curta"]],
    ["vish", ["reacao_surpresa"]],
    ["oxe", ["reacao_surpresa"]],
    ["KKKKKK", ["reacao_risada"]],
  ];

  for (const [entrada, esperados] of casos) {
    it(`"${entrada}" → ${esperados.join(" | ")}`, () => {
      const interp = interpretarMensagem(entrada);
      expect(esperados).toContain(interp.intent);
      expect(interp.certainty).toBeGreaterThanOrEqual(0.45);
    });
  }

  it("reações puras são marcadas como atos, não frases", () => {
    expect(interpretarMensagem("KKKKKK").reacaoPura).toBe(true);
    expect(interpretarMensagem("ataaaa entendi").reacaoPura).toBe(true);
    expect(interpretarMensagem("nnnnn").intent).toBe("resposta_curta");
    const sim = principalIntencao("sssss");
    expect(sim.resposta).toBe("sim");
    expect(principalIntencao("nnnnn").resposta).toBe("nao");
  });

  it("emoção lida: vergonha, risada, surpresa", () => {
    expect(interpretarMensagem("mds q vergonha").emotion).toBe("vergonha");
    expect(interpretarMensagem("KKKKKK").emotion).toBe("brincando");
    expect(interpretarMensagem("vish").emotion).toBe("surpresa");
  });
});

describe("tolerância a mensagens quebradas", () => {
  it("fio no ar: ela sabe que a história está incompleta", () => {
    const interp = interpretarMensagem("eu tava indo mas ai");
    expect(interp.unfinished).toBe(true);
    expect(interp.needsContinuation).toBe(true);
    expect(["compartilhar_evento", "contar_historia"]).toContain(interp.intent);
  });

  it("frase completa não parece interrompida", () => {
    const interp = interpretarMensagem("estou indo aí");
    expect(interp.unfinished).toBe(false);
    expect(interp.needsContinuation).toBe(false);
  });

  it("no motor: ela pede para continuar em vez de responder no vazio", () => {
    const { eventos } = responder("mano eu tava indo ai mas minha mae chamou e ai tipo");
    expect(eventos).toContain("entendimento:continuacao");
  });
});

describe("contexto corrige o significado", () => {
  it("'uma merda' depois da prova = a prova foi ruim", () => {
    const interp = interpretarMensagem("uma merda", {
      topicoAtual: "prova",
      perguntaAberta: { tema: "prova", texto: "e como foi?" },
      ultimasSuas: ["fiz a prova hj"],
    });
    expect(interp.desambiguacao?.sentimento).toBe("negativo");
    expect(interp.topic).toBe("prova");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.45);
  });

  it("sem o contexto do assunto, 'uma merda' não vira veredito sobre ele", () => {
    const interp = interpretarMensagem("uma merda", { topicoAtual: "dia" });
    // "o dia a dia" não é assunto que uma expressão assim descreve
    expect(interp.desambiguacao).toBeUndefined();
  });

  it("no motor: contexto explica → ela segue o fio, sem perguntar o que a palavra quis dizer", () => {
    const { eventos, texto } = responder("uma merda", {
      topicoAtual: "prova",
      perguntaAberta: { tema: "prova", texto: "e como foi?" },
    });
    expect(eventos).toContain("entendimento:contexto");
    expect(texto).not.toMatch(/não entendi|não compreendi|não peguei/i);
  });
});

describe("pronomes consultam o contexto recente", () => {
  it("'ele' aponta para os nomes em jogo, com probabilidade honesta", () => {
    const interp = interpretarMensagem("ele ficou puto", { pessoas: ["Pedro", "João"] });
    expect(interp.pronome?.pronome).toBe("ele");
    expect(interp.pronome?.candidatos).toEqual(["Pedro", "João"]);
    expect(interp.pronome?.provavel).toBe("João");
    expect(interp.pronome?.probabilidade).toBeGreaterThan(0.4);
  });

  it("extrai nomes próprios sem confundir com inícios de frase", () => {
    const entidades = extrairEntidades(["Pedro brigou com João ontem"]);
    const nomes = entidades.map(e => e.nome);
    expect(nomes).toContain("Pedro");
    expect(nomes).toContain("João");
    expect(nomes).not.toContain("Ontem");
    expect(resolverPronomes("ele chegou depois", entidades)?.provavel).toBe("João");
  });
});

describe("mensagens em sequência são uma conversação", () => {
  it("bolhas curtas seguidas são lidas juntas", () => {
    const { texto } = juntarBolhas("KKKKKK", ["mano", "tu não sabe", "o que aconteceu"]);
    expect(texto).toContain("aconteceu");
    const interp = interpretarMensagem("KKKKKK", {
      ultimasSuas: ["mano", "tu não sabe", "o que aconteceu"],
    });
    expect(interp.mergedFrom).toBeDefined();
    expect((interp.mergedFrom as string[]).length).toBeGreaterThanOrEqual(2);
    expect(interp.intent).toBe("pergunta_evento");
  });

  it("réplica não é sequência ('boa' / 'boa' continua sendo repeteco)", () => {
    const { texto } = juntarBolhas("boa", ["boa"]);
    expect(texto).toBe("boa");
  });
});

describe("emojis participam do tom", () => {
  it("beleza 👍 ≠ beleza 💀", () => {
    expect(interpretarMensagem("beleza 👍").emojiTone).toBe("positivo");
    expect(interpretarMensagem("beleza 💀").emojiTone).toBe("humor");
    expect(interpretarMensagem("beleza ❤️").emojiTone).toBe("positivo");
    expect(interpretarMensagem("beleza").emojiTone).toBeNull();
  });
});

describe("sarcasmo e brincadeira", () => {
  it("elogio depois de desastre + kkkk = deboche, não louvor", () => {
    const interp = interpretarMensagem("nossa que inteligente vc hein KKKKK", { nivelRelacao: 1 });
    expect(interp.sarcasmo).toBe(true);
    expect(interp.emotion).toBe("brincando");
  });

  it("sem risada e sem relação, 'que inteligente vc' não é sarcasmo", () => {
    const interp = interpretarMensagem("nossa que inteligente vc", { nivelRelacao: 0 });
    expect(interp.sarcasmo).toBe(false);
  });
});

describe("o motor admite incerteza — e pede de um jeito humano", () => {
  it("mensagem sem fio nenhum → esclarecimento natural, nunca robô", () => {
    const { eventos, texto } = responder("zebra xadrez quadrado chapeu");
    expect(eventos).toContain("entendimento:esclarecimento");
    expect(texto).not.toMatch(/intenção|não compreendi|texto inválido/i);
    expect(texto).toMatch(/não peguei|repeti|quis dizer|o que/i);
  });

  it("reação pura → espelho no mesmo tom", () => {
    const { eventos } = responder("KKKKKK");
    expect(eventos).toContain("entendimento:reacao");
  });

  it("a interpretação viaja no plano, mas é só do cérebro (teste: certeza entre 0 e 1)", () => {
    const interp = interpretarMensagem("vc vai na escoka hj");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.05);
    expect(interp.certainty).toBeLessThanOrEqual(0.97);
    expect(interp.lerComo).toBe("normal");
  });
});

describe("conversa com fio: o contexto dá sentido (regressões)", () => {
  it("bolhas curtas só juntam com a bolha imediatamente anterior", () => {
    // "você viu a novela ontem?" quebra a corrente: "foi mal" fica sozinho.
    const { texto } = juntarBolhas("foi mal", ["kkk que bom", "você viu a novela ontem?"]);
    expect(texto).toBe("foi mal");
    const cadeia = juntarBolhas("o que aconteceu", ["mano", "tu não sabe"]);
    expect(cadeia.texto).toBe("mano tu não sabe o que aconteceu");
  });

  it("'tô terminando um trabalho de faculdade' é evento, não mensagem perdida", () => {
    const interp = interpretarMensagem("tô aqui terminando um trabalho de faculdade", { topicoAtual: "trabalho" });
    expect(interp.intent).toBe("compartilhar_evento");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.8);
    expect(interp.lerComo).toBe("normal");
  });

  it("'é sobre X' com assunto em curso é continuação — nunca 'o quê?'", () => {
    const interp = interpretarMensagem("é sobre inteligência artificial", { topicoAtual: "trabalho" });
    expect(interp.intent).toBe("continuar");
    expect(interp.desambiguacao).toBeTruthy();
    expect(interp.lerComo).not.toBe("esclarecer");
    const { eventos, texto } = responder("é sobre inteligência artificial", { topicoAtual: "trabalho" });
    expect(eventos).not.toContain("entendimento:esclarecimento");
    expect(texto).not.toMatch(/404|pela minha orelha|repetiu\?/i);
  });

  it("'foi mal' é desculpa — ela acolhe, não pergunta o que foi dito", () => {
    const interp = interpretarMensagem("foi mal");
    expect(interp.intent).toBe("desculpa");
    expect(interp.certainty).toBeGreaterThanOrEqual(0.8);
    const { texto } = responder("foi mal", { topicoAtual: "trabalho", recentes: ["kkk que bom"] });
    expect(texto).not.toMatch(/o quê foi que você disse/i);
  });

  it("chamar pelo nome num 'oi' não vira resposta de flerte", () => {
    const { texto } = responder("oi Marina, tudo bem?");
    expect(texto).not.toContain("soa bem na sua voz");
  });
});
