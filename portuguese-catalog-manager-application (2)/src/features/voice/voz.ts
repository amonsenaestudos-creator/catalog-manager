/**
 * Áudio da pessoa: as regras que não dependem do navegador.
 *
 * Aqui mora o que dá para conferir num teste — quanto cabe de áudio no
 * catálogo, como somar o que já está guardado, o nome e o tipo do arquivo que
 * sai daqui. O microfone e os arquivos ficam em `gravador.ts`.
 *
 * Não há voz sintetizada neste domínio: quem fala é a gravação da pessoa, não
 * o aparelho. (A leitura em voz alta saiu do produto de propósito — ver a
 * rodada 4 em `MELHORIAS.md`.)
 */
import type { Person, VozNota } from '../../types';

/** Teto por nota: áudio em base64 engorda o backup mais rápido do que parece. */
export const VOZ_MAX_NOTA_BYTES = 2 * 1024 * 1024;
/** Teto de áudio por pessoa. Acima disso a tela pede uma limpeza. */
export const VOZ_MAX_PESSOA_BYTES = 8 * 1024 * 1024;

export const pesoDoAudio = (url: string) => Math.round(url.length * 0.75);

export function notasDeVoz(person: Pick<Person, 'vozes'>): VozNota[] {
  return [...(person.vozes || [])].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export interface ResumoDaVoz {
  notas: number;
  duracao: number;
  bytes: number;
  favoritas: number;
}

export function resumoDaVoz(person: Pick<Person, 'vozes'>): ResumoDaVoz {
  const notas = person.vozes || [];
  return {
    notas: notas.length,
    duracao: notas.reduce((total, nota) => total + (nota.duracao || 0), 0),
    bytes: notas.reduce((total, nota) => total + pesoDoAudio(nota.url), 0),
    favoritas: notas.filter(nota => nota.favorite).length,
  };
}

/** Cabe mais uma nota? Se não, o motivo já vem escrito para a tela. */
export function cabeNovaNota(person: Pick<Person, 'vozes'>, bytes: number): { ok: boolean; motivo?: string } {
  if (bytes > VOZ_MAX_NOTA_BYTES) return { ok: false, motivo: `A nota passou de ${formatarPeso(VOZ_MAX_NOTA_BYTES)}. Grave um trecho menor.` };
  const total = resumoDaVoz(person).bytes + bytes;
  if (total > VOZ_MAX_PESSOA_BYTES) return { ok: false, motivo: `Esta ficha já tem ${formatarPeso(resumoDaVoz(person).bytes)} de áudio. Apague uma nota antes de guardar outra.` };
  return { ok: true };
}

export const formatarPeso = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function formatarDuracao(segundos: number) {
  const total = Math.max(0, Math.round(segundos || 0));
  const minutos = Math.floor(total / 60);
  return `${minutos}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Extensão e tipo do áudio guardado, lidos do próprio `data:`.
 *
 * Sem isso, tudo que saía do aplicativo virava `.webm` — inclusive um MP3 que a
 * pessoa enviou do aparelho, que o sistema abria como arquivo quebrado.
 */
const TIPOS_DE_AUDIO: [RegExp, string[]][] = [
  [/webm/i, ['webm', 'audio/webm']],
  [/ogg|opus/i, ['ogg', 'audio/ogg']],
  [/mpeg|mp3/i, ['mp3', 'audio/mpeg']],
  [/mp4|m4a|aac/i, ['m4a', 'audio/mp4']],
  [/wav/i, ['wav', 'audio/wav']],
  [/flac/i, ['flac', 'audio/flac']],
];

export function formatoDoAudio(url: string): { extensao: string; tipo: string } {
  const cabecalho = url.slice(0, 80);
  for (const [padrao, [extensao, tipo]] of TIPOS_DE_AUDIO) if (padrao.test(cabecalho)) return { extensao, tipo };
  return { extensao: 'audio', tipo: 'audio/webm' };
}

/**
 * Nome de arquivo para baixar ou compartilhar a voz: legível, sem acento e com
 * a extensão certa — é o que a outra pessoa vê ao receber.
 */
export function nomeDoArquivoDeVoz(person: Pick<Person, 'nome'>, nota: Pick<VozNota, 'id' | 'url' | 'titulo'>) {
  const quem = person.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'ficha';
  const apelido = (nota.titulo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 24);
  const { extensao } = formatoDoAudio(nota.url);
  return `catalog-voz-${quem}${apelido ? `-${apelido}` : ''}-${nota.id.slice(0, 6)}.${extensao}`;
}

/** O que a tela mostra no lugar do nome quando a nota não tem título. */
export const tituloDaNota = (nota: Pick<VozNota, 'titulo'>) => nota.titulo?.trim() || 'Nota de voz';
