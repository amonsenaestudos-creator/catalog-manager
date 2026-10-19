/**
 * As ferramentas do editor de imagens.
 *
 * Assim como as ações da ficha (`features/interface/acoes.ts`), a ferramenta é
 * dado antes de ser desenho: id, nome, dica, atalho e ícone num lugar só, para
 * a trilha de baixo, o painel e o teclado concordarem sobre o que existe.
 */
import {
  Brush, Crop, Eraser, Grid2x2, Pipette, RotateCw, Shapes, SlidersHorizontal, Sparkles, Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FerramentaId =
  | 'cortar' | 'girar' | 'ajustar' | 'filtros'
  | 'pincel' | 'forma' | 'texto' | 'borrar' | 'apagar' | 'cor';

export interface Ferramenta {
  id: FerramentaId;
  nome: string;
  dica: string;
  /** Tecla que escolhe a ferramenta com o editor aberto (sem Ctrl). */
  atalho: string;
  icone: LucideIcon;
}

export const FERRAMENTAS: Ferramenta[] = [
  { id: 'cortar', nome: 'Cortar', dica: 'Arraste a moldura e escolha a proporção.', atalho: 'c', icone: Crop },
  { id: 'girar', nome: 'Girar', dica: 'Gire em passos de 90° ou espelhe a foto.', atalho: 'r', icone: RotateCw },
  { id: 'ajustar', nome: 'Ajustar', dica: 'Brilho, contraste, cor, temperatura, desfoque e vinheta.', atalho: 'a', icone: SlidersHorizontal },
  { id: 'filtros', nome: 'Filtros', dica: 'Receitas prontas de luz e cor — e dá para mexer depois.', atalho: 'f', icone: Sparkles },
  { id: 'pincel', nome: 'Pintar', dica: 'Traço livre com o dedo ou o mouse.', atalho: 'p', icone: Brush },
  { id: 'forma', nome: 'Formas', dica: 'Linha, seta, retângulo e círculo para marcar a foto.', atalho: 's', icone: Shapes },
  { id: 'texto', nome: 'Texto', dica: 'Toque onde escrever; a letra sai com contorno legível.', atalho: 't', icone: Type },
  { id: 'borrar', nome: 'Esconder', dica: 'Mosaico sobre uma área: rosto, placa, tela.', atalho: 'b', icone: Grid2x2 },
  { id: 'apagar', nome: 'Borracha', dica: 'Tira o que você desenhou — a foto por baixo continua inteira.', atalho: 'e', icone: Eraser },
  { id: 'cor', nome: 'Cor', dica: 'Conta-gotas: tire a cor de qualquer ponto da foto.', atalho: 'i', icone: Pipette },
];

/** As ferramentas em que o dedo desenha sobre a tela (as outras só têm painel). */
export const FERRAMENTAS_DE_DESENHO: FerramentaId[] = ['pincel', 'forma', 'texto', 'borrar', 'apagar', 'cor'];

export const ferramentaDe = (id: FerramentaId): Ferramenta =>
  FERRAMENTAS.find(ferramenta => ferramenta.id === id) || FERRAMENTAS[0];

/** As ferramentas que aparecem na trilha (todas, na ordem do polegar). */
export const TRILHA: FerramentaId[] = FERRAMENTAS.map(ferramenta => ferramenta.id);
