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
import { familiaDoCabelo, corDaPele, corDoCabelo, roupaDe } from '../src/features/corpo/aparencia';
import { MATERIAIS, malhaDaPessoa, type Malha } from '../src/features/corpo/malha';
import { paletaDe, pintarFigura } from '../src/features/corpo/pintura';
import { CABELO_TIPO_OPTIONS } from '../src/types';
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
    const bunduda = lerForma({ ...base, rating: { ...base.rating, bunda: 5 } }).proporcoes;
    // Peito e bunda são peças próprias do modelo: a nota vira o tamanho delas.
    expect(peituda.seios).toBeGreaterThan(neutra.seios);
    expect(bunduda.gluteos).toBeGreaterThan(neutra.gluteos);
    expect(quadriluda.quadril).toBeGreaterThan(neutra.quadril);
    expect(cabeluda.cabeloVolume).toBeGreaterThan(neutra.cabeloVolume);
    // E nada vaza para o lado errado.
    expect(peituda.quadril).toBeCloseTo(neutra.quadril, 6);
    expect(bunduda.seios).toBeCloseTo(neutra.seios, 6);
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

describe('malha: o corpo como superfície', () => {
  const proporcoesDe = (mudancas: Partial<Person> = {}) => lerForma(ficha(mudancas)).proporcoes;

  it('a malha é fechada, orientada e sem número torto', () => {
    const malha = malhaDaPessoa(proporcoesDe());
    const vertices = malha.posicoes.length / 3;
    expect(vertices).toBeGreaterThan(2000);
    expect(malha.indices.length % 3).toBe(0);
    expect(malha.materiais.length).toBe(malha.indices.length / 3);
    for (let i = 0; i < malha.posicoes.length; i++) expect(Number.isFinite(malha.posicoes[i])).toBe(true);
    for (let i = 0; i < malha.indices.length; i++) expect(malha.indices[i]).toBeLessThan(vertices);
    // Normais unitárias: é delas que sai a luz, e normal torta é mancha na pele.
    for (let i = 0; i < vertices; i++) {
      const comprimento = Math.hypot(malha.normais[i * 3], malha.normais[i * 3 + 1], malha.normais[i * 3 + 2]);
      expect(comprimento).toBeCloseTo(1, 3);
    }
    // Todo material é um dos conhecidos.
    for (const codigo of malha.materiais) expect(codigo).toBeLessThan(MATERIAIS.length);
    // E a malha deixa claro qual é a altura da figura.
    expect(malha.altura).toBeGreaterThan(1.6);
    expect(malha.altura).toBeLessThan(1.72);
  });

  it('a mesma ficha dá sempre a mesma malha', () => {
    const a = malhaDaPessoa(proporcoesDe());
    const b = malhaDaPessoa(proporcoesDe());
    expect(Array.from(a.posicoes.slice(0, 300))).toEqual(Array.from(b.posicoes.slice(0, 300)));
    expect(a.altura).toBe(b.altura);
  });

  it('a altura declarada manda no tamanho: 1,50 m desenha menor que 1,90 m', () => {
    const baixa = malhaDaPessoa(proporcoesDe({ altura: '1,50 m' }));
    const alta = malhaDaPessoa(proporcoesDe({ altura: '1,90 m' }));
    expect(alta.altura - baixa.altura).toBeGreaterThan(0.3);
  });

  it('as normais apontam para fora: a frente do tronco olha para a câmera', () => {
    const malha = malhaDaPessoa(proporcoesDe());
    // Um vértice bem na frente do peito: a normal dele precisa ter z positivo.
    let melhor = -1, melhorZ = -Infinity;
    for (let i = 0; i < malha.posicoes.length / 3; i++) {
      const y = malha.posicoes[i * 3 + 1], z = malha.posicoes[i * 3 + 2];
      if (y > 0.7 * 1.7 && y < 0.76 * 1.7 && z > melhorZ) { melhorZ = z; melhor = i; }
    }
    expect(melhor).toBeGreaterThanOrEqual(0);
    expect(malha.normais[melhor * 3 + 2]).toBeGreaterThan(0.2);
  });

  it('o peito cresce para a frente, e não para os lados', () => {
    const comPeito = malhaDaPessoa(proporcoesDe({ rating: { ...ficha().rating, peitos: 5 } }));
    const semPeito = malhaDaPessoa(proporcoesDe({ rating: { ...ficha().rating, peitos: 1 } }));
    const frenteDe = (malha: Malha) => {
      let z = -Infinity, x = 0;
      for (let i = 0; i < malha.posicoes.length / 3; i++) {
        const y = malha.posicoes[i * 3 + 1];
        if (Math.abs(y - 0.73 * 1.7) < 0.02 && malha.posicoes[i * 3 + 2] > z) { z = malha.posicoes[i * 3 + 2]; x = Math.abs(malha.posicoes[i * 3]); }
      }
      return { z, x };
    };
    const cheio = frenteDe(comPeito), vazio = frenteDe(semPeito);
    // O peito empurra a frente; a largura do corpo mal muda.
    expect(cheio.z - vazio.z).toBeGreaterThan(0.012);
    expect(Math.abs(cheio.x - vazio.x)).toBeLessThan(0.05);
  });

  it('a bunda cresce para trás, na altura do quadril', () => {
    const comBunda = malhaDaPessoa(proporcoesDe({ rating: { ...ficha().rating, bunda: 5 } }));
    const semBunda = malhaDaPessoa(proporcoesDe({ rating: { ...ficha().rating, bunda: 1 } }));
    const atrasDe = (malha: Malha) => {
      let z = Infinity;
      for (let i = 0; i < malha.posicoes.length / 3; i++) {
        const y = malha.posicoes[i * 3 + 1];
        if (Math.abs(y - 0.53 * 1.7) < 0.03 && malha.posicoes[i * 3 + 2] < z) z = malha.posicoes[i * 3 + 2];
      }
      return z;
    };
    expect(atrasDe(semBunda) - atrasDe(comBunda)).toBeGreaterThan(0.012);
  });

  it('a roupa é decidida por região: manga, barra, saia e bota', () => {
    /** Quantos triângulos da malha são daquele material. */
    const contaMaterial = (malha: Malha, material: string) =>
      Array.from(malha.materiais).filter(codigo => codigo === MATERIAIS.indexOf(material)).length;
    /** Onde termina, em altura, o tecido de baixo (barra da calça ou da saia). */
    const fimDoTecido = (malha: Malha) => {
      let menor = Infinity;
      for (let t = 0; t < malha.materiais.length; t++) {
        if (malha.materiais[t] !== MATERIAIS.indexOf('baixo')) continue;
        for (const indice of [malha.indices[t * 3], malha.indices[t * 3 + 1], malha.indices[t * 3 + 2]]) {
          menor = Math.min(menor, malha.posicoes[indice * 3 + 1]);
        }
      }
      return menor;
    };
    // Social: manga comprida — muito tecido de blusa, pouco ombro de pele.
    const social = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'social' }));
    const esportivo = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'esportivo' }));
    expect(contaMaterial(social, 'topo')).toBeGreaterThan(contaMaterial(esportivo, 'topo'));
    // Romântico: saia — o tecido de baixo termina no meio da perna; a calça
    // casual desce até o tornozelo.
    const romantico = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'romântico' }));
    const calca = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'casual' }));
    expect(contaMaterial(calca, 'baixo')).toBeGreaterThan(contaMaterial(romantico, 'baixo'));
    expect(fimDoTecido(calca)).toBeLessThan(fimDoTecido(romantico) - 0.2);
    // Alternativo: bota — sapato subindo pelo tornozelo.
    const botas = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'alternativo' }));
    const tenis = malhaDaPessoa(proporcoesDe({ estiloRoupa: 'esportivo' }));
    expect(contaMaterial(botas, 'sapato')).toBeGreaterThan(contaMaterial(tenis, 'sapato'));
  });

  it('o cabelo muda com o tipo, e todo tipo cobre a cabeça', () => {
    const cabeloDe = (tipo: string) => {
      const malha = malhaDaPessoa(proporcoesDe({ cabeloTipo: tipo }));
      let triangulos = 0, maisBaixo = Infinity, maisAlto = -Infinity, maisLargo = 0, atras = 0;
      for (let t = 0; t < malha.materiais.length; t++) {
        if (malha.materiais[t] !== MATERIAIS.indexOf('cabelo')) continue;
        triangulos++;
        for (const indice of [malha.indices[t * 3], malha.indices[t * 3 + 1], malha.indices[t * 3 + 2]]) {
          const x = malha.posicoes[indice * 3], y = malha.posicoes[indice * 3 + 1], z = malha.posicoes[indice * 3 + 2];
          maisBaixo = Math.min(maisBaixo, y);
          maisAlto = Math.max(maisAlto, y);
          maisLargo = Math.max(maisLargo, Math.abs(x));
          if (z < -0.01) atras++;
        }
      }
      return { triangulos, maisBaixo, maisAlto, maisLargo, atras };
    };
    const pixie = cabeloDe('pixie');
    const longo = cabeloDe('longo');
    const afro = cabeloDe('afro');
    const moicano = cabeloDe('moicano');
    // Nenhum penteado deixa a cabeça careca.
    for (const medida of [pixie, longo, afro, moicano]) expect(medida.triangulos).toBeGreaterThan(120);
    // O longo desce muito abaixo do pixie.
    expect(pixie.maisBaixo - longo.maisBaixo).toBeGreaterThan(0.2);
    // O afro cresce em volta: a massa é mais larga e mais alta que um pixie.
    expect(afro.maisLargo).toBeGreaterThan(pixie.maisLargo + 0.02);
    expect(afro.maisAlto).toBeGreaterThan(pixie.maisAlto + 0.03);
    // Cabelo de verdade fica atrás do corpo, não na frente do rosto.
    expect(longo.atras).toBeGreaterThan(0);
  });

  it('a pele, a cor do cabelo e a roupa saem dos campos da ficha', () => {
    expect(corDaPele(ficha({ pele: 'branca' }))).not.toBe(corDaPele(ficha({ pele: 'negra' })));
    expect(corDoCabelo(ficha({ cabeloCor: 'preto' }))).not.toBe(corDoCabelo(ficha({ cabeloCor: 'loiro' })));
    expect(corDoCabelo(ficha({ cabeloCor: 'colorido', cabeloCorCustom: '#12ff88' }))).toBe('#12ff88');
    expect(roupaDe(ficha({ estiloRoupa: 'esportivo' }), '#fff').topo).not.toBe(roupaDe(ficha({ estiloRoupa: 'social' }), '#fff').topo);
    // O estilo antigo, sem acento, ainda acha a paleta certa.
    expect(roupaDe(ficha({ estiloRoupa: 'romantico' }), '#fff')).toEqual(roupaDe(ficha({ estiloRoupa: 'romântico' }), '#fff'));
  });
});

