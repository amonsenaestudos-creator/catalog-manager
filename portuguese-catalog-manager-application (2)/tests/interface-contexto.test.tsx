import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CATEGORIAS_DA_FICHA, CLASSES_DE_DENSIDADE, DENSIDADES,
  acoesDaFicha, acoesDaTelaInicial, categoriaDaAba, classeDaDensidade, informacaoDaDensidade,
  normalizarDensidade, organizarAcoes, proximaDensidade,
} from '../src/features/interface';
import { BarraDeAcoes } from '../src/features/interface/components/BarraDeAcoes';
import { MenuMais } from '../src/features/interface/components/MenuMais';
import { Revelar } from '../src/features/interface/components/Revelar';
import { CHAVE_DO_FOCO, aplicarModoFoco, lerModoFoco, useModoFoco } from '../src/features/interface/foco';
import { LIMITE_ESSENCIAL, revelar, resumoDeContagens, rotuloDoResto } from '../src/features/interface/revelacao';
import { iconeDaAcao } from '../src/features/interface/icones';

/**
 * A rodada da interface: "uma decisão por vez".
 *
 * O que estes testes protegem: a barra mostra poucas ações, o resto continua
 * alcançável e agrupado, a ficha revela aos poucos, a densidade tem três
 * degraus e o modo foco só mexe no que é moldura.
 */

describe('densidade da interface', () => {
  it('tem três degraus e um padrão confortável', () => {
    expect(DENSIDADES.map(opcao => opcao.id)).toEqual(['compacta', 'confortavel', 'espacosa']);
    expect(normalizarDensidade(undefined)).toBe('confortavel');
    expect(informacaoDaDensidade('espacosa').nome).toBe('Espaçosa');
  });

  it('aceita o valor antigo de duas opções sem perder a preferência', () => {
    expect(normalizarDensidade('compacto')).toBe('compacta');
    expect(normalizarDensidade('compacta')).toBe('compacta');
    expect(normalizarDensidade('  COMPACTO ')).toBe('compacta');
    expect(normalizarDensidade('qualquer coisa')).toBe('confortavel');
  });

  it('a classe do html sai do valor normalizado, e o botão de alternar dá a volta', () => {
    expect(classeDaDensidade('compacto')).toBe('density-compacta');
    expect(CLASSES_DE_DENSIDADE).toEqual(['density-compacta', 'density-confortavel', 'density-espacosa']);
    expect(proximaDensidade('compacta')).toBe('confortavel');
    expect(proximaDensidade('confortavel')).toBe('espacosa');
    expect(proximaDensidade('espacosa')).toBe('compacta');
  });
});

describe('revelação progressiva', () => {
  it('mostra o essencial e conta o que ficou de fora', () => {
    const tudo = Array.from({ length: 9 }, (_, i) => [`Rótulo ${i}`, `Valor ${i}`] as [string, string]);
    const corte = revelar(tudo, LIMITE_ESSENCIAL);
    expect(corte.visiveis).toHaveLength(3);
    expect(corte.restantes).toBe(6);
    expect(corte.temMais).toBe(true);
    expect(corte.escondidas).toHaveLength(6);
    expect(rotuloDoResto(corte.restantes, 'informação', 'informações')).toBe('Ver mais 6 informações');
    expect(rotuloDoResto(1, 'informação', 'informações')).toBe('Ver mais 1 informação');
    expect(revelar(tudo.slice(0, 2)).temMais).toBe(false);
    expect(revelar(undefined as unknown as string[]).total).toBe(0);
  });

  it('escreve o resumo de contagens sem mostrar zero', () => {
    expect(resumoDeContagens([['fotos', 12], ['áudios', 0], ['notas', 3]])).toBe('12 fotos · 3 notas');
  });

  it('a seção começa fechada, mostra a prévia e abre no toque', async () => {
    const user = userEvent.setup();
    render(<Revelar titulo="Sobre" contagem="9 informações" resumo="As 3 principais agora." previa={<p>prévia curta</p>}>
      <p>o dossiê inteiro</p>
    </Revelar>);
    const cabeca = screen.getByRole('button', { name: /Sobre/ });
    expect(cabeca).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('prévia curta')).toBeInTheDocument();
    expect(screen.queryByText('o dossiê inteiro')).toBeNull();

    await act(async () => { cabeca.click(); });
    expect(screen.getByRole('button', { name: /Sobre/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('o dossiê inteiro')).toBeInTheDocument();
    expect(screen.queryByText('prévia curta')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Sobre/ }));
    expect(screen.queryByText('o dossiê inteiro')).toBeNull();
  });
});

