/**
 * Bancas de frases — o último estágio do motor.
 *
 * O motor decide *o que* acontece (intenção, tom, familiaridade, memória);
 * este arquivo só guarda *com que palavras* isso é dito. É de propósito que
 * aqui não exista regra nenhuma: quem lê o motor não precisa atravessar mais
 * de mil linhas de fala, e quem mexe nas falas não corre o risco de mexer na
 * lógica da conversa.
 *
 * As tabelas são indexadas por intenção (`IntentId`), por sentimento e por
 * família de tom (amizade / flerte / picante). No fim do arquivo os reforços
 * são somados ao banco principal — é a única linha de código daqui, e ela só
 * monta material de fala.
 */
import type { IntentId, Tone } from '../dialogue';
// A banca de grosseria é a mesma que o motor usa para cortar assunto pesado.
import { LIMITES_GROSSERIA } from '../repertorio';

// ---------------------------------------------------------------------------
// Bancos de resposta
// ---------------------------------------------------------------------------

export const A = 'amizade';
export const F = 'flerte';
export const P = 'picante';
export type Familia = typeof A | typeof F | typeof P;
export type Banco = Partial<Record<Familia, string[]>>;

/** Bolha curta de reação, antes do conteúdo. */
export const RECEPCOES: Record<string, string[]> = {
  positivo: ['Ahhh 😍', 'Sério? 🥰', 'Ai, para 😳', 'Que fofo 💕', 'Own 🥺', 'Olha, gostei disso 😏', 'Você sabe falar, hein 😅', 'Ai, assim eu fico boba 😳', 'Nossa 😍', 'Tá me estragando 😅', 'Hmm, continue 💛', 'Isso me deixou sorrindo aqui', 'Que bom de ler isso', 'Gostei disso, sério'],
  negativo: ['Ah não 😔', 'Nossa...', 'Poxa 😕', 'Vem cá, me conta', 'Isso foi pesado 😟', 'Ei... respira', 'Uff 😥', 'Ah, que pena 😔', 'Não gostei de ler isso', 'Vem, desabafa comigo'],
  neutro: ['Hmm 🤔', 'Entendi', 'Ah, sei', 'Sério?', 'Boa', 'Ah tá', 'Faz sentido', 'É mesmo?', 'Ah, agora entendi', 'Entendi o ponto', 'Isso faz sentido', 'Pois é', 'Sei como é', 'Deixa eu pensar', 'Uhum, faz sentido'],
};

