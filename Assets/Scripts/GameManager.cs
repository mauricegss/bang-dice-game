using UnityEngine;
using TMPro;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Linq;

[System.Serializable]
public class Player
{
    public enum Role { Sheriff, Deputy, Outlaw, Renegade }
    public enum CharacterType { 
        BartCassidy, BlackJack, PaulRegret, PedroRamirez, JaneCalamidade, 
        ElGringo, RoseDoolan, SidKetchum, JesseJones, Jourdonnais, 
        SlabOAssassino, SuzyLafayette, KitCarlson, SamOAbutre, DukeSortudo, WillyTheKid 
    }

    public Role role;
    public CharacterType character;
    public int health;
    public int maxHealth;
    public int arrows = 0;
    public bool alive = true;

    [Header("UI References")]
    public TextMeshProUGUI healthText;
    public TextMeshProUGUI arrowsText;
    public TextMeshProUGUI roleText;
    public TextMeshProUGUI characterText;
    public Button infoButton;
}

public class GameManager : MonoBehaviour
{
    public enum DiceType { Arrow, Dynamite, Shoot1, Shoot2, Beer, Gatling }

    [Header("Dice")]
    public TextMeshProUGUI[] diceTexts;

    [Header("Global UI")]
    public TextMeshProUGUI rollsText;
    public TextMeshProUGUI centerArrowsText;
    public TextMeshProUGUI turnText;
    
    [Header("Popup References (ARRASTE AQUI!)")]
    public GameObject characterPopup; 
    public TextMeshProUGUI popupTitle;
    public TextMeshProUGUI popupDescription;

    [Header("Players")]
    public Player[] players;
    Button[] playerButtons;

    // Dados e Estado
    DiceType[] currentDice;
    bool[] diceLocked;
    int currentPlayer = 0;
    int totalPlayers = 4;
    int rollsLeft;
    int dynamiteCount = 0;
    int arrowsInCenter = 9;
    bool gameOver = false;
    
    // Controle do Popup
    int currentPopupPlayer = -1;

    int pendingShots = 0;
    int pendingBeers = 0;
    DiceType pendingType;

    // Dicionário de Habilidades
    private Dictionary<Player.CharacterType, string> characterAbilities = new Dictionary<Player.CharacterType, string>
    {
        { Player.CharacterType.BartCassidy, "Pode pegar uma flecha em vez de perder um ponto de vida (exceto por Indígenas ou Dinamite)." },
        { Player.CharacterType.BlackJack, "Pode rerrolar o dado de Dinamite (se não tiver tirado três ou mais no total)." },
        { Player.CharacterType.PaulRegret, "Você nunca perde pontos de vida para a Metralhadora Gatling." },
        { Player.CharacterType.PedroRamirez, "Descarta uma de suas flechas para cada ponto de vida que perder." },
        { Player.CharacterType.JaneCalamidade, "Pode usar o Alvo '1' como Alvo '2' e vice-versa." },
        { Player.CharacterType.ElGringo, "Quando um jogador fizer você perder vida, ele deve pegar uma flecha (exceto por Indígenas ou Dinamite)." },
        { Player.CharacterType.RoseDoolan, "Pode atingir jogadores a um lugar a mais de distância com Alvo '1' ou '2'." },
        { Player.CharacterType.SidKetchum, "No início do turno, um jogador à sua escolha ganha um ponto de vida." },
        { Player.CharacterType.JesseJones, "Se tiver 4 de vida ou menos, ganha dois pontos ao usar a Cerveja para si mesmo." },
        { Player.CharacterType.Jourdonnais, "Você nunca perde mais do que um ponto de vida para os Indígenas." },
        { Player.CharacterType.SlabOAssassino, "Uma vez por turno, pode usar uma Cerveja para duplicar um Alvo '1' ou '2'." },
        { Player.CharacterType.SuzyLafayette, "Recebe dois pontos de vida se não tiver tirado nenhum Alvo '1' ou '2' no final do turno." },
        { Player.CharacterType.KitCarlson, "Para cada resultado de Gatling, descarta uma flecha de qualquer jogador." },
        { Player.CharacterType.SamOAbutre, "Ganha dois pontos de vida cada vez que outro jogador for eliminado." },
        { Player.CharacterType.DukeSortudo, "Pode fazer uma rerrolagem extra (até quatro vezes no total)." },
        { Player.CharacterType.WillyTheKid, "Só precisa de 2 dados de Gatling para ativar a Metralhadora." }
    };

