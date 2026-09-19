import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * O estilo do app como o navegador o vê.
 *
 * São três arquivos — `base.css`, `celular.css` e `computador.css` — e o
 * `index.css` é a porta que os importa nessa ordem. Ler o concatenado deixa os
 * testes que procuram uma regra e conferem a ordem relativa entre seções
 * valendo sem terem que saber em qual arquivo cada seção mora; a ordem é lida
 * da própria porta, então trocar o load order é testado junto.
 */
const raiz = resolve(__dirname, "..", "src");
const porta = readFileSync(resolve(raiz, "index.css"), "utf8");

/** Os nomes dos arquivos, na ordem em que a porta os importa. */
export const arquivos = [...porta.matchAll(/@import "\.\/([\w-]+)\.css"/g)].map(m => m[1]);

export const cssDoApp = arquivos.map(nome => readFileSync(resolve(raiz, `${nome}.css`), "utf8")).join("\n");

/** Lê um arquivo de estilo do app pelo nome, sem extensão. */
export const ler = (nome: string) => readFileSync(resolve(raiz, `${nome}.css`), "utf8");
