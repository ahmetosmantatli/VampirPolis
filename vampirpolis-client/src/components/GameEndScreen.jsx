import './GameEndScreen.css';

function GameEndScreen({ result, allRoles, onReturnLobby }) {
  const isVampireWin = result === 'VampireWin' || result === 'VampiresWin';
  const isPoliceWin = result === 'PoliceWin' || result === 'PolicesWin';

  return (
    <div className="game-end-overlay">
      <div className="game-end-modal">
        <div className={`end-header ${isVampireWin ? 'vampire-win' : 'police-win'}`}>
          <h2>{isVampireWin ? '🧛 VAMPİRLER KAZANDI!' : '👮 POLİSLER KAZANDI!'}</h2>
          <div className="win-icon">
            {isVampireWin ? '🏆' : '🎉'}
          </div>
        </div>

        <div className="roles-reveal">
          <h3>🎭 Roller Açıklandı</h3>
          <div className="roles-grid">
            {allRoles && allRoles.map((player, index) => (
              <div 
                key={index}
                className={`role-card ${!player.IsAlive ? 'dead' : ''}`}
              >
                <div className="role-player-name">{player.Name}</div>
                <div className="role-icon-big">
                  {player.Role === 'Vampire' ? '🧛' : 
                   player.Role === 'Police' ? '👮' : 
                   player.Role === 'Doctor' ? '⚕️' : 
                   player.Role === 'Scout' ? '👁️' : '👤'}
                </div>
                <div className="role-name">
                  {player.Role === 'Vampire' ? 'Vampir' : 
                   player.Role === 'Police' ? 'Polis' : 
                   player.Role === 'Doctor' ? 'Doktor' : 
                   player.Role === 'SilentWitness' ? 'Sessiz Tanık' : 
                   player.Role === 'Seer' ? 'Kahin' : 
                   player.Role === 'Hunter' ? 'Avcı' : 
                   player.Role === 'Innocent' ? 'Masum' : 'Köylü'}
                </div>
                {!player.IsAlive && <div className="status-badge">❌ Öldü</div>}
                {player.IsAlive && <div className="status-badge alive">✅ Hayatta</div>}
              </div>
            ))}
          </div>
        </div>

        <button className="return-lobby-btn" onClick={onReturnLobby}>
          🏠 Lobiye Dön
        </button>
      </div>
    </div>
  );
}

export default GameEndScreen;
