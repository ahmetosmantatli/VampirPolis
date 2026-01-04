import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './RoleSelection.css';

function RoleSelection({ roomCode, playerCount, onClose }) {
  // Zorunlu roller: 1 Vampir + 2 Polis
  const mandatoryRoles = ['Vampire', 'Police', 'Police'];
  const availableOptionalRoles = [
    { id: 'Doctor', name: 'Doktor', icon: '⚕️', description: 'Her gece bir kişiyi korur' },
    { id: 'SilentWitness', name: 'Sessiz Tanık', icon: '👁️', description: 'Oyunda oy gücü 2x' },
    { id: 'Seer', name: 'Kahin', icon: '🔮', description: 'Gece bir kişinin rolünü görür' },
    { id: 'Hunter', name: 'Avcı', icon: '🎯', description: 'Ölünce birini yanında götürür' },
    { id: 'Innocent', name: 'Masum', icon: '👤', description: 'Öldürülürse o tur ölüm olmaz' },
    { id: 'Police', name: 'Ek Polis', icon: '👮', description: 'Ekstra polis rolü' }
  ];

  const remainingSlots = playerCount - mandatoryRoles.length;
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleClick = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      // Seçimi kaldır
      setSelectedRoles(selectedRoles.filter(r => r !== roleId));
    } else {
      // Seçim yap (eğer limit dolmadıysa)
      if (selectedRoles.length < remainingSlots) {
        setSelectedRoles([...selectedRoles, roleId]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedRoles.length !== remainingSlots) {
      alert(`${remainingSlots} rol seçmelisin! Şu an ${selectedRoles.length} seçili.`);
      return;
    }

    setIsSubmitting(true);
    
    // Tüm rolleri birleştir
    const allRoles = [...mandatoryRoles, ...selectedRoles];
    
    console.log('🎴 Seçilen roller:', allRoles);
    
    try {
      await signalR.invoke('StartGameWithRoles', roomCode, allRoles);
      console.log('✅ Roller gönderildi');
    } catch (err) {
      console.error('❌ Rol gönderme hatası:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="role-selection-overlay">
      <div className="role-selection-modal">
        <div className="role-selection-header">
          <h2>🎴 ROL SEÇİMİ</h2>
          <p className="player-info">Toplam Oyuncu: {playerCount}</p>
        </div>

        {/* Zorunlu Roller */}
        <div className="mandatory-roles">
          <h3>⚠️ Zorunlu Roller</h3>
          <div className="role-cards">
            <div className="role-card mandatory">
              <div className="role-icon">🧛</div>
              <div className="role-name">Vampir</div>
              <div className="role-count">x1</div>
            </div>
            <div className="role-card mandatory">
              <div className="role-icon">👮</div>
              <div className="role-name">Polis</div>
              <div className="role-count">x2</div>
            </div>
          </div>
        </div>

        {/* Seçilebilir Roller */}
        <div className="optional-roles">
          <h3>🎯 {remainingSlots} Rol Seç ({selectedRoles.length}/{remainingSlots})</h3>
          <div className="role-cards">
            {availableOptionalRoles.map(role => (
              <div 
                key={role.id}
                className={`role-card selectable ${selectedRoles.includes(role.id) ? 'selected' : ''} ${selectedRoles.length >= remainingSlots && !selectedRoles.includes(role.id) ? 'disabled' : ''}`}
                onClick={() => handleRoleClick(role.id)}
              >
                <div className="role-icon">{role.icon}</div>
                <div className="role-name">{role.name}</div>
                <div className="role-description">{role.description}</div>
                {selectedRoles.includes(role.id) && <div className="selected-badge">✓</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Butonlar */}
        <div className="role-selection-actions">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            İPTAL
          </button>
          <button 
            className="confirm-btn" 
            onClick={handleSubmit}
            disabled={selectedRoles.length !== remainingSlots || isSubmitting}
          >
            {isSubmitting ? 'GÖNDERİLİYOR...' : 'ONAYLA VE BAŞLAT'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
