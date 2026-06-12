(function () {
  "use strict";

  const SIZE = 4;
  const START_TILES = 2;
  const WIN_VALUE = 2048;
  const BEST_KEY = "codex-2048-best";
  const PLAYER_KEY = "codex-2048-player";
  const LEADERBOARD_LIMIT = 10;

  const vectors = {
    ArrowUp: { row: -1, col: 0 },
    ArrowRight: { row: 0, col: 1 },
    ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 }
  };

  const statusLines = [
    "Keep going!",
    "Nice merge.",
    "Board is warming up.",
    "Clean move.",
    "Stack it higher."
  ];

  const elements = {
    board: document.querySelector("#board"),
    tileLayer: document.querySelector("#tile-layer"),
    score: document.querySelector("#score"),
    best: document.querySelector("#best-score"),
    moves: document.querySelector("#moves"),
    status: document.querySelector("#status-text"),
    boardState: document.querySelector("#board-state"),
    restart: document.querySelector("#restart-button"),
    undo: document.querySelector("#undo-button"),
    overlay: document.querySelector("#game-overlay"),
    overlayTitle: document.querySelector("#overlay-title"),
    overlayMessage: document.querySelector("#overlay-message"),
    overlayPrimary: document.querySelector("#overlay-primary"),
    overlaySecondary: document.querySelector("#overlay-secondary"),
    leaderboardList: document.querySelector("#leaderboard-list"),
    leaderboardStatus: document.querySelector("#leaderboard-status"),
    scoreForm: document.querySelector("#score-form"),
    playerName: document.querySelector("#player-name"),
    submitScore: document.querySelector("#submit-score-button"),
    refreshLeaderboard: document.querySelector("#leaderboard-refresh")
  };

  let cells;
  let score;
  let bestScore;
  let moves;
  let nextTileId;
  let undoState;
  let over;
  let won;
  let keepPlaying;
  let newTileId;
  let mergedTileIds;
  let touchStart;
  let leaderboardBusy;

  function createEmptyCells() {
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
  }

  function createTile(row, col, value) {
    const tile = {
      id: nextTileId,
      row,
      col,
      value
    };
    nextTileId += 1;
    return tile;
  }

  function loadBestScore() {
    try {
      return Number.parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
    } catch (error) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (error) {
      // Private browsing or file URLs may block localStorage; the game still works.
    }
  }

  function loadPlayerName() {
    try {
      return localStorage.getItem(PLAYER_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function savePlayerName(value) {
    try {
      localStorage.setItem(PLAYER_KEY, value);
    } catch (error) {
      // Private browsing or file URLs may block localStorage; rankings still work.
    }
  }

  function newGame() {
    cells = createEmptyCells();
    score = 0;
    moves = 0;
    nextTileId = 1;
    undoState = null;
    over = false;
    won = false;
    keepPlaying = false;
    newTileId = null;
    mergedTileIds = new Set();

    for (let i = 0; i < START_TILES; i += 1) {
      addRandomTile();
    }

    render("Keep going!");
  }

  function addRandomTile() {
    const positions = availableCells();
    if (!positions.length) return null;

    const position = positions[Math.floor(Math.random() * positions.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = createTile(position.row, position.col, value);
    cells[position.row][position.col] = tile;
    newTileId = tile.id;
    return tile;
  }

  function availableCells() {
    const positions = [];
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (!cells[row][col]) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  function snapshot() {
    return {
      cells: cells.map((row) => row.map((tile) => (tile ? { ...tile } : null))),
      score,
      moves,
      nextTileId,
      over,
      won,
      keepPlaying
    };
  }

  function restore(state) {
    if (!state) return;
    cells = state.cells.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
    score = state.score;
    moves = state.moves;
    nextTileId = state.nextTileId;
    over = state.over;
    won = state.won;
    keepPlaying = state.keepPlaying;
    undoState = null;
    newTileId = null;
    mergedTileIds = new Set();
    render("Undone.");
  }

  function move(direction) {
    if (over || (won && !keepPlaying)) return;

    const vector = vectors[direction];
    if (!vector) return;

    const previous = snapshot();
    const traversals = buildTraversals(vector);
    let moved = false;
    mergedTileIds = new Set();
    newTileId = null;

    prepareTiles();

    traversals.rows.forEach((row) => {
      traversals.cols.forEach((col) => {
        const tile = cells[row][col];
        if (!tile) return;

        const positions = findFarthestPosition({ row, col }, vector);
        const next = cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          const merged = createTile(next.row, next.col, tile.value * 2);
          merged.mergedFrom = [tile, next];
          cells[next.row][next.col] = merged;
          cells[row][col] = null;
          tile.row = next.row;
          tile.col = next.col;

          score += merged.value;
          mergedTileIds.add(merged.id);

          if (merged.value === WIN_VALUE) {
            won = true;
          }
        } else {
          moveTile(tile, positions.farthest);
        }

        if (!positionsEqual({ row, col }, tile)) {
          moved = true;
        }
      });
    });

    if (!moved) {
      render("No move there.");
      return;
    }

    undoState = previous;
    moves += 1;
    addRandomTile();
    updateBestScore();

    if (!movesAvailable()) {
      over = true;
    }

    render(statusForMove());
  }

  function prepareTiles() {
    cells.forEach((row) => {
      row.forEach((tile) => {
        if (!tile) return;
        tile.mergedFrom = null;
      });
    });
  }

  function buildTraversals(vector) {
    const traversals = {
      rows: [0, 1, 2, 3],
      cols: [0, 1, 2, 3]
    };

    if (vector.row === 1) traversals.rows = traversals.rows.reverse();
    if (vector.col === 1) traversals.cols = traversals.cols.reverse();

    return traversals;
  }

  function findFarthestPosition(start, vector) {
    let previous;
    let position = { ...start };

    do {
      previous = position;
      position = {
        row: previous.row + vector.row,
        col: previous.col + vector.col
      };
    } while (withinBounds(position) && !cellContent(position));

    return {
      farthest: previous,
      next: position
    };
  }

  function withinBounds(position) {
    return (
      position.row >= 0 &&
      position.row < SIZE &&
      position.col >= 0 &&
      position.col < SIZE
    );
  }

  function cellContent(position) {
    if (!withinBounds(position)) return null;
    return cells[position.row][position.col];
  }

  function moveTile(tile, position) {
    cells[tile.row][tile.col] = null;
    cells[position.row][position.col] = tile;
    tile.row = position.row;
    tile.col = position.col;
  }

  function positionsEqual(first, second) {
    return first.row === second.row && first.col === second.col;
  }

  function movesAvailable() {
    return availableCells().length > 0 || tileMatchesAvailable();
  }

  function tileMatchesAvailable() {
    const directions = [vectors.ArrowUp, vectors.ArrowRight, vectors.ArrowDown, vectors.ArrowLeft];

    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const tile = cells[row][col];
        if (!tile) continue;

        for (const vector of directions) {
          const other = cellContent({ row: row + vector.row, col: col + vector.col });
          if (other && other.value === tile.value) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function updateBestScore() {
    if (score <= bestScore) return;
    bestScore = score;
    saveBestScore(bestScore);
  }

  function maxTileValue() {
    return cells.flat().reduce((max, tile) => Math.max(max, tile ? tile.value : 0), 0);
  }

  function statusForMove() {
    if (over) return "No more moves.";
    if (won && !keepPlaying) return "2048 unlocked!";
    if (mergedTileIds.size > 0) return statusLines[(moves + mergedTileIds.size) % statusLines.length];
    return "Keep going!";
  }

  function render(statusText) {
    elements.score.textContent = String(score);
    elements.best.textContent = String(bestScore);
    elements.moves.textContent = String(moves);
    elements.status.textContent = statusText;
    elements.undo.disabled = !undoState;

    renderTiles();
    renderBoardState();
    renderOverlay();
    updateSubmitState();
  }

  function renderTiles() {
    elements.tileLayer.replaceChildren();

    cells.flat().forEach((tile) => {
      if (!tile) return;

      const tileNode = document.createElement("div");
      tileNode.className = "tile";
      tileNode.dataset.value = String(tile.value);
      tileNode.textContent = String(tile.value);
      tileNode.style.gridRowStart = String(tile.row + 1);
      tileNode.style.gridColumnStart = String(tile.col + 1);

      if (tile.id === newTileId) tileNode.classList.add("is-new");
      if (mergedTileIds.has(tile.id)) tileNode.classList.add("is-merged");
      if (tile.value >= 1024) tileNode.classList.add("is-huge");
      else if (tile.value >= 128) tileNode.classList.add("is-large");

      elements.tileLayer.append(tileNode);
    });
  }

  function renderBoardState() {
    const rows = cells.map((row) => row.map((tile) => (tile ? tile.value : 0)).join(", "));
    elements.boardState.textContent = `Score ${score}. Moves ${moves}. Board: ${rows.join(" / ")}.`;
  }

  function renderOverlay() {
    const showWin = won && !keepPlaying;
    const showOverlay = over || showWin;

    elements.overlay.classList.toggle("is-hidden", !showOverlay);
    if (!showOverlay) return;

    if (over) {
      elements.overlayTitle.textContent = "Game over";
      elements.overlayMessage.textContent = "No more moves.";
      elements.overlayPrimary.textContent = "New game";
      elements.overlaySecondary.textContent = "Undo";
      elements.overlaySecondary.hidden = !undoState;
      return;
    }

    elements.overlayTitle.textContent = "2048!";
    elements.overlayMessage.textContent = "Keep the board moving.";
    elements.overlayPrimary.textContent = "Keep playing";
    elements.overlaySecondary.textContent = "New game";
    elements.overlaySecondary.hidden = false;
  }

  function updateSubmitState() {
    elements.submitScore.disabled = leaderboardBusy || score <= 0;
  }

  function setLeaderboardStatus(message, isError) {
    elements.leaderboardStatus.textContent = message;
    elements.leaderboardStatus.classList.toggle("is-error", Boolean(isError));
  }

  function renderLeaderboard(scores) {
    elements.leaderboardList.replaceChildren();

    if (!scores.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "No scores yet.";
      elements.leaderboardList.append(empty);
      return;
    }

    scores.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "leaderboard-entry";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${index + 1}`;

      const player = document.createElement("span");
      player.className = "leaderboard-player";

      const name = document.createElement("strong");
      name.textContent = entry.name;

      const meta = document.createElement("span");
      meta.textContent = `${entry.moves} moves · ${entry.maxTile} tile`;

      const entryScore = document.createElement("strong");
      entryScore.className = "leaderboard-score";
      entryScore.textContent = String(entry.score);

      player.append(name, meta);
      item.append(rank, player, entryScore);
      elements.leaderboardList.append(item);
    });
  }

  async function loadLeaderboard() {
    setLeaderboardStatus("Loading rankings...");

    try {
      const response = await fetch(`/api/leaderboard?limit=${LEADERBOARD_LIMIT}`, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Leaderboard unavailable: ${response.status}`);
      }

      const data = await response.json();
      renderLeaderboard(data.scores || []);
      setLeaderboardStatus("Live rankings ready.");
    } catch (error) {
      renderLeaderboard([]);
      setLeaderboardStatus("Start server.js to enable public rankings.", true);
    }
  }

  async function submitScore(event) {
    event.preventDefault();

    const playerName = elements.playerName.value.trim();
    if (!playerName) {
      elements.playerName.focus();
      setLeaderboardStatus("Add a name before submitting.", true);
      return;
    }

    leaderboardBusy = true;
    updateSubmitState();
    setLeaderboardStatus("Submitting score...");

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: playerName,
          score,
          moves,
          maxTile: maxTileValue(),
          won,
          gameOver: over
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Score rejected.");
      }

      savePlayerName(data.entry.name);
      elements.playerName.value = data.entry.name;
      renderLeaderboard(data.scores || []);

      if (data.accepted) {
        setLeaderboardStatus(`Recorded at #${data.rank}.`);
      } else {
        setLeaderboardStatus(`Best existing score is still #${data.rank}.`);
      }
    } catch (error) {
      setLeaderboardStatus(error.message || "Could not submit score.", true);
    } finally {
      leaderboardBusy = false;
      updateSubmitState();
    }
  }

  function handleKeydown(event) {
    const direction = normalizeKey(event.key);
    if (!direction) return;
    event.preventDefault();
    move(direction);
  }

  function normalizeKey(key) {
    if (vectors[key]) return key;

    const aliases = {
      w: "ArrowUp",
      W: "ArrowUp",
      d: "ArrowRight",
      D: "ArrowRight",
      s: "ArrowDown",
      S: "ArrowDown",
      a: "ArrowLeft",
      A: "ArrowLeft"
    };

    return aliases[key] || null;
  }

  function handleTouchStart(event) {
    if (!event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    touchStart = {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  function handleTouchEnd(event) {
    if (!touchStart || !event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    touchStart = null;

    if (Math.max(absX, absY) < 28) return;
    event.preventDefault();

    if (absX > absY) {
      move(deltaX > 0 ? "ArrowRight" : "ArrowLeft");
    } else {
      move(deltaY > 0 ? "ArrowDown" : "ArrowUp");
    }
  }

  function continueGame() {
    keepPlaying = true;
    render("Keep going!");
  }

  function handleOverlayPrimary() {
    if (won && !keepPlaying && !over) {
      continueGame();
      return;
    }

    newGame();
  }

  function handleOverlaySecondary() {
    if (over && undoState) {
      restore(undoState);
      return;
    }

    if (won && !keepPlaying) {
      newGame();
    }
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    elements.board.addEventListener("touchstart", handleTouchStart, { passive: true });
    elements.board.addEventListener("touchend", handleTouchEnd, { passive: false });
    elements.restart.addEventListener("click", newGame);
    elements.undo.addEventListener("click", () => restore(undoState));
    elements.overlayPrimary.addEventListener("click", handleOverlayPrimary);
    elements.overlaySecondary.addEventListener("click", handleOverlaySecondary);
    elements.scoreForm.addEventListener("submit", submitScore);
    elements.refreshLeaderboard.addEventListener("click", loadLeaderboard);
  }

  bestScore = loadBestScore();
  leaderboardBusy = false;
  elements.playerName.value = loadPlayerName();
  bindEvents();
  newGame();
  loadLeaderboard();
})();
