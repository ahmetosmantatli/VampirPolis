using VampirPolisGame.Server.Models;

namespace VampirPolisGame.Server.Services
{
    public class RoomService
    {
        private readonly Dictionary<string, Room> _rooms = new();
        private readonly Random _random = new();

        // Oda oluştur
        public Room CreateRoom(string playerName, string connectionId)
        {
            string roomCode = GenerateRoomCode();
            
            // Boş ilk slot'u bul (1-8 arası)
            int assignedSlot = 1;
            var occupiedSlots = _rooms.Values.Select(r => r.SlotNumber).ToHashSet();
            for (int i = 1; i <= 8; i++)
            {
                if (!occupiedSlots.Contains(i))
                {
                    assignedSlot = i;
                    break;
                }
            }
            
            var room = new Room
            {
                RoomCode = roomCode,
                SlotNumber = assignedSlot,
                Players = new List<Player>
                {
                    new Player
                    {
                        Name = playerName,
                        ConnectionId = connectionId,
                        IsLeader = true
                    }
                }
            };
            
            _rooms[roomCode] = room;
            Console.WriteLine($"🎮 Oda oluşturuldu: {roomCode} -> Slot {assignedSlot}");
            return room;
        }

        // Odaya katıl
        public (bool success, Room? room, string message) JoinRoom(string roomCode, string playerName, string connectionId)
        {
            if (!_rooms.ContainsKey(roomCode))
                return (false, null, "Oda bulunamadı");
            
            var room = _rooms[roomCode];
            
            // Oyun başlamış olsa bile katılabilsin (kod var ise girebilir)
            // if (room.Phase != GamePhase.Waiting)
            //     return (false, null, "Oyun zaten başlamış");
            
            if (room.Players.Any(p => p.Name == playerName))
                return (false, null, "Bu isim zaten kullanılıyor");
            
            room.Players.Add(new Player
            {
                Name = playerName,
                ConnectionId = connectionId,
                IsAlive = true // Oyuna sonradan katılanlar da hayatta başlasın
            });
            
            return (true, room, "Başarılı");
        }

        // Oda kodu oluştur
        private string GenerateRoomCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            string code;
            
            do
            {
                code = new string(Enumerable.Repeat(chars, 6)
                    .Select(s => s[_random.Next(s.Length)]).ToArray());
            }
            while (_rooms.ContainsKey(code));
            
            return code;
        }

        // Oda getir
        public Room? GetRoom(string roomCode)
        {
            return _rooms.GetValueOrDefault(roomCode);
        }

        // Tüm odaları getir (slot sistemi için)
        public List<object> GetAllRooms()
        {
            Console.WriteLine($"📊 GetAllRooms çağrıldı. Toplam oda: {_rooms.Count}");
            foreach (var room in _rooms.Values)
            {
                Console.WriteLine($"  🏠 Oda: {room.RoomCode}, Slot: {room.SlotNumber}, Oyuncu: {room.Players.Count}, Phase: {room.Phase}");
            }
            
            var roomList = new List<object>();
            
            // Tüm odaları SlotNumber'a göre dictionary'ye al
            // SADECE oyuncusu olan odaları göster (oyun durumuna bakmaksızın)
            var roomsBySlot = _rooms.Values
                .Where(r => r.Players.Count > 0)
                .ToDictionary(r => r.SlotNumber);
            
            Console.WriteLine($"📊 Filtreden geçen oda: {roomsBySlot.Count}");
            
            // 8 slot oluştur
            for (int i = 1; i <= 8; i++)
            {
                if (roomsBySlot.ContainsKey(i))
                {
                    // Bu slot'ta oda var
                    var room = roomsBySlot[i];
                    var statusText = room.Phase == GamePhase.Waiting ? "Bekliyor" : "Oyunda";
                    roomList.Add(new
                    {
                        SlotNumber = i,
                        IsOccupied = true,
                        LeaderName = room.Players.FirstOrDefault(p => p.IsLeader)?.Name ?? "Bilinmeyen",
                        PlayerCount = room.Players.Count,
                        RoomCode = room.RoomCode,
                        Status = statusText,
                        Phase = room.Phase.ToString()
                    });
                }
                else
                {
                    // Boş slot
                    roomList.Add(new
                    {
                        SlotNumber = i,
                        IsOccupied = false,
                        LeaderName = (string?)null,
                        PlayerCount = 0,
                        RoomCode = (string?)null,
                        Status = "Boş",
                        Phase = (string?)null
                    });
                }
            }
            
            return roomList;
        }

        // Oyuncu bağlantısını sil
        public Room? RemovePlayer(string connectionId)
        {
            foreach (var room in _rooms.Values)
            {
                var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
                if (player != null)
                {
                    room.Players.Remove(player);
                    Console.WriteLine($"👋 Oyuncu çıktı: {player.Name}, Kalan oyuncu: {room.Players.Count}");
                    
                    // Odada hiç oyuncu kalmadıysa odayı sil (oyun durumuna bakmaksızın)
                    if (room.Players.Count == 0)
                    {
                        _rooms.Remove(room.RoomCode);
                        Console.WriteLine($"🗑️ Oda silindi (0 oyuncu): {room.RoomCode}");
                        return null;
                    }
                    
                    // Lider ayrıldıysa yeni lider ata
                    if (player.IsLeader && room.Players.Count > 0)
                    {
                        room.Players[0].IsLeader = true;
                        Console.WriteLine($"👑 Yeni lider: {room.Players[0].Name}");
                    }
                    
                    return room;
                }
            }
            
            return null;
        }
    }
}