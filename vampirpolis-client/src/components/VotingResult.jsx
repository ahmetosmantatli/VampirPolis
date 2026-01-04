import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './VotingResult.css';

function VotingResult({ eliminatedPlayer, isTie, onContinue, roomCode }) {
  const [countdown, setCountdown] = useState(5);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanContinue(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleContinue = async () => {
    console.log('🌙 Gece fazına geçiliyor...');
    // Backend'e gece fazını başlatmasını söyle
    await signalR.invoke('ContinueToNight', roomCode);
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

        {canContinue ? (
          <button className="continue-btn" onClick={handleContinue}>
            ▶ Devam Et
          </button>
        ) : (
          <div className="countdown-display">
            <p className="countdown-text">Yeni gece fazı başlıyor...</p>
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VotingResult;
