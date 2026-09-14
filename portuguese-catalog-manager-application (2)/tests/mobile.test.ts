import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guarda o layout de celular.
 *
 * Não dá para medir a tela sem navegador, mas dá para garantir que as regras
 * que fazem o app caber na mão continuam no lugar: nada de largura mínima
 * fixa, gaveta de menu, barra de baixo com alvo de dedo, conversa em tela
 * cheia e folga para a barra do sistema (safe area).
 */
const css = readFileSync(resolve(__dirname, "../src/index.css"), "utf8");
const app = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");
const sidebar = readFileSync(resolve(__dirname, "../src/components/Sidebar.tsx"), "utf8");
const conversas = readFileSync(resolve(__dirname, "../src/components/Conversations.tsx"), "utf8");
const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");

const blocoMobile = (inicio: string) => {
  const i = css.indexOf(inicio);
  if (i < 0) return "";
  // Do começo do bloco até a próxima regra @media de primeiro nível.
  const proximo = css.indexOf("\n@media", i + inicio.length);
  return css.slice(i, proximo > i ? proximo : undefined);
};

const regra = (seletor: string) => {
  const encontros = [...css.matchAll(new RegExp(`(^|[},])\\s*${seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "gm"))];
  return encontros.map(encontro => encontro[2]).join(" ");
};

describe("layout de celular", () => {
  it("não força largura de desktop no corpo", () => {
    const corpo = regra("body");
    expect(corpo).not.toMatch(/min-width:\s*1[0-9]{3}px/);
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it("tem a meta viewport com recorte de tela cheia", () => {
    expect(html).toMatch(/name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/viewport-fit=cover/);
  });

  it("esconde o que é só do celular no desktop e vice-versa", () => {
    expect(css).toMatch(/\.mobile-menu-trigger,\s*\.topbar-mobile-title,\s*\.mobile-bottom-nav,\s*\.sidebar-close\s*\{\s*display:\s*none/);
    const celular = blocoMobile("@media (max-width: 760px)");
    expect(celular).toMatch(/\.mobile-bottom-nav\s*\{[^}]*display:\s*flex/);
    const tablet = blocoMobile("@media (max-width: 1100px)");
    expect(tablet).toMatch(/\.mobile-menu-trigger\s*\{\s*display:\s*inline-flex/);
  });

  it("transforma a barra lateral em gaveta no celular", () => {
    const tablet = blocoMobile("@media (max-width: 1100px)");
    expect(tablet).toMatch(/\.sidebar\s*\{[^}]*transform:\s*translateX\(-101%\)/);
    expect(tablet).toMatch(/\.sidebar\.mobile-open\s*\{[^}]*transform:\s*none/);
    expect(tablet).toMatch(/\.sidebar-scrim\.open/);
    expect(tablet).toMatch(/\.workspace\s*\{\s*margin-left:\s*0/);
  });

  it("dá alvo de dedo na navegação de baixo", () => {
    const celular = blocoMobile("@media (max-width: 760px)");
    const botao = celular.match(/\.mobile-bottom-nav button\s*\{([^}]*)\}/)?.[1] || "";
    const altura = Number(botao.match(/min-height:\s*([0-9]+)px/)?.[1] || 0);
    expect(altura).toBeGreaterThanOrEqual(44);
    const icone = celular.match(/\.chat-input-bar \.icon-btn\s*\{([^}]*)\}/)?.[1] || "";
    expect(Number(icone.match(/width:\s*([0-9]+)px/)?.[1] || 0)).toBeGreaterThanOrEqual(40);
    expect(celular).toMatch(/input,\s*select,\s*textarea\s*\{\s*font-size:\s*15px/);
  });

  it("respeita a barra do sistema (safe area)", () => {
    expect(css).toMatch(/padding:[^;]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.mobile-bottom-nav\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.chat-input-bar\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.sidebar\s*\{[^}]*env\(safe-area-inset-top/);
  });

  it("abre a conversa em tela cheia no celular", () => {
    const celular = blocoMobile("@media (max-width: 760px)");
    expect(celular).toMatch(/\.conversations-page\.open\s*\{[^}]*position:\s*fixed/);
    expect(celular).toMatch(/100dvh/);
    expect(celular).toMatch(/\.chat-aberto \.mobile-bottom-nav/);
    expect(celular).toMatch(/\.chat-aberto \.topbar/);
    expect(conversas).toMatch(/chat-aberto/);
  });

  it("derruba as grades para uma coluna", () => {
    const tablet = blocoMobile("@media (max-width: 1100px)");
    expect(tablet).toMatch(/\.home-main-grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    const celular = blocoMobile("@media (max-width: 760px)");
    expect(celular).toMatch(/\.form-grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(celular).toMatch(/\.people-grid[^}]*repeat\(auto-fill,\s*minmax\(1[0-9]{2}px/);
  });

  it("mantém os modais dentro da tela", () => {
    const celular = blocoMobile("@media (max-width: 760px)");
    expect(celular).toMatch(/\.modal-overlay\s*\{[^}]*padding:\s*0/);
    expect(celular).toMatch(/\.modal,\s*\.modal-wide,\s*\.lightbox-modal\s*\{[^}]*width:\s*100%/);
    expect(celular).toMatch(/max-height:\s*94dvh/);
  });

  it("sobe a conversa quando o teclado do aparelho aparece", () => {
    expect(css).toMatch(/--altura-teclado/);
    expect(css).toMatch(/\.conversations-page\.open\s*\{[^}]*bottom:\s*var\(--altura-teclado/);
    expect(conversas).toMatch(/visualViewport/);
    expect(conversas).toMatch(/--altura-teclado/);
  });

  it("corta o que estoura sem criar rolagem lateral", () => {
    expect(css).toMatch(/overflow-x:\s*clip/);
    expect(css).toMatch(/\.ranking-list table\s*\{[^}]*min-width/);
  });

  it("mostra a navegação de baixo e o atalho de menu na interface", () => {
    const botoes = app.match(/<nav className="mobile-bottom-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    expect(botoes).toBeTruthy();
    expect((botoes.match(/<button/g) || []).length).toBe(5);
    expect(botoes).toMatch(/Início/);
    expect(botoes).toMatch(/Catálogo/);
    expect(botoes).toMatch(/Buscar/);
    expect(botoes).toMatch(/Menu/);
    expect(app).toMatch(/className="mobile-menu-trigger"/);
    expect(app).toMatch(/className="topbar-mobile-title"/);
    expect(sidebar).toMatch(/sidebar-scrim/);
    expect(sidebar).toMatch(/className="sidebar-close"/);
  });
});

/**
 * Tela de toque: o dedo não tem hover. Nada pode depender do mouse para
 * aparecer, e as instruções precisam ensinar o caminho que funciona no dedo.
 */
const blocoToque = () => blocoMobile("@media (hover: none)");

describe("tela de toque", () => {
  it("não esconde botões atrás do hover", () => {
    const toque = blocoToque();
    expect(toque).not.toBe("");
    expect(toque).toMatch(/\.general-note\s*\.icon-btn,\s*\.board-card-grip\s*>\s*div[\s\S]{0,120}opacity:\s*1/);
    expect(toque).toMatch(/\.tier-chip-actions\s*\.icon-btn\s*\{[^}]*width:\s*38px/);
    expect(toque).toMatch(/\.tier-row-controls\s*\.icon-btn\s*\{[^}]*width:\s*38px/);
    expect(toque).toMatch(/\.general-note\s*\.icon-btn\s*\{\s*width:\s*38px/);
  });

  it("cresce os alvos de dedo e evita zoom involuntário", () => {
    const toque = blocoToque();
    expect(toque).toMatch(/touch-action:\s*manipulation/);
    expect(toque).toMatch(/input,\s*select,\s*textarea\s*\{\s*font-size:\s*16px/);
    expect(toque).toMatch(/overscroll-behavior:\s*contain/);
  });

  it("tira o pino de arrastar onde ele não funciona", () => {
    expect(blocoToque()).toMatch(/\.tier-person\s+\.grip\s*\{\s*display:\s*none/);
  });

  it("usa a altura visível do navegador de celular", () => {
    expect(css).toMatch(/@supports\s*\(height:\s*100dvh\)[\s\S]{0,200}?\.app-shell\s*\{\s*min-height:\s*100dvh/);
    expect(css).toMatch(/@supports\s*\(height:\s*100svh\)[\s\S]{0,200}?\.login-page,\s*\.loading-screen\s*\{\s*min-height:\s*100svh/);
  });

  it("troca a instrução de arrastar pela do toque", async () => {
    const tierlists = readFileSync(resolve(__dirname, "../src/components/TierLists.tsx"), "utf8");
    const folders = readFileSync(resolve(__dirname, "../src/components/Folders.tsx"), "utf8");
    expect(tierlists).toMatch(/instrucaoMover\(\s*'Arraste para organizar[^)]*'Toque no botão ↔/);
    expect(tierlists).toMatch(/ehToque\(\)\s*\?\s*<>/);
    expect(folders).toMatch(/instrucaoMover\('arraste uma pasta sobre outra para aninhar',\s*'use Editar pasta/);

    const { ehToque, instrucaoMover } = await import("../src/lib/dispositivo");
    const original = window.matchMedia;
    try {
      (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true });
      expect(ehToque()).toBe(true);
      expect(instrucaoMover("arraste", "toque")).toBe("toque");
      (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false });
      expect(ehToque()).toBe(false);
      expect(instrucaoMover("arraste", "toque")).toBe("arraste");
      (window as unknown as { matchMedia: unknown }).matchMedia = undefined;
      expect(ehToque()).toBe(false);
    } finally {
      (window as unknown as { matchMedia: unknown }).matchMedia = original;
    }
  });
});

/**
 * A gaveta de menu, no celular, precisa se comportar como uma tela: fundo
 * travado e o voltar do aparelho fechando o menu em vez de sair do app.
 */
describe("gaveta como tela", () => {
  it("trava a rolagem do fundo e cuida das sobras de tela", () => {
    expect(css).toMatch(/html\.menu-aberto,\s*html\.menu-aberto body\s*\{\s*overflow:\s*hidden/);
    expect(css).toMatch(/\.sidebar\s*\{[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/img,\s*video,\s*canvas\s*\{\s*max-width:\s*100%/);
    expect(css).toMatch(/\.nav-item,\s*\.sidebar \.new-features-link\s*\{\s*min-height:\s*46px/);
    expect(css).toMatch(/orientation:\s*landscape[\s\S]{0,240}env\(safe-area-inset-left\)/);
  });

  it("liga o estado do menu ao histórico do aparelho", () => {
    expect(sidebar).toMatch(/classList\.add\('menu-aberto'\)/);
    expect(sidebar).toMatch(/classList\.remove\('menu-aberto'\)/);
    expect(sidebar).toMatch(/pushState\(\{\s*menuAberto:\s*true\s*\}/);
    expect(sidebar).toMatch(/addEventListener\('popstate'/);
  });

  it("abre pelo botão, trava o fundo e fecha no voltar do aparelho", async () => {
    const { act, waitFor } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { bootApp, seededData, seedIdb } = await import("./catalog.test");
    await seedIdb(seededData());
    const user = userEvent.setup();
    await bootApp(user);

    const gatilho = document.querySelector<HTMLElement>(".mobile-menu-trigger");
    expect(gatilho, "botão de abrir o menu").toBeTruthy();
    await act(async () => { gatilho!.click(); });
    await waitFor(() => expect(document.querySelector(".sidebar.mobile-open")).toBeTruthy());
    expect(document.documentElement.classList.contains("menu-aberto")).toBe(true);

    await act(async () => { window.dispatchEvent(new PopStateEvent("popstate")); });
    await waitFor(() => expect(document.querySelector(".sidebar.mobile-open")).toBeFalsy());
    expect(document.documentElement.classList.contains("menu-aberto")).toBe(false);
  }, 20000);
});
