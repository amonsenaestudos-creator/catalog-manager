# Melhorias para o Catalog — diagnóstico e plano

Leitura do projeto em setembro de 2026, feita a partir do código (não do README).
A pergunta era: **o que falta para o Catalog ficar bem mais completo?**

Resposta curta: de funcionalidade de catálogo ele já está cheio — 29 telas, conversa
simulada com IA opcional, galeria, tierlists, backups, perfis, tema, atalhos. O que
faltava era o que transforma um conjunto de telas em **produto confiável**: saber se os
dados estão inteiros, funcionar sem internet, ser instalável, ter rede de segurança
contra perda de dados e ter verificação automática a cada mudança.

Este documento está em três partes: (1) o retrato do que existe, (2) as melhorias
priorizadas, (3) o que já foi implementado nesta rodada.

---

## 1. Retrato atual (medido, não estimado)

| Dimensão | Situação |
| --- | --- |
| Código | ~33.000 linhas em `src` e `tests`; 118 arquivos em `src` |
| Testes | 35 arquivos, 498 testes, suíte completa em ~3,6 min (antes da rodada 1: 30 arquivos, 445 testes, 2 falhando) — a queda em relação a 503 vem da limpeza da rodada 4, que apagou os testes do recurso retirado |
| Verificação | `tsc --noEmit` limpo; build de produção em ~7 s; CI a cada PR *(novo)* |
| Build | `dist/index.html` **2.419 kB** (990 kB gzip) — era 3.520 kB (1.847 kB) antes da rodada 2 |
| Repositório | **193 arquivos versionados** — era 8.454, dos quais 8.282 eram `node_modules` (~226 MB) e 7 eram `dist`. Os ~28 a mais que 165 são as telas e testes das rodadas 3 e 4 |
| Maior dívida declarada | `repertorio.ts` 2.639 linhas, `dialogue.ts` 1.847 (era 3.050), `toolkit.ts` 1.695, `ChatSimulator.tsx` 669 |
| Auditoria npm | 3 alertas pendentes (1 baixo, 1 moderado, 1 alto), como o próprio README registra |
| Automação | nenhum CI, nenhum lint, nenhuma cobertura medida |

Dois testes estavam vermelhos quando a leitura começou (aniversário sensível ao relógio
real e o item “Pacotes” do menu). Ambos foram corrigidos — ver seção 3.

---

## 2. Melhorias priorizadas

Cada item traz **o problema → a solução → onde mexer → esforço**. Esforço: P (uma
tarde), M (um a dois dias), G (uma semana ou mais).

### Prioridade 0 — confiança no que já existe

| # | Melhoria | Problema que resolve | Onde | Esforço |
| --- | --- | --- | --- | --- |
| 0.1 | **CI a cada PR** *(feito)* | Nada garante que `main` compila e passa nos 469 testes | `.github/workflows/ci.yml` | P |
| 0.2 | **Saúde do catálogo** *(feito)* | Ficha pela metade, ponteiro quebrado, foto repetida, lixeira e backup passavam despercebidos | `src/features/health/` | M |
| 0.3 | **Aplicativo instalável e offline** *(feito)* | Sem internet o app não abria; não dava para instalar no celular | `public/sw.js`, `public/manifest.webmanifest`, `src/lib/pwa.ts` | M |
| 0.4 | ~~**Tirar `node_modules` e `dist` do Git**~~ ✅ **feito** (rodada 2) | 98% dos arquivos do repositório eram dependências; clone de 226 MB, diffs ilegíveis, revisão de PR inviável | `.gitignore` + `git rm -r --cached` | P |
| 0.5 | **Lint e formatação** | Convenções dependem de disciplina; não há `eslint.config.js` apesar de comentários `eslint-disable` espalhados | `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` | P |
| 0.6 | **Cobertura visível** | Não se sabe quais caminhos críticos não têm teste | `vitest --coverage` + limite mínimo por pasta | P |

O item 0.4 foi feito na rodada 2 (`git rm -r --cached`), e o repositório passou de
8.454 para 165 arquivos versionados. O histórico preserva as cópias antigas.

O arquivo `.gitignore` já está no lugar, então nada volta por engano. Quem clona passa a
rodar `npm install` — que hoje leva 3 segundos com o cache do npm.

Enquanto isso não acontece, o problema não é só tamanho: `npm install` enxerga o
`node_modules` versionado como “já instalado” e **não recria os atalhos de `node_modules/.bin`,
que chegam do Git sem permissão de execução** — foi exatamente assim que o primeiro run do CI
morreu com `tsc: Permission denied`. Por isso o CI usa `npm ci`, que apaga e reinstala a árvore
a partir do `package-lock.json`. O item 0.4 resolve a causa em vez do sintoma.

