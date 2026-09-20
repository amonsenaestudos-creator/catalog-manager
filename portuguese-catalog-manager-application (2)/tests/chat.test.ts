import { describe, expect, it } from "vitest";
import { getDefaultPerson } from "../src/store";
import type { AppData, ChatMessage, Person } from "../src/types";
import { buildPersona, ganchoDe, seededRandom } from "../src/lib/persona";
import {
  analisarConversa, conversaParaMarkdown, detectarIntencao, estadoDe, estagioAtual, extrairMemorias, HUMORES, novoChatState,
  planOpening, planReply, planSpontaneous, sugerirAberturas, sugerirRespostas, tomEfetivo, TONS, tonsDisponiveis,
} from "../src/lib/dialogue";
import { textoParaBolhas } from "../src/lib/ia";
import { emptyData } from "../src/store";

function ficha(ajustes: Partial<Person> = {}): Person {
  const base = getDefaultPerson();
  return {
    ...base,
    id: ajustes.id || "pessoa-teste",
    nome: "Marina Costa",
    apelido: "Mari",
    idade: 27,
    descricao: "Gosta de fotografia e de café pela cidade.",
    comportamento: "Extrovertida, brincalhona e um pouco tímida no começo",
    localizacaoOnde: "trabalho",
    localizacaoSub: "",
    localizacaoMora: "Pinheiros, São Paulo",
    musicaFavorita: "Djavan",
    signo: "Escorpião",
    tags: ["amiga", "crush"],
    friendshipLevel: 3,
    rating: { ...base.rating, rosto: 4.5, belezaGeral: 4.5, cabelo: 4, comportamento: 4 },
    fotos: [{ id: "f1", personId: base.id, isMain: true, type: "normal", url: "/images/marina.jpg" }],
    ...ajustes,
  };
}

const randFixo = (semente = 7) => seededRandom(semente);
const planoBase = { person: ficha(), state: novoChatState(ficha()), rand: randFixo(), adulto: false } as const;

describe("persona derivada da ficha", () => {
  it("lê comportamento, categoria, idade e interesses", () => {
    const persona = buildPersona(ficha());
    expect(persona.adulta).toBe(true);
    expect(persona.traits.ousadia).toBeGreaterThan(0.3);
    expect(persona.traits.brincadeira).toBeGreaterThan(0.5);
    expect(persona.interesses.length).toBeGreaterThan(1);
    expect(persona.resumo).toMatch(/27 anos/);
    expect(ganchoDe(persona, randFixo()).length).toBeGreaterThan(2);
  });

  it("marca quem é reservada e quem é ousada de formas diferentes", () => {
    const timida = buildPersona(ficha({ id: "t", comportamento: "Muito tímida, envergonhada e recatada com assuntos íntimos", tags: ["conhecida"] }));
    const ousada = buildPersona(ficha({ id: "o", comportamento: "Safada, atrevida e provocante no jeito de falar", tags: ["alvo"] }));
    expect(timida.traits.timidez).toBeGreaterThan(ousada.traits.timidez);
    expect(ousada.traits.ousadia).toBeGreaterThan(timida.traits.ousadia);
    expect(ousada.traits.reserva).toBeLessThan(timida.traits.reserva);
  });

  it("nunca libera conteúdo adulto para ficha com menos de 18 anos", () => {
    const menor = ficha({ id: "menor", idade: 16 });
    const persona = buildPersona(menor);
    const estado = novoChatState(menor);
    expect(persona.adulta).toBe(false);
    expect(tonsDisponiveis(persona, estado, true).filter(tom => tom.id !== "amizade").every(tom => !tom.ok)).toBe(true);
    const plano = planReply({ person: menor, persona, state: estado, message: "Você é gostosa, manda foto pelada", adulto: true, rand: randFixo() });
    expect(plano.tom).toBe("amizade");
    expect(plano.desviado).toBe(true);
    expect(plano.bolhas[0].texto).toMatch(/não é por aí|fala de outra coisa|fingir/i);
    expect(plano.afinidade).toBeLessThan(estado.afinidade + 1);
  });

  it("mantém o tom provocante travado enquanto a química é baixa", () => {
    const person = ficha();
    const persona = buildPersona(person);
    const estado = novoChatState(person);
    estado.afinidade = 20;
    const provocante = tonsDisponiveis(persona, estado, true).find(tom => tom.id === "provocante");
    expect(provocante?.ok).toBe(false);
    expect(provocante?.motivo).toMatch(/química/i);
    expect(tomEfetivo("intenso", persona, estado, true)).toBe("amizade");
    estado.afinidade = 90;
    expect(tonsDisponiveis(persona, estado, true).find(tom => tom.id === "intenso")?.ok).toBe(true);
    expect(tomEfetivo("intenso", persona, estado, true)).toBe("intenso");
  });

  it("exige o modo adulto ligado nos Ajustes", () => {
    const person = ficha();
    const persona = buildPersona(person);
    const estado = novoChatState(person);
    estado.afinidade = 95;
    expect(tonsDisponiveis(persona, estado, false).find(tom => tom.id === "provocante")?.motivo).toMatch(/modo adulto/i);
    expect(tomEfetivo("provocante", persona, estado, false)).toBe("flerte");
  });
});

