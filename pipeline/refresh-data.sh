#!/usr/bin/env bash
# Re-pin the model snapshot to a tag of the upstream dataset repository.
#
#   pipeline/refresh-data.sh v1.2.0
#
# Copies the model, the upstream era table, the manifest and the two curated audit
# files from that tag, then rewrites pipeline/source.json so the pin and the files
# can never disagree.
# It does not build; run 'npm run data:build' next and read the diff.
#
# The refresh is all-or-nothing for the working tree. The tag is cloned, checked
# for the files a pin needs, copied and rewrapped into a staging directory, and
# verified there; only then is anything moved into data/, one rename per file, with
# a snapshot of the previous files kept in case a move still fails. A failed run
# restores data/ and pipeline/source.json exactly, says why in one line, and exits
# nonzero. A successful run ends by proving the pin it installed: the manifest is
# the one source.json names, every file in the tag is present, and no file from the
# previous tag is left behind.
set -euo pipefail

tag="${1:-}"
if [ -z "$tag" ]; then
  echo "usage: pipeline/refresh-data.sh <tag>" >&2
  echo "example: pipeline/refresh-data.sh v1.2.0" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The repository to clone. Overridable so a mirror or a local fixture can stand in
# for upstream without editing this script; the pin it writes still names the
# canonical repository, because that is where the data came from.
source_url="${REFRESH_SOURCE:-https://github.com/RRiboulet/lol-dataset}"

tmp="$(mktemp -d)"
stage="$tmp/stage"
previous="$tmp/previous"

# The files this run owns outside data/model/. data/model/ is not listed: the whole
# directory is the pin's, so it is replaced as a set rather than edited.
owned=(
  data/upstream/manifest.json
  data/upstream/game-eras.json
  data/upstream/event-selection.json
  data/upstream/event-coverage.json
  pipeline/source.json
)

# Set by the first write into data/. Until then a failure changed nothing, and the
# rollback says so rather than restoring files it never touched.
wrote=0

fail() {
  echo "error: $*" >&2
  exit 1
}

