/**
 * As músicas do aplicativo.
 *
 * Duas famílias, um mesmo mecanismo: o **Ambiente** do Momentos (um clima para
 * deixar o catálogo aberto) e a **Trilha** do Modo apresentação (música para
 * acompanhar as fotos). Nenhuma das duas guarda arquivo — cada uma tem um
 * termo de busca curado e aceita o link que a pessoa colar no lugar dele.
 */
import { buscaNoYouTube } from './links';

export interface MusicaDoApp {
  /** Chave estável: é ela que guarda o link escolhido. */
  id: string;
  rotulo: string;
  /** Uma linha sobre o clima, para a busca e para o painel. */
  clima: string;
  /** O que o botão "busca curada" procura no YouTube. */
  termo: string;
}

/** O `Sem música` do Modo apresentação. Não tem link: é o silêncio. */
export const SEM_MUSICA = 'sem-musica';

/** Climas do painel Ambiente, na ordem em que aparecem. */
export const AMBIENTES_MUSICAIS: MusicaDoApp[] = [
  { id: 'chuva', rotulo: 'Chuva', clima: 'uma janela calma', termo: 'chuva relaxante para dormir e estudar 1 hora' },
  { id: 'cafe', rotulo: 'Café', clima: 'mesa de domingo', termo: 'jazz instrumental calmo para café da manhã' },
  { id: 'oceano', rotulo: 'Oceano', clima: 'ritmo de maré', termo: 'som das ondas do mar relaxante 1 hora' },
  { id: 'cidade', rotulo: 'Cidade', clima: 'luzes ao longe', termo: 'lofi calmo para a noite na cidade' },
  { id: 'lofi', rotulo: 'Lo-fi', clima: 'foco sem pressa', termo: 'lofi hip hop para estudar e focar' },
];

/** Trilhas do Modo apresentação. */
export const TRILHAS_DA_APRESENTACAO: MusicaDoApp[] = [
  { id: 'ambiente', rotulo: 'Ambiente', clima: 'um fundo calmo', termo: 'ambient music calma 1 hora' },
  { id: 'cinematico', rotulo: 'Cinemático', clima: 'trilha de cinema', termo: 'trilha sonora cinematográfica emocional' },
  { id: 'eletronico', rotulo: 'Eletrônico', clima: 'pulso leve', termo: 'electronic chill instrumental mix' },
  { id: 'minimalista', rotulo: 'Minimalista', clima: 'piano e silêncio', termo: 'piano minimalista relaxante' },
];

/** Busca por id nas duas famílias — é o que liga o painel à música escolhida. */
export function musicaPorId(id: string): MusicaDoApp | undefined {
  return [...AMBIENTES_MUSICAIS, ...TRILHAS_DA_APRESENTACAO].find(musica => musica.id === id);
}

/**
 * Este id é um clima que o site toca sozinho (sem link nenhum)?
 * É o que separa "ambiente gerado aqui" de "trilha por link" na interface.
 */
export function ehClimaDoAmbiente(id: string) {
  return AMBIENTES_MUSICAIS.some(musica => musica.id === id);
}

/** A busca curada de uma música (antes de a pessoa colar um link). */
export function buscaDaMusica(musica: MusicaDoApp) {
  return buscaNoYouTube(musica.termo);
}
