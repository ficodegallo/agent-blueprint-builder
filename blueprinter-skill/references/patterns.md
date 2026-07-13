# Choosing the right agentic pattern

Prefer the SIMPLEST pattern that fits. Most business processes are deterministic pipelines; dynamic patterns add cost, latency, and review burden. Escalate only when the simpler shape genuinely can't express the work:

fixed pipeline → decision → router → parallel → evaluator-optimizer → orchestrator → agent loop

## Pattern selection table

| What you hear from the process owner | Pattern | Node type(s) |
|---|---|---|
| "First we do X, then Y, then Z" — steps known in advance | Deterministic pipeline | chain of `work` nodes |
| "If the amount is over $10k it goes to a director" — branching by explicit rule | Rule-based branch | `decision` |
| "Someone reads it and figures out what kind of request it is" — branching by judgment | AI routing | `router` |
| "These three checks happen at the same time / don't depend on each other" | Parallelization | `parallel` split + join |
| "We keep revising it until it's good enough / passes review" | Quality loop | `evaluatorOptimizer` |
| "It depends on the request — different specialists handle different pieces, and you can't know which up front" | Orchestrator-workers | `orchestrator` |
| "You can't script it — the steps depend on what you find as you go" | Autonomous agent | `agentLoop` |

## Assignment heuristics (who does each step)

- `automation` — deterministic system work: syncs, file moves, status updates, notifications. No judgment.
- `agent` — judgment over unstructured input: extraction, drafting, triage, validation against fuzzy rules.
- `human` — accountability, authority, or empathy: approvals, exception resolution, relationship touchpoints.
- Don't make an agent do what a webhook can do; don't make a human do what an agent can draft for their review.

## Guardrails on dynamic patterns

- **Orchestrator**: must have a termination condition and a bounded iteration count/budget. Workers need routing-contract descriptions distinct enough that the manager can choose between them. If you know the subtasks in advance, use a pipeline or parallel split instead.
- **Agent loop**: must have a stop condition ("success criteria verified, or N failed attempts") and max iterations. Give it a memory strategy for anything beyond a few steps.
- **Router**: route descriptions must be mutually exclusive; always define a fallback route (usually → human exception handling).
- **Evaluator-optimizer**: criteria must be verifiable checks, not vibes ("totals reconcile to source" beats "output is high quality"). Define what happens when max iterations is hit — usually escalate to a human with the best attempt and evaluator feedback.
- **Any irreversible outward-facing action** (send to customer, move money, delete records, submit filings): `hitl.mode: "approval"` with a named reviewer role, an SLA, and an escalation path. Escalation paths must terminate at a human.

## Composing patterns

Patterns nest naturally in one blueprint: a deterministic pipeline whose triage step is a router, one branch of which is an evaluator-optimizer loop with an approval gate at the end. Model each stage with the simplest shape it needs, not the fanciest shape in the toolbox.