describe('ações por contexto', () => {
  const nomes = (lista: { id: string }[]) => lista.map(acao => acao.id);

  it('a ficha tem cinco categorias, e a aba antiga cai na certa', () => {
    expect(CATEGORIAS_DA_FICHA.map(c => c.id)).toEqual(['perfil', 'avaliacoes', 'midia', 'relacoes', 'registros']);
    expect(categoriaDaAba('photos')).toBe('midia');
    expect(categoriaDaAba('info')).toBe('perfil');
    expect(categoriaDaAba('timeline')).toBe('registros');
    expect(categoriaDaAba('goals')).toBe('registros');
    expect(categoriaDaAba('ratings')).toBe('avaliacoes');
    expect(categoriaDaAba('seja-o-que-for')).toBe('perfil');
    expect(categoriaDaAba(undefined)).toBe('perfil');
  });

  it('o corte deixa no máximo três ações na barra e nunca menos de duas', () => {
    const plano = organizarAcoes(acoesDaFicha({ categoria: 'midia' }));
    expect(plano.primarias.length).toBe(3);
    expect(nomes(plano.primarias)).toEqual(['editar', 'conversar', 'adicionar-foto']);
    expect(plano.grupos.length).toBeGreaterThan(0);
  });

  it('a barra responde ao contexto: a terceira ação muda com a categoria', () => {
    const perfil = organizarAcoes(acoesDaFicha({ categoria: 'perfil' }));
    const registros = organizarAcoes(acoesDaFicha({ categoria: 'registros' }));
    const relacoes = organizarAcoes(acoesDaFicha({ categoria: 'relacoes' }));
    expect(nomes(perfil.primarias)).toEqual(['editar', 'conversar']);
    expect(nomes(registros.primarias)).toEqual(['editar', 'conversar', 'nova-nota']);
    expect(nomes(relacoes.primarias)).toEqual(['editar', 'conversar', 'ver-relacoes']);
  });

  it('nunca repete a mesma ação na barra e no menu', () => {
    const plano = organizarAcoes(acoesDaFicha({ categoria: 'avaliacoes' }));
    const naBarra = new Set(nomes(plano.primarias));
    const noMenu = plano.grupos.flatMap(grupo => nomes(grupo.acoes));
    expect(noMenu.filter(id => naBarra.has(id))).toEqual([]);
    expect(new Set(noMenu).size).toBe(noMenu.length);
    expect(plano.total).toBe(plano.primarias.length + noMenu.length);
  });

  it('o que é perigoso não sobe para a barra, e o menu continua agrupado', () => {
    const plano = organizarAcoes([{ id: 'lixeira', rotulo: 'Mover para a lixeira', grupo: 'avancado', perigo: true }]);
    expect(plano.primarias).toEqual([]);
    expect(nomes(plano.grupos[0].acoes)).toEqual(['lixeira']);
    const ficha = organizarAcoes(acoesDaFicha({ categoria: 'perfil' }));
    expect(ficha.grupos.map(grupo => grupo.rotulo)).toEqual(['Ações', 'Organização', 'Avançado']);
    expect(ficha.grupos[2].acoes.some(acao => acao.perigo)).toBe(true);
  });

  it('a barra da tela inicial é buscar, adicionar e explorar', () => {
    expect(nomes(organizarAcoes(acoesDaTelaInicial()).primarias)).toEqual(['buscar', 'adicionar', 'explorar']);
  });

  it('o "⋯" do início agrupa o resto em Ações e Avançado, sem perder nada', () => {
    const plano = organizarAcoes(acoesDaTelaInicial());
    const naBarra = nomes(plano.primarias);
    const noMenu = plano.grupos.flatMap(grupo => nomes(grupo.acoes));
    // Oito ações planejadas: três na barra, cinco no menu — nenhuma sumiu.
    expect([...naBarra, ...noMenu].sort()).toEqual(nomes(acoesDaTelaInicial()).sort());
    expect(plano.grupos.map(grupo => grupo.rotulo)).toEqual(['Ações', 'Avançado']);
    expect(noMenu).toEqual(['surpresa', 'momentos', 'ferramentas', 'saude', 'ajustes']);
  });

  it('toda ação do catálogo tem ícone e um rótulo legível', () => {
    for (const acao of [...acoesDaFicha({ categoria: 'midia' }), ...acoesDaTelaInicial()]) {
      expect(acao.rotulo.length, acao.id).toBeGreaterThan(2);
      expect(iconeDaAcao(acao.id), `ação sem ícone: ${acao.id}`).toBeTruthy();
    }
  });
});

