import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { abreviacoesNaMensagem, expandirAbreviacoes } from "../src/lib/abreviacoes";
import { detectarIntencao, montarAtrasos, novoChatState, planReply } from "../src/lib/dialogue";
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

/** Responde como se o dono do catálogo se chamasse Rafael. */
function responder(mensagem: string, extra: { semente?: number; emojis?: boolean; person?: Person } = {}) {
  const person = extra.person || ficha();
  const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
  const plano = planReply({
    person, persona, state: novoChatState(person), message: mensagem, rand: seededRandom(extra.semente ?? 3),
    nomeUsuario: "Rafael", pessoas: [person], dono: { ownerAge: 30 }, adulto: true,
    abreviar: true, emojis: extra.emojis !== false, pausado: false,
  });
  return { plano, texto: plano.bolhas.map(bolha => bolha.texto).join(" ") };
}

const contarCaracteresAltos = (texto: string) => [...texto].filter(caractere => (caractere.codePointAt(0) || 0) >= 0x2190).length;

describe("português abreviado", () => {
  it("abre o que o dedo escreve com pressa", () => {
    expect(expandirAbreviacoes("vc viu o q eu te mandei hj?")).toBe("você viu o que eu te mandei hoje?");
    expect(expandirAbreviacoes("entt, to cansado")).toBe("então, estou cansado");
    expect(expandirAbreviacoes("pq vc n me chamou?")).toBe("porque você n me chamou?");
    expect(expandirAbreviacoes("blz, vlw")).toBe("beleza, valeu");
  });

  it("lista as abreviações que apareceram", () => {
    expect(abreviacoesNaMensagem("vc viu o q eu te mandei hj?")).toEqual(["vc", "q", "hj"]);
    expect(abreviacoesNaMensagem("tudo certo por aqui")).toEqual([]);
  });

  it("entende a intenção mesmo com tudo abreviado", () => {
    expect(detectarIntencao("vc viu o q eu te mandei hj?").id).toBe("mensagem_enviada");
    expect(detectarIntencao("o q vc ta fazendo agr?").id).toBe("pergunta_rotina");
    expect(detectarIntencao("to exausto hj, foi um dia corrido").id).toBe("apoio");
    expect(detectarIntencao("vc viu minha msg?").id).toBe("mensagem_enviada");
  });

  it("não perde o jeito falado que já funcionava", () => {
    // Os padrões escritos do jeito coloquial continuam valendo ("tá", "tô", "blz").
    expect(detectarIntencao("Você tá me evitando, demora pra responder").id).toBe("provocacao");
    expect(detectarIntencao("tô mal hoje").id).toBe("apoio");
    expect(detectarIntencao("tô de folga hoje").id).toBe("cotidiano_trabalho");
  });

  it("responde de verdade e registra o que ela entendeu", () => {
    const { plano, texto } = responder("vc viu o q eu te mandei hj?");
    expect(plano.intencao).toBe("mensagem_enviada");
    expect(plano.eventos.some(evento => evento.startsWith("abreviacoes:"))).toBe(true);
    expect(texto).toMatch(/vi|ver|abri|abro|mandei/i);
  });
});

describe("ritmo da conversa", () => {
  const persona = buildPersona(ficha(), { people: [ficha()], settings: { ownerAge: 30 } });
  const bolhas = ["Oi! Tudo bem por aqui?", "E o seu dia, como foi?"];

  it("dá tempo de ler: nada de resposta instantânea", () => {
    const atrasos = montarAtrasos(bolhas, persona, seededRandom(5));
    expect(atrasos[0]).toBeGreaterThanOrEqual(1400);
    expect(atrasos[0]).toBeLessThanOrEqual(8200);
    expect(atrasos[1]).toBeGreaterThanOrEqual(1400);
  });

  it("o modo pausado é mais devagar que o realista", () => {
    const realista = montarAtrasos(bolhas, persona, seededRandom(9));
    const pausado = montarAtrasos(bolhas, persona, seededRandom(9), false, "neutral", true);
    expect(pausado[0]).toBeGreaterThan(realista[0]);
  });

  it("o modo rápido continua rápido", () => {
    const rapido = montarAtrasos(bolhas, persona, seededRandom(4), true);
    expect(Math.max(...rapido)).toBeLessThanOrEqual(2800);
  });

  it("respeita o humor fechado, que escreve mais devagar", () => {
    const normal = montarAtrasos(bolhas, persona, seededRandom(11));
    const fechada = montarAtrasos(bolhas, persona, seededRandom(11), false, "fechada");
    expect(fechada[0]).toBeGreaterThan(normal[0]);
  });
});

