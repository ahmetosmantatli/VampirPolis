using VampirPolisGame.Server.Models;

namespace VampirPolisGame.Server.Services
{
    public class GameService
    {
        // Vampir sayısını hesapla
        public int CalculateVampireCount(int totalPlayers)
        {
            return totalPlayers switch
            {
                <= 6 => 1,   // 4-6 kişi: 1 vampir
                <= 9 => 2,   // 7-9 kişi: 2 vampir
                _ => 3       // 10+ kişi: 3 vampir (max)
            };
        }

        // Rolleri dağıt
        public void AssignRoles(Room room)
        {
            var players = room.Players.ToList();
            var random = new Random();
            
            // Shuffle players
            players = players.OrderBy(x => random.Next()).ToList();
            
            int totalPlayers = players.Count;
            int vampireCount = CalculateVampireCount(totalPlayers);
            bool hasDoctor = totalPlayers >= 6;
            bool hasSilentWitness = totalPlayers >= 8;
            
            int index = 0;
            
            // Vampir ata
            for (int i = 0; i < vampireCount; i++)
            {
                players[index].Role = Role.Vampire;
                room.VampirePlayerIds.Add(players[index].Id);
                index++;
            }
            
            // Doktor ata
            if (hasDoctor)
            {
                players[index].Role = Role.Doctor;
                index++;
            }
            
            // Sessiz Tanık ata
            if (hasSilentWitness)
            {
                players[index].Role = Role.SilentWitness;
                index++;
            }
            
            // Geri kalanlar Polis
            for (int i = index; i < totalPlayers; i++)
            {
                players[i].Role = Role.Police;
            }
        }

        // Seçilen rollerle dağıt (Manuel rol seçimi)
        public void AssignSelectedRoles(Room room, List<string> selectedRoles)
        {
            var players = room.Players.ToList();
            var random = new Random();
            
            // Oyuncuları karıştır
            players = players.OrderBy(x => random.Next()).ToList();
            
            // Rolleri karıştır
            var shuffledRoles = selectedRoles.OrderBy(x => random.Next()).ToList();
            
            // Rolleri ata
            for (int i = 0; i < players.Count; i++)
            {
                var roleString = shuffledRoles[i];
                var role = Enum.Parse<Role>(roleString);
                players[i].Role = role;
                
                // Vampir takımını oluştur
                if (role == Role.Vampire)
                {
                    room.VampirePlayerIds.Add(players[i].Id);
                }
                
                Console.WriteLine($"🎭 {players[i].Name} -> {role}");
            }
        }

        // Gece aksiyonlarını işle
        public string? ProcessNightActions(Room room)
        {
            var vampires = room.GetVampires();
            var doctor = room.GetDoctor();
            
            // Vampir hedefi
            if (vampires.Any() && vampires.All(v => v.NightTarget != null))
            {
                var firstVampireTarget = vampires.First().NightTarget;
                
                // Tüm vampirler aynı hedefi seçti mi?
                if (vampires.All(v => v.NightTarget == firstVampireTarget))
                {
                    room.VampireTarget = firstVampireTarget;
                }
            }
            
            // Doktor koruması
            if (doctor != null && doctor.NightTarget != null)
            {
                room.DoctorProtection = doctor.NightTarget;
            }
            
            // Ölüm kontrolü
            if (room.VampireTarget != null && room.VampireTarget != room.DoctorProtection)
            {
                var targetPlayer = room.Players.FirstOrDefault(p => p.Id == room.VampireTarget);
                if (targetPlayer != null)
                {
                    targetPlayer.IsAlive = false;
                    room.KilledPlayerId = targetPlayer.Id;
                    return targetPlayer.Name;
                }
            }
            
            return null;  // Kimse ölmedi
        }

