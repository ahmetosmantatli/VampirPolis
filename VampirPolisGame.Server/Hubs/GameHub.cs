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
            
            // Rolleri dağıt (seçilen rollerle)
            _gameService.AssignSelectedRoles(room, selectedRoles);
            room.Phase = GamePhase.Waiting;
            room.Turn = 1;
            
            // Her oyuncuya kendi rolünü gönder
            foreach (var player in room.Players)
            {
                var roleData = new
                {
                    Role = player.Role.ToString(),
                    VampireTeam = player.Role == Role.Vampire ? room.VampirePlayerIds : new List<string>()
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
                var roleData = new
                {
                    Role = player.Role.ToString(),
                    VampireTeam = player.Role == Role.Vampire ? room.VampirePlayerIds : new List<string>()
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
        
        // Gece fazını başlat (sadece lider)
        public async Task StartNightPhase(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader)
            {
                Console.WriteLine($"❌ StartNightPhase: Lider değil!");
                return;
            }
            
            // Zaten gece fazındaysa veya başka faz aktifse engelle
            if (room.Phase != GamePhase.Waiting && room.Phase != GamePhase.Day)
            {
                Console.WriteLine($"⚠️ Gece fazı başlatılamaz! Mevcut faz: {room.Phase}");
                return;
            }
            
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

        // Vampir hedef seçimi (Koordinasyon: Tüm vampirler aynı hedefi seçmeli)
        public async Task VampireAttack(string roomCode, string targetName)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var vampire = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (vampire == null || vampire.Role != Role.Vampire || !vampire.IsAlive)
            {
                Console.WriteLine($"❌ Vampir bulunamadı, rol eşleşmedi veya ölü");
                return;
            }
            
            var target = room.Players.FirstOrDefault(p => p.Name == targetName);
            if (target == null || !target.IsAlive) return;
            
            // Bu vampirin seçimini kaydet
            vampire.NightTarget = target.Id;
            
            Console.WriteLine($"🎯 Vampir {vampire.Name} hedef seçti: {targetName} (ID: {target.Id})");
            
            // Tüm vampirler seçim yaptı mı?
            var vampires = room.GetVampires();
            var allVampiresChose = vampires.All(v => v.NightTarget != null);
            
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
            }
            else
            {
                Console.WriteLine($"❌ Vampirler farklı hedefler seçti - kimse ölmeyecek!");
                var targets = vampires.Select(v => 
                {
                    var p = room.Players.FirstOrDefault(x => x.Id == v.NightTarget);
                    return p?.Name ?? "?";
                });
                Console.WriteLine($"   Hedefler: {string.Join(", ", targets)}");
                room.VampireTarget = null; // Farklı hedefler = kimse ölmez
            }
            
            // Gece seçimlerini sıfırla
            foreach (var v in vampires)
            {
                v.NightTarget = null;
            }
            
            // Doktor var mı kontrol et
            var doctor = room.GetDoctor();
            var seer = room.Players.FirstOrDefault(p => p.Role == Role.Seer && p.IsAlive);
            
            if (doctor != null)
            {
                Console.WriteLine($"🏥 Doktor var - doktor fazına geçiliyor...");
                
                // Doktor fazına geç
                room.Phase = GamePhase.Night; // Hala gece, ama doktor sırası
                
                // Doktora koruma seçimi için event gönder
                var protectablePlayersForDoctor = room.Players
                    .Where(p => p.IsAlive && p.Id != doctor.Id) // Kendisi hariç
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        isLastProtected = p.Id == doctor.LastProtected
                    })
                    .ToList();
                
                await Clients.Client(doctor.ConnectionId).SendAsync("DoctorPhaseStarted", new
                {
                    players = protectablePlayersForDoctor,
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
            
            // Kahin var mı kontrol et
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
                Console.WriteLine($"🔮 Doktor seçim yaptı, şimdi Kahin sırası...");
                
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
                    // Doktor kurtardı!
                    Console.WriteLine($"🏥 Doktor vampir hedefini kurtardı!");
                    message = "Bu gece vampir saldırdı ama Doktor kurtardı!";
                }
                else if (targetToKill != null && targetToKill.Role == Role.Innocent)
                {
                    // MASUM hedef alındı - Kimse ölmez!
                    Console.WriteLine($"👤 Vampirler Masum'u hedef aldı - Kimse ölmedi! (Hedef: {targetToKill.Name})");
                    message = "Bu gece kimse ölmedi.";
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
                            
                            // Avcıya hedef seçme ekranı gönder
                            var hunterTargets = room.Players
                                .Where(p => p.IsAlive && p.Id != targetToKill.Id)
                                .Select(p => new { id = p.Id, name = p.Name })
                                .ToList();
                            
                            await Clients.Client(targetToKill.ConnectionId).SendAsync("HunterRevengePhase", new
                            {
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
        }

        // Avcı'nın intikam hedefini seç
        public async Task HunterRevenge(string roomCode, string targetId)
        {
            Console.WriteLine($"🎯 HunterRevenge çağrıldı! RoomCode: {roomCode}, TargetId: {targetId}");
            
            var room = _roomService.GetRoom(roomCode);
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

            Console.WriteLine($"🎯 AVCI İNTİKAMI: {hunter.Name} → {target.Name}");

            // İntikam sonucunu gönder
            var revengeResult = new
            {
                hunterName = hunter.Name,
                targetName = target.Name,
                message = $"{hunter.Name} son nefesinde {target.Name}'i de yanında götürdü!"
            };

            await Clients.Group(roomCode).SendAsync("HunterRevengeComplete", revengeResult);

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
                return;
            }

            // Gündüz fazına geç
            room.Phase = GamePhase.Day;

            Console.WriteLine($"🌞 Gündüz fazına geçiliyor. Canlı oyuncular: {room.Players.Count(p => p.IsAlive)}");

            // Gündüz fazı başladı eventi gönder
            await Clients.Group(roomCode).SendAsync("DayPhaseStarted", new
            {
                KilledPlayerName = (string?)null, // Zaten HunterRevengeComplete'te bildirildi
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

            Console.WriteLine($"📡 RoomUpdated gönderiliyor (Hunter intikam sonrası)");
            await Clients.Group(roomCode).SendAsync("RoomUpdated", roomJson);
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

        // Oylama fazını başlat (Lider onayı)
        public async Task StartVoting(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null) return;
            
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (caller == null || !caller.IsLeader) return;
            
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
            
            // Tüm oyuncular oy verdi mi? (Kahin hariç - Kahin oy kullanamaz)
            var eligibleVoters = room.GetAlivePlayers().Where(p => p.Role != Role.Seer).ToList();
            var allVoted = eligibleVoters.All(p => p.HasVoted);
            
            Console.WriteLine($"📊 Oy durumu: {eligibleVoters.Count(p => p.HasVoted)}/{eligibleVoters.Count} (Kahin hariç)");
            
            if (allVoted)
            {
                Console.WriteLine($"✅ Tüm oyuncular oy verdi! ProcessVoting çağrılıyor...");
                
                var eliminatedPlayer = _gameService.ProcessVoting(room);
                
                Console.WriteLine($"📊 ProcessVoting sonucu: {(eliminatedPlayer != null ? eliminatedPlayer.Name : "BERABERLİK")}");
                
                // Avcı öldüyse intikam fazı
                if (eliminatedPlayer != null && eliminatedPlayer.Role == Role.Hunter)
                {
                    Console.WriteLine($"🎯 AVCI ÖLDÜ (OY): {eliminatedPlayer.Name} intikam alacak!");
                    
                    eliminatedPlayer.IsHunterRevenge = true;
                    
                    // Avcı'ya hedef listesi gönder
                    var targets = room.GetAlivePlayers()
                        .Select(p => new { id = p.ConnectionId, name = p.Name })
                        .ToList();
                    
                    await Clients.Client(eliminatedPlayer.ConnectionId).SendAsync("HunterRevengePhase", new { targets });
                    
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
                }
                else
                {
                    // Yeni tura geç
                    _gameService.ResetTurn(room);
                    room.Phase = GamePhase.Night;
                    room.Turn++;
                    
                    await Clients.Group(roomCode).SendAsync("VotingResult", new
                    {
                        EliminatedPlayerName = eliminatedPlayer?.Name,
                        EliminatedPlayerRole = eliminatedPlayer?.Role.ToString(),
                        IsTie = eliminatedPlayer == null, // Beraberlik durumu
                        NextTurn = room.Turn
                    });
                    
                    // NightPhaseStarted'ı frontend countdown sonrası çağırsın
                    // await Clients.Group(roomCode).SendAsync("NightPhaseStarted", room);
                }
            }
        }
        
        // Frontend countdown bitince çağırır
        public async Task ContinueToNight(string roomCode)
        {
            var room = _roomService.GetRoom(roomCode);
            if (room == null || room.Phase != GamePhase.Night) return;
            
            Console.WriteLine($"🌙 Gece fazına devam ediliyor - Turn: {room.Turn}");
            
            await Clients.Group(roomCode).SendAsync("NightPhaseStarted", room);
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
                Console.WriteLine($"👋 Oyuncu odadan çıktı: {room.RoomCode}");
                
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
                    await Clients.Group(room.RoomCode).SendAsync("PlayerLeft", room);
                }
                
                // Oda listesini güncelle
                await Clients.All.SendAsync("RoomListUpdated");
                Console.WriteLine($"📢 RoomListUpdated broadcast yapıldı (oyuncu çıktı)!");
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
}