### Prioridade 1 — o que evita perda de dados e sustenta o crescimento

| # | Melhoria | Problema que resolve | Onde | Esforço |
| --- | --- | --- | --- | --- |
| 1.1 | **Backup automático em pasta local** (File System Access API) | O IndexedDB é a única cópia; limpar o navegador apaga tudo. Com um `FileSystemDirectoryHandle` guardado, o app grava um JSON sozinho a cada N alterações | `src/lib/storage.ts` + aba Dados em Ajustes | M |
| 1.2 | **Backup criptografado com senha** (WebCrypto AES-GCM + PBKDF2) | O backup exportado guarda senha e PIN **em texto claro** — o README avisa, mas nada impede | `src/lib/export.ts`, `Settings.tsx` | M |
| 1.3 | **Cofre criptografado de verdade** | O PIN hoje é bloqueio de interface; as fotos do cofre ficam legíveis no IndexedDB | `src/lib/storage.ts`, `MySpace.tsx` | G |
| 1.4 | **Verificação do backup na importação** (checksum + contagens antes/depois) | Importar arquivo truncado hoje só se descobre depois | `src/lib/pack.ts`, `Settings.tsx` | P |
| 1.5 | **Importar CSV/vCard de contatos** | Entrada em massa ainda é uma ficha por vez (ou pacote vindo de outro Catalog) | `src/features/people/` | M |
| 1.6 | **Miniaturas separadas do original** | Foto em base64 inteira no JSON engorda backup e memória; uma versão 320 px para grades e a original só no visor resolve | `src/store.ts` (`readImage`), galeria | M |
| 1.7 | **Testes de ponta a ponta** (Playwright: entrar, criar ficha, exportar, importar, offline) | Os testes atuais cobrem unidade e integração em jsdom; nenhum navegador real, nenhum PWA | `e2e/` + passo no CI | M |

### Prioridade 2 — profundidade de produto

| # | Melhoria | Por que vale | Onde | Esforço |
| --- | --- | --- | --- | --- |
| 2.1 | **Grafo de relações navegável** | `vinculos` já existe em cada ficha; falta a tela que mostra a teia (quem conhece quem, famílias, pontes) | `src/features/relationships/` | M |
| 2.2 | **Dossiê da relação por pessoa** | Reunir linha do tempo, memórias do chat, lembretes, metas e fotos num só lugar — hoje está espalhado em sete telas | `src/features/people/` | M |
| 2.3 | **Comparação de três ou mais fichas** | Hoje o comparador é sempre um par | `CompareModal.tsx` | P |
| 2.4 | **Filtros salvos compostos + busca por linguagem simples** (“sem foto, igreja, nota acima de 4”) | O motor de filtro já suporta as condições; falta a sintaxe e o construtor | `src/lib/` + `Catalog.tsx` | M |
| 2.5 | **Voz no chat** (Web Speech API: ditar e ouvir) | O motor de conversa é o coração do app; voz aproxima do uso real no celular | `src/lib/voz.ts` + `ChatSimulator.tsx` | M |
| 2.6 | **Faxina agendada + relatório semanal em Avisos** | Fecha o ciclo da Saúde do catálogo: o achado chega sozinho em vez de esperar visita | `features/health` + `notifications.ts` | P |
| 2.7 | **Modo apresentação de álbum** (tela cheia, música, avanço automático) | A base de Momentos já monta apresentações; falta o modo “mostrar para alguém” | `features/discovery` | M |

### Prioridade 3 — engenharia e alcance

| # | Melhoria | Por que vale | Onde | Esforço |
| --- | --- | --- | --- | --- |
| 3.1 | **Virtualizar listas grandes** | Catálogo e galeria renderizam tudo com lote progressivo; com 2.000 fichas e 6.000 fotos o custo aparece | `GaleriaGrade.tsx`, `Catalog.tsx` | M |
| 3.2 | **Dividir o bundle por tela** | 3,5 MB de HTML único atrasa a primeira abertura no celular; manter o single-file como opção “levar num pendrive” | `vite.config.ts` + `React.lazy` nas telas pesadas | M |
| 3.3 | **Auditoria de acessibilidade** (axe) | Foco em modais, `aria-live` do status de salvamento, contraste no tema claro, alternativa de botão para cada gesto | `tests/` + ajustes de componente | M |
| 3.4 | **Deploy de prévia por PR** | Facilita testar no celular antes de mesclar | GitHub Pages ou Netlify no CI | P |
| 3.5 | **Revisão de segurança das dependências** | Os 3 alertas do npm continuam abertos desde o último build | `npm audit` + atualização | P |
| 3.6 | **Empacotamento desktop opcional** (Tauri) | Mesmo código, janela própria e backup em pasta de verdade sem depender do navegador | repositório à parte | G |

