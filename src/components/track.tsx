'use client';
import { Flag, Trophy, Bot, User } from 'lucide-react';
import { CarMark } from './ui';
import { ordinal } from '@/lib/typing';
import type { Racer } from '@/lib/types';
export function RaceTrack({ players, selfId, active = false, preview = false, showWpm = true }: { players: Racer[]; selfId: string; active?: boolean; preview?: boolean; showWpm?: boolean }) {
  const order = [...players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.progress - a.progress);
  return <div className={`race-track ${active ? 'track-active' : ''} ${preview ? 'track-preview' : ''}`}>
    <div className="track-labels"><span>Starting grid</span><span><Flag size={12}/> Finish line</span></div>
    <div className="track-lanes">{players.map(player => {
      const rank = player.place || order.findIndex(p => p.id === player.id) + 1;
      return <div key={player.id} className={`race-lane ${player.id === selfId ? 'your-lane' : ''}`} style={{ '--racer-color': player.color } as React.CSSProperties}>
        <div className="lane-player"><div className="lane-avatar" style={{ color: player.color, backgroundColor: `${player.color}12` }}>{player.bot ? <Bot size={17}/> : <User size={17}/>}</div><div><strong>{player.id === selfId ? 'You' : player.name}{player.id === selfId && <span className="you-tag">{player.number}</span>}</strong><small>{player.bot ? 'AI racer' : player.id === selfId ? player.name : player.connected ? 'Online racer' : 'Reconnecting…'}</small></div></div>
        <div className="lane-road"><div className="road-dashes"/><div className="start-marker"/><div className="lane-car" style={{ left: `${Math.min(100, player.progress)}%` }}><div className="car-speed-lines"><i/><i/><i/></div><CarMark color={player.color} model={player.car} moving={active && player.progress > 0 && player.progress < 100}/>{player.finishTime !== null && <span className="finish-spark"><Trophy size={13}/></span>}</div><div className="checkered-finish"/></div>
        <div className="lane-data"><strong className={rank === 1 && active ? 'mint' : ''}>{preview ? '—' : player.dnf ? 'DNF' : ordinal(rank)}</strong><span>{Math.floor(player.progress)}%{showWpm && <small>{player.wpm} <em>WPM</em></small>}</span></div>
      </div>;
    })}</div>
    <div className="track-distance"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
  </div>;
}
