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
const DEFAULT_LEADERBOARD_LIMIT = 10;
const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_DATA_FILE = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "scores.json")
  : path.join(ROOT, "data", "scores.json");
const DATA_FILE = process.env.SCORES_FILE || DEFAULT_DATA_FILE;

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
  const maxRequests = request.method === "POST" ? 12 : 90;
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

async function readScores() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.scores) ? parsed.scores : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeScores(scores) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify({ scores }, null, 2)}\n`, "utf8");
  await fs.rename(tmpFile, DATA_FILE);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
}

function normalizeNameKey(name) {
  return normalizeName(name).toLocaleLowerCase();
}

function readInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

function compareScores(first, second) {
  if (first.score !== second.score) return second.score - first.score;
  if (first.maxTile !== second.maxTile) return second.maxTile - first.maxTile;
  if (first.moves !== second.moves) return first.moves - second.moves;
  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}

function isBetterScore(candidate, existing) {
  return compareScores(candidate, existing) < 0;
}

function sanitizeScores(scores) {
  return scores
    .filter((score) => score && typeof score.name === "string")
    .map((score) => ({
      id: score.id || crypto.randomUUID(),
      name: normalizeName(score.name),
      score: readInteger(score.score, 0),
      moves: Math.max(0, readInteger(score.moves, 0)),
      maxTile: Math.max(0, readInteger(score.maxTile, 0)),
      won: Boolean(score.won),
      createdAt: score.createdAt || new Date().toISOString()
    }))
    .filter((score) => score.name && score.score >= 0)
    .sort(compareScores)
    .slice(0, SCORE_LIMIT);
}

function publicScore(score) {
  return {
    id: score.id,
    name: score.name,
    score: score.score,
    moves: score.moves,
    maxTile: score.maxTile,
    won: score.won,
    createdAt: score.createdAt
  };
}

function validateEntry(payload) {
  const name = normalizeName(payload.name);
  const score = readInteger(payload.score, -1);
  const moves = readInteger(payload.moves, -1);
  const maxTile = readInteger(payload.maxTile, 0);

  if (!name) {
    return { error: "Name is required." };
  }

  if (score < 1 || score > 1000000000) {
    return { error: "Score must be a positive number." };
  }

  if (moves < 1 || moves > 1000000) {
    return { error: "Moves must be a positive number." };
  }

  if (maxTile < 2 || maxTile > 1000000000) {
    return { error: "Max tile looks invalid." };
  }

  return {
    entry: {
      id: crypto.randomUUID(),
      name,
      score,
      moves,
      maxTile,
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

    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(data);
    }
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
  console.log(`2048 server listening on http://localhost:${PORT}`);
});
