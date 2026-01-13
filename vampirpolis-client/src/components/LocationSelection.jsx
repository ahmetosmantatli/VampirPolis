import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './LocationSelection.css';

function LocationSelection({ roomCode, playerName, isLeader, isPlayerDead }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalAlive, setTotalAlive] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🎯 LocationSelection mount - isLeader:', isLeader, 'playerName:', playerName);
    
    // Herkes seçtiğinde lider için event dinle
    const handleAllSelected = (data) => {
      console.log('✅ Tüm oyuncular mekan seçti!', data);
      setAllSelected(true);
    };

    const handleLocationSelected = (data) => {
      console.log('📍 LocationSelected event:', data);
      setSelectedCount(data.SelectedCount);
      setTotalAlive(data.TotalAlive);
    };

    const handleError = (errorMsg) => {
      console.error('❌ Hata alındı:', errorMsg);
      setError(errorMsg);
      // 3 saniye sonra hatayı temizle
      setTimeout(() => setError(null), 3000);
    };

    signalR.on('AllLocationsSelected', handleAllSelected);
    signalR.on('LocationSelected', handleLocationSelected);
    signalR.on('Error', handleError);

    return () => {
      signalR.connection.off('AllLocationsSelected', handleAllSelected);
      signalR.connection.off('LocationSelected', handleLocationSelected);
      signalR.connection.off('Error', handleError);
    };
  }, [isLeader, playerName]);

  const handleStartReveal = async () => {
    try {
      await signalR.invoke('StartCardReveal', roomCode);
      console.log('🎬 Kart gösterimi başlatıldı');
    } catch (err) {
      console.error('❌ Kart gösterim hatası:', err);
    }
  };

  const locations = [
    { id: 'House', name: 'EV', icon: '🏠', description: 'Güvenli ama dar' },
    { id: 'Square', name: 'MEYDAN', icon: '🏛️', description: 'Herkes buraya gelir' },
    { id: 'Forest', name: 'ORMAN', icon: '🌲', description: 'Tehlikeli ama gizli' }
  ];

  const handleLocationSelect = async (locationId) => {
    if (isSubmitting) return;
    
    setSelectedLocation(locationId);
    setIsSubmitting(true);
    
    try {
      await signalR.invoke('SelectLocation', roomCode, locationId);
      console.log(`✅ Mekan seçildi: ${locationId}`);
    } catch (err) {
      console.error('❌ Mekan seçim hatası:', err);
      setIsSubmitting(false);
    }
  };

  console.log('🔍 LocationSelection render:', {
    isLeader,
    allSelected,
    selectedLocation,
    selectedCount,
    totalAlive,
    willShowButton: isLeader && allSelected
  });

  return (
    <div className="location-selection-overlay">
      <div className="location-selection-container">
        <div className="location-header">
          <h1>📍 MEKAN SEÇ</h1>
          <p>Bu gece nereye gidiyorsun?</p>
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="error-message" style={{
            padding: '15px 30px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            color: '#ef4444',
            fontWeight: 'bold',
            marginBottom: '20px',
            animation: 'shake 0.5s ease-in-out'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div className="location-cards">
          {locations.map(location => (
            <button
              key={location.id}
              className={`location-card ${selectedLocation === location.id ? 'selected' : ''}`}
              onClick={() => handleLocationSelect(location.id)}
              disabled={isSubmitting}
            >
              <div className="location-icon">{location.icon}</div>
              <div className="location-name">{location.name}</div>
              <div className="location-description">{location.description}</div>
              {selectedLocation === location.id && (
                <div className="selection-badge">✓ SEÇİLDİ</div>
              )}
            </button>
          ))}
        </div>

        {/* Lider için START butonu - ÖLÜ DEGİLSE görünsün */}
        {isLeader && selectedLocation && !isPlayerDead && (
          <div className="leader-continue">
            {allSelected && (
              <div className="all-selected-message">
                <span className="check-icon">✓</span>
                <p>Tüm oyuncular mekanlarını seçti!</p>
              </div>
            )}
            {!allSelected && (
              <div className="waiting-message" style={{ marginBottom: '20px' }}>
                <div className="spinner"></div>
                <p>Diğer oyuncular seçim yapıyor... ({selectedCount || 1}/{totalAlive || '?'})</p>
              </div>
            )}
            <button className="continue-button" onClick={handleStartReveal}>
              🎬 Kartları Göster ve Devam Et
            </button>
          </div>
        )}

        {/* Lider değilse VEYA ölü ise bekleme mesajı */}
        {(!isLeader || isPlayerDead) && selectedLocation && (
          <div className="waiting-message">
            {isPlayerDead ? (
              <>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>💀</div>
                <p style={{ fontWeight: 'bold', color: '#ff6b6b' }}>İzleyici modundasın</p>
                <p style={{ fontSize: '14px', opacity: 0.8 }}>
                  {allSelected 
                    ? 'Lider kartları gösteriyor...' 
                    : `Diğer oyuncular seçim yapıyor... (${selectedCount || 1}/${totalAlive || '?'})`
                  }
                </p>
              </>
            ) : (
              <>
                <div className="spinner"></div>
                <p>
                  {allSelected 
                    ? 'Lider kartları gösteriyor...' 
                    : `Diğer oyuncular seçim yapıyor... (${selectedCount || 1}/${totalAlive || '?'})`
                  }
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSelection;
