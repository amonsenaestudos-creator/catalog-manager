import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogProvider, useCatalog } from "../src/context";
import EditorDeImagem from "../src/features/gallery/components/EditorDeImagem";
import {
  ALCAS, AJUSTES_NEUTROS, CORES_PRONTAS, FILTROS_PRONTOS, PASSOS_DE_HISTORICO, PROPORCOES,
  aplicarAcao, apagarMarcas, areaDoArrasto, areaProporcional, arrastarArea, caminhoDoTraco,
  coresDominantes, corDoPixel, corEmHex, corteValido, desfazer, edicaoInicial, encaixarArea,
  filtroAtivo, filtroCss, ajustesDoFiltro, fotoComoNova, guardarFotoEditada, hexParaRgb, LIMITES_DO_AJUSTE,
  historicoInicial, lerCoresRecentes, limitesDaMarca, luminancia, marcaNoPonto,
  moverMarcaPara, moverPonto, nomeEditado, novaForma, novoBorrado, novoTexto, novoTraco,
  paraFonte, paraSaida, pontosDaMarca, podeDesfazer, podeRefazer, razaoDaSaida, refazer,
  registrar, repor, rgbParaHex, salvarCorRecente, tamanhoDaSaida, temMudanca, textoSobre,
  FORMATOS_DO_RECORTE, TAMANHOS_DE_SAIDA, fatorDoLimite, raioDoArredondado, resumoDoFormato,
  tamanhoDoLimite, tamanhoExportado,
} from "../src/features/gallery/edicao";
import AjusteEmLote from "../src/features/gallery/components/AjusteEmLote";
import { getAllPhotos } from "../src/features/gallery";
import type { Edicao, Geometria, Marca, Ponto, Photo, Retangulo } from "../src/features/gallery";
import {
  caminhoDoFormato, comporTela, corNaTela, desenharBase, exportarEdicao, miniaturaDeAjustes,
  novoCanvas, paletaDaTela, recortarNoFormato,
} from "../src/features/gallery/tela";
import { FERRAMENTAS } from "../src/features/gallery/ferramentas";
import { getDefaultPerson } from "../src/store";
import type { AppData } from "../src/types";
import { cssDoApp } from "./css-fonte";
import { bootApp, seededData, seedIdb } from "./catalog.test";

/**
 * Editor de imagens da galeria.
 *
 * O que está em jogo aqui é a **receita**: cortar, girar, espelhar, ajustar e
 * desenhar sem nunca reencodar a foto no meio do caminho. Por isso a maior parte
 * do arquivo é conta (geometria, cor, histórico, gravação no catálogo) — é ela
 * que garante que girar depois de cortar recorta o lugar certo da imagem
 * original, e que o desenho acompanha a foto em vez de ficar preso à tela.
 *
 * A segunda metade abre o editor de verdade. O jsdom não desenha canvas
 * (`getContext` devolve nulo no `setup.ts`), então há dois cenários: sem canvas,
 * o editor precisa avisar e continuar de pé; com um contexto de mentira, o gesto
 * do dedo precisa chegar até a receita e o salvar precisa devolver um arquivo.
 */

/* ------------------------------------------------------------- utilidades -- */

const tamanho = (largura: number, altura: number) => ({ largura, altura });

const geometria = (extra: Partial<Geometria> = {}): Geometria => ({
  corte: { x: 0, y: 0, largura: 100, altura: 50 }, giro: 0, espelharH: false, espelharV: false, ...extra,
});

const edicaoCom = (marcas: Marca[], extra: Partial<Edicao> = {}): Edicao => ({
  geometria: geometria(extra.geometria), ajustes: { ...AJUSTES_NEUTROS }, marcas, ...extra,
});

const traco = (id: string, pontos: Ponto[], espessura = 6): Marca => ({
  id, tipo: "traco", pontos, cor: "#ff0000", espessura, opacidade: 1,
});

const foto = (id: string, extra: Partial<Photo> = {}): Photo => ({
  id, url: `data:image/webp;base64,AAAA${id}`, type: "normal", personId: null, isMain: false,
  name: `${id}.webp`, createdAt: "2026-09-15T10:00:00.000Z", width: 120, height: 80, ...extra,
});

/* ---------------------------------------------------------------- receita -- */

describe("a receita da edição", () => {
  it("começa sem mudança nenhuma", () => {
    const edicao = edicaoInicial(tamanho(640, 480));
    expect(edicao.geometria.corte).toEqual({ x: 0, y: 0, largura: 640, altura: 480 });
    expect(edicao.geometria.giro).toBe(0);
    expect(edicao.marcas).toEqual([]);
    expect(temMudanca(edicao, tamanho(640, 480))).toBe(false);
  });

  it("sabe o que mudou: corte, giro, espelho, luz e marcas", () => {
    const base = tamanho(100, 50);
    expect(temMudanca({ ...edicaoInicial(base), geometria: geometria({ giro: 90 }) }, base)).toBe(true);
    expect(temMudanca({ ...edicaoInicial(base), geometria: geometria({ espelharH: true }) }, base)).toBe(true);
    expect(temMudanca({
      ...edicaoInicial(base),
      geometria: geometria({ corte: { x: 4, y: 0, largura: 90, altura: 50 } }),
    }, base)).toBe(true);
    expect(temMudanca({ ...edicaoInicial(base), ajustes: { ...AJUSTES_NEUTROS, brilho: 12 } }, base)).toBe(true);
    expect(temMudanca({ ...edicaoInicial(base), marcas: [traco("a", [{ x: 1, y: 1 }])] }, base)).toBe(true);
  });

  it("o giro de 90° troca largura e altura; o de 180° não", () => {
    expect(tamanhoDaSaida(geometria())).toEqual({ largura: 100, altura: 50 });
    expect(tamanhoDaSaida(geometria({ giro: 90 }))).toEqual({ largura: 50, altura: 100 });
    expect(tamanhoDaSaida(geometria({ giro: 180 }))).toEqual({ largura: 100, altura: 50 });
    expect(tamanhoDaSaida(geometria({ giro: 270 }))).toEqual({ largura: 50, altura: 100 });
    expect(razaoDaSaida(geometria())).toBe(2);
    expect(razaoDaSaida(geometria({ giro: 90 }))).toBe(0.5);
  });

  it("vai do arquivo para a tela e volta pelo mesmo caminho", () => {
    const corte = { x: 10, y: 20, largura: 100, altura: 50 };
    const giros = [0, 90, 180, 270] as const;
    for (const giro of giros) {
      for (const espelharH of [false, true]) {
        for (const espelharV of [false, true]) {
          const g = { corte, giro, espelharH, espelharV };
          const fonte = { x: 30, y: 40 };
          const ida = paraSaida(fonte, g);
          expect(paraFonte(ida, g)).toEqual(fonte);
          // os quatro cantos do corte caem dentro da saída
          const saida = tamanhoDaSaida(g);
          for (const canto of [{ x: 10, y: 20 }, { x: 110, y: 70 }]) {
            const ponto = paraSaida(canto, g);
            expect(ponto.x).toBeGreaterThanOrEqual(0);
            expect(ponto.y).toBeGreaterThanOrEqual(0);
            expect(ponto.x).toBeLessThanOrEqual(saida.largura);
            expect(ponto.y).toBeLessThanOrEqual(saida.altura);
          }
        }
      }
    }
  });

  it("girar para a direita leva o canto de cima para a direita da tela", () => {
    expect(paraSaida({ x: 0, y: 0 }, geometria({ giro: 90 }))).toEqual({ x: 50, y: 0 });
    expect(paraSaida({ x: 100, y: 0 }, geometria({ giro: 90 }))).toEqual({ x: 50, y: 100 });
    expect(paraSaida({ x: 0, y: 0 }, geometria({ giro: 270 }))).toEqual({ x: 0, y: 100 });
    expect(paraSaida({ x: 0, y: 0 }, geometria({ espelharH: true }))).toEqual({ x: 100, y: 0 });
  });

  it("o desenho gira junto com a foto, não fica preso à tela", () => {
    const edicao = edicaoCom([traco("a", [{ x: 10, y: 10 }, { x: 20, y: 20 }])]);
    const girada = aplicarAcao(edicao, { tipo: "giro", sentido: 1 });
    expect(tamanhoDaSaida(girada.geometria)).toEqual({ largura: 50, altura: 100 });
    const marca = girada.marcas[0];
    expect(pontosDaMarca(marca)[0]).toEqual({ x: 50 - 10, y: 10 });
    // girar quatro vezes devolve a foto (e o desenho) ao lugar
    const volta = [1, 1, 1].reduce<Edicao>(acumulada => aplicarAcao(acumulada, { tipo: "giro", sentido: 1 }), girada);
    expect(pontosDaMarca(volta.marcas[0])[0]).toEqual({ x: 10, y: 10 });
    expect(volta.geometria.giro).toBe(0);
  });

  it("espelhar inverte o desenho no eixo pedido", () => {
    const edicao = edicaoCom([traco("a", [{ x: 10, y: 10 }])]);
    const horizontal = aplicarAcao(edicao, { tipo: "espelho", eixo: "h" });
    expect(pontosDaMarca(horizontal.marcas[0])[0]).toEqual({ x: 90, y: 10 });
    const vertical = aplicarAcao(horizontal, { tipo: "espelho", eixo: "v" });
    expect(pontosDaMarca(vertical.marcas[0])[0]).toEqual({ x: 90, y: 40 });
    expect(moverPonto({ x: 10, y: 10 }, { tipo: "espelho", eixo: "h" }, tamanho(100, 50))).toEqual({ x: 90, y: 10 });
  });

  it("cortar desloca o desenho e tira o que ficou fora da foto", () => {
    const edicao = edicaoCom([
      traco("dentro", [{ x: 30, y: 20 }]),
      traco("fora", [{ x: 95, y: 45 }]),
    ]);
    const cortada = aplicarAcao(edicao, { tipo: "corte", area: { x: 20, y: 10, largura: 40, altura: 30 } });
    expect(cortada.marcas.map(marca => marca.id)).toEqual(["dentro"]);
    expect(pontosDaMarca(cortada.marcas[0])[0]).toEqual({ x: 10, y: 10 });
    expect(tamanhoDaSaida(cortada.geometria)).toEqual({ largura: 40, altura: 30 });
  });

  it("cortar depois de girar recorta o lugar certo do arquivo original", () => {
    // 100×50 girado para a direita vira 50×100; cortar a metade de cima da
    // saída é cortar o quadrado de 50×50 que está no começo do arquivo.
    const girada = aplicarAcao(edicaoCom([]), { tipo: "giro", sentido: 1 });
    const cortada = aplicarAcao(girada, { tipo: "corte", area: { x: 0, y: 0, largura: 50, altura: 50 } });
    expect(cortada.geometria.corte).toEqual({ x: 0, y: 0, largura: 50, altura: 50 });
    expect(tamanhoDaSaida(cortada.geometria)).toEqual({ largura: 50, altura: 50 });
  });

  it("cortar a foto inteira não cria passo nenhum", () => {
    const edicao = edicaoCom([traco("a", [{ x: 10, y: 10 }])]);
    expect(aplicarAcao(edicao, { tipo: "corte", area: { x: 0, y: 0, largura: 100, altura: 50 } })).toBe(edicao);
    expect(aplicarAcao(edicao, { tipo: "corte", area: { x: 0, y: 0, largura: 3, altura: 3 } })).toBe(edicao);
  });

  it("o corte nunca sai de dentro do arquivo", () => {
    const g = geometria({ corte: { x: 20, y: 10, largura: 60, altura: 30 } });
    const cortada = aplicarAcao({ ...edicaoCom([]), geometria: g }, { tipo: "corte", area: { x: -40, y: -40, largura: 400, altura: 400 } });
    expect(cortada.geometria.corte).toEqual({ x: 20, y: 10, largura: 60, altura: 30 });
  });
});

