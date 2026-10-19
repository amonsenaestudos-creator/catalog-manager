import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analisarEntradaSocial, buscarPerfilPublico, extrairMetadadosPublicos, extrairPerfilDeTexto,
  mesclarPerfis, montarPerfilSocial, nomeSugeridoDoUsuario, resumoDasRedes,
} from '../src/lib/redes';
import { filtrarFotosDoSistema, fotosDoSistema, prepararFotosEscolhidas } from '../src/lib/fotosSistema';
import { emptyData, getDefaultPerson, normalizePerson } from '../src/store';
import { CatalogProvider, useCatalog } from '../src/context';
import AddPerson from '../src/components/AddPerson';
import PersonDrawer from '../src/components/PersonDrawer';
import { fakePhoto, seedIdb } from './catalog.test';

/**
 * Adicionar pessoas pela rede social e reutilizar fotos do sistema.
 *
 * Duas promessas novas do cadastro:
 *  1. colar link/@/WhatsApp reconhece a rede, sugere o nome e tenta trazer
 *     nome + bio + foto públicos (sem nunca prometer o que a rede bloqueia);
 *  2. na aba Fotos dá para escolher o que já está no sistema — órfã adotada
 *     de verdade, foto alheia como cópia, retratos do sistema sempre à mão.
 */

describe('reconhecer a rede a partir do que foi colado', () => {
  it('entende link, domínio solto, @ e telefone', () => {
    expect(analisarEntradaSocial('https://www.instagram.com/ana.souza/?hl=pt-br')).toMatchObject({
      rede: 'instagram', usuario: 'ana.souza', url: 'https://www.instagram.com/ana.souza/', nomeSugerido: 'Ana Souza',
    });
    expect(analisarEntradaSocial('tiktok.com/@ana.fotografa')).toMatchObject({
      rede: 'tiktok', usuario: 'ana.fotografa', url: 'https://www.tiktok.com/@ana.fotografa',
    });
    expect(analisarEntradaSocial('https://x.com/ana_souza')).toMatchObject({ rede: 'x', usuario: 'ana_souza', nomeSugerido: 'Ana Souza' });
    expect(analisarEntradaSocial('@clara.luz', 'threads')).toMatchObject({ rede: 'threads', usuario: 'clara.luz', nomeSugerido: 'Clara Luz' });
    expect(analisarEntradaSocial('rafael', 'github')).toMatchObject({ rede: 'github', usuario: 'rafael', url: 'https://github.com/rafael' });
    // WhatsApp brasileiro ganha o 55 do wa.me sem pedir duas vezes
    expect(analisarEntradaSocial('(71) 99999-8888')).toMatchObject({ rede: 'whatsapp', usuario: '5571999998888', url: 'https://wa.me/5571999998888' });
    expect(analisarEntradaSocial('https://wa.me/5571988887777')).toMatchObject({ rede: 'whatsapp', usuario: '5571988887777' });
    // link de publicação é reconhecido como publicação, não como perfil
    expect(analisarEntradaSocial('https://www.instagram.com/p/ABC123/')).toMatchObject({ rede: 'instagram', usuario: '', ehPublicacao: true });
    expect(analisarEntradaSocial('')).toBeNull();
    expect(analisarEntradaSocial('uma frase qualquer com espaços')).toBeNull();
  });

  it('sugere o nome a partir do usuário', () => {
    expect(nomeSugeridoDoUsuario('ana.souza92')).toBe('Ana Souza');
    expect(nomeSugeridoDoUsuario('Clara_luz')).toBe('Clara Luz');
    expect(nomeSugeridoDoUsuario('bianca.oficial')).toBe('Bianca');
    expect(nomeSugeridoDoUsuario('rafael')).toBe('Rafael');
    expect(nomeSugeridoDoUsuario('12345')).toBe('');
  });
});

