import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, LockKeyhole } from 'lucide-react';
import { useCatalog } from '../../context';
import { Button } from '../../components/ui';

export default function PrivacyScreen() {
  const ctx = useCatalog();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const unlock = () => {
    if (ctx.data.settings.pinEnabled && pin !== ctx.data.settings.pin) {
      setError('PIN incorreto. Tente novamente.');
      return;
    }
    ctx.setPrivacy(false);
    ctx.setPanic(false);
    setPin('');
  };
  return <div className="privacy-screen" role="dialog" aria-modal="true" aria-label="Modo privacidade">
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      <span className="privacy-lock"><LockKeyhole size={36} strokeWidth={1.4} /></span>
      <p className="eyebrow">Seu espaço continua só seu</p>
      <h1>Um momento de privacidade.</h1>
      <p>Seu catálogo está oculto.<br />Suas alterações continuam protegidas neste dispositivo.</p>
      <form onSubmit={event => { event.preventDefault(); unlock(); }}>
        {ctx.data.settings.pinEnabled && <input id="privacy-pin" type="password" inputMode="numeric" autoFocus maxLength={8} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} placeholder="Digite seu PIN" aria-label="PIN de privacidade" />}
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" variant="primary"><Eye size={17} />Voltar ao meu catálogo</Button>
      </form>
      <small>{ctx.data.settings.pinEnabled ? 'Use o PIN configurado em Ajustes.' : 'Atalho: Ctrl + Shift + P'}</small>
    </motion.div>
  </div>;
}
