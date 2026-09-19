# Catalog

Aplicativo pessoal em React, TypeScript e Vite, com interface em português brasileiro. A identidade rosa e roxa foi preservada em um sistema visual mais discreto, com navegação fixa e imagens em destaque.

## Primeiro acesso

- Usuário inicial: `admin`.
- Senha inicial: `admin`.
- Altere o perfil, o usuário e a senha em **Ajustes**.
- **Explorar demonstração** abre fichas fictícias em memória. As alterações da demonstração não substituem o catálogo real e são descartadas ao sair.

## Onde encontrar

- **Celular (UI própria):** barra inferior para Início, Catálogo, cadastro rápido, busca e menu; menu lateral deslizante; grades, formulários, tierlists e abas responsivas; áreas seguras do aparelho respeitadas. Além disso, o que só existe no aparelho: **folha que sobe do pé da tela** (filtros, ações, detalhes) com puxador e arrastar para baixo para fechar, **deslizar da borda esquerda para voltar** com trilha lilás, **toque longo** como menu de contexto, **título grande que se recolhe** ao rolar, doca que sai da frente quando uma folha ou o visor assumem a tela e o “⋯” no topo que reúne disfarce, privacidade, tema, desfazer/refazer e o status do salvamento. O “+” do meio é um círculo de gradiente com o rótulo “Adicionar” embaixo — afunda no toque, vibra igual aos vizinhos e, com o fichário rápido aberto, a doca inteira recolhe como recolhe com as folhas —; e a direita do topo é um cluster só — sino, “⋯” e o seu retrato dentro da mesma pílula, sem caixa em volta de cada ícone — com o fundo do topo derretendo na página enquanto ela está no começo e virando vidro quando rola. Na galeria e no cofre, a barra de tipo/filtro/modo fica **grudada embaixo das abas** — a altura é medida no pixel (`useFaixasGrudadas`), para o título de cada dia parar logo abaixo dela — e depois de rolar aparece o botão de voltar ao começo do álbum. As medidas (alvo de 48px, raios, sombras, tipografia e as três larguras de tela) estão na seção 14 de `src/celular.css`, a camada própria do celular — folhas, gestos, galeria, visor e cofre — na seção 15, e a **UI do aparelho refeita** na seção 16 do mesmo arquivo: o cartão de pessoa é a **foto com o nome por cima** (e o modo lista é a linha larga para ler, com o coração na direita, onde o polegar cai), a doca marca a aba ativa com **pílula atrás do ícone**, o cabeçalho da tela é **capa** com as ações rolando na lateral sem quebrar linha, e a **ficha abre em tela cheia** com as abas colando no alto e a barra de ação no pé da tela. O `src/index.css` é só a porta que importa os três alvos (`base.css`, o que os dois compartilham; `celular.css`, regra que só existe dentro de `@media` de toque; `computador.css`, só `min-width: 1101px`) — é assim desde que o `mobile.css` legado foi aposentado, porque ele escondia a doca e o título do topo para todo canto e reescrevia a doca antiga por cima da nova.
- **Prancha do celular:** rode `npm run dev` e abra **`/celular.html`** para ver as dez telas lado a lado em 390×844, rodando o CSS real do aplicativo — inclusive Galeria em mosaico com a barra grudada no topo, cofre do Meu espaço, visor de fotos, folha de ações e folha de filtros. Uma tela sozinha e maior: `/celular.html?tela=visor` (ou `galeria`, `acoes`, `cofre`, `filtros`, `conversa`, …).
- **Ações rápidas:** toque no botão de raio no cabeçalho (ou pressione `Q`) para abrir mais de vinte utilidades: filtros prontos, surpresa, roleta, comparação, agenda de hoje, avisos, CSV, resumo copiável/compartilhável, tela cheia, privacidade, tema e densidade.
- **Catálogo:** favoritos, arquivo, lixeira, seleção em lote, filtros, buscas salvas e CSV.
- **Notas gerais:** ideias, observações, referências e lembretes vinculáveis a pessoas e pastas.
- **Pastas:** grupos mistos de pessoas, fotos, notas e histórias, sem duplicar os itens.
- **Quadro de investigação:** cartões pessoais em etapas de observação, conexão, confirmação e arquivo.
- **Organizar:** coleções legadas, categorias, subcategorias, localizações, tags, rascunhos, possíveis duplicatas e atividade.
- **Tierlists:** participantes por categoria/subcategoria, faixas personalizadas, cores, ordenação e duplicação independente.
- **Galeria:** mosaico com a proporção real de cada arquivo, quadra de quadrados iguais e linha do tempo agrupada por dia com a data grudada no topo; busca por nome/anotação/pessoa, filtros de tipo, pessoa, pasta e álbum numa folha, com chips removíveis — tudo numa faixa que segura o topo da tela enquanto o álbum rola; seleção em lote (toque, Shift para intervalo, barra fixa no pé da tela com pasta, álbum, favoritar, cofre e excluir); upload múltiplo, fotos não vinculadas, vínculos, duplicatas, álbuns e antes/depois — no antes/depois o divisor é arrastado com o dedo em cima da foto (a linha fina ganha 34px de alvo, a página continua rolando por cima, e as setas do teclado também movem).
- O modo de ver (mosaico, quadra, linha do tempo) fica salvo por tela: galeria e cofre têm chaves próprias.
- **Visor de fotos:** tela inteira com deslizar para trocar de foto, pinça e toque duplo para zoom, puxar para baixo para fechar, um toque para esconder as barras, faixa de miniaturas, coração com animação, baixar, folha de detalhes (vincular ficha, mover de pasta, tipo, excluir) e, no computador, setas, `+`/`-`, `F`, `I` e `Esc`. `Esc` fecha. A mesma tela abre as fotos da ficha (aba **Fotos** e a capa) e as do cofre do Meu espaço.
- **Lembretes:** datas, edição, prioridade, conclusão e adiamento.
- **Ajustes:** perfil, tema, acessibilidade, sons e comemorações, PIN opcional, importação, exportação e pontos de restauração.
- **Painel:** nível e XP, desafios da semana (marcados automaticamente), aniversários e revisitas, roleta, cinturão da campeã do duelo, gráficos e conquistas.
- **Ficha:** aba **Linha do tempo** com cadastro, fotos, interações, notas, encontros, conversas, metas e mudanças de nota; opção **Fixar no topo** no menu.
- **Agenda:** exportação `.ics` para Google Agenda, Outlook e iPhone; cronômetro que dá um tique a cada 10 minutos.
- **Tierlists:** exportação em PNG pelo menu **Mais**.
- **Ferramentas:** 50 utilidades em cinco grupos (Catálogo e dados, Organização em lote, Conversa e social, Meu espaço e rotina, Utilidades do dia a dia), com busca, ícones no mesmo estilo do resto do app e atalho `T`. Cada ferramenta declara os campos que precisa e mostra o resultado em tela, com botão de copiar e download quando faz sentido.
- **Novidades do Catalog:** guia navegável dos recursos novos e aprimorados. A lista está em `src/features.ts`.

