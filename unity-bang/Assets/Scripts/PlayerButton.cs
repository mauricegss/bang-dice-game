using UnityEngine;

public class PlayerButton : MonoBehaviour
{
    public int playerIndex;
    public GameManager gameManager;

    public void ClickPlayer()
    {
        gameManager.SelectTarget(playerIndex);
    }
}