describe("motor de conversa", () => {
  it("classifica as intenções mais comuns", () => {
    expect(detectarIntencao("Oi! Tudo bem?").id).toBe("saudacao");
    expect(detectarIntencao("Você é linda demais").id).toBe("elogio");
    expect(detectarIntencao("Vamos tomar um café amanhã?").id).toBe("convite");
    expect(detectarIntencao("Manda uma foto sua").id).toBe("pedido_foto");
    expect(detectarIntencao("Tô muito triste hoje").id).toBe("apoio");
    expect(detectarIntencao("kkkkk você é bobo").id).toBe("piada");
    expect(detectarIntencao("Você é gostosa").id).toBe("elogio_corpo");
  });

  it("responde de forma diferente conforme o humor e a química sobem", () => {
    let estado = novoChatState(ficha());
    const person = ficha();
    const inicial = estado.afinidade;
    const elogio = planReply({ ...planoBase, person, state: estado, message: "Você é uma pessoa incrível, gosto muito de conversar com você" });
    expect(elogio.afinidade).toBeGreaterThan(inicial);
    estado = elogio.state;
    const ofensa = planReply({ ...planoBase, person, state: estado, message: "Você tá me evitando, demora pra responder, tá ruim de falar com você" });
    expect(ofensa.afinidade).toBeLessThan(elogio.afinidade);
    expect(ofensa.humor).toBe("fechada");
  });

  it("guarda o que você contou e usa isso depois", () => {
    const memorias = extrairMemorias("Adoro pizza de calabresa e vou viajar pra Salvador semana que vem");
    expect(memorias.length).toBeGreaterThan(0);
    expect(memorias.some(item => /pizza/i.test(item.valor))).toBe(true);
    let estado = novoChatState(ficha());
    estado = planReply({ ...planoBase, state: estado, message: "Adoro pizza de calabresa, é meu vício" }).state;
    expect(estado.lembrancas.some(item => /pizza/i.test(item.valor))).toBe(true);
    expect(Object.keys(estado.topicos).length).toBeGreaterThan(0);
    let citou = false;
    for (let i = 0; i < 40 && !citou; i++) {
      const plano = planReply({ ...planoBase, rand: randFixo(i + 1), state: estado, message: "Boa, e você? Me conta uma novidade" });
      citou = plano.bolhas.some(bolha => /pizza/i.test(bolha.texto));
      estado = plano.state;
    }
    expect(citou).toBe(true);
  });

  it("não repete a mesma resposta sempre", () => {
    let estado = novoChatState(ficha());
    const respostas: string[] = [];
    for (let i = 0; i < 25; i++) {
      const plano = planReply({ ...planoBase, state: estado, message: `Gostei muito do seu jeito ${i}` });
      respostas.push(plano.bolhas.map(bolha => bolha.texto).join(" "));
      estado = plano.state;
    }
    const distintas = new Set(respostas.map(texto => texto.replace(/\d/g, "")));
    expect(distintas.size).toBeGreaterThan(12);
  });

  it("é determinístico quando a semente é a mesma", () => {
    const primeiro = planReply({ ...planoBase, rand: randFixo(42), message: "Oi, tudo bem com você?" });
    const segundo = planReply({ ...planoBase, rand: randFixo(42), message: "Oi, tudo bem com você?" });
    expect(primeiro.bolhas.map(bolha => bolha.texto)).toEqual(segundo.bolhas.map(bolha => bolha.texto));
  });

  it("cumprimenta conforme a hora do dia", () => {
    const manha = planOpening({ person: ficha(), state: novoChatState(ficha()), rand: randFixo(), agora: new Date("2026-03-10T09:00:00") });
    const noite = planOpening({ person: ficha(), state: novoChatState(ficha()), rand: randFixo(), agora: new Date("2026-03-10T21:00:00") });
    expect(manha.bolhas[0].texto).toMatch(/Bom dia/i);
    expect(noite.bolhas[0].texto).toMatch(/Boa noite/i);
  });

  it("deixa ela puxar assunto sozinha", () => {
    const plano = planSpontaneous({ person: ficha(), state: novoChatState(ficha()), rand: randFixo(3) });
    expect(plano.bolhas.length).toBeGreaterThan(0);
    expect(plano.eventos).toContain("espontanea");
  });

  it("entra no clima quando o tom é liberado e a pessoa é adulta", () => {
    const person = ficha();
    const persona = buildPersona(person);
    const estado = novoChatState(person);
    estado.afinidade = 90;
    const plano = planReply({ person, persona, state: estado, message: "Você é gostosa 😏", tom: "provocante", adulto: true, rand: randFixo(5) });
    expect(["provocante", "intenso"]).toContain(plano.tom);
    expect(plano.desviado).toBe(false);
    expect(plano.afinidade).toBeGreaterThan(estado.afinidade);
  });
});

