#!/usr/bin/env bash
# smoke test — boots tiger + landing locally, fires an event through the router,
# verifies it lands. uses fake creds so it's safe to run any time.
#
# usage: bash scripts/smoke-test.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDS=()
cleanup() {
  echo ""
  echo "→ cleaning up…"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  pkill -f "bun.*main.ts.*tiger" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  rm -f /tmp/mimi-smoke-tiger.log /tmp/mimi-smoke-landing.log
}
trap cleanup EXIT INT TERM

PASS=0
FAIL=0
check() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✓ $label"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label"
    echo "    expected: contains '$expected'"
    echo "    actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "mimi. smoke test"
echo ""

echo "→ booting tiger agent (port 8081) with fake creds"
(
  ANTHROPIC_API_KEY=sk-ant-fake \
  NOTION_TOKEN=secret_fake \
  NOTION_DB_RESIDENTS=fake NOTION_DB_EVENTS=fake NOTION_DB_ARTIFACTS=fake \
  NOTION_DB_CONVERSATIONS=fake NOTION_DB_AGENT_MEMORY=fake \
  LIVEKIT_URL=wss://fake.livekit.cloud LIVEKIT_API_KEY=fake LIVEKIT_API_SECRET=fakefake \
  AGENT_PORT=8081 \
    bun --bun "$ROOT/agents/runtime/src/main.ts" --persona tiger \
    > /tmp/mimi-smoke-tiger.log 2>&1
) &
PIDS+=($!)

echo "→ booting landing (port 3000)"
(bun --cwd "$ROOT/apps/landing" dev > /tmp/mimi-smoke-landing.log 2>&1) &
PIDS+=($!)

echo "→ waiting ~14s for both to come up…"
sleep 14

echo ""
echo "tests:"

# 1. agent /health responds
H=$(curl -s -m 3 http://localhost:8081/health 2>/dev/null || echo "")
check "tiger /health returns species=tiger"       "$H" '"species":"tiger"'
check "tiger /health returns state=idle"          "$H" '"state":"idle"'

# 2. species-prefixed routing
H=$(curl -s -m 3 http://localhost:8081/tiger/health 2>/dev/null || echo "")
check "tiger /tiger/health works (prefix strip)" "$H" '"species":"tiger"'

# 3. /event accepts payload
E=$(curl -s -m 3 -X POST http://localhost:8081/event \
  -H "content-type: application/json" \
  -d '{"id":"smoke-1","source":"github","type":"github.push","ts":"2026-05-17T00:00:00Z","payload":{}}' 2>/dev/null || echo "")
check "tiger /event accepts a github.push"       "$E" '"accepted":"smoke-1"'

# 4. landing token route exists (will 500 without livekit env, that's fine)
T=$(curl -s -m 3 -o /dev/null -w "%{http_code}" "http://localhost:3000/api/livekit-token?identity=smoke&name=smoke&room=mimi-house-main" 2>/dev/null || echo "000")
case "$T" in
  200|500) echo "  ✓ landing /api/livekit-token reachable (HTTP $T)"; PASS=$((PASS + 1));;
  *)       echo "  ✗ landing /api/livekit-token unreachable (HTTP $T)"; FAIL=$((FAIL + 1));;
esac

# 5. landing agent router rejects unknown species
R=$(curl -s -m 3 -X POST http://localhost:3000/api/agent/dragon/event \
  -H "content-type: application/json" -d '{}' 2>/dev/null || echo "")
check "landing router rejects unknown species"   "$R" "unknown species"

# 6. landing agent router forwards to tiger
F=$(curl -s -m 5 -X POST http://localhost:3000/api/agent/tiger/event \
  -H "content-type: application/json" \
  -d '{"id":"smoke-chain","source":"manual","type":"manual.poke","ts":"2026-05-17T00:00:00Z","payload":{}}' 2>/dev/null || echo "")
check "router → tiger end-to-end"                "$F" '"accepted":"smoke-chain"'

# 7. agent landing page renders
L=$(curl -s -m 3 -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
case "$L" in
  200) echo "  ✓ landing / renders 200"; PASS=$((PASS + 1));;
  *)   echo "  ✗ landing / failed (HTTP $L)"; FAIL=$((FAIL + 1));;
esac

# 8. onboard page renders
O=$(curl -s -m 3 -o /dev/null -w "%{http_code}" http://localhost:3000/onboard 2>/dev/null || echo "000")
case "$O" in
  200) echo "  ✓ landing /onboard renders 200"; PASS=$((PASS + 1));;
  *)   echo "  ✗ landing /onboard failed (HTTP $O)"; FAIL=$((FAIL + 1));;
esac

echo ""
echo "─── results ───"
echo "  pass: $PASS"
echo "  fail: $FAIL"
echo ""
if [[ "$FAIL" -gt 0 ]]; then
  echo "✗ smoke test failed. logs:"
  echo "  tiger:   /tmp/mimi-smoke-tiger.log"
  echo "  landing: /tmp/mimi-smoke-landing.log"
  exit 1
fi
echo "✓ smoke test passed."
