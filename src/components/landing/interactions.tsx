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

export function UseSampleButton({ label, tool, values }: {
  label: string;
  tool: string;
  values: Record<string, string>;
}) {
  const context = useContext(Context);
  if (!context?.anchors[tool]) return null;
  return (
    <button
      type="button"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 rounded-full bg-primary px-2 py-1.5 text-[11px] font-medium leading-tight text-primary-foreground shadow-sm lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
      onClick={() => context.select(tool, values)}
    >
      {label}
    </button>
  );
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
