import { useState, useEffect, useRef } from 'react';

function RoleDistribution({ roleInfo, onComplete }) {
  const [stage, setStage] = useState('roles'); // roles -> dice -> cards -> done
  const [diceRotation, setDiceRotation] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const hasStarted = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Safety check
  if (!roleInfo) {
    console.error('❌ RoleDistribution: roleInfo is null!');
    onCompleteRef.current();
    return null;
  }

  console.log('🎬 RoleDistribution rendered, stage:', stage);

  useEffect(() => {
    if (hasStarted.current) return; // Sadece bir kez çalış
    hasStarted.current = true;
    
    console.log('⏰ Stage "roles" başladı, 2 saniye sonra "dice"');
    const rolesTimer = setTimeout(() => {
      console.log('🎲 Dice stage\'ına geçiliyor...');
      setStage('dice');
    }, 2000);

    return () => clearTimeout(rolesTimer);
  }, []);

  useEffect(() => {
    if (stage === 'dice') {
      console.log('⏰ Stage "dice" başladı, 1.5 saniye döner, sonra "cards"');
      const diceInterval = setInterval(() => {
        setDiceRotation(prev => prev + 30);
      }, 50);

      const diceTimer = setTimeout(() => {
        clearInterval(diceInterval);
        console.log('🃏 Cards stage\'ına geçiliyor...');
        setStage('cards');
      }, 1500);

      return () => {
        clearInterval(diceInterval);
        clearTimeout(diceTimer);
      };
    } else if (stage === 'cards') {
      console.log('⏰ Stage "cards" başladı, 2 saniye sonra "done" ve onComplete');
      const cardsTimer = setTimeout(() => {
        console.log('✅ Cards tamamlandı, onComplete çağrılıyor!');
        setStage('done');
        onCompleteRef.current();
      }, 2000);

      return () => clearTimeout(cardsTimer);
    }
  }, [stage]);

  return (
    <div className="role-distribution-overlay">
      {/* Blackjack masası arka planda blur ile */}
      <div className="distribution-content">
        
        {stage === 'roles' && (
          <div className="roles-info fade-in">
            <h2>🎭 AKTİF ROLLER</h2>
            <div className="roles-list">
              <div className="role-item vampire">
                <span className="role-icon">🧛</span>
                <span className="role-count">{roleInfo.vampireCount} VAMPİR</span>
              </div>
              <div className="role-item police">
                <span className="role-icon">👮</span>
                <span className="role-count">{roleInfo.policeCount} POLİS</span>
              </div>
              {roleInfo.doctorCount > 0 && (
                <div className="role-item doctor">
                  <span className="role-icon">⚕️</span>
                  <span className="role-count">{roleInfo.doctorCount} DOKTOR</span>
                </div>
              )}
              {roleInfo.citizenCount > 0 && (
                <div className="role-item citizen">
                  <span className="role-icon">👁️</span>
                  <span className="role-count">{roleInfo.citizenCount} SESSİZ TANIK</span>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === 'dice' && (
          <div className="dice-animation fade-in">
            <div 
              className="dice" 
              style={{ 
                transform: `rotate(${diceRotation}deg) scale(1.5)` 
              }}
            >
              🎲
            </div>
            <p className="dice-text">Roller karıştırılıyor...</p>
          </div>
        )}

        {stage === 'cards' && (
          <div className="cards-distribution fade-in">
            <div className="cards-flying">
              {Array.from({ length: roleInfo.totalPlayers }).map((_, i) => (
                <div 
                  key={i} 
                  className="flying-card"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    '--target-rotation': `${i * (360 / roleInfo.totalPlayers)}deg`
                  }}
                >
                  🃏
                </div>
              ))}
            </div>
            <p className="cards-text">Kartlar dağıtılıyor...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoleDistribution;
