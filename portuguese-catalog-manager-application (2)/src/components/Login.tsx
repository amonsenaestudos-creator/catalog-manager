import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Heart, LockKeyhole, Play, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCatalog } from '../context';
import { ARCHIVE_SCENE } from '../assets';
import { Button, Field } from './ui';

export default function Login() {
  const { login, enterDemo } = useCatalog();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  return <div className="login-page">
    <img src={ARCHIVE_SCENE} alt="Pastas lilás e um caderno em uma mesa, iluminados pela luz da tarde" className="login-background" />
    <div className="login-shade" />
    <div className="login-top"><div className="brand"><span className="brand-symbol"><Heart size={22} fill="currentColor" strokeWidth={0} /></span><span>catalog.</span></div><span><ShieldCheck size={15} />Seu espaço. Só seu.</span></div>
    <main className="login-composition">
      <motion.div className="login-story" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="eyebrow">Pessoas. Memórias. Conexões.</p><h1>Catalog<span>.</span></h1>
        <h2>As boas histórias<br />merecem um lugar.</h2>
        <p>Guarde os detalhes, organize suas conexões<br />e redescubra o que torna cada pessoa especial.</p>
        <span className="login-local"><LockKeyhole size={16} />Seus dados ficam neste dispositivo.</span>
      </motion.div>
      <motion.div className="login-form-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
        <div className="login-form-heading"><span className="small-symbol"><Heart size={20} /></span><h2>Seu mundo começa aqui.</h2><p>Entre para continuar seu catálogo pessoal.</p></div>
        <form onSubmit={e => { e.preventDefault(); if (!login(username, password, remember)) setError('Usuário ou senha incorretos. Tente novamente.'); }}>
          <Field label="Usuário"><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu usuário" autoComplete="username" required /></Field>
          <Field label="Senha"><span className="password-field"><input type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></Field>
          <label className="check-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Lembrar de mim neste dispositivo</label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button variant="primary" type="submit" className="login-submit">Entrar no meu catálogo<ArrowRight size={17} /></Button>
        </form>
        <p className="login-default">Primeiro acesso? Usuário <b>admin</b> e senha <b>admin</b>.</p>
        <div className="login-demo"><button onClick={enterDemo}><Play size={15} />Explorar demonstração<ArrowRight size={14} /></button><span>Experimente com fichas fictícias, sem alterar seus dados.</span></div>
      </motion.div>
    </main>
    <footer className="login-footer"><span>Organize conexões. Preserve histórias.</span><span>Local, pessoal e feito para você.</span></footer>
  </div>;
}