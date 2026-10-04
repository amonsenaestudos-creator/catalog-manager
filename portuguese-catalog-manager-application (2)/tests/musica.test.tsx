import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { bootApp, seedIdb, seededData } from './catalog.test';
import { CatalogProvider, useCatalog } from '../src/context';
import { PlayerDeMusica } from '../src/features/musica/components/PlayerDeMusica';
import { AMBIENTES_MUSICAIS, TRILHAS_DA_APRESENTACAO, SEM_MUSICA, buscaDaMusica, musicaPorId } from '../src/features/musica/catalogo';
import { interpretarMusica } from '../src/features/musica/links';
import { AMBIENTES_SUPORTADOS, RECEITAS_DO_AMBIENTE, ROTULOS_DO_AMBIENTE, alternarAmbiente, ambienteDisponivel, ambienteTocando, definirVolumeDoAmbiente, ehClimaSuportado, pararAmbiente, tocarAmbiente, volumeDoAmbiente } from '../src/features/musica/ambiente';
import { AmbienteBar } from '../src/features/musica/components/AmbienteBar';
import { seedIdb, seededData } from './catalog.test';

/**
 * Música por link: o que estes testes protegem.
 *
 * O problema original era o pior tipo de defeito de interface: a opção acendia,
 * a cor mudava e nada tocava. Aqui ficam presas as três decisões que consertam
 * isso — o endereço é lido do jeito certo, o player só embute o que dá, e o
 * link salvo vai para as configurações (é o que faz a escolha sobreviver).
 */