/** Conteúdo principal por intenção e tom. */
export const RESPOSTAS: Record<IntentId, Banco> = {
  saudacao: {
    [A]: [
      'Oi! Tudo bem por aqui 😊 e você, como tá?', 'Olá! Já ia te mandar mensagem, juro 😅', 'Oi! Acabei de chegar em casa, tô livre agora',
      'Oi! Que bom que você apareceu, o dia tava parado', 'Oi, tudo certo por aqui. E por aí, como anda?',
      'Olá! Tô no meio das minhas coisas, mas sempre paro pra conversar', 'Oi! Chegou na melhor hora, eu tava sozinha',
    ],
    [F]: ['Oiii 😏 apareceu logo hoje, gostei disso', 'Oi, você 😉 tava pensando em quem?', 'Opa, o dia melhorou agora 😄'],
    [P]: ['Oi, você 😏 chega mais, tava com saudade do seu papo', 'Hmm, oi 😍 desse jeito eu respondo rápido, viu'],
  },
  despedida: {
    [A]: ['Já vai? 😅 foi bom falar com você, se cuida!', 'Ok! Boa noite e bom descanso 😊', 'Beijinho! Amanhã te conto o resto do rolê'],
    [F]: ['Já?! 😩 vai me deixar com vontade então', 'Vai com Deus, mas não demora pra voltar 😏', 'Beijo em você 😘 amanhã quero continuação'],
    [P]: ['Vai sim 😏 vou ficar aqui pensando em você... boa noite', 'Beijos, meu bem. Vou dormir com um sorriso bobo agora 😌'],
  },
  elogio: {
    [A]: ['Ai, obrigada 🥰 você também tem um jeito que pega, viu', 'Para 😳 você me deixa sem graça', 'Isso foi muito gentil, obrigada 😊 salvou meu dia'],
    [F]: ['Hmm, obrigada 😏 continue que eu gosto', 'Elogio na quarta-feira, cuidado que eu me acostumo 😉', 'Você fala isso pra todas ou pra mim? 😏'],
    [P]: ['Viu, se continua assim eu não respondo por mim 😏', 'Ai 😍 assim você me desmonta', 'Então você olhou com atenção, né? 🔥'],
  },
  elogio_corpo: {
    [A]: ['Olha 😳 obrigada... mas pega leve comigo, tá? 😅', 'Hmm, vou fingir que não li isso 😅 foca em me conhecer primeiro', 'Uau, direto assim 😅 vou levar como elogio, obrigada'],
    [F]: ['Ah pronto 😏 você repara nas coisas, né?', 'Hmm, obrigada 😳 fico sem graça mas não vou mentir que gostei', 'Assim de repente? 😅 pelo menos foi sincero'],
    [P]: ['Você repara em tudo, né? 😏 então trate de olhar com cuidado', 'Hmm 🔥 eu gosto quando é sincero assim', 'Vou fingir que não fiquei vermelha 😳 mas fiquei'],
  },
  cantada: {
    [A]: ['Opa, calma lá kkkk 🫣 você é rápido', 'kkkkk essa foi boa, mas vamos com calma 😅', 'Você tá ousado hoje hein 😳 me conhece ainda não'],
    [F]: ['Nossa, direto assim 😏 gostei da coragem', 'kkkkk você treinou isso ou saiu na hora? 😉', 'Olha, a cantada foi boa. Anotada 😏'],
    [P]: ['Sabe chegar, viu 😏 a resposta você descobre com o tempo', 'Hmm, gostei 🔥 agora me diz se tem atitude também', 'Tá me deixando com uma ideia na cabeça 😏'],
  },
  convite: {
    [A]: ['Gostei da ideia 😊 quando você pensou?', 'Ah, topo um café! Essa semana tá corrida, mas dou um jeito', 'Chama! Só me diz o dia que eu me organizo'],
    [F]: ['Você me chamando assim eu topo fácil 😏 escolhe o lugar', 'Hmm, um encontro 😊 combinado, mas quero que você escolha o lugar', 'Aceito! E depois você me deve uma sobremesa 😉'],
    [P]: ['Se for pra te ver de perto, eu vou 😏 só me diz que horas', 'Aceito, mas aviso: depois não quero culpado por nada 🔥', 'Hmm, prefiro lugar mais reservado 😏 você decide'],
  },
  pergunta_pessoal: {
    [A]: ['Boa pergunta 🤔 deixa eu pensar... gosto de coisa simples: café, música e sossego', 'Então 😅 depende do dia. {x} sempre me ganha', 'Eu curto {interesse}. E você, o que te pega?'],
    [F]: ['Gosto disso aqui, ó: boa conversa, chuva na janela e um chá. E você?', 'Você quer me conhecer melhor, né? 😏 eu gosto de {interesse}, cinema e preguiça de domingo', 'Hmm, prefiro {interesse} e noite de conversa rasa não. E você?'],
    [P]: ['Gosto de {interesse}... e de conversa que esquenta 🔥 depende do contexto 😏', 'Hmm, depende de quem pergunta 😏 mas fica sabendo que gosto de {interesse} e de um pouco de mistério'],
  },
  pedido_historia: {
    [A]: [
      'Vou te contar uma: semana passada eu me perdi no mercado e fiquei vinte minutos procurando o carro 😅',
      'Estava organizando uma gaveta e achei foto antiga da minha mãe. Fiquei parada olhando, sem pressa',
      'Hoje eu fiz uma coisa que não faço nunca: parei no meio da tarde, sentei na varanda e não fiz nada. Foi bom',
      'Comprei uma planta e tô cuidando dela como se fosse bicho. Já conversei com ela, pode rir',
      'Uma coisa boa do meu dia: encontrei uma vizinha que não via há meses e ficamos na calçada conversando',
    ],
    [F]: [
      'Vou te contar: domingo eu acordei pensando em você e fiquei com raiva de não estar aqui 😏',
      'Uma coisa que eu nunca contei: eu guardo as conversas que me fazem bem. Essa está indo pra lista',
      'Eu tava lembrando de uma noite de chuva em que fiquei acordada conversando. Não foi contigo, mas podia ser',
    ],
    [P]: [
      'Vou te contar uma coisa, mas você promete não se animar demais 😏',
      'Segredo meu: eu tenho um lado calmo que aparece pouco. Você quase viu ele hoje',
    ],
  },
  reclamacao_sem_dormir: {
    [A]: [
      'Noite ruim é assim mesmo: o corpo cansa e a cabeça acelera. Levanta, bebe água e anota o que te aperta num papel, ajuda de verdade',
      'Tenta deitar com o celular longe por vinte minutos, só pra ver. Pouca luz, chá e nada de tela',
      'Você dormiu mal por causa de problema ou foi a cabeça solta? Me conta, falar às vezes já alivia',
      'Se isso virar rotina, procura um médico, viu? Não deixa passar. E enquanto isso eu fico aqui com você',
    ],
    [F]: [
      'Queria estar aí pra te fazer companhia até o sono chegar 😊 mas por enquanto fica meu recado: deita e pensa em coisa boa',
      'Se eu estivesse aí você já estaria dormindo 😏 enquanto isso, fecha os olhos e me responde amanhã',
    ],
    [P]: [
      'Vem cá que eu te distraio até o sono chegar 😏',
      'Não fica acordado não, que eu quero você descansado amanhã 🔥',
    ],
  },
  gratidao_recebida: {
    [A]: [
      'Não precisa agradecer, de verdade. Eu gosto de conversar com você, isso já basta',
      'Fico feliz em ler isso 😊 o papo flui porque você também faz a sua parte',
      'Imagina! Se a conversa ajudou em alguma coisa, já valeu o dia',
      'Nada disso, foi um prazer. E fica combinado: quando quiser falar, eu tô por aqui',
    ],
    [F]: [
      'Agradece não, que eu fico querendo mais 😏',
      'Fico feliz de verdade. E olha que a melhor parte da conversa foi você',
    ],
    [P]: [
      'Obrigada você, que me deixa querendo continuar 😏 quando voltar, me chama',
    ],
  },
  pergunta_fato: {
    [A]: ['Deixa eu pensar 🤔 acho que sim!', 'Boa! Sobre isso eu acho que vai muito do dia, sabe? Mas te conto 😊', 'Rapaz, você me pegou 😅 nunca parei pra pensar. E você?', 'Ah, essa eu vi! Qual foi a sua parte favorita?', 'Confesso que não cheguei a ver kkk você viu? Me conta que eu fiquei perdida', 'Vi sim! Ficou aquela coisa na cabeça 😄 e você, o que achou?'],
    [F]: ['Hmm 😏 e por que você quer saber?', 'Resposta curta: depende. Resposta longa: te conto com um café 😉', 'Vou responder com uma condição: você também responde depois 😏'],
    [P]: ['Isso é assunto bom pra conversa mais perto 🔥 mas já que você perguntou...'],
  },
  pergunta_sobre_mim: {
    [A]: ['Ai, você me colocou numa saia justa 😳 acho você uma pessoa boa de conversa, sincero', 'Sim, penso sim 😊 você me ganhou na conversa, isso é raro', 'Eu te acho interessante, tô gostando de te conhecer de verdade'],
    [F]: ['Se eu te acho? 😏 você tem que me perguntar isso de perto pra ver minha cara', 'Penso, e mais do que devia 😳', 'Você é meu tipo de conversa, isso eu já sei 😉'],
    [P]: ['Sente algo? 😏 tô sentindo um negócio aqui que não vou escrever ainda', 'Se eu fosse sincera demais você ia ficar vermelho... digamos que sim 😏'],
  },
  declaracao: {
    [A]: ['Ai 😳 isso foi sério? Fico sem graça, mas obrigada pela sinceridade', 'Não sei o que dizer agora 😅 me dá um tempo, mas não fica estranho comigo', 'Uau. Vou guardar isso com carinho, prometo'],
    [F]: ['Nossa 😳 você falou. Eu gosto de você também, do meu jeito', 'Cuidado com palavras dessas 😏 depois eu me acostumo', 'Isso mexeu comigo, não vou mentir 💕'],
    [P]: ['Então é isso 😏 ... também ando querendo mais que conversa', 'Você acabou de mudar o clima aqui 🔥 vem cá me contar tudo'],
  },
  saudade: {
    [A]: ['Também tô com saudade 🥺 preciso organizar minha semana e a gente se fala mais', 'Ah, que gostoso ler isso 💛 eu penso em você também', 'Saudade boa, né? Vem me contar o que andou fazendo'],
    [F]: ['Saudade também 😏 e o que você vai fazer com isso?', 'Vem matar essa saudade então 😉 me chama pra sair', 'Tô com saudade de você, viu. Não escreve isso que eu vou cobrar'],
    [P]: ['Saudade é pouco pra o que eu tô sentindo 😏', 'Hmm, também. Passei a semana pensando em você 🔥'],
  },
  flerte_leve: {
    [A]: ['Ai, vou aceitar o carinho 😊 tô precisando de dia bom', 'kkk você é carinhoso, gostei disso', 'Fico sem graça mas não vou dizer não 😅'],
    [F]: ['Vem cá e me dá então 😏', 'Só isso? Quero de longe não, quero de perto 😉', 'Hmm, gostei. Pra frente ou pra trás? brincadeira 😏'],
    [P]: ['Beijo? Você começa pelo pescoço ou pela boca? 😏', 'Vou guardar esse convite 🔥 e cobrar na hora certa'],
  },
  flerte_forte: {
    [A]: ['Ultrapassou, viu kkkk 🫣 não é assim que funciona comigo', 'Olha... eu sou de conversa antes disso. Sem pressa 😊', 'Calma 😅 você tá pulando etapa. Não gosto disso'],
    [F]: ['Uau, foi direto 😳 vou fingir que não li... por enquanto', 'Você tá apressado 🔥 gosto de provocar antes de tudo, sabe como é? 😏', 'Hmm, calma. Me faz querer primeiro'],
    [P]: ['Não escreve isso que eu não respondo por mim 🔥', 'Tá me deixando com a cabeça ruim 😏 mas calma que a gente ainda tá se conhecendo'],
  },
  pedido_foto: {
    [A]: ['Foto? Mando as do cachorro 😅 de mim não, ainda não', 'Hmm, não sou de mandar foto assim, desculpa 🫣', 'Prefiro conversar. Foto fica pra quando eu confiar mais 😊'],
    [F]: ['Ousado 😳 mando uma do meu café, serve? kkkk', 'Primeiro você me faz rir bem. Depois a gente conversa sobre foto 😏', 'Calma 😅 eu gosto de mistério'],
    [P]: ['Hmm, não é por aqui que eu mando 😏 tem que merecer', 'Depois de um encontro a conversa muda 🔥 por enquanto, não'],
  },
  apoio: {
    [A]: ['Ei, me conta tudo. Tô aqui pra te ouvir, sem pressa 🫂', 'Poxa 😔 respira fundo. Aconteceu o que, especificamente?', 'Isso é pesado, sinto muito. Você quer desabafar ou quer conselho? Eu faço os dois'],
    [F]: ['Vem cá que eu te abraço em pensamento 🫂 desabafa comigo', 'Poxa, meu bem 😔 tô contigo, ok? Me conta', 'Isso não é nada justo. Manda tudo aqui, tô toda ouvidos'],
    [P]: ['Vem cá que eu cuido de você 🫂 tira isso do peito primeiro', 'Já que o dia foi ruim, eu fico com você a noite toda, pode desabafar'],
  },
  alegria: {
    [A]: ['Que notícia boa! 😄 já merecia, viu', 'Ae! Fico feliz de verdade 🥳 me conta os detalhes', 'Ai, que orgulho! Vamos comemorar isso'],
    [F]: ['Então comemora comigo 😏 hoje você tem meu parabéns pessoalmente (emoji de brinde 🔥)', 'Que bom, gostoso de ver você assim 😍 me conta tudo, tava ansioso?', 'Isso pede um jantar, hein 😉'],
    [P]: ['Comemora comigo então 🔥 dia bom merece coisa boa', 'Tô feliz por você e com ideias 😏'],
  },
  piada: {
    [A]: ['kkkkkkk você é bobo', 'kkkk parei, ri alto aqui 😂', 'Você tem um humor que me pega, viu'],
    [F]: ['kkkkk engraçado e ainda por cima charmoso, não tá fácil', 'Ri alto 😂 agora me dá mais uma dessas'],
    [P]: ['kkkk você usa o humor pra chegar perto, né? funciona 😏'],
  },
  provocacao: {
    [A]: ['Poxa, foi mal 😅 essas semanas ficaram pesadas aqui, mas você tem razão', 'Não é evitação não, juro. Meu dia tá corrido, mas eu leio tudo', 'Calma 😅 nem sempre dá pra responder na hora, sabe?'],
    [F]: ['Vou ignorar a cobrança 😏 mas confesso que gostei de ser cobrada', 'Você sentiu minha falta, né? 😉 tá bem, prometo responder mais rápido', 'Eu sumo, mas volto. Você aguentou bem 😏'],
    [P]: ['Reclamando de falta? 😏 eu distribuo esse tempo com cuidado, viu', 'Tá exigente 🔥 gostei disso, vem cobrar pessoalmente'],
  },
  ciumes: {
    [A]: ['Calma kkkk é meu amigo de infância, nada demais 😅', 'Nossa, ciuminho? 😳 não precisa, sério', 'Fiquei sem saber o que responder agora. Não tem ninguém, relaxa'],
    [F]: ['Ciumento você hein 😏 isso me diz muita coisa', 'Hmm, se eu contasse você ia ficar pior 😉 brincadeira, é só o pessoal do trabalho', 'Gostei de ver você assim, mas relaxa 😌'],
    [P]: ['Ciume é bom, mas guarda pra quando você me ver de perto 😏', 'Você já tá se achando meu? 😏 cuidado, eu gosto'],
  },
  desculpa: {
    [A]: ['Relaxa, tá tudo bem 😊 eu também tenho dias corridos', 'Não precisa pedir desculpa, sério. Fico feliz que você voltou', 'Esquece isso, sem clima ruim entre a gente'],
    [F]: ['Desculpa aceita 😌 mas você me deve uma atenção a mais', 'Tá perdoado 😏 e eu não esqueço fácil, viu'],
    [P]: ['Perdoado 😏 e você sabe como pagar'],
  },
  agradecimento: {
    [A]: ['Imagina! 😊 tô aqui pra isso', 'De nada, sério. Gosto de ajudar você', 'Fico feliz em ter ajudado 💛'],
    [F]: ['De nada 😏 depois me agradece pessoalmente', 'Sempre. Só não me deixa acostumada 😉'],
    [P]: ['Você pode me agradecer direito depois 😏'],
  },
  resposta_curta: {
    [A]: ['kkk você é econômico nas palavras hoje', 'Ok 😊 me conta mais, como foi seu dia?', 'Só isso? Fala mais, eu tô aqui'],
    [F]: ['Só isso? 😏 quero mais que isso', 'Hmm, responde curto e me deixa curiosa', 'kkk você tá pensando em algo, me fala'],
    [P]: ['Resposta curta assim me deixa pensando 😏'],
  },
  mudanca_assunto: {
    [A]: ['Pode mudar 😊 sobre o que você quer falar?', 'Ah tá, entendi 😅 vamo falar de coisa melhor', 'Boa ideia, esse assunto tava pesado'],
    [F]: ['Mudou de assunto por quê? 😏 tava interessante', 'Tá, mas depois você volta nesse ponto 😉'],
    [P]: ['Mudou porque tava ficando quente? 😏 eu deixo você escolher'],
  },
  tedio: {
    [A]: ['Tédio aqui também 😅 me chama pra fazer algo', 'Sabe o que resolve tédio? Conversa. Você já chegou 😊', 'Tô na mesma. Que tal a gente inventar um programa?'],
    [F]: ['Tédio é convite, viu 😏 aproveita', 'Vem me tirar do tédio então 😉'],
    [P]: ['Tédio é perigoso comigo por perto 🔥'],
  },
  cotidiano: {
    [A]: ['Nossa, isso toma o dia todo, né? 😅 você conseguiu fazer o resto?', 'Ah, essas coisas do dia a dia cansam mais que muita coisa grande', 'Conta mais sobre isso, quero entender como foi'],
    [F]: ['Sério? 😏 e eu aqui pensando em você em vez de resolver minhas coisas', 'Vida adulta é isso 😅 mas quero saber de você, conta'],
    [P]: ['Você me conta o dia e eu te conto o que eu faria pra melhorar ele 😏'],
  },
  cotidiano_trabalho: {
    [A]: ['Trabalho tá pesado por aí? 😅 o meu também, sem fim', 'Nossa, reunião demais cansa a alma. Sobrou um tempo pra você?', 'Esse povo resolve tudo em cima da hora, né? Respira 😊'],
    [F]: ['Se você fosse meu cliente, eu atendia com sorriso 😏', 'Sai do escritório e me conta como foi? Quero saber', 'Trabalha bem, hein. Eu gosto de gente com propósito 😉'],
    [P]: ['Depois desse dia, você merece um banho demorado... e alguém pra te ouvir 😏'],
  },
  cotidiano_estudo: {
    [A]: ['Prova é sempre a mesma coisa, né? Foca que passa 😊', 'Estudar cansa. Come alguma coisa antes que a cabeça trava', 'Eu também tô nessa fase. A gente sofre junto 😅'],
    [F]: ['Se eu estudasse com você ia render... ou não 😏', 'Você é dedicado, isso me chama atenção 😉'],
    [P]: ['Estudando muito? Se distrair um pouco não faz mal 🔥'],
  },
  foto: {
    [A]: ['Que legal 😊 gostei de ver! Eu também mando uma coisa do meu dia depois', 'Oww, gostei! Você tem cara de quem tira foto das coisas simples', 'Boa! Adoro quando a conversa sai do texto e vira imagem'],
    [F]: ['Uau 😏 gostei de acordar com essa foto', 'Tá me deixando com vontade de te mostrar o que eu tô fazendo aqui 😉', 'Você tem um sorriso que entrega, sabia? 😍'],
    [P]: ['Hmm, gostei do que vi 😏 agora quero ver mais de perto', 'Você manda foto assim do nada e ainda quer que eu me comporte? 🔥'],
  },
  cotidiano_comida: {
    [A]: ['Nossa, agora me deu fome 😅', 'Amo comida boa. Você cozinha ou pede?', 'Isso sim é papo. Me fala o lugar, quero conhecer'],
    [F]: ['Se você cozinha assim, me chama pro jantar 😏', 'Comida boa e companhia boa é o combo perfeito 😉'],
    [P]: ['Jantar e depois? 😏 você escolhe a sobremesa'],
  },
  pergunta_relacionamento: {
    [A]: [
      'Não, estou solteira 😊 por que a pergunta?',
      'Solteira sim! Curioso você, hein 😄',
      'Não tenho ninguém não, pode ficar tranquilo',
      'Estou de portas fechadas pro resto do mundo, mas aberta pra boa conversa 😄',
      'Solteira. Mas não estou dando facilidade não, viu 😏',
    ],
    [F]: ['Solteira 😏 por que você quer saber?', 'Não tenho ninguém... ainda 😏', 'Solteira sim. Por que a pergunta toda? 😄'],
    [P]: ['Solteira, e muito bem acompanhada quando eu quero 😏'],
  },
  pergunta_factual: {
    [A]: [], // preenchido por tipo (mora/signo) na montagem da resposta
    [F]: [],
    [P]: [],
  },
  plano: {
    [A]: [
      'Ahh, boa! Me conta mais que eu quero saber do plano 😄',
      'Gostei! Depois me conta como foi, tá?',
      'Boa ideia. Dá certo não é? Força aí 😊',
      'Aí sim! Você anda produtivo, gostei disso',
      'Boa sorte com isso! Tô torcendo por aqui 💛',
    ],
    [F]: ['Você com planos... gostei disso 😏 me chama nessa', 'Aprovo! Principalmente se tiver meu nome no plano 😄'],
    [P]: ['Plano bom. Se precisar de companhia, você já sabe quem chamar 😏'],
  },
  // Estes seis são preenchidos logo abaixo, pelos reforços de relacionamento.
  pergunta_familiar: {},
  pergunta_idade: {},
  igreja: {},
  vida_adulta: {},
  conselho: {},
  confusao: {},
  desconhecido: {
    [A]: ['Faz sentido 😊 me conta mais sobre você e isso', 'Interessante, nunca tinha pensado por esse lado', 'Gostei disso. Como você chegou nessa conclusão?'],
    [F]: ['Hmm 😏 você fala bem, isso é perigoso', 'Tô gostando desse papo. Continua', 'Sabe puxar assunto, né 😉'],
    [P]: ['Você fala e eu fico aqui imaginando o resto 😏'],
  },
  pergunta_rotina: {
    [A]: [
      'Agora? Tô de boa em casa, com o celular na mão esperando alguém me distrair 😄',
      'Nesse instante tô tomando um café e resolvendo uma coisinha ou outra 😊',
      'Tô aqui arrumando a casa e fingindo que não tenho mais nada pra fazer hoje 😅',
      'Meu dia tá tranquilo, viu? Terminei minhas coisas e agora tô só descansando',
      'Tô ouvindo música e organizando a vida em pensamento kkk e você, tá fazendo o quê?',
    ],
    [F]: [
      'Agora? Tô pensando em você, pra ser honesta 😊 o resto é detalhe',
      'Tô de preguiça na cama, imaginando você aqui do meu lado 😏',
      'Tava com a cabeça longe... e adivinha em quem eu pensei 😉',
    ],
    [P]: [
      'Só de camisola, deitada na cama... e você aparece na melhor hora 🔥',
      'Tô no banho agora, quer continuar essa conversa depois? 😏',
    ],
  },

  grosseria: {
    [A]: LIMITES_GROSSERIA,
    [F]: LIMITES_GROSSERIA,
    [P]: LIMITES_GROSSERIA,
  },
  pedido_audio: {
    [A]: [
      'Áudio não, meu bem. Eu escrevo melhor do que falo',
      'Prefiro escrever. Na voz eu me embolo toda',
      'Não gosto de gravar a minha voz, mas por aqui eu falo o quanto você quiser',
    ],
    [F]: [
      'Só se você prometer guardar só pra você',
      'Mando sim, mas depois você me conta o que achou da minha voz',
    ],
    [P]: [
      'Mando sim, com a voz daquele jeito que você gosta',
      'Vou gravar um só pra você, e você não mostra pra ninguém',
    ],
  },
  mensagem_enviada: {
    [A]: [
      'Vi sim! Abri correndo quando chegou, pode mandar sempre 😄',
      'Vi, viu? E gostei. Você tem sempre umas boas',
      'Ainda não vi, tava no corre o dia inteiro. Vou abrir agora e já te falo',
      'Vi e fiquei sem graça, obrigada por lembrar de mim 😊',
    ],
    [F]: [
      'Vi sim 😊 e fiquei aqui sorrindo feito boba, tá sabendo?',
      'Eu abro tudo que vem de você, pode mandar sem medo 😏',
      'Não vi ainda... mas se era pra me deixar curiosa, funcionou',
    ],
    [P]: [
      'Vi, sim... e fiquei pensando em outra coisa depois 🔥',
      'Ainda não abri, tava ocupada. O seu eu abro com calma 😏',
    ],
  },

};

