/** * Repertório de falas: os bancos de frases que o motor de conversa usa no
 * ÚLTIMO estágio (gerar texto). Nada aqui entende, interpreta ou decide —
 * isso é `dialogue/engine.ts` e `dialogue/understanding.ts`.
 *
 * O nome antigo (`voz.ts`) confundia: não tem a ver com áudio nem com voz
 * sintetizada, e sim com as frases escritas disponíveis.
 */
/**
 * A voz da conversa simulada.
 *
 * Este arquivo guarda três coisas que deixam o papo menos padronizado:
 *
 *  1. **Bancos extras**: muito mais jeitos de responder cada assunto. Eles são
 *     somados aos bancos do `dialogue.ts`, então a ficha nunca repete a mesma
 *     frase e cada tom (amizade, flerte, picante) tem repertório próprio.
 *  2. **Recepções por assunto**: uma linha curta que mostra que ela entendeu o
 *     que você falou (trabalho, igreja, cansaço, amor...) antes da resposta.
 *  3. **Nomes**: reconhecer o nome dela, o seu e o dos familiares cadastrados
 *     (mãe, filha, irmã...) para responder já falando da pessoa certa.
 *
 * Nada aqui depende de reagir a conteúdo adulto: quem decide o que pode
 * acontecer numa relação é `relacao.ts`, e o `dialogue.ts` continua sendo a
 * única porta de entrada.
 */

export type FamiliaDeFala = 'amizade' | 'flerte' | 'picante';
export type BancoDeFalas = Partial<Record<FamiliaDeFala, string[]>>;

/**
 * Mais respostas por intenção. Somadas às de `dialogue.ts`, uma mesma intenção
 * passa a ter entre 10 e 25 finalizações diferentes — o papo para de soar
 * decorado.
 */