## Conversa simulada 2.0

A conversa com cada pessoa vive na ficha (**Conversar**) e é montada na hora a partir da própria ficha. Não é um banco de frases soltas: a resposta passa por intenção detectada, personalidade, humor, química, tom liberado e memória do papo.

- **Persona da ficha:** idade, comportamento, descrição, categoria, subcategoria, etiquetas, signo, música favorita, localização, nível de amizade, pronome e observações viram traços de personalidade (ousadia, reserva, timidez, humor, verbosidade, emojis, gírias), interesses concretos e um jeito de escrever.
- **Química e estágios:** a conversa acumula química de 0 a 100 e atravessa cinco estágios — conhecendo agora, pegando intimidade, confiante, próxima e especial. O estágio muda o tamanho das respostas, as perguntas e o que ela aceita ouvir.
- **O clima é automático:** não existe painel de tom no chat. Ela vai do papo leve ao flerte (e, com ficha 18+ e modo adulto ligado, ao clima quente) conforme a intimidade construída, sempre ajustada por reserva e ousadia da persona. Se o assunto passar do ponto, ela **desconversa** com naturalidade em vez de responder, e a química não sobe.
- **Humor automático:** ela chega a um humor (alegre, brincalhona, flertando, tímida, curiosa, carinhosa, fechada ou neutra) e reage ao que você escreve. Cobranças fecham o clima; desabafos trazem carinho. O cabeçalho só mostra o estado atual, sem botões.
- **Memória:** preferências, rotina e planos citados por você viram anotações curtas que ela retoma depois. A memória pode ser apagada no menu da conversa.
- **Nunca a mesma frase:** cada resposta é sorteada entre dezenas de modelos por intenção e clima, combinados com gírias, risadas, emojis, vocativos e pequenos erros de digitação proporcionais à persona. Os últimos modelos usados saem do sorteio.
- **Modo automático:** o botão **Deixar puxar** faz ela mandar mensagem sozinha depois de um tempo, retomando assunto ou lembrança.
- **Extras:** envio de foto na conversa e reação a ela, fotos ocasionais dela, sugestões de resposta e de abertura, cartão **Como ela conversa**, análise da conversa e exportação em Markdown.

