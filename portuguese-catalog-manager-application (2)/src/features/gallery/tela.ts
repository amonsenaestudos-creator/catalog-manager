/**
 * A tela que desenha: canvas, pixels e arquivo.
 *
 * É a metade do editor que precisa de navegador — e por isso fica separada de
 * `edicao.ts`, que é conta pura. Aqui tudo devolve `null` quando não há canvas
 * (navegador antigo, teste automatizado, imagem bloqueada), porque o editor tem
 * de continuar de pé e explicar o que não deu, em vez de mostrar uma tela preta.
 *
 * O desenho acontece em duas camadas:
 *   · **base** — a foto com corte, giro, espelho e ajustes. Só refaz quando a
 *     geometria ou a luz mudam, nunca a cada movimento do dedo;
 *   · **marcas** — traços, figuras, texto e mosaico por cima. Refaz a cada
 *     quadro, e é barato porque é vetor.
 * Assim pintar não reencoda a foto e não engasga no aparelho.
 */
import type {
  Ajustes, Edicao, FormatoDoRecorte, Geometria, Marca, Ponto, ResultadoDaEdicao, Tamanho,
} from './edicao';
import {
  coresDominantes, fatorDoLimite, filtroCss, raioDoArredondado, rgbParaHex, tamanhoDaSaida,
  tamanhoExportado, textoSobre,
} from './edicao';

export type Imagem = HTMLImageElement | ImageBitmap;

/** A fonte usada nas letras colocadas sobre a foto: a mesma do aplicativo. */
const FONTE = "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif";

export function carregarImagem(url: string): Promise<HTMLImageElement | null> {
  if (!url || typeof Image !== 'function') return Promise.resolve(null);
  return new Promise(resolve => {
    const imagem = new Image();
    const acabar = (deu: boolean) => resolve(deu ? imagem : null);
    imagem.onload = () => acabar((imagem.naturalWidth || 0) > 0 && (imagem.naturalHeight || 0) > 0);
    imagem.onerror = () => acabar(false);
    imagem.decoding = 'async';
    imagem.src = url;
  });
}

export function tamanhoNatural(imagem: Imagem | null): Tamanho {
  if (!imagem) return { largura: 0, altura: 0 };
  const html = imagem as HTMLImageElement;
  return {
    largura: Math.round(html.naturalWidth || imagem.width || 0),
    altura: Math.round(html.naturalHeight || imagem.height || 0),
  };
}

export function novoCanvas(largura: number, altura: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !(largura > 0) || !(altura > 0)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largura));
  canvas.height = Math.max(1, Math.round(altura));
  return canvas;
}

/**
 * O contexto 2D, ou `null` quando não há canvas.
 *
 * `ler` pede um canvas guardado na memória do processador, que é o que deixa
 * `getImageData` barato. Só vale para quem lê pixel de fato (conta-gotas e
 * paleta): num canvas que se redesenha a cada movimento do dedo, essa escolha
 * tiraria a aceleração do desenho e o traço engasgaria no aparelho. O atributo
 * só vale na primeira chamada pelo mesmo canvas, então quem desenha vem antes e
 * a leitura se acomoda com o contexto que já existe.
 */
const contexto = (canvas: HTMLCanvasElement | null, ler = false): CanvasRenderingContext2D | null => {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  try { return canvas.getContext('2d', ler ? { willReadFrequently: true } : undefined); } catch { return null; }
};

/**
 * O formato de saída do aparelho.
 *
 * O catálogo guarda WebP (pesa um terço do PNG na mesma qualidade); onde não
 * existe WebP cai em JPEG, e só então em PNG — nunca o contrário, porque uma
 * foto em PNG de 1.440px entra com 3 MB no armazenamento local.
 */
let formatoConhecido = '';
export function formatoDeSaida(): string {
  if (formatoConhecido) return formatoConhecido;
  const canvas = novoCanvas(2, 2);
  const ctx = contexto(canvas);
  if (!ctx) return 'image/png';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 2, 2);
  const aceita = (tipo: string) => {
    try { return canvas!.toDataURL(tipo).startsWith(`data:${tipo}`); } catch { return false; }
  };
  formatoConhecido = aceita('image/webp') ? 'image/webp' : aceita('image/jpeg') ? 'image/jpeg' : 'image/png';
  return formatoConhecido;
}

