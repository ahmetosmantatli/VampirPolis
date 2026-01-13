import { useState } from 'react';
import './MasterVampireChoice.css';

export default function MasterVampireChoice({ connection, roomCode, alivePlayers = [] }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('🧛🟢 MasterVampireChoice MOUNTED!');
  console.log('🧛🟢 alivePlayers:', alivePlayers);
  console.log('🧛🟢 alivePlayers.length:', alivePlayers.length);
  console.log('🧛🟢 roomCode:', roomCode);
  console.log('🧛🟢 connection:', connection);

  const handleSubmit = async () => {
    if (!selectedPlayer || isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('🧛 Usta Vampir seçimini yaptı:', selectedPlayer);
    
    try {
      await connection.invoke('MasterVampireBite', roomCode, selectedPlayer);
      console.log('✅ Seçim gönderildi!');
    } catch (error) {
      console.error('❌ MasterVampireBite hatası:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="master-vampire-overlay">
      <div className="master-vampire-panel">
        <div className="master-vampire-header">
          <h1 className="master-vampire-title">🧛 USTA VAMPİR</h1>
          <p className="master-vampire-subtitle">Son nefesinde birini vampir yapacaksın...</p>
        </div>

        <div className="master-vampire-players">
          <h2>Kimi Vampir Yapıyorsun?</h2>
          <div className="player-grid">
            {alivePlayers.map((player) => (
              <button
                key={player.id}
                className={`player-card ${selectedPlayer === player.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlayer(player.id)}
                disabled={isSubmitting}
              >
                <div className="player-icon">🦇</div>
                <div className="player-name">{player.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button 
          className="master-vampire-confirm" 
          onClick={handleSubmit}
          disabled={!selectedPlayer || isSubmitting}
        >
          {isSubmitting ? 'Dönüştürülüyor...' : 'Vampir Yap'}
        </button>
      </div>
    </div>
  );
}
