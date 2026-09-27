# App

Camada de composição global: provider, navegação, privacidade, atalhos e montagem da casca do aplicativo.

A entrada histórica ainda é `src/App.tsx` porque ela é referenciada pela inicialização e por contratos de teste. Rotas, nomes de página e atalhos já vivem em `navigation.ts`; novos registradores globais devem ser extraídos para esta pasta sem colocar regra de negócio aqui.
