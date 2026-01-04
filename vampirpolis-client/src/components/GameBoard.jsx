import { useState } from 'react';
import RoleCard from './RoleCard';
import signalR from '../services/signalRService';

function GameBoard({ room, myRole, vampireTeam, nightData, playerName }) {
  const [showRoleDetail, setShowRoleDetail] = useState(false);
  const isLeader = room?.Players?.find(p => p.Name === playerName)?.IsLeader;

  const startVoting = async () => {
    await signalR.invoke('StartVoting', room.RoomCode);
  };

  const endNightPhase = async () => {
    await signalR.invoke('EndNightPhase', room.RoomCode);
  };

  return (
    <div className="game-board">
      <div className="game-header">
        <h2>🎮 VAMPİR - POLİS</h2>
        <p>TUR {room?.Turn || 1}</p>
      </div>

      {/* Yeşil bilardo masası arka plan */}
      <div className="billiard-table">
        {/* Ortada dekoratif kart */}
        <div className="center-card">
          <div className="card-back">🃏</div>
          <p>YALANCI KART</p>
        </div>

        {/* Oyuncu kartları */}
        <div className="player-cards">
          {room?.Players?.map((player) => {
            // Eğer bu benim kartım ise, rolümü göster
            const isMyCard = player.Name === playerName;
            const displayText = isMyCard ? myRole : player.Name;
            
            return (
              <div 
                key={player.Id} 
                className={`player-card ${!player.IsAlive ? 'dead' : ''} ${isMyCard ? 'my-card' : ''}`}
              >
                <div className="card-content">
                  {!player.IsAlive && <div className="dead-marker">⚫</div>}
                  <p className="player-name">{displayText}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Durum bilgisi */}
      <div className="game-status">
        {room?.Phase === 'Day' && (
          <>
            <h3>☀️ GÜNDÜZ - TUR {room.Turn}</h3>
            {nightData?.KilledPlayerName ? (
              <p className="death-message">⚫ {nightData.KilledPlayerName} öldü</p>
            ) : (
              <p className="safe-message">🟢 Gece kimse ölmedi</p>
            )}
            <p>Lider konuşmayı yönetiyor...</p>
            {isLeader && (
              <button className="action-btn" onClick={startVoting}>
                OYLAMA BAŞLAT
              </button>
            )}
          </>
        )}
      </div>

      {/* Sol alt: Kendi rol kartı */}
      <div className="my-role-card">
        <RoleCard 
          role={myRole}
          vampireTeam={vampireTeam}
          room={room}
          showDetail={showRoleDetail}
          onToggle={() => setShowRoleDetail(!showRoleDetail)}
        />
      </div>
    </div>
  );
}

export default GameBoard;