import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Beer as BeerIcon, 
  Zap, 
  Flame, 
  MoveUpRight as ArrowIcon,
} from 'lucide-react';
import { DiceFace, DiceState } from '../game/GameEngine';

// Inject shared keyframes once
const KEYFRAMES = `
  /* Coin-flip: squash at 90deg, full face at 0/180deg */
  @keyframes dice-spin {
    0%   { transform: perspective(80px) rotateY(0deg)   scaleX(1);    filter: brightness(1);   }
    22%  { transform: perspective(80px) rotateY(80deg)  scaleX(0.08); filter: brightness(2);   }
    28%  { transform: perspective(80px) rotateY(100deg) scaleX(0.08); filter: brightness(2);   }
    50%  { transform: perspective(80px) rotateY(180deg) scaleX(1);    filter: brightness(1);   }
    72%  { transform: perspective(80px) rotateY(260deg) scaleX(0.08); filter: brightness(2);   }
    78%  { transform: perspective(80px) rotateY(280deg) scaleX(0.08); filter: brightness(2);   }
    100% { transform: perspective(80px) rotateY(360deg) scaleX(1);    filter: brightness(1);   }
  }
  /* Physical bounce while spinning */
  @keyframes dice-rise {
    0%, 100% { transform: translateY(0px);   }
    40%       { transform: translateY(-10px); }
    70%       { transform: translateY(-4px);  }
  }
  /* Landing thump */
  @keyframes dice-land {
    0%   { transform: scale(1.3)  translateY(-6px); filter: brightness(1.5); }
    55%  { transform: scale(0.88) translateY(0px);  filter: brightness(1);   }
    80%  { transform: scale(1.04) translateY(0px);  }
    100% { transform: scale(1)    translateY(0px);  }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('bang-keyframes')) {
  const s = document.createElement('style');
  s.id = 'bang-keyframes';
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ── Face config per face type ────────────────────────────────────────────────
const FACE = {
  [DiceFace.Arrow]:    { icon: ArrowIcon, bg: '#f5e8c0', border: '#c8990a' },
  [DiceFace.Dynamite]: { icon: Flame, bg: '#ffe0e0', border: '#cc0000' },
  [DiceFace.Shoot1]:   { icon: Target, bg: '#eafff0', border: '#229944', color: '#229944' },
  [DiceFace.Shoot2]:   { icon: Target, bg: '#fef0e0', border: '#d45d17', color: '#d45d17' },
  [DiceFace.Beer]:     { icon: BeerIcon, bg: '#fff5c0', border: '#cc9900' },
  [DiceFace.Gatling]:  { icon: Zap, bg: '#e8eaff', border: '#3344cc' },
};

// Rotate the cube body so that face appears in FRONT (facing viewer)
const SETTLE_ROTATION = {
  [DiceFace.Arrow]:    { x:   0, y:   0 },
  [DiceFace.Dynamite]: { x:   0, y: 180 },
  [DiceFace.Shoot1]:   { x:   0, y: -90 },
  [DiceFace.Shoot2]:   { x:   0, y:  90 },
  [DiceFace.Beer]:     { x: -90, y:   0 },
  [DiceFace.Gatling]:  { x:  90, y:   0 },
};

// ── Single 3-D Die ───────────────────────────────────────────────────────────
const Die3D = ({ die, index, size = 60, onToggleHold, canHold, isRolling }) => {
  const half = size / 2;
  const isHeld     = die.state === DiceState.HeldByPlayer;
  const isLocked   = die.state === DiceState.Locked;
  const isSpent    = die.state === DiceState.Spent;
  const isUnrolled = die.state === DiceState.Unrolled;

  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef(null);

  const getSettle = (face) => SETTLE_ROTATION[face] ?? { x: 0, y: 0 };

  const getClosestRotation = (current, target) => {
    const diff = (target - (current % 360) + 540) % 360 - 180;
    return current + diff;
  };

  useEffect(() => {
    if (!isAnimating && die.face) {
      setRotX(prev => getClosestRotation(prev, getSettle(die.face).x));
      setRotY(prev => getClosestRotation(prev, getSettle(die.face).y));
    }
  }, [die.face, isAnimating]);

  useEffect(() => {
    const locked = die.state === DiceState.Locked || die.state === DiceState.HeldByPlayer;
    if (!isRolling || locked) return;

    setIsAnimating(true);
    let t = 0;
    intervalRef.current = setInterval(() => {
      t++;
      setRotX(prev => prev + (Math.random() > 0.5 ? 90 : -90) * (Math.floor(Math.random() * 2) + 1));
      setRotY(prev => prev + (Math.random() > 0.5 ? 90 : -90) * (Math.floor(Math.random() * 2) + 1));
      if (t >= 16) {
        clearInterval(intervalRef.current);
        setIsAnimating(false);
        const { x, y } = getSettle(die.face);
        setRotX(x);
        setRotY(y);
      }
    }, 65);
    return () => clearInterval(intervalRef.current);
  }, [isRolling, die.state, die.face]);

  const faceCfg = FACE[die.face] ?? FACE[DiceFace.Arrow];
  const borderColor = isLocked ? '#cc0000' : isHeld ? '#2255cc' : faceCfg.border;

  const faceStyle = (cfg) => ({
    width: size,
    height: size,
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.42,
    borderRadius: size * 0.14,
    border: `2px solid ${cfg?.border ?? borderColor}`,
    background: isUnrolled ? '#ddd8c8' : (cfg?.bg ?? faceCfg.bg),
    backfaceVisibility: 'hidden',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.2)',
    userSelect: 'none',
    overflow: 'hidden',
    cursor: canHold && !isSpent && !isUnrolled ? 'pointer' : 'default',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLocked && <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#cc0000', letterSpacing: 1 }}>BOOM</span>}
        {isHeld   && <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#2255cc', letterSpacing: 1 }}>HOLD</span>}
      </div>

      <div
        style={{
          perspective: '320px',
          perspectiveOrigin: '50% 50%',
          width: size,
          height: size,
          opacity: isSpent ? 0.2 : 1,
          transition: 'opacity 0.3s',
          cursor: canHold && !isSpent && !isUnrolled ? 'pointer' : 'default',
        }}
        onClick={() => canHold && !isSpent && !isUnrolled && onToggleHold(index)}
        title={canHold && !isSpent && !isUnrolled ? (isHeld ? 'Soltar dado' : 'Guardar dado') : ''}
      >
        <div style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: isAnimating
            ? 'transform 0.065s linear'
            : 'transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}>
          <div style={{ ...faceStyle(FACE[DiceFace.Arrow]), transform: `translateZ(${half}px)` }}>
            {isUnrolled ? <span style={{ opacity: 0.3, fontSize: size * 0.5 }}>?</span> : <ArrowIcon size={size * 0.6} color="#7b3d14" />}
          </div>
          <div style={{ ...faceStyle(FACE[DiceFace.Dynamite]), transform: `rotateY(180deg) translateZ(${half}px)` }}>
            <Flame size={size * 0.6} color="#cc0000" />
          </div>
          <div style={{ ...faceStyle(FACE[DiceFace.Shoot1]), transform: `rotateY(90deg) translateZ(${half}px)` }}>
            <Target size={size * 0.6} color="#229944" />
            <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: size * 0.17, fontWeight: 900, color: '#116633', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '0 2px' }}>×1</span>
          </div>
          <div style={{ ...faceStyle(FACE[DiceFace.Shoot2]), transform: `rotateY(-90deg) translateZ(${half}px)` }}>
            <Target size={size * 0.6} color="#d45d17" />
            <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: size * 0.17, fontWeight: 900, color: '#d45d17', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '0 2px' }}>×2</span>
          </div>
          <div style={{ ...faceStyle(FACE[DiceFace.Beer]), transform: `rotateX(90deg) translateZ(${half}px)` }}>
            <BeerIcon size={size * 0.6} color="#cc9900" />
          </div>
          <div style={{ ...faceStyle(FACE[DiceFace.Gatling]), transform: `rotateX(-90deg) translateZ(${half}px)` }}>
            <Zap size={size * 0.6} color="#3344cc" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Action Bar (Roll + Resolve buttons only) ──────────────────────────────────
const DiceRoller = ({ dice, onRoll, onResolve, rollsLeft, maxRolls, phase, disabled, isMyTurn }) => {
  const [rolling, setRolling] = useState(false);

  const canRoll    = phase === 'Rolling' && rollsLeft > 0 && !disabled && !rolling && isMyTurn;
  const allRolled  = dice.every(d => d.state !== 'Unrolled');
  const canResolve = phase === 'Rolling' && allRolled && !rolling && !disabled;

  const handleRoll = () => {
    if (!canRoll) return;
    setRolling(true);
    onRoll();
    setTimeout(() => setRolling(false), 1150);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 15,
      background: 'linear-gradient(160deg, rgba(30,10,2,0.96), rgba(42,18,6,0.98))',
      border: '2px solid #7b3d14',
      borderRadius: 12,
      padding: '10px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleRoll}
          disabled={!canRoll}
          className={canRoll && isMyTurn ? 'pulse-gold' : ''}
          style={{
            background: canRoll ? 'linear-gradient(135deg,#d4a017,#f0c842)' : 'rgba(255,255,255,0.07)',
            color: canRoll ? '#1a0805' : '#555',
            border: 'none', borderRadius: 8, padding: '10px 24px',
            fontFamily: 'Rye, serif', fontSize: '1rem', fontWeight: 700,
            cursor: canRoll ? 'pointer' : 'not-allowed',
            boxShadow: canRoll ? '0 4px 12px rgba(212,160,23,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🎲 Rolar
        </button>

        <button
          onClick={onResolve}
          disabled={!canResolve}
          style={{
            background: canResolve ? 'linear-gradient(135deg,#8b1a1a,#c22a2a)' : 'rgba(255,255,255,0.07)',
            color: canResolve ? '#fff' : '#555',
            border: 'none', borderRadius: 8, padding: '10px 24px',
            fontFamily: 'Rye, serif', fontSize: '1rem', fontWeight: 700,
            cursor: canResolve ? 'pointer' : 'not-allowed',
            boxShadow: canResolve ? '0 4px 12px rgba(180,30,30,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          ✅ Resolver
        </button>
      </div>
    </div>
  );
};

// ── BLANK_DICE: inactive player placeholder ───────────────────────────────────
export const BLANK_DICE = Array(5).fill(null).map(() => ({
  face: DiceFace.Arrow,
  state: DiceState.Unrolled,
}));

// ── Player Dice Tray (Universal 2D Layout) ────────────────────────────────────
// isCurrentPlayer = is it THIS player's turn right now (controls animation)
// isActive        = is the tray highlighted/expanded (same as isCurrentPlayer usually)
// canHold / onToggleHold = only pass truthy for local player
// rollsLeftCount / maxRolls = optional, renders dots BELOW the tray
export const PlayerDiceTray = ({
  dice, phase, rollsLeft,
  isActive = false,
  isCurrentPlayer = false,
  alwaysExpanded = false,
  canHold = false,
  onToggleHold = () => {},
  rollsLeftCount,
  maxRolls,
}) => {
  const [rolling, setRolling] = useState(false);
  const [landing, setLanding] = useState(false);
  const prevRollsLeft = useRef(rollsLeft);
  const [cycleIndices, setCycleIndices] = useState(null);
  const FACE_KEYS = Object.values(DiceFace);

  useEffect(() => {
    if (!isCurrentPlayer || rollsLeft >= prevRollsLeft.current) {
      prevRollsLeft.current = rollsLeft;
      return;
    }
    prevRollsLeft.current = rollsLeft;
    setRolling(true);
    setLanding(false);

    const SCHEDULE = [40, 40, 45, 50, 55, 60, 70, 80, 95, 115, 140, 170, 200];
    let idx = 0;
    let cycleTimer;
    const cycle = () => {
      setCycleIndices(Array.from({ length: 5 }, () => Math.floor(Math.random() * FACE_KEYS.length)));
      idx = Math.min(idx + 1, SCHEDULE.length - 1);
      cycleTimer = setTimeout(cycle, SCHEDULE[idx]);
    };
    cycleTimer = setTimeout(cycle, SCHEDULE[0]);

    const endTimer = setTimeout(() => {
      clearTimeout(cycleTimer);
      setCycleIndices(null);
      setRolling(false);
      setLanding(true);
      setTimeout(() => setLanding(false), 420);
    }, 1100);

    return () => { clearTimeout(cycleTimer); clearTimeout(endTimer); };
  }, [rollsLeft, phase, isCurrentPlayer]);

  const expanded = alwaysExpanded || isActive;

  return (
    // Outer column: tray on top, dots below
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>

      {/* The actual dice tray (horizontal inline-flex) */}
      <div style={{
        background: 'linear-gradient(180deg, #3d1c0a 0%, #1a0805 100%)',
        border: `2px solid ${expanded ? '#d4a017' : '#3d1800'}`,
        borderRadius: 12,
        padding: '8px 14px',
        display: 'inline-flex',
        gap: expanded ? 8 : 5,
        boxShadow: expanded
          ? '0 8px 24px rgba(212,160,23,0.3), inset 0 2px 4px rgba(255,255,255,0.05)'
          : '0 2px 8px rgba(0,0,0,0.5)',
        position: 'relative',
        opacity: (alwaysExpanded || isActive) ? 1 : 0.45,
        transform: (alwaysExpanded || isActive) ? 'scale(1)' : 'scale(0.8)',
        transformOrigin: 'top center',
        transition: 'all 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)',
      }}>
        {/* Felt inner */}
        <div style={{
          position: 'absolute', inset: 4, borderRadius: 8,
          background: 'radial-gradient(ellipse at center, #1a6020 0%, #0d3d0d 100%)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.7)',
          zIndex: 0,
        }} />

        {dice.map((d, i) => {
          const isSpent  = d.state === DiceState.Spent;
          const isLocked = d.state === DiceState.Locked;
          const isHeld   = d.state === DiceState.HeldByPlayer;
          const clickable = canHold && d.state !== DiceState.Spent && d.state !== DiceState.Unrolled;

          const displayFace = (rolling && !isHeld && cycleIndices !== null)
            ? FACE_KEYS[cycleIndices[i] ?? 0]
            : d.face;
          const cfg = FACE[rolling && !isHeld && cycleIndices !== null ? displayFace : d.face] ?? FACE[DiceFace.Arrow];
          const Icon = cfg.icon;

          return (
            <div
              key={i}
              onClick={() => clickable && onToggleHold(i)}
              title={clickable ? (isHeld ? 'Soltar' : 'Guardar') : ''}
              style={{
                width: 34, height: 34, borderRadius: 6,
                background: d.state === DiceState.Unrolled ? '#ddd8c8' : cfg.bg,
                border: `2px solid ${isLocked ? '#cc0000' : isHeld ? '#2255cc' : cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
                opacity: isSpent ? 0.25 : 1,
                boxShadow: isHeld
                  ? '0 0 12px rgba(34,85,204,0.7)'
                  : '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.8)',
                animation: rolling && !isHeld
                  ? [
                      `dice-spin ${0.16 + i * 0.025}s linear infinite ${i * 50}ms`,
                      `dice-rise ${0.32 + i * 0.05}s ease-in-out infinite ${i * 50}ms`,
                    ].join(', ')
                  : landing && !isHeld
                  ? `dice-land 0.38s ease-out ${i * 40}ms both`
                  : 'none',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                transform: isHeld ? 'translateY(-5px)' : 'translateY(0)',
              }}
            >
              {(isHeld || (isLocked && !rolling)) && (
                <span style={{
                  position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 7, fontWeight: 900, color: '#fff', letterSpacing: 0.5,
                  background: isLocked ? '#cc0000' : '#2255cc',
                  padding: '1px 4px', borderRadius: 3,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                }}>
                  {isLocked ? 'BOOM' : 'HOLD'}
                </span>
              )}

              {d.state === DiceState.Unrolled ? (
                <span style={{ fontSize: 15, opacity: 0.35, fontFamily: 'sans-serif' }}>?</span>
              ) : (
                <Icon size={19} color={cfg.color || (isLocked ? '#cc0000' : '#7b3d14')} />
              )}

              {(d.face === DiceFace.Shoot1 || d.face === DiceFace.Shoot2) && d.state !== DiceState.Unrolled && (
                <span style={{
                  position: 'absolute', bottom: 1, right: 2,
                  fontSize: 9, fontWeight: 900, color: cfg.color, lineHeight: 1,
                }}>
                  ×{d.face === DiceFace.Shoot1 ? 1 : 2}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Roll counter dots — BELOW the tray */}
      {isCurrentPlayer && maxRolls != null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {Array.from({ length: maxRolls }).map((_, i) => (
            <div key={i} style={{
              width: expanded ? 9 : 7,
              height: expanded ? 9 : 7,
              borderRadius: '50%',
              background: i < (maxRolls - (rollsLeftCount ?? 0)) ? '#d4a017' : 'rgba(255,255,255,0.15)',
              boxShadow: i < (maxRolls - (rollsLeftCount ?? 0)) ? '0 0 5px #d4a017' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
          <span style={{ marginLeft: 4, fontSize: expanded ? '0.7rem' : '0.55rem', color: '#c8904a', fontFamily: 'Rye,serif' }}>
            {(rollsLeftCount ?? 0) > 0 ? `${rollsLeftCount}×` : 'Fim'}
          </span>
        </div>
      )}
    </div>
  );
};

export default DiceRoller;
export { Die3D };
