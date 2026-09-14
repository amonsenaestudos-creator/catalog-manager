import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { detectarIntencao, novoChatState, planOpening, planReply, sugerirAberturas, sugerirRespostas } from "../src/lib/dialogue";
import { nomesEstranhos } from "../src/lib/voz";
import type { Person } from "../src/types";

/** Ficha adulta, do jeito que a maioria das fichas do catálogo é. */
function ficha(over: Partial<Person> = {}): Person {
  return {
    ...getDefaultPerson(),
    id: "celia",
    nome: "Dona Célia",
    idade: 61,
    comportamento: "Calma, séria, muito religiosa e caseira",
    tags: ["amiga"],
    friendshipLevel: 3,
    ...over,
  };
}

function responder(mensagem: string, extra: { semente?: number; person?: Person; adulto?: boolean } = {}) {
  const person = extra.person || ficha();
  const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
  const plano = planReply({
    person, persona, state: novoChatState(person), message: mensagem, rand: seededRandom(extra.semente ?? 3),
    nomeUsuario: "Rafael", pessoas: [person], dono: { ownerAge: 30 }, adulto: extra.adulto !== false,
    abreviar: true, emojis: true, pausado: false,
  });
  return { plano, persona, texto: plano.bolhas.map(bolha => bolha.texto).join(" ") };
}

describe("entender melhor o que você escreve", () => {
  it("reconhece os assuntos do dia a dia", () => {
    const casos: [string, string][] = [
      ["você tá fazendo o que agora?", "pergunta_rotina"],
      ["me conta uma coisa boa do seu dia", "pedido_historia"],
      ["conta um caso seu pra mim", "pedido_historia"],
      ["não consigo dormir, a cabeça não para", "reclamacao_sem_dormir"],
      ["vim aqui só pra agradecer a conversa de ontem", "gratidao_recebida"],
      ["sinto falta de conversar assim, de verdade", "saudade"],
      ["só passei pra dar um oi", "saudacao"],
      ["trabalhei o dia inteiro e ainda tem casa para arrumar", "cotidiano_trabalho"],
      ["obrigado pela conversa, viu", "gratidao_recebida"],
    ];
    casos.forEach(([mensagem, esperado]) => {
      expect(detectarIntencao(mensagem).id, mensagem).toBe(esperado);
    });
  });

  it("acha o nome de quem você citou, e ignora o resto", () => {
    expect(nomesEstranhos("conheci o João ontem no mercado", [])).toEqual(["João"]);
    expect(nomesEstranhos("Falei com Ana Costa hoje", ["Ana Costa"])).toEqual([]);
    expect(nomesEstranhos("Oi, tudo bem? Hoje foi corrido", [])).toEqual([]);
  });

  it("pergunta quem é a pessoa nova e guarda o nome", () => {
    const person = ficha();
    const eventos: string[] = [];
    let estado = novoChatState(person);
    for (let semente = 1; semente <= 25; semente++) {
      const plano = planReply({
        person, state: estado, message: "conheci o João ontem no mercado", rand: seededRandom(semente),
        nomeUsuario: "Rafael", pessoas: [person], dono: { ownerAge: 30 }, adulto: true,
      });
      estado = plano.state;
      eventos.push(...plano.eventos);
      plano.bolhas.forEach(bolha => expect(bolha.texto).not.toMatch(/\{[a-z_]+\}/));
    }
    expect(eventos.some(evento => evento === "nome:novo:João")).toBe(true);
    expect(estado.pessoas || []).toContain("João");
  });

  it("fala o nome do parente quando você pergunta por ele", () => {
    const filha = ficha({ id: "ana", nome: "Ana Clara", idade: 22, vinculos: [{ id: "v2", personId: "rosa", papel: "mae" }] });
    const person = ficha({ id: "rosa", nome: "Tia Rosa", idade: 52, vinculos: [{ id: "v1", personId: "ana", papel: "filha" }] });
    const persona = buildPersona(person, { people: [person, filha], settings: { ownerAge: 30 } });
    expect(persona.familiares.map(item => item.nome)).toContain("Ana");
    let achou = false;
    for (let semente = 1; semente <= 12 && !achou; semente++) {
      const plano = planReply({
        person, persona, state: novoChatState(person), message: "como está a Ana Clara?", rand: seededRandom(semente),
        nomeUsuario: "Rafael", pessoas: [person, filha], dono: { ownerAge: 30 }, adulto: true,
      });
      const texto = plano.bolhas.map(bolha => bolha.texto).join(" ");
      if (plano.intencao === "pergunta_familiar" && texto.includes("Ana")) achou = true;
    }
    expect(achou).toBe(true);
  });

  it("percebe quando você chama ela pelo nome", () => {
    let achou = false;
    for (let semente = 1; semente <= 12 && !achou; semente++) {
      const { plano } = responder("Dona Célia, tudo bem hoje?", { semente });
      if (plano.eventos.includes("nome:ela")) achou = true;
    }
    expect(achou).toBe(true);
  });
});

