"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicTask, ToolInput } from "@/ai/types";
import { taskPolicy } from "@/config/ai";

export class TaskRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export function useAITasks(toolId: string, userId?: string) {
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const identity = useRef(userId);
  identity.current = userId;
  const refresh = useCallback(async () => {
    if (!userId) return;
    const response = await fetch(`/api/ai/tasks?toolId=${encodeURIComponent(toolId)}`, { cache: "no-store" });
    if (response.ok && identity.current === userId) setTasks((await response.json()).tasks);
  }, [toolId, userId]);
  useEffect(() => {
    setTasks([]);
    if (!userId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/ai/tasks?toolId=${encodeURIComponent(toolId)}`, { cache: "no-store" });
        if (!response.ok || stopped) return;
        let rows: PublicTask[] = (await response.json()).tasks;
        rows = await Promise.all(rows.map(async task => {
          const needsRefresh =
            ["queued", "submitting", "running"].includes(task.status) ||
            (task.status === "succeeded" && !task.artifacts.some((a) => a.url));
          if (!needsRefresh) return task;
          const res = await fetch(`/api/ai/tasks/${task.id}`, { cache: "no-store" });
          return res.ok ? (await res.json()).task : task;
        }));
        if (!stopped && identity.current === userId) setTasks(rows);
      } catch { /* Transient polling errors do not start new paid jobs. */ }
      finally { if (!stopped) timer = setTimeout(poll, taskPolicy.pollIntervalSeconds * 1000); }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [toolId, userId]);
  const submit = async (modelId: string, input: ToolInput) => {
    if (!userId) throw new TaskRequestError("Please sign in", 401);
    setSubmitting(true);
    const storageKey = `ai-pending:${userId}:${toolId}`;
    const fingerprint = JSON.stringify({ modelId, input });
    let pending: { fingerprint: string; key: string } | undefined;
    try { pending = JSON.parse(localStorage.getItem(storageKey) || "null") ?? undefined; } catch {}
    const key = pending?.fingerprint === fingerprint ? pending.key : crypto.randomUUID();
    try { localStorage.setItem(storageKey, JSON.stringify({ fingerprint, key })); } catch {}
    try {
      const response = await fetch("/api/ai/tasks", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ toolId, modelId, input }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) try { localStorage.removeItem(storageKey); } catch {}
        throw new TaskRequestError(data.error || "Generation could not be started", response.status);
      }
      try { localStorage.removeItem(storageKey); } catch {}
      if (identity.current === userId) setTasks(prev => [data.task, ...prev.filter(t => t.id !== data.task.id)]);
      return data.task as PublicTask;
    } finally { setSubmitting(false); }
  };
  return { tasks, submit, submitting, refresh };
}