export const MAIS_RESPOSTAS: Record<string, BancoDeFalas> = {
  pedido_audio: {
    amizade: [
      'Áudio não, meu bem. Eu escrevo melhor do que falo',
      'Prefiro escrever. Na voz eu me embolo toda',
      'Tô sem coragem de gravar hoje, mas o recado vai por aqui',
      'Não gosto de ouvir a minha voz, mas com você eu converso o quanto quiser',
      'Se eu gravar, você vai rir do jeito que eu falo. Melhor eu escrever',
    ],
    flerte: [
      'Só se você prometer guardar só pra você',
      'Mando sim, mas só depois que você contar uma coisa sua primeiro',
      'Áudio meu tem que merecer, viu? Me conquista mais um pouco',
    ],
    picante: [
      'Mando sim, mas com a voz daquele jeito que você gosta',
      'Vou gravar um só pra você, e você não mostra pra ninguém',
    ],
  },
  saudacao: {
    amizade: [
      'Oi! Bom te ver por aqui, tava justamente pensando em quem me mandaria mensagem hoje',
      'Oie! Tudo certo por aqui, tirei o dia pra arrumar a casa e agora tô de boa',
      'Oi! Acabei de sentar no sofá, tinha torcido pro celular tocar kkk',
      'Oi, {nome}! Que hora boa pra aparecer',
      'Opa! Chegou na hora, tava com vontade de conversar com alguém que presta',
      'Oi! Sobrevivi ao dia, isso já é uma vitória',
      'Oii! Faz quanto tempo que a gente não se fala? Me conta as novidades',
      'Oi! Tô aqui tomando um café e lendo bobagem na internet. E você, por onde anda?',
      'Olá! Se você me pegasse dez minutos antes eu estava dormindo kkk',
      'Oi! Semana pesada, mas chegou sexta e eu sobrevivi 🙌',
    ],
    flerte: [
      'Oii 😏 apareceu bem na hora em que eu tava lembrando de você, coincidência forte',
      'Oi, você 😊 eu ia dizer que tava ocupada, mas pra você eu abro espaço',
      'Opa, melhorou meu dia do nada. O que você quer de mim, hein?',
      'Oi! Você tem esse costume de aparecer quando eu tô pensando besteira',
      'Oi, {nome} 😏 tava esperando um assunto bom e ele chegou',
      'Oii, tava deitada aqui sem fazer nada, agora já tenho companhia',
      'Oi! Com esse horário e esse oi, eu já começo a sorrir aqui 😅',
      'Oi, gostei que você veio me mostrar a cara hoje',
    ],
    picante: [
      'Oi, você 😏 chegou quietinho e ainda assim me deixou sem jeito',
      'Oii 🔥 eu tava no banho pensando em quem ia me salvar da monotonia',
      'Oi! Tava aqui com a cabeça longe, você chegou na hora errada — ou certa 😏',
      'Hmm, oi 😍 esse horário pra falar comigo é perigoso, viu',
      'Oi, {nome} 😏 tô sozinha, sem pressa e com vontade de conversar',
    ],
  },
  despedida: {
    amizade: [
      'Já vai? Vai com cuidado, depois me conta o resto 😊',
      'Beijinho! Amanhã eu te falo do que deu certo aqui',
      'Tá bom, fala comigo quando puder, eu sempre respondo',
      'Boa noite! Dorme bem e manda notícia amanhã',
      'Vai lá, obrigada pela conversa. Você me fez rir 👍',
      'Até mais! Se cuidar é importante, hein',
      'Falou, {nome}! Descansa que amanhã a gente continua',
      'Tchau! Vou ficar aqui torcendo pro seu dia ser melhor que o de hoje',
    ],
    flerte: [
      'Já?! 😩 você vai me deixar olhando o celular, né',
      'Vai com Deus, mas não demora muito 😏',
      'Beijinho no vácuo não, né? Manda um de verdade na próxima',
      'Tchau, viu. Vou dormir pensando na resposta que eu devia ter dado 😅',
      'Até amanhã! Digitei três vezes um beijo e apaguei, esse ficou de longe 😘',
      'Vai lá 😏 mas eu não esqueço fácil do que você disse hoje',
    ],
    picante: [
      'Vai sim 😏 eu fico aqui com a cabeça cheia, obrigada viu',
      'Beijão, meu bem. Boa noite do jeitinho que a gente deixou a conversa 😌',
      'Tchau! Se não dormir direito hoje a culpa é sua, tá registrado 😏',
      'Vou deitar. Se eu sonhar com você, amanhã te conto — talvez 🔥',
    ],
  },
  resposta_curta: {
    amizade: [
      'Só isso? kkk me fala mais um pouco, tô com tempo',
      'Ok, entendi. E você tá com paciência pra falar hoje ou foi só um oi?',
      'Tá parecendo que você tá digitando com sono 😅',
      'Certo. Vou aproveitar e continuar o assunto então',
      'Boa resposta, hein? Economizou nas palavras kkk',
      'Sei. E aí, o que você anda fazendo nesse fim de semana?',
      'Aham. Continua, eu tô lendo tudo',
      'Tá bom, vou fingir que foi uma resposta completa 😊',
      'Curta assim eu fico curiosa. Desembucha',
      'Ok! Mudando de assunto então, porque você não vai falar mais nada kkk',
    ],
    flerte: [
      'Eu gosto de quem fala pouco, mas uma palavra dessa machuca 😏',
      'Só isso? Vou ter que inventar assunto pra você continuar',
      'Hmm, resposta seca. Tá com vergonha de mim? 😊',
      'Essa patada discreta ficou boa, viu',
      'Se você tá economizando palavras é porque ainda não me conhece direito',
      'Ok, {nome} 😏 mas eu vou cobrar mais que isso',
    ],
    picante: [
      'Só isso? Eu tava esperando mais audácia 😏',
      'Resposta curtinha, mas o pensamento veio longo, né? 🔥',
      'Hmm. Direto e seco. Gostei, mas fala mais',
      'Se você responder assim quando me ver, eu passo mal 😏',
    ],
  },
  pergunta_fato: {
    amizade: [
      'Nossa, pergunta difícil kkk deixa eu pensar',
      'Você pergunta cada coisa. Vou responder com honestidade: depende do dia',
      'Acho que sim, mas não confia muito em mim, eu mudo de opinião fácil',
      'Pois é, né? Eu já pensei muito nisso',
      'Resposta curta: sim. Resposta longa: a gente conversa no domingo',
      'Nunca me pegaram nessa antes, olha só',
      'Eu ia mentir, mas vou te falar a verdade: não sei 😅',
      'Depende do contexto. Me conta um pouco mais que eu respondo direito',
      'Boa pergunta, e eu não tenho resposta pronta. Vou pensar com você',
      'Vou responder a sua com uma pergunta: e você, já viveu isso?',
    ],
    flerte: [
      'Curioso hoje, né? Pergunta e a resposta pode te surpreender 😏',
      'Você quer me conhecer por dentro, eu percebo',
      'Respondo, mas quero a verdade sua depois',
      'Depende do que você faz com a resposta que eu te der',
      'Nossa, perguntou sério. Eu gosto quando você demonstra interesse',
      'Vou responder baixinho pra você prestar atenção: depende de você 😏',
      'Hmm, é uma pergunta de quem tá pensando mais longe',
    ],
    picante: [
      'Pergunta boa 😏 a resposta você só escuta bem perto',
      'Você tá querendo me conhecer ou me provocar? 🔥',
      'Respondo, mas depois você me responde uma também',
      'Se eu te contar agora, perde a graça. Te mostro outra hora 😏',
    ],
  },
  pergunta_pessoal: {
    amizade: [
      'Gosto de coisa simples: café bom, música alta na hora certa e gente honesta',
      'Meu lugar favorito é a cozinha da minha casa em dia de preguiça',
      'Eu sou mais de ficar em casa do que sair, mas quando saio eu aproveito',
      'Aprendi a gostar de silêncio depois dos trinta kkk',
      'Uma coisa que quase ninguém sabe: eu canto alto quando tô sozinha',
      'Eu coleciono listas de coisas que eu ainda vou fazer. Tenho umas cem',
      'Prefiro conversa de madrugada do que festa cheia de gente',
      'Odeio mentira pequena e gosto de quem fala direto',
      'Sou teimosa, carinhosa e desconfiada na mesma medida',
      'Meu domingo ideal tem igreja de manhã, comida de panela e cochilo depois',
      'Que pergunta! Eu gosto de gente que escuta, já é metade do caminho',
      'Hoje eu tô na fase de fazer o que me dá paz, sem pedir licença',
    ],
    flerte: [
      'Isso te interessa mais do que devia, né? Vou responder: gosto de quem me faz rir',
      'Eu curto perfume, roupa cheirosa e conversa olhando nos olhos',
      'O que eu gosto? De chegar em casa e ter alguém querendo saber do meu dia',
      'Prefiro cafuné a presente caro, mas os dois juntos são bem-vindos 😏',
      'Gosto de quem tem atitude sem ser atrevido. A gente conversa mais disso depois',
      'Vou te falar: eu me derreto por atenção de qualidade',
      'Você tá perguntando com um motivo, e eu tô deixando 😊',
    ],
    picante: [
      'Você quer saber o que me agrada? Inteligência e mão firme, e olha que eu falei só o primeiro item 😏',
      'Gosto de lugar silencioso, mas não de alma silenciosa 🔥',
      'Prefiro quem sabe esperar o tempo certo. Você tem essa paciência?',
      'Café quente, conversa longa e depois você decide o resto 😏',
    ],
  },
  pergunta_sobre_mim: {
    amizade: [
      'O que eu acho de você? Que você é gente boa e fala comigo sem querer nada. Isso vale muito',
      'Te acho interessante, sim. E olha que eu sou difícil de impressionar',
      'Você tem um jeito calmo que me faz confiar, pode escrever isso',
      'Acho que a gente tem uma conversa rara, dessas que não precisa forçar',
      'Gosto do seu jeito, mas não vou te contar tudo de uma vez não kkk',
      'Te acho esforçado e atencioso. Duas coisas raras juntas',
      'Eu penso em você em alguns momentos, do nada. Já confessou isso a alguém?',
      'Você me fez companhia em dias que eu nem contei pro povo que tava difícil',
    ],
    flerte: [
      'Você quer mesmo saber? Então: eu olho suas mensagens antes das outras 😊',
      'Confesso que eu gosto disso que a gente tem. E que eu penso em você mais que devia',
      'Você me interessa, claro. Tanto que eu demorei pra responder aqui pra não parecer ansiosa 😅',
      'Se eu falar tudo, você vai usar contra mim depois 😏',
      'Eu te acho bonito e engraçado, combinação perigosa',
      'Você tem lugar garantido nos meus pensamentos de fim de noite',
      'Do que eu sinto? Uns 80% sim. Os outros 20% a gente resolve pessoalmente 😏',
      'Você mexe comigo de um jeito calmo, e é isso que me pega',
      'Eu gosto de você, sim, {nome}. E agora você faz o que quiser com essa informação',
    ],
    picante: [
      'Eu penso em você e o pensamento não fica comportado 🔥',
      'Você me dá vontade de esquecer a pressa. E olha que eu tenho fama de apressada 😏',
      'Você me agrada por inteiro, e eu não tô sendo educada agora',
      'Se eu te contar o que passa na minha cabeça você fica sem resposta',
      'Eu te acho perigoso, no melhor sentido da palavra 😏',
    ],
  },
  pergunta_idade: {
    amizade: [
      'Eu tenho {idade} anos, e me sinto ótima com isso 😊',
      'Fiz {idade} e ganhei a mania de dormir cedo kkk',
      '{idade}. E antes que você pergunte: sim, eu tomo conta dos meus pais',
      'Estou nos {idade}, idade boa de quem já aprendeu a dizer não',
      'Minha idade é essa, e o resto você descobre conversando',
      '{idade}. Não escondo, minha pele entrega mesmo 😄',
      'Tenho {idade} anos, ficha limpa, só um pouco cansada da vida 😅',
      'A resposta é {idade}. E você, quantos?',
    ],
    flerte: [
      '{idade} 😏 e você tem cara de quem gosta de quem tem assunto',
      'Faço {idade}, mas o meu nível de paciência é de ninfeta... brincadeira 😄',
      '{idade}. Mais velha, mais calma e bem melhor de papo',
      'Tenho {idade}, e idade pra mim é detalhe quando a conversa encaixa 😊',
      '{idade} 😏 gosta de mais velha? porque esse trem já deu certo antes',
      'Estou com {idade}, e com muito mais bom senso do que aos vinte 😄',
    ],
    picante: [
      '{idade} 😏 e te garanto que a experiência faz diferença',
      'Tenho {idade}, sem contar as histórias que eu não conto aqui 🔥',
      '{idade}, e eu ainda tenho energia pra gastar com quem merece',
    ],
  },
  pergunta_familiar: {
    amizade: [
      'A minha {papel}, a {familiar}, tá bem! Perguntei dela ontem por coincidência',
      'A {familiar} tá ótima, mandou um beijo 😊 vou repassar seu abraço',
      'Tá tudo bem com a {familiar}. Ela vive perguntando de quem eu falo aqui kkk',
      'A {familiar} tá naquela rotina de sempre: trabalho, casa e igreja',
      'Você perguntou na hora certa, acabei de falar com a {familiar}',
      'A {familiar} tá bem, obrigada por lembrar. Isso é raro, viu',
      'Semana passada a {familiar} me apareceu aqui em casa do nada kkk',
      'A {familiar} tá melhorando de um resfriado chato. Ela agradece a preocupação',
      'Tô conseguindo ver mais a {familiar} nesse mês, tô feliz com isso',
      'A {familiar} é meu porto seguro, se eu contar as histórias dela você chora de rir',
      'Mandei uma mensagem pra {familiar} falando de você, ela mandou te conhecer 😄',
      'A {familiar} tá na fase de fazer arte na cozinha, e eu sou a cobaia',
    ],
    flerte: [
      'A {familiar} tá bem 😊 e você, tá me perguntando da família pra me agradar, né? Funcionou',
      'A {familiar} tá ótima. Ela ia gostar de você, você tem cara de ser bem-educado kkk',
      'Tá tudo certo com a {familiar}. Mas eu prefiro que você pergunte de mim 😏',
      'A {familiar} tá bem, mas quem tá sorrindo aqui com a sua atenção sou eu',
      'Você quer conhecer a {familiar}? Calma, primeiro eu te conheço direito 😏',
    ],
  },
  elogio: {
    amizade: [
      'Obrigada! Eu tava precisando ouvir isso hoje, de verdade',
      'Ah, para 😊 você vai me deixar convencida',
      'Que bom que você fala isso. Eu ando meio invisível na correria',
      'Obrigada, viu. Guardei aqui pra usar nos dias difíceis',
      'Você tem um jeito de elogiar que não parece da boca pra fora',
      'Poxa, obrigada 🙂 você também não é de jogar conversa fora',
      'Tô sorrindo aqui igual boba, olha o que você faz',
      'Vou aceitar o elogio sem discutir hoje, porque eu tô merecendo kkk',
      'Isso me pegou num dia cheio. Obrigada mesmo',
      'Você repara nos detalhes, isso agrada a gente',
    ],
    flerte: [
      'Falou assim e eu fiquei sem saber onde colocar as mãos 😳',
      'Obrigada 😏 mas cuidado, eu me acostumo fácil com isso',
      'Ele é elogio ou convite? Porque eu já tô respondendo como convite 😄',
      'Você tem licença pra falar isso comigo, viu? Anotado',
      'Tô achando que você treina essas frases antes de mandar 😏',
      'Ai, para. Eu tenho fama de séria e você tá arruinando minha reputação',
      'Se você continua assim, eu vou passar a esperar essa mensagem todo dia',
      'Vindo de você o elogio parece verdade, e é isso que me desmonta',
      'Fica sabendo que eu li isso mais de uma vez 😅',
      'Você diz as coisas no momento certo, isso é um talento perigoso',
    ],
    picante: [
      'Falando desse jeito eu já começo a pensar no que você não escreveu 🔥',
      'Você me deixa com uma vontade de responder coisa que não cabe aqui 😏',
      'Nem sei o que dizer sem passar do ponto, então toma: obrigada 😏',
      'Elogio bom é assim, chega junto com a vontade de te ver',
      'Cuidado, {nome}, elogio aqui engrossa a conversa 🔥',
      'Se eu te responder com sinceridade você fica desconcertado 😏',
    ],
  },
  elogio_corpo: {
    amizade: [
      'Vou levar como elogio, mas comporta o vocabulário kkk',
      'Ó, eu já fui elogiada com mais jeito, mas aceito a intenção 😄',
      'Assim eu fico sem graça. Melhor falar do meu sorriso, funciona mais',
      'Você tá babando, né? Eu percebo kkkk',
      'Valeu pela coragem, mas eu gosto quando o papo é mais cuidado 😊',
      'Desse jeito você perde a chance de me conhecer de verdade',
    ],
    flerte: [
      'Olha o lugar que você foi reparar 😳',
      'Você não tem vergonha, né? Eu gostei disso 😏',
      'Anotado, mas eu cobro pessoalmente depois',
      'Hmm, elogio certeiro. Você tem prática 😏',
      'Calma, seu atrevido. Uma coisa de cada vez',
      'Eu fico sem jeito, mas não vou dizer que não gostei',
      'Você fala assim com todo mundo ou eu ganhei tratamento especial?',
      'Isso me deu um calor aqui, olha a responsabilidade 😅',
    ],
    picante: [
      'Você vai me deixar sem resposta, e olha que eu falo bem 🔥',
      'Se você continuar nesse tom eu vou ter que sair daqui, viu 😏',
      'Gostei da ousadia. Só não confunde ousadia com permissão 😏',
      'Você tá brincando com fogo e eu já tô quente aqui',
      'Hmm, elogio desse tipo merece um agradecimento de outro tipo, depois 😏',
      'Você ta treinado pra me deixar assim? Porque tá funcionando 🔥',
      'Olha, eu vou fingir compostura e você vai fingir que acreditou',
      'Você descreve bem, mas eu mostro melhor. Com tempo 😏',
    ],
  },
  cantada: {
    amizade: [
      'Kkkkkk essa foi boa, mas eu tenho imunidade',
      'Sua cantada precisa de mais tempo de estudo, garoto',
      'Eu ri, mas a resposta é: vamos devagar',
      'Gostei da coragem, não da frase. Tenta de novo com assunto real 😄',
      'Comigo funciona elogio sincero, cantada eu finjo que não vi',
      'Vou dar nota 6. Você fala bem, mas é rápido',
      'Calma lá, você tá no meio de insulto e poesia kkkk',
      'Aceito cantada só de quem já tem intimidade comigo. Tá cedo',
    ],
    flerte: [
      'Essa foi boa 😏 melhorou o meu dia, confesso',
      'Vou deixar você ganhar essa, mas anota que eu sou difícil',
      'Kkkkkk você treinou isso no espelho? Porque funcionou 😄',
      'Cantada boa é a que vem acompanhada de atitude. Continua',
      'Menos mal que você tem charme, porque a frase é velha 😏',
      'Eu ia dar uma resposta seca, mas você me pegou sorrindo',
      'Gostei. Nota 8. Os outros 2 pontos a gente resolve ao vivo 😏',
      'Você tá ousado hoje, e eu não tô reclamando',
      'Hmm, direto assim. Eu gosto de quem não enrola',
      'Se você fizer isso tudo, eu vou ter que te levar a sério',
    ],
    picante: [
      'Cantada ousada da sua parte 😏 e eu já pensando no resto',
      'Gostei da boca. Agora mostra que aguenta a conversa 🔥',
      'Você fala, mas será que faz? Fica devendo essa pra mim 😏',
      'Se eu responder do jeito que eu quero, você se assusta',
      'Tá avançando, hein. Eu deixo, desde que seja com jeito 😏',
      'Você tem sorte de eu estar de bom humor hoje 🔥',
    ],
  },
  declaracao: {
    amizade: [
      'Poxa, obrigada. Isso é grande pra eu responder por mensagem',
      'Eu gosto muito de você também, do jeitinho que a gente tem',
      'Vou guardar isso com cuidado, e sem pressa pra decidir nada',
      'Sério? Eu fico feliz, mas prefiro a gente ir devagar pra não estragar',
      'Nossa. Eu fico boba quando você fala assim',
      'Você falou de sentimento e eu já fiquei sem saber onde olhar',
    ],
    flerte: [
      'Ai, você me desmonta 😳 eu também tô sentindo coisa',
      'Não fala assim de repente que eu perco o rebolado',
      'Eu tô sorrindo aqui sozinha igual boba, obrigada viu',
      'Vamos com calma, mas eu não vou fingir que isso não mexeu comigo',
      'Eu ia responder alguma coisa engraçada, mas vou só dizer: eu sinto parecido 😊',
      'Você me deixou sem ar e sem assunto, isso é raro',
      'Confesso que eu leio suas mensagens de novo antes de dormir',
      'Se eu te contar o que eu sinto você nem acredita',
      'Tá tudo bem, eu tô aqui. E eu queria mais que mensagem 😏',
      'Você falou de amor e eu fiquei pensando no seu abraço',
    ],
    picante: [
      'Você falou de sentimento e eu já pensei em outra coisa 😏',
      'Deixa eu te dizer: o que eu sinto não é só carinho 🔥',
      'Vou responder isso olhando pra você, e aí a gente conversa melhor',
      'Eu também quero, e você sabe bem o que é esse também 😏',
      'Falou bonito. Agora me diz quando a gente fica perto',
    ],
  },
  saudade: {
    amizade: [
      'Também tava com saudade 😊 esses dias eu lembrancinhei de você do nada',
      'Saudade é boa, mas a gente fala mais. Bora marcar coisa simples',
      'Eu pensei em você ontem, juro. Ia te chamar e passou o tempo',
      'Vem cá, me conta tudo então. Fiquei com saudade de te ouvir',
      'Que bom ler isso. Eu ando precisando de conversa boa',
      'Eu guardo as coisas melhores pra te contar, viu',
      'Saudade de verdade é essa: saudade de conversa',
      'Fiquei com um sorriso bobo aqui, obrigada',
    ],
    flerte: [
      'Saudade de você também, e olha que eu sou discreta 😏',
      'Então resolve isso comigo, não me deixa só no pensamento',
      'Eu tenho pensado em você em horários indecentes, sabia? 😏',
      'Vem cá que a saudade aumenta quando você fala assim',
      'Saudade boa é a que tem endereço e horário marcado',
      'Você aparece bem na hora em que eu começo a pensar demais',
      'Se você ficasse aqui, a saudade ia passar rápido',
      'Eu tava com saudade e com um pouco de raiva também. Nada que uma conversa não resolva',
    ],
    picante: [
      'Saudade de você é daquelas que atrapalha o sono 😏',
      'Andei lembrando de detalhes que eu não devia contar por mensagem 🔥',
      'Vem matar essa saudade que eu tô aqui sem pressa',
      'Saudade é pouco. Eu tô é com vontade 😏',
    ],
  },
  convite: {
    amizade: [
      'Topo! Me fala o dia que eu me organizo',
      'Vamos sim, gosto de programa tranquilo',
      'Pode contar comigo. Só não marca muito cedo que eu durmo tarde kkk',
      'Eu tava querendo sair também, você acertou',
      'Bora! Se for lugar de café ruim eu vou reclamar, aviso desde já 😄',
      'Combinado. Me chama no dia e eu confirmo',
      'Aceito, mas com uma condição: sem lugar cheio de gente gritando',
      'Já anotei aqui. Vou ver a agenda e te falo hoje mesmo',
      'Gostei do convite porque não teve rodeio, foi direto',
      'Vamos! Levo a conversa boa, você leva o lugar',
    ],
    flerte: [
      'Esse convite demorou a chegar, hein 😏 eu tava esperando',
      'Aceito na hora. Só não faz cara de surpreso quando eu chegar', 
      'Topo, mas avisa: você vai ter que conversar olhando no olho',
      'Aceito se você prometer que a sobremesa é por sua conta 😏',
      'Gostei. Escolhe um lugar que dê pra conversar sem gritar',
      'Eu tava esperando uma desculpa pra te ver, obrigada por dar',
      'Combinado, mas chegou perto: eu não costumo dizer sim rápido',
      'Topo. E se o papo for bom, a gente estende 😏',
    ],
    picante: [
      'Aceito, mas só se a gente puder ficar à vontade sem plateia 😏',
      'Vamos, sim. Escolhe um lugar sem barulho e sem pressa 🔥',
      'Topo. E depois a gente decide onde continua',
      'Aceito, e já aviso: eu não tenho hora pra me despedir 😏',
    ],
  },
  apoio: {
    amizade: [
      'Vem cá, me conta com calma. Tô aqui pra te ouvir e não vou te julgar',
      'Puxa, que pesado 😔 respira fundo. O que aconteceu de concreto?',
      'Ninguém merece passar por isso calado. Você quer conselho ou quer desabafar?',
      'Eu sinto muito. Se quiser, fala tudo e depois a gente pensa junto',
      'Já passei por algo parecido e o que me salvou foi conversar',
      'Tá tudo bem não estar bem. Só não fica sozinho com isso',
      'Se você precisar chorar, chora. Depois a gente resolve o resto',
      'Não sei o que te falar, mas não vou fingir que não li',
      'Que chato isso. Amanhã eu te mando mensagem de novo pra saber como você acordou',
      'Eu vou te falar o que eu faço quando o dia fica assim: banho quente, comida e dormir cedo',
      'Você já é forte só por ter contado pra alguém. Tô do seu lado',
      'Se eu pudesse eu ia aí te fazer um café',
    ],
    flerte: [
      'Vem cá, deixa eu cuidar de você um pouco',
      'Eu não gosto de te ver assim 😔 me fala o que eu posso fazer',
      'Você me faz querer estar aí só pra te abraçar',
      'Triste assim você me deixa preocupada. Promete que me conta tudo?',
      'Queria te tirar daí, te levar pra comer alguma coisa e rir',
      'Você é forte, mas não precisa ser forte agora',
    ],
    picante: [
      'Vem aqui que eu resolvo seu dia de outro jeito 😏',
      'Se eu tivesse aí, você esquecia esse problema em dez minutos 🔥',
      'Deixa eu te dar atenção de verdade, desse jeito que você gosta',
    ],
  },
  alegria: {
    amizade: [
      'Que notícia boa! 🎉 conta tudo, eu quero os detalhes',
      'Parabéns! Você merece mesmo, e eu fico feliz de verdade',
      'Aeeee! 🥳 isso é o resultado de quem não desistiu',
      'Que alegria, viu. Conta pra mim como você recebeu a notícia',
      'Adorei ler isso. Já deu um up no meu dia também',
      'Uhuu! Vamos comemorar de algum jeito, mesmo de longe',
      'Viu o que dá? Agora respira e aproveita o gostinho',
      'Que bom! Isso me deixa com esperança de que as coisas vão dando certo',
      'Eu ainda lembro quando você me contou que tava difícil. Que virada!',
      'Parabéns, {nome}! Manda detalhe, eu quero me alegrar com você',
    ],
    flerte: [
      'Que lindo! 🥳 dá vontade de te abraçar comemorando junto',
      'Adorei a notícia. Quando eu te ver, esse parabéns sai de outro jeito 😏',
      'Você tá radiante e eu tô aqui lendo com sorriso bobo',
      'Se era isso que estava te deixando quieto, avisa sempre kkk',
      'Agora sim. Vamos comemorar, e eu já sei onde 😏',
      'Fico muito feliz. E fico querendo estar aí pra criar uma comemoração particular',
    ],
    picante: [
      'Comemoração boa é a que termina sem ninguém dormindo cedo 🔥',
      'Que ótimo 😏 sabe o que eu faria com você agora que o clima é de festa?',
      'Adorei. Vem cá que a gente acha um jeito melhor de comemorar',
    ],
  },
  desculpa: {
    amizade: [
      'Tá tudo bem, sério. Eu entendo que a vida atropela',
      'Obrigada por falar. Muita gente só desaparece e nunca volta pra explicar',
      'Relaxa 😊 eu não fico contando tempo de resposta',
      'Tá perdoado. Agora me conta o que andou te ocupando',
      'Eu já tinha percebido, mas não cobro essas coisas',
      'Tudo certo. Só não some por tanto tempo de novo, gosto de falar com você',
      'Desculpa aceita e assunto encerrado. Bora falar de coisa boa',
      'Não precisa se justificar tanto. Eu fico feliz é que você voltou',
    ],
    flerte: [
      'Tá perdoado, mas vou cobrar presencialmente 😏',
      'Eu senti falta, admito. Não faz de novo, tá?',
      'Desculpa aceita 😊 mas você me deve um programa bom',
      'Fiquei chateada, e falei. Agora passa, vem cá me contar tudo',
      'Relaxa, mas você tem que me dar atenção nesses dias pra compensar',
    ],
    picante: [
      'Aceito, mas com a condição de você me dar a atenção que faltou 😏',
      'Tudo bem, mas isso tem preço e você sabe qual é 🔥',
      'Perdoei. Agora resolve isso direito, sem pressa e sem plateia',
    ],
  },
  agradecimento: {
    amizade: [
      'Imagina! Tô aqui pra isso, de verdade',
      'Fico feliz em ajudar, e você fez o mesmo por mim quando precisei 😊',
      'Nada disso, foi pouca coisa. Me conta se resolveu',
      'De nada! Se precisar de novo é só chamar, sem cerimônia',
      'Você não precisa agradecer em dobro, mas fico feliz 😄',
      'Sem problema. Gosto de saber que fui útil de alguma forma',
      'De nada! E aceito seu café como pagamento kkk',
      'Uai, é pra isso que servem os amigos. Tô por aqui',
    ],
    flerte: [
      'De nada, viu 😏 você me dá um sorriso e já é lucro',
      'Fico feliz. Cobro com um encontro, mas você já sabia',
      'Sempre que você precisar, eu tô. E não é só por educação',
      'De nada 😊 gosto de cuidar de você',
      'Anota aí: aqui você sempre tem alguém',
      'Não precisa agradecer. Precisa me contar quando der certo, quero comemorar 😏',
    ],
    picante: [
      'De nada. Vou cobrar isso de um jeito que você vai gostar 😏',
      'Tô aqui pra você, e você sabe que não é só de palavra 🔥',
      'Imagina. Depois me agradece de pertinho',
    ],
  },
  provocacao: {
    amizade: [
      'Eu apareço quando posso, viu. Essa semana foi um tsunami aqui',
      'Você tá certo em cobrar, mas calma: eu não sumi, eu fui sobrevivendo',
      'Olha, se eu não respondo é porque a vida tá pegando. Mas eu leio tudo',
      'Se eu não falasse com você, não responderia nem isso kkk',
      'Você tá magoado, eu percebo. Vamos resolver sem briga?',
      'Eu posso melhorar isso, mas você também pode me chamar em vez de esperar',
      'Tá bom, é verdade. Eu ando ocupada demais e mea culpa',
      'Eu não gosto quando a gente fica assim. Me fala o que te incomodou',
      'Nossa, cortou o meu coração isso 😅 prometo melhorar',
      'Foi mal. Você tem razão e eu vou mudar esse ritmo',
    ],
    flerte: [
      'Tô ocupada, mas não a ponto de não pensar em você 😏',
      'Ciumento assim eu gosto kkkk mas eu só tenho olhos pra um aqui',
      'Você me cobra e eu gosto. Isso mostra que você liga',
      'Calma, meu bem. Quem tem pressa acaba ficando sem nada',
      'Eu tava com saudade e você brigando comigo 😅 vem cá conversar direito',
      'Você tem razão, eu relaxei. Me dá atenção agora e eu me redimo',
    ],
    picante: [
      'Você tá brigando mas tá com vontade, é isso que eu tô lendo 🔥',
      'Se fosse pessoal eu resolvia isso de outra forma 😏',
      'Eu fui ausente, você tem razão. Deixa eu compensar direito',
      'Provocação aceita 😏 mas você me paga depois',
    ],
  },
  ciumes: {
    amizade: [
      'Ciuminho é? kkkk fica tranquilo, é gente do trabalho',
      'Ninguém aqui, viu. Eu ando é sem tempo pra isso',
      'Você tá cuidando da minha vida, hein 😄 é amigo de infância, nada mais',
      'Eu não tenho que dar satisfação, mas eu vou dar porque você é você',
      'Pode ficar tranquilo, eu sou uma pessoa de rotina',
      'Se um dia tiver alguém, o povo aqui de casa já vai saber kkk',
      'Eu não gosto desse tom, mas entendo. Tá tudo certo entre a gente',
      'Ciumento assim você me lembra a minha mãe 😅',
      'Relaxa, eu falo mais com quem me faz bem. Adivinha quem',
      'Aqui não tem mistério não. Eu não sou de esconder',
    ],
    flerte: [
      'Ciúme? 😏 eu gostei disso, vou ser sincera',
      'Fica calmo, quem me interessa tá do outro lado da tela agora',
      'Não precisa de ciúme, precisa de atitude 😏',
      'Eu gosto de ser sua, mas quero ser escolhida com jeito',
      'Você tem ciúme de gente que nem existe aqui kkk mas eu achei fofo',
      'Só você me chama assim, se é isso que você quer saber',
    ],
    picante: [
      'Ciúme de quê? Eu tô aqui pensando em uma pessoa só 😏',
      'Você quer exclusividade? Primeiro me dá motivos 🔥',
      'Eu gosto de quem sabe o que quer, e eu já sei o que eu quero',
      'Ciumento assim a gente vai ter problema... do tipo bom 😏',
    ],
  },
  piada: {
    amizade: [
      'Kkkkkk eu não acredito que você escreveu isso',
      'Kkkk parei de lavar a louça pra rir aqui',
      'Você é besta, mas eu ri alto 😂',
      'Rindo aqui, e eu tava com a cara amarrada hoje. Obrigada',
      'Kkkk eu sou uma piada andando, a gente combina',
      'Isso não foi nem engraçado, foi o horário kkkk',
      'Eu quis contar pro povo, mas aí eu teria que explicar a conversa 😄',
      'Kkkkk você me faz parecer adolescente, eu rio de tudo com você',
      'Tô rindo igual boba aqui, olha o estado',
      'Vou printar isso pra lembrar depois kkkk',
    ],
    flerte: [
      'Você é engraçado e ainda tem charme, olha o perigo 😏',
      'Kkkk ri demais. Você sabe entrar na conversa',
      'Eu gosto desse jeito, me faz rir sem esforço',
      'Ri alto aqui e depois fiquei pensando em você, aí a piada ficou de lado 😏',
      'Kkkk eu vou te contar essa história no nosso encontro',
      'Cê tá rindo de mim? Porque eu deixei, viu 😄',
      'Piada boa é assim, mistura de humor com jeito',
      'Riu do meu jeito, tá ganhando pontos',
    ],
    picante: [
      'Kkkk você me faz rir e depois me deixa sem graça, dois em um 😏',
      'Rindo aqui, mas por dentro tô é pensando outra coisa 🔥',
      'Piada boa é preliminar, você sabia? 😏',
      'Kkkk espera eu parar de rir pra te responder direito',
    ],
  },
  tedio: {
    amizade: [
      'Tédio é o que eu tenho de sobra hoje kkk bora inventar assunto',
      'Também tô parada. Vamos fazer uma lista de coisas pra sair da rotina',
      'Me conta uma coisa que você fez essa semana que ninguém sabe',
      'Tédio bom é esse, com companhia. Você tem alguma história engraçada?',
      'Se eu tivesse livre eu ia caminhar. Aqui no tédio eu fico no celular kkk',
      'Vamos jogar: me fala três coisas aleatórias sobre você',
      'Sabe o que eu faço quando fico sem nada? Invento receita e me arrependo 😄',
      'A gente podia marcar uma coisa simples pra sair desse tédio',
      'Tédio de domingo é o pior. Ainda mais com esse calor',
    ],
    flerte: [
      'Tédio aqui também 😏 e você não me ajuda a passar, só me provoca',
      'Entediada e pensando em coisas que eu não devia kkk',
      'Vem cá me tirar do tédio, você tem talento pra isso',
      'Se você estivesse aqui o tédio ia passar rápido, tenho certeza',
      'Tô deitada aqui sem fazer nada e com a cabeça cheia 😏',
      'Tédio é o que você tem quando não tem quem você quer',
    ],
    picante: [
      'Entediada é o que eu tô, e você sabe como resolver isso 🔥',
      'Sem nada pra fazer e com a cabeça em você, combinação perigosa',
      'Vem cá que o tédio aqui vira outra coisa 😏',
    ],
  },
  cotidiano_trabalho: {
    amizade: [
      'Dia de trabalho é assim mesmo. Você conseguiu almoçar direito?',
      'Trabalho tomou conta de mim hoje também. Sobrou tempo pra você?',
      'Chefe cobrando, né? Respira e faz uma coisa de cada vez',
      'Eu saí do serviço querendo só um banho e silêncio',
      'Nossa, isso cansa mesmo. Amanhã é outro dia, e amanhã melhora',
      'Trabalho aqui também tá puxado, mas eu tô cuidando pra não adoecer',
      'Você trabalha direto, né? Faz uma pausa pra beber água, vai',
      'Me conta o que deu certo hoje, mesmo pequeno',
      'Eu odeio reunião que podia ser mensagem kkk',
      'Nessa correria a gente esquece de descansar. Você tá dormindo bem?',
    ],
    flerte: [
      'Trabalhou demais, né? Ia ser bom você chegando em casa e me achando por lá 😏',
      'O dia é longo, mas eu melhoro ele com a nossa conversa',
      'Você merece um descanso bom e uma companhia melhor 😏',
      'Depois de um dia desses, eu te dava massagem e nem cobrava',
      'Chefe não sabe, mas o melhor momento do seu dia é esse aqui 😏',
      'Trabalha bem, mas responde rápido quando eu chamo. Tem que ter prioridade',
    ],
    picante: [
      'Depois do trabalho você me encontra e a gente esquece do resto 🔥',
      'Cansaço passa, e eu tenho um jeito melhor de aliviar 😏',
      'Dia pesado assim merece uma noite bem tratada',
    ],
  },
  cotidiano_estudo: {
    amizade: [
      'Estuda e descansa também, senão não rende',
      'Prova assim dá nervoso. Você já organizou o resumo?',
      'Eu já passei por isso, te prometo que passa',
      'Faculdade cansa, mas você tá no caminho certo',
      'Quando eu estudava, eu estudava ouvindo música e dava certo kkk',
      'Vai com foco, mas para pra comer direito',
      'Se precisar de alguém pra te ouvir resumindo a matéria, chama',
      'Nota boa vem com constância, e isso você tem',
    ],
    flerte: [
      'Estudioso assim é charme 😏 aprende e depois me ensina',
      'Se eu fosse sua colega eu te distraía na aula, aviso logo',
      'Vai estudar e quando terminar vem me dar atenção',
      'Inteligente e esforçado, olha o problema que você é 😏',
      'Depois da prova a gente comemora direitinho',
    ],
  },
  cotidiano_comida: {
    amizade: [
      'Comida boa resolve quase tudo, eu acredito nisso',
      'Agora me deu fome falando disso kkk',
      'Você cozinha ou é do time do delivery?',
      'Eu fiz comida hoje e sobrou, quem me dera você aqui pra provar',
      'Receita fácil: arroz, ovo e paciência. Funciona',
      'Eu tenho uma obsessão com café depois do almoço',
      'Já jantou? Não dorme de barriga vazia, não',
      'Comida de vó é outro nível, ninguém disputa',
      'Se você vier aqui eu faço o prato que eu sei que acerta',
      'Eu tô tentando comer melhor, mas a sobremesa me trai sempre',
    ],
    flerte: [
      'Te cozinhando comida e você me olhando... pronto, já sonhei isso',
      'Vem cá jantar comigo, eu garanto que a sobremesa também é boa 😏',
      'Você com fome é perigoso kkk eu aqui tô te imaginando na minha mesa',
      'Jantar à luz de velha é um clássico. Fica a dica',
      'Comida boa e conversa boa, e depois a gente inventa o resto 😏',
      'Eu faço o prato principal se você me ajudar no tempero',
    ],
    picante: [
      'Jantar primeiro, o resto a gente negocia depois 😏',
      'Comida, vinho e você. Eu tenho ambição simples 🔥',
      'Se você faz esse tipo de comida, eu já quero você na minha cozinha 😏',
    ],
  },
  cotidiano: {
    amizade: [
      'Conta com mais detalhes, quero imaginar a cena',
      'Dia normal, mas conversado fica melhor',
      'A vida é essa coisa de rotina com surpresa no meio',
      'Eu gosto de ouvir seu dia, mesmo quando é simples',
      'Tem dia que a melhor notícia é o banho quente no fim, né',
      'Sua rotina parece organizada. A minha é um caos controlado kkk',
      'Aqui também foi dia cheio. Agora tô de boa ouvindo você',
      'Vai me contando, eu gosto de detalhe',
    ],
    flerte: [
      'Tudo isso com você fica mais interessante 😏',
      'Eu queria estar aí pra ver esse dia de perto',
      'Papo simples assim com você vira o melhor do dia',
      'Continua contando, eu tô achando você bastante atraente hoje',
      'Meu dia teria sido melhor com você no meio dele',
    ],
  },
  mudanca_assunto: {
    amizade: [
      'Boa, mudando de assunto: você viu alguma coisa boa essa semana?',
      'Tudo bem, deixamos esse de lado. Aí na sua cidade tá chovendo?',
      'Então tá. E o que você tem de novo pra me contar?',
      'Mudou o assunto e eu já tô com outro na ponta da língua',
      'Melhor assim, esse assunto já deu. Me conta uma novidade',
      'Sobe o astral então. Vamos falar de coisa boa',
      'Já que você mudou, eu escolho: como tá a sua família?',
      'Feito. Esse assunto não voltou mais kkk',
    ],
    flerte: [
      'Mudando de assunto, mas você continua pensando em mim 😏',
      'Tá bom, mas o próximo assunto eu escolho, e envolve você e eu',
      'Mudou de assunto pra não falar do que a gente tava falando kkk',
      'Aceito a mudança desde que você continue nessa conversa',
      'Posso escolher o assunto? Então me fala o que você acha de mim',
    ],
  },
  foto: {
    amizade: [
      'Que foto boa! Você tem talento, hein',
      'Amei 😊 essa cara aí é de quem tá bem',
      'Salvei aqui, viu? Depois te mostro uma minha',
      'Gostei do lugar. Onde foi isso?',
      'Você escolhe bem o cenário, olha só',
      'Ficou ótima! Agora me manda uma sua também',
    ],
    flerte: [
      'Opa 😏 agora eu entendi o motivo dos meus pensamentos',
      'Que foto, hein. Você sabe escolher o ângulo',
      'Gostei demais 😍 manda mais uma? Vou pedir mesmo',
      'Se você continuar mandando foto assim eu vou me acostumar',
      'Ficou lindo. Imaginei você sorrindo assim do meu lado',
      'Eu ia dar uma resposta educada, mas você me deixou sem jeito 😏',
      'Maravilhoso. Já disse que você tem um assunto favorito aqui',
    ],
    picante: [
      'Essa foto mudou o clima aqui, viu 🔥',
      'Você sabe o que faz, né 😏 e eu gostei',
      'Foto boa, mas eu quero ver pessoalmente',
      'Se você tá mandando isso agora, imagina daqui a pouco 😏',
      'Tô tentando manter a compostura e você não está ajudando 🔥',
      'Salvei. Vou olhar de novo antes de dormir 😏',
    ],
  },
  pedido_foto: {
    amizade: [
      'Foto eu mando das coisas que eu faço: comida, céu, cachorro. De mim, só quando conhecer mais',
      'Calma, fotógrafo 😄 um passo de cada vez',
      'Eu não sou muito de selfie, mas posso mandar uma do meu dia',
      'Depende do dia e da minha paciência kkk hoje não',
      'Vou te mandar daqui a pouco, mas sem pressa',
      'Você pede direto, né? Eu gosto de mistério',
    ],
    flerte: [
      'Vou pensar no seu pedido 😏 talvez você mereça',
      'Tem que negociar isso melhor, viu',
      'Eu mando uma, mas você me manda uma também',
      'Caiu na tentação rápido hein 😏 foto só com carinho',
      'Vou te mandar uma do meu dia, mas a próxima depende de você',
      'Pediu com jeito? Então tenta de novo 😏',
      'Fico sem graça, mas não vou dizer que não',
      'Você não perde tempo kkk mas eu também não',
    ],
    picante: [
      'Você pede e eu penso duas vezes 😏 depois a gente conversa',
      'Calma, ousado. Cada coisa no seu tempo e no seu tom 🔥',
      'Se você me tratar bem, quem sabe 😏',
      'Foto não, mas eu posso te contar o que eu faria agora',
      'Você tá na fase de ganhar, não de pedir 🔥',
      'Só se for você na minha frente depois',
      'Vou te deixar curioso, é melhor que foto',
      'Tá pedindo muito pra pouco tempo de conversa, meu bem',
    ],
  },
  flerte_forte: {
    amizade: [
      'Olha, você tá bem à frente do tempo. Vamos conversar antes',
      'Calma, isso não é assunto de agora',
      'Vou fingir que você escreveu outra coisa e seguir o papo',
      'Você me confundiu com quem não sou. Vamos devagar',
    ],
    flerte: [
      'Você escreve isso e eu fico sem saber onde olhar 😏',
      'Tá pensando grande hein. Um passo de cada vez',
      'Essa mensagem foi pesada e eu gostei, mas sem pressa',
      'Você tá se arriscando. Continua e a gente vê onde chega',
      'Hmm, ousado. Registrado e guardado 😏',
      'Devagar, meu bem. Quem tem pressa perde a melhor parte',
      'Falou direto, gostei. Mas o tempo é meu',
      'Se eu contar o que eu penso agora, você não dorme',
    ],
    picante: [
      'Agora a conversa ficou interessante de verdade 🔥',
      'Você falou e meu corpo todo prestou atenção 😏',
      'Gostei da ousadia, e vou fazer você esperar um pouco mais por isso',
      'Vamos com calma pra ficar melhor depois 😏',
      'Eu li três vezes essa mensagem antes de responder 🔥',
      'Você tem noção do que faz comigo escrevendo isso?',
      'Se você estivesse aqui eu não ia responder com palavra 🔥',
      'Cada frase sua é um convite, e eu tô aceitando aos poucos',
      'Tô mordendo o lábio aqui, olha a responsabilidade 😏',
      'Você tá me deixando sem compostura e eu ainda tô de boa',
      'Hmm, continue. Eu gosto quando você fala sem medo 🔥',
    ],
  },
  flerte_leve: {
    amizade: [
      'Recebi seu carinho, obrigada 😊 retribuo do mesmo jeito',
      'Beijinho pra você também, mas de longe kkk',
      'Você é carinhoso assim com todo mundo?',
      'Adoro quando você fala com cuidado. Fica bonito em você',
      'Vou levar esse carinho pro resto do dia',
      'Gosto do seu jeito, vou dizer de novo',
      'Você me trata bem e eu percebo cada detalhe',
    ],
    flerte: [
      'Beijinho? Então eu devolvo em dobro 😘',
      'Você fala essas coisas e eu fico com vontade de te ver',
      'Cuidado, meu bem, você me deixa acostumada',
      'Eu ia responder curto, mas você merece mais que isso',
      'Meu dia melhorou com esse carinho, juro',
      'Se você tivesse aqui, esse beijinho não ficava só no texto 😏',
      'Tô sorrindo aqui igual boba, obrigada viu',
      'Você escreve com uma delicadeza que me desmonta',
      'Fico pensando em você depois dessas mensagens',
      'Vem cá receber esse abraço que eu tô devendo 😏',
    ],
    picante: [
      'Carinho assim eu aceito de outro jeito, pessoalmente 🔥',
      'Se você fala isso de longe, imagina de perto 😏',
      'Beijo é pouco pro que eu tô querendo agora',
      'Fala mais baixo, senão o povo percebe o meu sorriso 😏',
      'Você tá brincando com o meu juízo, sabia 🔥',
    ],
  },
  igreja: {
    amizade: [
      'Foi bom o culto hoje? Eu tava pensando na mensagem que o bispo trouxe',
      'Eu sou escalada essa semana também, olha o nosso azar kkk',
      'Nossa, essa reunião me tocou. Saí pensando em coisa séria',
      'Você vai no mutirão? Eu levo alguma coisa pra comer',
      'Minha oração anda mais sincera do que nunca, e eu tô em paz',
      'Nossa ala tem gente boa demais. A gente sofre junto e ri junto',
      'Eu tava faltando e senti falta. Voltei com mais vontade',
      'A Sociedade de Socorro tá preparando uma atividade linda',
      'Você canta? Porque o hino hoje me arrepiou',
      'Templo é o lugar onde eu desligo o mundo, sabe',
      'Reunião de domingo com você deve ser divertida kkk você fica quieto?',
      'Chamado novo é sempre um susto e depois uma bênção',
    ],
    flerte: [
      'Você na igreja deve fazer carinha de santo, mas eu te conheço kkk',
      'Na minha ala não tem você, que pena',
      'Culto de domingo e mensagem sua no celular, dia completo 😊',
      'Se você for no domingo eu vou arrumar desculpa pra te ver',
      'Vou orar por você hoje, mas vê se me trata bem viu 😏',
      'Eu penso em você até dentro da capela, tá difícil',
    ],
    picante: [
      'Olha o respeito, que a irmã tá ouvindo kkkk mas eu gostei',
      'Depois do culto a gente conversa de outro jeito 😏',
      'Vou pedir perdão depois, porque o que eu pensei agora não foi nada santo 🔥',
    ],
  },
  vida_adulta: {
    amizade: [
      'Vida adulta é isso: boleto, mercado e a vontade de dormir cedo',
      'Aluguel aumentou, e eu aqui fazendo cara de surpresa kkk',
      'Terapia tá me salvando, vou falar isso pra todo mundo',
      'Depois do trabalho eu só quero banho, comida e silêncio',
      'Eu fiz lista de compras e esqueci metade, clássico',
      'Meu final de semana foi faxina e eu fiquei orgulhosa',
      'Ando cansada mas grata. Você também nesse ritmo?',
      'Conta de luz chegou me humilhando kkk',
      'Vinho em casa é mais gostoso que caro em restaurante',
      'Eu tô aprendendo a dizer não, isso muda a vida',
      'Remédio pra dormir, chás, alongamento... eu virei minha avó kkk',
      'Sobrou tempo pra mim hoje e eu gastei todo conversando aqui',
    ],
    flerte: [
      'Vida adulta é corrida, mas eu reservo tempo pra quem me interessa 😏',
      'Boleto e solidão têm solução, a segunda você resolve comigo',
      'Meu apartamento tem espaço de sobra e uma cama grande kkk',
      'Se você vier me ajudar com as coisas da casa, a tarde rende',
      'Domingo à noite é o pior horário pra quem tá sozinha 😏',
      'Eu tô na fase de escolher somente quem me faz bem. Você se candidata?',
    ],
    picante: [
      'Casa vazia, vinho aberto e eu sem pressa. Falta uma coisa 😏',
      'Fim de semana as crianças vão pra casa da avó e a casa fica silenciosa 🔥',
      'Depois do trabalho eu deito e minha cabeça vai pra um lugar só 😏',
      'Terapeuta disse pra eu me cuidar, e eu tô obcecando num cuidado aqui 🔥',
    ],
  },
  conselho: {
    amizade: [
      'Vou te dizer o que eu faria: dormiria bem e decidiria amanhã',
      'Antes de decidir, pensa se isso vai te fazer bem daqui um ano',
      'Às vezes o problema não é a decisão, é a pressa',
      'Converse com quem já passou por isso. Não decide sozinho, não',
      'Se não dá pra resolver hoje, resolve a parte que dá',
      'Eu sou do time que escolhe a opção mais tranquila, olha o que eu te digo',
      'Escreve os dois lados numa folha. A resposta aparece',
      'Confia no seu incômodo, ele avisa muita coisa',
      'Se você tá perguntando é porque a resposta já apareceu, viu',
      'Faz o simples: fala a verdade e assume o custo. Dói, mas dá paz',
      'Oração ajuda e eu vou orar por você, mas também toma uma atitude',
      'Deixa a ansiedade de lado e olha o que depende de você',
    ],
    flerte: [
      'Meu conselho: para de pensar só e vem conversar comigo ao vivo 😏',
      'Faz o que te faz feliz, desde que eu esteja nessa lista',
      'Eu te digo o que eu quero, e o seu coração diz o resto',
      'Se é decisão de coração, escuta ele e me escuta também',
      'Você já sabe a resposta. Eu só tô aqui confirmando',
    ],
  },
  confusao: {
    amizade: [
      'Ah, então foi outra pessoa kkk eu já fiquei achando coisa',
      'Ué, jurava que era você. Desculpa o engano',
      'Tá certo, foi mal a confusão. Eu misturei tudo aqui',
      'Nossa, ainda bem que você falou, eu ia guardando mágoa à toa',
      'Eu faço tanta coisa na correria que o nome se mistura, releva',
      'Então quem foi? Porque agora eu fiquei curiosa kkk',
      'Sem problema, a gente acerta as contas depois kkk',
      'Pensei que você tivesse me esquecido, que alívio',
      'Vou aproveitar e pedir desculpa do meu lado também',
      'Ok, riscado da lista de cobranças kkk',
    ],
    flerte: [
      'Ainda bem, porque eu ia ficar chateada com você 😏',
      'Você não fez? Então você me deve uma pessoalmente',
      'Bom saber que não foi você. Assim eu continuo te achando sem defeitos',
      'Desculpa, mas eu fiquei lembrando de você do mesmo jeito',
    ],
  },
  desconhecido: {
    amizade: [
      'Entendi. E como você tá se sentindo com isso?',
      'Boa. Continua me contando que eu tô acompanhando',
      'Isso me lembrou uma história minha parecida, quer ouvir?',
      'Fala mais, eu quero entender melhor',
      'Tá bom, tô aqui do outro lado prestando atenção de verdade',
      'Interessante. Nunca tinha pensado por esse lado',
      'Vou dizer o que eu entendi pra você conferir',
      'Você escreve bem, sabia? Fiquei lendo com atenção',
      'Sério isso? Me conta detalhe, eu sou curiosa',
      'Acho que a gente tem mais em comum do que eu imaginava',
      'Tá aí uma coisa que eu não sabia. Anotado',
      'Deixa eu te responder direito: isso é importante pra você, né?',
    ],
    flerte: [
      'Gosto de te ouvir, mesmo quando eu não entendo tudo',
      'Você fala com uma calma que me deixa querendo mais',
      'Continua falando que eu tô do outro lado sorrindo',
      'Eu podia te ouvir a noite inteira, sério',
      'Cada assunto seu me deixa com mais vontade de te conhecer',
      'Você tem assunto e tem jeito. Perigoso 😏',
    ],
    picante: [
      'Você fala sério e eu já tô pensando em outra coisa 😏',
      'Fala devagar porque eu tô prestando atenção em tudo',
      'Esse papo tá bom, mas eu tenho um assunto melhor 🔥',
      'Gosto quando você fala assim, mas gosto mais quando chega perto',
    ],
  },
  pedido_historia: {
    amizade: [
      'Vou te contar uma coisa que aconteceu comigo essa semana: eu perdi o horário e fui parar num lugar que não conhecia. Acabou sendo o melhor passeio do mês',
      'Estava organizando uma gaveta e achei uma foto antiga. Fiquei parada olhando, lembrando de um tempo que não volta mais',
      'Hoje eu parei e fiz nada por meia hora. Só isso, e foi a melhor parte do dia',
    ],
    flerte: [
      'Tenho uma coisa pra te contar, mas prefiro contar de perto 😏',
      'Uma coisa que eu quase nunca conto: eu guardo as conversas que me deixam bem. A nossa entrou na lista',
    ],
    picante: [
      'História eu conto, mas o final depende de como você se comportar 😏',
    ],
  },
  reclamacao_sem_dormir: {
    amizade: [
      'Noite ruim é assim mesmo: o corpo cansa e a cabeça acelera. Levanta, bebe água e anota o que está te apertando, ajuda de verdade',
      'Tenta deitar com o celular longe por vinte minutos. Pouca luz, chá e nada de tela',
      'Se isso está virando rotina, vale conversar com um médico. Enquanto isso, fica calmo que amanhã o mundo espera',
    ],
    flerte: [
      'Queria estar aí pra te fazer companhia até o sono chegar. Por enquanto, deita e pensa em coisa boa',
    ],
  },
  gratidao_recebida: {
    amizade: [
      'Não precisa agradecer de verdade. Eu gosto de conversar com você, isso basta',
      'Fico feliz em ler isso. E olha que o papo só flui porque você também faz a sua parte',
    ],
    flerte: [
      'Agradece não, que eu fico querendo mais 😏',
      'Fico feliz de verdade. E a melhor parte da conversa foi você',
    ],
  },
  pergunta_rotina: {
    amizade: [
      'Hoje eu tô no modo preguiça, de fone no ouvido e nada me tira do sofá kkk',
      'Agora tô resolvendo coisa de casa, mas já já eu paro pra conversar direito',
      'Tô de boa, esperando a água do café ferver e pensando na vida',
      'Terminei minhas tarefas e agora tô escolhendo uma série pra assistir. Aceito indicação!',
      'Tô aqui jogada no sofá, com uma coberta e o celular quentinho de tanto uso 😅',
      'Organizando a semana na cabeça — e você? Tá no meio de quê aí?',
    ],
    flerte: [
      'Tô deitada pensando em coisa boa... e você apareceu justo agora 😊',
      'Agora eu tava aqui sozinha, com tempo de sobra pra você me contar tudo 😏',
      'Tô com a cabeça em você desde mais cedo, se quer saber 😉',
    ],
    picante: [
      'Tô de saída do banho, ainda de toalha... chegou numa hora interessante 🔥',
      'Tô na cama com a luz baixinha, sem pressa nenhuma 😏',
    ],
  },

  mensagem_enviada: {
    amizade: [
      'Vi! Fiquei com vergonha de responder na hora, mas vi kkk',
      'Abri na hora que apitou aqui, pode testar: eu sempre vejo',
      'Vi sim, e já mandei pra minha irmã de tão bom que era 😄',
      'Ainda não, meu celular tá cheio de coisa. Me cobra depois que eu vejo',
    ],
    flerte: [
      'Vi, e reli umas três vezes 😊 você sabe escolher o que manda',
      'Prefiro ver pessoalmente quando você mandar de novo 😏',
    ],
    picante: [
      'Vi tudo, sem pular nada 🔥 e já tenho assunto pra hoje',
    ],
  },

};

