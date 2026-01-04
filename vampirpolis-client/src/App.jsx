import { useState, useEffect, useRef } from 'react';
import signalR from './services/signalRService';
import Lobby from './components/Lobby';
import RoleSelection from './components/RoleSelection';
import RoleDistribution from './components/RoleDistribution';
import PhaseTransition from './components/PhaseTransition';
import GameTable from './components/GameTable';
import NightPhase from './components/NightPhase';
import DoctorPhase from './components/DoctorPhase';
import SeerPhase from './components/SeerPhase';
import HunterPhase from './components/HunterPhase';
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
  const [showDeathOverlay, setShowDeathOverlay] = useState(false); // 3 saniye göster sonra kapat
  const [showRoleSelection, setShowRoleSelection] = useState(false); // Rol seçim modal'ı için
  const [hunterTargets, setHunterTargets] = useState([]); // Avcı intikam hedefleri
  const [seerRevealData, setSeerRevealData] = useState(null); // Kahin'in öğrendiği rol
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
      console.log('Kalan oyuncu:', roomData?.Players?.length || 0);
      setRoom(roomData);
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
      
      // PhaseTransition göster
      setShowPhaseTransition(true);
    });

    signalR.on('NightEnded', (nightResult) => {
      console.log('🌅 Gece bitti!', nightResult);
      console.log('🌅 killedPlayer:', nightResult?.killedPlayer);
      console.log('🌅 message:', nightResult?.message);
      setNightData(nightResult);
      
      // Eğer öldürülen oyuncu bensem, ölü durumunu işaretle
      const currentPlayerName = playerNameRef.current;
      if (nightResult?.killedPlayer === currentPlayerName) {
        console.log('💀 BEN ÖLDÜM!', currentPlayerName);
        setIsPlayerDead(true);
        setDeathMessage(nightResult?.message || 'Vampirler seni katletti!');
        setShowDeathOverlay(true); // Overlay'i göster
        
        // 3 saniye sonra overlay'i kapat
        setTimeout(() => {
          setShowDeathOverlay(false);
          console.log('✅ Death overlay kapatıldı, izleyici modu aktif');
        }, 3000);
      }
      
      // Gündüz fazına geç
      setGameState('day');
    });

    signalR.on('VotingStarted', (votingData) => {
      console.log('🗳️ Oylama başladı!', votingData);
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

    signalR.on('DoctorPhaseStarted', (data) => {
      console.log('🏥 Doktor fazı başladı!', data);
      // Backend'den gelen oyuncu listesini room'a ekle
      setRoom(prevRoom => ({
        ...prevRoom,
        Players: data.players || prevRoom?.Players,
        players: data.players || prevRoom?.players,
        DoctorPhaseData: data
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
      
      // Önce Hunter öldü bildirimini göster
      setDeathMessage('💀 AVCI ÖLDÜ - İNTİKAMINI ALIYOR!');
      setShowDeathOverlay(true);
      
      // 3 saniye sonra bildirimi kapat ve Hunter panelini aç
      setTimeout(() => {
        setShowDeathOverlay(false);
        setHunterTargets(data.targets || []);
        setGameState('hunter');
      }, 3000);
    });

    signalR.on('WaitingForHunter', (data) => {
      console.log('⏳ Avcı bekleniyor:', data);
      setGameState('hunter');
    });

    signalR.on('HunterRevengeComplete', (data) => {
      console.log('💀 Avcı intikamını aldı:', data);
      // Gündüz fazına geçiş otomatik olacak
    });

    signalR.on('VoteConfirmed', () => {
      console.log('✅ Oy kaydedildi');
    });

    signalR.on('VotingResult', (result) => {
      console.log('📊 Oylama sonucu:', result);
      // Sonucu göster - ileride ekleyeceğiz
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
      console.log('☀️ Gündüz fazı başladı!', data);
      setNightData(data);
      setCurrentPhase({ phase: 'Day', turn: data.Turn || 1 });
      setShowPhaseTransition(true);
    });

    signalR.on('VotingStarted', (alivePlayers) => {
      console.log('🗳️ Oylama başladı! Hayatta:', alivePlayers?.length || 0);
      const currentPlayerName = playerNameRef.current; // Ref'ten oku
      console.log('🗳️ CURRENT playerName (from ref):', currentPlayerName);
      console.log('🗳️ alivePlayers array:', alivePlayers);
      
      // Ölü oyuncuları filtrele
      const reallyAlive = (alivePlayers || []).filter(p => {
        const isAlive = (p.IsAlive !== false) && (p.isAlive !== false);
        console.log(`  Oyuncu ${p.Name || p.name}: isAlive=${p.isAlive}, IsAlive=${p.IsAlive}, filtered=${isAlive}`);
        return isAlive;
      });
      console.log('✅ Gerçekten hayatta:', reallyAlive.length);
      setVotingPlayers(reallyAlive);
      
      // Mevcut oyuncunun hayatta olan listesinde olup olmadığını kontrol et
      const amIAlive = reallyAlive.some(p => 
        (p.Name === currentPlayerName) || (p.name === currentPlayerName) || 
        (p.Id === currentPlayerName) || (p.id === currentPlayerName)
      );
      
      console.log(`🔍 Ben (${currentPlayerName}) hayatta mıyım? ${amIAlive}`);
      console.log(`🔍 Hayatta olan oyuncular:`, reallyAlive.map(p => p.Name || p.name));
      
      if (amIAlive) {
        setGameState('voting');
      } else {
        console.log('💀 ÖLÜ OYUNCU! Oylama ekranı gösterilmeyecek. İzleyici modu aktif.');
        // Elenen oyuncular için spectator state'e geç
        setGameState('spectator');
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
      
      // camelCase versiyonlarını kullan
      const eliminatedPlayerName = data.eliminatedPlayerName || data.EliminatedPlayerName;
      const eliminatedPlayerRole = data.eliminatedPlayerRole || data.EliminatedPlayerRole;
      const isTie = data.isTie !== undefined ? data.isTie : data.IsTie;
      const nextTurn = data.nextTurn || data.NextTurn;
      
      console.log('📊 Normalized values:');
      console.log('  - eliminatedPlayerName:', eliminatedPlayerName);
      console.log('  - eliminatedPlayerRole:', eliminatedPlayerRole);
      console.log('  - isTie:', isTie);
      console.log('  - nextTurn:', nextTurn);
      
      // Eğer elenen oyuncu ben isem, ölü olarak işaretle
      const currentPlayerName = playerNameRef.current;
      if (eliminatedPlayerName === currentPlayerName) {
        console.log('💀 BEN ELENDİM! Artık izleyici modundayım.');
        setIsPlayerDead(true);
        setDeathMessage(`Köylüler tarafından elendin! (${eliminatedPlayerName})`);
        setShowDeathOverlay(true); // Overlay'i göster
        
        // 3 saniye sonra overlay'i kapat
        setTimeout(() => {
          setShowDeathOverlay(false);
          console.log('✅ Death overlay kapatıldı, izleyici modu aktif');
        }, 3000);
      }
      
      // Room turn'ü güncelle
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
        
        setVotingResult({
          eliminatedPlayer: eliminatedPlayer,
          isTie: isTie,
          nextTurn: nextTurn
        });
        
        return updatedRoom;
      });
      
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
    });

    // Oda listesi güncellemesi
    signalR.on('RoomListUpdated', () => {
      console.log('📢 Oda listesi güncelleniyor...');
      loadRooms();
    });

    // Event listener'lar kaydedildi, ŞİMDİ bağlan
    console.log('🔄 SignalR bağlanıyor...');
    let intervalId;
    
    signalR.connect()
      .then(() => {
        console.log('✅ SignalR bağlandı, odalar yükleniyor...');
        // Bağlantı başarılı olunca odaları yükle
        loadRooms();
        // Her 500ms'de bir güncelle (hızlı polling)
        intervalId = setInterval(loadRooms, 500);
      })
      .catch((err) => {
        console.error('❌ SignalR bağlantı başarısız:', err);
      });

    // Component unmount olduğunda cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('🧹 Polling interval temizlendi');
      }
      // SignalR bağlantısını AÇIK BIRAK - lobby'de de gerekli!
      // signalR.disconnect();
    };
  }, []);

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
      await signalR.invoke('VampireAttack', roomCode, targetName);
      console.log('✅ VampireAttack çağrıldı');
    } catch (err) {
      console.error('❌ VampireAttack hatası:', err);
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
      await signalR.invoke('StartVoting', roomCode);
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
    setPlayerName('');
    playerNameRef.current = '';
    setRoomCode('');
    setRoom(null);
    setMyRole(null);
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
            onStartGameClick={() => setShowRoleSelection(true)}
          />
          {showRoleSelection && (
            <RoleSelection
              roomCode={roomCode}
              playerCount={room?.Players?.length || 0}
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
          onComplete={() => {
            setShowPhaseTransition(false);
            // Gece fazına geç
            setGameState('night');
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

      {gameState === 'night' && (
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
            onNightEnd={handleNightEnd}
            seerKnownRoles={seerKnownRoles}
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
          <DoctorPhase 
            room={room}
            playerName={playerName}
            myRole={myRole}
            onDoctorSelect={handleDoctorSelect}
            seerKnownRoles={seerKnownRoles}
          />
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
          {myRole === 'Seer' ? (
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
            <div>⏳ Oylamalar devam ediyor...</div>
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
            onContinue={() => {
              // Yeni gece fazına geç
              setGameState('game');
              setShowPhaseTransition(true);
              setCurrentPhase({ phase: 'Night', turn: votingResult?.nextTurn || 1 });
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

      {/* Ölü oyuncu overlay'i - 3 saniye göster sonra izleyici moda geç */}
      {/* Ama Avcı intikam alırken gösterme! */}
      {showDeathOverlay && gameState !== 'hunter' && (
        <DeadPlayerOverlay 
          playerName={playerName}
          message={deathMessage}
        />
      )}
    </div>
  );
}

export default App;