import { useState, useEffect } from 'react';
import './DoctorPhase.css';
import GameTable from './GameTable';

function DoctorPhase({ room, playerName, myRole, onDoctorSelect, seerKnownRoles }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // ✅ DÜZELTME: Backend'den protectablePlayers listesi geliyorsa onu kullan
  const protectablePlayersData = room?.DoctorPhaseData?.protectablePlayers || [];
  const players = room?.Players || room?.players || [];
  
  console.log('🏥 DoctorPhase render - Players:', players);
  console.log('🏥 DoctorPhase render - ProtectablePlayers:', protectablePlayersData);
  console.log('🏥 DoctorPhase render - Room:', room);
  console.log('🏥 DoctorPhase render - PlayerName:', playerName);
  console.log('🏥 DoctorPhase render - MyRole:', myRole);
  
  // Doktor mi kontrolü - myRole üzerinden
  const isDoctor = myRole === 'Doctor' || myRole === 'Doktor';

  console.log('🏥 isDoctor:', isDoctor);

  // Eğer backend'den protectablePlayers geldiyse direkt kullan
  // Yoksa eskisi gibi filtrele (backward compatibility)
  const protectablePlayers = protectablePlayersData.length > 0 
    ? protectablePlayersData
    : players.filter(p => {
        const name = p.name || p.Name;
        const isAliveFlag = p.isAlive ?? p.IsAlive ?? true;
        const isAlive = isAliveFlag === true;
        const isNotMe = name !== playerName;
        const isNotLastProtected = !p.isLastProtected && !p.IsLastProtected;
        
        console.log(`🏥 ${name}: isAlive=${p.isAlive}, IsAlive=${p.IsAlive}, filtered=${isAlive}`);
        
        return isAlive && isNotMe && isNotLastProtected;
      });

  console.log('🏥 final protectablePlayers:', protectablePlayers);

  // Her turn değiştiğinde state'leri sıfırla
  useEffect(() => {
    console.log('🔄 DoctorPhase resetlendi - Turn:', room?.Turn);
    setSelectedTarget(null);
    setShowConfirmButton(false);
    setConfirmed(false);
  }, [room?.Turn]);

  useEffect(() => {
    if (selectedTarget) {
      setShowConfirmButton(true);
    }
  }, [selectedTarget]);

  const handleCardClick = (targetName) => {
    console.log('🏥 Doktor koruma seçti:', targetName);
    setSelectedTarget(targetName);
  };

  const handleConfirm = async () => {
    if (!selectedTarget) return;
    
    console.log('🏥 Doktor korumayı onayla:', selectedTarget);
    setConfirmed(true);
    setShowConfirmButton(false);
    
    if (onDoctorSelect) {
      await onDoctorSelect(selectedTarget);
    }
  };

  if (!isDoctor) {
    // Doktor değilse bekleme ekranı
    if (showTable) {
      return (
        <div className="doctor-phase-overlay">
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
            🏥 Panele Dön
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
      <div className="doctor-phase-overlay">
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
        
        <div className="doctor-phase-content">
          <div className="doctor-phase-header">
            <h2>🏥 DOKTOR FAZI</h2>
          </div>
          <div className="waiting-message">
            <div className="pulse-icon">🏥</div>
            <p>Doktor koruma seçimi yapıyor...</p>
            <p className="subtitle">Lütfen bekleyin</p>
          </div>
        </div>
      </div>
    );
  }

  if (confirmed) {
    if (showTable) {
      return (
        <div className="doctor-phase-overlay">
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
            🏥 Panele Dön
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
      <div className="doctor-phase-overlay">
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
        
        <div className="doctor-phase-content">
          <div className="doctor-phase-header">
            <h2>🏥 DOKTOR FAZI</h2>
          </div>
          <div className="confirmation-message">
            <div className="check-icon">✅</div>
            <p className="confirmed-text">Koruma seçiminiz kaydedildi!</p>
            <p className="protected-name">{selectedTarget}</p>
            <p className="subtitle">Bu gece {selectedTarget} korunacak</p>
          </div>
        </div>
      </div>
    );
  }

  // Doktor aktif seçim yaparken masa görüntüleme
  if (showTable) {
    return (
      <div className="doctor-phase-overlay">
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
          🏥 Panele Dön
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
    <div className="doctor-phase-overlay">
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
      
      <div className="doctor-phase-content">
        <div className="doctor-phase-header">
          <h2>🏥 DOKTOR FAZI</h2>
          <p className="phase-description">Kimi korumak istersin?</p>
          <p className="phase-rules">⚠️ Kendini ve son koruduğun kişiyi koruyamazsın!</p>
        </div>

        <div className="doctor-cards-container">
          {protectablePlayers.map((player) => {
            const name = player.name || player.Name;
            const isSelected = selectedTarget === name;

            return (
              <div
                key={name}
                className={`doctor-player-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCardClick(name)}
              >
                <div className="card-shield">🛡️</div>
                <div className="card-name">{name}</div>
                {isSelected && <div className="card-checkmark">✓</div>}
              </div>
            );
          })}
        </div>

        {showConfirmButton && (
          <button className="doctor-confirm-btn" onClick={handleConfirm}>
            ✓ KORUMA ONAY
          </button>
        )}

        {!showConfirmButton && (
          <div className="instruction-text">
            Korumak istediğin oyuncuyu seç
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorPhase;
