import './DeadPlayerOverlay.css';

function DeadPlayerOverlay({ playerName, message }) {
  return (
    <div className="dead-overlay">
      <div className="dead-panel">
        <div className="skull-icon">💀</div>
        <h2 className="dead-title">OYUNDAN ÇIKTIN!</h2>
        <p className="dead-message">
          {message || `${playerName}, vampirler seni katletti!`}
        </p>
        <div className="dead-info">
          <p>🎭 Oyunu izlemeye devam edebilirsin</p>
          <p>⚠️ Artık oy kullanamazsın</p>
        </div>
      </div>
    </div>
  );
}

export default DeadPlayerOverlay;
