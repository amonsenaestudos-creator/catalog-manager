/**
 * Compartilhar: texto, arquivo e imagem para fora do catálogo.
 *
 * Usa o compartilhamento do próprio aparelho (`navigator.share`) quando ele
 * existe — no celular isso abre o WhatsApp, o Telegram, o e-mail, o que a
 * pessoa escolher. Quando não existe (computador, navegador antigo), cai na
 * área de transferência ou no download, sempre com a mesma resposta de volta
 * para a tela poder dizer o que aconteceu.
 *
 * Nada sai daqui sozinho: só o que a pessoa pediu para compartilhar.
 */
import type { AppData, Person } from '../types';
import { calculateOverallRating, downloadBlob, formatDate, formatNumber, getFinalScore, isActive, locationLabel } from '../store';

export type ResultadoDeCompartilhar = 'compartilhado' | 'copiado' | 'baixado' | 'indisponivel';

const api = () => (typeof navigator === 'undefined' ? undefined : navigator as Navigator & {
  canShare?: (dados?: ShareData) => boolean;
  share?: (dados?: ShareData) => Promise<void>;
});

export const compartilhamentoDisponivel = () => typeof api()?.share === 'function';

/** Texto curto e honesto sobre uma ficha — o que dá para mandar sem abrir o app. */
export function resumoDaPessoa(person: Person, data: AppData) {
  const linhas: string[] = [];
  const idade = person.idade ? `${person.idade} anos` : '';
  const onde = locationLabel(person, data);
  const cabecalho = [person.nome, idade].filter(Boolean).join(' · ');
  linhas.push(cabecalho || 'Ficha do catálogo');
  if (onde && onde !== 'Sem categoria') linhas.push(onde);
  if (person.localizacaoMora) linhas.push(`Mora em ${person.localizacaoMora}`);
  const nota = calculateOverallRating(person.rating);
  if (nota > 0) linhas.push(`Nota pessoal: ${formatNumber(getFinalScore(person))} de 5`);
  if (person.descricao.trim()) linhas.push('', person.descricao.trim());
  const marcas = [
    person.favorite ? 'Favorita' : '',
    person.archivedAt ? 'No arquivo' : '',
    (person.vozes || []).length ? `${(person.vozes || []).length} áudio${(person.vozes || []).length === 1 ? '' : 's'} de voz` : '',
    person.fotos.length ? `${person.fotos.length} foto${person.fotos.length === 1 ? '' : 's'}` : '',
    person.tags.length ? person.tags.slice(0, 6).join(', ') : '',
  ].filter(Boolean);
  if (marcas.length) linhas.push('', marcas.join(' · '));
  linhas.push('', `Compartilhado do meu Catalog em ${formatDate(new Date().toISOString())}.`);
  return linhas.join('\n');
}

/** Resumo enxuto do catálogo inteiro, para contar como ele está sem mostrar dado de ninguém. */
export function resumoDoCatalogoParaCompartilhar(data: AppData) {
  const ativas = data.people.filter(isActive).length;
  const fotos = data.people.reduce((total, pessoa) => total + pessoa.fotos.length, 0) + data.orphanPhotos.length;
  const vozes = data.people.reduce((total, pessoa) => total + (pessoa.vozes || []).length, 0);
  return [
    'Meu Catalog por dentro',
    `${ativas} ${ativas === 1 ? 'pessoa' : 'pessoas'} · ${fotos} ${fotos === 1 ? 'foto' : 'fotos'} · ${vozes} ${vozes === 1 ? 'áudio de voz' : 'áudios de voz'}`,
    `${data.stories.length} histórias · ${data.folders.length} pastas · ${data.tierLists.length} tierlists`,
    'Tudo guardado no meu aparelho, sem servidor.',
  ].join('\n');
}

async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* segue para o plano B */ }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const deuCerto = document.execCommand?.('copy') ?? false;
    document.body.removeChild(area);
    return deuCerto;
  } catch { return false; }
}

export interface OpcoesDeTexto {
  titulo: string;
  texto: string;
  url?: string;
}