    void Start()
    {
        SetupPlayers();
        SetupDice();
        AssignRoles();
        AssignCharacters();
        
        // Garante que o painel comece escondido
        if(characterPopup != null) characterPopup.SetActive(false);
        else Debug.LogWarning("⚠️ Você esqueceu de arrastar o CharacterPopup para o script GameManager no Inspector!");

        StartTurn();
    }

    void SetupPlayers()
    {
        Transform playersContainer = GameObject.Find("Players").transform;
        totalPlayers = playersContainer.childCount;
        players = new Player[totalPlayers];
        playerButtons = new Button[totalPlayers];

        for (int i = 0; i < totalPlayers; i++)
        {
            players[i] = new Player();
            int index = i; 
            
            Transform p = playersContainer.GetChild(i);
            playerButtons[i] = p.GetComponent<Button>();

            Transform hpObj = p.Find("HP");
            if (hpObj != null) players[i].healthText = hpObj.GetComponent<TextMeshProUGUI>();

            Transform arrowsObj = p.Find("Arrows");
            if (arrowsObj != null) players[i].arrowsText = arrowsObj.GetComponent<TextMeshProUGUI>();

            Transform roleObj = p.Find("Role");
            if (roleObj != null) players[i].roleText = roleObj.GetComponent<TextMeshProUGUI>();
            
            Transform charObj = p.Find("Character");
            if (charObj != null) players[i].characterText = charObj.GetComponent<TextMeshProUGUI>();
            
            Transform btnObj = p.Find("Character/Info");
            if (btnObj != null) {
                players[i].infoButton = btnObj.GetComponent<Button>();
                if (players[i].infoButton != null) {
                    players[i].infoButton.onClick.RemoveAllListeners();
                    players[i].infoButton.onClick.AddListener(() => ToggleDescription(index));
                } else {
                    Debug.LogWarning($"⚠️ O objeto Info no P{index+1} não tem o componente 'Button' adicionado nele!");
                }
            }
        }
    }

    // NOVA FUNÇÃO: O "X" para fechar o painel manualmente, se necessário.
    public void ClosePopup()
    {
        if(characterPopup != null) characterPopup.SetActive(false);
        currentPopupPlayer = -1;
    }

    public void ToggleDescription(int playerIndex)
    {
        Debug.Log("O clique funcionou para o jogador: " + playerIndex);

        if (characterPopup == null)
        {
            Debug.LogError("❌ ERRO: Impossível abrir! Você não arrastou o CharacterPopup para o Inspector do GameManager.");
            return;
        }

        // Se o painel já está aberto E clicamos no mesmo jogador, ele ESCONDE.
        if (characterPopup.activeSelf && currentPopupPlayer == playerIndex)
        {
            ClosePopup();
            return;
        }

        Player p = players[playerIndex];
        
        // Verifica se os textos foram linkados antes de tentar mudar o texto
        if (popupTitle != null) 
            popupTitle.text = $"{p.character.ToString().ToUpper()} ({p.maxHealth})";
        else 
            Debug.LogError("❌ ERRO: Você não arrastou o PopupTitle para o Inspector do GameManager.");

        if (popupDescription != null) 
            popupDescription.text = characterAbilities[p.character];
        else 
            Debug.LogError("❌ ERRO: Você não arrastou o PopupDescription para o Inspector do GameManager.");
        
        characterPopup.SetActive(true);
        currentPopupPlayer = playerIndex;
    }

    // ... [O RESTO DO CÓDIGO (AssignRoles, StartTurn, RollDice, etc) FICA EXATAMENTE IGUAL] ...
    
    void SetupDice() {
        currentDice = new DiceType[diceTexts.Length];
        diceLocked = new bool[diceTexts.Length];
        for (int i = 0; i < diceTexts.Length; i++) {
            int index = i;
            diceTexts[i].GetComponent<Button>().onClick.AddListener(() => ToggleDiceLock(index));
        }
    }

