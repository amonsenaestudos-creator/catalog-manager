import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import { buildPersona, seededRandom } from "../src/lib/persona";
import { detectarIntencao, novoChatState, planReply, sugerirRespostas } from "../src/lib/dialogue";
import { MAIS_PERGUNTAS, MAIS_RECEPCOES, MAIS_RESPOSTAS, MAIS_SUGESTOES, RECEPCOES_TEMA, nomesNaMensagem } from "../src/lib/voz";
import { redeFamiliar } from "../src/lib/relacao";
import type { Person, Vinculo } from "../src/types";

const vinculo = (personId: string, papel: Vinculo["papel"]): Vinculo => ({ id: `v-${personId}`, personId, papel });

function ficha(over: Partial<Person> = {}): Person {
  return {
    ...getDefaultPerson(),
    id: "marina",
    nome: "Marina Costa",
    apelido: "Mari",
    idade: 34,
    descricao: "Gosta de fotografia e de café pela cidade.",
    comportamento: "Extrovertida, brincalhona e um pouco tímida no começo",
    localizacaoOnde: "igreja",
    tags: ["amiga", "crush"],
    friendshipLevel: 3,
    ...over,
  };
}

const mae = ficha({ id: "celia", nome: "Dona Célia", apelido: "", idade: 62 });
const filha = ficha({ id: "ana", nome: "Ana Costa", apelido: "", idade: 9 });
const marina = ficha({ vinculos: [vinculo("celia", "mae"), vinculo("ana", "filha")] });
const pessoas = [marina, mae, filha];
const persona = buildPersona(marina, { people: pessoas, settings: { ownerAge: 30 } });

/** Atalho para responder como se o dono do catálogo se chamasse Rafael. */
function responder(mensagem: string, semente = 1, estado = novoChatState(marina)) {
  return planReply({
    person: marina, persona, state: estado, message: mensagem, rand: seededRandom(semente),
    nomeUsuario: "Rafael", pessoas, dono: { ownerAge: 30 }, adulto: true,
  });
}

const texto = (plano: ReturnType<typeof responder>) => plano.bolhas.map(bolha => bolha.texto).join(" ");

describe("nomes na conversa", () => {
  it("reconhece o próprio nome e responde na hora", () => {
    const plano = responder("Oi Marina, tudo bem com você?");
    expect(plano.eventos).toContain("nome:ela");
    expect(texto(plano)).toMatch(/chamou|tô aqui|fala|diga|prestando/i);
  });

  it("reconhece o apelido da ficha", () => {
    // A reação ao nome tem chance: basta acontecer em alguma das sementes.
    const placares = [1, 2, 3, 4, 5, 6].map(semente => responder("Mari, você viu o que eu te mandei?", semente));
    expect(placares.some(plano => plano.eventos.includes("nome:ela"))).toBe(true);
  });

  it("não usa 'chamou?' na despedida, mesmo com o nome dela na frase", () => {
    const placares = [1, 2, 3, 4, 5, 6, 7, 8].map(semente => responder("Vou dormir, boa noite Mari", semente));
    expect(placares.every(plano => !plano.eventos.includes("nome:ela"))).toBe(true);
  });

  it("entende quando você fala de um familiar pelo nome", () => {
    const plano = responder("Como tá a Ana hoje?");
    expect(plano.intencao).toBe("pergunta_familiar");
    expect(texto(plano)).toMatch(/Ana/);
  });

  it("liga o nome do familiar mesmo sem a palavra mãe, filha ou irmã", () => {
    const plano = responder("A Dona Célia melhorou da gripe?");
    expect(plano.intencao).toBe("pergunta_familiar");
    expect(texto(plano)).toMatch(/Dona Célia|Célia/);
  });

  it("mantém o tratamento no nome curto do parente", () => {
    expect(redeFamiliar(marina, pessoas).map(item => item.nome)).toContain("Dona Célia");
    expect(nomesNaMensagem("falei com a ana hoje", [{ nome: "Ana Costa" }])).toHaveLength(1);
  });

  it("percebe quando você escreve o seu próprio nome", () => {
    const plano = responder("Aqui é o Rafael, tudo bem?");
    expect(plano.eventos).toContain("nome:voce");
  });
});

