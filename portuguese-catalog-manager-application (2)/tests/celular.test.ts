import { cssDoApp } from "./css-fonte";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Sistema visual do celular.
 *
 * A rodada 14 juntou o celular numa linguagem só: medidas, doca de baixo,
 * gaveta, conversa, folhas de modal e listas. Estes testes seguram as decisões
 * que fazem o app parecer aplicativo de celular — e não site espremido — sem
 * precisar de navegador para medir.
 */
// o CSS do app como o navegador vê: os três arquivos, na ordem da porta de entrada
const css = cssDoApp;
const app = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");
const previa = readFileSync(resolve(__dirname, "../src/preview/celular.ts"), "utf8");
const ui = readFileSync(resolve(__dirname, "../src/components/ui.tsx"), "utf8");

/** Do comentário de um tópico até o comentário do próximo (ou até o fim). */
const daqui = (inicio: string, fim?: string) => {
  const i = css.indexOf(inicio);
  if (i < 0) return "";
  const j = fim ? css.indexOf(fim, i + inicio.length) : -1;
  return css.slice(i, j > i ? j : undefined);
};
const sistema = daqui("14. Celular — sistema visual", "14.9 a doca de baixo");
/** Última declaração de uma propriedade numa regra, considerando a cascata. */
const valor = (trecho: string, seletor: string, propriedade: string) => {
  const regras = [...trecho.matchAll(new RegExp(`${seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g"))];
  const ultimo = regras.map(r => r[1].match(new RegExp(`${propriedade}:\\s*([^;]+)`))?.[1]?.trim()).filter(Boolean).pop();
  return ultimo || "";
};

describe("sistema visual do celular", () => {
  it("tem um bloco só para o celular, com medidas próprias", () => {
    expect(sistema).not.toBe("");
    expect(sistema).toMatch(/--toque:\s*48px/);
    expect(sistema).toMatch(/--raio:\s*18px/);
    expect(sistema).toMatch(/--raio-g:\s*24px/);
    expect(sistema).toMatch(/--topo:\s*54px/);
    expect(sistema).toMatch(/--base-nav:\s*calc\(80px/);
    expect(sistema).toMatch(/--grad:\s*linear-gradient/);
  });

  it("não soma duas folgas no fim da tela", () => {
    /* Antes: 78px da casca + 88px da barra + 22px do conteúdo = tela vazia. */
    expect(sistema).toMatch(/\.workspace\s*\{\s*padding-bottom:\s*0/);
    expect(sistema).toMatch(/\.page-content\s*\{[^}]*padding:\s*14px 14px calc\(var\(--base-nav\) \+ 14px\)/);
  });

  it("a doca de baixo flutua, com o mais elevado de verdade", () => {
    const doca = daqui("14.9 a doca de baixo", "14.10 gaveta");
    expect(doca).toMatch(/\.mobile-bottom-nav\s*\{[^}]*left:\s*10px/);
    expect(doca).toMatch(/\.mobile-bottom-nav\s*\{[^}]*border-radius:\s*var\(--raio-g\)/);
    expect(doca).toMatch(/\.mobile-bottom-nav\s*\{[^}]*env\(safe-area-inset-bottom/);
    const botao = doca.match(/\.mobile-bottom-nav button\s*\{([^}]*)\}/)?.[1] || "";
    expect(Number(botao.match(/min-height:\s*([0-9]+)px/)?.[1] || 0)).toBeGreaterThanOrEqual(44);
    /* o botão de adicionar perde o gradiente: quem brilha é o círculo */
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add\s*\{[^}]*background:\s*none/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add\s*\{[^}]*box-shadow:\s*none !important/);
    const circulo = doca.match(/\.mobile-bottom-nav \.mobile-add span\s*\{([^}]*)\}/)?.[1] || "";
    expect(circulo).toMatch(/width:\s*48px/);
    expect(circulo).toMatch(/margin-top:\s*-20px/);
    expect(circulo).toMatch(/background:\s*var\(--grad\)/);
  });

  it("a aba ativa é marcada por trás do ícone", () => {
    const doca = daqui("14.9 a doca de baixo", "14.10 gaveta");
    expect(doca).toMatch(/\.mobile-bottom-nav button\.active\s*\{[^}]*background:\s*var\(--accent-soft\)/);
    expect(doca).toMatch(/\.mobile-bottom-nav button\.active::before\s*\{\s*display:\s*none/);
  });

  it("a gaveta de menu vira painel de dedo", () => {
    const gaveta = daqui("14.10 gaveta de menu", "14.11 conversa");
    expect(gaveta).toMatch(/\.sidebar\s*\{[^}]*border-radius:\s*0 var\(--raio-g\)/);
    expect(gaveta).toMatch(/\.nav-item\s*\{[^}]*min-height:\s*50px/);
    expect(gaveta).toMatch(/\.nav-item\.active::before/);
    expect(gaveta).toMatch(/\.sidebar-scrim\s*\{[^}]*backdrop-filter/);
  });

  it("o cabeçalho da conversa não é uma parede de texto", () => {
    const conversa = daqui("14.11 conversa no celular", "14.12 avisos");
    expect(conversa).toMatch(/\.chat-persona-line\s*\{\s*display:\s*none/);
    expect(conversa).toMatch(/\.chat-voz-line\s*\{\s*display:\s*none/);
    expect(conversa).toMatch(/\.chat-relation-line\s*\{[^}]*border-radius:\s*999px/);
    expect(conversa).toMatch(/\.chat-status-row\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(conversa).toMatch(/\.chat-status-label\s*\{\s*display:\s*none/);
  });

  it("as sugestões deslizam de lado, uma por vez", () => {
    const conversa = daqui("14.11 conversa no celular", "14.12 avisos");
    const caixa = conversa.match(/\.chat-icebreakers\s*\{([^}]*)\}/)?.[1] || "";
    expect(caixa).toMatch(/grid-auto-flow:\s*column/);
    expect(caixa).toMatch(/scroll-snap-type:\s*x mandatory/);
    expect(caixa).toMatch(/overflow-x:\s*auto/);
    expect(caixa).toMatch(/max-height:\s*none/);
    expect(conversa).toMatch(/\.chat-icebreakers-title\s*\{\s*grid-column:\s*1 \/ -1/);
  });

  it("o campo de escrita é uma barra de vidro com o enviar em gradiente", () => {
    const conversa = daqui("14.11 conversa no celular", "14.12 avisos");
    const barra = conversa.match(/\.chat-input-bar\s*\{([^}]*)\}/)?.[1] || "";
    expect(barra).toMatch(/env\(safe-area-inset-bottom/);
    expect(barra).toMatch(/backdrop-filter/);
    expect(conversa).toMatch(/\.chat-input-bar input\s*\{[^}]*border-radius:\s*999px/);
    expect(conversa).toMatch(/\.chat-input-bar \.btn\s*\{[^}]*background:\s*var\(--grad\)/);
    /* o teclado do aparelho continua empurrando a conversa para cima */
    expect(conversa).toMatch(/\.conversations-page\.open\s*\{[^}]*bottom:\s*var\(--altura-teclado/);
  });

  it("o menu da conversa vira folha de ações", () => {
    const conversa = daqui("14.11 conversa no celular", "14.12 avisos");
    const menu = conversa.match(/\.chat-menu\s*\{([^}]*)\}/)?.[1] || "";
    expect(menu).toMatch(/position:\s*fixed/);
    expect(menu).toMatch(/bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom/);
    expect(menu).toMatch(/max-height:\s*68dvh/);
  });

  it("modais continuam folhas de baixo, agora com rodapé preso", () => {
    const folhas = daqui("14.8 folhas de modal", "14.9 a doca");
    expect(folhas).toMatch(/\.modal,\s*\.modal-wide/);
    expect(folhas).toMatch(/border-radius:\s*var\(--raio-g\) var\(--raio-g\) 0 0/);
    expect(folhas).toMatch(/\.modal-footer\s*\{[^}]*position:\s*sticky/);
    expect(folhas).toMatch(/\.modal-footer\s*\{[^}]*env\(safe-area-inset-bottom/);
  });

  it("listas e campos compartilham a mesma medida", () => {
    expect(sistema).toMatch(/\.simple-person-row,\s*\.profile-row/);
    expect(sistema).toMatch(/min-height:\s*var\(--toque\)/);
    expect(sistema).toMatch(/input, select, textarea\s*\{[^}]*font-size:\s*16px/);
    expect(sistema).toMatch(/\.check-label\s*\{[^}]*min-height:\s*44px/);
  });

  it("os chips de aba ficam fixos; o título grande rola junto", () => {
    const trecho = daqui("14.3 título e abas", "14.4 cartões");
    expect(trecho).toMatch(/\.page-title\s*\{[^}]*position:\s*static/);
    expect(trecho).toMatch(/\.scope-tabs\s*\{[^}]*position:\s*sticky/);
    expect(trecho).toMatch(/\.scope-tabs\s*\{[^}]*top:\s*var\(--topo\)/);
  });

  it("as abas viram chips de dedo em todas as telas", () => {
    expect(sistema).toMatch(/\.scope-tabs > button\s*\{[^}]*border-radius:\s*999px/);
    expect(sistema).toMatch(/\.scope-tabs > button\.active::after\s*\{\s*display:\s*none/);
    expect(sistema).toMatch(/\.editor-tabs button,\s*\.tools-tabs button/);
    expect(valor(sistema, ".scope-tabs > button", "min-height")).toBe("var(--toque-p)");
  });

  it("o dedo não recebe hover nem elevação", () => {
    const toque = daqui("14.20 toque", "prefers-reduced-motion: reduce");
    expect(toque).toMatch(/transform:\s*none/);
    expect(toque).toMatch(/\.person-card:active[^}]*background:\s*var\(--surface-3\)/);
    expect(toque).toMatch(/input, select, textarea\s*\{\s*font-size:\s*16px/);
    expect(toque).toMatch(/\.with-tip:hover::after\s*\{\s*display:\s*none/);
  });

  it("a doca some no celular deitado, onde a altura é pouca", () => {
    expect(css).toMatch(/@media \(max-width: 900px\) and \(max-height: 460px\) \{[\s\S]{0,400}\.mobile-bottom-nav\s*\{\s*display:\s*none/);
  });

  it("a navegação de baixo continua com cinco botões", () => {
    const botoes = app.match(/<nav className="mobile-bottom-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    expect((botoes.match(/<button/g) || []).length).toBe(5);
    expect(botoes).toMatch(/className="mobile-add"[\s\S]{0,160}?<span><Plus size=\{24\} \/><\/span>/);
  });

  it("deslizar da borda esquerda volta uma tela, e o topo se recolhe ao rolar", () => {
    const volta = daqui("15.3 topo e volta", "15.4 topo enxuto");
    expect(volta).toMatch(/\.borda-trilha\s*\{[^}]*position:\s*fixed/);
    expect(volta).toMatch(/\.borda-trilha\s*\{[^}]*background:\s*var\(--grad\)/);
    expect(volta).toMatch(/html\.topo-compacto \.topbar\s*\{[^}]*box-shadow/);
    expect(volta).toMatch(/html\.topo-compacto \.page-title h1\s*\{[^}]*font-size/);

    // a fiação: o gesto mora no `.workspace`, só vale no aparelho e usa o mesmo
    // histórico do botão de voltar do topo — uma única fonte de "tela anterior".
    expect(app).toMatch(/import \{ useBordaVoltar \} from '\.\/lib\/toque';/);
    expect(app).toMatch(/const borda = useBordaVoltar\(\{\n\s*ativo: celula && historico\.length > 0/);
    expect(app).toMatch(/\{\.\.\.borda\.props\}/);
    expect(app).toMatch(/const voltarDaBorda = \(\) => \{ ctx\.buzz\?\.\(10\); voltarPagina\(\); \};/);
    expect(app).toMatch(/className=\{`workspace \$\{borda\.progresso > 0 \? "deslizando" : ""\}`\} \{\.\.\.borda\.props\}/);
    expect(app).toMatch(/borda\.progresso > 0 && <span className="borda-trilha"/);
  });

  it("o topo do celular cabe na mão: o que não cabe vai para a folha do “mais”", () => {
    const topo = daqui("15.4 topo enxuto", "15.5 doca");
    expect(topo).toMatch(/\.topbar-more \{ display: none; \}/);
    expect(topo).toMatch(/\.topbar-more \{ display: inline-flex; \}/);
    expect(topo).toMatch(/\.topbar-actions \.desktop-so \{ display: none; \}/);
    expect(app).toMatch(/<TopbarMais onAbrirRapidas=\{\(\) => setQuickTools\(true\)\} \/>/);
    expect(app).toMatch(/FolhaDeAcoes titulo="O que você precisa agora\?"/);
    // disfarce, privacidade, tema e ações rápidas: escondidos no aparelho, no topo no computador
    expect((app.match(/desktop-so/g) || []).length).toBe(4);
  });

  it("folha e visor mandam a doca sair da frente", () => {
    const doca = daqui("15.5 doca", "15.6 galeria");
    expect(doca).toMatch(/html\.folha-aberta \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
    expect(doca).toMatch(/html\.visor-aberto \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
    expect(css).toMatch(/html\.gallery-escolhendo \.mobile-bottom-nav/);   /* a barra do lote manda na doca */
    expect(doca).toMatch(/\.person-card:active\s*\{[^}]*transform:\s*scale\(\.985\)/);
  });

  it("o botão do meio da doca é um círculo com rótulo que afunda no toque", () => {
    const doca = daqui("15.5 doca", "15.6 galeria");
    // divide a largura igual com os vizinhos e não pinta caixa cinza atrás do círculo
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add\s*\{[^}]*flex:\s*1 1 0/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add:active\s*\{[^}]*background:\s*none/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add > span\s*\{[^}]*width:\s*50px/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add > span\s*\{[^}]*box-shadow:[^}]*var\(--accent\)/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add > small\s*\{[^}]*font-size:\s*10\.5px/);
    expect(doca).toMatch(/\.mobile-bottom-nav \.mobile-add:active > span\s*\{[^}]*scale\(\.9\) translateY\(4px\)/);
    // o fichário rápido é folha de baixo: com modal aberto a doca recolhe com as outras
    expect(doca).toMatch(/html\.modal-aberto \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
    expect(ui).toMatch(/if \(openModalCount === 1\) document\.documentElement\.classList\.add\('modal-aberto'\);/);
    expect(ui).toMatch(/document\.documentElement\.classList\.remove\('modal-aberto'\);/);

    // a fiação: rótulo no markup, haptic como o dos vizinhos e o toque alterna a folha
    expect(app).toMatch(/className="mobile-add"><span><Plus size=\{24\} \/><\/span><small>Adicionar<\/small><\/button>/);
    expect(app).toMatch(/const abrirAdicionar = \(\) => \{ ctx\.buzz\?\.\(12\); ctx\.setQuickOpen\(!ctx\.quickOpen\); \};/);
    expect(app).toMatch(/aria-expanded=\{ctx\.quickOpen\} onClick=\{abrirAdicionar\}/);
    expect(previa).toMatch(/<small>Adicionar<\/small>/);
  });

  it("o topo do aparelho junta os controles num cluster e derrete no fundo", () => {
    const topo = daqui("15.4 topo enxuto", "15.5 doca");
    expect(topo).toMatch(/\.topbar-actions\s*\{[^}]*border-radius:\s*999px/);
    expect(topo).toMatch(/\.topbar-actions \.icon-btn\s*\{[^}]*border:\s*0/);
    expect(topo).toMatch(/\.topbar-actions \.icon-btn:active\s*\{[^}]*background:\s*var\(--surface-3\)/);
    expect(topo).toMatch(/\.topbar \.save-status\s*\{\s*display:\s*none/);
    expect(topo).toMatch(/\.mobile-menu-trigger, \.mobile-back\s*\{[^}]*border-color:\s*transparent/);
    // no alto o topo some no fundo; ao rolar ele vira vidro com hairline
    expect(topo).toMatch(/html:not\(\.topo-compacto\) \.topbar\s*\{[^}]*border-bottom-color:\s*transparent/);
    expect(topo).toMatch(/html\.topo-compacto \.topbar\s*\{[^}]*backdrop-filter:\s*blur\(18px\)/);
    expect(topo).toMatch(/\.topbar-actions \.topbar-profile\s*\{[^}]*border-left:/);
    expect(previa).toMatch(/class="icon-btn topbar-more" aria-label="Mais ações"/);
  });
});
