/** Rotas, atalhos e códigos globais. Nenhuma regra de domínio deve morar aqui. */
export const PAGE_NAMES: Record<string, string> = {
  home: 'Visão geral', conversas: 'Conversas', dashboard: 'Painel', myspace: 'Meu espaço', agenda: 'Agenda', discover: 'Descobrir', moments: 'Momentos', games: 'Desafios', catalog: 'Catálogo', favoritos: 'Favoritos', rua: 'Modo rua', pacotes: 'Pacotes', toolbox: 'Ferramentas', add: 'Adicionar pessoa', ranking: 'Ranking', tierlists: 'Tierlists', gallery: 'Galeria', notes: 'Notas gerais', folders: 'Pastas', board: 'Quadro de investigação', stories: 'Stories / Fanfics', settings: 'Ajustes', reminders: 'Lembretes', tools: 'Organizar', taxonomy: 'Categorias e tags', collections: 'Coleções', drafts: 'Rascunhos', duplicates: 'Duplicatas', activity: 'Atividade', guide: 'Novidades', saude: 'Saúde do catálogo',
};

export const SHORTCUT_PAGES = ['home', 'catalog', 'ranking', 'tierlists', 'add', 'gallery', 'stories', 'settings'];

// Atalhos de letra: chegam rápido às telas novas sem mudar os atalhos antigos.
export const LETTER_PAGES: Record<string, string> = { d: 'dashboard', a: 'agenda', m: 'myspace', x: 'discover', g: 'gallery', r: 'reminders', o: 'folders', t: 'toolbox', p: 'conversas', f: 'favoritos', s: 'rua', k: 'pacotes' };

// Código Konami: ↑ ↑ ↓ ↓ ← → ← → B A liga (ou desliga) o tema disco.
export const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
export const MIRROR = ['arrowdown', 'arrowdown', 'arrowup', 'arrowup', 'arrowright', 'arrowleft', 'arrowright', 'arrowleft'];
