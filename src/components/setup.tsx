'use client';
import { Gauge, Flag, Users, ChevronRight, Check, Shuffle, ArrowRight, CarFront } from 'lucide-react';
import { Button, CarMark, ColorPicker } from './ui';
import { difficultyInfo } from '@/lib/passages';
import { carColors, usePlayerStore } from '@/lib/store';
import type { Difficulty, PassageDifficulty, CarModel } from '@/lib/types';

export function RaceSetup({ difficulty, passageDifficulty, setDifficulty, setPassageDifficulty, onStart, compact = false }: { difficulty: Difficulty; passageDifficulty: PassageDifficulty; setDifficulty: (v: Difficulty) => void; setPassageDifficulty: (v: PassageDifficulty) => void; onStart: () => void; compact?: boolean }) {
  const { player, setPlayer } = usePlayerStore();
  return <div className={`race-setup ${compact ? 'compact-setup' : ''}`}>
    <div className="setup-heading"><div><h3>Quick race</h3><p>Just you, your keyboard, and the road.</p></div><div className="setup-icon"><Gauge size={20}/></div></div>
    <label className="field-label">Bot difficulty</label>
    <div className="difficulty-selector">{(Object.keys(difficultyInfo) as Difficulty[]).map(d => <button key={d} className={difficulty === d ? 'selected' : ''} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>{difficultyInfo[d].label}</button>)}</div>
    <p className="difficulty-description"><span className="status-dot"/>{difficultyInfo[difficulty].description}<span>{difficultyInfo[difficulty].range}</span></p>
    <label className="field-label" htmlFor={compact ? 'quick-passage' : 'solo-passage'}>Passage difficulty</label>
    <select id={compact ? 'quick-passage' : 'solo-passage'} className="select-input" value={passageDifficulty} onChange={e => setPassageDifficulty(e.target.value as PassageDifficulty)}><option value="easy">Easy · short & simple</option><option value="medium">Medium · the perfect balance</option><option value="hard">Hard · punctuation & numbers</option></select>
    <div className="setup-car-row"><span className="field-label">Your car color</span><span className="small muted">Cosmetic only</span></div>
    <ColorPicker value={player.color} onChange={color => setPlayer({ color })} colors={carColors.slice(0, compact ? 6 : 8)}/>
    <Button className="start-race-button" onClick={onStart}><Flag size={17}/> Start race <ArrowRight size={18}/></Button>
    <p className="setup-footnote">4 racers <span/> No sign-up <span/> All skill</p>
  </div>;
}
export function ModeSelection({ solo, multiplayer }: { solo: () => void; multiplayer: () => void }) {
  return <div className="mode-options"><button onClick={solo} className="mode-option"><div className="mode-symbol"><Gauge size={28}/></div><div><h3>Solo circuit</h3><p>Find your pace against three AI racers.</p><span>4 difficulties · instant start</span></div><ChevronRight size={22}/></button><button onClick={multiplayer} className="mode-option"><div className="mode-symbol lavender"><Users size={28}/></div><div><h3>Race your friends</h3><p>One passage. One finish line. Your crew.</p><span>Private rooms · 2–8 players</span></div><ChevronRight size={22}/></button></div>;
}
const models: { id: CarModel; name: string; type: string }[] = [{ id: 'apex', name: 'Apex', type: 'The everyday champion' }, { id: 'phantom', name: 'Phantom', type: 'Low profile. High style.' }, { id: 'rally', name: 'Rally', type: 'Made for the adventure' }, { id: 'formula', name: 'Formula', type: 'A little racing heritage' }];
export function Garage({ showToast }: { showToast: (message: string) => void }) {
  const { player, setPlayer } = usePlayerStore();
  return <div className="garage-page"><div className="page-title-row"><div><span className="eyebrow">Make it yours</span><h1>Your garage.</h1><p className="muted">A new look. The same horsepower. Skill does the driving.</p></div><span className="pill"><CarFront size={15}/> All cars available</span></div>
    <div className="garage-layout"><div className="panel car-showcase" style={{ '--selected-car': player.color } as React.CSSProperties}><span className="showcase-label">{models.find(m => m.id === player.car)?.name} / {player.number}</span><div className="showcase-grid"/><CarMark color={player.color} model={player.car} className="garage-car"/><div className="showcase-floor"/><div className="showcase-caption"><span className="status-dot"/>Race ready <span>100% cosmetic</span></div></div>
      <div className="panel garage-customization"><h3>Driver details</h3><label className="field-label" htmlFor="driver-name">Username</label><input id="driver-name" className="text-input" maxLength={20} value={player.name} onChange={e => setPlayer({ name: e.target.value })} onBlur={() => { if (!player.name.trim()) setPlayer({ name: 'Rookie' }); }}/><div className="field-grid"><div><label className="field-label" htmlFor="driver-number">Racing number</label><input id="driver-number" className="text-input" inputMode="numeric" maxLength={2} value={player.number} onChange={e => setPlayer({ number: e.target.value.replace(/\D/g, '') })}/></div><div><label className="field-label" htmlFor="driver-avatar">Avatar initials</label><input id="driver-avatar" className="text-input" maxLength={2} value={player.avatar} onChange={e => setPlayer({ avatar: e.target.value.toUpperCase() })}/></div></div><label className="field-label">Paint color <span className="muted">{carColors.find(c => c.hex === player.color)?.name}</span></label><ColorPicker value={player.color} onChange={color => setPlayer({ color })} colors={carColors}/><Button variant="secondary" onClick={() => { setPlayer({ color: carColors[Math.floor(Math.random() * carColors.length)].hex, car: models[Math.floor(Math.random() * models.length)].id }); showToast('Fresh paint. Ready to race.'); }}><Shuffle size={15}/> Surprise me</Button><p className="small muted saved-note"><Check size={13}/> Changes save automatically in this browser.</p></div></div>
    <div className="section-title"><h3>Pick your ride</h3><span className="muted small">Same speed. Different personality.</span></div><div className="car-collection">{models.map(model => <button key={model.id} className={`car-choice panel ${player.car === model.id ? 'selected' : ''}`} onClick={() => setPlayer({ car: model.id })} aria-pressed={player.car === model.id}>{player.car === model.id && <span className="car-selected"><Check size={13}/> Selected</span>}<CarMark color={player.color} model={model.id}/><h3>{model.name}</h3><p>{model.type}</p></button>)}</div>
  </div>;
}
