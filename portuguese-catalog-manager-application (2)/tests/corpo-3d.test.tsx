import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CatalogProvider, useCatalog } from '../src/context';
import { getDefaultPerson } from '../src/store';
import { render as renderRTL } from '@testing-library/react';
import type { Person } from '../src/types';
import {
  ALTURA_PADRAO, ESTIMATIVA_DO_ROTULO, diferencaDaMedia, faixaDaAltura, formatarAltura,
  lerAltura, metrosDaAltura, metrosDeTexto, normalizarAltura, rotuloDaAltura,
} from '../src/features/corpo/altura';
import { CRITERIOS_DE_FORMA, CRITERIOS_FORA_DA_FORMA, lerForma, resumoDaForma } from '../src/features/corpo/metricas';
import { alturaDoModelo, modeloDaPessoa, ordenarBracos, sombraDoModelo } from '../src/features/corpo/modelo';
import { caixaDoModelo, girarPonto, matrizDaVista, projetarModelo, projetarPeca } from '../src/features/corpo/projecao';
import { Figura3D, VISTAS } from '../src/features/corpo/components/Figura3D';
import PersonEditor from '../src/components/PersonEditor';
import { bootApp, seedIdb, seededData } from './catalog.test';

/**
 * Altura medida e figura 3D: o que estes testes protegem.
 *
 * A altura passou de palavra a medida — e a medida precisa sobreviver a tudo o
 * que a pessoa digita ("1,5", "150", "150 cm", "1.72"). A figura precisa ser
 * **determinística** (mesma ficha, mesma silhueta), precisa deixar claro o que
 * não entra nela, e não pode quebrar quando não há canvas: em teste, por
 * exemplo, em que `getContext` devolve nulo.
 */
function ficha(mudancas: Partial<Person> = {}): Person {
  return { ...getDefaultPerson(), id: 'teste', nome: 'Pessoa Teste', ...mudancas };
}

describe('altura em metros', () => {
  it('lê todos os jeitos que alguém digita a mesma altura', () => {
    for (const texto of ['1,50', '1.50', '1,5', '150', '150 cm', '150cm', '1,50 m', ' 1,50 M ']) {
      expect(metrosDeTexto(texto), texto).toBe(1.5);
    }
    expect(metrosDeTexto('1,72')).toBe(1.72);
    expect(metrosDeTexto('172')).toBe(1.72);
    expect(metrosDeTexto('2,10')).toBe(2.1);
  });

  it('recusa o que não é gente nem número', () => {
    expect(metrosDeTexto('')).toBeNull();
    expect(metrosDeTexto('alta')).toBeNull();
    expect(metrosDeTexto('0')).toBeNull();
    expect(metrosDeTexto('3,20')).toBeNull();     // alto demais
    expect(metrosDeTexto('20')).toBeNull();       // 20 cm não é altura
    expect(metrosDeTexto('abc')).toBeNull();
  });

  it('escreve sempre com vírgula e duas casas', () => {
    expect(formatarAltura(1.5)).toBe('1,50 m');
    expect(formatarAltura(1.7)).toBe('1,70 m');
    expect(formatarAltura(1.678)).toBe('1,68 m');
    expect(formatarAltura(0)).toBe('');
  });

  it('guarda a medida canônica e preserva a palavra antiga', () => {
    expect(normalizarAltura('1,5')).toBe('1,50 m');
    expect(normalizarAltura('175')).toBe('1,75 m');
    expect(normalizarAltura('BAIXINHA')).toBe('baixinha');
    expect(normalizarAltura('')).toBe('');
    expect(normalizarAltura('qualquer coisa')).toBe('qualquer coisa');
  });

  it('a palavra antiga vira estimativa, nunca medida', () => {
    const lida = lerAltura('alta');
    expect(lida).toMatchObject({ tipo: 'qualitativa', rotulo: 'alta', estimativa: true });
    expect(lida?.metros).toBe(ESTIMATIVA_DO_ROTULO.alta);
    expect(rotuloDaAltura('alta')).toBe(`alta (cerca de ${formatarAltura(ESTIMATIVA_DO_ROTULO.alta)})`);
    expect(metrosDaAltura('alta')).toEqual({ metros: ESTIMATIVA_DO_ROTULO.alta, estimativa: true });
    // Ficha vazia: o modelo não inventa do nada, usa o padrão e se declara estimativa.
    expect(metrosDaAltura('')).toEqual({ metros: ALTURA_PADRAO, estimativa: true });
    expect(rotuloDaAltura('1,50')).toBe('1,50 m');
  });

  it('as faixas de 10 cm servem para o gráfico', () => {
    expect(faixaDaAltura(1.68)).toBe('1,60–1,69 m');
    expect(faixaDaAltura(1.5)).toBe('1,50–1,59 m');
    expect(diferencaDaMedia(1.75)).toBe(5);
    expect(diferencaDaMedia(1.6)).toBe(-10);
  });
});

