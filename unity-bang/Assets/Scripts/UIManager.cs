using UnityEngine;
using TMPro;
using UnityEngine.UI;

public class UIManager : MonoBehaviour
{
    public GameManager gameManager;

    [Header("Dice UI")]
    public TextMeshProUGUI[] diceTexts;

    [Header("Global UI")]
    public TextMeshProUGUI rollsText;
    public TextMeshProUGUI centerArrowsText;
    public TextMeshProUGUI turnText;
    
    [Header("Popup UI")]
    public GameObject characterPopup; 
    public TextMeshProUGUI popupTitle;
    public TextMeshProUGUI popupDescription;

    // Arrays internos para guardar os elementos de cada jogador
    Button[] playerButtons;
    TextMeshProUGUI[] healthTexts;
    TextMeshProUGUI[] arrowsTexts;
    TextMeshProUGUI[] roleTexts;
    TextMeshProUGUI[] characterTexts;
    Button[] infoButtons;
    Button[] abilityButtons; // O NOVO BOTÃO DE HABILIDADE

    int currentPopupPlayer = -1;

    void Awake()
    {
        gameManager = GetComponent<GameManager>();
    }

    public void SetupPlayersUI(int totalPlayers)
    {
        Transform playersContainer = GameObject.Find("Players").transform;
        
        playerButtons = new Button[totalPlayers];
        healthTexts = new TextMeshProUGUI[totalPlayers];
        arrowsTexts = new TextMeshProUGUI[totalPlayers];
        roleTexts = new TextMeshProUGUI[totalPlayers];
        characterTexts = new TextMeshProUGUI[totalPlayers];
        infoButtons = new Button[totalPlayers];
        abilityButtons = new Button[totalPlayers]; // Inicializando a lista de botões de habilidade

        for (int i = 0; i < totalPlayers; i++)
        {
            int index = i; 
            Transform p = playersContainer.GetChild(i);
            
            playerButtons[i] = p.GetComponent<Button>();
            playerButtons[i].onClick.RemoveAllListeners();
            playerButtons[i].onClick.AddListener(() => gameManager.SelectTarget(index));

            Transform hpObj = p.Find("HP");
            if (hpObj != null) healthTexts[i] = hpObj.GetComponent<TextMeshProUGUI>();

            Transform arrowsObj = p.Find("Arrows");
            if (arrowsObj != null) arrowsTexts[i] = arrowsObj.GetComponent<TextMeshProUGUI>();

            Transform roleObj = p.Find("Role");
            if (roleObj != null) roleTexts[i] = roleObj.GetComponent<TextMeshProUGUI>();
            
            Transform charObj = p.Find("Character");
            if (charObj != null) characterTexts[i] = charObj.GetComponent<TextMeshProUGUI>();
            
            Transform btnObj = p.Find("Character/Info");
            if (btnObj != null) {
                infoButtons[i] = btnObj.GetComponent<Button>();
                infoButtons[i].onClick.RemoveAllListeners();
                infoButtons[i].onClick.AddListener(() => ToggleDescription(index));
            }

            // PESCANDO O BOTÃO DE HABILIDADE
            Transform abilityObj = p.Find("Character/Ability");
            if (abilityObj != null) {
                abilityButtons[i] = abilityObj.GetComponent<Button>();
                abilityButtons[i].onClick.RemoveAllListeners();
                abilityButtons[i].onClick.AddListener(() => gameManager.UseAbility(index));
            }
        }

        for (int i = 0; i < diceTexts.Length; i++)
        {
            int index = i;
            diceTexts[i].GetComponent<Button>().onClick.RemoveAllListeners();
            diceTexts[i].GetComponent<Button>().onClick.AddListener(() => gameManager.ToggleDiceLock(index));
        }

        if(characterPopup != null) characterPopup.SetActive(false);
    }

    public void UpdateAllPlayerUI()
    {
        for (int i = 0; i < gameManager.totalPlayers; i++)
        {
            Player p = gameManager.players[i];
            
            if (healthTexts[i] != null) healthTexts[i].text = "HP: " + p.health;
            if (arrowsTexts[i] != null) arrowsTexts[i].text = "Arrows: " + p.arrows;
            if (characterTexts[i] != null) characterTexts[i].text = p.character.ToString();
            
            if (roleTexts[i] != null) 
            {
                if (p.role == Player.Role.Sheriff || !p.alive) {
                    roleTexts[i].text = p.role.ToString(); 
                    roleTexts[i].color = Color.blue;
                } else {
                    roleTexts[i].text = "???"; 
                    roleTexts[i].color = Color.black;
                }
            }

            // ESCONDER/MOSTRAR BOTÃO DE HABILIDADE
            if (abilityButtons[i] != null)
            {
                bool hasActiveAbility = (
                    p.character == Player.CharacterType.SlabOAssassino ||
                    p.character == Player.CharacterType.SidKetchum ||
                    p.character == Player.CharacterType.JaneCalamidade ||
                    p.character == Player.CharacterType.KitCarlson ||
                    p.character == Player.CharacterType.BartCassidy
                );
                
                abilityButtons[i].gameObject.SetActive(hasActiveAbility && p.alive);
            }
        }

        if (rollsText != null) rollsText.text = "Rolls: " + gameManager.rollsLeft;
        if (centerArrowsText != null) centerArrowsText.text = "Center: " + gameManager.arrowsInCenter;
        
        if (turnText != null) {
            turnText.text = "Turn: P" + (gameManager.currentPlayer + 1) + 
            (gameManager.players[gameManager.currentPlayer].role == Player.Role.Sheriff ? " (Sheriff)" : "");
        }
    }

    public void UpdateDiceVisuals(GameManager.DiceType[] currentDice, bool[] diceLocked)
    {
        for (int i = 0; i < diceTexts.Length; i++)
        {
            diceTexts[i].text = currentDice[i].ToString();
            if ((int)currentDice[i] == 0 && !diceLocked[i] && gameManager.rollsLeft == gameManager.GetMaxRolls()) 
                diceTexts[i].text = "";
                
            diceTexts[i].color = diceLocked[i] ? Color.red : Color.black;
        }
    }

    public void ResetPlayerButtons()
    {
        for (int i = 0; i < playerButtons.Length; i++)
        {
            playerButtons[i].interactable = false;
            TextMeshProUGUI btnText = playerButtons[i].GetComponent<TextMeshProUGUI>();
            if (btnText != null) btnText.color = gameManager.players[i].alive ? Color.black : Color.gray;
        }
    }

    public void SetPlayerButtonInteractable(int index, bool state)
    {
        if(playerButtons[index] != null) playerButtons[index].interactable = state;
    }

    public void ToggleDescription(int playerIndex)
    {
        if (characterPopup == null) return;

        if (characterPopup.activeSelf && currentPopupPlayer == playerIndex)
        {
            ClosePopup();
            return;
        }

        Player p = gameManager.players[playerIndex];
        
        if (popupTitle != null) popupTitle.text = $"{p.character.ToString().ToUpper()} ({p.maxHealth})";
        if (popupDescription != null) popupDescription.text = gameManager.GetCharacterAbility(p.character);
        
        characterPopup.SetActive(true);
        currentPopupPlayer = playerIndex;
    }

    public void ClosePopup()
    {
        if(characterPopup != null) characterPopup.SetActive(false);
        currentPopupPlayer = -1;
    }

    public void ShowGameOver(string message)
    {
        if(turnText != null) turnText.text = message;
    }
}