/* ------------------------------------------------------------ moldura do corte */

describe("a moldura do corte", () => {
  it("oferece as proporções de álbum, com o livre e o atual", () => {
    expect(PROPORCOES[0].id).toBe("livre");
    expect(PROPORCOES[0].razao).toBeNull();
    expect(PROPORCOES.map(item => item.id)).toContain("1:1");
    expect(PROPORCOES.map(item => item.id)).toContain("9:16");
    expect(PROPORCOES.every(item => !!item.dica)).toBe(true);
  });

  it("encaixa a maior área com aquela proporção, centralizada", () => {
    expect(areaProporcional(tamanho(200, 100), 1)).toEqual({ x: 50, y: 0, largura: 100, altura: 100 });
    expect(areaProporcional(tamanho(100, 200), 1)).toEqual({ x: 0, y: 50, largura: 100, altura: 100 });
    const tela = areaProporcional(tamanho(200, 100), 16 / 9);
    expect(tela.altura).toBe(100);
    expect(Math.abs(tela.largura / tela.altura - 16 / 9)).toBeLessThan(0.02);
    // sem proporção (livre) a área é a foto inteira
    expect(areaProporcional(tamanho(200, 100), null)).toEqual({ x: 0, y: 0, largura: 200, altura: 100 });
  });

  it("arrastar move sem mudar o tamanho, e para na borda", () => {
    const area: Retangulo = { x: 10, y: 10, largura: 50, altura: 50 };
    expect(arrastarArea(area, "mover", { x: 5, y: 7 }, tamanho(100, 100))).toEqual({ x: 15, y: 17, largura: 50, altura: 50 });
    expect(arrastarArea(area, "mover", { x: 400, y: 400 }, tamanho(100, 100))).toEqual({ x: 50, y: 50, largura: 50, altura: 50 });
    expect(arrastarArea(area, "mover", { x: -400, y: -400 }, tamanho(100, 100))).toEqual({ x: 0, y: 0, largura: 50, altura: 50 });
  });

  it("cada alça cresce do lado oposto ao dedo", () => {
    const area: Retangulo = { x: 10, y: 10, largura: 50, altura: 50 };
    expect(arrastarArea(area, "se", { x: 20, y: 30 }, tamanho(100, 100))).toEqual({ x: 10, y: 10, largura: 70, altura: 80 });
    expect(arrastarArea(area, "nw", { x: -5, y: -5 }, tamanho(100, 100))).toEqual({ x: 5, y: 5, largura: 55, altura: 55 });
    expect(arrastarArea(area, "e", { x: 10, y: 90 }, tamanho(100, 100))).toEqual({ x: 10, y: 10, largura: 60, altura: 50 });
    expect(arrastarArea(area, "s", { x: 90, y: -4 }, tamanho(100, 100))).toEqual({ x: 10, y: 10, largura: 50, altura: 46 });
    // não deixa virar do avesso nem sumir
    expect(arrastarArea(area, "nw", { x: 900, y: 900 }, tamanho(100, 100))).toEqual({ x: 52, y: 52, largura: 8, altura: 8 });
    expect(arrastarArea(area, "se", { x: 900, y: 900 }, tamanho(100, 100))).toEqual({ x: 10, y: 10, largura: 90, altura: 90 });
  });

  it("com a proporção travada o canto manda nos dois lados", () => {
    const area: Retangulo = { x: 0, y: 0, largura: 40, altura: 40 };
    const crescida = arrastarArea(area, "se", { x: 20, y: 0 }, tamanho(100, 100), 1);
    expect(crescida.largura).toBe(crescida.altura);
    expect(crescida.largura).toBe(60);
    const borda = arrastarArea(area, "e", { x: 20, y: 0 }, tamanho(100, 100), 1);
    expect(borda.largura).toBe(borda.altura);
    expect(borda.largura).toBe(60);
    // pedir mais do que a foto tem devolve a maior área possível naquela proporção
    const esticada = arrastarArea(area, "se", { x: 900, y: 900 }, tamanho(100, 100), 1);
    expect(esticada).toEqual({ x: 0, y: 0, largura: 100, altura: 100 });
  });

  it("o arrasto que começa fora da moldura desenha uma área nova", () => {
    expect(areaDoArrasto({ x: 80, y: 90 }, { x: 20, y: 30 }, tamanho(100, 100)))
      .toEqual({ x: 20, y: 30, largura: 60, altura: 60 });
    const quadrada = areaDoArrasto({ x: 0, y: 0 }, { x: 90, y: 30 }, tamanho(100, 100), 1);
    expect(Math.abs(quadrada.largura - quadrada.altura)).toBeLessThanOrEqual(1);
    expect(corteValido(quadrada)).toBe(true);
    expect(corteValido({ x: 0, y: 0, largura: 3, altura: 40 })).toBe(false);
  });

  it("toda alça tem nome para o leitor de tela, e são oito mais o mover", () => {
    expect(ALCAS).toHaveLength(8);
    expect(ALCAS.every(alca => alca.nome.length > 3)).toBe(true);
    expect(encaixarArea({ x: -20, y: 300, largura: 900, altura: 4 }, tamanho(100, 100)))
      .toEqual({ x: 0, y: 96, largura: 100, altura: 4 });
  });
});

/* -------------------------------------------------------------- luz e cor -- */

