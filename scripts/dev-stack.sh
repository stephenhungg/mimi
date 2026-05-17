#!/usr/bin/env bash
# boot the full local mimi. stack for demo + dev:
#   - apps/landing on :3000 (next dev — token mint, oauth, team-chat, agent-state)
#   - 5 agent runtimes on :8081-:8085 (tiger, otter, bunny, dog, giraffe)
#   - apps/web on :5173 (vite — 3D scene)
#
# usage:
#   bash scripts/dev-stack.sh             # boot all
#   bash scripts/dev-stack.sh stop        # kill everything
#   bash scripts/dev-stack.sh status      # show what's running
#   bash scripts/dev-stack.sh logs <name> # tail one log (landing, tiger, otter, bunny, dog, giraffe, web)
#
# logs land in /tmp/mimi-<name>.log. ctrl-c on the foreground command kills
# nothing on its own — use `bash scripts/dev-stack.sh stop` to clean up.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDFILE_DIR="/tmp/mimi-pids"
mkdir -p "$PIDFILE_DIR"

start_proc() {
  local name="$1"
  local cmd="$2"
  local pidfile="$PIDFILE_DIR/$name.pid"
  local logfile="/tmp/mimi-$name.log"

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ✓ $name already running (pid $(cat "$pidfile"))"
    return 0
  fi
  echo "  → starting $name"
  ( eval "$cmd" > "$logfile" 2>&1 & echo $! > "$pidfile" )
  sleep 0.5
}

stop_proc() {
  local name="$1"
  local pidfile="$PIDFILE_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "  ✗ stopped $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
}

wait_port() {
  local port="$1"
  local label="$2"
  local max=30
  for ((i = 0; i < max; i++)); do
    if curl -s -o /dev/null -m 1 "http://localhost:$port/" 2>/dev/null \
       || curl -s -o /dev/null -m 1 "http://localhost:$port/health" 2>/dev/null; then
      echo "  ✓ $label is up on :$port"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ $label did not come up on :$port within ${max}s (see /tmp/mimi-$label.log)"
  return 1
}

cmd_start() {
  echo "mimi. dev stack — booting"
  echo ""

  if [[ ! -f .env.local ]]; then
    echo "✗ no .env.local found. run: cp .env.example .env.local + fill it in"
    exit 1
  fi

  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a

  start_proc "landing" "bun --cwd apps/landing dev"

  for entry in tiger:8081 otter:8082 bunny:8083 dog:8084 giraffe:8085; do
    name="${entry%:*}"
    port="${entry#*:}"
    start_proc "$name" "AGENT_PORT=$port bun --bun agents/runtime/src/main.ts --persona $name"
  done

  start_proc "web" "bun --cwd apps/web dev"

  echo ""
  echo "waiting for ports to come up…"
  wait_port 3000 "landing"
  for entry in tiger:8081 otter:8082 bunny:8083 dog:8084 giraffe:8085; do
    name="${entry%:*}"; port="${entry#*:}"
    wait_port "$port" "$name"
  done
  wait_port 5173 "web"

  echo ""
  echo "✓ stack up. URLs:"
  echo "    landing       http://localhost:3000   (notion oauth + team chat)"
  echo "    web           http://localhost:5173   (3D scene)"
  echo "    tiger health  http://localhost:8081/health"
  echo "    otter health  http://localhost:8082/health"
  echo "    bunny health  http://localhost:8083/health"
  echo "    dog/mimi      http://localhost:8084/health"
  echo "    giraffe       http://localhost:8085/health"
  echo ""
  echo "to stop:  bash scripts/dev-stack.sh stop"
  echo "to tail:  bash scripts/dev-stack.sh logs landing"
}

cmd_stop() {
  echo "stopping mimi. stack"
  for name in web giraffe dog bunny otter tiger landing; do
    stop_proc "$name"
  done
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "agents/runtime/src/main.ts" 2>/dev/null || true
  pkill -f "vite.*apps/web" 2>/dev/null || true
  echo "done."
}

cmd_status() {
  echo "mimi. stack — status"
  echo ""
  for entry in landing:3000 tiger:8081 otter:8082 bunny:8083 dog:8084 giraffe:8085 web:5173; do
    name="${entry%:*}"; port="${entry#*:}"
    pidfile="$PIDFILE_DIR/$name.pid"
    pid="(no pidfile)"
    if [[ -f "$pidfile" ]]; then
      pid=$(cat "$pidfile")
      if ! kill -0 "$pid" 2>/dev/null; then
        pid="(stale: $pid)"
      fi
    fi
    health="port closed"
    if curl -s -o /dev/null -m 1 "http://localhost:$port/" 2>/dev/null \
       || curl -s -o /dev/null -m 1 "http://localhost:$port/health" 2>/dev/null; then
      health="✓ alive"
    fi
    printf "  %-10s :%-5s pid=%-7s  %s\n" "$name" "$port" "$pid" "$health"
  done
}

cmd_logs() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "usage: bash scripts/dev-stack.sh logs <landing|tiger|otter|bunny|dog|giraffe|web>"
    exit 1
  fi
  local logfile="/tmp/mimi-$name.log"
  if [[ ! -f "$logfile" ]]; then
    echo "no log at $logfile"
    exit 1
  fi
  tail -F "$logfile"
}

case "${1:-start}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  logs)   shift; cmd_logs "$@" ;;
  *)      echo "usage: bash scripts/dev-stack.sh {start|stop|status|logs <name>}"; exit 1 ;;
esac