describe("sugestões, análise e exportação", () => {
  it("sugere aberturas diferentes conforme o estágio", () => {
    const person = ficha();
    const persona = buildPersona(person);
    const nova = novoChatState(person);
    nova.afinidade = 8;
    const conhecida = { ...nova, afinidade: 70 };
    const aberturasNova = sugerirAberturas({ person, persona, state: nova, historico: [], adulto: false, quantas: 4, rand: randFixo(1) });
    const aberturasProxima = sugerirAberturas({ person, persona, state: conhecida, historico: [], adulto: false, quantas: 4, rand: randFixo(1) });
    expect(aberturasNova.length).toBe(4);
    expect(aberturasProxima.length).toBe(4);
    expect(aberturasNova.every(item => item.texto.length > 5 && item.motivo.length > 3)).toBe(true);
    expect(aberturasNova.every(item => TONS.some(tom => tom.id === item.tom))).toBe(true);
  });

  it("sugere respostas na voz do usuário a partir da fala dela", () => {
    const person = ficha();
    const persona = buildPersona(person);
    const estado = { ...novoChatState(person), afinidade: 60 };
    const sugestoes = sugerirRespostas({ person, persona, state: estado, mensagemDela: "Oi! Como foi seu dia?", adulto: false, quantas: 3, rand: randFixo(2) });
    expect(sugestoes.length).toBeGreaterThan(0);
    expect(sugestoes.every(item => item.motivo.length > 5 && !/\btom\b/i.test(item.motivo))).toBe(true);
  });

  it("analisa e exporta a conversa salva", () => {
    const mensagens: ChatMessage[] = [
      { id: "1", personId: "p", role: "them", text: "Oi! Tudo bem?", timestamp: "2026-03-10T10:00:00.000Z" },
      { id: "2", personId: "p", role: "user", text: "Tudo! E você? Foi trabalhar hoje?", timestamp: "2026-03-10T10:02:00.000Z" },
      { id: "3", personId: "p", role: "them", text: "Fui sim, dia cheio no trabalho 😅", timestamp: "2026-03-10T10:05:00.000Z" },
    ];
    const analise = analisarConversa(mensagens);
    expect(analise.total).toBe(3);
    expect(analise.doUsuario).toBe(1);
    expect(analise.dela).toBe(2);
    expect(analise.iniciaEla).toBe(1);
    expect(analise.temas.some(tema => tema.tema === "trabalho")).toBe(true);
    const markdown = conversaParaMarkdown(ficha(), mensagens);
    expect(markdown).toMatch(/Conversa com Marina Costa/);
    expect(markdown).toMatch(/Você/);
  });

  it("o estado da conversa é inicializado com a intimidade da ficha", () => {
    const estado = novoChatState(ficha({ friendshipLevel: 5 }));
    const estagio = estagioAtual(estado);
    expect(estado.afinidade).toBeGreaterThan(40);
    expect(["conhecendo", "confiante"]).toContain(estagio.id);
    expect(HUMORES.some(humor => humor.id === estado.humor)).toBe(true);
  });

  it("lê o estado salvo nos dados do catálogo", () => {
    const data: AppData = emptyData();
    const person = ficha();
    data.people = [person];
    data.chatStates = { [person.id]: { ...novoChatState(person), afinidade: 66 } };
    expect(estadoDe(data, person).afinidade).toBe(66);
  });
});

