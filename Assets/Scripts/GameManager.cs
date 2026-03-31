using UnityEngine;
using TMPro;
using UnityEngine.UI;

[System.Serializable]
public class Player
{
    public int health = 8;
    public int maxHealth = 8;
    public int arrows = 0;
    public bool alive = true;

    public TextMeshProUGUI healthText;
    public TextMeshProUGUI arrowsText;
}

public class GameManager : MonoBehaviour
{
    public enum DiceType { Arrow, Dynamite, Shoot1, Shoot2, Beer, Gatling }

    [Header("Dice")]
    public TextMeshProUGUI[] diceTexts;

    [Header("UI")]
    public TextMeshProUGUI rollsText;
    public TextMeshProUGUI centerArrowsText;
    public TextMeshProUGUI turnText;

    public Player[] players;
    Button[] playerButtons;

    DiceType[] currentDice;
    bool[] diceLocked;

    int currentPlayer = 0;
    int totalPlayers = 4;
    int rollsLeft = 3;
    int dynamiteCount = 0;
    int arrowsInCenter = 9;

    // Dados que precisam decisão (Shoot e Beer)
    int pendingShots = 0;
    int pendingBeers = 0;
    DiceType pendingType;

    void Start()
    {
        playerButtons = GameObject.Find("Players").GetComponentsInChildren<Button>();
        totalPlayers = playerButtons.Length;

        players = new Player[totalPlayers];
        for (int i = 0; i < totalPlayers; i++)
        {
            players[i] = new Player();
            Transform p = playerButtons[i].transform;
            players[i].healthText = p.Find("HP").GetComponent<TextMeshProUGUI>();
            players[i].arrowsText = p.Find("Arrows").GetComponent<TextMeshProUGUI>();
        }

        currentDice = new DiceType[diceTexts.Length];
        diceLocked = new bool[diceTexts.Length];

        for (int i = 0; i < diceTexts.Length; i++)
        {
            int index = i;
            diceTexts[i].GetComponent<Button>().onClick.AddListener(() => ToggleDiceLock(index));
        }

        StartTurn();
    }

    void StartTurn()
    {
        rollsLeft = 3;
        dynamiteCount = 0;
        pendingShots = 0;
        pendingBeers = 0;

        for (int i = 0; i < currentDice.Length; i++)
        {
            currentDice[i] = 0;
            diceLocked[i] = false;
            diceTexts[i].text = "";
        }

        rollsText.text = "Rolls: " + rollsLeft;
        centerArrowsText.text = "Center: " + arrowsInCenter;
        turnText.text = "Turn: P" + (currentPlayer + 1);

        ResetPlayerButtons();
        UpdateAllPlayerUI();
        UpdateDiceVisuals();

        Debug.Log($"=== Turno do jogador {currentPlayer + 1} ===");
    }

    void ResetPlayerButtons()
    {
        for (int i = 0; i < playerButtons.Length; i++)
        {
            playerButtons[i].interactable = false;
            playerButtons[i].GetComponentInChildren<TextMeshProUGUI>().color =
                players[i].alive ? Color.black : Color.gray;
        }
    }

    public void RollDice()
    {
        if (rollsLeft <= 0) return;

        dynamiteCount = 0;
        Debug.Log($"Jogador {currentPlayer + 1} rolando dados...");

        for (int i = 0; i < diceTexts.Length; i++)
        {
            if (diceLocked[i]) continue;

            int dice = Random.Range(0, 6);
            DiceType result = (DiceType)dice;
            currentDice[i] = result;
            diceTexts[i].text = result.ToString();

            // Flechas resolvidas imediatamente
            if (result == DiceType.Arrow)
            {
                if (arrowsInCenter > 0)
                {
                    arrowsInCenter--;
                    players[currentPlayer].arrows++;
                    Debug.Log($"Jogador {currentPlayer + 1} pegou uma flecha. Centro: {arrowsInCenter}");
                    if (arrowsInCenter == 0)
                    {
                        // Ataque indígena
                        Debug.Log("Centro de flechas zerado! Ataque indígena!");
                        for (int j = 0; j < totalPlayers; j++)
                        {
                            if (!players[j].alive) continue;
                            players[j].health -= players[j].arrows;
                            if (players[j].health <= 0) players[j].alive = false;
                            players[j].arrows = 0;
                        }
                        arrowsInCenter = 9;
                    }
                }
            }

            // Dynamite travada
            if (result == DiceType.Dynamite)
            {
                diceLocked[i] = true;
                dynamiteCount++;
                Debug.Log($"Dynamite travada! Total: {dynamiteCount}");
            }
        }

        rollsLeft--;
        rollsText.text = "Rolls: " + rollsLeft;
        UpdateAllPlayerUI();
        UpdateDiceVisuals();

        if (dynamiteCount >= 3)
        {
            Debug.Log("Dinamite explodiu! Jogador perde 1 vida e termina turno.");
            players[currentPlayer].health--;
            if (players[currentPlayer].health <= 0) players[currentPlayer].alive = false;
            rollsLeft = 0;
            UpdateAllPlayerUI();
        }
    }

