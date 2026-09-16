import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FILTROS_PADRAO, MODOS_GALERIA, alternarSelecao, aplicarFiltros, agruparPorDia, chipsDeFiltro,
  colunasDaQuadra, contarFiltrosAtivos, intervaloEntre, medirFaixasDoTopo, posicaoNoConjunto,
  razaoDaFoto, razaoParaMosaico, registrarRazao, resumoDaGaleria, spanDaFoto, tituloDoDia,
} from "../src/lib/galeria";
import { bootApp, openCatalog, seededData, seedIdb } from "./catalog.test";
import type { AppData, Photo } from "../src/types";

/**
 * A galeria no celular.
 *
 * Metade deste arquivo é conta: o mosaico só parece álbum se a altura de cada
 * azulejo vier da proporção da foto, e a linha do tempo só faz sentido se o dia
 * estiver certo. A outra metade é a tela de verdade — abrir o visor, trocar de
 * foto, favoritar, segurar para a folha de ações e fechar — porque foi aí que o
 * layout de celular deixou de ser o desktop espremido.
 */
const foto = (id: string, extra: Partial<Photo> = {}): Photo => ({
  id, url: `data:image/webp;base64,AAAA${id}`, type: "normal", personId: null, isMain: false,
  name: `${id}.webp`, createdAt: "2026-09-15T10:00:00.000Z", ...extra,
});

const nada: Pick<AppData, "people" | "folders" | "albums"> = { people: [], folders: [], albums: [] };

describe("mosaico da galeria", () => {
  it("dá a cada foto a altura da própria proporção", () => {
    // celula 100px, linha de 8px e gap de 8px: span = (altura + gap) / (linha + gap)
    expect(spanDaFoto(1, 100, 8, 8)).toBe(7);          // quadrada -> 100px de altura
    expect(spanDaFoto(2, 100, 8, 8)).toBe(4);           // paisagem -> metade
    expect(spanDaFoto(0.5, 100, 8, 8)).toBe(13);        // retrato -> o dobro
    expect(spanDaFoto(1, 0, 8, 8)).toBe(30);            // sem largura medida, padrão seguro
  });

  it("não deixa uma panorama abrir um buraco na tela", () => {
    expect(razaoParaMosaico(30)).toBe(2.4);
    expect(razaoParaMosaico(0.02)).toBe(0.5);
    expect(razaoParaMosaico(0)).toBe(1);
  });

  it("lê a proporção do registro e da cache, nesta ordem", () => {
    expect(razaoDaFoto(foto("medida", { width: 900, height: 300 }))).toBe(3);
    registrarRazao("na-cache", 300, 600);
    expect(razaoDaFoto(foto("na-cache"))).toBe(0.5);
    expect(razaoDaFoto(foto("desconhecida"))).toBe(1);
  });

  it("escolhe o número de colunas pela largura disponível", () => {
    expect(colunasDaQuadra(320)).toBe(2);
    expect(colunasDaQuadra(500)).toBe(3);
    expect(colunasDaQuadra(820)).toBe(4);
    expect(colunasDaQuadra(2400)).toBe(6);
  });

  it("tem três modos de ver, e o mosaico é o primeiro", () => {
    expect(MODOS_GALERIA.map(modo => modo.id)).toEqual(["mosaico", "quadra", "linha"]);
    expect(MODOS_GALERIA[0].id).toBe("mosaico");
  });
});

