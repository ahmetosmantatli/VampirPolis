import './GameTable.css';
import { useState } from 'react';
import RoleGuide from './RoleGuide';

function GameTable({ room, myRole, playerName, onStartNightPhase, seerKnownRoles = {} }) {
  const players = room?.Players || [];
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  
  // Lider mi kontrol et
  const currentPlayer = players.find(p => 
    (p.name === playerName || p.Name === playerName)
  );
  const isLeader = currentPlayer?.isLeader || currentPlayer?.IsLeader || false;

  const getRoleInfo = (role) => {
    const roleMap = {
      'Vampire': { icon: '🧛', name: 'VAMPİR', color: '#dc2626' },
      'Police': { icon: '👮', name: 'POLİS', color: '#3b82f6' },
      'Doctor': { icon: '⚕️', name: 'DOKTOR', color: '#10b981' },
      'SilentWitness': { icon: '👁️', name: 'SESSİZ TANIK', color: '#8b5cf6' },
      'Seer': { icon: '🔮', name: 'KAHİN', color: '#f59e0b' },
      'Hunter': { icon: '🎯', name: 'AVCI', color: '#ea580c' },
      'Innocent': { icon: '👤', name: 'MASUM', color: '#64748b' },
      'Citizen': { icon: '👤', name: 'VATANDAŞ', color: '#64748b' }
    };
    return roleMap[role] || { icon: '❓', name: 'BİLİNMEYEN', color: '#6b7280' };
  };

  return (
    <div className="game-table-container">
      {/* ROL REHBERİ KARTI - Masanın üstünde */}
      <div 
        className="role-guide-card-button"
        onClick={() => setShowRoleGuide(true)}
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          padding: '20px 40px',
          borderRadius: '15px',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(139, 92, 246, 0.7)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.5)';
        }}
      >
        <span style={{ fontSize: '2.5em' }}>📖</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ 
            color: 'white', 
            fontSize: '1.5em', 
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            ROLLER
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '0.9em',
            marginTop: '2px'
          }}>
            Rolleri öğrenmek için tıkla
          </div>
        </div>
      </div>

      {/* 
    <div className="game-table-container">
      {/* 3D Poker Room with Perspective */}
      <div className="poker-room">
        {/* Back Wall with Posters */}
        <div className="back-wall">
          {/* Left Corner - Vampire Poster */}
          <div className="wall-corner left-corner">
            <div className="poster vampire-poster">
              <div className="poster-frame">
                <div className="poster-content">
                  <div className="poster-icon">🧛‍♂️</div>
                  <div className="poster-title">VAMPİR</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Corner - Police Poster */}
          <div className="wall-corner right-corner">
            <div className="poster police-poster">
              <div className="poster-frame">
                <div className="poster-content">
                  <div className="poster-icon">👮‍♂️</div>
                  <div className="poster-title">POLİS</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Rectangular Table */}
        <div className="poker-table-3d">
          <div className="table-surface">
            {/* Cards Row */}
            <div className="cards-row">
              {players.map((player, index) => {
                const isMe = 
                  player.name === playerName || 
                  player.Name === playerName;
                
                const isAlive = player.isAlive !== false && player.IsAlive !== false;
                const playerDisplayName = player.name || player.Name;
                
                // Kahin bu oyuncunun rolünü öğrendi mi?
                const knownRole = seerKnownRoles[playerDisplayName];
                // Ölü oyuncuların rolünü gösterme! Sadece canlılar için
                const showKnownRole = !isMe && knownRole && isAlive;

                return (
                  <div 
                    key={player.connectionId || player.ConnectionId || index} 
                    className={`card-slot ${!isAlive ? 'dead-player' : ''}`}
                  >
                    <div 
                      className="playing-card"
                      onClick={() => isMe && setSelectedPlayer(player)}
                      style={{ cursor: isMe ? 'pointer' : 'default' }}
                    >
                      {isMe ? (
                        // Kendi kartım - Rol açık
                        <div className="card-front my-card">
                          <div className="role-icon">
                            {getRoleInfo(myRole).icon}
                          </div>
                          <div className="role-name">{getRoleInfo(myRole).name}</div>
                        </div>
                      ) : showKnownRole ? (
                        // Kahin öğrendiği oyuncu - Rolü göster
                        <div className="card-front known-card" style={{
                          background: `linear-gradient(135deg, ${getRoleInfo(knownRole).color}, ${getRoleInfo(knownRole).color}dd)`
                        }}>
                          <div className="card-player-name">{playerDisplayName}</div>
                          <div className="known-role-badge">
                            <span className="known-role-icon">{getRoleInfo(knownRole).icon}</span>
                            <span className="known-role-name">{getRoleInfo(knownRole).name}</span>
                          </div>
                        </div>
                      ) : (
                        // Diğer oyuncular - Beyaz kart, üstünde isim
                        <div className="card-front other-card">
                          <div className="card-player-name">{playerDisplayName}</div>
                        </div>
                      )}
                    </div>
                    <div className="player-name-label">
                      {playerDisplayName}
                      {!isAlive && ' ☠️'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Center Info */}
            <div className="table-center">
              <div className="room-info">
                <div className="info-item">Oda: {room?.RoomCode || room?.roomCode}</div>
                <div className="info-item">Oyuncu: {players.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls - START butonu burada */}
      <div className="game-controls">
        <div className="role-hint">
          Senin Rolün: <span className="my-role-text">{myRole}</span>
        </div>
        
        {/* Lider için START butonu - Ekranın altında */}
        {isLeader ? (
          <button 
            className="start-night-btn-bottom"
            onClick={onStartNightPhase}
          >
            🌙 GECE FAZINI BAŞLAT
          </button>
        ) : (
          <div className="waiting-message">
            Lider oyunu başlatmayı bekliyor...
          </div>
        )}
      </div>

      {/* Rol Detay Modal */}
      {selectedPlayer && (
        <div 
          className="role-detail-overlay"
          onClick={() => setSelectedPlayer(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="role-detail-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, ${getRoleInfo(myRole).color}, ${getRoleInfo(myRole).color}dd)`,
              padding: '40px',
              borderRadius: '20px',
              color: 'white',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              border: '3px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <div style={{ fontSize: '5em', marginBottom: '20px' }}>
              {getRoleInfo(myRole).icon}
            </div>
            <h2 style={{ fontSize: '2.5em', margin: '0 0 10px 0' }}>
              {getRoleInfo(myRole).name}
            </h2>
            <p style={{ fontSize: '1.2em', opacity: 0.9, marginBottom: '30px' }}>
              Senin Rolün
            </p>
            <button 
              onClick={() => setSelectedPlayer(null)}
              style={{
                padding: '12px 30px',
                fontSize: '1.1em',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid white',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              KAPAT
            </button>
          </div>
        </div>
      )}

      {/* Rol Rehberi Modal */}
      {showRoleGuide && <RoleGuide onClose={() => setShowRoleGuide(false)} />}
    </div>
  );
}

export default GameTable;