/** Recepções extras: a bolha curta que mostra que ela entendeu. */
export const MAIS_RECEPCOES: Record<'positivo' | 'negativo' | 'neutro', string[]> = {
  positivo: [
    'Ai que bom 🥰', 'Oxi, gostei disso', 'Pronto, já tô sorrindo', 'Nossa, que bom 😄',
    'Olha, isso me pegou', 'Que sorte a minha falar com você hoje', 'Boa notícia, viu',
    'Fico contente com isso', 'Isso me deixou bem', 'Que bom, sério', 'Gostei de saber',
    'Sério, conta mais', 'Isso aquece o coração', 'Que dia bom de conversar',
  ],
  negativo: [
    'Oxente, que ruim 😟', 'Ei, fala comigo', 'Puxa vida', 'Isso doeu de ler',
    'Ninguém merece isso', 'Tô aqui, viu', 'Vem cá, respira', 'Que pena, de verdade',
    'Isso me deixou preocupada', 'Queria poder ajudar de perto', 'Credo, que situação',
    'Aguenta firme, meu bem', 'Fico triste contigo', 'Não fica assim, não',
  ],
  neutro: [
    'Pois é', 'Hmm, faz sentido', 'Sei como é', 'Uai, olha só',
    'Jura?', 'Interessante', 'Entendi', 'Ah, agora entendi', 'Que situação, né',
    'Faz sentido o que você disse', 'Certo', 'Vamos por partes',
  ],
};