describe("realismo do direct (palavras inteiras, risada, textão e citação)", () => {
  const person = ficha();

  it("escreve as palavras por inteiro: sem vc, tá, tô, hj, tbm ou entt", () => {
    let comAbrev = 0;
    const mensagens = ["Oi, tudo bem?", "Você tá me evitando, demora pra responder", "Tô muito cansada hoje", "Vamos marcar algo tbm?", "Entt eu vou dormir hj cedo"];
    for (let i = 0; i < 50; i++) {
      const plano = planReply({ person, state: novoChatState(person), rand: randFixo(i + 2), message: mensagens[i % mensagens.length], adulto: false });
      const texto = plano.bolhas.map(bolha => bolha.texto).join(" | ");
      if (/\b(vc|tá|tô|hj|tbm|entt|pq|blz|dps)\b/i.test(texto)) comAbrev++;
    }
    expect(comAbrev).toBe(0);
  });

  it("ri de verdade quando você manda uma piada", () => {
    let riu = 0;
    for (let i = 0; i < 20; i++) {
      const plano = planReply({ person, state: novoChatState(person), rand: randFixo(i + 5), message: "kkkkk olha essa piada sem graça", adulto: false });
      if (/kk|kakaka|haha|rs/i.test(plano.bolhas.map(bolha => bolha.texto).join(" "))) riu++;
    }
    expect(riu).toBeGreaterThan(14);
  });

  it("manda textão às vezes: bolha longa dividida em pedaços", () => {
    let longos = 0;
    for (let i = 0; i < 60; i++) {
      const plano = planReply({ person, state: novoChatState(person), rand: randFixo(i + 9), message: "Tô com aquele tédio de domingo à noite, sem fazer nada", adulto: false });
      if (plano.bolhas.some(bolha => bolha.texto.length > 110)) longos++;
    }
    expect(longos).toBeGreaterThan(3);
  });

  it("lê a citação ao responder uma mensagem antiga", () => {
    const plano = planReply({ person, state: novoChatState(person), rand: randFixo(11), message: "kkkkkk", citacao: "Bora sair hoje? Vamos no cinema?", adulto: false });
    expect(plano.intencao).toBe("convite");
  });

  it("lote de mensagens seguidas é lido como uma coisa só", () => {
    const plano = planReply({ person, state: novoChatState(person), rand: randFixo(13), message: "Oi!\nTudo bem por aí?\nAdoro pizza de calabresa, é meu vício", adulto: false });
    expect(plano.state.lembrancas.some(item => /pizza/i.test(item.valor))).toBe(true);
    expect(plano.bolhas.length).toBeGreaterThan(0);
  });
});

