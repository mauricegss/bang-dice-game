import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Beer as BeerIcon, 
  Zap, 
  Flame, 
  MoveUpRight as ArrowIcon,
} from 'lucide-react';
import { DiceFace, DiceState } from '../game/GameEngine';

// ── Face config per face type ────────────────────────────────────────────────
const FACE = {
  [DiceFace.Arrow]:    { icon: ArrowIcon, bg: '#f5e8c0', border: '#c8990a' },
  [DiceFace.Dynamite]: { icon: Flame, bg: '#ffe0e0', border: '#cc0000' },
  [DiceFace.Shoot1]:   { icon: Target, bg: '#eafff0', border: '#229944' },
  [DiceFace.Shoot2]:   { icon: Target, bg: '#c8f5d8', border: '#116633' },
  [DiceFace.Beer]:     { icon: BeerIcon, bg: '#fff5c0', border: '#cc9900' },
  [DiceFace.Gatling]:  { icon: Zap, bg: '#e8eaff', border: '#3344cc' },
};

// Rotate the cube body so that face appears in FRONT (facing viewer)
const SETTLE_ROTATION = {
  [DiceFace.Arrow]:    { x:   0, y:   0 },  // front face
  [DiceFace.Dynamite]: { x:   0, y: 180 },  // back face
  [DiceFace.Shoot1]:   { x:   0, y:  90 },  // right face
  [DiceFace.Shoot2]:   { x:   0, y: -90 },  // left face
  [DiceFace.Beer]:     { x: -90, y:   0 },  // top face
  [DiceFace.Gatling]:  { x:  90, y:   0 },  // bottom face
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

  // Sync to settled face when not animating
  useEffect(() => {
    if (!isAnimating && die.face) {
      const { x, y } = getSettle(die.face);
      setRotX(x);
      setRotY(y);
    }
  }, [die.face, isAnimating]);

  // Tumble animation when rolling
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
      {/* State label */}
      <div style={{ height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLocked && <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#cc0000', letterSpacing: 1 }}>BOOM</span>}
        {isHeld   && <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#2255cc', letterSpacing: 1 }}>HOLD</span>}
      </div>

      {/* Perspective outer shell — must have explicit inline perspective to work cross-browser */}
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
        {/* 3D rotating cube body */}
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
          {/* FRONT — Arrow */}
          <div style={{ ...faceStyle(FACE[DiceFace.Arrow]), transform: `translateZ(${half}px)` }}>
            {isUnrolled ? <span style={{ opacity: 0.3, fontSize: size * 0.5 }}>?</span> : <ArrowIcon size={size * 0.6} color="#7b3d14" />}
          </div>
          {/* BACK — Dynamite */}
          <div style={{ ...faceStyle(FACE[DiceFace.Dynamite]), transform: `rotateY(180deg) translateZ(${half}px)` }}>
            <Flame size={size * 0.6} color="#cc0000" />
          </div>
          {/* RIGHT — Shoot1 */}
          <div style={{ ...faceStyle(FACE[DiceFace.Shoot1]), transform: `rotateY(90deg) translateZ(${half}px)` }}>
            <Target size={size * 0.6} color="#229944" />
            <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: size * 0.17, fontWeight: 900, color: '#116633', background: 'rgba(255,255,255,0.7)', borderRadius: 3, padding: '0 2px' }}>×1</span>
          </div>
          {/* LEFT — Shoot2 */}
          <div style={{ ...faceStyle(FACE[DiceFace.Shoot2]), transform: `rotateY(-90deg) translateZ(${half}px)` }}>
            <div style={{ position: 'relative' }}>
              <Target size={size * 0.6} color="#116633" />
            </div>
            <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: size * 0.17, fontWeight: 900, color: '#116633', background: 'rgba(255,255,255,0.7)', borderRadius: 3, padding: '0 2px' }}>×2</span>
          </div>
          {/* TOP — Beer */}
          <div style={{ ...faceStyle(FACE[DiceFace.Beer]), transform: `rotateX(90deg) translateZ(${half}px)` }}>
            <BeerIcon size={size * 0.6} color="#cc9900" />
          </div>
          {/* BOTTOM — Gatling */}
          <div style={{ ...faceStyle(FACE[DiceFace.Gatling]), transform: `rotateX(-90deg) translateZ(${half}px)` }}>
            <Zap size={size * 0.6} color="#3344cc" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Dice Tray (5 dice + controls) ───────────────────────────────────────────
const DiceRoller = ({ dice, onToggleHold, onRoll, onResolve, rollsLeft, maxRolls, phase, disabled }) => {
  const [rolling, setRolling] = useState(false);

  const canRoll    = phase === 'Rolling' && rollsLeft > 0 && !disabled && !rolling;
  const canHold    = phase === 'Rolling' && !rolling && rollsLeft < maxRolls;
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
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      background: 'linear-gradient(160deg, rgba(30,10,2,0.96), rgba(42,18,6,0.98))',
      border: '2px solid #7b3d14',
      borderRadius: 18,
      padding: '10px 18px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    }}>
      {/* Felt zone */}
      <div style={{
        background: 'radial-gradient(ellipse at center, #1a6020 0%, #0d3d0d 100%)',
        border: '3px solid #3d1a00',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        gap: 10,
        boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.5)',
      }}>
        {dice.map((die, i) => (
          <Die3D
            key={i}
            die={die}
            index={i}
            size={58}
            onToggleHold={onToggleHold}
            canHold={canHold}
            isRolling={rolling}
          />
        ))}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between' }}>
        {/* Roll counter dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: maxRolls }).map((_, i) => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%',
              background: i < (maxRolls - rollsLeft) ? '#d4a017' : 'rgba(255,255,255,0.12)',
              boxShadow: i < (maxRolls - rollsLeft) ? '0 0 5px #d4a017' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
          <span style={{ marginLeft: 5, fontSize: '0.68rem', color: '#c8904a', fontFamily: 'Rye, serif' }}>
            {rollsLeft > 0 ? `${rollsLeft}×` : 'Esgotado'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRoll}
            disabled={!canRoll}
            style={{
              background: canRoll ? 'linear-gradient(135deg,#d4a017,#f0c842)' : 'rgba(255,255,255,0.07)',
              color: canRoll ? '#1a0805' : '#555',
              border: 'none', borderRadius: 10, padding: '9px 20px',
              fontFamily: 'Rye, serif', fontSize: '0.9rem', fontWeight: 700,
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
              border: 'none', borderRadius: 10, padding: '9px 20px',
              fontFamily: 'Rye, serif', fontSize: '0.9rem', fontWeight: 700,
              cursor: canResolve ? 'pointer' : 'not-allowed',
              boxShadow: canResolve ? '0 4px 12px rgba(180,30,30,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            ✅ Resolver
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiceRoller;
export { Die3D };
