import React, { useState } from 'react';
import { Roles } from '../game/GameEngine';
import { AbilityPopup } from './GameBoard';

const ROLE_STYLE = {
  [Roles.Sheriff]:  { bg: '#d4a017', color: '#1a0805', label: '⭐ Xerife'      },
  [Roles.Deputy]:   { bg: '#2255cc', color: '#fff',    label: '🔵 Vice'       },
  [Roles.Outlaw]:   { bg: '#8b1a1a', color: '#fff',    label: '💀 Fora-da-Lei' },
  [Roles.Renegade]: { bg: '#2c2c2c', color: '#cccc44', label: '🎭 Renegado'   },
};

const HPPips = ({ current, max }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} style={{
        width: 9, height: 9, borderRadius: '50%',
        background: i < current ? '#cc1111' : 'rgba(255,255,255,0.1)',
        border: i < current ? 'none' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: i < current ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
      }} />
    ))}
  </div>
);

const PlayerCard = ({
  player,
  isCurrentPlayer,
  isTargetable,
  onSelect,
  showRole,
  isDamaged,
}) => {
  const [showAbility, setShowAbility] = useState(false);
  const { id, role, character, health, maxHealth, arrows, alive } = player;
  const roleStyle = ROLE_STYLE[role] ?? { bg: '#555', color: '#fff', label: role };
  const charLabel = character?.replace(/([A-Z])/g, ' $1').trim() ?? '?';

  const cardBorder = isCurrentPlayer
    ? '#d4a017'
    : isTargetable
      ? '#22cc22'
      : '#9b6a2a';

  const cardShadow = isCurrentPlayer
    ? '0 0 0 2px #d4a017, 0 4px 14px rgba(212,160,23,0.4)'
    : isTargetable
      ? '0 0 0 2px #22cc22, 0 4px 14px rgba(34,204,34,0.3)'
      : '0 4px 14px rgba(0,0,0,0.55)';

  return (
    <>
      <div
        onClick={() => isTargetable && onSelect(id)}
        style={{
          width: 132,
          background: alive
            ? 'linear-gradient(160deg, #f5e6c8, #e8d09a)'
            : 'linear-gradient(160deg, #888, #555)',
          border: `2px solid ${cardBorder}`,
          borderRadius: 12,
          padding: '9px 10px 8px',
          position: 'relative',
          overflow: 'visible',
          cursor: isTargetable ? 'pointer' : 'default',
          boxShadow: cardShadow,
          transition: 'all 0.25s',
          outline: isDamaged ? '3px solid #dd0000' : 'none',
          filter: alive ? 'none' : 'grayscale(0.8) brightness(0.6)',
          transform: isTargetable ? 'scale(1.05)' : isCurrentPlayer ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        {/* Info button — triggers portal popup */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setShowAbility(true); }}
          title="Ver habilidade"
          style={{
            position: 'absolute', top: 4, right: 4,
            background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: '50%', width: 17, height: 17,
            fontSize: '0.5rem', cursor: 'pointer', color: '#5c2a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, zIndex: 2, fontFamily: 'sans-serif',
          }}
        >
          i
        </button>

        {/* Player index */}
        <div style={{
          position: 'absolute', top: 5, left: 8,
          fontSize: '0.55rem', color: '#9b6a2a', fontFamily: 'Rye,serif',
        }}>
          P{id + 1}
        </div>

        {/* Character name */}
        <div style={{
          fontFamily: 'Rye,serif', fontSize: '0.68rem',
          color: '#3d1c0a', marginTop: 8, marginBottom: 3, lineHeight: 1.2,
          paddingRight: 12,
        }}>
          {charLabel}
        </div>

        {/* Role badge */}
        {showRole ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: roleStyle.bg, color: roleStyle.color,
            fontSize: '0.55rem', fontWeight: 700, borderRadius: 4,
            padding: '1px 6px', marginBottom: 5,
          }}>
            {roleStyle.label}
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            background: '#444', color: '#aaa',
            fontSize: '0.55rem', fontWeight: 700, borderRadius: 4,
            padding: '1px 6px', marginBottom: 5,
          }}>
            🃏 Oculto
          </div>
        )}

        {/* HP pips */}
        <HPPips current={Math.max(0, health)} max={maxHealth} />
        <div style={{
          fontSize: '0.6rem', color: '#5c2a0a', fontWeight: 700, marginTop: 2,
        }}>
          {Math.max(0, health)} / {maxHealth} HP
        </div>

        {/* Arrows */}
        {arrows > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 4 }}>
            {Array.from({ length: Math.min(arrows, 8) }).map((_, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#5c2a0a', color: '#d4a017',
                borderRadius: 3, fontSize: '0.55rem', width: 14, height: 14,
                fontWeight: 900,
              }}>➵</div>
            ))}
            {arrows > 8 && <span style={{ fontSize: '0.5rem', color: '#c8904a' }}>+{arrows - 8}</span>}
          </div>
        )}

        {/* Dead stamp */}
        {!alive && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'Rye,serif', color: '#8b0000', fontSize: '1.1rem',
              border: '3px solid #8b0000', padding: '0 6px',
              transform: 'rotate(-12deg)', opacity: 0.9,
              background: 'rgba(255,255,255,0.3)',
            }}>
              MORTO
            </span>
          </div>
        )}
      </div>

      {/* Ability portal popup */}
      {showAbility && (
        <AbilityPopup character={character} onClose={() => setShowAbility(false)} />
      )}
    </>
  );
};

export default PlayerCard;
