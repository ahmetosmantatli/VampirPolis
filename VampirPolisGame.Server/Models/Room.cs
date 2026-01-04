namespace VampirPolisGame.Server.Models
{
    public class Room
    {
        public string RoomCode { get; set; } = string.Empty;
        public int SlotNumber { get; set; } = 0; // Her odanın sabit slot numarası (1-8)
        public List<Player> Players { get; set; } = new();
        public GamePhase Phase { get; set; } = GamePhase.Waiting;
        public int Turn { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Gece aksiyonları
        public string? VampireTarget { get; set; }
        public string? DoctorProtection { get; set; }
        public string? KilledPlayerId { get; set; }
        
        // Vampir takımı bilgisi
        public List<string> VampirePlayerIds { get; set; } = new();

        // Oyun sonucu
        public GameResult Result { get; set; } = GameResult.None;

        // Helper methodlar
        public Player? GetLeader() => Players.FirstOrDefault(p => p.IsLeader);
        
        public List<Player> GetVampires() => Players.Where(p => p.Role == Role.Vampire && p.IsAlive).ToList();
        
        public Player? GetDoctor() => Players.FirstOrDefault(p => p.Role == Role.Doctor && p.IsAlive);
        
        public Player? GetSilentWitness() => Players.FirstOrDefault(p => p.Role == Role.SilentWitness);
        
        public List<Player> GetAlivePlayers() => Players.Where(p => p.IsAlive).ToList();
        
        public int GetAliveVampireCount() => Players.Count(p => p.Role == Role.Vampire && p.IsAlive);
        
        public int GetAlivePoliceCount() => Players.Count(p => p.Role != Role.Vampire && p.IsAlive);
    }
}