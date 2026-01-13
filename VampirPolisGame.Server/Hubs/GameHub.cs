using Microsoft.AspNetCore.SignalR;
using VampirPolisGame.Server.Models;
using VampirPolisGame.Server.Services;

namespace VampirPolisGame.Server.Hubs
{
    public class GameHub : Hub
    {
        private readonly RoomService _roomService;
        private readonly GameService _gameService;

        public GameHub(RoomService roomService, GameService gameService)
        {
            _roomService = roomService;
            _gameService = gameService;
        }

        // Tüm odaları getir
        public List<object> GetRooms()
        {
            var rooms = _roomService.GetAllRooms();
            return rooms;
        }

        // Oda oluştur
        public async Task CreateRoom(string playerName)
        {
            Console.WriteLine($"🎮 CreateRoom çağrıldı: {playerName}");
            var room = _roomService.CreateRoom(playerName, Context.ConnectionId);
            Console.WriteLine($"✅ Oda oluşturuldu: {room.RoomCode}, Oyuncu sayısı: {room.Players.Count}");
            
            await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);
            
            // Basit JSON oluştur
            var playersList = new List<object>();
            foreach (var p in room.Players)
            {
                var playerObj = new Dictionary<string, object>
                {
                    { "Name", p.Name },
                    { "ConnectionId", p.ConnectionId },
                    { "IsLeader", p.IsLeader },
                    { "IsAlive", p.IsAlive },
                    { "Role", p.Role.ToString() }
                };
                playersList.Add(playerObj);
                Console.WriteLine($"  👤 Oyuncu: {p.Name}, Lider: {p.IsLeader}");
            }
            
            var roomData = new Dictionary<string, object>
            {
                { "RoomCode", room.RoomCode },
                { "Phase", room.Phase.ToString() },
                { "Players", playersList }
            };
            
            Console.WriteLine($"📤 RoomCreated eventi gönderiliyor: {room.RoomCode}, Players: {playersList.Count}");
            await Clients.Caller.SendAsync("RoomCreated", room.RoomCode, roomData);
            Console.WriteLine($"✅ RoomCreated eventi gönderildi!");
            
            // Tüm clientlara oda listesi güncellemesi gönder
            await Clients.All.SendAsync("RoomListUpdated");
            Console.WriteLine($"📢 RoomListUpdated broadcast yapıldı!");
        }

        // Odaya katıl
        public async Task JoinRoom(string roomCode, string playerName)
        {
            Console.WriteLine($"🚪 JoinRoom çağrıldı: {playerName} -> {roomCode}");
            var result = _roomService.JoinRoom(roomCode, playerName, Context.ConnectionId);
            
            if (!result.success)
            {
                Console.WriteLine($"❌ Katılım başarısız: {result.message}");
                await Clients.Caller.SendAsync("Error", result.message);
                return;
            }
            
            Console.WriteLine($"✅ Odaya katıldı: {result.room.RoomCode}, Toplam oyuncu: {result.room.Players.Count}");
            
            // Basit JSON oluştur
            var playersList = new List<object>();
            foreach (var p in result.room.Players)
            {
                var playerObj = new Dictionary<string, object>
                {
                    { "Name", p.Name },
                    { "ConnectionId", p.ConnectionId },
                    { "IsLeader", p.IsLeader },
                    { "IsAlive", p.IsAlive },
                    { "Role", p.Role.ToString() }
                };
                playersList.Add(playerObj);
                Console.WriteLine($"  👤 Oyuncu: {p.Name}, Lider: {p.IsLeader}");
            }
            
            var roomData = new Dictionary<string, object>
            {
                { "RoomCode", result.room.RoomCode },
                { "Phase", result.room.Phase.ToString() },
                { "Players", playersList }
            };
            
            Console.WriteLine($"📤 PlayerJoined eventi gönderiliyor: {roomCode}, Players: {playersList.Count}");
            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
            await Clients.Group(roomCode).SendAsync("PlayerJoined", roomData);
            Console.WriteLine($"✅ PlayerJoined eventi gönderildi!");
            
            // Tüm clientlara oda listesi güncellemesi gönder
            await Clients.All.SendAsync("RoomListUpdated");
            Console.WriteLine($"📢 RoomListUpdated broadcast yapıldı!");
        }

        // Odadan ayrıl
        public async Task LeaveRoom(string roomCode)
        {
            Console.WriteLine($"🚪 LeaveRoom çağrıldı: {Context.ConnectionId} -> {roomCode}");
            
            var room = _roomService.RemovePlayer(Context.ConnectionId);
            
            if (room != null)
            {
                Console.WriteLine($"✅ Oyuncu odadan çıktı: {roomCode}");
                
                // Group'tan çıkar
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
                
                // Odadaki diğer oyunculara bildir
                if (room.Players.Count > 0)
                {
                    var playersList = new List<object>();
                    foreach (var p in room.Players)
                    {
                        playersList.Add(new Dictionary<string, object>
                        {
                            { "Name", p.Name },
                            { "ConnectionId", p.ConnectionId },
                            { "IsLeader", p.IsLeader },
                            { "IsAlive", p.IsAlive },
                            { "Role", p.Role.ToString() }
                        });
                    }
                    
                    var roomData = new Dictionary<string, object>
                    {
                        { "RoomCode", room.RoomCode },
                        { "Phase", room.Phase.ToString() },
                        { "Players", playersList }
                    };
                    
                    await Clients.Group(roomCode).SendAsync("PlayerLeft", roomData);
                }
                
                // Tüm clientlara oda listesi güncellemesi gönder
                await Clients.All.SendAsync("RoomListUpdated");
            }
        }

        // Mode seçimi (Sadece lider)
        public async Task SelectGameMode(string roomCode, string mode)
        {
            Console.WriteLine($"🎮 SelectGameMode çağrıldı: {roomCode} -> {mode}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Oda bulunamadı");
                return;
            }
            