### O que **não** vale a pena agora

- **Servidor ou conta online.** O valor do Catalog é ser local. Se um dia houver sincronia,
  ela deve ser criptografada ponta a ponta e opcional.
- **Internacionalização.** É um app pessoal em português; extrair 3.000 strings não paga o custo.
- **Trocar a stack.** React + Vite + single-file está funcionando bem e o build é rápido.

---

## 3. O que já foi implementado nesta rodada

1. **Saúde do catálogo** — novo domínio em `src/features/health/`
   (`diagnostico.ts`, `index.ts`, `README.md`, `components/SaudeDoCatalogo.tsx`), com 12
   tipos de achado, nota de 0 a 100, filtro por gravidade e **faxina de ponteiros** que
   nunca apaga ficha, foto ou texto. Entra no menu (Biblioteca → Mais), na busca global e
   nos atalhos de tela. Coberto por `tests/saude-catalogo.test.ts` e `tests/saude-ui.test.tsx`.
2. **Aplicativo instalável e offline** — `public/manifest.webmanifest`, `public/sw.js`,
   ícones 192/512/maskable/apple-touch, faixa “sem conexão” e convite para instalar
   (`src/lib/pwa.ts`, `src/app/components/StatusDoApp.tsx`). Coberto por `tests/pwa.test.ts`.
3. **CI** — `.github/workflows/ci.yml` roda instalação, tipos, 469 testes e build a cada
   push na `main` e a cada PR, guardando o `dist` como artefato.
4. **Higiene do repositório** — `.gitignore` na raiz (dependências, build, cobertura),
   com o passo único para retirar o que já está versionado (item 0.4).
5. **Correções** — a surpresa de aniversário passou a respeitar a data de referência
   (`upcomingBirthday`/`ageFromBirthday` aceitam `referencia`), e o teste de Pacotes voltou
   a apontar para o grupo certo do menu (“Mais” da Biblioteca). Suíte inteira verde.

---

## 3.1 Rodada 2 — voz, compartilhamento e peso

| # | Entrega | O que mudou | Onde |
| --- | --- | --- | --- |
| V1 | **Voz das pessoas** | Áudio de verdade na ficha: gravação pelo microfone (MediaRecorder, mono, ~24 kbps) ou arquivo enviado, com título, favorito, player, download e exclusão. Limites explícitos: 2 MB por áudio, 8 MB por pessoa. | `src/features/voice/` |
| V2 | ~~**Voz sintetizada**~~ — **removida na rodada 4** | O app falava por ela com a voz do aparelho. Não é a voz de ninguém e ocupava o lugar do que importa (ver §3.3). | `sintetizador.ts` (removido) |
| V3 | ~~**Conversa falada**~~ — **removida na rodada 4** | Botão de ouvir por mensagem e modo voz no cabeçalho, ambos sobre a voz do aparelho. | `ChatSimulator.tsx` (limpo) |
| C1 | **Compartilhar** | Resumo da ficha em texto (Web Share API com queda para a área de transferência) e áudio de voz como arquivo compartilhável, com queda para download. Nada sai sozinho e nenhum dado sai sem pedido. | `src/lib/compartilhar.ts` |
| S1 | **Sons novos** | `gravando`, `parar`, `voz` (antes de falar) e `compartilhar`, com prévia em Ajustes. | `src/lib/sound.ts` |
| L1 | **Peso do repositório** | `node_modules/` e `dist/` saíram do versionamento: **8.454 → 165 arquivos**. O `dist` volta com `npm run build`. | histórico do Git |
| L2 | **Peso do pacote** | **3.520 → 2.419 kB** (gzip **1.847 → 990 kB**): imagens de demonstração comprimidas (1,1 MB → 328 KB) e fonte restrita a latim + latim estendido (213 → 118 KB). | `public/images/`, `src/base.css` |
| L3 | **Saúde do catálogo acompanha a voz** | Cartão de vozes guardadas e achado novo para áudio acumulado (25 MB de atenção, 60 MB de crítico). | `features/health/` |
| B1 | **Correção que o CI encontrou** | Um temporizador de aviso continuava disparando depois de a tela sair do ar (`window is not defined` na esteira). O provedor agora limpa aviso **e** salvamento adiado ao desmontar, com contrato em `tests/architecture.test.ts` para não voltar. | `src/context.tsx` |

### Ideias na fila (com dono e tamanho)

