namespace VampirPolisGame.Server.Models
{
    public enum Role
    {
        Vampire,        // Vampir
        Doctor,         // Doktor
        SilentWitness,  // Sessiz Tanık (2x oy gücü)
        Police,         // Polis (Normal Köylü)
        Seer,           // Kahin (her gece rol öğrenir)
        Hunter,         // Avcı (öldüğünde birini götürür)
        Innocent        // Masum (öldürülürse o gece kimse ölmez)
    }

    public enum GamePhase
    {
        Waiting,        // Lobby'de bekliyor
        Night,          // Gece fazı
        Day,            // Gündüz fazı
        Voting,         // Oylama
        Ended           // Oyun bitti
    }

    public enum GameResult
    {
        None,
        VampiresWin,
        PoliceWin
    }
}