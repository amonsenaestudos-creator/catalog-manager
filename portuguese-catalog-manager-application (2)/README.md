# Catalog

Aplicativo pessoal em React, TypeScript e Vite, com interface em português brasileiro. A identidade rosa e roxa foi preservada em um sistema visual mais discreto, com navegação fixa e imagens em destaque.

## Primeiro acesso

- Usuário inicial: `admin`.
- Senha inicial: `admin`.
- Altere o perfil, o usuário e a senha em **Ajustes**.
- **Explorar demonstração** abre fichas fictícias em memória. As alterações da demonstração não substituem o catálogo real e são descartadas ao sair.

## Onde encontrar

- **Celular (UI própria):** barra inferior para Início, Catálogo, cadastro rápido, busca e menu; menu lateral deslizante; grades, formulários, tierlists e abas responsivas; áreas seguras do aparelho respeitadas. Além disso, o que só existe no aparelho: **folha que sobe do pé da tela** (filtros, ações, detalhes) com puxador e arrastar para baixo para fechar, **deslizar da borda esquerda para voltar** com trilha lilás, **toque longo** como menu de contexto, **título grande que se recolhe** ao rolar, doca que sai da frente quando uma folha ou o visor assumem a tela e o “⋯” no topo que reúne disfarce, privacidade, tema, desfazer/refazer e o status do salvamento. O “+” do meio é um círculo de gradiente com o rótulo “Adicionar” embaixo — afunda no toque, vibra igual aos vizinhos e, com o fichário rápido aberto, a doca inteira recolhe como recolhe com as folhas —; e a direita do topo é um cluster só — sino, “⋯” e o seu retrato dentro da mesma pílula, sem caixa em volta de cada ícone — (os três têm 40px, `line-height: 0` no quadrado, ícones de 20px, selo colado no canto e o filete que separa ações de perfil é um traço curto no meio, porque o retrato não usa o botão padrão do computador e uma borda inteira atravessaria a pílula). Menu e seta de voltar são exatamente a mesma caixa, para o título não pular quando um entra no lugar do outro, e quem chega no Início zera o histórico — a raiz fica sem seta e o primeiro “voltar” para de levar à tela de onde a pessoa saiu — com o fundo do topo derretendo na página enquanto ela está no começo e virando vidro quando rola. Na galeria e no cofre, a barra de tipo/filtro/modo fica **grudada embaixo das abas** — a altura é medida no pixel (`useFaixasGrudadas`), para o título de cada dia parar logo abaixo dela — e depois de rolar aparece o botão de voltar ao começo do álbum. As medidas (alvo de 48px, raios, sombras, tipografia e as três larguras de tela) estão na seção 14 de `src/celular.css`, a camada própria do celular — folhas, gestos, galeria, visor e cofre — na seção 15, e a **UI do aparelho refeita** nas seções 16 e 17 do mesmo arquivo (16: capa, doca, catálogo e ficha; 17: a ficha por dentro, painel, ajustes e gaveta): o cartão de pessoa é a **foto com o nome por cima** (e o modo lista é a linha larga para ler, com o coração na direita, onde o polegar cai), a doca marca a aba ativa com **pílula atrás do ícone**, o cabeçalho da tela é **capa** com as ações rolando na lateral sem quebrar linha, e a **ficha abre em tela cheia** com as abas colando no alto e a barra de ação no pé da tela. O `src/index.css` é só a porta que importa os três alvos (`base.css`, o que os dois compartilham; `celular.css`, regra que só existe dentro de `@media` de toque; `computador.css`, só `min-width: 1101px`) — é assim desde que o `mobile.css` legado foi aposentado, porque ele escondia a doca e o título do topo para todo canto e reescrevia a doca antiga por cima da nova.
- **Prancha do celular (12 telas):** rode `npm run dev` e abra **`/celular.html`** para ver as doze telas lado a lado em 390×844, rodando o CSS real do aplicativo — inclusive Galeria em mosaico com a barra grudada no topo, cofre do Meu espaço, visor de fotos, folha de ações e folha de filtros. Uma tela sozinha e maior: `/celular.html?tela=visor` (ou `galeria`, `acoes`, `cofre`, `filtros`, `conversa`, `ficha`, `ajustes`, …).
- **Ações rápidas:** toque no botão de raio no cabeçalho (ou pressione `Q`) para abrir mais de vinte utilidades: filtros prontos, surpresa, roleta, comparação, agenda de hoje, avisos, CSV, resumo copiável/compartilhável, tela cheia, privacidade, tema e densidade.
- **Catálogo:** favoritos, arquivo, lixeira, seleção em lote, filtros, buscas salvas e CSV.
- **Notas gerais:** ideias, observações, referências e lembretes vinculáveis a pessoas e pastas.
- **Pastas:** grupos mistos de pessoas, fotos, notas e histórias, sem duplicar os itens.
- **Quadro de investigação:** cartões pessoais em etapas de observação, conexão, confirmação e arquivo.
- **Organizar:** coleções legadas, categorias, subcategorias, localizações, tags, rascunhos, possíveis duplicatas e atividade.
- **Saúde do catálogo:** a leitura de manutenção — nota de 0 a 100, 12 tipos de achado (ficha sem foto ou pela metade, duplicata, referência quebrada, foto repetida, lixeira parada, rascunho esquecido, lembrete atrasado, backup vencido, espaço apertado) e uma **faxina de ponteiros** que limpa só o vínculo que aponta para quem não existe mais, sem apagar ficha, foto ou texto. Fica em Biblioteca → Mais, na busca global e no atalho da tela. O que a máquina não resolve leva você à tela certa — ou já abre o catálogo filtrado (ex.: só quem está sem foto).
- **Tierlists:** participantes por categoria/subcategoria, faixas personalizadas, cores, ordenação, duplicação independente e **listas especiais** com nomes e fotos opcionais que não criam fichas no catálogo.
- **Galeria:** mosaico com a proporção real de cada arquivo, quadra de quadrados iguais e linha do tempo agrupada por dia com a data grudada no topo; busca por nome/anotação/pessoa, filtros de tipo, pessoa, pasta e álbum numa folha, com chips removíveis — tudo numa faixa que segura o topo da tela enquanto o álbum rola; seleção em lote (toque, Shift para intervalo, barra fixa no pé da tela com pasta, álbum, favoritar, cofre e excluir); upload múltiplo, fotos não vinculadas, vínculos, duplicatas, álbuns e antes/depois — no antes/depois o divisor é arrastado com o dedo em cima da foto (a linha fina ganha 34px de alvo, a página continua rolando por cima, e as setas do teclado também movem).
- O modo de ver (mosaico, quadra, linha do tempo) fica salvo por tela: galeria e cofre têm chaves próprias.
- **Visor de fotos:** tela inteira com deslizar para trocar de foto, pinça e toque duplo para zoom, puxar para baixo para fechar, um toque para esconder as barras, faixa de miniaturas, coração com animação, baixar, folha de detalhes (vincular ficha, mover de pasta, tipo, excluir) e, no computador, setas, `+`/`-`, `F`, `I` e `Esc`. `Esc` fecha. A mesma tela abre as fotos da ficha (aba **Fotos** e a capa) e as do cofre do Meu espaço.
- **Lembretes:** datas, edição, prioridade, conclusão e adiamento.
- **Ajustes:** perfil, tema, acessibilidade, sons e comemorações, PIN opcional, importação, exportação e pontos de restauração.
- **Painel:** nível e XP, desafios da semana (marcados automaticamente), aniversários e revisitas, roleta, cinturão da campeã do duelo, gráficos e conquistas.
- **Momentos:** uma surpresa do dia baseada no catálogo, resumo de fotos/vídeos/pessoas/notas, exploração por conexões, máquina do tempo, ambientes visuais e Modo apresentação com reprodução de fotos, miniaturas e trilha escolhida. Tudo é opcional: não há streak de login nem bloqueio de conteúdo.
- **Desafios:** Quiz do próprio catálogo, Modo Detetive com casos gerados a partir de relações reais, quebra-cabeça de fotos, “Quem é?”, objetivos semanais, cartas colecionáveis, editor rápido de cards, álbum paginado, Hall da fama, lugares/contextos e exportação de mural visual. As respostas usam somente dados já registrados.
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
- **Nunca a mesma frase:** cada resposta é sorteada entre dezenas de modelos por intenção e clima, combinados com risadas ("kkkk", "kakakaka"), emojis, vocativos e, de vez em quando, um textão inteiro dividido em bolhas. Os últimos modelos usados saem do sorteio.
- **Jeito de digitar de gente grande:** as palavras saem por inteiro — nada de "vc", "hj", "tá", "tô", "tbm", "entt" (abreviações viraram opção em Ajustes, desligada por padrão).
- **Várias mensagens seguidas:** você pode mandar quantas mensagens quiser em sequência. Ela lê tudo junto, com um tempo de leitura real, e responde uma única vez — se você mandar outra enquanto ela digita, ela para, relê e responde com o contexto novo, sem bolha solta.
- **Responder uma mensagem específica:** o botão de seta em cada bolha cita a mensagem original, como no direct do Instagram. Quando sua resposta é curta ("kkkk"), a citação é lida junto para ela entender o que você quis dizer.
- **Modo automático:** o botão **Deixar puxar** faz ela mandar mensagem sozinha depois de um tempo, retomando assunto ou lembrança.
- **Extras:** envio de foto na conversa e reação a ela, fotos ocasionais dela, sugestões de resposta e de abertura, cartão **Como ela conversa**, análise da conversa e exportação em Markdown.
- **IA de verdade (opcional):** em Ajustes → Conversas você conecta qualquer endpoint compatível com a API da OpenAI (OpenAI, OpenRouter, Groq, LM Studio, Ollama...). A IA escreve as respostas na hora; a mecânica (química, paciência, memória) continua no motor local e, se a IA falhar, ele responde sozinho. A chave fica só no seu aparelho.

