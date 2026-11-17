import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { modeRules } from '../data/mode-rules';
import type { GameMode } from '../data/mode-rules';

export default function ModeRules({ mode, initiallyOpen = false }: { mode: GameMode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const rules = modeRules[mode];
  const bodyId = `${mode}-rules-body`;

  return <section className="mode-rules" aria-label={`Reglas de ${rules.label}`}>
    <button type="button" className="mode-rules-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
      <span><small>GUÍA DE JUEGO · {rules.label}</small><strong>{open ? rules.title : '¿Cómo se juega?'}</strong></span>
      <span className="mode-rules-action">{open ? 'Ocultar' : 'Ver reglas'} <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" /></span>
    </button>
    <div id={bodyId} className="mode-rules-body" hidden={!open}>
      <ol>{rules.steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
      <p className="mode-rules-note">{rules.note}</p>
    </div>
  </section>;
}
