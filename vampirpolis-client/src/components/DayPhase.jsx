import { useState, useEffect } from 'react';
import './DayPhase.css';

function DayPhase({ room, nightData, playerName, onDayEnd, onVoteSubmit, onStartVoting, isPlayerDead }) {
  const [votingPhase, setVotingPhase] = useState('announcement'); // announcement, voting, results
  const [selectedVote, setSelectedVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showSelection, setShowSelection] = useState(false);

  const players = room?.Players || room?.players || [];
  const currentPlayer = players.find(p => 
    (p.name || p.Name) === playerName
  );
  const isLeader = currentPlayer?.isLeader || currentPlayer?.IsLeader || false;

  // Canlı oyuncular (oy verilebilecekler)
  const alivePlayers = players.filter(p => {
    const isAlive = p.isAlive !== false && p.IsAlive !== false;
    return isAlive;
  });

  // nightData'dan ölü oyuncuları al
  const killedPlayers = nightData?.killedPlayers || nightData?.KilledPlayers || [];

  console.log('☀️ DayPhase render - killedPlayers:', killedPlayers);
  console.log('☀️ DayPhase render - killedPlayers.length:', killedPlayers.length);

  // Backend'den VotingStarted event'i geldiğinde oylama başlasın
  useEffect(() => {
    // Parent'tan votingPhase kontrolü gelirse
    if (room?.Phase === 'Voting' || room?.phase === 'Voting') {
      setVotingPhase('voting');
    }
  }, [room?.Phase, room?.phase]);

  const handleStartVoting = async () => {
    console.log('🗳️ Lider oylama başlatıyor...');
    // Backend'e event gönder
    if (onStartVoting) {
      await onStartVoting();
    }
  };

  const handleSelectVote = (targetName) => {
    setSelectedVote(targetName);
  };

  const handleVoteConfirm = async () => {
    if (!selectedVote) return;
    
    console.log('🗳️ Oy verildi:', selectedVote);
    setHasVoted(true);
    
    // Backend'e oy gönder
    if (onVoteSubmit) {
      await onVoteSubmit(selectedVote);
    }
  };

  const handleSelectionBtn = () => {
    console.log('👆 Seçim Yap butonuna tıklandı');
    setShowSelection(true);
  };

  return (
    <div className="day-phase-overlay">
      <div className="day-modal">
        {/* Announcement Phase */}
        {votingPhase === 'announcement' && (
          <>
            <div className="day-header">
              <h2>☀️ GÜNDÜZ {room?.Turn || 1}</h2>
            </div>

            <div className="night-result">
              {killedPlayers && killedPlayers.length > 0 ? (
                <>
                  <p className="result-text">☠️ Bu gece vampirler saldırdı!</p>
                  {killedPlayers.map((killed, index) => {
                    const playerName = killed.name || killed.Name;
                    return (
                      <div key={index} className="killed-player-box">
                        <div className="skull-icon">💀</div>
                        <div className="player-name">{playerName}</div>
                        <div className="status-text">Oyundan Çıktı</div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="result-text">✅ Bu gece kimse ölmedi</p>
              )}
            </div>

            <div className="voting-info">
              <h3>🗳️ Vampiri Bulma Zamanı!</h3>
              <p>Tüm oyuncular şüpheliyi oylayacak</p>
            </div>

            {isLeader && (
              <button className="start-voting-btn" onClick={handleStartVoting}>
                🗳️ OYLAMA BAŞLAT
              </button>
            )}

            {!isLeader && (
              <p className="waiting-text">Lider oylamayı başlatacak...</p>
            )}
          </>
        )}

        {/* Voting Phase - Gece Fazı Gibi Modal */}
        {votingPhase === 'voting' && (
          <>
            <div className="voting-header">
              <h2>🔍 VAMPIR KIM?</h2>
              <div className="voting-subtitle">Gündüz {room?.Turn || 1}</div>
            </div>

            <div className="voting-content">
              {isPlayerDead ? (
                // Ölü oyuncular oy kullanamaz
                <div className="voting-announcement">
                  <div className="voting-icon">👁️</div>
                  <h3>İzleyici Modundasın</h3>
                  <p>Ölü oyuncular oy kullanamaz</p>
                </div>
              ) : !hasVoted ? (
                <>
                  <div className="voting-announcement">
                    <div className="voting-icon">🗳️</div>
                    <h3>Şüphelini Seç ve Oyla</h3>
                    <p>En çok oy alan oyuncu oyundan çıkar</p>
                  </div>

                  {!showSelection ? (
                    <button 
                      className="voting-selection-btn"
                      onClick={handleSelectionBtn}
                    >
                      👤 SEÇİM YAP
                    </button>
                  ) : (
                    <div className="voting-target-selection">
                      <h4>Oyunu Seç:</h4>
                      <div className="voting-targets-list">
                        {alivePlayers.map((player) => {
                          const name = player.name || player.Name;
                          return (
                            <div 
                              key={name}
                              className={`voting-target-card ${selectedVote === name ? 'selected' : ''}`}
                              onClick={() => handleSelectVote(name)}
                            >
                              <div className="voting-target-name">{name}</div>
                              {selectedVote === name && (
                                <div className="voting-selected-indicator">✓</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button 
                        className="voting-confirm-btn"
                        onClick={handleVoteConfirm}
                        disabled={!selectedVote}
                      >
                        ✓ ONAYLA
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="voting-announcement">
                  <div className="voting-icon">✅</div>
                  <h3>Oyun Kaydedildi!</h3>
                  <p className="waiting-text">Diğer oyuncular oy veriyor...</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DayPhase;
