# Over9k

Run a fleet of coding agents and actually know what they're doing. Over9k
shows every project and every agent in one sidebar, with each agent's status,
model, context and where its work is going, and a Timeline of what happened,
prompt by prompt. Agentic to-dos fill themselves in as you talk, chats hand off
to become projects, expired agents clear to a token-saving recap in one click,
past sessions resume from one menu, local models start and stop in a click, and
every row is yours to customise.

![Over9k](preview.png)

Its six parts, each also shared on its own:

| | |
|---|---|
| ![Over9k Sidebar](previews/over9k-sidebar.png) **Sidebar:** every project and every agent, in one list | ![Over9k Launcher](previews/over9k-launcher.png) **Launcher:** start, resume, run local |
| ![Over9k To-do](previews/over9k-todo.png) **To-do:** agentic to-dos | ![Over9k Timeline](previews/over9k-timeline.png) **Timeline:** what happened, prompt by prompt |
| ![Over9k Usage](previews/over9k-usage.png) **Usage:** your limits before you hit them | ![Over9k Switcher](previews/over9k-switcher.png) **Switcher:** Ctrl+Tab between agents |

## What you see

Left to right. All colours are theme names (`canvas`, `chrome`, `background`,
`raised`, `hover`, `selected`, `border`, `foreground`, `muted`, `dim`, `accent`,
`working`, `blocked`, `done`, `ansi1`–`ansi3`), so it follows any theme.