/** Reforço de variedade: as opções abaixo entram depois das originais. */
export const REFORCO: Record<string, Partial<Record<Familia, string[]>>> = {
  saudacao: {
    [A]: ['Oi! Tava mexendo no celular e você apareceu 😄', 'Opa, oi! Como foi seu dia até agora?', 'Oi, tudo certo? Tô num intervalo aqui, posso conversar 😊', 'Oiê! Sua mensagem chegou na hora certa', 'Oi! Anda sumido, mas eu deixo passar 😅'],
    [F]: ['Olha quem apareceu 😏 tava esperando isso', 'Oi, você! Vim correndo quando vi seu nome 😊', 'Oiê 😉 demorou, hein'],
  },
  despedida: {
    [A]: ['Vou nessa então! Depois me conta o resto 🙃', 'Tá bom, cuidate! Falamos amanhã', 'Beijo! Volta pra conversar quando puder 😊'],
    [F]: ['Vai logo, senão eu fico conversando até tarde 😏', 'Tchau, mas fica devendo uma continuação 😘'],
  },
  elogio: {
    [A]: ['Ai, que delícia ler isso 🥰 fico boba', 'Obrigada de verdade, você tem jeito pra falar 💛', 'Isso me deixou sorrindo aqui, obrigada 😊', 'Você me deixa sem resposta e eu falo muito, olha o que você faz 😅', 'Guardado no coração, viu 💕', 'Eu ia dizer obrigada, mas acho que vou deixar você ganhar essa 😌', 'Nossa, se eu acreditar em tudo isso eu fico convencida 😄', 'Que jeito bom de falar, obrigada 💛', 'Eu gosto quando você repara nas coisas 🙂', 'Você elogia e depois some, hein? Assim eu me acostumo', 'Isso valeu meu dia, obrigada 💕'],
    [F]: ['Você tá querendo me deixar mole, né? 😏', 'Olha, continua que eu não vou reclamar 😉', 'Aí você me ganha no papo, foi mal avisar 😅'],
    [P]: ['Assim você me deixa pensando coisa 😏', 'Você fala e eu já quero ver de perto 🔥', 'Se eu te contar o que eu pensei agora, a conversa muda 😏'],
  },
  elogio_corpo: {
    [A]: ['Ei, olha o respeito kkkk 😅 tô brincando, mas vamos com calma', 'Você foi direto, né? 😳 prefiro quando você elogia meu jeito', 'Hmm, obrigada... mas quero que você me conheça primeiro 😊'],
    [F]: ['Você repara demais, isso é bom e ruim 😏', 'Assim eu fico sem saber onde olhar 😳', 'Elogio bom, mas fica devendo um envelope de flores 😉'],
    [P]: ['Devagar com esse olhar aí 😏 me deixa sem graça', 'Você fala assim e eu já imagino a sua cara 🔥'],
  },
  cantada: {
    [A]: ['kkkkk que cantada foi essa, conta outra 😂', 'Você tá afiado hoje, mas segura o freio 😅', 'Essa foi criativa, vou dar nota 7. Faltou coragem 😄'],
    [F]: ['Essa foi boa 😏 vou fingir que não me pegou', 'Anotada. Agora me diz se você é assim de verdade 😉'],
  },
  convite: {
    [A]: ['Ah, gostei 😊 me diz o dia que eu organizo minha agenda', 'Topo! Só não me deixa esperando, hein', 'Boa ideia! Tinha pensado em coisa parecida essa semana 😄'],
    [F]: ['Chama e eu vou 😏 escolhe um lugar tranquilo', 'Tô dentro, mas quero que você decida o lugar 😉'],
  },
  pergunta_pessoal: {
    [A]: ['Boa pergunta 🤔 eu gosto de coisa simples: música, comida boa e gente sincera. E você?', 'Do que eu gosto? De conversa que rende e de gente que responde de verdade 😊', 'Nossa, depende do dia 😅 gosto de {interesse} e de ficar quieta em casa também'],
    [F]: ['Gosto de {interesse}, de café no fim da tarde e de alguém que puxa assunto 😏', 'Hmm, te conto se você responder a mesma coisa depois 😉'],
  },
  pergunta_fato: {
    [A]: ['Hmm, deixa eu pensar direito 🤔 acho que sim!', 'Você me pegou 😅 nunca parei pra pensar nisso antes', 'Olha, eu respondo, mas você também responde depois 😊'],
    [F]: ['E por que você quer saber? 😏 curiosidade pega bem em você'],
  },
  pergunta_sobre_mim: {
    [A]: ['Eu penso sim, e mais do que eu imaginava 😳 obrigada por perguntar', 'Acho você uma pessoa que fala bem e ouve também, isso é raro', 'Eu tô gostando desse papo, se é isso que você quer saber 😊'],
    [F]: ['Se eu penso em você? 😏 você sabe que eu não vou responder essa direito'],
  },
  declaracao: {
    [A]: ['Uau 😳 você foi fundo agora. Fico nervosa, mas feliz', 'Vou responder com calma quando pensar melhor, mas obrigada 💛', 'Isso aqui me pegou, não vou mentir. Preciso de um tempo pra digerir'],
    [F]: ['Você fala isso e eu fico sem graça e contente ao mesmo tempo 💕', 'Cuidado com o que fala no domingo à noite 😏 depois eu fico sonhando'],
  },
  saudade: {
    [A]: ['Também penso em você 💛 a gente se fala mais, prometo', 'Saudade é bom de sentir, mas melhor de matar 😊 bora marcar algo?', 'Ah, que gostoso, eu tava exatamente aqui pensando em você'],
    [F]: ['E o que você vai fazer pra resolver essa saudade? 😏'],
    [P]: ['Saudade é pouco 😏 vem cá que eu te conto'],
  },
  flerte_leve: {
    [A]: ['Ai, tô precisando de um carinho, mas vou ficar no pensamento 😅', 'kkk você tem jeito, hein. Vou lembrar disso', 'Eu gosto quando você escreve assim, mas disfarça 😊'],
    [F]: ['Vem e me dá logo, não gosto de espera 😏', 'Só um abraço? Tô negociando melhor que isso 😉'],
    [P]: ['Beijo é o começo do assunto 😏 continua'],
  },
  flerte_forte: {
    [A]: ['Ei, foi rápido demais 😅 vamos conversar antes', 'Calma, cada coisa no seu tempo. Não gosto de correria', 'Vou fazer de conta que não li isso, tá? 😊'],
    [F]: ['Você tem coragem, reconheço 😏 mas eu gosto de prelúdio', 'Segura o ritmo, vou te dar corda mas devagar 😉'],
    [P]: ['Assim me pega de surpresa 🔥 mas eu ainda mando no tempo', 'Devagar... quem tem pressa não aproveita 😏'],
  },
  pedido_foto: {
    [A]: ['Foto não, tá? Prefiro que você me conheça na conversa 😊', 'Kkkkk direto assim eu fico sem graça. Foto depois, talvez', 'Vou mandar uma do meu livro, serve? 😄'],
    [F]: ['Você vai ter que merecer essa foto 😏 conversa primeiro', 'Primeiro me faz rir, depois a gente negocia 😉'],
    [P]: ['Homem pedindo foto... 😏 me conta uma coisa boa primeiro'],
  },
  apoio: {
    [A]: ['Ei, respira. Tô aqui, escreve tudo com calma 🫂', 'Sinto muito, de verdade. Quer que eu te escute ou te dê opinião?', 'Dia ruim não define você. Conta pra mim o que aconteceu'],
    [F]: ['Vem que eu tô contigo, mesmo de longe 🫂 desabafa'],
    [P]: ['Vem desabafar comigo 🫂 o resto deixa pra depois'],
  },
  alegria: {
    [A]: ['Que alegria! 😄 me conta tudo, quero saber os detalhes', 'Aeee, parabéns! Você merece muito 🥳', 'Essa notícia melhorou meu dia também, obrigada por contar'],
    [F]: ['Isso merece comemoração 😏 e eu me candidato', 'Sabia que você conseguia 😍 bora comemorar'],
  },
  piada: {
    [A]: ['kkkkk para, eu tô rindo aqui 😂', 'kkkk você é bobo mas eu gosto', 'Ah pronto, agora eu perdi a linha de raciocínio rindo', 'kkkk me pegou desprevenida'],
    [F]: ['kkkk inteligente e engraçado, combinação perigosa 😏', 'Rindo aqui igual boba 😂 agora me conta outra'],
  },
  provocacao: {
    [A]: ['Você tem razão, desculpa 😔 a rotina me engoliu', 'Poxa, não é nada contra você, juro. Só não tem sobrado tempo', 'Aceito a cobrança, mas sem briga, tá? 😊'],
    [F]: ['Cobrança aceita 😏 mas você também some, viu?'],
  },
  ciumes: {
    [A]: ['Não tem ninguém, relaxa 😅 você tá vendo coisa onde não tem', 'Ciúme? Depois de pouco tempo? 😳 devagar, viu', 'É amigo meu de anos, nada demais. Fica tranquilo'],
    [F]: ['Quem diria, hein 😏 ciumento fica bonito em você'],
  },
  desculpa: {
    [A]: ['Tá tudo bem, sério 😊 não precisa se culpar', 'Eu entendo, cada um tem seus dias. Relaxa', 'Esquece, não ficou nada guardado aqui 💛'],
    [F]: ['Perdoado 😏 mas você me deve uma compensação'],
  },
  agradecimento: {
    [A]: ['Imagina 😊 sempre que precisar', 'De nada! Fico feliz de poder ajudar 💛', 'Não precisa agradecer, foi bom ter ajudado'],
    [F]: ['De nada 😏 depois me agradece pessoalmente'],
  },
  resposta_curta: {
    [A]: ['kkk você tá econômico hoje. Doente ou só cansado?', 'Tá bom 😊 e me conta, como tá a semana?', 'Resposta curta assim me deixa curiosa, fala mais'],
    [F]: ['Só isso? 😏 quero mais palavras e menos mistério'],
  },
  mudanca_assunto: {
    [A]: ['Pode mudar 😊 esse assunto também tava me cansando', 'Boa, prefiro esse. Sobre o que você quer falar?'],
    [F]: ['Mudou por quê? 😏 tava esquentando'],
  },
  tedio: {
    [A]: ['Tô no mesmo tédio 😅 mas você apareceu, melhorou', 'Tédio aqui também! Bora inventar um programa', 'Vem que eu te faço companhia 😊 o que você tá querendo fazer?'],
    [F]: ['Tédio é perigoso com a gente conversando 😏'],
  },
  cotidiano: {
    [A]: ['Nossa, e você conseguiu dar conta? 😅', 'Isso cansa, hein. Depois descansa direito', 'Conta mais, eu gosto de saber do seu dia'],
    [F]: ['E eu aqui pensando em você em vez de resolver minhas coisas 😏'],
  },
  cotidiano_trabalho: {
    [A]: ['Aí é puxado, mas você tá dando conta', 'Trabalho assim consome. Você almoçou direito hoje?', 'Essa semana foi pesada pra todo mundo, pelo visto. Calma que passa'],
  },
  cotidiano_estudo: {
    [A]: ['Estudar é chato mas compensa 😊 quer ajuda no que for?', 'Foca, você consegue. Depois me conta como foi', 'Nossa, prova é sempre nessa época, né? Boa sorte'],
  },
  cotidiano_comida: {
    [A]: ['Hmm, agora me deu fome 😅 onde é que fica esse lugar?', 'Comida boa é o melhor programa simples 😊'],
  },
  foto: {
    [A]: ['Aaah, que legal 😊 gostei! Manda mais quando quiser', 'Own, adorei a foto 💛 você tem olhar bom pra coisa simples'],
    [F]: ['Gostei do que vi 😏 me deixou com vontade de te mostrar o meu dia'],
  },
  desconhecido: {
    [A]: ['Entendi, faz sentido 😊 você pensa nisso bastante?', 'Interessante, eu nunca tinha parado pra pensar assim', 'Gostei do jeito que você fala. Me conta mais', 'Olha, isso rende conversa boa. Continua'],
    [F]: ['Você fala bem, sabia? 😏 isso me interessa', 'Hmm, gosto de papo assim. Continua'],
  },
};

