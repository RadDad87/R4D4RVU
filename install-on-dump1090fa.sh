#!/usr/bin/env bash
# Install R4D4RVU into an existing dump1090-fa / PiAware (SkyAware) receiver.
# It drops the app next to your decoder's web UI so it's served same-origin and
# can read the local aircraft.json with no internet required.
#
#   curl -fsSL https://raw.githubusercontent.com/RadDad87/R4D4RVU/main/install-on-dump1090fa.sh | sudo bash
#
set -euo pipefail
RAW="https://raw.githubusercontent.com/RadDad87/R4D4RVU/main/index.html"

if   [ -d /usr/share/skyaware/html ];     then WEB=/usr/share/skyaware/html;     DATA=/skyaware/data/aircraft.json
elif [ -d /usr/share/dump1090-fa/html ];  then WEB=/usr/share/dump1090-fa/html;  DATA=/dump1090-fa/data/aircraft.json
elif [ -d /usr/share/tar1090/html ];      then WEB=/usr/share/tar1090/html;      DATA=/tar1090/data/aircraft.json
else
  echo "Could not find a dump1090-fa / skyaware / tar1090 web directory." >&2
  echo "Edit this script and set WEB and DATA manually." >&2
  exit 1
fi

echo "Installing R4D4RVU into: $WEB"
if command -v curl >/dev/null; then curl -fsSL "$RAW" -o "$WEB/r4d4rvu.html"
else wget -qO "$WEB/r4d4rvu.html" "$RAW"; fi
chmod 644 "$WEB/r4d4rvu.html"

IP=$(hostname -I 2>/dev/null | awk '{print $1}'); IP=${IP:-<receiver-ip>}
echo
echo "Done. Open R4D4RVU in a browser:"
echo
echo "  http://$IP/${WEB##*/share/}/r4d4rvu.html?source=sdr&sdr=$DATA"
echo "  (simpler: http://$IP/$(basename $(dirname $WEB))/r4d4rvu.html?source=sdr&sdr=$DATA )"
echo
echo "Then open the in-app gear (Set location manually / options) and enter your"
echo "receiver's latitude/longitude once (it is saved in the browser)."
