import './DeadPlayerOverlay.css';

function DeadPlayerOverlay({ playerName, message, showTitle = true, isDeathNotification = false }) {
  // Başlık varsa kırmızı (ölüm), ölüm bildirimi ise kırmızı, değilse yeşil (bildirim)
  const panelClass = (showTitle || isDeathNotification) ? 'dead-panel' : 'notification-panel';
  
  return (
    <div className="dead-overlay">
      <div className={panelClass}>
        <div className="skull-icon">💀</div>
        {showTitle && <h2 className="dead-title">OYUNDAN ÇIKTIN!</h2>}
        <p className={showTitle ? "dead-message" : "notification-message"}>
          {message || `${playerName}, vampirler seni katletti!`}
        </p>
        {showTitle && (
          <div className="dead-info">
            <p>🎭 Oyunu izlemeye devam edebilirsin</p>
            <p>⚠️ Artık oy kullanamazsın</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeadPlayerOverlay;
