/** Server-side, diagnostics-only permission. Missing configuration fails closed. */
export function canUseAiDiagnostics(email?: string | null): boolean {
  const allowed = (process.env.AI_DIAGNOSTICS_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return !!email && allowed.includes(email.trim().toLowerCase());
}
