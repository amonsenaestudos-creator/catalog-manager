/**
 * O mapa em imagem: canvas e arquivo.
 *
 * É a metade que precisa de navegador (a regra pura está em `mapa.ts`), e segue
 * a mesma regra de `lib/export.ts`: tudo em português quando dá errado, nada sai
 * do aparelho com o modo privacidade ligado, e sem canvas a função diz isso em
 * vez de devolver uma imagem em branco.
 *
 * O desenho não usa transformação de contexto: cada ponto do plano é convertido
 * para coordenadas de tela na mão (`MARGEM + (x - minX) * escala`). É mais
 * conta, mas o texto sai do tamanho pedido em vez de sair esticado pela escala.
 */
import type { MapaMental, NoDoMapa, Person } from '../../types';
import { downloadBlob, formatDate } from '../../store';
import { limitesDoMapa, noPorId, resumoDoMapa, TAMANHO_DO_NO } from './mapa';

const FONTE = '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif';
const FUNDO = '#121116';
const CARTAO = '#1d1725';
const MARGEM = 56;
const CABECALHO = 112;
/** O arquivo fica legível no celular e leve para mandar: nada acima de 1800px. */
const LARGURA_ALVO = 1800;

function escrever(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  tamanho = 15,
  cor = '#f4f1f7',
  peso = 500,
) {
  ctx.font = `${peso} ${tamanho}px ${FONTE}`;
  ctx.fillStyle = cor;
  ctx.fillText(texto, x, y);
}

/** Quebra o texto em linhas que cabem na caixa do nó (no máximo três). */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maximo = 3): string[] {
  const linhas: string[] = [];
  let linha = '';
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (linha && ctx.measureText(tentativa).width > largura) {
      linhas.push(linha);
      linha = '';
      if (linhas.length === maximo) {
        // o resto não coube: fecha com reticências em vez de transbordar a caixa
        linhas[maximo - 1] = `${linhas[maximo - 1].replace(/[,.;:]$/, '')}…`;
        return linhas;
      }
    }
    linha = linha ? `${linha} ${palavra}` : palavra;
  }
  if (linha) linhas.push(linha);
  return linhas.slice(0, maximo);
}

function caixaDoNo(
  ctx: CanvasRenderingContext2D,
  no: NoDoMapa,
  origem: { x: number; y: number },
  escala: number,
) {
  const largura = TAMANHO_DO_NO.largura * escala;
  const altura = TAMANHO_DO_NO.altura * escala;
  const x = origem.x + no.x * escala - largura / 2;
  const y = origem.y + no.y * escala - altura / 2;
  const raio = Math.min(14, altura / 3);
  // o mesmo caminho três vezes: preencher, recortar a barra colorida e contornar
  const caminho = () => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, largura, altura, raio);
    else ctx.rect(x, y, largura, altura);
  };
  caminho();
  ctx.fillStyle = CARTAO;
  ctx.fill();
  ctx.save();
  caminho();
  ctx.clip();
  ctx.fillStyle = no.cor;
  ctx.fillRect(x, y, 4, altura);
  ctx.restore();
  caminho();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `${no.cor}88`;
  ctx.stroke();
  return { x, y, largura, altura };
}

/** Gera o PNG do mapa e entrega para o navegador baixar. Devolve o nome do arquivo. */
export async function exportarMapaPng(mapa: MapaMental, pessoas: Person[] = []): Promise<string> {
  if (typeof document === 'undefined') throw new Error('Sem navegador, sem imagem.');
  if (document.documentElement.classList.contains('privacy-active')) {
    throw new Error('Exportação cancelada pelo modo privacidade: nada sai do aparelho enquanto ele estiver ligado.');
  }
  if (!mapa.nos.length) throw new Error('O mapa ainda não tem nenhum nó.');
  try { await document.fonts?.ready; } catch { /* a fonte padrão serve */ }

  const limites = limitesDoMapa(mapa);
  const larguraDoPlano = Math.max(1, limites.maxX - limites.minX);
  const alturaDoPlano = Math.max(1, limites.maxY - limites.minY);
  const escala = Math.min(1.5, Math.max(0.45, (LARGURA_ALVO - MARGEM * 2) / larguraDoPlano));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(larguraDoPlano * escala + MARGEM * 2);
  canvas.height = Math.round(alturaDoPlano * escala + MARGEM + CABECALHO);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não devolveu um canvas: não dá para gerar a imagem.');

  ctx.fillStyle = FUNDO;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  escrever(ctx, 'catalog.', MARGEM, 62, 27, '#ce9fe9', 700);
  escrever(ctx, mapa.nome.toUpperCase(), MARGEM, 96, 15, '#8f879b', 600);
  const resumo = resumoDoMapa(mapa, pessoas);
  const rodapeDoTitulo = `${resumo.nos} ${resumo.nos === 1 ? 'nó' : 'nós'} · ${resumo.ligacoes} ${resumo.ligacoes === 1 ? 'ligação' : 'ligações'}${resumo.pessoas ? ` · ${resumo.pessoas} do catálogo` : ''} · ${formatDate(new Date().toISOString())}`;
  escrever(ctx, rodapeDoTitulo, MARGEM, canvas.height - 22, 12, '#6f6779', 400);

  const origem = { x: MARGEM - limites.minX * escala, y: CABECALHO - limites.minY * escala };

  // os fios primeiro: os nós vêm por cima e escondem a ponta de cada linha
  ctx.lineWidth = 1.6;
  for (const fio of mapa.ligacoes) {
    const de = noPorId(mapa, fio.de);
    const para = noPorId(mapa, fio.para);
    if (!de || !para) continue;
    const a = { x: origem.x + de.x * escala, y: origem.y + de.y * escala };
    const b = { x: origem.x + para.x * escala, y: origem.y + para.y * escala };
    const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.08 };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(meio.x, meio.y, b.x, b.y);
    ctx.strokeStyle = '#ffffff22';
    ctx.stroke();
    if (fio.rotulo) escrever(ctx, fio.rotulo, meio.x - ctx.measureText(fio.rotulo).width / 2, meio.y - 8, 11, '#9b8fa6', 500);
  }

  for (const no of mapa.nos) {
    const caixa = caixaDoNo(ctx, no, origem, escala);
    ctx.font = `500 ${Math.round(13 * Math.max(0.85, escala))}px ${FONTE}`;
    const linhas = quebrar(ctx, no.texto, caixa.largura - 30);
    const alturaDaLinha = Math.round(17 * Math.max(0.85, escala));
    const comeco = caixa.y + caixa.altura / 2 - ((linhas.length - 1) * alturaDaLinha) / 2 + 4;
    linhas.forEach((linha, indice) => escrever(ctx, linha, caixa.x + 16, comeco + indice * alturaDaLinha, Math.round(13 * Math.max(0.85, escala)), '#f4f1f7', 550));
    if (no.personId && pessoas.some(pessoa => pessoa.id === no.personId)) {
      escrever(ctx, 'ficha', caixa.x + caixa.largura - 34, caixa.y + 18, 10, no.cor, 600);
    }
  }

  const arquivo = `catalog-mapa-${mapa.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'sem-nome'}.png`;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(resultado => (resultado ? resolve(resultado) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png');
  });
  downloadBlob(blob, arquivo);
  return arquivo;
}
