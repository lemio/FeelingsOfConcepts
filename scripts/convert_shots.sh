#!/bin/bash
# Convert raw screenshots (data/work/shots_raw/*.png) into 800px JPEGs for the site (public/images/shots/).
# Uses macOS `sips`. Delete a JPEG afterwards if the capture shows a broken page (404, bot check, blank).
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$REPO/public/images/shots"
for f in "$REPO"/data/work/shots_raw/*.png; do
  k="$(basename "$f" .png)"
  sips -s format jpeg -s formatOptions 72 --resampleWidth 800 "$f" --out "$REPO/public/images/shots/$k.jpg" >/dev/null
done
