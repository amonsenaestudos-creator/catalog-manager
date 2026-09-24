/**
 * Favoritos: as pessoas especiais, na sua cara.
 *
 * O catálogo tem a aba de favoritos; esta é a versão "sua coleção" — só
 * quem ganhou o coração, com três jeitos de olhar:
 *   · grade — fichas com foto, nota e local, para comparar;
 *   · lista — nome, local e nota, para varrer e abrir;
 *   · mural — só as fotos principais, como um mural no quarto.
 * O modo escolhido fica guardado neste aparelho.
 */
import { useMemo, useState } from 'react';
import { Heart, Image as ImageIcon, LayoutGrid, List } from 'lucide-react';
import { useCatalog } from '../context';
import { calculateOverallRating, corDaPessoa, locationLabel } from '../store';
import type { Person } from '../types';
import { Avatar, EmptyState, PageTitle, PhotoView, Button } from './ui';
import StarRating from './StarRating';

type ModoFavoritos = 'grade' | 'lista' | 'mural';
const CHAVE_MODO = 'catalog_favoritos_modo';
const MODOS: { id: ModoFavoritos; nome: string; icone: typeof LayoutGrid; dica: string }[] = [
  { id: 'grade', nome: 'Grade', icone: LayoutGrid, dica: 'fichas completas' },
  { id: 'lista', nome: 'Lista', icone: List, dica: 'nome e nota' },
  { id: 'mural', nome: 'Mural', icone: ImageIcon, dica: 'só as fotos' },
];

const lerModo = (): ModoFavoritos => {
  try {
    const salvo = localStorage.getItem(CHAVE_MODO);
    return salvo === 'grade' || salvo === 'lista' || salvo === 'mural' ? salvo : 'grade';
  } catch { return 'grade'; }
};

export default function Favoritos() {
  const ctx = useCatalog(), { data } = ctx;
  const [modo, setModo] = useState<ModoFavoritos>(lerModo);
  const favoritos = useMemo(() => data.people
    .filter(p => p.favorite && !p.deletedAt)
    .sort((a, b) => calculateOverallRating(b.rating) - calculateOverallRating(a.rating) || a.nome.localeCompare(b.nome, 'pt-BR')), [data.people]);
  const trocarModo = (m: ModoFavoritos) => { setModo(m); ctx.buzz?.(5); try { localStorage.setItem(CHAVE_MODO, m); } catch { /* preferência é opcional */ } };
  const favoritar = (p: Person) => { ctx.changePeople([p.id], { favorite: !p.favorite }, p.favorite ? 'Removida dos favoritos.' : 'Adicionada aos favoritos.'); if (!p.favorite) ctx.sound('pop'); };

  return <div className="favoritos-page">
    <PageTitle eyebrow="Sua coleção" title="Favoritos" description={favoritos.length ? `${favoritos.length} ${favoritos.length === 1 ? 'pessoa com o coração' : 'pessoas com o coração'} — sua parte favorita do catálogo.` : 'Quem ganha o coração aparece aqui, na sua cara.'}>
      <div className="fav-modos" role="group" aria-label="Modo de visualização">{MODOS.map(item => {
        const Icon = item.icone;
        return <button key={item.id} className={modo === item.id ? 'active' : ''} onClick={() => trocarModo(item.id)} title={item.dica}><Icon size={16} /><span>{item.nome}</span></button>;
      })}</div>
    </PageTitle>
    {!favoritos.length && <EmptyState icon={Heart} title="Nenhum coração ainda" description="Toque no coração de uma ficha — na grade, na lista ou na conversa — e ela aparece aqui." action="Ver o catálogo" onAction={() => ctx.navigate('catalog')} />}
    {favoritos.length > 0 && modo === 'grade' && <div className="fav-grade">{favoritos.map(p => <article key={p.id} className="fav-card" style={{ '--pessoa': corDaPessoa(p) } as React.CSSProperties}>
      <div className="fav-card-foto"><button onClick={() => ctx.openPerson(p)} aria-label={`Abrir ficha de ${p.nome}`}><PhotoView person={p} /></button>
        <button className={`fav-coracao ${p.favorite ? 'active' : ''}`} onClick={() => favoritar(p)} aria-label={`Tirar ${p.nome} dos favoritos`}><Heart size={16} fill="currentColor" /></button></div>
      <div className="fav-card-corpo"><button onClick={() => ctx.openPerson(p)}><h3>{p.nome}</h3></button><p>{locationLabel(p, data)}</p><StarRating readonly size={13} value={calculateOverallRating(p.rating)} /></div>
    </article>)}</div>}
    {favoritos.length > 0 && modo === 'lista' && <div className="fav-linha-list">{favoritos.map(p => <div key={p.id} className="fav-linha" style={{ '--pessoa': corDaPessoa(p) } as React.CSSProperties}>
      <button className="fav-linha-abrir" onClick={() => ctx.openPerson(p)}><Avatar person={p} size={46} /><span><strong>{p.nome}{p.apelido ? <small> “{p.apelido}”</small> : null}</strong><small>{locationLabel(p, data)}</small></span></button>
      <StarRating readonly size={13} value={calculateOverallRating(p.rating)} />
      <button className={`fav-coracao ${p.favorite ? 'active' : ''}`} onClick={() => favoritar(p)} aria-label={`Tirar ${p.nome} dos favoritos`}><Heart size={17} fill="currentColor" /></button>
    </div>)}</div>}
    {favoritos.length > 0 && modo === 'mural' && <div className="fav-mural">{favoritos.map(p => {
      const foto = p.fotos.find(f => f.isMain) || p.fotos[0];
      return <figure key={p.id} className="fav-mural-item">
        {foto ? <button onClick={() => ctx.openPerson(p)} aria-label={`Abrir ficha de ${p.nome}`}><img src={foto.url} alt={p.nome} loading="lazy" /><figcaption><strong>{p.nome}</strong><StarRating readonly size={11} value={calculateOverallRating(p.rating)} /></figcaption></button>
          : <button onClick={() => ctx.openPerson(p)} className="fav-mural-sem-foto"><span>{p.nome.slice(0, 2).toUpperCase()}</span><strong>{p.nome}</strong></button>}
        <button className={`fav-coracao ${p.favorite ? 'active' : ''}`} onClick={() => favoritar(p)} aria-label={`Tirar ${p.nome} dos favoritos`}><Heart size={14} fill="currentColor" /></button>
      </figure>;
    })}</div>}
    {favoritos.length > 0 && <div className="fav-rodape"><Button variant="ghost" onClick={() => ctx.navigate('catalog')}><LayoutGrid size={15} />Ver tudo no catálogo</Button></div>}
  </div>;
}
