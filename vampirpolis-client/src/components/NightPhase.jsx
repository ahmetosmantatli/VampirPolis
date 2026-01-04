import { useState, useEffect } from 'react';
import './NightPhase.css';
import GameTable from './GameTable';

function NightPhase({ room, myRole, playerName, vampireTeam, onNightEnd, seerKnownRoles }) {
  const [showSelection, setShowSelection] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Her turn değiştiğinde state'leri sıfırla
  useEffect(() => {
    console.log('🔄 NightPhase resetlendi - Turn:', room?.Turn);
    setShowSelection(false);
    setSelectedTarget(null);
  }, [room?.Turn]);

  const players = room?.Players || room?.players || [];
  const currentPlayer = players.find(p => 
    (p.name || p.Name) === playerName
  );

  // Vampir mi kontrolü (Backend İngilizce "Vampire" gönderiyor)
  const isVampire = myRole === 'Vampir' || myRole === 'Vampire';
  
  // Hedef seçilebilir oyuncular (hayatta olanlar ve vampir olmayanlar)
  const availableTargets = players.filter(player => {
    const name = player.name || player.Name;
    // Hem isAlive hem IsAlive'ı kontrol et - FALSE olmamalı ve undefined da false sayılmalı
    const isAliveFlag = player.isAlive ?? player.IsAlive ?? true;
    const isAlive = isAliveFlag === true;
    const isVampirePlayer = vampireTeam.includes(name);
    const isMe = name === playerName;
    
    console.log(`🔍 Player: ${name}, Alive: ${isAlive} (isAlive: ${player.isAlive}, IsAlive: ${player.IsAlive}), IsVampire: ${isVampirePlayer}, IsMe: ${isMe}`);
    
    return isAlive && !isVampirePlayer && !isMe;
  });

  console.log('🎯 Vampir mi?', isVampire);
  console.log('🎯 Vampir takımı:', vampireTeam);
  console.log('🎯 Hedef alınabilir oyuncular:', availableTargets.map(p => p.name || p.Name));

  const handleSelectTarget = () => {
    console.log('👆 Seçim Yap butonuna tıklandı');
    setShowSelection(true);
  };

  const handleConfirm = async () => {
    if (!selectedTarget) return;
    
    // Backend'e vampir seçimini gönder
    console.log('🎯 Vampir hedef seçti:', selectedTarget);
    
    // Gece fazını bitir
    onNightEnd(selectedTarget);
  };

  // Masa görüntüleme aktifse GameTable göster
  if (showTable) {
    return (
      <div className="night-phase-overlay">
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
          🌙 Panele Dön
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
    <div className="night-phase-overlay">
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
      
      {/* Modal */}
      <div className="night-modal">
        <div className="night-header">
          <h2>🌙 GECE FAZI</h2>
          <div className="night-turn">Gece {room?.Turn || 1}</div>
        </div>

        {isVampire ? (
          // Vampir için seçim ekranı
          <>
            <div className="night-content">
              <div className="role-announcement">
                <div className="role-icon">🧛</div>
                <h3>Vampir Rolündesin</h3>
                <p>Hedef seçmelisin</p>
              </div>

              {!showSelection ? (
                <button 
                  className="selection-btn"
                  onClick={handleSelectTarget}
                >
                  👤 SEÇİM YAP
                </button>
              ) : (
                <div className="target-selection">
                  <h4>Hedef Seç:</h4>
                  <div className="targets-list">
                    {availableTargets.map((player) => {
                      const name = player.name || player.Name;
                      return (
                        <div 
                          key={name}
                          className={`target-card ${selectedTarget === name ? 'selected' : ''}`}
                          onClick={() => setSelectedTarget(name)}
                        >
                          <div className="target-name">{name}</div>
                          {selectedTarget === name && (
                            <div className="selected-indicator">✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    className="confirm-btn"
                    onClick={handleConfirm}
                    disabled={!selectedTarget}
                  >
                    ✓ ONAYLA
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Diğer roller için bekleme ekranı
          <div className="night-content">
            <div className="role-announcement">
              <div className="role-icon">
                {myRole === 'Polis' ? '👮' : 
                 myRole === 'Doktor' ? '⚕️' : 
                 myRole === 'Gözcü' ? '👁️' : '👤'}
              </div>
              <h3>{myRole}</h3>
              <p className="waiting-text">Gece fazı devam ediyor...</p>
              <p className="waiting-subtext">Vampir seçim yapıyor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NightPhase;
