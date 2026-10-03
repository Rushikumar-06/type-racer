'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag, CarFront, Trophy, Settings, ChevronRight, ArrowRight, Users, Zap, Target, Gauge, ArrowUpRight, Keyboard, Copy, Check, Crown, Link, LogOut, User, Plus, Timer, Activity, AlertCircle, Volume2, Sparkles, Type, Eye, X, Globe, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';
import { useSoloRace } from '@/lib/use-solo';
import { useMultiplayer } from '@/lib/use-multiplayer';
import { formatTime, ordinal } from '@/lib/typing';
import { playTone } from '@/lib/audio';
import type { Difficulty, PassageDifficulty, Racer, Room } from '@/lib/types';
import { Button, CarMark, Modal } from './ui';
import { RaceSetup, ModeSelection, Garage } from './setup';
import { Profile } from './profile';
import { RaceTrack } from './track';
import { TypingArea } from './typing-area';
import { RaceResults } from './results';

type Screen = 'home' | 'race' | 'lobby' | 'results' | 'garage' | 'profile';
type Dialog = 'modes' | 'solo' | 'friends' | 'settings' | null;
export function GameApp() {
  const { player, settings, history, setPlayer, setSettings, recordRace } = usePlayerStore();
  const [screen, setScreen] = useState<Screen>('home');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [passageDifficulty, setPassageDifficulty] = useState<PassageDifficulty>('medium');
  const [source, setSource] = useState<'solo' | 'multiplayer'>('solo');
  const [friendTab, setFriendTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [time, setTime] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const solo = useSoloRace();
  const multi = useMultiplayer();
  const reduce = useReducedMotion();
  const room = source === 'multiplayer' ? multi.room : solo.room;
  const selfId = source === 'multiplayer' ? multi.playerId : 'you';
  const self = room?.players.find(p => p.id === selfId);
  const host = room?.hostId === selfId;
  const serverNow = time + (source === 'multiplayer' ? multi.offset : 0);
  const elapsed = room?.startAt ? Math.max(0, Math.min(serverNow - room.startAt, 300000)) : 0;
  const countdown = room?.startAt && room.status === 'countdown' ? Math.max(1, Math.ceil((room.startAt - serverNow) / 1000)) : 0;
  const racing = room?.status === 'racing' || room?.status === 'countdown';
  const closeDialog = useCallback(() => { setDialog(null); setFormError(''); }, []);
  const showToast = useCallback((message: string) => {
    setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  useEffect(() => {
    void usePlayerStore.persist.rehydrate(); setMounted(true);
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) { setRoomCode(code.toUpperCase().slice(0, 6)); setFriendTab('join'); setDialog('friends'); }
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => { if (!racing) return; const t = setInterval(() => setTime(Date.now()), 100); return () => clearInterval(t); }, [racing]);
  useEffect(() => {
    if (!multi.room) return;
    setSource('multiplayer');
    setDialog(null);
    if (multi.room.status === 'lobby') setScreen('lobby');
    else if (multi.room.status === 'finished') setScreen('results');
    else setScreen('race');
  }, [multi.room?.status, multi.room?.raceId]);
  useEffect(() => {
    if (source === 'solo' && self?.finishTime !== null && self?.finishTime !== undefined && screen === 'race') setScreen('results');
    else if (room?.status === 'finished' && screen === 'race') setScreen('results');
    if (!room || !self?.finishTime || !self.place) return;
    recordRace({ id: room.raceId, date: new Date().toISOString(), wpm: self.wpm, accuracy: self.accuracy, mistakes: self.mistakes, time: self.finishTime, place: self.place, players: room.players.length, mode: source });
  }, [room?.raceId, room?.status, self?.finishTime, self?.place, recordRace, screen, source]);
  const playedSound = useRef('');
  useEffect(() => {
    if (!settings.sound || !room) return;
    const event = self?.finishTime ? `finish-${room.raceId}` : room.status === 'racing' ? `go-${room.raceId}` : countdown ? `${room.raceId}-${countdown}` : '';
    if (event && event !== playedSound.current) { playedSound.current = event; playTone(self?.finishTime ? 'finish' : room.status === 'racing' ? 'go' : 'countdown'); }
  }, [countdown, room?.status, room?.raceId, self?.finishTime, settings.sound]);
  const startSolo = () => {
    if (multi.room) { setScreen(multi.room.status === 'lobby' ? 'lobby' : 'race'); showToast('Leave your friend room to start a solo race.'); closeDialog(); return; }
    solo.start({ ...player, name: player.name.trim() || 'Rookie' }, difficulty, passageDifficulty);
    setSource('solo'); setScreen('race'); setTime(Date.now()); closeDialog();
  };
  const openFriends = () => { setFormError(''); setFriendTab('create'); setDialog('friends'); };
  async function enterRoom() {
    if (!player.name.trim()) { setFormError('Choose a username to enter the circuit.'); return; }
    if (friendTab === 'join' && !/^[A-Z0-9]{6}$/i.test(roomCode.trim())) { setFormError('Enter the six-character room code.'); return; }
    setBusy(true); setFormError('');
    try { solo.stop(); await multi.enter(friendTab === 'create' ? 'room:create' : 'room:join', player, friendTab === 'create' ? passageDifficulty : roomCode); setSource('multiplayer'); setScreen('lobby'); closeDialog(); }
    catch (e) { setFormError((e as Error).message); } finally { setBusy(false); }
  }
  async function roomAction(event: string, payload: unknown = {}) {
    setBusy(true);
    try { await multi.request(event, payload); } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  }
  async function exitRace() {
    if (source === 'multiplayer') { try { await multi.leave(); } catch { /* Local room state is cleared on leave even offline. */ } }
    else solo.stop();
    setScreen('home');
  }
  async function copy(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); showToast(message); } catch { showToast('Clipboard unavailable. You can select and copy the room code.'); }
  }
  async function shareResults() {
    if (!room || !self) return;
    const message = `${player.name} finished ${self.place ? ordinal(self.place) : 'their race'} on TypeRacer: ${self.wpm} WPM, ${self.accuracy}% accuracy, ${formatTime(self.finishTime || elapsed)}. Your keyboard is the accelerator.`;
    try { if (navigator.share) await navigator.share({ title: 'My TypeRacer result', text: message }); else await copy(message, 'Results copied. Challenge a friend!'); } catch (e) { if ((e as Error).name !== 'AbortError') showToast('Sharing unavailable. Try copying your result.'); }
  }
  const bestWpm = Math.max(0, ...history.map(r => r.wpm));
  const bestAccuracy = Math.max(0, ...history.map(r => r.accuracy));
  const previewPlayers = useMemo<Racer[]>(() => [
    { ...player, id: 'you', name: player.name || 'Rookie', progress: 13 },
    { ...player, id: 'bot-1', name: 'Nova', color: '#a5b4fc', number: '23', progress: 31, bot: true },
    { ...player, id: 'bot-2', name: 'Blaze', color: '#f6c778', number: '88', progress: 22, bot: true },
    { ...player, id: 'bot-3', name: 'Ghost', color: '#f69baf', number: '11', progress: 8, bot: true },
  ].map(p => ({ ...p, ready: false, connected: true, wpm: 0, accuracy: 100, mistakes: 0, finishTime: null, place: null })), [player]);
  const position = room && self ? self.place || [...room.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.progress - a.progress).findIndex(p => p.id === self.id) + 1 : 1;
  const hasActiveRoom = !!room && !['home', 'garage', 'profile'].includes(screen);
  return <div className="app-shell" data-animations={settings.animations && !reduce ? 'on' : 'off'}>
    <header className="site-header"><div className="header-inner"><button className="brand" aria-label="TypeRacer home" onClick={() => { if (!racing) setScreen('home'); }}><span className="brand-mark"><i/><i/><i/></span><span>TYPE<span className="mint">RACER</span><sup>™</sup></span></button>
      <nav className="main-nav" aria-label="Main navigation"><button className={['home', 'race', 'lobby', 'results'].includes(screen) ? 'active' : ''} onClick={() => setScreen(room ? room.status === 'lobby' ? 'lobby' : room.status === 'finished' ? 'results' : 'race' : 'home')}><Flag size={16}/> Race</button><button className={screen === 'garage' ? 'active' : ''} disabled={racing} onClick={() => setScreen('garage')}><CarFront size={17}/> Garage</button><button className={screen === 'profile' ? 'active' : ''} disabled={racing} onClick={() => setScreen('profile')}><Trophy size={16}/> My stats</button></nav>
      <div className="header-right"><button className="icon-button" aria-label="Settings" onClick={() => setDialog('settings')}><Settings size={19}/></button><span className="header-divider"/><button className="driver-button" aria-label="Open your profile" disabled={racing} onClick={() => setScreen('profile')}><span className="driver-avatar" style={{ background: `${player.color}16`, color: player.color }}>{player.avatar || 'R'}</span><span>{player.name || 'Rookie'}<small>Driver #{player.number}</small></span><ChevronRight size={15}/></button></div>
    </div></header>
    <main className={`main-content ${screen === 'race' ? 'racing-content' : ''}`}>
      {screen === 'home' && <>
        <section className="hero"><div className="hero-content"><div className="hero-kicker"><span className="status-dot"/> Your next personal best is waiting.</div><h1>TYPE FAST.<br/><span>DRIVE FASTER.</span></h1><p>Your keyboard is the accelerator.</p><div className="hero-actions"><Button onClick={() => setDialog('modes')}>Start racing <ArrowUpRight size={19}/></Button><Button variant="secondary" onClick={openFriends}><Users size={17}/> Race friends</Button></div></div>
          <div className="hero-visual" aria-hidden="true"><div className="hero-circuit circuit-outer"/><div className="hero-circuit circuit-inner"/><div className="hero-road-dashes"/><div className="hero-grid"/><span className="hero-racing-number">{player.number || '07'}</span><div className="hero-car"><div className="hero-speed-line"/><CarMark color={player.color} model={player.car} moving/></div><div className="hero-finish"/><span className="hero-visual-caption"><Keyboard size={13}/> Powered by your fingertips</span><div className="hero-dot dot-a"/><div className="hero-dot dot-b"/></div>
        </section>
        <div className="home-section-heading"><div><h2>Welcome to the starting grid.</h2><p>Find your rhythm. Pick up speed. Leave your limits behind.</p></div><div className="home-personal-stats"><div><Zap size={15}/><strong>{bestWpm || '—'}<small> WPM</small></strong><span>Personal best</span></div><div><Target size={15}/><strong>{bestAccuracy ? `${bestAccuracy}%` : '—'}</strong><span>Best accuracy</span></div><div><Flag size={15}/><strong>{history.length}</strong><span>Races finished</span></div></div></div>
        <div className="home-grid"><section className="panel preview-panel"><div className="panel-heading"><div className="heading-label"><span className="flag-icon"><Flag size={17}/></span><div><h3>The practice circuit</h3><p>Small steps. Smooth moves. Big finishes.</p></div></div><span className="subtle-tag"><span className="status-dot"/> Track preview</span></div><RaceTrack players={previewPlayers} selfId="you" preview showWpm={false}/><div className="preview-footer"><span><Keyboard size={15}/> Every correct character takes you further.</span><span className="preview-tip"><span className="keycap">⌫</span> Fix mistakes to keep moving</span></div></section>
          <aside className="panel setup-panel"><RaceSetup difficulty={difficulty} passageDifficulty={passageDifficulty} setDifficulty={setDifficulty} setPassageDifficulty={setPassageDifficulty} onStart={startSolo} compact/></aside></div>
        <section className="friends-banner"><div className="friends-banner-icon"><Users size={24}/></div><div><h3>Good races are better with friends.</h3><p>Create a private room, share the code, and settle who types fastest.</p></div><div className="friends-mini-cars"><CarMark color="#a8f0d0"/><CarMark color="#a5b4fc"/><CarMark color="#f6c778"/></div><Button variant="secondary" onClick={openFriends}>Let’s race <ArrowRight size={17}/></Button></section>
      </>}
      {screen === 'garage' && <Garage showToast={showToast}/>}
      {screen === 'profile' && <Profile onRace={() => { setScreen('home'); setDialog('solo'); }} onGarage={() => setScreen('garage')}/>}
      {screen === 'lobby' && multi.room && <>
        <div className="page-title-row"><div><span className="eyebrow">Friends circuit</span><h1>Your crew. Your circuit.</h1><p className="muted">Get everyone ready. Then let the keyboards do the talking.</p></div><Button variant="ghost" onClick={exitRace}><LogOut size={16}/> Leave room</Button></div>
        <div className="lobby-layout"><section className="panel lobby-grid-panel"><div className="panel-heading"><div className="heading-label"><Users size={19}/><h3>Starting lineup</h3></div><span className="subtle-tag">{multi.room.players.length} / 8 racers</span></div><div className="lobby-players">{multi.room.players.map(p => <div className="lobby-player" key={p.id}><div className="lobby-car"><CarMark color={p.color} model={p.car}/></div><div className="lobby-name"><strong>{p.name}{p.id === multi.playerId && <span className="you-tag">You</span>}{p.id === multi.room!.hostId && <Crown size={14} className="gold"/>}</strong><span>Driver #{p.number}</span></div><span className={`ready-state ${p.ready ? 'is-ready' : ''}`}>{p.ready ? <Check size={14}/> : <span className="status-dot"/>}{!p.connected ? 'Reconnecting' : p.ready ? 'Ready to race' : 'Getting ready'}</span></div>)}{multi.room.players.length < 8 && <div className="lobby-empty-slot"><Plus size={20}/><div><strong>A spot for your next rival.</strong><p>Share the room code to invite a friend.</p></div></div>}</div><div className="lobby-bottom"><span><Globe size={15}/> Real-time racing · one shared passage</span><Button variant={self?.ready ? 'secondary' : 'primary'} disabled={busy || !multi.connected} onClick={() => roomAction('room:ready', { ready: !self?.ready })}>{self?.ready ? <Check size={16}/> : <Flag size={16}/>}{self?.ready ? 'Ready · undo' : 'I’m ready'}</Button></div></section>
          <aside className="panel lobby-controls"><span className="field-label">Your private room</span><div className="room-code-display">{multi.room.code}<button className="icon-button" onClick={() => copy(multi.room!.code, 'Room code copied.')} aria-label="Copy room code"><Copy size={17}/></button></div><p className="muted small">Send the code to your friends, or share a link.</p><Button variant="secondary" className="full-width" onClick={() => copy(`${window.location.origin}/?room=${multi.room!.code}`, 'Invite link copied.')}><Link size={15}/> Copy invite link</Button><div className="separator"/><label className="field-label" htmlFor="lobby-passage">Passage difficulty</label><select className="select-input" id="lobby-passage" value={multi.room.difficulty} disabled={!host || busy} onChange={e => roomAction('room:difficulty', { difficulty: e.target.value })}><option value="easy">Easy · short & simple</option><option value="medium">Medium · the perfect balance</option><option value="hard">Hard · punctuation & numbers</option></select><div className="lobby-rules"><p><Check size={14}/> Everyone types the same passage</p><p><Check size={14}/> A synchronized 3-second countdown</p><p><Check size={14}/> Typing skill decides the winner</p></div><Button className="full-width" disabled={busy || !multi.connected || !host || multi.room.players.length < 2 || multi.room.players.some(p => !p.ready || !p.connected)} onClick={() => roomAction('room:start')}><Flag size={16}/>{host ? 'Start the race' : 'Waiting for host'}</Button><p className="center muted small lobby-note">{multi.room.players.length < 2 ? 'Invite at least one friend to race.' : multi.room.players.some(p => !p.ready) ? 'Everyone needs to be ready.' : host ? 'The whole crew is ready. Let’s go!' : 'The host will start your race.'}</p></aside></div>
      </>}
      {screen === 'race' && room && self && <>
        <div className="race-page-title"><div><div className="race-breadcrumb"><span>{source === 'solo' ? 'Solo circuit' : `Room ${room.code}`}</span><ChevronRight size={12}/><span>{room.passage?.title}</span></div><h1>{room.status === 'countdown' ? 'Find your focus.' : self.dnf ? 'This lap is over.' : self.finishTime ? 'Finish line crossed.' : 'Make every character count.'}</h1></div><div className="race-header-controls"><span className="race-live-badge"><span className="status-dot"/>{room.status === 'countdown' ? 'Starting soon' : 'Race in progress'}</span><button className="button button-ghost" onClick={exitRace}><LogOut size={15}/> Exit race</button></div></div>
        <section className="live-metrics">{[{ icon: Gauge, label: 'Typing speed', value: self.wpm, unit: 'WPM', color: 'mint' }, { icon: Target, label: 'Accuracy', value: self.accuracy, unit: '%', color: '' }, { icon: Trophy, label: 'Position', value: ordinal(position), unit: `/ ${room.players.length}`, color: 'gold' }, { icon: Activity, label: 'Progress', value: Math.floor(self.progress), unit: '%', color: '' }, { icon: X, label: 'Mistakes', value: self.mistakes, unit: '', color: '' }, { icon: Timer, label: 'Time elapsed', value: formatTime(self.finishTime || elapsed), unit: '', color: '' }].map(metric => <div className="live-metric" key={metric.label}><div><metric.icon size={15}/><span>{metric.label}</span></div><strong className={metric.color}>{metric.value}<small>{metric.unit}</small></strong></div>)}</section>
        <section className="panel live-track-panel"><div className="panel-heading"><div className="heading-label"><Flag size={18}/><h3>The race is on.</h3></div><span className="subtle-tag">{room.players.length} racers<span className="tag-dot"/>{room.difficulty} passage</span></div><div className="track-with-countdown"><RaceTrack players={room.players} selfId={selfId} active={room.status === 'racing'} showWpm={settings.showLiveWpm}/><AnimatePresence>{(room.status === 'countdown' || room.status === 'racing' && elapsed < 700) && <motion.div className="countdown-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span>{room.status === 'countdown' ? 'Hands on the keyboard.' : 'Your keyboard is the accelerator.'}</span><motion.strong key={room.status === 'countdown' ? countdown : 'go'} initial={{ scale: settings.animations && !reduce ? .7 : 1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .25 }}>{room.status === 'countdown' ? Math.min(3, countdown) : 'GO!'}</motion.strong><p>{room.status === 'countdown' ? 'Get ready to drive.' : 'Make every character count.'}</p></motion.div>}</AnimatePresence></div></section>
        {source === 'multiplayer' && !multi.connected && <div className="error-message"><AlertCircle size={16}/>Connection lost. Your spot is saved for 30 seconds. Reconnecting…</div>}
        {self.finishTime !== null || self.dnf ? <div className="finished-banner"><Trophy size={25}/><div><strong>{self.dnf ? 'Your race has ended.' : `You finished ${ordinal(self.place || position)}!`}</strong><p>{self.dnf ? 'You can join the next race when the crew returns to the lobby.' : 'The other racers are still on the road. Hang tight or view the standings.'}</p></div><Button onClick={() => setScreen('results')}>View standings <ArrowRight size={16}/></Button></div> : room.passage && <TypingArea passage={room.passage} typed={source === 'solo' ? solo.typed : multi.typed} active={room.status === 'racing' && (source === 'solo' || multi.connected)} finished={!!self.finishTime} onActions={source === 'solo' ? solo.type : multi.type} large={settings.fontSize === 'large'}/>}
        <div className="race-bottom"><span><span className="status-dot"/> Keep it steady. Accuracy is your advantage.</span><button onClick={() => document.getElementById('race-input')?.focus()}><Keyboard size={14}/> Focus typing area</button></div>
      </>}
      {screen === 'results' && room && self && <RaceResults room={room} selfId={selfId} multiplayer={source === 'multiplayer'} host={host} animations={settings.animations} onAgain={() => source === 'solo' ? startSolo() : roomAction('room:rematch')} onNew={async () => { await exitRace(); setDialog('modes'); }} onLobby={() => roomAction('room:rematch')} onShare={shareResults}/>}
      {(screen === 'race' || screen === 'lobby' || screen === 'results') && !room && <div className="empty-state panel"><Flag size={32}/><h2>The starting grid is waiting.</h2><p>Your previous room is no longer available. Start a fresh race.</p><Button onClick={() => { setScreen('home'); setDialog('modes'); }}>Choose a race <ArrowRight size={17}/></Button></div>}
    </main>
    <footer className="site-footer"><div><span className="footer-brand">TYPERACER</span><span>Built for the love of a good race.</span></div><span><span className="status-dot"/>{mounted && multi.connected ? 'Circuit online' : 'Connecting to circuit'}<span className="footer-dot"/> No shortcuts. Just keystrokes.</span></footer>
    <Modal open={dialog === 'modes'} title="Choose your lane." subtitle="A solo warm-up or a little friendly competition?" onClose={closeDialog}><ModeSelection solo={() => setDialog('solo')} multiplayer={openFriends}/></Modal>
    <Modal open={dialog === 'solo'} title="Ready for a little competition?" subtitle="Set your pace. Three AI racers will meet you at the line." onClose={closeDialog}><RaceSetup difficulty={difficulty} passageDifficulty={passageDifficulty} setDifficulty={setDifficulty} setPassageDifficulty={setPassageDifficulty} onStart={startSolo}/></Modal>
    <Modal open={dialog === 'friends'} title="Bring your own competition." subtitle="Make a room. Invite your crew. Race in real time." onClose={closeDialog}><div className="dialog-tabs"><button className={friendTab === 'create' ? 'selected' : ''} onClick={() => { setFriendTab('create'); setFormError(''); }}><Plus size={15}/> Create room</button><button className={friendTab === 'join' ? 'selected' : ''} onClick={() => { setFriendTab('join'); setFormError(''); }}><Users size={15}/> Join room</button></div><label className="field-label" htmlFor="room-username">Your username</label><input id="room-username" className="text-input" value={player.name} maxLength={20} placeholder="What should we call you?" onChange={e => setPlayer({ name: e.target.value })}/>{friendTab === 'join' ? <><label className="field-label" htmlFor="room-code">Room code</label><input id="room-code" className="text-input room-code-input" value={roomCode} maxLength={6} placeholder="ABC123" onChange={e => setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') void enterRoom(); }}/></> : <><label className="field-label" htmlFor="create-passage">Passage difficulty</label><select id="create-passage" className="select-input" value={passageDifficulty} onChange={e => setPassageDifficulty(e.target.value as PassageDifficulty)}><option value="easy">Easy · short & simple</option><option value="medium">Medium · the perfect balance</option><option value="hard">Hard · punctuation & numbers</option></select></>}<div className="room-car-preview"><CarMark color={player.color} model={player.car}/><span>Driver #{player.number}<small>Your current garage selection</small></span><button className="text-button" onClick={() => { closeDialog(); setScreen('garage'); }}>Customize <ChevronRight size={13}/></button></div>{formError && <div className="error-message"><AlertCircle size={16}/>{formError}</div>}<Button className="full-width" disabled={busy || !multi.connected} onClick={enterRoom}>{busy ? 'Connecting…' : friendTab === 'create' ? 'Create race room' : 'Join the starting grid'}<ArrowRight size={17}/></Button><p className="center small muted dialog-note">2–8 racers · Private room · No account needed</p></Modal>
    <Modal open={dialog === 'settings'} title="Fine-tune your drive." subtitle="Make your typing experience feel right." onClose={closeDialog}><div className="settings-list">{[{ key: 'sound' as const, icon: Volume2, title: 'Race sounds', description: 'A little countdown and finish-line feedback.' }, { key: 'animations' as const, icon: Sparkles, title: 'Racing effects', description: 'Moving road, wheels, and victory confetti.' }, { key: 'showLiveWpm' as const, icon: Eye, title: 'Lane speed indicators', description: 'See every racer’s WPM on the track.' }].map(setting => <div className="setting-row" key={setting.key}><setting.icon size={20}/><div><strong>{setting.title}</strong><p>{setting.description}</p></div><button className={`toggle ${settings[setting.key] ? 'on' : ''}`} role="switch" aria-checked={settings[setting.key]} aria-label={setting.title} onClick={() => setSettings({ [setting.key]: !settings[setting.key] })}><span/></button></div>)}<div className="setting-row"><Type size={20}/><div><strong>Passage text size</strong><p>A little extra room for every character.</p></div><select aria-label="Passage text size" className="select-input compact-select" value={settings.fontSize} onChange={e => setSettings({ fontSize: e.target.value as 'normal' | 'large' })}><option value="normal">Normal</option><option value="large">Large</option></select></div></div><p className="settings-note"><Check size={14}/> Preferences save automatically in your browser.</p><Button className="full-width" onClick={closeDialog}>Back to the circuit</Button></Modal>
    <AnimatePresence>{(toast || multi.error) && <motion.div role="status" className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}><span className="toast-icon">{multi.error ? <AlertCircle size={17}/> : <Check size={17}/>}</span>{toast || multi.error}<button className="icon-button" aria-label="Dismiss notification" onClick={() => { setToast(''); multi.setError(''); }}><X size={15}/></button></motion.div>}</AnimatePresence>
  </div>;
}
