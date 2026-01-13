import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './VotingResult.css';

function VotingResult({ eliminatedPlayer, isTie, onContinue, roomCode, gameMode, isPlayerDead }) {
  const [countdown, setCountdown] = useState(5);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanContinue(true);
          clearInterval(timer);
          
          // Ölü oyuncu için otomatik devam
          if (isPlayerDead) {
            console.log('💀 Ölü oyuncu - otomatik devam ediliyor...');
            setTimeout(() => {
              handleContinue();
            }, 500);
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayerDead]);

  const handleContinue = async () => {
    console.log(`🎬 Gece fazına geçiliyor... (Mode: ${gameMode})`);
    
    // Mode 2: LocationSelection için ContinueToLocationSelection çağır
    // Mode 1: Night için ContinueToNight çağır
    if (gameMode === 'Mode2') {
      console.log('🏠 Mode 2: PhaseTransition sonrası LocationSelection açılacak');
      await signalR.invoke('ContinueToLocationSelection', roomCode);
    } else {
      console.log('🌙 Mode 1: PhaseTransition sonrası Night başlayacak');
      await signalR.invoke('ContinueToNight', roomCode);
    }
    
    // Frontend state'ini güncelle
    onContinue();
  };

  return (
    <div className="voting-result-overlay">
      <div className="voting-result-modal">
        <div className="result-header">
          <h2>🗳️ OYLAMA SONUCU</h2>
        </div>

        <div className="result-content">
          {isTie || !eliminatedPlayer ? (
            <>
              <div className="no-elimination-icon">🤝</div>
              <h3 className="no-elimination-text">Beraberlik</h3>
              <p className="no-elimination-desc">En çok oy eşit geldi, kimse elenmedi</p>
            </>
          ) : (
            <>
              <div className="eliminated-icon">❌</div>
              <h3 className="eliminated-text">Oyundan Çıkarıldı</h3>
              <div className="eliminated-name">{eliminatedPlayer?.Name || eliminatedPlayer?.name}</div>
            </>
          )}
        </div>

        {canContinue && !isPlayerDead ? (
          <button className="continue-btn" onClick={handleContinue}>
            ▶ Devam Et
          </button>
        ) : (
          <div className="countdown-display">
            <p className="countdown-text">
              {isPlayerDead ? '💀 İzleyici modundasın - Otomatik devam ediliyor...' : 'Yeni gece fazı başlıyor...'}
            </p>
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VotingResult;