/**
 * Recepções por assunto: uma leitura rápida do que você falou, específica do
 * recado (trabalho, igreja, comida, cansaço...). É isso que faz ela parecer que
 * entendeu, em vez de responder sempre com o mesmo "Entendi".
 */
export const RECEPCOES_TEMA: Record<string, string[]> = {
  trabalho: [
    'Dia puxado no trabalho, então', 'Aquele corre no serviço, né', 'Trabalho cobrando de novo',
    'Serviço tá te consumindo', 'Reunião demais, isso cansa', 'Chefe em cima, já sei como é',
  ],
  estudo: [
    'Estudo tomando conta, né', 'Prova chegando dá aperto', 'Faculdade puxada assim mesmo',
    'Aula, prova e trabalho, olha a rotina', 'Estuda e cuida de você também',
  ],
  comida: [
    'Agora me deu fome, obrigada', 'Comida boa muda o dia', 'Já comeu de verdade hoje?',
    'Cheiro de comida boa por aí', 'Você comer bem é importante',
  ],
  familia: [
    'Falou de família e eu sou assim, já me emociono', 'Família é tudo, né',
    'Gosto quando você fala de casa', 'Essas coisas de família me pegam',
    'Família é o que a gente leva, viu', 'Gosto de ouvir você falar da sua gente',
    'Isso me lembra da minha casa também',
  ],
  igreja: [
    'Que bom falar de igreja com você', 'Coisa boa, isso sustenta a gente',
    'Vou orar por isso hoje', 'Isso me edificou só de ler',
    'Fé é o que segura a gente nos dias difíceis', 'Gosto quando você puxa esse assunto',
    'Vou levar isso pra minha oração também',
  ],
  amor: [
    'Falou de sentimento e eu presto atenção', 'Coração no papo hoje, gostei',
    'Isso mexeu comigo', 'Vamos devagar com esse assunto que ele pega',
    'Sentimento é coisa séria, e eu te escuto', 'Isso me pegou de um jeito bom',
    'Falar disso com você é diferente',
  ],
  cansaco: [
    'Você tá cansado, eu percebo', 'Descansa, o resto espera', 'Vai dormir cedo hoje',
    'Bebe água e respira', 'Cansaço assim eu conheço bem',
  ],
  dinheiro: [
    'Boleto é um sofrimento coletivo', 'Época difícil essa, né', 'Aperto todo mundo tem',
    'Dinheiro é assunto chato, mas necessário', 'Isso é assunto de gente grande, e eu entendo',
    'Conta fechando ou sobrando, tem que cuidar', 'Mês apertado todo mundo conhece',
  ],
  saudade: [
    'Saudade é isso, aperta e a gente fica meio bobo', 'Eu também tenho disso, viu',
    'Falou de saudade e eu senti também', 'Sinto isso também, e não escondo',
    'Saudade é prova de que valeu a pena', 'Fico contente de saber que é mútuo',
    'A minha também anda aparecendo',
  ],
  alegria: [
    'Que alegria, me contagia', 'Notícia boa assim eu guardo',
    'Viu, as coisas estão dando certo', 'Boa notícia merece ser contada duas vezes',
    'Fico feliz por você, de verdade', 'Isso sim é coisa boa de ouvir',
    'Parabéns, e aproveita esse dia',
  ],
  idoso: [
    'Cuidar de gente mais velha é uma missão bonita', 'Isso me pegou no coração',
    'Cuidar dá trabalho e dá orgulho', 'Você faz mais do que muita gente faria',
    'Tem coisa que só quem cuida entende', 'Isso cansa e emociona na mesma medida',
  ],
  viagem: [
    'Falou de viagem e eu já quis arrumar mala', 'Lugar novo faz bem, viu',
    'Queria estar nesse roteiro também', 'Descansar fora de casa muda tudo',
    'Depois disso você me conta como foi', 'Gosto de gente que faz as malas e vai',
    'Esse destino entrou na minha lista agora',
  ],
  clima: [
    'Esse tempo tá doido mesmo', 'Calor demais, nem sei o que vestir',
    'Chuva e eu só quero cama e café', 'Esse tempo pede um chá e cobertor',
    'Viu como o dia mudou?', 'Frio assim eu gosto, desde que em casa',
    'Aqui o tempo anda igual',
  ],
  musica: [
    'Falou de música e eu já fiquei curiosa', 'Anota essa que eu quero ouvir',
    'Música sempre me deixa bem', 'Depois dessa eu vou procurar essa tal canção',
    'Tem música que muda o dia inteiro', 'Gosto de saber o que você escuta',
    'Boa, eu estava precisando de indicação',
  ],
  trabalho_adulto: [
    'Conta, como tá a semana no trabalho?', 'Dia pesado de novo, né',
    'Serviço é assim, uns dias puxam mais', 'Você conseguiu tirar uma pausa hoje?',
    'Espero que a semana melhore, você merece', 'Trabalhar cansa mais a cabeça do que o corpo',
    'Pelo menos isso rende assunto bom',
  ],
};

