import signalR from '../services/signalRService';
import { useEffect, useState } from 'react';
import RoleGuide from './RoleGuide';

function Lobby({ room, roomCode, playerName, onStartGameClick }) {
  const isLeader = room?.Players?.find(p => p.Name === playerName)?.IsLeader;
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [selectedMode, setSelectedMode] = useState('Mode1'); // Varsayılan Mode 1
  
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

  const selectMode = async (mode) => {
    setSelectedMode(mode);
    try {
      await signalR.connection.invoke('SelectGameMode', roomCode, mode);
      console.log(`✅ Mod seçildi: ${mode}`);
    } catch (err) {
      console.error('❌ Mod seçim hatası:', err);
    }
  };

  const startGame = () => {
    if (room.Players.length < 4) {
      alert('❌ En az 4 oyuncu gerekli!');
      console.log('❌ En az 4 oyuncu gerekli!');
      return;
    }
    // Rol seçim ekranını aç - selectedMode'u da gönder
    console.log('🚀 Oyun başlatılıyor, seçili mod:', selectedMode);
    onStartGameClick(selectedMode);
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
          {/* MOD SEÇİMİ */}
          <div style={{
            marginBottom: '25px',
            padding: '20px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '15px',
            border: '2px solid rgba(139, 92, 246, 0.3)',
            width: '100%',
            maxWidth: '600px'
          }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '15px', fontSize: '1.3em', textAlign: 'center' }}>
              🎮 OYUN MODU SEÇ
            </h3>
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => selectMode('Mode1')}
                style={{
                  flex: '1 1 200px',
                  minWidth: '180px',
                  maxWidth: '250px',
                  padding: '20px 15px',
                  background: selectedMode === 'Mode1' 
                    ? 'linear-gradient(135deg, #10b981, #059669)' 
                    : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: selectedMode === 'Mode1' ? '3px solid #10b981' : '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                  boxShadow: selectedMode === 'Mode1' ? '0 8px 20px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                <div style={{ fontSize: '2em', marginBottom: '8px' }}>🎲</div>
                <div>MOD 1</div>
                <div style={{ fontSize: '0.8em', opacity: 0.9, marginTop: '5px' }}>KLASİK OYUN</div>
              </button>
              
              <button
                onClick={() => selectMode('Mode2')}
                style={{
                  flex: '1 1 200px',
                  minWidth: '180px',
                  maxWidth: '250px',
                  padding: '20px 15px',
                  background: selectedMode === 'Mode2' 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                    : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: selectedMode === 'Mode2' ? '3px solid #f59e0b' : '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                  boxShadow: selectedMode === 'Mode2' ? '0 8px 20px rgba(245, 158, 11, 0.4)' : 'none'
                }}
              >
                <div style={{ fontSize: '2em', marginBottom: '8px' }}>📍</div>
                <div>MOD 2</div>
                <div style={{ fontSize: '0.8em', opacity: 0.9, marginTop: '5px' }}>MEKAN MEKANİĞİ</div>
              </button>
            </div>
            <p style={{ 
              marginTop: '12px', 
              fontSize: '0.9em', 
              color: '#a78bfa',
              textAlign: 'center'
            }}>
              {selectedMode === 'Mode1' 
                ? '🎲 Klasik vampir köylü oyunu' 
                : '📍 Mekan bazlı kart ifşası + Usta Vampir'}
            </p>
          </div>

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