### Conteúdo adulto

- Só existe para fichas com **18 anos ou mais** e depois de ligar o **modo adulto** em **Ajustes → Conversas** (desligado por padrão). Ficha com menos de 18 anos nunca entra em flerte nem em conteúdo adulto, mesmo com a opção ligada.
- Ainda assim o conteúdo é **sugestivo**: insinuação, provocação e clima, sempre por mensagem e sem descrição explícita.
- Em **Ajustes → Conversas** ficam o ritmo de digitação, o medidor de química, o uso de gírias e emojis e o modo automático.
- Nos quebra-gelos (**Puxar assunto**), a categoria **Picante** só aparece para ficha adulta com o modo adulto ligado.

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
- `T`: Ferramentas (as 50 utilidades).
- `B`: modo disfarce. `Esc` três vezes: pânico.
- `/`: busca da página, ou busca global.
- `Ctrl+Z` e `Ctrl+Shift+Z`: desfazer e refazer alterações da sessão, fora dos formulários.
- `Esc`: fechar o modal atual, preservando rascunhos.
- **Galeria com o visor aberto:** `←`/`→` trocam a foto, `+` e `-` dão zoom, `F` favorite, `I` abre os detalhes e `Esc` fecha.
- **Galeria no teclado, sem o visor:** `S` entra na seleção em lote; com fotos escolhidas, `Shift` + clique estende o intervalo.
- **No aparelho, os gestos substituem as teclas:** deslizar da borda esquerda volta uma tela, segurar o título da tela aciona o pânico (≈0,7s), segurar uma foto ou um cartão abre a folha de ações, puxar a folha para baixo fecha, e no visor deslizar troca, pinça/`2 toques` zoom e puxar para baixo fecha.

## Implementação

- `src/App.tsx`: entrada, navegação, atalhos e privacidade.
- `src/context.tsx`: estado, comandos, salvamento e histórico de desfazer.
- `src/store.ts`: migração, avaliações, filtros, normalização, duplicatas e CSV.
- `src/lib/storage.ts`: IndexedDB, recuperação local e versões de backup.
- `src/lib/export.ts`: exportações PNG por Canvas (ficha, ranking e tierlist), sem interpolar conteúdo pessoal em HTML.
- `src/lib/sound.ts`: sintetizador de sons de interface (Web Audio) com as regras de silêncio.
- `src/lib/persona.ts`: leitura da ficha (comportamento, idade, interesses, signo, música, localização) e montagem da persona que fala.
- `src/lib/dialogue.ts`: motor da conversa simulada — intenções, clima automático, química, estágios, memória, humor, estilo de escrita, sugestões, análise e exportação.
- `src/lib/toolkit.ts`: as 50 ferramentas, com campos, prévia e execução sobre os dados.
- `src/components/Toolbox.tsx`: tela Ferramentas, com busca, grupos, formulário dinâmico e resultado.
- `src/lib/ics.ts`: exportação da agenda em iCalendar.
- `src/lib/galeria.ts`: a conta da galeria — proporção de cada foto, span do mosaico, agrupamento por dia, filtros, chips, seleção por intervalo e resumo.
- `src/lib/toque.ts`: gestos do dedo — `useToqueLongo`, `useArrastarParaFechar` e `useBordaVoltar`, todos com `Pointer Events` e neutros onde não há toque.
- `src/components/Folha.tsx`: a folha que sobe do pé da tela (com `FolhaDeAcoes`, o menu de contexto do dedo) — puxador, arrastar para fechar, fundo travado e `Esc` preservado.
- `src/components/GaleriaGrade.tsx`: mosaico justificado, quadra e linha do tempo, com lote progressivo e proporção medida na primeira exibição.
- `src/components/VisorDeFotos.tsx`: visor em tela inteira — deslizar, pinça, toque duplo, puxar para fechar, faixa de miniaturas e folha de detalhes.
- `src/hooks/useFaixasGrudadas.ts`: mede abas e barra de ferramentas e entrega os pixels para o `position: sticky` da galeria e do cofre.
- `src/hooks/useSelecaoLote.ts`: a seleção em lote do dedo (primeiro toque abre, Shift estende por intervalo, a doca recua) — a mesma nos dois mosaicos.
- `src/components/Celebrations.tsx`: confete, cartão de nível, aviso de conquista, cinturão da campeã e roleta.
- `src/hooks/usePersonDraft.ts`: recuperação e isolamento de rascunhos.
- `src/components/`: telas e componentes reutilizáveis.
- `src/components/Notes.tsx`, `Folders.tsx` e `InvestigationBoard.tsx`: anotações gerais, grupos mistos e quadro por etapas.
- `src/index.css`: porta de entrada do estilo — só importa os três arquivos abaixo, na ordem `base`, `celular`, `computador`.
- `src/base.css`: tokens dos temas, tipografia, componentes e o layout que os dois alvos compartilham, além de foco de teclado, movimento reduzido e impressão.
- `src/celular.css`: todo o sistema de toque (seções 11 a 16: casca, doca, folhas, gestos, galeria, visor, cofre e a UI refeita do aparelho). Nenhuma regra nasce fora de um `@media`, então o computador não é alcançado por ela.
- `src/computador.css`: só bloco `@media (min-width: 1101px)` — conversa em tela cheia, janela média e os rótulos dos modos na galeria.
- `src/assets.ts`: imagens locais embutidas no build. A fonte Inter também é incluída localmente.

