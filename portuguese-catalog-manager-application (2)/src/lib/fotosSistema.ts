import type { AppData, Person, Photo } from '../types';
import { generateId, isAdult, normalizeText } from '../store';
import { ARCHIVE_SCENE, DEMO_PORTRAITS } from '../assets';

/**
 * Escolher, no cadastro, fotos que já estão no sistema.
 *
 * Antes, uma foto que já morava no Catalog só entrava numa ficha nova se
 * você a enviasse de novo do aparelho — duplicando o arquivo. Agora o
 * cadastro enxerga o acervo inteiro em três prateleiras:
 *
 * - **sem ficha** (`orphanPhotos`): escolher é adotar. A foto mantém o id,
 *   passa a ser da pessoa e sai da prateleira das órfãs ao salvar (quem tira
 *   é o `savePerson`, então descartar o rascunho não perde a foto);
 * - **de outras fichas**: escolher é copiar. Identidade nova, a ficha de
 *   origem nem fica sabendo;
 * - **do sistema**: os retratos que vêm com o aplicativo, sempre à mão
 *   mesmo com a galeria vazia.
 *
 * A regra de mídia adulta é a mesma da galeria: foto que não é "Normal" só
 * entra em ficha adulta; fora isso, fica de fora com o motivo explicado.
 */

export type OrigemFotoSistema = 'sem-ficha' | 'ficha' | 'sistema';

export interface FotoDoSistema {
  photo: Photo;
  origem: OrigemFotoSistema;
  /** Quem é a dona atual, quando a origem é outra ficha. */
  donaNome?: string;
}

export const ROTULO_DA_ORIGEM: Record<OrigemFotoSistema, string> = {
  'sem-ficha': 'Sem ficha',
  ficha: 'De outra ficha',
  sistema: 'Do sistema',
};

/** Os retratos que vêm com o aplicativo, endereçados como fotos de verdade. */
export function imagensDoSistema(): Photo[] {
  const retratos = DEMO_PORTRAITS.map((url, indice) => ({
    id: `sistema-retrato-${indice + 1}`, url, name: `Retrato do sistema ${indice + 1}`,
  }));
  return [...retratos, { id: 'sistema-cena', url: ARCHIVE_SCENE, name: 'Cena do arquivo' }]
    .filter(item => item.url)
    .map(item => ({
      id: item.id, url: item.url, name: item.name, personId: null, isMain: false,
      type: 'normal' as const, createdAt: '',
    }));
}

/** Tudo o que pode ser escolhido para a ficha que está sendo editada. */
export function fotosDoSistema(
  data: Pick<AppData, 'people' | 'orphanPhotos'>,
  pessoaAtualId: string,
): FotoDoSistema[] {
  const semFicha: FotoDoSistema[] = data.orphanPhotos.map(photo => ({ photo, origem: 'sem-ficha' }));
  const deFichas: FotoDoSistema[] = data.people
    .filter(person => person.id !== pessoaAtualId && !person.deletedAt)
    .flatMap(person => person.fotos.map(photo => ({ photo, origem: 'ficha' as const, donaNome: person.nome })));
  const doSistema: FotoDoSistema[] = imagensDoSistema().map(photo => ({ photo, origem: 'sistema' }));
  return [...semFicha, ...deFichas, ...doSistema];
}

/** Busca por nome da foto, descrição ou nome da dona — sem acento importar. */
export function filtrarFotosDoSistema(
  lista: FotoDoSistema[],
  busca: string,
  origem: OrigemFotoSistema | 'todas' = 'todas',
): FotoDoSistema[] {
  const termo = normalizeText(busca || '');
  return lista.filter(item => {
    if (origem !== 'todas' && item.origem !== origem) return false;
    if (!termo) return true;
    const alvo = normalizeText([item.photo.name, item.photo.description, item.donaNome].filter(Boolean).join(' '));
    return alvo.includes(termo);
  });
}

export interface FotosEscolhidas {
  /** Prontas para entrar no rascunho (o editor normaliza a principal). */
  fotos: Photo[];
  /** Ids adotados das órfãs — somem de `orphanPhotos` quando a ficha salva. */
  adotadas: string[];
  /** Por que alguma foto ficou de fora, em linguagem de gente. */
  avisos: string[];
  /** Quantas já estavam na ficha e foram ignoradas em silêncio. */
  repetidas: number;
}

/**
 * Converte a seleção em fotos da ficha: órfã adotada mantém a identidade,
 * foto alheia vira cópia, repetida é ignorada e mídia adulta só entra em
 * ficha adulta, como em todo o resto do Catalog.
 */
export function prepararFotosEscolhidas(escolhidas: FotoDoSistema[], person: Person): FotosEscolhidas {
  const idsNaFicha = new Set(person.fotos.map(photo => photo.id));
  const urlsNaFicha = new Set(person.fotos.map(photo => photo.url));
  const fotos: Photo[] = [];
  const adotadas: string[] = [];
  const avisos: string[] = [];
  let repetidas = 0;
  let bloqueadas = 0;
  for (const item of escolhidas) {
    const { photo } = item;
    if (idsNaFicha.has(photo.id) || urlsNaFicha.has(photo.url)) { repetidas += 1; continue; }
    if (photo.type !== 'normal' && !isAdult(person)) { bloqueadas += 1; continue; }
    if (item.origem === 'sem-ficha') {
      fotos.push({ ...photo, personId: person.id, isMain: false });
      adotadas.push(photo.id);
    } else {
      fotos.push({
        ...photo,
        id: generateId(),
        personId: person.id,
        isMain: false,
        createdAt: photo.createdAt || new Date().toISOString(),
      });
    }
    urlsNaFicha.add(photo.url);
  }
  if (bloqueadas > 0) avisos.push(`${bloqueadas} foto(s) de mídia adulta ficou(aram) de fora: esse tipo só entra em fichas com 18 anos ou mais informados.`);
  if (repetidas > 0 && !fotos.length) avisos.push('Essas fotos já estão nesta ficha.');
  return { fotos, adotadas, avisos, repetidas };
}
