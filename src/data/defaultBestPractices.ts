/**
 * Built-in agent-design rulebook.
 *
 * These rules are always applied by the Best Practices analysis, ahead of any
 * organization-specific practices the user supplies. They encode common
 * failure modes of agentic workflow designs, drawn from published guidance on
 * building effective agents (start simple, verifiable success criteria,
 * bounded loops, human gates on irreversible actions, one concern per agent).
 */
export const BUILT_IN_BEST_PRACTICES = `## Built-in agent design rules

### Goals and success criteria
1. Every agent node must have a verifiable success criterion — a check someone
   (or something) could actually run to confirm the goal was met. Flag agents
   whose goal uses vague verbs ("process", "handle", "manage", "support")
   without stating what success looks like.
2. Every autonomous loop (agent loop, orchestrator, evaluator-optimizer) must
   have an explicit stop or termination condition AND a bounded iteration count
   or budget. Flag any loop that could run indefinitely.
3. Agent descriptions should read as routing contracts: what the agent does,
   when to use it, and how it differs from sibling agents. Flag agents in the
   same blueprint whose descriptions overlap so much that a router or manager
   could not choose between them.

### Human oversight
4. Any node that takes a hard-to-reverse, outward-facing action (sending
   messages to customers, moving money, deleting or overwriting records,
   submitting filings, placing orders) must have a human oversight policy of
   'approval' — or a documented justification for why notify/sampled review is
   sufficient. Flag irreversible actions with no human gate.
5. Approval gates must name a reviewer (role) and an SLA, and say what happens
   on timeout or rejection. Flag approval steps with no escalation path.
6. Escalation paths must terminate at a human. Flag failure handling that
   loops back into the same automated step with no way out.

### Simplicity and structure
7. Prefer the simplest pattern that works: a fixed pipeline beats a router,
   a router beats an orchestrator, an orchestrator beats a free-running agent
   loop. Flag dynamic patterns (orchestrator, agent loop) used where the steps
   are known in advance and a deterministic flow would do.
8. One agent, one concern. Flag "mega-agents" whose goal or task list spans
   several unrelated responsibilities that should be separate nodes.
9. Routers need mutually exclusive route descriptions and a fallback route for
   low-confidence classifications. Flag routers without a fallback.
10. Parallel splits must converge at a join (or explicitly document why
    branches never reconverge).

### Failure handling and data
11. Every step that calls an external system (integration or API) must define
    what happens when the call fails. Flag external calls with no failure path.
12. Data an agent needs must come from somewhere: an input, an upstream output,
    or an integration. Flag agents whose tasks reference data that no input,
    upstream node, or integration provides.
13. Steps that handle sensitive data (PII, financial, health) should note the
    constraint in guardrails. Flag likely-sensitive flows with empty guardrails.
`;
