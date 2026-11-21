#!/usr/bin/env bash
# Re-pin the model snapshot to a tag of the upstream dataset repository.
#
#   pipeline/refresh-data.sh v1.2.0
#
# Copies the model, the upstream era table, the manifest and the two curated audit
# files from that tag, then rewrites pipeline/source.json so the pin and the files
# can never disagree.
# It does not build; run 'npm run data:build' next and read the diff.
set -euo pipefail

tag="${1:-}"
if [ -z "$tag" ]; then
  echo "usage: pipeline/refresh-data.sh <tag>" >&2
  echo "example: pipeline/refresh-data.sh v1.2.0" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "cloning $tag ..."
git clone --quiet --depth 1 --branch "$tag" https://github.com/RRiboulet/lol-dataset "$tmp/src"
commit="$(git -C "$tmp/src" rev-parse HEAD)"

rm -f "$root"/data/model/*.csv "$root"/data/model/data-dictionary.md
mkdir -p "$root/data/model" "$root/data/upstream"
cp "$tmp/src"/data/model/*.csv "$root/data/model/"
cp "$tmp/src/data/model/data-dictionary.md" "$root/data/model/data-dictionary.md"
cp "$tmp/src/data/curated/manifest.json" "$root/data/upstream/manifest.json"
cp "$tmp/src/tools/dataset/rules/game-eras.json" "$root/data/upstream/game-eras.json"

manifest_sha="$(sha256sum "$root/data/upstream/manifest.json" | cut -d' ' -f1)"

python3 - "$root" "$tag" "$commit" "$manifest_sha" "$tmp/src/data/curated" <<'PY'
import datetime, json, pathlib, sys

root, tag, commit, manifest_sha, curated = sys.argv[1:6]
root = pathlib.Path(root)
curated = pathlib.Path(curated)
upstream = root / "data" / "upstream"


def pin(name, key, source_file, note):
    """Rewrite one curated JSONL file as the wrapped JSON the pipeline reads."""
    records = [
        json.loads(line)
        for line in (curated / source_file).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    source = f"https://github.com/RRiboulet/lol-dataset (data/curated/{source_file}, {tag})"
    path = upstream / name
    # Keep the pin date when the tag and the records have not moved, so refreshing
    # the current pin is a no-op; a real change is stamped with today's date.
    fetched = None
    if path.exists():
        previous = json.loads(path.read_text(encoding="utf-8"))
        if previous.get("source") == source and previous.get(key) == records:
            fetched = previous.get("fetched")
    with path.open("w", encoding="utf-8") as handle:
        json.dump({
            "source": source,
            "fetched": fetched or datetime.date.today().isoformat(),
            "note": note,
            key: records,
        }, handle, ensure_ascii=False, indent=2)
    print(f"pinned {name} ({len(records)} records)")


pin(
    "event-selection.json", "candidates", "event-selection.jsonl",
    "Every candidate event the rule considered, with the decision and the rule key "
    "that produced it. Pinned so the site can explain what it left out, not only what it kept.",
)
pin(
    "event-coverage.json", "events", "event-coverage.jsonl",
    "Coverage per event, as the dataset measured it. The site folds it into the events "
    "artifact so an event can state what could be measured in it.",
)

path = root / "pipeline" / "source.json"
path.write_text(json.dumps({
    "repository": "RRiboulet/lol-dataset",
    "tag": tag,
    "commit": commit,
    "manifestSha256": manifest_sha,
    "note": "The model CSVs in data/model/ are a byte-for-byte copy of the pinned "
            "tag's build output. Refresh with pipeline/refresh-data.sh.",
}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"pinned {tag} ({commit[:7]})")
PY

echo
echo "next: npm run data:build   # then read the diff before committing"
