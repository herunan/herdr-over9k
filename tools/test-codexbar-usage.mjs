import assert from "node:assert/strict";
import test from "node:test";
import { codexBarCountdown, codexBarProviders, codexBarRow } from "../over9k/mods/over9k-usage/codexbar.js";

const now = Date.parse("2026-11-11T00:00:00Z");
const nextHour = "2026-11-11T01:00:00Z";
const result = (payload) => ({ code: 0, stdout: JSON.stringify(payload) });

test("only explicitly configured providers are polled", () => {
  for (const config of [null, "invalid", "{}", '{"codexbar":"grok"}']) {
    assert.deepEqual(codexBarProviders(config), []);
  }
  assert.deepEqual(codexBarProviders('{"codexbar":["grok","cursor","grok","other"]}'), ["cursor", "grok"]);
});

test("Cursor retains named windows and known zero without returning account identity", () => {
  const payload = {
    provider: "cursor",
    rateWindowLabels: { primary: "Total", secondary: "Cursor" },
    usage: {
      identity: { accountEmail: "example@example.com", loginMethod: "Pro" },
      primary: { usedPercent: 26, resetsAt: nextHour },
      secondary: { usedPercent: 0 },
      tertiary: { usedPercent: 0, isSyntheticPlaceholder: true },
      extraRateWindows: [
        { id: "grok-bot", title: "Grok Bot", window: { usedPercent: 51, resetsAt: nextHour } },
        { id: "unknown", title: "Unknown", usageKnown: false, window: { usedPercent: 100 } },
      ],
    },
  };
  const row = codexBarCountdown(codexBarRow("cursor", result([payload])), now);
  assert.equal(row.plan, "Pro");
  assert.equal(row.unavailable, false);
  assert.deepEqual(row.limits.map(({ label, used, left }) => [label, used, left]), [
    ["Total", 26, 3600], ["Cursor", 0, null], ["Grok Bot", 51, 3600],
  ]);
  assert.doesNotMatch(JSON.stringify(row), /example@example\.com/);
});

test("Grok's countdown advances and an expired reading becomes unavailable", () => {
  const row = codexBarRow("grok", result({
    provider: "grok",
    usage: { primary: { usedPercent: 71, windowMinutes: 10080, resetsAt: nextHour } },
  }));
  assert.equal(codexBarCountdown(row, now + 60000).limits[0].left, 3540);
  assert.equal(codexBarCountdown(row, now).limits[0].label, "7d");
  assert.equal(codexBarCountdown(row, Date.parse(nextHour)).unavailable, true);
});

test("failed, invalid, mismatched, and ambiguous snapshots never show a quota", () => {
  const payload = { provider: "cursor", usage: { primary: { usedPercent: 45 } } };
  const responses = [null, { code: 1 }, { code: 0, stdout: "bad JSON" }, result([payload, payload]),
    result({ ...payload, provider: "grok" }), result({ ...payload, error: { kind: "auth" } }),
    result({ provider: "cursor", usage: { primary: { usedPercent: "0" } } })];
  for (const response of responses) {
    assert.equal(codexBarCountdown(codexBarRow("cursor", response), now).unavailable, true);
  }
});