describe('leitura do endereço de música', () => {
  it('reconhece vídeo, link curto, Shorts e playlist do YouTube', () => {
    expect(interpretarMusica('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.tocar).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(interpretarMusica('https://youtu.be/dQw4w9WgXcQ')?.tocar).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(interpretarMusica('https://www.youtube.com/shorts/abc123def45')?.tocar).toBe('https://www.youtube.com/embed/abc123def45');
    expect(interpretarMusica('https://www.youtube.com/playlist?list=PL1234567890')?.tocar).toBe('https://www.youtube.com/embed/videoseries?list=PL1234567890');
  });

  it('reconhece faixa, álbum e playlist do Spotify', () => {
    expect(interpretarMusica('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')?.tocar).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
    expect(interpretarMusica('https://open.spotify.com/album/1abcDEF')?.tocar).toBe('https://open.spotify.com/embed/album/1abcDEF');
    expect(interpretarMusica('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')?.servico).toBe('spotify');
  });

  it('toca arquivo de áudio direto e SoundCloud no player de terceiro', () => {
    const arquivo = interpretarMusica('https://exemplo.com/chuva.mp3');
    expect(arquivo).toMatchObject({ servico: 'arquivo', player: 'audio', tocar: 'https://exemplo.com/chuva.mp3' });
    const nuvem = interpretarMusica('https://soundcloud.com/alguma-pessoa/alguma-faixa');
    expect(nuvem).toMatchObject({ servico: 'soundcloud', player: 'iframe' });
    expect(nuvem?.tocar).toContain('w.soundcloud.com/player');
  });

  it('diz a verdade quando o link não tem player embutido', () => {
    // Uma busca do YouTube não toca embutida: em vez de um player morto, um aviso.
    const busca = interpretarMusica('https://www.youtube.com/results?search_query=chuva+relaxante');
    expect(busca?.tocar).toBeUndefined();
    expect(busca?.aviso).toMatch(/abre fora do aplicativo/i);
    const outro = interpretarMusica('https://exemplo.com/uma-pagina');
    expect(outro?.servico).toBe('externo');
    expect(outro?.tocar).toBeUndefined();
    expect(outro?.aviso).toMatch(/não tem player embutido/i);
  });

  it('recusa o que não é link http(s)', () => {
    expect(interpretarMusica('javascript:alert(1)')).toBeNull();
    expect(interpretarMusica('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(interpretarMusica('só um texto')).toBeNull();
    expect(interpretarMusica('')).toBeNull();
  });
});

describe('catálogo de músicas do aplicativo', () => {
  it('todo clima tem busca curada e um id estável', () => {
    expect(AMBIENTES_MUSICAIS.map(m => m.id)).toEqual(['chuva', 'cafe', 'oceano', 'cidade', 'lofi']);
    for (const musica of [...AMBIENTES_MUSICAIS, ...TRILHAS_DA_APRESENTACAO]) {
      expect(musica.rotulo.length, musica.id).toBeGreaterThan(2);
      expect(musica.termo.length, musica.id).toBeGreaterThan(5);
      expect(buscaDaMusica(musica), musica.id).toContain('youtube.com/results?search_query=');
    }
  });

  it('encontra por id e trata o silêncio como silêncio', () => {
    expect(musicaPorId('lofi')?.rotulo).toBe('Lo-fi');
    expect(musicaPorId('cinematico')?.rotulo).toBe('Cinemático');
    expect(musicaPorId(SEM_MUSICA)).toBeUndefined();
    expect(musicaPorId('inexistente')).toBeUndefined();
  });
});

/** Espia o que ficou salvo nas configurações — é o que a escolha precisa sobreviver. */
function EspiaoDeLinks() {
  const ctx = useCatalog();
  const links = ctx.data.settings.musicaLinks || {};
  return <p data-testid="links">{JSON.stringify({ ...links, ativo: ctx.data.settings.ambienteAtivo || '' })}</p>;
}

describe('player de música', () => {
  const chuva = AMBIENTES_MUSICAIS[0];

  // Cada teste começa com o banco limpo: o link salvo é justamente o que
  // precisa sobreviver, então um teste não pode herdar o link do anterior.
  beforeEach(async () => {
    await new Promise(resolve => {
      const pedido = indexedDB.deleteDatabase('catalog-local-v3');
      pedido.onsuccess = pedido.onerror = pedido.onblocked = () => resolve(null);
    });
    localStorage.clear();
  });

  it('o caminho principal é tocar aqui no site; o link é o plano B', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><PlayerDeMusica musica={chuva} /><EspiaoDeLinks /></CatalogProvider>);

    // Sem link nenhum, o clima já oferece o som do próprio site.
    expect(screen.getByRole('button', { name: /Tocar aqui/i })).toBeTruthy();
    expect(screen.getByLabelText('Volume do ambiente Chuva')).toBeTruthy();
    expect(document.querySelector('.musica-embed')).toBeNull();
    expect(screen.getByText(/som do próprio site/i)).toBeTruthy();

    // E o link continua alcançável, atrás do botão que explica o que é.
    await user.click(screen.getByRole('button', { name: /Prefiro usar um link/i }));
    expect(screen.getByRole('button', { name: /Abrir busca curada/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Colar link/i }));
    expect(screen.getByLabelText('Link da música')).toBeTruthy();
  });

  it('link colado vira player embutido e fica salvo nas configurações', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><PlayerDeMusica musica={chuva} /><EspiaoDeLinks /></CatalogProvider>);

    await user.click(screen.getByRole('button', { name: /Prefiro usar um link/i }));
    await user.click(screen.getByRole('button', { name: /Colar link/i }));
    await user.type(screen.getByLabelText('Link da música'), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: /Salvar e tocar/i }));

    await waitFor(() => expect(document.querySelector('.musica-embed iframe')).toBeTruthy());
    const player = document.querySelector('.musica-embed iframe') as HTMLIFrameElement;
    expect(player.getAttribute('src')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(player.getAttribute('title')).toBe('Música: Chuva');
    // O link vive em settings.musicaLinks — não em estado de tela.
    await waitFor(() => expect(screen.getByTestId('links').textContent).toContain('youtu.be/dQw4w9WgXcQ'));
    expect(screen.getByRole('button', { name: /Abrir no YouTube/i })).toBeTruthy();
  });

  it('recusa endereço que não é https e não grava nada', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><PlayerDeMusica musica={chuva} /><EspiaoDeLinks /></CatalogProvider>);

    await user.click(screen.getByRole('button', { name: /Prefiro usar um link/i }));
    await user.click(screen.getByRole('button', { name: /Colar link/i }));
    await user.type(screen.getByLabelText('Link da música'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: /Salvar e tocar/i }));

    // Nada é gravado e nenhum player nasce: o campo continua aberto para tentar de novo.
    await waitFor(() => expect(screen.getByLabelText('Link da música')).toBeTruthy());
    expect(screen.getByTestId('links').textContent).toBe('{"ativo":""}');
    expect(document.querySelector('.musica-embed')).toBeNull();
  });

  it('a versão compacta da apresentação cabe numa linha e troca de trilha', async () => {
    const user = userEvent.setup();
    render(<CatalogProvider><PlayerDeMusica musica={TRILHAS_DA_APRESENTACAO[0]} compacto /><EspiaoDeLinks /></CatalogProvider>);

    const painel = document.querySelector('.musica-player.compacto') as HTMLElement;
    expect(painel, 'versão compacta').toBeTruthy();
    expect(within(painel).getByText('Ambiente')).toBeTruthy();
    await user.click(within(painel).getByRole('button', { name: /Colar link/i }));
    await user.type(within(painel).getByLabelText('Link da música'), 'https://exemplo.com/piano.mp3');

    expect(within(painel).getByRole('button', { name: /Salvar e tocar/i })).toBeTruthy();
  });
});

