# Voz das pessoas

Um catálogo de fotos lembra o rosto. Este domínio guarda o **som** — e responde a
duas perguntas diferentes:

1. **Como ela soa de verdade?** Áudios gravados ou enviados, guardados como
   `data:audio/...` na própria ficha (campo `vozes`). Entram no backup, no peso do
   catálogo e na faxina, como qualquer outro dado.
2. **Como ela soaria falando?** Uma voz do sistema (`speechSynthesis`) com **tom e
   ritmo estáveis por ficha**, definidos a partir do id — a mesma pessoa soa sempre
   igual, sem configurar nada. O que a pessoa ajustar na mão vence o automático.

## Contrato

```ts
import { VozDaPessoa, perfilDeVoz, textoDeApresentacao, resumoDaVoz, falar } from '@/features/voice';
```

- `voz.ts`: regras puras — perfil automático (`sementeDeVoz` + idade), limites de
  tamanho, contas do resumo, texto de apresentação montado da ficha.
- `sintetizador.ts`: `falar`, `pararDeFalar`, `vozesDisponiveis`, `escolherVoz`.
  Sem suporte no navegador, tudo devolve `false` em vez de estourar.
- `gravador.ts`: `iniciarGravacao` (MediaRecorder, mono, ~24 kbps), `lerArquivoDeAudio`
  e `medirDuracao`. Sem microfone, cada caminho explica o motivo em português.
- `components/VozDaPessoa.tsx`: as três abas — áudios, gravar, voz sintetizada.

## Regras

1. **Só `data:audio/...` entra** (checado em `safeVoz`, no `store`): backup estranho
   não vira fonte de áudio externa.
2. **Limites declarados:** 2 MB por áudio e 8 MB por pessoa (`VOZ_MAX_*`), com a
   mensagem explicando o motivo — áudio em base64 é o dado que mais engorda o
   catálogo.
3. **Gravação é leve de propósito:** mono e ~24 kbps opus dão cerca de 3 KB por
   segundo; dez minutos de voz cabem em menos de 2 MB.
4. **A voz sintetizada não imita ninguém.** Ela dá presença à ficha (e permite ouvir
   a conversa), mas quem quiser a voz real guarda um áudio.
5. Painel, Avisos e testes usam as mesmas funções — nada de conta de duração
   duplicada pelo aplicativo.
