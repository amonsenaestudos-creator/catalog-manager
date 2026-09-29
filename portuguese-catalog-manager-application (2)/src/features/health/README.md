# Saúde do catálogo

Domínio que responde a uma pergunta só: **o que está guardado aqui precisa de atenção?**

Não é uma tela de estatística (isso é o Painel) nem de organização (isso é Organizar). É a
leitura de manutenção de um catálogo que vive só neste navegador: ficha pela metade, foto
repetida, referência apontando para quem não existe, lixeira acumulada, backup atrasado.

## Contrato

```ts
import { analisarSaude, repararCatalogo, resumoDoCatalogo } from '@/features/health';
```

- `analisarSaude(data, contexto)`: devolve `{ nota, achados, resumo }`. `contexto` traz
  `agora`, `ultimoBackup`, `usoBytes` e `cotaBytes` — nada dentro do domínio lê o relógio
  sozinho para decidir, então a mesma entrada dá sempre a mesma saída.
- `repararCatalogo(data, agora)`: faxina de **ponteiros**. Remove vínculo, item de tierlist,
  foto de álbum, mensagem de conversa e rascunho que apontam para algo que não existe mais.
  Nunca apaga ficha, foto, nota ou história — a decisão de excluir continua sendo sua.
- `resumoDoCatalogo(data)`: contagens e tamanho aproximado, para o cabeçalho da tela.

## Regras

1. Achado é dado real, com o número do que foi encontrado. Sem “talvez seja bom revisar”.
2. Gravidade é `critico` (risco de perder ou duplicar dado), `atencao` (dá trabalho depois)
   e `dica` (crescimento saudável do catálogo).
3. O que a máquina sabe arrumar sozinha vem com `reparavel: true`; o resto leva a pessoa
   até a tela certa (`pagina`) ou aplica um filtro pronto no catálogo (`filtro`).
4. Toda análise é reversível na interface: a faxina entra no desfazer (`Ctrl+Z`) como
   qualquer outra alteração.