describe("IA opcional", () => {
  it("quebra a resposta do modelo em bolhas de direct", () => {
    const bolhas = textoParaBolhas("Oi, tudo bem?\n\nEu estava mesmo pensando em você agora.\n\"Que bom que apareceu\"");
    expect(bolhas).toEqual(["Oi, tudo bem?", "Eu estava mesmo pensando em você agora.", "Que bom que apareceu"]);
  });

  it("quebra mensagem gigante do modelo em pedaços curtinhos", () => {
    const longa = `${"Uma frase comprida de teste. ".repeat(30)}Fim.`;
    const bolhas = textoParaBolhas(longa);
    expect(bolhas.length).toBeGreaterThan(1);
    expect(bolhas.every(bolha => bolha.length <= 360)).toBe(true);
  });
});

describe("pergunta em aberto: a resposta nasce do assunto dela", () => {
  const person = ficha();

  it("nao responde 'nada a ver' quando voce responde a pergunta que ela fez", () => {
    for (let i = 1; i <= 12; i++) {
      const estado = { ...novoChatState(person), perguntaAberta: { tema: "comida", texto: "Voce ja jantou?" } };
      const plano = planReply({ person, state: estado, rand: randFixo(i), message: "ja sim", adulto: false });
      const texto = plano.bolhas.map(bolha => bolha.texto).join(" | ");
      expect(plano.eventos, texto).toContain("respondeu-aberta:comida");
      expect(texto).not.toMatch(/econ[ôo]mic|só isso|resposta seca|desembucha/i);
    }
  });

  it("perguntas de assunto diferente levam a respostas daquele assunto", () => {
    let tema = false;
    for (let i = 1; i <= 10; i++) {
      const estado = { ...novoChatState(person), perguntaAberta: { tema: "musica", texto: "Qual musica voce esta ouvindo?" } };
      const plano = planReply({ person, state: estado, rand: randFixo(i), message: "um pagode antigo aqui", adulto: false });
      expect(plano.eventos).toContain("respondeu-aberta:musica");
      const texto = plano.bolhas.map(bolha => bolha.texto).join(" | ");
      if (/música|musica|playlist|fone|tocando|canta|ouvir|humor|gosto/i.test(texto)) tema = true;
    }
    expect(tema).toBe(true);
  });

  it("'e o seu?' faz ela responder por si, no assunto da pergunta", () => {
    const estado = { ...novoChatState(person), perguntaAberta: { tema: "dia", texto: "Como foi seu dia?" } };
    const plano = planReply({ person, state: estado, rand: randFixo(5), message: "foi bom, e o seu?", adulto: false });
    const texto = plano.bolhas.map(bolha => bolha.texto).join(" | ");
    expect(plano.eventos).toContain("respondeu-aberta:dia");
    expect(texto).toMatch(/corrido|valendo|tranquil|de boa|andando bem|vida|rápido|coisa grande/i);
  });

  it("a pergunta que ela faz fica pendente no estado da conversa", () => {
    const estado = novoChatState(person);
    let pendente: { tema: string; texto: string } | null = null;
    for (let i = 0; i < 30 && !pendente; i++) {
      const plano = planReply({ person, state: estado, rand: randFixo(i + 2), message: "Boa, e voce? Me conta uma novidade", adulto: false });
      pendente = plano.state.perguntaAberta || null;
    }
    expect(pendente).toBeTruthy();
    expect(pendente!.texto.endsWith("?")).toBe(true);
  });

  it("assunto novo limpa a pergunta pendente", () => {
    const estado = { ...novoChatState(person), perguntaAberta: { tema: "comida", texto: "Voce ja jantou?" } };
    const plano = planReply({ person, state: estado, rand: randFixo(4), message: "Vamos sair hoje? Bora no cinema", adulto: false });
    expect(plano.state.perguntaAberta?.texto).not.toBe("Voce ja jantou?");
  });
});