describe("cada pessoa fala do seu jeito", () => {
  const animada = ficha({ id: "ana", nome: "Ana Costa", idade: 19, comportamento: "Animada, festeira e brincalhona" });
  const seria = ficha({ id: "celia", nome: "Célia Souza", idade: 61, comportamento: "Calma, séria, muito religiosa e caseira" });
  const ousada = ficha({ id: "duda", nome: "Duda Reis", idade: 27, comportamento: "Safada, atrevida e provocante no jeito de falar" });
  const personaDe = (person: Person) => buildPersona(person, { people: [person], settings: { ownerAge: 30 } });

  it("gera uma assinatura de voz para cada uma", () => {
    [animada, seria, ousada].forEach(person => {
      const assinatura = personaDe(person).assinatura;
      expect(assinatura.risada.length).toBeGreaterThan(1);
      expect(assinatura.aberturas.length).toBeGreaterThanOrEqual(2);
      expect(assinatura.bordoes.length).toBeGreaterThanOrEqual(2);
      expect(assinatura.descricao).toMatch(/escreve|digita|responde/i);
    });
  });

  it("a assinatura é estável: a mesma ficha conversa sempre do mesmo jeito", () => {
    const primeira = personaDe(animada).assinatura;
    const segunda = personaDe(animada).assinatura;
    expect(segunda.risada).toBe(primeira.risada);
    expect(segunda.aberturas).toEqual(primeira.aberturas);
    expect(segunda.bordoes).toEqual(primeira.bordoes);
    expect(segunda.pontuacao).toBe(primeira.pontuacao);
  });

  it("as assinaturas não são a mesma para todo mundo", () => {
    const marcas = [animada, seria, ousada].map(person => {
      const { assinatura } = personaDe(person);
      return [assinatura.risada, assinatura.aberturas.join(" "), assinatura.pontuacao].join("|");
    });
    expect(new Set(marcas).size).toBeGreaterThan(1);
  });

  it("a marca registrada aparece na fala", () => {
    const marca = personaDe(animada).assinatura;
    const respostas = Array.from({ length: 20 }, (_, i) => responder("Oi, tudo bem com você?", { semente: i + 1, person: animada }).texto).join(" ");
    const usouRisada = respostas.includes(marca.risada);
    const usouAbertura = marca.aberturas.some(abertura => respostas.includes(abertura));
    const usouBordao = marca.bordoes.some(bordao => respostas.includes(bordao));
    expect(usouRisada || usouAbertura || usouBordao).toBe(true);
  });

  it("duas fichas diferentes não respondem igual à mesma mensagem", () => {
    const respostasA = new Set<string>();
    const respostasB = new Set<string>();
    for (let i = 1; i <= 12; i++) {
      respostasA.add(responder("Oi, sumida! Tudo bem?", { semente: i, person: animada }).texto);
      respostasB.add(responder("Oi, sumida! Tudo bem?", { semente: i, person: seria }).texto);
    }
    const iguais = [...respostasA].filter(texto => respostasB.has(texto));
    expect(respostasA.size).toBeGreaterThan(5);
    expect(iguais.length).toBeLessThan(respostasA.size * 0.5);
  });

  it("desligar emojis nos ajustes deixa a escrita mais seca", () => {
    const somar = (emojis: boolean) => Array.from({ length: 25 }, (_, i) =>
      contarCaracteresAltos(responder("Oi! Me conta uma novidade boa", { semente: i + 1, emojis }).texto)
    ).reduce((total, valor) => total + valor, 0);
    expect(somar(false)).toBeLessThan(somar(true));
  });
});
