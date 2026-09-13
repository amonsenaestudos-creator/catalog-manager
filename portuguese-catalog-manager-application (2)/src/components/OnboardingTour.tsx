import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useCatalog } from '../context';
import { Button, IconButton } from './ui';

interface TourStep {
  target?: string;
  title: string;
  body: string;
  page?: string;
}

const STEPS: TourStep[] = [
  { title: 'Bem-vindo ao seu catálogo ✨', body: 'Seu espaço para guardar detalhes, histórias e conexões. Vou mostrar o essencial em 4 passos rápidos.' },
  { target: '[data-tour="add"]', title: 'Adicione pessoas', body: 'Use o botão "+ Adicionar" para criar uma nova ficha, ou o botão central da barra inferior para o cadastro rápido.', page: 'add' },
  { target: '[data-tour="catalog"]', title: 'Explore o catálogo', body: 'Aqui ficam todas as fichas. Use busca, filtros e abas para encontrar pessoas favoritas, arquivos e mais.' },
  { target: '[data-tour="discover"]', title: 'Descubra e brinque', body: 'Na aba Descobrir você tem swipe, duelos, roleta e muito mais para se divertir com o catálogo.' },
  { target: '[data-tour="quick"]', title: 'Tudo a um atalho', body: 'Aperte Q para abrir as ações rápidas, Ctrl+K para buscar qualquer coisa, e não se esqueça do botão "Conversar" em cada ficha! 💬' },
];

export default function OnboardingTour() {
  const ctx = useCatalog();
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const show = !ctx.data.onboardingDone && ctx.authenticated && ctx.ready && !ctx.demo;

  useEffect(() => {
    if (!show) return;
    const current = STEPS[step];
    if (current.page) ctx.navigate(current.page);
    const update = () => {
      if (current.target) {
        const el = document.querySelector<HTMLElement>(current.target);
        if (el) {
          const r = el.getBoundingClientRect();
          setPos({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 });
          return;
        }
      }
      setPos(null);
    };
    update();
    const timer = setTimeout(update, 400);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { clearTimeout(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [step, show]);

  if (!show) return null;

  const close = () => {
    ctx.commit(d => ({ ...d, onboardingDone: true }), undefined, false);
  };
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };
  const skip = () => close();

  const tooltipStyle = pos
    ? { top: Math.min(window.innerHeight - 200, pos.top + pos.height + 12), left: Math.max(16, Math.min(window.innerWidth - 340, pos.left)) }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return createPortal(
    <>
      <div className="tour-backdrop" onClick={skip} />
      {pos && <div className="tour-spotlight" style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height }} />}
      <AnimatePresence>
        <motion.div
          key={step}
          className="tour-tooltip"
          style={tooltipStyle}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <IconButton label="Fechar tour" onClick={skip} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24 }}>
            <X size={14} />
          </IconButton>
          <h3><Sparkles size={16} />{STEPS[step].title}</h3>
          <p>{STEPS[step].body}</p>
          <footer>
            <span className="tour-dots">
              {STEPS.map((_, i) => <span key={i} className={i === step ? 'active' : ''} />)}
            </span>
            <Button variant="ghost" onClick={skip}>Pular</Button>
            <Button variant="primary" onClick={next}>{step === STEPS.length - 1 ? 'Vamos lá!' : 'Próximo'}</Button>
          </footer>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
