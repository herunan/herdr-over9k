// Cmd+K: find a project or an agent by name, and go there. Projects are every
// open space and every parked project (pinned, with no space open), on this
// computer and the connected ones; agents are every one in the sidebar, by the
// name its row has. Type to filter, Up/Down and Enter to go, Esc to leave.
// Nothing typed: agents most recently used first (over9k's order: shared
// "over9k.recentAgents"), then the open spaces, then the parked projects by name.
// Enter on an agent shows it, on a space selects it, and on a parked project
// opens it with a terminal, as a double-click in the sidebar does.
// Opened by keys.json ("mod.open:over9k-search": Cmd+K, Ctrl+Shift+K off macOS).
// agent-name.js is over9k's (copied: mods can't import from each other).

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, spaces, panes, machines, run, props, closeOverlay, theme, shared, home, settings } from "herdr";
import { agentTask } from "./agent-name.js";

const APP_NAMES = { antigravity: "Antigravity" };
const APP_ICONS = { antigravity: "icons/antigravity.svg" };
const MARK = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };
// Row heights (px), and how high the list gets before it scrolls.
const H = { head: 26, item: 34 }, MAX = 408;

const trim = (d) => (d ?? "").replace(/\/+$/, "");
const base = (d) => trim(d).split("/").pop();
const inside = (cwd, dir) => cwd === dir || cwd?.startsWith(dir + "/");
const tilde = (d, h) => (h && d === h ? "~" : h && d.startsWith(h + "/") ? `~${d.slice(h.length)}` : d);

// How well `q` (lower case) finds `text`: 4 at its start, 3 at a word's start, 2
// inside, 1 as letters in order ("hov" in "herdr-over9k"), 0 not at all.
function score(q, text) {
  const s = (text ?? "").toLowerCase(), i = s.indexOf(q);
  if (i === 0) return 4;
  if (i > 0) return /[\s\-_/.:·]/.test(s[i - 1]) ? 3 : 2;
  let k = 0;
  for (const c of s) if (c === q[k]) k++;
  return k === q.length ? 1 : 0;
}

// An agent's name as its row in the sidebar has it (over9k-switcher's too).
function agentName(a) {
  const p = panes().find((x) => x.terminal === a.address);
  const tab = spaces().flatMap((s) => s.tabs ?? []).find((t) => t.id === (p?.tab ?? a.tab));
  if (tab && tab.name !== a.program?.name && !/^(\d+|t[0-9a-z]+)$/.test(tab.name)) return tab.name;
  return agentTask(a, p?.cwd) || a.program?.name || APP_NAMES[a.app] || a.address;
}

// A space's name as the sidebar's: its own when named, else its folder's (~ for home).
function spaceName(s) {
  const f = trim(s.folder);
  if (s.machine) return shared("projects.on")?.[s.machine]?.names?.[f] || s.name;
  return s.named ? s.name : !f || f === home() ? "~" : shared("projects.names")?.[f] || base(f);
}

// Everything there is to find: agents, then open spaces, then parked projects.
function everything() {
  const sp = spaces(), h = home();
  const recent = shared("over9k.recentAgents") ?? [];
  const rank = (a) => { const i = recent.indexOf(a.address); return i < 0 ? recent.length : i; };
  const spaceOf = (a) => sp.find((x) => x.id === a.space || (x.tabs ?? []).some((t) => t.id === a.tab));
  const where = (s) => (s ? `${spaceName(s)}${s.machine ? ` · ${s.machine}` : ""}` : "");
  const ag = agents().map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map(({ a }) => {
    const s = spaceOf(a);
    return { kind: "agent", id: `a:${a.address}`, name: agentName(a), detail: where(s), also: a.program?.name ?? APP_NAMES[a.app] ?? "", a, s };
  });
  const colors = shared("space.colors") ?? {};
  const open = sp.map((s) => ({ kind: "space", id: `s:${s.id}`, name: spaceName(s), s, color: colors[s.id],
    detail: [s.machine ? trim(s.folder) : tilde(trim(s.folder), h), s.machine].filter(Boolean).join(" · ") }));
  // Parked: this computer's pinned projects (the sidebar's list), then each
  // reachable computer's, less those a space is open in.
  const byName = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: "base" });
  const taken = (m, d) => sp.some((s) => (s.machine ?? null) === m && inside(trim(s.folder), d));
  const names = shared("projects.names") ?? {};
  const here = (shared("projects.listed") ?? shared("projects.pinned") ?? []).filter((d) => !taken(null, d))
    .map((d) => ({ kind: "parked", id: `c:${d}`, name: names[d] || base(d) || d, detail: tilde(d, h), dir: d, machine: null })).sort(byName);
  const up = new Set((machines() ?? []).filter((m) => m.name && m.layout !== "unavailable").map((m) => m.name));
  const there = Object.entries(shared("projects.on") ?? {}).filter(([m]) => up.has(m)).sort(([x], [y]) => x.localeCompare(y))
    .flatMap(([m, on]) => [...new Set(on?.pinned ?? [])].filter((d) => !taken(m, d))
      .map((d) => ({ kind: "parked", id: `r:${m}:${d}`, name: on?.names?.[d] || base(d) || d, detail: `${d} · ${m}`, dir: d, machine: m })).sort(byName));
  return { agents: ag, projects: [...open, ...here, ...there] };
}

