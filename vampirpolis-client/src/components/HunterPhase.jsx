import { useState, useEffect } from 'react';
import './HunterPhase.css';

export default function HunterPhase({ connection, roomCode, targets = [] }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('🎯 HunterPhase mount edildi. Hedefler:', targets);
  }, [targets]);

  const handleSubmit = async () => {
    if (!selectedTarget || isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('🎯 Avcı intikam hedefi seçti:', selectedTarget);
    console.log('🎯 Connection:', connection);
    console.log('🎯 Connection type:', typeof connection);
    console.log('🎯 RoomCode:', roomCode);
    
    try {
      console.log('🎯 Invoke çağrılıyor...');
      await connection.invoke('HunterRevenge', roomCode, selectedTarget);
      console.log('🎯 Invoke başarılı!');
    } catch (error) {
      console.error('❌ HunterRevenge gönderilirken hata:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hunter-phase-overlay">
      <div className="hunter-phase">
        <div className="hunter-container">
        <div className="hunter-title-section">
          <h1 className="hunter-title">🎯 AVCI İNTİKAMI</h1>
          <p className="hunter-subtitle">Son nefesinde birini yanında götüreceksin...</p>
        </div>

        <div className="hunter-targets">
          <h2>Hedef Seç:</h2>
          <div className="target-grid">
            {targets.map((target) => (
              <button
                key={target.id}
                className={`target-card ${selectedTarget === target.id ? 'selected' : ''}`}
                onClick={() => setSelectedTarget(target.id)}
                disabled={isSubmitting}
              >
                <div className="target-icon">☠️</div>
                <div className="target-name">{target.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button 
          className="hunter-confirm-btn" 
          onClick={handleSubmit}
          disabled={!selectedTarget || isSubmitting}
        >
          {isSubmitting ? 'İntikamını Alıyor...' : 'İntikamını Al'}
        </button>
      </div>
      </div>
    </div>
  );
}
