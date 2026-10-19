/**
 * Redes sociais na ficha: importar um perfil público, revisar o que veio e
 * escolher o que entra.
 *
 * A importação nunca aplica nada sozinha. A pessoa cola o link, vê o retrato,
 * o nome, a bio e os seguidores que o Catalog conseguiu ler — e marca o que
 * quer levar para a ficha. Quando a rede bloqueia a leitura, o link ainda pode
 * ser guardado para preencher à mão depois.
 */
import { useState } from 'react';
import { AlertCircle, Check, ExternalLink, Link2, Loader2, RefreshCw, Search, Sparkles, Trash2, UserRound } from 'lucide-react';
import type { Person, PerfilSocial, RedeSocial } from '../types';
import { useCatalog } from '../context';
import { generateId, normalizePhotos } from '../store';
import { REDES, buscarPerfilSocial, incorporarImagem, lerEndereco, perfilParaFicha, rotuloDaRede } from '../lib/redes';
import type { PerfilEncontrado } from '../lib/redes';
import { Button, CheckBox, IconButton, Modal } from './ui';

const SIGLAS: Record<RedeSocial, string> = {
  instagram: 'IG', tiktok: 'TT', x: 'X', github: 'GH', facebook: 'FB', youtube: 'YT',
  threads: 'TH', linkedin: 'IN', twitch: 'TW', pinterest: 'PT', kwai: 'KW', outro: '↗',
};