- **Sidebar**, 268px wide (44 to 480), on `chrome`. From top to bottom:
  - **Brand**, 46px: `over9k-footer`'s header (no `props.footer`), the same as
    Herdr's `workspace-chrome`: Herdr's icon and name, search, the sidebar toggle.
    With a company logo (Options › Logo), the logo takes the icon's place, 20px
    high (at most 110 wide), then a 1×14px `border` hairline and the name. Drags
    the window.
  - **Spaces**, filling the rest of the height (`over9k`):
    - A filter row, 30px high: **All** and **Agents N** as 20px text tabs, the
      picked one on `raised`.
    - Each computer's header: "This computer", or a machine's name (12px,
      semibold, `foreground`), with a monitor or server icon, a green connection
      dot, a fold chevron and a +. Each computer after the first starts under a
      1px `border` line, 10px below what's above it and 6px above its header.
    - Each project as a 30px row, its name in its own colour, then its
      badges: a GitHub or GitLab mark, the uncommitted count (`ansi3`), ↑ ahead
      (`ansi2`) and ↓ behind (`ansi1`), open pull requests (a PR icon and
      a count, red when your review is wanted), and on your own repos open
      issues and stars (an icon and a count each).
    - The open space is on `selected`, and worktrees sit under their checkout
      with a branch icon.
    - Under each project, its agents. Each has a status mark, the program's
      logo, the conversation's name, and below it in 11px `dim`: model · effort
      · context % · time since the last reply. Context is green under 50%,
      yellow from 50% and red from 80%.
    - Under each agent, a tree drawn with a 1.5px rail: subagents, background
      commands and scheduled prompts. Each has its icon, its name in `muted`,
      and its age or time.
    - Projects not open are listed under a folded **Parked** heading (11px,
      `dim`). Open, it ends in a small **A–Z / Recent** switch (as Agents'
      Space / Status): by name, or last worked on first.
    - **Folded to its rail** (the header's sidebar button; 44px, 76 on macOS):
      the same list small. A computer is its icon, centred. A space is a 26px
      rounded square (22px for a worktree) with its first letter in its colour on
      that colour at 19%, ringed in it when it's the one shown, with an 8px
      `blocked` or `done` dot on its corner when something in it needs you. Under
      it, each agent is a 24px row: its program's 14px icon, then a 9px spinner
      while it works or a 7px dot when it needs you or is done; `hover` behind the
      one in front. A parked project is an outlined square in `dim`. Hovering
      names any of them; a click goes there, a right-click opens its menu.
      Usage becomes a 34px cell per service: its name (9.5px, `dim`) over its
      headline % in its colour, or its cost. A click unfolds the sidebar with
      that row open.
  - **Usage** (`over9k-usage`): one 29px row per service, as tall as its rows.
    Each row has the name in `muted`, the plan in a 10.5px badge (`raised`
    background, `accent` text), the reset time in `dim`, the used percentage
    coloured green, yellow or red, and a chevron.
  - **Footer**, 97px (`over9k-footer`): Settings, Over9k help & options, and
    Add machine, each 30px with a 14px icon. A newer Over9k adds an
    "Update" badge like the usage plan's (10.5px `ansi1` on a faint `ansi1`), at the right end of
    Over9k help & options; on the rail, a 6px `ansi1` dot.
- **Work column**, filling the rest:
  - **Tabs**, 42px (`over9k-tabs`, a copy of Herdr's own tab bar): the space's
    tabs as pills, each with its program's icon, status and a close ×, then a +.
    On the right are Herdr's Files and Changes buttons, plus the two Over9k adds,
    To-do and Timeline. Each is a 14px icon and label, the open one on
    `selected`. Drags the window.
  - **Body**, 8px padding and gap:
    - **The active tab's panes:** cards with a 10px radius, a 1px `border` (or
      1px `accent` for the focused one) and Herdr's `pane` header, 30px, always
      shown.
    - **The side panel**, 368px (280 to 900), hidden until a panel button opens
      it. It's a stack of Files, Changes, To-do (`over9k-todos`) and Timeline
      (`over9k-prompts`).
  - **Status bar**, 28px: Herdr's `workspace-status`.

**To-do panel:**
- A 42px header: "To-do", an outlined "N open" badge, then the **Log** and
  **Sync** tags for the project you're in. A tag is on `raised` with `accent`
  text when on, and plain `dim` when off.
- Two text tabs: the project you're in (its name in its colour, with a count)
  and **All** (pinned projects).
- A shaded add box, "Add a to-do (#project @when)".
- 30px rows: a 14px circle in the project's colour, the text on one line, then
  the due time or done time in 11px, and in All the project's name, flush right.
- A foldable **Done** section with Clear on the right, then "From TODO.md"
  suggestions.

**Timeline panel:**
- A 42px header: "Timeline", an "N prompts" badge, then the agent's name and
  "↓ 38k · context 418k".
- Prompts newest first on a vertical line, a 10px dot each (filled `working`
  for the turn in progress).
- Each prompt is a card: number and time, the prompt on one line, then "done
  16:02 · 4m · ↓ 9.1k tokens · 3 files · 6 commands", then the reply's first
  sentence in `muted`.

## How it behaves

- **Agent status** (sidebar, tabs, Timeline):
  - **working:** a 12px spinner in `working`.
  - **blocked:** a 7px dot in `blocked`. The Agents view puts these under "Needs
    you".
  - **done:** a dot in `done`. It turns idle once someone has looked.
  - **idle:** no mark, and the name in `muted`.
- **Clicks in the sidebar:**
  - A project or agent focuses it. Double-click renames.
  - Right-click opens `over9k-menu`: pin, unpin, rename, Open folder, Hand
    off…, splits, close. A CLI's and a tab's menus have Open folder too.
  - Shift-click picks a range and Ctrl or Cmd-click picks one more. Right-click
    a picked row to act on all of them.
  - On a project's badges: the GitHub or GitLab mark opens the repo, the count opens
    Changes, ↑ pushes (click twice), ↓ pulls.
  - The + on a computer opens `over9k-new-menu`: start a CLI or an agent, resume
    a past chat, or start Pi on another model.
  - Pin an agent in a + (for Pi, a model): a little bot left of the + starts it
    in one click, on that device and all its spaces.
  - Clicking an agent's chip shows or hides what it started. Clicking a
    subagent opens it, Alt-click opens it in the side panel under an
    `over9k-panel` header, and × stops it.
- **Expired cache:** when an agent's prompt cache has run out, its details end
  in a red "exp.", and a "clear + recap" chip restarts it from a short summary.
- **Keys:**
  - Ctrl+Shift+A (Cmd+Shift+A on macOS) opens `over9k-new-menu` for the space
    you're in, the same menu as the sidebar's +.
  - Ctrl+Tab opens `over9k-switcher`: agents, most recent first. Holding Ctrl,
    Tab and Shift+Tab move, and letting go of Ctrl opens the picked agent.
  - Ctrl+Shift+W and Ctrl+Shift+X (Cmd+Shift+W and Cmd+Shift+X on macOS) close
    the tab or pane, asking first through
    `over9k-close`, which says what ends. It asks for a whole space or an agent
    still working; with Options › Agent rows › "Ask before closing an idle
    agent" (`askIdle`), for any agent. Terminals alone close at once.
  - Cmd+K (Ctrl+Shift+K off macOS, in place of Herdr's picker) opens
    `over9k-search`, a 560px popup at the top: an input, then **Agents** (most
    recently used first, the one before this picked) and **Projects** (open
    spaces, then parked ones marked "Parked"), on every computer. Typing
    filters both by name, folder, space or program, best match first. Enter
    shows the agent, selects the space, or opens the parked project with a
    terminal; Esc closes.
- **Parked › Recent:** a project counts as worked on while it's open (a space,
  a terminal in it, or something working in it): stamped then, kept in
  `localStorage` (`projects.worked`). One never open here goes by its last
  commit (`git log -1`, on its own computer, looked up while Recent shows). The
  rest stay by name, after.
- **Panel buttons** toggle the side panel. Timeline opens only from its own
  button: if anything else turns the panel to it, the tab bar puts the previous
  panel back.
- **To-do:**
  - Click the circle to tick. Double-click to edit.
  - The bot button (on hover) opens a card. **Current conversation** sends the
    to-do to an agent already in that project. **New conversation** starts a
    new one of the kind picked.
  - `@fri 3pm` and `#api` in the add box set a due time and a project.
  - On the project tab, Ctrl or Shift-click picks rows. A bar then shows "N
    selected" and Cancel, above Mark done, Send to agent and Delete (click
    twice).
