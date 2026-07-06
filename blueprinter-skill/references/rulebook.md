# Agent-design rulebook

Review every blueprint against these rules before delivering. Report violations with the node name and a suggested fix; apply fixes the user agrees to.

## Goals and success criteria

1. Every agent node has a verifiable success criterion — a check someone (or something) could actually run. Flag goals with vague verbs ("process", "handle", "manage", "support") and no statement of what success looks like.
2. A strong goal is a contract: **objective** (one concrete outcome), **constraints** (what must not happen), **validation** (how success is verified), **stop condition** (when it's done). Not every goal spells out all four, but no verifiable outcome + no sense of "done" = weak.
3. Every autonomous loop (orchestrator, agentLoop, evaluatorOptimizer) has an explicit stop/termination condition AND a bounded iteration count or budget.
4. Agent descriptions read as routing contracts: what + when + differentiator. Flag sibling agents whose descriptions overlap so much a router or manager couldn't choose between them.

## Human oversight

5. Hard-to-reverse, outward-facing actions (send to customers, move money, delete/overwrite records, submit filings, place orders) have `hitl.mode: "approval"` — or a documented justification for notify/sampled.
6. Approval gates name a reviewer role and an SLA, and define what happens on timeout or rejection.
7. Escalation paths terminate at a human — never loop back into the same automated step with no exit.

## Simplicity and structure

8. Simplest pattern that works: pipeline beats router beats orchestrator beats agent loop. Flag dynamic patterns where the steps are known in advance.
9. One agent, one concern. Flag mega-agents whose goal or tasks span several unrelated responsibilities.
10. Routers have mutually exclusive route descriptions and a fallback route.
11. Every parallel split converges at a join (or documents why not).

## Failure handling and data

12. Every step that calls an external system defines what happens when the call fails.
13. Every input an agent consumes comes from somewhere: an upstream output, a trigger payload, or an integration. Flag orphaned data.
14. Sensitive-data flows (PII, financial, health) note the constraint in guardrails.