describe("conversa sem cara de robô", () => {
  it("não repete a mesma resposta em conversas seguidas", () => {
    const person = ficha();
    const textos = new Set<string>();
    for (let semente = 1; semente <= 40; semente++) {
      textos.add(responder("o que você tá fazendo agora?", { semente }).texto);
    }
    expect(textos.size).toBeGreaterThanOrEqual(28);
  });

  it("varia as sugestões de resposta e não deixa marcador na tela", () => {
    const person = ficha();
    const primeirasPalavras = new Set<string>();
    for (let semente = 1; semente <= 12; semente++) {
      const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
      const sugestoes = sugerirRespostas({
        person, persona, state: novoChatState(person), mensagemDela: "hoje eu trabalhei o dia inteiro e ainda tem casa para arrumar",
        rand: seededRandom(semente), pessoas: [person], dono: { ownerAge: 30 }, adulto: true,
      });
      expect(sugestoes.length).toBeGreaterThan(1);
      sugestoes.forEach(sugestao => expect(sugestao.texto).not.toMatch(/\{[a-z_]+\}/));
      const aberturas = sugestoes.map(sugestao => sugestao.texto.split(" ").slice(0, 3).join(" "));
      expect(new Set(aberturas).size).toBe(aberturas.length);
      aberturas.forEach(abertura => primeirasPalavras.add(abertura));
    }
    expect(primeirasPalavras.size).toBeGreaterThanOrEqual(8);
  });

  it("escreve como adulto e não como adolescente", () => {
    const molecagem = /kkkk|sksk|😜|🙈|🥳|🥺|💕|\bmó\b|\bsla\b|\bmds\b|\baff\b|tô rindo sozinha/i;
    [61, 45, 34, 27].forEach(idade => {
      const person = ficha({ id: `p${idade}`, nome: `Pessoa ${idade}`, idade, comportamento: "Brincalhona e festeira" });
      const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
      expect(persona.fala.maturidade, String(idade)).toBeGreaterThanOrEqual(0.72);
      for (let semente = 1; semente <= 20; semente++) {
        const { texto } = responder("vc viu o q eu te mandei hj?", { semente, person });
        expect(texto, `${idade} :: ${texto}`).not.toMatch(molecagem);
      }
    });
  });

  it("mantém a ficha de menor de idade no repertório leve", () => {
    const person = ficha({ id: "joana", nome: "Joana Lima", idade: 16, comportamento: "Tímida, estudiosa e quieta" });
    const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
    expect(persona.fala.maturidade).toBeLessThan(0.72);
    const abertura = planOpening({
      person, persona, state: novoChatState(person), rand: seededRandom(4), nomeUsuario: "Rafael",
      pessoas: [person], dono: { ownerAge: 30 }, adulto: false,
    });
    expect(abertura.bolhas.length).toBeGreaterThan(0);
  });

  it("abre a conversa sem a mesma frase para todo mundo", () => {
    const fichas = [ficha({ id: "a", nome: "Dona Célia", idade: 61 }), ficha({ id: "b", nome: "Marina Costa", idade: 34 }), ficha({ id: "c", nome: "Duda Reis", idade: 27 })];
    const aberturas = fichas.map(person => {
      const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
      return planOpening({
        person, persona, state: novoChatState(person), rand: seededRandom(9), nomeUsuario: "Rafael",
        pessoas: [person], dono: { ownerAge: 30 }, adulto: true,
      }).bolhas.map(bolha => bolha.texto).join(" ");
    });
    aberturas.forEach(texto => expect(texto).not.toMatch(/😜|🙈|kkkk/));
    expect(new Set(aberturas).size).toBeGreaterThan(1);
  });

  it("não abre a mesma frase duas vezes", () => {
    const idades = [61, 45, 34, 27, 22];
    idades.forEach(idade => {
      const person = ficha({ id: `abre${idade}`, nome: `Pessoa ${idade}`, idade });
      for (let semente = 1; semente <= 12; semente++) {
        const { texto } = responder("me conta uma coisa boa do seu dia", { semente, person });
        expect(texto, texto).not.toMatch(/vou te falar,\s*vou te falar/i);
        expect(texto, texto).not.toMatch(/^(.{4,26}?), \1/i);
      }
    });
  });

  it("sugestão de abertura sai pronta, sem marcador", () => {
    const person = ficha();
    for (let semente = 1; semente <= 8; semente++) {
      const persona = buildPersona(person, { people: [person], settings: { ownerAge: 30 } });
      const sugestoes = sugerirAberturas({
        person, persona, state: novoChatState(person), rand: seededRandom(semente),
        pessoas: [person], dono: { ownerAge: 30 }, adulto: true, abreviar: true, emojis: true,
      });
      expect(sugestoes.length).toBeGreaterThan(0);
      sugestoes.forEach(sugestao => {
        expect(sugestao.texto).not.toMatch(/\{[a-z_]+\}/);
        expect(sugestao.texto.trim().length).toBeGreaterThan(8);
      });
    }
  });

  it("não gera marcador solto na resposta", () => {
    const person = ficha();
    for (let semente = 1; semente <= 30; semente++) {
      const { texto } = responder("eu preciso de um conselho sobre a minha família", { semente, person });
      expect(texto).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});

/**
 * Desabafo é o teste de maturidade da conversa: quem perdeu o emprego não
 * quer ouvir "você almoçou?" nem receber carinha alegre no meio da resposta.
 */
describe("assunto pesado", () => {
  const alegre = ficha({ id: "marina", nome: "Marina", idade: 34, comportamento: "Alegre, brincalhona, cheia de emojis e kkk", tags: ["amiga"] });
  const rodada = (mensagem: string, semente: number) => responder(mensagem, { semente, person: alegre });

  it("reconhece um desabafo escrito com outras palavras", () => {
    const { plano } = rodada("perdi meu emprego hoje e tô muito mal com isso", 1);
    expect(plano.intencao).toBe("apoio");
    expect(plano.sentimento).toBe("negativo");
    for (const variacao of ["fui demitida hoje", "meu dia foi horrível", "tô muito mal com uma coisa", "ando sem ânimo pra nada"]) {
      expect(rodada(variacao, 2).plano.sentimento, variacao).toBe("negativo");
    }
  });

  it("não manda carinha alegre nem pergunta de rotina", () => {
    const carinhasAlegres = /[😊😜😏😍😂🤣😄😁🥳]/u;
    const rotina = /(almoçou|fim de semana|acordar cedo|dormido quantas|planejado)/i;
    for (let i = 0; i < 30; i++) {
      const { texto } = rodada("perdi meu emprego hoje e tô muito mal com isso", i + 1);
      expect(texto, texto).not.toMatch(carinhasAlegres);
      expect(texto, texto).not.toMatch(rotina);
    }
    const todas = Array.from({ length: 30 }, (_, i) => rodada("perdi meu emprego hoje e tô muito mal com isso", i + 1).texto).join(" ");
    expect(todas).toMatch(/sinto muito|poxa|fico triste|conte comigo|tô aqui|ninguém merece|desabafar|te escut/i);
  });

  it("mas assunto bom continua recebendo carinha", () => {
    const todas = Array.from({ length: 30 }, (_, i) => rodada("ganhei uma promoção hoje, tô feliz demais", i + 1).texto).join(" ");
    expect(todas).toMatch(/[🙂😊😄😍🥰🔥]/u);
  });
});

/** Ninguém pergunta duas vezes nem pede "me conta" duas vezes na mesma mensagem. */
describe("mensagem sem repetição de convite", () => {
  it("fica com no máximo uma pergunta e um convite", () => {
    const fichas = [ficha(), ficha({ id: "marina", nome: "Marina", idade: 34, comportamento: "Falante e curiosa", tags: ["amiga"] })];
    const mensagens = ["o joão me ligou ontem", "cheguei do trabalho agora e o dia foi longo", "e aí, tudo bem?"];
    for (const person of fichas) {
      for (const mensagem of mensagens) {
        for (let i = 0; i < 12; i++) {
          const bolhas = responder(mensagem, { semente: i + 1, person }).plano.bolhas.map(bolha => bolha.texto);
          const junto = bolhas.join(" // ");
          expect(bolhas.filter(texto => /\?\s*$/.test(texto.trim())).length, junto).toBeLessThanOrEqual(1);
          expect(bolhas.filter(texto => /(me conta|fala mais|conta mais|quero ouvir|me diz|me fala|continua contando)/i.test(texto)).length, junto).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
