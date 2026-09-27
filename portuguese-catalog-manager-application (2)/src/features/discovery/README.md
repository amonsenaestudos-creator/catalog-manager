# Discovery

Responsável por experiências de exploração voluntária do catálogo:

- `Momentos`: surpresa do dia, máquina do tempo, ambientes e apresentação.
- `Desafios`: quiz, detetive, quebra-cabeça, cartas, álbum e hall da fama.

## Entrada

- `AppData` vindo do contexto global.
- Pessoas, fotos, coleções, relações e progresso já registrados.

## Saída

- Navegação para uma ficha, galeria, pastas, catálogo ou painel.
- XP somente quando uma atividade é realmente concluída.
- Exportações visuais que não alteram o catálogo.

## Não deve

- Inventar uma resposta que não exista nos dados.
- Controlar persistência diretamente.
- Alterar avaliação, conversa ou relações sem passar por um comando da feature ou pelo contexto.
- Criar obrigação de login, streak artificial ou bloqueio de conteúdo.

A composição visual fica em `components/`; as regras para perguntas e missões devem ficar em arquivos próprios conforme crescerem.