const numeroCurto = (valor: number) => valor >= 1_000_000
  ? `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  : valor >= 1_000
    ? `${(valor / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
    : valor.toLocaleString('pt-BR');

/** Link para o perfil, com o nome e o @ quando existirem. */
export function PerfisSociaisDaFicha({ person }: { person: Person }) {
  const perfis = person.perfisSociais || [];
  if (!perfis.length) return null;
  return <div className="redes-perfis-ficha">
    {perfis.map(perfil => <a key={perfil.id} className="rede-perfil-chip" href={perfil.url} target="_blank" rel="noreferrer noopener" title={perfil.bio || `Abrir ${rotuloDaRede(perfil.rede)}`}>
      <span className={`rede-sigla rede-${perfil.rede}`}>{SIGLAS[perfil.rede] || '↗'}</span>
      <span><strong>{perfil.nome || perfil.usuario || rotuloDaRede(perfil.rede)}</strong><small>@{perfil.usuario || rotuloDaRede(perfil.rede)}{perfil.seguidores != null ? ` · ${numeroCurto(perfil.seguidores)} seguidores` : ''}</small></span>
      <ExternalLink size={12} />
    </a>)}
  </div>;
}

export default function RedesSociais({ person, update, compact = false }: {
  person: Person;
  update: (p: Person | ((p: Person) => Person)) => void;
  compact?: boolean;
}) {
  const ctx = useCatalog();
  const [aberto, setAberto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [rede, setRede] = useState<RedeSocial | 'auto'>('auto');
  const [buscando, setBuscando] = useState(false);
  const [perfil, setPerfil] = useState<PerfilEncontrado | null>(null);
  const [erro, setErro] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [usarNome, setUsarNome] = useState(true);
  const [usarBio, setUsarBio] = useState(true);
  const [usarLocal, setUsarLocal] = useState(true);
  const [fotosEscolhidas, setFotosEscolhidas] = useState<string[]>([]);

  const perfis = person.perfisSociais || [];

  const abrir = () => {
    setErro('');
    setPerfil(null);
    setEntrada(person.redesSociais && /^https?:\/\//i.test(person.redesSociais.trim()) ? person.redesSociais.trim() : '');
    setRede('auto');
    setAberto(true);
  };

  const buscar = async () => {
    if (buscando) return;
    setBuscando(true);
    setErro('');
    setPerfil(null);
    try {
      const achado = await buscarPerfilSocial(entrada, { rede });
      setPerfil(achado);
      setUsarNome(!person.nome.trim());
      setUsarBio(!person.descricao.trim());
      setUsarLocal(!person.localizacaoMora.trim() && !!achado.localizacao);
      setFotosEscolhidas(achado.fotos.slice(0, 3));
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setBuscando(false);
    }
  };

  const alternarFoto = (url: string) => setFotosEscolhidas(lista => lista.includes(url) ? lista.filter(item => item !== url) : [...lista, url]);

  const guardarLinkSomente = () => {
    try {
      const endereco = lerEndereco(entrada, rede);
      const agora = new Date().toISOString();
      const novo: PerfilSocial = {
        id: generateId(), rede: endereco.rede, url: endereco.url, usuario: endereco.usuario,
        nome: person.nome || undefined, importadoEm: agora, fonte: 'cadastrado à mão',
      };
      update(p => ({
        ...p,
        perfisSociais: [...(p.perfisSociais || []).filter(item => !(item.rede === novo.rede && item.usuario === novo.usuario)), novo],
        redesSociais: p.redesSociais.includes(endereco.url) ? p.redesSociais : [p.redesSociais.trim(), endereco.url].filter(Boolean).join(' · ').slice(0, 500),
      }));
      ctx.notify(`Perfil do ${rotuloDaRede(endereco.rede)} guardado. Os dados podem ser completados à mão.`);
      setAberto(false);
    } catch (falha) {
      setErro((falha as Error).message);
    }
  };

  const aplicar = async () => {
    if (!perfil || aplicando) return;
    setAplicando(true);
    try {
      // As imagens escolhidas tentam virar arquivo local. O que não liberar
      // CORS continua como link público — e o aviso na tela diz isso.
      const agora = new Date().toISOString();
      const novas: Person['fotos'] = [];
      for (const url of fotosEscolhidas) {
        if (person.fotos.some(foto => foto.url === url)) continue;
        const guardada = await incorporarImagem(url);
        novas.push({
          id: generateId(), url: guardada, type: 'normal', personId: person.id, isMain: false,
          name: `${rotuloDaRede(perfil.rede)} de ${perfil.nome || perfil.usuario || person.nome || 'perfil'}`,
          createdAt: agora,
        });
      }
      const existente = perfis.find(item => item.rede === perfil.rede && item.usuario === perfil.usuario);
      const novo = perfilParaFicha(perfil, existente?.id || generateId(), fotosEscolhidas[0] || perfil.avatar);
      update(p => {
        const fotos = normalizePhotos([...p.fotos, ...novas.filter(foto => !p.fotos.some(existenteFoto => existenteFoto.url === foto.url))], p.id);
        return {
          ...p,
          nome: usarNome && perfil.nome ? perfil.nome : p.nome,
          descricao: usarBio && perfil.bio ? (p.descricao.trim() ? `${p.descricao.trim()}\n\n${perfil.bio}` : perfil.bio) : p.descricao,
          localizacaoMora: usarLocal && perfil.localizacao ? perfil.localizacao : p.localizacaoMora,
          redesSociais: p.redesSociais.includes(perfil.url) ? p.redesSociais : [p.redesSociais.trim(), perfil.url].filter(Boolean).join(' · ').slice(0, 500),
          perfisSociais: [...(p.perfisSociais || []).filter(item => !(item.rede === novo.rede && item.usuario === novo.usuario)), novo],
          fotos,
        };
      });
      ctx.sound('success');
      ctx.notify(`${rotuloDaRede(perfil.rede)} importado${novas.length ? ` com ${novas.length} foto(s)` : ''}. Revise a ficha e salve.`);
      setAberto(false);
    } catch (falha) {
      ctx.notify((falha as Error).message, true);
    } finally {
      setAplicando(false);
    }
  };

  const remover = (id: string) => update(p => ({ ...p, perfisSociais: (p.perfisSociais || []).filter(item => item.id !== id) }));

  return <>
    <div className={`redes-importar ${compact ? 'compacto' : ''}`}>
      <Button onClick={abrir}><Sparkles size={15} />Importar perfil social</Button>
      {!compact && <span className="form-help">Cole o link e o Catalog lê o que é público: nome, bio, retrato e algumas fotos. Nada de senha.</span>}
    </div>
    {!!perfis.length && <div className="redes-perfis-lista">
      {perfis.map(item => <div className="rede-perfil-linha" key={item.id}>
        <span className={`rede-sigla rede-${item.rede}`}>{SIGLAS[item.rede] || '↗'}</span>
        <div>
          <a href={item.url} target="_blank" rel="noreferrer noopener"><strong>{item.nome || item.usuario}</strong><small>@{item.usuario} · {rotuloDaRede(item.rede)}{item.seguidores != null ? ` · ${numeroCurto(item.seguidores)} seguidores` : ''}</small></a>
          {!compact && item.bio && <p>{item.bio}</p>}
        </div>
        <IconButton label={`Remover perfil do ${rotuloDaRede(item.rede)}`} onClick={() => remover(item.id)}><Trash2 size={14} /></IconButton>
      </div>)}
    </div>}

    {aberto && <Modal
      title="Importar perfil social"
      description="O Catalog consulta só o que qualquer visitante veria. Escolha o que entra na ficha."
      onClose={() => setAberto(false)}
      wide
      className="rede-import-modal"
      footer={<>
        <Button onClick={() => setAberto(false)}>Cancelar</Button>
        <Button variant="primary" onClick={() => void aplicar()} disabled={!perfil || aplicando}>
          {aplicando ? <><Loader2 size={15} className="spin" />Preparando fotos…</> : <><Check size={15} />Aplicar à ficha</>}
        </Button>
      </>}>
      <div className="rede-busca">
        <div className="rede-chips" role="group" aria-label="Rede social">
          <button type="button" className={rede === 'auto' ? 'active' : ''} onClick={() => setRede('auto')}>Automático</button>
          {REDES.filter(item => item.id !== 'outro').map(item => <button type="button" key={item.id} className={rede === item.id ? 'active' : ''} onClick={() => setRede(item.id)}><span className={`rede-sigla rede-${item.id}`}>{SIGLAS[item.id]}</span>{item.nome}</button>)}
        </div>
        <div className="rede-campo">
          <div className="search-field">
            <Search size={16} />
            <input value={entrada} onChange={evento => { setEntrada(evento.target.value); setErro(''); }} placeholder="https://instagram.com/usuario ou @usuario" aria-label="Link ou usuário do perfil" autoComplete="off"
              onKeyDown={evento => { if (evento.key === 'Enter') { evento.preventDefault(); evento.stopPropagation(); void buscar(); } }} />
          </div>
          <Button variant="primary" onClick={() => void buscar()} disabled={buscando || !entrada.trim()}>
            {buscando ? <><Loader2 size={15} className="spin" />Lendo perfil…</> : <><RefreshCw size={15} />Buscar perfil</>}
          </Button>
        </div>
        <p className="form-help">A busca sai só com este endereço público. Instagram, TikTok e X costumam liberar só o cartão do link; o GitHub entrega nome, bio, local e retrato direto da API pública.</p>
      </div>

      {!!erro && <div className="inline-notice warning rede-erro"><AlertCircle size={17} /><div><strong>Não deu para ler agora.</strong><p>{erro}</p><div className="rede-erro-acoes"><Button onClick={() => void buscar()} disabled={buscando}><RefreshCw size={14} />Tentar de novo</Button><Button variant="ghost" onClick={guardarLinkSomente}><Link2 size={14} />Guardar só o link</Button></div></div></div>}

      {perfil && <div className="rede-resultado">
        <div className="rede-cabecalho">
          {perfil.avatar ? <img src={perfil.avatar} alt="" className="rede-retrato" /> : <span className="rede-retrato vazio"><UserRound size={26} /></span>}
          <div className="rede-quem">
            <span className={`rede-sigla rede-${perfil.rede}`}>{SIGLAS[perfil.rede]}</span>
            <h3>{perfil.nome || perfil.usuario}</h3>
            <p>@{perfil.usuario} · {rotuloDaRede(perfil.rede)}{perfil.seguidores != null ? ` · ${numeroCurto(perfil.seguidores)} seguidores` : ''}{perfil.verificado ? ' · verificado' : ''}</p>
            <small>Lido de {perfil.fonte}. <a href={perfil.url} target="_blank" rel="noreferrer noopener">Abrir perfil <ExternalLink size={11} /></a></small>
          </div>
        </div>
        {perfil.bio && <p className="rede-bio">“{perfil.bio}”</p>}
        {(perfil.localizacao || perfil.site) && <p className="rede-extra">
          {perfil.localizacao && <span><strong>Onde</strong>{perfil.localizacao}</span>}
          {perfil.site && <span><strong>Site</strong><a href={perfil.site} target="_blank" rel="noreferrer noopener">{perfil.site.replace(/^https?:\/\//, '').slice(0, 50)}</a></span>}
        </p>}
        <div className="redes-opcoes">
          <CheckBox label={`Usar o nome “${perfil.nome || perfil.usuario}”`} checked={usarNome} onChange={() => setUsarNome(!usarNome)} disabled={!perfil.nome} />
          <CheckBox label="Usar a bio como descrição" checked={usarBio} onChange={() => setUsarBio(!usarBio)} disabled={!perfil.bio} />
          <CheckBox label={`Usar a localização “${perfil.localizacao}”`} checked={usarLocal} onChange={() => setUsarLocal(!usarLocal)} disabled={!perfil.localizacao} />
        </div>
        {!!perfil.fotos.length && <div className="rede-fotos-escolha">
          <div className="rede-fotos-topo"><strong>Imagens encontradas</strong><small>{fotosEscolhidas.length} selecionada(s) — entram na galeria da ficha</small></div>
          <div className="rede-fotos-grade">
            {perfil.fotos.map((url, indice) => {
              const marcada = fotosEscolhidas.includes(url);
              return <button type="button" key={`${url}-${indice}`} className={`rede-foto ${marcada ? 'marcada' : ''}`} onClick={() => alternarFoto(url)} aria-pressed={marcada} aria-label={`${marcada ? 'Não usar' : 'Usar'} a imagem ${indice + 1}`}>
                <img src={url} alt="" loading="lazy" />
                <span className="rede-foto-marca">{marcada ? <Check size={14} /> : null}</span>
                {indice === 0 && <span className="rede-foto-rotulo">Retrato</span>}
              </button>;
            })}
          </div>
          <p className="form-help">A imagem tenta ser guardada dentro do aparelho. Se a rede não permitir o download, ela fica como link público e pode exigir internet para aparecer.</p>
        </div>}
      </div>}
    </Modal>}
  </>;
}
