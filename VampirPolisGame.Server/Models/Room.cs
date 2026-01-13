namespace VampirPolisGame.Server.Models
{
    public class Room
    {
        public string RoomCode { get; set; } = string.Empty;
        public int SlotNumber { get; set; } = 0; // Her odanın sabit slot numarası (1-8)
        public List<Player> Players { get; set; } = new();
        public GamePhase Phase { get; set; } = GamePhase.Waiting;
        public GameMode Mode { get; set; } = GameMode.Mode1; // Varsayılan Mode 1
        public int Turn { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Gece aksiyonları
        public string? VampireTarget { get; set; }
        public string? DoctorProtection { get; set; }
        public string? KilledPlayerId { get; set; }
        
        // Vampir takımı bilgisi
        public List<string> VampirePlayerIds { get; set; } = new();

        // Mode 2 - Mekan mekaniği
        public Dictionary<string, Location> PlayerLocations { get; set; } = new(); // PlayerId -> Location
        public string? RevealedPlayerId { get; set; } // İfşa edilen oyuncu (mekan seçiminde)

        // Event tracking
        public string HunterTriggerContext { get; set; } = "Night"; // "Night" veya "Voting"

        // Oyun sonucu
        public GameResult Result { get; set; } = GameResult.None;

        // Helper methodlar
        public Player? GetLeader() => Players.FirstOrDefault(p => p.IsLeader);
        
        // Vampir + MasterVampire + Fledgling (sadece canlılar)
        public List<Player> GetVampires() => Players.Where(p => 
            p != null && 
            (p.Role == Role.Vampire || p.Role == Role.MasterVampire || p.Role == Role.Fledgling) 
            && p.IsAlive).ToList();
        
        public Player? GetDoctor() => Players.FirstOrDefault(p => p != null && p.Role == Role.Doctor && p.IsAlive);
        
        public Player? GetSilentWitness() => Players.FirstOrDefault(p => p.Role == Role.SilentWitness);
        
        public List<Player> GetAlivePlayers() => Players.Where(p => p.IsAlive).ToList();
        
        // Canlı vampir sayısı (Vampire + MasterVampire + Fledgling)
        public int GetAliveVampireCount() => Players.Count(p => 
            (p.Role == Role.Vampire || p.Role == Role.MasterVampire || p.Role == Role.Fledgling) && p.IsAlive);
        
        public int GetAlivePoliceCount() => Players.Count(p => 
            p.Role != Role.Vampire && 
            p.Role != Role.MasterVampire && 
            p.Role != Role.Fledgling && 
            p.IsAlive);
    }
}