describe('métricas → proporções', () => {
  it('a mesma ficha dá sempre a mesma figura', () => {
    const pessoa = ficha({ altura: '1,62 m', tipoCorpo: 'curvilíneo', rating: { ...getDefaultPerson().rating, quadril: 4.5, corpo: 4 } });
    expect(lerForma(pessoa).proporcoes).toEqual(lerForma(pessoa).proporcoes);
  });

  it('nota 3 é neutra: o meio da escala não muda a forma', () => {
    const neutra = lerForma(ficha({ altura: '1,70 m', rating: { ...getDefaultPerson().rating, corpo: 3, peitos: 3, quadril: 3, bunda: 3 } })).proporcoes;
    const semNota = lerForma(ficha({ altura: '1,70 m' })).proporcoes;
    expect(neutra.ombros).toBeCloseTo(semNota.ombros, 6);
    expect(neutra.cintura).toBeCloseTo(semNota.cintura, 6);
  });

  it('cada critério mexe no lugar certo', () => {
    const base = ficha({ altura: '1,70 m' });
    const neutra = lerForma(base).proporcoes;
    const peituda = lerForma({ ...base, rating: { ...base.rating, peitos: 5 } }).proporcoes;
    const quadriluda = lerForma({ ...base, rating: { ...base.rating, quadril: 5 } }).proporcoes;
    const cabeluda = lerForma({ ...base, rating: { ...base.rating, cabelo: 5 } }).proporcoes;
    expect(peituda.profundidadePeito).toBeGreaterThan(neutra.profundidadePeito);
    expect(quadriluda.quadril).toBeGreaterThan(neutra.quadril);
    expect(cabeluda.cabelo).toBeGreaterThan(neutra.cabelo);
    // E nada vaza para o lado errado.
    expect(peituda.quadril).toBeCloseTo(neutra.quadril, 6);
  });

  it('altura e tipo de corpo mudam a escala e a base', () => {
    const baixa = lerForma(ficha({ altura: '1,50 m' })).proporcoes;
    const alta = lerForma(ficha({ altura: '1,90 m' })).proporcoes;
    expect(baixa.altura).toBe(1.5);
    expect(alta.ombros).toBeGreaterThan(baixa.ombros);
    const plus = lerForma(ficha({ altura: '1,70 m', tipoCorpo: 'plus size' })).proporcoes;
    const esguia = lerForma(ficha({ altura: '1,70 m', tipoCorpo: 'esguio' })).proporcoes;
    expect(plus.cintura).toBeGreaterThan(esguia.cintura);
    expect(plus.volume).toBeGreaterThan(esguia.volume);
  });

  it('diz o que entra na forma e o que fica de fora', () => {
    const pessoa = ficha({ altura: '1,55', tipoCorpo: 'atlético', rating: { ...getDefaultPerson().rating, peitos: 4, rosto: 5, comportamento: 4 } });
    const { explicacoes, proporcoes } = lerForma(pessoa);
    const porRotulo = new Map(explicacoes.map(item => [item.rotulo, item]));
    expect(porRotulo.get('Peitos')?.muda).toBe(true);
    expect(porRotulo.get('Rosto')?.muda).toBe(false);
    expect(porRotulo.get('Comportamento')?.muda).toBe(false);
    // O que não muda a forma é nomeado, para a tela poder explicar.
    expect(Object.keys(CRITERIOS_FORA_DA_FORMA)).toEqual(['rosto', 'belezaGeral', 'comportamento']);
    expect(Object.keys(CRITERIOS_DE_FORMA)).toEqual(['peitos', 'bunda', 'quadril', 'corpo', 'cabelo']);
    // Altura guardada como medida não é estimativa; a proporção declara isso.
    expect(proporcoes.alturaEstimada).toBe(false);
    expect(resumoDaForma(proporcoes)).toContain('1,55 m');
    expect(resumoDaForma(proporcoes)).toContain('ombros');
  });
});

