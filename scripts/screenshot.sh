#!/bin/bash
# Screenshot one URL with headless Chrome into data/work/shots_raw/<key>.png
# Usage: scripts/screenshot.sh <key> <url>   (parallel: tr '\t' '\n' < data/work/shots.tsv | xargs -n2 -P6 scripts/screenshot.sh)
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
key="$1"; url="$2"
out="$REPO/data/work/shots_raw/$key.png"
mkdir -p "$(dirname "$out")" "$REPO/data/work/tmp"
[ -s "$out" ] && exit 0
prof=$(mktemp -d "$REPO/data/work/tmp/prof.XXXX")
# fresh temporary profile (no cookies), hard 45s timeout via perl alarm (macOS has no `timeout`)
perl -e 'alarm shift; exec @ARGV' 45 "$CHROME" --headless=new --disable-gpu --hide-scrollbars --mute-audio --no-first-run \
  --user-data-dir="$prof" --window-size=1280,800 --virtual-time-budget=8000 --timeout=30000 --screenshot="$out" "$url" >/dev/null 2>&1
rm -rf "$prof"
