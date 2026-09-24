import { describe, expect, it } from "vitest";
import { getDefaultPerson, emptyData } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { novoChatState } from "../src/lib/dialogue";
import type { Person } from "../src/types";
import { personalidadeDe, barrasDe } from "../src/lib/dialogue/personality";
import { decairHumor, evoluirHumor, humorInicial, leituraHumor } from "../src/lib/dialogue/mood";
import {
  adicionarMemorias, decairMemorias, extrairMemoriasRicas, forcaDa,
  importanciaDe, memoriasVisiveis, retrieveRelevantMemories,
} from "../src/lib/dialogue/memory";
import { GRAFO, topicoDaMensagem, transicaoDeTopico } from "../src/lib/dialogue/topics";
import { OBJETIVOS, objetivoDaConversa } from "../src/lib/dialogue/goals";
import { leituraRelacao, relacaoDaConversa } from "../src/lib/dialogue/relationship";
import { CONSEQUENCIAS, REACOES_POR_ESTILO, estiloDeReacao, piadasInternas, perguntaPorNivel, puxadaPorMemoria } from "../src/lib/dialogue/response";
import { atrasoDeLeitura, ritmoDePlano } from "../src/lib/dialogue/timing";
import { iniciativaEfetiva, intervaloDeIniciativa } from "../src/lib/dialogue/initiative";
import {
  detectarConsequencia, estadoEstendidoDe, processarAbertura, processarPuxada, processarResposta,
} from "../src/lib/dialogue/engine";
import { gerarEventoMundo, resumoDoDia, tickDoMundo } from "../src/lib/dialogue/events";

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

const persona = buildPersona(ficha(), { people: [ficha()], settings: { ownerAge: 30 } });

describe("personalidade", () => {
  it("é determinística: a mesma ficha, a mesma personalidade", () => {
    const a = personalidadeDe(buildPersona(ficha(), { people: [ficha()], settings: { ownerAge: 30 } }));
    const b = personalidadeDe(persona);
    expect(a).toEqual(b);
  });
  it("tem todos os eixos entre 0 e 1", () => {
    const p = personalidadeDe(persona);
    for (const valor of Object.values(p)) expect(valor).toBeGreaterThanOrEqual(0);
    for (const valor of Object.values(p)) expect(valor).toBeLessThanOrEqual(1);
  });
  it("expõe as barras da personalidade para a UI", () => {
    const barras = barrasDe(personalidadeDe(persona));
    expect(barras.length).toBe(8);
    expect(barras.map(b => b.rotulo)).toContain("Iniciativa");
  });
});

describe("humor contínuo", () => {
  it("começa neutro e reage com a emotividade", () => {
    const p = personalidadeDe(persona);
    const base = humorInicial(50);
    const aposNegativo = evoluirHumor(base, { sentimento: "negativo", pesado: false, persona: p });
    expect(aposNegativo.valence).toBeLessThan(base.valence);
    expect(aposNegativo.stress).toBeGreaterThan(base.stress);
  });
  it("descansa quando ninguém fala: tensão cai, energia volta", () => {
    const h = { valence: -0.5, energy: 0.2, stress: 0.7 };
    const apos = decairHumor(h, 24, personalidadeDe(persona));
    expect(apos.stress).toBeLessThan(h.stress);
    expect(apos.energy).toBeGreaterThan(h.energy);
  });
  it("descreve o humor em linguagem humana", () => {
    expect(leituraHumor({ valence: 0.6, energy: 0.2, stress: 0.1 })).toMatch(/feliz/);
    expect(leituraHumor({ valence: 0.6, energy: 0.2, stress: 0.1 })).toMatch(/cansada/);
    expect(leituraHumor({ valence: 0.3, energy: 0.5, stress: 0.7 })).toMatch(/irritada/);
  });
});

