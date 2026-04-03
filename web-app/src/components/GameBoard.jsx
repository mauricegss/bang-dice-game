import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { GameEngine, Phase, Roles, DiceFace, SpecialAction, characterAbilities, Characters } from '../game/GameEngine';
import PlayerCard from './PlayerCard';
import DiceRoller from './DiceRoller';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtRole = r => ({
  [Roles.Sheriff]: '⭐ Xerife', [Roles.Deputy]: '🔵 Vice',
  [Roles.Outlaw]: '💀 Fora-da-Lei', [Roles.Renegade]: '🎭 Renegado',
}[r] ?? r);

const charLabel = c => c?.replace(/([A-Z])/g, ' $1').trim() ?? '?';

// ── Portal-based Ability Popup ────────────────────────────────────────────────
export const AbilityPopup = ({ character, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(160deg,#2c1505,#1a0d03)',
          border: '2px solid #d4a017', borderRadius: 18,
          padding: '28px 32px', maxWidth: 360, width: '90%', textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9), 0 0 40px rgba(212,160,23,0.15)',
          animation: 'bounce-in 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Rye,serif', color: '#f0c842', fontSize: '1.15rem', marginBottom: 12 }}>
          {charLabel(character)}
        </div>
        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#d4a017,transparent)', marginBottom: 16 }} />
        <div style={{ color: '#e8d8b8', fontSize: '0.88rem', lineHeight: 1.8 }}>
          {characterAbilities[character] ?? 'Sem habilidade especial.'}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 20, background: 'rgba(212,160,23,0.12)',
            color: '#d4a017', border: '1px solid #d4a017', borderRadius: 8,
            padding: '7px 24px', fontFamily: 'Rye,serif', fontSize: '0.82rem',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(212,160,23,0.25)'}
          onMouseLeave={e => e.target.style.background = 'rgba(212,160,23,0.12)'}
        >
          ✕ Fechar
        </button>
      </div>
    </div>,
    document.body
  );
};

// ── Compact dice zone on table (for each opponent) ───────────────────────────
const MiniDiceZone = ({ dice, isActive }) => {
  const FACE_EMOJI = {
    Arrow: '➵', Dynamite: '💥', Shoot1: '🎯', Shoot2: '🎯',
    Beer: '🍺', Gatling: '🔫',
  };
  return (
    <div style={{
      display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center',
      marginTop: 4,
    }}>
      {dice.map((d, i) => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: 4,
          background: d.state === 'Unrolled'
            ? 'rgba(255,255,255,0.07)'
            : d.state === 'Locked'
              ? 'rgba(200,0,0,0.2)'
              : d.state === 'Spent'
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.12)',
          border: d.state === 'Locked'
            ? '1px solid rgba(200,0,0,0.6)'
            : d.state === 'HeldByPlayer'
              ? '1px solid rgba(34,85,204,0.7)'
              : '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem',
          opacity: d.state === 'Spent' ? 0.2 : 1,
          transition: 'all 0.3s',
          boxShadow: isActive && d.state !== 'Unrolled' && d.state !== 'Spent'
            ? '0 0 6px rgba(212,160,23,0.3)' : 'none',
        }}>
          {d.state === 'Unrolled' ? '\u00b7' : FACE_EMOJI[d.face] ?? '·'}
        </div>
      ))}
    </div>
  );
};

// ── Arrow tracker in table center ────────────────────────────────────────────
const ArrowCenter = ({ count, onInfo }) => (
  <div style={{ textAlign: 'center', userSelect: 'none' }}>
    <div style={{ fontFamily: 'Rye,serif', fontSize: '0.55rem', color: '#f0c842', marginBottom: 3, letterSpacing: 1 }}>
      FLECHAS
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', width: 60 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: 3,
          background: i < count ? '#d4a017' : 'rgba(255,255,255,0.06)',
          fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: i < count ? '#1a0805' : 'transparent',
          boxShadow: i < count ? '0 0 4px rgba(212,160,23,0.4)' : 'none',
          transition: 'all 0.3s',
        }}>
          {i < count ? '➵' : ''}
        </div>
      ))}
    </div>
    <div style={{ fontFamily: 'Rye,serif', color: '#d4a017', fontSize: '0.7rem', marginTop: 3 }}>
      {count} / 9
    </div>
  </div>
);