describe("jeito de falar", () => {
  it("não repete a mesma resposta e varia o começo", () => {
    let estado = novoChatState(marina);
    const respostas: string[] = [];
    for (let i = 0; i < 30; i++) {
      const plano = planReply({ person: marina, persona, state: estado, message: "Oi, tudo bem? Como foi seu dia?", rand: seededRandom(i + 7), pessoas, dono: { ownerAge: 30 } });
      respostas.push(texto(plano));
      estado = plano.state;
    }
    expect(new Set(respostas).size).toBeGreaterThanOrEqual(25);
    expect(respostas.filter((item, i) => i > 0 && item === respostas[i - 1])).toHaveLength(0);
  });

  it("responde cada assunto com a leitura certa do que foi dito", () => {
    const trabalho = responder("Hoje o dia foi corrido no trabalho, cheguei agora");
    expect(trabalho.intencao).toBe("cotidiano_trabalho");
    expect(texto(trabalho)).toMatch(/trabalho|serviço|servico|correria|descans/i);

    const igreja = responder("Fui no mutirão da capela hoje");
    expect(igreja.intencao).toBe("igreja");

    const familia = responder("A Ana me mandou mensagem hoje");
    expect(familia.intencao).toBe("pergunta_familiar");
  });

  it("não deixa frase solta depois de ponto", () => {
    const respostas = Array.from({ length: 25 }, (_, i) => texto(responder("Me conta uma novidade boa", i + 1)));
    expect(respostas.every(item => !/[.!?]\s+[a-zà-ú]/.test(item))).toBe(true);
  });

  it("reconhece as intenções novas do dia a dia", () => {
    expect(detectarIntencao("Acabei de chegar, que semana pesada").id).toBe("cotidiano_trabalho");
    expect(detectarIntencao("Perdi a paciência hoje, tô exausto").id).toBe("apoio");
    expect(detectarIntencao("O que eu faço nesse caso?").id).toBe("conselho");
    expect(detectarIntencao("Você tem medo de alguma coisa?").id).toBe("pergunta_pessoal");
    expect(detectarIntencao("Tô de bobeira aqui, nada pra fazer").id).toBe("tedio");
    // Cansaço e insônia são acolhimento, não tédio.
    expect(detectarIntencao("Tô sem sono, não consigo dormir").id).toBe("apoio");
    expect(detectarIntencao("Tô cansado hoje, foi um dia corrido").id).toBe("apoio");
    expect(detectarIntencao("obrigado por tudo").id).toBe("agradecimento");
    expect(detectarIntencao("fui aprovado no processo").id).toBe("alegria");
    expect(detectarIntencao("você é maravilhosa").id).toBe("elogio");
    expect(detectarIntencao("Fui no templo domingo").id).toBe("igreja");
  });

  it("tem repertório de sobra nos bancos extras", () => {
    const amizadeSaudacao = [...(MAIS_RESPOSTAS.saudacao?.amizade || [])];
    expect(amizadeSaudacao.length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(RECEPCOES_TEMA).length).toBeGreaterThanOrEqual(10);
    expect(MAIS_RECEPCOES.positivo.length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(MAIS_PERGUNTAS).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(MAIS_SUGESTOES).length).toBeGreaterThanOrEqual(7);
  });
});

describe("entende o que você escreveu", () => {
  it("responde o que ela está fazendo agora, sem resposta genérica", () => {
    const plano = responder("O que você tá fazendo agora?");
    expect(plano.intencao).toBe("pergunta_rotina");
    expect(texto(plano)).not.toMatch(/nunca parei pra pensar/i);
  });

  it("responde quando você pergunta se ela viu o que você mandou", () => {
    expect(responder("Você viu o que eu te mandei ontem?").intencao).toBe("mensagem_enviada");
  });

  it("a resposta principal vem antes da pergunta nova", () => {
    // Antes a pergunta podia entrar primeiro e a resposta virar continuação sem pé.
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(semente => {
      const plano = responder("Tô cansado hoje, foi um dia corrido", semente);
      const principal = plano.bolhas.findIndex(bolha => /cansad|descansa|peito|for\u00e7a|respira|dormir|sono/i.test(bolha.texto));
      const pergunta = plano.bolhas.findIndex(bolha => /\?\s*$/.test(bolha.texto.trim()));
      if (principal >= 0 && pergunta >= 0) expect(principal).toBeLessThan(pergunta);
    });
  });
});

describe("sugestões de resposta", () => {
  it("oferece mais opções e sem repetir texto", () => {
    const sugestoes = sugerirRespostas({
      person: marina, persona, state: { ...novoChatState(marina), afinidade: 80 },
      mensagemDela: "Como tá a sua mãe? Manda um abraço pra ela", adulto: true, quantas: 4,
      rand: seededRandom(4), pessoas, dono: { ownerAge: 30 },
    });
    expect(sugestoes.length).toBe(4);
    expect(new Set(sugestoes.map(item => item.texto)).size).toBe(4);
    expect(sugestoes.every(item => item.motivo.length > 5)).toBe(true);
    expect(sugestoes.some(item => /família/i.test(item.motivo))).toBe(true);
  });
});