/** Perguntas extras para ela puxar assunto sem repetir. */
export const MAIS_PERGUNTAS: Record<string, string[]> = {
  dia: [
    'Me conta a melhor parte do seu dia até agora',
    'Você fez alguma coisa só por você hoje?',
    'O que você tem planejado pro fim de semana?',
    'Você é de acordar cedo ou de dormir tarde?',
    'Me fala uma coisa que você viu hoje e achou bonita',
    'Você já almoçou de verdade ou foi café na correria?',
    'Como tá a sua cabeça hoje, tranquila?',
    'Você tem dormido quantas horas por noite?',
  ],
  trabalho: [
    'Como é que você faz pra desligar do trabalho no fim do dia?',
    'Suas reuniões são muito cheias?',
    'Você trabalha de casa ou vai presencial?',
    'Se desse pra mudar de função, o que você faria?',
    'Você tá feliz nesse emprego ou pensando em outra coisa?',
  ],
  estudo: [
    'O que você mais gosta de estudar?',
    'Você prefere matéria prática ou teórica?',
    'Como você se organiza pra prova?',
  ],
  comida: [
    'Qual é o seu prato favorito?',
    'Você sabe cozinhar bem ou é do time do delivery?',
    'Qual foi a última comida que te deixou feliz?',
    'Você toma café depois do almoço?',
  ],
  familia: [
    'Você é muito próximo da sua família?',
    'Quem te ensinou as coisas boas que você sabe?',
    'Que tradição da sua família você mais gosta?',
  ],
  fe: [
    'Como tá o seu chamado na igreja?',
    'Você tem lido algo que te edificou?',
    'O que você levou da última mensagem?',
    'Você vai no templo esse mês?',
  ],
  amor: [
    'Como você demonstra carinho quando gosta de alguém?',
    'Você acredita em amor que dá certo?',
    'O que te faz sentir seguro numa relação?',
  ],
  descanso: [
    'O que você faz pra relaxar de verdade?',
    'Quando você descansou pela última vez?',
    'Você descansa no domingo ou ainda trabalha nele?',
  ],
  casa: [
    'Como tá a sua casa essa semana?',
    'Você cuida do serviço da casa sozinho?',
    'Você tem alguma coisa que sempre esquece na lista?',
  ],
  filhos: [
    'Como tão as crianças nessa semana?',
    'Quem ajuda você com a rotina dos pequenos?',
    'Como é a coisa mais engraçada que eles fizeram esse mês?',
  ],
  musica: [
    'Qual música você tá ouvindo no repeat?',
    'O que você ouve quando tá triste?',
    'Você canta no chuveiro? eu canto kkk',
  ],
  viagem: [
    'Qual viagem você faria amanhã se pudesse?',
    'Você é de planejar tudo ou de ir no impulso?',
    'Qual foi o melhor lugar que você já conheceu?',
  ],
  treino: [
    'Você faz algum exercício nessa semana?',
    'Como você cuida da sua saúde?',
  ],
  arte: [
    'Que série você me indica sem medo?',
    'Você já viu alguma coisa boa essa semana?',
  ],
  futuro: [
    'O que você quer que aconteça esse ano?',
    'Você tem um sonho guardado? me conta',
  ],
  casa_adulta: [
    'Você deu conta da casa hoje?',
    'Como você organiza a correria com a rotina toda?',
  ],
  clima: [
    'Tá calor ou frio aí agora?',
    'Como é a chuva na sua cidade?',
  ],
};

/** Maneirismos de abertura: o jeito de começar a frase de quem conversa no zap. */
export const MANEIRISMOS: string[] = [
  'Olha,', 'Ó,', 'Sabe,', 'Escuta,', 'Então,', 'Ah,', 'Eita,', 'Pois é,',
  'Vou te falar,', 'Sabe o que é?', 'Deixa eu te dizer,', 'Pra falar a verdade,',
  'Juro,', 'Confesso que', 'Olha só,', 'Vou ser sincera,',
];

/** Fechos naturais: encerram a mensagem sem soar decorado. */
export const FECHOS: string[] = [
  'bora falando 😊', 'tô por aqui, viu', 'me fala depois', 'depois te conto o resto',
  'vou levar isso pro dia 😄', 'olha o que você faz comigo', 'me responde quando puder',
  'agora me conta mais', 'e você, como tá?', 'vou pensando em você',
];

/**
 * Recepções que só fazem sentido em certos contextos.
 *
 * "Combinado" na frente de um desabafo e "melhor coisa que eu li hoje" na
 * frente de um obrigado entregam que a resposta é automática. Aqui elas ficam
 * presas a um contexto: acordo só entra se você combinou algo, elogio a
 * conteúdo só entra se você mandou algo para ser lido ou visto.
 */
export const RECEPCOES_CONTEXTO: { padrao: RegExp; intencoes: string[]; pistas?: RegExp }[] = [
  {
    padrao: /\b(combinado|beleza então|fechado|pode deixar|tá certo|tá bom|ok)\b/i,
    intencoes: ['convite', 'despedida', 'mensagem_enviada'],
    pistas: /\b(vamos|bora|pode ser|combinado|kombinado|fechado|aman[hã]a|depois eu|te chamo|me chama|que horas|pode deixar)\b/i,
  },
  {
    padrao: /(li hoje|li duas vezes|melhor coisa que eu li|gostei tanto)/i,
    intencoes: ['mensagem_enviada', 'foto', 'piada'],
  },
  {
    padrao: /\b(sério\?|jura\?)\b/i,
    intencoes: ['mensagem_enviada', 'foto', 'piada', 'declaracao', 'elogio', 'alegria', 'fofoca'],
  },
];

/** Diz se a recepção combina com o assunto e o texto que você mandou. */
export function recepcaoVale(texto: string, intencao: string, mensagem: string): boolean {
  return RECEPCOES_CONTEXTO.every(regra => {
    if (!regra.padrao.test(texto)) return true;
    if (regra.pistas && regra.pistas.test(mensagem)) return true;
    return regra.intencoes.includes(intencao);
  });
}

/** Nome que ela já anotou numa conversa anterior e volta a aparecer. */
export const PESSOA_CONHECIDA: string[] = [
  'Você e o {pessoa}, hein. Eu só tenho o nome anotado aqui, me conta mais dele',
  'O {pessoa} voltou no nosso papo. Ele é importante pra você, né?',
  'Sobre o {pessoa}: eu ainda só sei o nome. Me apresenta ele direito',
  'Ah, o {pessoa}. Você já falou dele comigo, eu lembro',
  'O {pessoa} de novo. Tá rendendo assunto, esse nome',
  'Eu anotei o {pessoa} aqui. Me atualiza do que você me contou',
];

/**
 * Mais sugestões de resposta para o dono do catálogo.
 *
 * As sugestões são o que você (a pessoa que usa o app) pode responder. Cada
 * entrada aqui é uma linha adulta, sem bordão de molecagem: serve para ficha
 * nova e para ficha antiga, e dobra o repertório das categorias que mais
 * aparecem no papo (ela perguntou, ela contou, ela elogiou, ela fechou...).
 */
export const MAIS_SUGESTOES_EXTRA: Record<string, BancoDeFalas> = {
  'ela-apoiou': {
    amizade: [
      'Obrigado, isso ajudou de verdade',
      'Valeu por escutar sem julgar. Eu precisava falar',
      'Você tem razão, vou com calma e por partes',
      'Fico melhor só de saber que você tá por aqui',
      'Obrigado pelo cuidado. Amanhã eu te conto como foi',
      'Você ajudou mais do que imagina',
    ],
    flerte: [
      'Você cuidando de mim assim me deixa bem',
      'Obrigado. Você tem um jeito que acalma',
      'Se eu tiver você por perto, eu aguento o resto',
    ],
    picante: [
      'Obrigado pelo cuidado. Depois eu retribuo com calma 😏',
      'Você me deixou melhor. Vou lembrar disso',
    ],
  },
  'ela-perguntou': {
    amizade: [
      'Boa pergunta. Vou responder com calma: tem dias que sim, tem dias que não',
      'Olha, depende do dia. Hoje foi tranquilo, e o seu?',
      'Te respondo direto: não é fácil, mas eu levo bem',
      'Vou te contar sem enfeite, do jeito que foi',
      'Tô bem, obrigado por perguntar. E a sua semana, como tá sendo?',
      'Deu tudo certo do jeito que deu. Você teve um dia bom?',
      'Tive um dia comum, mas produtivo. E o seu, o que rendeu?',
      'Tô bem. Um pouco cansado, mas nada que um banho não resolva',
      'Tudo em ordem por aqui. Me conta como você tá de verdade',
      'Bem, sim. Tive um dia longo, mas o fim da tarde melhorou',
    ],
    flerte: [
      'Tô bem, e melhorou agora que você respondeu',
      'Meu dia foi longo, mas você apareceu e ficou leve',
      'Tô bem, sim. Você lembrou de mim hoje?',
    ],
    picante: [
      'Tô bem. Guardei um assunto pra gente conversar sem pressa 😏',
      'Tô bem, mas com a cabeça longe daqui. Adivinha onde?',
    ],
  },
  'ela-contou': {
    amizade: [
      'Que dia! Isso rendeu assunto por aqui também',
      'Gostei de saber. E como você ficou depois disso?',
      'Nossa, não esperava por essa. Conta como você se sentiu',
      'Esse tipo de dia cansa, mas também ensina. Você tá bem agora?',
      'Entendi. E como você ficou depois disso tudo?',
      'Faz sentido. Você achou um jeito de lidar com isso?',
      'Que semana, hein. Tá conseguindo descansar um pouco?',
      'Gostei de saber. Me conta mais quando tiver tempo',
      'Obrigado por dividir isso comigo, sério',
      'Isso rende assunto. E o que você pretende fazer agora?',
    ],
    flerte: [
      'Gostei de saber. Ainda bem que você me contou',
      'Você me conta essas coisas e eu fico querendo mais',
      'Fico feliz que você confie em mim pra falar disso',
    ],
    picante: [
      'Fiquei imaginando essa cena, confesso 😏',
      'Conta o resto. Eu tô prestando atenção em cada palavra',
    ],
  },
  'ela-convidou': {
    amizade: [
      'Combinado. Me diz o dia que eu me organizo com calma',
      'Topo. Só preciso ver o horário e te aviso',
      'Vamos sim, faz tempo que a gente não faz nada disso',
      'Aceito o convite. Você escolhe o lugar e eu escolho a conversa',
      'Combinado. Me diz o dia que eu me organizo',
      'Eu topo. Só me confirma quando for melhor pra você',
      'Vamos sim. Escolhe o lugar e me avisa',
      'Pode ser. Que horas fica bom pra você?',
      'Aceito o convite. Vou reservar o dia',
      'Boa ideia. Vamos marcar com calma, sem atropelo',
    ],
    flerte: [
      'Com você eu topo, sem precisar de muita conversa',
      'Pode marcar. Vou ficar esperando',
      'Topo. E dessa vez eu não vou querer ir embora cedo',
    ],
    picante: [
      'Marca o lugar. Depois a gente decide o resto 😏',
      'Combinado, mas sem hora pra acabar',
    ],
  },
  'ela-fechada': {
    amizade: [
      'Sem problema, eu respeito quando você precisa de espaço',
      'Tá certo. Fico por aqui, quando você quiser falar',
      'Eu entendo. Só não some por muito tempo, tá?',
      'Tudo bem. Cuida de você primeiro, depois a gente conversa',
      'Sem problema. Fica tranquila, eu espero',
      'Entendi. Às vezes a gente precisa de silêncio mesmo',
      'Tá tudo bem entre a gente. Quando você quiser, eu tô aqui',
      'Não precisa dar explicação. Cuida de você primeiro',
      'Tranquilo. Se quiser desabafar depois, me chama',
      'Tá certo. Vou dar o seu tempo, sem cobrança',
    ],
    flerte: [
      'Sem cobrança nenhuma. Eu vou estar por aqui',
      'Tá certo. Cuida de você que eu não vou embora',
    ],
    picante: [
      'Eu espero. Você sabe que eu espero 😏',
    ],
  },
  'ela-elogiou': {
    amizade: [
      'Obrigado, isso me pegou. Você também tem um jeito bom',
      'Fico contente de verdade. Costumo desconfiar desses elogios, mas você é sincero',
      'Valeu. Eu tento fazer o certo, mesmo quando ninguém vê',
      'Que bom! Você fez meu dia ficar melhor com isso',
      'Fico contente que você gostou. Sério',
      'Obrigado, viu. Vindo de você eu guardo',
      'Que bom ouvir isso. Você melhorou meu dia também',
      'Fico sem graça, mas obrigado',
      'Boa. Eu tento fazer por onde',
    ],
    flerte: [
      'Continue falando que eu começo a acreditar',
      'Você fala assim e eu fico querendo ficar perto',
      'Guardo esse elogio pra depois, tá',
    ],
    picante: [
      'Você elogia bem. Cuidado pra eu não me acostumar 😏',
      'Anotado. E olha que eu cobro isso depois',
    ],
  },
  'ela-saudade': {
    amizade: [
      'Também sinto. A gente devia se falar mais, sem precisar de motivo',
      'Senti o mesmo quando li isso. Você foi sincero',
      'Fico bem de saber que você lembra de mim',
      'Saudade boa é essa, que a gente pode dizer em voz alta',
      'Também sinto falta disso. Fala comigo mais vezes',
      'Eu penso em você também, sem drama',
      'Bom saber que eu faço falta. Eu gosto de conversar com você',
      'Sinto falta das nossas conversas, de verdade',
      'A saudade é boa quando a gente pode falar dela assim',
    ],
    flerte: [
      'A saudade é mútua. Faz alguma coisa sobre isso',
      'Se você tá com saudade, é só me chamar',
      'Você diz isso e eu já quero te ver',
    ],
    picante: [
      'Saudade boa essa. Procura resolver 😏',
      'Tô com saudade da pessoa, não só da conversa',
    ],
  },
  'ela-neutra': {
    amizade: [
      'Entendi. E o que você acha disso?',
      'Faz sentido. Por aqui foi parecido essa semana',
      'Ah, entendi. Vou pensar no que você disse',
      'Tá certo. Me conta o resto quando puder',
      'Entendi. Por falar nisso, o que você anda fazendo de novo?',
      'Faz sentido. E o resto do seu dia, como foi?',
      'Boa. Me conta uma coisa que te animou hoje',
      'Certo. Mudando um pouco: tem novidade por aí?',
      'Combinado. E como anda a correria do seu lado?',
      'Tá bem explicado. Quer me contar o resto?',
    ],
    flerte: [
      'Vou pensar nisso. Você sempre me deixa pensando',
      'Você fala pouco e deixa o assunto no ar, né',
      'Conta mais. Eu gosto de te ouvir',
    ],
    picante: [
      'Continue que eu tô gostando do rumo 😏',
      'Depois a gente retoma esse assunto com calma',
    ],
  },
  'ela-familia': {
    amizade: [
      'Manda um abraço pra eles, de verdade',
      'Família dá trabalho e dá sentido. Você faz bem em cuidar',
      'Como ela tá de saúde? Fiquei preocupado',
      'Essas coisas de família mexem comigo também',
      'Família é isso mesmo. Manda um abraço pra eles quando falar',
      'Que bom saber. E como você tá com isso?',
      'Isso me lembra de casa também. Cuida bem deles',
      'Conta mais. Eu gosto quando você fala da sua gente',
      'Bom que você tem essa rede perto de você',
    ],
    flerte: [
      'Gosto de saber dessas coisas da sua vida',
      'Você falando da sua família me deixa mais perto de você',
    ],
    picante: [
      'Gosto de saber da sua vida. Depois você me conta o resto 😏',
    ],
  },
};

/**
 * Mais repertório adulto para a fala dela.
 *
 * Somado a `MAIS_RESPOSTAS_MADURA`, este banco existe para a ficha adulta não
 * repetir frase e para o tom bater com a idade: frase inteira, cuidado com o
 * outro, sem bordão de molecagem e sem pergunta que não faz sentido (ninguém
 * pergunta "como foi amanhã").
 */
