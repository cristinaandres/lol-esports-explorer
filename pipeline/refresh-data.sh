#!/usr/bin/env bash
# Re-pin the model snapshot to a tag of the upstream dataset repository.
#
#   pipeline/refresh-data.sh v1.2.0
#
# Copies the model, the upstream era table and the manifest from that tag, then
# rewrites pipeline/source.json so the pin and the files can never disagree.
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

python3 - "$root" "$tag" "$commit" "$manifest_sha" <<'PY'
import json, pathlib, sys
root, tag, commit, manifest_sha = sys.argv[1:5]
path = pathlib.Path(root) / "pipeline" / "source.json"
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
