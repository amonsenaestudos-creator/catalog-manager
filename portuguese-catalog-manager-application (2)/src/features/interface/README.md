# Domínio: interface

Regras de **apresentação**: quanta informação mostrar, em que ordem, por qual
caminho se chega ao resto e como a tela muda conforme o contexto. Nada aqui
guarda dado do catálogo — este domínio responde "como mostrar", não "o que é".

## Por que existe

O aplicativo já tinha funcionalidade suficiente. O que faltava era saber
**quando não mostrar alguma coisa**: uma ficha abria com treze botões do mesmo
peso, mais oito abas, mais um menu plano com doze linhas. A pergunta era "como
colocar tudo na tela?"; a pergunta certa é "em que momento a pessoa precisa de
cada função?".

## Arquivos

| Arquivo | O que decide |
| --- | --- |
| `densidade.ts` | Três degraus (compacta · confortável · espaçosa), migração do valor antigo (`compacto`) e a classe que o `<html>` recebe. |
| `revelacao.ts` | Quantos itens aparecem antes do "ver mais", quanto ficou de fora e como isso se escreve. |
| `acoes.ts` | Ações por contexto: categorias da ficha, grupos (Ações · Organização · Avançado) e o corte que escolhe as 2–4 ações da barra. |
| `foco.ts` | Modo foco: a preferência, a classe e o rótulo do botão. |
| `icones.ts` | id da ação → ícone, para a mesma ação ter o mesmo desenho em toda tela. |
| `components/BarraDeAcoes.tsx` | A barra contextual (primárias + "⋯"). |
| `components/MenuMais.tsx` | O menu agrupado: painel no computador, folha no celular. |
| `components/Revelar.tsx` | A seção que começa fechada com a contagem e abre com o conteúdo. |

## Regras que este domínio garante

1. **Uma decisão por vez.** A barra mostra no máximo `limite` ações (3 por
   padrão) e nunca se rende a uma barra de um botão só quando existe ação
   suficiente para dois.
2. **Ação perigosa não sobe sozinha.** Excluir mora no fim de "Avançado", com
   separação visual — nunca do lado do "Editar".
3. **Nada aparece duas vezes.** O que está na barra sai do menu; os grupos do
   menu ficam sem repetir id.
4. **A interface responde ao contexto.** Em Mídia a terceira ação é
   *Adicionar foto*, em Registros é *Nova nota*, em Avaliações é *Reavaliar*.
   No catálogo sem seleção, são *Buscar · Adicionar · Explorar*.
5. **O mesmo plano serve para a tela inicial.** O "⋯" do Início agrupa *Ações*
   (Surpreenda-me · Momentos) e *Avançado* (Ferramentas · Saúde do catálogo ·
   Ajustes) — e cada linha leva à página correspondente, sem inventar rota.
6. **O que é ferramenta espera.** Exportar, duplicar, imprimir, arquivar e
   lixeira não disputam a barra de quem abriu uma ficha para olhar.
7. **Nomes antigos continuam abrindo no lugar certo.** `categoriaDaAba('photos')`
   devolve `midia`: nenhuma chamada espalhada pelo aplicativo precisa mudar
   porque a aba virou categoria.

## Dependências

- Pode importar: `react`, ícones, `lib/dispositivo` e os componentes
  compartilhados de `components/ui` e `components/Folha`.
- Não pode conhecer `store`, `context` nem domínio de pessoas: se uma regra
  precisa de dado do catálogo, ela recebe o dado por parâmetro.
