"use strict";

const { spawn } = require("child_process");
const readline = require("readline");

/**
 * Wraps the local Roblox Studio MCP process (mcp.bat) as a single long-lived
 * child process, and turns its line-delimited JSON-RPC stdio protocol into
 * request/response promises keyed by JSON-RPC id.
 */
class McpSession {
  constructor(batPath) {
    this.batPath = batPath;
    this.child = null;
    this.pending = new Map();
    this.nextId = 1;
  }

  start() {
    if (this.child) return;

    this.child = spawn("cmd.exe", ["/c", this.batPath], {
      windowsHide: true,
    });

    this.child.on("exit", (code) => {
      const err = new Error(`Studio MCP process exited (code ${code})`);
      for (const { reject } of this.pending.values()) reject(err);
      this.pending.clear();
      this.child = null;
    });

    this.child.stderr.on("data", (chunk) => {
      process.stderr.write(`[studio-mcp stderr] ${chunk}`);
    });

    const rl = readline.createInterface({ input: this.child.stdout });
    rl.on("line", (line) => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return; // not JSON-RPC, e.g. banner/log output
      }
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message || "MCP error"));
      else waiter.resolve(msg.result);
    });
  }

  stop() {
    if (this.child) this.child.kill();
    this.child = null;
  }

  isRunning() {
    return !!this.child;
  }

  /** Send a JSON-RPC request and resolve with its result. */
  call(method, params, timeoutMs = 15000) {
    if (!this.child) throw new Error("Studio MCP session not started");

    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP call '${method}' timed out`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      this.child.stdin.write(payload);
    });
  }
}

module.exports = { McpSession };