describe("luz, cor e filtros", () => {
  it("os ajustes viram a mesma string na prévia e no arquivo", () => {
    expect(filtroCss(AJUSTES_NEUTROS)).toBe("none");
    const filtro = filtroCss({ ...AJUSTES_NEUTROS, brilho: 50, contraste: -20, saturacao: 100, matiz: -30, desfoque: 4 });
    expect(filtro).toContain("brightness(1.500)");
    expect(filtro).toContain("contrast(0.800)");
    expect(filtro).toContain("saturate(2.000)");
    expect(filtro).toContain("hue-rotate(-30deg)");
    expect(filtro).toContain("blur(2.00px)");
    // temperatura e vinheta não têm filter: entram como camada por cima da foto
    expect(filtroCss({ ...AJUSTES_NEUTROS, temperatura: 40, vinheta: 30 })).toBe("none");
  });

  it("cada filtro pronto é uma receita, e mexer num controle sai do filtro", () => {
    expect(filtroAtivo(AJUSTES_NEUTROS)).toBe("original");
    const vivo = FILTROS_PRONTOS.find(item => item.id === "vivo")!;
    expect(filtroAtivo(vivo.ajustes)).toBe("vivo");
    expect(filtroAtivo({ ...vivo.ajustes, brilho: vivo.ajustes.brilho + 3 })).toBe("");
    expect(ajustesDoFiltro("preto-e-branco").saturacao).toBe(-100);
    expect(ajustesDoFiltro("filtro-que-nao-existe")).toEqual(AJUSTES_NEUTROS);
    expect(new Set(FILTROS_PRONTOS.map(item => item.id)).size).toBe(FILTROS_PRONTOS.length);
  });

  it("lê cor em três grafias e devolve sempre #rrggbb", () => {
    expect(hexParaRgb("#e297bd")).toEqual({ r: 226, g: 151, b: 189 });
    expect(hexParaRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexParaRgb("fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexParaRgb("#zzzzzz")).toBeNull();
    expect(rgbParaHex({ r: 226, g: 151, b: 189 })).toBe("#e297bd");
    expect(rgbParaHex({ r: 400, g: -12, b: 0 })).toBe("#ff0000");
    expect(corEmHex("rgb(226, 151, 189)")).toBe("#e297bd");
    expect(corEmHex("rgba(0, 0, 0, 0.4)")).toBe("#000000");
    expect(corEmHex("cor-de-rosa")).toBe("#ffffff");
  });

  it("sabe se a cor é clara, para o contorno da letra contrastar", () => {
    expect(luminancia("#000000")).toBe(0);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 6);
    expect(textoSobre("#ffffff")).toBe("#141018");
    expect(textoSobre("#111111")).toBe("#ffffff");
    expect(CORES_PRONTAS.every(cor => /^#[\da-f]{6}$/i.test(cor))).toBe(true);
    expect(new Set(CORES_PRONTAS).size).toBe(CORES_PRONTAS.length);
  });

  it("lê a cor de um pixel e devolve nulo fora da imagem", () => {
    const dados = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const medida = tamanho(2, 2);
    expect(corDoPixel(dados, medida, { x: 0, y: 0 })).toBe("#ff0000");
    expect(corDoPixel(dados, medida, { x: 1.7, y: 0.2 })).toBe("#00ff00");
    expect(corDoPixel(dados, medida, { x: 0, y: 1 })).toBe("#0000ff");
    expect(corDoPixel(dados, medida, { x: 5, y: 0 })).toBeNull();
    expect(corDoPixel(dados, medida, { x: -1, y: 0 })).toBeNull();
  });

  it("acha as cores da foto sem repetir o mesmo bege seis vezes", () => {
    const largura = 12, altura = 12;
    const dados = new Uint8ClampedArray(largura * altura * 4);
    for (let y = 0; y < altura; y += 1) {
      for (let x = 0; x < largura; x += 1) {
        const indice = (y * largura + x) * 4;
        const quente = y < altura / 2;
        // duas metades e uma variação de 5 tons dentro de cada uma (mesma caixa)
        dados[indice] = quente ? 200 + (x % 5) : 30;
        dados[indice + 1] = quente ? 30 + (x % 5) : 60 + (x % 5);
        dados[indice + 2] = quente ? 30 : 200 + (x % 5);
        dados[indice + 3] = 255;
      }
    }
    const cores = coresDominantes(dados, tamanho(largura, altura), { passo: 1, quantidade: 6 });
    // as cinco variações de cada metade cabem na mesma caixa: duas cores, não seis
    expect(cores).toHaveLength(2);
    expect(cores.some(cor => hexParaRgb(cor)!.r > 120), "achou o tom quente").toBe(true);
    expect(cores.some(cor => hexParaRgb(cor)!.b > 120), "achou o tom frio").toBe(true);
    const [uma, outra] = cores.map(cor => hexParaRgb(cor)!);
    expect(Math.hypot(uma.r - outra.r, uma.g - outra.g, uma.b - outra.b), "as duas são bem diferentes").toBeGreaterThan(40);
    // pixel transparente não entra na paleta
    const vazia = new Uint8ClampedArray(largura * altura * 4);
    expect(coresDominantes(vazia, tamanho(largura, altura), { passo: 1 })).toEqual([]);
    expect(coresDominantes(new Uint8ClampedArray(0), tamanho(0, 0))).toEqual([]);
  });

  it("lembra as últimas cores usadas, sem repetir e sem estourar", () => {
    localStorage.clear();
    expect(lerCoresRecentes()).toEqual([]);
    salvarCorRecente("#ff0000");
    salvarCorRecente("#00ff00");
    const recentes = salvarCorRecente("#ff0000");
    expect(recentes[0]).toBe("#ff0000");
    expect(recentes).toHaveLength(2);
    for (let i = 0; i < 20; i += 1) salvarCorRecente(`#${i.toString(16).padStart(2, "0")}aabb`);
    expect(lerCoresRecentes()).toHaveLength(12);
    expect(lerCoresRecentes().every(cor => /^#[\da-f]{6}$/i.test(cor))).toBe(true);
    localStorage.clear();
  });
});

/* ----------------------------------------------------------------- marcas -- */

describe("as marcas que o dedo faz", () => {
  it("o traço junta os pontos repetidos do dedo parado", () => {
    expect(caminhoDoTraco([{ x: 0, y: 0 }, { x: 0.2, y: 0.1 }, { x: 30, y: 40 }])).toHaveLength(2);
    expect(novoTraco([], { cor: "#fff", espessura: 4, opacidade: 1 })).toBeNull();
    const marca = novoTraco([{ x: 0, y: 0 }, { x: 20, y: 0 }], { cor: "#e297bd", espessura: 8.6, opacidade: 3 })!;
    expect(marca.tipo).toBe("traco");
    expect(marca.espessura).toBe(9);
    expect(marca.opacidade).toBe(1);
    expect(marca.cor).toBe("#e297bd");
  });

  it("um toque só vira um ponto, e não some", () => {
    const marca = novoTraco([{ x: 12, y: 30 }], { cor: "#fff", espessura: 10, opacidade: 1 })!;
    expect(marca.pontos).toHaveLength(1);
    expect(limitesDaMarca(marca).largura).toBe(10);
  });

  it("a figura precisa de arrasto, o texto precisa de letra", () => {
    expect(novaForma("linha", { x: 5, y: 5 }, { x: 6, y: 5 }, { cor: "#fff", espessura: 2, opacidade: 1, preenchida: false })).toBeNull();
    const seta = novaForma("seta", { x: 0, y: 0 }, { x: 40, y: 20 }, { cor: "#fff", espessura: 3, opacidade: 1, preenchida: true })!;
    expect(seta.tipo === "forma" && seta.figura).toBe("seta");
    expect(seta.preenchida).toBe(true);
    expect(novoTexto("   ", { x: 0, y: 0 }, { cor: "#fff", opacidade: 1, tamanho: 24, contorno: true })).toBeNull();
    const letra = novoTexto("  oi   tudo bem  ", { x: 4, y: 8 }, { cor: "#fff", opacidade: 1, tamanho: 24.6, contorno: false })!;
    expect(letra.tipo === "texto" && letra.texto).toBe("oi tudo bem");
    expect(letra.tipo === "texto" && letra.tamanho).toBe(25);
    expect((novoTexto("a".repeat(300), { x: 0, y: 0 }, { cor: "#fff", opacidade: 1, tamanho: 20, contorno: true }) as { texto: string }).texto).toHaveLength(120);
  });

  it("o mosaico precisa de área que dê para ver", () => {
    expect(novoBorrado({ x: 0, y: 0, largura: 3, altura: 40 }, 12)).toBeNull();
    const mosaico = novoBorrado({ x: 4.4, y: 8.6, largura: 60.2, altura: 40.1 }, 22)!;
    expect(mosaico.area).toEqual({ x: 4, y: 9, largura: 61, altura: 40 });
    expect(mosaico.bloco).toBe(22);
  });

  it("mede a marca com a grossura do traço inclusa", () => {
    const marca = traco("a", [{ x: 10, y: 10 }, { x: 40, y: 30 }], 10);
    expect(limitesDaMarca(marca)).toEqual({ x: 5, y: 5, largura: 40, altura: 30 });
  });

  it("a borracha tira só o que o dedo tocou", () => {
    const marcas: Marca[] = [
      traco("esquerda", [{ x: 10, y: 10 }, { x: 20, y: 12 }]),
      traco("direita", [{ x: 200, y: 180 }, { x: 220, y: 190 }]),
    ];
    const resultado = apagarMarcas(marcas, [{ x: 15, y: 11 }], 12);
    expect(resultado.marcas.map(marca => marca.id)).toEqual(["direita"]);
    expect(resultado.removidas).toBe(1);
    // passar longe não tira nada
    expect(apagarMarcas(marcas, [{ x: 500, y: 500 }], 12).removidas).toBe(0);
    expect(apagarMarcas(marcas, [], 12).removidas).toBe(0);
    // um risco comprido apaga as duas de uma vez
    const varrida = apagarMarcas(marcas, [{ x: 10, y: 10 }, { x: 210, y: 185 }], 14);
    expect(varrida.removidas).toBe(2);
  });

  it("acha a marca de cima para mover o texto com o dedo", () => {
    const marcas: Marca[] = [
      traco("fundo", [{ x: 10, y: 10 }]),
      { id: "letra", tipo: "texto", texto: "Oi", em: { x: 12, y: 12 }, cor: "#fff", tamanho: 30, opacidade: 1, contorno: true },
    ];
    expect(marcaNoPonto(marcas, { x: 11, y: 11 }, 8)?.id).toBe("letra");
    expect(marcaNoPonto(marcas, { x: 300, y: 300 }, 8)).toBeNull();
    const movidas = moverMarcaPara(marcas, "letra", { x: 5, y: -3 });
    expect((movidas[1] as { em: Ponto }).em).toEqual({ x: 17, y: 9 });
    expect(pontosDaMarca(movidas[0])[0]).toEqual({ x: 10, y: 10 });
  });
});

/* --------------------------------------------------------------- histórico -- */

describe("desfazer e refazer", () => {
  it("volta um passo e vai de novo", () => {
    let historia = historicoInicial(1);
    expect(podeDesfazer(historia)).toBe(false);
    expect(podeRefazer(historia)).toBe(false);
    historia = registrar(historia, 2);
    historia = registrar(historia, 3);
    expect(historia.atual).toBe(3);
    expect(podeDesfazer(historia)).toBe(true);
    historia = desfazer(historia);
    expect(historia.atual).toBe(2);
    expect(podeRefazer(historia)).toBe(true);
    historia = refazer(historia);
    expect(historia.atual).toBe(3);
    // refazer e mudar de ideia joga o futuro fora, como em qualquer editor
    historia = desfazer(historia);
    historia = registrar(historia, 9);
    expect(historia.atual).toBe(9);
    expect(podeRefazer(historia)).toBe(false);
  });

  it("não guarda mais passos do que cabe", () => {
    let historia = historicoInicial(0);
    for (let i = 1; i <= PASSOS_DE_HISTORICO + 12; i += 1) historia = registrar(historia, i);
    expect(historia.passado).toHaveLength(PASSOS_DE_HISTORICO);
    expect(historia.atual).toBe(PASSOS_DE_HISTORICO + 12);
    let desfaziveis = 0;
    while (podeDesfazer(historia)) { historia = desfazer(historia); desfaziveis += 1; }
    expect(desfaziveis).toBe(PASSOS_DE_HISTORICO);
  });

  it("desfazer sem passado e registrar o mesmo valor não fazem nada", () => {
    const historia = historicoInicial({ a: 1 });
    expect(desfazer(historia)).toBe(historia);
    expect(refazer(historia)).toBe(historia);
    expect(registrar(historia, historia.atual)).toBe(historia);
    expect(repor(historia.atual).passado).toEqual([]);
  });
});

/* --------------------------------------------------------- guardar no catálogo */

describe("a foto editada volta para o catálogo", () => {
  const resultado = { url: "data:image/webp;base64,EDITADA", largura: 80, altura: 80, filtro: "image/webp" };

  function dados(): AppData {
    const pessoa = { ...getDefaultPerson(), id: "p1", nome: "Marina" };
    pessoa.fotos = [
      foto("f1", { personId: "p1", isMain: true, name: "marina.jpg", width: 120, height: 80 }),
      foto("f2", { personId: "p1", name: "marina-2.jpg" }),
    ];
    const solta = foto("orfã", { personId: null, name: "sem-ficha.png", folderId: "pasta-1" });
    return { people: [pessoa], orphanPhotos: [solta], folders: [], albums: [] } as unknown as AppData;
  }

  it("substituir troca a imagem e não muda mais nada na ficha", () => {
    const antes = dados();
    const depois = guardarFotoEditada(antes, "f1", resultado, "substituir");
    const fotos = depois.people[0].fotos;
    expect(fotos).toHaveLength(2);
    expect(fotos[0].id).toBe("f1");
    expect(fotos[0].url).toBe(resultado.url);
    expect(fotos[0].width).toBe(80);
    expect(fotos[0].height).toBe(80);
    expect(fotos[0].isMain).toBe(true);
    expect(fotos[0].name).toBe("marina.jpg");
    expect(fotos[0].editedAt).toBeTruthy();
    // o hash é a impressão da duplicata: foto editada não pode parecer a antiga
    expect(fotos[0].hash).not.toBe(antes.people[0].fotos[0].hash);
    expect(fotos[1].url).toBe(antes.people[0].fotos[1].url);
    expect(depois.people[0].nome).toBe("Marina");
  });

  it("salvar como nova guarda a cópia ao lado da original", () => {
    const antes = dados();
    const depois = guardarFotoEditada(antes, "f1", resultado, "nova");
    const fotos = depois.people[0].fotos;
    expect(fotos).toHaveLength(3);
    expect(fotos[0].url).toBe(antes.people[0].fotos[0].url);
    expect(fotos[1].id).not.toBe("f1");
    expect(fotos[1].url).toBe(resultado.url);
    expect(fotos[1].isMain).toBe(false);
    expect(fotos[1].personId).toBe("p1");
    expect(fotos[1].name).toBe("marina-editada.jpg");
    expect(fotos[2].id).toBe("f2");
  });

  it("vale para a foto solta também", () => {
    const substituida = guardarFotoEditada(dados(), "orfã", resultado, "substituir");
    expect(substituida.orphanPhotos).toHaveLength(1);
    expect(substituida.orphanPhotos[0].url).toBe(resultado.url);
    expect(substituida.orphanPhotos[0].folderId).toBe("pasta-1");
    const nova = guardarFotoEditada(dados(), "orfã", resultado, "nova");
    expect(nova.orphanPhotos).toHaveLength(2);
    expect(nova.orphanPhotos[1].name).toBe("sem-ficha-editada.png");
    expect(nova.people[0].fotos).toHaveLength(2);
  });

  it("foto que não existe não muda nada", () => {
    const antes = dados();
    expect(guardarFotoEditada(antes, "fantasma", resultado, "substituir")).toBe(antes);
  });

  it("o nome ganha o sufixo sem perder a extensão", () => {
    expect(nomeEditado("praia.jpg")).toBe("praia-editada.jpg");
    expect(nomeEditado("sem-extensao")).toBe("sem-extensao-editada.webp");
    expect(nomeEditado("")).toBe("foto-editada.webp");
    expect(nomeEditado(undefined, "copia")).toBe("foto-copia.webp");
    const copia = fotoComoNova(foto("x", { name: "x.png", isMain: true, favorite: true }), resultado);
    expect(copia.id).not.toBe("x");
    expect(copia.isMain).toBe(false);
    expect(copia.favorite).toBe(false);
    expect(copia.width).toBe(80);
  });
});

/* ------------------------------------------------------- tela sem navegador -- */

describe("onde não há canvas, o editor avisa em vez de fingir", () => {
  const edicao = edicaoInicial(tamanho(40, 30));
  const imagem = {} as HTMLImageElement;

  it("cria a tela, mas não desenha", () => {
    const canvas = novoCanvas(40, 30);
    expect(canvas?.width).toBe(40);
    expect(canvas?.height).toBe(30);
    expect(novoCanvas(0, 10)).toBeNull();
    expect(desenharBase(canvas, imagem, edicao, 1)).toBe(false);
    expect(comporTela(canvas, null, [], 1)).toBe(false);
  });

  it("não devolve arquivo, cor nem paleta", () => {
    expect(exportarEdicao(imagem, edicao)).toBeNull();
    expect(miniaturaDeAjustes(imagem, edicao, AJUSTES_NEUTROS)).toBeNull();
    expect(corNaTela(novoCanvas(10, 10), { x: 2, y: 2 })).toBeNull();
    expect(paletaDaTela(novoCanvas(10, 10))).toEqual([]);
    expect(paletaDaTela(null)).toEqual([]);
  });
});

/* --------------------------------------------------------------- na tela -- */

/** Um contexto de mentira: registra o que foi pedido e devolve um arquivo. */
function contextoFalso(canvas: HTMLCanvasElement, chamadas: string[]) {
  const noop = (nome: string) => (..._args: unknown[]) => { chamadas.push(nome); };
  const ctx = {
    canvas,
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "",
    textBaseline: "alphabetic",
    save: noop("save"),
    restore: noop("restore"),
    setTransform: noop("setTransform"),
    clearRect: noop("clearRect"),
    translate: noop("translate"),
    scale: noop("scale"),
    rotate: noop("rotate"),
    drawImage: noop("drawImage"),
    fillRect: noop("fillRect"),
    strokeRect: noop("strokeRect"),
    beginPath: noop("beginPath"),
    closePath: noop("closePath"),
    rect: noop("rect"),
    roundRect: noop("roundRect"),
    clip: noop("clip"),
    moveTo: noop("moveTo"),
    lineTo: noop("lineTo"),
    quadraticCurveTo: noop("quadraticCurveTo"),
    arc: noop("arc"),
    ellipse: noop("ellipse"),
    stroke: noop("stroke"),
    fill: noop("fill"),
    fillText: noop("fillText"),
    strokeText: noop("strokeText"),
    putImageData: noop("putImageData"),
    createRadialGradient: () => ({ addColorStop: noop("addColorStop") }),
    getImageData: (_x: number, _y: number, largura: number, altura: number) => {
      // todo pixel é o mesmo azul-petróleo: o conta-gotas lê #0c2238
      const data = new Uint8ClampedArray(Math.max(4, largura * altura * 4));
      for (let i = 0; i < data.length; i += 4) { data[i] = 12; data[i + 1] = 34; data[i + 2] = 56; data[i + 3] = 255; }
      return { data, width: largura, height: altura };
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

/** O jsdom não carrega imagem: esta devolve onload no próximo tick. */
class ImagemDeTeste {
  naturalWidth = 120;
  naturalHeight = 80;
  width = 120;
  height = 80;
  decoding = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private valor = "";
  get src() { return this.valor; }
  set src(novo: string) { this.valor = novo; setTimeout(() => this.onload?.(), 0); }
}

/** A trilha de ferramentas fica sempre no mesmo lugar, com ou sem canvas. */
const trilha = () => document.querySelector(".editor-trilha") as HTMLElement;
const ferramenta = (nome: string) => within(trilha()).getByText(nome).closest("button") as HTMLElement;
const leitura = () => (document.querySelector(".editor-titulo small") as HTMLElement).textContent || "";

describe("o editor aberto", () => {
  const LARGURA = 480;
  const ALTURA = 360;
  let larguraOriginal: PropertyDescriptor | undefined;
  let alturaOriginal: PropertyDescriptor | undefined;

  function montar(outras?: Partial<React.ComponentProps<typeof EditorDeImagem>>) {
    const aoSalvar = vi.fn();
    const aoFechar = vi.fn();
    render(
      <CatalogProvider>
        <EditorDeImagem foto={foto("editavel", { name: "praia.webp" })} titulo="Marina" aoFechar={aoFechar} aoSalvar={aoSalvar} {...outras} />
      </CatalogProvider>,
    );
    return { aoSalvar, aoFechar };
  }

  const apontar = async () => { await waitFor(() => expect(document.querySelector(".editor-moldura")).toBeTruthy()); };

  beforeEach(() => {
    larguraOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    alturaOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => LARGURA });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => ALTURA });
    vi.stubGlobal("Image", ImagemDeTeste);
  });

  afterEach(() => {
    if (larguraOriginal) Object.defineProperty(HTMLElement.prototype, "clientWidth", larguraOriginal);
    if (alturaOriginal) Object.defineProperty(HTMLElement.prototype, "clientHeight", alturaOriginal);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("abre com a foto, as dez ferramentas e nada para desfazer", async () => {
    montar();
    await apontar();
    expect(screen.getByRole("dialog", { name: /Editor de imagens/i })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("editor-aberto")).toBe(true);
    expect(trilha().querySelectorAll("button")).toHaveLength(FERRAMENTAS.length);
    expect(FERRAMENTAS.length).toBe(10);
    expect(leitura()).toContain("120 × 80 px");
    expect(leitura()).toContain("sem mudanças");
    expect(screen.getByRole("button", { name: /Desfazer/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Refazer/i })).toBeDisabled();
    expect(document.querySelector(".editor-corte-area"), "a ferramenta de corte já abre armada").toBeTruthy();
    expect(document.querySelectorAll(".editor-corte-alca")).toHaveLength(8);
  });

  it("girar troca as medidas da foto e entra no histórico", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(ferramenta("Girar"));
    expect(screen.getByText(/Giro acumulado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Para a direita/i }));
    await waitFor(() => expect(leitura()).toContain("80 × 120 px"));
    expect(leitura()).toContain("giro de 90°");
    const desfazerBotao = screen.getByRole("button", { name: /Desfazer/i });
    expect(desfazerBotao).toBeEnabled();
    await user.click(desfazerBotao);
    await waitFor(() => expect(leitura()).toContain("120 × 80 px"));
    expect(screen.getByRole("button", { name: /Refazer/i })).toBeEnabled();
  });

  it("a proporção arma a moldura e o corte entra na receita", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(within(document.querySelector(".editor-painel") as HTMLElement).getByRole("button", { name: "1:1" }));
    await waitFor(() => expect(document.querySelector(".editor-corte-medida")?.textContent).toBe("80 × 80"));
    await user.click(screen.getByRole("button", { name: /Aplicar corte/i }));
    await waitFor(() => expect(leitura()).toContain("80 × 80 px"));
    expect(leitura()).toContain("cortada");
    expect(screen.getByRole("button", { name: /Desfazer/i })).toBeEnabled();
  });

  it("cada ferramenta mostra o seu próprio painel", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    const painel = () => document.querySelector(".editor-painel") as HTMLElement;

    await user.click(ferramenta("Pintar"));
    expect(within(painel()).getByLabelText("Espessura")).toBeInTheDocument();
    expect(within(painel()).getByLabelText("Opacidade")).toBeInTheDocument();
    expect(painel().querySelector(".editor-cor-alvo input[type=\"color\"]"), "seletor de cor").toBeTruthy();

    await user.click(ferramenta("Ajustar"));
    expect(within(painel()).getByLabelText("Brilho")).toBeInTheDocument();
    expect(within(painel()).getByLabelText("Vinheta")).toBeInTheDocument();
    expect(within(painel()).queryByLabelText("Espessura")).toBeNull();

    await user.click(ferramenta("Filtros"));
    expect(painel().querySelectorAll(".editor-filtro")).toHaveLength(FILTROS_PRONTOS.length);

    await user.click(ferramenta("Texto"));
    expect(within(painel()).getByText(/Tamanho da letra/i)).toBeInTheDocument();
    expect(within(painel()).getByText(/Contorno na letra/i)).toBeInTheDocument();

    await user.click(ferramenta("Esconder"));
    expect(within(painel()).getByText(/Tamanho do quadradinho/i)).toBeInTheDocument();

    await user.click(ferramenta("Cor"));
    expect(within(painel()).getByText(/Conta-gotas/i)).toBeInTheDocument();
  });

  it("as teclas trocam de ferramenta sem tirar a mão da foto", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.keyboard("p");
    await waitFor(() => expect(ferramenta("Pintar").getAttribute("aria-pressed")).toBe("true"));
    await user.keyboard("t");
    await waitFor(() => expect(ferramenta("Texto").getAttribute("aria-pressed")).toBe("true"));
    await user.keyboard("c");
    await waitFor(() => expect(ferramenta("Cortar").getAttribute("aria-pressed")).toBe("true"));
  });

  it("tocar na paleta escolhe a cor do pincel", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(ferramenta("Pintar"));
    const painel = document.querySelector(".editor-painel") as HTMLElement;
    const alvo = CORES_PRONTAS[4];
    await user.click(within(painel).getByLabelText(`Pintar com ${alvo}`));
    const hex = within(painel).getByLabelText(/Cor em hexadecimal/i) as HTMLInputElement;
    expect(hex.value).toBe(alvo);
    expect(hex.value).toMatch(/^#[\da-f]{6}$/i);
  });

  it("segurar o “Original” mostra a foto como ela entrou", async () => {
    montar();
    await apontar();
    const botao = screen.getByRole("button", { name: /Original/i });
    expect(document.querySelector(".editor-original"), "nada de original antes de segurar").toBeNull();
    expect(botao.getAttribute("aria-pressed")).toBe("false");

    act(() => { botao.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".editor-original")).toBeTruthy());
    // é a foto que entrou, não um segundo desenho: o src é o mesmo do arquivo
    expect((document.querySelector(".editor-original") as HTMLImageElement).getAttribute("src")).toContain("AAAAeditavel");
    expect(document.querySelector(".editor-original-legenda")?.textContent).toContain("Foto original");
    expect(document.querySelector(".editor-moldura")?.className).toContain("comparando");
    expect(botao.getAttribute("aria-pressed")).toBe("true");

    act(() => { botao.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".editor-original")).toBeNull());
    expect(document.querySelector(".editor-moldura")?.className).not.toContain("comparando");
    expect(botao.getAttribute("aria-pressed")).toBe("false");
  });

  it("o “Original” também responde a segurar uma tecla, para quem não usa o dedo", async () => {
    montar();
    await apontar();
    const botao = screen.getByRole("button", { name: /Original/i });
    act(() => { botao.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".editor-original")).toBeTruthy());
    act(() => { botao.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true })); });
    await waitFor(() => expect(document.querySelector(".editor-original")).toBeNull());
  });

  it("sem canvas ele diz o que não deu, e não mostra um retângulo preto", async () => {
    const { aoSalvar } = montar();
    await apontar();
    await waitFor(() => expect(document.querySelector(".editor-aviso")?.textContent).toContain("não devolveu um canvas"));
    expect(document.querySelector(".editor-tela-fallback"), "a foto continua visível por cima").toBeTruthy();
    // sem canvas não há arquivo: o Salvar avisa em vez de devolver um PNG vazio
    await userEvent.setup().click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(aoSalvar).not.toHaveBeenCalled());
  });

  it("Esc sai direto quando nada mudou e pergunta quando mudou", async () => {
    const user = userEvent.setup();
    const { aoFechar } = montar();
    await apontar();
    await user.keyboard("[Escape]");
    await waitFor(() => expect(aoFechar).toHaveBeenCalledTimes(1));
    expect(document.querySelector(".editor-confirmar")).toBeNull();
  });

  it("com mudança, o Esc oferece continuar ou descartar", async () => {
    const user = userEvent.setup();
    const { aoFechar } = montar();
    await apontar();
    await user.click(ferramenta("Girar"));
    await user.click(screen.getByRole("button", { name: /Para a esquerda/i }));
    await waitFor(() => expect(leitura()).toContain("giro de 270°"));
    await user.keyboard("[Escape]");
    await waitFor(() => expect(document.querySelector(".editor-confirmar")).toBeTruthy());
    expect(aoFechar).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Continuar editando/i }));
    await waitFor(() => expect(document.querySelector(".editor-confirmar")).toBeNull());
    await user.keyboard("[Escape]");
    await waitFor(() => expect(document.querySelector(".editor-confirmar")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Descartar e sair/i }));
    await waitFor(() => expect(aoFechar).toHaveBeenCalledTimes(1));
  });

  it("o “⋯” guarda a cópia, o download e a volta ao original", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(screen.getByRole("button", { name: /Mais opções/i }));
    await waitFor(() => expect(document.querySelector(".editor-mais")).toBeTruthy());
    const menu = document.querySelector(".editor-mais") as HTMLElement;
    expect(within(menu).getByText("Salvar como nova foto")).toBeInTheDocument();
    expect(within(menu).getByText("Baixar a edição")).toBeInTheDocument();
    expect(within(menu).getByText("Voltar à foto original")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Fechar as opções/i }));
    await waitFor(() => expect(document.querySelector(".editor-mais")).toBeNull());
  });
});

