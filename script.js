(function () {
  "use strict";

  const TARGET_PRESTIGE = 15;
  const RESERVE_LIMIT = 3;
  const MAX_TOKENS = 10;
  const LEADERBOARD_LIMIT = 5;
  const PLAYER_KEY = "gem-guild-player";

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
    turnLabel: document.querySelector("#turn-label"),
    newGame: document.querySelector("#new-game-button"),
    rules: document.querySelector("#rules-button"),
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
    submitScore: document.querySelector("#submit-score-button")
  };

  let state;
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

  function makePlayer(id, name, isHuman) {
    return {
      id,
      name,
      isHuman,
      tokens: emptyGemMap(0),
      bonuses: emptyColorMap(0),
      cards: [],
      reserved: [],
      nobles: [],
      prestige: 0
    };
  }

  function newGame() {
    const decks = splitDecks();
    state = {
      bank: { ruby: 7, sapphire: 7, emerald: 7, diamond: 7, onyx: 7, gold: 5 },
      decks,
      market: { 1: [], 2: [], 3: [] },
      nobles: shuffle(nobleTemplates).slice(0, 4).map((noble, index) => ({
        ...noble,
        id: `noble-${index}`,
        points: 3
      })),
      players: [
        makePlayer("human", "你", true),
        makePlayer("ai-1", "AI 维多利亚", false),
        makePlayer("ai-2", "AI 奥古斯都", false),
        makePlayer("ai-3", "AI 伊莎贝拉", false)
      ],
      currentPlayerIndex: 0,
      round: 1,
      selectedCard: null,
      selectedTake: emptyGemMap(0),
      log: [],
      busy: false,
      gameOver: false,
      winner: null,
      lastSubmittedName: "",
      lastSubmittedPrestige: -1
    };

    [1, 2, 3].forEach((tier) => {
      for (let index = 0; index < 4; index += 1) {
        const card = decks[tier].pop();
        if (card) state.market[tier].push(card);
      }
    });

    addLog("牌局开始。先达到 15 威望即可赢得商会席位。");
    closeModal();
    render();
  }

  function currentPlayer() {
    return state.players[state.currentPlayerIndex];
  }

  function human() {
    return state.players[0];
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

  function addLog(message) {
    state.log.unshift({
      id: `${Date.now()}-${Math.random()}`,
      round: state.round,
      message
    });
    state.log = state.log.slice(0, 9);
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

    if (state.selectedCard.source === "reserved") {
      const card = human().reserved.find((item) => item.id === state.selectedCard.id);
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

    addLog(`<strong>${player.name}</strong> 买入 ${record.card.name}，获得 ${record.card.points} 威望。`);
    return true;
  }

  function reserveCard(player, record) {
    if (!record || record.source !== "market" || player.reserved.length >= RESERVE_LIMIT) return false;

    state.market[record.tier] = state.market[record.tier].filter((card) => card.id !== record.card.id);
    player.reserved.push(record.card);
    replenishMarket(record.tier);

    if (state.bank.gold > 0 && tokenTotal(player.tokens) < MAX_TOKENS) {
      state.bank.gold -= 1;
      player.tokens.gold += 1;
      addLog(`<strong>${player.name}</strong> 预留 ${record.card.name}，并获得 1 枚黄金。`);
    } else {
      addLog(`<strong>${player.name}</strong> 预留 ${record.card.name}。`);
    }

    return true;
  }

  function canAddGemToSelection(gemId) {
    if (!isHumanTurn() || gemId === "gold") return false;
    if (state.bank[gemId] <= state.selectedTake[gemId]) return false;

    const selectedTotal = tokenTotal(state.selectedTake);
    const capacity = Math.min(3, MAX_TOKENS - tokenTotal(human().tokens));
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
    const capacity = MAX_TOKENS - tokenTotal(human().tokens);
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
    takeGems(human(), state.selectedTake);
    return true;
  }

  function takeGems(player, selection) {
    const labels = [];

    Object.entries(selection).forEach(([id, count]) => {
      if (count <= 0) return;
      state.bank[id] -= count;
      player.tokens[id] += count;
      labels.push(`${gemById(id).short}x${count}`);
    });

    addLog(`<strong>${player.name}</strong> 拿取宝石：${labels.join("，")}。`);
  }

  function visitNoble(player) {
    const noble = state.nobles.find((candidate) =>
      Object.entries(candidate.cost).every(([id, count]) => player.bonuses[id] >= count)
    );

    if (!noble) return null;

    state.nobles = state.nobles.filter((candidate) => candidate.id !== noble.id);
    player.nobles.push(noble);
    player.prestige += noble.points;
    addLog(`<strong>${player.name}</strong> 获得 ${noble.name} 来访，+${noble.points} 威望。`);
    return noble;
  }

  function finishTurn() {
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
      window.setTimeout(runAiTurn, 650);
    }
  }

  function finishGame() {
    state.gameOver = true;
    state.busy = false;
    state.winner = state.players
      .slice()
      .sort((first, second) => {
        if (second.prestige !== first.prestige) return second.prestige - first.prestige;
        if (second.cards.length !== first.cards.length) return second.cards.length - first.cards.length;
        return first.reserved.length - second.reserved.length;
      })[0];

    const won = state.winner.id === "human";
    addLog(won ? "<strong>你赢得了宝石商会席位。</strong>" : `<strong>${state.winner.name}</strong> 赢得了商会席位。`);
    maybeAutoSubmitScore();
    showModal({
      title: won ? "你赢了" : "牌局结束",
      body: `<p>${state.winner.name} 以 ${state.winner.prestige} 威望赢得商会席位。</p><p>输入名字后可以把这局保存到胜场榜。</p>`,
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
      addLog(`<strong>${player.name}</strong> 观察市场，结束回合。`);
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
    if (!record || !buyCard(human(), record)) return;
    finishTurn();
  }

  function handleReserve() {
    if (!isHumanTurn()) return;
    const record = selectedCardRecord();
    if (!record || !reserveCard(human(), record)) return;
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

    addLog("<strong>你</strong> 结束回合。");
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
    const capacity = Math.max(0, Math.min(3, MAX_TOKENS - tokenTotal(human().tokens)));
    elements.takeLimit.textContent = `${selectedTotal} / ${capacity}`;
    elements.selectionHint.textContent = selectionText();
  }

  function selectionText() {
    if (!isHumanTurn()) return state.gameOver ? "牌局已经结束。" : "等待 AI 行动。";
    if (tokenTotal(human().tokens) >= MAX_TOKENS) return "你的宝石已达 10 枚上限，请先买入卡牌。";

    const selected = gemIds.filter((id) => state.selectedTake[id] > 0);
    if (!selected.length) return "选择 3 种不同宝石，或在库存至少 4 枚时选择 2 枚同色。";

    return `已选择：${selected.map((id) => `${gemById(id).label} x${state.selectedTake[id]}`).join("，")}。`;
  }

  function renderPips(cost) {
    const row = document.createElement("div");
    row.className = "pip-row";

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
      row.append(free);
    }

    return row;
  }

  function createCardNode(card, source, tier) {
    const player = human();
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
    const tierBadge = document.createElement("span");
    tierBadge.className = "card-tier";
    tierBadge.textContent = card.points > 0 ? String(card.points) : `I${card.tier > 1 ? "I".repeat(card.tier - 1) : ""}`;
    art.append(tierBadge);

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

  function renderPlayerSummary() {
    const player = human();
    elements.humanPrestige.textContent = String(player.prestige);
    elements.roundLabel.textContent = `回合 ${state.round}`;
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

    state.players.slice(1).forEach((player) => {
      const card = document.createElement("article");
      card.className = "opponent-card";

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
      meta.textContent = `${player.cards.length} 张卡 · ${player.reserved.length} 预留`;
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
    const canBuy = isHumanTurn() && record && canAfford(human(), record.card);
    const canReserveSelected =
      isHumanTurn() &&
      record &&
      record.source === "market" &&
      human().reserved.length < RESERVE_LIMIT;
    const canTake = isHumanTurn() && isTakeSelectionLegal();
    const hasSelection = Boolean(record) || tokenTotal(state.selectedTake) > 0;

    elements.turnLabel.textContent = state.gameOver ? "牌局结束" : currentPlayer().isHuman ? "你的回合" : `${currentPlayer().name} 行动中`;
    elements.actionCount.textContent = isHumanTurn() ? "可执行 1 个行动" : state.gameOver ? "已结算" : "AI 思考中";
    elements.buy.disabled = !canBuy;
    elements.reserve.disabled = !canReserveSelected;
    elements.take.disabled = !canTake;
    elements.pass.disabled = !isHumanTurn();

    if (record) {
      const affordable = canAfford(human(), record.card);
      elements.actionStatus.textContent = `${record.card.name}：${record.card.points} 威望，奖励 ${gemById(record.card.bonus).label}。${affordable ? "可以买入。" : "宝石不足，可先拿宝石或预留。"}`;
    } else if (tokenTotal(state.selectedTake) > 0) {
      elements.actionStatus.textContent = isTakeSelectionLegal() ? "这组宝石可以拿取。" : "当前选择不符合拿宝石规则。";
    } else if (state.gameOver) {
      elements.actionStatus.textContent = `${state.winner.name} 赢得了牌局。`;
    } else if (!currentPlayer().isHuman) {
      elements.actionStatus.textContent = "AI 正在评估市场。";
    } else {
      elements.actionStatus.textContent = "选择卡牌或宝石。达到 15 威望即可获胜。";
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

  function normalizedPlayerName() {
    return elements.playerName.value.trim().replace(/\s+/g, " ");
  }

  function updateSubmitState() {
    const hasName = Boolean(normalizedPlayerName());
    const prestige = state ? human().prestige : 0;
    const duplicate = normalizedPlayerName() === state.lastSubmittedName && prestige <= state.lastSubmittedPrestige;
    elements.submitScore.disabled = !state.gameOver || !hasName || duplicate;
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
    const name = normalizedPlayerName();
    if (!state.gameOver || !name) return;

    savePlayerName(name);
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
          prestige: human().prestige,
          rounds: state.round,
          cards: human().cards.length,
          won: state.winner && state.winner.id === "human"
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Save failed: ${response.status}`);
      }

      const data = await response.json();
      state.lastSubmittedName = name;
      state.lastSubmittedPrestige = human().prestige;
      renderLeaderboard(data.scores || []);
      elements.leaderboardStatus.textContent = data.accepted ? "已保存到胜场榜。" : "这位玩家已有更高记录。";
    } catch (error) {
      elements.leaderboardStatus.textContent = "保存失败，请稍后再试。";
      elements.leaderboardStatus.classList.add("is-error");
    } finally {
      updateSubmitState();
    }
  }

  function maybeAutoSubmitScore() {
    if (!normalizedPlayerName()) return;
    submitCurrentScore();
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
      updateSubmitState();
    });
    elements.leaderboardRefresh.addEventListener("click", loadLeaderboard);
  }

  elements.playerName.value = loadPlayerName();
  attachEvents();
  newGame();
  loadLeaderboard();
})();