// ---------------------------------------------------------------------------
// Novos assuntos: família, idade, igreja, vida adulta, conselho e as mensagens
// que chegam do nada (aquela cobrança sobre algo que você nem fez).
// {familiar} vira o nome do parente cadastrado, {papel} o grau e {idade} a idade dela.
// ---------------------------------------------------------------------------
export const REFORCO_RELACOES: Record<string, Partial<Record<Familia, string[]>>> = {
  pergunta_familiar: {
    [A]: ['{familiar} tá bem, graças a Deus 😊 ela vive perguntando de você', 'Tá tudo ótimo com {familiar}, obrigada por lembrar 💛', 'Ah, {familiar} tá bem! Esses dias ela até falou de você', 'Vou te contar: {familiar} anda meio cansada, mas nada demais'],
    [F]: ['{familiar} tá bem 😊 e ela já me perguntou quem é você, viu?', 'Tá ótima. Você perguntando assim me deixa com uma ideia na cabeça 😏'],
    [P]: ['{familiar} tá bem 😏 mas o que eu quero te contar não é sobre ela'],
  },
  pergunta_idade: {
    [A]: ['Tenho {idade} anos 😅 e você, quantos?', 'Depois de certa idade a gente para de contar, viu kkk tenho {idade}', '{idade}, e contando. Por que a curiosidade?', 'Tenho {idade} anos. Isso te incomoda?'],
    [F]: ['{idade} 😏 gosta de mulher mais velha?', 'Tenho {idade}, e você tem cara de que aguenta o papo 👀'],
    [P]: ['{idade} 😏 idade não é problema quando a conversa encaixa assim'],
  },
  igreja: {
    [A]: ['A igreja tá movimentada esse mês 😅 a escala tá cheia', 'O culto de domingo foi muito bom, você não foi?', 'Aqui a semana da igreja sempre rende história, viu', 'A reunião de hoje foi longa, mas valeu 🙏', 'Sabe o que aconteceu na igreja hoje? Preciso te contar kkk'],
    [F]: ['Se você fosse na igreja todo domingo eu ia mais cedo só pra te ver 😏', 'A igreja é o lugar mais perigoso pra gente conversar, viu 😅'],
    [P]: ['Levando a vida com fé e com pensamento errado, viu 😏'],
  },
  vida_adulta: {
    [A]: ['Vida adulta é isso: chegar em casa cansada e ainda ter louça na pia 😅', 'Hoje o dia foi cheio. Você tá dando conta do seu?', 'Semana adulta é semana corrida, viu. Amanhã eu resolvo o resto', 'Preciso de um fim de semana inteiro só pra mim 😅'],
    [F]: ['Depois de um dia desses, o que eu queria era companhia boa e um vinho 😏', 'Você fala desse jeito e eu esqueço o cansaço 😄'],
    [P]: ['Chegando em casa, banho demorado, vinho na mão e uma conversa dessas... 😏', 'Se eu contasse o que penso depois do trabalho você ia ficar sem palavras 🔥', 'Final de semana fora, hotel com café da manhã bom e sem pressa nenhuma 😏', 'Massagem, silêncio e você aparecendo no meio do pensamento 🔥', 'Fim de semana as crianças na casa da avó e a casa fica silenciosa demais, sabe? 😏'],
  },
  conselho: {
    [A]: ['Olha, eu vou te falar com carinho: resolve isso conversando', 'Se eu fosse você, eu não deixava passar, não. Fala logo', 'Meu conselho: respira, pensa dois dias e depois decide 😊', 'Eu já vivi coisa parecida. Dá pra resolver, mas sem pressa'],
    [F]: ['Meu conselho é meio fora do sério: esquece o problema e pensa em mim 😏'],
    [P]: ['Eu tenho dois conselhos. Um eu posso escrever, o outro não 😏'],
  },
  confusao: {
    [A]: ['Nossa, então eu confundi kkkkk desculpa! Deve ser outra pessoa', 'Jura? Então esquece, minha cabeça tá a mil hoje 😅', 'Ahhh, então era outra pessoa kkk foi mal, que vergonha', 'Ué, então eu devo ter sonhado 🤔 esquece isso', 'Era coisa da minha cabeça então, tá bom kkkkk'],
    [F]: ['Ai, que mico kkkkk então ignora... mas você não escapa de mim fácil', 'Confundi, foi mal 😅 fica só a parte boa da conversa'],
    [P]: ['Confundi mesmo 😏 mas continua falando comigo que eu gosto'],
  },
};

// ---------------------------------------------------------------------------
// Clima quente (18+): o teto do flerte quando a química liberou o tom.
// A regra continua a mesma: insinuação forte, tensão e desejo — nunca descrição
// explícita. É o "bem no clima" que deixa a conversa ardendo sem sair do aplicativo.
// ---------------------------------------------------------------------------
export const REFORCO_QUENTE: Record<string, Partial<Record<Familia, string[]>>> = {
  flerte_forte: {
    [F]: ['Você fala essas coisas e eu preciso de um minuto antes de responder 😳', 'A coragem que você tem me deixa ligada, vou confessar 😏'],
    [P]: [
      'Você escreve isso e o clima aqui mudou de vez 🔥 não vou fingir que não',
      'Se você estivesse aqui agora, essa conversa não ficaria no celular 😏',
      'Tô com a cabeça longe desde que você mandou isso. Culpa sua',
      'Guarda essa vontade: quando a gente se ver, eu cobro cada palavra 🔥',
      'Não vou escrever o que passei na minha cabeça. Imagina a coisa mais quente e tá certo 😏',
      'Você tem ideia da tentação que é você, né? 😏',
      'Vou te contar um segredo: essa semana eu dormi pensando em você mais de uma noite 🔥',
      'Assim não dá... eu leio, rio sozinha e fico sem saber o que responder 😏',
      'Você quer me tirar do sério ou já conseguiu? 🔥',
      'Deixa de brincadeira: eu queria te ver agora, sem roupa de conversa, entendeu o que eu quis dizer 😏',
    ],
  },
  flerte_leve: {
    [P]: [
      'Abraço seu deve ser perigoso. Quero conferir de perto 🔥',
      'Escreve "vem cá" desse jeito não, que eu levo a sério 😏',
      'Beijo na boca ou no pescoço? Responde direito que eu guardo a resposta 🔥',
      'Se eu dissesse que li sua mensagem três vezes, você ficaria maior ainda 😏',
    ],
  },
  elogio_corpo: {
    [P]: [
      'Você olha com atenção, né? Eu reparei que você repara 🔥',
      'Gostou do que viu? Então imagine o resto que você ainda não viu 😏',
      'Vou fingir que não gostei de ler isso... mas vou ler mais duas vezes 😏',
      'Cuidado com o que provoca de longe, que de perto eu não me seguro 🔥',
    ],
  },
  pedido_foto: {
    [P]: [
      'Hmm... essa foto a gente negocia pessoalmente, com o celular longe 😏',
      'Se eu mandar, você não dorme direito hoje. Tá disposto? 🔥',
      'Foto eu mando quando eu quiser te deixar assim, sem pensar em outra coisa 😏',
    ],
  },
  saudade: {
    [P]: [
      'Saudade aqui é de outro nível: daqueles que não se resolvem por mensagem 🔥',
      'Tô com saudade do seu cheiro, e isso já é informação demais pra mensagem 😏',
      'Escrevo "saudade" e você nem imagina o que ela significa aqui dentro 🔥',
    ],
  },
  despedida: {
    [P]: [
      'Vai dormir assim não... agora eu fiquei com o clima lá em cima e você sumindo? 🔥',
      'Boa noite "quase" 😏 a gente se fala no sonho, se é que você me entende',
      'Vai. Mas volta cedo, que essa conversa ficou no melhor ponto 🔥',
    ],
  },
  pergunta_rotina: {
    [P]: [
      'Agora? Deitada, luz baixa e pensando em você desde a segunda mensagem 🔥',
      'Tô no banho demorado daqueles que a cabeça viaja longe... você apareceu na hora 😏',
      'De camisola, cabelo bagunçado e com uma vontade que não cabe aqui 😏',
    ],
  },
  vida_adulta: {
    [P]: [
      'Sexta assim pede vinho, playlist e companhia que não tenha pressa de ir embora 🔥',
      'Cansaço desse merece um fim de semana sem roupa social e sem sair da cama 😏',
      'Você fala "depois do trabalho" e eu já penso em cama. Preguiça, óbvio... acho 😏',
    ],
  },
  convite: {
    [P]: [
      'Eu topo, mas aviso: à noite eu não tenho pressa nenhuma de ir embora 🔥',
      'Aceito o jantar. Sobremesa a gente decide lá, com a porta fechada 😏',
      'Vou, mas quero lugar reservado... com aquele tipo de vista que só a gente vê 😏',
    ],
  },
  declaracao: {
    [P]: [
      'Você falou isso e eu senti na boca do estômago. É bem por aí que você me deixa 🔥',
      'Gosto de você de um jeito que já passou do ponto da conversa educada 😏',
    ],
  },
  cantada: {
    [P]: [
      'A cantada passou, mas o que eu pensei em responder não se escreve 😏',
      'Você chega perto pela mensagem... imagina então de pertinho 🔥',
    ],
  },
  foto: {
    [P]: [
      'Você manda essa foto e ainda quer conversa normal? 🔥',
      'Guardando essa aqui. Depois te digo em que pensamento ela parou 😏',
    ],
  },
  desconhecido: {
    [P]: ['Você conta qualquer coisa e eu já fico aqui imaginando a cena 🔥'],
  },
  tedio: {
    [P]: ['Tédio + você disponível = conversa que a gente não mostra pra ninguém 😏'],
  },
  pergunta_pessoal: {
    [P]: [
      'Pergunta ousada... eu respondo se você prometer não se arrepender 🔥',
      'Do que eu gosto? Toque, paciência e quem sabe o que faz. Por que quer saber? 😏',
    ],
  },
  pedido_audio: {
    [P]: [
      'Mando... mas áudio de madrugada tem um tom que depois você não esquece 🔥',
      'Vou gravar baixinho, daquele jeito que parece perto do seu ouvido 😏',
    ],
  },
  resposta_curta: {
    [P]: ['Resposta curta em pleno clima? Agora quem ficou curioso fui eu 😏'],
  },
  mudanca_assunto: {
    [P]: ['Fugiu porque tava esquentando? Eu ia deixar esquentar mais 😏'],
  },
  elogio: {
    [P]: ['Elogio seu tem efeito colateral: eu fico boa demais pra conversa parada 😏'],
  },
  piada: {
    [P]: ['kkkk você ri, eu me derreto. Combinação perigosa pra essa hora 😏'],
  },
};

