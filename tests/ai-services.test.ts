import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";

// Exercise the real async D1 services against SQLite. All outbound HTTP is blocked.
test("task and billing services survive concurrent calls, replay and interrupted fulfillment", async () => {
  const sqlite = new Database(":memory:");
  for (const name of ["0000_lonely_hydra", "0001_sparkling_bushwacker", "0002_groovy_ezekiel", "0003_ai_foundation"]) sqlite.exec(readFileSync(`src/db/migrations/${name}.sql`, "utf8"));
  const originalFetch = globalThis.fetch;
  const previousEnv = { ...process.env };
  process.env.CLOUDFLARE_D1_TOKEN = "test-only";
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-only";
  process.env.CLOUDFLARE_D1_DATABASE_ID = "test-only";
  process.env.STRIPE_PRIVATE_KEY = "sk_test_not_a_real_key";
  process.env.AI_ENABLED_TOOLS = "image-generator,video-generator";
  globalThis.fetch = (async (url, options) => {
    assert.equal(String(url), "https://api.cloudflare.com/client/v4/accounts/test-only/d1/database/test-only/query", "Tests must never call an external provider");
    const { sql, params } = JSON.parse(String(options?.body));
    const statement = sqlite.prepare(sql);
    const rows = statement.reader ? statement.all(...params) : (statement.run(...params), []);
    return Response.json({ success: true, result: [{ success: true, results: rows, meta: {} }] });
  }) as typeof fetch;
  try {
    const { clearDbCache } = await import("../src/db");
    clearDbCache();
    const { createTask, advanceTask, getTask, listTasks } = await import("../src/ai/tasks");
    const { adapters } = await import("../src/ai/adapters");
    const originalAdapter = adapters["kie-seedance"];
    let submissions = 0;
    adapters["kie-seedance"] = {
      ...originalAdapter, checkConfiguration() {},
      async submit() { submissions++; return { status: "running", providerTaskId: "fake-provider-task" }; },
      async poll() { return { status: "succeeded", artifacts: [{ kind: "text", text: "Generic artifact" }] }; },
    };
    const now = Math.floor(Date.now()/1000);
    sqlite.prepare("INSERT INTO credits_shipfire (trans_no,user_uuid,trans_type,credits) VALUES ('grant','owner','test',100)").run();
    const input={prompt:"Test",resolution:"480p",duration:5,aspectRatio:"16:9"};
    const [one,two] = await Promise.all([
      createTask("owner","video-generator","basic",input,"request-0000000001"),
      createTask("owner","video-generator","basic",input,"request-0000000001"),
    ]);
    assert.equal(one.id,two.id);
    await Promise.all([advanceTask(one),advanceTask(two)]);
    assert.equal(submissions,1);
    await assert.rejects(getTask(one.id,"another-user"),/not found/);
    await assert.rejects(createTask("owner","video-generator","basic",{...input,prompt:"Different"},"request-0000000001"),/different inputs/);
    sqlite.prepare("UPDATE ai_tasks_shipfire SET next_poll_at=0 WHERE id=?").run(one.id);
    const done=await advanceTask(await getTask(one.id,"owner"));
    assert.equal(done.status,"succeeded");
    assert.equal((await listTasks("another-user")).length,0);
    assert.equal((sqlite.prepare("SELECT SUM(credits) n FROM credits_shipfire WHERE user_uuid='owner'").get() as any).n,80);
    await assert.rejects(createTask("empty","video-generator","basic",input,"request-0000000000"), (e: any) => e.status === 402);

    adapters["kie-seedance"] = { ...adapters["kie-seedance"], async submit() { throw new Error("Connection interrupted after submission"); } };
    const ambiguous=await advanceTask(await createTask("owner","video-generator","basic",input,"request-0000000002"));
    assert.equal(ambiguous.status,"needs_review");
    await advanceTask(ambiguous);
    assert.equal((sqlite.prepare("SELECT SUM(credits) n FROM credits_shipfire WHERE user_uuid='owner'").get() as any).n,60);
    sqlite.prepare("UPDATE ai_tasks_shipfire SET status='failed' WHERE id=?").run(ambiguous.id);
    assert.equal((sqlite.prepare("SELECT SUM(credits) n FROM credits_shipfire WHERE user_uuid='owner'").get() as any).n,80);
    adapters["kie-seedance"] = originalAdapter;

    const { getStripeClient }=await import("../src/services/stripe");
    const { fulfillStripeInvoice }=await import("../src/services/stripe-billing");
    const stripe=getStripeClient();
    const subscription={id:"sub_test",customer:"cus_test",metadata:{order_no:"order_test"},status:"active",ended_at:null};
    stripe.subscriptions.retrieve=(async()=>subscription) as any;
    sqlite.prepare("INSERT INTO orders_shipfire (order_no,user_uuid,user_email,amount,status,credits,interval,expired_at,billing_snapshot) VALUES ('order_test','subscriber','test@example.invalid',1000,'created',100,'year',?,?)").run(now+99999999,JSON.stringify({planId:"arbitrary-plan",credits:100,grantCadence:"month",entitlements:["custom-feature"]}));
    const end=now+365*86400;
    const invoice={id:"in_test",status:"paid",subscription:"sub_test",billing_reason:"subscription_create",lines:{data:[{type:"subscription",proration:false,period:{start:now,end}}]},status_transitions:{paid_at:now}} as any;
    // Fail during the second monthly grant, then replay the same invoice.
    sqlite.exec("CREATE TRIGGER simulated_failure BEFORE INSERT ON credits_shipfire WHEN NEW.trans_type='paid_period' AND (SELECT COUNT(*) FROM credits_shipfire WHERE trans_type='paid_period')=1 BEGIN SELECT RAISE(ABORT,'simulated interruption'); END;");
    await assert.rejects(fulfillStripeInvoice(invoice), (e: any) => e.cause?.code === "SQLITE_CONSTRAINT_TRIGGER");
    assert.equal((sqlite.prepare("SELECT status FROM orders_shipfire WHERE order_no='order_test'").get() as any).status,"created");
    sqlite.exec("DROP TRIGGER simulated_failure");
    await fulfillStripeInvoice(invoice);
    await fulfillStripeInvoice(invoice);
    const grantCount=(sqlite.prepare("SELECT COUNT(*) n FROM credits_shipfire WHERE trans_type='paid_period'").get() as any).n;
    assert.ok(grantCount>=12 && grantCount<=13); // 365-day fixture may end partway through the last calendar month.
    assert.equal((sqlite.prepare("SELECT SUM(credits) n FROM credits_shipfire WHERE user_uuid='subscriber' AND available_at<=unixepoch() AND expired_at>unixepoch()").get() as any).n,100);
    assert.equal((sqlite.prepare("SELECT expired_at FROM orders_shipfire WHERE order_no='order_test'").get() as any).expired_at,end);
    const { assertEntitlements }=await import("../src/services/billing");
    await assertEntitlements("subscriber",["custom-feature"]);
    await assert.rejects(assertEntitlements("owner",["custom-feature"]),/does not include/);
    clearDbCache();
  } finally {
    globalThis.fetch=originalFetch;
    for(const key of ["CLOUDFLARE_D1_TOKEN","CLOUDFLARE_ACCOUNT_ID","CLOUDFLARE_D1_DATABASE_ID","STRIPE_PRIVATE_KEY","AI_ENABLED_TOOLS"]) {
      if(previousEnv[key]===undefined) delete process.env[key]; else process.env[key]=previousEnv[key];
    }
    sqlite.close();
  }
});
