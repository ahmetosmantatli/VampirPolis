import { useState } from 'react';
import signalR from '../services/signalRService';
import './VotingScreen.css';
import GameTable from './GameTable';

function VotingScreen({ votingPlayers, roomCode, playerName, myRole, isPlayerDead, room, seerKnownRoles }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Kahin oy kullanamaz
  if (myRole === 'Seer') {
    if (showTable) {
      return (
        <div className="voting-overlay">
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
      <div className="voting-overlay">
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
        
        <div className="voting-modal">
          <div className="voting-header">
            <h2>🗳️ OYLAMA</h2>
            <p className="phase-description">Kahin Rolü</p>
          </div>

          <div className="confirmation-message">
            <div className="check-icon">🔮</div>
            <p className="confirmed-text">Kahin oy kullanamaz</p>
            <p className="subtitle">Gece gördüğün bilgileri akıllıca kullan</p>
          </div>
        </div>
      </div>
    );
  }

  // Ölü oyuncular oy kullanamaz
  if (isPlayerDead) {
    if (showTable) {
      return (
        <div className="voting-overlay">
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
            👁️ Panele Dön
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
      <div className="voting-overlay">
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
        
        <div className="voting-modal">
          <div className="voting-header">
            <h2>🗳️ OYLAMA</h2>
            <p className="phase-description">İzleyici Modundasın</p>
          </div>

          <div className="confirmation-message">
            <div className="check-icon">👁️</div>
            <p className="confirmed-text">Ölü oyuncular oy kullanamaz</p>
            <p className="subtitle">Oyunu izleyici olarak takip edebilirsin</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCardClick = (playerId) => {
    if (hasVoted) return;
    console.log('🗳️ Oy verilecek:', playerId);
    setSelectedPlayer(playerId);
  };

  const handleConfirm = async () => {
    if (!selectedPlayer) {
      console.log('❌ Lütfen bir oyuncu seç');
      return;
    }

    const selectedPlayerData = votingPlayers.find(p => (p.Id || p.id) === selectedPlayer);
    console.log('🗳️ Oy onaylanıyor:', selectedPlayer);
    console.log('🗳️ Seçilen oyuncu:', selectedPlayerData?.Name || selectedPlayerData?.name);
    await signalR.invoke('Vote', roomCode, selectedPlayer);
    setHasVoted(true);
  };

  if (hasVoted) {
    if (showTable) {
      return (
        <div className="voting-overlay">
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
            🗳️ Panele Dön
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
      <div className="voting-overlay">
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
        
        <div className="voting-modal">
          <div className="voting-header">
            <h2>🗳️ OYLAMA</h2>
            <p className="phase-description">Oyun kaydedildi</p>
          </div>

          <div className="confirmation-message">
            <div className="check-icon">✅</div>
            <p className="confirmed-text">Oyun başarıyla verildi!</p>
            <p className="subtitle">Diğer oyuncular oy kullanana kadar bekle</p>
            <div className="waiting-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Aktif oylama durumunda masa görüntüleme
  if (showTable) {
    return (
      <div className="voting-overlay">
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
          🗳️ Panele Dön
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
    <div className="voting-overlay">
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
      
      <div className="voting-modal">
        <div className="voting-header">
          <h2>🗳️ VAMPİR KİM?</h2>
          <p className="phase-description">Vampir olduğunu düşündüğün kişiye oy ver</p>
          <p className="phase-rules">⚠️ En çok oy alan oyuncu oyundan çıkar!</p>
        </div>

        <div className="voting-cards-container">
          {votingPlayers.map((player) => {
            const playerId = player.Id || player.id;
            const playerNameInList = player.Name || player.name;
            const isSelected = selectedPlayer === playerId;
            const isSelf = playerNameInList === playerName;
            const isSilentWitness = myRole === 'SilentWitness' || myRole === 'Sessiz Tanık';

            return (
              <div
                key={playerId}
                className={`voting-player-card ${isSelected ? 'selected' : ''} ${isSelf && isSilentWitness ? 'silent-witness-card' : ''}`}
                onClick={() => handleCardClick(playerId)}
              >
                <div className="card-vote-icon">👤</div>
                <div className="card-name">{playerNameInList}</div>
                {isSelf && isSilentWitness && (
                  <div className="silent-witness-badge">
                    👁️ Sessiz Tanık
                    <span className="vote-power">2x Oy Gücü</span>
                  </div>
                )}
                {isSelected && <div className="card-checkmark">✓</div>}
              </div>
            );
          })}
        </div>

        {selectedPlayer ? (
          <button className="voting-confirm-btn" onClick={handleConfirm}>
            ✓ OY VER
          </button>
        ) : (
          <div className="instruction-text">
            Oy vermek istediğin oyuncuyu seç
          </div>
        )}

        <div className="voting-info">
          <p>ℹ️ En çok oy alan çıkar • Beraberlikte kimse çıkmaz</p>
        </div>
      </div>
    </div>
  );
}

export default VotingScreen;