        // Oylama sonucunu işle
        public Player? ProcessVoting(Room room)
        {
            var votes = new Dictionary<string, int>();
            
            Console.WriteLine("📊 OYLAMA SONUÇLARI:");
            
            foreach (var player in room.GetAlivePlayers())
            {
                if (player.VoteTarget != null)
                {
                    if (!votes.ContainsKey(player.VoteTarget))
                        votes[player.VoteTarget] = 0;
                    
                    // Sessiz Tanık oyunu 2 sayılır
                    int voteWeight = player.Role == Role.SilentWitness ? 2 : 1;
                    votes[player.VoteTarget] += voteWeight;
                    
                    var target = room.Players.FirstOrDefault(p => p.Id == player.VoteTarget);
                    Console.WriteLine($"  🗳️ {player.Name} ({player.Role}) → {target?.Name} [{voteWeight} oy]");
                }
            }
            
            if (votes.Count == 0)
            {
                Console.WriteLine("❌ Hiç oy yok!");
                return null;
            }
            
            // Oy dağılımını göster
            Console.WriteLine("\n📈 OY DAĞILIMI:");
            foreach (var vote in votes.OrderByDescending(v => v.Value))
            {
                var player = room.Players.FirstOrDefault(p => p.Id == vote.Key);
                Console.WriteLine($"  {player?.Name}: {vote.Value} oy");
            }
            
            // En çok oy alan
            var maxVotes = votes.Max(v => v.Value);
            var mostVoted = votes.Where(v => v.Value == maxVotes).ToList();
            
            Console.WriteLine($"\n🏆 En çok oy: {maxVotes}");
            Console.WriteLine($"🏆 En çok oy alan sayısı: {mostVoted.Count}");
            
            // Beraberlik durumunda kimse ölmez
            if (mostVoted.Count > 1)
            {
                Console.WriteLine($"🤝 BERABERLİK! {mostVoted.Count} kişi {maxVotes} oy aldı - Kimse elenmedi");
                foreach (var tied in mostVoted)
                {
                    var tiedPlayer = room.Players.FirstOrDefault(p => p.Id == tied.Key);
                    Console.WriteLine($"  - {tiedPlayer?.Name}: {tied.Value} oy");
                }
                return null;
            }
            
            var eliminatedPlayerId = mostVoted.First().Key;
            var eliminatedPlayer = room.Players.FirstOrDefault(p => p.Id == eliminatedPlayerId);
            
            if (eliminatedPlayer != null)
            {
                eliminatedPlayer.IsAlive = false;
                Console.WriteLine($"💀 {eliminatedPlayer.Name} ({eliminatedPlayer.Role}) elendi!");
            }
            
            return eliminatedPlayer;
        }

        // Oyun bitiş kontrolü
        public GameResult CheckGameEnd(Room room)
        {
            int aliveVampires = room.GetAliveVampireCount();
            var alivePlayers = room.GetAlivePlayers();
            int totalAlive = alivePlayers.Count;
            int aliveNonVampires = totalAlive - aliveVampires;
            
            Console.WriteLine($"💀 Alive check: Vampires={aliveVampires}, Non-Vampires={aliveNonVampires}, Total={totalAlive}");
            
            // Tüm vampirler öldü → Polis kazandı
            if (aliveVampires == 0)
            {
                Console.WriteLine("👮 Police win! (All vampires dead)");
                room.Result = GameResult.PoliceWin;
                return GameResult.PoliceWin;
            }
            
            // ÖZEL DURUM: 1 Vampir vs 1 Masum → Polis kazanır (Vampir Masumu öldüremez)
            if (totalAlive == 2 && aliveVampires == 1 && aliveNonVampires == 1)
            {
                var nonVampire = alivePlayers.FirstOrDefault(p => p.Role != Role.Vampire);
                if (nonVampire != null && nonVampire.Role == Role.Innocent)
                {
                    Console.WriteLine("👤 Police win! (Vampire cannot kill Innocent - stalemate)");
                    room.Result = GameResult.PoliceWin;
                    return GameResult.PoliceWin;
                }
            }
            
            // Vampir sayısı ≥ Vampir olmayan sayısı → Vampir kazandı
            if (aliveVampires >= aliveNonVampires)
            {
                Console.WriteLine("🧛 Vampires win! (Vampires >= Non-Vampires)");
                room.Result = GameResult.VampiresWin;
                return GameResult.VampiresWin;
            }
            
            Console.WriteLine("⏳ Game continues...");
            return GameResult.None;
        }

        // Turu sıfırla
        public void ResetTurn(Room room)
        {
            foreach (var player in room.Players)
            {
                player.NightTarget = null;
                player.HasVoted = false;
                player.VoteTarget = null;
            }
            
            room.VampireTarget = null;
            room.DoctorProtection = null;
            room.KilledPlayerId = null;
        }
    }
}