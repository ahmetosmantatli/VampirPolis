function RoleCard({ role, vampireTeam, room, showDetail, onToggle }) {
  const getRoleIcon = () => {
    switch (role) {
      case 'Vampire': return '🧛';
      case 'Doctor': return '🩺';
      case 'SilentWitness': return '🔇';
      case 'Police': return '🟦';
      case 'Seer': return '🔮';
      case 'Hunter': return '🎯';
      case 'Innocent': return '👤';
      default: return '❓';
    }
  };

  const getRoleName = () => {
    switch (role) {
      case 'Vampire': return 'VAMPİR';
      case 'Doctor': return 'DOKTOR';
      case 'SilentWitness': return 'SESSİZ TANIK';
      case 'Police': return 'POLİS';
      case 'Seer': return 'KAHİN';
      case 'Hunter': return 'AVCI';
      case 'Innocent': return 'MASUM';
      default: return 'BİLİNMEYEN';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'Vampire':
        const vampireNames = room?.Players
          ?.filter(p => vampireTeam.includes(p.Id))
          .map(p => p.Name)
          .join(', ');
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} VAMPİR</h3>
            <p><strong>Görevin:</strong></p>
            <p>Polisleri öldür, kimliğini gizle</p>
            <p><strong>Takımın:</strong></p>
            <p>{vampireNames}</p>
            <p><strong>Gece:</strong></p>
            <p>Takımınla beraber 1 hedef seçin (aynı kişiyi seçmeli)</p>
            <p><strong>Kazanma:</strong></p>
            <p>Vampir sayısı ≥ Polis sayısı</p>
          </div>
        );
      case 'Doctor':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} DOKTOR</h3>
            <p><strong>Görevin:</strong></p>
            <p>Her gece 1 kişiyi kurtar</p>
            <p><strong>Kurallar:</strong></p>
            <p>• Kendini kurtaramazsın</p>
            <p>• Aynı kişiyi üst üste kurtaramazsın</p>
            <p><strong>Gece:</strong></p>
            <p>Vampirin hedefini tahmin et. Doğru seçersen ölüm olmaz</p>
            <p><strong>⚠️ Kimse doktor olduğunu bilmemeli!</strong></p>
          </div>
        );
      case 'SilentWitness':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} SESSİZ TANIK</h3>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '1.1em',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
            }}>
              ⚡ OYUN 2X SAYILIR ⚡
            </div>
            <p><strong>Özel Gücün:</strong></p>
            <p>Oylamada oyun 2 SAYILIR</p>
            <p><strong>⚠️ KIMSEDEN BAHSETMEYİN!</strong></p>
            <p>Bunu sadece sen biliyorsun</p>
            <p><strong>Strateji:</strong></p>
            <p>• Az konuş</p>
            <p>• Kritik anlarda oy ver</p>
            <p>• Dikkat çekme</p>
            <p><strong>Gece Gücü:</strong> Yok</p>
          </div>
        );
      case 'Police':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} POLİS</h3>
            <p><strong>Görevin:</strong></p>
            <p>Vampirleri bul ve oyla</p>
            <p><strong>Gece Gücü:</strong> Yok</p>
            <p><strong>Strateji:</strong></p>
            <p>• Konuşmaları dinle</p>
            <p>• Şüpheli davranışları tespit et</p>
            <p>• Mantıklı oy ver</p>
            <p><strong>Kazanma:</strong></p>
            <p>Tüm vampirleri bul</p>
          </div>
        );
      case 'Seer':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} KAHİN</h3>
            <p><strong>Görevin:</strong></p>
            <p>Her gece bir kişinin rolünü öğren</p>
            <p><strong>Gece Gücü:</strong></p>
            <p>Bir oyuncunun rolünü görürsün</p>
            <p><strong>Strateji:</strong></p>
            <p>• Vampiri bulduktan sonra dikkatli paylaş</p>
            <p>• Kendini sakla, hedef olma</p>
            <p>• Bilgiyi zamanında kullan</p>
            <p><strong>⚠️ Dikkat:</strong> Vampirler seni hedef alabilir!</p>
          </div>
        );
      case 'Hunter':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} AVCI</h3>
            <p><strong>Görevin:</strong></p>
            <p>Öldüğünde birini yanında götür</p>
            <p><strong>Özel Gücün:</strong></p>
            <p>Ölünce 1 kişiyi seçersin ve o da ölür</p>
            <p><strong>Strateji:</strong></p>
            <p>• Aktif oyna</p>
            <p>• Şüphelileri işaretle</p>
            <p>• Ölürsen doğru kişiyi seç</p>
            <p><strong>💡 İpucu:</strong> Vampirin en büyük korkusu sensin!</p>
          </div>
        );
      case 'Innocent':
        return (
          <div className="role-detail">
            <h3>{getRoleIcon()} MASUM</h3>
            <p><strong>Görevin:</strong></p>
            <p>Öldürülürsen kimse ölmez</p>
            <p><strong>Özel Gücün:</strong></p>
            <p>Seni öldürürlerse o tur kimse ölmez</p>
            <p><strong>Strateji:</strong></p>
            <p>• Dikkat çek</p>
            <p>• Vampir gibi davranabilirsin</p>
            <p>• Vampirin seni hedef almasını sağla</p>
            <p><strong>💪 Avantaj:</strong> Ölümün bile takımına yardım eder!</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`role-card-mini ${role === 'SilentWitness' ? 'silent-witness-mini' : ''}`} onClick={onToggle}>
        <span className="role-icon">{getRoleIcon()}</span>
        <span className="role-name">{getRoleName()}</span>
        {role === 'SilentWitness' && (
          <span className="vote-power-badge" style={{
            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            color: '#fbbf24',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            2x
          </span>
        )}
        <button className="detail-btn">DETAY GÖR</button>
      </div>

      {showDetail && (
        <div className="role-detail-modal">
          <div className="modal-content vintage-paper">
            <button className="close-btn" onClick={onToggle}>✕</button>
            {getRoleDescription()}
          </div>
        </div>
      )}
    </>
  );
}

export default RoleCard;