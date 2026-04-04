import React, { useState } from 'react';

const MainMenu = ({ onJoin, onCreate, onSolo, user, loading, error, initialCode }) => {
  const [name, setName] = useState(user.name || '');
  const [code, setCode] = useState(initialCode || '');

  // Auto-join if both name and initialCode exist
  React.useEffect(() => {
    if (initialCode && user.name && !loading) {
      onJoin(initialCode, user.name);
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #3d1c0a 0%, #1a0f08 50%, #0a0603 100%)',
      padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg,rgba(61,28,10,0.96),rgba(26,15,8,0.98))',
        border: '3px solid #7b3d14', borderRadius: 24,
        padding: '44px 48px', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,160,23,0.08)',
        maxWidth: 420, width: '100%',
      }}>
        <div style={{
          fontFamily: 'Rye,serif', fontSize: '3.4rem', color: '#d4a017',
          textShadow: '0 0 40px rgba(212,160,23,0.5), 2px 2px 0 #3d1c0a', lineHeight: 1, marginBottom: 4
        }}>
          BANG!
        </div>
        <div style={{ fontFamily: 'Rye,serif', fontSize: '1.1rem', color: '#c8904a', letterSpacing: 5, marginBottom: 24 }}>
          WEB GAME
        </div>

        {/* Game Selection */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <div style={{
            flex: 1, padding: '16px 8px', borderRadius: 12,
            background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 0 15px rgba(212,160,23,0.2)'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🎲</div>
            <div style={{ fontFamily: 'Rye,serif', fontSize: '0.7rem', color: '#f0c842' }}>DICE GAME</div>
          </div>

          <div style={{
            flex: 1, padding: '16px 8px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '2px solid #3d1c0a',
            opacity: 0.5, cursor: 'not-allowed', position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🎴</div>
            <div style={{ fontFamily: 'Rye,serif', fontSize: '0.7rem', color: '#7b3d14' }}>CARD GAME</div>
            <div style={{
              position: 'absolute', top: 6, right: -15, background: '#7b3d14',
              color: '#d4a017', fontSize: '0.45rem', padding: '2px 15px',
              transform: 'rotate(45deg)', fontWeight: 'bold', whiteSpace: 'nowrap'
            }}>
              BREVE
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontFamily: 'Rye,serif', color: '#c8904a', fontSize: '0.8rem', marginBottom: 8 }}>
            SEU APELIDO
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Billy the Kid"
            style={{
              width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #7b3d14',
              borderRadius: 8, padding: '12px 16px', color: '#f0c842',
              fontFamily: 'Inter, sans-serif', fontSize: '1rem', textAlign: 'center',
              outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#d4a017'}
            onBlur={(e) => e.target.style.borderColor = '#7b3d14'}
          />
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#7b3d14,transparent)', marginBottom: 28 }} />

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => onCreate(name)}
            disabled={loading || !name}
            style={{
              background: 'linear-gradient(135deg,#d4a017,#f0c842)', color: '#1a0805',
              border: 'none', borderRadius: 12, padding: '14px',
              fontFamily: 'Rye,serif', fontSize: '1.2rem', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(212,160,23,0.4)',
              transition: 'transform 0.1s',
              opacity: (loading || !name) ? 0.6 : 1,
            }}
          >
            {loading ? 'CRIANDO...' : '🏛️ CRIAR SALA'}
          </button>

          <button
            onClick={() => onSolo(name)}
            disabled={loading || !name}
            style={{
              background: 'rgba(212,160,23,0.1)', color: '#d4a017',
              border: '1px solid #d4a017', borderRadius: 12, padding: '12px',
              fontFamily: 'Rye,serif', fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: (loading || !name) ? 0.6 : 1,
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(212,160,23,0.2)'}
            onMouseLeave={e => e.target.style.background = 'rgba(212,160,23,0.1)'}
          >
            🤖 SOLO DEBUG (BOTS)
          </button>

          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#3d1c0a' }} />
            <span style={{ color: '#5c2a0a', fontSize: '0.7rem' }}>OU</span>
            <div style={{ flex: 1, height: 1, background: '#3d1c0a' }} />
          </div>

          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid #7b3d14',
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={6}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                padding: '14px 16px', color: '#ffecaf',
                fontFamily: 'Rye,serif', fontSize: '1.1rem', textAlign: 'center',
                outline: 'none', letterSpacing: 4, minWidth: 0
              }}
            />
            <button
              onClick={() => onJoin(code, name)}
              disabled={loading || !name || code.length < 4}
              style={{
                padding: '0 20px',
                background: 'linear-gradient(135deg,#8b1a1a,#c22a2a)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Rye,serif', fontSize: '0.8rem',
                opacity: (loading || !name || code.length < 4) ? 0.5 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              ENTRAR
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 24, color: '#ff4444', fontSize: '0.75rem',
            background: 'rgba(255,0,0,0.1)', padding: '8px', borderRadius: 6, border: '1px solid #ff444455'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 24, color: '#7b3d14', fontSize: '0.65rem', lineHeight: 1.6 }}>
          © 2026 Bang! Web Game • Suporte via Supabase
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