### Conteúdo adulto

- Só existe para fichas com **18 anos ou mais** e depois de ligar o **modo adulto** em **Ajustes → Conversas** (desligado por padrão). Ficha com menos de 18 anos nunca entra em flerte nem em conteúdo adulto, mesmo com a opção ligada — inclusive com IA: ficha menor ou com vínculo de família nem usa IA.
- Com a química construída, o clima fica **quente de verdade** (desejo, tensão, insinuação forte), mas continua **sugestivo**: nada de descrição explícita de atos sexuais.
- Em **Ajustes → Conversas** ficam o ritmo de digitação, o medidor de química, as abreviações (opt-in), o uso de emojis e o modo automático.
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

## Aplicativo instalável e offline

- O Catalog instala como aplicativo (Chrome, Edge, Safari no iOS via “Adicionar à Tela de Início”): ícone próprio, tela cheia e sem barra do navegador.
- Uma faixa discreta no alto avisa quando você está **sem conexão** e, quando o navegador oferece, convida a **instalar** — “Agora não” vale só para a sessão.
- O service worker (`public/sw.js`) guarda a casca do app: abrir a página sem internet funciona. As fichas e fotos nunca passaram por ele — continuam no IndexedDB, no seu aparelho.
- O manifest é `public/manifest.webmanifest`, com ícones em 192, 512, maskable e o ícone do iOS.

