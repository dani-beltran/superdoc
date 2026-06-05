#!/usr/bin/env bash
set -euo pipefail

test -f scripts/check-public-surface.sh
test -x scripts/check-public-surface.sh

grep -Fq "set -euo pipefail" scripts/check-public-surface.sh
grep -Fq "pnpm check:public" scripts/check-public-surface.sh
grep -Fq "pnpm check:types" scripts/check-public-surface.sh

if grep -Eq "pnpm (run )?test|generate:|generate:all" scripts/check-public-surface.sh; then
  echo "public-surface helper must not run unit tests or mutating generate commands" >&2
  exit 1
fi