describe("o editor com um canvas de mentira", () => {
  let chamadas: string[] = [];

  beforeEach(() => {
    chamadas = [];
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 480 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 360 });
    vi.stubGlobal("Image", ImagemDeTeste);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      // um caderno de chamadas só: base, tela e exportação escrevem no mesmo
      return contextoFalso(this, chamadas) as unknown as ReturnType<HTMLCanvasElement["getContext"]>;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,ARQUIVO");
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 480, bottom: 320, width: 480, height: 320, toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function montar() {
    const aoSalvar = vi.fn();
    render(
      <CatalogProvider>
        <EditorDeImagem foto={foto("com-tela")} aoFechar={vi.fn()} aoSalvar={aoSalvar} />
      </CatalogProvider>,
    );
    return aoSalvar;
  }

  const apontar = async () => { await waitFor(() => expect(document.querySelector(".editor-tela")).toBeTruthy()); };

  /** jsdom não tem PointerEvent: um MouseEvent com o nome do evento chega no React. */
  function gestoNaTela(evento: string, clientX: number, clientY: number) {
    const tela = document.querySelector(".editor-tela") as HTMLElement;
    act(() => { tela.dispatchEvent(new MouseEvent(evento, { clientX, clientY, bubbles: true })); });
  }

  it("desenha a base e as marcas no canvas", async () => {
    montar();
    await apontar();
    await waitFor(() => expect(chamadas).toContain("drawImage"));
    expect(chamadas).toContain("clearRect");
    expect(document.querySelector(".editor-aviso"), "com canvas não há aviso de tela").toBeNull();
  });

  it("o dedo que arrasta vira um traço na receita", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(ferramenta("Pintar"));
    gestoNaTela("pointerdown", 120, 80);
    gestoNaTela("pointermove", 200, 140);
    gestoNaTela("pointermove", 300, 200);
    gestoNaTela("pointerup", 300, 200);
    await waitFor(() => expect(document.querySelector(".editor-titulo small")?.textContent).toContain("1 marca"));
    expect(chamadas).toContain("stroke");
    expect(screen.getByRole("button", { name: /Desfazer/i })).toBeEnabled();
  });

  it("o conta-gotas lê o pixel da tela", async () => {
    const user = userEvent.setup();
    montar();
    await apontar();
    await user.click(ferramenta("Cor"));
    gestoNaTela("pointerdown", 240, 160);
    await waitFor(() => expect(document.querySelector(".editor-cor-amostra")).toBeTruthy());
    // o painel mostra em caixa alta; o pixel lido é o azul-petróleo do canvas
    expect(document.querySelector(".editor-cor-lida strong")?.textContent).toBe("#0C2238");
    expect(document.querySelector(".editor-cor-amostra")).toBeTruthy();
  });

  it("salvar gera o arquivo e devolve para quem chamou", async () => {
    const user = userEvent.setup();
    const aoSalvar = montar();
    await apontar();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const [resultado, modo] = aoSalvar.mock.calls[0];
    expect(modo).toBe("substituir");
    expect(resultado.url).toBe("data:image/webp;base64,ARQUIVO");
    expect(resultado.largura).toBe(120);
    expect(resultado.altura).toBe(80);
    expect(resultado.filtro).toMatch(/^image\//);
  });

  it("salvar como nova mantém o mesmo arquivo e avisa o modo", async () => {
    const user = userEvent.setup();
    const aoSalvar = montar();
    await apontar();
    await user.click(screen.getByRole("button", { name: /Salvar como nova/i }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(aoSalvar.mock.calls[0][1]).toBe("nova");
  });

  it("o contorno entra na receita, aparece no topo e sai no arquivo", async () => {
    const user = userEvent.setup();
    const aoSalvar = montar();
    await apontar();
    const painel = document.querySelector(".editor-painel") as HTMLElement;
    expect(within(painel).getByText("Contorno")).toBeInTheDocument();
    await user.click(within(painel).getByRole("button", { name: "Oval" }));
    await waitFor(() => expect(leitura()).toContain("recorte oval"));
    // a base foi refeita com o caminho do contorno
    expect(chamadas).toContain("ellipse");
    expect(chamadas).toContain("clip");
    await user.click(screen.getByRole("button", { name: /Desfazer/i }));
    await waitFor(() => expect(leitura()).not.toContain("recorte oval"));
    await user.click(within(painel).getByRole("button", { name: "Arredondada" }));
    await waitFor(() => expect(leitura()).toContain("cantos arredondados"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(aoSalvar.mock.calls[0][0].largura).toBe(120);
  });

  it("o tamanho salvo promete no painel e segura o arquivo", async () => {
    const user = userEvent.setup();
    const aoSalvar = montar();
    await apontar();
    const painel = document.querySelector(".editor-painel") as HTMLElement;
    expect(within(painel).getByText("Vai salvar")).toBeInTheDocument();
    expect(leitura()).not.toContain("salva com até");
    await user.click(within(painel).getByRole("button", { name: "Pequena" }));
    await waitFor(() => expect(leitura()).toContain("salva com até 800px"));
    // a foto de teste tem 120px: o limite não corta nada, e o painel diz isso
    expect(leitura()).toContain("120 × 80 px");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(aoSalvar.mock.calls[0][0].largura).toBe(120);
    expect(aoSalvar.mock.calls[0][0].altura).toBe(80);
  });
});

/* ------------------------------------------------------------------- CSS -- */

describe("o editor no estilo do aplicativo", () => {
  const css = cssDoApp;

  it("abre por cima do visor e da folha, e trava a rolagem", () => {
    expect(css).toMatch(/\.editor\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.editor\s*\{[^}]*z-index:\s*300/);
    expect(css).toMatch(/html\.editor-aberto[^{]*\{[^}]*overflow:\s*hidden/);
    expect(Number(/\.visor\s*\{[^}]*z-index:\s*(\d+)/.exec(css)?.[1]).valueOf()).toBeLessThan(300);
    expect(Number(/\.folha-overlay\s*\{[^}]*z-index:\s*(\d+)/.exec(css)?.[1]).valueOf()).toBeLessThan(300);
  });

  it("no aparelho a doca sai da frente e o painel vira faixa embaixo", () => {
    expect(css).toMatch(/html\.editor-aberto \.mobile-bottom-nav\s*\{[^}]*translateY\(140%\)/);
    expect(css).toMatch(/\.editor-corpo\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);\s*grid-template-rows:\s*minmax\(0, 1fr\) auto/);
    expect(css).toMatch(/\.editor-painel\s*\{[^}]*max-height:\s*min\(42vh/);
    expect(css).toMatch(/\.editor-base\s*\{[^}]*env\(safe-area-inset-bottom/);
  });

  it("a tela não rola com o dedo enquanto se pinta", () => {
    expect(css).toMatch(/\.editor-moldura\s*\{[^}]*touch-action:\s*none/);
    expect(css).toMatch(/\.editor-tela\s*\{[^}]*touch-action:\s*none/);
    expect(css).toMatch(/\.editor-corte-area\s*\{[^}]*touch-action:\s*none/);
  });

  it("as alças do corte têm alvo de dedo e a moldura escurece o que fica fora", () => {
    expect(css).toMatch(/\.editor-corte-area\s*\{[^}]*box-shadow:\s*0 0 0 9999px/);
    expect(css).toMatch(/\.editor-corte-alca\s*\{\s*width:\s*34px;\s*height:\s*34px/);
    expect(css).toMatch(/\.editor-ferramenta\s*\{[^}]*min-height:\s*52px/);
    // tecla é coisa de computador: no aparelho o atalho some do botão
    expect(css).toMatch(/\.editor-ferramenta kbd\s*\{\s*display:\s*none/);
  });

  it("o antes/depois tem alvo de dedo e não depende do canvas", () => {
    // segurar é gesto: o botão não pode deixar a tela rolar nem selecionar texto
    expect(cssDoApp).toMatch(/\.editor-comparar \{[^}]*touch-action: none/);
    expect(cssDoApp).toMatch(/\.editor-comparar \{[^}]*min-height: 34px/);
    expect(cssDoApp).toMatch(/\.editor-original \{[^}]*object-fit: contain/);
    expect(cssDoApp).toMatch(/\.editor-moldura\.comparando \.editor-corte,[\s\S]{0,90}\.editor-moldura\.comparando \.editor-texto \{ display: none; \}/);
    // no aparelho o alvo sobe para 40px
    expect(cssDoApp).toMatch(/\.editor-comparar \{ top: 8px; right: 8px; min-height: 40px/);
  });

  it("o painel fica à direita só no computador", () => {
    expect(css).toMatch(/@media \(min-width: 1101px\) \{[\s\S]{0,120}\.editor-corpo\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\) 340px/);
  });
});

/* ------------------------------------------------------- galeria → editor -- */

describe("a galeria abre o editor", () => {
  beforeEach(async () => {
    vi.stubGlobal("Image", ImagemDeTeste);
    await seedIdb(seededData(6, 2));
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  async function abrirGaleria(user: ReturnType<typeof userEvent.setup>) {
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Galeria/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".gallery-page")).toBeTruthy());
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(2));
  }

  it("segurar a foto oferece a edição", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[1];
    await act(async () => {
      azulejo.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200, clientY: 300, bubbles: true }));
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    await waitFor(() => expect(document.querySelector(".folha-acoes")).toBeTruthy());
    const folha = document.querySelector(".folha-acoes") as HTMLElement;
    expect(within(folha).getByText("Editar imagem")).toBeInTheDocument();
    await act(async () => { within(folha).getByText("Editar imagem").click(); });
    await waitFor(() => expect(document.querySelector(".editor")).toBeTruthy());
    expect(screen.getByRole("dialog", { name: /Editor de imagens/i })).toBeInTheDocument();
  }, 25000);

  it("o visor tem o lápis no topo, ao lado do coração", async () => {
    const user = userEvent.setup();
    await abrirGaleria(user);
    const azulejo = document.querySelectorAll<HTMLElement>(".azulejo")[1];
    await act(async () => { azulejo.click(); });
    await waitFor(() => expect(document.querySelector(".visor")).toBeTruthy());
    const botao = screen.getByRole("button", { name: /Editar esta imagem/i });
    await act(async () => { botao.click(); });
    await waitFor(() => expect(document.querySelector(".editor")).toBeTruthy());
    // o editor fica por cima do visor, que continua aberto por baixo
    expect(document.querySelector(".visor")).toBeTruthy();
    expect(document.documentElement.classList.contains("editor-aberto")).toBe(true);
  }, 25000);
});

describe("a divisão do editor", () => {
  // O editor nasceu grande demais para um arquivo só: a tela (canvas, medidas,
  // base pronta) e o gesto (dedo → marca) têm casa própria. Se voltarem para
  // dentro do componente, ele passa do limite que o resto do aplicativo respeita.
  const linhas = (caminho: string) =>
    readFileSync(join(__dirname, "..", caminho), "utf8").split("\n").length;

  it("deixa a tela, o gesto e o palco fora do componente", () => {
    const pasta = "src/features/gallery/components";
    expect(linhas(`${pasta}/useTelaDoEditor.ts`)).toBeGreaterThan(60);
    expect(linhas(`${pasta}/useGestosDoEditor.ts`)).toBeGreaterThan(80);
    expect(linhas(`${pasta}/PalcoDeEdicao.tsx`)).toBeGreaterThan(80);
    expect(linhas(`${pasta}/EditorDeImagem.tsx`)).toBeLessThan(520);
    expect(linhas(`${pasta}/PainelDeEdicao.tsx`)).toBeLessThan(520);
  });

  it("não toca na foto original: só existe receita até o salvar", () => {
    const tela = readFileSync(join(__dirname, "..", "src/features/gallery/tela.ts"), "utf8");
    const edicao = readFileSync(join(__dirname, "..", "src/features/gallery/edicao.ts"), "utf8");
    // a regra é conta pura: nem React, nem canvas, nem navegador dentro dela
    expect(edicao).not.toMatch(/^import .*react/im);
    expect(edicao).not.toMatch(/getContext\(|document\.|window\./);
    expect(edicao).not.toMatch(/from '\.\/tela'/);
    // e a exportação acontece uma vez só, com limite de lado
    expect(tela).toMatch(/limite = 2400/);
    expect(tela).toMatch(/export function exportarEdicao/);
  });
});

/* --------------------------------------------------------- várias fotos -- */

describe("o mesmo ajuste em várias fotos", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 480 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 360 });
    vi.stubGlobal("Image", ImagemDeTeste);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

  function montar(fotos: Photo[]) {
    const aoFechar = vi.fn();
    const aoTerminar = vi.fn();
    render(
      <CatalogProvider>
        <AjusteEmLote fotos={fotos} aoFechar={aoFechar} aoTerminar={aoTerminar} />
      </CatalogProvider>,
    );
    return { aoFechar, aoTerminar };
  }

  /** jsdom não move slider com seta de teclado: usa o setter nativo, como o React espera. */
  function mexerNoTrilho(rotulo: string, valor: string) {
    const trilho = screen.getByLabelText(rotulo) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(trilho, valor);
      trilho.dispatchEvent(new Event("input", { bubbles: true }));
      trilho.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return trilho;
  }

  const filtroDe = (id: string) => FILTROS_PRONTOS.find(item => item.id === id)!;

  it("mostra o antes e o depois sem usar canvas nenhum", async () => {
    const user = userEvent.setup();
    montar([foto("lote-a", { name: "praia-a.jpg" }), foto("lote-b", { name: "praia-b.jpg" })]);

    expect(screen.getByText("Ajustar a luz de várias fotos")).toBeInTheDocument();
    expect(screen.getByText(/2 fotos escolhidas/)).toBeInTheDocument();
    const aplicar = screen.getByRole("button", { name: /Aplicar em 2 fotos/i });
    expect(aplicar, "nada escolhido ainda, nada para aplicar").toBeDisabled();

    const legendas = [...document.querySelectorAll(".ajuste-lote-previa figcaption")].map(node => node.textContent);
    expect(legendas[0]).toBe("Antes");
    expect(legendas[1]).toContain("praia-a.jpg");

    await user.click(screen.getByRole("button", { name: /Quente/i }));
    const depois = document.querySelectorAll<HTMLImageElement>(".ajuste-lote-previa img")[1];
    // a prévia é a mesma string que o canvas vai aplicar: não é um palpite
    expect(depois.style.filter).toBe(filtroCss(filtroDe("quente").ajustes));
    expect(depois.style.filter).not.toBe("none");
    expect(aplicar).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Zerar/i }));
    expect(aplicar).toBeDisabled();
    expect(document.querySelectorAll<HTMLImageElement>(".ajuste-lote-previa img")[1].style.filter).toBe("none");
  });

  it("tem um trilho para cada ajuste, e mexer nele sai da receita pronta", async () => {
    const user = userEvent.setup();
    montar([foto("lote-a")]);
    for (const item of LIMITES_DO_AJUSTE) {
      expect(screen.getByLabelText(item.nome), `falta o trilho de ${item.nome}`).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: /Frio/i }));
    expect(screen.getByRole("button", { name: /Frio/i }).getAttribute("aria-pressed")).toBe("true");

    mexerNoTrilho("Brilho", "18");
    expect(screen.getByLabelText("Brilho").value).toBe("18");
    expect(screen.getByRole("button", { name: /Frio/i }).getAttribute("aria-pressed"),
      "mexer num controle tira a foto da receita pronta").toBe("false");
    expect(screen.getByRole("button", { name: /Aplicar em 1 foto/i })).toBeEnabled();
  });

  it("sem canvas, diz o que não deu e não fecha deixando a pessoa no escuro", async () => {
    const user = userEvent.setup();
    const { aoFechar, aoTerminar } = montar([foto("lote-a"), foto("lote-b")]);
    await user.click(screen.getByRole("button", { name: /Quente/i }));
    await user.click(screen.getByRole("button", { name: /Aplicar em 2 fotos/i }));
    await waitFor(() => expect(document.querySelector(".ajuste-lote-falhas")).toBeTruthy());
    const aviso = document.querySelector(".ajuste-lote-falhas")!;
    expect(aviso.textContent).toContain("Não abriu: lote-a.webp, lote-b.webp");
    expect(aviso.textContent).toContain("não pode ser reencodada");
    expect(aoTerminar).toHaveBeenCalledWith(0, 2);
    expect(aoFechar, "a folha continua aberta para mostrar o motivo").not.toHaveBeenCalled();
  });

  it("grava o ajuste nas fotos do catálogo, todas de uma vez", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      const chamadas: string[] = [];
      return contextoFalso(this, chamadas) as unknown as ReturnType<HTMLCanvasElement["getContext"]>;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,LOTE");

    const dados = seededData(3, 2);
    await seedIdb(dados);
    // seed-0 nasce marcada como apagada (o gerador faz isso com i % 17) e some da
    // galeria: o lote usa a seed-1, que está inteira.
    const fotos = dados.people.find(pessoa => pessoa.id === "seed-1")!.fotos;
    expect(fotos).toHaveLength(2);

    let vistos: AppData | null = null;
    function Sonda() { vistos = useCatalog().data; return null; }

    const aoFechar = vi.fn();
    render(
      <CatalogProvider>
        <Sonda />
        <AjusteEmLote fotos={fotos} aoFechar={aoFechar} />
      </CatalogProvider>,
    );
    await waitFor(() => expect(vistos?.people.some(pessoa => pessoa.id === "seed-1")).toBe(true), { timeout: 10000 });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Quente/i }));
    await user.click(screen.getByRole("button", { name: /Aplicar em 2 fotos/i }));
    await waitFor(() => expect(aoFechar).toHaveBeenCalledTimes(1), { timeout: 10000 });

    const depois = getAllPhotos(vistos!).filter(photo => fotos.some(antes => antes.id === photo.id));
    expect(depois).toHaveLength(2);
    expect(depois.every(photo => photo.url === "data:image/webp;base64,LOTE"), "as duas ganharam o arquivo novo").toBe(true);
    expect(depois.every(photo => !!photo.editedAt), "as duas dizem quando foram editadas").toBe(true);
    expect(depois.every(photo => photo.width === 120 && photo.height === 80), "o mosaico sabe o tamanho novo").toBe(true);
    // a ficha continua sendo a dona das duas
    expect(depois.every(photo => photo.personId === "seed-1")).toBe(true);
  }, 30000);

  it("o lote da galeria e o do cofre oferecem o ajuste", async () => {
    const user = userEvent.setup();
    await seedIdb(seededData(6, 2));
    await bootApp(user);
    const aside = document.querySelector(".sidebar") as HTMLElement;
    await act(async () => { (within(aside).getByRole("button", { name: /Galeria/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelectorAll(".azulejo").length).toBeGreaterThan(2));

    await act(async () => { (screen.getByRole("button", { name: /Organizar fotos/i }) as HTMLElement).click(); });
    const azulejos = document.querySelectorAll<HTMLElement>(".azulejo");
    await act(async () => { azulejos[0].click(); });
    await act(async () => { azulejos[1].click(); });
    await waitFor(() => expect(document.querySelector(".gallery-lote")).toBeTruthy());

    const barra = document.querySelector(".gallery-lote") as HTMLElement;
    await act(async () => { (within(barra).getByRole("button", { name: /Ajustar/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector(".ajuste-lote")).toBeTruthy());
    expect(screen.getByText("Ajustar a luz de várias fotos")).toBeInTheDocument();
    expect(screen.getByText(/2 fotos escolhidas/)).toBeInTheDocument();
  }, 30000);

  it("no aparelho os filtros rolam de lado e o trilho tem altura de dedo", () => {
    expect(cssDoApp).toMatch(/\.ajuste-lote-filtros \{[^}]*overflow-x: auto/);
    expect(cssDoApp).toMatch(/\.ajuste-lote-filtro \{[^}]*flex: none/);
    expect(cssDoApp).toMatch(/\.ajuste-lote-previa \{[^}]*grid-template-columns: 1fr 1fr/);
    // a prévia é CSS, não um segundo canvas
    expect(cssDoApp).toMatch(/\.ajuste-lote-previa img \{[^}]*object-fit: cover/);
    expect(cssDoApp).toMatch(/\.ajuste-lote-trilho input\[type="range"\] \{ height: var\(--alvo\); \}/);
    expect(cssDoApp).toMatch(/\.ajuste-lote-filtro \{ width: 92px; \}/);
  });
});

/* ------------------------------------------- contorno e tamanho do arquivo -- */

describe("o contorno da foto e o tamanho do arquivo salvo", () => {
  it("a receita começa sem contorno, e o contorno conta como mudança", () => {
    const base = tamanho(1200, 800);
    expect(edicaoInicial(base).formato).toBe("retangulo");
    expect(temMudanca(edicaoInicial(base), base)).toBe(false);
    expect(temMudanca({ ...edicaoInicial(base), formato: "oval" }, base)).toBe(true);
    expect(FORMATOS_DO_RECORTE.map(item => item.id)).toEqual(["retangulo", "arredondado", "oval"]);
    expect(resumoDoFormato("retangulo")).toBe("");
    expect(resumoDoFormato("arredondado")).toBe("cantos arredondados");
    expect(resumoDoFormato("oval")).toBe("recorte oval");
  });

  it("o raio dos cantos acompanha o lado menor da foto", () => {
    expect(raioDoArredondado(tamanho(1000, 500))).toBe(60);
    expect(raioDoArredondado(tamanho(500, 1000))).toBe(60);
    expect(raioDoArredondado(tamanho(40, 30))).toBe(4);
    expect(raioDoArredondado(tamanho(3, 3))).toBe(1);
  });

  it("o limite segura o lado maior e encolhe o outro junto", () => {
    expect(TAMANHOS_DE_SAIDA.map(item => item.id)).toEqual(["cheia", "grande", "media", "pequena"]);
    expect(tamanhoDoLimite("pequena")).toBe(800);
    expect(tamanhoDoLimite("cheia")).toBe(2400);
    expect(tamanhoDoLimite("inventado")).toBe(2400);
    expect(tamanhoExportado(tamanho(3000, 2000), 800)).toEqual(tamanho(800, 533));
    expect(tamanhoExportado(tamanho(2000, 3000), 1200)).toEqual(tamanho(800, 1200));
    expect(tamanhoExportado(tamanho(640, 480), 2400)).toEqual(tamanho(640, 480));
    expect(fatorDoLimite(tamanho(640, 480), 2400)).toBe(1);
    expect(fatorDoLimite(tamanho(3000, 2000), 800)).toBeCloseTo(800 / 3000);
  });
});

describe("o contorno no desenho", () => {
  let chamadas: string[] = [];
  const tela = (largura = 40, altura = 30) => novoCanvas(largura, altura) as HTMLCanvasElement;

  beforeEach(() => {
    chamadas = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      return contextoFalso(this, chamadas) as unknown as ReturnType<HTMLCanvasElement["getContext"]>;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,ARQUIVO");
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("cada contorno pede o seu caminho", () => {
    const ctx = contextoFalso(tela(), chamadas);
    caminhoDoFormato(ctx, "oval", tamanho(40, 30));
    expect(chamadas).toEqual(["beginPath", "ellipse"]);
    chamadas.length = 0;
    caminhoDoFormato(ctx, "arredondado", tamanho(40, 30));
    expect(chamadas).toEqual(["beginPath", "roundRect"]);
    chamadas.length = 0;
    caminhoDoFormato(ctx, "retangulo", tamanho(40, 30));
    expect(chamadas).toEqual(["beginPath", "rect"]);
  });

  it("recortar só vale quando há contorno, e diz se precisa desfazer", () => {
    const ctx = contextoFalso(tela(10, 10), chamadas);
    expect(recortarNoFormato(ctx, "retangulo", tamanho(10, 10))).toBe(false);
    expect(chamadas).toEqual([]);
    expect(recortarNoFormato(ctx, "oval", tamanho(10, 10))).toBe(true);
    expect(chamadas).toEqual(["save", "beginPath", "ellipse", "clip"]);
  });

  it("a base, a prévia e o arquivo saem recortados", () => {
    const imagem = new ImagemDeTeste() as unknown as HTMLImageElement;
    const oval = { ...edicaoInicial(tamanho(120, 80)), formato: "oval" } as Edicao;
    expect(desenharBase(tela(120, 80), imagem, oval, 1)).toBe(true);
    expect(chamadas).toContain("clip");
    expect(chamadas).toContain("drawImage");

    chamadas.length = 0;
    expect(comporTela(tela(120, 80), tela(120, 80), [], 1, null, "oval")).toBe(true);
    expect(chamadas).toContain("clip");

    chamadas.length = 0;
    expect(comporTela(tela(120, 80), tela(120, 80), [], 1)).toBe(true);
    expect(chamadas).not.toContain("clip");

    chamadas.length = 0;
    const resultado = exportarEdicao(imagem, oval);
    expect(resultado?.largura).toBe(120);
    expect(resultado?.altura).toBe(80);
    expect(chamadas).toContain("clip");
  });

  it("o limite da exportação segura as medidas do arquivo", () => {
    const imagem = new ImagemDeTeste() as unknown as HTMLImageElement;
    const edicao = edicaoInicial(tamanho(120, 80));
    expect(exportarEdicao(imagem, edicao)?.largura).toBe(120);
    const pequena = exportarEdicao(imagem, edicao, { limite: 60 });
    expect(pequena?.largura).toBe(60);
    expect(pequena?.altura).toBe(40);
  });
});