    void AssignRoles() {
        List<Player.Role> rolesPool = new List<Player.Role> { Player.Role.Sheriff, Player.Role.Renegade, Player.Role.Outlaw, Player.Role.Outlaw };
        rolesPool = rolesPool.OrderBy(x => Random.value).ToList();
        for (int i = 0; i < totalPlayers; i++) {
            players[i].role = rolesPool[i];
            if (players[i].role == Player.Role.Sheriff) currentPlayer = i; 
        }
    }

    void AssignCharacters() {
        List<Player.CharacterType> deck = System.Enum.GetValues(typeof(Player.CharacterType)).Cast<Player.CharacterType>().ToList();
        deck = deck.OrderBy(x => Random.value).ToList();
        Dictionary<Player.CharacterType, int> hpBase = new Dictionary<Player.CharacterType, int> {
            {Player.CharacterType.BartCassidy, 8}, {Player.CharacterType.BlackJack, 8}, {Player.CharacterType.PaulRegret, 9},
            {Player.CharacterType.PedroRamirez, 8}, {Player.CharacterType.JaneCalamidade, 8}, {Player.CharacterType.ElGringo, 7},
            {Player.CharacterType.RoseDoolan, 9}, {Player.CharacterType.SidKetchum, 8}, {Player.CharacterType.JesseJones, 9},
            {Player.CharacterType.Jourdonnais, 7}, {Player.CharacterType.SlabOAssassino, 8}, {Player.CharacterType.SuzyLafayette, 8},
            {Player.CharacterType.KitCarlson, 7}, {Player.CharacterType.SamOAbutre, 9}, {Player.CharacterType.DukeSortudo, 8},
            {Player.CharacterType.WillyTheKid, 8}
        };
        for (int i = 0; i < totalPlayers; i++) {
            players[i].character = deck[i]; players[i].maxHealth = hpBase[deck[i]];
            if (players[i].role == Player.Role.Sheriff) players[i].maxHealth += 2;
            players[i].health = players[i].maxHealth;
        }
    }

    void StartTurn() {
        if (gameOver) return;
        rollsLeft = players[currentPlayer].character == Player.CharacterType.DukeSortudo ? 4 : 3;
        dynamiteCount = 0; pendingShots = 0; pendingBeers = 0;
        for (int i = 0; i < currentDice.Length; i++) { currentDice[i] = 0; diceLocked[i] = false; diceTexts[i].text = ""; }
        ResetPlayerButtons(); UpdateAllPlayerUI(); UpdateDiceVisuals();
    }

    void ResetPlayerButtons() {
        for (int i = 0; i < playerButtons.Length; i++) {
            playerButtons[i].interactable = false;
            TextMeshProUGUI btnText = playerButtons[i].GetComponent<TextMeshProUGUI>();
            if (btnText != null) btnText.color = players[i].alive ? Color.black : Color.gray;
        }
    }

    void GiveArrow(int pIndex) {
        if (arrowsInCenter > 0) { arrowsInCenter--; players[pIndex].arrows++; if (arrowsInCenter == 0) TriggerIndianAttack(); }
    }

    void TriggerIndianAttack() {
        for (int j = 0; j < totalPlayers; j++) {
            if (!players[j].alive) continue;
            int dmg = players[j].arrows;
            if (players[j].character == Player.CharacterType.Jourdonnais) dmg = Mathf.Min(dmg, 1);
            players[j].health -= dmg; if (players[j].health <= 0) KillPlayer(j); players[j].arrows = 0;
        }
        arrowsInCenter = 9; CheckWinCondition();
    }

    void TakeDamage(int targetIndex, int amount, int sourceIndex = -1) {
        if (!players[targetIndex].alive) return;
        players[targetIndex].health -= amount;
        if (players[targetIndex].character == Player.CharacterType.PedroRamirez) {
            int discard = Mathf.Min(players[targetIndex].arrows, amount); players[targetIndex].arrows -= discard; arrowsInCenter += discard;
        }
        if (sourceIndex != -1 && sourceIndex != targetIndex && players[targetIndex].character == Player.CharacterType.ElGringo) {
            for(int i = 0; i < amount; i++) GiveArrow(sourceIndex);
        }
        if (players[targetIndex].health <= 0) KillPlayer(targetIndex);
    }

