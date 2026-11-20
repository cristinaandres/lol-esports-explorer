#!/usr/bin/env bash
# Re-pin the champion release dates.
#
#   pipeline/refresh-releases.sh
#
# The dimensional model does not carry a release date, so it is pinned here from
# the same wiki the upstream dataset crawls, with the query recorded in the file.
# Read the diff before committing: a date that moves is a fact that changed.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/data/upstream/champion-releases.json"
query="action=cargoquery&tables=Champions&fields=Name,ReleaseDate&limit=400&format=json"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -sS --max-time 60 -A "lol-esports-explorer dataset pin" \
  "https://lol.fandom.com/api.php?${query}" -o "$tmp"

python3 - "$tmp" "$out" <<'PY'
import json, sys, datetime
raw, out = sys.argv[1], sys.argv[2]
rows = json.load(open(raw))["cargoquery"]
champions = sorted(
    ({"name": r["title"]["Name"], "releaseDate": r["title"]["ReleaseDate"]} for r in rows),
    key=lambda c: c["name"],
)
json.dump({
    "source": "https://lol.fandom.com (Leaguepedia)",
    "query": "action=cargoquery&tables=Champions&fields=Name,ReleaseDate&limit=400",
    "fetched": datetime.date.today().isoformat(),
    "note": "Champion release dates, pinned because the dimensional model does not carry them. "
            "Refresh with pipeline/refresh-releases.sh, and read the diff before committing.",
    "champions": champions,
}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(out, "a", encoding="utf-8").write("\n")
print(f"pinned {len(champions)} release dates")
PY