describe('a busca do perfil público', () => {
  const htmlDePerfil = `<!doctype html><head>
    <title>Ana Souza (@ana.souza) • Instagram photos and videos</title>
    <meta property="og:title" content="Ana Souza (@ana.souza) • Instagram photos and videos" />
    <meta property="og:description" content="Fotógrafa em Salvador &amp; amante de cafés." />
    <meta property="og:image" content="https://cdn.exemplo.test/ana.jpg" />
  </head><body></body>`;

  it('lê nome, bio e foto do cabeçalho público (Open Graph)', () => {
    const meta = extrairMetadadosPublicos(htmlDePerfil, 'ana.souza');
    expect(meta.nome).toBe('Ana Souza');
    expect(meta.descricao).toBe('Fotógrafa em Salvador & amante de cafés.');
    expect(meta.imagem).toBe('https://cdn.exemplo.test/ana.jpg');
  });

  it('junta a foto da página com as candidatas conhecidas', async () => {
    const analise = analisarEntradaSocial('instagram.com/ana.souza')!;
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => htmlDePerfil })) as unknown as typeof fetch;
    const resultado = await buscarPerfilPublico(analise, { fetchFn });
    expect(resultado.fonte).toBe('pagina');
    expect(resultado.nome).toBe('Ana Souza');
    expect(resultado.fotosCandidatas[0]).toBe('https://cdn.exemplo.test/ana.jpg');
    expect(resultado.fotosCandidatas).toContain('https://unavatar.io/instagram/ana.souza');
    expect(resultado.aviso).toBeUndefined();
  });

  it('quando a rede bloqueia, devolve o que o link já dizia e o aviso honesto', async () => {
    const analise = analisarEntradaSocial('instagram.com/ana.souza')!;
    const fetchFn = vi.fn(async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const resultado = await buscarPerfilPublico(analise, { fetchFn });
    expect(resultado.fonte).toBe('link');
    expect(resultado.nome).toBe('Ana Souza');
    expect(resultado.aviso).toMatch(/não deixou o Catalog ler/i);
    expect(resultado.fotosCandidatas).toEqual(['https://unavatar.io/instagram/ana.souza']);
  });
});

describe('colar o texto do perfil (o plano B)', () => {
  it('separa nome, bio e perfis citados — e ignora contagens', () => {
    const lido = extrairPerfilDeTexto([
      'Ana Souza',
      '@ana.souza',
      '1.234 publicações · 56 mil seguidores',
      'Fotógrafa em Salvador ✿',
      'Também no tiktok.com/@ana.fotografa',
    ].join('\n'));
    expect(lido.nome).toBe('Ana Souza');
    expect(lido.descricao).toContain('Fotógrafa em Salvador');
    expect(lido.descricao).not.toMatch(/seguidores/);
    expect(lido.analises.map(a => `${a.rede}:${a.usuario}`)).toEqual(['tiktok:ana.fotografa', 'instagram:ana.souza']);
  });
});

describe('perfis na ficha', () => {
  it('monta, resume e mescla sem duplicar a mesma conta', () => {
    const insta = montarPerfilSocial(analisarEntradaSocial('@ana.souza', 'instagram')!, { nomeExibicao: 'Ana Souza' });
    const whats = montarPerfilSocial(analisarEntradaSocial('(71) 99999-8888')!, {});
    expect(resumoDasRedes([insta, whats])).toBe('Instagram @ana.souza · WhatsApp 5571999998888');
    expect(mesclarPerfis([insta], [insta, whats])).toHaveLength(2);
  });

  it('sobrevive à normalização e rejeita link perigoso', () => {
    const pessoa = normalizePerson({
      ...getDefaultPerson(), nome: 'Ana',
      perfisSociais: [
        { id: 's1', rede: 'instagram', usuario: 'ana.souza', url: 'https://www.instagram.com/ana.souza/' },
        { id: 's2', rede: 'instagram', usuario: 'ana.souza', url: 'https://www.instagram.com/ana.souza/' },
        { id: 's3', rede: 'desconhecida', usuario: 'ana', url: 'javascript:alert(1)' },
      ],
    });
    expect(pessoa.perfisSociais).toHaveLength(2);
    expect(pessoa.perfisSociais?.[0]).toMatchObject({ rede: 'instagram', usuario: 'ana.souza' });
    expect(pessoa.perfisSociais?.[1]).toMatchObject({ rede: 'outra', url: '' });
    expect(getDefaultPerson().perfisSociais).toEqual([]);
  });
});