// ---------------------------------------------------------------------------
// Textões: mensagens longas de verdade, daquelas que a gente manda quando está
// à vontade (ou quando o papo rendeu). Não entram no sorteio comum: a conversa
// escolhe um quando a ficha é falante, a química já existe e o assunto rende.
// ---------------------------------------------------------------------------
export const TEXTAOS: Record<string, Partial<Record<Familia, string[]>>> = {
  cotidiano: {
    [A]: [
      'Vou te contar como foi meu dia, me dá um minuto: acordei atrasada, corri atrás do tempo o dia inteiro, almoço corrido, e quando vi já era noite. Mas sabe o que salvou? Chegar em casa, tomar banho e abrir uma conversa boa como essa. Agora sentei aqui com calma e não quero saber de mais nada além de conversar',
      'Sabe aquele dia que parece que não anda? Foi esse. Resolvi uma coisa e apareceu duas, liguei pra minha mãe, fui no mercado e esqueci metade da lista. Tô exausta, mas do tipo exausta satisfeita, entende? Agora é deitar cedo e deixar o amanhã com o amanhã. Me conta de você, quero saber se o seu dia foi menos caótico que o meu',
      'Meu dia teve de tudo: uma reunião que podia ser um recado, café demais e uma risada que não devia no meio do expediente. Chorei uma coisinha boba de cansaço no fim da tarde e depois passei por cima, como sempre faço. Agora estou aqui, quietinha, aproveitando que você apareceu pra conversar sem relógio',
    ],
    [F]: [
      'Que bom você aparecer agora, porque meu dia foi longo e eu guardava uma história pra te contar: de tarde eu lembrei de uma conversa nossa do nada e ri sozinha no meio da rua — o povo que passava devia ter achado que eu perdi a razão. Aí o dia seguiu normal, cheio, até que enfim cheguei em casa, tomei banho e vim correndo aqui. Estou de boa agora, com tempo de sobra pra você',
      'Meu dia foi daqueles que só termina bem porque termina. Mas agora que você escreveu, virou o melhor pedaço, juro. Tô no sofá, de pijama, com a TV ligada sem som e uma vontade enorme de conversar até tarde. Me conta o seu dia com calma, que eu quero ouvir tudo sem pressa nenhuma',
    ],
    [P]: [
      'Meu dia foi longo demais, e o que me segurou foi justamente pensar que à noite eu teria esse papo com você. Agora estou aqui, na cama, com o celular na mão e disposição só pra coisa boa. Se a conversa esquentar, paciência: foi você que começou 🔥',
    ],
  },
  desconhecido: {
    [A]: [
      'Gostei de ler isso, e vou te falar por quê: você tem um jeito de contar as coisas que faz eu querer saber o resto. Pouca gente me deixa curiosa assim. Conta mais, sem pular parte, que eu tenho tempo hoje e paciência de sobra pra te ouvir',
      'Nunca tinha parado pra pensar desse jeito, sério. Conversar com você é assim: vem uma coisa dessas e eu fico o dia inteiro remoendo. Me explica melhor de onde você tirou isso, porque acho que ainda tem mais história por trás',
    ],
    [F]: [
      'Você sabe puxar assunto, viu? Isso é perigoso comigo, porque eu me entrego na conversa e depois não quero parar mais. Conta o resto dessa história tua com detalhe, que eu tô toda ouvidos — e já avisando que depois disso você vai ter que continuar me acompanhando aqui',
    ],
  },
  pergunta_pessoal: {
    [A]: [
      'Vou responder com sinceridade: o que me faz bem é coisa simples. Café passado devagar, música alta no fone, conversa que vale a pena e gente que chega sem pressa. Detesto falsidade e papo raso, aquilo me cansa em cinco minutos. E você, o que te faz ficar? Pergunto de volta porque quero mesmo saber',
      'Boa pergunta, deixa eu pensar direito... Acho que eu sou do time de quem gosta de rotina com surpresa: dia comum, mas com um detalhe bom escondido em algum lugar. Não preciso de grande coisa pra ficar feliz, preciso de verdade nas pequenas. E de uma boa conversa, tipo essa que a gente tá tendo agora',
    ],
    [F]: [
      'Do que eu gosto? De conversa que rende, de quem pergunta de volta, de quem lembra do que eu falei três dias atrás. Você já percebeu que isso tudo é sobre você, né? 😏 Mas se quer mesmo me conhecer, pergunta mais — eu gosto de responder quando quem pergunta tem interesse de verdade',
    ],
    [P]: [
      'Do que eu gosto de verdade? Calor de corpo, voz baixa no ouvido e paciência pra coisa boa acontecer sem pressa 🔥 mas isso é papo pra outro estágio da conversa... ou não, depende de você 😏',
    ],
  },

  saudade: {
    [A]: [
      'Tô com saudade de verdade, e nem é daquelas saudades de frase pronta: é de conversar do jeito que a gente conversa, de rir das bobagens e de sentir que alguém do outro lado lê com atenção. A semana engoliu tudo, mas prometo organizar o tempo pra gente se falar mais. Você faz a mesma coisa do seu lado, tá?',
      'Que bom ler isso, porque eu também. Saudade daqueles papos que começam sem assunto e viram coisa grande. A vida andou corrida, eu acabei diminuindo o ritmo nas mensagens e me arrependo. Vamos retomar? Pode começar por você: me conta tudo que rolou por aí desde a última vez',
    ],
    [F]: [
      'Saudade é pouco pra o que eu tô sentindo, vou ser sincera. Fiquei esses dias pensando em você nas horas mais bobas: no café, na música do carro, na hora de dormir. Acho que você me estragou pra qualquer conversa morna, sabe? Vamos resolver essa saudade logo, porque por mensagem ela só aumenta 😏',
    ],
    [P]: [
      'Saudade daquele tipo que aperta e não deixa dormir direito. Eu ia escrever pra você ontem à noite, mas segurei, porque se eu começasse a conversa desse jeito não parava mais 🔥 hoje eu não resisti, então a culpa da noite ser longa é nossa dos dois',
    ],
  },
  conselho: {
    [A]: [
      'Vou te dar meu conselho com todo o carinho: respira primeiro. Essa coisa te apertando agora é importante, mas decisão tomada no calor resolve da pior forma. Espera dois dias, conversa com a pessoa de frente, fala o que você sente sem acusar. Se depois disso ainda doer, aí você decide com a cabeça fria. E sabe que eu tô aqui pro que der e vier, viu?',
      'Olha, eu já vivi coisa parecida, então falo de experiência: não deixa isso esticar. Assunto parado vira bola de neve, e aí a conversa que podia ser simples vira briga grande. Fala logo, com calma e de coração aberto. Se precisar ensaiar o que vai dizer, ensaia comigo. Eu não julgo e ainda ajudo a melhorar o texto 😄',
    ],
  },
  apoio: {
    [A]: [
      'Ei, vem cá: respira. Não precisa resolver tudo hoje, e você não precisa passar por isso calado. Desabafa comigo do jeito que vier — texto longo, pedaço solto, palavra torta, eu leio tudo e não julgo nada. Dia ruim não define quem você é, e amanhã a coisa já fica diferente, pode crer. Eu tô aqui, sem pressa nenhuma',
      'Sinto muito que você está assim, de verdade. Quer que eu te escute sem dar opinião ou quer um conselho? Eu faço os dois, é só me dizer. E uma coisa: comer, tomar água e dormir hoje é prioridade, mais que qualquer problema. O resto a gente resolve junto, passo a passo. Não some, tá?',
    ],
    [F]: [
      'Se eu pudesse eu estava aí agora, te dando aquele abraço que resolve metade. A outra metade a gente resolve conversando: me conta tudo, sem resumo, sem poupar detalhe. Você carregou isso sozinho até aqui, mas hoje não precisa mais. Tô aqui lendo cada palavra e pensando em como te deixar melhor 💛',
    ],
    [P]: [
      'Dia ruim desse não pode terminar parado: vem desabafar comigo, eu cuido de você daqui. Primeiro a conversa boa, o colo virtual, o desabafo inteiro. Depois, se você quiser, eu te distraio do jeito que só eu sei 😏 mas primeiro o que dói: conta tudo.',
    ],
  },
  alegria: {
    [A]: [
      'Que notícia boa, meu Deus! Eu tô aqui sorrindo do nada lendo isso, é sério. Você merece cada detalhe dessa conquista, porque eu sei da dedicação que tem por trás. Me conta tudo: como foi, quem você contou primeiro, o que disse. E avisa quando for comemorar, que eu quero pelo menos o relato completo com direito a um brinde virtual 🥳',
      'Eu sabia que você ia conseguir! Lembra que eu falei? Aquela fase difícil era exatamente o antes do certo. Comemora do jeito que você gosta, chama quem você ama e guarda esse dia na memória. Depois me conta os detalhes sem pular nenhum, porque eu quero saber de tudo, até da parte boba',
    ],
    [F]: [
      'Isso merece festa, e eu já me candidatei a fazer parte dela 😏 parabéns de verdade, ver você assim me deixa orgulhosa de um jeito que nem sei explicar. Me conta tudo com detalhe: como reagiu, quem se surpreendeu mais. E depois isso, a gente comemora de verdade, tá combinado?',
    ],
  },
  vida_adulta: {
    [A]: [
      'Vida adulta é exatamente isso que você falou, e ninguém me avisou antes: paga conta, arruma casa, trabalha, resolve, e o dia acabou sem você fazer nada que queria de verdade. Mas eu aprendi um truque: todo dia separo vinte minutos que são só meus, sem culpa. Hoje esses minutos são seus, aproveita. E se cuida, viu? O cansaço acumulado cobra caro',
      'Nossa, entendi demais o que você disse. Ando na mesma esteira: semana cheia, coisa acumulando, e aquela sensação de que a vida tá passando em velocidade duas vezes. O que me salva é conversa boa e um plano pequeno pro fim de semana. Nem precisa ser grande, só de algo que eu queira fazer. Você tem algum plano ou vai aproveitar pra descansar de verdade?',
    ],
    [F]: [
      'Depois de um dia desses, o que eu queria era chegar em casa e encontrar companhia boa, um vinho aberto e nenhuma pressa de falar de trabalho. Você tem jeito de quem faz companhia assim, sabe? Um dia desses a gente testa essa teoria 😏 mas antes me conta: você ao menos comeu direito hoje ou vive no café igual eu?',
    ],
    [P]: [
      'Você descreveu o meu dia com precisão assustadora. Cheguei, comi qualquer coisa, e o que me deixou de bom humor foi exatamente isso: saber que à noite tinha esse papo. Agora tô aqui, banho tomado, vinho na mão, sem compromisso amanhã cedo. O clima tá montado, só falta o assunto esquentar 🔥',
    ],
  },
  pergunta_rotina: {
    [A]: [
      'Tô no sofá desde que cheguei, sem fazer absolutamente nada produtivo, e confesso que está sendo maravilhoso. Comi uma coisa qualquer, deixei a louça pra amanhã e escolhi a preguiça de propósito, porque eu mereço. Agora converso com você até o sono chegar. E o seu dia, me conta com detalhe que eu quero saber de tudo',
      'Meu dia: trabalho, mercado na volta, jantar simples e agora essa pausa boa que é falar com você. Nada de extraordinário, mas tô em paz. Às vezes o dia sem novidade é exatamente o que a gente precisa, né? Você ao menos teve um momento seu hoje ou foi correria de ponta a ponta?',
    ],
    [F]: [
      'Vou ser sincera: meu dia foi normal, mas meus pensamentos não estavam exatamente aqui... 😏 agora você apareceu e melhorou tudo. Tô de boa, sem pressa, com tempo de sobra. Então me conta o seu dia inteiro, que eu quero ouvir cada detalhe sem pular nada',
    ],
    [P]: [
      'Agora? Deitada na cama, luz apagada, cabelo solto e um pensamento que eu não vou escrever ainda 😏 você chegou na melhor hora possível. Se essa conversa seguir por esse caminho, aviso logo: eu não durmo cedo hoje 🔥',
    ],
  },
  tedio: {
    [A]: [
      'Tô no mesmo tédio, e olha que eu tentei de tudo: mexi no celular, abri três séries e fechei todas, arrumei uma gaveta aleatória. Nada colou. Aí você apareceu e a noite melhorou na hora. Que tal a gente inventar algo pra fazer, mesmo que seja por mensagem? Um jogo, uma pergunta difícil, qualquer coisa. Me propõe algo',
      'Tédio aqui também, daqueles fortes. O que eu faria pra resolver: um programa qualquer fora de casa, mas a preguiça ganhou. Então decidi: hoje o meu divertimento é essa conversa. Me entretem? Me conta uma história que eu ainda não sei sobre você, pode ser boba, desde que seja verdade',
    ],
    [F]: [
      'Tédio é perigoso quando eu tô sozinha e com você a uma mensagem de distância 😏 porque eu começo a conversar sem filtro nenhum e depois não me responsabilizo. Vamos aproveitar a noite então: me faz companhia que eu prometo que o tédio não sobrevive',
    ],
  },
  ciumes: {
    [A]: [
      'Calma, deixa eu explicar direito porque quero ficar bem clara: é gente que eu conheço de anos, de um contexto que não tem nada a ver com nós dois. Você não precisa ficar com esse pensamento, de verdade. Mas olha, vou ser honesta: saber que você ligou pra essa coisa toda me disse bastante sobre o que você sente, e eu não vou fingir que não gostei 😊',
    ],
    [F]: [
      'Ciúme seu eu achei... interessante 😏 não vou mentir que detestei. Mas relaxa: não tem ninguém, e o que existe de interessante na minha semana está escrevendo pra mim agora. Guarda esse ciuminho, porque se um dia você me ver de perto, ele vai ser bem útil 😉',
    ],
  },
  declaracao: {
    [A]: [
      'Você não sabe o tamanho do que acabou de escrever pra mim. Fiquei um bom tempo só olhando a mensagem sem saber o que responder, e não porque eu não quis — porque mexeu. Deixa eu ser igualmente sincera: você virou parte boa da minha rotina, o recado que eu espero no fim do dia. Vamos devagar, mas vamos. Isso aqui valeu demais',
      'Nossa. Precisei respirar antes de responder, sério. Eu gosto do que a gente vem construindo, do jeito que você fala comigo e da confiança que isso tudo virou. Não vou acelerar nada, nem te prometer coisa além do que sinto hoje: eu te gosto bem, e quero ver onde isso chega. Obrigada por falar primeiro, de verdade',
    ],
    [F]: [
      'Você falou. E eu que passo o dia com respostas na ponta dos dedos fiquei sem nenhuma 😳 só sei que li três vezes e sorri em todas. Também gosto de você, do jeito que dá pra escrever aqui — e tem uma parte que não cabe em mensagem, que eu guardo pra dizer olhando nos seus olhos. Cuida bem dessa coisa que a gente tá construindo',
    ],
    [P]: [
      'Sabe o que eu ia dizer? Que sinto o mesmo, e que a gente sabe muito bem que isso já passou do papo amigável há um tempo 🔥 deixa eu ser sincera do meu jeito: eu penso em você de dia e de noite, e não é só pra conversar. Quando a gente se ver, essa conversa ganha outro endereço 😏',
    ],
  },
  despedida: {
    [A]: [
      'Vou nessa então, antes que eu fique aqui conversando até de madrugada. Foi muito bom falar com você hoje, de verdade — você tem um jeito de deixar tudo mais leve. Dorme bem, cuida do sono e me manda mensagem amanhã, tá? Eu quero saber como as coisas andam do seu lado',
    ],
    [F]: [
      'Tá bom, mas já avisando: eu fico com aquela sensação de conversa pela metade 😅 amanhã a gente continua exatamente daqui, sem começar de novo. Vai descansar, sonha bonito — e se sonhar comigo, amanhã conta 😏',
    ],
    [P]: [
      'Boa noite assim não... você vai me deixar aqui com o clima no fogo e a casa em silêncio 🔥 vai dormir, mas sonha comigo — e amanhã eu te conto se eu sonhei com você. Spoiler: provavelmente sim 😏',
    ],
  },
};

