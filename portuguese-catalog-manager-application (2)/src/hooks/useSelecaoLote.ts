import { useEffect, useState } from 'react';
import type { Photo } from '../types';
import { alternarSelecao, intervaloEntre } from '../lib/galeria';

/**
 * Seleção em lote feita para o dedo.
 *
 * O primeiro toque abre a seleção com aquela foto; os seguintes vão somando e
 * um toque com shift (ou o gesto de estender) pega o intervalo inteiro entre a
 * última foto tocada e esta. A classe no <html> é o recado para o CSS: a doca de
 * baixo recua, porque a barra do lote ocupa exatamente o mesmo lugar do polegar.
 *
 * Serve à galeria e ao cofre do meu espaço — a mesma barra, o mesmo gesto.
 */
export function useSelecaoLote(fotos: Photo[]) {
  const [ativa, setAtiva] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [ultima, setUltima] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('gallery-escolhendo', ativa);
    return () => document.documentElement.classList.remove('gallery-escolhendo');
  }, [ativa]);

  const entrar = () => setAtiva(true);
  const sair = () => { setAtiva(false); setIds([]); setUltima(''); };
  const selecionarTudo = () => setIds(fotos.map(photo => photo.id));
  const alternar = (photo: Photo, estender: boolean) => {
    if (!ativa) { setAtiva(true); setIds([photo.id]); setUltima(photo.id); return; }
    if (estender && ultima) {
      const intervalo = intervaloEntre(fotos, ultima, photo.id);
      if (intervalo.length) { setIds(lista => [...new Set([...lista, ...intervalo])]); return; }
    }
    setUltima(photo.id);
    setIds(lista => alternarSelecao(lista, photo.id));
  };

  return { ativa, ids, ultima, entrar, sair, alternar, selecionarTudo, tem: (id: string) => ids.includes(id) };
}
