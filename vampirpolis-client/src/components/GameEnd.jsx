function GameEnd({ result }) {
  const isVampireWin = result?.Result === 'VampiresWin';
  const isPoliceWin = result?.Result === 'PoliceWin';

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="game-end">
      <div className="result-banner">
        {isVampireWin && (
          <>
            <div className="winner-icon vampire-win"></div>
            <h1 className="winner-title">VAMPİRLER KAZANDI!</h1>
            <p className="winner-subtitle">Karanlık hüküm sürdü...</p>
          </>
        )}
        
        {isPoliceWin && (
          <>
            <div className="winner-icon police-win"></div>
            <h1 className="winner-title">POLİSLER KAZANDI!</h1>
            <p className="winner-subtitle">Şehir kurtarıldı!</p>
          </>
        )}
      </div>

      <div className="all-roles">
        <h2> TÜM ROLLER</h2>
        <div className="roles-grid">
          {result?.AllRoles?.map((player, index) => (
            <div 
              key={index} 
              className={`role-reveal ${!player.IsAlive ? 'dead' : ''}`}
            >
              <div className="player-info">
                <span className="player-name">{player.Name}</span>
                {!player.IsAlive && <span className="dead-badge"></span>}
              </div>
              <div className="role-badge">
                {player.Role === 'Vampire' && '🧛 VAMPİR'}
                {player.Role === 'Doctor' && '🩺 DOKTOR'}
                {player.Role === 'SilentWitness' && '🔇 SESSİZ TANIK'}
                {player.Role === 'Police' && '🟦 POLİS'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-actions">
        <button className="new-game-btn" onClick={reloadPage}>
           YENİ OYUN
        </button>
      </div>

      <div className="game-stats">
        <p>Toplam {result?.AllRoles?.length || 0} oyuncu</p>
        <p>Canlı: {result?.AllRoles?.filter(p => p.IsAlive).length || 0}</p>
        <p>Ölü: {result?.AllRoles?.filter(p => !p.IsAlive).length || 0}</p>
      </div>
    </div>
  );
}

export default GameEnd;
