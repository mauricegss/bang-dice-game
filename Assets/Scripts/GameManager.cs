using UnityEngine;
using TMPro;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Linq;

[System.Serializable]
public class Player
{
    public enum Role { Sheriff, Deputy, Outlaw, Renegade }

    public Role role;
    public int health = 8;
    public int maxHealth = 8;
    public int arrows = 0;
    public bool alive = true;

    public TextMeshProUGUI healthText;
    public TextMeshProUGUI arrowsText;
    public TextMeshProUGUI roleText;
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
    bool gameOver = false;

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
            players[i].roleText = p.Find("Role").GetComponent<TextMeshProUGUI>();
        }

        currentDice = new DiceType[diceTexts.Length];
        diceLocked = new bool[diceTexts.Length];

        for (int i = 0; i < diceTexts.Length; i++)
        {
            int index = i;
            diceTexts[i].GetComponent<Button>().onClick.AddListener(() => ToggleDiceLock(index));
        }

        AssignRoles();
        StartTurn();
    }

    void AssignRoles()
    {
        List<Player.Role> rolesPool = new List<Player.Role>
        {
            Player.Role.Sheriff,
            Player.Role.Renegade,
            Player.Role.Outlaw,
            Player.Role.Outlaw
        };

        for (int i = 0; i < rolesPool.Count; i++)
        {
            Player.Role temp = rolesPool[i];
            int randomIndex = Random.Range(i, rolesPool.Count);
            rolesPool[i] = rolesPool[randomIndex];
            rolesPool[randomIndex] = temp;
        }

        for (int i = 0; i < totalPlayers; i++)
        {
            players[i].role = rolesPool[i];
            if (players[i].role == Player.Role.Sheriff)
            {
                players[i].maxHealth = 10;
                players[i].health = 10;
                currentPlayer = i; 
            }
        }
    }

    void StartTurn()
    {
        if (gameOver) return;

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
        turnText.text = "Turn: P" + (currentPlayer + 1) + (players[currentPlayer].role == Player.Role.Sheriff ? " (Sheriff)" : "");

        ResetPlayerButtons();
        UpdateAllPlayerUI();
        UpdateDiceVisuals();
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
        if (rollsLeft <= 0 || gameOver) return;

        dynamiteCount = 0;

        for (int i = 0; i < diceTexts.Length; i++)
        {
            if (diceLocked[i]) continue;

            int dice = Random.Range(0, 6);
            DiceType result = (DiceType)dice;
            currentDice[i] = result;
            diceTexts[i].text = result.ToString();

            if (result == DiceType.Arrow)
            {
                if (arrowsInCenter > 0)
                {
                    arrowsInCenter--;
                    players[currentPlayer].arrows++;
                    
                    if (arrowsInCenter == 0)
                    {
                        for (int j = 0; j < totalPlayers; j++)
                        {
                            if (!players[j].alive) continue;
                            players[j].health -= players[j].arrows;
                            if (players[j].health <= 0) KillPlayer(j);
                            
                            players[j].arrows = 0;
                        }
                        arrowsInCenter = 9;
                    }
                }
            }

            if (result == DiceType.Dynamite)
            {
                diceLocked[i] = true;
                dynamiteCount++;
            }
        }

        rollsLeft--;
        rollsText.text = "Rolls: " + rollsLeft;
        UpdateAllPlayerUI();
        UpdateDiceVisuals();
        CheckWinCondition();

        if (dynamiteCount >= 3 && !gameOver)
        {
            players[currentPlayer].health--;
            if (players[currentPlayer].health <= 0) KillPlayer(currentPlayer);
            rollsLeft = 0;
            UpdateAllPlayerUI();
            CheckWinCondition();
        }
    }

    public void ResolveDice()
    {
        if (gameOver) return;

        pendingShots = 0;
        pendingBeers = 0;

        for (int i = 0; i < currentDice.Length; i++)
        {
            DiceType d = currentDice[i];
            if (d == DiceType.Shoot1 || d == DiceType.Shoot2) pendingShots++;
            if (d == DiceType.Beer) pendingBeers++;
        }

        if (pendingShots > 0)
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
        ResetPlayerButtons();
        for (int i = 0; i < totalPlayers; i++)
            if (players[i].alive) playerButtons[i].interactable = true;
    }

    void ShowTargetsForShoot(DiceType type)
    {
        ResetPlayerButtons();

        int aliveCount = players.Count(p => p.alive);
        int distance = (type == DiceType.Shoot1 || aliveCount <= 3) ? 1 : 2;

        for (int i = 0; i < totalPlayers; i++)
        {
            if (!players[i].alive || i == currentPlayer) continue;

            int distCW = 0;
            int curr = currentPlayer;
            while (curr != i)
            {
                curr = (curr + 1) % totalPlayers;
                if (players[curr].alive) distCW++;
            }

            int distCCW = 0;
            curr = currentPlayer;
            while (curr != i)
            {
                curr = (curr - 1 + totalPlayers) % totalPlayers;
                if (players[curr].alive) distCCW++;
            }

            if (distCW == distance || distCCW == distance)
            {
                playerButtons[i].interactable = true;
            }
        }
    }

    public void SelectTarget(int target)
    {
        if (!players[target].alive || gameOver) return;

        if (pendingType == DiceType.Shoot1 || pendingType == DiceType.Shoot2)
        {
            players[target].health--;
            if (players[target].health <= 0) KillPlayer(target);
            pendingShots--;

            for (int i = 0; i < currentDice.Length; i++)
            {
                if (currentDice[i] == pendingType)
                {
                    currentDice[i] = DiceType.Arrow; 
                    break;
                }
            }

            CheckWinCondition();
            if (gameOver) return;

            if (pendingShots > 0)
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
                UpdateAllPlayerUI();
                return;
            }
            else if (pendingBeers > 0)
            {
                pendingType = DiceType.Beer;
                ShowTargetsForBeer();
                UpdateAllPlayerUI();
                return;
            }
        }
        else if (pendingType == DiceType.Beer)
        {
            players[target].health++;
            if (players[target].health > players[target].maxHealth) players[target].health = players[target].maxHealth;
            pendingBeers--;

            if (pendingBeers > 0)
            {
                ShowTargetsForBeer();
                UpdateAllPlayerUI();
                return;
            }
        }

        UpdateAllPlayerUI();
        ResolveGatling();
    }

    void ResolveGatling()
    {
        int gatlingCount = currentDice.Count(d => d == DiceType.Gatling);

        if (gatlingCount >= 3)
        {
            for (int i = 0; i < totalPlayers; i++)
            {
                if (i == currentPlayer || !players[i].alive) continue;
                players[i].health--;
                if (players[i].health <= 0) KillPlayer(i);
            }
            arrowsInCenter += players[currentPlayer].arrows;
            players[currentPlayer].arrows = 0;
        }

        UpdateAllPlayerUI();
        CheckWinCondition();
        if (!gameOver) NextTurn();
    }

    void KillPlayer(int playerIndex)
    {
        players[playerIndex].alive = false;
        arrowsInCenter += players[playerIndex].arrows;
        players[playerIndex].arrows = 0;
    }

    void CheckWinCondition()
    {
        bool sheriffAlive = false;
        int outlawsAlive = 0;
        int renegadesAlive = 0;
        int totalAlive = 0;

        foreach (var p in players)
        {
            if (p.alive)
            {
                totalAlive++;
                if (p.role == Player.Role.Sheriff) sheriffAlive = true;
                if (p.role == Player.Role.Outlaw) outlawsAlive++;
                if (p.role == Player.Role.Renegade) renegadesAlive++;
            }
        }

        if (!sheriffAlive)
        {
            gameOver = true;
            if (renegadesAlive == 1 && totalAlive == 1)
            {
                turnText.text = "RENEGADE WINS!";
            }
            else
            {
                turnText.text = "OUTLAWS WIN!";
            }
        }
        else if (outlawsAlive == 0 && renegadesAlive == 0)
        {
            gameOver = true;
            turnText.text = "SHERIFF WINS!";
        }
    }

    void NextTurn()
    {
        int aliveCount = players.Count(p => p.alive);
        if (aliveCount <= 1) return;

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
        if (currentDice[index] == DiceType.Dynamite || gameOver) return;
        diceLocked[index] = !diceLocked[index];
        UpdateDiceVisuals();
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
            
            if (players[i].roleText != null)
            {
                if (players[i].role == Player.Role.Sheriff || !players[i].alive)
                {
                    players[i].roleText.text = players[i].role.ToString();
                    players[i].roleText.color = Color.blue;
                }
                else
                {
                    players[i].roleText.text = "???"; 
                    players[i].roleText.color = Color.black;
                }
            }
        }
        centerArrowsText.text = "Center: " + arrowsInCenter;
    }
}