(function () {
  "use strict";

  const TARGET_PRESTIGE = 15;
  const RESERVE_LIMIT = 3;
  const MAX_TOKENS = 10;
  const LEADERBOARD_LIMIT = 5;
  const MATCH_LIMIT = 5;
  const PLAYER_KEY = "gem-guild-player";
  const PLAYER_COUNT_KEY = "gem-guild-player-count";
  const GUEST_KEY = "gem-guild-guest-id";
  const AI_NAMES = ["AI 维多利亚", "AI 奥古斯都", "AI 伊莎贝拉"];
  const HUMAN_SEATS = [2, 3, 4];
  const HUMAN_SEAT_NAME_KEYS = {
    2: "gem-guild-player-two",
    3: "gem-guild-player-three",
    4: "gem-guild-player-four"
  };
  const HUMAN_SEAT_ENABLED_KEYS = {
    2: "gem-guild-second-human",
    3: "gem-guild-third-human",
    4: "gem-guild-fourth-human"
  };

  const gems = [
    { id: "ruby", label: "红宝石", short: "红", className: "gem-ruby", color: "#d84a3d" },
    { id: "sapphire", label: "蓝宝石", short: "蓝", className: "gem-sapphire", color: "#286fd7" },
    { id: "emerald", label: "祖母绿", short: "绿", className: "gem-emerald", color: "#2fa45f" },
    { id: "diamond", label: "钻石", short: "白", className: "gem-diamond", color: "#e8e8de" },
    { id: "onyx", label: "玛瑙", short: "黑", className: "gem-onyx", color: "#272522" }
  ];

  const gold = { id: "gold", label: "黄金", short: "金", className: "gem-gold", color: "#d8b76b" };
  const allGems = gems.concat(gold);
  const gemIds = gems.map((gem) => gem.id);

  const cardNames = {
    ruby: ["红曜胸针", "赤焰酒窖", "蔷薇冠冕", "宫廷红印", "熔金项链", "红石码头"],
    sapphire: ["蓝港船队", "潮汐王冠", "深海珠阁", "星蓝袖扣", "海图塔楼", "蓝钻钟楼"],
    emerald: ["翡翠温室", "藤蔓庄园", "绿洲集市", "森林印章", "祖母绿杯", "苔光行会"],
    diamond: ["月白工坊", "银辉修院", "玻璃穹顶", "雪冠画廊", "白塔宝匣", "珍珠剧院"],
    onyx: ["黑曜矿井", "夜色账房", "玄铁长廊", "暗纹戒指", "乌木马车", "黑石书库"]
  };

  const nobleTemplates = [
    { name: "洛兰女公爵", cost: { ruby: 3, sapphire: 3, diamond: 3 } },
    { name: "维多利亚伯爵", cost: { emerald: 3, diamond: 3, onyx: 3 } },
    { name: "奥古斯都公爵", cost: { ruby: 4, onyx: 4 } },
    { name: "伊莎贝拉夫人", cost: { sapphire: 4, emerald: 4 } },
    { name: "卡斯蒂利亚亲王", cost: { ruby: 3, emerald: 3, onyx: 3 } },
    { name: "银港大使", cost: { sapphire: 3, diamond: 3, onyx: 3 } },
    { name: "翡翠议长", cost: { emerald: 4, diamond: 4 } },
    { name: "红堡总督", cost: { ruby: 3, sapphire: 3, emerald: 3 } }
  ];

  const elements = {
    tokenBank: document.querySelector("#token-bank"),
    takeLimit: document.querySelector("#take-limit"),
    selectionHint: document.querySelector("#selection-hint"),
    nobleList: document.querySelector("#noble-list"),
    tiers: {
      1: document.querySelector("#tier-1"),
      2: document.querySelector("#tier-2"),
      3: document.querySelector("#tier-3")
    },
    modeButtons: Array.from(document.querySelectorAll("[data-player-count]")),
    turnLabel: document.querySelector("#turn-label"),
    newGame: document.querySelector("#new-game-button"),
    rules: document.querySelector("#rules-button"),
    humanTitle: document.querySelector("#human-title"),
    humanPrestige: document.querySelector("#human-prestige"),
    humanTokens: document.querySelector("#human-tokens"),
    humanBonuses: document.querySelector("#human-bonuses"),
    roundLabel: document.querySelector("#round-label"),
    opponentStack: document.querySelector("#opponent-stack"),
    actionStatus: document.querySelector("#action-status"),
    actionCount: document.querySelector("#action-count"),
    buy: document.querySelector("#buy-button"),
    reserve: document.querySelector("#reserve-button"),
    take: document.querySelector("#take-button"),
    pass: document.querySelector("#pass-button"),
    reserveCount: document.querySelector("#reserve-count"),
    reservedList: document.querySelector("#reserved-list"),
    earnedSummary: document.querySelector("#earned-summary"),
    turnLog: document.querySelector("#turn-log"),
    modal: document.querySelector("#modal"),
    modalTitle: document.querySelector("#modal-title"),
    modalBody: document.querySelector("#modal-body"),
    modalPrimary: document.querySelector("#modal-primary"),
    modalSecondary: document.querySelector("#modal-secondary"),
    leaderboardList: document.querySelector("#leaderboard-list"),
    leaderboardStatus: document.querySelector("#leaderboard-status"),
    leaderboardRefresh: document.querySelector("#leaderboard-refresh"),
    scoreForm: document.querySelector("#score-form"),
    playerName: document.querySelector("#player-name"),
    seatRows: Array.from(document.querySelectorAll("[data-seat-row]")),
    seatNameInputs: Array.from(document.querySelectorAll("[data-seat-name]")),
    seatToggles: Array.from(document.querySelectorAll("[data-human-seat]")),
    submitScore: document.querySelector("#submit-score-button"),
    matchList: document.querySelector("#match-list"),
    matchStatus: document.querySelector("#match-status"),
    matchRefresh: document.querySelector("#match-refresh")
  };

  let state;
  let selectedPlayerCount = loadPlayerCount();
  let modalPrimaryAction = closeModal;
  let modalSecondaryAction = closeModal;

  function emptyGemMap(value) {
    return Object.fromEntries(allGems.map((gem) => [gem.id, value]));
  }

  function emptyColorMap(value) {
    return Object.fromEntries(gems.map((gem) => [gem.id, value]));
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function buildCost(tier, bonus, index, points) {
    const cost = emptyColorMap(0);
    const rotated = gemIds.filter((id) => id !== bonus);
    const first = rotated[index % rotated.length];
    const second = rotated[(index + 1) % rotated.length];
    const third = rotated[(index + 2) % rotated.length];
    const fourth = rotated[(index + 3) % rotated.length];

    if (tier === 1) {
      cost[first] = 1 + (index % 2);
      cost[second] = 1;
      if (index % 3 !== 1) cost[third] = 1;
      if (points > 0) cost[first] += 1;
    } else if (tier === 2) {
      cost[first] = 2 + (index % 2);
      cost[second] = 2;
      cost[third] = 1 + (points > 1 ? 1 : 0);
      if (index % 4 === 0) cost[fourth] = 1;
    } else {
      cost[first] = 3 + (index % 3);
      cost[second] = 3;
      cost[third] = 2 + (points > 4 ? 1 : 0);
      if (index % 2 === 0) cost[fourth] = 1;
    }

    return cost;
  }

  function buildCards() {
    const cards = [];
    const patterns = {
      1: [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
      2: [1, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 3],
      3: [3, 4, 4, 5, 3, 4, 5, 3, 4, 5]
    };

    [1, 2, 3].forEach((tier) => {
      patterns[tier].forEach((points, index) => {
        const bonus = gemIds[(index + tier) % gemIds.length];
        cards.push({
          id: `t${tier}-${index}`,
          tier,
          bonus,
          points,
          name: cardNames[bonus][index % cardNames[bonus].length],
          cost: buildCost(tier, bonus, index, points)
        });
      });
    });

    return cards;
  }

  function splitDecks() {
    const decks = { 1: [], 2: [], 3: [] };
    buildCards().forEach((card) => {
      decks[card.tier].push(card);
    });

    return {
      1: shuffle(decks[1]),
      2: shuffle(decks[2]),
      3: shuffle(decks[3])
    };
  }

  function drawCard(tier) {
    return state.decks[tier].pop() || null;
  }

  function makePlayer(id, name, isHuman, seat) {
    return {
      id,
      name,
      isHuman,
      seat,
      tokens: emptyGemMap(0),
      bonuses: emptyColorMap(0),
      cards: [],
      reserved: [],
      nobles: [],
      prestige: 0
    };
  }

  function makePlayers(count) {
    const players = [makePlayer("human", displayPlayerName(), true, 1)];
    let aiIndex = 0;

    for (let seat = 2; seat <= count; seat += 1) {
      if (humanSeatEnabled(seat)) {
        players.push(makePlayer(`human-${seat}`, displaySeatPlayerName(seat), true, seat));
      } else {
        const aiName = AI_NAMES[aiIndex] || `AI ${aiIndex + 1}`;
        players.push(makePlayer(`ai-${aiIndex + 1}`, aiName, false, seat));
        aiIndex += 1;
      }
    }

    return players;
  }

  function bankForPlayerCount(count) {
    const colorCount = count === 2 ? 4 : count === 3 ? 5 : 7;
    return {
      ruby: colorCount,
      sapphire: colorCount,
      emerald: colorCount,
      diamond: colorCount,
      onyx: colorCount,
      gold: 5
    };
  }

  function newGame() {
    const playerCount = selectedPlayerCount;
    const decks = splitDecks();
    const matchId = makeId("match");
    state = {
      matchId,
      guestId: loadGuestId(),
      startedAt: new Date().toISOString(),
      playerCount,
      bank: bankForPlayerCount(playerCount),
      decks,
      market: { 1: [], 2: [], 3: [] },
      nobles: shuffle(nobleTemplates).slice(0, playerCount + 1).map((noble, index) => ({
        ...noble,
        id: `noble-${index}`,
        points: 3
      })),
      players: makePlayers(playerCount),
      currentPlayerIndex: 0,
      round: 1,
      selectedCard: null,
      selectedTake: emptyGemMap(0),
      log: [],
      process: [],
      busy: false,
      gameOver: false,
      winner: null,
      matchSubmitted: false,
      lastSubmittedName: "",
      lastSubmittedPrestige: -1
    };

    [1, 2, 3].forEach((tier) => {
      for (let index = 0; index < 4; index += 1) {
        const card = decks[tier].pop();
        if (card) state.market[tier].push(card);
      }
    });

    const humanSeats = state.players.filter((player) => player.isHuman).map((player) => player.name);
    const aiSeatCount = state.players.length - humanSeats.length;
    addLog(
      `${playerCount} 人局开始。${humanSeats.join("、")} 真人入座${aiSeatCount > 0 ? `，${aiSeatCount} 位 AI 兜底` : ""}。先达到 15 威望即可赢得商会席位。`,
      {
        type: "start",
        playerCount
      }
    );
    closeModal();
    render();
  }

  function currentPlayer() {
    return state.players[state.currentPlayerIndex];
  }

  function human() {
    return state.players.find((player) => player.id === "human") || state.players[0];
  }

  function activeHuman() {
    return currentPlayer().isHuman ? currentPlayer() : human();
  }

  function humanPlayers() {
    return state.players.filter((player) => player.isHuman);
  }

  function focusedPlayer() {
    return currentPlayer().isHuman ? currentPlayer() : human();
  }

  function isHumanTurn() {
    return currentPlayer().isHuman && !state.busy && !state.gameOver;
  }

  function tokenTotal(tokenMap) {
    return Object.values(tokenMap).reduce((sum, value) => sum + value, 0);
  }

  function colorTotal(colorMap) {
    return Object.values(colorMap).reduce((sum, value) => sum + value, 0);
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function stripHtml(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value || "");
    return (template.content.textContent || template.innerText || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function addLog(message, event = {}) {
    const plain = stripHtml(message);
    state.log.unshift({
      id: `${Date.now()}-${Math.random()}`,
      round: state.round,
      message
    });
    state.log = state.log.slice(0, 9);

    state.process.push({
      step: state.process.length + 1,
      round: state.round,
      playerId: event.playerId || currentPlayer().id,
      playerName: event.playerName || currentPlayer().name,
      type: event.type || "log",
      summary: plain,
      detail: event.detail || null,
      at: new Date().toISOString()
    });
  }

  function gemById(id) {
    return allGems.find((gem) => gem.id === id);
  }

  function cssColor(id) {
    const gem = gemById(id);
    return gem ? gem.color : "#d8b76b";
  }

  function selectedCardRecord() {
    if (!state.selectedCard) return null;
    const player = activeHuman();

    if (state.selectedCard.source === "reserved") {
      const card = player.reserved.find((item) => item.id === state.selectedCard.id);
      return card ? { card, source: "reserved" } : null;
    }

    const tier = state.selectedCard.tier;
    const card = state.market[tier].find((item) => item.id === state.selectedCard.id);
    return card ? { card, source: "market", tier } : null;
  }

  function effectiveCost(player, card) {
    const cost = emptyColorMap(0);
    gemIds.forEach((id) => {
      cost[id] = Math.max(0, card.cost[id] - player.bonuses[id]);
    });
    return cost;
  }

  function canAfford(player, card) {
    const cost = effectiveCost(player, card);
    let goldNeeded = 0;

    gemIds.forEach((id) => {
      goldNeeded += Math.max(0, cost[id] - player.tokens[id]);
    });

    return goldNeeded <= player.tokens.gold;
  }

  function spendForCard(player, card) {
    const cost = effectiveCost(player, card);
    let goldNeeded = 0;

    gemIds.forEach((id) => {
      const spend = Math.min(player.tokens[id], cost[id]);
      player.tokens[id] -= spend;
      state.bank[id] += spend;
      goldNeeded += cost[id] - spend;
    });

    if (goldNeeded > 0) {
      player.tokens.gold -= goldNeeded;
      state.bank.gold += goldNeeded;
    }
  }

  function replenishMarket(tier) {
    const nextCard = drawCard(tier);
    if (nextCard) state.market[tier].push(nextCard);
  }

  function buyCard(player, record) {
    if (!record || !canAfford(player, record.card)) return false;

    spendForCard(player, record.card);
    player.cards.push(record.card);
    player.bonuses[record.card.bonus] += 1;
    player.prestige += record.card.points;

    if (record.source === "market") {
      state.market[record.tier] = state.market[record.tier].filter((card) => card.id !== record.card.id);
      replenishMarket(record.tier);
    } else {
      player.reserved = player.reserved.filter((card) => card.id !== record.card.id);
    }

    addLog(`<strong>${player.name}</strong> 买入 ${record.card.name}，获得 ${record.card.points} 威望。`, {
      type: "buy",
      playerId: player.id,
      playerName: player.name,
      detail: {
        cardId: record.card.id,
        cardName: record.card.name,
        source: record.source,
        tier: record.tier || record.card.tier,
        points: record.card.points,
        bonus: record.card.bonus,
        prestigeAfter: player.prestige
      }
    });
    return true;
  }

  function reserveCard(player, record) {
    if (!record || record.source !== "market" || player.reserved.length >= RESERVE_LIMIT) return false;

    state.market[record.tier] = state.market[record.tier].filter((card) => card.id !== record.card.id);
    player.reserved.push(record.card);
    replenishMarket(record.tier);

    const gainedGold = state.bank.gold > 0 && tokenTotal(player.tokens) < MAX_TOKENS;
    if (gainedGold) {
      state.bank.gold -= 1;
      player.tokens.gold += 1;
    }

    addLog(
      gainedGold
        ? `<strong>${player.name}</strong> 预留 ${record.card.name}，并获得 1 枚黄金。`
        : `<strong>${player.name}</strong> 预留 ${record.card.name}。`,
      {
        type: "reserve",
        playerId: player.id,
        playerName: player.name,
        detail: {
          cardId: record.card.id,
          cardName: record.card.name,
          tier: record.tier,
          gainedGold
        }
      }
    );

    return true;
  }

  function canAddGemToSelection(gemId) {
    if (!isHumanTurn() || gemId === "gold") return false;
    if (state.bank[gemId] <= state.selectedTake[gemId]) return false;

    const selectedTotal = tokenTotal(state.selectedTake);
    const capacity = Math.min(3, MAX_TOKENS - tokenTotal(activeHuman().tokens));
    if (capacity <= 0 || selectedTotal >= capacity) return false;

    const selectedColors = gemIds.filter((id) => state.selectedTake[id] > 0);
    const selectedCount = state.selectedTake[gemId];

    if (selectedCount === 1) {
      return selectedColors.length === 1 && selectedTotal === 1 && state.bank[gemId] >= 4 && capacity >= 2;
    }

    return selectedCount === 0 && selectedColors.every((id) => state.selectedTake[id] === 1);
  }

  function toggleGemSelection(gemId) {
    if (!isHumanTurn() || gemId === "gold") return;

    if (state.selectedTake[gemId] > 0 && !canAddGemToSelection(gemId)) {
      state.selectedTake[gemId] = 0;
    } else if (canAddGemToSelection(gemId)) {
      state.selectedTake[gemId] += 1;
    } else if (state.selectedTake[gemId] > 0) {
      state.selectedTake[gemId] = 0;
    }

    state.selectedCard = null;
    render();
  }

  function isTakeSelectionLegal() {
    const total = tokenTotal(state.selectedTake);
    const capacity = MAX_TOKENS - tokenTotal(activeHuman().tokens);
    const selectedColors = gemIds.filter((id) => state.selectedTake[id] > 0);

    if (total < 1 || total > 3 || total > capacity) return false;
    if (selectedColors.length === 1) {
      const id = selectedColors[0];
      return state.selectedTake[id] === 1 || (state.selectedTake[id] === 2 && state.bank[id] >= 4);
    }

    return selectedColors.every((id) => state.selectedTake[id] === 1);
  }

  function takeSelectedGems() {
    if (!isTakeSelectionLegal()) return false;
    takeGems(activeHuman(), state.selectedTake);
    return true;
  }

  function takeGems(player, selection) {
    const labels = [];
    const detail = {};

    Object.entries(selection).forEach(([id, count]) => {
      if (count <= 0) return;
      state.bank[id] -= count;
      player.tokens[id] += count;
      labels.push(`${gemById(id).short}x${count}`);
      detail[id] = count;
    });

    addLog(`<strong>${player.name}</strong> 拿取宝石：${labels.join("，")}。`, {
      type: "take",
      playerId: player.id,
      playerName: player.name,
      detail
    });
  }

  function visitNoble(player) {
    const noble = state.nobles.find((candidate) =>
      Object.entries(candidate.cost).every(([id, count]) => player.bonuses[id] >= count)
    );

    if (!noble) return null;

    state.nobles = state.nobles.filter((candidate) => candidate.id !== noble.id);
    player.nobles.push(noble);
    player.prestige += noble.points;
    addLog(`<strong>${player.name}</strong> 获得 ${noble.name} 来访，+${noble.points} 威望。`, {
      type: "noble",
      playerId: player.id,
      playerName: player.name,
      detail: {
        nobleId: noble.id,
        nobleName: noble.name,
        points: noble.points,
        prestigeAfter: player.prestige
      }
    });
    return noble;
  }

  function finishTurn() {
    const activeMatchId = state.matchId;
    visitNoble(currentPlayer());

    if (currentPlayer().prestige >= TARGET_PRESTIGE) {
      finishGame();
      render();
      return;
    }

    state.selectedCard = null;
    state.selectedTake = emptyGemMap(0);
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) state.round += 1;

    if (currentPlayer().isHuman) {
      state.busy = false;
      render();
    } else {
      state.busy = true;
      render();
      window.setTimeout(() => {
        if (state.matchId === activeMatchId) runAiTurn();
      }, 650);
    }
  }

  function standings() {
    return state.players
      .map((player) => ({
        id: player.id,
        name: player.name,
        isHuman: player.isHuman,
        prestige: player.prestige,
        cards: player.cards.length,
        reserved: player.reserved.length,
        nobles: player.nobles.length,
        bonuses: { ...player.bonuses },
        tokens: { ...player.tokens }
      }))
      .sort((first, second) => {
        if (second.prestige !== first.prestige) return second.prestige - first.prestige;
        if (second.cards !== first.cards) return second.cards - first.cards;
        return first.reserved - second.reserved;
      });
  }

  function finishGame() {
    state.gameOver = true;
    state.busy = false;
    state.winner = standings()[0];

    const won = Boolean(state.winner.isHuman);
    addLog(`<strong>${state.winner.name}</strong> 赢得了宝石商会席位。`, {
      type: "finish",
      playerId: state.winner.id,
      playerName: state.winner.name,
      detail: {
        result: won ? "win" : "loss",
        winnerId: state.winner.id,
        standings: standings()
      }
    });

    submitCurrentScore();
    submitMatchRecord();
    showModal({
      title: won ? `${state.winner.name} 赢了` : "牌局结束",
      body: `<p>${state.winner.name} 以 ${state.winner.prestige} 威望赢得 ${state.playerCount} 人局。</p><p>本局胜负与完整过程会自动写入牌局档案。</p>`,
      primaryText: "再来一局",
      secondaryText: "关闭",
      onPrimary: newGame,
      onSecondary: closeModal
    });
  }

  function allMarketRecords() {
    return [3, 2, 1].flatMap((tier) =>
      state.market[tier].map((card) => ({
        card,
        tier,
        source: "market"
      }))
    );
  }

  function cardCostTotal(player, card) {
    return colorTotal(effectiveCost(player, card));
  }

  function chooseAiBuy(player) {
    return allMarketRecords()
      .filter((record) => canAfford(player, record.card))
      .sort((first, second) => {
        if (second.card.points !== first.card.points) return second.card.points - first.card.points;
        if (second.card.tier !== first.card.tier) return second.card.tier - first.card.tier;
        return cardCostTotal(player, first.card) - cardCostTotal(player, second.card);
      })[0];
  }

  function chooseAiTarget(player) {
    return allMarketRecords()
      .slice()
      .sort((first, second) => {
        const firstGap = cardCostTotal(player, first.card);
        const secondGap = cardCostTotal(player, second.card);
        if (firstGap !== secondGap) return firstGap - secondGap;
        if (second.card.points !== first.card.points) return second.card.points - first.card.points;
        return second.card.tier - first.card.tier;
      })[0];
  }

  function chooseAiTake(player) {
    const capacity = Math.min(3, MAX_TOKENS - tokenTotal(player.tokens));
    const selection = emptyGemMap(0);
    if (capacity <= 0) return selection;

    const target = chooseAiTarget(player);
    const desired = target ? effectiveCost(player, target.card) : emptyColorMap(0);
    const priorities = gemIds
      .slice()
      .sort((first, second) => {
        const firstNeed = Math.max(0, desired[first] - player.tokens[first]);
        const secondNeed = Math.max(0, desired[second] - player.tokens[second]);
        if (secondNeed !== firstNeed) return secondNeed - firstNeed;
        return state.bank[second] - state.bank[first];
      });

    priorities.forEach((id) => {
      if (tokenTotal(selection) >= capacity) return;
      if (state.bank[id] > 0) selection[id] = 1;
    });

    if (tokenTotal(selection) === 0) {
      const richest = gemIds.find((id) => state.bank[id] >= 4);
      if (richest && capacity >= 2) selection[richest] = 2;
    }

    return selection;
  }

  function runAiTurn() {
    if (state.gameOver || currentPlayer().isHuman) return;

    const player = currentPlayer();
    const buyRecord = chooseAiBuy(player);

    if (buyRecord) {
      buyCard(player, buyRecord);
      finishTurn();
      return;
    }

    const selection = chooseAiTake(player);
    if (tokenTotal(selection) > 0) {
      takeGems(player, selection);
    } else {
      addLog(`<strong>${player.name}</strong> 观察市场，结束回合。`, {
        type: "pass",
        playerId: player.id,
        playerName: player.name
      });
    }

    finishTurn();
  }

  function handleCardSelect(source, tier, id) {
    if (!isHumanTurn()) return;

    const sameSelection =
      state.selectedCard &&
      state.selectedCard.source === source &&
      state.selectedCard.id === id &&
      state.selectedCard.tier === tier;

    state.selectedCard = sameSelection ? null : { source, tier, id };
    state.selectedTake = emptyGemMap(0);
    render();
  }

  function handleBuy() {
    if (!isHumanTurn()) return;
    const record = selectedCardRecord();
    if (!record || !buyCard(activeHuman(), record)) return;
    finishTurn();
  }

  function handleReserve() {
    if (!isHumanTurn()) return;
    const record = selectedCardRecord();
    if (!record || !reserveCard(activeHuman(), record)) return;
    finishTurn();
  }

  function handleTake() {
    if (!isHumanTurn() || !takeSelectedGems()) return;
    finishTurn();
  }

  function handlePass() {
    if (!isHumanTurn()) return;

    if (state.selectedCard || tokenTotal(state.selectedTake) > 0) {
      state.selectedCard = null;
      state.selectedTake = emptyGemMap(0);
      render();
      return;
    }

    const player = activeHuman();
    addLog(`<strong>${player.name}</strong> 结束回合。`, {
      type: "pass",
      playerId: player.id,
      playerName: player.name
    });
    finishTurn();
  }

  function renderGemToken(gem, count, extraClass) {
    const chip = document.createElement("span");
    chip.className = `mini-chip ${extraClass || ""}`.trim();

    const dot = document.createElement("span");
    dot.className = "mini-dot";
    dot.style.setProperty("--dot-color", gem.color);

    const value = document.createElement("span");
    value.textContent = `${gem.short} ${count}`;

    chip.append(dot, value);
    return chip;
  }

  function renderBank() {
    elements.tokenBank.replaceChildren();

    allGems.forEach((gem) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "token-button";
      button.dataset.gem = gem.id;
      button.disabled = gem.id === "gold" || (!canAddGemToSelection(gem.id) && state.selectedTake[gem.id] === 0);
      if (state.selectedTake[gem.id] > 0) button.classList.add("is-selected");

      const token = document.createElement("span");
      token.className = `gem-token ${gem.className}`;
      token.setAttribute("aria-hidden", "true");

      const meta = document.createElement("span");
      meta.className = "token-meta";
      const label = document.createElement("strong");
      label.textContent = gem.label;
      const selected = document.createElement("span");
      selected.textContent = state.selectedTake[gem.id] > 0 ? `已选 ${state.selectedTake[gem.id]}` : gem.id === "gold" ? "预留卡牌获得" : "点击选择";
      meta.append(label, selected);

      const count = document.createElement("span");
      count.className = "token-count";
      count.textContent = String(state.bank[gem.id]);

      button.append(token, meta, count);
      elements.tokenBank.append(button);
    });

    const selectedTotal = tokenTotal(state.selectedTake);
    const capacity = Math.max(0, Math.min(3, MAX_TOKENS - tokenTotal(activeHuman().tokens)));
    elements.takeLimit.textContent = `${selectedTotal} / ${capacity}`;
    elements.selectionHint.textContent = selectionText();
  }

  function selectionText() {
    if (!isHumanTurn()) return state.gameOver ? "牌局已经结束。" : "等待 AI 行动。";
    const player = activeHuman();
    if (tokenTotal(player.tokens) >= MAX_TOKENS) return `${player.name} 的宝石已达 10 枚上限，请先买入卡牌。`;

    const selected = gemIds.filter((id) => state.selectedTake[id] > 0);
    if (!selected.length) return "选择 3 种不同宝石，或在库存至少 4 枚时选择 2 枚同色。";

    return `已选择：${selected.map((id) => `${gemById(id).label} x${state.selectedTake[id]}`).join("，")}。`;
  }

  function renderPips(cost) {
    const row = document.createElement("div");
    row.className = "pip-row cost-strip";

    Object.entries(cost).forEach(([id, value]) => {
      if (value <= 0) return;
      const pip = document.createElement("span");
      pip.className = `pip ${id}`;
      pip.textContent = String(value);
      pip.title = `${gemById(id).label} ${value}`;
      row.append(pip);
    });

    if (!row.childElementCount) {
      const free = document.createElement("span");
      free.className = "pip gold";
      free.textContent = "0";
      free.title = "免费";
      row.append(free);
    }

    return row;
  }

  function createCardNode(card, source, tier) {
    const player = activeHuman();
    const node = document.createElement("button");
    node.type = "button";
    node.className = source === "reserved" ? "reserved-card" : "market-card";
    node.dataset.source = source;
    node.dataset.tier = String(tier || card.tier);
    node.dataset.id = card.id;
    node.style.setProperty("--bonus-color", cssColor(card.bonus));
    node.style.setProperty("--card-color", cssColor(card.bonus));
    node.disabled = !isHumanTurn();

    const selected =
      state.selectedCard &&
      state.selectedCard.source === source &&
      state.selectedCard.id === card.id;
    if (selected) node.classList.add("is-selected");
    if (canAfford(player, card)) node.classList.add("is-affordable");

    const art = document.createElement("div");
    art.className = "card-art";

    const scene = document.createElement("div");
    scene.className = "card-scene";
    scene.setAttribute("aria-hidden", "true");

    const gem = document.createElement("span");
    gem.className = "card-gem-sigil";
    gem.setAttribute("aria-hidden", "true");

    const prestige = document.createElement("span");
    prestige.className = "card-prestige";
    if (card.points > 0) {
      prestige.textContent = String(card.points);
      prestige.title = `${card.points} 威望`;
    } else {
      prestige.classList.add("is-empty");
      prestige.setAttribute("aria-hidden", "true");
    }

    art.append(scene, gem, prestige);

    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = card.name;
    body.append(title, renderPips(card.cost));

    node.append(art, body);
    return node;
  }

  function renderMarket() {
    [1, 2, 3].forEach((tier) => {
      elements.tiers[tier].replaceChildren();
      state.market[tier].forEach((card) => {
        elements.tiers[tier].append(createCardNode(card, "market", tier));
      });
    });
  }

  function renderNobles() {
    elements.nobleList.replaceChildren();

    state.nobles.forEach((noble) => {
      const node = document.createElement("article");
      node.className = "noble-tile";

      const top = document.createElement("div");
      top.className = "noble-top";
      const name = document.createElement("span");
      name.className = "noble-name";
      name.textContent = noble.name;
      const points = document.createElement("span");
      points.className = "prestige-badge";
      points.textContent = String(noble.points);
      top.append(name, points);

      const portrait = document.createElement("div");
      portrait.className = "noble-portrait";
      portrait.setAttribute("aria-hidden", "true");

      node.append(top, portrait, renderPips(noble.cost));
      elements.nobleList.append(node);
    });
  }

  function renderModeTabs() {
    elements.modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.playerCount) === selectedPlayerCount));
    });
  }

  function renderSeatControls() {
    elements.seatRows.forEach((row) => {
      const seat = Number(row.dataset.seatRow);
      const inGame = seat <= selectedPlayerCount;
      const enabled = inGame && humanSeatEnabled(seat);
      const input = seatNameInput(seat);

      row.hidden = !inGame;
      if (input) {
        input.disabled = !enabled;
        input.setAttribute("aria-disabled", String(!enabled));
      }
    });
  }

  function renderPlayerSummary() {
    syncHumanNames();
    const player = focusedPlayer();
    elements.humanTitle.textContent = player.name;
    elements.humanPrestige.textContent = String(player.prestige);
    elements.roundLabel.textContent = `${state.playerCount} 人局 · 回合 ${state.round}${player.isHuman ? " · 真人" : ""}`;
    elements.humanTokens.replaceChildren(...allGems.map((gem) => renderGemToken(gem, player.tokens[gem.id])));
    elements.humanBonuses.replaceChildren(...gems.map((gem) => renderGemToken(gem, player.bonuses[gem.id], "bonus-chip")));
    elements.reserveCount.textContent = `(${player.reserved.length}/${RESERVE_LIMIT})`;

    elements.reservedList.replaceChildren();
    player.reserved.forEach((card) => elements.reservedList.append(createCardNode(card, "reserved", card.tier)));
    for (let index = player.reserved.length; index < RESERVE_LIMIT; index += 1) {
      const empty = document.createElement("div");
      empty.className = "empty-slot";
      empty.textContent = "+";
      elements.reservedList.append(empty);
    }

    elements.earnedSummary.replaceChildren();
    gems.forEach((gem) => {
      elements.earnedSummary.append(renderGemToken(gem, player.bonuses[gem.id], "bonus-chip"));
    });
    const prestige = document.createElement("span");
    prestige.className = "bonus-chip";
    prestige.textContent = `威望 ${player.prestige}`;
    elements.earnedSummary.append(prestige);
  }

  function renderOpponents() {
    elements.opponentStack.replaceChildren();

    const focus = focusedPlayer();
    state.players.filter((player) => player.id !== focus.id).forEach((player) => {
      const card = document.createElement("article");
      card.className = "opponent-card";
      if (player.id === currentPlayer().id) card.classList.add("is-current");

      const top = document.createElement("div");
      top.className = "opponent-top";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");

      const name = document.createElement("div");
      name.className = "opponent-name";
      const strong = document.createElement("strong");
      strong.textContent = player.name;
      const meta = document.createElement("span");
      meta.textContent = `${player.isHuman ? "真人" : "AI"} · ${player.cards.length} 张卡 · ${player.reserved.length} 预留`;
      name.append(strong, meta);

      const score = document.createElement("strong");
      score.className = "opponent-score";
      score.textContent = String(player.prestige);

      top.append(avatar, name, score);

      const chips = document.createElement("div");
      chips.className = "opponent-meta";
      gems.forEach((gem) => chips.append(renderGemToken(gem, player.bonuses[gem.id], "bonus-chip")));

      card.append(top, chips);
      elements.opponentStack.append(card);
    });
  }

  function renderActions() {
    const record = selectedCardRecord();
    const player = activeHuman();
    const canBuy = isHumanTurn() && record && canAfford(player, record.card);
    const canReserveSelected =
      isHumanTurn() &&
      record &&
      record.source === "market" &&
      player.reserved.length < RESERVE_LIMIT;
    const canTake = isHumanTurn() && isTakeSelectionLegal();
    const hasSelection = Boolean(record) || tokenTotal(state.selectedTake) > 0;

    elements.turnLabel.textContent = state.gameOver ? "牌局结束" : currentPlayer().isHuman ? `${currentPlayer().name} 的回合` : `${currentPlayer().name} 行动中`;
    elements.actionCount.textContent = isHumanTurn() ? "真人操作" : state.gameOver ? "已结算" : "AI 思考中";
    elements.buy.disabled = !canBuy;
    elements.reserve.disabled = !canReserveSelected;
    elements.take.disabled = !canTake;
    elements.pass.disabled = !isHumanTurn();

    if (record) {
      const affordable = canAfford(player, record.card);
      elements.actionStatus.textContent = `${record.card.name}：${record.card.points} 威望，奖励 ${gemById(record.card.bonus).label}。${affordable ? "可以买入。" : "宝石不足，可先拿宝石或预留。"}`;
    } else if (tokenTotal(state.selectedTake) > 0) {
      elements.actionStatus.textContent = isTakeSelectionLegal() ? "这组宝石可以拿取。" : "当前选择不符合拿宝石规则。";
    } else if (state.gameOver) {
      elements.actionStatus.textContent = `${state.winner.name} 赢得了牌局。`;
    } else if (!currentPlayer().isHuman) {
      elements.actionStatus.textContent = "AI 正在评估市场。";
    } else {
      elements.actionStatus.textContent = `${player.name} 选择卡牌或宝石。达到 15 威望即可获胜。`;
    }

    elements.pass.classList.toggle("has-selection", hasSelection);
  }

  function renderLog() {
    elements.turnLog.replaceChildren();
    state.log.forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `回合 ${entry.round} · ${entry.message}`;
      elements.turnLog.append(item);
    });
  }

  function render() {
    renderModeTabs();
    renderSeatControls();
    renderBank();
    renderNobles();
    renderMarket();
    renderPlayerSummary();
    renderOpponents();
    renderActions();
    renderLog();
    updateSubmitState();
  }

  function showRules() {
    showModal({
      title: "规则",
      body: `
        <ul>
          <li>开局前可选择 2、3、4 人局；开启 2 号真人时，两位真人轮流操作，其余席位由 AI 兜底。</li>
          <li>未输入名字也能以游客身份游玩，每局胜负和过程会自动写入牌局档案。</li>
          <li>每回合只能执行 1 个行动：买入、预留、拿宝石或结束回合。</li>
          <li>拿宝石可以拿 3 种不同颜色，或在库存至少 4 枚时拿 2 枚同色。</li>
          <li>买入卡牌后获得永久奖励，奖励会抵扣之后的购买成本。</li>
          <li>预留最多 3 张，若黄金仍在宝石库中，会获得 1 枚黄金百搭宝石。</li>
          <li>满足贵族要求时会自动获得 3 威望。任一玩家达到 15 威望后结算。</li>
        </ul>
      `,
      primaryText: "知道了",
      secondaryText: "",
      onPrimary: closeModal,
      onSecondary: closeModal
    });
  }

  function showModal({ title, body, primaryText, secondaryText, onPrimary, onSecondary }) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = body;
    elements.modalPrimary.textContent = primaryText;
    elements.modalSecondary.textContent = secondaryText;
    elements.modalSecondary.hidden = !secondaryText;
    modalPrimaryAction = onPrimary;
    modalSecondaryAction = onSecondary;
    elements.modal.classList.remove("is-hidden");
  }

  function closeModal() {
    elements.modal.classList.add("is-hidden");
  }

  function loadPlayerName() {
    try {
      return localStorage.getItem(PLAYER_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function savePlayerName(name) {
    try {
      localStorage.setItem(PLAYER_KEY, name);
    } catch (error) {
      // The game remains playable if storage is unavailable.
    }
  }

  function seatNameInput(seat) {
    return elements.seatNameInputs.find((input) => Number(input.dataset.seatName) === seat);
  }

  function seatToggle(seat) {
    return elements.seatToggles.find((toggle) => Number(toggle.dataset.humanSeat) === seat);
  }

  function loadSeatPlayerName(seat) {
    try {
      return localStorage.getItem(HUMAN_SEAT_NAME_KEYS[seat]) || "";
    } catch (error) {
      return "";
    }
  }

  function saveSeatPlayerName(seat, name) {
    try {
      localStorage.setItem(HUMAN_SEAT_NAME_KEYS[seat], name);
    } catch (error) {
      // Local storage is optional.
    }
  }

  function loadHumanSeatEnabled(seat) {
    try {
      const saved = localStorage.getItem(HUMAN_SEAT_ENABLED_KEYS[seat]);
      return saved === null ? true : saved === "true";
    } catch (error) {
      return true;
    }
  }

  function saveHumanSeatEnabled(seat, enabled) {
    try {
      localStorage.setItem(HUMAN_SEAT_ENABLED_KEYS[seat], String(enabled));
    } catch (error) {
      // Local storage is optional.
    }
  }

  function loadGuestId() {
    try {
      const existing = localStorage.getItem(GUEST_KEY);
      if (existing) return existing;
      const guestId = `guest-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem(GUEST_KEY, guestId);
      return guestId;
    } catch (error) {
      return `guest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  function loadPlayerCount() {
    try {
      const saved = Number.parseInt(localStorage.getItem(PLAYER_COUNT_KEY) || "4", 10);
      return [2, 3, 4].includes(saved) ? saved : 4;
    } catch (error) {
      return 4;
    }
  }

  function savePlayerCount(count) {
    try {
      localStorage.setItem(PLAYER_COUNT_KEY, String(count));
    } catch (error) {
      // Local storage is optional.
    }
  }

  function normalizedPlayerName() {
    return elements.playerName.value.trim().replace(/\s+/g, " ");
  }

  function normalizedSeatPlayerName(seat) {
    const input = seatNameInput(seat);
    return input ? input.value.trim().replace(/\s+/g, " ") : "";
  }

  function humanSeatEnabled(seat) {
    const toggle = seatToggle(seat);
    return Boolean(toggle && toggle.checked);
  }

  function guestDisplayName() {
    const guestId = state ? state.guestId : loadGuestId();
    return `游客 ${guestId.replace(/^guest-/, "")}`;
  }

  function displayPlayerName() {
    return normalizedPlayerName() || guestDisplayName();
  }

  function displaySeatPlayerName(seat) {
    return normalizedSeatPlayerName(seat) || `游客 ${seat}`;
  }

  function syncHumanNames() {
    if (!state) return;
    const primary = state.players.find((player) => player.id === "human");
    if (primary) primary.name = displayPlayerName();
    HUMAN_SEATS.forEach((seat) => {
      const player = state.players.find((candidate) => candidate.id === `human-${seat}`);
      if (player) player.name = displaySeatPlayerName(seat);
    });
  }

  function scorePlayerForRecord() {
    if (state && state.winner && state.winner.isHuman) return state.winner;
    return human();
  }

  function scoreCardCount(player) {
    return Array.isArray(player.cards) ? player.cards.length : player.cards || 0;
  }

  function updateSubmitState() {
    const scorePlayer = state ? scorePlayerForRecord() : null;
    const prestige = scorePlayer ? scorePlayer.prestige : 0;
    const duplicate = state && scorePlayer && scorePlayer.name === state.lastSubmittedName && prestige <= state.lastSubmittedPrestige;
    elements.submitScore.disabled = !state || !state.gameOver || duplicate;
    elements.submitScore.textContent = state && state.winner && state.winner.isHuman ? "胜者" : "保存";
  }

  function renderLeaderboard(scores) {
    elements.leaderboardList.replaceChildren();

    if (!scores.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "还没有胜场。";
      elements.leaderboardList.append(empty);
      return;
    }

    scores.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "leaderboard-entry";

      const rank = document.createElement("span");
      rank.textContent = `#${index + 1}`;

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      const strong = document.createElement("strong");
      strong.textContent = entry.name;
      const meta = document.createElement("span");
      meta.textContent = `${entry.rounds || entry.moves || 0} 回合 · ${entry.cards || entry.maxTile || 0} 张`;
      name.append(strong, meta);

      const score = document.createElement("strong");
      score.textContent = String(entry.prestige || entry.score || 0);

      item.append(rank, name, score);
      elements.leaderboardList.append(item);
    });
  }

  async function loadLeaderboard() {
    elements.leaderboardStatus.textContent = "正在加载胜场榜...";
    elements.leaderboardStatus.classList.remove("is-error");

    try {
      const response = await fetch(`/api/leaderboard?limit=${LEADERBOARD_LIMIT}`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Leaderboard unavailable: ${response.status}`);

      const data = await response.json();
      renderLeaderboard(data.scores || []);
      elements.leaderboardStatus.textContent = "胜场榜已同步。";
    } catch (error) {
      renderLeaderboard([]);
      elements.leaderboardStatus.textContent = "胜场榜服务暂时不可用。";
      elements.leaderboardStatus.classList.add("is-error");
    }
  }

  async function submitCurrentScore(event) {
    if (event) event.preventDefault();
    if (!state.gameOver) return;

    syncHumanNames();
    const scorePlayer = scorePlayerForRecord();
    const name = scorePlayer.name;
    if (scorePlayer.id === "human" && normalizedPlayerName()) savePlayerName(normalizedPlayerName());
    HUMAN_SEATS.forEach((seat) => {
      if (scorePlayer.id === `human-${seat}` && normalizedSeatPlayerName(seat)) {
        saveSeatPlayerName(seat, normalizedSeatPlayerName(seat));
      }
    });

    elements.submitScore.disabled = true;
    elements.leaderboardStatus.textContent = "正在保存...";

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name,
          prestige: scorePlayer.prestige,
          rounds: state.round,
          cards: scoreCardCount(scorePlayer),
          won: state.winner && state.winner.id === scorePlayer.id
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Save failed: ${response.status}`);
      }

      const data = await response.json();
      state.lastSubmittedName = name;
      state.lastSubmittedPrestige = scorePlayer.prestige;
      renderLeaderboard(data.scores || []);
      elements.leaderboardStatus.textContent = data.accepted ? "结果已自动保存。" : "这位玩家已有更高记录。";
    } catch (error) {
      elements.leaderboardStatus.textContent = "保存失败，请稍后再试。";
      elements.leaderboardStatus.classList.add("is-error");
    } finally {
      updateSubmitState();
    }
  }

  function matchPayload() {
    syncHumanNames();
    const finalStandings = standings();
    const humanNames = humanPlayers().map((player) => player.name).join(" / ");
    const won = Boolean(state.winner && state.winner.isHuman);
    return {
      id: state.matchId,
      guestId: state.guestId,
      playerName: humanNames || displayPlayerName(),
      playerCount: state.playerCount,
      result: won ? "win" : "loss",
      winnerId: state.winner ? state.winner.id : null,
      winnerName: state.winner ? state.winner.name : "",
      rounds: state.round,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      players: finalStandings,
      actions: state.process
    };
  }

  async function submitMatchRecord() {
    if (!state.gameOver || state.matchSubmitted) return;
    state.matchSubmitted = true;
    elements.matchStatus.textContent = "正在自动保存牌局...";
    elements.matchStatus.classList.remove("is-error");

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(matchPayload())
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Match save failed: ${response.status}`);
      }

      const data = await response.json();
      renderMatches(data.matches || []);
      elements.matchStatus.textContent = "本局胜负和过程已自动保存。";
    } catch (error) {
      state.matchSubmitted = false;
      elements.matchStatus.textContent = "牌局自动记录失败，请稍后刷新。";
      elements.matchStatus.classList.add("is-error");
    }
  }

  function renderMatches(matches) {
    elements.matchList.replaceChildren();

    if (!matches.length) {
      const empty = document.createElement("li");
      empty.className = "match-empty";
      empty.textContent = "还没有牌局记录。";
      elements.matchList.append(empty);
      return;
    }

    matches.forEach((match) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "match-entry";
      button.dataset.matchId = match.id;

      const title = document.createElement("strong");
      title.textContent = `${match.playerName} · ${match.result === "win" ? "胜" : "负"} · ${match.playerCount}人`;
      const meta = document.createElement("span");
      meta.textContent = `${match.rounds} 回合 · ${match.actionCount || 0} 步 · 胜者 ${match.winnerName}`;

      button.append(title, meta);
      item.append(button);
      elements.matchList.append(item);
    });
  }

  async function loadMatches() {
    elements.matchStatus.textContent = "正在加载牌局档案...";
    elements.matchStatus.classList.remove("is-error");

    try {
      const response = await fetch(`/api/matches?limit=${MATCH_LIMIT}`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Matches unavailable: ${response.status}`);

      const data = await response.json();
      renderMatches(data.matches || []);
      elements.matchStatus.textContent = "牌局档案已同步。";
    } catch (error) {
      renderMatches([]);
      elements.matchStatus.textContent = "牌局档案暂时不可用。";
      elements.matchStatus.classList.add("is-error");
    }
  }

  async function openMatchDetail(id) {
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Match unavailable: ${response.status}`);
      const data = await response.json();
      const match = data.match;
      const actions = (match.actions || [])
        .slice(0, 160)
        .map((action) => `<li>回合 ${escapeHtml(action.round)} · ${escapeHtml(action.summary)}</li>`)
        .join("");
      showModal({
        title: `${match.playerName} · ${match.result === "win" ? "胜局" : "负局"}`,
        body: `<p>${match.playerCount} 人局，${match.rounds} 回合，胜者 ${escapeHtml(match.winnerName)}。</p><ol>${actions}</ol>`,
        primaryText: "关闭",
        secondaryText: "",
        onPrimary: closeModal,
        onSecondary: closeModal
      });
    } catch (error) {
      elements.matchStatus.textContent = "读取牌局过程失败。";
      elements.matchStatus.classList.add("is-error");
    }
  }

  function setPlayerCount(count) {
    if (![2, 3, 4].includes(count) || count === selectedPlayerCount) return;
    selectedPlayerCount = count;
    savePlayerCount(count);
    newGame();
  }

  function attachEvents() {
    elements.tokenBank.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gem]");
      if (!button) return;
      toggleGemSelection(button.dataset.gem);
    });

    document.addEventListener("click", (event) => {
      const card = event.target.closest(".market-card, .reserved-card");
      if (!card || !card.dataset.id) return;
      handleCardSelect(card.dataset.source, Number(card.dataset.tier), card.dataset.id);
    });

    elements.modeButtons.forEach((button) => {
      button.addEventListener("click", () => setPlayerCount(Number(button.dataset.playerCount)));
    });
    elements.buy.addEventListener("click", handleBuy);
    elements.reserve.addEventListener("click", handleReserve);
    elements.take.addEventListener("click", handleTake);
    elements.pass.addEventListener("click", handlePass);
    elements.newGame.addEventListener("click", newGame);
    elements.rules.addEventListener("click", showRules);
    elements.modalPrimary.addEventListener("click", () => modalPrimaryAction());
    elements.modalSecondary.addEventListener("click", () => modalSecondaryAction());
    elements.modal.addEventListener("click", (event) => {
      if (event.target === elements.modal) closeModal();
    });
    elements.scoreForm.addEventListener("submit", submitCurrentScore);
    elements.playerName.addEventListener("input", () => {
      savePlayerName(normalizedPlayerName());
      if (state && !state.gameOver) syncHumanNames();
      render();
    });
    elements.seatNameInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const seat = Number(input.dataset.seatName);
        saveSeatPlayerName(seat, normalizedSeatPlayerName(seat));
        if (state && !state.gameOver) syncHumanNames();
        render();
      });
    });
    elements.seatToggles.forEach((toggle) => {
      toggle.addEventListener("change", () => {
        saveHumanSeatEnabled(Number(toggle.dataset.humanSeat), toggle.checked);
        newGame();
      });
    });
    elements.leaderboardRefresh.addEventListener("click", loadLeaderboard);
    elements.matchRefresh.addEventListener("click", loadMatches);
    elements.matchList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-match-id]");
      if (!button) return;
      openMatchDetail(button.dataset.matchId);
    });
  }

  elements.playerName.value = loadPlayerName();
  HUMAN_SEATS.forEach((seat) => {
    const input = seatNameInput(seat);
    const toggle = seatToggle(seat);
    if (input) input.value = loadSeatPlayerName(seat);
    if (toggle) toggle.checked = loadHumanSeatEnabled(seat);
  });
  attachEvents();
  newGame();
  loadLeaderboard();
  loadMatches();
})();
