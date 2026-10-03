'use client';
import { Activity, Target, Trophy, Flag, Timer, ChevronRight, CalendarDays, TrendingUp } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { formatTime, ordinal } from '@/lib/typing';
import { Button } from './ui';
export function Profile({ onRace, onGarage }: { onRace: () => void; onGarage: () => void }) {
  const { player, history } = usePlayerStore();
  const finished = history.length;
  const best = Math.max(0, ...history.map(r => r.wpm));
  const average = finished ? Math.round(history.reduce((s, r) => s + r.wpm, 0) / finished) : 0;
  const accuracy = finished ? Math.round(history.reduce((s, r) => s + r.accuracy, 0) / finished) : 0;
  const bestAccuracy = Math.max(0, ...history.map(r => r.accuracy));
  const fastest = finished ? Math.min(...history.map(r => r.time)) : 0;
  return <div className="profile-page"><div className="profile-banner panel"><div className="profile-avatar" style={{ background: `${player.color}18`, color: player.color }}>{player.avatar || player.name.slice(0, 2).toUpperCase()}</div><div><span className="eyebrow">Driver profile</span><h1>{player.name || 'Rookie'} <span className="muted">#{player.number}</span></h1><p className="muted">Every lap is a chance to get a little better.</p></div><Button variant="secondary" onClick={onGarage}>Edit driver <ChevronRight size={16}/></Button></div>
    <div className="profile-stats">{[
      { icon: Activity, label: 'Best speed', value: best, unit: 'WPM', note: `Average: ${average} WPM` },
      { icon: Target, label: 'Best accuracy', value: bestAccuracy, unit: '%', note: `Average: ${accuracy}%` },
      { icon: Trophy, label: 'Races won', value: history.filter(r => r.place === 1).length, unit: '', note: `${finished} races completed` },
      { icon: Timer, label: 'Fastest finish', value: fastest ? formatTime(fastest) : '—', unit: '', note: 'Your quickest completed passage' },
    ].map(stat => <div className="panel profile-stat" key={stat.label}><stat.icon size={20}/><span>{stat.label}</span><strong>{stat.value}<small>{stat.unit}</small></strong><p>{stat.note}</p></div>)}</div>
    <div className="panel history-panel"><div className="panel-heading"><div className="heading-label"><Flag size={18}/><h3>Race history</h3></div><span className="subtle-tag"><CalendarDays size={13}/> Last {Math.min(100, history.length)} races</span></div>{!finished ? <div className="empty-state"><div className="empty-icon"><TrendingUp size={32}/></div><h3>Your story starts at the starting line.</h3><p>Finish a race to see your speed, accuracy, and results here.</p><Button onClick={onRace}><Flag size={16}/> Start your first race</Button></div> : <div className="table-scroll"><table><thead><tr><th>Race</th><th>Position</th><th>Speed</th><th>Accuracy</th><th>Time</th><th>Mistakes</th></tr></thead><tbody>{history.map(r => <tr key={r.id}><td><strong>{r.mode === 'solo' ? 'Solo circuit' : 'Friends circuit'}</strong><small>{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></td><td><span className={r.place === 1 ? 'mint' : ''}>{ordinal(r.place)} <span className="muted">/ {r.players}</span></span></td><td>{r.wpm} <span className="muted small">WPM</span></td><td>{r.accuracy}%</td><td>{formatTime(r.time)}</td><td>{r.mistakes}</td></tr>)}</tbody></table></div>}</div><p className="profile-storage-note">Your stats stay in this browser. No account needed.</p>
  </div>;
}
