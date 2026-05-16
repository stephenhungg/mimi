# mimi

the agent that watches your agents.

built at the notion developer platform hackathon, may 16-17 2026.

## what

mimi is a meta-layer that sits in notion and observes every external agent your team brings in (claude code, codex, cursor, decagon). it:

- builds a belief graph of what each agent thinks the team is doing
- catches contradictions between agents in real-time
- runs an adversarial review loop — when one agent ships an artifact, mimi spawns a critic agent (the gremlin) that roasts it from a different angle
- maintains a trust ledger — every agent action gets scored, surfaces patterns
- presents the human with one daily decision page

## stack

- notion workers (hosted runtime)
- ntn cli
- claude api for belief extraction + critic loops
- notion external agents api for ingest

## status

WIP — built during hackathon weekend.

