"use strict";

require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { McpSession } = require("./mcpSession");

const PORT = process.env.PORT || 8787;
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;

if (!BRIDGE_TOKEN || BRIDGE_TOKEN === "change-me-to-a-long-random-string") {
  console.error("Set a real BRIDGE_TOKEN in .env before starting the bridge.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "10mb" }));

// --- auth ---------------------------------------------------------------
app.use((req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== BRIDGE_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Roblox Open Cloud passthrough --------------------------------------
// Generic proxy: the caller supplies the Open Cloud path/method/body, this
// server attaches the real API key so it never leaves your machine.
app.post("/opencloud/*", async (req, res) => {
  if (!ROBLOX_API_KEY) return res.status(400).json({ error: "ROBLOX_API_KEY not set" });

  const cloudPath = req.path.replace(/^\/opencloud/, "");
  const url = `https://apis.roblox.com${cloudPath}`;

  try {
    const upstream = await fetch(url, {
      method: req.body.method || "GET",
      headers: {
        "x-api-key": ROBLOX_API_KEY,
        "content-type": "application/json",
      },
      body: req.body.payload ? JSON.stringify(req.body.payload) : undefined,
    });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get("content-type") || "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

app.get("/opencloud/config", (_req, res) => {
  res.json({ universeId: ROBLOX_UNIVERSE_ID || null });
});

// --- Live Roblox Studio session (MCP) -----------------------------------
const studioMcpBat = process.env.STUDIO_MCP_BAT;
const mcp = studioMcpBat ? new McpSession(studioMcpBat) : null;

app.post("/mcp/start", (_req, res) => {
  if (!mcp) return res.status(400).json({ error: "STUDIO_MCP_BAT not configured" });
  mcp.start();
  res.json({ running: mcp.isRunning() });
});

app.post("/mcp/stop", (_req, res) => {
  if (!mcp) return res.status(400).json({ error: "STUDIO_MCP_BAT not configured" });
  mcp.stop();
  res.json({ running: mcp.isRunning() });
});

app.get("/mcp/status", (_req, res) => {
  res.json({ configured: !!mcp, running: !!mcp && mcp.isRunning() });
});

// Forward a single JSON-RPC call to the live Studio session, e.g.
// { "method": "tools/call", "params": { "name": "...", "arguments": {...} } }
app.post("/mcp/call", async (req, res) => {
  if (!mcp) return res.status(400).json({ error: "STUDIO_MCP_BAT not configured" });
  if (!mcp.isRunning()) return res.status(409).json({ error: "Studio MCP session not started; call /mcp/start first" });

  const { method, params } = req.body || {};
  if (!method) return res.status(400).json({ error: "method is required" });

  try {
    const result = await mcp.call(method, params);
    res.json({ result });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`roblox-bridge listening on http://127.0.0.1:${PORT}`);
  console.log("Expose it publicly with a tunnel (e.g. `cloudflared tunnel --url http://localhost:" + PORT + "`) if a remote Claude session needs to reach it.");
});
