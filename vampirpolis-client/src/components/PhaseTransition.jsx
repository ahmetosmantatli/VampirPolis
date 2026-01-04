import { useEffect, useState, useRef } from 'react';

function PhaseTransition({ phase, turn, onComplete }) {
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  const hasStarted = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (hasStarted.current) return; // Sadece bir kez çalış
    hasStarted.current = true;
    
    console.log('🌙 PhaseTransition başladı, 1.5sn sonra kaybolacak');
    const timer = setTimeout(() => {
      console.log('✅ PhaseTransition kayboldu, onComplete çağrılıyor');
      setVisible(false);
      setTimeout(() => {
        console.log('✅ PhaseTransition onComplete tamamlandı');
        onCompleteRef.current();
      }, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getPhaseInfo = () => {
    if (phase === 'Night') {
      return {
        icon: '🌙',
        text: `GECE ${turn}`,
        subtitle: 'Vampirler av için hazırlanıyor...',
        color: '#1a1a2e'
      };
    } else {
      return {
        icon: '☀️',
        text: `GÜNDÜZ ${turn}`,
        subtitle: 'Köy toplantısı başladı',
        color: '#f4a261'
      };
    }
  };

  const phaseInfo = getPhaseInfo();

  if (!visible) return null;

  return (
    <div className="phase-transition-overlay">
      {/* Saydam arka plan - masa görünsün */}
      <div className="phase-content">
        <div className="phase-paper">
          <div className="phase-icon">{phaseInfo.icon}</div>
          <h1 className="phase-title">{phaseInfo.text}</h1>
          <p className="phase-subtitle">{phaseInfo.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default PhaseTransition;