/** Compartilha texto pelo aparelho; sem suporte, copia. */
export async function compartilharTexto({ titulo, texto, url }: OpcoesDeTexto): Promise<ResultadoDeCompartilhar> {
  const navegador = api();
  if (navegador?.share && (!navegador.canShare || navegador.canShare({ title: titulo, text: texto }))) {
    try { await navegador.share({ title: titulo, text: texto, url }); return 'compartilhado'; }
    catch (erro) {
      // Cancelar a folha do sistema não é erro: só não aconteceu nada.
      if ((erro as Error)?.name === 'AbortError') return 'indisponivel';
    }
  }
  return await copiar(texto) ? 'copiado' : 'indisponivel';
}

export const dataUrlParaBlob = (dataUrl: string, tipoPadrao = 'application/octet-stream') => {
  const [cabecalho, corpo = ''] = dataUrl.split(',');
  const tipo = /data:([^;]+)/.exec(cabecalho)?.[1] || tipoPadrao;
  const binario = atob(corpo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
};

export interface ArquivoParaCompartilhar {
  blob?: Blob;
  dataUrl?: string;
  nome: string;
  titulo?: string;
  texto?: string;
}

/**
 * Compartilha um arquivo (áudio, PNG da ficha). Onde o aparelho não aceita
 * arquivo, baixa o mesmo conteúdo — nunca deixa a pessoa na mão.
 */
export async function compartilharArquivo({ blob, dataUrl, nome, titulo, texto }: ArquivoParaCompartilhar): Promise<ResultadoDeCompartilhar> {
  const conteudo = blob || (dataUrl ? dataUrlParaBlob(dataUrl) : null);
  if (!conteudo) return 'indisponivel';
  const arquivo = new File([conteudo], nome, { type: conteudo.type || 'application/octet-stream' });
  const navegador = api();
  if (navegador?.share && navegador.canShare?.({ files: [arquivo] })) {
    try { await navegador.share({ files: [arquivo], title: titulo, text: texto }); return 'compartilhado'; }
    catch (erro) { if ((erro as Error)?.name === 'AbortError') return 'indisponivel'; }
  }
  try { downloadBlob(conteudo, nome); return 'baixado'; } catch { return 'indisponivel'; }
}

// ---------------------------------------------------------------------------
// Atalhos usados pela tela: um lugar só decide o que tentar e o que dizer.
// ---------------------------------------------------------------------------

/** Compartilha o resumo de uma ficha — pelo aparelho ou pela área de transferência. */
export const compartilharResumoDaPessoa = (person: Person, data: AppData) =>
  compartilharTexto({ titulo: `${person.nome} — Catalog`, texto: resumoDaPessoa(person, data) });

/** Compartilha o retrato do catálogo inteiro (números, sem nome de ninguém). */
export const compartilharResumoDoCatalogo = (data: AppData) =>
  compartilharTexto({ titulo: 'Meu Catalog por dentro', texto: resumoDoCatalogoParaCompartilhar(data) });

export type AlvoDoCompartilhamento = 'ficha' | 'catalogo' | 'voz' | 'arquivo';

/**
 * A frase que a tela mostra depois de compartilhar. Fica aqui, e não em cada
 * componente, porque as três telas que compartilham dizem a mesma coisa — e
 * antes diziam cada uma do seu jeito.
 */
export function mensagemDoCompartilhamento(resultado: ResultadoDeCompartilhar, alvo: AlvoDoCompartilhamento): { texto: string; erro: boolean } {
  if (resultado === 'compartilhado') return { texto: alvo === 'voz' ? 'Áudio enviado pelo compartilhamento do aparelho.' : 'Compartilhado pelo aparelho.', erro: false };
  if (resultado === 'copiado') return { texto: alvo === 'catalogo' ? 'Resumo do catálogo copiado para a área de transferência.' : 'Resumo copiado para a área de transferência.', erro: false };
  if (resultado === 'baixado') return { texto: 'O navegador não compartilha arquivos: o conteúdo foi baixado.', erro: false };
  // Cancelar a folha do sistema cai aqui: não é erro, mas a tela precisa dizer
  // que nada saiu — e o que fazer quando o navegador simplesmente não coopera.
  return { texto: alvo === 'arquivo' ? 'Nada foi enviado. Sem compartilhamento de arquivos neste navegador, tente baixar.' : 'Nada foi enviado. Este navegador não compartilha — o resumo continua aqui.', erro: true };
}