## Saúde do catálogo

A tela responde a uma pergunta só: **o que está guardado aqui precisa de atenção?** Não é o Painel (números do catálogo) nem Organizar (categorias e coleções) — é manutenção.

- **Nota de 0 a 100** calculada a partir dos achados, com resumo do catálogo: fichas ativas, arquivadas e na lixeira, fotos, completude média, peso aproximado e idade do último backup.
- **12 tipos de achado**, cada um com gravidade (crítico, atenção, dica), o número do que foi encontrado e o caminho de saída: duplicatas, referências sem dono, fotos repetidas, fotos órfãs, fichas sem foto, fichas pela metade, fichas paradas há 90 dias, lixeira com mais de 30 dias, rascunhos esquecidos, lembretes atrasados, backup vencido e armazenamento acima de 70%.
- **Faxina de ponteiros:** um clique remove vínculo, item de tierlist, foto de álbum, mensagem de conversa e rascunho que apontam para algo que não existe mais. **Nenhuma ficha, foto, nota ou história é apagada** — a decisão de excluir continua sua, e a faxina entra no desfazer (`Ctrl+Z`) como qualquer alteração.
- Toda conta usa uma data de referência explícita (`agora`), então a mesma entrada dá sempre o mesmo resultado — e os testes não dependem do relógio da máquina.
- O domínio é `src/features/health/`, com facade pública (`index.ts`), README próprio e limites iguais aos das outras features.

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
- `H`: Saúde do catálogo. `K`: Pacotes. `F`: Favoritos. `S`: Modo rua.
- `/`: busca da página, ou busca global.
- `Ctrl+Z` e `Ctrl+Shift+Z`: desfazer e refazer alterações da sessão, fora dos formulários.
- `Esc`: fechar o modal atual, preservando rascunhos.
- **Galeria com o visor aberto:** `←`/`→` trocam a foto, `+` e `-` dão zoom, `F` favorite, `I` abre os detalhes e `Esc` fecha.
- **Galeria no teclado, sem o visor:** `S` entra na seleção em lote; com fotos escolhidas, `Shift` + clique estende o intervalo.
- **No aparelho, os gestos substituem as teclas:** deslizar da borda esquerda volta uma tela, segurar o título da tela aciona o pânico (≈0,7s), segurar uma foto ou um cartão abre a folha de ações, puxar a folha para baixo fecha, e no visor deslizar troca, pinça/`2 toques` zoom e puxar para baixo fecha.

