#!/usr/bin/env bash
# Re-pin the team short names used by search.
#
#   pipeline/refresh-shortnames.sh
#
# The work is in the Python side: the wiki answers at most 500 rows per request, so
# asking for every team returns the first page of the alphabet.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec uv run --project "$root/pipeline" python "$root/pipeline/refresh-shortnames.py"
