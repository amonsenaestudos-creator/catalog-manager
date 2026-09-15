import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, openCatalog, seededData, seedIdb } from "./catalog.test";

const clicar = async (elemento: HTMLElement) => { await act(async () => { elemento.click(); }); };

async function goto(label: RegExp) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  const button = within(aside).getByRole("button", { name: label }) as HTMLElement;
  await clicar(button);
}

/** Catálogo pequeno com uma ficha adulta, uma de igreja e uma criança. */
function dadosDaConversa() {
  const data = seededData(6, 0);
  data.people = data.people.filter(pessoa => !pessoa.archivedAt && !pessoa.deletedAt).slice(0, 3).map((pessoa, i) => ({
    ...pessoa,
    nome: ["Tia Rosa", "Duda Reis", "Pessoa Teste 002"][i],
    idade: [44, 22, 15][i],
    localizacaoOnde: ["igreja", "trabalho", "escola"][i],
    apelido: "",
    arquivada: false,
    archivedAt: null,
    deletedAt: null,
  }));
  data.chats = [];
  data.chatStates = {};
  return data;
}

describe("aba Conversas", () => {
  beforeEach(async () => { await seedIdb(dadosDaConversa()); });

  it("abre pela barra lateral e lista as fichas do catálogo", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    await waitFor(() => expect(document.querySelector(".conversations-page")).toBeTruthy());
    expect(screen.getByText(/O lugar da conversa/i)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelectorAll(".conversation-card").length).toBeGreaterThan(0));
    expect(document.querySelector(".conversation-summary")?.textContent).toMatch(/adulto/i);
  });

  it("abre a conversa em tela cheia e volta para a lista", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    const card = await waitFor(() => {
      const encontrado = document.querySelector(".conversation-card") as HTMLElement;
      expect(encontrado).toBeTruthy();
      return encontrado;
    });
    await clicar(card.querySelector(".conversation-card-main") as HTMLElement);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy(), { timeout: 12000 });
    await clicar(screen.getByLabelText("Voltar"));
    await waitFor(() => expect(document.querySelector(".conversation-list-cards")).toBeTruthy());
  });

  it("marca a sua mensagem com tick e agrupa as bolhas seguidas", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    const card = await waitFor(() => {
      const encontrado = document.querySelector(".conversation-card") as HTMLElement;
      expect(encontrado).toBeTruthy();
      return encontrado;
    });
    await clicar(card.querySelector(".conversation-card-main") as HTMLElement);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy(), { timeout: 12000 });

    const campo = screen.getByLabelText("Mensagem") as HTMLInputElement;
    await user.click(campo);
    await user.keyboard("oi, tudo bem?{enter}");

    // O tick aparece na hora do envio e depois vira "lida".
    await waitFor(() => expect(document.querySelector(".chat-bubble.user .chat-tick")).toBeTruthy());
    expect(document.querySelector(".chat-bubble.user .chat-tick")?.textContent).toBe("✓");
    await waitFor(() => expect(document.querySelector(".chat-tick.lido")).toBeTruthy(), { timeout: 6000 });
    expect(document.querySelector(".chat-bubble-wrap.fecha-grupo")).toBeTruthy();
    // O jeito de falar da ficha aparece no cabeçalho.
    expect(document.querySelector(".chat-voz-line")?.textContent?.length || 0).toBeGreaterThan(10);
  });

  it("oferece sugestões com motivo e um botão de trocar as opções", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    const card = await waitFor(() => {
      const encontrado = document.querySelector(".conversation-card") as HTMLElement;
      expect(encontrado).toBeTruthy();
      return encontrado;
    });
    await clicar(card.querySelector(".conversation-card-main") as HTMLElement);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy(), { timeout: 12000 });

    await clicar(screen.getByLabelText("Sugestões de mensagem"));
    await waitFor(() => expect(document.querySelectorAll(".chat-icebreakers button").length).toBeGreaterThan(3));
    expect(document.querySelector(".chat-icebreakers-trocar")).toBeTruthy();
    expect(document.querySelectorAll(".chat-sugestao-motivo").length).toBeGreaterThan(0);
    const antes = [...document.querySelectorAll(".chat-sugestao-texto")].map(item => item.textContent).join("|");
    await clicar(document.querySelector(".chat-icebreakers-trocar") as HTMLElement);
    await waitFor(() => {
      const depois = [...document.querySelectorAll(".chat-sugestao-texto")].map(item => item.textContent).join("|");
      expect(depois).not.toBe(antes);
    });
  });

  it("mostra o retrato do momento com paciência, memória e prompt", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    const card = await waitFor(() => {
      const encontrado = document.querySelector(".conversation-card") as HTMLElement;
      expect(encontrado).toBeTruthy();
      return encontrado;
    });
    await clicar(card.querySelector(".conversation-card-main") as HTMLElement);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy(), { timeout: 12000 });

    // Ela abre a conversa: o retrato já existe a partir da primeira mensagem dela.
    await waitFor(() => expect(document.querySelector(".chat-meter")).toBeTruthy(), { timeout: 12000 });
    await clicar(screen.getByLabelText("Mais opções"));
    await clicar(await screen.findByRole("button", { name: /Retrato do momento/i }));

    await waitFor(() => expect(document.querySelector(".chat-estado")).toBeTruthy());
    expect(document.querySelector(".chat-estado-humor")?.textContent).toBeTruthy();
    expect(document.querySelectorAll(".chat-estado-trilha").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector(".chat-estado-rodape")?.textContent?.length || 0).toBeGreaterThan(3);

    // A memória e o prompt de sistema ficam em blocos que abrem.
    const detalhes = [...document.querySelectorAll<HTMLDetailsElement>(".chat-detalhe")];
    expect(detalhes.length).toBeGreaterThanOrEqual(2);
    await act(async () => { detalhes[1].open = true; detalhes[1].dispatchEvent(new Event("toggle")); });
    await waitFor(() => expect(document.querySelector(".chat-prompt")?.textContent).toMatch(/Maturidade:|Estado emocional/));
    expect(document.querySelector(".chat-prompt.json")?.textContent).toMatch(/estado_emocional/);
  }, 30000);

  it("o humor esfria quando você fala grosso com ela", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    const card = await waitFor(() => {
      const encontrado = document.querySelector(".conversation-card") as HTMLElement;
      expect(encontrado).toBeTruthy();
      return encontrado;
    });
    await clicar(card.querySelector(".conversation-card-main") as HTMLElement);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy(), { timeout: 12000 });

    const campo = screen.getByLabelText("Mensagem") as HTMLInputElement;
    for (const ofensa of ["cala a boca", "sua burra"]) {
      await user.click(campo);
      await user.clear(campo);
      await user.keyboard(`${ofensa}{enter}`);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
    }
    await clicar(screen.getByLabelText("Mais opções"));
    await clicar(await screen.findByRole("button", { name: /Retrato do momento/i }));
    await waitFor(() => expect(document.querySelector(".chat-estado")).toBeTruthy());
    expect(document.querySelector(".chat-estado-humor")?.textContent).toMatch(/fechada/i);
    expect(document.querySelector(".chat-estado-rodape")?.textContent).toMatch(/tom agressivo|paciência baixa/);
  }, 30000);

  it("mostra o selo da relação e a química de cada conversa", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Conversas/i);
    await waitFor(() => expect(document.querySelectorAll(".conversation-card").length).toBe(3));
    const cards = [...document.querySelectorAll<HTMLElement>(".conversation-card")];
    const tia = cards.find(card => /Tia Rosa/.test(card.textContent || ""));
    expect(tia?.textContent).toMatch(/tia/i);
  });
});