    public void ResolveDice()
    {
        // Contar Shoot e Beer
        pendingShots = 0;
        pendingBeers = 0;
        int gatlingCount = 0;

        for (int i = 0; i < currentDice.Length; i++)
        {
            DiceType d = currentDice[i];
            if (d == DiceType.Shoot1 || d == DiceType.Shoot2) pendingShots++;
            if (d == DiceType.Beer) pendingBeers++;
            if (d == DiceType.Gatling) gatlingCount++;
        }

        // Gatling depois de tudo
        if (gatlingCount >= 3)
        {
            Debug.Log("Gatling ativado! Todos os outros jogadores perdem 1 vida.");
            for (int i = 0; i < totalPlayers; i++)
            {
                if (i == currentPlayer || !players[i].alive) continue;
                players[i].health--;
                if (players[i].health <= 0) players[i].alive = false;
            }
            // Descartar flechas do jogador
            players[currentPlayer].arrows = 0;
            arrowsInCenter = 9;
        }

        UpdateAllPlayerUI();

        if (pendingBeers > 0)
        {
            pendingType = DiceType.Beer;
            ShowTargetsForBeer();
        }
        else if (pendingShots > 0)
        {
            for (int i = 0; i < currentDice.Length; i++)
            {
                if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2)
                {
                    pendingType = currentDice[i];
                    break;
                }
            }
            ShowTargetsForShoot(pendingType);
        }
        else
        {
            NextTurn();
        }
    }

    void ShowTargetsForBeer()
    {
        ResetPlayerButtons();
        for (int i = 0; i < totalPlayers; i++)
            if (players[i].alive) playerButtons[i].interactable = true;

        Debug.Log("Escolha quem curar (Beer).");
    }

    void ShowTargetsForShoot(DiceType type)
    {
        ResetPlayerButtons();
        int distance = type == DiceType.Shoot1 ? 1 : 2;
        for (int i = 0; i < totalPlayers; i++)
        {
            if (!players[i].alive || i == currentPlayer) continue;
            int distCW = (i - currentPlayer + totalPlayers) % totalPlayers;
            int distCCW = (currentPlayer - i + totalPlayers) % totalPlayers;
            if (distCW == distance || distCCW == distance)
                playerButtons[i].interactable = true;
        }
        Debug.Log($"Escolha alvo para {type} (distância {distance}).");
    }

    public void SelectTarget(int target)
    {
        if (!players[target].alive) return;

        if (pendingType == DiceType.Beer)
        {
            players[target].health++;
            if (players[target].health > players[target].maxHealth) players[target].health = players[target].maxHealth;
            Debug.Log($"Jogador {target + 1} curado com Beer");
            pendingBeers--;
            if (pendingBeers > 0)
            {
                ShowTargetsForBeer();
                UpdateAllPlayerUI();
                return;
            }
        }
        else if (pendingType == DiceType.Shoot1 || pendingType == DiceType.Shoot2)
        {
            players[target].health--;
            if (players[target].health <= 0) players[target].alive = false;
            Debug.Log($"Jogador {currentPlayer + 1} atirou em jogador {target + 1} ({pendingType})");
            pendingShots--;

            bool foundNext = false;
            for (int i = 0; i < currentDice.Length; i++)
            {
                if (currentDice[i] == DiceType.Shoot1 || currentDice[i] == DiceType.Shoot2)
                {
                    pendingType = currentDice[i];
                    currentDice[i] = DiceType.Arrow; // marca como resolvido
                    foundNext = true;
                    break;
                }
            }
            if (foundNext)
            {
                ShowTargetsForShoot(pendingType);
                UpdateAllPlayerUI();
                return;
            }
        }

        UpdateAllPlayerUI();
        NextTurn();
    }

    void NextTurn()
    {
        currentPlayer++;
        if (currentPlayer >= totalPlayers) currentPlayer = 0;
        while (!players[currentPlayer].alive)
        {
            currentPlayer++;
            if (currentPlayer >= totalPlayers) currentPlayer = 0;
        }

        StartTurn();
    }

    void ToggleDiceLock(int index)
    {
        if (currentDice[index] == DiceType.Dynamite) return;
        diceLocked[index] = !diceLocked[index];
        UpdateDiceVisuals();
        Debug.Log($"Dado {index + 1} {(diceLocked[index] ? "travado" : "destravado")}");
    }

    void UpdateDiceVisuals()
    {
        for (int i = 0; i < diceTexts.Length; i++)
            diceTexts[i].color = diceLocked[i] ? Color.red : Color.black;
    }

    void UpdateAllPlayerUI()
    {
        for (int i = 0; i < totalPlayers; i++)
        {
            if (players[i].healthText != null) players[i].healthText.text = "HP: " + players[i].health;
            if (players[i].arrowsText != null) players[i].arrowsText.text = "Arrows: " + players[i].arrows;
        }
        centerArrowsText.text = "Center: " + arrowsInCenter;
    }
}