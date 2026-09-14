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