/** Reação de risada pura quando você manda algo engraçado (intenção "piada"). */
export const RISADAS_REACAO: string[] = [
  'kkkkkkkk', 'kkkkkkk', 'kakakaka', 'kkkkk parei', 'morri kkkkkk', 'kkkkkk essa foi boa', 'kkkkkkk não aguento',
];
export const RISADAS_REACAO_MADURA: string[] = ['kkkkk', 'hahahaha', 'hahaha, ó', 'kkkk, boa'];

// ---------------------------------------------------------------------------
// Pergunta em aberto: quando ELA pergunta algo ("você já jantou?") e você
// responde, a resposta seguinte nasce do assunto da pergunta — reage ao que
// você disse e conta a vez dela. É o que mata a resposta "nada a ver".
// ---------------------------------------------------------------------------
/** Primeira bolha: reage ao tipo de resposta que você deu (sim, não ou conteúdo). */
export const REACAO_RESPOSTA: Record<string, string[]> = {
  dia: ['Que bom ler isso 😊', 'Ah, então o dia está andando, ótimo', 'Entendi... dia desses a gente sobrevive, né?', 'Boa! Aproveita então'],
  comida: ['Boa escolha 😄', 'Agora me deu fome de novo, olha o que você fez', 'Hmm, gostei de saber', 'Comida boa arruma o dia, não tem erro'],
  musica: ['Boa escolha, vou ouvir agora só pra conferir 😄', 'Gostei, você tem bom gosto', 'Hmm, caiu bem até no meu humor'],
  trabalho: ['Faz sentido, trabalho é assim mesmo', 'Uff, aí é puxado 😅', 'Entendo bem como é isso', 'Então você anda crescendo aí, hein 😊'],
  estudo: ['Aí você está no caminho 😊', 'Boa! Estudo rende quando vira rotina', 'Entendi, faz sentido pro seu momento'],
  familia: ['Que bom que está tudo bem por aí 😊', 'Ah, família é assim mesmo: movimento e história', 'Gostei de saber, isso dá paz'],
  pet: ['kkk bichinho tem dessas', 'Ahh, então é daqueles que dominam a casa 😄', 'Que fofo, sério'],
  viagem: ['Boa! Lugar bom restaura a gente 😊', 'Anotado, da próxima quero dica', 'Hmm, combina com você'],
  clima: ['Pois é, o tempo anda doido mesmo', 'Aqui também tem desses dias', 'Aproveita aí então 😊'],
  amor: ['Gostei de saber isso sobre você 😊', 'Faz sentido, cada um tem seu jeito', 'Hmm, então é assim que você funciona... anotado 😏'],
  ama: ['Isso diz muito sobre você, gostei', 'Boa! Coisa boa de verdade', 'Anotado, vou usar isso depois kkk'],
  futuro: ['Gostei, você pensa no que vem pela frente', 'Aí sim, plano é meio caminho andado 😊', 'Entendo, momento de construir'],
  arte: ['Boa dica, vou conferir depois', 'Gostei, você entende do assunto', 'Anotado na lista, sério'],
  treino: ['Olha o disciplina 😄', 'Boa! O corpo agradece', 'Respeito quem mantém o ritmo, sério'],
  filhos: ['Ahh, então a casa está a mil 😄', 'Crescem rápido demais, né?', 'Gostei de saber, casa movimentada é vida'],
  casa: ['A casa nunca para, né? 😅', 'Entendi, semana de arrumação então', 'Boa, organizado assim dá paz'],
  descanso: ['Isso! Descansar também é produtivo 😊', 'Que bom, você merece essa pausa', 'Aproveita bem, então'],
  fe: ['Amém, que bom ler isso 🙏', 'Que bonito, gostei de saber', 'Isso fortalece, né? 🙏'],
  casa_adulta: ['A vida adulta é isso mesmo, uma lista infinita 😅', 'Boa, dando conta então', 'Entendi, rotina é assim mesmo'],
  saudacao: ['Que bom 😊', 'Aí sim, fico contente', 'Ótimo saber 🙂'],
  do_nada: ['Ahh, agora entendi o movimento 😄', 'Faz sentido, viu', 'Boa, então está tudo explicado'],
  geral: ['Boa 😊', 'Entendi, faz sentido', 'Gostei de saber', 'Ahhh, agora sim', 'Hmm, anotado aqui na cabeça 😄', 'Que bom!'],
};

/** Segunda bolha: a resposta dela para a mesma pergunta que ela te fez. */
export const MINHA_VEZ: Record<string, string[]> = {
  dia: ['Por aqui está corrido, mas está valendo 😊', 'O meu foi daqueles que passam rápido sem coisa grande, sabe?', 'Aqui tudo tranquilo, resolvi umas coisas e agora estou de boa'],
  comida: ['Eu ainda nem comi direito, estou naquela preguiça de cozinhar 😅', 'Aqui foi coisa simples, mas caprichada', 'Confesso que sou do time do pedido em casa kkk'],
  musica: ['Aqui está tocando coisa antiga, daquelas que a gente canta sem querer kkk', 'O meu fone não desliga hoje, estou naquela maratona de playlist 😄', 'Por aqui anda tudo calmo, música baixa e cabeça descansada'],
  trabalho: ['O meu anda cheio, mas consegui respirar hoje 😅', 'Aqui a correria não para, mas estou dando conta', 'Já encerrei minhas coisas e agora estou de boa'],
  estudo: ['Confesso que andei longe dos estudos, mas quero voltar 😊', 'Aqui eu estudo na base da necessidade, se funciona né kkk', 'Estudar cansa, mas mantém a cabeça firme'],
  familia: ['A minha está bem, graças a Deus 😊 sempre com movimento', 'Aqui a família é pequena, mas barulhenta kkk', 'Tudo em paz por aqui, obrigada por perguntar'],
  pet: ['Eu ainda não tenho bichinho, mas vivo cuidando dos outros kkk', 'O do meu vizinho adotou a minha varanda, sério 😄', 'Um dia eu adoto, o ritmo ainda não deixou'],
  viagem: ['Estou devendo uma viagem pra mim, sério', 'Praia é o meu lugar no mundo, sem dúvida', 'Minha lista de lugares cresce mais rápido que o dinheiro kkk'],
  clima: ['Aqui está quente demais, só quero sombra e água fresca 😅', 'Por aqui deu uma amenizada, estou aproveitando', 'Chuva pra mim é convite pra ficar em casa com música'],
  amor: ['Eu sou mais de poucos e verdadeiros, sabe?', 'Gosto de carinho nos detalhes, não nas declarações grandes 😊', 'Por aqui o coração está tranquilo'],
  ama: ['Eu amo uma tarde sem compromisso, café e música', 'Cozinhar me relaxa mais do que deveria kkk', 'Amo conversa boa... como essa, já percebeu 😏'],
  futuro: ['Eu quero é descansar e organizar a vida primeiro kkk', 'Meu plano é viajar mais, estou juntando coragem', 'Por aqui o plano é simples: paz e coisa boa acontecendo'],
  arte: ['Estou no meio de uma série que eu devia ter terminado semana passada kkk', 'O último filme que assisti me pegou no final, não julga 😅', 'Minha lista salva cresce e eu não termino nada'],
  treino: ['Tentei voltar ao treino essa semana e a perna ainda está doendo kkk', 'Aqui minha atividade física é subir escada e fingir que é treino 😅', 'Caminhada é o meu limite, confesso'],
  filhos: ['Meus dias giram em volta da casa e da rotina deles 😄 mas eu amo', 'Criança é energia infinita, eu não acompanho mais kkk', 'Aqui quem manda são eles, e eles sabem kkk'],
  casa: ['A louça nunca acaba, juro que ela se multiplica 😅', 'Aqui sempre aparece um reparo novo, casa é assim', 'Aos poucos estou deixando tudo do meu jeito'],
  descanso: ['Dormi mal essa semana, mas hoje prometo me deitar cedo 😅', 'Meu descanso é série com coberta e silêncio', 'Descanso de verdade pra mim é dia sem celular'],
  fe: ['Estou acompanhando a escala do mês aqui, sempre rende história 😊', 'A fé me sustenta, viu? Não troco isso por nada', 'Domingo por aqui é sagrado: igreja e família'],
  casa_adulta: ['Aqui é trabalho, casa, conta e no fim um vinho de vitória 😅', 'A lista adulta nunca acaba, mas estou dando conta', 'Meu fim de semana é sagrado, faço questão de descansar'],
  saudacao: ['Estou bem sim 😊 dia movimentado, mas sorrindo', 'Tudo ótimo por aqui! Cansada no bom sentido', 'Melhor agora que você apareceu, confesso 😊'],
  do_nada: ['Agora entendi tudo, obrigada por esclarecer 😄', 'Então era isso! Que bom', 'Ahh, agora deu certo na minha cabeça'],
  geral: ['Por aqui está tudo andando bem 😊', 'Aqui é a rotina de sempre: correria e descanso no fim', 'Nada de novidade grande, mas estou de bem com a vida'],
};

// ---------------------------------------------------------------------------
// Perguntas do usuário merecem resposta do tipo certo. "que horas você almoça?"
// não pode receber o mesmo textão que "você acredita em amor tranquilo?".
// ---------------------------------------------------------------------------
export const PERGUNTA_FATO_TIPOS: { padrao: RegExp; respostas: string[] }[] = [
  { padrao: /\b(quando|que horas|que dia|em que dia)\b/i, respostas: [
    'Provavelmente depois do almoço. Te confirmo na hora 😊',
    'Amanhã, eu acho. Não marca na pedra que eu sou de mudar kkk',
    'Depende do dia... hoje já está apertado, amanhã fica melhor 😄',
    'Nem eu sei ainda, a semana anda torta 😅 mas te aviso aqui',
  ] },
  { padrao: /\b(por que|porque|pq)\b/i, respostas: [
    'Porque sim kkk brincadeira... é uma coisa minha, te conto depois com calma',
    'Ué, por que não? kkk',
    'Motivos que só eu entendo, viu 😄 mas faz sentido pra mim',
  ] },
  { padrao: /\b(como|de que jeito)\b/i, respostas: [
    'Dá pra levar! Uns dias melhores que outros, né? E você, como anda?',
    'No ritmo de sempre 😊 um dia de cada vez',
    'Sobrevivendo com estilo kkk e você?',
  ] },
  { padrao: /\b(qual|quais|qual é|qual e)\b/i, respostas: [
    'Ooh, boa pergunta... hoje eu diria: um dia na praia sem hora pra voltar 😄',
    'Não tenho UM favorito, tenho uma lista que só cresce kkk',
    'Resposta estranha minha: paz. É sempre paz 😊',
  ] },
  { padrao: /\b(onde|aonde)\b/i, respostas: [
    'Por {cidade} 😊 e você, por onde anda?',
    'Em casa, no meu canto do sofá. Lugar mais seguro do mundo kkk',
    'Depende: semana em casa, fim de semana por aí 😄',
  ] },
];

/** Padrão quando a pergunta é de sim/não ("você trabalha amanhã?"). */
export const PERGUNTA_FATO_FECHO: string[] = [
  'Acho que sim! Mas depende do dia, viu 😄',
  'Sei lá... acho que não. Nunca parei pra pensar direito nisso 😅',
  'Vou ser sincera: talvez. Depende muito de quem pergunta kkk',
  'Sim, sou desse time 😄',
  'Estou de boa agora, pode falar 😊',
  'Hmm... provavelmente não. Prefiro o caminho mais simples',
];

/** Resposta factual sobre ela: mora e signo saem da ficha de verdade. */
export const RESPOSTAS_FATUAL: Record<'mora' | 'signo', string[]> = {
  mora: [
    'Moro em {cidade} 😊 e você?',
    'Aqui em {cidade} mesmo. Cidade pequena, mas tem o que eu preciso',
    '{cidade}! Nasci e cresci por aqui',
    'Moro por {cidade}... por que a curiosidade toda? 😄',
  ],
  signo: [
    'Sou de {signo}! Você acredita nessas coisas ou é só curiosidade? kkk',
    '{signo} — e antes que você pergunte, sim, eu tenho tudo que dizem que o signo tem kkk',
    'Meu signo é {signo} 😄 e o seu?',
  ],
};

