export interface Photo {
  id: string;
  url: string;
  type: 'normal' | 'biquini' | 'sem_nada';
  personId: string | null;
  isMain: boolean;
  name?: string;
  createdAt?: string;
  folderId?: string | null;
  description?: string;
  favorite?: boolean;
}

export interface BrokenNote {
  id: string;
  title: string;
  content: string;
  type: 'observacao' | 'rumor' | 'confirmado' | 'teoria' | 'desejo';
  date: string;
}

export interface Rating {
  mode?: 'weighted' | 'manual';
  overall: number;
  peitos: number;
  bunda: number;
  rosto: number;
  belezaGeral: number;
  corpo: number;
  cabelo: number;
  comportamento: number;
  quadril: number;
}

export interface Person {
  id: string;
  nome: string;
  descricao: string;
  idade: number | null;
  altura: string;
  rating: Rating;
  cabeloTipo: string;
  cabeloCor: string;
  cabeloCorCustom: string;
  pele: string;
  peleCustom: string;
  localizacaoOnde: string;
  localizacaoSub: string;
  localizacaoMora: string;
  tags: string[];
  qi: string;
  redesSociais: string;
  comportamento: string;
  notas: BrokenNote[];
  descricaoCorporal: string;
  fotos: Photo[];
  ultimoVisto: string | null;
  viHojeCount: number;
  viHojeDates: string[];
  createdAt: string;
  favorite?: boolean;
  updatedAt?: string;
  apelido?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  friendshipLevel?: number;
  tipoCorpo?: string;
  estiloRoupa?: string;
  observacoesGerais?: string;
}

export interface Reminder {
  id: string;
  personId: string | null;
  titulo: string;
  data: string;
  concluido: boolean;
  createdAt: string;
  descricao?: string;
  priority?: 'normal' | 'alta';
}

export interface ActivityItem {
  id: string;
  texto: string;
  tipo: 'pessoa' | 'foto' | 'nota' | 'story' | 'sistema' | 'ranking';
  personId?: string | null;
  data: string;
}

export interface CustomTag {
  nome: string;
  cor: string;
}

export interface BackupVersion {
  id: string;
  data: string;
  totalPessoas: number;
  snapshot: string;
}

export interface Story {
  id: string;
  titulo: string;
  tipo: 'sexual' | 'picante' | 'detalhada';
  personId: string | null;
  conteudo: string;
  date: string;
}

export interface TierListItem {
  personId: string;
  tier: string;
}

export interface TierList {
  id: string;
  nome: string;
  tiers: string[];
  items: TierListItem[];
  allowedCategories: string[];
  allowedSubcategories: string[];
  colors?: Record<string, string>;
  updatedAt?: string;
}