- **Timeline:**
  - Click a card to read the whole prompt and the reply, rendered as Markdown.
  - While the agent works, its time and ↓ tokens are read from the CLI's own
    screen every 2s, so they match the CLI exactly.
- **Usage:** click a row to show every limit as a 3px bar, with its reset time.
  Click a limit to make it that row's headline and list it first; click it again
  for the fullest (`over9k.usageHeadline`, by service; a limit that's gone falls back).
  A subscription only a connected computer has gets a row too, with that
  computer's name: a Claude account other than this computer's (every one, when
  this computer is billed by use or has no Claude), and Codex when this computer
  has none.
  A row billed by use (one per computer) has `api-cost.py`'s cost from the transcripts
  instead: tabs for 30d, 2w, 1w, 1d (also the row's number) over bars by day, stacked by
  model, and each model's cost for the tab as the chart's key.
  The block resizes to fit.
- **Updates:** the installer saves where it ran from in
  `~/.local/share/over9k/source.json` (the folder, its version from the
  `VERSION` file, and its commit and branch if it's a git clone). The footer
  puts the version in shared `over9k.version` (Help & options shows it after its
  title), and on start and every 6 hours (Options › Folders › Check for updates)
  fetches that branch with its tags. Updates go release to release: the newest
  `v1.2.3` tag on the branch, when it has commits the install hasn't. Its
  version, and the entries `CHANGELOG.md` has there for every version after the
  installed one, go to shared `over9k.update`. Help & options then shows "Update
  available · 1.2.3", "You have 1.2.0", the entries, and Update:
  `git merge --ff-only v1.2.3`, then `install.sh --yes --no-claude`. Herdr
  reloads the mods as they land, so no restart. If it can't fast-forward (local
  changes), the card says why. A repo with no version tag yet is followed commit
  by commit, as before: "Update available · N changes", the commits' subjects,
  and `git pull --ff-only`.
- **Releases:** `tools/release.sh 1.2.3`, on main with everything committed and
  a `## 1.2.3` section in `CHANGELOG.md`: writes `VERSION`, commits it, tags
  `v1.2.3`. Pushing the branch and the tag publishes it.

## Built from

- **Layout `layouts/over9k.json`**, cloned from `main`. The root `row` has
  `titlebar: none`, `terminal_menu: "over9k-menu"`, a 1px `border` divider and
  `preview: layouts/over9k.svg`.
  - `sidebar` column: `brand` (over9k-footer), `sidebar-lists` holding
    `spaces` (over9k), `usage` (over9k-usage), and `sidebar-footer`
    (over9k-footer, `props.footer: true`).
  - `work` column: `tabs` (over9k-tabs), `work-body` row, and `status`
    (workspace-status).
  - `work-body` row: `main` (`tab: active`, with a pane header from `pane`)
    and `panel`, a column holding the `panel-body` stack: files, changes,
    todos, prompts.
- **Mods**, all `"place": "none"`:
  - `over9k`: the sidebar. It also writes shared state the others read:
    `over9k.recentAgents`, `projects.pinned`, `projects.listed`.
  - `over9k-usage`, `over9k-footer`, `over9k-tabs`.
  - `over9k-todos` (with `todo.sh`, `todo-cross.py`, `todo-hook.sh`) and
    `over9k-prompts` (with `prompts.py`).
  - Overlays: `over9k-menu`, `over9k-new-menu` (with `resume.sh`),
    `over9k-switcher`, `over9k-search`, `over9k-close`, `over9k-rename`,
    `over9k-handoff`, `over9k-server-stop`, `over9k-panel`.
  - `over9k-options`: the Help and Options overlay. Its `setup.sh` turns the
    pieces outside Herdr on and off. Options › Logo (only where the header is
    `over9k-footer`'s) copies a picked SVG, PNG or JPEG into `over9k-logo/` in
    Herdr's home, a new name each time, and saves `logo: {light, dark}` (each
    `{path, aspect, layers?}`) in `sidebar.options`; either one shows in both
    appearances when it's the only one. `logo.js` does the copying and drawing.
    Options › Look › Translucent (`translucent`, only with `over9k-footer` in
    the layout, which does the work): the shown layout's file gets root
    `window_blur: true`, `colors` with the theme's `chrome`, `canvas` and
    `background` fully clear, and `background` set to the theme's chrome at 86%
    (`db`). Written again when the theme changes or an update puts the file back;
    off restores the root (`over9k.glass` keeps what its background was).
- **Shipped mods used:** `workspace-chrome`, `workspace-status`, `pane`,
  `files`, `changes`, `picker`, `machine-add`, `worktree`, `new-menu`, plus
  Herdr's `icons/` for agent logos.
- **herdr API:**
  - Reading state: `spaces`, `agents`, `terminals`, `panes`, `focused`,
    `layout`, `machines`, `knownAgents`, `themes`.
  - Commands through `run`: `layout.select` / `show` / `hide` / `resize` /
    `set`, `pane.focus`, `tab.new`, `space.new`, `agent.focus`, `terminal.peek`.
  - The rest: `openOverlay`, `closeOverlay`, `notify`, `shared` / `setShared`,
    `readTextFile`, `writeTextFile`, `watchFolder`, `nextCommand`, and `exec`
    and `hc` (`read`, `send`, `kill`, `run`).
- **Programs:**
  - `sh` runs the scripts. `git` reads status and fetches every 5 minutes.
  - `gh` (GitHub) or `glab` (GitLab) counts open PRs or MRs, if installed. `jq` is used by the scripts.
  - Python 3 runs the Timeline reader and the TODO.md sync. `ps`, `curl` (local
    model servers) and `kill` are used too.
- **Outside Herdr**, turned on from Options:
  - The `todo` command: a wrapper in `~/.local/bin` for `over9k-todos/todo.sh`.
    It keeps lists in `~/.local/share/over9k/todos/<slug>.md`.
  - The to-do rule in CLAUDE.md and AGENTS.md, and a UserPromptSubmit hook.
  - The sidebar copies `handoff.sh` and `resume.sh` to `~/.local/share/over9k`.
- **Art:** lucide-style 24px stroke icons (bot, subagent, cpu, clock, github,
  pull-request, log, sync, timeline, handoff) and `qwen.svg`.

## Watch out

- On macOS, merge `keys.macos.json` instead (Cmd where macOS expects it); Ctrl+Tab stays, since macOS keeps Cmd+Tab for switching apps.

- Every mod is `"place": "none"`: nothing shows without the layout, and
  `terminal_menu` must name `over9k-menu`.
- Mods can't import from each other. That's why `agent-name.js` and
  `close-plan.js` are copied into each mod that uses them, and each copy must
  stay the same.
- Over9k never installs or changes Claude Code's status line. Agent details
  come from Claude Code's own files: `over9k/claude-info.py` matches each
  `~/.claude/sessions/<pid>.json` to its Herdr terminal (the process's
  `HC_TERMINAL_ID`, via `/proc` on Linux or `ps -wwE` on macOS), reads the end
  of its conversation (model, effort from the last API request, context from
  the last reply's input tokens, cache expiry from its cache write) and writes
  `~/.cache/over9k/agents/<terminal>.json`. The sidebar runs it every 5s, on
  each computer with a Claude Code agent. `over9k/agy-info.py` does the same for Antigravity from
  agy's own files (the presence lock its process holds, the conversation's
  `gen_metadata`, `conversation_summaries.db`): model, effort, title, last
  change. Context only comes from its optional status line. A helper
  (`hc run`) goes by its `task` label, written by the agent that started it. Without
  one, a helper agy runs goes by that title, in sentence case, ahead of its `--name`,
  which is only a handle for `hc` commands; any other goes by its `--name`.
- Claude's plan limits are never in a file; Claude Code only hands them to a
  status line. Options › Session footers › Claude Code (off by default) puts in
  `over9k/claude-statusline.sh`, which shows model, effort, context, cache and
  limits under the prompt and saves the limits to
  `~/.cache/over9k/usage/claude.json` (billed by use, `{at, api}`: Bedrock,
  Vertex, Foundry or API). Any status line already there is kept in
  `~/.claude/.over9k-statusline-was.json` and comes back when it's off. The
  installer never turns it on. Its Antigravity switch (`setup.sh agy on`) does
  the same in `~/.gemini/antigravity-cli/settings.json` with
  `antigravity/agy-statusline.sh` (stacked under agy's own) and `agy-title.sh`,
  keeping any others in `.over9k-was.json` there.
- A variable-height `list` ignores `track_scroll`. Only `v_virtual_list` can be
  scrolled from code.
- Hover style can linger in screenshots taken right after a reload.
- `herdr-app check` passes mods whose drawing fails only when they render. Open
  Help and Options to see them.
- The scripts are POSIX `sh`. On Windows they need Git for Windows' `sh` on
  PATH. Codex session detection and Antigravity subagents read `/proc`, so they
  work on Linux only.
- The side panel is one stack for the whole window, not one per space.
- Translucent uses one sheet of glass (the root's background) because the bars
  and the sidebar stack three or four layers of `chrome`: a translucent `chrome`
  adds up to nearly solid, and unevenly. How strong the blur is belongs to the
  system (on KDE: Desktop Effects › Blur).
- An SVG logo as an `image()` looks off at 20px: Herdr draws it at its own
  `width`/`height` and scales it without smoothing (jagged at the viewBox's
  size, or 2×), and blends its edges into dark fringes (thin white strokes on a
  dark theme look grey and ragged). So a flat-colour SVG is split into one SVG
  per fill colour (`layers`, each `{path, color}`), drawn stacked as `svg()`s
  tinted that colour: clean one-colour masks at the screen's resolution.
  Anything it can't split safely (gradients, strokes, CSS, opacity, clips,
  `<use>`, text, embedded images, over 8 colours) stays an `image()`, its copy's
  `width`/`height` set to exactly the size it shows at.
  The picked file is copied, never used in place: images load only from
  Herdr's home, and an install deletes files it didn't put in a mod's folder.
- Usage reads Claude from `usage/claude.json`, Codex from its latest session file,
  and Gemini only once Over9k's Antigravity status line is on (Options ›
  Session footers).

## Done when

- `layout.switch {"name": "over9k"}` shows:
  - the sidebar: brand, spaces, usage, footer
  - the tab bar with Files, Changes, To-do and Timeline
  - pane cards
  - the status bar
- `herdr-app status` shows no errors, and `herdr-app check` passes for all 15
  `mods/over9k*` folders.
- With a Claude Code agent running in a project, its row shows a spinner while
  it works. Its details show the model, effort and context %, the same as
  Claude Code's own `/context`.
- Opening Timeline shows that agent's prompts newest first. The working turn's
  time and ↓ tokens match the CLI's spinner line.
- `todo add "x"` in a project shows "x" in the To-do panel within a second.
  Ticking it in the panel shows it done in `todo`.
- Ctrl+Tab lists agents most recent first, and letting go of Ctrl focuses the
  picked one.
- Closing a tab with a working agent asks first, and names what ends. With
  "Ask before closing an idle agent" on, an idle agent's tab asks too; a plain
  terminal's never does.
- Two computers in the sidebar have a line between them, and their names are bold.
- The header's sidebar button folds the sidebar to a rail that still lists each
  space as a lettered square and each agent as its icon with its state, with
  Usage as a number per service. Hovering one names it; clicking it goes there.
- Parked › Recent lists the project you closed last first; A–Z goes back to names.
- Cmd+K, part of a project's name, Enter: its space shows (a parked one opens).
- Options › Look › Translucent: the sidebar and bars show the desktop, blurred,
  and terminals stay solid. Off: the window is solid again.
- With Claude billed by use here and a subscription on a connected computer,
  Usage shows both: the cost row, and the subscription's limits with that
  computer's name.
- Help shows the To-do, Timeline and Usage pages under Panels.
- Options › Logo › Light themes › Choose… with an SVG shows it in the header
  in place of Herdr's icon, 20px high, in both appearances; Remove brings the
  icon back.