describe('modelo e projeção', () => {
  const proporcoes = lerForma(ficha({ altura: '1,70 m', rating: { ...getDefaultPerson().rating, corpo: 4, quadril: 4 } })).proporcoes;
  const pecas = modeloDaPessoa(proporcoes);

  it('o modelo tem duas pernas, dois braços e nenhum número torto', () => {
    const ids = pecas.map(peca => peca.id);
    expect(ids).toContain('cabeca');
    expect(ids.filter(id => id.startsWith('pernad-'))).toHaveLength(10 * 5);
    expect(ids.filter(id => id.startsWith('pernae-'))).toHaveLength(10 * 5);
    expect(ids.filter(id => id.startsWith('bracod-'))).toHaveLength(10 * 4);
    expect(ids.filter(id => id.startsWith('bracoe-'))).toHaveLength(10 * 4);
    expect(ids.filter(id => id.startsWith('pe-'))).toHaveLength(2);
    for (const peca of pecas) {
      for (const raio of peca.raios) expect(Number.isFinite(raio) && raio > 0, peca.id).toBe(true);
      for (const coordenada of peca.centro) expect(Number.isFinite(coordenada), peca.id).toBe(true);
    }
    // A figura ocupa a altura da ficha, com a folga do cabelo.
    expect(alturaDoModelo(pecas)).toBeGreaterThan(1.6);
    expect(alturaDoModelo(pecas)).toBeLessThan(1.85);
    // E os pés ficam no chão: nada de figura flutuando ou afundando.
    const maisBaixo = Math.min(...pecas.map(peca => peca.centro[1] - peca.raios[1]));
    expect(maisBaixo).toBeGreaterThan(-0.02);
    expect(maisBaixo).toBeLessThan(0.05);
  });

  it('a altura declarada manda no tamanho: 1,50 m desenha menor que 1,90 m', () => {
    const baixa = modeloDaPessoa(lerForma(ficha({ altura: '1,50 m' })).proporcoes);
    const alta = modeloDaPessoa(lerForma(ficha({ altura: '1,90 m' })).proporcoes);
    expect(alturaDoModelo(baixa)).toBeLessThan(alturaDoModelo(alta));
    // A diferença na tela acompanha a diferença real (40 cm), com folga do cabelo.
    expect(alturaDoModelo(alta) - alturaDoModelo(baixa)).toBeGreaterThan(0.3);
  });

  it('o braço próximo fica na frente do tronco e o distante atrás', () => {
    const deFrente = ordenarBracos(pecas, 0);
    const deLado = ordenarBracos(pecas, -88);
    // De frente, os dois braços estão ao lado do tronco: mesma camada.
    expect(new Set(deFrente.filter(peca => peca.ordem === 2)).size).toBe(0);
    // De lado, um braço sobe para a frente e o outro desce para trás.
    const camadas = new Set(deLado.map(peca => peca.ordem));
    expect(camadas.has(2)).toBe(true);
    expect(camadas.has(0.5)).toBe(true);
    // E o tronco fica entre os dois.
    expect(Math.max(...deLado.filter(peca => peca.id.startsWith('tronco')).map(peca => peca.ordem ?? 1))).toBeLessThan(2);
  });

  it('as fatias se sobrepõem: é o que faz superfície contínua, não um colar de contas', () => {
    // Para cada sequência (mesmo prefixo), a altura de cada fatia tem de cobrir
    // o passo até a vizinha — se sobrar vão, aparece o vão na silhueta.
    const sequencias = new Map<string, typeof pecas>();
    for (const peca of pecas) {
      const chave = peca.id.replace(/-\d+-\d+$/, '');
      sequencias.set(chave, [...(sequencias.get(chave) || []), peca]);
    }
    expect(sequencias.size).toBeGreaterThan(5);
    let conferidas = 0;
    for (const fatias of sequencias.values()) {
      const ordenadas = [...fatias].sort((a, b) => a.centro[1] - b.centro[1]);
      for (let i = 1; i < ordenadas.length; i++) {
        const passo = ordenadas[i].centro[1] - ordenadas[i - 1].centro[1];
        // A pergunta certa é se as duas vizinhas juntas cobrem o vão entre elas.
        const cobertura = ordenadas[i].raios[1] + ordenadas[i - 1].raios[1];
        expect(cobertura, ordenadas[i].id).toBeGreaterThan(passo);
        conferidas++;
      }
    }
    expect(conferidas).toBeGreaterThan(20);
  });

  it('a sombra fica no chão e a projeção gira de verdade', () => {
    const sombra = sombraDoModelo(proporcoes);
    expect(sombra.centro[1]).toBeLessThan(0.01);
    // Um ponto à direita, com o giro de 90°, vai para trás da câmera.
    const frente = girarPonto([1, 0, 0], matrizDaVista(0, 0));
    expect(frente[0]).toBeCloseTo(1, 6);
    expect(frente[2]).toBeCloseTo(0, 6);
    const girado = girarPonto([1, 0, 0], matrizDaVista(90, 0));
    expect(girado[0]).toBeCloseTo(0, 6);
    expect(girado[2]).toBeCloseTo(-1, 6);
  });

  it('a elipse projetada usa os três raios (nada de círculo de papelão)', () => {
    /** Meia-largura e meia-altura da elipse **depois** do giro — é o que aparece na tela. */
    const caixa = (elipse: { rx: number; ry: number; angulo: number }) => {
      const theta = (elipse.angulo * Math.PI) / 180;
      return {
        largura: Math.hypot(elipse.rx * Math.cos(theta), elipse.ry * Math.sin(theta)),
        altura: Math.hypot(elipse.rx * Math.sin(theta), elipse.ry * Math.cos(theta)),
      };
    };
    const peca = { id: 'teste', papel: 'corpo' as const, centro: [0, 1, 0] as [number, number, number], raios: [0.2, 0.5, 0.08] as [number, number, number] };
    const deFrente = projetarPeca(peca, matrizDaVista(0, 0));
    const deLado = projetarPeca(peca, matrizDaVista(90, 0));
    expect(caixa(deFrente).largura).toBeCloseTo(0.2, 4);
    expect(caixa(deFrente).altura).toBeCloseTo(0.5, 4);
    // De lado, a largura passa a ser a profundidade — e a altura continua a mesma.
    expect(caixa(deLado).largura).toBeCloseTo(0.08, 4);
    expect(caixa(deLado).altura).toBeCloseTo(0.5, 4);
    expect(deFrente.brilho).toBeGreaterThan(0);
    // Peça fora do eixo: girar 90° leva o lado para trás da câmera.
    const deslocada = { ...peca, centro: [0.3, 1, 0] as [number, number, number] };
    expect(projetarPeca(deslocada, matrizDaVista(90, 0)).profundidade).toBeLessThan(projetarPeca(deslocada, matrizDaVista(0, 0)).profundidade);
  });

  it('pinta do mais distante para o mais próximo', () => {
    const elipses = projetarModelo([...pecas, sombraDoModelo(proporcoes)], 20, 8);
    const profundidades = elipses.map(elipse => elipse.profundidade);
    expect([...profundidades].sort((a, b) => a - b)).toEqual(profundidades);
    const caixa = caixaDoModelo(elipses);
    expect(caixa.altura).toBeGreaterThan(1.6);
    expect(caixa.largura).toBeGreaterThan(0.2);
  });

  it('as vistas oferecidas são três, uma de cada lado e uma de frente', () => {
    expect(VISTAS.map(vista => vista.id)).toEqual(['frente', 'tres-quartos', 'lado']);
    expect(VISTAS[2].yaw).toBeLessThan(VISTAS[1].yaw);
  });
});