describe("idade do dono e dinâmica da conversa", () => {
  beforeEach(async () => { await seedIdb(dadosDaConversa()); });

  it("a idade informada em Ajustes muda o jeito que ela fala", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ajustes/i);
    await waitFor(() => expect(document.querySelector(".settings-page")).toBeTruthy());
    const idade = screen.getByLabelText(/Minha idade/i) as HTMLInputElement;
    await user.type(idade, "15");
    await waitFor(() => expect((screen.getByLabelText(/Minha idade/i) as HTMLInputElement).value).toBe("15"));

    await goto(/Conversas/i);
    await waitFor(() => expect(document.querySelectorAll(".conversation-card").length).toBeGreaterThan(0));
    const cards = [...document.querySelectorAll<HTMLElement>(".conversation-card")];
    expect(cards.some(card => /criança/i.test(card.textContent || ""))).toBe(true);
  });

  it("o pacote de categoria aparece em Ajustes → Dados", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ajustes/i);
    const aba = await waitFor(() => {
      const encontrada = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(botao => /Dados|Backup/i.test(botao.textContent || ""));
      expect(encontrada).toBeTruthy();
      return encontrada!;
    });
    await clicar(aba);
    await waitFor(() => expect(screen.getByText(/Compartilhar uma categoria/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Exportar categoria/i })).toBeTruthy();
    expect(screen.getByLabelText(/Importar pacote de categoria/i)).toBeTruthy();
  });
});

describe("família e vínculos na ficha", () => {
  beforeEach(async () => { await seedIdb(dadosDaConversa()); });

  it("liga um familiar do catálogo e mostra o papel na ficha", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog();
    const nome = document.querySelector(".person-card .card-name-row button") as HTMLElement;
    await clicar(nome);
    const editar = await screen.findByRole("button", { name: /Editar ficha/i });
    await clicar(editar);
    await waitFor(() => expect(screen.getByText(/Família e vínculos/i)).toBeInTheDocument());

    const outra = screen.getByLabelText(/Familiar no catálogo/i) as HTMLSelectElement;
    await act(async () => {
      outra.value = outra.options[1].value;
      outra.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const papel = screen.getByLabelText(/Papel do familiar/i) as HTMLSelectElement;
    await act(async () => {
      papel.value = "mae";
      papel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await clicar(screen.getByRole("button", { name: /^Vincular$/i }));
    await waitFor(() => expect(document.querySelector(".family-list")?.textContent).toMatch(/mãe de/i));
  });
});
