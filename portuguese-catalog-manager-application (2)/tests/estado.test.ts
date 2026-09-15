import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { novoChatState, planReply, promptDoSistema, recuperarMemorias, resumirMemorias } from "../src/lib/dialogue";
import { PACIENCIA_BAIXA, ajusteDePaciencia, descreverEstado, humorPorPaciencia, lembrar, pacienciaDe } from "../src/lib/estado";
import type { ChatState, Person } from "../src/types";

function ficha(over: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), id: "celia", nome: "Dona Célia", idade: 61, comportamento: "Calma, séria, muito religiosa e caseira", tags: ["amiga"], friendshipLevel: 3, ...over };
}

function conversar(person: Person, mensagens: string[], semente = 7) {
  const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
  let state = novoChatState(person);
  const planos = mensagens.map((mensagem, indice) => {
    const plano = planReply({
      person, persona, state, message: mensagem, rand: seededRandom(semente + indice * 5), nomeUsuario: "Rafael",
      pessoas: [person], dono: { ownerAge: 30 }, adulto: true, abreviar: true, emojis: true, pausado: false,
    });
    state = plano.state;
    return plano;
  });
  return { planos, state, persona };
}

describe("paciência e humor", () => {
  it("lê a paciência de conversas antigas sem o campo", () => {
    const state = { ...novoChatState(ficha()), paciencia: undefined } as ChatState;
    const valor = pacienciaDe(state);
    expect(valor).toBeGreaterThan(0);
    expect(valor).toBeLessThanOrEqual(10);
    expect(pacienciaDe({ ...state, paciencia: 42 })).toBe(10);
    expect(pacienciaDe({ ...state, paciencia: -3 })).toBe(0);
  });

  it("cai com grosseria e cobrança, sobe com carinho", () => {
    const agressao = ajusteDePaciencia({ intencao: "grosseria", sentimento: "negativo", texto: "cala a boca", curta: true });
    const cobranca = ajusteDePaciencia({ intencao: "provocacao", sentimento: "negativo", texto: "por que não respondeu?", curta: false });
    const desculpa = ajusteDePaciencia({ intencao: "desculpa", sentimento: "neutro", texto: "desculpa, foi um dia ruim", curta: false });
    const elogio = ajusteDePaciencia({ intencao: "elogio", sentimento: "positivo", texto: "você é gente boa", curta: false });
    expect(agressao.delta).toBeLessThan(cobranca.delta);
    expect(agressao.motivos).toContain("tom agressivo");
    expect(desculpa.delta).toBeGreaterThan(0);
    expect(elogio.delta).toBeGreaterThan(0);
  });

  it("a paciência manda no humor", () => {
    const persona = buildPersona(ficha(), { people: [], settings: { ownerAge: 30 } });
    expect(humorPorPaciencia(0.5, "happy", persona)).toBe("fechada");
    expect(humorPorPaciencia(PACIENCIA_BAIXA + 0.5, "playful", persona)).toBe("neutral");
    expect(humorPorPaciencia(9.5, "neutral", persona)).toMatch(/carinhosa|neutral/);
    expect(humorPorPaciencia(6, "curious", persona)).toBe("curious");
  });

  it("descreve o estado em uma linha", () => {
    expect(descreverEstado({ humor: "fechada", paciencia: 1.2, afinidade: 12 })).toMatch(/fechada · paciência baixa \(1\/10\) · química 12%/);
  });
});

describe("falar grosso com ela", () => {
  const { planos, state } = conversar(ficha(), [
    "oi, tudo bem?", "me conta uma coisa boa do seu dia",
    "você é uma chata mesmo, fica quieta", "cala a boca", "desculpa, passei dos limites",
  ]);

  it("reconhece o tom agressivo e marca o limite", () => {
    expect(planos[2].intencao).toBe("grosseria");
    expect(planos[2].eventos).toContain("limite:grosseria");
    expect(planos[2].estado.humor).toBe("fechada");
    expect(planos[2].bolhas.map(b => b.texto).join(" ")).toMatch(/não cabe aqui|não vou responder|não aceito|me magoou|parar por aqui|me retiro|não é assim/i);
    expect(planos[2].bolhas.map(b => b.texto).join(" ")).not.toMatch(/😊|🥰|kkk/i);
  });

  it("derruba paciência e química sem chance de voltar do nada", () => {
    expect(planos[2].estado.paciencia).toBeLessThan(planos[1].estado.paciencia);
    expect(planos[3].estado.paciencia).toBeLessThan(planos[2].estado.paciencia);
    expect(planos[3].estado.afinidade).toBeLessThan(planos[1].estado.afinidade);
    expect(state.ofensas).toBeGreaterThan(0);
  });

  it("o pedido de desculpa começa a reconstruir", () => {
    expect(planos[4].estado.gatilhos).toContain("pedido de desculpa");
    expect(planos[4].estado.paciencia).toBeGreaterThan(planos[3].estado.paciencia);
  });
});

