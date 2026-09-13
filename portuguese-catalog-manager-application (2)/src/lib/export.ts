import type { AppData, Person, TierList } from '../types';
import { calculateOverallRating, downloadBlob, formatNumber, getFinalScore, getMainPhoto, locationLabel, PALETTE, tierAllows, today } from '../store';

async function image(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise(resolve => { const img = new Image(); const timer = setTimeout(() => resolve(null), 7000); img.crossOrigin = 'anonymous'; img.onload = () => { clearTimeout(timer); resolve(img); }; img.onerror = () => { clearTimeout(timer); resolve(null); }; img.src = url; });
}
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function write(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 20, color = '#f4f1f7', weight = 500, width?: number) {
  ctx.font = `${weight} ${size}px "Inter Variable", Inter, sans-serif`; ctx.fillStyle = color;
  if (width) { while (ctx.measureText(text).width > width && text.length > 1) text = text.slice(0, -2) + '…'; }
  ctx.fillText(text, x, y);
}
function portrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, p: Person, x: number, y: number, size: number, r = size / 2) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, size, size, r); ctx.clip(); ctx.fillStyle = '#302238'; ctx.fillRect(x, y, size, size);
  if (img) { const d = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - d) / 2, (img.height - d) / 2, d, d, x, y, size, size); }
  else { ctx.textAlign = 'center'; write(ctx, p.nome.split(' ').slice(0, 2).map(n => n[0]).join(''), x + size / 2, y + size / 2 + size * 0.14, size * 0.35, '#dbc0ee', 600); }
  ctx.restore();
}
async function saveCanvas(canvas: HTMLCanvasElement, name: string) {
  const blob = await new Promise<Blob>((resolve, reject) => { canvas.toBlob(b => b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.')), 'image/png'); });
  if (document.documentElement.classList.contains('privacy-active')) throw new Error('Exportação cancelada pelo modo privacidade.');
  downloadBlob(blob, name);
}
export async function exportPersonPng(p: Person, data: AppData) {
  await document.fonts.ready;
  const img = await image(getMainPhoto(p)?.url), c = document.createElement('canvas'); c.width = 1000; c.height = 1120;
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('Exportação de imagem indisponível.');
  ctx.fillStyle = '#121116'; ctx.fillRect(0, 0, c.width, c.height);
  write(ctx, 'catalog.', 56, 70, 31, '#ce9fe9', 700); write(ctx, 'FICHA PESSOAL', 56, 113, 14, '#8f879b', 500);
  portrait(ctx, img, p, 56, 152, 400, 22);
  write(ctx, p.nome, 493, 246, 32, '#f4f1f7', 700, 454); write(ctx, locationLabel(p, data), 493, 290, 18, '#aaa0b5', 400, 454);
  write(ctx, `${formatNumber(calculateOverallRating(p.rating))} / 5`, 493, 362, 38, '#e8bf77', 600);
  write(ctx, p.tags.join('  ·  '), 493, 420, 16, '#c6a7d9', 500, 450);
  write(ctx, 'SOBRE', 56, 608, 14, '#b199bf', 600);
  const words = p.descricao.split(/\s+/); let line = '', y = 658;
  ctx.font = '400 23px "Inter Variable", Inter, sans-serif';
  for (const word of words) { if (ctx.measureText(`${line} ${word}`).width > 870 && line) { write(ctx, line, 56, y, 23, '#d0c9d7', 400); y += 38; line = word; if (y > 980) break; } else line = `${line} ${word}`.trim(); }
  if (y <= 980) write(ctx, line, 56, y, 23, '#d0c9d7', 400);
  write(ctx, `Exportado em ${today().split('-').reverse().join('/')}`, 56, 1068, 15, '#817889', 400);
  await saveCanvas(c, `catalog-ficha-${p.nome.replace(/[^a-z\d]/gi, '-').toLowerCase()}.png`);
}

export async function exportRankingPng(people: Person[], data: AppData, full: boolean, label: string) {
  if (!people.length) throw new Error('Não há pessoas para exportar.');
  await document.fonts.ready;
  const rest = full ? people.slice(3) : [], pageCount = Math.max(1, Math.ceil(rest.length / 40));
  for (let page = 0; page < pageCount; page++) {
    const rows = rest.slice(page * 40, page * 40 + 40);
    const c = document.createElement('canvas'); c.width = 1200; c.height = (page === 0 ? full ? 890 : 810 : 190) + rows.length * 96 + 80;
    const ctx = c.getContext('2d'); if (!ctx) throw new Error('Exportação indisponível.');
    ctx.fillStyle = '#121116'; ctx.fillRect(0, 0, c.width, c.height);
    write(ctx, 'catalog.', 60, 68, 30, '#d4a5ed', 700); write(ctx, full ? 'Ranking do catálogo' : 'Nosso pódio', 60, 128, 39, '#f1edf5', 600); write(ctx, label, 60, 169, 17, '#aaa0b5');
    if (page === 0) {
      const positions = [{ index: 1, x: 150, height: 146, color: '#9babc2' }, { index: 0, x: 462, height: 222, color: '#d7b477' }, { index: 2, x: 774, height: 112, color: '#ca9980' }];
      for (const position of positions) {
        const p = people[position.index]; if (!p) continue;
        const y = 756 - position.height;
        ctx.strokeStyle = position.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(position.x + 126, y - 161, 76, 0, Math.PI * 2); ctx.stroke();
        portrait(ctx, await image(getMainPhoto(p)?.url), p, position.x + 55, y - 232, 142);
        ctx.textAlign = 'center'; write(ctx, p.nome, position.x + 126, y - 52, 25, '#f1edf5', 600, 278);
        write(ctx, `${formatNumber(getFinalScore(p))} pontos`, position.x + 126, y - 17, 18, position.color, 600);
        const gradient = ctx.createLinearGradient(0, y, 0, 756); gradient.addColorStop(0, position.color + '65'); gradient.addColorStop(1, position.color + '12');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(position.x, y, 252, position.height, [15, 15, 0, 0]); ctx.fill(); write(ctx, `${position.index + 1}`, position.x + 126, y + 73, 60, position.color, 500);
      }
      ctx.textAlign = 'left';
      if (full && rows.length) { write(ctx, 'POSIÇÃO', 60, 851, 13, '#95899f'); write(ctx, 'PESSOA', 161, 851, 13, '#95899f'); write(ctx, 'CATEGORIA', 670, 851, 13, '#95899f'); write(ctx, 'PONTOS', 1020, 851, 13, '#95899f'); }
    }
    let y = page === 0 ? 881 : 211;
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i]; rounded(ctx, 48, y - 12, 1104, 84, 9, i % 2 ? '#16141b' : '#1d1a23');
      write(ctx, String(4 + page * 40 + i).padStart(2, '0'), 69, y + 38, 22, '#9c90a8', 500);
      portrait(ctx, await image(getMainPhoto(p)?.url), p, 146, y + 2, 55, 11); write(ctx, p.nome, 221, y + 38, 22, '#eee8f4', 600, 426);
      write(ctx, locationLabel(p, data), 670, y + 38, 16, '#b6aabd', 400, 310); write(ctx, formatNumber(getFinalScore(p)), 1040, y + 38, 24, '#e2bd7d', 600);
      y += 96;
    }
    ctx.textAlign = 'left'; write(ctx, `Salvo em ${today().split('-').reverse().join('/')}  ·  ${people.length} pessoas${pageCount > 1 ? `  ·  Página ${page + 1}/${pageCount}` : ''}`, 60, c.height - 30, 14, '#8f8599');
    await saveCanvas(c, `catalog-${full ? 'ranking' : 'podio'}-${today()}${pageCount > 1 ? `-${page + 1}` : ''}.png`);
  }
}
/** Tierlist em imagem: uma faixa colorida por linha, retratos redondos e o nome de cada pessoa. */
export async function exportTierListPng(list: TierList, data: AppData) {
  await document.fonts.ready;
  const allowed = data.people.filter(p => tierAllows(p, list));
  const rows = list.tiers.map((tier, index) => {
    const storedColor = list.colors?.[tier];
    const color = typeof storedColor === 'string' && /^#[\da-f]{6}$/i.test(storedColor) ? storedColor : PALETTE[index % PALETTE.length];
    const members = list.items.filter(item => item.tier === tier).map(item => allowed.find(p => p.id === item.personId)).filter((p): p is Person => !!p);
    return { tier, color, members };
  });
  const perRow = 8, cell = 128, labelWidth = 170, padding = 48;
  const heights = rows.map(row => Math.max(1, Math.ceil(row.members.length / perRow)) * (cell + 40) + 24);
  const c = document.createElement('canvas'); c.width = labelWidth + perRow * cell + padding * 2; c.height = 150 + heights.reduce((sum, h) => sum + h, 0) + 70;
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('Exportação de imagem indisponível.');
  ctx.fillStyle = '#121116'; ctx.fillRect(0, 0, c.width, c.height);
  write(ctx, 'catalog.', padding, 62, 30, '#d4a5ed', 700); write(ctx, list.nome, padding, 112, 36, '#f1edf5', 600, c.width - padding * 2);
  let y = 150;
  for (const [index, row] of rows.entries()) {
    const height = heights[index];
    rounded(ctx, padding, y, c.width - padding * 2, height - 12, 14, index % 2 ? '#16141b' : '#1b1821');
    rounded(ctx, padding, y, labelWidth, height - 12, 14, `${row.color}33`);
    ctx.textAlign = 'center'; write(ctx, row.tier, padding + labelWidth / 2, y + (height - 12) / 2 + 12, row.tier.length > 6 ? 22 : 34, row.color, 700, labelWidth - 20); ctx.textAlign = 'left';
    for (const [position, person] of row.members.entries()) {
      const x = padding + labelWidth + 16 + (position % perRow) * cell, top = y + 14 + Math.floor(position / perRow) * (cell + 40);
      portrait(ctx, await image(getMainPhoto(person)?.url), person, x, top, cell - 28, 18);
      ctx.textAlign = 'center'; write(ctx, person.nome.split(' ')[0], x + (cell - 28) / 2, top + cell + 2, 15, '#e8e2ee', 500, cell - 24); ctx.textAlign = 'left';
    }
    if (!row.members.length) write(ctx, 'Faixa vazia', padding + labelWidth + 22, y + (height - 12) / 2 + 6, 16, '#6f6779', 400);
    y += height;
  }
  write(ctx, `Salvo em ${today().split('-').reverse().join('/')}  ·  ${rows.reduce((sum, row) => sum + row.members.length, 0)} pessoas organizadas`, padding, c.height - 28, 14, '#8f8599');
  await saveCanvas(c, `catalog-tierlist-${list.nome.replace(/[^a-z\d]/gi, '-').toLowerCase()}.png`);
}
