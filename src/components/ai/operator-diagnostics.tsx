"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ToolInput } from "@/ai/types";

type Props = {
  toolId: string;
  modelId: string;
  input: ToolInput | null;
  disabled: boolean;
  onBusyChange(busy: boolean): void;
};

/** Mounted only for the server-provided account capability; the API verifies it again. */
export default function OperatorDiagnostics(props: Props) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const fingerprint = JSON.stringify([props.toolId, props.modelId, props.input]);
  useEffect(() => { setReport(null); setError(""); }, [fingerprint]);
  useEffect(() => () => { active.current?.abort(); }, []);

  async function run() {
    if (running || props.disabled || active.current || !props.input) return;
    const controller = new AbortController();
    active.current = controller;
    setRunning(true); props.onBusyChange(true); setError(""); setReport(null);
    try {
      const response = await fetch("/api/ai/diagnostics/operator", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", "X-AI-Diagnostics": "1" },
        body: JSON.stringify({ action: "request", toolId: props.toolId, modelId: props.modelId, input: props.input }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "检查失败");
      if (!controller.signal.aborted) setReport(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "检查失败");
    } finally {
      active.current = null; setRunning(false); props.onBusyChange(false);
    }
  }

  const checks = Array.isArray(report?.checks) ? report.checks as { stage: string; ok: boolean; error?: string }[] : [];
  return <section aria-label="专用无付费测试" className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
    <p className="font-semibold">专用测试 · 不调用 Kie / 不扣积分</p>
    <p className="text-xs leading-relaxed text-muted-foreground">按当前表单检查参数、照片和必要的参考视频。不生成成片，不写入视频存储；不保证 Kie 生成成功。</p>
    <Button type="button" variant="outline" size="sm" disabled={running || props.disabled || !props.input} onClick={() => void run()}>{running ? "检查中…" : "检查生成前流程"}</Button>
    {!props.input && <p className="text-xs text-muted-foreground">请先正常上传所需照片、选择画质并确认使用许可；无需充值。</p>}
    {running && <p role="status">检查中，不会发送生成请求…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {report && <div role="status" className="space-y-2">
      <p className="font-medium">{report.ok ? "检查通过" : "检查发现问题"} · 未调用 Kie，未扣积分</p>
      {typeof report.credits === "number" && <p>正式生成预计扣 {report.credits} 积分，本次未扣。</p>}
      {report.providerConfigured === false && <p className="text-destructive">未配置 KIE_API_KEY，正式生成将无法提交。</p>}
      <ul className="space-y-1 text-xs">{checks.map(check => <li key={check.stage}>{check.ok ? "✓" : "✗"} {checkTitle(check.stage)}{check.error ? `：${check.error}` : ""}</li>)}</ul>
      <details><summary className="cursor-pointer text-xs text-muted-foreground">查看检查详情与请求参数</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-background p-3 text-xs">{JSON.stringify(report, null, 2)}</pre></details>
    </div>}
  </section>;
}

function checkTitle(stage: string) {
  if (stage === "parameters") return "表单参数与预计扣分";
  if (stage === "provider-configuration") return "模型服务配置（不调用接口）";
  if (stage === "template-preflight") return "参考视频读取、时长及所需音轨";
  return /^image-\d+$/.test(stage) ? `参考图 ${stage.slice(6)} 可读取` : stage;
}
