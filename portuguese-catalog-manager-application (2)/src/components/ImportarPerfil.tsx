import { useState } from 'react';
import { Check, ChevronDown, ExternalLink, FileText, Search, Share2 } from 'lucide-react';
import type { Person, RedeSocialId } from '../types';
import { useCatalog } from '../context';
import { generateId, medirImagem, normalizePhotos } from '../store';
import {
  analisarEntradaSocial, baixarFotoRemota, buscarPerfilPublico, candidatosDeAvatar,
  extrairPerfilDeTexto, mesclarPerfis, montarPerfilSocial, REDES_PARA_ESCOLHER,
  rotuloDaRede, resumoDasRedes,
} from '../lib/redes';
import type { AnaliseSocial, ResultadoBuscaPerfil } from '../lib/redes';
import { Button, CheckBox, Field } from './ui';

/**
 * "Adicionar pela rede social", dentro do cadastro.
 *
 * Você cola o link do perfil (ou só o @, ou o WhatsApp); o painel reconhece
 * a rede na hora e, ao tocar em Buscar, tenta trazer nome, bio e foto de
 * perfil públicos. O que voltar aparece para conferir — nome e bio
 * editáveis, fotos candidatas à escolha — e só entra na ficha no "Aplicar".
 * Quando a rede bloqueia a leitura (o normal no Instagram e no TikTok), o
 * aviso diz isso sem rodeio e o caminho continua: nome sugerido pelo @,
 * campo para colar o texto do perfil e as fotos do sistema na aba Fotos.
 */
