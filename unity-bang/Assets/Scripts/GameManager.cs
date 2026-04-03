using UnityEngine;
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
}

public class GameManager : MonoBehaviour
{
    public enum DiceType { Arrow, Dynamite, Shoot1, Shoot2, Beer, Gatling }
    
    // Controle de Ações Especiais (Habilidades Ativas)
    public enum SpecialAction { None, SidKetchum, KitCarlson }

    UIManager uiManager;

    [Header("Game Data")]
    public Player[] players;
    public int totalPlayers = 4;
    public int currentPlayer = 0;
    public int rollsLeft;
    public int arrowsInCenter = 9;
    
    DiceType[] currentDice = new DiceType[5];
    bool[] diceLocked = new bool[5];
    int dynamiteCount = 0;
    bool gameOver = false;

    int pendingShots = 0;
    int pendingBeers = 0;
    DiceType pendingType;

    List<int> queuedShots = new List<int>();
    
    // Variáveis das Habilidades
    SpecialAction pendingAction = SpecialAction.None;
    bool abilityUsedThisTurn = false;

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
        uiManager = GetComponent<UIManager>();
        
        players = new Player[totalPlayers];
        for (int i = 0; i < totalPlayers; i++) players[i] = new Player();

        uiManager.SetupPlayersUI(totalPlayers);
        