/** `ctx.filter` não existe em todo canto (Safari antigo): a prévia cai no CSS. */
export function filtroNoContexto(ctx: CanvasRenderingContext2D): boolean {
  return typeof (ctx as CanvasRenderingContext2D & { filter?: string }).filter === 'string';
}

/* ------------------------------------------------------------------- base -- */

/**
 * Desenha a foto (corte + giro + espelho) no contexto, com `escala` pixels de
 * tela para cada pixel da saída.
 *
 * A ordem das transformações é a da conta em `edicao.ts`: gira e depois
 * espelha. No canvas isso significa chamar `rotate` antes de `scale(-1)`,
 * porque a última transformação declarada é a primeira que o ponto atravessa.
 */
export function desenharFoto(
  ctx: CanvasRenderingContext2D,
  imagem: Imagem,
  geometria: Geometria,
  escala: number,
  ajustes?: Ajustes,
) {
  const { corte, giro, espelharH, espelharV } = geometria;
  const saida = tamanhoDaSaida(geometria);
  const filtro = ajustes ? filtroCss(ajustes) : 'none';
  ctx.save();
  if (filtro !== 'none' && filtroNoContexto(ctx)) ctx.filter = filtro;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate((saida.largura * escala) / 2, (saida.altura * escala) / 2);
  if (espelharH) ctx.scale(-1, 1);
  if (espelharV) ctx.scale(1, -1);
  if (giro) ctx.rotate((giro * Math.PI) / 180);
  ctx.drawImage(
    imagem as CanvasImageSource,
    corte.x, corte.y, Math.max(1, corte.largura), Math.max(1, corte.altura),
    (-corte.largura * escala) / 2, (-corte.altura * escala) / 2,
    corte.largura * escala, corte.altura * escala,
  );
  ctx.restore();
  if (filtro !== 'none' && filtroNoContexto(ctx)) ctx.filter = 'none';
}

/**
 * O caminho do contorno pedido, no tamanho em pixels que vai ser desenhado.
 *
 * Fica aqui (e não em `edicao.ts`) porque é desenho: `edicao.ts` guarda só o
 * raio, que é conta. `roundRect` é recente demais para todo navegador, e o
 * caminho cai num retângulo quando ele não existe — melhor um canto reto do
 * que nada na tela.
 */
export function caminhoDoFormato(
  ctx: CanvasRenderingContext2D,
  formato: FormatoDoRecorte,
  tamanho: Tamanho,
) {
  const largura = Math.max(1, tamanho.largura);
  const altura = Math.max(1, tamanho.altura);
  ctx.beginPath();
  if (formato === 'oval') {
    ctx.ellipse(largura / 2, altura / 2, largura / 2, altura / 2, 0, 0, Math.PI * 2);
    return;
  }
  if (formato === 'arredondado' && typeof ctx.roundRect === 'function') {
    const raio = Math.min(raioDoArredondado(tamanho), largura / 2, altura / 2);
    ctx.roundRect(0, 0, largura, altura, raio);
    return;
  }
  ctx.rect(0, 0, largura, altura);
}

/**
 * Recorta o contexto no contorno escolhido. Devolve verdadeiro quando recortou,
 * que é o sinal para quem chamou fechar com `restore`.
 */
export function recortarNoFormato(
  ctx: CanvasRenderingContext2D,
  formato: FormatoDoRecorte,
  tamanho: Tamanho,
): boolean {
  if (formato === 'retangulo' || typeof ctx.clip !== 'function') return false;
  ctx.save();
  caminhoDoFormato(ctx, formato, tamanho);
  ctx.clip();
  return true;
}

