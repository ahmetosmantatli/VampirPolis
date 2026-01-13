namespace VampirPolisGame.Server.Models
{
    public enum Role
    {
        Vampire,            // Vampir (Mode 1) - Normal vampir, avlanır
        MasterVampire,      // Usta Vampir (Mode 2) - Avlanır VE öldüğünde birini ısırıp Yeni Yetme Vampir yapar
        Fledgling,          // Yeni Yetme Vampir (Mode 2) - Usta Vampir tarafından ısırılan oyuncu, avlanır ama ölünce ısıramaz, kartları gözükmez
        Doctor,             // Doktor
        SilentWitness,      // Sessiz Tanık (2x oy gücü)
        Police,             // Polis (Normal Köylü)
        Seer,               // Kahin (her gece rol öğrenir) - Mode 1 only
        Hunter,             // Avcı (öldüğünde birini götürür)
        Innocent            // Masum (öldürülürse o gece kimse ölmez)
    }

    public enum GameMode
    {
        Mode1,  // Klasik vampir köylü
        Mode2   // Mekan mekaniği ile
    }

    public enum Location
    {
        None,   // Seçim yapılmadı
        House,  // Ev
        Square, // Meydan
        Forest  // Orman
    }

    public enum GamePhase
    {
        Waiting,            // Lobby'de bekliyor
        LocationSelection,  // Mekan seçimi (Mode 2)
        Night,              // Gece fazı
        Day,                // Gündüz fazı
        Voting,             // Oylama
        Ended               // Oyun bitti
    }

    public enum GameResult
    {
        None,
        VampiresWin,
        PoliceWin
    }
}