import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
// Over9k's clone of the shipped workspace-chrome: the footer also has Over9k help & options,
// and the header your company's logo (Options › Logo).
import { theme, themes, run, props, window, shared, setShared, updates, layout, openOverlay, exec, settings, appHome, readTextFile, writeTextFile } from "herdr";

// Where install.sh says Over9k was installed from: {path, commit, branch, version}.
const SOURCE = 'cat "${XDG_DATA_HOME:-$HOME/.local/share}/over9k/source.json"';
// What that clone has had since ($1 path, $2 commit, $3 branch): fetch quietly
// (never asking for a password; Herdr stops it after 30s), with the tags. Updates
// go release to release: the newest version tag (v1.2.3) on that branch, and
// until a repo has one, the branch itself. Prints the tag (an empty line without
// one), how many commits it has that the install hasn't, their subjects (newest
// first), then after MARK that release's CHANGELOG.md. Any failure: exits non-zero.
const MARK = "==CHANGELOG==";
const NEWS = `export GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="\${GIT_SSH_COMMAND:-ssh -o BatchMode=yes -o ConnectTimeout=10}"
git -C "$1" -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15 fetch -q --tags origin "$3" || exit 1
tag=$(git -C "$1" tag --list 'v[0-9]*' --sort=-v:refname --merged "origin/$3" 2>/dev/null | head -n 1)
to=\${tag:-origin/$3}
echo "$tag"
git -C "$1" rev-list --count "$2..$to" || exit 1
git -C "$1" log -n 30 --format=%s "$2..$to"
echo "${MARK}"
[ -z "$tag" ] || git -C "$1" show "$tag:CHANGELOG.md" 2>/dev/null
exit 0`;
// Whether version a ("1.10.0") is newer than b; an unknown b is older than anything.
const newer = (a, b) => {
  if (!b) return true;
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};
// CHANGELOG.md's entries ("- ..." under "## 1.2.3") for the versions after `from`
// up to `to`, newest first as written; without `from`, only `to`'s.
function notes(text, from, to) {
  const out = [];
  let on = false;
  for (const line of (text ?? "").split("\n")) {
    const h = line.match(/^##\s+v?(\d+(?:\.\d+)*)/);
    if (h) { on = from ? newer(h[1], from) && !newer(h[1], to) : h[1] === to; continue; }
    if (/^##\s/.test(line)) { on = false; continue; } // "## Unreleased": not a release's
    if (!on) continue;
    const b = line.match(/^\s*[-*]\s+(.*)$/);
    if (b) out.push(b[1].trim());
    else if (/^\s+\S/.test(line) && out.length) out[out.length - 1] += ` ${line.trim()}`; // an entry's next line
  }
  return out;
}
// How often to look again.
const EVERY = 6 * 60 * 60 * 1000;

// The company logo (Options › Logo: { light, dark }, each { path, aspect,
// layers? }): this appearance's, else the other's. It takes the Herdr icon's
// place, as high (20px), at most 110 wide; drawn as over9k-options' logo.js
// draws it: its colour layers stacked as tinted svg()s (sharp, no dark fringes),
// else the image.
function logoView(t) {
  const l = shared("sidebar.options")?.logo ?? {};
  const x = settings()?.dark === false ? l.light ?? l.dark : l.dark ?? l.light;
  if (!x?.path) return null;
  const a = x.aspect > 0 ? x.aspect : 1, w = Math.min(110, Math.round(20 * a)), h = Math.round(w / a);
  if (!x.layers?.length) return image(x.path).w(w).h(h).flex_none();
  return div().relative().w(w).h(h).flex_none().children(x.layers.map(y =>
    svg(y.path).absolute().inset_0().w(w).h(h).text_color(y.color === "currentColor" ? t.foreground : y.color)));
}

// Translucent (Options › Look): the window blurs what's behind it (the layout
// root's window_blur) and shows it through one sheet of glass, the theme's chrome
// colour at GLASS, set as the root's background. For that sheet to be the only
// thing in the way, the theme's chrome, canvas and background go clear (the
// root's colors): the bars and the sidebar stack several layers of chrome, which
// would otherwise add up unevenly. Terminals stay solid.
const GLASS = "db"; // how solid the glass is: 86% (less, and text over a busy desktop gets hard to read)
const CLEAR = ["chrome", "canvas", "background"];

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

export default class WorkspaceChrome extends View {
  // The footer copy looks for a newer Over9k now and every few hours (the
  // option Check for updates); the brand row's copy doesn't.
  init(_props, cx) {
    this.footer = Boolean(props()?.footer);
    this.checking = shared("sidebar.options")?.checkUpdates !== false;
    if (!this.footer) return;
    this.check();
    cx.timer.every(EVERY, () => this.check());
    this.glass(cx);
    cx.timer.every(2000, (cx) => this.glass(cx));
  }

  // Keeps the shown layout's file as Translucent wants it: written when the
  // switch, the theme or the layout changes, and again after an update puts the
  // layout's file back (the mods load afresh then). Off: the root as it was
  // (shared "over9k.glass" keeps its background).
  glass(cx) {
    const name = shared("layout"), want = shared("sidebar.options")?.translucent === true, kept = shared("over9k.glass") ?? null;
    if (!name || (!want && kept?.layout !== name)) return;
    const base = themes().find((x) => x.name === settings()?.theme)?.colors;
    if (!base?.chrome) return;
    const sig = JSON.stringify([name, want, ...CLEAR.map((k) => base[k])]);
    if (sig === this.glassSig || this.glassBusy) return;
    this.glassBusy = true;
    cx.spawn(async () => {
      try {
        const path = `${appHome().replace(/\\/g, "/")}/layouts/${name}.json`;
        const text = await readTextFile(path), was = JSON.parse(text), next = { ...was };
        const colors = Object.fromEntries(Object.entries(was.colors ?? {}).filter(([k]) => !CLEAR.includes(k)));
        if (want) {
          for (const k of CLEAR) if (base[k]) colors[k] = `${base[k].slice(0, 7)}00`;
          next.window_blur = true;
          next.background = `${base.chrome.slice(0, 7)}${GLASS}`;
        } else {
          delete next.window_blur;
          next.background = kept?.background ?? "canvas";
        }
        if (Object.keys(colors).length) next.colors = colors;
        else delete next.colors;
        const out = `${JSON.stringify(next, null, 2)}\n`;
        if (out !== text) await writeTextFile(path, out, text);
        setShared("over9k.glass", want ? { layout: name, background: kept?.layout === name ? kept.background : was.window_blur ? "canvas" : was.background ?? "canvas" } : null);
        this.glassSig = sig;
      } catch {}
      this.glassBusy = false;
    });
  }

  // The installed version (shared "over9k.version", for Help & options' title),
  // then a newer Over9k where it was installed from (a git clone): the newest
  // release there (its version and what its CHANGELOG.md says is new since this
  // one, else its commits' subjects) goes to shared "over9k.update" for the chip
  // below and Help & options' notice. Quiet on any failure (offline, not a clone,
  // no git).
  async check() {
    if (!this.footer) return;
    const src = await exec("sh", ["-c", SOURCE]).catch(() => null);
    let s = null;
    try { s = JSON.parse(src?.stdout ?? ""); } catch {}
    if ((s?.version ?? null) !== (shared("over9k.version") ?? null)) setShared("over9k.version", s?.version ?? null);
    if (shared("sidebar.options")?.checkUpdates === false) return;
    if (!s?.path || !s.commit || !s.branch) return;
    const r = await exec("sh", ["-c", NEWS, "sh", s.path, s.commit, s.branch]).catch(() => null);
    if (r?.code !== 0) return;
    const [head, changelog = ""] = r.stdout.split(`\n${MARK}\n`);
    const [tag, count, ...subjects] = head.split("\n");
    const behind = Number(count) || 0, version = tag.replace(/^v/, "") || null;
    if (!behind) return setShared("over9k.update", { behind: 0, checked: Date.now() });
    const told = version ? notes(changelog, s.version, version) : [];
    setShared("over9k.update", { behind, log: told.length ? told : subjects.filter(Boolean), path: s.path, branch: s.branch,
      tag: tag || null, version, from: s.version ?? null, checked: Date.now() });
  }

  button(id, label, action) {
    const t = theme();
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
  }
  render() {
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) {
      // Check for updates turned back on: looks now.
      const checking = shared("sidebar.options")?.checkUpdates !== false;
      if (checking && !this.checking) this.check();
      this.checking = checking;
      const news = checking && shared("over9k.update")?.behind > 0;
      const row = (id, icon, label, dim, action) => h_flex().id(id).h(28).px(8).gap(9).items_center().rounded(8)
        .text_color(dim ? t.dim : t.muted).hover(s => s.bg(t.hover).text_color(t.foreground)).cursor_pointer()
        .on_click(action).child(svg(`mods/over9k-footer/${icon}.svg`).size(14))
        .when(!collapsed, el => el.child(label));
      return v_flex().size_full().bg(t.chrome).border_t(1).border_color(t.border).px(8).pt(4).pb(8).text_size(13)
        .child(row("settings", "settings", "Settings", false, () => run("app.settings"))
          .when(Boolean(updates().app.ready), el => el.child(div().size(6).rounded_full().bg(t.accent))))
        // The Spaces list's help and options (over9k-options): Herdr's Settings has no room for a mod's.
        // A newer Over9k: an Update chip (on the rail, a dot), and the notice inside.
        .child(row("over9k-options", "panel-left", "Over9k help & options", false, () => openOverlay({ mod: "over9k-options", kind: "dialog", width: 740, height: 600 }))
          .when(news && !collapsed, el => el.child(div().ml_auto().flex_none().px(5).py(1).rounded(4).bg(t.ansi1 + "26").text_size(10.5).text_color(t.ansi1).child("Update")))
          .when(news && collapsed, el => el.child(div().size(6).rounded_full().bg(t.ansi1))))
        .child(row("machine", "plus", "Add machine", true, () => run("mod.open", { name: "machine-add" })));
    }
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 6 : 14).pr(10).gap(4).items_center().text_size(13.5)
      .when(window()?.platform === "macos" && !collapsed, el => el.pl(76))
      // Herdr's icon and name; with a company logo, the logo in the icon's place and a hairline before the name.
      .when(!collapsed, el => {
        const lg = logoView(t);
        return el.child(h_flex().flex_1().min_w(0).gap(8).items_center()
          .child(lg ?? image("frame/welcome/herdr.png").size(20).rounded(5))
          .when(Boolean(lg), el => el.child(div().w(1).h(14).flex_none().bg(t.border)))
          .child(div().min_w(0).truncate().font_semibold().text_color(t.foreground).child("Herdr")));
      })
      .when(!collapsed, el => el.child(this.button("search", svg("mods/over9k-footer/search.svg").size(15), () => run("mod.open", { name: "picker" }))))
      // On the macOS rail the traffic lights fill the row; the agents list's » unfolds it.
      .when(!(collapsed && window()?.platform === "macos"), el => el.child(this.button("sidebar-toggle", svg("mods/over9k-footer/sidebar.svg").size(15), toggleSidebar)));
  }
}
