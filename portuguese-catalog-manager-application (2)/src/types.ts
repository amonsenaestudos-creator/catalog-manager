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
  albumIds?: string[];
  hash?: string;
  capturedAt?: string | null;
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

/**
 * Vínculo familiar ou de convivência entre duas fichas do catálogo.
 * Serve para a conversa simulada poder falar da mãe, da filha, da irmã etc.
 */
export type VinculoPapel =
  | 'mae' | 'pai' | 'filha' | 'filho' | 'irma' | 'irmao' | 'avo' | 'avoh'
  | 'tia' | 'tio' | 'prima' | 'primo' | 'sobrinha' | 'sobrinho'
  | 'esposa' | 'marido' | 'namorada' | 'namorado' | 'sogra' | 'sogro' | 'nora' | 'genro'
  | 'amiga' | 'vizinho' | 'outro';

export interface Vinculo { id: string; personId: string; papel: VinculoPapel }

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
  aniversario?: string | null;
  pronome?: string;
  comoConheceu?: string;
  musicaFavorita?: string;
  signo?: string;
  customFields?: CustomField[];
  attachments?: Attachment[];
  ratingHistory?: RatingSnapshot[];
  rarity?: Rarity;
  pinned?: boolean;
  /** Familiares e pessoas próximas dela que também estão no catálogo. */
  vinculos?: Vinculo[];
  /** O que ela é sua: tia, prima, líder, colega... Muda a dinâmica da conversa. */
  vinculoComigo?: string;
}

export interface CustomField { id: string; label: string; value: string }
export interface Attachment { id: string; label: string; url: string; kind: 'link' | 'video' | 'pdf' | 'audio' | 'outro'; createdAt: string }
export interface RatingSnapshot { date: string; overall: number }
export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario';

