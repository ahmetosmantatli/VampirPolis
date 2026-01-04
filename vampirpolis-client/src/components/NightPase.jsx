import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './NightPhase.css';

function NightPhase({ room, myRole, vampireTeam }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [vampireSync, setVampireSync] = useState(null);
  const [lastProtected, setLastProtected] = useState(null);

  const isVampire = myRole === 'Vampire';
  const isDoctor = myRole === 'Doctor';
  const isLeader = room?.Players?.find(p => p.IsLeader);
  const alivePlayers = room?.Players?.filter(p => p.IsAlive) || [];
  const myPlayer = room?.Players?.find(p => p.Role === myRole);

  useEffect(() => {
    // Vampir senkronizasyon güncellemesi
    signalR.on('VampireSyncUpdate', (data) => {
      setVampireSync(data);
    });

    // Doktor onayı
    signalR.on('DoctorProtectionConfirmed', () => {
      setConfirmed(true);
    });

    return () => {
      signalR.connection?.off('VampireSyncUpdate');
      signalR.connection?.off('DoctorProtectionConfirmed');
    };
  }, []);

  // Hedef seçimi
  const selectTarget = (playerId) => {
    if (confirmed) return;
    setSelectedTarget(playerId);
  };

  // Onay butonu
  const confirmSelection = async () => {
    if (!selectedTarget) {
      console.log('❌ Lütfen bir hedef seç');
      return;
    }

    if (isVampire) {
      // Vampir senkronizasyon kontrolü
      if (!vampireSync?.AllReady) {
        console.log('⚠️ Tüm vampirler aynı hedefi seçmeli!');
        return;
      }
      await signalR.invoke('VampireSelectTarget', room.RoomCode, selectedTarget);
      setConfirmed(true);
    } else if (isDoctor) {
      await signalR.invoke('DoctorSelectProtection', room.RoomCode, selectedTarget);
    }
  };

  // Lider gece fazını bitirme
  const endNightPhase = async () => {
    await signalR.invoke('EndNightPhase', room.RoomCode);
  };

  return (
    <div className="night-phase">
      <div className="night-header">
        <h2>🌙 GECE FAZI - TUR {room?.Turn || 1}</h2>
        <p className="night-subtitle">Sessizce seçiminizi yapın...</p>
      </div>

      {/* VAMPİR EKRANI */}
      {isVampire && (
        <div className="vampire-night">
          <h3>🧛 Vampir Takımı</h3>
          <p>Takımınızla aynı hedefi seçin:</p>
          
          {/* Hedef Seçim Butonları */}
          <div className="target-selection">
            <h4>Hedef Seç:</h4>
            <div className="target-buttons">
              {alivePlayers
                .filter(p => p.Role !== 'Vampire' && !vampireTeam.includes(p.ConnectionId || p.connectionId))
                .map(player => (
                  <button
                    key={player.ConnectionId || player.connectionId}
                    className={`target-btn ${selectedTarget === (player.ConnectionId || player.connectionId) ? 'selected' : ''}`}
                    onClick={() => selectTarget(player.ConnectionId || player.connectionId)}
                    disabled={confirmed}
                  >
                    {player.Name || player.name}
                  </button>
                ))}
            </div>
          </div>
          
          {/* Vampir Takımı */}
          <div className="vampire-team">
            {room?.Players?.filter(p => vampireTeam.includes(p.ConnectionId || p.connectionId)).map(v => (
              <div key={v.ConnectionId || v.connectionId} className="vampire-member">
                {v.Name || v.name} {vampireSync?.OtherVampires?.find(ov => (ov.Name || ov.name) === (v.Name || v.name))?.NightTarget ? '✓' : '⏳'}
              </div>
            ))}
          </div>

          {/* Onay Butonu */}
          <button 
            className="confirm-button" 
            onClick={confirmSelection}
            disabled={!selectedTarget || confirmed}
          >
            {confirmed ? '✓ Seçim Onaylandı' : 'Seçimi Onayla'}
          </button>

          {/* Senkronizasyon Durumu */}
          {vampireSync && !vampireSync.AllReady && (
            <div className="warning-box">
              ⚠️ Tüm vampirler aynı hedefi seçmeli!
            </div>
          )}

          {vampireSync?.AllReady && (
            <div className="success-box">
              ✅ Takımınız hazır! Onaylayabilirsiniz.
            </div>
          )}

          {/* Onay Butonu */}
          {!confirmed ? (
            <button 
              className="confirm-btn"
              onClick={confirmSelection}
              disabled={!vampireSync?.AllReady}
            >
              ONAYLA
            </button>
          ) : (
            <div className="confirmed-message">
              ✅ Seçiminiz onaylandı. Lider fazı bitirsin...
            </div>
          )}
        </div>
      )}

      {/* DOKTOR EKRANI */}
      {isDoctor && (
        <div className="doctor-night">
          <h3>🩺 Doktor</h3>
          <p>Bu gece kimi koruyacaksın?</p>
          
          {/* Hedef Seçimi */}
          <div className="target-selection">
            <div className="target-grid">
              {alivePlayers.filter(p => {
                // Kendini ve son koruduğu kişiyi gösterme
                return p.Id !== myPlayer?.Id && p.Id !== lastProtected;
              }).map(player => (
                <div
                  key={player.Id}
                  className={`target-card ${selectedTarget === player.Id ? 'selected' : ''}`}
                  onClick={() => selectTarget(player.Id)}
                >
                  {player.Name}
                </div>
              ))}
            </div>
          </div>

          {lastProtected && (
            <div className="info-box">
              ℹ️ Son turda koruduğun kişiyi tekrar koruyamazsın
            </div>
          )}

          {/* Onay Butonu */}
          {!confirmed ? (
            <button 
              className="confirm-btn"
              onClick={confirmSelection}
              disabled={!selectedTarget}
            >
              ONAYLA
            </button>
          ) : (
            <div className="confirmed-message">
              ✅ Koruma onaylandı. Lider fazı bitirsin...
            </div>
          )}
        </div>
      )}

      {/* POLİS/SESSİZ TANIK EKRANI */}
      {!isVampire && !isDoctor && (
        <div className="waiting-screen">
          <div className="waiting-icon">💤</div>
          <h3>Gece...</h3>
          <p>Uyuyorsun. Vampirler ve doktor seçim yapıyor...</p>
          <div className="waiting-animation">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}

      {/* LİDER ONAY BUTONU */}
      {isLeader && (
        <div className="leader-control">
          <button className="leader-btn" onClick={endNightPhase}>
            👑 GECE FAZINI BİTİR
          </button>
          <p className="leader-hint">Herkes seçimini yaptıysa, fazı bitirebilirsin</p>
        </div>
      )}
    </div>
  );
}

export default NightPhase;
