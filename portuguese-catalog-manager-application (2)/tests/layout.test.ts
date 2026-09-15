import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guarda o layout das conversas no computador e o acabamento do celular.
 *
 * O problema que originou este arquivo: a conversa aberta crescia junto com o
 * conteúdo, então a caixa de texto ia parar no fim da página e só aparecia
 * rolando. Agora o painel ocupa a altura da janela, o histórico rola dentro
 * dele e o campo fica preso no rodapé.
 */
const css = readFileSync(resolve(__dirname, "../src/index.css"), "utf8");
const app = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");

/** Só o trecho de um bloco de media query (até o próximo @media de primeiro nível). */
const bloco = (inicio: string) => {
  const i = css.indexOf(inicio);
  if (i < 0) return "";
  const proximo = css.indexOf("\n@media", i + inicio.length);
  return css.slice(i, proximo > i ? proximo : undefined);
};

const regra = (seletor: string) => {
  const encontros = [...css.matchAll(new RegExp(`(^|[},])\\s*${seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "gm"))];
  return encontros.map(encontro => encontro[2]).join(" | ");
};

describe("conversas no computador", () => {
  const desktop = bloco("@media (min-width: 1101px) {\n  /* O painel da conversa vira uma tela cheia da área de trabalho. */");

  it("o painel da conversa ocupa a janela e não deixa a página rolar", () => {
    expect(desktop).not.toBe("");
    const painel = desktop.match(/\.conversations-page\.open\s*\{([^}]*)\}/)?.[1] || "";
    expect(painel).toMatch(/position:\s*fixed/);
    expect(painel).toMatch(/top:\s*73px/);
    expect(painel).toMatch(/left:\s*236px/);
    expect(painel).toMatch(/bottom:\s*0/);
    expect(painel).toMatch(/display:\s*flex/);
    expect(painel).toMatch(/flex-direction:\s*column/);
    expect(painel).toMatch(/overflow:\s*hidden/);
    expect(css).toMatch(/html\.chat-aberto\s*\{\s*overflow:\s*hidden/);
  });

  it("só o histórico rola, com folga para a barra de rolagem", () => {
    const mensagens = desktop.match(/\.conversations-page\.open \.chat-messages\s*\{([^}]*)\}/)?.[1] || "";
    expect(mensagens).toMatch(/flex:\s*1 1 auto/);
    expect(mensagens).toMatch(/min-height:\s*0/);
    expect(mensagens).toMatch(/overflow-y:\s*auto/);
    expect(mensagens).toMatch(/overscroll-behavior:\s*contain/);
    expect(mensagens).toMatch(/padding:[^;]*calc\(\(100% - 880px\) \/ 2\)/);
  });

  it("a caixa de texto fica presa no rodapé do painel", () => {
    const barra = desktop.match(/\.conversations-page\.open \.chat-input-bar\s*\{([^}]*)\}/)?.[1] || "";
    expect(barra).toMatch(/position:\s*sticky/);
    expect(barra).toMatch(/bottom:\s*0/);
    expect(barra).toMatch(/flex:\s*none/);
    expect(barra).toMatch(/box-shadow:/);
    const medida = desktop.match(/\.conversations-page\.open \.chat-input-bar input\s*\{([^}]*)\}/)?.[1] || "";
    expect(medida).toMatch(/min-height:\s*44px/);
    expect(desktop).toMatch(/\.conversations-page\.open \.chat-input-bar \.btn\s*\{[^}]*min-height:\s*44px/);
  });

  it("cabeçalho, sugestões e emojis também ficam fixos", () => {
    expect(desktop).toMatch(/\.conversations-page\.open \.chat-header\s*\{[^}]*flex:\s*none/);
    expect(desktop).toMatch(/\.conversations-page\.open \.chat-icebreakers\s*\{[^}]*flex:\s*none/);
    expect(desktop).toMatch(/\.conversations-page\.open \.chat-emoji-bar\s*\{[^}]*flex:\s*none/);
    expect(desktop).toMatch(/\.conversations-page\.open \.chat-footnote\s*\{[^}]*flex:\s*none/);
  });

  it("o conteúdo da conversa fica centrado numa coluna de leitura", () => {
    expect(css).toMatch(/html\.chat-aberto/);
    const avisos = [...desktop.matchAll(/\.conversations-page\.open \.chat-aviso \{([^}]*)\}/g)].map(m => m[1]).join(" ");
    expect(avisos).toMatch(/margin-left:\s*max\(18px/);
    const cabecalho = desktop.match(/\.conversations-page\.open \.chat-header\s*\{([^}]*)\}/)?.[1] || "";
    expect(cabecalho).toMatch(/padding:\s*12px max\(18px/);
    // O alinhamento do medidor e do status vive no bloco de acabamento.
    const medidor = css.match(/\.conversations-page\.open \.chat-meter,\s*\n?\s*\.conversations-page\.open \.chat-status-row\s*\{([^}]*)\}/)?.[1] || "";
    expect(medidor).toMatch(/padding-left:\s*max\(18px/);
  });

  it("tem atalho para voltar ao fim da conversa", () => {
    const chat = readFileSync(resolve(__dirname, "../src/components/ChatSimulator.tsx"), "utf8");
    expect(chat).toMatch(/const \[noFim, setNoFim\] = useState\(true\)/);
    expect(chat).toMatch(/setNoFim\(el\.scrollHeight - el\.scrollTop - el\.clientHeight < 90\)/);
    expect(chat).toMatch(/onScroll=\{acompanharRolagem\}/);
    expect(chat).toMatch(/\{!noFim && mensagens\.length > 3 && \(/);
    const regra = css.match(/\.chat-descer \{([^}]*)\}/)?.[1] || "";
    expect(regra).toMatch(/position:\s*sticky/);
    expect(regra).toMatch(/bottom:\s*6px/);
    expect(regra).toMatch(/align-self:\s*flex-end/);
  });

  it("a lista de conversas também ganhou respiro no computador", () => {
    expect(desktop).toMatch(/\.conversations-page:not\(\.open\) \.conversation-card-main\s*\{[^}]*padding:\s*14px 16px/);
    expect(desktop).toMatch(/\.conversations-page:not\(\.open\) \.conversation-tools\s*\{[^}]*position:\s*sticky/);
  });
});

describe("acabamento do celular", () => {
  const celular = bloco("@media (max-width: 1100px) {\n\n  /* ---------------------------------------------------------------- medidas */");

  it("define medidas de toque e um conjunto de cantos arredondados", () => {
    expect(celular).toMatch(/--toque:\s*46px/);
    expect(celular).toMatch(/--raio:\s*16px/);
    expect(celular).toMatch(/--base-nav:\s*calc\(66px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    expect(celular).toMatch(/\.btn\s*\{\s*min-height:\s*var\(--toque\)/);
  });

  it("barra de topo com desfoque e título legível", () => {
    const topo = celular.match(/\.topbar\s*\{([^}]*)\}/)?.[1] || "";
    expect(topo).toMatch(/height:\s*var\(--topo\)/);
    expect(topo).toMatch(/backdrop-filter:\s*blur\(14px\)/);
    expect(celular).toMatch(/\.topbar-mobile-title\s*\{[^}]*font-size:\s*15px/);
    expect(celular).toMatch(/\.topbar \.global-search,\s*\.topbar-breadcrumb/);
  });

  it("modais viram painel inferior com alça e botão grande", () => {
    const modal = celular.match(/\.modal\s*\{([^}]*)\}/)?.[1] || "";
    expect(modal).toMatch(/border-radius:\s*22px 22px 0 0/);
    expect(modal).toMatch(/max-height:\s*94dvh/);
    expect(celular).toMatch(/\.modal::before\s*\{[^}]*border-radius:\s*999px/);
    expect(celular).toMatch(/\.modal-footer .btn\s*\{\s*flex:\s*1 1 auto/);
  });

  it("a conversa no celular reserva o teclado e a área segura", () => {
    expect(celular).toMatch(/\.chat-input-bar\s*\{[^}]*padding:\s*8px 10px calc\(8px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    // Quem sobe com o teclado é o painel inteiro, não o campo sozinho.
    expect(css).toMatch(/\.conversations-page\.open\s*\{\s*bottom:\s*var\(--altura-teclado, 0px\)/);
    expect(celular).toMatch(/\.conversations-page\.open \.chat-simulator\s*\{\s*height:\s*100dvh/);
    expect(celular).toMatch(/\.chat-bubble\s*\{\s*font-size:\s*14\.5px/);
  });

  it("cartões, listas e formulários seguem o mesmo desenho", () => {
    expect(celular).toMatch(/\.person-card, \.stat-card, \.toolbox-card, \.tierlist-card/);
    expect(celular).toMatch(/\.people-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(celular).toMatch(/input, select, textarea\s*\{\s*\n?\s*font-size:\s*16px/);
    expect(celular).toMatch(/\.general-note, \.general-note\.pinned\s*\{\s*border-left:\s*0/);
  });

  it("sem hover no dedo e sem realce azul", () => {
    expect(css).toMatch(/@media \(hover: none\) and \(max-width: 1100px\)/);
    expect(css).toMatch(/\.person-card:hover, \.conversation-card:hover,[\s\S]{0,120}transform:\s*none/);
    expect(css).toMatch(/\* \{\s*-webkit-tap-highlight-color:\s*transparent/);
  });

  it("telas estreitas e celular deitado continuam cobertos", () => {
    expect(css).toMatch(/@media \(max-width: 380px\)[\s\S]{0,300}\.stat-grid, \.agenda-numbers, \.toolbox-grid\s*\{\s*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/@media \(max-width: 900px\) and \(max-height: 460px\)[\s\S]{0,300}\.chat-icebreakers\s*\{\s*max-height:\s*24dvh/);
    expect(css).toMatch(/@media \(min-width: 761px\) and \(max-width: 1100px\)[\s\S]{0,200}\.page-content\s*\{\s*padding-bottom:\s*40px/);
  });

  it("o botão de voltar do topo continua disponível", () => {
    expect(css).toMatch(/\.mobile-back\s*\{\s*display:\s*inline-flex/);
    expect(app).toMatch(/className="mobile-back" onClick=\{voltarPagina\}/);
  });
});