## Implementação

- `ARCHITECTURE.md`: mapa de domínios, regras de dependência, limites de tamanho e plano de migração incremental. Cada feature nova deve começar por esse contrato.
- `src/features/discovery/`: domínio de exploração com facades (`index.ts`), README próprio e as telas `Momentos` e `Desafios` separadas de `src/components`.
- `src/features/people/`, `gallery/`, `relationships/` e `gamification/`: facades públicas e contratos de domínio para reduzir imports diretos de arquivos legados.
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
- `src/celular.css`: todo o sistema de toque (seções 11 a 17: casca, doca, folhas, gestos, galeria, visor, cofre e a UI refeita do aparelho). Nenhuma regra nasce fora de um `@media`, então o computador não é alcançado por ela.
- `src/computador.css`: só bloco `@media (min-width: 1101px)` — conversa em tela cheia, janela média e os rótulos dos modos na galeria.
- `src/assets.ts`: imagens locais embutidas no build. A fonte Inter também é incluída localmente.
- `src/features/health/`: domínio da saúde do catálogo — `diagnostico.ts` (análise pura, com data de referência) e a tela `components/SaudeDoCatalogo.tsx`.
- `src/lib/pwa.ts`: registro do service worker, convite de instalação e status de conexão do aparelho.
- `public/sw.js` e `public/manifest.webmanifest`: casca offline e identidade do aplicativo instalado.
- `.github/workflows/ci.yml`: a verificação (tipos, testes e build) que roda a cada pull request.

### O estilo por alvo do aparelho

`src/index.css` é só a porta: `base.css`, `celular.css`, `computador.css`, nessa ordem. A regra
do bolso não nasce fora de um `@media` no arquivo do celular, e a de janela larga não nasce na
base — é o que trava `tests/isolamento.test.ts`. Assim o `mobile.css` legado pôde ser aposentado
sem deixar buraco: as quatro coisas úteis que só ele fazia foram movidas e documentadas no lugar
certo (seção 16 “Peças sem dono” da base, seção 15.10 do celular), e o resto caiu junto com ele.
O que foi deixado de propósito, com o motivo: as regras para `.level-card`, `.gallery-photo` e o
`!important` do `.tier-bank` — nenhuma das três classes é usada por nenhum componente hoje, e o
`!important` só existia para brigar com o próprio arquivo aposentado; e o `display: none` do
`.topbar-profile`, porque no celular o retrato é justamente um dos três controles da pílula do
topo. A separação foi conferida como multiconjunto de declarações (9738 antes, 9738 depois):
nada foi perdido e nada foi inventado por engano no caminho.

## Validação