            // Sadece lider seçebilir
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader)
            {
                await Clients.Caller.SendAsync("Error", "Sadece lider modu seçebilir");
                return;
            }
            
            // Sadece Waiting fazında seçilebilir
            if (room.Phase != GamePhase.Waiting)
            {
                await Clients.Caller.SendAsync("Error", "Oyun başlamadan önce mod seçilmelidir");
                return;
            }
            
            // Mode'u parse et ve ata
            if (Enum.TryParse<GameMode>(mode, out var gameMode))
            {
                room.Mode = gameMode;
                Console.WriteLine($"✅ Mode seçildi: {gameMode}");
                
                // Tüm oyunculara bildir
                await Clients.Group(roomCode).SendAsync("GameModeSelected", gameMode.ToString());
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Geçersiz mod");
            }
        }

        // Seçilen rollerle oyunu başlat
        public async Task StartGameWithRoles(string roomCode, List<string> selectedRoles)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader) return;
            
            if (room.Players.Count < 4)
            {
                await Clients.Caller.SendAsync("Error", "En az 4 oyuncu gerekli");
                return;
            }
            
            // Seçilen rol sayısı oyuncu sayısıyla eşleşmeli
            if (selectedRoles.Count != room.Players.Count)
            {
                await Clients.Caller.SendAsync("Error", $"Rol sayısı ({selectedRoles.Count}) oyuncu sayısıyla ({room.Players.Count}) eşleşmiyor");
                return;
            }
            
            // Mode 2'de Seer kontrolü
            if (room.Mode == GameMode.Mode2 && selectedRoles.Contains("Seer"))
            {
                await Clients.Caller.SendAsync("Error", "Kahin rolü Mode 2'de kullanılamaz");
                Console.WriteLine("❌ Mode 2'de Kahin seçimi engellendi!");
                return;
            }
            
            // Rolleri dağıt (seçilen rollerle)
            _gameService.AssignSelectedRoles(room, selectedRoles);
            room.Phase = GamePhase.Waiting;
            room.Turn = 1;
            
            // Her oyuncuya kendi rolünü gönder
            foreach (var player in room.Players)
            {
                // ✅ ConnectionId yerine oyuncu isimlerini gönder
                var vampireNames = room.Players
                    .Where(p => room.VampirePlayerIds.Contains(p.Id))
                    .Select(p => p.Name)
                    .ToList();
                
                var roleData = new
                {
                    Role = player.Role.ToString(),
                    VampireTeam = (player.Role == Role.Vampire || player.Role == Role.MasterVampire || player.Role == Role.Fledgling) 
                        ? vampireNames  // ✅ İsimler gönderiliyor, vampirler birbirlerini göremez
                        : new List<string>()
                };
                
                Console.WriteLine($"🎭 Sending RoleAssigned to {player.Name}: {player.Role}");
                await Clients.Client(player.ConnectionId).SendAsync("RoleAssigned", roleData);
            }
            
            // Oyun masasını göster
            var roomJson = new
            {
                RoomCode = room.RoomCode,
                Phase = room.Phase.ToString(),
                Turn = room.Turn,
                Players = room.Players.Select(p => new
                {
                    Name = p.Name,
                    ConnectionId = p.ConnectionId,
                    IsLeader = p.IsLeader,
                    IsAlive = p.IsAlive,
                    Role = p.Role.ToString()
                }).ToList()
            };
            
            Console.WriteLine($"🃏 Sending GameTableReady: {room.Players.Count} players");
            await Clients.Group(roomCode).SendAsync("GameTableReady", roomJson);
        }

        // Oyunu başlat (sadece roller dağıt) - ESKİ METOD
        public async Task StartGame(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader) return;
            
            if (room.Players.Count < 4)
            {
                await Clients.Caller.SendAsync("Error", "En az 4 oyuncu gerekli");
                return;
            }
            
            // Rolleri dağıt
            _gameService.AssignRoles(room);
            room.Phase = GamePhase.Waiting; // Gece değil, bekleme fazı
            room.Turn = 1;
            
            // Her oyuncuya kendi rolünü gönder
            foreach (var player in room.Players)
            {
                // ✅ ConnectionId yerine oyuncu isimlerini gönder
                var vampireNames = room.Players
                    .Where(p => room.VampirePlayerIds.Contains(p.Id))
                    .Select(p => p.Name)
                    .ToList();
                
                var roleData = new
                {
                    Role = player.Role.ToString(),
                    VampireTeam = (player.Role == Role.Vampire || player.Role == Role.MasterVampire || player.Role == Role.Fledgling) 
                        ? vampireNames  // ✅ İsimler gönderiliyor, vampirler birbirlerini göremez
                        : new List<string>()
                };
                
                Console.WriteLine($"🎭 Sending RoleAssigned to {player.Name}: {player.Role}");
                await Clients.Client(player.ConnectionId).SendAsync("RoleAssigned", roleData);
            }
            
            // Oyun masasını göster (Gece fazı başlamadı henüz)
            var roomJson = new
            {
                RoomCode = room.RoomCode,
                Phase = room.Phase.ToString(),
                Turn = room.Turn,
                Players = room.Players.Select(p => new
                {
                    Name = p.Name,
                    ConnectionId = p.ConnectionId,
                    IsLeader = p.IsLeader,
                    IsAlive = p.IsAlive,
                    Role = p.Role.ToString()
                }).ToList()
            };
            
            Console.WriteLine($"🃏 Sending GameTableReady: {room.Players.Count} players");
            await Clients.Group(roomCode).SendAsync("GameTableReady", roomJson);
        }
        
        // Mekan seçimi (Mode 2 - Her oyuncu)
        public async Task SelectLocation(string roomCode, string location)
        {
            Console.WriteLine($"📍 SelectLocation çağrıldı: {roomCode} -> {location}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Oda bulunamadı");
                return;
            }
            
            // Mode 2 değilse mekan seçimi yok
            if (room.Mode != GameMode.Mode2)
            {
                await Clients.Caller.SendAsync("Error", "Mekan seçimi sadece Mode 2'de kullanılabilir");
                return;
            }
            
            var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (player == null || !player.IsAlive)
            {
                await Clients.Caller.SendAsync("Error", "Oyuncu bulunamadı veya ölü");
                return;
            }
            
            // Location'ı parse et
            if (Enum.TryParse<Location>(location, out var loc))
            {
                room.PlayerLocations[player.Id] = loc;
                Console.WriteLine($"✅ {player.Name} -> {loc} seçti");
                
                // Tüm oyunculara bildir (kaç kişi seçti)
                var selectedCount = room.PlayerLocations.Count;
                var totalAlive = room.GetAlivePlayers().Count();
                
                await Clients.Group(roomCode).SendAsync("LocationSelected", new
                {
                    PlayerName = player.Name,
                    SelectedCount = selectedCount,
                    TotalAlive = totalAlive
                });
                
                // Herkes seçtiyse OTOMATIK OLARAK kart gösterimine geç
                if (selectedCount == totalAlive)
                {
                    Console.WriteLine($"✅ Herkes mekan seçti! Otomatik kart gösterimi başlıyor...");
                    
                    // 1 saniye bekle (animasyon için)
                    await Task.Delay(1000);
                    
                    // Otomatik olarak kart gösterimine geç
                    await RevealLocationCards(roomCode);
                }
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Geçersiz mekan");
            }
        }
        
        // Lider devam butonuna basınca kart gösterimini başlat (Mode 2)
        public async Task StartCardReveal(string roomCode)
        {
            Console.WriteLine($"🎬 StartCardReveal çağrıldı: {roomCode}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Oda bulunamadı");
                return;
            }
            
            // Sadece lider başlatabilir
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader)
            {
                await Clients.Caller.SendAsync("Error", "Sadece lider kart gösterimini başlatabilir");
                return;
            }
            
            // En azından lider seçim yapmış olmalı
            if (!room.PlayerLocations.ContainsKey(caller.Id) || room.PlayerLocations[caller.Id] == Location.None)
            {
                await Clients.Caller.SendAsync("Error", "Önce kendi mekanını seç!");
                return;
            }
            
            await RevealLocationCards(roomCode);
        }
        
        // Mekan kartlarını ifşa et (Mode 2)
        private async Task RevealLocationCards(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var random = new Random();
            
            // Her mekan için rastgele 1 kişinin kartı açılacak
            var revealedCardsByLocation = new Dictionary<Location, string>(); // Location -> PlayerId
            
            var locationGroups = room.PlayerLocations
                .GroupBy(kv => kv.Value)
                .Where(g => g.Key != Location.None);
            
            foreach (var group in locationGroups)
            {
                var playersInLocation = group.Select(kv => kv.Key).ToList();
                if (playersInLocation.Count == 0) continue;
                
                // Rastgele 1 kişi seç
                var revealedPlayerId = playersInLocation[random.Next(playersInLocation.Count)];
                var revealedPlayer = room.Players.FirstOrDefault(p => p.Id == revealedPlayerId);
                
                if (revealedPlayer != null)
                {
                    // Yeni Yetme Vampir (Fledgling) KARTINI KONTROL ET
                    var roleToShow = revealedPlayer.Role;
                    if (roleToShow == Role.Fledgling)
                    {
                        Console.WriteLine($"🧛 FLEDGLİNG KARTI SEÇİLDİ: {revealedPlayer.Name} - Farklı biri gösterilecek!");
                        // Fledgling varsa farklı birini seç (kartı gözükmez)
                        var otherPlayers = playersInLocation.Where(id => id != revealedPlayerId).ToList();
                        if (otherPlayers.Count > 0)
                        {
                            revealedPlayerId = otherPlayers[random.Next(otherPlayers.Count)];
                            revealedPlayer = room.Players.FirstOrDefault(p => p.Id == revealedPlayerId);
                            Console.WriteLine($"🔄 Yerine gösterilecek: {revealedPlayer.Name} ({revealedPlayer.Role})");
                        }
                        else
                        {
                            // Bu mekanda sadece Fledgling var, skip
                            Console.WriteLine($"⚠️ Bu mekanda sadece Fledgling var, kart açılmayacak!");
                            continue;
                        }
                    }
                    
                    revealedCardsByLocation[group.Key] = revealedPlayerId;
                    Console.WriteLine($"🃏 {group.Key}: {revealedPlayer.Name} ({revealedPlayer.Role}) kartı açılacak");
                }
            }
            
            // HER OYUNCUYA AYRI MESAJ GÖNDER - Sadece kendi mekanındaki oyuncuları görsün
            foreach (var player in room.Players)
            {
                if (!player.IsAlive) continue;
                
                // Bu oyuncunun mekanı
                if (!room.PlayerLocations.TryGetValue(player.Id, out var playerLocation) || playerLocation == Location.None)
                    continue;
                
                // Aynı mekandaki tüm oyuncular
                var playersInSameLocation = room.PlayerLocations
                    .Where(kv => kv.Value == playerLocation && kv.Key != player.Id)
                    .Select(kv => kv.Key)
                    .ToList();
                
                // Kendi kartını da ekle
                playersInSameLocation.Insert(0, player.Id);
                
                // Bu mekanda açılacak kart
                var revealedCardId = revealedCardsByLocation.ContainsKey(playerLocation) 
                    ? revealedCardsByLocation[playerLocation] 
                    : null;
                
                // Bu oyuncuya gönderilecek kartlar
                var cardsForThisPlayer = playersInSameLocation.Select(playerId =>
                {
                    var p = room.Players.FirstOrDefault(x => x.Id == playerId);
                    if (p == null) return null;
                    
                    return new
                    {
                        PlayerId = p.Id,
                        PlayerName = p.Name,
                        Role = p.Role.ToString(),
                        IsRevealed = playerId == revealedCardId // Bu kart açılacak mı?
                    };
                }).Where(c => c != null).ToList();
                
                // Bu oyuncuya özel mesaj gönder
                await Clients.Client(player.ConnectionId).SendAsync("LocationCardsRevealed", cardsForThisPlayer);
                
                Console.WriteLine($"📤 {player.Name} için {cardsForThisPlayer.Count} kart gönderildi (Mekan: {playerLocation})");
                Console.WriteLine($"   🔍 Kartlar: {string.Join(", ", cardsForThisPlayer.Select(c => $"{c.PlayerName}({c.IsRevealed})"))}");
                Console.WriteLine($"   🎯 Açılacak kart ID: {revealedCardId}");
            }
            
            // 30 saniye sonra gece fazına geç
            await Task.Delay(30000);
            
            // Mekan seçimlerini temizle
            room.PlayerLocations.Clear();
            
            // Gece fazını başlat
            room.Phase = GamePhase.Night;
            var roomJson = new
            {
                RoomCode = room.RoomCode,
                Phase = room.Phase.ToString(),
                Turn = room.Turn,
                Players = room.Players.Select(p => new
                {
                    Id = p.Id,
                    Name = p.Name,
                    ConnectionId = p.ConnectionId,
                    IsLeader = p.IsLeader,
                    IsAlive = p.IsAlive,
                    Role = p.Role.ToString()
                }).ToList()
            };
            
            await Clients.Group(roomCode).SendAsync("NightPhaseStarted", roomJson);
        }
        
        // Gece fazını başlat (sadece lider)
        public async Task StartNightPhase(string roomCode)
        {
            Console.WriteLine($"🌙 StartNightPhase ÇAĞRILDI: {roomCode}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                Console.WriteLine($"❌ StartNightPhase: Oda bulunamadı!");
                return;
            }
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader)
            {
                Console.WriteLine($"❌ StartNightPhase: Lider değil! Caller: {caller?.Name}");
                return;
            }
            
            Console.WriteLine($"✅ StartNightPhase: Lider {caller.Name} geçerli, devam ediliyor...");
            
            // Zaten gece fazındaysa veya başka faz aktifse engelle
            if (room.Phase != GamePhase.Waiting && room.Phase != GamePhase.Day)
            {
                Console.WriteLine($"⚠️ Gece fazı başlatılamaz! Mevcut faz: {room.Phase}");
                return;
            }
            
            // MODE 2: Önce mekan seçimi
            if (room.Mode == GameMode.Mode2)
            {
                room.Phase = GamePhase.LocationSelection;
                
                // Room state'ini gönder (isLeader bilgisi için)
                var locationStartData = new
                {
                    RoomCode = room.RoomCode,
                    Phase = room.Phase.ToString(),
                    Turn = room.Turn,
                    Mode = room.Mode.ToString(),
                    Players = room.Players.Select(p => new
                    {
                        Name = p.Name,
                        IsAlive = p.IsAlive,
                        IsLeader = p.IsLeader,
                        Role = p.Role.ToString()
                    }).ToList()
                };
                
                await Clients.Group(roomCode).SendAsync("LocationSelectionStarted", locationStartData);
                
                Console.WriteLine($"📍 Mode 2 - Mekan seçimi başladı");
                return;
            }
            
            // MODE 1: Direkt gece fazı
            room.Phase = GamePhase.Night;
            
            var roomJson = new
            {
                RoomCode = room.RoomCode,
                Phase = room.Phase.ToString(),
                Turn = room.Turn,
                Players = room.Players.Select(p => new
                {
                    Id = p.Id,
                    Name = p.Name,
                    ConnectionId = p.ConnectionId,
                    IsLeader = p.IsLeader,
                    IsAlive = p.IsAlive,
                    Role = p.Role.ToString()
                }).ToList()
            };
            
            Console.WriteLine($"🌙 Lider tarafından NightPhaseStarted: {room.Players.Count} players");
            await Clients.Group(roomCode).SendAsync("NightPhaseStarted", roomJson);
        }

        // Yeni Yetme Vampir (Fledgling) saldırısı - Mode 2 (Usta Vampir öldükten sonra tek başına avlanır)
        public async Task FledglingAttack(string roomCode, string targetPlayerNameOrId)
        {
            Console.WriteLine($"🧛 FledglingAttack çağrıldı: roomCode={roomCode}, target={targetPlayerNameOrId}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null || room.Phase != GamePhase.Night) return;
            
            // Fledgling'i bul
            var fledgling = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId && p.Role == Role.Fledgling);
            if (fledgling == null || !fledgling.IsAlive)
            {
                Console.WriteLine($"❌ Fledgling bulunamadı veya ölü!");
                return;
            }
            
            // Hedefi bul (Name veya Id)
            var target = room.Players.FirstOrDefault(p => 
                (p.Name == targetPlayerNameOrId || p.Id == targetPlayerNameOrId) && p.IsAlive);
            
            if (target == null)
            {
                Console.WriteLine($"❌ Hedef bulunamadı: {targetPlayerNameOrId}");
                return;
            }
            
            Console.WriteLine($"🧛 Fledgling {fledgling.Name} → {target.Name}'e saldırıyor");
            
            // Vampire target set et
            room.VampireTarget = target.Id;
            fledgling.NightTarget = target.Id;
            
            await Clients.Caller.SendAsync("FledglingAttackConfirmed", new { targetName = target.Name });
            
            // Process night actions (Doctor protection check + kill)
            await ProcessNightPhase(roomCode);
        }

        // Vampir hedef seçimi (Koordinasyon: Tüm vampirler aynı hedefi seçmeli)
        public async Task VampireAttack(string roomCode, string targetName)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var vampire = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            
            // Vampire, MasterVampire VE Fledgling avlanabilir!
            bool isVampire = vampire != null && vampire.IsAlive && 
                (vampire.Role == Role.Vampire || 
                 vampire.Role == Role.MasterVampire ||
                 vampire.Role == Role.Fledgling);
                 
            if (!isVampire)
            {
                Console.WriteLine($"❌ Vampir/MasterVampire/Fledgling bulunamadı, rol eşleşmedi veya ölü");
                return;
            }
            
            var target = room.Players.FirstOrDefault(p => p.Name == targetName);
            if (target == null || !target.IsAlive) return;
            
            // Bu vampirin seçimini kaydet
            vampire.NightTarget = target.Id;
            
            Console.WriteLine($"🎯 Vampir {vampire.Name} ({vampire.Role}) hedef seçti: {targetName} (ID: {target.Id})");
            
            // Tüm avlanabilen vampirler seçim yaptı mı? (Vampire, MasterVampire VE Fledgling)
            var vampires = room.Players.Where(v => v.IsAlive && 
                (v.Role == Role.Vampire || 
                 v.Role == Role.MasterVampire || 
                 v.Role == Role.Fledgling)).ToList();
            var allVampiresChose = vampires.All(v => v.NightTarget != null);
            
            // Her vampire AYRI AYRI doğru isMe flagiyle seçimleri gönder
            foreach (var vamp in vampires)
            {
                // Bu vampir için özel olarak isMe flagini hesapla
                var vampireSelectionsForThisVampire = vampires
                    .Where(v => v.NightTarget != null)
                    .Select(v => new
                    {
                        vampireName = v.Name,
                        vampireRole = v.Role.ToString(),
                        targetName = room.Players.FirstOrDefault(p => p.Id == v.NightTarget)?.Name,
                        isMe = v.ConnectionId == vamp.ConnectionId  // Bu vampir için doğru isMe
                    })
                    .ToList();

                Console.WriteLine($"📡 {vamp.Name} vampirine gönderilen seçimler:");
                foreach (var sel in vampireSelectionsForThisVampire)
                {
                    Console.WriteLine($"   {sel.vampireName} → {sel.targetName} (isMe: {sel.isMe})");
                }

                await Clients.Client(vamp.ConnectionId).SendAsync("VampireSelectionsUpdate", new
                {
                    selections = vampireSelectionsForThisVampire,
                    totalVampires = vampires.Count,
                    chosenCount = vampires.Count(v => v.NightTarget != null),
                    allChosen = allVampiresChose
                });
            }
            
            if (!allVampiresChose)
            {
                Console.WriteLine($"⏳ Diğer vampir(ler) henüz seçim yapmadı. Toplam: {vampires.Count}, Seçim yaptı: {vampires.Count(v => v.NightTarget != null)}");
                
                // Bu vampire onay gönder
                await Clients.Caller.SendAsync("VampireSelectionConfirmed", new
                {
                    Message = "Seçiminiz kaydedildi. Diğer vampir(ler) seçim yapıyor..."
                });
                return;
            }
            
            Console.WriteLine($"✅ Tüm vampirler seçim yaptı!");
            
            // Tüm vampirler aynı hedefi seçti mi?
            var firstTarget = vampires.First().NightTarget;
            var sameTarget = vampires.All(v => v.NightTarget == firstTarget);
            
            // Vampir hedefini room'a kaydet
            if (sameTarget)
            {
                Console.WriteLine($"✅ Vampirler aynı hedefi seçti: {firstTarget}");
                room.VampireTarget = firstTarget;
                
                // Gece seçimlerini sıfırla
                foreach (var v in vampires)
                {
                    v.NightTarget = null;
                }
            }
            else
            {
                Console.WriteLine($"❌ Vampirler farklı hedefler seçti - yeniden seçmeleri gerekiyor!");
                var targetsList = vampires.Select(v => 
                {
                    var p = room.Players.FirstOrDefault(x => x.Id == v.NightTarget);
                    return $"{v.Name} → {p?.Name ?? "?"}";
                }).ToList();
                Console.WriteLine($"   Seçimler: {string.Join(", ", targetsList)}");
                
                // SEÇİMLERİ SIL - Yeniden seçmeliler
                foreach (var v in vampires)
                {
                    v.NightTarget = null;
                }
                
                // Vampirlere UYARI gönder ve yeniden seçim yaptır
                foreach (var vamp in vampires)
                {
                    await Clients.Client(vamp.ConnectionId).SendAsync("VampireDisagreement", new
                    {
                        message = "⚠️ Vampirler farklı hedefler seçti! Aynı hedefi seçmelisiniz.",
                        selections = targetsList,
                        mustChooseAgain = true
                    });
                }
                
                Console.WriteLine($"🔄 Vampirler yeniden seçim yapacak...");
                return; // Doktor fazına GEÇ(ME)!
            }
            
            // Doktor var mı kontrol et
            var doctor = room.GetDoctor();
            var seer = room.Players.FirstOrDefault(p => p.Role == Role.Seer && p.IsAlive);
            
            if (doctor != null)
            {
                Console.WriteLine($"🏥 Doktor var - doktor fazına geçiliyor...");
                
                // Doktor fazına geç
                room.Phase = GamePhase.Night; // Hala gece, ama doktor sırası
                
                // Korunabilir oyuncular (doktor kendisi hariç)
                var protectablePlayersForDoctor = room.Players
                    .Where(p => p.IsAlive && p.Id != doctor.Id) // Kendisi hariç
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        isAlive = p.IsAlive,
                        isLastProtected = p.Id == doctor.LastProtected
                    })
                    .ToList();
                
                // ✅ DÜZELTME: GameTable için TÜM oyuncular gerekli (doktor dahil)
                var allPlayersForTable = room.Players
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        isAlive = p.IsAlive,
                        role = p.Role,
                        isLeader = p.IsLeader
                    })
                    .ToList();
                
                await Clients.Client(doctor.ConnectionId).SendAsync("DoctorPhaseStarted", new
                {
                    protectablePlayers = protectablePlayersForDoctor, // Koruma için
                    allPlayers = allPlayersForTable, // GameTable için
                    lastProtected = doctor.LastProtected
                });
                
                Console.WriteLine($"📡 DoctorPhaseStarted gönderildi doktora: {doctor.Name}");
                
                // Diğer oyunculara bekleme mesajı
                var otherPlayers = room.Players.Where(p => p.Id != doctor.Id).Select(p => p.ConnectionId);
                await Clients.Clients(otherPlayers.ToList()).SendAsync("WaitingForDoctor", new
                {
                    message = "Doktor koruma seçimi yapıyor..."
                });
            }
            else if (seer != null)
            {
                // Kahin canlı mı kontrol et
                if (!seer.IsAlive)
                {
                    Console.WriteLine($"💀 Kahin bu gece öldü, vizyon fazı atlanıyor!");
                    await ProcessNightEnd(room, roomCode);
                    return;
                }
                
                // Doktor yok ama Kahin var ve canlı - Kahin fazına geç
                Console.WriteLine($"🔮 Kahin var - kahin fazına geçiliyor...");
                
                var seerTargets = room.Players
                    .Where(p => p.IsAlive && p.Id != seer.Id)
                    .Select(p => new { id = p.Id, name = p.Name })
                    .ToList();
                
                await Clients.Client(seer.ConnectionId).SendAsync("SeerPhaseStarted", seerTargets);
                Console.WriteLine($"📡 SeerPhaseStarted gönderildi kahine: {seer.Name}");
                
                // Diğer oyunculara bekleme mesajı
                var otherPlayers = room.Players.Where(p => p.Id != seer.Id).Select(p => p.ConnectionId);
                await Clients.Clients(otherPlayers.ToList()).SendAsync("WaitingForSeer", new
                {
                    message = "Kahin vizyon görüyor..."
                });
            }
            else
            {
                Console.WriteLine($"❌ Doktor ve Kahin yok - direkt gündüz fazına geçiliyor...");
                
                // Doktor ve Kahin yoksa direkt gündüz fazına geç
                await ProcessNightEnd(room, roomCode);
            }
        }
        
        // Doktor koruma seçimi
        public async Task DoctorProtect(string roomCode, string targetNameOrId)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var doctor = room.GetDoctor();
            if (doctor == null) return;
            
            // Hedefi bul (name veya id ile)
            var target = room.Players.FirstOrDefault(p => p.Name == targetNameOrId || p.Id == targetNameOrId);
            if (target == null || !target.IsAlive)
            {
                Console.WriteLine($"❌ Hedef bulunamadı veya ölü: {targetNameOrId}");
                await Clients.Caller.SendAsync("Error", new { message = "Geçersiz hedef" });
                return;
            }
            
            Console.WriteLine($"✅ Hedef bulundu: {target.Name}");
            
            // Kendini koruyamaz
            if (target.Id == doctor.Id)
            {
                Console.WriteLine($"❌ Doktor kendini korumaya çalışıyor");
                await Clients.Caller.SendAsync("Error", new { message = "Kendini koruyamazsın!" });
                return;
            }
            
            // Aynı kişiyi üst üste koruyamaz
            if (doctor.LastProtected == target.Id)
            {
                Console.WriteLine($"❌ Doktor son koruduğu kişiyi tekrar korumaya çalışıyor: {target.Name}");
                await Clients.Caller.SendAsync("Error", new { message = "Aynı kişiyi üst üste koruyamazsın!" });
                return;
            }
            
            doctor.NightTarget = target.Id;
            room.DoctorProtection = target.Id;
            
            Console.WriteLine($"🏥 Doktor {doctor.Name} koruma seçti: {target.Name} (ID: {target.Id})");
            
            // Doktora onay gönder
            await Clients.Caller.SendAsync("DoctorProtectionConfirmed", new
            {
                message = $"Koruma seçiminiz kaydedildi. Bu gece {target.Name} korunacak.",
                targetName = target.Name
            });
            
            // MODE KONTROLÜ: Mode 1'de Seer var, Mode 2'de YOK (Location reveal zaten var)
            if (room.Mode == GameMode.Mode1)
            {
                // MODE 1: Kahin var mı kontrol et
                var seer = room.Players.FirstOrDefault(p => p.Role == Role.Seer && p.IsAlive);
                if (seer != null)
                {
                    // Kahin canlı mı kontrol et
                    if (!seer.IsAlive)
                    {
                        Console.WriteLine($"💀 Kahin bu gece öldü, vizyon fazı atlanıyor!");
                        await ProcessNightEnd(room, roomCode);
                        return;
                    }
                    
                    // Kahin varsa ve canlıysa onun fazına geç
                    Console.WriteLine($"🔮 MODE 1: Doktor seçim yaptı, şimdi Kahin sırası...");
                    
                    var seerTargets = room.Players
                        .Where(p => p.IsAlive && p.Id != seer.Id)
                        .Select(p => new { id = p.Id, name = p.Name })
                        .ToList();
                    
                    await Clients.Client(seer.ConnectionId).SendAsync("SeerPhaseStarted", seerTargets);
                    Console.WriteLine($"📡 SeerPhaseStarted gönderildi kahine: {seer.Name}");
                    
                    // Diğer oyunculara bekleme mesajı
                    var otherPlayers = room.Players.Where(p => p.Id != seer.Id).Select(p => p.ConnectionId);
                    await Clients.Clients(otherPlayers.ToList()).SendAsync("WaitingForSeer", new
                    {
                        message = "Kahin vizyon görüyor..."
                    });
                }
                else
                {
                    // Kahin yoksa gece sonuna geç
                    await ProcessNightEnd(room, roomCode);
                }
            }
            else
            {
                // MODE 2: Seer YOK, direkt gece sonuna geç (Location reveal zaten 30sn'de yapıldı)
                Console.WriteLine($"🌙 MODE 2: Seer yok, direkt gece sonuna geçiliyor...");
                await ProcessNightEnd(room, roomCode);
            }
        }

        // Kahin rol öğrenme
        public async Task SeerReveal(string roomCode, string targetId)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var seer = room.Players.FirstOrDefault(p => p.Role == Role.Seer && p.IsAlive);
            if (seer == null) return;
            
            var target = room.Players.FirstOrDefault(p => p.Id == targetId);
            if (target == null) return;
            
            Console.WriteLine($"🔮 Kahin {target.Name}'in rolünü öğrendi: {target.Role}");
            
            // Kahine rolü döndür
            await Clients.Caller.SendAsync("SeerRevealResult", new
            {
                playerName = target.Name,
                role = target.Role.ToString()
            });
            
            // Gece sonuna geç
            await ProcessNightEnd(room, roomCode);
        }

        // Gece fazı işlemlerini sırayla yap: Doktor koruma → Vampir saldırı → Avcı intikam
        // Bu metod FledglingAttack tarafından çağrılır
        private async Task ProcessNightPhase(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            Console.WriteLine($"🌙 ProcessNightPhase başladı - VampireTarget: {room.VampireTarget}, DoctorProtection: {room.DoctorProtection}");
            
            string? killedPlayerName = null;
            Player? targetToKill = null;
            string message = "Bu gece kimse ölmedi.";
            
            // Vampir hedefi var mı?
            if (room.VampireTarget != null)
            {
                targetToKill = room.Players.FirstOrDefault(p => p.Id == room.VampireTarget);
                
                // Doktor koruma kontrolü
                var doctor = room.GetDoctor();
                if (doctor != null && doctor.NightTarget == room.VampireTarget)
                {
                    Console.WriteLine($"🛡️ DOKTOR KORUDU! {targetToKill?.Name} hayatta kaldı!");
                    message = "Bu gece vampir saldırdı ama kimse ölmedi.";
                    targetToKill = null; // Kimse ölmedi
                }
                // Masum kontrolü
                else if (targetToKill?.Role == Role.Innocent)
                {
                    Console.WriteLine($"👤 MASUM HEDEF ALINDI! {targetToKill.Name} - Vampir saldırdı ama kimse ölmedi!");
                    message = "Bu gece vampir saldırdı ama kimse ölmedi."; // Masum koruması
                    targetToKill = null; // Masum öldürülemez
                }
                // Normal ölüm
                else if (targetToKill != null)
                {
                    targetToKill.IsAlive = false;
                    killedPlayerName = targetToKill.Name;
                    message = $"Bu gece vampirler saldırdı. {killedPlayerName} oyundan çıktı!";
                    Console.WriteLine($"💀 {killedPlayerName} öldü!");
                    
                    // AVCI KONTROLÜ
                    if (targetToKill.Role == Role.Hunter)
                    {
                        Console.WriteLine($"🎯 AVCI ÖLDÜ (GECE)! İntikam zamanı...");
                        targetToKill.IsHunterRevenge = true;
                        room.HunterTriggerContext = "Night";
                        
                        // ✅ DÜZELTME: Player.Id gönder (HunterRevenge metodu bunu bekliyor)!
                        var hunterTargets = room.GetAlivePlayers()
                            .Select(p => new { id = p.Id, name = p.Name })
                            .ToList();
                        
                        await Clients.Client(targetToKill.ConnectionId).SendAsync("HunterRevengePhase", new
                        {
                            hunterName = targetToKill.Name,
                            message = "Öldün ama bir kişiyi yanında götürebilirsin!",
                            targets = hunterTargets
                        });
                        
                        await Clients.GroupExcept(roomCode, targetToKill.ConnectionId)
                            .SendAsync("WaitingForHunter", new { hunterName = targetToKill.Name });
                        
                        return; // Avcı seçim yapana kadar bekle
                    }
                }
            }
            
            // Doktor'un son korumasını güncelle
            var doc = room.GetDoctor();
            if (doc != null && doc.NightTarget != null)
            {
                doc.LastProtected = doc.NightTarget;
                doc.NightTarget = null;
            }
            
            // Hedefleri sıfırla
            room.VampireTarget = null;
            room.DoctorProtection = null;
            
            // Gündüz fazına geç
            room.Phase = GamePhase.Day;
            
            Console.WriteLine($"☀️ Gündüz fazına geçildi - Message: {message}");
            
            // ÖNCE NightEnded eventi gönder (ölüm mesajı için)
            var nightResult = new
            {
                killedPlayer = killedPlayerName,
                message = message
            };
            
            Console.WriteLine($"📡 NightEnded gönderiliyor: {System.Text.Json.JsonSerializer.Serialize(nightResult)}");
            await Clients.Group(roomCode).SendAsync("NightEnded", nightResult);
            
            // Room datası güncelle
            var roomJson = new
            {
                roomCode = room.RoomCode,
                phase = room.Phase.ToString(),
                turn = room.Turn,
                players = room.Players.Select(p => new
                {
                    name = p.Name,
                    connectionId = p.ConnectionId,
                    isLeader = p.IsLeader,
                    isAlive = p.IsAlive,
                    role = p.Role.ToString()
                }).ToList()
            };
            
            await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
            
            // Lider bilgisi al
            var leader = room.Players.FirstOrDefault(p => p.IsLeader);
            Console.WriteLine($"👑 ProcessNightPhase - Lider: {leader?.Name} (Alive: {leader?.IsAlive})");
            
            // Ölen oyuncuları topla
            var killedPlayers = new List<object>();
            if (!string.IsNullOrEmpty(killedPlayerName))
            {
                var killedPlayer = room.Players.FirstOrDefault(p => p.Name == killedPlayerName);
                if (killedPlayer != null)
                {
                    killedPlayers.Add(new { name = killedPlayer.Name, role = killedPlayer.Role.ToString() });
                    Console.WriteLine($"💀 ProcessNightPhase - Ölen: {killedPlayer.Name} ({killedPlayer.Role})");
                }
            }
            
            Console.WriteLine($"📊 DayPhaseStarted (Fledgling) - KilledPlayers count: {killedPlayers.Count}");
            
            // SONRA DayPhaseStarted gönder
            await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
            {
                Turn = room.Turn,
                Phase = room.Phase.ToString(),
                LeaderId = leader?.Id,
                LeaderName = leader?.Name,
                KilledPlayers = killedPlayers, // ✅ EKLENDI - Ölen oyuncuların listesi
                AlivePlayers = room.Players.Where(p => p.IsAlive).Select(p => new
                {
                    Name = p.Name,
                    Id = p.Id,
                    IsAlive = p.IsAlive
                }).ToList()
            });
            
            // Lider "Oylama Başlat" butonuna basacak
            Console.WriteLine($"⏳ Lider oylama başlatacak...");
        }

        // Gece sonunu işle (Doktor seçimi bitince veya doktor yoksa)
        private async Task ProcessNightEnd(Room room, string roomCode)
        {
            string? killedPlayerName = null;
            string message;
            
            // Vampir hedefi var mı ve doktor korumadı mı?
            if (room.VampireTarget != null)
            {
                var doctor = room.GetDoctor();
                var targetToKill = room.Players.FirstOrDefault(p => p.Id == room.VampireTarget);
                
                if (doctor?.NightTarget == room.VampireTarget)
                {
                    // Doktor kurtardı! MESAJ: Vampir saldırdı ama kimse ölmedi (Doktor belirtme!)
                    Console.WriteLine($"🏥 Doktor vampir hedefini kurtardı!");
                    message = "Bu gece vampir saldırdı ama kimse ölmedi."; // Doktor'u belirtme!
                }
                else if (targetToKill != null && targetToKill.Role == Role.Innocent)
                {
                    // MASUM hedef alındı - Vampir saldırdı ama kimse ölmez!
                    Console.WriteLine($"👤 Vampirler Masum'u hedef aldı - Vampir saldırdı ama kimse ölmedi! (Hedef: {targetToKill.Name})");
                    message = "Bu gece vampir saldırdı ama kimse ölmedi."; // Masum koruması
                }
                else
                {
                    // Hedef öldü
                    if (targetToKill != null)
                    {
                        targetToKill.IsAlive = false;
                        killedPlayerName = targetToKill.Name;
                        
                        // AVCI kontrolü - Öldü mü?
                        if (targetToKill.Role == Role.Hunter)
                        {
                            Console.WriteLine($"🎯 Avcı öldü! İntikam zamanı...");
                            targetToKill.IsHunterRevenge = true;
                            room.HunterTriggerContext = "Night"; // Gece saldırısından tetiklendi
                            
                            // ✅ DÜZELTME: Player.Id gönder (HunterRevenge metodu bunu bekliyor)!
                            var hunterTargets = room.Players
                                .Where(p => p.IsAlive && p.ConnectionId != targetToKill.ConnectionId)
                                .Select(p => new { id = p.Id, name = p.Name })
                                .ToList();
                            
                            await Clients.Client(targetToKill.ConnectionId).SendAsync("HunterRevengePhase", new
                            {
                                hunterName = targetToKill.Name,
                                message = "Öldün ama bir kişiyi yanında götürebilirsin!",
                                targets = hunterTargets
                            });
                            
                            // Diğer oyunculara beklet
                            var others = room.Players.Where(p => p.Id != targetToKill.Id).Select(p => p.ConnectionId);
                            await Clients.Clients(others.ToList()).SendAsync("WaitingForHunter", new
                            {
                                message = "Avcı son seçimini yapıyor..."
                            });
                            
                            // BURADA BEKLEYECEĞİZ - Avcı seçim yapana kadar gündüz fazına geçmeyeceğiz
                            return;
                        }
                        
                        message = $"Bu gece vampirler saldırdı. {killedPlayerName} oyundan çıktı!";
                        Console.WriteLine($"💀 {killedPlayerName} öldü!");
                    }
                    else
                    {
                        message = "Bu gece kimse ölmedi.";
                    }
                }
            }
            else
            {
                // Vampirler anlaşamadı
                message = "Bu gece vampirler anlaşamadı. Kimse ölmedi.";
            }
            
            // Doktorun son korumasını güncelle
            var doc = room.GetDoctor();
            if (doc != null && doc.NightTarget != null)
            {
                doc.LastProtected = doc.NightTarget;
                doc.NightTarget = null;
            }
            
            // Gece hedeflerini sıfırla
            room.VampireTarget = null;
            room.DoctorProtection = null;
            
            // Gündüz fazına geç
            room.Phase = GamePhase.Day;
            
            // Event gönder: Gece sonuçları
            var nightResult = new
            {
                killedPlayer = killedPlayerName,
                message = message
            };
            
            Console.WriteLine($"📡 NightEnded gönderiliyor: {System.Text.Json.JsonSerializer.Serialize(nightResult)}");
            
            await Clients.Group(roomCode).SendAsync("NightEnded", nightResult);
            
            // Güncel room datası gönder
            var roomJson = new
            {
                roomCode = room.RoomCode,
                phase = room.Phase.ToString(),
                turn = room.Turn,
                players = room.Players.Select(p => new
                {
                    name = p.Name,
                    connectionId = p.ConnectionId,
                    isLeader = p.IsLeader,
                    isAlive = p.IsAlive,
                    role = p.Role.ToString()
                }).ToList()
            };
            
            Console.WriteLine($"📡 RoomUpdated gönderiliyor: {room.Players.Count} oyuncu");
            await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
            
            // GÜNDÜZ FAZI başlat - Tartışma için süresiz
            Console.WriteLine($"☀️ Gündüz fazı başlatılıyor...");
            
            // LİDER KONTROLÜ - Öldüğünde ARTIK YENİ LİDER ATANMAYACAK, ölen lider oylama başlatabilir
            // EnsureLeaderIsAlive(room); // KALDIRILDI - Lider ölse bile lider kalacak
            
            var leader = room.Players.FirstOrDefault(p => p.IsLeader);
            
            if (leader == null)
            {
                Console.WriteLine($"⚠️ ProcessNightEnd - Lider bulunamadı! Tüm oyuncular:");
                foreach (var p in room.Players)
                {
                    Console.WriteLine($"  - {p.Name}: IsLeader={p.IsLeader}, IsAlive={p.IsAlive}");
                }
            }
            else
            {
                Console.WriteLine($"👑 ProcessNightEnd - Lider: {leader.Name} (Alive: {leader.IsAlive})");
            }
            
            // ÖLÜ OYUNCULARI TOPLA (NightEnded'dan gelen)
            var killedPlayers = new List<object>();
            if (!string.IsNullOrEmpty(killedPlayerName))
            {
                var killedPlayer = room.Players.FirstOrDefault(p => p.Name == killedPlayerName);
                if (killedPlayer != null)
                {
                    killedPlayers.Add(new { name = killedPlayer.Name, role = killedPlayer.Role.ToString() });
                    Console.WriteLine($"💀 ProcessNightEnd - Ölen: {killedPlayer.Name} ({killedPlayer.Role})");
                }
                else
                {
                    Console.WriteLine($"⚠️ ProcessNightEnd - killedPlayerName var ({killedPlayerName}) ama Players'da bulunamadı!");
                }
            }
            else
            {
                Console.WriteLine($"✅ ProcessNightEnd - Kimse ölmedi (killedPlayerName boş)");
            }
            
            Console.WriteLine($"📊 DayPhaseStarted gönderilecek - KilledPlayers count: {killedPlayers.Count}");
            if (killedPlayers.Count > 0)
            {
                Console.WriteLine($"📊 KilledPlayers: {System.Text.Json.JsonSerializer.Serialize(killedPlayers)}");
            }
            
            await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
            {
                Turn = room.Turn,
                Phase = room.Phase.ToString(),
                LeaderId = leader?.Id,
                LeaderName = leader?.Name,
                KilledPlayers = killedPlayers, // Artık liste gönderiyoruz
                AlivePlayers = room.Players.Where(p => p.IsAlive).Select(p => new
                {
                    Name = p.Name,
                    Id = p.Id,
                    IsAlive = p.IsAlive
                }).ToList()
            });
            
            // Lider "Oylama Başlat" butonuna basacak
            Console.WriteLine($"⏳ Lider oylama başlatacak...");
        }

        // Lider ölmüşse yeni lider ata
        private void EnsureLeaderIsAlive(Room room)
        {
            var currentLeader = room.Players.FirstOrDefault(p => p.IsLeader);
            
            // Lider ölmüşse veya yoksa, yeni lider ata
            if (currentLeader == null || !currentLeader.IsAlive)
            {
                Console.WriteLine($"👑 Lider öldü veya bulunamadı! Yeni lider atanıyor...");
                
                // Mevcut liderliği kaldır
                if (currentLeader != null)
                {
                    currentLeader.IsLeader = false;
                    Console.WriteLine($"  ❌ Eski lider: {currentLeader.Name} (IsAlive: {currentLeader.IsAlive})");
                }
                
                // İlk canlı oyuncuyu lider yap
                var newLeader = room.Players.FirstOrDefault(p => p.IsAlive);
                if (newLeader != null)
                {
                    newLeader.IsLeader = true;
                    Console.WriteLine($"  ✅ Yeni lider: {newLeader.Name}");
                }
                else
                {
                    Console.WriteLine($"  ⚠️ UYARI: Canlı oyuncu kalmadı, lider atanamadı!");
                }
            }
            else
            {
                Console.WriteLine($"👑 Lider canlı: {currentLeader.Name}");
            }
        }

        // Avcı'nın intikam hedefini seç
        public async Task HunterRevenge(string roomCode, string targetId)
        {
            var room = _roomService.GetRoom(roomCode);
            Console.WriteLine($"🎯 HunterRevenge çağrıldı! RoomCode: {roomCode}, TargetId: {targetId}, Context: {room?.HunterTriggerContext}");
            if (room == null) 
            {
                Console.WriteLine("❌ Oda bulunamadı!");
                return;
            }

            var hunter = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            Console.WriteLine($"🎯 Hunter check: hunter={hunter?.Name}, role={hunter?.Role}, isHunterRevenge={hunter?.IsHunterRevenge}");
            
            if (hunter == null || hunter.Role != Role.Hunter || !hunter.IsHunterRevenge)
            {
                Console.WriteLine($"❌ Hunter validation failed: hunter null={hunter == null}, not hunter={hunter?.Role != Role.Hunter}, not revenge mode={!hunter?.IsHunterRevenge}");
                return;
            }

            var target = room.Players.FirstOrDefault(p => p.Id == targetId && p.IsAlive);
            Console.WriteLine($"🎯 Target check: target={target?.Name}, targetId={targetId}, alive={target?.IsAlive}");
            
            if (target == null)
            {
                Console.WriteLine($"❌ Hedef bulunamadı! targetId: {targetId}");
                Console.WriteLine($"🔍 Oyunculardaki Id'ler: {string.Join(", ", room.Players.Select(p => $"{p.Name}={p.Id}"))}");
                return;
            }

            // Hedefi öldür
            target.IsAlive = false;
            hunter.HunterTarget = target.Name;
            hunter.IsHunterRevenge = false;

            Console.WriteLine($"🎯 AVCI İNTİKAMI: {hunter.Name} → {target.Name} (Hedef Rol: {target.Role})");

            // İntikam sonucunu gönder
            var revengeResult = new
            {
                hunterName = hunter.Name,
                targetName = target.Name,
                message = $"{hunter.Name} son nefesinde {target.Name}'i de yanında götürdü!"
            };

            await Clients.Group(roomCode).SendAsync("HunterRevengeComplete", revengeResult);

            // USTA VAMPİR Avcı tarafından öldürüldüyse → Birini Yeni Yetme Vampir yap
            if (target.Role == Role.MasterVampire)
            {
                Console.WriteLine($"🧛🎯 USTA VAMPİR AVCI TARAFINDAN ÖLDÜRÜLDÜ: {target.Name} - Yeni yetme seçimi başlatılıyor!");
                Console.WriteLine($"🧛 Connection ID: {target.ConnectionId}");
                Console.WriteLine($"🧛 IsAlive: {target.IsAlive}");
                Console.WriteLine($"🧛 UYARI: Oyun CheckGameEnd'e GİTMEYECEK - Önce ısırma olacak!");
                
                // Usta Vampir'e canlı oyuncuları gönder (kendisi VE AVCI hariç!)
                // Çünkü Avcı da öldü, ölüleri ısıramaz
                var aliveForConversion = room.GetAlivePlayers()
                    .Where(p => p.Id != target.Id && p.Id != hunter.Id && p.IsAlive) // Hunter ve kendisi hariç, sadece canlılar
                    .Select(p => new { id = p.Id, name = p.Name })
                    .ToList();
                
                Console.WriteLine($"🧛 Canlı oyuncular: {string.Join(", ", room.GetAlivePlayers().Select(x => $"{x.Name}(IsAlive:{x.IsAlive})"))}");
                Console.WriteLine($"🧛 Hunter: {hunter.Name} (IsAlive: {hunter.IsAlive})");
                
                Console.WriteLine($"🧛 Isırılabilir oyuncu sayısı: {aliveForConversion.Count}");
                Console.WriteLine($"🧛 Usta Vampir ConnectionId: {target.ConnectionId}");
                Console.WriteLine($"🧛 Usta Vampir IsAlive (ÖLMÜŞ OLMALI - FALSE): {target.IsAlive}");
                
                if (string.IsNullOrEmpty(target.ConnectionId))
                {
                    Console.WriteLine("❌ HATA: Usta Vampir ConnectionId boş! Event gönderilemez!");
                    return;
                }
                
                // Usta Vampir'e seçim ekranı gönder
                try
                {
                    await Clients.Client(target.ConnectionId).SendAsync("MasterVampireBiteChoice", new 
                    { 
                        masterName = target.Name, // ✅ Master Vampire'in ismini ekle
                        message = "Avcı seni öldürdü! Ama son nefesinde birini ısırıp Yeni Yetme Vampir yapabilirsin.",
                        alivePlayers = aliveForConversion 
                    });
                    
                    Console.WriteLine($"✅ MasterVampireBiteChoice eventi gönderildi! ConnectionId: {target.ConnectionId}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ MasterVampireBiteChoice eventi gönderilemedi! Hata: {ex.Message}");
                    return;
                }
                
                // Diğer oyunculara bekleme mesajı
                await Clients.GroupExcept(roomCode, target.ConnectionId)
                    .SendAsync("WaitingForMasterVampireBite", new { 
                        message = $"{target.Name} öldü ve birini vampir yapıyor...",
                        masterName = target.Name 
                    });
                
                return; // Usta Vampir seçim yapana kadar bekle
            }

            Console.WriteLine($"🚨 MasterVampire DEĞİL veya zaten işlendi - Normal oyun akışına devam ediliyor");
            Console.WriteLine($"🚨 Hedef rol: {target.Role}, Hedef isim: {target.Name}");
            Console.WriteLine($"🚨 Context: {room.HunterTriggerContext}");

            // Oyun bitti mi kontrol et
            var gameResult = _gameService.CheckGameEnd(room);
            if (gameResult != GameResult.None)
            {
                Console.WriteLine($"🏆 Oyun bitti! Sonuç: {gameResult}");
                
                string winner = gameResult == GameResult.VampiresWin ? "VampireWin" : "PoliceWin";
                string message = gameResult == GameResult.VampiresWin ? 
                    "Vampirler kazandı!" : 
                    "Köylüler kazandı!";
                
                await Clients.Group(roomCode).SendAsync("GameEnded", new
                {
                    result = winner,
                    winner = winner,
                    message = message,
                    allRoles = room.Players.Select(p => new
                    {
                        Name = p.Name,
                        Role = p.Role.ToString(),
                        IsAlive = p.IsAlive
                    }).ToList()
                });
                
                // ✅ Oyun bitti - Odayı sıfırla (slot'u boşalt)
                _roomService.ResetRoom(roomCode);
                return;
            }

            // Context'e göre devam et
            if (room.HunterTriggerContext == "Voting")
            {
                // Oylamadan tetiklendiyse → Gündüz fazına geç
                Console.WriteLine($"☀️ Voting context - Gündüz fazı başlatılıyor...");
                
                room.Phase = GamePhase.Day;
                
                // LİDER KONTROLÜ - ÖLÜ LİDER KALIR
                // EnsureLeaderIsAlive(room); // KALDIRILDI - Lider ölse bile lider kalacak
                
                var leader = room.Players.FirstOrDefault(p => p.IsLeader);
                
                // ÖLÜ OYUNCULARI TOPLA (Hunter + Hunter'ın hedefi)
                var killedPlayers = new List<object>();
                if (hunter != null && !hunter.IsAlive)
                {
                    killedPlayers.Add(new { name = hunter.Name, role = hunter.Role.ToString() });
                    Console.WriteLine($"💀 Voting context - Ölen 1: {hunter.Name} (Hunter)");
                }
                if (target != null && !target.IsAlive)
                {
                    killedPlayers.Add(new { name = target.Name, role = target.Role.ToString() });
                    Console.WriteLine($"💀 Voting context - Ölen 2: {target.Name} (Hunter hedefi)");
                }
                
                await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
                {
                    Turn = room.Turn,
                    Phase = room.Phase.ToString(),
                    LeaderId = leader?.Id,
                    LeaderName = leader?.Name,
                    KilledPlayers = killedPlayers, // Artık liste gönderiyoruz
                    AlivePlayers = room.GetAlivePlayers().Select(p => new { p.Id, p.Name }).ToList()
                });
                
                // Lider "Oylama Başlat" butonuna basacak
                Console.WriteLine($"⏳ Lider ({leader?.Name}) oylama başlatacak...");
            }
            else
            {
                // Gece saldırısından tetiklendiyse → Gündüz fazına geç
                Console.WriteLine($"🌙 Night context - Gündüz fazına geçiliyor...");
                
                room.Phase = GamePhase.Day;
                
                // LİDER KONTROLÜ - ÖLÜ LİDER KALIR
                // EnsureLeaderIsAlive(room); // KALDIRILDI - Lider ölse bile lider kalacak
                
                var leader = room.Players.FirstOrDefault(p => p.IsLeader);
                
                // ÖLÜ OYUNCULARI TOPLA (Hunter + Hunter'ın hedefi)
                var killedPlayers = new List<object>();
                if (hunter != null && !hunter.IsAlive)
                {
                    killedPlayers.Add(new { name = hunter.Name, role = hunter.Role.ToString() });
                    Console.WriteLine($"💀 Night context - Ölen 1: {hunter.Name} (Hunter)");
                }
                if (target != null && !target.IsAlive)
                {
                    killedPlayers.Add(new { name = target.Name, role = target.Role.ToString() });
                    Console.WriteLine($"💀 Night context - Ölen 2: {target.Name} (Hunter hedefi)");
                }
                
                // Gündüz fazı başladı eventi gönder
                await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
                {
                    Turn = room.Turn,
                    Phase = room.Phase.ToString(),
                    LeaderId = leader?.Id,
                    LeaderName = leader?.Name,
                    KilledPlayers = killedPlayers, // Artık liste gönderiyoruz
                    AlivePlayers = room.GetAlivePlayers().Select(p => new { p.Id, p.Name }).ToList()
                });
                
                // Güncel room datası gönder
                var roomJson = new
                {
                    roomCode = room.RoomCode,
                    phase = room.Phase.ToString(),
                    turn = room.Turn,
                    players = room.Players.Select(p => new
                    {
                        name = p.Name,
                        connectionId = p.ConnectionId,
                        isLeader = p.IsLeader,
                        isAlive = p.IsAlive,
                        role = p.Role.ToString()
                    }).ToList()
                };

                await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
                
                // Lider "Oylama Başlat" butonuna basacak
                Console.WriteLine($"⏳ Lider ({leader?.Name}) oylama başlatacak...");
            }
        }
        
        // MasterVampire ısırma (öldüğünde birini Fledgling yapar)
        public async Task MasterVampireBite(string roomCode, string targetId)
        {
            Console.WriteLine($"🧛 MasterVampireBite çağrıldı! RoomCode: {roomCode}, TargetId: {targetId}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null) 
            {
                Console.WriteLine("❌ Oda bulunamadı!");
                return;
            }

            var masterVampire = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            Console.WriteLine($"🧛 MasterVampire check: mv={masterVampire?.Name}, role={masterVampire?.Role}, alive={masterVampire?.IsAlive}");
            
            // MasterVampire öldüğünde (IsAlive = false) ısırabilir
            if (masterVampire == null || masterVampire.Role != Role.MasterVampire || masterVampire.IsAlive)
            {
                Console.WriteLine($"❌ MasterVampire validation failed! mv={masterVampire != null}, isMV={masterVampire?.Role == Role.MasterVampire}, alive={masterVampire?.IsAlive} (should be false)");
                return;
            }

            var target = room.Players.FirstOrDefault(p => p.Id == targetId && p.IsAlive);
            Console.WriteLine($"🧛 Target check: target={target?.Name}, targetId={targetId}, alive={target?.IsAlive}");
            
            if (target == null)
            {
                Console.WriteLine($"❌ Hedef bulunamadı! targetId: {targetId}");
                return;
            }

            // Hedefin rolünü Fledgling'e çevir (ESKİ ROL ÖNEMSİZ!)
            var oldRole = target.Role;
            target.Role = Role.Fledgling;
            
            // VampirePlayerIds listesinde yoksa ekle
            if (!room.VampirePlayerIds.Contains(target.Id))
            {
                room.VampirePlayerIds.Add(target.Id); // Vampir takımına ekle
            }
            
            masterVampire.MasterVampireBiteTarget = target.Name;

            Console.WriteLine($"🧛 MASTER VAMPIRE ISIRIK: {masterVampire.Name} → {target.Name}");
            Console.WriteLine($"   📋 Eski rol: {oldRole} → Yeni rol: Fledgling");
            Console.WriteLine($"   🧛 Vampir takımı: {string.Join(", ", room.VampirePlayerIds)}");

            // HERKESE genel mesaj gönder (isim söylenmeden)
            await Clients.Group(roomCode).SendAsync("MasterVampireBiteComplete", new
            {
                message = "🧛 ARANIZDAN BİRİ ISILDI! Yeni Yetme Vampir oldu..."
            });
            
            // Hedef oyuncuya yeni rolünü ve güncel room data bildir
            await Clients.Client(target.ConnectionId).SendAsync("RoleChanged", new
            {
                newRole = "Fledgling",
                message = "Usta Vampir seni ısırdı! Artık Yeni Yetme Vampir'sin. Vampirlerle avlanabilirsin ama kartların mekanlarda gözükmez. Öldüğünde ısırma yapamazsın.",
                vampireTeam = room.VampirePlayerIds,
                roomData = new // Güncel oyun durumunu ekle
                {
                    RoomCode = room.RoomCode,
                    Phase = room.Phase.ToString(),
                    Turn = room.Turn,
                    Players = room.Players.Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.IsAlive,
                        IsVampire = room.VampirePlayerIds.Contains(p.Id)
                    }).ToList()
                }
            });

            // Oyun bitti mi kontrol et
            Console.WriteLine($"🎮 CheckGameEnd çağrılıyor - VampirePlayerIds: {string.Join(", ", room.VampirePlayerIds)}");
            Console.WriteLine($"🎮 Canlı oyuncular: {string.Join(", ", room.GetAlivePlayers().Select(p => $"{p.Name}({p.Role})"))}");
            
            var gameResult = _gameService.CheckGameEnd(room);
            
            Console.WriteLine($"🎮 CheckGameEnd sonucu: {gameResult}");
            
            if (gameResult != GameResult.None)
            {
                Console.WriteLine($"🏆 Oyun bitti! Sonuç: {gameResult}");
                
                room.Phase = GamePhase.Ended;
                string winner = gameResult == GameResult.VampiresWin ? "VampireWin" : "PoliceWin";
                string message = gameResult == GameResult.VampiresWin ? 
                    "Vampirler kazandı!" : 
                    "Köylüler kazandı!";
                
                await Clients.Group(roomCode).SendAsync("GameEnded", new
                {
                    result = winner,
                    winner = winner,
                    message = message,
                    allRoles = room.Players.Select(p => new
                    {
                        Name = p.Name,
                        Role = p.Role.ToString(),
                        IsAlive = p.IsAlive
                    }).ToList()
                });
                
                // ✅ Oyun bitti - Odayı sıfırla (slot'u boşalt)
                _roomService.ResetRoom(roomCode);
                return;
            }

            // Yeni tur başlat - Mode'a göre faz belirle
            room.Turn++;
            _gameService.ResetTurn(room); // Oylamaları ve hedefleri temizle
            
            Console.WriteLine($"🧛 MasterVampire ısırmasından sonra YENİ TURA geçiliyor - Turn: {room.Turn}");
            Console.WriteLine($"🧛 Yeni Fledgling: {target.Name} artık vampir takımında!");
            Console.WriteLine($"🧛 Vampir sayısı: {room.VampirePlayerIds.Count}");
            Console.WriteLine($"🧛 Mode: {room.Mode}");
            
            // MODE 2: Mekan seçimi başlat (yeni vampir oluşunca)
            if (room.Mode == GameMode.Mode2)
            {
                Console.WriteLine("📍 MODE 2: Yeni vampir oluştu, mekan seçimi başlatılıyor...");
                room.Phase = GamePhase.LocationSelection;
                room.PlayerLocations.Clear(); // Önceki seçimleri temizle
                
                var roomJson = new
                {
                    roomCode = room.RoomCode,
                    phase = room.Phase.ToString(),
                    turn = room.Turn,
                    players = room.Players.Select(p => new
                    {
                        name = p.Name,
                        connectionId = p.ConnectionId,
                        isLeader = p.IsLeader,
                        isAlive = p.IsAlive,
                        role = p.Role.ToString()
                    }).ToList()
                };
                
                Console.WriteLine($"📡 RoomUpdated gönderiliyor (MasterVampire sonrası - LocationSelection)");
                await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
                
                // Mekan seçimi eventi gönder - SADECE CANLI OYUNCULARA
                var aliveConnectionIds = room.GetAlivePlayers().Select(p => p.ConnectionId).ToList();
                Console.WriteLine($"📡 LocationSelectionStarted gönderiliyor - Canlı oyuncu sayısı: {aliveConnectionIds.Count}");
                
                await Clients.Clients(aliveConnectionIds).SendAsync("LocationSelectionStarted", new
                {
                    Turn = room.Turn,
                    Players = room.GetAlivePlayers().Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.IsLeader,
                        p.IsAlive
                    }).ToList()
                });
                Console.WriteLine("✅ LocationSelectionStarted eventi gönderildi (SADECE CANLI OYUNCULARA - MasterVampire sonrası)");
            }
            // MODE 1: Normal gece fazı başlat
            else
            {
                Console.WriteLine("🌙 MODE 1: Normal gece fazı başlatılıyor...");
                room.Phase = GamePhase.Night;
                
                var roomJson = new
                {
                    roomCode = room.RoomCode,
                    phase = room.Phase.ToString(),
                    turn = room.Turn,
                    players = room.Players.Select(p => new
                    {
                        name = p.Name,
                        connectionId = p.ConnectionId,
                        isLeader = p.IsLeader,
                        isAlive = p.IsAlive,
                        role = p.Role.ToString()
                    }).ToList()
                };
                
                Console.WriteLine($"📡 RoomUpdated gönderiliyor (MasterVampire sonrası - Night)");
                await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
                
                // Gece fazı başlat
                await Clients.Group(roomCode).SendAsync("NightPhaseStarted", room);
                Console.WriteLine($"✅ NightPhaseStarted eventi gönderildi");
            }
        }

        // Usta Vampir öldüğünde birini Yeni Yetme Vampir yap
        public async Task ConvertToApprentice(string roomCode, string selectedPlayerId)
        {
            Console.WriteLine($"🧛 ConvertToApprentice çağrıldı: {roomCode} -> {selectedPlayerId}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                Console.WriteLine("❌ Oda bulunamadı!");
                return;
            }
            
            // Çağıran Usta Vampir mi?
            var masterVampire = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (masterVampire == null || masterVampire.Role != Role.MasterVampire || masterVampire.IsAlive)
            {
                Console.WriteLine($"❌ Geçersiz çağrı! Master değil veya canlı.");
                return;
            }
            
            // Seçilen oyuncuyu bul
            var selectedPlayer = room.Players.FirstOrDefault(p => p.Id == selectedPlayerId && p.IsAlive);
            if (selectedPlayer == null)
            {
                Console.WriteLine($"❌ Seçilen oyuncu bulunamadı veya ölü!");
                return;
            }
            
            var oldRole = selectedPlayer.Role;
            
            // Rolü değiştir - ESKİ ROL KAYBOLUR
            selectedPlayer.Role = Role.Fledgling;
            
            // Vampir takımına ekle
            if (!room.VampirePlayerIds.Contains(selectedPlayer.Id))
            {
                room.VampirePlayerIds.Add(selectedPlayer.Id);
            }
            
            Console.WriteLine($"🧛 {selectedPlayer.Name} artık Yeni Yetme Vampir! (Eski rol: {oldRole})");
            
            // Seçilen oyuncuya bildir (KENDİSİ GÖRSÜN)
            await Clients.Client(selectedPlayer.ConnectionId).SendAsync("YouAreFledgling", new
            {
                Message = $"Usta Vampir seni ısırdı! Artık YENİ YETME VAMPİR (Fledgling)'sin!",
                OldRole = oldRole.ToString(),
                NewRole = "Fledgling",
                Warning = "DİKKAT: Yakalanırsan köylüler kazanır! Kartların mekanlarda gözükmez.",
                VampireTeam = room.VampirePlayerIds
            });
            
            // Tüm oyunculara genel bilgi (rol söylenmeden)
            await Clients.Group(roomCode).SendAsync("FledglingCreated", new
            {
                Message = $"Usta Vampir öldü ve birini ısırdı...",
                MasterVampireName = masterVampire.Name
            });
            
            // Oyun devam ediyor - normal akışa dön
            var result = _gameService.CheckGameEnd(room);
            
            if (result != GameResult.None)
            {
                room.Phase = GamePhase.Ended;
                
                string winner = result == GameResult.VampiresWin ? "VampireWin" : "PoliceWin";
                string message = result == GameResult.VampiresWin ? 
                    "Vampirler kazandı!" : 
                    "Köylüler kazandı!";
                
                var allRoles = room.Players.Select(p => new
                {
                    p.Name,
                    Role = p.Role.ToString(),
                    p.IsAlive
                }).ToList();
                
                await Clients.Group(roomCode).SendAsync("GameEnded", new
                {
                    result = winner,
                    winner = winner,
                    message = message,
                    allRoles = allRoles
                });
                
                // ✅ Oyun bitti - Odayı sıfırla (slot'u boşalt)
                _roomService.ResetRoom(roomCode);
            }
            else
            {
                // Yeni tura geç
                _gameService.ResetTurn(room);
                room.Phase = GamePhase.Night;
                room.Turn++;
                
                await Clients.Group(roomCode).SendAsync("VotingResult", new
                {
                    EliminatedPlayerName = masterVampire.Name,
                    EliminatedRole = "MasterVampire",
                    Message = $"{masterVampire.Name} elendi ve bir oyuncuyu Vampir yaptı!"
                });
                
                await Clients.Group(roomCode).SendAsync("NewRoundStarted", new
                {
                    Turn = room.Turn
                });
            }
        }

        // Yeni tura geç (Lider için)
        public async Task StartNextRound(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader) return;
            
            // Tur sayısını artır
            room.Turn++;
            room.Phase = GamePhase.Night;
            
            Console.WriteLine($"🔄 Yeni tur başlıyor: {room.Turn}");
            
            var roomJson = new
            {
                RoomCode = room.RoomCode,
                Phase = room.Phase.ToString(),
                Turn = room.Turn,
                Players = room.Players.Select(p => new
                {
                    Name = p.Name,
                    ConnectionId = p.ConnectionId,
                    IsLeader = p.IsLeader,
                    IsAlive = p.IsAlive,
                    Role = p.Role.ToString()
                }).ToList()
            };
            
            await Clients.Group(roomCode).SendAsync("NightPhaseStarted", roomJson);
        }

        // Doktor koruma seçimi
        public async Task DoctorSelectProtection(string roomCode, string targetNameOrId)
        {
            Console.WriteLine($"🏥 DoctorSelectProtection çağrıldı: roomCode={roomCode}, targetNameOrId={targetNameOrId}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                Console.WriteLine($"❌ Oda bulunamadı: {roomCode}");
                return;
            }
            
            Console.WriteLine($"✅ Oda bulundu: {roomCode}, Oyuncu sayısı: {room.Players.Count}");
            
            var doctor = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (doctor == null)
            {
                Console.WriteLine($"❌ Doktor bulunamadı, ConnectionId: {Context.ConnectionId}");
                return;
            }
            
            if (doctor.Role != Role.Doctor)
            {
                Console.WriteLine($"❌ Oyuncu doktor değil: {doctor.Name}, Rol: {doctor.Role}");
                return;
            }
            
            if (!doctor.IsAlive)
            {
                Console.WriteLine($"❌ Doktor ölü: {doctor.Name}");
                await Clients.Caller.SendAsync("Error", new { message = "Öldünüz, koruma yapamazsınız!" });
                return;
            }
            
            Console.WriteLine($"✅ Doktor bulundu: {doctor.Name}");
            
            // Hedefi bul (name veya id ile)
            var target = room.Players.FirstOrDefault(p => p.Name == targetNameOrId || p.Id == targetNameOrId);
            if (target == null || !target.IsAlive)
            {
                Console.WriteLine($"❌ Hedef bulunamadı veya ölü: {targetNameOrId}");
                await Clients.Caller.SendAsync("Error", new { message = "Geçersiz hedef" });
                return;
            }
            
            Console.WriteLine($"✅ Hedef bulundu: {target.Name}");
            
            // Kendini koruyamaz
            if (target.Id == doctor.Id)
            {
                Console.WriteLine($"❌ Doktor kendini korumaya çalışıyor");
                await Clients.Caller.SendAsync("Error", new { message = "Kendini koruyamazsın!" });
                return;
            }
            
            // Aynı kişiyi üst üste koruyamaz
            if (doctor.LastProtected == target.Id)
            {
                Console.WriteLine($"❌ Doktor son koruduğu kişiyi tekrar korumaya çalışıyor: {target.Name}");
                await Clients.Caller.SendAsync("Error", new { message = "Aynı kişiyi üst üste koruyamazsın!" });
                return;
            }
            
            doctor.NightTarget = target.Id;
            
            Console.WriteLine($"🏥 Doktor {doctor.Name} koruma seçti: {target.Name} (ID: {target.Id})");
            
            // Doktora onay gönder
            await Clients.Caller.SendAsync("DoctorProtectionConfirmed", new
            {
                message = $"Koruma seçiminiz kaydedildi. Bu gece {target.Name} korunacak.",
                targetName = target.Name
            });
            
            // Diğer oyunculara da bildir (doktor korumayı seçti)
            await Clients.GroupExcept(roomCode, Context.ConnectionId).SendAsync("DoctorProtectionConfirmed", new
            {
                message = "Doktor koruma seçimini yaptı.",
                targetName = target.Name
            });
            
            Console.WriteLine($"📡 Tüm oyunculara DoctorProtectionConfirmed gönderildi");
            
            // Geceyi bitir
            await ProcessNightEnd(room, roomCode);
        }

        // Gece fazını bitir (Lider onayı)
        public async Task EndNightPhase(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader) return;
            
            // Gece aksiyonlarını işle
            var killedPlayerName = _gameService.ProcessNightActions(room);
            
            // Doktor'un son koruduğu kişiyi güncelle
            var doctor = room.GetDoctor();
            if (doctor != null && doctor.NightTarget != null)
            {
                doctor.LastProtected = doctor.NightTarget;
            }
            
            room.Phase = GamePhase.Day;
            
            await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
            {
                KilledPlayerName = killedPlayerName,
                AlivePlayers = room.GetAlivePlayers().Select(p => new { p.Id, p.Name }).ToList()
            });
        }

        // Oylama fazını başlat
        public async Task StartVoting(string roomCode, bool isSystemCall = false)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) 
            {
                Console.WriteLine($"❌ StartVoting: Oda bulunamadı! RoomCode: {roomCode}");
                return;
            }
            
            // Sistem çağrısı değilse lider kontrolü yap
            if (!isSystemCall)
            {
                var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (caller == null || !caller.IsLeader) 
                {
                    Console.WriteLine($"❌ StartVoting: Lider değil veya oyuncu bulunamadı!");
                    return;
                }
            }
            else
            {
                Console.WriteLine($"🤖 StartVoting: Sistem çağrısı (lider kontrolü atlandı)");
            }
            
            // Gündüz fazında değilse engelle
            if (room.Phase != GamePhase.Day)
            {
                Console.WriteLine($"⚠️ Oylama başlatılamaz! Mevcut faz: {room.Phase}");
                return;
            }
            
            room.Phase = GamePhase.Voting;
            
            var alivePlayers = room.GetAlivePlayers().Select(p => new { 
                p.Id, 
                p.Name, 
                p.IsAlive 
            }).ToList();
            
            Console.WriteLine($"🗳️ VotingStarted - Hayatta olan oyuncular:");
            foreach (var p in alivePlayers)
            {
                Console.WriteLine($"  👤 Id={p.Id}, Name={p.Name}, IsAlive={p.IsAlive}");
            }
            
            await Clients.Group(roomCode).SendAsync("VotingStarted", alivePlayers);
        }

        // Oy ver (Name veya Id kabul eder)
        public async Task Vote(string roomCode, string targetPlayerNameOrId)
        {
            Console.WriteLine($"🗳️ Vote çağrıldı: roomCode={roomCode}, target={targetPlayerNameOrId}");
            
            var room = _roomService.GetRoom(roomCode);
            if (room == null)
            {
                Console.WriteLine($"❌ Oda bulunamadı: {roomCode}");
                return;
            }
            
            var voter = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (voter == null)
            {
                Console.WriteLine($"❌ Oy veren bulunamadı, ConnectionId: {Context.ConnectionId}");
                return;
            }
            
            if (!voter.IsAlive)
            {
                Console.WriteLine($"❌ {voter.Name} ölü, oy veremez!");
                await Clients.Caller.SendAsync("Error", "Ölüsünüz, oy veremezsiniz!");
                return;
            }
            
            // Zaten oy kullandı mı kontrol et
            if (voter.HasVoted)
            {
                Console.WriteLine($"⚠️ {voter.Name} zaten oy kullandı!");
                await Clients.Caller.SendAsync("Error", "Zaten oy kullandın!");
                return;
            }
            
            // Name veya Id ile hedefi bul
            var target = room.Players.FirstOrDefault(p => 
                p.Name == targetPlayerNameOrId || p.Id == targetPlayerNameOrId);
            
            if (target == null || !target.IsAlive) return;
            
            Console.WriteLine($"🗳️ {voter.Name} ({voter.Role}) → {target.Name}'e oy verdi");
            
            voter.VoteTarget = target.Id;
            voter.HasVoted = true;
            
            await Clients.Caller.SendAsync("VoteConfirmed");
            
            // Tüm oyuncular oy verdi mi? (SADECE Kahin oy kullanamaz - Fledgling ve diğer herkes oy verebilir)
            var eligibleVoters = room.GetAlivePlayers().Where(p => p.Role != Role.Seer).ToList();
            var allVoted = eligibleVoters.All(p => p.HasVoted);
            
            Console.WriteLine($"📊 Oy durumu: {eligibleVoters.Count(p => p.HasVoted)}/{eligibleVoters.Count} (Kahin hariç)");
            foreach (var ev in eligibleVoters)
            {
                Console.WriteLine($"  👤 {ev.Name} ({ev.Role}): {(ev.HasVoted ? "✅ Oy verdi" : "❌ Henüz oy vermedi")}");
            }
            
            if (allVoted)
            {
                Console.WriteLine($"✅ Tüm oyuncular oy verdi! ProcessVoting çağrılıyor...");
                
                var eliminatedPlayer = _gameService.ProcessVoting(room);
                
                Console.WriteLine($"📊 ProcessVoting sonucu: {(eliminatedPlayer != null ? eliminatedPlayer.Name : "BERABERLİK")}");
                Console.WriteLine($"📊 Eliminated Player Role: {eliminatedPlayer?.Role}");
                Console.WriteLine($"📊 Is MasterVampire? {eliminatedPlayer?.Role == Role.MasterVampire}");
                
                // MODE 2: USTA VAMPİR öldüyse → Birini Yeni Yetme Vampir yap
                if (eliminatedPlayer != null && eliminatedPlayer.Role == Role.MasterVampire)
                {
                    Console.WriteLine($"🧛 USTA VAMPİR ÖLDÜ: {eliminatedPlayer.Name} - Yeni yetme seçimi başlatılıyor!");
                    Console.WriteLine($"🧛 Connection ID: {eliminatedPlayer.ConnectionId}");
                    Console.WriteLine($"🧛 IsAlive: {eliminatedPlayer.IsAlive}");
                    
                    // Usta Vampir'e canlı oyuncuları gönder (kendisi hariç)
                    var aliveForConversion = room.GetAlivePlayers()
                        .Where(p => p.Id != eliminatedPlayer.Id)
                        .Select(p => new { id = p.Id, name = p.Name })
                        .ToList();
                    
                    Console.WriteLine($"🧛 Isırılabilir oyuncu sayısı: {aliveForConversion.Count}");
                    
                    // Usta Vampir'e seçim ekranı gönder
                    await Clients.Client(eliminatedPlayer.ConnectionId).SendAsync("MasterVampireBiteChoice", new 
                    { 
                        masterName = eliminatedPlayer.Name, // ✅ Master Vampire'in ismini ekle
                        message = "Öldün! Birini ısırıp Yeni Yetme Vampir yapabilirsin.",
                        alivePlayers = aliveForConversion 
                    });
                    
                    Console.WriteLine($"✅ MasterVampireBiteChoice eventi gönderildi!");
                    
                    // Diğer oyunculara bekleme mesajı
                    await Clients.GroupExcept(roomCode, eliminatedPlayer.ConnectionId)
                        .SendAsync("WaitingForMasterVampireBite", new { 
                            message = $"{eliminatedPlayer.Name} öldü ve birini vampir yapıyor...",
                            masterName = eliminatedPlayer.Name 
                        });
                    
                    return; // Usta Vampir seçim yapana kadar bekle
                }
                
                // Yeni Yetme Vampir (Fledgling) öldüyse KÖYLÜLER ANINDA KAZANIR (GameService'de kontrol ediliyor)
                if (room.Result == GameResult.PoliceWin && eliminatedPlayer?.Role == Role.Fledgling)
                {
                    room.Phase = GamePhase.Ended;
                    
                    var allRoles = room.Players.Select(p => new
                    {
                        p.Name,
                        Role = p.Role.ToString(),
                        p.IsAlive
                    }).ToList();
                    
                    await Clients.Group(roomCode).SendAsync("GameEnded", new
                    {
                        result = "PoliceWin",
                        winner = "PoliceWin",
                        message = "YENİ YETME VAMPİR YAKALANDI! KÖYLÜLER KAZANDI!",
                        reason = "FledglingCaught",
                        allRoles = allRoles
                    });
                    
                    // ✅ Oyun bitti - Odayı sıfırla (slot'u boşalt)
                    _roomService.ResetRoom(roomCode);
                    return;
                }
                
                // Avcı öldüyse intikam fazı
                if (eliminatedPlayer != null && eliminatedPlayer.Role == Role.Hunter)
                {
                    Console.WriteLine($"🎯 AVCI ÖLDÜ (OY): {eliminatedPlayer.Name} intikam alacak!");
                    
                    eliminatedPlayer.IsHunterRevenge = true;
                    room.HunterTriggerContext = "Voting"; // Oylamadan tetiklendi
                    
                    // Avcı'ya hedef listesi gönder - ✅ Player.Id kullan (HunterRevenge metodu bunu bekliyor)!
                    var targets = room.GetAlivePlayers()
                        .Select(p => new { id = p.Id, name = p.Name })
                        .ToList();
                    
                    await Clients.Client(eliminatedPlayer.ConnectionId).SendAsync("HunterRevengePhase", new 
                    { 
                        hunterName = eliminatedPlayer.Name,
                        targets = targets 
                    });
                    
                    // Diğer oyunculara bekleme mesajı
                    await Clients.GroupExcept(roomCode, eliminatedPlayer.ConnectionId)
                        .SendAsync("WaitingForHunter", new { hunterName = eliminatedPlayer.Name });
                    
                    return; // Avcı seçim yapana kadar bekle
                }
                
                var result = _gameService.CheckGameEnd(room);
                
                if (result != GameResult.None)
                {
                    room.Phase = GamePhase.Ended;
                    
                    string winner = result == GameResult.VampiresWin ? "VampireWin" : "PoliceWin";
                    string message = result == GameResult.VampiresWin ? 
                        "Vampirler kazandı!" : 
                        "Köylüler kazandı!";
                    
                    // Tüm rolleri açıkla
                    var allRoles = room.Players.Select(p => new
                    {
                        p.Name,
                        Role = p.Role.ToString(),
                        p.IsAlive
                    }).ToList();
                    
                    await Clients.Group(roomCode).SendAsync("GameEnded", new
                    {
                        result = winner,
                        winner = winner,
                        message = message,
                        allRoles = allRoles
                    });
                    
                    // ✅ Oyun bitti - Odayı sıfırla (slot'u boşalt)
                    _roomService.ResetRoom(roomCode);
                }
                else
                {
                    // Yeni tura geç
                    _gameService.ResetTurn(room);
                    room.Turn++;
                    
                    // Oy dağılımını hesapla (frontend'e göndermek için)
                    var voteDistribution = new Dictionary<string, int>();
                    foreach (var player in room.GetAlivePlayers())
                    {
                        if (player.VoteTarget != null)
                        {
                            if (!voteDistribution.ContainsKey(player.VoteTarget))
                                voteDistribution[player.VoteTarget] = 0;
                            
                            int voteWeight = player.Role == Role.SilentWitness ? 2 : 1;
                            voteDistribution[player.VoteTarget] += voteWeight;
                        }
                    }
                    
                    await Clients.Group(roomCode).SendAsync("VotingResult", new
                    {
                        EliminatedPlayerName = eliminatedPlayer?.Name,
                        EliminatedPlayerRole = eliminatedPlayer?.Role.ToString(),
                        IsTie = eliminatedPlayer == null, // Beraberlik durumu
                        NextTurn = room.Turn,
                        GameMode = room.Mode.ToString(), // Frontend'e mode bilgisini gönder
                        VoteDistribution = voteDistribution.Select(kvp => new {
                            PlayerId = kvp.Key,
                            PlayerName = room.Players.FirstOrDefault(p => p.Id == kvp.Key)?.Name,
                            Votes = kvp.Value
                        }).ToList()
                    });
                    
                    // Mode kontrolü - Phase'i ayarla ama eventi bekle
                    if (room.Mode == GameMode.Mode2)
                    {
                        Console.WriteLine($"🏠 Mode 2: LocationSelection fazına geçiş için hazırlanıyor (PhaseTransition sonrası)");
                        room.Phase = GamePhase.LocationSelection;
                        // LocationSelectionStarted'ı FRONTEND PhaseTransition bitince ContinueToLocationSelection ile çağıracak
                    }
                    else
                    {
                        Console.WriteLine($"🌙 Mode 1: Night fazına geçiş için hazırlanıyor (PhaseTransition sonrası)");
                        room.Phase = GamePhase.Night;
                        // NightPhaseStarted'ı frontend countdown sonrası ContinueToNight ile çağıracak
                    }
                }
            }
        }
        
        // Frontend countdown bitince çağırır (Mode 1 için)
        public async Task ContinueToNight(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null || room.Phase != GamePhase.Night) return;
            
            Console.WriteLine($"🌙 Gece fazına devam ediliyor - Turn: {room.Turn}");
            
            await Clients.Group(roomCode).SendAsync("NightPhaseStarted", room);
        }
        
        // Frontend PhaseTransition bitince çağırır (Mode 2 için)
        public async Task ContinueToLocationSelection(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null || room.Phase != GamePhase.LocationSelection)
            {
                Console.WriteLine($"⚠️ ContinueToLocationSelection çağrıldı ama Phase uygun değil: {room?.Phase}");
                return;
            }
            
            Console.WriteLine($"🏠 LocationSelection fazına devam ediliyor - Turn: {room.Turn}");
            
            // Sadece CANLI oyunculara LocationSelectionStarted gönder
            var aliveConnectionIds = room.GetAlivePlayers().Select(p => p.ConnectionId).ToList();
            Console.WriteLine($"📡 LocationSelectionStarted gönderiliyor - Canlı oyuncu sayısı: {aliveConnectionIds.Count}");
            
            await Clients.Clients(aliveConnectionIds).SendAsync("LocationSelectionStarted", new
            {
                Turn = room.Turn,
                Players = room.GetAlivePlayers().Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.IsLeader,
                    p.IsAlive
                }).ToList()
            });
            Console.WriteLine("✅ LocationSelectionStarted eventi gönderildi (PhaseTransition sonrası)");
        }

        // Bağlantı kesildiğinde
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"⚠️ Bağlantı koptu: {Context.ConnectionId}");
            
            // 3 saniye bekle - belki reconnect olacak
            await Task.Delay(3000);
            
            var room = _roomService.RemovePlayer(Context.ConnectionId);
            
            if (room != null)
            {
                Console.WriteLine($"👋 Oyuncu odadan çıktı (disconnect): {room.RoomCode}");
                Console.WriteLine($"📊 Kalan oyuncu sayısı: {room.Players.Count}");
                
                // 2 vampir koptu mu kontrol et
                var vampires = room.GetVampires();
                if (room.VampirePlayerIds.Count >= 2 && vampires.Count == 0)
                {
                    room.Phase = GamePhase.Ended;
                    room.Result = GameResult.PoliceWin;
                    
                    await Clients.Group(room.RoomCode).SendAsync("VampiresDisconnected");
                }
                else
                {
                    // ✅ LeaveRoom ile aynı format - Players listesini dictionary olarak gönder
                    var playersList = new List<object>();
                    foreach (var p in room.Players)
                    {
                        playersList.Add(new Dictionary<string, object>
                        {
                            { "Name", p.Name },
                            { "ConnectionId", p.ConnectionId },
                            { "IsLeader", p.IsLeader },
                            { "IsAlive", p.IsAlive },
                            { "Role", p.Role.ToString() }
                        });
                    }
                    
                    var roomData = new Dictionary<string, object>
                    {
                        { "RoomCode", room.RoomCode },
                        { "Phase", room.Phase.ToString() },
                        { "Players", playersList }
                    };
                    
                    Console.WriteLine($"📡 PlayerLeft eventi gönderiliyor: {room.Players.Count} oyuncu");
                    await Clients.Group(room.RoomCode).SendAsync("PlayerLeft", roomData);
                }
                
                // Oda listesini güncelle
                await Clients.All.SendAsync("RoomListUpdated");
                Console.WriteLine($"📢 RoomListUpdated broadcast yapıldı (oyuncu çıktı)!");
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
}