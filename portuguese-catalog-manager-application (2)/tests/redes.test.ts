import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarPerfilSocial, extrairMetadados, extrairSeguidores, incorporarImagem, lerEndereco, limparBioDoPerfil, limparNomeDoPerfil, perfilParaFicha } from '../src/lib/redes';

const respostaJson = (dados: unknown) => ({
  ok: true, status: 200,
  json: async () => dados,
  text: async () => JSON.stringify(dados),
  blob: async () => new Blob([JSON.stringify(dados)], { type: 'application/json' }),
}) as Response;

const respostaHtml = (html: string) => ({
  ok: true, status: 200,
  text: async () => html,
  json: async () => ({}),
  blob: async () => new Blob([html], { type: 'text/html' }),
}) as Response;

const respostaVazia = () => ({ ok: false, status: 404 }) as Response;

afterEach(() => { vi.unstubAllGlobals(); });

describe('endereço do perfil', () => {
  it('entende @usuario como Instagram', () => {
    expect(lerEndereco('@maria.silva')).toEqual({
      rede: 'instagram', usuario: 'maria.silva', url: 'https://www.instagram.com/maria.silva/', original: '@maria.silva',
    });
  });

  it('reconhece a rede pelo endereço e monta o endereço canônico', () => {
    expect(lerEndereco('https://www.instagram.com/maria/?utm_source=teste').url).toBe('https://www.instagram.com/maria/');
    expect(lerEndereco('instagram.com/maria').rede).toBe('instagram');
    expect(lerEndereco('tiktok.com/@maria').url).toBe('https://www.tiktok.com/@maria');
    expect(lerEndereco('x.com/maria').url).toBe('https://x.com/maria');
    expect(lerEndereco('github.com/octocat').url).toBe('https://github.com/octocat');
    expect(lerEndereco('https://www.youtube.com/@canal').usuario).toBe('canal');
    expect(lerEndereco('https://www.linkedin.com/in/maria-silva/').url).toBe('https://www.linkedin.com/in/maria-silva/');
  });

  it('respeita a rede escolhida à mão', () => {
    expect(lerEndereco('maria', 'tiktok')).toMatchObject({ rede: 'tiktok', usuario: 'maria', url: 'https://www.tiktok.com/@maria' });
  });

  it('recusa endereço de publicação, link vazio e usuário com espaço', () => {
    expect(() => lerEndereco('https://instagram.com/p/ABC123')).toThrow(/publicação/i);
    expect(() => lerEndereco('   ')).toThrow(/Cole o link/i);
    expect(() => lerEndereco('maria silva')).toThrow(/nome de usuário/i);
  });
});

describe('limpeza do que a rede devolve', () => {
  it('tira o @usuario e o nome da rede do título', () => {
    expect(limparNomeDoPerfil('Maria Silva (@maria) • Instagram photos and videos', 'instagram', 'maria')).toBe('Maria Silva');
    expect(limparNomeDoPerfil('Maria Silva (@maria) | TikTok', 'tiktok', 'maria')).toBe('Maria Silva');
    expect(limparNomeDoPerfil('Maria Silva (@maria) / X', 'x', 'maria')).toBe('Maria Silva');
    expect(limparNomeDoPerfil('Canal de receitas - YouTube', 'youtube', 'canal')).toBe('Canal de receitas');
    expect(limparNomeDoPerfil('Entrar • Instagram', 'instagram', 'maria')).toBe('');
  });

  it('lê seguidores em português e inglês', () => {
    expect(extrairSeguidores('1,234 Followers, 90 Following')).toBe(1234);
    expect(extrairSeguidores('12,5 mil seguidores')).toBe(12500);
    expect(extrairSeguidores('2.3M followers')).toBe(2300000);
    expect(extrairSeguidores('sem número')).toBeNull();
  });

  it('não deixa a vitrine do Instagram virar bio', () => {
    expect(limparBioDoPerfil('1,234 Followers, 90 Following, 10 Posts - See Instagram photos and videos from Maria (@maria)')).toBe('');
    expect(limparBioDoPerfil('Café, livros e corrida | Instagram')).toBe('Café, livros e corrida');
  });
});

describe('metadados públicos da página', () => {
  const html = `<!doctype html><html><head>
    <title>Maria Silva (@mari.silva) • Instagram photos and videos</title>
    <meta property="og:title" content="Maria Silva (@mari.silva) • Instagram photos and videos" />
    <meta property="og:description" content="1.234 Followers, 90 Following, 10 Posts - See Instagram photos and videos from Maria (@mari.silva)" />
    <meta property="og:image" content="/foto-de-perfil.jpg" />
    <meta property="og:site_name" content="Instagram" />
    <meta name="profile:username" content="mari.silva" />
    <script type="application/ld+json">
      {"@type":"Person","name":"Maria Silva","description":"Café, livros e corrida","image":["https://cdn.exemplo/maria-2.jpg"],"address":{"addressLocality":"Salvador"}}
    </script>
  </head><body></body></html>`;

  it('junta Open Graph e JSON-LD com endereços absolutos', () => {
    const meta = extrairMetadados(html, 'https://www.instagram.com/mari.silva/');
    expect(meta.usuario).toBe('mari.silva');
    expect(meta.nomeJsonLd).toBe('Maria Silva');
    expect(meta.descricaoJsonLd).toBe('Café, livros e corrida');
    expect(meta.localizacao).toBe('Salvador');
    expect(meta.imagens).toContain('https://www.instagram.com/foto-de-perfil.jpg');
    expect(meta.imagens).toContain('https://cdn.exemplo/maria-2.jpg');
  });
});

