// =============================================
// Bang! The Dice Game — Complete Game Engine
// Based on the official rules (Portuguese edition)
// =============================================

export const Roles = {
  Sheriff: 'Sheriff',
  Deputy: 'Deputy',
  Outlaw: 'Outlaw',
  Renegade: 'Renegade',
};

export const Characters = {
  BartCassidy: 'BartCassidy',
  BlackJack: 'BlackJack',
  PaulRegret: 'PaulRegret',
  PedroRamirez: 'PedroRamirez',
  JaneCalamidade: 'JaneCalamidade',
  ElGringo: 'ElGringo',
  RoseDoolan: 'RoseDoolan',
  SidKetchum: 'SidKetchum',
  JesseJones: 'JesseJones',
  Jourdonnais: 'Jourdonnais',
  SlabOAssassino: 'SlabOAssassino',
  SuzyLafayette: 'SuzyLafayette',
  KitCarlson: 'KitCarlson',
  SamOAbutre: 'SamOAbutre',
  DukeSortudo: 'DukeSortudo',
  WillyTheKid: 'WillyTheKid',
};

export const DiceFace = {
  Arrow: 'Arrow',
  Dynamite: 'Dynamite',
  Shoot1: 'Shoot1',
  Shoot2: 'Shoot2',
  Beer: 'Beer',
  Gatling: 'Gatling',
};

// Used to mark a die as "spent" after it's been resolved
// so the UI can grey it out correctly
export const DiceState = {
  Unrolled: 'Unrolled',
  Active: 'Active',
  Locked: 'Locked', // Dynamite forced-lock
  Spent: 'Spent',  // Used by resolution
  HeldByPlayer: 'HeldByPlayer', // Voluntarily locked by player
};

export const SpecialAction = {
  None: 'None',
  SidKetchum: 'SidKetchum',
  KitCarlson: 'KitCarlson',
};

// Phase of the round
export const Phase = {
  Rolling: 'Rolling',     // Player is rolling dice
  Resolving: 'Resolving',   // Player must choose a target (shoot/beer)
  SpecialAbility: 'SpecialAbility', // Waiting for target selection for an ability
  TurnEnd: 'TurnEnd',     // Gatling / Arrow auto-resolved, next turn pending
};

// ── Character data ────────────────────────────────────────────────────────────
export const CharacterBaseHP = {
  BartCassidy: 8, BlackJack: 8, PaulRegret: 9, PedroRamirez: 8,
  JaneCalamidade: 8, ElGringo: 7, RoseDoolan: 9, SidKetchum: 8,
  JesseJones: 9, Jourdonnais: 7, SlabOAssassino: 8, SuzyLafayette: 8,
  KitCarlson: 7, SamOAbutre: 9, DukeSortudo: 8, WillyTheKid: 8,
};

