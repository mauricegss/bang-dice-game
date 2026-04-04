import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Phase, Roles, DiceFace, SpecialAction, characterAbilities } from '../game/GameEngine';
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

// ── Mini Dice Zone ──────────────────────────────────────────────────────────
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
          background: d.state === 'Unrolled' ? 'rgba(255,255,255,0.07)' : 
                     d.state === 'Locked' ? 'rgba(200,0,0,0.2)' : 
                     d.state === 'Spent' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
          border: d.state === 'Locked' ? '1px solid rgba(200,0,0,0.6)' : 
                 d.state === 'HeldByPlayer' ? '1px solid rgba(34,85,204,0.7)' : '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
          opacity: d.state === 'Spent' ? 0.2 : 1, transition: 'all 0.3s',
        }}>
          {d.state === 'Unrolled' ? '\u00b7' : FACE_EMOJI[d.face] ?? '·'}
        </div>
      ))}
    </div>
  );
};

// ── Arrow Tracker in table center ───────────────────────────────────────────
const ArrowCenter = ({ count }) => (
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

// ── Side Panel ──────────────────────────────────────────────────────────────
const SidePanel = ({ players = [], logs = [], currentPlayerIdx }) => {
  const [tab, setTab] = useState('events');
  const logEndRef = useRef(null);
  useEffect(() => {
    if (tab === 'events') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, tab]);

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 320, zIndex: 30,
      background: 'linear-gradient(180deg, rgba(16,6,2,0.98) 0%, rgba(10,4,2,1) 100%)',
      borderLeft: '2px solid #3d1c0a', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.7)',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #3d1c0a' }}>
        {['events', 'chars', 'rules'].map(id => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '8px 0', fontSize: '0.55rem', fontFamily: 'Rye,serif', cursor: 'pointer',
            background: tab === id ? 'rgba(212,160,23,0.1)' : 'transparent',
            color: tab === id ? '#d4a017' : '#7b3d14', borderBottom: tab === id ? '2px solid #d4a017' : '2px solid transparent',
          }}>
            {id === 'events' ? '📜 Log' : id === 'chars' ? '👥 Players' : '📖 Rules'}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {tab === 'events' && logs.map((m, i) => (
          <div key={i} style={{ fontSize: '0.63rem', color: '#c8904a', lineHeight: 1.5, padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {m}
          </div>
        ))}
        {tab === 'chars' && players.map((p, idx) => (
          <div key={idx} style={{ 
            background: idx === currentPlayerIdx ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${idx === currentPlayerIdx ? '#f0c842' : '#3d1c0a'}`,
            borderRadius: 12, padding: '14px', marginBottom: 12, opacity: p.alive ? 1 : 0.5,
            transition: 'all 0.3s', position: 'relative',
            boxShadow: idx === currentPlayerIdx ? '0 0 15px rgba(212,160,23,0.1)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Rye,serif', fontSize: '0.85rem', color: '#f0c842' }}>
                {p.name || charLabel(p.character)}
              </div>
              <div style={{ fontSize: '0.6rem', background: '#3d1c0a', padding: '3px 8px', borderRadius: 4, color: '#c8904a', border: '1px solid #5c2a0a' }}>
                 {fmtRole(p.role === Roles.Sheriff || !p.alive || players.length === 3 ? p.role : '???')}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
               <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.5rem', color: '#7b3d14', marginBottom: 2, letterSpacing: 1 }}>VIDA</div>
                  <div style={{ fontSize: '0.9rem', color: p.health <= 2 ? '#ff4444' : '#e8d8b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '1rem' }}>❤️</span> {p.health} / {p.maxHealth}
                  </div>
               </div>
               <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.5rem', color: '#7b3d14', marginBottom: 2, letterSpacing: 1 }}>FLECHAS</div>
                  <div style={{ fontSize: '0.9rem', color: p.arrows > 0 ? '#d4a017' : '#7b3d14', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '1rem' }}>➵</span> {p.arrows}
                  </div>
               </div>
            </div>

            <div style={{ 
              padding: '10px', background: 'rgba(212,160,23,0.05)', borderRadius: 8, 
              fontSize: '0.65rem', color: '#b8a07c', lineHeight: 1.5, borderLeft: '3px solid #d4a01755'
            }}>
               <b style={{ color: '#d4a017', display: 'block', marginBottom: 4, fontSize: '0.55rem', letterSpacing: 1 }}>HABILIDADE:</b>
               {characterAbilities[p.character] || 'Habilidade desconhecida'}
            </div>
            {!p.alive && (
              <div style={{ 
                position: 'absolute', inset: 0, background: 'rgba(10,4,2,0.6)', 
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '2rem', pointerEvents: 'none', filter: 'grayscale(1)' 
              }}>💀️</div>
            )}
            {idx === currentPlayerIdx && (
               <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 4, height: '40%', background: '#d4a017', borderRadius: 2 }} />
            )}
          </div>
        ))}
        {tab === 'rules' && (
          <div style={{ fontSize: '0.68rem', color: '#c8904a', lineHeight: 1.7 }}>
            <h4 style={{ color: '#f0c842', marginBottom: 8, fontSize: '0.8rem', fontFamily: 'Rye,serif' }}>CÓDIGO DE CONDUTA</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p>• <b>Dinamites 💥:</b> Ao tirar 3, seu turno acaba imediatamente e você perde 1 HP. Elas não podem ser re-roladas!</p>
              <p>• <b>Flechas ➵:</b> Se você pegar a última flecha do centro (9ª), todos os jogadores com flechas perdem vida igual ao número de flechas que possuem.</p>
              <p>• <b>Metralhadora 🔫:</b> Três símbolos de Gatling ativam um ataque devastador contra todos os outros jogadores e removem todas as suas flechas.</p>
              <p>• <b>Cerveja 🍺:</b> Pode ser usada em você mesmo ou em qualquer aliado. Use com sabedoria para manter o Xerife (ou seus comparsas) vivo!</p>
            </div>
            <div style={{ marginTop: 15, padding: '10px', background: 'rgba(212,160,23,0.05)', borderRadius: 8, border: '1px solid rgba(212,160,23,0.1)' }}>
              <b style={{ color: '#f0c842', fontSize: '0.6rem', letterSpacing: 1 }}>DISTRIBUIÇÃO ({players.length} JOGADORES):</b><br/>
              <div style={{ fontSize: '0.6rem', marginTop: 4, color: '#e8d8b8' }}>
                {players.length === 3 ? '1 Assistente, 1 Fora-da-Lei, 1 Renegado (Modo Especial)' :
                 players.length === 4 ? '1 Xerife, 1 Renegado, 2 Foras-da-Lei' :
                 players.length === 5 ? '1 Xerife, 1 Renegado, 2 Foras-da-Lei, 1 Assistente' :
                 players.length === 6 ? '1 Xerife, 1 Renegado, 3 Foras-da-Lei, 1 Assistente' :
                 players.length === 7 ? '1 Xerife, 1 Renegado, 3 Foras-da-Lei, 2 Assistentes' :
                 '1 Xerife, 2 Renegados, 3 Foras-da-Lei, 2 Assistentes'}
              </div>
            </div>

            <div style={{ marginTop: 15, padding: '10px', background: 'rgba(212,160,23,0.05)', borderRadius: 8, border: '1px solid rgba(212,160,23,0.1)' }}>
              <b style={{ color: '#f0c842' }}>CONDIÇÕES DE VITÓRIA:</b><br/>
              <span style={{ fontSize: '0.62rem' }}>
                {players.length === 3 ? (
                  <>
                    <b>Objetivo Circular:</b> Elimine pessoalmente seu alvo específico.<br/>
                    <b>Duelo:</b> Se seu alvo morrer para outro, seja o único sobrevivente.
                  </>
                ) : (
                  <>
                    <b>Xerife/Vices:</b> Eliminar todos os Foras-da-Lei e o Renegado.<br/>
                    <b>Foras-da-Lei:</b> Eliminar o Xerife.<br/>
                    <b>Renegado:</b> Ser o último sobrevivente (deve matar o Xerife por último).
                  </>
                )}
              </span>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

// ── Game Over Screen ─────────────────────────────────────────────────────────
const GameOverScreen = ({ winner, onRestart }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontFamily: 'Rye,serif', fontSize: '3rem', color: '#d4a017', textShadow: '0 0 20px #d4a01755' }}>{winner} Venceu!</div>
    <button onClick={onRestart} style={{ marginTop: 24, padding: '12px 32px', background: '#d4a017', color: '#1a0805', border: 'none', borderRadius: 8, fontFamily: 'Rye,serif', cursor: 'pointer' }}>VOLTAR AO LOBBY</button>
  </div>
);

// ── GameBoard ───────────────────────────────────────────────────────────────
const GameBoard = ({ room, user, gameState, performAction, onExit }) => {
  const [damagedSet, setDamagedSet] = useState(new Set());
  const gsData = gameState; // This is our source of truth

  // Visual effects when damage happens
  useEffect(() => {
    if (gsData?.damagedThisTick?.length > 0) {
      setDamagedSet(new Set(gsData.damagedThisTick));
      const t = setTimeout(() => setDamagedSet(new Set()), 800);
      return () => clearTimeout(t);
    }
  }, [gsData?.damagedThisTick]);

  // Viewport
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handle = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const availW = vp.w - 320; // Side panel
  const centerX = availW / 2;
  const centerY = vp.h * 0.40;
  const tableR = Math.min(availW * 0.25, vp.h * 0.25, 220);
  const orbitR = tableR + 105;

  // ── Perspective Logic ──────────────────────────────────────────────────────
  // Find local player's index in the engine's players array
  const localPlayerIdx = useMemo(() => {
    return gsData?.players?.findIndex(p => p.socket_id === user.id) ?? -1;
  }, [gsData?.players, user.id]);

  const players = gsData?.players || [];
  const currentP = players[gsData.currentPlayerIdx];
  const isMyTurn = gsData.currentPlayerIdx === localPlayerIdx;

  // Reorder players for the UI so local player is always at the bottom (index 0 for orbit)
  const orderedOpponents = useMemo(() => {
    if (localPlayerIdx === -1) return players; // should not happen
    // Shift the players array so local player is "first"
    const shift = [...players.slice(localPlayerIdx), ...players.slice(0, localPlayerIdx)];
    // Return all except the first one (which is us)
    return shift.slice(1);
  }, [players, localPlayerIdx]);

  const opponentPositions = useMemo(() => {
    const pos = {};
    const count = orderedOpponents.length;
    orderedOpponents.forEach((p, i) => {
      // Map i in count to 270 degree arc across top
      const start = -Math.PI * 0.55;
      const end = Math.PI * 0.55;
      const angle = count === 1 ? -Math.PI / 2 : start + (i / (count - 1)) * (end - start);
      pos[p.id] = {
        x: Math.cos(angle - Math.PI / 2) * orbitR,
        y: Math.sin(angle - Math.PI / 2) * orbitR * 0.8,
      };
    });
    return pos;
  }, [orderedOpponents, orbitR]);

  // Actions
  const handleRoll = () => {
    if (gsData.phase !== Phase.Rolling || gsData.rollsLeft <= 0) return;
    performAction((engine) => engine.roll());
  };
  const handleToggleHold = (i) => performAction((engine) => engine.toggleHold(i));
  const handleResolve = () => performAction((engine) => engine._beginResolution());
  const handleSelectTarget = (id) => performAction((engine) => engine.selectTarget(id));
  const handleUseAbility = () => performAction((engine) => engine.useAbility());

  // Ability helpers
  const canUseAbility = !gsData.gameOver && gsData.phase === Phase.Rolling && isMyTurn &&
    ['SidKetchum','SlabOAssassino','JaneCalamidade','KitCarlson','BartCassidy'].includes(currentP?.character) &&
    !gsData.abilityUsedThisTurn;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0a0603' }}>
      {/* Background Decor */}
      <div style={{ position:'absolute', inset:0, background: 'radial-gradient(ellipse at 50% 0%, #3d1c0a 0%, #0a0603 100%)' }} />
      <div style={{ position:'absolute', top:-50, left:centerX, transform:'translateX(-50%)', width:600, height:400, background:'radial-gradient(ellipse, #d4a01712 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* ── Round Table ─────────────────────────────────────────────────── */}
      <div style={{
        position:'absolute', left: centerX, top: centerY, transform:'translate(-50%, -50%)',
        width: tableR * 2, height: tableR * 2, borderRadius:'50%',
        background:'radial-gradient(ellipse at 38% 35%, #216321 0%, #082208 100%)',
        boxShadow: 'inset 0 0 60px #0009, 0 0 0 16px #5c2a0a, 0 12px 60px #000c',
        border:'12px solid #6b3010', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <ArrowCenter count={gsData.arrowsInCenter} />
      </div>

      {/* ── Opponents ───────────────────────────────────────────────────── */}
      {orderedOpponents.map(p => {
        const pos = opponentPositions[p.id];
        return (
          <div key={p.id} style={{ position:'absolute', left: centerX + pos.x, top: centerY + pos.y, transform:'translate(-50%,-50%)', zIndex:10, textAlign:'center' }}>
            <PlayerCard
              player={p}
              isCurrentPlayer={gsData.currentPlayerIdx === p.id}
              isTargetable={gsData.validTargets.includes(p.id)}
              onSelect={handleSelectTarget}
              showRole={p.role === Roles.Sheriff || !p.alive || players.length === 3}
              isDamaged={damagedSet.has(p.id)}
            />
            {gsData.currentPlayerIdx === p.id && <MiniDiceZone dice={gsData.dice} isActive={false} />}
          </div>
        );
      })}

      {/* ── Local Player HUD ────────────────────────────────────────────── */}
      {!gsData.gameOver && players[localPlayerIdx] && (
        <div style={{ position:'fixed', bottom:16, left: centerX, transform:'translateX(-50%)', zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ color: isMyTurn ? '#f0c842' : '#7b3d14', fontFamily:'Rye,serif', fontSize:'0.75rem', background:'#000c', padding:'5px 15px', borderRadius:20, border: `1px solid ${isMyTurn?'#d4a017':'#3d1c0a'}`, display:'flex', alignItems:'center', gap:10 }}>
            {isMyTurn ? 'SUA VEZ DE AGIR' : `AGUARDANDO TURNO DE ${currentP?.name || 'OUTRO JOGADOR'}`}
            
            {isMyTurn && gsData.phase === Phase.Resolving && gsData.pendingType && (
              <div style={{ display:'flex', alignItems:'center', gap:5, marginLeft: 10, paddingLeft: 10, borderLeft: '1px solid rgba(212,160,23,0.3)' }}>
                <span style={{ fontSize: '0.6rem', color: '#d4a017', opacity: 0.8 }}>RESOLVENDO:</span>
                <span style={{ fontSize: '0.7rem', color: '#fff' }}>
                  {gsData.pendingType === DiceFace.Shoot1 ? '🎯 Alvo 1' : 
                   gsData.pendingType === DiceFace.Shoot2 ? '🎯 Alvo 2' : gsData.pendingType}
                </span>
              </div>
            )}
          </div>
          
          <div style={{ display:'flex', alignItems:'flex-end', gap:15 }}>
             <PlayerCard 
                player={players[localPlayerIdx]} 
                isCurrentPlayer={isMyTurn}
                isTargetable={gsData.validTargets.includes(localPlayerIdx)}
                onSelect={handleSelectTarget}
                showRole={true}
                isDamaged={damagedSet.has(localPlayerIdx)}
             />
              <DiceRoller
                 dice={gsData.dice}
                 onToggleHold={handleToggleHold}
                 onRoll={handleRoll}
                 onResolve={handleResolve}
                 rollsLeft={gsData.rollsLeft}
                 maxRolls={gsData.maxRolls}
                 phase={gsData.phase}
                 disabled={!isMyTurn || gsData.gameOver}
                 isMyTurn={isMyTurn}
              />
          </div>

          {isMyTurn && gsData.phase === Phase.Resolving && currentP?.character === 'JaneCalamidade' && (gsData.pendingType === DiceFace.Shoot1 || gsData.pendingType === DiceFace.Shoot2) && (
            <button onClick={handleUseAbility} style={{ background: gsData.swapRange ? '#d4a017' : '#3d1c0a', color: gsData.swapRange ? '#1a0805' : '#d4a017', border: '1px solid #d4a017', borderRadius: 8, padding: '8px 24px', fontFamily: 'Rye,serif', cursor: 'pointer', boxShadow: '0 4px 10px #000c' }}>
              🎯 ALTERNAR ALCANCE (D{gsData.swapRange ? '2→1' : '1→2'})
            </button>
          )}

          {canUseAbility && (
            <button onClick={handleUseAbility} style={{ background: gsData.pendingAction !== SpecialAction.None ? '#8b1a1a' : '#2255cc', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontFamily: 'Rye,serif', cursor: 'pointer', boxShadow: '0 4px 10px #000c' }}>
              ⚡ USAR HABILIDADE: {charLabel(currentP.character)}
            </button>
          )}

          {gsData.players.length === 3 && players[localPlayerIdx]?.alive && (
            <div style={{ background:'rgba(0,0,0,0.6)', padding:'4px 12px', border:'1px dashed #d4a017', borderRadius:8, fontSize:'0.6rem', color:'#f0c842', animation:'pulse 2s infinite' }}>
              🎯 OBJETIVO: {gsData.duelMode ? 'ELIMINAR TODOS' : `ELIMINAR ${players[gsData.playerObjectives[localPlayerIdx]]?.name || 'ALVO'}`}
            </div>
          )}
        </div>
      )}

      {/* Exit Button */}
      <button 
        onClick={onExit}
        style={{ position:'fixed', top:16, left:16, background:'#3d1c0a', color:'#c8904a', border:'1px solid #5c2a0a', borderRadius:8, padding:'6px 12px', fontFamily:'Rye,serif', cursor:'pointer', zIndex:50 }}
      >
        ↩ Sair
      </button>

      <SidePanel players={players} logs={gsData.logs} currentPlayerIdx={gsData.currentPlayerIdx} />
      {gsData.gameOver && <GameOverScreen winner={gsData.winner} onRestart={onExit} />}
    </div>
  );
};

export default GameBoard;
