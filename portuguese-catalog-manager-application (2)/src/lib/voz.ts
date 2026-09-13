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

export type FamiliaVoz = 'amizade' | 'flerte' | 'picante';
export type BancoVoz = Partial<Record<FamiliaVoz, string[]>>;

/**
 * Mais respostas por intenção. Somadas às de `dialogue.ts`, uma mesma intenção
 * passa a ter entre 10 e 25 finalizações diferentes — o papo para de soar
 * decorado.
 */
export const MAIS_RESPOSTAS: Record<string, BancoVoz> = {
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
      'Depende. Você vai ter que me dar mais contexto, doutor kkk',
      'Boa pergunta. Aprendi isso do jeito difícil',
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
      'Fico feliz em ajudar 😊 você fez o mesmo por mim quando precisei',
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
      'Hmm, fala mais. Acho que você tem mais coisa pra dizer',
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
};

/** Recepções extras: a bolha curta que mostra que ela entendeu. */
export const MAIS_RECEPCOES: Record<'positivo' | 'negativo' | 'neutro', string[]> = {
  positivo: [
    'Ai que bom 🥰', 'Oxi, gostei disso', 'Que delícia de ler', 'Isso aqui me animou',
    'Pronto, já tô sorrindo', 'Uai, você é rápido no carinho', 'Melhor coisa que eu li hoje',
    'Sério? Conta mais', 'Amei, viu', 'Fiquei boba agora', 'Nossa, que bom 😄',
    'Gostei tanto que li duas vezes', 'Você chegou chegando', 'Olha, isso me pegou',
    'Que sorte a minha falar com você hoje',
  ],
  negativo: [
    'Oxente, que ruim 😟', 'Ei, fala comigo', 'Puxa vida', 'Isso doeu de ler',
    'Ninguém merece isso', 'Tô aqui, viu', 'Vem cá, respira', 'Que pena, de verdade',
    'Isso me deixou preocupada', 'Queria poder ajudar de perto', 'Credo, que situação',
    'Aguenta firme, meu bem', 'Fico triste contigo', 'Não fica assim, não',
  ],
  neutro: [
    'Pois é', 'Hmm, faz sentido', 'Sei como é', 'Anotado aqui', 'Uai, olha só',
    'Jura?', 'Interessante', 'Tendi', 'Combinado', 'Beleza então', 'Boa, entendi',
    'Hmm, deixa eu pensar', 'Ah, agora entendi', 'Que situação, né', 'Tá certo',
    'Ok, continuei te seguindo',
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
  ],
  igreja: [
    'Que bom falar de igreja com você', 'Coisa boa, isso sustenta a gente',
    'Vou orar por isso hoje', 'Isso me edificou só de ler',
  ],
  amor: [
    'Falou de sentimento e eu presto atenção', 'Coração no papo hoje, gostei',
    'Isso mexeu comigo', 'Vamos devagar com esse assunto que ele pega',
  ],
  cansaco: [
    'Você tá cansado, eu percebo', 'Descansa, o resto espera', 'Vai dormir cedo hoje',
    'Bebe água e respira', 'Cansaço assim eu conheço bem',
  ],
  dinheiro: [
    'Boleto é um sofrimento coletivo', 'Época difícil essa, né', 'Aperto todo mundo tem',
    'Dinheiro é assunto chato, mas necessário',
  ],
  saudade: [
    'Saudade é isso, aperta e a gente fica meio bobo', 'Eu também tenho disso, viu',
    'Falou de saudade e eu senti também',
  ],
  alegria: [
    'Que alegria, me contagia', 'Notícia boa assim eu guardo',
    'Viu, as coisas estão dando certo',
  ],
  idoso: [
    'Cuidar de gente mais velha é uma missão bonita', 'Isso me pegou no coração',
  ],
  viagem: [
    'Falou de viagem e eu já quis arrumar mala', 'Lugar novo faz bem, viu',
    'Queria estar nesse roteiro também',
  ],
  clima: [
    'Esse tempo tá doido mesmo', 'Calor demais, nem sei o que vestir',
    'Chuva e eu só quero cama e café',
  ],
  musica: [
    'Falou de música e eu já fiquei curiosa', 'Anota essa que eu quero ouvir',
  ],
  trabalho_adulto: [
    'Conta, como tá a semana no trabalho?', 'Dia pesado de novo, né',
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
export const MAIS_SUGESTOES: Record<string, BancoVoz> = {
  'ela-perguntou': {
    amizade: [
      'Foi um dia cheio! Consegui resolver umas coisas e agora tô mais tranquilo. E você?',
      'Tudo certo por aqui. Me conta como você tá de verdade, sem o "tô bem" kk',
      'Dia normal, mas melhorou agora. E o seu, como tá sendo?',
      'Confesso que acordei sem energia, mas agora tô melhor. Você dormiu bem?',
      'Tô na correria, mas parei tudo pra te responder 🙂 e aí, me conta',
    ],
    flerte: [
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
      'Nossa, que semana! Você conseguiu descansar depois?',
      'Isso cansa mesmo. Precisa de alguma coisa? Eu tô por aqui',
      'Você levou tudo com muita calma, admiro isso',
      'Que correria, hein. Amanhã promete menos, tomara',
      'Sério? Me conta mais, eu quero entender melhor',
    ],
    flerte: [
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
      'Topo! Me diz o dia e o horário que eu me organizo',
      'Bora sim, gosto de programa assim sem drama',
      'Aceito, mas quero lugar onde a gente consiga conversar',
      'Gostei da ideia. Que tal sábado, mais pro fim da tarde?',
      'Fechado! Vou ver aqui e te confirmo hoje mesmo',
    ],
    flerte: [
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
      'Eu senti que você tá diferente. Quer falar sobre isso?',
      'Se você precisar de espaço eu entendo. Tô aqui quando quiser',
      'Não vou insistir, mas conta comigo pra qualquer coisa',
      'Tá tudo bem? Se for comigo, pode falar sem medo',
      'Vou te dar tempo, mas não vou te deixar sozinho nisso',
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
      'Obrigado 🙂 você também tem um jeito que agrada',
      'Fico feliz de ler isso, sério mesmo',
      'Valeu! Vou dormir mais leve hoje por causa disso',
      'Vindo de você, eu acredito 😄 obrigado',
      'Você é generoso, e isso é bonito de ver',
    ],
    flerte: [
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
      'Também tô com saudade. Bora marcar algo simples então?',
      'Saudade boa essa. Tô com você na cabeça também',
      'Vem cá, me conta tudo que eu quero ouvir',
      'Fico feliz de saber disso, juro. Vamos nos ver mais',
      'Saudade de conversa é a melhor que existe',
    ],
    flerte: [
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
      'Boa, entendi. E me conta: apareceu alguma novidade por aí?',
      'Faz sentido. Vou pensar nisso e te falo depois',
      'Tá certo. Por falar nisso, como você tá de ânimo hoje?',
      'Uhum. Mudando um pouco: você fez algo bom hoje?',
      'Certo. Vou puxar um assunto melhor então kk',
    ],
    flerte: [
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