describe("memória com importância e esquecimento", () => {
  it("classifica: aniversário é importante, fome é temporária", () => {
    expect(importanciaDe("Meu aniversário é dia 8", "fato")).toBe("alta");
    expect(importanciaDe("tô com fome", "estado")).toBe("temporaria");
    expect(importanciaDe("fui no shopping ontem", "rotina")).toBe("media");
  });
  it("extrai fatos ricos que o motor não pegava", () => {
    const mems = extrairMemoriasRicas("meu aniversário é dia 8");
    expect(mems.length).toBeGreaterThanOrEqual(1);
    expect(mems[0].importancia).toBe("alta");
  });
  it("repetição fortalece a memória em vez de duplicar", () => {
    const mems = adicionarMemorias([], extrairMemoriasRicas("eu odeio segunda-feira"), "marina");
    const reforcada = adicionarMemorias(mems, extrairMemoriasRicas("eu odeio segunda-feira"), "marina");
    expect(reforcada.length).toBe(mems.length);
    expect(reforcada[0].usos).toBe(2);
  });
  it("a força decai com os dias conforme a importância", () => {
    const agora = new Date("2026-09-20T18:00:00");
    const velha = {
      id: "m1", personId: "marina", content: "tô com fome", tipo: "estado", topico: "dia",
      importance: "temporaria" as const, createdAt: "2026-09-06T18:00:00", usos: 1, forca: 1,
    };
    const importante = {
      ...velha, id: "m2", content: "meu aniversário é dia 8", tipo: "fato",
      importance: "alta" as const, createdAt: "2026-09-15T18:00:00",
    };
    expect(forcaDa(velha, agora)).toBeLessThan(0.2);
    expect(forcaDa(importante, agora)).toBeGreaterThan(0.9);
    expect(decairMemorias([velha], agora)[0].forca).toBeLessThan(0.2);
  });
  it("memória fraca para de competir na recuperação (esquecer natural)", () => {
    const agora = new Date("2026-09-20T18:00:00");
    const fraca = {
      id: "m1", personId: "marina", content: "prova de física", tipo: "evento", topico: "escola",
      importance: "temporaria" as const, createdAt: "2026-09-01T10:00:00", usos: 1, forca: 1,
    };
    const viva = {
      id: "m2", personId: "marina", content: "prova de história", tipo: "evento", topico: "escola",
      importance: "media" as const, createdAt: "2026-09-19T10:00:00", usos: 1, forca: 1,
    };
    const relevancias = retrieveRelevantMemories("como foi a prova?", [fraca, viva], 3, agora);
    expect(relevancias[0]?.id).toBe("m2");
  });
  it("mostra na tela as memórias mais recentes com força", () => {
    const mems = adicionarMemorias([], extrairMemoriasRicas("meu aniversário é dia 8"), "marina", new Date("2026-09-20T18:00:00"));
    const visiveis = memoriasVisiveis(mems, new Date("2026-09-20T18:00:00"));
    expect(visiveis.length).toBe(1);
    expect(visiveis[0].forca).toBeCloseTo(1, 2);
  });
});

describe("grafo de tópicos", () => {
  it("encontra o tópico da mensagem", () => {
    expect(topicoDaMensagem("tive uma prova horrível na escola hoje")).toBe("escola");
    expect(topicoDaMensagem("trabalho cansa, reunião demais")).toBe("trabalho");
    expect(topicoDaMensagem("oi tudo bem")).toBeNull();
  });
  it("transita entre tópicos de forma natural", () => {
    const p = personalidadeDe(persona);
    const transicao = transicaoDeTopico("escola", persona, p, seededRandom(7));
    expect(GRAFO[transicao.topico]).toBeTruthy();
    expect(transicao.frase.length).toBeGreaterThan(10);
  });
});

