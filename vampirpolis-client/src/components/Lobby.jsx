import signalR from '../services/signalRService';
import { useEffect, useState } from 'react';
import RoleGuide from './RoleGuide';

function Lobby({ room, roomCode, playerName, onStartGameClick }) {
  const isLeader = room?.Players?.find(p => p.Name === playerName)?.IsLeader;
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  
  useEffect(() => {
    console.log('🎮 Lobby açıldı!');
    console.log('Oyuncu:', playerName);
    console.log('Kod:', roomCode);
    console.log('Lider:', isLeader ? 'EVET' : 'HAYIR');
    console.log('Room Players:', room?.Players);
  }, []);
  
  console.log('Lobby Debug:', {
    playerName,
    players: room?.Players,
    isLeader
  });

  const startGame = () => {
    if (room.Players.length < 4) {
      alert('❌ En az 4 oyuncu gerekli!');
      console.log('❌ En az 4 oyuncu gerekli!');
      return;
    }
    // Rol seçim ekranını aç
    onStartGameClick();
  };

  return (
    <div className="lobby">
      <h1>🎮 OYUN LOBISI</h1>
      
      <div className="room-code">
        <p>✅ ODA KODU</p>
        <h2>{roomCode}</h2>
        <p className="share-text">Bu kodu arkadaşlarınla paylaş!</p>
      </div>

      {/* BLACKJACK MASASI */}
      <div className="blackjack-table">
        <div className="table-center">
          <div className="table-label">OYUNCULAR</div>
        </div>
        
        <div className="players-around-table">
          {room?.Players?.map((player, index) => (
            <div key={index} className={`player-seat seat-${index + 1}`}>
              <div className="player-card">
                <span className="player-name">{player.Name}</span>
                {player.IsLeader && <span className="crown">👑</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLeader ? (
        <>
          <button 
            className="role-guide-btn" 
            onClick={() => setShowRoleGuide(true)}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              padding: '15px 30px',
              fontSize: '1.2em',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              marginBottom: '15px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            📖 ROLLERİ ÖĞREN
          </button>
          <button className="start-btn" onClick={startGame}>
            🚀 OYUNU BAŞLAT
          </button>
        </>
      ) : (
        <>
          <button 
            className="role-guide-btn" 
            onClick={() => setShowRoleGuide(true)}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              padding: '15px 30px',
              fontSize: '1.2em',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              marginBottom: '15px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            📖 ROLLERİ ÖĞREN
          </button>
          <p className="waiting-text">⏳ Lider oyunu başlatıyor...</p>
        </>
      )}
      
      {showRoleGuide && <RoleGuide onClose={() => setShowRoleGuide(false)} />}
    </div>
  );
}

export default Lobby;