// Mais conteúdo com a cara de quem já é adulta — sugestivo, sem descrição explícita.
export const REFORCO_ADULTO: Record<string, Partial<Record<Familia, string[]>>> = {
  elogio: {
    [P]: ['Você elogia assim e eu fico olhando a tela feito boba 😏', 'Elogio de quem sabe falar é perigoso, viu 🔥'],
  },
  convite: {
    [P]: ['Jantar naquele lugar calmo, depois um vinho e conversa sem relógio. Eu topo 😏', 'Você escolhe: um fim de semana fora ou uma noite inteira sem pressa 😏'],
  },
  flerte_leve: {
    [P]: ['Vem cá me dar esse abraço, mas com calma que eu ainda tenho trabalho amanhã 😏', 'Eu queria que você estivesse aqui na hora do banho... tô brincando 😏 quer dizer, nem tanto'],
  },
  flerte_forte: {
    [P]: ['Você fala assim e eu já penso em coisa que não escrevo aqui 🔥', 'Devagar, meu bem. Quem tem pressa não aproveita o clima 😏', 'Olha, eu sou mulher feita: conversa boa, jantar bom e cama arrumada. Você aguenta? 😏'],
  },
  pedido_foto: {
    [P]: ['Foto? Depois de um jantar como esse eu penso, viu 😏', 'Calma lá, isso a gente negocia pessoalmente 🔥'],
  },
  cotidiano: {
    [P]: ['Me conta do seu dia direito, sem pressa. À noite eu tenho tempo 😏'],
  },
  saudade: {
    [P]: ['Saudade é pouco. Tô aqui deitada pensando em você, sabia? 😏'],
  },
  desconhecido: {
    [P]: ['Você escreve desse jeito e eu começo a imaginar a conversa de perto 🔥'],
  },
  despedida: {
    [P]: ['Boa noite, meu bem 😏 sonha com coisa boa', 'Vai dormir, senão eu te conto o que eu tô pensando e você não dorme 🔥'],
  },
};

for (const [id, familias] of Object.entries({ ...REFORCO, ...REFORCO_ADULTO, ...REFORCO_RELACOES, ...REFORCO_QUENTE })) {
  const banco = RESPOSTAS[id as IntentId];
  const alvo = banco || (RESPOSTAS[id as IntentId] = {});
  for (const familia of [A, F, P] as Familia[]) {
    const opcoes = familias[familia];
    if (opcoes) alvo[familia] = [...(alvo[familia] || []), ...opcoes];
  }
}

/** Perguntas de volta. */
export const PERGUNTAS: Record<string, string[]> = {
  dia: ['E o seu dia, como foi?', 'Me conta: o que você fez hoje?', 'Tá dando pra descansar um pouco?', 'Como tá sua semana?', 'Você dormiu bem?', 'Tá com tempo hoje ou correndo?', 'Me fala uma coisa boa do seu dia', 'Você já jantou?'],
  trabalho: ['Como foi no trabalho hoje?', 'Sobrou um tempo livre pra você hoje?', 'E aí, o chefe deu trégua?', 'Você trabalha com o que mesmo?', 'Esse projeto tá andando?'],
  estudo: ['E como você tá indo nos estudos?', 'Você conseguiu estudar hoje?', 'Essa prova vai ser quando?'],
  comida: ['Você já comeu?', 'O que você comeu de bom hoje?', 'Você cozinha bem ou só pede?'],
  musica: ['Qual música você tá ouvindo agora?', 'Me manda uma música que você gosta', 'Você curte música ao vivo?', 'Já foi em algum show esse ano?', 'Tem música que te faz lembrar de alguém?'],
  familia: ['Como tá sua família?', 'Você vê sua família muito?'],
  pet: ['Como tá seu bichinho?', 'Manda foto do seu pet! Eu pedi, então vale'],
  viagem: ['Você gosta de praia ou de montanha?', 'Qual lugar você sonha em conhecer?'],
  clima: ['Tá frio ou calor aí?', 'Aqui tá aquele tempo maluco, né?'],
  amor: ['Você é de falar ou de guardar sentimento?', 'Você acredita em amor tranquilo?', 'Você já se apaixonou rápido?', 'O que te faz sentir cuidado?'],
  ama: ['E você, o que ama fazer na vida?', 'Qual é a sua coisa favorita da semana?'],
  futuro: ['O que você quer pra você esse ano?', 'Você tá planejando algo grande?'],
  arte: ['Você viu alguma coisa boa essa semana?', 'Me indica uma série que eu confie na sua opinião'],
  treino: ['Você tá treinando?', 'Como você cuida de você?'],
  filhos: ['Como estão as crianças?', 'Você tem filhos? Como é a rotina aí?', 'Quem cuida dos pequenos quando você trabalha?', 'Criança dá trabalho, né? Me conta uma coisa boa deles'],
  casa: ['Como tá a casa essa semana?', 'Você já resolveu aquilo da casa?', 'Sobrou um tempo pra você hoje ou foi tudo obrigação?', 'O que você tem pra fazer amanhã?'],
  descanso: ['Você tem dormido bem?', 'Quando foi a última vez que você descansou de verdade?', 'O que você faz pra relaxar?', 'Se você tivesse um dia livre amanhã, o que faria?'],
  fe: ['Você foi na igreja ontem?', 'Como tá o seu chamado?', 'Você tem lido algo que te edificou?', 'Me conta uma coisa boa da semana'],
  casa_adulta: ['Como você faz pra dar conta de tudo?', 'Você cozinha ou pede comida?', 'Sobrou algum tempo pra você hoje?'],
};
export const TEMAS_POR_INTERESSE: Record<string, keyof typeof PERGUNTAS> = {
  treino: 'treino', musica: 'musica', estudo: 'estudo', fe: 'futuro', viagem: 'viagem', arte: 'arte',
  games: 'arte', pets: 'pet', comida: 'comida', familia: 'familia', amigos: 'dia', rotina: 'dia',
  trabalho: 'trabalho', clima: 'clima',
  // Vida adulta
  filhos: 'filhos', casa: 'casa', autocuidado: 'descanso', trabalho_adulto: 'trabalho',
  vinho: 'comida', seriados: 'arte', familia_grande: 'familia', saude: 'descanso',
  contas: 'trabalho', igreja_adulto: 'fe', viagem_adulto: 'viagem',
};

/** Complementos para respostas longas (personalidade falante). */
export const COMPLEMENTOS: string[] = [
  'Meu dia foi corrido, mas agora que você apareceu ficou melhor 😊',
  'Desculpa a demora, tava resolvendo coisa aqui em casa 🙃',
  'Adoro quando você puxa assunto fora do óbvio',
  'Você tem um jeito que me faz escrever mais do que devia 😅',
  'Amanhã tenho coisa cedo, mas sempre reservo um tempo pra minha conversa favorita',
];
export const COMPLEMENTOS_PICANTES: string[] = [
  'Você gosta de conversar assim... eu também, mas com calma 😏',
  'Tô me segurando aqui pra não falar demais 🔥',
  'Se você tivesse aqui, a conversa ia ser bem diferente 😏',
];
export const COMPLEMENTOS_FECHADA: string[] = [
  'Hoje eu tô meio baixa, mas não é por sua causa',
  'Desculpa a secura, tô com a cabeça em outra coisa',
];
/** Mesma coisa, com a calma de quem já tem mais estrada. */
export const COMPLEMENTOS_FECHADA_ADULTA: string[] = [
  'Hoje eu acordei sem energia, mas conversar com você faz bem',
  'Desculpa a secura. Tem coisa ocupando minha cabeça hoje',
  'Hoje eu tô quieta por dentro, e não é nada com você',
  'Ando cansada, mas de você eu não vou fugir',
];

/** Desvios quando o tom passou do que a relação permite. */
export const DESVIOS: string[] = [
  'Calma lá 😅 a gente ainda tá no começo, vamos com calma',
  'Uau 🫣 você é rápido. Eu gosto de conversa antes de tudo',
  'Sei não, hein... vamos devagar, eu preciso conhecer você melhor 😊',
  'Você tá pulando etapa comigo, deixa a coisa acontecer natural',
  'Não é assim, meu bem. Eu tenho meu tempo e ele é curto pra quem tem pressa 😌',
];
export const DESVIOS_AMIZADE: string[] = [
  'Olha, por aqui a gente fica só no papo, tá? 😊 não é por aí comigo',
  'Não gosto quando o papo vai pra esse lado. Vamos falar de outra coisa?',
  'Vou fingir que você não escreveu isso 😅 tem assunto melhor',
];

/** Quando não há parente cadastrado na ficha: resposta honesta, sem inventar nome. */
export const SEM_FAMILIAR: string[] = [
  'Minha família tá bem, obrigada por perguntar 😊',
  'Tá tudo bem por aqui, amém 🙏 e a sua?',
  'Sem novidade grande, mas obrigada por lembrar 💛',
  'Tudo em paz por aqui. Você é atencioso, viu?',
];

/** Quando ela te vê como criança: nenhum assunto romântico passa por aqui. */
export const LIMITES_CRIANCA: string[] = [
  'Ei, você ainda é um menino 😅 guarda esse assunto pra quando você tiver idade',
  'Nada disso, garoto. Eu tenho idade pra ser sua tia, lembra? kkk',
  'Olha o respeito comigo, criança 😄 fica na conversa de gente nova',
  'Você é novinho, filho. Conversa assim você leva pra outra pessoa, não pra mim',
  'Não, não e não 😅 eu cuido de você, não é desse jeito',
  'Vou fingir que não li e vou te dizer o que sua mãe diria: respeito 😄',
];

/** Você é menor de idade: ela corta o assunto e mantém o papo leve. */
export const LIMITES_MENOR: string[] = [
  'Ó, isso não 😅 deixa o papo leve que a gente ainda tá se conhecendo',
  'Hmm, não. Esse assunto não é pra agora, bora falar de outra coisa?',
  'Vou passar reto nessa, tá? Melhor a gente rir de outra coisa 😄',
  'Calma aí 😅 eu não sou dessas conversas, e você merece um papo melhor',
  'Isso não, viu? Vamos falar de música, de série, de qualquer outra coisa 😊',
];

/** Dinâmica de tia: carinho, conselho e nenhum romance. */
export const LIMITES_TIA: string[] = [
  'Menino, eu já sou quase uma tia pra você 😅 conversa assim não combina comigo',
  'Fica quieto 😄 eu sou de outra geração, e essa conversa não é pra mim',
  'Olha, deixa eu te dar um conselho de gente mais velha: pisa no freio',
  'Eu gosto de você como quem cuida, meu bem. E é assim que vai ficar 😊',
  'Você é muito novo e eu sou muito velha pra esse tipo de papo 😅',
];

/** Vínculo de família declarado na ficha. */
export const LIMITES_FAMILIA: string[] = [
  'Ei, ei! Eu sou {vinculo} de você, lembra? kkkk fala sério',
  'Olha o assunto, que eu conto pra sua mãe 😄',
  'Não, isso não é jeito de falar com quem te conhece desde novo 😅',
  'Vou fingir que não li isso. Como está o seu dia hoje? 😄',
];

/** Complementos na voz de tia: conselho, família e comparações de época. */
export const COMPLEMENTOS_TIA: string[] = [
  'Quando eu tinha a sua idade eu era igual, viu 😄',
  'Aproveita que você é novo, isso passa rápido',
  'Já comeu de verdade hoje? Me responde com sinceridade',
  'Se precisar de conselho, eu tô aqui, viu? Comigo não precisa ter vergonha',
  'Você tá crescendo rápido. Sua mãe deve ter orgulho de você',
  'Na minha época o povo namorava de outro jeito, hoje é tudo mensagem',
  'Vou te falar como a gente fala na igreja: guarda o seu tempo',
];

/** O que ela pergunta quando te vê como criança. */
export const PAPO_CRIANCA: string[] = [
  'E o estudo, como tá indo?',
  'Você tem comido direito? Casa de solteiro é assim mesmo 😅',
  'Sua mãe tá bem? Manda um abraço pra ela',
  'Você vai dormir que horas? Amanhã tem compromisso',
  'Você anda indo na igreja? Noto a sua falta',
  'Não vai fazer besteira por aí, viu? Me escuta',
];

/** Puxadas de família: quando ela lembra de casa e dos filhos. */
export const FALAS_FAMILIA: string[] = [
  'Você não vai acreditar no que {familiar} me contou hoje kkk',
  'Tive um dia de família: {familiar} deu trabalho, mas no fim deu tudo certo',
  'Gente, {familiar} me perguntou de você 😳 o que eu respondo?',
  'Depois te conto como foi o almoço de domingo com {familiar} 😊',
];

/** Ponte de memória: ela puxa o que você já contou. */
export const PONTES: { tipo: string; modelos: string[] }[] = [
  { tipo: 'preferencia', modelos: ['Você comentou que ama {valor}, lembrei agora 😄', 'Aliás, aquele negócio de {valor} continua rendendo?', 'Lembrei de você quando vi algo sobre {valor}'] },
  { tipo: 'evento', modelos: ['E aquilo de {valor}, como foi?', 'Você me contou de {valor} e eu fiquei curiosa até agora', 'Como terminou {valor}? Fiquei sem saber o final'] },
  { tipo: 'rotina', modelos: ['Como tá indo com {valor}?', 'E a rotina, {valor} tá pesado?', 'Você melhorou aquele troço de {valor}?'] },
];

export const SOMBRAS: Record<Familia, string[]> = {
  [A]: ['Adorei o papo 😊', 'Você me faz rir', 'Tô com vontade de te conhecer pessoalmente, isso é bom', 'Nossa, a gente conversa bem, viu', 'Fico feliz que você apareceu hoje', 'Você tem um jeito tranquilo que me agrada', 'Podia ser sempre assim 😊'],
  [F]: ['Você tá ficando perigoso 😏', 'Fico sorrindo aqui igual boba 😳', 'Se continuar assim eu vou me apegando', 'Você tem jeito pra dizer as coisas, hein', 'Tô gostando demais disso aqui'],
  [P]: ['Tô aqui com a cabeça longe 😏', 'Você tem ideia do que escreve, né? 🔥', 'Melhor eu parar antes que eu passe dos limites', 'Depois não diz que eu te avisei 😏'],
};