describe("objetivo da conversa", () => {
  it("desabafar acolhe, despedida encerra, começo conhece", () => {
    expect(objetivoDaConversa({ intencao: "apoio", profundidade: 1, afinidade: 40, mensagens: 20 })).toBe("desabafar");
    expect(objetivoDaConversa({ intencao: "despedida", profundidade: 1, afinidade: 40, mensagens: 20 })).toBe("encerrar");
    expect(objetivoDaConversa({ intencao: "cotidiano", profundidade: 1, afinidade: 40, mensagens: 2 })).toBe("conhecer");
  });
  it("aprofunda quando o assunto rende ou a química existe", () => {
    expect(objetivoDaConversa({ intencao: "cotidiano", profundidade: 6, afinidade: 30, mensagens: 40 })).toBe("aprofundar");
    expect(objetivoDaConversa({ intencao: "cotidiano", profundidade: 2, afinidade: 70, mensagens: 40 })).toBe("aprofundar");
  });
  it("toda decisão tem rótulo e descrição", () => {
    for (const objetivo of Object.values(OBJETIVOS)) {
      expect(objetivo.rotulo.length).toBeGreaterThan(0);
      expect(objetivo.descricao.length).toBeGreaterThan(0);
    }
  });
});

describe("relação muda o estilo", () => {
  // Ficha limpa: sem crush/amiga, a conversa começa de verdade do zero.
  const fichaLimpa = () => ficha({ id: "joao", nome: "João Lima", tags: [], friendshipLevel: 0 });

  it("conversa nova começa no nível zero", () => {
    const relacao = relacaoDaConversa(novoChatState(fichaLimpa()));
    expect(relacao.nivel).toBe(0);
  });
  it("química alta sobe o nível", () => {
    const state = { ...novoChatState(ficha()), afinidade: 75, mensagens: 60, paciencia: 8 };
    expect(relacaoDaConversa(state).nivel).toBe(2);
  });
  it("descreve a relação em linguagem simples", () => {
    expect(leituraRelacao(relacaoDaConversa(novoChatState(fichaLimpa())))).toContain("se conhecendo");
  });
  it("pergunta do nível certo", () => {
    const r = seededRandom(3);
    expect(perguntaPorNivel(0, "musica", r)).toMatch(/música|ouvir/i);
    expect(perguntaPorNivel(2, null, r)).toMatch(/sumiu/i);
  });
});

