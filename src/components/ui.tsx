'use client';
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X, ArrowUpRight, Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CarModel } from '@/lib/types';

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function CarMark({ color = '#a8f0d0', model = 'apex', className = '', moving = false }: { color?: string; model?: CarModel; className?: string; moving?: boolean }) {
  return <svg className={`car-mark ${className} ${moving ? 'moving' : ''}`} viewBox="0 0 100 48" fill="none" aria-hidden="true">
    <path d={model === 'formula' ? 'M9 19H28L38 10H54L63 19H88L95 28V35H8V28Z' : model === 'rally' ? 'M11 21L23 8H64L77 20L89 23L93 35H7L8 26Z' : model === 'phantom' ? 'M8 25L28 13H60L73 21L91 25L94 35H6Z' : 'M9 23L26 12H61L75 22L90 25L94 35H6L6 28Z'} fill={color}/>
    <path d="M30 15H43V23H20L30 15ZM47 15H60L70 23H47V15Z" fill="#15232e" opacity=".85"/>
    {model === 'formula' && <path d="M8 15H22V19H8ZM82 22H96V26H82Z" fill={color}/>}
    <path d="M10 30H89" stroke="#0c111a" strokeWidth="2" opacity=".18"/>
    <rect x="84" y="26" width="7" height="3" rx="1.5" fill="#f8fbff"/><rect x="8" y="26" width="4" height="3" rx="1" fill="#fb7185"/>
    {[25, 76].map(x => <g key={x} className="car-wheel" style={{ transformOrigin: `${x}px 35px` }}><circle cx={x} cy="35" r="10" fill="#090e16"/><circle cx={x} cy="35" r="5.5" fill="#8692a4"/><path d={`M${x - 4} 35H${x + 4}M${x} 31V39`} stroke="#273343" strokeWidth="2"/><circle cx={x} cy="35" r="1.8" fill="#dbe3ed"/></g>)}
  </svg>;
}
export function Modal({ open, title, subtitle, children, onClose, wide = false }: { open: boolean; title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => dialog.current?.querySelector<HTMLElement>('button, input, select')?.focus(), 30);
    function keys(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab') return;
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keys);
    return () => { clearTimeout(timer); document.body.style.overflow = before; document.removeEventListener('keydown', keys); previous?.focus(); };
  }, [open]);
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div ref={dialog} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? 'modal-wide' : ''}`} initial={{ opacity: 0, y: reduce ? 0 : 15, scale: reduce ? 1 : .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={20}/></button>
      <h2>{title}</h2>{subtitle && <p className="muted modal-subtitle">{subtitle}</p>}{children}
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
export function ColorPicker({ value, onChange, colors }: { value: string; onChange: (value: string) => void; colors: { hex: string; name: string }[] }) {
  return <div className="color-picker">{colors.map(c => <button key={c.hex} className={`color-swatch ${value === c.hex ? 'selected' : ''}`} style={{ '--swatch': c.hex } as React.CSSProperties} onClick={() => onChange(c.hex)} aria-label={c.name} title={c.name} aria-pressed={value === c.hex}>{value === c.hex && <Check size={17}/>}</button>)}</div>;
}
export function LinkArrow() { return <ArrowUpRight size={17}/>; }
