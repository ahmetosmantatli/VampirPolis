import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './SeerPhase.css';
import GameTable from './GameTable';

function SeerPhase({ room, playerName, seerRevealData, onComplete, myRole, seerKnownRoles }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [revealedRole, setRevealedRole] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const alivePlayers = room?.Players?.filter(p => 
    (p.IsAlive !== false && p.isAlive !== false) && 
    (p.Name !== playerName && p.name !== playerName)
  ) || [];

  console.log('🔮 SeerPhase alivePlayers:', alivePlayers);
  console.log('🔮 İlk oyuncu objesi:', alivePlayers[0]);

  const handlePlayerClick = async (playerId) => {
    if (isRevealing || revealedRole) return;
    
    setSelectedPlayer(playerId);
    setIsRevealing(true);

    const selectedPlayerData = alivePlayers.find(p => (p.Id || p.id) === playerId);
    console.log('🔮 Kahin seçim yaptı:', selectedPlayerData?.Name || selectedPlayerData?.name);
    console.log('🔮 playerId:', playerId);
    console.log('🔮 roomCode:', room.RoomCode || room.roomCode);
    console.log('🔮 Gönderilecek parametreler:', {
      roomCode: room.RoomCode || room.roomCode,
      targetId: playerId
    });

    try {
      // Backend'e gönder
      const result = await signalR.invoke('SeerReveal', room.RoomCode || room.roomCode, playerId);
      console.log('🔮 SeerReveal invoke sonucu:', result);
      
      // Backend'den cevap bekliyoruz - seerRevealData prop'u gelecek
    } catch (err) {
      console.error('❌ Kahin seçim hatası:', err);
      console.error('❌ Hata detayı:', err.message);
      console.error('❌ Hata stack:', err.stack);
      setIsRevealing(false);
    }
  };

  // App.jsx'den gelen seerRevealData prop'unu dinle
  useEffect(() => {
    if (seerRevealData) {
      console.log('🔮 Rol açığa çıktı (PROP):', seerRevealData);
      console.log('🔮 seerRevealData.playerName:', seerRevealData.playerName);
      console.log('🔮 seerRevealData.role:', seerRevealData.role);
      setRevealedRole(seerRevealData);
      setIsRevealing(false);
      
      // 5 saniye sonra kapat
      setTimeout(() => {
        onComplete();
      }, 5000);
    }
  }, [seerRevealData, onComplete]);

  const getRoleInfo = (role) => {
    const roleMap = {
      'Vampire': { icon: '🧛', name: 'VAMPİR', color: '#dc2626' },
      'Police': { icon: '👮', name: 'POLİS', color: '#3b82f6' },
      'Doctor': { icon: '⚕️', name: 'DOKTOR', color: '#10b981' },
      'SilentWitness': { icon: '👁️', name: 'SESSİZ TANIK', color: '#8b5cf6' },
      'Seer': { icon: '🔮', name: 'KAHİN', color: '#f59e0b' },
      'Hunter': { icon: '🎯', name: 'AVCI', color: '#ea580c' },
      'Innocent': { icon: '👤', name: 'MASUM', color: '#64748b' }
    };
    return roleMap[role] || { icon: '❓', name: 'BİLİNMEYEN', color: '#6b7280' };
  };

  // Masa görüntüleme aktifse GameTable göster
  if (showTable) {
    return (
      <div className="seer-overlay">
        <button 
          className="toggle-view-btn"
          onClick={() => setShowTable(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1001,
            padding: '15px 30px',
            fontSize: '1.1em',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.5)'
          }}
        >
          🔮 Panele Dön
        </button>
        <GameTable 
          room={room} 
          myRole={myRole} 
          playerName={playerName}
          seerKnownRoles={seerKnownRoles}
        />
      </div>
    );
  }

  return (
    <div className="seer-overlay">
      {/* Masayı Gör Butonu */}
      <button 
        className="toggle-view-btn"
        onClick={() => setShowTable(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1001,
          padding: '15px 30px',
          fontSize: '1.1em',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5)'
        }}
      >
        🃏 Masayı Gör
      </button>
      
      <div className="seer-modal">
        <div className="seer-header">
          <div className="seer-icon">🔮</div>
          <h2>KAHİN FAZI</h2>
          <p className="seer-description">
            {revealedRole 
              ? "Rolü öğrendin!" 
              : "Bir oyuncunun rolünü öğrenmek için kartına tıkla"}
          </p>
        </div>

        {!revealedRole ? (
          <div className="seer-players">
            {alivePlayers.map((player, index) => {
              const playerId = player.Id || player.id;
              const playerDisplayName = player.Name || player.name;
              const isSelected = selectedPlayer === playerId;

              return (
                <div
                  key={playerId || index}
                  className={`seer-card ${isSelected ? 'selected' : ''} ${isRevealing ? 'disabled' : ''}`}
                  onClick={() => !isRevealing && handlePlayerClick(playerId)}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="mystery-icon">❓</div>
                    <div className="player-name">{playerDisplayName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="role-reveal-container">
            <div 
              className="revealed-role-card"
              style={{ background: `linear-gradient(135deg, ${getRoleInfo(revealedRole.role).color}, ${getRoleInfo(revealedRole.role).color}dd)` }}
            >
              <div className="revealed-icon">{getRoleInfo(revealedRole.role).icon}</div>
              <div className="revealed-name">{revealedRole.playerName}</div>
              <div className="revealed-role">{getRoleInfo(revealedRole.role).name}</div>
              <div className="revealed-subtitle">Bu bilgiyi akıllıca kullan!</div>
            </div>
          </div>
        )}

        {isRevealing && !revealedRole && (
          <div className="seer-loading">
            <div className="crystal-ball">🔮</div>
            <p>Vizyon açılıyor...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeerPhase;