describe('busca do perfil', () => {
  it('lê o GitHub direto da API pública', async () => {
    const fetcher = vi.fn(async () => respostaJson({
      login: 'octocat', name: 'The Octocat', bio: 'GitHub mascot', location: 'San Francisco', blog: 'https://github.blog',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231', followers: 16000, html_url: 'https://github.com/octocat',
    })) as unknown as typeof fetch;

    const perfil = await buscarPerfilSocial('github.com/octocat', { fetcher });
    expect(perfil).toMatchObject({
      rede: 'github', usuario: 'octocat', nome: 'The Octocat', bio: 'GitHub mascot', localizacao: 'San Francisco',
      seguidores: 16000, fonte: 'GitHub', avatar: 'https://avatars.githubusercontent.com/u/583231',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain('api.github.com/users/octocat');
  });

  it('cai no leitor de metadados quando a rede não tem API direta', async () => {
    const fetcher = vi.fn(async (entrada: RequestInfo | URL) => {
      if (String(entrada).startsWith('https://api.microlink.io/')) return respostaJson({
        status: 'success',
        data: {
          title: 'Maria Silva (@maria) • Instagram photos and videos',
          description: '1,234 Followers, 90 Following, 10 Posts - See Instagram photos and videos from Maria (@maria)',
          image: { url: 'https://cdn.exemplo/maria.jpg' },
          url: 'https://www.instagram.com/maria/',
        },
      });
      return respostaVazia();
    }) as unknown as typeof fetch;

    const perfil = await buscarPerfilSocial('instagram.com/maria', { fetcher });
    expect(perfil.nome).toBe('Maria Silva');
    expect(perfil.seguidores).toBe(1234);
    expect(perfil.bio).toBe('');
    expect(perfil.avatar).toBe('https://cdn.exemplo/maria.jpg');
    expect(perfil.fonte).toBe('leitor de metadados');
  });

  it('usa o HTML público quando o primeiro leitor falha', async () => {
    const html = `<html><head><meta property="og:title" content="Joana (@joana) • Instagram photos and videos" /><meta property="og:image" content="https://cdn.exemplo/joana.jpg" /><meta property="og:description" content="Fotografia e viagens" /></head></html>`;
    const fetcher = vi.fn(async (entrada: RequestInfo | URL) => {
      if (String(entrada).startsWith('https://api.allorigins.win/')) return respostaHtml(html);
      return respostaVazia();
    }) as unknown as typeof fetch;

    const perfil = await buscarPerfilSocial('instagram.com/joana', { fetcher });
    expect(perfil.nome).toBe('Joana');
    expect(perfil.bio).toBe('Fotografia e viagens');
    expect(perfil.fotos).toContain('https://cdn.exemplo/joana.jpg');
  });

  it('explica o que tentou quando nada responde', async () => {
    const fetcher = vi.fn(async () => respostaVazia()) as unknown as typeof fetch;
    await expect(buscarPerfilSocial('instagram.com/privada', { fetcher })).rejects.toThrow(/Não consegui ler este perfil.*privado ou a rede pode ter bloqueado/i);
  });
});

describe('imagem incorporada', () => {
  it('transforma o download em data URL', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true, status: 200, blob: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    })) as unknown as typeof fetch;
    const url = await incorporarImagem('https://cdn.exemplo/foto.png', fetcher);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('mantém o endereço público quando o servidor não libera o download', async () => {
    const fetcher = vi.fn(async () => respostaVazia()) as unknown as typeof fetch;
    await expect(incorporarImagem('https://cdn.exemplo/foto.png', fetcher)).resolves.toBe('https://cdn.exemplo/foto.png');
  });
});

describe('o que fica guardado na ficha', () => {
  it('vira um perfil social com id, fonte e retrato', async () => {
    const fetcher = vi.fn(async () => respostaJson({
      login: 'octocat', name: 'The Octocat', bio: 'Mascote', avatar_url: 'https://avatars.githubusercontent.com/u/583231', followers: 10,
    })) as unknown as typeof fetch;
    const perfil = await buscarPerfilSocial('github.com/octocat', { fetcher });
    const guardado = perfilParaFicha(perfil, 'perfil-1');
    expect(guardado).toMatchObject({
      id: 'perfil-1', rede: 'github', usuario: 'octocat', nome: 'The Octocat', bio: 'Mascote',
      seguidores: 10, fonte: 'GitHub', avatar: 'https://avatars.githubusercontent.com/u/583231',
    });
    expect(guardado.importadoEm).toBeTruthy();
  });
});
