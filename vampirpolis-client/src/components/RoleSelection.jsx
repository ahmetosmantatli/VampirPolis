import { useState, useEffect } from 'react';
import signalR from '../services/signalRService';
import './RoleSelection.css';

function RoleSelection({ roomCode, playerCount, selectedMode, onClose }) {
  // Zorunlu roller: 1 Vampir + 2 Polis (Mode 2'de Vampir otomatik MasterVampire'a dönüşür)
  const mandatoryRoles = ['Vampire', 'Police', 'Police'];
  
  // Mode 2'de Kahin yok! Fledgling başlangıçta seçilemez (sadece oyunda oluşur)
  const allOptionalRoles = [
    { 
      id: 'Vampire', 
      name: selectedMode === 'Mode2' ? 'Usta Vampir' : 'Ek Vampir', 
      icon: selectedMode === 'Mode2' ? '🧛‍♂️' : '🧛', 
      description: selectedMode === 'Mode2' ? 'Usta Vampir - Birini yeni yetme yapabilir' : 'Ek vampir rolü' 
    },
    { id: 'Doctor', name: 'Doktor', icon: '⚕️', description: 'Her gece bir kişiyi korur' },
    { id: 'SilentWitness', name: 'Sessiz Tanık', icon: '👁️', description: 'Oyunda oy gücü 2x' },
    { id: 'Seer', name: 'Kahin', icon: '🔮', description: 'Gece bir kişinin rolünü görür', mode1Only: true },
    { id: 'Hunter', name: 'Avcı', icon: '🎯', description: 'Ölünce birini yanında götürür' },
    { id: 'Innocent', name: 'Masum', icon: '👤', description: 'Öldürülürse o tur ölüm olmaz' },
    { id: 'Police', name: 'Ek Polis', icon: '👮', description: 'Ekstra polis rolü' }
  ];

  console.log('🎮 RoleSelection açıldı - selectedMode:', selectedMode);

  // Mode 2 ise Kahin'i filtrele
  const availableOptionalRoles = allOptionalRoles.filter(role => {
    const shouldShow = selectedMode === 'Mode1' || !role.mode1Only;
    if (role.id === 'Seer') {
      console.log(`🔮 Kahin filtresi: selectedMode=${selectedMode}, mode1Only=${role.mode1Only}, göster=${shouldShow}`);
    }
    return shouldShow;
  });

  const remainingSlots = playerCount - mandatoryRoles.length;
  
  // Her rolün sayısını tut (başlangıç 0)
  const [roleCounts, setRoleCounts] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Oyuncu sayısına göre maksimum rol limitleri
  const getMaxRoleCount = (roleId) => {
    if (roleId === 'Vampire') {
      // 7 kişi → max 1 vampir, 8-11 kişi → max 2 vampir, 12+ kişi → max 3 vampir
      if (playerCount <= 7) return 1;
      if (playerCount <= 11) return 2;
      return 3;
    }
    // Diğer tüm roller için max 3
    return 3;
  };

  // Toplam seçilen rol sayısı
  const getTotalSelectedRoles = () => {
    return Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
  };

  // Role + butonu handler
  const handleAddRole = (roleId) => {
    const currentCount = roleCounts[roleId] || 0;
    const maxCount = getMaxRoleCount(roleId);
    const totalSelected = getTotalSelectedRoles();
    
    // Max role sayısını veya toplam slot sayısını aşmamak için kontrol
    if (currentCount < maxCount && totalSelected < remainingSlots) {
      setRoleCounts({
        ...roleCounts,
        [roleId]: currentCount + 1
      });
    }
  };

  // Role - butonu handler
  const handleRemoveRole = (roleId) => {
    const currentCount = roleCounts[roleId] || 0;
    if (currentCount > 0) {
      const newCounts = { ...roleCounts };
      if (currentCount === 1) {
        delete newCounts[roleId]; // Son rol silinince state'ten kaldır
      } else {
        newCounts[roleId] = currentCount - 1;
      }
      setRoleCounts(newCounts);
    }
  };

  useEffect(() => {
    // Error event'ini dinle
    const errorHandler = (errorMessage) => {
      console.error('❌ RoleSelection hatası:', errorMessage);
      setIsSubmitting(false); // Gönderim bittiğinde tekrar gönder butonunu aktif et
    };

    signalR.on('Error', errorHandler);

    return () => {
      // SignalR connection'dan event kaldır
      signalR.connection.off('Error', errorHandler);
    };
  }, []);

  const handleSubmit = async () => {
    const totalSelected = getTotalSelectedRoles();
    
    if (totalSelected !== remainingSlots) {
      alert(`${remainingSlots} rol seçmelisin! Şu an ${totalSelected} seçili.`);
      return;
    }

    setIsSubmitting(true);
    
    // roleCounts'tan roller array'i oluştur
    const selectedRoles = [];
    Object.entries(roleCounts).forEach(([roleId, count]) => {
      for (let i = 0; i < count; i++) {
        selectedRoles.push(roleId);
      }
    });
    
    // Tüm rolleri birleştir
    const allRoles = [...mandatoryRoles, ...selectedRoles];
    
    console.log('🎴 Seçilen roller:', allRoles);
    console.log('📊 Rol detayları:', roleCounts);
    
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
              <div className="role-icon">{selectedMode === 'Mode2' ? '🧛‍♂️' : '🧛'}</div>
              <div className="role-name">{selectedMode === 'Mode2' ? 'Usta Vampir' : 'Vampir'}</div>
              <div className="role-count">x1</div>
              {selectedMode === 'Mode2' && <div className="role-note">Mode 2</div>}
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
          <h3>🎯 {remainingSlots} Rol Seç ({getTotalSelectedRoles()}/{remainingSlots})</h3>
          <p className="role-hint">⚠️ Her rolden max 3 adet seçebilirsin (Vampir: oyuncu sayısına göre)</p>
          <div className="role-cards">
            {availableOptionalRoles.map(role => {
              const currentCount = roleCounts[role.id] || 0;
              const maxCount = getMaxRoleCount(role.id);
              const totalSelected = getTotalSelectedRoles();
              const canAdd = currentCount < maxCount && totalSelected < remainingSlots;
              const canRemove = currentCount > 0;
              
              return (
                <div 
                  key={role.id}
                  className={`role-card counter-style ${currentCount > 0 ? 'has-selection' : ''}`}
                >
                  <div className="role-icon">{role.icon}</div>
                  <div className="role-name">{role.name}</div>
                  <div className="role-description">{role.description}</div>
                  
                  {/* Sayaç ve Butonlar */}
                  <div className="role-counter">
                    <button 
                      className="counter-btn minus"
                      onClick={() => handleRemoveRole(role.id)}
                      disabled={!canRemove}
                    >
                      −
                    </button>
                    <span className="counter-display">{currentCount}</span>
                    <button 
                      className="counter-btn plus"
                      onClick={() => handleAddRole(role.id)}
                      disabled={!canAdd}
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Max limit badge */}
                  {role.id === 'Vampire' && (
                    <div className="max-limit-info">Max: {maxCount}</div>
                  )}
                </div>
              );
            })}
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
            disabled={getTotalSelectedRoles() !== remainingSlots || isSubmitting}
          >
            {isSubmitting ? 'GÖNDERİLİYOR...' : 'ONAYLA VE BAŞLAT'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