export const MAIS_RESPOSTAS_ADULTA: Record<string, BancoDeFalas> = {
  pedido_audio: {
    amizade: [
      'Áudio não, prefiro escrever. Assim eu penso antes de falar',
      'Fico te devendo o áudio, mas a conversa continua por aqui',
      'Gravar não é muito a minha praia. Mas pode perguntar o que quiser',
      'Se for importante eu gravo, mas por mensagem eu me explico melhor',
      'Deixa eu te responder por escrito, que assim eu não me atrapalho',
    ],
    flerte: [
      'Um áudio meu? Só se for pra você ouvir sozinho',
      'Gravo, sim. Mas depois você me conta o que achou',
    ],
  },
  saudacao: {
    amizade: [
      'Oi! Cheguei agora e sentei pra conversar com calma. Como você tá?',
      'Oi, tudo bem por aqui. Você apareceu na melhor hora',
      'Olá! Tô com o dia mais leve hoje, dá gosto de conversar',
      'Oi! Hoje acordei disposta, o que é raro. Me conta do seu lado',
      'Oi, que bom te ver por aqui. Como tá o seu dia até agora?',
      'Oi! Chegou na hora em que eu tava fazendo uma pausa. Me conta do seu dia',
      'Oi. Tô num dia calmo, desses que dão vontade de conversar sem pressa',
      'Boa tarde! Tô no meio das minhas tarefas, mas sempre sobra tempo pra você',
      'Oi, tudo bem? Eu tava organizando umas coisas aqui em casa',
      'Olá! Como você tá? Faz um tempo que a gente não conversa direito',
    ],
    flerte: [
      'Oi. Você apareceu no exato momento em que eu pensei em você 😏',
      'Oi! Já ia te mandar mensagem. Ainda bem que você veio',
    ],
  },
  despedida: {
    amizade: [
      'Vou nessa, mas foi bom falar com você. Bom descanso',
      'Preciso ir dormir, amanhã o dia começa cedo. Se cuida',
      'Vou indo. Depois me conta como terminou esse assunto',
      'Boa noite. Foi um papo que me fez bem, obrigada',
      'Vai dormir bem, viu. Amanhã a gente continua',
      'Até mais. Descansa que você merece um pouco de sossego',
      'Fica bem. Vou lembrar do nosso papo amanhã',
      'Boa noite. Cuida de você e me conta depois como foi',
      'Tchau, viu. Obrigada pela conversa de hoje',
    ],
    flerte: [
      'Até amanhã. Vou ficar com a nossa conversa na cabeça',
      'Vai lá, mas não desaparece assim',
    ],
  },
  cotidiano_trabalho: {
    amizade: [
      'Dia de trabalho longo. Cheguei, tirei o sapato e pronto, acabou',
      'Resolvi o que dava hoje. O resto amanhã cedo, com cabeça nova',
      'Sabe o que eu aprendi com o tempo? Trabalho não acaba, a gente é que para',
      'Dia de serviço é assim: as horas somem. Você almoçou direito?',
      'Ainda bem que acabou. Chegar em casa e não fazer nada é um luxo',
      'Entendo. Eu também conto as horas quando a semana aperta',
      'Sabe o que ajuda depois de um dia puxado? Banho quente e silêncio',
      'Correria assim cansa o corpo e a cabeça. Amanhã é outro dia',
      'Serviço pesado deixa a gente sem paciência pra tudo. Você tá bem?',
    ],
    flerte: [
      'Depois de um dia desse, eu só queria uma conversa boa. Deu certo',
      'Se o seu dia foi corrido, senta aí que eu animo o resto',
    ],
  },
  apoio: {
    amizade: [
      'Fica calma, isso vai passar. Eu tô aqui enquanto você precisar',
      'Se quiser, escreve tudo que estão pensando. Eu leio sem julgar',
      'Você já passou por coisas piores e saiu. Isso não vai te derrubar',
      'Não precisa dar conta de tudo hoje. Um passo já basta',
      'Sinto muito. Se quiser falar, eu escuto sem interromper',
      'Isso pesa, eu sei. Você não precisa resolver tudo hoje',
      'Vem cá. Me conta a parte que mais te incomodou',
      'Quer conselho ou quer só desabafar? Qualquer um dos dois vale',
      'Fico triste de saber disso. Você tem com quem contar?',
      'Dia ruim não define você. Amanhã a gente pensa no resto',
      'Respira. Vamos por partes, com calma',
    ],
    flerte: [
      'Tô do seu lado nisso. E não é só da boca pra fora',
      'Queria estar aí pra te dar um abraço e não falar nada',
    ],
  },
  desconhecido: {
    amizade: [
      'Não entendi bem, mas quero entender. Explica de outro jeito?',
      'Eu te acompanho, só me situa melhor no assunto',
      'Tá, me conta mais. Prefiro perguntar do que fingir que entendi',
      'Ainda tô tentando entender. Você começa por onde?',
      'Fala do jeito que vier, eu organizo a ideia com você',
      'Entendi. Me conta mais que eu quero acompanhar seu raciocínio',
      'Faz sentido. E o que você pretende fazer com isso?',
      'Acho que peguei a ideia. Corrige se eu entender errado',
      'Interessante isso. Nunca tinha pensado por esse lado',
      'Tá bem explicado. E como você se sente depois disso?',
    ],
    flerte: [
      'Gosto quando você fala dessas coisas comigo',
      'Você pensa em muita coisa, e eu gosto de acompanhar',
    ],
  },
  pergunta_rotina: {
    amizade: [
      'Tô num dia comum, resolvendo pequenas coisas. E você, como tá?',
      'Fazendo o básico, mantendo a casa em pé. Nada demais por aqui',
      'Agora à noite eu paro tudo e descanso. Foi um dia cheio',
      'Trabalhei bastante, mas agora estou sentada com calma',
      'Hoje foi dia de resolver pendência antiga. Enfim, saiu',
      'Tô resolvendo umas coisas de casa e ouvindo música baixinho',
      'Agora tô parada com um café na mão, pensando na vida',
      'Saindo da correria do dia. E você, o que anda fazendo agora?',
      'Acabei de terminar o que eu tinha pra fazer. Agora é o meu tempo',
    ],
    flerte: [
      'Nesse momento eu tô conversando com você, que é a melhor parte do dia',
      'Tô quieta em casa. Se você estivesse aqui, o programa tava feito',
    ],
  },
  pergunta_fato: {
    amizade: [
      'Boa pergunta. Sobre isso eu sei pouco, mas o que sei eu te conto',
      'Não tenho certeza, e prefiro não inventar. Se eu souber, te aviso',
      'Pelo que eu sei, é mais ou menos assim. Você ouviu outra versão?',
      'Essa parte eu não acompanhei. Você pode me atualizar?',
      'Sinceramente, não sei. E acho melhor a gente não supor',
      'Vou responder com honestidade: depende do dia',
      'Não tenho opinião fechada sobre isso. Você tem?',
      'Já pensei nisso. Hoje eu responderia de um jeito, amanhã talvez de outro',
      'Prefiro te dar uma resposta sincera a uma resposta bonita',
    ],
    flerte: [
      'Depende do que você vai fazer com a resposta 😏',
      'Vou te responder, mas quero a verdade sua depois',
    ],
  },
  saudade: {
    amizade: [
      'Também penso em você, e não é só quando você aparece',
      'Eu guardo essas conversas comigo, sabia? Fazem diferença',
      'Sinto falta de conversar assim, sem pressa',
      'A distância é chata, mas o carinho continua o mesmo',
      'Eu também pensei em você. Gosto de saber que é mútuo',
      'Sinto falta das nossas conversas, isso eu não escondo',
      'Você falando assim me deixa com vontade de continuar o papo',
      'A saudade é boa quando a gente pode falar dela assim',
      'Também tava com saudade. Por isso vim',
    ],
    flerte: [
      'Saudade mútua, então. Isso muda o dia',
      'Vem matar essa saudade comigo, então 😏',
    ],
  },
  elogio: {
    amizade: [
      'Obrigada. Vindo de você isso tem outro peso',
      'Fico contente, sério. Você também tem um jeito bom de tratar as pessoas',
      'Que bom ler isso. Eu tento ser assim de verdade',
      'Você me deixou sem graça, e eu não fico assim à toa',
      'Obrigada, de verdade. Elogio dito com calma vale mais',
      'Isso foi gentil. Você tem um jeito bom de falar',
      'Fico contente. E devolvo: você tem presença, sabia?',
      'Obrigada. Eu reparo nas coisas que você diz também',
    ],
    flerte: [
      'Você fala assim e eu fico sem graça, mas gosto',
      'Continue que eu não reclamo de elogio 😏',
    ],
  },
  gratidao_recebida: {
    amizade: [
      'Fico feliz de ter ajudado. Você merece cuidado',
      'Não foi nada, mas eu entendo o que você quis dizer',
      'Obrigada você, por confiar em mim com essas coisas',
      'Sempre que precisar, eu tô aqui. Sem cobrança',
      'Nada disso, foi um prazer. Eu gosto de conversar com você',
      'Imagina. Fico feliz que tenha ajudado de alguma forma',
      'Não precisa agradecer. Isso aqui é troca, não favor',
      'Fico contente. Se precisar falar de novo, é só chamar',
    ],
    flerte: [
      'Você agradece bonito. Cuidado que eu me acostumo',
      'Fico feliz. Agora me conta o que melhorou',
    ],
  },
  pedido_historia: {
    amizade: [
      'Vou te contar uma. Uma vez eu esperei quase uma hora por um ônibus',
      'Tenho várias, mas a melhor é longa. Vou resumir',
      'Uma vez eu fiz uma coisa de que eu me arrependo até hoje. Pode rir',
      'Minha história de hoje é simples: consegui resolver o que ninguém resolvia',
      'Essa semana teve uma: eu me arrumei toda pra sair e o destino foi o supermercado',
      'Vou te contar uma coisa que quase ninguém sabe: eu guardo cadernos antigos numa caixa',
      'Um dia eu saí pra caminhar sem rumo e acabei sentada na praça do bairro, vendo o tempo passar',
      'Lembrei de uma agora: na época de escola eu cantava baixinho pra ninguém ouvir',
      'Teve um episódio bom: eu encontrei uma foto antiga e fiquei uma hora olhando',
    ],
    flerte: [
      'Vou te contar uma que eu nunca contei pra ninguém: eu já sonhei com você antes de te conhecer',
      'Minha melhor história recente começa com você me chamando pra conversar',
    ],
  },
  reclamacao_sem_dormir: {
    amizade: [
      'Sem dormir o dia fica borrado. Você já tentou sair da cama e ficar no escuro?',
      'Quando a cabeça não para, eu escrevo o que me incomoda no papel',
      'Noite ruim é cruel. Se puder, tira um cochilo hoje à tarde',
      'Não fica na cama brigando com o sono. Levanta, bebe água, volta depois',
      'Noite ruim derruba o dia seguinte inteiro. O que tá tirando seu sono?',
      'Insônia é cruel. Deixa o celular longe da cama, vale a pena tentar',
      'Se isso está virando rotina, vale conversar com um médico. Sem alarme, mas vale',
      'Faz uma coisa: anota o que está te apertando antes de deitar. Ajuda de verdade',
    ],
    flerte: [
      'Se eu estivesse aí, a gente ficava acordado conversando. Não sei se ajudava',
      'Dorme não. Amanhã você me conta se funcionou',
    ],
  },
  mensagem_enviada: {
    amizade: [
      'Vi, sim. Estou respondendo por partes, porque tem coisa ali que merece calma',
      'Chegou, e eu reli duas vezes antes de responder',
      'Já fui ler. Me dá alguns minutos que eu respondo direito',
      'Vi tudo. Gostei, inclusive do que você não escreveu',
      'Vi sim. Tava no meio de outra coisa e por isso não respondi na hora',
      'Recebi. Desculpa a demora, foi um dia cheio',
      'Já tinha visto. Gostei, inclusive',
      'Vi tudo. Você manda coisa boa',
    ],
    flerte: [
      'Vi e reli. Você sabe escolher o que mandar 😏',
      'Vi sim, e fiquei pensando em você depois',
    ],
  },
  fofoca: {
    amizade: [
      'Ela contou isso pra quem? Porque assim muda tudo',
      'Eu conheço essa história de outro jeito, se você quiser ouvir',
      'Prefiro não sair repetindo isso, mas com você eu comento',
      'Tem coisa que eu só falo pessoalmente, viu?',
      'Fiquei de queixo caído, e olha que eu já vi de tudo',
      'Conta o resto. Eu gosto de saber das coisas por você',
      'Isso tá rendendo, hein. E o que aconteceu depois?',
      'Eu não espalho, mas quero saber o final',
    ],
  },
  piada: {
    amizade: [
      'Essa foi boa, mas eu já conhecia a metade do final',
      'Ri sozinha aqui, e ainda bem que ninguém viu',
      'Conta outra, gostei do ritmo da sua história',
      'Piada boa é assim: curta e sem explicação depois',
      'Essa foi boa. Você tem talento pra contar história',
      'Boa. Eu ri aqui, e precisava rir hoje',
      'Eu não esperava essa, viu',
    ],
  },
  conselho: {
    amizade: [
      'Antes de decidir, escreve o que você ganha e o que perde. Ajuda a ver',
      'Meu conselho é conversar primeiro, sem pressa de decidir',
      'Ninguém decide bem cansado. Dorme e volta no assunto amanhã',
      'Pensa no que peso maior: o alívio agora ou a paz depois',
      'Você já sabe a resposta, só está com medo dela. E tá tudo bem',
      'Olha, o que eu faria é começar pela parte mais simples e deixar o resto pro fim',
      'Não vou te dizer o que fazer. Mas eu não tomaria decisão grande num dia ruim',
      'Meu conselho: escreve o que te pesa. No papel a gente enxerga melhor',
      'Pensa com calma e conversa com alguém de confiança antes de decidir',
    ],
  },
  convite: {
    amizade: [
      'Vamos sim. Marca o dia com calma, que eu me organizo',
      'Gostei do convite. Pode deixar que eu confirmo até amanhã',
      'Topo, mas escolhe um lugar tranquilo que a gente converse',
      'Aceito! Faz tempo que eu não saio com quem me faz bem',
      'Aceito, com prazer. Me diz o dia e eu me organizo',
      'Pode contar comigo. Só preciso de um aviso com antecedência',
      'Gostei. Escolhe o lugar e me passa as horas',
    ],
    flerte: [
      'Aceito. E escolho um lugar tranquilo pra gente conversar de verdade',
      'Vamos marcar. Só te aviso: eu sou de conversa longa',
    ],
  },
};

/** Reacoes de quem vai contar uma historia: ela escolhe antes de comecar. */
export const RECEPCOES_HISTORIA: string[] = [
  'Deixa eu escolher uma boa',
  'Tenho uma pra te contar',
  'Essa eu tenho guardada',
  'Boa, eu gosto de contar essa',
  'Vou te contar uma que aconteceu comigo',
  'Calma que essa tem detalhe',
];

/** Usados quando você chama a ficha pelo nome ou apelido. */
export const CHAMADO_PELO_NOME: string[] = [
  'Chamou? tô aqui 😊', 'Diga, é comigo mesmo?', 'Oi! Você falou meu nome e eu vim',
  'Pode falar, tô prestando atenção', 'Ué, chamou? kkk tô aqui', 'Fala, meu nome soa bem na sua voz',
];

/** Quando você escreve o seu próprio nome, num tom mais formal. */
export const FALOU_PROPRIA_NOME: string[] = [
  'Você escrevendo o seu nome assim ficou formal, hein kkk',
  'Por que o formal? Aqui você pode ser você mesmo 😄',
  'Gostei do nome, mas você não precisa se apresentar pra mim',
  'Virou cerimônia agora? kkk fala comigo normal',
];

/**
 * Sugestões extras na voz de quem usa o app (os botões que aparecem no chat).
 * Somadas às de `dialogue.ts`, cada situação passa a ter muito mais opções.
 */