/** Sugestões de abertura na voz de quem está usando o app. */
export interface Sugestao { texto: string; motivo: string; tom: Tone }
export const ABERTURAS: Record<'primeira' | 'retorno' | 'proxima' | 'especial' | 'aniversario' | 'interesse' | 'convite' | 'familia', Sugestao[]> = {
  primeira: [
    { texto: 'Oi! Vi que você curte {interesse} — me indica uma coisa boa de lá?', motivo: 'Abre com o interesse real da ficha', tom: 'amizade' },
    { texto: 'Oi, tudo bem? Que coincidência a gente se falar hoje, tava lembrando de você 😊', motivo: 'Casual e sem pressão', tom: 'amizade' },
    { texto: 'Oi! Vou direto: gosto da sua energia e queria te conhecer melhor', motivo: 'Elogio curto e honesto', tom: 'flerte' },
  ],
  retorno: [
    { texto: 'Oi! Sumi um pouco, semana pesada. Como você tá?', motivo: 'Assume a ausência sem drama', tom: 'amizade' },
    { texto: 'Oi, saudade do nosso papo. Aconteceu tanta coisa que preciso te contar', motivo: 'Reabre com assunto pendente', tom: 'flerte' },
    { texto: 'Parei de responder aquele dia, foi mal. Posso retomar de onde a gente parou?', motivo: 'Conserta o silêncio', tom: 'amizade' },
  ],
  proxima: [
    { texto: 'E aquilo de {gancho}, como foi? Fiquei curioso', motivo: 'Mostra que guardou o que ela contou', tom: 'amizade' },
    { texto: 'Boa noite 😊 pensei em você quando tocou {musica}', motivo: 'Usa a música favorita da ficha', tom: 'flerte' },
    { texto: 'Hoje eu tava com vontade de te ver, sem enrolação', motivo: 'Direto, mas carinhoso', tom: 'flerte' },
  ],
  especial: [
    { texto: 'Você tá na minha cabeça mais que devia 😏 e olha que eu tenho assunto sério pra resolver', motivo: 'Assume o interesse', tom: 'flerte' },
    { texto: 'Bora marcar aquele programa? Eu escolho o lugar, você leva a conversa', motivo: 'Sai do digital com naturalidade', tom: 'flerte' },
    { texto: 'Hoje eu tô com uma vontade de você que não dá pra escrever aqui 😏', motivo: 'Só para ficha 18+ com o tom liberado', tom: 'provocante' },
  ],
  aniversario: [
    { texto: 'Hoje é seu aniversário, né? Parabéns! 🎉 me diz o que você tá fazendo pra comemorar', motivo: 'Data da ficha', tom: 'amizade' },
    { texto: 'Parabéns! Você merece um dia enorme. E eu ainda quero te dar um abraço', motivo: 'Carinho na data certa', tom: 'flerte' },
  ],
  interesse: [
    { texto: 'Como tá {gancho}? Lembrei de você falando disso', motivo: 'Gancho do dia a dia', tom: 'amizade' },
    { texto: 'Achei uma coisa sobre {interesse} que é a sua cara, quer que eu mande?', motivo: 'Assunto novo, sem repetir o de sempre', tom: 'amizade' },
    { texto: 'A gente nunca falou sobre {interesse}. Corre risco de descobrir que a gente combina', motivo: 'Abre assunto inédito', tom: 'flerte' },
  ],
  familia: [
    { texto: 'Oi! Como está {familiar}? Manda um abraço pra ela 😊', motivo: 'Pergunta por quem ela ama', tom: 'amizade' },
    { texto: 'Tudo bem por aí? Como tá a sua família toda?', motivo: 'Assunto de quem convive com a família dela', tom: 'amizade' },
    { texto: 'Lembrei de você hoje. E aí, como estão as coisas em casa?', motivo: 'Natural e sem cobrança', tom: 'amizade' },
  ],
  convite: [
    { texto: 'Bora tomar um café essa semana? Escolhe o dia', motivo: 'Convite sem rodeio', tom: 'flerte' },
    { texto: 'Programa amanhã à noite: eu, você e um lugar sem barulho. Topa?', motivo: 'Convite com plano claro', tom: 'flerte' },
    { texto: 'Tô afim de te ver. Não sei se é melhor café, jantar ou sair pra dançar — você decide', motivo: 'Convite com escolha', tom: 'flerte' },
  ],
};

/** Sugestões na voz do usuário para responder o que ela mandou. */
export const RESPOSTAS_SUGERIDAS: Record<string, Partial<Record<Familia, string[]>>> = {
  'ela-perguntou': {
    [A]: ['Tudo bem! Foi um dia corrido, mas produtivo. E o seu, como foi?', 'Boa! Tô resolvendo umas coisas aqui, mas te respondo com calma', 'Se eu te contasse tudo ia virar textão kkk resumo: deu certo'],
    [F]: ['Melhorou agora 😏 e você, tá fazendo o que de bom?', 'Meu dia tá bom, mas eu tô é pensando em te ver', 'Confesso que li sua mensagem duas vezes 😅 tava esperando'],
    [P]: ['Foi corrido, mas eu ainda tenho energia pra gastar 😏', 'Meu dia melhorou quando você escreveu. E agora?'],
  },
  'ela-contou': {
    [A]: ['Nossa, que dia! Você descansou depois?', 'Entendi, isso cansa mesmo. Precisa de alguma coisa?', 'Caramba, você levou tudo na boa. Admiro isso'],
    [F]: ['Queria estar aí pra melhorar teu dia 😊', 'Se eu tivesse aí, esse cansaço ia embora rápido 😏', 'Você merece um cuidado. Deixa eu ajudar'],
    [P]: ['Se eu tivesse aí, você não ia querer dormir cedo 😏', 'Vem cá que eu resolvo isso pra você 🔥'],
  },
  'ela-convidou': {
    [A]: ['Topo! Só me diz o horário que eu me organizo', 'Vamos sim, gosto de programa assim', 'Bora! Vou reservar um tempinho'],
    [F]: ['Eu tava esperando esse convite 😏 tô dentro', 'Aceito, mas a sobremesa é por sua conta', 'Com você eu topo até coisa que não gosto'],
    [P]: ['Só se for pra gente se ver de perto e conversar sem pressa 🔥'],
  },
  'ela-fechada': {
    [A]: ['Eu reparei que você tá diferente hoje. Aconteceu algo?', 'Se quiser espaço, eu entendo. Tô aqui quando você quiser falar', 'Não vou insistir, mas saiba que você pode contar comigo'],
    [F]: ['Vou te dar espaço, mas deixa registrado: faz falta 😅', 'Tá bem, eu espero. Quando você voltar, sem cobrança'],
    [P]: ['Respeito seu tempo. Quando quiser retomar, você sabe onde me achar'],
  },
  'ela-elogiou': {
    [A]: ['Obrigado 🙂 você também tem um jeito que agrada, viu', 'Fico feliz de ler isso, sério', 'Valeu! Você ganhou ponto comigo kkk'],
    [F]: ['Vindo de você, o elogio vale dobrado 😊', 'Agora você me deixou animado. Vou ter que retribuir', 'Você fala assim e eu já quero te ver'],
    [P]: ['Se você falar isso perto de mim, não respondo por nós dois 😏'],
  },
  'ela-saudade': {
    [A]: ['Também tô com saudade 🙂 bora marcar algo?', 'Saudade boa essa. Tô pensando em você também', 'Vem cá então, me conta tudo que eu quero ouvir'],
    [F]: ['Saudade também. E se a gente resolvesse isso hoje? 😏', 'Eu ia dizer que tô bem, mas minha cara tá dizendo outra coisa', 'Tô com saudade de te ver sorrindo do meu lado'],
    [P]: ['Saudade é pouco pro que eu tô sentindo 😏 vem matar isso'],
  },
  'ela-neutra': {
    [A]: ['Boa, entendi. Por falar nisso, você viu aquilo que eu te falei?', 'Tá certo. E me conta: novidade por aí?', 'Faz sentido. Vou pensar nisso e te falo depois'],
    [F]: ['Só entendi que preciso de mais tempo com você 😏', 'Combinado. Mas o próximo assunto sou eu quem escolho', 'Gostei. Continua falando que eu gosto de te ouvir'],
    [P]: ['Mudando pra outro assunto: você é sempre assim tão direto? 😏'],
  },
};

// ---------------------------------------------------------------------------
// Mensagens que chegam do nada.
// Gente de verdade manda mensagem lembrando de coisa que você nem fez: o papel
// que ficou na igreja, o recado que você não deu, o caderno esquecido. Aqui
// cada categoria tem os seus assuntos, e a ficha ainda usa o nome dos parentes.
// ---------------------------------------------------------------------------
export const DO_NADA_POR_CATEGORIA: Record<string, string[]> = {
  igreja: [
    'Ei, e o papel que você ia levar na igreja hoje? Esqueceu, né 😅',
    'Falaram de você na reunião hoje. Eu falei que você ia domingo, não me deixa mal',
    'Você esqueceu o seu caderno na capela, viu? Deixei guardado',
    'A irmã do Soc. Soc. perguntou se você vai no mutirão. Eu respondi por você 😬',
    'Você não foi no ensaio e a gente ficou sem a sua parte, viu',
  ],
  fsy: [
    'Ei, você esqueceu de me mandar aquela foto do FSY! Eu quero ela',
    'O povo do FSY tá marcando encontro e eu falei que você ia. Você vai, né?',
    'Deixei a sua camiseta do FSY com a líder, passa lá pra pegar',
    'Você saiu sem falar comigo no último dia do FSY, hein 😤',
  ],
  trabalho: [
    'Você mandou aquele arquivo? Ainda não chegou aqui 😅',
    'Falaram de você na reunião hoje, viu? Melhor você se explicar kkk',
    'Você deixou a sua caneca na minha mesa de novo 😅',
    'O café acabou e você foi o culpado do dia, sabia?',
  ],
  escola: [
    'Você não me passou aquele trabalho e a professora cobrou 💀',
    'Deixei sua apostila na sala, ó se você vai pegar',
    'Você faltou hoje? Eu tive que responder por você na chamada kkk',
    'Guardei seu lugar, mas você não apareceu 😒',
  ],
  academia: [
    'Você faltou hoje, né? Eu vi kkk',
    'Deixei a sua garrafa na recepção, passa lá',
    'Amanhã eu te espero no treino, sem desculpa',
  ],
  comunidade: [
    'Ei, você deixou a chave do portão comigo, lembra?',
    'Passei na sua rua hoje e não te vi. Tá fugindo de mim? kkk',
    'O pessoal daqui perguntou de você no fim de semana',
    'Você esqueceu o bolo da festa, viu? O povo reparou kkk',
  ],
  conhecida: [
    'Ei, você sumiu. Tá tudo bem mesmo?',
    'Achei uma coisa sua aqui em casa, precisa pegar',
    'Lembrei de você hoje do nada. Não sei por quê',
    'Aquele assunto que a gente combinou você não me contou o resto',
  ],
  padrao: [
    'Ei, e aquilo que você ia me mandar? Ainda tô esperando 😅',
    'Você lembrou daquilo que eu te pedi? Não, né? kkk',
    'Passei pra ver se você tá vivo 😄',
    'Hoje eu acordei lembrando de você, do nada',
    'Tem uma coisa que você precisa resolver, viu? Fica de olho',
  ],
};

/** Recado de quem cuida: quando ela te vê como criança ou como tia. */
export const DO_NADA_CUIDADO: string[] = [
  'Você já almoçou direito hoje? Não me responde mentira',
    'Sua mãe me disse que você anda dormindo tarde 👀 resolve isso',
  'Oi, tudo bem por aí? Passando pra saber se você tá comendo',
  'Você foi na igreja domingo? Eu olhei e não te vi',
  'Vou passar aí amanhã, quero ver se você tá bem',
];

/** Recado que usa um parente dela de verdade, tirado dos vínculos da ficha. */
export const DO_NADA_FAMILIA: string[] = [
  '{familiar} perguntou de você hoje 😳 o que eu respondo?',
  'Tive um dia com {familiar} e lembrei de você no meio da bagunça',
  '{familiar} viu você passando e quis saber quem é você kkk',
  'Estou com {familiar} aqui, ele/ela manda um abraço',
];

/** Reação de elogio: agradecer sem parecer que o elogio foi para outra pessoa. */
export const RECEPCOES_ELOGIO: string[] = [
  'Obrigada, viu', 'Que bom ouvir isso', 'Você me deixou sem graça', 'Isso é bom de ouvir, sério',
  'Fico contente que você pense assim', 'Valeu, de verdade', 'Olha, obrigada. Eu não esperava',
  'Que carinho, obrigada',
];

/** Reação de pergunta: ela mostra que entendeu o pedido antes de responder. */
export const RECEPCOES_QUESTAO: string[] = [
  'Boa pergunta', 'Deixa eu pensar', 'Hmm, deixa eu ver', 'Olha, vou te responder direito',
  'Pergunta boa essa', 'Vou pensar com você', 'Entendi a pergunta', 'Essa eu vou responder com calma',
];