    void HealPlayer(int target, int amount) {
        players[target].health += amount; if (players[target].health > players[target].maxHealth) players[target].health = players[target].maxHealth;
    }

    void KillPlayer(int playerIndex) {
        if (!players[playerIndex].alive) return;
        players[playerIndex].alive = false; arrowsInCenter += players[playerIndex].arrows; players[playerIndex].arrows = 0;
        for (int i = 0; i < totalPlayers; i++) { if (i != playerIndex && players[i].alive && players[i].character == Player.CharacterType.SamOAbutre) { HealPlayer(i, 2); } }
    }

    public void RollDice() {
        if (rollsLeft <= 0 || gameOver) return;
        for (int i = 0; i < diceTexts.Length; i++) {
            if (!diceLocked[i]) {
                int dice = Random.Range(0, 6); currentDice[i] = (DiceType)dice; diceTexts[i].text = currentDice[i].ToString();
                if (currentDice[i] == DiceType.Arrow) GiveArrow(currentPlayer);
                if (currentDice[i] == DiceType.Dynamite) diceLocked[i] = true;
            }
        }
        dynamiteCount = currentDice.Count(d => d == DiceType.Dynamite); rollsLeft--;
        UpdateAllPlayerUI(); UpdateDiceVisuals(); CheckWinCondition();
        if (dynamiteCount >= 3 && !gameOver) { TakeDamage(currentPlayer, 1); rollsLeft = 0; UpdateAllPlayerUI(); CheckWinCondition(); }
    }