describe("paciência no fim", () => {
  it("responde curto, sem carinho, sem emoji e sem puxar assunto", () => {
    const person = ficha({ id: "marina", nome: "Marina", idade: 34, comportamento: "Alegre, brincalhona, cheia de emojis" });
    const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
    const cansada: ChatState = { ...novoChatState(person), paciencia: 0.8, humor: "fechada" };
    for (let i = 0; i < 12; i++) {
      const plano = planReply({
        person, persona, state: cansada, message: "e aí, o que você tá fazendo agora?", rand: seededRandom(i + 1),
        nomeUsuario: "Rafael", pessoas: [person], dono: { ownerAge: 30 }, adulto: true, abreviar: true, emojis: true, pausado: false,
      });
      const junto = plano.bolhas.map(b => b.texto).join(" // ");
      expect(plano.bolhas.length, junto).toBeLessThanOrEqual(2);
      expect(junto, junto).not.toMatch(/😊|😍|🥰|😜|kkk/i);
      expect(plano.bolhas.filter(b => /\?\s*$/.test(b.texto.trim())).length, junto).toBeLessThanOrEqual(1);
      expect(plano.estado.paciencia).toBeLessThanOrEqual(PACIENCIA_BAIXA);
      expect(plano.estado.humor).toBe("fechada");
    }
  });
});

describe("estado estruturado e prompt", () => {
  const { planos, persona } = conversar(ficha(), ["oi, tudo bem?", "obrigado por me ouvir, viu"]);

  it("volta no formato estado + resposta", () => {
    const json = JSON.parse(JSON.stringify(planos[1].estruturado)) as typeof planos[1].estruturado;
    expect(Object.keys(json).sort()).toEqual(["estado_emocional", "resposta_para_usuario"]);
    expect(Object.keys(json.estado_emocional).sort()).toEqual(["afinidade_com_usuario", "estagio", "gatilhos", "humor_atual", "nivel_paciencia"]);
    expect(json.resposta_para_usuario.length).toBeGreaterThan(0);
    expect(json.resposta_para_usuario).toEqual(planos[1].bolhas.map(bolha => bolha.texto));
    expect(json.estado_emocional.nivel_paciencia).toBeGreaterThanOrEqual(0);
    expect(json.estado_emocional.nivel_paciencia).toBeLessThanOrEqual(10);
    expect(json.estado_emocional.afinidade_com_usuario).toBe(Math.round(planos[1].estado.afinidade));
    expect(json.estado_emocional.gatilhos).toEqual(planos[1].estado.gatilhos);
  });

  it("o prompt de sistema descreve persona, maturidade, proximidade e estado", () => {
    const prompt = promptDoSistema({ person: ficha(), persona, estado: planos[1].estado });
    expect(prompt).toMatch(/Dona Célia, 61 anos/);
    expect(prompt).toMatch(/Maturidade:/);
    expect(prompt).toMatch(/Proximidade:/);
    expect(prompt).toMatch(/Estado emocional agora:/);
    expect(prompt).toMatch(/paciência \d+\/10/);
  });
});

describe("memória", () => {
  it("busca a lembrança mais parecida com o que você acabou de dizer", () => {
    const person = ficha();
    const state: ChatState = {
      ...novoChatState(person),
      lembrancas: [
        { tipo: "preferencia", valor: "gosta de café" },
        { tipo: "rotina", valor: "trabalha de motorista de aplicativo" },
        { tipo: "evento", valor: "viagem para Salvador em dezembro" },
      ],
    };
    const achadas = recuperarMemorias(state, "como foi aquela viagem para Salvador?");
    expect(achadas[0].valor).toMatch(/viagem para Salvador/);
    expect(recuperarMemorias({ ...state, lembrancas: [] }, "qualquer coisa")).toEqual([]);
  });

  it("guarda peso e mantém só as últimas doze", () => {
    let state = novoChatState(ficha());
    for (let i = 0; i < 16; i++) state = { ...state, lembrancas: lembrar(state, [{ tipo: "assunto", valor: `lembrança ${i}` }]) };
    expect(state.lembrancas.length).toBe(12);
    expect(state.lembrancas[state.lembrancas.length - 1].valor).toBe("lembrança 15");
    expect(state.lembrancas[state.lembrancas.length - 1].peso).toBeGreaterThan(0);
    expect(resumirMemorias(state)[0]).toContain("lembrança 15");
  });
});

describe("maturidade ajustável", () => {
  it("o ajuste da ficha move o vocabulário", () => {
    const base = buildPersona(ficha({ idade: 34, comportamento: "Alegre e falante" }), { people: [], settings: { ownerAge: 30 } });
    const seria = buildPersona(ficha({ idade: 34, comportamento: "Alegre e falante", maturidadeAjuste: "seria" }), { people: [], settings: { ownerAge: 30 } });
    const solta = buildPersona(ficha({ idade: 34, comportamento: "Alegre e falante", maturidadeAjuste: "solta" }), { people: [], settings: { ownerAge: 30 } });
    expect(seria.fala.maturidade).toBeGreaterThan(base.fala.maturidade);
    expect(solta.fala.maturidade).toBeLessThan(base.fala.maturidade);
    expect(solta.traits.girias).toBeGreaterThan(seria.traits.girias);
  });
});
