# Arquitetura do Catalog Manager

Este documento é o mapa curto do projeto. Ele existe para que uma pessoa ou uma IA consiga localizar uma mudança sem abrir o catálogo inteiro.

## Direção

O projeto está em uma migração incremental de `src/components`, `src/lib` e `src/store.ts` para módulos por domínio. Não fazemos uma grande troca de pastas de uma vez: cada feature nova nasce no domínio correto e os arquivos legados continuam disponíveis como pontos de compatibilidade até serem migrados.

```text
src/
├── app/                         # regras de composição global (em expansão)
├── features/
│   ├── discovery/               # Momentos, Desafios e exploração
│   ├── people/                  # fichas, cadastro e dados de pessoas
│   ├── gallery/                 # fotos, vídeos, álbuns e órfãs
│   ├── relationships/           # relações entre fichas e contexto
│   └── gamification/            # XP, desafios e conquistas
├── components/                  # camada legada compartilhada; migração gradual
├── lib/                         # serviços e regras legadas, agrupados por domínio quando possível
├── shared/                      # contratos para vários domínios (em expansão)
├── context.tsx                  # fachada de estado global local
├── store.ts                     # normalização e compatibilidade do formato salvo
└── types.ts                     # contrato legado; novos tipos devem ficar perto do domínio
```

## Navegação atual

- **Início:** visão geral e atalhos para ações frequentes.
- **Catálogo:** pessoas, favoritos, arquivo, lixeira e seleção em lote.
- **Explorar:** Descobrir, Momentos e Desafios.
- **Biblioteca:** Galeria, Pastas, Agenda, Meu espaço e Ferramentas.
- **Sistema:** Ajustes, privacidade, notificações e Command Palette (`Ctrl/Cmd + K`).

A navegação global continua em `src/App.tsx` por compatibilidade com os testes e com o histórico de telas. Novas páginas devem declarar o nome e a rota junto ao módulo de domínio antes de entrar no menu.

## Regras de dependência

```text
Page / route
  ↓
Feature component
  ↓
Feature hook / facade
  ↓
Feature service / lib
  ↓
Storage ou contexto
```

- Componentes não importam IndexedDB, `localStorage` ou serialização diretamente.
- Serviços não importam componentes.
- Features não importam páginas umas das outras; use uma facade pública ou uma ação do contexto.
- `shared` não depende de uma feature.
- Uma feature pode usar `useCatalog` para comandos globais, mas não deve conhecer a implementação interna do provider.
- O formato persistido continua centralizado em `src/store.ts` enquanto a migração não terminar.

## Limites práticos

- Componente visual: idealmente até 300 linhas.
- Entre 300 e 500 linhas: separar subcomponentes ou hooks antes de adicionar outra responsabilidade.
- Acima de 800 linhas: refatoração obrigatória para uma alteração nova.
- Regras de negócio não entram em JSX; dê a elas nome e arquivo próprios (`score.ts`, `questions.ts`, `filters.ts`).
- Evite `utils.ts`, `helpers.ts` e `misc.ts` sem domínio. O nome da pasta deve responder “de quem é esta regra?”.

Arquivos legados acima desses limites são dívida conhecida e devem ser migrados em fatias pequenas, sem misturar refatoração estrutural com mudança de comportamento.

## Facades públicas

Cada domínio deve expor um `index.ts` pequeno. Consumidores importam dele, não de caminhos internos:

```ts
import { getAllPhotos } from '@/features/gallery';
import { weeklyChallenges } from '@/features/gamification';
```

As facades atuais ainda adaptam funções legadas. Isso é intencional: permite mover a implementação sem alterar dezenas de consumidores.

## Checklist para uma nova feature

1. Escolha o domínio antes de criar o arquivo.
2. Crie ou atualize `features/<dominio>/README.md`.
3. Separe tela, comportamento e regra de negócio.
4. Exporte o contrato público por `index.ts`.
5. Não adicione um item ao menu principal se ele for uma ação ocasional; use a Command Palette ou uma seção do domínio.
6. Escreva pelo menos um teste de comportamento e um teste de contrato quando a feature tiver persistência.
7. Rode `npm run typecheck`, `npm run build` e os testes do domínio.

## Dívida de migração priorizada

1. `src/components/ChatSimulator.tsx`: separar cabeçalho, mensagens, composer e memória.
2. `src/components/Gallery.tsx`: separar abas, grade, upload e seleção em lote.
3. `src/context.tsx`: separar persistência, comandos e progresso em hooks/facades.
4. `src/store.ts` e `src/types.ts`: extrair contratos por domínio sem quebrar o formato salvo.
5. `src/lib/dialogue.ts` e `src/lib/voz.ts`: manter como motores independentes; não misturar regras de conversa com UI.

A regra de ouro é: uma feature pode crescer, mas nenhum arquivo deve precisar conhecer tudo sobre ela.