    public void ResolveDice() {
        if (gameOver) return;
        pendingShots = currentDice.Count(d => d == DiceType.Shoot1 || d == DiceType.Shoot2);
        pendingBeers = currentDice.Count(d => d == DiceType.Beer);
        if (players[currentPlayer].character == Player.CharacterType.SuzyLafayette && pendingShots == 0) { HealPlayer(currentPlayer, 2); }
        if (pendingShots > 0) {
            for (int i = 0; i < currentDice.Length; i++) { if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2) { pendingType = currentDice[i]; break; } }
            ShowTargetsForShoot(pendingType);
        }
        else if (pendingBeers > 0) { pendingType = DiceType.Beer; ShowTargetsForBeer(); } else { ResolveGatling(); }
    }

    void ShowTargetsForBeer() { ResetPlayerButtons(); for (int i = 0; i < totalPlayers; i++) if (players[i].alive) playerButtons[i].interactable = true; }

    void ShowTargetsForShoot(DiceType type) {
        ResetPlayerButtons(); int aliveCount = players.Count(p => p.alive); int distance = (type == DiceType.Shoot1 || aliveCount <= 3) ? 1 : 2;
        for (int i = 0; i < totalPlayers; i++) {
            if (!players[i].alive || i == currentPlayer) continue;
            int distCW = 0, distCCW = 0, curr = currentPlayer;
            while (curr != i) { curr = (curr + 1) % totalPlayers; if (players[curr].alive) distCW++; }
            curr = currentPlayer;
            while (curr != i) { curr = (curr - 1 + totalPlayers) % totalPlayers; if (players[curr].alive) distCCW++; }
            bool isRose = players[currentPlayer].character == Player.CharacterType.RoseDoolan;
            if (distCW == distance || distCCW == distance || (isRose && (distCW == distance + 1 || distCCW == distance + 1))) { playerButtons[i].interactable = true; }
        }
    }

    public void SelectTarget(int target) {
        if (!players[target].alive || gameOver) return;
        if (pendingType == DiceType.Shoot1 || pendingType == DiceType.Shoot2) {
            TakeDamage(target, 1, currentPlayer); pendingShots--;
            for (int i = 0; i < currentDice.Length; i++) { if (currentDice[i] == pendingType) { currentDice[i] = DiceType.Arrow; break; } }
            CheckWinCondition(); if (gameOver) return;
            if (pendingShots > 0) {
                for (int i = 0; i < currentDice.Length; i++) { if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2) { pendingType = currentDice[i]; break; } }
                ShowTargetsForShoot(pendingType); UpdateAllPlayerUI(); return;
            } else if (pendingBeers > 0) { pendingType = DiceType.Beer; ShowTargetsForBeer(); UpdateAllPlayerUI(); return; }
        }
        else if (pendingType == DiceType.Beer) {
            int healAmt = 1; if (target == currentPlayer && players[currentPlayer].character == Player.CharacterType.JesseJones && players[currentPlayer].health <= 4) healAmt = 2;
            HealPlayer(target, healAmt); pendingBeers--;
            if (pendingBeers > 0) { ShowTargetsForBeer(); UpdateAllPlayerUI(); return; }
        }
        UpdateAllPlayerUI(); ResolveGatling();
    }

    void ResolveGatling() {
        int gatlingCount = currentDice.Count(d => d == DiceType.Gatling);
        int required = players[currentPlayer].character == Player.CharacterType.WillyTheKid ? 2 : 3;
        if (gatlingCount >= required) {
            for (int i = 0; i < totalPlayers; i++) {
                if (i == currentPlayer || !players[i].alive) continue;
                if (players[i].character == Player.CharacterType.PaulRegret) continue;
                TakeDamage(i, 1, currentPlayer);
            }
            arrowsInCenter += players[currentPlayer].arrows; players[currentPlayer].arrows = 0;
        }
        UpdateAllPlayerUI(); CheckWinCondition(); if (!gameOver) NextTurn();
    }

    void CheckWinCondition() {
        bool sheriffAlive = false; int outlawsAlive = 0; int renegadesAlive = 0; int totalAlive = 0;
        foreach (var p in players) {
            if (p.alive) { totalAlive++; if (p.role == Player.Role.Sheriff) sheriffAlive = true; if (p.role == Player.Role.Outlaw) outlawsAlive++; if (p.role == Player.Role.Renegade) renegadesAlive++; }
        }
        if (!sheriffAlive) { gameOver = true; turnText.text = (renegadesAlive == 1 && totalAlive == 1) ? "RENEGADE WINS!" : "OUTLAWS WIN!"; }
        else if (outlawsAlive == 0 && renegadesAlive == 0) { gameOver = true; turnText.text = "SHERIFF WINS!"; }
    }

    void NextTurn() {
        if (players.Count(p => p.alive) <= 1) return;
        do { currentPlayer = (currentPlayer + 1) % totalPlayers; } while (!players[currentPlayer].alive);
        StartTurn();
    }

    void ToggleDiceLock(int index) {
        if (gameOver) return;
        if (currentDice[index] == DiceType.Dynamite) {
            if (players[currentPlayer].character == Player.CharacterType.BlackJack && currentDice.Count(d => d == DiceType.Dynamite) < 3) { } else return;
        }
        diceLocked[index] = !diceLocked[index]; UpdateDiceVisuals();
    }

    void UpdateDiceVisuals() { for (int i = 0; i < diceTexts.Length; i++) diceTexts[i].color = diceLocked[i] ? Color.red : Color.black; }

    void UpdateAllPlayerUI() {
        for (int i = 0; i < totalPlayers; i++) {
            if(players[i].healthText != null) players[i].healthText.text = "HP: " + players[i].health;
            if(players[i].arrowsText != null) players[i].arrowsText.text = "Arrows: " + players[i].arrows;
            if(players[i].characterText != null) players[i].characterText.text = players[i].character.ToString();
            if (players[i].roleText != null) {
                if (players[i].role == Player.Role.Sheriff || !players[i].alive) { players[i].roleText.text = players[i].role.ToString(); players[i].roleText.color = Color.blue; } 
                else { players[i].roleText.text = "???"; players[i].roleText.color = Color.black; }
            }
        }
        if(rollsText != null) rollsText.text = "Rolls: " + rollsLeft;
        if(centerArrowsText != null) centerArrowsText.text = "Center: " + arrowsInCenter;
        if(turnText != null) turnText.text = "Turn: P" + (currentPlayer + 1) + (players[currentPlayer].role == Player.Role.Sheriff ? " (Sheriff)" : "");
    }
}