describe("linha do tempo da galeria", () => {
  const hoje = new Date(2026, 8, 16, 12, 0, 0);

  it("nomeia o dia do jeito de gente", () => {
    expect(tituloDoDia("2026-09-16", hoje)).toBe("Hoje");
    expect(tituloDoDia("2026-09-15", hoje)).toBe("Ontem");
    expect(tituloDoDia("2026-09-10", hoje)).toBe("10 de setembro");
    expect(tituloDoDia("2023-05-02", hoje)).toBe("2 de maio de 2023");
    expect(tituloDoDia("", hoje)).toBe("Sem data");
  });

  it("agrupa por dia, do mais novo para o mais antigo, sem perder a ordem interna", () => {
    const grupos = agruparPorDia([
      foto("a", { createdAt: "2026-09-16T08:00:00.000Z" }),
      foto("b", { createdAt: "2026-09-14T08:00:00.000Z" }),
      foto("c", { createdAt: "2026-09-16T09:00:00.000Z" }),
    ], hoje);
    expect(grupos.map(grupo => grupo.titulo)).toEqual(["Hoje", "14 de setembro"]);
    expect(grupos[0].fotos.map(item => item.id)).toEqual(["a", "c"]);
  });

  it("usa a data da captura quando ela existe", () => {
    const grupo = agruparPorDia([foto("d", { createdAt: "2026-09-16T10:00:00.000Z", capturedAt: "2019-01-01T10:00:00.000Z" })], hoje);
    expect(grupo[0].titulo).toBe("1 de janeiro de 2019");
  });

  it("conta o conjunto para o visor", () => {
    expect(posicaoNoConjunto(40, 2)).toBe("3 de 40");
    expect(posicaoNoConjunto(0, 0)).toBe("1 de 1");
  });
});

describe("filtros da galeria", () => {
  const fotos = [
    foto("1", { personId: "p1", name: "praia.webp", favorite: true }),
    foto("2", { personId: null, name: "cafe.webp", type: "biquini" as Photo["type"] }),
    foto("3", { personId: "p1", name: "Zeca.webp", folderId: "f1" }),
  ];
  const dados: Pick<AppData, "people" | "folders" | "albums"> = {
    people: [{ id: "p1", nome: "Ana Paula" } as never],
    folders: [{ id: "f1", name: "Verão", photoIds: ["1"] } as never],
    albums: [{ id: "al1", name: "Viagem", photoIds: ["1", "3"] } as never],
  };

  it("busca sem acento e sem se importar com maiúscula", () => {
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, busca: "cafe" }, dados).map(f => f.id)).toEqual(["2"]);
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, busca: "ana" }, dados).map(f => f.id)).toEqual(["1", "3"]);
  });

  it("separa o que não tem ficha e o que não tem pasta", () => {
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, pessoa: "__orphan" }, dados).map(f => f.id)).toEqual(["2"]);
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, pasta: "__orphan-folder" }, dados).map(f => f.id)).toEqual(["2"]);
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, pasta: "f1" }, dados).map(f => f.id)).toEqual(["1", "3"]);
  });

  it("filtra por álbum e por favorito, e ordena pelos dois lados do tempo", () => {
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, album: "al1" }, dados).map(f => f.id)).toEqual(["1", "3"]);
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, favoritas: true }, dados).map(f => f.id)).toEqual(["1"]);
    const duas = [foto("velha", { createdAt: "2020-01-01T00:00:00.000Z" }), foto("nova", { createdAt: "2026-01-01T00:00:00.000Z" })];
    expect(aplicarFiltros(duas, FILTROS_PADRAO, dados).map(f => f.id)).toEqual(["nova", "velha"]);
    expect(aplicarFiltros(duas, { ...FILTROS_PADRAO, ordem: "antiga" }, dados).map(f => f.id)).toEqual(["velha", "nova"]);
    expect(aplicarFiltros(fotos, { ...FILTROS_PADRAO, ordem: "nome" }, dados).map(f => f.id)).toEqual(["2", "1", "3"]);  // cafe < praia < Zeca
  });

  it("conta e nomeia o que está filtrando, para o chip poder ser tirado", () => {
    const filtros = { ...FILTROS_PADRAO, tipo: "biquini" as const, favoritas: true, pessoa: "p1" };
    expect(contarFiltrosAtivos(filtros)).toBe(3);
    expect(contarFiltrosAtivos(FILTROS_PADRAO)).toBe(0);
    expect(chipsDeFiltro(filtros, dados).map(chip => chip.rotulo)).toEqual(["Biquíni", "Ana Paula", "Só favoritas"]);
  });

  it("alternar seleção e estender por intervalo", () => {
    expect(alternarSelecao(["a"], "b")).toEqual(["a", "b"]);
    expect(alternarSelecao(["a", "b"], "b")).toEqual(["a"]);
    expect(intervaloEntre(fotos, "3", "1")).toEqual(["1", "2", "3"]);
    expect(intervaloEntre(fotos, "sumido", "1")).toEqual([]);
  });

  it("resume a seleção para a linha de apoio", () => {
    const resumo = resumoDaGaleria(fotos);
    expect(resumo.total).toBe(3);
    expect(resumo.favoritas).toBe(1);
    expect(resumo.semFicha).toBe(1);
    expect(resumo.pessoas).toBe(1);
  });
});

