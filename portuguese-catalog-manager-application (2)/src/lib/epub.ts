/**
 * Gerador de EPUB mínimo, sem dependências: escreve um ZIP com entradas
 * "stored" (sem compressão), que é aceito pelos leitores de ebook.
 */
const encoder = new TextEncoder();

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface Entry { name: string; bytes: Uint8Array }

function zip(entries: Entry[]): Blob {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true); view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true); view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true); view.setUint32(18, entry.bytes.length, true); view.setUint32(22, entry.bytes.length, true);
    view.setUint16(26, name.length, true); view.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, entry.bytes);
    const head = new Uint8Array(46 + name.length);
    const headView = new DataView(head.buffer);
    headView.setUint32(0, 0x02014b50, true); headView.setUint16(4, 20, true); headView.setUint16(6, 20, true);
    headView.setUint16(8, 0x0800, true); headView.setUint16(10, 0, true);
    headView.setUint16(12, dosTime, true); headView.setUint16(14, dosDate, true);
    headView.setUint32(16, crc, true); headView.setUint32(20, entry.bytes.length, true); headView.setUint32(24, entry.bytes.length, true);
    headView.setUint16(28, name.length, true); headView.setUint32(42, offset, true);
    head.set(name, 46);
    central.push(head);
    offset += local.length + entry.bytes.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end] as BlobPart[], { type: 'application/epub+zip' });
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] as string));
const paragraphs = (content: string) => content.split(/\n{2,}/).filter(Boolean)
  .map(block => `<p>${escapeXml(block).replace(/\n/g, '<br />')}</p>`).join('\n');

export interface EpubChapter { title: string; content: string }

export function buildEpub(title: string, author: string, chapters: EpubChapter[]): Blob {
  const safeTitle = escapeXml(title || 'Sem título');
  const safeAuthor = escapeXml(author || 'Catálogo');
  const list = chapters.length ? chapters : [{ title: safeTitle, content: '' }];
  const files: { name: string; content: string }[] = [];
  files.push({
    name: 'OEBPS/nav.xhtml',
    content: `<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Sumário</title></head><body><nav epub:type="toc"><ol>${list.map((chapter, index) => `<li><a href="chapter-${index + 1}.xhtml">${escapeXml(chapter.title || `Capítulo ${index + 1}`)}</a></li>`).join('')}</ol></nav></body></html>`,
  });
  list.forEach((chapter, index) => {
    files.push({
      name: `OEBPS/chapter-${index + 1}.xhtml`,
      content: `<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(chapter.title || `Capítulo ${index + 1}`)}</title><link rel="stylesheet" type="text/css" href="style.css" /></head><body><h1>${escapeXml(chapter.title || `Capítulo ${index + 1}`)}</h1>${paragraphs(chapter.content)}</body></html>`,
    });
  });
  files.push({ name: 'OEBPS/style.css', content: 'body { font-family: Georgia, serif; line-height: 1.7; margin: 1.4em; } h1 { font-size: 1.4em; }' });
  files.push({
    name: 'OEBPS/content.opf',
    content: `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:uuid:catalog-${Date.now().toString(36)}</dc:identifier><dc:title>${safeTitle}</dc:title><dc:creator>${safeAuthor}</dc:creator><dc:language>pt-BR</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />${list.map((_, index) => `<item id="cap${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml" />`).join('')}<item id="css" href="style.css" media-type="text/css" /></manifest><spine>${list.map((_, index) => `<itemref idref="cap${index + 1}" />`).join('')}</spine></package>`,
  });
  files.push({ name: 'META-INF/container.xml', content: '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" /></rootfiles></container>' });
  const entries: Entry[] = [
    { name: 'mimetype', bytes: encoder.encode('application/epub+zip') },
    ...files.map(file => ({ name: file.name, bytes: encoder.encode(file.content) })),
  ];
  return zip(entries);
}

export function storyMarkdown(title: string, author: string, chapters: EpubChapter[]) {
  return [`# ${title}`, `*por ${author}*`, '', ...chapters.flatMap(chapter => [`## ${chapter.title}`, '', chapter.content, ''])].join('\n');
}

export function storyHtml(title: string, author: string, chapters: EpubChapter[]) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeXml(title)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.8;padding:0 20px;color:#222}h1{font-size:28px}h2{margin-top:34px;font-size:20px}p{margin:0 0 14px}footer{margin-top:40px;font-size:12px;color:#777}@media print{body{margin:0}}</style></head><body><h1>${escapeXml(title)}</h1><p><em>por ${escapeXml(author)}</em></p>${chapters.map(chapter => `<h2>${escapeXml(chapter.title)}</h2>${paragraphs(chapter.content)}`).join('')}<footer>Exportado do Catalog em ${new Date().toLocaleDateString('pt-BR')}</footer></body></html>`;
}