/** Temperatura e vinheta não têm `filter`: são uma camada por cima da foto. */
export function desenharAcabamento(ctx: CanvasRenderingContext2D, ajustes: Ajustes, tamanho: Tamanho, escala: number) {
  const largura = tamanho.largura * escala;
  const altura = tamanho.altura * escala;
  if (ajustes.temperatura) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(0.55, (Math.abs(ajustes.temperatura) / 100) * 0.55);
    ctx.fillStyle = ajustes.temperatura > 0 ? '#ff9a3c' : '#3ca9ff';
    ctx.fillRect(0, 0, largura, altura);
    ctx.restore();
  }
  if (ajustes.vinheta > 0) {
    const raio = Math.hypot(largura, altura) / 2;
    const gradiente = ctx.createRadialGradient(largura / 2, altura / 2, raio * 0.4, largura / 2, altura / 2, raio);
    gradiente.addColorStop(0, 'rgba(0,0,0,0)');
    gradiente.addColorStop(1, `rgba(0,0,0,${((ajustes.vinheta / 100) * 0.8).toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, largura, altura);
    ctx.restore();
  }
}

/** A camada base inteira: foto + luz. Devolve falso quando não há canvas. */
export function desenharBase(canvas: HTMLCanvasElement | null, imagem: Imagem, edicao: Edicao, escala: number): boolean {
  const ctx = contexto(canvas);
  if (!ctx) return false;
  const saida = tamanhoDaSaida(edicao.geometria);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas!.width, canvas!.height);
  // Limpar vem antes de recortar: o `clearRect` de dentro do recorte deixaria
  // os cantos com o quadro anterior.
  const recortado = recortarNoFormato(ctx, edicao.formato, {
    largura: saida.largura * escala, altura: saida.altura * escala,
  });
  desenharFoto(ctx, imagem, edicao.geometria, escala, edicao.ajustes);
  desenharAcabamento(ctx, edicao.ajustes, saida, escala);
  if (recortado) ctx.restore();
  return true;
}

/* ----------------------------------------------------------------- marcas -- */

function desenharTraco(ctx: CanvasRenderingContext2D, pontos: Ponto[], espessura: number, escala: number) {
  const grossura = Math.max(0.6, espessura * escala);
  ctx.lineWidth = grossura;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pontos.length === 1) {
    // Um toque só é um ponto: sem isso o dedo faz um pingo que não aparece.
    ctx.beginPath();
    ctx.arc(pontos[0].x * escala, pontos[0].y * escala, grossura / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pontos[0].x * escala, pontos[0].y * escala);
  // Curva pelo meio de cada par de pontos: o traço sai liso mesmo com o dedo
  // enviando poucas amostras por segundo.
  for (let i = 1; i < pontos.length - 1; i += 1) {
    const meio = { x: (pontos[i].x + pontos[i + 1].x) / 2, y: (pontos[i].y + pontos[i + 1].y) / 2 };
    ctx.quadraticCurveTo(pontos[i].x * escala, pontos[i].y * escala, meio.x * escala, meio.y * escala);
  }
  const ultimo = pontos[pontos.length - 1];
  ctx.lineTo(ultimo.x * escala, ultimo.y * escala);
  ctx.stroke();
}

function desenharSeta(ctx: CanvasRenderingContext2D, de: Ponto, ate: Ponto, escala: number) {
  const angulo = Math.atan2((ate.y - de.y) * escala, (ate.x - de.x) * escala);
  const cabeca = Math.max(9, ctx.lineWidth * 3.2);
  ctx.beginPath();
  ctx.moveTo(de.x * escala, de.y * escala);
  ctx.lineTo(ate.x * escala - Math.cos(angulo) * cabeca * 0.7, ate.y * escala - Math.sin(angulo) * cabeca * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ate.x * escala, ate.y * escala);
  ctx.lineTo(ate.x * escala - Math.cos(angulo - 0.42) * cabeca, ate.y * escala - Math.sin(angulo - 0.42) * cabeca);
  ctx.lineTo(ate.x * escala - Math.cos(angulo + 0.42) * cabeca, ate.y * escala - Math.sin(angulo + 0.42) * cabeca);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

/**
 * Mosaico de privacidade: reduz a área a poucos quadradinhos e estica de volta
 * sem suavizar. O rosto some e a foto continua sendo a foto.
 */
function desenharBorrado(ctx: CanvasRenderingContext2D, area: { x: number; y: number; largura: number; altura: number }, bloco: number, escala: number) {
  const x = Math.max(0, Math.round(area.x * escala));
  const y = Math.max(0, Math.round(area.y * escala));
  const largura = Math.max(1, Math.round(area.largura * escala));
  const altura = Math.max(1, Math.round(area.altura * escala));
  const celula = Math.max(2, Math.round(bloco * escala));
  const colunas = Math.max(1, Math.ceil(largura / celula));
  const linhas = Math.max(1, Math.ceil(altura / celula));
  const apoio = novoCanvas(colunas, linhas);
  const ctxApoio = contexto(apoio);
  if (!apoio || !ctxApoio) return;
  ctxApoio.imageSmoothingEnabled = true;
  ctxApoio.drawImage(ctx.canvas, x, y, largura, altura, 0, 0, colunas, linhas);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(apoio, 0, 0, colunas, linhas, x, y, colunas * celula, linhas * celula);
  ctx.restore();
}

export function desenharMarca(ctx: CanvasRenderingContext2D, marca: Marca, escala: number) {
  ctx.save();
  ctx.globalAlpha = marca.tipo === 'borrado' ? 1 : marca.opacidade;
  if (marca.tipo === 'traco') {
    ctx.strokeStyle = marca.cor;
    desenharTraco(ctx, marca.pontos, marca.espessura, escala);
  } else if (marca.tipo === 'forma') {
    ctx.strokeStyle = marca.cor;
    ctx.fillStyle = marca.cor;
    ctx.lineWidth = Math.max(0.6, marca.espessura * escala);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [x1, y1] = [marca.de.x * escala, marca.de.y * escala];
    const [x2, y2] = [marca.ate.x * escala, marca.ate.y * escala];
    if (marca.figura === 'linha') { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    else if (marca.figura === 'seta') desenharSeta(ctx, marca.de, marca.ate, escala);
    else if (marca.figura === 'retangulo') {
      const largura = x2 - x1;
      const altura = y2 - y1;
      if (marca.preenchida) ctx.fillRect(x1, y1, largura, altura);
      else ctx.strokeRect(x1, y1, largura, altura);
    } else {
      const centro = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
      ctx.beginPath();
      ctx.ellipse(centro.x, centro.y, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
      if (marca.preenchida) ctx.fill();
      else ctx.stroke();
    }
  } else if (marca.tipo === 'texto') {
    const tamanho = Math.max(6, marca.tamanho * escala);
    ctx.font = `600 ${tamanho}px ${FONTE}`;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    if (marca.contorno) {
      ctx.strokeStyle = textoSobre(marca.cor);
      ctx.lineWidth = Math.max(1.5, tamanho * 0.13);
      ctx.strokeText(marca.texto, marca.em.x * escala, marca.em.y * escala);
    }
    ctx.fillStyle = marca.cor;
    ctx.fillText(marca.texto, marca.em.x * escala, marca.em.y * escala);
  } else {
    desenharBorrado(ctx, marca.area, marca.bloco, escala);
  }
  ctx.restore();
}

export function desenharMarcas(ctx: CanvasRenderingContext2D, marcas: Marca[], escala: number) {
  for (const marca of marcas) desenharMarca(ctx, marca, escala);
}

/** A prévia na tela: base já pronta + marcas (e o rascunho do dedo, se houver). */
export function comporTela(
  canvas: HTMLCanvasElement | null,
  base: HTMLCanvasElement | null,
  marcas: Marca[],
  escala: number,
  rascunho: Marca | null = null,
  formato: FormatoDoRecorte = 'retangulo',
): boolean {
  const ctx = contexto(canvas);
  if (!ctx || !canvas) return false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // As marcas entram dentro do mesmo recorte da base: sem isso um traço no
  // canto apareceria flutuando fora da foto oval.
  const recortado = recortarNoFormato(ctx, formato, { largura: canvas.width, altura: canvas.height });
  if (base) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  // O mosaico precisa do que já está pintado no mesmo quadro: por isso as
  // marcas entram depois da base, na ordem em que foram criadas.
  desenharMarcas(ctx, rascunho ? [...marcas, rascunho] : marcas, escala);
  if (recortado) ctx.restore();
  return true;
}

/* ------------------------------------------------------------------ leitura */

/** A cor que está naquele ponto da tela (o conta-gotas do editor). */
export function corNaTela(canvas: HTMLCanvasElement | null, ponto: Ponto): string | null {
  const ctx = contexto(canvas, true);
  if (!ctx || !canvas) return null;
  const x = Math.floor(ponto.x);
  const y = Math.floor(ponto.y);
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  try {
    const dados = ctx.getImageData(x, y, 1, 1).data;
    return rgbParaHex({ r: dados[0], g: dados[1], b: dados[2] });
  } catch { return null; }
}

/** As cores que mais aparecem na foto — a paleta que o editor oferece. */
export function paletaDaTela(canvas: HTMLCanvasElement | null, quantidade = 6): string[] {
  const ctx = contexto(canvas, true);
  if (!ctx || !canvas) return [];
  const passo = Math.max(3, Math.round(Math.max(canvas.width, canvas.height) / 90));
  try {
    const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return coresDominantes(imagem.data, { largura: canvas.width, altura: canvas.height }, { passo, quantidade });
  } catch { return []; }
}

/* ------------------------------------------------------------------- saída -- */

export interface OpcoesDeExportacao { qualidade?: number; limite?: number }

/**
 * A foto editada, em resolução cheia.
 *
 * `limite` segura o tamanho do arquivo: uma foto de 12 MP viraria um data URL
 * de dezenas de megabytes dentro do armazenamento local. Como o catálogo já
 * entra com no máximo 1.440px, na prática quase nada é reduzido aqui.
 */
export function exportarEdicao(
  imagem: Imagem,
  edicao: Edicao,
  { qualidade = 0.92, limite = 2400 }: OpcoesDeExportacao = {},
): ResultadoDaEdicao | null {
  const saida = tamanhoDaSaida(edicao.geometria);
  const { largura, altura } = tamanhoExportado(saida, limite);
  const fator = fatorDoLimite(saida, limite);
  const canvas = novoCanvas(largura, altura);
  const ctx = contexto(canvas);
  if (!ctx) return null;
  const tipo = formatoDeSaida();
  // JPEG não tem transparência: o que sair do contorno viraria preto, então o
  // fundo entra branco antes do recorte.
  if (edicao.formato !== 'retangulo' && tipo === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
  }
  const recortado = recortarNoFormato(ctx, edicao.formato, { largura, altura });
  desenharFoto(ctx, imagem, edicao.geometria, fator, edicao.ajustes);
  desenharAcabamento(ctx, edicao.ajustes, { largura, altura }, 1);
  desenharMarcas(ctx, edicao.marcas, fator);
  if (recortado) ctx.restore();
  try {
    const url = canvas!.toDataURL(tipo, tipo === 'image/png' ? undefined : qualidade);
    if (!url || !url.startsWith('data:image/')) return null;
    return { url, largura, altura, filtro: tipo };
  } catch {
    // Imagem vinda de outro domínio suja o canvas: não há o que fazer aqui.
    return null;
  }
}

/** Miniatura de um filtro pronto, para a lista mostrar o efeito antes do toque. */
export function miniaturaDeAjustes(imagem: Imagem, edicao: Edicao, ajustes: Ajustes, largura = 72): string | null {
  const saida = tamanhoDaSaida(edicao.geometria);
  if (!(saida.largura > 0) || !(saida.altura > 0)) return null;
  const escala = largura / saida.largura;
  const canvas = novoCanvas(largura, Math.max(1, Math.round(saida.altura * escala)));
  const ctx = contexto(canvas);
  if (!ctx) return null;
  desenharFoto(ctx, imagem, edicao.geometria, escala, ajustes);
  desenharAcabamento(ctx, ajustes, { largura: canvas!.width, altura: canvas!.height }, 1);
  try { return canvas!.toDataURL(formatoDeSaida(), 0.7); } catch { return null; }
}