export default class Search extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.filter = "";
    this.at = null; // the picked row, among those that can be picked
    this.scroll = 0;
    this.input = InputState.new({ placeholder: "Find a project or an agent…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; this.scroll = 0; cx.notify(); });
    this.input.on("submit", (_e, cx) => this.go(this.rows().filter((r) => r.kind !== "head")[this.at ?? 0]));
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  // The rows shown: a heading, then what's under it. Typed: only what matches,
  // best first, and the section with the best match first.
  rows() {
    const q = this.filter.trim().toLowerCase();
    const all = everything();
    let sections = [["Agents", all.agents], ["Projects", all.projects]];
    if (q) {
      const of = (x) => Math.max(2 * score(q, x.name), score(q, x.detail), score(q, x.also));
      sections = sections.map(([title, list]) => {
        const hits = list.map((x, i) => ({ x, i, n: of(x) })).filter((h) => h.n > 0).sort((a, b) => b.n - a.n || a.i - b.i);
        return [title, hits.map((h) => h.x), hits[0]?.n ?? 0];
      }).sort((a, b) => b[2] - a[2]);
    }
    return sections.filter(([, list]) => list.length).flatMap(([title, list]) => [{ kind: "head", title, count: list.length }, ...list]);
  }

  go(r) {
    if (!r || this.done) return;
    this.done = true;
    this.close();
    if (r.kind === "agent") {
      if (r.s && !r.s.active) run("space.select", { id: r.s.id });
      run("agent.focus", { terminal: r.a.address });
    } else if (r.kind === "space") run("space.select", { id: r.s.id });
    else run("space.new", { name: r.name, folder: r.dir, machine: r.machine ?? "" });
  }

  // What starts a row: an agent's icon, a space's colour, a parked project's outline.
  lead(r, t) {
    if (r.kind === "agent") {
      const prog = r.a.program, icon = prog?.icon ?? APP_ICONS[r.a.app];
      return icon ? (prog?.tint ? svg(icon).size(15).flex_none().text_color(t.foreground) : image(icon).w(15).h(15).flex_none())
        : svg("icons/shell.svg").size(15).flex_none().text_color(t.foreground);
    }
    const c = r.kind === "space" && r.color ? (r.color.startsWith("#") ? r.color : (MARK[r.color] ?? t[r.color])) : null;
    return h_flex().w(15).flex_none().justify_center().child(r.kind === "parked"
      ? div().size(8).rounded(4).border_1().border_color(t.dim)
      : div().size(8).rounded(4).bg(c ?? t.muted));
  }

  render(cx) {
    const t = theme();
    const rows = this.rows();
    const pickable = rows.filter((r) => r.kind !== "head");
    // Opens on the agent before this one (the first is where you are), as the switcher does.
    if (this.at === null) this.at = !this.filter && pickable[1]?.kind === "agent" ? 1 : 0;
    this.at = Math.max(0, Math.min(this.at, pickable.length - 1));
    const sel = pickable[this.at];
    // One strip, each row at a fixed y; it scrolls only as far as keeps the picked row in view.
    const tops = [];
    let y = 0;
    rows.forEach((r) => { tops.push(y); y += r.kind === "head" ? H.head : H.item; });
    const total = y, height = Math.min(MAX, this.listHeight ?? MAX), fixed = total > height;
    const maxScroll = Math.max(0, total - height);
    const high = (i) => (rows[i].kind === "head" ? H.head : H.item);
    const si = rows.indexOf(sel);
    if (si >= 0) {
      // The heading above the first row of a section comes along.
      const top = rows[si - 1]?.kind === "head" ? tops[si - 1] : tops[si];
      if (top < this.scroll) this.scroll = top;
      if (tops[si] + H.item > this.scroll + height) this.scroll = tops[si] + H.item - height;
    }
    this.scroll = Math.max(0, Math.min(this.scroll, maxScroll));
    const place = (el, i) => (fixed ? el.absolute().left(0).right(0).top(tops[i] - this.scroll).h(high(i)) : el);
    const visible = (i) => !fixed || (tops[i] + high(i) > this.scroll && tops[i] < this.scroll + height);
    const status = { working: t.working, blocked: t.blocked, done: t.done, idle: t.idle };

    const row = (r, i) => {
      if (r.kind === "head") return h_flex().h(H.head).flex_none().px(10).gap(6).items_end().pb(4).text_size(11).text_color(t.dim)
        .child(r.title.toUpperCase()).child(div().child(String(r.count)));
      const n = pickable.indexOf(r);
      return h_flex().id(`find-${r.id}`).h(H.item).flex_none().mx(4).px(10).gap(10).items_center().rounded(7).cursor_pointer()
        .when(r === sel, (el) => el.bg(t.selected ?? t.hover))
        .hover((s) => s.bg(t.hover))
        .on_click(() => { this.at = n; this.go(r); })
        .child(this.lead(r, t))
        .child(div().flex_shrink(0).max_w(300).truncate().text_color(r.kind === "parked" ? t.muted : t.foreground).child(r.name))
        .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(r.detail))
        .when(r.kind === "parked", (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("Parked")))
        .when(r.kind === "agent", (el) => el.child(r.a.status === "working"
          ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)
          : div().size(7).flex_none().rounded(4).bg(status[r.a.status] ?? t.unknown)));
    };

    return v_flex().id("over9k-search").track_focus(this.handle).w_full().min_h(0).p(14).gap(10).bg(t.popover).text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key, n = pickable.length;
        if (k === "escape") this.close();
        else if (k === "down" && n) this.at = (this.at + 1) % n;
        else if (k === "up" && n) this.at = (this.at + n - 1) % n;
        else if (k === "enter") this.go(sel);
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().h(36).flex_none().px(10).gap(8).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
        .child(svg("mods/workspace-chrome/search.svg").size(15).flex_none().text_color(t.dim))
        .child(Input.new(this.input).flex_1().h_full().text_size(13).text_color(t.foreground))
        .child(div().id("search-esc").flex_none().px(6).py(2).rounded(5).text_size(11).text_color(t.dim).cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground)).on_click(() => this.close()).child("Esc")))
      .when(!pickable.length, (el) => el.child(div().px(10).py(8).text_color(t.muted).child(this.filter.trim() ? "Nothing by that name" : "No projects or agents yet")))
      .when(pickable.length > 0, (el) => el.child(v_flex().id("search-list")
        .on_size_change((size, cx) => { this.listHeight = size.height / (settings()?.zoom || 1); cx.notify(); })
        .h(Math.min(MAX, total)).min_h(0)
        .when(fixed, (el) => el.relative().overflow_hidden().on_scroll_wheel((e, cx) => {
          this.scroll = Math.max(0, Math.min(this.scroll - e.delta.y, maxScroll));
          // The pick follows the wheel, so the next frame doesn't scroll back to it.
          const topOf = (n) => tops[rows.indexOf(pickable[n])];
          while (this.at < pickable.length - 1 && topOf(this.at) < this.scroll) this.at++;
          while (this.at > 0 && topOf(this.at) + H.item > this.scroll + height) this.at--;
          cx.notify();
        }))
        .children(rows.map((r, i) => (visible(i) ? place(row(r, i), i) : null)).filter(Boolean))));
  }
}