export const characterAbilities = {
  BartCassidy: "Pode trocar 1 HP por 1 Flecha (não funciona com Indígenas ou Dinamite).",
  BlackJack: "Pode re-rolar 1 Dinamite por turno (se < 3 Dinamites no total).",
  PaulRegret: "Imune à Metralhadora Gatling.",
  PedroRamirez: "Ao tomar dano, descarta Flechas iguais ao dano (em vez de perder HP).",
  JaneCalamidade: "Pode trocar Alvo 1 por Alvo 2 e vice-versa a qualquer momento.",
  ElGringo: "Quando perde HP por Tiro, o atirador deve pegar 1 Flecha.",
  RoseDoolan: "Seus tiros alcançam 1 posição extra.",
  SidKetchum: "No início do turno, pode curar 1 HP em qualquer jogador.",
  JesseJones: "Cerveja cura 2 HP se sua vida estiver em 4 ou menos.",
  Jourdonnais: "Nunca perde mais de 1 HP no Ataque dos Indígenas.",
  SlabOAssassino: "Uma vez por turno, usa 1 Cerveja para ganhar 1 Tiro extra.",
  SuzyLafayette: "Se não tiver nenhum Tiro ao resolver, ganha 2 HP.",
  KitCarlson: "Cada Gatling descarta 1 Flecha de um jogador à escolha.",
  SamOAbutre: "Ganha 2 HP sempre que outro jogador morre.",
  DukeSortudo: "Pode rolar os dados 4 vezes no total (em vez de 3).",
  WillyTheKid: "Metralhadora ativa com apenas 2 Gatlins (em vez de 3).",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ALL_FACES = Object.values(DiceFace);
const randomFace = () => ALL_FACES[Math.floor(Math.random() * ALL_FACES.length)];

// ── GameEngine class ──────────────────────────────────────────────────────────
export class GameEngine {
  constructor(totalPlayers = 4) {
    this.totalPlayers = Math.max(3, Math.min(8, totalPlayers));
    this._init();
  }

  _init() {
    this.players = [];
    this.currentPlayerIdx = 0;
    this.arrowsInCenter = 9;
    this.gameOver = false;
    this.winner = null;
    this.logs = [];

    // Round state
    this.phase = Phase.Rolling;
    this.rollsLeft = 0;
    this.maxRolls = 3;
    this.dice = Array(5).fill(null).map(() => ({
      face: DiceFace.Arrow,
      state: DiceState.Unrolled,
    }));

    // Resolution queue
    this.pendingShots = 0; // how many Shoot actions still need targets
    this.pendingBeers = 0; // how many Beer actions still need targets
    this.pendingType = null; // DiceFace currently needing target
    this.resolutionQueue = []; // indices of dice needing targets, in order

    // Special ability gate
    this.pendingAction = SpecialAction.None;
    this.abilityUsedThisTurn = false;

    // Damage flash set (player indices that just took damage, for UI)
    this.damagedThisTick = [];
    // Queued shot targets (for simultaneous Shoot resolution per official rules)
    this.pendingShotTargets = [];

    // 3-player mode objectives (Personal Target)
    this.playerObjectives = {};
    this.duelMode = false;
    this.swapRange = false;

    this._assignRoles();
    this._assignCharacters();
    this._startTurn();
  }

  reset() { this._init(); }

  // ── Setup ──────────────────────────────────────────────────────────────────
  _assignRoles() {
    let pool = [];
    if (this.totalPlayers === 3) {
      pool = [Roles.Deputy, Roles.Outlaw, Roles.Renegade];
    } else {
      pool = [Roles.Sheriff, Roles.Renegade, Roles.Outlaw, Roles.Outlaw];
      if (this.totalPlayers >= 5) pool.push(Roles.Deputy);
      if (this.totalPlayers >= 6) pool.push(Roles.Outlaw);
      if (this.totalPlayers >= 7) pool.push(Roles.Deputy);
      if (this.totalPlayers >= 8) pool.push(Roles.Renegade);
    }
    pool = shuffle(pool);

    for (let i = 0; i < this.totalPlayers; i++) {
      this.players.push({
        id: i, role: pool[i], character: null,
        health: 0, maxHealth: 0, arrows: 0, alive: true,
      });
      if (pool[i] === Roles.Sheriff || (this.totalPlayers === 3 && pool[i] === Roles.Deputy)) {
        this.currentPlayerIdx = i;
      }
    }

    // Set 3-player objectives
    if (this.totalPlayers === 3) {
      const depIdx = this.players.findIndex(p => p.role === Roles.Deputy);
      const outIdx = this.players.findIndex(p => p.role === Roles.Outlaw);
      const renIdx = this.players.findIndex(p => p.role === Roles.Renegade);
      this.playerObjectives[depIdx] = renIdx; // Deputy -> Renegade
      this.playerObjectives[renIdx] = outIdx; // Renegade -> Outlaw
      this.playerObjectives[outIdx] = depIdx; // Outlaw -> Deputy
    }
  }

  _assignCharacters() {
    const deck = shuffle(Object.values(Characters));
    for (let i = 0; i < this.totalPlayers; i++) {
      const c = deck[i];
      this.players[i].character = c;
      this.players[i].maxHealth = CharacterBaseHP[c];
      if (this.players[i].role === Roles.Sheriff) this.players[i].maxHealth += 2;
      this.players[i].health = this.players[i].maxHealth;
    }
  }

  _startTurn() {
    if (this.gameOver) return;
    const p = this.players[this.currentPlayerIdx];
    if (!p.alive) { this._nextTurn(); return; }

    this.maxRolls = p.character === Characters.DukeSortudo ? 4 : 3;
    this.rollsLeft = this.maxRolls;
    this.phase = Phase.Rolling;
    this.pendingShots = 0;
    this.pendingBeers = 0;
    this.pendingType = null;
    this.resolutionQueue = [];
    this.pendingAction = SpecialAction.None;
    this.abilityUsedThisTurn = false;
    this.damagedThisTick = [];
    this.pendingShotTargets = []; // queued targets for simultaneous shoot resolve
    this.swapRange = false; // Jane Calamidade toggle

    // Reset all dice
    this.dice = Array(5).fill(null).map(() => ({
      face: DiceFace.Arrow, state: DiceState.Unrolled,
    }));

    this.abilityUsedThisTurn = false;
    this._log(`⭐ Turno de Jogador ${p.id + 1} (${p.character}, ${p.role})`);
  }

  // ── Dice Management ────────────────────────────────────────────────────────

  /** Unified Roll Method: Performs the roll and applies results immediately */
  roll() {
    const faces = this.requestRoll();
    if (!faces) return null;
    this.commitRollResults(faces);
    return faces;
  }

  /** Called by UI when the Roll button is pressed.
   *  Randomises all Active/Unrolled dice and returns the new faces array
   *  for the physics engine to animate to.
   */
  requestRoll() {
    const p = this.players[this.currentPlayerIdx];
    if (this.rollsLeft <= 0 || this.gameOver || !p.alive || this.phase !== Phase.Rolling) return null;
    if (this.pendingAction !== SpecialAction.None) return null;

    const newFaces = [];
    for (let i = 0; i < this.dice.length; i++) {
      const d = this.dice[i];
      const isLocked = d.state === DiceState.Locked || d.state === DiceState.HeldByPlayer;
      if (!isLocked) {
        d.face = randomFace();
        d.state = DiceState.Active;
      }
      newFaces.push(d.face);
    }
    return newFaces;
  }

  /** Called internally once dice values are known.
   *  Applies Arrow/Dynamite effects, decrements rollsLeft.
   */
  commitRollResults(settledFaces) {
    if (this.gameOver) return;
    if (!settledFaces || settledFaces.length !== 5) return;
    // Guard: if phase changed (e.g. already resolved) ignore stale commit
    if (this.phase !== Phase.Rolling) return;
    const p = this.players[this.currentPlayerIdx];
    if (!p.alive) return;

    this.damagedThisTick = [];

    for (let i = 0; i < this.dice.length; i++) {
      const d = this.dice[i];
      // Note: we use the passed settledFaces to ensure we match what was rolled/requested
      const isPreviouslyLocked = d.state === DiceState.Locked || d.state === DiceState.HeldByPlayer;

      if (!isPreviouslyLocked) {
        d.face = settledFaces[i];
        d.state = DiceState.Active;

        // Arrows are immediate, but stay active to be re-rolled
        if (d.face === DiceFace.Arrow) {
          d.state = DiceState.Active;
          this._giveArrow(this.currentPlayerIdx);
        }

        // Dynamite locks die immediately
        if (d.face === DiceFace.Dynamite) {
          d.state = DiceState.Locked;
        }
      }
    }

    // Check triple dynamite BOOM
    const dynamiteCount = this.dice.filter(d => d.face === DiceFace.Dynamite).length;
    this.rollsLeft--;

    if (dynamiteCount >= 3) {
      this._log('💥 BOOM! 3 Dinamites — Jogador sofre 1 de dano e perde o turno!');
      this._takeDamage(this.currentPlayerIdx, 1);
      this.rollsLeft = 0;
      this._checkWin();
      if (this.gameOver) return;
      // Rule: turn ends immediately after dynamite explosion — no other dice resolved
      this._nextTurn();
      return;
    }

    // Run win check (arrows may have killed someone)
    this._checkWin();
    if (this.gameOver) return;

    // If no rolls left, start resolution
    if (this.rollsLeft <= 0) this._beginResolution();
  }

  toggleHold(diceIndex) {
    const d = this.dice[diceIndex];
    if (!d || this.phase !== Phase.Rolling) return;
    if (d.state === DiceState.Unrolled) return; // nothing to hold
    if (d.state === DiceState.Locked) {
      // Only BlackJack can unlock a Dynamite if < 3 dynamites
      const p = this.players[this.currentPlayerIdx];
      if (p.character === Characters.BlackJack) {
        const cnt = this.dice.filter(x => x.face === DiceFace.Dynamite && x.state === DiceState.Locked).length;
        if (cnt < 3) d.state = DiceState.Active;
      }
      return;
    }
    if (d.state === DiceState.HeldByPlayer) {
      d.state = DiceState.Active;
    } else if (d.state === DiceState.Active) {
      d.state = DiceState.HeldByPlayer;
    }
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  _beginResolution() {
    if (this.gameOver) return;
    const p = this.players[this.currentPlayerIdx];

    // SuzyLafayette: if 0 shots, gain 2 HP
    const shotCount = this.dice.filter(d =>
      (d.face === DiceFace.Shoot1 || d.face === DiceFace.Shoot2) &&
      d.state !== DiceState.Spent
    ).length;
    if (p.character === Characters.SuzyLafayette && shotCount === 0) {
      this._healPlayer(this.currentPlayerIdx, 2);
      this._log(`🍀 Suzy Lafayette cura 2 HP!`);
    }

    this.pendingShots = shotCount;
    this.pendingBeers = this.dice.filter(d => d.face === DiceFace.Beer && d.state !== DiceState.Spent).length;
    this.resolutionQueue = [];
    this.phase = Phase.Resolving;

    this._advanceResolution();
  }

  _advanceResolution() {
    if (this.gameOver) return;

    if (this.pendingShots > 0) {
      // Prioritize Shoot 1 before Shoot 2
      let die = this.dice.find(d => d.face === DiceFace.Shoot1 && d.state !== DiceState.Spent);
      if (!die) die = this.dice.find(d => d.face === DiceFace.Shoot2 && d.state !== DiceState.Spent);

      if (die) {
        this.pendingType = die.face;
        return; // wait for target selection
      }
    }

    if (this.pendingBeers > 0) {
      this.pendingType = DiceFace.Beer;
      return; // wait for target selection
    }

    // No more interactive resolution – fire Gatling then end turn
    this.pendingType = null;
    this._resolveGatling();
  }

  /** Called by UI when a player card is clicked during resolution or special ability */
  selectTarget(targetIdx) {
    if (this.gameOver) return;
    if (!this.players[targetIdx].alive) return;

    // ── Special Ability targets ────────────────────────────────────────────
    if (this.pendingAction === SpecialAction.SidKetchum) {
      this._healPlayer(targetIdx, 1);
      this._log(`💊 Sid Ketchum cura 1 HP de Jogador ${targetIdx + 1}.`);
      this.pendingAction = SpecialAction.None;
      this.abilityUsedThisTurn = true;
      this.phase = Phase.Rolling;
      return;
    }

    if (this.pendingAction === SpecialAction.KitCarlson) {
      if (this.players[targetIdx].arrows > 0) {
        this.players[targetIdx].arrows--;
        this.arrowsInCenter++;
        // Spend the Gatling die that was used
        const gatDie = this.dice.find(d => d.face === DiceFace.Gatling && d.state !== DiceState.Spent);
        if (gatDie) gatDie.state = DiceState.Spent;
        this._log(`🎯 Kit Carlson remove 1 flecha de Jogador ${targetIdx + 1}.`);
      }
      this.pendingAction = SpecialAction.None;
      return;
    }

    // ── Shoot resolution (targets queued, damage applied simultaneously) ────
    if (this.pendingType === DiceFace.Shoot1 || this.pendingType === DiceFace.Shoot2) {
      const die = this.dice.find(d => d.face === this.pendingType && d.state !== DiceState.Spent);
      if (die) die.state = DiceState.Spent;

      // Queue the hit — do NOT apply damage yet (rule: assign all, then resolve)
      this.pendingShotTargets.push({ targetIdx, sourceIdx: this.currentPlayerIdx });
      this._log(`📌 Jogador ${targetIdx + 1} marcado para receber 1 dano.`);
      this.pendingShots--;
      this.swapRange = false;

      if (this.pendingShots <= 0) {
        // All targets assigned — now apply all damage simultaneously
        this._applyPendingShots();
        this.resolutionQueue = [];
        this._advanceResolution();
      }
      return;
    }

    // ── Beer resolution ────────────────────────────────────────────────────
    if (this.pendingType === DiceFace.Beer) {
      let healAmt = 1;
      const p = this.players[this.currentPlayerIdx];
      // JesseJones: +2 HP on self beer if HP ≤ 4
      if (targetIdx === this.currentPlayerIdx &&
        p.character === Characters.JesseJones &&
        p.health <= 4) {
        healAmt = 2;
      }
      this._healPlayer(targetIdx, healAmt);
      this._log(`🍺 Cerveja cura ${healAmt} HP de Jogador ${targetIdx + 1}.`);

      const beerDie = this.dice.find(d => d.face === DiceFace.Beer && d.state !== DiceState.Spent);
      if (beerDie) beerDie.state = DiceState.Spent;
      this.pendingBeers--;

      this._advanceResolution();
    }
  }

  /** Force-end the current player's turn without resolving remaining dice */
  forceContinue() {
    this._advanceResolution();
  }

  /** Apply all queued shot damage simultaneously (official rule compliance) */
  _applyPendingShots() {
    for (const { targetIdx, sourceIdx } of this.pendingShotTargets) {
      // Player may still be alive at this point even if multiple shots aimed at them
      this._takeDamage(targetIdx, 1, sourceIdx);
    }
    this.pendingShotTargets = [];
    this._checkWin();
  }

  _resolveGatling() {
    const p = this.players[this.currentPlayerIdx];
    const requiredGats = p.character === Characters.WillyTheKid ? 2 : 3;
    const gatCount = this.dice.filter(d => d.face === DiceFace.Gatling && d.state !== DiceState.Spent).length;

    if (gatCount >= requiredGats) {
      this._log(`🔫 METRALHADORA GATLING! (${gatCount} Gatlins ≥ ${requiredGats})`);
      for (let i = 0; i < this.totalPlayers; i++) {
        if (i === this.currentPlayerIdx) continue;
        if (!this.players[i].alive) continue;
        if (this.players[i].character === Characters.PaulRegret) {
          this._log(`😎 Paul Regret ignora a Gatling!`);
          continue;
        }
        this._takeDamage(i, 1, this.currentPlayerIdx);
      }
      // Shooter discards all arrows
      this.arrowsInCenter += p.arrows;
      p.arrows = 0;
      this._log(`⬆️ Jogador ${p.id + 1} descarta todas as flechas após Gatling.`);

      // Spend all gatling dice
      this.dice.forEach(d => { if (d.face === DiceFace.Gatling) d.state = DiceState.Spent; });
    }

    this._checkWin();
    if (!this.gameOver) this._nextTurn();
  }

  // ── Character Abilities ────────────────────────────────────────────────────

  useAbility() {
    if (this.gameOver) return;
    const p = this.players[this.currentPlayerIdx];

    // Cancel pending ability
    if (this.pendingAction !== SpecialAction.None) {
      this.pendingAction = SpecialAction.None;
      this.phase = Phase.Rolling;
      return;
    }

    switch (p.character) {
      case Characters.SidKetchum:
        if (!this.abilityUsedThisTurn && this.rollsLeft === this.maxRolls) {
          this.pendingAction = SpecialAction.SidKetchum;
          this.phase = Phase.SpecialAbility;
          this._log(`🎩 Sid Ketchum ativa cura — escolha um alvo.`);
        }
        break;

      case Characters.SlabOAssassino: {
        if (this.abilityUsedThisTurn) break;
        const beerIdx = this.dice.findIndex(d => d.face === DiceFace.Beer && d.state === DiceState.Active);
        const shootIdx = this.dice.findIndex(d =>
          (d.face === DiceFace.Shoot1 || d.face === DiceFace.Shoot2) && d.state === DiceState.Active);
        if (beerIdx >= 0 && shootIdx >= 0) {
          this.dice[beerIdx].face = this.dice[shootIdx].face;
          this.dice[beerIdx].state = DiceState.Active;
          this.abilityUsedThisTurn = true;
          this._log(`🔁 Slab O Assassino converte Cerveja em Tiro extra!`);
        }
        break;
      }

      case Characters.JaneCalamidade:
        if (this.phase === Phase.Resolving) {
          this.swapRange = !this.swapRange;
          this._log(`🔄 Jane Calamidade ${this.swapRange ? 'ativa' : 'desativa'} conversão de alcance.`);
        } else {
          this.dice.forEach(d => {
            if (d.state === DiceState.Active || d.state === DiceState.HeldByPlayer) {
              if (d.face === DiceFace.Shoot1) d.face = DiceFace.Shoot2;
              else if (d.face === DiceFace.Shoot2) d.face = DiceFace.Shoot1;
            }
          });
          this._log(`🔄 Jane Calamidade inverte Alvo 1 ↔ Alvo 2.`);
        }
        break;

      case Characters.KitCarlson: {
        // Discard arrow if any available and he has unspent Gatling die
        const pWithArrows = this.players.filter(x => x.alive && x.arrows > 0);
        if (pWithArrows.length > 0) {
          const gatDie = this.dice.find(d => d.face === DiceFace.Gatling && d.state !== DiceState.Spent);
          if (gatDie) {
            this.pendingAction = SpecialAction.KitCarlson;
            this._log(`🎴 Kit Carlson: Escolha quem perde 1 Flecha.`);
          }
        }
        break;
      }

      case Characters.BartCassidy:
        if (p.health < p.maxHealth && this.arrowsInCenter > 0) {
          p.health = Math.min(p.health + 1, p.maxHealth);
          this._giveArrow(this.currentPlayerIdx);
          this._log(`🔁 Bart Cassidy: +1 HP, +1 Flecha própria.`);
        }
        break;

      default:
        break;
    }
  }

  // ── Arrow / Damage Helpers ─────────────────────────────────────────────────

  _giveArrow(pIdx) {
    if (this.arrowsInCenter <= 0) return;
    this.arrowsInCenter--;
    this.players[pIdx].arrows++;
    this._log(`➵ Jogador ${pIdx + 1} pega 1 flecha (${this.players[pIdx].arrows} total, ${this.arrowsInCenter} no centro)`);
    if (this.arrowsInCenter === 0) {
      this._log('🏹 ATAQUE DOS ÍNDIOS!');
      this._triggerIndianAttack();
    }
  }

  _triggerIndianAttack() {
    for (let i = 0; i < this.totalPlayers; i++) {
      const p = this.players[i];
      if (!p.alive || p.arrows === 0) continue;
      let dmg = p.arrows;
      if (p.character === Characters.Jourdonnais) {
        dmg = Math.min(dmg, 1);
        this._log(`🐊 Jourdonnais: dano limitado a 1.`);
      }
      // Indian attack does NOT trigger ElGringo or PedroRamirez arrow effects
      p.health -= dmg;
      p.arrows = 0;
      this._log(`🏹 Jogador ${i + 1} perde ${dmg} HP por Indígenas.`);
      if (p.health <= 0) this._killPlayer(i);
    }
    this.arrowsInCenter = 9;
    this._checkWin();
    // If current player died, transition immediately
    if (!this.players[this.currentPlayerIdx].alive && !this.gameOver) {
      this._nextTurn();
    }
  }

  _takeDamage(targetIdx, amount, sourceIdx = -1) {
    const p = this.players[targetIdx];
    if (!p.alive) return;

    // PedroRamirez: lose arrows instead of HP
    if (p.character === Characters.PedroRamirez && p.arrows > 0) {
      const used = Math.min(p.arrows, amount);
      p.arrows -= used;
      this.arrowsInCenter += used;
      amount -= used;
      this._log(`🔶 Pedro Ramirez: descarta ${used} flechas para bloquear ${used} de dano.`);
      if (amount <= 0) return;
    }

    p.health -= amount;
    if (!Array.isArray(this.damagedThisTick)) this.damagedThisTick = [];
    this.damagedThisTick.push(targetIdx);
    this._log(`💥 Jogador ${targetIdx + 1} perde ${amount} HP (${p.health}/${p.maxHealth})`);

    // Bart Cassidy: receives arrow per HP lost (excl Indians/Dynamite)
    if (p.character === Characters.BartCassidy && amount > 0 && sourceIdx !== -1) {
      for (let i = 0; i < amount; i++) this._giveArrow(targetIdx);
      this._log(`🎩 Bart Cassidy recebe ${amount} flecha(s) pelo dano sofrido.`);
    }

    // ElGringo: attacker gains arrows for each HP lost
    if (sourceIdx >= 0 && sourceIdx !== targetIdx && p.character === Characters.ElGringo) {
      for (let i = 0; i < amount; i++) this._giveArrow(sourceIdx);
      this._log(`😤 El Gringo: Jogador ${sourceIdx + 1} pega ${amount} flecha(s) por atirar!`);
    }

    if (p.health <= 0) this._killPlayer(targetIdx, sourceIdx);
  }

  _healPlayer(targetIdx, amount) {
    const p = this.players[targetIdx];
    if (!p.alive) return;
    const before = p.health;
    p.health = Math.min(p.health + amount, p.maxHealth);
    const gained = p.health - before;
    if (gained > 0) this._log(`💊 Jogador ${targetIdx + 1} cura ${gained} HP (${p.health}/${p.maxHealth})`);
  }

  _killPlayer(playerIdx, sourceIdx = -1) {
    const p = this.players[playerIdx];
    if (!p.alive) return;
    p.alive = false;
    this.arrowsInCenter += p.arrows;
    p.arrows = 0;
    this._log(`💀 Jogador ${playerIdx + 1} (${p.character}, ${p.role}) foi eliminado!`);

    // 3-player mode: if target is stolen (killed by someone else), move to Duel Mode
    if (this.totalPlayers === 3) {
      const remaining = this.players.filter(x => x.alive);
      if (remaining.length === 2 && !this.gameOver) {
        // Check who was supposed to kill whom
        for (let i = 0; i < this.totalPlayers; i++) {
          const goal = this.playerObjectives[i];
          if (goal === playerIdx && i !== sourceIdx) {
            this._log('⚔️ O Alvo foi roubado! Iniciando DUELO (último sobrevivente vence).');
            this.duelMode = true;
          }
        }
      }
    }

    // SamOAbutre heals when anyone dies
    for (let i = 0; i < this.totalPlayers; i++) {
      if (i !== playerIdx && this.players[i].alive &&
        this.players[i].character === Characters.SamOAbutre) {
        this._healPlayer(i, 2);
        this._log(`🦅 Sam O Abutre cura 2 HP.`);
      }
    }

    // Check if player who killed target wins (3-player mode)
    if (this.totalPlayers === 3 && sourceIdx >= 0 && !this.duelMode) {
      if (this.playerObjectives[sourceIdx] === playerIdx) {
        this.gameOver = true;
        this.winner = this.players[sourceIdx].role;
        this._log(`🏆 FIM: ${this.winner} completou seu objetivo pessoal!`);
      }
    }
  }

  // ── Win Conditions ─────────────────────────────────────────────────────────

  _checkWin() {
    if (this.totalPlayers === 3) {
      const alive = this.players.filter(p => p.alive);
      if (alive.length === 1 && !this.gameOver) {
        this.gameOver = true;
        this.winner = alive[0].role;
        this._log(`🏆 FIM: ${this.winner} é o último sobrevivente!`);
      }
      return;
    }

    let sheriffAlive = false;
    let outlawsAlive = 0;
    let renegadesAlive = 0;
    let totalAlive = 0;

    for (const p of this.players) {
      if (!p.alive) continue;
      totalAlive++;
      if (p.role === Roles.Sheriff) sheriffAlive = true;
      if (p.role === Roles.Outlaw) outlawsAlive++;
      if (p.role === Roles.Renegade) renegadesAlive++;
    }

    if (!sheriffAlive) {
      this.gameOver = true;
      // If only 1 alive and that's the Renegade, Renegade wins
      if (renegadesAlive === 1 && totalAlive === 1) {
        this.winner = 'Renegado';
        this._log('🏆 FIM: O RENEGADO venceu!');
      } else {
        this.winner = 'Foras-da-Lei';
        this._log('🏆 FIM: OS FORAS-DA-LEI venceram!');
      }
    } else if (outlawsAlive === 0 && renegadesAlive === 0) {
      this.gameOver = true;
      this.winner = 'Xerife e Vices';
      this._log('🏆 FIM: O XERIFE e seus VICES venceram!');
    }
  }

  // ── Turn Flow ──────────────────────────────────────────────────────────────

  _nextTurn() {
    const alive = this.players.filter(p => p.alive);
    if (alive.length <= 1) return;
    do {
      this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.totalPlayers;
    } while (!this.players[this.currentPlayerIdx].alive);
    this._startTurn();
  }

  // ── Valid Targets for UI ───────────────────────────────────────────────────

  getValidTargets() {
    const targets = [];
    const p = this.players[this.currentPlayerIdx];

    if (this.pendingAction === SpecialAction.SidKetchum) {
      // Can heal any wounded living player
      for (let i = 0; i < this.totalPlayers; i++) {
        if (this.players[i].alive && this.players[i].health < this.players[i].maxHealth)
          targets.push(i);
      }
      return targets;
    }

    if (this.pendingAction === SpecialAction.KitCarlson) {
      for (let i = 0; i < this.totalPlayers; i++) {
        if (this.players[i].alive && this.players[i].arrows > 0) targets.push(i);
      }
      return targets;
    }

    if (this.pendingType === DiceFace.Beer) {
      for (let i = 0; i < this.totalPlayers; i++) {
        if (this.players[i].alive) targets.push(i);
      }
      return targets;
    }

    if (this.pendingType === DiceFace.Shoot1 || this.pendingType === DiceFace.Shoot2) {
      const aliveCount = this.players.filter(q => q.alive).length;
      // Shoot2 only gets range 2 if ≥ 4 players alive
      let range = (this.pendingType === DiceFace.Shoot2 && aliveCount >= 4) ? 2 : 1;
      const isRose = p.character === Characters.RoseDoolan;
      const isJane = p.character === Characters.JaneCalamidade;

      // Jane Calamidade resolution-time swap
      if (isJane && this.swapRange) {
        range = range === 1 ? 2 : 1;
      }

      for (let i = 0; i < this.totalPlayers; i++) {
        if (!this.players[i].alive || i === this.currentPlayerIdx) continue;
        let cw = 0, ccw = 0, cur = this.currentPlayerIdx;
        while (cur !== i) {
          cur = (cur + 1) % this.totalPlayers;
          if (this.players[cur].alive) cw++;
        }
        cur = this.currentPlayerIdx;
        while (cur !== i) {
          cur = (cur - 1 + this.totalPlayers) % this.totalPlayers;
          if (this.players[cur].alive) ccw++;
        }
        const dist = Math.min(cw, ccw);

        // Shoot logic: Shoot 1 = distance 1. Shoot 2 = distance 2 (reverts to 1 if < 4 alive).
        const targetDist = range;
        if (dist === targetDist || (isRose && dist === targetDist + 1)) {
          targets.push(i);
        }
      }
      return targets;
    }

    return targets;
  }

  // ── Logging ────────────────────────────────────────────────────────────────

  _log(msg) {
    this.logs.push(msg);
    if (this.logs.length > 60) this.logs.shift();
  }

  // ── Public state snapshot ──────────────────────────────────────────────────

  getState() {
    return {
      players: this.players.map(p => ({ ...p })),
      currentPlayerIdx: this.currentPlayerIdx,
      rollsLeft: this.rollsLeft,
      maxRolls: this.maxRolls,
      arrowsInCenter: this.arrowsInCenter,
      dice: this.dice.map(d => ({ ...d })),
      gameOver: this.gameOver,
      winner: this.winner,
      phase: this.phase,
      pendingType: this.pendingType,
      pendingShots: this.pendingShots,
      pendingBeers: this.pendingBeers,
      pendingAction: this.pendingAction,
      swapRange: this.swapRange,
      validTargets: this.getValidTargets(),
      pendingShotTargets: [...this.pendingShotTargets],
      logs: [...this.logs],
      damagedThisTick: [...this.damagedThisTick],
      playerObjectives: { ...this.playerObjectives },
      duelMode: this.duelMode,
    };
  }

  /** Restore engine properties from a plain JSON state object */
  hydrate(state) {
    if (!state) return;
    this.totalPlayers = state.players.length;
    this.players = state.players.map(p => ({ ...p }));
    this.currentPlayerIdx = state.currentPlayerIdx;
    this.rollsLeft = state.rollsLeft;
    this.maxRolls = state.maxRolls;
    this.arrowsInCenter = state.arrowsInCenter;
    this.dice = state.dice.map(d => ({ ...d }));
    this.gameOver = state.gameOver;
    // 3-player mode objectives (Personal Target)
    this.playerObjectives = {}; // i -> target index
    this.duelMode = false;      // set to true if a target is stolen
    this.pendingType = state.pendingType;
    this.pendingShots = state.pendingShots;
    this.pendingBeers = state.pendingBeers;
    this.pendingAction = state.pendingAction;
    this.swapRange = state.swapRange || false;
    this.logs = [...(state.logs || [])];
    this.damagedThisTick = [...(state.damagedThisTick || [])];
    this.pendingShotTargets = [...(state.pendingShotTargets || [])];
    this.playerObjectives = { ...(state.playerObjectives || {}) };
    this.duelMode = state.duelMode || false;
  }
}
