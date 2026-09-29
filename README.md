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
npm test           # suíte completa (498 testes, 35 arquivos)
npm run build      # dist/index.html, um arquivo só (2,4 MB · 990 KB gzip)
```

O mesmo conjunto roda no CI a cada push em `main` e a cada pull request
(`.github/workflows/ci.yml`).

`node_modules/` e `dist/` **não** são versionados — são resultado, não código
(o `.gitignore` cuida disso, e `npm install` + `npm run build` regeneram os dois).
O repositório tem 193 arquivos versionados; antes eram 8.454, dos quais 8.282
eram dependências.

## Documentação

- [`README.md` do aplicativo](portuguese-catalog-manager-application%20(2)/README.md):
  telas, conversa simulada, privacidade, atalhos e validação.
- [`ARCHITECTURE.md`](portuguese-catalog-manager-application%20(2)/ARCHITECTURE.md):
  domínios, regras de dependência e plano de migração.
- [`MELHORIAS.md`](portuguese-catalog-manager-application%20(2)/MELHORIAS.md):
  diagnóstico do projeto, plano de evolução priorizado e o registro do que já
  saiu do plano (saúde do catálogo, PWA, voz das pessoas, compartilhamento e o
  emagrecimento do pacote e do repositório).
