namespace VampirPolisGame.Server.Models
{
    public class Player
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ConnectionId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Role Role { get; set; }
        public bool IsAlive { get; set; } = true;
        public bool IsLeader { get; set; } = false;
        
        // Gece seçimleri
        public string? NightTarget { get; set; }  // Vampir hedefi veya Doktor koruması
        public bool HasVoted { get; set; } = false;
        public string? VoteTarget { get; set; }  // Gündüz oylaması

        // Doktor için özel
        public string? LastProtected { get; set; }  // Önceki turda koruduğu kişi
        
        // Avcı için özel
        public bool IsHunterRevenge { get; set; } = false;  // Avcı intikam modu
        public string? HunterTarget { get; set; }  // Avcının seçtiği hedef
        
        // MasterVampire için özel
        public bool IsMasterVampireBite { get; set; } = false;  // MasterVampire ısırma modu
        public string? MasterVampireBiteTarget { get; set; }  // MasterVampire'ın ısırdığı hedef
    }
}