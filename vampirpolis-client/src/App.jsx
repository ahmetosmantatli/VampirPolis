import { useState, useEffect, useRef } from 'react';
import signalR from './services/signalRService';
import Lobby from './components/Lobby';
import RoleSelection from './components/RoleSelection';
import RoleDistribution from './components/RoleDistribution';
import PhaseTransition from './components/PhaseTransition';
import GameTable from './components/GameTable';
import LocationSelection from './components/LocationSelection';
import CardReveal from './components/CardReveal';
import NightPhase from './components/NightPhase';
import DoctorPhase from './components/DoctorPhase';
import SeerPhase from './components/SeerPhase';
import HunterPhase from './components/HunterPhase';
import MasterVampireChoice from './components/MasterVampireChoice';
import DayPhase from './components/DayPhase';
import VotingScreen from './components/VotingScreen';
import VotingResult from './components/VotingResult';
import GameEndScreen from './components/GameEndScreen';
import GameEnd from './components/GameEnd';
import GameEnded from './components/GameEnded';
import DeadPlayerOverlay from './components/DeadPlayerOverlay';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('home'); // home, lobby, distribution, phaseTransition, game, night, doctor, voting, votingResult, ended
  const [playerName, setPlayerName] = useState('');
  const playerNameRef = useRef(''); // SignalR event handler'lar için ref
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const myRoleRef = useRef(null); // SignalR event handler'lar için ref
  const [vampireTeam, setVampireTeam] = useState([]);
  const [nightData, setNightData] = useState(null);
  const [votingPlayers, setVotingPlayers] = useState([]);
  const [votingResult, setVotingResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [gameEndData, setGameEndData] = useState(null); // { result: 'VampireWin', allRoles: [...] }
  const [roomSlots, setRoomSlots] = useState([]);
  const [roleInfo, setRoleInfo] = useState(null);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [currentPhase, setCurrentPhase] = useState({ phase: 'Night', turn: 1 });
  const [isPlayerDead, setIsPlayerDead] = useState(false);
  const [deathMessage, setDeathMessage] = useState('');
  const [showDeathOverlay, setShowDeathOverlay] = useState(false); // Gerçek ölüm için (showTitle=true)
  const [showNotificationOverlay, setShowNotificationOverlay] = useState(false); // Genel bildirimler için (showTitle=false)
  const [notificationMessage, setNotificationMessage] = useState(''); // Genel bildirim mesajı
  const [showRoleSelection, setShowRoleSelection] = useState(false); // Rol seçim modal'ı için
  const [selectedGameMode, setSelectedGameMode] = useState('Mode1'); // Seçilen oyun modu (Lobby'den gelir)
  const [hunterTargets, setHunterTargets] = useState([]); // Avcı intikam hedefleri
  const [masterVampireChoice, setMasterVampireChoice] = useState(null); // Usta Vampir'in seçeceği oyuncular
  const [waitingMessage, setWaitingMessage] = useState(''); // Özel aksiyonlar sırasında diğer oyunculara gösterilen bekleme mesajı
  const [seerRevealData, setSeerRevealData] = useState(null); // Kahin'in öğrendiği rol
  const [revealedCards, setRevealedCards] = useState(null); // Mode 2: Açılan kartlar
  const [locationSelectionData, setLocationSelectionData] = useState(null); // Mode 2: LocationSelection event data
  const [isPolling, setIsPolling] = useState(true); // GetRooms polling kontrolü
  const [vampireSelections, setVampireSelections] = useState([]); // Vampir seçimleri: [{ vampireName: 'a', targetName: 'b' }]
  const [seerKnownRoles, setSeerKnownRoles] = useState(() => {
    // localStorage'dan yükle
    try {
      const saved = localStorage.getItem('seerKnownRoles');
      return saved ? JSON.parse(saved) : {}; // { playerName: role }
    } catch {
      return {};
    }
  });

  // Odaları yükle
  const loadRooms = async () => {
    try {
      // Bağlantı yoksa çağırma
      if (!signalR.connection || signalR.connection.state !== 'Connected') {
        console.warn('⚠️ SignalR bağlı değil, GetRooms atlanıyor');
        return;
      }
      console.log('🔍 GetRooms invoke edilecek...');
      const rooms = await signalR.invoke('GetRooms');
      console.log('✅ GetRooms cevabı aldı:', rooms);
      if (!rooms) {
        console.error('❌ GetRooms null döndü');
        return;
      }
      if (!Array.isArray(rooms)) {
        console.error('❌ GetRooms array değil:', typeof rooms, rooms);
        return;
      }
      
      // İlk slot'u detaylı logla
      if (rooms.length > 0) {
        console.log('🔍 İlk slot detayı:', JSON.stringify(rooms[0], null, 2));
      }
      
      const occupiedRooms = rooms.filter(r => r.isOccupied); // camelCase!
      console.log('📊 Dolu oda sayısı:', occupiedRooms.length);
      console.log('📊 Oda listesi güncellendi:', occupiedRooms.map(r => `Slot ${r.slotNumber}: ${r.leaderName}`));
      console.log('📊 Toplam slot:', rooms.length);
      setRoomSlots(rooms);
    } catch (err) {
      console.error('❌ Odalar yüklenemedi:', err);
    }
  };

  useEffect(() => {
    console.log('🔄 Event listener\'ları kaydediliyor...');
    
    // ÖNCE Event listener'ları kaydet
    signalR.on('RoomCreated', (code, roomData) => {
      console.log('✅ RoomCreated received:', code, roomData);
      console.log('Players:', roomData?.Players);
      
      setRoomCode(code);
      setRoom(roomData);
      setGameState('lobby');
    });

    signalR.on('PlayerJoined', (roomData) => {
      console.log('👤 PlayerJoined received:', roomData);
      console.log('Toplam oyuncu:', roomData?.Players?.length || 0);
      setRoom(roomData);
    });

    signalR.on('PlayerLeft', (roomData) => {
      console.log('👋 PlayerLeft received:', roomData);
      console.log('📊 Backend gönderdi - Toplam oyuncu:', roomData?.Players?.length || 0);
      console.log('📊 Players array:', roomData?.Players?.map(p => p.Name || p.name));
      
      // ✅ Backend'den gelen güncel player listesini kullan
      if (roomData?.Players) {
        setRoom(prevRoom => ({
          ...prevRoom,
          ...roomData,
          Players: roomData.Players // Backend'den gelen güncel liste
        }));
        console.log('✅ Room state güncellendi, kalan oyuncu sayısı:', roomData.Players.length);
      } else {
        console.error('⚠️ PlayerLeft eventinde Players array yok!');
        setRoom(roomData);
      }
      
      // GetRooms polling aktifse odalar listesini güncelle
      if (gameState === 'home') {
        console.log('📢 Oda listesi güncelleniyor (PlayerLeft)...');
        fetchRooms();
      }
    });

    signalR.on('RoleAssigned', (roleData) => {
      console.log('🎭 Rol atandı (RAW):', JSON.stringify(roleData, null, 2));
      console.log('🎭 roleData typeof:', typeof roleData);
      console.log('🎭 roleData keys:', roleData ? Object.keys(roleData) : 'NULL');
      console.log('🎭 Rol:', roleData?.role || roleData?.Role);
      console.log('🎭 role field:', roleData?.role);
      
      setMyRole(roleData?.role || roleData?.Role);
      setVampireTeam(roleData?.vampireTeam || roleData?.VampireTeam || []);
      
      // RoleInfo hesaplamasını NightPhaseStarted'de yapılacağı için burda yapmayız
      console.log('✅ Rol kaydedildi:', roleData?.role || roleData?.Role);
    });
    
    signalR.on('GameTableReady', (roomData) => {
      console.log('🃏 Oyun masası hazır!', roomData);
      
      // Backend camelCase gönderiyor, normalize et
      const normalizedRoom = {
        RoomCode: roomData?.RoomCode || roomData?.roomCode,
        Phase: roomData?.Phase || roomData?.phase,
        Turn: roomData?.Turn || roomData?.turn || 1,
        Players: roomData?.Players || roomData?.players || []
      };
      
      console.log('✅ Normalized room:', normalizedRoom);
      setRoom(normalizedRoom);
      setCurrentPhase({ phase: 'Waiting', turn: normalizedRoom.Turn });
      
      // Rol bilgisini hesapla
      const totalPlayers = normalizedRoom.Players.length;
      const vampireCount = Math.floor(totalPlayers / 3);
      const doctorCount = totalPlayers >= 5 ? 1 : 0;
      const policeCount = Math.ceil((totalPlayers - vampireCount - doctorCount) / 2);
      const citizenCount = totalPlayers - vampireCount - policeCount - doctorCount;
      
      console.log('📊 Rol dağılımı hesaplandı:', { vampireCount, policeCount, doctorCount, citizenCount, totalPlayers });
      
      setRoleInfo({
        vampireCount,
        policeCount,
        doctorCount,
        citizenCount,
        totalPlayers
      });
      
      // Yeni oyun - kahin hafızasını temizle
      setSeerKnownRoles({});
      localStorage.removeItem('seerKnownRoles');
      console.log('🗑️ Kahin hafızası temizlendi - yeni oyun başladı');
      
      // Distribution state'ine geç
      setGameState('distribution');
    });

    signalR.on('NightPhaseStarted', (roomData) => {
      console.log('🌙 Gece fazı başladı!', roomData);
      console.log('🌙 roomData keys:', roomData ? Object.keys(roomData) : 'NULL');
      console.log('🌙 Players:', roomData?.Players);
      console.log('🌙 players:', roomData?.players);
      
      // ✅ YENİ GECE BAŞLARKEN ESKİ ÖLÜM VERİLERİNİ TEMİZLE
      setNightData(null);
      console.log('🗑️ nightData temizlendi - yeni gece başladı');
      
      // ✅ ESKİ VAMPİR SEÇİMLERİNİ TEMİZLE
      setVampireSelections([]);
      console.log('🗑️ vampireSelections temizlendi - yeni gece başladı');
      
      // GetRooms polling'i durdur (gece fazında gereksiz)
      setIsPolling(false);
      console.log('🛑 GetRooms polling durduruldu (Night Phase)');
      
      // Backend camelCase gönderiyor, normalize et
      const normalizedRoom = {
        RoomCode: roomData?.RoomCode || roomData?.roomCode,
        Phase: roomData?.Phase || roomData?.phase,
        Turn: roomData?.Turn || roomData?.turn || 1,
        Players: roomData?.Players || roomData?.players || []
      };
      
      console.log('✅ Normalized room:', normalizedRoom);
      console.log('✅ Normalized room.Turn:', normalizedRoom.Turn);
      console.log('✅ currentPhase before:', currentPhase);
      setRoom(normalizedRoom);
      setCurrentPhase({ phase: 'Night', turn: normalizedRoom.Turn });
      console.log('✅ setCurrentPhase called with turn:', normalizedRoom.Turn);
      
      // ÖLÜ OYUNCULAR: Players array'den kontrol et (isPlayerDead state gecikebilir!)
      const currentPlayerName = playerNameRef.current;
      const myPlayerData = normalizedRoom.Players?.find(p => 
        (p.Name === currentPlayerName) || (p.name === currentPlayerName)
      );
      const imAlive = myPlayerData?.isAlive ?? myPlayerData?.IsAlive ?? true;
      
      console.log(`🔍 NightPhaseStarted - Ben (${currentPlayerName}) hayatta mıyım? ${imAlive}`);
      console.log(`🔍 MyPlayerData:`, myPlayerData);
      
      if (!imAlive || isPlayerDead) {
        console.log('💀 ÖLÜ OYUNCU! Spectator modunda kalıyorum - PhaseTransition ATLANACAK.');
        setIsPlayerDead(true); // State'i de güncelle
        setGameState('spectator');
        // PhaseTransition'ı hiç gösterme!
        return;
      }
      
      // PhaseTransition göster (sadece canlı oyuncular için)
      setGameState('night'); // gameState'i 'night' yap
      setShowPhaseTransition(true);
      console.log('🌙 Night PhaseTransition başladı, 1.5sn sonra kaybolacak');
    });

    signalR.on('GameModeSelected', (data) => {
      console.log('🎮 Oyun modu seçildi:', data);
      // Room state'ini güncelle
      setRoom(prevRoom => ({
        ...prevRoom,
        Mode: data.Mode
      }));
    });

    signalR.on('LocationSelectionStarted', (data) => {
      console.log('📍 Mekan seçimi başladı!', data);
      
      // ✅ ÇOKLU EVENT KORUMASI: Aynı turn için tekrar işleme
      if (currentPhase.phase === 'LocationSelection' && currentPhase.turn === data?.Turn) {
        console.log('⚠️ LocationSelectionStarted zaten işlendi (Turn:', data?.Turn, '), tekrar işlenmeyecek');
        return;
      }
      
      // GetRooms polling'i durdur (LocationSelection fazında gereksiz)
      setIsPolling(false);
      console.log('🛑 GetRooms polling durduruldu (LocationSelection)');
      
      // ÖLÜ OYUNCULAR İÇİN: Sadece daha önce ölmüş oyuncular mekan seçimi görmemeli
      // isPlayerDead state'i PlayerDied eventi ile true yapılır
      if (isPlayerDead) {
        console.log('💀 ÖLÜ OYUNCU! Mekan seçimi ekranı GÖSTERİLMEYECEK. Spectator modda kalıyorum.');
        // Ölü oyuncular spectator state'te kalır, LocationSelection ekranı görmez
        setGameState('spectator');
        return; // Event'i işleme, ekran değişimi yok
      }
      
      // CANLI OYUNCULAR için mekan seçimi
      setLocationSelectionData(data); // Data'yı kaydet
      setCurrentPhase({ phase: 'LocationSelection', turn: data?.Turn || currentPhase.turn });
      console.log('📍 LocationSelection fazına geçildi, currentPhase.phase: LocationSelection');
      
      // ✅ gameState değiştir (VotingResult unmount olur, LocationSelection mount olur)
      setGameState('locationSelection');
      
      // ✅ Voting state'lerini temizle (ama votingResult'ı TUTUYORUZ - component unmount oldu zaten)
      setVotingPlayers([]);
      console.log('🗑️ Voting aktif state temizlendi - LocationSelection başladı');
      
      // Room state'ini güncelle (isLeader bilgisi için kritik!)
      if (data.Players) {
        setRoom(prevRoom => ({
          ...prevRoom,
          Players: data.Players,
          Phase: data.Phase,
          Mode: data.Mode
        }));
      }
    });

    signalR.on('LocationSelected', (data) => {
      console.log('✅ Mekan seçimi yapıldı:', data);
      // LocationSelection component'i kendi state'ini güncelleyecek
    });

    signalR.on('AllLocationsSelected', (data) => {
      console.log('✅ Tüm mekanlar seçildi!', data);
      // LocationSelection component'i lider butonunu gösterecek
    });

    signalR.on('LocationCardsRevealed', (cards) => {
      console.log('🃏 Kartlar açıldı!', cards);
      console.log('📦 Cards array length:', cards?.length);
      console.log('📦 First card:', cards?.[0]);
      console.log('📦 IsRevealed flags:', cards?.map(c => ({ name: c.PlayerName, revealed: c.IsRevealed })));
      setRevealedCards(cards);
      setCurrentPhase({ phase: 'CardReveal', turn: currentPhase.turn });
      setGameState('cardreveal'); // gameState'i 'cardreveal' yap
      console.log('✅ State güncellendi: CardReveal phase');
    });

    signalR.on('NightEnded', (nightResult) => {
      console.log('🌅 Gece bitti!', nightResult);
      console.log('🌅 killedPlayer:', nightResult?.killedPlayer);
      console.log('🌅 message:', nightResult?.message);
      setNightData(nightResult);
      
      const currentPlayerName = playerNameRef.current;
      const iAmKilled = nightResult?.killedPlayer === currentPlayerName;
      const someoneDied = nightResult?.killedPlayer != null;
      
      // Eğer öldürülen oyuncu bensem, ölü durumunu işaretle
      if (iAmKilled) {
        console.log('💀 BEN ÖLDÜM!', currentPlayerName);
        setIsPlayerDead(true);
      }
      
      // KIRMIZI/YEŞİL BİLDİRİM KALDIRILDI
      // Artık DayPhaseStarted → PhaseTransition içinde lider "Oylama Başlat" butonu var
      console.log('✅ NightEnded - PhaseTransition ve lider butonu gösterilecek');
      
      // NOT: GameState değişimi DayPhaseStarted'de yapılacak
    });

    signalR.on('FledglingAttackConfirmed', (data) => {
      console.log('🧛 Fledgling saldırı onaylandı:', data);
      // Gece fazı devam edecek, ProcessNightPhase backend'de çağrılıyor
    });

    signalR.on('VotingStarted', (votingData) => {
      console.log('🗳️ Oylama başladı!', votingData);
      
      // ✅ PhaseTransition'ı kapat
      setShowPhaseTransition(false);
      console.log('✅ PhaseTransition kapatıldı - oylama başlıyor');
      
      // ✅ Eski gece verisini temizle
      setNightData(null);
      console.log('🗑️ nightData temizlendi - oylama başladı');
      
      // Room'u güncelle - Phase: Voting
      setRoom(prevRoom => ({
        ...prevRoom,
        Phase: 'Voting',
        phase: 'Voting'
      }));
    });

    signalR.on('VampireSelectionConfirmed', (data) => {
      console.log('✅ Vampir seçimi onaylandı:', data);
      // Gece fazı devam ediyor - diğer vampirler seçim yapıyor
    });

    // 🧛 VAMPIR REAL-TIME KOORDİNASYON
    signalR.on('VampireSelectionsUpdate', (data) => {
      console.log('🧛 Vampir seçimleri güncellendi (REAL-TIME):', data);
      console.log('🧛 Seçimler:', data.selections);
      console.log('🧛 Selection detayları:');
      data.selections?.forEach((sel, idx) => {
        console.log(`   ${idx + 1}. ${sel.vampireName} → ${sel.targetName} (isMe: ${sel.isMe}, vampireRole: ${sel.vampireRole})`);
      });
      
      // Data format: { selections: [{ vampireName: 'a', targetName: 'b' }, ...] }
      if (data.selections && Array.isArray(data.selections)) {
        setVampireSelections(data.selections);
        console.log('✅ vampireSelections state güncellendi:', data.selections.length, 'seçim');
      }
    });

    // Vampirler farklı hedef seçtiğinde
    signalR.on('VampireDisagreement', (data) => {
      console.log('⚠️ Vampir anlaşmazlığı!', data);
      console.log('⚠️ Mesaj:', data.message);
      console.log('⚠️ Seçimler:', data.selections);
      
      // vampireSelections'ı temizle - yeniden seçim yapılacak
      setVampireSelections([]);
      
      // Kullanıcıya uyarı göster (toast/alert)
      alert(data.message + '\n\nSeçimler:\n' + data.selections.join('\n'));
    });

    signalR.on('DoctorPhaseStarted', (data) => {
      console.log('🏥 Doktor fazı başladı!', data);
      // ✅ DÜZELTME: Backend artık 2 liste gönderiyor:
      // - protectablePlayers: Koruma için (doktor hariç)
      // - allPlayers: GameTable için (doktor dahil)
      setRoom(prevRoom => ({
        ...prevRoom,
        Players: data.allPlayers || data.players || prevRoom?.Players, // GameTable için TÜM oyuncular
        players: data.allPlayers || data.players || prevRoom?.players,
        DoctorPhaseData: {
          protectablePlayers: data.protectablePlayers || data.players, // Koruma paneli için
          lastProtected: data.lastProtected
        }
      }));
      // Doktor fazına geç
      setGameState('doctor');
    });

    signalR.on('WaitingForDoctor', (data) => {
      console.log('⏳ Doktor bekleniyor:', data);
      // Doktor değilse bekleme ekranı
      setGameState('doctor');
    });

    signalR.on('DoctorProtectionConfirmed', (data) => {
      console.log('✅ Doktor koruması onaylandı:', data);
    });

    signalR.on('SeerPhaseStarted', (data) => {
      console.log('🔮 Kahin fazı başladı!', data);
      setGameState('seer');
    });

    signalR.on('WaitingForSeer', (data) => {
      console.log('⏳ Kahin bekleniyor:', data);
      setGameState('seer');
    });

    signalR.on('SeerRevealResult', (data) => {
      console.log('🔮 Kahin rol öğrendi:', data);
      console.log('🔮 data.playerName:', data.playerName);
      console.log('🔮 data.role:', data.role);
      
      // Öğrenilen rolü kaydet (localStorage + state)
      setSeerKnownRoles(prev => {
        const updated = { ...prev, [data.playerName]: data.role };
        localStorage.setItem('seerKnownRoles', JSON.stringify(updated));
        console.log('💾 Kahin hafızası güncellendi:', updated);
        return updated;
      });
      
      // State'e kaydet, SeerPhase component'i kullanacak
      setSeerRevealData(data);
    });

    signalR.on('HunterRevengePhase', (data) => {
      console.log('🎯 Avcı intikam fazı başladı!', data);
      console.log('🎯 Hunter name:', data.hunterName);
      console.log('🎯 Ben:', playerNameRef.current);
      console.log('🎯 Ben öldüm mü (isPlayerDead):', isPlayerDead);
      
      const currentPlayerName = playerNameRef.current;
      const hunterName = data.hunterName || data.HunterName;
      
      // ✅ BEN AVCI İSEM - Backend sadece ölen Hunter'a event gönderiyor
      if (currentPlayerName === hunterName) {
        console.log('🏹 BEN AVCIYIM VE ÖLDÜM! İntikam paneli açılıyor...');
        
        // ✅ KRITIK DÜZELTME: State'leri HEMEN set et!
        // setTimeout içinde beklemek riskli - başka eventler gelip gameState override edebilir
        setIsPlayerDead(true);
        setHunterTargets(data.targets || data.Targets || []);
        setGameState('hunter'); // ✅ Hemen hunter state'ine geç
        
        console.log('🎯 Hunter state ayarlandı, hedef sayısı:', (data.targets || data.Targets)?.length);
        
        // Death overlay'i 3 saniye göster, sonra kapat
        setDeathMessage('💀 ÖLDÜN - ama İNTİKAM ALABILIRSIN!');
        setShowDeathOverlay(true);
        
        setTimeout(() => {
          setShowDeathOverlay(false); // Sadece overlay'i kapat
          console.log('💀 Death overlay kapatıldı, Hunter panel görünmeli');
        }, 3000);
      } else {
        console.log('⏳ Ben avcı değilim, avcının seçimini bekliyorum...');
        // Avcı olmayan oyuncular bekleme ekranında kalır
        setGameState('spectator');
      }
    });

    signalR.on('WaitingForHunter', (data) => {
      console.log('⏳ Avcı bekleniyor:', data);
      // ✅ DÜZELTME: Hunter olmayan oyuncular spectator'da kalmalı, 'hunter' state'ine geçmemeli
      // 'hunter' state'i sadece ölen Hunter için açılır (HunterRevengePhase'de)
      setGameState('spectator');
    });

    signalR.on('HunterRevengeComplete', (data) => {
      console.log('💀 Avcı intikamını aldı:', data);
      console.log('💀 Hunter:', data.hunterName);
      console.log('💀 Target:', data.targetName);
      console.log('💀 Target Role:', data.targetRole);
      
      const currentPlayerName = playerNameRef.current;
      
      // ✅ HUNTER İNTİKAMINI ALDI - ARTIK DEAD
      if (data.hunterName === currentPlayerName || (data.hunterName || data.HunterName) === currentPlayerName) {
        console.log('🏹 BEN HUNTER\'DIM, intikamımı aldım. Artık dead oluyorum.');
        setIsPlayerDead(true);
        setHunterTargets([]);
        setGameState('spectator');
      }
      
      // Hunter ekranını kapat (diğer oyuncular için)
      setHunterTargets([]);
      
      // Eğer öldürülen oyuncu ben isem, ölü durumunu işaretle
      if (data.targetName === currentPlayerName) {
        console.log('💀 AVCI TARAFINDAN ÖLDÜRÜLDÜM!', currentPlayerName);
        setIsPlayerDead(true);
        setDeathMessage(`🏹 Avcı seni intikam için öldürdü!`);
        setShowDeathOverlay(true);
        
        setTimeout(() => {
          setShowDeathOverlay(false);
          console.log('✅ Death overlay kapatıldı, izleyici modu aktif');
        }, 3000);
      }
      
      // Eğer backend MasterVampire ısırma işlemi başlatacaksa, o event gelecek
      console.log('💀 HunterRevengeComplete işlendi, backend\'den sonraki adım bekleniyor...');
    });

    signalR.on('MasterVampireBiteChoice', (data) => {
      console.log('🧛 Usta Vampir ısırma fazı:', data);
      console.log('🧛 alivePlayers:', data.alivePlayers);
      console.log('🧛 alivePlayers length:', data.alivePlayers?.length);
      console.log('🧛 masterName from data:', data.masterName || data.MasterName);
      console.log('🧛 Current playerName:', playerNameRef.current);
      console.log('🧛 Current myRole (state):', myRole);
      console.log('🧛 Current myRole (ref):', myRoleRef.current);
      console.log('🧛 Current gameState:', gameState);
      
      // ÖNEMLİ: Sadece ölü Master Vampire bu ekranı görmeli!
      const currentPlayerName = playerNameRef.current;
      const masterName = data.masterName || data.MasterName;
      const currentRole = myRoleRef.current; // Ref kullan - closure sorunu yok
      
      // Master Vampire rolüne sahip miyim kontrolü
      if (currentRole === 'MasterVampire' || masterName === currentPlayerName) {
        console.log('🧛 BEN MASTER VAMPIRE\'IM! Seçim ekranı açılıyor...');
        setMasterVampireChoice(data.alivePlayers || data.AlivePlayers || []);
        setGameState('masterVampire');
      } else {
        console.log('⏸️ Bu event benim için değil, beklemede kalıyorum');
        setWaitingMessage(`💀 ${masterName || 'Usta Vampir'} öldü ve birini vampir yapıyor...`);
        setGameState('spectator');
      }
    });

    signalR.on('WaitingForMasterVampireBite', (data) => {
      console.log('⏳ Usta Vampir ısırıyor:', data);
      // Sadece diğer oyunculara bekleme mesajı göster (OYUNDAN ÇIKTIN başlığı olmadan)
      setWaitingMessage(data.message || `💀 ${data.masterName} öldü ve birini vampir yapıyor...`);
    });

    signalR.on('MasterVampireBiteComplete', (data) => {
      console.log('🧛 Usta Vampir ısırdı:', data);
      
      // Mesajı 3 saniye overlay olarak göster
      if (data.message) {
        setDeathMessage(data.message);
        setShowDeathOverlay(true);
        setTimeout(() => {
          setShowDeathOverlay(false);
          setDeathMessage('');
        }, 3000);
      }
      
      setWaitingMessage(''); // Bekleme mesajını temizle
      setMasterVampireChoice([]); // Usta Vampir seçim ekranını kapat
      
      // DÜZELTME: Ölen Master Vampire için spectator state'e geç
      setGameState('spectator'); // Ölü oyuncu artık sadece izleyici
    });

    signalR.on('RoleChanged', (data) => {
      console.log('🔄 Rol değişti:', data);
      
      // Mesajı overlay olarak göster
      const roleMessage = `🧛 USTA VAMPİR SENİ ISIRDI!\n\nYeni Rolün: ${data.newRole}\n\n${data.message}\n\nVampir Takımı: ${data.vampireTeam?.join(', ') || 'Bilinmiyor'}`;
      setDeathMessage(roleMessage);
      setShowDeathOverlay(true);
      setTimeout(() => {
        setShowDeathOverlay(false);
        setDeathMessage('');
      }, 5000); // 5 saniye göster (önemli bilgi)
      
      setMyRole(data.newRole);
      setVampireTeam(data.vampireTeam || []);
      
      // Eğer güncel room data varsa, state'i güncelle
      if (data.roomData) {
        console.log('🔄 Güncel room data alındı:', data.roomData);
        setRoom(data.roomData);
      }
    });

    signalR.on('YouAreFledgling', (data) => {
      console.log('🦇 YENİ YETME VAMPİR OLDUN!', data);
      alert(`🧛 USTA VAMPİR SENİ ISIRDI!\n\nEski Rolün: ${data.OldRole}\nYeni Rolün: YENİ YETME VAMPİR (Fledgling)\n\n⚠️ DİKKAT: Yakalanırsan köylüler kazanır!\nKartların mekanlarda gözükmez.\n\nVampir Takımı: ${data.VampireTeam?.join(', ') || 'Bilinmiyor'}`);
      setMyRole('Fledgling');
      // ✅ YENİ: VampireTeam'i güncelle - Yeni yetme vampir artık vampir takımında
      const newVampireTeam = data.VampireTeam || data.vampireTeam || [];
      console.log('🦇 Vampir takımı güncellendi:', newVampireTeam);
      setVampireTeam(newVampireTeam);
    });

    signalR.on('FledglingCreated', (data) => {
      console.log('🧛 Yeni yetme vampir yaratıldı:', data);
      console.log('🧛 Yeni vampir takımı:', data.VampireTeam || data.vampireTeam);
      
      // ✅ YENİ: Diğer vampirler için vampireTeam güncelle
      const newVampireTeam = data.VampireTeam || data.vampireTeam || [];
      if (newVampireTeam.length > 0) {
        console.log('🦇 Vampir takımı güncellendi (FledglingCreated):', newVampireTeam);
        setVampireTeam(newVampireTeam);
      }
      
      setShowDeathOverlay(false);
      setDeathMessage('');
    });

    signalR.on('VoteConfirmed', () => {
      console.log('✅ Oy kaydedildi');
    });

    signalR.on('GameEnded', (endData) => {
      console.log('🎮 Oyun bitti!', endData);
      console.log('🏆 Result:', endData?.Result || endData?.result);
      console.log('👥 AllRoles:', endData?.AllRoles || endData?.allRoles);
      
      // Normalize data
      const normalizedEndData = {
        result: endData?.Result || endData?.result || endData?.winner,
        winner: endData?.Winner || endData?.winner || endData?.result,
        message: endData?.Message || endData?.message,
        allRoles: endData?.AllRoles || endData?.allRoles || []
      };
      
      setGameEndData(normalizedEndData);
      setGameState('ended');
    });

    signalR.on('RoomUpdated', (roomData) => {
      console.log('🔄 Oda güncellendi:', roomData);
      console.log('🔄 Oyuncular:', roomData?.players || roomData?.Players);
      const normalizedRoom = {
        RoomCode: roomData?.RoomCode || roomData?.roomCode,
        Phase: roomData?.Phase || roomData?.phase,
        Turn: roomData?.Turn || roomData?.turn || 1,
        Players: roomData?.Players || roomData?.players || []
      };
      setRoom(normalizedRoom);
    });

    signalR.on('DayPhaseStarted', (data) => {
      console.log('☀️☀️☀️ GÜNDÜZ FAZI BAŞLADI! ☀️☀️☀️', data);
      
      // SignalR camelCase yapar: AlivePlayers -> alivePlayers
      const alivePlayers = data.alivePlayers || data.AlivePlayers;
      const leaderId = data.leaderId || data.LeaderId;
      const leaderName = data.leaderName || data.LeaderName;
      const killedPlayers = data.killedPlayers || data.KilledPlayers || [];
      
      console.log('☀️ AlivePlayers:', alivePlayers);
      console.log('☀️ Leader:', leaderName, leaderId);
      console.log('☀️ KilledPlayers:', killedPlayers);
      
      // ✅ nightData'yı PhaseTransition için hazırla
      const nightResult = {
        killedPlayers: killedPlayers || [],
        KilledPlayers: killedPlayers || []
      };
      
      console.log('☀️ nightResult oluşturuldu:', nightResult);
      setNightData(nightResult);
      setCurrentPhase({ phase: 'Day', turn: data.Turn || data.turn || 1 });
      
      // KIRMIZI/YEŞİL BİLDİRİM KALDIRILDI - Artık PhaseTransition içinde lider butonu var
      
      // ÖNEMLI: Ölü oyuncular için gameState'i 'spectator' yap
      const currentPlayerName = playerNameRef.current;
      
      // Eğer AlivePlayers yoksa veya listede değilsem, ÖLÜYÜM
      const imAlive = alivePlayers && alivePlayers.length > 0 
        ? alivePlayers.some(p => 
            (p.Id === currentPlayerName) || (p.id === currentPlayerName) ||
            (p.Name === currentPlayerName) || (p.name === currentPlayerName)
          )
        : false; // Default FALSE - eğer liste yoksa ölüyüm demektir
      
      console.log(`☀️ Gündüz fazı: Ben (${currentPlayerName}) hayatta mıyım? ${imAlive}`);
      console.log(`☀️ AlivePlayers count: ${alivePlayers?.length || 0}`);
      
      // Lider kontrolü - Backend'den gelen leader bilgisini kullan
      const isLeader = (leaderId === currentPlayerName) || (leaderName === currentPlayerName);
      
      console.log(`👑 Lider kontrolü: Ben ${currentPlayerName}, LeaderId: ${leaderId}, LeaderName: ${leaderName}, isLeader: ${isLeader}`);
      
      // ÖLÜ OYUNCULAR:
      if (!imAlive) {
        console.log('💀 ÖLÜ OYUNCU!');
        setIsPlayerDead(true);
        
        // ✅ YENİ: Ölü lider ise PhaseTransition göster (oylama başlatabilsin)
        if (isLeader) {
          console.log('👑💀 ÖLÜ LİDER! PhaseTransition gösterilecek ama sonra spectator olacak');
          setGameState('day'); // PhaseTransition için day state'ine geç
          setShowPhaseTransition(true); // Ölü lider PhaseTransition ve "Oylama Başlat" butonu görecek
          return;
        }
        
        // Ölü non-leader oyuncular spectator
        console.log('💀 ÖLÜ OYUNCU! Spectator state\'e geçiyor, PhaseTransition YOK');
        setGameState('spectator');
        setShowPhaseTransition(false); // Ölü non-leader oyuncular PhaseTransition görmemeli
        return; // Erken return - PhaseTransition gösterme
      }
      
      // CANLI OYUNCULAR: gameState'i 'day' yap, PhaseTransition göster
      setGameState('day');
      
      if (imAlive) {
        console.log('✅ CANLI OYUNCU! PhaseTransition gösterilecek');
        setShowPhaseTransition(true); // Sadece canlı oyuncular PhaseTransition görecek
        // PhaseTransition kapandıktan sonra (lider butonu ile) day/voting state'e geçecek
      }
    });

    signalR.on('VotingStarted', (alivePlayers) => {
      console.log('🗳️ Oylama başladı! Hayatta:', alivePlayers?.length || 0);
      
      // ✅ ESKİ VERILERI TEMİZLE
      setVotingResult(null);
      console.log('🗑️ VotingResult temizlendi - yeni oylama başlıyor');
      
      setVotingPlayers(alivePlayers || []);
      
      // Room Phase'ini güncelle (Phase: Voting)
      setRoom(prevRoom => ({
        ...prevRoom,
        Phase: 'Voting',
        phase: 'Voting'
      }));
      
      // ÖLÜ OYUNCULAR: isPlayerDead state'i PlayerDied eventi ile true yapılır
      if (isPlayerDead) {
        console.log('💀 ÖLÜ OYUNCU! Oylama ekranı gösterilmeyecek. Spectator modunda kalacağım.');
        // Ölü oyuncular spectator state'te kalır - BEYAZ EKRAN DEĞİL!
        setGameState('spectator');
      } else {
        // CANLI OYUNCULAR için oylama ekranı
        setGameState('voting');
      }
    });

    signalR.on('VotingResult', (data) => {
      console.log('🗳️ Oylama sonucu (RAW):', data);
      console.log('🗳️ data keys:', Object.keys(data));
      console.log('🗳️ NextTurn (PascalCase):', data.NextTurn);
      console.log('🗳️ nextTurn (camelCase):', data.nextTurn);
      console.log('🗳️ EliminatedPlayerName (PascalCase):', data.EliminatedPlayerName);
      console.log('🗳️ eliminatedPlayerName (camelCase):', data.eliminatedPlayerName);
      console.log('🗳️ EliminatedPlayerRole (PascalCase):', data.EliminatedPlayerRole);
      console.log('🗳️ eliminatedPlayerRole (camelCase):', data.eliminatedPlayerRole);
      console.log('🗳️ IsTie (PascalCase):', data.IsTie);
      console.log('🗳️ isTie (camelCase):', data.isTie);
      console.log('🎮 GameMode (PascalCase):', data.GameMode);
      console.log('🎮 gameMode (camelCase):', data.gameMode);
      console.log('📊 VoteDistribution (PascalCase):', data.VoteDistribution);
      console.log('📊 voteDistribution (camelCase):', data.voteDistribution);
      
      // Vote distribution'ı göster
      const voteDistribution = data.voteDistribution || data.VoteDistribution;
      if (voteDistribution && voteDistribution.length > 0) {
        console.log('📊 OY DAĞILIMI:');
        voteDistribution.forEach(vote => {
          const playerName = vote.playerName || vote.PlayerName;
          const votes = vote.votes || vote.Votes;
          console.log(`  ${playerName}: ${votes} oy`);
        });
      }
      
      // camelCase versiyonlarını kullan
      const eliminatedPlayerName = data.eliminatedPlayerName || data.EliminatedPlayerName;
      const eliminatedPlayerRole = data.eliminatedPlayerRole || data.EliminatedPlayerRole;
      const isTie = data.isTie !== undefined ? data.isTie : data.IsTie;
      const nextTurn = data.nextTurn || data.NextTurn;
      const gameMode = data.gameMode || data.GameMode;
      
      console.log('📊 Normalized values:');
      console.log('  - eliminatedPlayerName:', eliminatedPlayerName);
      console.log('  - eliminatedPlayerRole:', eliminatedPlayerRole);
      console.log('  - isTie:', isTie);
      console.log('  - nextTurn:', nextTurn);
      console.log('  - gameMode:', gameMode);
      
      // Eğer elenen oyuncu ben isem, ölü olarak işaretle
      const currentPlayerName = playerNameRef.current;
      if (eliminatedPlayerName === currentPlayerName) {
        console.log('💀 BEN ELENDİM! Rol:', eliminatedPlayerRole);
        
        // ⚠️ EĞER HUNTER İSE HEMEN DEAD YAPMA! Hunter intikam alacak
        if (eliminatedPlayerRole === 'Hunter') {
          console.log('🏹 BEN HUNTER\'IM! İntikam için bekliyorum, henüz dead değilim');
          // Hunter için death overlay göster ama isPlayerDead=true yapma
          setDeathMessage(`Oyundan çıkarıldın - ama intikam alabilirsin!`);
          setShowDeathOverlay(true);
          
          setTimeout(() => {
            setShowDeathOverlay(false);
          }, 3000);
        } else if (eliminatedPlayerRole === 'MasterVampire') {
          console.log('🧛 BEN MASTER VAMPIRE\'IM! Birini ısıracağım, henüz dead değilim');
          // MasterVampire için death overlay göster ama isPlayerDead=true yapma
          setDeathMessage(`Oyundan çıkarıldın - ama birini vampir yapabilirsin!`);
          setShowDeathOverlay(true);
          
          setTimeout(() => {
            setShowDeathOverlay(false);
          }, 3000);
        } else {
          // Hunter veya MasterVampire değilse direkt dead yap
          setIsPlayerDead(true);
          setGameState('spectator');
          setDeathMessage(`Köylüler tarafından elendin! Rol: ${eliminatedPlayerRole}`);
          setShowDeathOverlay(true);
          
          setTimeout(() => {
            setShowDeathOverlay(false);
            console.log('✅ Death overlay kapatıldı, izleyici modu aktif');
          }, 3000);
        }
      }
      
      // Room turn'ü güncelle
      let finalEliminatedPlayer = null;
      
      setRoom(prevRoom => {
        const updatedRoom = {
          ...prevRoom,
          Turn: nextTurn || (prevRoom?.Turn || 1) + 1
        };
        
        // Elenen oyuncuyu bul ve rolünü ekle
        const eliminatedPlayer = eliminatedPlayerName ? 
          updatedRoom.Players?.find(p => (p.Name || p.name) === eliminatedPlayerName) : null;
        
        if (eliminatedPlayer && eliminatedPlayerRole) {
          eliminatedPlayer.Role = eliminatedPlayerRole;
        }
        
        console.log('🗳️ Elenen oyuncu bulundu:', eliminatedPlayer);
        
        // ✅ Eliminated player'ı dışarıda kullanmak için kaydet
        finalEliminatedPlayer = eliminatedPlayer;
        
        return updatedRoom;
      });
      
      // ✅ VotingResult'ı setRoom DIŞINDA ayarla (setTimeout KULLANMA!)
      const resultData = {
        eliminatedPlayer: finalEliminatedPlayer,
        isTie: isTie,
        nextTurn: nextTurn,
        gameMode: gameMode
      };
      
      console.log('🗳️ VotingResult state ayarlanıyor:', resultData);
      setVotingResult(resultData);
      
      // ⚠️ LocationSelectionStarted gelene kadar votingResult göster
      // LocationSelectionStarted handler'ı gameState'i değiştirecek
      setGameState('votingResult');
    });

    signalR.on('GameEnded', (data) => {
      console.log('🎊 Oyun bitti!', data);
      console.log('🏆 Result:', data.Result || data.result);
      console.log('👥 AllRoles:', data.AllRoles || data.allRoles);
      
      setGameEndData({
        result: data.Result || data.result,
        allRoles: data.AllRoles || data.allRoles
      });
      setGameResult(data);
      setGameState('ended');
    });

    signalR.on('VampiresDisconnected', () => {
      console.log('⚠️ Vampirler bağlantıyı kaybetti! Polisler kazandı!');
      setGameState('ended');
    });

    signalR.on('Error', (message) => {
      console.error('❌ Backend hatası:', message);
      alert(`❌ HATA: ${message}`);
      // Rol seçim modalı açıksa, isSubmitting'i false yap (RoleSelection kendi handle edecek)
    });

    // Oda listesi güncellemesi
    signalR.on('RoomListUpdated', () => {
      console.log('📢 Oda listesi güncelleniyor...');
      loadRooms();
    });

    // Event listener'lar kaydedildi, ŞİMDİ bağlan
    console.log('🔄 SignalR bağlanıyor...');
    
    signalR.connect()
      .then(() => {
        console.log('✅ SignalR bağlandı, odalar yükleniyor...');
        // Bağlantı başarılı olunca odaları yükle
        loadRooms();
      })
      .catch((err) => {
        console.error('❌ SignalR bağlantı başarısız:', err);
      });

    // Component unmount olduğunda cleanup
    return () => {
      console.log('🧹 useEffect cleanup - event listener\'lar temizleniyor');
      // SignalR bağlantısını AÇIK BIRAK - lobby'de de gerekli!
      // signalR.disconnect();
    };
  }, []);

  // Sadece HOME ekranındayken VE isPolling=true ise oda listesini güncelle (polling)
  useEffect(() => {
    if (gameState !== 'home' || !isPolling) {
      return; // Oyun içindeyken veya polling kapalıyken GetRooms çağırma
    }

    // İlk yükleme
    loadRooms();

    // Her 2 saniyede bir güncelle (sadece home'dayken VE isPolling=true ise)
    const intervalId = setInterval(() => {
      if (gameState === 'home' && isPolling) {
        loadRooms();
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
      console.log('🧹 Home polling interval temizlendi');
    };
  }, [gameState, isPolling]); // gameState veya isPolling değiştiğinde yeniden kur

  // myRole değiştiğinde ref'i güncelle
  useEffect(() => {
    myRoleRef.current = myRole;
    console.log('🎭 myRoleRef güncellendi:', myRole);
  }, [myRole]);

  // Oda oluştur
  const createRoom = async () => {
    if (!playerName.trim()) {
      console.log('❌ İsim girilmedi');
      return;
    }
    console.log('🎮 Oda oluşturuluyor:', playerName);
    playerNameRef.current = playerName; // Ref'e kaydet
    try {
      await signalR.invoke('CreateRoom', playerName);
      console.log('✅ Oda oluşturma isteği gönderildi');
    } catch (err) {
      console.error('❌ Oda oluşturma hatası:', err);
    }
  };

  // Odaya katıl
  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      console.log('❌ İsim veya oda kodu eksik');
      return;
    }
    console.log('🚪 Odaya katılıyor:', playerName, roomCode);
    playerNameRef.current = playerName; // Ref'e kaydet
    await signalR.invoke('JoinRoom', roomCode.toUpperCase(), playerName);
  };
  
  // Gece fazını başlat (Lider için)
  const handleStartNightPhase = async () => {
    try {
      console.log('🌙 Lider gece fazını başlatıyor...');
      await signalR.invoke('StartNightPhase', roomCode);
      console.log('✅ StartNightPhase çağrıldı');
    } catch (err) {
      console.error('❌ StartNightPhase hatası:', err);
    }
  };

  // Gece fazı bitti (Vampir seçim yaptı)
  const handleNightEnd = async (targetName) => {
    try {
      console.log('🎯 Vampir hedef seçti:', targetName);
      
      // Fledgling ise FledglingAttack, diğer vampirler için VampireAttack
      if (myRole === 'Fledgling' || myRole === 'Yeni Yetme Vampir') {
        console.log('🧛 Fledgling saldırısı başlatılıyor...');
        await signalR.invoke('FledglingAttack', roomCode, targetName);
        console.log('✅ FledglingAttack çağrıldı');
      } else {
        await signalR.invoke('VampireAttack', roomCode, targetName);
        console.log('✅ VampireAttack çağrıldı');
      }
    } catch (err) {
      console.error('❌ Vampir saldırı hatası:', err);
    }
  };

  // Doktor koruma seçti
  const handleDoctorSelect = async (targetName) => {
    try {
      console.log('🏥 Doktor koruma seçti:', targetName);
      await signalR.invoke('DoctorSelectProtection', roomCode, targetName);
      console.log('✅ DoctorSelectProtection çağrıldı');
    } catch (err) {
      console.error('❌ DoctorSelectProtection hatası:', err);
    }
  };

  // Gündüz fazı bitti (Lider devam etti)
  const handleDayEnd = async () => {
    try {
      console.log('☀️ Lider gündüz fazını bitiriyor...');
      await signalR.invoke('StartNextRound', roomCode);
      console.log('✅ StartNextRound çağrıldı');
    } catch (err) {
      console.error('❌ Day end hatası:', err);
    }
  };

  // Oylama başlat (Lider için)
  const handleStartVoting = async () => {
    try {
      console.log('🗳️ Lider oylama başlatıyor...');
      await signalR.invoke('StartVoting', roomCode, false);
      console.log('✅ StartVoting çağrıldı');
    } catch (err) {
      console.error('❌ StartVoting hatası:', err);
    }
  };

  // Oy gönder (Gündüz oylaması)
  const handleVoteSubmit = async (targetName) => {
    try {
      console.log('🗳️ Oy gönderiliyor:', targetName);
      // Backend targetPlayerId bekliyor, biz targetName gönderiyoruz
      // İlk önce targetName'i ID'ye çevireceğiz veya backend'i değiştireceğiz
      await signalR.invoke('Vote', roomCode, targetName);
      console.log('✅ Vote çağrıldı');
    } catch (err) {
      console.error('❌ Vote hatası:', err);
    }
  };

  const handleReturnHome = async () => {
    console.log('🏠 Ana ekrana dönülüyor...');
    
    // Eğer bir odada isek, önce backend'den odadan çık
    if (roomCode && room) {
      try {
        console.log('🚪 Odadan çıkılıyor:', roomCode);
        await signalR.invoke('LeaveRoom', roomCode);
        console.log('✅ Odadan başarıyla çıkıldı');
      } catch (err) {
        console.error('❌ Odadan çıkarken hata:', err);
      }
    }
    
    // Reset all game states
    setGameState('home');
    setIsPolling(true); // Home'a döndüğünde polling'i yeniden başlat
    setPlayerName('');
    playerNameRef.current = '';
    setRoomCode('');
    setRoom(null);
    setMyRole(null);
    myRoleRef.current = null; // Ref'i de sıfırla
    setVampireTeam([]);
    setNightData(null);
    setVotingPlayers([]);
    setVotingResult(null);
    setGameResult(null);
    setGameEndData(null);
    setIsPlayerDead(false);
    setDeathMessage('');
    setShowDeathOverlay(false);
    setShowPhaseTransition(false);
    setCurrentPhase('');
  };

  return (
    <div className="app">
      {gameState === 'home' && (
        <div className="home-screen">
          <h1 className="game-title">🧛 VAMPİR POLİS OYUNU 🟦</h1>
          
          <div className="player-name-section">
            <input
              type="text"
              placeholder="👤 Oyuncu İsmin"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                playerNameRef.current = e.target.value; // Ref'i senkronize et
              }}
              className="player-input"
            />
          </div>

          <h2 className="section-title">Oda Seç veya Oluştur</h2>
          {roomSlots.length === 0 && <p style={{color: 'white'}}>Odalar yükleniyor...</p>}
          <div className="room-grid">
            {roomSlots.map((slot) => (
              <div 
                key={slot.slotNumber} 
                className={`room-slot ${slot.isOccupied ? 'occupied' : ''}`}
                onClick={(e) => {
                  if (slot.isOccupied) {
                    e.preventDefault();
                    console.log(`❌ Oda ${slot.slotNumber} dolu - Lider: ${slot.leaderName}`);
                    return;
                  }
                  if (!playerName.trim()) {
                    console.log('❌ Önce isim gir!');
                    return;
                  }
                  createRoom();
                }}
              >
                {slot.isOccupied ? (
                  <>
                    <span className="leader-name">{slot.leaderName}</span>
                    <span className="slot-text">{slot.playerCount} Oyuncu</span>
                    {slot.status && <span className="slot-status">{slot.status}</span>}
                    <span className="slot-text" style={{fontSize: '1rem', marginTop: '5px', color: '#ffcc00'}}>
                      Created by: {slot.leaderName}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="plus-icon">+</span>
                    <span className="slot-text">ODA {slot.slotNumber}</span>
                    <span className="slot-text" style={{fontSize: '0.9rem', color: '#90EE90'}}>Boş</span>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="join-section">
            <h3>🔑 Oda Kodun Var mı?</h3>
            <input
              type="text"
              placeholder="ODA KODU GİR"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="code-input"
            />
            <button className="join-btn" onClick={joinRoom}>
              🚪 ODAYA KATIL
            </button>
          </div>
        </div>
      )}

      {gameState === 'lobby' && (
        <>
          <Lobby 
            room={room} 
            roomCode={roomCode}
            playerName={playerName}
            onStartGameClick={(mode) => {
              console.log('🎮 Rol seçimi açılıyor, mod:', mode);
              setSelectedGameMode(mode);
              setShowRoleSelection(true);
            }}
          />
          {showRoleSelection && (
            <RoleSelection
              roomCode={roomCode}
              playerCount={room?.Players?.length || 0}
              selectedMode={selectedGameMode}
              onClose={() => setShowRoleSelection(false)}
            />
          )}
        </>
      )}

      {gameState === 'distribution' && roleInfo && roleInfo.totalPlayers > 0 && (
        <>
          <Lobby 
            room={room} 
            roomCode={roomCode}
            playerName={playerName}
            onStartGameClick={(mode) => {
              // Distribution sırasında bu çağrılmaz ama prop gerekli
              console.log('⚠️ Distribution sırasında StartGame çağrıldı');
            }}
          />
          <RoleDistribution
            roleInfo={roleInfo}
            onComplete={() => {
              console.log('✅ Distribution tamamlandı, game table açılıyor');
              setGameState('game'); // Game table göster (Waiting state)
            }}
          />
          {/* DEBUG: Skip button */}
          <button 
            onClick={() => {
              console.log('🔧 DEBUG: Animasyon atlandı');
              setGameState('game'); // Game table'a geç
            }}
            style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              padding: '10px 20px',
              background: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              zIndex: 10000,
              fontSize: '14px'
            }}
          >
            ⏩ SKIP (DEBUG)
          </button>
        </>
      )}

      {showPhaseTransition && (
        <PhaseTransition
          phase={currentPhase.phase}
          turn={room?.Turn || currentPhase.turn || 1}
          isLeader={room?.Players?.find(p => (p.Name || p.name) === playerName)?.IsLeader || room?.Players?.find(p => (p.Name || p.name) === playerName)?.isLeader || false}
          nightResult={nightData}
          onStartVoting={async () => {
            console.log('🗳️ Lider oylama başlatıyor (PhaseTransition butonu)...');
            await signalR.invoke('StartVoting', roomCode, false);
            console.log('✅ StartVoting çağrıldı');
          }}
          onComplete={() => {
            console.log('✅ PhaseTransition kayboldu, onComplete çağrılıyor');
            setShowPhaseTransition(false);
            
            // ✅ YENİ: Ölü lider oylama başlattıysa spectator'a geç
            if (isPlayerDead) {
              console.log('💀👑 ÖLÜ LİDER - Oylama başlattı, spectator state\'e geçiyor');
              setGameState('spectator');
              return;
            }
            
            // PhaseTransition'dan sonra hangi state'e geçeceğimize phase'e bakarak karar ver
            setGameState(prevState => {
              // Ölü oyuncular zaten spectator state'te, değiştirme!
              if (prevState === 'spectator') {
                console.log('✅ Ölü oyuncu - spectator state korunuyor');
                return 'spectator';
              }
              
              // Phase'e göre doğru state'e geç
              if (currentPhase.phase === 'Day') {
                // Gündüz fazında lider butona bastı, oylama başladı
                console.log('✅ Day phase tamamlandı - Oylama başladı');
                return 'voting'; // VotingStarted eventi gelince zaten voting'e geçecek
              } else if (currentPhase.phase === 'Night') {
                console.log('✅ Canlı oyuncu - night state\'e geçiliyor');
                return 'night';
              } else if (currentPhase.phase === 'Voting') {
                console.log('✅ Voting phase başlıyor');
                return 'voting';
              }
              
              // Diğer durumlar için gece fazına geç (varsayılan)
              console.log('✅ Varsayılan - night state\'e geçiliyor');
              return 'night';
            });
            console.log('✅ PhaseTransition onComplete tamamlandı');
          }}
        />
      )}

      {gameState === 'game' && (
        <GameTable 
          room={room}
          myRole={myRole}
          playerName={playerName}
          onStartNightPhase={handleStartNightPhase}
          seerKnownRoles={seerKnownRoles}
        />
      )}

      {/* Mode 2: Mekan Seçim Ekranı */}
      {currentPhase.phase === 'LocationSelection' && locationSelectionData && (
        <LocationSelection 
          roomCode={roomCode}
          playerName={playerName}
          isLeader={room?.Players?.find(p => (p.Name || p.name) === playerName)?.IsLeader || room?.Players?.find(p => (p.Name || p.name) === playerName)?.isLeader || false}
          isPlayerDead={isPlayerDead}
        />
      )}

      {/* Mode 2: Kart Gösterim Ekranı */}
      {currentPhase.phase === 'CardReveal' && revealedCards && (
        <CardReveal 
          revealedCards={revealedCards}
          playerName={playerName}
          myRole={myRole}
          onComplete={() => {
            console.log('✅ Kart gösterimi tamamlandı, gece fazına geçiliyor');
            setRevealedCards(null);
            setCurrentPhase({ phase: 'Night', turn: currentPhase.turn });
            // gameState'i DEĞİŞTİRME - NightPhaseStarted eventi zaten 'night' yapacak
            console.log('✅ CardReveal tamamlandı, NightPhaseStarted eventini bekliyoruz...');
          }}
        />
      )}

      {gameState === 'night' && !isPlayerDead && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <NightPhase 
            room={room}
            myRole={myRole}
            playerName={playerName}
            vampireTeam={vampireTeam}
            vampireSelections={vampireSelections}
            onNightEnd={handleNightEnd}
            seerKnownRoles={seerKnownRoles}
          />
        </>
      )}

      {gameState === 'day' && !isPlayerDead && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <DayPhase 
            room={room}
            myRole={myRole}
            playerName={playerName}
            seerKnownRoles={seerKnownRoles}
            onStartVoting={handleStartVoting}
            nightData={nightData}
          />
        </>
      )}

      {gameState === 'doctor' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          {!isPlayerDead ? (
            <DoctorPhase 
              room={room}
              playerName={playerName}
              myRole={myRole}
              onDoctorSelect={handleDoctorSelect}
              seerKnownRoles={seerKnownRoles}
            />
          ) : (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              zIndex: 100,
              border: '2px solid #ff6b6b'
            }}>
              <div>💀 İzleyici modundasın</div>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>🏥 Doktor koruma seçiyor...</div>
            </div>
          )}
        </>
      )}

      {gameState === 'seer' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          {!isPlayerDead ? (
            myRole === 'Seer' ? (
              <SeerPhase 
                room={room}
                playerName={playerName}
                seerRevealData={seerRevealData}
                myRole={myRole}
                seerKnownRoles={seerKnownRoles}
                onComplete={() => {
                  console.log('🔮 Kahin fazı tamamlandı');
                  setSeerRevealData(null); // Temizle
                }}
              />
            ) : (
              <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '15px 30px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                textAlign: 'center',
                zIndex: 100,
                border: '2px solid #f59e0b'
              }}>
                <div>🔮 Kahin vizyon görüyor...</div>
              </div>
            )
          ) : (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              zIndex: 100,
              border: '2px solid #ff6b6b'
            }}>
              <div>💀 İzleyici modundasın</div>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>🔮 Kahin vizyon görüyor...</div>
            </div>
          )}
        </>
      )}

      {gameState === 'hunter' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          {/* ✅ DÜZELTME: Hunter öldü ama intikam alacak - isPlayerDead kontrolünü kaldır! */}
          {myRole === 'Hunter' ? (
            <HunterPhase 
              connection={signalR.connection}
              roomCode={roomCode}
              targets={hunterTargets}
            />
          ) : (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              zIndex: 100,
              border: '2px solid #ff4500'
            }}>
              <div>🎯 Avcı intikamını alıyor...</div>
            </div>
          )}
        </>
      )}

      {gameState === 'masterVampire' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          {!isPlayerDead ? (
            myRole === 'MasterVampire' ? (
              <MasterVampireChoice
                connection={signalR.connection}
                roomCode={roomCode}
                alivePlayers={masterVampireChoice}
              />
            ) : (
              <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '15px 30px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                textAlign: 'center',
                zIndex: 100,
                border: '2px solid #8b0000'
              }}>
                <div>🧛 Usta Vampir birini ısırıyor...</div>
              </div>
            )
          ) : (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              zIndex: 100,
              border: '2px solid #ff6b6b'
            }}>
              <div>💀 İzleyici modundasın</div>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>🧛 Usta Vampir birini ısırıyor...</div>
            </div>
          )}
        </>
      )}

      {gameState === 'day' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <DayPhase 
            room={room}
            nightData={nightData}
            playerName={playerName}
            onDayEnd={handleDayEnd}
            onVoteSubmit={handleVoteSubmit}
            onStartVoting={handleStartVoting}
            isPlayerDead={isPlayerDead}
          />
        </>
      )}

      {gameState === 'voting' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <VotingScreen 
            votingPlayers={votingPlayers}
            roomCode={roomCode}
            playerName={playerName}
            myRole={myRole}
            isPlayerDead={isPlayerDead}
            room={room}
            seerKnownRoles={seerKnownRoles}
          />
        </>
      )}

      {gameState === 'spectator' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 100,
            border: '2px solid #ff6b6b'
          }}>
            <div>💀 İzleyici modundasın</div>
            <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
              İzleyici modundasın - Oy kullanamazsın
            </div>
          </div>
        </>
      )}

      {gameState === 'votingResult' && (
        <>
          <GameTable 
            room={room}
            myRole={myRole}
            playerName={playerName}
            onStartNightPhase={handleStartNightPhase}
            seerKnownRoles={seerKnownRoles}
          />
          <VotingResult 
            eliminatedPlayer={votingResult?.eliminatedPlayer}
            isTie={votingResult?.isTie}
            roomCode={room?.RoomCode || room?.roomCode}
            gameMode={votingResult?.gameMode}
            isPlayerDead={isPlayerDead} 
            onContinue={() => {
              console.log('✅ VotingResult onContinue - Backend invoke VotingResult component tarafından yapıldı');
              // VotingResult component zaten ContinueToLocationSelection/ContinueToNight invoke ediyor
              // Burada sadece state güncellemesi gerekirse yapılır (şimdilik boş)
              // Backend eventi (LocationSelectionStarted/NightPhaseStarted) state'i güncelleyecek
            }}
          />
        </>
      )}

      {gameState === 'ended' && gameEndData && (
        <GameEnded 
          result={gameEndData.result}
          allRoles={gameEndData.allRoles}
          onReturnHome={handleReturnHome}
        />
      )}

      {gameState === 'ended' && !gameEndData && (
        <GameEndScreen 
          result={gameResult?.Result}
          allRoles={gameResult?.AllRoles}
          onReturnLobby={() => {
            setGameState('lobby');
            setRoom(null);
            setMyRole(null);
            setVampireTeam([]);
            setGameResult(null);
          }}
        />
      )}

      {/* Ölü oyuncu overlay'i - Gerçek ölüm için (BAŞLIKLI) */}
      {showDeathOverlay && gameState !== 'hunter' && (
        <DeadPlayerOverlay 
          playerName={playerName}
          message={deathMessage}
          showTitle={true}
        />
      )}
      
      {/* Gece bildirimi overlay - Genel mesajlar için (BAŞLIKSIZ) */}
      {showNotificationOverlay && (
        <DeadPlayerOverlay 
          playerName={playerName}
          message={notificationMessage}
          showTitle={false}
          isDeathNotification={notificationMessage?.includes('oyundan çıktı')}
        />
      )}
      
      {/* Bekleme mesajı overlay - Başlık olmadan sadece mesaj */}
      {waitingMessage && (
        <DeadPlayerOverlay 
          playerName={playerName}
          message={waitingMessage}
          showTitle={false}
        />
      )}
    </div>
  );
}

export default App;