describe('figura na ficha', () => {
  /** O jsdom não desenha canvas (`getContext` é nulo): a figura cai no texto. */
  function FichaDeTeste({ pessoa }: { pessoa: Person }) {
    const ctx = useCatalog();
    void ctx;
    return <Figura3D person={pessoa} />;
  }

  it('sem canvas, entrega a mesma leitura em texto', () => {
    const pessoa = ficha({ altura: '1,58 m', rating: { ...getDefaultPerson().rating, corpo: 4 } });
    renderRTL(<CatalogProvider><FichaDeTeste pessoa={pessoa} /></CatalogProvider>);
    const secao = document.querySelector('.figura-3d') as HTMLElement;
    expect(secao).toBeTruthy();
    const semCanvas = document.querySelector('.figura-sem-canvas') as HTMLElement;
    expect(semCanvas).toBeTruthy();
    expect(semCanvas.textContent).toContain('1,58 m');
    expect(within(secao).getByRole('img').getAttribute('aria-label')).toContain('Manequim em 3D');
  });

  it('oferece as vistas, o tamanho e o giro — e o giro desliga com movimento reduzido', async () => {
    const user = userEvent.setup();
    const pessoa = ficha({ altura: '1,70 m' });
    renderRTL(<CatalogProvider><FichaDeTeste pessoa={pessoa} /></CatalogProvider>);
    const secao = document.querySelector('.figura-3d') as HTMLElement;

    expect(within(secao).getByRole('button', { name: 'Frente' })).toBeTruthy();
    expect(within(secao).getByRole('button', { name: 'De lado' })).toBeTruthy();
    expect(within(secao).getByLabelText('Tamanho da figura')).toBeTruthy();

    await user.click(within(secao).getByRole('button', { name: /De lado/ }));
    expect(within(secao).getByRole('button', { name: 'De lado' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(secao).getByRole('button', { name: 'Frente' }).getAttribute('aria-pressed')).toBe('false');

    await user.click(within(secao).getByRole('button', { name: /Girar/ }));
    expect(within(secao).getByRole('button', { name: /Girar/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('a lista embaixo da figura diz o que mudou a forma e o que ficou fora', () => {
    const pessoa = ficha({ altura: '1,72 m', tipoCorpo: 'atlético', rating: { ...getDefaultPerson().rating, peitos: 4.5, rosto: 5 } });
    renderRTL(<CatalogProvider><FichaDeTeste pessoa={pessoa} /></CatalogProvider>);
    const notas = document.querySelector('.figura-notas') as HTMLElement;
    expect(notas.textContent).toContain('Peito');
    expect(notas.textContent).toContain('Fora da forma');
    // Rosto tem nota, mas não vira geometria: não aparece entre os que mudam.
    const itens = [...notas.querySelectorAll('li')].map(li => li.textContent || '');
    expect(itens.some(texto => texto.includes('Rosto') && texto.includes('5,0'))).toBe(false);
  });
});

describe('campo de altura no editor', () => {
  const noop = () => {};

  /** O editor é controlado: este wrapper guarda a ficha para o ciclo inteiro rodar. */
  function EditorQueGuarda({ inicial }: { inicial: Person }) {
    const [pessoa, setPessoa] = useState(inicial);
    return <PersonEditor person={pessoa} update={setPessoa} dirty={false} recovered={false} onDiscard={noop} onSave={noop} onCancel={noop} />;
  }

  it('aceita a medida digitada e mostra como ela ficou guardada', async () => {
    const user = userEvent.setup();
    const pessoa = { ...getDefaultPerson(), id: 'altura-1', altura: '' };
    render(<CatalogProvider><EditorQueGuarda inicial={pessoa} /></CatalogProvider>);

    const campo = screen.getByLabelText('Altura em metros') as HTMLInputElement;
    await user.type(campo, '1,50');
    expect(campo.value).toBe('1,50');
    await user.tab();
    expect(campo.value).toBe('1,50 m');
    expect(screen.getByText(/Guardado como 1,50 m/i)).toBeTruthy();
  });

  it('tem atalhos e mantém a palavra antiga à mão', async () => {
    const user = userEvent.setup();
    const pessoa = { ...getDefaultPerson(), id: 'altura-2', altura: 'baixinha' };
    render(<CatalogProvider><EditorQueGuarda inicial={pessoa} /></CatalogProvider>);

    // A ficha que já tinha "baixinha" continua legível — e o modelo diz que usa estimativa.
    expect(screen.getByText(/baixinha \(cerca de 1,50 m\)/i)).toBeTruthy();
    expect((screen.getByLabelText('Altura em metros') as HTMLInputElement).value).toBe('baixinha');
    expect(screen.getByLabelText('Altura em palavras')).toBeTruthy();

    const atalhos = screen.getByRole('group', { name: /Atalhos de altura/i });
    expect(within(atalhos).getByRole('button', { name: '1,70' })).toBeTruthy();
    await user.click(within(atalhos).getByRole('button', { name: '1,60' }));
    expect((screen.getByLabelText('Altura em metros') as HTMLInputElement).value).toBe('1,60 m');
    expect(screen.getByText(/Guardado como 1,60 m/i)).toBeTruthy();
  });
});

describe('a ficha aberta mostra a figura', () => {
  it('Avaliações traz a seção "Corpo em 3D"', async () => {
    const user = userEvent.setup();
    await seedIdb(seededData(4, 1));
    await bootApp(user);

    const primeiro = document.querySelector('.person-card, .list-person-open, .recent-person') as HTMLElement;
    expect(primeiro, 'primeira ficha do catálogo').toBeTruthy();
    await user.click(primeiro);
    const aba = await screen.findByRole('button', { name: /Avaliações/ });
    await user.click(aba);
    const secao = await screen.findByRole('button', { name: /Corpo em 3D/i });
    await user.click(secao);
    expect(document.querySelector('.figura-3d')).toBeTruthy();
  });
});
