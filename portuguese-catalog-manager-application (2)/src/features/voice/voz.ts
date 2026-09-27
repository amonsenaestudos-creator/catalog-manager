/**
 * A voz das pessoas: as regras que não dependem do navegador.
 *
 * Aqui mora o que dá para conferir com um teste: qual voz do sistema combina
 * com cada ficha, quanto cabe de áudio no catálogo, o texto de apresentação
 * que ela fala e as contas da tela. O microfone, o `speechSynthesis` e os
 * arquivos ficam em `gravador.ts` e `sintetizador.ts`.
 */
import type { AppData, PerfilDeVoz, Person, VozNota } from '../../types';
import { ageFromBirthday, friendshipLabel, locationLabel } from '../../store';

/** Teto por nota: áudio em base64 engorda o backup mais rápido do que parece. */
export const VOZ_MAX_NOTA_BYTES = 2 * 1024 * 1024;
/** Teto de áudio por pessoa. Acima disso a tela pede uma limpeza. */
export const VOZ_MAX_PESSOA_BYTES = 8 * 1024 * 1024;
export const VOZ_TOM = { min: 0.6, max: 1.5, padrao: 1 };
export const VOZ_RITMO = { min: 0.7, max: 1.3, padrao: 1 };

export const pesoDoAudio = (url: string) => Math.round(url.length * 0.75);

export function notasDeVoz(person: Pick<Person, 'vozes'>): VozNota[] {
  return [...(person.vozes || [])].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export interface ResumoDaVoz {
  notas: number;
  duracao: number;
  bytes: number;
  favoritas: number;
}

export function resumoDaVoz(person: Pick<Person, 'vozes'>): ResumoDaVoz {
  const notas = person.vozes || [];
  return {
    notas: notas.length,
    duracao: notas.reduce((total, nota) => total + (nota.duracao || 0), 0),
    bytes: notas.reduce((total, nota) => total + pesoDoAudio(nota.url), 0),
    favoritas: notas.filter(nota => nota.favorite).length,
  };
}

/** Cabe mais uma nota? Se não, o motivo já vem escrito para a tela. */
export function cabeNovaNota(person: Pick<Person, 'vozes'>, bytes: number): { ok: boolean; motivo?: string } {
  if (bytes > VOZ_MAX_NOTA_BYTES) return { ok: false, motivo: `A nota passou de ${formatarPeso(VOZ_MAX_NOTA_BYTES)}. Grave um trecho menor.` };
  const total = resumoDaVoz(person).bytes + bytes;
  if (total > VOZ_MAX_PESSOA_BYTES) return { ok: false, motivo: `Esta ficha já tem ${formatarPeso(resumoDaVoz(person).bytes)} de áudio. Apague uma nota antes de guardar outra.` };
  return { ok: true };
}

export const formatarPeso = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function formatarDuracao(segundos: number) {
  const total = Math.max(0, Math.round(segundos || 0));
  const minutos = Math.floor(total / 60);
  return `${minutos}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Semente estável da ficha: o mesmo id dá sempre o mesmo número entre 0 e 1.
 * É o que faz cada pessoa soar igual toda vez que o app fala por ela.
 */
export function sementeDeVoz(id: string) {
  let valor = 2166136261;
  for (let i = 0; i < id.length; i++) valor = Math.imul(valor ^ id.charCodeAt(i), 16777619) >>> 0;
  return valor / 4294967296;
}

/**
 * Perfil automático: cada ficha ganha tom e ritmo próprios, sem precisar
 * configurar nada. O que a pessoa ajustou na mão sempre vence.
 */
export function perfilDeVoz(person: Pick<Person, 'id' | 'perfilVoz' | 'idade' | 'aniversario'>): Required<PerfilDeVoz> {
  const semente = sementeDeVoz(person.id || `ficha-${person.idade ?? 0}`);
  const idade = person.idade ?? ageFromBirthday(person.aniversario) ?? null;
  // Voz mais grave para quem é mais velho: uma pista a mais de quem está falando.
  const pesoDaIdade = idade === null ? 0 : Math.max(-0.12, Math.min(0.12, (40 - idade) / 160));
  const tom = person.perfilVoz?.tom ?? Math.max(VOZ_TOM.min, Math.min(VOZ_TOM.max, Number((0.9 + semente * 0.24 + pesoDaIdade).toFixed(3))));
  const ritmo = person.perfilVoz?.ritmo ?? Math.max(VOZ_RITMO.min, Math.min(VOZ_RITMO.max, Number((0.94 + (1 - semente) * 0.16).toFixed(3))));
  return { voz: person.perfilVoz?.voz ?? null, tom, ritmo };
}

/**
 * A apresentação que ela fala em voz alta: montada da própria ficha, como o
 * resto do aplicativo faz com a persona. Sem dado inventado.
 */
export function textoDeApresentacao(person: Person, data: AppData) {
  const primeiro = person.nome.trim().split(/\s+/)[0] || person.nome;
  const idade = person.idade ?? ageFromBirthday(person.aniversario);
  const partes: string[] = [`Oi, eu sou ${primeiro}.`];
  if (idade !== null && idade !== undefined) partes.push(`Tenho ${idade} anos.`);
  const lugar = locationLabel(person, data);
  if (lugar && lugar !== 'Sem categoria') partes.push(`A gente se conhece por ${lugar}.`);
  if (person.localizacaoMora) partes.push(`Moro em ${person.localizacaoMora}.`);
  if (person.descricao.trim()) partes.push(person.descricao.trim().replace(/\s+/g, ' ').slice(0, 220));
  const amizade = friendshipLabel(person.friendshipLevel);
  if (amizade) partes.push(`${amizade}, se você quiser saber.`);
  return partes.join(' ');
}

/** O que a tela mostra no lugar do nome quando a nota não tem título. */
export const tituloDaNota = (nota: Pick<VozNota, 'titulo'>) => nota.titulo?.trim() || 'Nota de voz';
