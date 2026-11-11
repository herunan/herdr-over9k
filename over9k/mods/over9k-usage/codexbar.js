const NAMES = { cursor: "Cursor", grok: "Grok" };
const WINDOWS = ["primary", "secondary", "tertiary"];

export function codexBarProviders(text) {
  try {
    const { codexbar } = JSON.parse(text);
    return Array.isArray(codexbar) ? Object.keys(NAMES).filter((id) => codexbar.includes(id)) : [];
  } catch {
    return [];
  }
}

function labelFor(key, supplied, minutes) {
  if (typeof supplied === "string" && supplied.trim()) return supplied.trim();
  if (Number.isFinite(minutes) && minutes > 0) {
    if (minutes % 1440 === 0) return `${minutes / 1440}d`;
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    return `${minutes}m`;
  }
  return { primary: "Limit", secondary: "Secondary", tertiary: "Tertiary" }[key];
}

export function codexBarRow(id, result) {
  const row = { key: id, name: NAMES[id], limits: [] };
  if (result?.code !== 0) return row;

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    return row;
  }
  const entries = Array.isArray(payload) ? payload : [payload];
  const matches = entries.filter((entry) => entry?.provider === id);
  if (matches.length !== 1 || matches[0].error) return row;
  const { usage, rateWindowLabels } = matches[0];
  const plan = usage?.identity?.loginMethod ?? usage?.loginMethod;
  const limits = new Map();
  const add = (key, label, window) => {
    if (!Number.isFinite(window?.usedPercent) || window.usedPercent < 0 || window.isSyntheticPlaceholder) return;
    const reset = typeof window.resetsAt === "string" ? Date.parse(window.resetsAt) : NaN;
    limits.set(key, { key, label, used: Math.min(100, window.usedPercent), reset });
  };
  for (const key of WINDOWS) {
    const window = usage?.[key];
    add(key, labelFor(key, rateWindowLabels?.[key] ?? window?.title, window?.windowMinutes), window);
  }
  if (Array.isArray(usage?.extraRateWindows)) {
    for (const extra of usage.extraRateWindows) {
      if (extra?.usageKnown === false || typeof extra?.id !== "string" || !extra.id ||
          typeof extra.title !== "string" || !extra.title.trim()) continue;
      add(`extra:${extra.id}`, extra.title.trim(), extra.window);
    }
  }
  return { ...row, plan: typeof plan === "string" ? plan.trim() : null, limits: [...limits.values()] };
}

export function codexBarCountdown(row, now = Date.now()) {
  // An elapsed billing window cannot establish the new usage.
  const limits = row.limits.filter((limit) => !Number.isFinite(limit.reset) || limit.reset > now)
    .map((limit) => ({ ...limit, left: Number.isFinite(limit.reset) ? (limit.reset - now) / 1000 : null }));
  return { ...row, limits, unavailable: limits.length === 0 };
}
