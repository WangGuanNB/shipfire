import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import path from "node:path";

const source = readFileSync("scripts/load-wrangler-env.js", "utf8");

function run(command: string[], local: Record<string, string> = {}) {
  const env: Record<string, string> = { GLOBAL_AGENT_HTTP_PROXY: "http://127.0.0.1:7889", AUTH_GOOGLE_SECRET: "private-test-secret", NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED: "false" };
  const logs: string[] = [];
  let envLoads = 0;
  let childEnv: Record<string, string> | undefined;
  runInNewContext(source, {
    __dirname: "/site/scripts", process: { env, argv: ["node", "script", ...command], cwd: () => "/site" },
    console: { log: (s: string) => logs.push(s), error: (s: string) => logs.push(s) },
    require: (name: string) => {
      if (name === "path") return path;
      if (name === "fs") return { readFileSync: () => JSON.stringify({ vars: {
        AUTH_URL: "https://production.example/api/auth", NEXT_PUBLIC_WEB_URL: "https://production.example",
        AUTH_TRUST_HOST: "true", AUTH_SECRET: "", AUTH_GOOGLE_SECRET: "", NEW_USER_CREDITS: "20",
        NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED: "true",
      } }) };
      if (name === "@next/env") return { loadEnvConfig: (root: string, dev: boolean) => {
        assert.equal(root, "/site"); assert.equal(dev, true); envLoads++;
        Object.assign(env, local);
      } };
      if (name === "child_process") return { spawn: (_command: string, options: { env: Record<string, string> }) => {
        childEnv = options.env;
        return { on() {} };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return { env, childEnv, envLoads, logs };
}

test("local dev and proxy dev keep tunnel URLs, secrets and explicit local flags", () => {
  for (const command of [["next", "dev", "--turbopack"], ["next", "dev", "--turbopack", "--port", "3001"]]) {
    const result = run(command, {
      AUTH_URL: "https://dev.example/api/auth", NEXT_PUBLIC_WEB_URL: "https://dev.example",
      AUTH_SECRET: "local-test-secret", NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED: "false",
    });
    assert.equal(result.envLoads, 1);
    assert.equal(result.childEnv?.AUTH_URL, "https://dev.example/api/auth");
    assert.equal(result.childEnv?.NEXT_PUBLIC_WEB_URL, "https://dev.example");
    assert.equal(result.childEnv?.AUTH_SECRET, "local-test-secret");
    assert.equal(result.childEnv?.AUTH_GOOGLE_SECRET, "private-test-secret");
    assert.equal(result.childEnv?.GLOBAL_AGENT_HTTP_PROXY, "http://127.0.0.1:7889");
    assert.equal(result.childEnv?.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED, "false");
    assert.equal(result.childEnv?.NEW_USER_CREDITS, "20");
    assert.ok(result.logs.every(line => !line.includes("test-secret")));
  }
});

test("production builds retain Wrangler precedence and never preload development env", () => {
  const result = run(["next", "build"], { AUTH_URL: "https://dev.example/api/auth", AUTH_SECRET: "local-test-secret" });
  assert.equal(result.envLoads, 0);
  assert.equal(result.childEnv?.AUTH_URL, "https://production.example/api/auth");
  assert.equal(result.childEnv?.NEXT_PUBLIC_WEB_URL, "https://production.example");
  assert.equal(result.childEnv?.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED, "true");
  assert.equal(result.childEnv?.AUTH_GOOGLE_SECRET, "private-test-secret");
  assert.equal(result.childEnv?.AUTH_SECRET, undefined);
});

test("existing production payment flags still override conflicting shell flags", () => {
  const result = run([]);
  assert.equal(result.envLoads, 0);
  assert.equal(result.env.AUTH_URL, "https://production.example/api/auth");
  assert.equal(result.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED, "true");
});
