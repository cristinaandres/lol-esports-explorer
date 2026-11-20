#!/usr/bin/env python3
"""Re-pin the team short names the site searches on.

The wiki's Teams table holds thousands of rows and answers at most 500 per request,
which is why an unfiltered query returns the first page of the alphabet and not the
teams the corpus carries. This asks only for the teams in the pinned model, in
batches, and waits out the rate limiter rather than failing on the first refusal.

    uv run --project pipeline python pipeline/refresh-shortnames.py
"""

from __future__ import annotations

import csv
import json
import pathlib
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "upstream" / "team-shortnames.json"
MODEL = ROOT / "data" / "model" / "dim_team.csv"
API = "https://lol.fandom.com/api.php"
BATCH = 45


def team_names() -> list[str]:
    with MODEL.open(encoding="utf-8", newline="") as handle:
        return sorted(
            row["team_name"] for row in csv.DictReader(handle)
            if row.get("team_name")
        )


def query(names: list[str]) -> dict[str, str]:
    quoted = ",".join('"' + name.replace('"', '\\"') + '"' for name in names)
    params = {
        "action": "cargoquery",
        "tables": "Teams",
        "fields": "Name,Short",
        "limit": "500",
        "where": f"Name IN ({quoted})",
        "format": "json",
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": "lol-esports-explorer dataset pin"})

    for attempt in range(6):
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.load(response)
        if "cargoquery" in payload:
            return {row["title"]["Name"]: row["title"].get("Short", "") for row in payload["cargoquery"]}
        wait = 60 * (attempt + 1)
        print(f"  rate limited, waiting {wait}s")
        time.sleep(wait)
    raise SystemExit("gave up on a batch after six attempts")


def main() -> None:
    names = team_names()
    found: dict[str, str] = {}
    for start in range(0, len(names), BATCH):
        batch = names[start:start + BATCH]
        found.update(query(batch))
        print(f"  {min(start + BATCH, len(names))}/{len(names)} asked")
        time.sleep(4)

    teams = [{"name": name, "short": short} for name, short in sorted(found.items()) if short]
    OUT.write_text(json.dumps({
        "source": "https://lol.fandom.com (Leaguepedia), cargo table Teams, field Short",
        "query": "action=cargoquery&tables=Teams&fields=Name,Short&where=Name IN (<the model's teams>)",
        "fetched": time.strftime("%Y-%m-%d"),
        "note": "Team short names for search: 'KC' has to find Karmine Corp. The model carries "
                "neither the field nor the table, so it is pinned. Refresh and read the diff.",
        "teams": teams,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"pinned {len(teams)} short names of {len(names)} teams")


if __name__ == "__main__":
    main()