O build de produção é gerado pelo script `npm run build`, com saída em `dist/index.html` e recursos embutidos. Os testes (`npm test`) cobrem o catálogo com centenas de fichas, as telas novas, os sons (com um `AudioContext` falso), as ordenações, a linha do tempo, o `.ics` e a limpeza automática da lixeira, além de:

- `tests/chat.test.ts`: persona derivada da ficha, detecção de intenções, química e estágios, travas de idade e de clima, memória, variedade das respostas, sugestões e análise da conversa.
- `tests/toolbox.test.ts`: as 50 ferramentas (contagem, grupos, ids únicos), execução sem quebrar com catálogo vazio, resultado visível nas ferramentas de leitura, uso do `commit` nas que alteram dados e conferência das contas do dia a dia.
- `tests/toolbox-ui.test.tsx`: a tela Ferramentas navegando, filtrando e executando de verdade, e a conversa simulada abrindo pela ficha com medidor de química, humor automático e resposta salva.
- `tests/galeria-celular.test.tsx`: a conta do mosaico e da linha do tempo, os filtros e chips, a folha de ações, a barra do lote no pé da tela, o topo enxuto do celular e a tela da galeria aberta de verdade (mosaico → visor → favoritar → segurar → filtros → lote), a faixa grudada medida no pixel e o cofre do Meu espaço usando o mesmo mosaico, o mesmo lote e o mesmo visor.
- `tests/isolamento.test.ts`: o contrato da separação — a porta importa os três na ordem, nenhum `mobile.css` legado de volta, nada solto fora de `@media` no arquivo do celular e nada de largura de bolso na base.
- `tests/saude-catalogo.test.ts`: a análise e a faxina do domínio de saúde — catálogo em ordem não inventa pendência, a mesma data de referência dá o mesmo resultado, duplicata é crítica, ponteiro quebrado é reparável, lixeira/lembrete/backup são contados pela data de referência, a faxina limpa só o ponteiro e não toca em ficha, foto, álbum ou conversa.
- `tests/saude-ui.test.tsx`: a tela navegando de verdade — nota, cartões do resumo, achados com gravidade, filtro por gravidade, faxina com relatório e o achado que leva ao catálogo com o filtro pronto.
- `tests/pwa.test.ts`: o contrato do aplicativo instalável — manifest completo, ícones existindo no disco, casca guardada pelo service worker, registro fora do desenvolvimento e dispensar o convite valendo só na sessão.
- `tests/celular.test.ts`: o CSS do celular por inteiro — as seções 14.1 a 14.20 (medidas, topo, navegação, listas, gestos, formulários, conversa, toque), a doca sem gradiente e o círculo do “+” com rótulo e afundar no toque, o cluster do topo com o sino, o “⋯” e o retrato na mesma linha e a seta de voltar ocupando a mesma caixa do menu, o voltar pelo histórico, o deslizar da borda e o pânico por toque longo; a **seção 16** (mosaico foto-primeiro, anel do cartão fixado, pílula da doca atrás do ícone, ficha em tela cheia com a ação no pé, capa do cabeçalho com as ações rolando) e a **seção 17** (fatos em lista de definição, avaliações e metas em linha de 54px, trilha da linha do tempo no centro do ponto, painel com ritmo de seção, ajustes com campo em linha de cartão e gaveta com pílula atrás do ícone).

Os testes leem o CSS e os arquivos-fonte de propósito: os valores listados são o
contrato de quem usa no bolso (alvo de 46px, doca com o “+” sem gradiente — o círculo colorido vem depois, na camada própria da seção 15,
folha respeitando a área segura, azulejo com `content-visibility`, data grudada
no topo). Se você refizer alguma dessas telas, ajuste o teste junto com o CSS.

A última instalação de dependências reportou três alertas de auditoria npm (um baixo, um moderado e um alto). As atualizações compatíveis reduziram os alertas, mas uma revisão de segurança das dependências ainda é necessária antes de publicação pública.

Para homologar, use o modo demonstração e confira: criar/editar/recuperar rascunhos, arquivar/restaurar/excluir, exportar CSV e PNG, mover participantes nas tierlists, editar lembretes, criar notas/pastas/quadros, alternar tema, ativar privacidade e recarregar após o indicador de gravação confirmar sucesso.