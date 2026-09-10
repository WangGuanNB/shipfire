"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface ToolSelection {
  tool: string;
  values: Record<string, string>;
  revision: number;
}

const Context = createContext<{
  selection: ToolSelection | null;
  select: (tool: string, values: Record<string, string>) => void;
  anchors: Record<string, string>;
} | null>(null);

export function LandingInteractions({ children, anchors }: {
  children: ReactNode;
  anchors: Record<string, string>;
}) {
  const [selection, setSelection] = useState<ToolSelection | null>(null);
  return (
    <Context.Provider value={{
      selection,
      anchors,
      select: (tool, values) => {
        setSelection((previous) => ({ tool, values, revision: (previous?.revision ?? 0) + 1 }));
        const target = document.getElementById(anchors[tool]);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        target?.querySelector<HTMLElement>("textarea, input, button")?.focus({ preventScroll: true });
      },
    }}>
      {children}
    </Context.Provider>
  );
}

export function useToolSelection(tool: string) {
  const context = useContext(Context);
  return context?.selection?.tool === tool ? context.selection : undefined;
}

export function ExampleAction({ label, tool, values }: {
  label: string;
  tool: string;
  values: Record<string, string>;
}) {
  const context = useContext(Context);
  // No dead example button when its corresponding tool module is disabled.
  if (!context?.anchors[tool]) return null;
  return <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => context.select(tool, values)}>{label}</Button>;
}