        AssignRoles();
        AssignCharacters();
        StartTurn();
    }

    public string GetCharacterAbility(Player.CharacterType type) { return characterAbilities[type]; }
    public int GetMaxRolls() { return players[currentPlayer].character == Player.CharacterType.DukeSortudo ? 4 : 3; }

    void AssignRoles()
    {
        List<Player.Role> rolesPool = new List<Player.Role> { Player.Role.Sheriff, Player.Role.Renegade, Player.Role.Outlaw, Player.Role.Outlaw };
        
        if (totalPlayers >= 5) rolesPool.Add(Player.Role.Deputy);
        if (totalPlayers >= 6) rolesPool.Add(Player.Role.Outlaw);
        if (totalPlayers >= 7) rolesPool.Add(Player.Role.Deputy);
        if (totalPlayers >= 8) rolesPool.Add(Player.Role.Renegade);

        rolesPool = rolesPool.OrderBy(x => Random.value).ToList();

        for (int i = 0; i < totalPlayers; i++)
        {
            players[i].role = rolesPool[i];
            if (players[i].role == Player.Role.Sheriff) currentPlayer = i; 
        }
    }

    void AssignCharacters()
    {
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

        for (int i = 0; i < totalPlayers; i++)
        {
            players[i].character = deck[i];
            players[i].maxHealth = hpBase[deck[i]];
            if (players[i].role == Player.Role.Sheriff) players[i].maxHealth += 2;
            players[i].health = players[i].maxHealth;
        }
    }

    void StartTurn()
    {
        if (gameOver) return;

        rollsLeft = GetMaxRolls();
        dynamiteCount = 0;
        pendingShots = 0;
        pendingBeers = 0;
        queuedShots.Clear(); 
        
        abilityUsedThisTurn = false;
        pendingAction = SpecialAction.None;

        for (int i = 0; i < currentDice.Length; i++)
        {
            currentDice[i] = 0;
            diceLocked[i] = false;
        }

        uiManager.ResetPlayerButtons();
        uiManager.UpdateAllPlayerUI();
        uiManager.UpdateDiceVisuals(currentDice, diceLocked);
    }

    // --- REGRAS DE COMBATE E DANO ---
    void GiveArrow(int pIndex)
    {
        if (arrowsInCenter > 0)
        {
            arrowsInCenter--;
            players[pIndex].arrows++;
            if (arrowsInCenter == 0) TriggerIndianAttack();
        }
    }

    void TriggerIndianAttack()
    {
        for (int j = 0; j < totalPlayers; j++)
        {
            if (!players[j].alive) continue;
            
            int dmg = players[j].arrows;
            if (players[j].character == Player.CharacterType.Jourdonnais) dmg = Mathf.Min(dmg, 1);
            
            players[j].health -= dmg;
            if (players[j].health <= 0) KillPlayer(j);
            players[j].arrows = 0;
        }
        arrowsInCenter = 9;
        CheckWinCondition();
    }

    void TakeDamage(int targetIndex, int amount, int sourceIndex = -1)
    {
        if (!players[targetIndex].alive) return;
        
        players[targetIndex].health -= amount;
        
        if (players[targetIndex].character == Player.CharacterType.PedroRamirez)
        {
            int discard = Mathf.Min(players[targetIndex].arrows, amount);
            players[targetIndex].arrows -= discard;
            arrowsInCenter += discard;
        }
        
        if (sourceIndex != -1 && sourceIndex != targetIndex && players[targetIndex].character == Player.CharacterType.ElGringo)
        {
            for(int i = 0; i < amount; i++) GiveArrow(sourceIndex);
        }

        if (players[targetIndex].health <= 0) KillPlayer(targetIndex);
    }

    void HealPlayer(int target, int amount)
    {
        players[target].health += amount;
        if (players[target].health > players[target].maxHealth) 
            players[target].health = players[target].maxHealth;
    }

    void KillPlayer(int playerIndex)
    {
        if (!players[playerIndex].alive) return;
        
        players[playerIndex].alive = false;
        arrowsInCenter += players[playerIndex].arrows;
        players[playerIndex].arrows = 0;

        for (int i = 0; i < totalPlayers; i++) {
            if (i != playerIndex && players[i].alive && players[i].character == Player.CharacterType.SamOAbutre) {
                HealPlayer(i, 2);
            }
        }
    }

    // --- ROLAGENS E RESOLUÇÕES ---
    public void RollDice()
    {
        if (rollsLeft <= 0 || gameOver || !players[currentPlayer].alive) return;

        pendingAction = SpecialAction.None; // Cancela seleções pendentes de habilidades

        for (int i = 0; i < currentDice.Length; i++)
        {
            if (!diceLocked[i])
            {
                int dice = Random.Range(0, 6);
                currentDice[i] = (DiceType)dice;

                if (currentDice[i] == DiceType.Arrow) GiveArrow(currentPlayer);
                if (currentDice[i] == DiceType.Dynamite) diceLocked[i] = true;
            }
        }

        dynamiteCount = currentDice.Count(d => d == DiceType.Dynamite);
        rollsLeft--;
        
        uiManager.UpdateAllPlayerUI();
        uiManager.UpdateDiceVisuals(currentDice, diceLocked);
        CheckWinCondition();

        if (!players[currentPlayer].alive && !gameOver)
        {
            rollsLeft = 0;
            NextTurn();
            return;
        }

        if (dynamiteCount >= 3 && !gameOver)
        {
            TakeDamage(currentPlayer, 1);
            rollsLeft = 0;
            uiManager.UpdateAllPlayerUI();
            CheckWinCondition();
            
            if (!players[currentPlayer].alive && !gameOver)
            {
                NextTurn();
                return;
            }
        }
    }

    public void ResolveDice()
    {
        if (gameOver || !players[currentPlayer].alive) return;

        rollsLeft = 0; 
        pendingAction = SpecialAction.None; // Cancela seleções pendentes de habilidades
        uiManager.UpdateAllPlayerUI();

        pendingShots = currentDice.Count(d => d == DiceType.Shoot1 || d == DiceType.Shoot2);
        pendingBeers = currentDice.Count(d => d == DiceType.Beer);
        queuedShots.Clear(); 

        if (players[currentPlayer].character == Player.CharacterType.SuzyLafayette && pendingShots == 0)
        {
            HealPlayer(currentPlayer, 2);
        }

        if (pendingShots > 0)
        {
            for (int i = 0; i < currentDice.Length; i++)
            {
                if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2)
                {
                    pendingType = currentDice[i]; break;
                }
            }
            ShowTargetsForShoot(pendingType);
        }
        else if (pendingBeers > 0)
        {
            pendingType = DiceType.Beer;
            ShowTargetsForBeer();
        }
        else
        {
            ResolveGatling();
        }
    }

    void ShowTargetsForBeer()
    {
        uiManager.ResetPlayerButtons();
        for (int i = 0; i < totalPlayers; i++)
            if (players[i].alive) uiManager.SetPlayerButtonInteractable(i, true);
    }

    void ShowTargetsForShoot(DiceType type)
    {
        uiManager.ResetPlayerButtons();
        int aliveCount = players.Count(p => p.alive);
        int distance = (type == DiceType.Shoot1 || aliveCount <= 3) ? 1 : 2;

        for (int i = 0; i < totalPlayers; i++)
        {
            if (!players[i].alive || i == currentPlayer) continue;

            int distCW = 0, distCCW = 0, curr = currentPlayer;
            
            while (curr != i) { curr = (curr + 1) % totalPlayers; if (players[curr].alive) distCW++; }
            curr = currentPlayer;
            while (curr != i) { curr = (curr - 1 + totalPlayers) % totalPlayers; if (players[curr].alive) distCCW++; }

            bool isRose = players[currentPlayer].character == Player.CharacterType.RoseDoolan;
            if (distCW == distance || distCCW == distance || (isRose && (distCW == distance + 1 || distCCW == distance + 1)))
            {
                uiManager.SetPlayerButtonInteractable(i, true);
            }
        }
    }

    public void SelectTarget(int target)
    {
        if (!players[target].alive || gameOver) return;

        string turnTextStr = "Turn: P" + (currentPlayer + 1) + (players[currentPlayer].role == Player.Role.Sheriff ? " (Sheriff)" : "");

        // INTERCEPTAÇÃO: Habilidade do Sid Ketchum
        if (pendingAction == SpecialAction.SidKetchum)
        {
            HealPlayer(target, 1);
            pendingAction = SpecialAction.None;
            abilityUsedThisTurn = true;
            uiManager.UpdateAllPlayerUI();
            uiManager.ShowGameOver(turnTextStr);
            uiManager.ResetPlayerButtons();
            return;
        }

        // INTERCEPTAÇÃO: Habilidade do Kit Carlson
        if (pendingAction == SpecialAction.KitCarlson)
        {
            if (players[target].arrows > 0) {
                players[target].arrows--;
                arrowsInCenter++;
                
                int gatlingIndex = System.Array.IndexOf(currentDice, DiceType.Gatling);
                if (gatlingIndex >= 0) currentDice[gatlingIndex] = DiceType.Arrow; // Consome a Gatling transformando numa flecha morta
                
                pendingAction = SpecialAction.None;
                uiManager.UpdateAllPlayerUI();
                uiManager.UpdateDiceVisuals(currentDice, diceLocked);
                uiManager.ShowGameOver(turnTextStr);
                uiManager.ResetPlayerButtons();
            }
            return;
        }

        if (pendingType == DiceType.Shoot1 || pendingType == DiceType.Shoot2)
        {
            queuedShots.Add(target);
            pendingShots--;

            for (int i = 0; i < currentDice.Length; i++) {
                if (currentDice[i] == pendingType) { currentDice[i] = DiceType.Arrow; break; }
            }

            if (pendingShots > 0) {
                for (int i = 0; i < currentDice.Length; i++) {
                    if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2) { pendingType = currentDice[i]; break; }
                }
                ShowTargetsForShoot(pendingType); 
                uiManager.UpdateAllPlayerUI(); 
                return;
            } 
            else 
            {
                foreach (int t in queuedShots) TakeDamage(t, 1, currentPlayer);
                queuedShots.Clear();

                CheckWinCondition();
                if (gameOver) return;

                if (pendingBeers > 0) {
                    pendingType = DiceType.Beer; ShowTargetsForBeer(); uiManager.UpdateAllPlayerUI(); return;
                }
            }
        }
        else if (pendingType == DiceType.Beer)
        {
            int healAmt = 1;
            if (target == currentPlayer && players[currentPlayer].character == Player.CharacterType.JesseJones && players[currentPlayer].health <= 4) healAmt = 2;
            
            HealPlayer(target, healAmt);
            pendingBeers--;

            if (pendingBeers > 0) { ShowTargetsForBeer(); uiManager.UpdateAllPlayerUI(); return; }
        }

        uiManager.UpdateAllPlayerUI();
        ResolveGatling();
    }

    void ResolveGatling()
    {
        int gatlingCount = currentDice.Count(d => d == DiceType.Gatling);
        int required = players[currentPlayer].character == Player.CharacterType.WillyTheKid ? 2 : 3;

        if (gatlingCount >= required)
        {
            for (int i = 0; i < totalPlayers; i++)
            {
                if (i == currentPlayer || !players[i].alive) continue;
                if (players[i].character == Player.CharacterType.PaulRegret) continue;
                TakeDamage(i, 1, currentPlayer);
            }
            arrowsInCenter += players[currentPlayer].arrows;
            players[currentPlayer].arrows = 0;
        }

        uiManager.UpdateAllPlayerUI();
        CheckWinCondition();
        if (!gameOver) NextTurn();
    }

    void CheckWinCondition()
    {
        bool sheriffAlive = false; int outlawsAlive = 0; int renegadesAlive = 0; int totalAlive = 0;

        foreach (var p in players) {
            if (p.alive) {
                totalAlive++;
                if (p.role == Player.Role.Sheriff) sheriffAlive = true;
                if (p.role == Player.Role.Outlaw) outlawsAlive++;
                if (p.role == Player.Role.Renegade) renegadesAlive++;
            }
        }

        if (!sheriffAlive) {
            gameOver = true;
            uiManager.ShowGameOver((renegadesAlive == 1 && totalAlive == 1) ? "RENEGADE WINS!" : "OUTLAWS WIN!");
        }
        else if (outlawsAlive == 0 && renegadesAlive == 0) {
            gameOver = true; 
            uiManager.ShowGameOver("SHERIFF WINS!");
        }
    }

    void NextTurn()
    {
        if (players.Count(p => p.alive) <= 1) return;

        do { currentPlayer = (currentPlayer + 1) % totalPlayers; } while (!players[currentPlayer].alive);
        StartTurn();
    }

    public void ToggleDiceLock(int index)
    {
        if (gameOver) return;
        
        if (currentDice[index] == DiceType.Dynamite) {
            if (players[currentPlayer].character == Player.CharacterType.BlackJack && currentDice.Count(d => d == DiceType.Dynamite) < 3) {
            } else return;
        }

        diceLocked[index] = !diceLocked[index];
        uiManager.UpdateDiceVisuals(currentDice, diceLocked);
    }

    // --- HABILIDADES ATIVAS ---
    public void UseAbility(int playerIndex)
    {
        if (playerIndex != currentPlayer || gameOver) return;

        string turnTextStr = "Turn: P" + (currentPlayer + 1) + (players[currentPlayer].role == Player.Role.Sheriff ? " (Sheriff)" : "");

        // CANCELAR HABILIDADE: Se clicar no botão de novo, desativa a seleção e volta ao normal.
        if (pendingAction != SpecialAction.None)
        {
            pendingAction = SpecialAction.None;
            uiManager.ShowGameOver(turnTextStr);
            uiManager.ResetPlayerButtons();
            return;
        }

        Player p = players[currentPlayer];

        // SID KETCHUM: Cura no Início do Turno
        if (p.character == Player.CharacterType.SidKetchum)
        {
            if (rollsLeft == GetMaxRolls() && !abilityUsedThisTurn)
            {
                pendingAction = SpecialAction.SidKetchum;
                uiManager.ShowGameOver("SID: Escolha quem curar!");
                uiManager.ResetPlayerButtons();
                for (int i = 0; i < totalPlayers; i++)
                    if (players[i].alive && players[i].health < players[i].maxHealth) 
                        uiManager.SetPlayerButtonInteractable(i, true);
            }
        }
        // SLAB O ASSASSINO: 1 Cerveja = 1 Tiro extra (transforma o dado)
        else if (p.character == Player.CharacterType.SlabOAssassino)
        {
            if (!abilityUsedThisTurn)
            {
                int beerIndex = System.Array.IndexOf(currentDice, DiceType.Beer);
                int shoot1Index = System.Array.IndexOf(currentDice, DiceType.Shoot1);
                int shoot2Index = System.Array.IndexOf(currentDice, DiceType.Shoot2);

                if (beerIndex >= 0 && (shoot1Index >= 0 || shoot2Index >= 0))
                {
                    DiceType targetShoot = shoot1Index >= 0 ? DiceType.Shoot1 : DiceType.Shoot2;
                    currentDice[beerIndex] = targetShoot; 
                    abilityUsedThisTurn = true;
                    uiManager.UpdateDiceVisuals(currentDice, diceLocked);
                }
            }
        }
        // JANE CALAMIDADE: Inverte Shoot 1 e Shoot 2
        else if (p.character == Player.CharacterType.JaneCalamidade)
        {
            for (int i = 0; i < currentDice.Length; i++) {
                if (currentDice[i] == DiceType.Shoot1) currentDice[i] = DiceType.Shoot2;
                else if (currentDice[i] == DiceType.Shoot2) currentDice[i] = DiceType.Shoot1;
            }
            uiManager.UpdateDiceVisuals(currentDice, diceLocked);
        }
        // KIT CARLSON: Consome 1 Gatling para descartar 1 flecha de alguém
        else if (p.character == Player.CharacterType.KitCarlson)
        {
            int gatlingIndex = System.Array.IndexOf(currentDice, DiceType.Gatling);
            if (gatlingIndex >= 0)
            {
                pendingAction = SpecialAction.KitCarlson;
                uiManager.ShowGameOver("KIT: Escolha quem perde 1 flecha!");
                uiManager.ResetPlayerButtons();
                for (int i = 0; i < totalPlayers; i++)
                    if (players[i].alive && players[i].arrows > 0) uiManager.SetPlayerButtonInteractable(i, true);
            }
        }
        // BART CASSIDY: Troca 1 HP faltando por 1 flecha
        else if (p.character == Player.CharacterType.BartCassidy)
        {
            if (p.health < p.maxHealth && arrowsInCenter > 0)
            {
                p.health++;
                GiveArrow(currentPlayer); 
                uiManager.UpdateAllPlayerUI();
            }
        }
    }
}