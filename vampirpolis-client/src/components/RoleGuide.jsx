import { useState } from 'react';
import './RoleGuide.css';

function RoleGuide({ onClose }) {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  const roles = [
    {
      id: 'Vampire',
      name: 'VAMPİR',
      icon: '🧛',
      color: '#dc2626',
      description: 'Polisleri öldür, kimliğini gizle',
      abilities: [
        '🌙 Her gece bir kişiyi öldürür',
        '👥 Diğer vampirleri tanır',
        '🤝 Vampirler koordineli hareket etmeli',
        '⚠️ Aynı hedefi seçmelisiniz'
      ],
      winCondition: 'Vampir sayısı ≥ Diğer oyuncular',
      strategy: 'Gündüz masum gibi davran, gece koordineli hareket et'
    },
    {
      id: 'MasterVampire',
      name: 'USTA VAMPİR',
      icon: '🦇',
      color: '#991b1b',
      description: 'Avlanır ve öldüğünde birini ısırır',
      abilities: [
        '🌙 Her gece avlanabilir (Vampir gibi)',
        '☠️ Öldüğünde birini Yeni Yetme Vampir yapar',
        '🧛 Vampir takımının lideridir',
        '💀 Ölümü bile avantaja çevirir'
      ],
      winCondition: 'Vampir sayısı ≥ Diğer oyuncular',
      strategy: 'Aktif avlan, ölsen bile takımını güçlendir'
    },
    {
      id: 'Fledgling',
      name: 'YENİ YETME VAMPİR',
      icon: '🦇',
      color: '#7f1d1d',
      description: 'Usta Vampir tarafından ısırılan oyuncu',
      abilities: [
        '🧛 Usta Vampir ölünce atanırsın',
        '🌙 Vampirlerle birlikte avlanabilirsin',
        '🚫 Kartların mekanlarda gözükmez',
        '⚠️ Yakalanırsan köylüler kazanır!'
      ],
      winCondition: 'Yakalanmadan vampir sayısı ≥ Diğer oyuncular',
      strategy: 'Son derece dikkatli ol! Yakalanma = Oyun Kaybı'
    },
    {
      id: 'Police',
      name: 'POLİS',
      icon: '👮',
      color: '#3b82f6',
      description: 'Vampirleri bul ve oyla',
      abilities: [
        '🗳️ Gündüz oylamada rol oynar',
        '🕵️ Konuşmaları analiz et',
        '💭 Mantıklı çıkarımlar yap',
        '🤔 Şüpheli davranışları izle'
      ],
      winCondition: 'Tüm vampirleri bul ve öldür',
      strategy: 'Dikkatli dinle, mantıklı oy ver, doktoru ve sessiz tanığı koru'
    },
    {
      id: 'Doctor',
      name: 'DOKTOR',
      icon: '⚕️',
      color: '#10b981',
      description: 'Her gece bir kişiyi kurtar',
      abilities: [
        '🩺 Her gece 1 kişiyi korur',
        '🚫 Kendini kurtaramaz',
        '⏸️ Aynı kişiyi üst üste kurtaramaz',
        '💡 Vampirin hedefini tahmin et'
      ],
      winCondition: 'Polislerle birlikte vampirleri yok et',
      strategy: 'Kimliğini sakla! Vampirin hedefini tahmin etmeye çalış'
    },
    {
      id: 'SilentWitness',
      name: 'SESSİZ TANIK',
      icon: '👁️',
      color: '#8b5cf6',
      description: 'Oyunda oyun 2 kat sayılır',
      abilities: [
        '⚡ Oyun gücü 2x',
        '🤫 Kimse bu gücünü bilmez',
        '🎯 Kritik anlarda etkili',
        '💪 Tek başına sonucu değiştirebilir'
      ],
      winCondition: 'Polislerle birlikte kazanırsın',
      strategy: 'Az konuş, kritik anlarda oy ver, dikkat çekme'
    },
    {
      id: 'Seer',
      name: 'KAHİN',
      icon: '🔮',
      color: '#f59e0b',
      description: 'Her gece bir kişinin rolünü öğrenir',
      abilities: [
        '🔮 Her gece 1 kişinin rolünü görür',
        '👀 Vampirleri tespit edebilir',
        '🗣️ Bilgiyi paylaşma kararı senin',
        '⚖️ Dikkatli ol, hedef olabilirsin'
      ],
      winCondition: 'Polislerle birlikte kazanırsın',
      strategy: 'Vampiri bulduktan sonra dikkatli paylaş, kendini sakla'
    },
    {
      id: 'Hunter',
      name: 'AVCI',
      icon: '🎯',
      color: '#ea580c',
      description: 'Öldüğünde birini yanında götürür',
      abilities: [
        '🎯 Öldüğünde 1 kişiyi seçer',
        '💥 Vampir öldürürsen büyük avantaj',
        '⚔️ Gece veya gündüz fark etmez',
        '🛡️ Vampirlerin korkulu rüyası'
      ],
      winCondition: 'Polislerle birlikte kazanırsın',
      strategy: 'Aktif oyna, şüphelileri işaretle, ölürsen doğru seç'
    },
    {
      id: 'Innocent',
      name: 'MASUM',
      icon: '👤',
      color: '#64748b',
      description: 'Öldürülürse kimse ölmez',
      abilities: [
        '🛡️ Öldürülürsen kimse ölmez',
        '😇 Tamamen masumsun',
        '🎭 Vampir gibi davranabilirsin',
        '🔄 Vampiri yanıltabilirsin'
      ],
      winCondition: 'Polislerle birlikte kazanırsın',
      strategy: 'Dikkat çek, vampirin seni hedef almasını sağla'
    }
  ];

  const currentRole = roles[currentRoleIndex];

  const nextRole = () => {
    if (currentRoleIndex < roles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
    }
  };

  const prevRole = () => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(currentRoleIndex - 1);
    }
  };

  return (
    <div className="role-guide-overlay">
      <div className="role-guide-modal">
        <button className="close-guide-btn" onClick={onClose}>✕</button>
        
        <div className="role-guide-header">
          <h2>📖 ROL REHBERİ</h2>
          <p className="role-counter">{currentRoleIndex + 1} / {roles.length}</p>
        </div>

        <div className="role-guide-content" style={{ borderColor: currentRole.color }}>
          <div className="role-guide-icon" style={{ background: currentRole.color }}>
            {currentRole.icon}
          </div>
          
          <h3 className="role-guide-name" style={{ color: currentRole.color }}>
            {currentRole.name}
          </h3>
          
          <p className="role-guide-description">{currentRole.description}</p>

          <div className="role-guide-section">
            <h4>🎮 Yetenekler</h4>
            <ul className="role-abilities">
              {currentRole.abilities.map((ability, index) => (
                <li key={index}>{ability}</li>
              ))}
            </ul>
          </div>

          <div className="role-guide-section">
            <h4>🏆 Kazanma Koşulu</h4>
            <p className="win-condition">{currentRole.winCondition}</p>
          </div>

          <div className="role-guide-section strategy">
            <h4>💡 Strateji İpucu</h4>
            <p>{currentRole.strategy}</p>
          </div>
        </div>

        <div className="role-guide-navigation">
          <button 
            className="nav-btn prev-btn" 
            onClick={prevRole}
            disabled={currentRoleIndex === 0}
          >
            ← ÖNCEKİ
          </button>
          <div className="role-dots">
            {roles.map((_, index) => (
              <span 
                key={index}
                className={`dot ${index === currentRoleIndex ? 'active' : ''}`}
                onClick={() => setCurrentRoleIndex(index)}
              />
            ))}
          </div>
          <button 
            className="nav-btn next-btn" 
            onClick={nextRole}
            disabled={currentRoleIndex === roles.length - 1}
          >
            SONRAKİ →
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleGuide;