const css = readFileSync(resolve(__dirname, "../src/index.css"), "utf8");

describe("casca de celular nova", () => {

  it("tem a folha do pé da tela com puxador, travando o fundo", () => {
    expect(css).toMatch(/\.folha\s*\{[^}]*border-radius:\s*var\(--raio-folha\)/);
    expect(css).toMatch(/\.folha-veu\s*\{[^}]*backdrop-filter/);
    expect(css).toMatch(/\.folha-puxador\s*\{[^}]*touch-action:\s*none/);
    expect(css).toMatch(/\.folha-corpo\s*\{[^}]*overscroll-behavior:\s*contain/);
    expect(css).toMatch(/\.folha-rodape\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/html\.folha-aberta \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
  });

  it("faz o toque longo virar menu de contexto do dedo", () => {
    expect(css).toMatch(/\.folha-acao\s*\{[^}]*min-height:\s*var\(--alvo\)/);
    expect(css).toMatch(/\.folha-acoes-lista\s*\{/);
    expect(css).toMatch(/--alvo:\s*50px/);
  });

  it("mostra a trilha do deslizar que volta uma tela", () => {
    expect(css).toMatch(/\.borda-trilha\s*\{[^}]*background:\s*var\(--grad\)/);
    expect(css).toMatch(/html\.topo-compacto \.topbar\s*\{/);
    expect(css).toMatch(/html\.topo-compacto \.page-title h1\s*\{[^}]*font-size/);
  });

  it("deixa o visor ocupar a tela e esconde a doca", () => {
    expect(css).toMatch(/\.visor\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.visor-cena\s*\{[^}]*touch-action:\s*none/);
    expect(css).toMatch(/html\.visor-aberto[^{]*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/html\.visor-aberto \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
    expect(css).toMatch(/\.visor-base\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.visor\.sem-barras \.visor-topo\s*\{[^}]*opacity:\s*0/);
  });

  it("guarda o canto inferior para o polegar na galeria", () => {
    expect(css).toMatch(/\.gallery-lote\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.gallery-lote\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.gallery-fab\s*\{[^}]*bottom:\s*calc\(var\(--base-nav[,)]/);
    expect(css).toMatch(/html\.gallery-escolhendo \.mobile-bottom-nav/);
  });

  it("faz o mosaico com a proporção de cada arquivo", () => {
    expect(css).toMatch(/\.galeria-grade\s*\{[^}]*grid-auto-rows:\s*var\(--linha/);
    expect(css).toMatch(/\.galeria-grade\s*\{[^}]*grid-auto-flow:\s*dense/);
    expect(css).toMatch(/\.azulejo\s*\{[^}]*content-visibility:\s*auto/);
    expect(css).toMatch(/\.azulejo > img\s*\{[^}]*object-fit:\s*cover/);
    expect(css).toMatch(/\.galeria-dia-titulo\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.galeria-dia-titulo\s*\{[^}]*top:\s*calc\(var\(--topo/);
  });

  it("no dedo o coração da foto está à vista, e a seta do visor não", () => {
    const toque = css.slice(css.indexOf("@media (hover: none) and (max-width: 1100px) {\n  .visor-seta"));
    expect(toque).toMatch(/\.visor-seta\s*\{\s*display:\s*none/);
    expect(toque).toMatch(/\.azulejo-coracao\s*\{\s*opacity:\s*1/);
  });

  it("cabe numa mão só: o topo guarda três alvos e o resto vai para a folha", () => {
    const app = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");
    expect(css).toMatch(/^\.topbar-more \{ display: none; \}$/m);
    const celular = css.slice(css.indexOf("/* ---------------------------------------------------------------- 15.5 doca */"));
    expect(css).toMatch(/@media \(max-width: 760px\) \{[\s\S]{0,700}\.topbar-more \{ display: inline-flex; \}/);
    expect(css).toMatch(/\.topbar-actions \.desktop-so \{ display: none; \}/);
    expect(app).toMatch(/<TopbarMais onAbrirRapidas=\{\(\) => setQuickTools\(true\)\} \/>/);
    expect((app.match(/desktop-so/g) || []).length).toBe(4);   // raio, disfarce, privacidade e tema
    expect(celular).toBeTruthy();
  });

  it("tocar o véu fecha a folha — é para lá que o dedo vai quando erra", () => {
    const folha = readFileSync(resolve(__dirname, "../src/components/Folha.tsx"), "utf8");
    expect(folha).toMatch(/className="folha-veu"[^>]*onMouseDown=\{aoFechar\}/);
    expect(folha).toMatch(/className="folha-puxador"/);
    expect(folha).toMatch(/document\.documentElement\.classList\.add\('folha-aberta'\)/);
    expect(folha).toMatch(/setTimeout\(aoFechar, 140\)/);
  });

  it("a folha nasce acima do visor, para os detalhes terem onde morar", () => {
    expect(css).toMatch(/\.folha-overlay\s*\{[\s\S]{0,120}z-index:\s*260/);
    expect(css).toMatch(/\.visor\s*\{[^}]*z-index:\s*240/);
  });

  it("segurar o cartão da ficha abre a mesma folha de ações", () => {
    const catalog = readFileSync(resolve(__dirname, "../src/components/Catalog.tsx"), "utf8");
    expect(catalog).toMatch(/const toqueFicha = useToqueLongo/);
    expect(catalog).toMatch(/data-ficha=\{p\.id\}/);
    expect(catalog).toMatch(/<FolhaDeAcoes titulo=\{fichaSegurada\.nome\}/);
    expect(catalog).toMatch(/onClickCapture=\{evento => \{ if \(toqueFicha\.segurou\(\)\)/);
    expect(css).toMatch(/\.person-card:active\s*\{[^}]*transform:\s*scale\(.985\)/);
  });
});

describe("catálogo no celular", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  it("segurar um cartão abre a folha de ações da ficha", async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await openCatalog(user);
    const cartao = document.querySelector(".person-card") as HTMLElement;
    expect(cartao, "primeiro cartão do catálogo").toBeTruthy();
    await act(async () => {
      cartao.dispatchEvent(new MouseEvent("pointerdown", { clientX: 300, clientY: 300, bubbles: true }));
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
    const folha = document.querySelector(".folha-acoes") as HTMLElement;
    expect(within(folha).getByText("Abrir a ficha")).toBeInTheDocument();
    expect(within(folha).getByText("Mover para a lixeira")).toBeInTheDocument();

    // o gesto não abriu a ficha por trás da folha: o clique do navegador é engolido
    expect(document.querySelector(".person-drawer"), "ficha aberta por engano").toBeNull();
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeNull());
  }, 25000);
});

describe("galeria na tela", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  async function abrirGaleria(user: ReturnType<typeof userEvent.setup>) {
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    const botao = within(aside).getByRole("button", { name: /Galeria/i }) as HTMLElement;
    await act(async () => { botao.click(); });
    await waitFor(() => expect(document.querySelector(".gallery-page")).toBeTruthy());
  }

  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });

  it("abre o mosaico com azulejos e a barra de modos", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    expect(document.querySelector(".galeria-grade.mosaico")).toBeTruthy();
    expect(document.querySelectorAll(".gallery-modos button").length).toBe(3);
    // o span guarda exatamente "N fotos" — é o que as demais telas mostram também
    expect(screen.getByText(/^\d+ fotos$/)).toBeInTheDocument();
  });

  it("troca para a quadra e para a linha do tempo", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const botoes = [...document.querySelectorAll<HTMLElement>(".gallery-modos button")];
    await act(async () => { botoes[1].click(); });
    await waitFor(() => expect(document.querySelector(".galeria-grade.quadra")).toBeTruthy());
    await act(async () => { botoes[2].click(); });
    await waitFor(() => expect(document.querySelector(".galeria-linha")).toBeTruthy());
    expect(document.querySelector(".galeria-dia-titulo")).toBeTruthy();
  });

  it("abre o visor em tela cheia e anda pelas fotos", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[1];
    await act(async () => { azulejo.click(); });
    await waitFor(() => expect(document.querySelector(".visor")).toBeTruthy());
    expect(document.documentElement.classList.contains("visor-aberto")).toBe(true);
    expect(document.querySelector(".visor-cena img")).toBeTruthy();

    const antes = document.querySelector(".visor-cena img")?.getAttribute("src");
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".visor-cena img")?.getAttribute("src")).not.toBe(antes));

    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".visor")).toBeNull());
    expect(document.documentElement.classList.contains("visor-aberto")).toBe(false);
  });

  it("guarda a foto no coração sem sair da grade", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const coracao = document.querySelectorAll<HTMLElement>(".azulejo-coracao")[0];
    expect(coracao.classList.contains("aceso")).toBe(false);
    await act(async () => { coracao.click(); });
    await waitFor(() => expect(document.querySelector(".azulejo-coracao.aceso")).toBeTruthy());
  });

  it("segurar a foto abre a folha de ações", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[0];
    // jsdom não tem PointerEvent: um MouseEvent com o nome do evento basta para
    // chegar no handler do React, e é só isso que o toque longo escuta.
    await act(async () => {
      azulejo.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200, clientY: 300, bubbles: true }));
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
    const folha = document.querySelector(".folha-acoes") as HTMLElement;
    expect(within(folha as unknown as HTMLElement).getByText("Escolher no lote")).toBeInTheDocument();
    expect(within(folha as unknown as HTMLElement).getByText("Baixar a imagem")).toBeInTheDocument();
    expect(within(folha as unknown as HTMLElement).getByText("Abrir a foto")).toBeInTheDocument();
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeNull());
  }, 15000);

  it("abre a folha de filtros, busca e o chip do filtro aparece na barra", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    const gatilho = screen.getByRole("button", { name: /Filtros/i }) as HTMLElement;
    await act(async () => { gatilho.click(); });
    await waitFor(() => expect(document.querySelector(".folha")).toBeTruthy());
    const campo = within(document.querySelector(".folha") as unknown as HTMLElement).getByPlaceholderText(/Nome do arquivo/i) as HTMLInputElement;
    await user.type(campo, "foto-1-0");   // seed-0 está na lixeira: a foto de índice 1 é a primeira viva
    await act(async () => {
      const rodape = document.querySelector(".folha-rodape .btn-primary") as HTMLElement;
      rodape.click();
    });
    await waitFor(() => expect(document.querySelector(".gallery-chips-ativos")).toBeTruthy());
    expect(document.querySelectorAll(".azulejo").length, `busca “${campo.value}” não achou foto`).toBeGreaterThan(0);
    await act(async () => {
      (document.querySelector(".gallery-chips-ativos .limpar") as HTMLElement).click();
    });
    await waitFor(() => expect(document.querySelector(".gallery-chips-ativos")).toBeNull());
  });

  it("o “mais” do topo reúne o que não caberia na mão", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    const mais = document.querySelector(".topbar-more") as HTMLElement;
    expect(mais, "botão de mais ações no topo").toBeTruthy();
    await act(async () => { mais.click(); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
    const folha = document.querySelector(".folha-acoes") as HTMLElement;
    expect(within(folha).getByText("Modo disfarce")).toBeInTheDocument();
    expect(within(folha).getByText("Modo privacidade")).toBeInTheDocument();
    await act(async () => { within(folha).getByText("Modo disfarce").click(); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeNull());
    expect(document.querySelector(".app-shell.blur-mode") || document.documentElement.classList.contains("blur-mode")).toBeTruthy();
  });

  it("entra na seleção em lote e mostra a barra do pé da tela", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    await act(async () => { screen.getByRole("button", { name: /Organizar fotos/i }).click(); });
    await waitFor(() => expect(document.querySelector(".gallery-lote")).toBeTruthy());
    expect(document.documentElement.classList.contains("gallery-escolhendo")).toBe(true);
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[2];
    await act(async () => { azulejo.click(); });
    await waitFor(() => expect(document.querySelector(".azulejo.selecionada")).toBeTruthy());
    await settle();
    await act(async () => { (document.querySelector(".gallery-lote .carregar-mais") as HTMLElement | null)?.click(); });
    await act(async () => { screen.getByRole("button", { name: /Sair da seleção/i }).click(); });
    await waitFor(() => expect(document.querySelector(".gallery-lote")).toBeNull());
  });
});

