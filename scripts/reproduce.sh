#!/usr/bin/env bash
# Reproduce the workbench qualification from committed source only, in the pinned
# official Playwright container: install from the lockfile, then run calibration, the
# acceptance tests and a site capture with no network. Nothing from the host crosses
# except `git archive` of the revision.
# Usage (inside a clone): scripts/reproduce.sh [revision]   default: HEAD
set -euo pipefail
IMAGE=mcr.microsoft.com/playwright@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
REV=${1:-HEAD}
VOL=webdev-reproduce-$$
trap 'docker volume rm -f "$VOL" >/dev/null' EXIT
echo "revision $(git rev-parse "$REV^{commit}")"
docker volume create "$VOL" >/dev/null
git archive --format=tar "$REV" | docker run --rm -i -v "$VOL":/work "$IMAGE" \
  bash -c 'cd /work && tar -x && npm ci --no-audit --no-fund'
docker run --rm --network=none -v "$VOL":/work -w /work "$IMAGE" bash -c '
  set -e
  export WORKBENCH_CHROME=$(node -e "console.log(require(\"playwright\").chromium.executablePath())")
  node calibrate.mjs
  node --test tests/site.test.mjs
  node capture.mjs site'
echo "REPRODUCED"
