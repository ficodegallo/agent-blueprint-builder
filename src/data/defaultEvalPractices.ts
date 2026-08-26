/**
 * Built-in eval-design rulebook.
 *
 * Always applied ahead of any prompt customization, so eval quality does not
 * depend on whether the user has edited the prompt — the same arrangement the
 * agent-design rulebook has with the Best Practices check.
 *
 * Synthesized from published agent-evaluation guidance and mapped onto this
 * app's node vocabulary (agent loops, orchestrators, routers, parallel joins,
 * HITL policies):
 *   - Anthropic, "Demystifying evals for AI agents" — outcome vs. transcript
 *     graders; code-based / model-based / human graders; small starter sets
 *     drawn from real failures; grade outcomes, not prescribed paths.
 *   - Hamel Husain & Shreya Shankar, "LLM Evals: Everything You Need to Know" —
 *     binary pass/fail over Likert; error analysis before metrics; cheap
 *     deterministic checks before LLM judges; one criterion per judge.
 *   - Confident AI, "LLM Agent Evaluation Metrics" — end-to-end / trajectory /
 *     component levels; tool-calling, planning, reasoning and safety families.
 */
export const BUILT_IN_EVAL_PRACTICES = `## Built-in eval design rules

### What makes an eval
1. An eval answers exactly ONE binary pass/fail question. Never a 1-5 rating,
   never a compound question joined by "and". If two things can fail
   independently, they are two evals.
2. Every eval names the concrete FAILURE MODE it protects against, in terms of
   this specific workflow — not "the agent might be inaccurate" but "the router
   sends a refund over the approval threshold straight to the auto-refund agent".
   An eval with no named failure mode is a generic metric and measures nothing.
3. Every eval names the TEST DATA it needs: how many cases, of what kind, and
   what has to be labeled. "Traces from production" is not enough; say which
   traces and what a human must mark on them.
4. Pass criteria must be checkable by someone who was not in the room. Two
   reviewers reading the criterion should reach the same verdict on the same
   trace.

### Choosing a grader
5. Prefer 'deterministic' whenever the check is mechanically verifiable — a
   required field is present, a specific tool was called, a threshold routed the
   right way, an iteration cap held, a required approval was recorded. These are
   cheap, reproducible, and never drift.
6. Use 'llm-judge' only where the criterion genuinely needs judgment: tone,
   groundedness, whether a summary covers the key facts, whether a decision
   rationale is coherent. One criterion per judge.
7. Use 'human-review' for criteria a domain expert must own, and for calibrating
   the LLM judges. Assume any llm-judge eval also needs a periodic human sample.
8. Use 'hybrid' when a deterministic gate is followed by a judged criterion.

### Coverage across the workflow
9. A starter set is 5-6 evals. Small and sharp beats broad and vague.
10. At least TWO evals must be workflow-level (linkedNodeId = null): does the
    whole process reach the right end state, and does it take a sound path
    through the graph. Node-level evals cover the riskiest individual nodes.
11. Span at least three of the six dimensions. Outcome-only coverage cannot
    catch an agent that reaches the right answer by an unsafe or wasteful route.
    - outcome: did the workflow reach the right end state
    - trajectory: routing, tool calls, handoffs, step efficiency
    - quality: accuracy, groundedness, completeness of what it produced
    - safety: guardrails on risky or irreversible actions
    - oversight: the right things reached a human, at the right time
    - efficiency: cost, latency, iteration counts

### Where the risk lives in an agentic blueprint
12. Loops (agent loop, orchestrator, evaluator-optimizer) fail by running away.
    Evaluate that the stop/termination condition actually fires and the
    iteration cap holds — including on inputs designed not to converge.
13. Model-driven routing (router nodes, orchestrator worker selection) fails by
    misclassification. Evaluate routing accuracy against labeled cases,
    especially at the boundaries between routes and on the fallback route.
14. Nodes taking hard-to-reverse, outward-facing actions (sending messages,
    moving money, deleting or overwriting records, submitting filings) fail
    expensively. Evaluate that the guardrail and human gate hold.
15. HITL policies fail silently in both directions: escalating everything (the
    workflow is useless) or escalating nothing (the gate is decorative).
    Evaluate that the cases that SHOULD reach a human do, and the ones that
    should not, do not.
16. Parallel splits/joins fail on partial results — evaluate what the join
    produces when one branch fails, times out, or returns nothing.
17. Nodes with 'NOT DEFINED' success criteria, stop conditions, or escalation
    paths are the highest-value eval targets in the blueprint. An eval that
    forces the team to define what success means there is worth more than one
    that checks something already well specified.

### What not to produce
18. No generic quality metrics ("is the output helpful", "is the response
    accurate") that could be pasted onto any workflow. If an eval would read the
    same for a different blueprint, it is not grounded enough.
19. Do not grade a prescribed path when the outcome is what matters — a valid
    solution that takes a different route must not fail the eval.
20. Do not propose evals for things the blueprint does not do. Ground every eval
    in a node, edge, guardrail, or goal that is actually on this canvas.`;
