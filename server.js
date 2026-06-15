"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const HOST = process.env.HOST || "0.0.0.0";
const SCORE_LIMIT = 200;
const MATCH_LIMIT = 300;
const DEFAULT_LEADERBOARD_LIMIT = 10;
const DEFAULT_MATCH_LIMIT = 10;
const MAX_BODY_BYTES = 256 * 1024;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(ROOT, "data");
const SCORE_DATA_FILE = process.env.SCORES_FILE || path.join(DATA_DIR, "scores.json");
const MATCH_DATA_FILE = process.env.MATCHES_FILE || path.join(DATA_DIR, "matches.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp"
};

const requestCounts = new Map();

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, message) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(message);
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return request.socket.remoteAddress || "unknown";
}

function isRateLimited(request) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = request.method === "POST" ? 20 : 120;
  const key = `${clientIp(request)}:${request.method}`;
  const record = requestCounts.get(key);

  if (!record || now - record.startedAt > windowMs) {
    requestCounts.set(key, { count: 1, startedAt: now });
    return false;
  }

  record.count += 1;
  return record.count > maxRequests;
}

async function readBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Request body too large."), { status: 413 });
    }
  }

  return body;
}

async function readJsonFile(filePath, key) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed[key]) ? parsed[key] : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonFile(filePath, key, records) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify({ [key]: records }, null, 2)}\n`, "utf8");
  await fs.rename(tmpFile, filePath);
}

async function readScores() {
  return readJsonFile(SCORE_DATA_FILE, "scores");
}

async function writeScores(scores) {
  return writeJsonFile(SCORE_DATA_FILE, "scores", scores);
}

async function readMatches() {
  return readJsonFile(MATCH_DATA_FILE, "matches");
}

async function writeMatches(matches) {
  return writeJsonFile(MATCH_DATA_FILE, "matches", matches);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 28);
}

function normalizeNameKey(name) {
  return normalizeName(name).toLocaleLowerCase();
}

function readInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

function clampText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeIso(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeScore(score) {
  return {
    id: score.id || crypto.randomUUID(),
    name: normalizeName(score.name),
    prestige: Math.max(0, readInteger(score.prestige ?? score.score, 0)),
    rounds: Math.max(0, readInteger(score.rounds ?? score.moves, 0)),
    cards: Math.max(0, readInteger(score.cards ?? score.maxTile, 0)),
    won: Boolean(score.won),
    createdAt: score.createdAt || new Date().toISOString()
  };
}

function compareScores(first, second) {
  if (first.won !== second.won) return first.won ? -1 : 1;
  if (first.prestige !== second.prestige) return second.prestige - first.prestige;
  if (first.cards !== second.cards) return second.cards - first.cards;
  if (first.rounds !== second.rounds) return first.rounds - second.rounds;
  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}

function isBetterScore(candidate, existing) {
  return compareScores(candidate, existing) < 0;
}

function sanitizeScores(scores) {
  return scores
    .filter((score) => score && typeof score.name === "string")
    .map(normalizeScore)
    .filter((score) => score.name)
    .sort(compareScores)
    .slice(0, SCORE_LIMIT);
}

function publicScore(score) {
  return {
    id: score.id,
    name: score.name,
    prestige: score.prestige,
    rounds: score.rounds,
    cards: score.cards,
    won: score.won,
    createdAt: score.createdAt,
    score: score.prestige,
    moves: score.rounds,
    maxTile: score.cards
  };
}

function validateEntry(payload) {
  const name = normalizeName(payload.name);
  const prestige = readInteger(payload.prestige ?? payload.score, -1);
  const rounds = readInteger(payload.rounds ?? payload.moves, -1);
  const cards = readInteger(payload.cards ?? payload.maxTile, -1);

  if (!name) return { error: "Name is required." };
  if (prestige < 0 || prestige > 1000) return { error: "Prestige looks invalid." };
  if (rounds < 1 || rounds > 10000) return { error: "Rounds look invalid." };
  if (cards < 0 || cards > 1000) return { error: "Cards look invalid." };

  return {
    entry: {
      id: crypto.randomUUID(),
      name,
      prestige,
      rounds,
      cards,
      won: Boolean(payload.won),
      createdAt: new Date().toISOString()
    }
  };
}

function rankedPayload(scores, entry, accepted, limit) {
  const rank = scores.findIndex((score) => score.id === entry.id) + 1;
  return {
    accepted,
    rank: rank || null,
    entry: publicScore(entry),
    scores: scores.slice(0, limit).map(publicScore)
  };
}

function normalizeGemMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ruby: Math.max(0, readInteger(source.ruby, 0)),
    sapphire: Math.max(0, readInteger(source.sapphire, 0)),
    emerald: Math.max(0, readInteger(source.emerald, 0)),
    diamond: Math.max(0, readInteger(source.diamond, 0)),
    onyx: Math.max(0, readInteger(source.onyx, 0)),
    gold: Math.max(0, readInteger(source.gold, 0))
  };
}

function normalizeBonusMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ruby: Math.max(0, readInteger(source.ruby, 0)),
    sapphire: Math.max(0, readInteger(source.sapphire, 0)),
    emerald: Math.max(0, readInteger(source.emerald, 0)),
    diamond: Math.max(0, readInteger(source.diamond, 0)),
    onyx: Math.max(0, readInteger(source.onyx, 0))
  };
}

function normalizePlayer(player) {
  return {
    id: clampText(player && player.id, 48),
    name: normalizeName(player && player.name),
    prestige: Math.max(0, readInteger(player && player.prestige, 0)),
    cards: Math.max(0, readInteger(player && player.cards, 0)),
    reserved: Math.max(0, readInteger(player && player.reserved, 0)),
    nobles: Math.max(0, readInteger(player && player.nobles, 0)),
    bonuses: normalizeBonusMap(player && player.bonuses),
    tokens: normalizeGemMap(player && player.tokens)
  };
}

function normalizeAction(action, index) {
  let detail = null;
  if (action && action.detail && typeof action.detail === "object") {
    const detailText = JSON.stringify(action.detail);
    if (detailText.length <= 2400) detail = action.detail;
  }

  return {
    step: Math.max(1, readInteger(action && action.step, index + 1)),
    round: Math.max(1, readInteger(action && action.round, 1)),
    playerId: clampText(action && action.playerId, 48),
    playerName: normalizeName(action && action.playerName),
    type: clampText(action && action.type, 32) || "log",
    summary: clampText(action && action.summary, 240),
    detail,
    at: normalizeIso(action && action.at)
  };
}

function normalizeMatch(match) {
  const playerCount = readInteger(match.playerCount, 4);
  const actions = Array.isArray(match.actions) ? match.actions.slice(0, 500).map(normalizeAction) : [];
  const players = Array.isArray(match.players) ? match.players.slice(0, 4).map(normalizePlayer) : [];

  return {
    id: clampText(match.id, 80) || crypto.randomUUID(),
    guestId: clampText(match.guestId, 80),
    playerName: normalizeName(match.playerName),
    playerCount: [2, 3, 4].includes(playerCount) ? playerCount : 4,
    result: match.result === "win" ? "win" : "loss",
    winnerId: clampText(match.winnerId, 48),
    winnerName: normalizeName(match.winnerName),
    rounds: Math.max(1, readInteger(match.rounds, 1)),
    startedAt: normalizeIso(match.startedAt),
    endedAt: normalizeIso(match.endedAt),
    players,
    actions,
    actionCount: actions.length
  };
}

function compareMatches(first, second) {
  return new Date(second.endedAt).getTime() - new Date(first.endedAt).getTime();
}

function sanitizeMatches(matches) {
  return matches
    .filter((match) => match && typeof match === "object")
    .map(normalizeMatch)
    .filter((match) => match.id && match.playerName && match.winnerName)
    .sort(compareMatches)
    .slice(0, MATCH_LIMIT);
}

function publicMatch(match, includeActions) {
  const payload = {
    id: match.id,
    guestId: match.guestId,
    playerName: match.playerName,
    playerCount: match.playerCount,
    result: match.result,
    winnerId: match.winnerId,
    winnerName: match.winnerName,
    rounds: match.rounds,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    players: match.players,
    actionCount: match.actionCount
  };

  if (includeActions) payload.actions = match.actions;
  return payload;
}

function validateMatch(payload) {
  const match = normalizeMatch(payload || {});

  if (!match.playerName) return { error: "Player name is required." };
  if (![2, 3, 4].includes(match.playerCount)) return { error: "Player count is invalid." };
  if (match.rounds < 1 || match.rounds > 10000) return { error: "Rounds look invalid." };
  if (!match.winnerName || !match.winnerId) return { error: "Winner is required." };
  if (!match.players.length || match.players.length > 4) return { error: "Players look invalid." };
  if (!match.actions.length || match.actions.length > 500) return { error: "Actions look invalid." };

  return { match };
}

async function handleLeaderboard(request, response, url) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const limit = Math.min(
    50,
    Math.max(1, readInteger(url.searchParams.get("limit"), DEFAULT_LEADERBOARD_LIMIT))
  );
  const scores = sanitizeScores(await readScores());

  sendJson(response, 200, {
    scores: scores.slice(0, limit).map(publicScore)
  });
}

async function handleScoreSubmit(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const rawBody = await readBody(request);
  let payload;

  try {
    payload = JSON.parse(rawBody || "{}");
  } catch (error) {
    sendJson(response, 400, { error: "Invalid JSON." });
    return;
  }

  const validation = validateEntry(payload);
  if (validation.error) {
    sendJson(response, 400, { error: validation.error });
    return;
  }

  const incoming = validation.entry;
  const scores = sanitizeScores(await readScores());
  const sameNameIndex = scores.findIndex((score) => normalizeNameKey(score.name) === normalizeNameKey(incoming.name));
  let accepted = true;
  let entry = incoming;

  if (sameNameIndex >= 0) {
    const existing = scores[sameNameIndex];
    if (isBetterScore(incoming, existing)) {
      scores[sameNameIndex] = incoming;
    } else {
      accepted = false;
      entry = existing;
    }
  } else {
    scores.push(incoming);
  }

  const ranked = sanitizeScores(scores).slice(0, SCORE_LIMIT);
  await writeScores(ranked);

  sendJson(response, accepted ? 201 : 200, rankedPayload(ranked, entry, accepted, DEFAULT_LEADERBOARD_LIMIT));
}

async function handleMatches(request, response, url) {
  if (request.method === "GET") {
    const limit = Math.min(50, Math.max(1, readInteger(url.searchParams.get("limit"), DEFAULT_MATCH_LIMIT)));
    const matches = sanitizeMatches(await readMatches());
    sendJson(response, 200, {
      matches: matches.slice(0, limit).map((match) => publicMatch(match, false))
    });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const rawBody = await readBody(request);
  let payload;

  try {
    payload = JSON.parse(rawBody || "{}");
  } catch (error) {
    sendJson(response, 400, { error: "Invalid JSON." });
    return;
  }

  const validation = validateMatch(payload);
  if (validation.error) {
    sendJson(response, 400, { error: validation.error });
    return;
  }

  const incoming = validation.match;
  const matches = sanitizeMatches(await readMatches()).filter((match) => match.id !== incoming.id);
  matches.push(incoming);
  const ranked = sanitizeMatches(matches).slice(0, MATCH_LIMIT);
  await writeMatches(ranked);

  sendJson(response, 201, {
    match: publicMatch(incoming, true),
    matches: ranked.slice(0, DEFAULT_MATCH_LIMIT).map((match) => publicMatch(match, false))
  });
}

async function handleMatchDetail(request, response, matchId) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const matches = sanitizeMatches(await readMatches());
  const match = matches.find((candidate) => candidate.id === matchId);
  if (!match) {
    sendJson(response, 404, { error: "Match not found." });
    return;
  }

  sendJson(response, 200, {
    match: publicMatch(match, true)
  });
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed.");
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const allowedRoot = requestedPath === "/index.html" || requestedPath === "/styles.css" || requestedPath === "/script.js";
  const requestedAsset = requestedPath.startsWith("/assets/");

  if (!allowedRoot && !requestedAsset) {
    sendText(response, 404, "Not found.");
    return;
  }

  const filePath = path.normalize(path.join(ROOT, requestedPath));
  const assetRoot = path.join(ROOT, "assets");
  const allowedAsset = requestedAsset && filePath.startsWith(`${assetRoot}${path.sep}`);

  if (!allowedRoot && !allowedAsset) {
    sendText(response, 403, "Forbidden.");
    return;
  }

  try {
    const extension = path.extname(filePath);
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const data = await fs.readFile(filePath);

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") response.end();
    else response.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Not found.");
      return;
    }

    throw error;
  }
}

async function route(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Too many requests. Try again soon." });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/leaderboard") {
    await handleLeaderboard(request, response, url);
    return;
  }

  if (url.pathname === "/api/scores") {
    await handleScoreSubmit(request, response);
    return;
  }

  if (url.pathname === "/api/matches") {
    await handleMatches(request, response, url);
    return;
  }

  if (url.pathname.startsWith("/api/matches/")) {
    const matchId = decodeURIComponent(url.pathname.slice("/api/matches/".length));
    await handleMatchDetail(request, response, matchId);
    return;
  }

  await serveStatic(request, response, url);
}

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    const status = error.status || 500;
    console.error(error);
    sendJson(response, status, {
      error: status === 500 ? "Internal server error." : error.message
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Piano curriculum server listening on http://localhost:${PORT}`);
});
