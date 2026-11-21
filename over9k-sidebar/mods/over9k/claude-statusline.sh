#!/bin/sh
# Over9k's optional Claude Code status line (Options › Session footers › Claude Code;
# off unless you turn it on). It shows a line under the prompt: model and effort,
# context used, how long the prompt cache lasts (a red "exp." once it's out), and
# the 5-hour and weekly limits as coloured percents with time to reset; inside
# the week, a model's own weekly limit as of your last look at /usage, as
# "week 18% (Fable 29%)". It also
# saves those limits (~/.cache/over9k/usage/claude.json), or that it's billed by
# use, for Over9k's usage rows: Claude Code gives them to nothing else. Agent details don't need it (claude-info.py reads Claude Code's
# own files). Needs jq.
in=$(cat)
# When the prompt cache runs out (seconds since 1970): the last reply's time plus
# its cache lifetime (1 hour or 5 minutes, from what the last write used).
cache=null last=null
tp=$(printf '%s' "$in" | jq -r --argjson cache "$cache" '.transcript_path // empty')
if [ -f "$tp" ]; then
  cache=$(tail -n 400 "$tp" | jq -sc '[.[] | select(.type == "assistant" and .message.usage)]
    | if length == 0 then null else
        (last.timestamp | sub("\\.[0-9]+Z$"; "Z") | fromdate) as $at
        | ([.[].message.usage.cache_creation // {}
            | if (.ephemeral_1h_input_tokens // 0) > 0 then 3600
              elif (.ephemeral_5m_input_tokens // 0) > 0 then 300 else empty end] | last // 300) as $ttl
        | $at + $ttl end' 2>/dev/null) || cache=null
  [ -n "$cache" ] || cache=null
  # When it last replied (seconds), for the "3m" by its row in Herdr.
  last=$(tail -n 400 "$tp" | jq -sc '[.[] | select(.type == "assistant")] | if length == 0 then null else last.timestamp | sub("\\.[0-9]+Z$"; "Z") | fromdate end' 2>/dev/null) || last=null
  [ -n "$last" ] || last=null
fi
# Claude's limits for the sidebar's usage section (over9k-usage), when it has them.
u="$HOME/.cache/over9k/usage"; mkdir -p "$u"
# Claude billed by use (a cloud, an API key) has no plan limits: say which, and the
# usage rows work out its cost (over9k-usage's api-cost.py).
api=
case "${CLAUDE_CODE_USE_BEDROCK:-}" in ""|0|false) ;; *) api=Bedrock ;; esac
case "${CLAUDE_CODE_USE_VERTEX:-}" in ""|0|false) ;; *) api=Vertex ;; esac
case "${CLAUDE_CODE_USE_FOUNDRY:-}" in ""|0|false) ;; *) api=Foundry ;; esac
[ -n "$api" ] || ! printf '%s' "$in" | jq -e '.model.id // "" | test("(^|[.:/])anthropic\\.|arn:aws:bedrock")' >/dev/null 2>&1 || api=Bedrock
[ -n "$api" ] || ! printf '%s' "$in" | jq -e '.rate_limits == null and (.cost.total_cost_usd // 0) > 0' >/dev/null 2>&1 || api=API
[ -z "$api" ] || printf '{"at":%s,"api":"%s"}\n' "$(date +%s)" "$api" > "$u/claude.json"
# Every session saves here, each with the limits of its own last reply: one that
# sits idle still has last hour's, and would put them back every time its line is
# drawn. So a limit is only replaced by one further on: a later window, or the
# same window (resets within a minute of it) with as much used or more. One this
# session doesn't have stays while its window runs.
# One session at a time reads and writes it (the others skip this turn: their
# line is drawn again in a few seconds); a lock left by one cut short goes a minute on.
lock="$u/claude.json.lock"
find "$lock" -maxdepth 0 -mmin +1 -exec rmdir {} + 2>/dev/null
if mkdir "$lock" 2>/dev/null; then
  trap 'rmdir "$lock" 2>/dev/null' EXIT
  trap 'exit 1' HUP INT TERM
  old=$(jq -c 'select(type == "object")' "$u/claude.json" 2>/dev/null) || old=
  [ -n "$old" ] || old=null
  printf '%s' "$in" | jq -ce --argjson old "$old" '
    def further($new; $was):
      if ($was | type) != "object" or ($was.resets_at // 0) <= now then $new
      elif ($new | type) != "object" then $was
      elif ($new.resets_at // 0) > ($was.resets_at // 0) + 60 then $new
      elif ($new.resets_at // 0) < ($was.resets_at // 0) - 60 then $was
      elif ($new.used_percentage // 0) >= ($was.used_percentage // 0) then $new
      else $was end;
    select(.rate_limits != null)
    | {at: (now | floor), five_hour: further(.rate_limits.five_hour; $old.five_hour), seven_day: further(.rate_limits.seven_day; $old.seven_day)}' \
    > "$u/claude.json.$$" 2>/dev/null && mv "$u/claude.json.$$" "$u/claude.json" || rm -f "$u/claude.json.$$"
  rmdir "$lock" 2>/dev/null; trap - EXIT
fi
# The line shows the limits as saved (the furthest any session has seen), not
# this session's own, which may be an hour old.
saved=$(jq -c 'select(type == "object" and (has("api") | not))' "$u/claude.json" 2>/dev/null) || saved=
[ -n "$saved" ] || saved=null
# A model's own weekly limit (Fable's) isn't in what Claude Code hands this line.
# Its /usage screen has it, and what that last showed is kept in ~/.claude.json:
# shown from there while that week runs, and from an hour on with how old it is.
models=$(jq -c '.cachedUsageUtilization as $c | [$c.utilization.limits[]?
  | select(.kind == "weekly_scoped" and .percent != null and .scope.model.display_name != null)
  | {name: .scope.model.display_name, used_percentage: .percent, at: (($c.fetchedAtMs // 0) / 1000 | floor),
     resets_at: (try (.resets_at | sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdate) catch 0)}
  | select(.resets_at > now)]' "$HOME/.claude.json" 2>/dev/null) || models=
[ -n "$models" ] || models='[]'
printf '%s' "$in" | jq -r --argjson cache "$cache" --argjson saved "$saved" --argjson models "$models" '
  def left: (. - now) as $s | if $s <= 0 then "now"
    elif $s < 3600 then "\($s / 60 | floor)m"
    elif $s < 86400 then "\($s / 3600 | floor)h \($s % 3600 / 60 | floor)m"
    else "\($s / 86400 | floor)d \($s % 86400 / 3600 | floor)h" end;
  def pct: (if . >= 80 then "31" elif . >= 50 then "33" else "32" end) as $c
    | "\u001b[\($c)m\(round)%\u001b[0m";
  def tokens: if . >= 1000000 then "\(. / 100000 | round / 10)M" | sub("\\.0M$"; "M")
    elif . >= 1000 then "\(. / 1000 | round)k" else "\(.)" end;
  def dim: "\u001b[2m\(.)\u001b[0m";
  # A limit: its label, the used % coloured, and the time to reset dimmed.
  def show($name): "\($name) \(.used_percentage | pct) " + ("· \(.resets_at | left)" | dim);
  # How long ago (seconds since then): "3h ago", "2d ago".
  def ago: (now - .) as $s | if $s < 86400 then "\($s / 3600 | floor)h ago" else "\($s / 86400 | floor)d ago" end;
  # One model alone: "(Fable 29%)", and from an hour on how old that is: "(Fable 29%, 3h ago)".
  def scoped: "(\(.name) \(.used_percentage | pct)" + (if now - .at >= 3600 then ", \(.at | ago)" | dim else "" end) + ")";
  [ ([.model.display_name, .effort.level] | map(select(. != null)) | join(" · ") | select(. != "")),
    (.context_window | select(.used_percentage != null)
      | "context \(.used_percentage | pct) "
        + ("(\((.current_usage | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) | tokens)/\(.context_window_size | tokens))" | dim)),
    ($cache | select(. != null) | if . > now then "cache " + ("\(left)" | dim) else "cache \u001b[31mexp.\u001b[0m" end),
    (select(.rate_limits != null) | ($saved.five_hour // .rate_limits.five_hour) // empty | select((.resets_at // 0) > now) | show("5h")),
    # The week, with the weekly limit of one model alone inside it: "week 18% (Fable 29%) · 5d 22h".
    (select(.rate_limits != null) | ($saved.seven_day // .rate_limits.seven_day) // empty | select((.resets_at // 0) > now)
      | "week \(.used_percentage | pct) " + ($models | map(scoped + " ") | join("")) + ("· \(.resets_at | left)" | dim)),
    # With no week to put it in, on its own.
    (select(.rate_limits != null and (($saved.seven_day // .rate_limits.seven_day // {}).resets_at // 0) <= now) | $models[] | scoped) ]
  | join("   ")'
