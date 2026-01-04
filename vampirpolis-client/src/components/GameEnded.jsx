import './GameEnded.css';

function GameEnded({ result, allRoles, onReturnHome }) {
  const isVampireWin = result === 'VampireWin' || result === 'VampiresWin';
  const isPoliceWin = result === 'PoliceWin' || result === 'PolicesWin';

  return (
    <div className="game-ended-overlay">
      <div className="game-ended-modal">
        <div className="game-ended-header">
          <h1 className="game-ended-title">
            {isVampireWin && '🧛‍♂️ VAMPİRLER KAZANDI!'}
            {isPoliceWin && '👮‍♂️ POLİS KAZANDI!'}
          </h1>
          <p className="game-ended-subtitle">
            {isVampireWin && 'Vampirler köyü ele geçirdi!'}
            {isPoliceWin && 'Köylüler vampirleri yok etti!'}
          </p>
        </div>

        <div className="game-ended-content">
          <h2 className="players-title">📋 Oyuncu Rolleri</h2>
          <div className="players-list">
            {allRoles && allRoles.map((player, index) => (
              <div 
                key={index} 
                className={`player-row ${!player.IsAlive ? 'dead' : ''}`}
              >
                <div className="player-info">
                  <span className="player-name">{player.Name}</span>
                  {!player.IsAlive && <span className="death-icon">☠️</span>}
                </div>
                <div className="player-role">
                  {player.Role === 'Vampire' && '🧛 Vampir'}
                  {player.Role === 'Police' && '👮 Polis'}
                  {player.Role === 'Doctor' && '⚕️ Doktor'}
                  {player.Role === 'SilentWitness' && '👁️ Sessiz Tanık'}
                  {player.Role === 'Seer' && '🔮 Kahin'}
                  {player.Role === 'Hunter' && '🎯 Avcı'}
                  {player.Role === 'Innocent' && '👤 Masum'}
                  {player.Role === 'SilentWitness' && '👁️ Sessiz Tanık'}
                  {player.Role === 'Citizen' && '👤 Köylü'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="return-home-btn" onClick={onReturnHome}>
          🏠 ANA EKRANA DÖN
        </button>
      </div>
    </div>
  );
}

export default GameEnded;
