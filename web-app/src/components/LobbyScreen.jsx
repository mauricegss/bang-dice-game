import React from 'react';

const LobbyScreen = ({ room, user, isHost, onStart, loading, error }) => {
  const players = room?.players || [];
  const canStart = players.length >= 4;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #3d1c0a 0%, #1a0f08 50%, #0a0603 100%)',
      padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg,rgba(61,28,10,0.96),rgba(26,15,8,0.98))',
        border: '3px solid #7b3d14', borderRadius: 24,
        padding: '40px', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,160,23,0.08)',
        maxWidth: 480, width: '100%',
      }}>
        <div style={{ fontFamily: 'Rye,serif', fontSize: '0.8rem', color: '#c8904a', letterSpacing: 3, marginBottom: 8 }}>
          SALA DE ESPERA
        </div>
        <div style={{ fontFamily: 'Rye,serif', fontSize: '2.4rem', color: '#d4a017', marginBottom: 24 }}>
          {room?.code}
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#7b3d14,transparent)', marginBottom: 28 }} />

        <div style={{ textAlign: 'left', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Rye,serif', color: '#f0c842', fontSize: '1rem', margin: 0 }}>
              PISTOLEIROS ({players.length}/8)
            </h3>
            <span style={{ color: '#7b3d14', fontSize: '0.65rem' }}>Aguardando o Xerife...</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {players.map((p, idx) => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: `1px solid ${p.id === user.id ? '#d4a01733' : 'transparent'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#3d1c0a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Rye,serif', color: '#d4a017', fontSize: '0.8rem',
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ color: '#e8d8b8', fontSize: '1rem', fontWeight: 600 }}>
                    {p.name} {p.id === user.id && <span style={{ color: '#7b3d14', fontSize: '0.7rem' }}>(Você)</span>}
                  </span>
                </div>
                {p.id === room.host_id && (
                  <span style={{
                    background: '#d4a017', color: '#1a0805', borderRadius: 4,
                    padding: '2px 8px', fontSize: '0.55rem', fontFamily: 'Rye,serif'
                  }}>
                    XERIFE
                  </span>
                )}
              </div>
            ))}

            {players.length < 4 && (
              <div style={{
                textAlign: 'center', padding: '12px', color: '#7b3d14', fontSize: '0.75rem',
                border: '1px dashed #7b3d14', borderRadius: 12, marginTop: 4,
              }}>
                Mínimo 4 jogadores para iniciar...
              </div>
            )}
          </div>
        </div>

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart || loading}
            style={{
              width: '100%', background: 'linear-gradient(135deg,#8b1a1a,#c22a2a)', color: '#fff',
              border: '2px solid #5a0a0a', borderRadius: 12, padding: '16px',
              fontFamily: 'Rye,serif', fontSize: '1.25rem', cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(139,26,26,0.5)',
              opacity: (!canStart || loading) ? 0.6 : 1,
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => !loading && canStart && (e.target.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !loading && canStart && (e.target.style.transform = 'scale(1)')}
          >
            {loading ? 'INICIANDO...' : '🔫 COMEÇAR PARTIDA!'}
          </button>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid #3d1c0a' }}>
            <div style={{ color: '#c8904a', fontSize: '0.9rem', fontFamily: 'Rye,serif', marginBottom: 4 }}>
              AGUARDANDO INÍCIO
            </div>
            <div style={{ color: '#7b3d14', fontSize: '0.7rem' }}>
              O hospedeiro iniciará a partida em breve.
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 24, color: '#ff4444', fontSize: '0.75rem',
            background: 'rgba(255,0,0,0.1)', padding: '8px', borderRadius: 6
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 32, color: '#7b3d14', fontSize: '0.68rem', lineHeight: 1.6 }}>
          ◆ Compartilhe o código <b style={{ color: '#d4a017' }}>{room?.code}</b> com seus amigos ◆
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
