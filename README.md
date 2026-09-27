# Catalog Manager

Catálogo pessoal em React, TypeScript e Vite, com interface em português brasileiro.
Tudo é guardado no próprio aparelho: nenhum servidor recebe as fichas, as fotos ou as notas.

O projeto vive em [`portuguese-catalog-manager-application (2)/`](portuguese-catalog-manager-application%20(2)).

## Como rodar

```bash
cd "portuguese-catalog-manager-application (2)"
npm install
npm run dev        # aplicativo em http://localhost:5173
```

Primeiro acesso: usuário `admin`, senha `admin` — ou **Explorar demonstração**, que abre
fichas fictícias sem tocar no catálogo real.

## Verificação

```bash
npm run typecheck  # TypeScript sem emitir
npm test           # suíte completa (469 testes, 32 arquivos)
npm run build      # dist/index.html, um arquivo só
```

O mesmo conjunto roda no CI a cada push em `main` e a cada pull request
(`.github/workflows/ci.yml`).

## Documentação

- [`README.md` do aplicativo](portuguese-catalog-manager-application%20(2)/README.md):
  telas, conversa simulada, privacidade, atalhos e validação.
- [`ARCHITECTURE.md`](portuguese-catalog-manager-application%20(2)/ARCHITECTURE.md):
  domínios, regras de dependência e plano de migração.
- [`MELHORIAS.md`](portuguese-catalog-manager-application%20(2)/MELHORIAS.md):
  diagnóstico do projeto e plano de evolução priorizado.