| Ideia | Por que vale | Esforço |
| --- | --- | --- |
| **Transcrever os áudios** (Web Speech ou IA opcional) | Transforma voz em texto pesquisável e alimenta as notas da ficha | M |
| **Linha do tempo da voz** | Ouvir a mesma pessoa ao longo dos anos — a mudança da voz é uma história por si | P |
| **Playlist “boas-vindas”** | Tocar os “oi” de várias pessoas em sequência, como um álbum | P |
| **Voz de recado no lembrete** | O lembrete chega com o áudio dela, não com um bipe | P |
| **Mensagem de voz na conversa** | Enviar um áudio na conversa simulada — hoje só foto | M |
| **Compartilhar pasta/tierlist como imagem** | Já existe PNG de ficha e ranking; falta o álbum e a lista | P |
| **Kit de importação de voz** | Trazer um áudio e cortar só o trecho bom, sem editor externo | M |
| **Modo “só voz” no celular** | Tela grande com um botão: apertar e ouvir a pessoa sorteada | P |
| **Gráfico de peso por dado** | Mostrar o que ocupa espaço (foto, áudio, texto) dentro de Ajustes | P |

## 3.2 Rodada 3 — o que estava pela metade

Revisão de fundo: cada item abaixo era um comportamento que prometia uma coisa e
fazia outra, ou uma peça que ninguém usava.

| # | O que estava torto | O que passou a acontecer | Onde |
| --- | --- | --- | --- |
| R1 | ~~O **volume da voz sintetizada** só valia na amostra~~ | Corrigido na rodada 3; o recurso inteiro saiu na rodada 4 | — |
| R2 | O botão **“Ler a descrição”** lia o *título do primeiro áudio* quando havia voz guardada | Lê a descrição escrita na ficha — e fica desabilitado, com explicação, quando não há uma | `VozDaPessoa.tsx` |
| R3 | Baixar ou compartilhar um áudio **sempre** entregava `.webm`, mesmo para um MP3 enviado do aparelho (arquivo que o sistema abre como corrompido) | Extensão e tipo saem do próprio arquivo; o nome fica legível e sem acento | `voz.ts` (`formatoDoAudio`, `nomeDoArquivoDeVoz`) |
| R4 | A **cópia de emergência** (diário local) parava de ser escrita acima de 4 MB **em silêncio** — e um catálogo com voz passa disso rápido | A tela avisa uma vez, explica o motivo e lembra de exportar um backup (o IndexedDB continua salvando) | `context.tsx`, `storage.ts` |
| R5 | Sair da conversa ou dos Ajustes deixava a **voz do sistema falando sozinha** | As telas emudecem ao desmontar | `ChatSimulator.tsx`, `Settings.tsx` |
| R6 | O player da ficha **segurava o áudio na memória** depois de fechar a tela | O áudio é solto (pausa + `src` limpo) ao sair | `VozDaPessoa.tsx` |
| R7 | Compartilhar dizia a mesma coisa em **três redações diferentes** | Uma frase por caso, num lugar só, com cancelamento explicado | `lib/compartilhar.ts` (`mensagemDoCompartilhamento`) |
| R8 | `resumoDoCatalogoParaCompartilhar`, `enderecoDoApp`, `capaDaPessoa` e `duracaoDaNota` eram **código morto** | O retrato do catálogo virou comando na paleta (⌘K) e os outros três saíram | `CommandPalette.tsx`, `lib/compartilhar.ts`, `sintetizador.ts` |
| R9 | `.voz-tabs` era classe usada **sem estilo** nenhum; abas apertavam em tela estreita | Regra própria, com quebra de linha | `base.css` |

Suíte na época: 35 arquivos, 503 testes (`tests/correcoes.test.ts` cobre R1–R4 e R7–R8); depois da rodada 4, 497; depois da rodada 5, 498.

## 3.3 Rodada 4 — limpeza: nada de TTS, nomes honestos

Revisão pedida depois da rodada 3. O foco foi **tirar do produto o que não é
produto** e dar nome certo ao que existe.