export interface Reminder {
  id: string;
  personId: string | null;
  titulo: string;
  data: string;
  concluido: boolean;
  createdAt: string;
  descricao?: string;
  priority?: 'normal' | 'alta';
  notifiedAt?: string | null;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
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

export interface StoryChapter { id: string; title: string; content: string }
export interface Story {
  id: string;
  titulo: string;
  tipo: 'sexual' | 'picante' | 'detalhada';
  personId: string | null;
  conteudo: string;
  date: string;
  chapters?: StoryChapter[];
  favorite?: boolean;
  updatedAt?: string;
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
  sort: 'recent' | 'name' | 'rating' | 'seen' | 'updated' | 'completeness' | 'age' | 'lastSeen' | 'birthday';
  scope: 'active' | 'favorites' | 'archived' | 'trash';
  incomplete: boolean;
  collection: string;
  // Busca avançada combinada: vários critérios ao mesmo tempo.
  hair?: string;
  height?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  rarity?: string;
  folderOnly?: boolean;
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
  parentId?: string | null;
  pinned?: boolean;
  coverPhotoId?: string | null;
  sort?: 'recent' | 'name' | 'manual';
  order?: number;
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

export interface Album { id: string; name: string; description: string; color: string; photoIds: string[]; createdAt: string; updatedAt: string }
export interface Goal { id: string; title: string; done: boolean; personId: string | null; due: string | null; kind: 'pessoal' | 'conexao'; createdAt: string; doneAt?: string | null }
export interface Appointment { id: string; personId: string | null; title: string; date: string; time: string; place: string; notes: string; durationMinutes: number | null; status: 'agendado' | 'realizado' | 'cancelado'; createdAt: string }
export interface Conversation { id: string; personId: string | null; date: string; topic: string; content: string; createdAt: string }
export interface JournalEntry { id: string; date: string; mood: number; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string }
export interface PersonalLink { id: string; label: string; url: string; group: string; note: string; createdAt: string }
export interface AppNotification { id: string; title: string; body: string; kind: 'lembrete' | 'prazo' | 'revisita' | 'conquista' | 'sistema'; date: string; read: boolean; personId?: string | null; page?: string }
export interface Profile { id: string; name: string; color: string; createdAt: string }
export interface Duel { id: string; winnerId: string; loserId: string; date: string }
export interface Progress {
  xp: number;
  achievements: Record<string, string>;
  notified: Record<string, string>;
  duels: Duel[];
  swipes: Record<string, 'like' | 'pass'>;
  streak: { last: string; count: number };
  challenges: { week: string; done: string[] };
  lastActive: string;
  // Marcos já comemorados (níveis, cinturão do duelo) para não repetir a festa.
  celebrated?: Record<string, string>;
  konami?: boolean;
}
export interface Vault { pin: string | null; photoIds: string[] }

export type ChatMood = 'happy' | 'flirty' | 'shy' | 'playful' | 'curious' | 'neutral' | 'carinhosa' | 'fechada';
/** Tom da conversa. Os dois últimos só existem para fichas adultas com o modo adulto ligado. */
export type ChatTone = 'amizade' | 'flerte' | 'provocante' | 'intenso';

export interface ChatMessage {
  id: string;
  personId: string;
  role: 'user' | 'them' | 'system';
  text: string;
  timestamp: string;
  mood?: ChatMood;
  tom?: ChatTone;
  /** Foto trocada na conversa (data URL ou caminho local do catálogo). */
  foto?: string;
}

/**
 * Memória da conversa simulada com uma pessoa: química, assuntos já contados,
 * perguntas feitas e as últimas respostas (para ela nunca repetir a mesma frase).
 */
export interface ChatState {
  personId: string;
  /** 0 a 100. Sobe com interesse verdadeiro e desce com ousadia fora de hora. */
  afinidade: number;
  mensagens: number;
  humor: ChatMood;
  tom: ChatTone;
  /** Assunto → último trecho contado por você. */
  topicos: Record<string, string>;
  lembrancas: { tipo: string; valor: string }[];
  perguntas: string[];
  recentes: string[];
  /** Modelos de resposta já usados (ela não repete a mesma frase duas vezes seguidas). */
  usados: string[];
  /** Nomes de pessoas que você mencionou e ela passou a conhecer. */
  pessoas?: string[];
  ultimaMensagem: string;
  visitas: number;
  ofensas: number;
}

export interface Memory {
  id: string;
  personId: string | null;
  title: string;
  content: string;
  date: string;
  emotion?: 'happy' | 'funny' | 'sweet' | 'awkward' | 'special';
  tags?: string[];
  createdAt: string;
}

export interface Icebreaker {
  id: string;
  personId: string | null;
  text: string;
  category: 'fun' | 'deep' | 'light' | 'flirty' | 'nostalgic';
  used: boolean;
  createdAt: string;
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
  albums: Album[];
  journal: JournalEntry[];
  goals: Goal[];
  appointments: Appointment[];
  conversations: Conversation[];
  personalLinks: PersonalLink[];
    notifications: AppNotification[];
    progress: Progress;
    vault: Vault;
    profiles: Profile[];
    activeProfile: string;
    chats: ChatMessage[];
    chatStates: Record<string, ChatState>;
    memories: Memory[];
    icebreakers: Icebreaker[];
    onboardingDone?: boolean;
    tourSeen?: string;
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
    accent?: string;
    autoTheme?: boolean;
    browserNotifications?: boolean;
    notificationLeadDays?: number;
    revisitAfterDays?: number;
    splash?: boolean;
    panicEnabled?: boolean;
    blurMode?: boolean;
    density?: 'confortavel' | 'compacto';
    trashAutoCleanDays?: number;
    // Sons de interface gerados por código (ligados por padrão) e extras divertidos.
    sounds?: boolean;
    soundVolume?: number;
    haptics?: boolean;
    confetti?: boolean;
    // Conversas: modo adulto (opt-in), ritmo e estilo da simulação.
    // O clima da conversa sobe sozinho conforme a química — não há tom para escolher.
    adultMode?: boolean;
    chatSpeed?: 'pausado' | 'realista' | 'rapido';
    chatSlang?: boolean;
    chatEmojis?: boolean;
    chatMeter?: boolean;
    chatAuto?: boolean;
    chatDoNada?: boolean;
    // Quem está usando o catálogo: a idade muda o jeito que ela fala com você.
    ownerAge?: number | null;
    ownerBirthday?: string | null;
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

/**
 * Papéis de família usados nos vínculos entre fichas. `inverso` descreve a
 * relação na ficha da outra pessoa (ex.: se ela é mãe da Ana, a Ana é filha dela).
 */
export const VINCULO_PAPEIS: { value: VinculoPapel; label: string; inverso: string; familia: boolean }[] = [
  { value: 'mae', label: 'mãe', inverso: 'filha', familia: true },
  { value: 'pai', label: 'pai', inverso: 'filho', familia: true },
  { value: 'filha', label: 'filha', inverso: 'mãe', familia: true },
  { value: 'filho', label: 'filho', inverso: 'pai', familia: true },
  { value: 'irma', label: 'irmã', inverso: 'irmã(o)', familia: true },
  { value: 'irmao', label: 'irmão', inverso: 'irmã(o)', familia: true },
  { value: 'avo', label: 'avó', inverso: 'neta(o)', familia: true },
  { value: 'avoh', label: 'avô', inverso: 'neta(o)', familia: true },
  { value: 'tia', label: 'tia', inverso: 'sobrinha(o)', familia: true },
  { value: 'tio', label: 'tio', inverso: 'sobrinha(o)', familia: true },
  { value: 'prima', label: 'prima', inverso: 'prima(o)', familia: true },
  { value: 'primo', label: 'primo', inverso: 'prima(o)', familia: true },
  { value: 'sobrinha', label: 'sobrinha', inverso: 'tia(o)', familia: true },
  { value: 'sobrinho', label: 'sobrinho', inverso: 'tia(o)', familia: true },
  { value: 'esposa', label: 'esposa', inverso: 'esposo(a)', familia: true },
  { value: 'marido', label: 'marido', inverso: 'esposo(a)', familia: true },
  { value: 'namorada', label: 'namorada', inverso: 'namorado(a)', familia: false },
  { value: 'namorado', label: 'namorado', inverso: 'namorado(a)', familia: false },
  { value: 'sogra', label: 'sogra', inverso: 'genro/nora', familia: true },
  { value: 'sogro', label: 'sogro', inverso: 'genro/nora', familia: true },
  { value: 'nora', label: 'nora', inverso: 'sogra(o)', familia: true },
  { value: 'genro', label: 'genro', inverso: 'sogra(o)', familia: true },
  { value: 'amiga', label: 'amiga', inverso: 'amiga(o)', familia: false },
  { value: 'vizinho', label: 'vizinha(o)', inverso: 'vizinha(o)', familia: false },
  { value: 'outro', label: 'parente / conhecida', inverso: 'parente / conhecida', familia: false },
];

export const vinculoLabel = (papel: string) => VINCULO_PAPEIS.find(item => item.value === papel)?.label || papel;
export const vinculoInverso = (papel: string) => VINCULO_PAPEIS.find(item => item.value === papel)?.inverso || 'parente';
export const vinculoEhFamilia = (papel: string) => !!VINCULO_PAPEIS.find(item => item.value === papel)?.familia;

/**
 * O que ela é sua. A opção vazia deixa o simulador decidir pela idade:
 * acima de 35 anos ela entra na dinâmica de tia, e 20 anos de diferença
 * fazem ela te tratar como criança.
 */
export const VINCULO_COMIGO_OPTIONS: { value: string; label: string; familia: boolean; romance: boolean }[] = [
  { value: '', label: 'Automático (pela idade)', familia: false, romance: true },
  { value: 'tia', label: 'Minha tia', familia: true, romance: false },
  { value: 'tio', label: 'Meu tio', familia: true, romance: false },
  { value: 'mae', label: 'Minha mãe', familia: true, romance: false },
  { value: 'pai', label: 'Meu pai', familia: true, romance: false },
  { value: 'prima', label: 'Minha prima', familia: true, romance: false },
  { value: 'primo', label: 'Meu primo', familia: true, romance: false },
  { value: 'irma', label: 'Minha irmã', familia: true, romance: false },
  { value: 'irmao', label: 'Meu irmão', familia: true, romance: false },
  { value: 'avo', label: 'Minha avó', familia: true, romance: false },
  { value: 'amiga_da_familia', label: 'Amiga da família', familia: true, romance: false },
  { value: 'lider', label: 'Líder / igreja', familia: false, romance: false },
  { value: 'professora', label: 'Professora', familia: false, romance: false },
  { value: 'vizinha', label: 'Vizinha', familia: false, romance: true },
  { value: 'colega', label: 'Colega de trabalho / estudo', familia: false, romance: true },
  { value: 'crush', label: 'Interesse romântico', familia: false, romance: true },
];

export const vinculoComigoLabel = (value?: string) => VINCULO_COMIGO_OPTIONS.find(item => item.value === (value || ''))?.label || 'Automático (pela idade)';
export const vinculoComigoEhFamilia = (value?: string) => !!VINCULO_COMIGO_OPTIONS.find(item => item.value === (value || ''))?.familia;
export const vinculoComigoPermiteRomance = (value?: string) => VINCULO_COMIGO_OPTIONS.find(item => item.value === (value || ''))?.romance !== false;

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

export const PRONOME_OPTIONS = [
  'ela/dela',
  'ele/dele',
  'elu/delu',
  'ela/ele',
  'nenhum específico',
];

export const SIGNO_OPTIONS = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
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
export const INTIMATE_MIN_AGE = 18;

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