describe('pintura: a malha vira pixels', () => {
  const proporcoes = lerForma(ficha()).proporcoes;
  const malha = malhaDaPessoa(proporcoes, { detalhe: 0.6 });
  const paleta = paletaDe({ pele: '#c99a72', cabelo: '#3a2a1e', roupa: { topo: '#6f8fbf', baixo: '#3f4a63', sapato: '#efe9e4' } });

  it('desenha a figura no tamanho pedido, com fundo transparente', () => {
    const figura = pintarFigura(malha, { yaw: -30, pitch: 7, largura: 120, altura: 200, paleta, amostras: 1 });
    expect(figura.largura).toBe(120);
    expect(figura.altura).toBe(200);
    expect(figura.dados.length).toBe(120 * 200 * 4);
    let opacos = 0, transparentes = 0;
    for (let i = 3; i < figura.dados.length; i += 4) (figura.dados[i] > 200 ? opacos++ : transparentes++);
    // A figura ocupa uma parte do quadro: nem vazio, nem um bloco de tinta.
    expect(opacos).toBeGreaterThan(120 * 200 * 0.06);
    expect(opacos).toBeLessThan(120 * 200 * 0.75);
    expect(transparentes).toBeGreaterThan(0);
  });

  it('a luz dá volume: a mesma peça tem tons diferentes pelo corpo', () => {
    const figura = pintarFigura(malha, { yaw: 0, pitch: 5, largura: 140, altura: 220, paleta, amostras: 1 });
    const cores = new Set<number>();
    for (let i = 0; i < figura.dados.length; i += 4) {
      if (figura.dados[i + 3] < 250) continue;
      cores.add((figura.dados[i] << 16) | (figura.dados[i + 1] << 8) | figura.dados[i + 2]);
    }
    expect(cores.size).toBeGreaterThan(150);
  });

  it('girar muda o desenho, e a mesma vista dá sempre a mesma imagem', () => {
    const frente = pintarFigura(malha, { yaw: 0, pitch: 5, largura: 100, altura: 160, paleta, amostras: 1 });
    const lado = pintarFigura(malha, { yaw: -90, pitch: 5, largura: 100, altura: 160, paleta, amostras: 1 });
    const frenteDeNovo = pintarFigura(malha, { yaw: 0, pitch: 5, largura: 100, altura: 160, paleta, amostras: 1 });
    let iguais = 0, diferentes = 0;
    for (let i = 0; i < frente.dados.length; i += 4) {
      if (frente.dados[i + 3] !== lado.dados[i + 3]) diferentes++;
      if (frente.dados[i] === frenteDeNovo.dados[i] && frente.dados[i + 3] === frenteDeNovo.dados[i + 3]) iguais++;
    }
    expect(diferentes).toBeGreaterThan(300);
    expect(iguais).toBe(frente.dados.length / 4);
  });

  it('a sombra de contato aparece embaixo da figura, e some quando desligada', () => {
    const semSombra = pintarFigura(malha, { yaw: 0, pitch: 5, largura: 120, altura: 190, paleta, amostras: 1, sombra: false });
    const comSombra = pintarFigura(malha, { yaw: 0, pitch: 5, largura: 120, altura: 190, paleta, amostras: 1, sombra: true });
    // A figura é opaca; a sombra é semitransparente. Contar o que está no meio
    // termo mede só a sombra, sem depender de onde a figura foi enquadrada.
    const meioTermo = (figura: typeof semSombra) => {
      let n = 0;
      for (let i = 3; i < figura.dados.length; i += 4) if (figura.dados[i] > 12 && figura.dados[i] < 200) n++;
      return n;
    };
    expect(meioTermo(comSombra)).toBeGreaterThan(meioTermo(semSombra) + 200);
  });

  it('as vistas oferecidas são três, uma de cada lado e uma de frente', () => {
    expect(VISTAS.map(v => v.id)).toEqual(['frente', 'tres-quartos', 'lado']);
    expect(VISTAS[0].yaw).toBe(0);
    expect(Math.abs(VISTAS[2].yaw)).toBeGreaterThan(80);
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

  it('o botão de silhueta tira a cor da ficha e deixa só a forma', async () => {
    const user = userEvent.setup();
    const pessoa = ficha({ altura: '1,70 m', estiloRoupa: 'streetwear', cabeloTipo: 'afro', pele: 'negra' });
    renderRTL(<CatalogProvider><FichaDeTeste pessoa={pessoa} /></CatalogProvider>);
    const secao = document.querySelector('.figura-3d') as HTMLElement;
    const botao = secao.querySelector('.figura-silhueta') as HTMLButtonElement;
    expect(botao).toBeTruthy();
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.textContent).toContain('Ver silhueta');
    await user.click(botao);
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.textContent).toContain('Cores da ficha');
    // O aviso continua dizendo de onde a figura vem — cor não é forma.
    expect(secao.querySelector('.figura-aviso')?.textContent).toContain('tom de pele');
    expect(secao.querySelector('.figura-aviso')?.textContent).toContain('estilo de roupa');
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
