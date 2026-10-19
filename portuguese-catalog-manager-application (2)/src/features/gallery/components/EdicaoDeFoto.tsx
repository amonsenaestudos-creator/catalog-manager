/**
 * A ponte entre o editor de imagens e o catálogo.
 *
 * O editor não sabe onde a foto mora (ficha, órfã, cofre): ele devolve a imagem
 * pronta e o modo escolhido. Quem guarda é este gancho, com `commit` — e por
 * isso as três telas que abrem fotos (Galeria, Meu espaço e a ficha) oferecem a
 * mesma edição sem cada uma reimplementar a gravação.
 *
 * Uso:
 *   const edicao = useEdicaoDeFoto();
 *   … edicao.abrir(foto, 'Marina')  … {edicao.editor}
 */
import { useCallback, useState } from 'react';
import type { Photo } from '../../../types';
import { useCatalog } from '../../../context';
import { guardarFotoEditada, mensagemDoSalvamento } from '../edicao';
import type { ModoDeSalvamento, ResultadoDaEdicao } from '../edicao';
import EditorDeImagem from './EditorDeImagem';

export interface EdicaoDeFoto {
  /** Abre o editor para uma foto (com o nome que vai no topo, se quiser). */
  abrir: (foto: Photo, titulo?: string) => void;
  fechar: () => void;
  aberta: boolean;
  /** O editor pronto para entrar no JSX da tela. */
  editor: React.ReactNode;
}

export function useEdicaoDeFoto(): EdicaoDeFoto {
  const ctx = useCatalog();
  const [alvo, setAlvo] = useState<{ foto: Photo; titulo?: string } | null>(null);

  const abrir = useCallback((foto: Photo, titulo?: string) => {
    if (!foto?.url) { ctx.notify('Esta foto não tem imagem para editar.', true); return; }
    ctx.buzz?.(10);
    setAlvo({ foto, titulo });
  }, [ctx]);

  const fechar = useCallback(() => setAlvo(null), []);

  const salvar = useCallback((resultado: ResultadoDaEdicao, modo: ModoDeSalvamento) => {
    const foto = alvo?.foto;
    if (!foto) return;
    ctx.commit(dados => guardarFotoEditada(dados, foto.id, resultado, modo), mensagemDoSalvamento(modo));
    setAlvo(null);
  }, [alvo, ctx]);

  const editor = alvo
    ? <EditorDeImagem foto={alvo.foto} titulo={alvo.titulo} aoFechar={fechar} aoSalvar={salvar} />
    : null;

  return { abrir, fechar, editor, aberta: !!alvo };
}

export default useEdicaoDeFoto;