/**
 * A ligação com as telas: foi aqui que o defeito original aparecia — a opção
 * acendia e nada acontecia. O painel Ambiente e a trilha da apresentação
 * precisam mostrar o player de verdade.
 */
describe('música nas telas do Momentos', () => {
  beforeEach(async () => { await seedIdb(seededData(6, 1)); });


  async function irParaMomentos() {
    const aside = document.querySelector('.sidebar') as HTMLElement;
    await act(async () => { (within(aside).getByRole('button', { name: /Momentos/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector('.moments-page')).toBeTruthy());
  }

  it('escolher um clima abre o player com a busca curada', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await irParaMomentos();

    expect(document.querySelector('.ambient-panel .musica-player')).toBeNull();
    await act(async () => { (screen.getByRole('button', { name: /Lo-fi/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector('.musica-player')).toBeTruthy());
    expect(screen.getByRole('button', { name: /Tocar aqui/i })).toBeTruthy();
    expect(screen.getByLabelText(/Música do clima Lo-fi/i)).toBeTruthy();
    // E o clima escolhido fica ativo no aplicativo: a pílula de música aparece
    // fora da tela do Momentos, porque o som é do site inteiro.
    const pilula = document.querySelector('.ambiente-bar') as HTMLElement;
    expect(pilula, 'pílula da música ambiente').toBeTruthy();
    expect(within(pilula).getByText('Lo-fi')).toBeTruthy();
  });

  it('o Modo apresentação já oferece a trilha com player, e "Sem música" o esconde', async () => {
    const user = userEvent.setup();
    await bootApp(user);
    await irParaMomentos();

    await act(async () => { (screen.getByRole('button', { name: /Modo apresentação/i }) as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector('.presentation-overlay')).toBeTruthy());
    expect(document.querySelector('.presentation-musica')).toBeTruthy();

    const semMusica = [...document.querySelectorAll<HTMLElement>('.presentation-tracks button')].find(b => /Sem música/i.test(b.textContent || ''));
    expect(semMusica, 'opção Sem música').toBeTruthy();
    await act(async () => { semMusica!.click(); });
    await waitFor(() => expect(document.querySelector('.presentation-musica')).toBeNull());
  });
});

/**
 * O som do próprio site.
 *
 * O jsdom não tem Web Audio, então o que dá para prender aqui são as garantias
 * que não dependem de som sair pelo alto-falante: o motor aceita os cinco
 * climas, recusa o resto, nunca lança, e a interface diz a verdade quando não
 * tem áudio — em vez de um botão que não faz nada.
 */
describe('ambiente gerado no site', () => {
  beforeEach(() => { pararAmbiente(); definirVolumeDoAmbiente(40); });

  it('tem receita para os cinco climas do painel e para mais nenhum', () => {
    expect([...RECEITAS_DO_AMBIENTE].sort()).toEqual([...AMBIENTES_SUPORTADOS].sort());
    for (const clima of AMBIENTES_SUPORTADOS) {
      expect(ehClimaSuportado(clima), clima).toBe(true);
      expect(ROTULOS_DO_AMBIENTE[clima], clima).toBeTruthy();
    }
    expect(ehClimaSuportado('cinematico')).toBe(false);
    expect(ehClimaSuportado('')).toBe(false);
  });

  it('liga, desliga e recusa clima desconhecido sem nunca lançar', () => {
    // No jsdom não há AudioContext: o pedido é recusado, e não estoura.
    expect(ambienteDisponivel()).toBe(false);
    expect(tocarAmbiente('chuva')).toBe(false);
    expect(tocarAmbiente('clima-que-nao-existe')).toBe(false);
    expect(alternarAmbiente('chuva')).toBe(false);
    expect(ambienteTocando()).toBeNull();
    expect(() => pararAmbiente()).not.toThrow();
  });

  it('o volume anda de 0 a 100 e não aceita valor torto', () => {
    definirVolumeDoAmbiente(65);
    expect(volumeDoAmbiente()).toBe(65);
    definirVolumeDoAmbiente(-30);
    expect(volumeDoAmbiente()).toBe(0);
    definirVolumeDoAmbiente(240);
    expect(volumeDoAmbiente()).toBe(100);
    definirVolumeDoAmbiente(Number.NaN);
    expect(volumeDoAmbiente()).toBe(40);
  });
});

describe('pílula da música ambiente', () => {
  beforeEach(async () => {
    await new Promise(resolve => {
      const pedido = indexedDB.deleteDatabase('catalog-local-v3');
      pedido.onsuccess = pedido.onerror = pedido.onblocked = () => resolve(null);
    });
    localStorage.clear();
    pararAmbiente();
  });

  it('sem clima escolhido, não ocupa tela nenhuma', () => {
    render(<CatalogProvider><AmbienteBar /></CatalogProvider>);
    expect(document.querySelector('.ambiente-bar')).toBeNull();
  });

  it('com clima salvo, mostra o controle e diz que o som é deste site', async () => {
    // O clima chega pelas configurações, como chega numa visita seguinte.
    const dados = seededData(2, 1);
    dados.settings.ambienteAtivo = 'lofi';
    dados.settings.ambienteVolume = 30;
    await seedIdb(dados);

    render(<CatalogProvider><AmbienteBar /></CatalogProvider>);
    await waitFor(() => expect(document.querySelector('.ambiente-bar')).toBeTruthy());
    const barra = document.querySelector('.ambiente-bar') as HTMLElement;
    expect(within(barra).getByText('Lo-fi')).toBeTruthy();
    expect(within(barra).getByText(/pausado/i)).toBeTruthy();
    expect(within(barra).getByRole('button', { name: /Tocar Lo-fi/i })).toBeTruthy();
    expect(within(barra).getByLabelText('Volume da música ambiente')).toBeTruthy();
    // Sem áudio no jsdom, a pílula existe e não promete o que não pode cumprir.
    expect(within(barra).getByText(/pausado/i)).toBeTruthy();
  });

  it('desligar a pílula limpa o clima salvo', async () => {
    const user = userEvent.setup();
    const dados = seededData(2, 1);
    dados.settings.ambienteAtivo = 'chuva';
    await seedIdb(dados);

    render(<CatalogProvider><AmbienteBar /><EspiaoDeLinks /></CatalogProvider>);
    await waitFor(() => expect(document.querySelector('.ambiente-bar')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /Desligar a música ambiente/i }));
    await waitFor(() => expect(screen.getByTestId('links').textContent).toContain('"ativo":""'));
    expect(document.querySelector('.ambiente-bar')).toBeNull();
  });
});
