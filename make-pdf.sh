#!/bin/sh
# Headless export without the browser dialog. Usage: ./make-pdf.sh [front|back|both][,nophoto][,nopunch][,ml] [out.pdf]
set -e
cd "$(dirname "$0")"
SIDE=${1:-front}; OUT=${2:-iba-flashcards-$(echo "$SIDE" | tr , -).pdf}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 \
  --print-to-pdf="$OUT" "file://$PWD/index.html#print=$SIDE" 2>/dev/null
echo "wrote $OUT"
