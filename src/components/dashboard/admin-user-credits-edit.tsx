"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ApiJson = {
  code: number;
  message: string;
  data?: {
    raw_left_credits?: number;
    previous?: number;
    delta?: number;
  };
};

export default function AdminUserCreditsEdit({
  userUuid,
}: {
  userUuid: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/user-credits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_uuid: userUuid, action: "get" }),
      });
      const json = (await res.json()) as ApiJson;
      if (json.code !== 0) {
        setError(json.message || "failed");
        setCurrent(null);
        return;
      }
      const raw = json.data?.raw_left_credits ?? 0;
      setCurrent(raw);
      setTargetInput(String(raw));
    } catch {
      setError("network error");
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, [userUuid]);

  useEffect(() => {
    if (open) {
      void loadBalance();
    }
  }, [open, loadBalance]);

  async function onSave() {
    setSaving(true);
    setError("");
    try {
      const t = Number(targetInput);
      if (!Number.isFinite(t)) {
        setError("Invalid target");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/admin/user-credits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uuid: userUuid,
          action: "set",
          target: t,
        }),
      });
      const json = (await res.json()) as ApiJson;
      if (json.code !== 0) {
        setError(json.message || "failed");
        return;
      }
      const next = json.data?.raw_left_credits ?? 0;
      setCurrent(next);
      setTargetInput(String(next));
      setOpen(false);
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit credits
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust credits</DialogTitle>
            <DialogDescription>
              Set target balance (sum of non-expired ledger rows). Values below
              zero are allowed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Current balance</Label>
              <div className="text-sm font-medium tabular-nums">
                {loading ? "…" : current === null ? "—" : current}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`target-${userUuid}`}>Target balance</Label>
              <Input
                id={`target-${userUuid}`}
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                disabled={loading}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving || loading}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