| # | O que saiu ou mudou | Por quê |
| --- | --- | --- |
| L1 | **Voz sintetizada removida por completo** (`sintetizador.ts` apagado, aba da ficha, botão de ouvir por mensagem, modo voz do cabeçalho, chave/volume/amostra em Ajustes, `Person.perfilVoz`, `settings.chatVoz`, `settings.chatVozVolume` e o CSS da fala) | Uma voz de máquina dizendo “Oi, eu sou Ana” **não é a voz da Ana**. Era caro de manter, difícil de explicar e ocupava o lugar do que importa: o áudio que a pessoa gravou. Nada de `speechSynthesis` no código. |
| L2 | `src/lib/voz.ts` → **`src/lib/repertorio.ts`** (`FamiliaVoz`→`FamiliaDeFala`, `BancoVoz`→`BancoDeFalas`) | O nome mentia: eram 2.632 linhas de **frases escritas**, sem relação com áudio. O conteúdo textual continua inteiro; o cabeçalho agora diz que é a última etapa do motor (gerar texto), não o entendimento. |
| L3 | `tests/voz.test.ts` → **`tests/repertorio.test.ts`** | Mesmo motivo, do lado dos testes. |
| L4 | O que era **experimento na lateral** passou a se chamar **“Laboratório e extras (n)”** | Roleta, easter eggs, quadro de investigação, stories, pacotes e cia. continuam existindo — mas atrás de um nome que avisa o que são, sem disputar espaço com o caminho principal (§4, fase 3). |
| L5 | A tela da ficha ficou com **duas abas** (Áudios e Gravar) | Menos superfície, menos promessa. |

A limpeza apagou ~430 linhas de código de produto e ~120 de teste, e o app
continua passando inteiro.

## 4. Como saber se melhorou

- `npm test` verde e CI verde em todo PR (hoje: 35 arquivos, 497 testes).
- Lighthouse no `dist/index.html`: instalável, funcional offline, sem erro de console.
- `git ls-files | wc -l` abaixo de 500 depois do item 0.4 (**feito**: 165 arquivos).
- Nota da Saúde do catálogo acima de 90 num catálogo de uso diário.
- Um único arquivo JSON de backup que abre em outro aparelho e restaura tudo, incluindo
  fotos — hoje isso já funciona; o item 1.2 só troca “arquivo legível” por “arquivo cifrado”.

## 5. Fases de execução (mapa do que falta)

Plano de trabalho acordado depois da rodada 4. A ordem importa: limpeza antes
de arquitetura, arquitetura antes de produto novo.

### Fase 1 — limpeza ✅ (rodada 4)

| Item | Situação |
| --- | --- |
| 1. Renomear o `voz.ts` enganoso | ✅ `lib/voz.ts` → `lib/repertorio.ts` |
| 2. Garantir que não existe TTS | ✅ removido por completo (nenhum `speechSynthesis` no código) |
| 3. Dividir `dialogue.ts` (3.050 linhas) | ✅ feito (rodada 5) — as bancas de frases saíram para `src/lib/dialogue/bancos.ts`; o motor ficou com 1.847 linhas, sem nenhuma tabela de fala. Falta a segunda metade: inverter a camada (`dialogue/engine.ts` ainda importa de `../dialogue`) e quebrar `repertorio.ts` por assunto. `tests/architecture.test.ts` trava o tamanho e proíbe lógica nas bancas |
| 4. Dividir `toolkit.ts` (1.695) | ⏳ |
| 5. Dividir `types.ts` (897) | ⏳ |
| 6. Dividir `store.ts` (901) | ⏳ |
| 7. Dividir `ChatSimulator.tsx` (722) | ⏳ |

### Fase 2 — arquitetura

| Item | Situação |
| --- | --- |
| 8. `features/` com contratos | ✅ já existe (`people`, `gallery`, `gamification`, `relationships`, `discovery`, `health`, `voice`) — falta um `index.ts` de contrato por feature |
| 9. Contratos entre features | ⏳ |
| 10. `App.tsx` (374) e `context.tsx` (515) menores | ⏳ |
| 11. Separar CSS (`base.css` 2.120 + `celular.css` 1.902) | ⏳ — `styles/` por assunto, mantendo os contratos de `isolamento.test.ts` |

### Fase 3 — produto

| Item | Situação |
| --- | --- |
| 12. Revisar a navegação (25+ telas) | ⏳ |
| 13. Esconder o experimental | ✅ começou: “Laboratório e extras”; falta revisar tela por tela |
| 14. Unificar funções duplicadas | ⏳ (fusão de telas: `tools` já agrupa categorias/coleções/rascunhos/duplicatas/atividade) |
| 15. Revisar fluxos mobile | ⏳ |

### Fase 4 — qualidade

| Item | Situação |
| --- | --- |
| 16. Instalar limpo de verdade | ✅ é o que o CI faz a cada push (`npm ci` + `typecheck` + testes + build, verdes) |
| 17. `typecheck` | ✅ sem erros, no CI |
| 18. Todos os testes | ✅ 35 arquivos, no CI |
| 19. Testes dos fluxos críticos | ⏳ (o que falta: importar/exportar backup grande, trocar de perfil, faxina) |
| 20. Lint (item 0.5) | ⏳ |