export default function ImportarPerfil({ person, update, abertoInicial = false }: {
  person: Person;
  update: (p: Person | ((p: Person) => Person)) => void;
  abertoInicial?: boolean;
}) {
  const { notify, sound } = useCatalog();
  const [aberto, setAberto] = useState(abertoInicial);
  const [redePreferida, setRedePreferida] = useState<RedeSocialId>('instagram');
  const [entrada, setEntrada] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoBuscaPerfil | null>(null);
  const [extras, setExtras] = useState<AnaliseSocial[]>([]);
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [candidatas, setCandidatas] = useState<string[]>([]);
  const [fotoEscolhida, setFotoEscolhida] = useState('');
  const [usarNome, setUsarNome] = useState(true);
  const [usarBio, setUsarBio] = useState(true);
  const [usarFoto, setUsarFoto] = useState(true);
  const [textoColado, setTextoColado] = useState('');
  const [aplicadoEm, setAplicadoEm] = useState('');

  const analise = analisarEntradaSocial(entrada, redePreferida);

  const receberResultado = (novo: ResultadoBuscaPerfil) => {
    setResultado(novo);
    setNome(novo.nome);
    setBio(novo.descricao);
    setCandidatas(novo.fotosCandidatas);
    setFotoEscolhida(novo.fotosCandidatas[0] || '');
    setUsarNome(!person.nome.trim() && !!novo.nome);
    setUsarBio(!!novo.descricao);
    setUsarFoto(true);
    setAplicadoEm('');
  };

  const buscar = async () => {
    if (!analise) { notify('Cole um link de perfil, um @usuário ou um número de WhatsApp para eu reconhecer.', true); return; }
    setBuscando(true);
    try {
      receberResultado(await buscarPerfilPublico(analise));
      setExtras([]);
    } finally { setBuscando(false); }
  };

  const lerTextoColado = () => {
    const lido = extrairPerfilDeTexto(textoColado, redePreferida);
    const [principal, ...demais] = lido.analises;
    const base = principal || analise;
    if (!base && !lido.nome && !lido.descricao) { notify('Não encontrei nome, @ nem link nesse texto. Copie o topo do perfil (nome, @ e bio) e cole de novo.', true); return; }
    const analiseBase: AnaliseSocial = base || { rede: redePreferida, usuario: '', url: '', nomeSugerido: '' };
    receberResultado({
      analise: analiseBase,
      nome: lido.nome || analiseBase.nomeSugerido,
      descricao: lido.descricao,
      fotosCandidatas: candidatosDeAvatar(analiseBase),
      fonte: 'link',
    });
    setExtras(demais);
    notify('Texto lido. Confira o nome e a bio antes de aplicar.');
  };

  const retirarCandidata = (url: string) => {
    setCandidatas(lista => lista.filter(item => item !== url));
    setFotoEscolhida(atual => (atual === url ? '' : atual));
  };

  const aplicar = async () => {
    if (!resultado) return;
    setAplicando(true);
    try {
      const fotoRemota = usarFoto && fotoEscolhida ? fotoEscolhida : '';
      const fotoFinal = fotoRemota ? await baixarFotoRemota(fotoRemota) : '';
      const medidas = fotoFinal ? await medirImagem(fotoFinal) : { width: 0, height: 0 };
      const nomeLimpo = nome.trim();
      const bioLimpa = bio.trim();
      update(p => {
        const novos = [
          montarPerfilSocial(resultado.analise, { nomeExibicao: nomeLimpo, fotoUrl: fotoFinal || fotoRemota }),
          ...extras.map(outra => montarPerfilSocial(outra, {})),
        ].filter(perfil => perfil.usuario || perfil.url);
        const perfisSociais = mesclarPerfis(p.perfisSociais || [], novos);
        const resumoNovos = resumoDasRedes(novos);
        const redesSociais = !resumoNovos ? p.redesSociais
          : !p.redesSociais.trim() ? resumoDasRedes(perfisSociais)
          : p.redesSociais.includes(resultado.analise.usuario) && resultado.analise.usuario ? p.redesSociais
          : `${p.redesSociais} · ${resumoNovos}`;
        const fotos = fotoFinal
          ? normalizePhotos([...p.fotos, {
              id: generateId(), url: fotoFinal, name: `Foto de perfil — ${rotuloDaRede(resultado.analise.rede)}`,
              personId: p.id, isMain: false, type: 'normal' as const, createdAt: new Date().toISOString(),
              width: medidas.width || undefined, height: medidas.height || undefined,
            }], p.id)
          : p.fotos;
        return {
          ...p,
          nome: usarNome && nomeLimpo ? nomeLimpo : p.nome,
          descricao: usarBio && bioLimpa
            ? (p.descricao.trim() ? (p.descricao.includes(bioLimpa) ? p.descricao : `${p.descricao.trim()}\n\n${bioLimpa}`) : bioLimpa)
            : p.descricao,
          perfisSociais, redesSociais, fotos,
        };
      });
      setAplicadoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      notify(`Perfil de ${rotuloDaRede(resultado.analise.rede)} aplicado na ficha. Confira os campos e salve.`);
      if (fotoFinal) sound('shutter');
    } catch (error) {
      notify((error as Error).message, true);
    } finally { setAplicando(false); }
  };

  return <section className={`importar-perfil ${aberto ? 'Aberto' : ''}`} aria-label="Adicionar pela rede social">
    <button type="button" className="importar-cabecalho" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
      <span className="importar-icone"><Share2 size={18} /></span>
      <span className="importar-titulos">
        <strong>Adicionar pela rede social</strong>
        <small>Cole o link ou o @ dela: o Catalog reconhece a rede, sugere o nome e tenta trazer bio e foto de perfil públicas.</small>
      </span>
      <ChevronDown size={17} className={aberto ? 'girado' : ''} />
    </button>
    {aberto && <div className="importar-corpo">
      <div className="rede-chips" role="group" aria-label="Rede do perfil quando você digita só o usuário">
        {REDES_PARA_ESCOLHER.map(rede => <button key={rede} type="button" className={redePreferida === rede ? 'active' : ''} aria-pressed={redePreferida === rede} onClick={() => setRedePreferida(rede)}>{rotuloDaRede(rede)}</button>)}
      </div>
      <div className="importar-busca">
        <input value={entrada} onChange={e => setEntrada(e.target.value)} aria-label="Link do perfil, @usuário ou WhatsApp" placeholder="instagram.com/ana.souza · @ana.souza · (71) 99999-8888" autoComplete="off" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }} />
        <Button variant="primary" onClick={() => void buscar()} disabled={buscando || !entrada.trim()}><Search size={16} />{buscando ? 'Buscando...' : 'Buscar perfil'}</Button>
      </div>
      {entrada.trim() && (analise
        ? <p className="importar-reconhecido"><Check size={14} />Reconheci: <strong>{rotuloDaRede(analise.rede)}</strong>{analise.usuario && <> · <strong>@{analise.usuario}</strong></>}{analise.nomeSugerido && <> · nome provável <strong>{analise.nomeSugerido}</strong></>}{analise.url && <a href={analise.url} target="_blank" rel="noreferrer noopener">abrir perfil<ExternalLink size={12} /></a>}{analise.ehPublicacao && <span className="importar-alerta">Este link parece ser de uma publicação, não do perfil — vale colar o link do perfil para o nome e a foto virem certos.</span>}</p>
        : <p className="importar-reconhecido importar-alerta">Ainda não reconheci isso como link, @ ou telefone. Confira o que colou ou escolha a rede nos botões acima.</p>)}
      <p className="form-help">A busca só acontece quando você toca em <strong>Buscar perfil</strong>, direto do seu navegador para a rede — nada passa por servidor do Catalog, como no resto do aplicativo.</p>

      {resultado && <div className="importar-resultado">
        {resultado.aviso && <p className="importar-aviso">{resultado.aviso}</p>}
        {resultado.fonte === 'pagina' && <p className="importar-aviso ok">A rede deixou ler o perfil público: nome, bio e foto abaixo vieram de lá. Confira antes de aplicar — é você quem manda na ficha.</p>}
        {candidatas.length > 0 && <div className="importar-fotos" role="group" aria-label="Fotos candidatas do perfil">
          {candidatas.map(url => <button key={url} type="button" className={fotoEscolhida === url ? 'selected' : ''} aria-pressed={fotoEscolhida === url} aria-label="Usar esta foto de perfil" onClick={() => { setFotoEscolhida(url); setUsarFoto(true); }}>
            <img src={url} alt="Foto de perfil encontrada" loading="lazy" onError={() => retirarCandidata(url)} />
            {fotoEscolhida === url && <span><Check size={13} /></span>}
          </button>)}
        </div>}
        <div className="form-grid">
          <Field label="Nome encontrado"><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome de exibição do perfil" maxLength={100} /></Field>
          <Field label="Bio / descrição pública" className="span-2"><textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Se a rede não deixou ler, cole a bio aqui — ou deixe para depois." /></Field>
        </div>
        <div className="importar-opcoes">
          <CheckBox label={person.nome.trim() ? 'Usar este nome (troca o atual)' : 'Usar este nome'} checked={usarNome} onChange={() => setUsarNome(!usarNome)} />
          <CheckBox label="Usar a bio como descrição" checked={usarBio} onChange={() => setUsarBio(!usarBio)} />
          <span className={!fotoEscolhida ? 'desligado' : ''}><CheckBox label="Adicionar a foto de perfil" checked={usarFoto && !!fotoEscolhida} onChange={() => setUsarFoto(!usarFoto)} disabled={!fotoEscolhida} /></span>
        </div>
        {extras.length > 0 && <p className="form-help">Também encontrei no texto: {extras.map(outra => `${rotuloDaRede(outra.rede)} @${outra.usuario}`).join(' · ')} — entram junto como perfis da ficha.</p>}
        <div className="importar-acoes">
          <Button variant="primary" onClick={() => void aplicar()} disabled={aplicando}><Check size={16} />{aplicando ? 'Aplicando...' : 'Aplicar na ficha'}</Button>
          {aplicadoEm && <span className="muted small">Aplicado às {aplicadoEm}. Agora é só salvar a ficha.</span>}
        </div>
      </div>}

      <details className="importar-colar">
        <summary><FileText size={15} />A rede bloqueou? Cole o texto do perfil</summary>
        <p className="form-help">Abra o perfil no aplicativo da rede, copie o topo (nome, @, bio e links) e cole aqui. O Catalog separa nome, perfis e bio das contagens de seguidores.</p>
        <textarea rows={4} value={textoColado} onChange={e => setTextoColado(e.target.value)} aria-label="Texto do perfil copiado da rede social" placeholder={'Ana Souza\n@ana.souza\nFotógrafa em Salvador ✿\ninstagram.com/ana.souza'} />
        <Button onClick={lerTextoColado} disabled={!textoColado.trim()}><FileText size={15} />Ler texto colado</Button>
      </details>
    </div>}
  </section>;
}
