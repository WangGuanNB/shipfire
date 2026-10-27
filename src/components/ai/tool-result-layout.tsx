"use client";
import * as React from "react";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const ResultTarget = createContext<HTMLElement | null>(null);

/** A shared result row below the Hero grid; custom tools can reuse the same outlet. */
export function ToolResultLayout({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return <ResultTarget.Provider value={target}>{children}<div ref={setTarget} className="empty:hidden" data-tool-result-outlet /></ResultTarget.Provider>;
}

export function ToolResult({ children }: { children: ReactNode }) {
  const target = useContext(ResultTarget);
  return target ? createPortal(children, target) : <>{children}</>;
}
