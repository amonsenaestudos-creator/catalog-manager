# Catalog

Aplicativo pessoal em React, TypeScript e Vite, com interface em português brasileiro. A identidade rosa e roxa foi preservada em um sistema visual mais discreto, com navegação fixa e imagens em destaque.

## Primeiro acesso

- Usuário inicial: `admin`.
- Senha inicial: `admin`.
- Altere o perfil, o usuário e a senha em **Ajustes**.
- **Explorar demonstração** abre fichas fictícias em memória. As alterações da demonstração não substituem o catálogo real e são descartadas ao sair.

## Onde encontrar

- **Celular e tablet:** barra inferior para Início, Catálogo, cadastro rápido, busca e menu; menu lateral deslizante; modais em painel inferior; grades, formulários, tierlists e abas responsivas; suporte às áreas seguras do aparelho.
- **Ações rápidas:** toque no botão de raio no cabeçalho (ou pressione `Q`) para abrir mais de vinte utilidades: filtros prontos, surpresa, roleta, comparação, agenda de hoje, avisos, CSV, resumo copiável/compartilhável, tela cheia, privacidade, tema e densidade.
- **Catálogo:** favoritos, arquivo, lixeira, seleção em lote, filtros, buscas salvas e CSV.
- **Notas gerais:** ideias, observações, referências e lembretes vinculáveis a pessoas e pastas.
- **Pastas:** grupos mistos de pessoas, fotos, notas e histórias, sem duplicar os itens.
- **Quadro de investigação:** cartões pessoais em etapas de observação, conexão, confirmação e arquivo.
- **Organizar:** coleções legadas, categorias, subcategorias, localizações, tags, rascunhos, possíveis duplicatas e atividade.
- **Tierlists:** participantes por categoria/subcategoria, faixas personalizadas, cores, ordenação e duplicação independente.
- **Galeria:** upload múltiplo, imagens não vinculadas, vínculos, pastas, seleção em lote, ampliação e navegação por setas.
- **Lembretes:** datas, edição, prioridade, conclusão e adiamento.
- **Ajustes:** perfil, tema, acessibilidade, sons e comemorações, PIN opcional, importação, exportação e pontos de restauração.
- **Painel:** nível e XP, desafios da semana (marcados automaticamente), aniversários e revisitas, roleta, cinturão da campeã do duelo, gráficos e conquistas.
- **Ficha:** aba **Linha do tempo** com cadastro, fotos, interações, notas, encontros, conversas, metas e mudanças de nota; opção **Fixar no topo** no menu.
- **Agenda:** exportação `.ics` para Google Agenda, Outlook e iPhone; cronômetro que dá um tique a cada 10 minutos.
- **Tierlists:** exportação em PNG pelo menu **Mais**.
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

## Sons e comemorações

Os sons são sintetizados na hora com a Web Audio API (`src/lib/sound.ts`): não há arquivos de áudio no build. Cada momento tem uma receita própria de osciladores e ruído filtrado — pop ao favoritar, duas notas no swipe para a direita, whoosh para a esquerda, batida no duelo, arpejo em conquistas, fanfarra ao subir de nível, obturador ao adicionar fotos, clique + sino ao abrir o cofre, tom grave em PIN errado, tons por humor no diário.

- Ligados por padrão. Desligue ou ajuste o volume em **Ajustes → Aparência → Sons e comemorações**, onde também é possível ouvir cada som.
- Ficam mudos automaticamente no modo disfarce, no pânico, na tela de privacidade e quando **Reduzir animações** está ativo. Em navegadores sem Web Audio tudo vira no-op.
- Confete e cartões animados de conquista/nível e a vibração no celular (swipe) têm chaves próprias nos mesmos Ajustes.
- `↑ ↑ ↓ ↓ ← → ← → B A` liga o modo disco (as cores giram); digite de novo para desligar.

## Privacidade

`Ctrl+Shift+P` cobre o catálogo e os modais. O PIN é um bloqueio de interface, não criptografia. O login é local, sem autenticação de servidor. Backups incluem as configurações de acesso e devem ser guardados com cuidado. Use somente dados e imagens que você tem autorização para armazenar. Conteúdo íntimo exige pessoas adultas.

## Atalhos

- `Ctrl+K` ou `Cmd+K`: busca global.
- `Ctrl+Shift+P`: modo privacidade.
- `1` a `8`: navegação principal, fora de campos e modais.
- `N`: fichário rápido.
- `C`: comparação.
- `J`: roleta do catálogo.
- `D`, `A`, `M`, `X`, `G`, `R`, `O`: Painel, Agenda, Meu espaço, Descobrir, Galeria, Lembretes e Pastas.
- `B`: modo disfarce. `Esc` três vezes: pânico.
- `/`: busca da página, ou busca global.
- `Ctrl+Z` e `Ctrl+Shift+Z`: desfazer e refazer alterações da sessão, fora dos formulários.
- `Esc`: fechar o modal atual, preservando rascunhos.

## Implementação

- `src/App.tsx`: entrada, navegação, atalhos e privacidade.
- `src/context.tsx`: estado, comandos, salvamento e histórico de desfazer.
- `src/store.ts`: migração, avaliações, filtros, normalização, duplicatas e CSV.
- `src/lib/storage.ts`: IndexedDB, recuperação local e versões de backup.
- `src/lib/export.ts`: exportações PNG por Canvas (ficha, ranking e tierlist), sem interpolar conteúdo pessoal em HTML.
- `src/lib/sound.ts`: sintetizador de sons de interface (Web Audio) com as regras de silêncio.
- `src/lib/ics.ts`: exportação da agenda em iCalendar.
- `src/components/Celebrations.tsx`: confete, cartão de nível, aviso de conquista, cinturão da campeã e roleta.
- `src/hooks/usePersonDraft.ts`: recuperação e isolamento de rascunhos.
- `src/components/`: telas e componentes reutilizáveis.
- `src/components/Notes.tsx`, `Folders.tsx` e `InvestigationBoard.tsx`: anotações gerais, grupos mistos e quadro por etapas.
- `src/index.css`: temas, layout, foco de teclado, movimento reduzido e impressão.
- `src/assets.ts`: imagens locais embutidas no build. A fonte Inter também é incluída localmente.

## Validação

O build de produção é gerado pelo script `npm run build`, com saída em `dist/index.html` e recursos embutidos. Os testes (`npm test`) cobrem o catálogo com centenas de fichas, as telas novas, os sons (com um `AudioContext` falso), as ordenações, a linha do tempo, o `.ics` e a limpeza automática da lixeira.

A última instalação de dependências reportou três alertas de auditoria npm (um baixo, um moderado e um alto). As atualizações compatíveis reduziram os alertas, mas uma revisão de segurança das dependências ainda é necessária antes de publicação pública.

Para homologar, use o modo demonstração e confira: criar/editar/recuperar rascunhos, arquivar/restaurar/excluir, exportar CSV e PNG, mover participantes nas tierlists, editar lembretes, criar notas/pastas/quadros, alternar tema, ativar privacidade e recarregar após o indicador de gravação confirmar sucesso.