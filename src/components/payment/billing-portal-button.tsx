"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
export default function BillingPortalButton() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Billing unavailable"); setBusy(false); }
  }}>{locale === "zh" ? "管理订阅与付款方式" : "Manage subscription & billing"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
