/**
 * Português abreviado de quem digita no celular.
 *
 * O texto que aparece na conversa continua exatamente como você escreveu — isso
 * aqui é só para o motor entender: "vc viu o q eu te mandei hj?" precisa ser
 * lido como "você viu o que eu te mandei hoje?".
 */

/** Uma abreviação por linha, do jeito que o povo escreve. */
export const ABREVIACOES: Record<string, string> = {
  // Pronomes e pessoas
  vc: 'você', vcs: 'vocês', vce: 'você', voce: 'você', ce: 'você',
  cmg: 'comigo', ctg: 'contigo', cntg: 'contigo',
  // Verbos, tempo e ritmo
  hj: 'hoje', amnh: 'amanhã', amanha: 'amanhã', dps: 'depois', deps: 'depois',
  agr: 'agora', qdo: 'quando', qd: 'quando', qnd: 'quando', qto: 'quanto', qnt: 'quanto',
  qts: 'quantos', fds: 'fim de semana', ta: 'está', tah: 'está', tava: 'estava',
  to: 'estou', vamo: 'vamos', vms: 'vamos', vmos: 'vamos', flw: 'falou', flws: 'falou',
  xau: 'tchau', xauzinho: 'tchau', bye: 'tchau',
  // Conjunções e conectivos
  q: 'que', oq: 'o que', pq: 'porque', pke: 'porque', pqe: 'porque', prq: 'porque',
  tb: 'também', tbm: 'também', tmb: 'também', tbem: 'também',
  entt: 'então', entaum: 'então', entaun: 'então', ent: 'então', entao: 'então',
  msm: 'mesmo', msmo: 'mesmo', td: 'tudo', tdo: 'tudo', tds: 'todos',
  mto: 'muito', mt: 'muito', mta: 'muita', mtas: 'muitas', mtos: 'muitos',
  qq: 'qualquer', qqr: 'qualquer', nda: 'nada', nd: 'nada',
  // Reações, gírias e afeto
  blz: 'beleza', blzz: 'beleza', vlw: 'valeu', valew: 'valeu',
  obg: 'obrigado', obgd: 'obrigado', obgda: 'obrigada', brigado: 'obrigado', brigadao: 'obrigado',
  pf: 'por favor', pfv: 'por favor', pfvr: 'por favor', pls: 'por favor', plz: 'por favor',
  mds: 'meu Deus', vdd: 'verdade', sqn: 'só que não', pdc: 'pode crer',
  sla: 'sei lá', sdds: 'saudades', sdd: 'saudade', ngm: 'ninguém', ninguem: 'ninguém',
  gnt: 'gente', tmj: 'tamos juntos', lol: 'kkk',
  // Substantivos do dia a dia
  msg: 'mensagem', msgs: 'mensagens', ft: 'foto', fts: 'fotos',
  kd: 'cadê', kde: 'cadê', aki: 'aqui', aq: 'aqui', ai: 'aí',
  bj: 'beijo', bjs: 'beijos', bjos: 'beijos', abs: 'abraços', abcs: 'abraços',
  qm: 'quem', cmo: 'como', cm: 'com',
  // Escrito tudo junto, do jeito que o dedo manda
  vaiter: 'vai ter', vaidar: 'vai dar', pramim: 'para mim', namoral: 'na moral',
  tudobem: 'tudo bem', tudobom: 'tudo bom', porfavor: 'por favor', seila: 'sei lá',
  // Um pouco de inglês que entrou no papo
  sorry: 'desculpa', thx: 'valeu', omg: 'meu Deus', okay: 'ok',
};

/** Expressões de duas ou mais palavras que aparecem escritas junto ou torto. */
const FRASES: [RegExp, string][] = [
  [/\bo\s*q\b/gi, 'o que'],
  [/\bna\s*moral\b/gi, 'na moral'],
  [/\bpor\s*fav(or)?\b/gi, 'por favor'],
  [/\btudo\s*bem\b/gi, 'tudo bem'],
  [/\btudo\s*bom\b/gi, 'tudo bom'],
  [/\bo\s*q\s*e\b/gi, 'o que é'],
];

const PARTES = /[A-Za-zÀ-ÿ0-9']+/g;
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Devolve o texto com as abreviações abertas. O resto da frase fica intacto:
 * acentos, emojis, risadas e pontuação continuam iguais.
 */
export function expandirAbreviacoes(texto: string): string {
  if (!texto) return texto;
  let saida = texto;
  for (const [padrao, troca] of FRASES) saida = saida.replace(padrao, troca);
  saida = saida.replace(PARTES, palavra => {
    const troca = ABREVIACOES[normalizar(palavra)];
    if (!troca) return palavra;
    // Mantém a maiúscula de quem começou a frase.
    return /^[A-ZÀ-Ý]/.test(palavra) ? troca.charAt(0).toUpperCase() + troca.slice(1) : troca;
  });
  return saida;
}

/** As abreviações que apareceram na mensagem, na ordem em que foram escritas. */
export function abreviacoesNaMensagem(texto: string): string[] {
  const achadas: string[] = [];
  for (const palavra of texto.match(PARTES) || []) {
    const chave = normalizar(palavra);
    if (!ABREVIACOES[chave] || achadas.includes(chave)) continue;
    achadas.push(chave);
  }
  return achadas;
}
