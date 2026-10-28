import { existsSync, readFileSync } from "node:fs";
import dotenv from "dotenv";

const localFile = new URL("../.env.local", import.meta.url);
const local = existsSync(localFile) ? dotenv.parse(readFileSync(localFile)) : {};
const origin = process.argv.find(value => /^https?:\/\//.test(value)) || process.env.NEXT_PUBLIC_WEB_URL || local.NEXT_PUBLIC_WEB_URL || "https://shipstart.net";
const url = new URL("/api/ai/diagnostics/template/", origin);
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Use HTTPS outside local development");
const secret = process.env.AI_MAINTENANCE_SECRET || local.AI_MAINTENANCE_SECRET;
if (!secret) throw new Error("AI_MAINTENANCE_SECRET is required");
const response = await fetch(url, {
  method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  body: JSON.stringify({ checkStorage: process.argv.includes("--storage") }), signal: AbortSignal.timeout(120000),
});
const result = await response.json().catch(() => ({ error: `Unexpected response: HTTP ${response.status}` }));
console.log(JSON.stringify(result, null, 2));
if (!response.ok || result.ok !== true) process.exitCode = 1;
