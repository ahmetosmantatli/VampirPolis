import { useEffect, useState, useRef } from 'react';

function PhaseTransition({ phase, turn, onComplete, isLeader, nightResult, onStartVoting }) {
  const [visible, setVisible] = useState(true);
  const [showVotingStartMessage, setShowVotingStartMessage] = useState(false);
  const [phaseInfo, setPhaseInfo] = useState(null);
  const onCompleteRef = useRef(onComplete);
  const hasStarted = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  // ✅ YENİ: nightResult değiştiğinde phaseInfo'yu güncelle
  useEffect(() => {
    if (showVotingStartMessage) {
      setPhaseInfo({
        icon: '🗳️',
        text: 'OYLAMA BAŞLIYOR',
        subtitle: 'Gündüz Oylama Fazı Başlıyor...',
        color: '#ff6b6b'
      });
      return;
    }
    
    if (phase === 'Night') {
      setPhaseInfo({
        icon: '🌙',
        text: `GECE ${turn}`,
        subtitle: 'Vampirler av için hazırlanıyor...',
        color: '#1a1a2e'
      });
    } else {
      // Day fazı - Gece sonucu mesajını göster
      let subtitle = 'Köy toplantısı başladı';
      
      // ✅ KilledPlayers array'ini kontrol et ve mesaj oluştur
      const killedPlayers = nightResult?.killedPlayers || nightResult?.KilledPlayers || [];
      
      console.log('📊 PhaseTransition Day - nightResult:', nightResult);
      console.log('📊 killedPlayers:', killedPlayers);
      console.log('📊 killedPlayers.length:', killedPlayers.length);
      console.log('📊 killedPlayers[0]:', killedPlayers[0]);
      console.log('📊 killedPlayers[0] JSON:', JSON.stringify(killedPlayers[0]));
      console.log('📊 Array.isArray:', Array.isArray(killedPlayers));
      console.log('📊 nightResult.message:', nightResult?.message);
      
      if (killedPlayers && killedPlayers.length > 0) {
        console.log('💀 Ölüm mesajı oluşturuluyor, killedPlayers:', killedPlayers);
        const names = killedPlayers.map(p => {
          const playerName = p.name || p.Name;
          // Sadece isim döndür, rol ekleme
          console.log('💀 Player:', p, 'Name:', playerName);
          return playerName;
        }).join(', ');
        
        console.log('💀 Final names string:', names);
        
        if (killedPlayers.length === 1) {
          subtitle = `💀 Bu gece ${names} öldürüldü`;
        } else {
          subtitle = `💀 Bu gece ${names} öldürüldü`;
        }
      } else if (nightResult?.message) {
        // Backend'den message geliyorsa onu kullan
        subtitle = nightResult.message;
      } else {
        subtitle = '✅ Bu gece kimse ölmedi';
      }
      
      setPhaseInfo({
        icon: '☀️',
        text: `GÜNDÜZ ${turn}`,
        subtitle: subtitle,
        color: '#f4a261'
      });
    }
  }, [showVotingStartMessage, phase, turn, nightResult]);

  useEffect(() => {
    if (hasStarted.current) return; // Sadece bir kez çalış
    hasStarted.current = true;
    
    // Day fazında MANUEL kapatma (lider butonu ile)
    // Night fazında OTOMATİK kapatma (1.5 saniye)
    if (phase === 'Night') {
      console.log('🌙 Night PhaseTransition başladı, 1.5sn sonra kaybolacak');
      const timer = setTimeout(() => {
        console.log('✅ PhaseTransition kayboldu, onComplete çağrılıyor');
        setVisible(false);
        setTimeout(() => {
          console.log('✅ PhaseTransition onComplete tamamlandı');
          onCompleteRef.current();
        }, 300);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      console.log('☀️ Day PhaseTransition - Lider butonu bekleniyor, otomatik kapanmayacak');
    }
  }, [phase]);

  const handleStartVoting = async () => {
    console.log('🗳️ Lider oylama başlatıyor...');
    setShowVotingStartMessage(true);
    
    // 5 saniye "Gündüz Oylama Fazı Başlıyor" mesajı göster
    setTimeout(async () => {
      setShowVotingStartMessage(false);
      if (onStartVoting) {
        await onStartVoting();
      }
      // PhaseTransition'ı kapat
      setVisible(false);
      setTimeout(() => {
        onCompleteRef.current();
      }, 300);
    }, 5000);
  };

  if (!visible || !phaseInfo) return null;

  console.log('🎨 PhaseTransition RENDER - phaseInfo:', phaseInfo);
  console.log('🎨 Subtitle:', phaseInfo.subtitle);

  return (
    <div className="phase-transition-overlay">
      {/* Saydam arka plan - masa görünsün */}
      <div className="phase-content">
        <div className="phase-paper">
          <div className="phase-icon">{phaseInfo.icon}</div>
          <h1 className="phase-title">{phaseInfo.text}</h1>
          <p className="phase-subtitle">{phaseInfo.subtitle}</p>
          
          {/* Day fazında lider için Oylama Başlat butonu */}
          {phase === 'Day' && isLeader && !showVotingStartMessage && (
            <button 
              className="start-voting-btn"
              onClick={handleStartVoting}
              style={{
                marginTop: '30px',
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(255, 107, 107, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
              }}
            >
              🗳️ Oylama Başlat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhaseTransition;