describe('barra de ações e menu "⋯"', () => {
  it('a barra mostra só o plano; o resto abre no "⋯" agrupado', async () => {
    const escolhidas: string[] = [];
    const plano = organizarAcoes(acoesDaFicha({ categoria: 'midia' }));
    render(<BarraDeAcoes plano={plano} aoEscolher={id => escolhidas.push(id)} iconeDe={iconeDaAcao} titulo="Mais ações" />);

    expect(screen.getByRole('button', { name: /Editar ficha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar foto/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Duplicar ficha/ })).toBeNull();

    await act(async () => { screen.getByRole('button', { name: /Mais ações/ }).click(); });
    expect(screen.getByText('Organização')).toBeInTheDocument();
    expect(screen.getByText('Avançado')).toBeInTheDocument();
    await act(async () => { screen.getByRole('menuitem', { name: /Duplicar ficha/ }).click(); });
    expect(escolhidas).toEqual(['duplicar']);
    // e o painel fecha depois da escolha
    expect(screen.queryByRole('menuitem', { name: /Duplicar ficha/ })).toBeNull();
  });

  it('o menu não aparece quando não sobrou nada', () => {
    render(<MenuMais grupos={[{ id: 'agora', rotulo: 'Ações', acoes: [] }]} aoEscolher={() => undefined} />);
    expect(document.querySelector('.menu-mais')).toBeNull();
  });
});

describe('modo foco', () => {
  const limpar = () => {
    document.documentElement.classList.remove('foco');
    localStorage.removeItem(CHAVE_DO_FOCO);
  };
  afterEach(limpar);

  it('liga, desliga e é lembrado entre sessões', () => {
    expect(lerModoFoco()).toBe(false);
    aplicarModoFoco(true);
    expect(document.documentElement.classList.contains('foco')).toBe(true);
    aplicarModoFoco(false);
    expect(document.documentElement.classList.contains('foco')).toBe(false);
  });

  function Botao() {
    const foco = useModoFoco();
    return <button onClick={foco.alternar}>{foco.foco ? 'Sair do foco' : 'Entrar no foco'}</button>;
  }

  it('o hook escreve a classe no html e grava a preferência', async () => {
    const user = userEvent.setup();
    render(<Botao />);
    await user.click(screen.getByRole('button', { name: 'Entrar no foco' }));
    expect(document.documentElement.classList.contains('foco')).toBe(true);
    expect(localStorage.getItem(CHAVE_DO_FOCO)).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Sair do foco' }));
    expect(document.documentElement.classList.contains('foco')).toBe(false);
    expect(localStorage.getItem(CHAVE_DO_FOCO)).toBeNull();
  });
});