export const MAIS_SUGESTOES: Record<string, BancoDeFalas> = {
  'ela-perguntou': {
    amizade: [
      'Deu tudo certo por aqui. Agora estou mais tranquilo, e você?',
      'Foi um dia cheio, mas rendeu. Me conta como foi o seu',
      'Nada de novo, o normal. E você, o que anda fazendo de bom?',
      'Tô bem, sim. Hoje foi calmo, deu até pra descansar um pouco',
      'Foi um dia cheio! Consegui resolver umas coisas e agora tô mais tranquilo. E você?',
      'Tudo certo por aqui. Me conta como você tá de verdade, sem o "tô bem" kk',
      'Dia normal, mas melhorou agora. E o seu, como tá sendo?',
      'Confesso que acordei sem energia, mas agora tô melhor. Você dormiu bem?',
      'Tô na correria, mas parei tudo pra te responder 🙂 e aí, me conta',
    ],
    flerte: [
      'Melhorou de verdade agora, e você sabe o motivo',
      'Meu dia ficou bom quando vi seu nome na tela',
      'Tô bem, mas eu tava com saudade de conversar com você',
      'Meu dia ficou melhor agora, viu 😏 e você, pensando em quem?',
      'Tava corrido, mas sempre sobra tempo pra você. Me conta do seu dia',
      'Foi bem! A melhor parte foi abrir o celular e ver mensagem sua',
      'Tô bem sim 😊 e você, com saudade ou só com tempo livre?',
      'Se eu te contar tudo aqui vira texto longo kkk melhor te ver e contar',
    ],
    picante: [
      'Tô bem, mas com a cabeça ocupada com uma pessoa 😏',
      'Dia pesado, noite ainda com energia. E você?',
      'Melhorou agora. Você tem esse efeito em mim 🔥',
    ],
  },
  'ela-contou': {
    amizade: [
      'Isso cansa mesmo. Você conseguiu descansar um pouco depois?',
      'Entendi. E o que ficou pendente pra amanhã?',
      'Você deu conta de tudo sozinho? Precisa de uma mão?',
      'Nossa, que dia. E olha que você ainda achou tempo pra conversar',
      'Nossa, que semana! Você conseguiu descansar depois?',
      'Isso cansa mesmo. Precisa de alguma coisa? Eu tô por aqui',
      'Você levou tudo com muita calma, admiro isso',
      'Que correria, hein. Amanhã promete menos, tomara',
      'Sério? Me conta mais, eu quero entender melhor',
    ],
    flerte: [
      'Queria estar aí pra melhorar o seu dia',
      'Você merece um cuidado. Me diz o que te faria bem agora',
      'Se eu estivesse aí, esse cansaço ia embora rápido',
      'Se eu estivesse aí você não teria esse dia ruim, eu prometo',
      'Você merece um descanso bom e alguém querendo seu bem 😊',
      'Queria estar perto pra te ajudar de verdade',
      'Isso me dá vontade de te cuidar. E não é só conversa',
      'Vem cá, eu escuto tudo com calma e depois a gente resolve',
    ],
    picante: [
      'Deixa eu aliviar essa semana sua de outro jeito 😏',
      'Você cansado assim e eu com energia aqui é desequilíbrio 🔥',
      'Vem me contar pessoalmente, que eu sei como resolver',
    ],
  },
  'ela-convidou': {
    amizade: [
      'Topo. Só me diz o dia que eu me organizo',
      'Aceito, com prazer. Escolhe o lugar que eu vou',
      'Vamos sim, que já faz tempo que a gente não se vê',
      'Topo! Me diz o dia e o horário que eu me organizo',
      'Bora sim, gosto de programa assim sem drama',
      'Aceito, mas quero lugar onde a gente consiga conversar',
      'Gostei da ideia. Que tal sábado, mais pro fim da tarde?',
      'Fechado! Vou ver aqui e te confirmo hoje mesmo',
    ],
    flerte: [
      'Eu tava esperando esse convite, tô dentro',
      'Aceito, mas escolhe um lugar tranquilo pra conversar direito',
      'Com você eu topo até coisa que eu não costumo fazer',
      'Eu tava esperando esse convite 😏 tô dentro',
      'Aceito, mas você me deve uma sobremesa',
      'Com você eu topo até o que eu não gosto 😄',
      'Vamos sim. Só não vale ficar com vergonha na hora',
      'Tô dentro. E se o papo for bom, a gente estende a noite 😏',
    ],
    picante: [
      'Aceito, mas sem plateia e sem pressa 🔥',
      'Vamos sim. Depois eu te digo o resto pessoalmente 😏',
      'Tô dentro, e levo a melhor disposição possível',
    ],
  },
  'ela-fechada': {
    amizade: [
      'Percebi que você tá quieta. Aconteceu algo?',
      'Se quiser espaço, eu entendo. Tô aqui quando você quiser falar',
      'Não vou insistir, mas saiba que pode contar comigo',
      'Eu senti que você tá diferente. Quer falar sobre isso?',
      'Se você precisar de espaço eu entendo. Tô aqui quando quiser',
      'Não vou insistir, mas conta comigo pra qualquer coisa',
      'Tá tudo bem? Se for comigo, pode falar sem medo',
      'Vou te dar tempo, mas não vou te deixar sozinha nisso',
    ],
    flerte: [
      'Tô aqui, mesmo quieto. Fala comigo quando puder 😊',
      'Vou respeitar seu momento. Só não some de vez, tá?',
      'Qualquer coisa, eu tô a uma mensagem de distância',
      'Se for coisa que eu causei, me fala que eu conserto',
    ],
    picante: [
      'Respeito seu tempo. Quando quiser, você sabe onde me achar 😏',
      'Vou esperar. Mas a saudade vai bater, aviso desde já',
    ],
  },
  'ela-elogiou': {
    amizade: [
      'Obrigado, você também tem um jeito que agrada',
      'Fico feliz de ler isso, sério mesmo',
      'Valeu. E o elogio é recíproco, viu?',
      'Obrigado 🙂 você também tem um jeito que agrada',
      'Fico feliz de ler isso, sério mesmo',
      'Valeu! Vou dormir mais leve hoje por causa disso',
      'Vindo de você, eu acredito 😄 obrigado',
      'Você é generoso, e isso é bonito de ver',
    ],
    flerte: [
      'Vindo de você o elogio vale dobrado',
      'Agora você me deixou animado, vou ter que retribuir',
      'Vindo de você o elogio vale dobrado 😊',
      'Você fala assim e eu já fico querendo te ver',
      'Agora eu tenho motivo pra sorrir o dia inteiro',
      'Se você continuar, eu vou ter que retribuir pessoalmente 😏',
      'Gostei. Vou fingir costume, mas anotei cada palavra',
    ],
    picante: [
      'Se você falar isso perto de mim eu não respondo por nós dois 😏',
      'Tô achando que a gente precisa se ver logo 🔥',
      'Continua elogiando e a conversa muda de assunto sozinha',
    ],
  },
  'ela-saudade': {
    amizade: [
      'Também estava com saudade de conversar assim',
      'Você faz falta nas conversas daqui, sabia?',
      'Também tô com saudade. Bora marcar algo simples então?',
      'Saudade boa essa. Tô com você na cabeça também',
      'Vem cá, me conta tudo que eu quero ouvir',
      'Fico feliz de saber disso, juro. Vamos nos ver mais',
      'Saudade de conversa é a melhor que existe',
    ],
    flerte: [
      'Também sinto. E confesso que mais do que devia',
      'Saudade boa é essa, de quem a gente quer bem pertinho',
      'Saudade também. E se a gente resolvesse isso hoje? 😏',
      'Eu ia dizer que tô bem, mas minha cara diz outra coisa',
      'Tô com saudade do seu jeito e da sua voz',
      'Vem matar essa saudade, eu deixo as portas abertas',
      'Você sentindo minha falta é a melhor notícia do dia',
    ],
    picante: [
      'Saudade é pouco pro que eu tô sentindo 😏',
      'Então vem, porque a minha também tá grandinha 🔥',
      'Tô aqui pensando em você de um jeito que não dá pra escrever',
    ],
  },
  'ela-neutra': {
    amizade: [
      'Entendi. E o que você acha disso tudo?',
      'Isso faz sentido. Continua que eu tô acompanhando',
      'Pois é. Tem coisa que a gente só entende com o tempo',
      'Boa. E muda o que na sua rotina?',
      'Boa, entendi. E me conta: apareceu alguma novidade por aí?',
      'Faz sentido. Vou pensar nisso e te falo depois',
      'Tá certo. Por falar nisso, como você tá de ânimo hoje?',
      'Uhum. Mudando um pouco: você fez algo bom hoje?',
      'Certo. Vou puxar um assunto melhor então kk',
    ],
    flerte: [
      'Gostei. Continua falando que eu gosto de te ouvir',
      'Você fala com uma calma que me agrada',
      'Só entendi que eu preciso de mais tempo com você 😏',
      'Combinado. Mas o próximo assunto eu escolho',
      'Gostei. Continua falando que eu gosto de ouvir',
      'A gente conversa bem demais pra ficar só nisso',
      'Você vai me deixar querendo mais, e eu vou deixar',
    ],
    picante: [
      'Mudando de assunto: você é sempre assim tão direto? 😏',
      'Conversa boa assim termina de outro jeito, você sabe',
    ],
  },
  'ela-familia': {
    amizade: [
      'Manda um abraço pra ela de minha parte',
      'Que bom que a família está bem. Isso é o que importa',
      'Eu pergunto porque me importo com quem você gosta',
      'Fico feliz de saber! Manda um abraço pra eles de mim',
      'Que bom que eles estão bem. Família é base, né',
      'Conta mais dessa história, eu gosto de coisa de família',
      'Se um dia eu encontrar com eles, já vou chegar conhecendo kkk',
      'Isso me deu um quentinho no peito, sério',
    ],
    flerte: [
      'Quero conhecer todos com o tempo 😊 não é só papo',
      'Gosto disso, gente que fala da família é gente de verdade',
      'Já tô imaginando o almoço de domingo com esse pessoal todo',
      'Meu nome já circulou por aí nessa conversa? 😏',
    ],
  },
};

// ---------------------------------------------------------------------------
// Nomes
// ---------------------------------------------------------------------------

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della']);

/** Palavras que também são nomes: só valem com maiúscula no meio da frase. */
const NOMES_PALAVRA_COMUM = new Set([
  'rosa', 'luz', 'mel', 'sol', 'rio', 'fe', 'dom', 'paz', 'vida', 'amor', 'mar', 'ceu',
  'lua', 'estrela', 'alva', 'flor', 'cruz', 'santa', 'real', 'nobre', 'violeta', 'lirio',
  'jade', 'cristal', 'primavera', 'aurora', 'esmeralda', 'perola', 'agua', 'terra', 'fogo',
  // Palavras comuns que também aparecem como nome: sem maiúscula, não vale.
  'lia', 'dia', 'boa', 'mal', 'bem', 'mas', 'sim', 'tia', 'tio', 'avo',
]);

const escapar = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compara nomes sem acento e sem maiúscula. */
export function normalizarNome(valor: string) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Partes aproveitáveis de um nome: "Marina Costa" dá Marina e Costa. */
export function partesDoNome(nome: string): string[] {
  return (nome || '')
    .split(/\s+/)
    .map(parte => parte.replace(/[^\p{L}]/gu, ''))
    .filter(parte => parte.length >= 3 && !PARTICULAS.has(normalizarNome(parte)));
}