## Validação

O build de produção é gerado pelo script `npm run build`, com saída em `dist/index.html` e recursos embutidos. Os testes (`npm test`) cobrem o catálogo com centenas de fichas, as telas novas, os sons (com um `AudioContext` falso), as ordenações, a linha do tempo, o `.ics` e a limpeza automática da lixeira, além de:

- `tests/chat.test.ts`: persona derivada da ficha, detecção de intenções, química e estágios, travas de idade e de clima, memória, variedade das respostas, sugestões e análise da conversa.
- `tests/toolbox.test.ts`: as 50 ferramentas (contagem, grupos, ids únicos), execução sem quebrar com catálogo vazio, resultado visível nas ferramentas de leitura, uso do `commit` nas que alteram dados e conferência das contas do dia a dia.
- `tests/toolbox-ui.test.tsx`: a tela Ferramentas navegando, filtrando e executando de verdade, e a conversa simulada abrindo pela ficha com medidor de química, humor automático e resposta salva.
- `tests/galeria-celular.test.tsx`: a conta do mosaico e da linha do tempo, os filtros e chips, a folha de ações, a barra do lote no pé da tela, o topo enxuto do celular e a tela da galeria aberta de verdade (mosaico → visor → favoritar → segurar → filtros → lote), a faixa grudada medida no pixel e o cofre do Meu espaço usando o mesmo mosaico, o mesmo lote e o mesmo visor.
- `tests/celular.test.ts`: além das seções 14, a **seção 16** — o mosaico foto-primeiro, o anel do cartão fixado, a pílula da doca atrás do ícone, a ficha em tela cheia com a ação no pé e a capa do cabeçalho com as ações rolando.
- `tests/isolamento.test.ts`: o contrato da separação — a porta importa os três na ordem, nenhum `mobile.css` legado de volta, nada solto fora de `@media` no arquivo do celular e nada de largura de bolso na base.
- `tests/celular.test.ts`: as seções 14.1 a 14.20 do CSS de celular (medidas, topo, navegação, listas, gestos, formulários, conversa, toque), a doca sem gradiente e o círculo do “+” com rótulo e afundar no toque, o cluster do topo, o voltar pelo histórico, o deslizar da borda e o pânico por toque longo.

Os testes leem o CSS e os arquivos-fonte de propósito: os valores listados são o
contrato de quem usa no bolso (alvo de 46px, doca com o “+” sem gradiente — o círculo colorido vem depois, na camada própria da seção 15,
folha respeitando a área segura, azulejo com `content-visibility`, data grudada
no topo). Se você refizer alguma dessas telas, ajuste o teste junto com o CSS.

A última instalação de dependências reportou três alertas de auditoria npm (um baixo, um moderado e um alto). As atualizações compatíveis reduziram os alertas, mas uma revisão de segurança das dependências ainda é necessária antes de publicação pública.

Para homologar, use o modo demonstração e confira: criar/editar/recuperar rascunhos, arquivar/restaurar/excluir, exportar CSV e PNG, mover participantes nas tierlists, editar lembretes, criar notas/pastas/quadros, alternar tema, ativar privacidade e recarregar após o indicador de gravação confirmar sucesso.