describe('fotos que já estão no sistema', () => {
  const orfa = { id: 'orfa-1', url: fakePhoto(), personId: null, isMain: false, type: 'normal' as const, name: 'praia.jpg', createdAt: '' };
  const dona = { ...getDefaultPerson(), id: 'dona-1', nome: 'Bianca' };
  dona.fotos = [{ id: 'foto-dona', url: fakePhoto(20), personId: 'dona-1', isMain: true, type: 'normal', name: 'festa.jpg', createdAt: '' }];
  const data = { ...emptyData(), people: [dona], orphanPhotos: [orfa] };

  it('lista as três prateleiras: sem ficha, de outras fichas e do sistema', () => {
    const acervo = fotosDoSistema(data, 'nova-pessoa');
    expect(acervo.filter(f => f.origem === 'sem-ficha')).toHaveLength(1);
    expect(acervo.filter(f => f.origem === 'ficha')).toEqual([expect.objectContaining({ donaNome: 'Bianca' })]);
    expect(acervo.filter(f => f.origem === 'sistema').length).toBeGreaterThanOrEqual(4);
    // as próprias fotos nunca aparecem para a própria ficha
    expect(fotosDoSistema(data, 'dona-1').filter(f => f.origem === 'ficha')).toHaveLength(0);
    expect(filtrarFotosDoSistema(acervo, 'praia')).toHaveLength(1);
    expect(filtrarFotosDoSistema(acervo, 'Bianca', 'ficha')).toHaveLength(1);
  });

  it('órfã é adotada com o mesmo id; foto alheia entra como cópia', () => {
    const nova = { ...getDefaultPerson(), id: 'nova-1', nome: 'Clara', idade: 30 };
    const acervo = fotosDoSistema(data, nova.id);
    const escolhidas = prepararFotosEscolhidas(acervo.filter(f => f.photo.id === 'orfa-1' || f.photo.id === 'foto-dona'), nova);
    expect(escolhidas.adotadas).toEqual(['orfa-1']);
    const [adotada, copia] = escolhidas.fotos;
    expect(adotada).toMatchObject({ id: 'orfa-1', personId: 'nova-1' });
    expect(copia.id).not.toBe('foto-dona');
    expect(copia).toMatchObject({ url: dona.fotos[0].url, personId: 'nova-1' });
    // e a dona original continua com a dela, intocada
    expect(dona.fotos[0].personId).toBe('dona-1');
  });

  it('não repete foto já na ficha e respeita a regra de mídia adulta', () => {
    const menor = { ...getDefaultPerson(), id: 'nova-2', nome: 'Clara', idade: null };
    menor.fotos = [{ ...orfa, personId: 'nova-2', isMain: true }];
    const adulta = { photo: { id: 'quente-1', url: fakePhoto(30), personId: 'dona-1', isMain: false, type: 'biquini' as const, name: 'praia2.jpg', createdAt: '' }, origem: 'ficha' as const, donaNome: 'Bianca' };
    const resultado = prepararFotosEscolhidas([{ photo: orfa, origem: 'sem-ficha' }, adulta], menor);
    expect(resultado.fotos).toHaveLength(0);
    expect(resultado.repetidas).toBe(1);
    expect(resultado.avisos.join(' ')).toMatch(/18 anos/);
    const maior = { ...menor, idade: 25, fotos: [] };
    expect(prepararFotosEscolhidas([adulta], maior).fotos).toHaveLength(1);
  });
});

/** Espia o catálogo: fichas, órfãs restantes e o primeiro perfil social. */
function Espiao() {
  const { data } = useCatalog();
  const primeira = data.people[0];
  return <>
    <output data-testid="total-fichas">{data.people.length}</output>
    <output data-testid="total-orfas">{data.orphanPhotos.length}</output>
    <output data-testid="perfil-da-ficha">{primeira ? `${primeira.nome}|${primeira.redesSociais}|${(primeira.perfisSociais || []).map(p => `${p.rede}:${p.usuario}`).join(',')}|${primeira.fotos.map(f => f.id).join(',')}` : '—'}</output>
  </>;
}