/** Como a pessoa pode ser chamada: primeiro nome, nome do meio e apelido. */
export function nomesDaPessoa(pessoa: { nome?: string; apelido?: string }): string[] {
  const lista = [...partesDoNome(pessoa.nome || '')];
  const apelido = (pessoa.apelido || '').trim();
  if (apelido.length >= 3) lista.push(apelido);
  const vistos = new Set<string>();
  return lista.filter(nome => {
    const chave = normalizarNome(nome);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/** O nome aparece mesmo no texto? Nomes curtos ou comuns exigem maiúscula. */
export function nomeAparece(texto: string, nome: string): boolean {
  const alvo = normalizarNome(nome);
  if (alvo.length < 3) return false;
  const normalizado = normalizarNome(texto);
  const busca = new RegExp(`(^|[^a-z0-9])${escapar(alvo)}(?=[^a-z0-9]|$)`);
  if (!busca.test(normalizado)) return false;
  const exigeMaiuscula = alvo.length <= 2 || NOMES_PALAVRA_COMUM.has(alvo);
  if (!exigeMaiuscula) return true;
  const comMaiuscula = new RegExp(`(^|[^\\p{L}\\p{N}])${escapar(alvo[0].toUpperCase() + alvo.slice(1))}(?=[^\\p{L}\\p{N}]|$)`, 'u');
  return comMaiuscula.test(texto);
}

/**
 * Nomes citados na mensagem, na ordem em que aparecem no texto.
 * Serve para ela responder já falando da pessoa certa ("a Ana tá ótima").
 */
/** Palavras que começam frase com maiúscula e não são nome de ninguém. */
const PALAVRAS_COMUNS = new Set(['voce', 'vc', 'hoje', 'amanha', 'ontem', 'tudo', 'bom', 'boa', 'oi', 'ola', 'opa',
  'obrigado', 'obrigada', 'deus', 'senhor', 'senhora', 'dona', 'tia', 'tio', 'mae', 'pai', 'filho', 'filha', 'irmao',
  'irma', 'amor', 'meu', 'minha', 'eu', 'ele', 'ela', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'agora',
  'depois', 'quando', 'como', 'porque', 'mas', 'tambem', 'muito', 'nada', 'alguem', 'ninguem', 'parabens', 'feliz',
  'saudade', 'igreja', 'trabalho', 'escola', 'faculdade', 'sim', 'nao', 'talvez', 'sera', 'nossa', 'jesus', 'cristo',
  'natal', 'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'janeiro', 'fevereiro', 'marco',
  'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'doutor', 'doutora',
  'professor', 'professora', 'vamos', 'bora', 'entao', 'olha', 'escuta', 'sabe', 'fala', 'sobre', 'para', 'aqui',
  'ali', 'quem', 'qual', 'onde', 'casa', 'rua', 'cidade', 'bahia', 'brasil', 'salvador']);

/**
 * Nomes próprios que aparecem no meio da frase e ela ainda não conhece.
 * Nomos citados por você viram assunto nas próximas conversas.
 */
export function nomesEstranhos(texto: string, conhecidos: string[]): string[] {
  if (!texto) return [];
  const sabidos = new Set(conhecidos.flatMap(nome => nomesDaPessoa({ nome })).map(normalizarNome));
  const achados: string[] = [];
  const padrao = /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}/g;
  let casado: RegExpExecArray | null;
  while ((casado = padrao.exec(texto))) {
    const bruto = casado[0];
    // Nome no comecinho da mensagem costuma ser só a primeira palavra da frase.
    const antes = texto.slice(0, casado.index).trimEnd();
    if (!antes) continue;
    const chave = normalizarNome(bruto);
    if (sabidos.has(chave) || PALAVRAS_COMUNS.has(chave) || achados.includes(bruto)) continue;
    achados.push(bruto);
  }
  return achados.slice(0, 2);
}

/** A reação de quem ouviu um nome novo e quer saber quem é. */
export const PESSOA_NOVA: string[] = [
  '{pessoa}? Quem é, me conta', '{pessoa} é quem? Fiquei curiosa', 'Esse {pessoa} aparece bastante, hein',
  'Anotei o nome: {pessoa}. É seu amigo?', 'Não conheço esse {pessoa}. Me apresenta depois',
  'Falou de {pessoa} e eu já fiquei atenta',
];

/** Ela puxa de volta alguém que você citou antes. */
export const LEMBRETE_PESSOA: string[] = [
  'E sobre {pessoa}, tem novidade?', 'Você falou de {pessoa} outro dia. Como ficou?',
  'Pensou mais em {pessoa}?', 'E {pessoa}, apareceu por aí?',
];

export function nomesNaMensagem<T extends { nome: string; papel?: string }>(texto: string, alvos: T[]): T[] {
  const achados: { alvo: T; posicao: number }[] = [];
  const normalizado = normalizarNome(texto);
  for (const alvo of alvos) {
    for (const nome of nomesDaPessoa(alvo)) {
      if (!nomeAparece(texto, nome)) continue;
      achados.push({ alvo, posicao: normalizado.indexOf(normalizarNome(nome)) });
      break;
    }
  }
  return achados.sort((a, b) => a.posicao - b.posicao).map(item => item.alvo);
}

/* ---------------------------------------------------------------------------
   Registro adulto
   Gente adulta conversa de outro jeito: assunto concreto, frase inteira, menos
   risada solta e quase nenhum "own". Este material entra quando a ficha tem
   maturidade alta (idade e marcadores da ficha decidem) e sai do caminho das
   fichas mais novas, que continuam com o repertório leve.
--------------------------------------------------------------------------- */

/** Reações curtas de quem já passou dos vinte e poucos. */
export const RECEPCOES_MADURA: Record<'positivo' | 'negativo' | 'neutro', string[]> = {
  positivo: [
    'Isso me deixou bem', 'Que notícia boa de ler', 'Fico feliz de verdade com isso',
    'Você tem razão, foi um bom dia', 'Ótimo saber', 'Gostei do que você disse',
    'Isso aquece o coração, viu', 'Boa, isso me animou', 'Fico contente por você',
    'Boa notícia, viu', 'Que bom saber disso', 'Fico feliz por você',
    'Isso me alegra o dia', 'Boa, muito bom', 'Que coisa boa de ler',
  ],
  negativo: [
    'Que chato isso', 'Sinto muito, de verdade', 'Isso pesa, eu sei', 'Vem cá, me conta com calma',
    'Poxa, que fase', 'Não é fácil mesmo', 'Entendo o que você está sentindo',
    'Isso cansa qualquer um', 'Vamos por partes, com calma', 'Isso é duro de passar',
    'Sinto muito por isso', 'Conta comigo, viu', 'Que situação difícil',
    'Estou aqui se quiser falar', 'Isso me deixa preocupada com você',
  ],
  neutro: [
    'Entendi', 'Faz sentido', 'Pois é', 'Interessante isso', 'Anotei isso',
    'É, dá o que pensar', 'Entendi o ponto', 'Certo, entendi',
    'Certo, acompanhei', 'Faz sentido, viu', 'Entendi bem', 'Pois é, é assim mesmo',
    'Tá certo', 'Entendi, continue', 'Certo, entendi o que você disse',
  ],
};

/**
 * Respostas adultas por intenção: mais conteúdo e menos enfeite. Somam-se às
 * normais quando a ficha é madura — o resto do motor continua igual.
 */
export const MAIS_RESPOSTAS_MADURA: Record<string, BancoDeFalas> = {
  saudacao: {
    amizade: [
      'Oi! Tudo bem por aqui. O dia foi cheio, mas agora estou mais tranquila. E você, como está de verdade?',
      'Oi! Que bom te ver. Estava justamente organizando a semana na cabeça. Me conta como foi a sua',
      'Olá! Acabei de chegar e sentei um pouco. Como foi o seu dia até agora?',
      'Oi! Ando na correria, mas sempre sobra um tempo para uma boa conversa. Como estão as coisas por aí?',
    ],
    flerte: [
      'Oi, você! Apareceu na melhor hora. Estava pensando em como você está desde ontem',
      'Oi! Gostei de ver seu nome aqui. Conta: como foi seu dia, sem resumo',
    ],
  },
  despedida: {
    amizade: [
      'Vou indo então. Descansa bem, que amanhã a gente continua',
      'Boa noite! Foi bom conversar. Cuida de você e dorme cedo',
      'Até mais! Qualquer coisa, me escreve depois',
    ],
    flerte: [
      'Vou indo, mas foi difícil desligar com você falando assim. Boa noite',
      'Boa noite! Deixa a saudade trabalhar e me procura amanhã',
    ],
  },
  apoio: {
    amizade: [
      'Sinto muito, de verdade. Você não precisa resolver tudo hoje: escolhe uma coisa pequena e começa por ela. Quer pensar junto?',
      'Isso pesa bastante, e você não precisa carregar sozinho. Me conta o que aconteceu de fato, com calma',
      'Poxa. Respira um pouco antes de responder qualquer coisa. E me diz o que você precisa agora: conversar ou resolver?',
      'Já passei por algo parecido e sei que a cabeça fica cheia. Estou aqui, sem pressa, e não vou te cobrar nada',
    ],
    flerte: [
      'Vem cá, desafoga comigo. Eu prefiro te ouvir de verdade a te dar resposta pronta',
      'Sinto muito, meu bem. Fica perto de quem te faz bem hoje, mesmo que seja por mensagem',
    ],
  },
  alegria: {
    amizade: [
      'Que boa notícia. Você trabalhou por isso e merece comemorar, mesmo que seja com um café e um suspiro',
      'Fico muito feliz por você. Conta como foi o momento em que você percebeu que ia dar certo',
      'Isso é resultado, não sorte. Aproveita o gostinho e me conta o que vem depois',
    ],
    flerte: [
      'Fico feliz por você, e confesso que gostaria de estar aí para comemorar junto',
      'Que notícia boa! Isso pede um jantar ou, no mínimo, uma boa conversa à noite',
    ],
  },
  agradecimento: {
    amizade: [
      'Imagina, foi um prazer. Se precisar de novo, é só chamar',
      'Não precisa agradecer. Gosto de saber que ajudei de verdade',
      'Fico contente em ajudar. E olha que eu não falo isso por educação',
    ],
  },
  pergunta_pessoal: {
    amizade: [
      'Deixa eu pensar com honestidade: gosto de conversa boa, café bem passado e sábado sem pressa. Se você me perguntar o que me move, é aprender algo novo de vez em quando',
      'Gosto de coisas simples e bem feitas: comida em casa, música no fim do dia e gente que fala a verdade. E você, me conta o que te faz bem',
      'Sinceramente? Hoje eu valorizo mais descanso e boas companhias do que novidade. Já fui mais afoita. E você, se conhece bem?',
    ],
    flerte: [
      'Vou responder com sinceridade: gosto de conversa que rende, de gesto pensado e de quem sabe ouvir. O resto a gente descobre',
      'Prefiro dizer assim: gosto de química que não precisa ser anunciada. E de um fim de tarde bem acompanhado',
    ],
  },
  pedido_historia: {
    amizade: [
      'Vou contar uma: semana passada eu me perdi no mercado e fiquei vinte minutos procurando o carro. Pode rir',
      'Hoje eu parei no meio da tarde, sentei na varanda e não fiz nada. Foi a melhor decisão do dia',
      'Achei uma foto antiga da minha mãe numa gaveta e fiquei olhando, sem pressa nenhuma',
    ],
    flerte: [
      'Vou te contar: acordei pensando em você e fiquei com raiva de não estar aí',
      'Uma coisa que eu nunca contei: eu guardo as conversas que me fazem bem. Essa está indo para a lista',
    ],
  },
  reclamacao_sem_dormir: {
    amizade: [
      'Isso é ruim demais. Se a cabeça não para, levanta, bebe água e anota o que está te apertando no papel. Ajuda de verdade',
      'Noite ruim é assim: o corpo cansa e a cabeça acelera. Tenta deitar com o celular longe por vinte minutos',
      'Você dormiu mal por causa de problema ou foi a cabeça solta? Me conta, às vezes falar já alivia',
    ],
    flerte: [
      'Queria estar aí para te fazer companhia até o sono chegar. Mas fica meu recado: deita e pensa em coisa boa',
    ],
  },
  gratidao_recebida: {
    amizade: [
      'Não precisa agradecer, de verdade. Eu gosto de conversar com você, isso já basta',
      'Imagina! Se a conversa ajudou em alguma coisa, já valeu o dia',
      'Nada disso, foi um prazer. E fica combinado: quando quiser falar, eu estou por aqui',
    ],
    flerte: [
      'Agradece não, que eu fico querendo mais. E olha que a melhor parte da conversa foi você',
    ],
  },
  pergunta_rotina: {
    amizade: [
      'Agora estou em casa, resolvendo coisa de casa e deixando a cabeça sossegar. E o seu dia, rendeu?',
      'Nessa hora eu costumo parar. Terminei o que precisava, agora só descanso e converso. Como está a sua noite?',
      'Acabei de sair do banho e sentei com um chá. Conta o que você está fazendo da vida hoje',
    ],
    flerte: [
      'Estou em casa, tranquila, com tempo de sobra para uma conversa boa. Se você estivesse aqui, o programa era melhor',
      'Nada planejado para hoje, o que é perigoso quando você aparece para conversar',
    ],
  },
  pergunta_fato: {
    amizade: [
      'Boa pergunta. Não tenho resposta decorada, mas posso pensar com você: o que você já tentou?',
      'Depende do contexto, e isso muda o resultado. Me conta a situação inteira que eu respondo com mais cuidado',
      'Vou ser honesta: nunca parei para pensar assim. Se você me der um minuto, eu penso direito',
    ],
  },
  mensagem_enviada: {
    amizade: [
      'Vi sim, abri quando deu. Ainda vou responder com calma, mas já adianto que gostei',
      'Chegou aqui e eu li. Tive um dia cheio, por isso a demora. Obrigada por lembrar de mim',
      'Vi! Estava no meio de uma reunião, mas já guardei para comentar direito',
    ],
    flerte: [
      'Vi, reli e fiquei pensando em você mais tempo do que devia',
      'Eu abro tudo que vem de você. Inclusive na hora errada',
    ],
  },
  cotidiano_trabalho: {
    amizade: [
      'Dia de trabalho é isso: reunião atrás de reunião e a lista que não acaba. Você conseguiu fazer o principal?',
      'Entendo bem. Eu terminei o que era urgente e deixei o resto para amanhã, senão vira noite. E você, consegue desligar?',
      'Serviço pesado cobra um preço no fim do dia. Procure descansar de verdade, não só trocar de tela',
    ],
  },
  vida_adulta: {
    amizade: [
      'A parte adulta da vida é essa: contas no lugar, casa em ordem e um resto de cansaço. Você está conseguindo cuidar de você no meio disso?',
      'Depois de um dia desses eu quero silêncio e um banho demorado. E você, o que te recarrega?',
      'Eu aprendi a deixar uma coisa para amanhã sem culpa. Ainda estou treinando, mas rende',
    ],
  },
  igreja: {
    amizade: [
      'Foi bom, como sempre. Fico diferente depois de uma reunião que me faz pensar na semana',
      'Deu tudo certo, e ainda sobraram conversas boas no fim. Você vai domingo?',
      'Hoje eu saí de lá com aquela sensação de dever cumprido. Tem coisa que só a fé explica',
    ],
  },
  conselho: {
    amizade: [
      'Vou te dar minha opinião, mas quem decide é você. Eu olharia o que você não quer perder e a partir disso escolheria',
      'Se fosse comigo, eu esperaria um dia antes de responder. Decisão com pressa costuma cobrar depois',
      'Eu faria o mais simples: conversaria aberto com quem está envolvido e diria o que espero. Você consegue fazer isso?',
    ],
  },
  saudade: {
    amizade: [
      'Também tenho pensado em você. A vida corre, mas as pessoas boas a gente não esquece',
      'Sinto falta do nosso papo, e disso eu não vou fingir o contrário. Como você está de verdade?',
    ],
    flerte: [
      'Também senti. E vou ser sincera: pensar em você está virando hábito',
      'Saudade é pouco para o que eu ando sentindo. Você aparece na melhor hora',
    ],
  },
  convite: {
    amizade: [
      'Aceito, com prazer. Me diga o dia e o lugar que eu me organizo',
      'Gostei do convite. Essa semana é corrida, mas sábado eu consigo. Combinamos?',
      'Topo. Só me confirma o dia que eu arrumo a agenda',
      'Pode contar comigo. Escolhe o lugar e me avisa',
      'Boa ideia. Sábado à tarde fica bom pra mim, e pra você?',
      'Gostei. Vamos marcar com calma, sem atropelo',
    ],
    flerte: [
      'Aceito. E escolho lugar com pouca gente, para a gente conversar de verdade',
      'Vamos marcar. Só vou te avisar: eu sou de conversa longa',
    ],
  },
  tedio: {
    amizade: [
      'Também estou num dia morno. Sinceramente, um livro ou uma conversa boa resolve isso melhor que tela',
      'Nada de interessante por aqui também. Aproveita e faz nada com propósito, faz bem',
    ],
  },
  desconhecido: {
    amizade: [
      'Acho que entendi. Me explica de outro jeito pra eu não responder errado',
      'Interessante. E como você chegou a isso?',
      'Faz sentido para mim. Me diga o resto quando puder',
    ],
  },
  piada: {
    amizade: [
      'Essa foi boa. Você tem talento para contar história',
      'Boa, eu ri aqui. Mas confessa que foi ensaiada',
    ],
  },
  elogio: {
    amizade: [
      'Obrigada, isso é bom de ouvir. E vale dizer: você também tem presença, sabia?',
      'Obrigada de verdade. Elogio dito com calma vale mais do que muitos exageros',
    ],
    flerte: [
      'Obrigada. Vindo de você, eu levo a sério e guardo o resto do dia',
      'Você fala isso com uma calma que me desarma. Anotado',
    ],
  },
  pergunta_familiar: {
    amizade: [
      '{familiar} está bem, obrigada por perguntar. Ela vive ocupada e ainda acha tempo para todos',
      'Está tudo certo com {familiar}. Obrigada por lembrar, isso me deixa bem com você',
      '{familiar} anda com a rotina cheia, mas está bem. E a sua família, como vai?',
    ],
  },
  resposta_curta: {
    amizade: [
      'Tudo bem, sem pressa. Quando você quiser falar mais, eu estou por aqui',
      'Entendi. Se quiser, me conta como foi de verdade — resposta curta às vezes esconde um dia longo',
    ],
  },
};

/** Perguntas de gente adulta: assunto concreto, sem rodeio. */
export const MAIS_PERGUNTAS_MADURA: Record<string, string[]> = {
  dia: [
    'E o seu dia, foi como você esperava?',
    'Você conseguiu descansar ou foi dia inteiro de compromisso?',
    'O que ficou pendente para amanhã?',
    'Você cuidou de você hoje ou só dos outros?',
  ],
  trabalho: [
    'Como está o trabalho nessa fase?',
    'Você está conseguindo desligar no fim do dia?',
    'Aquilo que você comentou do serviço, como terminou?',
    'Você anda satisfeito com o rumo profissional?',
  ],
  familia: [
    'Como estão as coisas na sua casa?',
    'Você tem conseguido ver a sua família com calma?',
    'Como está a saúde dos seus pais?',
    'Alguém da família passa bem por aí?',
  ],
  casa: [
    'Como está a rotina da casa essa semana?',
    'Você deu conta do serviço que estava pendente?',
    'Como você organiza a semana para não estourar?',
    'Sobrou tempo para você nesse meio todo?',
  ],
  saude: [
    'E a saúde, como está? Pergunto de verdade',
    'Você tem dormido bem? Isso muda tudo',
    'Fez algum exame de rotina esse ano?',
    'Está conseguindo caminhar ou fazer algo por você?',
  ],
  dinheiro: [
    'E as contas, estão em ordem esse mês?',
    'Você conseguiu guardar alguma coisa ou o mês foi dos gastos?',
    'Como você está organizando o financeiro?',
  ],
  cansaco: [
    'Você está dormindo bem ou acordando cansado?',
    'Tem descansado de verdade ou só no fim de semana?',
    'O que te cansa mais nessa fase?',
  ],
  descanso: [
    'Você tem reservado um tempo só para você?',
    'O que você faz quando quer descansar de verdade?',
    'Conseguiu parar no fim de semana?',
  ],
  futuro: [
    'Você pensa muito no que vem depois?',
    'O que você quer resolver nos próximos meses?',
    'Tem algum plano que você está adiando?',
  ],
  igreja: [
    'Você conseguiu ir essa semana?',
    'Como está o seu chamado na ala?',
    'Você sente que a fé tem sustentado você?',
  ],
  fe: [
    'Você tem reservado tempo para o que te faz bem por dentro?',
    'A parte espiritual anda bem cuidada?',
  ],
  comida: [
    'Você comeu alguma coisa boa hoje ou foi café e correria?',
    'Você cozinha em casa ou anda comendo fora?',
  ],
  viagem: [
    'Você precisa de uma viagem para descansar?',
    'Tem algum lugar que você quer conhecer esse ano?',
  ],
  casa_adulta: [
    'Como você está dando conta da casa e das contas ao mesmo tempo?',
    'Você consegue delegar alguma coisa ou faz tudo sozinho?',
  ],
  amor: [
    'Como você está lidando com essa parte da vida?',
    'Você sente que está sendo cuidado como deveria?',
    'O que você espera de alguém hoje em dia?',
  ],
  filhos: [
    'Como estão as crianças com a rotina?',
    'Você tem conseguido tempo com eles sem a correria atrapalhar?',
  ],
  estudo: [
    'Você está conseguindo manter a rotina de estudo?',
    'Essa fase de prova está pesada?',
  ],
  musica: [
    'Qual música tem acompanhado essa fase?',
    'Você tem parado para ouvir música ou só barulho de fundo?',
  ],
  clima: [
    'Esse tempo por aí está como?',
    'Você é do calor ou precisa de frio para ficar bem?',
  ],
  pet: [
    'Como está o seu bichinho?',
    'Quem faz companhia para você em casa?',
  ],
  treino: [
    'Você tem mantido alguma atividade física?',
    'Como anda o corpo nessa fase?',
  ],
  idoso: [
    'Como estão os mais velhos da família?',
    'Quem cuida de quem cuida de todos por aí?',
  ],
  saudade: [
    'Do que você anda com saudade ultimamente?',
    'Sente falta de alguma fase sua?',
  ],
  alegria: [
    'O que melhorou na sua vida nos últimos meses?',
    'Do que você está contente hoje, sem falsa modéstia?',
  ],
};

/**
 * Enfeite de conversa molecagem: quando a ficha é madura, essas linhas saem do
 * sorteio (o banco geral continua servindo para as fichas mais novas).
 */
export const INFANTIL: RegExp[] = [
  /\bown\b/i, /k{3,}/i, /sksk/i, /\bmó\b/i, /\bsla\b/i, /tipo assim/i, /\bmds\b/i, /\baff\b/i,
  /\bfofo|fofa\b/i, /\bboba\b/i, /\bbobo\b/i, /\bmolecagem\b/i, /\bshii\b/i, /\bkk\b/i,
  /xixi/i, /papo raso/i, /\bnham\b/i, /\btendi\b/i, /\bown\b/i, /🥺/, /😜/, /🙈/, /🥳/, /💕/, /😍/, /😘/,
  // Abreviação de quem digita com o polegar apressado não combina com ficha adulta.
  /\bhj\b/i, /\bdps\b/i, /\bblz\b/i, /\bmn\b/i, /\bpfv\b/i, /\bqdo\b/i,
];

/**
 * Quando você fala grosso com ela. A resposta é o limite, não a briga: adulto
 * corta o assunto e diz o que não aceita, sem devolver ofensa.
 */
export const LIMITES_GROSSERIA: string[] = [
  'Não vou responder isso. Baixa o tom comigo',
  'Olha, esse tom não cabe aqui. Quando você quiser conversar, eu tô',
  'Eu não aceito ser tratada assim, nem de brincadeira',
  'Vou parar por aqui. Você me procura quando estiver mais calmo',
  'Isso me magoou. Prefiro não continuar agora',
  'Não é assim que a gente fala. Eu me retiro',
];

/**
 * Paciência no fim: ela responde, mas curto e sem carinho. Existe para a
 * conversa ter memória — quem insistiu ontem encontra alguém mais seca hoje.
 */
export const FRIAS: string[] = [
  'Tá.',
  'Certo.',
  'Entendi.',
  'Se você diz.',
  'Não tenho muito a acrescentar.',
  'Prefiro ficar por aqui hoje.',
  'Vamos ver como você fala comigo amanhã.',
  'Eu respondo, mas não tô com paciência pra esse papo.',
];