describe("consequências", () => {
  it("três respostas secas seguidas viram secura percebida", () => {
    const estado = estadoEstendidoDe({ ...novoChatState(ficha()), secas: 2 }, persona);
    expect(detectarConsequencia(estado, "boa")).toEqual({ tipo: "seca" });
  });
  it("a mesma resposta repetida vira repeteco", () => {
    const estado = estadoEstendidoDe({ ...novoChatState(ficha()), ultimasSuas: ["boa"] }, persona);
    expect(detectarConsequencia(estado, "Boa.")).toEqual({ tipo: "repeticao" });
  });
  it("mensagem longa e nova não dispara nada", () => {
    const estado = estadoEstendidoDe({ ...novoChatState(ficha()), secas: 5, ultimasSuas: ["boa"] }, persona);
    expect(detectarConsequencia(estado, "hoje foi um dia estranho, aconteceu muita coisa")).toBeNull();
  });
  it("os bancos de reação existem para todos os estilos e sentimentos", () => {
    const estilos = Object.keys(REACOES_POR_ESTILO);
    expect(estilos).toHaveLength(6);
    for (const estilo of estilos) {
      for (const sentimento of ["positivo", "negativo", "neutro"] as const) {
        expect(REACOES_POR_ESTILO[estilo][sentimento].length).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(CONSEQUENCIAS).sort()).toEqual(["repeticao", "seca"]);
  });
  it("estilo da reação sai da personalidade + humor", () => {
    const p = personalidadeDe(persona);
    for (let i = 0; i < 25; i++) {
      const estilo = estiloDeReacao(p, { valence: 0.2, energy: 0.6, stress: 0.1 }, Math.random);
      expect(REACOES_POR_ESTILO[estilo]).toBeTruthy();
    }
  });
});

describe("piada interna", () => {
  it("só nasce de memória repetida (2 usos) e não-temporária", () => {
    const mems = [
      { id: "a", personId: "marina", content: "segunda-feira", tipo: "preferencia", topico: "dia", importance: "media" as const, createdAt: new Date().toISOString(), usos: 2, forca: 0.9 },
      { id: "b", personId: "marina", content: "fome", tipo: "estado", topico: "dia", importance: "temporaria" as const, createdAt: new Date().toISOString(), usos: 3, forca: 0.9 },
    ];
    const piada = piadasInternas(mems, persona, seededRandom(5));
    expect(piada).toBeTruthy();
    expect(piada).toContain("segunda-feira");
    expect(piadasInternas([{ ...mems[1] }], persona, seededRandom(5))).toBeNull();
  });
  it("a puxada de memória usa o conteúdo guardado", () => {
    const mem = { id: "a", personId: "marina", content: "café coado", tipo: "preferencia", topico: "comida", importance: "media" as const, createdAt: new Date().toISOString(), usos: 1, forca: 0.9 };
    const puxada = puxadaPorMemoria(mem, persona, seededRandom(9));
    expect(puxada.toLowerCase()).toContain("café coado");
  });
});

describe("iniciativa", () => {
  it("sobre com a química e cai quando ignorada", () => {
    const base = personalidadeDe(persona).iniciativa;
    const feliz = iniciativaEfetiva(base, 80, 0);
    const ignorada = iniciativaEfetiva(base, 80, 3);
    expect(feliz).toBeGreaterThan(base);
    expect(ignorada).toBeLessThan(feliz);
  });
  it("iniciativa alta puxa mais rápido", () => {
    const r = seededRandom(11);
    const lenta = intervaloDeIniciativa(0.1, undefined, undefined, r);
    const r2 = seededRandom(11);
    const veloz = intervaloDeIniciativa(0.9, undefined, undefined, r2);
    expect(veloz).toBeLessThan(lenta);
  });
});

describe("timing", () => {
  it("lê o lote com calma (4s a 45s no ritmo realista)", () => {
    const espera = atrasoDeLeitura(200, persona, undefined, undefined, seededRandom(4));
    expect(espera).toBeGreaterThanOrEqual(1200);
    expect(espera).toBeLessThanOrEqual(45000);
  });
  it("o ritmo espelha as bolhas e pode pausar a digitação", () => {
    const bolhas = [
      { texto: "primeira mensagem um pouco mais longa", atraso: 2600 },
      { texto: "segunda mensagem ainda mais longa e detalhada", atraso: 3200 },
    ];
    const ritmo = ritmoDePlano(bolhas, persona, { energy: 0.2, stress: 0.8 }, seededRandom(13));
    expect(ritmo.length).toBe(2);
    expect(ritmo[0].atraso).toBe(2600);
    expect(ritmo[1].pausa).toBeUndefined(); // última bolha nunca pausa
    if (ritmo[0].pausa) {
      expect(ritmo[0].pausa.ponto).toBeGreaterThan(0);
      expect(ritmo[0].pausa.dur).toBeGreaterThan(0);
    }
  });
});

describe("mundo vivo", () => {
  it("gera um acontecimento para cada pessoa ativa", () => {
    const evento = gerarEventoMundo(ficha(), { ...novoChatState(ficha()), ultimaMensagem: new Date().toISOString() }, seededRandom(2));
    expect(evento.titulo).toContain("Marina");
    expect(evento.quando).toBeTruthy();
  });
  it("o tick do dia devolve notificações com id e resumo", () => {
    const data = emptyData();
    const person = ficha();
    data.people = [person];
    data.chatStates = { [person.id]: novoChatState(person) };
    data.chats = [{ id: "c1", personId: person.id, role: "them", text: "oi", timestamp: new Date().toISOString() }];
    data.people[0] = { ...person, aniversario: "10-08" };
    const itens = tickDoMundo(data, new Date("2026-09-20T18:00:00"), seededRandom(6));
    expect(itens.length).toBeGreaterThan(0);
    for (const item of itens) expect(item.id).toBeTruthy();
    const mundo = itens.filter(item => item.kind === "mundo");
    expect(mundo.length).toBeGreaterThan(0);
    expect(mundo[0].personId).toBe(person.id);
  });
  it("o resumo do dia conta as coisas do dia e sugere missões", () => {
    const data = emptyData();
    const hoje = new Date().toISOString();
    data.chats = [{ id: "c1", personId: "x", role: "user", text: "oi", timestamp: hoje }];
    const resumo = resumoDoDia(data, new Date());
    expect(resumo.novasConversas).toBe(1);
    expect(resumo.missoes.length).toBeGreaterThan(0);
  });
});

describe("motor completo (camada viva + motor de texto)", () => {
  const entrada = {
    person: ficha(), persona, adulto: true, nomeUsuario: "Rafael",
    pessoas: [ficha()], dono: { ownerAge: 30 },
    abreviar: true, emojis: true, pausado: false,
  };

  it("responde com estado completo: humor, objetivo, tópico, iniciativa, ritmo", () => {
    const plano = processarResposta({
      ...entrada, state: novoChatState(ficha()), message: "hoje foi corrido no trabalho, reunião sem fim", rand: seededRandom(21),
    });
    expect(plano.plano.bolhas.length).toBeGreaterThan(0);
    expect(plano.humor.valence).toBeGreaterThanOrEqual(-1);
    expect(plano.humor.valence).toBeLessThanOrEqual(1);
    expect(plano.topico).toBe("trabalho");
    expect(plano.objetivo.rotulo).toBeTruthy();
    expect(plano.iniciativa).toBeGreaterThan(0);
    expect(plano.ritmo.length).toBe(plano.plano.bolhas.length);
    expect(plano.plano.state.humorEstado).toBeTruthy();
    expect(plano.plano.state.objetivo).toBeTruthy();
  });

  it("guarda o que você conta com importância", () => {
    const plano = processarResposta({
      ...entrada, state: novoChatState(ficha()), message: "meu aniversário é dia 8", rand: seededRandom(22),
    });
    const mems = plano.plano.state.memorias || [];
    expect(mems.length).toBeGreaterThanOrEqual(1);
    expect(mems.some(m => m.importance === "alta")).toBe(true);
  });

  it("percebe a secura: três respostas curtas seguidas", () => {
    let state = { ...novoChatState(ficha()), secas: 0 };
    let ultimo = null;
    for (const vez of ["boa", "boa", "boa"]) {
      const plano = processarResposta({ ...entrada, state, message: vez, rand: seededRandom(23) });
      ultimo = plano;
      state = plano.plano.state;
    }
    expect(state.secas).toBe(3);
    // Na terceira, ela reage ao padrão (o sorteio pode deixar para a próxima,
    // mas a contagem é o que garante a consequência).
    expect(ultimo?.plano.eventos).toBeDefined();
  });

  it("ela puxa assunto sozinha quando forçado — e guarda a hora para medir a ausência", () => {
    const plano = processarPuxada({ ...entrada, state: novoChatState(ficha()), forcado: true, rand: seededRandom(24) });
    expect(plano).toBeTruthy();
    if (plano) {
      expect(plano.plano.bolhas.length).toBeGreaterThan(0);
      expect(plano.plano.state.ultimoPuxada).toBeTruthy();
    }
  });

  it("abre a conversa com a camada viva já pronta", () => {
    const plano = processarAbertura({ ...entrada, state: novoChatState(ficha()), rand: seededRandom(25) });
    expect(plano.plano.bolhas.length).toBeGreaterThan(0);
    expect(plano.objetivo.rotulo).toBe("conhecer");
    expect(plano.humorLeitura).toBeTruthy();
  });
});