export interface CatalogFilter {
  query: string;
  category: string;
  subcategory: string;
  tag: string;
  minimum: number;
  photo: 'all' | 'with' | 'without';
  sort: 'recent' | 'name' | 'rating' | 'seen' | 'updated';
  scope: 'active' | 'favorites' | 'archived' | 'trash';
  incomplete: boolean;
  collection: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: CatalogFilter;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  personIds: string[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  personIds: string[];
  photoIds: string[];
  noteIds: string[];
  storyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneralNote {
  id: string;
  title: string;
  content: string;
  type: 'ideia' | 'observacao' | 'lembrete' | 'referencia';
  personIds: string[];
  folderId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationCard {
  id: string;
  title: string;
  content: string;
  status: 'observando' | 'conectando' | 'confirmado' | 'arquivado';
  personId: string | null;
  noteId: string | null;
  folderId: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationBoard {
  id: string;
  name: string;
  description: string;
  cards: InvestigationCard[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonDraft {
  id: string;
  kind: 'add' | 'edit' | 'quick';
  personId?: string;
  payload: Person;
  updatedAt: string;
}

export interface PersonTemplate {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  tags: string[];
}

export interface AppData {
  schemaVersion?: number;
  updatedAt?: string;
  people: Person[];
  orphanPhotos: Photo[];
  stories: Story[];
  tierLists: TierList[];
  reminders: Reminder[];
  activity: ActivityItem[];
  categories: LocationOption[];
  locations: string[];
  collections: Collection[];
  savedFilters: SavedFilter[];
  drafts: Record<string, PersonDraft>;
  ignoredDuplicates: string[];
  folders: Folder[];
  generalNotes: GeneralNote[];
  investigationBoards: InvestigationBoard[];
  personTemplates?: PersonTemplate[];
  noteDrafts?: Record<string, GeneralNote>;
  settings: {
    username: string;
    password: string;
    profileName: string;
    avatar: string;
    theme: 'dark' | 'light';
    pin: string | null;
    pinEnabled: boolean;
    customTags: CustomTag[];
    compactMode: boolean;
    rememberLogin?: boolean;
    privacy?: boolean;
    reducedMotion?: boolean;
    largeText?: boolean;
  };
}

export interface LocationOption {
  value: string;
  label: string;
  subs?: { value: string; label: string }[];
}

export const ALTURA_OPTIONS = [
  'muito alta',
  'alta',
  'minha altura',
  'um pouco baixa',
  'baixa',
  'baixinha',
];

export const CABELO_TIPO_OPTIONS = [
  'liso',
  'cacheado',
  'ondulado',
  'crespo',
  'solto',
  'preso',
  'curto',
  'medio',
  'longo',
  'raspado',
  'trancado',
  'dreadlock',
  'black power',
  'coque',
  'rabo de cavalo',
  'chanel',
  'franja',
  'mullet',
  'undercut',
  'pixie',
  'moicano',
  'afro',
  'twists',
  'box braids',
  'lace',
  'extensão',
];

export const TIPO_CORPO_OPTIONS = [
  'esguio',
  'atlético',
  'curvilíneo',
  'robusto',
  'plus size',
  'padrão',
  'personalizado',
];

export const ESTILO_ROUPA_OPTIONS = [
  'casual',
  'social',
  'esportivo',
  'clássico',
  'alternativo',
  'streetwear',
  'romântico',
  'minimalista',
  'vintage',
  'criativo',
  'personalizado',
];

export const FRIENDSHIP_LEVELS = [
  { value: 0, label: 'Ainda não conheço bem' },
  { value: 1, label: 'Conhecida' },
  { value: 2, label: 'Contato ocasional' },
  { value: 3, label: 'Amizade em construção' },
  { value: 4, label: 'Amiga próxima' },
  { value: 5, label: 'Amizade muito próxima' },
];

export const ADULT_APPEARANCE_TAGS = ['gostosa', 'bonita', 'bonitinha', 'cavala', 'gata', 'gatinha', 'dá pra ir', 'da pra ir'];

export const CABELO_COR_OPTIONS = [
  'preto',
  'castanho escuro',
  'castanho claro',
  'loiro',
  'ruivo',
  'grisalho',
  'branco',
  'colorido',
];

export const PELE_OPTIONS = [
  'branca',
  'parda',
  'morena',
  'negra',
  'amarela',
  'indigena',
  'personalizado',
];

export const QI_OPTIONS = [
  'abaixo da media',
  'medio',
  'acima da media',
  'alto',
  'genio',
];

export const TAG_OPTIONS = [
  'friendzone',
  'desconhecida',
  'crush',
  'alvo',
  'conhecida',
  'amiga',
  'gostosa',
  'bonita',
  'bonitinha',
  'cavala',
  'gata',
  'gatinha',
  'dá pra ir',
];

// Subcategorias escolares por ano foram retiradas do catálogo.
// Valores antigos são limpos na leitura dos dados.
export const RETIRED_SUBCATEGORY_VALUES = ['6ano', '7ano', '8ano', '9ano', '1em'];

// Usado para liberar os campos íntimos somente quando a ficha informa 18 anos ou mais.
export const INTIMATE_MIN_AGE = 1;

export const TIER_CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'escola', label: 'Escola' },
  { value: 'comunidade', label: 'Comunidade / Rua' },
  { value: 'igreja', label: 'Igreja' },
  { value: 'conhecida', label: 'Conhecida' },
  { value: 'fsy', label: 'FSY' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'academia', label: 'Academia' },
];

export const LOCATION_OPTIONS: LocationOption[] = [
  {
    value: 'escola',
    label: 'Escola',
    subs: [
      { value: 'pentagono', label: 'Pentágono' },
      { value: 'faculdade', label: 'Faculdade' },
      { value: 'curso', label: 'Curso técnico' },
      { value: 'professoras', label: 'Professoras' },
    ],
  },
  {
    value: 'comunidade',
    label: 'Comunidade / Rua',
    subs: [
      { value: 'adulta', label: 'Adulta' },
      { value: 'jovem', label: 'Jovem' },
      { value: 'mae', label: 'Mãe' },
    ],
  },
  {
    value: 'igreja',
    label: 'Igreja',
    subs: [
      { value: 'mocas', label: 'Moças' },
      { value: 'soc_soc', label: 'Soc. Soc.' },
      { value: 'jas', label: 'JAS' },
      { value: 'sisters', label: 'Sisters' },
    ],
  },
  { value: 'conhecida', label: 'Conhecida' },
  { value: 'fsy', label: 'FSY' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'academia', label: 'Academia' },
];

export const RANKING_CATEGORIES = [
  { value: 'todas', label: 'Todas' },
  {
    value: 'escola',
    label: 'Escola',
    subs: [
      { value: 'pentagono', label: 'Pentágono' },
      { value: 'faculdade', label: 'Faculdade' },
      { value: 'curso', label: 'Curso técnico' },
    ],
  },
  {
    value: 'comunidade',
    label: 'Comunidade / Rua',
    subs: [
      { value: 'adulta', label: 'Adulta' },
      { value: 'jovem', label: 'Jovem' },
      { value: 'mae', label: 'Mãe' },
    ],
  },
  {
    value: 'igreja',
    label: 'Igreja',
    subs: [
      { value: 'mocas', label: 'Moças' },
      { value: 'soc_soc', label: 'Soc. Soc.' },
      { value: 'jas', label: 'JAS' },
      { value: 'sisters', label: 'Sisters' },
    ],
  },
  { value: 'conhecida', label: 'Conhecida' },
  { value: 'fsy', label: 'FSY' },
];