describe("faixa grudada no topo da galeria", () => {
  it("mede as faixas de verdade e arredonda sem inventar número", () => {
    expect(medirFaixasDoTopo(null), "sem página, nada a medir").toEqual({ escopo: 0, barra: 0 });
    const raiz = document.createElement("div");
    raiz.innerHTML = '<div class="scope-tabs"></div><div class="gallery-topo"></div>';
    document.body.appendChild(raiz);
    const darAltura = (el: HTMLElement, valor: number) => Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => valor });
    darAltura(raiz.querySelector(".scope-tabs") as HTMLElement, 61.4);
    darAltura(raiz.querySelector(".gallery-topo") as HTMLElement, 52);
    expect(medirFaixasDoTopo(raiz)).toEqual({ escopo: 61, barra: 52 });
    (raiz.querySelector(".gallery-topo") as HTMLElement).remove();
    expect(medirFaixasDoTopo(raiz), "faixa sem altura medida deixa o CSS com a reserva").toEqual({ escopo: 61, barra: 0 });
    raiz.remove();
  });

  it("gruda a barra embaixo das abas, com a altura que alguém mediu", () => {
    expect(css).toMatch(/^\.gallery-topo \{ margin: 0 0 12px; \}$/m);
    expect(css).toMatch(/\.gallery-topo\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.gallery-topo\s*\{[^}]*top:\s*calc\(var\(--topo\)\s*\+\s*var\(--altura-escopo/);
    expect(css).toMatch(/\.gallery-topo\s*\{[^}]*backdrop-filter/);
    // e o título de cada dia desconta a barra inteira, em vez de passar por trás dela
    expect(css).toMatch(/\.galeria-dia-titulo\s*\{[^}]*top:\s*calc\(var\(--topo\)\s*\+\s*var\(--altura-escopo,\s*62px\)\s*\+\s*var\(--altura-barra/);
  });

  it("no bolso a faixa é uma linha só que desliza para o lado", () => {
    const celular = css.slice(css.indexOf("15.6 galeria: barra"));
    const bolso = celular.slice(celular.indexOf("@media (max-width: 760px) {"));
    expect(bolso).toMatch(/\.gallery-barra\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(bolso).toMatch(/\.gallery-barra\s*\{[^}]*overflow-x:\s*auto/);
    expect(bolso).toMatch(/\.gallery-contagem \{ display: none; \}/);
    expect(celular).toMatch(/^\.gallery-topo-volta \{ display: none; \}$/m);
    expect(celular).toMatch(/html\.topo-compacto \.gallery-topo-volta\s*\{[^}]*display:\s*inline-flex/);
  });

  it("entrega a medida do topo para o CSS num gancho só", () => {
    const galeria = readFileSync(resolve(__dirname, "../src/components/Gallery.tsx"), "utf8");
    const myspace = readFileSync(resolve(__dirname, "../src/components/MySpace.tsx"), "utf8");
    const gancho = readFileSync(resolve(__dirname, "../src/hooks/useFaixasGrudadas.ts"), "utf8");
    expect(galeria).toMatch(/const estiloPagina = useFaixasGrudadas\(pagina, \[chips\.length, ativos, modo, view\]\);/);
    expect(galeria).toMatch(/<div className="gallery-page" ref={pagina} style={estiloPagina}>/);
    expect(gancho).toMatch(/const nova = medirFaixasDoTopo\(pagina\.current\);/);
    expect(gancho).toMatch(/new ResizeObserver\(medir\)/);
    expect(myspace).toMatch(/useFaixasGrudadas\(pagina, \[tab, data\.vault\.photoIds\.length\]\)/);
  });
});

describe("cofre do meu espaço", () => {
  beforeEach(async () => { await seedIdb(seededData()); });

  async function abrirGaleria(user: ReturnType<typeof userEvent.setup>) {
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Galeria/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".gallery-page")).toBeTruthy());
  }

  async function abrirCofre() {
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Meu espaço/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".myspace-page")).toBeTruthy());
    const aba = [...document.querySelectorAll<HTMLElement>(".scope-tabs > button")].find(b => /Cofre/i.test(b.textContent || "")) as HTMLElement;
    await act(async () => { aba.click(); });
    await waitFor(() => expect(document.querySelector(".vault-locked")).toBeTruthy());
    await act(async () => { (document.querySelector(".vault-locked button[type=submit]") as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".vault-open")).toBeTruthy());
  }

  it("manda a foto segurada para o cofre e a reabre no visor", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[0];
    await act(async () => { azulejo.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200, clientY: 300, bubbles: true })); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
    await act(async () => { within(document.querySelector(".folha-acoes") as unknown as HTMLElement).getByText("Enviar ao cofre").click(); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeNull());

    await abrirCofre();
    const guardadas = document.querySelectorAll(".vault-open .azulejo");
    expect(guardadas.length, "o mosaico do cofre não mostrou a foto guardada").toBeGreaterThan(0);
    expect(document.querySelectorAll(".vault-open .gallery-grid").length, "o cofre não usa mais a grade antiga").toBe(0);

    await act(async () => { (guardadas[0] as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".visor")).toBeTruthy());
    expect(document.documentElement.classList.contains("visor-aberto")).toBe(true);
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".visor")).toBeNull());
  }, 30000);

  it("escolhe no lote e devolve as fotos para a galeria, com a barra do pé", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(4));
    const azulejos = [...document.querySelectorAll<HTMLElement>(".azulejo")].slice(0, 3);
    for (const item of azulejos) {
      await act(async () => { item.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200, clientY: 300, bubbles: true })); });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
      await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
      await act(async () => { within(document.querySelector(".folha-acoes") as unknown as HTMLElement).getByText("Enviar ao cofre").click(); });
      await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeNull());
    }

    await abrirCofre();
    const cofre = document.querySelector(".vault-open") as HTMLElement;
    await act(async () => { within(cofre).getByRole("button", { name: "Escolher" }).click(); });
    await waitFor(() => expect(document.querySelector(".gallery-lote")).toBeTruthy());
    expect(document.documentElement.classList.contains("gallery-escolhendo"), "a doca não recuou para o lote").toBe(true);
    await act(async () => { (document.querySelector(".gallery-lote button") as HTMLElement).click(); });   // Tudo
    await waitFor(() => expect(document.querySelectorAll(".azulejo.selecionada").length).toBe(3));
    await act(async () => { within(document.querySelector(".gallery-lote") as unknown as HTMLElement).getByText("Tirar do cofre").click(); });
    await waitFor(() => expect(document.querySelector(".gallery-lote")).toBeNull());
    expect(document.documentElement.classList.contains("gallery-escolhendo")).toBe(false);
    expect(document.querySelectorAll(".vault-open .azulejo").length, "as fotos não saíram do cofre").toBe(0);
    expect(within(cofre).getByText("Cofre vazio"), "sem foto, o vazio tem que explicar o caminho").toBeInTheDocument();
  }, 40000);
});