# Put the tree back the way it was before this run wrote anything. The snapshot is
# the authority, not the staged tree: what a failed refresh restores is the pin that
# was committed, not the pin that half arrived.
rollback() {
  if [ "$wrote" -eq 0 ]; then
    echo "note: nothing was written; data/ and pipeline/source.json are unchanged" >&2
    return 0
  fi
  if ! {
    rm -rf "$root/data/model"
    if [ -d "$previous/model" ]; then
      cp -a "$previous/model" "$root/data/model"
    fi
    for rel in "${owned[@]}"; do
      if [ -e "$previous/$rel" ]; then
        mkdir -p "$(dirname "$root/$rel")"
        cp -a "$previous/$rel" "$root/$rel"
      else
        rm -f "$root/$rel"
      fi
    done
    rm -f "$root"/data/upstream/*.refresh-tmp "$root"/pipeline/*.refresh-tmp
  }; then
    echo "error: could not restore data/; check it before retrying (git status data/)" >&2
    return 0
  fi
  echo "note: data/ and pipeline/source.json are restored; nothing was changed" >&2
}

cleanup() {
  local status="$?"
  if [ "$status" -ne 0 ]; then
    rollback
  fi
  rm -rf "$tmp"
  exit "$status"
}
trap cleanup EXIT

echo "cloning $tag ..."
if ! git clone --quiet --depth 1 --branch "$tag" "$source_url" "$tmp/src"; then
  fail "cannot clone tag $tag from $source_url"
fi
commit="$(git -C "$tmp/src" rev-parse HEAD)"

# The files a pin needs. Each is named in its own failure so a tag with a different
# layout says which part is missing instead of dying on 'cp: cannot stat'.
require() {
  if [ ! -f "$tmp/src/$1" ]; then
    fail "tag $tag has no $1"
  fi
}

if [ ! -d "$tmp/src/data/model" ]; then
  fail "tag $tag has no data/model/"
fi
require data/model/data-dictionary.md
require data/model/schema.sql
require data/curated/manifest.json
require data/curated/event-selection.jsonl
require data/curated/event-coverage.jsonl
require tools/dataset/rules/game-eras.json

shopt -s nullglob
csvs=("$tmp/src/data/model"/*.csv)
shopt -u nullglob
if [ "${#csvs[@]}" -eq 0 ]; then
  fail "tag $tag has no model CSVs in data/model/"
fi

# The model directory is copied whole, so anything in it that is not a plain file
# would be copied too. build.py refuses such a directory outright; refusing it here
# turns that into a pin error instead of a failed build after the swap.
while IFS= read -r entry; do
  if [ -L "$entry" ] || [ ! -f "$entry" ]; then
    fail "tag $tag has ${entry#"$tmp/src/"} in data/model/, which is not a regular file"
  fi
done < <(find "$tmp/src/data/model" -mindepth 1)

# Everything below writes to $tmp only.
mkdir -p "$stage/data/model" "$stage/data/upstream" "$stage/pipeline"
cp "$tmp/src"/data/model/* "$stage/data/model/"
cp "$tmp/src/data/curated/manifest.json" "$stage/data/upstream/manifest.json"
cp "$tmp/src/tools/dataset/rules/game-eras.json" "$stage/data/upstream/game-eras.json"

manifest_sha="$(sha256sum "$stage/data/upstream/manifest.json" | cut -d' ' -f1)"

python3 - "$root" "$stage" "$tag" "$commit" "$manifest_sha" "$tmp/src/data/curated" <<'PY'
import datetime, json, pathlib, sys

root, stage, tag, commit, manifest_sha, curated = sys.argv[1:7]
root = pathlib.Path(root)
stage = pathlib.Path(stage)
curated = pathlib.Path(curated)
installed = root / "data" / "upstream"
upstream = stage / "data" / "upstream"


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
    if (installed / name).exists():
        previous = json.loads((installed / name).read_text(encoding="utf-8"))
        if previous.get("source") == source and previous.get(key) == records:
            fetched = previous.get("fetched")
    with path.open("w", encoding="utf-8") as handle:
        json.dump({
            "source": source,
            "fetched": fetched or datetime.date.today().isoformat(),
            "note": note,
            key: records,
        }, handle, ensure_ascii=False, indent=2)
    print(f"staged {name} ({len(records)} records)")


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

path = stage / "pipeline" / "source.json"
path.write_text(json.dumps({
    "repository": "RRiboulet/lol-dataset",
    "tag": tag,
    "commit": commit,
    "manifestSha256": manifest_sha,
    "note": "The files in data/model/ -- the CSVs, the data dictionary and the DDL -- "
            "are a byte-for-byte copy of the pinned tag's build output. Refresh with "
            "pipeline/refresh-data.sh.",
}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

# The pin the tree will hold, checked before it is installed: a staged tree that
# does not hold together is a tag that cannot be pinned, not a reason to write one.
verify_pin() {
  local tree="$1"
  if ! python3 - "$tree" "$stage" "$tag" "$commit" <<'PY'
"""Prove a tree holds exactly one pin, and that it is the one just built.

The three claims the rest of the repository relies on:

  * pipeline/source.json names this tag and this commit, and the manifest hash it
    records is the hash of the manifest in the tree -- the comparison build.py
    makes, made here so a refresh cannot leave a new manifest under an old pin;
  * data/model/ holds exactly the tag's files, byte for byte: the set matters as
    much as the contents, because a file left over from the previous tag states a
    build the tag never produced, and git status cannot see it (an unchanged file
    is not a diff), which is why this compares names rather than trusting git;
  * the four upstream copies are the tag's, and each rewrapped audit file names the
    tag as its source.

One line per defect: the reason a refresh stopped is the error line, and the note
printed after it is the promise that nothing was written.
"""
import hashlib, json, pathlib, sys

root = pathlib.Path(sys.argv[1])
stage = pathlib.Path(sys.argv[2])
tag, commit = sys.argv[3], sys.argv[4]
copied = ("manifest.json", "game-eras.json", "event-selection.json", "event-coverage.json")
defects: list[str] = []


def digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


source_path = root / "pipeline" / "source.json"
try:
    source = json.loads(source_path.read_text(encoding="utf-8"))
except (OSError, ValueError):
    source = {}
    defects.append("pipeline/source.json is missing or is not JSON")
if source:
    if source.get("tag") != tag:
        defects.append(f"pipeline/source.json pins {source.get('tag')!r}, not {tag!r}")
    if source.get("commit") != commit:
        defects.append(
            f"pipeline/source.json records commit {str(source.get('commit'))[:7]}, not {commit[:7]}"
        )
    manifest = root / "data" / "upstream" / "manifest.json"
    if not manifest.is_file():
        defects.append("data/upstream/manifest.json is missing")
    elif not isinstance(source.get("manifestSha256"), str):
        defects.append("pipeline/source.json states no manifestSha256")
    elif digest(manifest) != source["manifestSha256"]:
        defects.append("data/upstream/manifest.json is not the manifest pipeline/source.json pins")

model = root / "data" / "model"
expected_model = stage / "data" / "model"
if not model.is_dir():
    defects.append("data/model/ is missing")
else:
    present = sorted(entry.name for entry in model.iterdir())
    expected = sorted(entry.name for entry in expected_model.iterdir())
    for name in expected:
        if name not in present:
            defects.append(f"data/model/{name} is missing")
        elif not (model / name).is_file() or (model / name).read_bytes() != (expected_model / name).read_bytes():
            defects.append(f"data/model/{name} is not the tag's file")
    for name in present:
        if name not in expected:
            defects.append(f"data/model/{name} is not in tag {tag}")

for name in copied:
    installed = root / "data" / "upstream" / name
    wanted = stage / "data" / "upstream" / name
    if not installed.is_file():
        defects.append(f"data/upstream/{name} is missing")
    elif installed.read_bytes() != wanted.read_bytes():
        defects.append(f"data/upstream/{name} is not the tag's file")

for name in ("event-selection.json", "event-coverage.json"):
    try:
        wrapper = json.loads((root / "data" / "upstream" / name).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        continue  # the byte comparison above already reported it
    if f", {tag})" not in str(wrapper.get("source")):
        defects.append(f"data/upstream/{name} does not name {tag} as its source")

for defect in defects:
    print(f"error: {defect}", file=sys.stderr)
if defects:
    raise SystemExit(1)
PY
  then
    exit 1
  fi
}

verify_pin "$stage"

# The only snapshot taken before writing, and the only thing a rollback restores.
# It is verified against the tree so a failed copy cannot become a bad restore.
snapshot() {
  mkdir -p "$previous"
  if [ -d "$root/data/model" ]; then
    cp -a "$root/data/model" "$previous/model"
  fi
  for rel in "${owned[@]}"; do
    if [ -e "$root/$rel" ]; then
      mkdir -p "$previous/$(dirname "$rel")"
      cp -a "$root/$rel" "$previous/$rel"
    fi
  done

  if [ -d "$previous/model" ] && ! diff -r "$root/data/model" "$previous/model" >/dev/null; then
    fail "could not snapshot data/model before writing"
  fi
  for rel in "${owned[@]}"; do
    if [ -e "$root/$rel" ] && ! cmp -s "$root/$rel" "$previous/$rel"; then
      fail "could not snapshot $rel before writing"
    fi
  done
}

# Replace one file with the staged copy. The rename is inside the destination
# directory, so the file is never seen half-written even by a concurrent reader.
install_file() {
  local staged="$1" rel="$2" dest="$root/$2"
  mkdir -p "$(dirname "$dest")"
  wrote=1
  cp "$staged" "$dest.refresh-tmp"
  mv -f "$dest.refresh-tmp" "$dest"
}

# Move the staged pin into data/. Files first and pipeline/source.json last, so the
# pin only ever names a tag whose files are already in place.
install_pin() {
  local entry name
  install_file "$stage/data/upstream/manifest.json" data/upstream/manifest.json
  install_file "$stage/data/upstream/game-eras.json" data/upstream/game-eras.json
  install_file "$stage/data/upstream/event-selection.json" data/upstream/event-selection.json
  install_file "$stage/data/upstream/event-coverage.json" data/upstream/event-coverage.json

  mkdir -p "$root/data/model"
  for entry in "$stage"/data/model/*; do
    install_file "$entry" "data/model/$(basename "$entry")"
  done
  # A model file the new tag does not ship is not part of the new pin. Leaving it
  # would put a row in a table the tag never built.
  for entry in "$root"/data/model/*; do
    [ -e "$entry" ] || continue
    name="$(basename "$entry")"
    if [ ! -e "$stage/data/model/$name" ]; then
      rm -rf "$entry"
      echo "removed data/model/$name (not in $tag)"
    fi
  done

  install_file "$stage/pipeline/source.json" pipeline/source.json
}

snapshot
install_pin
verify_pin "$root"

echo "verified: data/ holds $tag ($commit's files) and pipeline/source.json names it"
echo
echo "next: npm run data:build   # then read the diff before committing"
