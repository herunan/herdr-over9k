#!/bin/sh
# Cuts a release of Over9k: tools/release.sh 0.2.0
# Run it on main with everything committed, after writing what's new under a
# "## 0.2.0" heading in CHANGELOG.md (rename "## Unreleased" to it) (Over9k help & options shows those entries
# with its Update button). It writes VERSION, commits it as "Release 0.2.0" and
# tags that commit v0.2.0. Nothing is pushed: it ends by saying how.
# Installs follow the newest v* tag on main (over9k-footer's check), so a commit
# on main reaches nobody until a release is tagged and pushed.
set -e
v=${1:?"which version? e.g. tools/release.sh 0.2.0"}
cd "$(dirname "$0")/.."
echo "$v" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "A version is three numbers, like 0.2.0."; exit 1; }
[ "$(git symbolic-ref --short -q HEAD)" = main ] || { echo "Releases are cut on main."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Commit or stash your changes first."; exit 1; }
if git rev-parse -q --verify "refs/tags/v$v" >/dev/null; then echo "v$v is already tagged."; exit 1; fi
grep -Eq "^## v?$(echo "$v" | sed 's/\./\\./g')( |\$)" CHANGELOG.md || { echo "CHANGELOG.md has no \"## $v\" section. Write what's new there first."; exit 1; }
last=$(git tag --list 'v[0-9]*' --sort=-v:refname | head -n 1)
if [ -n "$last" ] && [ "$(printf '%s\n%s\n' "${last#v}" "$v" | sort -V | tail -n 1)" != "$v" ]; then echo "$v isn't newer than $last."; exit 1; fi
printf '%s\n' "$v" > VERSION
if ! git diff --quiet -- VERSION; then git add VERSION && git commit -q -m "Release $v"; fi
git tag -a "v$v" -m "Over9k $v"
echo "Tagged v$v. Publish it with: git push origin main v$v"
