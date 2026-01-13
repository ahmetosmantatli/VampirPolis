import { useState, useEffect, useRef } from 'react';
import './CardReveal.css';

function CardReveal({ revealedCards, onComplete, playerName, myRole }) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [revealedCardId, setRevealedCardId] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);
  
  // Props'u ref'te tut - closure probleminden kaçınmak için
  const cardsRef = useRef(revealedCards);
  const onCompleteRef = useRef(onComplete);

  console.log('🎴 CardReveal MOUNTED!');
  console.log('🎴 revealedCards:', revealedCards);
  console.log('🎴 playerName:', playerName);
  console.log('🎴 myRole:', myRole);
  console.log('🎴 Cards count:', revealedCards?.length);
  console.log('🎴 First card detail:', revealedCards?.[0]);
  console.log('🎴 IsRevealed values:', revealedCards?.map(c => `${c.playerName}: ${c.isRevealed}`));

  useEffect(() => {
    console.log('🎴 CardReveal useEffect started');
    console.log('🎴 Cards in ref:', cardsRef.current);
    
    // 2 saniye sonra kartı aç
    const revealTimer = setTimeout(() => {
      console.log('⏰ 2 saniye geçti, kart açılacak');
      // isRevealed=true olan kartı bul
      const cardToReveal = cardsRef.current.find(c => c.isRevealed);
      console.log('🔍 Açılacak kart:', cardToReveal);
      if (cardToReveal) {
        console.log('✨ Işıldama başlıyor...');
        setIsRevealing(true);
        setTimeout(() => {
          console.log('💚 Kart yeşile dönüyor:', cardToReveal.playerId);
          setRevealedCardId(cardToReveal.playerId);
          setIsRevealing(false);
        }, 500); // Işıldama animasyonu 0.5 saniye
      } else {
        console.error('❌ IsRevealed=true olan kart bulunamadı!', cardsRef.current);
      }
    }, 2000);

    // 30 saniye countdown
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onCompleteRef.current(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(revealTimer);
    };
  }, []); // Boş dependency - sadece ilk mount'ta çalış!

  // Rol ikonları
  const roleIcons = {
    Vampire: '🧛',
    MasterVampire: '🧛‍♂️', // MasterVampire kartı gösterilir
    Doctor: '⚕️',
    Police: '👮',
    SilentWitness: '👁️',
    Hunter: '🎯',
    Innocent: '👤',
    Citizen: '👤',
    Fledgling: '🧛' // Fledgling kartı hiç gözükmez ama ekliyoruz
  };

  // Rol isimleri (Türkçe)
  const roleNames = {
    Vampire: 'VAMPİR',
    MasterVampire: 'USTA VAMPİR', // MasterVampire kartı gösterilir
    Doctor: 'DOKTOR',
    Police: 'POLİS',
    SilentWitness: 'SESSİZ TANIK',
    Hunter: 'AVCI',
    Innocent: 'MASUM',
    Citizen: 'VATANDAŞ',
    Fledgling: 'YENİ YETME VAMPİR' // Fledgling kartı hiç gözükmez - rastgele başkası gösterilir
  };

  return (
    <div className="card-reveal-overlay">
      <div className="card-reveal-header">
        <h1>🃏 {revealedCardId ? 'KART AÇILDI!' : 'KART AÇILIYOR...'}</h1>
        <div className="countdown">
          <span className="countdown-number">{timeRemaining}</span>
          <span className="countdown-label">saniye</span>
        </div>
        <p className="reveal-info">💡 Mekanındaki oyuncuları görüyorsun - 2 saniye sonra 1 kart açılacak!</p>
      </div>

      {/* Masadaki kartlar gibi göster */}
      <div className="cards-row-reveal">
        {revealedCards.map((card, index) => {
          // Bu kart benim mi?
          const isMyCard = card.playerName === playerName;
          // Bu kart açıldı mı?
          const isCardRevealed = card.playerId === revealedCardId;
          // Işıldama animasyonu
          const isGlowing = isRevealing && card.isRevealed;
          // Fledgling kartı ASLA AÇILMAZ (hiç yeşile dönmez)
          const isFledgling = card.role === 'Fledgling';
          
          // Fledgling kartları HİÇ ZAMAN açılmaz - DAIMA BEYAZ KALIR
          const shouldReveal = isCardRevealed && !isFledgling;
          
          return (
            <div key={index} className="card-slot-reveal">
              {/* BAŞTA BEYAZ, AÇILINCA YEŞİL (Fledgling hariç - o HEP BEYAZ) */}
              <div className={`playing-card-reveal ${shouldReveal ? 'revealed-green' : 'white-card'} ${isMyCard && shouldReveal ? 'my-revealed-card' : ''} ${isGlowing && !isFledgling ? 'glowing-card' : ''}`}>
                {shouldReveal && <div className="card-glow-reveal"></div>}
                
                <div className="card-content-reveal">
                  {shouldReveal ? (
                    <>
                      {/* AÇILAN KART - Rol göster */}
                      <div className="role-icon-reveal">{roleIcons[card.role]}</div>
                      <div className="player-name-reveal">{card.playerName}</div>
                      <div className="role-name-reveal">{roleNames[card.role]}</div>
                      {isMyCard && (
                        <div className="my-card-badge">SENİN KARTIN AÇILDI!</div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* BEYAZ KART - Masadaki gibi sadece isim */}
                      <div className="player-name-white">{card.playerName}</div>
                      {isMyCard && (
                        <div className="my-role-hint">({roleNames[myRole] || myRole})</div>
                      )}
                      {/* AÇILMAYAN KARTLARDA ROL BİLGİSİ GÖSTERİLMEZ! */}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CardReveal;
