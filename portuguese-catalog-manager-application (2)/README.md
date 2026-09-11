# Catalog

Aplicativo pessoal em React, TypeScript e Vite, com interface em português brasileiro. A identidade rosa e roxa foi preservada em um sistema visual mais discreto, com navegação fixa e imagens em destaque.

## Primeiro acesso

- Usuário inicial: `admin`.
- Senha inicial: `admin`.
- Altere o perfil, o usuário e a senha em **Ajustes**.
- **Explorar demonstração** abre fichas fictícias em memória. As alterações da demonstração não substituem o catálogo real e são descartadas ao sair.

## Onde encontrar

- **Catálogo:** favoritos, arquivo, lixeira, seleção em lote, filtros, buscas salvas e CSV.
- **Notas gerais:** ideias, observações, referências e lembretes vinculáveis a pessoas e pastas.
- **Pastas:** grupos mistos de pessoas, fotos, notas e histórias, sem duplicar os itens.
- **Quadro de investigação:** cartões pessoais em etapas de observação, conexão, confirmação e arquivo.
- **Organizar:** coleções legadas, categorias, subcategorias, localizações, tags, rascunhos, possíveis duplicatas e atividade.
- **Tierlists:** participantes por categoria/subcategoria, faixas personalizadas, cores, ordenação e duplicação independente.
- **Galeria:** upload múltiplo, imagens não vinculadas, vínculos, pastas, seleção em lote, ampliação e navegação por setas.
- **Lembretes:** datas, edição, prioridade, conclusão e adiamento.
- **Ajustes:** perfil, tema, acessibilidade, PIN opcional, importação, exportação e pontos de restauração.
- **Novidades do Catalog:** guia navegável dos recursos novos e aprimorados. A lista está em `src/features.ts`.

## Dados e recuperação

- O armazenamento principal é IndexedDB (`catalog-local-v3`).
- Alterações pendentes têm uma tentativa de cópia síncrona em `localStorage` antes da gravação principal.
- O indicador de salvamento só confirma o sucesso após a gravação. Falhas exibem um aviso e permitem tentar novamente.
- Se a cópia síncrona não couber, fechar a aba com gravações pendentes gera um aviso do navegador.
- Os dados antigos de `catalog_manager_data` são migrados com os IDs existentes.
- Arquivamento e lixeira são marcações na ficha. Fotos, notas, histórias, coleções, lembretes e posições em tierlists são preservados para restauração.
- Exclusão definitiva exige confirmação digitada, limpa referências e oferece preservar as fotos como não vinculadas.
- Cadastro, edição e fichário rápido mantêm rascunhos separados da ficha publicada.
- A ficha também registra nível de amizade independente da nota, tipo de corpo, estilo de roupa, observações gerais e tipos adicionais de cabelo.
- Até cinco pontos de restauração podem ser guardados. Uma versão diária é criada durante o uso do catálogo real.
- Exporte backups externos regularmente. Limpar os dados do navegador também pode apagar o IndexedDB e as versões locais.

## Categorias, idade e importação

- As subcategorias escolares por ano (6º, 7º, 8º, 9º ano e 1º EM) foram retiradas do catálogo. Fichas antigas com esses valores são limpas automaticamente na leitura dos dados.
- A idade é livre: qualquer valor inteiro entre 0 e 120 é aceito, como 26, 34 ou 41. Nenhuma idade bloqueia o cadastro.
- Ao importar um JSON, categorias, subcategorias, etiquetas e localizações que ainda não existem no sistema são **criadas automaticamente**. Nada é substituído: uma categoria de mesmo nome reaproveita o registro atual.
- O registro automático também acontece para referências citadas em tierlists, filtros salvos, modelos de cadastro e rascunhos.
- A importação não tem limite de tamanho. O arquivo é lido em partes, com progresso percentual na tela, e o resumo mostra o tamanho, as contagens e o que foi adicionado automaticamente.
- Os campos íntimos (avaliações de peitos, bunda e quadril, e a classificação de mídia adulta) continuam aparecendo somente quando a ficha informa 18 anos ou mais. Todas as outras funções — idade, cabelo, corpo, roupa, etiquetas comuns, notas, fotos normais, pastas e quadros — ficam sempre disponíveis.
- A avaliação de **Corpo** passou a ser geral e não depende mais da idade.

## Privacidade

`Ctrl+Shift+P` cobre o catálogo e os modais. O PIN é um bloqueio de interface, não criptografia. O login é local, sem autenticação de servidor. Backups incluem as configurações de acesso e devem ser guardados com cuidado. Use somente dados e imagens que você tem autorização para armazenar. Conteúdo íntimo exige pessoas adultas.

## Atalhos

- `Ctrl+K` ou `Cmd+K`: busca global.
- `Ctrl+Shift+P`: modo privacidade.
- `1` a `8`: navegação principal, fora de campos e modais.
- `N`: fichário rápido.
- `C`: comparação.
- `/`: busca da página, ou busca global.
- `Ctrl+Z` e `Ctrl+Shift+Z`: desfazer e refazer alterações da sessão, fora dos formulários.
- `Esc`: fechar o modal atual, preservando rascunhos.

## Implementação

- `src/App.tsx`: entrada, navegação, atalhos e privacidade.
- `src/context.tsx`: estado, comandos, salvamento e histórico de desfazer.
- `src/store.ts`: migração, avaliações, filtros, normalização, duplicatas e CSV.
- `src/lib/storage.ts`: IndexedDB, recuperação local e versões de backup.
- `src/lib/export.ts`: exportações PNG por Canvas, sem interpolar conteúdo pessoal em HTML.
- `src/hooks/usePersonDraft.ts`: recuperação e isolamento de rascunhos.
- `src/components/`: telas e componentes reutilizáveis.
- `src/components/Notes.tsx`, `Folders.tsx` e `InvestigationBoard.tsx`: anotações gerais, grupos mistos e quadro por etapas.
- `src/index.css`: temas, layout, foco de teclado, movimento reduzido e impressão.
- `src/assets.ts`: imagens locais embutidas no build. A fonte Inter também é incluída localmente.

## Validação

O build de produção é gerado pelo script `npm run build`, com saída em `dist/index.html` e recursos embutidos. O projeto foi compilado durante a implementação; não houve execução de testes de navegação ou capturas em navegador nesta sessão.

A última instalação de dependências reportou três alertas de auditoria npm (um baixo, um moderado e um alto). As atualizações compatíveis reduziram os alertas, mas uma revisão de segurança das dependências ainda é necessária antes de publicação pública.

Para homologar, use o modo demonstração e confira: criar/editar/recuperar rascunhos, arquivar/restaurar/excluir, exportar CSV e PNG, mover participantes nas tierlists, editar lembretes, criar notas/pastas/quadros, alternar tema, ativar privacidade e recarregar após o indicador de gravação confirmar sucesso.