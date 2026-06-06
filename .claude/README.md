# .claude/ — Agentic Architecture for PMG Group OS

This directory holds the Claude Code configuration for working on PMG Group OS: custom subagents, the anti-pattern catalog, the routing matrix, and project-specific skills. It is **tracked in git** because the architecture is portable across machines and contributors, not a per-machine local opinion.

## Layout

```
.claude/
├── README.md                        ← this file
├── routing.md                       ← task-to-subagent decision matrix
├── anti-patterns.md                 ← grep-recipe catalog (queried by audit-hunter)
├── agents/
│   ├── frontend-page-agent.md       ← edits under artifacts/pmg-os/src/
│   ├── api-endpoint-agent.md        ← edits under artifacts/api-server/src/ (non-AI)
│   ├── db-schema-agent.md           ← edits under lib/db/src/schema/
│   ├── api-contract-agent.md        ← edits to lib/api-spec/openapi.yaml + codegen
│   ├── ai-pattern-agent.md          ← AI / mode / wallet / agents plumbing
│   └── audit-hunter.md              ← read-only anti-pattern scanner
└── skills/
    └── pmg-tri-mode-pattern/
        └── SKILL.md                 ← the tri-mode + wallet + dummyMode contract
```

## How this fits with CLAUDE.md

`CLAUDE.md` at the repo root is the **always-loaded** session bootstrap. It is the one file Claude reads every session. Sections of CLAUDE.md point into this directory:

| CLAUDE.md section | Points to |
|---|---|
| §6 Skill Index | `.claude/skills/` (project-specific) and `.local/skills/` (generic) |
| §9 Subagent Roster | `.claude/agents/*.md` |
| §10 Anti-Pattern Guardrails | `.claude/anti-patterns.md` (full catalog) |

CLAUDE.md gives the one-screen view. The files in `.claude/` give the depth.

## When to read what

- **Every session, automatically:** `CLAUDE.md`.
- **Before spawning a subagent:** the matching file in `.claude/agents/` (the agent itself reads it on spawn; the main thread reads it once for confidence).
- **Before an audit or pre-merge sweep:** `.claude/anti-patterns.md`.
- **When routing is unclear:** `.claude/routing.md`.
- **When touching the AI / mode / wallet plumbing:** `.claude/skills/pmg-tri-mode-pattern/SKILL.md`.
- **Generic skill (React, Drizzle, Stripe, etc.):** the matching skill under `.local/skills/` per CLAUDE.md §6 Tier 2.

## Adding a new subagent

1. Decide that the subagent earns its keep. Threshold: you have spawned the equivalent inline three times and noticed yourself repeating context.
2. Write `.claude/agents/<name>.md` following the format used by the six existing files. Required frontmatter: `name`, `description`. Optional: `tools` (restrict for safety), `model`.
3. Add a one-line entry in `CLAUDE.md` §9.
4. Add a routing row in `.claude/routing.md`.

## Adding a new anti-pattern

`audit-hunter` returns **New Anti-Patterns Observed** when it finds recurring shapes not in the catalog. To promote one:

1. Confirm at least one real example exists in the current codebase.
2. Write a narrow regex; document any suppression rule.
3. Assign severity (P0 / P1 / P2) and fix-by subagent.
4. Append a new section in `.claude/anti-patterns.md`.
5. If P0 or P1, add a one-line entry in CLAUDE.md §10.

## Adding a new project-specific skill

Project-specific skills (skills that document a contract no source file expresses in one place) go under `.claude/skills/<name>/SKILL.md`. Follow the format used by `pmg-tri-mode-pattern`. Generic skills (React patterns, Drizzle patterns, Stripe flows) belong under `.local/skills/` and are not authored here.

## Updating CLAUDE.md after structural changes

When you change anything in `.claude/`, ask whether CLAUDE.md still tells the truth:

- New subagent → CLAUDE.md §9 row.
- New anti-pattern → CLAUDE.md §10 row.
- Resolved anti-pattern → strike-through or removal in CLAUDE.md §3.
- New project-specific skill → CLAUDE.md §6 row.
- Any of the above → CLAUDE.md §8 Decisions Log line.
