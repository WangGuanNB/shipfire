import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { debitCreditsSql } from "../src/lib/credits-sql";
import { creditWindows } from "../src/lib/billing-policy";
import { quoteCredits, validateInput, resolveTool } from "../src/ai/catalog";
import { getToolCatalog } from "../src/config/ai";

function database() {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE credits_shipfire (id INTEGER PRIMARY KEY, trans_no TEXT UNIQUE NOT NULL, created_at INTEGER, user_uuid TEXT NOT NULL, trans_type TEXT NOT NULL, credits INTEGER NOT NULL, order_no TEXT, expired_at INTEGER);
    CREATE TABLE orders_shipfire (id INTEGER PRIMARY KEY);`);
  db.exec(readFileSync("src/db/migrations/0003_ai_foundation.sql", "utf8"));
  return db;
}
const now = Math.floor(Date.now()/1000);
function grant(db: Database.Database, id: string, credits: number, expiry: number | null = null, available: number | null = null) {
  db.prepare("INSERT INTO credits_shipfire (trans_no,user_uuid,trans_type,credits,expired_at,available_at) VALUES (?,'u','grant',?,?,?)").run(id, credits, expiry, available);
}
function create(db: Database.Database, id: string, credits: number) {
  return db.prepare("INSERT INTO ai_tasks_shipfire (id,user_id,request_key,tool_id,model_id,model_snapshot,input,status,credits,created_at,updated_at) VALUES (?,'u',?,'custom-tool','model','{}','{}','queued',?,?,?) ON CONFLICT DO NOTHING").run(id, id, credits, now, now);
}
function balance(db: Database.Database) {
  return (db.prepare("SELECT COALESCE(SUM(credits),0) AS n FROM credits_shipfire WHERE (expired_at IS NULL OR expired_at>unixepoch()) AND (available_at IS NULL OR available_at<=unixepoch())").get() as { n:number }).n;
}

test("reservations are atomic, duplicate task keys do not reserve twice, overspend is rejected", () => {
  const db = database(); grant(db,"g",30);
  create(db,"one",20); create(db,"one",20);
  assert.equal(balance(db),10);
  assert.throws(() => create(db,"two",20),/insufficient_credits/);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ai_tasks_shipfire").get() as any).n,1);
  db.close();
});
test("refunds preserve each expiry bucket, occur once, and success cannot be refunded", () => {
  const db = database(); grant(db,"a",10,now+100); grant(db,"b",20,now+200);
  create(db,"t",25);
  const debits = db.prepare("SELECT credits,expired_at FROM credits_shipfire WHERE trans_type='task_reserve' ORDER BY expired_at").all();
  assert.deepEqual(debits,[{credits:-10,expired_at:now+100},{credits:-15,expired_at:now+200}]);
  db.prepare("UPDATE ai_tasks_shipfire SET status='failed' WHERE id='t'").run();
  db.prepare("UPDATE ai_tasks_shipfire SET status='failed' WHERE id='t'").run();
  assert.equal(balance(db),30);
  create(db,"ok",20); db.prepare("UPDATE ai_tasks_shipfire SET status='succeeded' WHERE id='ok'").run();
  assert.throws(() => db.prepare("UPDATE ai_tasks_shipfire SET status='failed' WHERE id='ok'").run(),/terminal_task/);
  assert.equal(balance(db),10); db.close();
});
test("expired and future credits cannot fund tasks; no-expiry credits remain usable", () => {
  const db = database(); grant(db,"expired",100,now-10); grant(db,"future",100,now+200,now+100); grant(db,"now",10);
  assert.equal(balance(db),10); assert.throws(() => create(db,"too-big",20),/insufficient_credits/);
  create(db,"ok",10); assert.equal(balance(db),0); db.close();
});
test("legacy direct debits cannot overspend and respect existing task reservations", () => {
  const db=database(); grant(db,"g",30); create(db,"t",20);
  const dialect = new SQLiteSyncDialect();
  const execute=(amount:number,key:string) => { const q=dialect.sqlToQuery(debitCreditsSql("u",amount,key,"ping")); db.prepare(q.sql).run(...q.params); };
  execute(20,"over"); assert.equal(balance(db),10);
  execute(10,"ok"); execute(10,"ok"); assert.equal(balance(db),0);
  db.close();
});
test("a mixed negative adjustment cannot be bypassed by positive expiry buckets", () => {
  const db=database(); grant(db,"g",100,now+100); grant(db,"adjust",-80);
  assert.throws(()=>create(db,"big",30),/insufficient_credits/);
  create(db,"small",20); assert.equal(balance(db),0); db.close();
});
test("yearly monthly allowances have twelve calendar windows without month-end drift", () => {
  const start=Date.UTC(2024,0,31)/1000, end=Date.UTC(2025,0,31)/1000;
  const windows=creditWindows(start,end,"month");
  assert.equal(windows.length,12); assert.equal(windows[0].end,Date.UTC(2024,1,29)/1000);
  assert.equal(windows[1].end,Date.UTC(2024,2,31)/1000);
  assert.equal(windows[11].end,end);
  for(let i=1;i<windows.length;i++)assert.equal(windows[i].start,windows[i-1].end);
  assert.deepEqual(creditWindows(start,end,"billing"),[{start,end}]);
});
test("duplicate invoice grants are unique; future monthly grants do not inflate current balance", () => {
  const db=database();
  for(let retry=0;retry<2;retry++) for(let month=0;month<12;month++) db.prepare("INSERT OR IGNORE INTO credits_shipfire(trans_no,user_uuid,trans_type,credits,available_at,expired_at) VALUES (?,'u','paid_period',100,?,?)").run(`invoice:1:${month}`,now+month*100,now+(month+1)*100);
  assert.equal(balance(db),100);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM credits_shipfire").get() as any).n,12); db.close();
});
test("models drive strict validation and quotes; disabling a tool prevents API use", () => {
  const previous=process.env.AI_ENABLED_TOOLS;
  process.env.AI_ENABLED_TOOLS="image-generator,video-generator";
  const model=resolveTool("video-generator","basic").model;
  const input=validateInput({prompt:"A sunrise",resolution:"1080p",duration:10,aspectRatio:"16:9"},model);
  assert.equal(quoteCredits(model,input),80);
  const fast=resolveTool("video-generator","seedance-2-fast").model;
  assert.equal(quoteCredits(fast,{prompt:"Test",resolution:"720p",duration:5,aspectRatio:"16:9"}),25);
  const pro=resolveTool("video-generator","seedance-2").model;
  assert.equal(quoteCredits(pro,{prompt:"Test",resolution:"1080p",duration:5,aspectRatio:"16:9"}),70);
  const wan=resolveTool("video-generator","wan-2.6").model;
  assert.equal(quoteCredits(wan,{prompt:"Test",resolution:"1080p",duration:15,aspectRatio:"16:9"}),300);
  assert.throws(()=>validateInput({...input,duration:999},model),/duration/);
  assert.throws(()=>validateInput({...input,resolution:"4K"},model),/parameters/);
  assert.throws(()=>validateInput({...input,mode:"image",imageUrl:"http://127.0.0.1/private"},model),/Upload/);
  process.env.AI_ENABLED_TOOLS="image-generator";
  assert.throws(()=>resolveTool("video-generator","basic"),/unavailable/);
  assert.ok(getToolCatalog().find(t=>t.id==="image-generator")?.enabled);
  if(previous===undefined)delete process.env.AI_ENABLED_TOOLS; else process.env.AI_ENABLED_TOOLS=previous;
});
