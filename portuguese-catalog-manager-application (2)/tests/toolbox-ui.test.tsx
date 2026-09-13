import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bootApp, openCatalog, seededData, seedIdb } from "./catalog.test";

async function goto(label: RegExp) {
  const aside = document.querySelector(".sidebar") as HTMLElement;
  const button = within(aside).getByRole("button", { name: label }) as HTMLElement;
  await act(async () => { button.click(); });
}

const clicar = async (elemento: HTMLElement) => { await act(async () => { elemento.click(); }); };

/** Escreve na busca como um usuário faria, sem depender do foco (que varia no jsdom). */
async function buscar(texto: string) {
  const campo = screen.getByLabelText(/Buscar ferramenta/i) as HTMLInputElement;
  const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    definir.call(campo, texto);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(campo.value).toBe(texto);
  return campo;
}

/** Abre o cartão da ferramenta pelo nome exato. */
async function abrirFerramenta(nome: RegExp) {
  await waitFor(() => {
    const cartoes = [...document.querySelectorAll<HTMLElement>(".tool-card")];
    expect(cartoes.some(item => nome.test(item.textContent || "")), `cartão ${nome} na lista`).toBe(true);
  });
  const cartao = [...document.querySelectorAll<HTMLElement>(".tool-card")].find(item => nome.test(item.textContent || ""))!;
  await clicar(cartao);
}

describe("tela Ferramentas", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("abre pela barra lateral e mostra as 50 ferramentas em cinco grupos", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ferramentas/i);
    await waitFor(() => expect(document.querySelector(".toolbox-page")).toBeTruthy());
    expect(document.querySelectorAll(".tool-card").length).toBe(50);
    expect(screen.getByText(/^50 ferramentas$/i)).toBeInTheDocument();
    for (const grupo of [/Catálogo e dados/i, /Organização em lote/i, /Conversa e social/i, /Meu espaço e rotina/i, /Utilidades do dia a dia/i]) {
      expect(screen.getByRole("button", { name: grupo })).toBeInTheDocument();
    }
  });

  it("filtra pela busca e roda uma ferramenta de cálculo", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ferramentas/i);
    await waitFor(() => expect(document.querySelector(".toolbox-page")).toBeTruthy());

    await buscar("dividir");
    await abrirFerramenta(/Dividir a conta/i);
    await waitFor(() => expect(screen.getByLabelText(/Valor total/i)).toBeTruthy());

    const total = screen.getByLabelText(/Valor total/i) as HTMLInputElement;
    await user.clear(total);
    await user.type(total, "120");
    const pessoas = screen.getByLabelText(/Quantas pessoas/i) as HTMLInputElement;
    await user.clear(pessoas);
    await user.type(pessoas, "4");
    await clicar(screen.getByRole("button", { name: /Executar/i }));
    await waitFor(() => expect(screen.getByText(/Cada pessoa paga/i)).toBeInTheDocument());
    expect(screen.getByText(/Cada pessoa paga: R\$ 33,00/)).toBeInTheDocument();
  });

  it("roda uma ferramenta de leitura do catálogo sem alterar nada", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ferramentas/i);
    await waitFor(() => expect(document.querySelector(".toolbox-page")).toBeTruthy());
    await buscar("aniversário");
    await abrirFerramenta(/Aniversários e idades/i);
    await clicar(screen.getByRole("button", { name: /Executar/i }));
    await waitFor(() => expect(document.querySelector(".tool-output")).toBeTruthy());
    const saida = document.querySelector(".tool-output") as HTMLElement;
    expect(saida.textContent || "").toMatch(/aniversári|idade|anos/i);
  });
});

describe("conversa simulada 2.0", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  async function abrirChat() {
    await openCatalog();
    const nome = document.querySelector(".person-card .card-name-row button") as HTMLElement;
    await clicar(nome);
    const conversar = await screen.findByRole("button", { name: /Conversar/i });
    await clicar(conversar);
    await waitFor(() => expect(document.querySelector(".chat-simulator")).toBeTruthy());
  }

  it("mostra a química, o estágio e o humor sem pedir escolha nenhuma", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirChat();

    await waitFor(() => expect(document.querySelector(".chat-meter")).toBeTruthy());
    expect(document.querySelector(".chat-meter")?.textContent).toMatch(/Química/);
    // O clima e o humor são automáticos: o cabeçalho só informa.
    expect(document.querySelector(".chat-tone-bar")).toBeNull();
    expect(document.querySelector(".chat-mood-bar")).toBeNull();
    const linha = document.querySelector(".chat-status-row") as HTMLElement;
    expect(linha.textContent).toMatch(/Humor/);
    expect(linha.querySelectorAll("button")).toHaveLength(1);
    expect(linha.querySelector("button")?.textContent).toMatch(/Deixar puxar|Puxando sozinha/);
  });

  it("abre o cartão da persona com os dados lidos da ficha", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirChat();
    await clicar(screen.getByLabelText(/Mais opções/i));
    await clicar(screen.getByRole("button", { name: /Como ela conversa/i }));
    await waitFor(() => expect(document.querySelector(".persona-card")).toBeTruthy());
    expect(document.querySelector(".persona-card")?.textContent).toMatch(/Intimidade hoje/i);
    expect(document.querySelector(".persona-card")?.textContent).toMatch(/Conteúdo adulto/i);
  });

  it("aceita uma mensagem, responde e salva o estado da conversa", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await abrirChat();
    const campo = await screen.findByLabelText("Mensagem");
    await user.type(campo, "Oi! Tudo bem? Como foi seu dia?");
    const enviar = document.querySelector(".chat-input-bar .btn-primary") as HTMLElement;
    expect(enviar, "botão de enviar mensagem").toBeTruthy();
    await clicar(enviar);
    await waitFor(() => expect((document.querySelector(".chat-bubble.user")?.textContent || "")).toMatch(/Como foi seu dia\?/));
    await waitFor(() => expect(document.querySelectorAll(".chat-bubble.them").length).toBeGreaterThan(0), { timeout: 12000 });
    expect(screen.getByText(/Conversa simulada com base na ficha/i)).toBeInTheDocument();
  });
});

describe("Ajustes → Conversas", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("liga e desliga o modo adulto com aviso claro", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await goto(/Ajustes/i);
    await waitFor(() => expect(document.querySelector(".settings-page")).toBeTruthy());

    const aba = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(botao => /Conversas/i.test(botao.textContent || ""));
    expect(aba, "aba Conversas em Ajustes").toBeTruthy();
    await clicar(aba!);

    await waitFor(() => expect(screen.getByText(/Como a conversa simulada se comporta/i)).toBeInTheDocument());
    const adulto = screen.getByLabelText(/Ligar o modo adulto/i) as HTMLInputElement;
    expect(adulto.checked).toBe(false);
    await clicar(adulto);
    await waitFor(() => expect((screen.getByLabelText(/Ligar o modo adulto/i) as HTMLInputElement).checked).toBe(true));
    expect(screen.getByText(/Fichas com menos de 18 anos nunca entram no flerte/i)).toBeInTheDocument();
    await clicar(screen.getByLabelText(/Mostrar o medidor de química/i));
    expect(screen.getByLabelText(/Respostas rápidas/i)).toBeInTheDocument();
  });
});
