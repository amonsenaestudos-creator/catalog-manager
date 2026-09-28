# Voz das pessoas

O som de verdade de quem está na ficha — **áudio gravado**, nunca sintetizado.

## O que o domínio responde

1. **Como ela soa?** Gravação do microfone (`MediaRecorder`, mono, ~24 kbps) ou
   arquivo que já existe no aparelho. Cada nota tem título, duração, peso,
   favorito, player, download, compartilhamento e exclusão.
2. **Quanto cabe?** 2 MB por áudio e 8 MB por pessoa. Acima disso a tela escreve
   o motivo em vez de estourar (e a Saúde do catálogo avisa no conjunto).
3. **O que sai daqui?** O arquivo com a extensão e o tipo reais (`formatoDoAudio`)
   e um nome legível (`nomeDoArquivoDeVoz`).

## Por que não há voz sintetizada

Havia, e saiu (rodada 4 de `MELHORIAS.md`). Um `speechSynthesis` falando “Oi, eu
sou Ana” **não é a voz da Ana** — é a voz da máquina. Isso é caro de manter,
difícil de explicar e ocupa o lugar do que importa: o áudio que a pessoa
gravou. Aqui o aplicativo não fala por ninguém.

## Arquivos

- `voz.ts`: regras puras — limites, contas do resumo, formato e nome do arquivo.
- `gravador.ts`: microfone (`iniciarGravacao`) e arquivos (`lerArquivoDeAudio`),
  com medidor de nível e limite de 300 s.
- `components/VozDaPessoa.tsx`: a tela (abas **Áudios** e **Gravar**).
- `index.ts`: a API pública do domínio.

Sem microfone ou sem suporte a gravação, cada caminho explica o motivo em
português — a tela nunca fica muda sem dizer por quê.