describe('no cadastro, de ponta a ponta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('colar o link reconhece, busca (rede bloqueando) e aplica nome + rede na ficha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await seedIdb(emptyData());
    const user = userEvent.setup();
    render(<CatalogProvider><AddPerson /><Espiao /></CatalogProvider>);

    await user.click(await screen.findByRole('button', { name: /Adicionar pela rede social/ }));
    await user.type(screen.getByLabelText(/Link do perfil/), 'instagram.com/ana.souza');
    expect(await screen.findByText(/@ana\.souza/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Buscar perfil/ }));
    expect(await screen.findByText(/não deixou o Catalog ler/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome encontrado/)).toHaveValue('Ana Souza');
    // sem foto que carregue, aplicamos só nome e rede social
    await user.click(screen.getByRole('checkbox', { name: /foto de perfil/ })).catch(() => undefined);
    await user.click(screen.getByRole('button', { name: /Aplicar na ficha/ }));
    await waitFor(() => expect(screen.getByPlaceholderText('Como a pessoa se chama?')).toHaveValue('Ana Souza'));

    await user.click(screen.getByRole('button', { name: /^Salvar ficha/ }));
    await waitFor(() => expect(screen.getByTestId('total-fichas')).toHaveTextContent('1'));
    expect(screen.getByTestId('perfil-da-ficha').textContent).toContain('Ana Souza|Instagram @ana.souza|instagram:ana.souza');
  });

  it('escolhe uma foto sem ficha do sistema e ela é adotada ao salvar', async () => {
    const base = emptyData();
    base.orphanPhotos = [{ id: 'orfa-9', url: fakePhoto(), personId: null, isMain: false, type: 'normal', name: 'entardecer.jpg', createdAt: '' }];
    await seedIdb(base);
    const user = userEvent.setup();
    render(<CatalogProvider><AddPerson /><Espiao /></CatalogProvider>);

    await screen.findByPlaceholderText('Como a pessoa se chama?');
    await user.type(screen.getByPlaceholderText('Como a pessoa se chama?'), 'Ana Souza');
    await user.click(screen.getByRole('button', { name: /^Fotos/ }));
    await user.click(screen.getByRole('button', { name: /Escolher fotos do sistema/ }));
    const modal = await screen.findByRole('dialog', { name: /Fotos que já estão no sistema/ });
    await user.click(within(modal).getByRole('button', { name: /entardecer\.jpg/ }));
    await user.click(within(modal).getByRole('button', { name: /Adicionar à ficha/ }));
    expect(await screen.findByAltText('entardecer.jpg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Salvar ficha/ }));
    await waitFor(() => expect(screen.getByTestId('total-fichas')).toHaveTextContent('1'));
    // adotada de verdade: saiu das órfãs e manteve o id na ficha
    expect(screen.getByTestId('total-orfas')).toHaveTextContent('0');
    expect(screen.getByTestId('perfil-da-ficha').textContent).toContain('orfa-9');
  });

  it('a ficha mostra os perfis como atalhos clicáveis', async () => {
    const base = emptyData();
    const pessoa = { ...getDefaultPerson(), nome: 'Ana Souza', descricao: 'Fotógrafa.' };
    pessoa.perfisSociais = [montarPerfilSocial(analisarEntradaSocial('@ana.souza', 'instagram')!, { nomeExibicao: 'Ana Souza' })];
    pessoa.redesSociais = resumoDasRedes(pessoa.perfisSociais);
    base.people = [pessoa];
    await seedIdb(base);
    render(<CatalogProvider><PersonDrawer person={pessoa} /></CatalogProvider>);
    const atalho = await screen.findByRole('link', { name: /Instagram/ });
    expect(atalho).toHaveAttribute('href', 'https://www.instagram.com/ana.souza/');
    expect(atalho.textContent).toContain('@ana.souza');
  });
});