// ── Side Panel ───────────────────────────────────────────────────────────────
const SidePanel = ({ players, logs, currentPlayerIdx }) => {
  const [tab, setTab] = useState('events');
  const logEndRef = useRef(null);
  useEffect(() => {
    if (tab === 'events') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, tab]);

  const TABS = [
    { id: 'events', label: '📜 Eventos' },
    { id: 'chars',  label: '👥 Jogadores' },
    { id: 'rules',  label: '📖 Regras' },
  ];

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 240, zIndex: 30,
      background: 'linear-gradient(180deg, rgba(16,6,2,0.97) 0%, rgba(10,4,2,0.99) 100%)',
      borderLeft: '2px solid #3d1c0a',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-6px 0 30px rgba(0,0,0,0.6)',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #3d1c0a' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 0', fontSize: '0.55rem',
            fontFamily: 'Rye,serif', cursor: 'pointer', border: 'none',
            background: tab === t.id ? 'rgba(212,160,23,0.1)' : 'transparent',
            color: tab === t.id ? '#d4a017' : '#7b3d14',
            borderBottom: tab === t.id ? '2px solid #d4a017' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>

        {/* EVENTS */}
        {tab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {logs.length === 0 && (
              <div style={{ color: '#5c3014', fontSize: '0.65rem', textAlign: 'center', marginTop: 20 }}>
                O jogo ainda não começou...
              </div>
            )}
            {logs.map((m, i) => (
              <div key={i} style={{
                fontSize: '0.63rem', color: '#c8904a', lineHeight: 1.5,
                padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {m}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* CHARACTERS */}
        {tab === 'chars' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map(p => (
              <div key={p.id} style={{
                background: p.id === currentPlayerIdx
                  ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${p.id === currentPlayerIdx ? '#d4a017' : '#3d1c0a'}`,
                borderRadius: 8, padding: '7px 9px',
                opacity: p.alive ? 1 : 0.4,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 3,
                }}>
                  <span style={{ fontFamily: 'Rye,serif', fontSize: '0.62rem', color: '#f0c842' }}>
                    P{p.id + 1} — {charLabel(p.character)}
                  </span>
                  {!p.alive && <span style={{ fontSize: '0.5rem', color: '#8b0000' }}>💀</span>}
                </div>
                <div style={{ fontSize: '0.57rem', color: '#7b3d14', marginBottom: 3 }}>
                  {fmtRole(p.role === Roles.Sheriff ? p.role : (p.alive ? '???' : p.role))}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#c8904a', lineHeight: 1.5 }}>
                  {characterAbilities[p.character] ?? '—'}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 5, alignItems: 'center' }}>
                  {Array.from({ length: p.maxHealth }).map((_, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: i < p.health ? '#cc1111' : 'rgba(255,255,255,0.08)',
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RULES */}
        {tab === 'rules' && (
          <div style={{ fontSize: '0.62rem', color: '#c8904a', lineHeight: 1.8 }}>
            <div style={{ fontFamily: 'Rye,serif', color: '#f0c842', fontSize: '0.7rem', marginBottom: 8 }}>Resumo das Regras</div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>🎲 Turno</b>
              <br/>Role até 3× por turno. Após cada rolagem, você pode guardar (Hold) dados. Dinamite se trava automaticamente. 3 Dinamites = 1 dano.
            </div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>➵ Flechas</b>
              <br/>Toda flecha vai para o jogador. Quando as 9 flechas acabam no centro: <b>Ataque Indígena</b> — cada jogador perde HP igual ao número de flechas que tem.
            </div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>🎯 Tiro ×1</b>
              <br/>Atinge jogadores a distância 1. <b>Tiro ×2</b>: distância 2 (se houver ≥4 vivos).
            </div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>🔫 Gatling</b>
              <br/>3 Gatlins atinge <i>todos os outros</i> jogadores com 1 dano cada. O atirador descarta todas as flechas.
            </div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>🏆 Vitória</b>
              <ul style={{ paddingLeft: 14, marginTop: 4 }}>
                <li><b>Xerife+Vices</b>: eliminar todos os Foras-da-Lei e o Renegado.</li>
                <li><b>Foras-da-Lei</b>: matar o Xerife.</li>
                <li><b>Renegado</b>: ser o único sobrevivente.</li>
              </ul>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b style={{ color: '#d4a017' }}>🍺 Cerveja</b>
              <br/>Cura 1 HP em qualquer jogador vivo. JesseJones cura 2 HP se tiver ≤4 HP.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Setup screen ─────────────────────────────────────────────────────────────
const SetupScreen = ({ onStart }) => {
  const [n, setN] = useState(4);
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #3d1c0a 0%, #1a0f08 50%, #0a0603 100%)',
    }}>
      <div style={{
        background: 'linear-gradient(160deg,rgba(61,28,10,0.96),rgba(26,15,8,0.98))',
        border: '3px solid #7b3d14', borderRadius: 24,
        padding: '48px 56px', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,160,23,0.08)',
        maxWidth: 440, width: '90%',
      }}>
        <div style={{ fontFamily: 'Rye,serif', fontSize: '3.4rem', color: '#d4a017',
          textShadow: '0 0 40px rgba(212,160,23,0.5), 2px 2px 0 #3d1c0a', lineHeight: 1, marginBottom: 4 }}>
          BANG!
        </div>
        <div style={{ fontFamily: 'Rye,serif', fontSize: '1.1rem', color: '#c8904a', letterSpacing: 5, marginBottom: 32 }}>
          THE DICE GAME
        </div>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#d4a017,transparent)', marginBottom: 28 }} />
        <p style={{ color: '#c8904a', fontFamily:'Rye,serif', fontSize:'0.85rem', marginBottom: 20 }}>
          Quantos pistoleiros?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 30 }}>
          {[4,5,6,7,8].map(num => (
            <button key={num} onClick={() => setN(num)} style={{
              width: 46, height: 46, borderRadius: 10,
              background: n === num ? 'linear-gradient(135deg,#d4a017,#f0c842)' : 'rgba(255,255,255,0.06)',
              border: `2px solid ${n === num ? '#d4a017' : 'rgba(255,255,255,0.12)'}`,
              color: n === num ? '#1a0805' : '#c8904a',
              fontFamily:'Rye,serif', fontSize:'1.1rem', fontWeight:900, cursor:'pointer',
              boxShadow: n === num ? '0 0 12px rgba(212,160,23,0.4)' : 'none',
              transition: 'all 0.2s',
            }}>{num}</button>
          ))}
        </div>
        <button onClick={() => onStart(n)} style={{
          background: 'linear-gradient(135deg,#8b1a1a,#c22a2a)',
          color: '#fff', border: '2px solid #5a0a0a', borderRadius: 12,
          padding: '14px 48px', fontFamily:'Rye,serif', fontSize:'1.25rem',
          cursor:'pointer', letterSpacing:2,
          boxShadow:'0 6px 24px rgba(139,26,26,0.5)',
        }}>
          🔫 JOGAR!
        </button>
        <div style={{ marginTop: 22, color:'#7b3d14', fontSize:'0.68rem', lineHeight:1.7 }}>
          <div>◆ Xerife + Vice vs. Foras-da-Lei vs. Renegado</div>
          <div>◆ 5 dados, até 3 rolagens por turno</div>
          <div>◆ 9 Flechas — Ataque Indígena quando esgotam</div>
        </div>
      </div>
    </div>
  );
};

// ── Game Over Screen ─────────────────────────────────────────────────────────
const GameOverScreen = ({ winner, players, onRestart }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(5px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ animation: 'bounce-in 0.4s ease-out' }}>
      <div style={{ fontFamily:'Rye,serif', fontSize:'0.9rem', color:'#c8904a', letterSpacing:6, marginBottom:6, textAlign:'center' }}>
        FIM DE JOGO
      </div>
      <div style={{
        fontFamily:'Rye,serif', fontSize:'3rem', color:'#d4a017',
        textShadow:'0 0 40px rgba(212,160,23,0.7)', marginBottom:4, textAlign:'center',
      }}>
        {winner}
      </div>
      <div style={{ color:'#c8904a', fontSize:'0.9rem', textAlign:'center', marginBottom:24 }}>VENCEU!</div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginBottom:28 }}>
        {players.map(p => (
          <div key={p.id} style={{
            background: p.alive ? 'rgba(212,160,23,0.1)' : 'rgba(0,0,0,0.4)',
            border:`1px solid ${p.alive?'#d4a017':'#333'}`,
            borderRadius:10, padding:'8px 12px', textAlign:'center', minWidth:80,
          }}>
            <div style={{ fontFamily:'Rye,serif', fontSize:'0.7rem', color:'#c8904a' }}>P{p.id+1}</div>
            <div style={{ fontSize:'0.65rem', color:'#e8e0c8', marginTop:1 }}>{charLabel(p.character)}</div>
            <div style={{ fontSize:'0.62rem', color:'#d4a017', marginTop:2 }}>{fmtRole(p.role)}</div>
            <div style={{ fontSize:'0.62rem', color: p.alive?'#44cc44':'#cc4444', marginTop:2 }}>
              {p.alive ? '✅ Vivo' : '💀 Morto'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'center' }}>
        <button onClick={onRestart} style={{
          background:'linear-gradient(135deg,#d4a017,#f0c842)', color:'#1a0805',
          border:'none', borderRadius:12, padding:'14px 48px',
          fontFamily:'Rye,serif', fontSize:'1.1rem', cursor:'pointer', letterSpacing:2,
          boxShadow:'0 6px 20px rgba(212,160,23,0.4)',
        }}>
          🔄 Jogar Novamente
        </button>
      </div>
    </div>
  </div>
);

// ── Compact "current player" strip ───────────────────────────────────────────
const CurrentPlayerStrip = ({ player, pendingAction, onUseAbility, canUseAbility, phase }) => {
  if (!player?.alive) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(10,4,2,0.9)', border: '1px solid #d4a017',
      borderRadius: 10, padding: '5px 12px',
      boxShadow: '0 2px 12px rgba(212,160,23,0.2)',
    }}>
      <span style={{ fontFamily:'Rye,serif', fontSize:'0.75rem', color:'#f0c842' }}>
        🎲 P{player.id+1} — {charLabel(player.character)}
      </span>
      {canUseAbility && (
        <button onClick={onUseAbility} style={{
          background: pendingAction !== 'None' ? '#4a1e6a' : 'rgba(74,30,106,0.6)',
          color:'#dfc8ff', border:'1px solid #9966cc',
          borderRadius:6, padding:'3px 10px',
          fontFamily:'Rye,serif', fontSize:'0.65rem', cursor:'pointer',
        }}>
          {pendingAction !== 'None' ? '✖' : '⚡'} Habilidade
        </button>
      )}
    </div>
  );
};

// ── Main GameBoard ────────────────────────────────────────────────────────────
const GameBoard = ({ totalPlayers, onGoToSetup }) => {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new GameEngine(totalPlayers);
  const [gs, setGs] = useState(() => engineRef.current.getState());
  const [damagedSet, setDamagedSet] = useState(new Set());

  const sync = useCallback(() => {
    const state = engineRef.current.getState();
    setGs({ ...state });
    if (state.damagedThisTick?.length > 0) {
      setDamagedSet(new Set(state.damagedThisTick));
      setTimeout(() => setDamagedSet(new Set()), 700);
    }
  }, []);

  const handleRoll = useCallback(() => {
    const faces = engineRef.current.requestRoll();
    if (!faces) return;
    sync(); // show immediately (unrolled → active)
    setTimeout(() => {
      engineRef.current.commitRollResults(faces);
      sync();
    }, 1200);
  }, [sync]);

  const handleToggleHold = useCallback(idx => {
    engineRef.current.toggleHold(idx);
    sync();
  }, [sync]);

  const handleResolve = useCallback(() => {
    engineRef.current._beginResolution();
    sync();
  }, [sync]);

  const handleSelectTarget = useCallback(id => {
    engineRef.current.selectTarget(id);
    sync();
  }, [sync]);

  const handleUseAbility = useCallback(() => {
    engineRef.current.useAbility();
    sync();
  }, [sync]);

  // ── Viewport ──────────────────────────────────────────────────────────────
  const PANEL_W = 240; // side panel width
  const [vpW, setVpW] = useState(window.innerWidth);
  const [vpH, setVpH] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => { setVpW(window.innerWidth); setVpH(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Available width (excluding side panel)
  const availW = vpW - PANEL_W;
  const tableR = Math.min(availW * 0.26, vpH * 0.26, 230);
  const orbitR  = tableR + 104;

  // ── Opponent orbit (3/4 arc at top) ──────────────────────────────────────
  const currentP = gs.players[gs.currentPlayerIdx];
  const opponents = gs.players.filter(p => p.id !== gs.currentPlayerIdx);
  const total = opponents.length;

  const opponentPositions = useMemo(() => {
    const positions = {};
    opponents.forEach((p, i) => {
      // Spread from lower-left to lower-right via top (270° arc)
      const startAngle = -Math.PI * 0.75;
      const endAngle   =  Math.PI * 0.75;
      const angle = total === 1
        ? -Math.PI / 2 // single: top
        : startAngle + (i / (total - 1)) * (endAngle - startAngle);
      positions[p.id] = {
        x: Math.cos(angle - Math.PI / 2) * orbitR,
        y: Math.sin(angle - Math.PI / 2) * orbitR * 0.78,
      };
    });
    return positions;
  }, [opponents, total, orbitR]);

  const tableCenterX = availW / 2;
  const tableCenterY = vpH * 0.40;

  const isResolving = gs.phase === Phase.Resolving || gs.pendingAction !== SpecialAction.None;
  const canUseAbility = !gs.gameOver && gs.phase === Phase.Rolling &&
    ['SidKetchum','SlabOAssassino','JaneCalamidade','KitCarlson','BartCassidy']
      .includes(currentP?.character) &&
    !gs.abilityUsedThisTurn;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(ellipse at 50% 0%, #3d1c0a 0%, #1a0f08 40%, #0a0603 100%)',
    }}>
      {/* Overhead warm light */}
      <div style={{
        position:'absolute', top:-80, left: availW / 2, transform:'translateX(-50%)',
        width:600, height:420, pointerEvents:'none',
        background:'radial-gradient(ellipse at center, rgba(212,160,23,0.14) 0%, transparent 70%)',
      }} />
      {/* Vignette */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* ── Round Table ─────────────────────────────────────────────────── */}
      <div style={{
        position:'absolute',
        left: tableCenterX, top: tableCenterY,
        transform:'translate(-50%, -50%)',
        width: tableR * 2, height: tableR * 2,
        borderRadius:'50%',
        background:'radial-gradient(ellipse at 38% 35%, #216321 0%, #124012 55%, #082208 100%)',
        boxShadow: [
          'inset 0 0 60px rgba(0,0,0,0.55)',
          'inset 0 0 120px rgba(0,0,0,0.3)',
          '0 0 0 14px #5c2a0a',
          '0 0 0 20px #3a1606',
          '0 0 0 26px #2a1004',
          '0 12px 60px rgba(0,0,0,0.9)',
        ].join(','),
        border:'14px solid #6b3010',
        zIndex:1,
      }}>
        {/* Stitch ring */}
        <div style={{
          position:'absolute', inset:10, borderRadius:'50%',
          border:'3px dashed rgba(255,255,255,0.04)', pointerEvents:'none',
        }} />
        {/* Arrow center */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)', zIndex:2,
        }}>
          <ArrowCenter count={gs.arrowsInCenter} />
        </div>
        {/* "Choose target" hint on table */}
        {isResolving && !gs.gameOver && (
          <div style={{
            position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)',
            background:'rgba(10,4,2,0.9)', border:'1px solid #c22a2a',
            borderRadius:8, padding:'5px 14px',
            fontFamily:'Rye,serif', fontSize:'0.65rem', color:'#f0c842',
            whiteSpace:'nowrap', zIndex:5,
          }}>
            🎯 Escolha um alvo
          </div>
        )}
      </div>

      {/* ── Opponent cards in orbit ──────────────────────────────────────── */}
      {opponents.map(p => {
        const pos = opponentPositions[p.id];
        if (!pos) return null;
        return (
          <div
            key={p.id}
            style={{
              position:'absolute',
              left: tableCenterX + pos.x,
              top:  tableCenterY + pos.y,
              transform:'translate(-50%,-50%)',
              zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <PlayerCard
              player={p}
              isCurrentPlayer={false}
              isTargetable={gs.validTargets.includes(p.id)}
              onSelect={handleSelectTarget}
              showRole={p.role === Roles.Sheriff || !p.alive}
              isDamaged={damagedSet.has(p.id)}
            />
            {/* Mini dice zone on table */}
            <MiniDiceZone dice={gs.dice} isActive={false} />
          </div>
        );
      })}

      {/* ── Current player section — bottom center ───────────────────────── */}
      {!gs.gameOver && currentP?.alive && (
        <div style={{
          position:'fixed', bottom:12, left: availW / 2, transform:'translateX(-50%)',
          zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        }}>
          <CurrentPlayerStrip
            player={currentP}
            pendingAction={gs.pendingAction}
            onUseAbility={handleUseAbility}
            canUseAbility={canUseAbility}
            phase={gs.phase}
          />
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            {/* Current player card */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                background:'rgba(10,4,2,0.85)', border:'1px solid #d4a017',
                borderRadius:6, padding:'2px 8px', fontSize:'0.58rem',
                fontFamily:'Rye,serif', color:'#f0c842', textAlign:'center',
                marginBottom: 3,
              }}>
                🌟 Seu turno
              </div>
              <PlayerCard
                player={currentP}
                isCurrentPlayer={true}
                isTargetable={gs.validTargets.includes(currentP.id)}
                onSelect={handleSelectTarget}
                showRole={true}
                isDamaged={damagedSet.has(currentP.id)}
              />
            </div>
            {/* Dice roller */}
            <DiceRoller
              dice={gs.dice}
              onToggleHold={handleToggleHold}
              onRoll={handleRoll}
              onResolve={handleResolve}
              rollsLeft={gs.rollsLeft}
              maxRolls={gs.maxRolls}
              phase={gs.phase}
              disabled={gs.gameOver || isResolving}
            />
          </div>
        </div>
      )}

      {/* ── HUD — top left ──────────────────────────────────────────────── */}
      <div style={{
        position:'fixed', top:10, left:10, zIndex:20,
        display:'flex', alignItems:'center', gap:8,
        background:'rgba(10,4,2,0.85)', border:'1px solid #5c2a0a',
        borderRadius:10, padding:'6px 12px',
      }}>
        <span style={{ fontFamily:'Rye,serif', fontSize:'0.95rem', color:'#d4a017' }}>
          🤠 BANG!
        </span>
        <button onClick={onGoToSetup} style={{
          background:'rgba(255,255,255,0.06)',
          color:'#c8904a', border:'1px solid #5c2a0a',
          borderRadius:6, padding:'3px 9px', fontSize:'0.65rem',
          cursor:'pointer', fontFamily:'Rye,serif',
        }}>
          ↩ Menu
        </button>
      </div>

      {/* ── Side Panel ──────────────────────────────────────────────────── */}
      <SidePanel
        players={gs.players}
        logs={gs.logs}
        currentPlayerIdx={gs.currentPlayerIdx}
      />

      {/* ── Game Over ────────────────────────────────────────────────────── */}
      {gs.gameOver && (
        <GameOverScreen
          winner={gs.winner}
          players={gs.players}
          onRestart={onGoToSetup}
        />
      )}

      {/* ── Damage flash ─────────────────────────────────────────────────── */}
      {damagedSet.size > 0 && (
        <div style={{
          position:'fixed', inset:0, pointerEvents:'none', zIndex:250,
          animation: 'damage-flash 0.5s ease-out',
        }} />
      )}
    </div>
  );
};

// ── Root ─────────────────────────────────────────────────────────────────────
const GameBoardRoot = () => {
  const [started, setStarted] = useState(false);
  const [numPlayers, setNumPlayers] = useState(4);
  const [key, setKey] = useState(0);

  if (!started) {
    return <SetupScreen onStart={n => { setNumPlayers(n); setKey(k => k+1); setStarted(true); }} />;
  }
  return (
    <GameBoard
      key={key}
      totalPlayers={numPlayers}
      onGoToSetup={() => setStarted(false)}
    />
  );
};

export default GameBoardRoot;
