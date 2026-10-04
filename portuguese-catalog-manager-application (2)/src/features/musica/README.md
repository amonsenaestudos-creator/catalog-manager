# Música por link

O som que acompanha o catálogo: o **Ambiente** do Momentos e a **Trilha** do
Modo apresentação. Nenhum arquivo de música entra no aplicativo — o que fica
guardado é o endereço que a pessoa escolheu.

## Dois jeitos de ouvir

### 1. Gerado aqui (o caminho principal)

O ambiente não pede licença a serviço nenhum: `ambiente.ts` monta o som com Web
Audio e **segura o áudio fora de qualquer tela**. Isso é o que faz o clima
continuar tocando enquanto a pessoa vai do Momentos para o catálogo.

| Clima | Como é feito |
| --- | --- |
| Chuva | Ruído branco filtrado (480 Hz–7,2 kHz) com um respiro lento no volume. |
| Oceano | Ruído marrom com filtro que abre e fecha como a maré, mais espuma aguda. |
| Café | Rumor abafado, conversas distantes em intervalos aleatórios e uma xícara de vez em quando. |
| Cidade | Rumor grave, zumbido de rede elétrica e carros passando ao longe. |
| Lo-fi | Acorde sustentado que troca a cada 6,4 s, baixo, batida macia e estalos de vinil. |

Regras do motor: um clima por vez; o contexto de áudio nasce no gesto da pessoa
(fora dele, o pedido fica pendente e começa no primeiro toque); sem Web Audio —
nos testes, por exemplo — tudo vira no-op e a interface avisa em vez de mentir.

### 2. Por link (o plano B)

Antes, "escolher uma trilha" só trocava uma etiqueta: a opção acendia, a cor do
painel mudava e toca — no máximo — um bip de interface. Não havia música. Agora
existe, com três decisões:

1. **Busca curada como ponto de partida.** Cada clima tem um termo escolhido
   ("chuva relaxante 1 hora", "lofi para estudar"), então o botão nunca abre uma
   tela vazia de busca.
2. **O link que a pessoa colar manda.** YouTube (vídeo, playlist, faixa), Spotify
   (faixa, álbum, playlist), SoundCloud e arquivo de áudio direto (`.mp3`,
   `.m4a`, `.ogg`, `.wav`…) tocam **dentro** do aplicativo; qualquer outro
   endereço abre no serviço, com o botão dizendo para onde vai.
3. **Só https entra.** `javascript:`, `data:` e hosts desconhecidos não viram
   player — e o que não tem player embutido é dito com todas as letras, em vez
   de fingir que tocou.

## Arquivos

| Arquivo | O que decide |
| --- | --- |
| `links.ts` | Lê o endereço: é seguro? de que serviço? toca aqui dentro ou só abre fora? |
| `catalogo.ts` | As músicas do aplicativo: os cinco climas do Ambiente, as quatro trilhas da apresentação e o `Sem música`. |
| `ambiente.ts` | O motor do som gerado: receitas por clima, volume, **um clima por vez** e o aviso de quando muda o que está tocando. |
| `components/PlayerDeMusica.tsx` | A peça visual: tocar aqui (volume), o link atrás de um botão, e o campo para colar. |
| `components/AmbienteBar.tsx` | A pílula que sobra fora da tela: pausar, volume e desligar. |

## Onde aparece

| Tela | Uso |
| --- | --- |
| Momentos → Ambiente | O clima escolhido começa a tocar no clique e abre o player logo abaixo das opções. |
| Qualquer tela | A pílula `AmbienteBar` (canto de baixo) enquanto houver clima ligado. |
| Momentos → Modo apresentação → Trilha | A faixa escolhida entra na versão compacta do player, ao lado das miniaturas. |
| Ficha → Sobre | "Música favorita" ganha o botão *Ouvir*, que abre a busca do nome guardado. |

## Contra o que este domínio se protege

- **Silêncio anunciado.** Quando o link não tem player, o aviso aparece em texto
  — melhor um recado honesto do que um botão que não faz nada.
- **Player de terceiro é de terceiro.** Sem Spotify logado, o embutido toca a
  prévia; sem internet, nenhum deles toca. Isso está escrito na própria tela.
- **Nada de autoplay escondido.** O play é sempre um gesto de quem está usando —
  o clima salvo só volta depois que a pessoa toca na página.
- **Ambiente que desmonta.** Cada receita devolve como se limpar (osciladores,
  temporizadores, camadas). Clima que não desmonta vira música fantasma depois da
  troca, e isso é bug, não recurso.
- **Som não derruba tela.** Nenhuma chamada de áudio pode lançar para fora do
  módulo: quando não dá, a interface escreve o motivo.
